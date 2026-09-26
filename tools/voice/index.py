import json,re,hashlib,os,shutil
d=json.load(open("voice_texts.json"))
norm=lambda t:re.sub(r"\s+"," ",re.sub(r"[^a-z0-9' ]+"," ",t.lower().replace("’","'"))).strip()
keys=set(norm(t) for t in d["words"]+d["sents"]);keys.discard("")
idx={};miss=0
for k in sorted(keys):
    f=hashlib.sha1(k.encode()).hexdigest()[:12]+".mp3"
    if os.path.exists("out/"+f):idx[k]=f
    else:miss+=1
dst="../../app/voice";os.makedirs(dst,exist_ok=True)
for f in set(idx.values()):
    if not os.path.exists(f"{dst}/{f}"):shutil.copy("out/"+f,dst)
json.dump(idx,open(dst+"/index.json","w"),separators=(",",":"))
print("clips",len(idx),"missing",miss)
