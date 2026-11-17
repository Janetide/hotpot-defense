// Boiling Defense — the winding path into the hotpot, and the build plots.
// The path is a polyline of waypoints; monsters walk it by distance travelled.
// Plots are fixed build spots beside the path, never on it and never in the pot.
import { BOARD, POT } from './config.js';

// Waypoints across the board (x, y). The last leg drops into the pot from below.
export const PATH_POINTS = [
  [-20, 110], [880, 110], [880, 240], [120, 240], [120, 360], [330, 360],
  [330, 620], [880, 620], [880, 520], [460, 520], [460, 464],
];
export const PATH_WIDTH = 34;

// Build plots: {x, y} spots where a tower may stand.
export const PLOTS = [
  { x: 200, y: 160 }, { x: 480, y: 170 }, { x: 600, y: 170 }, { x: 720, y: 170 },
  { x: 200, y: 300 }, { x: 480, y: 300 }, { x: 700, y: 300 }, { x: 560, y: 360 },
  { x: 200, y: 470 }, { x: 700, y: 470 }, { x: 200, y: 540 }, { x: 480, y: 570 },
  { x: 150, y: 680 }, { x: 420, y: 680 }, { x: 760, y: 670 },
];
export const PLOT_RADIUS = 24;

function segmentLengths(points) {
  const lengths = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    total += len;
  }
  return { lengths, total };
}

const PATH = segmentLengths(PATH_POINTS);
export const PATH_LENGTH = PATH.total;

/** Position (and heading angle) at a distance along the path. */
export function pointAt(distance) {
  let d = Math.max(0, Math.min(distance, PATH.total));
  for (let i = 0; i < PATH.lengths.length; i += 1) {
    const len = PATH.lengths[i];
    if (d <= len || i === PATH.lengths.length - 1) {
      const t = len === 0 ? 0 : d / len;
      const x = PATH_POINTS[i][0] + (PATH_POINTS[i + 1][0] - PATH_POINTS[i][0]) * t;
      const y = PATH_POINTS[i][1] + (PATH_POINTS[i + 1][1] - PATH_POINTS[i][1]) * t;
      const angle = Math.atan2(PATH_POINTS[i + 1][1] - PATH_POINTS[i][1], PATH_POINTS[i + 1][0] - PATH_POINTS[i][0]);
      return { x, y, angle };
    }
    d -= len;
  }
  const last = PATH_POINTS[PATH_POINTS.length - 1];
  return { x: last[0], y: last[1], angle: 0 };
}

/** Distance from a point to one path segment. */
export function distanceToPath(x, y) {
  let best = Infinity;
  for (let i = 0; i < PATH_POINTS.length - 1; i += 1) {
    const ax = PATH_POINTS[i][0]; const ay = PATH_POINTS[i][1];
    const bx = PATH_POINTS[i + 1][0]; const by = PATH_POINTS[i + 1][1];
    const dx = bx - ax; const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t; const py = ay + dy * t;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}

/** True when a plot is free to build on (inside the board, off the path, out of the pot). */
export function plotIsBuildable(plot) {
  if (plot.x < BOARD.x + 30 || plot.x > BOARD.x + BOARD.width - 30) return false;
  if (plot.y < BOARD.y + 30 || plot.y > BOARD.y + BOARD.height - 30) return false;
  if (Math.hypot(plot.x - POT.x, plot.y - POT.y) < POT.radius + 34) return false;
  return distanceToPath(plot.x, plot.y) >= PATH_WIDTH / 2 + PLOT_RADIUS + 4;
}

/** The plot whose circle contains (x, y), or -1. */
export function plotAt(x, y) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    if (Math.hypot(x - PLOTS[i].x, y - PLOTS[i].y) <= PLOT_RADIUS + 6) return i;
  }
  return -1;
}
