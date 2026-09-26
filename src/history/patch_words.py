import io, re, os, glob
P = "/home/claude/work/wordcraft-valley.html"
s = io.open(P, encoding="utf-8").read()

def swap(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f"anchor found {n}x (want {count}) >>> {old[:100]}"
    s = s.replace(old, new)

# ------------------------------------------------------------ 1. word art
def clean(path):
    t = io.open(path, encoding="utf-8").read()
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', t).group(1).split()]
    inner = re.sub(r'^.*?<svg[^>]*>', '', t, flags=re.S); inner = re.sub(r'</svg>\s*$', '', inner, flags=re.S)
    inner = re.sub(r'<!--.*?-->', '', inner, flags=re.S); inner = re.sub(r'\s+id="[^"]*"', '', inner)
    inner = re.sub(r'>\s+<', '><', inner); inner = re.sub(r'\s{2,}', ' ', inner).strip().replace('"', '\\"')
    k = 100.0 / max(vb[2], vb[3]); tr = f"scale({k:.5f})"
    if vb[0] or vb[1]: tr += f" translate({-vb[0]},{-vb[1]})"
    return f"<g transform='{tr}'>{inner}</g>"
files = sorted(f for f in glob.glob("/home/claude/words/*.svg") if not os.path.basename(f).startswith("sheet"))
assert not any("url(#" in io.open(f).read() for f in files)
parts = [f'  w_{os.path.basename(f)[:-4]}:"{clean(f)}"' for f in files]
block = ("\n/* Word pictures for the later levels: OpenMoji (openmoji.org, CC BY-SA 4.0). */\nconst OMW={\n"
         + ",\n".join(parts) + "\n};\nObject.keys(OMW).forEach(k=>{ART[k]=()=>`<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">${OMW[k]}</svg>`;});\n")
m = re.search(r"Object\.keys\(OMV\)\.forEach\(k=>\{.*?\}\);\n", s, flags=re.S); assert m
s = s[:m.end()] + block + s[m.end():]
words_with_art = [os.path.basename(f)[:-4] for f in files if not f.endswith("heart.svg")]

swap('''  train:"v_train",rocket:"v_rocket",plane:"v_plane"});''',
'''  train:"v_train",rocket:"v_rocket",plane:"v_plane"});
// later levels
Object.assign(WORD_ART,{''' + ",".join(f'{w}:"w_{w}"' for w in words_with_art) + '''});''')

# ------------------------------------------------------------ 2. words
TRICKY = '''
  // Tricky words: the part in a heart can't be sounded out and is learned by heart.
  // A tile written "e:uh" shows "e" but says "uh"; "e:" is silent.
  {w:"the",p:["th","e:uh"],t:1,tricky:1},{w:"a",p:["a:uh"],t:1,tricky:1},{w:"I",p:["I:eye"],t:1,tricky:1},
  {w:"is",p:["i","s:z"],t:1,tricky:1},{w:"to",p:["t","o:oo"],t:1,tricky:1},
  {w:"was",p:["w","a:o","s:z"],t:2,tricky:1},{w:"he",p:["h","e:ee"],t:2,tricky:1},{w:"she",p:["sh","e:ee"],t:2,tricky:1},
  {w:"we",p:["w","e:ee"],t:2,tricky:1},{w:"me",p:["m","e:ee"],t:2,tricky:1},{w:"my",p:["m","y:eye"],t:2,tricky:1},
  {w:"go",p:["g","o:oh"],t:2,tricky:1},{w:"no",p:["n","o:oh"],t:2,tricky:1},{w:"so",p:["s","o:oh"],t:2,tricky:1},
  {w:"his",p:["h","i","s:z"],t:2,tricky:1},
  {w:"said",p:["s","ai:e","d"],t:3,tricky:1},{w:"you",p:["y","ou:oo"],t:3,tricky:1},{w:"of",p:["o:u","f:v"],t:3,tricky:1},
  {w:"do",p:["d","o:oo"],t:3,tricky:1},{w:"are",p:["are:ar"],t:3,tricky:1},{w:"they",p:["th","ey:ay"],t:3,tricky:1},
  {w:"have",p:["h","a","ve:v"],t:3,tricky:1},{w:"all",p:["a:aw","ll"],t:3,tricky:1},
  {w:"come",p:["c","o:u","m","e:"],t:4,tricky:1},{w:"some",p:["s","o:u","m","e:"],t:4,tricky:1},
  {w:"what",p:["wh","a:u","t"],t:4,tricky:1},{w:"put",p:["p","u:oo","t"],t:4,tricky:1},
  // Tier 6 — bossy r: ar, or, er / ir / ur
  {w:"star",p:["s","t","ar"],t:6},{w:"jar",p:["j","ar"],t:6},{w:"barn",p:["b","ar","n"],t:6},{w:"shark",p:["sh","ar","k"],t:6},
  {w:"fork",p:["f","or","k"],t:6},{w:"corn",p:["c","or","n"],t:6},{w:"horse",p:["h","or","s","e:"],t:6},{w:"shorts",p:["sh","or","t","s"],t:6},
  {w:"bird",p:["b","ir","d"],t:6},{w:"shirt",p:["sh","ir","t"],t:6},{w:"girl",p:["g","ir","l"],t:6},{w:"surf",p:["s","ur","f"],t:6},
  {w:"her",p:["h","er"],t:6},{w:"fur",p:["f","ur"],t:6},
  // Tier 7 — vowel teams: ai, ee, ea, oa, ow, oo, igh, ou / ow
  {w:"rain",p:["r","ai","n"],t:7},{w:"mail",p:["m","ai","l"],t:7},
  {w:"sheep",p:["sh","ee","p"],t:7},{w:"bee",p:["b","ee"],t:7},{w:"feet",p:["f","ee","t"],t:7},{w:"seed",p:["s","ee","d"],t:7},
  {w:"leaf",p:["l","ea","f"],t:7},{w:"peach",p:["p","ea","ch"],t:7},{w:"sea",p:["s","ea"],t:7},
  {w:"goat",p:["g","oa","t"],t:7},{w:"coat",p:["c","oa","t"],t:7},{w:"road",p:["r","oa","d"],t:7},{w:"soap",p:["s","oa","p"],t:7},
  {w:"bow",p:["b","ow"],t:7},{w:"moon",p:["m","oo","n"],t:7},{w:"boot",p:["b","oo","t"],t:7},{w:"spoon",p:["s","p","oo","n"],t:7},
  {w:"night",p:["n","igh","t"],t:7},{w:"light",p:["l","igh","t"],t:7},
  {w:"cow",p:["c","ow:ou"],t:7},{w:"house",p:["h","ou","s","e:"],t:7},{w:"mouse",p:["m","ou","s","e:"],t:7},{w:"cloud",p:["c","l","ou","d"],t:7},
  // Tier 8 — two-part words, read one part at a time (syl = where the break falls)
  {w:"sunset",p:["s","u","n","s","e","t"],t:8,syl:[3]},{w:"picnic",p:["p","i","c","n","i","c"],t:8,syl:[3]},
  {w:"rabbit",p:["r","a","b","b","i","t"],t:8,syl:[3]},{w:"robot",p:["r","o:oh","b","o","t"],t:8,syl:[2]},
  {w:"pumpkin",p:["p","u","m","p","k","i","n"],t:8,syl:[4]},{w:"hotdog",p:["h","o","t","d","o","g"],t:8,syl:[3]},
  {w:"cupcake",p:["c","u","p","c","a_e","k"],t:8,syl:[3]},{w:"lemon",p:["l","e","m","o:u","n"],t:8,syl:[3]},
  {w:"magnet",p:["m","a","g","n","e","t"],t:8,syl:[3]},{w:"sandwich",p:["s","a","n","d","w","i","ch"],t:8,syl:[4]},
  {w:"backpack",p:["b","a","ck","p","a","ck"],t:8,syl:[3]},{w:"turtle",p:["t","ur","t","le"],t:8,syl:[2]},
  {w:"burger",p:["b","ur","g","er"],t:8,syl:[2]},{w:"tennis",p:["t","e","n","n","i","s"],t:8,syl:[3]},
  {w:"dragon",p:["d","r","a","g","o:u","n"],t:8,syl:[3]}'''
swap('''  {w:"train",p:["t","r","ai","n"],t:5},{w:"plane",p:["p","l","a_e","n"],t:5}
];''', '''  {w:"train",p:["t","r","ai","n"],t:5},{w:"plane",p:["p","l","a_e","n"],t:5},''' + TRICKY + '''
];
const TRICKY_SET=new Set(WORDS.filter(x=>x.tricky).map(x=>x.w));
const MAX_TIER=8;''')
swap('''{w:"rocket",p:["r","o","ck","e","t"],t:4}''', '''{w:"rocket",p:["r","o","ck","e","t"],t:4,syl:[3]}''')

swap('''  ai:"long a — 'ay' as in snail",ar:"'ar' as in car",oa:"long o — 'oh' as in boat"};''',
'''  ai:"long a — 'ay' as in snail",ar:"'ar' as in car",oa:"long o — 'oh' as in boat",
  or:"'or' as in fork",er:"'er' as in her",ir:"'er' as in bird",ur:"'er' as in fur",
  ou:"'ow' as in house",igh:"long i — 'eye' as in night",ea:"long e — 'ee' as in leaf",ow:"long o — 'oh' as in bow",
  uh:"'uh' — the sound in 'the'",z:"'zzz' — hold it",v:"'vvv' — hold it",oo:"'oo' as in moon",
  ee:"long e — 'ee' as in bee",ay:"long a — 'ay'",eye:"long i — 'eye'",oh:"long o — 'oh'",aw:"'aw' as in all"};''')

# sentences for the new levels (they can use tricky words now)
swap('''  {t:5,s:"The train went up the hill."},{t:5,s:"I can ride my bike to the lake."}''',
'''  {t:5,s:"The train went up the hill."},{t:5,s:"I can ride my bike to the lake."},
  {t:6,s:"A bird sat on the barn."},{t:6,s:"The girl has a red shirt."},{t:6,s:"The shark is in the dark."},
  {t:7,s:"The goat ate a green leaf."},{t:7,s:"We see the moon at night."},{t:7,s:"A cow is in the rain."},
  {t:8,s:"The robot had a picnic at sunset."},{t:8,s:"My rabbit hid in the pumpkin."},{t:8,s:"A turtle ate my sandwich!"}''')

# ------------------------------------------------------------ 3. synth
swap('''    ar:V([[760,1220,2600],[600,1260,1750]],.50),''',
'''    ar:V([[760,1220,2600],[600,1260,1750]],.50),
    or:V([[580,900,2500],[480,1000,1750]],.50),
    er:V([[480,1350,1650]],.46),
    ou:V([[780,1300,2600],[430,900,2400]],.50),''')
swap('''a_e:"ay",ai:"ay",ay:"ay",i_e:"eye",o_e:"oh",ow:"oh",oa:"oh",ea:"ee",u_e:"oo",e_e:"ee",qu:"q"};''',
'''a_e:"ay",ai:"ay",ay:"ay",i_e:"eye",o_e:"oh",ow:"oh",oa:"oh",ea:"ee",u_e:"oo",e_e:"ee",qu:"q",
    ir:"er",ur:"er",igh:"eye",uh:"u",bb:"b",nn:"n",tt:"t",pp:"p",dd:"d",mm:"m",rr:"r"};''')
m = re.search(r"const NORM=\{([^}]*)\};", s); assert m
s = s[:m.start()] + "const NORM={" + m.group(1) + ",or:0.263,er:0.244,ou:0.264};" + s[m.end():]

# say(): a tile may show one thing and say another ("e:uh"), or be silent ("e:")
swap('''      const ph=key.slice(6);
      if(Phonics.known(ph))return Phonics.play(actx(),ph);''',
'''      const ph=soundOf(key.slice(6));
      if(ph==="")return new Promise(r=>setTimeout(r,180));      // a silent letter
      if(Phonics.known(ph))return Phonics.play(actx(),ph);''')
swap('''const Phonics=makePhonics();''', '''const Phonics=makePhonics();
// tile notation: "sh" plain; "e:uh" shows e, says uh; "e:" shows e, silent
const soundOf=ph=>{ph=String(ph);const i=ph.indexOf(":");return i<0?ph:ph.slice(i+1);};
const tileText=ph=>{ph=String(ph);const i=ph.indexOf(":");return (i<0?ph:ph.slice(0,i)).replace("_e","-e");};''')

# ------------------------------------------------------------ 4. tiles
swap('''  const mkTile=(ph,cls="lt")=>{
    const b=document.createElement("button");b.className=cls;b.textContent=ph.replace("_e","-e");''',
'''  const mkTile=(ph,cls="lt",idx=-1)=>{
    const b=document.createElement("button");b.className=cls;b.textContent=tileText(ph);
    tileMarks(b,ph,w,idx);''')
swap('''    w.p.forEach(ph=>L.appendChild(mkTile(ph)));''','''    w.p.forEach((ph,i)=>L.appendChild(mkTile(ph,"lt",i)));''')
swap('''        open.textContent=ph.replace("_e","-e");open.dataset.ph=ph;open.classList.add("filled");''',
'''        open.textContent=tileText(ph);open.dataset.ph=ph;open.classList.add("filled");
        if(w.tricky&&ph.includes(":"))open.classList.add("heart");''')
swap('''    b.textContent=ph.replace("_e","-e");b.dataset.ph=ph;''', '''    b.textContent=tileText(ph);b.dataset.ph=ph;''')
swap('''    const t=document.createElement("button");t.className="lt bank";t.textContent=ph.replace("_e","-e");''',
     '''    const t=document.createElement("button");t.className="lt bank";t.textContent=tileText(ph);''')
swap('''        tgt.textContent=ph.replace("_e","-e");tgt.classList.remove("target");tgt.classList.add("blend");''',
     '''        tgt.textContent=tileText(ph);tgt.classList.remove("target");tgt.classList.add("blend");''')
assert 'replace("_e","-e")' not in s.replace('.replace("_e","-e");};', '')  # only tileText keeps it

# build slots mark syllable breaks too
swap('''    w.p.forEach((_,i)=>{const d=document.createElement("div");d.className="wslot";d.dataset.i=i;''',
     '''    w.p.forEach((_,i)=>{const d=document.createElement("div");d.className="wslot"+((w.syl||[]).includes(i)?" syl":"");d.dataset.i=i;''')
# distractor sounds: never a tricky tile, never a sound the word already has
swap('''    const pool=allWords().flatMap(x=>x.p).filter(p=>!w.p.includes(p));''',
'''    const mine=new Set(w.p.map(soundOf));
    const pool=allWords().flatMap(x=>x.p).filter(p=>!p.includes(":")&&!mine.has(soundOf(p))&&Phonics.known(p));''')
swap('''  const pool=allWords().flatMap(x=>x.p).filter(p=>p!==pair.to.p[pair.i]&&p!==pair.from.p[pair.i]);''',
     '''  const pool=allWords().flatMap(x=>x.p).filter(p=>!p.includes(":")&&p!==pair.to.p[pair.i]&&p!==pair.from.p[pair.i]);''')

swap('''function chooseRung(w){''', '''function tileMarks(b,ph,w,i){
  if(w.tricky&&ph.includes(":"))b.classList.add("heart");       // learn this bit by heart
  if(soundOf(ph)==="")b.classList.add("silent");                 // silent letter
  if(i>=0&&w.syl&&w.syl.includes(i))b.classList.add("syl");     // start of the next part
}
function chooseRung(w){''')

# ------------------------------------------------------------ 5. what each crate asks
# words with no picture (tricky words, custom words) find it by sound, in print
swap('''    if(rung===0&&st.seen>=1&&Math.random()<.5)renderListen(w);''',
     '''    if(rung===0&&(w.tricky||!WORD_ART[w.w]||(st.seen>=1&&Math.random()<.5)))renderListen(w);''')
swap('''function lookalikes(w){''', '''function lookalikes(w){
  if(w.tricky){ // other heart words he's met, so the choice is really about the tricky bit
    const t=allWords().filter(x=>x.tricky&&x.w!==w.w&&x.t<=Math.max(w.t,currentTier()));
    return t.sort(()=>Math.random()-.5).slice(0,2);
  }''')
# picture choices: only words that have a real picture, never heart words
swap('''  for(const x of allWords().filter(x=>x.w!==w.w).sort(()=>Math.random()-.5)){''',
     '''  for(const x of allWords().filter(x=>x.w!==w.w&&!x.tricky&&WORD_ART[x.w]).sort(()=>Math.random()-.5)){''')
# heart words get a heart picture in the sticker book and reward
swap('''function drawWord(w,seed){''', '''function drawWord(w,seed){
  if(typeof TRICKY_SET!=="undefined"&&TRICKY_SET.has(w))return ART.w_heart();''')

# crate label
swap('''      const tag=w.lost?"lost crate · bonus gems"''',
     '''      const tag=w.tricky?"♥ tricky word":w.lost?"lost crate · bonus gems"''')

# ------------------------------------------------------------ 6. tiers 6-8
swap('''  for(let t=1;t<=5;t++){''', '''  for(let t=1;t<=MAX_TIER;t++){''')
swap('''    if(mastered>=Math.ceil(pool.length*.5)&&attempts>=12&&firsts/attempts>=.85)tier=Math.min(5,t+1);''',
     '''    if(mastered>=Math.ceil(pool.length*.5)&&attempts>=12&&firsts/attempts>=.85)tier=Math.min(MAX_TIER,t+1);''')
swap('''        <option value="4">4 · blends</option><option value="5">5 · magic e</option></select></div>''',
'''        <option value="4">4 · blends</option><option value="5">5 · magic e</option>
        <option value="6">6 · bossy r (ar, or, er)</option><option value="7">7 · vowel teams (ee, oa, igh…)</option>
        <option value="8">8 · two-part words</option></select></div>''')
swap('''  [1,2,3,4,5].forEach(t=>{
    const pool=words.filter(w=>w.t===t);if(!pool.length)return;''',
'''  [1,2,3,4,5,6,7,8,"tricky"].forEach(t=>{
    const pool=t==="tricky"?words.filter(w=>w.tricky):words.filter(w=>w.t===t&&!w.tricky);if(!pool.length)return;''')
swap('''    d.innerHTML=`<div class="grow"><div class="lbl">Tier ${t}</div>''',
     '''    d.innerHTML=`<div class="grow"><div class="lbl">${t==="tricky"?"Tricky words ♥":"Tier "+t}</div>''')

# Voice Studio: list the sounds the tiles make, not the tile notation
swap('''  const s=new Set();allWords().forEach(w=>w.p.forEach(p=>s.add(p)));''',
     '''  const s=new Set();allWords().forEach(w=>w.p.forEach(p=>{const q=soundOf(p);if(q)s.add(q);}));''')
# custom words: split the new spellings too (longest first)
swap('''  const di=["sh","ch","th","wh","ck","ng","ll","ss","ff","zz","ee","oo","ai","ay","oa"];''',
     '''  const di=["igh","sh","ch","th","wh","ck","ng","ll","ss","ff","zz","ee","oo","ai","ay","oa","ea","ar","or","er","ir","ur","ou","ow"];''')
m = re.search(r"while\(i<w\.length\)\{const two=w\.slice\(i,i\+2\);\n\s*if\(di\.includes\(two\)\)\{out\.push\(two\);i\+=2;\}else\{out\.push\(w\[i\]\);i\+\+;\}\}", s)
assert m, "splitPhonemes loop not found"
s = s[:m.start()] + '''while(i<w.length){const three=w.slice(i,i+3),two=w.slice(i,i+2);
    if(di.includes(three)){out.push(three);i+=3;}
    else if(di.includes(two)){out.push(two);i+=2;}else{out.push(w[i]);i++;}}''' + s[m.end():]

# ------------------------------------------------------------ 7. CSS
swap('''.crate.spell{''', '''.lt.heart,.wslot.heart{border-color:#D14C8E;background:linear-gradient(160deg,#FFE3F0,#FFD1E6);position:relative}
.lt.heart::after,.wslot.heart::after{content:"♥";position:absolute;top:-14px;left:50%;transform:translateX(-50%);
  font-size:18px;color:#D14C8E;text-shadow:0 1px 0 #fff}
.lt.silent{opacity:.55;border-style:dashed}
.lt.syl,.wslot.syl{margin-left:26px}
.crate.spell{''')

io.open(P, "w", encoding="utf-8").write(s)
print("words patched; size", round(len(s)/1024), "KB;", len(words_with_art), "new pictures")
