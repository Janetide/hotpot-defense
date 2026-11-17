// Boiling Defense — the hotpot's broth: the health you defend.
// Every monster that reaches the pot spills broth; at 0 the pot is ruined
// and the game is lost. The broth also bubbles and steams for the renderer.
import { BROTH_MAX } from './config.js';

/** Fresh broth for a new game. */
export function createBroth() {
  return {
    hp: BROTH_MAX,
    max: BROTH_MAX,
    bubbles: [],
    steamTimer: 0,
    shake: 0,
  };
}

/** Spill `amount` broth. Returns true when the broth hits 0 (game over). */
export function damageBroth(broth, amount) {
  broth.hp = Math.max(0, broth.hp - amount);
  broth.shake = 0.35;
  return broth.hp <= 0;
}

/** Broth fraction 0..1, for the HP bar. */
export function brothFraction(broth) { return broth.hp / broth.max; }

/** Broth status word for the HUD: full, simmering, low, critical. */
export function brothStatus(broth) {
  const f = brothFraction(broth);
  if (f > 0.6) return 'Simmering';
  if (f > 0.3) return 'Low';
  return 'Critical!';
}
