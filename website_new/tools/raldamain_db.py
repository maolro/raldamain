#!/usr/bin/env python3
"""
SQLite mirror of the Raldamain data: the Taller loads stat blocks, creatures, ranks
and the builder data from here.

The .json files under data/ stay the source of truth (and the git history). Every
save writes its .json and then calls record(paths), which imports those files again.
sync() compares every tracked file with the database (size + mtime first, then a
content hash) and re-imports whatever differs, so a git rollback, a pull or a hand
edit is picked up on its own: the Taller syncs on start and before it reads (at most
once a second).

Each file is kept twice in the database:
  files       the exact text of the .json (export writes it back byte for byte)
  <tables>    its fields in columns, for SQL queries (statblocks, creatures,
              creature_entries, ranks, rank_abilities, ... see SCHEMA)

    python tools/raldamain_db.py sync            import whatever changed
    python tools/raldamain_db.py rebuild         empty the database and import everything
    python tools/raldamain_db.py check           compare every .json with the database
    python tools/raldamain_db.py export <dir>    write the database out as .json files into <dir>
    python tools/raldamain_db.py sql "<query>"   run a query, e.g. "SELECT id, level FROM creatures"
    python tools/raldamain_db.py path            where the database file is

The database lives in the repo's .git folder (.git/raldamain-db/raldamain.db): it is
never committed, served by the website or watched by live reload, and a fresh clone
simply builds it from the .json files. RALDAMAIN_DB=<file> puts it elsewhere.

To mirror a new kind of file: add its glob to SOURCES, its tables to SCHEMA and a
parser (file data -> rows) to PARSERS.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import sqlite3
import sys
import threading
import time
from pathlib import Path
from typing import Any, Callable, Iterable

BASE = Path(__file__).resolve().parent.parent  # website_new/

# (glob relative to website_new, kind): the files mirrored in the database
SOURCES = [
    ("data/statblocks/*.json", "statblock"),
    ("data/creatures/*.json", "creature"),
    ("data/ranks/*.json", "rank"),
    ("data/equipment/*.json", "item"),
    ("data/creatures_list.json", "creature_index"),
    ("data/ranks_list.json", "rank_index"),
    ("data/equipment_list.json", "item_index"),
    ("data/creatures_abilities.json", "creature_ability"),
    ("data/creature_scaling.json", "document"),
    ("data/builder/*.json", "document"),
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,            -- relative to website_new, e.g. data/creatures/lobo.json
    kind TEXT NOT NULL,
    raw TEXT NOT NULL,                -- the file's exact text
    sha1 TEXT NOT NULL,
    size INTEGER, mtime_ns INTEGER, mtime REAL,
    error TEXT                        -- set when the file is not valid JSON (then it has no rows below)
);
CREATE TABLE IF NOT EXISTS statblocks (path TEXT, id TEXT, name TEXT, level INTEGER, race TEXT, archetypes TEXT);
CREATE TABLE IF NOT EXISTS statblock_ranks (path TEXT, statblock_id TEXT, position INTEGER, rank_id TEXT, name TEXT,
    category TEXT, rank INTEGER, stat TEXT);
CREATE TABLE IF NOT EXISTS creatures (path TEXT, id TEXT, name TEXT, level INTEGER, type TEXT, size TEXT, tier TEXT,
    hits INTEGER, published INTEGER, tags TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS creature_entries (path TEXT, creature_id TEXT, section TEXT, position INTEGER, name TEXT,
    ability_id TEXT, type TEXT, bonus TEXT, damage TEXT, cost TEXT, range TEXT, area TEXT, tags TEXT, desc TEXT);
CREATE TABLE IF NOT EXISTS creature_index (path TEXT, position INTEGER, id TEXT, name TEXT, type TEXT, level INTEGER,
    size TEXT, image TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS ranks (path TEXT, id TEXT, title TEXT, category TEXT, draft INTEGER, image TEXT,
    stats TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS rank_abilities (path TEXT, rank_id TEXT, level TEXT, level_title TEXT, level_draft INTEGER,
    position INTEGER, name TEXT, tags TEXT, cost TEXT, range TEXT, area TEXT, duration TEXT, uses TEXT,
    desc TEXT, empower TEXT);
CREATE TABLE IF NOT EXISTS rank_index (path TEXT, position INTEGER, id TEXT, name TEXT, category TEXT, image TEXT,
    description TEXT, draft INTEGER, partial INTEGER);
CREATE TABLE IF NOT EXISTS items (path TEXT, id TEXT, name TEXT, type TEXT, subtype TEXT, rarity TEXT, price TEXT,
    damage TEXT, damage_type TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS item_index (path TEXT, position INTEGER, id TEXT, name TEXT, type TEXT, subtype TEXT,
    rarity TEXT, price TEXT, image TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS creature_abilities (path TEXT, position INTEGER, id TEXT, name TEXT, type TEXT, tier TEXT,
    cost TEXT, range TEXT, tags TEXT, desc TEXT);
-- builder files and other documents: one row per entry (races.json -> one row per race, ...)
CREATE TABLE IF NOT EXISTS document_entries (path TEXT, section TEXT, key TEXT, position INTEGER, name TEXT, data TEXT);
"""
# every table filled by a parser, with its path column (rows are replaced per file)
ROW_TABLES = ["statblocks", "statblock_ranks", "creatures", "creature_entries", "creature_index", "ranks",
              "rank_abilities", "rank_index", "items", "item_index", "creature_abilities", "document_entries"]
