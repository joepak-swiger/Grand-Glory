# Assignment 012 — Pickups

All pickups are described by the typed registry in `src/game/pickups.ts`. Each entry records its stable ID, category, rarity, icon key, contact radius, duration, active cap, despawn time, collection action, eligible drop sources, sound, animation cue, and player-facing description. XP piles remain their own value-bearing entity type; reward caches are not XP gems recolored.

## Active pickups

| Pickup | Effect | Sources / behavior |
|---|---|---|
| Experience Gem | Awards its stored XP only when reached. Wisdom multiplies XP at collection time. | Ordinary and elite enemy defeats; persistent, merged only with nearby XP on walkable ground. |
| Recovery Rations | Restore `max(35, 20% max HP)`, capped at maximum health. | Rare ordinary/elite drops and breakable supply boxes. At full HP the ration remains until used or its 150-second lifetime expires. |
| XP Recall | Recalls all outstanding XP piles, including piles across blocked city routes; exact pile values are awarded once when each completes its recall. | Rare utility drop. Gems animate toward the hero or use a short recall pulse when a building blocks the route. Wisdom and level-up thresholds are handled normally. |
| Inferno Curry | Eight seconds of forward-facing flame, dealing 11 base damage per target every 0.42 seconds within a 150-unit cone. | Rare utility drop. Uses the selected hero's facing, Might, and area traits. Each target has an independent bounded cooldown. |
| Field Cache | Pauses gameplay and offers one eligible normal upgrade choice. | Elite reward; retained on the ground until touched. |
| Hero Cache | As Field Cache, with a modest recovery and special-charge bonus after the choice. | Rare elite reward; Fortune raises its chance. |
| Boss Cache | Existing boss-reward system: offers an eligible evolution or a recovery alternative. | Boss defeat. Evolution rank and passive prerequisites are unchanged. |

## Drop tables

The base utility roll is a single seeded roll. Ordinary enemies have 1.2% Recovery Rations, 0.12% XP Recall, and 0.15% Inferno Curry chances. Elite enemies use 8%, 3.5%, and 4%, respectively. Breakable supply boxes use 12%, 3.5%, and 3.5%. Heroic scales these chances to 55% of Normal. Fortune adds 8% relative chance per rank, capped at 40% relative bonus. XP is still guaranteed separately on enemy defeat. Elites guarantee a cache: they reserve bounded cache capacity before spawning, and use the other cache tier if the preferred tier has reached its cap.

Cache quality starts at 22% Hero Cache chance and gains 5 percentage points per Fortune rank, capped at 55%. This cache quality roll is separate from the utility-drop table.

## Breakable city props

Four authored, nonblocking supply boxes are placed in open walkable areas of the existing city. Player projectiles can break them; the box disappears and uses the seeded prop drop table. Boxes do not contribute invisible collision, obstruct enemy flow, or respawn during the run. They use a cached original renderer texture rather than a generated asset per instance.

## Accounting and limits

XP remains accounted through `xpSpawned`, `xpCollected`, active pile value, merge count, and `xpLost`. XP Recall does not create or destroy value. Utility pickups have category-specific active caps and lifetimes; caches do not despawn. XP piles remain spatially distinct unless within the existing 20-unit merge radius and not separated by a building. The map-wide recall is an explicit global pickup effect; ordinary XP attraction remains local.

## Future concepts

Crisis Pulse, Stasis Field, Heroic Surge, Second Wind, and Fortune Token are documented as unavailable concepts in the registry module. They are absent from active drops.

## Assignment 013 presentation

Touch feedback now announces pickups in a compact HUD toast. Cache reward panels use a gold-accented reveal entrance, distinct Field/Hero cache labels, and clearer reward wording; gameplay remains paused until the player chooses. XP Recall adds a short cyan expanding signal around the hero while recalled gems travel or resolve through the existing blocked-route pulse. The visual pulse is cosmetic: pickup state and XP accounting remain simulation-owned. Reduced Motion removes the secondary pulse ring and the global CSS setting shortens the panel/toast transitions.
