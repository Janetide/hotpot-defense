// Boiling Defense — all drawing: board, hotpot, towers, monsters, HUD,
// side panel and the title / pause / win / game-over screens.
// The canvas is a fixed 1280x720 logical area, scaled to the window.
import {
  BOARD, FIELD, FONT, HUD, MAX_LEVEL, MONSTER_TYPES, PALETTE, PANEL, POT,
  TOTAL_WAVES, TOWER_ORDER, TOWER_TYPES,
} from './config.js';
import { PATH_POINTS, PATH_WIDTH, PLOTS, PLOT_RADIUS } from './path.js';
import { brothFraction } from './broth.js';
import { comboMultiplier } from './economy.js';
import { towerStats, towerUpgradeCost, towerSellValue } from './towers.js';
import { wavePreview } from './waves.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

// Side-panel geometry, shared with the click handling in main.js.
export const CARD = { x: PANEL.x + 10, width: PANEL.width - 20, height: 64, gap: 6, top: 92 };
export function towerCardRect(i) {
  return { x: CARD.x, y: CARD.top + i * (CARD.height + CARD.gap), width: CARD.width, height: CARD.height };
}
export const START_BUTTON = { x: PANEL.x + 10, y: 628, width: PANEL.width - 20, height: 48 };
export const UPGRADE_BUTTON = { x: PANEL.x + 10, y: 512, width: 165, height: 32 };
export const SELL_BUTTON = { x: PANEL.x + 185, y: 512, width: 165, height: 32 };
export const PAUSE_BUTTON = { x: 1188, y: 10, width: 36, height: 34 };
export const MUTE_BUTTON = { x: 1232, y: 10, width: 36, height: 34 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawPath(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = PATH_WIDTH + 8;
  ctx.beginPath();
  PATH_POINTS.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.stroke();
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = PATH_WIDTH;
  ctx.stroke();
  ctx.strokeStyle = PALETTE.pathLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPot(ctx, world) {
  const t = world.time;
  const shake = world.broth.shake > 0 ? Math.sin(t * 60) * 2 : 0;
  const cx = POT.x + shake;
  const cy = POT.y;
  // Pot body.
  ctx.fillStyle = '#3d0f08';
  ctx.beginPath(); ctx.arc(cx, cy + 8, POT.radius + 12, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(cx - 18, cy - 18, 8, cx, cy, POT.radius + 8);
  grad.addColorStop(0, PALETTE.potEdge);
  grad.addColorStop(1, '#5c130a');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, POT.radius + 8, 0, Math.PI * 2); ctx.fill();
  // Broth surface.
  const bgrad = ctx.createRadialGradient(cx - 16, cy - 20, 6, cx, cy, POT.radius - 4);
  bgrad.addColorStop(0, PALETTE.brothLight);
  bgrad.addColorStop(0.55, PALETTE.broth);
  bgrad.addColorStop(1, PALETTE.brothDark);
  ctx.fillStyle = bgrad;
  ctx.beginPath(); ctx.arc(cx, cy, POT.radius - 4, 0, Math.PI * 2); ctx.fill();
  // Bubbles.
  ctx.fillStyle = 'rgba(255,200,120,0.75)';
  for (let i = 0; i < 9; i += 1) {
    const a = i * 2.399 + t * 0.7;
    const r = 12 + ((i * 37) % 34);
    const bx = cx + Math.cos(a) * r;
    const by = cy + Math.sin(a) * r * 0.8;
    const s = 2.5 + ((Math.sin(t * 3 + i * 1.7) + 1) / 2) * 4;
    ctx.beginPath(); ctx.arc(bx, by, s, 0, Math.PI * 2); ctx.fill();
  }
  // Chili oil swirl.
  ctx.strokeStyle = 'rgba(255,210,62,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, POT.radius - 22, t * 0.4, t * 0.4 + Math.PI * 1.3); ctx.stroke();
  // Chopsticks.
  ctx.strokeStyle = '#c98a4b';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 18, cy - 58); ctx.lineTo(cx + 52, cy - 108); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 32, cy - 56); ctx.lineTo(cx + 68, cy - 100); ctx.stroke();
  text(ctx, 'HOTPOT', cx, cy + POT.radius + 26, 13, PALETTE.muted, 'center', 800);
}

