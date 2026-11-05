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

Vitest covers movement and boundaries, collision and projectile cooldown/hit tracking, spatial-grid cell edges and moved enemies, deterministic targeting, damage/invulnerability, knockback, boss attacks and defeat, safe spawns, cleanup, XP merging and conservation, level progression and stacked choices, upgrades/evolution eligibility, pause/restart, seeded simulation, damage accounting capped at remaining HP, adaptive spawn budgets, safe directed surges, reproducible natural target filling, semantic road adjacency and intersections, building style/footprint integrity, wall sliding, dash collision, full-map movement, spawn walkability, and deterministic flow-field routing. One development-only performance benchmark is intentionally skipped by default; see `docs/PERFORMANCE.md` for benchmark output.

The seeded standard-run simulation exercises three upgrade strategies across independent seeds and records active population, target deficit, spawn/kill rates, composition, fallback placements, recycling, progression, and outcome checkpoints. The browser suite includes a short deterministic vertical slice, an actual UI selection path through Pinwheel Evolution using development test XP, a standard-config natural-spawn run, and a synthetic renderer crowd sweep at 25/50/100/150/200 entities.

## Browser scenarios and limits

`/?test=1` selects a shorter deterministic encounter, exposing test hooks only in a development server. The vertical-slice test verifies the real portrait/sprite assets, animation frame advancement and facing, attack and damage, upgrade effects, pause, boss, victory, defeat, restart, and page/asset errors. The evolution scenario uses test-only XP injection but selects cards through the normal rendered upgrade UI; it is not natural progression evidence.

`/?test=normal` uses the 180-second standard configuration and natural enemy spawns. The automated driver moves, dashes, activates its earned special, and resolves actual level-up cards. It records time-series active/visible counts and screens, captures a direction-labeled natural surge and boss arrival, and attempts a boss-combat screen with a bounded timeout so a slow SwiftShader readback cannot block the gameplay check. The vertical-slice scenario also captures the boss encounter. It fast-forwards simulation by fixed steps; this is not a wall-clock three-minute session or human playtest. A successful run and its balance observations are documented in `docs/PERFORMANCE.md`.

`/?test=stress` places a deterministic synthetic crowd in the actual PixiJS scene, with mixed enemy visuals, projectiles, XP and damage labels. Stress screenshots demonstrate renderer load only; they must not be described as naturally spawned gameplay. The first parallel CI run timed out taking the defeat-screen screenshot under SwiftShader load. CI now runs the browser suite serially (`--workers=1`); all four scenarios passed in the serial hosted run. Scene-update CPU time is reported separately from whole-frame time. No human playtest was performed by this assignment; the owner previously confirmed local playability on Windows.

## Evidence

`artifacts/evidence/` contains real Playwright captures of the title, standing/moving/facing Blue Pinwheel, mixed-direction thug sprites, combat, upgrade cards, pause, boss, victory, defeat, natural-run population checkpoints, boss/victory from standard configuration, multiple prototype weapons, deterministic evolution, and synthetic stress counts. CI now uploads each run's actual browser evidence as a 14-day workflow artifact, including any refreshed natural surge/boss-combat captures. `natural-*-population.png` comes from standard rules and natural spawns. `stress-*.png` and `synthetic-pinwheel-evolution.png` are explicitly synthetic/development-assisted. Browser automation screenshots are actual browser output, not fabricated mockups.

Assignment 006 captures are under `artifacts/evidence/visual-rebirth/`. The visual vertical slice asserts that the Kenney atlas loaded into an assembled city texture, verifies the supplied portrait and animation, and captures title layout at 1920×1080, 1366×768, 1280×720, 900×600, and the standard 1365×900 game viewport. It exercises actual game UI through combat, level-up, pause, boss, victory, defeat, and restart. The pre-overhaul Milestone 005 screenshots remain in the parent revision at the root of `artifacts/evidence/`. This is automated browser verification, not owner human playtesting.

Assignment 006B captures and browser movement checks are under `artifacts/evidence/city-reconstruction/`. The real Chromium scene checks the corrected 1800×1200 texture, four-way street intersection, F4 collision visualization, player wall stop/slide, dash stop at a wall, traversal above the former y=288 band, and an enemy approaching around a building. Updated full gameplay captures are in `city-reconstruction/gameplay/`; synthetic 25–200 stress captures are in `city-reconstruction/stress/`. The original `visual-rebirth/` screenshots remain unchanged as the Milestone 006 baseline. The prior `comparison-arena.png` preserves the actual old flat/streaked streets next to the first tiled city, and `city-reconstruction/city-intersection.png` shows the corrected map. Browser automation verifies the implemented behavior; it is not a replacement for another owner playtest of the city.

The serialized CI SwiftShader crowd sweep reported 9/8/7/6/5 FPS for 25/50/100/150/200 synthetic visible enemies, with 100 ms ticker samples and scene-update p95 at 0.5/0.6/1.7/1.3/1.8 ms. Natural-run checkpoints sampled 7–9 FPS in the same headless software renderer. These are environment-specific diagnostics, not normal-GPU performance claims. Performance methodology, comparison values, horde counts, and remaining limits are in `docs/PERFORMANCE.md`.

