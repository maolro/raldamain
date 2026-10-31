"""
Git helpers shared by the data editors (rank, equipment and creature editors, Taller).
Guardar commits only the saved files and pushes them to GitHub — but only while
the repo is on GIT_BRANCH (set it to None to allow any branch).

Saves never overlap: a lock file in .git makes every editor process wait its turn,
because two `git pull --rebase --autostash` running at once can leave a rebase
half done with the uncommitted work stashed away (2026-10-31: the creature library
lost 100 abilities that way). A rebase left over from a crash or a timeout is
finished off before the next save, and the stashed work is always put back.

Saving is instant: git_push() queues the commit and a background thread commits and
pushes it (see "Background sync" below).
"""

import itertools
import json
import os
import subprocess
import threading
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


_GIT_DIR = None


def _git_dir() -> Path:
    global _GIT_DIR
    if _GIT_DIR is None:  # asked once: saves stay fast
        r = _git("rev-parse", "--absolute-git-dir", timeout=10)
        _GIT_DIR = Path(r.stdout.strip()) if r.returncode == 0 else BASE / ".git"
    return _GIT_DIR


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
    """Branch badge of the editors: {'branch', 'expected', 'ok', 'pending', 'last', 'error', 'time'}.
    pending = saves still waiting for their commit; last/error = how the latest background sync went."""
    branch = current_branch()
    st = _read_status()
    return {"branch": branch, "expected": GIT_BRANCH, "ok": not GIT_BRANCH or branch == GIT_BRANCH,
            "pending": len(_jobs()), "last": st.get("last", ""), "error": st.get("error", ""),
            "time": st.get("time", 0)}


# ── Background sync ───────────────────────────────────────────────────────────
# git_push() only writes a job file and returns: the save is instant. A worker thread in each editor
# process commits the queued jobs (one commit per save, from every editor) and then pulls and pushes
# once for the whole batch. Jobs stay on disk until committed, so an editor restarted or closed
# mid-save leaves them for the next worker, and the shared lock keeps the workers from overlapping.

def _sync_dir() -> Path:
    d = _git_dir() / "raldamain-sync"
    (d / "queue").mkdir(parents=True, exist_ok=True)
    return d


def _jobs():
    try:
        return sorted((_sync_dir() / "queue").glob("*.json"))
    except OSError:
        return []


def _read_status() -> dict:
    try:
        return json.loads((_sync_dir() / "status.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _write_status(last, error=""):
    try:
        (_sync_dir() / "status.json").write_text(
            json.dumps({"last": last, "error": error, "time": time.time()}, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


_wake = threading.Event()
_worker = None
_worker_guard = threading.Lock()
_seq = itertools.count()


def _ensure_worker():
    global _worker
    with _worker_guard:
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_work, name="git-sync", daemon=True)
            _worker.start()


def git_push(files, message):
    """Queues a commit of `files` and returns at once: 'queued' or 'wrong-branch:<name>'.
    The commit and the push happen in the background (git_status says how it went)."""
    branch = current_branch()
    if GIT_BRANCH and branch != GIT_BRANCH:
        return f"wrong-branch:{branch or '?'}"
    try:
        q = _sync_dir() / "queue"
        name = f"{time.time_ns():020d}-{os.getpid()}-{next(_seq):04d}"
        tmp = q / (name + ".tmp")
        tmp.write_text(json.dumps({"files": [str(f) for f in files], "message": message}, ensure_ascii=False),
                       encoding="utf-8")
        os.replace(tmp, q / (name + ".json"))  # the worker only reads complete jobs
    except OSError as e:
        return f"cola: {e}"
    _ensure_worker()
    _wake.set()
    return "queued"


def sync_now():
    """Runs the queue in this thread (tests, scripts). Returns the sync result."""
    return _drain()


def _work():
    while True:
        time.sleep(0.3)  # saves made in a burst go out together
        try:
            _drain()
        except Exception as e:  # never let the worker die
            _write_status("error", str(e))
        _wake.wait(timeout=60)  # every 60 s it also picks up jobs other editors left behind
        _wake.clear()


def _drain():
    jobs = _jobs()
    if not jobs and not _ahead():
        return "nothing"
    try:
        with _sync_lock():
            _heal_rebase()
            if _rebase_state():  # a rebase someone is doing by hand: leave it alone
                msg = "hay un rebase en curso: termínalo (git rebase --continue / --abort)"
                _write_status("error", msg)
                return msg
            branch = current_branch()
            if GIT_BRANCH and branch != GIT_BRANCH:
                _write_status("error", f"wrong-branch:{branch or '?'}")
                return f"wrong-branch:{branch or '?'}"  # the jobs wait until the branch is right again
            errors = []
            for job in _jobs():  # every editor's jobs, oldest first
                try:
                    d = json.loads(job.read_text(encoding="utf-8"))
                    r = _commit(d.get("files") or [], d.get("message") or "Update")
                    if r not in ("ok", "nothing"):
                        errors.append(f"{d.get('message')}: {r}")
                except (OSError, ValueError) as e:
                    errors.append(f"{job.name}: {e}")
                job.unlink(missing_ok=True)
            r = _pull_push(branch) if _ahead(branch) else "nothing"
            if r not in ("ok", "nothing"):
                errors.append(r)
            _write_status("error" if errors else "ok", "; ".join(errors))
            return "; ".join(errors) or "ok"
    except TimeoutError as e:
        _write_status("error", str(e))
        return str(e)


def _ahead(branch=None) -> bool:
    """True when there are local commits the remote doesn't have yet."""
    branch = branch or current_branch()
    r = _git("rev-list", "--count", f"origin/{branch}..HEAD", timeout=10)
    return r.returncode == 0 and r.stdout.strip() not in ("", "0")


def _commit(files, message):
    # A deleted file is committed as a deletion only if git knows it
    files = [f for f in files if Path(f).exists()
             or _git("ls-files", "--error-unmatch", "--", f, timeout=10).returncode == 0]
    if not files:
        return "nothing"
    _git("add", "--", *files)
    # Commit just these paths so other staged/modified files are never swept in
    r = _git("commit", "-m", message, "--", *files)
    if r.returncode != 0:
        if "nothing to commit" in (r.stdout + r.stderr) or "no changes added" in (r.stdout + r.stderr):
            return "nothing"
        return r.stderr.strip() or "commit error"
    return "ok"


def _pull_push(branch):
    try:
        # Rebase on the remote branch first (if it exists) so the push is never rejected
        if _git("ls-remote", "--exit-code", "--heads", "origin", branch, timeout=60).returncode == 0:
            marker = _git_dir() / "raldamain-sync.pulling"
            marker.write_text(str(os.getpid()))  # this rebase is ours: _heal_rebase may finish it
            r = _git("pull", "--rebase", "--autostash", "origin", branch, timeout=90)
            if r.returncode == 0:
                marker.unlink(missing_ok=True)
            else:
                healed = _heal_rebase()  # the commits stay local; the uncommitted work comes back
                return "pull: " + (r.stderr.strip() or "error") + (f" ({healed})" if healed else "")
        r = _git("push", "-u", "origin", branch, timeout=120)
        if r.returncode != 0:
            return "push: " + (r.stderr.strip() or "error")
        return "ok"
    except subprocess.TimeoutExpired:
        healed = _heal_rebase()
        return "timeout" + (f" ({healed})" if healed else "")


# Jobs an editor left behind (closed or restarted mid-save) go out when the next one starts
if _jobs():
    _ensure_worker()