INDEXES = """
CREATE INDEX IF NOT EXISTS files_kind ON files(kind);
CREATE INDEX IF NOT EXISTS statblocks_id ON statblocks(id);
CREATE INDEX IF NOT EXISTS creatures_id ON creatures(id);
CREATE INDEX IF NOT EXISTS ranks_id ON ranks(id);
""" + "".join(f"CREATE INDEX IF NOT EXISTS {t}_path ON {t}(path);\n" for t in ROW_TABLES)


# ─────────────────────────────────────────────────────────────── parsers: file data -> rows

def _v(x: Any) -> Any:
    """A column value: lists of words joined by commas, other structures as JSON."""
    if isinstance(x, bool):
        return int(x)
    if x is None or isinstance(x, (str, int, float)):
        return x
    if isinstance(x, list) and all(isinstance(i, (str, int, float)) for i in x):
        return ", ".join(str(i) for i in x)
    return json.dumps(x, ensure_ascii=False)


def _int(x: Any) -> int | None:
    try:
        return int(x)
    except (TypeError, ValueError):
        return None


def _flag(x: Any) -> int | None:
    return None if x is None else int(bool(x))


def _dicts(x: Any) -> list[dict]:
    return [i for i in x if isinstance(i, dict)] if isinstance(x, list) else []


Rows = dict[str, list[dict[str, Any]]]


def parse_statblock(path: str, d: Any) -> Rows:
    sid = Path(path).stem
    d = d if isinstance(d, dict) else {}
    return {
        "statblocks": [{"id": sid, "name": _v(d.get("name")), "level": _int(d.get("level")),
                        "race": _v((d.get("race") or {}).get("name") if isinstance(d.get("race"), dict) else d.get("race")),
                        "archetypes": _v([a.get("name") if isinstance(a, dict) else a for a in d.get("archetypes") or []])}],
        "statblock_ranks": [{"statblock_id": sid, "position": i, "rank_id": _v(r.get("id")), "name": _v(r.get("name")),
                             "category": _v(r.get("category")), "rank": _int(r.get("rank")), "stat": _v(r.get("stat"))}
                            for i, r in enumerate(_dicts(d.get("ranks")))],
    }


def parse_creature(path: str, d: Any) -> Rows:
    cid = Path(path).stem
    d = d if isinstance(d, dict) else {}
    entries = []
    for section in ("traits", "actions", "reactions"):
        for i, a in enumerate(_dicts(d.get(section))):
            entries.append({"creature_id": cid, "section": section, "position": i, "name": _v(a.get("name")),
                            "ability_id": _v(a.get("ability_id")), "type": _v(a.get("type")), "bonus": _v(a.get("bonus")),
                            "damage": _v(a.get("damage")), "cost": _v(a.get("cost")), "range": _v(a.get("range")),
                            "area": _v(a.get("area")), "tags": _v(a.get("tags")), "desc": _v(a.get("desc"))})
    return {
        "creatures": [{"id": cid, "name": _v(d.get("name")), "level": _int(d.get("level")), "type": _v(d.get("type")),
                       "size": _v(d.get("size")), "tier": _v(d.get("tier")), "hits": _int(d.get("hits")),
                       "published": _flag(d.get("published")), "tags": _v(d.get("tags")),
                       "description": _v(d.get("description"))}],
        "creature_entries": entries,
    }


