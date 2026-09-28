# Roadmap v10+: reading depth first, then one job at a time

Status: **plan only, nothing built yet.** Revised 27 Sept 2026 after a review of the first draft. The first draft (Factory → Store with four currencies → Jobs → Geometry → Physics → reading 13–24) is kept in full under **Deferred** at the end, so nothing designed there is lost. Written against `app/index.html` as of v9.2.1 (`MAX_TIER=12`, 235 words of which 59 are tricky (♥), 24 storybooks, and the `Read`, `Books`, `Skills`, `Decode`, `Pace`, `Quests`, `Rec` and `Adv.provide` / `hookCrit` / `hookVeh` modules).

## Why the order changed
The review asked four questions, and the answers reordered everything:

| Question | Answer | What it changed |
|---|---|---|
| Where is Asher on levels 1–12? | **Levels 1–4, steady.** | Levels 13–24 would sit unused for a year or more. They move to Deferred, with a trigger (he reaches level 9). |
| Who is this for? | **Asher first; cousins and friends are a bonus.** | Hero name stays (cheap, and the public copy needs it). The build-a-hero avatar and the placement check are deferred. |
| Reading first, or breadth first? | **Reading first, then one big mode.** | New reading work is depth at *his* level: more books, sentence fluency, a read-with-Dad mode. Jobs (two jobs only) is the one non-reading mode this year. Factory, Geometry and Physics are deferred. |
| Four currencies? | **Two: 💎 gems and the existing 🪙 coins.** | Shape stars and gears are dropped. The Trading Post shrinks to two shelves. The exchange stays as a small multiplication lesson. |

What was actually observed at home, and what this plan does about it:

| Observed | Response |
|---|---|
| He drifts to the Mine, Races and vehicles and reads as little as he can. | **Reading tickets**: a short read opens a Mine run, a race or a job shift. Tiny cost, parent toggle, and measured before and after. |
| Sessions run long, then he is done for days. | A **visible daily reading goal** with a finish line and a celebration, then the session timer nudges the break. Short and often beats long and rare. |
| Nobody knows which of the ~15 modes he actually returns to. | **Per-mode minutes and opens** in the Grown-up report, shipped first, so the next two releases are decided on two weeks of data instead of guesses. |

## Where we are
- **Levels 1–12** cover kindergarten to the end of 1st grade: short vowels, then digraphs, blends, silent e, bossy r, vowel teams, two-part words, -ing/-ed, soft c/g and y, compound words, silent letters and contractions.
- **Books:** 24 decodable storybooks, two per level. Levels 1–4, where he is, have 8.
- **Loop mechanics already there:** the 85% rule and Fast track (`Pace` times single words), a spaced review queue for unmastered words (`state.review`, due after 3/10/30 crates), three daily quests with one always a reading quest, a session timer (`settings.timer`) that yawns the buddy, and microphone recording (`Rec`) for Read-to-your-pet.
- **Subjects:** reading only. **Currencies:** 💎 gems everywhere, 🪙 coins in the Mine (`state.mine.coins`), which books already pay.

## Guiding rules for this roadmap
1. **Build for Asher's next six months, not for grade 4.** Content he will meet this year beats content that waits.
2. **Reading is the door.** Every other mode is reached through a little reading, never the other way round.
3. **Measure before adding.** No new mode ships until the report can show whether the last one moved reading minutes.
4. **At most two currencies.** 💎 and 🪙. Nothing else gets a purse.
5. The usual rules stand: offline and self-contained, older iPad Safari, kind feedback, never break an old save.

---

## v9.3 — Measure and pace (small; ships first)

**Status (28 Sept 2026): built.** Per-mode minutes and opens, the daily reading goal and the retention reads are all in `main`, along with the audit's fixes and refactors. The two-week baseline starts when the NAS copy is updated.

Nothing new to play. It makes the next decisions measurable and fixes the pacing problem.

### Per-mode minutes and opens
- The "minutes played" counter already ticks once a minute while the app is visible and touched. Extend it: the tick also reads `document.querySelector(".overlay.on")` and credits the minute to that overlay's mode (`ovRead` → crates, `ovBook` → books, `ovRace`, `ovWild`, `ovWrite`, the Mine's overlay, and so on), or to **valley** when none is open.
- Opens: a `Modes.open(id)` call at each mode's entry point (about 15 call sites), counted per day.
- Saved as `state.modeMin[ymd][mode]` and `state.modeOpens[ymd][mode]`, added in `def()`; old saves start empty. Pruned to 60 days.
- **Report:** a new "Where the time goes" block: a 7-day bar per mode with minutes and opens, and reading modes (crates, books, Wilds, Write it, Picture it) totalled as **reading minutes** against everything else. This one number is what v10 and v10.1 are judged on.

### Daily reading goal with a finish line
- A small ring on the HUD: **"Today's reading"**, filled by words read (crate reads, book pages, Wilds words, signs). The goal is 12 words or one book, whichever comes first, and a Grown-up setting (8/12/20).
- Filling it plays the daily-quest chest early if the reading quest is done, the buddy says "That's your reading for today! The valley is yours," and the counter keeps going with no further fanfare. The session timer stays as it is.
- Purpose: a clear end, so a session can be short and still feel finished. He can keep playing; the game just stops asking for more reading.

### Retention checks for mastered tricky words (small)
- Today `state.review` drops a word once it is mastered. Add one retention read for each mastered ♥ word at 30 and then 90 crates after mastery. A miss puts it back on the review queue; it never un-masters and never costs anything.

### Tests and workflow
- `modes_e2e.js`: opening a mode and a fake minute tick credit the right mode; the report renders totals; the daily ring fills and the "reading done" line fires once.
- Voice: about 6 clips (goal reached, goal reminders, retention read intro).
- Then two weeks of real play before v10 ships, so the tracking has a baseline.

