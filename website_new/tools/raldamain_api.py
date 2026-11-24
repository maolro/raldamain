#!/usr/bin/env python3
"""
Client of the Raldamain API (https://raldamain.com/api/v1, functions/api/v1/[[path]].js):
the tools that show the game's data (the Tablero) read it from here, as any other app would,
instead of from the files in data/.

    get("ranks")                    the list (each with url, image_url)
    get("ranks/estilo_coloso")      one, the document as stored
    get("creatures/<id>")           None: not in the API (unpublished, or no such thing)

Kept for TTL seconds (then asked again with If-None-Match: unchanged costs nothing). When the
site can't be reached (no internet, or the API not deployed yet) get() raises Unavailable — the
caller then reads the local file — and the site is not asked again for DOWN_FOR seconds (2 minutes), so a
board played offline doesn't wait on it at every request.

    RALDAMAIN_API=https://…/api/v1  another address (a test deployment)
    RALDAMAIN_API=local             never ask: the local files only

    python tools/raldamain_api.py ranks/estilo_coloso     (what the API answers)
"""

import json
import os
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("RALDAMAIN_API", "https://raldamain.com/api/v1").rstrip("/")
OFF = API.lower() in ("", "local", "off", "0")
TTL = 60          # seconds an answer is used before asking again
DOWN_FOR = 120    # seconds without asking after the site couldn't be reached
TIMEOUT = 5

_cache: dict[str, tuple[float, str, object]] = {}   # path → (when, etag, data; None = not there)
_lock = threading.Lock()
_down_until = 0.0


class Unavailable(Exception):
    """The API couldn't be reached (or isn't there): use the local files."""


def _url(path: str) -> str:
    return f"{API}/{urllib.parse.quote(path.strip('/'), safe='/')}" if path.strip("/") else API


def get(path: str):
    """The API's answer for `path` (parsed JSON), or None when it says there is no such thing."""
    global _down_until
    if OFF:
        raise Unavailable("RALDAMAIN_API=local")
    now = time.time()
    with _lock:
        hit = _cache.get(path)
    if hit and now - hit[0] < TTL:
        return hit[2]
    if now < _down_until:
        if hit:
            return hit[2]   # (what it said last: better than nothing)
        raise Unavailable("the site can't be reached")
    req = urllib.request.Request(_url(path), headers={"Accept": "application/json", "User-Agent": "raldamain-tools"})
    if hit and hit[1]:
        req.add_header("If-None-Match", hit[1])
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read()
            etag = r.headers.get("ETag") or ""
            ctype = r.headers.get("Content-Type") or ""
        # (before the API is deployed, the site answers any unknown address with its home page)
        if "json" not in ctype or not body.lstrip()[:1] in (b"{", b"["):
            raise Unavailable("the site has no API at " + API)
        data = json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 304 and hit:
            data, etag = hit[2], hit[1]
        elif e.code == 404:
            data, etag = None, ""
        else:
            _down_until = now + DOWN_FOR
            if hit:
                return hit[2]
            raise Unavailable(f"HTTP {e.code}") from e
    except (urllib.error.URLError, OSError, ValueError, Unavailable) as e:
        _down_until = now + DOWN_FOR
        if hit:
            return hit[2]
        if isinstance(e, Unavailable):
            raise
        raise Unavailable(str(e)) from e
    with _lock:
        _cache[path] = (now, etag, data)
    return data


def forget():
    """Ask again next time (everything)."""
    global _down_until
    with _lock:
        _cache.clear()
    _down_until = 0.0


if __name__ == "__main__":
    try:
        print(json.dumps(get(sys.argv[1] if len(sys.argv) > 1 else ""), ensure_ascii=False, indent=2)[:4000])
    except Unavailable as e:
        print("No disponible:", e)
        sys.exit(1)
