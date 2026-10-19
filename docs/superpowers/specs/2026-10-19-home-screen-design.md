# Home: an under-the-sea start screen and a game registry

Status: design agreed with Eric on 19 Oct 2026, section by section (the look chosen in the visual companion: option C, "the buddy says hi", on an under-the-sea background with fish slowly drifting). This file is the spec; the implementation plan comes next. Optimization is a separate project that follows (see the end).

## Why

- When Asher opens the game today he lands straight in the valley, with its animals, vehicles, weather and light layers all moving: busy for a 6-year-old choosing what to do, and the heaviest screen for the iPad's battery.
- New games are hard-wired into the valley's tool bar (about 25 buttons, each with its own handler and show/hide code), which is crowded and makes every new game touch the valley.

Goals: he opens the game on a calm Home where he picks where to go; every game is an entry in one registry, so adding a game never touches Home or the valley.

## Decisions (Eric, 19 Oct 2026)

| Question | Answer |
|---|---|
| The valley's tool bar | Valley tools only (build plans, closet, sticker book, Trading Post) plus 🏠 Home; every game moves to Home |
| After a game closes | Back to Home |
| Layout | C: the buddy greets him with one suggestion; the game tiles are in rows below |
| Background | Under the sea (mockup A): sun rays in blue water, a turtle, fish, bubbles, a sandy floor with coral, a shell, a starfish |
| Motion | The fish drift slowly; everything else is still |

House rules that still hold: offline-first; older iPad Safari; never break old saves; kind words; every fixed spoken line gets a clip.

## 1. The Home screen

