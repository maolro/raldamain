"""Statblocks from the website, converted to the simulator's spec format.

Two sources, both read straight from the website's data folder so there is a
single source of truth:

* ``data/statblocks/*.json`` -- characters saved from the Creador de Personajes
  (stats, ranks, equipment, learned spells).  Their combat numbers follow the
  Creador's rules (Impactos 6, Umbral General = CON + armour, saves FÍS = FUE+DES,
  VOL = CON+CAR, MEN = INT+SAB, Iniciativa = DES + Reflejos) and their rank
  abilities come from ``ranks.yaml`` (``pull_from_ranks``), with ``{{MOD}}``
  overridden by the Creador's modifier for that rank (main stat + Rango).
* ``data/creatures/*.json`` -- the bestiary (Impactos, Umbrales, saves, actions
  with ``bonus`` / ``damage`` / ``save``).

Whatever cannot be expressed in the effect DSL is emitted with
``implemented: false`` so reports list it as "no modelado" instead of silently
dropping it.
"""

from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

#: website_new/ (this file lives in website_new/combat-simulator/raldamain/data/)
WEBSITE_DIR = Path(__file__).resolve().parents[3]
STATBLOCKS_DIR = WEBSITE_DIR / "data" / "statblocks"
CREATURES_DIR = WEBSITE_DIR / "data" / "creatures"
RANKS_DIR = WEBSITE_DIR / "data" / "ranks"
EQUIPMENT_ABILITIES = WEBSITE_DIR / "data" / "builder" / "equipment-abilities.json"

#: Creador stat keys → simulator stat names
STAT_ABBR = {"str": "FUE", "dex": "DES", "con": "CON", "itl": "INT", "wis": "SAB", "cha": "CAR"}
STAT_WORDS = {"fuerza": "FUE", "destreza": "DES", "constitucion": "CON",
              "inteligencia": "INT", "sabiduria": "SAB", "carisma": "CAR"}

#: Website rank ids that ranks.yaml spells differently
RANK_ALIASES = {"magia_evocacion": "evocacion"}

#: Faith for Consagrar la Tierra (see Combatant.faith)
FAITH_BY_RANK = {"ascendencia_celestial": "celestial", "ascendencia_primigenia": "primigenio",
                 "ascendencia_abisal": "abisal"}

#: Website damage / umbral categories → simulator damage keys
DTYPE_KEYS = {"fisico": "fisico", "magia": "magico", "magico": "magico", "general": "general"}

#: Damage types (an immunity to one of these = an unreachable umbral)
DAMAGE_TYPES = {"cortante", "perforante", "contundente", "fisico", "fuego", "frio", "electrico", "acido",
                "sonico", "radiante", "necrotico", "arcano", "magico", "psiquico", "fuerza"}

#: Condition names found in ability text → conditions.yaml ids
CONDITION_WORDS = [
    (r"aturdid", "aturdido"), (r"cegad", "cegado"), (r"enredad", "enredado"),
    (r"desconcertad|confundid", "desconcertado"), (r"miedo", "miedo_1"),
    (r"envenenad|enfermad", "enfermado_1"), (r"fatiga", "fatiga_1"),
    (r"ensordecid", "ensordecido"), (r"provocad", "provocado"),
    (r"desventaja", "desventaja_defensiva"),
]


# ─────────────────────────────────────────────────────────────── helpers

def plain(text: Any) -> str:
    """Lowercase, no accents: 'Físico' → 'fisico'."""
    t = unicodedata.normalize("NFD", str(text or "")).encode("ascii", "ignore").decode()
    return t.lower().strip()


def kebab(name: str) -> str:
    """Same as the Creador's ability ids: lowercase, no accents, spaces → '-'."""
    return re.sub(r"\s+", "-", plain(name))


def name_key(name: str) -> str:
    """Loose name match between the website and ranks.yaml."""
    return re.sub(r"[^a-z0-9]", "", plain(name))


