import re,sys
W='/home/claude/work/'
def rep(s,old,new,n=1,name=''):
    c=s.count(old)
    if c!=n: sys.exit(f'FAIL {name}: found {c}x: {old[:70]!r}')
    return s.replace(old,new)

def mine_patches(s):
    # avatar for books
    s=rep(s,'  return{enter,exit,','''  let avK=null,avC=null;
  function avatar(){const m=M(),k=JSON.stringify(m.look)+m.pick;if(avC&&avK===k)return avC;
    const c=document.createElement("canvas");c.width=200;c.height=240;
    drawMiner(c.getContext("2d"),100,228,165,m.look,1,0,false,0,PICKS[m.pick].col);avK=k;return avC=c.toDataURL();}
  return{avatar,enter,exit,''',name='avatar')
    # books pill in the mine
    s=rep(s,'<button class="mpill" id="mPet">🐾 Pet</button>','<button class="mpill" id="mPet">🐾 Pet</button><button class="mpill" id="mBooks">📚 Books</button>',name='mBooks')
    s=rep(s,'root.querySelector("#mBack").onclick=()=>exit();','root.querySelector("#mBack").onclick=()=>exit();\n    root.querySelector("#mBooks").onclick=()=>{Sound.sfx.pop();input.dig=false;input.jx=input.jy=0;Books.shelf();};',name='mBooks wire')
    s=rep(s,'''eg.textContent="🥚 "+m.eggs.length+" hatching tomorrow";}''','''eg.textContent="🥚 "+m.eggs.length+" hatching tomorrow";try{booksBadge();}catch(e){}}''',name='hud badge')
    # word stone: skills + shield
    s=rep(s,'const opts=[w,...others].sort(()=>Math.random()-.5);let misses=0;','const opts=[w,...others].sort(()=>Math.random()-.5);let misses=0,t0=performance.now();',name='ws t0')
    s=rep(s,'''card().querySelector("#mHear").onclick=()=>Sound.say("word:"+w.w,w.w,.85);
    card().querySelectorAll(".mpic")''','''card().querySelector("#mHear").onclick=()=>Sound.say("word:"+w.w,w.w,.85);
    if(Skills.slow){const mp=card().querySelector(".mpics");mp.classList.add("locked-by-shield");
      soundShield(card(),w,()=>{mp.classList.remove("locked-by-shield");t0=performance.now();});}
    card().querySelectorAll(".mpic")''',name='ws shield')
    s=rep(s,'if(b.dataset.w===w.w){Sound.sfx.win();b.classList.add("right");const m=M();','if(b.dataset.w===w.w){try{Skills.result(w,{ok:true,help:misses>0,ms:performance.now()-t0});}catch(e){}Sound.sfx.win();b.classList.add("right");const m=M();',name='ws ok')
    s=rep(s,'else{misses++;Sound.sfx.nope();b.classList.add("wrong");setTimeout(()=>b.classList.remove("wrong"),500);','else{try{Skills.result(w,{ok:false,confused:b.dataset.w,ms:performance.now()-t0});}catch(e){}t0=performance.now();misses++;Sound.sfx.nope();b.classList.add("wrong");setTimeout(()=>b.classList.remove("wrong"),500);',name='ws miss')
    # boss rounds: targeted words, shield, picture riddles
    s=rep(s,'const b=BOSSES[battle.i],pool=bossWords(),w=pool[Math.floor(Math.random()*pool.length)];battle.round++;battle.ans=w.w;',
      '''const b=BOSSES[battle.i],pool=bossWords();let w=pool[Math.floor(Math.random()*pool.length)];battle.round++;
    const tg=Math.random()<.4&&Skills.target();if(tg&&!tg.w.tricky&&WORD_ART[tg.w.w])w=tg.w;battle.ans=w.w;battle.t0=performance.now();
    if(battle.round%3===0&&currentTier()>=2&&!Skills.slow){const ps=PicSentence.make();if(ps){psRound(b,ps);return;}}''',name='boss round')
    s=rep(s,'const pictureFirst=battle.round%2===0;','const pictureFirst=battle.round%2===0&&!Skills.slow;',name='pf')
    s=rep(s,'''    card().querySelectorAll("[data-w]").forEach(el=>el.onclick=()=>answer(el,el.dataset.w===w.w,w));
  }''','''    card().querySelectorAll("[data-w]").forEach(el=>el.onclick=()=>answer(el,el.dataset.w===w.w,w));
    if(Skills.slow&&!pictureFirst){const mp=card().querySelector(".mpics");mp.classList.add("locked-by-shield");
      soundShield(card().querySelector(".mboss"),w,()=>{mp.classList.remove("locked-by-shield");battle.t0=performance.now();});}
  }
  // boss riddle: read a whole sentence, pick the matching scene
  function psRound(b,ps){
    battle.ans="#ps";battle.t0=performance.now();const w={w:"#ps",ps:ps.text};
    openPanel(`<div class="mboss fight">${bossArt(b,"small")}
      <div class="mbars"><div><b>${b.name}</b> ${"🖤".repeat(battle.hp)}</div><div><b>You</b> ${"❤️".repeat(battle.hearts)}${"🤍".repeat(3-battle.hearts)}</div></div>
      <p class="sub">Boss riddle! Read it all, then tap the picture that matches.</p><div class="mps">${ps.text}</div>
      <div class="mpics">${ps.opts.map((o,i)=>`<button class="psopt" data-w="${o.ok?"#ps":"#no"+i}">${PicSentence.draw(o,"cave")}</button>`).join("")}</div></div>`);
    card().querySelectorAll("[data-w]").forEach(el=>el.onclick=()=>answer(el,el.dataset.w==="#ps",w));
  }''',name='boss wire')
    s=rep(s,'if(battle.lock)return;battle.lock=true;const art=card().querySelector(".mbossart");',
      '''if(battle.lock)return;battle.lock=true;const art=card().querySelector(".mbossart");
    try{if(w.ps){state.comp=state.comp||{right:0,wrong:0};state.comp[ok?"right":"wrong"]++;}
      else Skills.result(w,{ok,confused:ok?null:el.dataset.w,ms:performance.now()-(battle.t0||0)});}catch(e){}''',name='answer rec')
    s=rep(s,'Sound.say("word:"+w.w,w.w,.9);toastIn(','(w.ps?Sound.say("sent:"+w.ps,w.ps,.9):Sound.say("word:"+w.w,w.w,.9));toastIn(',name='answer say')
    s=rep(s,'setTimeout(()=>Sound.say("word:"+w.w,w.w,.85),1200);','setTimeout(()=>w.ps?Sound.say("sent:"+w.ps,w.ps,.9):Sound.say("word:"+w.w,w.w,.85),1200);',name='answer say2')
    return s