- **When it shows.** The game opens on Home every time (a fresh start, a reload, an update).
- **The picture.** The under-the-sea scene from the mockup: a blue water gradient with soft sun rays from the top, a sandy floor along the bottom, OpenMoji coral, a shell and a starfish on the sand, a turtle and two fish in the water, a few bubbles. It is drawn once.
- **Motion.** The fish (and the turtle) drift slowly across, a CSS transform animation of about 20-40 s per crossing. Everything else is still. The drift pauses when the game rests (`body.rest`, as everywhere) and whenever anything is open on top of Home.
- **The top bar.** Today's reading ring (📖 12/20, from Goal), 💎 gems, 🪙 coins, and ⚙️ for the Grown-up menu (the same gate as today).
- **The buddy.** His buddy (its current stage and hat, as drawn on the HUD) with a speech bubble and at most one big button. The suggestion is the first that applies:
  1. today's reading goal is set and not met: "Want to read N more words today?" with **📦 Let's read!** (opens the crates)
  2. a game he has never opened: "Try the new <name>!" with that game's button
  3. a holiday game is in season: "It's <holiday> time!" with its button
  4. otherwise: "What do you want to play?" and no button

  The line is spoken once when Home appears (each line has a clip; the N in rule 1 is spoken as its parts, as the goal ring's lines are today).
- **The tiles.** Big picture tiles (an icon and a name) in rows below the buddy, as in the mockup; more rows scroll inside Home if needed. A tile can carry a badge: NEW (never opened), ⏰ (clocked in at a job), a count (eggs ready, quests left), as the dock buttons do today.
- **The tiles at launch,** in this order:

  | Tile | Shows | Opens |
  |---|---|---|
  | 📦 Read words | always | the crates (`#crateBtn`'s handler today) |
  | 🏡 Valley | always | the valley (closes Home; see section 2) |
  | 🗝️ Dungeons | always | `Dungeon.open()` |
  | ⛏️ Gem Mine | always | `Mine.enter()` |
  | 🧭 Adventure | always | `Adv.enter()` |
  | 📚 Books | always | `Books.shelf()` |
  | 💼 Jobs | when Jobs exist (as the button today) | `Jobs.open()` |
  | 🏭 Factory | once the Factory building is built | `Factory.open()` |
  | 📜 Quests | always | the quests sheet (`Quests.render(); show("ovQuests")`) |
  | 🎃 ❄️ 🎆 🎂 🦃 💌 🥚 holiday games | in their window, as their buttons today | each module's own open |

- **Closing a game returns to Home.** Something reached from inside a game returns to that game, as now: a race or Word Wilds goes back to Adventure, a word stone back to the Mine, a book's quiz back to the shelf.

## 2. The registry and getting around

- **`Games`.** One registry in a new GAMES section near MODES:

  ```js
  Games.add({
    id:"mine",                 // also its Modes id where it has one
    name:"Gem Mine",           // the tile's label
    icon:"⛏️",                 // an emoji, or an ART id drawn with drawThing
    order:40,                  // tiles sort by order
    show:()=>true,             // the tile appears when true (a holiday in season, the Factory once built)
    badge:()=>"",              // "" or a short badge: "NEW" is added by Home itself
    suggest:()=>null,          // optional: {say, button} for the buddy (holidays use it)
    open:()=>Mine.enter()      // opens the game
  });
  Games.list()                 // the entries whose show() is true, in order
  Games.open(id)               // marks it seen, then calls its open()
  ```

  Each game adds itself where its code lives (the Mine in GEM MINE, Dungeons in WORD DUNGEONS, Trick-or-Read in its holiday section...). Home draws only what the registry holds, so a new game is one `Games.add` call: no change to Home, the valley or the tool bar.
- **NEW.** A tile shows NEW until he first opens that game; seen games are kept in `state.home.seen` ({id: "YYYY-MM-DD"}). Games he has already played (by the save: a mine made, books read, jobs done, dungeons visited, and so on) start as seen, so an old save is not covered in NEW badges.
- **Home is the bottom layer.**
  - Home is a full-screen element over the valley, registered in Modes as `home` (reading:false). While it shows, the valley is covered and sleeps (the v10.10 covered rest).
  - Games open on top of it. One rule brings him back: whenever the Modes stack becomes empty and he has not chosen the valley, Home shows. This covers every game the same way, including Adventure, which plays inside the valley.
  - **The Valley tile** sets "he chose the valley" and closes Home. While he is in the valley, things he starts there (the Factory building, a race in Adventure) return to the valley.
  - **🏠 Home** in the valley's tool bar clears that and shows Home.
- **The valley's tool bar** keeps 📐 plans, 🎨 closet, 📖 sticker book, 🏪 Trading Post and gains 🏠 Home. The crate, Mine, Adventure, Books, quests, jobs, dungeons and holiday buttons leave the valley; their ids (`#crateBtn`, `#mineBtn`, `#advBtn`, `#booksBtn`, `#questBtn`, `#jobsBtn`, `#dungeonBtn`, `#trickBtn`, `#lightsBtn`, `#fireworksBtn`, `#partyBtn`, `#feastBtn`, `#mailBtn`, `#eggsBtn`) move to the matching Home tiles, so their badges and any code that finds them by id keep working.
- **First run.** A brand-new save still meets its first-run tour; the tour starts in the valley the first time he opens the Valley tile.
- **What else changes.**
  - Pop-ups that come by themselves (a keeper waking, the session recap, a note from home, a holiday's first-day hello) open over Home as they do over the valley today.
  - The Grown-up report's "Where the time goes" lists time on Home as "Home".
  - `tools/progress.js` needs nothing new.

## 3. Saves, rest and the voice

- **Saves.** A new `state.home = {seen:{}}` with a default in `def()`; for an old save, `seen` is filled once from what it has already played (see NEW). Nothing is renamed.
- **Rest.** Home's only animation is the fish drift. It pauses at rest (`body.rest *`) and while anything is open on top of Home (Home gets a class, set where Rest.cover runs, when it is not the top mode).
- **Voice.** The buddy's lines get clips through `voiceLines()` and the usual voice tools.

## 4. Tests

- **A new `tests/home_e2e.js`** (Playwright, 1024x768 touch, and 768x1024):
  - the game boots to Home
  - every tile opens its game, and closing that game returns to Home
  - the Valley tile and 🏠 Home
  - a race started in Adventure, or the Factory opened from the valley, returns where it was started
  - the buddy's four suggestion rules in order, and the button opening the right game
  - NEW until first opened, and an old save is not all NEW
  - a test game added with `Games.add` appears on Home in its order and opens; one whose `show()` is false does not appear
  - the valley sleeps behind Home (`body.covered`)
  - the fish drift, pause at rest, and pause when a game is open on top
  - every tile is at least 44 px and fits in portrait
- **Existing suites.** About 125 uses of the moved button ids in about 25 suites. `tests/lib.js` gains `home(page)` (show Home) and `valley(page)` (go to the valley). A suite that clicks a moved id calls `home(p)` first; a suite that works in the valley calls `valley(p)` after it boots.
- `npm test` passes as always; the voice coverage covers the new lines.

## Afterwards: optimization (a separate project)

After Home ships:
1. **Measure.** Start-up time to Home and to the valley, the valley's frame times, memory and the number of animations, in Playwright with the CPU slowed to iPad level.
2. **Report.** A short list of what is worth fixing, for Eric to choose from.
3. **Build** what he chooses, through its own design and plan.

## Risks

- **He misses the old way in.** Every game is one tap from Home, and the valley is one of the tiles.
- **The test migration is wide.** It is mechanical: the ids stay the same and one helper call is added. The full suite catches anything missed.
- **A game closes in a way the stack rule doesn't see.** Every game opens and closes through Modes, which already drops a lost entry (its MutationObserver). The home tests open and close every tile.
