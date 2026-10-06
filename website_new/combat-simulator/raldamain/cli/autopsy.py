"""Per-combatant autopsy across many fights: who did what to whom.

`batch` tells you *that* an encounter is lopsided; this tells you *why*.
It breaks a matchup down into the four things that can cause a blowout:

* **accuracy**   -- how often each side connects, per attacker and per target;
* **thresholds** -- impactos per landed hit, i.e. how much the umbral eats;
* **economy**    -- actions and attacks each side actually gets to make;
* **focus**      -- where the attacks went, and how long each body survived.

    python -m raldamain.cli.autopsy --runs 200 \
        --enemies "trasgo_jefe, trasgo_comando x2, trasgo x4"
"""

from __future__ import annotations

import argparse
from collections import defaultdict

from ..data.loader import load_conditions, make_side
from ..engine.encounter import Encounter


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Autopsia por combatiente")
    p.add_argument("--party", default="barbaro_2, mago_2, clerigo_2, cazador_2")
    p.add_argument("--enemies", default="trasgo_jefe, trasgo_comando x2, trasgo x4")
    p.add_argument("--runs", type=int, default=200)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--turn-structure", choices=["full_turn", "cycle"], default="full_turn")
    p.add_argument(
        "--no-positioning",
        action="store_true",
        help="disable front/back rows (everyone reachable by everything)",
    )
    args = p.parse_args(argv)

    registry = load_conditions()
    atk = defaultdict(lambda: defaultdict(float))  # attacker -> stats
    vs = defaultdict(lambda: defaultdict(float))  # defender -> stats
    econ = defaultdict(lambda: defaultdict(float))  # side -> stats
    death_round: dict[str, list[int]] = defaultdict(list)
    names: dict[str, str] = {}
    wins = rounds = 0

    for i in range(args.runs):
        party = make_side(args.party, "party", registry)
        foes = make_side(args.enemies, "enemigos", registry)
        for c in party + foes:
            names[c.id] = c.name
        res = Encounter(
            party + foes, registry, seed=args.seed + i,
            config={"turn_structure": args.turn_structure,
                    "positioning": not args.no_positioning},
        ).run()
        wins += res.winner == "party"
        rounds += res.rounds

        for e in res.log.events:
            k = e["kind"]
            if k == "attack":
                atk[e["actor"]]["swings"] += 1
                atk[e["actor"]]["hits"] += e["hit"]
                vs[e["target"]]["incoming"] += 1
                vs[e["target"]]["taken"] += e["hit"]
            elif k == "damage":
                atk[e["actor"]]["impactos"] += e["impactos"]
                atk[e["actor"]]["landed"] += 1
                vs[e["target"]]["impactos_taken"] += e["impactos"]
            elif k == "ability_used":
                econ[e["side"]]["actions"] += e["actions"]
                econ[e["side"]]["activations"] += 1
            elif k == "defeated":
                death_round[e["target"]].append(e["round"])

    n = args.runs
    print(f"GRUPO   : {args.party}")
    print(f"ENEMIGOS: {args.enemies}")
    print(f"{n} combates | victorias del grupo {wins / n:.1%} | "
          f"{rounds / n:.2f} rondas de media\n")

    print("OFENSIVA -- por atacante")
    print(f"{'combatiente':<22}{'ataques':>9}{'acierto':>9}{'imp/golpe':>11}{'imp/combate':>13}")
    print("-" * 64)
    for cid, s in sorted(atk.items(), key=lambda kv: -kv[1]["impactos"]):
        if not s["swings"]:
            continue
        print(f"{names.get(cid, cid):<22}{s['swings'] / n:>9.2f}"
              f"{s['hits'] / s['swings']:>9.1%}"
              f"{s['impactos'] / max(1, s['landed']):>11.2f}"
              f"{s['impactos'] / n:>13.2f}")

    print("\nDEFENSIVA -- por objetivo")
    print(f"{'combatiente':<22}{'recibidos':>11}{'% le aciertan':>15}{'imp/combate':>13}{'ronda caída':>13}")
    print("-" * 74)
    for cid, s in sorted(vs.items(), key=lambda kv: -kv[1]["impactos_taken"]):
        if not s["incoming"]:
            continue
        deaths = death_round.get(cid, [])
        fell = f"{sum(deaths) / len(deaths):.2f}" if deaths else "-"
        rate = f"({len(deaths) / n:.0%})" if deaths else ""
        print(f"{names.get(cid, cid):<22}{s['incoming'] / n:>11.2f}"
              f"{s['taken'] / s['incoming']:>15.1%}"
              f"{s['impactos_taken'] / n:>13.2f}"
              f"{fell + ' ' + rate:>13}")

    print("\nECONOMÍA DE ACCIONES -- por bando")
    print(f"{'bando':<14}{'acciones/combate':>19}{'activaciones':>15}{'ataques':>10}")
    print("-" * 58)
    for side, s in econ.items():
        swings = sum(
            v["swings"] for k, v in atk.items() if k.startswith(side + ":")
        )
        print(f"{side:<14}{s['actions'] / n:>19.2f}{s['activations'] / n:>15.2f}"
              f"{swings / n:>10.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
