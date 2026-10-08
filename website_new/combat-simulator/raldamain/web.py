"""Entry points for the in-browser simulator (/simulador, run by Pyodide).

The page keeps the visitor's uploads (Creador fichas and bestiary creatures)
in browser storage and hands them over with :func:`sync_uploads`; they are
written to the virtual ``data/statblocks`` and ``data/creatures`` folders and
read by the same converters the Taller uses.  Everything crosses the JS/Python
boundary as JSON strings.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

from .data import loader, website
from .data.loader import load_conditions, load_roster, make_side, reload_roster, set_roster_sources
from .engine.encounter import Encounter
from .metrics.collector import aggregate, fight_metrics, format_report

# Only what the visitor uploaded (plus the site's rank/equipment data)
set_roster_sources(yaml=False, website=True)

_ID_RE = re.compile(r"[^a-z0-9_-]+")
_BATCH: dict[str, Any] = {}


def _safe_id(value: str) -> str:
    return _ID_RE.sub("-", str(value).lower()).strip("-")[:60] or "ficha"


def sync_uploads(uploads_json: str) -> str:
    """Replace the virtual stat block / creature folders with ``uploads``:
    ``[{"id", "kind": "ficha"|"criatura", "data": {...}}]``.  Returns the roster."""
    uploads = json.loads(uploads_json)
    # These folders are emptied first: only ever in the browser's virtual
    # filesystem (or a test that points them elsewhere), never the real repo.
    real = Path(__file__).resolve().parents[2] / "data"
    if sys.platform != "emscripten" and website.STATBLOCKS_DIR.resolve().parent == real.resolve():
        raise RuntimeError("sync_uploads borraría data/statblocks: solo se usa en el navegador")
    for folder in (website.STATBLOCKS_DIR, website.CREATURES_DIR):
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("*.json"):
            old.unlink()
    for up in uploads:
        folder = website.CREATURES_DIR if up.get("kind") == "criatura" else website.STATBLOCKS_DIR
        (folder / f"{_safe_id(up.get('id'))}.json").write_text(
            json.dumps(up.get("data") or {}, ensure_ascii=False), encoding="utf-8")
    reload_roster()
    return roster()


def roster() -> str:
    """Simulator ids for the uploads (a creature sharing a ficha's id gets "_criatura")."""
    out = []
    for sid, s in load_roster().items():
        out.append({"id": sid, "file": Path(s.get("source", "")).stem, "name": s.get("name", sid),
                    "level": int(s.get("level") or 0), "origin": s.get("origin") or "bestiario",
                    "impactos": s.get("impactos"), "row": s.get("preferred_row", "front")})
    out.sort(key=lambda x: (x["origin"], x["level"], x["name"]))
    return json.dumps({"roster": out, "errors": list(loader.ROSTER_ERRORS)}, ensure_ascii=False)


def _side(entries) -> str:
    parts = []
    for e in entries or []:
        count = max(1, min(20, int(e.get("count") or 1)))
        row = e.get("row") if e.get("row") in ("front", "back") else None
        parts.append(f"{e['id']}{'@' + row if row else ''} x{count}")
    return ", ".join(parts)


def _config(body: dict) -> dict:
    return {"turn_structure": body.get("turn_structure") or "full_turn",
            "max_rounds": max(1, min(60, int(body.get("max_rounds") or 30))),
            "positioning": bool(body.get("positioning", True))}


def run_single(body_json: str) -> str:
    """One full fight with its log."""
    body = json.loads(body_json)
    registry = load_conditions()
    combatants = make_side(_side(body["party"]), "party", registry) + make_side(_side(body["enemies"]), "enemigos", registry)
    result = Encounter(combatants, registry, seed=int(body.get("seed") or 1), config=_config(body)).run()
    m = fight_metrics(result)
    m["ability_usage"] = dict(m["ability_usage"])
    return json.dumps({"mode": "single", "log": result.log.text(), "winner": result.winner,
                       "rounds": result.rounds, "metrics": m}, ensure_ascii=False, default=str)


def batch_start(body_json: str) -> str:
    """Prepare a batch (the page then calls :func:`batch_step` in chunks to show progress)."""
    body = json.loads(body_json)
    party, enemies = _side(body["party"]), _side(body["enemies"])
    registry = load_conditions()
    make_side(party, "party", registry), make_side(enemies, "enemigos", registry)  # fail fast on bad ids
    _BATCH.clear()
    _BATCH.update(party=party, enemies=enemies, config=_config(body), registry=registry, rows=[],
                  seed=int(body.get("seed") or 1), runs=max(1, min(1000, int(body.get("runs") or 1))))
    return json.dumps({"runs": _BATCH["runs"]})


def batch_step(count: int) -> int:
    """Run up to ``count`` more fights; returns how many are done."""
    b = _BATCH
    start = len(b["rows"])
    for i in range(start, min(b["runs"], start + int(count))):
        combatants = make_side(b["party"], "party", b["registry"]) + make_side(b["enemies"], "enemigos", b["registry"])
        b["rows"].append(fight_metrics(Encounter(combatants, b["registry"], seed=b["seed"] + i, config=b["config"]).run()))
    return len(b["rows"])


def batch_report() -> str:
    agg = aggregate(_BATCH["rows"])
    return json.dumps({"mode": "batch", "report": format_report(agg), "runs": len(_BATCH["rows"]),
                       "party_win_rate": agg["party_win_rate"], "draw_rate": agg["draw_rate"],
                       "rounds_mean": agg["rounds_mean"]}, ensure_ascii=False, default=str)
