# Sound it out, don't guess

Status: design agreed with Eric on 19 Oct 2026 ("use rec", then "looks good" on the three sections below).

## Why

Eric sees Asher "guessing more and more to just get by the word": he taps letter tiles at random when building a word, and rushes through words for the rewards. His data agrees:

- First-try accuracy fell from 81-86 % (26-28 Sept) to 54-69 % on several October days. His last-20 accuracy at level 1 dropped to 80 % on 19 Oct, which (before the fix in v10.13) locked every job.
- The top "sound mix-ups" (o→r ×24, m→o ×20, r→m ×15, ee→r ×12) are order errors building the heart words *from*, *three* and *one*: trial and error with letter tiles, not misreading.
- The game's guess detector (a wrong answer under 0.9 s, `Skills.result`) never fires for him: his answers take 4-8 s.

What makes guessing pay today (line numbers as of 19 Oct, `app/index.html`):

1. **🔊 Blend it says the word for free** (`blend()` ends by saying the word; it does not count as help). He can blend, hear the word, tap the matching picture, and it is a clean read that climbs the ladder to mastery.
2. **After a wrong tap the game says the word** (`miss()` runs `blend()` after 560 ms), so the next tap is informed and still pays.
3. **Build it is elimination**: the word is spoken first, right tiles stick when the boxes are full and wrong ones bounce, so the second try picks among 1-3 tiles; after 2 misses the first sound is placed for him; unlimited tries.
4. **Hear it shows the answer's spelling**: `openWord` draws the word's tiles in `#letters` and `renderListen` never hides them.
5. **Heart words have an honor path**: at rung 2, "I read it!" on a heart word (or a word with no picture) calls `succeed()` straight away and can master it.
6. **A guess costs almost nothing**: `succeed()` pays the full prize (`giveReward()`), words read, the goal and quests whatever the misses; only gems (3 → 2) and the streak differ. 👂 Say the word earns 1 gem, less than guessing.

Goal: sounding out is the quickest way to the prize; guessing is noticed, gently slowed, and shown to Eric.

House rules that hold: kind words, and a wrong answer never takes anything away ("no boost this time"); older iPad Safari; never break old saves; every fixed spoken line gets a clip.

## Scope

In: the crate word loop (CRATE LOOP: `openWord`, Find it, Build it, Read it, Hear it, `succeed`, `miss`, `blend`), and the shared `Read` kit (`Read.pic`, `Read.wordPick`, `Read.build`, `Read.sentence`) that the dungeons, Trick-or-Read, the Valley Quest, animal care, the egg hunt, the feast and Light the tree use; the Sound Shield; the grown-up report and `tools/progress.js`.

Out (this round): Jobs (coins are paid whatever the tries), the Gem Mine's word stone and shop customers, Word Wilds and the mine boss (already one answer per round), the Quest Temple doors.

## 1. Close the leaks

- **Build it, left to right.** The boxes fill in order and the next empty box glows. Tapping a tile:
  - the right sound for that box: it sticks and says its sound;
  - a wrong one: it bounces straight back, says its own sound, then the word is stretched up to and including the glowing box's sound ("frrr…" for the r box of *from*), built from the sound clips as `blend()` does, so he hears what comes next. The game never names the right letter.
  - After 2 misses on the same box the right tile glows (the existing `.hint` look); nothing is placed for him.
  - The word is still spoken once at the start (spelling from dictation stays).
  - Clean = no wrong tile placed and no 👂. Heart words (and the heart-word checks of `Retain`) work the same way; a check still needs a clean build.
  - `Read.build` (outside crates) behaves the same.
- **🔊 Blend it stretches the sounds and stops before saying the word.** He says it himself. Blend it is not counted as help (it is the sounding out we want). The word itself is said only by 👂 Say the word (which counts as help, as today) and after he picks the right answer.
- **After a wrong pick** (Find it, Read it, `Read.pic`, `Read.sentence`'s key word), the help plays the word's sounds one by one (the existing named-sound help stays for one-sound-apart picks) and does not say the whole word. After 2 misses the right choice glows, as today. `Read.wordPick` keeps saying the wrong word he picked (that is feedback on his choice, not the answer).
- **Hear it hides the spelling.** `#letters` is hidden while the Hear it choices are up, and shown again on the right answer.
- **Heart words: no honor tap.** "I read it!" is always followed by "Which one did you read?". A heart word, or a word with no picture, gets the Hear it style choice of printed look-alikes (the word is not spoken; he picks the one he read) instead of `succeed()`.

## 2. Rewards follow careful reading

- **Clean first try**: everything it earns today: the crate's prize (`giveReward()`: an animal, vehicle or plan), gems (3, +1 clean build, +2 lost crate, the streak bonus, doubled in season) and the streak.
- **After misses**: the word still counts (words read, the daily goal, quests, the ladder's `seen`), 1 gem, the streak goes back to 0, and the prize waits: no `giveReward()` this time. The buddy says, kindly, "Good reading! Read it first try to open the prize!" (a fixed line with a clip). The next crate is a fresh chance.
- **👂 Say the word**: 1 gem as today; the prize waits too (it is help).
- The Sound swap crate's +2 gems and Picture it follow the same rule: the boost on a first try only. Trick-or-Read, the dungeons and the other `Read` kit users keep their own rewards (their kits change as in section 1).

## 3. Sound it out first, only when he is guessing

- **A guess check on each word** (`Guess`, replacing the speed guard's `slow` flag; `state.rushes` stays for history). A word counts as a guess when any of:
  - a wrong pick before he tapped any sound tile or 🔊 Blend it on that word;
  - two or more wrong tiles in one Build;
  - a wrong pick within 2 s of the choices appearing (the old 0.9 s rule, widened).
- **Guess mode** turns on when 2 of his last 5 words were guesses, and off after 5 clean first tries in a row. It is saved (`state.guess = {on, last:[...], streak, days:{date:n}}`, added with defaults; old saves get it empty), so a reload does not reset it.
- **While guess mode is on**, every word in the crates (Find it, Read it) and in `Read.pic` / `Read.sentence` starts with the Sound Shield: he taps each sound **left to right** (today: any order), each one sounding as he taps it; then the choices unlock. The Shield no longer says the word at the end. Build it already goes sound by sound, so it is unchanged in guess mode. Places that used `Skills.slow` (the mine word stone and boss, Word Wilds) follow guess mode the same way.
- **The grown-up report** shows "Guessing" (words that looked like guesses, a day) in place of "Quick guesses a day", and whether "sound it out first" is on. `tools/progress.js` prints a guessing line (per day for the last 14 days, and the mode).

## Saves

New: `state.guess` (with defaults in `def()`). Nothing renamed or removed; `state.rushes`, `stats`, `recent` keep their meaning. A word's ladder (`rung`, `rungClean`) is unchanged; only what counts as clean changes (Blend it no longer gives the word away).

## Testing

A new Playwright suite (`tests/guess_e2e.js`) covering each bullet above: Build it in order (a wrong tile bounces at once, the right one never placed for him, hint after 2), Blend it not saying the word (the voice log), no whole word after a wrong pick, Hear it hiding `#letters`, the heart-word check, the prize only on a clean read (and 1 gem after misses), the three guess signals, guess mode on at 2 of 5 and off after 5 clean, the Shield in order without the word, the report line. Existing suites that expect today's behaviour (the first tile placed after 2 misses, the word said after Blend it, the honor tap, the prize after misses) are updated to the new rules. Voice: new fixed lines get clips (`npm run voice:extract`, then `gen.py`).
