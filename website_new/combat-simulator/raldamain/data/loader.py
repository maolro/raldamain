"""Loading statblocks and assembling encounters."""

from __future__ import annotations

import re
from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable

from . import cache
from ..engine.dice import DicePool
from ..engine.effects import EffectRegistry
from ..engine.entities import Combatant, build_combatant
from ..engine.rank_formula import resolve_value
from ..policies.scripts import policy_for

DATA_DIR = Path(__file__).parent
_COUNT = re.compile(r"^\s*(?:(\d+)\s*[x*]\s*)?(.+?)(?:\s*[x*]\s*(\d+))?\s*$", re.I)
#: ``"mago_2@back"`` overrides the statblock's preferred_row.
_ROW = re.compile(r"^(.*?)@(front|back)$", re.I)


#: Built once per conditions.yaml version (see cache.py)
_REGISTRY: dict[str, Any] = {"key": None, "value": None}


def load_conditions() -> EffectRegistry:
    path = DATA_DIR / "conditions.yaml"
    key = cache.file_key(path)
    if _REGISTRY["key"] != key:
        _REGISTRY.update(key=key, value=EffectRegistry.from_dict(cache.load_yaml(path) or {}))
    return _REGISTRY["value"]


def load_rank_library() -> dict[str, Any]:
    path = DATA_DIR / "ranks.yaml"
    if not path.exists():
        return {}
    return cache.load_yaml(path) or {}


# Old lru_cache API, kept for callers that still clear it
load_conditions.cache_clear = lambda: _REGISTRY.update(key=None)  # type: ignore[attr-defined]
load_rank_library.cache_clear = lambda: None  # type: ignore[attr-defined]


def _apply_passive(
    spec: dict[str, Any], passive: dict[str, Any], rango: int, stats: dict[str, int],
    level: int = 0, extra: dict[str, Any] | None = None,
) -> None:
    target = passive.get("target")
    key = passive.get("key")
    amount = passive.get("amount")
    if target == "umbral":
        value = int(resolve_value(amount, rango, stats, level, extra))
        umbrales = spec.setdefault("umbrales", {})
        if key == "general":
            # "Aumenta todos sus umbrales": General raises every threshold, not
            # just the fallback, or a typed umbral (armour's Físico) would hide it.
            umbrales["general"] = umbrales.get("general", 2)
            for k in umbrales:
                umbrales[k] += value
        else:
            umbrales[key] = umbrales.get(key, umbrales.get("general", 2)) + value
    elif target == "save":
        saves = spec.setdefault("saves", {})
        current = str(saves.get(key, "0"))
        if isinstance(amount, str) and amount.startswith("advantage:"):
            n = int(amount.split(":", 1)[1])
            saves[key] = f"{current}+{n}d6" if current else f"{n}d6"
        else:
            value = resolve_value(amount, rango, stats, level, extra)
            saves[key] = f"{current}+{value}" if current else str(value)
    elif target == "stat":
        if "stats" in spec:
            spec["stats"][key] = spec["stats"].get(key, 0) + int(amount)
    elif target == "defense" and key == "skilled":
        spec["skilled_defense"] = True


#: Website ability names that ranks.yaml models under an older name
NAME_ALIASES = {"iradecombate": "ira", "armaduranatural": "resistencianatural"}


def _norm_name(name: Any) -> str:
    import unicodedata
    t = unicodedata.normalize("NFD", str(name or "")).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]", "", t)
    return NAME_ALIASES.get(t, t)


def _attach_riders(abilities: list[dict[str, Any]], riders: list[tuple[str, dict[str, Any]]]) -> list[str]:
    """Bolt chi riders onto the attacks they belong to.

    A style rank's rider (Estilo Coloso, Duelista, Asesino) rides weapon
    attacks; any other rank's rider rides that rank's own attacks.  Returns
    the names of riders that found no attack to ride.
    """
    orphans = []
    for rank_id, rider in riders:
        upgrade = {k: v for k, v in rider.items() if k not in ("rider", "text")}
        hosts = [
            a for a in abilities
            if any(e.get("kind") == "attack" for e in a.get("effects", []))
            and (("weapon" in a.get("tags", [])) if rank_id.startswith("estilo_")
                 else a.get("_rank") == rank_id)
        ]
        for host in hosts:
            host.setdefault("upgrades", []).append(deepcopy(upgrade))
        if not hosts:
            orphans.append(rider.get("name", rider.get("id", "?")))
    return orphans


