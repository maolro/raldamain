"""Resolution of rolls, attacks, saves, damage and openings.

Everything here follows `base-info.md`:

* Attacks are **opposed**: the defender rolls Parada/Esquiva and *ties go to
  the defender* ("si lo iguala o supera, el ataque ha fallado").
* A missed attack (or moving out of reach) provokes an **Apertura**, letting
  the defender act out of turn by paying reactions.
* Damage becomes **impactos** by floor-dividing it by the applicable umbral;
  each Contador de Escudo shaves 10 off the damage first.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence

from .abilities import Ability, Effect, Upgrade
from .dice import D20_EXPR, DicePool, Roller, RollResult
from .effects import ActiveEffect, EffectRegistry, EffectSpec, Modifier
from .entities import Combatant
from .log import CombatLog


D20 = DicePool.parse(D20_EXPR)

#: Roll kinds that are ``1d20 + modifier + extra dice``.  Damage is NOT one of
#: them -- damage pools are exactly what the statblock prints.
CONTESTED_ROLLS = frozenset(
    {"attack", "defense", "save", "save_dc", "initiative"}
)


@dataclass
class CombatState:
    combatants: list[Combatant] = field(default_factory=list)
    roller: Roller = None  # type: ignore[assignment]
    log: CombatLog = None  # type: ignore[assignment]
    registry: EffectRegistry = None  # type: ignore[assignment]
    config: dict[str, Any] = field(default_factory=dict)
    round: int = 0
    #: Builds reinforcements mid-fight; supplied by the loader.
    summon_factory: Any = None

    #: --- Consagrar la Tierra -------------------------------------------
    #: The battlefield is a single contested track running
    #:     <faith A>  <->  neutral  <->  <faith B>
    #: `consecration` names the faith currently holding it ("" = neutral) and
    #: `consecration_owner` the combatant who claimed it.  Taking ground held
    #: by a rival god therefore costs TWO won contests: one to break it back
    #: to neutral, another to claim it -- which is what makes terrain control
    #: a multi-round objective rather than a one-action buff.
    consecration: str = ""
    consecration_owner: str = ""

    def consecration_favours(self, c: Combatant) -> bool:
        return bool(self.consecration) and c.faith == self.consecration

    def living(self, side: str | None = None) -> list[Combatant]:
        return [
            c
            for c in self.combatants
            if c.alive and (side is None or c.side == side)
        ]

    def enemies_of(self, c: Combatant) -> list[Combatant]:
        return [o for o in self.combatants if o.alive and o.side != c.side]

    def allies_of(self, c: Combatant, include_self: bool = False) -> list[Combatant]:
        return [
            o
            for o in self.combatants
            if o.alive and o.side == c.side and (include_self or o.id != c.id)
        ]

    def sides(self) -> set[str]:
        return {c.side for c in self.combatants if c.alive}

    # ------------------------------------------------------------ positioning
    @property
    def positioning(self) -> bool:
        return bool(self.config.get("positioning", True))

    def front_line(self, side: str) -> list[Combatant]:
        return [c for c in self.living(side) if c.row == "front"]

    def can_reach(
        self, ability: Ability, target: Combatant, actor: Combatant | None = None
    ) -> bool:
        """Front/back rows: melee cannot touch a back row that is still screened.

        Ranged attacks and spells ignore rows entirely. A melee attack reaches
        the back row only once that side's front row is fully defeated -- there
        is no way to pay an action to push through a living front line.
        """
        if not self.positioning or not ability.is_melee:
            return True
        if target.row == "front":
            return True
        return not self.front_line(target.side)

    def legal_targets(self, actor: Combatant, ability: Ability) -> list[Combatant]:
        return [
            t for t in self.enemies_of(actor) if self.can_reach(ability, t, actor)
        ]

    def legal_allies(
        self, actor: Combatant, ability: Ability, include_self: bool = True
    ) -> list[Combatant]:
        """Allies this ability can be delivered to.

        The two rows stand back to back, so a *toque* effect reaches either of
        them: a Clérigo in the retaguardia is directly behind the vanguardia and
        can lay hands on it.  Rows only ever block attacks against the *enemy*
        back line, never support within your own side -- and the same holds for
        enemy healers such as the Trasgo Cantor.
        """
        return self.allies_of(actor, include_self=include_self)


@dataclass
class AttackOutcome:
    hit: bool
    attack: RollResult | None
    defense: RollResult | None
    impactos: int = 0
    damage: int = 0
    wasted: bool = False  # damage landed but was fully absorbed by the umbral
    target: Combatant | None = None


class Resolver:
    """Applies abilities to the battlefield."""

    def __init__(self, state: CombatState):
        self.state = state
        #: How many Aperturas deep the current exchange is.  A counterattack
        #: that misses provokes another Apertura, so without a cap these chain.
        self._opening_depth = 0
        #: Guards against a redirected attack redirecting again.
        self._redirect_depth = 0

    # ------------------------------------------------------------------ rolls
    @property
    def log(self) -> CombatLog:
        return self.state.log

    @property
    def roller(self) -> Roller:
        return self.state.roller

    def roll_for(
        self,
        actor: Combatant,
        pool: DicePool,
        tags: Sequence[str],
        opponent: Combatant | None = None,
        extra_adv: int = 0,
        extra_flat: int = 0,
    ) -> RollResult:
        opp_id = opponent.id if opponent else None
        adv, flat, reroll = actor.modifiers_for(tags, opp_id)
        adv += extra_adv
        flat += extra_flat
        effective = pool + DicePool(flat=flat) if flat else pool
        if any(t in CONTESTED_ROLLS for t in tags):
            effective = D20 + effective
        result = self.roller.roll(effective, advantage=adv)
        if reroll:  # Infortunio / Maldición: roll twice, keep the worse
            second = self.roller.roll(effective, advantage=adv)
            if second.total < result.total:
                result = second
        return result

    # -------------------------------------------------------------- abilities
    def use_ability(
        self,
        actor: Combatant,
        ability: Ability,
        targets: Sequence[Combatant],
        upgrades: Sequence[Upgrade] = (),
        as_reaction: bool = False,
        free: bool = False,
        indent: int = 1,
        extra_adv: int = 0,
        out_of_turn: bool = False,
    ) -> list[AttackOutcome]:
        if not free:
            actor.pay(ability, as_reaction=as_reaction)
        for up in upgrades:
            actor.chi -= up.chi

        cost_bits = ability.cost_label()
        if upgrades:
            cost_bits += " + " + ", ".join(u.name for u in upgrades)
        tag = " [apertura]" if out_of_turn else (" [reacción]" if as_reaction else "")
        tgt = ", ".join(t.name for t in targets) if targets else "-"
        self.log.line(
            f"{actor.name} usa {ability.name} ({cost_bits}){tag} -> {tgt}", indent
        )
        self.log.event(
            "ability_used",
            actor=actor.id,
            side=actor.side,
            ability=ability.id,
            actions=0 if as_reaction else ability.actions,
            reactions=(
                max(ability.reactions, ability.actions) if as_reaction else ability.reactions
            ),
            chi=ability.chi + sum(u.chi for u in upgrades),
            is_attack=ability.is_attack,
            targets=[t.id for t in targets],
            # Riders are bought here but resolve inside the parent attack, so
            # without this they are invisible to usage analysis -- a whole rank
            # tree (Estilo Coloso, Estilo Asesino) reads as unused when its
            # abilities are in fact firing on every swing.
            upgrades=[u.id for u in upgrades],
        )

        outcomes: list[AttackOutcome] = []
        for effect in ability.effects:
            outcomes += self._apply_effect(
                actor, effect, targets, ability, upgrades, indent + 1, extra_adv
            )
        if ability.is_attack:
            actor.consume_single_use("consume_on_attack")
        return outcomes

    def _apply_effect(
        self,
        actor: Combatant,
        effect: Effect,
        targets: Sequence[Combatant],
        ability: Ability,
        upgrades: Sequence[Upgrade],
        indent: int,
        extra_adv: int = 0,
    ) -> list[AttackOutcome]:
        kind = effect.kind
        out: list[AttackOutcome] = []

        if kind == "attack":
            # One attack roll for the whole ability; every target defends
            # against that single result.
            alive = [t for t in targets if t.alive]
            if alive:
                out += self._attack_volley(
                    actor, alive, effect, ability, upgrades, indent, extra_adv
                )

        elif kind == "damage":
            for t in targets:
                if t.alive:
                    self._roll_and_apply_damage(actor, t, effect, ability, upgrades, indent)

        elif kind == "save":
            # Likewise: the caster rolls the DC once and every target saves
            # against it.
            alive = [t for t in targets if t.alive]
            if alive:
                self._save_volley(actor, alive, effect, ability, upgrades, indent)

        elif kind == "apply_effect":
            for t in self._resolve_recipients(actor, targets, effect.to):
                self._attach(actor, t, effect, indent)

        elif kind == "self_buff":
            # Analizar Enemigo and friends buff the actor, but only versus the
            # enemy they named.
            against = None
            if effect.raw.get("against_target") and targets:
                against = targets[0].id
            self._attach(actor, actor, effect, indent, against_id=against)

        elif kind == "heal":
            for t in self._resolve_recipients(actor, targets, effect.to):
                healed = min(effect.amount, t.max_impactos - t.impactos)
                t.impactos += healed
                self.log.line(
                    f"{t.name} recupera {healed} impacto(s) -> {t.status_line()}", indent
                )
                self.log.event("heal", actor=actor.id, target=t.id, amount=healed)

        elif kind == "cleanse":
            for t in self._resolve_recipients(actor, targets, effect.to):
                cid = t.worst_condition()
                if cid and t.remove_effect(cid):
                    self.log.line(f"{t.name} se libra de {cid}", indent)

        elif kind == "umbral_boost":
            # `dtypes: [fisico, magico]` restricts the boost to those damage
            # groups (Armadura Arcana); without it the boost is blanket, which
            # is what Segundo Aliento and friends want.  Combatant.umbral_for
            # matches a modifier whose scope is the dtype OR its group, so one
            # modifier per named type is all it takes.
            dtypes = effect.raw.get("dtypes") or []
            if dtypes:
                mods = tuple(
                    Modifier(scope=d, umbral=effect.amount) for d in dtypes
                )
                what = "/".join(dtypes)
            else:
                mods = (Modifier(scope="umbral", umbral=effect.amount),)
                what = "todos sus umbrales"
            spec = EffectSpec(
                id=effect.effect_id or "umbral_boost",
                name=effect.raw.get("name", "Umbrales reforzados"),
                kind="buff",
                duration=effect.duration,
                tags=tuple(effect.raw.get("tags", [])),
                modifiers=mods,
            )
            for t in self._resolve_recipients(actor, targets, effect.to):
                t.add_effect(ActiveEffect(spec, effect.duration, actor.id))
                self.log.line(
                    f"{t.name} aumenta {what} por {effect.amount}", indent
                )

        elif kind == "consecrate":
            self._consecrate(actor, effect, indent)

        elif kind == "shield":
            for t in self._resolve_recipients(actor, targets, effect.to):
                t.shield_counters += effect.amount
                self.log.line(
                    f"{t.name} gana {effect.amount} contador(es) de escudo", indent
                )

        elif kind == "grant_advantage":
            for t in self._resolve_recipients(actor, targets, effect.to):
                t.add_effect(
                    self.state.registry.instantiate("ventaja_otorgada", actor.id, 1)
                )
                self.log.line(f"{t.name} recibe Ventaja en su siguiente tiro", indent)

        elif kind == "ally_attack":
            out += self._ally_attack(actor, indent)

        elif kind == "force_reroll":
            for t in targets:
                t.add_effect(self.state.registry.instantiate("infortunio", actor.id, 1))
                self.log.line(f"{t.name} sufre Infortunio", indent)

        elif kind == "wall":
            raw = effect.raw
            for t in self._resolve_recipients(actor, targets, effect.to):
                t.wall_absorb = max(t.wall_absorb, effect.amount)
                t.wall_rounds = effect.duration
                t.wall_name = raw.get("name", "Muro")
                t.wall_retaliate = raw.get("retaliate")
                self.log.line(
                    f"{t.name} levanta {t.wall_name}: reduce el daño recibido "
                    f"por {t.wall_absorb}",
                    indent,
                )
                self.log.event(
                    "wall", actor=actor.id, target=t.id, absorb=t.wall_absorb
                )
            # A wall shields everyone nearby, not just its caster.
            if raw.get("protects_allies"):
                for ally in self.state.allies_of(actor):
                    ally.wall_absorb = max(ally.wall_absorb, effect.amount)
                    ally.wall_rounds = effect.duration
                    ally.wall_name = raw.get("name", "Muro")

        elif kind == "summon":
            self._summon(actor, effect, indent)

        elif kind == "change_row":
            actor.row = "back" if actor.row == "front" else "front"
            where = "la vanguardia" if actor.row == "front" else "la retaguardia"
            self.log.line(f"{actor.name} se mueve a {where}", indent)
            self.log.event("change_row", actor=actor.id, side=actor.side, row=actor.row)

        elif kind == "note":
            self.log.line(f"({effect.text})", indent)

        return out

    def _resolve_recipients(
        self, actor: Combatant, targets: Sequence[Combatant], to: str
    ) -> list[Combatant]:
        if to == "self":
            return [actor]
        return [t for t in targets if t.alive]

    def _attach(
        self,
        actor: Combatant,
        target: Combatant,
        effect: Effect,
        indent: int,
        against_id: str | None = None,
    ) -> None:
        if not effect.effect_id:
            return
        inst = self.state.registry.instantiate(
            effect.effect_id, actor.id, effect.duration, against_id=against_id
        )
        # Status ladder: a second application escalates rather than stacking.
        if inst.spec.family:
            current = next(
                (e for e in target.active if e.spec.family == inst.spec.family), None
            )
            if current is not None:
                promoted = self.state.registry.next_level(
                    inst.spec.family, current.spec.level
                )
                if promoted is not None and target.immune_to(promoted.id):
                    self.log.line(
                        f"{target.name} es inmune a {promoted.name}", indent
                    )
                    return
                if promoted is None:
                    self.log.line(
                        f"{target.name} ya sufre {current.name} (nivel máximo)", indent
                    )
                    current.rounds_left = inst.rounds_left
                    return
                target.active.remove(current)
                inst = ActiveEffect(promoted, inst.rounds_left, actor.id, against_id)
                self.log.line(
                    f"{target.name}: {current.name} sube a {promoted.name}", indent
                )
                target.add_effect(inst)
                self.log.event(
                    "effect_escalated",
                    actor=actor.id,
                    target=target.id,
                    effect=promoted.id,
                    level=promoted.level,
                )
                return
        if target.immune_to(effect.effect_id):
            self.log.line(f"{target.name} es inmune a {inst.name}", indent)
            self.log.event("immune", target=target.id, effect=effect.effect_id)
            return
        if target.add_effect(inst):
            self.log.line(f"{target.name} sufre {inst.name}", indent)
            self.log.event(
                "effect_applied",
                actor=actor.id,
                target=target.id,
                effect=effect.effect_id,
            )

    # ----------------------------------------------------- consecrated ground
    def _consecrate(self, actor: Combatant, effect: Effect, indent: int) -> bool:
        """Push the battlefield one step along the consecration track.

        The track is ``rival faith <-> neutral <-> your faith``.  Ground held
        by a rival god must first be broken back to neutral, so seizing it
        outright takes two won contests.  Returns True if the ground moved.
        """
        state = self.state
        faith = actor.faith
        if not faith:
            self.log.line(f"{actor.name} no sirve a ningún dios: no puede consagrar", indent)
            return False

        if state.consecration == faith:
            self.log.line(f"El terreno ya está consagrado a {faith}", indent)
            return False

        # Uncontested ground: claim it outright.
        if not state.consecration:
            state.consecration = faith
            state.consecration_owner = actor.id
            self.log.line(f"{actor.name} consagra el terreno a {faith}", indent)
            self.log.event("consecration", actor=actor.id, side=actor.side,
                           faith=faith, result="claimed")
            self._sync_consecration(indent)
            return True

        # Held by a rival god: an opposed roll against whoever holds it.
        holder = next(
            (c for c in state.combatants if c.id == state.consecration_owner and c.alive),
            None,
        )
        mine = self.roll_for(actor, effect.dc, ("consecrate", "divine"))
        if holder is None:
            # Its owner is dead; the ground decays with no one to defend it.
            self.log.line(
                f"{actor.name} rompe la consagración a {state.consecration} "
                f"(sin dueño): {mine}", indent
            )
            theirs_total = 0
        else:
            theirs = self.roll_for(holder, holder.saves.get("vol", DicePool()),
                                   ("consecrate", "divine"), actor)
            theirs_total = theirs.total
            self.log.line(
                f"Disputa de consagración: {actor.name} {mine} vs "
                f"{holder.name} {theirs}", indent
            )

        if mine.total > theirs_total:
            state.consecration = ""
            state.consecration_owner = ""
            self.log.line("El terreno vuelve a ser neutral", indent)
            self.log.event("consecration", actor=actor.id, side=actor.side,
                           faith="", result="neutralised")
            self._sync_consecration(indent)
            return True

        self.log.line(f"{actor.name} no logra romper la consagración", indent)
        self.log.event("consecration", actor=actor.id, side=actor.side,
                       faith=state.consecration, result="held")
        return False

    def _sync_consecration(self, indent: int) -> None:
        """Grant/revoke the consecration buff so it matches the current holder.

        Re-derived from scratch every time the ground moves rather than being
        patched incrementally, so a combatant who joins late (a summon) or
        whose faith never matched can never end up holding a stale buff.
        """
        faith = self.state.consecration
        for c in self.state.combatants:
            has = c.has_effect("consagrar_la_tierra")
            should = bool(faith) and c.faith == faith and c.alive
            if should and not has:
                c.add_effect(
                    self.state.registry.instantiate("consagrar_la_tierra", "terrain", None)
                )
                self.log.line(f"{c.name} recibe la bendición del terreno", indent)
            elif has and not should:
                c.remove_effect("consagrar_la_tierra")
                self.log.line(f"{c.name} pierde la bendición del terreno", indent)

    def contest_consecration(self) -> None:
        """Round-start upkeep: everyone still channelling presses their claim.

        "Mientras mantenga la concentración puede repetir el tiro cada ronda" --
        so holding focus (no incapacitating or disadvantage-inflicting status)
        is what keeps terrain control live.  This is the loop that turns
        Consagrar la Tierra from a one-shot buff into an ongoing objective.
        """
        # Re-derive first so anyone who joined since the ground last moved (a
        # summon, a raised undead) is blessed or not according to their faith.
        if self.state.consecration:
            self._sync_consecration(1)
        for c in list(self.state.living()):
            if not c.has_effect("consagrando") or not c.faith:
                continue
            if self.state.consecration == c.faith:
                continue                      # already yours; nothing to press
            if not self._focused(c):
                self.log.line(f"{c.name} pierde la concentración de la consagración", 1)
                continue
            ability = c.abilities.get("consagrar_la_tierra")
            dc = DicePool()
            if ability is not None:
                for eff in ability.effects:
                    if eff.kind == "consecrate":
                        dc = eff.dc
                        break
            self._consecrate(c, Effect(kind="consecrate", dc=dc), 1)

    def _focused(self, c: Combatant) -> bool:
        """Concentration holds unless a negative status is interfering."""
        if c.incapacitated():
            return False
        return not any(
            mod.advantage < 0 or mod.reroll_worst
            for eff in c.active
            for mod in eff.spec.modifiers
        )

    # ---------------------------------------------------------------- attacks
    def _attack_volley(
        self,
        actor: Combatant,
        targets: Sequence[Combatant],
        effect: Effect,
        ability: Ability,
        upgrades: Sequence[Upgrade],
        indent: int,
        extra_adv: int = 0,
    ) -> list[AttackOutcome]:
        """Resolve one attack roll against every target of the ability.

        Order of operations, which matters a great deal:

        1. one attack roll; a natural 20 is a **critical** and doubles the
           damage dice;
        2. enemies may force a critical to be repeated (keeping the worse);
        3. every target rolls its own free Parada/Esquiva;
        4. if the attack missed everyone and the attacker paid chi for it, the
           attacker's side may repeat the attack roll;
        5. a target that was hit may repeat its own defence roll;
        6. only then do post-hit reactions (+10 defence) and damage happen.
        """
        # Proteger Aliado: a tougher ally may step in front of the intended
        # target.  Only for single-target attacks -- you cannot body-block a
        # cone.  Then Sacrificar Trasgo lets the final target hand it off.
        if len(targets) == 1:
            targets = [self._maybe_intercept(actor, targets[0], ability, indent)]
        targets = [
            self._maybe_redirect(actor, t, ability, indent) for t in targets
        ]
        primary = targets[0]
        adv = extra_adv + sum(u.advantage for u in upgrades)
        tags = ("attack", *ability.tags)

        # Voz del Comandante: an ally may reinforce the swing before it is made.
        self._offer_command_voice(actor, "ataque", primary, indent)

        atk = self.roll_for(actor, effect.attack_roll, tags, primary, extra_adv=adv)
        crit = atk.natural_20
        self.log.line(
            f"Ataque de {actor.name}: {atk}" + (" ** CRÍTICO **" if crit else ""),
            indent,
        )

        # Opponents may force the swing to be repeated (Infortunio, Milagro
        # Menor).  Always worth it on a critical; otherwise only when the roll
        # already looks like it will land and hurt.
        d_pool = primary.defense.roll if primary.defense else DicePool()
        forced = self._seek_reroll(
            actor, atk, "attack", effect.attack_roll, tags, primary, adv,
            want="worse", reason="crítico" if crit else "ataque peligroso",
            indent=indent,
            at_risk=self._impactos_at_risk(actor, primary, ability, crit),
            extra={
                "crit": crit,
                "attack_total": atk.total,
                # d20 average plus the defender's own pool
                "defence_avg": 10.5 + d_pool.average,
            },
        )
        if forced is not None:
            atk = forced
            crit = atk.natural_20

        # Every target defends separately against that one roll.
        defenses: dict[str, tuple[RollResult | None, bool]] = {}
        for t in targets:
            defenses[t.id] = self._defense_roll(actor, t, ability, indent)

        def landed(t: Combatant) -> bool:
            dfn, auto = defenses[t.id]
            return auto or dfn is None or atk.total > dfn.total

        chi_spent = ability.chi + sum(u.chi for u in upgrades)
        if chi_spent >= 1 and not any(landed(t) for t in targets):
            better = self._seek_reroll(
                actor, atk, "attack", effect.attack_roll, tags, primary, adv,
                want="better", reason=f"ataque fallido con {chi_spent} chi",
                indent=indent,
            )
            if better is not None:
                atk = better
                crit = atk.natural_20

        outcomes: list[AttackOutcome] = []
        for target in targets:
            outcomes.append(
                self._resolve_against(
                    actor, target, atk, defenses[target.id], crit,
                    effect, ability, upgrades, indent,
                )
            )

        # Secuencia de Ataques: a second swing at the same target that keeps
        # none of the first one's bonuses.
        extra = sum(u.extra_attacks for u in upgrades)
        for _ in range(extra):
            living = [t for t in targets if t.alive]
            if not living:
                break
            self.log.line(f"{actor.name} encadena un segundo ataque:", indent)
            outcomes += self._attack_volley(
                actor, living[:1], effect, ability, (), indent + 1
            )
        return outcomes

    def _resolve_against(
        self,
        actor: Combatant,
        target: Combatant,
        atk: RollResult,
        defense_pair: tuple[RollResult | None, bool],
        crit: bool,
        effect: Effect,
        ability: Ability,
        upgrades: Sequence[Upgrade],
        indent: int,
    ) -> AttackOutcome:
        defense, auto_hit = defense_pair
        defense_total = defense.total if defense else 0
        # A natural 20 hits automatically: no defence roll, reroll or +10
        # reaction can stop it once the attacker keeps the crit.  The only
        # counterplay is forcing the swing to be repeated (Infortunio, Milagro
        # Menor), which happens back in _attack_volley before we get here.
        hit = auto_hit or crit or (defense is None) or (atk.total > defense_total)

        # A defender who was hit may repeat their own defence roll, if the blow
        # is worth a limited use.
        if hit and not crit and not auto_hit and defense is not None:
            tags = ("defense", *(target.defense.tags if target.defense else ()))
            better = self._seek_reroll(
                target, defense, "defense",
                target.defense.roll if target.defense else DicePool(),
                tags, actor, 0, want="better",
                reason="defensa fallida", indent=indent,
                at_risk=self._impactos_at_risk(actor, target, ability, crit),
            )
            if better is not None:
                defense = better
                defense_total = defense.total
                hit = atk.total > defense_total

        # Salto Espacial, Evasión: only once the blow has actually landed.
        if hit and not crit and not auto_hit and defense is not None:
            bonus = self._post_hit_defense(
                actor, target, ability, atk.total, defense_total, indent
            )
            if bonus:
                defense_total += bonus
                hit = atk.total > defense_total
                self.log.line(
                    f"Defensa de {target.name} sube a {defense_total} "
                    f"-> el ataque {'sigue impactando' if hit else 'FALLA'}",
                    indent,
                )

        self.log.event(
            "attack",
            actor=actor.id,
            side=actor.side,
            target=target.id,
            ability=ability.id,
            attack_total=atk.total,
            defense_total=defense_total if defense else None,
            hit=hit,
            crit=crit and hit,
        )

        if not hit:
            self.log.line(
                f"FALLA contra la defensa de {target.name} ({defense_total})", indent
            )
            for sub in effect.on_miss:
                self._apply_effect(actor, sub, [target], ability, upgrades, indent + 1)
            for up in upgrades:
                for sub in up.on_miss:
                    self._apply_effect(actor, sub, [target], ability, upgrades, indent + 1)
            # Atrapar Arma and friends: reactions to a successful Parada
            if defense is not None:
                self._parry_reactions(actor, target, ability, target.defense, indent)
            # Redirigir Ataque: someone may re-aim the failed swing rather than
            # let it become an Apertura.
            if self._redirect_miss(actor, target, effect, ability, upgrades, indent):
                return AttackOutcome(False, atk, defense, target=target)
            self._provoke_opening(actor, target, indent)
            return AttackOutcome(False, atk, defense, target=target)

        self.log.line(
            f"IMPACTA a {target.name}"
            + (" (CRÍTICO: impacto automático)" if crit else ""),
            indent,
        )
        self._wall_retaliation(actor, target, ability, indent)
        outcome = AttackOutcome(True, atk, defense, target=target)
        for sub in effect.on_hit:
            if sub.kind == "damage":
                dealt, imp, wasted = self._roll_and_apply_damage(
                    actor, target, sub, ability, upgrades, indent + 1, crit=crit
                )
                outcome.damage += dealt
                outcome.impactos += imp
                outcome.wasted = outcome.wasted or wasted
            else:
                self._apply_effect(actor, sub, [target], ability, upgrades, indent + 1)
        for up in upgrades:
            for sub in up.on_hit:
                self._apply_effect(actor, sub, [target], ability, upgrades, indent + 1)
        return outcome

    def _defense_roll(
        self, actor: Combatant, target: Combatant, ability: Ability, indent: int
    ) -> tuple[RollResult | None, bool]:
        if target.incapacitated():
            self.log.line(f"{target.name} no puede defenderse", indent)
            return None, True
        defense = target.defense
        if defense is None:
            return None, True

        self._offer_command_voice(target, "defensa", actor, indent)
        # Defensa Hábil rolls every defence available and keeps the best.
        best_roll = None
        best_name = defense.name
        for option in target.defenses or [defense]:
            r = self.roll_for(
                target, option.roll, ("defense", *option.tags), actor
            )
            if best_roll is None or r.total > best_roll.total:
                best_roll, best_name = r, option.name
        target.consume_single_use("consume_on_defense")
        self.log.line(f"Defensa de {target.name} ({best_name}): {best_roll}", indent)
        return best_roll, False

    # ------------------------------------------------- post-roll interrupts
    def _impactos_at_risk(
        self, actor: Combatant, target: Combatant, ability: Ability, crit: bool
    ) -> int:
        """Rough impactos this ability would inflict -- drives reroll decisions."""
        total = 0
        for eff in ability.effects:
            for sub in (*eff.on_hit, eff):
                if sub.kind == "damage" and sub.damage is not None:
                    pool = sub.damage
                    avg = pool.average + (pool.average - pool.flat if crit else 0)
                    total += int(avg) // max(1, target.umbral_for(sub.dtype))
        return total

    def _reroll_candidates(
        self, owner: Combatant, kind: str, want: str
    ) -> list[tuple[Combatant, Ability]]:
        """Who could interrupt this roll, and with what."""
        if want == "better":
            pool = self.state.allies_of(owner, include_self=True)
            allowed = {"self", "ally", "any"}
        else:  # an opponent forcing the roll to be repeated for the worse
            pool = self.state.enemies_of(owner)
            allowed = {"enemy", "any"}
        found: list[tuple[Combatant, Ability]] = []
        for c in pool:
            for ab in c.abilities.values():
                if not ab.is_reroll or not ab.implemented:
                    continue
                if ab.reroll_scope not in allowed:
                    continue
                if ab.reroll_kinds and kind not in ab.reroll_kinds:
                    continue
                if ab.reroll_scope == "self" and c.id != owner.id:
                    continue
                if not c.can_afford(ab, as_reaction=True):
                    continue
                found.append((c, ab))
        return found

    def _seek_reroll(
        self,
        owner: Combatant,
        result: RollResult,
        kind: str,
        pool: DicePool,
        tags: Sequence[str],
        opponent: Combatant | None,
        adv: int,
        want: str,
        reason: str,
        indent: int,
        at_risk: int = 0,
        extra: dict | None = None,
    ) -> RollResult | None:
        """Offer a repeat of ``result``.  Returns the new roll, or None.

        ``want="better"`` keeps the higher of the two rolls for ``owner``;
        ``want="worse"`` is an enemy forcing the repeat and keeps the lower.
        """
        for user, ability in self._reroll_candidates(owner, kind, want):
            context = {
                "kind": kind,
                "want": want,
                "reason": reason,
                "at_risk": at_risk,
                "owner_impactos": owner.impactos,
                "result": result.total,
                **(extra or {}),
            }
            if user.policy is None:
                continue
            if not user.policy.choose_reroll(self.state, user, owner, ability, context):
                continue
            user.pay(ability, as_reaction=True)
            again = self.roll_for(owner, pool, tags, opponent, extra_adv=adv)
            kept = (
                max(result, again, key=lambda r: r.total)
                if want == "better"
                else min(result, again, key=lambda r: r.total)
            )
            self.log.line(
                f"{user.name} usa {ability.name} ({ability.cost_label()}) sobre "
                f"{owner.name} [{reason}]: repite {result.total} -> {again.total}, "
                f"se queda con {kept.total}",
                indent,
            )
            self.log.event(
                "reroll",
                actor=user.id,
                side=user.side,
                ability=ability.id,
                owner=owner.id,
                roll_kind=kind,
                want=want,
                before=result.total,
                after=again.total,
                kept=kept.total,
            )
            return kept
        return None

    # -------------------------------------------------------- Voz del Comandante
    def _offer_command_voice(
        self,
        beneficiary: Combatant,
        kind: str,
        opponent: Combatant | None,
        indent: int,
    ) -> None:
        """Allies may hand out a Ventaja die before a roll, as a bonus action."""
        for ally in self.state.allies_of(beneficiary):
            for ability in ally.abilities.values():
                if not ability.implemented or not ability.bonus_action:
                    continue
                if not any(e.kind == "grant_advantage" for e in ability.effects):
                    continue
                if not ally.can_afford(ability):
                    continue
                if ally.policy is None:
                    continue
                if not ally.policy.choose_command_voice(
                    self.state, ally, beneficiary, ability, kind, opponent
                ):
                    continue
                ally.pay(ability)
                beneficiary.add_effect(
                    self.state.registry.instantiate("ventaja_otorgada", ally.id, 1)
                )
                self.log.line(
                    f"{ally.name} usa {ability.name} (acción bonus) -> "
                    f"{beneficiary.name} gana Ventaja en su tiro de {kind}",
                    indent,
                )
                self.log.event(
                    "command_voice",
                    actor=ally.id,
                    side=ally.side,
                    ability=ability.id,
                    target=beneficiary.id,
                    roll_kind=kind,
                )
                return

    def _post_hit_defense(
        self,
        actor: Combatant,
        target: Combatant,
        ability: Ability,
        attack_total: int,
        defense_total: int,
        indent: int,
    ) -> int:
        """Reactions that raise an already-beaten defence roll.

        Salto Espacial, Evasión and friends only come out once the blow has
        actually landed, so the defender decides knowing both totals.  Returns
        the bonus to add to the defence roll.
        """
        if target.policy is None:
            return 0
        reaction = target.policy.choose_defense_reaction(
            self.state, target, actor, ability, attack_total, defense_total
        )
        if reaction is None:
            return 0
        target.pay(reaction, as_reaction=True)
        self.log.line(
            f"{target.name} reacciona con {reaction.name} ({reaction.cost_label()})",
            indent,
        )
        self.log.event(
            "reaction",
            actor=target.id,
            side=target.side,
            ability=reaction.id,
            trigger="on_defend",
        )
        return sum(e.raw.get("defense_bonus", 0) for e in reaction.effects)

    def _post_fail_save(
        self,
        actor: Combatant,
        target: Combatant,
        effect: Effect,
        save_total: int,
        dc_total: int,
        indent: int,
    ) -> int:
        """Reactions that raise an already-failed save (Aura Protectora and
        friends), offered once the target knows they failed -- same "decide
        with both numbers known" shape as _post_hit_defense. Returns the
        bonus to add to the save roll."""
        if target.policy is None:
            return 0
        reaction = target.policy.choose_save_reaction(
            self.state, target, actor, effect.save, save_total, dc_total
        )
        if reaction is None:
            return 0
        target.pay(reaction, as_reaction=True)
        self.log.line(
            f"{target.name} reacciona con {reaction.name} ({reaction.cost_label()})",
            indent,
        )
        self.log.event(
            "reaction",
            actor=target.id,
            side=target.side,
            ability=reaction.id,
            trigger="on_save_fail",
        )
        return sum(e.raw.get("save_bonus", 0) for e in reaction.effects)

    def _redirect_miss(
        self,
        actor: Combatant,
        target: Combatant,
        effect: Effect,
        ability: Ability,
        upgrades: Sequence[Upgrade],
        indent: int,
    ) -> bool:
        """Redirigir Ataque: a failed attack is re-aimed at a new target.

        Used on an enemy's whiff it turns their own weapon on their allies;
        used on a friendly whiff it is simply a reroll against a fresh target.
        The redirected swing is rolled again, so it can miss too -- but it does
        not chain, and it consumes the Apertura the miss would have caused.
        """
        if self._redirect_depth:
            return False
        for user in self.state.combatants:
            if not user.alive or user.policy is None:
                continue
            for react in user.abilities.values():
                if not react.implemented or react.trigger != "on_miss":
                    continue
                if not any(e.kind == "redirect_miss" for e in react.effects):
                    continue
                if not user.can_afford(react, as_reaction=True):
                    continue
                # A redirected attack always lands on someone hostile to the
                # combatant paying for it.
                # The rules allow re-aiming at "un objetivo diferente o el
                # mismo", so the original target stays eligible -- but never
                # the attacker himself, and never one of his own allies.
                options = [
                    c
                    for c in self.state.enemies_of(user)
                    if c.id != actor.id
                    and c.side != actor.side
                    and self.state.can_reach(ability, c, actor)
                ]
                if not options:
                    continue
                choice = user.policy.choose_redirect_miss(
                    self.state, user, actor, target, ability, options
                )
                if choice is None:
                    continue
                user.pay(react, as_reaction=True)
                self.log.line(
                    f"{user.name} usa {react.name} ({react.cost_label()}): "
                    f"el ataque fallido de {actor.name} se redirige a {choice.name}",
                    indent,
                )
                self.log.event(
                    "redirect_miss",
                    actor=user.id,
                    side=user.side,
                    ability=react.id,
                    original_target=target.id,
                    new_target=choice.id,
                )
                self._redirect_depth += 1
                try:
                    self._attack_volley(
                        actor, [choice], effect, ability, upgrades, indent + 1
                    )
                finally:
                    self._redirect_depth -= 1
                return True
        return False

    def _parry_reactions(
        self, attacker: Combatant, defender: Combatant, ability: Ability,
        defense: Ability | None, indent: int,
    ) -> None:
        """Reactions with ``trigger: on_parry`` (Atrapar Arma).

        Offered when an attack has just been stopped by a *Parada* (not an
        Esquiva): to the defender if it was a weapon attack ("detienes el ataque
        de un arma enemiga"), and to the attacker ("un enemigo detiene tu ataque
        usando Parada").  The reaction's effects land on the other combatant.
        """
        if defense is None or "parada" not in defense.name.lower():
            return
        chances = [(attacker, defender)]
        if "weapon" in ability.tags:
            chances.insert(0, (defender, attacker))
        for user, opponent in chances:
            if not user.alive or not opponent.alive or user.policy is None:
                continue
            for react in user.abilities.values():
                if not react.implemented or react.trigger != "on_parry":
                    continue
                if not user.can_afford(react, as_reaction=True):
                    continue
                if not user.policy.choose_parry_reaction(self.state, user, opponent, react):
                    continue
                user.pay(react, as_reaction=True)
                self.log.line(
                    f"{user.name} reacciona con {react.name} ({react.cost_label()}) contra {opponent.name}",
                    indent,
                )
                self.log.event("reaction", actor=user.id, side=user.side, ability=react.id, trigger="on_parry")
                for eff in react.effects:
                    self._apply_effect(user, eff, [opponent], react, [], indent + 1)
                break  # one reaction per user per parry

    def _wall_retaliation(
        self, attacker: Combatant, target: Combatant, ability: Ability, indent: int
    ) -> None:
        """Muro de Fuego/Zarzas and friends bite back at melee attackers."""
        ret = target.wall_retaliate
        if not ret or not ability.is_melee or not attacker.alive:
            return
        dc = DicePool.parse(ret.get("dc", "0"))
        save = ret.get("save", "fis")
        tags = ("save", f"save_{save}") + (
            ("physical",) if save == "fis" else
            ("physical", "mental") if save == "vol" else ("mental",)
        )
        dc_roll = self.roll_for(target, dc, ("save_dc",), attacker)
        save_roll = self.roll_for(attacker, attacker.saves.get(save, DicePool()),
                                  tags, target)
        ok = save_roll.total >= dc_roll.total
        self.log.line(
            f"{target.wall_name} responde: salvación {save.upper()} de "
            f"{attacker.name} {save_roll} vs {dc_roll} -> "
            f"{'SUPERA' if ok else 'FALLA'}",
            indent,
        )
        self.log.event("wall_retaliation", actor=target.id, target=attacker.id,
                       success=ok)
        if ok:
            return
        if ret.get("damage"):
            self._apply_damage(target, attacker,
                               self.roller.roll(DicePool.parse(ret["damage"])).total,
                               ret.get("dtype", "general"), ability, indent + 1)
        if ret.get("effect"):
            eff = self.state.registry.instantiate(ret["effect"], target.id,
                                                 ret.get("effect_duration", 2))
            if attacker.add_effect(eff):
                self.log.line(f"{attacker.name} sufre {eff.name}", indent + 1)

    def _summon(self, actor: Combatant, effect: Effect, indent: int) -> None:
        """Invocación Abisal: reinforcements join the actor's side immediately."""
        factory = self.state.summon_factory
        sid = effect.raw.get("statblock")
        if factory is None or not sid:
            self.log.line("(invocación no modelada)", indent)
            return
        existing = sum(1 for c in self.state.combatants if c.statblock_id == sid)
        for i in range(effect.amount):
            minion = factory(sid, actor.side, existing + i)
            minion.row = actor.row
            self.state.combatants.append(minion)
            self.log.line(f"{actor.name} invoca a {minion.name}", indent)
            self.log.event(
                "summon", actor=actor.id, side=actor.side, statblock=sid,
                summoned=minion.id,
            )

    def _check_phase(self, target: Combatant, indent: int) -> None:
        """Boss phase changes fire the moment enough impactos are gone."""
        lost = target.max_impactos - target.impactos
        for phase in target.phases:
            key = phase.get("effect") or phase.get("name")
            if key in target.phases_fired:
                continue
            if lost < int(phase.get("impactos_lost", 0)):
                continue
            target.phases_fired.add(key)
            name = phase.get("name", key)
            self.log.line(f"** {target.name}: {name} **", indent)
            self.log.event("phase", actor=target.id, side=target.side, phase=name)
            if phase.get("effect"):
                target.add_effect(
                    self.state.registry.instantiate(phase["effect"], target.id, None)
                )

    def _maybe_intercept(
        self, actor: Combatant, target: Combatant, ability: Ability, indent: int
    ) -> Combatant:
        """Let a sturdier ally take the blow meant for ``target``.

        The protector rolls their own defence and takes any damage, so this is
        how a Bárbaro shields the casters -- including from ranged attacks a
        front row cannot otherwise stop.
        """
        for ally in self.state.allies_of(target):
            if ally.policy is None or not ally.alive:
                continue
            for react in ally.abilities.values():
                if not react.implemented or react.trigger != "on_ally_attacked":
                    continue
                if not any(e.kind == "intercept" for e in react.effects):
                    continue
                if not ally.can_afford(react, as_reaction=True):
                    continue
                if not ally.policy.choose_intercept(
                    self.state, ally, target, actor, ability
                ):
                    continue
                ally.pay(react, as_reaction=True)
                self.log.line(
                    f"{ally.name} usa {react.name} ({react.cost_label()}): "
                    f"intercepta el ataque dirigido a {target.name}",
                    indent,
                )
                self.log.event(
                    "intercept",
                    actor=ally.id,
                    side=ally.side,
                    ability=react.id,
                    protected=target.id,
                )
                return ally
        return target

    def _maybe_redirect(
        self, actor: Combatant, target: Combatant, ability: Ability, indent: int
    ) -> Combatant:
        if target.policy is None:
            return target
        choice = target.policy.choose_attacked_reaction(
            self.state, target, actor, ability
        )
        if choice is None:
            return target
        reaction, new_target = choice
        target.pay(reaction, as_reaction=True)
        self.log.line(
            f"{target.name} usa {reaction.name}: el ataque pasa a {new_target.name}",
            indent,
        )
        self.log.event(
            "reaction",
            actor=target.id,
            side=target.side,
            ability=reaction.id,
            trigger="on_attacked",
        )
        return new_target

    # ----------------------------------------------------------------- damage
    def _roll_and_apply_damage(
        self,
        actor: Combatant,
        target: Combatant,
        effect: Effect,
        ability: Ability,
        upgrades: Sequence[Upgrade],
        indent: int,
        crit: bool = False,
    ) -> tuple[int, int, bool]:
        pool = effect.damage or DicePool()
        bonus = actor.damage_dice_bonus(("damage", *ability.tags), target.id)
        bonus += sum(u.effective_damage_dice(actor) for u in upgrades)
        if bonus:
            pool = pool.with_dice(bonus, pool.largest_die)
        if crit:
            # Critical hit: every damage die is rolled twice.  Flat modifiers
            # are not doubled.
            pool = DicePool(pool.dice + pool.dice, pool.flat)
        roll = self.roller.roll(pool)
        swap = next((u.dtype for u in upgrades if u.dtype), "")
        dtype = swap or effect.dtype_against(target)
        note = f" [{dtype}]" if dtype != effect.dtype else ""
        detail = f"{roll}{' CRÍTICO' if crit else ''}{note}"
        return self._apply_damage(
            actor, target, roll.total, dtype, ability, indent, detail
        )

    def _apply_damage(
        self,
        actor: Combatant,
        target: Combatant,
        amount: int,
        dtype: str,
        ability: Ability,
        indent: int,
        detail: str = "",
    ) -> tuple[int, int, bool]:
        # Segundo Aliento and friends fire before the umbral division.
        if target.policy is not None:
            reaction = target.policy.choose_damage_reaction(
                self.state, target, actor, amount, dtype
            )
            if reaction is not None:
                target.pay(reaction, as_reaction=True)
                self.log.line(
                    f"{target.name} reacciona con {reaction.name} "
                    f"({reaction.cost_label()})",
                    indent,
                )
                self.log.event(
                    "reaction",
                    actor=target.id,
                    side=target.side,
                    ability=reaction.id,
                    trigger="on_damaged",
                )
                self.use_ability(
                    target, reaction, [target], as_reaction=True, free=True,
                    indent=indent + 1,
                )

        umbral = target.umbral_for(dtype)
        # "Contra el siguiente ataque" effects (Segundo Aliento) are meant to
        # discount exactly one hit, not linger for the rest of the round --
        # spend them the moment they've actually been read into a threshold.
        target.consume_single_use("consume_on_umbral")
        raw = amount
        # The wall soaks a flat amount BEFORE the division -- unlike an umbral
        # boost, which changes the divisor. Against small hits that is far
        # stronger; against huge ones, far weaker.
        wall_soaked = 0
        if target.wall_absorb:
            wall_soaked = min(target.wall_absorb, amount)
            amount -= wall_soaked
        shields = 0
        if target.shield_counters and target.policy is not None:
            shields = target.policy.use_shields(self.state, target, amount, umbral)
            shields = min(shields, target.shield_counters)
            if shields:
                target.shield_counters -= shields
                amount = max(0, amount - 10 * shields)

        # A specific-type umbral override (e.g. an Abisal's radiante: 0) is a
        # deliberate "no resistance at all" vulnerability, not an error --
        # but 0 is still not a valid divisor, so floor it here without
        # touching the umbral value itself (still logged/compared as 0).
        divisor = max(1, umbral)
        impactos = amount // divisor
        wasted = impactos == 0 and raw > 0
        margin = divisor - (amount % divisor)  # how far from the next impacto

        target.impactos -= impactos
        # Drenar Vida: connecting restores the attacker.
        if impactos > 0 and ability.raw_lifesteal:
            healed = min(1, actor.max_impactos - actor.impactos)
            if healed:
                actor.impactos += healed
                self.log.line(f"{actor.name} drena y recupera {healed} impacto", indent)
        wall_txt = f", {target.wall_name} -{wall_soaked}" if wall_soaked else ""
        shield_txt = (f", {shields} escudo(s)" if shields else "") + wall_txt
        self.log.line(
            f"Daño {detail or raw} {dtype} vs umbral {umbral}{shield_txt} "
            f"-> {impactos} impacto(s). {target.name}: {target.status_line()}",
            indent,
        )
        self.log.event(
            "damage",
            actor=actor.id,
            side=actor.side,
            target=target.id,
            ability=ability.id,
            raw=raw,
            applied=amount,
            dtype=dtype,
            umbral=umbral,
            impactos=impactos,
            wasted=wasted,
            margin_to_next=margin,
            shields=shields,
            wall=wall_soaked,
        )
        if impactos > 0:
            self._check_phase(target, indent)
        if target.impactos <= 0:
            self.log.line(f"** {target.name} cae derrotado **", indent)
            self.log.event("defeated", target=target.id, side=target.side, by=actor.id)
        return raw, impactos, wasted

    # ------------------------------------------------------------------ saves
    def _save_volley(
        self,
        actor: Combatant,
        targets: Sequence[Combatant],
        effect: Effect,
        ability: Ability,
        upgrades: Sequence[Upgrade],
        indent: int,
    ) -> None:
        """The caster rolls the DC once; each target saves against that number."""
        dc_roll = self.roll_for(
            actor, effect.dc, ("save_dc", *ability.tags), targets[0]
        )
        if len(targets) > 1:
            self.log.line(f"Dificultad de {actor.name}: {dc_roll}", indent)
        for t in targets:
            if t.alive:
                self._save(actor, t, effect, ability, upgrades, indent, dc_roll)

    def _save(
        self,
        actor: Combatant,
        target: Combatant,
        effect: Effect,
        ability: Ability,
        upgrades: Sequence[Upgrade],
        indent: int,
        dc_roll: RollResult,
    ) -> bool:
        save_pool = target.saves.get(effect.save, DicePool())
        # FÍS is FUE+DES, MEN is INT+SAB, but VOL is CON+CAR -- it straddles the
        # physical and mental stat groups, so both Ira and Mente Desencadenada
        # boost it, exactly as the level-2 statblocks show.
        tags = ("save", f"save_{effect.save}")
        tags += {
            "fis": ("physical",),
            "vol": ("physical", "mental"),
            "men": ("mental",),
        }.get(effect.save, ())
        save_roll = self.roll_for(target, save_pool, tags, actor)
        success = save_roll.total >= dc_roll.total
        bonus = 0
        if not success:
            bonus = self._post_fail_save(
                actor, target, effect, save_roll.total, dc_roll.total, indent
            )
            if bonus:
                success = (save_roll.total + bonus) >= dc_roll.total
        extra = f" +{bonus} (reacción)" if bonus else ""
        self.log.line(
            f"Salvación {effect.save.upper()} de {target.name}: {save_roll}{extra} "
            f"vs {dc_roll} -> {'SUPERA' if success else 'FALLA'}",
            indent,
        )
        self.log.event(
            "save",
            actor=actor.id,
            target=target.id,
            ability=ability.id,
            save=effect.save,
            dc=dc_roll.total,
            roll=save_roll.total + bonus,
            success=success,
        )
        branch = effect.on_success if success else effect.on_fail
        for sub in branch:
            if sub.kind == "damage":
                self._roll_and_apply_damage(
                    actor, target, sub, ability, upgrades, indent + 1
                )
            else:
                self._apply_effect(actor, sub, [target], ability, upgrades, indent + 1)
        return success

    # --------------------------------------------------------------- openings
    def _provoke_opening(
        self, missed_attacker: Combatant, defender: Combatant, indent: int
    ) -> None:
        """A missed attack lets the defender act out of turn.

        The counterattack is paid for out of the defender's **action** pool --
        the same reserve their own turn draws on -- so punishing an Apertura
        costs them tempo later in the round.
        """
        # An Apertura only ever passes between opposing sides; a redirected or
        # reflected attack must never let someone counterattack themselves or
        # an ally.
        if missed_attacker.id == defender.id or missed_attacker.side == defender.side:
            return
        self.log.event(
            "opening",
            provoker=missed_attacker.id,
            beneficiary=defender.id,
            side=defender.side,
        )
        if defender.policy is None or defender.actions_left <= 0:
            return
        limit = self.state.config.get("max_opening_chain")
        if limit is not None and self._opening_depth >= limit:
            self.log.line(
                f"(la cadena de aperturas se detiene en el nivel {limit})", indent
            )
            self.log.event("opening_capped", beneficiary=defender.id)
            return
        choice = defender.policy.choose_opening_action(
            self.state, defender, missed_attacker
        )
        if choice is None:
            return
        ability, targets, upgrades = choice
        self.log.line(
            f"¡APERTURA! {defender.name} contraataca "
            f"({defender.actions_left} acc disponibles):",
            indent,
        )
        self.log.event(
            "opening_punished",
            actor=defender.id,
            side=defender.side,
            ability=ability.id,
            actions=ability.actions,
        )
        self._opening_depth += 1
        try:
            self.use_ability(
                defender, ability, targets, upgrades,
                indent=indent + 1, out_of_turn=True,
            )
        finally:
            self._opening_depth -= 1

    # ------------------------------------------------------------ ally attack
    def _ally_attack(self, actor: Combatant, indent: int) -> list[AttackOutcome]:
        """Grito de Guerra: a nearby ally attacks immediately, with Ventaja."""
        candidates = [
            a
            for a in self.state.allies_of(actor)
            if any(ab.is_attack and ab.actions <= 1 for ab in a.abilities.values())
        ]
        if not candidates:
            self.log.line("(sin aliados disponibles para atacar)", indent)
            return []
        ally = max(candidates, key=lambda a: a.impactos)
        attacks = [
            ab for ab in ally.abilities.values() if ab.is_attack and ab.actions <= 1
        ]
        ability = max(
            attacks,
            key=lambda ab: max(
                (e.damage.average if e.damage else 0)
                for eff in ab.effects
                for e in (eff.on_hit or [eff])
            ),
        )
        enemies = self.state.enemies_of(ally)
        if not enemies:
            return []
        target = ally.policy.choose_target(self.state, ally, enemies, ability)
        return self.use_ability(
            ally, ability, [target], as_reaction=True, free=True,
            indent=indent + 1, extra_adv=1,
        )
