import json,os,shutil
from clips import norm,name
d=json.load(open("voice_texts.json"))
dst="../../app/voice";os.makedirs(dst,exist_ok=True)
keys=set(norm(t) for t in d["words"]+d["sents"]);keys.discard("")
idx={};miss=0
for k in sorted(keys):
    f=name(k)
    if os.path.exists("out/"+f) or os.path.exists(f"{dst}/{f}"):idx[k]=f
    else:miss+=1
for f in set(idx.values()):
    if not os.path.exists(f"{dst}/{f}"):shutil.copy("out/"+f,dst)
# a clip no line uses any more (an older take, a line that left the game) goes, once every line has its clip
keep=set(idx.values());old=[] if miss else [f for f in os.listdir(dst) if f.endswith(".mp3") and f not in keep]
for f in old:os.remove(f"{dst}/{f}")
json.dump(idx,open(dst+"/index.json","w"),separators=(",",":"))
print("clips",len(idx),"missing",miss,"old clips removed",len(old))
