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

Uploads that get stuck are retried: every pull/push gets ATTEMPTS tries. git aborts a
transfer that stops moving (http.lowSpeed*), a git that runs past its timeout is killed
with all its helper processes, and nothing can wait on a hidden login prompt. Between
tries check_health() looks at the internet connection, GitHub's own status page and
the repo (git ls-remote), and repairs what can be fixed locally: stale .lock files,
a half-done rebase, HTTP/2 glitches (the next try uses HTTP/1.1). After the last try
the badge shows a definite error that says what is wrong; the commits stay local and
go up on their own once GitHub can be reached again.

    python tools/git_sync.py salud     check the connection (and repair) now
    python tools/git_sync.py subir     commit and push whatever is waiting, in this terminal
"""

import itertools
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from contextlib import contextmanager
from pathlib import Path

BASE = Path(__file__).parent.parent

GIT_BRANCH = "website_new"

LOCK_WAIT = 300    # seconds a save waits for another editor's save to finish
LOCK_STALE = 600   # a lock untouched this long was left by a crashed editor (the holder touches it on every try)

ATTEMPTS = 5                    # tries of each pull + push before a definite error
RETRY_WAIT = [3, 8, 15, 30]     # seconds between tries
LS_TIMEOUT, PULL_TIMEOUT, PUSH_TIMEOUT = 30, 90, 120
GIT_LOCK_STALE = 60             # an index.lock / ref .lock this old belongs to a git that died

# A transfer moving under 1 KB/s for 20 s is stuck: git aborts it instead of waiting for the timeout
NET_CONFIG = ["-c", "http.lowSpeedLimit=1000", "-c", "http.lowSpeedTime=20"]
# Never wait on a password prompt nobody can see (the credential manager's own window still works)
NET_ENV = {"GIT_TERMINAL_PROMPT": "0", "SSH_ASKPASS_REQUIRE": "never"}


def _kill_tree(proc):
    """Kill a git and the helpers it started (git-remote-https, credential manager, ssh)."""
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True, timeout=15)
        else:
            os.killpg(proc.pid, 9)
    except Exception:
        pass
    try:
        proc.kill()
    except Exception:
        pass


_killed_at = 0.0  # when we last had to kill a stuck git (its .lock files can go at once)


def _git(*args, timeout=30, net=False, http1=False):
    """Run git without a console to prompt on; on timeout kill it (and its helpers) and raise
    subprocess.TimeoutExpired. ``net``: a pull/push/ls-remote (stall detection, no prompts)."""
    global _killed_at
    cmd = ["git", *(NET_CONFIG if net else []), *(["-c", "http.version=HTTP/1.1"] if http1 else []), *args]
    env = {**os.environ, **NET_ENV} if net else None
    kw = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
    proc = subprocess.Popen(cmd, cwd=BASE, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            text=True, encoding="utf-8", errors="replace", env=env, **kw)
    try:
        out, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        _kill_tree(proc)
        _killed_at = time.time()
        try:
            proc.communicate(timeout=10)
        except Exception:
            pass
        raise
    return subprocess.CompletedProcess(cmd, proc.returncode, out, err)


_GIT_DIR = None


def _git_dir() -> Path:
    global _GIT_DIR
    if _GIT_DIR is None:  # asked once: saves stay fast
        r = _git("rev-parse", "--absolute-git-dir", timeout=10)
        _GIT_DIR = Path(r.stdout.strip()) if r.returncode == 0 else BASE / ".git"
    return _GIT_DIR


def _pid_alive(pid: int) -> bool:
    """Is this process still running? (os.kill(pid, 0) would kill it on Windows)"""
    if os.name == "nt":
        import ctypes
        k32 = ctypes.windll.kernel32
        h = k32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return ctypes.GetLastError() == 5  # access denied: it exists
        try:
            code = ctypes.c_ulong()
            return bool(k32.GetExitCodeProcess(h, ctypes.byref(code))) and code.value == 259  # STILL_ACTIVE
        finally:
            k32.CloseHandle(h)
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except OSError:
        return True


def _holder_alive(lock: Path) -> bool:
    """False when the process that wrote the lock is gone. Unreadable or fresh locks count as alive."""
    try:
        pid = int(lock.read_text().strip() or 0)
    except (OSError, ValueError):
        return True
    if not pid or pid == os.getpid():
        return True
    if time.time() - lock.stat().st_mtime < 2:
        return True  # just written: let its owner finish creating it
    return _pid_alive(pid)


class LockBusy(TimeoutError):
    """Another editor's worker is syncing right now."""


