// The kindergarten tricky word checklist is in his base level: every word is there, spells right, can be sounded, and comes round in crates.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const LIST="one all were two from here three was there the when he a word she blue why we yellow to be look where me I no they are what their little so my down which by out once you of said your funny says".split(" ");
const srv=require("./page").serveApp({port:8794},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  const st={tour:99,guardians:[0],wordsRead:3,gems:10,rows:5,biome:0,vehStarter:true,seasonSeen:"autumn",critters:[],vehicles:[]};
  await p.goto("http://localhost:8794/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2000);
  const E=(x,a)=>p.evaluate(x,a);
  const r=await E(L=>{const out={missing:[],notBase:[],notTricky:[],spell:[],sound:[]};
    for(const w of L){const x=WORDS.find(y=>y.w===w);if(!x){out.missing.push(w);continue;}
      if(x.t!==1)out.notBase.push(w+":"+x.t);if(!x.tricky)out.notTricky.push(w);
      const spelt=x.p.map(tileText).join("").replace(/-/g,"");if(spelt.toLowerCase()!==w.toLowerCase())out.spell.push(w+"→"+spelt);
      x.p.forEach(ph=>{const q=soundOf(ph);if(q!==""&&!Phonics.known(q))out.sound.push(w+":"+ph);});}
    out.dups=(a=>a.filter((x,i)=>a.indexOf(x)!==i))(WORDS.map(x=>x.w));return out;},LIST);
  ok(!r.missing.length,"every checklist word is in the game "+r.missing.join(","));
  ok(!r.notBase.length&&!r.notTricky.length,"all at the base level as heart words "+r.notBase.concat(r.notTricky).join(","));
  ok(!r.spell.length,"each word's tiles spell it "+r.spell.join(","));
  ok(!r.sound.length,"every tile can be sounded out "+r.sound.join(","));
  ok(!r.dups.length,"no word listed twice "+r.dups.join(","));
  // crates at level 1: checklist words come round, never more than one in a set
  const c=await E(L=>{state.stats={};state.review=[];let most=0,seen=new Set();
    for(let k=0;k<300;k++){const cr=pickCrates().filter(o=>o.w&&o.p);const tr=cr.filter(o=>o.tricky);most=Math.max(most,tr.length);
      tr.forEach(o=>seen.add(o.w));cr.forEach(o=>{const s=state.stats[o.w]||(state.stats[o.w]={seen:0,first:0,miss:0,rung:0,rungClean:0});s.seen++;});}
    return{tier:currentTier(),most,got:L.filter(w=>seen.has(w)).length};},LIST);
  ok(c.most<=1,"at most one heart word per crate set (saw "+c.most+")");
  ok(c.got===LIST.length,"all "+LIST.length+" checklist words came round in 300 crate sets (got "+c.got+")");
  // heart words don't hold back levelling up: level 1's sounding-out words mastered is enough
  const t=await E(()=>{const st={};WORDS.filter(w=>w.t===1&&!w.tricky).forEach(w=>{st[w.w]={seen:2,first:2,miss:0,mastered:true,rung:2,rungClean:0};});
    state.stats=st;state.settings.tierOverride=0;state.pace={};return currentTier();});
  ok(t>=2,"level 2 opens without mastering the heart words first (level "+t+")");
  // a new word opens and its tiles play
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));openWord({...WORDS.find(x=>x.w==="once"),rung:0})`);
  const tiles=await E(()=>[...document.querySelectorAll("#letters .lt")].map(t=>t.textContent+(t.classList.contains("heart")?"♥":"")).join(" "));
  ok(tiles==="o♥ n ce♥","once shows o♥ n ce♥: "+tiles);
  ok(!errs.length,"no page errors "+errs.join(" | "));
  await b.close();srv.close();
});
