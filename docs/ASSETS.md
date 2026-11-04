# Asset register

The following PNG files were supplied directly by the project owner and are approved for publication in this public repository. Originals are preserved byte-for-byte; the game references the imported PNGs directly. No license grant beyond the owner's publication approval is implied.

| In-game use | Repository asset | Notes |
|---|---|---|
| Blue Pinwheel title portrait | `public/assets/blue-pinwheel/select-portrait.png` | Complete framed portrait; menu only, not a transparent gameplay sprite. |
| Blue Pinwheel idle and provisional movement | `public/assets/blue-pinwheel/idle-cycle.png` | Four 543×724 RGBA frames in a 2172×724 strip. The source is an idle cycle; using it for movement is a temporary fallback, not a supplied walk cycle. |
| Blue Pinwheel single-pose fallback | `public/assets/blue-pinwheel/standing-pose.png` | One 611×906 RGBA standing pose, despite “Sprite Sheet” in the source filename. Used for damage/ability/defeat fallback states. |
| Thug walk | `public/assets/enemies/thug-walk-cycle.png` | Four 543×724 RGBA frames in a 2172×724 strip. |
| Fast Thug walk | `public/assets/enemies/fast-thug-bat-walk-cycle.png` | Four 543×724 RGBA frames in a 2172×724 strip; separate atlas and animation clock. |

The character strips are right-facing source art. Left-facing display uses horizontal mirroring. Vertical movement retains the last horizontal direction. Authentic front-facing, back-facing, and left-facing source animation has not been supplied. Mirroring is a display fallback, not a claim that a distinct left-facing design exists. Enemy walk strips and the Blue Pinwheel strip keep their own simulation time; textures are loaded once and reused.

## City environment

| In-game use | Repository asset | Source and terms |
|---|---|---|
| City stage tile atlas | `public/assets/city/kenney-city.png` | Kenney, “Roguelike Modern City”; user-supplied handoff. The original CC0 notice is retained in `public/assets/city/LICENSE.txt`. Source: <https://opengameart.org/content/roguelike-modern-city-pack>. Handoff SHA-256: `8f31898af10f55160d55bebe5fbc183718e00e13de152f9b14bf916190edbfe0`. |

The atlas is 628×475 and uses 16×16 tiles with a 1-pixel gutter. Its alpha channel was checked directly; `roguelikeCity_magenta.png` is the alpha-bearing source. The similarly named `roguelikeCity_transparent.png` is RGB and is not used. Individual source tiles are cropped to assemble the stage; the supplied town sample is not used as a background. The map is cached as one nearest-neighbor texture.

The supplied rubberduck `city_extension.png` was reviewed. Its handoff records CC0 1.0 and <https://opengameart.org/content/modern-city-extension>, but the sheet includes baked `JVBot Inc.` marks in its lower tile rows, so it is not included in runtime assets. The Abandon City background is side-on scenery and is excluded: it does not fit the top-down stage, and applicable publisher terms remain unresolved. The optional Factory tileset was not imported.

Street composition, uniform asphalt, lane paint, crosswalks, coherent brick/glass/industrial roofs, curb accents, and all projectile, UI, effect, and boss placeholder graphics are original code-based artwork. The atlas's road crops were excluded from the roadbed because they contain baked lane markings that tiled into repeated stripes; atlas pavement and sidewalk crops remain in use. Thugs and the Gang Leader remain prototype gameplay concepts. No third-party sprites, sound, or font assets were added. Blue Pinwheel and thug artwork remains owner-supplied and owner-approved for public publication; this does not establish additional character lore or canon powers.

Assignment 007 adds original renderer-generated pixel silhouettes for the ranged Gangster, Bruiser, and unnamed Gang Leader, plus original code-drawn projectile trails, Orbit Guard blades, impact cues, and small authored city details. These are cached game textures or lightweight graphics, not imported art files. The audio cues are synthesized with WebAudio and contain no third-party recordings or sound library. Owner-provided character sprites are preserved unchanged. All temporary powers and enemy/boss designs remain prototype content; no new canon was introduced.
