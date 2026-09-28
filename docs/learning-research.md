# What the reading research says, and a voice-only mode

Date: 27 Sept 2026. Companion to [roadmap-v10.md](roadmap-v10.md) and [pre-roadmap-audit.md](pre-roadmap-audit.md).

Two parts. **Part 1** lists the teaching techniques with the strongest evidence for a six-year-old learning to read, what the game already does about each, and what to change, with the roadmap phase it belongs in. **Part 2** explores a voice-only mode: what is technically realistic on the home iPad, what children's speech recognition can and cannot do in 2026, and a design that never punishes a misheard answer.

Sources are linked at the end. Where a claim is settled science it is cited to the standard review; where it is new (2024–2026) it says so.

---

## Part 1 — Effective methods and how the game measures up

### The short list
| # | Technique | Strength of evidence | Game today | Change |
|---|---|---|---|---|
| 1 | Explicit, systematic phonics with letters, not sound-only drills | Very strong (NRP 2000; Castles, Rastle & Nation 2018; PA-only meta-analysis 2024) | Aligned: 12 levels, tiles, Build it | None |
| 2 | Connected phonation when blending ("mmmaaat", not "m – a – t") | Strong, one RCT with kindergartners (Gonzalez-Frey & Ehri 2021) | Sounds are played one by one | Add a continuous blend to the sound demo and the Kokoro clips |
| 3 | Orthographic mapping for tricky words: map the regular letters, learn only the odd bit by heart | Strong (Ehri 2014) | Aligned: ♥ marks the irregular part | Keep; make sure tricky words still go through Build it |
| 4 | Set for variability: "flex" the vowel and check against a word you know | Growing; 2025 RCT with 273 Grade 2–3 children | Absent | Add a "try the other sound" hint from level 5 |
| 5 | Encoding (spelling and writing) strengthens decoding | Strong (Weiser & Mathes 2011; Graham & Santangelo 2014) | Aligned: Build it, Write It, spelling share 60 % | Later: dictate short sentences |
| 6 | Decodable connected text every day | Strong (IES practice guide 2016; Cheatham & Allor 2012) | 24 books, decode-checked | v10.0 adds 18 books at his level |
| 7 | Repeated and assisted reading with a model reader | Strong (Therrien 2004; Stevens, Walker & Vaughn 2017) | Absent | v10.0 "Read it again" and Read with Dad echo mode |
| 8 | Shared reading with a parent, with questions | Strong (Whitehurst 1988; Mol & Bus 2011) | Notes from home; Read-to-your-pet | v10.0 Read with Dad; dialogic prompts (Part 2) |
| 9 | Retrieval practice on an expanding schedule, continued after mastery | Very strong (Roediger & Karpicke 2006; Cepeda et al. 2006; Rawson & Dunlosky 2011) | Review at 3/10/30 crates, stops at mastery | v9.3 retention reads at 30/90; extend to sound patterns |
| 10 | Interleave confusable patterns so he learns to tell them apart | Strong (Rohrer 2012) | Partly: crates mix two levels, look-alike distractors | Deliberate minimal pairs when a skill is shaky |
| 11 | High success rate (about 80 %) with hints on the second miss | Strong (Rosenshine 2012) | Aligned: 85 % rule, hint after 2 misses | None |
| 12 | Immediate, specific corrective feedback | Strong (Hattie & Timperley 2007) | "no boost this time", the right one glows | Name the confused sound |
| 13 | Short, frequent sessions | Very strong (spacing literature) | Session timer | v9.3 daily goal with a finish line |
| 14 | Learning content inside the core mechanic, not as a toll | Strong for games (Habgood & Ainsworth 2011; gamification meta-analysis 2025) | Founding principle; the ticket gate cuts against it | Measure; prefer designs where reading is the action |
| 15 | Forming letters by hand beats typing for letter learning | Moderate (James & Engelhardt 2012) | Aligned: Write It tracing | None |

### What each one means for the game

**1. Phonics with print, not without.** The game's whole design is explicit, systematic, letter-based phonics, which is where the evidence is strongest. A 2024 meta-analysis of 38 studies (3,880 children, preschool to Grade 1) found phonological-awareness-only instruction less effective than print-based instruction, and weaker for word reading than for awareness itself. So: no letter-free clapping or rhyming games as a separate mode. Rhyme and first-sound work should stay attached to written words, as the Sound Skills section does.

