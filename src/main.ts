import { createGame, damagePlayer, spawnEnemy, updateGame, chooseUpgrade, getUpgrade, type InputState, type SimState } from './game/simulation';
import { standardRun, testRun, type RunConfig, type UpgradeId } from './game/definitions';
import { GameRenderer } from './render/renderer';
import './style.css';

const ui = document.querySelector<HTMLDivElement>('#ui')!;
const frame = document.querySelector<HTMLDivElement>('#game-frame')!;
const params = new URLSearchParams(location.search);
const config: RunConfig = params.has('test') && params.get('test') !== 'normal' && import.meta.env.DEV ? testRun : standardRun;
const manualRenderStress = import.meta.env.DEV && params.get('test') === 'stress';
const manualTestDrive = import.meta.env.DEV && (params.get('test') === 'normal' || manualRenderStress);
let debugVisible = import.meta.env.DEV && params.has('debug');
let renderer: GameRenderer;
let game: SimState | null = null;
let accumulator = 0; let lastTime = 0; let hudTime = 0;
let averageFrameMs = 16.7;
const simulationSamples: number[] = [];
const frameSamples: number[] = [];
let droppedSimulationUpdates = 0;
let longFrames = 0;
const fixed = 1 / 60;
const held = new Set<string>();
const input: InputState = { x: 0, y: 0, dash: false, special: false };

