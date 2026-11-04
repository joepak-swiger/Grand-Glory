# Testing and browser evidence

## Commands

With Node.js 24 and npm available:

```sh
npm ci
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --workers=1
npm run benchmark:sim
```

Playwright uses the actual Vite application and Chromium. The E2E command needs a local server socket and an installed Playwright Chromium browser. CI installs Chromium and its Linux dependencies. FPS values are diagnostic evidence, not hard CI thresholds, because rendering backend and runner load vary substantially.

## Unit and simulation coverage

Vitest covers movement and boundaries, collision and projectile cooldown/hit tracking, spatial-grid cell edges and moved enemies, deterministic targeting, damage/invulnerability, knockback, boss attacks and defeat, safe spawns, cleanup, XP merging and conservation, level progression and stacked choices, upgrades/evolution eligibility, pause/restart, seeded simulation, and damage accounting that caps damage at remaining HP. The current suite has 50 tests including a development-only performance benchmark that is skipped by the default `npm run test`; see `docs/PERFORMANCE.md` for benchmark output.

The seeded standard-run simulation exercises three upgrade strategies across independent seeds. The browser suite includes a short deterministic vertical slice, an actual UI selection path through Pinwheel Evolution using development test XP, a standard-config natural-spawn run, and a synthetic renderer crowd sweep at 25/50/100/150/200 entities.

## Browser scenarios and limits

`/?test=1` selects a shorter deterministic encounter, exposing test hooks only in a development server. The vertical-slice test verifies the real portrait/sprite assets, animation frame advancement and facing, attack and damage, upgrade effects, pause, boss, victory, defeat, restart, and page/asset errors. The evolution scenario uses test-only XP injection but selects cards through the normal rendered upgrade UI; it is not natural progression evidence.

`/?test=normal` uses the 180-second standard configuration and natural enemy spawns. The automated driver moves, dashes, activates its earned special, and resolves actual level-up cards. It records time-series active/visible counts and screens, reaches the 2:30 Gang Leader, and tests a real boss victory/defeat ending. It fast-forwards simulation by fixed steps; this is not a wall-clock three-minute session or human playtest. A successful run and its balance observations are documented in `docs/PERFORMANCE.md`.

`/?test=stress` places a deterministic synthetic crowd in the actual PixiJS scene, with mixed enemy visuals, projectiles, XP and damage labels. Stress screenshots demonstrate renderer load only; they must not be described as naturally spawned gameplay. The headless runner used SwiftShader, so its 20–30 FPS does not represent a normal GPU browser. Scene update CPU time is reported separately from whole-frame time. No human playtest was performed by this assignment; the owner previously confirmed local playability on Windows.

## Evidence

`artifacts/evidence/` contains real Playwright captures of the title, standing/moving/facing Blue Pinwheel, mixed-direction thug sprites, combat, upgrade cards, pause, boss, victory, defeat, natural-run population checkpoints, boss/victory from standard configuration, multiple prototype weapons, deterministic evolution, and synthetic stress counts. `natural-*-population.png` comes from standard rules and natural spawns. `stress-*.png` and `synthetic-pinwheel-evolution.png` are explicitly synthetic/development-assisted. Browser automation screenshots are actual browser output, not fabricated mockups.

Performance methodology, comparison values, the hardware/browser details, horde counts, and remaining limits are in `docs/PERFORMANCE.md`.
