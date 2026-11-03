#!/usr/bin/env python3
"""
Compartir partida — the Tablero on the internet at https://tablero.raldamain.com,
served from this computer through a Cloudflare Tunnel (raldamain.com's DNS is on
Cloudflare). Free, no router setup, this computer's IP is never shown; it works
while this computer and the tunnel are running.

One-time setup (the Tablero's "🌐 Compartir" panel does each step):
  1. login   `cloudflared tunnel login`: a browser page where you pick raldamain.com
             (saves ~/.cloudflared/cert.pem)
  2. setup   creates the tunnel "tablero" and the DNS record tablero.raldamain.com
             pointing to it, and writes storage/share/config.yml
Then:
  start / stop   run the tunnel (its process id in storage/share/cloudflared.pid, so
                 it survives the Tablero restarting itself; the log next to it)

The GM page is only ever the one opened on this computer: requests arriving through
the tunnel are never the GM (tablero.py, _local_request).

Usage:  python tools/tablero_share.py status|login|setup|start|stop
        TABLERO_PUBLIC_HOST=otro.raldamain.com to use another address
"""

import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from git_sync import _pid_alive  # noqa: E402  (Windows-safe "is it running")

TOOLS = Path(__file__).resolve().parent
STORAGE = Path(os.environ.get("TABLERO_STORAGE") or TOOLS / "tablero" / "storage")
DIR = STORAGE / "share"
PID = DIR / "cloudflared.pid"
LOG = DIR / "cloudflared.log"
SETUP_LOG = DIR / "setup.log"
CONFIG = DIR / "config.yml"
TUNNEL = DIR / "tunnel.json"          # {id, name, host}
CF_HOME = Path.home() / ".cloudflared"
CERT = CF_HOME / "cert.pem"
HOST = os.environ.get("TABLERO_PUBLIC_HOST", "tablero.raldamain.com")
NAME = "tablero"
PORT = 5179
NO_WINDOW = 0x08000000 if os.name == "nt" else 0       # CREATE_NO_WINDOW
DETACHED = 0x00000008 | 0x00000200 if os.name == "nt" else 0  # DETACHED_PROCESS | NEW_PROCESS_GROUP


def binary() -> str | None:
    found = shutil.which("cloudflared")
    if found:
        return found
    for p in (r"C:\Program Files (x86)\cloudflared\cloudflared.exe", r"C:\Program Files\cloudflared\cloudflared.exe"):
        if Path(p).exists():
            return p
    return None


def _run(*args, timeout=90) -> subprocess.CompletedProcess:
    return subprocess.run([binary(), *args], capture_output=True, text=True, encoding="utf-8", errors="replace",
                          timeout=timeout, stdin=subprocess.DEVNULL, creationflags=NO_WINDOW)


def _pid() -> int | None:
    try:
        pid = int(PID.read_text().strip())
    except (OSError, ValueError):
        return None
    return pid if _pid_alive(pid) else None


def _log_tail(path: Path, n=4000) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")[-n:]
    except OSError:
        return ""


def url() -> str:
    return f"https://{HOST}"


def status() -> dict:
    """state: missing (no cloudflared) · login (step 1 to do) · logging-in · setup (step 2) ·
    off · starting · on · error"""
    out = {"host": HOST, "url": url(), "state": "off", "message": ""}
    if not binary():
        return {**out, "state": "missing", "message": "Falta cloudflared: winget install Cloudflare.cloudflared"}
    if not CERT.exists():
        login_pid = _read_int(DIR / "login.pid")
        if login_pid and _pid_alive(login_pid):
            # the page's address, to open it again if its tab was closed
            m = re.search(r"https://dash\.cloudflare\.com/argotunnel\S+", _log_tail(SETUP_LOG))
            return {**out, "state": "logging-in", "login_url": m.group(0) if m else "",
                    "message": "Autoriza raldamain.com en la página de Cloudflare que se abrió."}
        return {**out, "state": "login"}
    if not TUNNEL.exists() or not CONFIG.exists():
        return {**out, "state": "setup"}
    pid = _pid()
    if not pid:
        return out
    log = _log_tail(LOG)
    if re.search(r"Registered tunnel connection", log):
        return {**out, "state": "on", "pid": pid}
    err = [l for l in log.splitlines() if " ERR " in l]
    return {**out, "state": "starting", "pid": pid, "message": err[-1][-200:] if err else ""}


