# Before the roadmap: what to fix or refactor first

Date: 27 Sept 2026, against v9.2.1. Companion to [roadmap-v10.md](roadmap-v10.md).

**Status:** items #1, #2 and #16 are on branch `fix/audit-fix-now` (wcv-2026-09-28b); #3 is on `refactor/modes` (wcv-2026-09-28c); #4 is on `refactor/save-schema` (wcv-2026-09-28d). Each branch stacks on the previous one and each passed the full suite. All await review and merge. Items #5–#7 landed in wcv-2026-09-28g (`tests/lib.js`, `tools/voice/extract.js`, one book per line). #8 is open, to be done with the Jobs kits.

**How this was made.** A read of `app/index.html` (sections, storage, state, boot, the `Read`, `Sync`, `Adv`, `Notes` and `Quests` modules), `app/sw.js`, `server/server.js`, the test runner and every test file's structure, the voice tools, CI and deploy config. One bug was reproduced by running the server. The full test suite was run locally after installing its dependencies (see the last section).

**Short version.** The code is in good shape for what it is: one file, no dependencies, a storage layer that degrades gracefully, a service worker that does the right thing, and a test per feature. Nothing needs a rewrite. Two real bugs should be fixed before anything else, and two refactors should land at the start of v9.3 because the roadmap's first phase (measurement, the reading-ticket gate, new save fields) builds directly on them. The rest can be done with the feature that needs it.

| # | Item | Kind | When | Effort |
|---|---|---|---|---|
| 1 | Home server crashes on a malformed URL | Bug | Now | Small |
| 2 | Parent-typed text goes into markup unescaped | Bug | Now | Small |
| 3 | No single place where a mode opens or closes | Refactor | Start of v9.3 | Medium |
| 4 | Save schema is spread out and migrations are not versioned | Refactor | Start of v9.3 | Medium |
| 5 | Test boilerplate is copied 22 times and waits are fixed sleeps | Refactor | First new suite (v10.0) | Medium |
| 6 | Voice text list is kept by hand | Tooling | First new book (v10.0) | Small |
| 7 | The 24 books are one 16 KB line | Housekeeping | With #6 | Small |
| 8 | "Answer once" guards are re-implemented per module | Refactor | With the Jobs kits (v10.1) | Small |
| 16 | CRLF checkout makes `version_check.js` fail on Windows | Bug (dev machine only) | Now | Tiny |
| 9–15, 17 | Things worth knowing, no action needed now | Notes | | |

---

## Fix now

### 1. The home server crashes on a malformed URL
- **What happens.** `server/server.js` line 51 calls `decodeURIComponent(url.pathname)` outside the `try` block, inside an `async` request handler. A request for `/%` throws `URIError: URI malformed`, which becomes an unhandled promise rejection, and Node 22 exits the process on that.
- **Reproduced.** Started the server locally, `GET /api/ping` returned 200, `GET /%` got no response, and the next `GET /api/ping` was refused. The log shows the `URIError` stack.
- **Why it matters.** Docker's `restart: unless-stopped` brings it back, but every crash drops any backup that was uploading at that moment, and anything on the LAN that probes URLs (a phone's link preview, a scanner) can bounce it in a loop. The public Cloudflare copy has no server, so it is not affected.
- **Fix.** Decode inside a `try`, return 400 on failure. Also add `process.on("unhandledRejection", ...)` and `process.on("uncaughtException", ...)` handlers that log and keep serving, so no future handler bug can take the server down. Add a case to `sync_e2e.js` (it already starts the server) that requests `/%` and then `/api/ping`.
- **Deploy note.** This is a `server/` change, so the NAS container needs a restart after `git pull`.

### 2. Text a grown-up types is inserted into markup without escaping
- **Where.** There is no escaping helper in the file (`esc(` does not exist), and 151 places build HTML with template strings. Most interpolate the game's own data, which is safe. These interpolate parent-typed text raw:
  - Notes from home: the note text in the list and the word bubbles (`n.text`, lines 8085 and 8106) and the "From" field as an attribute value (line 8059).
  - Home server settings: the URL and token as attribute values (lines 8763–8764).
  - Custom words are rendered with `textContent`, which is fine.
