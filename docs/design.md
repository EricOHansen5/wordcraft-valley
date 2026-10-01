# Wordcraft Valley — Game Design Doc (v0.1)

**Player:** 6-year-old, currently sounding out CVC words (cat, dog).
**Platform:** iPad (web app first, native wrapper later).
**Core promise:** *Every word he reads becomes something he builds.* Reading is never a gate that stops the fun — it **is** the fun.

---

> **Reading this doc:** sections 1–10 are the original v0.1 plan (JSON packs, TypeScript, Vite, Phaser, React overlays, Dexie). None of that was built. The game is one self-contained `app/index.html`; the build as it actually stands starts at section 11, and every version since has its own section below it.

## 1. The Fantasy

He arrives in an empty valley with a small companion creature (his "Grub"). Everything in the valley — blocks, trees, animals, tools, doors, new lands — is sleeping inside **Word Crates**. Reading the word on a crate wakes it up and puts it in his hands. Build enough, and new areas of the valley open up to explore.

Three familiar pulls, one original world:

| Pull he already loves | How it shows up here |
|---|---|
| Build & place blocks | Grid-based world building; his creations persist |
| Collect & grow creatures | His Grub and valley animals evolve as he reads more |
| Explore & unlock areas | Bridges, gates, caves open when he reads the sign |

> **Creature Pack (parent-supplied):** The game ships with original creatures. Creature identity is a data pack — a folder of PNGs plus a `creatures.json` — so you can drop in whatever he's obsessed with (currently: Pokémon) on your local network. The game never bundles or distributes third-party assets; it just loads whatever is in the pack folder.
>
> **Reading note:** creature names like "Charmander" are far above CVC level. Use them as *rewards* (the crate you open by reading "fire" or "red" reveals the creature), not as decoding targets. Seeing his favorite pop out after reading a simple word is the motivational hook.

---

## 2. Core Loop (60–90 seconds)

1. **Pick a crate** floating in the Supply Cloud. Each shows a picture hint (faded) and a word.
2. **Sound it out.** Letters are large tiles. Tap a letter → hear its *sound* (not its name). Swipe left-to-right across the tiles → letters blend audibly ("c…a…t… cat!").
3. **Say it / tap it.** He taps the matching picture from 3 choices (later: types it, later still: reads it with no picture).
4. **Crate pops open** → block/creature/tool lands in his hotbar.
5. **Build.** Tap to place in his world. Placing is unlimited and free — the reward is immediate and tactile.

Every 5–8 crates: a **Sign Post** appears with a short sentence ("The dog is on the log."). Reading it opens a gate to a new patch of land.

---

## 3. Reading Progression (Content Ladder)

Adaptive — the game advances him when he's ~85% accurate on the current tier and eases back when he struggles. Tiers are **data, not code** (see §7), so they can be re-ordered to match his school's phonics sequence.

| Tier | Skill | Example crates |
|---|---|---|
| 0 | Letter sounds (warm-up only) | s, a, t, m |
| 1 | CVC – short a, o | cat, log, pot, map |
| 2 | CVC – short i, e, u | pig, bed, sun, hut |
| 3 | Digraphs | ship, fish, chop, path |
| 4 | Blends | frog, tent, sand, crab |
| 5 | Magic-e | cake, bike, rope, cube |
| 6 | Common sight words in sentences | the, is, on, and, a |
| 7 | Two-word commands | "dig down", "jump up" |
| 8 | Full sentences on signs | "The frog is on the log." |

**Spaced repetition:** missed words come back as "Lost Crates" 3, 10, and 30 crates later, worth a bonus gem.

**Reading with purpose (Tier 7+):** his Grub takes short written commands — "sit", "run", "dig", "jump". Reading becomes a *control scheme*, which is the strongest motivation lever for a Minecraft/Zelda kid.

---

## 4. World & Build Systems

- **Grid world**, top-down 2.5D (like a diorama). Blocks: grass, dirt, stone, wood, water, sand, flowers, fence, door, torch, path.
- **Zones** unlock by reading signs: Meadow → Pond → Forest → Cave → Snow Peak → Beach. Each zone introduces its own block set and animals (and, quietly, its own phonics tier).
- **Animals** (from crates) wander and react — pig, dog, frog, fish, bat, crab. Feeding an animal = reading its food word ("corn", "bug").
- **Grub evolution:** 4 stages, triggered by total words read (25 / 75 / 150 / 300). Visible growth = visible progress he can feel. If a Creature Pack is loaded, evolution stages map to an `evolvesTo` chain in `creatures.json`.
- **Creature Pack schema** (`/packs/creatures-custom/creatures.json`):
  ```json
  { "id": "c001", "name": "…", "sprite": "c001.png", "cry": "c001.mp3",
    "unlockWord": "red", "tier": 1, "rarity": "rare", "evolvesTo": "c002" }
  ```
  `unlockWord` ties each creature to a decodable word at his level. Rarity controls how often the crate appears — favorites should be rare enough to stay exciting.
- **Photo Mode:** one-tap snapshot of his build to send to a parent. Showing off is a huge motivator at this age.

---

## 5. Keeping It Fun, Not Frustrating

- **No fail state.** Wrong tap → the letters gently wiggle and blend again. Two misses → the picture brightens as a hint. Never a red X, buzzer, or "try again" text.
- **Ear button** always available: hear the word read aloud. Using it still opens the crate (worth 1 gem instead of 3). He should never feel stuck.
- **Session pacing:** 12–15 minute natural arcs; Grub yawns and "goes to sleep" as a soft stopping cue. Optional parent-set timer.
- **Audio-first, Dad's voice:** every letter sound, word, and sentence plays back in *your* recorded voice (see Parent Mode → Voice Studio). TTS is only the fallback for words you haven't recorded yet. Phoneme sounds must be *pure* ("mmm", not "muh") — the Voice Studio shows a tip card per sound.
- **Art direction — soft hand-drawn:** watercolor-wash backgrounds, thick soft outlines, slightly wobbly shapes, warm palette. Blocks read as "painted wooden toys" rather than voxels. Sprites at 2x for Retina; keep the set small and consistent.
- **Big touch targets** (≥ 72 pt), landscape iPad, one-handed reachable hotbar.
- **Juice:** crates pop with confetti, blocks thud when placed, animals squeak. Reward the *reading moment*, not just the build.

---

## 6. Parent Mode (behind a 3-second hold + simple math gate)

- Progress: words mastered per tier, accuracy trend, streaks.
- **Custom word lists**: paste his school's weekly words; they become crates in the next session.
- Toggle picture hints on/off, adjust tier manually, set session timer.
- Export/import save (JSON) for a new device.
- **Voice Studio:** a checklist of every phoneme, word, and sign sentence in the loaded packs. Tap → record (MediaRecorder API) → auto-trim silence → play back → accept. Shows what's still un-recorded; batch mode lets you knock out 60 words in ~10 minutes. Clips are stored as blobs in IndexedDB and included in the export.
- **Creature Pack loader:** point at a folder on the local network (or drag-drop a zip); validates `creatures.json` and previews sprites.

---

## 7. Expandability (built in from day one)

Everything content-related lives in JSON packs, so v2+ needs no code changes for new material:

```
/packs
  /phonics-core/        words.json (tier, word, phonemes, audio, picture, unlocks)
  /zone-meadow/         blocks.json, animals.json, signs.json
  /zone-pond/           ...
  /custom-school-week3/ words.json (from Parent Mode)
```

Future packs that fit the same schema:
- **Math Valley** — crates unlocked by counting/simple sums
- **Spell-to-Build** — type the word instead of picking the picture
- **Story Signs** — 3–4 sentence mini-stories that unlock cutscenes
- **Multiplayer visit** — share a world code so a cousin can visit his valley

---

## 8. Recommended Tech (when you're ready to build)

| Layer | Choice | Why |
|---|---|---|
| Runtime | Web app (PWA), landscape-locked | Zero App Store friction for v1; add to home screen, works offline |
| Language | TypeScript + Vite | Matches your stack; fast iteration |
| Rendering | Phaser 3 (or PixiJS) | Sprites, tilemaps, tweens, touch input out of the box |
| UI overlays | React (Parent Mode, menus) | Reuse your Fluent/React patterns |
| Audio | Pre-recorded MP3s per phoneme/word; Web Speech API fallback for custom words | Consistency of phoneme sounds matters more than convenience |
| Persistence | IndexedDB (Dexie) | World grid + progress; export to JSON |
| Native later | Capacitor wrap → App Store | Same codebase, adds haptics and better audio latency |

**v1 scope (buildable in a weekend):** Meadow zone, Tiers 1–3 (~60 words), 10 block types, 3 animals, Grub stage 1→2, Parent Mode word-list import. Everything else is a pack.

---

## 9. Starting Word Set (until school list arrives)

Standard synthetic-phonics order, chosen so every word maps to a buildable/visible thing:

- **Tier 1 (short a, o):** cat, hat, mat, bat, map, cap, pan, log, dog, pot, hop, mop, rock*, top, box*
- **Tier 2 (short i, e, u):** pig, dig, bin, fin, lid, bed, hen, pen, net, web, sun, bug, hut, mud, cup
- **Tier 3 (digraphs):** ship, shop, fish, dish, chip, chop, path, moth, bath, duck*, sock*

\* "ck/x" are introduced early because the objects are irresistible and the spelling is consistent.

Swap in the school's list any time via Parent Mode; unmastered words carry over.

## 10. Open Questions

1. **School phonics sequence** — reorders Tiers 1–3 when you have it.
2. **Which creatures first?** His top ~10 are enough for v1; more can be added to the pack later.
3. **Ready to build v1?** Scope: Meadow zone, Tiers 1–3, 10 blocks, 3 animals, Grub 1→2, Voice Studio, Creature Pack loader.

---

## 11. Where the build stands (v3, Sept 18 2026)

### Review of v2 — what was holding it back
- **Reading was recognition only.** Picking a picture is where reading starts, not where it ends. Nothing asked him to segment a word or read without a crutch, so "mastered" meant "matched a picture twice."
- **Content ceiling too low.** Three tiers (~40 words) is a couple of weeks for a motivated six-year-old; nothing beyond digraphs.
- **No reason to come back tomorrow.** Gems and plans are a fine loop inside a session, but nothing framed a day or celebrated finishing one.
- **The buddy was a portrait.** The single most bond-able element in a kids' game sat in a corner as an icon.
- **Cold start.** A new player got a valley and a crate button with no guidance — fine for an adult, a wall for a six-year-old.
- **Progress invisible to the child.** Only the parent tab showed mastery.