def dtype_key(text: str) -> str:
    """'Contundente/Perforante/Cortante' → 'contundente', 'Magia' → 'magico'."""
    first = re.split(r"[/,]| o ", str(text or ""))[0]
    k = plain(first)
    return DTYPE_KEYS.get(k, k or "general")


def parse_cost(cost: Any) -> dict[str, int]:
    """'2 Acciones', '1 Acción, 1 Chi', '1 Reacción', 1, '1' → {actions, reactions, chi}."""
    out: dict[str, int] = {}
    if isinstance(cost, (int, float)):
        return {"actions": int(cost)}
    text = plain(cost)
    if re.fullmatch(r"\d+", text):
        return {"actions": int(text)}
    for key, word in (("actions", "acci"), ("reactions", "reacci"), ("chi", "chi")):
        m = re.search(r"(\d+)\+?\s*" + word, text)
        if m:
            out[key] = int(m.group(1))
    if not out.get("actions") and not out.get("reactions") and "acci" in text:
        out["actions"] = 1
    return out


def reach_from(text: Any) -> str:
    """Website ranges ('Adyacente', 'Distancia media', '8') → simulator reach."""
    t = plain(text)
    if not t:
        return "adyacente"
    if t.isdigit():
        n = int(t)
        return "adyacente" if n <= 1 else "corta" if n <= 3 else "media" if n <= 8 else "larga"
    for word, reach in (("adyacente", "adyacente"), ("toque", "toque"), ("cuerpo a cuerpo", "adyacente"),
                        ("lejan", "larga"), ("larga", "larga"), ("media", "media"), ("medio", "media"),
                        ("cercan", "corta"), ("corta", "corta"), ("propio", "self")):
        if word in t:
            return reach
    return "media"


def area_from(text: Any) -> str:
    """'Cono 12', 'Radio medio', 'Cono pequeño' → AREA_TARGET_COUNT keys ('' = single target)."""
    t = plain(text)
    if not t:
        return ""
    num = re.search(r"\d+", t)
    size = None
    for word, s in (("pequen", "pequeno"), ("cort", "corto"), ("medi", "medio"), ("grand", "grande")):
        if word in t:
            size = s
    if "cono" in t:
        if size is None and num:
            size = "pequeno" if int(num.group()) <= 4 else "medio"
        return "cono_medio" if size in ("medio", "grande") else "cono_pequeno"
    if "radio" in t or "area" in t or "linea" in t:
        if size is None and num:
            n = int(num.group())
            size = "pequeno" if n <= 2 else "corto" if n <= 4 else "medio" if n <= 8 else "grande"
        return f"radio_{size or 'corto'}"
    return ""


def dice_and_type(text: Any) -> tuple[str, str]:
    """'3d8+7 Radiante' → ('3d8+7', 'radiante');  '5d8 + 7 Contundente/…' → ('5d8+7', 'contundente')."""
    t = str(text or "")
    m = re.match(r"\s*([0-9d+\-\s()]+?)\s*(?:daño\s*)?([A-Za-zÁÉÍÓÚáéíóúÑñ/ ,]*)$", t)
    if not m:
        return "", "general"
    dice = re.sub(r"[\s()]", "", m.group(1))
    return dice, dtype_key(m.group(2)) if m.group(2).strip() else "general"


def roll_expr(text: Any) -> str:
    """'+11 + 3d6' → '11+3d6' (the engine adds the d20 itself)."""
    t = re.sub(r"[\s()]", "", str(text or ""))
    return t[1:] if t.startswith("+") else t


def conditions_in(text: str) -> list[str]:
    t = plain(text)
    return [cid for pattern, cid in CONDITION_WORDS if re.search(pattern, t)]


def roman_level(text: str) -> int:
    return {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6}.get(str(text).strip(), 0)


# ─────────────────────────────────────────────────────────────── website data

@lru_cache(maxsize=1)
def rank_data() -> dict[str, dict[str, Any]]:
    out = {}
    for p in sorted(RANKS_DIR.glob("*.json")):
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            out[d.get("id", p.stem)] = d
        except Exception:
            continue
    return out


