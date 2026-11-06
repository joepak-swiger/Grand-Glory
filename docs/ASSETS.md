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

Assignment 008 keeps all supplied source files unchanged. The Gangster, Bruiser, and unnamed Gang Leader use newly refined original pixel silhouettes generated once as cached 48×56 canvases with four gait/encounter poses per type. Rooftop parapets, brick storefront windows, mechanical roof units, planters, bins, dashed attack warnings, local hit bursts, and rank-sensitive weapon visuals are programmatically drawn originals. They do not introduce character lore, named locations, or permanent power claims. Browser evidence is captured from the actual Vite/PixiJS game; test-run output is kept separate from the small curated evidence set.

Assignment 009 adds the owner's supplied Street Pitcher walk cycle and throwing pose, processed into `public/assets/enemies/street-pitcher-walk-cycle.png` (four 418×941 frames) and `public/assets/enemies/street-pitcher-throw-pose.png` (one 1024×1536 pose). The supplied PNG sources are black-backed RGB files; background pixels with RGB channels at or below 1 were made transparent in derived runtime copies to remove the source's near-black background speckling, while the originals remain untouched outside the repository. The supplied four-frame GIF was inspected (416×941 frames, 150 ms per frame) but is not duplicated in runtime assets; the processed strip is used for cached frame extraction. These owner-provided images are used for the Street Pitcher prototype and are not a claim about character canon. The blue ring projectiles and faceted XP gems are original renderer-generated pixel-art textures, created in code from owner-provided visual direction; no new standalone/raw artwork was imported for those items.

## Assignment 010 character handoff

The owner explicitly authorized public distribution of the supplied Milestone 010 character artwork and transparent runtime derivatives. This authorization applies to this handoff's owner-supplied character files; it does not claim a separate third-party license or change character canon. The original handoff files were preserved in the local work area during processing and were not edited. Public runtime files are derived copies in `public/assets/milestone010/`.

| Character | Runtime files | Processing and use |
|---|---|---|
| Bok-Goo | `bok-goo/walk.png`, `bok-goo/portrait.png` | Four-frame 2048×682 sheet verified as 512×682 cells; transparent flood-fill, nearest-neighbor half-scale, portrait half-scale. |
| Da-Ri | `da-ri/walk-gif.png`, `da-ri/portrait.png` | Portrait and four decoded GIF frames processed; supplied GIF has different dimensions from the other character GIFs. |
| Yo-Yo Punk | `yo-yo-punk/walk.png`, `yo-yo-punk/portrait.png` | Four-frame walk source and portrait, black background removed only where connected to frame edges. |
| Gang Boss | `gang-boss/walk.png`, `gang-boss/portrait.png` | Four-frame walk source and portrait, edge-connected black background removal. |
| Dr. Smile | `dr-smile/walk.png`, `dr-smile/portrait.png` | Four-frame walk source and portrait, edge-connected black background removal. |
| Smiler | `smiler/walk.png` | Four-frame walk sheet and edge-connected background removal. |
| Molar | `molar/walk.png` | Four-frame walk sheet and edge-connected background removal. |

`node scripts/process-milestone010-art.mjs [extracted-source-directory]` recreates runtime copies from the supplied ZIP's extracted folders. The script preserves dark interior outlines by flood-filling only near-black pixels connected to each image/frame boundary. Runtime textures use nearest-neighbor rendering and cached spritesheet frames. Source facing is treated as right; leftward movement mirrors only the sprite. Da-Ri's GIF is retained as the four-frame runtime source because no separate walk PNG sheet was supplied. No raw ZIP or extracted source archive is committed.

The Street Pitcher remains the supplied baseball thrower. Yo-Yo Punk uses her owner-supplied portrait and walk art with a provisional telegraphed yo-yo-string hazard. Gang Boss and Dr. Smile use supplied approved character art; their current attack mechanics remain prototypes. Smiler and Molar belong to the Dr. Smile faction and use simple melee pursuit. Bok-Goo and Da-Ri are playable with prototype starter weapons. The planned Tiger Mom, Dr. Eggplant, and Clownasaurus Rex entries are disabled and have no runtime art or attacks in this milestone.

Milestone 011 adds no new imported images and does not alter the owner-supplied character files. Starter Ring, Piercing Ring, Orbit Guard ring, Ricochet Ring, Ground Slam wave, and the evolution cache are original renderer-drawn temporary effects guided by owner descriptions. Boulder and spear projectiles use existing procedural PixiJS textures. These adaptations do not assert a final canonical power design. No newly supplied raw artwork or reference image was added.

The consolidated Grand Arsenal update adds no imported artwork. Weapon silhouettes, attack effects, and evolution visuals continue to use original PixiJS-rendered textures/graphics and the existing owner-approved character sprites. The weapon inspiration atlas documents mechanical references only and imports no third-party code, art, or assets.
