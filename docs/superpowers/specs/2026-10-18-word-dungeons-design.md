# Word Dungeons: Zelda dungeons with Pokémon battles

Status: design agreed with Eric on 18 Oct 2026, section by section. This file is the spec; the implementation plan comes next.

## Why

Asher's play time fell from 50–120 minutes a day in late September to 5–7 minutes a day by mid-October (14–16 Oct). What he still opens is mostly the word crates; the Gem Mine and the Factory, his September favourites, went quiet. His reading is in good shape (67 of 80 tracked words mastered; the daily goal met on every day but the last), so the goal now is **pull him back in**: something fresh and exciting, with reading as the way you win. He is into **Pokémon and Zelda** right now.

The game already has much of their flavour (catching wild animals in tall grass, the Word-Dex, an evolving buddy, Mine bosses, two story quests). It has no **battles** and no **dungeons**. Word Dungeons adds both: Zelda dungeons whose rooms hold Pokémon-style battles.

Success: his daily minutes rise again and the dungeons get opened day after day, while reading time (battles count as reading) holds or rises. `tools/progress.js` and the Grown-up report show both.

## Decisions (Eric, 18 Oct 2026)

| Question | Answer |
|---|---|
| Main aim | Pull him back in |
| Interests | Pokémon, Zelda |
| First build | Dungeons with battles inside (one combined project) |
| Stakes | Hearts; at zero hearts the dungeon restarts from its entrance, keeping what he earned |
| Length | About 10 minutes, 6–8 rooms |
| Fighters | A team of 3 of his animals, plus befriending monsters, who join his collection |
| Engine | Rooms on a tile grid, Ash steps tile to tile |

House rules that still hold: a wrong answer never takes away anything he owns; feedback is always kind; offline-first; older iPad Safari; every fixed sentence decodable at its level; every fixed line gets a voice clip.

## 1. Where it lives and how a run goes

- **Getting in.** A new 🗝️ **Dungeons** button in the tool bar (with a NEW badge until the first visit), and each open dungeon gets a cave door in Adventure (an `Adv.provide` spot). Both open the **dungeon map**: the dungeons in a row, each with its badge slot, its reading level, and its boss trophy once beaten.
- **Three dungeons at launch**, each opening when the one before is cleared *and* he has reached its reading level (section 5):
  - 🌿 **Forest Temple**, reading level 1, item: 🪃 boomerang
  - 💧 **Water Cave**, reading level 3, item: 🪝 hookshot
  - 🔥 **Fire Mountain**, reading level 5, item: 💣 bombs

  More dungeons are data only.
- **A run** takes about 10 minutes: 6–8 rooms with battles, a key or two, a block or switch puzzle, a chest with the dungeon's item, then the boss.
- **Hearts.** Hearts are counted in halves. Ash starts with 3 hearts; each boss gives a **heart container** (+1, up to 6). Pots and bushes sometimes drop a heart (1 in 6); a **fairy** room refills all hearts.
- **Zero hearts.** "Ash is tired! Back to the entrance." The dungeon starts over from its entrance: rooms, keys, doors, pots and monsters reset, hearts refill. **Kept:** gems earned, monsters befriended, animal experience, and the dungeon's item once found (so a second try goes faster). A cleared dungeon can be replayed any time; replays pay battle gems but not the boss's heart container again.
- **Rewards.** Gems from battles and chests, the item, the heart container, and the dungeon's **badge** (on the map and on the sticker book's Badges page).
- **Grown-up report.** Battles count as reading time and walking as play, like the Mine's word stones today (Modes: `dungeon` reading:false, `battle` reading:true).

## 2. Rooms, puzzles and items

- **A room** is one screen: 11×7 walkable tiles inside a wall ring (13×9 in all), with doors at the middle of each wall. Going through a door slides to the next room. A small map in the corner shows visited rooms and where he is; the **dungeon map** item (in a chest) also shows the unvisited rooms and the boss room's skull.
- **Controls.**
  - Touch: the joystick (as in Adventure), a ⚔️ action button and an item button. Tapping a floor tile walks Ash there by the shortest path; the walk stops if something gets in the way.
  - Keyboard: arrows or WASD, space for ⚔️, X for the item.
  - Ash moves one tile at a time with a short glide (a transform transition, about 160 ms).
