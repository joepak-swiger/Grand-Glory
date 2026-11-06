# Stage architecture

## Current registry

`STAGE_REGISTRY` in `src/game/definitions.ts` contains the active `seoulumbus-downtown` definition: stage ID, display name, description, standard run configuration, current visual style, and eligible factions. The title flow selects this stage after the hero selection area, persists the choice locally, and currently exposes **Seoulumbus — Downtown** as the only playable stage. Two generic disabled slots communicate future extensibility without inventing stage canon. Selecting Downtown starts the existing shared geometry and encounter systems.

Map geometry remains in `src/game/stage.ts`; `src/render/city-map.ts` derives cached visuals from that shared geometry. Do not duplicate collision or navigation coordinates in stage UI data. A future stage definition should point to its map/layout and visual configuration, supported modes, faction/encounter pool, and ambient presentation. Its movement grid must be shared by simulation, renderer, projectile obstruction, and spawn validation.

## Expansive map direction

The current 1800×1200 downtown is intentionally compact. Do not enlarge one monolithic render texture to simulate exploration. For a larger city, divide authored/generated neighborhoods into deterministic world-coordinate chunks (for example, 512×512 world units). Stable chunk IDs derive from integer grid coordinates plus stage seed. Each chunk contains terrain, building footprints, props, spawn zones, and a compact navigation representation. Generation must be deterministic and neighbor-aware so roads connect across chunk edges and block silhouettes do not repeat as identical stamps.

Keep simulation state (destroyed props, dropped XP, collected caches, and relevant enemy state) keyed to world/chunk IDs, while presentation resources can unload outside a bounded camera-plus-margin region. Preserve long-lived pickups and progression when a chunk leaves view; do not silently clear state on unload. A shared hierarchical navigation scheme can route to the current player chunk, then use local steering/flow fields within loaded walkable cells. Loading, generation, and texture creation should be bounded and cached. This is a documented direction only; no large-world streaming prototype is claimed in Assignment 014.
