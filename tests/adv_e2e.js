const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8795,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));const cdp=await ctx.newCDPSession(p);
  const touch=async(type,pts)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
  const st={tour:99,guardians:[0,1],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{"6,8":{id:"cottage",seed:3,lv:1}},inventory:{},
    critters:[{id:"dog",c:14,r:8,seed:1}],vehicles:[],
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},
      owned:{miner:1,cap:1},made:true,pet:"dog",bosses:{},eggs:[]}};
  await p.goto("http://localhost:8795/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.settings.tierOverride=3;renderHUD();});
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  await p.screenshot({path:"a_dock.png"});
  await p.click("#advBtn");await p.waitForTimeout(900);
  ok(await p.evaluate(()=>Adv.on&&!!document.querySelector(".advash img")&&document.querySelectorAll(".advgrass").length>=20),"adventure mode: Ash, pet and tall grass drawn");
  await p.screenshot({path:"a_enter.png"});
  // walk right with the joystick (touch)
  const box=async s=>{const bb=await (await p.$(s)).boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2];};
  const joy=await box("#advJoy");const c0=await p.evaluate(()=>Adv._P.c),cam0=await p.evaluate(()=>cam);
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]+60,joy[1]]]);await p.waitForTimeout(1200);await touch("touchEnd",[]);
  const c1=await p.evaluate(()=>Adv._P.c),cam1=await p.evaluate(()=>cam);
  ok(c1>c0+2&&cam1>cam0,`joystick walks right (c ${c0.toFixed(1)}→${c1.toFixed(1)}) and the camera follows (${cam0|0}→${cam1|0})`);
  await p.screenshot({path:"a_walk.png"});
  // keyboard walk left
  await p.keyboard.down("a");await p.waitForTimeout(500);await p.keyboard.up("a");
  ok(await p.evaluate(c=>Adv._P.c<c,c1),"A key walks left");
  // near a building -> action button
  await p.evaluate(()=>{Adv._P.c=6.4;Adv._P.r=8;});await p.waitForTimeout(200);
  const lab=await p.evaluate(()=>document.getElementById("advAct").textContent);ok(/Cottage|🚪/.test(lab),"action button near a building: "+lab);
  // on a free spot: a note or the quest giver standing there would rightly win the button
  await p.evaluate(()=>{const f=Adv.freePos(0);Adv._P.c=f.c+.3;Adv._P.r=f.r;const d=state.critters.find(x=>x.id==="dog");d.c=f.c;d.r=f.r;});await p.waitForTimeout(200);
  const labA=await p.evaluate(()=>document.getElementById("advAct").textContent);ok(/dog/i.test(labA),"action button near an animal: "+labA);
  await p.screenshot({path:"a_near.png"});
  // walk through tall grass until something appears
  const g=await p.evaluate(()=>Adv._patches()[0]);
  await p.evaluate(g=>{Adv._P.c=g.c-g.w/2;Adv._P.r=g.r;},g);
  let met=false;for(let k=0;k<12&&!met;k++){
    await p.keyboard.down(k%2?"a":"d");await p.waitForTimeout(700);await p.keyboard.up(k%2?"a":"d");
    met=await p.evaluate(()=>!!Wild._W());}
  ok(met,"walking in tall grass meets a wild animal");
  if(!met)await p.evaluate(()=>Wild.start());
  await p.waitForTimeout(1600);await p.screenshot({path:"a_wild.png"});
  const who=await p.evaluate(()=>Wild._W().c.id);
  // answer: one wrong, then right until caught
  let types=[];let first=true;
  for(let k=0;k<12;k++){
    const s=await p.evaluate(()=>{const W=Wild._W();if(!W)return null;return{t:W.type,a:W.ans,h:W.hearts,need:W.need,name:!!document.querySelector(".wslots")};});
    if(!s||s.h>=s.need)break;types.push(s.t);
    if(s.t==="sent"&&types.filter(x=>x==="sent").length===1)await p.screenshot({path:"a_wild_sent.png"});
    if(s.name){await p.screenshot({path:"a_wild_name.png"});
      await p.evaluate(()=>{const W=Wild._W(),bank=[...document.querySelectorAll(".wbank .lt")];const used=new Set();
        W.w.p.forEach(ph=>{const t=bank.find((b,i)=>!used.has(i)&&b.textContent===tileText(ph));used.add(bank.indexOf(t));t.click();});});
      await p.waitForTimeout(1800);break;}
    if(first){first=false;await p.evaluate(()=>{const W=Wild._W();[...document.querySelectorAll("#wQ [data-w]")].find(b=>b.dataset.w!==W.ans).click();});await p.waitForTimeout(2500);continue;}
    await p.evaluate(()=>{const W=Wild._W();[...document.querySelectorAll("#wQ [data-w]")].find(b=>b.dataset.w===W.ans).click();});
    await p.waitForTimeout(1500);
  }
  await p.waitForTimeout(800);
  const res=await p.evaluate(id=>({title:document.getElementById("wTitle").textContent,dex:state.adv.dex[id],crit:state.critters.some(c=>c.id===id)}),who);
  ok(res.dex&&res.dex.caught&&res.crit,`befriended: ${res.title} | rounds ${types.join(",")} | dex ${JSON.stringify(res.dex)}`);
  await p.screenshot({path:"a_caught.png"});
  await p.click("#wDex");await p.waitForTimeout(500);await p.screenshot({path:"a_dex.png"});
  await p.click("#dexX");
  // treasure hunt
  await p.click("#advHunt");await p.waitForTimeout(600);await p.screenshot({path:"a_note.png"});
  const h=await p.evaluate(()=>{const h=state.adv.hunt;return{marks:h.marks.map(m=>m.w),text:document.querySelector("#advNote .btext").textContent};});
  console.log("   hunt:",JSON.stringify(h));
  await p.click("#noteGo");await p.waitForTimeout(300);
  for(let step=0;step<3;step++){
    const tgt=await p.evaluate(()=>{const h=state.adv.hunt;return{i:h.order[h.step],wrong:h.marks.findIndex((m,i)=>!m.dug&&i!==h.order[h.step])};});
    if(step===0){ // dig at the wrong one first
      await p.evaluate(i=>{const m=state.adv.hunt.marks[i];Adv._P.c=m.c;Adv._P.r=m.r;},tgt.wrong);await p.waitForTimeout(300);
      await p.keyboard.press("Space");await p.waitForTimeout(900);
      ok(await p.evaluate(()=>state.adv.hunt.miss===1&&document.querySelector("#advNote.big")),"digging at the wrong landmark: 'read the note again'");
      await p.screenshot({path:"a_wrongdig.png"});
      await p.click("#noteGo");await p.waitForTimeout(200);
    }
    await p.evaluate(i=>{const m=state.adv.hunt.marks[i];Adv._P.c=m.c;Adv._P.r=m.r;},tgt.i);await p.waitForTimeout(300);
    if(step===1)await p.screenshot({path:"a_dighere.png"});
    await p.click("#advAct");await p.waitForTimeout(1000);
    if(step<2){const big=await p.evaluate(()=>!!document.querySelector("#advNote.big"));if(big)await p.click("#noteGo");await p.waitForTimeout(200);}
  }
  await p.waitForTimeout(600);
  const tr=await p.evaluate(()=>({hunt:state.adv.hunt,hunts:state.adv.hunts,reward:document.getElementById("ovReward").classList.contains("on"),name:document.getElementById("rewardName").textContent}));
  ok(!tr.hunt&&tr.hunts===1&&tr.reward,"treasure found: "+tr.name);
  await p.screenshot({path:"a_treasure.png"});
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  // survives a world redraw and leaving
  await p.evaluate(()=>renderWorld());ok(await p.evaluate(()=>!!document.querySelector(".advash")),"Ash survives a valley redraw");
  await p.click("#advDone");await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!Adv.on&&!document.querySelector(".advash")&&getComputedStyle(document.getElementById("dock")).visibility==="visible"),"done exploring restores the valley");
  // quests include the new kinds
  console.log("   quests hit:",await p.evaluate(()=>JSON.stringify(state.quests.list.map(q=>q.k+":"+q.p+"/"+q.n))));
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();});