def _auto_ability(raw: dict[str, Any], rank_id: str, rango: int, mod: int, stats: dict[str, int]) -> dict[str, Any]:
    """A website rank ability that ranks.yaml does not model yet.

    Plain attacks (tag Ataque + a Daño field) are simple enough to build
    automatically; anything else is listed as not modelled.
    """
    from .website import area_from, dtype_key, parse_cost, reach_from

    base = {"id": f"web_{rank_id}_{_norm_name(raw.get('name'))}", "name": raw.get("name", "?"), "_rank": rank_id}
    tags = [str(t).lower() for t in raw.get("tags") or []]
    damage = str(raw.get("damage") or "").replace(" ", "")
    if "ataque" in tags and damage:
        # Stat names in the damage ("1d6+CAR") take the rank's main stat value
        stat_val = mod - rango
        damage = re.sub(r"(FUE|DES|CON|INT|SAB|CAR)(/(FUE|DES|CON|INT|SAB|CAR))?", str(stat_val), damage)
        damage = damage.replace("RANGO", str(rango))
        cost = parse_cost(raw.get("cost"))
        base.update({
            "cost": {"actions": cost.get("actions", 1), "chi": cost.get("chi", 0)},
            "reach": reach_from(raw.get("range")),
            "area": area_from(raw.get("area")),
            "tags": ["spell"] + (["physical"] if "fisico" in _norm_name(" ".join(tags)) else []),
            "effects": [{"kind": "attack", "attack_roll": str(mod),
                         "on_hit": [{"kind": "damage", "damage": damage,
                                     "dtype": dtype_key(raw.get("damage_type") or "general")}]}],
            "notes": "Modelado automáticamente desde la web (ataque + daño).",
        })
        return base
    base.update({"implemented": False, "notes": "No está en ranks.yaml todavía."})
    return base


