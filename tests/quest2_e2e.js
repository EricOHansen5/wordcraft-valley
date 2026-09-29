// VALLEY QUEST arc 2, "The Sleepy Volcano": unlock after The Letter Thief at level 3, chapters 1-3
// (letters, temple, spell), each prize paid once, every line decodable at its chapter level, old saves.
// Chapters 4-6 and the ending are walked in quest2b_e2e.js.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs"),path=require("path");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(path.join(__dirname,"../app/index.html")));}).listen(8817,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,serviceWorkers:"block"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  p.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text());});
  await p.addInitScript(()=>{
    // answer whatever reading challenge is in a host element, through dataset.ans / dataset.tiles
    window.__answer=sel=>{const h=document.querySelector(sel);if(!h||!h.dataset.ans)return"none";const a=h.dataset.ans;
      if(h.querySelector(".wslots")){const tiles=JSON.parse(h.dataset.tiles),bank=[...h.querySelectorAll(".wbank .lt")],used=new Set();
        tiles.forEach(ph=>{const t=bank.find((b,i)=>!used.has(i)&&b.textContent===tileText(ph));used.add(bank.indexOf(t));t.click();});return"build:"+a;}
      if(a[0]==="#"){h.querySelector(`.psopt[data-i="${a.slice(1)}"]`).click();return"sent";}
      h.querySelector(`[data-w="${a}"]`).click();return"word:"+a;};});
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  const E=(f,a)=>p.evaluate(f,a);
  // all three keepers awake: land 2's keeper would otherwise wake 1.5 s after boot, and its scene (an overlay) can land after
  // the overlays are cleared on a slow run, which pauses Adventure's action button
  const base={tour:99,guardians:[0,1,2],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{"6,8":{id:"cottage",seed:3,lv:1}},inventory:{},
    critters:[{id:"dog",c:14,r:8,seed:1}],vehicles:[],adv:{seenIntro:1,dex:{}},blueprints:["lantern"],
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},owned:{miner:1,cap:1},made:true,pet:"dog",bosses:{},eggs:[]}};
  const seed=async s=>{
    await p.goto("http://localhost:8817/");
    await E(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
      r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),s);
    await p.reload();await p.waitForTimeout(2200);
    await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  };
  const near=(c,r)=>E(([c,r])=>{Adv._P.c=c;Adv._P.r=r;},[c,r]);
  const act=()=>E(()=>document.getElementById("advAct").textContent);
  // Adventure's action button names the first thing in reach, not the nearest, so a spot placed at random can sit
  // in reach of another one: step around inside the target's reach until the button names it
  const walkTo=async(c,r,re)=>{let lab="";
    for(const [dc,dr] of [[0,0],[.5,0],[-.5,0],[0,.4],[0,-.4],[.9,0],[-.9,0],[.5,.5],[-.5,-.5],[.5,-.5],[-.5,.5]]){
      await near(c+dc,r+dr);for(let k=0;k<6;k++){await p.waitForTimeout(100);lab=await act();if(re.test(lab))return lab;}}
    return lab;};
  const nexts=async n=>{for(let i=0;i<n;i++){await p.click("#qNext");await p.waitForTimeout(220);}};
  const tomorrow=()=>E(()=>{state.quest2.day="2000-01-01";state.quest2.giverDay=null;});

  // ---- 1 an old save (no quest2), arc 1 not finished ----
  await seed(Object.assign({},base,{quest:{ch:2,day:"2000-01-01",active:null,done:false,letters:["R","E"]}}));
  const d0=await E(()=>JSON.stringify(state.quest2));
  ok(d0===JSON.stringify({ch:0,day:null,active:null,done:false,got:[]}),"old save gets quest2 defaults: "+d0);
  ok(await E(()=>JSON.stringify(withDefaults({quest2:null}).quest2)===JSON.stringify(def().quest2)&&withDefaults({quest2:{ch:2}}).quest2.ch===2),
    "a saved null quest2 gets the defaults, a saved one is kept");
  ok(await E(()=>state.quest.ch===2&&state.quest.letters.join("")==="RE"),"arc 1's save is untouched");
  await E(()=>{state.settings.tierOverride=5;});
  ok(await E(()=>!Quest2.available()&&Quest.available()),"arc 2 is not offered while The Letter Thief is unfinished (even at level 5)");
  ok(/starts after The Letter Thief/.test(await E(()=>Quest2.note())),"the report says it starts after The Letter Thief");
  await p.click("#advBtn");await p.waitForTimeout(900);
  ok(await E(()=>state.quest2.giver==null&&!!state.quest.giver),"only Gloom's ❗ is in the valley");
  await E(()=>{state.quest.ch=6;state.quest.done=true;state.quest.day=today();Adv.redraw();});
  ok(await E(()=>!Quest2.available()),"not on the day The Letter Thief ends");
  await E(()=>{state.quest.day="2000-01-01";state.settings.tierOverride=2;Adv.redraw();});
  ok(await E(()=>!Quest2.available()&&state.quest2.giver==null),"not below level 3");
  await E(()=>{state.settings.tierOverride=3;});
  ok(await E(()=>Quest2.available()),"offered at level 3 once arc 1 is done");
  await p.click("#advDone");await p.waitForTimeout(300);

  // ---- 2 a save with arc 1 done, at level 3 ----
  await seed(Object.assign({},base,{settings:{tierOverride:3},quest:{ch:6,day:"2000-01-01",active:null,done:true,letters:["R","E","A","D","🔑","👑"]}}));
  ok(await E(()=>currentTier()===3&&Quest2.available()&&document.getElementById("advBadge").textContent==="❗"),"Adventure button shows ❗ for Puff");
  await p.click("#advBtn");await p.waitForTimeout(900);
  const giver=await E(()=>state.quest2.giver);ok(!!giver,"Puff's ❗ giver is placed");
  ok(await E(()=>!!document.querySelector(".advland.qgiver .qg:not(.friend)")),"the giver is drawn");
  const a1=await walkTo(giver.c,giver.r,/Chapter 1/);
  ok(/Chapter 1/.test(a1),"walk up: ❗ Chapter 1 ("+a1+")");
  const g0=await E(()=>({gems:state.gems,crit:state.critters.length,read:state.wordsRead}));
  await p.click("#advAct");await p.waitForTimeout(400);
  ok(/Chapter 1: Puff and the Eggs/.test(await E(()=>document.querySelector("#ovQuest .qhead b").textContent)),"chapter 1 story opens");
  await p.screenshot({path:"q2_story.png"});
  await nexts(4);
  const spots=await E(()=>state.quest2.active&&state.quest2.active.spots);ok(spots&&spots.length===3,"chapter 1: three eggs hidden");
  ok(await E(()=>[...document.querySelectorAll(".advland.qletter .qlt")].filter(x=>x.textContent==="🥚").length===3),"the eggs show in the valley");
  for(let i=0;i<3;i++){const lab=await walkTo(spots[i].c,spots[i].r,/Get the egg/);
    ok(/Get the egg/.test(lab),"egg "+(i+1)+": action says Get the egg ("+lab+")");
    await p.click("#advAct");await p.waitForTimeout(400);
    if(i===0){await E(()=>{const h=document.querySelector("#ovQuest .qbody"),w=[...h.querySelectorAll("[data-w]")].find(b=>b.dataset.w!==h.dataset.ans);w.click();});
      await p.waitForTimeout(600);ok(await E(()=>state.quest2.active.found.length===0),"a wrong picture takes nothing away");}
    ok(/^word:/.test(await E(()=>__answer("#ovQuest .qbody"))),"egg "+(i+1)+" answered through dataset.ans");
    await E(()=>{const h=document.querySelector("#ovQuest .qbody");const b=h.querySelector(".right");if(b)b.click();});   // a second tap on the answer
    await p.waitForTimeout(1300);await p.click("#qOk");await p.waitForTimeout(500);}
  await p.screenshot({path:"q2_ch1.png"});
  const g1=await E(()=>({ch:state.quest2.ch,got:state.quest2.got.join(),gems:state.gems,liz:state.critters.filter(c=>c.id==="lizard").length,crit:state.critters.length,
    msg:(document.querySelector("#ovQuest .qwin")||{}).textContent||""}));
  ok(g1.ch===1&&g1.got==="0"&&g1.liz===1&&g1.crit===g0.crit+1,"chapter 1 done: a lizard hatched, ch 1: "+JSON.stringify(g1));
  ok(g1.gems===g0.gems+18,"chapter 1 pays 18 gems: "+g0.gems+" -> "+g1.gems);
  ok(/Chapter 1 done/.test(g1.msg)&&/lizard/i.test(g1.msg)&&/tomorrow/.test(g1.msg),"win sheet: "+g1.msg.replace(/\s+/g," ").trim());
  await E(()=>Quest2._finish());
  ok(await E(g=>state.quest2.ch===1&&state.gems===g.gems&&state.critters.length===g.crit,g1),"finishing again pays nothing");
  await p.click("#qOk");await p.waitForTimeout(200);
  ok(await E(()=>!Quest2.available()),"chapter 2 waits until tomorrow");
  await tomorrow();
  ok(await E(()=>!Quest2.available()),"chapter 2 waits for level 4");
  ok(/Chapter 2 opens at reading level 4/.test(await E(()=>Quest2.note())),"the report says chapter 2 opens at level 4");

  // ---- 3 chapter 2: Puff's den (temple), level 4 ----
  await E(()=>{state.settings.tierOverride=4;Adv.redraw();});
  ok(await E(()=>Quest2.available()&&!!state.quest2.giver&&Quest2.note()===""),"level 4 next day: chapter 2 offered");
  await E(()=>Quest2.start());await p.waitForTimeout(300);
  ok(/Chapter 2: The Big Egg/.test(await E(()=>document.querySelector("#ovQuest .qhead b").textContent)),"chapter 2 story opens");
  await nexts(4);
  for(let r=0;r<3;r++){
    if(r===0){ok(/Puff's den · room 1 of 3/.test(await E(()=>document.querySelector("#ovQuest .qhead b").textContent)),"the den has three rooms");
      await p.screenshot({path:"q2_den.png"});await E(()=>document.querySelector('.tdoor[data-ok="0"]').click());await p.waitForTimeout(1000);}
    await E(()=>document.querySelector('.tdoor[data-ok="1"]').click());await p.waitForTimeout(1300);}
  const g2a=await E(()=>state.gems);
  ok(await E(()=>!!document.querySelector("#qOpen")),"the den chest");
  await E(()=>{const b=document.querySelector("#qOpen");b.click();b.click();});await p.waitForTimeout(400);   // double tap
  await p.screenshot({path:"q2_ch2.png"});
  const g2=await E(()=>({ch:state.quest2.ch,got:state.quest2.got.join(),gems:state.gems,plans:state.blueprints.filter(x=>x==="volcano").length,
    msg:(document.querySelector("#ovQuest .qwin")||{}).textContent||""}));
  ok(g2.ch===2&&g2.got==="0,1"&&g2.plans===1,"chapter 2 done: the volcano plan, once: "+JSON.stringify(g2));
  ok(g2.gems===g2a+20,"a double tap on the chest pays once (20 gems): "+g2a+" -> "+g2.gems);
  ok(/volcano plan/i.test(g2.msg),"win sheet names the plan");
  await p.click("#qOk");await p.waitForTimeout(200);
  await tomorrow();
  ok(await E(()=>!Quest2.available()),"chapter 3 waits for level 5");

  // ---- 4 chapter 3: the wake-up spell (build words), level 5 ----
  await E(()=>{state.settings.tierOverride=5;Adv.redraw();});
  ok(await E(()=>Quest2.available()),"level 5 next day: chapter 3 offered");
  await E(()=>Quest2.start());await p.waitForTimeout(300);await nexts(4);
  const built=[];
  for(let k=0;k<3;k++){
    const hd=await E(()=>document.querySelector("#ovQuest .qhead b").textContent);
    if(k===0)await p.screenshot({path:"q2_spell.png"});
    built.push(await E(()=>__answer("#ovQuest .qbody")));ok(new RegExp((k+1)+" of 3").test(hd),"spell step "+(k+1)+": "+hd+" -> "+built[k]);
    await p.waitForTimeout(1500);}
  ok(built.join()==="build:stone,build:bone,build:lake","the spell is stone, bone, lake");
  const g3a=await E(()=>({gems:state.gems,t:state.critters.filter(c=>c.id==="trex").length}));
  await E(()=>{const b=document.querySelector("#qOpen");b.click();b.click();});await p.waitForTimeout(400);
  await p.screenshot({path:"q2_ch3.png"});
  const g3=await E(()=>({ch:state.quest2.ch,got:state.quest2.got.join(),gems:state.gems,t:state.critters.filter(c=>c.id==="trex").length,done:state.quest2.done,
    msg:(document.querySelector("#ovQuest .qwin")||{}).textContent||""}));
  ok(g3.ch===3&&g3.got==="0,1,2"&&g3.t===g3a.t+1&&!g3.done,"chapter 3 done: a T. rex hatched, arc not over: "+JSON.stringify(g3));
  ok(g3.gems===g3a.gems+22,"chapter 3 pays 22 gems once");
  ok(/tomorrow/.test(g3.msg)&&!/on the way/.test(g3.msg),"chapter 3 ends on the next chapter tomorrow, not on more to come");
  await p.click("#qOk");await p.waitForTimeout(200);
  await tomorrow();
  ok(await E(()=>Quest2.available()&&!Adv.redraw()&&!!document.querySelector(".advland.qgiver .qg:not(.friend)")),"level 5 next day: chapter 4 is offered, Puff's giver is back");
  await p.click("#advDone");await p.waitForTimeout(300);

  // ---- 5 the report, the lines, the voice list ----
  await E(()=>openReport());await p.waitForTimeout(300);
  const rep=await E(()=>[...document.querySelectorAll("#ovReport .rnote")].map(x=>x.textContent).join(" | "));
  ok(/The Letter Thief: 6 of 6 chapters/.test(rep)&&/The Sleepy Volcano: 3 of 6 chapters/.test(rep),"report: "+(rep.match(/The Letter Thief[^|]*/)||[""])[0]);
  await E(()=>Modes.shut(document.getElementById("ovReport")));
  const dec=await E(()=>Quest2.CH.map((c,i)=>({i,lvl:c.lvl,bad:[c.title].concat(c.story).map(t=>Decode.check(t,c.lvl).filter(x=>!x.ok).map(x=>x.w+":"+x.t).join(" ")).filter(Boolean)})));
  dec.forEach(d=>ok(!d.bad.length,`chapter ${d.i+1}: every line decodable at level ${d.lvl}${d.bad.length?" — "+d.bad.join("; "):""}`));
  ok(await E(()=>Quest2.CH.map(c=>c.lvl).join()==="3,4,5,5,6,6"&&Quest2.CH.length===6&&Quest2.TOTAL===6),"six chapters at levels 3, 4, 5, 5, 6, 6");
  const texts=JSON.parse(fs.readFileSync(path.join(__dirname,"../tools/voice/voice_texts.json"),"utf8")).sents;
  const lines=await E(()=>[].concat(...Quest2.CH.map(c=>c.story)));
  const miss=lines.filter(t=>!texts.includes(t));
  ok(!miss.length,`every story line is in voice_texts.json (${lines.length})${miss.length?": missing "+miss.join(" / "):""}`);
  ok(!errs.length,"no console errors"+(errs.length?": "+errs.slice(0,5).join(" | "):""));
  await b.close();srv.close();
});
