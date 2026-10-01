// Bug hunt, reading and stories (Playwright, a few minutes, iPad 9th generation: 1024×768 landscape, touch).
// Every screen about reading is opened fresh, every interactive element on it is found (buttons, .btn, .bcov, .bw, .lt,
// .tab, .card, anything with a data-* action or onclick, and anything the CSS gives cursor:pointer), and each one is
// tapped with the touchscreen on a fresh copy of the screen. A tap passes when something happens within 800 ms (the DOM
// of the open overlay, the Modes stack, the save, a toast, a spoken line or a sound, all watched through stubs) with no
// page error, and a close button has to land back where the screen came from. A disabled button has to stay inert.
// Then the effects that matter are checked against docs/design.md: what a book pays and counts, a quiz miss, the
// double tap that pays once, the two-miss glow, Read together both ways, My own book, Write it, Talk to me (with
// Talk._hear stubbed), both story quests, Word Wilds, animal care, notes from home, signs and the keepers' books,
// Picture it and the Read kits (dataset.ans / dataset.tiles, misses never cost gems).
"use strict";
const {launch,check,waitFor,seed}=require("./lib");
const J=x=>JSON.stringify(x);

// ---------- in the page: stubs that watch, a seeded Math.random, the snapshot, the element finder ----------
function spies(){
  if(window.__spied)return;window.__spied=1;
  window.__ev=[];
  const log=(k,v)=>{window.__ev.push(k+":"+String(v==null?"":v).slice(0,90));};
  window.__log=log;
  // the voice answers at once (nothing to wait for), and every line is written down
  Sound.speak=function(t){log("speak",t);return new Promise(r=>setTimeout(r,15));};
  Sound.say=function(k){log("say",k);return new Promise(r=>setTimeout(r,15));};
  Object.keys(Sound.sfx).forEach(n=>{const f=Sound.sfx[n];Sound.sfx[n]=function(){log("sfx",n);try{return f.apply(this,arguments);}catch(e){}};});
  const t0=window.toast;window.toast=function(m){log("toast",m);return t0.apply(this,arguments);};
  const f0=window.floater;window.floater=function(m){log("floater",m);return f0.apply(this,arguments);};
  // the same random numbers every time a screen is set up, so a fresh copy of it is the same screen
  window.__seed=s=>{let a=s>>>0;Math.random=function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
  const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h+":"+s.length;};
  // a real clip that plays for sec seconds (a quiet hum), as his recording of a page
  window.__wav=sec=>{const sr=8000,n=Math.round(sr*sec),b=new ArrayBuffer(44+n*2),v=new DataView(b);
    const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
    w(0,"RIFF");v.setUint32(4,36+n*2,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
    v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,n*2,true);
    for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.round(300*Math.sin(i*2*Math.PI*220/sr)),true);
    return new Blob([b],{type:"audio/wav"});};
  // the save, without what moves by itself (positions, clocks, minute counts)
  const DROP=new Set(["c","r","pc","pr","x","y","face","since","modeMin","modeOpens","minutes","power","at","t0","lastTouch","savedAt","seenHead","last"]);
  // like save(): "_" fields (a mover's on-screen element, _el, and its animation) are never part of the save
  window.__dig=()=>{let s="";try{s=JSON.stringify(state,(k,v)=>DROP.has(k)||(k&&k[0]==="_")?undefined:v);}catch(e){}return hash(s);};
  window.__dom=()=>hash([...document.querySelectorAll(".overlay.on,#advHud.on")].map(o=>o.id+"|"+o.className+"|"+o.innerHTML).join("#"));
  window.__snap=()=>({top:Modes.top(),stack:Modes.stack().join(">"),dom:__dom(),st:__dig(),ev:__ev.length});
  // what can be tapped in the open overlays (or under a selector)
  const SEL="button,[role=button],.btn,.bcov,.bw,.lt,.tab,.card,[onclick],[data-w],[data-v],[data-i],[data-t],[data-p],[data-a],[data-id],[data-way],[data-k],[data-ph]";
  const STATE_CLS=new Set(["on","lit","used","right","wrong","hint","filled","good","bad","look","open","puff","pop","done","cur","star","hide","nudge","sel","noanim","toss","happy","nope","yum"]);
  const desc=e=>{const cls=[...e.classList].filter(c=>!STATE_CLS.has(c)).sort().join(".");
    const data=[...e.attributes].filter(a=>a.name.startsWith("data-")&&a.name!=="data-st").map(a=>a.name+"="+a.value).sort().join(",");
    return e.tagName.toLowerCase()+(e.id?"#"+e.id:"")+(cls?"."+cls:"")+(data?"["+data+"]":"")+"|"+(e.textContent||"").trim().replace(/\s+/g," ").slice(0,24);};
  const vis=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=="hidden"&&cs.pointerEvents!=="none";};
  window.__els=sel=>{
    const roots=sel?[...document.querySelectorAll(sel)]:[...document.querySelectorAll(".overlay.on,#advHud.on")];
    const out=[];
    roots.forEach(root=>{
      const cand=[...root.querySelectorAll(SEL)];
      root.querySelectorAll("*").forEach(e=>{if(cand.indexOf(e)>=0)return;const cs=getComputedStyle(e);
        if(cs.cursor==="pointer"&&e.parentElement&&getComputedStyle(e.parentElement).cursor!=="pointer")cand.push(e);});
      cand.forEach(e=>{if(out.indexOf(e)<0&&vis(e))out.push(e);});});
    // a plain child inside something tappable is the same target
    const keep=out.filter(e=>!out.some(o=>o!==e&&o.contains(e))||e.onclick||e.matches(".bw,.lt,[data-w],[data-v],[data-i],button"));
    window.__E=keep;
    return keep.map((e,i)=>({i,d:desc(e),text:(e.textContent||"").trim().replace(/\s+/g," ").slice(0,40),dis:!!e.disabled}));
  };
  // where a tap on element i lands (it is scrolled into view first)
  // (after the sheet's entrance animation: the element has to hold still for a few frames first)
  const frame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
  window.__aim=async i=>{const e=window.__E[i];if(!e||!e.isConnected)return null;try{e.scrollIntoView({block:"center",inline:"center"});}catch(x){}
    // the pop-in of the sheet (or anything else around it that runs once) has to finish first
    const anims=(document.getAnimations?document.getAnimations():[]).filter(a=>{const t=a.effect&&a.effect.target;
      return t&&t.contains&&t.contains(e)&&a.playState==="running"&&isFinite(a.effect.getComputedTiming().endTime);});
    await Promise.race([Promise.all(anims.map(a=>a.finished.catch(()=>{}))),new Promise(r=>setTimeout(r,1500))]);
    if(!e.isConnected)return{gone:true};
    let b=e.getBoundingClientRect(),still=0;
    for(let k=0;k<60&&still<3;k++){await frame();const c=e.getBoundingClientRect();
      if(Math.abs(c.left-b.left)<.5&&Math.abs(c.top-b.top)<.5&&Math.abs(c.width-b.width)<.5)still++;else still=0;b=c;}
    if(!e.isConnected)return{gone:true};
    const cx=Math.round(b.left+b.width/2),cy=Math.round(b.top+b.height/2),hit=document.elementFromPoint(cx,cy);
    return{cx,cy,hit:!!hit&&(hit===e||e.contains(hit)),by:hit?(hit.id?"#"+hit.id:hit.className&&hit.className.baseVal==null?"."+String(hit.className).split(" ").join("."):hit.tagName):"nothing",
      w:Math.round(b.width),h:Math.round(b.height),inView:cx>=0&&cy>=0&&cx<=innerWidth&&cy<=innerHeight};};
}