def rank_main_stats(rank_id: str) -> list[str]:
    """Main stat(s) of a rank, read like the Creador does: the 'Estadística
    principal' / 'Modificador' fundamental, else the first stat in 'stats'."""
    d = rank_data().get(rank_id) or {}
    for f in d.get("fundamentals", []):
        text = plain(re.sub(r"<[^>]+>", "", f))
        if "estadistica principal" not in text and "modificador" not in text:
            continue
        found = []
        for word in re.findall(r"fuerza|destreza|constitucion|inteligencia|sabiduria|carisma", text):
            if STAT_WORDS[word] not in found:
                found.append(STAT_WORDS[word])
        if found:
            return found[:2]
    for s in d.get("stats", []):
        k = STAT_WORDS.get(plain(s)) or (s.upper() if s.upper() in STAT_ABBR.values() else None)
        if k:
            return [k]
    return ["CAR"]


@lru_cache(maxsize=1)
def equipment_abilities() -> dict[str, Any]:
    try:
        return json.loads(EQUIPMENT_ABILITIES.read_text(encoding="utf-8"))
    except Exception:
        return {}


# ─────────────────────────────────────────────────────────────── characters

def _weapon_roll(tags: str, stats: dict[str, int], ranks: dict[str, int]) -> tuple[int, int]:
    """(attack modifier, damage stat) for a weapon, like the Creador's weaponRoll."""
    t = plain(tags)
    fue, des = stats.get("FUE", 0), stats.get("DES", 0)
    if "pesad" in t:
        return fue + ranks.get("estilo_coloso", 0), fue
    if "duelo" in t:
        return max(fue, des) + ranks.get("estilo_duelista", 0), max(fue, des)
    if "ligera" in t or "distancia" in t:
        return des + ranks.get("estilo_asesino", 0), des
    return max(fue, des), max(fue, des)


