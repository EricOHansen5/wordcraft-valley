# Home Screen and Game Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The game opens on an under-the-sea Home where Asher's buddy suggests one thing and every game is a tile drawn from a `Games` registry; closing a game returns to Home; the valley keeps only its own tools plus 🏠.

**Architecture:** A `Games` registry (a new GAMES section after MODES) holds one entry per game; each game module calls `Games.add` where it lives. Home (`#ovHome`, a full-screen `.overlay` at z-index 39, Modes id `home`) draws its tiles from `Games.list()`. A hook in Modes brings Home back whenever the mode stack empties and he has not chosen the valley.

**Tech Stack:** Vanilla JS and CSS in `app/index.html`; OpenMoji art in `app/art/openmoji.js` (via `tools/art/openmoji-add.js`); Playwright suites in `tests/`.

**Spec:** `docs/superpowers/specs/2026-10-19-home-screen-design.md`

## Global Constraints

- Older iPad Safari: no `.at()`, `structuredClone`, `?.`, `??`, top-level await, CSS `:has()`.
- Offline-first; data files ASCII only (`\uXXXX` for anything else).
- Never break old saves: `state.home` gets a default in `def()`; nothing renamed.
- Every fixed spoken line gets a clip (`voiceLines()` → `npm run voice:extract` → `gen.py` / `index.py`).
- Tile and button targets at least 44 px; fits 1024x768 and 768x1024.
- The only animation on Home is the fish/turtle drift (CSS transform, 20-40 s per crossing); it pauses under `body.rest` and while anything is open over Home.
- Workflow: `npm test` all green, `npm run release`, a `docs/design.md` section, commit, push to `main`, check the NAS serves the new VERSION.

## Review Focus

1. **A pop-up that opens itself at boot** (a keeper waking, the recap, a note from home) appears over Home and, when closed, leaves Home showing, not the valley. Test in Task 3.
2. **Adventure from Home**: it plays inside the valley, so Home must step aside and come back when Adventure ends. Test in Task 3.
3. **Rapid taps on two tiles** must open one game, not two stacked. Test in Task 2.
4. **An old save with everything played** shows no wall of NEW badges. Test in Task 1.
5. **A brand-new save's tour** (its first step points at the crate tile) still works from Home. Test in Task 3.

---

## File Structure

| File | Change |
|---|---|
| `app/index.html` | GAMES section (`Games`, after MODES); HOME section (`Home`, the `#ovHome` markup and CSS); `Games.add` calls in each game's own section; the dock trimmed to 📐 🎨 📖 🏪 + 🏠; boot opens Home; Modes `home`; `state.home` default; TOUR gains one step |
| `app/art/openmoji.js` | New set `OMH`: `h_turtle` 1F422, `h_fish` 1F420, `h_blowfish` 1F421, `h_coral` 1FAB8, `h_shell` 1F41A, `h_star` 2B50 |
| `tests/home_e2e.js` | New suite |
| `tests/lib.js` | `launch()` goes to the valley after boot unless `{home:true}`; new `home(page)` and `valley(page)` |
| 13 suites (Task 4 list) | `await home(p)` before clicking a moved id |
| `tests/modes_e2e.js` | `home` in its mode list |

## Shared names

```js
Games.add({id, name, icon, order, show, badge, suggest, open, btn, inValley})
//   icon: an emoji or an ART id; btn: the old dock id the tile now carries ("crateBtn"); inValley: plays inside #app (Adventure)
Games.get(id) -> entry|undefined
Games.list() -> entries with show() true, sorted by order
Games.open(id)            // marks seen (state.home.seen[id]=today()), hides Home first if inValley, then entry.open()
Games.isNew(id) -> boolean // !state.home.seen[id]
Home.show(), Home.hide(), Home.isOn() -> boolean
Home.valley()             // he chose the valley: hide Home, remember it (memory only, not saved)
Home.render()             // redraw the bar, the buddy and the tiles
Home.suggestion() -> {say, game}   // game: an id or null
Home.voiceLines() -> string[]
// DOM: #ovHome.on, #hBuddy, #hSay, #hGo[data-game], .htiles .htile[data-game] (id = entry.btn when set), .hbadge, .hfish
```

---

### Task 1: The registry, the `home` mode and `state.home`

**Files:** Modify `app/index.html` (GAMES section after the MODES IIFE; `def()` gains `home:{seen:{}}`; MODES gains `home:{name:"Home",reading:false}`; `OV` gains `ovHome:"home"`). Create `tests/home_e2e.js`.

**Interfaces:** Produces `Games.add/get/list/open/isNew` (see Shared names) and `homeSeenFill(state)`.

