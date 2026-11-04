import { createGame, damagePlayer, spawnEnemy, updateGame, chooseUpgrade, getUpgrade, type InputState, type SimState } from './game/simulation';
import { standardRun, testRun, type RunConfig, type UpgradeId } from './game/definitions';
import { GameRenderer } from './render/renderer';
import './style.css';

const ui = document.querySelector<HTMLDivElement>('#ui')!;
const frame = document.querySelector<HTMLDivElement>('#game-frame')!;
const params = new URLSearchParams(location.search);
const config: RunConfig = params.has('test') && import.meta.env.DEV ? testRun : standardRun;
let debugVisible = import.meta.env.DEV && params.has('debug');
let renderer: GameRenderer;
let game: SimState | null = null;
let accumulator = 0; let lastTime = 0; let hudTime = 0;
let averageFrameMs = 16.7;
const fixed = 1 / 60;
const held = new Set<string>();
const input: InputState = { x: 0, y: 0, dash: false, special: false };

function start(): void { game = createGame(config.seed, config); accumulator = 0; lastTime = performance.now(); renderUi(true); }
function title(): void { game = null; renderUi(true); }
function setInput(): void {
  input.x = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
  input.y = Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup'));
  input.dash = held.has('shift') || held.has(' '); input.special = held.has('q');
}

function menu(titleText: string, body: string, action: string, label: string): string {
  return `<section class="screen-card"><div class="eyebrow">INDEPENDENT GAME PROTOTYPE · 001</div><h1>${titleText}</h1><p>${body}</p><button class="primary" data-action="${action}">${label}</button></section>`;
}

function renderUi(force = false): void {
  const debug = debugVisible ? `<aside class="debug-panel">FPS ${renderer?.app.ticker.FPS.toFixed(0) ?? '--'} · frame ${averageFrameMs.toFixed(1)} ms<br>${game ? `state ${game.status} · t ${game.elapsed.toFixed(1)}s · seed ${game.seed}<br>player ${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)} · hp ${Math.ceil(game.player.health)} · lv ${game.player.level} · xp ${Math.floor(game.player.xp)}/${game.player.xpNext}<br>enemies ${game.enemies.length} · shots ${game.projectiles.length}` : 'state title · seed pending'}</aside>` : '';
  if (!game) {
    ui.innerHTML = menu('GRAND GLORY', 'A first playable superhero survivors experiment.<br>Original character visuals and powers are still TBD.', 'start', 'Start Game') + `<div class="title-help"><strong>BLUE PINWHEEL</strong><br>Move: WASD / arrows · Dash: Shift / Space<br>Prototype Special: Q · Pause: Esc<br><span>One playable hero · Early prototype</span></div>${debug}`;
    return;
  }
  const g = game; const p = g.player;
  const hp = Math.max(0, p.health); const xpPct = Math.min(100, p.xp / p.xpNext * 100);
  let overlay = '';
  if (g.status === 'upgrade') overlay = `<div class="modal-shade"><section class="upgrade-panel"><div class="eyebrow">LEVEL ${p.level} · SIMULATION PAUSED</div><h2>Choose an upgrade</h2><div class="cards">${g.options.map((id, i) => { const u = getUpgrade(id); return `<button class="upgrade-card" data-upgrade="${id}"><span class="card-num">0${i + 1}</span><strong>${u.title}</strong><small>${u.detail}</small></button>`; }).join('')}</div></section></div>`;
  if (g.status === 'paused') overlay = menu('PAUSED', 'The city and combat are frozen.', 'resume', 'Resume') + `<button class="secondary restart-pause" data-action="restart">Restart Run</button>`;
  if (g.status === 'victory' || g.status === 'defeat') {
    const won = g.status === 'victory';
    const resultMessage = won ? 'The prototype Gang Leader is down.' : g.endReason === 'boss-escaped' ? 'The Gang Leader escaped after overtime.' : 'Blue Pinwheel has been overwhelmed.';
    overlay = `<div class="modal-shade"><section class="screen-card results"><div class="eyebrow">RUN RESULTS</div><h2>${won ? 'VICTORY' : 'DEFEAT'}</h2><p>${resultMessage}</p><div class="stats"><span>Survival<strong>${formatTime(g.elapsed)}</strong></span><span>Level<strong>${p.level}</strong></span><span>Enemies defeated<strong>${g.kills}</strong></span><span>Boss<strong>${g.bossDefeated ? 'Defeated' : g.endReason === 'boss-escaped' ? 'Escaped' : 'Not defeated'}</strong></span><span class="wide">Attacks / upgrades<strong>${g.attacks.join(' · ')}${g.chosen.length ? ` · ${g.chosen.map(id => getUpgrade(id).title).join(' · ')}` : ''}</strong></span></div><button class="primary" data-action="restart">Play Again</button><button class="secondary" data-action="title">Title Screen</button></section></div>`;
  }
  const boss = g.enemies.find(e => e.kind === 'boss' && !e.dead);
  const overtime = g.elapsed >= config.duration;
  const bossWarning = boss?.attackState === 'ranged-telegraph' ? ' · PROJECTILE WARNING' : boss?.attackState === 'charge-telegraph' ? ' · CHARGE WARNING' : boss?.attackState === 'recovering' ? ' · RECOVERING' : '';
  ui.innerHTML = `<header class="hud"><div class="hero-tag"><span class="hero-dot"></span><div><strong>BLUE PINWHEEL</strong><small>Prototype · Canon TBD</small></div></div><div class="health-block"><div class="bar-label"><span>HEALTH</span><b>${Math.ceil(hp)} / ${p.maxHealth}</b></div><div class="bar"><i class="health-fill" style="width:${hp / p.maxHealth * 100}%"></i></div></div><div class="level-block"><strong>LV ${p.level}</strong><div class="xp-bar"><i style="width:${xpPct}%"></i></div><small>${Math.floor(p.xp)} / ${p.xpNext} XP</small></div><div class="special-block"><span>Q · SPECIAL</span><div class="special-bar"><i style="width:${p.special}%"></i></div><small>${p.special >= 100 ? 'READY' : `${Math.floor(p.special)}%`}</small></div><div class="timer ${overtime ? 'overtime' : ''}">${overtime ? '<small>OVERTIME</small>' : ''}${formatTime(g.elapsed)}</div><button class="pause-button" data-action="pause" aria-label="Pause">Ⅱ</button></header>${boss ? `<div class="boss-hud"><strong>GANG LEADER · PROTOTYPE${bossWarning}</strong><div class="bar"><i style="width:${boss.health / boss.maxHealth * 100}%"></i></div></div>` : ''}<footer class="combat-hud"><span>◆ ${g.kills} defeated</span><span>Pinwheel (Prototype) · Auto-target</span><span>Shift / Space · Dash ${p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : 'READY'}</span></footer>${overlay}${debug}`;
  void force;
}
function formatTime(seconds: number): string { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }

