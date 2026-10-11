import json,sys,os,re,subprocess,soundfile as sf,numpy as np
from kokoro_onnx import Kokoro
from clips import norm,name,lead,UNVOICED
part,nparts=int(sys.argv[1]),int(sys.argv[2])
OUT="out"
os.makedirs(OUT,exist_ok=True)
d=json.load(open("voice_texts.json"))
items={}
for t in d["words"]:items.setdefault(norm(t),(t,.82))
for t in d["sents"]:items.setdefault(norm(t),(t,.95))
keys=sorted(k for k in items if k)
# WCV_THREADS=2 (say) keeps each part to that many threads: several parts on a few cores get in each other's way otherwise
if os.environ.get("WCV_THREADS"):
    import onnxruntime as rt
    so=rt.SessionOptions();so.intra_op_num_threads=int(os.environ["WCV_THREADS"])
    k=Kokoro.from_session(rt.InferenceSession("kokoro-v1.0.onnx",so,providers=["CPUExecutionProvider"]),"voices-v1.0.bin")
else:k=Kokoro("kokoro-v1.0.onnx","voices-v1.0.bin")
# The model speaks at about its own pace and ffmpeg slows the clip to the pace wanted (atempo keeps the pitch).
# Asked to speak slowly itself, the model puts a short vowel in front of a lone word ("uh-cat": 25 of 30 test words
# at speed .82, 2 of 30 at speed 1). lead() hears that vowel where a line starts unvoiced; a take that has it is
# made again a little faster or slower, and the cleanest take is kept.
TAKES=(1.0,1.08,.93,1.16)
def take(say,key):
    best=None
    for sp in TAKES:
        s,sr=k.create(say,voice="af_heart",speed=sp,lang="en-us")
        n=lead(s,sr) if UNVOICED.match(key) else 0
        if best is None or n<best[0]:best=(n,sp,s,sr)
        if n<3:break
    return best
done=0;again=0;left=[]
for i,key in enumerate(keys):
    if i%nparts!=part:continue
    f=name(key)
    if os.path.exists(f"{OUT}/{f}") or os.path.exists(f"../../app/voice/{f}"):continue   # already generated, here or in the app
    text,speed=items[key]
    # a lone word reads more naturally with a full stop
    say=text if re.search(r"[.!?]$",text) else text+("." if speed<.9 else "")
    n,sp,s,sr=take(say,key)
    if sp!=TAKES[0]:again+=1
    if n>=3:left.append(key)
    wav=f"out/_tmp_{part}.wav";sf.write(wav,s,sr)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",wav,"-af",f"atempo={speed/sp:.4f},silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse,loudnorm=I=-18:TP=-2",
      "-ac","1","-ar","24000","-c:a","libmp3lame","-b:a","40k","-f","mp3",f"{OUT}/_tmp_{part}.part"],check=True)
    os.replace(f"{OUT}/_tmp_{part}.part",f"{OUT}/{f}")   # whole or not at all: a part stopped half-way leaves no broken clip
    done+=1
    if done%50==0:print(part,done,flush=True)
print("part",part,"done",done,"made again",again,"still with a vowel in front",len(left),left[:40])
