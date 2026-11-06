# Assignment 012 — Elite Enemies

Elites are marked on the existing enemy entity with an `elite` flag; they retain their original enemy kind, sprite, faction, and attack behavior. An elite has 2× its base HP, 1.12× damage, 1.5× XP, and reduced knockback. The renderer adds a gold star and a wider gold health bar, so the visual cue does not depend on tinting the supplied character art.

The first elite is scheduled at 42 seconds, then the director checks every 58 seconds. At most two elites are active. Each scheduled elite attempt is suppressed if the enemy limit is reached or all reserved cache capacity is already committed. Elites use the existing seeded Horde Director choice and may be drawn from Street Gang kinds before Dr. Smile's faction is encountered; Smilers and Molars become eligible afterward. Their attacks are not changed by the elite flag.

Each spawned elite reserves a cache slot. On defeat it guarantees a collectible Field or Hero Cache, selected with the documented Fortune quality roll. If the preferred cache tier is at its own cap, the other tier is used. Field and Hero caches remain on the ground, pause gameplay when touched, and use the existing upgrade eligibility and six-slot rules. Hero Cache provides recovery and special charge after the player makes the upgrade choice.

This is a bounded first pass. Elite spawn spacing and rewards need additional human playtesting at long Endless durations; future work should tune frequencies from owner feedback rather than raising elite damage by default.
