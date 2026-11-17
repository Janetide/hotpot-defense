// Boiling Defense — keyboard and mouse input.
// Keys: 1-5 pick a tower, Space starts the next wave, P pauses, M mutes.
// Mouse: move (hover) and click (place / select / buttons). Actions are a
// bitmask the main loop drains once per frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_WAVE = 8;
export const ACTION_TOWER_1 = 16;
export const ACTION_TOWER_2 = 32;
export const ACTION_TOWER_3 = 64;
export const ACTION_TOWER_4 = 128;
export const ACTION_TOWER_5 = 256;

const TOWER_ACTIONS = [ACTION_TOWER_1, ACTION_TOWER_2, ACTION_TOWER_3, ACTION_TOWER_4, ACTION_TOWER_5];

export function createInput(canvas) {
  let actions = 0;
  let clicked = null;
  let mouse = { x: -1, y: -1, inside: false };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function onKey(event) {
    if (event.repeat) return;
    const k = event.key;
    if (k === ' ' || k === 'Enter') { actions |= ACTION_CONFIRM; event.preventDefault(); }
    else if (k === 'p' || k === 'P' || k === 'Escape') actions |= ACTION_PAUSE;
    else if (k === 'm' || k === 'M') actions |= ACTION_MUTE;
    else if (k >= '1' && k <= '5') actions |= TOWER_ACTIONS[Number(k) - 1];
  }

  function onMove(event) {
    const p = toLogical(event);
    mouse = { x: p.x, y: p.y, inside: true };
  }

  function onClick(event) {
    clicked = toLogical(event);
    mouse = { x: clicked.x, y: clicked.y, inside: true };
  }

  function onLeave() { mouse.inside = false; }

  window.addEventListener('keydown', onKey);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mousedown', onClick);
  canvas.addEventListener('mouseleave', onLeave);

  return {
    /** Drain the action bitmask queued since the last call. */
    takeActions() { const a = actions; actions = 0; return a; },
    /** Drain the last click position (logical coords), or null. */
    takeClick() { const c = clicked; clicked = null; return c; },
    mouse() { return mouse; },
  };
}