- **Effect.** A `"` in the From field truncates the input's value; a `<` in a note breaks the row. This is a robustness bug on a single-user device, not a security problem. It becomes a certain bug in v10.0, when the **hero name** setting is inserted into book pages, Adventure and cut-scenes: a name like `D'Angelo` works, but a stray quote breaks a page.
- **Fix.** One helper, `esc=s=>String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))`, applied at the sites above and used for the hero name from day one. A jsdom case in `regress.js` can render a note containing `<b>"x"</b>` and check it shows literally.

### Also now: line endings (#16)
One `.gitattributes` line and a `\r`-tolerant split in `version_check.js`, so `npm test` is green on the Windows machine as well as in CI. Details under #16.

---

## Refactor at the start of v9.3

### 3. There is no single place where a mode opens or closes
- **Today.** Overlays are `.overlay` elements toggled by `show(id)`/`hide(id)` (13 distinct ids go through them), but 10 more overlays are created on the fly with `ov.classList.add("on")` (the report, Picture It, the "played on another device" sheet, and others), and two of the largest modes are not overlays at all: the Mine is `#mineMode.on`, and Adventure is `body.exploring`. Wilds, Races, Write It, Animal Care and the Mine each have their own `enter()` or `start()`.
- **Why it matters now.** The roadmap's v9.3 needs per-mode minutes and opens, and v10.0 needs a gate on entering the Mine, a Race or a Job. Without one chokepoint both features become 15 scattered call sites, each easy to miss, and the minutes tick cannot tell which mode is on top when a Read overlay opens inside the Mine.
- **Recommendation.** A small `Modes` module:
  - `Modes.open(id, el)` and `Modes.close(id)` keep a stack of open modes and stamp `data-mode` on the root element. `show()`/`hide()` call them for overlays; the Mine, Adventure and the `enter()`/`start()` functions call them directly. Dynamically created overlays get a `data-mode` too.
  - `Modes.top()` returns the innermost open mode, or `"valley"`.
  - The existing minutes tick credits `Modes.top()`; open counts increment in `Modes.open`.
  - The ticket gate in v10.0 becomes one check inside `Modes.open` for the gated ids.
- **Safety.** Behaviour does not change; only bookkeeping is added. Every existing e2e suite exercises the entry points, so a missed call site shows up as a mode that never appears in the report, which the new `modes_e2e.js` should assert against a list of all mode ids.

### 4. The save schema is spread out and migrations are not versioned
- **Today.**
  - `def()` has a `v:5` field that nothing reads.
  - `migrate()` runs the whole block-building-era conversion on every boot (refunds, folding doubles, trimming). It is idempotent, but every new release adds to an unversioned function that can never be simplified.
  - Fifteen fields are created lazily outside `def()`: `mine` (a 20-field object built inside the Mine module), `adv`, `quest`, `comp` (14 guard sites), `skills`, `skillMiss`, `treats`, `rushes`, `write`, `mybooks`, `library`, `notes`, `sync`, `minutes` and `answers`. Seven fields that *are* in `def()` (`timers`, `daily`, `vehicles`, `pace`, `buddy`, `blueprints`, `badges`) still carry redundant `||` guards, which shows nobody trusts the schema to be complete.
  - Load is `Object.assign(def(), saved)`, a shallow merge. Only `settings` gets a nested merge, by hand in `migrate()`. A new key added inside an existing object (say `mine.look.cape`) gets no default.