def parse_rank(path: str, d: Any) -> Rows:
    d = d if isinstance(d, dict) else {}
    rid = d.get("id") or Path(path).stem
    abilities = []
    for lv in _dicts(d.get("levels")):
        for i, a in enumerate(_dicts(lv.get("abilities"))):
            abilities.append({"rank_id": rid, "level": _v(lv.get("rank")), "level_title": _v(lv.get("title")),
                              "level_draft": _flag(lv.get("draft")), "position": i, "name": _v(a.get("name")),
                              "tags": _v(a.get("tags")), "cost": _v(a.get("cost")), "range": _v(a.get("range")),
                              "area": _v(a.get("area")), "duration": _v(a.get("duration")), "uses": _v(a.get("uses")),
                              "desc": _v(a.get("desc")), "empower": _v(a.get("empower"))})
    return {"ranks": [{"id": rid, "title": _v(d.get("title")), "category": _v(d.get("category")),
                       "draft": _flag(d.get("draft")), "image": _v(d.get("image")), "stats": _v(d.get("stats")),
                       "description": _v(d.get("description"))}],
            "rank_abilities": abilities}


def parse_item(path: str, d: Any) -> Rows:
    d = d if isinstance(d, dict) else {}
    return {"items": [{"id": d.get("id") or Path(path).stem, **{k: _v(d.get(k)) for k in
                       ("name", "type", "subtype", "rarity", "price", "damage", "description")},
                       "damage_type": _v(d.get("damageType"))}]}


def _index(table: str, cols: Iterable[str]) -> Callable[[str, Any], Rows]:
    def parse(path: str, d: Any) -> Rows:
        return {table: [{"position": i, **{c: _v(e.get(c)) for c in cols}} for i, e in enumerate(_dicts(d))]}
    return parse


def parse_creature_abilities(path: str, d: Any) -> Rows:
    return {"creature_abilities": [{"position": i, **{k: _v(a.get(k)) for k in
                                    ("id", "name", "type", "tier", "cost", "range", "tags", "desc")}}
                                   for i, a in enumerate(_dicts(d))]}


def parse_document(path: str, d: Any) -> Rows:
    """One row per entry: {key: {...}} files by key, {section: {key: {...}}} files
    (builder/equipment.json) by section and key, lists by position."""
    rows = []

    def row(section, key, pos, value):
        name = value.get("name") if isinstance(value, dict) else None
        rows.append({"section": section, "key": key, "position": pos, "name": _v(name),
                     "data": json.dumps(value, ensure_ascii=False)})

    if isinstance(d, list):
        for i, v in enumerate(d):
            row(None, None, i, v)
    elif isinstance(d, dict):
        for i, (k, v) in enumerate(d.items()):
            if isinstance(v, dict) and v and all(isinstance(x, dict) for x in v.values()) and "name" not in v:
                for j, (kk, vv) in enumerate(v.items()):
                    row(k, kk, j, vv)
            else:
                row(None, k, i, v)
    return {"document_entries": rows}


PARSERS: dict[str, Callable[[str, Any], Rows]] = {
    "statblock": parse_statblock,
    "creature": parse_creature,
    "rank": parse_rank,
    "item": parse_item,
    "creature_index": _index("creature_index", ("id", "name", "type", "level", "size", "image", "description")),
    "rank_index": _index("rank_index", ("id", "name", "category", "image", "description", "draft", "partial")),
    "item_index": _index("item_index", ("id", "name", "type", "subtype", "rarity", "price", "image", "description")),
    "creature_ability": parse_creature_abilities,
    "document": parse_document,
}


# ─────────────────────────────────────────────────────────────── the store

def _default_db_path(base: Path) -> Path:
    if os.environ.get("RALDAMAIN_DB"):
        return Path(os.environ["RALDAMAIN_DB"])
    for parent in (base, *base.parents):
        if (parent / ".git").is_dir():
            return parent / ".git" / "raldamain-db" / "raldamain.db"
    return base / ".raldamain.db"


