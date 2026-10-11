"""What gen.py, index.py and check.py share: a line's key, its clip's file name, and the leading-vowel check."""
import re,hashlib,numpy as np
# REV is part of every clip's name. The server sends clips as immutable and the iPad keeps them for good, so a clip
# made another way needs another name: bump REV when the way clips are made changes, then run gen.py and index.py
# (index.py drops the old takes from app/voice), and move VOICE in app/sw.js and VOICE_SINCE in app/index.html on.
#   2 (Oct 2026): the model speaks at its own pace and ffmpeg slows the clip. Before, the model was asked to speak
#     slowly, which put a short vowel in front of most lone words ("uh-cat").
REV=2
norm=lambda t:re.sub(r"\s+"," ",re.sub(r"[^a-z0-9' ]+"," ",t.lower().replace("’","'"))).strip()
name=lambda key:hashlib.sha1(f"{REV}:{key}".encode()).hexdigest()[:12]+".mp3"
# a key that starts with an unvoiced sound (s, f, p, t, c, k, q; not th, kn, ps): the only starts lead() can judge
UNVOICED=re.compile(r"^(s|f|p(?!s)|t(?!h)|c|k(?!n)|q)")
def lead(x,sr):
    """How many 10 ms frames right after the clip's first sound are loud (within 12 dB of its loudest frame) and
    voiced (over 80 % of their energy under 600 Hz) before any noise is heard (a frame with under half its energy
    down there: a hiss, a burst). It looks at eight frames. An unvoiced first sound is noise, so three or more
    voiced frames in front of it is a vowel that should not be there. A short k or p straight into its vowel
    ("can the...") counts nothing: the noise comes first."""
    x=np.asarray(x,dtype=np.float32);h=int(sr*.01)
    if len(x)<12*h:return 0
    rms=np.array([np.sqrt(np.mean(x[i:i+h]**2)) for i in range(0,len(x)-h,h)])+1e-9
    db=20*np.log10(rms/rms.max());i0=int(np.argmax(db>-30));n=0
    fr=np.fft.rfftfreq(h,1/sr);win=np.hanning(h)
    for j in range(i0,min(len(db),i0+8)):
        sp=np.abs(np.fft.rfft(x[j*h:(j+1)*h]*win))**2;low=sp[fr<600].sum()/(sp.sum()+1e-12)
        if low<.5:break
        if db[j]>-12 and low>.8:n+=1
    return n