def character_spec(path: Path) -> dict[str, Any]:
    d = json.loads(path.read_text(encoding="utf-8"))
    stats: dict[str, int] = {}
    for key, abbr in STAT_ABBR.items():
        v = ((d.get("stats") or {}).get(key) or {}).get("value", 0)
        stats[abbr] = v if isinstance(v, int) else 0
    for boost in (d.get("race") or {}).get("stats") or []:
        abbr = STAT_ABBR.get(boost.get("stat"))
        if abbr and isinstance(boost.get("boost"), int):
            stats[abbr] += boost["boost"]

    ranks = {r["id"]: int(r["rank"]) for r in d.get("ranks") or [] if r.get("id") and r.get("rank")}
    level = int(d.get("level") or 1)
    equipment = d.get("equipment") or {}

    armor = equipment.get("armor") or {}
    penalty = armor.get("penalty")
    if isinstance(penalty, int) and -stats["FUE"] > penalty:
        stats["DES"] += penalty

    # Umbrales: General = CON, armour on top (General raises every threshold)
    general = max(0, stats["CON"])
    umbrales: dict[str, int] = {"general": general}
    for u in armor.get("umbrales") or []:
        for cat in str(u.get("categories", "General")).split(","):
            key = dtype_key(cat)
            if key == "general":
                for k in umbrales:
                    umbrales[k] += int(u.get("value", 0))
            else:
                umbrales[key] = umbrales.get(key, umbrales["general"]) + int(u.get("value", 0))

    eq_abilities = equipment_abilities()
    chi = 2 * sum(ranks.values())
    abilities: list[dict[str, Any]] = []
    defenses: list[tuple[int, str]] = []
    unmodelled: list[str] = []

    esquiva = stats["DES"] + ranks.get("reflejos", 0)
    abilities.append({"id": "esquiva", "name": "Esquiva", "is_defense": True,
                      "tags": ["physical"], "roll": str(esquiva)})
    defenses.append((esquiva, "esquiva"))

    melee = False
    seen: set[str] = set()
    items = [equipment.get("mainHand"), equipment.get("secondHand"), equipment.get("head")] + list(equipment.get("bag") or [])
    for item in items:
        if not isinstance(item, dict) or not item.get("eqab"):
            continue
        for ab_id in [x.strip() for x in str(item["eqab"]).split(",") if x.strip()]:
            ab = eq_abilities.get(ab_id)
            if not ab or ab_id in seen:
                continue
            seen.add(ab_id)
            if isinstance(ab.get("chi"), int):
                chi += ab["chi"]
            tags = ab.get("tags", "")
            if "ataque" not in plain(tags):
                if ab.get("type") != "Pasiva":
                    unmodelled.append(ab.get("name", ab_id))
                continue
            mod, stat = _weapon_roll(tags, stats, ranks)
            dice = ab.get("damage")
            dtype = dtype_key(ab.get("damage_type", ""))
            if not dice:  # legacy text template: "+MOD para atacar, …, 1d8 + STAT daño Cortante."
                m = re.search(r"(\d+d\d+|\d+DD)\s*\+\s*STAT\s+daño\s+([A-Za-zÁÉÍÓÚáéíóú]+)", ab.get("description", ""))
                if not m:
                    unmodelled.append(ab.get("name", ab_id))
                    continue
                dice = m.group(1).replace("DD", "d6")
                dtype = dtype_key(m.group(2))
            reach = reach_from(ab.get("range"))
            melee = melee or reach in ("adyacente", "toque")
            abilities.append({
                "id": f"arma_{ab_id.replace('-', '_')}",
                "name": ab.get("name", ab_id),
                "cost": {"actions": parse_cost(ab.get("cost")).get("actions", 1)},
                "reach": reach,
                "tags": ["weapon", "physical"],
                "effects": [{"kind": "attack", "attack_roll": str(mod),
                             "on_hit": [{"kind": "damage", "damage": f"{dice}+{stat}", "dtype": dtype}]}],
            })
            if reach in ("adyacente", "toque") and f"parada_{mod}" not in seen:
                seen.add(f"parada_{mod}")
                abilities.append({"id": f"parada_{ab_id.replace('-', '_')}", "name": f"Parada ({ab.get('name', ab_id)})",
                                  "is_defense": True, "tags": ["physical"], "roll": str(mod)})
                defenses.append((mod, f"parada_{ab_id.replace('-', '_')}"))

    # Learned spells (Hechizos tab): "<owner rank>--<lvl>--<ability>#n" → ["<rank>--<lvl>--<spell>", …]
    learned = []
    for grant, picks in ((d.get("spells") or {}).get("picks") or {}).items():
        owner = grant.split("--")[0]
        for pick in picks or []:
            parts = str(pick).split("--")
            if len(parts) >= 3 and owner in ranks:
                learned.append({"owner": owner, "rank": parts[0], "level": int(parts[1]) if parts[1].isdigit() else 1,
                                "key": parts[2]})

    rank_mods = {}
    for rid, rango in ranks.items():
        main = rank_main_stats(rid)
        rank_mods[RANK_ALIASES.get(rid, rid)] = max(stats.get(s, 0) for s in main) + rango

    faith = next((FAITH_BY_RANK[r] for r in ranks if r in FAITH_BY_RANK), "")
    return {
        "id": path.stem,
        "name": d.get("name") or path.stem,
        "source": f"data/statblocks/{path.name}",
        "origin": "ficha",
        "role": "pj",
        "level": level,
        "stats": stats,
        "ranks": {RANK_ALIASES.get(r, r): v for r, v in ranks.items()},
        "website_ranks": ranks,
        "rank_mods": rank_mods,
        "pull_from_ranks": True,
        "learned_spells": learned,
        "impactos": 6,
        "chi": chi,
        "umbrales": umbrales,
        "saves": {"fis": str(stats["FUE"] + stats["DES"]), "vol": str(stats["CON"] + stats["CAR"]),
                  "men": str(stats["INT"] + stats["SAB"])},
        "initiative": str(stats["DES"] + ranks.get("reflejos", 0)),
        "actions": 3,
        "reactions": 2,
        "defense": max(defenses)[1],
        "preferred_row": "front" if melee else "back",
        "faith": faith,
        "abilities": abilities,
        "extra_unmodelled": unmodelled,
    }


