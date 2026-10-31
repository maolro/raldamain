"""
Git helpers shared by the data editors (rank, equipment and creature editors, Taller).
Guardar commits only the saved files and pushes them to GitHub — but only while
the repo is on GIT_BRANCH (set it to None to allow any branch).

Saves never overlap: a lock file in .git makes every editor process wait its turn,
because two `git pull --rebase --autostash` running at once can leave a rebase
half done with the uncommitted work stashed away (2026-10-31: the creature library
lost 100 abilities that way). A rebase left over from a crash or a timeout is
finished off before the next save, and the stashed work is always put back.
"""

import os
import subprocess
import time
from contextlib import contextmanager
from pathlib import Path

BASE = Path(__file__).parent.parent

GIT_BRANCH = "website_new"

LOCK_WAIT = 300    # seconds a save waits for another editor's save to finish
LOCK_STALE = 600   # a lock older than this was left by a crashed editor


def _git(*args, timeout=30):
    return subprocess.run(["git", *args], cwd=BASE, capture_output=True,
                          text=True, encoding="utf-8", timeout=timeout)


def _git_dir() -> Path:
    r = _git("rev-parse", "--absolute-git-dir", timeout=10)
    return Path(r.stdout.strip()) if r.returncode == 0 else BASE / ".git"


@contextmanager
def _sync_lock():
    """One git save at a time across all the editor processes."""
    lock = _git_dir() / "raldamain-sync.lock"
    t0 = time.time()
    while True:
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            break
        except (FileExistsError, PermissionError):  # Windows: PermissionError while another process deletes it
            try:
                if time.time() - lock.stat().st_mtime > LOCK_STALE:
                    lock.unlink()
                    continue
            except FileNotFoundError:
                continue
            except OSError:
                pass
            if time.time() - t0 > LOCK_WAIT:
                raise TimeoutError("otro editor lleva demasiado tiempo guardando en git")
            time.sleep(0.2)
    try:
        yield
    finally:
        try:
            lock.unlink()
        except OSError:
            pass


def _rebase_state():
    gd = _git_dir()
    for name in ("rebase-merge", "rebase-apply"):
        if (gd / name).exists():
            return gd / name
    return None


def _heal_rebase() -> str:
    """Ends a rebase that one of our pulls left half done (crash, timeout, conflict) and puts its
    autostash back. A rebase someone started by hand is never touched (see the marker in _commit_and_push).
    Returns '' when there was nothing to do, otherwise what was done."""
    marker = _git_dir() / "raldamain-sync.pulling"
    state = _rebase_state()
    if not state or not marker.exists():
        marker.unlink(missing_ok=True)
        return ""
    if _git("rebase", "--abort", timeout=60).returncode == 0:
        marker.unlink(missing_ok=True)
        return "rebase abortado"  # --abort also re-applies the autostash
    # Too broken to abort (e.g. only the autostash was written): keep HEAD and re-apply the stash by hand
    auto = (state / "autostash").read_text().strip() if (state / "autostash").exists() else ""
    _git("rebase", "--quit", timeout=60)  # saves the autostash in the stash list
    marker.unlink(missing_ok=True)
    if auto:
        r = _git("stash", "apply", auto, timeout=60)
        if r.returncode != 0:
            return f"rebase cerrado; cambios guardados en el stash ({auto[:8]}), aplícalos con git stash apply"
    return "rebase cerrado"


def current_branch():
    try:
        r = _git("branch", "--show-current", timeout=10)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def git_status():
    """{'branch', 'expected', 'ok'} for the editors' branch badge."""
    branch = current_branch()
    return {"branch": branch, "expected": GIT_BRANCH,
            "ok": not GIT_BRANCH or branch == GIT_BRANCH}


def git_push(files, message):
    """Commit only `files`, rebase on the remote branch and push.
    Returns 'ok', 'nothing', 'wrong-branch:<name>' or an error string."""
    try:
        with _sync_lock():
            _heal_rebase()
            if _rebase_state():  # a rebase someone is doing by hand: leave it alone
                return "hay un rebase en curso: termínalo (git rebase --continue / --abort) y vuelve a guardar"
            branch = current_branch()
            if GIT_BRANCH and branch != GIT_BRANCH:
                return f"wrong-branch:{branch or '?'}"
            return _commit_and_push([str(f) for f in files], message, branch)
    except TimeoutError as e:
        return str(e)
    except Exception as e:
        return str(e)


def _commit_and_push(files, message, branch):
    # A deleted file is committed as a deletion only if git knows it
    files = [f for f in files if Path(f).exists()
             or _git("ls-files", "--error-unmatch", "--", f, timeout=10).returncode == 0]
    if not files:
        return "nothing"
    try:
        _git("add", "--", *files)
        # Commit just these paths so other staged/modified files are never swept in
        r = _git("commit", "-m", message, "--", *files)
        if r.returncode != 0:
            if "nothing to commit" in (r.stdout + r.stderr) or "no changes added" in (r.stdout + r.stderr):
                return "nothing"
            return r.stderr.strip() or "commit error"
        # Rebase on the remote branch first (if it exists) so the push is never rejected
        if _git("ls-remote", "--exit-code", "--heads", "origin", branch, timeout=60).returncode == 0:
            marker = _git_dir() / "raldamain-sync.pulling"
            marker.write_text(str(os.getpid()))  # this rebase is ours: _heal_rebase may finish it
            r = _git("pull", "--rebase", "--autostash", "origin", branch, timeout=90)
            if r.returncode == 0:
                marker.unlink(missing_ok=True)
            else:
                healed = _heal_rebase()  # the commit stays local; the uncommitted work comes back
                return "pull: " + (r.stderr.strip() or "error") + (f" ({healed})" if healed else "")
        r = _git("push", "-u", "origin", branch, timeout=120)
        if r.returncode != 0:
            return "push: " + (r.stderr.strip() or "error")
        return "ok"
    except subprocess.TimeoutExpired:
        healed = _heal_rebase()
        return "timeout" + (f" ({healed})" if healed else "")
