"""Listens to the clips in app/voice for a vowel in front of the first sound ("uh-cat").
Only a line that starts unvoiced (s, f, p, t, c, k, q) can be judged; see lead() in clips.py.
  python check.py           every such word, and 250 such lines picked the same way each time
  python check.py --all     every such line too
Needs ffmpeg on PATH, like gen.py. Exits 1 when more than 3 % of the words have one."""
import json,sys,subprocess,numpy as np
from clips import norm,lead,UNVOICED
app="../../app/voice"
d=json.load(open("voice_texts.json"));ix=json.load(open(app+"/index.json"))
def clip(f):
    raw=subprocess.run(["ffmpeg","-loglevel","error","-i",f"{app}/{f}","-f","f32le","-ac","1","-ar","24000","-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32),24000
bad=False
for kind,most in (("words",10**6),("sents",10**6 if "--all" in sys.argv else 250)):
    keys=[k for k in sorted({norm(t) for t in d[kind]}&set(ix)) if UNVOICED.match(k)]
    if len(keys)>most:keys=sorted(np.random.default_rng(1).choice(keys,most,replace=False))
    hit=[k for k in keys if lead(*clip(ix[k]))>=3]
    print(f"{kind}: {len(hit)} of {len(keys)} with an unvoiced start have a vowel in front",hit[:60],flush=True)
    if kind=="words" and len(hit)>.03*len(keys):bad=True
sys.exit(1 if bad else 0)
