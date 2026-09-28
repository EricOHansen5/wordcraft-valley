const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8798,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop(){}}]});
    window.MediaRecorder=class{constructor(){this.mimeType="audio/webm";}start(){}stop(){setTimeout(()=>{this.ondataavailable({data:new Blob([new Uint8Array(3000)])});this.onstop();},40);}};
    // answer whatever reading challenge is in a host element
    window.__answer=sel=>{const h=document.querySelector(sel);if(!h||!h.dataset.ans)return"none";const a=h.dataset.ans;
      if(h.querySelector(".wslots")){const tiles=JSON.parse(h.dataset.tiles),bank=[...h.querySelectorAll(".wbank .lt")],used=new Set();
        tiles.forEach(ph=>{const t=bank.find((b,i)=>!used.has(i)&&b.textContent===tileText(ph));used.add(bank.indexOf(t));t.click();});return"build:"+a;}
      if(a[0]==="#"){h.querySelector(`.psopt[data-i="${a.slice(1)}"]`).click();return"sent";}
      h.querySelector(`[data-w="${a}"]`).click();return"word:"+a;};});
  const st={tour:99,guardians:[0,1],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{"6,8":{id:"cottage",seed:3,lv:1}},inventory:{},
    critters:[{id:"dog",c:14,r:8,seed:1},{id:"fox",c:3,r:7,seed:2}],vehicles:[],adv:{seenIntro:1,dex:{}},
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},owned:{miner:1,cap:1},made:true,pet:"dog",bosses:{},eggs:[]}};
  await p.goto("http://localhost:8798/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  const clr=()=>p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  await clr();await p.evaluate(()=>{state.settings.tierOverride=3;renderHUD();});
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  const near=(c,r)=>p.evaluate(([c,r])=>{Adv._P.c=c;Adv._P.r=r;},[c,r]);
  // ---- 1 Dad's note ----
  await p.evaluate(()=>openParent());await p.click('.tab[data-tab="notes"]');await p.waitForTimeout(200);
  await p.fill("#noteText","Look in the red box by the knight.");await p.dispatchEvent("#noteText","input");await p.waitForTimeout(100);
  const chk=await p.evaluate(()=>[...document.querySelectorAll("#noteCheck .nw")].map(x=>x.textContent+":"+x.className.split(" ")[1]).join(" "));
  ok(/knight:(far|near)/.test(chk)&&/red:ok/.test(chk),"note checker flags words above level: "+chk);
  await p.screenshot({path:"v8_notes_pane.png"});
  await p.click("#noteRec");await p.waitForTimeout(300);await p.click("#noteRec");await p.waitForTimeout(300);
  await p.fill("#noteText","Look in the red box.");await p.click("#noteSend");await p.waitForTimeout(400);
  ok(await p.evaluate(()=>state.notes.length===1&&state.notes[0].voice&&document.getElementById("advBadge").textContent==="💌"),"note sent with voice; Adventure shows 💌");
  await clr();await p.click("#advBtn");await p.waitForTimeout(800);
  const env=await p.evaluate(()=>{const n=state.notes[0];return{c:n.c,r:n.r};});
  await near(env.c,env.r);await p.waitForTimeout(250);
  ok(/Note from/.test(await p.evaluate(()=>document.getElementById("advAct").textContent)),"envelope in the valley");
  await p.screenshot({path:"v8_envelope.png"});
  await p.click("#advAct");await p.waitForTimeout(400);await p.screenshot({path:"v8_note.png"});
  ok(await p.evaluate(()=>document.getElementById("nHear").disabled),"Dad's voice waits until he has read it");
  await p.click("#nRead");await p.waitForTimeout(300);await p.click("#nFound");await p.waitForTimeout(500);
  ok(await p.evaluate(()=>state.notes[0].found&&!document.querySelector(".advland.note")),"found it: note done, envelope gone");
  await clr();
  // ---- 2 quest chapter 1 (letters) ----
  await p.evaluate(()=>Adv.redraw());await p.waitForTimeout(200);
  const giver=await p.evaluate(()=>state.quest&&state.quest.giver);ok(!!giver,"quest giver ❗ placed");
  await near(giver.c,giver.r);await p.waitForTimeout(250);await p.click("#advAct");await p.waitForTimeout(400);
  await p.screenshot({path:"v8_story.png"});
  for(let i=0;i<4;i++){await p.click("#qNext");await p.waitForTimeout(250);}
  const spots=await p.evaluate(()=>state.quest.active.spots);ok(spots&&spots.length===3,"chapter 1: three letter locks");
  for(let i=0;i<3;i++){await near(spots[i].c,spots[i].r);await p.waitForTimeout(250);await p.click("#advAct");await p.waitForTimeout(400);
    if(i===0)await p.screenshot({path:"v8_lock.png"});
    await p.evaluate(()=>__answer("#ovQuest .qbody"));await p.waitForTimeout(1300);await p.click("#qOk");await p.waitForTimeout(500);}
  await p.screenshot({path:"v8_chapter.png"});
  ok(await p.evaluate(()=>state.quest.ch===1&&state.quest.letters.join("")==="R"),"chapter 1 done: got R");
  await p.click("#qOk");await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!Quest.available()),"next chapter waits until tomorrow");
  // ---- chapter 2: temple (pretend it's tomorrow) ----
  await p.evaluate(()=>{state.quest.day="2000-01-01";Adv.redraw();});await p.waitForTimeout(200);
  await p.evaluate(()=>Quest.start());await p.waitForTimeout(300);for(let i=0;i<3;i++){await p.click("#qNext");await p.waitForTimeout(250);}
  for(let r=0;r<3;r++){if(r===0){await p.screenshot({path:"v8_temple.png"});await p.evaluate(()=>document.querySelector('.tdoor[data-ok="0"]').click());await p.waitForTimeout(1000);}
    await p.evaluate(()=>document.querySelector('.tdoor[data-ok="1"]').click());await p.waitForTimeout(1300);}
  await p.click("#qOpen");await p.waitForTimeout(400);
  ok(await p.evaluate(()=>state.quest.ch===2&&state.quest.letters.join("")==="RE"),"temple done: got E");
  await p.click("#qOk");
  // ---- chapter 6: Gloom ----
  await p.evaluate(()=>{state.quest.ch=5;state.quest.day="2000-01-01";state.quest.letters=["R","E","A","D","🔑"];state.settings.tierOverride=4;});
  await p.evaluate(()=>Quest.start());await p.waitForTimeout(300);for(let i=0;i<3;i++){await p.click("#qNext");await p.waitForTimeout(250);}
  await p.waitForTimeout(1500);await p.screenshot({path:"v8_gloom.png"});
  const kinds=[];for(let k=0;k<10;k++){const done=await p.evaluate(()=>!!document.querySelector("#gOk"));if(done)break;
    kinds.push(await p.evaluate(()=>__answer("#gQ")));await p.waitForTimeout(1700);}
  await p.click("#gOk");await p.waitForTimeout(400);await p.click("#qOk");await p.waitForTimeout(400);
  await p.screenshot({path:"v8_end.png"});
  ok(await p.evaluate(()=>state.quest.done&&state.quest.ch===6),"Gloom befriended, story done: "+kinds.join(","));
  await clr();await p.click("#advDone");
  // ---- 3 my own book ----
  await p.evaluate(()=>{state.settings.tierOverride=3;});await p.click("#booksBtn");await p.waitForTimeout(300);await p.click("#bMake");await p.waitForTimeout(300);
  const pick=async(tab,w)=>{await p.click(`.mktab[data-t="${tab}"]`);await p.click(`.mkb[data-w="${w}"]`);await p.waitForTimeout(80);};
  await pick("little","The");await pick("who","dog");await pick("doing","hid");await pick("little","in");await pick("little","the");await pick("who","box");
  await p.click('[data-p="."]');await p.screenshot({path:"v8_maker.png"});
  await p.click("#mkAdd");await pick("who","Asher");await pick("doing","sat");await pick("little","on");await pick("little","a");await pick("who","log");await p.click('[data-p="!"]');
  await p.click("#mkDone");await p.waitForTimeout(200);await pick("little","My");await pick("who","dog");await p.click("#mkSave");await p.waitForTimeout(500);
  await p.screenshot({path:"v8_mybook_done.png"});
  const mb=await p.evaluate(()=>({b:state.mybooks[0],shelf:BOOKS.filter(b=>b.mine).map(b=>b.title+"|"+b.pages.map(x=>x[0]).join(" / "))}));
  ok(mb.b&&mb.shelf.length===1,"his book is on the shelf: "+mb.shelf[0]);
  await p.click("#mkShelf");await p.waitForTimeout(300);await p.screenshot({path:"v8_shelf.png"});await clr();
  // ---- 4 write it ----
  await p.evaluate(()=>Write.start(allWords().find(w=>w.w==="cat")));await p.waitForTimeout(400);await p.screenshot({path:"v8_write.png"});
  const trace=()=>p.evaluate(()=>{const {ch}=Write._cur(),m=Write._mask(ch,0),S=Write.SZ,strokes=[];
    for(let y=0;y<S;y+=8){let run=null;for(let x=0;x<S;x+=3){if(m[y*S+x]){if(!run){run=[];strokes.push(run);}run.push([x,y]);}else run=null;}}
    Write._setInk(strokes);Write._check();});
  await p.evaluate(()=>{Write._setInk([[[150,150]]]);Write._check();});await p.waitForTimeout(200);
  const msg=await p.evaluate(()=>document.getElementById("wrMsg").textContent);ok(/bigger|Almost|stay/.test(msg),"a scribble isn't accepted: "+msg);
  for(let i=0;i<3;i++){await trace();await p.waitForTimeout(700);}
  await p.screenshot({path:"v8_write_done.png"});
  ok(await p.evaluate(()=>state.write.c&&state.write.c.ok===1&&state.writes===1),"traced c-a-t: "+JSON.stringify(await p.evaluate(()=>state.write)));
  await clr();
  // ---- 5 care ----
  await p.click("#advBtn");await p.waitForTimeout(700);
  const dog=await p.evaluate(()=>{const d=state.critters.find(x=>x.id==="dog");d.c=6;d.r=7;d._busy=true;return{c:d.c,r:d.r};});
  await near(dog.c,dog.r);await p.waitForTimeout(300);
  const lbl=await p.evaluate(()=>document.getElementById("advAct").textContent);ok(/Feed/.test(lbl),"hungry dog: "+lbl);
  await p.click("#advAct");await p.waitForTimeout(400);await p.screenshot({path:"v8_care.png"});
  await p.evaluate(()=>__answer("#ovCare .cq"));await p.waitForTimeout(1300);
  ok(await p.evaluate(()=>state.critters.find(x=>x.id==="dog").fed===today()),"dog fed");
  await p.click("#cOk");await p.waitForTimeout(200);
  // ---- 6 race ----
  await p.evaluate(()=>{addVehicle("v_car");const v=state.vehicles.find(x=>x.id==="v_car");v.c=10;v.r=8;v.out=true;});await p.waitForTimeout(200);
  await p.evaluate(()=>{state.critters.forEach(c=>{c.out=false;});const v=state.vehicles.find(x=>x.id==="v_car");Adv._P.c=v.c;Adv._P.r=v.r;});await p.waitForTimeout(150);
  const rl=await p.evaluate(()=>document.getElementById("advAct").textContent);ok(/Race/.test(rl),"vehicle offers a race: "+rl);
  await p.click("#advAct");await p.waitForTimeout(300);await p.click("#rGo");
  for(let g=0;g<3;g++){await p.waitForFunction(()=>document.querySelector("#rQ .rqi [data-w]"),null,{timeout:15000});
    if(g===0)await p.screenshot({path:"v8_race_gate.png"});
    await p.evaluate(()=>__answer("#rQ .rqi"));await p.waitForTimeout(1200);}
  await p.waitForFunction(()=>document.querySelector(".podium"),null,{timeout:20000});
  await p.screenshot({path:"v8_race_end.png"});
  ok(await p.evaluate(()=>/won/.test(document.querySelector("#rQ h2").textContent)),"reading all three gates wins");
  await clr();await p.click("#advDone");
  // ---- 7 report ----
  await p.evaluate(()=>openParent());await p.click('.tab[data-tab="prog"]');await p.click("#reportBtn");await p.waitForTimeout(400);
  await p.evaluate(()=>{document.querySelector("#ovReport .sheet").scrollTop=99999;});await p.screenshot({path:"v8_report.png"});
  console.log("errors:",errs.length?errs:"none");await b.close();srv.close();});
