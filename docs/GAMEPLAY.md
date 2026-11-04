# Prototype gameplay

## Controls

- Move: WASD / arrow keys
- Dash: Shift or Space
- Prototype special: Q (earned through combat)
- Pause/resume: Escape
- Upgrade/menu selection: click or Enter

Blue Pinwheel and both thug sprite strips use supplied right-facing source art. While the player or an enemy deliberately moves left/right, its sprite turns horizontally to match. Vertical movement and idle retain the last horizontal facing (right at run start). Knockback never determines enemy facing. Boss facing follows pursuit or its locked attack aim. This uses mirroring only; no authentic front/back animation frames are currently available.

The Gang Leader has no supplied character art and remains a geometric gameplay placeholder.

## Run and prototype balance

The standard run targets three minutes. Spawn pressure rises during the opening 2:30, when the unnamed prototype Gang Leader arrives. Defeating the boss ends the run in victory. At 3:00 the HUD labels the encounter **OVERTIME**; the boss fight continues for up to one additional minute. If the boss is still alive at 4:00, the Gang Leader escapes and the run ends in defeat. Losing all health ends the run immediately. `?test=1` uses a shorter deterministic encounter for browser verification.

Blue Pinwheel's **Pinwheel (Prototype)** automatically throws rotating pinwheel-shaped geometric projectiles at the nearest enemy. The **Orbit Guard (Prototype)** unlocks from upgrades and deals short-range periodic damage. **Prototype Special — Canon TBD** is a temporary area attack. These are gameplay experiments, not canon.

Thug and Fast Thug enemies pursue the player and deal one full contact-damage hit when contact begins. Player-wide 0.8-second invulnerability prevents repeated or simultaneous contact from draining health every frame. Enemies spawn on the valid walkable street perimeter, at least 180 world units from the player. They drop XP, which is collected automatically nearby. A level-up pauses simulation until one of three upgrades is chosen.

The Gang Leader alternates a aimed projectile, a wind-up charge, and recovery. A highlighted line shows the projectile's locked aim or the charge lane before it begins. The charge deals one hit if it intersects the player; the projectile has a collision radius that includes its visible body. Both attacks are temporary prototype mechanics.