- **⚔️ does the small things**, on the tile Ash faces: smash a pot, cut a bush (either may drop a heart or a gem), hit a crystal switch, open a chest, read a sign. It never hits monsters; monsters are battles.
- **Puzzles.**
  - **Blocks:** walking into a block pushes it one tile if the tile behind is free floor. A block on a **plate** opens that room's shut doors. Blocks go back to their places when Ash leaves the room (as in Zelda), so a room can never be left unsolvable.
  - **Small keys** come from chests or from a battle; a 🔒 door takes one key. The **Boss Key** opens the boss door.
  - **Word doors** show a word; he reads it (tap its picture) to open the door.
  - **Signs** are short decodable clues that matter ("The key is in the red pot."), so reading them pays off.
  - **Crystal switches** (hit with ⚔️ or the boomerang) raise or lower coloured barriers.
- **Items** open new paths and work in later dungeons:
  - 🪃 **Boomerang** (Forest): flies 4 tiles straight ahead and back. It hits a crystal switch out of reach, brings back a key or heart across a gap, and stuns a monster; a battle with a stunned monster starts with one free hit.
  - 🪝 **Hookshot** (Water): fires up to 5 tiles at a post and pulls Ash across water or a pit.
  - 💣 **Bombs** (Fire): placed on the tile ahead, burst after 2 s, and open cracked walls (sometimes into a secret room with treasure). Bombs never hurt Ash or monsters.
- **Monsters** take a step about once a second (on a set path or wandering) and never leave their room. Bumping into one, or one stepping into Ash, starts a battle. Pits, water and lava are just walls until the right item crosses them; they never hurt him.
- **Rooms are authored** as text grids in `app/content/dungeons.js` (format below). The words, sentences and battle questions are picked at his level each time, so a replay reads differently.

## 3. Battles

- **His team.** At the dungeon door he picks 3 from his animals and monster friends. The game suggests three that cover all types, his most-used first. The team stays until he changes it.
- **Three types**, Pokémon-style: 🔥 Fire beats 🌿 Leaf, 🌿 Leaf beats 💧 Water, 💧 Water beats 🔥 Fire. Every animal, monster friend and monster has one type (table below). The buddy hints at the start of a battle when the active animal is weak: "Water is strong against fire!"
- **A turn is one reading question**, using the existing engines in `Read`:
  - `Read.pic`: read the word, tap its picture
  - `Read.wordPick`: pick the word for a picture
  - `Read.build`: build the word from sounds
  - `Read.sentence`, from level 2: read a sentence and pick the scene, every third turn

  About half of the questions come from `Skills.target()` (his shakiest sounds), as in the crates.
- **Right answer:** the active animal attacks with its move ("Splash!", "Bite!", "Peck!", "Stomp!", by kind): 1 hit, or 2 when its type beats the monster's. A right answer after a miss still lands the hit; the miss is recorded as help, as everywhere.
- **Wrong answer:** the monster hits back and Ash loses half a heart. At most one heart per question: the first and second wrong taps cost half a heart each, later ones nothing. After two misses the right answer glows (the engines already do this). No timer. The Sound Shield works as everywhere.
- **Swapping.** He can swap the active animal any time by tapping the team bar under the battle; a swap costs nothing.
- **Monsters** take 3 hits in the Forest Temple and 4 in the other two. The animal that fought gains 1 experience per battle; it gets a level star at 3, 6, 10, 15 and 21 experience. Levels are shown with pride (on the team bar and in the sticker book) and do not change the damage.
- **Running away.** A "Back off" button steps Ash back one tile and closes the battle; the monster keeps its damage. Nothing is lost.
- **Bosses** take 8 hits. Every third round is a sentence riddle (`Read.sentence`). Each boss is weak to one type (Forest boss to 🔥, Water boss to 🌿, Fire boss to 💧), so the right team matters. The dungeon's item gives one free hit per boss fight. Losing all hearts in a boss fight restarts the dungeon like anywhere else; the boss room keeps his item, so the walk back is short.
- **Pay.** 2 💎 per battle won, 10 💎 per boss, plus chest gems (3–5 each).

### Types of his animals

| Type | Animals |
|---|---|
| 🔥 Fire | fox, wolf, tiger, lion, trex, dragon, boar, rhino, scorpion, hawk, eagle |
| 💧 Water | fish, frog, duck, croc, shark, crab, lobster, seal, octopus, dolphin, whale, penguin |
| 🌿 Leaf | dog, cat, hen, pig, bug, bat, bear, rabbit, raccoon, mammoth, monkey, parrot, sloth, snake, elephant, gorilla, lizard, sauropod |

