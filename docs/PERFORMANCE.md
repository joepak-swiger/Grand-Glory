# Performance and crowd-density report

## Environment and method

Simulation timings were captured on Windows 11 x64, Node.js v24.21.0, AMD Ryzen 7 7800X3D (8 cores / 16 logical processors), 31 GiB RAM. `npm run benchmark:sim` uses a fixed seed derived from `0x475247 + enemy count`, 120 warm-up fixed updates, then 600 measured updates (about 10 simulated seconds) and reports median, p95, and worst single-update time. Each scene has mixed Thug, Fast Thug, Street Pitcher, and Bruiser entities, actual moving player and enemy projectiles, XP pickups, and floating damage numbers. The fixture disables horde spawning, automatic player attacks, and XP collection to keep populations and upgrade state comparable. Timings are simulation-only and do not include Pixi rendering or browser compositing. The internal `gangster` enemy kind is retained for compatibility but renders as the Street Pitcher in this build.

The Playwright browser stress case uses Chromium headless at 1365 × 900 and the real PixiJS game. It separately records ticker frame deltas and `GameRenderer.draw` scene-update CPU time, along with visible/active entities, active sprites, projectiles, pickups, floating labels, and JS heap when Chromium exposes it. WebGL is preferred, but headless Chromium may use software rendering; see the captured browser renderer/vendor in the test output. `scene update` is CPU-side game-to-display-object work, not the GPU draw/composite cost. FPS from headless Chromium is not a claim about a normal Windows GPU browser.

The earlier project report's 4.23 / 10.10 / 22.58 / 39.89 / 51.71 ms figures were summarized as multi-update simulation batches and cannot be compared directly to one-update percentiles. A prior controlled per-update fixture on this same Node/Windows environment is retained below. Browser FPS from the old renderer was sampled in standard-config play at low populations; it was not the same synthetic crowd test, so it is contextual rather than an apples-to-apples renderer delta.

## Assignment 009 — persistent XP and ring/pitcher visuals

The 300-kill pickup-heavy Vitest regression fixture leaves more than 100 separate or locally merged gems on the map after six simulated seconds and verifies `XP spawned = XP collected + XP remaining + XP lost`; no XP was discarded. This is an accounting/lifecycle stress check, not a wall-clock performance benchmark. Gems use one cached texture per value tier and renderer view reuse; attraction and collection remain simulated per pickup. A matching prior version with persistent drops was not available, so no before/after simulation speed claim is made for that workload.

After the combat changes, the final serialized headless Chromium synthetic scenes measured renderer scene-update p95 at 0.7 / 0.6 / 0.7 / 0.7 / 1.0 ms for 25 / 50 / 100 / 150 / 200 visible enemies. Whole-frame samples varied 30–60 FPS, average 27.2–31.4 ms, p95 33.4–66.6 ms, with isolated 100 ms long frames. The browser reported HeadlessChrome 156 using ANGLE/Vulkan SwiftShader, 1365×900; these numbers characterize this software-rendered automated environment, not owner desktop GPU performance. Sprite counts included 39 / 78 / 155 / 232 / 309 entity views, and heap stayed near 20.7 MiB during the short sweep. The natural standard-config scripted run won at 161.17 simulated seconds, level 18, 819 defeats, 128 peak active foes; at 150.55 seconds it had 122 active (including the boss) and 26 visible. At 120 seconds it had 103 active and 31 visible. These are accelerated browser-automation observations, not human playtesting. The limited visible share in some checkpoints remains a camera/spawn/readability concern for future playtest review.

## Simulation benchmark (one update, milliseconds)

| Enemies | Before median | Before p95 | Before worst | After median | After p95 | After worst |
|---:|---:|---:|---:|---:|---:|---:|
| 25 | 0.0260 | 0.0704 | 0.3046 | 0.0251 | 0.0958 | 0.4829 |
| 50 | 0.0465 | 0.1284 | 0.3132 | 0.0465 | 0.1304 | 0.4800 |
| 100 | 0.0749 | 0.1466 | 0.3631 | 0.0839 | 0.1442 | 0.7545 |
| 150 | 0.1248 | 0.2066 | 0.4604 | 0.1249 | 0.2078 | 0.6694 |
| 200 | 0.1831 | 0.2993 | 0.4509 | 0.1723 | 0.3739 | 0.9091 |

