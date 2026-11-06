# Seoulumbus city props

## Authored decorative props

`src/render/city-map.ts` places a small drink vending machine with the accurate Hangul label **음료** and a restrained **포장마차** street-food tent on authored sidewalk cells. Both are original code-drawn decorations, nonblocking, and excluded from the stage collision model. Existing planters/bins are also decorative. Placement is authored and deterministic; these props are sparse to keep combat readable. There are no commercial marks or claims that the interiors are accessible.

## Breakable prop definitions

`src/game/city-props.ts` registers three nonblocking breakables: Field Supply Box, Delivery Package, and Utility Container. Each definition provides a stable ID, dimensions, HP, destructible flag, collision class, urban-utility drop table, chance scale, visual asset ID, break cue, and walkable spawn requirement. The simulation places four supply boxes, two delivery packages, and one utility container at deterministic nearest-walkable positions. They use existing pickups and reward/Fortune logic; they do not introduce a second drop implementation. Existing player weapon projectiles damage each prop once per hit event. Destroyed props are stateful, so camera movement cannot respawn or farm rewards during a run.

All current props have `collision: none`; the sprite is small and ground-anchored, not an implied wall. They do not modify the shared enemy navigation field or create blocked streets. The cached renderer reuses the supply-box texture and creates each additional procedural prop texture once. Most street furniture remains decorative. The populated food stand is never destructible.

## Current limitations

The vending machine and pojangmacha are static renderer artwork rather than registered simulation entities. Destructible props use original procedural placeholder textures and the existing urban utility reward table; dedicated pixel-art prop sheets and unique break animations/audio remain future work. Prop placement is fixed for the current downtown layout rather than generated for future stages.
