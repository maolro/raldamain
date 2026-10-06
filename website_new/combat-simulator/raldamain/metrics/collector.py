"""Turning event streams into balance numbers.

The two metrics that matter most for this system, and that no generic RPG sim
would bother collecting:

``wasted_hit_rate``   share of landed attacks that inflicted **zero** impactos
                      because the damage never reached the umbral;
``cliff_rate``        share of damage rolls that fell within 2 points of the
                      next impacto.  A high value means the fight is being
                      decided by threshold breakpoints, so a single point of
                      CON (or one Segundo Aliento) swings the whole encounter.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from statistics import mean, pstdev
from typing import Any, Sequence

from ..engine.encounter import EncounterResult

CLIFF_MARGIN = 2


def fight_metrics(result: EncounterResult, party_side: str = "party") -> dict[str, Any]:
    ev = result.log.events
    attacks = [e for e in ev if e["kind"] == "attack"]
    damage = [e for e in ev if e["kind"] == "damage"]
    uses = [e for e in ev if e["kind"] == "ability_used"]
    reactions = [e for e in ev if e["kind"] == "reaction"]
    openings = [e for e in ev if e["kind"] == "opening"]
    punished = [e for e in ev if e["kind"] == "opening_punished"]
    saves = [e for e in ev if e["kind"] == "save"]

    landed = [e for e in damage if e["applied"] > 0]
    by_side: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for e in damage:
        by_side[e["side"]]["impactos"] += e["impactos"]
        by_side[e["side"]]["raw"] += e["raw"]
    for e in attacks:
        by_side[e["side"]]["attacks"] += 1
        by_side[e["side"]]["hits"] += 1 if e["hit"] else 0

    m: dict[str, Any] = {
        "seed": result.seed,
        "winner": result.winner,
        "party_win": result.winner == party_side,
        "draw": result.draw,
        "rounds": result.rounds,
        "attacks": len(attacks),
        "hits": sum(1 for e in attacks if e["hit"]),
        "hit_rate": _safe(sum(1 for e in attacks if e["hit"]), len(attacks)),
        "impactos_dealt": sum(e["impactos"] for e in damage),
        "wasted_hits": sum(1 for e in landed if e["wasted"]),
        "wasted_hit_rate": _safe(sum(1 for e in landed if e["wasted"]), len(landed)),
        "cliff_rate": _safe(
            sum(1 for e in landed if e["margin_to_next"] <= CLIFF_MARGIN), len(landed)
        ),
        "openings": len(openings),
        "openings_punished": len(punished),
        "opening_punish_rate": _safe(len(punished), len(openings)),
        "reactions_used": len(reactions),
        "chi_spent": sum(e.get("chi", 0) for e in uses),
        "saves_made": len(saves),
        "save_success_rate": _safe(sum(1 for e in saves if e["success"]), len(saves)),
        "party_impactos_left": result.impactos_left.get(party_side, 0),
        "party_survivors": len(result.survivors.get(party_side, [])),
    }
    for side, stats in by_side.items():
        m[f"{side}_impactos_dealt"] = stats["impactos"]
        m[f"{side}_hit_rate"] = _safe(stats["hits"], stats["attacks"])
    m["ability_usage"] = Counter(e["ability"] for e in uses)
    return m


def _safe(num: float, den: float) -> float:
    return round(num / den, 4) if den else 0.0


def aggregate(rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {}
    # Per-side keys only appear when that side actually dealt damage, so build
    # the key set from every row and treat absences as zero.
    numeric: list[str] = []
    for row in rows:
        for k, v in row.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                if k not in numeric:
                    numeric.append(k)
    out: dict[str, Any] = {"fights": len(rows)}
    out["party_win_rate"] = round(sum(1 for r in rows if r["party_win"]) / len(rows), 4)
    out["draw_rate"] = round(sum(1 for r in rows if r["draw"]) / len(rows), 4)
    for key in numeric:
        vals = [r.get(key, 0) for r in rows]
        out[f"{key}_mean"] = round(mean(vals), 3)
        if key in ("rounds", "impactos_dealt", "party_impactos_left"):
            out[f"{key}_sd"] = round(pstdev(vals), 3)
            out[f"{key}_min"] = min(vals)
            out[f"{key}_max"] = max(vals)
    usage: Counter = Counter()
    for r in rows:
        usage.update(r.get("ability_usage", {}))
    out["ability_usage"] = usage
    out["rounds_histogram"] = Counter(r["rounds"] for r in rows)
    return out


def format_report(agg: dict[str, Any]) -> str:
    if not agg:
        return "no fights"
    lines = [
        f"Combates simulados      : {agg['fights']}",
        f"Victorias del grupo     : {agg['party_win_rate']:.1%}"
        f"  (empates {agg['draw_rate']:.1%})",
        f"Rondas                  : {agg['rounds_mean']:.2f} "
        f"(sd {agg['rounds_sd']:.2f}, min {agg['rounds_min']}, max {agg['rounds_max']})",
        f"Impactos restantes grupo: {agg['party_impactos_left_mean']:.2f} "
        f"(sd {agg['party_impactos_left_sd']:.2f})",
        f"Supervivientes grupo    : {agg['party_survivors_mean']:.2f}",
        "",
        f"Tasa de acierto         : {agg['hit_rate_mean']:.1%}",
        f"Golpes desperdiciados   : {agg['wasted_hit_rate_mean']:.1%} "
        "(impactaron pero no superaron el umbral)",
        f"Tiros al borde de umbral: {agg['cliff_rate_mean']:.1%} "
        f"(a <= {CLIFF_MARGIN} de otro impacto)",
        f"Salvaciones superadas   : {agg['save_success_rate_mean']:.1%}",
        "",
        f"Aperturas provocadas    : {agg['openings_mean']:.2f} por combate",
        f"Aperturas castigadas    : {agg['opening_punish_rate_mean']:.1%}",
        f"Reacciones usadas       : {agg['reactions_used_mean']:.2f}",
        f"Chi gastado             : {agg['chi_spent_mean']:.2f}",
        "",
        "Distribución de rondas:",
    ]
    hist = agg["rounds_histogram"]
    total = sum(hist.values())
    for rounds in sorted(hist):
        n = hist[rounds]
        bar = "#" * max(1, round(40 * n / total))
        lines.append(f"  {rounds:>2} rondas | {bar} {n} ({n / total:.0%})")
    lines.append("")
    lines.append("Habilidades más usadas:")
    for ability, n in agg["ability_usage"].most_common(12):
        lines.append(f"  {ability:<26} {n}")
    return "\n".join(lines)