## Assignment 007 — difficulty, audio, camera, and presentation

On the local Windows x64 Node 24.22.1 runtime, `npm run typecheck`, `npm run test`, and `npm run build` passed. Vitest reported 64 passed, one skipped benchmark, across six files. `npm run test:e2e -- --workers=1` passed all five actual Chromium scenarios: city navigation, the real-browser gameplay slice, evolution UI, natural standard run, and synthetic crowd renderer. E2E uses the bundled Node runtime and Playwright Chromium; the environment's default NVM shim printed “No active Node.js version configured,” so the successful calls explicitly put the bundled Node executable first on `PATH`.

The former left-facing CI assertion was failing intermittently because automatic progression could pause the run for an upgrade while the facing check was sampling movement. The browser test now isolates that short assertion with development-only spawn/attack controls and disables gameplay pause for the isolated check; it still sends left input and asserts the simulation facing plus sprite mirroring. It does not remove the behavior assertion or extend its timeout. Full gameplay tests run with ordinary controls afterward.

The normal-config Chromium scenario uses the ordinary health, damage, XP, and boss configuration, but advances fixed simulation steps faster than wall clock. At 15/30/60/90/120/150 simulated seconds, active/visible counts were 27/12 (target 28), 41/22 (41), 60/24 (66), 71/29 (84), 85/22 (105), and 127/73 (ordinary target 87, including the boss). The run reached level 22, defeated 881 enemies, peaked at 128 active, and won at 161.57 simulated seconds; the boss was defeated about 10.6 simulated seconds after entering. This shows one deterministic automated upgrade/movement strategy can win on Normal; it is not human playtesting, an ordinary three-minute wall-clock session, or evidence that every build strategy is balanced.

Assignment 007 screenshots and stress captures are under `artifacts/evidence/heroic-makeover/`. They are direct browser screenshots. Title layout was inspected at 1920×1080, 1366×768, 1280×720, and 900×600. The standard-run capture is automated accelerated gameplay. No new owner-controlled human playtest or desktop GPU session occurred in this assignment.

Assignment 008 Playwright output is isolated under the ignored `artifacts/evidence/living-city/run/` folder so repeated test runs do not add redundant images to the repository. A small curated set of actual Chromium captures is committed at `artifacts/evidence/living-city/`; comparisons link to the prior milestone's actual gameplay captures. The audio browser assertion clears only the test browser's saved SFX volume before load, verifies the 55% UI default, and confirms a user click initializes WebAudio. The Vitest audio cases cover missing/zero/valid/invalid preferences, muted persistence, and storage failures. Automated browser interaction and test-driven screenshots are not human playtesting.

## Assignment 009 — ring weapons, persistent XP, and Street Pitcher

Vitest adds regression coverage for owner-directed ring weapon metadata, opt-in ranged capability, melee-only thug/fast thug/bruiser definitions, persistent XP drops, approach-only pickup, short-range attraction, magnet caps, XP-conserving local gem merges, and current/next upgrade ranks including passives and max levels. A 300-kill pickup-heavy simulation confirms XP remains accounted for while gems are left uncollected. Playwright verifies the actual rendered blue ring projectiles, a stationary XP gem followed by return-and-collect, rank labels on rendered cards, and the Street Pitcher's baseball telegraph/projectile. Captures are in `artifacts/evidence/rings-xp-and-melee/`.

The natural standard-config browser run uses seeded ordinary gameplay values and naturally spawned enemies, with the test driver advancing fixed simulation steps and making upgrade/movement choices. It reached 114 active / 72 visible enemies at 150 simulated seconds, level 17, 776 defeats, and a scripted victory at 162.48 simulated seconds. This is an automated accelerated run, not a wall-clock three-minute session or human playtest. The browser was headless Chromium using SwiftShader; its full-frame pacing is not representative of a desktop GPU. The browser checks demonstrate the gameplay loop and rendered assets, but the owner should still evaluate XP-return risk and melee crowding in a regular Windows play session.

## Assignment 010 — hero selection, new factions, and endless encounters

The local Windows bundled Node 24.22.1 run passed `tsc --noEmit`, Vitest (83 passed, one optional benchmark skipped), `vite build`, and the explicit `node scripts/benchmark-sim.mjs`. The unit suite now covers three hero starting loadouts, the Gang Boss-to-Dr. Smile transition without Endless victory, faction layering, the Yo-Yo active tether damage window/cooldown, melee-only nonboss factions, and the bounded post-max mastery option. The Playwright suite lists eight scenarios, including new real-game hero selection/sprite and boss-transition/retirement coverage.

Local E2E execution was attempted with the bundled Node executable first on `PATH`, the installed Playwright Chromium, and fresh ports. Playwright could start the Vite process, and Chromium itself launched, but direct browser navigation to `http://127.0.0.1:4204/?test=1` returned `net::ERR_NETWORK_ACCESS_DENIED`. The E2E scenarios therefore could not run or produce local browser screenshots in this environment. This is a local browser/network-policy limitation, not a test assertion result; CI must provide the independent browser verification after publication. No human gameplay was performed during this assignment. The owner-approved artwork and one-click launcher were preserved.
