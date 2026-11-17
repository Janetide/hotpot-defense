// Boiling Defense — the economy: chili oil (money), kills, combo and score.
// Kills pay coins; a fast kill chain builds a combo that raises each payout.
// Towers, upgrades and the Broth Tower's wave income all spend from here.
import { ECONOMY, START_MONEY } from './config.js';

/** Fresh economy for a new game. */
export function createEconomy() {
  return {
    money: START_MONEY,
    kills: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    earned: 0,
    spent: 0,
  };
}

/** True when the player can afford `cost`. */
export function canAfford(economy, cost) { return economy.money >= cost; }

/** Spend `cost` chili oil; returns false when unaffordable. */
export function spendCoins(economy, cost) {
  if (economy.money < cost) return false;
  economy.money -= cost;
  economy.spent += cost;
  return true;
}

/** Add `amount` chili oil (wave bonus, Broth Tower income, refunds). */
export function earnCoins(economy, amount) {
  economy.money += amount;
  economy.earned += amount;
}

/**
 * Pay out a kill: base reward scaled by the combo multiplier, plus score.
 * Returns the coins actually paid.
 */
export function awardKill(economy, baseReward, now) {
  economy.kills += 1;
  if (economy.comboTimer > 0) economy.combo += 1;
  else economy.combo = 1;
  economy.comboTimer = ECONOMY.comboWindowSec;
  economy.bestCombo = Math.max(economy.bestCombo, economy.combo);
  const capped = Math.min(economy.combo, ECONOMY.comboCap);
  const multiplier = 1 + (capped - 1) * ECONOMY.comboStep;
  const paid = Math.max(1, Math.round(baseReward * multiplier));
  economy.money += paid;
  economy.earned += paid;
  economy.score += ECONOMY.killScore + capped;
  return paid;
}

/** Tick the combo timer down; the chain breaks when it hits zero. */
export function updateCombo(economy, dt) {
  if (economy.comboTimer > 0) {
    economy.comboTimer -= dt;
    if (economy.comboTimer <= 0) economy.combo = 0;
  }
}

/** Wave-clear payout: bonus coins plus the Broth Towers' income. */
export function awardWaveClear(economy, wave, brothIncome) {
  const bonus = ECONOMY.waveClearBonus(wave) + brothIncome;
  economy.money += bonus;
  economy.earned += bonus;
  economy.score += ECONOMY.waveScore;
  return bonus;
}

/** Current combo coin multiplier, for the HUD. */
export function comboMultiplier(economy) {
  const capped = Math.min(economy.combo, ECONOMY.comboCap);
  return 1 + Math.max(0, capped - 1) * ECONOMY.comboStep;
}