def _touch_lock():
    """The holder's heartbeat: a lock touched recently is never taken as stale."""
    try:
        os.utime(_git_dir() / "raldamain-sync.lock")
    except OSError:
        pass


@contextmanager
def _sync_lock(wait=LOCK_WAIT):
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
                # stale: its editor was closed or restarted mid-sync (live reload), or it went quiet too long
                if not _holder_alive(lock) or time.time() - lock.stat().st_mtime > LOCK_STALE:
                    lock.unlink()
                    continue
            except FileNotFoundError:
                continue
            except OSError:
                pass
            if time.time() - t0 > wait:
                if wait < LOCK_WAIT:
                    raise LockBusy("otro editor está subiendo")
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
    """Branch badge of the editors: {'branch', 'expected', 'ok', 'pending', 'unpushed', 'retry', 'last',
    'error', 'time', 'health'}. pending = saves still waiting for their commit; unpushed = local commits not
    on GitHub yet; retry = '2/5' while a stuck upload is being retried; last/error = how the latest sync went."""
    branch = current_branch()
    st = _read_status()
    retrying = st.get("last") == "retrying" and time.time() - st.get("time", 0) < 600
    return {"branch": branch, "expected": GIT_BRANCH, "ok": not GIT_BRANCH or branch == GIT_BRANCH,
            "pending": len(_jobs()), "unpushed": _unpushed(branch), "retry": st.get("retry", "") if retrying else "",
            "last": st.get("last", ""), "error": "" if retrying else st.get("error", ""),
            "note": st.get("error", "") if retrying else "", "time": st.get("time", 0), "health": st.get("health")}


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


def _write_status(last, error="", **extra):
    try:
        (_sync_dir() / "status.json").write_text(
            json.dumps({"last": last, "error": error, "time": time.time(), **extra}, ensure_ascii=False),
            encoding="utf-8")
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
    return _drain(wait=LOCK_WAIT)


def _work():
    while True:
        time.sleep(0.3)  # saves made in a burst go out together
        try:
            _drain()
        except Exception as e:  # never let the worker die
            _write_status("error", str(e))
        _wake.wait(timeout=60)  # every 60 s it also picks up jobs other editors left behind
        _wake.clear()


def _drain(wait=5):
    jobs = _jobs()
    if not jobs and not _ahead():
        return "nothing"
    try:
        with _sync_lock(wait):
            _repair_local()
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
            r, health = (_pull_push(branch) if _ahead(branch) else ("nothing", None))
            if r not in ("ok", "nothing"):
                errors.append(r)
            _write_status("error" if errors else "ok", "; ".join(errors), health=health)
            return "; ".join(errors) or "ok"
    except LockBusy:
        return "busy"  # the worker holding the lock takes these jobs too
    except TimeoutError as e:
        _write_status("error", str(e))
        return str(e)


def _ahead(branch=None) -> bool:
    """True when there are local commits the remote doesn't have yet."""
    return _unpushed(branch) > 0


def _unpushed(branch=None) -> int:
    branch = branch or current_branch()
    try:
        r = _git("rev-list", "--count", f"origin/{branch}..HEAD", timeout=10)
        return int(r.stdout.strip() or 0) if r.returncode == 0 else 0
    except Exception:
        return 0


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


