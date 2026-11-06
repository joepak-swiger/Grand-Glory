# Art library and preservation workflow

## Current inventory

The Assignment 014 pre-migration raster scan found **338 PNG/GIF images** in the project tree: 199 Git-tracked, 74 untracked, and 65 ignored. The inventory records exact relative paths, byte sizes, formats, SHA-256 hashes, and Git state in [`asset-inventory-014.json`](asset-inventory-014.json). A separate migration record lists all 74 locally moved files and their preservation copies in [`asset-migration-014.json`](asset-migration-014.json).

The 74 untracked source/concept files were copied into the ignored `art-library/` by character/stage identity. A second copy is in `art-library/_backups/assignment-014/public-assets/`. The source and copy hashes match the inventory. The 20 tracked runtime image/license paths were moved with Git renames and remain byte-identical. Existing ignored material was not touched. No file was removed or overwritten. No inaccessible art was found during the scan.

The library and its backup are both on the same local workspace/device. This is recoverable from accidental edits or in-repository rearrangement, but it is **not** an off-device backup. Copy the library to separate storage before replacing or servicing this device. `.gitignore` protects source art from accidental commits; Git ignore does not itself protect or back up files.

Newly discovered art remains local-only. The owner previously authorized publication of the specifically identified Milestone 010 handoff art; that authorization does not cover newly discovered files. Do not copy source-library files to `public/` or commit them without confirming their publication status.

## Layout

```text
art-library/                         # local-only; excluded from Git and Vite watcher
  characters/{heroes,enemies,bosses}/<identity>/source-files/
  environments/city/source-files/
  unclassified/source-files/
  _backups/assignment-014/public-assets/  # byte-verified local recovery copy
public/assets/game/                  # only assets needed by the playable build
  heroes/<identity>/
  enemies/<faction>/<identity>/
  bosses/<identity>/
  stages/seoulumbus/tiles/
```

Source filenames and revisions are preserved. When two source files have the same basename, keep their identity directories distinct; if they must share a folder, prefix the copy with its original parent identity and record its original relative path and hash. Never use a processed runtime file as the only source.

## Runtime processing

`src/game/assets.ts` provides typed stable asset URLs. Runtime derivatives belong under the identity-specific `public/assets/game/` folder and are documented in `docs/ASSETS.md`. Record source path and SHA-256, processing script/version, frame dimensions/count, background/transparency treatment, anchor, scale, and publication status. Process to a new destination. Keep source art untouched. Use nearest-neighbor scaling for pixel art and validate transparent edges, dark outlines, frame alignment, and anchors in a browser before updating definitions.

Vite serves public runtime assets and watches normal source/code changes. The ignored `art-library/` is outside `public/` and excluded from Vite watching, preventing large reference sheets and locked source files from triggering HMR or production copies. Runtime asset changes remain HMR-visible.

## Import checklist

1. Inventory source files and compute SHA-256 before processing.
2. Preserve each source and revision unchanged; make a separate backup before moving originals.
3. Confirm publication permission and licenses for every source/derivative intended for GitHub.
4. Derive optimized, transparent runtime assets into the correct identity path.
5. Add URLs to `GAME_ASSETS`, update metadata and all consumers.
6. Add frame/asset registry tests and inspect actual browser rendering.
7. Record source-to-runtime provenance and verify source hashes still match.
