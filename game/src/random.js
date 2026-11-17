// Boiling Defense — a tiny seeded random generator, so ?seed=N replays a layout.
export function createRandom(seed) {
  let s = (seed >>> 0) || 1;
  function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }
  return {
    next,
    range(min, max) { return min + next() * (max - min); },
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
  };
}