def assemble_from_ranks(spec: dict[str, Any]) -> dict[str, Any]:
    """Layer rank-derived passives and abilities onto a statblock.

    Additive and non-destructive: an ability id already present on the spec
    (hand-authored) is left alone rather than overwritten, so this is safe
    to run on any existing character -- it only fills in what's missing.
    Opt in per-character with ``pull_from_ranks: true``.

    Stat blocks from the website (see website.py) also bring:
    ``rank_mods``      {rank: modifier} -- overrides {{MOD}} per rank;
    ``website_ranks``  their rank ids, so website abilities missing from
                       ranks.yaml are auto-modelled or reported;
    ``learned_spells`` spells picked in the Hechizos tab, cast with the
                       granting rank's Rango and modifier.
    """
    if not spec.get("pull_from_ranks"):
        return spec
    library = load_rank_library()
    char_ranks = spec.get("ranks") or {}
    stats = spec.get("stats") or {}
    char_level = int(spec.get("level") or 0)
    rank_mods = spec.get("rank_mods") or {}
    spec = deepcopy(spec)
    existing_ids = {a.get("id") for a in spec.get("abilities", [])}
    modelled_names: dict[str, set[str]] = {}
    riders: list[tuple[str, dict[str, Any]]] = []

    def extra_for(rank_id: str) -> dict[str, Any] | None:
        return {"MOD": rank_mods[rank_id]} if rank_id in rank_mods else None

    for rank_id, rango in char_ranks.items():
        tree = library.get(rank_id)
        if not tree:
            continue
        extra = extra_for(rank_id)
        for level in range(1, int(rango) + 1):
            level_data = (tree.get("ranks") or {}).get(level) or {}
            for passive in level_data.get("passives") or []:
                _apply_passive(spec, passive, int(rango), stats, char_level, extra)
                modelled_names.setdefault(rank_id, set()).add(_norm_name(str(passive.get("text", "")).split(":")[0]))
            for ability in level_data.get("abilities") or []:
                modelled_names.setdefault(rank_id, set()).add(_norm_name(ability.get("name")))
                if ability.get("id") in existing_ids:
                    continue
                resolved = resolve_value(ability, int(rango), stats, char_level, extra)
                resolved.pop("text", None)
                if resolved.get("rider"):
                    riders.append((rank_id, resolved))
                    continue
                resolved["_rank"] = rank_id
                spec.setdefault("abilities", []).append(resolved)
                existing_ids.add(resolved.get("id"))

    unmodelled = list(spec.pop("extra_unmodelled", []) or [])

    # Website rank abilities that ranks.yaml does not cover (higher Rangos, new abilities)
    from .website import RANK_ALIASES, rank_data
    for web_id, rango in (spec.get("website_ranks") or {}).items():
        sim_id = RANK_ALIASES.get(web_id, web_id)
        data = rank_data().get(web_id) or {}
        known = modelled_names.get(sim_id, set())
        mod = rank_mods.get(sim_id, 0)
        for level in data.get("levels") or []:
            lv = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6}.get(level.get("rank"), 99)
            if lv > int(rango):
                continue
            for raw in level.get("abilities") or []:
                if _norm_name(raw.get("name")) in known:
                    continue
                auto = _auto_ability(raw, sim_id, int(rango), mod, stats)
                if auto["id"] in existing_ids:
                    continue
                if auto.get("implemented") is False:
                    unmodelled.append(raw.get("name", "?"))
                    continue
                spec.setdefault("abilities", []).append(auto)
                existing_ids.add(auto["id"])

    # Learned spells: the spell's own data, cast with the granting rank
    for sp in spec.get("learned_spells") or []:
        owner = RANK_ALIASES.get(sp["owner"], sp["owner"])
        spell_rank = RANK_ALIASES.get(sp["rank"], sp["rank"])
        rango = int(char_ranks.get(owner, 1))
        tree = library.get(spell_rank) or {}
        wanted = _norm_name(sp["key"].replace("-", " "))
        found = None
        for ability in ((tree.get("ranks") or {}).get(sp["level"]) or {}).get("abilities") or []:
            if _norm_name(ability.get("name")) == wanted:
                found = ability
                break
        if found and not found.get("rider"):
            resolved = resolve_value(found, rango, stats, char_level, extra_for(owner))
            resolved.pop("text", None)
            resolved["_rank"] = owner
        else:
            web = next((a for lv in (rank_data().get(sp["rank"]) or {}).get("levels") or []
                        for a in lv.get("abilities") or []
                        if _norm_name(a.get("name")) == wanted), None)
            resolved = _auto_ability(web or {"name": sp["key"]}, owner, rango, rank_mods.get(owner, 0), stats)
        resolved["id"] = f"hechizo_{resolved['id']}"
        if resolved.get("implemented") is False:
            unmodelled.append(f"{resolved['name']} (hechizo)")
        elif resolved["id"] not in existing_ids:
            spec.setdefault("abilities", []).append(resolved)
            existing_ids.add(resolved["id"])

    unmodelled += _attach_riders(spec.get("abilities", []), riders)
    if unmodelled:
        spec.setdefault("abilities", []).extend(
            {"id": f"nm_{i}", "name": n, "implemented": False} for i, n in enumerate(sorted(set(unmodelled))))
    return spec


def load_equipment() -> dict[str, Any]:
    return cache.load_yaml(DATA_DIR / "equipment.yaml") or {}


def apply_equipment(spec: dict[str, Any], item_ids: Iterable[str]) -> dict[str, Any]:
    """Layer a chosen armor/weapon loadout onto a statblock.

    Validates the loadout against the character's PE budget (== level, per
    convention), then merges armor umbral bonuses in.  Weapon PE (currently
    only Cadena) is counted but not auto-attached as an ability -- a PC's
    weapon choice is already an explicit ability entry in their kit.
    """
    catalog = load_equipment()
    spec = deepcopy(spec)
    level = int(spec.get("level", 0))
    pe_spent = 0
    umbral_bonus: dict[str, int] = {}
    for item_id in item_ids:
        item = None
        for group in ("armor", "weapons", "consumables"):
            if item_id in catalog.get(group, {}):
                item = catalog[group][item_id]
                break
        if item is None:
            raise KeyError(f"unknown equipment {item_id!r}")
        stats = spec.get("stats") or {}
        for stat, minimum in (item.get("requires") or {}).items():
            if stat in stats and stats[stat] < minimum:
                raise ValueError(
                    f"{item_id!r} requires {stat} >= {minimum}, spec has {stats[stat]}"
                )
        pe_spent += int(item.get("pe", 0))
        for dtype, bonus in (item.get("umbral") or {}).items():
            umbral_bonus[dtype] = umbral_bonus.get(dtype, 0) + bonus
    if pe_spent > level:
        raise ValueError(
            f"loadout costs {pe_spent} PE, over the {level}-PE budget for level {level}"
        )
    umbrales = dict(spec.get("umbrales") or {})
    for dtype, bonus in umbral_bonus.items():
        umbrales[dtype] = umbrales.get(dtype, umbrales.get("general", 2)) + bonus
    spec["umbrales"] = umbrales
    spec["pe_spent"] = pe_spent
    return spec