(async()=>{
  const T=check("hunt_read"),ok=T.ok;
  const SEED={gems:50,wordsRead:60,settings:{goal:0,tierOverride:6,tts:false,voicePack:false},mine:{pet:"dog"}};
  const L=await launch({seed:SEED,viewport:{width:1024,height:768}});
  const {page:p,errs,E}=L;
  const boot=async()=>{await E(spies);};
  await boot();
  const counts={};            // elements tapped per screen
  const note=(scr,n)=>{counts[scr]=(counts[scr]||0)+n;};
  // every overlay down, Adventure left, the voice stopped, the random numbers from the top
  const clean=(s=7)=>E(s=>{try{Books.close();}catch(e){}try{Talk.close();}catch(e){}try{if(Adv.on)Adv.exit();}catch(e){}
    document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o));__seed(s);},s);
  // waits until nothing has changed for quiet ms (or max): pending timers of the last tap have fired
  async function settle(quiet=350,max=3000){
    const end=Date.now()+max;let last=await E(()=>__snap()),since=Date.now();
    while(Date.now()<end){await p.waitForTimeout(60);const s=await E(()=>__snap());
      if(s.dom!==last.dom||s.ev!==last.ev||s.stack!==last.stack){last=s;since=Date.now();}else if(Date.now()-since>=quiet)return;}
  }
  // what changed since before, within ms
  async function watch(before,ms=800){
    const end=Date.now()+ms;
    for(;;){const s=await E(()=>__snap()),ch=[];
      if(s.stack!==before.stack)ch.push("mode "+before.stack+" → "+s.stack);
      if(s.dom!==before.dom)ch.push("screen");if(s.st!==before.st)ch.push("save");
      if(s.ev>before.ev)ch.push("said/sound");
      if(ch.length){await p.waitForTimeout(120);const ev=await E(n=>__ev.slice(n),before.ev);return{ch,ev,after:await E(()=>__snap())};}
      if(Date.now()>end)return null;await p.waitForTimeout(40);}
  }
  const short=a=>a.slice(0,3).join("; ").slice(0,140);
  // one element: aim, tap with the touchscreen (or click when something covers it, and say so), watch
  async function tapOne(scr,idx,it,{closeTo,inert}={}){
    const aim=await E(i=>__aim(i),idx);
    if(!aim||aim.gone){T.fail(`${scr}: "${it.text||it.d}" was replaced by a new copy of itself before it could be tapped (a tap then would be lost)`);return null;}
    const e0=errs.length,before=await E(()=>__snap());
    if(!aim.inView)T.fail(`${scr}: "${it.text||it.d}" is off screen at 1024×768 (${aim.cx},${aim.cy})`);
    if(aim.hit)await p.touchscreen.tap(aim.cx,aim.cy);
    else{T.fail(`${scr}: "${it.text||it.d}" is covered by ${aim.by} at 1024×768; a tap there lands on that instead`);await E(i=>__E[i].click(),idx);}
    let r=await watch(before,800),bad=errs.slice(e0);
    // a touch that did nothing: does a plain click work? (then the touch itself is lost, which is a bug of its own)
    if(!r&&!it.dis&&!inert){await E(i=>{if(__E[i]&&__E[i].isConnected)__E[i].click();},idx);const r2=await watch(before,800);
      if(r2)T.fail(`${scr}: "${it.text||it.d}" ignores a touch tap at (${aim.cx},${aim.cy}) but answers a click (${r2.ch.join(", ")})`);r=r2;bad=errs.slice(e0);}
    if(it.dis||inert)ok(!r&&!bad.length,`${scr}: "${it.text||it.d}" is disabled here and a tap does nothing${r?" (but: "+r.ch.join(", ")+")":""}`);
    else ok(!!r&&!bad.length,`${scr}: tap "${it.text||it.d}" → ${r?r.ch.join(", ")+(r.ev.length?" ["+short(r.ev)+"]":""):"NOTHING happened"}${bad.length?" · ERRORS: "+bad.join(" | "):""}`);
    if(closeTo!=null&&r){const top=await E(()=>Modes.top());
      ok(top===closeTo,`${scr}: "${it.text||it.d}" closes back to ${closeTo} (now ${top})`);}
    return r;
  }
  // every element of a screen, each on a fresh copy of it
  async function sweep(scr,setup,o={}){
    const {sel,skip=[],closers={},inert=[],quiet=350,max=3000,only}=o;
    await setup();
    const list=await E(s=>__els(s),sel||null),seen={};
    const items=list.map(x=>{const n=seen[x.d]||0;seen[x.d]=n+1;return Object.assign({n},x);});
    let n=0;
    for(const it of items){
      if(skip.some(s=>it.d.indexOf(s)>=0||it.text.indexOf(s)>=0))continue;
      if(only&&!only.some(s=>it.d.indexOf(s)>=0||it.text.indexOf(s)>=0))continue;
      await setup();
      const idx=await E(([s,d,k])=>{const L=__els(s);let c=0;for(let i=0;i<L.length;i++)if(L[i].d===d){if(c===k)return i;c++;}return -1;},[sel||null,it.d,it.n]);
      if(idx<0){T.fail(`${scr}: "${it.text||it.d}" was not there on a fresh copy of the screen`);continue;}
      const cl=Object.keys(closers).find(k=>it.d.indexOf(k)>=0||it.text===k);
      await tapOne(scr,idx,it,{closeTo:cl!=null?closers[cl]:null,inert:inert.some(s=>it.d.indexOf(s)>=0)});n++;
      await settle(quiet,max);
    }
    note(scr,n);return items;
  }
  const gems=()=>E(()=>state.gems);
  const snapNums=()=>E(()=>({gems:state.gems,coins:state.mine.coins,words:state.wordsRead,right:state.comp.right,wrong:state.comp.wrong}));

  // sections, so one can be run alone: HUNT=books,maker node tests/hunt_read_e2e.js
  const want=(process.env.HUNT||"").split(",").filter(Boolean),runs=k=>!want.length||want.indexOf(k)>=0;
  // a page read the way he reads it: the wait for "I read it" skipped, then I read it
  const readPage=()=>E(()=>{const r=document.getElementById("bRead");if(r){r.disabled=false;r.click();}});
  const nextPage=()=>E(()=>document.getElementById("bNext").click());
  // straight to question k of a book (every page read, questions before k answered right)
  async function toQuiz(id,k=0){
    await clean();await E(i=>{Books.openBook(i);document.getElementById("bStart").click();},id);
    const n=await E(i=>BOOKS.find(b=>b.id===i).pages.length,id);
    for(let i=0;i<n;i++){await readPage();await nextPage();}
    for(let q=0;q<k;q++){await E(()=>{const h=document.querySelector("#ovStory .bopts");h.querySelector(`.bopt[data-v="${h.dataset.ans}"]`).click();});
      await waitFor(p,q=>Books._state().quizIdx>q,{arg:q,timeout:3000});}
    await waitFor(p,"#ovStory .bopts",{timeout:3000});
  }
  async function finishBook(id,{double=false}={}){
    await toQuiz(id,0);
    for(let q=0;q<8;q++){const has=await E(()=>!!document.querySelector("#ovStory .bopts"));if(!has)break;
      const qi=await E(()=>Books._state().quizIdx);
      await E(d=>{const h=document.querySelector("#ovStory .bopts"),b=h.querySelector(`.bopt[data-v="${h.dataset.ans}"]`);b.click();if(d)b.click();},double);
      await waitFor(p,qi=>Books._state().quizIdx>qi||!!document.querySelector("#ovStory .bpage.end"),{arg:qi,timeout:3000});}
    return waitFor(p,"#ovStory .bpage.end",{timeout:3000});
  }

  // ==================================================================================================
  // 1. BOOKS: the shelf, the picking state, the way to read together, the cover, a page, the questions, the end
  // ==================================================================================================
  if(runs("books")){
  await clean();
  const shelf=async()=>{await clean();await E(()=>{Books.shelf();});};
  {const info=await (async()=>{await shelf();return E(()=>({n:document.querySelectorAll("#ovStory .bcov").length,locked:document.querySelectorAll("#ovStory .bcov.locked").length,
    top:Modes.top()}));})();
   ok(info.top==="book"&&info.n>=40&&info.locked>0,`shelf: ${info.n} covers, ${info.locked} locked at level 6, mode "book"`);}
  await sweep("shelf",shelf,{closers:{"#bClose":"valley"},inert:[".locked"]});
  // every unlocked cover opens its own book
  {await shelf();const ids=await E(()=>[...document.querySelectorAll("#ovStory .bcov[data-id]:not(.locked)")].map(c=>c.dataset.id));const bad=[];
   for(const id of ids){await shelf();await E(i=>document.querySelector(`#ovStory .bcov[data-id="${i}"]`).click(),id);
     const s=await E(()=>Books._state().book);if(s!==id||!(await E(()=>!!document.querySelector("#ovStory .bpage.cover #bStart"))))bad.push(id+"→"+s);}
   ok(!bad.length,`shelf: each of the ${ids.length} unlocked covers opens its own book${bad.length?": "+bad.join(", "):""}`);}
  // the picking state: Read together → covers pick a book to read with Dad; Cancel puts the shelf back
  const picking=async()=>{await shelf();await E(()=>{state.settings.together="";document.getElementById("bTogether").click();});};
  await sweep("shelf, picking a book to read together",picking,{only:["#bTogether",".bcov[data-id=cat_hat]",".maker","#bClose"],closers:{"#bClose":"valley"}});
  {await picking();const t=await E(()=>({txt:document.getElementById("bTogether").textContent,pick:document.querySelector("#ovStory .bshelf").classList.contains("tgpicking")}));
   await E(()=>document.getElementById("bTogether").click());
   const u=await E(()=>({txt:document.getElementById("bTogether").textContent,pick:document.querySelector("#ovStory .bshelf").classList.contains("tgpicking"),sub:document.querySelector("#ovStory .sub").textContent}));
   ok(/Cancel/.test(t.txt)&&t.pick&&!u.pick&&/Read together/.test(u.txt)&&/audiobook/.test(u.sub),"picking: the button says ✕ Cancel, and Cancel puts the shelf back as it was");}
  // the first-time question: how to read together
  const tgask=async()=>{await picking();await E(()=>document.querySelector('#ovStory .bcov[data-id="cat_hat"]').click());};
  await sweep("read together: how shall we read it?",tgask,{closers:{"#bClose":"valley"}});
  // the cover, solo and together
  const cover=async()=>{await clean();await E(()=>Books.openBook("cat_hat"));};
  await sweep("cover",cover,{closers:{"#bClose":"valley"}});
  const coverTg=async()=>{await picking();await E(()=>{state.settings.together="turns";document.querySelector('#ovStory .bcov[data-id="cat_hat"]').click();});};
  await sweep("cover, read together",coverTg,{closers:{"#bClose":"valley"}});

  // ---- a page: fresh ("I read it" waits), then read, then Read it again ----
  const page0=async()=>{await clean();await E(()=>{Books.openBook("cat_hat");document.getElementById("bStart").click();});};
  // (a longer page, so "I read it" is still waiting while each tap is watched: 7 words × 380 ms)
  const pageLong=async()=>{await clean();await E(()=>{Books.openBook("bob_logs");document.getElementById("bStart").click();});};
  // #bRead's own disabled window (minMs) is timed against the reading time, and the generic sweep's
  // aim/settle wait (which waits out animations, up to ~1.5 s) can eat into that under a loaded
  // machine; skip it there and check it directly instead, with no aim overhead ahead of the tap
  await sweep("page (before I read it unlocks)",pageLong,{closers:{"#bClose":"valley"},skip:["#bRec","#bRead"]});
  {await pageLong();const before=await E(()=>({dis:document.getElementById("bRead").disabled,gems:state.gems,words:state.wordsRead}));
   ok(before.dis,"page (before I read it unlocks): ✓ I read it starts disabled");
   await E(()=>document.getElementById("bRead").click());await p.waitForTimeout(200);
   // the page keeps revealing its words meanwhile, so the whole DOM is not compared: the controls stay, nothing is paid
   const after=await E(()=>({ctl:getComputedStyle(document.querySelector("#ovStory .bctl")).display,aft:getComputedStyle(document.querySelector("#ovStory .bafter")).display,gems:state.gems,words:state.wordsRead}));
   ok(after.ctl!=="none"&&after.aft==="none"&&after.gems===before.gems&&after.words===before.words,"page (before I read it unlocks): a tap on ✓ I read it while disabled does nothing "+JSON.stringify(after));}
  {await page0();const t0=Date.now();const on=await waitFor(p,()=>{const r=document.getElementById("bRead");return r&&!r.disabled;},{timeout:4000});
   ok(on&&Date.now()-t0>=900,`page: "I read it" unlocks by itself after the reading time (${Date.now()-t0} ms for "A cat sat.")`);
   const before=await snapNums();await p.tap("#bRead");
   ok(await waitFor(p,()=>getComputedStyle(document.querySelector("#ovStory .bafter")).display!=="none"&&getComputedStyle(document.querySelector("#ovStory .bctl")).display==="none"),
     "page: a tap on I read it swaps in Hear it, Read it again and Next page");
   ok(J(await snapNums())===J(before),"page: reading a page pays nothing by itself (the book pays at the end)");}
  const pageAfter=async()=>{await page0();await readPage();};
  await sweep("page (after I read it)",pageAfter,{closers:{"#bClose":"valley"}});
  // the corner pet listens: it takes no taps, and it covers no button
  {await pageAfter();const c=await E(()=>{const pet=document.querySelector("#ovStory .blisten"),b=pet.getBoundingClientRect(),cs=getComputedStyle(pet);
     const under=[...document.querySelectorAll("#ovStory button")].filter(x=>{const r=x.getBoundingClientRect();return r.width&&!(r.right<b.left||r.left>b.right||r.bottom<b.top||r.top>b.bottom);}).map(x=>x.id);
     return{pe:cs.pointerEvents,under,box:[b.left,b.top,b.width,b.height].map(Math.round)};});
   ok(c.pe==="none"&&!c.under.length,`page: the corner pet (${c.box}) lets taps through and sits over no button${c.under.length?": over "+c.under.join(","):""}`);}
  // Read it again and its Done
  const reread=async()=>{await pageAfter();await E(()=>document.getElementById("bAgain").click());
    await waitFor(p,()=>{const x=document.querySelector("#ovStory .rrtext");return x&&x.style.display!=="none";});};
  await sweep("Read it again",reread,{sel:"#ovStory .breread"});
  {await reread();await E(()=>{delete state.rereadPaid;});const g0=await gems();await p.waitForTimeout(1000);await p.tap("#bAgainDone");await p.waitForTimeout(200);
   const g1=await gems(),still=await E(()=>!!document.querySelector("#ovStory .breread"));
   await E(()=>document.getElementById("bAgain").click());await waitFor(p,()=>{const x=document.querySelector("#ovStory .rrtext");return x&&x.style.display!=="none";});
   await p.waitForTimeout(1000);await p.tap("#bAgainDone");await p.waitForTimeout(200);
   ok(g1-g0===2&&!still&&await gems()===g1,`Read it again: Done closes it; the first timed reread of the page today pays +2 💎, the next pays nothing (${g0}→${g1}→${await gems()})`);}

  // ---- the page with the microphone: no microphone, then one that records ----
  {await page0();await E(()=>{window.__rec0=window.__rec0||{start:Rec.start,stop:Rec.stop};Rec.start=async()=>false;});
   await p.tap("#bRec");await p.waitForTimeout(300);
   const r=await E(()=>({btn:!!document.getElementById("bRec"),ev:__ev.slice(-3)}));
   ok(!r.btn&&r.ev.some(x=>/microphone is off/.test(x)),"page: with the microphone off, 🎤 says so kindly and goes away, leaving ✓ I read it "+J(r.ev));}
  const recStub=()=>E(()=>{window.__recOn=0;window.__recStops=0;Rec.start=async()=>{window.__recOn++;return true;};
    Rec.stop=async()=>{window.__recStops++;window.__recOn=Math.max(0,window.__recOn-1);return new Blob([new Uint8Array(2400)],{type:"audio/webm"});};});
  {await page0();await recStub();await p.tap("#bRec");
   ok(await waitFor(p,()=>/Done reading/.test(document.getElementById("bRec").textContent)&&document.querySelector("#ovStory .blisten").classList.contains("ears")),
     "page: 🎤 Read it to the dog starts recording (⏹ Done reading, the pet's ears up)");
   await p.tap("#bRec");
   ok(await waitFor(p,()=>getComputedStyle(document.querySelector("#ovStory .bafter")).display!=="none",{timeout:3000}),"page: ⏹ Done reading plays it back to the pet and moves on to Next page");
   const blob=await E(()=>DB.get("blobs","story:cat_hat:0").then(b=>!!b&&b.size));
   ok(blob===2400&&await E(()=>Books._state().recs)===1,"page: the recording is kept as the page's audiobook clip (story:cat_hat:0)");}
  // closing the book while it records: the microphone has to stop, and nothing is filed later against another page
  {await page0();await recStub();await p.tap("#bRec");await waitFor(p,()=>/Done reading/.test(document.getElementById("bRec").textContent));
   await E(()=>DB.del("blobs","story:fox_box:0"));
   await p.tap("#bClose");await p.waitForTimeout(300);
   const onAfter=await E(()=>window.__recOn);
   await E(()=>{Books.openBook("fox_box");document.getElementById("bStart").click();});
   ok(onAfter===0,`page: ✕ while recording lets the microphone go (${onAfter?"it is still recording":"stopped"})`);
   await p.waitForTimeout(15600);
   const later=await E(()=>DB.get("blobs","story:fox_box:0").then(b=>!!b));
   const shown=await E(()=>getComputedStyle(document.querySelector("#ovStory .bafter")).display!=="none");
   ok(!later&&!shown,`page: 15 s later the old recording is not filed as another book's page, and the new page is not marked read (${later?"filed as fox_box page 1":"not filed"}, ${shown?"Next page showed by itself":"still waiting"})`);
   await E(()=>{Rec.start=window.__rec0.start;Rec.stop=window.__rec0.stop;});}

  // ---- the questions: every kind ----
  const QS=[["cat_hat",0,"who / what (pictures)"],["red_bus",0,"how many (words)"],["pig_mud",0,"yes / no"],["zap_fox",0,"what happened first"],["zap_fox",1,"which page said it"]];
  for(const [id,k,kind] of QS){
    await sweep(`question: ${kind} (${id})`,()=>toQuiz(id,k),{closers:{"#bClose":"valley"},quiet:1300,max:4000});
  }
  // a miss takes nothing away, two misses make the right one glow, "which page said it" says the sentence again
  {await toQuiz("zap_fox",1);const n0=await snapNums();await E(()=>{window.__ev.length=0;});
   const wrongs=await E(()=>{const h=document.querySelector("#ovStory .bopts");return[...h.querySelectorAll(".bopt")].filter(b=>b.dataset.v!==h.dataset.ans).map(b=>b.dataset.v);});
   await p.tap(`#ovStory .bopt[data-v="${wrongs[0]}"]`);await p.waitForTimeout(900);
   const glow1=await E(()=>{const h=document.querySelector("#ovStory .bopts");return !!h.querySelector(`.bopt[data-v="${h.dataset.ans}"].hint`);});
   const again=await E(()=>__ev.filter(x=>/^say:sent:Zap zaps a pot/.test(x)).length);
   await p.tap(`#ovStory .bopt[data-v="${wrongs[1]}"]`);await p.waitForTimeout(300);
   const glow2=await E(()=>{const h=document.querySelector("#ovStory .bopts");return !!h.querySelector(`.bopt[data-v="${h.dataset.ans}"].hint`);});
   const n1=await snapNums();
   ok(!glow1&&glow2,"question: the right picture glows after the second miss, not the first");
   ok(n1.gems===n0.gems&&n1.coins===n0.coins&&n1.wrong===n0.wrong+2&&await E(()=>!!document.querySelector("#ovStory .bopts")),
     "question: a miss costs nothing and the question stays "+J({before:n0,after:n1}));
   ok(again>=1,"question: after the first miss on which-page-said-it, the sentence is read again ("+again+")");}

  // ---- the end: stars, gems and coins, paid once; Next book; back to the shelf ----
  {await clean();await E(()=>{delete state.library.fox_box;});const n0=await snapNums();
   const end=await finishBook("fox_box",{double:true});const n1=await snapNums(),lib=await E(()=>state.library.fox_box);
   const stars=await E(()=>(document.querySelector("#ovStory .bstars").textContent.match(/⭐/g)||[]).length);
   ok(end&&lib.done&&lib.reads===1&&n1.gems-n0.gems===6+2*lib.stars&&n1.coins-n0.coins===15&&n1.words-n0.words===5&&stars===lib.stars,
     `end: a first read pays 6+2×stars 💎 and 15 🪙 a level, once, even with double taps; the 5 pages count as reads (${J({gems:n1.gems-n0.gems,coins:n1.coins-n0.coins,words:n1.words-n0.words,stars:lib.stars})})`);
   const paid=await E(()=>document.querySelector("#ovStory .mpaid").textContent);
   ok(new RegExp("\\+"+(6+2*lib.stars)+" 💎").test(paid)&&/\+15 🪙/.test(paid),"end: the page says what it paid: "+paid);
   await p.waitForTimeout(1200);ok(J(await snapNums())===J(n1),"end: nothing more is paid after the end page");
   const n2=await snapNums();await finishBook("fox_box");const n3=await snapNums();
   ok(n3.gems-n2.gems===2&&n3.coins===n2.coins&&await E(()=>state.library.fox_box.reads)===2,`end: a reread pays 2 💎 and no coins (${n3.gems-n2.gems} 💎, ${n3.coins-n2.coins} 🪙)`);}
  const endPage=async()=>{await clean();await E(()=>{delete state.library.cat_hat;});await finishBook("cat_hat");};
  await sweep("end page",endPage,{closers:{"#bShelf":"book"},quiet:600});
  {await endPage();const nb=await E(()=>{const b=document.getElementById("bNextBook");return b&&b.textContent;});
   const next=await E(()=>{const n=Books.nextNew();return n&&n.id;});
   if(nb){await p.tap("#bNextBook");ok(await E(w=>Books._state().book===w&&!!document.querySelector("#ovStory .bpage.cover"),next),`end: "${nb}" opens that book's cover`);}
   else T.fail("end: no Next book button although books are waiting");
   await endPage();await p.tap("#bShelf");ok(await waitFor(p,()=>!!document.querySelector("#ovStory .bshelf")&&Modes.top()==="book"),"end: 📚 My books goes back to the shelf");}

  // ---- the audiobook: 🎧 Listen to me read it, and ⏹ Stop ----
  {await clean();await E(()=>{state.library.cat_hat=Object.assign(state.library.cat_hat||{},{done:true,rec:true,stars:2});
     return Promise.all([0,1,2,3,4].map(k=>DB.set("blobs","story:cat_hat:"+k,__wav(3))));});
   const listen=async()=>{await clean();await E(()=>{Books.openBook("cat_hat");});};
   await sweep("cover with his recording",listen,{only:["#bListen"]});
   const inListen=async()=>{await listen();await E(()=>document.getElementById("bListen").click());await waitFor(p,"#ovStory #bStop");};
   await inListen();await p.tap("#bStop");
   ok(await waitFor(p,()=>!!document.querySelector("#ovStory .bpage.cover")),"audiobook: ⏹ Stop goes back to the cover");
   await E(()=>Books.close());}

  // ---- Read together, both ways, to the end ----
  for(const way of ["turns","echo"]){
    await clean();await E(w=>{state.settings.together=w;delete state.library.pig_mud;},way);
    const n0=await snapNums();
    await E(()=>{Books.shelf();document.getElementById("bTogether").click();document.querySelector('#ovStory .bcov[data-id="pig_mud"]').click();});
    await p.tap("#bStart");
    const seq=[];
    for(let k=0;k<20;k++){
      const s=await E(()=>{const b=document.querySelector("#ovStory .bpage");return{who:b&&b.dataset.who||"",page:Books._state().page,quiz:!!document.querySelector("#ovStory .bopts")};});
      if(s.quiz)break;seq.push(s.page+(s.who==="grownup"?"D":"K"));
      if(s.who==="grownup")await p.tap("#bDad");else{await readPage();await p.tap("#bNext");}
    }
    ok(way==="turns"?seq.join(",")==="0K,1D,2K,3D,4K":seq.join(",")==="0D,0K,1D,1K,2D,2K,3D,3K,4D,4K",`Read together (${way}): the pages go ${seq.join(",")}`);
    for(let q=0;q<4;q++){
      // the check and the click are one round trip: a separate one leaves a gap where the quiz
      // can move on by itself (its own setTimeout), and the click would land on a stale .bopts
      const clicked=await E(()=>{const h=document.querySelector("#ovStory .bopts");if(!h)return false;
        h.querySelector(`.bopt[data-v="${h.dataset.ans}"]`).click();return true;});
      if(!clicked)break;await p.waitForTimeout(1000);}
    const end=await waitFor(p,"#ovStory .bpage.end");
    const n1=await snapNums(),lib=await E(()=>state.library.pig_mud);
    ok(end&&lib.together&&n1.gems-n0.gems===6+2*lib.stars&&n1.words-n0.words===(way==="turns"?3:5)&&await E(()=>/You read it with Dad/.test(document.querySelector("#ovStory .bpage.end").textContent)),
      `Read together (${way}): the end pays like a solo read, only his pages count (${n1.words-n0.words}), and says "You read it with Dad!"`);
  }
  // Dad's page: its controls
  const dadPage=async()=>{await clean();await E(()=>{state.settings.together="echo";Books.shelf();document.getElementById("bTogether").click();
    document.querySelector('#ovStory .bcov[data-id="pig_mud"]').click();document.getElementById("bStart").click();});};
  await sweep("Dad's page",dadPage,{closers:{"#bClose":"valley"}});
  }

  await L.close();
  for(const k of Object.keys(counts))console.log(`tapped: ${k}: ${counts[k]}`);
  T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