function addSample(buffer: number[], value: number): void { if (!import.meta.env.DEV) return; buffer.push(value); if (buffer.length > 300) buffer.shift(); }
function timedUpdate(state: SimState, dt: number, controls: InputState, runConfig: RunConfig): void {
  const started = performance.now(); updateGame(state, dt, controls, runConfig); addSample(simulationSamples, performance.now() - started);
}
function summarize(samples: number[]): { average: number; p95: number; worst: number } {
  if (!samples.length) return { average: 0, p95: 0, worst: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  return { average: samples.reduce((sum, value) => sum + value, 0) / samples.length, p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0, worst: sorted[sorted.length - 1] ?? 0 };
}

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
  const diagnostics = game && renderer ? renderer.getPerformanceDiagnostics(game) : undefined;
  const debug = debugVisible ? `<aside class="debug-panel">FPS ${renderer?.app.ticker.FPS.toFixed(0) ?? '--'} · frame ${averageFrameMs.toFixed(1)} ms<br>${game ? `state ${game.status} · t ${game.elapsed.toFixed(1)}s · seed ${game.seed}<br>player ${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)} · hp ${Math.ceil(game.player.health)} · lv ${game.player.level} · xp ${Math.floor(game.player.xp)}/${game.player.xpNext}<br>enemies ${diagnostics?.activeEnemies ?? 0} active / ${diagnostics?.visibleEnemies ?? 0} visible · target ${game.hordeTarget} · deficit ${game.hordeDeficit} · spawn ${game.spawnRate.toFixed(1)}/s · peak ${game.peakEnemies}<br>shots ${diagnostics?.projectiles ?? 0} · pickups ${diagnostics?.pickups ?? 0} · labels ${diagnostics?.damageTexts ?? 0} · sprites ${diagnostics?.sprites ?? 0} · surge ${game.surgeRemaining > 0 ? `${game.surgeRemaining.toFixed(1)}s` : 'off'}<br>sim ${simulationSamples.at(-1)?.toFixed(2) ?? '0.00'} ms · scene ${diagnostics?.rendererUpdateMs.toFixed(2) ?? '0.00'} ms · recycled ${game.recycledEnemies}` : 'state title · seed pending'}</aside>` : '';
  if (!game) {
    ui.innerHTML = `<section class="screen-card title-screen"><div class="hero-portrait-wrap"><img class="hero-portrait" src="/assets/blue-pinwheel/select-portrait.png" alt="Blue Pinwheel owner-provided selection portrait" /></div><div class="title-copy"><div class="eyebrow">INDEPENDENT SUPERHERO SURVIVORS · EARLY PROTOTYPE</div><h1>GRAND GLORY</h1><div class="selected-hero"><span>ONLY PLAYABLE HERO</span><strong>BLUE PINWHEEL</strong></div><p>Movement and combat abilities are temporary prototype mechanics. Character canon remains owner-controlled.</p><button class="primary" data-action="start">Start Game</button><div class="title-controls"><strong>CONTROLS</strong><span>Move: WASD / arrows · Dash: Shift / Space</span><span>Prototype Special: Q · Pause: Esc</span></div></div></section>${debug}`;
    return;
  }
  const g = game; const p = g.player;
  const hp = Math.max(0, p.health); const xpPct = Math.min(100, p.xp / p.xpNext * 100);
  let overlay = '';
  if (g.status === 'upgrade') overlay = `<div class="modal-shade"><section class="upgrade-panel"><div class="eyebrow">LEVEL ${p.level} · SIMULATION PAUSED</div><h2>Choose an upgrade</h2><div class="cards">${g.options.map((id, i) => { const u = getUpgrade(id); return `<button class="upgrade-card ${id === 'evolvePinwheel' ? 'evolution-card' : ''}" data-upgrade="${id}"><span class="card-num">${i + 1}</span><strong>${u.title}</strong><small>${u.detail}</small></button>`; }).join('')}</div><small class="choice-hint">Press 1, 2, or 3 to choose</small></section></div>`;
  if (g.status === 'paused') overlay = menu('PAUSED', 'The city and combat are frozen.', 'resume', 'Resume') + `<button class="secondary restart-pause" data-action="restart">Restart Run</button>`;
  if (g.status === 'victory' || g.status === 'defeat') {
    const won = g.status === 'victory';
    const resultMessage = won ? 'The prototype Gang Leader is down.' : g.endReason === 'boss-escaped' ? 'The Gang Leader escaped after overtime.' : 'Blue Pinwheel has been overwhelmed.';
    overlay = `<div class="modal-shade"><section class="screen-card results"><div class="eyebrow">RUN RESULTS</div><h2>${won ? 'VICTORY' : 'DEFEAT'}</h2><p>${resultMessage}</p><div class="stats"><span>Survival<strong>${formatTime(g.elapsed)}</strong></span><span>Level<strong>${p.level}</strong></span><span>Enemies defeated<strong>${g.kills}</strong></span><span>Damage dealt<strong>${Math.round(p.damageDealt)}</strong></span><span>Boss<strong>${g.bossDefeated ? 'Defeated' : g.endReason === 'boss-escaped' ? 'Escaped' : 'Not defeated'}</strong></span><span class="wide">Attacks / upgrades<strong>${g.attacks.join(' · ')}${g.chosen.length ? ` · ${g.chosen.map(id => getUpgrade(id).title).join(' · ')}` : ''}</strong></span></div><button class="primary" data-action="restart">Play Again</button><button class="secondary" data-action="title">Title Screen</button></section></div>`;
  }
  const boss = g.enemies.find(e => e.kind === 'boss' && !e.dead);
  const overtime = g.elapsed >= config.duration;
  const bossWarning = boss?.attackState === 'ranged-telegraph' ? ' · PROJECTILE WARNING' : boss?.attackState === 'charge-telegraph' ? ' · CHARGE WARNING' : boss?.attackState === 'recovering' ? ' · RECOVERING' : '';
  const activeCount = g.enemies.filter(enemy => enemy.kind !== 'boss').length;
  const arsenal = [`Pinwheel R${p.weaponRanks.pinwheel}`, p.weaponRanks.orbitGuard ? `Orbit R${p.weaponRanks.orbitGuard}` : '', p.weaponRanks.piercingThrow ? `Piercing R${p.weaponRanks.piercingThrow}` : '', p.evolvedPinwheel ? 'PINWHEEL EVOLVED' : ''].filter(Boolean).join(' · ');
  ui.innerHTML = `<header class="hud"><div class="hero-tag"><span class="hero-dot"></span><div><strong>BLUE PINWHEEL</strong><small>Prototype · Canon TBD</small></div></div><div class="health-block"><div class="bar-label"><span>HEALTH</span><b>${Math.ceil(hp)} / ${p.maxHealth}</b></div><div class="bar"><i class="health-fill" style="width:${hp / p.maxHealth * 100}%"></i></div></div><div class="level-block"><strong>LV ${p.level}</strong><div class="xp-bar"><i style="width:${xpPct}%"></i></div><small>${Math.floor(p.xp)} / ${p.xpNext} XP</small></div><div class="special-block"><span>Q · SPECIAL</span><div class="special-bar"><i style="width:${p.special}%"></i></div><small>${p.special >= 100 ? 'READY' : `${Math.floor(p.special)}%`}</small></div><div class="timer ${overtime ? 'overtime' : ''}">${overtime ? '<small>OVERTIME</small>' : ''}${formatTime(g.elapsed)}</div><button class="pause-button" data-action="pause" aria-label="Pause">Ⅱ</button></header>${boss ? `<div class="boss-hud"><strong>GANG LEADER · PROTOTYPE${bossWarning}</strong><div class="bar"><i style="width:${boss.health / boss.maxHealth * 100}%"></i></div></div>` : ''}<footer class="combat-hud"><span>◆ ${g.kills} defeated · ${activeCount} active</span><span>${arsenal}</span><span>Shift / Space · Dash ${p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : 'READY'} · ${g.surgeRemaining > 0 ? 'HORDE SURGE' : 'Q · SPECIAL'}</span></footer>${overlay}${debug}`;
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
  if (game?.status === 'upgrade' && ['1', '2', '3'].includes(k)) { const picked = game.options[Number(k) - 1]; if (picked) chooseUpgrade(game, picked); renderUi(true); }
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
  addSample(frameSamples, ticker.deltaMS); if (ticker.deltaMS > 33.3) longFrames++;
  if (game?.status === 'playing' && !manualTestDrive) {
    const statusBeforeStep = game.status;
    accumulator += realDt; setInput();
    let steps = 0;
    while (accumulator >= fixed && steps < 5) { timedUpdate(game, fixed, input, config); accumulator -= fixed; steps++; }
    if (steps === 5 && accumulator >= fixed) { droppedSimulationUpdates += Math.floor(accumulator / fixed); accumulator = 0; }
    renderer.draw(game); hudTime += ticker.deltaMS;
    if (game.status !== statusBeforeStep || hudTime > 140) { renderUi(); hudTime = 0; }
  } else if (manualRenderStress && game?.status === 'playing') renderer.draw(game);
});
renderUi(true);

