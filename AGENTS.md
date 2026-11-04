# Working conventions

- This is an independent project. Never import code, art, or assets from Crystal Survivors, FF1-Dawn-AI, Rumble Studio, or other games.
- Keep owner-confirmed canon separate from prototype mechanics. Unknown character details remain `TBD`.
- Keep simulation logic independent of PixiJS and use seeded randomness for reproducible runs.
- TypeScript strictness stays enabled. Prefer small typed modules over a framework or entity-component system.
- Run `npm run typecheck`, `npm run test`, and `npm run build` after gameplay changes. Run `npm run test:e2e` for browser-facing changes when browsers are available.
- Playwright evidence belongs in `artifacts/evidence/`; recordings and build output are ignored.
- Do not add a license for original character content without owner approval.
