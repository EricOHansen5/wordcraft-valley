# Roadmap v10+: reading to 4th grade, other subjects, and Jobs

Status: **plan only, nothing built yet.** It is written against `app/index.html` as of v9.2.1 (`MAX_TIER=12`, 235 words of which 59 are tricky (♥), and the `Read`, `Skills`, `Decode`, `Pace` and `Adv.provide` / `hookCrit` / `hookVeh` modules).

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
- **Starting a shift.** A **Job board** stands in the valley (an `Adv.provide` spot) and there is a button in the mode bar. He picks a job, puts on its uniform (the existing hats and wardrobe), and starts a **shift**: 5 tasks, about 3–5 minutes.
- **Tasks.** Each task mixes reading with one subject at his current level in each.
- **Paycheck.** Coins for completed tasks convert to gems. A wrong answer just means "the customer waits a moment"; **pay is never taken away.** A perfect shift earns a tip bonus.
- **Job levels.** Every job gains XP. Job levels unlock:
  - A new tool (for example, a faster mower)
  - A harder task type
  - A badge
  - A cosmetic in the valley (for example, his shop gets an awning)
- **Switching jobs.** He can switch at any time. `state.jobs.current` remembers the last one.

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
  id:"shop", name:"Shopkeeper", icon:"🛒", hat:"apron", unlock:{tier:1},
  pay:{perTask:3, perfectBonus:5},
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
interface Job { id: string; name: string; icon: string; hat?: string;
  unlock: { tier?: number; jobLevel?: { job: string; lvl: number } };
  pay: { perTask: number; perfectBonus: number }; tasks: JobTask[]; }
declare const Jobs: { register(j: Job): void; start(id: string): void; };
```

**Best practices kept:**
- Kits own the UI. Jobs own only content.
- Every generator is pure and can take a seed, so tests can replay it.
- Unknown `kit` or `track` values are skipped with a console warning, never a crash.

### Save fields
Added through `def()` and `migrate()`, never renaming anything that exists:
```js
jobs:{current:null, xp:{}, shifts:0, coins:0}, tracks:{}, placement:null
```
`tracks[id]` holds `{level, stats:{}}`, using the same shape as `stats` so the report code can be shared.

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

## Build order
Each phase follows the usual workflow: tests, voice clips, `npm run release`, a `design.md` section, then deploy.

| Phase | Ships | Why first |
|---|---|---|
| **v10.0** | Jobs engine and 6 kits; Shopkeeper, Janitor, Lawn mower; math track K–1; the content-file loader | Something new for him right away, using the reading levels he already has |
| **v10.1** | Mail carrier, Baker, Construction; math grade 2; Jobs and Math in the report | Finishes the base jobs |
| **v11** | Placement check; reading levels 13–16 (grade 2); sentence fluency | His next reading step |
| **v12** | Levels 17–20 (grade 3); multiplication and fractions; science track | |
| **v13** | Levels 21–24 (grade 4); passages with main idea and inference; next-wave jobs | Long horizon: he's 6 |

## Risks
- **Size and memory on the older iPad.** Load content per phase from JSON, and keep art as OpenMoji or Fluent Emoji references.
- **Abstract words have no pictures.** Use meaning-pick and fill-the-blank instead.
- **Microphone scoring for fluency is unreliable offline.** Time taps and self-paced reads instead of scoring speech.
- **Grade 3–4 content for a 6-year-old.** Keep the level gates earned (the 85% rule). Fast track only speeds them up; it never skips mastery.

## Decisions needed
1. Split new content into `app/content/*.json` (recommended), or keep one file?
2. Job pay in **gems** (simple), or a new **coin** currency that is also used for money math (recommended: coins that convert to gems)?
3. Subject priority after reading: Math → Science → Social studies (recommended)?
4. Jobs open from the start, or unlocked by reading level (recommended: 3 jobs open at once, the rest unlock with levels)?
