// "Blend it" and "Say the word" always match the word on screen, whatever came before it.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8793},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  const st={tour:99,guardians:[0,1,2,3],wordsRead:40,gems:50,rows:7,biome:2,vehStarter:true,seasonSeen:"autumn",critters:[],vehicles:[]};
  await p.goto("http://localhost:8793/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2000);
  const E=x=>p.evaluate(x);
  // record what the buttons say instead of playing it
  await E(`window._said=[];Sound.say=(k)=>{window._said.push(k);return Promise.resolve();};Sound.speak=()=>Promise.resolve();
    document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));`);
  // (each screen says its word or story on its own when it opens; let that finish before pressing)
  const press=async id=>{await p.waitForTimeout(600);await E(`window._said=[]`);await E(`document.getElementById("${id}").click()`);await p.waitForTimeout(700);return E("window._said");};
  const words=["cat","fish","frog","shell","tent"];
  // before each word: a story crate (it used to take over both buttons), then a longer word left in the tiles
  const scenes=[["after a story crate",`openScramble(SIGNS[0])`],["after a long word",`openWord({...WORDS.find(x=>x.w==="sandwich")||WORDS.find(x=>x.p.length>=6),rung:0})`]];
  let bad=[];
  for(const [scene,before] of scenes)for(const w of words)for(const rung of [0,1,2]){
    await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));${before};document.getElementById("ovRead").classList.remove("on");`);
    await E(`openWord({...WORDS.find(x=>x.w==="${w}"),rung:${rung}})`);
    const p0=await E("cur.p");
    // Build it: fill the slots correctly first, so Blend has the whole word to sound out
    if(rung===1)await E(`(()=>{for(const ph of cur.p){const t=[...document.querySelectorAll("#letterBank .lt")].find(b=>b.dataset.ph===ph&&!b.classList.contains("used"));const o=t.onclick;cur._lock=true;const open=[...document.querySelectorAll("#slotsRow .wslot")].find(x=>!x.dataset.ph);open.textContent=tileText(ph);open.dataset.ph=ph;open.classList.add("filled");t.classList.add("used");}})()`);
    const ear=await press("earBtn"),blend=await press("blendBtn");
    const wantBlend=[...p0.map(x=>"sound:"+x),"word:"+w];
    if(JSON.stringify(ear)!==JSON.stringify(["word:"+w]))bad.push(`${scene} · ${w} rung ${rung} · Say the word said ${JSON.stringify(ear)}`);
    if(JSON.stringify(blend)!==JSON.stringify(wantBlend))bad.push(`${scene} · ${w} rung ${rung} · Blend said ${JSON.stringify(blend)}`);
  }
  ok(!bad.length,"Say the word / Blend it match the word on screen ("+bad.length+" mismatches)"+(bad.length?"\n   "+bad.slice(0,6).join("\n   "):""));
  // Build it, half built: Blend sounds out what he has built so far, and says no word yet
  await E(`openWord({...WORDS.find(x=>x.w==="frog"),rung:1})`);
  await E(`(()=>{const ph=cur.p[0];const t=[...document.querySelectorAll("#letterBank .lt")].find(b=>b.dataset.ph===ph);t.click();})()`);await p.waitForTimeout(200);
  const half=await press("blendBtn");
  ok(JSON.stringify(half)===JSON.stringify(["sound:f"]),"Build it half built: Blend sounds out only his tiles "+JSON.stringify(half));
  // Sound swap: Blend sounds out the tiles on screen and says the word they make
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));openSwap(swapPairs().find(q=>q.from.w==="cat"&&q.to.w==="hat")||swapPairs()[0]);window._pair={from:cur.from.w,fp:cur.from.p,to:cur.w,tp:cur.p}`);
  const pair=await E("window._pair");
  const sw1=await press("blendBtn");
  ok(JSON.stringify(sw1)===JSON.stringify([...pair.fp.map(x=>"sound:"+x),"word:"+pair.from]),`Sound swap before the change: Blend says "${pair.from}" `+JSON.stringify(sw1));
  const sayTo=await press("earBtn");
  ok(JSON.stringify(sayTo)===JSON.stringify(["word:"+pair.to]),`Sound swap: Say the word says the target "${pair.to}" `+JSON.stringify(sayTo));
  // story crate: both buttons read the story
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));openScramble(SIGNS[0])`);
  const s1=await press("blendBtn"),s2=await press("earBtn"),sent=await E("SIGNS[0].s");
  ok(s1.join()==="sent:"+sent&&s2.join()==="sent:"+sent,"story crate: both buttons read the story "+JSON.stringify([s1,s2]));
  ok(!errs.length,"no page errors "+errs.join(" | "));
  await b.close();srv.close();
});
