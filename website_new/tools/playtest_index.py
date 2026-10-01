#!/usr/bin/env python3
"""
Builds playtest/index.json — the list of playtest stat blocks (.md) offered
in the Mesa de Pruebas (/mesa.html).
Usage:  python tools/playtest_index.py
Run it again after adding or renaming hero / villain files.
"""

import json
import re
from pathlib import Path

BASE = Path(__file__).parent.parent
PLAYTEST = BASE / "playtest" / "modules"
OUT = BASE / "playtest" / "index.json"
KINDS = {"heroes": "Héroes", "villains": "Villanos"}


def title_of(md: Path) -> str:
    for line in md.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return md.stem.replace("_", " ").title()


def main():
    entries = []
    for tier_dir in sorted(PLAYTEST.glob("tier_*")):
        m = re.match(r"tier_(\d+)", tier_dir.name)
        if not m:
            continue
        for kind_dir in sorted(p for p in tier_dir.iterdir() if p.is_dir()):
            for md in sorted(kind_dir.glob("*.md")):
                entries.append({
                    "path": "/" + md.relative_to(BASE).as_posix(),
                    "name": title_of(md),
                    "tier": int(m.group(1)),
                    "group": KINDS.get(kind_dir.name, kind_dir.name.title()),
                })
    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(entries)} fichas -> {OUT}")


if __name__ == "__main__":
    main()
