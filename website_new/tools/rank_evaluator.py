#!/usr/bin/env python3
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
Raldamain Rank Build Evaluator
===============================
Evaluates character builds, validates rank progressions, calculates resource pools,
identifies combos, and flags balance concerns.

Usage:
    python rank_evaluator.py                          # Interactive mode
    python rank_evaluator.py --build build.json       # Evaluate a build file
    python rank_evaluator.py --list                   # List all available ranks
    python rank_evaluator.py --rank magia_fuego       # Show rank details
    python rank_evaluator.py --combos                 # Show all known problematic combos
"""

import json
import os
import sys
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# ─── Constants ───────────────────────────────────────────────────────────────

RANKS_DIR = Path(__file__).parent.parent / "data" / "ranks"

RANK_UNLOCK_LEVELS = {
    "I": 1,
    "II": 4,
    "III": 7,
    "IV": 10,
    "V": 13,
    "VI": 16,
}

STAT_CAPS = {
    1: 3, 2: 4, 3: 4, 4: 4, 5: 4,
    6: 5, 7: 5, 8: 5,
    9: 6, 10: 6, 11: 6,
    12: 7, 13: 7, 14: 7,
    15: 8, 16: 8, 17: 8,
    18: 9, 19: 9, 20: 9,
}

MAX_RANKS_PER_CHARACTER = 5
BASE_ACTIONS = 3
BASE_REACTIONS = 2
BASE_STATS_ARRAY = [3, 2, 2, 2, 1, 1]

STATS = ["FUE", "DES", "CON", "INT", "SAB", "CAR"]

# Resource type mapping per rank
RESOURCE_TYPE = {
    "estilo_asesino": "chi",
    "estilo_coloso": "vigor",
    "estilo_duelista": "vigor",
    "fortitud": "vigor",
    "ira": "vigor",
    "reflejos": "chi",
    "mente_desencadenada": "chi",
    "rastrear": "vigor",
    "guerrero_divino": "both",
    "magia_agua": "chi",
    "magia_aire": "chi",
    "magia_divina": "chi",
    "magia_espacial": "chi",
    "magia_evocacion": "chi",
    "magia_fuego": "chi",
    "magia_gravitatoria": "chi",
    "magia_hielo": "chi",
    "magia_ilusoria": "chi",
    "magia_mental": "chi",
    "magia_protectora": "chi",
    "magia_sombria": "chi",
    "magia_temporal": "chi",
    "magia_tierra": "chi",
    "magia_tormenta": "chi",
    "magia_vida": "chi",
    "nigromancia": "chi",
    "ascendencia_abisal": "chi_x2",
    "ascendencia_akhasica": "both",
    "ascendencia_celestial": "chi_x2",
    "ascendencia_infernal": "both",
    "ascendencia_primigenia": "chi_x2",
}

# ─── Known Problematic Combos ───────────────────────────────────────────────

KNOWN_COMBOS = [
    {
        "name": "Economía de Acciones Infinita",
        "severity": "CRITICO",
        "ranks": ["reflejos", "mente_desencadenada"],
        "min_rank": "V",
        "description": (
            "Reflejos V (Reflejos Supremos) + Mente Desencadenada V (División Mental) "
            "otorgan cada uno un turno completo adicional (3 acciones). Combinado con "
            "Velocidad Superior (Reflejos I, +1 acción), un personaje tiene 10 acciones/ronda. "
            "Esto trivializa cualquier encuentro."
        ),
        "solution": (
            "Las acciones adicionales de diferentes fuentes no deberían acumularse. "
            "Limitar a un máximo de 1 turno adicional por ronda de cualquier fuente. "
            "Alternativamente, que Reflejos Supremos y División Mental sean mutuamente excluyentes."
        ),
    },
    {
        "name": "Tanque Inmortal",
        "severity": "CRITICO",
        "ranks": ["ira", "fortitud"],
        "min_rank": "V",
        "description": (
            "Ira V (Furia Invulnerable: luchar sin penalizadores a PV negativos) + "
            "Fortitud V (Una Última Resistencia: recuperar toda la Vitalidad y mitad de PV al caer a 0) + "
            "Fortitud III (Hasta la Muerte: luchar a 0 PV) + "
            "Ira II (Resistencia Salvaje: reducir TODO el daño por Rango). "
            "El personaje es prácticamente inmortal."
        ),
        "solution": (
            "Furia Invulnerable y Hasta la Muerte no deberían acumularse (elegir uno). "
            "Resistencia Salvaje debería tener un límite de usos/ronda o solo aplicar a daño físico. "
            "Una Última Resistencia debería imponer un estado de Exhausto al usarse."
        ),
    },
    {
        "name": "Espiral de Muerte por Nigromancia",
        "severity": "ALTO",
        "ranks": ["nigromancia"],
        "min_rank": "IV",
        "description": (
            "Enervación (Nigromancia IV) impide TODA sanación y empeora progresivamente "
            "(Fatiga -> Exhausto -> Control Mental -> Muerte/Zombi). Combinado con "
            "Maldición Vampírica (II) que cura al nigromante con cada golpe necrótico, "
            "y Alma Corrompida (V) que convierte daño necrótico en curación propia. "
            "El nigromante se cura mientras el objetivo no puede curarse. Espiral sin escape."
        ),
        "solution": (
            "Enervación debería tener una progresión más lenta (requiere daño necrótico "
            "para avanzar, no solo tiempo). Permitir que Sanación Superior (Vida III) "
            "o equivalente pueda eliminar Enervación. Limitar Maldición Vampírica a "
            "una cantidad de curación/ronda."
        ),
    },
    {
        "name": "Ejército de Invocaciones",
        "severity": "ALTO",
        "ranks": ["nigromancia", "ascendencia_infernal"],
        "min_rank": "IV",
        "description": (
            "Nigromancia II (Animar No-muerto: Rango x 3 zombis) + "
            "Nigromancia IV (Crear No-muerto Superior: 1/Rango) + "
            "Ascendencia Infernal III (Siervos del Contrato: max 4) + "
            "Cualquier magia elemental con invocación. "
            "Un personaje puede tener 15+ zombis, 5 no-muertos superiores, "
            "4 demonios y un elemental = 25+ criaturas en combate."
        ),
        "solution": (
            "Imponer un límite GLOBAL de invocaciones simultáneas (ej: Nivel/2, max 8). "
            "Las diferentes fuentes de invocación comparten el mismo límite. "
            "Alternativamente, cada invocación adicional reduce los stats del invocador."
        ),
    },
    {
        "name": "Acechar + Asesino = Asesinato Garantizado",
        "severity": "ALTO",
        "ranks": ["rastrear", "estilo_asesino"],
        "min_rank": "IV",
        "description": (
            "Rastrear I (Analizar Enemigo: Ventaja permanente) + "
            "Rastrear V (Enemigo Juramentado: Ventaja total + 1d6 + crítico cada impacto) + "
            "Asesino IV (Furia Asesina: 3 ataques, 1 defensa, + herida cada uno) + "
            "Asesino IV (Maestría de Arma: Ventaja + dado extra + herida). "
            "Combinados dan Ventaja total, 3 ataques con una defensa, cada uno con "
            "múltiples dados de daño extra, heridas y efectos críticos."
        ),
        "solution": (
            "Enemigo Juramentado no debería apilar con Analizar Enemigo (reemplaza). "
            "Furia Asesina y Maestría de Arma no deberían ser activas simultáneamente "
            "(ambas son Duraderas, requerirían 2 concentraciones). Limitar impactos "
            "de herida a 1/turno para evitar cascadas de heridas."
        ),
    },
    {
        "name": "Temporal + Combate = Sin Contrapartida",
        "severity": "ALTO",
        "ranks": ["magia_temporal"],
        "min_rank": "V",
        "description": (
            "Visión Futura (V): Ventaja en TODOS los tiros durante 6 rondas. "
            "Revertir el Tiempo (IV): Guardar estado y volver si las cosas salen mal. "
            "Parar el Tiempo (V): Turno extra mientras todo está paralizado. "
            "Dobles Temporales (III): Sacrificar dobles para anular ataques. "
            "Predecir Movimiento (III): Éxito automático defensivo. "
            "Un mago temporal a Rango V es prácticamente invencible."
        ),
        "solution": (
            "Visión Futura debería ser concentración (se pierde al recibir daño grave). "
            "Revertir el Tiempo debería costar 3+ chi y tener cooldown (1/combate). "
            "Predecir Movimiento debería tener un máximo de usos por combate, no por ronda. "
            "Limitar Premoniciones a 1/ronda en lugar de acumulables."
        ),
    },
    {
        "name": "Ira + Acción Extra = Berserker Nuclear",
        "severity": "ALTO",
        "ranks": ["ira", "reflejos"],
        "min_rank": "IV",
        "description": (
            "Ira I (Ventaja en ataques + 1d6 daño) + "
            "Ira IV (Golpe de Adrenalina: +1 acción/turno) + "
            "Reflejos I (Velocidad Superior: +1 acción/turno) + "
            "Ira V (Superar los Límites: Stats a 12, DEF +5). "
            "5 acciones por turno con Ventaja y +1d6 daño en cada ataque."
        ),
        "solution": (
            "Golpe de Adrenalina y Velocidad Superior deberían ser mutuamente excluyentes "
            "o limitar acciones de ataque adicionales a 1/turno. "
            "Superar los Límites debería tener un coste por turno, no solo al activar."
        ),
    },
    {
        "name": "Guerrero Divino: Buffer Absoluto del Grupo",
        "severity": "MEDIO",
        "ranks": ["guerrero_divino"],
        "min_rank": "IV",
        "description": (
            "Hueste Divina (IV): TODOS los aliados reciben Ventaja en ataque y defensa. "
            "Presencia Divina (III): Enemigos con Miedo, aliados con Resistencia Mental. "
            "Plegaria de Batalla (II): 3 usos de Milagro Menor a cada aliado. "
            "Un solo Guerrero Divino convierte a todo el grupo en una máquina de matar."
        ),
        "solution": (
            "Hueste Divina debería dar un bonus más moderado (+2 en lugar de Ventaja) "
            "o afectar solo a un aliado a la vez. Plegaria de Batalla debería dar 1 uso, "
            "no 3. Presencia Divina debería requerir línea de visión a los aliados."
        ),
    },
    {
        "name": "Cadenas del Contrato + Invocaciones = Daño Infinito Absorbido",
        "severity": "MEDIO",
        "ranks": ["ascendencia_infernal"],
        "min_rank": "IV",
        "description": (
            "Cadenas del Contrato (IV): Transferir CUALQUIER cantidad de daño a vinculados. "
            "Siervos del Contrato (III): Invocar demonios con muchos PV. "
            "El personaje nunca recibe daño real; lo transfiere todo a invocaciones "
            "desechables que puede re-invocar."
        ),
        "solution": (
            "Cadenas del Contrato debería limitar la transferencia (max 50% del daño) "
            "o no funcionar con invocaciones propias. La criatura vinculada debería "
            "poder romper el vínculo si recibe demasiado daño."
        ),
    },
    {
        "name": "Portal Espiritual: Acciones Gratis en Otro Plano",
        "severity": "MEDIO",
        "ranks": ["ascendencia_primigenia"],
        "min_rank": "V",
        "description": (
            "Portal Espiritual (V): En el plano espiritual tienes +3 acciones extra "
            "(dilatación temporal). Si puedes entrar y salir como acción, "
            "obtienes 3 acciones gratis cada ronda para buffear, preparar, etc."
        ),
        "solution": (
            "Las acciones en el plano espiritual solo deberían permitir preparar "
            "hechizos o concentración, no atacar ni interactuar con el plano material. "
            "Cambiar de plano debería costar 1 acción completa, no bonus."
        ),
    },
    {
        "name": "Abisal VI: Todas las Técnicas Marciales Gratis",
        "severity": "ALTO",
        "ranks": ["ascendencia_abisal"],
        "min_rank": "VI",
        "description": (
            "Transformación Abisal (VI): 'Conoces todas las técnicas marciales (Rango III gratis)'. "
            "Esto otorga instantáneamente acceso a CADA habilidad marcial de Rango I-III "
            "de Asesino, Coloso, Duelista, Ira, Fortitud y Reflejos. "
            "Combinado con stats a 12 y DEF 20, es absurdamente versátil."
        ),
        "solution": (
            "Limitar a 1-2 estilos marciales elegidos al activar la transformación, "
            "no todos. O limitar a Rango I-II en lugar de III."
        ),
    },
    {
        "name": "Magia Protectora V: Invertir Chi = Muerte Instantánea a Magos",
        "severity": "MEDIO",
        "ranks": ["magia_protectora"],
        "min_rank": "V",
        "description": (
            "Invertir Chi (V): Aumenta la reserva de chi del objetivo en +3 y causa "
            "daño igual a su reserva total. Un mago con 20+ chi recibe 23+ daño puro. "
            "Contra objetivos con reservas altas es potencialmente letal en un golpe."
        ),
        "solution": (
            "El daño debería ser igual al chi AÑADIDO (3-5), no a la reserva total. "
            "O el objetivo puede gastar chi para reducir el daño 1:1 (ya está parcialmente, "
            "pero debería ser más claro)."
        ),
    },
    {
        "name": "Maldición de Shade + Nigromancia = Doble Maldición Imparable",
        "severity": "MEDIO",
        "ranks": ["magia_sombria", "nigromancia"],
        "min_rank": "III",
        "description": (
            "Maldición de Shade (Sombría III): Impide curación y cordura, progresa hasta muerte. "
            "Enervación (Nigromancia IV): Impide sanación y progresa hasta muerte/zombi. "
            "Ambas maldiciones apiladas son redundantes pero si son independientes "
            "requieren eliminar AMBAS para salvarse, lo cual es casi imposible."
        ),
        "solution": (
            "Las maldiciones que impiden curación no deberían apilar; "
            "solo la más potente debería aplicar. Clarificar que Sanación Superior "
            "puede eliminar una maldición por uso."
        ),
    },
]

# ─── Known Unclear Rules ────────────────────────────────────────────────────

UNCLEAR_RULES = [
    {
        "rule": "Posición Defensiva",
        "references": 20,
        "description": (
            "Referenciada en 20+ habilidades como requisito o efecto, "
            "pero nunca definida en el manual. ¿Cómo se entra? ¿Cuesta acción? "
            "¿Qué beneficios da exactamente?"
        ),
    },
    {
        "rule": "Contadores de Escudo",
        "references": 15,
        "description": (
            "Numerosas habilidades otorgan 'contadores de escudo' pero no se explica "
            "cuánto daño absorben, si bloquean un impacto completamente o reducen daño, "
            "ni cómo interactúan con diferentes tipos de daño."
        ),
    },
    {
        "rule": "Empower (Empoderar)",
        "references": 50,
        "description": (
            "La mayoría de habilidades tienen un campo 'empower' con efectos adicionales, "
            "pero el mecanismo base no está documentado. ¿Cuesta recurso extra? "
            "¿Es una acción? ¿Cuántas veces por turno se puede empoderar?"
        ),
    },
    {
        "rule": "Ventaja/Desventaja (+1d6/-1d6)",
        "references": 40,
        "description": (
            "El manual no define formalmente este mecanismo. El diseñador indica "
            "que Ventaja = +1d6 al tiro, pero falta: ¿Se acumulan múltiples ventajas? "
            "¿Ventaja + Desventaja se cancelan? ¿Hay un máximo de d6 adicionales?"
        ),
    },
    {
        "rule": "3 Acciones + 2 Reacciones por turno",
        "references": 30,
        "description": (
            "El manual core dice '1 acción estándar' pero todo el sistema de rangos "
            "asume 3 acciones y 2 reacciones. El manual necesita actualizarse "
            "para reflejar el sistema real."
        ),
    },
    {
        "rule": "Parada vs Esquiva",
        "references": 25,
        "description": (
            "Ambas son opciones defensivas pero las reglas no explican: "
            "¿Cuándo se usa cada una? ¿Cuestan reacción? ¿Qué estadísticas usan? "
            "¿Puedes elegir libremente?"
        ),
    },
    {
        "rule": "Concentración",
        "references": 35,
        "description": (
            "Muchos hechizos duran 'Concentración' pero no se define: "
            "¿Cuántos efectos de concentración simultáneos? ¿Cómo se pierde? "
            "¿Requiere acción mantener? ¿Qué daño rompe concentración?"
        ),
    },
    {
        "rule": "Resistencia vs Resistencia Superior vs Inmunidad",
        "references": 30,
        "description": (
            "Hay tres niveles de protección pero no se define la diferencia numérica. "
            "¿Resistencia = mitad daño? ¿Resistencia Superior = cuarto? "
            "¿Aplica a efectos de estado también?"
        ),
    },
    {
        "rule": "Sistema de Distancias (Pasos)",
        "references": 25,
        "description": (
            "Se usan 'paso', 'corto', 'medio', 'largo', 'lejano' pero no se definen "
            "las distancias exactas ni cuántos pasos equivale cada una."
        ),
    },
    {
        "rule": "Efectos Críticos",
        "references": 20,
        "description": (
            "Muchas habilidades tienen campos 'crit' con efectos especiales "
            "pero no se define cuándo se activan (¿nat 20? ¿diferencia de tiro?)."
        ),
    },
    {
        "rule": "Estados simultáneos (Ira/Mente Desencadenada/Furia Abisal/etc.)",
        "references": 10,
        "description": (
            "¿Se pueden tener múltiples 'estados' activos? Ira dice que no puedes concentrarte, "
            "pero ¿Mente Desencadenada es concentración? ¿Furia Abisal apila con Ira?"
        ),
    },
]


# ─── Data Loading ────────────────────────────────────────────────────────────

def load_all_ranks():
    """Load all rank JSON files from the data/ranks directory."""
    ranks = {}
    if not RANKS_DIR.exists():
        print(f"Error: Ranks directory not found at {RANKS_DIR}")
        sys.exit(1)

    for filepath in sorted(RANKS_DIR.glob("*.json")):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            ranks[data["id"]] = data
    return ranks


# ─── Build Validation ───────────────────────────────────────────────────────

@dataclass
class CharacterBuild:
    name: str = "Unnamed"
    level: int = 1
    stats: dict = field(default_factory=lambda: {s: 1 for s in STATS})
    ranks: dict = field(default_factory=dict)  # {rank_id: rank_level (I-VI)}

    def rank_count(self):
        return len(self.ranks)

    def total_ranks_needed(self):
        """Total rank slots used."""
        return sum(roman_to_int(v) for v in self.ranks.values())

    def available_rank_slots(self):
        """Ranks available at this level (start with 2, +1 per level)."""
        return self.level + 1


def roman_to_int(roman):
    mapping = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6}
    return mapping.get(roman, 0)


def int_to_roman(n):
    mapping = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI"}
    return mapping.get(n, "?")


def validate_build(build: CharacterBuild, all_ranks: dict):
    """Validate a character build and return list of issues."""
    issues = []
    warnings = []

    # Check rank count
    if build.rank_count() > MAX_RANKS_PER_CHARACTER:
        issues.append(
            f"Demasiados rangos: {build.rank_count()} "
            f"(máximo {MAX_RANKS_PER_CHARACTER})"
        )

    # Check total rank slots
    available = build.available_rank_slots()
    used = build.total_ranks_needed()
    if used > available:
        issues.append(
            f"Rangos usados ({used}) exceden los disponibles ({available}) "
            f"para nivel {build.level}"
        )

    # Check each rank's level requirement
    for rank_id, rank_level in build.ranks.items():
        if rank_id not in all_ranks:
            issues.append(f"Rango desconocido: {rank_id}")
            continue

        min_level = RANK_UNLOCK_LEVELS.get(rank_level, 99)
        if build.level < min_level:
            issues.append(
                f"{all_ranks[rank_id]['title']} {rank_level} requiere nivel {min_level}+ "
                f"(personaje es nivel {build.level})"
            )

    # Check stat allocation
    stat_cap = STAT_CAPS.get(build.level, 9)
    for stat, val in build.stats.items():
        if val > stat_cap:
            issues.append(
                f"{stat} = {val} excede el máximo de {stat_cap} "
                f"para nivel {build.level}"
            )
        if val < -1:
            issues.append(f"{stat} = {val} está por debajo del mínimo de -1")

    # Check stat point total
    stat_points_base = sum(BASE_STATS_ARRAY)  # 11
    stat_points_from_levels = build.level - 1
    stat_point_bonuses = 0
    for rank_id, rank_level in build.ranks.items():
        if rank_id in all_ranks:
            rank_data = all_ranks[rank_id]
            for lvl in rank_data.get("levels", []):
                if roman_to_int(lvl["rank"]) <= roman_to_int(rank_level):
                    passive = lvl.get("passive", "")
                    if "estadística" in passive.lower() and ("+1" in passive or "por 1" in passive):
                        stat_point_bonuses += 1

    total_expected = stat_points_base + stat_points_from_levels + stat_point_bonuses
    total_actual = sum(build.stats.values())
    if total_actual > total_expected:
        warnings.append(
            f"Puntos de estadística ({total_actual}) exceden lo esperado ({total_expected}). "
            f"Verifica si hay bonuses de rango aplicados correctamente."
        )

    return issues, warnings


# ─── Resource Calculation ────────────────────────────────────────────────────

def calculate_resources(build: CharacterBuild, all_ranks: dict):
    """Calculate chi and vigor pools for a build."""
    chi = 0
    vigor = 0

    for rank_id, rank_level in build.ranks.items():
        rank_int = roman_to_int(rank_level)
        res_type = RESOURCE_TYPE.get(rank_id, "chi")

        if res_type == "chi":
            chi += rank_int + 2
        elif res_type == "vigor":
            vigor += rank_int + 2
        elif res_type == "chi_x2":
            chi += rank_int * 2
        elif res_type == "both":
            chi += rank_int
            vigor += rank_int
            # Guerrero Divino specifically adds both
            if rank_id == "guerrero_divino":
                pass  # already handled by "both"

    return {"chi": chi, "vigor": vigor, "total": chi + vigor}


# ─── Action Economy Analysis ────────────────────────────────────────────────

def analyze_action_economy(build: CharacterBuild, all_ranks: dict):
    """Analyze action economy bonuses in a build."""
    actions = BASE_ACTIONS
    reactions = BASE_REACTIONS
    extra_turns = 0
    bonuses = []

    ranks = build.ranks

    if "reflejos" in ranks:
        r = roman_to_int(ranks["reflejos"])
        if r >= 1:
            actions += 1
            bonuses.append("Velocidad Superior (Reflejos I): +1 acción")
        if r >= 5:
            extra_turns += 1
            bonuses.append("Reflejos Supremos (Reflejos V): +1 turno completo (3 acciones)")

    if "ira" in ranks:
        r = roman_to_int(ranks["ira"])
        if r >= 4:
            actions += 1
            bonuses.append("Golpe de Adrenalina (Ira IV): +1 acción")

    if "mente_desencadenada" in ranks:
        r = roman_to_int(ranks["mente_desencadenada"])
        if r >= 5:
            extra_turns += 1
            bonuses.append("División Mental (Mente V): +1 turno completo (3 acciones)")

    total_actions = actions + (extra_turns * 3)

    return {
        "base_actions": BASE_ACTIONS,
        "bonus_actions": actions - BASE_ACTIONS,
        "extra_turns": extra_turns,
        "total_actions_per_round": total_actions,
        "reactions": reactions,
        "bonuses": bonuses,
    }


# ─── Combo Detection ────────────────────────────────────────────────────────

def detect_combos(build: CharacterBuild):
    """Detect known problematic combos in a build."""
    detected = []
    build_rank_ids = set(build.ranks.keys())

    for combo in KNOWN_COMBOS:
        combo_ranks = set(combo["ranks"])
        if combo_ranks.issubset(build_rank_ids):
            # Check if ranks are high enough
            min_rank_int = roman_to_int(combo["min_rank"])
            all_high_enough = all(
                roman_to_int(build.ranks.get(r, "I")) >= min_rank_int
                for r in combo["ranks"]
            )
            if all_high_enough:
                detected.append(combo)
            else:
                # Partial match - warn about future combo
                max_current = max(
                    roman_to_int(build.ranks.get(r, "I"))
                    for r in combo["ranks"]
                )
                if max_current >= min_rank_int - 1:
                    detected.append({
                        **combo,
                        "severity": "AVISO",
                        "description": f"[PARCIAL] {combo['description']}",
                    })

    return detected


# ─── Defensive Analysis ─────────────────────────────────────────────────────

def analyze_defenses(build: CharacterBuild, all_ranks: dict):
    """Analyze defensive capabilities of a build."""
    defenses = []
    resistances = set()
    immunities = set()

    for rank_id, rank_level in build.ranks.items():
        r = roman_to_int(rank_level)
        if rank_id not in all_ranks:
            continue

        rank_data = all_ranks[rank_id]
        for lvl in rank_data.get("levels", []):
            if roman_to_int(lvl["rank"]) > r:
                continue
            for ability in lvl.get("abilities", []):
                desc = ability.get("desc", "").lower()
                name = ability["name"]

                # Detect resistances
                if "resistencia a" in desc or "resistencia al" in desc:
                    defenses.append(f"{name}: Resistencias detectadas")
                if "inmunidad" in desc or "inmune a" in desc:
                    defenses.append(f"{name}: Inmunidades detectadas")
                if "escudo" in desc and "contadores" in desc:
                    defenses.append(f"{name}: Otorga contadores de escudo")
                if "vitalidad temporal" in desc:
                    defenses.append(f"{name}: Otorga Vitalidad temporal")
                if "daño a la mitad" in desc or "reduce el daño" in desc:
                    defenses.append(f"{name}: Reducción de daño")

    return defenses


# ─── Damage Analysis ────────────────────────────────────────────────────────

def analyze_damage(build: CharacterBuild, all_ranks: dict):
    """Analyze damage potential of a build."""
    damage_sources = []

    for rank_id, rank_level in build.ranks.items():
        r = roman_to_int(rank_level)
        if rank_id not in all_ranks:
            continue

        rank_data = all_ranks[rank_id]
        for lvl in rank_data.get("levels", []):
            if roman_to_int(lvl["rank"]) > r:
                continue
            for ability in lvl.get("abilities", []):
                desc = ability.get("desc", "").lower()
                name = ability["name"]
                tags = [t.lower() for t in ability.get("tags", [])]

                if "ataque" in tags or "mejora" in tags:
                    cost = ability.get("cost", "0 acciones")
                    area = ability.get("area", "Single target")
                    damage_sources.append({
                        "name": name,
                        "rank": rank_id,
                        "cost": cost,
                        "area": area,
                        "description": ability.get("desc", ""),
                    })

    return damage_sources


# ─── Pretty Output ───────────────────────────────────────────────────────────

class Colors:
    RED = "\033[91m"
    YELLOW = "\033[93m"
    GREEN = "\033[92m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"
    MAGENTA = "\033[95m"


def severity_color(severity):
    mapping = {
        "CRITICO": Colors.RED,
        "ALTO": Colors.YELLOW,
        "MEDIO": Colors.CYAN,
        "AVISO": Colors.MAGENTA,
    }
    return mapping.get(severity, Colors.RESET)


def print_header(text):
    print(f"\n{Colors.BOLD}{'=' * 70}")
    print(f"  {text}")
    print(f"{'=' * 70}{Colors.RESET}")


def print_section(text):
    print(f"\n{Colors.BOLD}--- {text} ---{Colors.RESET}")


def evaluate_build(build: CharacterBuild, all_ranks: dict):
    """Run full evaluation on a character build."""
    print_header(f"EVALUACIÓN DE BUILD: {build.name} (Nivel {build.level})")

    # Stats
    print_section("Estadísticas")
    for stat, val in build.stats.items():
        bar = "#" * val + "." * (9 - val)
        print(f"  {stat}: {val} [{bar}]")

    # Ranks
    print_section("Rangos")
    for rank_id, rank_level in build.ranks.items():
        title = all_ranks.get(rank_id, {}).get("title", rank_id)
        category = all_ranks.get(rank_id, {}).get("category", "?")
        print(f"  [{category}] {title} {rank_level}")

    # Validation
    print_section("Validación")
    issues, warnings = validate_build(build, all_ranks)
    if issues:
        for issue in issues:
            print(f"  {Colors.RED}✗ ERROR: {issue}{Colors.RESET}")
    if warnings:
        for w in warnings:
            print(f"  {Colors.YELLOW}⚠ AVISO: {w}{Colors.RESET}")
    if not issues and not warnings:
        print(f"  {Colors.GREEN}✓ Build válido{Colors.RESET}")

    # Resources
    print_section("Reservas de Recursos")
    resources = calculate_resources(build, all_ranks)
    print(f"  Chi:   {resources['chi']}")
    print(f"  Vigor: {resources['vigor']}")
    print(f"  Total: {resources['total']}")

    # Action Economy
    print_section("Economía de Acciones")
    actions = analyze_action_economy(build, all_ranks)
    print(f"  Acciones base:       {actions['base_actions']}")
    print(f"  Acciones bonus:      +{actions['bonus_actions']}")
    print(f"  Turnos adicionales:  {actions['extra_turns']}")
    print(
        f"  {Colors.BOLD}TOTAL acciones/ronda: "
        f"{actions['total_actions_per_round']}{Colors.RESET}"
    )
    if actions["total_actions_per_round"] > 5:
        print(
            f"  {Colors.RED}⚠ ALERTA: Más de 5 acciones/ronda "
            f"puede romper el balance{Colors.RESET}"
        )
    for bonus in actions["bonuses"]:
        print(f"    • {bonus}")

    # Defenses
    print_section("Capacidades Defensivas")
    defenses = analyze_defenses(build, all_ranks)
    for d in defenses[:15]:
        print(f"  • {d}")
    if len(defenses) > 15:
        print(f"  ... y {len(defenses) - 15} más")

    # Combos
    print_section("Combos Problemáticos Detectados")
    combos = detect_combos(build)
    if combos:
        for combo in combos:
            color = severity_color(combo["severity"])
            print(f"\n  {color}{Colors.BOLD}[{combo['severity']}] {combo['name']}{Colors.RESET}")
            print(f"  {combo['description']}")
            if "solution" in combo:
                print(f"  {Colors.GREEN}Solución: {combo['solution']}{Colors.RESET}")
    else:
        print(f"  {Colors.GREEN}✓ No se detectaron combos problemáticos conocidos{Colors.RESET}")

    # Available abilities
    print_section("Habilidades Disponibles")
    total_abilities = 0
    for rank_id, rank_level in build.ranks.items():
        r = roman_to_int(rank_level)
        if rank_id not in all_ranks:
            continue
        rank_data = all_ranks[rank_id]
        abilities = []
        for lvl in rank_data.get("levels", []):
            if roman_to_int(lvl["rank"]) <= r:
                for ab in lvl.get("abilities", []):
                    abilities.append(ab["name"])
        total_abilities += len(abilities)
        print(f"  {rank_data['title']} {rank_level}: {', '.join(abilities)}")
    print(f"\n  Total habilidades: {total_abilities}")

    # Vitality / HP
    print_section("Vitalidad y PV")
    con = build.stats.get("CON", 1)
    vitality = 2 + con + build.level
    hp_base = 3 + con
    hp_bonus = (build.level - 1) // 3
    hp = hp_base + hp_bonus
    fort_bonus = 0
    if "fortitud" in build.ranks:
        fort_rank = roman_to_int(build.ranks["fortitud"])
        fort_bonus = fort_rank + 1
    print(f"  Vitalidad:  {vitality} (2 + CON:{con} + Nivel:{build.level})")
    print(f"  PV:         {hp} (3 + CON:{con} + {hp_bonus} por niveles)")
    if fort_bonus:
        print(f"  Fortitud:   +{fort_bonus} PV y DEF (Armadura Natural)")
        print(f"  PV final:   {hp + fort_bonus}")
    print(f"  Muerte a:   PV = -{con}")


def list_all_ranks(all_ranks: dict):
    """List all available ranks."""
    print_header("RANGOS DISPONIBLES")
    categories = {}
    for rank_id, data in all_ranks.items():
        cat = data.get("category", "Otros")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append((rank_id, data))

    for cat, ranks in sorted(categories.items()):
        print_section(cat)
        for rank_id, data in sorted(ranks, key=lambda x: x[1]["title"]):
            stats = ", ".join(data.get("stats", []))
            n_levels = len(data.get("levels", []))
            has_vi = any(
                l["rank"] == "VI" for l in data.get("levels", [])
            )
            max_rank = "VI" if has_vi else "V"
            print(f"  {rank_id:<30} {data['title']:<25} ({stats}) [Rango I-{max_rank}]")


def show_rank_details(rank_id: str, all_ranks: dict):
    """Show detailed info for a specific rank."""
    if rank_id not in all_ranks:
        print(f"Rango '{rank_id}' no encontrado.")
        return

    data = all_ranks[rank_id]
    print_header(f"{data['title']} ({data['category']})")
    print(f"\n  {data['description']}")
    print(f"\n  Stats: {', '.join(data.get('stats', []))}")

    for f in data.get("fundamentals", []):
        clean = f.replace("<strong>", "").replace("</strong>", "")
        clean = clean.replace("<i>", "").replace("</i>", "")
        print(f"  • {clean}")

    for lvl in data.get("levels", []):
        print(f"\n  {Colors.BOLD}Rango {lvl['rank']}: {lvl.get('title', '')}{Colors.RESET}")
        if lvl.get("passive"):
            print(f"    [PASIVA DE RANGO] {lvl['passive']}")
        for ab in lvl.get("abilities", []):
            tags = ", ".join(ab.get("tags", []))
            print(f"    ◆ {ab['name']} [{tags}]")
            if ab.get("cost"):
                print(f"      Coste: {ab['cost']}")
            if ab.get("range"):
                print(f"      Alcance: {ab['range']}")
            if ab.get("area"):
                print(f"      Área: {ab['area']}")
            if ab.get("duration"):
                print(f"      Duración: {ab['duration']}")
            if ab.get("crit"):
                print(f"      Crítico: {ab['crit']}")
            print(f"      {ab.get('desc', '')}")
            if ab.get("empower"):
                print(f"      [EMPOWER] {ab['empower']}")


def show_all_combos():
    """Show all known problematic combos."""
    print_header("COMBOS PROBLEMÁTICOS CONOCIDOS")
    for combo in KNOWN_COMBOS:
        color = severity_color(combo["severity"])
        print(f"\n{color}{Colors.BOLD}[{combo['severity']}] {combo['name']}{Colors.RESET}")
        print(f"  Rangos: {', '.join(combo['ranks'])} (min Rango {combo['min_rank']})")
        print(f"  {combo['description']}")
        print(f"  {Colors.GREEN}Solución: {combo['solution']}{Colors.RESET}")


def show_unclear_rules():
    """Show all unclear rules."""
    print_header("REGLAS NO DEFINIDAS O AMBIGUAS")
    for rule in UNCLEAR_RULES:
        print(f"\n  {Colors.YELLOW}{Colors.BOLD}{rule['rule']}{Colors.RESET}")
        print(f"  Referencias: ~{rule['references']} habilidades")
        print(f"  {rule['description']}")


def interactive_build(all_ranks: dict):
    """Interactive build creation mode."""
    print_header("MODO INTERACTIVO - Creador de Build")

    name = input("\nNombre del personaje: ").strip() or "Sin nombre"
    while True:
        try:
            level = int(input("Nivel (1-20): ").strip())
            if 1 <= level <= 20:
                break
            print("Nivel debe ser entre 1 y 20.")
        except ValueError:
            print("Introduce un número válido.")

    # Stats
    print(f"\nAsigna estadísticas (máximo para nivel {level}: {STAT_CAPS.get(level, 9)})")
    print(f"Puntos base: {sum(BASE_STATS_ARRAY)} + {level - 1} por niveles = {sum(BASE_STATS_ARRAY) + level - 1}")
    stats = {}
    for stat in STATS:
        while True:
            try:
                val = int(input(f"  {stat}: ").strip())
                stats[stat] = val
                break
            except ValueError:
                print("Introduce un número válido.")

    # Ranks
    print(f"\nSlots de rango disponibles: {level + 1}")
    print("Rangos disponibles:")
    for rank_id in sorted(all_ranks.keys()):
        print(f"  - {rank_id}")

    ranks = {}
    print("\nIntroduce rangos (formato: rank_id rango, ej: 'magia_fuego III')")
    print("Escribe 'fin' para terminar.")
    while True:
        line = input("  > ").strip()
        if line.lower() == "fin":
            break
        parts = line.split()
        if len(parts) != 2:
            print("Formato: rank_id RANGO (ej: magia_fuego III)")
            continue
        rank_id, rank_level = parts[0], parts[1].upper()
        if rank_id not in all_ranks:
            print(f"Rango '{rank_id}' no encontrado.")
            continue
        if rank_level not in RANK_UNLOCK_LEVELS:
            print(f"Nivel de rango '{rank_level}' no válido (I-VI).")
            continue
        ranks[rank_id] = rank_level

    build = CharacterBuild(name=name, level=level, stats=stats, ranks=ranks)
    evaluate_build(build, all_ranks)


def load_build_from_file(filepath: str, all_ranks: dict):
    """Load a build from a JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    build = CharacterBuild(
        name=data.get("name", "Unnamed"),
        level=data.get("level", 1),
        stats=data.get("stats", {s: 1 for s in STATS}),
        ranks=data.get("ranks", {}),
    )
    evaluate_build(build, all_ranks)


