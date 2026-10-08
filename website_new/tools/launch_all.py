"""Start every local Raldamain tool at once, in one terminal.

    python tools/launch_all.py            # or double-click Herramientas.bat
    python tools/launch_all.py --no-browser
    python tools/launch_all.py taller rangos   # only some of them

* Rank editor (5174), creature editor (5175), equipment editor (5176) and the
  Taller (5180: stat block gallery + combat simulator).
* A tool whose port is already in use is left alone (it is already running).
* Every log line is prefixed with the tool's name.
* Code edits are picked up by the tools themselves (tools/live_reload.py); if
  a tool crashes -- say, a half-saved file with a syntax error -- it is
  started again a few seconds later, so it comes back once the file is fixed.
* The browser opens one tab per tool, once.  Ctrl+C stops everything.
"""
from __future__ import annotations

import os
import re
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

#        key        label                 script                 port  path
TOOLS = [("rangos",   "Editor de Rangos",    "rank_editor.py",      5174, "/"),
         ("criaturas", "Editor de Criaturas", "creature_editor.py",  5175, "/"),
         ("equipo",   "Editor de Equipo",    "equipment_editor.py", 5176, "/"),
         ("taller",   "Taller",              "taller.py",           5180, "/taller")]

COLORS = {"rangos": "\033[33m", "criaturas": "\033[32m", "equipo": "\033[36m", "taller": "\033[35m"}
RESET = "\033[0m"
RETRY_SECONDS = 4
OFFSET = 0  # --offset=N: ports + N, to try a second copy next to the running one

# Startup chatter already summed up by the launcher's own "✓ … → url" line
NOISE = re.compile(
    r"^(\* (Serving Flask app|Debug mode|Running on|Restarting with)|WARNING: This is a development server"
    r"|Press CTRL\+C|(Equipment|Rank|Creature) Editor|Taller de Raldamain|Archivos|Fichas)")
CHANGE = re.compile(r"\* Detected change in '(.+?)'")

stopping = threading.Event()
print_lock = threading.Lock()


def say(key: str, text: str) -> None:
    tag = f"{COLORS.get(key, '')}[{key:<9}]{RESET}" if key else ""
    with print_lock:
        print(f"{tag} {text}" if tag else text, flush=True)


def port_open(port: int) -> bool:
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def bind_children_to_launcher() -> None:
    """Windows: put the launcher in a Job Object that kills every process in it
    when the launcher goes away (Ctrl+C, closing the window, a crash).  The
    tools, their reloader children and the Store-Python alias hop all inherit
    it, so no orphan server is left holding a port."""
    if os.name != "nt":
        return
    import ctypes
    from ctypes import wintypes

    class IO_COUNTERS(ctypes.Structure):
        _fields_ = [(n, ctypes.c_ulonglong) for n in (
            "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
            "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]

    class BASIC_LIMITS(ctypes.Structure):
        _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64),
                    ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
                    ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
                    ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD),
                    ("SchedulingClass", wintypes.DWORD)]

    class EXTENDED_LIMITS(ctypes.Structure):
        _fields_ = [("BasicLimitInformation", BASIC_LIMITS), ("IoInfo", IO_COUNTERS),
                    ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                    ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]

    KILL_ON_JOB_CLOSE, EXTENDED_LIMIT_INFORMATION = 0x2000, 9
    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    k32.CreateJobObjectW.restype = wintypes.HANDLE
    k32.GetCurrentProcess.restype = wintypes.HANDLE
    job = k32.CreateJobObjectW(None, None)
    if not job:
        return
    info = EXTENDED_LIMITS()
    info.BasicLimitInformation.LimitFlags = KILL_ON_JOB_CLOSE
    k32.SetInformationJobObject(wintypes.HANDLE(job), EXTENDED_LIMIT_INFORMATION,
                                ctypes.byref(info), ctypes.sizeof(info))
    k32.AssignProcessToJobObject(wintypes.HANDLE(job), wintypes.HANDLE(k32.GetCurrentProcess()))
    globals()["_JOB"] = job  # the handle lives as long as the launcher