# ─────────────────────────────────────────────────────────────── creatures

def _creature_action(a: dict[str, Any], idx: int, is_reaction: bool = False) -> dict[str, Any]:
    name = a.get("name") or f"accion_{idx}"
    aid = re.sub(r"[^a-z0-9]+", "_", plain(name)).strip("_") or f"accion_{idx}"
    cost = parse_cost(a.get("cost", 1 if not is_reaction else 0))
    base: dict[str, Any] = {"id": f"{aid}_{idx}", "name": name,
                            "reach": reach_from(a.get("range") or a.get("reach")),
                            "area": area_from(a.get("area")),
                            "tags": [re.sub(r"\s+", "_", plain(t)) for t in a.get("tags") or []]}
    desc = a.get("desc", "")
    dice, dtype = dice_and_type(a.get("damage"))
    times = max(1, int(a.get("attacks") or 1))
    tags = plain(" ".join(a.get("tags") or []))

    if a.get("bonus") and dice and not is_reaction:
        hit = [{"kind": "damage", "damage": dice, "dtype": dtype}]
        hit += [{"kind": "apply_effect", "effect": c, "duration": 2} for c in conditions_in(desc)[:1]]
        base.update({"cost": {"actions": cost.get("actions", 1), "chi": cost.get("chi", 0)},
                     "effects": [{"kind": "attack", "attack_roll": roll_expr(a["bonus"]), "on_hit": hit}] * times})
        if "fisic" in tags or base["reach"] in ("adyacente", "toque"):
            base["tags"].append("physical")
        return base

    if a.get("save"):
        m = re.match(r"\s*([A-Za-zÁÉÍÓÚáéíóú]+)\s*(.*)$", str(a["save"]))
        save = {"fis": "fis", "fisico": "fis", "vol": "vol", "voluntad": "vol", "men": "men",
                "mental": "men"}.get(plain(m.group(1)) if m else "", "vol")
        fail: list[dict[str, Any]] = []
        if dice:
            fail.append({"kind": "damage", "damage": dice, "dtype": dtype})
        fail += [{"kind": "apply_effect", "effect": c, "duration": 2} for c in conditions_in(desc)[:1]]
        if fail and not is_reaction:
            base.update({"cost": {"actions": cost.get("actions", 1), "chi": cost.get("chi", 0)},
                         "effects": [{"kind": "save", "save": save, "dc": roll_expr(m.group(2) if m else "0"),
                                      "on_fail": fail}] * times})
            return base

    if dice and not a.get("bonus") and not is_reaction and "recupera" not in plain(desc):
        base.update({"cost": {"actions": cost.get("actions", 1)},
                     "effects": [{"kind": "damage", "damage": dice, "dtype": dtype}] * times})
        return base

    if not is_reaction and ("sanac" in tags or re.search(r"recupera\w*\s+(\d+\s+)?(vitalidad/)?\d*\s*impacto", plain(desc))):
        base.update({"cost": {"actions": cost.get("actions", 1)}, "targeting": "ally_wounded",
                     "reach": base["reach"] if base["reach"] != "adyacente" else "toque",
                     "effects": [{"kind": "heal", "amount": 1}]})
        return base

    base.update({"implemented": False, "notes": desc[:200]})
    return base


