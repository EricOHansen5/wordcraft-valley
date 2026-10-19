# Word Dungeons, release 1 (engine + Forest Temple) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the dungeon engine with its first dungeon, the Forest Temple: the dungeon map, grid rooms and puzzles, the boomerang, Pokémon-style reading battles with a team of three and three types, hearts with a kind restart, King Stump, and befriending the Forest's four monsters into a new Dungeon friends page and the valley.

**Architecture:** Plain DOM, like the rest of the game. A room is a 13×9 grid of absolutely placed tiles in a full-screen `.overlay` element; Ash and monsters glide with CSS transitions, so nothing redraws while nothing moves. Battles are a sheet over the dungeon that asks one `Read.*` question per turn. All authored content (rooms, monsters, boss, signs, the type table) is data in a new `app/content/dungeons.js`; the pictures are a new OpenMoji set `OMD` in `app/art/openmoji.js`. The code is a new DUNGEONS section in `app/index.html` with three modules: `Dungeon`, `Battle`, `Friends`.

**Tech Stack:** Vanilla JS in the single file `app/index.html` (classic scripts, no build), jsdom suites and Playwright suites under `tests/`, Kokoro voice pipeline under `tools/voice/`.

**Spec:** `docs/superpowers/specs/2026-10-18-word-dungeons-design.md` (read it first; this plan implements its release 1 and argues from it).

## Global Constraints

- Older iPad Safari: no `.at()`, no `structuredClone`, no top-level await, no CSS `:has()`. Touch and keyboard (WASD/arrows, space) both work.
- Offline-first: no network at run time except `/api/*` and `voice/`. The OpenMoji SVGs are fetched once while building and committed as data.
- Data files are classic scripts that set one property, plain data, ASCII only (anything else as `\uXXXX`): `"use strict";window.WCV=window.WCV||{};WCV.dungeons={...};`. A new data file goes in `DATA_SETS`, a `<script src>` before the game script, and `SHELL` in `app/sw.js` (`tests/version_check.js` checks).
- Never break old saves: `state.dungeon` gets defaults; nothing existing is renamed.
- A wrong answer never takes away anything he owns; feedback is always kind ("Maybe next time!", "Ash is tired! Back to the entrance.").
- Every fixed sentence passes `Decode.check(text, level)` at its dungeon's level (Forest Temple: level 1; tricky words allowed as in books); every fixed spoken line gets a voice clip.
- Answer hosts keep `host.dataset.ans` / `dataset.tiles` (the tests answer through them).
- Numbers from the spec: hearts counted in halves, start 3 hearts (6 halves), heart container +1 up to 6; pot/bush heart drop 1 in 6; Forest monsters 3 hits, boss 8 hits; type win = 2 hits; at most 1 heart (2 halves) lost per question; 2 💎 per battle, 10 💎 per boss, chests 3–5 💎; experience stars at 3, 6, 10, 15, 21; befriend always the first win over a kind, then 1 in 3; monster step about once a second; Ash glide about 160 ms; boomerang range 4 tiles.
- Workflow per task: `node tests/run-all.js <suite>` green; at the end `npm test` all green, `npm run release`, a `docs/design.md` section, commit, push to `main`, then `curl -s http://192.168.1.91:8088/sw.js | head -3` shows the new VERSION.
- Test runs use at most 8 of the PC's 12 cores (run suites one at a time; no parallel Playwright).

## Review Focus

