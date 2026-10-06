"""Per-character scripted play on top of the greedy scorer.

Greedy alone never presses *Ira*, *Mente Desencadenada* or *Analizar Enemigo*:
those cost an action and deal no damage this turn, so a one-turn-lookahead bot
declines them forever.  A script supplies the opening sequence a real player
would use, and greedy handles everything after that.

Two script slots:

``maintain``  combat-long buffs -- taken once, kept up if they lapse.
``setup``     one-shot riders (*Ataque Poderoso*, *Apuntar Ataque*) that are
              only worth an action when enough actions remain to attack after.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from ..engine.abilities import Ability
from ..engine.entities import Combatant
from ..engine.resolver import CombatState
from .base import Choice
from .greedy import GreedyPolicy


@dataclass
class Maintain:
    ability: str
    effect: str
    target: str = "self"  # "self" | "enemy_threat"


@dataclass
class Setup:
    ability: str
    effect: str
    actions_after: int = 2  # only worth it if this many actions remain


class ScriptedPolicy(GreedyPolicy):
    name = "scripted"

    def __init__(
        self,
        maintain: list[Maintain] | None = None,
        setup: list[Setup] | None = None,
        weights: dict[str, float] | None = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.maintain = maintain or []
        self.setup = setup or []
        self.weights = weights or {}

    # ---------------------------------------------------------------- choice
    def choose_action(self, state: CombatState, actor: Combatant) -> Choice | None:
        enemies = state.enemies_of(actor)
        if not enemies:
            return None

        cheapest_attack = min(
            (a.actions for a in actor.abilities.values() if a.is_attack and a.actions),
            default=1,
        )

        for entry in self.maintain:
            choice = self._maintain_choice(state, actor, entry, enemies, cheapest_attack)
            if choice is not None:
                return choice

        for entry in self.setup:
            ability = actor.abilities.get(entry.ability)
            if ability is None or not actor.can_afford(ability):
                continue
            if actor.has_effect(entry.effect):
                continue
            if actor.actions_left - ability.actions < entry.actions_after:
                continue
            return ability, [actor], []

        return super().choose_action(state, actor)

    def _maintain_choice(
        self,
        state: CombatState,
        actor: Combatant,
        entry: Maintain,
        enemies: list[Combatant],
        cheapest_attack: int,
    ) -> Choice | None:
        # Drop buffs whose bound enemy is already down.
        for eff in list(actor.active):
            if eff.id == entry.effect and eff.against_id:
                if not any(e.id == eff.against_id for e in enemies):
                    actor.active.remove(eff)

        if actor.has_effect(entry.effect):
            return None
        ability = actor.abilities.get(entry.ability)
        if ability is None or not actor.can_afford(ability):
            return None
        # A combat-long buff is worth an action on its own -- a player presses
        # Ira on round one even if an Apertura already ate the rest of the
        # turn. Only bother with the "keep enough to swing" guard when the buff
        # is short enough that a wasted round matters.
        spec = state.registry.get(entry.effect)
        long_lived = spec.duration is None or spec.duration >= 3
        if not long_lived and actor.actions_left - ability.actions < cheapest_attack:
            return None

        if entry.target == "enemy_threat":
            reachable = state.legal_targets(actor, ability) or enemies
            target = max(reachable, key=lambda e: (e.impactos, e.level))
            return ability, [target], []
        return ability, [actor], []

    # --------------------------------------------------------------- scoring
    def score(self, state: CombatState, actor: Combatant, ability: Ability):
        scored = super().score(state, actor, ability)
        if scored is None:
            return None
        value, targets, upgrades = scored
        return value * self.weights.get(ability.id, 1.0), targets, upgrades


# --------------------------------------------------------------------- roster
PolicyFactory = Callable[[], GreedyPolicy]

SCRIPTS: dict[str, PolicyFactory] = {
    # --- players
    "barbaro_2": lambda: ScriptedPolicy(
        maintain=[Maintain("ira", "ira")],
        setup=[Setup("ataque_poderoso", "ataque_poderoso", actions_after=2)],
        hold_reactions=1,  # keep one back for Proteger Aliado / Segundo Aliento
    ),
    "mago_2": lambda: ScriptedPolicy(
        maintain=[Maintain("mente_desencadenada", "mente_desencadenada")],
        weights={"descarga_energia": 1.1},
    ),
    "clerigo_2": lambda: ScriptedPolicy(weights={"halo_luminoso": 1.05}),
    "cazador_2": lambda: ScriptedPolicy(
        maintain=[Maintain("analizar_enemigo", "analizado", target="enemy_threat")],
        setup=[Setup("apuntar_ataque", "apuntado", actions_after=2)],
    ),
    "luchador_2": lambda: ScriptedPolicy(
        maintain=[Maintain("ira", "ira")],
        weights={"espada": 1.1},
    ),
    "paladin_2": lambda: ScriptedPolicy(
        setup=[Setup("ataque_poderoso", "ataque_poderoso", actions_after=2)],
        hold_reactions=1,
    ),
    "monje_2": lambda: ScriptedPolicy(weights={"golpe": 1.1}),
    "druida_2": lambda: ScriptedPolicy(
        maintain=[Maintain("forma_de_la_bestia", "forma_de_la_bestia")],
    ),
    "elementalista_2": lambda: ScriptedPolicy(
        maintain=[Maintain("mente_desencadenada", "mente_desencadenada")],
        weights={"aliento_de_fuego": 1.1},
    ),
    # The Bardo has no attacks at all at this level -- pure control plus
    # Voz del Comandante, which fires from the reaction hooks.
    "bardo_2": lambda: ScriptedPolicy(weights={"distraccion_ilusoria": 1.15}),
    # --- level 5 players
    "barbaro_5": lambda: ScriptedPolicy(
        maintain=[Maintain("ira", "ira_r2")],
        setup=[Setup("ataque_poderoso", "ataque_poderoso", actions_after=2)],
        hold_reactions=1),
    "cazador_5": lambda: ScriptedPolicy(
        maintain=[Maintain("analizar_enemigo", "analizado", target="enemy_threat"),
                  Maintain("forma_de_la_bestia", "forma_de_la_bestia")],
        setup=[Setup("apuntar_ataque", "apuntado", actions_after=2)]),
    "clerigo_5": lambda: ScriptedPolicy(
        # Consagrar first: the ground buff applies to the whole faith and, once
        # channelling, re-contests itself every round for free -- so the two
        # actions are an investment, not a per-round cost.
        maintain=[Maintain("consagrar_la_tierra", "consagrando"),
                  Maintain("canalizacion_celestial", "canalizacion_celestial")],
        weights={"halo_luminoso": 1.05}),
    "mago_5": lambda: ScriptedPolicy(
        maintain=[Maintain("mente_desencadenada", "mente_desencadenada_r2")]),
    "luchador_5": lambda: ScriptedPolicy(
        maintain=[Maintain("ira", "ira")], weights={"espada": 1.1}),
    "monje_5": lambda: ScriptedPolicy(
        maintain=[Maintain("guerrero_de_la_fe", "guerrero_de_la_fe")],
        weights={"golpe": 1.1}),
    "paladin_5": lambda: ScriptedPolicy(
        maintain=[Maintain("guerrero_de_la_fe", "guerrero_de_la_fe")],
        setup=[Setup("ataque_poderoso", "ataque_poderoso", actions_after=2)],
        hold_reactions=1),
    "bardo_5": lambda: ScriptedPolicy(
        maintain=[Maintain("mente_desencadenada", "mente_desencadenada")]),
    "druida_5": lambda: ScriptedPolicy(
        # Forma de la Bestia grants no damage die, so Analizar Enemigo is the
        # Druida's only way to reach a high-umbral target at all.
        maintain=[Maintain("consagrar_la_tierra", "consagrando"),
                  Maintain("analizar_enemigo", "analizado", target="enemy_threat"),
                  Maintain("forma_de_la_bestia", "forma_de_la_bestia")]),
    "elementalista_5": lambda: ScriptedPolicy(
        maintain=[Maintain("mente_desencadenada", "mente_desencadenada")],
        weights={"bola_de_fuego": 1.1}),
    # --- goblins
    "trasgo": lambda: GreedyPolicy(),
    "perro_trasgo": lambda: GreedyPolicy(),
    "trasgo_cantor": lambda: ScriptedPolicy(
        weights={"grito_de_guerra": 1.25, "revigorar": 1.1}
    ),
    "trasgo_comando": lambda: GreedyPolicy(hold_reactions=0),
    "trasgo_chaman": lambda: ScriptedPolicy(weights={"pulso_de_vida": 1.1}),
    "trasgo_jefe": lambda: ScriptedPolicy(
        weights={"secuencia_de_ataques": 1.1, "grito_de_guerra": 1.15},
        hold_reactions=1,
    ),
    "osgo": lambda: ScriptedPolicy(weights={"furia_asesina": 1.1}),
    # --- abisales
    "engendro_abisal": lambda: GreedyPolicy(),
    "fanatico_abisal": lambda: ScriptedPolicy(
        maintain=[Maintain("consagrar_la_tierra", "consagrando")],
        weights={"invocacion_abisal": 1.3, "miasma_abisal": 1.1}
    ),
    "guerrero_abisal": lambda: ScriptedPolicy(
        weights={"secuencia_de_ataques": 1.15}, hold_reactions=1
    ),
    # --- design templates
    "plantilla_equilibrada": lambda: ScriptedPolicy(weights={"secuencia": 1.1}),
    "plantilla_antimarcial": lambda: ScriptedPolicy(weights={"secuencia": 1.1}),
    "plantilla_antilanzador": lambda: ScriptedPolicy(weights={"secuencia": 1.1}),
    # --- aventureros rivales
    "espia": lambda: ScriptedPolicy(
        setup=[Setup("presionar_defensas", "apuntado", actions_after=2)],
        weights={"secuencia_de_ataques": 1.1},
    ),
    "mago_aprendiz": lambda: ScriptedPolicy(weights={"descarga_energia": 1.05}),
    "veterano": lambda: ScriptedPolicy(
        setup=[Setup("ataque_poderoso", "ataque_poderoso", actions_after=2)],
        hold_reactions=1,
    ),
    "mago_aprendiz_elite": lambda: GreedyPolicy(),
    "veterano_elite": lambda: GreedyPolicy(),
    "campeon_abisal": lambda: ScriptedPolicy(
        weights={"invocacion_abisal": 1.2, "ataque_torbellino": 1.1},
        hold_reactions=1,
    ),
    # --- sectarios
    "asesino_sacro": lambda: ScriptedPolicy(
        # Claims the ground early so a Celestial party has to spend rounds
        # breaking it back to neutral before they can consecrate their own.
        maintain=[Maintain("consagrar_la_tierra", "consagrando")],
        hold_reactions=1,
    ),
}


def policy_for(statblock_id: str, override: str | None = None) -> GreedyPolicy:
    if override == "greedy":
        return GreedyPolicy()
    if override == "greedy_spread":
        return GreedyPolicy(focus_fire=False)
    if override == "cautious":
        return GreedyPolicy(hold_reactions=1)
    factory = SCRIPTS.get(statblock_id)
    return factory() if factory else GreedyPolicy()
