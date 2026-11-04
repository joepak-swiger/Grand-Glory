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

Open the local URL printed by Vite. Use **WASD** or **arrow keys** to move, **Shift/Space** to dash, **Q** for the prototype special, **Esc** to pause, and the mouse or Enter to choose menu options. Attacks target automatically. The short prototype run ends at its gang leader encounter.

## Development commands

```sh
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The `?test=1` URL uses a shorter development encounter with deterministic test hooks enabled in dev mode. It is for browser verification, not normal play.

## Project state

See [docs/STATUS.md](docs/STATUS.md), [docs/GAMEPLAY.md](docs/GAMEPLAY.md), [docs/CANON.md](docs/CANON.md), [docs/ASSETS.md](docs/ASSETS.md), and [docs/TESTING.md](docs/TESTING.md). The official repository is [joepak-swiger/Grand-Glory](https://github.com/joepak-swiger/Grand-Glory).
