const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8778},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const p=await b.newPage({viewport:{width:1180,height:820}});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const st={tour:99,guardians:[0,1,2,3],wordsRead:120,gems:100,rows:7,biome:3,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{"4,6":{id:"lantern",seed:1},"16,6":{id:"lantern",seed:2}},inventory:{},
    stats:{fox:{mastered:true},hen:{mastered:true}},lastWord:"frog",
    critters:[{id:"hen",c:5,r:8,seed:1},{id:"fox",c:8,r:8,seed:2},{id:"cat",c:12,r:8,seed:3},{id:"dog",c:15,r:8,seed:4},{id:"wolf",c:19,r:8,seed:5},{id:"dragon",c:10,r:7,seed:6,lv:3}],
    vehicles:[{u:"b1",id:"v_bus",c:3,r:7,face:"l",lv:2}]};
  await p.goto("http://localhost:8778/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  // bubble words: phonemes, tier and whether the synth knows every sound
  const bub=await p.evaluate(()=>{const bad=[],tiers={};Object.entries(BUB).forEach(([k,w])=>{const ph=splitPhonemes(w);tiers[w]=bubTier(ph);
    ph.forEach(x=>{if(!Phonics.known(soundOf?soundOf(x):x))bad.push(w+":"+x);});});return{bad:[...new Set(bad)],sample:["hop","dig","splash","dive","chomp","munch","bell","hiss","peck"].map(w=>w+"="+splitPhonemes(w).join("-")+"/t"+tiers[w]).join(" ")};});
  console.log("bubble words:",JSON.stringify(bub));
  // friendships: tap hen, fox should react
  await p.evaluate(()=>{const f=state.critters.find(c=>c.id==="fox");const h=state.critters.find(c=>c.id==="hen");f.c=h.c+3;f.r=h.r;moveCritter(f,0,0);bringIntoView(geom(h.c,h.r).x);});
  await p.waitForTimeout(600);
  const fox0=await p.evaluate(()=>state.critters.find(c=>c.id==="fox").c);
  await p.evaluate(()=>{Math.random=(()=>{const r=Math.random;return()=>0.1;})();nameThatAnimal("hen");});
  await p.waitForTimeout(1600);
  const fr=await p.evaluate(()=>({fox:state.critters.find(c=>c.id==="fox").c,shouts:[...document.querySelectorAll(".vshout")].map(x=>x.textContent)}));
  console.log("friendship: fox moved",fox0,"->",fr.fox,"shouts",fr.shouts.join("|"));
  await p.waitForTimeout(800);
  const bubble=await p.evaluate(()=>{const b=document.querySelector(".wordbub");return b?b.textContent:null;});
  console.log("bubble shown:",bubble);
  if(bubble){await p.screenshot({path:"bubble.png"});
    const bb=await (await p.$(".wordbub")).boundingBox();const g0=await p.evaluate(()=>state.gems);
    await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(6000);
    console.log("bubble tapped: gems",g0,"->",await p.evaluate(()=>state.gems),"| quest:",await p.evaluate(()=>JSON.stringify(state.quests.list.map(q=>q.k+":"+q.p))),"| still there:",await p.evaluate(()=>!!document.querySelector(".wordbub")));}
  // power-up: ★★ dragon lights the lanterns
  await p.evaluate(()=>{const d=state.critters.find(c=>c.id==="dragon");bringIntoView(geom(d.c,d.r).x);nameThatAnimal("dragon");});
  await p.waitForTimeout(1700);
  console.log("dragon lit lanterns:",await p.evaluate(()=>document.querySelectorAll(".tile.lit").length));
  await p.screenshot({path:"powerup.png"});
  // bus ★ takes 4 riders
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{useVehicle("b1");});await p.waitForTimeout(2000);
  console.log("bus riders:",await p.evaluate(()=>document.querySelectorAll(".critter.riding").length));
  await p.waitForTimeout(5000);
  // night
  await p.evaluate(()=>{state.phase=PHASES.findIndex(x=>x.id==="night");applyNight();});
  await p.waitForTimeout(2900);
  console.log("asleep at night:",await p.evaluate(()=>[...document.querySelectorAll(".critter.asleep")].map(e=>e.dataset.critter).join(",")));
  const g1=await p.evaluate(()=>state.gems);
  await p.evaluate(()=>{state.treats={};nameThatAnimal("hen");});await p.waitForTimeout(400);
  console.log("hen at night toast:",await p.evaluate(()=>document.getElementById("toast").textContent));
  await p.waitForTimeout(2500);
  await p.evaluate(()=>{nameThatAnimal("wolf");});await p.waitForTimeout(1500);
  console.log("wolf night bonus gems:",g1,"->",await p.evaluate(()=>state.gems));
  await p.screenshot({path:"night.png"});
  // evolution
  await p.evaluate(()=>evolveScene(1,2));await p.waitForTimeout(800);
  await p.screenshot({path:"evo1.png"});
  await p.click("#evoGo");await p.waitForTimeout(1500);await p.screenshot({path:"evo2.png"});
  await p.waitForTimeout(2600);await p.screenshot({path:"evo3.png"});
  console.log("evo text:",await p.evaluate(()=>document.getElementById("evoText").textContent),"| done btn:",await p.evaluate(()=>getComputedStyle(document.getElementById("evoDone")).display));
  await p.click("#evoDone");
  console.log("evo closed:",await p.evaluate(()=>!document.getElementById("ovEvo").classList.contains("on")));
  // evolution triggered by real reading across a stage boundary
  const trig=await p.evaluate(async()=>{state.wordsRead=STAGES[3].at-1;save();
    const before=stageIdx();state.wordsRead++;const after=stageIdx();return before+"->"+after;});
  console.log("stage boundary:",trig);
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();});