- [ ] **Step 1: Write the failing tests** (`tests/home_e2e.js`, section "registry", launched with `{home:true}` once Task 3 exists; until then plain `launch`):
  - `Games.add({id:"t1",name:"Test",icon:"🧪",order:15,show:()=>true,open:()=>{window.__t1=1;}})` then `Games.list().map(g=>g.id)` contains `"t1"` between entries of order 10 and 20 (add two such test entries in the test)
  - an entry with `show:()=>false` is not in `Games.list()`
  - `Games.isNew("t1")===true`; after `Games.open("t1")`, `window.__t1===1` and `Games.isNew("t1")===false` and `state.home.seen.t1` is today
  - an old save seeded with `mine:{made:true}`, `crateCount:40`, `library:{"0":{}}`, `jobs:{xp:{shop:3}}`, `dungeon:{seen:true}`, `adv:{seenIntro:1}`, `factory:{lvl:2}` boots with `state.home.seen` holding crates, mine, books, jobs, dungeons, adventure, factory, quests and valley (**Review Focus 4**)
  - a new save (`seed:{}` with `base:null`) has `state.home.seen` empty except `valley` and `quests`
- [ ] **Step 2: Run** `node tests/home_e2e.js` — Expected: FAIL (`Games is not defined`).
- [ ] **Step 3: Implement** `Games` (a closure over an array; `add` replaces an entry with the same id; `list` filters with `show()` in try/catch, sorts by `order`). Implement `homeSeenFill(s)`, run once from the boot path after `withDefaults` when `s.home.filled` is not set: it marks as seen each game the save shows signs of having played (the list in Step 1) plus `valley` and `quests`, then sets `s.home.filled=true`.
- [ ] **Step 4: Run** `node tests/home_e2e.js` and `node tests/run-all.js modes` (add `"home"` to that suite's IDS list) — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Home: the Games registry, the home mode, state.home"`

### Task 2: The Home screen

**Files:** Modify `app/index.html` (HOME section after GAMES: `Home` and the `#ovHome` markup built in JS; CSS block "HOME"); `app/art/openmoji.js` (OMH via `node tools/art/openmoji-add.js OMH "Home: the sea" h_turtle=1F422 h_fish=1F420 h_blowfish=1F421 h_coral=1FAB8 h_shell=1F41A h_star=2B50`, wired into ART like OMD). Test: `tests/home_e2e.js` section "screen".

**Interfaces:** Consumes `Games.*`, `Goal.target()`, `Goal.ensure().words`, `ART.buddy(stageIdx(),mulberry(42),buddyHat())`, `state.gems`, `state.mine.coins`, the Grown-up gate opener used by `#parentBtn`. Produces `Home.show/hide/isOn/render/suggestion/voiceLines`.

- [ ] **Step 1: Write the failing tests** (section "screen"):
  - `Home.show()` → `#ovHome.on`, `Modes.top()==="home"`, `body.covered` (the valley sleeps)
  - the bar: `#hGoal` text `12/20` when `state.settings.goal=20` and `Goal.ensure().words=12`; `#hGems` and `#hCoins` show `state.gems` and `state.mine.coins`; `#hGear` opens the Grown-up gate
  - the tiles: `.htile[data-game]` in `Games.list()` order; each at least 44 px; a test entry with `badge:()=>"3"` shows `.hbadge` "3"; an unseen game shows "NEW"
  - the suggestion, in order: goal 20 and 12 words read → `#hSay` "Want to read 8 more words today?" and `#hGo[data-game="crates"]`; goal met and an unseen game `t2` → "Try the new Test 2!" and `#hGo[data-game="t2"]`; all seen and an entry with `suggest:()=>({say:"It's Party time!"})` → that line and its button; none → "What do you want to play?" and no `#hGo`
  - `#hGo` click calls that game's `open`
  - the suggestion is spoken once per `Home.show()` (a spy on `Sound.speak` sees it once after show, render and a second render)
  - **two tiles tapped within 300 ms open one game** (`Modes.stack()` has one game entry above `home`) (**Review Focus 3**)
  - the fish: `.hfish` elements have a running CSS animation; with `Rest._idleMs` short and `Rest.check()` they pause; with a game open over Home (`Games.open("t1")` whose open shows a test overlay via `Modes.open("other",el)`) they pause; closing it resumes them
  - 768x1024: every `.htile` and `#hGo` inside the viewport
- [ ] **Step 2: Run** `node tests/home_e2e.js` — Expected: FAIL in "screen".
- [ ] **Step 3: Implement.**
  - The scene is CSS (the water gradient, three light rays, the sand floor) plus OMH pictures placed absolutely: coral twice on the sand, the shell, the star, two fish, a blowfish, the turtle, and four bubble rings.
  - Each `.hfish` drifts with `@keyframes` on `transform` (translateX across the width, 24-38 s, linear, infinite, fish flipped to face their way).
  - Pause rule: `body.rest #ovHome .hfish, #ovHome.under .hfish{animation-play-state:paused}`. `#ovHome.under` is toggled in `Rest.cover()` (`top!=="home"`).
  - Tiles open through `Games.open(id)`; a tile tap is ignored while another `Games.open` is less than 600 ms old.
  - `Home.show()` speaks the suggestion once (`Sound.speak`), and not again until Home is hidden and shown again.
  - `Home.render()` runs on `Home.show()` and when Quests, Goal or gems change: the existing `renderHUD()` calls `Home.render()` when `Home.isOn()`.
- [ ] **Step 4: Run** `node tests/home_e2e.js` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Home: the under-the-sea screen, the buddy's suggestion and the tiles"`

### Task 3: Every game on Home, back to Home, the valley's tool bar

**Files:** Modify `app/index.html`: a `Games.add` in each game's section (table below); the dock markup loses the moved buttons and gains `<button class="toolbtn" id="homeBtn" title="Home" aria-label="Home">🏠</button>`; the boot path calls `Home.show()` after its renders; a Modes hook; TOUR. Test: `tests/home_e2e.js` sections "games" and "navigation".

**Interfaces:** Consumes Tasks 1-2. Produces the tile ids equal to the old dock ids (`btn`), and `Home.valley()`.

| id | name | icon | order | btn | show | open |
|---|---|---|---|---|---|---|
| crates | Read words | 📦 | 10 | crateBtn | always | the crate button's current handler body |
| valley | Valley | 🏡 | 20 | — | always | `Home.valley()` |
| dungeons | Dungeons | 🗝️ | 30 | dungeonBtn | always | `Dungeon.open()` |
| mine | Gem Mine | ⛏️ | 40 | mineBtn | always | `Mine.enter()` |
| adventure | Adventure | 🧭 | 50 | advBtn | always (inValley) | `Adv.enter()` |
| books | Books | 📚 | 60 | booksBtn | always | `Books.shelf()` |
| jobs | Jobs | 💼 | 70 | jobsBtn | `REG.length>0` | `Jobs.open()` |
| factory | Factory | 🏭 | 80 | — | a `factory` building in `state.grid` | `Factory.open()` |
| quests | Quests | 📜 | 90 | questBtn | always | `Quests.render();show("ovQuests")` |
| trick, lights, fireworks, party, feast, mail, eggs | their names | 🎃 ❄️ 🎆 🎂 🦃 💌 🥚 | 100-160 | their ids | each module's `live()` / `active()` | each module's open / go |

Badges move with the ids: the existing badge spans (`#advBadge`, `#bookBadge`, `#questBadge`, `#jobsBadge`, `#dungeonBadge`, the holiday badges) go inside the tiles, and each module's badge code keeps writing them. Each holiday's `suggest` returns `{say:"It's <name> time!"}` while live.

- [ ] **Step 1: Write the failing tests** (sections "games" and "navigation"):
  - a fresh boot shows Home (`#ovHome.on`) with every always-tile present and `#crateBtn` inside `#ovHome`
  - each tile opens its game (`crates` → `#ovCrates.on`; `mine` → `#mineMode.on`; `dungeons` → `#ovDungeons.on`; `books` → the shelf; `quests` → `#ovQuests.on`), and closing it (`Modes.shut` / the game's own exit) brings back `#ovHome.on`
  - **Adventure**: the tile hides Home, `Modes.top()==="adventure"`; `#advDone` brings Home back (**Review Focus 2**)
  - **the Valley tile**: Home hides, the dock shows only `#craftBtn #closetBtn #albumBtn #storeBtn #homeBtn` (plus the item slots); opening and closing the sticker book stays in the valley; `#homeBtn` shows Home
  - from the valley, the Factory opened from its building returns to the valley; a race started in Adventure returns to Adventure
  - **a pop-up at boot** (`showRecap()` called while Home is up) closes back to Home (**Review Focus 1**)
  - **a new save's tour**: step 1 points at `#crateBtn` on Home; after the first word the tour asks him to tap the Valley tile (`[data-game="valley"]`), then the plans step targets `#craftBtn` in the valley (**Review Focus 5**)
  - `tests/home_e2e.js` ends with no page errors
- [ ] **Step 2: Run** `node tests/home_e2e.js` — Expected: FAIL in "games".
- [ ] **Step 3: Implement.**
  - **The Modes hook.** In Modes' `changed()`, after the stack changes: when the stack is empty, `!Home._valley`, and boot is done, call `Home.show()` on a `setTimeout(0)`, so a mode closing and the next one opening in the same tick (crates → word) never flashes Home.
  - **`Games.open`** for an `inValley` entry hides Home first.
  - **TOUR** gains, after the "read" step, `{say:"Now tap the valley to visit your animals!",target:'[data-game="valley"]',until:"valley"}`, and `Home.valley()` calls `Coach.reach("valley")` (the tour advances on `Coach.reach(until)`, as `Coach.reach("crates")` does). A save whose `state.tour` is past step 2 skips it (only a brand-new save meets it).
  - Remove the moved buttons from the dock markup and their old `onclick` lines; each module's show/hide-its-button code now updates nothing (the tile's `show()` replaces it), so delete it with its button.
- [ ] **Step 4: Run** `node tests/home_e2e.js`, then `node tests/run-all.js modes power dungeon_e2e` — Expected: PASS (the other suites are Task 4).
- [ ] **Step 5: Commit** — `git commit -m "Home: every game a tile, back to Home, the valley keeps its own tools"`

### Task 4: The test suites

**Files:** `tests/lib.js`; these suites, each adding `await home(p)` (from `require("./lib")`) before its first click on a moved id after a launch, reload, reseed or `tidy()`: `adv_e2e`, `eggs_e2e`, `feast_e2e`, `fireworks_e2e`, `hunt_jobs_e2e`, `jobs_e2e`, `lights_e2e`, `looks_e2e`, `mail_e2e`, `mine_e2e`, `mine2_e2e`, `mine9_e2e`, `party_e2e`, `power_e2e`, `quest2_e2e`, `quest2b_e2e`, `reading_e2e`, `retain_e2e`, `saves_e2e`, `spell_e2e`, `store_e2e`, `talk_e2e`, `together_e2e`, `trick_e2e`, `v8_e2e`, `veh_e2e`, `dungeon_e2e`, `wip/hunt_mine_e2e`. (`regress.js` clicks through jsdom, which does not hit-test: unchanged.)

**Interfaces:** Produces `launch({home})`, `home(page)`, `valley(page)`.

- [ ] **Step 1:** In `tests/lib.js`: `home(page)` = `page.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);});Home.show();})` then waits for `#ovHome.on`; `valley(page)` = `page.evaluate(()=>Home.valley())` then waits for `!#ovHome.on`. `launch()` and `seed()` call `valley(page)` after boot unless `{home:true}`, so every existing suite still starts in the valley.
- [ ] **Step 2: Run** `npm test` — Expected: FAIL in the suites listed (each clicking a moved id that is now on a hidden Home).
- [ ] **Step 3:** Add `await home(p)` before those clicks, suite by suite. Change `hunt_*` suites' button lists where they enumerate the dock.
- [ ] **Step 4: Run** `npm test` — Expected: "all passed".
- [ ] **Step 5: Commit** — `git commit -m "Tests: suites open games from Home"`

### Task 5: Voice, docs and the release

**Files:** `app/index.html` (`Home.voiceLines()`), `tools/voice/extract.js` (collect it), `tools/voice/voice_texts.json`, `app/voice/`, `docs/design.md` ("v10.12 — Home"), `CLAUDE.md` (the BOOT note: the game opens on Home; new games are `Games.add` entries), `app/sw.js` (release).

- [ ] **Step 1:** Add a check to `tests/home_e2e.js`: every `Home.voiceLines()` line has a clip in `app/voice/index.json` (as `dungeon_data.js` does). Run it — Expected: FAIL.
- [ ] **Step 2:** `Home.voiceLines()` returns "What do you want to play?", "Want to read", "more words today?", "Let's read!", "Try the new <name>!" for every registered game, and each holiday's "It's <name> time!". Add it to `extract.js` like `Dungeon.voiceLines()`; make the clips (`npm run voice:extract`; `WCV_THREADS=4 python gen.py 0 1`; `python index.py`; `python check.py`).
- [ ] **Step 3: Run** `npm test` — Expected: "all passed".
- [ ] **Step 4:** Write the docs, then `npm run release`, commit ("Release <VERSION>: Home"), push to `main`, and check `curl -s http://192.168.1.91:8088/sw.js | head -3` shows the new VERSION (if the NAS still serves an old one, tell Eric its pull job is stuck).
