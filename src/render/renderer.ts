import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { SimState, Vec } from '../game/simulation';
import { BLUE_PINWHEEL, ENEMIES, GANG_LEADER, type AnimationClipDefinition, type RunConfig } from '../game/definitions';

const W = 960; const H = 640;
const COLORS = { ink: 0x101923, road: 0x303a45, sidewalk: 0x78838a, line: 0xe4bf57, blue: 0x36a9f4, cyan: 0x8ae5ff, thug: 0xe35c55, fast: 0xffad55, boss: 0x9e55d7, xp: 0x7cf2b0 };
const style = (size: number, fill: string, weight: '400' | '600' | '700' | '900' = '700') => new TextStyle({ fontFamily: 'Arial, sans-serif', fontSize: size, fill, fontWeight: weight, letterSpacing: size > 22 ? 1.5 : 0 });

export class GameRenderer {
  readonly app = new Application();
  readonly root = new Container();
  private readonly world = new Container();
  private readonly road = new Graphics();
  private readonly entities = new Graphics();
  private readonly labels = new Container();
  private readonly characters = new Container();
  private readonly generatedFrames: Texture[] = [];
  private readonly clipCache = new Map<string, Texture[]>();
  private readonly enemySprites = new Map<number, Sprite>();
  private playerSprite?: Sprite;
  private playerFrame = -1;
  private playerTextureLoaded = false;
  private lastPlayerPosition?: Vec;
  private playerIsMoving = false;
  private playerMotion: Vec = { x: 0, y: 0 };
  private readonly config: RunConfig;
  private ready = false;

  private constructor(config: RunConfig) { this.config = config; this.root.addChild(this.world); this.world.addChild(this.road, this.entities, this.characters, this.labels); this.characters.sortableChildren = true; }

  static async create(host: HTMLElement, config: RunConfig): Promise<GameRenderer> {
    const renderer = new GameRenderer(config);
    await renderer.loadCharacterAssets();
    await renderer.app.init({ background: COLORS.ink, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, resizeTo: host, preference: 'webgl' });
    renderer.app.stage.addChild(renderer.root); host.appendChild(renderer.app.canvas); renderer.createCharacterSprites(); renderer.drawRoad(); renderer.ready = true; return renderer;
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
  }

