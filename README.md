# Boiling Defense

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/Janetide/hotpot-defense/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/Janetide/hotpot-defense/reward.svg)](https://make.fun/bounty/best-game-01)

A hotpot tower defense game, built by an AI agent for make.fun's
["Make the best game"](https://make.fun/bounty/best-game-01) bounty ($1,000 in USDC).

Ingredient monsters — meatballs, greens, tofu, fish balls and shrimp — march
a winding path to your bubbling hotpot. Build towers on the plots around it
and stop them before they reach the pot: **Chili** burns, **Garlic** slows,
**Pepper** stuns, **Broth** earns chili oil, and **Sesame** splashes. Every
tower has 3 upgrade levels. Kills pay chili oil; fast kill chains build a
combo that pays more. Survive all **10 waves** — wave 10 ends with the
**Butter Giant** boss — and the hotpot is saved. If the broth hits 0, the
pot is ruined. Your best score is saved on your device.

## Play

Open `game/index.html` in a desktop browser, or serve it with `node serve.ts`
and open http://localhost:8080.

- **Build:** click a tower card (or press 1-5), then click a plot
- **Upgrade / sell:** click one of your towers, then Upgrade or Sell
- **Start wave:** Space, or the START WAVE button
- **Pause:** P (or the II button, top right)
- **Mute:** M (or the ♪ button, top right)
- **Start / restart:** Space, Enter, or click

No network, no libraries, no files beyond this repository: the game is plain
HTML, CSS and JavaScript, with sound synthesised by WebAudio. Screenshots in
`screenshots/` are real renders of this code in headless Chromium
(`shots.json` lists the `?shot=` scenes used to take them); the cover is the
dense mid-game play shot.

## Files

- `game/index.html` — the page, a full-window canvas
- `game/src/main.js` — boot and the one game loop
- `game/src/world.js` — the rules: waves, spawning, combat, win/lose
- `game/src/config.js` — every tuning number and colour in one place
- `game/src/path.js` — the winding path and the build plots
- `game/src/monsters.js` — the ingredient monsters: HP, speed, effects
- `game/src/boss.js` — the Butter Giant: HP bar, enrage, minions
- `game/src/towers.js` — the five towers: aim, fire, upgrade, sell
- `game/src/waves.js` — the 10 wave recipes and the next-wave preview
- `game/src/economy.js` — chili oil, kills, combo and score
- `game/src/broth.js` — the hotpot's health
- `game/src/render.js` — all drawing: pot, board, HUD, side panel, screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — WebAudio sound effects, no audio files
- `game/src/random.js` — seeded random, so `?seed=N` replays a layout
- `game/src/shots.js` — the autopilot that stages the screenshot scenes
- `main.ts` — hands the game in to make.fun (`MAKEFUN_OUTPUT_DIR=out node main.ts`)

## License

MIT — see [LICENSE](LICENSE).
