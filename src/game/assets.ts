/** Stable runtime asset IDs. Source artwork lives in the local-only art-library. */
export const GAME_ASSETS = {
  heroes: {
    bluePinwheel: {
      idle: '/assets/game/heroes/blue-pinwheel/idle-cycle.png',
      portrait: '/assets/game/heroes/blue-pinwheel/portrait.png',
      standing: '/assets/game/heroes/blue-pinwheel/standing-pose.png',
    },
    bokGoo: {
      portrait: '/assets/game/heroes/bok-goo/portrait.png',
      walk: '/assets/game/heroes/bok-goo/walk.png',
    },
    daRi: {
      portrait: '/assets/game/heroes/da-ri/portrait.png',
      walk: '/assets/game/heroes/da-ri/walk.png',
    },
  },
  enemies: {
    thug: { walk: '/assets/game/enemies/street-gang/thug/walk.png' },
    fastThug: { walk: '/assets/game/enemies/street-gang/fast-thug/walk.png' },
    streetPitcher: {
      walk: '/assets/game/enemies/street-gang/street-pitcher/walk.png',
      attack: '/assets/game/enemies/street-gang/street-pitcher/attack.png',
    },
    yoYoPunk: {
      portrait: '/assets/game/enemies/street-gang/yo-yo-punk/portrait.png',
      walk: '/assets/game/enemies/street-gang/yo-yo-punk/walk.png',
    },
    smiler: { walk: '/assets/game/enemies/dr-smile-faction/smiler/walk.png' },
    molar: { walk: '/assets/game/enemies/dr-smile-faction/molar/walk.png' },
  },
  bosses: {
    gangBoss: {
      portrait: '/assets/game/bosses/gang-boss/portrait.png',
      walk: '/assets/game/bosses/gang-boss/walk.png',
    },
    drSmile: {
      portrait: '/assets/game/bosses/dr-smile/portrait.png',
      walk: '/assets/game/bosses/dr-smile/walk.png',
    },
  },
  stages: {
    seoulumbus: { cityAtlas: '/assets/game/stages/seoulumbus/tiles/kenney-city.png' },
  },
} as const;

export const HERO_PORTRAITS = {
  'blue-pinwheel': GAME_ASSETS.heroes.bluePinwheel.portrait,
  'bok-goo': GAME_ASSETS.heroes.bokGoo.portrait,
  'da-ri': GAME_ASSETS.heroes.daRi.portrait,
} as const;

/** Stable IDs for code-drawn, cached Pixi textures (not standalone image files). */
export const PROCEDURAL_ASSET_IDS = {
  props: {
    supplyBox: 'supply-box', deliveryBox: 'delivery-box', utilityContainer: 'utility-container',
    vendingMachine: 'vending-machine', pojangmacha: 'pojangmacha',
  },
  pickups: { ration: 'ration', xpRecall: 'xp-recall', curry: 'curry', fieldCache: 'field-cache', heroCache: 'hero-cache' },
  effects: { pinwheelImpact: 'pinwheel-impact', ringTrail: 'ring-trail', bossImpact: 'boss-impact' },
  ui: { heroPortraitFrame: 'hero-portrait-frame', stageCard: 'stage-card' },
} as const;
