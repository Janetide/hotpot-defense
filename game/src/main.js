// Boiling Defense — boot and the one game loop.
// Input is read every frame, the world advances in fixed 1/60 s steps, and
// the renderer paints what is there. Screens: title, play, paused, win, over.
//
// ?seed=N fixes the layout. ?shot=start|play|win|boss (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP, TOWER_ORDER } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, resetWorld, placeTower, sellSelected, startWave, upgradeSelected, worldIsOver, worldStep, EVENT_BOSS, EVENT_KILL, EVENT_LEAK, EVENT_OVER, EVENT_PLACE, EVENT_SELL, EVENT_UPGRADE, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_TOWER_1, ACTION_TOWER_2, ACTION_TOWER_3, ACTION_TOWER_4, ACTION_TOWER_5, createInput } from './input.js';
import { createRenderer, PAUSE_BUTTON, MUTE_BUTTON, SELL_BUTTON, START_BUTTON, UPGRADE_BUTTON, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, towerCardRect } from './render.js';
import { plotAt } from './path.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch {}
}

function inRect(p, r) {
  return p && p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, audio.isMuted(), STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = audio.isMuted();

  function announce(message) { status.textContent = message; }
  function startGame() {
    resetWorld(world);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.click();
    announce('Playing. Build towers, then press Space to start wave 1.');
  }
  function finish() {
    if (world.economy.score > best) { best = world.economy.score; saveBest(best); }
    screen = world.phase === 'won' ? SCREEN_WIN : SCREEN_OVER;
    announce(world.phase === 'won'
      ? `You win! Score ${world.economy.score}. Best ${best}.`
      : `Game over. Score ${world.economy.score}. Best ${best}.`);
  }
  function playEvents(events) {
    if (events & EVENT_KILL) audio.coin();
    if (events & EVENT_LEAK) audio.leak();
    if (events & EVENT_WAVE_CLEAR) audio.wave();
    if (events & EVENT_BOSS) audio.boss();
    if (events & EVENT_WIN) { audio.win(); finish(); }
    else if (events & EVENT_OVER) { audio.lose(); finish(); }
  }

  function handleClick(p) {
    if (!p) return;
    if (inRect(p, PAUSE_BUTTON)) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
      return;
    }
    if (inRect(p, MUTE_BUTTON)) { muted = audio.toggleMute(); announce(muted ? 'Muted.' : 'Sound on.'); return; }
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_OVER) { startGame(); return; }
    if (screen !== SCREEN_PLAY) return;
    // Tower cards.
    for (let i = 0; i < TOWER_ORDER.length; i += 1) {
      if (inRect(p, towerCardRect(i))) {
        world.selectedType = TOWER_ORDER[i];
        world.selectedTower = null;
        world.selectedPlot = -1;
        audio.click();
        return;
      }
    }
    // Start wave button.
    if (inRect(p, START_BUTTON)) {
      if (startWave(world)) { audio.wave(); announce(`Wave ${world.wave} started.`); }
      else audio.deny();
      return;
    }
    // Selected-tower buttons.
    if (world.selectedTower) {
      if (inRect(p, UPGRADE_BUTTON)) {
        const events = upgradeSelected(world);
        if (events & EVENT_UPGRADE) audio.upgrade(); else audio.deny();
        return;
      }
      if (inRect(p, SELL_BUTTON)) {
        const events = sellSelected(world);
        if (events & EVENT_SELL) audio.sell(); else audio.deny();
        return;
      }
    }
    // Board: a tower first, else a plot.
    const plotIndex = plotAt(p.x, p.y);
    if (plotIndex >= 0) {
      const tower = world.towers.find((t) => t.plotIndex === plotIndex);
      if (tower) {
        world.selectedTower = tower;
        world.selectedPlot = plotIndex;
        audio.click();
      } else {
        const events = placeTower(world, plotIndex, world.selectedType);
        if (events & EVENT_PLACE) audio.place();
        else audio.deny();
      }
    } else {
      world.selectedTower = null;
      world.selectedPlot = -1;
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) { muted = audio.toggleMute(); announce(muted ? 'Muted.' : 'Sound on.'); }
    if (actions & ACTION_TOWER_1) world.selectedType = TOWER_ORDER[0];
    if (actions & ACTION_TOWER_2) world.selectedType = TOWER_ORDER[1];
    if (actions & ACTION_TOWER_3) world.selectedType = TOWER_ORDER[2];
    if (actions & ACTION_TOWER_4) world.selectedType = TOWER_ORDER[3];
    if (actions & ACTION_TOWER_5) world.selectedType = TOWER_ORDER[4];
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
      else if (screen === SCREEN_PLAY && world.phase === 'build') {
        if (startWave(world)) audio.wave();
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    }
  }

  function step() {
    const events = worldStep(world, STEP);
    playEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    accumulator += dt;
    handleActions();
    handleClick(input.takeClick());
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
        if (worldIsOver(world)) break;
      }
    } else {
      accumulator = 0;
      // Keep the pot bubbling behind the panels.
      world.time += dt;
    }
    const mouse = input.mouse();
    world.hoverPlot = mouse.inside ? plotAt(mouse.x, mouse.y) : -1;
    renderer.draw(world, screen, best, muted, dt);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  // Debug/testing handle: lets automated play-tests read the live state.
  window.__boilingDefense = { world, get screen() { return screen; }, get best() { return best; } };
  announce('Boiling Defense. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
