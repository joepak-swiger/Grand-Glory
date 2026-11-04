# Visual design — Assignment 006

## Direction and palette

GRAND GLORY pairs comic-book superhero action with crisp top-down pixel art. Royal and midnight blues anchor the game; electric cyan highlights Blue Pinwheel and interactive UI state; warm gold marks selection, road accents, and standout rewards. Concrete, muted brick, and asphalt keep the urban stage neutral. Hostile warnings stay warm red/orange. The supplied character designs are not recolored or redrawn.

## City map and scale

`src/game/stage.ts` is the single source for the 1800×1200 stage: 32-unit terrain cells, road segments, sidewalks, and six building footprints. `src/render/city-map.ts` uses the same data for the static background. The atlas uses 16×16 source tiles with 1px gutters at 2× nearest-neighbor scale. Its asphalt crops contain baked repeating divider marks, so the rendered roadbed uses a uniform authored asphalt texture; road center lines and crosswalks derive from the typed road-segment overlaps. Pavement and sidewalk still use verified atlas tiles.

Each building has one material style across its roof, trim, and edge treatment: brick, glass/concrete, or industrial. Windows or roof details stay within that style rather than rotating unrelated atlas crops. The cached canvas is one nearest-neighbor PixiJS texture, created during renderer initialization. Buildings have solid rectangular footprints, while road markings and sparse street lights remain decorative and nonblocking. One shared navigation field routes enemies around buildings, and projectiles stop at solid footprints. In development, F4 draws blocked cells and actor collision radii over the map.

## Interface conventions

Dark navy panels with restrained cyan rules frame the title, compact gameplay HUD, upgrade selection, pause menu, and results. Cream display headings use an offset blue shadow; cyan marks functional state and gold identifies the selected hero and evolution. Upgrade cards pair an original typographic symbol with a category and actual mechanical effect. No external icon set or font package was introduced. The browser suite checks title layout at desktop, laptop, and smaller viewport sizes.

## Character animation and canon

Owner-provided character and thug sprites retain their source proportions and nearest-neighbor sampling. This milestone adds no character lore. Temporary attacks remain prototypes; the Gang Leader remains an unnamed geometric enemy. Supplied profile art is mirrored horizontally for left movement, while vertical travel retains the last horizontal facing. Authentic front/back character frames and a supplied Gang Leader sprite are not available.

## Asset rights and extension

The in-game tiles come from Kenney's CC0 Roguelike Modern City pack; provenance is in `docs/ASSETS.md`. The supplied extension sheet is documented CC0 but includes baked marks, so it is omitted from the runtime art. The side-on Abandon City background is not used because it does not fit this top-down map and applicable rights remain unresolved. A future stage can provide another map definition and atlas, reusing the map renderer without changing simulation or camera logic.

## Assignment 007 presentation pass

The current camera defaults to Standard (1.08×); Wide (0.94×) and Close (1.2×) are selectable at the title. Zoom affects the rendered world and camera bounds only; collision radii and UI scale stay fixed. The supplied player art is drawn slightly larger, and temporary Gangster, Bruiser, and Gang Leader pixel silhouettes are generated once as cached nearest-neighbor textures with independent animation clocks. They are provisional silhouettes, not new owner character designs. Ordinary enemy health bars are suppressed except briefly after hits; Bruiser and boss bars remain available. Pinwheel and Orbit visuals now use a short projectile trail, multi-blade orbit shapes, and more prominent impact contrast.

The city pass adds coherent roof trim and cast shadow bands, entrance cues, deterministic manholes, asphalt wear, curb accents, and a small set of authored hydrants. They are decorative only; the collision/navigation geometry in `src/game/stage.ts` remains the source of truth and was not expanded. Sound cues are synthesized in WebAudio after user interaction; volume/mute persist locally. Reduced Motion is an opt-in setting that suppresses rapid hit flashing and motion accents. These additions deliberately avoid expensive postprocessing and external audio/art dependencies.
