# Performance and crowd-density report

## Environment and method

Simulation timings were captured on Windows 11 x64, Node.js v24.21.0, AMD Ryzen 7 7800X3D (8 cores / 16 logical processors), 31 GiB RAM. `npm run benchmark:sim` uses a fixed seed derived from `0x475247 + enemy count`, 120 warm-up fixed updates, then 600 measured updates (about 10 simulated seconds) and reports median, p95, and worst single-update time. Each scene has mixed Thug, Fast Thug, Gangster, and Bruiser entities, actual moving player and enemy projectiles, XP pickups, and floating damage numbers. The fixture disables horde spawning, automatic player attacks, and XP collection to keep populations and upgrade state comparable. Timings are simulation-only and do not include Pixi rendering or browser compositing.

The Playwright browser stress case uses Chromium headless at 1365 × 900 and the real PixiJS game. It separately records ticker frame deltas and `GameRenderer.draw` scene-update CPU time, along with visible/active entities, active sprites, projectiles, pickups, floating labels, and JS heap when Chromium exposes it. WebGL is preferred, but headless Chromium may use software rendering; see the captured browser renderer/vendor in the test output. `scene update` is CPU-side game-to-display-object work, not the GPU draw/composite cost. FPS from headless Chromium is not a claim about a normal Windows GPU browser.

The earlier project report's 4.23 / 10.10 / 22.58 / 39.89 / 51.71 ms figures were summarized as multi-update simulation batches and cannot be compared directly to one-update percentiles. A prior controlled per-update fixture on this same Node/Windows environment is retained below. Browser FPS from the old renderer was sampled in standard-config play at low populations; it was not the same synthetic crowd test, so it is contextual rather than an apples-to-apples renderer delta.

## Simulation benchmark (one update, milliseconds)

| Enemies | Before median | Before p95 | Before worst | After median | After p95 | After worst |
|---:|---:|---:|---:|---:|---:|---:|
| 25 | 0.0260 | 0.0704 | 0.3046 | 0.0251 | 0.0958 | 0.4829 |
| 50 | 0.0465 | 0.1284 | 0.3132 | 0.0465 | 0.1304 | 0.4800 |
| 100 | 0.0749 | 0.1466 | 0.3631 | 0.0839 | 0.1442 | 0.7545 |
| 150 | 0.1248 | 0.2066 | 0.4604 | 0.1249 | 0.2078 | 0.6694 |
| 200 | 0.1831 | 0.2993 | 0.4509 | 0.1723 | 0.3739 | 0.9091 |

The old and current samples use the same seeded 600-update fixture with moving projectiles and mixed entities, collected in separate runs. Median costs are similar: the 200-enemy median improved about 6%, while 100 was slower in this sample; p95/worst were noisy and did not improve consistently. This comparison does not support a broad simulation speedup claim. The spatial grid removes projectile/enemy full-scan candidate work, but separation and general per-enemy work still scale with population. The measured median remains under 0.2 ms per update at 200 enemies, well inside a 16.7 ms fixed-step budget; worst samples show substantial JIT/GC variability. The supplied 51.71 ms at 200 was the total of 300 updates (~0.17 ms/update), not the cost of one update. This benchmark is lightweight, not a lab-grade profiler.

## Browser crowd stress (synthetic setup, not natural gameplay)

| Population | Visible enemies | Projectiles | Pickups | Labels | Active sprites | FPS | Avg frame ms | p95 frame ms | Worst frame ms | Last scene update / p95 / worst ms |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 25 | 25 | 5 | 5 | 3 | 39 | 30 | 39.96 | 66.60 | 100 | 0.20 / 0.60 / 1.80 |
| 50 | 50 | 11 | 10 | 6 | 78 | 20 | 40.90 | 50.10 | 100 | 0.20 / 0.50 / 2.10 |
| 100 | 100 | 22 | 20 | 12 | 155 | 30 | 42.30 | 50.10 | 100 | 0.40 / 0.70 / 2.40 |
| 150 | 150 | 33 | 30 | 18 | 232 | 15 | 43.98 | 50.10 | 100 | 0.40 / 0.70 / 2.40 |
| 200 | 200 | 44 | 40 | 24 | 309 | 15 | 45.54 | 50.10 | 100 | 1.00 / 0.70 / 2.40 |

The headless renderer reported 20.69 MiB from Chromium's JS heap metric at each snapshot (coarse and not a GPU-memory reading). The measured scene update stayed below or at 1 ms, while full frame times stayed near 40–46 ms. Chromium identified `ANGLE / Vulkan SwiftShader (Subzero)` on Google Inc. at `HeadlessChrome/156.0.8078.4`; this is software rendering. The 15–30 FPS samples therefore describe this software-rendered runner, not ordinary Windows GPU performance. The synthetic test intentionally pauses simulation updates, so its zero dropped-simulation-update count does not characterize simulation load. No target of 60 FPS on owner hardware is asserted from headless Chromium.

