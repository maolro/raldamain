"""Run a batch of fights across CPU cores.

Each worker process loads the roster once (cached, see data/cache.py) and runs
its share of seeds; results are identical to running the same seeds one after
another, just faster on a multi-core machine.
"""

from __future__ import annotations

import os
from concurrent.futures import ProcessPoolExecutor
from typing import Any

#: Below this many fights the process start-up costs more than it saves
MIN_PARALLEL_RUNS = 24


def _run_chunk(args: tuple) -> list[dict[str, Any]]:
    party, enemies, seeds, config, sources = args
    from ..data.loader import load_conditions, make_side, set_roster_sources
    from ..engine.encounter import Encounter
    from ..metrics.collector import fight_metrics

    set_roster_sources(**sources)
    registry = load_conditions()
    rows = []
    for seed in seeds:
        combatants = make_side(party, "party", registry) + make_side(enemies, "enemigos", registry)
        rows.append(fight_metrics(Encounter(combatants, registry, seed=seed, config=config).run()))
    return rows


def run_batch_parallel(party: str, enemies: str, runs: int, seed0: int = 0,
                       config: dict[str, Any] | None = None,
                       sources: dict[str, bool] | None = None,
                       workers: int | None = None) -> list[dict[str, Any]]:
    """``runs`` fights with seeds ``seed0 … seed0+runs-1``, spread over processes."""
    from ..data.loader import ROSTER_SOURCES

    config = config or {}
    sources = sources or dict(ROSTER_SOURCES)
    seeds = list(range(seed0, seed0 + runs))
    workers = max(1, min(workers or (os.cpu_count() or 2) - 1, runs // 8 or 1))
    if runs < MIN_PARALLEL_RUNS or workers == 1:
        return _run_chunk((party, enemies, seeds, config, sources))
    chunks = [seeds[i::workers] for i in range(workers)]
    try:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            parts = list(pool.map(_run_chunk, [(party, enemies, c, config, sources) for c in chunks]))
    except Exception:
        # Workers could not start (e.g. no importable main script): run in this process
        return _run_chunk((party, enemies, seeds, config, sources))
    rows = [row for part in parts for row in part]
    rows.sort(key=lambda r: r["seed"])
    return rows
