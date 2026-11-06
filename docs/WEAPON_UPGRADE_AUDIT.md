# Milestone 011 weapon and upgrade audit

This audit records the behavior found on the Milestone 010 merge before refactoring.

| System | Existing behavior | Deficiency addressed in Milestone 011 |
|---|---|---|
| Boulder Toss / Spear Toss quantity | `launchHeroProjectile` emitted exactly one projectile regardless of the `extra` upgrade. | Apply the same bounded additional-shot count to hero projectiles, with deterministic spread. |
| Orbit Guard | A periodic radius query damaged any enemy in range. Four small blade marks were only renderer decoration. | Replace the pulse with persistent orbiting ring entities whose displayed positions are also their collision positions. |
| Attack tempo | `tempo` only brought the current cooldown down to 0.25 seconds; it did not consistently affect subsequent weapon cooldowns. | Use a shared attack-rate multiplier in every player weapon cooldown calculation. |
| Upgrade rank descriptions | Several cards said “stronger” or “improved” without stating the actual next-rank effect. | Present explicit next rank and concrete effect text in a build-oriented card detail model. |
| Upgrade naming | `damage` was titled “Sharper Rings” although it also affected Bok-Goo and Da-Ri. | Use hero-neutral stat naming. |
| Progression breadth | There was no Ricochet Ring, Ground Slam, or Spear Sweep; extra shots had no hard count bound tied to actual rank. | Extend real weapon mechanics and keep shot counts bounded. |
| Evolution | Pinwheel evolution could be chosen as a normal level-up card and was gated by Prototype Power. | Shift evolutions to boss rewards with explicit weapon/passive prerequisites. |

The simulation remains independent of PixiJS. Renderers consume simulation state and do not decide weapon damage or collision.
