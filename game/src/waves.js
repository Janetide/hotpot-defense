// Boiling Defense — the 10 waves: what spawns, in what order, how many.
// Early waves are slow meatballs and greens; later waves mix fast fish balls
// and tough tofu, and wave 10 ends with the Butter Giant boss.
import { TOTAL_WAVES } from './config.js';
import { waveKinds } from './monsters.js';

const WAVE_RECIPES = [
  { meatball: 6 },
  { meatball: 6, greens: 5 },
  { meatball: 6, greens: 6, fishball: 4 },
  { meatball: 8, greens: 6, tofu: 4, fishball: 4 },
  { meatball: 8, greens: 8, tofu: 5, fishball: 6, shrimp: 3 },
  { meatball: 10, greens: 8, tofu: 6, fishball: 6, shrimp: 5 },
  { meatball: 10, greens: 10, tofu: 8, fishball: 8, shrimp: 6 },
  { meatball: 12, greens: 10, tofu: 10, fishball: 8, shrimp: 8 },
  { meatball: 12, greens: 12, tofu: 12, fishball: 10, shrimp: 10 },
  { meatball: 8, greens: 8, tofu: 8, fishball: 8, shrimp: 8, boss: 1 },
];
const WAVE_ORDER = ['meatball', 'greens', 'fishball', 'tofu', 'shrimp', 'boss'];

/** The spawn list for wave `n` (1-based): kinds in spawn order. */
export function buildWave(n) {
  const recipe = WAVE_RECIPES[Math.max(1, Math.min(n, TOTAL_WAVES)) - 1];
  const list = [];
  // Interleave kinds so each wave feels mixed instead of one kind at a time.
  const pools = {};
  for (const kind of WAVE_ORDER) pools[kind] = recipe[kind] || 0;
  let remaining = Object.values(pools).reduce((a, b) => a + b, 0);
  while (remaining > 0) {
    for (const kind of WAVE_ORDER) {
      if (pools[kind] > 0) { list.push(kind); pools[kind] -= 1; remaining -= 1; }
    }
  }
  // The boss always walks in last.
  list.sort((a, b) => (a === 'boss' ? 1 : 0) - (b === 'boss' ? 1 : 0));
  return list;
}

/** Spawn interval (seconds) between monsters in wave `n`. */
export function spawnInterval(n) { return Math.max(0.45, 1.05 - n * 0.05); }

/** Total monsters in wave `n`. */
export function waveSize(n) { return buildWave(n).length; }

/** Preview rows for the side panel: kind + count for wave `n`. */
export function wavePreview(n) {
  const list = buildWave(n).filter((k) => k !== 'boss');
  const rows = waveKinds(list);
  if (buildWave(n).includes('boss')) rows.push({ kind: 'boss', count: 1 });
  return rows;
}

/** True when `n` is the boss wave. */
export function isBossWave(n) { return n === TOTAL_WAVES; }

/** Short label for the wave banner. */
export function waveLabel(n) {
  if (isBossWave(n)) return `WAVE ${n} — BUTTER GIANT!`;
  return `WAVE ${n} / ${TOTAL_WAVES}`;
}
