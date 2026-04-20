#!/usr/bin/env python3
"""
Raldamain RPG - One Piece Character Build Helper

Assists with creating character builds by calculating stats, rank points,
chi pools, and other derived values based on the Raldamain system rules.
"""

import json
import os
import sys

# ── Core System Constants ──────────────────────────────────────────────

# Rank points: 2 at level 1, +1 per level
def rank_points(level: int) -> int:
    return level + 1

# Maximum rank tier available at a given level
RANK_TIER_UNLOCKS = {1: 1, 4: 2, 7: 3, 10: 4, 13: 5, 16: 6}

def max_rank_tier(level: int) -> int:
    tier = 1
    for lvl, t in RANK_TIER_UNLOCKS.items():
        if level >= lvl:
            tier = t
    return tier

# Stat cap by level
STAT_CAP_TABLE = [
    (1, 3), (2, 4), (6, 5), (9, 6), (12, 7), (15, 8), (18, 9), (21, 12)
]

def stat_cap(level: int) -> int:
    cap = 3
    for lvl, c in STAT_CAP_TABLE:
        if level >= lvl:
            cap = c
    return cap

# HP = 3 + CON at level 1, +1 every 3 levels
def calc_hp(level: int, con: int) -> int:
    return 3 + con + (level - 1) // 3

# VT (Vitalidad) = 2 + CON + Level
def calc_vt(level: int, con: int) -> int:
    return 2 + con + level

# Chi per rank = rank_tier * 2
def chi_per_rank(rank_tier: int) -> int:
    return rank_tier * 2


# ── Character Builder ──────────────────────────────────────────────────

class RaldamainCharacter:
    def __init__(self, name: str, level: int, race: str = "Humano"):
        self.name = name
        self.level = level
        self.race = race
        self.stats = {"FUE": 0, "DES": 0, "CON": 0, "INT": 0, "SAB": 0, "CAR": 0}
        self.ranks = []  # list of (rank_name, tier)
        self.notes = []

    def set_stats(self, fue, des, con, itl, sab, car):
        self.stats = {"FUE": fue, "DES": des, "CON": con, "INT": itl, "SAB": sab, "CAR": car}

    def add_rank(self, name: str, tier: int):
        self.ranks.append((name, tier))

    @property
    def total_rank_points_used(self) -> int:
        return sum(t for _, t in self.ranks)

    @property
    def total_rank_points(self) -> int:
        return rank_points(self.level)

    @property
    def remaining_rank_points(self) -> int:
        return self.total_rank_points - self.total_rank_points_used

    @property
    def hp(self) -> int:
        return calc_hp(self.level, self.stats["CON"])

    @property
    def vt(self) -> int:
        return calc_vt(self.level, self.stats["CON"])

    @property
    def chi(self) -> int:
        return sum(chi_per_rank(t) for _, t in self.ranks)

    @property
    def max_tier(self) -> int:
        return max_rank_tier(self.level)

    @property
    def cap(self) -> int:
        return stat_cap(self.level)

    def summary(self) -> str:
        lines = []
        lines.append(f"# {self.name}")
        lines.append(f"**Nivel {self.level}** | Raza: {self.race}")
        lines.append(f"")
        lines.append(f"## Estadísticas (Cap: {self.cap})")
        stat_line = " | ".join(f"{k}: {v}" for k, v in self.stats.items())
        lines.append(f"| {stat_line} |")
        lines.append(f"")
        lines.append(f"## Recursos")
        lines.append(f"- **PV:** {self.hp}")
        lines.append(f"- **VT:** {self.vt}")
        lines.append(f"- **Chi:** {self.chi}")
        lines.append(f"")
        lines.append(f"## Rangos ({self.total_rank_points_used}/{self.total_rank_points} puntos)")
        lines.append(f"Rango máximo disponible: Rango {self.max_tier}")
        for name, tier in sorted(self.ranks, key=lambda x: -x[1]):
            lines.append(f"- **{name}** Rango {tier} (Chi: {chi_per_rank(tier)})")
        if self.remaining_rank_points != 0:
            lines.append(f"\n⚠️ Puntos de rango restantes: {self.remaining_rank_points}")
        lines.append("")
        return "\n".join(lines)


