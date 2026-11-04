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

All other street, projectile, UI, effect, and boss graphics are drawn from original code-based placeholder shapes. Thugs and the gang leader are prototype gameplay concepts. No third-party sprites, sound, or font assets are included.
