import { applyEnemyDamage, createGame, damagePlayer, retireRun, spawnEnemy, updateGame, chooseUpgrade, getUpgrade, type InputState, type SimState } from './game/simulation';
import { ATTACKS, ENEMIES, HEROES, standardRun, testRun, type HeroId, type RunConfig, type UpgradeId } from './game/definitions';
import { GameRenderer } from './render/renderer';
import { nearestWalkablePoint } from './game/stage';
import { GameAudio } from './game/audio';
import { DIFFICULTIES, type DifficultyId } from './game/definitions';
import { getUpgradeRankProgress } from './game/upgrade-ranks';
import './style.css';

const ui = document.querySelector<HTMLDivElement>('#ui')!;
const frame = document.querySelector<HTMLDivElement>('#game-frame')!;
const params = new URLSearchParams(location.search);
const testConfiguration = params.has('test') && params.get('test') !== 'normal' && import.meta.env.DEV;
function savedChoice<T extends string>(key: string, values: readonly T[], fallback: T): T {
  try { const value = localStorage.getItem(key) as T | null; return value && values.includes(value) ? value : fallback; } catch { return fallback; }
}
let selectedDifficulty: DifficultyId = savedChoice('grand-glory-difficulty', ['normal', 'heroic'] as const, 'normal');
let selectedHero: HeroId = savedChoice('grand-glory-hero', ['blue-pinwheel','bok-goo','da-ri'] as const, 'blue-pinwheel');
let config: RunConfig = { ...(testConfiguration ? testRun : standardRun), difficulty: selectedDifficulty };
const audio = new GameAudio();
let cameraPreset: 'wide' | 'standard' | 'close' = savedChoice('grand-glory-camera', ['wide', 'standard', 'close'] as const, 'standard');
let reducedMotion = savedChoice('grand-glory-reduced-motion', ['on', 'off'] as const, 'off') === 'on';
const manualRenderStress = import.meta.env.DEV && params.get('test') === 'stress';
const manualTestDrive = import.meta.env.DEV && (params.get('test') === 'normal' || manualRenderStress);
let debugVisible = import.meta.env.DEV && params.has('debug');
let collisionDebugVisible = false;
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

function start(): void { held.clear(); setInput(); game = createGame(config.seed, config, selectedHero); accumulator = 0; lastTime = performance.now(); previousKills = 0; previousXp = 0; previousSpecial = false; previousBossArrival = false; previousResult = null; previousHealth = game.player.health; previousDashTimer = 0; previousAttackTimer = 0; audio.play('menu'); renderUi(true); }
function title(): void { held.clear(); setInput(); game = null; renderUi(true); }
function setInput(): void {
  input.x = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
  input.y = Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup'));
  input.dash = held.has('shift') || held.has(' '); input.special = held.has('q');
}

function menu(titleText: string, body: string, action: string, label: string): string {
  return `<section class="screen-card branded-panel"><div class="eyebrow">GRAND GLORY · FIELD PAUSED</div><h1>${titleText}</h1><p>${body}</p><button class="primary" data-action="${action}">${label}</button></section>`;
}

