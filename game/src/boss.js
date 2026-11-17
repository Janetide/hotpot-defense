// Boiling Defense — the wave-10 boss: the Butter Giant (牛油巨怪).
// One huge butter block with far more HP than any ingredient, a visible HP
// bar, and two enrage thresholds where it speeds up and calls minions.
import { BOSS } from './config.js';
import { createMonster } from './monsters.js';

export const BOSS_ENRAGE_AT = [0.66, 0.33];

/** Create the Butter Giant for wave 10. */
export function createBoss(wave, rng) {
  const boss = createMonster('meatball', wave, rng);
  boss.isBoss = true;
  boss.kind = 'boss';
  boss.name = BOSS.name;
  boss.color = BOSS.color;
  boss.radius = BOSS.radius;
  boss.hp = BOSS.hp;
  boss.maxHp = BOSS.hp;
  boss.speed = BOSS.speed;
  boss.baseSpeed = BOSS.speed;
  boss.reward = BOSS.reward;
  boss.leak = BOSS.leak;
  boss.enrageStage = 0;
  boss.minionsCalled = 0;
  return boss;
}

/**
 * Check the boss's enrage thresholds. Returns how many minions to spawn
 * (0, 2 or 4) when a threshold is crossed, and speeds the boss up.
 */
export function updateBossEnrage(boss) {
  const frac = boss.hp / boss.maxHp;
  let spawned = 0;
  while (boss.enrageStage < BOSS_ENRAGE_AT.length && frac <= BOSS_ENRAGE_AT[boss.enrageStage]) {
    boss.enrageStage += 1;
    boss.speed = boss.baseSpeed * (1 + 0.35 * boss.enrageStage);
    spawned += 2;
  }
  boss.minionsCalled += spawned;
  return spawned;
}

/** Minion kinds the enraged boss calls to its aid. */
export function bossMinionKinds() { return ['shrimp', 'shrimp']; }