---

## v10.0 — Reading depth at his level

### More books where he is
- Levels 1–6 go from 2 books each to **5 books each**: 18 new books of 5–7 pages, with the existing quiz types (who/what, yes/no, count). Art comes from `WORD_ART` and the existing scenes, so a book is data plus a decode check plus voice.
- Two new quiz types, both spoken and both kind: **What happened first?** (two pictures from the book, tap the earlier one) and **Which page said it?** (hear a sentence, tap the matching picture). These are the sequencing questions the first draft put at level 17, brought down to where he is.
- The **second story arc** (after The Letter Thief) starts here with 3 of its 6 chapters, at levels 3–6.

### Sentence fluency, no microphone
- `Pace` times single words. Books get a **Read it again** button on a finished page: the page text shows without pictures, he reads and taps "Done", and the time is logged against the page's word count. Anything under 800 ms is ignored, as `Pace.quick` does today.
- The report shows **words per minute by level** as a trend, from these rereads only. No speech scoring, which is unreliable offline.
- A reread pays a small 💎 bonus the first time per page per day. It is optional and never asked for twice.

### Read with Dad (two-player)
- A **Read together** button on the book shelf. Two ways to play, chosen on the first screen and remembered:
  - **Take turns:** pages alternate. Dad's page shows the text large with a "Dad read it" tap; Asher's page is the normal read flow.
  - **Echo:** every page is read by Dad first, then Asher. Two taps per page.
- Pays the same 💎 as a solo read, plus a "Read with Dad" sticker on the cover and a line in the report ("3 books read together this week").
- `Rec` can record the session as it does for Read-to-your-pet, stored the same way, so cousins can hear the two of them. Optional.
- About 150 lines, no new voice clips, no new save shape beyond `books[id].together`.

### Reading tickets (the soft gate)
- Reading earns 🎟️ tickets: a crate word read = 1, a book page = 1, a finished book = 3, a Wilds word = 1. Shown on the HUD next to gems.
- Entering the **Mine**, starting a **Race**, or clocking into a **Job** (v10.1) costs **3 tickets** for one run. Vehicles, Adventure, Animal care and Books are never gated.
- With no tickets the buddy says "Read three words and the mine opens," and the nearest crate glows. Tickets never go negative and are never taken away.
- **Grown-up setting: "Reading opens the mine and races"**, default on. When off, nothing changes from today.
- Honest risk: this can turn reading into a toll booth. Mitigations: the cost is three words, the message is always the same and always kind, and the v9.3 tracking shows within two weeks whether reading minutes rose or total minutes fell. If reading minutes do not rise, turn it off and say so in `design.md`.

### Hero name (Grown-up setting)
- Grown-up menu → Settings → **Hero name**, default **"Asher"**. It replaces "Ash" in the storybooks, Adventure, My Own Book, cut-scenes and the spoken lines that include it.
- Stored as `state.hero`; `migrate()` adds `"Asher"` to old saves. Book text stores `{hero}`, as `{pet}` already works.
- Decode treats the hero's name as a level-1 word, because children read their own name early.
- Voice clips exist for the default name. A different name falls back to the device voice for those lines, and Settings says so.

### Tests
- `books2_e2e.js`: every new book passes the decode check at its level, has a voice clip per page, and its quizzes resolve with `dataset.ans`.
- `together_e2e.js`: both modes finish a book, pay once, and set the sticker.
- `tickets_e2e.js`: tickets are earned once per read, a gated mode refuses politely at zero, the setting off removes the gate, and a double tap spends once.
- `hero_e2e.js`: a book page shows the name, changing it updates the page, decode passes with any name.
- Voice: about 120 clips for the books and chapters, 10 for tickets and the goal, 10 for read-together.

---

## v10.1 — Jobs, small: Shopkeeper and Lawn mower

The one non-reading mode this year. It earns its place because **every task starts with reading**: the customer's order, the mowing directions. Math rides along at his level.

### How it plays
- A **Job board** in the valley (an `Adv.provide` spot) and a button in the mode bar. He picks a job, puts on its uniform, and clocks in. Clocking in costs 3 🎟️ (v10.0).
- A shift runs until he taps **Clock out**. Every 5 tasks there is a small cheer and a "keep going or clock out?" moment.
- **Pay** is 🪙 per task, paid at once into `state.mine.coins`, the purse the Mine already uses. A wrong answer means "the customer waits a moment"; pay is never taken away. Five right in a row earns a tip.
- Each job gains XP. Job levels unlock a harder task type, a badge, and a uniform or tool on the 🪙 shelf.
- **Name clash.** The Gem Mine's daily "Mine jobs" panel is renamed **"Mine tasks"**; `state.mine.jobs` keeps its name.

### The two launch jobs
| Job | Opens at | Reading in every task | Math at his level | Kits |
|---|---|---|---|---|
| 🛒 Shopkeeper | Level 2 (he has it) | Read the customer's order: "A red hat, please!" | Count items to 10, then add two small groups, then coins to 20¢ | pick, pad |
| 🌱 Lawn mower | Level 4 (he has it) | Read the direction words: "mow 4 left, then 2 up" | Count squares mowed, then add two rows, then rows × columns as arrays | path, pad |

Later jobs (Janitor, Mail carrier, Baker, Construction, and the reuse jobs Vet and Librarian) keep their designs from the first draft under Deferred, and each is data only once the kits exist.

### Three kits, not six
Kits are the only UI code. Each renders a question, sets `dataset.ans`, and calls `done(ok)` exactly once with the same double-tap guard as `Read.pic`.
- `pick`: tap the right thing.
- `pad`: a big number pad.
- `path`: tap arrows or tiles to follow directions.

