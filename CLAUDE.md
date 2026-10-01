# Wordcraft Valley

A phonics game for Asher (6). He loves Pokémon, Minecraft, Zelda and Donkey Kong. It runs on the home iPad as a home-screen app, served from the Synology NAS on the home network.

## Layout

| Path | What |
|---|---|
| `app/index.html` | **The game's code. This is the source of truth.** CSS, HTML and all the JS inline (~1.1 MB, ~16k lines). Its data comes from `app/art/` and `app/content/`, loaded by `<script src>` tags just before the game script. |
| `app/art/` | Picture data: `openmoji.js` (`WCV.openmoji`: `OM`, `OMV`, `OMW`, `OMX`, `OMN`, `OMB`; OpenMoji, CC BY-SA) and `fluent.js` (`WCV.fluent`, the `FLU` map; Fluent Emoji, MIT). ~1.2 MB of long lines: don't read them whole. |
| `app/content/` | Reading data: `words.js` (`WCV.words`: `WORDS` with the tricky-word checklist, and `WORD_ART`), `books.js` (`WCV.books`: `BOOKS`, format described at the top), `sentences.js` (`WCV.sentences`: `SIGNS`, `QUEST_POOL`), `fluency.js` (`WCV.fluency`: the one-minute reading check's stories and the Hasbrouck & Tindal 2017 norms). |
| `app/sw.js` | Service worker for offline play. The shell cache (`SHELL`, keyed by `VERSION`) holds the page and every file in `art/` and `content/`, cache-only and replaced whole by each new version; the voice clips use a separate persistent cache, `wcv-voice-1`. |
| `app/voice/` | Pre-rendered game voice: Kokoro "af_heart", MP3, 24 kHz mono. `index.json` maps normalized text to a file. |
| `app/manifest.webmanifest`, `app/icons/` | Files that make it installable as a home-screen app. |
| `server/` | Node home server with no dependencies. It serves `app/` and handles backups (`/api/*`). Environment variables: `PORT DATA APP TOKEN KEEP`. |
| `tests/` | jsdom and Playwright tests. `npm test` runs them all (a failed suite is retried once; `tests/wip/` holds suites not yet green, which it skips) and starts the server itself for the sync, multi and voice tests. `tests/page.js` gives the jsdom suites the page with its data inlined (`html()`) and the suites with their own server `serveApp()`; `tests/lib.js` is the helper for new Playwright suites. |
| `tools/release.js` | Bumps `sw.js` VERSION. |
| `tools/progress.js` | Prints his progress from the home server's newest backup (`WCV_SERVER`, default `http://192.168.1.91:8088`; `--file` for a snapshot; `--json` for the state minus recordings). Use it to answer "how is he doing" before changing the game. |
| `tools/voice/` | Voice generator (`gen.py`, then `index.py`). Its model files are not committed (see below). |
| `src/modules/` | Readable copies of the modules as they were inserted up to v9. **Reference only**: `app/index.html` may have moved on. |
| `src/history/` | The one-time Python patch scripts that built the file. They have hard-coded old paths and are **not re-runnable**; kept for history. |
| `docs/design.md` | Design doc covering every version (v1 → v9) and the "Still on the list" backlog. |

## Working in `app/index.html`
- The file is ~1.1 MB of code. **Don't read it whole.** Grep for a section banner, then read that range. (The long art lines are in `app/art/*.js`: don't read those whole either.) Main sections, in order:
  1. ART
  2. OPENMOJI CREATURE ART
  3. CONTENT
  4. STORAGE
  5. AUDIO / PHONICS / GAME VOICE
  6. STATE
  7. WORLD
  8. VEHICLES
  9. CRATE LOOP
  10. SIGNATURE MOVES
  11. GEM MINE
  12. SOUND SKILLS
  13. STORYBOOKS
  14. VALLEY ADVENTURE
  15. WORD WILDS
  16. DECODE
  17. SHARED READING CHALLENGES
  18. MY OWN BOOK
  19. WRITE IT
  20. ANIMAL CARE
  21. RACES
  22. HOME-SERVER BACKUP
  23. 7c–7p extras
  24. LEVELS, UPGRADES
  25. PARENT MODE
  26. BOOT
