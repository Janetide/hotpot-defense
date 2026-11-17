// Boiling Defense — towers: build, upgrade, sell, aim and fire.
// A tower stands on a plot, picks the monster furthest along the path in
// range, and fires homing projectiles. Chili burns, garlic slows, pepper
// stuns, sesame splashes, and the Broth Tower earns chili oil each wave.
import { LEVEL_SCALE, MAX_LEVEL, TOWER_TYPES, upgradeCost, sellValue } from './config.js';
import { applyBurn, applySlow, applyStun, damageMonster } from './monsters.js';

let nextTowerId = 1;

/** Stats for a tower type at a level (damage, range and effects scaled). */
export function towerStats(type, level) {
  const def = TOWER_TYPES[type];
  const scale = LEVEL_SCALE[level];
  return {
    damage: Math.round(def.damage * scale.damage),
    range: Math.round(def.range * scale.range),
    rate: def.rate,
    dotDps: Math.round(def.dotDps * scale.effect),
    dotSeconds: def.dotSeconds,
    slow: def.slow ? Math.min(0.7, def.slow * scale.effect) : 0,
    slowSeconds: def.slowSeconds || 0,
    stun: def.stun ? def.stun * scale.effect : 0,
    splash: def.splash ? Math.round(def.splash * scale.range) : 0,
    income: def.income ? Math.round(def.income * scale.income) : 0,
    projectileSpeed: def.projectileSpeed,
  };
}

/** Create a level-1 tower of `type` on plot `plotIndex`. */
export function createTower(type, plotIndex, plot) {
  return {
    id: nextTowerId += 1,
    type,
    name: TOWER_TYPES[type].name,
    color: TOWER_TYPES[type].color,
    plotIndex,
    x: plot.x,
    y: plot.y,
    level: 1,
    cooldown: 0,
    angle: -Math.PI / 2,
    kills: 0,
    flash: 0,
  };
}

/** Cost to upgrade this tower one level, or null when maxed. */
export function towerUpgradeCost(tower) {
  if (tower.level >= MAX_LEVEL) return null;
  return upgradeCost(tower.type);
}

/** Upgrade a tower one level (caller checks the money). */
export function upgradeTower(tower) {
  if (tower.level >= MAX_LEVEL) return false;
  tower.level += 1;
  tower.flash = 0.4;
  return true;
}

/** Refund for selling this tower. */
export function towerSellValue(tower) { return sellValue(tower); }

/** The monster furthest along the path inside the tower's range, or null. */
export function pickTarget(tower, monsters) {
  const stats = towerStats(tower.type, tower.level);
  let best = null;
  for (const m of monsters) {
    if (!m.alive) continue;
    const d = Math.hypot(m.x - tower.x, m.y - tower.y);
    if (d <= stats.range + m.radius && (!best || m.dist > best.dist)) best = m;
  }
  return best;
}

/** Fire one projectile at `target`; returns the projectile object. */
export function fireProjectile(tower, target) {
  const stats = towerStats(tower.type, tower.level);
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.cooldown = 1 / stats.rate;
  tower.flash = 0.12;
  return {
    x: tower.x,
    y: tower.y,
    target,
    tower,
    speed: stats.projectileSpeed,
    damage: stats.damage,
    type: tower.type,
    level: tower.level,
    splash: stats.splash,
    dotDps: stats.dotDps,
    dotSeconds: stats.dotSeconds,
    slow: stats.slow,
    slowSeconds: stats.slowSeconds,
    stun: stats.stun,
    color: tower.color,
    dead: false,
    trail: 0,
  };
}

/**
 * Hit resolution: damage the target, apply burn/slow/stun, splash neighbours.
 * Returns the list of monsters killed by this hit.
 */
export function resolveHit(projectile, monsters, now) {
  const killed = [];
  const target = projectile.target;
  const hitOne = (m) => {
    if (!m.alive) return;
    if (projectile.dotDps > 0) applyBurn(m, projectile.dotDps, projectile.dotSeconds, now);
    if (projectile.slow > 0) applySlow(m, projectile.slow, projectile.slowSeconds, now);
    if (projectile.stun > 0) applyStun(m, projectile.stun, now);
    if (damageMonster(m, projectile.damage)) killed.push(m);
  };
  if (target && target.alive) hitOne(target);
  if (projectile.splash > 0 && target) {
    for (const m of monsters) {
      if (m === target || !m.alive) continue;
      if (Math.hypot(m.x - target.x, m.y - target.y) <= projectile.splash) hitOne(m);
    }
  }
  return killed;
}

/** Advance one projectile toward its target; returns 'hit' on impact. */
export function updateProjectile(p, dt) {
  if (p.dead) return null;
  const t = p.target;
  const tx = t && t.alive ? t.x : p.x;
  const ty = t && t.alive ? t.y : p.y;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  const step = p.speed * dt;
  if (d <= Math.max(step, 10)) { p.dead = true; return 'hit'; }
  p.x += (dx / d) * step;
  p.y += (dy / d) * step;
  p.trail += dt;
  return null;
}