`order`, `sort` and `build` wait for the jobs that need them.

### The math track, only what the jobs need
`Tracks.register({id:"math", ...})` from the first draft, with the K–1 levels only: counting to 10 and 20, comparing, adding and subtracting within 10, then within 20, and coins. Every question is generated, seeded, and read aloud, so his reading level never holds his math back. The full track design is under Deferred.

### Registration
```js
Jobs.register({
  id:"shop", name:"Shopkeeper", icon:"🛒", uniform:"apron", unlock:{tier:2},
  pay:{perTask:3, streakTip:5},
  tasks:[
    {kit:"pick", track:"reading", gen:lvl=>{const w=Read.word();
      return {say:`Can I have a ${w.w}?`, text:`A ${w.w}, please!`, choices:Read.others(w,3), ans:w.w};}},
    {kit:"pad", track:"math", minGrade:"K", gen:lvl=>{const a=1+rnd(5),b=1+rnd(5);
      return {say:`${a} apples and ${b} pears. How many things?`, ans:a+b};}},
  ]
});
```
Generators are pure and take a seed. Unknown `kit` or `track` values are skipped with a console warning, never a crash.

### The Trading Post, two shelves
- A building in the valley (near the Job board) plus a HUD button showing 💎 and 🪙.
- **💎 shelf: outfits.** The wardrobe hats move here unchanged (`state.hats`, `state.hat`). About 8 new items priced 10–60.
- **🪙 shelf: uniforms and tools.** The Mine's helmets move here unchanged. Job uniforms and tools unlock by job level. About 10 items priced 15–80.
- **Exchange:** 1 💎 = 5 🪙, both ways, whole bundles of 5 only, and every swap shows its sum ("10 🪙 → 2 💎"). It appears only once he has earned both.
- No decorations shelf, no selling, no fees, and prices never change over time. Blueprints and the Mine pick shop stay where they are.
- Data-driven: `Store.item({id:"cape_red", shelf:"outfit", cost:{gems:12}, art:"cape_red", tag:"new"})`.

### Save fields
`jobs:{current:null, xp:{}, tasks:0}, tracks:{}, tickets:0, owned:{}, hero:"Asher"` added through `def()` and `migrate()`. 💎 stays in `state.gems`, 🪙 in `state.mine.coins`; `migrate()` creates the Mine purse if the Mine was never opened. Nothing is renamed.

### Tests
- `jobs_e2e.js` walks every registered job × task: answers via `dataset.ans`, pay added once, double tap ignored, a wrong answer takes nothing away, no console errors, and every text a generator can produce decode-checks at the job's level. A new job gets tested with no new test code.
- `tracks_e2e.js`: 200 seeds per math level, answers correct and present in `choices`.
- `store_e2e.js`: buying charges the right purse once, never negative, exchange sums right, and hats and helmets owned before the upgrade are still owned after `migrate()`.
- Voice: about 80 clips (job intros, orders, direction words, tips, numbers to 20 if not indexed).

---

## v10.2 — Decided by the data
Two weeks after v10.1, the "Where the time goes" block answers one question: **did reading minutes go up?**
- **If yes, and Jobs holds his attention:** add two more jobs from the deferred list (Baker for sequencing, Mail carrier for place value) and math grade 2.
- **If reading went up but Jobs is ignored:** more books for levels 5–8 and the rest of the second story arc. Leave Jobs at two.
- **If reading did not go up:** turn the ticket gate off, keep the daily goal, and look at the per-mode data before building anything.

---

## Build order

| Phase | Ships | Judged by |
|---|---|---|
| **v9.3** | Per-mode minutes and opens; daily reading goal; retention reads for mastered ♥ words | Two weeks of baseline data |
| **v10.0** | 18 books for levels 1–6; two new quiz types; second story arc (3 chapters); sentence reread timing and words-per-minute trend; Read with Dad; reading tickets with parent toggle; hero name | Reading minutes vs baseline; books finished per week |
| **v10.1** | Jobs engine with 3 kits; Shopkeeper and Lawn mower; math track K–1; Trading Post with two shelves and the 1 = 5 exchange; "Mine tasks" rename | Reading minutes hold or rise; Jobs opens per week |
| **v10.2** | Chosen by the data (see above) | |
| Later | Items under Deferred, each with its trigger | |

Each phase follows the usual workflow: tests, voice clips, `npm run release`, a `design.md` section, then deploy.

## Risks
- **The ticket gate makes reading a chore.** Three words is the whole cost, the parent toggle is one tap, and the per-mode data decides within two weeks.
- **Read with Dad depends on Dad's time.** One book per session, five to seven pages. It is a bonus, not a requirement, and nothing is locked behind it.
- **More books means more voice and more decode checks.** Each book is data; the decode check and `books2_e2e` catch a word above level before it ships.
- **Two currencies is still two.** The 🪙 shelf shows only coins, the 💎 shelf only gems, and the exchange appears only once he has both.
- **Size on the older iPad.** `index.html` is 1.9 MB, mostly art. Eighteen books and two jobs add well under 100 KB of text. The content-file split is deferred with its trigger below.

