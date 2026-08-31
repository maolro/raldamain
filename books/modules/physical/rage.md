# Rage
**Category**: Physical  
**Primary Stat**: Strength  
**Counter**: Enemies that can wait out the Rage duration or apply debuffs that persist through it  
**Countered By**: Targets that die fast; high-damage windows where Raging matters

## Overview
Rage is about borrowing power from your future self. While Raging, you hit harder, move faster, and ignore damage — but once the Rage ends, the body pays every debt in full. The risk/reward loop is stark: commit to the Rage and destroy your target, or hold back and waste it.

The core mechanic is the **Deferred Hit** system. While Raging, Hits you would normally take are deferred — noted but not applied. When Rage ends, all deferred Hits apply at once. If the deferred Hits would take you to 6, you are Defeated when Rage ends regardless of how well the fight went.

This means using Rage recklessly is suicidal — a good Rage player tracks incoming damage and ends Rage before the debt kills them.

## Core Passive — Bloodlust
While Raging, deal +5 damage on every attack. Attacks you make while Raging that deal Hits increase the current Rage duration by 1 round (to a maximum of +3 bonus rounds total per Rage).

---

## Tier I — Initiate

**Enter Rage** *(1 action)*  
Enter the **Raging** state. Duration: 3 rounds (extended by Bloodlust). While Raging:
- Defer all incoming Hits (do not apply them until Rage ends)
- Deal +5 bonus damage (Bloodlust)
- Cannot use spells, mental abilities, or abilities requiring Concentration
- Your movement speed increases by 1 space per turn

When Rage ends (by choice as free action, or when duration expires), apply all deferred Hits simultaneously. If total Hits would exceed 6, you are Defeated.

**Savage Blow** *(1 action, Raging required)*  
A furious strike dealing 18 damage. If this attack hits an enemy who is already at 3+ Hits, deal +8 bonus damage.

**War Cry** *(free action, once per Rage)*  
Release a battle scream. All enemies within close range must make a Willpower check (DC 12) or suffer -2 to their attack rolls until the start of your next turn.

---

## Tier II — Adept

**Reckless Attack** *(1 action, Raging required)*  
Throw all caution aside. Roll your attack with advantage. Deal 22 damage on hit. However, the next attack made against you this round automatically hits (no defense check for that one attack).

**Endure** *(reaction, Raging required)*  
Trigger: an attack would deal 3+ Hits to you. Immediately add those Hits to your deferred stack without taking them as normal. Additionally, after the attack, make a free Savage Blow against the attacker.

**Blood Frenzy** *(free action, triggered)*  
Triggers automatically when you reduce an enemy to 0 Hits while Raging. You immediately gain 1 extra action this turn (only usable for movement or a 1-action attack).

**Controlled Fury** *(passive)*  
You may end Rage as a **reaction** (instead of a free action) in response to taking a deferred Hit that would bring your deferred total to 5. This lets you avoid the killing blow from deferred damage at the last possible moment.

---

## Tier III — Master

**Unstoppable** *(3 actions, Raging required)*  
Charge in a straight line up to your full movement speed, smashing through any enemy in your path. Each enemy you pass through takes 28 damage. The first enemy you stop at (end of charge) takes 40 damage and is knocked prone. Deferred Hits gained from movement-triggered attacks during this charge are reduced by 1 each (minimum 1).

**Deathless Rage** *(passive)*  
While Raging, if deferred Hits would bring you to exactly 6 Hits (the kill threshold), you do not immediately fall — you remain in Rage for 1 more round with 5 Hits. At the end of that round, the deferred Hits apply. This gives you one final round to finish the fight.

**Berserker's Apex** *(passive upgrade)*  
Rage now defers **all** damage below 20 (not just Hits — previously sub-threshold damage was ignored, now it still doesn't count toward Hits but is tracked for Deathless Rage). Additionally, at the end of a successful Rage (you end it voluntarily before being Defeated), you recover 1 deferred Hit immediately (before the rest apply).

---

## Design Notes
- The deferred Hit mechanic requires the player to do math under pressure — intentional. Rage fighters should feel like they're riding a knife's edge.
- *Controlled Fury* is the safety valve. Without it, Tier I Rage is extremely punishing for new players.
- Pairs well with Fortitude (higher threshold = fewer deferred Hits per attack), but that creates a very tanky combination — consider whether that's desired.
- Countered hard by abilities that deal direct Hits (not reducible by threshold), since these bypass the deferral logic — direct Hits still apply normally even while Raging.
