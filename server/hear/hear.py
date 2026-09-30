"""Wordcraft Valley listener: the home server's ears (tier A of "Talk to me").

A small HTTP server beside the backup server. The game records a short clip
(1-4 s) of Asher answering a question and the backup server passes it here
with the answers the question allows. Whisper (faster-whisper, base.en, CPU,
int8) transcribes it with those answers as its prompt, and each answer is
scored against what it heard, so the game gets "cat 0.94" rather than free
text: picking one of three words is a much easier job than transcribing.

  GET  /hear  (or /health)  -> 200 {ok:true, model, ready:true} once the model is loaded,
                               503 {ok:false, ready:false} while it loads (the first start downloads it)
  POST /hear                <- the audio as the body (audio/mp4 from the iPad, audio/webm from Chrome;
                               PyAV decodes both), with the answers in an X-Expect header (a JSON list,
                               URI-encoded or not) and an optional X-Prompt; or multipart/form-data
                               with the fields audio, expect (JSON list or "a, b, c") and prompt
                            -> {text, best, scores:{answer: 0..1}, ms}

Nothing is stored: the clip is transcribed in memory and let go.
Environment: HEAR_PORT (9000), HEAR_MODEL (base.en), HEAR_THREADS (2).
The model lives in ~/.cache/huggingface (mount a volume there so it is downloaded once).

`python hear.py --selftest` checks the scoring alone (no model, no packages needed).
"""
import io
import json
import os
import re
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("HEAR_PORT", "9000"))
NAME = os.environ.get("HEAR_MODEL", "base.en")
THREADS = int(os.environ.get("HEAR_THREADS", "2"))
MAX_BODY = 8 * 1024 * 1024  # a 4 s clip is well under 200 KB

# ---------------------------------------------------------------- scoring
# spoken numbers as the game writes them (the Numbers questions use digits)
NUM_WORDS = {"zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6",
             "seven": "7", "eight": "8", "nine": "9", "ten": "10", "eleven": "11", "twelve": "12",
             "thirteen": "13", "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17",
             "eighteen": "18", "nineteen": "19", "twenty": "20"}
# words that sound like a number, used only when every answer is a number
NUM_SOUNDS = {"oh": "0", "won": "1", "to": "2", "too": "2", "tu": "2", "for": "4", "fore": "4",
              "ate": "8", "tin": "10", "sics": "6", "sicks": "6"}
# other ways a child says yes or no, used when yes or no is one of the answers
SAME = {"yeah": "yes", "yep": "yes", "yup": "yes", "yea": "yes", "ya": "yes", "yah": "yes", "yess": "yes",
        "nope": "no", "nah": "no", "know": "no", "noo": "no"}


def words(s):
    """lower case, letters, digits and apostrophes only, split into words"""
    s = str(s or "").lower().replace("’", "'")
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return [w.strip("'") for w in s.split() if w.strip("'")]


def fold(s):
    """a rough sound-alike spelling: c/k, ph/f, ck, qu, wh, kn, wr, x, doubled letters"""
    s = re.sub(r"[^a-z0-9]", "", str(s).lower())
    for a, b in (("ph", "f"), ("ck", "k"), ("qu", "kw"), ("wh", "w"), ("kn", "n"), ("wr", "r")):
        s = s.replace(a, b)
    s = re.sub(r"c(?=[eiy])", "s", s)
    s = s.replace("c", "k").replace("q", "k").replace("x", "ks")
    return re.sub(r"(.)\1+", r"\1", s)


def lev(a, b):
    """edit distance"""
    if a == b:
        return 0
    if not a or not b:
        return max(len(a), len(b))
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def closeness(a, b):
    """1 for the same sound-alike spelling, 0 for nothing alike"""
    fa, fb = fold(a), fold(b)
    if not fa or not fb:
        return 0.0
    return max(0.0, 1.0 - lev(fa, fb) / max(len(fa), len(fb)))


def canon(tokens, expect):
    """number words to digits, and yeah/nope to yes/no, when the answers are that kind"""
    exp = [" ".join(words(e)) for e in expect]
    numeric = all(re.fullmatch(r"\d+", e or "") for e in exp)
    out = []
    for t in tokens:
        if t in NUM_WORDS:
            t = NUM_WORDS[t]
        elif numeric and t in NUM_SOUNDS:
            t = NUM_SOUNDS[t]
        elif t in SAME and SAME[t] in exp:
            t = SAME[t]
        out.append(t)
    return out