h=open(W+'wordcraft-valley.html').read()
h=mine_patches(h)
m=open(W+'mine.js').read();m=mine_patches(m);open(W+'mine.js','w').write(m)

# markup
h=rep(h,'<button id="mineBtn">⛏️ Go mining</button>','<button id="mineBtn">⛏️ Go mining</button>\n    <button id="booksBtn">📚 Books<span class="badge" id="bookBadge"></span></button>',name='dock')
h=rep(h,'<button class="btn soft" id="recapBtn">','<button class="btn primary" id="reportBtn">📊 Full reading report</button>\n      <button class="btn soft" id="recapBtn">',name='report btn')
h=rep(h,'<div id="picks"></div>','<div id="shieldHost"></div>\n  <div id="picks"></div>',name='shieldHost')
# openWord
h=rep(h,'''function openWord(w,opt){
  cur=w;usedEar=false;misses=0;''','''function openWord(w,opt){
  cur=w;usedEar=false;misses=0;cur._t0=performance.now();
  document.getElementById("shieldHost").innerHTML="";document.getElementById("picks").classList.remove("locked-by-shield");''',name='openWord')
h=rep(h,'''  show("ovRead");
}
function checkBuild(){''','''  // Sound Shield after rushed guesses: tap the sounds before the answers unlock
  if(Skills.slow&&rung!==1&&document.querySelector("#picks .pick:not(.text),#picks .btn")){
    const P=document.getElementById("picks");P.classList.add("locked-by-shield");
    soundShield(document.getElementById("shieldHost"),w,()=>{P.classList.remove("locked-by-shield");cur._t0=performance.now();});}
  show("ovRead");
}
function checkBuild(){''',name='openWord shield')
h=rep(h,'''    misses++;Sound.sfx.nope();
    slots.forEach((x,i)=>{ if(x.dataset.ph!==cur.p[i]) x.classList.add("bad"); });''','''    misses++;Sound.sfx.nope();
    {const wi=[],pl=[];built.forEach((b,i)=>{if(b!==cur.p[i]){wi.push(i);pl.push(b);}});
      Skills.result(cur,{ok:false,wrongIdx:wi,placed:pl,ms:performance.now()-(cur._t0||0)});cur._t0=performance.now();}
    slots.forEach((x,i)=>{ if(x.dataset.ph!==cur.p[i]) x.classList.add("bad"); });''',name='checkBuild')