The old and current samples use the same seeded 600-update fixture with moving projectiles and mixed entities, collected in separate runs. Median costs are similar: the 200-enemy median improved about 6%, while 100 was slower in this sample; p95/worst were noisy and did not improve consistently. This comparison does not support a broad simulation speedup claim. The spatial grid removes projectile/enemy full-scan candidate work, but separation and general per-enemy work still scale with population. The measured median remains under 0.2 ms per update at 200 enemies, well inside a 16.7 ms fixed-step budget; worst samples show substantial JIT/GC variability. The supplied 51.71 ms at 200 was the total of 300 updates (~0.17 ms/update), not the cost of one update. This benchmark is lightweight, not a lab-grade profiler.

### Assignment 004 versus Assignment 005

This matching seeded fixture rerun compares the Assignment 004 benchmark sample above with the Assignment 005 run from the same Windows Node 24.22.1 environment and 600-update workload. The simulation is not expected to be the bottleneck here; the Assignment 005 work focuses on population behavior and presentation.

| Enemies | Assignment 004 median / p95 / worst ms | Assignment 005 median / p95 / worst ms |
|---:|---:|---:|
| 25 | 0.0251 / 0.0958 / 0.4829 | 0.0258 / 0.0493 / 0.2238 |
| 50 | 0.0465 / 0.1304 / 0.4800 | 0.0330 / 0.0870 / 0.2536 |
| 100 | 0.0839 / 0.1442 / 0.7545 | 0.0666 / 0.1190 / 0.2971 |
| 150 | 0.1249 / 0.2078 / 0.6694 | 0.1475 / 0.3273 / 5.1177 |
| 200 | 0.1723 / 0.3739 / 0.9091 | 0.1575 / 0.2482 / 0.4181 |

Assignment 005 medians improved at 50, 100, and 200, were roughly unchanged at 25, and regressed at 150. The 150-enemy worst sample is a likely runtime/GC outlier; do not treat this short benchmark as proof of uniformly faster simulation. All medians were at or below 0.148 ms/update. Real browser frame rate remains dominated by the headless SwiftShader compositor in CI, not these simulation medians.

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

The latest hosted natural-play browser scenario measured active / visible populations at 15 s: 24 / 20 (target 26); 30 s: 27 / 21 (target 41); 35 s during a surge: 46 / 34 (target 56); 60 s: 62 / 47 (target 65); 90 s: 80 / 63 (target 84); 120 s: 81 / 46 (target 106); and 150 s: 94 / 75 (boss-phase ordinary target 87). It peaked at 112 ordinary enemies, spawned 957, defeated 873, and spent 127.5 seconds below target. Against the previous browser sample, the 90-second checkpoint rose from 54 / 41 to 80 / 63, and the boss-arrival checkpoint from 45 / 22 to 94 / 75; time below target fell from about 136 to 127.5 seconds. At 120 s a 25-enemy deficit remained, so the high-end target is not consistently held.

That controlled standard-config browser driver won at 155.52 s, level 22, with about 138 / 160 HP and 873 kills. It had Orbit Guard rank 4 and Piercing Throw rank 4, but did not evolve Pinwheel. The boss was defeated about 5.1 simulated seconds after its 150.4 s arrival in this offense-heavy scripted run. That is short; contrast the defense-first simulation boss fight of 23.8 s. Boss fight duration varies substantially with build, and the fast browser result is a balance concern for a highly offensive build, not proof of a generally short boss encounter. The browser fast-forwards fixed steps and uses scripted movement, dash, special, and upgrades; this is not human playtesting.

Population fill remains a tradeoff: this small three-seed sample shows better target proximity early, while the two offense-first runs spent substantial time below target after high kill rates. Defensive play reached the 90–120 late target band. The safe fallback is counted in telemetry; the winning seed reported 70 placement fallbacks and 371 distant enemy recycles, so future tuning should continue watching whether far-off enemies are replaced fairly and whether entry feels visible. The successful serialized CI run reports natural browser samples at 7–9 FPS and synthetic 25/50/100/150/200 crowd samples at 9/8/7/6/5 FPS. Ticker deltas were quantized at 100 ms. Synthetic scene-update p95 CPU remained 0.5/0.6/1.7/1.3/1.8 ms respectively, while worst samples were 1.9–2.6 ms. These runs use HeadlessChrome 156 with ANGLE/Vulkan SwiftShader, so the very low whole-frame rate is specific to software rendering; it is not evidence of normal Windows GPU performance. The synthetic sweep pauses simulation, so it records no simulation cost or dropped fixed updates. No 60 FPS claim on owner hardware is made.

