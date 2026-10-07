"""File caching for the simulator's data.

Everything the simulator reads is keyed by the file's (mtime, size), so a file
is parsed once and only re-read when it actually changes on disk:

* ``load_yaml(path)``  YAML, parsed with PyYAML's C loader when available and
                       also kept in an on-disk pickle cache (``combat-simulator/
                       .cache``) so a fresh start skips parsing as well;
* ``load_json(path)``  JSON (fast enough to keep in memory only);
* ``fingerprint(...)`` a cheap key for "has anything in these folders changed?",
                       used to invalidate derived caches (roster, assembled specs).
"""

from __future__ import annotations

import hashlib
import json
import pickle
from pathlib import Path
from typing import Any, Iterable

import yaml

try:
    _Loader = yaml.CSafeLoader  # libyaml: ~10x faster than the pure-Python loader
except AttributeError:  # pragma: no cover - PyYAML built without libyaml
    _Loader = yaml.SafeLoader

#: combat-simulator/.cache
CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache"
#: Bump when the pickled format changes, to ignore old cache files
_DISK_VERSION = 1

_memory: dict[str, tuple[tuple[int, int], Any]] = {}


def file_key(path: Path) -> tuple[int, int]:
    st = path.stat()
    return st.st_mtime_ns, st.st_size


def fingerprint(paths: Iterable[Path]) -> tuple:
    """A key that changes whenever any of ``paths`` (files or folders) changes."""
    parts = []
    for p in paths:
        if p.is_dir():
            for f in sorted(p.iterdir()):
                if f.is_file():
                    parts.append((f.name, *file_key(f)))
            parts.append((str(p), "dir"))
        elif p.exists():
            parts.append((str(p), *file_key(p)))
    return tuple(parts)


def _remember(path: Path, key: tuple[int, int], value: Any) -> Any:
    _memory[str(path)] = (key, value)
    return value


def load_json(path: Path) -> Any:
    key = file_key(path)
    hit = _memory.get(str(path))
    if hit and hit[0] == key:
        return hit[1]
    return _remember(path, key, json.loads(path.read_text(encoding="utf-8")))


def load_yaml(path: Path) -> Any:
    key = file_key(path)
    hit = _memory.get(str(path))
    if hit and hit[0] == key:
        return hit[1]

    disk = CACHE_DIR / f"{path.stem}-{hashlib.md5(str(path).encode()).hexdigest()[:10]}.pickle"
    try:
        with disk.open("rb") as fh:
            version, disk_key, value = pickle.load(fh)
        if version == _DISK_VERSION and disk_key == key:
            return _remember(path, key, value)
    except Exception:
        pass  # missing / stale / unreadable cache: parse below

    value = yaml.load(path.read_text(encoding="utf-8"), Loader=_Loader)
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with disk.open("wb") as fh:
            pickle.dump((_DISK_VERSION, key, value), fh, protocol=pickle.HIGHEST_PROTOCOL)
    except Exception:
        pass  # a read-only folder just means no disk cache
    return _remember(path, key, value)


def clear() -> None:
    """Forget everything held in memory (the disk cache revalidates itself)."""
    _memory.clear()
