// Boiling Defense — the world: one game state and its fixed-step update.
// Owns money, broth, waves, spawning, towers firing, projectiles, particles
// and floating numbers. The main loop only drives it and draws it.
import { BROTH_MAX, ECONOMY, START_MONEY, TOTAL_WAVES, TOWER_TYPES } from './config.js';
import { createBroth, damageBroth } from './broth.js';
import { awardKill, awardWaveClear, canAfford, createEconomy, earnCoins, spendCoins, updateCombo } from './economy.js';
import { createMonster, updateMonster } from './monsters.js';
import { bossMinionKinds, createBoss, updateBossEnrage } from './boss.js';
import { buildWave, isBossWave, spawnInterval } from './waves.js';
import { createTower, fireProjectile, pickTarget, resolveHit, towerStats, towerUpgradeCost, towerSellValue, upgradeTower, updateProjectile } from './towers.js';
import { PLOTS } from './path.js';

export const EVENT_KILL = 1;
export const EVENT_LEAK = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;
export const EVENT_OVER = 16;
export const EVENT_PLACE = 32;
export const EVENT_UPGRADE = 64;
export const EVENT_SELL = 128;
export const EVENT_WAVE_START = 256;
export const EVENT_BOSS = 512;
export const EVENT_DENY = 1024;

/** Fresh world for a new game. */
export function createWorld(rng) {
  return {
    rng,
    time: 0,
    wave: 0,
    phase: 'build', // 'build' | 'wave' | 'won' | 'lost'
    economy: createEconomy(),
    broth: createBroth(),
    monsters: [],
    towers: [],
    projectiles: [],
    particles: [],
    floaters: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveBanner: 0,
    waveBannerText: '',
    selectedType: 'chili',
    selectedPlot: -1,
    selectedTower: null,
    hoverPlot: -1,
    boss: null,
    bossEnraged: false,
    waveClearBonus: 0,
    started: false,
  };
}

/** Reset the world in place for a restart. */
export function resetWorld(world) {
  const fresh = createWorld(world.rng);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

/** Broth Tower income for the current towers (paid at wave clear). */
export function brothIncome(world) {
  let income = 0;
  for (const t of world.towers) {
    if (t.type === 'broth') income += towerStats('broth', t.level).income;
  }
  return income;
}

function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1.1, max: 1.1 });
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
      life: world.rng.range(0.3, 0.7), max: 0.7, color,
      size: world.rng.range(2, 5),
    });
  }
}

function steam(world, dt) {
  world.broth.steamTimer -= dt;
  if (world.broth.steamTimer <= 0) {
    world.broth.steamTimer = 0.12;
    world.particles.push({
      x: 460 + world.rng.range(-40, 40), y: 400 - 52,
      vx: world.rng.range(-6, 6), vy: -world.rng.range(28, 55),
      life: world.rng.range(0.8, 1.4), max: 1.4, color: 'rgba(255,235,210,0.5)',
      size: world.rng.range(5, 10), steam: true,
    });
  }
  if (world.broth.shake > 0) world.broth.shake -= dt;
}

/** Start the next wave (1..10). Returns false when none is left. */
export function startWave(world) {
  if (world.phase !== 'build' || world.wave >= TOTAL_WAVES) return false;
  world.wave += 1;
  world.spawnQueue = buildWave(world.wave);
  world.spawnTimer = 0.4;
  world.phase = 'wave';
  world.waveBanner = 2.2;
  world.waveBannerText = isBossWave(world.wave) ? 'WAVE 10 — THE BUTTER GIANT!' : `WAVE ${world.wave} / ${TOTAL_WAVES}`;
  return true;
}

/** Place a tower of the selected type on a plot. Returns an event bit. */
export function placeTower(world, plotIndex, type) {
  if (plotIndex < 0 || plotIndex >= PLOTS.length) return EVENT_DENY;
  if (world.towers.some((t) => t.plotIndex === plotIndex)) return EVENT_DENY;
  const def = TOWER_TYPES[type];
  if (!def || !spendCoins(world.economy, def.cost)) return EVENT_DENY;
  const tower = createTower(type, plotIndex, PLOTS[plotIndex]);
  world.towers.push(tower);
  world.selectedTower = tower;
  world.selectedPlot = plotIndex;
  burst(world, tower.x, tower.y, def.color, 14, 90);
  return EVENT_PLACE;
}

/** Upgrade the selected tower. Returns an event bit. */
export function upgradeSelected(world) {
  const tower = world.selectedTower;
  if (!tower) return EVENT_DENY;
  const cost = towerUpgradeCost(tower);
  if (cost === null || !spendCoins(world.economy, cost)) return EVENT_DENY;
  upgradeTower(tower);
  burst(world, tower.x, tower.y, '#ffd23e', 16, 110);
  return EVENT_UPGRADE;
}

