"""Static matchup analysis -- no simulation, just the maths.

Prints, for every attack in the roster against every defender:

* **P(hit)** -- the opposed roll, with ties going to the defender;
* **E[imp]** -- expected impactos after the umbral division;
* **E/acc**  -- expected impactos per action spent, the number the bots
  actually optimise.

This is the fastest way to spot dead matchups (P(hit) = 0 means an attack
literally cannot land) and wasted damage (E[imp] far below the damage dice
would suggest).

    python -m raldamain.cli.matrix --attackers "barbaro_2, mago_2" \
        --defenders "trasgo, trasgo_comando"
"""

from __future__ import annotations

import argparse

from ..data.loader import load_conditions, load_roster, make_side
from ..policies.base import (
    damage_effects,
    defense_pool,
    expected_impactos,
    hit_probability,
)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Matriz estática de enfrentamientos")
    p.add_argument("--attackers", default="barbaro_2, mago_2, clerigo_2, cazador_2")
    p.add_argument("--defenders", default="trasgo, trasgo_comando, trasgo_cantor")
    p.add_argument(
        "--buffed",
        action="store_true",
        help="apply each attacker's maintained buff (Ira, Mente Desencadenada...)",
    )
    args = p.parse_args(argv)

    registry = load_conditions()
    attackers = make_side(args.attackers, "a", registry)
    defenders = make_side(args.defenders, "d", registry)
    roster = load_roster()

    if args.buffed:
        for a in attackers:
            for buff in ("ira", "mente_desencadenada", "analizado"):
                if buff in {
                    e.get("effect")
                    for ab in roster[a.statblock_id].get("abilities", [])
                    for e in ab.get("effects", [])
                }:
                    a.add_effect(registry.instantiate(buff, a.id, None))

    header = f"{'atacante / habilidad':<38}{'defensor':<20}{'P(imp)':>8}{'E[imp]':>9}{'E/acc':>8}"
    print(header)
    print("-" * len(header))

    for atk in attackers:
        for ability in atk.abilities.values():
            if not ability.is_attack or not ability.implemented:
                continue
            eff = next(e for e in ability.effects if e.kind == "attack")
            a_adv, a_flat, _ = atk.modifiers_for(("attack", *ability.tags))
            pool = eff.attack_roll
            for dfn in defenders:
                d_pool, d_adv = defense_pool(dfn)
                p_hit = hit_probability(pool, a_adv, d_pool, d_adv)
                extra = atk.damage_dice_bonus(("damage", *ability.tags))
                imp = sum(
                    expected_impactos(e.damage, extra, dfn.umbral_for(e.dtype))
                    for e in damage_effects(ability)
                    if e.damage is not None
                )
                per_action = p_hit * imp / max(1, ability.actions)
                flag = "  <-- nunca impacta" if p_hit == 0 else ""
                print(
                    f"{atk.name + ' / ' + ability.name:<38}{dfn.name:<20}"
                    f"{p_hit:>8.0%}{imp:>9.2f}{per_action:>8.2f}{flag}"
                )
    print()
    print("P(imp) = probabilidad de superar la defensa (empate = falla).")
    print("E[imp] = impactos esperados si acierta, tras dividir por el umbral.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
