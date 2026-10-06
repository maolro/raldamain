"""Player stat-array progression: base array, per-level increments, and the
Tier-based per-stat cap.

Rules (per design discussion, not yet written into base-info.md):
  - Base array at level 1: 3, 2, 2, 2, 1, 1 (sums to 11), assigned to the six
    stats in whatever priority order the build wants.
  - +1 to a chosen stat every level-up (level 1 -> 2 is the first one).
  - A stat cannot exceed Tier + 3, where Tier = ceil(level / 3) -- Tier 1 is
    levels 1-3, Tier 2 is 4-6, ... Tier 6 is 16-18.

Because the cap itself rises with level, the allocation has to be simulated
level-by-level (a stat maxed out at Tier 1 can take more points once Tier 2
unlocks), not computed as a single closed-form split.
"""
from __future__ import annotations

BASE_ARRAY = (3, 2, 2, 2, 1, 1)
STAT_ORDER = ("FUE", "DES", "CON", "INT", "SAB", "CAR")


def tier_for_level(level: int) -> int:
    return max(1, (level + 2) // 3)


def max_stat_for_level(level: int) -> int:
    return tier_for_level(level) + 3


def compute_stat_array(priority: list[str], level: int) -> dict[str, int]:
    """The stat array a build reaches at ``level``, given a priority order
    (highest-priority stat gets the next level-up point first, but only if
    it isn't already at its current Tier's cap)."""
    if set(priority) != set(STAT_ORDER):
        raise ValueError(f"priority must list all six stats exactly once, got {priority!r}")

    stats = dict(zip(priority, BASE_ARRAY))
    for lvl in range(2, level + 1):
        cap = max_stat_for_level(lvl)
        for stat in priority:
            if stats[stat] < cap:
                stats[stat] += 1
                break
        # If every stat is already at the current cap the point has nowhere
        # to go this level; it simply isn't banked (matches "increase a stat
        # by 1 every level up to a maximum of Tier + 3" read literally).
    return {k: stats[k] for k in STAT_ORDER}


def validate_stat_array(stats: dict[str, int], level: int) -> list[str]:
    """Sanity-check a hand-authored stats: dict against the level's rules.
    Returns a list of human-readable problems, empty if it's all fine."""
    problems = []
    total = sum(stats.get(k, 0) for k in STAT_ORDER)
    expected_total = 10 + level
    if total != expected_total:
        problems.append(
            f"total {total} != expected {expected_total} (11 base + {level - 1} level-ups)"
        )
    cap = max_stat_for_level(level)
    for k in STAT_ORDER:
        v = stats.get(k, 0)
        if v > cap:
            problems.append(f"{k}={v} exceeds the level-{level} cap of {cap} (Tier {tier_for_level(level)} + 3)")
        if v < 0:
            problems.append(f"{k}={v} is below the minimum of 0")
    return problems
