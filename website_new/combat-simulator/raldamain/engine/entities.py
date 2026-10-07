"""Combatants: their resources, thresholds and active effects."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable

from .abilities import Ability
from .dice import DicePool
from .effects import ActiveEffect, EffectRegistry

# Damage types roll up into groups so a statblock can say "8 (Físico)" once
# instead of listing cortante/perforante/contundente separately.
DAMAGE_GROUPS: dict[str, str] = {
    "cortante": "fisico",
    "perforante": "fisico",
    "contundente": "fisico",
    # Elemental damage (fire/frost/lightning/acid) is still sorcery -- it
    # rolls up into "magico" like every other spell type, closing the gap
    # where an undefined "elemental" bucket let it bypass a monster's real
    # magic resistance and land on the much lower "general" floor instead.
    "fuego": "magico",
    "frio": "magico",
    "electrico": "magico",
    "acido": "magico",
    "arcano": "magico",
    "radiante": "magico",
    "necrotico": "magico",
    "psiquico": "magico",
    "sonico": "magico",
    # Fuerza deliberately has no group: it stays the one damage type that
    # bypasses resistance coverage (exact "fuerza" umbral, else "general"),
    # matching Mago's signature "ignores wards" niche rather than sharing
    # the same tax as every other spell.
}


#: Everyone can reposition. Costs a full action, so screening a back row is a
#: real commitment for the attacker to give up on -- but it is now absolute:
#: there is no way to pay an action to reach a back row still held by a
#: living front line, only by clearing it.
POSITIONING_ACTIONS: list[dict[str, Any]] = [
    {
        "id": "cambiar_fila",
        "name": "Cambiar de Fila",
        "cost": {"actions": 1},
        "targeting": "self",
        "effects": [{"kind": "change_row"}],
    },
    {
        "id": "ayudar",
        "name": "Ayudar",
        "cost": {"actions": 1},
        "targeting": "ally",
        "reach": "media",
        "effects": [{"kind": "apply_effect", "effect": "asistido", "to": "target",
                     "duration": 2}],
    },
]


@dataclass
class Combatant:
    id: str
    name: str
    side: str
    level: int = 0

    max_impactos: int = 6
    impactos: int = 6
    max_chi: int = 0
    chi: int = 0

    actions_max: int = 3
    reactions_max: int = 2
    actions_left: int = 0
    reactions_left: int = 0

    umbrales: dict[str, int] = field(default_factory=lambda: {"general": 2})
    saves: dict[str, DicePool] = field(default_factory=dict)
    initiative: DicePool = field(default_factory=DicePool)

    abilities: dict[str, Ability] = field(default_factory=dict)
    #: Rank levels per skill, e.g. {"guerrero_divino": 2}.  Lets an upgrade's
    #: numbers (Azote Divino's damage die, etc.) scale off the same rank the
    #: build sheet actually invests in, instead of being hand-copied per level.
    ranks: dict[str, int] = field(default_factory=dict)
    defense_id: str = ""
    #: Defensa Hábil -- roll every defence available and keep the best.
    skilled_defense: bool = False

    immunities: tuple[str, ...] = ()
    shield_counters: int = 0
    #: Walls reduce incoming damage by a flat amount *before* the umbral
    #: division -- a different lever from raising the umbral, which divides.
    wall_absorb: int = 0
    wall_rounds: int | None = None
    wall_name: str = ""
    wall_retaliate: dict[str, Any] | None = None

    active: list[ActiveEffect] = field(default_factory=list)
    uses: dict[str, int] = field(default_factory=dict)
    used_this_round: dict[str, int] = field(default_factory=dict)
    #: Reloading weapons: shots left / magazine size per ammo group
    ammo: dict[str, int] = field(default_factory=dict)
    ammo_max: dict[str, int] = field(default_factory=dict)

    policy: Any = None
    row: str = "front"  # "front" | "back"
    #: Boss phases: [{"impactos_lost": 6, "name": ..., "effect": ...}]
    phases: tuple[dict[str, Any], ...] = ()
    phases_fired: set = field(default_factory=set)
    statblock_id: str = ""
    #: Which divine patron this combatant serves, for Consagrar la Tierra:
    #: "celestial", "primigenio" (spirits), "abisal", or "" for the faithless
    #: (the Mago).  Consecrated ground only empowers those of the holding
    #: faith, so this crosses side lines -- an abyssal cultist's consecration
    #: does nothing for a celestial paladin even on the same team.
    faith: str = ""
    unimplemented: tuple[str, ...] = ()

    # ------------------------------------------------------------------ state
    @property
    def alive(self) -> bool:
        return self.impactos > 0

    @property
    def defense(self) -> Ability | None:
        return self.abilities.get(self.defense_id)

    @property
    def defenses(self) -> list[Ability]:
        """Every defence roll available.

        With *Defensa Hábil* the combatant rolls all of them and keeps the best;
        without it only :attr:`defense` is used.
        """
        if not self.skilled_defense:
            d = self.defense
            return [d] if d else []
        return [a for a in self.abilities.values() if a.is_defense and a.implemented]

    def start_combat(self) -> None:
        self.phases_fired = set()
        self.impactos = self.max_impactos
        self.chi = self.max_chi
        self.shield_counters = 0
        self.wall_absorb = 0
        self.wall_rounds = None
        self.wall_name = ""
        self.wall_retaliate = None
        self.active.clear()
        self.uses = {
            a.id: a.uses_per_combat
            for a in self.abilities.values()
            if a.uses_per_combat is not None
        }
        self.ammo_max = {a.ammo: a.ammo_shots for a in self.abilities.values() if a.ammo and a.ammo_shots}
        self.ammo = dict(self.ammo_max)  # weapons start loaded
        self.refresh_round()

    def refresh_round(self) -> None:
        self.actions_left = max(0, self.actions_max - self.lost_actions())
        self.reactions_left = self.reactions_max
        self.used_this_round.clear()

    def lost_actions(self) -> int:
        return sum(e.spec.lose_actions for e in self.active)

    def incapacitated(self) -> bool:
        return any(e.spec.incapacitates for e in self.active)

    # ---------------------------------------------------------------- effects
    def immune_to(self, effect_id: str) -> bool:
        return effect_id in self.immunities

    def add_effect(self, eff: ActiveEffect) -> bool:
        if self.immune_to(eff.id):
            return False
        for existing in self.active:
            if existing.id == eff.id and existing.against_id == eff.against_id:
                # refresh duration rather than stacking identical effects
                if eff.rounds_left is None or (
                    existing.rounds_left is not None
                    and eff.rounds_left > existing.rounds_left
                ):
                    existing.rounds_left = eff.rounds_left
                return False
        if eff.spec.stack_group:
            rival = next(
                (e for e in self.active
                 if e.spec.stack_group == eff.spec.stack_group and e.id != eff.id),
                None,
            )
            if rival is not None:
                # Same font of power under two names (Consagrar la Tierra's
                # terrain blessing, Guerrero de la Fe's personal invocation):
                # only the stronger stays, and a tie favours whichever is
                # already running rather than paying twice for the same thing.
                if rival.spec.strength >= eff.spec.strength:
                    return False
                self.active.remove(rival)
        self.active.append(eff)
        return True

    def has_effect(self, effect_id: str) -> bool:
        return any(e.id == effect_id for e in self.active)

    def remove_effect(self, effect_id: str) -> bool:
        for i, e in enumerate(self.active):
            if e.id == effect_id:
                self.active.pop(i)
                return True
        return False

    def worst_condition(self) -> str | None:
        for e in self.active:
            if e.spec.kind == "condition":
                return e.id
        return None

    def tick_wall(self) -> str | None:
        if self.wall_absorb and self.wall_rounds is not None:
            self.wall_rounds -= 1
            if self.wall_rounds <= 0:
                name = self.wall_name
                self.wall_absorb = 0
                self.wall_name = ""
                self.wall_retaliate = None
                return name
        return None

    def tick_effects(self) -> list[str]:
        expired: list[str] = []
        for e in list(self.active):
            e.tick()
            if e.expired():
                self.active.remove(e)
                expired.append(e.name)
        return expired

    def consume_on_roll(self, tags: Iterable[str], opponent_id: str | None = None) -> list[str]:
        """Spend the ``consume_on_roll`` effects (Asistido, Ventaja otorgada)
        that just boosted a real roll with ``tags``: they help one roll only."""
        tags = set(tags)
        if "initiative" in tags:
            return []
        spent = []
        for e in list(self.active):
            if ("consume_on_roll" in e.spec.tags and e.relevant_to(opponent_id)
                    and any(m.applies_to(tags) for m in e.spec.modifiers)):
                self.active.remove(e)
                spent.append(e.name)
        return spent

    def consume_single_use(self, tag: str) -> None:
        for e in list(self.active):
            if tag in e.spec.tags:
                self.active.remove(e)

    # ----------------------------------------------------------- roll support
    def modifiers_for(
        self, tags: Iterable[str], opponent_id: str | None = None
    ) -> tuple[int, int, bool]:
        """Return ``(advantage, flat, reroll_worst)`` for a roll with ``tags``."""
        tags = set(tags)
        adv = flat = 0
        reroll = False
        for eff in self.active:
            if not eff.relevant_to(opponent_id):
                continue
            # one-roll help (Asistido) is given for an action, never for initiative
            if "initiative" in tags and "consume_on_roll" in eff.spec.tags:
                continue
            for mod in eff.spec.modifiers:
                if mod.applies_to(tags):
                    adv += mod.advantage
                    flat += mod.flat
                    reroll = reroll or mod.reroll_worst
        return adv, flat, reroll

    def damage_dice_bonus(self, tags: Iterable[str], opponent_id: str | None = None) -> int:
        tags = set(tags)
        bonus = 0
        for eff in self.active:
            if not eff.relevant_to(opponent_id):
                continue
            for mod in eff.spec.modifiers:
                if mod.damage_dice and mod.applies_to(tags):
                    bonus += mod.damage_dice
        return bonus

    def umbral_for(self, dtype: str) -> int:
        """Most specific threshold wins: exact type, then group, then general."""
        group = DAMAGE_GROUPS.get(dtype)
        base = None
        for key in (dtype, group, "general"):
            if key and key in self.umbrales:
                base = self.umbrales[key]
                break
        if base is None:
            base = self.umbrales.get("general", 2)

        bonus = 0
        for eff in self.active:
            for mod in eff.spec.modifiers:
                if mod.umbral and mod.applies_to({"umbral", dtype, group or "", "all"}):
                    bonus += mod.umbral
        return base + bonus

    # ------------------------------------------------------------- resources
    def exhausted(self, ability: Ability) -> bool:
        """True when the free per-combat uses are spent."""
        return ability.id in self.uses and self.uses[ability.id] <= 0

    def total_chi_cost(self, ability: Ability) -> int:
        """Chi for one activation, including the surcharge once uses run out."""
        cost = ability.chi
        if self.exhausted(ability):
            cost += ability.chi_when_exhausted
        return cost

    def loaded(self, ability: Ability) -> bool:
        """False for a reloading weapon with an empty magazine."""
        return not ability.ammo or self.ammo.get(ability.ammo, 1) > 0

    def can_afford(self, ability: Ability, as_reaction: bool = False) -> bool:
        if not ability.implemented:
            return False
        if not self.loaded(ability):
            return False  # empty: reload first
        if self.total_chi_cost(ability) > self.chi:
            return False
        if self.exhausted(ability) and not ability.chi_when_exhausted:
            return False  # limited uses with no chi fallback
        if ability.bonus_action:
            return True  # costs neither actions nor reactions
        if as_reaction:
            need = max(ability.reactions, ability.actions)
            return self.reactions_left >= need
        if ability.reactions and self.reactions_left < ability.reactions:
            return False
        return self.actions_left >= ability.actions

    def pay(self, ability: Ability, as_reaction: bool = False) -> None:
        self.chi -= self.total_chi_cost(ability)
        if ability.id in self.uses and self.uses[ability.id] > 0:
            self.uses[ability.id] -= 1
        self.used_this_round[ability.id] = self.used_this_round.get(ability.id, 0) + 1
        if ability.ammo and ability.ammo in self.ammo:
            self.ammo[ability.ammo] -= 1  # one shot per attack made with the weapon
        if ability.bonus_action:
            return
        if as_reaction:
            self.reactions_left -= max(ability.reactions, ability.actions)
        else:
            self.actions_left -= ability.actions
            self.reactions_left -= ability.reactions

    def status_line(self) -> str:
        bits = [f"{self.impactos}/{self.max_impactos} imp"]
        if self.wall_absorb:
            bits.append(f"{self.wall_name} -{self.wall_absorb}")
        if self.max_chi:
            bits.append(f"{self.chi}/{self.max_chi} chi")
        if self.shield_counters:
            bits.append(f"{self.shield_counters} escudo")
        conds = [e.name for e in self.active]
        if conds:
            bits.append(", ".join(conds))
        return " | ".join(bits)


def build_combatant(
    spec: dict[str, Any],
    registry: EffectRegistry,
    uid: str,
    side: str,
    name: str | None = None,
) -> Combatant:
    """Instantiate a :class:`Combatant` from a loaded YAML statblock."""
    abilities = {a["id"]: Ability.from_dict(a) for a in POSITIONING_ACTIONS}
    unimplemented = []
    for raw in spec.get("abilities", []):
        ab = Ability.from_dict(raw)
        abilities[ab.id] = ab
        if not ab.implemented:
            unimplemented.append(ab.name)
        unimplemented.extend(u.name for u in ab.upgrades if not u.implemented)

    saves = {k: DicePool.parse(v) for k, v in (spec.get("saves") or {}).items()}
    defense_id = spec.get("defense", "")
    if not defense_id:
        for ab in abilities.values():
            if ab.is_defense:
                defense_id = ab.id
                break

    c = Combatant(
        id=uid,
        name=name or spec.get("name", uid),
        side=side,
        level=int(spec.get("level", 0)),
        max_impactos=int(spec.get("impactos", 6)),
        max_chi=int(spec.get("chi", 0)),
        actions_max=int(spec.get("actions", 3)),
        reactions_max=int(spec.get("reactions", 2)),
        umbrales=dict(spec.get("umbrales") or {"general": 2}),
        saves=saves,
        initiative=DicePool.parse(spec.get("initiative", 0)),
        abilities=abilities,
        ranks={k: int(v) for k, v in (spec.get("ranks") or {}).items()},
        defense_id=defense_id,
        skilled_defense=bool(spec.get("skilled_defense", False)),
        phases=tuple(spec.get("phases") or ()),
        immunities=tuple(spec.get("immunities") or ()),
        statblock_id=spec.get("id", uid),
        faith=spec.get("faith", ""),
        unimplemented=tuple(unimplemented),
    )
    c.start_combat()
    return c