### What v3 adds
| Area | Change |
|---|---|
| **Reading ladder** | Every word climbs three rungs: **Find it** (picture) → **Build it** (tap sound tiles into slots, with one distractor) → **Read it** (no picture, read aloud). Mastery = top of the ladder. Sticker dots show the rung. |
| **Content** | Tier 4 blends (frog, crab, drum, flag, nest, tent, plum, truck, tree, grass, snow, stone) and Tier 5 magic-e (cake, bike, rope, kite, bone, gate, lake, well, bell) with split-digraph tiles (`a_e`) and matching art. 61 words. |
| **Read aloud** | Optional microphone mode on Read-it words via the device recogniser. A miss costs nothing; a hit pays a bonus. Off by default. |
| **Daily quests** | Three per day (always one reading quest), treasure chest pays 20 gems + a plan or animal. Badge on the dock. |
| **Buddy in the valley** | Sprout walks to what you build, cheers on every read, chats in a speech bubble, wanders when idle. Tap to talk. |
| **Coach tour** | Six steps that wait for the real action (open crate → read → open plans → build → place → use). Skippable; replayable from the parent menu. |
| **Sticker book** | Album now leads with words: every reachable word, greyed until seen, gold with a star when mastered. |
| **Session recap** | Words read, words mastered, best streak, things built — shown when the play timer ends, or from the parent menu. |
| **Nature ambience** | Synthesised wind, birds by day, crickets at night. No assets to download; toggle in settings. |
| **Crate beat** | The box rattles before the reward bursts out. Small, but it is the moment. |

### v3.1 (same day)
| Area | Change |
|---|---|
| **Guardians & cut-scenes** | Each land has a keeper (Tilly the Snail, Pip the Heron, Old Owl, Snowy). When a land opens the keeper wakes in a two-line typed cut-scene, then stands in the valley. |
| **Story books** | Every keeper holds a four-page book of decodable connected sentences with art. Tap-word audio, a gem per page, 10 gems + a badge for finishing. Meadow's book opens when the tour ends. |
| **Sound-swap crates** | From Tier 2, one crate in four is "change one sound": the target slot is highlighted, the new word is shown only as a picture, three sound options. Pairs are derived automatically from the word list (cat→hat, ship→shop, bat→bath). |
| **Badges** | 15 achievements in a third sticker-book tab with a pop-up when earned. |
| **Parent** | Last-7-days reading bar chart; "Export words to practise" downloads shaky / unseen / mastered lists as text. |

### v3.2 — fierce fauna
| Area | Change |
|---|---|
| **Creatures redrawn** | All 10 redrawn mid-action: open mouths, bared teeth, angled brows, claws, bodies tilted into a lunge. Sprites face left and flip when moving right. |
| **Six new beasts** | Wolf, bear, raptor (forest); hawk, T. rex, dragon (peak). Rarity weighting: common 6 / rare 2 / legendary 1, with a glow on the rare ones. |
| **Behaviour** | `kind` drives AI — hunters stalk and pounce, prey bolt, flyers swoop, brawlers roar in place. Dust puffs, dash-skew, pounce arc, shouted ROAR!/SKREE! labels. |
| **Voices** | 16 synthesised cries (growl/howl/hiss/screech/croak…). Tapping an animal roars, shouts its name, and shakes the screen for rare ones. |
| **Words** | wolf, hawk, claw added, with the `aw` sound in the Voice Studio. |

### v3.3 — seasons, new challenges, sharing
| Area | Change |
|---|---|
| **Seasons** | Device date picks Harvest / Snow / Blossom / Sunny Days. Each brings a palette tint, its own particles (falling leaves, snow, petals, drifting seeds), a free one-off build with its own behaviour (pumpkin patch pays a daily harvest; snowman makes a flurry; blossom tree attracts nesting birds; sandcastle has a crab), and **double gems** on five in-season words. |
| **Listen-and-pick** | New rung-0 variant: hear the word, choose it from three look-alikes *in print* (cat / bat / cap). Sound → print with no picture. Derived from the same minimal-pair engine as sound-swap. |
| **Sentence scramble** | "Story crates" from Tier 3: a sign's words are shuffled and put back in order. Wrong words bounce back, the first word is placed after two misses. 6 gems and counts every word toward the daily total. |
| **Postcard** | Camera button composes the live valley into a 1400×800 SVG — backdrop, every building/creature/guardian in z-order, a footer with words read, mastered, animals, date and season — rasterises to PNG and opens the iOS share sheet (SVG download as fallback). |
| **Wardrobe** | Six hats (flower, cap, party, pirate, wizard, crown) bought with gems and worn everywhere the buddy appears: world, HUD, coach, recap, postcard. |
| **Badges** | +3: Story teller, Dressed up, In season (18 total). |

### v3.4 — real creature artwork
The hand-drawn creatures had genuine defects (a periscope-necked wolf, a detached
fish tail, an owl standing in for a hawk). Replaced with **OpenMoji** (openmoji.org,
CC BY-SA 4.0): consistent, ink-outlined, and a match for the valley's look.

- 25 creature/guardian drawings embedded inline, each normalised from its source box to the game's 100×100 grid.
- Right-facing art (crocodile, snail) mirrored at build time so every creature starts facing left and the world's flip-on-move logic stays correct.
- Roster grown 16 → **20**: crocodile and shark (pond), boar and tiger (forest), lion (peak); the weak lizard-raptor dropped.
- Guardians now use the same set: snail, flamingo, owl, polar bear ("Snowy the Polar Bear").
- Two new cries (snap, chomp) with SNAP!/CHOMP! shout labels.
- New words: croc, snail (plus the `ai` sound in the Voice Studio).
- Attribution in the grown-up menu. **Note:** CC BY-SA 4.0 is share-alike — fine for
  the local-network use this was built for; if it were ever distributed, the artwork's
  licence would need to be honoured (or swapped for Twemoji, CC-BY 4.0, which is
  attribution-only and was the runner-up on looks).

### v3.5 — real letter sounds
The device-voice fallback for letter sounds tried to stretch sounds by repeating
letters ("sss", "mmmm"). Good voices read that as letter names ("ess ess ess"),
which is exactly what phonics teaching avoids. Replaced with a built-in
**phonics synthesizer** (Web Audio, offline, no assets):

- Vowels, m, n, l, r, w, y are a voice-like buzz shaped by the right mouth
  resonances (formants); long vowels glide (ay, eye, oh).
- s, sh, f, th, h, z, v are filtered hiss in each sound's own frequency band.
- p, t, k, b, d, g are short bursts coloured by where the mouth closes, with no
  trailing "uh"; ch and j are a stop released into "sh"; x is k+s, qu is k+w.
- Every sound used by the word list and every letter a–z is covered, including
  vowel teams and split digraphs (a_e, ee, oo, aw …). Custom words are covered too.
- Verified offline: vowel resonances within tolerance of their targets, hisses in
  their bands, p/k/t spectrally distinct, per-sound loudness matched, no clipping.
- Priority is unchanged: a parent's Voice Studio recording always wins; the device
  voice now only reads whole words and sentences.

Fixes found while building it: an envelope bug that let a burst of full-volume
noise through at the start of every p/t/k/ch/j; the output compressor's automatic
make-up gain (removed); "whale" now builds as wh / a-e / l. On iPad, game audio is
set to play even with the ringer switch on silent (Safari 16.4+).

### v3.6 — vehicles (for Asher)
- **27 vehicles** (OpenMoji art, same ink style as the animals): car, taxi, van, bus, pickup,
  bike, scooter, skateboard, tractor, fire truck, police car, ambulance, truck, jeep, motorbike,
  canoe, sailboat, speedboat, train, big rig, helicopter, ship, race car, sled, plane, rocket, UFO.
  Common / rare / legendary, spread across the four lands.
- **They move like vehicles**: road traffic drives along the rows with exhaust puffs, the train
  runs end to end trailing smoke, aircraft fly above everything, boats bob, the sled slides.
- **Every one has a tap stunt and a sound**: horns and a big-rig air horn, three different
  sirens with flashing lights (fire truck sprays water), tractor putt-putt, race car zooms the
  whole valley, motorbike wheelie, skateboard kickflip, train whistle, helicopter lift-off,
  plane fly-by, UFO beam-and-teleport. Then it says its name.
- **Rocket**: spoken "Three, two, one, blast off!" countdown, launch, and landing.
- **Reading unlocks them**: reading van, cab, bus, jet, car, jeep, truck, ship, bike, sled,
  boat, train, rocket or plane gives you that vehicle. Crates flag these ("unlocks a vehicle!").
  New words: van, cab (Tier 1); sled, rocket (Tier 4); car, jeep, boat, train, plane (Tier 5),
  with the new "ar" sound in the synthesizer. Six vehicle story sentences.
- **Garage** (early plan) rolls out a new vehicle every few minutes; **Launch pad** (Snow Peak)
  launches the rocket; the market sometimes trades for a vehicle; crates can drop one.
- Garage tab in the sticker book, two vehicle quests, five badges (First wheels, Traffic jam,
  Rescue team, Blast off!, Whole fleet), a starter car for every valley.
- Picture choices can no longer show two identical pictures (jet/plane, or two "?" cards).

### v3.7 — upgrades instead of duplicates, and room to breathe
**One of each, levelled up.** Buildings, animals and vehicles are one-of-a-kind in the
valley. Getting a second one levels up the one you have: Level 1 → ★ → ★★ gold (a repeat of
something already gold pays 5 gems). Each level is bigger and has a glow underneath and stars
above; upgraded buildings also get bunting, and gold ones a star on top.

**Building upgrades take reading.** In Building plans, an owned building shows "Upgrade to ★".
★ costs gems plus *building a word* from its sounds; ★★ gold costs more gems plus *putting a
story in order*. Gems are only taken once the reading is done; "Later" cancels for free.
Upgrades do things: timers shorten (×0.6, ×0.35) and payouts grow (×1.7, ×2.6) for the well,
windmill, pumpkin patch, garage, bird house, cottage; the market gets cheaper (15 → 12 → 9);
the feed shed brings friends after fewer feeds; a ★ bell calls the vehicles too; a gold garage
only rolls out rare vehicles.

**Animals and vehicles** level up from repeats, or from the sticker book ("Level up · N gems"
plus the same reading challenge).

**Not crowded any more.**
- Only so many are out at once — animals up to 8, vehicles up to 6, fewer while the valley is
  still small. The rest rest in the sticker book; tap a resting one to bring it out.
- Nothing on the ground stops on top of a building, guardian, the buddy, or another animal
  or vehicle — each keeps a clear spot either side (aircraft fly over). Blocked vehicles
  turn around. Measured in a real browser: zero too-close pairs over 15 s of play.
- Animals and vehicles are drawn slightly smaller; background scenery is thinner and kept
  off buildings.
- Old crowded saves are tidied on load: doubles fold into levels, extras rest.

**Fixes found on the way:** seasonal plans (Pumpkin patch, Snowman…) never appeared in the
shop, and a placed seasonal build was deleted on the next load — both fixed. The rocket could
be driven off the launch pad before lift-off — fixed.

### v3.8 — more spelling crates
- Any word can now open as a **spelling crate** ("Build it": hear the word, tap its sounds in
  order), not only words that have climbed to that rung. Previously this was rare early on.
