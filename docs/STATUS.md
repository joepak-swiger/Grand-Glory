# Project status

## Milestone 001 — first playable slice

The playable vertical slice is published in the official public repository at <https://github.com/joepak-swiger/Grand-Glory>. Pull request #1 is open and unmerged. The `main` branch preserves the initial repository baseline; substantive work is on `feature/first-playable`.

## Milestone 002 — foundation corrections

Implemented locally on the existing PR branch:

- Enemy spawns sample all four edges of the playable street, remain in valid bounds, and reject points within 180 world units of the player.
- Ordinary contact damage applies one full enemy damage value per hit. Shared 0.8-second player invulnerability prevents a group of touching enemies from dealing a frame-scaled trickle or stacking hits instantly.
- Gang Leader projectile and charge warnings align with their attack vectors. The charge now moves along the warned path and deals a single contact hit when it connects.
- The boss appears at 2:30. The 3:00 target starts a visible overtime phase; defeating the boss still wins, while an undefeated boss escapes and ends the run in defeat after 4:00.
- HUD, results, and gameplay documentation describe the run rules.

### Verification status

- Local on the current foundation work: typecheck passed; all 29 simulation tests passed; production build passed.
- GitHub CI for this foundation commit is pending. The previous PR revision's CI passed before these changes.
- Deterministic browser automation covers the playable flow. A human has not completed a normal three-minute run yet.
- Simulation performance measurements are separate from browser-rendering performance; no new renderer benchmark has been taken for these corrections.

## Still planned

- Import the supplied Blue Pinwheel artwork after source package inspection and update the title screen, character renderer, and animation.
- Add real-browser checks for asset loading and animation playback, and capture new rendered evidence.
- Conduct and document a representative normal-duration playthrough.
- Final art, sound, touch controls, additional heroes/stages, and a longer run remain future work.
