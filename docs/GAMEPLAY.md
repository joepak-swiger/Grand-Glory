# Prototype gameplay

## Controls

- Move: WASD / arrow keys
- Dash: Shift or Space
- Prototype special: Q (earned through combat)
- Pause/resume: Escape
- Upgrade/menu selection: click or Enter

Blue Pinwheel and both thug sprite strips use supplied right-facing source art. While the player or an enemy deliberately moves left/right, its sprite turns horizontally to match. Vertical movement and idle retain the last horizontal facing (right at run start). Knockback never determines enemy facing. Boss facing follows pursuit or its locked attack aim. This uses mirroring only; no authentic front/back animation frames are currently available.

The Gang Leader has no supplied character art and remains a geometric gameplay placeholder with a small directional cue; it enters from a safe visible horizontal position and its facing follows pursuit and locked attack aim. Supplied right-facing thug sprites and the hero's right-facing profile mirror only the individual character sprite when facing left.

## Run and prototype balance

The standard run targets three minutes. The Horde Director grows its active target from 8 to 52 over 2:30, introduces batches of two or three enemies, and starts prototype surges every 35 seconds. It keeps spawns just beyond camera edges when the street bounds permit and enforces a 90 ordinary-enemy cap. The Gang Leader arrives at 2:30; ordinary pressure is reduced during the boss phase. Defeating the 460-HP prototype boss ends the run in victory. At 3:00 the HUD labels the encounter **OVERTIME**; the boss fight continues for up to one additional minute. If the boss is still alive at 4:00, the Gang Leader escapes and the run ends in defeat. Losing all health ends the run immediately. Boss health was reduced from 760 after the standard-config browser run left 252 HP when the original tuning reached the escape deadline. Player starting health is a temporary 140-point tuning value; thug contact values were reduced during this horde pass (Thug 7, Fast Thug 6, Gangster 6, Bruiser 14). `?test=1` uses a shorter deterministic encounter for browser verification. `?test=normal` runs the ordinary 180-second configuration with dev-only browser diagnostics.

Blue Pinwheel's **Pinwheel (Prototype)** automatically throws rotating pinwheel-shaped geometric projectiles at the nearest enemy. **Orbit Guard (Prototype)** is a short-range recurring attack; **Piercing Throw (Prototype)** is a separate, automatic piercing projectile. **Prototype Special — Canon TBD** is a temporary area attack. Weapon rank cards strengthen attacks through five ranks. Pinwheel Evolution is offered once only after Pinwheel rank 5 and Prototype Power rank 2; it adds piercing and faster firing. This entire kit is a gameplay experiment, not canon.

Thug and Fast Thug enemies pursue the player and deal one full contact-damage hit when contact begins. Gangsters keep their distance and telegraph a three-shot projectile fan. Bruisers have high health and contact damage but move slowly. Prototype enemy separation prevents complete pile-ups. Player-wide 0.8-second invulnerability prevents repeated or simultaneous contact from draining health every frame. Enemies spawn in safe camera-adjacent street regions and drop XP; nearby XP piles merge without losing value and drift toward Blue Pinwheel within collection range. A level-up pauses simulation until one of three distinct eligible upgrades is chosen by click or keys 1–3; an eligible weapon choice, survival/utility choice, and combat-stat choice are offered when those pools have options. Upgrade choices track ranks and filter capped options. The boss phase reduces the regular horde cap to 68% of the configured cap.

The Gang Leader alternates a aimed projectile, a wind-up charge, and recovery. A highlighted line shows the projectile's locked aim or the charge lane before it begins. The charge deals one hit if it intersects the player; the projectile has a collision radius that includes its visible body. Both attacks are temporary prototype mechanics.
