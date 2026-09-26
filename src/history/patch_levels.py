import io,re,os,glob,sys,json
sys.path.insert(0,'/home/claude/work');from newwords import NEW,ART as WART
W='/home/claude/work/'
h=open(W+'wordcraft-valley.html').read()
def rep(old,new,n=1,name=''):
    global h
    c=h.count(old)
    if c!=n:sys.exit(f'FAIL {name}: {c}x')
    h=h.replace(old,new)
def clean(path):
    t=io.open(path,encoding="utf-8").read()
    vb=[float(x) for x in re.search(r'viewBox="([^"]+)"',t).group(1).split()]
    inner=re.sub(r'^.*?<svg[^>]*>','',t,flags=re.S);inner=re.sub(r'</svg>\s*$','',inner,flags=re.S)
    inner=re.sub(r'<!--.*?-->','',inner,flags=re.S);inner=re.sub(r'\s+id="[^"]*"','',inner)
    inner=re.sub(r'>\s+<','><',inner);inner=re.sub(r'\s{2,}',' ',inner).strip().replace('"','\\"')
    k=100.0/max(vb[2],vb[3]);tr=f"scale({k:.5f})"
    if vb[0] or vb[1]:tr+=f" translate({-vb[0]},{-vb[1]})"
    return f"<g transform='{tr}'>{inner}</g>"
files=sorted(glob.glob("/home/claude/words3/*.svg"))
parts=[f'  x_{os.path.basename(f)[:-4]}:"{clean(f)}"' for f in files]
block=("\n/* Pictures for levels 9-12 and the v8 modes: OpenMoji (openmoji.org, CC BY-SA 4.0). */\nconst OMX={\n"+",\n".join(parts)+
  "\n};\nObject.keys(OMX).forEach(k=>{ART[k]=()=>`<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">${OMX[k]}</svg>`;});\n")
anchor='Object.keys(OMW).forEach(k=>{ART[k]=()=>`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${OMW[k]}</svg>`;});\n'
rep(anchor,anchor+block,name='art')
# words
def js(d):
    s='{'+','.join([f'w:{json.dumps(d["w"])}',f'p:{json.dumps(d["p"])}',f't:{d["t"]}']+
      ([f'syl:{json.dumps(d["syl"])}'] if d.get('syl') else [])+(['tricky:1'] if d.get('tricky') else [])+
      (['comp:1'] if d.get('comp') else [])+(['contr:1'] if d.get('contr') else []))+'}'
    return s
lines="\n  // Tier 9 — endings; 10 — soft c/g and y; 11 — compound words; 12 — silent letters and contractions\n  "+",\n  ".join(js(d) for d in NEW)
rep('''  {w:"crane",p:["c","r","a_e","n"],t:5}
];''','''  {w:"crane",p:["c","r","a_e","n"],t:5},'''+lines+'''
];''',name='words')
rep('const MAX_TIER=8;','const MAX_TIER=12;',name='max')
rep('  [1,2,3,4,5,6,7,8,"tricky"].forEach(t=>{','  [...Array(MAX_TIER).keys()].map(i=>i+1).concat(["tricky"]).forEach(t=>{',name='breakdown')
rep('''// vehicle words use the vehicle artwork''','''Object.assign(WORD_ART,'''+json.dumps(WART)+''');
// vehicle words use the vehicle artwork''',name='wordart')
# skills + books from their source files
a=h.index('const SKILL_DEF=[');b=h.index('const SKILL_NAME=')
sk=open(W+'skills.js').read();sa=sk.index('const SKILL_DEF=[');sb=sk.index('const SKILL_NAME=')
h=h[:a]+sk[sa:sb]+h[b:]
a=h.index('const Skills=(()=>{');b=h.index('\n})();',a)+6
sa=sk.index('const Skills=(()=>{');sb=sk.index('\n})();',sa)+6
h=h[:a]+sk[sa:sb]+h[b:]
a=h.index('const BOOKS=[');b=h.index(';\n',a)+2
h=h[:a]+open(W+'stories.js').read()+h[b:]
open(W+'wordcraft-valley.html','w').write(h);print('ok')