- **Why it matters now.** The roadmap adds `modeMin`, `modeOpens`, `tickets`, `hero`, `jobs`, `tracks`, `owned`, `books[id].together`, and later `jobs.badges`. Each one would become another lazy-init site or another hand-written line in `migrate()`. The rule "never break old saves" is easier to keep with one schema and a list of numbered steps.
- **Recommendation.**
  - `def()` becomes the complete schema, including the nested objects the modules create today (`mine`, `sync`, `comp`, `answers`, `minutes`, ...). Modules keep their `if(!state.mine)` guards for one release, then drop them.
  - A `defaults(target, def)` deep-fill for plain objects, used at load and in `restoreBackup()` (which also does `Object.assign(def(), st)` today).
  - `MIGRATIONS = [fn0, fn1, ...]`, run as `while(state.v < MIGRATIONS.length) MIGRATIONS[state.v++](state)`. The current `migrate()` body becomes step 0 for saves without a version, and is never touched again. The rename of "Mine jobs" to "Mine tasks" and the hats-to-store move in v10.1 become steps 1 and 2.
  - Keep the one-time toasts ("Tidied up!", "Your old blocks became N gems") inside step 0 so old saves still see them once.
- **Tests.** Save fixtures from v5, v8 and v9.2 (the e2e files already contain several `st` objects to seed from) loaded through the new path, asserting gems, hats, mine coins, books read and settings survive and that `state.v` ends at the latest number. This is the one refactor that can silently lose progress, so it deserves fixtures over reasoning.

---

## Refactor with the feature that needs it

### 5. Tests: boilerplate is copied 22 times and waits are fixed sleeps (v10.0, first new suite)
- **Today.** 22 Playwright files each start their own HTTP server on a hard-coded port (8791, 8805, ...), launch Chromium, install the same `__answer` helper and seed a hand-built `st` object. 5 jsdom files do the same with JSDOM. There is no shared helper; 1,922 lines of tests. Fixed `waitForTimeout` sleeps appear 280 times (41 in `v8_e2e.js`, 32 each in `mine2_e2e.js` and `reading_e2e.js`). Recent commits ("wait for the block instead of fixed sleeps", "wait for the riddle and rescue to pay out") show the cost is already being paid. The CI budget is 45 minutes.
- **Roadmap impact.** v9.3 to v10.1 add about eight suites (`modes`, `books2`, `together`, `tickets`, `hero`, `jobs`, `tracks`, `store`). Copying the boilerplate eight more times is the path of least resistance and the wrong one.
- **Recommendation.** `tests/lib.js` with: `launch({seed, port})` that serves `app/`, opens the page, installs `__answer`, collects `pageerror`; `waitFor(page, predicate, timeout)`; `seed(partial)` that deep-merges onto a small known-good base save; and `ok/fail` reporting in the format `run-all.js` greps for. New suites use it. Existing suites move over only when touched. Ports come from a counter so two runs can overlap.
- **Timing.** The full suite took 21 minutes on this machine (see the last section), about 45 seconds per file, most of it fixed sleeps. Eight more suites at the same pace adds six minutes to every run and to CI. `waitFor` in place of sleeps would likely halve the total.

### 6. The voice text list is kept by hand (v10.0, first new book)
- **Today.** `tools/voice/voice_texts.json` holds 560 words and 1,280 sentences. The sentences are already expanded per pet ("ash and his bat make a snowman", "ash and his cat make a snowman", ...): 355 entries contain "ash". Nothing generates this file from `index.html`; `gen.py` and `index.py` only read it. `voice_e2e.js` checks that one word and one sentence play from clips and that unknown lines fall back to the device voice. No test checks that every book page or quiz question has a clip.
- **Roadmap impact.** v10.0 adds 18 books of 5–7 pages plus quiz questions, times the pet variants, plus the hero name placeholder. Hand-expanding that into JSON is error-prone, and a missed line silently falls back to the device voice, which is exactly the inconsistency the clip voice was introduced to remove.
- **Recommendation.** `tools/voice/extract.js` (Node, no dependencies): loads `app/index.html` in jsdom the way `regress.js` does, reads `BOOKS`, the quiz questions, the `QUEST_POOL` texts, the fixed `buddySay`/`toast` strings it can find, expands `{pet}` over the pet list and `{hero}` over the default name, and writes `voice_texts.json` sorted, so a diff shows exactly which lines are new. Then a `voice_cov` test: every BOOKS page and quiz string, after `norm()`, is a key in `app/voice/index.json`. The hero-name work regenerates the 355 clips that say "Ash" as "Asher".