**2. Connected phonation.** Gonzalez-Frey and Ehri (2021) taught kindergartners (mean age 5.6, exactly his age) to decode nonwords either by breaking the speech stream ("sss – aaa – nnn") or by stretching the sounds without a break ("sssaaannn") before saying the word. The connected group learned faster and transferred better to words with stop consonants, and the error analysis showed segmenting made children forget the first sound by the time they reached the last. The game's letter-sound synth and the "hear the sounds" demo play sounds one at a time. Change: when the game models blending, play a continuous stretched blend before the whole word. This is a voice-clip job (a `blend:` key per word, generated by Kokoro from a stretched spelling such as "mmmaaat", or by concatenating the sound clips with crossfades) and a small change in the Blend it flow. Small, fits v10.0.

**3. Orthographic mapping.** Ehri's account is that every word, regular or not, gets stored by connecting its letters to its sounds; "sight words" are not learned by whole-word visual memory. The game's ♥ mark on the irregular part of a tricky word ("learn this bit by heart") while the rest is sounded out is exactly right. Keep it, and make sure tricky words still take the Build it rung (mapping happens when he spells), rather than only the picture rung.

**4. Set for variability.** English spelling is variable, and a child who reads "break" as "breek" needs a strategy: try the other sound the letters can make and check whether the result is a word he knows. A 2025 cluster-randomised trial with 273 Grade 2–3 children with reading difficulties compared Phonics + Set for Variability against Phonics + Morphology and measured irregular word reading; a 2025 practitioner article in *The Reading Teacher* lays out how to teach it. It is newer than the rest of this list and the effect sizes are modest, but the cost of adopting it here is tiny: from level 5 (silent e, vowel teams), when he misses a word whose vowel has two readings, the buddy says "That didn't sound like a word. Try the other sound for 'ea'," and the tile flips to show the alternative. The `Phonics` ALIAS table already knows the alternatives. Small, v10.0 or later.

**5. Encoding.** Spelling practice improves reading, not just spelling (Weiser & Mathes 2011, a review of encoding instruction; Graham & Santangelo 2014, meta-analysis). Build it and Write It cover this, and the 60 % spelling share is a good default. Later, dictating a short decodable sentence in Write It is the natural next step.