- Grown-up setting **Spelling crates**: Some (~35%) / Lots (~60%, default) / Almost all (~90%)
  of word crates. Measured: 37% / 62% / 90%.
- Spelling crates are blue and show one empty box per sound instead of the word, so it can't
  be copied; they pay a bonus gem for a clean spell.
- Read-it words still come up as Read it often enough to be mastered; the first-run tour still
  starts with finding the picture.
- Fixed: the cottage's bonus crate could crash if it drew a sound-swap or story crate.

### v3.9 — smaller objects, taps that land where you aim
- Everything in the valley (buildings, animals, vehicles, guardians, buddy, scenery) draws at
  **80%** of its previous size (`OBJ_SCALE`). The empty placement spots keep their old size.
- **Taps only count on what you can see.** Each picture sits in an invisible square box; those
  boxes used to catch taps on their see-through corners, so a building's empty corner could
  steal a tap meant for the car behind it. Now only painted shapes catch taps, plus a solid pad
  over the middle of each body so thin drawings (bike, flamingo) are still easy to hit.
- Measured in Chromium on the same scene: badly overlapping object pairs 6 → 1; taps that
  landed on a *different* object than the one under the finger 14% → 0%.
- Fixed: after press-and-hold to pick up a building, the next tap (to put it down) was
  swallowed. Real mouse-click tests now pass for every object type, hold-to-move and placing.

### v4.0 — tricky words, harder levels, install on the home screen
- **Tricky words (♥):** 27 common words that can't be fully sounded out (said, the, was, come…). The tricky part of each word shows on a heart tile, and a silent e shows faded. Words with no picture use listen-and-pick.
- **Tiers 6–8:** bossy r (star, fork, bird, surf); vowel teams (rain, boat, cloud, cow); two-part words (sun·set, pic·nic, rab·bit) with a gap between the parts. The synth gained the or, er and ou sounds, and tiers unlock automatically as he masters earlier ones.
- **Installable app:** a `wordcraft-valley-app/` folder containing index.html, manifest, a service worker (offline, stale-while-revalidate, versioned cache) and icons.
- **Full backup:** Export now includes his progress plus every Voice Studio recording and word-pack picture, all in one JSON file. Import also accepts old save-only files. This is how progress moves from Safari into the home-screen app, which has its own storage.

### v4.1 — every object has its own move
- **Animals:** each of the 20 has a signature move. Examples:
  - The dog plays fetch, the fox dives into the ground and pops up elsewhere, and the cat chases yarn then naps.
  - The hen lays an egg that hatches, the pig rolls in mud, ducklings follow the duck, and the frog catches a fly.
  - The fish splashes, the beetle flips and boings, the bat pings sonar, the croc chomps, and the shark's fin circles.
  - The wolf howls and the pack answers, bees chase the bear, the boar charges through the row, and the tiger crouches and pounces.
  - The hawk dive-bombs, the lion's roar blows everyone back, the T. rex stomps until the whole valley jumps, and the dragon breathes fire.
  - Each still says its name afterwards, which is the reading payoff.
- **Vehicles:** no two share a move any more.
  - The taxi gives an animal a ride, and the bus takes three ("All aboard!").
  - The van delivers a present, the pickup bounces its hay, the truck reverses with beeps and dumps its load, and the jeep goes off-road through mud.
  - The scooter zips with a rainbow trail, the sailboat catches the wind, and the ship blasts its horn under seagulls.
- **Scenery:** trees drop apples, pines drop pinecones or snow, flowers release butterflies, grass hides crickets, and bushes hide berries and bunnies. Rocks hide bugs and sometimes a gem, mushrooms boing, water has fish, logs hide squirrels, snow makes a snowman, and crystals chime. While a building is being placed, taps go through the scenery.
- **Gifts:** eggs, truffles, honey, a beetle's rolled gem, the van's present and gems under rocks. Each is small and waits 5 minutes before it can come again, so reading stays the main way to earn gems.
- New daily quest: "Find 5 surprises in trees, rocks and flowers".

### v4.2 — three new lands and much more to unlock
- **New lands after Snow Peak:** Sandy Shore, Jungle and Volcano Island. Each has its own colours, scenery (palms, shells, coral, ferns, hibiscus, flames, cacti) and a guardian with a storybook:
  - Shelly the Sea Turtle (Sandy Shore)
  - Mango the Orangutan (Jungle)
  - Doodle the Dodo (Volcano Island)
- **21 new animals, each with its own move:**
  - Earlier lands: rabbit (zig-zag hops), raccoon (rummages), penguin (belly slide), mammoth (trumpets and shakes snow loose).
  - Sandy Shore: crab, lobster, seal, octopus, dolphin, whale.
  - Jungle: monkey, parrot, sloth, snake, elephant, gorilla (chest pounds and bananas rain down).
  - Volcano Island: lizard (changes colour), scorpion, rhino, eagle, Longneck.
  - The parrot repeats the last word he read.
- **13 new vehicles:**
  - Construction vehicles drawn in the OpenMoji style, with moving parts: digger (the arm digs), dump truck (the bed tips), bulldozer (the blade pushes), cement mixer (the drum spins), crane (the hook lowers), monster truck (jumps and crushes).
  - Also: tram, cable car, submarine (dives), tuk-tuk, monorail, bullet train, space shuttle (countdown).
  - New words unlock vehicles: sub, tram, dump, crane.
- **8 new buildings:**
  - Sandy Shore: lighthouse (the beam calls boats in), castle (fanfare and fireworks), treasure chest (read a word to open it).
  - Jungle: tiki hut (drums, and everyone dances), roller coaster.
  - Volcano Island: volcano (erupts and gems rain down), block mine (dig dirt, stone, gold and diamonds), dino nest (an egg hatches into a dinosaur).
- **6 new hats:** top hat, ninja band, cowboy hat, explorer hat, knight helmet, space helmet.
- Shout text has a full outline so it reads on snow and sand.

### v4.3 — the valley comes alive
- **Evolution:** when the buddy reaches a new stage, a full-screen scene plays. He reads a word to help it evolve, the buddy flashes between its old and new forms, and the new form is revealed with its name.
- **Word bubbles:** tapping an animal or vehicle sometimes shows its action word ("hop", "dig", "snap", "chug"). Tapping the bubble sounds out each letter, then the whole word. Bubbles only show words at or below his current level, and there is a new daily quest: "Read 3 word bubbles".
- **Friendships:** some pairs react to each other. The fox sniffs after the hen, the dog chases the cat, the gorilla answers the monkey, the seal cheers the penguin, and Longneck runs from the T. rex.
- **Day and night:** hens, ducks, monkeys and other day animals sleep after dark ("Shh! The hen is asleep"). Bats, wolves, foxes and other night animals are busier and can leave a moonlight gem.
- **Power-ups:** ★ and ★★ animals and vehicles add a star burst. A ★★ dragon lights every lantern, a levelled-up bus carries more passengers, and a levelled-up taxi carries two.

### v5.0 — the Gem Mine
The playtest verdict: Asher was bored with unlocking things and speeding through the reading, and asked for a mining and shop game where he can see his own character walking around. So the valley gets a second mode.

- **His miner:** he designs the character, choosing skin, hair style and colour, shirt, pants and a hat. More hats (cowboy, knight, crown, space) are bought with coins.
- **Controls:** a thumb joystick on the left, and Dig and Jump buttons on the right. Push toward a block and hold Dig to break it. Push up against a wall to climb. He steps up single blocks automatically, and the ⬆️ elevator returns him to the surface.
- **The world:** a side-view mine 120 blocks deep with Minecraft-style blocky textures. The layers are Dirt, Stone Cave, Deep Rock, Lava Land and Crystal Core, each harder to dig than the last. There are caves, lava pools and treasure chests, and it gets darker the deeper he goes, with his lamp lighting the way.
- **Ores:** coal rock, tin rock, red gem, gold bar, blue gem, green gem, pink gem and star gem. Deeper ores are worth more.
- **The loop:** dig until the backpack is full, sell at his shop, and spend the coins at the pick shop. It sells better picks (stone, iron, gold, diamond, laser drill), bigger backpacks, brighter lamps, lava boots and bigger shops (more customers, bigger tips). "New mine" refills the tunnels.
- **Reading he can't speed through:**
  - At his shop, his valley animals come in with written orders ("I want two red gems", "Can I have a gold bar and a blue gem, please?"). The orders get harder as his reading level rises. He has to read the order to give the right things. After a wrong answer, a Hear it button appears and he can tap words to hear them.
  - Word stones glow in the rock. Breaking one means reading its word and tapping the matching picture, with look-alike pictures kept apart. That gives a magic gem.
  - Each correct order and word stone also counts toward his buddy's growth.
- **Links to the valley:** every order served also earns 1 💎 for the valley, and the new daily quests are "Serve 2 customers at your shop" and "Dig 20 blocks in the mine".
- **For the weekly report later:** the save records correct and wrong orders, the deepest dig and blocks dug.

### v5.1 — clearer letter sounds
- **Vowels were muffled.** The synth's voice source fell away about 10 dB per octave; a voice heard in the room falls about 6. Over 2–3 kHz that cost an extra 12–15 dB on the upper resonances that tell vowels apart, so "ee" and "i" drifted toward "oo", and short "a", "o" and "u" blurred together. The source now falls 6 dB per octave, and "a", "o", "oo" and "aw" have their own resonance balance. Measured against reference vowel spectra (Peterson & Barney), the average error dropped from 8.9 dB to 3.2 dB.
- **Loudness rebalanced** so every sound keeps its old level. The weak "v" and "th" were raised 3–4 dB. Every sound now sits within about 4 dB of the median, with no clipping.
- **Voiced th:** "the" and "they" now use a buzzy th (new sound "dh") instead of the breathy th in "thin".
- **Voice Studio recordings are found by sound, not spelling.** A recording of "uh" now also plays for the "e" in "the", and a recording of "l" also plays for "ll" and "le".

### v5.2 — mining fixes
- **Holding ⛏️ digs down and keeps going.** Before, the pick only dug down while the stick was held firmly down; on its own it dug sideways into open air. Now down is the default, the stick pushed clearly sideways digs sideways, and pushed up digs up. A sloppy diagonal thumb still counts as down. He slides into the hole automatically, even if he started standing across two blocks. Steady rate: about 2 blocks a second.
- **Digging up targeted the space around his head,** so it never worked. It now digs the block above.
- The "too hard" message names the pick to buy ("Buy the Iron pick at the pick shop").
- **Climbing out of a hole:** the climb now senses the wall from head to feet, not just at the waist, and at the top he steps onto the edge automatically. Before, he bobbed just under the lip. Out of a 12-deep shaft in about 4 seconds of holding the stick up.
- Safety: if the miner ever ends up inside rock, he pops up to open space and can't leave the world.