### 7. The 24 books are one 16 KB line (with #6)
- `BOOKS` is a single JSON line (line 7030). Reviewing a new book in a diff is impossible, and a typo in one bracket is a syntax error in the game's only `<script>` block, so nothing runs at all, not even the last-resort error guard, which lives in the same block. `lv_e2e.js` would catch it, but only if the tests are run.
- **Recommendation.** Keep it in `index.html`, but one book per line, with a comment header giving the page tuple format (`[text, [[art, x, scale, y?], ...]]`). `lv_e2e.js` and `reading_e2e.js` already validate art references and scenes, so a reformat is safe to verify.

### 8. "Answer once" guards are re-implemented per module (v10.1, Jobs kits)
- `Read.pic`/`wordPick`/`sentence` use a local `fin` flag; the crate loop uses `cur._lock` and `cur._paid`; the Mine uses `.paid`; other modules use `locked`. All do the same thing: accept the first correct tap, ignore repeats, pay once.
- **Recommendation.** A `once(done)` wrapper in the `Read` module that the kits use, and that new code adopts. Existing sites are fine as they are; the guards test (`guards_e2e.js`) already covers them.

---

## Worth knowing, no action needed now

### 9. Older iPad Safari compatibility
- The banned features are absent: no `.at()`, `structuredClone`, `:has()`, `??`, `?.`, `replaceAll`, regex lookbehind, class fields, logical assignment or top-level await. `flat()` (7 uses) is Safari 12+.
- CSS uses flex `gap` 118 times (Safari 14.1+), the `inset` shorthand 27 times (14.1+) and `aspect-ratio` 7 times (15.0+). The `.at()` rule implies the iPad is below iOS 15.4, so 15.0–15.3 works fully and 14.x would lose `aspect-ratio`. **Suggestion:** write the iPad's actual iOS version into `CLAUDE.md` so the rule is exact rather than inferred.

### 10. What the 1.9 MB is
| Part | Size |
|---|---|
| Fluent Emoji art (`FLU`, 44 SVGs in one string) | 521 KB |
| OpenMoji creature art (32 long lines) | ~230 KB |
| JavaScript (everything else) | 1,044 KB |
| CSS | 110 KB |

If the file ever needs splitting, art is the lever, not content: the roadmap's deferred `app/content/*.json` idea would move tens of kilobytes, while the art is 750 KB. A cheaper first step is running the SVGs through an optimiser (they carry `transform='scale(1.38889)'` wrappers and full-precision paths); 30–50 % is typical with no structural change. Boot on the iPad has not been measured; measure before optimising.

### 11. Errors are swallowed silently
98 `catch(e){}` blocks, two `console.warn`, and a last-resort `window.onerror` that redraws the valley. The tests collect `pageerror`, so nothing is hidden in CI, but on the iPad there is no way to learn why something misbehaved. **Optional:** a 20-entry ring buffer of `window.onerror` and `unhandledrejection` messages, kept outside the save, shown under Grown-up → About. Twenty lines of code; useful the first time an iPad-only bug appears.

### 12. Multi-device sync is last-writer-wins with a heuristic
Automatic backups skip when another device has read more words; the "played on another device" sheet offers to load the other save. Two devices each making different progress in the same day lose one side. Fine for one child on one iPad plus the occasional second device, and the manual backup and restore buttons cover the rest. Worth a sentence in `design.md` so nobody expects a merge.

### 13. Server
Path traversal is guarded (`normalize` + `startsWith`). The body limit is 300 MB (recordings are in the payload), the token is optional, and `/api/*` answers CORS `*`. All acceptable on a home LAN, and the public copy has no API at all. After #1 there is nothing pressing.

### 14. Service worker
Stale-while-revalidate for the shell, cache-first for clips, network-first for `voice/index.json` with cache fallback, old caches cleared on activate, voice cache kept across builds. Correct as is. If `app/content/*.json` ever arrives, add it to the `SHELL` list or give it the voice treatment, and extend `pwa_e2e.js`.

