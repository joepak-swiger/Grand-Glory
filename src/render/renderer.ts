import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Enemy, SimState, Vec } from '../game/simulation';
import { BLUE_PINWHEEL, DR_SMILE_BOSS_ANIMATION, ENEMIES, GANG_LEADER, HEROES, type AnimationClipDefinition, type EnemyAnimationState, type EnemyKind, type RunConfig } from '../game/definitions';
import { buildCityMapDefinition, renderCityMap, validateCityMap } from './city-map';
import { getTerrain } from '../game/stage';
import { heroicStatMultiplier } from '../game/heroic-traits';
import { GAME_ASSETS, PROCEDURAL_ASSET_IDS } from '../game/assets';
import { BREAKABLE_CITY_PROPS } from '../game/city-props';

const W = 960; const H = 640;
export type CameraPreset = 'wide' | 'standard' | 'close';
const CAMERA_ZOOM: Record<CameraPreset, number> = { wide: 0.94, standard: 1.08, close: 1.2 };
const COLORS = { ink: 0x101923, blue: 0x36a9f4, cyan: 0x8ae5ff, thug: 0xe35c55, fast: 0xffad55, gangster: 0xe7df67, bruiser: 0x9d6979, boss: 0x9e55d7, xp: 0x7cf2b0 };
const DAMAGE_STYLE = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 13, fill: '#fff2c6', fontWeight: '700' });
interface EnemyView { sprite: Sprite; shadow: Sprite; barBack: Sprite; barFill: Sprite; kind: EnemyKind; frameSeen: number; displayedFrame: number; displayedClip: string }

function drawDashedRay(graphics: Graphics, x1: number, y1: number, x2: number, y2: number, dashLength: number, gap: number, width: number, color: number, alpha: number): void {
  const dx = x2 - x1; const dy = y2 - y1; const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length; const uy = dy / length;
  for (let start = 0; start < length; start += dashLength + gap) {
    const end = Math.min(length, start + dashLength);
    graphics.moveTo(x1 + ux * start, y1 + uy * start).lineTo(x1 + ux * end, y1 + uy * end).stroke({ color, width, alpha });
  }
}

export class GameRenderer {
  readonly app = new Application();
  readonly root = new Container();
  private readonly world = new Container();
  private readonly road = new Graphics();
  private readonly entities = new Graphics();
  private readonly decals = new Container();
  private readonly bars = new Container();
  private readonly effects = new Container();
  private readonly labels = new Container();
  private readonly collisionDebug = new Graphics();
  private readonly characters = new Container();
  private readonly generatedFrames: Texture[] = [];
  private cityAtlas?: Texture;
  private cityMapSprite?: Sprite;
  private readonly clipCache = new Map<string, Texture[]>();
  private readonly enemyViews = new Map<number, EnemyView>();
  private readonly freeEnemyViews: EnemyView[] = [];
  private readonly projectileViews: Sprite[] = [];
  private readonly pickupViews: Sprite[] = [];
  private readonly damageLabels: Text[] = [];
  private projectileViewCount = 0;
  private pickupViewCount = 0;
  private damageLabelCount = 0;
  private renderFrame = 0;
  private playerShadow?: Sprite;
  private readonly primitiveTextures = new Map<string, Texture>();
  private readonly proceduralEnemyFrames = new Map<EnemyKind, Texture[]>();
  private playerSprite?: Sprite;
  private playerFrame = -1;
  private playerTextureLoaded = false;
  private displayedHero = 'blue-pinwheel';
  private lastPlayerPosition?: Vec;
  private playerIsMoving = false;
  private playerMotion: Vec = { x: 0, y: 0 };
  private readonly sceneUpdateSamples: number[] = [];
  private sceneSampleIndex = 0;
  private sceneSampleCount = 0;
  private lastSceneUpdateMs = 0;
  private cameraX = 0;
  private cameraY = 0;
  private cameraPreset: CameraPreset = 'standard';
  private get cameraZoom(): number { return CAMERA_ZOOM[this.cameraPreset]; }
  private readonly config: RunConfig;
  private ready = false;
  private collisionDebugEnabled = false;
  private reducedMotion = false;

  private constructor(config: RunConfig) { this.config = config; this.root.addChild(this.world); this.world.addChild(this.road, this.entities, this.decals, this.bars, this.characters, this.effects, this.labels, this.collisionDebug); this.characters.sortableChildren = true; }

  static async create(host: HTMLElement, config: RunConfig): Promise<GameRenderer> {
    const renderer = new GameRenderer(config);
    await Promise.all([renderer.loadCharacterAssets(), renderer.loadCityAssets()]);
    await renderer.app.init({ background: COLORS.ink, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, resizeTo: host, preference: 'webgl' });
    renderer.createPrimitiveTextures();
    renderer.createCityMap();
    renderer.app.stage.addChild(renderer.root); host.appendChild(renderer.app.canvas); renderer.createCharacterSprites(); renderer.ready = true; return renderer;
  }

  private async loadCityAssets(): Promise<void> {
    try {
      this.cityAtlas = await Assets.load<Texture>(GAME_ASSETS.stages.seoulumbus.cityAtlas);
      this.cityAtlas.source.scaleMode = 'nearest';
    } catch (error) {
      console.warn('Unable to load city atlas; using the original street placeholder.', error);
    }
  }

  private createCityMap(): void {
    const definition = buildCityMapDefinition(this.config.arenaWidth, this.config.arenaHeight);
    const errors = validateCityMap(definition);
    if (errors.length) throw new Error(`Invalid city stage: ${errors.join(' ')}`);
    const atlas = this.cityAtlas?.source.resource as unknown as CanvasImageSource | undefined;
    const canvas = renderCityMap(atlas ?? this.createFallbackCityAtlas(), definition);
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    this.generatedFrames.push(texture);
    const sprite = new Sprite(texture);
    sprite.roundPixels = true;
    sprite.position.set(0, 0);
    this.cityMapSprite = sprite;
    this.world.addChildAt(sprite, 0);
    this.cityAtlas = undefined;
  }

