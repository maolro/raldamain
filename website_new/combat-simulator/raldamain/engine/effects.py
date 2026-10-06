"""Status effects and buffs.

Conditions (*Miedo*, *Herido*, *Desconcertado*...) and self-buffs (*Ira*,
*Analizar Enemigo*...) share the same machinery: both attach an
:class:`ActiveEffect` to a combatant that contributes modifiers to rolls,
umbrales and damage.

Modifiers are matched to rolls by **tag**.  A roll carries a set of tags such
as ``{"attack", "physical", "weapon"}`` and a modifier with scope
``"physical"`` applies to it.  The scope ``"all"`` matches everything.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable


@dataclass(frozen=True)
class Modifier:
    """One contribution an effect makes to rolls, umbrales or damage."""

    scope: str = "all"
    advantage: int = 0  # extra (or, if negative, subtracted) d6
    flat: int = 0  # flat bonus to the roll
    umbral: int = 0  # bonus to damage thresholds
    damage_dice: int = 0  # extra dice of the attack's base die size
    reroll_worst: bool = False  # forced to roll twice and keep the worse result

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Modifier":
        return cls(
            scope=raw.get("scope", "all"),
            advantage=int(raw.get("advantage", 0)),
            flat=int(raw.get("flat", 0)),
            umbral=int(raw.get("umbral", 0)),
            damage_dice=int(raw.get("damage_dice", 0)),
            reroll_worst=bool(raw.get("reroll_worst", False)),
        )

    def applies_to(self, tags: Iterable[str]) -> bool:
        return self.scope == "all" or self.scope in set(tags)


@dataclass(frozen=True)
class EffectSpec:
    """The definition of a condition or buff."""

    id: str
    name: str
    kind: str = "condition"  # "condition" | "buff"
    duration: int | None = 1  # rounds; None = until end of combat
    modifiers: tuple[Modifier, ...] = ()
    tags: tuple[str, ...] = ()
    lose_actions: int = 0  # actions stripped at the start of each turn
    incapacitates: bool = False
    #: Status ladder.  Conditions in the same family escalate instead of
    #: stacking: applying Desconcertado to someone already Desconcertado I
    #: promotes them to Desconcertado II, with a correspondingly harsher
    #: penalty.  The rules already name Herido II, Miedo II-IV and Fatiga II.
    family: str = ""
    level: int = 1
    #: Buffs sharing a stack_group are the same "kind" of blessing from the
    #: character's point of view -- Consagrar la Tierra's terrain buff and
    #: Guerrero de la Fe's personal invocation are both "your god empowers
    #: you", so a paladin standing on consecrated ground gets nothing extra
    #: for also paying Guerrero de la Fe's cost, and vice versa.  Unlike
    #: `family`, this is not an escalating ladder: only ONE member of the
    #: group is ever active, whichever grants more (see
    #: Combatant.add_effect), and a tie keeps whichever got there first.
    stack_group: str = ""
    assumed: bool = False  # True = the sim invented this reading of the rule
    notes: str = ""

    @property
    def strength(self) -> tuple[int, int]:
        """(Ventaja, umbral) across every modifier line -- compares two
        same-stack_group buffs to pick a winner.  Ventaja is the primary axis
        (it's what these buffs are chiefly for); umbral only breaks a tie, so
        Canalización Celestial (Rango II)'s extra +3 umbral wins it a contest
        against Consagrar la Tierra even though both grant the same 1 Ventaja."""
        return (
            sum(m.advantage for m in self.modifiers),
            sum(m.umbral for m in self.modifiers),
        )

    @classmethod
    def from_dict(cls, eid: str, raw: dict[str, Any]) -> "EffectSpec":
        duration = raw.get("duration", 1)
        return cls(
            id=eid,
            name=raw.get("name", eid),
            kind=raw.get("kind", "condition"),
            duration=None if duration in (None, "combat") else int(duration),
            modifiers=tuple(Modifier.from_dict(m) for m in raw.get("modifiers", [])),
            tags=tuple(raw.get("tags", [])),
            lose_actions=int(raw.get("lose_actions", 0)),
            incapacitates=bool(raw.get("incapacitates", False)),
            family=raw.get("family", ""),
            level=int(raw.get("level", 1)),
            stack_group=raw.get("stack_group", ""),
            assumed=bool(raw.get("assumed", False)),
            notes=raw.get("notes", ""),
        )


@dataclass
class ActiveEffect:
    """An :class:`EffectSpec` currently attached to a combatant."""

    spec: EffectSpec
    rounds_left: int | None
    source_id: str | None = None
    against_id: str | None = None  # buff that only applies versus one enemy
    payload: dict[str, Any] = field(default_factory=dict)

    @property
    def id(self) -> str:
        return self.spec.id

    @property
    def name(self) -> str:
        return self.spec.name

    def expired(self) -> bool:
        return self.rounds_left is not None and self.rounds_left <= 0

    def tick(self) -> None:
        if self.rounds_left is not None:
            self.rounds_left -= 1

    def relevant_to(self, opponent_id: str | None) -> bool:
        """Buffs bound to a specific enemy only fire against that enemy."""
        return self.against_id is None or self.against_id == opponent_id


class EffectRegistry:
    """Lookup table of every known condition/buff."""

    def __init__(self, specs: dict[str, EffectSpec] | None = None):
        self.specs: dict[str, EffectSpec] = dict(specs or {})

    def add(self, spec: EffectSpec) -> None:
        self.specs[spec.id] = spec

    def get(self, eid: str) -> EffectSpec:
        if eid not in self.specs:
            # Unknown effects still get tracked so logs never lie about them,
            # they simply carry no mechanical weight.
            self.specs[eid] = EffectSpec(
                id=eid,
                name=eid.replace("_", " ").title(),
                assumed=True,
                notes="not defined in conditions.yaml - no mechanical effect applied",
            )
        return self.specs[eid]

    def instantiate(
        self,
        eid: str,
        source_id: str | None = None,
        duration: int | None = "unset",  # type: ignore[assignment]
        against_id: str | None = None,
    ) -> ActiveEffect:
        spec = self.get(eid)
        rounds = spec.duration if duration == "unset" else duration
        return ActiveEffect(spec, rounds, source_id, against_id)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "EffectRegistry":
        return cls({k: EffectSpec.from_dict(k, v or {}) for k, v in raw.items()})

    def next_level(self, family: str, level: int) -> EffectSpec | None:
        """The next rung of a status ladder, or None if already at the top."""
        if not family:
            return None
        candidates = [
            sp
            for sp in self.specs.values()
            if sp.family == family and sp.level == level + 1
        ]
        return candidates[0] if candidates else None

    def top_level(self, family: str) -> int:
        return max(
            (sp.level for sp in self.specs.values() if sp.family == family),
            default=1,
        )

    def assumed_ids(self) -> list[str]:
        return sorted(s.id for s in self.specs.values() if s.assumed)