### v5.3 — pets, bosses and more to find in the Gem Mine
- **Pets:** any animal from his valley can come mining (tap 🐾). It follows him, floating through rock, and helps in its own way:
  - Dog, fox and wolf sniff out gems, which show as sparkles in the dark.
  - Bats and birds light up the dark.
  - The dragon and lizard melt lava.
  - Bears and other big animals help him dig faster, and sometimes land a double hit on a boss.
  - Small animals find more shiny gems and bigger chests.
- **Bosses:** a magic seal runs across the mine at the bottom of each layer, and a boss sits on it: Giant Beetle (10 deep), Rock Golem (35), Cave Troll (60), Lava Worm (85), Crystal Dragon (114).
  - Each hit is a reading question, alternating "read the word, tap its picture" with "look at the picture, tap its word" among look-alikes (cat / cab / cap).
  - He has three hearts. A miss shows the right answer and says the word.
  - Winning breaks the seal and pays coins, gems and a trophy. Losing sends him back up to try again.
  - Beating the Crystal Dragon is the ending: Master Miner and the Crystal crown.
- **Shiny ores:** about one ore in forty sparkles and is worth five times as much (more often with a lucky pet or charm).
- **Gem museum:** a new building in town with a case for every ore, a row for shiny ones (put one in for +25 coins) and the boss trophies. Finding all nine ores pays a bonus.
- **Workbench** (a tab in the pick shop): he reads a recipe card and puts the ingredients on the bench, with no picture hints until after a wrong try.
  - TNT: two coal rocks and a red gem.
  - Pet snack: two tin rocks.
  - Lucky charm: a gold bar and a green gem.
  - Gem map: a magic gem and a blue gem.
  - Gem crown: three gold bars and a star gem.
- **TNT:** tap 🧨 and after a 3-2-1 fuse it blasts a big round hole, collecting the ores inside.
- **Trickier orders:** from level 4 some orders make him think: "a gem that is not red", "a green gem or a blue gem".
- **VIP customers:** guardians come in with big orders, paying triple coins and 3 gems.
- **Reasons to come back tomorrow:**
  - Closing the shop announces who is coming tomorrow ("Tomorrow, Old Owl is coming…"), and that VIP is the first customer the next day.
  - Chests deep down can hold a mystery egg that hatches the next day into a rare animal for his valley.
  - Missing a day never costs him anything.
- **Voice Studio:** new lines to record in your own voice: "Thank you!", "Wow, a shiny gem!", "You beat the boss!", "Oh no! Try again!", "Here comes a big order!", "Your egg hatched!"
- **The town is wider** to fit the museum. Old saves keep everything owned, but the tunnels start fresh once.

### v6.0 — the reading upgrade
Built on what the research says works best for early readers: systematic phonics, reading whole decodable books, checking meaning, and practice aimed at each child's weak spots.
- **Sound skills engine:** every answer in the game (crates, spelling, word stones, boss fights) is traced to the sound patterns in the word — 25 skills from short a to two-part words.
  - A clean read strengthens each pattern in the word. A reply that took a hint counts for less.
  - Mistakes are pinned to the exact sound: tapping "cap" for "cat" marks t/p, and a misplaced spelling tile marks that position. A random wrong picture counts as a guess, not a mix-up.
- **Targeted practice:** most crate rows now include a 🎯 crate with a word that practises his shakiest pattern ("short i practice"), and bosses pick those words too.
- **Sound Shield (anti-speeding):** two fast wrong answers (under 0.9 s) within six turns switch the Shield on. The next answer stays locked until he taps every sound in the word. It works in crates, word stones and boss fights, and switches off once he has done it.
- **Read, then prove it:** on the top rung ("Read it"), "I read it!" waits about a second, then asks "Which one did you read?" with three pictures. A word only counts as mastered with that proof. Tricky words and words without a picture keep the old button.
- **Storybooks (📚 Books, in the valley and the mine):** 16 decodable books, two per level, starring Ash (his miner) and his pet.
  - Every word was checked by a script: each one uses only sounds taught up to that book's level, plus the tricky words for that level.
  - Books unlock with his level. The Books button shows NEW when one is waiting.
  - On each page he can tap any word to hear it sounded out, then blended. "I read it" unlocks only after enough time to read the page.
  - 🎤 **Read it to your pet:** he reads the page aloud, it is recorded, and his pet listens and hearts it. His recordings become his own audiobook (🎧).
  - After the story come 3–4 questions (picture, word or yes/no) to check meaning.
  - Stars: finished; every question right the first time; read every page aloud (or with almost no help if there is no microphone).
  - Rewards: first read pays 8–12 gems and 15 coins per level in the mine; rereads pay 2 gems. There is a new daily quest, "Read a storybook".
- **Picture it:** a crate type from level 2, and every third round of a boss fight. He reads a sentence ("The pig is in the pot.") and taps the matching scene out of three. The wrong scenes swap who is where, or change on / in / by / under, so every word matters. After a wrong pick the word that makes the difference is highlighted.
- **📊 Full reading report** (Grown-up menu → Progress), printable:
  - Next-step advice in plain words.
  - The sound-skill map (not yet / learning / needs practice / strong) and the letter mix-ups.
  - Minutes played and quick guesses per day, average answer time, and the share of meaning questions right.
  - Books with stars, and playback of his recordings.
  - Mine stats.
- **Play-time tracking:** a minute counts only while the app is visible and has been touched in the last 90 seconds.
- Recordings (`story:` blobs) are included in Backup.

### v6.0.1 — keyboard fixes in the mine
- Holding a move key while digging no longer cancels the dig. Key-repeat events used to reset the dig flag, which stopped digging with the ⛏️ button.
- Keys are read by physical key (`e.code`), so Shift or Caps Lock no longer breaks A/D.
- Keys: move with WASD or the arrow keys, jump with Space, and dig by holding J, K, X, E, Enter or Shift. A hint shows the first time a key is pressed.
- Held keys are released when the window loses focus, so the miner can't get stuck walking.

### v7.0 — Valley Adventure (the main mode becomes a world to explore)
The valley used to be a picture he decorated. Now it is also a place he walks around in, as the miner he designed. Crates, building, the mine and books are unchanged.
- **🧭 Adventure** (dock button, NEW badge until the first visit):
  - Ash walks the valley with a joystick. On a computer, use WASD or the arrow keys, and Space or E for the action.
  - His mine pet trots behind him, and the camera follows.
  - Walking up to anything shows one big action button: say hi to an animal, ride a vehicle, read with a guardian, use a building, or dig.
- **🌿 Word Wilds (tall grass):**
  - Four patches of tall grass grow in new places each day. Walking through them can startle out a wild animal. At night, night animals come out more.
  - Reading makes friends with it. Hearts fill with each right answer: 3 for common animals, 4 for rare, 5 for legendary.
  - The rounds rotate: read the word and tap its picture; look at the picture and pick its word from look-alikes; read a whole sentence and pick the matching scene (from level 2).
  - The final round is "call it by its name": he spells the animal's name with sound tiles, when that name is a word at his level.
  - Rounds favour words that practise his shaky sounds, and the Sound Shield still guards against guessing. Three misses and the animal runs back into the grass, and he can try again.
  - A new friend moves into his valley (so it can go mining as a pet). A repeat friend levels up the one he already has.
  - About 1 in 20 is ✨shiny✨: recoloured, sparkling, and it stays shiny in the valley.
- **📔 Word-Dex:** 41 animals.
  - Unseen ones show "?", ones he has met show a silhouette, and friends show their picture and name. Tap a friend to hear a short fact.
  - Every 5 friends pays +10 gems.
- **🗺️ Treasure hunts:** a note blows in, and 4 glowing landmarks appear around the valley. The landmarks are always things, never animals.
  - The note says which landmark to dig at. It gets harder with his level: "Hop to the log!" → "Dig at the log." → "Dig by the log." → "Dig by the log, not the rock."
  - Digging at the wrong one says "Read the note again" and highlights the word that matters. That miss is also recorded as a sound mix-up.
  - Three clues lead to the treasure. The first hunt each day gives a new animal plus gems (a bonus for no wrong digs); extra hunts give a few gems.
- **New daily quests:** "Make a wild animal your friend" and "Find a buried treasure".
- **Reading report:** now shows wild friends and hunts solved.

### v8.0 — levels 9–12, the story, notes from home, and more
- **Levels 9–12.** 56 new words with new pictures. Every tile uses the game's sound notation, so the synthesized letter sounds and your recordings work unchanged.
  - Level 9: endings -ing and -ed, shown split ("fish|ing").
  - Level 10: soft c and g (city, gem, page) and y as "ee" or "eye" (happy, fly).
  - Level 11: compound words (rainbow, snowman, sailboat), split into their two parts.
  - Level 12: silent letters (knot, write, phone, lamb) and contractions (can't, don't, it's, I'm).
  - New tricky words: there, where, were, two, want, could, would.
  - Six new sound skills appear in the report: endings, soft c/g, y, compound words, silent letters, contractions.
  - 8 new decodable books, two per level, bringing the total to 24. The book checker now knows these patterns too. It caught one level-6 book using "gem" (a soft g), which was reworded.
- **💌 Notes from home** (Grown-up menu → Notes).
  - You type a note, and each word is coloured as you type: green = he can read it, orange = a level or two above, red = not taught yet. The check uses the same rules as the books.
  - You can record it in your own voice.
  - It appears in Adventure as a glowing envelope. Your voice unlocks only after he taps "I read it". Then "I found it!" once he finds the real surprise you hid.
- **👻 The Letter Thief** — a story in six chapters, one per day, told as read-along pages. It starts at the ❗ ghost in Adventure.
  1. Find three glowing letter locks; each is unlocked by reading a word.
  2. The Reading Temple: three rooms of doors. Pick the right one by reading the clue: picture → word, word → picture, or a whole sentence → scene. A wrong door just puffs dust.
  3. More letter locks, this time needing whole sentences.
  4. A harder temple with four rooms.
  5. Break Gloom's spell by building words from their sounds.
  6. The boss: Gloom, with six hits needed. The rounds rotate word, look-alike, sentence and spelling.
  - Gloom turns out to be lonely and stays as a friend who tells jokes. Each chapter earns a letter of R-E-A-D, a key and a crown, plus gems.
- **✏️ My own book** (first card on the Books shelf).
  - He picks a picture and builds a sentence from word tiles: who & what (his animals and the words he has read most), doing, describing, and little words.
  - Only words at his level are offered.
  - Pages go on his shelf as a real book he can read to his pet and record.
- **✍️ Write it** (crate).
  - He hears a word, then writes it letter by letter with a finger or an Apple Pencil.
  - Each letter's guide fades as he gets better: solid letter with a start dot → dotted → from memory.
  - A letter counts when the ink covers at least 60% of the letter and no more than 35% of it falls outside.
  - The report lists the letters he writes from memory.
- **🍓 Animal care.** His animals get hungry each day, and a strawberry shows above the hungry ones. In Adventure, walk up and read what it wants ("I want fish!"), then pick that food from three foods. Nothing bad happens if he skips it.
- **🏁 Races.** Walk up to a car, truck or bike in Adventure to race two rivals.
  - The race stops at three word gates. A right answer gives a turbo boost; a miss means no boost, never a penalty.
  - Reading two or three gates right wins.