def score(text, expect):
    """{answer: 0..1}: how close the best stretch of what was heard is to each answer"""
    heard = canon(words(text), expect)
    scores = {}
    for e in expect:
        want = canon(words(e), expect)
        if not want or not heard:
            scores[e] = 0.0
            continue
        k, best = len(want), 0.0
        target = "".join(want)
        for n in {max(1, k - 1), k, k + 1}:
            for i in range(0, max(1, len(heard) - n + 1)):
                piece = heard[i:i + n]
                if not piece:
                    continue
                c = 1.0 if piece == want else closeness("".join(piece), target)
                # a longer stretch than the answer is a little less likely to be it
                if len(piece) != k:
                    c *= 0.9
                # and an answer that is all he said beats one that is a part of it ("ice cream" over "cream")
                c *= 0.9 + 0.1 * len(piece) / len(heard)
                best = max(best, c)
        scores[e] = round(best, 3)
    return scores


def best_of(scores, expect):
    top = None
    for e in expect:
        if top is None or scores.get(e, 0) > scores.get(top, 0):
            top = e
    return top if top is not None and scores.get(top, 0) > 0 else None


# ---------------------------------------------------------------- the model
MODEL = None
LOAD_ERROR = None
LOCK = threading.Lock()


def load():
    global MODEL, LOAD_ERROR
    try:
        from faster_whisper import WhisperModel
        t = time.time()
        MODEL = WhisperModel(NAME, device="cpu", compute_type="int8", cpu_threads=THREADS)
        print(f"listener: {NAME} ready in {time.time() - t:.1f} s", flush=True)
    except Exception as e:  # keep answering health checks with the reason
        LOAD_ERROR = str(e)
        print("listener: the model did not load:", e, flush=True)


def default_prompt(expect):
    """'Cat. Cot. Cap.': the answers as short sentences (it worked best on the game's own word clips)"""
    return " ".join(e[:1].upper() + e[1:] + ("" if e.endswith((".", "?", "!")) else ".") for e in expect)


def transcribe(audio, expect, prompt):
    prompt = prompt or default_prompt(expect)
    with LOCK:
        segs, _info = MODEL.transcribe(
            io.BytesIO(audio), language="en", beam_size=5, temperature=0.0,
            initial_prompt=prompt, condition_on_previous_text=False, without_timestamps=True,
            # the speech detector keeps a silent clip from coming back as the prompt's words
            vad_filter=True, vad_parameters={"min_silence_duration_ms": 300})
        parts = [s.text.strip() for s in segs if not (s.no_speech_prob > 0.6 and s.avg_logprob < -1.0)]
    return " ".join(p for p in parts if p).strip()


# ---------------------------------------------------------------- HTTP
def parse_expect(raw):
    if raw is None:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", "replace")
    raw = raw.strip()
    for cand in (raw, urllib.parse.unquote(raw)):
        try:
            v = json.loads(cand)
            if isinstance(v, list):
                return v
        except ValueError:
            pass
    return [x.strip() for x in raw.split(",")]


def multipart(ctype, body):
    from email.parser import BytesParser
    from email.policy import HTTP
    msg = BytesParser(policy=HTTP).parsebytes(b"Content-Type: " + ctype.encode("latin-1") + b"\r\n\r\n" + body)
    out = {}
    for part in msg.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if name:
            out[name] = part.get_payload(decode=True) or b""
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "wordcraft-hear/1"

    def send(self, code, obj):
        b = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, fmt, *args):  # one short line per request
        sys.stdout.write("listener: " + (fmt % args) + "\n")
        sys.stdout.flush()

    def do_GET(self):
        if self.path.split("?")[0] not in ("/hear", "/health", "/"):
            return self.send(404, {"error": "not found"})
        if MODEL is not None:
            return self.send(200, {"ok": True, "model": NAME, "ready": True})
        if LOAD_ERROR:
            return self.send(503, {"ok": False, "ready": False, "error": LOAD_ERROR})
        return self.send(503, {"ok": False, "ready": False, "error": "loading the model"})

    def do_POST(self):
        if self.path.split("?")[0] != "/hear":
            return self.send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = 0
        if n <= 0 or n > MAX_BODY:
            return self.send(400 if n <= 0 else 413, {"error": "no audio" if n <= 0 else "too big"})
        body = self.rfile.read(n)
        ctype = self.headers.get("Content-Type") or ""
        prompt = self.headers.get("X-Prompt")
        if ctype.lower().startswith("multipart/form-data"):
            try:
                f = multipart(ctype, body)
            except Exception:
                return self.send(400, {"error": "bad form"})
            audio, expect = f.get("audio", b""), parse_expect(f.get("expect"))
            if f.get("prompt"):
                prompt = f["prompt"].decode("utf-8", "replace")
        else:
            audio, expect = body, parse_expect(self.headers.get("X-Expect"))
        if prompt:
            prompt = urllib.parse.unquote(prompt)[:200]
        if not isinstance(expect, list) or not 1 <= len(expect) <= 6 or \
                not all(isinstance(e, (str, int)) and 0 < len(str(e).strip()) <= 40 for e in expect):
            return self.send(400, {"error": "expect is a list of 1 to 6 answers"})
        expect = [str(e).strip() for e in expect]
        if not audio:
            return self.send(400, {"error": "no audio"})
        if MODEL is None:
            return self.send(503, {"error": LOAD_ERROR or "loading the model"})
        t = time.time()
        try:
            text = transcribe(audio, expect, prompt)
        except Exception as e:
            return self.send(422, {"error": "could not hear that clip: " + str(e)[:200]})
        scores = score(text, expect)
        return self.send(200, {"text": text, "best": best_of(scores, expect), "scores": scores,
                               "ms": int((time.time() - t) * 1000)})