1. **Holding a key or tapping fast.** Key auto-repeat and quick taps queue moves mid-glide; Ash must never pass through a wall, skip a door, or start two battles at once. Test in Task 4 ("ten fast presses toward a monster start exactly one battle").
2. **Closing the iPad mid-battle.** The run is saved; a reload must resume at the room's door with the saved hearts, the monster still there once, and no battle sheet left open. Test in Task 6.
3. **A small or empty collection.** A new save has no animals. The team holds whatever he has; with none, his buddy fights as 🌿 under its own name. Test in Task 6.
4. **Double taps on a battle answer.** A double tap must not land two hits or cost two half-hearts. Test in Task 6.
5. **Portrait iPad (768×1024).** The room, the team bar and the buttons must fit with every target at least 44 px. Test in Task 4.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/content/dungeons.js` (create) | `WCV.dungeons`: `types` (animal → type), `monsters`, `bosses`, `list` (dungeons with rooms), `lines` (fixed UI lines). Forest Temple only in this release. |
| `app/art/openmoji.js` (modify) | New set `OMD`: monster, boss, tile and item pictures, keyed by the art ids `dungeons.js` names. |
| `tools/art/openmoji-add.js` (create) | Build-time helper: fetches OpenMoji SVGs by codepoint and writes them into a set in `app/art/openmoji.js`. |
| `app/index.html` (modify) | The DUNGEONS section (after RACES): `Dungeon`, `Battle`, `Friends`; `OMD` → `ART`; `DATA_SETS`; `<script src>`; Modes `dungeon`/`battle`; tool bar 🗝️ button; `state.dungeon` defaults; `CRIT()` and `Dex` learn monster friends; quests and badges. |
| `app/sw.js` (modify) | `SHELL` gains `content/dungeons.js`. |
| `tools/voice/extract.js` (modify) | Collects `Dungeon.voiceLines()`. |
| `tools/progress.js` (modify) | Prints dungeons cleared, friends, the team. |
| `tests/dungeon_data.js` (create) | Data shape, door pairing, solvability, decode level, art present. |
| `tests/dungeon_e2e.js` (create) | Map, rooms, movement, puzzles, boomerang, run save/resume. |
| `tests/battle_e2e.js` (create) | Team, types, rounds, hearts, restart, boss, badge. |
| `tests/friends_e2e.js` (create) | Befriending, Dungeon friends page, the valley, exclusions. |

## Shared names (every task uses these)

```js
// types
typeOf(id) -> "fire"|"water"|"leaf"     // WCV.dungeons.types[id] || monsters[kind].type for "m_<kind>" || "leaf"
beats(a,b) -> boolean                    // fire>leaf, leaf>water, water>fire
// state
state.dungeon = {team:[], maxHearts:3, items:{boomerang:false,hookshot:false,bombs:false}, cleared:{}, friends:{}, xp:{},
                 run:null, stats:{battles:0,wins:0,runs:0,restarts:0}}
