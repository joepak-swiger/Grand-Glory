# GRAND GLORY — Prototype

An independent, original superhero bullet-heaven prototype. Choose **Blue Pinwheel**, **Bok-Goo (The Boulder)**, or **Da-Ri (The Obsidian)** and survive escalating factions in Endless Mode. Combat move names and abilities are gameplay prototypes; character canon remains owner-controlled.

## Requirements

- Node.js 24 (Node 22.12+ is the minimum for the selected test toolchain)
- npm 11 or a compatible package manager

Pinned stack: PixiJS 8.22.0, Vite 8.3.5, TypeScript 7.0.2, Vitest 5.1.0, and Playwright 1.64.1. `package-lock.json` is the npm lockfile.

The city stage uses a cached pixel-art map built from the Kenney Roguelike Modern City CC0 atlas, with authored brick/glass/industrial roof treatments and a restrained upper-left lighting direction. Owner-supplied character artwork for the three heroes, Street Pitcher, Yo-Yo Punk, Gang Boss, Dr. Smile, Smilers, and Molars is preserved in processed transparent runtime assets; publication of the Milestone 010 handoff art is explicitly owner-authorized. Blue Pinwheel throws provisional blue ring weapons, Bok-Goo starts with a broad club sweep, and Da-Ri starts with a piercing spear thrust. Defeated enemies leave persistent XP gems that collect only when approached. Street Pitcher throws baseballs; other ordinary gang/Smile-faction enemies use melee or the Yo-Yo Punk's telegraphed line hazard. Defeating bosses advances Endless Mode rather than ending the run. See [docs/VISUAL_DESIGN.md](docs/VISUAL_DESIGN.md), [docs/ASSETS.md](docs/ASSETS.md), and [docs/GAMEPLAY.md](docs/GAMEPLAY.md) for visual specifications, provenance, and controls.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **WASD** or **arrow keys** to move, **Shift/Space** to dash, **Q** for the prototype special, **Esc** to pause, **1/2/3** to choose upgrades, and the mouse or 1–3 keys to select a hero. Weapons target automatically; melee attacks follow hero-specific facing and reach. The title screen lets you choose a hero, **Normal** (default) or **Heroic**, a **Wide/Standard/Close** camera, sound-effect volume/mute, and reduced motion. Normal reduces incoming damage and projectile speed; Heroic keeps the higher pressure. The horde escalates through Street Gang enemies, then blends the Dr. Smile faction after the first boss. Boss defeats advance the endless run; pause to retire and see results. The development build offers **F3** diagnostics and **F4** collision overlay.

### Windows one-click launcher

Double-click **`PLAY GRAND GLORY.bat`** in this folder. It uses the folder's current location, checks Node.js/npm, runs `npm ci` if Vite dependencies are missing, finds an available localhost port (or opens an already-running GRAND GLORY server), waits for Vite to be ready, then opens the default browser. Keep the terminal open while playing; press **Ctrl+C** or close that terminal window to stop the server. It does not kill other processes or bypass Node manager trust checks. If NVM reports `NVM4306`, resolve that warning through your normal NVM setup before retrying.

## Development commands

```sh
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run benchmark:sim
```

The `?test=1` URL uses a shorter development encounter with deterministic test hooks enabled in dev mode. It is for browser verification, not normal play. `?test=normal` uses the standard run with those development-only test hooks for natural-spawn browser diagnostics.

## Project state

See [docs/STATUS.md](docs/STATUS.md), [docs/GAMEPLAY.md](docs/GAMEPLAY.md), [docs/CANON.md](docs/CANON.md), [docs/ASSETS.md](docs/ASSETS.md), [docs/VISUAL_DESIGN.md](docs/VISUAL_DESIGN.md), and [docs/TESTING.md](docs/TESTING.md). The official repository is [joepak-swiger/Grand-Glory](https://github.com/joepak-swiger/Grand-Glory).