// Deterministic test hooks exist only in the development server; the production bundle excludes them.
if (import.meta.env.DEV && params.has('test')) {
  Object.defineProperty(window, '__GG_TEST__', { configurable: false, value: {
    getState: () => game,
    getRendererState: () => renderer.getAnimationDiagnostics(game ?? undefined),
    getPerformanceDiagnostics: () => ({ ...renderer.getPerformanceDiagnostics(game ?? undefined), simulation: summarize(simulationSamples), frames: summarize(frameSamples), droppedSimulationUpdates, longFrames }),
    populateStress: (count: number) => {
      if (!game) start();
      if (!game) return;
      const safeCount = Math.max(0, Math.min(200, Math.floor(count)));
      game.status = 'playing'; game.enemies.length = 0; game.projectiles.length = 0; game.pickups.length = 0; game.numbers.length = 0;
      game.player.health = game.player.maxHealth; game.player.invulnerable = 100_000; game.player.attackTimer = 100_000; game.player.piercingTimer = 100_000;
      const columns = Math.max(1, Math.ceil(Math.sqrt(safeCount * 2)));
      const rows = Math.ceil(safeCount / columns);
      const xSpacing = columns > 1 ? 900 / (columns - 1) : 0;
      const ySpacing = rows > 1 ? 420 / (rows - 1) : 0;
      for (let i = 0; i < safeCount; i++) {
        const kind = i % 20 === 0 ? 'bruiser' : i % 9 === 0 ? 'gangster' : i % 4 === 0 ? 'fastThug' : 'thug';
        const enemy = spawnEnemy(game, kind, config, { x: game.player.x - 450 + (i % columns) * xSpacing, y: 300 + Math.floor(i / columns) * ySpacing });
        enemy.health = enemy.maxHealth = 1_000_000; enemy.speed = 0; enemy.hitFlash = i % 7 === 0 ? 0.1 : 0; enemy.animationTime = (i % 20) / 10;
        if (kind === 'gangster' && i % 18 === 0) { enemy.attackState = 'ranged-telegraph'; enemy.attackDirection = { x: 1, y: 0 }; }
        game.enemies.push(enemy);
      }
      for (let i = 0; i < Math.floor(safeCount * 0.22); i++) game.projectiles.push({ id: game.nextId++, x: game.player.x - 440 + (i % 18) * 50, y: 330 + (i % 8) * 48, vx: 0, vy: 0, damage: 8, life: 100, pierce: 0, hitIds: [], special: false, owner: i % 4 === 0 ? 'enemy' : 'player', spin: i, weaponId: i % 4 === 0 ? 'enemy' : 'pinwheel' });
      for (let i = 0; i < Math.floor(safeCount * 0.2); i++) game.pickups.push({ id: game.nextId++, x: game.player.x - 420 + (i % 18) * 48, y: 320 + (i % 8) * 48, value: 12 });
      for (let i = 0; i < Math.floor(safeCount * 0.12); i++) game.numbers.push({ id: game.nextId++, x: game.player.x - 410 + (i % 18) * 48, y: 320 + (i % 8) * 48, text: '12', life: 0.5 });
      renderer.draw(game); renderUi(true);
    },
    start: () => start(),
    grantXp: (amount = 60) => { if (!game) return; game.player.xp += amount; timedUpdate(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); },
    spawn: (kind: 'thug' | 'fastThug' | 'boss' = 'thug', x?: number, y?: number) => { if (!game) return; game.enemies.push(spawnEnemy(game, kind, config, { x: x ?? game.player.x + 150, y: y ?? game.player.y })); renderUi(true); },
    startBoss: () => { if (!game) return; game.elapsed = config.bossAt; timedUpdate(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); },
    prepareBossForAttack: () => {
      if (!game) return;
      const boss = game.enemies.find(enemy => enemy.kind === 'boss' && !enemy.dead);
      if (!boss) return;
      game.status = 'playing'; game.levelChoices = 0; game.options = []; game.pickups = []; game.projectiles = [];
      game.player.xp = 0; game.player.xpNext = Number.MAX_SAFE_INTEGER;
      game.enemies = [boss]; boss.x = game.player.x + 210; boss.y = game.player.y; boss.health = 1; boss.maxHealth = 1;
      game.projectiles.push({ id: game.nextId++, x: boss.x - 6, y: boss.y, vx: 0, vy: 0, damage: 1, life: 1, pierce: 0, hitIds: [], special: false, owner: 'player', spin: 0, weaponId: 'pinwheel' });
      timedUpdate(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderer.draw(game); renderUi(true);
    },
    damagePlayer: (amount = 100) => { if (!game) return; game.player.invulnerable = 0; damagePlayer(game, amount); renderUi(true); },
    pause: () => { if (game) { game.status = 'paused'; renderUi(true); } },
    injectPickup: (value = 40) => { if (game) { game.pickups.push({ id: game.nextId++, x: game.player.x, y: game.player.y, value }); timedUpdate(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); } },
    advance: (seconds: number, x = 0, y = 0, dash = false, special = false, orbitPath = false) => { if (!game) return; const count = Math.min(60_000, Math.ceil(Math.max(0, seconds) / fixed)); for (let i = 0; i < count && game.status === 'playing'; i++) { const angle = game.elapsed * 0.5; timedUpdate(game, fixed, { x: orbitPath ? Math.cos(angle) : x, y: orbitPath ? Math.sin(angle) : y, dash, special }, config); } renderer.draw(game); renderUi(true); },
    chooseOption: (index: number) => { if (game?.status !== 'upgrade') return false; const id = game.options[index]; if (!id) return false; const chosen = chooseUpgrade(game, id); renderer.draw(game); renderUi(true); return chosen; },
  } });
}

declare global { interface Window { __GG_TEST__?: { getState: () => SimState | null; getRendererState: () => ReturnType<GameRenderer['getAnimationDiagnostics']>; getPerformanceDiagnostics: () => ReturnType<GameRenderer['getPerformanceDiagnostics']> & { simulation: { average: number; p95: number; worst: number }; frames: { average: number; p95: number; worst: number }; droppedSimulationUpdates: number; longFrames: number }; populateStress: (count: number) => void; start: () => void; grantXp: (amount?: number) => void; spawn: (kind?: 'thug' | 'fastThug' | 'gangster' | 'bruiser' | 'boss', x?: number, y?: number) => void; prepareBossForAttack: () => void; startBoss: () => void; damagePlayer: (amount?: number) => void; pause: () => void; injectPickup: (value?: number) => void; advance: (seconds: number, x?: number, y?: number, dash?: boolean, special?: boolean, orbitPath?: boolean) => void; chooseOption: (index: number) => boolean } } }