## Artifacts and limitations

Browser screenshots are in `artifacts/evidence/`. `stress-*.png` are real rendered synthetic stress scenes and must not be represented as natural progression. `natural-*-population.png` and standard-run screens come from standard run rules with natural spawns. Simulation continues for offscreen enemies, as needed for fair attacks and recycling; culling affects their display objects only. Headless frame rate remains a separate limitation, and ordinary desktop GPU performance still needs owner-side observation.

## Assignment 006 city-renderer check

The visual branch assembles the Kenney tile layers into one nearest-neighbor canvas texture once during renderer initialization. No per-frame tile redraw is added; the map is one static sprite beneath the existing dynamic entity layers. The browser test exercises synthetic 25/50/100/150/200 visible crowds with 1.4 seconds of warm-up per count. This is an isolated renderer stress setup, not natural horde evidence.

Current local environment: Windows Chromium `HeadlessChrome/156.0.8078.4`, 1365×900, 16 reported hardware threads, WebGL on `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))`. This run therefore measures software rendering, not the owner's regular GPU browser. JS heap metric was 20.69 MiB for each snapshot; it does not report GPU memory. The stress hook pauses simulation, so simulation p95 is 0 and dropped updates do not describe a normally advancing run.

| Visible enemies | Active sprites | FPS sample | Average frame ms | p95 frame ms | Worst frame ms | Renderer update current / p95 / worst ms |
|---:|---:|---:|---:|---:|---:|---:|
| 25 | 39 | 30 | 21.26 | 33.40 | 100.0 | 0.20 / 0.30 / 1.40 |
| 50 | 78 | 60 | 20.91 | 33.40 | 100.0 | 0.30 / 0.30 / 1.40 |
| 100 | 155 | 30 | 21.98 | 33.40 | 100.0 | 0.20 / 0.40 / 1.80 |
| 150 | 232 | 30 | 22.89 | 33.40 | 33.50 | 0.30 / 0.40 / 1.80 |
| 200 | 309 | 30 | 25.44 | 33.40 | 33.50 | 0.50 / 0.50 / 1.80 |

For context, the pre-overhaul hosted sample in the preceding table was 30/20/30/15/15 FPS and 39.96–45.54 ms average frame time. Although both identified SwiftShader and Chromium 156, they were taken in different run environments; do not interpret that difference as a controlled before/after GPU speedup. The current scene-update p95 is 0.3–0.5 ms and worst is at most 1.8 ms in this local run, so CPU-side view updates remain small. Full-frame p95 is quantized at 33.4 ms and occasional 100 ms outliers reveal the software compositor as the visible constraint here. Owner-side normal-GPU measurements remain unverified.

The standard-config browser run retained the Assignment 005 natural results: at 15/30/35/60/90/120/150 simulated seconds it recorded active/visible counts of 24/20, 27/21, 46/34 during a surge, 62/47, 80/63, 81/46, and 94/75 with the boss. It won at 155.52 simulated seconds at level 22 and 137.5/160 HP. That automated driver fast-forwards fixed simulation steps, so its variable 30–60 FPS ticker samples are not an ordinary continuous playthrough benchmark. The renderer now adds one cached city image and four small static street-light/car accents; no horde density or simulation rules changed in Assignment 006.

## Assignment 006B — collision and navigation cost

I ran the same `tests/performance.benchmark.test.ts` fixture from the parent commit and the corrected source, on this Windows x64 Node 24.22.1 runtime. Each population is seeded identically, warmed for 120 updates, then sampled for 600 fixed updates. The scenes include mixed enemy types, moving player/enemy shots, XP and floating labels. The old committed source's y=290–748 placement now sanitizes into walkable positions, so this benchmark exercises the old simulation as committed while preserving the same fixture and seed.

| Enemies | Parent median ms/update | Parent p95 | Corrected median ms/update | Corrected p95 | Corrected worst |
|---:|---:|---:|---:|---:|---:|
| 25 | 0.0287 | 0.0699 | 0.0452 | 0.1414 | 0.5828 |
| 50 | 0.0436 | 0.1252 | 0.0626 | 0.1316 | 0.6330 |
| 100 | 0.1025 | 0.1724 | 0.1601 | 0.3047 | 1.3777 |
| 150 | 0.1987 | 0.4043 | 0.2778 | 0.4614 | 0.8122 |
| 200 | 0.2477 | 0.4246 | 0.3617 | 0.5723 | 1.2147 |

