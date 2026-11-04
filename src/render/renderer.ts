import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { SimState, Vec } from '../game/simulation';
import { GANG_LEADER, type RunConfig } from '../game/definitions';

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
  private readonly config: RunConfig;
  private ready = false;

  private constructor(config: RunConfig) { this.config = config; this.root.addChild(this.road, this.world); this.world.addChild(this.entities, this.labels); }

  static async create(host: HTMLElement, config: RunConfig): Promise<GameRenderer> {
    const renderer = new GameRenderer(config);
    await renderer.app.init({ background: COLORS.ink, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true, resizeTo: host, preference: 'webgl' });
    renderer.app.stage.addChild(renderer.root); host.appendChild(renderer.app.canvas); renderer.drawRoad(); renderer.ready = true; return renderer;
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
      const bossPhase = enemy.phase % GANG_LEADER.phaseLength;
      if (enemy.kind === 'boss' && bossPhase > GANG_LEADER.rangedTelegraphStart - 0.15 && bossPhase < GANG_LEADER.rangedTelegraphEnd + 0.15) g.circle(enemy.x, enemy.y, 78).stroke({ color, width: 4, alpha: 0.45 });
      // Graphic silhouette: broad shoulders, tapered coat, contrasting head. All character art is temporary.
      g.ellipse(enemy.x, enemy.y + enemy.radius + 4, enemy.radius + 3, 5).fill({ color: 0x07111a, alpha: 0.35 });
      g.roundRect(enemy.x - enemy.radius * 0.85, enemy.y - enemy.radius * 0.2, enemy.radius * 1.7, enemy.radius * 1.75, 7).fill(enemy.hitFlash > 0 ? 0xffffff : color);
      g.circle(enemy.x, enemy.y - enemy.radius * 0.75, enemy.radius * 0.65).fill(enemy.hitFlash > 0 ? 0xffffff : 0xe5c5a7);
      g.roundRect(enemy.x - 18, enemy.y - enemy.radius - 19, 36, 5, 2).fill(0x161c24); g.roundRect(enemy.x - 17, enemy.y - enemy.radius - 18, 34 * Math.max(0, enemy.health / enemy.maxHealth), 3, 2).fill(color);
      if (enemy.kind === 'boss') {
        g.roundRect(enemy.x - 54, enemy.y - 66, 108, 8, 4).fill(0x11151c); g.roundRect(enemy.x - 52, enemy.y - 64, 104 * Math.max(0, enemy.health / enemy.maxHealth), 4, 2).fill(0xf28bcb);
      }
    }
    for (const n of state.numbers) { const t = new Text({ text: n.text, style: style(13, '#fff2c6', '700') }); t.anchor.set(0.5); t.position.set(n.x, n.y); this.labels.addChild(t); }
    const p = state.player; const flash = p.invulnerable > 0 && Math.floor(state.elapsed * 18) % 2 === 0;
    g.ellipse(p.x, p.y + 24, 22, 7).fill({ color: 0x06101a, alpha: 0.5 });
    if (p.orbit) { const angle = state.elapsed * 6; g.circle(p.x + Math.cos(angle) * 39, p.y + Math.sin(angle) * 39, 7).fill(COLORS.cyan); g.circle(p.x - Math.cos(angle) * 39, p.y - Math.sin(angle) * 39, 7).fill(0x64cbff); }
    const color = flash ? 0xffffff : COLORS.blue;
    g.roundRect(p.x - 14, p.y - 10, 28, 38, 10).fill(color);
    g.circle(p.x, p.y - 18, 12).fill(flash ? 0xffffff : 0xd8f3ff);
    g.roundRect(p.x - 17 + p.facing.x * 2, p.y - 8 + p.facing.y * 2, 34, 10, 5).fill(0x132a4a);
    // Moving triangular tabs give readable facing feedback without establishing canonical costume details.
    const ux = p.facing.x; const uy = p.facing.y; const sideX = -uy * 8; const sideY = ux * 8;
    g.poly([p.x + ux * 27, p.y + uy * 22, p.x + sideX, p.y + sideY, p.x - sideX, p.y - sideY]).fill(COLORS.cyan);
    if (state.specialTimer > 0) g.circle(p.x, p.y, 220 * (1 - state.specialTimer / 0.7)).stroke({ color: COLORS.cyan, width: 4, alpha: 0.75 });
  }

  screenToWorld(clientX: number, clientY: number): Vec { return { x: clientX, y: clientY }; }
  destroy(): void { this.app.destroy(true, { children: true }); }
}
