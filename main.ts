// Boiling Defense — a make.fun best-game-01 entry (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library and
// no network request). This program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// The game itself: a hotpot tower defense. Ingredient monsters (meatballs,
// greens, tofu, fish balls, shrimp) march a winding path to the central
// hotpot; build five tower types on the plots around it — Chili (burn),
// Garlic (slow), Pepper (stun), Broth (income) and Sesame (splash) — each
// with 3 upgrade levels. Kills pay chili oil; spend it on towers and
// upgrades. Survive all 10 waves; wave 10 ends with the Butter Giant boss.
// If the broth hits 0, the pot is ruined. Keyboard (1-5, Space, P, M),
// mouse place/select/upgrade/sell, start, pause, win and game-over screens
// all offer a restart, and the best score is saved on the device.
// Screenshots live in screenshots/ (the first by name is the cover).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The game this entrypoint hands in, and its version: printed once the
// files are copied so a local run shows what was built.
const GAME_NAME = 'Boiling Defense';
const GAME_VERSION = '1.0.0';
const TOTAL_WAVES = 10;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

console.log(`${GAME_NAME} ${GAME_VERSION}: survive ${TOTAL_WAVES} waves; copied game/ and screenshots/ to ${out}`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
