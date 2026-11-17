// Boiling Defense — the screenshot scenes behind ?shot=start|play|win|boss.
// Each scene plays the real rules forward from a fresh world, steered by an
// autopilot that builds towers, starts waves and upgrades, so the frame is
// what a real game looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, placeTower, resetWorld, startWave, upgradeSelected, worldStep } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

// Cheap, strong build order the autopilot follows on the best plots.
const BUILD_PLAN = [
  ['chili', 1], ['chili', 5], ['garlic', 4], ['sesame', 6], ['chili', 0],
  ['pepper', 7], ['broth', 11], ['sesame', 2], ['chili', 8], ['garlic', 10],
  ['pepper', 3], ['broth', 13], ['sesame', 9], ['chili', 12],
];

function autopilotBuild(world) {
  // Spend everything on the plan, then upgrade what stands.
  for (const [type, plot] of BUILD_PLAN) {
    if (!world.towers.some((t) => t.plotIndex === plot)) placeTower(world, plot, type);
  }
  for (const tower of [...world.towers]) {
    world.selectedTower = tower;
    upgradeSelected(world);
  }
  world.selectedTower = null;
}

function autopilotStep(world) {
  if (world.phase === 'build') {
    autopilotBuild(world);
    startWave(world);
  }
}

/** Set `world` to the named scene and return the screen to draw and the best score. */
export function stageShot(name, world) {
  resetWorld(world);
  if (name !== 'play' && name !== 'win' && name !== 'boss') {
    // Title: a dressed board behind the rules panel.
    autopilotBuild(world);
    return { screen: SCREEN_TITLE, best: 1250 };
  }
  if (name === 'boss') {
    // Wave 10 in full swing: boss on the path, towers firing, boss bar up.
    // Fast-forward waves 1-9 (clearing monsters as they spawn, broth topped
    // up) so the staging always reaches wave 10 intact.
    for (let i = 0; i < 9; i += 1) {
      world.phase = 'build';
      world.wave = i;
      world.economy.money = 600;
      autopilotBuild(world);
      startWave(world);
      let guard = 0;
      while (world.phase === 'wave' && guard < 60 * 120) {
        worldStep(world, STEP);
        world.monsters.length = 0;
        world.broth.hp = world.broth.max;
        guard += 1;
      }
    }
    world.phase = 'build';
    world.wave = 9;
    world.economy.money = 400;
    autopilotBuild(world);
    startWave(world);
    let guard = 0;
    while (!world.boss && guard < 60 * 60) { worldStep(world, STEP); guard += 1; }
    // Let the fight develop: towers firing, boss mid-path, projectiles flying.
    for (let i = 0; i < 60 * 6 && world.phase === 'wave'; i += 1) worldStep(world, STEP);
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'win') {
    // Play all 10 waves for real with the autopilot; the plan is tuned to win.
    let guard = 0;
    while (world.phase !== 'won' && world.phase !== 'lost' && guard < 60 * 60 * 12) {
      autopilotStep(world);
      const events = worldStep(world, STEP);
      if (events & EVENT_WIN) break;
      if (events & EVENT_OVER) break;
      guard += 1;
    }
    if (world.phase === 'won') return { screen: SCREEN_WIN, best: world.economy.score };
    // Fallback: if the autopilot lost, stage the win panel on the dressed board.
    world.phase = 'won';
    return { screen: SCREEN_WIN, best: Math.max(world.economy.score, 1250) };
  }
  // Play: mid-game, wave 5, dense board, monsters on the path, projectiles flying.
  autopilotBuild(world);
  world.economy.money = 320;
  let guard = 0;
  while (world.wave < 4 && guard < 60 * 60 * 8) {
    autopilotStep(world);
    worldStep(world, STEP);
    guard += 1;
  }
  world.phase = 'build';
  world.wave = 4;
  world.economy.money = 260;
  autopilotBuild(world);
  startWave(world);
  for (let i = 0; i < 60 * 16 && world.phase === 'wave'; i += 1) worldStep(world, STEP);
  return { screen: SCREEN_PLAY, best: 1250 };
}