def _pull_push_once(branch, http1=False):
    """One pull --rebase + push. Returns 'ok' or the error text."""
    try:
        # Rebase on the remote branch first (if it exists) so the push is never rejected
        r = _git("ls-remote", "--exit-code", "--heads", "origin", branch, timeout=LS_TIMEOUT, net=True, http1=http1)
        if r.returncode not in (0, 2):  # 2 = reachable, but the branch isn't there yet
            return "ls-remote: " + (r.stderr.strip() or "error")
        remote = (r.stdout.split() or [""])[0] if r.returncode == 0 else ""
        # Nothing new on GitHub (its branch is already in ours): no pull. pull --autostash would take
        # every uncommitted file back to its committed version and then restore it, which rebuilds
        # and restarts the running tools (the Tablero kicked its players out on every save).
        up_to_date = bool(remote) and _git("merge-base", "--is-ancestor", remote, "HEAD", timeout=30).returncode == 0
        if r.returncode == 0 and not up_to_date:
            marker = _git_dir() / "raldamain-sync.pulling"
            marker.write_text(str(os.getpid()))  # this rebase is ours: _heal_rebase may finish it
            r = _git("pull", "--rebase", "--autostash", "origin", branch, timeout=PULL_TIMEOUT, net=True, http1=http1)
            if r.returncode == 0:
                marker.unlink(missing_ok=True)
            else:
                healed = _heal_rebase()  # the commits stay local; the uncommitted work comes back
                return "pull: " + (r.stderr.strip() or "error") + (f" ({healed})" if healed else "")
        r = _git("push", "-u", "origin", branch, timeout=PUSH_TIMEOUT, net=True, http1=http1)
        if r.returncode != 0:
            return "push: " + (r.stderr.strip() or "error")
        return "ok"
    except subprocess.TimeoutExpired as e:
        healed = _heal_rebase()
        _repair_local()  # the killed git's .lock files
        verb = next((a for a in e.cmd if a in ("ls-remote", "pull", "push")), "")
        return f"atascado: git {verb} no respondió en {int(e.timeout)} s" + (
            f" ({healed})" if healed else "")


def _kind(error: str) -> str:
    """What a pull/push error means: net, auth, missing, conflict, rejected, lock, stuck or other."""
    e = error.lower()
    if "atascado" in e or "operation too slow" in e or "timed out" in e:
        return "stuck"
    if "could not resolve host" in e or "failed to connect" in e or "network is unreachable" in e \
            or "couldn't connect" in e or "no route to host" in e:
        return "net"
    if "authentication failed" in e or "terminal prompts disabled" in e or "could not read username" in e \
            or "permission denied" in e or "403" in e or "invalid username or password" in e:
        return "auth"
    if "repository not found" in e or "does not appear to be a git repository" in e:
        return "missing"
    if "conflict" in e or "could not apply" in e:
        return "conflict"
    if "rejected" in e or "non-fast-forward" in e or "fetch first" in e:
        return "rejected"
    if ".lock" in e and ("exists" in e or "unable to create" in e):
        return "lock"
    if "http/2" in e or "rpc failed" in e or "curl" in e or "early eof" in e or "hung up" in e \
            or "connection reset" in e or "connection was reset" in e or "ssl" in e or "tls" in e:
        return "glitch"
    return "other"


def _pull_push(branch):
    """pull + push with up to ATTEMPTS tries. Returns (result, health of the last check or None)."""
    error, kind, health = "", "", None
    prev = _read_status()
    if prev.get("last") == "error" and (prev.get("health") or {}).get("internet") is False and not _internet():
        # still offline since the last definite error: don't spend another round of tries
        return prev.get("error") or health_message(prev["health"]), prev["health"]
    for attempt in range(1, ATTEMPTS + 1):
        _touch_lock()
        if attempt > 1:
            _write_status("retrying", error, retry=f"{attempt}/{ATTEMPTS}", health=health)
        # after a transfer glitch or a stall, try HTTP/1.1 (fixes most "HTTP/2 stream was not closed cleanly")
        r = _pull_push_once(branch, http1=kind in ("glitch", "stuck"))
        if r == "ok":
            return "ok", health
        error, kind = r, _kind(r)
        if kind == "conflict":  # GitHub has other changes to the same lines: retrying can't help
            return ("conflicto con los cambios que ya hay en GitHub: los commits se quedan en local; "
                    "resuélvelo con git pull --rebase. " + error), health
        health = check_health(branch)  # what is wrong (and repairs what can be fixed here)
        if attempt < ATTEMPTS:
            wait = RETRY_WAIT[min(attempt - 1, len(RETRY_WAIT) - 1)]
            for _ in range(int(wait / 0.5)):  # keep the lock alive while waiting
                time.sleep(0.5)
            _touch_lock()
    return f"no se pudo subir tras {attempt} intentos: {health_message(health) if health else ''} [{error}]", health


# ── Connection health ─────────────────────────────────────────────────────────

STATUS_URL = "https://www.githubstatus.com/api/v2/components.json"  # GitHub's public status page


