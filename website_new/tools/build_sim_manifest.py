"""List the combat simulator files the website's /simulador page loads.

    python tools/build_sim_manifest.py

The page runs the simulator in the browser (Pyodide) and fetches every file
named in ``combat-simulator/web_manifest.json``.  Run this after adding or
removing a module (tools/launch_all.py also runs it on start).  Editing an
existing file needs nothing: the page always fetches the current version.
"""
from __future__ import annotations

import json
from pathlib import Path

SIM = Path(__file__).resolve().parent.parent / "combat-simulator"
OUT = SIM / "web_manifest.json"

# Not needed in the browser: command-line tools and the YAML character/monster
# rosters (the page only simulates the visitor's own uploads)
SKIP_DIRS = {"cli", "characters", "monsters", "__pycache__"}


def build() -> list[str]:
    files = []
    for p in sorted((SIM / "raldamain").rglob("*")):
        rel = p.relative_to(SIM)
        if not p.is_file() or SKIP_DIRS & set(rel.parts) or p.suffix not in (".py", ".yaml"):
            continue
        files.append(rel.as_posix())
    return files


def main() -> bool:
    """Write the manifest; True if it changed."""
    data = json.dumps({"files": build()}, indent=1) + "\n"
    if OUT.exists() and OUT.read_text(encoding="utf-8") == data:
        return False
    OUT.write_text(data, encoding="utf-8", newline="\n")
    return True


if __name__ == "__main__":
    changed = main()
    print(f"{OUT.relative_to(SIM.parent)}: {'actualizado' if changed else 'sin cambios'}")
