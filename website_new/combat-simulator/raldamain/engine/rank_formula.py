"""Formula substitution for rank-ability data (data/ranks.yaml).

Rank text is full of clauses like "Rango + 2", "Rango x 3" and "1d6 + CAR" --
the same shape everywhere, but currently every character YAML hand-bakes the
resulting number per build/level. This module lets ranks.yaml store the
*formula* instead (``"{{RANGO+2}}"``, ``"1d6+{{CAR}}"``) and resolves it
against one specific character's rank level and stat array at assembly
time, so editing the formula once in ranks.yaml changes every character
who has that rank, instead of needing N hand-edits.

Convention: a formula token is wrapped in ``{{...}}``. Inside it you can use
``RANGO`` (the character's level in that specific rank) and the six stat
abbreviations FUE/DES/CON/INT/SAB/CAR (the character's stats: dict), plus
``+ - *`` and ``max()``/``min()`` for text like "SAB/CAR" (interpreted as
"whichever is higher", the common reading for a slash-separated stat pair).
Tokens can sit alone (an umbral_boost's ``amount``) or embedded inside a
larger dice string (``damage: "1d6+{{CAR}}"``).
"""
from __future__ import annotations

import re
from typing import Any

_TOKEN = re.compile(r"\{\{([^}]+)\}\}")
_STAT_KEYS = ("FUE", "DES", "CON", "INT", "SAB", "CAR")


def tier_for_level(level: int) -> int:
    """Tier 1 = levels 1-3, tier 2 = 4-6 ... tier 6 = 16-18."""
    return max(1, -(-int(level) // 3))


def modifier_for_level(level: int) -> int:
    """The flat contested-roll modifier every build shares at a given level.

    Empirically constant across all ten classes regardless of build (verified
    against builds/*.md at levels 2, 5 and 8): +5 / +7 / +9 / +11 ... which is
    exactly ``3 + 2*tier``.  Attack rolls, defence rolls and save DCs all use
    it; only the *dice* on top vary by buff.
    """
    return 3 + 2 * tier_for_level(level)


def die_for_rank(rango: int) -> int:
    """Damage die size: d6 at Rango I-II, d8 at III-IV, d10 at V+.

    Every magic tree spells this out ("Aumenta los dados de daño a d8" at
    Rango III, d10 at Rango V); the martial trees inherit the same ladder
    through their weapon damage.
    """
    if rango >= 5:
        return 10
    if rango >= 3:
        return 8
    return 6


def _eval_expr(expr: str, rango: int, stats: dict[str, int], level: int = 0,
               extra: dict[str, Any] | None = None) -> int:
    ns: dict[str, Any] = {
        "RANGO": rango,
        "NIVEL": level,
        "TIER": tier_for_level(level) if level else 0,
        "MOD": modifier_for_level(level) if level else 0,
        "DIE": die_for_rank(rango),
        "max": max,
        "min": min,
    }
    for k in _STAT_KEYS:
        ns[k] = stats.get(k, 0)
    # Per-character overrides, e.g. MOD = the Creador's "main stat + Rango"
    ns.update(extra or {})
    try:
        value = eval(expr, {"__builtins__": {}}, ns)  # noqa: S307 -- fixed vocabulary only
    except Exception as e:
        raise ValueError(f"bad rank formula {expr!r}: {e}") from e
    return int(value)


def resolve_text(text: str, rango: int, stats: dict[str, int], level: int = 0,
                 extra: dict[str, Any] | None = None) -> str:
    """Substitute every ``{{...}}`` token in a string with its numeric value."""

    def repl(m: re.Match) -> str:
        return str(_eval_expr(m.group(1), rango, stats, level, extra))

    return _TOKEN.sub(repl, text)


def resolve_value(obj: Any, rango: int, stats: dict[str, int], level: int = 0,
                  extra: dict[str, Any] | None = None) -> Any:
    """Recursively resolve formula tokens through a dict/list/str tree."""
    if isinstance(obj, str):
        if _TOKEN.search(obj):
            resolved = resolve_text(obj, rango, stats, level, extra)
            # A field that was *purely* a formula ("{{RANGO+2}}") should come
            # back as a number, not the string "5", so umbral/amount fields
            # behave exactly like hand-authored data.
            if _TOKEN.fullmatch(obj):
                try:
                    return int(resolved)
                except ValueError:
                    return resolved
            return resolved
        return obj
    if isinstance(obj, dict):
        return {k: resolve_value(v, rango, stats, level, extra) for k, v in obj.items()}
    if isinstance(obj, list):
        return [resolve_value(v, rango, stats, level, extra) for v in obj]
    return obj


def formula_to_prose(text: str) -> str:
    """Render formula tokens back to the prose shorthand ranks/*.md uses,
    for the YAML -> Markdown direction (see md_yaml_convert.py)."""

    def repl(m: re.Match) -> str:
        expr = m.group(1).strip()
        expr = re.sub(r"\bmax\(([A-Z]+),\s*([A-Z]+)\)", r"\1/\2", expr)
        expr = expr.replace("RANGO", "Rango")
        expr = expr.replace("*", " x ")
        expr = re.sub(r"(Rango)([+\-])", r"\1 \2 ", expr)
        return expr

    return _TOKEN.sub(repl, text)