// run: {d, room, pos:[c,r], halves, keys, bossKey, map, opened:[], taken:[], beaten:[]}
//   opened: ids like "f3:7,0" (doors/chests/blocks-solved), taken: pickups, beaten: monster uids "f1:0"
dungeonState() -> state.dungeon          // creates/fills defaults, idempotent
// modules
Dungeon.open()            // the dungeon map (mode "dungeon")
Dungeon.enter(id)         // team picker, then the run (resumes state.dungeon.run if it is for id)
Dungeon.exit()            // leave to the valley; the run stays saved
Dungeon.step(dx,dy)       // queue one move; returns false if blocked
Dungeon.act()             // ⚔️ on the faced tile
Dungeon.useItem()         // the dungeon's item (boomerang in r1)
Dungeon._run(), Dungeon._room(), Dungeon._tile(c,r)   // test hooks
Dungeon.voiceLines() -> string[]
Battle.start(foe,{boss,free}) -> Promise<"won"|"lost"|"fled">   // foe: {kind, uid, hp} or a boss id
Battle._B()               // test hook: {foe, hp, team, active, halvesLostThisQ, round}
Friends.offer(kind) -> Promise<boolean>   // the befriend sheet; true = friend made
Friends.has(kind) -> boolean
```

---

### Task 1: Forest Temple data, types, and the data checker

**Files:**
- Create: `app/content/dungeons.js`
- Create: `tests/dungeon_data.js`
- Modify: `app/index.html` (`DATA_SETS` line 2211; the `<script src>` list before the game script; `const DUNGEONS=WCV.dungeons;` next to the other data constants)
- Modify: `app/sw.js` (`SHELL`)

**Interfaces:**
- Produces: `WCV.dungeons` with
  - `types`: the spec's table, verbatim (fire: fox wolf tiger lion trex dragon boar rhino scorpion hawk eagle; water: fish frog duck croc shark crab lobster seal octopus dolphin whale penguin; leaf: dog cat hen pig bug bat bear rabbit raccoon mammoth monkey parrot sloth snake elephant gorilla lizard sauropod)
  - `monsters`: `blob {name:"Blob",type:"leaf",art:"m_blob",hp:3,move:"Bounce"}`, `spot {name:"Spot",type:"leaf",art:"m_spot",hp:3,move:"Spore"}`, `gob {name:"Gob",type:"fire",art:"m_gob",hp:3,move:"Bonk"}`, `wisp {name:"Wisp",type:"water",art:"m_wisp",hp:3,move:"Chill"}`; each also has `friend` (the befriend sentence, e.g. "Blob can be my pal.") and `look` (two look-alike names for the name question, e.g. `["Blab","Bob"]`)
  - `bosses.stump {name:"King Stump",type:"leaf",weak:"fire",art:"boss_stump",hp:8,taunt,friendly}`
  - `list:[{id:"forest",name:"Forest Temple",level:1,item:"boomerang",boss:"stump",start:"f0",bossRoom:"fB",rooms:[...]}]`
  - `lines`: every fixed UI line the dungeon speaks (the spec's: "Ash is tired! Back to the entrance.", "Maybe next time!", "Water is strong against fire!", "Fire is strong against leaf!", "Leaf is strong against water!", "You found the boomerang!", "You got a key!", "You got the boss key!", "A heart!", "The fairy fills your hearts!")
- Room format: as in the spec ("Room format"), 9 strings × 13 chars, `at:[x,y]` grid position, optional `chests`, `signs`, `pots`, `words`, `monsters`, `shutUntil` (`"plate"`|`"monsters"`), `switch` (barrier colour).
- **The Forest Temple's eight rooms** (the implementer draws the grids; the checker proves them):
  - `f0` entrance (`@`, a sign, two bushes, door north)
  - `f1` Blob and Spot, three pots (one heart)
  - `f2` a block and a plate that open the shut door; a chest with a small key
  - `f3` a locked door (the key), a word door, and the sign "The key is in the red pot." over a red pot holding a second small key
  - `f4` the item room: Gob, a chest with the boomerang
  - `f5` a crystal switch across a pit (only the boomerang reaches it) lowers a barrier; Wisp; a chest with the Boss Key
  - `f6` the fairy room (`F`) and a chest with the dungeon map
  - `fB` the boss room behind `B`
- Signs are decodable at level 1 (tricky words allowed).

- [ ] **Step 1: Write the failing checker `tests/dungeon_data.js`** (node; loads `app/content/dungeons.js` with `global.window=global`, and the page through `require("./page").html()` in jsdom like `tests/regress.js` for `Decode.check` and `ART`). It prints `PASS`/`FAIL` lines like the other suites and asserts:
  - every room has 9 rows of 13 chars, only legend characters, a wall ring except at doors (`D L B W` on the middle of an edge)
  - doors pair up: a door on the north edge of `at:[x,y]` has a door on the south edge of `at:[x,y-1]`, and so on
  - `solve(d)` finds the boss room from `start` (search over room, position, keys held, boss key, items, opened locks; a block puzzle is solved inside its room by a small search; locked doors spend keys; `^` and `~` block walking; the boomerang reaches a switch within 4 tiles in a straight line over pits)
  - `solve(d, {without:"boomerang"})` cannot reach the Boss Key (the item matters)
  - every key is reachable before the lock it opens (the search never needs a key it has not picked up)
  - every sign, `friend` sentence, monster name, boss taunt and friendly line passes `Decode.check(text, d.level).every(x=>x.ok)` (tricky words count as ok, as in books)
  - every `art` id (monsters, bosses, the tile pictures `t_pot t_bush t_block t_plate t_chest t_key t_bosskey t_crystal t_fairy t_sign t_heart i_boomerang`) has an `ART[id]` in the page
  - every animal in `CRITTERS` has a type in `types`

- [ ] **Step 2: Run it and see it fail**

Run: `node tests/dungeon_data.js`
Expected: FAIL (`app/content/dungeons.js` does not exist).

- [ ] **Step 3: Write `app/content/dungeons.js`** with the data above, and wire it: `DATA_SETS` gains `"dungeons"`, the page loads `content/dungeons.js` before the game script, `SHELL` gains `"content/dungeons.js"`, `const DUNGEONS=WCV.dungeons;` in CONTENT. Add `typeOf(id)` and `beats(a,b)` in CONTENT next to it.

- [ ] **Step 4: Run the checker and the version check**

Run: `node tests/dungeon_data.js` then `node tests/version_check.js`
Expected: every line PASS except the `ART[id]` check (art comes in Task 2); `version_check` PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: the Forest Temple's data, the type table, and the data checker"`

### Task 2: The OpenMoji pictures

**Files:**
- Create: `tools/art/openmoji-add.js`
- Modify: `app/art/openmoji.js` (a new `OMD:{...}` set)
- Modify: `app/index.html` (after the `OMB` line: `const OMD=WCV.openmoji.OMD;` and the same `Object.keys(...).forEach(k=>{ART[k]=...})`)

