# Core System — Hit Threshold Rules

## The Hit System

Characters and enemies do not have hit points in the traditional sense. Instead they have a **Hit Threshold** and a **Hit Track**.

### Hit Threshold
The minimum damage a single instance of damage must deal to register as 1 Hit. Default threshold for a standard character is **10**. High-defense builds (Fortitude, Colossus) raise this; frail builds (Fire Magic, Unleashed Mind) may lower it.

### Taking Hits
When a character takes damage:
- If damage < threshold → **0 Hits** (the attack was too weak to matter)
- If damage ≥ threshold → **Hits = floor(damage / threshold)**

> Example: Threshold 10. Taking 15 damage = 1 Hit. Taking 22 damage = 2 Hits. Taking 31 damage = 3 Hits.

### Hit Track
Players have **6 Hits**. When you reach 6 Hits you are **Defeated** (unconscious or dead, depending on context). Enemies have variable hit tracks (see stat blocks).

Hits can be recovered through rest, healing abilities, or specific rank powers. A **Short Rest** recovers 1 Hit. A **Long Rest** recovers all Hits.

### Partial Damage
Some abilities specify they deal "partial" damage on a successful defense. Partial damage is halved (round down) before threshold is applied — it can result in 0 Hits if halved damage falls below threshold.

---

## Actions

Each character has **3 Actions** and **2 Reactions** per round.

| Economy     | Count | When Used |
|-------------|-------|-----------|
| Actions     | 3     | On your turn |
| Reactions   | 2     | Off your turn (in response to triggers) |

Abilities list their cost as *(1 action)*, *(2 actions)*, *(3 actions)*, or *(reaction)*. Unless stated otherwise, movement costs 1 action.

### Free Actions
Some abilities are **Free** and do not consume any of your actions. You may use at most **2 free abilities per turn** unless otherwise stated.

---

## Defense Rolls

When targeted by an attack, the defender rolls a **Defense Check** (typically d20 + Defense stat).  
- If the check **meets or exceeds** the attack roll → the attack misses or deals partial damage.  
- If the check **fails** → full damage applies.

Some abilities grant **automatic success** on a defense check or force the attacker to **reroll**.

---

## Status Effects & Hits

Some effects deal **direct Hits** rather than damage — they bypass the threshold entirely. These are rarer and are explicitly labelled **(X direct Hits)**.

---

## Rank Progression

Characters learn **Ranks** (disciplines). Each rank has three tiers:

| Tier    | Prerequisite          | New Abilities |
|---------|-----------------------|---------------|
| I — Initiate  | None            | 3 abilities   |
| II — Adept    | 3 sessions in rank I | 4 abilities   |
| III — Master  | 3 sessions in rank II | 3–4 abilities + passive upgrade |

A character may have up to **4 active Ranks** at once. Switching a Rank out requires a Long Rest and narrative justification.

---

## Damage Scaling Reference

| Attack Power | Approximate Damage | Hits (threshold 10) |
|---|---|---|
| Weak         | 5–9                | 0 |
| Standard     | 10–14              | 1 |
| Strong       | 15–19              | 1 |
| Heavy        | 20–24              | 2 |
| Crushing     | 25–29              | 2 |
| Devastating  | 30–39              | 3 |
| Lethal       | 40+                | 4+ |
