"""Dice expressions for the Raldamain System.

Expressions look like ``"2d6+1d6+4"`` or ``"7+2d6"`` or ``"1d4+4"``.
Whitespace is ignored. Terms may be negative (``"2d6-1"``).

The system's core randomiser is the d6: *Ventaja* adds a d6 to a roll and
*Desventaja* subtracts one, so advantage is tracked as a signed integer
count of d6 rather than as a boolean.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable

_TERM = re.compile(r"([+-]?)\s*(?:(\d*)d(\d+)|(\d+))", re.IGNORECASE)

#: Every contested roll -- attack, defence, saving throw, save DC and
#: initiative -- is ``1d20 + modifier + any extra dice``.  Statblocks record
#: only the ``modifier + extra dice`` part, so the engine supplies the d20.
D20_EXPR = "1d20"


@dataclass(frozen=True)
class DicePool:
    """An immutable ``NdX + NdY + flat`` expression."""

    dice: tuple[tuple[int, int], ...] = ()  # (count, sides), count may be negative
    flat: int = 0

    # ---------------------------------------------------------------- parsing
    @classmethod
    def parse(cls, expr: str | int | None) -> "DicePool":
        if expr is None:
            return cls()
        if isinstance(expr, int):
            return cls(flat=expr)
        text = str(expr).replace(" ", "")
        if not text:
            return cls()
        dice: list[tuple[int, int]] = []
        flat = 0
        consumed = 0
        for m in _TERM.finditer(text):
            consumed += len(m.group(0))
            sign = -1 if m.group(1) == "-" else 1
            if m.group(3):  # NdX
                count = int(m.group(2)) if m.group(2) else 1
                dice.append((sign * count, int(m.group(3))))
            else:  # flat
                flat += sign * int(m.group(4))
        if consumed != len(text):
            raise ValueError(f"cannot parse dice expression: {expr!r}")
        return cls(tuple(dice), flat)

    # ------------------------------------------------------------- arithmetic
    def __add__(self, other: "DicePool") -> "DicePool":
        return DicePool(self.dice + other.dice, self.flat + other.flat)

    def with_dice(self, count: int, sides: int) -> "DicePool":
        """Return a copy with ``count`` extra dice of ``sides`` added."""
        if count == 0:
            return self
        return DicePool(self.dice + ((count, sides),), self.flat)

    @property
    def largest_die(self) -> int:
        """Biggest die size in the pool -- the 'base die' for +1 die effects."""
        return max((sides for _, sides in self.dice), default=6)

    @property
    def average(self) -> float:
        total = float(self.flat)
        for count, sides in self.dice:
            total += count * (sides + 1) / 2
        return total

    @property
    def minimum(self) -> int:
        return self.flat + sum(c * (1 if c > 0 else sides) for c, sides in self.dice)

    @property
    def maximum(self) -> int:
        return self.flat + sum(c * (sides if c > 0 else 1) for c, sides in self.dice)

    def __str__(self) -> str:
        parts: list[str] = []
        for count, sides in self.dice:
            sign = "+" if count > 0 and parts else ("-" if count < 0 else "")
            parts.append(f"{sign}{abs(count)}d{sides}")
        if self.flat or not parts:
            sign = "+" if self.flat >= 0 and parts else ("-" if self.flat < 0 else "")
            parts.append(f"{sign}{abs(self.flat)}")
        return "".join(parts) or "0"


@dataclass
class RollResult:
    """The outcome of one roll, kept verbose so logs can explain themselves."""

    total: int
    pool: DicePool
    rolls: list[tuple[int, int]] = field(default_factory=list)  # (sides, face)
    advantage: int = 0
    label: str = ""

    @property
    def natural_20(self) -> bool:
        """True when the contested d20 came up 20 -- a critical hit."""
        return any(sides == 20 and face == 20 for sides, face in self.rolls)

    def breakdown(self) -> str:
        faces = "+".join(str(face) for _, face in self.rolls)
        base = f"[{faces}]" if faces else ""
        flat = self.pool.flat
        if base and flat:
            return f"{self.total} ({flat}{base and '+'}{base})"
        if base:
            return f"{self.total} ({base})"
        return f"{self.total}"

    def __str__(self) -> str:
        adv = ""
        if self.advantage > 0:
            adv = f" ventaja x{self.advantage}" if self.advantage > 1 else " ventaja"
        elif self.advantage < 0:
            n = -self.advantage
            adv = f" desventaja x{n}" if n > 1 else " desventaja"
        return f"{self.breakdown()}{adv}"


class Roller:
    """Seeded dice roller. Every simulation owns exactly one."""

    def __init__(self, rng):
        self.rng = rng
        self.count = 0

    def roll(
        self,
        pool: DicePool | str,
        advantage: int = 0,
        label: str = "",
        adv_die: int = 6,
    ) -> RollResult:
        """Roll ``pool``; ``advantage`` adds (or, if negative, subtracts) d6."""
        if not isinstance(pool, DicePool):
            pool = DicePool.parse(pool)
        effective = pool
        if advantage:
            effective = effective.with_dice(advantage, adv_die)

        total = effective.flat
        rolls: list[tuple[int, int]] = []
        for count, sides in effective.dice:
            sign = 1 if count > 0 else -1
            for _ in range(abs(count)):
                face = self.rng.randint(1, sides)
                self.count += 1
                rolls.append((sides, sign * face))
                total += sign * face
        return RollResult(total, pool, rolls, advantage, label)

    def sample_total(self, pool: DicePool, advantage: int = 0, adv_die: int = 6) -> int:
        return self.roll(pool, advantage, adv_die=adv_die).total

    def choice(self, seq: Iterable):
        seq = list(seq)
        return seq[self.rng.randrange(len(seq))]
