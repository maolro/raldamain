"""Run a single fight and print the full transcript.

    python -m raldamain.cli.simulate \
        --party "barbaro_2, mago_2, clerigo_2, cazador_2" \
        --enemies "trasgo x4, trasgo_comando x2, trasgo_cantor" \
        --seed 7
"""

from __future__ import annotations

import argparse

from ..data.loader import list_roster, load_conditions, make_side
from ..engine.encounter import Encounter
from ..metrics.collector import fight_metrics


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Simulador de combate del Sistema Raldamain")
    p.add_argument("--party", default="barbaro_2, mago_2, clerigo_2, cazador_2")
    p.add_argument("--enemies", default="trasgo x4, trasgo_comando x2, trasgo_cantor")
    p.add_argument("--seed", type=int, default=1)
    p.add_argument(
        "--turn-structure",
        choices=["full_turn", "cycle"],
        default="full_turn",
        help="full_turn: each combatant spends their whole pool on their turn; "
        "cycle: one ability each in initiative order until pools empty",
    )
    p.add_argument("--max-rounds", type=int, default=30)
    p.add_argument(
        "--no-positioning",
        action="store_true",
        help="disable front/back rows (everyone reachable by everything)",
    )
    p.add_argument("--party-policy", default=None)
    p.add_argument("--enemy-policy", default=None)
    p.add_argument("--roster", action="store_true", help="list statblocks and exit")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.roster:
        print(f"{'id':<22}{'nombre':<24}{'niv':<5}rol")
        for sid, name, level, role in list_roster():
            print(f"{sid:<22}{name:<24}{level:<5}{role}")
        return 0

    registry = load_conditions()
    party = make_side(args.party, "party", registry, args.party_policy)
    enemies = make_side(args.enemies, "enemigos", registry, args.enemy_policy)

    enc = Encounter(
        party + enemies,
        registry,
        seed=args.seed,
        config={
            "turn_structure": args.turn_structure,
            "max_rounds": args.max_rounds,
            "positioning": not args.no_positioning,
        },
        echo=True,
    )
    result = enc.run()

    m = fight_metrics(result)
    print()
    print("MÉTRICAS")
    print("-" * 8)
    print(f"semilla                 : {m['seed']}  (reproduce este combate exacto)")
    print(f"estructura de turno     : {args.turn_structure}")
    print(f"rondas                  : {m['rounds']}")
    print(f"ataques / aciertos      : {m['attacks']} / {m['hits']} ({m['hit_rate']:.1%})")
    print(f"impactos infligidos     : {m['impactos_dealt']}")
    print(
        f"golpes desperdiciados   : {m['wasted_hits']} "
        f"({m['wasted_hit_rate']:.1%} de los que impactaron)"
    )
    print(f"tiros al borde de umbral: {m['cliff_rate']:.1%}")
    print(f"aperturas / castigadas  : {m['openings']} / {m['openings_punished']}")
    print(f"reacciones usadas       : {m['reactions_used']}")
    print(f"chi gastado             : {m['chi_spent']}")

    assumed = [s for s in registry.specs.values() if s.assumed]
    if assumed:
        print()
        print(
            "Efectos con reglas asumidas por el simulador "
            f"({len(assumed)}): " + ", ".join(sorted(s.name for s in assumed))
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
