import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Enemy, SimState, Vec } from '../game/simulation';
import { BLUE_PINWHEEL, ENEMIES, GANG_LEADER, type AnimationClipDefinition, type EnemyKind, type RunConfig } from '../game/definitions';

const W = 960; const H = 640;
const COLORS = { ink: 0x101923, road: 0x303a45, sidewalk: 0x78838a, line: 0xe4bf57, blue: 0x36a9f4, cyan: 0x8ae5ff, thug: 0xe35c55, fast: 0xffad55, gangster: 0xe7df67, bruiser: 0x9d6979, boss: 0x9e55d7, xp: 0x7cf2b0 };
const DAMAGE_STYLE = new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: 13, fill: '#fff2c6', fontWeight: '700' });
interface EnemyView { sprite: Sprite; shadow: Sprite; barBack: Sprite; barFill: Sprite; kind: EnemyKind; frameSeen: number; displayedFrame: number }

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
  private readonly characters = new Container();
  private readonly generatedFrames: Texture[] = [];
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
  private playerSprite?: Sprite;
  private playerFrame = -1;
  private playerTextureLoaded = false;
  private lastPlayerPosition?: Vec;
  private playerIsMoving = false;
  private playerMotion: Vec = { x: 0, y: 0 };
  private readonly sceneUpdateSamples: number[] = [];
  private sceneSampleIndex = 0;
  private sceneSampleCount = 0;
  private lastSceneUpdateMs = 0;
  private cameraX = 0;
  private cameraY = 0;
  private readonly config: RunConfig;
  private ready = false;

  private constructor(config: RunConfig) { this.config = config; this.root.addChild(this.world); this.world.addChild(this.road, this.entities, this.decals, this.bars, this.characters, this.effects, this.labels); this.characters.sortableChildren = true; }

  static async create(host: HTMLElement, config: RunConfig): Promise<GameRenderer> {
    const renderer = new GameRenderer(config);
    await renderer.loadCharacterAssets();
    await renderer.app.init({ background: COLORS.ink, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, resizeTo: host, preference: 'webgl' });
    renderer.createPrimitiveTextures();
    renderer.app.stage.addChild(renderer.root); host.appendChild(renderer.app.canvas); renderer.createCharacterSprites(); renderer.drawRoad(); renderer.ready = true; return renderer;
  }

  private textureFromGraphics(draw: (graphics: Graphics) => void): Texture {
    const graphics = new Graphics(); draw(graphics);
    const texture = this.app.renderer.generateTexture(graphics);
    graphics.destroy(); texture.source.scaleMode = 'nearest'; this.generatedFrames.push(texture); return texture;
  }

  private createPrimitiveTextures(): void {
    this.primitiveTextures.set('pixel', this.textureFromGraphics(g => g.rect(0, 0, 1, 1).fill(0xffffff)));
    this.primitiveTextures.set('shadow', this.textureFromGraphics(g => g.ellipse(24, 10, 22, 8).fill(0xffffff)));
    this.primitiveTextures.set('xp', this.textureFromGraphics(g => g.poly([8, 0, 16, 8, 8, 16, 0, 8]).fill(0xffffff)));
    this.primitiveTextures.set('pinwheel', this.textureFromGraphics(g => {
      for (let blade = 0; blade < 4; blade++) { const a = blade * Math.PI / 2; g.poly([12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11, 12 + Math.cos(a + 0.65) * 3, 12 + Math.sin(a + 0.65) * 3, 12 + Math.cos(a + 1.4) * 8, 12 + Math.sin(a + 1.4) * 8]).fill(0xffffff); }
      g.circle(12, 12, 3).fill(0xffffff);
    }));
    this.primitiveTextures.set('piercing', this.textureFromGraphics(g => g.poly([0, 10, 17, 10, 17, 5, 28, 14, 17, 23, 17, 18, 0, 18]).fill(0xffffff)));
    this.primitiveTextures.set('enemy-shot', this.textureFromGraphics(g => { g.circle(16, 16, 7).fill(0xffffff); g.circle(16, 16, 12).stroke({ color: 0xffffff, width: 2, alpha: 0.65 }); }));
    this.primitiveTextures.set('bruiser', this.textureFromGraphics(g => {
      g.ellipse(28, 42, 22, 29).fill(0x9d6979); g.ellipse(28, 16, 15, 14).fill(0xdbc2bc); g.circle(34, 15, 2.5).fill(0x251d2a);
    }));
    this.primitiveTextures.set('boss', this.textureFromGraphics(g => {
      g.roundRect(8, 27, 84, 88, 18).fill(0x9e55d7); g.circle(50, 24, 27).fill(0xe5c5a7); g.circle(60, 21, 4).fill(0x251d2a);
    }));
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
    const clips = [BLUE_PINWHEEL.animation.idle, BLUE_PINWHEEL.animation.move, BLUE_PINWHEEL.animation.damage, BLUE_PINWHEEL.animation.defeat, BLUE_PINWHEEL.animation.ability, ENEMIES.thug.animation, ENEMIES.fastThug.animation].filter((clip): clip is AnimationClipDefinition => clip !== undefined);
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

  private drawRoad(): void {
    const g = this.road; const aw = this.config.arenaWidth; const ah = this.config.arenaHeight;
    g.rect(0, 0, aw, ah).fill(0x253140);
    // Purpose drawn brick blocks around a readable street grid.
    for (let x = 0; x < aw; x += 560) for (let y = 0; y < ah; y += 500) {
      g.roundRect(x + 28, y + 26, 470, 168, 9).fill((x + y) % 2 ? 0x37475a : 0x3f4b5a);
      g.rect(x + 44, y + 44, 82, 24).fill(0x566476); g.rect(x + 152, y + 44, 82, 24).fill(0x566476); g.rect(x + 264, y + 44, 82, 24).fill(0x566476); g.rect(x + 376, y + 44, 82, 24).fill(0x566476);
      g.rect(x + 44, y + 130, 412, 7).fill(0x263343);
    }
    g.rect(0, 260, aw, 520).fill(COLORS.road);
    g.rect(0, 245, aw, 15).fill(COLORS.sidewalk); g.rect(0, 780, aw, 15).fill(COLORS.sidewalk);
    for (let x = 10; x < aw; x += 230) g.roundRect(x, 515, 112, 9, 5).fill(COLORS.line);
    for (let x = 180; x < aw; x += 590) {
      g.rect(x, 228, 64, 36).fill(0x19242e); g.rect(x, 788, 64, 38).fill(0x19242e);
      g.circle(x + 32, 246, 12).fill(0xffd770); g.circle(x + 32, 806, 12).fill(0xffd770);
    }
    g.rect(0, 260, aw, 2).fill(0x9ca9b0); g.rect(0, 778, aw, 2).fill(0x9ca9b0);
    g.rect(0, 260, aw, 520).stroke({ color: 0xadb8c1, width: 2, alpha: 0.32 });
  }

  draw(state: SimState): void {
    if (!this.ready) return;
    const drawStarted = performance.now();
    const scale = Math.min(this.app.screen.width / W, this.app.screen.height / H);
    this.root.scale.set(scale); this.root.position.set((this.app.screen.width - W * scale) / 2, (this.app.screen.height - H * scale) / 2);
    const camX = Math.max(0, Math.min(this.config.arenaWidth - W, state.player.x - W / 2));
    const camY = Math.max(0, Math.min(this.config.arenaHeight - H, state.player.y - H / 2));
    this.cameraX = camX; this.cameraY = camY;
    this.world.position.set(-camX, -camY);
    this.updateCharacterSprites(state);
    this.updateTransientSprites(state);
    this.updateDamageLabels(state);
    const g = this.entities; g.clear();
    for (const enemy of state.enemies) {
      if (enemy.dead || !this.isVisible(enemy.x, enemy.y, 80)) continue;
      if (enemy.kind === 'gangster' && enemy.attackState === 'ranged-telegraph') {
        const tx = enemy.x + enemy.attackDirection.x * 380; const ty = enemy.y + enemy.attackDirection.y * 380;
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: 0xffe764, width: 10, alpha: 0.12 });
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: 0xffee87, width: 2, alpha: 0.78 });
      }
      if (enemy.kind === 'boss' && enemy.attackState === 'ranged-telegraph') {
        const tx = enemy.x + enemy.attackDirection.x * 620; const ty = enemy.y + enemy.attackDirection.y * 620;
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: 0xffd56a, width: 12, alpha: 0.14 });
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: 0xffdf82, width: 3, alpha: 0.78 });
      }
      if (enemy.kind === 'boss' && (enemy.attackState === 'charge-telegraph' || enemy.attackState === 'charging')) {
        const length = GANG_LEADER.chargeSpeed * (GANG_LEADER.chargeActiveEnd - GANG_LEADER.chargeEnd);
        const tx = enemy.x + enemy.attackDirection.x * length; const ty = enemy.y + enemy.attackDirection.y * length;
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: enemy.attackState === 'charging' ? 0xff6a5e : 0xffa260, width: 28, alpha: enemy.attackState === 'charging' ? 0.2 : 0.15 });
        g.moveTo(enemy.x, enemy.y).lineTo(tx, ty).stroke({ color: enemy.attackState === 'charging' ? 0xff6a5e : 0xffd16d, width: 3, alpha: 0.9 });
        g.circle(tx, ty, 13).stroke({ color: 0xffd16d, width: 3, alpha: 0.85 });
      }
    }
    const p = state.player; const flash = p.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0;
    if (p.dashTimer > 0 && Math.hypot(this.playerMotion.x, this.playerMotion.y) > 0) {
      for (let streak = 1; streak <= 3; streak++) {
        const startX = p.x - this.playerMotion.x * streak * 0.035; const startY = p.y - this.playerMotion.y * streak * 0.035;
        g.moveTo(startX, startY).lineTo(startX - this.playerMotion.x * 0.04, startY - this.playerMotion.y * 0.04).stroke({ color: 0x8be4ff, width: 4 - streak * 0.6, alpha: 0.24 });
      }
    }
    if (p.orbit) { const angle = state.elapsed * 6; g.circle(p.x + Math.cos(angle) * 39, p.y + Math.sin(angle) * 39, 8).fill(0x6fc7ff); g.circle(p.x - Math.cos(angle) * 39, p.y - Math.sin(angle) * 39, 8).fill(0xb8f2ff); }
    if (!this.playerSprite) {
      const color = flash ? 0xffffff : COLORS.blue;
      g.roundRect(p.x - 14, p.y - 10, 28, 38, 10).fill(color); g.circle(p.x, p.y - 18, 12).fill(flash ? 0xffffff : 0xd8f3ff);
    }
    if (p.invulnerable > 0) g.circle(p.x, p.y + 4, 35).stroke({ color: flash ? 0xffffff : 0x7ee5ff, width: 2, alpha: flash ? 0.7 : 0.38 });
    if (state.specialTimer > 0) g.circle(p.x, p.y, 220 * (1 - state.specialTimer / 0.7)).stroke({ color: COLORS.cyan, width: 4, alpha: 0.75 });
    this.characters.sortChildren();
    this.lastSceneUpdateMs = performance.now() - drawStarted;
    this.sceneUpdateSamples[this.sceneSampleIndex] = this.lastSceneUpdateMs;
    this.sceneSampleIndex = (this.sceneSampleIndex + 1) % 300;
    this.sceneSampleCount = Math.min(300, this.sceneSampleCount + 1);
  }

  private isVisible(x: number, y: number, margin = 48): boolean {
    return x >= this.cameraX - margin && x <= this.cameraX + W + margin && y >= this.cameraY - margin && y <= this.cameraY + H + margin;
  }

  private updateTransientSprites(state: SimState): void {
    for (let i = 0; i < this.projectileViewCount; i++) this.projectileViews[i]!.renderable = false;
    let used = 0;
    for (const shot of state.projectiles) {
      if (!this.isVisible(shot.x, shot.y, 28)) continue;
      let sprite = this.projectileViews[used];
      const textureKey = shot.owner === 'enemy' ? 'enemy-shot' : shot.weaponId === 'piercingThrow' ? 'piercing' : 'pinwheel';
      const texture = this.primitiveTextures.get(textureKey)!;
      if (!sprite) { sprite = new Sprite(texture); sprite.anchor.set(0.5); sprite.roundPixels = true; this.effects.addChild(sprite); this.projectileViews.push(sprite); }
      sprite.texture = texture; sprite.renderable = true; sprite.position.set(shot.x, shot.y); sprite.rotation = shot.owner === 'enemy' ? 0 : shot.spin;
      const size = shot.owner === 'enemy' ? 23 : shot.weaponId === 'piercingThrow' ? 28 : 24;
      sprite.width = size; sprite.height = size;
      sprite.tint = shot.owner === 'enemy' ? (shot.weaponId === 'enemy' ? 0xff715f : 0xffc65f) : shot.weaponId === 'piercingThrow' ? 0xffdc70 : COLORS.cyan;
      used++;
    }
    this.projectileViewCount = used;

    for (let i = 0; i < this.pickupViewCount; i++) this.pickupViews[i]!.renderable = false;
    used = 0;
    for (const pickup of state.pickups) {
      if (!this.isVisible(pickup.x, pickup.y, 20)) continue;
      let sprite = this.pickupViews[used];
      if (!sprite) { sprite = new Sprite(this.primitiveTextures.get('xp')!); sprite.anchor.set(0.5); sprite.roundPixels = true; this.effects.addChild(sprite); this.pickupViews.push(sprite); }
      sprite.renderable = true; sprite.position.set(pickup.x, pickup.y); sprite.rotation = Math.PI / 4; sprite.width = 12; sprite.height = 12; sprite.tint = COLORS.xp;
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
    if (this.playerShadow) this.playerShadow.position.set(p.x, p.y + 28);

    if (this.playerSprite) {
      const anim = BLUE_PINWHEEL.animation;
      const clip = state.status === 'defeat' ? anim.defeat : state.specialTimer > 0 ? anim.ability : p.invulnerable > 0.45 ? anim.damage : this.playerIsMoving ? anim.move : anim.idle;
      const frames = this.framesFor(clip);
      if (frames.length) {
        this.playerFrame = state.status === 'defeat' ? 0 : Math.floor(state.elapsed * 1000 / clip.frameDurationMs) % frames.length;
        this.playerSprite.texture = frames[this.playerFrame] ?? frames[0]!;
        if (this.playerSprite.width !== 56) this.playerSprite.width = 56;
        if (this.playerSprite.height !== 75) this.playerSprite.height = 75;
        this.playerSprite.position.set(p.x, p.y + 28);
        const flip = anim.mirrorLeft && p.horizontalFacing === 'left';
        this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x) * (flip ? -1 : 1);
        this.playerSprite.tint = p.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0 ? 0xffffff : p.invulnerable > 0.45 ? 0xffb5b5 : 0xffffff;
        this.playerSprite.alpha = state.status === 'defeat' ? 0.78 : 1;
        this.playerSprite.rotation = state.status === 'defeat' ? 0.28 : 0;
        const playerBucket = Math.floor((p.y + 28) / 4);
        if (this.playerSprite.zIndex !== playerBucket) { this.playerSprite.zIndex = playerBucket; needsSort = true; }
      }
    }

    this.renderFrame++;
    for (const enemy of state.enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (enemy.dead) continue;
      if (!view && this.isVisible(enemy.x, enemy.y, 72)) {
        view = this.freeEnemyViews.pop() ?? this.createEnemyView(enemy);
        if (view.kind !== enemy.kind) { view.kind = enemy.kind; view.sprite.texture = this.enemyTexture(enemy); this.setEnemySpriteSize(view.sprite, enemy); view.displayedFrame = -1; }
        this.enemyViews.set(enemy.id, view); needsSort = true;
      }
      if (!view) continue;
      view.frameSeen = this.renderFrame;
      const visible = this.isVisible(enemy.x, enemy.y, 72);
      view.sprite.renderable = visible; view.shadow.renderable = visible; view.barBack.renderable = visible; view.barFill.renderable = visible;
      if (!visible) continue;
      const clip = ENEMIES[enemy.kind].animation;
      if (clip) {
        const frames = this.framesFor(clip);
        const frame = Math.floor(enemy.animationTime * 1000 / clip.frameDurationMs) % Math.max(1, frames.length);
        if (frames[frame] && frame !== view.displayedFrame) { view.sprite.texture = frames[frame]!; view.displayedFrame = frame; }
      }
      view.sprite.position.set(enemy.x, enemy.y + enemy.radius + 9);
      view.sprite.scale.x = Math.abs(view.sprite.scale.x) * (enemy.horizontalFacing === 'left' ? -1 : 1);
      view.sprite.tint = enemy.hitFlash > 0 ? 0xffb5a8 : 0xffffff;
      const bucket = Math.floor((enemy.y + enemy.radius + 9) / 4);
      if (view.sprite.zIndex !== bucket) { view.sprite.zIndex = bucket; needsSort = true; }
      view.shadow.position.set(enemy.x, enemy.y + enemy.radius + 5);
      const barWidth = enemy.kind === 'boss' ? 108 : 36;
      const barY = enemy.kind === 'boss' ? enemy.y - 66 : enemy.y - enemy.radius - 19;
      view.barBack.position.set(enemy.x - barWidth / 2, barY);
      view.barBack.width = barWidth; view.barBack.height = enemy.kind === 'boss' ? 8 : 5;
      view.barFill.position.set(enemy.x - barWidth / 2 + 2, barY + 2);
      view.barFill.width = Math.max(0, (barWidth - 4) * Math.max(0, enemy.health / enemy.maxHealth));
      view.barFill.height = enemy.kind === 'boss' ? 4 : 3;
      view.barFill.tint = enemy.kind === 'boss' ? 0xf28bcb : enemy.kind === 'fastThug' ? COLORS.fast : enemy.kind === 'gangster' ? COLORS.gangster : enemy.kind === 'bruiser' ? COLORS.bruiser : COLORS.thug;
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
    return this.primitiveTextures.get(enemy.kind === 'boss' ? 'boss' : 'bruiser')!;
  }

  private setEnemySpriteSize(sprite: Sprite, enemy: Enemy): void {
    const size = enemy.kind === 'boss' ? [100, 115] : enemy.kind === 'bruiser' ? [56, 58] : enemy.kind === 'fastThug' ? [40, 54] : [38, 51];
    sprite.width = size[0]!; sprite.height = size[1]!;
  }

  private createEnemyView(enemy: Enemy): EnemyView {
    const sprite = new Sprite(this.enemyTexture(enemy)); sprite.anchor.set(0.5, 1); sprite.roundPixels = true; this.setEnemySpriteSize(sprite, enemy); this.characters.addChild(sprite);
    const shadow = new Sprite(this.primitiveTextures.get('shadow')!); shadow.anchor.set(0.5); shadow.alpha = 0.42; this.decals.addChild(shadow);
    const barBack = new Sprite(this.primitiveTextures.get('pixel')!); barBack.anchor.set(0, 0); barBack.tint = 0x161c24; this.bars.addChild(barBack);
    const barFill = new Sprite(this.primitiveTextures.get('pixel')!); barFill.anchor.set(0, 0); this.bars.addChild(barFill);
    return { sprite, shadow, barBack, barFill, kind: enemy.kind, frameSeen: this.renderFrame, displayedFrame: -1 } as EnemyView;
  }

  getAnimationDiagnostics(state?: SimState): { playerTextureLoaded: boolean; playerFrame: number; moving: boolean; playerFacing: string; enemySprites: number; renderFps: number; renderFrameMs: number; enemies: Array<{ id: number; facing: string; frame: number; scaleX: number; hasSprite: boolean }> } {
    const enemies = state ? state.enemies.filter(enemy => !enemy.dead).map(enemy => {
      const view = this.enemyViews.get(enemy.id); const clip = ENEMIES[enemy.kind].animation;
      return { id: enemy.id, facing: enemy.horizontalFacing, frame: clip ? Math.floor(enemy.animationTime * 1000 / clip.frameDurationMs) % clip.frameCount : 0, scaleX: view?.sprite.scale.x ?? (enemy.horizontalFacing === 'left' ? -1 : 1), hasSprite: Boolean(clip) };
    }) : [];
    return { playerTextureLoaded: this.playerTextureLoaded, playerFrame: this.playerFrame, moving: this.playerIsMoving, playerFacing: state?.player.horizontalFacing ?? 'right', enemySprites: this.enemyViews.size, renderFps: Math.round(this.app.ticker.FPS), renderFrameMs: Math.round(this.app.ticker.deltaMS * 100) / 100, enemies };
  }

  getPerformanceDiagnostics(state?: SimState): { rendererUpdateMs: number; rendererP95Ms: number; rendererWorstMs: number; activeEnemies: number; visibleEnemies: number; projectiles: number; pickups: number; damageTexts: number; sprites: number } {
    const samples = this.sceneUpdateSamples.slice(0, this.sceneSampleCount).sort((a, b) => a - b);
    const p95Index = Math.min(samples.length - 1, Math.floor(samples.length * 0.95));
    let activeEnemies = 0; let visibleEnemies = 0;
    if (state) for (const enemy of state.enemies) if (!enemy.dead) {
      activeEnemies++;
      if (enemy.x >= this.cameraX - 40 && enemy.x <= this.cameraX + W + 40 && enemy.y >= this.cameraY - 60 && enemy.y <= this.cameraY + H + 60) visibleEnemies++;
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