function drawPlots(ctx, world) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    const plot = PLOTS[i];
    const tower = world.towers.find((t) => t.plotIndex === i);
    if (tower) continue;
    const hover = world.hoverPlot === i;
    const selected = world.selectedPlot === i;
    ctx.strokeStyle = hover || selected ? PALETTE.cardSel : 'rgba(245,230,211,0.35)';
    ctx.lineWidth = hover ? 3 : 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(plot.x, plot.y, PLOT_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(245,230,211,0.12)';
    ctx.beginPath(); ctx.arc(plot.x, plot.y, PLOT_RADIUS - 4, 0, Math.PI * 2); ctx.fill();
    text(ctx, '+', plot.x, plot.y + 1, 20, hover ? '#ff9f1c' : 'rgba(245,230,211,0.5)', 'center', 800);
  }
}

function drawTowerIcon(ctx, type, x, y, r) {
  if (type === 'chili') {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y + r * 0.6); ctx.lineTo(x - r * 0.8, y + r * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.4); ctx.lineTo(x + r * 0.4, y + r * 0.5); ctx.lineTo(x - r * 0.4, y + r * 0.5); ctx.closePath(); ctx.fill();
  } else if (type === 'garlic') {
    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath(); ctx.arc(x - r * 0.45, y + r * 0.2, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.45, y + r * 0.2, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - r * 0.25, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7ee081'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x, y - r * 1.15); ctx.stroke();
  } else if (type === 'pepper') {
    ctx.fillStyle = '#8e2f23';
    for (const [dx, dy] of [[-0.45, 0.2], [0.45, 0.2], [0, -0.4]]) {
      ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff6b5e';
    ctx.beginPath(); ctx.arc(x - r * 0.45, y + r * 0.1, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.45, y + r * 0.1, r * 0.16, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'broth') {
    ctx.fillStyle = '#7a4a12';
    ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.85, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r * 0.8, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e63b12';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.1, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.3, y + r * 0.2, r * 0.14, 0, Math.PI * 2); ctx.fill();
  } else {
    // Sesame: burst of seeds.
    ctx.fillStyle = '#f7d774';
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.28, r * 0.16, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTowers(ctx, world) {
  for (const tower of world.towers) {
    const stats = towerStats(tower.type, tower.level);
    const selected = world.selectedTower === tower;
    if (selected) {
      ctx.strokeStyle = 'rgba(255,159,28,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,159,28,0.06)';
      ctx.fill();
    }
    ctx.fillStyle = '#2a1608';
    ctx.beginPath(); ctx.arc(tower.x, tower.y, PLOT_RADIUS - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tower.flash > 0 ? '#ffffff' : tower.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(tower.x, tower.y, PLOT_RADIUS - 2, 0, Math.PI * 2); ctx.stroke();
    drawTowerIcon(ctx, tower.type, tower.x, tower.y, 13);
    // Level pips.
    for (let i = 0; i < MAX_LEVEL; i += 1) {
      ctx.fillStyle = i < tower.level ? '#ffd23e' : 'rgba(245,230,211,0.25)';
      ctx.beginPath(); ctx.arc(tower.x - 10 + i * 10, tower.y + PLOT_RADIUS + 7, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawMonster(ctx, m, time) {
  const bob = Math.sin(m.wobble) * 2;
  const x = m.x;
  const y = m.y + bob;
  if (m.isBoss) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 26, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(x, y - 30, x, y + 28);
    g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#d99a1f');
    ctx.fillStyle = g;
    roundRect(ctx, x - 28, y - 28, 56, 56, 12);
    ctx.fill();
    ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 3; ctx.stroke();
    // Melting top.
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(x - 14, y - 26, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, y - 27, 9, 0, Math.PI * 2); ctx.fill();
    // Angry eyes and mouth.
    ctx.strokeStyle = '#4a2c00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 16, y - 8); ctx.lineTo(x - 6, y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 16, y - 8); ctx.lineTo(x + 6, y - 4); ctx.stroke();
    ctx.fillStyle = '#4a2c00';
    ctx.beginPath(); ctx.arc(x - 11, y - 1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 11, y - 1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + 14, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else if (m.kind === 'meatball') {
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(x, y, m.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b3410';
    for (const [dx, dy] of [[-5, -3], [4, 2], [0, 6]]) {
      ctx.beginPath(); ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(x - 4, y - 5, 3, 0, Math.PI * 2); ctx.fill();
  } else if (m.kind === 'greens') {
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.ellipse(x, y, m.radius, m.radius * 0.62, m.angle * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - m.radius, y); ctx.lineTo(x + m.radius, y); ctx.stroke();
    ctx.fillStyle = '#81c784';
    ctx.beginPath(); ctx.ellipse(x - 3, y - 3, 5, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (m.kind === 'tofu') {
    ctx.fillStyle = m.color;
    roundRect(ctx, x - m.radius, y - m.radius, m.radius * 2, m.radius * 2, 5);
    ctx.fill();
    ctx.strokeStyle = '#cbb98a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#8a7a52';
    ctx.beginPath(); ctx.arc(x - 4, y - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y + 2, 1.8, 0, Math.PI * 2); ctx.fill();
  } else if (m.kind === 'fishball') {
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(x, y, m.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, m.radius * 0.55, 0.5, Math.PI * 1.4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(x - 4, y - 5, 2.5, 0, Math.PI * 2); ctx.fill();
  } else {
    // Shrimp: orange crescent.
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(x, y, m.radius, 0.3, Math.PI * 1.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff9a6b';
    ctx.beginPath(); ctx.arc(x + 3, y - 2, m.radius * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, m.radius * 0.7, 0.6, Math.PI * 1.2); ctx.stroke();
  }
  // Effects: stun stars, slow tint, burn flames.
  if (m.stunUntil > time) {
    text(ctx, '✦', x - 10, y - m.radius - 8, 12, '#ffe14d', 'center', 800);
    text(ctx, '✦', x + 10, y - m.radius - 4, 10, '#ffe14d', 'center', 800);
  }
  if (m.dotUntil > time && m.dotDps > 0) {
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath(); ctx.moveTo(x, y - m.radius - 2); ctx.lineTo(x + 4, y - m.radius - 10); ctx.lineTo(x - 4, y - m.radius - 10); ctx.closePath(); ctx.fill();
  }
  if (m.slowUntil > time) {
    ctx.strokeStyle = 'rgba(125,211,252,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, m.radius + 3, 0, Math.PI * 2); ctx.stroke();
  }
  // HP bar.
  if (m.hp < m.maxHp) {
    const w = m.isBoss ? 56 : 30;
    const frac = Math.max(0, m.hp / m.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - w / 2, y - m.radius - 10, w, 5);
    ctx.fillStyle = frac > 0.5 ? '#7ee081' : frac > 0.25 ? '#ffd23e' : '#ff5252';
    ctx.fillRect(x - w / 2, y - m.radius - 10, w * frac, 5);
  }
}

function drawProjectiles(ctx, world) {
  for (const p of world.projectiles) {
    if (p.type === 'sesame') {
      ctx.fillStyle = p.color;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.arc(p.x - i * 4, p.y + i * 2, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'pepper' ? 6 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const frac = Math.max(0, p.life / p.max);
    ctx.globalAlpha = p.steam ? frac * 0.6 : frac;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.steam ? 2 - frac : 1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / f.max));
    text(ctx, f.text, f.x, f.y, 15, f.color, 'center', 800);
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx, world, best, muted) {
  ctx.fillStyle = '#1d0d05';
  ctx.fillRect(0, 0, FIELD.width, HUD.height);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, HUD.height - 2, FIELD.width, 2);
  text(ctx, '🍲 BOILING DEFENSE', 12, 28, 19, PALETTE.hud, 'left', 800);
  text(ctx, `WAVE ${Math.max(1, world.wave)} / ${TOTAL_WAVES}`, 268, 28, 16, '#ff9f1c', 'left', 800);
  // Broth bar.
  const frac = brothFraction(world.broth);
  text(ctx, 'BROTH', 392, 20, 11, PALETTE.muted, 'left', 700);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 392, 28, 150, 14, 7); ctx.fill();
  ctx.fillStyle = frac > 0.6 ? '#e63b12' : frac > 0.3 ? '#ff9f1c' : '#ff5252';
  if (frac > 0) { roundRect(ctx, 392, 28, 150 * frac, 14, 7); ctx.fill(); }
  text(ctx, `${world.broth.hp}/${world.broth.max}`, 548, 28, 14, PALETTE.hud, 'left', 800);
  text(ctx, `🪙 ${world.economy.money}`, 620, 28, 16, PALETTE.money, 'left', 800);
  text(ctx, `KILLS ${world.economy.kills}`, 730, 28, 15, PALETTE.hud, 'left', 700);
  const combo = world.economy.combo;
  text(ctx, combo > 1 ? `COMBO x${combo} (+${Math.round((comboMultiplier(world.economy) - 1) * 100)}%)` : 'COMBO —', 830, 28, 14, combo > 1 ? '#ffd23e' : PALETTE.muted, 'left', 800);
  text(ctx, `SCORE ${world.economy.score}`, 1000, 28, 15, PALETTE.hud, 'left', 700);
  text(ctx, `BEST ${best}`, 1100, 28, 13, PALETTE.muted, 'left', 700);
  // Pause / mute buttons.
  for (const [rect, label] of [[PAUSE_BUTTON, 'II'], [MUTE_BUTTON, muted ? '✕' : '♪']]) {
    ctx.fillStyle = '#2e1a0c';
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 6); ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 1, 15, PALETTE.hud, 'center', 800);
  }
  // Boss HP bar.
  if (world.boss && world.boss.alive) {
    const boss = world.boss;
    const fracB = Math.max(0, boss.hp / boss.maxHp);
    const bw = 420;
    const bx = (BOARD.width - bw) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, bx - 10, 62, bw + 20, 30, 8); ctx.fill();
    text(ctx, '👹 BUTTER GIANT', bx + 8, 77, 13, '#ffd23e', 'left', 800);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, bx + 130, 70, bw - 140, 14, 7); ctx.fill();
    ctx.fillStyle = '#f2c14e';
    if (fracB > 0) { roundRect(ctx, bx + 130, 70, (bw - 140) * fracB, 14, 7); ctx.fill(); }
    text(ctx, `${Math.ceil(boss.hp)} / ${boss.maxHp}`, bx + bw - 6, 77, 12, PALETTE.hud, 'right', 700);
  }
}

function drawPanel(ctx, world) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(PANEL.x, PANEL.y, 2, PANEL.height);
  text(ctx, 'BUILD TOWERS  —  click a card, then a plot', PANEL.x + 12, 72, 13, PALETTE.muted, 'left', 700);
  // Tower cards.
  for (let i = 0; i < TOWER_ORDER.length; i += 1) {
    const type = TOWER_ORDER[i];
    const def = TOWER_TYPES[type];
    const rect = towerCardRect(i);
    const selected = world.selectedType === type;
    const afford = world.economy.money >= def.cost;
    ctx.fillStyle = selected ? '#3a220e' : PALETTE.card;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8); ctx.fill();
    ctx.strokeStyle = selected ? PALETTE.cardSel : PALETTE.cardEdge;
    ctx.lineWidth = selected ? 2.5 : 1.5; ctx.stroke();
    drawTowerIcon(ctx, type, rect.x + 28, rect.y + 26, 15);
    text(ctx, `${def.hotkey}  ${def.name}`, rect.x + 54, rect.y + 18, 15, PALETTE.hud, 'left', 800);
    text(ctx, def.desc, rect.x + 54, rect.y + 38, 12, PALETTE.muted, 'left', 400);
    const stats = towerStats(type, 1);
    const statText = type === 'broth' ? `+${stats.income} / wave` : `DMG ${stats.damage}  RNG ${stats.range}`;
    text(ctx, statText, rect.x + 54, rect.y + 54, 12, '#ffcf8a', 'left', 700);
    text(ctx, `🪙 ${def.cost}`, rect.x + rect.width - 12, rect.y + 18, 15, afford ? PALETTE.money : '#ff5252', 'right', 800);
  }
  // Selected tower box.
  const boxY = 450;
  ctx.fillStyle = PALETTE.card;
  roundRect(ctx, PANEL.x + 10, boxY, PANEL.width - 20, 96, 8); ctx.fill();
  ctx.strokeStyle = PALETTE.cardEdge; ctx.lineWidth = 1.5; ctx.stroke();
  const tower = world.selectedTower;
  if (tower) {
    const stats = towerStats(tower.type, tower.level);
    const upCost = towerUpgradeCost(tower);
    text(ctx, `${tower.name}  ${'★'.repeat(tower.level)}${'☆'.repeat(MAX_LEVEL - tower.level)}`, PANEL.x + 22, boxY + 16, 15, PALETTE.hud, 'left', 800);
    const line = tower.type === 'broth'
      ? `Income +${stats.income} / wave`
      : `DMG ${stats.damage}  RNG ${stats.range}  RATE ${stats.rate}/s`;
    text(ctx, line, PANEL.x + 22, boxY + 38, 13, '#ffcf8a', 'left', 700);
    text(ctx, `Kills by this tower: ${tower.kills}`, PANEL.x + 22, boxY + 56, 12, PALETTE.muted, 'left', 400);
    // Upgrade / sell buttons.
    ctx.fillStyle = upCost === null ? '#3a2a1a' : '#7a3d00';
    roundRect(ctx, UPGRADE_BUTTON.x, UPGRADE_BUTTON.y, UPGRADE_BUTTON.width, UPGRADE_BUTTON.height, 6); ctx.fill();
    text(ctx, upCost === null ? 'MAX LEVEL' : `UPGRADE 🪙 ${upCost}`, UPGRADE_BUTTON.x + UPGRADE_BUTTON.width / 2, UPGRADE_BUTTON.y + 17, 13, upCost === null ? PALETTE.muted : '#ffd23e', 'center', 800);
    ctx.fillStyle = '#4a1a12';
    roundRect(ctx, SELL_BUTTON.x, SELL_BUTTON.y, SELL_BUTTON.width, SELL_BUTTON.height, 6); ctx.fill();
    text(ctx, `SELL 🪙 ${towerSellValue(tower)}`, SELL_BUTTON.x + SELL_BUTTON.width / 2, SELL_BUTTON.y + 17, 13, '#ffb3a3', 'center', 800);
  } else {
    text(ctx, 'No tower selected', PANEL.x + 22, boxY + 18, 15, PALETTE.hud, 'left', 800);
    text(ctx, 'Click a tower on the board to upgrade', PANEL.x + 22, boxY + 40, 13, PALETTE.muted, 'left', 400);
    text(ctx, 'or sell it. Click a plot to build.', PANEL.x + 22, boxY + 58, 13, PALETTE.muted, 'left', 400);
  }
  // Next-wave preview (wrapped to two lines so it never clips).
  const next = Math.min(world.wave + 1, TOTAL_WAVES);
  text(ctx, world.wave >= TOTAL_WAVES ? 'FINAL WAVE — GOOD LUCK!' : `NEXT: WAVE ${next}`, PANEL.x + 12, 566, 13, '#ff9f1c', 'left', 800);
  if (world.wave < TOTAL_WAVES) {
    const rows = wavePreview(next);
    const parts = rows.map((r) => {
      const name = r.kind === 'boss' ? 'BOSS' : MONSTER_TYPES[r.kind].name;
      return `${name} x${r.count}`;
    });
    ctx.font = `700 13px ${FONT}`;
    const full = parts.join('   ');
    const maxW = PANEL.width - 24;
    if (ctx.measureText(full).width <= maxW) {
      text(ctx, full, PANEL.x + 12, 588, 13, PALETTE.hud, 'left', 700);
    } else {
      // Split the list across two lines at the halfway point.
      const mid = Math.ceil(parts.length / 2);
      text(ctx, parts.slice(0, mid).join('   '), PANEL.x + 12, 586, 13, PALETTE.hud, 'left', 700);
      text(ctx, parts.slice(mid).join('   '), PANEL.x + 12, 606, 13, PALETTE.hud, 'left', 700);
    }
  }
  // Start wave button.
  const canStart = world.phase === 'build' && world.wave < TOTAL_WAVES;
  ctx.fillStyle = canStart ? '#c22e12' : '#3a2a1a';
  roundRect(ctx, START_BUTTON.x, START_BUTTON.y, START_BUTTON.width, START_BUTTON.height, 10); ctx.fill();
  ctx.strokeStyle = canStart ? '#ff7a2a' : PALETTE.cardEdge; ctx.lineWidth = 2; ctx.stroke();
  text(ctx, world.phase === 'wave' ? `WAVE ${world.wave} IN PROGRESS…` : world.wave >= TOTAL_WAVES ? 'FINAL WAVE DONE' : `▶  START WAVE ${next}  (SPACE)`, START_BUTTON.x + START_BUTTON.width / 2, START_BUTTON.y + 25, 16, canStart ? '#ffffff' : PALETTE.muted, 'center', 800);
  text(ctx, '1-5 pick tower · P pause · M mute', PANEL.x + 12, 696, 12, PALETTE.muted, 'left', 400);
}

function drawBanner(ctx, world) {
  if (world.waveBanner <= 0) return;
  const alpha = Math.min(1, world.waveBanner);
  ctx.globalAlpha = alpha;
  text(ctx, world.waveBannerText, BOARD.width / 2, 130, 30, '#ffd23e', 'center', 900);
  ctx.globalAlpha = 1;
}

function overlay(ctx, title, lines, accent, scoreLine, footer) {
  ctx.fillStyle = 'rgba(10,4,2,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#241209';
  roundRect(ctx, 340, 110, 600, 500, 16); ctx.fill();
  ctx.strokeStyle = PALETTE.cardSel; ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, title, 640, 160, 34, accent, 'center', 900);
  let y = 215;
  for (const line of lines) {
    text(ctx, line, 640, y, 16, PALETTE.hud, 'center', 400);
    y += 30;
  }
  if (scoreLine) text(ctx, scoreLine, 640, y + 14, 20, '#ffd23e', 'center', 800);
  text(ctx, footer, 640, 560, 16, '#ff9f1c', 'center', 700);
}

/** Create a renderer bound to a canvas. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(world, screen, best, muted, dt) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    // Board backdrop.
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(BOARD.x, BOARD.y, BOARD.width, BOARD.height);
    ctx.strokeStyle = PALETTE.boardEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD.x + 1, BOARD.y + 1, BOARD.width - 2, BOARD.height - 2);
    drawPath(ctx);
    drawPot(ctx, world);
    drawPlots(ctx, world);
    drawTowers(ctx, world);
    const sorted = [...world.monsters].sort((a, b) => a.y - b.y);
    for (const m of sorted) drawMonster(ctx, m, world.time);
    drawProjectiles(ctx, world);
    drawParticles(ctx, world);
    drawFloaters(ctx, world);
    drawHUD(ctx, world, best, muted);
    drawPanel(ctx, world);
    drawBanner(ctx, world);
    if (screen === SCREEN_TITLE) {
      overlay(ctx, '🍲 BOILING DEFENSE', [
        'Ingredient monsters are marching to your hotpot!',
        'Build towers on the plots, stop them before they reach the pot.',
        'Chili burns · Garlic slows · Pepper stuns',
        'Broth earns coins · Sesame splashes',
        'Survive all 10 waves. The Butter Giant comes last.',
        'If the broth hits 0, the pot is ruined.',
        '',
        'Click a tower card (or press 1-5), then click a plot to build.',
        'Click a tower to upgrade or sell it. SPACE starts a wave.',
      ], '#ff9f1c', best > 0 ? `BEST SCORE: ${best}` : null, 'Press SPACE or click to start');
    } else if (screen === SCREEN_PAUSED) {
      overlay(ctx, 'PAUSED', ['Take a breath. The broth is still simmering.', 'Press P or SPACE to keep cooking.'], '#ffcf8a', null, 'Press P or SPACE to resume');
    } else if (screen === SCREEN_WIN) {
      overlay(ctx, '🏆 YOU WIN!', [
        'The hotpot is saved — every wave held back!',
        `Waves cleared: ${TOTAL_WAVES} / ${TOTAL_WAVES}`,
        `Monsters stopped: ${world.economy.kills}`,
        `Best combo: x${world.economy.bestCombo}`,
      ], '#7ee081', `SCORE ${world.economy.score}   ·   BEST ${best}`, 'Press SPACE or click to play again');
    } else if (screen === SCREEN_OVER) {
      overlay(ctx, '💥 BROTH SPILLED', [
        'The pot is ruined — too many monsters got through.',
        `You held until wave ${Math.max(1, world.wave)} of ${TOTAL_WAVES}.`,
        `Monsters stopped: ${world.economy.kills}`,
        `Best combo: x${world.economy.bestCombo}`,
      ], '#ff5252', `SCORE ${world.economy.score}   ·   BEST ${best}`, 'Press SPACE or click to try again');
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return { draw };
}