A new animal added later gets a type in the same table (in `dungeons.js`); an animal missing from it fights as 🌿.

## 4. Making friends with monsters

- **Twelve monster kinds at launch**, four per dungeon, with **decodable names** and OpenMoji pictures. Names and art can still change in review:

  | Dungeon | Monster | Type | Picture |
  |---|---|---|---|
  | Forest Temple | Blob | 🌿 | 🦠 microbe |
  | Forest Temple | Spot | 🌿 | 🍄 mushroom |
  | Forest Temple | Gob | 🔥 | 👺 goblin |
  | Forest Temple | Wisp | 💧 | 👻 ghost |
  | Water Cave | Zap | 💧 | 🪼 jellyfish |
  | Water Cave | Glub | 💧 | 🐡 blowfish |
  | Water Cave | Ink | 💧 | 🦑 squid |
  | Water Cave | Pip | 🌿 | 🪸 coral |
  | Fire Mountain | Flick | 🔥 | 🔥 fire |
  | Fire Mountain | Grunt | 🔥 | 👹 ogre |
  | Fire Mountain | Thud | 💧 | 🧟 zombie |
  | Fire Mountain | Bonk | 🌿 | 🪨 rock |

- **Bosses**, one per dungeon (names and art also open in review): Forest Temple, **King Stump** (🌳, 🌿); Water Cave, **Big Glob** (🐙 with a crown, 💧); Fire Mountain, **Scorch** (🐲, 🔥).
- **Befriending.** After a win, a kind he hasn't befriended yet sometimes sits up and wants to be friends: always the first time he beats that kind, about 1 in 3 after that. He reads its **name** (tap the name among three look-alike names), then a short sentence and the matching picture ("Blob can be my pal."). A miss just means "Maybe next time!"; there is no heart cost outside battle.
- **Monster friends join his collection:**
  - a new **Dungeon friends** page in the Word-Dex (12 slots)
  - they can be on his battle team with their own type
  - they live in his valley like his animals, as `state.critters` entries with ids `m_<name>` (`m_blob`)
  - a crowded valley sends new friends to rest in the sticker book, as it does now
  - Word Wilds, crate rewards, the Trading Post and the Mine's lost animals never offer them
- **All twelve** earns a badge ("Monster pal"). Beating a kind he already has pays gems as usual.
- **Bosses** are not befriended. Beaten, a boss turns friendly, says one line, gives the heart container, and its trophy goes on the dungeon map.

## 5. How it's built

### Files

- `app/content/dungeons.js` sets `WCV.dungeons`: the dungeons, their rooms, monsters, bosses, signs and fixed lines, plus the animal type table. It is plain data, ASCII only, a classic script. It is added to `DATA_SETS`, `SHELL` in `sw.js`, and the page's `<script src>` list; `tests/version_check.js` checks they agree.
- The new pictures come from OpenMoji (the monsters, bosses, chest, key, pot, bush, block, plate, crystal, door, fairy, the three items and a heart): about 30 SVGs, fetched once while building, as a new set `OMD` in `app/art/openmoji.js`. CC BY-SA, covered by the attribution in Parent mode → About.
- `app/index.html` gets a new **DUNGEONS** section (after RACES) with three parts:
  - `Dungeon`: the map screen, rooms, movement, puzzles, items, the run
  - `Battle`: the team bar, rounds through `Read.*`, types, hearts, bosses
  - `Friends`: befriending, the Word-Dex page, valley integration (`ART.m_*` drawings, `CRIT()` learning about monster friends)

### Room format

Each room is 9 strings of 13 characters (the wall ring included), plus a small object for what the characters don't say:

```
#  wall              .  floor            @  entrance (first room only)
D  open door         L  locked door      B  boss door        W  word door
P  pot               G  bush             O  block            _  plate
S  crystal switch    R  red barrier      U  blue barrier     C  chest
~  water             ^  pit              %  lava             H  hookshot post
X  cracked wall      T  sign             F  fairy            M  monster start
```

```js
{id:"f3", at:[1,0], grid:[ /* 9 strings */ ],
 chests:{"6,4":{item:"key"}}, signs:{"2,2":"The key is in the red pot."},
 pots:{"9,5":"key"}, words:{"6,0":null /* word door: word picked at run time */},
 monsters:[{kind:"blob", path:"wander"}], shutUntil:"plate"}
```

Rooms join at their doors by their `at` grid position. A dungeon lists its rooms, entrance room, boss room, item room and level.

