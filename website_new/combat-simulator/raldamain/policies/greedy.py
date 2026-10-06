"""The default bot: maximise expected *impactos* per action point.

Scoring rules, in order of importance:

1. Value is measured in impactos, never raw damage (thresholds make the two
   diverge sharply).
2. Overkill is discounted -- pouring 3 impactos into a 1-impacto Trasgo is
   worth 1 impacto plus a kill bonus, not 3.
3. Costs divide: a 2-action ability must be twice as good as a 1-action one.
"""

from __future__ import annotations

import math
from typing import Sequence

from ..engine.abilities import AREA_TARGET_COUNT, Ability, Upgrade
from ..engine.dice import DicePool
from ..engine.entities import Combatant
from ..engine.resolver import CombatState
from .base import (
    Choice,
    Policy,
    attack_effect,
    damage_effects,
    defense_pool,
    expected_impactos,
    hit_probability,
    save_fail_probability,
)

KILL_BONUS = 0.75
CONDITION_VALUE = 0.55
HEAL_VALUE = 1.15
WOUNDED_FOCUS = 0.35
#: How many incoming swings a combat-long ward is assumed to blunt.  Fights
#: run 2-4 rounds at level 5, so a ward cast on round one sees a handful of
#: hits; anything higher would make Armadura Arcana crowd out attacking.
WARD_ROUNDS = 2.5
#: Worth of consecrated ground per combatant it (de)buffs.  Below CONDITION_VALUE
#: per head because a Ventaja die is softer than a status, but it applies to the
#: whole faith and lasts the fight, so a 3-strong party still clears the 2-action
#: cost comfortably.
CONSECRATION_VALUE = 0.45
#: How strongly to credit a softening-up debuff for the ally attack it enables.
#: Above 1.0 because the follow-up usually gets several swings out of it.
SETUP_WEIGHT = 2.2
#: Chi is finite and has alternative uses, so spending it carries an
#: opportunity cost. Small enough to only break ties -- which is exactly the
#: case that matters when a Rank II ability matches a free Rank I one.
CHI_OPPORTUNITY = 0.12

#: A same-tier defence pool averages ~8.5 (+5+1d6); anything at or above this
#: is worth spending a Voz del Comandante die on.
HARD_DEFENCE = 10.0
#: Likewise for an attacker whose swing is well above the level-2 baseline.
HARD_ATTACK = 8.0


