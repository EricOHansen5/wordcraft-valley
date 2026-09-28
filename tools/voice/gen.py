import json,sys,os,re,hashlib,subprocess,soundfile as sf,numpy as np
from kokoro_onnx import Kokoro
part,nparts=int(sys.argv[1]),int(sys.argv[2])
OUT="out"
os.makedirs(OUT,exist_ok=True)
d=json.load(open("voice_texts.json"))
norm=lambda t:re.sub(r"\s+"," ",re.sub(r"[^a-z0-9' ]+"," ",t.lower().replace("’","'"))).strip()
items={}
for t in d["words"]:items.setdefault(norm(t),(t,.82))
for t in d["sents"]:items.setdefault(norm(t),(t,.95))
keys=sorted(k for k in items if k)
k=Kokoro("kokoro-v1.0.onnx","voices-v1.0.bin")
done=0
for i,key in enumerate(keys):
    if i%nparts!=part:continue
    f=hashlib.sha1(key.encode()).hexdigest()[:12]+".mp3"
    if os.path.exists(f"{OUT}/{f}") or os.path.exists(f"../../app/voice/{f}"):continue   # already generated, here or in the app
    text,speed=items[key]
    # a lone word reads more naturally with a full stop
    say=text if re.search(r"[.!?]$",text) else text+("." if speed<.9 else "")
    s,sr=k.create(say,voice="af_heart",speed=speed,lang="en-us")
    wav=f"out/_tmp_{part}.wav";sf.write(wav,s,sr)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",wav,"-af","silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse,loudnorm=I=-18:TP=-2",
      "-ac","1","-ar","24000","-c:a","libmp3lame","-b:a","40k",f"{OUT}/{f}"],check=True)
    done+=1
    if done%50==0:print(part,done,flush=True)
print("part",part,"done",done)