# ─── Predefined Example Builds ──────────────────────────────────────────────

EXAMPLE_BUILDS = {
    "berserker_divino": {
        "name": "Berserker Divino",
        "level": 12,
        "stats": {"FUE": 7, "DES": 3, "CON": 6, "INT": 1, "SAB": 3, "CAR": 5},
        "ranks": {
            "ira": "IV",
            "fortitud": "III",
            "guerrero_divino": "III",
            "estilo_coloso": "III",
        },
    },
    "asesino_sombrio": {
        "name": "Asesino Sombrío",
        "level": 12,
        "stats": {"FUE": 3, "DES": 7, "CON": 3, "INT": 4, "SAB": 2, "CAR": 5},
        "ranks": {
            "estilo_asesino": "IV",
            "reflejos": "III",
            "magia_sombria": "III",
            "rastrear": "II",
        },
    },
    "archimago_temporal": {
        "name": "Archimago Temporal",
        "level": 15,
        "stats": {"FUE": 1, "DES": 3, "CON": 4, "INT": 8, "SAB": 3, "CAR": 3},
        "ranks": {
            "magia_temporal": "V",
            "magia_evocacion": "IV",
            "magia_protectora": "III",
            "reflejos": "II",
        },
    },
    "necromancer_infernal": {
        "name": "Nigromante Infernal",
        "level": 15,
        "stats": {"FUE": 1, "DES": 2, "CON": 4, "INT": 5, "SAB": 2, "CAR": 8},
        "ranks": {
            "nigromancia": "V",
            "ascendencia_infernal": "IV",
            "magia_sombria": "III",
            "magia_mental": "II",
        },
    },
    "speedster_letal": {
        "name": "Speedster Letal (BROKEN)",
        "level": 15,
        "stats": {"FUE": 3, "DES": 8, "CON": 3, "INT": 6, "SAB": 1, "CAR": 1},
        "ranks": {
            "reflejos": "V",
            "mente_desencadenada": "V",
            "estilo_asesino": "III",
            "rastrear": "I",
        },
    },
}


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Raldamain Rank Build Evaluator"
    )
    parser.add_argument("--build", type=str, help="Path to build JSON file")
    parser.add_argument("--list", action="store_true", help="List all ranks")
    parser.add_argument("--rank", type=str, help="Show details for a rank")
    parser.add_argument("--combos", action="store_true", help="Show known combos")
    parser.add_argument("--rules", action="store_true", help="Show unclear rules")
    parser.add_argument(
        "--example", type=str,
        choices=list(EXAMPLE_BUILDS.keys()),
        help="Evaluate a predefined example build"
    )
    parser.add_argument(
        "--interactive", action="store_true", help="Interactive build mode"
    )

    args = parser.parse_args()
    all_ranks = load_all_ranks()
    print(f"Cargados {len(all_ranks)} rangos desde {RANKS_DIR}")

    if args.list:
        list_all_ranks(all_ranks)
    elif args.rank:
        show_rank_details(args.rank, all_ranks)
    elif args.combos:
        show_all_combos()
    elif args.rules:
        show_unclear_rules()
    elif args.build:
        load_build_from_file(args.build, all_ranks)
    elif args.example:
        data = EXAMPLE_BUILDS[args.example]
        build = CharacterBuild(**data)
        evaluate_build(build, all_ranks)
    elif args.interactive:
        interactive_build(all_ranks)
    else:
        # Default: show menu
        print_header("RALDAMAIN RANK EVALUATOR")
        print("""
  Uso:
    --list                Lista todos los rangos disponibles
    --rank <id>           Muestra detalles de un rango
    --combos              Muestra combos problemáticos conocidos
    --rules               Muestra reglas no definidas
    --build <file.json>   Evalúa un build desde archivo JSON
    --example <nombre>    Evalúa un build de ejemplo
    --interactive         Modo interactivo para crear builds

  Ejemplos predefinidos:
""")
        for key, data in EXAMPLE_BUILDS.items():
            ranks_str = ", ".join(
                f"{r} {l}" for r, l in data["ranks"].items()
            )
            print(f"    {key:<25} Nivel {data['level']}: {ranks_str}")

        print(f"""
  Formato de archivo build.json:
  {{
      "name": "Mi Personaje",
      "level": 10,
      "stats": {{"FUE": 5, "DES": 3, "CON": 4, "INT": 2, "SAB": 3, "CAR": 3}},
      "ranks": {{
          "estilo_asesino": "III",
          "reflejos": "II",
          "magia_fuego": "III",
          "rastrear": "II"
      }}
  }}
""")


if __name__ == "__main__":
    main()
