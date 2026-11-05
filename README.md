# GRAND GLORY — Prototype

An independent, original superhero bullet-heaven prototype. **Blue Pinwheel** is the only playable hero in this slice; the title, gameplay powers, enemies, and all art are provisional. Character canon remains owner-controlled.

## Requirements

- Node.js 24 (Node 22.12+ is the minimum for the selected test toolchain)
- npm 11 or a compatible package manager

Pinned stack: PixiJS 8.22.0, Vite 8.3.5, TypeScript 7.0.2, Vitest 5.1.0, and Playwright 1.64.1. `package-lock.json` is the npm lockfile.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **WASD** or **arrow keys** to move, **Shift/Space** to dash, **Q** for the prototype special, **Esc** to pause, **1/2/3** to choose upgrades, and the mouse to choose menu options. Weapons target automatically. The three-minute prototype run introduces an overtime Gang Leader if not defeated by the target time.

## Development commands

```sh
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The `?test=1` URL uses a shorter development encounter with deterministic test hooks enabled in dev mode. It is for browser verification, not normal play. `?test=normal` uses the standard run with those development-only test hooks for natural-spawn browser diagnostics.

## Project state

See [docs/STATUS.md](docs/STATUS.md), [docs/GAMEPLAY.md](docs/GAMEPLAY.md), [docs/CANON.md](docs/CANON.md), [docs/ASSETS.md](docs/ASSETS.md), and [docs/TESTING.md](docs/TESTING.md). The official repository is [joepak-swiger/Grand-Glory](https://github.com/joepak-swiger/Grand-Glory).