/** Sell the selected tower for a refund. Returns an event bit. */
export function sellSelected(world) {
  const tower = world.selectedTower;
  if (!tower) return EVENT_DENY;
  earnCoins(world.economy, towerSellValue(tower));
  world.towers = world.towers.filter((t) => t !== tower);
  world.selectedTower = null;
  world.selectedPlot = -1;
  burst(world, tower.x, tower.y, '#b09a86', 10, 70);
  return EVENT_SELL;
}

function spawnNext(world) {
  const kind = world.spawnQueue.shift();
  if (kind === undefined) return;
  let monster;
  if (kind === 'boss') {
    monster = createBoss(world.wave, world.rng);
    world.boss = monster;
  } else {
    monster = createMonster(kind, world.wave, world.rng);
  }
  world.monsters.push(monster);
}

function handleKill(world, monster, events) {
  const paid = awardKill(world.economy, monster.reward, world.time);
  addFloater(world, monster.x, monster.y - 14, `+${paid}`, '#ffd23e');
  burst(world, monster.x, monster.y, monster.color, 10, 100);
  if (monster.isBoss) {
    world.economy.score += ECONOMY.bossScore;
    addFloater(world, monster.x, monster.y - 34, 'BOSS DOWN! +500', '#ffd23e');
    world.boss = null;
  }
  return events | EVENT_KILL;
}

function handleLeak(world, monster, events) {
  const lost = damageBroth(world.broth, monster.leak);
  addFloater(world, 460, 330, `-${monster.leak} BROTH`, '#ff5252');
  burst(world, 460, 400, '#e63b12', 18, 130);
  if (lost) {
    world.phase = 'lost';
    return events | EVENT_LEAK | EVENT_OVER;
  }
  return events | EVENT_LEAK;
}

/** Advance the world one fixed step. Returns an event bitmask. */
export function worldStep(world, dt) {
  let events = 0;
  world.time += dt;
  updateCombo(world.economy, dt);
  steam(world, dt);
  if (world.waveBanner > 0) world.waveBanner -= dt;

  // Spawning.
  if (world.phase === 'wave' && world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      spawnNext(world);
      if (world.boss && world.boss.alive) events |= EVENT_BOSS;
      world.spawnTimer = spawnInterval(world.wave);
    }
  }

  // Towers aim and fire.
  for (const tower of world.towers) {
    if (tower.flash > 0) tower.flash -= dt;
    if (tower.cooldown > 0) tower.cooldown -= dt;
    if (tower.type === 'broth') continue;
    if (tower.cooldown <= 0) {
      const target = pickTarget(tower, world.monsters);
      if (target) {
        world.projectiles.push(fireProjectile(tower, target));
      }
    }
  }

  // Projectiles fly and hit.
  for (const p of world.projectiles) {
    if (updateProjectile(p, dt) === 'hit') {
      const killed = resolveHit(p, world.monsters, world.time);
      for (const m of killed) { events = handleKill(world, m, events); if (p.tower) p.tower.kills += 1; }
      if (p.target) burst(world, p.target.x, p.target.y, p.color, 5, 70);
    }
  }
  world.projectiles = world.projectiles.filter((p) => !p.dead);

  // Monsters walk, burn, and leak.
  for (const monster of world.monsters) {
    const result = updateMonster(monster, dt, world.time);
    if (result === 'dead') {
      events = handleKill(world, monster, events);
    } else if (result === 'pot') {
      events = handleLeak(world, monster, events);
    }
    if (monster.isBoss && monster.alive) {
      const spawned = updateBossEnrage(monster);
      if (spawned > 0) {
        world.bossEnraged = true;
        for (const kind of bossMinionKinds()) {
          const minion = createMonster(kind, world.wave, world.rng);
          minion.dist = Math.max(0, monster.dist - 30);
          world.monsters.push(minion);
        }
        addFloater(world, monster.x, monster.y - 40, 'ENRAGED!', '#ff5252');
      }
    }
  }
  world.monsters = world.monsters.filter((m) => m.alive);

  // Particles and floating numbers fade.
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.steam ? -8 * dt : 60 * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floaters) { f.life -= dt; f.y -= 34 * dt; }
  world.floaters = world.floaters.filter((f) => f.life > 0);

  // Wave clear: queue empty, no monsters left, still fighting.
  if (world.phase === 'wave' && world.spawnQueue.length === 0 && world.monsters.length === 0) {
    const bonus = awardWaveClear(world.economy, world.wave, brothIncome(world));
    world.waveClearBonus = bonus;
    addFloater(world, 460, 300, `WAVE CLEAR +${bonus}`, '#7ee081');
    events |= EVENT_WAVE_CLEAR;
    if (world.wave >= TOTAL_WAVES) {
      world.phase = 'won';
      events |= EVENT_WIN;
    } else {
      world.phase = 'build';
    }
  }
  return events;
}

/** True when the game is over (won or lost). */
export function worldIsOver(world) { return world.phase === 'won' || world.phase === 'lost'; }
