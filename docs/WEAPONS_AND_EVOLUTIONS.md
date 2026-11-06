# Weapons, Heroic Traits, and Evolutions

All names and mechanics in this document are provisional gameplay systems unless identified as owner-approved character identity. Weapon rank is separate from player level. The pause screen summarizes the selected hero's weapon build and owned traits; each level-up card gives the next rank and its effect.

## Weapon progression

The active registry is data-driven. Each weapon has five ranks, one owning hero, compatible traits, and rank descriptions. A build may own up to six distinct weapons and six distinct traits; additional ranks remain available for already-owned slots.

| Hero | Weapon | Role and rank behavior |
|---|---|---|
| Blue Pinwheel | Starter Ring Throw | Automatically targets and throws a spinning blue ring; ranks improve damage, cadence, and piercing. |
| Blue Pinwheel | Orbit Guard | Moving ring entities orbit Blue Pinwheel and damage enemies on contact; ranks add rings and improve area/cadence. |
| Blue Pinwheel | Piercing Ring | Throws a distinct ring that pierces enemies; ranks improve damage, cadence, and penetration. |
| Blue Pinwheel | Ricochet Rings | Throws rings that bounce from solid terrain a finite number of times. |
| Bok-Goo | Club Sweep | Directional close-range strike; rank 4 schedules a timed follow-up. |
| Bok-Goo | Boulder Toss | Arcing stone projectiles with bounded extra shots and an improved impact area at later ranks. |
| Bok-Goo | Ground Slam | A timed expanding shockwave; each enemy is hit once per wave. |
| Da-Ri | Spear Thrust | Narrow forward piercing attack; rank 4 schedules a distinct follow-up thrust. |
| Da-Ri | Spear Toss | Long-range piercing spear; rank 4 adds a second projectile. |
| Da-Ri | Spear Sweep | Broad forward melee sweep with rank-based reach and cadence improvements. |

The renderer only displays simulation-owned projectiles, waves, and Orbit Guard positions. It does not determine damage, attack eligibility, or collision.

## Universal Heroic Traits

All thirteen traits have a five-rank cap except Multiplicity, which has two ranks. Resilience is capped at 25% incoming-damage reduction. Multiplicity only affects weapon attacks with explicitly bounded volleys.

| Trait | Per-rank effect | Compatibility |
|---|---:|---|
| Might | +10% damage | All damaging weapons |
| Tempo | −8% cooldown (bounded at a 0.55 multiplier) | Timed attacks |
| Reach | +10% attack area, line width, or melee reach | Compatible area and melee attacks |
| Momentum | +10% projectile speed | Traveling projectiles |
| Persistence | +10% active duration | Orbit, ricochet, and lingering attacks |
| Multiplicity | +1 compatible projectile or attack | Bounded volleys; rank cap 2 |
| Resilience | −5% incoming damage | All damage; total reduction capped at 25% |
| Vitality | +15% maximum health | All heroes; selection also heals up to the health-cap increase |
| Regeneration | +0.2 health per second | All heroes |
| Agility | +10% movement speed | All heroes |
| Attraction | +14 world units of XP gem attraction reach | Collectible XP; pickup reach is capped at 160 units |
| Fortune | +8 percentage points of cache-quality chance | Non-evolution boss rewards; total chance capped at 40% |
| Wisdom | +8% credited XP | Applies when a gem is collected; base gem conservation remains unchanged |

Prosperity, Provocation, Second Chance, and Overdrive remain unavailable because their supporting systems are not implemented. There is no persistent currency, risk-for-reward horde modifier, revival, or difficulty-tradeoff trait in this milestone.

## Boss-cache evolutions

Defeating a boss drops a persistent cache near a valid walkable location. Collecting it pauses combat and offers eligible weapon evolutions; if none is eligible, the player receives a useful recovery or field-cache reward. Endless Mode continues after the choice. Evolutions require rank 5 in their base weapon and at least rank 1 of the matching trait.

| Evolution | Requirements | Provisional effect |
|---|---|---|
| Typhoon Rings | Blue Pinwheel · Starter Ring rank 5 · Might | Starter rings gain bonus piercing and shorter cooldown. |
| Eternal Halo | Blue Pinwheel · Orbit Guard rank 5 · Persistence | Orbit Guard remains active and circles with four damaging rings. |
| Shatterstorm | Blue Pinwheel · Ricochet Rings rank 5 · Resilience | Ricochet rings create a bounded burst on wall bounces. |
| Earthbreaker | Bok-Goo · Club Sweep rank 5 · Reach | Club Sweep releases an additional expanding impact wave. |
| Avalanche Toss | Bok-Goo · Boulder Toss rank 5 · Multiplicity | Boulder Toss launches a wider spread of arcing boulders. |
| Obsidian Tempest | Da-Ri · Spear Thrust rank 5 · Tempo | Spear Thrust performs a rapid fan of penetrating strikes. |
| Returning Lance | Da-Ri · Spear Toss rank 5 · Momentum | Thrown spears return along their outward path and can hit enemies again. |

Fortune cannot satisfy an evolution prerequisite. Its seeded roll only improves the chance of a higher-quality non-evolution boss cache. These mechanics do not define the heroes' canonical powers.

## Historical implementation audit

The preceding narrow Milestone 011 pass fixed bounded Boulder/Spear volley counts, made Orbit Guard's rendered rings match its collision positions, applied Tempo to subsequent weapon cooldowns, clarified rank effects, added Ricochet Ring/Ground Slam/Spear Sweep, and moved evolutions from ordinary level-ups to boss-cache rewards. This consolidated rework retains those systems and replaces the earlier duplicated passive-stat model with the universal trait registry above. See [WEAPON_INSPIRATION_ATLAS.md](WEAPON_INSPIRATION_ATLAS.md) for the archetype inspiration mapping and attribution.
