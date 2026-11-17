// Boiling Defense — the ingredient monsters that walk the path.
// A monster is plain data: kind, distance along the path, HP, speed and
// timed effects (slow, stun, burn). Pure logic: no DOM, no canvas.
import { MONSTER_TYPES, MONSTER_ORDER } from './config.js';
import { PATH_LENGTH, pointAt } from './path.js';

let nextId = 1;

/** Create one monster of `kind` for `wave` (HP grows with the wave). */
export function createMonster(kind, wave, rng) {
  const def = MONSTER_TYPES[kind];
  const hpScale = 1 + 0.22 * (wave - 1);
  const hp = Math.round(def.hp * hpScale);
  return {
    id: nextId += 1,
    kind,
    name: def.name,
    color: def.color,
    radius: def.radius,
    dist: -rng.range(0, 24),
    x: -20,
    y: 110,
    angle: 0,
    hp,
    maxHp: hp,
    speed: def.speed * rng.range(0.92, 1.08),
    baseSpeed: def.speed,
    reward: def.reward,
    leak: def.leak,
    slowUntil: 0,
    slowFactor: 1,
    stunUntil: 0,
    dotDps: 0,
    dotUntil: 0,
    alive: true,
    reachedPot: false,
    wobble: rng.range(0, Math.PI * 2),
    isBoss: false,
  };
}

/** Apply direct damage; returns true when the monster dies. */
export function damageMonster(monster, amount) {
  if (!monster.alive) return false;
  monster.hp -= amount;
  if (monster.hp <= 0) { monster.alive = false; return true; }
  return false;
}

/** Apply a burn (damage over time). */
export function applyBurn(monster, dps, seconds, now) {
  monster.dotDps = Math.max(monster.dotDps, dps);
  monster.dotUntil = Math.max(monster.dotUntil, now + seconds);
}

/** Apply a slow: monsters move at (1 - amount) speed until `now + seconds`. */
export function applySlow(monster, amount, seconds, now) {
  monster.slowFactor = Math.min(monster.slowFactor, 1 - amount);
  monster.slowUntil = Math.max(monster.slowUntil, now + seconds);
}

/** Apply a stun. */
export function applyStun(monster, seconds, now) {
  monster.stunUntil = Math.max(monster.stunUntil, now + seconds);
}

/** Advance one monster along the path. Returns 'pot' when it reaches the pot. */
export function updateMonster(monster, dt, now) {
  if (!monster.alive) return null;
  if (monster.dotUntil > now && monster.dotDps > 0) {
    if (damageMonster(monster, monster.dotDps * dt)) return 'dead';
  }
  if (monster.stunUntil > now) {
    // Stunned: frozen in place, still burning.
  } else {
    let speed = monster.speed;
    if (monster.slowUntil > now) speed *= monster.slowFactor;
    else monster.slowFactor = 1;
    monster.dist += speed * dt;
  }
  monster.wobble += dt * 6;
  if (monster.dist >= PATH_LENGTH) {
    monster.alive = false;
    monster.reachedPot = true;
    return 'pot';
  }
  const pos = pointAt(monster.dist);
  monster.x = pos.x;
  monster.y = pos.y;
  monster.angle = pos.angle;
  return null;
}

/** Kinds present in a wave, for the preview list. */
export function waveKinds(list) {
  const counts = {};
  for (const kind of list) counts[kind] = (counts[kind] || 0) + 1;
  return MONSTER_ORDER.filter((k) => counts[k]).map((k) => ({ kind: k, count: counts[k] }));
}