def kill_tree(proc: subprocess.Popen) -> None:
    """The reloader runs the server in a child process: stop both."""
    if proc.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        proc.terminate()
        try:
            proc.wait(5)
        except subprocess.TimeoutExpired:
            proc.kill()


def supervise(key: str, script: str, procs: dict) -> None:
    """Run one tool, piping its output, and start it again if it dies."""
    env = dict(os.environ, PYTHONUNBUFFERED="1", PYTHONIOENCODING="utf-8",
               RALDAMAIN_NO_BROWSER="1", TALLER_NO_BROWSER="1",
               RALDAMAIN_PORT_OFFSET=str(OFFSET))
    env.pop("TALLER_PORT", None)
    last_error = ""  # tail of the last failed run; same error again → stay quiet
    while not stopping.is_set():
        proc = subprocess.Popen(
            [sys.executable, str(ROOT / "tools" / script)], cwd=ROOT, env=env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace",
            creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0),
        )
        procs[key] = proc
        tail: list[str] = []
        held: list[str] = []  # while retrying, output waits until we know it is news
        for line in proc.stdout:
            line = line.rstrip()
            if not line:
                continue
            tail = (tail + [line])[-6:]
            m = CHANGE.search(line)
            if last_error and line.lstrip().startswith("* Running on"):
                for h in held:
                    say(key, h)
                held, last_error = [], ""
                say(key, "✓ vuelve a funcionar")
            elif m:
                say(key, f"↻ {Path(m.group(1)).name} cambió: reiniciando")
            elif not NOISE.search(line.strip()):
                (held.append if last_error else lambda t: say(key, t))(line)
        code = proc.wait()
        if stopping.is_set():
            return
        error = "\n".join(tail)
        if error != last_error:
            for h in held:
                say(key, h)
            say(key, f"⚠ se detuvo (código {code}); se reintenta cada {RETRY_SECONDS}s hasta que el archivo se arregle…")
            last_error = error
        time.sleep(RETRY_SECONDS)


def main(argv: list[str]) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if os.name == "nt":
        os.system("")  # enable ANSI colours in the Windows console
    global OFFSET
    browser = "--no-browser" not in argv
    OFFSET = next((int(a.split("=", 1)[1]) for a in argv if a.startswith("--offset=")), 0)
    wanted = [a for a in argv if not a.startswith("--")]
    tools = [t for t in TOOLS if not wanted or t[0] in wanted]
    if wanted and len(tools) != len(wanted):
        known = ", ".join(t[0] for t in TOOLS)
        print(f"Herramientas: {known}")
        return 2

    bind_children_to_launcher()
    print("Herramientas de Raldamain — Ctrl+C para detenerlas todas\n")
    procs: dict[str, subprocess.Popen] = {}
    started = []
    for key, label, script, port, path in tools:
        port += OFFSET
        url = f"http://localhost:{port}{path}"
        if port_open(port):
            say(key, f"{label} ya está abierto → {url}")
            continue
        threading.Thread(target=supervise, args=(key, script, procs), daemon=True).start()
        started.append((key, label, port, url))

    # Wait until each server answers, then report and open its tab
    deadline = time.time() + 40
    pending = list(started)
    while pending and time.time() < deadline:
        for item in list(pending):
            key, label, port, url = item
            if port_open(port):
                say(key, f"✓ {label} → {url}")
                if browser:
                    webbrowser.open(url)
                pending.remove(item)
        time.sleep(0.4)
    for key, label, port, url in pending:
        say(key, f"… {label} todavía no responde en {url} (mira los mensajes de arriba)")

    if not started:
        print("\nTodo estaba ya abierto.")
        return 0
    print("\nLos cambios en el código se aplican solos. Ctrl+C para cerrar.\n", flush=True)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        stopping.set()
        print("\nCerrando…", flush=True)
        for proc in procs.values():
            kill_tree(proc)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
