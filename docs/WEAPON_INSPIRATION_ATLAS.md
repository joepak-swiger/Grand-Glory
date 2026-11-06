# Weapon Inspiration Atlas

This catalogue translates attack *archetypes* into GRAND GLORY's own prototype mechanics. It is a design aid, not a request to copy Vampire Survivors' code, art, names, balance, or UI. The reference wiki's weapon, evolution, and passive pages were consulted; its direct pages currently reject automated fetches, so implementation used the accessible [Teemo.dev weapon and evolution reference](https://teemo.dev/game-design/vampire-survivors/systems/weapons-and-evolutions-reference/) as a secondary index. The reference describes weapon-by-weapon stat compatibility, level ladders, projectile pools, and evolution conditions. GRAND GLORY implements a smaller six-slot system with explicit compatible stats.

## Archetype mapping

| Reference archetype | Blue Pinwheel | Bok-Goo | Da-Ri | Priority / note |
|---|---|---|---|---|
| Whip | SKIP | Club Sweep's directional melee arc is the closest broad archetype | Spear Sweep provides broad melee coverage | Existing weapon paths; not a one-to-one copy |
| Magic Wand | Starter Ring Throw: nearest-target ranged projectile | SKIP | Spear Toss: aimed long-range projectile | Existing ranged paths |
| Knife / Flash Arrow | Piercing Ring: straight piercing ring | Boulder Toss: arcing heavy shot | Spear Toss: piercing thrown spear | Existing, with original silhouettes |
| Axe | Ricochet Ring's bounded wall-bounce path | Boulder Toss's arc and impact | Spear Sweep's directional reach | Existing attacks; different mechanics |
| Cross | Ricochet Rings can cover changing angles | SKIP | Spear Thrust rewards alignment | Ricochet implemented; other translations deferred |
| King Bible | Orbit Guard rotates around the player | SKIP | SKIP | Orbit Guard is an original ring weapon |
| Garlic | SKIP | Ground Slam is a triggered close-range wave | Spear Sweep defends the sides/front | Triggered attacks, never a permanent damage aura |
| Santa Water | Prototype Special uses a temporary area attack | Ground Slam creates an expanding impact wave | SKIP | Ground Slam and temporary Special exist |
| Runetracer | Ricochet Rings bounce from solid stage geometry | Boulder Toss uses finite impact splash | Spear Thrust pierces a narrow line | Bounces and impacts are bounded |
| Lightning Ring | SKIP | SKIP | SKIP | No forced adaptation; a future original precision-area weapon may fit |
| Pentagram | Prototype Special is a one-shot area burst | Ground Slam is an aimed local impact | SKIP | Special identity remains provisional |
| Peachone / Ebony Wings | SKIP | SKIP | SKIP | No orbiting companion system is implied |
| Shadow Pinion | SKIP | Boulder Toss can create a forward impact lane | Spear Sweep controls approaching lanes | Existing mechanics are not copied |
| Clock Lancet / Laurel | Resilience and defensive positioning are universal traits | Resilience supports the durable role | Reach and Agility support precision/positioning | Traits do not create unimplemented attacks |
| Bone / Cherry Bomb / Carréllo | Ricochet Rings provide bounded collision-driven bounces | Boulder Toss provides physical impact | Returning Lance uses outward/returning paths | Existing implementations are prototype mechanics |
| Vento Sacro / Victory Sword | Typhoon Rings is the starter-ring evolution | Earthbreaker evolves the club | Obsidian Tempest evolves the thrust | Seven GRAND GLORY recipes are documented in the registry |
| Bracelet | Starter Ring volleys gain bounded additional projectiles | Boulder Toss volleys gain bounded additions | Spear Toss gains bounded additions | Multiplicity is capped at rank 2 |
| Long Gun / Short Gun / Spread Shot | Starter Rings can spread more after evolution | Boulder Toss can spread with rank/evolution | Spear Toss uses a controlled volley | Spread stays under explicit caps |
| Prismatic Missile / Shadow Servant | SKIP | SKIP | SKIP | Future concepts only; no placeholder upgrade cards |
| Eskizzibur / Summon Night / Mirage Robe | SKIP | Club Sweep is physical and directional | Spear Thrust is narrow and precise | No invented elemental or summoning canon |
| Pako Battiliar / Silver Wind | SKIP | Club Sweep and Ground Slam are triggered melee | Spear Sweep is a triggered defense | No passive contact aura |

## Active GRAND GLORY weapons

The registry in `src/game/definitions.ts` is the source of truth for hero ownership, five ranks, compatible Heroic Traits, and rank summaries. Each base weapon occupies one of six weapon slots; ranks and an evolution stay in that slot. The three existing kits expose four, three, and three authored weapons respectively. Optional weapons proposed for future arsenal expansion remain deferred until the active paths are complete.

The seven boss-reward recipes are Typhoon Rings (Starter Rings + Might), Eternal Halo (Orbit Guard + Persistence), Shatterstorm (Ricochet Rings + Resilience), Earthbreaker (Club Sweep + Reach), Avalanche Toss (Boulder Toss + Multiplicity), Obsidian Tempest (Spear Thrust + Tempo), and Returning Lance (Spear Toss + Momentum). Each requires the base weapon at rank 5, the matching trait at rank 1 or higher, and collection of an eligible boss cache. The trait is retained. The evolved name replaces the base name in the active build display.

## Research notes and boundaries

- Weapons have individual level effects; compatibility matters. A projectile's speed is not meaningfully applied to a melee arc, and a one-time impact does not become persistent merely because a duration stat exists.
- Evolutions combine a completed weapon with a passive and a reward opportunity. GRAND GLORY uses collectible boss caches and keeps eligibility visible on the reward card.
- A bounded mastery option supplies post-cap progression without allowing unbounded attack counts or effect creation.
- These mechanics are design references only. No external artwork, source code, weapon names, character identities, or exact balance values were copied into the game.

References:

- [Vampire Survivors weapons](https://vampire.survivors.wiki/w/Weapons)
- [Vampire Survivors evolutions](https://vampire.survivors.wiki/w/Evolution)
- [Vampire Survivors passive items](https://vampire.survivors.wiki/w/Passive_items)
- [Teemo.dev weapon and evolution reference](https://teemo.dev/game-design/vampire-survivors/systems/weapons-and-evolutions-reference/)