## Decisions made (27 Sept 2026)
| Topic | Choice |
|---|---|
| Order | Measure → reading depth at his level → Jobs (two) → decided by data |
| Reading depth | Books at levels 1–6 to 5 each; sequencing quizzes; sentence reread timing; Read with Dad |
| Loop | Daily reading goal with a finish line; reading tickets open the Mine, Races and Jobs; parent toggle, default on |
| Measurement | Per-mode minutes and opens in the report, shipped before any new mode |
| One mode this year | Jobs: Shopkeeper and Lawn mower, kits pick/pad/path only |
| Currencies | 💎 and 🪙 only; exchange 1 = 5 in bundles of 5 |
| Store | Trading Post with two shelves; hats and Mine helmets move in; no decorations, no selling |
| Job pay | 🪙 into `state.mine.coins`; shift endless until Clock out; entry costs 3 🎟️ |
| Hero | Name setting, default "Asher". Avatar builder deferred |
| Factory | Deferred to next year. Trigger: he adds within 20 comfortably and asks for building games |
| Geometry, Physics | Deferred. Trigger: Jobs data shows math holds his attention |
| Levels 13–24, placement | Deferred. Trigger: he reaches level 9 |
| Content files (`app/content/*.json`) | Deferred. Trigger: `index.html` passes 3 MB or the iPad boots in over 3 s |
| Four currencies, decorations, gears | Dropped |

---

# Deferred

Everything below is the first draft's design, kept unchanged so it can be picked up when its trigger fires. Section names keep their original "Part" letters. The Jobs, Store and hero-name sections above supersede Parts C, D and G; the parts of C and D kept here are the later jobs, the remaining kits and the four-currency store, for reference only.

## Factory mode (from Lean Mine)
**Trigger:** he adds within 20 comfortably and asks for building games. Was v9.3 in the first draft.


Based on the concepts in **Lean Mine**, a separate React game (`LeanMine.jsx`). The kid version keeps its best ideas:
- Drills on ore, belts to a hub, and machines that combine things into something worth more.
- Its deterministic fixed-step simulation.
- The lean-manufacturing lesson that **jams and piles of waiting stuff are the problem to fix**.

It drops the cost curves, kaizen tracks, bores, relay hubs, gates, priority mergers and idle pay. Lean Mine is not copied in; its tick logic is ported to plain JS (no React or Vite, offline, IndexedDB saves).