def _read_int(p: Path) -> int | None:
    try:
        return int(p.read_text().strip())
    except (OSError, ValueError):
        return None


def login() -> dict:
    """Step 1: opens Cloudflare's page in the browser to authorise raldamain.com."""
    DIR.mkdir(parents=True, exist_ok=True)
    if CERT.exists():
        return status()
    p = subprocess.Popen([binary(), "tunnel", "login"], stdout=open(SETUP_LOG, "w", encoding="utf-8"),
                         stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, creationflags=NO_WINDOW)
    (DIR / "login.pid").write_text(str(p.pid))
    return {**status(), "state": "logging-in", "message": "Se abrió Cloudflare en el navegador: elige raldamain.com y pulsa Authorize."}


def setup() -> dict:
    """Step 2: the tunnel "tablero" (made once, reused after) and tablero.raldamain.com pointing at it."""
    DIR.mkdir(parents=True, exist_ok=True)
    if not CERT.exists():
        return {**status(), "state": "login", "message": "Primero conecta con Cloudflare (paso 1)."}
    log = open(SETUP_LOG, "a", encoding="utf-8")
    r = _run("tunnel", "list", "--output", "json", "--name", NAME)
    log.write(r.stdout + r.stderr)
    tunnels = json.loads(r.stdout or "[]") if r.returncode == 0 else []  # (deleted ones are not listed)
    if tunnels:
        tid = tunnels[0]["id"]
    else:
        r = _run("tunnel", "create", NAME)
        log.write(r.stdout + r.stderr)
        m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", r.stdout + r.stderr)
        if r.returncode != 0 or not m:
            return {**status(), "state": "error", "message": "No se pudo crear el túnel: " + (r.stderr or r.stdout).strip()[-300:]}
        tid = m.group(1)
    creds = CF_HOME / f"{tid}.json"
    if not creds.exists():
        return {**status(), "state": "error",
                "message": f"El túnel «{NAME}» existe, pero sus credenciales no están en este ordenador ({creds}). Bórralo en Cloudflare (Zero Trust → Tunnels) y repite."}
    r = _run("tunnel", "route", "dns", NAME, HOST)
    log.write(r.stdout + r.stderr)
    if r.returncode != 0 and "already" not in (r.stdout + r.stderr).lower():
        return {**status(), "state": "error", "message": f"No se pudo crear {HOST} en el DNS: " + (r.stderr or r.stdout).strip()[-300:]}
    CONFIG.write_text(
        f"tunnel: {tid}\n"
        f"credentials-file: {json.dumps(str(creds))}\n"
        "ingress:\n"
        f"  - hostname: {HOST}\n"
        f"    service: http://127.0.0.1:{PORT}\n"
        "  - service: http_status:404\n", encoding="utf-8")
    TUNNEL.write_text(json.dumps({"id": tid, "name": NAME, "host": HOST}, indent=2), encoding="utf-8")
    log.close()
    return status()


def start() -> dict:
    st = status()
    if st["state"] in ("on", "starting"):
        return st
    if st["state"] != "off":
        return st
    LOG.write_text("", encoding="utf-8")
    # detached: it keeps running while the Tablero restarts itself after code edits
    p = subprocess.Popen([binary(), "tunnel", "--no-autoupdate", "--config", str(CONFIG), "run"],
                         stdout=open(LOG, "a", encoding="utf-8"), stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                         creationflags=NO_WINDOW | DETACHED, close_fds=True)
    PID.write_text(str(p.pid))
    for _ in range(40):  # usually connected in 2-5 s
        time.sleep(0.25)
        st = status()
        if st["state"] != "starting":
            break
    return st


def stop() -> dict:
    pid = _pid()
    if pid:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, creationflags=NO_WINDOW)
        else:
            os.kill(pid, 15)
    PID.unlink(missing_ok=True)
    return status()


if __name__ == "__main__":
    cmd = (sys.argv[1:] or ["status"])[0]
    fn = {"status": status, "login": login, "setup": setup, "start": start, "stop": stop}.get(cmd)
    if not fn:
        print(__doc__)
        sys.exit(1)
    print(json.dumps(fn(), ensure_ascii=False, indent=2))
