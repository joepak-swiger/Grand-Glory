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