  draw(state: SimState): void {
    if (!this.ready) return;
    this.updateCharacterSprites(state);
    const scale = Math.min(this.app.screen.width / W, this.app.screen.height / H);
    this.root.scale.set(scale); this.root.position.set((this.app.screen.width - W * scale) / 2, (this.app.screen.height - H * scale) / 2);
    const camX = Math.max(0, Math.min(this.config.arenaWidth - W, state.player.x - W / 2));
    const camY = Math.max(0, Math.min(this.config.arenaHeight - H, state.player.y - H / 2));
    this.world.position.set(-camX, -camY);
    const g = this.entities; g.clear(); this.labels.removeChildren().forEach(c => c.destroy());
    // Street boundary makes the walkable region clear even when the camera reaches an edge.
    g.rect(0, 260, this.config.arenaWidth, 520).stroke({ color: 0xadb8c1, width: 2, alpha: 0.32 });
    for (const pickup of state.pickups) {
      g.circle(pickup.x, pickup.y, 8).fill({ color: COLORS.xp, alpha: 0.18 }); g.circle(pickup.x, pickup.y, 4).fill(COLORS.xp);
    }
    for (const shot of state.projectiles) {
      if (shot.owner === 'enemy') { g.circle(shot.x, shot.y, 8).fill(COLORS.boss); g.circle(shot.x, shot.y, 12).stroke({ color: 0xe5a7ff, width: 2, alpha: 0.55 }); }
      else {
        for (let blade = 0; blade < 4; blade++) {
          const a = shot.spin + blade * Math.PI / 2;
          g.poly([shot.x + Math.cos(a) * 11, shot.y + Math.sin(a) * 11, shot.x + Math.cos(a + 0.72) * 3, shot.y + Math.sin(a + 0.72) * 3, shot.x + Math.cos(a + 1.32) * 8, shot.y + Math.sin(a + 1.32) * 8, shot.x + Math.cos(a + 1.72) * 3, shot.y + Math.sin(a + 1.72) * 3]).fill(COLORS.cyan);
        }
        g.circle(shot.x, shot.y, 3).fill(0xffffff);
        g.moveTo(shot.x, shot.y).lineTo(shot.x - shot.vy * 0.025, shot.y + shot.vx * 0.025).stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      }
    }
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const color = enemy.kind === 'boss' ? COLORS.boss : enemy.kind === 'fastThug' ? COLORS.fast : COLORS.thug;
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
      // Retain the generated enemy silhouette only when its optional sprite atlas failed to load.
      if (enemy.kind !== 'boss') {
        g.ellipse(enemy.x, enemy.y + enemy.radius + 5, enemy.radius + 3, 5).fill({ color: 0x07111a, alpha: 0.4 });
      }
      if (!this.enemySprites.has(enemy.id) && enemy.kind !== 'boss') {
        g.roundRect(enemy.x - enemy.radius * 0.85, enemy.y - enemy.radius * 0.2, enemy.radius * 1.7, enemy.radius * 1.75, 7).fill(enemy.hitFlash > 0 ? 0xffffff : color);
        g.circle(enemy.x, enemy.y - enemy.radius * 0.75, enemy.radius * 0.65).fill(enemy.hitFlash > 0 ? 0xffffff : 0xe5c5a7);
        const side = enemy.horizontalFacing === 'left' ? -1 : 1;
        g.circle(enemy.x + side * enemy.radius * 0.25, enemy.y - enemy.radius * 0.78, 2).fill(0x18202a);
      } else if (enemy.kind === 'boss') {
        g.ellipse(enemy.x, enemy.y + enemy.radius + 4, enemy.radius + 8, 7).fill({ color: 0x07111a, alpha: 0.4 });
        g.roundRect(enemy.x - enemy.radius, enemy.y - 16, enemy.radius * 2, enemy.radius * 2.1, 8).fill(enemy.hitFlash > 0 ? 0xffffff : color);
        g.circle(enemy.x, enemy.y - enemy.radius, enemy.radius * 0.72).fill(enemy.hitFlash > 0 ? 0xffffff : 0xe5c5a7);
        // Direction cue keeps the geometric boss placeholder readable until art is supplied.
        const side = enemy.horizontalFacing === 'left' ? -1 : 1;
        g.circle(enemy.x + side * 10, enemy.y - enemy.radius - 4, 3).fill(0x251d2a);
      }
      g.roundRect(enemy.x - 18, enemy.y - enemy.radius - 19, 36, 5, 2).fill(0x161c24); g.roundRect(enemy.x - 17, enemy.y - enemy.radius - 18, 34 * Math.max(0, enemy.health / enemy.maxHealth), 3, 2).fill(color);
      if (enemy.kind === 'boss') {
        g.roundRect(enemy.x - 54, enemy.y - 66, 108, 8, 4).fill(0x11151c); g.roundRect(enemy.x - 52, enemy.y - 64, 104 * Math.max(0, enemy.health / enemy.maxHealth), 4, 2).fill(0xf28bcb);
      }
    }
    for (const n of state.numbers) { const t = new Text({ text: n.text, style: style(13, '#fff2c6', '700') }); t.anchor.set(0.5); t.position.set(n.x, n.y); this.labels.addChild(t); }
    const p = state.player; const flash = p.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0;
    g.ellipse(p.x, p.y + 28, 24, 7).fill({ color: 0x06101a, alpha: 0.5 });
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
  }

  private updateCharacterSprites(state: SimState): void {
    const p = state.player;
    if (this.lastPlayerPosition) {
      const dx = p.x - this.lastPlayerPosition.x; const dy = p.y - this.lastPlayerPosition.y;
      this.playerMotion = { x: dx * 60, y: dy * 60 }; this.playerIsMoving = Math.hypot(dx, dy) > 0.3;
    } else this.playerIsMoving = false;
    this.lastPlayerPosition = { x: p.x, y: p.y };

    if (this.playerSprite) {
      const anim = BLUE_PINWHEEL.animation;
      const clip = state.status === 'defeat' ? anim.defeat : state.specialTimer > 0 ? anim.ability : p.invulnerable > 0.45 ? anim.damage : this.playerIsMoving ? anim.move : anim.idle;
      const frames = this.framesFor(clip);
      if (frames.length) {
        this.playerFrame = state.status === 'defeat' ? 0 : Math.floor(state.elapsed * 1000 / clip.frameDurationMs) % frames.length;
        this.playerSprite.texture = frames[this.playerFrame] ?? frames[0]!;
        this.playerSprite.width = 56; this.playerSprite.height = 75;
        this.playerSprite.position.set(p.x, p.y + 28);
        const flip = anim.mirrorLeft && p.horizontalFacing === 'left';
        this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x) * (flip ? -1 : 1);
        this.playerSprite.tint = p.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0 ? 0xffffff : p.invulnerable > 0.45 ? 0xffb5b5 : 0xffffff;
        this.playerSprite.alpha = state.status === 'defeat' ? 0.78 : 1;
        this.playerSprite.rotation = state.status === 'defeat' ? 0.28 : 0;
        this.playerSprite.zIndex = p.y + 28;
      }
    }

    const active = new Set<number>();
    for (const enemy of state.enemies) {
      const clip = ENEMIES[enemy.kind].animation;
      if (enemy.dead || !clip) continue;
      const frames = this.framesFor(clip);
      if (!frames.length) continue;
      active.add(enemy.id);
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite) {
        sprite = new Sprite(frames[0]); sprite.anchor.set(0.5, 1); sprite.roundPixels = true;
        this.enemySprites.set(enemy.id, sprite); this.characters.addChild(sprite);
      }
      const frame = Math.floor(enemy.animationTime * 1000 / clip.frameDurationMs) % frames.length;
      sprite.texture = frames[frame] ?? frames[0]!;
      sprite.width = enemy.kind === 'fastThug' ? 40 : 38; sprite.height = enemy.kind === 'fastThug' ? 54 : 51;
      sprite.position.set(enemy.x, enemy.y + enemy.radius + 9);
      // Mirror only the character sprite; the position, shadow, and health bars stay in world space.
      sprite.scale.x = Math.abs(sprite.scale.x) * (enemy.horizontalFacing === 'left' ? -1 : 1);
      sprite.tint = enemy.hitFlash > 0 ? 0xffb5a8 : 0xffffff;
      sprite.zIndex = enemy.y + enemy.radius + 9;
    }
    for (const [id, sprite] of this.enemySprites) if (!active.has(id)) {
      sprite.destroy({ texture: false, textureSource: false }); this.enemySprites.delete(id);
    }
  }

  getAnimationDiagnostics(state?: SimState): { playerTextureLoaded: boolean; playerFrame: number; moving: boolean; playerFacing: string; enemySprites: number; enemies: Array<{ id: number; facing: string; frame: number; scaleX: number; hasSprite: boolean }> } {
    const enemies = state ? state.enemies.filter(enemy => !enemy.dead).map(enemy => {
      const sprite = this.enemySprites.get(enemy.id); const clip = ENEMIES[enemy.kind].animation;
      return { id: enemy.id, facing: enemy.horizontalFacing, frame: clip ? Math.floor(enemy.animationTime * 1000 / clip.frameDurationMs) % clip.frameCount : 0, scaleX: sprite?.scale.x ?? (enemy.horizontalFacing === 'left' ? -1 : 1), hasSprite: sprite !== undefined };
    }) : [];
    return { playerTextureLoaded: this.playerTextureLoaded, playerFrame: this.playerFrame, moving: this.playerIsMoving, playerFacing: state?.player.horizontalFacing ?? 'right', enemySprites: this.enemySprites.size, enemies };
  }

  screenToWorld(clientX: number, clientY: number): Vec { return { x: clientX, y: clientY }; }
  destroy(): void {
    this.playerSprite?.destroy({ texture: false, textureSource: false });
    for (const sprite of this.enemySprites.values()) sprite.destroy({ texture: false, textureSource: false });
    this.enemySprites.clear();
    for (const texture of this.generatedFrames) texture.destroy(false);
    this.generatedFrames.length = 0; this.clipCache.clear(); this.app.destroy(true, { children: true });
  }
}