h=rep(h,'''function miss(btn){
  misses++;Sound.sfx.nope();''','''function miss(btn){
  Skills.result(cur,{ok:false,confused:btn.dataset.w,ms:performance.now()-(cur._t0||0)});cur._t0=performance.now();
  misses++;Sound.sfx.nope();''',name='miss')
h=rep(h,'''function succeed(){
''','''function succeed(){
  if(cur&&cur.p)Skills.result(cur,{ok:true,help:usedEar||misses>0,ms:performance.now()-(cur._t0||0)});
''',name='succeed')
# read then prove
h=rep(h,'''    const b=document.createElement("button");b.className="btn primary";b.textContent="I read it!";
    b.onclick=succeed;P.appendChild(b);''','''    const b=document.createElement("button");b.className="btn primary";b.textContent="I read it!";
    // read, then prove it: the picture choices appear only after he says he read it
    if(!w.tricky&&WORD_ART[w.w]){b.disabled=true;setTimeout(()=>{b.disabled=false;},900);
      b.onclick=()=>{Sound.sfx.pop();P.innerHTML=`<div class="prove">Great! Which one did you read?</div>`;choices(w,P);};}
    else b.onclick=succeed;
    P.appendChild(b);''',name='prove')
h=rep(h,'''  const artOf=x=>WORD_ART[x.w]||"mystery", used=new Set([artOf(w)]), others=[];''','''  choices(w,P);
}
function choices(w,P){
  const artOf=x=>WORD_ART[x.w]||"mystery", used=new Set([artOf(w)]), others=[];''',name='choices')
# crates
h=rep(h,'''  else if(tier>=3&&Math.random()<.18){const pool=SIGNS.filter(x=>x.t<=tier);out.push({scramble:pool[Math.floor(Math.random()*pool.length)]});}''','''  else if(tier>=3&&Math.random()<.18){const pool=SIGNS.filter(x=>x.t<=tier);out.push({scramble:pool[Math.floor(Math.random()*pool.length)]});}
  // Picture it: read a sentence, match the scene
  else if(tier>=2&&Math.random()<.2&&PicSentence.make(tier))out.push({pic:true});
  // a word chosen to practise his shakiest sound pattern
  const tg=Skills.target(tier);if(tg&&Math.random()<.75)out.push({...tg.w,target:tg.skill.n});''',name='pickCrates')
h=rep(h,'''    if(w.scramble){
      b.className="crate swap";''','''    if(w.pic){
      b.className="crate pic";
      b.innerHTML=`<div style="font-size:56px;line-height:66px">🖼️</div><div class="w">picture it</div><div class="tagline">read a sentence · +2 gems</div>`;
      b.onclick=()=>{Sound.sfx.pop();hide("ovCrates");openPicIt();};
    }else if(w.scramble){
      b.className="crate swap";''',name='crate pic')
h=rep(h,'b.className="crate"+(w.lost?" lost":"")+(inSeason?" season":"");','b.className="crate"+(w.lost?" lost":"")+(inSeason?" season":"")+(w.target?" target":"");',name='crate cls')
h=rep(h,'const tag=w.tricky?"♥ tricky word":','const tag=w.target?"🎯 "+w.target+" practice":w.tricky?"♥ tricky word":',name='tag')
# quests
h=rep(h,'''  {id:"bubble3",ic:"💬", t:"Read 3 word bubbles",       k:"bubble", n:3},''','''  {id:"bubble3",ic:"💬", t:"Read 3 word bubbles",       k:"bubble", n:3},
  {id:"book1",  ic:"📚", t:"Read a storybook",          k:"book",   n:1},''',name='quest')
h=rep(h,'''  document.getElementById("timeBtn").style.display=state.settings.ambient?"grid":"none";
}''','''  document.getElementById("timeBtn").style.display=state.settings.ambient?"grid":"none";
  try{booksBadge();}catch(e){}
}''',name='hud badge')
# modules + css
js='\n'.join(open(W+f).read() for f in ['stories.js','skills.js','books.js','reading.js'])
h=rep(h,'function useBuilding(key,id){',js+'\nfunction useBuilding(key,id){',name='modules')
h=rep(h,'/* v4.3 */',open(W+'reading.css').read()+'/* v4.3 */',name='css')
open(W+'wordcraft-valley.html','w').write(h)
print('ok',len(h))