- **🏠 Home-server backup** (the `wordcraft-server/` folder).
  - A dependency-free Node server that serves the game and keeps backups, runnable in Docker on the Synology.
  - The game backs up about once a day and whenever the app goes to the background.
  - It keeps 60 snapshots plus the first of every month. Recordings are stored once each, by content, however many snapshots include them.
  - Optional token. Restore is in Settings.
- **New daily quests:** feed 3 animals, win a race, write a word.

### v8.1 — cleaner pictures, one game voice, and multi-device play
- **Pictures:** 44 of the everyday things the game used to draw in code now use **Fluent Emoji** (Microsoft, MIT licence). They include household words (hat, map, bed, sock, pan…), food, trees and mushrooms, the gem and book icons, and the cottage, statue, observatory and snowman buildings.
  - Each is drawn as an image inside a small SVG, so their colour gradients can't clash, and each sits on the same ground shadow as the rest of the valley.
  - Four things with no emoji were redrawn instead: mop, rope, bridge and launchpad (now with a Fluent rocket).
  - The mine, the animals (OpenMoji) and the barn, windmill and market drawings are unchanged.
- **One game voice:** about 1,800 lines were pre-recorded with the Kokoro neural voice "Heart", an open-source model that runs locally. They cover every word, book page and quiz question (for every pet), the story, signs, game lines, all picture sentences, names, and numbers 0–200.
  - Clips are 40 kbps mono MP3 in `voice/`, about 8 MB in total, looked up by the line's text.
  - Lines built from parts ("You mastered the word" + "fish") are joined from whole pieces, never word by word; anything too choppy falls back to the device voice.
  - Order of preference: your Voice Studio recording → the game voice → the device voice (for new text, such as a note you typed).
  - The clips live in their own offline cache, so new builds don't download them again. They are saved in the background the first time, or with Settings → Game voice → Save for offline.
- **Multi-device:** each device has its own id. After a session (at most every 5 minutes) the valley is backed up to the home server.
  - When he opens the game on another device that is behind, it asks: "You played on another device! Carry on from there?"
  - An automatic backup never replaces newer progress from another device, and a brand-new empty save is never uploaded.
- **Server:** text is sent gzip-compressed (the game file goes from 1.9 MB to 0.44 MB), and voice clips are marked as never changing so browsers cache them. There is a new `/api/head` endpoint.

### v9.0 — the Gem Mine comes alive
- **🧱 Build mode** (new button, or the B key; the number keys pick a block).
  - Dirt, stone and sand he digs go into his pockets (up to 99 each). A hotbar shows each block and how many he has.
  - Holding the button in build mode places the chosen block beside him, above him, or under his feet while jumping (so he can pillar up like in Minecraft).
  - Digging a placed block gives it back. Everything he builds is saved and is still there next time.
  - No building in town.
- **Ladders, torches and signs** are made at the workbench from new recipe cards he reads: one coal → four torches, one tin → four ladders, two coal → two signs. He starts with 4 ladders, 3 torches and 2 signs.
  - Ladders can be climbed up and down, and he can let go and hang on.
  - Torches light the dark: the darkness now has a real light hole for his lamp and every torch on screen, plus a warm glow.
  - Signs: he builds a sentence from word tiles at his level. When he walks past, it shows in a bubble, and "📖 Read the sign" reads it aloud. The mine has seven signs of its own with tips.
- **Falling sand:** small sand pockets fall when he digs under them. They are never placed over an open cave.
- **Cave life:**
  - Bats flit about and dodge him.
  - Green slimes hop, and landing on one bounces him high ("BOING!").
  - Moles pop out of a wall with a word riddle (a picture or a look-alike word) that pays coins and sometimes torches.
  - **One lost animal a day** hides somewhere in the mine. A HUD pill shows its depth and which way to go. Reading a sentence with it sends it home: it joins his valley and counts in the Word-Dex.
