# Testing and browser evidence

Run npm install, then npm run typecheck, npm run test, npm run build, and npm run test:e2e. Playwright needs Chromium (npx playwright install chromium). CI installs Chromium with its Linux system dependencies before the browser test.

The simulation suite contains 29 tests for movement and bounds, target acquisition, attack cooldown and collision, health/invulnerability, full per-hit contact damage, simultaneous enemies, knockback, spawn bounds/distribution/reproducibility across seeds, death and XP cleanup, level progression including pending choices, upgrade effects, boss projectile and charge damage/telegraphs/defeat, overtime escape, dash, special, pause, transitions, restart, animation metadata, deterministic seeds, and entity cleanup.

The Playwright test starts the actual Vite app in Chromium. The development-only test URL shortens the run and enables deterministic setup controls; it does not replace rendered gameplay. Add the debug query parameter or press F3 to show frame timing, FPS, position, health, level/XP, enemy/projectile counts, state, timer, and seed. Production builds omit debug controls and diagnostics.

Real browser evidence is stored in artifacts/evidence/:

- 01-title.png — start screen
- 02-active-combat.png — movement, attacks, and an enemy
- 03-level-up-choices.png — paused three-card level-up
- 04-upgrade-and-combat.png — gameplay after an upgrade
- 05-paused.png — frozen simulation overlay
- 06-boss-encounter.png — Gang Leader prototype
- 07-victory.png — boss defeated by a player projectile
- 08-defeat.png — player loss and results

The earlier local simulation load check ran 300 fixed steps with 0, 25, and 75 enemies. Its warmed median batch timings were 0.21 ms, 0.63 ms, and 1.82 ms on the recorded Node 24.22.1 runtime. Those timings are machine-specific and measure simulation time, not GPU rendering. Deterministic browser automation is not a substitute for a human playthrough; a normal three-minute run has not yet been human-tested.
