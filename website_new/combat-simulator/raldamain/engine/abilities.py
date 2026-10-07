"""The ability / effect DSL.

An ability is a cost plus a list of effects.  Effects nest: an ``attack``
carries ``on_hit`` effects, a ``save`` carries ``on_fail`` effects, and so on.

Every effect kind understood by the resolver is listed in :data:`EFFECT_KINDS`.
Anything a statblock cannot express is marked ``implemented: false`` in YAML so
that reports can say *"3 abilities were excluded from the model"* rather than
silently pretending the ability does not exist.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence

from .dice import DicePool

EFFECT_KINDS = {
    "attack",  # opposed roll vs the target's defence
    "damage",  # direct damage, no attack roll
    "save",  # target rolls a saving throw against a DC
    "apply_effect",  # attach a condition/buff
    "self_buff",  # attach a buff to the actor
    "heal",  # restore impactos
    "cleanse",  # remove one condition
    "umbral_boost",  # temporary threshold increase
    "wall",  # flat damage absorption + retaliation (Muro de Fuego/Zarzas/Energía)
    "shield",  # grant Contadores de Escudo
    "grant_advantage",  # hand an ally a Ventaja die for their next roll
    "ally_attack",  # an ally immediately attacks (Grito de Guerra)
    "redirect",  # move an attack onto someone else (Sacrificar Trasgo)
    "intercept",  # step in front of an ally and take the hit (Proteger Aliado)
    "redirect_miss",  # re-aim a failed attack at someone else (Redirigir Ataque)
    "force_reroll",  # make a target reroll and keep the worse result
    "auto_miss",  # the incoming attack simply fails
    "halve_impactos",  # Resiliencia
    "summon",  # bring reinforcements onto the field (Invocación Abisal)
    "change_row",  # step between the front and back rows
    "reload",  # refill a weapon's magazine (``ammo: <group>``)
    "advance",  # push past the enemy front row to reach their back row
    "consecrate",  # contest the battlefield's faith track (Consagrar la Tierra)
    "note",  # flavour only, no mechanics
}

#: Reaches that count as melee.  Everything else (corta, media, larga) can
#: shoot or cast over a front row.
MELEE_REACH = frozenset({"adyacente", "toque"})

AREA_TARGET_COUNT = {
    "self": 1,
    "toque": 1,
    "adyacente": 1,
    "corta": 1,
    "media": 1,
    "larga": 1,
    "cono_pequeno": 2,
    "cono_medio": 3,
    "radio_pequeno": 2,
    "radio_corto": 3,
    "radio_medio": 4,
    "radio_grande": 6,
}


@dataclass
class Effect:
    """One node of the effect tree."""

    kind: str
    raw: dict[str, Any] = field(default_factory=dict)

    # --- attack / damage
    attack_roll: DicePool = field(default_factory=DicePool)
    damage: DicePool | None = None
    dtype: str = "general"
    penetrating: bool = False
    #: Espinas de Madera: "cuenta como Fuerza si impacta a un objetivo
    #: Enredado". The damage type switches when the target carries a condition,
    #: which is what lets a Rank I attack combo off a Rank II control effect.
    dtype_if_effect: str = ""
    dtype_if: str = ""

    def dtype_against(self, target) -> str:
        """The damage type actually applied to ``target``."""
        if self.dtype_if_effect and target is not None:
            if target.has_effect(self.dtype_if_effect):
                return self.dtype_if
        return self.dtype

    # --- saves
    save: str = "fis"  # fis | vol | men
    dc: DicePool = field(default_factory=DicePool)

    # --- effect application
    effect_id: str = ""
    duration: int | None = 1
    to: str = "target"  # target | self | ally | attacker

    # --- numbers
    amount: int = 1

    # --- nesting
    on_hit: list["Effect"] = field(default_factory=list)
    on_miss: list["Effect"] = field(default_factory=list)
    on_fail: list["Effect"] = field(default_factory=list)
    on_success: list["Effect"] = field(default_factory=list)

    text: str = ""

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Effect":
        kind = raw.get("kind", "note")
        if kind not in EFFECT_KINDS:
            raise ValueError(f"unknown effect kind {kind!r}")
        sub = lambda key: [cls.from_dict(e) for e in raw.get(key, [])]  # noqa: E731
        return cls(
            kind=kind,
            raw=raw,
            attack_roll=DicePool.parse(raw.get("attack_roll")),
            damage=DicePool.parse(raw["damage"]) if raw.get("damage") else None,
            dtype=raw.get("dtype", "general"),
            penetrating=bool(raw.get("penetrating", False)),
            dtype_if_effect=(raw.get("dtype_if") or {}).get("effect", ""),
            dtype_if=(raw.get("dtype_if") or {}).get("dtype", ""),
            save=raw.get("save", "fis"),
            dc=DicePool.parse(raw.get("dc")),
            effect_id=raw.get("effect", ""),
            duration=None if raw.get("duration") in (None, "combat") else int(raw.get("duration", 1)),
            to=raw.get("to", "target"),
            amount=int(raw.get("amount", 1)),
            on_hit=sub("on_hit"),
            on_miss=sub("on_miss"),
            on_fail=sub("on_fail"),
            on_success=sub("on_success"),
            text=raw.get("text", ""),
        )


@dataclass
class Upgrade:
    """A chi-cost rider bolted onto an attack (the Bárbaro's *mejoras*)."""

    id: str
    name: str
    chi: int = 1
    damage_dice: int = 0  # extra dice of the attack's base die size
    #: When set, ``damage_dice`` is read as dice *per rank* in this skill
    #: (e.g. Azote Divino: "un dado adicional por cada Rango que recibas")
    #: instead of a flat amount -- see :meth:`effective_damage_dice`.
    scales_with_rank: str = ""
    advantage: int = 0
    extra_attacks: int = 0  # Secuencia de Ataques: a second, unbuffed swing
    #: Widens the attack to an area (Gran Barrido, Ataque Torbellino).  Under
    #: the PA rule "area costs +1 PA", an upgrade that buys BOTH an area and a
    #: damage die must be priced at 2 chi, not 1.
    area: str = ""
    #: Transformación Elemental: swaps the primary damage's type for this use
    #: only, trading Fuerza's blanket group-bypass for a shot at a specific,
    #: potentially lower, elemental umbral.
    dtype: str = ""
    #: Riders sharing a group are mutually exclusive on one swing -- you cannot
    #: sweep a small radius AND a short radius, nor chain two different "make a
    #: second attack" techniques.  Left blank, a group is inferred from what
    #: the rider does (see :meth:`exclusion_group`).
    exclusive_group: str = ""
    on_hit: list[Effect] = field(default_factory=list)
    on_miss: list[Effect] = field(default_factory=list)
    applies_on_parry: bool = False  # fires even if the target parried
    implemented: bool = True
    notes: str = ""

    def effective_damage_dice(self, actor: Any) -> int:
        """``damage_dice``, resolved against the actor's rank if it scales."""
        if self.scales_with_rank:
            return self.damage_dice * actor.ranks.get(self.scales_with_rank, 0)
        return self.damage_dice

    def exclusion_group(self) -> str:
        """Which mutually-exclusive slot this rider occupies, if any.

        Declared groups win; otherwise it is inferred from the rider's own
        payload, so a newly added rider is covered without touching this code:

        ``area``   Gran Barrido / Ataque Torbellino / Ataque Triple all reshape
                   the same swing into an area -- one shape per attack.
        ``chain``  Secuencia de Ataques / Secuencia de Puñaladas are both
                   "make a second attack as a bonus action", and each says in
                   its own text that it cannot be applied more than once.

        A rider that only adds dice or an on-hit rider stacks freely.
        """
        if self.exclusive_group:
            return self.exclusive_group
        if self.area:
            return "area"
        if self.extra_attacks:
            return "chain"
        return ""

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Upgrade":
        return cls(
            id=raw["id"],
            name=raw.get("name", raw["id"]),
            chi=int(raw.get("cost", {}).get("chi", 1)),
            damage_dice=int(raw.get("damage_dice", 0)),
            scales_with_rank=raw.get("scales_with_rank", ""),
            advantage=int(raw.get("advantage", 0)),
            extra_attacks=int(raw.get("extra_attacks", 0)),
            area=raw.get("area", ""),
            dtype=raw.get("dtype", ""),
            exclusive_group=raw.get("exclusive_group", ""),
            on_hit=[Effect.from_dict(e) for e in raw.get("on_hit", [])],
            on_miss=[Effect.from_dict(e) for e in raw.get("on_miss", [])],
            applies_on_parry=bool(raw.get("applies_on_parry", False)),
            implemented=bool(raw.get("implemented", True)),
            notes=raw.get("notes", ""),
        )


@dataclass
class Ability:
    id: str
    name: str
    actions: int = 1
    reactions: int = 0
    chi: int = 0
    uses_per_combat: int | None = None
    targeting: str = "enemy"  # enemy | ally | ally_wounded | self | all_enemies
    reach: str = "adyacente"
    area: str = ""  # e.g. "radio_medio"; empty means single target
    tags: tuple[str, ...] = ()
    roll: DicePool = field(default_factory=DicePool)  # defence pool for Parada/Esquiva
    effects: list[Effect] = field(default_factory=list)
    upgrades: list[Upgrade] = field(default_factory=list)
    is_defense: bool = False  # this is the free Parada/Esquiva roll
    is_reaction: bool = False  # usable out of turn
    trigger: str = ""  # "on_defend" | "on_attacked" | "on_damaged" | ""
    bonus_action: bool = False  # costs no actions and no reactions to activate
    implemented: bool = True
    notes: str = ""

    # --- post-roll interrupts (Instinto de Supervivencia, Milagro Menor)
    is_reroll: bool = False
    reroll_scope: str = "self"  # "self" | "any" (allies and enemies alike)
    reroll_kinds: tuple[str, ...] = ()  # "attack" | "defense" | "save"

    # --- reloading weapons: every use spends a shot from the ``ammo`` magazine
    ammo: str = ""
    ammo_shots: int = 0

    # --- limited-use abilities that keep working for chi once the uses run out
    chi_when_exhausted: int = 0
    #: Drenar Vida: a connecting hit heals the attacker.
    raw_lifesteal: bool = False

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Ability":
        cost = raw.get("cost", {}) or {}
        return cls(
            id=raw["id"],
            name=raw.get("name", raw["id"]),
            actions=int(cost.get("actions", 0)),
            reactions=int(cost.get("reactions", 0)),
            chi=int(cost.get("chi", 0)),
            uses_per_combat=cost.get("uses_per_combat"),
            targeting=raw.get("targeting", "enemy"),
            reach=raw.get("reach", "adyacente"),
            area=raw.get("area", ""),
            tags=tuple(raw.get("tags", [])),
            roll=DicePool.parse(raw.get("roll")),
            effects=[Effect.from_dict(e) for e in raw.get("effects", [])],
            upgrades=[Upgrade.from_dict(u) for u in raw.get("upgrades", [])],
            is_defense=bool(raw.get("is_defense", False)),
            is_reaction=bool(raw.get("is_reaction", False)),
            trigger=raw.get("trigger", ""),
            bonus_action=bool(raw.get("bonus_action", False)),
            implemented=bool(raw.get("implemented", True)),
            notes=raw.get("notes", ""),
            is_reroll=bool(raw.get("is_reroll", False)),
            reroll_scope=raw.get("reroll_scope", "self"),
            reroll_kinds=tuple(raw.get("reroll_kinds", [])),
            chi_when_exhausted=int(cost.get("chi_when_exhausted", 0)),
            raw_lifesteal=bool(raw.get("lifesteal", False)),
            ammo=(raw.get("ammo") or {}).get("group", ""),
            ammo_shots=int((raw.get("ammo") or {}).get("shots", 0)),
        )

    # ------------------------------------------------------------------ query
    @property
    def target_count(self) -> int:
        return self.targets_with()

    def targets_with(self, upgrades: "Sequence[Upgrade]" = ()) -> int:
        """How many targets this ability hits, counting any area upgrades."""
        if self.targeting == "all_enemies":
            return 99
        area = self.area
        for up in upgrades:
            if up.area and AREA_TARGET_COUNT.get(up.area, 1) > AREA_TARGET_COUNT.get(area, 1):
                area = up.area
        return AREA_TARGET_COUNT.get(area, 1) if area else 1

    @property
    def is_melee(self) -> bool:
        """Melee reach cannot skip past a defended front row."""
        return self.reach in MELEE_REACH

    @property
    def is_attack(self) -> bool:
        return any(e.kind == "attack" for e in self.effects)

    @property
    def deals_damage(self) -> bool:
        def walk(effs: list[Effect]) -> bool:
            for e in effs:
                if e.kind == "damage":
                    return True
                if walk(e.on_hit) or walk(e.on_fail) or walk(e.on_success):
                    return True
            return False

        return walk(self.effects)

    def cost_label(self) -> str:
        bits = []
        if self.bonus_action:
            bits.append("bonus")
        if self.actions:
            bits.append(f"{self.actions} acc")
        if self.reactions:
            bits.append(f"{self.reactions} rea")
        if self.chi:
            bits.append(f"{self.chi} chi")
        if self.uses_per_combat:
            bits.append(f"{self.uses_per_combat}/combate")
        if self.chi_when_exhausted:
            bits.append(f"luego {self.chi_when_exhausted} chi")
        return ", ".join(bits) or "gratis"
