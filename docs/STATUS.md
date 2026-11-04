# Project status

## Milestone 001 — first playable slice

Published in the official repository at <https://github.com/joepak-swiger/Grand-Glory>. PR #1 is open and unmerged. `main` preserves the initial baseline; gameplay foundation corrections are on `feature/first-playable`.

## Milestone 002 — foundation and visual integration

Foundation corrections were committed to `feature/first-playable` at `3cee00a9d2d2048039b06bfacfecb6c49079a62e`; PR #1 remains open. This visual feature branch is based on that commit. The current visual integration includes the owner-approved character and enemy artwork, the portrait menu, cached sprite frames, independent enemy animation clocks, and simulation-owned horizontal facing for Blue Pinwheel, both thug types, and the boss.

The owner confirmed the local game launches and is playable in a Windows browser before this visual pass. For the current visual source, local typechecking passed, all 35 simulation tests passed, the production build passed, and the real Vite application passed the Playwright Chromium browser suite. That deterministic browser suite checked asset loading and animation/facing behavior plus the gameplay path through upgrade, pause, boss, victory, defeat, and restart. It is automated browser verification, not human playtesting or a normal three-minute balance run. The first hosted Actions run caught a flaky animation-frame sampling assertion after install, typecheck, unit tests, and build had passed. The test was fixed to wait for a changed frame. GitHub Actions run 10 then passed every step, including the Chromium gameplay suite, at commit `452125eaacec4cf699f9502d51fe6cfcad9f2270`.

## Known gaps

- Blue Pinwheel's supplied four-frame strip is an idle cycle, provisionally reused while moving; there is no dedicated walk set or authentic left/up/down directional animation.
- The Gang Leader has no supplied art and uses a geometric placeholder.
- Browser animation and rendering performance have not been profiled separately.
- The normal three-minute target needs human balance/playability review.
- Music, sound, touch controls, additional heroes, and stages remain future work.

## Milestone 003 — Horde Revolution (in progress)

Development is on `feature/horde-revolution`, based on the unmerged visual branch. The simulation now has a configurable horde target curve, camera-adjacent batch spawns, recurring surges, active caps, persistent-straggler recycling, enemy separation, ranged Gangsters, and heavy Bruisers. Weapon upgrades have five ranks, include a distinct Piercing Throw, and gate a one-time Pinwheel evolution behind rank 5 plus Prototype Power rank 2. XP piles merge without discarding value. Existing player art, enemy sprite animation, boss, menu, pause, victory, and defeat code remains in place.

The horde work passes strict typechecking, 44 deterministic simulation tests, production build, and two Chromium end-to-end tests against the real PixiJS application. The deterministic slice covers combat, upgrades, pause, boss, victory, defeat, restart, assets, animation, and browser errors. A second browser scenario uses standard run configuration and natural spawns; its controlled movement/upgrade driver survived the 52-active target, reached level 10, defeated 138 enemies, beat the boss, and won at 3:58 with about 152 HP. This is automated browser play, not human playtesting. Both the push and PR GitHub Actions runs passed at `c191a9c379cfa31d3c1bdccc147019560671f75d` (44 unit tests and two Chromium scenarios); see [push run](https://github.com/joepak-swiger/Grand-Glory/actions/runs/41771478450) and [PR run](https://github.com/joepak-swiger/Grand-Glory/actions/runs/41771483733). Results and separate simulation/rendering samples are in `docs/TESTING.md`. PR #3 is open and unmerged.

## Milestone 004 — crowd performance and density (in progress)

Development is on `feature/crowd-performance-and-density`, based directly on the Horde Revolution head `440b738ad00140354e32631bbfbd4c2ab1233934`. A reusable spatial grid now backs nearby targeting, projectile broad phase, enemy separation, and XP merging. Simulation list cleanup is in place, damage results count actual HP removed, and the Pixi renderer caches primitive textures and reuses entity/projectile/pickup/damage-text views. The standard Horde Director now targets up to 112 ordinary enemies by 2:30 with a 128 cap, subject to kills and the boss-phase pressure cap.

Pre-retuning natural browser measurements, synthetic crowd renderer measurements, comparison benchmark results, the Windows launcher, and remaining environment limitations are documented in `docs/PERFORMANCE.md` and `docs/TESTING.md`. This work is not yet published or reviewed; do not treat the local branch as merged. Automated Chromium evidence is not human playtesting.

## Milestone 005 — horde pressure, combat readability, and gameplay feel (in progress)

Development is on `feature/horde-balance-and-gameplay-feel`, based on the verified Assignment 004 commit `75de5c6726c291a6233166da0376ff5a06192dd4`. The Horde Director uses a bounded token budget that responds to target deficit, recent kills, and surge state; spawns remain camera-adjacent, safe around the player, and capped per second and per update. Recycled stragglers return sooner. Directional surges announce their approach and use an adjusted mixed composition. Upgrade offers no longer force vitality/recovery every time, weapon cards explain next-rank effects, Blue Pinwheel draws over the crowd, and the Gang Leader's placeholder has higher contrast and a quicker telegraphed attack cycle. The F3 overlay can copy a compact run summary, and results include peak crowd, weapon ranks/evolution, and boss-fight duration.

PR #5 is open at <https://github.com/joepak-swiger/Grand-Glory/pull/5>, stacked on PR #4's feature branch. Commit `74961c6352860c5947efe3019317e9a8ea472127` passed hosted typecheck, 52 unit tests plus one skipped benchmark, production build, and all four serial Chromium scenarios in both push and PR workflows. An earlier PR run timed out during the supplementary natural boss-combat screenshot; its readback is now bounded to 20 seconds and does not block gameplay assertions. Latest CI uploaded current browser evidence. Local Playwright still stalls before it reports a scenario. No human gameplay was performed during this milestone.

## Milestone 006 — Visual Rebirth (in progress)

Development is on `feature/visual-rebirth`, based on Milestone 005 head `cb89c90419896ffafc7a49308e9f74f2292d59bb`; PR #5 was confirmed open and unmerged before work began. The PixiJS renderer now uses a cached tile-assembled Kenney CC0 city stage with roads, marked intersections, sidewalks, varied block facades, and decorative cars/lamps. The title/hero-selection, gameplay HUD, level-up/evolution cards, pause and results screens share a midnight-blue/cyan/gold comic-pixel style. Owner-provided character art and temporary non-canon powers remain unchanged. The one-click launcher is unchanged.

Local bundled Node 24.22.1 passed TypeScript checking, 55 unit tests (1 benchmark skipped), and the production build. All four serial Chromium scenarios passed locally after updating the UI selectors. The visual browser test confirms the 1824×1216 map texture loaded, captures title sizes from 900×600 through 1920×1080, and verifies combat, upgrade, pause, boss, victory, defeat, and restart. A standard-configuration scripted browser run recorded 94 active / 75 visible enemies at the boss arrival and a win at 155.52 simulated seconds, level 22, and 137.5/160 HP. Synthetic 25–200 crowd renderer timings and the SwiftShader limitation are recorded in `docs/PERFORMANCE.md`. These are automated browser results, not owner human playtesting. Before/after screenshots are under `artifacts/evidence/visual-rebirth/`. Milestone 006 is developed on `feature/visual-rebirth` and is intended as a stacked review against `feature/horde-balance-and-gameplay-feel`; current publication and CI status should be confirmed from its pull request.
