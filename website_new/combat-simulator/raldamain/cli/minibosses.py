"""Compare every Miniboss (or any set of enemies) on the same footing.

Each candidate is run **solo** against a fixed party and again **with a fixed
escort**, so the statblock is measured rather than the encounter around it.
The columns are chosen to separate the four things that can make a Miniboss
hard, which the balance analysis showed are not equally powerful levers:

``umbral``      the wall -- the dominant variable at low levels;
``atq/acc``     attacks per action, the second lever;
``P(imp)``      how often the party's best swing beats its defence;
``TTK ratio``   rounds for the enemy to wipe the party / rounds for the party to
                clear it. 1.0 is a dead heat, >1 favours the party.

    python -m raldamain.cli.minibosses --runs 200
    python -m raldamain.cli.minibosses --enemies "osgo, veterano" --escort "trasgo x4"
"""

from __future__ import annotations

import argparse

from ..data.loader import load_conditions, load_roster, make_side
from ..engine.encounter import Encounter
from ..policies.base import (
    damage_effects,
    defense_pool,
    expected_impactos,
    hit_probability,
)

DEFAULT_PARTY = "barbaro_2, mago_2, clerigo_2, cazador_2"
PARTY_IMPACTOS = 24  # 4 PCs x 6


def profile(sid: str, registry, party) -> dict:
    """Static read of a statblock: its wall, its volume, its accuracy."""
    foe = make_side(sid, "enemigos", registry)[0]
    umbral_fis = foe.umbral_for("cortante")
    umbral_gen = foe.umbral_for("general")

    best_pi = 0.0
    for pc in party:
        for ab in pc.abilities.values():
            if not ab.is_attack or not ab.implemented:
                continue
            eff = next(e for e in ab.effects if e.kind == "attack")
            d_pool, d_adv = defense_pool(foe)
            p = hit_probability(eff.attack_roll, 0, d_pool, d_adv)
            imp = sum(
                expected_impactos(e.damage, 0, foe.umbral_for(e.dtype))
                for e in damage_effects(ab)
                if e.damage is not None
            )
            best_pi = max(best_pi, p * imp)

    swings = [
        (sum(1 for e in ab.effects if e.kind == "attack") * ab.target_count)
        / max(1, ab.actions)
        for ab in foe.abilities.values()
        if ab.is_attack and ab.implemented and ab.actions
    ]
    return {
        "name": foe.name,
        "impactos": foe.max_impactos,
        "umbral": f"{umbral_gen}/{umbral_fis}",
        "actions": foe.actions_max,
        "atk_per_action": max(swings) if swings else 0.0,
        "party_best": best_pi,
    }


def measure(spec: str, party_spec: str, registry, runs: int, seed0: int) -> dict:
    wins = rounds = 0
    party_imp = foe_imp = 0
    pool = 0
    for i in range(runs):
        p = make_side(party_spec, "party", registry)
        f = make_side(spec, "enemigos", registry)
        pool = sum(c.max_impactos for c in f)
        res = Encounter(p + f, registry, seed=seed0 + i).run()
        wins += res.winner == "party"
        rounds += res.rounds
        for e in res.log.of_kind("damage"):
            if e["side"] == "party":
                party_imp += e["impactos"]
            else:
                foe_imp += e["impactos"]
    r = max(1, rounds)
    ttk_party = pool / max(0.01, party_imp / r)
    ttk_foe = PARTY_IMPACTOS / max(0.01, foe_imp / r)
    return {
        "win": wins / runs,
        "rounds": rounds / runs,
        "ratio": ttk_foe / ttk_party,
    }


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Comparativa de Minibosses")
    p.add_argument("--party", default=DEFAULT_PARTY)
    p.add_argument("--enemies", default=None, help="default: every miniboss")
    p.add_argument("--escort", default="trasgo x4", help="escort for the second run")
    p.add_argument("--runs", type=int, default=200)
    p.add_argument("--seed", type=int, default=0)
    args = p.parse_args(argv)

    registry = load_conditions()
    if args.enemies:
        ids = [x.strip() for x in args.enemies.split(",") if x.strip()]
    else:
        ids = sorted(
            b["id"] for b in load_roster().values() if b.get("role") == "miniboss"
        )
    party = make_side(args.party, "party", registry)

    print(f"GRUPO   : {args.party}")
    print(f"ESCOLTA : {args.escort}   ({args.runs} combates por celda)\n")
    header = (
        f"{'miniboss':<20}{'imp':>5}{'umbral':>9}{'acc':>5}{'atq/acc':>9}"
        f"{'mejor golpe PJ':>16}{'solo':>8}{'+escolta':>10}{'ratio':>8}"
    )
    print(header)
    print("-" * len(header))

    rows = []
    for sid in ids:
        prof = profile(sid, registry, party)
        solo = measure(sid, args.party, registry, args.runs, args.seed)
        esc = measure(
            f"{sid}, {args.escort}", args.party, registry, args.runs, args.seed
        )
        rows.append((prof, solo, esc))

    for prof, solo, esc in sorted(rows, key=lambda t: -t[1]["win"]):
        print(
            f"{prof['name']:<20}{prof['impactos']:>5}{prof['umbral']:>9}"
            f"{prof['actions']:>5}{prof['atk_per_action']:>9.2f}"
            f"{prof['party_best']:>16.2f}{solo['win']:>8.0%}{esc['win']:>10.0%}"
            f"{esc['ratio']:>8.2f}"
        )
    print()
    print("mejor golpe PJ = impactos esperados del mejor ataque del grupo por swing.")
    print("ratio = TTK enemigo / TTK grupo con escolta; 1.0 = carrera pareja.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
