"""The round loop.

`base-info.md` says a round opens with an initiative roll and ends "cuando a
todos los personajes involucrados se les acaben las acciones".  That leaves one
genuine ambiguity, exposed here as ``turn_structure``:

``full_turn``  each combatant spends their whole action pool on their turn
               (the conventional reading, and the default);
``cycle``      combatants take one ability each in initiative order, looping
               until every pool is empty (a more interleaved, "shonen" reading).

Run the same encounter both ways to see how much the choice matters.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any

from .dice import Roller
from .effects import EffectRegistry
from .entities import Combatant
from .log import CombatLog
from .resolver import CombatState, Resolver

DEFAULT_CONFIG: dict[str, Any] = {
    "turn_structure": "full_turn",  # "full_turn" | "cycle"
    "initiative_per_round": True,
    "max_rounds": 30,
    # Front/back rows: melee cannot reach a back row while its front row lives.
    "positioning": True,
    # How many Aperturas may chain off one another: a counterattack that misses
    # does not itself provoke. Set to None for the unlimited rules-as-written
    # behaviour, which nests up to six deep.
    "max_opening_chain": 1,
}


@dataclass
class EncounterResult:
    winner: str | None
    rounds: int
    seed: int
    log: CombatLog
    survivors: dict[str, list[str]] = field(default_factory=dict)
    impactos_left: dict[str, int] = field(default_factory=dict)
    config: dict[str, Any] = field(default_factory=dict)

    @property
    def draw(self) -> bool:
        return self.winner is None


class Encounter:
    def __init__(
        self,
        combatants: list[Combatant],
        registry: EffectRegistry,
        seed: int = 0,
        config: dict[str, Any] | None = None,
        echo: bool = False,
        summon_factory: Any = None,
    ):
        cfg = {**DEFAULT_CONFIG, **(config or {})}
        if summon_factory is None:
            # Lazy import: the loader owns policy assignment, and importing it
            # at module scope would be circular.
            from ..data.loader import summon_factory as _factory

            summon_factory = _factory(registry)
        rng = random.Random(seed)
        log = CombatLog(seed=seed, echo=echo)
        self.state = CombatState(
            combatants=combatants,
            roller=Roller(rng),
            log=log,
            registry=registry,
            config=cfg,
            summon_factory=summon_factory,
        )
        self.resolver = Resolver(self.state)
        self.config = cfg
        self.seed = seed
        for c in combatants:
            c.start_combat()

    # ------------------------------------------------------------------- run
    def run(self) -> EncounterResult:
        state, log = self.state, self.state.log
        self._log_roster()

        order: list[Combatant] = []
        winner: str | None = None
        rnd = 0

        while rnd < self.config["max_rounds"]:
            rnd += 1
            state.round = rnd
            log.round = rnd
            log.header(f"RONDA {rnd}")

            for c in state.living():
                c.refresh_round()

            # Terrain control resolves before anyone acts, so the round is
            # fought on whichever god's ground the contest just settled on.
            self.resolver.contest_consecration()

            if not order or self.config["initiative_per_round"]:
                order = self._roll_initiative()

            self._take_round(order)

            for c in state.combatants:
                if c.alive:
                    for name in c.tick_effects():
                        log.line(f"{c.name}: termina {name}", 1)
                    gone = c.tick_wall()
                    if gone:
                        log.line(f"{c.name}: se desvanece {gone}", 1)

            winner = self._check_winner()
            if winner is not None:
                break

        return self._finish(winner, rnd)

    # --------------------------------------------------------------- helpers
    def _log_roster(self) -> None:
        log = self.state.log
        log.header("COMBATIENTES")
        for side in sorted({c.side for c in self.state.combatants}):
            log.line(f"[{side}]")
            for row in ("front", "back"):
                members = [
                    c for c in self.state.combatants if c.side == side and c.row == row
                ]
                if not members:
                    continue
                log.line(f"[{'vanguardia' if row == 'front' else 'retaguardia'}]", 1)
                for c in members:
                    log.line(
                        f"{c.name}: {c.max_impactos} imp, {c.actions_max} acc, "
                        f"{c.reactions_max} rea, umbrales {c.umbrales}",
                        2,
                    )
        skipped = sorted(
            {name for c in self.state.combatants for name in c.unimplemented}
        )
        if skipped:
            log.line()
            log.line(f"Habilidades no modeladas ({len(skipped)}): {', '.join(skipped)}")

    def _roll_initiative(self) -> list[Combatant]:
        """1d20 + the combatant's initiative modifier, rerolled every round.

        The d20 is supplied by ``Resolver.roll_for`` for every contested roll.
        """
        rolls: list[tuple[int, int, Combatant]] = []
        for c in self.state.living():
            # Initiative is DES-based, so physical buffs (Ira, Forma de la
            # Bestia) apply to it.
            r = self.resolver.roll_for(
                c, c.initiative, ("initiative", "physical")
            )
            rolls.append((r.total, self.state.roller.rng.random(), c))  # type: ignore[arg-type]
        rolls.sort(key=lambda t: (-t[0], t[1]))
        order = [c for _, _, c in rolls]
        self.state.log.line(
            "Iniciativa: "
            + ", ".join(f"{c.name} ({total})" for total, _, c in rolls)
        )
        return order

    def _take_round(self, order: list[Combatant]) -> None:
        if self.config["turn_structure"] == "cycle":
            self._cycle_round(order)
        else:
            for c in order:
                if not c.alive:
                    continue
                if self._combat_over():
                    return
                self._take_turn(c, full=True)

    def _take_turn(self, c: Combatant, full: bool) -> bool:
        """Spend actions. Returns True if the combatant did anything."""
        log = self.state.log
        if c.incapacitated():
            log.line(f"{c.name} está incapacitado y pierde su turno.")
            return False
        acted = False
        while c.alive and c.actions_left > 0 and not self._combat_over():
            choice = c.policy.choose_action(self.state, c)
            if choice is None:
                if not acted:
                    log.line(f"{c.name} no hace nada ({c.actions_left} acc sobrantes).")
                    self.state.log.event("idle", actor=c.id, actions=c.actions_left)
                c.actions_left = 0
                break
            ability, targets, upgrades = choice
            self.resolver.use_ability(c, ability, targets, upgrades)
            acted = True
            if not full:
                break
        return acted

    def _cycle_round(self, order: list[Combatant]) -> None:
        while not self._combat_over():
            progressed = False
            for c in order:
                if not c.alive or c.actions_left <= 0:
                    continue
                if self._combat_over():
                    return
                if self._take_turn(c, full=False):
                    progressed = True
            if not progressed:
                return

    def _combat_over(self) -> bool:
        return len(self.state.sides()) <= 1

    def _check_winner(self) -> str | None:
        sides = self.state.sides()
        if len(sides) == 1:
            return next(iter(sides))
        if not sides:
            return "draw"
        return None

    def _finish(self, winner: str | None, rounds: int) -> EncounterResult:
        log = self.state.log
        log.header("RESULTADO")
        if winner in (None, "draw"):
            log.line(f"Sin vencedor tras {rounds} rondas.")
        else:
            log.line(f"Vence el bando '{winner}' en {rounds} rondas.")
        survivors: dict[str, list[str]] = {}
        impactos: dict[str, int] = {}
        for c in self.state.combatants:
            survivors.setdefault(c.side, [])
            impactos[c.side] = impactos.get(c.side, 0) + max(0, c.impactos)
            if c.alive:
                survivors[c.side].append(f"{c.name} ({c.status_line()})")
        for side, names in survivors.items():
            log.line(f"{side}: {', '.join(names) if names else 'aniquilado'}")
        log.event("result", winner=winner, rounds=rounds)
        return EncounterResult(
            winner=None if winner in (None, "draw") else winner,
            rounds=rounds,
            seed=self.seed,
            log=log,
            survivors=survivors,
            impactos_left=impactos,
            config=self.config,
        )
