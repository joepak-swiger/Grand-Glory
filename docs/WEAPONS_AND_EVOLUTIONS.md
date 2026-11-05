# Weapons, passives, and evolutions

All combat values are provisional gameplay mechanics. Weapon upgrade cards display the skill rank separately from the player's overall level and explain the next rank's effect. The pause screen summarizes the selected hero's weapon ranks and owned passives.

## Weapon progression

| Hero | Weapon | Rank behavior |
|---|---|---|
| Blue Pinwheel | Starter Ring Throw | Damage increases by rank; later ranks add piercing and reduce cooldown. Split Pattern fires a bounded spread. |
| Blue Pinwheel | Orbit Guard | Two moving ring entities at ranks 1–2, three at 3–4, four at 5; per-ring contact cooldowns prevent frame-by-frame damage. |
| Blue Pinwheel | Piercing Ring | Damage, attack interval, and piercing increase across its five ranks. |
| Blue Pinwheel | Ricochet Ring | Emits a visible ring with a finite bounce budget; it reflects off solid buildings and stage boundaries, then expires. |
| Bok-Goo | Club Sweep | Directional cone strike; rank 4 schedules a second strike after a short delay. |
| Bok-Goo | Boulder Toss | Arcing boulder projectile; rank 3 adds a stone, rank 4 adds a small impact splash, and ranks raise damage/piercing. |
| Bok-Goo | Ground Slam | Expanding wave, each enemy is hit once per wave; ranks improve radius, damage, and cooldown. |
| Da-Ri | Spear Thrust | Narrow forward piercing hitbox; rank 4 schedules a second thrust. |
| Da-Ri | Spear Toss | Long piercing spear; rank 4 adds a second projectile. Returning Lance makes spears return through enemies. |
| Da-Ri | Spear Sweep | Broad defensive forward sweep; ranks improve reach, damage, and cadence. |

Rapid Rhythm affects subsequent cooldowns for all these player attacks. Velocity Core increases player projectile speed. Wide Impact affects applicable melee and orbit reach/area. Split Pattern's total shot output is capped, even if state is externally modified.

## Passives

There are twelve passive identities, with no more than six distinct passive slots owned at once. Existing passives can still gain ranks after all six slots are occupied.

| Passive | Per-rank effect | Limit |
|---|---|---|
| Might Training | +30% total player attack damage | 5 ranks |
| Rapid Rhythm | 20% shorter player weapon intervals, compounding to a 0.4× floor | 5 ranks |
| Split Pattern | +1 projectile for applicable volleys | 4 ranks; 5 total shots except rank/evolution-specific heavy-weapon bonus |
| Light Footwork | +12% movement speed | 5 ranks |
| Vitality | +25 maximum HP and immediate heal up to 25 | 5 ranks |
| Recovery | +0.45 HP/s | 5 ranks |
| Wide Pickup | +20 XP attraction range, capped at 160 world units | 5 ranks |
| Wide Impact | +10% applicable attack area/reach | 5 ranks |
| Velocity Core | +8% player projectile speed | 5 ranks |
| Extended Charge | +12% special charge from collected XP | 5 ranks |
| Armor Plating | 6% incoming-damage reduction, capped at 30% | 5 ranks |
| Experience Training | +8% XP awarded from each collected gem | 5 ranks |

Damage, cooldown, movement, health, and XP changes are applied by simulation code and are independent of renderer state. `xpCollected` continues to account for the gem's base value; the Experience Training bonus modifies the player's level XP, not gem conservation diagnostics.

## Boss-cache evolutions

Boss defeat creates a separate persistent gold cache at a walkable point near the boss. It is not an XP pile and is excluded from XP merging/conservation. Touching it pauses simulation and presents all eligible evolutions; when none is eligible, a recovery/special-charge field cache is offered. The player must select a reward before play resumes.

| Evolution | Requirements | Effect |
|---|---|---|
| Typhoon Rings | Blue Pinwheel, Starter Ring rank 5, Might Training | Starter rings gain bonus piercing and faster cadence. |
| Eternal Halo | Blue Pinwheel, Orbit Guard rank 5, Extended Charge | Four orbiting rings get a larger orbit and increased damage. |
| Shatterstorm | Blue Pinwheel, Ricochet Ring rank 5, Armor Plating | Ricochet rings deal more damage and gain two wall bounces (bounded at five). |
| Earthbreaker | Bok-Goo, Club Sweep rank 5, Wide Impact | Each sweep releases a wide ground-impact wave. |
| Avalanche Toss | Bok-Goo, Boulder Toss rank 5, Split Pattern | Boulder volley gains an additional projectile. |
| Obsidian Tempest | Da-Ri, Spear Thrust rank 5, Rapid Rhythm | Thrusts gain a rapid follow-up and increased damage. |
| Returning Lance | Da-Ri, Spear Toss rank 5, Velocity Core | Spear projectiles reverse after range and can hit enemies on their return. |

Evolutions are original provisional mechanics using the existing hero/weapon designs; no new character art or canon is implied. The test-only finite encounter mode still supports its existing encounter result flow.

## Implementation review note

The Milestone 010 starting code had two concrete ranking issues. `launchHeroProjectile` created exactly one Boulder/Spear projectile even with Split Pattern selected, and Orbit Guard used a periodic radius-damage pulse while the renderer drew non-colliding decorative blades. The player `tempo` upgrade shortened only the currently running timer rather than subsequent cooldowns across all player weapons. The Milestone 011 changes bound volley counts, use a shared cooldown multiplier, and make Orbit Guard render/collide at the same persistent ring positions.