function renderTitle(debug: string): string {
  const chosen=HEROES[selectedHero];
  const portrait=selectedHero==='blue-pinwheel'?'/assets/blue-pinwheel/select-portrait.png':'/assets/milestone010/'+selectedHero+'/portrait.png';
  const heroCards=(Object.values(HEROES) as Array<(typeof HEROES)[HeroId]>).map((hero,index)=>{
    const src=hero.id==='blue-pinwheel'?'/assets/blue-pinwheel/select-portrait.png':'/assets/milestone010/'+hero.id+'/portrait.png';
    return '<button class="hero-choice '+(selectedHero===hero.id?'selected':'')+'" data-hero="'+hero.id+'" aria-pressed="'+(selectedHero===hero.id)+'"><img src="'+src+'" alt="" /><strong>'+hero.name+'</strong><small>'+(hero.title??'')+'</small><span>'+hero.startingWeapon+' · '+hero.maxHealth+' HP · '+hero.moveSpeed+' speed</span><i>KEY '+(index+1)+'</i></button>';
  }).join('');
  return `<section class="screen-card title-screen title-screen-v2 hero-select-screen"><div class="portrait-frame"><span class="portrait-label">HERO FILE · ${String(Object.keys(HEROES).indexOf(selectedHero)+1).padStart(3,'0')}</span><div class="hero-portrait-wrap"><img class="hero-portrait" src="${portrait}" alt="${chosen.name} selection portrait" /></div><span class="portrait-status"><i></i> READY TO DEPLOY</span></div><div class="title-copy"><div class="eyebrow">A CITY UNDER PRESSURE · AN ORIGINAL SUPERHERO SURVIVOR</div><h1>GRAND<br><em>GLORY</em></h1><div class="title-rule"><i></i><span>ENDLESS SURVIVAL · PROTOTYPE</span><i></i></div><div class="selected-hero"><span>SELECTED HERO · ${chosen.role}</span><strong>${chosen.name} · ${chosen.title}</strong></div><p>${chosen.description}</p><div class="hero-choices">${heroCards}</div><div class="title-settings"><label>DIFFICULTY <select data-setting="difficulty" aria-label="Difficulty"><option value="normal" ${selectedDifficulty === 'normal' ? 'selected' : ''}>Normal · Recommended</option><option value="heroic" ${selectedDifficulty === 'heroic' ? 'selected' : ''}>Heroic · Advanced</option></select></label><label>CAMERA <select data-setting="camera" aria-label="Camera scale"><option value="wide" ${cameraPreset === 'wide' ? 'selected' : ''}>Wide</option><option value="standard" ${cameraPreset === 'standard' ? 'selected' : ''}>Standard</option><option value="close" ${cameraPreset === 'close' ? 'selected' : ''}>Close</option></select></label><button class="sound-toggle" data-action="sound" aria-pressed="${audio.isEnabled()}">SOUND ${audio.isEnabled() ? 'ON' : 'OFF'}</button><label>SFX <input data-setting="volume" aria-label="Sound effects volume" type="range" min="0" max="1" step="0.05" value="${audio.getVolume()}" /></label><button class="sound-toggle" data-action="reduced-motion" aria-pressed="${reducedMotion}">REDUCED MOTION ${reducedMotion ? 'ON' : 'OFF'}</button></div><button class="primary play-button" data-action="start"><span>▶</span> PLAY NOW · ENDLESS RUN <small>ENTER</small></button><div class="title-controls"><strong>FIELD CONTROLS</strong><span><b>MOVE</b> WASD / ARROWS <b>DASH</b> SHIFT / SPACE</span><span><b>SPECIAL</b> Q <b>PAUSE</b> ESC</span></div><small class="canon-note">Abilities are prototype mechanics · Canon remains owner-controlled</small></div></section>${debug}`;
}