class GreedyPolicy(Policy):
    name = "greedy"

    #: Riders declarable on one swing.  ``None`` = unlimited.
    #:
    #: Measured across five encounter shapes (elites / abisales / elite-5 /
    #: miniboss / boss), 40 fights each, with exclusion groups already in play:
    #:
    #:     cap   avg win   rounds   riders/swing   chi/fight
    #:      0      94%       4.2        0.00         10.8
    #:      1      99%       2.1        0.65         12.1
    #:      2     100%       1.7        1.25         11.8
    #:      3     100%       1.7        1.70         14.4
    #:   None     100%       1.6        2.15         15.2
    #:
    #: Two is the sweet spot: win rate and rounds-to-kill both plateau there,
    #: so riders three and up buy nothing except chi burn (14.4/15.2 vs 11.8
    #: for an identical result -- the bot is paying for overkill).  It also
    #: leaves the pick a genuine decision, since a martial has four or five
    #: riders and the exclusion groups mean two of them are already rivals.
    DEFAULT_MAX_RIDERS = 2

    def __init__(
        self,
        focus_fire: bool = True,
        hold_reactions: int = 0,
        max_riders: int | None = -1,
    ):
        self.focus_fire = focus_fire
        self.hold_reactions = hold_reactions
        # -1 is the "not specified" sentinel so an explicit None still means
        # "unlimited" for the tuning sweeps.
        self.max_riders = self.DEFAULT_MAX_RIDERS if max_riders == -1 else max_riders

    # ----------------------------------------------------------- main choice
    def choose_action(self, state: CombatState, actor: Combatant) -> Choice | None:
        # Bonus actions cost no action, so a useful one is strictly additive --
        # take it before the real action rather than making it compete for the
        # slot. That is what "declare before attacking" means in play.
        if actor.actions_left >= 1:
            bonus = self._best_bonus_action(state, actor)
            if bonus is not None:
                return bonus

        best: tuple[float, Choice] | None = None
        fallback: tuple[int, Choice] | None = None
        for ability in self._usable(actor):
            scored = self.score(state, actor, ability)
            if scored is None:
                continue
            score, targets, upgrades = scored
            # Prefer the cheaper of two equally good options.
            score -= CHI_OPPORTUNITY * (
                actor.total_chi_cost(ability) + sum(u.chi for u in upgrades)
            )
            if score <= 0:
                # Nothing to gain -- but a real player still swings rather than
                # standing there, and the miss data is worth recording.
                if ability.is_attack and targets:
                    if fallback is None or ability.actions < fallback[0]:
                        fallback = (ability.actions, (ability, targets, upgrades))
                continue
            if best is None or score > best[0]:
                best = (score, (ability, targets, upgrades))
        if best:
            return best[1]
        return fallback[1] if fallback else None

    def _best_bonus_action(
        self, state: CombatState, actor: Combatant
    ) -> Choice | None:
        """The most valuable bonus action worth declaring right now."""
        best: tuple[float, Choice] | None = None
        for ability in self._usable(actor):
            if not ability.bonus_action or ability.actions > 0:
                continue
            scored = self.score(state, actor, ability)
            if scored is None:
                continue
            value, targets, upgrades = scored
            # Free of action cost, but chi is contested: a rider must beat what
            # the same point would buy on an attack upgrade before it is worth
            # spending, and the defensive reserve stays untouched either way.
            if value <= CONDITION_VALUE * 0.6:
                continue
            cost = actor.total_chi_cost(ability)
            if cost and actor.chi - cost < self.defensive_chi_reserve(actor):
                continue
            if best is None or value > best[0]:
                best = (value, (ability, targets, upgrades))
        return best[1] if best else None

    def _usable(self, actor: Combatant) -> list[Ability]:
        reserve = self.defensive_chi_reserve(actor)
        weapon_locked = actor.has_effect("arma_atrapada")
        out = []
        for a in actor.abilities.values():
            if (
                not a.implemented
                or a.is_defense
                or a.trigger
                or not actor.can_afford(a)
            ):
                continue
            if weapon_locked and "weapon" in a.tags:
                continue
            if a.actions <= 0:
                # Bonus actions cost no actions, so they would otherwise loop
                # forever; cap them and require a real resource cost.
                if not a.bonus_action or not (a.chi or a.uses_per_combat):
                    continue
                if actor.used_this_round.get(a.id, 0) >= 1:
                    continue
            # Offensive chi spending must leave the defensive reserve alone.
            if a.chi and actor.chi - actor.total_chi_cost(a) < reserve:
                continue
            out.append(a)
        return out

    # ---------------------------------------------------------------- scoring
    def score(
        self, state: CombatState, actor: Combatant, ability: Ability
    ) -> tuple[float, list[Combatant], list[Upgrade]] | None:
        # Front/back rows: a melee ability simply cannot see a screened back row.
        enemies = state.legal_targets(actor, ability)
        allies = state.allies_of(actor, include_self=True)
        if ability.targeting in ("enemy", "all_enemies") and not enemies:
            return None

        upgrades = self._pick_upgrades(actor, ability)
        atk = attack_effect(ability)

        if atk is not None:
            scored = [
                (self._attack_value(state, actor, ability, t, upgrades), t)
                for t in enemies
            ]
            scored.sort(key=lambda p: -p[0])
            n = min(ability.targets_with(upgrades), len(scored))
            targets = [t for _, t in scored[:n]]
            value = sum(v for v, _ in scored[:n])
            return value / max(1, ability.actions), targets, upgrades

        if any(e.kind == "save" for e in ability.effects):
            scored = [(self._save_value(state, actor, ability, t), t) for t in enemies]
            scored.sort(key=lambda p: -p[0])
            n = min(ability.target_count, len(scored))
            targets = [t for _, t in scored[:n]]
            value = sum(v for v, _ in scored[:n])
            return value / max(1, ability.actions), targets, upgrades

        if any(e.kind in ("heal", "cleanse") for e in ability.effects):
            # A touch heal can only reach someone in the same row.
            targets = self._support_targets(
                ability, state.legal_allies(actor, ability)
            )
            if not targets:
                return None
            # Healing is worth far more to someone about to drop than to
            # someone at full strength, so urgency scales the value.
            value = sum(
                HEAL_VALUE
                * min(1, t.max_impactos - t.impactos)
                * (2.5 if t.impactos <= 2 else 1.0)
                for t in targets
            )
            if any(e.kind == "cleanse" for e in ability.effects):
                value += sum(CONDITION_VALUE for t in targets if t.active)
            return value / max(1, ability.actions), targets, upgrades

        if any(e.kind == "umbral_boost" for e in ability.effects):
            return self._ward_value(state, actor, ability, upgrades)

        if any(e.kind == "shield" for e in ability.effects):
            targets = self._support_targets(
                ability, state.legal_allies(actor, ability)
            ) or [actor]
            amount = sum(e.amount for e in ability.effects if e.kind == "shield")
            # A shield counter eats 10 damage, i.e. roughly one impacto.
            value = HEAL_VALUE * amount * len(targets)
            return value / max(1, ability.actions), targets, upgrades

        if any(e.kind == "consecrate" for e in ability.effects):
            return self._consecrate_value(state, actor, ability, upgrades)

        if ability.id == "ayudar":
            return self._assist_value(state, actor, ability, enemies)

        if any(e.kind == "summon" for e in ability.effects):
            return self._summon_value(state, actor, ability, enemies)

        if any(e.kind == "change_row" for e in ability.effects):
            return self._change_row_value(state, actor, ability)

        if any(e.kind == "ally_attack" for e in ability.effects):
            helpers = [a for a in state.allies_of(actor) if a.abilities]
            if not helpers or not enemies:
                return None
            best = 0.0
            for helper in helpers:
                for ab in helper.abilities.values():
                    if not ab.is_attack or ab.actions > 1 or not ab.implemented:
                        continue
                    for t in state.legal_targets(helper, ab):
                        best = max(
                            best, self._attack_value(state, helper, ab, t, (), adv=1)
                        )
            return best / max(1, ability.actions), [], upgrades

        return None

    def _ward_value(
        self,
        state: CombatState,
        actor: Combatant,
        ability: Ability,
        upgrades: Sequence[Upgrade],
    ):
        """Value an umbral_boost cast as an ACTION (Armadura Arcana).

        Priced as the impactos it stops the recipient taking: raising a
        threshold from U to U+B turns ``dmg//U`` into ``dmg//(U+B)`` on every
        incoming hit.  Without this branch the whole ``umbral_boost`` kind had
        no entry in ``score``, so a ward cast as an action could never be
        chosen at all -- the reason Armadura Arcana never once fired.
        """
        boosts = [e for e in ability.effects if e.kind == "umbral_boost"]
        if not boosts:
            return None
        amount = sum(e.amount for e in boosts)
        if amount <= 0:
            return None
        targets = self._support_targets(
            ability, state.legal_allies(actor, ability)
        ) or [actor]
        # A ward already in place is not worth re-casting (they do not stack).
        effect_ids = {e.effect_id for e in boosts if e.effect_id}
        targets = [t for t in targets
                   if not any(t.has_effect(eid) for eid in effect_ids)]
        if not targets:
            return None

        foes = [f for f in state.enemies_of(actor) if f.abilities]
        if not foes:
            return None
        value = 0.0
        for t in targets:
            worst = 0.0
            for foe in foes:
                for ab in foe.abilities.values():
                    if not ab.is_attack or not ab.implemented:
                        continue
                    if not state.can_reach(ab, t, foe):
                        continue
                    now = self._incoming_impactos(t, foe, ab)
                    later = 0.0
                    extra = foe.damage_dice_bonus(("damage", *ab.tags), t.id)
                    for e in damage_effects(ab):
                        dtype = e.dtype_against(t)
                        later += expected_impactos(
                            e.damage, extra, t.umbral_for(dtype) + amount
                        )
                    worst = max(worst, now - later)
            # Roughly one incoming swing per round for the rest of a short
            # fight -- but capped at what the recipient actually has left to
            # lose, since a ward cannot save more impactos than that.  Without
            # the cap a squishy caster (umbral 2) prices its own ward at ~7x an
            # attack and does nothing else all fight.
            value += min(worst * WARD_ROUNDS, float(t.impactos))
        return value / max(1, ability.actions), targets, upgrades

    def _consecrate_value(
        self,
        state: CombatState,
        actor: Combatant,
        ability: Ability,
        upgrades: Sequence[Upgrade],
    ):
        """Value claiming/contesting consecrated ground.

        Worth roughly a Ventaja die for every combatant of your faith, plus
        the same again for stripping it off a rival god's followers.  The
        payoff lasts the rest of the fight and re-contests itself for free
        each round, so it is priced well above a one-round buff.
        """
        if not actor.faith:
            return None
        if state.consecration == actor.faith:
            return None                        # already ours
        mine = sum(1 for c in state.living() if c.faith == actor.faith)
        theirs = 0
        if state.consecration:
            theirs = sum(1 for c in state.living() if c.faith == state.consecration)
        value = CONSECRATION_VALUE * (mine + theirs)
        return value / max(1, ability.actions), [actor], upgrades

    def _assist_value(self, state: CombatState, actor: Combatant, ability, enemies):
        """Assist is worth the extra impactos it buys somebody else's next swing
        -- or, if they're out of actions this round, the extra impactos it
        saves them on their own defensive rolls (Asistido is scope: all, so it
        applies there too, including an Apertura counter-attack). Without the
        defensive branch, assisting an ally who already spent every action
        this round always scored as worthless, even though the buff (2 rounds)
        would still be sitting on them the next time they get hit.
        """
        if not enemies:
            return None
        best = None
        for mate in state.allies_of(actor, include_self=False):
            # Already at the +6 ceiling: nothing more to give.
            cur = next((e for e in mate.active if e.spec.family == "asistido"), None)
            if cur is not None and state.registry.next_level("asistido", cur.spec.level) is None:
                continue
            step = 2
            gain = 0.0
            if mate.actions_left:
                for ab in mate.abilities.values():
                    if not ab.is_attack or not ab.implemented:
                        continue
                    for t in state.legal_targets(mate, ab):
                        base = self._attack_value(state, mate, ab, t, ())
                        up = self._attack_value(
                            state, mate, ab, t, (), flat_bonus=step
                        )
                        gain = max(gain, up - base)
            gain = max(gain, self._assist_defense_gain(state, mate, step))
            if gain > 0 and (best is None or gain > best[0]):
                best = (gain, mate)
        if best is None or best[0] <= 0.05:
            return None
        return best[0] * SETUP_WEIGHT, [best[1]], []

    def _assist_defense_gain(self, state: CombatState, mate: Combatant, step: int) -> float:
        """Expected impactos ``mate`` avoids on their next hit thanks to +step
        on their defensive roll, priced against the scariest enemy attack
        currently on the field (the same "worst case" framing HARD_ATTACK
        uses elsewhere)."""
        d_pool, d_adv = defense_pool(mate)
        if d_pool is None:
            return 0.0
        threat = None
        for foe in state.enemies_of(mate):
            for ab in foe.abilities.values():
                eff = attack_effect(ab)
                if eff is None or not ab.implemented:
                    continue
                # A screened row is genuinely safe now (no more Avanzar
                # bypass) -- crediting a threat that can't reach mate this
                # round is exactly the "pointless assist" overcorrection.
                if not state.can_reach(ab, mate, foe):
                    continue
                avg = eff.attack_roll.average
                if threat is None or avg > threat[0]:
                    threat = (avg, foe, ab)
        if threat is None:
            return 0.0
        _, foe, ab = threat
        eff = attack_effect(ab)
        atk_adv, _, _ = foe.modifiers_for(("attack", *ab.tags), mate.id)
        p_before = hit_probability(eff.attack_roll, atk_adv, d_pool, d_adv)
        p_after = hit_probability(
            eff.attack_roll, atk_adv, d_pool + DicePool(flat=step), d_adv
        )
        impactos = max(
            (
                expected_impactos(e.damage, 0, mate.umbral_for(e.dtype))
                for e in damage_effects(ab)
                if e.damage is not None
            ),
            default=0.0,
        )
        return max(0.0, p_before - p_after) * impactos

    _SUMMON_PROTOTYPES: dict = {}

    def _summon_value(self, state: CombatState, actor: Combatant, ability, enemies):
        """A summoned body is worth the damage it will do before the fight ends.

        Valued as its best attack against the softest target, multiplied by the
        actions it gets per round and the rounds it is likely to live for.
        """
        factory = state.summon_factory
        if factory is None or not enemies:
            return None
        total = 0.0
        for eff in ability.effects:
            if eff.kind != "summon":
                continue
            sid = eff.raw.get("statblock")
            if not sid:
                continue
            proto = self._SUMMON_PROTOTYPES.get(sid)
            if proto is None:
                proto = factory(sid, actor.side, 999)
                self._SUMMON_PROTOTYPES[sid] = proto
            per_action = max(
                (
                    self._attack_value(state, proto, ab, t, ()) / max(1, ab.actions)
                    for ab in proto.abilities.values()
                    if ab.is_attack and ab.implemented
                    for t in enemies
                ),
                default=0.0,
            )
            # Two rounds of contribution is a conservative estimate, but the
            # battlefield saturates: each body already standing there makes the
            # next one worth less, which stops a summoner spamming the button
            # instead of fighting.
            already = sum(
                1 for c in state.allies_of(actor) if c.statblock_id == sid
            )
            total += (
                eff.amount * per_action * proto.actions_max * 2 / (1 + already) ** 2
            )
        if total <= 0:
            return None
        return total / max(1, ability.actions), [], []

    # ------------------------------------------------------------ positioning
    def _change_row_value(self, state: CombatState, actor: Combatant, ability: Ability):
        """Step back when badly hurt and screened; step up when nobody screens."""
        if not state.positioning or actor.used_this_round.get(ability.id, 0):
            return None
        own_front = state.front_line(actor.side)
        if actor.row == "front":
            others = [c for c in own_front if c.id != actor.id]
            # Retreat only when actually hurt -- a 1-impacto minion at full
            # health is doing its job by standing there.
            hurt = actor.impactos < actor.max_impactos and actor.impactos <= 2
            if others and hurt:
                return 2.0, [actor], []  # step back behind a surviving screen
            return None
        # In the back with nobody holding the line: the toughest body steps up.
        if not own_front:
            candidates = state.living(actor.side)
            toughest = max(
                candidates, key=lambda c: (c.umbral_for("cortante"), c.impactos)
            )
            if toughest.id == actor.id:
                return 2.0, [actor], []
        return None

    def _support_targets(
        self, ability: Ability, allies: Sequence[Combatant]
    ) -> list[Combatant]:
        hurt = [a for a in allies if a.impactos < a.max_impactos or a.active]
        if not hurt:
            return []
        hurt.sort(key=lambda a: (a.impactos, -len(a.active)))
        return hurt[: ability.target_count]

    def _attack_value(
        self,
        state: CombatState,
        actor: Combatant,
        ability: Ability,
        target: Combatant,
        upgrades: Sequence[Upgrade],
        adv: int = 0,
        flat_bonus: int = 0,
    ) -> float:
        atk = attack_effect(ability)
        if atk is None:
            return 0.0
        a_adv, a_flat, _ = actor.modifiers_for(("attack", *ability.tags), target.id)
        a_flat += flat_bonus
        pool = atk.attack_roll
        if a_flat:
            pool = pool + DicePool(flat=a_flat)
        a_adv += adv + sum(u.advantage for u in upgrades)
        d_pool, d_adv = defense_pool(target)
        p_hit = hit_probability(pool, a_adv, d_pool, d_adv)

        extra = actor.damage_dice_bonus(("damage", *ability.tags), target.id)
        extra += sum(u.damage_dice for u in upgrades)
        swap = next((u.dtype for u in upgrades if u.dtype), "")
        imp = 0.0
        for eff in damage_effects(ability):
            # Conditional damage types (Espinas vs an Enredado target) change
            # which umbral applies, so the bot must price them per target.
            # Transformación Elemental-style upgrades override the dtype outright.
            dtype = swap or eff.dtype_against(target)
            imp += expected_impactos(
                eff.damage, extra, target.umbral_for(dtype),  # type: ignore[arg-type]
            )

        useful = min(imp, float(target.impactos))
        value = p_hit * useful
        if imp >= target.impactos:
            value += KILL_BONUS * p_hit
        if self.focus_fire and target.impactos < target.max_impactos:
            value += WOUNDED_FOCUS * p_hit
        # Riders that stick a condition on a hit are worth something too.
        riders = sum(
            1
            for e in atk.on_hit
            if e.kind in ("apply_effect", "save")
        ) + sum(len(u.on_hit) for u in upgrades)
        value += p_hit * CONDITION_VALUE * riders
        # Secuencia de Ataques buys a second swing that keeps none of the
        # bonuses, so it is worth a little less than the first.
        chained = sum(u.extra_attacks for u in upgrades)
        if chained:
            value *= 1 + 0.85 * chained
        return value

    def _save_value(
        self,
        state: CombatState,
        actor: Combatant,
        ability: Ability,
        target: Combatant,
    ) -> float:
        value = 0.0
        for eff in ability.effects:
            if eff.kind != "save":
                continue
            p_fail = save_fail_probability(eff.dc, target.saves.get(eff.save))
            for sub in eff.on_fail:
                if sub.kind == "damage" and sub.damage is not None:
                    imp = expected_impactos(
                        sub.damage, 0, target.umbral_for(sub.dtype_against(target)))
                    value += p_fail * min(imp, float(target.impactos))
                elif sub.kind == "apply_effect":
                    if target.immune_to(sub.effect_id):
                        continue
                    value += p_fail * self._condition_value(
                        state, actor, target, sub.effect_id
                    )
        return value

    def _condition_value(
        self,
        state: CombatState,
        actor: Combatant,
        target: Combatant,
        effect_id: str,
    ) -> float:
        """What is this debuff actually worth *against this target*?

        A defensive Desventaja is only as good as the swing that follows it, so
        it is priced as the extra impactos the best available attacker gains
        from it.  That is what makes softening-up plays correct exactly when the
        team has a heavy hitter and the target is hard to crack -- and worthless
        when nobody can follow up.
        """
        spec = state.registry.get(effect_id)

        # Status ladder: if the target already has this condition, applying it
        # again *escalates* it, so the value is the difference between the rung
        # they are on and the rung they would move to -- not zero, and not the
        # full value of a fresh application.
        current = None
        if spec.family:
            current = next(
                (e for e in target.active if e.spec.family == spec.family), None
            )
        if current is not None:
            promoted = state.registry.next_level(spec.family, current.spec.level)
            if promoted is None or target.immune_to(promoted.id):
                return 0.0  # already topped out: nothing more to gain
            here = self._raw_condition_value(state, actor, target, current.spec)
            there = self._raw_condition_value(state, actor, target, promoted)
            return max(0.0, there - here)
        return self._raw_condition_value(state, actor, target, spec)

    def _raw_condition_value(self, state, actor, target, spec) -> float:
        """Value of a target sitting under ``spec``, ignoring what they already have."""
        setup = sum(
            -m.advantage
            for m in spec.modifiers
            if m.advantage < 0 and m.scope in ("defense", "all")
        )
        if setup:
            gain = 0.0
            for mate in state.allies_of(actor, include_self=True):
                for ab in mate.abilities.values():
                    if not ab.is_attack or not ab.implemented:
                        continue
                    if not state.can_reach(ab, target, mate):
                        continue
                    if mate.id != actor.id and not mate.can_afford(ab):
                        continue
                    base = self._attack_value(state, mate, ab, target, ())
                    buffed = self._attack_value(
                        state, mate, ab, target, (), adv=setup
                    )
                    gain = max(gain, buffed - base)
            # Worth at least a token amount even with no follow-up available.
            return max(CONDITION_VALUE * 0.4, gain * SETUP_WEIGHT)

        # Otherwise price it by how much of *this* target's own offence it
        # shuts down.  Desconcertado (Desventaja on Mental rolls) is close to
        # worthless against a goblin with a knife and genuinely strong against
        # an enemy caster -- the valuation has to see that difference.
        suppression = 0.0
        for ab in target.abilities.values():
            if not ab.is_attack or not ab.implemented:
                continue
            tags = {"attack", *ab.tags}
            penalty = sum(
                -m.advantage
                for m in spec.modifiers
                if m.advantage < 0 and m.applies_to(tags)
            )
            if not penalty:
                continue
            victims = state.allies_of(target, include_self=False) or [actor]
            for v in victims[:1]:
                base = self._attack_value(state, target, ab, v, ())
                worse = self._attack_value(state, target, ab, v, (), adv=-penalty)
                suppression = max(suppression, (base - worse) / max(1, ab.actions))
        if suppression:
            return max(CONDITION_VALUE * 0.4, suppression * SETUP_WEIGHT)
        # A debuff this target's kit simply ignores is worth very little.
        return CONDITION_VALUE * 0.4

    def defensive_chi_reserve(self, actor: Combatant) -> int:
        """Chi to hold back for defensive reactions.

        A caster that dumps every point into damage riders can never afford
        Salto Espacial when the killing blow lands, so reserve enough for one
        activation of the most expensive defensive reaction it owns (plus one
        more if it is fragile enough to need two).
        """
        costs = [
            actor.total_chi_cost(a)
            for a in actor.abilities.values()
            if a.implemented
            and a.chi
            and (a.trigger in ("on_defend", "on_damaged", "on_attacked") or a.is_reroll)
        ]
        if not costs:
            return 0
        reserve = max(costs)
        # Squishy characters want two saves in hand, not one.
        if actor.umbral_for("cortante") <= 2 and actor.max_chi >= 6:
            reserve *= 2
        return min(reserve, actor.max_chi // 2)

    def _pick_upgrades(self, actor: Combatant, ability: Ability) -> list[Upgrade]:
        """Spend chi on riders while keeping the defensive reserve intact.

        Two rules constrain the pick beyond affordability:

        * the same rider cannot be bought twice (upgrades are distinct objects,
          so this is structural);
        * riders in the same exclusion group are mutually exclusive -- you get
          one area shape and one attack-chain per swing, not all of them.

        Within a group the best rider wins rather than whichever happened to be
        listed first, so the choice does not depend on YAML ordering.
        """
        budget = actor.chi - ability.chi
        reserve = self.defensive_chi_reserve(actor) or (
            1 if actor.max_chi >= 6 else 0
        )

        def worth(up: Upgrade) -> bool:
            # on_miss belongs here too: Reposición Forzosa's whole payload is
            # an on_miss rider, so leaving it out of this test made it the one
            # rank ability in the game that literally could not be bought.
            return bool(
                up.damage_dice or up.advantage or up.on_hit or up.on_miss
                or up.extra_attacks or up.area or up.dtype
            )

        def value(up: Upgrade) -> tuple:
            return (
                up.effective_damage_dice(actor),
                up.extra_attacks,
                AREA_TARGET_COUNT.get(up.area, 1) if up.area else 1,
                len(up.on_hit) + len(up.on_miss),
                -up.chi,
            )

        candidates = [u for u in ability.upgrades if u.implemented and worth(u)]
        # Best-first so an exclusion group keeps its strongest member and the
        # chi budget is spent on the riders that actually move the needle.
        candidates.sort(key=value, reverse=True)

        chosen: list[Upgrade] = []
        taken_groups: set[str] = set()
        for up in candidates:
            if self.max_riders is not None and len(chosen) >= self.max_riders:
                break
            if up.chi > budget - reserve:
                continue
            group = up.exclusion_group()
            if group and group in taken_groups:
                continue
            chosen.append(up)
            if group:
                taken_groups.add(group)
            budget -= up.chi
        return chosen

    # -------------------------------------------------------------- targeting
    def choose_target(
        self,
        state: CombatState,
        actor: Combatant,
        candidates: Sequence[Combatant],
        ability: Ability,
    ) -> Combatant:
        return max(
            candidates,
            key=lambda t: self._attack_value(state, actor, ability, t, ()),
        )

    # -------------------------------------------------------------- reactions
    def _reactions_with(self, actor: Combatant, trigger: str) -> list[Ability]:
        budget = actor.reactions_left - self.hold_reactions
        out = []
        for a in actor.abilities.values():
            if a.trigger != trigger or not a.implemented:
                continue
            need = max(a.reactions, a.actions)
            if need <= budget and a.chi <= actor.chi:
                if a.id in actor.uses and actor.uses[a.id] <= 0:
                    continue
                out.append(a)
        return out

    def _incoming_impactos(
        self, defender: Combatant, attacker: Combatant, ability: Ability
    ) -> float:
        extra = attacker.damage_dice_bonus(("damage", *ability.tags), defender.id)
        return sum(
            expected_impactos(
                e.damage, extra, defender.umbral_for(e.dtype_against(defender)))
            for e in damage_effects(ability)
            if e.damage is not None
        )

    def choose_defense_reaction(
        self,
        state: CombatState,
        defender: Combatant,
        attacker: Combatant,
        ability: Ability,
        attack_total: int,
        defense_total: int,
    ) -> Ability | None:
        """Called only once an attack has already beaten the free defence roll.

        Because the reaction fires *after* both rolls are known, the bot can
        make the decision a player would: spend it only when the bonus actually
        turns the hit into a miss, and only when the hit was worth stopping.
        """
        options = self._reactions_with(defender, "on_defend")
        if not options:
            return None
        threat = self._incoming_impactos(defender, attacker, ability)
        if threat < 1:
            return None
        deficit = attack_total - defense_total  # bonus needed to tie (ties defend)
        affordable = [
            a
            for a in options
            if sum(e.raw.get("defense_bonus", 0) for e in a.effects) >= deficit
        ]
        if not affordable:
            return None  # the boost cannot save us; keep the reaction
        if threat >= defender.impactos or threat >= 2:
            # Cheapest bonus that still flips the result.
            return min(
                affordable,
                key=lambda a: sum(e.raw.get("defense_bonus", 0) for e in a.effects),
            )
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
        failed, so the bot spends the reaction the way a player would -- only
        when the bonus actually turns the failure into a success. Same
        deficit-and-cheapest-fix shape as choose_defense_reaction."""
        options = self._reactions_with(defender, "on_save_fail")
        if not options:
            return None
        deficit = dc_total - save_total  # bonus needed to tie (ties still fail here)
        affordable = [
            a
            for a in options
            if sum(e.raw.get("save_bonus", 0) for e in a.effects) > deficit
        ]
        if not affordable:
            return None
        return min(
            affordable,
            key=lambda a: sum(e.raw.get("save_bonus", 0) for e in a.effects),
        )

    def choose_attacked_reaction(
        self,
        state: CombatState,
        defender: Combatant,
        attacker: Combatant,
        ability: Ability,
    ) -> tuple[Ability, Combatant] | None:
        for react in self._reactions_with(defender, "on_attacked"):
            for eff in react.effects:
                if eff.kind != "redirect":
                    continue
                allowed = set(eff.raw.get("valid_targets", []))
                fodder = [
                    a
                    for a in state.allies_of(defender)
                    if (not allowed or a.statblock_id in allowed)
                    # the sacrificed body must be somewhere the attack could
                    # actually have landed
                    and state.can_reach(ability, a)
                ]
                if not fodder:
                    continue
                threat = self._incoming_impactos(defender, attacker, ability)
                if threat < 1:
                    continue
                return react, min(fodder, key=lambda a: a.impactos)
        return None

    def choose_damage_reaction(
        self,
        state: CombatState,
        defender: Combatant,
        attacker: Combatant,
        damage: int,
        dtype: str,
    ) -> Ability | None:
        umbral = max(1, defender.umbral_for(dtype))  # a 0-umbral vulnerability is still a valid divisor floor
        current = damage // umbral
        if current < 1:
            return None
        fallback: Ability | None = None
        for react in self._reactions_with(defender, "on_damaged"):
            boost = max(
                (e.amount for e in react.effects if e.kind == "umbral_boost"), default=0
            )
            if boost and damage // (umbral + boost) < current:
                return react
            # A wall subtracts before the division, so compare it that way --
            # and it persists, so it is worth raising even if this particular
            # blow still lands.
            absorb = max(
                (e.amount for e in react.effects if e.kind == "wall"), default=0
            )
            if absorb and not defender.wall_absorb:
                if max(0, damage - absorb) // umbral < current:
                    return react
                fallback = fallback or react
            # A reactive heal is worth it only if this blow would finish us.
            heal = max((e.amount for e in react.effects if e.kind == "heal"), default=0)
            if heal and current >= defender.impactos:
                fallback = react
        return fallback

    def choose_opening_action(
        self, state: CombatState, actor: Combatant, provoker: Combatant
    ) -> Choice | None:
        # Counterattacking an Apertura is paid out of the action pool, so the
        # budget is whatever is left of this round's actions.
        budget = actor.actions_left
        best: tuple[float, Choice] | None = None
        for ability in actor.abilities.values():
            if (
                not ability.implemented
                or ability.is_defense
                or ability.trigger
                or not ability.is_attack
                or ability.actions <= 0
                or ability.actions > budget
                or ability.chi > actor.chi
                or not state.can_reach(ability, provoker)
            ):
                continue
            value = self._attack_value(state, actor, ability, provoker, ())
            score = value / max(1, ability.actions)
            if score > 0 and (best is None or score > best[0]):
                best = (score, (ability, [provoker], []))
        return best[1] if best else None

    # -------------------------------------------------- limited-use budgeting
    def _round_budget(self, user: Combatant, ability: Ability, emergency: bool) -> bool:
        """Pace limited-use abilities at ~1/3 of the pool per round.

        The cap lifts to 2+ in an emergency, because holding a use back is
        worthless if the fight is lost this round.
        """
        total = ability.uses_per_combat or 3
        cap = max(1, math.ceil(total / 3))
        if emergency:
            cap = max(2, cap + 1)
        return user.used_this_round.get(ability.id, 0) < cap

    def _emergency(self, state: CombatState, user: Combatant, at_risk: int = 0) -> bool:
        allies = state.allies_of(user, include_self=True)
        return any(a.impactos <= 1 for a in allies) or any(
            a.impactos - at_risk <= 0 for a in allies if at_risk
        )

    def choose_reroll(
        self,
        state: CombatState,
        user: Combatant,
        owner: Combatant,
        ability: Ability,
        context: dict,
    ) -> bool:
        kind, want = context["kind"], context["want"]
        at_risk = context.get("at_risk", 0)
        emergency = self._emergency(state, user, at_risk) or owner.impactos <= 1
        if not self._round_budget(user, ability, emergency):
            return False
        # Once the free uses are gone each one costs chi -- keep a reserve
        # unless things are dire.
        if user.exhausted(ability) and not emergency and user.chi <= 1:
            return False

        if want == "worse":
            # Forcing an enemy to repeat a critical is always worth it.
            if context.get("crit"):
                return True
            # Otherwise only when the swing already looks like it lands and the
            # hit would actually cost impactos.
            margin = context.get("attack_total", 0) - context.get("defence_avg", 0)
            return margin >= 3 and at_risk >= 1
        if kind == "attack":
            # Repeating a swing we already paid chi for.
            return True
        if kind == "defense":
            return at_risk >= 1
        return False

    def choose_intercept(
        self,
        state: CombatState,
        protector: Combatant,
        target: Combatant,
        attacker: Combatant,
        ability: Ability,
    ) -> bool:
        """Body-block for a squishier ally when it actually saves impactos.

        Worth a reaction when the protector's umbrales soak the blow better
        than the target's -- and only if the protector can survive taking it.
        """
        if protector.reactions_left - self.hold_reactions <= 0:
            return False
        on_target = self._incoming_impactos(target, attacker, ability)
        on_self = self._incoming_impactos(protector, attacker, ability)
        if on_target < 1:
            return False
        # Never trade a healthier body for a doomed one.
        if protector.impactos - on_self < 1:
            return False
        saved = on_target - on_self
        # Either the hit is much softer on us, or the ally is about to drop.
        return saved >= 1 or (on_target >= target.impactos and on_self < protector.impactos)

    def choose_redirect_miss(
        self,
        state: CombatState,
        user: Combatant,
        attacker: Combatant,
        original_target: Combatant,
        ability: Ability,
        options,
    ):
        """Re-aim a whiff at the target it would hurt most.

        Turning an enemy's missed swing onto their own ally is pure profit;
        re-aiming a friendly whiff is a reroll and is only worth chi when the
        new target is actually worth hitting.
        """
        best, best_val = None, 0.0
        for cand in options:
            val = self._attack_value(state, attacker, ability, cand, ())
            if val > best_val:
                best, best_val = cand, val
        if best is None:
            return None
        hostile_attacker = attacker.side != user.side
        # Redirecting an enemy weapon onto their own line is worth doing for
        # almost any return; spending chi to reroll our own swing is not.
        threshold = 0.3 if hostile_attacker else 1.0
        return best if best_val >= threshold else None

    def choose_command_voice(
        self,
        state: CombatState,
        granter: Combatant,
        beneficiary: Combatant,
        ability: Ability,
        kind: str,
        opponent: Combatant | None,
    ) -> bool:
        """Reinforce rolls made against hard-to-beat opponents."""
        if opponent is None:
            return False
        emergency = self._emergency(state, granter) or beneficiary.impactos <= 1
        if not self._round_budget(granter, ability, emergency):
            return False
        if granter.exhausted(ability) and not emergency and granter.chi <= 1:
            return False

        if kind == "attack":
            # Worth a die when the target is hard to hit AND the swing coming
            # at it is worth landing -- a big hitter into a high umbral is
            # exactly the case the ability exists for.
            d_pool, d_adv = defense_pool(opponent)
            if d_pool is None:
                return False
            hard = d_pool.average + d_adv * 3.5 >= HARD_DEFENCE
            if not hard:
                return False
            best = max(
                (
                    self._attack_value(state, beneficiary, ab, opponent, ())
                    for ab in beneficiary.abilities.values()
                    if ab.is_attack and ab.implemented
                ),
                default=0.0,
            )
            return best > 0
        # Defending: worth a die when the attacker swings well above average.
        best = 0.0
        for ab in opponent.abilities.values():
            eff = attack_effect(ab)
            if eff is not None:
                best = max(best, eff.attack_roll.average)
        return best >= HARD_ATTACK