def creature_spec(path: Path) -> dict[str, Any]:
    d = json.loads(path.read_text(encoding="utf-8"))
    if "hits" not in d:
        raise ValueError("formato antiguo de criatura (sin 'hits')")

    umbrales: dict[str, int] = {}
    for u in d.get("umbrales") or []:
        for cat in str(u.get("categories", "General")).split(","):
            if cat.strip():
                umbrales[dtype_key(cat)] = int(u.get("value", 0))
    umbrales.setdefault("general", min(umbrales.values()) if umbrales else 2)

    immunities: list[str] = []
    for imm in d.get("immune") or []:
        text = plain(imm)
        if "fisic" in text and "no magic" in text:
            umbrales["fisico"] = 999  # "Efectos físicos no mágicos": weapons can't hurt it
            continue
        if dtype_key(imm) in DAMAGE_TYPES:
            umbrales[dtype_key(imm)] = 999  # immune to that damage type
            continue
        conds = conditions_in(imm)
        if re.search(r"mental", text):
            conds += ["miedo_1", "desconcertado"]
        if re.search(r"aturdi", text):
            conds += ["aturdido"]
        for c in conds:
            family = [c] + ([f"miedo_{n}" for n in (2, 3, 4)] if c == "miedo_1" else [])
            family += ["desconcertado_2", "desconcertado_3"] if c == "desconcertado" else []
            immunities += [x for x in family if x not in immunities]

    saves = {}
    for k, v in (d.get("saves") or {}).items():
        key = {"fis": "fis", "vol": "vol", "men": "men"}.get(plain(k)[:3])
        if key:
            saves[key] = roll_expr(v)

    abilities: list[dict[str, Any]] = []
    defense_id = ""
    for i, r in enumerate(d.get("reactions") or []):
        if re.search(r"parada|esquiva", plain(r.get("name"))) and r.get("bonus"):
            defense_id = f"defensa_{i}"
            abilities.append({"id": defense_id, "name": r.get("name"), "is_defense": True,
                              "tags": ["physical"], "roll": roll_expr(r["bonus"])})
        else:
            ab = _creature_action(r, i, is_reaction=True)
            ab["implemented"] = False
            abilities.append(ab)
    for i, a in enumerate(d.get("actions") or []):
        abilities.append(_creature_action(a, i))
    for t in d.get("traits") or []:
        abilities.append({"id": f"rasgo_{re.sub(r'[^a-z0-9]+', '_', plain(t.get('name')))}",
                          "name": t.get("name", "Rasgo"), "implemented": False, "notes": (t.get("desc") or "")[:200]})

    if not defense_id:  # no Parada/Esquiva listed: defend with the FÍS save modifier
        abilities.append({"id": "esquiva", "name": "Esquiva", "is_defense": True, "tags": ["physical"],
                          "roll": saves.get("fis", "0")})
        defense_id = "esquiva"

    melee = any(a.get("reach") in ("adyacente", "toque") and a.get("effects") for a in abilities
                if not a.get("is_defense"))
    combat = d.get("combat") or {}
    init = re.match(r"-?\d+", saves.get("fis", "0"))
    return {
        "id": d.get("id") or path.stem,
        "name": d.get("name") or path.stem,
        "source": f"data/creatures/{path.name}",
        "origin": "bestiario",
        "role": "criatura",
        "level": int(d.get("level") or 0),
        "impactos": int(d.get("hits") or 1),
        "actions": int(combat.get("acciones") or 3),
        "reactions": int(combat.get("reacciones") or 0),
        "umbrales": umbrales,
        "saves": saves,
        # No DES on creatures: initiative uses the FÍS save's flat modifier
        "initiative": init.group() if init else "0",
        "defense": defense_id,
        "immunities": immunities,
        "preferred_row": "front" if melee else "back",
        "abilities": abilities,
    }


# ─────────────────────────────────────────────────────────────── roster

def website_roster() -> tuple[dict[str, dict[str, Any]], list[str]]:
    """({id: spec}, [errors]) for every stat block and bestiary creature."""
    roster: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    for folder, convert in ((STATBLOCKS_DIR, character_spec), (CREATURES_DIR, creature_spec)):
        for p in sorted(folder.glob("*.json")):
            try:
                spec = convert(p)
            except Exception as e:  # keep going: one broken file must not hide the rest
                errors.append(f"{p.name}: {e}")
                continue
            roster[spec["id"]] = spec
    return roster, errors