### 15. Docs and stale copies
- `docs/design.md` sections 1–10 are the v0.1 plan: JSON packs, TypeScript, Vite, Phaser, React overlays, Dexie. None of it was built, and section 8 still reads as a recommendation. A one-paragraph note at the top ("Sections 1–10 are the original plan; the build diverged from section 11 on") stops a future reader, or a future coding agent, from following it.
- `src/modules/` holds copies of modules as inserted up to v9 and `src/history/` the one-time patch scripts. `CLAUDE.md` already marks them reference-only, but they still show up in every search. Consider moving both under `docs/history/` so `src/` stops looking like source.

### 16. Git line endings make the version check fail on Windows
- **What happens.** `.gitattributes` only marks `mp3`, `png` and `m4a` as binary, and this machine has `core.autocrlf=true`, so the working copy of `index.html` has CRLF endings (10,220 carriage returns). The strict-mode check added to `version_check.js` in commit `068b3e8` takes the first line after `<script>` and compares it to `"use strict";` exactly. On this checkout that line is `"use strict";\r`, so the test fails here and passes on Linux CI.
- **Effect.** `npm test` cannot print all-PASS on the development machine, which is the gate the workflow in `CLAUDE.md` relies on before `npm run release`. It also produced `LF will be replaced by CRLF` warnings on every git command during this audit and a line-endings-only rewrite of `package-lock.json` after `npm install`.
- **Fix, both halves.** In `.gitattributes`, add `* text=auto eol=lf` so every checkout is LF (then `git add --renormalize .` once). In `version_check.js`, split on `/\r?\n/` so the test is correct regardless of checkout. Tiny.

### 17. Small things seen in passing
- Three `buddySay` lines are template strings with variables inside, so they can never have a clip and always use the device voice. Rephrase them as a fixed line plus a spoken number if the inconsistency is noticeable.
- The dynamically created overlays (report, Picture It, "played on another device") have no `id`. Item #3 gives them a `data-mode`.
- `run-all.js` waits a fixed 800 ms for its two servers, uses fixed ports (8799 and 8804) and spawns the servers with `stdio:"ignore"`. If either port is already held (a previous run that was interrupted, for example), the new server dies silently on `EADDRINUSE`, and the failure surfaces 20 minutes later as `sync_e2e.js` or `voice_e2e.js` failing to load the page. That is exactly what happened during this audit's first full run. **Fix:** have the runner `GET /api/ping` on both ports before starting any test and stop with a clear message if either does not answer. Ten lines.

---

## Suggested order
1. **This week, as v9.2.2:** #1, #2 and #16, with their tests. One `server/` change (restart the container), one `app/` change, and two one-line fixes in `.gitattributes` and `version_check.js`.
2. **First commits of the v9.3 branch:** #3 and #4, each in its own commit with the suite green, before the per-mode tracking and daily goal are built on top of them.
3. **As the roadmap reaches them:** #5 with the first new suite, #6 and #7 with the first new book, #8 with the Jobs kits.
4. **Whenever convenient:** #15 and #16.

## Test suite status on this machine
Run on 27 Sept 2026 against commit `bd6c731` (Windows 11, Node 22.15, Chromium via Playwright 1.56), after `npm install` and `npx playwright install chromium`.

| Result | Files |
|---|---|
| Passed | 27 of 28: every e2e and jsdom suite, including `sync`, `voice` and `multi` on a clean run |
| Failed | `version_check.js`, on its new strict-mode line only, because of CRLF (see #16). The version match itself passes. |
| Duration | 21 minutes for the full suite (19:51 to 20:12), about 45 s per file |

Two notes from the run itself:
- The first full run also failed `sync_e2e.js` and `voice_e2e.js`. That was the runner's silent port collision described under #17, caused by an interrupted earlier run, not by the game. Rerunning `node tests/run-all.js sync voice multi` passed all three.
- `npm install` rewrote `package-lock.json` in line endings only (no content change); it was restored with `git checkout`. That is the same CRLF issue as #16.