**6 and 7. Connected text, repeated reading, a model reader.** Word-level practice has to be applied in text daily (IES practice guide, recommendation 4). For fluency the two methods with the best record are repeated reading of the same passage and assisted reading where a fluent reader models the text first (Therrien's 2004 meta-analysis; Stevens, Walker and Vaughn 2017). One caution from that literature: timing for speed can trade accuracy for pace. The "Read it again" reread in v10.0 should be framed as "smooth" reading, log the time quietly for the report, and never show a stopwatch to him.

**8. Shared reading and dialogic questions.** Reading with a parent has decades of evidence for language and later reading (Mol & Bus 2011 meta-analysis), and the "dialogic" version, where the adult asks open questions and expands the child's answers (Whitehurst 1988), is the version that moves comprehension. Research on children's apps points the same way: joint use with a parent produces more learning than solo use. Read with Dad is the right feature. Add spoken prompts at page turns that Dad can use ("What do you think the fox will do?"), which is also the most natural home for the voice mode in Part 2.

**9. Retrieval and spacing, after mastery too.** Retrieval practice beats re-study, and spacing beats massing, in hundreds of studies with children included. The game's review queue (3, 10, 30 crates) is a good expanding schedule but it drops a word once mastered, which is where forgetting happens. Rawson and Dunlosky's "successive relearning" (several spaced correct retrievals after the first success) is the model: the v9.3 retention reads at 30 and 90 crates implement it for ♥ words. Extend the same idea to sound patterns via `Skills`, so a shaky pattern gets a spaced check even when its individual words are mastered.

**10. Interleaving.** Mixing confusable items improves discrimination (Rohrer 2012). The game already draws crates from two adjacent levels and picks look-alike distractors in Word pick. A deliberate step: when `Skills` marks a pattern shaky (say -ake vs -ike), the next crates present minimal pairs side by side. Small; fits any release.

**11 and 12. Success rate and feedback.** Rosenshine's synthesis puts the sweet spot for practice at about 80 % success, and the game's 85 % rule with hints after two misses sits there. Feedback is most useful when it says what to do next. The game already records which distractor he picked (`confused`), so on a miss the buddy can name the sound: "That one has the 'i' sound. This word says 'a'." Small change in `Read.pic` and the crate loop.

**13. Short sessions.** Spacing again: ten to fifteen minutes most days beats a long Saturday. The v9.3 daily goal gives a session a natural end.

**14. Intrinsic integration.** Habgood and Ainsworth (2011) built two versions of the same maths game for 7–11-year-olds; in the version where the maths *was* the game mechanic, children learned more under a time limit and chose to play seven times longer when free to stop. A 2025 meta-analysis of 31 K–12 gamification studies found a sizeable pooled effect on motivation (g = 0.65) but more of it on extrinsic than intrinsic motivation, which is a polite way of saying points and badges get attention but do not by themselves make the content wanted. This game's founding line, "reading is never a gate that stops the fun, it is the fun", is the right principle, and it is why crates, signs, notes and word bubbles work. The v10.0 reading-ticket gate is the one planned feature that cuts against it: reading becomes the price of the Mine. The roadmap already treats it as an experiment with a switch-off rule. The better long-term answer is more places where reading *is* the action (a Job task is a good example: reading the order is the work), and fewer where it is the toll.

**15. Handwriting.** Forming letters by hand supports letter recognition more than typing or tracing alone (James & Engelhardt 2012). Write It's free-form letters after tracing are aligned; keep the "from memory" level in the report.

### What the evidence does not support
- **Multisensory drills as such.** A 2021 meta-analysis of Orton-Gillingham-style programmes (Stevens et al.) found no significant advantage over other explicit phonics. The explicit, systematic part carries the effect, not the sand trays. Nothing to add here.
- **Guessing from pictures.** Cueing systems that teach children to predict words from context or pictures are the discredited half of the reading wars. The picture rung in the crate loop is a check, not a cue, and rung 2 ("read it, then prove it") removes the picture before the choice appears. Keep that order, and keep Picture It as a comprehension check on sentences he has already decoded.
- **Realistic expectations for an app.** A recent meta-analysis of 36 studies of educational apps for preschool to Grade 3 (Harvard CEPR, "Measures Matter") finds a moderate average effect of +0.31 SD, larger for constrained skills like letters and phonics and smaller for comprehension. The game is best placed to move decoding, which is what it does. Comprehension and vocabulary come mostly from conversation and being read to, which is why the parent-facing features (Read with Dad, notes, dialogic prompts) matter more than another solo mode.

---

## Part 2 — A voice-only mode

### The idea
He answers by talking. The buddy asks, listens, and responds, with the screen optional: "Say the word." "Which one starts with /s/: sun or cat?" "Did the fox get the box?" "What do you think happens next?" It would let him play eyes-free (in the car), make oral blending a real activity, and turn the book quizzes into a conversation.

### What exists already
- A `Speech` module (section 7 of `index.html`, near the crate loop) using the browser's `SpeechRecognition` for a "🎤 Say it" button on Read-it words. It is off by default (Grown-up setting), asks for five alternatives, pays +2 💎 on a match, and a miss costs nothing ("I heard 'cat'. Try once more, or tap I read it"). This is the right posture and should stay the rule for anything below.
- `Rec`, microphone recording to an IndexedDB blob, used by Read-to-your-pet and Notes from home. So the game can already capture his voice and play it back.
- 1,800 Kokoro clips of every word and sentence, which are usable as reference pronunciations.

### Hard truths about children's speech recognition
- **Children are harder than adults, and six-year-olds harder still.** On MyST, the largest public corpus of children's speech (mostly 8–11-year-olds), stock Whisper models score roughly 13–16 % word error rate; fine-tuning on children's speech brings Whisper-small to about 9 % (2025 papers from several groups). A 2025 study of Dutch children reading aloud, using Whisper prompted with the expected text plus a language model, cut WER from 9.4 % to 5.1 % and lifted reading-mistake detection from F1 0.39 to 0.73. Those are the best published numbers, on older children reading known text in quiet rooms. A six-year-old sounding out "c… a… cat" in a kitchen will do worse. So recognition can be a **bonus signal**, never a judge.
- **The iPad's built-in recogniser is a black box.** Safari's `SpeechRecognition` sends audio to Apple, needs a network, cannot be given the list of expected words, and cannot be tested in Playwright. It works, which is why the current Say it button uses it, but it cannot be the foundation of a mode.
- **Running Whisper in the browser is not realistic on the older iPad.** The WebAssembly build needs SIMD, which Safari only enabled in 16.4; older iOS falls back to scalar code at half speed or worse. The smallest English model is 74 MB and the working set runs to hundreds of megabytes, in a game that already holds a 1.9 MB page and 17 MB of clips. On a newer iPad or a Mac it would run; on the target device it would crawl or crash.
- **The precedent exists.** Google's Read Along runs children's speech recognition on the device, offline once stories are downloaded, and is used in 180 countries. That proves the product idea; it is also a native Android app with Google's own recogniser, which the browser on iOS does not have.

### Recommended architecture: three tiers, chosen at runtime
The game already has one network exception: the home server. That is where the good recogniser can live.

**Tier A, at home: recognition on the NAS.**
- A second small container beside the backup server runs `whisper.cpp` or `faster-whisper` with a children-adapted checkpoint where one is available (the Kid-Whisper line of work), or plain `base.en` otherwise.
- The game posts a clip of 1–4 seconds to `POST /api/hear` with the expected answers, for example `{"expect":["cat","cot","cap"]}`. The server prompts the model with those words (the technique behind the 2025 gains), returns the transcript, and scores each candidate, so the game gets "cat, 0.82" rather than free text. Closed-set scoring among three words is a far easier problem than transcription.
- Latency on a Synology-class CPU: about one to three seconds for `tiny.en`/`base.en` on a three-second clip. The buddy's "hmm, let me think" animation covers it.
- Same rules as backups: the public Cloudflare copy has no server, so the feature quietly switches itself off there; audio is not stored unless the parent turns on "keep his recordings", in which case it goes to the same blob store as everything else.

**Tier B, offline fallback: closed-set matching on the iPad.**
- The question always has a small set of possible answers. Compare the recording with each candidate's reference, using MFCC features and dynamic time warping. This is a few hundred lines of plain JavaScript and runs in well under a second on an old iPad.
- References: the Kokoro clip of each word to start, and, much better, **his own past recordings** of that word (every Say it success and Read-to-your-pet page can bank one). A speaker-dependent template for a three-way choice is a problem this old technique handles well; expect roughly 75–85 % on three options with his own templates, less with only the synthetic voice.
- Also gives two cheap signals the mode needs anyway: "did he say anything" (energy) and "roughly how long did he speak".

**Tier C, anywhere online: the browser recogniser** (what Say it uses today).

At runtime: Tier A if the home server answers `/api/hear`, else B if the word has templates, else C, else the screen.

### How the mode would play
- **Starting it.** A Grown-up setting "Talk to me" and a 🎤 button on the mode bar. In the car a parent picks **Eyes-free**: one big button, every prompt spoken, automatic advance.
- **Question types, in order of how well recognition copes:**
  1. *Say the word.* The word is shown (or, eyes-free, its sounds are played: "/k/ /a/ /t/, what's the word?", which is oral blending, a real skill). Answer set: the word and two look-alikes.
  2. *Which one?* "Which starts with /s/: sun or cat?" "Which rhymes with hat: cap or bat?" Two-way choice; the easiest to recognise.
  3. *Yes or no.* After the buddy reads a page: "Did the fox get the box?" Uses the existing yes/no quiz items.
  4. *Numbers.* Jobs maths: "Three apples and two pears, how many?" Digits are the one thing recognisers get right even from children.
  5. *Open questions.* "Why did the pig get up?" Do not auto-judge. Record it, thank him, and put it in a **Dad's inbox** in the Grown-up menu to listen to later, with the transcript if Tier A produced one. This is the dialogic-reading prompt from Part 1, and the honest use of open speech at his age.
- **Kind rules, non-negotiable.** A misheard answer is never "wrong". Low confidence gets "I didn't quite catch that. Tap the one you said," and the screen choices appear. A confident wrong answer gets the same feedback as a wrong tap. Recognition only ever adds (the +2 bonus) and never subtracts, and every accepted answer is also logged with the tier that accepted it so the report can show how often the mic actually understood him.
- **Testing.** Tier B is testable in Node with synthetic audio (sound clips with noise added, own-voice templates recorded once). Tier A is tested against the server with a small fixture set of recordings. Tier C stays untested, as now.

### Effort and where it fits
| Piece | Size | Depends on |
|---|---|---|
| Tier B matcher, template banking, "Talk to me" flow for question types 1–4 | About 400 lines plus tests | Nothing; could follow v10.0 |
| Tier A container, `/api/hear`, client, prompt-and-score | About 150 lines of Python and 150 of JS | The `server/` fix in the audit (the crash guard), Docker on the NAS |
| Open questions with Dad's inbox | About 100 lines | `Rec`, the Grown-up menu |
| Eyes-free car mode | Small once the above exist | |

Before switching any tier on by default, record about fifty of his answers across the word set and measure: the tier has to be right at least nine times in ten for Tier A, eight in ten for Tier B, on the three-way choices. Below that it stays a bonus button, as Say it is today. Put the first slice (Tier B plus question types 1–3) in v10.2 if the per-mode data shows he uses Say it at all when it is turned on; otherwise leave it on this list.

---

## Sources
Settled reviews and standard citations:
- National Reading Panel (2000), *Teaching Children to Read*; Castles, Rastle & Nation (2018), "Ending the Reading Wars", *Psychological Science in the Public Interest*; IES/WWC Practice Guide (2016), *Foundational Skills to Support Reading for Understanding in K–3*.
- Ehri (2014), "Orthographic Mapping in the Acquisition of Sight Word Reading", *Scientific Studies of Reading*.
- Therrien (2004), *Remedial and Special Education*; Stevens, Walker & Vaughn (2017), *Journal of Learning Disabilities* (fluency interventions).
- Whitehurst et al. (1988), dialogic reading; Mol & Bus (2011), *Psychological Bulletin*.
- Roediger & Karpicke (2006); Cepeda et al. (2006); Rawson & Dunlosky (2011) on retrieval and spacing; Rohrer (2012) on interleaving; Rosenshine (2012), *Principles of Instruction*; Hattie & Timperley (2007), "The Power of Feedback".
- Weiser & Mathes (2011), *Review of Educational Research*; Graham & Santangelo (2014), *Reading and Writing*; James & Engelhardt (2012), *Trends in Neuroscience and Education*; Stevens et al. (2021) on Orton-Gillingham, *Exceptional Children*.

Looked up for this document:
- [Gonzalez-Frey & Ehri (2021), Connected phonation is more effective than segmented phonation](https://www.tandfonline.com/doi/abs/10.1080/10888438.2020.1776290), and the [Reading Rockets summary](https://www.readingrockets.org/resources/resource-library/connected-phonation-more-effective-segmented-phonation-teaching).
- [Barnes (2025), "Ready, Set for Variability, Read!", The Reading Teacher](https://ila.onlinelibrary.wiley.com/doi/10.1002/trtr.70027); [Set for Variability RCT and background](https://link.springer.com/article/10.1007/s11145-021-10134-9).
- [Is phonological-only instruction helpful for reading? A meta-analysis (2024), Scientific Studies of Reading](https://eric.ed.gov/?q=source%3A%22Scientific+Studies+of+Reading%22&id=EJ1444714).
- [Habgood & Ainsworth (2011), intrinsic integration in educational games](https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029); [Kurnaz (2025), meta-analysis of gamification and motivation in K–12](https://onlinelibrary.wiley.com/doi/10.1002/pits.70056).
- [Measures Matter: meta-analysis of educational apps, preschool to Grade 3 (Harvard CEPR)](https://cepr.harvard.edu/resource/measures-matter-meta-analysis-effects-educational-apps-preschool-grade-3-childrens-0); [Silverman et al. (2025), educational technology and literacy meta-analysis](https://journals.sagepub.com/doi/abs/10.3102/00346543241261073).
- Children's speech recognition: [Kid-Whisper](https://arxiv.org/html/2309.07927); [Adapting Whisper for on-device children's ASR (2025)](https://arxiv.org/abs/2507.14451); [Fine-tuning Whisper for children's speech (2025)](https://link.springer.com/chapter/10.1007/978-3-031-97825-8_91); [Improving child speech recognition and reading mistake detection by using prompts (Interspeech 2025)](https://arxiv.org/pdf/2506.11079); [Prompting Whisper for miscue detection (2025)](https://arxiv.org/pdf/2505.23627); [How speech recognition struggles with children's voices](https://the-learning-agency.com/the-cutting-ed/article/how-speech-recognition-systems-struggle-with-childrens-voices/).
- In-browser feasibility: [whisper.cpp WASM example and requirements](https://ggml.ai/whisper.cpp/); [WASM SIMD browser support](https://www.testmuai.com/learning-hub/wasm-simd-browser-support/).
- Precedent: [Read Along by Google](http://readalong.google/) and its [on-device, offline description](https://play.google.com/store/apps/details?id=com.google.android.apps.seekh&hl=en_US).