**Interfaces:**
- Consumes: the art ids from Task 1.
- Produces: `ART.m_blob`, `ART.m_spot`, `ART.m_gob`, `ART.m_wisp`, `ART.boss_stump`, `ART.t_*`, `ART.i_boomerang` (each `()=>"<svg ...>"`, 100×100 viewBox like the other sets).
- Codepoints (OpenMoji colour SVGs, `openmoji/color/svg/<HEX>.svg` from the openmoji GitHub repository): m_blob 1F9A0 🦠, m_spot 1F344 🍄, m_gob 1F47A 👺, m_wisp 1F47B 👻, boss_stump 1F333 🌳, t_pot 1F3FA 🏺, t_bush 1FAB4 🪴, t_block 1F9F1 🧱, t_plate 1F518 🔘, t_chest 1F9F0 🧰, t_key 1F511 🔑, t_bosskey 1F5DD 🗝️, t_crystal 1F48E 💎, t_fairy 1F9DA 🧚, t_sign 1FAA7 🪧, t_heart 2764 ❤️, i_boomerang 1FA83 🪃, t_door 1F6AA 🚪, t_lock 1F512 🔒.

- [ ] **Step 1: Run the data checker and see the art lines fail**

Run: `node tests/dungeon_data.js`
Expected: FAIL on "every art id has an ART[id]".

