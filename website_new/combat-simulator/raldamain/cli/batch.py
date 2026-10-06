"""Run many fights and report aggregate balance data.

    python -m raldamain.cli.batch --runs 500 \
        --party "barbaro_2, mago_2, clerigo_2, cazador_2" \
        --enemies "trasgo x6, trasgo_comando x2" --csv out.csv
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from ..data.loader import load_conditions, make_side
from ..engine.encounter import Encounter
from ..metrics.collector import aggregate, fight_metrics, format_report


def run_batch(
    party_spec: str,
    enemy_spec: str,
    runs: int,
    seed0: int = 0,
    turn_structure: str = "full_turn",
    max_rounds: int = 30,
    party_policy: str | None = None,
    enemy_policy: str | None = None,
    positioning: bool = True,
) -> list[dict]:
    registry = load_conditions()
    rows = []
    for i in range(runs):
        seed = seed0 + i
        party = make_side(party_spec, "party", registry, party_policy)
        enemies = make_side(enemy_spec, "enemigos", registry, enemy_policy)
        enc = Encounter(
            party + enemies,
            registry,
            seed=seed,
            config={"turn_structure": turn_structure, "max_rounds": max_rounds,
                    "positioning": positioning},
        )
        rows.append(fight_metrics(enc.run()))
    return rows


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Simulación masiva de combates")
    p.add_argument("--party", default="barbaro_2, mago_2, clerigo_2, cazador_2")
    p.add_argument("--enemies", default="trasgo x4, trasgo_comando x2, trasgo_cantor")
    p.add_argument("--runs", type=int, default=200)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--turn-structure", choices=["full_turn", "cycle"], default="full_turn")
    p.add_argument("--max-rounds", type=int, default=30)
    p.add_argument(
        "--no-positioning",
        action="store_true",
        help="disable front/back rows (everyone reachable by everything)",
    )
    p.add_argument("--party-policy", default=None)
    p.add_argument("--enemy-policy", default=None)
    p.add_argument("--csv", default=None, help="write per-fight rows here")
    args = p.parse_args(argv)

    rows = run_batch(
        args.party,
        args.enemies,
        args.runs,
        args.seed,
        args.turn_structure,
        args.max_rounds,
        args.party_policy,
        args.enemy_policy,
        not args.no_positioning,
    )

    print(f"GRUPO   : {args.party}")
    print(f"ENEMIGOS: {args.enemies}")
    print(f"TURNOS  : {args.turn_structure}")
    print()
    print(format_report(aggregate(rows)))

    if args.csv:
        path = Path(args.csv)
        fields = [k for k, v in rows[0].items() if not isinstance(v, dict)]
        with path.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
        print(f"\nFilas por combate escritas en {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
