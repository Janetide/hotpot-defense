// Boiling Defense — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'boiling-defense.best';
export const MUTE_KEY = 'boiling-defense.muted';
export const TOTAL_WAVES = 10;
export const START_MONEY = 180;
export const BROTH_MAX = 100;

// Layout: top HUD, board on the left, build panel on the right.
export const HUD = { height: 54 };
export const BOARD = { x: 0, y: 54, width: 920, height: 666 };
export const PANEL = { x: 920, y: 54, width: 360, height: 666 };
export const POT = { x: 460, y: 400, radius: 64 };

export const PALETTE = {
  backdrop: '#160b08',
  board: '#1d100a',
  boardEdge: '#3a1f12',
  path: '#4a2c14',
  pathEdge: '#6b4423',
  pathLine: '#8a5a30',
  hud: '#f5e6d3',
  muted: '#b09a86',
  panel: '#241209',
  panelEdge: '#5a3018',
  card: '#2e1a0c',
  cardEdge: '#6b4423',
  cardSel: '#ff7a1a',
  pot: '#8c1d12',
  potEdge: '#d43d1e',
  broth: '#e63b12',
  brothLight: '#ff7a2a',
  brothDark: '#a32408',
  money: '#ffd23e',
  danger: '#ff5252',
  ok: '#7ee081',
  accent: '#ff9f1c',
  chili: '#ff3b30',
  garlic: '#f5f0e1',
  pepper: '#c0392b',
  brothTower: '#ffb347',
  sesame: '#f7d774',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Tower catalogue: 5 types, 3 upgrade levels each. Stats scale per level.
export const TOWER_TYPES = {
  chili: {
    key: 'chili', name: 'Chili Tower', short: 'CHILI', hotkey: '1', cost: 50,
    color: '#ff3b30', range: 115, damage: 13, rate: 1.25, projectileSpeed: 420,
    dotDps: 5, dotSeconds: 2, slow: 0, stun: 0, splash: 0,
    desc: 'Fire bolt + burn (DoT)',
  },
  garlic: {
    key: 'garlic', name: 'Garlic Tower', short: 'GARLIC', hotkey: '2', cost: 40,
    color: '#f5f0e1', range: 105, damage: 5, rate: 2.0, projectileSpeed: 380,
    dotDps: 0, dotSeconds: 0, slow: 0.45, slowSeconds: 1.6, stun: 0, splash: 0,
    desc: 'Slows monsters 45%',
  },
  pepper: {
    key: 'pepper', name: 'Pepper Tower', short: 'PEPPER', hotkey: '3', cost: 80,
    color: '#c0392b', range: 125, damage: 9, rate: 0.6, projectileSpeed: 520,
    dotDps: 0, dotSeconds: 0, slow: 0, stun: 0.7, splash: 0,
    desc: 'Stuns monsters 0.7s',
  },
  broth: {
    key: 'broth', name: 'Broth Tower', short: 'BROTH', hotkey: '4', cost: 60,
    color: '#ffb347', range: 0, damage: 0, rate: 0, projectileSpeed: 0,
    dotDps: 0, dotSeconds: 0, slow: 0, stun: 0, splash: 0, income: 10,
    desc: '+10 chili oil each wave',
  },
  sesame: {
    key: 'sesame', name: 'Sesame Tower', short: 'SESAME', hotkey: '5', cost: 70,
    color: '#f7d774', range: 110, damage: 10, rate: 0.8, projectileSpeed: 340,
    dotDps: 0, dotSeconds: 0, slow: 0, stun: 0, splash: 58,
    desc: 'Splash damage, wide',
  },
};
export const TOWER_ORDER = ['chili', 'garlic', 'pepper', 'broth', 'sesame'];
export const MAX_LEVEL = 3;
// Level multipliers: damage / range / effect scale.
export const LEVEL_SCALE = [
  null,
  { damage: 1, range: 1, effect: 1, income: 1 },
  { damage: 1.7, range: 1.12, effect: 1.3, income: 2 },
  { damage: 2.6, range: 1.25, effect: 1.6, income: 3.5 },
];
export function upgradeCost(type) { return Math.round(TOWER_TYPES[type].cost * (type === 'broth' ? 0.7 : 0.9)); }
export function sellValue(tower) {
  const base = TOWER_TYPES[tower.type].cost;
  const spent = base + (tower.level - 1) * upgradeCost(tower.type);
  return Math.round(spent * 0.7);
}

// Ingredient monsters: distinct colour, shape, HP, speed and leak damage.
export const MONSTER_TYPES = {
  meatball: { key: 'meatball', name: 'Meatball', color: '#a0522d', hp: 34, speed: 95, reward: 6, leak: 6, radius: 13 },
  greens: { key: 'greens', name: 'Greens', color: '#4caf50', hp: 20, speed: 150, reward: 5, leak: 4, radius: 11 },
  tofu: { key: 'tofu', name: 'Tofu', color: '#fdf6e3', hp: 56, speed: 68, reward: 8, leak: 8, radius: 13 },
  fishball: { key: 'fishball', name: 'Fish Ball', color: '#ffb6c1', hp: 28, speed: 125, reward: 6, leak: 5, radius: 12 },
  shrimp: { key: 'shrimp', name: 'Shrimp', color: '#ff7f50', hp: 42, speed: 110, reward: 9, leak: 7, radius: 12 },
};
export const MONSTER_ORDER = ['meatball', 'greens', 'tofu', 'fishball', 'shrimp'];

// Boss: the Butter Giant of wave 10.
export const BOSS = {
  key: 'boss', name: 'Butter Giant', color: '#f2c14e', hp: 1500, speed: 38,
  reward: 250, leak: 50, radius: 30,
};

export const ECONOMY = {
  waveClearBonus: (wave) => 20 + wave * 5,
  comboWindowSec: 2.5,
  comboStep: 0.05,
  comboCap: 20,
  killScore: 10,
  waveScore: 150,
  bossScore: 500,
};
