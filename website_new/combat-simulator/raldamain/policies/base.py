"""Decision-making interface plus the estimators the bots reason with.

The single most important design point: because damage is floor-divided by the
umbral, **expected damage is the wrong thing to maximise**.  A bot that picks
the biggest damage dice will happily throw 2d6+4 into an umbral of 8 and
achieve nothing.  Every estimator here therefore works in *expected impactos*.

Estimation uses its own RNG so that thinking never perturbs the combat dice
stream -- a fight replayed from the same seed is identical regardless of which
policies are attached.
"""

from __future__ import annotations

import random
from typing import Sequence

from ..engine.abilities import Ability, Effect, Upgrade
from ..engine.dice import D20_EXPR, DicePool
from ..engine.entities import Combatant
from ..engine.resolver import CombatState

_EST_RNG = random.Random(20250815)
D20 = DicePool.parse(D20_EXPR)
_HIT_CACHE: dict[tuple, float] = {}
_IMP_CACHE: dict[tuple, float] = {}
SAMPLES = 400


def _sample(pool: DicePool, adv: int) -> int:
    total = pool.flat
    dice = pool.dice + (((adv, 6),) if adv else ())
    for count, sides in dice:
        sign = 1 if count > 0 else -1
        for _ in range(abs(count)):
            total += sign * _EST_RNG.randint(1, sides)
    return total


def hit_probability(
    atk: DicePool, atk_adv: int, dfn: DicePool | None, dfn_adv: int
) -> float:
    """P(attack beats defence).  Ties go to the defender.

    Both sides are ``1d20 + modifier + extra dice``, matching
    ``Resolver.roll_for``.  Statblock pools carry only the modifier and extra
    dice, so the d20 is added here.
    """
    if dfn is None:
        return 1.0
    key = (str(atk), atk_adv, str(dfn), dfn_adv)
    cached = _HIT_CACHE.get(key)
    if cached is not None:
        return cached
    a, d = D20 + atk, D20 + dfn
    wins = sum(1 for _ in range(SAMPLES) if _sample(a, atk_adv) > _sample(d, dfn_adv))
    prob = wins / SAMPLES
    _HIT_CACHE[key] = prob
    return prob


def expected_impactos(damage: DicePool, extra_dice: int, umbral: int) -> float:
    """Mean impactos this damage pool inflicts against ``umbral``."""
    if umbral <= 0:
        umbral = 1
    pool = damage.with_dice(extra_dice, damage.largest_die) if extra_dice else damage
    key = (str(pool), umbral)
    cached = _IMP_CACHE.get(key)
    if cached is not None:
        return cached
    total = sum(max(0, _sample(pool, 0)) // umbral for _ in range(SAMPLES))
    mean = total / SAMPLES
    _IMP_CACHE[key] = mean
    return mean


def save_fail_probability(dc: DicePool, save: DicePool | None) -> float:
    """P(the target fails).  The caster rolls the DC, so both sides get a d20."""
    if save is None:
        return 1.0
    key = ("save", str(dc), str(save))
    cached = _HIT_CACHE.get(key)
    if cached is not None:
        return cached
    s, c = D20 + save, D20 + dc
    fails = sum(1 for _ in range(SAMPLES) if _sample(s, 0) < _sample(c, 0))
    prob = fails / SAMPLES
    _HIT_CACHE[key] = prob
    return prob


# --------------------------------------------------------------------- policy
Choice = tuple[Ability, list[Combatant], list[Upgrade]]


class Policy:
    """Base decision maker.  Every hook has a do-nothing default."""

    name = "base"

    def choose_action(self, state: CombatState, actor: Combatant) -> Choice | None:
        return None

    def choose_target(
        self,
        state: CombatState,
        actor: Combatant,
        candidates: Sequence[Combatant],
        ability: Ability,
    ) -> Combatant:
        return candidates[0]

    def choose_defense_reaction(
        self,
        state: CombatState,
        defender: Combatant,
        attacker: Combatant,
        ability: Ability,
        attack_total: int,
        defense_total: int,
    ) -> Ability | None:
        """Offered only after the free defence roll has already been beaten."""
        return None

    def choose_save_reaction(
        self,
        state: CombatState,
        defender: Combatant,
        attacker: Combatant,
        save: str,
        save_total: int,
        dc_total: int,
    ) -> Ability | None:
        """Aura Protectora and friends: offered only once a save has already
        failed (the free roll came up short), same "known outcome, decide
        knowingly" shape as choose_defense_reaction."""
        return None

    def choose_attacked_reaction(
        self,
        state: CombatState,
        defender: Combatant,
        attacker: Combatant,
        ability: Ability,
    ) -> tuple[Ability, Combatant] | None:
        return None

    def choose_damage_reaction(
        self,
        state: CombatState,
        defender: Combatant,
        attacker: Combatant,
        damage: int,
        dtype: str,
    ) -> Ability | None:
        return None

    def choose_opening_action(
        self, state: CombatState, actor: Combatant, provoker: Combatant
    ) -> Choice | None:
        return None

    def choose_reroll(
        self,
        state: CombatState,
        user: Combatant,
        owner: Combatant,
        ability: Ability,
        context: dict,
    ) -> bool:
        """Spend a limited-use reroll on ``owner``'s roll?"""
        return False

    def choose_intercept(
        self,
        state: CombatState,
        protector: Combatant,
        target: Combatant,
        attacker: Combatant,
        ability: Ability,
    ) -> bool:
        """Step in front of ``target`` and take the hit instead?"""
        return False

    def choose_redirect_miss(
        self,
        state: CombatState,
        user: Combatant,
        attacker: Combatant,
        original_target: Combatant,
        ability: Ability,
        options: Sequence[Combatant],
    ) -> Combatant | None:
        """Re-aim a missed attack at one of ``options``, or decline."""
        return None

    def choose_command_voice(
        self,
        state: CombatState,
        granter: Combatant,
        beneficiary: Combatant,
        ability: Ability,
        kind: str,
        opponent: Combatant | None,
    ) -> bool:
        """Hand ``beneficiary`` a Ventaja die before an attack or defence roll?"""
        return False

    def use_shields(
        self, state: CombatState, defender: Combatant, damage: int, umbral: int
    ) -> int:
        """Spend the fewest counters that actually remove an impacto."""
        umbral = max(1, umbral)  # a 0-umbral vulnerability is still a valid divisor floor
        if defender.shield_counters <= 0 or damage < umbral:
            return 0
        for n in range(1, defender.shield_counters + 1):
            if max(0, damage - 10 * n) // umbral == 0:
                return n
        return 0


# ------------------------------------------------------------------- helpers
def attack_effect(ability: Ability) -> Effect | None:
    for e in ability.effects:
        if e.kind == "attack":
            return e
    return None


def damage_effects(ability: Ability) -> list[Effect]:
    found: list[Effect] = []

    def walk(effs: Sequence[Effect]) -> None:
        for e in effs:
            if e.kind == "damage" and e.damage is not None:
                found.append(e)
            walk(e.on_hit)
            walk(e.on_fail)
            walk(e.on_success)

    walk(ability.effects)
    return found


def defense_pool(c: Combatant) -> tuple[DicePool | None, int]:
    d = c.defense
    if d is None:
        return None, 0
    adv, flat, _ = c.modifiers_for(("defense", *d.tags))
    pool = d.roll
    if flat:
        pool = pool + DicePool(flat=flat)
    return pool, adv