- **🔐 Word vaults:** purple-brick rooms at depths 20, 45, 72 and 100, each holding two chests and a big gem. The door opens with a reading challenge that gets harder with depth: picture → look-alike word → sentence → build the word. Vault walls can't be dug or blown up.
- **📋 Mine jobs:** three a day from ten kinds, such as dig 40 blocks, put up 5 torches, build with 15 blocks, answer a mole, rescue the lost animal, open a vault, find 5 gems, write a sign, bounce on a slime, or serve 3 customers. Each pays coins, with +3 💎 when all three are done.
- **Juice:** mined gems fly into his backpack.
- **Voice:** 10 new lines (the mine's signs and the recipe cards) were recorded in the game voice.

### Sharing it with friends and family

Asher's cousins and friends wanted to play, which needed a second kind of deploy. The home NAS
stays as it is. Alongside it, `app/` now publishes to Cloudflare (Workers static assets, the successor to Pages) as a plain static site —
a link anyone can open and add to their home screen, with HTTPS (so offline play and the
microphone work) and no account to make.

The public copy runs **no server**, and that is the design, not a shortcut. The game backs up to
whatever address it was loaded from, so a single shared server would put every family into one
snapshot store: it would offer one child another child's valley, and since each snapshot holds
his voice recordings and the backup routes are open by default, one family's audio would be
downloadable by another. With no `/api/*` to find, backup quietly switches itself off and every
recording stays on the device that made it.

So a friend gets the whole game — valley, mine, books, recording his own voice, races, pets, all
1791 voice clips — with their own separate progress, and no NAS backup. Their progress lives in
that one browser, so clearing website data loses it. Asher's backups on the NAS are untouched.
Steps and the reasoning are in [deploy.md](deploy.md).

### v9.0.1 — bug hunt
- **One reward per answer.** Quick double taps used to count twice in several places: building a word (take a tile out and put it back during the "well done" pause), Sound swap, story crates, the shared challenges (letter locks, moles, vaults, races, feeding, Gloom, the lost animal), Picture it, word stones and the shop's "Give it" button. A tap on a wrong picture straight after the right one also turned a right answer into "no boost" or a lost heart. Now the first right answer locks the question.
- **Storybook questions** no longer skip the next question (or pay the ending twice) after a double tap.
- **"Build the word" extras never sound like the word.** The extra tile could be `k` or `ck` for "cat", or `ea` for "tree", so a word he built correctly by ear counted as a mistake. Extras now always make a different sound and look different. Same for "call it by its name" in Word Wilds, the Gloom spell words and Sound swap.
- **The day starts at midnight at home.** Days were counted in UTC, so in California daily quests, animal snacks, mine jobs, eggs, the VIP customer and the daily chart all rolled over at 5 pm.
- **Vehicles can't freeze.** Closing the app in the middle of a stunt (a rocket launch, a delivery) saved the vehicle as "busy", and it never moved or answered a tap again. Stunts are cleared when the valley loads.
- **Older saves get every setting.** Saves from before nature sounds existed showed "Nature sounds" switched on in Parent mode, but the birds and wind never started. Missing settings now get their defaults.
- **A full backpack keeps the gem in the rock.** Digging a gem with a full backpack used to smash it. Now he's told to go and sell first, and the gem waits for him.
- **"🔊 Blend it" and "👂 Say the word" always say the word on screen.** A story crate rewired both buttons to read its sentence and never put them back, so after one, Blend (and, in Build it and Sound swap, Say the word) kept reading "The cat sat on a log." instead of his word. In Build it, Blend also sounded out the hidden tiles of the *previous* word. Now Blend sounds out exactly the tiles on screen (in Build it, what he has built so far) and then says the word they spell; Say the word always says the current word. `tests/buttons_e2e.js` checks both buttons on every rung after a story crate and after a long word.
- The game voice and the device voice no longer talk over each other.
- **Less battery use.** The wandering animals, vehicles and buddy used to rewrite the whole save every couple of seconds. Their spots are now saved every 30 seconds and whenever the app is put away.
- **Hunters pounce again.** Nobody may stand right next to another animal, so a hunter could never get "adjacent" to its prey and never pounced. Now it pounces from two steps away.
- **Treasure hunt:** a clue spot could land right on a note or the ghost's ❗, and then the button opened the note instead of digging, so that clue could never be dug. Clue spots and notes now keep apart.
- **The mine's lost animal** could hide inside a locked word vault (unreachable until the vault was opened) or right by its door, where the button offered the vault instead of the animal. It now always hides clear of locked vaults, and one already saved in a bad spot is moved.
- **Notes from home:** the level checker picks up a changed custom word list (after a restore, for example) straight away.
- The "this browser will not save progress" warning only shows when nothing can be saved (it also showed when the backup storage was working).

### v9.1 — Fast track: quick readers move on sooner
Every crate answer was already timed; now the time counts. A read that is right the first time **and** quick (not a lucky tap under 0.8 s) is a sign he knows the word, not just that he got it:
- **A quick, clean read counts double on the word's ladder,** so one read climbs a rung (Find it → Build it → Read it). "Quick" means within 4 s for picking a picture, 5 s for reading and proving it, and 2.5 s plus 1.2 s per sound for building it. Slower clean reads count once, as before, and mastering still takes a clean Read it.
- **A level he reads fluently opens the next one early.** The game keeps his last ten answers at each level; when eight are quick and clean, the next level needs a quarter of this level's words mastered (and 8 tries) instead of half (and 12). The 85% first-try rule still applies.
- **Crates lean toward new words.** Once a level is fluent, its words and any words he has mastered go to the back of the queue, so crates bring the new level's words instead of easy ones. The lost-crate reviews still come round.
- A "⚡ Speedy!" toast shows when a quick read moves a word up. The reading report says which levels are being fast-tracked.
- **Parent mode → Settings → Fast track** switches it off (it is on by default).

### v9.2 — his class's tricky words
The kindergarten tricky word checklist from his class is now part of level 1, his base level: one, all, were, two, from, here, three, was, there, the, when, he, a, word, she, blue, why, we, yellow, to, be, look, where, me, I, no, they, are, what, their, little, so, my, down, which, by, out, once, you, of, said, your, funny, says.
- 21 of them are new words. The other 23 were already tricky words, some at much later levels (were, there and where at 9, two at 10); they all moved down to level 1.
- Each word's tiles spell it, and the part that doesn't sound out is a ♥ heart tile to learn by heart ("o♥ n ce♥" in once, "s ay♥ s" in says). One new sound was added for this, the "wu" in one and once.
- **They come round steadily:** each set of crates has at most one heart word from the regular word rotation, so sounding-out practice isn't crowded out; all 44 come round within a few days of play.
- **They don't hold back level-ups:** levels open on sounding-out words only. Heart words are practised alongside but no longer have to be mastered first.
- The 17 checklist words that had no recording got one in the game voice (Kokoro "Heart", like the rest).
- `tests/checklist_e2e.js` checks every word is there, spells right, can be sounded out, and comes round in crates.

### v9.2.1 — version number
- The Grown-up menu shows the build under its title (e.g. "Version 2026-09-27a"): the date of the release plus a letter for each release that day. It is the same value as the service-worker `VERSION`, so when it changes the iPad has the new build.
- `npm run release` stamps both `sw.js` and `APP_VERSION` in `index.html`; `tests/version_check.js` fails if they differ.
- Treasure-hunt marks (and anything placed with `freePos`) are rounded before the "keep clear of notes" check, not after. Rounding could nudge a mark back onto a note (about 1 hunt in 60 near a note), where the note took the button and the mark couldn't be dug.

### v9.2.2 — small fixes
- The home server no longer crashes on a malformed request URL (e.g. `/%`); it answers 400 instead, and top-level error handlers keep it serving even if a future handler has a bug. **This is a `server/` change, so the NAS container needs a restart after `git pull`** — an `app/`-only change doesn't need one.
- Text a grown-up types — a note's message and "From", and the home-server address/token — is now escaped before it's shown, so it can never be read as live markup. Only the display changes: the reading-level check and the voice lookup still see the exact words typed.
- The note's Adventure button label ("💌 Note from …") is not escaped, because the button is filled with `textContent`, which is already literal. Escaping it showed "Mom &amp; Dad" on the button.
- `.gitattributes` now normalizes line endings to LF, and `tests/version_check.js` accepts either ending, so `npm test` passes on a Windows checkout with `core.autocrlf=true` too, not just on Linux CI.

### v9.3 — where the time goes
- **Grown-up menu → Full reading report** has a new section, **Where the time goes**, after the minutes chart: this week's minutes split into reading and writing against everything else, then a small 7-day chart for each thing he spent time in (Gem Mine, Reading words, Books, Adventure, Word Wilds, the valley itself...) with its minutes and how many times he opened it. Things he opened but never stayed in for a counted minute are listed on one line.
- Reading and writing means the word crates (and sound swaps, story crates), books, Picture it, signs, notes from home, The Letter Thief, Word Wilds, animal care, Write it and My own book. The word stones, vaults, moles and boss fights in the Mine count as reading; the digging counts as the Mine.
- It uses the same once-a-minute count as "minutes this week" (only while the app is on screen and touched in the last 90 s), which now also notes what was on top. Opening something counts once; closing and reopening it within 2 s (the crates, then the word he picked) is one visit. Both are kept for 60 days. Old saves start at zero, so this week adds up to less than "minutes this week" at first.
- Nothing else changed: the game looks and plays the same. Under the hood every mode now opens and closes in one place (`Modes` in `index.html`), which is what will let the game gate some modes later; nothing is gated yet. `tests/modes_e2e.js` covers it.
- **Saves are versioned and get their defaults in one place.** Every field the game keeps now has its default in one list (`def()` in `index.html`), and an older save is given whatever it is missing as it loads, instead of each part of the game filling in its own the first time it is used. Nothing visible changed, with one small fix: coins from a finished book now always reach the Gem Mine's purse, even before he has opened the Mine (the first books used to show "+15 🪙" and then drop the coins).
- **Old saves are converted once.** The old tidy-up (blocks from the building-block version become gems, doubles become upgrades) now runs once per save, with the same "Your old blocks became … gems" and "Tidied up!" messages as before, and the save remembers that it ran. Small repairs, like un-freezing a vehicle that was mid-stunt, still happen every time the valley loads. `tests/saves_e2e.js` loads real old saves from `tests/fixtures/` to check this.

- **A daily reading goal with a finish line.** A small ring on the HUD, "Today's reading", fills as he reads (the same reads the daily quests count) and a finished book fills it outright. When it fills, once a day: confetti, the ring turns gold, and the buddy says "That's your reading for today! The valley is yours." After that the words keep counting quietly and nothing asks for more. Missing the goal has no message and no cost. Grown-up menu → Settings → **Daily reading goal**: Off / 8 / 12 / 20 words, default 12. The report shows how many days this week the goal was reached. The quest chest still opens only when all three quests are done.
- **Heart words are checked again after they are learned.** A tricky (♥) word that he has mastered comes back once, 30 crates later, and once more 90 crates after that, as a pink ♥ crate ("remember this one? Listen and build it") that always opens at Build it, so he has to hear the word and put its sounds in order rather than just say he read it. A clean build passes; a slip puts the word back on the ordinary review queue for a few crates, and nothing is taken away or un-learned. Heart words mastered before this version get their first check too. The report shows "Tricky words kept: N of M" and which ones are being checked again soon.
- One new spoken line ("That's your reading for today! The valley is yours.") is in `tools/voice/voice_texts.json` and needs its clip generated; until then the device voice says it.

### v10.0 — more to read: five books a level, a hero name, a second story, a smoother blend
- **Levels 1–6 have five storybooks each** (42 books in all; the 24 old ones are unchanged). The 18 new ones are the same length as the old ones (7 pages) and every page passes the decode check at its level, with any pet the page can name. They lean on what he likes: a gorilla who bops logs, a Minecraft-style shed and grass-block steps, a lost chick on the king's crown, a stone man in the mine, a sparking storm bird, a troll who is only scared of the dark.
- **Two new kinds of book question.** *What happened first?* shows two pictures from the story and he taps the earlier one. *Which page said it?* shows a sentence from the book in a box with a 🔊 button (each word can be tapped) and he taps the picture it goes with. Every new book asks one of each plus one of the older kinds. As before, a miss costs nothing and the right answer glows after two misses.
- **The hero has a name.** Grown-up menu → Settings → **Hero name** (up to 16 letters, default Asher; blank goes back to Asher). Every book that used to say "Ash" now says the name, on the shelf, the cover, the pages and the questions, and in My Own Book's word bank and the grown-up report. Tapping the name in a book says it as one word. The game voice knows "Asher"; another name is read by the iPad voice. Accented names (Zoë, Chloé) and names with an apostrophe (D'Angelo) work.
- **A second story arc: The Sleepy Volcano.** It opens after The Letter Thief is finished, at reading level 3, one chapter a day: find the eggs Puff the dragon hid (a baby lizard hatches), find the big egg in Puff's den (the volcano plan), then build the three-word wake-up spell (a baby T. rex). Chapters 4–6 followed in v10.3 (see below) Each chapter waits for its reading level (3, 4, 5), and the story quest button says which. Where the time goes lists it under Story quests.
- **Sounding out sounds like talking.** Blend now plays the sounds as one connected stream (the next sound starts before the last one has faded) instead of one at a time with gaps, so "m-a-p" runs into "map". Stops (p, t, k, b, d, g) keep their burst. The tiles still light in order. If the audio can't be scheduled, it falls back to the old blend.
- **Help on the first miss.** When he taps a word that differs from the right one by exactly one sound, the buddy names both sounds ("That one has the sound /h/. This word has the sound /c/") while the tile lights, then blends. From level 5, when he tries a vowel team's other reading (ea, ow, oo, ou, ie…), the buddy says "That didn't sound like a word. Try the other sound for E A", the tile flips and plays the sound it makes in this word, once per word per session. Tricky words never get this hint. The second miss lights the right answer as before, and a miss still takes nothing away.
- **Voice clips.** Every spoken line has a clip again: 787 were generated on 28 Sept with the Kokoro model (the 18 new books' pages and questions, the 24 old books re-read with "Asher" instead of "Ash", Puff's story lines, and the 20 first-miss help lines, which spell letters as spaced capitals such as "E A"; worth a listen). The generator now skips clips already in `app/voice/`, so a fresh checkout only renders what is new.
- Under the hood: `tools/voice/extract.js` (`npm run voice:extract`) reads the game and adds any spoken line that is missing from `voice_texts.json`, which is now one line per entry so a diff shows what is new; `tests/voice_cov.js` fails if a book page or word has no entry. `tests/lib.js` is a shared helper for the Playwright suites. Each storybook is on its own line in `index.html`.

