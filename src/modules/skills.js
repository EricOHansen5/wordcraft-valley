/* ================================================================
   SOUND SKILLS — what the best phonics programs track
   Words are made of sound patterns (short a, sh, silent e, ar, ee...).
   Every answer anywhere in the game is traced back to those patterns:
   a clean read strengthens every pattern in the word; a mix-up is pinned
   on the exact letters that differed (picked "cab" for "cap" = p/b).
   The game then serves words that practise the shaky patterns, and the
   grown-up report shows the whole map.
   Speed guard: fast wrong answers are guesses. Two in a short run turn on
   the Sound Shield — answers stay locked until he taps the sounds.
   ================================================================ */
const SKILL_DEF=[
  {id:"a",n:"short a",ex:"cat",t:1},{id:"o",n:"short o",ex:"dog",t:1},{id:"cons",n:"consonant sounds",ex:"b, d, m, s…",t:1},
  {id:"i",n:"short i",ex:"pig",t:2},{id:"e",n:"short e",ex:"hen",t:2},{id:"u",n:"short u",ex:"bug",t:2},
  {id:"ck",n:"ck",ex:"duck",t:1},{id:"sh",n:"sh",ex:"ship",t:3},{id:"ch",n:"ch",ex:"chip",t:3},{id:"th",n:"th",ex:"bath",t:3},
  {id:"wh",n:"wh",ex:"whale",t:3},{id:"dbl",n:"double letters (ll, ss)",ex:"shell",t:3},{id:"blend",n:"blends (fr, st, mp…)",ex:"frog",t:4},
  {id:"magic",n:"silent e",ex:"kite",t:5},{id:"ar",n:"ar",ex:"star",t:6},{id:"or",n:"or",ex:"fork",t:6},{id:"er",n:"er, ir, ur",ex:"bird",t:6},
  {id:"ee",n:"ee, ea",ex:"sheep",t:7},{id:"ai",n:"ai, ay",ex:"rain",t:7},{id:"oa",n:"oa, ow",ex:"goat",t:7},{id:"oo",n:"oo",ex:"moon",t:7},
  {id:"ou",n:"ou, ow",ex:"cloud",t:7},{id:"igh",n:"igh",ex:"night",t:7},{id:"syl",n:"two-part words",ex:"sunset",t:8},
  {id:"ing",n:"endings -ing, -ed",ex:"fishing",t:9},{id:"soft",n:"soft c and g",ex:"city, gem",t:10},{id:"y",n:"y says ee / eye",ex:"happy, fly",t:10},
  {id:"comp",n:"compound words",ex:"rainbow",t:11},{id:"silent",n:"silent letters (kn, wr, ph)",ex:"knot",t:12},{id:"contr",n:"contractions",ex:"can't",t:12},
  {id:"tricky",n:"tricky words",ex:"said, the",t:1}];