### Saves

New `state.dungeon`, with defaults for old saves (nothing existing is renamed):

```js
{team:[],                          // critter ids, up to 3
 maxHearts:3,
 items:{boomerang:false,hookshot:false,bombs:false},
 cleared:{},                       // dungeon id -> {at:"YYYY-MM-DD", runs:n}
 friends:{},                       // monster kind -> "YYYY-MM-DD" befriended
 xp:{},                            // critter id -> experience
 run:null,                         // the run in progress (below)
 stats:{battles:0,wins:0,runs:0,restarts:0}}
```

`run` is `{d, room, halves, keys, bossKey, map, opened:[], taken:[], beaten:[]}`. It is saved, so closing the iPad mid-dungeon resumes at that room's door with the same hearts. Clearing or restarting replaces it. Badges use the existing badge list.

### How it fits what's there

- **Modes.** `dungeon` (reading:false) for the dungeon screen, `battle` (reading:true) for a battle or befriending sheet. The dungeon is full-screen, so the valley sleeps behind it (Rest.cover), and battles get the 3-minute rest rule.
- **Rest.** The monster step timer skips while `Rest.on()` or the page is hidden. Nothing redraws while Ash stands still (glides are CSS transitions; no frame loop).
- **Reading engines.** Battles call `Read.pic`, `Read.wordPick`, `Read.build` and `Read.sentence` with a host element, so `Skills` records every answer and the tests find answers through `host.dataset.ans` as everywhere.
- **Quests and badges.** Two new daily quests ("Win 3 dungeon battles", "Make a monster friend") join the pool, plus badges per dungeon and "Monster pal".
- **Reports.** The Grown-up report's "Where the time goes" picks up the two modes by itself; `tools/progress.js` prints dungeons cleared, friends and the current team.

### Reading level and voice

- Each dungeon's fixed text (signs, monster names, friend sentences, boss lines) is written for its level and must pass the DECODE section's check at that level; tricky words are allowed as in books. The door on the map opens once he reaches the level. Battle questions always follow his current level.
- Every fixed line gets a clip. `tools/voice/extract.js` learns to read `WCV.dungeons`, then `gen.py` and `index.py` as usual. A clip for every line is checked by `voice_cov.js`.

### Tests

- `tests/dungeon_data.js` (jsdom/node):
  - every grid is 13×9 and uses known characters
  - doors pair up between neighbouring rooms
  - every dungeon is **solvable**: a search over (room, keys, items) reaches the boss from the entrance; each block puzzle is solvable inside its room; no key is spent before it can be found
  - every fixed sentence passes the decode check at its dungeon's level
- `tests/dungeon_e2e.js` (Playwright, 1024×768 touch, keyboard too): walk a dungeon by joystick and by tapping a tile; push a block onto a plate; open a key door and a word door; read a sign; win a battle; lose half a heart on a wrong answer, and no more than one heart per question; reach zero hearts and restart with friends, items and gems kept; befriend a monster and find it in the Word-Dex and the valley; beat the boss; get the badge and heart container; swap animals; a type win does two hits; the step timer stops at rest; resume a saved run.
- `npm test` must pass as always; the voice coverage check covers the new lines.

### Shipping order

Three releases, each through the usual workflow (tests, voice, `npm run release`, a `design.md` section, push, then check the NAS serves the new VERSION):

1. **The engine and the Forest Temple**: dungeon map, rooms, movement, blocks, keys, word doors, signs, boomerang, battles, types, team, hearts and restart, befriending and Dungeon friends (Forest's four), King Stump, the badge.
2. **The Water Cave** and the hookshot: four monsters, Big Glob.
3. **Fire Mountain** and bombs: four monsters, Scorch, the "Monster pal" badge.

## Risks

- **Too hard at 6, with a full restart.** Hearts are counted in halves, at most one heart goes per question, pots and fairies give hearts back, and the item is kept on a restart. The data shows restarts per run (`stats.restarts`); if they are high, the next release adds a checkpoint or more fairies.
- **Battles feel the same.** Four question kinds rotate, types change which animal to use, monsters can be befriended, and bosses add riddles. If battles still drag, monsters drop to 2 hits.
- **Size on the older iPad.** About 30 SVGs and three dungeons of text are well under 150 KB. The room is plain DOM with about 100 tiles, and nothing animates while Ash stands still.
- **The valley gets crowded.** Monster friends follow the existing crowded-valley rule and rest in the sticker book.