The shared collision and routing work increases simulation cost, but the largest measured p95 is 0.573ms per update and the worst sample is 1.38ms in this Node run. This leaves substantial headroom within the 16.7ms fixed-update budget. These simulation figures exclude browser rendering.

The final serial Chromium stress pass used HeadlessChrome 156, 1365×900, WebGL through SwiftShader, and the existing synthetic 25–200 visible-population setup. It reported 30/30/30/30/20 sampled FPS. Average whole-frame time was 24.5/24.6/25.9/27.4/29.3ms; p95 was 33.4ms for 25–150 and 50ms at 200; worst frames were 100ms for 25–100 and 50.1ms for 150–200. Scene-update p95 stayed at 0.4–0.6ms and worst at 1.7–1.9ms. JS heap was 19.55MiB across the sweep; the browser does not expose GPU memory. The synthetic scenario pauses simulation, so zero simulation cost and zero dropped updates do not characterize a normal advancing run. This is a software-renderer measurement, not the owner's desktop GPU. The prior Assignment 006 run ranged 20.9–25.4ms average frame time and 0.3–0.5ms scene-update p95 in a separate run environment; treat it as context, not a controlled GPU speed comparison. The browser reported 16 hardware threads; exact CPU model and system memory were unavailable. Owner-side normal-GPU measurements and a human playtest of the corrected city remain outstanding.

The final standard-configuration Chromium run used normal game health, damage, XP and boss parameters with an accelerated fixed-step driver. At 15/30/35/60/90/120/150 simulated seconds, active/visible counts were 23/16 (target 27), 39/26 (41), 50/38 during a surge (59), 59/37 (64), 71/35 (82), 97/86 (106), and 66/35 during boss phase (ordinary target 87). The run peaked at 128 active, spawned 1,015, defeated 943, and spent 135.1 simulated seconds below the adaptive target. It reached level 23 and won at 159.58 simulated seconds with 124.28/160 HP; this is a deterministic automated scenario, not ordinary wall-clock play or human testing. The late boss phase decreases ordinary target pressure to make the boss encounter legible.

## Assignment 007 — baseline after difficulty and presentation changes

The current benchmark used Windows x64, Node 24.22.1, a seeded mixed-entity simulation, 120 warm-up updates, then 900 measured fixed updates per population. Each table entry is median / p95 / worst in ms per simulation update. This is comparable to the 006B fixture but uses a longer sample; it is not a controlled same-process before/after pair. It does not include Pixi rendering.

| Enemies | Current median / p95 / worst ms |
|---:|---:|
| 25 | 0.0355 / 0.1289 / 0.5172 |
| 50 | 0.0648 / 0.1493 / 0.7158 |
| 100 | 0.1510 / 0.2712 / 0.6903 |
| 150 | 0.2510 / 0.4292 / 1.0812 |
| 200 | 0.3778 / 0.6063 / 0.9359 |

These measurements remain far below the 16.7ms fixed-step budget. They do not show a broad improvement over the 006B table: the 200-enemy median is similar (0.378 versus 0.362ms) and this run's tail is noisy. Assignment 007 did not rewrite the simulation or horde director. Its renderer additions are cached/generated enemy silhouette textures, small effects, and more screen-space UI; the comparison below measures the actual browser scene in headless mode, not a desktop GPU.

The final local crowd sweep used HeadlessChrome 156 on Windows, 1365×900, WebGL ANGLE via Vulkan SwiftShader (software rendering), and a paused synthetic scene. It reported FPS / average frame / p95 / worst frame in ms; scene-update current / p95 / worst is CPU-side renderer update only. Scene update cost is not GPU/compositor cost.

| Visible enemies | Active sprites | FPS | Frame avg / p95 / worst ms | Renderer current / p95 / worst ms | JS heap |
|---:|---:|---:|---:|---:|---:|
| 25 | 39 | 60 | 27.78 / 50.1 / 100.0 | 0.3 / 0.6 / 2.3 | 22.03 MiB |
| 50 | 78 | 30 | 26.19 / 33.4 / 100.0 | 0.2 / 0.6 / 2.3 | 22.03 MiB |
| 100 | 155 | 30 | 27.32 / 33.4 / 100.0 | 0.4 / 0.6 / 2.3 | 22.03 MiB |
| 150 | 232 | 30 | 28.81 / 33.4 / 100.0 | 0.4 / 0.6 / 2.3 | 22.03 MiB |
| 200 | 309 | 30 | 30.22 / 50.0 / 66.6 | 0.7 / 0.7 / 2.2 | 22.03 MiB |