## Optimizations in this branch

- Reusable uniform spatial hash with world-space cells now serves projectile collision broad phase, nearby weapon targeting, enemy separation, safe spawn placement, and XP pile merging. Queries conservatively include every cell within the query radius; narrow-phase distance checks and projectile hit-ID tracking still decide actual hits.
- Dynamic enemies are re-indexed after movement for the next fixed step. Bosses participate in projectile queries. Piercing and repeat-hit protection remain per projectile.
- Enemy/projectile/pickup/floating-number cleanup uses in-place compaction; pickup merge buckets and query result arrays are reused.
- Pixi primitive textures are cached; visible enemy views, shadows, health bars, player/enemy shots, XP pickups, and floating labels are reused from pools. Offscreen enemy views are returned to the pool while simulation continues. Static street art is separate from dynamic entities, and sorting is only refreshed when depth buckets change.
- Damage statistics count actual HP removed, capped at the target's remaining health.

## Assignment 005 natural horde progression and balance

The director target curve is now 8 initially, 24 at 15 s, 40 at 30 s, 64 at 60 s, 82 at 90 s, 104 at 120 s, and 120 at 150 s. It retains a 128 ordinary-enemy cap, +12 surge target, maximum four spawns in one fixed update, and a replenishment budget capped at 14 spawns/s. When population is substantially below target, safe batch intervals shorten. Recent kill rate also increases batch size, within the fixed update and per-second budgets. Boss-phase ordinary pressure stays capped at 68% of the ordinary cap. Safe placement samples up to 48 candidate street locations and falls back to the safest player-distant point when crowd separation cannot be satisfied; this avoids failing a batch but can increase close crowd packing. Recycled distant enemies preserve active count and type rather than counting as new spawns.

The previous standard browser run under the old target curve measured active / visible counts of 25 / 20 at 18 s; 33 / 22 at 34 s; 58 / 49 at 62 s; 54 / 41 at 93 s; 66 / 47 at 123 s; and 45 / 22 plus the boss at 154 s. It peaked at 83 ordinary enemies and spent about 136 simulated seconds below target. This is the before comparison, not evidence for Assignment 005.

The Assignment 005 fixed-step automated simulation evaluation (60 updates/s, standard enemy/player/boss values, three seeds, upgrade priorities fixed per seed, dash and special input supplied each update) produced these results:

| Seed / upgrade strategy | Outcome | Level | Kills | Peak ordinary enemies | Spawned | Below target | Boss fight |
|---|---|---:|---:|---:|---:|---:|---:|
| 1741 / offense first | Defeat at 111.2 s | 19 | 686 | 87 | 765 | 100 s | Not reached |
| 42 / defense first | Victory at 173.8 s | 23 | 999 | 116 | 1,082 | 148 s | 23.8 s |
| 2026 / mixed offense and defense | Defeat at 118.4 s | 21 | 764 | 87 | 839 | 105 s | Not reached |

Checkpoints in the winning defensive seed measured active ordinary population against target at 15 s: 23 / 24; 30 s: 38 / 40; 60 s: 63 / 64; 90 s: 66 / 82; 120 s: 67 / 104; and 150 s: 88 / 87 (the target is reduced to the boss-phase cap). Its recorded spawn rate reached 12–13/s in the final sample and the peak reached 116. Offense-heavy strategies generated higher kill rates than the 14/s replenishment cap and died before the scheduled boss, while the defensive build filled the late-game target range and beat the boss. Upgrade priorities and seed materially affect survival; one of these three strategies won. These are deterministic automated simulation observations, not human playtesting.

Population fill remains a tradeoff: this small three-seed sample shows better target proximity at 15, 30, and 60 seconds, but the two offense-first runs spent substantial time below target after high kill rates. Defensive play reached the 90–120 late target band. The safe fallback is counted in telemetry; the winning seed reported 70 placement fallbacks and 371 distant enemy recycles, so future tuning should continue watching whether far-off enemies are replaced fairly and whether entry feels visible. Actual visible counts, natural surge screenshots, and browser-side FPS for this new tuning are pending the hosted Chromium run; no current Assignment 005 browser result or 60 FPS claim is asserted here.

## Artifacts and limitations

Browser screenshots are in `artifacts/evidence/`. `stress-*.png` are real rendered synthetic stress scenes and must not be represented as natural progression. `natural-*-population.png` and standard-run screens come from standard run rules with natural spawns. Simulation continues for offscreen enemies, as needed for fair attacks and recycling; culling affects their display objects only. Headless frame rate remains a separate limitation, and ordinary desktop GPU performance still needs owner-side observation.