function renderUi(force = false): void {
  const diagnostics = game && renderer ? renderer.getPerformanceDiagnostics(game) : undefined;
  const debug = debugVisible ? `<aside class="debug-panel">FPS ${renderer?.app.ticker.FPS.toFixed(0) ?? '--'} · frame ${averageFrameMs.toFixed(1)} ms<br>${game ? `state ${game.status} · t ${game.elapsed.toFixed(1)}s · seed ${game.seed}<br>player ${game.player.x.toFixed(0)}, ${game.player.y.toFixed(0)} · hp ${Math.ceil(game.player.health)} · lv ${game.player.level} · xp ${Math.floor(game.player.xp)}/${game.player.xpNext}<br>enemies ${diagnostics?.activeEnemies ?? 0} active / ${diagnostics?.visibleEnemies ?? 0} visible · target ${game.hordeTarget} · deficit ${game.hordeDeficit} · spawn ${game.spawnRate.toFixed(1)}/s · kills ${game.killRate.toFixed(1)}/s · peak ${game.peakEnemies}<br>shots ${diagnostics?.projectiles ?? 0} · XP ${game.xpSpawned} spawned / ${game.pickups.reduce((sum, pile) => sum + pile.value, 0)} map / ${game.xpCollected} collected · ${game.pickups.length} piles · ${game.xpPilesMerged} merged · ${game.xpLost} lost<br>surge ${game.surgeRemaining > 0 ? `${game.surgeRemaining.toFixed(1)}s ${game.surgeDirection}` : 'off'} · spawn fallbacks ${game.spawnPlacementFallbacks} · recycled ${game.recycledEnemies}` : 'state title · seed pending'}<br>F4 collision overlay ${collisionDebugVisible ? 'ON' : 'OFF'} · <button class="debug-copy" data-action="copy-diagnostics">Copy run diagnostics</button></aside>` : '';
  if (!game) {
    ui.innerHTML = renderTitle(debug);
    return;
  }
  const g = game; const p = g.player;
  const hp = Math.max(0, p.health); const xpPct = Math.min(100, p.xp / p.xpNext * 100);
  let overlay = '';
  if (g.status === 'upgrade') overlay = `<div class="modal-shade"><section class="upgrade-panel"><div class="eyebrow">PLAYER LEVEL ${p.level} · SIMULATION PAUSED</div><h2>Choose your next move</h2><p class="upgrade-subtitle">A new edge for the fight ahead</p><div class="cards">${g.options.map((id, i) => { const u = getUpgrade(id); const category = upgradeCategory(id); const rank = getUpgradeRankProgress(id, p, g.chosen); return `<button class="upgrade-card ${category.className}" data-upgrade="${id}"><span class="card-num">${i + 1}</span><span class="upgrade-icon" aria-hidden="true">${category.icon}</span><span class="upgrade-category">${category.label}</span><strong>${u.title}</strong><b class="upgrade-rank">${rank.label}</b><small>${upgradeDetail(id, p)}</small><span class="card-pick">SELECT <b>${i + 1}</b></span></button>`; }).join('')}</div><small class="choice-hint">Simulation paused · Press 1, 2, or 3 to select</small></section></div>`;
  if (g.status === 'paused') overlay = menu('PAUSED', 'The city and combat are frozen · '+HEROES[p.heroId].name, 'resume', 'Resume') + `<button class="secondary restart-pause" data-action="restart">Restart Run</button><button class="secondary restart-pause" data-action="retire">Retire Run</button>`;
  if (g.status === 'victory' || g.status === 'defeat' || g.status==='retired') {
    const won = g.status === 'victory'; const retired=g.status==='retired';
    const resultMessage = won ? 'The finite encounter is complete.' : g.endReason === 'boss-escaped' ? 'The Gang Boss escaped after overtime.' : `${HEROES[p.heroId].name} has been overwhelmed.`;
    const damageSummary = damageSourceSummary(g.damageTaken);
    overlay = `<div class="modal-shade"><section class="screen-card results ${won ? 'results-won' : 'results-lost'}"><div class="eyebrow">FIELD REPORT · ${won ? 'ENCOUNTER COMPLETE' : retired?'RUN RETIRED':'RUN CONCLUDED'}</div><h2>${won ? 'VICTORY' : retired?'RUN COMPLETE':'DEFEAT'}</h2><p>${retired?'You chose to retire from the endless battle.':resultMessage}</p><div class="stats"><span>Hero<strong>${HEROES[p.heroId].name}</strong></span><span>Mode<strong>${g.endless?'ENDLESS':'FINITE TEST'} · ${DIFFICULTIES[config.difficulty].label}</strong></span><span>Survival<strong>${formatTime(g.elapsed)}</strong></span><span>Level<strong>${p.level}</strong></span><span>Enemies defeated<strong>${g.kills}</strong></span><span>Bosses defeated<strong>${g.bossesDefeated}</strong></span><span>Completed waves<strong>${g.completedWaves}</strong></span><span>Factions encountered<strong>${g.factionsEncountered.map(faction => faction === 'dr-smile' ? 'Dr. Smile faction' : 'Street Gang').join(' · ')}</strong></span><span>Peak horde<strong>${g.peakEnemies}</strong></span><span>Damage dealt<strong>${Math.round(p.damageDealt)}</strong></span><span class="wide">Damage taken by source<strong>${damageSummary}</strong></span><span class="wide">Experience<strong>${g.xpCollected} collected · ${g.pickups.reduce((sum, pile) => sum + pile.value, 0)} remains on the streets</strong></span><span class="wide">Weapons<strong>${g.attacks.join(' · ')}</strong></span></div><button class="primary" data-action="restart">Play Again</button><button class="secondary" data-action="title">Title Screen</button></section></div>`;
  }
  const boss = g.enemies.find(e => e.kind === 'boss' && !e.dead);
  const bossIntro = g.bossArrivalAt !== null && g.elapsed - g.bossArrivalAt < 4;
  const overtime = !g.endless && g.elapsed >= config.duration;
  const bossWarning = boss?.attackState === 'ranged-telegraph' ? ' · PROJECTILE WARNING' : boss?.attackState === 'charge-telegraph' ? ' · CHARGE WARNING' : boss?.attackState === 'recovering' ? ' · RECOVERING' : '';
  const bossArrival = bossIntro ? `<div class="boss-arrival" role="status"><span>MAJOR THREAT</span><strong>${boss?.bossId === 'dr-smile' ? 'DR. SMILE' : 'GANG BOSS'}</strong><small>${boss?.bossId === 'dr-smile' ? 'NEW FACTION ENCOUNTER' : 'CHAIN BOSS ENCOUNTER'}</small></div>` : '';
  const activeCount = g.enemies.filter(enemy => enemy.kind !== 'boss').length;
  const arsenal = p.heroId==='blue-pinwheel' ? [`Ring R${p.weaponRanks.pinwheel}`, p.weaponRanks.orbitGuard ? `Orbit R${p.weaponRanks.orbitGuard}` : '', p.weaponRanks.piercingThrow ? `Piercing Ring R${p.weaponRanks.piercingThrow}` : '', p.evolvedPinwheel ? 'RING EVOLVED' : ''].filter(Boolean).join(' · ') : p.heroId==='bok-goo' ? `Club R${p.weaponRanks.clubSweep} · Boulder R${p.weaponRanks.boulderToss}` : `Spear Thrust R${p.weaponRanks.spearThrust} · Spear Toss R${p.weaponRanks.spearToss}`;
  const factionLabel = g.factionsEncountered.map(faction => faction === 'dr-smile' ? 'DR. SMILE FACTION' : 'STREET GANG').join(' + ');
  ui.innerHTML = `<header class="hud"><div class="hero-tag"><span class="hero-dot"></span><div><strong>${HEROES[p.heroId].name.toUpperCase()}</strong><small>${HEROES[p.heroId].role}</small></div></div><span class="mode-pill mode-${config.difficulty}">${DIFFICULTIES[config.difficulty].label}</span><div class="health-block"><div class="bar-label"><span>HEALTH</span><b>${Math.ceil(hp)} / ${p.maxHealth}</b></div><div class="bar health-bar"><i class="health-fill" style="width:${hp / p.maxHealth * 100}%"></i></div></div><div class="level-block"><strong>LV ${p.level}</strong><div class="xp-bar"><i style="width:${xpPct}%"></i></div><small>${Math.floor(p.xp)} / ${p.xpNext} XP</small></div><div class="special-block"><span>Q · SPECIAL</span><div class="special-bar"><i style="width:${p.special}%"></i></div><small>${p.special >= 100 ? 'READY' : `${Math.floor(p.special)}%`}</small></div><div class="timer ${overtime ? 'overtime' : ''}">${overtime ? '<small>OVERTIME</small>' : ''}${formatTime(g.elapsed)}</div><button class="pause-button" data-action="pause" aria-label="Pause">Ⅱ</button></header>${boss ? `<div class="boss-hud"><strong>${boss.bossId==='dr-smile'?'DR. SMILE':'GANG BOSS'}${bossWarning}</strong><div class="bar"><i style="width:${boss.health / boss.maxHealth * 100}%"></i></div></div>` : ''}${bossArrival}${g.surgeRemaining > 0 ? `<div class="surge-alert" role="status">HORDE SURGE · FROM THE ${g.surgeDirection.toUpperCase()}</div>` : ''}<footer class="combat-hud"><span>◆ ${factionLabel} · WAVE ${g.completedWaves+1} · ${g.kills} defeated · ${activeCount} active</span><span>${arsenal}</span><span>Shift / Space · Dash ${p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s` : 'READY'} · ${g.surgeRemaining > 0 ? 'HORDE SURGE' : 'Q · SPECIAL'}</span></footer>${overlay}${debug}`;
  void force;
}
function formatTime(seconds: number): string { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
function upgradeDetail(id: UpgradeId, player: SimState['player']): string {
  const nextMultiplier = (values: readonly number[], rank: number) => Math.round((values[Math.min(rank, values.length - 1)] ?? 1) * 100);
  if (id === 'pinwheel') return `Blue ring damage ${nextMultiplier(ATTACKS.pinwheel.rankDamage ?? [1], player.weaponRanks.pinwheel)}% of base${(ATTACKS.pinwheel.rankPierce?.[player.weaponRanks.pinwheel] ?? 0) ? ' · gains piercing' : ''}`;
  if (id === 'orbit') return `Orbiting ring damage ${nextMultiplier(ATTACKS.orbitGuard.rankDamage ?? [1], player.weaponRanks.orbitGuard)}% of base`;
  if (id === 'piercingThrow') return `Piercing ring damage ${nextMultiplier(ATTACKS.piercingThrow.rankDamage ?? [1], player.weaponRanks.piercingThrow)}% of base`;
  if (id === 'magnet') return `Attraction range ${player.pickupRadius} → ${Math.min(160, player.pickupRadius + 20)} world units`;
  if (id === 'power') return `+15% damage; evolution prerequisite`;
  if (id === 'evolvePinwheel') return `Pinwheel ${player.weaponRanks.pinwheel}/${5} · Prototype Power ${player.powerRank}/${2} required. Unlocks +2 piercing and 30% faster starter attacks.`;
  if (id === 'clubSweep') return `Club Sweep ${player.weaponRanks.clubSweep} → ${player.weaponRanks.clubSweep+1}: wider reach and heavier strike`;
  if (id === 'spearThrust') return `Spear Thrust ${player.weaponRanks.spearThrust} → ${player.weaponRanks.spearThrust+1}: longer reach and stronger piercing line`;
  if (id === 'boulderToss') return player.weaponRanks.boulderToss===0?'Unlocks an aimed heavy boulder projectile':`Boulder Toss ${player.weaponRanks.boulderToss} → ${player.weaponRanks.boulderToss+1}: stronger impact and knockback`;
  if (id === 'spearToss') return player.weaponRanks.spearToss===0?'Unlocks a long-range piercing spear':`Spear Toss ${player.weaponRanks.spearToss} → ${player.weaponRanks.spearToss+1}: increased damage and piercing`;
  return getUpgrade(id).detail;
}
function upgradeCategory(id: UpgradeId): { label: string; icon: string; className: string } {
  if (id === 'evolvePinwheel') return { label: 'WEAPON EVOLUTION', icon: '✦', className: 'evolution-card' };
  if (['pinwheel','orbit','piercingThrow','clubSweep','boulderToss','spearThrust','spearToss'].includes(id)) return { label: id === 'orbit' || id === 'piercingThrow' ? 'PROTOTYPE WEAPON' : 'WEAPON RANK', icon: id === 'orbit' ? '◉' : '◎', className: 'weapon-card' };
  if (id === 'power' || id === 'damage' || id === 'tempo' || id === 'extra' || id==='mastery') return { label: 'COMBAT UPGRADE', icon: id === 'tempo' ? '↻' : id === 'extra' ? '✣' : '✦', className: 'combat-card' };
  return { label: 'FIELD UPGRADE', icon: id === 'speed' ? '➜' : id === 'magnet' ? '✧' : '+', className: 'passive-card' };
}

function damageSourceSummary(damage: SimState['damageTaken']): string {
  const labels: Array<[keyof typeof damage, string]> = [['thug-contact', 'Thug'], ['fast-contact', 'Fast'], ['bruiser-contact', 'Bruiser'], ['ranged-projectile', 'Ranged'], ['boss-contact', 'Boss contact'], ['boss-projectile', 'Boss shot'], ['boss-charge', 'Boss charge'],['yoyo-line','Yo-Yo line'],['boss-chain','Gang Boss chain'],['dr-smile-melee','Dr. Smile tool'],['dr-smile-zone','Dr. Smile hazard']];
  return labels.filter(([key]) => damage[key] > 0).map(([key, label]) => `${label} ${damage[key].toFixed(1)}`).join(' · ') || 'No damage received';
}

ui.addEventListener('change', e => {
  const target = e.target as HTMLSelectElement;
  if (target.dataset.setting === 'difficulty') {
    selectedDifficulty = target.value as DifficultyId;
    try { localStorage.setItem('grand-glory-difficulty', selectedDifficulty); } catch { /* Optional preference. */ }
    config = { ...(testConfiguration ? testRun : standardRun), difficulty: selectedDifficulty };
    audio.play('menu'); renderUi(true);
  } else if (target.dataset.setting === 'camera') {
    cameraPreset = target.value as 'wide' | 'standard' | 'close'; renderer?.setCameraPreset(cameraPreset);
    try { localStorage.setItem('grand-glory-camera', cameraPreset); } catch { /* Optional preference. */ }
    audio.play('menu');
  } else if (target.dataset.setting === 'volume') {
    audio.setVolume(Number(target.value));
  }
});

ui.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  const hero=target.closest<HTMLElement>('[data-hero]')?.dataset.hero as HeroId|undefined;
  if(hero&&!game){selectedHero=hero;try{localStorage.setItem('grand-glory-hero',hero);}catch{/* Optional preference. */}audio.play('menu');renderUi(true);return;}
  const upgrade = target.closest<HTMLElement>('[data-upgrade]')?.dataset.upgrade as UpgradeId | undefined;
  if (upgrade && game) { if (chooseUpgrade(game, upgrade)) audio.play('upgrade'); renderUi(true); return; }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'sound') { audio.toggle(); audio.play('menu'); renderUi(true); return; }
  if (action === 'reduced-motion') { reducedMotion = !reducedMotion; try { localStorage.setItem('grand-glory-reduced-motion', reducedMotion ? 'on' : 'off'); } catch { /* Optional preference. */ } renderer?.setReducedMotion(reducedMotion); document.documentElement.classList.toggle('reduced-motion', reducedMotion); renderUi(true); return; }
  if (action === 'copy-diagnostics' && game) {
    const active = game.enemies.filter(enemy => enemy.kind !== 'boss').length;
    const kindCounts = game.enemies.reduce<Record<string, number>>((counts, enemy) => { counts[enemy.kind] = (counts[enemy.kind] ?? 0) + 1; return counts; }, {});
    const visible = renderer.getPerformanceDiagnostics(game).visibleEnemies;
    const report = [`GRAND GLORY ${DIFFICULTIES[config.difficulty].label} run: ${game.status}`, `Time ${formatTime(game.elapsed)} · seed ${game.seed}`, `HP ${Math.ceil(game.player.health)}/${game.player.maxHealth} · level ${game.player.level}`, `Enemies ${active} active / ${visible} visible · target ${game.hordeTarget} · peak ${game.peakEnemies}`, `Spawn ${game.spawnRate.toFixed(1)}/s · kills ${game.killRate.toFixed(1)}/s · types ${JSON.stringify(kindCounts)}`, `XP ${game.xpSpawned} spawned · ${game.xpCollected} collected · ${game.pickups.reduce((sum, pile) => sum + pile.value, 0)} on map · ${game.pickups.length} piles · ${game.xpPilesMerged} merged · ${game.xpLost} lost`, `Damage taken ${damageSourceSummary(game.damageTaken)}`, `Weapons Ring R${game.player.weaponRanks.pinwheel}, Orbit R${game.player.weaponRanks.orbitGuard}, Piercing Ring R${game.player.weaponRanks.piercingThrow}${game.player.evolvedPinwheel ? ' (evolved)' : ''}`, `Kills ${game.kills} · recycled ${game.recycledEnemies} · placement fallbacks ${game.spawnPlacementFallbacks}`, `Outcome ${game.status} · boss ${game.bossDefeated ? 'defeated' : game.endReason ?? 'active'}`].join('\n');
    void navigator.clipboard?.writeText(report).catch(() => {});
    return;
  }
  if (action === 'start' || action === 'restart') { start(); return; }
  if (action === 'title') { title(); return; }
  if(action==='retire'&&game){retireRun(game);renderUi(true);return;}
  if (action === 'pause' && game?.status === 'playing') { game.status = 'paused'; renderUi(true); return; }
  if (action === 'resume' && game?.status === 'paused') { game.status = 'playing'; lastTime = performance.now(); renderUi(true); }
});

function keyName(e: KeyboardEvent): string { return e.key.toLowerCase(); }
window.addEventListener('keydown', e => {
  const k = keyName(e); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if(!game&&['1','2','3'].includes(k)){selectedHero=(['blue-pinwheel','bok-goo','da-ri'] as const)[Number(k)-1]??selectedHero;try{localStorage.setItem('grand-glory-hero',selectedHero);}catch{/* Optional preference. */}renderUi(true);}
  held.add(k); setInput();
  if (k === 'f3' && import.meta.env.DEV) { debugVisible = !debugVisible; renderUi(true); }
  if (k === 'f4' && import.meta.env.DEV) { collisionDebugVisible = !collisionDebugVisible; renderer?.setCollisionDebugEnabled(collisionDebugVisible); renderUi(true); }
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
renderer.setCameraPreset(cameraPreset);
renderer.setReducedMotion(reducedMotion); document.documentElement.classList.toggle('reduced-motion', reducedMotion);
let previousKills = 0; let previousXp = 0; let previousSpecial = false; let previousBossArrival = false; let previousResult: string | null = null;
let previousHealth = 0; let previousDashTimer = 0; let previousAttackTimer = 0;
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
    if (game.kills > previousKills) audio.play('defeat');
    if (game.player.xp > previousXp) audio.play('pickup');
    if (game.player.health < previousHealth) audio.play('hit');
    if (game.player.dashTimer > 0 && previousDashTimer <= 0) audio.play('dash');
    if (game.player.attackTimer > previousAttackTimer + 0.25) audio.play('attack');
    if (game.specialTimer > 0 && !previousSpecial) audio.play('special');
    if (game.bossArrivalAt !== null && !previousBossArrival) audio.play('boss');
    previousKills = game.kills; previousXp = game.player.xp; previousSpecial = game.specialTimer > 0; previousBossArrival = game.bossArrivalAt !== null; previousHealth = game.player.health; previousDashTimer = game.player.dashTimer; previousAttackTimer = game.player.attackTimer;
    const outcome = game.status as SimState['status'];
    if (outcome === 'victory' || outcome === 'defeat') { if (previousResult !== outcome) audio.play(outcome === 'victory' ? 'victory' : 'loss'); previousResult = outcome; }
    renderer.draw(game); hudTime += ticker.deltaMS;
    if (game.status !== statusBeforeStep || hudTime > 140) { renderUi(); hudTime = 0; }
  } else if (manualRenderStress && game?.status === 'playing') renderer.draw(game);
});
renderUi(true);

// Deterministic test hooks exist only in the development server; the production bundle excludes them.
if (import.meta.env.DEV && params.has('test')) {
  Object.defineProperty(window, '__GG_TEST__', { configurable: false, value: {
    getState: () => game,
    refresh: () => { if (game) { renderer.draw(game); renderUi(true); } },
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
    prepareFacingCheck: () => { if (!game) return; game.status = 'playing'; game.levelChoices = 0; game.options = []; game.player.attackTimer = 100_000; game.player.piercingTimer = 100_000; game.player.xp = 0; game.spawnTimer = 100_000; game.projectiles.length = 0; for (const enemy of game.enemies) { enemy.speed = 0; enemy.health = enemy.maxHealth = 1_000; enemy.rangedTimer = 100_000; } },
    finishFacingCheck: () => { if (!game) return; game.player.invulnerable = 0; game.player.attackTimer = 0.05; game.player.piercingTimer = 0.05; game.spawnTimer = 0.5; for (const enemy of game.enemies) { enemy.speed = ENEMIES[enemy.kind].speed; enemy.health = enemy.maxHealth; } },
    setPlayerPosition: (x: number, y: number) => { if (!game) return; const point = nearestWalkablePoint(game.stage, x, y, 18); game.player.x = point.x; game.player.y = point.y; game.navigationTargetCell = -1; },
    grantXp: (amount = 60) => { if (!game) return; game.player.xp += amount; timedUpdate(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); },
    spawn: (kind: 'thug' | 'fastThug' | 'gangster' | 'bruiser' | 'boss' = 'thug', x?: number, y?: number) => { if (!game) return; game.enemies.push(spawnEnemy(game, kind, config, { x: x ?? game.player.x + 150, y: y ?? game.player.y })); renderUi(true); },
    defeatEnemy: (id: number) => { if (!game) return; const enemy = game.enemies.find(item => item.id === id); if (enemy) applyEnemyDamage(game, enemy, enemy.health, { x: 0, y: 0 }, config); renderer.draw(game); renderUi(true); },
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
    damagePlayer: (amount = 100) => { if (!game) return; game.player.invulnerable = 0; damagePlayer(game, amount, 'thug-contact', config); renderUi(true); },
    pause: () => { if (game) { game.status = 'paused'; renderUi(true); } },
    injectPickup: (value = 40) => { if (game) { game.pickups.push({ id: game.nextId++, x: game.player.x, y: game.player.y, value }); timedUpdate(game, fixed, { x: 0, y: 0, dash: false, special: false }, config); renderUi(true); } },
    advance: (seconds: number, x = 0, y = 0, dash = false, special = false, orbitPath = false) => { if (!game) return; const count = Math.min(60_000, Math.ceil(Math.max(0, seconds) / fixed)); for (let i = 0; i < count && game.status === 'playing'; i++) { const angle = game.elapsed * 0.5; timedUpdate(game, fixed, { x: orbitPath ? Math.cos(angle) : x, y: orbitPath ? Math.sin(angle) : y, dash, special }, config); } renderer.draw(game); renderUi(true); },
    chooseOption: (index: number) => { if (game?.status !== 'upgrade') return false; const id = game.options[index]; if (!id) return false; const chosen = chooseUpgrade(game, id); renderer.draw(game); renderUi(true); return chosen; },
  } });
}

declare global { interface Window { __GG_TEST__?: { getState: () => SimState | null; refresh: () => void; defeatEnemy: (id: number) => void; getRendererState: () => ReturnType<GameRenderer['getAnimationDiagnostics']>; getPerformanceDiagnostics: () => ReturnType<GameRenderer['getPerformanceDiagnostics']> & { simulation: { average: number; p95: number; worst: number }; frames: { average: number; p95: number; worst: number }; droppedSimulationUpdates: number; longFrames: number }; populateStress: (count: number) => void; start: () => void; prepareFacingCheck: () => void; finishFacingCheck: () => void; setPlayerPosition: (x: number, y: number) => void; grantXp: (amount?: number) => void; spawn: (kind?: 'thug' | 'fastThug' | 'gangster' | 'bruiser' | 'boss', x?: number, y?: number) => void; prepareBossForAttack: () => void; startBoss: () => void; damagePlayer: (amount?: number) => void; pause: () => void; injectPickup: (value?: number) => void; advance: (seconds: number, x?: number, y?: number, dash?: boolean, special?: boolean, orbitPath?: boolean) => void; chooseOption: (index: number) => boolean } } }