### How it plays
- **Getting there.** A **Factory** building in the valley (an `Adv.provide` spot) opens a top-down board of about 12×9 cells, sized for the iPad in landscape.
- **Ore.** Ore spots come in three colours: 🔴 red, 🔵 blue, 🟡 yellow (primary colours).
- **Mixer.** Two different colours go in and the mixed colour comes out: red + blue = purple, blue + yellow = green, red + yellow = orange. This is Lean Mine's furnace, where two different metals make an alloy.
- **Delivery.** A delivery truck at the hub tallies what arrives.
- **Belts.** He **drags to paint** belts: they follow his finger and turn at corners, and tapping a belt rotates it. On a keyboard, arrows move a cursor, space places, and R rotates. It uses touch events with a mouse fallback for the older iPad.
- **Jams glow** orange, then red, the longer a belt is backed up (Lean Mine's heat). The buddy gives a spoken tip, held for 2 s so it doesn't flicker, and phrased as kid-sized lean ideas:

| What's wrong | Buddy's tip | Lean idea |
|---|---|---|
| Drills blocked | "The drills are waiting. The belt is full! Try a splitter." | Overproduction |
| Lots on the belts, little moving | "Lots of rocks waiting in line!" | Inventory |
| Very long belts | "That's a long trip! Can the belt be shorter?" | Transportation |

### Counting and adding (the learning goal)
- **Order cards use numbers,** for example "Send 3 🟣 and 2 🟠". Every order is read aloud, so reading never blocks the factory.
- **The hub's tally board** fills ten-frames as items arrive, so counting is visible.
- **At the end of each level he adds it up:** "3 purple + 2 orange = ?" on a big number pad. Help is the tally board again; a wrong answer takes nothing away.
- **Numbers grow with the levels:** counting to 5, then to 10, then adding two groups within 10, then within 20. The stamper doubles, which previews multiplication.
- Uses the same `Tracks` math levels planned for v10, so this factory becomes the first user of the math track.

### Machines, one per level (unlocked by finishing the level that teaches it)
| Level | Teaches | Order (math) |
|---|---|---|
| F1 | Drill + belt to the truck | Send 5 🔴 (count to 5) |
| F2 | Belts that turn around rocks | Send 8 🔵 |
| F3 | Two drills, two belts, one truck | 4 🔴 + 3 🟡 = ? |
| F4 | **Mixer**: red + blue → purple | Send 3 🟣 |
| F5 | Mixer for all three new colours | 2 🟣 + 2 🟢 + 2 🟠 = ? |
| F6 | **Splitter**: a jam is fixed by splitting to two mixers | Send 6 🟣 (3 + 3) |
| F7 | Splitter practice | 5 + 5 = ? |
| F8 | **Colour sorter**: pull blue out of a mixed belt | Send 4 🔵, the rest to the mixer |
| F9 | Sorter + mixer together | 6 + 4 = ? |
| F10 | **Stamper**: a bar becomes a toy part worth 2× | 4 toys = ? gems (doubling) |
| F11 | **Tunnel**: carry a belt under another | 7 + 6 = ? |
| F12 | The big order: everything | Totals to 20 |

- **Stars.** 1–3 stars per level for fewer pieces or less jam time. Stars only add; he never loses any.
- **Pay.** Each level pays 💎. When the v10 currencies arrive, the factory pays ⚙️ gears instead. Existing gems are kept.

### Sandbox
- **When.** It opens after F12. It's a larger board of about 16×12 with every machine he has unlocked.
- **His factory stays.** It is saved and there to come back to.
- **Pieces are free.** No cost curves.
- **Orders** appear as optional side goals, with the same counting and adding. **Only a finished order pays** (3–6 💎 each, up to 5 orders a day). Deliveries alone pay nothing, so a big factory can't flood the game with gems.
- **Stops when he leaves.** It only runs while open, so there's no idle pay and no pull to "collect".

### Engine (ported from Lean Mine)
- **State.** A grid in typed arrays: `type`, `dir`, `item`, `prog`, `timer`, `mask`, `heat`.
- **Tick.** A fixed step at **30 Hz** with no `Date` or `Math.random`, so a layout always does the same thing on the iPad and in the tests.
- **Movement.** A single `deposit()` hand-off, and the receiver decides which belt it takes from, as in Lean Mine, which makes merging fair.
- **Items:**
  - 1–3: ores
  - 16 + a 3-bit colour mask: bars (two bits = a mixed colour)
  - 64 + mask: stamped toys
- **Tunnels** link automatically within 4 tiles.
- **Drawing.** Rendered on one `<canvas>` with rAF only while the overlay is open, and paused when the app is hidden.
- **About 600 lines** in a new `FACTORY` section of `app/index.html`. It avoids `.at()`, `structuredClone` and `:has()`.
- **Saves:** `state.factory = {lvl:0, stars:{}, sandbox:null}`, added in `def()` and `migrate()`. The sandbox grid is stored as compact strings (for example base-36 cell codes), not arrays of objects, so saves stay small.

### Tests (`factory_e2e.js`)
- Every level has a stored **known solution**. Run headless, it finishes the order within its time limit, and the result is the same on 3 runs in a row.
- Checks for jams, mixing, splitting, the sorter, the stamper and tunnels: a jammed layout shows the right tip, and each machine's output is correct.
- Double taps and double finishes pay once. A wrong sum takes nothing away.
- The sandbox survives a save and reload.
- The whole order can be played on a keyboard.

### Voice
About 60 new clips: level intros, machine names, tips, "How many altogether?", and numbers 1–40 if they aren't indexed already.

---

## Part A — Reading levels 13–24 (grades 2–4)
**Trigger:** he reaches level 9. Includes the placement check and the content-file loader.

| Lvl | Skill | Examples | Grade |
|---|---|---|---|
| 13 | Vowel teams II: oi/oy, aw/au, ew/ue, ie | coin, toy, saw, new, blue | 2 |
| 14 | R-controlled II: air/are/ear, ore/oar, eer | chair, square, bear, shore, deer | 2 |
| 15 | Trigraphs and endings: -tch, -dge, -ge, -ve | match, bridge, cage, give | 2 |
| 16 | Endings that change spelling: -er/-est, -es, y→i, doubling | bigger, boxes, cried, hopped | 2 |
| 17 | Prefixes: un-, re-, pre-, dis-, mis- | undo, replay, dislike | 2–3 |
| 18 | Suffixes: -ful, -less, -ly, -ness, -ment | helpful, quickly, kindness | 3 |
| 19 | Syllable types and three-part words (open/closed, VCV) | tiger, basket, banana, dinosaur | 3 |
| 20 | -tion/-sion, -ture, -ous | station, picture, famous | 3–4 |
| 21 | Homophones and multiple meanings | there/their, bat, right | 3 |
| 22 | Greek and Latin parts: tele, graph, port, struct, rupt | telephone, transport | 4 |
| 23 | Schwa and unstressed endings: -le, -al, -en, -on | animal, kitten, lemon | 4 |
| 24 | Grade-4 challenge and academic words | temperature, community | 4 |

About 20 words per level, so roughly 240 new words.

### Reading grows from words to meaning
- **Fluency.** Pace already times single words. Extend it to sentences, then short passages, and record words per minute. Show the words-per-minute trend in the report.
- **Comprehension.** Picture It and the book quizzes grow new question types by level:
  - Levels 13–16: who and what.
  - Levels 17–20: sequencing ("what happened first?").
  - Levels 21–24: main idea, inference and word-in-context.
- **Pictures.** Many grade 3–4 words are abstract (kindness, famous), so picture-pick no longer works for them. New question types:
  - Meaning pick: he hears or reads a short definition and picks the word.
  - Fill the blank in a sentence.
  - Build the word from its parts: `un|help|ful`, using the existing split notation.

### Engineering
- **Tiles.** Keep the current notation. New sounds are `oi`, `aw`, `ew`, `air`, `ear`, `tion:shun`, `ture:cher` and a schwa (`a:uh` already works). Add them to `Phonics` (the synth plus the ALIAS entries), `Skills.MAP` and `SKILL_DEF`.
- **Words made of parts.** Add a morphology field so Decode and the game can split words into prefix, base and suffix:
  ```js
  {w:"unhelpful",p:["u","n","|","h","e","l","p","|","f","u","l"],t:18,morph:["un","help","ful"]}
  ```
- **Decode.** Teach it prefixes and suffixes: strip them, then check the base word. Add the new patterns above. The book check runs unchanged.
- **Level cap and settings.** `MAX_TIER` goes to 24. The 85% rule and Fast track still apply, and the level override menu in Parent mode extends automatically.
- **Placement check (new).** A 3-minute quiz that samples 3 words per level and stops at the first level where he misses 2. It sets his starting level, so a strong reader doesn't grind through levels 1–12.
- **File size.** `index.html` is already 1.9 MB.
  - Recommendation: put new content in `app/content/levels-13-24.json` (and later `math.json`, `jobs.json`). The service worker caches these files like the voice clips, and they load when first needed.
  - This is still offline-first with no CDN, and it keeps boot fast on the older iPad.
  - Trade-off: it's no longer strictly one file. `pwa_e2e` must check the new files are cached.
- **Voice.** About 240 words, 60 sentences and 40 definitions means roughly 350 new clips (≈3–4 MB). Keep the 24 kHz mono MP3 format.

---

## Part B — Other subjects
**Status:** the math track's K–1 levels ship in v10.1. The rest (math grades 2–4, science, social studies, spelling) waits for the v10.2 data.

### One engine for every subject: "tracks"
Every subject is a registered track: a list of levels, each with a question generator. Tracks reuse what reading already has:
- Mastery and the 85% rule
- Pace and Fast track
- Kind feedback ("no boost this time")
- The report
- `dataset.ans` for the tests

```js
// JS
Tracks.register({
  id:"math", name:"Numbers", icon:"🔢",
  levels:[
    {id:"count10", grade:"K", gen:()=>{const n=1+rnd(10);
      return {say:`How many apples?`, art:{thing:"apple",n}, choices:near(n,3), ans:n};}},
    // ...
  ]
});
```
```ts
// TypeScript equivalent
interface Question { say: string; text?: string; art?: { thing: string; n?: number };
  choices: (string|number)[]; ans: string|number; input?: "pick"|"pad"|"order"; }
interface TrackLevel { id: string; grade: "K"|"1"|"2"|"3"|"4"; minReading?: number; gen: (seed?: number) => Question; }
interface Track { id: string; name: string; icon: string; levels: TrackLevel[]; }
declare const Tracks: { register(t: Track): void; level(id: string): TrackLevel; };
```

Math questions are always read aloud, so his reading level never holds back his math. Any written question is decode-checked against `minReading`.

### Suggested subjects, in build order
1. **Math.** Almost all generated, so it needs very little content or art.
   - **K:** counting to 20, comparing, shapes.
   - **1st:** adding and subtracting within 20, tens and ones, telling time to the hour.
   - **2nd:** adding and subtracting within 1,000 with carrying and borrowing, money (coins), time to 5 minutes, skip counting.
   - **3rd:** multiplication and division facts, fractions on a number line, area, word problems.
   - **4th:** multi-digit multiplication, equivalent fractions, decimals as money, angles.
2. **Science.** Ties into what the valley already has:
   - Seasons and weather (the game has seasons).
   - Animals and habitats (critters, Wilds).
   - Plant life cycles (garden).
   - States of matter.
   - Simple machines: lever, ramp, pulley (construction).
   - Space (Star tower, rocket).
3. **Social studies and life skills:** community helpers (the Jobs), maps (the valley map, left/right, north/south), needs vs. wants, and saving money.
4. **Spelling and writing:** dictation from the reading levels, and Write It for whole words.

---

## Part C — Jobs mode (first draft; v10.1 above supersedes it)
**Kept for:** the four later jobs, the next-wave list, and the `order`, `sort` and `build` kits.

### How it plays
- **Starting a shift.** A **Job board** stands in the valley (an `Adv.provide` spot) and there is a button in the mode bar. He picks an unlocked job, puts on its uniform, and clocks in.
- **Shifts are endless.** Tasks keep coming until he taps **Clock out**. Each task mixes reading with one subject at his current level in each. Every 5 tasks there's a small cheer and a "keep going or clock out?" moment, and the Grown-up session timer still applies.
- **Pay.** He's paid 🪙 per task, straight away, so a shift can never be lost. A wrong answer just means "the customer waits a moment"; **pay is never taken away.** Five right in a row earns a tip.
- **Job levels.** Every job gains XP. Job levels unlock:
  - A harder task type
  - A badge
  - Items on that job's shelf in the store (uniforms and tools)
- **Unlock ladder (by reading level).** One job every 2 levels. Future jobs continue the ladder (level 14, 16, and so on). A locked job shows "Opens at level N" and never a padlock he can't understand.

| Reading level | Job opens |
|---|---|
| 2 | 🛒 Shopkeeper |
| 4 | 🌱 Lawn mower |
| 6 | 🧹 Janitor |
| 8 | 📬 Mail carrier |
| 10 | 🧁 Baker |
| 12 | 🏗️ Construction worker |

- **Name clash.** The Gem Mine already has daily "Mine jobs". Rename their panel to **"Mine tasks"**; the save field `mine.jobs` stays as it is.

### Base jobs (6)
| Job | Reading | Subject skill | Task kits used |
|---|---|---|---|
| 🛒 Shopkeeper | Read the customer's order | Count items, add prices, make change (money) | pick, pad |
| 🧹 Janitor | Read the bin labels and the note on the mop spot | Sort recycling, compost and trash (science) | sort, pick |
| 🏗️ Construction worker | Follow the blueprint ("put 3 red bricks on top") | Measuring, shapes, simple machines | order, build, pad |
| 🌱 Lawn mower / gardener | Directions ("mow 4 left, then 2 up") | Counting rows, then area in squares, then the plant life cycle | path, pad |
| 📬 Mail carrier | Names and street words | House numbers (place value), alphabetical order | pick, order, path |
| 🧁 Baker | Recipe steps in order | Sequencing, ½ and ¼ cups (fractions), time | order, pick |

Next wave, each one config only: vet (reuses Animal Care), farmer, firefighter, librarian (reuses Books), scientist, pilot (the rocket).

The janitor's sorting, the construction worker's measuring, and the shapes used on blueprints use the same Math track levels as Geometry mode, but the jobs stay a separate mode.

### Built for easy expansion
Two layers:

1. **Task kits** (code, rarely added). These are generic interaction widgets. Each one renders a question, sets `dataset.ans` and calls `done(ok)` exactly once, with the same double-tap guard pattern as `Read.pic`:
   - `pick`: tap the right thing.
   - `pad`: a big number pad.
   - `order`: put steps in order.
   - `sort`: drag into bins.
   - `path`: tap arrows or tiles.
   - `build`: wraps `Read.build`.
2. **Jobs and tasks** (data). Adding a job means adding one object. There is no new UI code unless it needs a new kit.

```js
// JS
Jobs.register({
  id:"shop", name:"Shopkeeper", icon:"🛒", uniform:"apron", unlock:{tier:2},
  pay:{perTask:3, streakTip:5},
  tasks:[
    {kit:"pick", track:"reading", gen:lvl=>{const w=Read.word();
      return {say:`Can I have a ${w.w}?`, text:`A ${w.w}, please!`, choices:Read.others(w,3), ans:w.w};}},
    {kit:"pad", track:"math", minGrade:"1", gen:lvl=>{const a=1+rnd(5),b=1+rnd(5);
      return {say:`${a} apples and ${b} pears. How many things?`, ans:a+b};}},
  ]
});
```
```ts
// TypeScript equivalent
type Kit = "pick" | "pad" | "order" | "sort" | "path" | "build";
interface JobTask { kit: Kit; track: string; minGrade?: string; minTier?: number;
  gen: (lvl: { tier: number; grade: string }) => Question; }
interface Job { id: string; name: string; icon: string; uniform?: string;
  unlock: { tier: number };
  pay: { perTask: number; streakTip: number }; tasks: JobTask[]; }
declare const Jobs: { register(j: Job): void; start(id: string): void; };
```

**Best practices kept:**
- Kits own the UI. Jobs own only content.
- Every generator is pure and can take a seed, so tests can replay it.
- Unknown `kit` or `track` values are skipped with a console warning, never a crash.

### Save fields
Added through `def()` and `migrate()`, never renaming anything that exists:
```js
jobs:{current:null, xp:{}, tasks:0}, tracks:{}, placement:null,
wallet:{shapes:0, gears:0}, owned:{}, placed:[], hero:"Asher"
```
- `tracks[id]` holds `{level, stats:{}}`, using the same shape as `stats` so the report code can be shared.
- 💎 stays in `state.gems`.
- 🪙 is **`state.mine.coins`**: the Mine and Jobs share one coin purse, so nothing is migrated.
- If `state.mine` doesn't exist yet, `migrate()` creates the purse on its own, so Jobs don't need the Mine to have been opened.

### Tests
- **`jobs_e2e.js`**
  - Loops over **every registered job × every task**, answers using `dataset.ans`, and asserts:
    - pay is added exactly once
    - a double tap is ignored
    - a wrong answer takes nothing away
    - no console errors
  - Decode-checks every text a generator can produce at that task's `minTier`.
  - Because it walks the registry, a new job gets tested with no new test code.
- **`tracks_e2e.js`:** runs 200 seeds per math level and checks the answers are correct (for example, `ans` is in `choices` and the arithmetic is right).
- **`levels2_e2e.js`:** checks that every word in levels 13–24 resolves in `Phonics`, has a voice clip, and that Decode gives it the right level.

---

## Part D — Currencies and the Trading Post (first draft, four currencies; dropped)
**Kept for:** the decorations idea and the store item schema. The two-shelf store in v10.1 replaces it.

### Four currencies, one per mode
| Currency | Earned in | Buys (its shelf) |
|---|---|---|
| 💎 Gems | Reading (crates, books, Wilds, races) | Outfits for the hero and the buddy (the hats move here) |
| 🪙 Coins | Jobs and the Gem Mine (one purse) | Job uniforms and tools |
| 🔷 Shape stars | Geometry | Valley decorations: fences, paths, lamps, statues, building paint |
| ⚙️ Gears | Physics | Vehicle paint and parts, and special pets |

- **Exchange booth.** Fixed rates, always: **1 💎 = 5 🪙 = 5 🔷 = 5 ⚙️**. It only swaps in whole bundles of 5, so the math stays clean. Each swap shows the sum ("10 🪙 → 2 💎").
- **Never taken away.** Prices only go up with item quality, not over time. There is no selling, no loss and no fee.

### The Trading Post
- **Where it is.** A building in the valley that he walks into (an `Adv.provide` spot near the Job board), plus a HUD button with the four balances.
- **Launch catalog:** about **15 items per shelf** (roughly 60 in total, plus the existing hats), priced from 5 to 80. The art comes from OpenMoji and Fluent Emoji, which are already embedded, plus the game's own drawings.
- **Four shelves,** one per currency (table above). A **"New!"** badge marks items added in each release.
- **Folded in:**
  - The **wardrobe hats**: the same `state.hats`, now shown on the 💎 shelf.
  - The **Mine's cosmetic hats**: now on the 🪙 shelf.
  - Everything already owned stays owned.
- **Stays where it is:** blueprints (a crate reward and part of the building game) and the Mine pick shop (gameplay upgrades).
- **Data-driven,** so adding an item is one entry:
  ```js
  Store.item({id:"cape_red", shelf:"outfit", cost:{gems:12}, art:"cape_red", tag:"new"});
  ```
  ```ts
  interface StoreItem { id: string; shelf: "outfit"|"uniform"|"decor"|"vehicle"; cost: Partial<Record<"gems"|"coins"|"shapes"|"gears", number>>;
    art: string; unlock?: { job?: string; jobLevel?: number; tier?: number }; tag?: "new"; }
  ```
- **Placing decorations.** A decoration he buys, and every build he finishes in Geometry, goes into `state.placed`. He places it on the valley grid with the existing build-mode placement, so no new placement code is needed.
- **Tests (`store_e2e.js`):**
  - Buying charges the right purse exactly once, even on a double tap.
  - He can't go negative.
  - Exchange sums are right.
  - Items owned before the upgrade are still owned after `migrate()`.

## Part E — Geometry mode: Block builder
**Trigger:** the Jobs data shows math holds his attention.

A Minecraft-style grid workshop, separate from Jobs. He opens it from a **Workshop** building in the valley and the mode bar.

- **How it plays.** A blueprint asks for something ("build a house with a square floor and a triangle roof"). He **picks a shape in the palette, then taps cells** to place it; tapping a placed shape rotates it. Arrows and space do the same on a keyboard. The instructions are spoken, and any text on screen is decode-checked at his reading level.
- **Levels** are independent and earned with the 85% rule and Fast track. They pay 🔷.

| Level | Grade | Blueprint skill |
|---|---|---|
| G1 | K | Name circle, square, triangle, rectangle; match the shape to its hole |
| G2 | K | Hexagon, oval; count sides and corners |
| G3 | 1 | Put shapes together (2 triangles make a square); halves and quarters |
| G4 | 1 | 3D blocks: cube, cone, cylinder, sphere, and which ones stack or roll |
| G5 | 2 | Sort shapes by sides and angles; rows and columns (arrays) |
| G6 | 2 | Make equal shares; tell pentagon and hexagon apart; partition rectangles |
| G7 | 3 | Area by counting squares (the floor of the house) |
| G8 | 3 | Perimeter (the fence around the pen); rectangles with the same area but a different shape |
| G9 | 3 | Quadrilaterals: square, rectangle, rhombus, trapezoid |
| G10 | 4 | Lines: parallel and perpendicular; right, acute and obtuse angles |
| G11 | 4 | Line symmetry: finish the mirror half of the castle |
| G12 | 4 | Measure angles in degrees, and turns of 90°, 180° and 360° |

- **Finished builds become valley decorations** (Part D). Each one keeps the blueprint's name ("Asher's triangle tower").
- **Engine.** The grid and shapes are drawn as SVG, the same approach as the existing art, so no library is needed. Shapes are defined as polygon vertex lists, so area, perimeter, symmetry and angles are all computed from the same data, and the tests can check every blueprint has a solution.
- **Tests (`geo_e2e.js`):** every blueprint at every level can be solved using `dataset.ans`, pays 🔷 once, and has no errors. The generators pass 200 seeds.

## Part F — Physics mode: Contraption lab
**Trigger:** the Jobs data shows math holds his attention, and Geometry has shipped.

A separate mode opened from a **Lab** building. The contraptions he's proudest of are saved in the Lab so he can replay them.

- **How it plays: predict → watch → explain.**
  1. **Predict.** He sees a setup, for example a ball at the top of a ramp and a target, and a question: "Will the ball reach the flag?" He picks one of 2–3 answers.
  2. **Run.** The simulation plays.
  3. **Explain.** A short spoken reason: "Steeper ramps make things go faster."

  Later levels become puzzles: place 1–3 parts (a ramp, spring, lever or magnet) to hit the target. A wrong prediction still gets its explanation and still pays a little (never zero).
- **Topics in the first version** (all four chosen):

| Level | Grade | Topic |
|---|---|---|
| P1 | K | Pushes and pulls: a bigger push goes farther |
| P2 | K–1 | Gravity: things fall down; steeper ramps are faster |
| P3 | 1 | Bounce: rubber vs. rock, and springs |
| P4 | 1–2 | Friction: ice, grass and sand paths |
| P5 | 2 | Balance and levers: the seesaw, and where to push |
| P6 | 2–3 | Pulleys: lifting heavy things with less pull |
| P7 | 2–3 | Magnets: which things stick; pull through paper |
| P8 | 3–4 | Floating and sinking: heavy for its size |
| P9 | 3–4 | Chain reactions: combine two parts from above |

- Pays ⚙️.
- **Engine.** A small custom 2D engine of about 300 lines, with no libraries (the offline rule):
  - Circles, boxes and line segments (ramps).
  - Semi-implicit Euler at a **fixed 1/60 s step**, so the same setup always gives the same result, on any device and in the tests.
  - Friction and bounce values for each material.
  - Magnets are a simple pull within a radius. Levers are a pivot joint. Water is a buoyancy zone.
- **Best practice.** The prediction options are computed by running the simulation headless first, so the "right" answer is always what actually happens on screen.
- **Tests (`lab_e2e.js`):** every level's setup gives the same outcome 3 runs in a row; the answer marked right matches what the headless run produced; each puzzle has a known solution; pay is added once.

## Part G2 — Build-a-hero avatar
**Trigger:** he asks to look like himself on screen, or the public copy gets regular players.
- **Replaces the fox fallback.** An uploaded photo can still be used as the face on a badge, but the hero on screen is a drawn character.
- **He designs it** in a first-run screen, and can change it any time for free from the Trading Post's outfit shelf:
  - Skin tone (6)
  - Hair style (6) and hair colour (6)
  - Eye colour (4)
  - Shirt and trousers colour
- **Drawing.** It's layered SVG using the same inline approach as the buddy art. The body parts are separate groups so the walking animation keeps working. Outfits (hat, cape, shirt, uniform) are layers on top, with the same anchor points as the hats.
- **Where it appears:** Adventure, storybook pages (it replaces `avatar()` / the fox), Races, and the Jobs uniform preview.
- **Saves.** Stored as `state.heroLook`, for example `{skin:2, hair:1, hairC:3, eyes:0, shirt:"#3A7BD5", pants:"#2A2A2A"}`. Old saves get a default look, and their photo is kept.
- **Tests:** every combination renders without errors, and the chosen look shows in Adventure and on a book page.

## Part H — Balancing modes
- The daily quests draw from every unlocked mode ("serve 3 customers", "build a triangle roof", "make the ball bounce over the wall"). Trying 3 different modes in a day earns a bonus.
- There are no hard gates. Reading stays the core because it unlocks the jobs and pays for outfits.
- The Grown-up report gets a tab for each mode (level, accuracy, time spent) and a ledger of what was earned and spent.