### v10.0, part two — reading together, reading again
- **Read with Dad.** The book shelf has a "👨‍👦 Read together" button. Tap it, then a book. The first time, a screen asks how to play, and the choice is kept (it can be changed from the book's cover): **Take turns**, where he reads a page and Dad reads the next, or **Echo**, where Dad reads each page first and he reads it after. Dad's pages show the text large with one "✓ Dad read it" tap; his pages are the normal page with a "🙋 Your turn!" label. The book pays the same gems and stars as a solo read, but only his pages count as reads for the quests and the daily goal. The cover gets a "Read with Dad" sticker, and the report says how many books were read together this week. Dad's pages aren't recorded for the pet; his still can be.
- **Read it again.** Once a storybook page's read has counted, a "🔁 Read it again" button appears beside "Next page". It shows the same words alone, large and with no picture, after a short spoken line, and he taps "✓ Done" when he has read them. The time is kept against the page's word count; a tap-through under a second or a walk-away over 90 seconds is dropped quietly. The first timed reread of a page each day pays +2 💎 on the page itself; later rereads that day pay nothing and say nothing. Nothing prompts him to use it, and it counts as no new read for quests or the goal. His own books have no button.
- **Grown-up report → Reading speed.** From those rereads only: for each level, the median words a minute of his last five rereads next to the five before (↑ ↓ ≈ at ten percent), the count this week, and "first week" while there is little to compare. Medians, so one odd page doesn't swing it, and a new level reads slower at first.
- Five new spoken lines have clips (the four Read with Dad lines and the Read it again line).

### v10.1 — Jobs: Shopkeeper and Lawn mower, and the Trading Post
- **A Job board.** The 💼 button next to 📜 📐 📖, and a 💼 JOBS signpost in Adventure. Each job shows its level, tasks done and pay. He picks a job, puts on its uniform (a badge on the job panel) and taps **⏰ Clock in**; a shift runs until **⏰ Clock out**, and survives closing the app. Every task pays 🪙 at once into the same purse the Gem Mine uses; five tasks right the first time in a row earn a tip; every five tasks there is a cheer and "Keep going, or clock out?". A wrong answer means "The customer waits a moment. Try again!", the same task stays, and after a second miss the answer glows. Nothing is ever taken away. Clocking in is free for now; the reading-ticket gate from the roadmap is deliberately not built until the "Where the time goes" data is in.
- **🛒 Shopkeeper** (opens at reading level 2). Every task starts with an order to read in his own words at his level ("Can I get a hat?", "Do you have a cup?"), then he taps the item among three pictures. Job levels add a count to 10 on a number pad (5 tasks), adding two small groups (15), and counting the customer's coins to 20¢ (30). "please" needs level 7 to decode, so orders don't use it yet. Pay 3 🪙, tip 5.
- **🌱 Lawn mower** (opens at reading level 4). Every task starts with a note to read ("Go 3 →, then 2 up.") and he drives the 🚜 over a small lawn with arrows, taps or the keys. Job levels add "How many squares did you mow?", adding the two runs, and rows × columns as an array (4 + 4 + 4). "right" and "mow" only decode at level 7, so until then the notes use arrows with the number and the words up, down, go and then. Pay 4 🪙, tip 6.
- **Job levels and badges.** Levels at 5, 15, 30 and 50 tasks; each from level 2 up adds a badge to the sticker book (8 in all).
- **Math at his level, read aloud.** A small K–1 math track generates every question from a seed: counting to 10 and 20, more or fewer, adding and taking away within 10, adding within 20, and coins. Questions are spoken from short fixed phrases plus the numbers, so his reading level never holds the math back. Only what the two jobs need is used so far; the report does not show math stats yet.
- **"Mine jobs" is now "Mine tasks"** in the Gem Mine, so the word job means the Job board.
- **The Trading Post.** A 🏪 button in the dock showing both purses ("💎 12 · 🪙 40"), and a market stall in Adventure. Two shelves: **💎 Outfits** holds the twelve buddy hats at their old prices plus six new ones (bunny ears, beanie, sunglasses, chef hat, hero cap, dragon horns); **🪙 Gear** holds the Mine's helmets at their old prices plus a Viking and a Diamond helmet, and job gear that opens by job level: the apron and garden gloves (level 2) and the price scanner and hedge clippers (level 3). Buying takes the price once and puts the item on; when he is short it says "Almost! 3 more 🪙." and takes nothing. Everything he owned before is still his: the sticker-book Wardrobe and the Mine's clothes tent now show what he owns with "Get more at the Trading Post 🏪" instead of Buy buttons. Blueprints and the Mine's pick shop are unchanged.
- **🔄 Swap.** Once he has held gems and coins at the same time, a third tab swaps 1 💎 = 5 🪙 both ways in whole bundles of five, always showing the sum ("10 🪙 → 2 💎"). Odd coins get "Coins swap in fives." and nothing moves.
- **Voice.** About 45 new lines have clips: the job lines, the item names and the pieces the store's sums are spoken from ("Almost!", "3", "more coins"). A sum above 200 uses the device voice.

### v10.3 — Looks and holidays, part one: the Closet and Halloween
- **Looks.** A look is a set of pieces he earns and can wear over the valley: props at fixed spots, a tint over the season's, particles, a trim on the HUD and crates, and a hat on the buddy. Nothing is sold; each holiday's mini-game hands out its look one piece at a time. The **🎨 Closet** button (after 📐) lists "Valley" and every look: one with pieces shows "N of 4 pieces" and can be worn with one tap on any day of the year (Halloween in March is allowed); one with nothing earned is greyed with "Earn it at Halloween 🎃". Taking it off brings the season and his wardrobe hat back. A dot on the button marks a new piece.
- **The Halloween look**, in the order earned: two smiling jack-o'-lanterns that glow at dusk, a friendly ghost waving from its own pine, bats crossing the sky, and a witch hat for the buddy. While it is on, the tint turns dusk orange-purple, the HUD gets an orange wash with a striped trim, and plain crates get a purple edge and a 🎃.
- **The Sleepy Volcano is complete.** Chapters 4–6 open at reading levels 5, 6 and 6, one a day as before: *The Last Eggs* (find the hawk eggs the bang rolled down the hill; a hawk joins the valley), *The Egg of Puff* (a harder den with four rooms; 15 💎 on a bed of gems) and *The Big Burst* (build star, corn and bird to wake the hill; it rains 20 💎 and a baby dragon hatches and stays). The ending tells why Puff hid the eggs: a long nap, a lost egg and no one to hug. Every line decodes at its chapter's level, which is why two titles changed from the plan. The report's chapter count no longer says "more to come" once an arc is complete.
- **Trick-or-Read, 15–31 October.** In the window a 🎃 button appears (never a gate). Ten doors with jack-o'-lanterns show up on his buildings in Adventure (a little house and trees fill in if he has fewer). Walking up and pressing the action button knocks; one of his own animals in a costume (witch hat, sheet ghost, cape or mask) opens and asks him to read: a word pick or a picture pick, and from level 3 a sentence at every third door. A right read pays 2 🪙 as candy and closes the door; a miss is "Ooh, try again!", the same question stays, and the second miss makes the answer glow. Nothing is taken away. Ten doors make a night: "Happy Halloween! Ten doors, ten treats!", confetti, and one piece of the Halloween look. One finished night a day; the doors open again tomorrow. Every read counts toward the daily goal.
- Two fixes after 29c: a Trick-or-Read door can no longer land on a building in a crowded valley (the placement kept clear of buildings only for its first tries), and the JOBS signpost no longer starts in the bottom-left corner of Adventure, where the touch joystick sits; it also keeps clear of the Trading Post stall.
- **One idea of uniform.** A job's own uniform is still free at clock-in. Once he owns the matching Trading Post uniform (the apron, the garden gloves) the Job board shows that instead, on the clock-in screen and in the shift header; the job's tool (the price scanner, the hedge clippers) sits beside it and brings the streak tip one task sooner (four in a row instead of five), announced once per shift: "Your price scanner is ready! Tips come sooner." The store's cards say where each is used.
- **Grown-up report → Math at the jobs.** After Reading speed: one row per kind of question he has answered in a shift (count to 10 and 20, more or fewer, add and take away within 10, add within 20, coins, rows and columns), right the first time out of answered, this week and in all. Quiet until he has taken a shift.

### v10.3, part two — Thanksgiving and the winter holidays
- **The Thanksgiving look**, 15 November to Thanksgiving Day, earned in this order: a corn-and-leaf garland on a fence, a lattice pie steaming on a stump, falling maple leaves, and a pilgrim hat for the buddy. Worn, it gives an amber tint, a rust-and-gold HUD trim, and crates with a brown edge and a 🦃.
- **The Feast table**, from a 🦃 button that shows only in the window. A long table with ten empty plates; each round is Picture it with a food word at his level (egg, nut, fish, chip, plum, cake, corn and more as he levels up; at level 1 the table is set with pots, pans and cups). A right read puts the dish on the next plate and pays 2 🪙; a miss is "Not that one, try again!" with the same question staying and a glow after the second miss. Ten dishes fill the table: every animal he has comes to sit behind it, the buddy says "Thank you for the feast!", and one piece of the look is earned. One table a day. Dishes count toward the daily goal.

### v10.3.1 — fitted to the iPad
- The iPad 9th generation (1024×768 landscape, 768×1024 portrait) is the main screen. A survey of 94 screens in five viewports (`tools/viewport-survey.js`, screenshots and an audit of small targets, overflow and off-screen buttons) drove these changes: the tool bar fits on one row in landscape even with a holiday button (the four big buttons stack their picture over their label; the tools are 58×64) and wraps to more rows in portrait and on phones instead of scrolling; every sheet keeps its header, tabs and close or Done button on screen with the list scrolling inside; Picture it keeps its three pictures on one row; book covers shrink to the screen; the child's buttons are at least 44 px and the common ones 56; the Adventure top bar sits under the HUD wherever the status bar puts it, and the joystick and action button moved down so they cover less of the front row; the Write it pad grows to 420 px; the Job board's pictures grow to 48 px on a tablet; the phone HUD uses two rows. Grown-up-only controls behind the gate are unchanged.

### v10.4 — the Factory (from Lean Mine)
- **A Factory building.** Every save gets the plan once ("Free plan: Factory — it's in your plans 📐"); building it costs 10 💎 like the seasonal plans. Tapping it opens the Factory, and in Adventure it is a 🏭 spot to walk up to.
- **How it plays.** A 12×9 board with coloured rock spots (🔴 🔵 🟡), grey rocks and a delivery truck. He puts a drill on a rock, drags a belt with his finger to the truck (it turns at corners; a tap turns a belt), and presses ▶. Rocks glide along the belts; the truck hops when an ordered rock arrives and the tally board fills a ten-frame so the counting is visible. Backed-up belts glow orange, then red, and the buddy gives a kid-sized lean tip: "The drills are waiting. The belt is full! Try a splitter.", "Lots of rocks waiting in line!", "That's a long trip! Can the belt be shorter?" Keyboard: arrows, Space, R, E, Enter.
- **Twelve levels, one machine at a time.** F1 drill and belt (send 5 🔴), F2 belts around rocks, F3 two drills, F4 the **mixer** (red + blue = purple, blue + yellow = green, red + yellow = orange), F5 all three, F6 the **splitter** that fixes a jam, F7 practice, F8 the **colour sorter**, F9 sorter and mixer, F10 the **stamper** that turns two rocks into a toy, F11 the **tunnel** under another belt, F12 the big order. Every order card is read aloud ("Send 3 purple and 2 orange"), and each level ends with the sum on the number pad ("3 purple + 2 orange = ?") through the math track, so it shows in the report's math block. A wrong sum: "The tally board can help!", the board glows, nothing is taken away.
- **Stars and pay.** ⭐ order met, ⭐⭐ no belt went red, ⭐⭐⭐ within the piece budget. The first finish of a level pays 5 💎 and each new star 1 💎; stars only add; a replay with nothing new pays nothing and says so kindly. At most 96 💎 from the levels.
- **My own factory.** After F12, a 16×12 sandbox with every machine, saved as he builds. Side orders pay 3–6 💎 each, at most five a day; deliveries alone pay nothing, and it runs only while it is open.
- **Under the hood.** Lean Mine's fixed-step engine, ported to plain JS: a typed-array grid, 30 ticks a second with no clock or randomness, one hand-off rule, so a layout always does the same thing on the iPad and in the tests. `tests/factory_engine.js` runs every level's stored solution three times and checks each machine; `tests/factory_e2e.js` plays it on the board. Built ahead of its roadmap trigger at Eric's request.
- Treasure marks and free spots (the quest giver, notes from home) can no longer land on a building in a crowded valley: the random search used to drop its building check after a while, which CI caught about one hunt in sixty. The spread between marks relaxes instead, and a clear front-row spot is the last resort.
- **Nature sounds are half as frequent.** A bird chirp or a cricket now comes every 4–9 s by day and 2–7 s at night (it was 2–4 and 1–3). The wind bed under them is half as loud, and its slow swell scales with it.

### v10.5 — two more jobs: the Mail carrier and the Baker
- **A new kit, "put these in order":** three or four cards shown shuffled; a tap moves a card to the next numbered place, a tap on a placed card puts it back, ✓ checks. A miss keeps the cards that are right and says the customer waits a moment; the second miss makes the next right card glow. Keyboard: arrows, Space, Enter.
- **📬 Mail carrier** (opens at reading level 3; 3 🪙 a task, tip 5). Every task starts with a letter to read ("To Bob on Moss Hill."; from job level 2 "To Bob at 34 Moss Hill."). Then: find the mailbox with that name; at job level 2 the house by its number (tens and ones); at level 3 walk the street map from the post office to the house following the note; at level 4 put the letters in the bag in ABC order. Names, street words and signs are used only where they decode, so a level-3 shift never shows a word above level 3; the hero's name is on about one letter in four.
- **🧁 Baker** (opens at reading level 4; 4 🪙, tip 6). Every task starts with a recipe: put its three steps in order ("Get the buns. Then cut the buns. Last, add the jam."), or read a step and pick what it needs; job level 3 adds the measuring cups ("Which cup is half full?"), level 4 the oven clock ("The buns bake for 1 hour. It went in at 3 o'clock. When is it done?"). Recipes are filtered by his level, so cake, corn, spoon and lemon wait for the levels where they decode.
- **Math that rides along**, all new grade-1 levels that show in the report's math block: tens and ones (house numbers), ABC order, putting steps in order, halves and quarters, telling time to the hour.
- **Gear** on the Trading Post's 🪙 shelf: a mail bag and a baker hat at job level 2, a mail cart and a rolling pin at level 3; the tools bring the tip a task sooner, as the others do. Four badges each.

### v10.6 — Talk to me: he answers by talking
- **Switching it on.** Grown-up menu → Settings → **Talk to me** (off by default), with **Eyes-free** under it for the car. A "🎤 Talk to me" button then appears in the crates panel. The buddy asks, he taps the microphone and talks, and the recording stops on its own when he stops.
- **What he is asked**, mixed at his level: *Say the word* (the word is shown, or eyes-free its sounds are played first: "/k/ /a/ /t/, what's the word?"); *Which one starts with /s/: sun or cat?*; *Which one rhymes with hat?*; *Yes or no* after the buddy reads a book page; a *number* from the jobs' math; and after a story an *open question* ("What do you think happens next?") that is recorded, thanked and never judged.
- **Kind rules.** A sure right answer pays +2 💎 and counts as a read; "I didn't quite catch that. Tap the one you said." shows the choices; a sure wrong answer gets the same feedback as a wrong tap; nothing is ever taken away.
- **Who listens.** Three ways, chosen on the spot: at home the **NAS listens** (a small Whisper container beside the backup server, asked with the possible answers so it scores "cat 0.82" rather than guessing free text; about a second); otherwise the **iPad matches** the clip against the game voice and, better, **his own past recordings**, which the game banks as he plays; otherwise the browser recogniser that "Say it" uses; otherwise the screen. The report says how many answers were heard which way.
- **Dad's inbox.** Grown-up menu → Progress lists his open-question answers with the question, the book and the NAS's transcript when there is one, to play back later.
- **On the NAS:** the listener is a second container; `server/README.md`, "The listener", has the compose lines to paste and a Build. The first start downloads the model (about 150 MB). Without it the mode still works on the iPad alone.
- Honest limits: nobody has measured it on a six-year-old's voice yet. The design's rule stands: record about fifty of his answers and check it is right nine times in ten before trusting it; until his own templates build up, expect "tap the one you said" often. Recording on iPad Safari was not exercised by the tests.

### v10.7 — the game's data moved out of the page
- Nothing changed on screen. The page `app/index.html` went from 2.30 MB to 1.09 MB: the OpenMoji and Fluent Emoji art now lives in `app/art/` and the books, word lists and sentence pools in `app/content/`, loaded by the page before its own script. A cold boot is about 20 ms faster on the iPad size, and about 100 ms faster on a slow connection with a slow CPU; the bytes sent are the same.
- Offline play is unchanged: the service worker's shell holds the page and every data file together, cache-only, and a new version replaces the whole set at once, so the page and its data can never be from different builds. If a data file ever fails to load, the game says so with a Reload button instead of showing an empty valley.
- The home server now sends the data files with the same "check every time" rule as the page, which is a `server/` change: the NAS project needs one Build.
- Under the hood: `tests/page.js` gives the jsdom suites the page with its data inlined and the Playwright suites a server that serves the real files; `tests/version_check.js` checks the page's script tags, the shell list and the folders agree.
- **The Holiday Lights look**, 1–25 December, earned in this order: string lights on a snowy fence that twinkle after dark, a wreath on a signpost, slow sparkles, and a Santa hat for the buddy. Worn, it gives a blue-dusk tint, a pale HUD with candy-cane trim, and crates with a blue edge and a 🎄.
- **Light the tree and the advent doors**, from a ❄️ button that shows only in December. Every word he reads anywhere that day lights one bulb on a big tree, up to 25; a finished book, a sign, a Picture-it read or a sentence lights the star. Under the tree are 25 gift-wrapped doors: door N opens on N December, missed doors can still be opened, later ones say when they open. Behind each door is one read: a word to build from its sounds, a check on a mastered ♥ word, or a sentence at his level. A right read pays 3 🪙 and shows a surprise picture; a miss is "Almost! Try again." with the same read staying and a glow after the second miss. Doors 6, 12, 18 and 24 each hand out a piece of the look; door 25 says Merry Christmas with confetti. Door reads count toward the daily goal.

### v10.7.1 — Halloween opens early; levels judged on his last 20 goes
- **Halloween starts 30 September this year.** The 🎃 button, Trick-or-Read and the Halloween look are open from 30 September to 31 October (it was 15 October). The Closet says "in September".
- **Moving up a level now looks at his last 20 goes.** The rule still wants half the level mastered and 85% first-try accuracy, but the accuracy is now his last 20 sounding-out reads at that level once he has 12 of them (8 on Fast track), not his whole history. A rough first week no longer holds him at level 1 once he has got it; a slump still keeps him where he is. Lifetime accuracy still rules until there are enough recent goes. Parent mode's first-try accuracy figure is unchanged (lifetime).
- Saves gain `state.recent` ({level: [1,0,1,…]}, capped at 20 per level); old saves start it empty and fall back to the old rule until it fills.

### v10.8 — seven more jobs, the rest of the holidays, a lighter battery, and a bug hunt
- **Seven more jobs on the Job board** (eleven in all), each starting with a reading step and paying 3–4 🪙 a task, with a free uniform at job level 2 and a tool at level 3 in the Trading Post (24 new things on the 🪙 shelf). The board now lists the jobs he can play first, then the locked ones by the level that opens them.
  - 👩‍🌾 **Farmer** (reading level 2): read a chore and pick what it needs, count seeds, drive the tractor along a planting note (rows × columns), put a plant's or a chick's life cycle in order, read the weather.
  - 🐾 **Vet** (level 3): read a pet's chart and pick what helps (the patient is often one of his own animals), add the drops, find the paw, put the visit in order.
  - 📚 **Librarian** (level 3): read a request and find the book among three real covers, put three books in ABC order, count the shelf, push the cart by a note.
  - 🍕 **Restaurant** (level 3): read a two-item ticket and find the plate, add the counts, pizzas cut in halves and quarters, add up the prices in coins.
  - 🚌 **Bus driver** (level 3): read a note and drive to the stop on a street map of the valley's own buildings, count who gets on and off, find the clock, order the stops.
  - 🕵️ **Detective** (level 5): sound clues ("It has /b/ at the front, and it ends like hat"), order the clues, pick the suspect, written words only at the top.
  - 🧭 **Park ranger** (level 3): sort his animals into their homes with a new **sort kit** (tap a card, tap a bin, or drag), count food from a chart, sort by what they eat.
- **The rest of the holiday packs** (see v10.3 for how looks work; every piece is earned from the holiday's own mini-game and can be worn any day):
  - 💌 **Word mail**, 1–14 February: his animals send letters he reads and answers; a full mailbag earns a piece of the Valentine's look (hearts on a string, a heart mailbox, heart petals, heart antennae).
  - 🥚 **Egg hunt**, the two weeks before Easter to Easter Monday (the window moves with Easter): three eggs on the treasure hunt's engine in Adventure, a word in each, for the Easter look (painted eggs, a bunny, blossom, a chick hat).
  - 🎆 **Fireworks**, 28 June – 4 July: every word he reads that day launches a firework in a night sky; ten make the grand finale and a piece of the Fourth of July look (flags, bunting, sparkles, a star hat). A sparkler race joins the races that week.
  - 🎂 **Birthday party**: Grown-up menu → Settings → Birthday (month and day). The birthday week has every animal he has at a cake, a free party hat, and a seven-page book in his name made at his level. Reading it to the end pays like a book's first read once a day, and each day of the week it is read earns a piece of the Birthday look (balloons, banner, confetti, cake), so the whole look can be earned in one week.
- **Six more storybooks** at levels 7 and 8 (The Mine Train, Zoom to the Moon, The Seal in the Net, The Big Bonk Stomp, The Dragon and the Key, X Marks the Spot) and three food words for the first levels: jam, ham (level 1) and bun (level 2), which also feed the Feast table.
- **Battery.** Three things, measured on the idle valley (layouts per second fell from about 31 to 18, and to 0 at rest):
  - **Rest mode:** after 45 s with nobody touching it the valley holds still (animations pause, the animals stop wandering, the light layers go plain, the sound sleeps). Any touch wakes it at once. It never rests while something is waiting on him (a word, a book page, a job, a race, the Factory).
  - **Save battery** (Grown-up menu → Settings, on by default): half the particles, plain light layers with no blur, glows painted once instead of recalculated every frame, only the front row sways, and no wind. Turning it off restores today's look.
  - **Battery check** (Settings): Start asks for the battery percent, Stop asks again, and the report shows percent per hour with the modes he played; charging or very short checks are dropped kindly. The Grown-up report and `tools/progress.js` show the last checks and this week's frame-time clues.
  - Under the hood: the animals, vehicles and buddy step with a transform instead of `left`/`top`, which was the main cause of the idle layout work.
- **Bug hunt.** Tap-everything suites (`tests/hunt_*_e2e.js`) walk every screen on a 1024×768 touch iPad and double-tap every paying button. What they found and what was fixed: a double tap on "I read it" in a keeper's book turned one page, and on "Wear it" left the hat on; the Mine's pick shop redraws after a buy, so a child's double tap bought the next upgrade too (a second tap on the same row within 0.6 s is now the same tap); closing the Mine shop right after a sale still let the next customer walk in; a recording in Books could outlive its page or keep the microphone open when the page was left. The Mine hunt suite is parked in `tests/wip` until its shard resumes.
- Playwright taps a greyed button with force now (it used to wait 3 s for it to enable), and the Factory suite pins the holiday dates, since Trick-or-Read puts a door on the Factory building in October (knock first, then "Use" opens it).

See `docs/roadmap-v10.md` for the plan to 4th grade, other subjects and Jobs.

### Still on the list (v4 roadmap, in build order)
1. ~~Write it~~ (done in v8).
2. ~~Understanding checks~~ (done in v6: Picture it, book questions).
3. ~~Storybooks~~ (done in v6). Next: let him make his own book from mastered words.
4. ~~Story chapters~~ (done in v8: The Letter Thief; second arc, The Sleepy Volcano, in v10.0).
5. ~~Vehicle races~~ (done in v8).
6. ~~Progress report~~ (done in v6).
7. ~~Home-server save~~ (done in v8).
- Mine next: build mode with mined blocks, and a dig race with Dad.
- Later: a two-player "read to me" mode, more lands, and a TypeScript/Vite port.
