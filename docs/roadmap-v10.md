# Roadmap v10+: reading to 4th grade, other subjects, and Jobs

Status: **plan only, nothing built yet.** Decisions made so far are listed at the end. It is written against `app/index.html` as of v9.2.1 (`MAX_TIER=12`, 235 words of which 59 are tricky (♥), and the `Read`, `Skills`, `Decode`, `Pace` and `Adv.provide` / `hookCrit` / `hookVeh` modules).

## Where we are
- **Levels 1–12** cover kindergarten to the end of 1st grade: short vowels, then digraphs, blends, silent e, bossy r, vowel teams, two-part words, -ing/-ed, soft c/g and y, compound words, silent letters and contractions.
- **Subjects:** reading only.
- **Modes:** Adventure, Wilds, Mine, Races, Books and the others. Each one is an IIFE module that plugs into the valley through `Adv.provide` (a spot on the map) or a hook (an action when he walks up to an animal or vehicle).

---

## Part A — Reading levels 13–24 (grades 2–4)

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

## Part C — Jobs mode

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

## Part D — Currencies and the Trading Post

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

## Part G — The hero's name (Grown-up setting)
- Grown-up menu → Settings → **Hero name**, defaulting to **"Asher"**. It replaces "Ash" in the storybooks, Adventure, My Own Book, cut-scenes and voice lines. This rename is part of the first phase.
- **Saves.** It is stored as `state.hero`, and `migrate()` adds `"Asher"` to old saves.
- **Books.** The book text stores a placeholder (`{hero}`) instead of the name.
- **Decode.** The hero's name is always treated as a level-1 word, because children read their own name early. That keeps the books at levels 1–5 decodable.
- **Voice.** Clips are generated for the default "Asher" lines. If a parent types a different name, those lines fall back to the device voice, and a note in Settings says so.
- **Tests:** a book page shows the name; changing the name updates the page; the decode check passes with any name.

## Part H — Balancing modes
- The daily quests draw from every unlocked mode ("serve 3 customers", "build a triangle roof", "make the ball bounce over the wall"). Trying 3 different modes in a day earns a bonus.
- There are no hard gates. Reading stays the core because it unlocks the jobs and pays for outfits.
- The Grown-up report gets a tab for each mode (level, accuracy, time spent) and a ledger of what was earned and spent.

---

## Build order
Each phase follows the usual workflow: tests, voice clips, `npm run release`, a `design.md` section, then deploy.

| Phase | Ships |
|---|---|
| **v10.0** | Hero name setting; the four currencies and `wallet`; exchange booth; Trading Post with the four shelves (hats and Mine hats moved in); placing decorations; renaming "Mine jobs" to "Mine tasks" |
| **v10.1** | Jobs engine and the 6 kits; Shopkeeper (level 2) and Lawn mower (level 4); math track K–1; the content-file loader |
| **v10.2** | Janitor, Mail carrier, Baker, Construction; math grade 2; daily quests across modes |
| **v11.0** | Geometry block builder, G1–G6 (K–2); builds become decorations |
| **v11.1** | Geometry G7–G12 (grades 3–4) |
| **v12.0** | Physics engine and Contraption lab, P1–P5 |
| **v12.1** | Physics P6–P9; the report tabs for every mode |
| **v13** | Placement check; reading levels 13–16 (grade 2); sentence fluency |
| **v14–15** | Reading levels 17–24 (grades 3–4); passages; math grades 3–4; science track; next-wave jobs |

## Risks
- **Size and memory on the older iPad.** Load content per phase from JSON, and keep art as OpenMoji or Fluent Emoji references.
- **Abstract words have no pictures.** Use meaning-pick and fill-the-blank instead.
- **Microphone scoring for fluency is unreliable offline.** Time taps and self-paced reads instead of scoring speech.
- **Physics on the older iPad.** Keep scenes under 30 bodies and pause the simulation when the app is hidden.
- **Too many currencies for a 6-year-old.** Each shelf shows only its own currency, and the exchange booth appears only once he has earned 2 kinds.
- **Grade 3–4 content for a 6-year-old.** Keep the level gates earned (the 85% rule). Fast track only speeds them up; it never skips mastery.

## Decisions made
| Topic | Choice |
|---|---|
| Content storage | New content in `app/content/*.json`, cached by the service worker |
| Job pay | 🪙 coins, which convert to gems |
| Subject order | Math → Science → Social studies |
| Currencies | One per mode (💎 🪙 🔷 ⚙️), fixed exchange of 1 = 5 |
| Store | Walk-in Trading Post plus a HUD button; hats and Mine cosmetics moved in; blueprints and the pick shop stay where they are |
| Store shelves | Outfits, uniforms and tools, decorations, vehicles and pets |
| Store pricing | Each shelf priced in its own mode's currency |
| Job unlocks | Reading-level ladder: 2, 4, 6, 8, 10, 12, and so on |
| Shift length | Endless, until he clocks out |
| Geometry | Block builder; pick a shape, then tap to place |
| Physics | Contraption lab (predict → watch → explain); all four topic groups |
| Level gating | Geometry and Physics levels are independent and read aloud |
| Creations | Placed in the valley; contraptions saved in the Lab |
| Balance | Daily quests mix the modes; no hard gates |
| Build order | Store → Jobs → Geometry → Physics → reading 13+ |
| Hero name | Set by a parent, default "Asher" |
