# Wordcraft Valley

A phonics game for Asher (6). He loves Pokémon, Minecraft, Zelda and Donkey Kong. It runs on the home iPad as a home-screen app, served from the Synology NAS on the home network.

## Layout

| Path | What |
|---|---|
| `app/index.html` | **The game. This is the source of truth.** It is one self-contained file (~1.9 MB, ~10k lines) with CSS, HTML and JS inline. |
| `app/sw.js` | Service worker for offline play. The shell cache is keyed by `VERSION`; the voice clips use a separate persistent cache, `wcv-voice-1`. |
| `app/voice/` | Pre-rendered game voice: Kokoro "af_heart", MP3, 24 kHz mono. `index.json` maps normalized text to a file. |
| `app/manifest.webmanifest`, `app/icons/` | Files that make it installable as a home-screen app. |
| `server/` | Node home server with no dependencies. It serves `app/` and handles backups (`/api/*`). Environment variables: `PORT DATA APP TOKEN KEEP`. |
| `tests/` | jsdom and Playwright tests. `npm test` runs them all and starts the server itself for the sync, multi and voice tests. |
| `tools/release.js` | Bumps `sw.js` VERSION. |
| `tools/voice/` | Voice generator (`gen.py`, then `index.py`). Its model files are not committed (see below). |
| `src/modules/` | Readable copies of the modules as they were inserted up to v9. **Reference only**: `app/index.html` may have moved on. |
| `src/history/` | The one-time Python patch scripts that built the file. They have hard-coded old paths and are **not re-runnable**; kept for history. |
| `docs/design.md` | Design doc covering every version (v1 → v9) and the "Still on the list" backlog. |

## Working in `app/index.html`
- The file has very long data lines (embedded art). **Don't read it whole.** Grep for a section banner, then read that range. Main sections, in order:
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
- Key globals:
  - `state` (the whole save), `save()`, `renderHUD()`, `toast()`
  - `Sound.speak / Sound.sfx / Sound.ctx()`, `VoicePack`
  - `allWords()`, `currentTier()`, `drawWord()`, `drawThing()`, `WORD_ART`
  - `Read.pic / Read.wordPick`
  - `Adv.hookCrit / hookVeh / redraw`, `Quests.hit()`
- Saves live in IndexedDB `wordcraft-valley` v2 (stores `kv` and `blobs`). **Never break old saves.** Add fields with defaults and don't rename existing ones.
- Tests find answers through `host.dataset.ans` / `dataset.tiles`. Keep those attributes on answer hosts.

## Rules
- **Offline-first and self-contained.** No CDN, no npm runtime dependencies, no network calls except to the home server (`/api/*`) and `voice/`.
- **Older iPad Safari.** Avoid `.at()`, `structuredClone`, top-level await and CSS `:has()`. Test touch as well as keyboard (WASD/arrows and space).
- **Audience is a 6-year-old.** Feedback is always kind; a wrong answer never takes anything away (e.g. "no boost this time"). Sentences in books must be decodable at their level: run the decode check in the DECODE section.
- **Voice.** Spoken lines are played from `app/voice/` when the exact text (or a few whole indexed pieces) exists; otherwise the device voice is used. A new fixed line should get a clip:
  1. Add it to `tools/voice/voice_texts.json`.
  2. Run `gen.py` and then `index.py`.
- Art: OpenMoji (CC BY-SA) and Fluent Emoji (MIT) are embedded inline. Keep the attributions in Parent mode → About.

## Workflow for any change
1. Edit `app/index.html` (and `server/` if needed).
2. Run `npm test`. All suites must print PASS.
   - Playwright needs Chromium: run `npx playwright install chromium`, or set `CHROMIUM=/path/to/chromium`.
   - Run one suite with `node tests/run-all.js mine9`.
3. Run `npm run release` to bump the service-worker VERSION. The iPad only updates when this changes.
4. Add a short section to `docs/design.md` for anything a parent would notice.
5. Commit, then push to `main`.

## Run locally
`npm install`, then `npm run serve`, then open http://localhost:8088.

## Deploy (Synology)
The NAS has a clone of this repo at `/volume1/docker/wordcraft`. Container Manager runs `server/docker-compose.yml`, which mounts `../app` read-only and `./data` for backups.

To update: `git pull`. A container restart isn't needed for `app/` changes. Restart only when `server/` changes.

HTTPS (needed for the home-screen app, offline play and the microphone) comes from DSM's reverse proxy with a Let's Encrypt certificate, or from `tailscale serve --bg 8088`.

## Voice generator setup (only when adding lines)
```
cd tools/voice && pip install kokoro-onnx soundfile
# download kokoro-v1.0.onnx and voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases into this folder
python gen.py && python index.py   # needs ffmpeg on PATH for mp3
```