ui.addEventListener('click', e => {
  const target = e.target as HTMLElement; const upgrade = target.closest<HTMLElement>('[data-upgrade]')?.dataset.upgrade as UpgradeId | undefined;
  if (upgrade && game) { chooseUpgrade(game, upgrade); renderUi(true); return; }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'start' || action === 'restart') { start(); return; }
  if (action === 'title') { title(); return; }
  if (action === 'pause' && game?.status === 'playing') { game.status = 'paused'; renderUi(true); return; }
  if (action === 'resume' && game?.status === 'paused') { game.status = 'playing'; lastTime = performance.now(); renderUi(true); }
});

function keyName(e: KeyboardEvent): string { return e.key.toLowerCase(); }
window.addEventListener('keydown', e => {
  const k = keyName(e); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  held.add(k); setInput();
  if (k === 'f3' && import.meta.env.DEV) { debugVisible = !debugVisible; renderUi(true); }
  if (k === 'escape' && game) { if (game.status === 'playing') game.status = 'paused'; else if (game.status === 'paused') game.status = 'playing'; renderUi(true); }
  if (k === 'enter' && !game) start();
  else if (k === 'enter' && game?.status === 'upgrade') { const first = game.options[0]; if (first) chooseUpgrade(game, first); renderUi(true); }
  else if (k === 'enter' && game?.status === 'paused') { game.status = 'playing'; renderUi(true); }
  else if (k === 'enter' && game && (game.status === 'victory' || game.status === 'defeat')) start();
});
window.addEventListener('keyup', e => { held.delete(keyName(e)); setInput(); });
window.addEventListener('blur', () => { held.clear(); setInput(); if (game?.status === 'playing') { game.status = 'paused'; renderUi(true); } });

renderer = await GameRenderer.create(frame, config);
renderer.app.ticker.add(ticker => {
  const now = performance.now(); const realDt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0; lastTime = now;
  averageFrameMs = averageFrameMs * 0.9 + ticker.deltaMS * 0.1;
  if (game?.status === 'playing') {
    const statusBeforeStep = game.status;
    accumulator += realDt; setInput();
    let steps = 0;
    while (accumulator >= fixed && steps < 5) { updateGame(game, fixed, input, config); accumulator -= fixed; steps++; }
    if (steps === 5) accumulator = 0;
    renderer.draw(game); hudTime += ticker.deltaMS;
    if (game.status !== statusBeforeStep || hudTime > 140) { renderUi(); hudTime = 0; }
  }
});
renderUi(true);

// Deterministic test hooks exist only in the development server; the production bundle excludes them.
if (import.meta.env.DEV && params.has('test')) {
  Object.defineProperty(window, '__GG_TEST__', { configurable: false, value: {
    getState: () => game,
    start: () => start(),
    grantXp: (amount = 60) => { if (!game) return; game.player.xp += amount; updateGame(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); },
    spawn: (kind: 'thug' | 'fastThug' | 'boss' = 'thug', x?: number, y?: number) => { if (!game) return; game.enemies.push(spawnEnemy(game, kind, config, { x: x ?? game.player.x + 150, y: y ?? game.player.y })); renderUi(true); },
    startBoss: () => { if (!game) return; game.elapsed = config.bossAt; updateGame(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); },
    prepareBossForAttack: () => { if (!game) return; const boss = game.enemies.find(e => e.kind === 'boss' && !e.dead); if (boss) { game.enemies = [boss]; boss.x = game.player.x + 145; boss.y = game.player.y; boss.health = 18; boss.maxHealth = 18; game.player.attackTimer = 0; } },
    damagePlayer: (amount = 100) => { if (!game) return; game.player.invulnerable = 0; damagePlayer(game, amount); renderUi(true); },
    pause: () => { if (game) { game.status = 'paused'; renderUi(true); } },
    injectPickup: (value = 40) => { if (game) { game.pickups.push({ id: game.nextId++, x: game.player.x, y: game.player.y, value }); updateGame(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); } },
  } });
}

declare global { interface Window { __GG_TEST__?: { getState: () => SimState | null; start: () => void; grantXp: (amount?: number) => void; spawn: (kind?: 'thug' | 'fastThug' | 'boss', x?: number, y?: number) => void; prepareBossForAttack: () => void; startBoss: () => void; damagePlayer: (amount?: number) => void; pause: () => void; injectPickup: (value?: number) => void } } }