const SKILL_NAME=Object.fromEntries(SKILL_DEF.map(s=>[s.id,s]));
const Skills=(()=>{
  const MAP={ck:"ck",sh:"sh",ch:"ch",th:"th",wh:"wh",ll:"dbl",ss:"dbl",ff:"dbl",zz:"dbl",gg:"dbl",
    a_e:"magic",i_e:"magic",o_e:"magic",u_e:"magic",e_e:"magic",ar:"ar",or:"or",er:"er",ir:"er",ur:"er",
    ee:"ee",ea:"ee",ai:"ay",ay:"ai",oa:"oa",ow:"oa",oo:"oo",ou:"ou",igh:"igh",le:"syl",mb:"cons",qu:"cons",x:"cons"};
  MAP.ai="ai";MAP.ay="ai";
  const VOW={a:"a",e:"e",i:"i",o:"o",u:"u"};
  // tiles that carry a later-level pattern
  const CMAP={"c:s":"soft","g:j":"soft","y:ee":"y","y:eye":"y","ed:t":"ing","ed:d":"ing","e:i":"ing","kn:n":"silent","wr:r":"silent","ph:f":"silent","mb":"silent"};
  const S=()=>state.skills||(state.skills={});
  const isCons=t=>{const L=t.split(":")[0];return L.length&&!/[aeiouy]/.test(L)&&!MAP[L]||(MAP[L]==="cons");};
  // which skills a word practises, tile by tile
  function ofWord(w){
    if(!w||!w.p)return[];
    const out=[];
    if(w.contr){out.push({sk:"contr",i:-1});return out;}
    if(w.tricky){out.push({sk:"tricky",i:-1});return out;}
    if(w.comp)out.push({sk:"comp",i:-1});
    const n=w.p.length;
    w.p.forEach((tile,i)=>{
      const L=tile.split(":")[0].toLowerCase(),snd=soundOf(tile);
      if(CMAP[tile]){out.push({sk:CMAP[tile],i});return;}
      if(L==="ng"&&i===n-1&&n>4){out.push({sk:"ing",i});return;}
      if(tile.includes(":")){if(snd==="ou")out.push({sk:"ou",i});else if(snd!==""&&!(w.syl&&w.syl.length))out.push({sk:"tricky",i});return;}
      if(MAP[L])out.push({sk:MAP[L],i,tile});
      else if(VOW[L])out.push({sk:VOW[L],i,tile});
      else out.push({sk:"cons",i,tile,letter:L});
    });
    for(let i=0;i+1<w.p.length;i++){const a=w.p[i],b=w.p[i+1];if(w.syl&&w.syl.includes(i+1))continue;   // not across a word break
      if(isCons(a)&&isCons(b)&&!MAP[a]&&!MAP[b]){out.push({sk:"blend",i});break;}}
    if(w.syl&&w.syl.length)out.push({sk:"syl",i:-1});
    return out;
  }
  function bump(id,good,wt,conf){
    const s=S()[id]||(S()[id]={p:.5,n:0,e:{}});
    const k=Math.min(.4,.28*wt);s.p=Math.max(0,Math.min(1,s.p+((good?1:0)-s.p)*k));s.n=+(s.n+wt).toFixed(2);s.last=Date.now();
    if(conf){s.e[conf]=(s.e[conf]||0)+1;}
    if(!good){state.skillMiss=state.skillMiss||{};state.skillMiss[id]=(state.skillMiss[id]||0)+1;}
  }
  // letters he confused one for another, for the report: "reads b as d"
  function confusions(){const c=[];Object.entries(S()).forEach(([id,s])=>Object.entries(s.e||{}).forEach(([k,n])=>c.push({id,k,n})));
    return c.sort((a,b)=>b.n-a.n);}
  const recent=[];let slow=false;
  /* result of one answer
     o.ok         right?          o.help  heard it or needed hints first
     o.confused   the word he picked instead
     o.wrongIdx   tile positions he got wrong while spelling, o.placed = what he put there
     o.ms         how long he took */
  function result(w,o){
    if(!w)return;
    const sk=ofWord(typeof w==="string"?allWords().find(x=>x.w===w):w);if(!sk.length)return;
    const wo=typeof w==="string"?allWords().find(x=>x.w===w):w;
    if(o.ok){sk.forEach(s=>bump(s.sk,true,o.help?.35:1));}
    else if(o.wrongIdx&&o.wrongIdx.length){
      o.wrongIdx.forEach((i,n)=>{const s=sk.find(x=>x.i===i)||{sk:"cons"};bump(s.sk,false,1,(o.placed||[])[n]&&tileText((o.placed||[])[n])+"→"+tileText(wo.p[i]));});
    }else if(o.confused){
      const other=allWords().find(x=>x.w===o.confused);
      // pin the mix-up only when the two words differ by one sound (cap/cat);
      // an unrelated picture says he guessed, not which sound tripped him
      const diff=other&&other.p.length===wo.p.length?wo.p.map((t,i)=>soundOf(t)!==soundOf(other.p[i])?i:-1).filter(i=>i>=0):[];
      if(diff.length===1&&!wo.tricky){
        const i=diff[0],s=sk.find(x=>x.i===i);
        if(s)bump(s.sk,false,1,tileText(other.p[i])+"→"+tileText(wo.p[i]));else sk.forEach(s=>bump(s.sk,false,.4));
      }else sk.forEach(s=>bump(s.sk,false,.4));
    }else sk.forEach(s=>bump(s.sk,false,.5));
    // speed guard
    const rushed=!o.ok&&o.ms!=null&&o.ms<900;
    recent.push(rushed);if(recent.length>6)recent.shift();
    if(rushed){state.rushes=state.rushes||{};state.rushes[today()]=(state.rushes[today()]||0)+1;}
    state.answers=state.answers||{};const d=state.answers[today()]||(state.answers[today()]={n:0,ok:0,ms:0});
    d.n++;if(o.ok)d.ok++;if(o.ms)d.ms+=Math.min(o.ms,15000);
    if(recent.filter(Boolean).length>=2){slow=true;recent.length=0;}
    save();
  }
  function status(id){const s=S()[id];if(!s||s.n<1.5)return"new";if(s.n>=5&&s.p>=.85)return"strong";if(s.p<.62)return"shaky";return"learning";}
  // a word that practises his shakiest taught pattern
  let lastT=[];
  function target(tier){
    tier=tier||currentTier();
    const weak=SKILL_DEF.filter(d=>d.t<=tier&&d.id!=="cons").map(d=>({d,s:S()[d.id]})).filter(x=>x.s&&x.s.n>=1.5&&x.s.p<.75)
      .sort((a,b)=>a.s.p-b.s.p);
    for(const {d} of weak){
      const pool=allWords().filter(w=>w.t<=tier&&(d.id==="tricky"?w.tricky:!w.tricky)&&ofWord(w).some(x=>x.sk===d.id)&&!lastT.includes(w.w));
      if(pool.length){const w=pool[Math.floor(Math.random()*pool.length)];lastT.push(w.w);if(lastT.length>6)lastT.shift();return{w,skill:d};}
    }
    return null;
  }
  return{ofWord,result,status,target,confusions,
    get slow(){return slow;},set slow(v){slow=!!v;},
    all:()=>SKILL_DEF.map(d=>({...d,s:S()[d.id]||null,status:status(d.id)}))};
})();

/* Sound Shield: answers stay locked until each sound in the word is tapped.
   Shown only after rushed guesses; it teaches "sound it out first". */
function soundShield(host,word,onOpen){
  const w=typeof word==="string"?(allWords().find(x=>x.w===word)||{w:word,p:splitPhonemes(word)}):word;
  const box=document.createElement("div");box.className="shield";
  box.innerHTML=`<div class="shieldmsg">🛡️ Sound Shield! Slow down — tap each sound to break it.</div><div class="shieldtiles"></div>`;
  const row=box.querySelector(".shieldtiles"),done=new Set();
  w.p.forEach((ph,i)=>{const b=document.createElement("button");b.className="lt";b.textContent=tileText(ph);
    b.onclick=async()=>{b.classList.add("lit");await Sound.say("sound:"+ph,ph);b.classList.remove("lit");b.classList.add("done");done.add(i);
      if(done.size===w.p.length){await Sound.say("word:"+w.w,w.w,.85);box.classList.add("broken");Skills.slow=false;setTimeout(()=>{box.remove();onOpen&&onOpen();},450);}};
    row.appendChild(b);});
  host.prepend(box);Sound.sfx.nope();
  return box;
}