  private createFallbackCityAtlas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 37 * 17; canvas.height = 28 * 17;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Fallback city texture could not be created.');
    const tiles = [
      { column: 0, row: 19, color: '#3e4a50' },
      { column: 10, row: 19, color: '#27343c' },
      { column: 0, row: 22, color: '#89918b' },
    ];
    for (const tile of tiles) {
      context.fillStyle = tile.color;
      context.fillRect(tile.column * 17, tile.row * 17, 16, 16);
    }
    return canvas;
  }

  setCollisionDebugEnabled(enabled: boolean): void { this.collisionDebugEnabled = enabled; if (!enabled) this.collisionDebug.clear(); }
  setCameraPreset(preset: CameraPreset): void { this.cameraPreset = preset; }
  setReducedMotion(enabled: boolean): void { this.reducedMotion = enabled; }

  private textureFromGraphics(draw: (graphics: Graphics) => void): Texture {
    const graphics = new Graphics(); draw(graphics);
    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy(); texture.source.scaleMode = 'nearest'; this.generatedFrames.push(texture); return texture;
  }

  private createPrototypeEnemyTexture(kind: 'gangster' | 'bruiser' | 'boss', frame: number): Texture {
    const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 56;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Prototype enemy art canvas is unavailable.');
    const px = (x: number, y: number, w: number, h: number, color: string): void => { context.fillStyle = color; context.fillRect(x, y, w, h); };
    const outline = '#171d27'; const skin = '#ddb28e'; const step = [0, 2, 0, -2][frame % 4] ?? 0;
    // Cached, original prototype sprites. Silhouettes, equipment and palette identify the role at a glance.
    if (kind === 'gangster') {
      px(12, 4, 23, 16, outline); px(15, 6, 17, 11, '#d6ad87'); px(15, 6, 18, 5, '#272c37');
      px(11, 13, 27, 3, '#222a35'); px(17, 18, 20, 20, outline); px(19, 20, 16, 17, '#344653');
      px(20, 22, 4, 8, '#536b72'); px(29, 20, 6, 5, '#b9c5c0'); px(34, 19, 9, 3, outline); px(41, 18, 3, 4, '#d1d4ca');
      px(13, 20, 6, 13, outline); px(14, 22, 4, 9, '#344653'); px(20, 36 + Math.max(0, -step), 7, 13 + step, outline); px(31, 36 + Math.max(0, step), 7, 13 - step, outline);
      px(18, 49 + step, 11, 4, outline); px(30, 49 - step, 11, 4, outline); px(20, 50 + step, 8, 2, '#c7d0cc'); px(32, 50 - step, 8, 2, '#c7d0cc');
      px(27, 12, 3, 2, '#e2c36c'); px(13, 7, 17, 2, '#68747b');
    } else if (kind === 'bruiser') {
      px(10, 5, 29, 16, outline); px(15, 7, 19, 11, skin); px(15, 7, 20, 5, '#332b31');
      px(6, 17, 38, 7, outline); px(9, 19, 32, 4, '#9b6c72'); px(10, 22, 28, 18, outline); px(13, 24, 22, 14, '#66545d');
      px(6, 20, 9, 17, '#493d47'); px(35, 20, 9, 17, '#493d47'); px(5, 29, 10, 8, '#a95550'); px(35, 29, 10, 8, '#a95550');
      px(13, 38 + Math.max(0, -step), 10, 12 + step, outline); px(28, 38 + Math.max(0, step), 10, 12 - step, outline); px(10, 49 + step, 14, 5, outline); px(27, 49 - step, 14, 5, outline);
      px(15, 28, 18, 3, '#d0ad68'); px(19, 25, 10, 8, '#88737a'); px(18, 10, 4, 3, '#b77862');
    } else {
      // Boss prototype has a broad coat, raised collar and warm sash, but no named character identity.
      px(12, 2, 25, 18, outline); px(16, 4, 17, 12, skin); px(16, 4, 20, 6, '#252832'); px(11, 12, 29, 4, '#1e2631');
      px(8, 17, 34, 25, outline); px(11, 19, 28, 21, '#713d66'); px(5, 19, 10, 19, outline); px(35, 19, 10, 19, outline);
      px(7, 22, 7, 14, '#a14750'); px(36, 22, 7, 14, '#a14750'); px(16, 21, 18, 4, '#d6a657'); px(25, 24, 5, 15, '#d6a657');
      px(15, 40 + Math.max(0, -step), 10, 10 + step, outline); px(29, 40 + Math.max(0, step), 10, 10 - step, outline); px(12, 49 + step, 15, 5, outline); px(28, 49 - step, 15, 5, outline);
      px(17, 9, 3, 2, outline); px(28, 9, 3, 2, outline); px(19, 27, 11, 4, '#f1d789');
    }
    // Shared bright edge pixels keep these temporary figures legible against city asphalt.
    px(3, 44, 5, 2, '#d7e0dc'); px(40, 44, 5, 2, '#d7e0dc');
    const texture = Texture.from(canvas); texture.source.scaleMode = 'nearest'; this.generatedFrames.push(texture); return texture;
  }

  private createPrimitiveTextures(): void {
    this.primitiveTextures.set('pixel', this.textureFromGraphics(g => g.rect(0, 0, 1, 1).fill(0xffffff)));
    this.primitiveTextures.set('shadow', this.textureFromGraphics(g => g.ellipse(24, 10, 22, 8).fill(0xffffff)));
    const ring = (double: boolean) => this.textureFromGraphics(g => {
      const centers = double ? [[13, 16], [25, 16]] : [[20, 20]];
      for (const [x, y] of centers) {
        g.circle(x!, y!, 11).stroke({ color: 0x122d5c, width: 9 });
        g.circle(x!, y!, 11).stroke({ color: 0x1269d1, width: 6 });
        g.arc(x!, y!, 10, Math.PI * 1.08, Math.PI * 1.8).stroke({ color: 0x9decff, width: 2.5 });
        g.arc(x!, y!, 10, Math.PI * 0.08, Math.PI * 0.8).stroke({ color: 0x244f90, width: 2 });
        for (let blade = 0; blade < 4; blade++) {
          const a = blade * Math.PI / 2 + Math.PI / 4;
          const ox = Math.cos(a) * 11; const oy = Math.sin(a) * 11;
          g.poly([x! + ox * 0.55, y! + oy * 0.55, x! + ox * 1.55 - Math.sin(a) * 2, y! + oy * 1.55 + Math.cos(a) * 2, x! + ox * 1.3 + Math.sin(a) * 2, y! + oy * 1.3 - Math.cos(a) * 2]).fill(0xd9f7ff);
        }
      }
      if (double) g.circle(19, 16, 2.5).fill(0x9ceaff);
      else g.circle(20, 20, 2).fill(0x9ceaff);
    });
    this.primitiveTextures.set('pinwheel', ring(false));
    this.primitiveTextures.set('piercing', ring(true));
    this.primitiveTextures.set('baseball', this.textureFromGraphics(g => {
      g.circle(16, 16, 11).fill(0x101923); g.circle(16, 16, 9).fill(0xfff5e8);
      g.arc(11, 16, 5, -Math.PI / 2, Math.PI / 2).stroke({ color: 0xd84443, width: 1.6 });
      g.arc(21, 16, 5, Math.PI / 2, Math.PI * 1.5).stroke({ color: 0xd84443, width: 1.6 });
      for (let i = 0; i < 3; i++) { const y = 12 + i * 4; g.rect(10, y, 2, 1).fill(0xd84443); g.rect(20, y, 2, 1).fill(0xd84443); }
    }));
    this.primitiveTextures.set('boulder', this.textureFromGraphics(g => { g.poly([4,20,9,7,19,3,29,9,35,21,26,31,12,29]).fill(0x77808a).stroke({color:0x252f3c,width:3});g.poly([10,10,19,5,16,14]).fill(0xc5d0d2); }));
    this.primitiveTextures.set('spear', this.textureFromGraphics(g => { g.rect(5,14,25,4).fill(0x3d2522);g.poly([30,9,39,16,30,23,25,16]).fill(0xa8bac1).stroke({color:0xe1f8ff,width:1}); }));
    this.primitiveTextures.set('chainball', this.textureFromGraphics(g => { g.circle(20,20,10).fill(0x59616b).stroke({color:0xd5e0e5,width:2});for(let i=0;i<8;i++){const a=i*Math.PI/4;g.moveTo(20+Math.cos(a)*8,20+Math.sin(a)*8).lineTo(20+Math.cos(a)*17,20+Math.sin(a)*17).stroke({color:0x343b45,width:3});} }));
    for (const [key, color, size] of [['xp-small', 0x63efd1, 8], ['xp-medium', 0x48a9ff, 10], ['xp-large', 0xd889ff, 12]] as const) {
      this.primitiveTextures.set(key, this.textureFromGraphics(g => {
        g.poly([16, 2, 26, 11, 22, 27, 16, 31, 8, 26, 5, 12]).fill(color);
        g.poly([16, 2, 16, 23, 8, 26, 5, 12]).fill(0xc6fff2);
        g.poly([16, 2, 26, 11, 16, 23]).fill(0xffffff);
        g.poly([16, 23, 22, 27, 16, 31]).fill(0x244a8e);
        g.circle(16, 16, size / 5).fill(0xffffff);
      }));
    }
    this.primitiveTextures.set('enemy-shot', this.textureFromGraphics(g => { g.circle(16, 16, 7).fill(0xffffff); g.circle(16, 16, 12).stroke({ color: 0xffffff, width: 2, alpha: 0.65 }); }));
    this.primitiveTextures.set('evolution', this.textureFromGraphics(g => { g.star(18, 18, 8, 15, 8).fill(0xffd467).stroke({ color: 0xfff3bd, width: 2 }); g.circle(18, 18, 4).fill(0x68cfff); }));
    this.primitiveTextures.set('ration', this.textureFromGraphics(g => { g.poly([4,8,17,2,30,8,29,25,17,31,5,25]).fill(0xd6ebcc).stroke({ color: 0x47725a, width: 2 }); g.moveTo(5,11).lineTo(17,16).lineTo(29,11).stroke({ color: 0xf6fff0, width: 2 }); g.rect(13,13,8,7).fill(0x3b9d63); g.rect(15,15,4,3).fill(0xffffff); }));
    this.primitiveTextures.set('recall', this.textureFromGraphics(g => { g.circle(18,18,13).stroke({ color: 0x39d8f0, width: 4 }); g.arc(18,18,8,-2.2,1.8).stroke({ color: 0xc7fbff, width: 2.5 }); g.poly([7,7,15,7,11,14]).fill(0xb7fbff); g.circle(18,18,3).fill(0x6dcbff); }));
    this.primitiveTextures.set('curry', this.textureFromGraphics(g => { g.ellipse(18,23,14,7).fill(0x7c2930).stroke({ color: 0xffb05a, width: 2 }); g.ellipse(18,18,12,8).fill(0xe9692d).stroke({ color: 0xffd36b, width: 2 }); g.circle(13,17,2).fill(0x61a851); g.circle(22,19,2).fill(0xffefb0); g.arc(18,10,4,-2.8,-0.7).stroke({ color: 0xff8e3d, width: 2 }); }));
    this.primitiveTextures.set('field-cache', this.textureFromGraphics(g => { g.roundRect(3,8,30,20,4).fill(0x276b9c).stroke({ color: 0xa9ecff, width: 2 }); g.rect(5,15,26,4).fill(0x9bc3d3); g.rect(15,13,6,8).fill(0xe8f4e8); g.circle(18,17,2).fill(0x35aef0); }));
    this.primitiveTextures.set('hero-cache', this.textureFromGraphics(g => { g.roundRect(3,8,30,20,4).fill(0x75602f).stroke({ color: 0xffdf75, width: 2.5 }); g.rect(5,15,26,4).fill(0xe9c35b); g.rect(15,13,6,8).fill(0xfff1bc); g.star(18,17,4,3,4).fill(0xffdf75); }));
    this.primitiveTextures.set(PROCEDURAL_ASSET_IDS.props.supplyBox, this.textureFromGraphics(g => { g.roundRect(3,7,34,28,3).fill(0x46576a).stroke({ color: 0xb4cfdf, width: 2 }); g.rect(5,12,30,5).fill(0x2c93bb); g.rect(5,27,30,4).fill(0x283440); g.rect(17,13,6,16).fill(0xd7e8e8); g.rect(18,18,4,5).fill(0x53dddf); }));
    this.primitiveTextures.set(PROCEDURAL_ASSET_IDS.props.deliveryBox, this.textureFromGraphics(g => { g.roundRect(4,7,26,20,2).fill(0x9a6840).stroke({ color: 0xd6a86b, width: 2 }); g.rect(14,8,5,18).fill(0xc99b5e); g.rect(9,13,15,7).fill(0xf0dfb7).stroke({ color: 0x625142, width: 1 }); g.rect(12,15,8,1).fill(0x465968); g.rect(12,17,5,1).fill(0x7a8d93); }));
    this.primitiveTextures.set(PROCEDURAL_ASSET_IDS.props.utilityContainer, this.textureFromGraphics(g => { g.roundRect(4,4,24,28,3).fill(0x46584d).stroke({ color: 0xb4c29a, width: 2 }); g.rect(7,9,18,3).fill(0x81917c); g.rect(8,15,16,10).fill(0x344139); g.rect(10,18,12,2).fill(0xe0c45f); g.circle(8,7,1).fill(0xe5d7a1); g.circle(24,7,1).fill(0xe5d7a1); }));
    for (const kind of ['bruiser', 'boss'] as const) this.proceduralEnemyFrames.set(kind, Array.from({ length: 4 }, (_, frame) => this.createPrototypeEnemyTexture(kind, frame)));
    this.primitiveTextures.set('bruiser', this.proceduralEnemyFrames.get('bruiser')![0]!);
    this.primitiveTextures.set('boss', this.proceduralEnemyFrames.get('boss')![0]!);
  }

  private async loadClip(clip: AnimationClipDefinition): Promise<Texture[]> {
    const key = `${clip.asset}:${clip.frameWidth}x${clip.frameHeight}:${clip.frameCount}`;
    const existing = this.clipCache.get(key); if (existing) return existing;
    try {
      const source = await Assets.load<Texture>(clip.asset);
      source.source.scaleMode = 'nearest';
      if (source.width < clip.frameWidth * clip.frameCount || source.height < clip.frameHeight) throw new Error(`Animation atlas is smaller than declared: ${clip.asset}`);
      const frames = Array.from({ length: clip.frameCount }, (_, index) => new Texture({ source: source.source, frame: new Rectangle(index * clip.frameWidth, 0, clip.frameWidth, clip.frameHeight) }));
      this.generatedFrames.push(...frames); this.clipCache.set(key, frames); return frames;
    } catch (error) {
      console.warn(`Unable to load prototype sprite ${clip.asset}`, error); this.clipCache.set(key, []); return [];
    }
  }

  private async loadCharacterAssets(): Promise<void> {
    const clips = [...Object.values(HEROES).flatMap(hero => [hero.animation.idle, hero.animation.move, hero.animation.damage, hero.animation.defeat, hero.animation.ability]), ...Object.values(ENEMIES).flatMap(enemy => [enemy.animation, enemy.attackAnimation]), DR_SMILE_BOSS_ANIMATION].filter((clip): clip is AnimationClipDefinition => clip !== undefined);
    await Promise.all(clips.map(clip => this.loadClip(clip)));
  }

  private createCharacterSprites(): void {
    const idle = this.framesFor(BLUE_PINWHEEL.animation.idle); const moving = this.framesFor(BLUE_PINWHEEL.animation.move);
    const still = this.framesFor(BLUE_PINWHEEL.animation.defeat);
    if (idle.length || moving.length || still.length) {
      this.playerSprite = new Sprite(idle[0] ?? moving[0] ?? still[0]);
      this.playerSprite.anchor.set(BLUE_PINWHEEL.animation.anchor.x, BLUE_PINWHEEL.animation.anchor.y);
      this.playerSprite.roundPixels = true;
      this.characters.addChild(this.playerSprite);
      this.playerTextureLoaded = true;
    }
    this.playerShadow = new Sprite(this.primitiveTextures.get('shadow'));
    this.playerShadow.anchor.set(0.5);
    this.playerShadow.width = 48; this.playerShadow.height = 18; this.playerShadow.alpha = 0.5;
    this.decals.addChild(this.playerShadow);
  }

  private framesFor(clip: AnimationClipDefinition): Texture[] {
    return this.clipCache.get(`${clip.asset}:${clip.frameWidth}x${clip.frameHeight}:${clip.frameCount}`) ?? [];
  }

  draw(state: SimState): void {
    if (!this.ready) return;
    const drawStarted = performance.now();
    const scale = Math.min(this.app.screen.width / W, this.app.screen.height / H);
    this.root.scale.set(scale); this.root.position.set((this.app.screen.width - W * scale) / 2, (this.app.screen.height - H * scale) / 2);
    const viewWidth = W / this.cameraZoom; const viewHeight = H / this.cameraZoom;
    const camX = Math.max(0, Math.min(this.config.arenaWidth - viewWidth, state.player.x - viewWidth / 2));
    const camY = Math.max(0, Math.min(this.config.arenaHeight - viewHeight, state.player.y - viewHeight / 2));
    this.cameraX = camX; this.cameraY = camY;
    this.world.scale.set(this.cameraZoom); this.world.position.set(-camX * this.cameraZoom, -camY * this.cameraZoom);
    this.updateCharacterSprites(state);
    this.updateTransientSprites(state);
    this.updateDamageLabels(state);
    const g = this.entities; g.clear();
    if (state.xpRecallTimer > 0) {
      const progress = 1 - state.xpRecallTimer / 1.35;
      const radius = 34 + progress * 270;
      const alpha = Math.max(0.08, state.xpRecallTimer / 1.35) * 0.42;
      g.circle(state.player.x, state.player.y, radius).stroke({ color: 0x57ddff, width: 5, alpha });
      if (!this.reducedMotion) g.circle(state.player.x, state.player.y, Math.max(12, radius - 18)).stroke({ color: 0xb5f7ff, width: 2, alpha: alpha * 0.68 });
    }
    for (const shot of state.projectiles) {
      if (!this.isVisible(shot.x, shot.y, 36)) continue;
      if(shot.weaponId==='chainball'&&shot.sourceEnemyId!==undefined){const boss=state.enemies.find(enemy=>enemy.id===shot.sourceEnemyId&&!enemy.dead);if(boss)g.moveTo(boss.x,boss.y).lineTo(shot.x,shot.y).stroke({color:0xafa0a0,width:4,alpha:0.92});continue;}
      if(shot.owner!=='player')continue;
      const speed = Math.hypot(shot.vx, shot.vy) || 1; const piercing = shot.weaponId === 'piercingThrow'; const length = piercing ? 35 : 25;
      const tailX = shot.x - shot.vx / speed * length; const tailY = shot.y - shot.vy / speed * length;
      const boulder=shot.weaponId==='boulder',spear=shot.weaponId==='spear';
      g.moveTo(tailX, tailY).lineTo(shot.x, shot.y).stroke({ color: boulder?0xd6b678:spear?0xe0c19c:piercing ? 0x318fff : 0x4bbdff, width: piercing||spear ? 6 : 4, alpha: 0.28 });
      g.moveTo(tailX, tailY).lineTo(shot.x, shot.y).stroke({ color: piercing||spear ? 0xbdeaff : 0xd4faff, width: 1.5, alpha: 0.78 });
    }
    for (const enemy of state.enemies) {
      if (enemy.dead || !this.isVisible(enemy.x, enemy.y, 80)) continue;
      if (enemy.kind === 'gangster' && enemy.attackState === 'ranged-telegraph') {
        const tx = enemy.x + enemy.attackDirection.x * 210; const ty = enemy.y + enemy.attackDirection.y * 210;
        drawDashedRay(g, enemy.x, enemy.y, tx, ty, 9, 13, 2.5, 0xff8b76, 0.68);
        g.circle(tx, ty, 7).stroke({ color: 0xffd9ab, width: 2, alpha: 0.8 });
      }
      if (enemy.kind === 'fastThug' && (enemy.attackState === 'melee-telegraph' || enemy.attackState === 'melee-swing')) {
        const center = Math.atan2(enemy.attackDirection.y, enemy.attackDirection.x);
        const reach = enemy.radius + 32;
        const points = [enemy.x, enemy.y];
        const slices = 8;
        for (let index = 0; index <= slices; index++) {
          const angle = center - 0.52 + index / slices * 1.04;
          points.push(enemy.x + Math.cos(angle) * reach, enemy.y + Math.sin(angle) * reach);
        }
        g.poly(points).fill({ color: enemy.attackState === 'melee-swing' ? 0xff8d59 : 0xffcc66, alpha: enemy.attackState === 'melee-swing' ? 0.34 : 0.16 });
        g.poly(points).stroke({ color: enemy.attackState === 'melee-swing' ? 0xffd6a0 : 0xffd982, width: enemy.attackState === 'melee-swing' ? 2.5 : 1.4, alpha: 0.85 });
      }
      if(enemy.kind==='yoYoPunk'&&['yoyo-telegraph','yoyo-extension','yoyo-hold','yoyo-retract'].includes(enemy.attackState)){
        const active=enemy.attackState==='yoyo-hold';
        if(active){g.moveTo(enemy.x,enemy.y).lineTo(enemy.attackTarget.x,enemy.attackTarget.y).stroke({color:0xff496e,width:12,alpha:0.28});g.moveTo(enemy.x,enemy.y).lineTo(enemy.attackTarget.x,enemy.attackTarget.y).stroke({color:0xffd3e1,width:2.5,alpha:0.95});}
        else drawDashedRay(g,enemy.x,enemy.y,enemy.attackTarget.x,enemy.attackTarget.y,9,7,2.4,0xff92bd,0.78);
        g.circle(enemy.attackTarget.x,enemy.attackTarget.y,9).fill(active?0xff6c93:0xffc9dc);
      }
      if(enemy.kind==='boss'&&enemy.bossId==='gang-boss'&&(enemy.attackState==='chain-telegraph'||enemy.attackState==='chain-swing')){
        const active=enemy.attackState==='chain-swing';g.circle(enemy.x,enemy.y,116).fill({color:active?0xff4b43:0xffbb60,alpha:active?0.16:0.08}).stroke({color:active?0xff7661:0xffd48c,width:active?3:2,alpha:0.9});
      }
      if(enemy.kind==='boss'&&enemy.bossId==='dr-smile'&&(enemy.attackState==='hazard-telegraph'||enemy.attackState==='hazard-active')){
        const active=enemy.attackState==='hazard-active';g.circle(enemy.attackTarget.x,enemy.attackTarget.y,92).fill({color:active?0xd3496b:0xf0c257,alpha:active?0.2:0.08}).stroke({color:active?0xff7892:0xffe5a3,width:active?3:2,alpha:0.94});
      }
      if (enemy.kind === 'boss' && enemy.attackState === 'ranged-telegraph') {
        const tx = enemy.x + enemy.attackDirection.x * 620; const ty = enemy.y + enemy.attackDirection.y * 620;
        drawDashedRay(g, enemy.x, enemy.y, tx, ty, 18, 14, 5, 0xffdd79, 0.88);
      }
      if (enemy.kind === 'boss' && (enemy.attackState === 'charge-telegraph' || enemy.attackState === 'charging')) {
        const length = GANG_LEADER.chargeSpeed * (GANG_LEADER.chargeActiveEnd - GANG_LEADER.chargeEnd);
        const tx = enemy.x + enemy.attackDirection.x * length; const ty = enemy.y + enemy.attackDirection.y * length;
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: enemy.attackState === 'charging' ? 0xff6a5e : 0xffa260, width: 28, alpha: enemy.attackState === 'charging' ? 0.2 : 0.15 });
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: enemy.attackState === 'charging' ? 0xff6a5e : 0xffd16d, width: 3, alpha: 0.9 });
        g.circle(tx, ty, 13).stroke({ color: 0xffd16d, width: 3, alpha: 0.85 });
      }
      if (enemy.hitFlash > 0) {
        const alpha = Math.min(0.9, enemy.hitFlash * 5);
        g.poly([enemy.x, enemy.y - enemy.radius - 3, enemy.x + 4, enemy.y - 4, enemy.x + enemy.radius + 3, enemy.y, enemy.x + 4, enemy.y + 4, enemy.x, enemy.y + enemy.radius + 3, enemy.x - 4, enemy.y + 4, enemy.x - enemy.radius - 3, enemy.y, enemy.x - 4, enemy.y - 4]).fill({ color: enemy.kind === 'boss' ? 0xffd47b : 0xe9fbff, alpha });
      }
      if (enemy.elite) g.star(enemy.x, enemy.y - enemy.radius - 25, 5, 7, 4).fill(0xffd05e).stroke({ color: 0xfff0ad, width: 1 });
    }
    const p = state.player; const flash = p.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0;
    if ((p.infernoCurryTimer ?? 0) > 0) {
      const angle = Math.atan2(p.facing.y, p.facing.x); const reach = 150; const half = 0.62; const points = [p.x, p.y];
      for (let index = 0; index <= 10; index++) { const a = angle - half + index / 10 * half * 2; points.push(p.x + Math.cos(a) * reach, p.y + Math.sin(a) * reach); }
      g.poly(points).fill({ color: 0xff682f, alpha: this.reducedMotion ? 0.12 : 0.2 });
      g.poly(points).stroke({ color: 0xffbd54, width: 3, alpha: this.reducedMotion ? 0.48 : 0.8 });
      if (!this.reducedMotion) for (let streak = 0; streak < 3; streak++) { const offset = Math.sin(state.elapsed * 15 + streak) * 8; g.moveTo(p.x + Math.cos(angle + 1.3) * offset, p.y + Math.sin(angle + 1.3) * offset).lineTo(p.x + Math.cos(angle) * (55 + streak * 33), p.y + Math.sin(angle) * (55 + streak * 33)).stroke({ color: streak === 0 ? 0xff5a2d : 0xffdd67, width: 4 - streak, alpha: 0.62 }); }
    }
    if (p.dashTimer > 0 && Math.hypot(this.playerMotion.x, this.playerMotion.y) > 0) {
      for (let streak = 1; streak <= 3; streak++) {
        const startX = p.x - this.playerMotion.x * streak * 0.035; const startY = p.y - this.playerMotion.y * streak * 0.035;
        g.moveTo(startX, startY).lineTo(startX - this.playerMotion.x * 0.04, startY - this.playerMotion.y * 0.04).stroke({ color: 0x8be4ff, width: 4 - streak * 0.6, alpha: 0.24 });
      }
    }
    for (const wave of state.waves) {
      const color = 0xe7c681; const alpha = Math.max(0.12, wave.life * 1.2);
      if (wave.halfAngle >= Math.PI) g.circle(wave.x, wave.y, Math.max(2, wave.radius)).stroke({ color, width: 4, alpha });
      else { const angle = Math.atan2(wave.direction.y, wave.direction.x); g.arc(wave.x, wave.y, Math.max(2, wave.radius), angle - wave.halfAngle, angle + wave.halfAngle).stroke({ color, width: 4, alpha }); }
    }
    if(p.attackVisualTimer>0&&p.attackVisual && p.attackVisual !== 'ground-slam'){
      const angle=Math.atan2(p.facing.y,p.facing.x);const reach=p.attackVisual==='club-sweep'?88:p.attackVisual==='spear-sweep'?122:170;const width=p.attackVisual==='club-sweep'?0.95:p.attackVisual==='spear-sweep'?1.28:0.15;
      const points=[p.x,p.y];for(let i=0;i<=10;i++){const a=angle-width+i/10*(width*2);points.push(p.x+Math.cos(a)*reach,p.y+Math.sin(a)*reach);}
      const color=p.attackVisual==='club-sweep'?0xd0a266:0xbfeeff;
      g.poly(points).fill({color,alpha:0.22});g.poly(points).stroke({color:p.attackVisual==='club-sweep'?0xf5d18b:0xf1fcff,width:3,alpha:0.75});
    }
    if (p.orbit) {
      const radius = (48 + Math.min(12, p.weaponRanks.orbitGuard * 2) + (p.evolutions.includes('eternal-halo') ? 18 : 0)) * heroicStatMultiplier(p.passiveRanks, 'area');
      for (const ring of p.orbitRings) {
        const x = p.x + Math.cos(ring.angle) * radius; const y = p.y + Math.sin(ring.angle) * radius;
        // The hollow center and bright metal edge keep orbit weapons legible over both road and sidewalk.
        const alpha = ring.active ? 1 : 0.2;
        g.circle(x, y, 11).stroke({ color: 0x168ce0, width: 5, alpha: 0.96 * alpha });
        g.circle(x - 1, y - 1, 8).stroke({ color: 0xb8f2ff, width: 1.5, alpha: 0.94 * alpha });
        g.circle(x + 3, y - 4, 2).fill({ color: 0xffffff, alpha: 0.98 * alpha });
      }
    }
    if (!this.playerSprite) {
      const color = flash ? 0xffffff : COLORS.blue;
      g.roundRect(p.x - 14, p.y - 10, 28, 38, 10).fill(color); g.circle(p.x, p.y - 18, 12).fill(flash ? 0xffffff : 0xd8f3ff);
    }
    if (p.invulnerable > 0) g.circle(p.x, p.y + 4, 35).stroke({ color: flash ? 0xffffff : 0x7ee5ff, width: 2, alpha: flash ? 0.7 : 0.38 });
    if (state.specialTimer > 0) { const radius = this.reducedMotion ? 205 : 220 * (1 - state.specialTimer / 0.7); g.circle(p.x, p.y, radius).stroke({ color: COLORS.cyan, width: this.reducedMotion ? 2 : 4, alpha: this.reducedMotion ? 0.4 : 0.75 }); if (!this.reducedMotion) g.circle(p.x, p.y, radius * 0.82).stroke({ color: 0xffffff, width: 1, alpha: 0.34 }); }
    this.updateCollisionDebug(state);
    this.lastSceneUpdateMs = performance.now() - drawStarted;
    this.sceneUpdateSamples[this.sceneSampleIndex] = this.lastSceneUpdateMs;
    this.sceneSampleIndex = (this.sceneSampleIndex + 1) % 300;
    this.sceneSampleCount = Math.min(300, this.sceneSampleCount + 1);
  }

  private updateCollisionDebug(state: SimState): void {
    const g = this.collisionDebug;
    if (!this.collisionDebugEnabled) return;
    g.clear();
    const cell = state.stage.cellSize;
    // Development overlay: translucent red cells are blocked; faint green cells are walkable.
    for (let row = 0; row < state.stage.rows; row++) for (let column = 0; column < state.stage.columns; column++) {
      const x = column * cell; const y = row * cell;
      if (getTerrain(state.stage, column, row) === 'building') g.rect(x, y, Math.min(cell, state.stage.width - x), Math.min(cell, state.stage.height - y)).fill({ color: 0xff4f57, alpha: 0.15 });
      else if ((column + row) % 2 === 0) g.rect(x, y, cell, cell).fill({ color: 0x56e28b, alpha: 0.025 });
    }
    for (const building of state.stage.buildings) g.rect(building.x * cell, building.y * cell, building.width * cell, building.height * cell).stroke({ color: 0xff6266, width: 3, alpha: 0.95 });
    g.circle(state.player.x, state.player.y, 18).stroke({ color: 0x8af7ff, width: 3, alpha: 1 });
    for (const enemy of state.enemies) if (!enemy.dead && this.isVisible(enemy.x, enemy.y, 40)) g.circle(enemy.x, enemy.y, enemy.radius).stroke({ color: 0xffce68, width: 2, alpha: 0.85 });
  }

  private isVisible(x: number, y: number, margin = 48): boolean {
    return x >= this.cameraX - margin && x <= this.cameraX + W / this.cameraZoom + margin && y >= this.cameraY - margin && y <= this.cameraY + H / this.cameraZoom + margin;
  }

  private updateTransientSprites(state: SimState): void {
    for (let i = 0; i < this.projectileViewCount; i++) this.projectileViews[i]!.renderable = false;
    let used = 0;
    for (const shot of state.projectiles) {
      if (!this.isVisible(shot.x, shot.y, 28)) continue;
      let sprite = this.projectileViews[used];
      const textureKey = shot.weaponId==='baseball'?'baseball':shot.weaponId==='boulder'?'boulder':shot.weaponId==='spear'?'spear':shot.weaponId==='chainball'?'chainball':shot.owner==='enemy'?'enemy-shot':['piercingThrow','ricochetRing'].includes(shot.weaponId??'')?'piercing':'pinwheel';
      const texture = this.primitiveTextures.get(textureKey)!;
      if (!sprite) { sprite = new Sprite(texture); sprite.anchor.set(0.5); sprite.roundPixels = true; this.effects.addChild(sprite); this.projectileViews.push(sprite); }
      sprite.texture = texture; sprite.renderable = true; sprite.position.set(shot.x, shot.y - (shot.arcHeight ?? 0)); sprite.rotation = shot.owner === 'enemy' && shot.weaponId!=='chainball' ? 0 : shot.spin;
      const rank = shot.weaponId === 'piercingThrow' ? state.player.weaponRanks.piercingThrow : state.player.weaponRanks.pinwheel;
      const size = shot.weaponId==='baseball'?17:shot.weaponId==='chainball'?29:shot.weaponId==='boulder'?28:shot.weaponId==='spear'?34:shot.owner==='enemy'?23:shot.weaponId==='ricochetRing'?30:shot.weaponId==='piercingThrow'?30+Math.min(5,rank):27+Math.min(8,rank*1.5)+(state.player.evolvedPinwheel?3:0);
      sprite.width = size; sprite.height = size;
      sprite.tint = ['baseball','boulder','spear','chainball'].includes(shot.weaponId??'')?0xffffff:shot.owner==='enemy'?0xff715f:state.player.evolvedPinwheel?0xf8e391:COLORS.cyan;
      used++;
    }
    this.projectileViewCount = used;

    for (let i = 0; i < this.pickupViewCount; i++) this.pickupViews[i]!.renderable = false;
    used = 0;
    for (const pickup of state.pickups) {
      if (pickup.consumed) continue;
      if (!this.isVisible(pickup.x, pickup.y, 20)) continue;
      let sprite = this.pickupViews[used];
      const kind = pickup.kind ?? 'xp';
      const textureKey = kind === 'xp' ? pickup.value >= 80 ? 'xp-large' : pickup.value >= 32 ? 'xp-medium' : 'xp-small' : kind === 'boss-evolution' ? 'evolution' : kind === 'recovery-rations' ? 'ration' : kind === 'xp-recall' ? 'recall' : kind === 'inferno-curry' ? 'curry' : kind === 'hero-cache' ? 'hero-cache' : 'field-cache';
      const texture = this.primitiveTextures.get(textureKey)!;
      if (!sprite) { sprite = new Sprite(texture); sprite.anchor.set(0.5); sprite.roundPixels = true; this.effects.addChild(sprite); this.pickupViews.push(sprite); }
      const glint = this.reducedMotion ? 0 : 1 + Math.sin(state.elapsed * 8 + pickup.id) * 0.12;
      sprite.renderable = true; sprite.texture = texture; sprite.position.set(pickup.x, pickup.y); sprite.alpha = pickup.recalling ? 0.88 : 1; sprite.rotation = this.reducedMotion ? 0 : kind === 'boss-evolution' || kind === 'xp-recall' ? state.elapsed * 0.7 : Math.sin(state.elapsed * 2.5 + pickup.id) * 0.12; const size = kind === 'boss-evolution' || kind === 'hero-cache' ? 30 : kind === 'field-cache' ? 26 : kind === 'xp-recall' ? 22 : kind === 'recovery-rations' || kind === 'inferno-curry' ? 23 : pickup.value >= 80 ? 21 : pickup.value >= 32 ? 16 : 12; sprite.width = size * glint; sprite.height = size * glint; sprite.tint = 0xffffff;
      used++;
    }
    for (const prop of state.props) {
      if (prop.destroyed || !this.isVisible(prop.x, prop.y, 28)) continue;
      const definition = BREAKABLE_CITY_PROPS[prop.kind];
      let sprite = this.pickupViews[used];
      if (!sprite) { sprite = new Sprite(this.primitiveTextures.get(definition.assetId)!); sprite.anchor.set(0.5); sprite.roundPixels = true; this.effects.addChild(sprite); this.pickupViews.push(sprite); }
      sprite.texture = this.primitiveTextures.get(definition.assetId)!; sprite.renderable = true; sprite.alpha = 1; sprite.rotation = 0; sprite.position.set(prop.x, prop.y); sprite.width = definition.width; sprite.height = definition.height; sprite.tint = 0xffffff;
      used++;
    }
    this.pickupViewCount = used;
  }

  private updateDamageLabels(state: SimState): void {
    for (let i = 0; i < this.damageLabelCount; i++) this.damageLabels[i]!.renderable = false;
    let used = 0;
    for (const number of state.numbers) {
      if (!this.isVisible(number.x, number.y, 24)) continue;
      let label = this.damageLabels[used];
      if (!label) { label = new Text({ text: number.text, style: DAMAGE_STYLE }); label.anchor.set(0.5); this.labels.addChild(label); this.damageLabels.push(label); }
      if (label.text !== number.text) label.text = number.text;
      label.position.set(number.x, number.y); label.alpha = Math.min(1, number.life * 2); label.renderable = true;
      used++;
    }
    this.damageLabelCount = used;
  }

  private updateCharacterSprites(state: SimState): void {
    const p = state.player;
    if (this.lastPlayerPosition) {
      const dx = p.x - this.lastPlayerPosition.x; const dy = p.y - this.lastPlayerPosition.y;
      this.playerMotion.x = dx * 60; this.playerMotion.y = dy * 60; this.playerIsMoving = Math.hypot(dx, dy) > 0.3;
      this.lastPlayerPosition.x = p.x; this.lastPlayerPosition.y = p.y;
    } else { this.playerIsMoving = false; this.lastPlayerPosition = { x: p.x, y: p.y }; }

    let needsSort = false;
    if (this.playerShadow) {
      this.playerShadow.position.set(p.x, p.y + 28);
      const idlePulse = !this.reducedMotion && !this.playerIsMoving ? Math.sin(state.elapsed * 3) * 1.2 : 0;
      this.playerShadow.width = 54 + idlePulse; this.playerShadow.height = 18;
    }

    if (this.playerSprite) {
      const anim = HEROES[p.heroId].animation;
      if(this.displayedHero!==p.heroId){this.displayedHero=p.heroId;this.playerSprite.anchor.set(anim.anchor.x,anim.anchor.y);this.playerFrame=-1;}
      const clip = state.status === 'defeat' ? anim.defeat : state.specialTimer > 0 ? anim.ability : p.invulnerable > 0.45 ? anim.damage : this.playerIsMoving ? anim.move : anim.idle;
      const frames = this.framesFor(clip);
      if (frames.length) {
        this.playerFrame = state.status === 'defeat' ? 0 : Math.floor(state.elapsed * 1000 / clip.frameDurationMs) % frames.length;
        this.playerSprite.texture = frames[this.playerFrame] ?? frames[0]!;
        const [heroWidth,heroHeight]=p.heroId==='bok-goo'?[78,104]:p.heroId==='da-ri'?[84,84]:[68,91];
        if (this.playerSprite.width !== heroWidth) this.playerSprite.width = heroWidth;
        if (this.playerSprite.height !== heroHeight) this.playerSprite.height = heroHeight;
        const bob = this.reducedMotion ? 0 : Math.sin(state.elapsed * (this.playerIsMoving ? 18 : 3)) * (this.playerIsMoving ? 1.25 : 0.6);
        this.playerSprite.position.set(p.x, p.y + 28 + bob);
        const flip = anim.mirrorLeft && p.horizontalFacing === 'left';
        this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x) * (flip ? -1 : 1);
        this.playerSprite.tint = !this.reducedMotion && p.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0 ? 0xffffff : p.invulnerable > 0.45 ? 0xffb5b5 : 0xffffff;
        this.playerSprite.alpha = state.status === 'defeat' ? 0.78 : 1;
        this.playerSprite.rotation = state.status === 'defeat' ? 0.28 : 0;
        // Keep the hero readable above the crowd; this only affects draw order, never world coordinates or hitboxes.
        if (this.playerSprite.zIndex !== 10_000) { this.playerSprite.zIndex = 10_000; needsSort = true; }
      }
    }

    this.renderFrame++;
    for (const enemy of state.enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (enemy.dead) continue;
      if (!view && this.isVisible(enemy.x, enemy.y, 72)) {
        view = this.freeEnemyViews.pop() ?? this.createEnemyView(enemy);
        if (view.kind !== enemy.kind) { view.kind = enemy.kind; view.sprite.texture = this.enemyTexture(enemy); this.setEnemySpriteSize(view.sprite, enemy); view.displayedFrame = -1; view.displayedClip = ''; }
        this.enemyViews.set(enemy.id, view); needsSort = true;
      }
      if (!view) continue;
      view.frameSeen = this.renderFrame;
      const visible = this.isVisible(enemy.x, enemy.y, 72);
      const showHealth = enemy.kind === 'boss' || enemy.elite === true || enemy.kind === 'bruiser' || enemy.kind==='yoYoPunk' || enemy.hitFlash > 0;
      view.sprite.renderable = visible; view.shadow.renderable = visible; view.barBack.renderable = visible && showHealth; view.barFill.renderable = visible && showHealth;
      if (!visible) continue;
      const baseClip = enemy.kind === 'boss' && enemy.bossId === 'dr-smile' ? DR_SMILE_BOSS_ANIMATION : ENEMIES[enemy.kind].animation;
      const throwing = enemy.attackState === 'ranged-telegraph' && Boolean(ENEMIES[enemy.kind].attackAnimation);
      const clip = throwing ? ENEMIES[enemy.kind].attackAnimation : baseClip;
      if (clip) {
        if (view.displayedClip !== clip.asset) { view.displayedClip = clip.asset; view.displayedFrame = -1; }
        const frames = this.framesFor(clip);
        const frame = throwing ? 0 : Math.floor(enemy.animationTime * 1000 / clip.frameDurationMs) % Math.max(1, frames.length);
        if (frames[frame] && frame !== view.displayedFrame) { view.sprite.texture = frames[frame]!; view.displayedFrame = frame; }
        if (enemy.kind === 'gangster') { view.sprite.width = throwing ? 63 : 47; view.sprite.height = throwing ? 95 : 106; }
      } else {
        const frames = this.proceduralEnemyFrames.get(enemy.kind);
        if (frames?.length) {
          const metadata = ENEMIES[enemy.kind].prototypeAnimation;
          const animationState: EnemyAnimationState = enemy.hitFlash > 0 ? 'damage' : enemy.attackState === 'ranged-telegraph' || enemy.attackState === 'charge-telegraph' ? 'telegraph' : enemy.attackState === 'charging' ? 'attacking' : enemy.attackState === 'recovering' ? 'recovery' : 'walking';
          const stateFrames = metadata?.states[animationState] ?? [0];
          const frameInState = animationState === 'walking' ? Math.floor(enemy.animationTime * 1000 / (metadata?.frameDurationMs ?? 200)) % stateFrames.length : 0;
          const frame = stateFrames[frameInState] ?? 0;
          if (frames[frame] && frame !== view.displayedFrame) { view.sprite.texture = frames[frame]!; view.displayedFrame = frame; }
        }
      }
      view.sprite.position.set(enemy.x, enemy.y + enemy.radius + 9);
      view.sprite.scale.x = Math.abs(view.sprite.scale.x) * (enemy.horizontalFacing === 'left' ? -1 : 1);
      view.sprite.tint = enemy.hitFlash > 0 ? 0xffb5a8 : 0xffffff;
      const bucket = enemy.kind === 'boss' ? 9_000 : Math.floor((enemy.y + enemy.radius + 9) / 4);
      if (view.sprite.zIndex !== bucket) { view.sprite.zIndex = bucket; needsSort = true; }
      view.shadow.position.set(enemy.x, enemy.y + enemy.radius + 5);
      view.shadow.width = enemy.kind === 'smiler' ? 38 : enemy.kind === 'molar' ? 34 : 40;
      view.shadow.height = enemy.kind === 'molar' ? 13 : 16;
      const barWidth = enemy.kind === 'boss' ? 108 : enemy.elite ? 46 : 36;
      const barY = enemy.kind === 'boss' ? enemy.y - 66 : enemy.y - enemy.radius - 19;
      view.barBack.position.set(enemy.x - barWidth / 2, barY);
      view.barBack.width = barWidth; view.barBack.height = enemy.kind === 'boss' ? 8 : 5;
      view.barFill.position.set(enemy.x - barWidth / 2 + 2, barY + 2);
      view.barFill.width = Math.max(0, (barWidth - 4) * Math.max(0, enemy.health / enemy.maxHealth));
      view.barFill.height = enemy.kind === 'boss' ? 4 : 3;
      view.barFill.tint = enemy.kind === 'boss' ? 0xf28bcb : enemy.elite ? 0xffd05e : enemy.kind === 'fastThug' ? COLORS.fast : enemy.kind === 'gangster' ? COLORS.gangster : enemy.kind === 'bruiser' ? COLORS.bruiser : COLORS.thug;
    }
    for (const [id, view] of this.enemyViews) if (view.frameSeen !== this.renderFrame) {
      view.sprite.renderable = false; view.shadow.renderable = false; view.barBack.renderable = false; view.barFill.renderable = false;
      this.enemyViews.delete(id); this.freeEnemyViews.push(view);
    }
    if (needsSort) this.characters.sortChildren();
  }

  private enemyTexture(enemy: Enemy): Texture {
    const clip = ENEMIES[enemy.kind].animation;
    if (clip) return this.framesFor(clip)[0] ?? this.primitiveTextures.get('bruiser')!;
    return this.proceduralEnemyFrames.get(enemy.kind)?.[0] ?? this.primitiveTextures.get('bruiser')!;
  }

  private setEnemySpriteSize(sprite: Sprite, enemy: Enemy): void {
    const size = enemy.kind === 'boss' ? [110, 148] : enemy.kind === 'bruiser' ? [60, 64] : enemy.kind === 'gangster' ? [47, 106] : enemy.kind==='yoYoPunk'?[58,78]:enemy.kind==='smiler'?[56,76]:enemy.kind==='molar'?[58,76]:enemy.kind === 'fastThug' ? [43, 58] : [41, 55];
    sprite.width = size[0]!; sprite.height = size[1]!;
    // The supplied sheets contain transparent top/bottom padding. Pin each animation to its measured foot line.
    sprite.anchor.set(0.5, enemy.kind === 'smiler' ? 292 / 341 : enemy.kind === 'molar' ? 254 / 341 : 1);
  }

  private createEnemyView(enemy: Enemy): EnemyView {
    const sprite = new Sprite(this.enemyTexture(enemy)); sprite.anchor.set(0.5, 1); sprite.roundPixels = true; this.setEnemySpriteSize(sprite, enemy); this.characters.addChild(sprite);
    const shadow = new Sprite(this.primitiveTextures.get('shadow')!); shadow.anchor.set(0.5); shadow.alpha = 0.42; this.decals.addChild(shadow);
    const barBack = new Sprite(this.primitiveTextures.get('pixel')!); barBack.anchor.set(0, 0); barBack.tint = 0x161c24; this.bars.addChild(barBack);
    const barFill = new Sprite(this.primitiveTextures.get('pixel')!); barFill.anchor.set(0, 0); this.bars.addChild(barFill);
    return { sprite, shadow, barBack, barFill, kind: enemy.kind, frameSeen: this.renderFrame, displayedFrame: -1, displayedClip: '' };
  }

  getAnimationDiagnostics(state?: SimState): { playerTextureLoaded: boolean; cityMapLoaded: boolean; cityMapSize: { width: number; height: number } | null; playerFrame: number; moving: boolean; playerFacing: string; cameraZoom: number; enemySprites: number; renderFps: number; renderFrameMs: number; enemies: Array<{ id: number; kind: EnemyKind; facing: string; frame: number; scaleX: number; hasSprite: boolean }> } {
    const enemies = state ? state.enemies.filter(enemy => !enemy.dead).map(enemy => {
      const view = this.enemyViews.get(enemy.id); const clip = ENEMIES[enemy.kind].animation;
      const generatedFrames = this.proceduralEnemyFrames.get(enemy.kind);
      return { id: enemy.id, kind: enemy.kind, facing: enemy.horizontalFacing, frame: clip ? Math.floor(enemy.animationTime * 1000 / clip.frameDurationMs) % clip.frameCount : generatedFrames?.length ? Math.floor(enemy.animationTime * 5) % generatedFrames.length : 0, scaleX: view?.sprite.scale.x ?? (enemy.horizontalFacing === 'left' ? -1 : 1), hasSprite: Boolean(clip || generatedFrames?.length) };
    }) : [];
    const cityMapSize = this.cityMapSprite ? { width: this.cityMapSprite.texture.width, height: this.cityMapSprite.texture.height } : null;
    return { playerTextureLoaded: this.playerTextureLoaded, cityMapLoaded: cityMapSize !== null, cityMapSize, playerFrame: this.playerFrame, moving: this.playerIsMoving, playerFacing: state?.player.horizontalFacing ?? 'right', cameraZoom: this.cameraZoom, enemySprites: this.enemyViews.size, renderFps: Math.round(this.app.ticker.FPS), renderFrameMs: Math.round(this.app.ticker.deltaMS * 100) / 100, enemies };
  }

  getPerformanceDiagnostics(state?: SimState): { rendererUpdateMs: number; rendererP95Ms: number; rendererWorstMs: number; activeEnemies: number; visibleEnemies: number; projectiles: number; pickups: number; damageTexts: number; sprites: number } {
    const samples = this.sceneUpdateSamples.slice(0, this.sceneSampleCount).sort((a, b) => a - b);
    const p95Index = Math.min(samples.length - 1, Math.floor(samples.length * 0.95));
    let activeEnemies = 0; let visibleEnemies = 0;
    if (state) for (const enemy of state.enemies) if (!enemy.dead) {
      activeEnemies++;
      if (enemy.x >= this.cameraX - 40 && enemy.x <= this.cameraX + W / this.cameraZoom + 40 && enemy.y >= this.cameraY - 60 && enemy.y <= this.cameraY + H / this.cameraZoom + 60) visibleEnemies++;
    }
    return { rendererUpdateMs: this.lastSceneUpdateMs, rendererP95Ms: samples[p95Index] ?? 0, rendererWorstMs: samples[samples.length - 1] ?? 0, activeEnemies, visibleEnemies, projectiles: state?.projectiles.length ?? 0, pickups: state?.pickups.length ?? 0, damageTexts: state?.numbers.length ?? 0, sprites: this.enemyViews.size + this.projectileViewCount + this.pickupViewCount + this.damageLabelCount + Number(Boolean(this.playerSprite)) };
  }

  screenToWorld(clientX: number, clientY: number): Vec { return { x: clientX, y: clientY }; }
  destroy(): void {
    for (const texture of this.generatedFrames) texture.destroy(false);
    this.generatedFrames.length = 0; this.clipCache.clear(); this.primitiveTextures.clear();
    this.enemyViews.clear(); this.freeEnemyViews.length = 0; this.projectileViews.length = 0; this.pickupViews.length = 0; this.damageLabels.length = 0;
    this.app.destroy(true, { children: true });
  }
}