def _internet() -> bool:
    try:
        socket.create_connection(("github.com", 443), timeout=6).close()
        return True
    except OSError:
        return False


def _github_status() -> str:
    """'up', 'degraded', 'down' (GitHub's own status for Git Operations) or '?' if it can't be read."""
    try:
        with urllib.request.urlopen(STATUS_URL, timeout=6) as r:
            comps = json.loads(r.read().decode("utf-8")).get("components", [])
        st = next((c.get("status") for c in comps if c.get("name") == "Git Operations"), None)
        return {"operational": "up", "degraded_performance": "degraded", "partial_outage": "degraded",
                "major_outage": "down"}.get(st, "?")
    except Exception:
        return "?"


def _repair_local() -> list[str]:
    """Remove .lock files a dead git left behind (stale, or from a git we just killed)."""
    fixed = []
    gd = _git_dir()
    for lock in [gd / "index.lock", gd / "HEAD.lock", gd / "ORIG_HEAD.lock", *(gd / "refs").rglob("*.lock")]:
        try:
            age = time.time() - lock.stat().st_mtime
        except OSError:
            continue
        if age > GIT_LOCK_STALE or (_killed_at and lock.stat().st_mtime <= _killed_at + 1):
            try:
                lock.unlink()
                fixed.append(f"borrado {lock.name} de un git que se quedó colgado")
            except OSError:
                pass
    return fixed


def check_health(branch=None) -> dict:
    """Is GitHub reachable, and can this repo push to it? Also repairs what can be fixed here.
    {'internet': bool, 'github': up/degraded/down/?, 'remote': ok/net/auth/missing/stuck/other,
     'detail': str, 'fixed': [...], 'time': float}"""
    branch = branch or current_branch() or GIT_BRANCH
    fixed = _repair_local()
    healed = _heal_rebase()
    if healed:
        fixed.append(healed)
    out = {"internet": _internet(), "github": _github_status(), "remote": "ok", "detail": "", "fixed": fixed,
           "time": time.time()}
    try:
        r = _git("ls-remote", "--heads", "origin", branch, timeout=LS_TIMEOUT, net=True)
        if r.returncode != 0:
            out["detail"] = r.stderr.strip()
            k = _kind(r.stderr)
            out["remote"] = k if k in ("net", "auth", "missing", "stuck") else "other"
    except subprocess.TimeoutExpired:
        out["remote"], out["detail"] = "stuck", f"git ls-remote no respondió en {LS_TIMEOUT} s"
    if out["remote"] != "ok" and not out["internet"]:
        out["remote"] = "net"
    return out


def health_message(h: dict) -> str:
    """The definite error, in words."""
    if not h["internet"]:
        return "sin conexión a internet (o github.com bloqueado): se subirá solo cuando vuelva la conexión"
    if h["github"] == "down":
        return "GitHub está caído (githubstatus.com): se subirá solo cuando vuelva"
    if h["remote"] == "auth":
        return ("GitHub rechaza las credenciales: abre una terminal en el repo y ejecuta  git push  "
                "una vez para iniciar sesión")
    if h["remote"] == "missing":
        return "no se encuentra el repositorio en GitHub: revisa  git remote -v"
    if h["github"] == "degraded":
        return "GitHub tiene problemas ahora mismo (githubstatus.com): se volverá a intentar solo"
    if h["remote"] in ("stuck", "net"):
        return "GitHub no responde a tiempo: se volverá a intentar solo"
    if h["remote"] == "ok":
        return "la conexión con GitHub funciona, pero el push falla"
    return "error al hablar con GitHub"


# Jobs an editor left behind (closed or restarted mid-save) go out when the next one starts
if _jobs():
    _ensure_worker()


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "salud"
    if cmd in ("salud", "health"):
        h = check_health()
        print(f"Internet: {'sí' if h['internet'] else 'NO'} · GitHub (Git Operations): {h['github']} · "
              f"repo: {h['remote']}")
        for f in h["fixed"]:
            print("  arreglado:", f)
        if h["detail"]:
            print("  git:", h["detail"])
        print("Todo bien" if h["remote"] == "ok" else health_message(h))
        print(f"Pendiente: {len(_jobs())} guardados sin commit, {_unpushed()} commits sin subir")
    elif cmd in ("subir", "push"):
        print(_drain(wait=LOCK_WAIT))
    else:
        print(__doc__)