#: Problems found while converting website files (shown by the app / --roster)
ROSTER_ERRORS: list[str] = []


#: Which sources make up the roster.  The simulator's own YAML characters and
#: monsters are on by default (the CLI tools use them); the Taller app turns them
#: off and works only with the website's stat blocks and bestiary.
ROSTER_SOURCES = {"yaml": True, "website": True}

#: How often (seconds) to re-check the source files for changes
ROSTER_CHECK_EVERY = 1.0

_ROSTER: dict[str, Any] = {"key": None, "value": None, "checked": 0.0, "assembled": {}}


def set_roster_sources(yaml: bool = True, website: bool = True) -> None:
    ROSTER_SOURCES.update(yaml=yaml, website=website)
    reload_roster()


def reload_roster() -> None:
    """Forget the roster so the next call re-reads its sources (normally not
    needed: changed files are detected automatically)."""
    _ROSTER.update(key=None, checked=0.0)
    _ROSTER["assembled"].clear()


def _roster_key() -> tuple:
    from .website import website_fingerprint
    key: list[Any] = [tuple(sorted(ROSTER_SOURCES.items())), cache.fingerprint([DATA_DIR / "ranks.yaml"])]
    if ROSTER_SOURCES["yaml"]:
        key.append(cache.fingerprint(sorted(p for p in DATA_DIR.rglob("*.yaml") if p.name != "conditions.yaml")))
    if ROSTER_SOURCES["website"]:
        key.append(website_fingerprint())
    return tuple(key)


def load_roster() -> dict[str, dict[str, Any]]:
    """Every statblock, keyed by id.  Files may hold one block or a list.

    Sources (see ROSTER_SOURCES): this folder's YAML, and the website's stat
    blocks (data/statblocks) and bestiary (data/creatures) -- see website.py.
    The result is cached and rebuilt only when one of those files changes.
    """
    import time
    now = time.monotonic()
    if _ROSTER["value"] is not None and now - _ROSTER["checked"] < ROSTER_CHECK_EVERY:
        return _ROSTER["value"]
    _ROSTER["checked"] = now
    key = _roster_key()
    if _ROSTER["value"] is not None and key == _ROSTER["key"]:
        return _ROSTER["value"]

    roster: dict[str, dict[str, Any]] = {}
    if ROSTER_SOURCES["yaml"]:
        for path in sorted(DATA_DIR.rglob("*.yaml")):
            if path.name in ("conditions.yaml", "ranks.yaml", "equipment.yaml"):
                continue
            doc = cache.load_yaml(path)
            blocks = doc if isinstance(doc, list) else [doc]
            for block in blocks:
                if not isinstance(block, dict) or "id" not in block:
                    continue
                if block["id"] in roster:
                    raise ValueError(f"duplicate statblock id {block['id']!r} in {path}")
                roster[block["id"]] = block

    if ROSTER_SOURCES["website"]:
        from .website import website_roster
        web, errors = website_roster()
        ROSTER_ERRORS[:] = errors
        for sid, spec in web.items():
            rid = sid
            if rid in roster:  # a website id that clashes with a YAML one gets a suffix
                rid = f"{sid}_{spec.get('origin', 'web')}"
                spec = {**spec, "id": rid}
            roster[rid] = spec
    else:
        ROSTER_ERRORS[:] = []

    _ROSTER.update(key=key, value=roster)
    _ROSTER["assembled"].clear()
    return roster


# Old lru_cache API
load_roster.cache_clear = reload_roster  # type: ignore[attr-defined]


def prepared_spec(statblock_id: str) -> dict[str, Any]:
    """A roster spec with its ranks and equipment applied, cached per roster version.

    Assembling (ranks.yaml abilities, riders, learned spells) is the same for
    every fight, so a 500-fight batch now does it once instead of 500 times.
    Callers must treat the returned dict as read-only.
    """
    roster = load_roster()
    spec = roster[statblock_id]
    done = _ROSTER["assembled"].get(statblock_id)
    if done is not None:
        return done
    if spec.get("pull_from_ranks"):
        spec = assemble_from_ranks(spec)
    if spec.get("equipment"):
        spec = apply_equipment(spec, spec["equipment"])
    _ROSTER["assembled"][statblock_id] = spec
    return spec