# ── Quick builds for all 14 One Piece characters ──────────────────────

def build_all():
    characters = []

    # Buggy (lvl 6) — REVISED v2
    c = RaldamainCharacter("Buggy el Payaso", 6, "Humano")
    c.set_stats(2, 4, 3, 3, 2, 5)
    c.add_rank("Magia Espacial", 2)
    c.add_rank("Estilo Asesino", 2)
    c.add_rank("Reflejos", 1)
    c.add_rank("Estilo Duelista", 1)
    c.add_rank("Fortitud", 1)
    characters.append(c)

    # Arlong (lvl 8) — REVISED v2
    c = RaldamainCharacter("Arlong", 8, "Mediano (reskin Gyojin)")
    c.set_stats(5, 3, 5, 2, 3, 2)
    c.add_rank("Estilo Coloso", 3)
    c.add_rank("Magia Agua", 2)
    c.add_rank("Fortitud", 2)
    c.add_rank("Ira", 1)
    c.add_rank("Reflejos", 1)
    characters.append(c)

    # Mr 3 (lvl 10) — REVISED v2
    c = RaldamainCharacter("Mr. 3 (Galdino)", 10, "Humano")
    c.set_stats(2, 3, 3, 6, 4, 4)
    c.add_rank("Magia Tierra", 3)
    c.add_rank("Mente Desencadenada", 2)
    c.add_rank("Magia Ilusoria", 2)
    c.add_rank("Magia Protectora", 2)
    c.add_rank("Reflejos", 1)
    c.add_rank("Fortitud", 1)
    characters.append(c)

    # Smoker (lvl 12) — REVISED v2
    c = RaldamainCharacter("Smoker", 12, "Humano")
    c.set_stats(5, 4, 5, 3, 4, 3)
    c.add_rank("Magia Aire", 4)
    c.add_rank("Estilo Coloso", 3)
    c.add_rank("Fortitud", 3)
    c.add_rank("Reflejos", 2)
    c.add_rank("Ira", 1)
    characters.append(c)

    # Crocodile (lvl 14) — REVISED v2
    c = RaldamainCharacter("Crocodile", 14, "Humano")
    c.set_stats(4, 5, 4, 4, 7, 4)  # SAB main for Tierra
    c.add_rank("Magia Tierra", 5)
    c.add_rank("Estilo Asesino", 3)
    c.add_rank("Mente Desencadenada", 3)
    c.add_rank("Fortitud", 2)
    c.add_rank("Reflejos", 2)
    characters.append(c)

    # Rob Lucci (lvl 16) — REVISED v2 with Primigenia
    c = RaldamainCharacter("Rob Lucci", 16, "Humano")
    c.set_stats(8, 7, 6, 3, 5, 3)
    c.add_rank("Estilo Coloso", 4)
    c.add_rank("Ascendencia Primigenia", 3)
    c.add_rank("Estilo Asesino", 3)
    c.add_rank("Fortitud", 3)
    c.add_rank("Reflejos", 3)
    c.add_rank("Ira", 1)
    characters.append(c)

    # Gekko Moria (lvl 16) — REVISED v2 with R6
    c = RaldamainCharacter("Gekko Moria", 16, "Humano")
    c.set_stats(5, 3, 5, 4, 4, 8)
    c.add_rank("Magia Sombría", 6)  # R6!
    c.add_rank("Nigromancia", 5)
    c.add_rank("Mente Desencadenada", 3)
    c.add_rank("Fortitud", 2)
    c.add_rank("Reflejos", 1)
    characters.append(c)

    # Magellan (lvl 18) — REVISED v2 with R6
    c = RaldamainCharacter("Magellan", 18, "Humano")
    c.set_stats(6, 4, 8, 5, 5, 6)  # CAR for Fuego
    c.add_rank("Magia Fuego", 6)    # R6! Forma Elemental = Venom Demon
    c.add_rank("Magia Agua", 4)
    c.add_rank("Fortitud", 4)
    c.add_rank("Estilo Coloso", 2)
    c.add_rank("Ira", 2)
    c.add_rank("Reflejos", 1)
    characters.append(c)

    # Trafalgar Law (lvl 20) — REVISED v2 with R6
    c = RaldamainCharacter("Trafalgar Law", 20, "Humano")
    c.set_stats(5, 6, 5, 9, 7, 3)
    c.add_rank("Magia Espacial", 6)  # R6! Extensión de Dominio = Room
    c.add_rank("Estilo Duelista", 4)
    c.add_rank("Magia Gravitatoria", 3)
    c.add_rank("Magia Vida", 3)
    c.add_rank("Mente Desencadenada", 3)
    c.add_rank("Reflejos", 2)
    characters.append(c)

    # Doflamingo (lvl 22 - mythic) — REVISED v2 with R6
    c = RaldamainCharacter("Donquixote Doflamingo", 22, "Humano")
    c.set_stats(7, 8, 6, 10, 7, 8)  # INT main for Gravitatoria
    c.add_rank("Magia Gravitatoria", 6)  # R6! Agujero Negro = Birdcage
    c.add_rank("Mente Desencadenada", 5)
    c.add_rank("Estilo Asesino", 3)
    c.add_rank("Reflejos", 3)
    c.add_rank("Fortitud", 3)
    c.add_rank("Magia Ilusoria", 2)
    c.add_rank("Magia Protectora", 1)
    characters.append(c)

    # Katakuri (lvl 22 - mythic) — REVISED v2
    c = RaldamainCharacter("Charlotte Katakuri", 22, "Humano")
    c.set_stats(9, 8, 7, 5, 9, 5)
    c.add_rank("Estilo Coloso", 5)
    c.add_rank("Reflejos", 5)     # future sight
    c.add_rank("Magia Tierra", 4)  # mochi = earth
    c.add_rank("Fortitud", 4)
    c.add_rank("Ira", 3)
    c.add_rank("Estilo Duelista", 2)
    characters.append(c)

    # Whitebeard (lvl 24 - mythic) — REVISED v2 with R6
    c = RaldamainCharacter("Edward Newgate (Barbablanca)", 24, "Humano")
    c.set_stats(12, 6, 10, 7, 8, 7)  # INT for Gravitatoria
    c.add_rank("Magia Gravitatoria", 6)  # R6! Agujero Negro
    c.add_rank("Estilo Coloso", 5)
    c.add_rank("Fortitud", 5)
    c.add_rank("Ira", 4)
    c.add_rank("Reflejos", 3)
    c.add_rank("Magia Tierra", 2)
    characters.append(c)

    # Akainu (lvl 24 - mythic) — REVISED v2 with R6
    c = RaldamainCharacter("Sakazuki (Akainu)", 24, "Humano")
    c.set_stats(10, 6, 9, 5, 7, 9)  # CAR for Fuego
    c.add_rank("Magia Fuego", 6)     # R6! Forma Elemental = magma body
    c.add_rank("Magia Tierra", 5)
    c.add_rank("Estilo Coloso", 4)
    c.add_rank("Fortitud", 4)
    c.add_rank("Ira", 3)
    c.add_rank("Reflejos", 2)
    c.add_rank("Mente Desencadenada", 1)
    characters.append(c)

    # Kaido (lvl 26 - mythic) — REVISED v2 with R6
    c = RaldamainCharacter("Kaido de las Bestias", 26, "Humano (Oni)")
    c.set_stats(12, 7, 12, 6, 8, 8)
    c.add_rank("Ascendencia Primigenia", 6)  # R6! Despertar la Bestia = dragon
    c.add_rank("Estilo Coloso", 5)
    c.add_rank("Fortitud", 5)
    c.add_rank("Magia Fuego", 4)    # Boro Breath
    c.add_rank("Ira", 4)
    c.add_rank("Reflejos", 3)
    characters.append(c)

    return characters


def print_all():
    for c in build_all():
        print(c.summary())
        print("---\n")


if __name__ == "__main__":
    if "--json" in sys.argv:
        chars = build_all()
        data = []
        for c in chars:
            data.append({
                "name": c.name,
                "level": c.level,
                "race": c.race,
                "stats": c.stats,
                "hp": c.hp,
                "vt": c.vt,
                "chi": c.chi,
                "ranks": [{"name": n, "tier": t, "chi": chi_per_rank(t)} for n, t in c.ranks],
                "rank_points": f"{c.total_rank_points_used}/{c.total_rank_points}",
            })
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print_all()
