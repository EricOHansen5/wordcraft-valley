// Double taps, old saves and dates: one reward per answer, nothing frozen or lost after a reload.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8792,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  // evening in California: UTC is already tomorrow
  const ctx=await b.newContext({viewport:{width:1180,height:820},timezoneId:"America/Los_Angeles"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  // an old save: settings from before nature sounds / spelling share existed, and a rocket saved mid-launch
  const st={tour:99,guardians:[0,1,2,3],wordsRead:30,gems:500,rows:7,biome:3,vehStarter:true,seasonSeen:"autumn",critters:[{id:"fox",c:5,r:8,seed:1}],
    settings:{pics:true,tts:true,ambient:true,tierOverride:0},
    vehicles:[{u:"vr1",id:"v_rocket",c:6,r:8,lv:1,out:true,since:1,busy:1,hold:1}],
    mine:{seed:7,dug:"",x:20.2,y:5.05,coins:0,bag:{},pick:0,bagLv:0,lamp:0,boots:0,shopLv:0,look:{skin:0,hair:0,hairStyle:0,shirt:1,pants:0,helmet:"miner"},owned:{miner:1,cap:1},made:true,deepest:0,dugCount:0,layers:[],mineNo:1,w:50}};
  await p.clock.install({time:new Date("2026-09-26T19:30:00-07:00")});
  await p.goto("http://localhost:8792/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.clock.runFor(2500);
  const E=x=>p.evaluate(x),run=ms=>p.clock.runFor(ms);
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);

  // old saves
  const set=await E("state.settings");
  ok(set.nature===true&&set.spell===.6&&set.timer===0,"missing settings get their defaults: "+JSON.stringify(set));
  const rk=await E(`state.vehicles.find(v=>v.id==="v_rocket")`);
  ok(!rk.busy&&!rk.hold,"a stunt cut short by a reload doesn't freeze the vehicle");

  // dates are the family's day
  ok(await E("today()")==="2026-09-26","today() is the local date at 7:30 pm in California: "+await E("today()"));

  // Build it: take a tile out and put it back during the success pause
  {const w0=await E("state.wordsRead");
   await E(`openWord({...WORDS.find(x=>x.w==="cat"),rung:1})`);
   const place=async()=>{for(const ph of await E("cur.p"))await E(`[...document.querySelectorAll("#letterBank .lt")].find(b=>b.dataset.ph===${JSON.stringify(ph)}&&!b.classList.contains("used"))?.click()`);};
   await place();await run(100);await E(`document.querySelector("#slotsRow .wslot").click()`);await place();await run(2000);
   ok(await E("state.wordsRead")-w0===1,"Build it: rewarded once after extra taps");}

  // Build it: no extra tile that sounds like one in the word
  {let bad=new Set();
   for(let k=0;k<150;k++){const x=await E(`(()=>{const w=WORDS.find(x=>x.w==="duck");openWord({...w,rung:1});
       return [...document.querySelectorAll("#letterBank .lt")].map(b=>b.dataset.ph).filter(p=>!w.p.includes(p));})()`);
     x.forEach(ph=>bad.add(ph));}
   await E(`document.getElementById("ovRead").classList.remove("on")`);
   const same=await E(`${JSON.stringify([...bad])}.filter(p=>["d","u","k"].includes(Phonics.resolve(p)))`);
   ok(!same.length,"duck: extra tiles never sound like d/u/ck "+(same.join(",")||""));}

  // Sound swap: double tap on the right tile
  {const w0=await E("state.wordsRead");
   await E(`openSwap(swapPairs().find(p=>p.from.w==="cat"&&p.to.w==="hat")||swapPairs()[0])`);
   await E(`(()=>{const want=cur.p[cur.at];const t=[...document.querySelectorAll("#letterBank .lt")].find(b=>b.textContent===tileText(want));t.click();t.click();})()`);
   await run(2000);ok(await E("state.wordsRead")-w0===1,"Sound swap: rewarded once after a double tap");
   await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);}

  // shared challenges: done() once, and a tap after the right answer doesn't turn it into a miss
  for(const kind of ["pic","wordPick","sentence"]){
    const r=await E(`(()=>{window._n=0;window._ok=null;const h=document.createElement("div");document.body.appendChild(h);window._h=h;
      Read.${kind}(h,v=>{window._n++;window._ok=v;});
      const right=h.querySelector("[data-w='"+h.dataset.ans+"']")||h.querySelector(".psopt[data-i='"+h.dataset.ans.slice(1)+"']");
      const wrong=[...h.querySelectorAll("[data-w],.psopt")].find(b=>b!==right);right.click();right.click();wrong.click();return true;})()`);
    await run(1500);
    ok(await E("window._n")===1&&await E("window._ok")===true,`Read.${kind}: done(true) once after right, right, wrong (${await E("window._n")}×, ${await E("window._ok")})`);
    await E("window._h.remove()");}

  // storybook questions: a double tap doesn't skip the next question
  {const id=await E(`BOOKS.find(b=>!b.mine&&b.quiz&&b.quiz.length>=2).id`);
   await E(`Books.openBook(${JSON.stringify(id)})`);const n=await E(`BOOKS.find(b=>b.id===${JSON.stringify(id)}).pages.length`);
   await E(`document.getElementById("bStart").click()`);
   for(let i=0;i<n;i++){await E(`(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();})()`);}
   let asked=0;const quiz=await E(`BOOKS.find(b=>b.id===${JSON.stringify(id)}).quiz`);
   for(let k=0;k<quiz.length+1;k++){if(!await E(`!!document.querySelector(".bopt")`))break;asked++;
     const q=quiz[(await E("Books._state()")).quizIdx],ans=q.pics||q.words?q.a:(q.yes?"yes":"no");
     await E(`(()=>{const b=document.querySelector('.bopt[data-v="${ans}"]');b.click();b.click();})()`);await run(1000);}
   ok(asked===quiz.length,`storybook: every question asked after double taps (${asked}/${quiz.length})`);
   await E("Books.close()");}

  // treasure hunt: a second tap on the spot just dug is not a wrong dig
  {await E("state.adv={dex:{},seenIntro:1};Adv.enter();Adv.newHunt()");await run(300);
   const miss=await E(`(()=>{const h=Adv._A().hunt,m=h.marks[h.order[0]];Adv._P.c=m.c;Adv._P.r=m.r;return 0;})()`);
   await E(`document.getElementById("noteGo").click()`);await run(300);await E("Adv._act();Adv._act()");await run(800);
   ok(await E("Adv._A().hunt.miss")===0&&await E("Adv._A().hunt.step")===1,"treasure hunt: double tap on the right spot is not a miss");
   await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);
   // a treasure mark never lands on a note (the note would take the button and the mark could never be dug)
   const clash=await E(`(()=>{state.notes=[{id:"nx",text:"Hi.",from:"Dad",at:1,c:9,r:7.4,found:false}];Adv.redraw();let n=0;
     for(let k=0;k<60;k++){Adv._A().hunt=null;Adv.newHunt();document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));
       if(Adv._A().hunt.marks.some(m=>Math.abs(m.c-9)<1.6&&Math.abs(m.r-7.4)<1))n++;}
     state.notes=[];Adv._A().hunt=null;Adv.redraw();return n;})()`);
   ok(clash===0,"treasure marks never land on a note ("+clash+" of 60 hunts did)");
   // the edge that 60 random hunts only hit now and then: a spot that clears the note before
   // rounding (10.6049) but not after (10.60, and 10.60-9 is 1.5999... in floating point)
   const edge=await E(`(()=>{const v=(10.6049-1)/(COLS-3),r0=+((ROWS_MAX-state.rows)+v*(state.rows-1)).toFixed(2);
     state.notes=[{id:"ne",text:"Hi.",from:"Dad",at:1,c:9,r:r0,found:false}];Adv.redraw();
     const R=Math.random;Math.random=()=>v;try{Adv._A().hunt=null;Adv.newHunt();}finally{Math.random=R;}
     document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));
     const bad=Adv._A().hunt.marks.filter(m=>Math.abs(m.c-9)<1.6&&Math.abs(m.r-r0)<1).length;
     state.notes=[];Adv._A().hunt=null;Adv.redraw();return bad;})()`);
   ok(edge===0,"treasure mark on the rounding edge of a note is kept clear ("+edge+" on it)");
   // nothing placed with freePos (quest giver, notes) or as a treasure mark lands where it would take a building's button
   const shade=await E(`(()=>{const g0=state.grid;state.grid={"9,7":{id:"cottage",lv:1}};Adv.redraw();
     const by=p=>Math.abs(p.c-9)<2.2&&Math.abs(p.r-7)<1.5;let n=0,m=0;
     for(let k=0;k<200;k++)if(by(Adv.freePos(1)))n++;
     for(let k=0;k<60;k++){Adv._A().hunt=null;Adv.newHunt();document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));
       if(Adv._A().hunt.marks.some(by))m++;}
     state.grid=g0;Adv._A().hunt=null;Adv.redraw();return n+"/"+m;})()`);
   ok(shade==="0/0","free spots and treasure marks keep clear of buildings (spots/hunts on one: "+shade+")");
   await E("Adv.exit()");}

  // mine: shop counter and a full backpack
  {await E("Mine.enter()");await run(500);await E(`document.getElementById("mPanel").classList.remove("on")`);
   await E("state.mine.bag={1:1};Mine._openShop()");await run(200);const c0=await E("state.mine.coins");
   await E(`document.querySelector("#mBagRow .mitem").click()`);await E(`(()=>{const g=document.getElementById("mGive");g.click();g.click();})()`);await run(50);
   ok(await E("state.mine.ordersRight")===1&&JSON.stringify(await E("state.mine.bag"))==="{}","shop: a double tap on Give sells once, coins +"+(await E("state.mine.coins")-c0));
   await run(1600);await E(`document.getElementById("mClose").click()`);
   const digAt=async(x,bag)=>{await E(`(()=>{const P=Mine._p;P.x=${x};P.y=Mine.SKY-.95;P.vx=P.vy=0;state.mine.bag=${bag};const cx=Math.floor(P.x+P.w/2);
     Mine._setTile(cx,Mine.SKY,2);Mine._setOre(cx,Mine.SKY,3);window._cx=cx;Mine._in.dig=true;})()`);
     await run(1500);await E("Mine._in.dig=false");return{ore:await E("Mine._ore(window._cx,Mine.SKY)"),tile:await E("Mine._tile(window._cx,Mine.SKY)"),bag:await E("state.mine.bag")};};
   const room=await digAt(24.2,"{}");
   ok(room.tile===0&&room.bag[3]===1,"mine: with room in the backpack the gem is dug out "+JSON.stringify(room));
   const full=await digAt(30.2,"{1:10}");
   ok(full.ore===3&&full.tile===2&&!full.bag[3],"mine: a full backpack leaves the gem in the rock "+JSON.stringify(full));
   // the lost animal is never put in (or by the door of) a locked word vault
   const lost=await E(`(()=>{const V=Mine._vaults(),m=state.mine,bosses=m.bosses;m.bosses={beetle:1,golem:1,troll:1,worm:1,dragon:1};m.vaults={};m.deepest=110;let bad=0;
     const inV=L=>V.some(v=>L.x>=v.x0-2&&L.x<=v.x0+8&&L.y>=v.y0-2&&L.y<=v.y0+6);
     for(let k=0;k<200;k++){delete m.lost;if(inV(Mine._lost()))bad++;}
     const v=V[0];m.lost={date:today(),id:"fox",x:v.x0+3,y:v.y0+2,rescued:false};const moved=Mine._lost();
     m.bosses=bosses;return{bad,moved:!inV(moved),vaults:V.length};})()`);
   ok(lost.bad===0&&lost.moved,"the lost animal stays clear of locked vaults ("+lost.bad+" of 200 picks weren't; a saved one inside is moved: "+lost.moved+")");
   await E("Mine.exit()");}

  // the note checker sees custom words added after it first ran
  {await E(`Decode.tier("cat")`);await E(`state.customWords=[{w:"zib",p:["z","i","b"],t:1,custom:true}]`);
   ok(await E(`Decode.tier("zib")`)===1,"note checker picks up a new custom word list: level "+await E(`Decode.tier("zib")`));
   await E("state.customWords=[]");}

  // wandering animals and vehicles don't rewrite the whole save every couple of seconds
  {await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));addVehicle("v_car",false);addItem("hen");`);
   await run(8000);   // let the setup's own saves (and any badge it earns) land first
   await E(`window._w=0;const o=DB.set;DB.set=(...a)=>{if(a[1]==="state")window._w++;return o(...a);};`);
   await run(12000);const n=await E("window._w");
   ok(n<=2,"12 s of wandering writes the save at most twice ("+n+")");}

  // a hunter two steps from its prey pounces (nobody can stand closer)
  {const r=await E(`(()=>{state.critters=[{id:"fox",c:6,r:8,seed:1,lv:1,out:true},{id:"hen",c:8,r:8,seed:2,lv:1,out:true}];state.vehicles=[];renderCritters();
     window._acts=[];const a=act;act=(cr,w)=>{window._acts.push(cr.id+":"+w);return a(cr,w);};const R=Math.random;Math.random=()=>.1;window._R=R;return true;})()`);
   await run(2700);const acts=await E("Math.random=window._R;window._acts");
   ok(acts.includes("fox:pounce"),"a hunter near its prey pounces ("+acts.join(",")+")");}

  // fast track: a quick clean read climbs a rung in one go; a slow one still needs two
  {const read=async(word,ms)=>{await E(`(()=>{delete state.stats[${JSON.stringify(word)}];Skills.slow=false;
       openWord({...WORDS.find(x=>x.w===${JSON.stringify(word)}),rung:0});cur._t0=performance.now()-${ms};
       document.querySelector('#picks .pick[data-w=${JSON.stringify(word)}]').click();})()`);await run(3000);
     await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);
     return E(`state.stats[${JSON.stringify(word)}]`);};
   const fast=await read("cat",2000),slow=await read("hat",7000);
   ok(fast.rung===1,"a quick, clean read (2 s) climbs a rung at once: "+JSON.stringify(fast));
   ok((slow.rung||0)===0&&slow.rungClean===1,"a slow clean read (7 s) still counts once: "+JSON.stringify(slow));
   // a level he reads quickly opens the next one with a quarter mastered instead of half
   const tier=await E(`(()=>{const t1=WORDS.filter(w=>w.t===1&&!w.tricky),st={};   // levels open on sounding-out words only
       t1.forEach((w,i)=>{st[w.w]={seen:1,first:1,miss:0,mastered:i<Math.ceil(t1.length*.3),rung:2,rungClean:0};});
       state.stats=st;state.settings.tierOverride=0;state.pace={1:[1,1,1,1,1,1,1,1,1,1]};
       const on=currentTier();state.settings.fastTrack=false;const off=currentTier();state.settings.fastTrack=true;
       state.pace={1:[1,0,0,1,0,1,0,0,1,0]};const mixed=currentTier();return{on,off,mixed};})()`);
   ok(tier.on===2&&tier.off===1&&tier.mixed===1,"fluent at level 1 with 30% mastered opens level 2; not when switched off or slow "+JSON.stringify(tier));}

  ok(!errs.length,"no page errors "+errs.join(" | "));
  await b.close();srv.close();
});