- **Data lives in `app/art/` and `app/content/`.** Each file is a classic script (not a module) that sets one property: `"use strict";window.WCV=window.WCV||{};WCV.books=[...];`. In `index.html` each moved constant is one line where it used to be (`const BOOKS=WCV.books;`), so the code uses `BOOKS`, `WORDS`, `WORD_ART`, `SIGNS`, `QUEST_POOL`, `OM`…`OMB` and `FLU` as before. Keep these files plain data and ASCII only (write anything else as a Unicode escape). To add a data file: add its `<script src>` before the game script, add its name to `DATA_SETS` (the "files did not load" guard at the top of the game script), and add it to `SHELL` in `sw.js`. `tests/version_check.js` checks the page and `SHELL` agree.
- Key globals:
  - `state` (the whole save), `save()`, `renderHUD()`, `toast()`, `WCV` (the data sets)
  - `Sound.speak / Sound.sfx / Sound.ctx()`, `VoicePack`
  - `allWords()`, `currentTier()`, `drawWord()`, `drawThing()`, `WORD_ART`
  - `Read.pic / Read.wordPick`
  - `Adv.hookCrit / hookVeh / redraw`, `Quests.hit()`
- Saves live in IndexedDB `wordcraft-valley` v2 (stores `kv` and `blobs`). **Never break old saves.** Add fields with defaults and don't rename existing ones.
- Tests find answers through `host.dataset.ans` / `dataset.tiles`. Keep those attributes on answer hosts.

## Rules
- **Offline-first and self-contained.** No CDN, no npm runtime dependencies, no network calls except to the home server (`/api/*`) and `voice/`.
- **Older iPad Safari.** Avoid `.at()`, `structuredClone`, top-level await and CSS `:has()`. Test touch as well as keyboard (WASD/arrows and space).
- **Audience is a 6-year-old.** Feedback is always kind; a wrong answer never takes anything away (e.g. "no boost this time"). Sentences in books (`app/content/books.js`) must be decodable at their level: run the decode check in the DECODE section.
- **Voice.** Spoken lines are played from `app/voice/` when the exact text (or a few whole indexed pieces) exists; otherwise the device voice is used. A new fixed line should get a clip:
  1. Run `npm run voice:extract`. It reads the game and adds every missing fixed line to `tools/voice/voice_texts.json`; a line built at run time from a variable has to be added by hand.
  2. In `tools/voice`, run `python gen.py 0 1` and then `python index.py`.
- Art: OpenMoji (CC BY-SA) and Fluent Emoji (MIT) are in `app/art/`. Keep the attributions in Parent mode → About.

## Workflow for any change
1. Edit `app/index.html`, `app/art/` or `app/content/` (and `server/` if needed).
2. Run `npm test`. All suites must print PASS.
   - Playwright needs Chromium: run `npx playwright install chromium`, or set `CHROMIUM=/path/to/chromium`.
   - Run one suite with `node tests/run-all.js mine9`.
3. Run `npm run release` to bump the service-worker VERSION whenever anything in `app/` changes. The iPad only updates when this changes.
4. Add a short section to `docs/design.md` for anything a parent would notice.
5. Commit, then push to `main`.

## Run locally
`npm install`, then `npm run serve`, then open http://localhost:8088.

## Deploy (Synology)
The NAS has a clone of this repo at `/volume1/docker/wordcraft`. Container Manager runs `server/docker-compose.yml`, which mounts `../app` read-only and `./data` for backups.

To update: a DSM Task Scheduler job pulls `main` every 15 minutes (`/usr/local/git/bin/git -C /volume1/docker/wordcraft pull -q`). A container restart isn't needed for `app/` changes. When `server/` changes, say so in the release notes: the project needs Action → Build in Container Manager (the project's compose was pasted with absolute paths; the current one is in `server/README.md`, "The listener").

HTTPS (needed for the home-screen app, offline play and the microphone) comes from `tailscale serve --bg 8088` on the NAS; the iPad runs the game from the `https://<nas>.<tailnet>.ts.net` address and backs up to it. Progress data is readable from this PC with `node tools/progress.js`.

## Voice generator setup (only when adding lines)
```
cd tools/voice && pip install kokoro-onnx soundfile
# download kokoro-v1.0.onnx and voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases into this folder
python gen.py 0 1 && python index.py   # gen.py takes <part> <parts> to split the work across machines; needs ffmpeg on PATH for mp3
```