- [ ] **Step 2: Write `tools/art/openmoji-add.js <SET> <id>=<HEX> ...`.** It fetches each SVG, keeps the inside of its root `<svg>`, wraps it the way the existing entries are (`<g transform='scale(1.38889)'>...</g>`, since OpenMoji's viewBox is 72), escapes non-ASCII as `\uXXXX`, and writes or replaces the set in `app/art/openmoji.js` without touching the other sets. Run it for the list above.

- [ ] **Step 3: Wire `OMD` into `ART` in `app/index.html`.** Add a comment line for the set in the file header ("OMD: Word Dungeons monsters, tiles and items").

- [ ] **Step 4: Run the checks**

Run: `node tests/dungeon_data.js` then `node tests/version_check.js` then `node tests/run-all.js regress`
Expected: all PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: OpenMoji pictures for the Forest Temple (OMD)"`

### Task 3: Save, modes, the 🗝️ button and the dungeon map

**Files:**
- Modify: `app/index.html` (STATE defaults and the load-time fill for old saves; Modes `MODES` gains `dungeon:{name:"Dungeons",reading:false}` and `battle:{name:"Dungeon battles",reading:true}`; the tool bar gains `<button class="toolbtn" id="dungeonBtn" title="Dungeons" aria-label="Dungeons">🗝️<span class="badge" id="dungeonBadge"></span></button>` after `#jobsBtn`; the new DUNGEONS section with `Dungeon.open()`; an `Adv.provide` spot for each open dungeon's cave door: `{c,r,html:drawThing("t_door"),cls:"dcave",label:"🗝️ "+d.name,act:()=>Dungeon.open()}`)
- Create: `tests/dungeon_e2e.js` (Playwright, `launch()` from `tests/lib.js`, 1024×768 with touch)

**Interfaces:**
- Consumes: `DUNGEONS`, `typeOf`, `ART` ids.
- Produces: `dungeonState()`, `Dungeon.open()`, the map's DOM: `#ovDungeons.on` with one `.dmap[data-d="<id>"]` per dungeon, `.open`/`.locked`/`.cleared` classes, `[data-go]` buttons; a locked one shows "Reading level N".
- Unlock rule: a dungeon is open when every dungeon before it in `list` is in `state.dungeon.cleared` and `currentTier() >= d.level`.
- NEW badge: `#dungeonBadge` shows "NEW" until `state.dungeon.seen` is set by the first `Dungeon.open()`.

- [ ] **Step 1: Write the failing tests** in `tests/dungeon_e2e.js` (section "1. the map"):
  - an old save without `dungeon` boots, and `state.dungeon` equals the defaults (`maxHearts===3`, `team.length===0`, `run===null`)
  - `#dungeonBtn` shows NEW; tapping it opens `#ovDungeons.on`, `Modes.top()==="dungeon"`, and NEW is gone
  - the Forest Temple is `.open` at reading level 1
  - with `currentTier` 0 forced (`state.settings.tierOverride=0` if supported, else seed no levels), it is `.locked` and says "Reading level 1"
  - in Adventure (`#advBtn`), a `#tiles .spot.dcave` is drawn for the Forest Temple
  - `body.covered` is on while the map is open (the valley sleeps)

- [ ] **Step 2: Run them and see them fail**

Run: `node tests/run-all.js dungeon_e2e`
Expected: FAIL (`#dungeonBtn` missing).

- [ ] **Step 3: Implement** `dungeonState()`, the Modes entries, the button, `Dungeon.open()` and the Adventure spot.

- [ ] **Step 4: Run the tests**

Run: `node tests/run-all.js dungeon_e2e` then `node tests/run-all.js modes`
Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: the save, the modes, the key button and the dungeon map"`

### Task 4: Rooms, movement and the room puzzles

**Files:**
- Modify: `app/index.html` (`Dungeon` grows the run: `enter`, room rendering, movement, doors, `act()`, pots, bushes, signs, chests, keys, locked and boss doors, blocks and plates, shut doors, crystal switches and barriers, word doors, the fairy, the mini-map, hearts HUD, exit; CSS for `#ovDungeon`)
- Modify: `tests/dungeon_e2e.js` (section "2. rooms")

**Interfaces:**
- Consumes: Task 3's map; `Read.pic(host,done,w)` for word doors (in a sheet with mode `battle`, so it counts as reading).
- Produces: `#ovDungeon.on` (the run), `.room` with tiles `.dt[data-c][data-r][data-t]` (`data-t` is the legend character, updated as things change), `#dAsh[data-c][data-r][data-face]`, `#dHearts[data-halves]`, `#dKeys[data-n]`, `#dMini`, the buttons `#dAct` (⚔️), `#dItem`, `#dExit`; `Dungeon.step/act/useItem/_run/_room/_tile`; the run saved in `state.dungeon.run` on every room change and pickup.
- Movement: one tile per step, a 160 ms glide; steps arriving mid-glide queue (at most 2 queued; more are dropped); walls, closed doors, blocks that can't move, pits, water and barriers stop it; a tap on a floor tile walks the shortest path (breadth-first over walkable tiles), stopping if blocked; joystick from Adventure's control (same look), keyboard arrows/WASD, space = `act()`, X = `useItem()`.
- Through a door: slide to the neighbouring room (`at` ±1), Ash appears just inside the matching door. Blocks reset when Ash leaves a room unless their plate puzzle is solved (`opened` keeps "f2:plate").
- Pots and bushes: `act()` breaks them; 1 in 6 drops a heart (+2 halves up to `maxHearts*2`), else sometimes 1 💎; a pot named in `pots` gives its item instead.
- Fairy: walking onto `F` refills hearts once per run.
- Chests: `chests["c,r"]` names what is inside (`key`, `bosskey`, `map`, `boomerang`); a chest with nothing named gives 3–5 💎. The `map` chest sets `run.map=true`, and `#dMini` then shows every room of the dungeon and a skull on the boss room (before that it shows only visited rooms).
- Word door: `act()` facing `W` opens a sheet with `Read.pic` at his level; right = the door opens and stays open for the run; wrong = no cost (outside battle there's no heart cost).

- [ ] **Step 1: Write the failing tests** (section "2. rooms"):
  - `Dungeon.enter("forest")` (team picker skipped when `state.dungeon.team` is set) shows `f0` with Ash on `@`; `#dHearts[data-halves="6"]`
  - keyboard: ArrowUp ×n walks to the north door and into `f1` (`Dungeon._run().room==="f1"`)
  - a wall stops a step (`Dungeon.step(...)` returns false; Ash's `data-c/r` unchanged)
  - **ten fast ArrowRight presses toward a monster start exactly one battle** (`Modes.stack().filter(m=>m==="battle").length===1`) — monster stepping frozen with a test hook for this check
  - tapping a floor tile walks there by a path around a wall
  - pots: with `Math.random` pinned to 0, `act()` on a pot gives a heart (halves +2, capped)
  - block and plate in `f2`: pushing the block onto the plate opens the shut door; leaving and coming back keeps it open
  - the key from the `f2` chest opens the locked door in `f3`; `#dKeys[data-n]` goes 1 → 0
  - the sign in `f3` shows and speaks its text; the red pot gives a key
  - the word door opens after a right answer through `host.dataset.ans`; a wrong tap costs no hearts
  - the fairy in `f6` refills hearts
  - before the `f6` map chest `#dMini` shows only visited rooms; after it, all eight and the skull
  - **portrait 768×1024**: the room, `#dAct`, `#dItem` and `#dExit` are inside the viewport and every button is at least 44 px
  - a reload in the middle of a run resumes in the same room with the same hearts and keys (`state.dungeon.run`)

- [ ] **Step 2: Run them and see them fail**

Run: `node tests/run-all.js dungeon_e2e`
Expected: FAIL in section 2.

- [ ] **Step 3: Implement the room engine as described in Interfaces.** Keep the room DOM static between moves: Ash and monsters are moved with `transform: translate()` and a CSS transition; no `requestAnimationFrame` loop.

- [ ] **Step 4: Run the tests**

Run: `node tests/run-all.js dungeon_e2e`
Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: rooms, moving, pots, keys, blocks, word doors, signs and the fairy"`

### Task 5: The boomerang and crystal switches

**Files:**
- Modify: `app/index.html` (`Dungeon.useItem()`, the boomerang flight, switch hits, picking up across gaps, stunning)
- Modify: `tests/dungeon_e2e.js` (section "3. the boomerang")

**Interfaces:**
- Consumes: Task 4's tiles and run.
- Produces: `state.dungeon.items.boomerang=true` from the `f4` chest ("You found the boomerang!"); `useItem()` throws it up to 4 tiles straight ahead over floor, pits and water (not walls); on the way it hits the first `S` (toggles barriers `R`/`U`), brings back a `t_key`/heart pickup, or stuns the first monster (`monster.stunned=true` until the next battle with it, which then starts with one free hit: `Battle.start(foe,{free:1})`).
- `#dItem` is hidden until the item is owned.

- [ ] **Step 1: Write the failing tests:** the `f4` chest gives the boomerang and shows `#dItem`; in `f5`, `useItem()` facing the switch across the pit lowers the barrier (`data-t` of a barrier tile becomes `.`); without the boomerang the Boss Key chest can't be reached (walking stops at the barrier); a stunned monster's battle starts with its hp one lower; a boomerang throw toward a wall at distance 1 stops at the wall.

- [ ] **Step 2: Run them and see them fail** — `node tests/run-all.js dungeon_e2e` → FAIL in section 3.

- [ ] **Step 3: Implement `useItem()`.** The flight is a CSS transition of a `#dBoom` element there and back (about 400 ms); its effect is decided at throw time from the tiles.

- [ ] **Step 4: Run the tests** — `node tests/run-all.js dungeon_e2e` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: the boomerang and crystal switches"`

### Task 6: Monsters, battles, the team, hearts and the restart

**Files:**
- Modify: `app/index.html` (monster stepping; the team picker at the door; `Battle`; zero hearts; experience)
- Create: `tests/battle_e2e.js`

**Interfaces:**
- Consumes: `typeOf`, `beats`, `Read.pic/wordPick/build/sentence` (each `(host,done,w)`, `done(firstTry)`), `Skills.target()`, `Rest.on()`, `Modes.open("battle",el)`.
- Produces: `Battle.start(foe,{boss,free})`, `Battle._B()`; DOM `#ovBattle.on` with `.bfoe[data-hp]`, `.bteam` with `.bmon[data-id][data-type]` (tap to swap; `.active`), the question host `.bq` (carries `data-ans` from the engines), `#bBack` ("Back off"); `state.dungeon.team`, `.xp`, `.stats`.
- Monster stepping: each room's monsters step once a second along `path` (`"wander"` or a list of tiles), never onto Ash's tile except as an attack (that starts the battle), never out of the room. The step timer does nothing while `Rest.on()`, while the page is hidden, or while a sheet is over the dungeon (`Modes.top()!=="dungeon"`).
- Team picker: at `enter()` when `team` is empty or he taps "Team" on the map: his `state.critters` and monster friends as cards with type icons, pick up to 3; "Suggest" fills three covering all types if he has them, most experience first. **Fewer than 3 animals:** the team holds what he has; **none:** his buddy fights as 🌿 (id `"buddy"`, named `STAGES[stageIdx()].name`, drawn with `ART.buddy(stageIdx(),mulberry(42),buddyHat())`).
- A turn: questions rotate `Read.pic`, `Read.wordPick`, `Read.build`, and from level 2 every third turn `Read.sentence`; about half use `Skills.target()` words (the engines already do this when called without a word). Right → the active animal's move hits: 1, or 2 when `beats(typeOf(active), foe.type)`. Each wrong tap → the foe hits: −1 half while `halvesLostThisQ<2`. A double tap is ignored (use `Read.once` or the engines' own guard).
- Moves by kind: hunter "Bite!", prey "Kick!", flyer "Peck!", brawler "Stomp!"; monster friends use their `move`; spoken with `Sound.speak`.
- The buddy line when the active animal is weak against the foe: the matching `lines` entry ("Water is strong against fire!").
- Win: 2 💎, `stats.wins++`, the fighter's `xp++` (a star at 3, 6, 10, 15, 21 shown on its card), the monster's uid goes in `run.beaten`, `Quests.hit("dungeon")`. Then `Friends.offer(kind)` (Task 8; until then a no-op returning false).
- Zero halves: "Ash is tired! Back to the entrance." The run is replaced by a fresh one at `start` with full hearts; `items`, `friends`, `xp`, gems are kept; `stats.restarts++`.
- `#bBack`: Ash steps back one tile, the battle closes, the foe keeps its lost hp for this run.

- [ ] **Step 1: Write the failing tests in `tests/battle_e2e.js`:**
  - a save with dog (leaf), shark (water) and lion (fire): the picker's Suggest picks those three
  - **a save with no animals:** the team is the buddy alone, typed 🌿, and a battle can be won
  - bumping Blob opens `#ovBattle.on`, `Modes.top()==="battle"`, and `Rest` gives it 3 minutes (with `Rest._idleMs` short and `_deepMs` long, `Rest.check()` keeps it awake)
  - a right answer through `.bq[data-ans]` lowers `.bfoe[data-hp]` by 1; with lion (fire) active against Blob (leaf), by 2
  - a wrong answer costs one half; three wrong taps on one question cost two halves in all
  - **a double tap on the right answer lands one hit**
  - swapping to another `.bmon` changes `.active` and costs nothing
  - winning pays 2 💎, adds 1 xp, and Blob's uid is in `run.beaten`; Blob is gone from the room
  - zero hearts (seed `run.halves=1`, answer wrong once): "Ash is tired!" shows, the run restarts at `f0` with 6 halves, and the boomerang, gems and xp are kept
  - `#bBack` closes the battle with Ash one tile back and the foe's hp unchanged
  - **a reload during a battle** resumes at the room's door with the saved halves, Blob there once, and no `#ovBattle.on`
  - monsters don't step while `Rest.on()` (positions unchanged over 3 s at rest)

- [ ] **Step 2: Run them and see them fail** — `node tests/run-all.js battle_e2e` → FAIL.

- [ ] **Step 3: Implement monster stepping, the picker and `Battle`.**

- [ ] **Step 4: Run the tests** — `node tests/run-all.js battle_e2e` then `node tests/run-all.js dungeon_e2e` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: monsters, reading battles, the team, types, hearts and the kind restart"`

### Task 7: King Stump, the heart container and the badge

**Files:**
- Modify: `app/index.html` (`Battle` boss mode; the boss room; clearing; BADGES gains `{id:"d_forest", ic:"🌿", n:"Forest Temple", d:"You beat King Stump.", t:s=>!!(s.dungeon&&s.dungeon.cleared.forest)}`)
- Modify: `tests/battle_e2e.js` (section "boss")

**Interfaces:**
- Consumes: Task 6's `Battle.start`.
- Produces: `Battle.start("stump",{boss:true})`: 8 hp; every third round `Read.sentence`; `beats("fire","leaf")` doubles as usual (the boss's `weak` is its type's loser); the dungeon item gives one free hit (a "Use the boomerang!" button in the boss sheet while unused). Win: the friendly line, `maxHearts+1` (up to 6) the first time only, 10 💎, `cleared.forest={at:today(),runs:n}`, the run ends (`run=null`), back to the map with the badge slot filled and the trophy shown. Replays pay battle gems and 10 💎 but no heart container.

- [ ] **Step 1: Write the failing tests:** the Boss Key opens `B`; the boss has `data-hp="8"`; round 3 is a sentence question; the boomerang button lands one free hit once; winning sets `maxHearts` 3 → 4 and `cleared.forest`, pays 10 💎, earns the `d_forest` badge, and the map shows the forest `.cleared`; a replay win leaves `maxHearts` at 4.

- [ ] **Step 2: Run them and see them fail** — `node tests/run-all.js battle_e2e` → FAIL in "boss".

- [ ] **Step 3: Implement the boss fight and clearing.**

- [ ] **Step 4: Run the tests** — `node tests/run-all.js battle_e2e` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: King Stump, the heart container and the Forest badge"`

### Task 8: Befriending and Dungeon friends

**Files:**
- Modify: `app/index.html` (`Friends`; `CRIT()` and `drawThing` for `m_*` ids; `Dex.open()` gains a "Dungeon friends" tab; the valley; exclusions)
- Create: `tests/friends_e2e.js`

**Interfaces:**
- Consumes: `addItem(id)` (adds an animal to `state.critters`, returns `{new, up}`; follows the crowded-valley rule), `Dex.open()`, `state.dungeon.friends`.
- Produces: `Friends.offer(kind)`: shown after a win when `!Friends.has(kind)` and (first win over that kind, or `Math.random()<1/3`). Two steps in a `battle`-mode sheet: pick the monster's name among `[name, ...look]` (`host.dataset.ans=name`), then `Read.sentence`-style: the `friend` sentence with three pictures (the monster, two others). Both right → `addItem("m_"+kind)`, `friends[kind]=today()`, "NEW in your Word-Dex!" and a confetti; a miss → "Maybe next time!", no cost. Returns `Promise<boolean>`.
- `CRIT(id)`: for `id` starting `m_`, returns `{id, name, b:0, kind:"brawler", rar:1, cry:"buzz", monster:true}` built from `DUNGEONS.monsters`; `CRITTERS` itself is unchanged, so Word Wilds (`Dex.pool`), crate rewards, the Trading Post and the Mine's lost animals keep drawing only from `CRITTERS`.
- `drawThing("m_blob")` draws `ART.m_blob` (it already does once `ART` has the key).
- `Dex.open()`: a tab row "Animals | Dungeon friends"; the friends tab lists the monsters of the open dungeons (12 slots later; 4 now) with `?` for not yet.
- Team: monster friends appear in the picker with their own type.

- [ ] **Step 1: Write the failing tests in `tests/friends_e2e.js`:**
  - the first win over Blob offers friendship; reading the name and the sentence right adds `m_blob` to `state.critters` and `friends.blob`; the Word-Dex's Dungeon friends tab shows Blob
  - a wrong name tap shows "Maybe next time!" and costs no hearts; Blob is not added
  - a second win over Blob after befriending offers nothing
  - with `Math.random` pinned to 0.9, a win over a kind already beaten but not befriended offers nothing (1 in 3 not met)
  - Blob appears in the valley (or rests in the sticker book when the valley is full, as `addItem` decides)
  - Blob is in the team picker with type 🌿
  - Word Wilds never starts with a monster (`Dex.pool()` has no `m_` ids), and a crate reward never gives one (the reward pool has no `m_` ids)

- [ ] **Step 2: Run them and see them fail** — `node tests/run-all.js friends_e2e` → FAIL.

- [ ] **Step 3: Implement `Friends`, the `CRIT` fallback, the Dex tab and the team entries.**

- [ ] **Step 4: Run the tests** — `node tests/run-all.js friends_e2e` then `node tests/run-all.js battle_e2e` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "Dungeons: befriending monsters and the Dungeon friends page"`

### Task 9: Quests, reports, voice, docs and the release

**Files:**
- Modify: `app/content/sentences.js` (`QUEST_POOL` gains `{id:"dbattle",ic:"⚔️",t:"Win 3 dungeon battles",k:"dungeon",n:3}` and `{id:"dfriend",ic:"🤝",t:"Make a monster friend",k:"dfriend",n:1}`; `Friends.offer` calls `Quests.hit("dfriend")` on success)
- Modify: `tools/progress.js` (a "Dungeons:" line: cleared, friends, team, restarts per run)
- Modify: `app/index.html` (`Dungeon.voiceLines()`: every `lines` entry, signs, monster names and `friend` sentences, the boss taunt and friendly line, the move words)
- Modify: `tools/voice/extract.js` (collect `Dungeon.voiceLines()` like `Factory.voiceLines()`); `tools/voice/voice_texts.json` and `app/voice/` (new clips)
- Modify: `docs/design.md` (a "v10.11 — Word Dungeons: the Forest Temple" section a parent can read)
- Modify: `app/sw.js`, `app/index.html` (`npm run release`)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the failing checks:** in `tests/battle_e2e.js`, winning 3 battles completes "Win 3 dungeon battles" when that quest is today's (force it into `state.quests.list`); in `tests/friends_e2e.js`, befriending completes "Make a monster friend"; `node tests/voice_cov.js` lists the dungeon lines as missing.

- [ ] **Step 2: Run them and see them fail** — `node tests/run-all.js battle_e2e friends_e2e voice_cov` → FAIL.

- [ ] **Step 3: Implement the quests, `voiceLines()`, the extractor change and the progress line.** Then make the clips: `npm run voice:extract`; in `tools/voice` with `WCV_THREADS=2`, `python gen.py N 4` for N in 0..3, then `python index.py` and `python check.py`.

- [ ] **Step 4: Run everything**

Run: `npm test`
Expected: "all passed" (every suite, including `dungeon_data`, `dungeon_e2e`, `battle_e2e`, `friends_e2e`, `voice_cov`, `version_check`, `power_e2e`).

- [ ] **Step 5: Release and commit**

```bash
npm run release
git add -A app tests tools docs
git commit -m "Release <VERSION>: Word Dungeons, the Forest Temple"
git push origin HEAD:main
curl -s http://192.168.1.91:8088/sw.js | head -3   # within 15 minutes: the new VERSION
```