# ---------------------------------------------------------------- self-test
def selftest():
    fails = 0

    def ok(c, m):
        nonlocal fails
        fails += 0 if c else 1
        print(("PASS " if c else "FAIL ") + m)

    s = score("Cat.", ["cat", "cot", "cap"])
    ok(s["cat"] == 1 and s["cot"] < .8 and s["cap"] < .8 and best_of(s, ["cat", "cot", "cap"]) == "cat", "hear.py: an exact word scores 1 " + json.dumps(s))
    s = score("kat", ["cat", "cot", "cap"])
    ok(s["cat"] == 1, "hear.py: c and k sound alike " + json.dumps(s))
    s = score("I think it's the fone", ["phone", "bone"])
    ok(s["phone"] >= .9 and s["bone"] < s["phone"] - .1, "hear.py: ph and f sound alike, in a longer sentence " + json.dumps(s))
    s = score("Three.", ["2", "3", "4", "5"])
    ok(s["3"] == 1 and best_of(s, ["2", "3", "4", "5"]) == "3", "hear.py: a number word is its digit " + json.dumps(s))
    s = score("to", ["1", "2", "3"])
    ok(s["2"] == 1, "hear.py: 'to' is two when every answer is a number " + json.dumps(s))
    s = score("to the shop", ["top", "shop"])
    ok(s["shop"] > .9 and s["top"] < .7, "hear.py: 'to' stays a word when the answers are words " + json.dumps(s))
    s = score("Yeah!", ["yes", "no"])
    ok(s["yes"] == 1 and s["no"] < .5, "hear.py: yeah is yes " + json.dumps(s))
    s = score("Nope.", ["yes", "no"])
    ok(s["no"] == 1 and s["yes"] < .5, "hear.py: nope is no " + json.dumps(s))
    s = score("", ["cat", "dog"])
    ok(s == {"cat": 0, "dog": 0} and best_of(s, ["cat", "dog"]) is None, "hear.py: nothing heard scores 0 and has no best")
    s = score("the sun is hot", ["sun", "cat"])
    ok(s["sun"] >= .9 and s["cat"] < .5, "hear.py: the answer inside a sentence " + json.dumps(s))
    s = score("ice cream", ["ice cream", "cream"])
    ok(s["ice cream"] == 1 and s["cream"] < 1, "hear.py: a two-word answer beats the part of it " + json.dumps(s))
    ok(fold("buzz") == "buz" and fold("kick") == "kik" and fold("city") == "sity", "hear.py: the fold")
    ok(default_prompt(["cat", "cot", "3"]) == "Cat. Cot. 3.", "hear.py: the prompt is the answers as short sentences")
    ok(parse_expect('["a","b"]') == ["a", "b"] and parse_expect(urllib.parse.quote('["a b","c"]')) == ["a b", "c"]
       and parse_expect("a, b") == ["a", "b"], "hear.py: expect as JSON, URI-encoded JSON, or a list with commas")
    print(f"hear.py selftest: {fails} failed")
    return fails


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        sys.exit(1 if selftest() else 0)
    threading.Thread(target=load, daemon=True).start()
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    srv.daemon_threads = True
    print(f"listener on :{PORT} ({NAME}, {THREADS} threads); loading the model", flush=True)
    srv.serve_forever()
