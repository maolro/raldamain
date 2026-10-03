"""
Git helpers shared by the data editors (rank_editor.py, equipment_editor.py).
Guardar commits only the saved files and pushes them to GitHub — but only while
the repo is on GIT_BRANCH (set it to None to allow any branch).
"""

import subprocess
from pathlib import Path

BASE = Path(__file__).parent.parent

GIT_BRANCH = "master"


def _git(*args, timeout=30):
    return subprocess.run(["git", *args], cwd=BASE, capture_output=True,
                          text=True, encoding="utf-8", timeout=timeout)


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
    branch = current_branch()
    if GIT_BRANCH and branch != GIT_BRANCH:
        return f"wrong-branch:{branch or '?'}"
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
            r = _git("pull", "--rebase", "--autostash", "origin", branch, timeout=90)
            if r.returncode != 0:
                return "pull: " + (r.stderr.strip() or "error")
        r = _git("push", "-u", "origin", branch, timeout=120)
        if r.returncode != 0:
            return "push: " + (r.stderr.strip() or "error")
        return "ok"
    except subprocess.TimeoutExpired:
        return "timeout"
    except Exception as e:
        return str(e)
