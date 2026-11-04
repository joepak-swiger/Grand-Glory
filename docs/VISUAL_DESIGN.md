# Visual design — Assignment 006

## Direction and palette

GRAND GLORY pairs comic-book superhero action with crisp top-down pixel art. Royal and midnight blues anchor the game; electric cyan highlights Blue Pinwheel and interactive UI state; warm gold marks selection, road accents, and standout rewards. Concrete, muted brick, and asphalt keep the urban stage neutral. Hostile warnings stay warm red/orange. The supplied character designs are not recolored or redrawn.

## City map and scale

`src/render/city-map.ts` defines the stage in 32-world-unit cells sourced from 16×16 Kenney tiles (2× nearest-neighbor scale). Grid size follows the configured arena bounds. Tile data is layered as pavement base, concrete, asphalt, sidewalks, and lane markings; tile-backed building blocks and original curb/lane paint finish the cached static canvas. Cross streets and building types vary across the configured map so the camera reveals more of the neighborhood during movement.

The assembled canvas becomes one nearest-neighbor PixiJS texture during renderer initialization. Static map composition is not repeated per frame. Characters, shadows, health bars, projectiles, pickups, boss warnings, and floating text remain in their existing dynamic layers. Buildings and roadside details are decorative and nonblocking; the art does not imply map collision or pathfinding.

## Interface conventions

Dark navy panels with restrained cyan rules frame the title, compact gameplay HUD, upgrade selection, pause menu, and results. Cream display headings use an offset blue shadow; cyan marks functional state and gold identifies the selected hero and evolution. Upgrade cards pair an original typographic symbol with a category and actual mechanical effect. No external icon set or font package was introduced. The browser suite checks title layout at desktop, laptop, and smaller viewport sizes.

## Character animation and canon

Owner-provided character and thug sprites retain their source proportions and nearest-neighbor sampling. This milestone adds no character lore. Temporary attacks remain prototypes; the Gang Leader remains an unnamed geometric enemy. Supplied profile art is mirrored horizontally for left movement, while vertical travel retains the last horizontal facing. Authentic front/back character frames and a supplied Gang Leader sprite are not available.

## Asset rights and extension

The in-game tiles come from Kenney's CC0 Roguelike Modern City pack; provenance is in `docs/ASSETS.md`. The supplied extension sheet is documented CC0 but includes baked marks, so it is omitted from the runtime art. The side-on Abandon City background is not used because it does not fit this top-down map and applicable rights remain unresolved. A future stage can provide another map definition and atlas, reusing the map renderer without changing simulation or camera logic.