def parse_group(text: str) -> list[tuple[str, int, str | None]]:
    """Parse a roster string into ``(statblock_id, count, row_override)``.

    ``"trasgo x4, trasgo_jefe, mago_2@back"`` ->
    ``[("trasgo", 4, None), ("trasgo_jefe", 1, None), ("mago_2", 1, "back")]``
    """
    out: list[tuple[str, int, str | None]] = []
    for chunk in text.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        m = _COUNT.match(chunk)
        if not m:
            raise ValueError(f"cannot parse roster entry {chunk!r}")
        count = int(m.group(1) or m.group(3) or 1)
        name = m.group(2).strip()
        row = None
        rm = _ROW.match(name)
        if rm:
            name, row = rm.group(1).strip(), rm.group(2).lower()
        out.append((name, count, row))
    return out


def soften_contested_dice(spec: dict[str, Any], drop: int = 1) -> dict[str, Any]:
    """Remove ``drop`` d6 from every contested roll on a statblock.

    Tests the finding that a Miniboss's ``+2d6`` over-pays for "buffs already
    baked in, no rerolls": a buffed level-5 PC only reaches ``+1d6``, so this
    brings NPC attack, defence and save-DC pools down to parity.
    """
    spec = deepcopy(spec)

    def cut(expr: Any) -> str:
        pool = DicePool.parse(expr if expr is not None else "")
        dice = []
        removed = 0
        for count, sides in pool.dice:
            if sides == 6 and count > 0 and removed < drop:
                take = min(drop - removed, count)
                removed += take
                count -= take
            if count:
                dice.append((count, sides))
        return str(DicePool(tuple(dice), pool.flat))

    def walk(effects: list[dict[str, Any]]) -> None:
        for e in effects:
            if e.get("kind") == "attack":
                e["attack_roll"] = cut(e.get("attack_roll"))
            if e.get("kind") == "save":
                e["dc"] = cut(e.get("dc"))
            for key in ("on_hit", "on_miss", "on_fail", "on_success"):
                walk(e.get(key, []))

    for ability in spec.get("abilities", []):
        walk(ability.get("effects", []))
        if ability.get("is_defense"):
            ability["roll"] = cut(ability.get("roll"))
    return spec


def make_side(
    text: str,
    side: str,
    registry: EffectRegistry,
    policy_override: str | None = None,
    soften_npc: int = 0,
) -> list[Combatant]:
    roster = load_roster()
    combatants: list[Combatant] = []
    for statblock_id, count, row_override in parse_group(text):
        if statblock_id not in roster:
            raise KeyError(
                f"unknown statblock {statblock_id!r}. "
                f"Known: {', '.join(sorted(roster))}"
            )
        spec = roster[statblock_id]
        if soften_npc and spec.get("role") in ("miniboss", "boss"):
            spec = soften_contested_dice(spec, soften_npc)
            if spec.get("pull_from_ranks"):
                spec = assemble_from_ranks(spec)
            if spec.get("equipment"):
                spec = apply_equipment(spec, spec["equipment"])
        else:
            spec = prepared_spec(statblock_id)
        for i in range(count):
            name = spec.get("name", statblock_id)
            if count > 1:
                name = f"{name} {i + 1}"
            uid = f"{side}:{statblock_id}:{i}"
            c = build_combatant(spec, registry, uid, side, name)
            c.row = row_override or spec.get("preferred_row", "front")
            c.policy = policy_for(statblock_id, policy_override)
            combatants.append(c)
    return combatants


def summon_factory(registry: EffectRegistry, policy_override: str | None = None):
    """A callable the resolver can use to bring reinforcements onto the field."""

    def make(statblock_id: str, side: str, index: int) -> Combatant:
        spec = prepared_spec(statblock_id)
        name = f"{spec.get('name', statblock_id)} {index + 1}"
        uid = f"{side}:{statblock_id}:{index}"
        c = build_combatant(spec, registry, uid, side, name)
        c.row = spec.get("preferred_row", "front")
        c.policy = policy_for(statblock_id, policy_override)
        return c

    return make


def list_roster() -> list[tuple[str, str, int, str]]:
    return sorted(
        (
            b["id"],
            b.get("name", b["id"]),
            int(b.get("level", 0)),
            b.get("role", "pj"),
        )
        for b in load_roster().values()
    )
