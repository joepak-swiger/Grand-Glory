# GRAND GLORY — Prototype

An independent, original superhero bullet-heaven prototype. **Blue Pinwheel** is the only playable hero in this slice; the title, gameplay powers, enemies, and all art are provisional. Character canon remains owner-controlled.

## Requirements

- Node.js 24 (Node 22.12+ is the minimum for the selected test toolchain)
- npm 11 or a compatible package manager

Pinned stack: PixiJS 8.22.0, Vite 8.3.5, TypeScript 7.0.2, Vitest 5.1.0, and Playwright 1.64.1. `package-lock.json` is the npm lockfile.

The city stage now uses a cached pixel-art map built from the Kenney Roguelike Modern City CC0 atlas. Building art, marked streets, and the blue/cyan/gold presentation are documented in [docs/VISUAL_DESIGN.md](docs/VISUAL_DESIGN.md) and [docs/ASSETS.md](docs/ASSETS.md).

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **WASD** or **arrow keys** to move, **Shift/Space** to dash, **Q** for the prototype special, **Esc** to pause, **1/2/3** to choose upgrades, and the mouse to choose menu options. Weapons target automatically. The title screen lets you choose **Normal** (default) or **Heroic**, a **Wide/Standard/Close** camera, sound-effect volume/mute, and reduced motion. Normal reduces incoming damage and projectile speed and gives longer invulnerability/dash recovery while keeping the same Horde Director targets; Heroic keeps the previous pressure. The crowd builds toward configured population targets and receives direction-announced mixed surges. The three-minute prototype run introduces an overtime Gang Leader if not defeated by the target time. In the development build, press **F3** for the compact crowd/performance overlay and its copyable run summary.

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