This synthetic scenario pauses simulation, so its reported simulation update cost and dropped-update count are not representative of a running horde. Frame samples are quantized by SwiftShader and show software-rendered browser limits; do not infer the owner's Windows GPU performance. The CPU-side view update stays below 1ms p95 in this sample. On the actual accelerated natural run, sampled headless FPS varied from 12 to 60, reaching 12 FPS / 83.3ms at 150.9 simulated seconds with 127 active enemies and the boss. This is not a normal wall-clock responsiveness measurement. No desktop-GPU performance session was available.

The standard-config browser run retained the horde target curve and used normal enemy health, XP, player HP, and boss parameters. It recorded 27/12 active/visible at 15s (target 28), 41/22 at 30s (41), 60/24 at 60s (66), 71/29 at 90s (84), 85/22 at 120s (105), and 127/73 at 150s including the boss (ordinary target 87). It spawned 963 enemies, defeated 881, peaked at 128 active, and won at 161.57 simulated seconds at level 22; the Gang Leader lived about 10.6 simulated seconds after arrival. The visible-count dip despite near-target active counts shows offscreen population remains a tuning concern. This was an accelerated automated browser driver, not human playtesting or a wall-clock run.

## Assignment 008 — art-pass performance check

The new work adds cached artwork at renderer initialization, bounded per-visible-enemy impact marks, dashed telegraph strokes, a small idle bob, and pickup glints. It does not change simulation, horde, collision, or difficulty rules. The redundant unconditional character sort at the end of every render was removed; depth sorting still runs when a sprite is created or its depth bucket changes.

The same Windows x64 Node 24.22.1 seeded mixed-crowd benchmark was run with 120 warm-up updates and 900 measured updates. Entries are median / p95 / worst milliseconds per fixed simulation update. The previous recorded Assignment 007 run used the same sample counts and benchmark fixture.

| Enemies | Assignment 007 baseline | Assignment 008 current |
|---:|---:|---:|
| 25 | 0.0355 / 0.1289 / 0.5172 ms | 0.0296 / 0.1093 / 0.3298 ms |
| 50 | 0.0648 / 0.1493 / 0.7158 ms | 0.0593 / 0.1326 / 0.5114 ms |
| 100 | 0.1510 / 0.2712 / 0.6903 ms | 0.1377 / 0.2432 / 0.5075 ms |
| 150 | 0.2510 / 0.4292 / 1.0812 ms | 0.2254 / 0.3470 / 0.5488 ms |
| 200 | 0.3778 / 0.6063 / 0.9359 ms | 0.3252 / 0.5223 / 1.0182 ms |

No simulation algorithm changed, so the lower medians should be treated as sample/runtime variation rather than a milestone optimization claim. The 200-enemy worst sample remains around 1 ms, well below the 16.7 ms fixed-step budget on this Node host.

The final Playwright crowd sweep used HeadlessChrome 156, Windows x64, 1365×900, WebGL via ANGLE/Vulkan SwiftShader, and 16 reported hardware threads. All entities and projectiles were visible in a paused synthetic scene. At 25/50/100/150/200 enemies, whole-frame average was 22.69/22.66/23.69/25.14/27.22 ms; frame p95 was 33.4 ms at each count; worst was 99.94/99.94/99.94/99.94/50.1 ms. Sampled FPS was 60/30/30/30/30. Renderer update current/p95/worst was 0.3/0.6/2.1, 0.2/0.5/2.1, 0.3/0.6/2.1, 0.5/0.6/2.1, and 0.6/0.7/2.0 ms respectively. JS heap was 22.03 MiB; browser-reported heap does not include GPU memory. Simulation and dropped updates are zero in this paused synthetic test and are not running-game measurements.

The previous SwiftShader sweep in Assignment 007 measured average frame times 27.78/26.19/27.32/28.81/30.22 ms and renderer p95 0.6/0.6/0.6/0.6/0.7 ms. This is a similar software-rendered environment, but not a controlled same-process A/B comparison; the lower whole-frame averages here do not establish desktop GPU performance. The accelerated standard browser run during this pass sampled 60 FPS at 15/30 seconds, then 30/60 at several later checkpoints, and reached 127 active/73 visible (including boss) at 150.9 simulated seconds. It won at 161.57 seconds, level 22, with 881 kills. It is automated fast-forwarded gameplay, not a normal wall-clock run or owner human playtest. No desktop GPU session was available.
