# Reference research — Milestone 003

Research was completed before implementing the horde and progression updates. The references informed high-level design questions only; this project uses original TypeScript simulation, original values and enemy behaviors, and no third-party game code, Pokémon data, or third-party art.

## PokéSurvivor historical source

The upstream repository is [JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor). Source inspected at the pinned historical revision [b297089](https://github.com/JPTER78/pokesurvivor/commit/b297089) included:

- [`js/systems/spawner.js`](https://github.com/JPTER78/pokesurvivor/blob/b297089/js/systems/spawner.js): a population cap, enemy-rate accumulation, offscreen camera-ring spawn positions, and a periodic directional surge.
- [`js/systems/levelup.js`](https://github.com/JPTER78/pokesurvivor/blob/b297089/js/systems/levelup.js): a candidate pool that selects distinct level-up cards with weighting.
- [`js/data/moves.js`](https://github.com/JPTER78/pokesurvivor/blob/b297089/js/data/moves.js): attack-specific rank ladders and an evolution gate requiring a maxed move plus a qualifying stat.
- [`js/systems/combat.js`](https://github.com/JPTER78/pokesurvivor/blob/b297089/js/systems/combat.js): distinct projectile, melee, beam, orbit and other attack behaviors.

Those patterns motivated a configurable active-population curve, visible batch surges, a bounded enemy cap, distinct upgrade choices, rank progression, and a prerequisite-gated evolution. GRAND GLORY does not reuse those files, algorithms, naming, assets, or content. Its simulation has its own deterministic seeded RNG, city-street bounds, superhero prototype archetypes, and authored tuning values.

### License boundary

The [`LICENSE` file at b297089](https://github.com/JPTER78/pokesurvivor/blob/b297089/LICENSE) states that the covered historical code is MIT-licensed and separately identifies third-party content as outside that license. The repository's later license terms apply to later revisions; this milestone does not use later source. No code or assets from that project are included in GRAND GLORY, so no upstream license notice is being represented as a license for this game's content. This research note records source review, not a legal opinion.

## Vampire Survivors

The [official Steam page](https://store.steampowered.com/app/1794680/Vampire_Survivors/) describes its core as surviving enemy hordes, building a run, and evolving weapons, with roguelite progression between runs. This supported checking that GRAND GLORY's upgrade choices materially change an active run and that run pressure grows into a boss climax. No Vampire Survivors code, artwork, names, balance tables, or UI are used.

## GRAND GLORY implementation choices

- Population pressure is expressed as stage data (`HordeConfig`) and bounded by an active cap; it does not depend on asset loading or rendering state.
- Each automatic weapon keeps an independent rank and applies a data-defined rank curve. The Pinwheel evolution is a separate, one-time choice whose prerequisites are checked in simulation code.
- Prototype attacks, gang enemies, the gang leader, and their stats remain non-canon gameplay concepts. Blue Pinwheel's supplied art determines his in-game appearance, not lore or confirmed abilities.