class Store:
    """The database for one website_new folder. Safe to share between threads
    (one connection per thread) and between processes (WAL)."""

    def __init__(self, base: Path = BASE, db_path: Path | None = None):
        self.base = Path(base).resolve()
        self.path = Path(db_path) if db_path else _default_db_path(self.base)
        self._local = threading.local()
        self._sync_lock = threading.Lock()
        self._last_sync = 0.0
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as c:
            c.executescript(SCHEMA + INDEXES)

    # ── connection
    def _conn(self) -> sqlite3.Connection:
        c = getattr(self._local, "conn", None)
        if c is None:
            c = sqlite3.connect(self.path, timeout=30, isolation_level=None)  # autocommit; BEGIN where needed
            c.row_factory = sqlite3.Row
            c.execute("PRAGMA journal_mode=WAL")
            c.execute("PRAGMA synchronous=NORMAL")
            self._local.conn = c
        return c

    def query(self, sql: str, args: Iterable[Any] = ()) -> list[sqlite3.Row]:
        return self._conn().execute(sql, tuple(args)).fetchall()

    # ── which files are mirrored
    def tracked(self) -> dict[str, str]:
        """{relative path: kind} of every tracked .json on disk."""
        return {rel: kind for rel, (kind, _) in self._scan().items()}

    def _scan(self) -> dict[str, tuple[str, os.stat_result]]:
        """{relative path: (kind, stat)} of every tracked .json on disk. Uses scandir:
        on Windows the directory listing already carries size and mtime (no stat per file)."""
        out: dict[str, tuple[str, os.stat_result]] = {}
        for pattern, kind in SOURCES:
            folder, name = pattern.rsplit("/", 1)
            try:
                entries = sorted(os.scandir(self.base / folder), key=lambda e: e.name)
            except FileNotFoundError:
                continue
            for e in entries:
                if fnmatch.fnmatchcase(e.name, name) and e.is_file():
                    out.setdefault(f"{folder}/{e.name}", (kind, e.stat()))
        return out

    def kind_of(self, rel: str) -> str | None:
        for pattern, kind in SOURCES:
            if Path(rel).match(pattern):
                return kind
        return None

    def rel(self, path: str | Path) -> str:
        p = Path(path)
        if not p.is_absolute():
            p = self.base / p
        return p.resolve().relative_to(self.base).as_posix()

    # ── import (.json -> database)
    def _import(self, c: sqlite3.Connection, rel: str, kind: str, st: os.stat_result, data: bytes) -> None:
        raw = data.decode("utf-8", errors="replace")
        sha = hashlib.sha1(data).hexdigest()
        error, parsed = None, None
        try:
            parsed = json.loads(data.decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - kept as text; check() lists it
            error = str(e)
        for t in ROW_TABLES:
            c.execute(f"DELETE FROM {t} WHERE path = ?", (rel,))
        c.execute("INSERT OR REPLACE INTO files (path, kind, raw, sha1, size, mtime_ns, mtime, error) "
                  "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (rel, kind, raw, sha, st.st_size, st.st_mtime_ns, st.st_mtime, error))
        if error is None:
            for table, rows in PARSERS[kind](rel, parsed).items():
                for r in rows:
                    cols = ["path", *r]
                    c.execute(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                              (rel, *r.values()))

    def _forget(self, c: sqlite3.Connection, rel: str) -> None:
        for t in ROW_TABLES:
            c.execute(f"DELETE FROM {t} WHERE path = ?", (rel,))
        c.execute("DELETE FROM files WHERE path = ?", (rel,))

    def sync(self, paths: Iterable[str | Path] | None = None, force: bool = False) -> dict[str, list[str]]:
        """Bring the database in line with the .json files (all tracked files, or just
        ``paths``). Unchanged files cost one stat each. Returns what changed."""
        report: dict[str, list[str]] = {"imported": [], "removed": [], "errors": []}
        with self._sync_lock:
            c = self._conn()
            known = {r["path"]: r for r in c.execute("SELECT path, kind, sha1, size, mtime_ns FROM files")}
            stats: dict[str, os.stat_result] = {}
            if paths is None:
                scan = self._scan()
                wanted = {rel: kind for rel, (kind, _) in scan.items()}
                stats = {rel: st for rel, (_, st) in scan.items()}
                gone = set(known) - set(wanted)
            else:
                wanted, gone = {}, set()
                for p in paths:
                    try:
                        rel = self.rel(p)
                    except ValueError:
                        continue  # outside website_new
                    kind = self.kind_of(rel)
                    if kind is None:
                        continue  # not a mirrored file (e.g. a name list)
                    if (self.base / rel).is_file():
                        wanted[rel] = kind
                    elif rel in known:
                        gone.add(rel)
            todo = []
            for rel, kind in wanted.items():
                try:
                    st = stats.get(rel) or (self.base / rel).stat()
                except FileNotFoundError:
                    if rel in known:
                        gone.add(rel)
                    continue
                k = known.get(rel)
                if not force and k and k["size"] == st.st_size and k["mtime_ns"] == st.st_mtime_ns and k["kind"] == kind:
                    continue
                todo.append((rel, kind, st))
            if not todo and not gone:
                self._last_sync = time.monotonic()
                return report
            c.execute("BEGIN IMMEDIATE")
            try:
                for rel, kind, st in todo:
                    data = (self.base / rel).read_bytes()  # stat taken first: a write meanwhile is re-read next time
                    k = known.get(rel)
                    if not force and k and k["sha1"] == hashlib.sha1(data).hexdigest() and k["kind"] == kind:
                        c.execute("UPDATE files SET size = ?, mtime_ns = ?, mtime = ? WHERE path = ?",
                                  (st.st_size, st.st_mtime_ns, st.st_mtime, rel))  # touched, same content
                        continue
                    self._import(c, rel, kind, st, data)
                    report["imported"].append(rel)
                for rel in sorted(gone):
                    self._forget(c, rel)
                    report["removed"].append(rel)
                if report["imported"] or report["removed"]:
                    c.execute("INSERT INTO meta (key, value) VALUES ('revision', '1') ON CONFLICT(key) "
                              "DO UPDATE SET value = CAST(value AS INTEGER) + 1")
                c.execute("COMMIT")
            except BaseException:
                c.execute("ROLLBACK")
                raise
            report["errors"] = [f"{r['path']}: {r['error']}" for r in
                                c.execute("SELECT path, error FROM files WHERE error IS NOT NULL ORDER BY path")]
            self._last_sync = time.monotonic()
        return report

    def ensure_synced(self, every: float = 1.0) -> None:
        """sync(), at most once every ``every`` seconds (call it before reading)."""
        if time.monotonic() - self._last_sync >= every:
            self.sync()

    def record(self, paths: Iterable[str | Path]) -> None:
        """After a save: import the files just written (or forget deleted ones).
        Never raises: a failure here is caught up by the next sync()."""
        try:
            self.sync(list(paths))
        except Exception as e:  # noqa: BLE001
            print(f"[raldamain_db] no se pudo actualizar la base de datos: {e}", file=sys.stderr)

    def rebuild(self) -> dict[str, list[str]]:
        c = self._conn()
        with self._sync_lock:
            c.execute("BEGIN IMMEDIATE")
            for t in ROW_TABLES + ["files"]:
                c.execute(f"DELETE FROM {t}")
            c.execute("COMMIT")
        return self.sync(force=True)

    # ── reading
    def revision(self) -> int:
        r = self._conn().execute("SELECT value FROM meta WHERE key = 'revision'").fetchone()
        return int(r["value"]) if r else 0

    def fingerprint(self, *kinds: str) -> str:
        """Changes whenever a file of these kinds changes (or is added / removed)."""
        r = self._conn().execute(
            f"SELECT group_concat(path || ':' || sha1 || ':' || mtime_ns, '|') AS f FROM "
            f"(SELECT path, sha1, mtime_ns FROM files WHERE kind IN ({', '.join('?' * len(kinds))}) ORDER BY path)",
            kinds).fetchone()
        return r["f"] or ""

    def raw(self, rel: str) -> str | None:
        r = self._conn().execute("SELECT raw FROM files WHERE path = ?", (rel,)).fetchone()
        return r["raw"] if r else None

    def doc(self, rel: str, default: Any = None) -> Any:
        """The parsed .json (a fresh copy each call); ``default`` if missing or invalid."""
        r = self._conn().execute("SELECT raw, error FROM files WHERE path = ?", (rel,)).fetchone()
        return default if r is None or r["error"] else json.loads(r["raw"])

    def files_of(self, kind: str) -> list[sqlite3.Row]:
        """path, raw, sha1, mtime and error of every file of a kind, in file-name order."""
        return self._conn().execute("SELECT path, raw, sha1, mtime, mtime_ns, error FROM files WHERE kind = ? "
                                    "ORDER BY path COLLATE NOCASE", (kind,)).fetchall()

    # ── checks and export (database -> .json)
    def check(self) -> dict[str, Any]:
        """Compare every tracked .json on disk with the database: same bytes, same parsed
        data, and its rows present. Empty lists mean the two are consistent."""
        c = self._conn()
        rows = {r["path"]: r for r in c.execute("SELECT path, kind, raw, sha1, error FROM files")}
        disk = self.tracked()
        out: dict[str, Any] = {"files": len(disk), "missing_in_db": [], "missing_on_disk": [], "different": [],
                               "invalid_json": [], "rows_missing": []}
        main_table = {"statblock": "statblocks", "creature": "creatures", "rank": "ranks", "item": "items"}
        for rel, kind in disk.items():
            r = rows.get(rel)
            if r is None:
                out["missing_in_db"].append(rel)
                continue
            data = (self.base / rel).read_bytes()
            if hashlib.sha1(data).hexdigest() != r["sha1"] or r["raw"] != data.decode("utf-8", errors="replace"):
                out["different"].append(rel)
                continue
            if r["error"]:
                out["invalid_json"].append(f"{rel}: {r['error']}")
                continue
            if json.loads(r["raw"]) != json.loads(data.decode("utf-8")):
                out["different"].append(rel)
            t = main_table.get(kind)
            if t and not c.execute(f"SELECT 1 FROM {t} WHERE path = ?", (rel,)).fetchone():
                out["rows_missing"].append(rel)
        out["missing_on_disk"] = sorted(set(rows) - set(disk))
        out["ok"] = not any(out[k] for k in ("missing_in_db", "missing_on_disk", "different", "rows_missing"))
        return out

    def export(self, folder: Path, only: Iterable[str] | None = None) -> list[str]:
        """Write the stored files (all, or ``only`` these relative paths) under ``folder``, byte for byte."""
        done = []
        want = set(only) if only is not None else None
        for r in self._conn().execute("SELECT path, raw FROM files ORDER BY path"):
            if want is not None and r["path"] not in want:
                continue
            dest = Path(folder) / r["path"]
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r["raw"].encode("utf-8"))
            done.append(r["path"])
        return done


_DEFAULT: Store | None = None


def default() -> Store:
    """The store for this checkout (shared by everything in this process)."""
    global _DEFAULT
    if _DEFAULT is None:
        _DEFAULT = Store()
    return _DEFAULT


def record(paths: Iterable[str | Path]) -> None:
    """Editors call this right after writing (or deleting) .json files."""
    try:
        default().record(paths)
    except Exception as e:  # noqa: BLE001 - opening the database failed: the next sync catches up
        print(f"[raldamain_db] no se pudo abrir la base de datos: {e}", file=sys.stderr)


# ─────────────────────────────────────────────────────────────── command line

def _print_report(rep: dict[str, Any]) -> None:
    for k, v in rep.items():
        if isinstance(v, list):
            print(f"  {k}: {len(v)}")
            for x in v[:30]:
                print(f"    {x}")
        else:
            print(f"  {k}: {v}")


def main(argv: list[str]) -> int:
    cmd = argv[0] if argv else "sync"
    s = default()
    if cmd == "path":
        print(s.path)
    elif cmd in ("sync", "rebuild"):
        t = time.perf_counter()
        rep = s.sync() if cmd == "sync" else s.rebuild()
        print(f"{cmd}: {len(rep['imported'])} importados, {len(rep['removed'])} eliminados "
              f"({(time.perf_counter() - t) * 1000:.0f} ms) -> {s.path}")
        for e in rep["errors"]:
            print("  JSON no válido:", e)
    elif cmd == "check":
        s.sync()
        rep = s.check()
        print("Coinciden" if rep["ok"] else "HAY DIFERENCIAS", f"({rep['files']} archivos)")
        _print_report({k: v for k, v in rep.items() if k not in ("ok", "files")})
        return 0 if rep["ok"] else 1
    elif cmd == "export":
        if len(argv) < 2:
            print("uso: export <carpeta>")
            return 2
        print(f"{len(s.export(Path(argv[1])))} archivos escritos en {argv[1]}")
    elif cmd == "sql":
        rows = s.query(" ".join(argv[1:]))
        for r in rows:
            print(" | ".join(str(r[k]) for k in r.keys()))
        print(f"({len(rows)} filas)")
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
