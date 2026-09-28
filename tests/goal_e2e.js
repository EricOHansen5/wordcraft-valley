// Today's reading: the daily goal ring, the finish line (once a day), a finished book, the date rollover and the report line.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8813,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  // this test server answers every path with the page, so keep the service worker out of it (its script would be HTML)
  const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,serviceWorkers:"block"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text());});
  const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return ymd(d);};
  // an old save: no goal setting, no goal, no goalDays
  const st={tour:99,guardians:[0,1],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{"6,8":{id:"cottage",seed:3,lv:1}},inventory:{},
    critters:[],vehicles:[{id:"v_car",c:10,r:8,lv:1,out:true,since:1}],adv:{seenIntro:1,dex:{}},
    settings:{pics:true,tts:true,ambient:true,nature:true,speech:false,tierOverride:0,timer:0},
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},
      owned:{miner:1,cap:1},made:true,pet:null,bosses:{},eggs:[]}};
  await p.goto("http://localhost:8813/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?"PASS ":"FAIL ")+m);};
  const E=(f,a)=>p.evaluate(f,a);
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.settings.tierOverride=3;renderHUD();
    // note every spoken line, so the finish line can be counted
    window._said=[];const sp=Sound.speak;Sound.speak=(t,r,pi)=>{window._said.push(t);return sp(t,r,pi);};});
  const LINE="That's your reading for today! The valley is yours.";
  const said=()=>E(l=>window._said.filter(t=>t===l).length,LINE);
  const ring=()=>E(()=>{const el=document.getElementById("goalRing");return{shown:getComputedStyle(el).display!=="none",off:el.classList.contains("off"),
    done:el.classList.contains("done"),dash:document.getElementById("goalFill").style.strokeDasharray,label:el.getAttribute("aria-label"),w:el.getBoundingClientRect().width};});

  // 1. an old save gets the defaults
  const g0=await E(()=>({goal:state.settings.goal,g:state.goal,days:state.goalDays,date:today()}));
  ok(g0.goal===12,"an old save gets the default goal of 12 words: "+g0.goal);
  ok(g0.g&&g0.g.words===0&&g0.g.done===false&&(g0.g.date===""||g0.g.date===g0.date)&&g0.days&&!Object.keys(g0.days).length,"an old save gets an empty goal and goalDays: "+JSON.stringify(g0.g));
  let R=await ring();
  ok(R.shown&&R.w>=40&&/0 of 12/.test(R.label),`the ring shows on the HUD, empty (${R.w|0}px, "${R.label}")`);

  // 2. the setting: Off hides the ring, and the parent pane shows it
  await E(()=>{renderSettings();const s=document.getElementById("optGoal");s.value="0";s.dispatchEvent(new Event("change"));});
  R=await ring();
  ok(!R.shown&&R.off&&await E(()=>state.settings.goal===0),"goal Off hides the ring");
  await E(()=>{Quests.hit("read",20);});await p.waitForTimeout(1900);
  ok(await E(()=>!state.goal.done&&!Goal.cheers)&&await said()===0,"with the goal Off, reading never finishes the day or cheers");
  await E(()=>{const s=document.getElementById("optGoal");s.value="12";s.dispatchEvent(new Event("change"));renderSettings();});
  ok(await E(()=>state.settings.goal===12&&document.getElementById("optGoal").value==="12")&&(await ring()).shown,"goal back to 12: the setting shows it and the ring is back");
  // start the day again so the reads below are the whole day's
  await E(()=>{state.goal.date="2000-01-01";state.goalDays[ymd(new Date(Date.now()-100*864e5))]=true;state.quests=null;Quests.ensure();renderHUD();});

  // 3. reads fill the ring; nothing is said below the goal
  const q0=await E(()=>{const rd=state.quests.list.filter(q=>q.k==="read")[0];return{n:rd.n,gems:state.gems};});
  await E(()=>Quests.hit("read",5));await p.waitForTimeout(900);
  R=await ring();let g=await E(()=>state.goal);
  ok(g.words===5&&!g.done&&g.date===await E(()=>today()),"5 words read: goal.words = "+g.words);
  ok(/^41\.7/.test(R.dash)&&!R.done&&/5 of 12/.test(R.label),`the ring fills part way: ${R.dash} "${R.label}"`);
  ok(await said()===0&&await E(()=>Goal.cheers===0),"below the goal nothing is said");

  // 4. reaching the goal: done, one celebration; the quest chest is left to the quests
  await E(()=>Quests.hit("read",7));
  g=await E(()=>state.goal);
  ok(g.words===12&&g.done,"12 words: the goal is done");
  ok(await E(()=>state.goalDays[today()]===true),"today is noted in goalDays");
  ok(await E(()=>Object.keys(state.goalDays).length===1),"goalDays keeps only the last 60 days (a day 100 days ago is gone): "+await E(()=>JSON.stringify(state.goalDays)));
  await p.waitForTimeout(1900);
  const bub=await E(()=>document.getElementById("buddyBubble").textContent);
  ok(bub===LINE,"the buddy says the finish line: "+bub);
  ok(await said()===1&&await E(()=>Goal.cheers===1),"the finish line is spoken once");
  R=await ring();ok(R.done&&/^100[ ,]/.test(R.dash)&&/done/.test(R.label),`the ring is full and gold: ${R.dash} "${R.label}"`);
  await p.screenshot({path:"g_done.png"});
  await p.waitForTimeout(8000);
  const ch=await E(()=>({opened:state.quests.opened,gems:state.gems,rd:state.quests.list.filter(q=>q.k==="read")[0].p}));
  ok(ch.rd>=q0.n&&ch.opened===false&&ch.gems<q0.gems+20,`the reading quest is credited (${ch.rd}/${q0.n}) and the chest stays closed (opened ${ch.opened}, gems ${q0.gems}→${ch.gems})`);

  // 5. more reading after the finish line: counted, nothing more said
  await E(()=>Quests.hit("read",3));await p.waitForTimeout(2200);
  g=await E(()=>state.goal);
  ok(g.words===15&&g.done&&await said()===1&&await E(()=>Goal.cheers===1),"a read after the goal counts quietly (words "+g.words+"), no second celebration");
  R=await ring();ok(R.done&&/^100[ ,]/.test(R.dash),"the ring stays full");

  // 6. save and reload keep today's progress, and do not cheer again
  await E(()=>saveNow());await p.waitForTimeout(600);
  await p.reload();await p.waitForTimeout(2200);
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));window._said=[];const sp=Sound.speak;Sound.speak=(t,r,pi)=>{window._said.push(t);return sp(t,r,pi);};});
  g=await E(()=>state.goal);R=await ring();
  ok(g.words===15&&g.done&&R.done,"save and reload keep today's goal: "+JSON.stringify(g));
  await E(()=>Quests.hit("read",1));await p.waitForTimeout(1900);
  ok(await said()===0&&await E(()=>Goal.cheers===0),"after a reload, a read on a finished day does not cheer again");

  // 7. the date rollover empties the ring
  await E(()=>{state.goal.date=ymd(new Date(Date.now()-864e5));renderHUD();});
  g=await E(()=>state.goal);R=await ring();
  ok(g.words===0&&!g.done&&g.date===await E(()=>today())&&!R.done&&/0 of 12/.test(R.label),"a new day starts the goal again: "+JSON.stringify(g));
  ok(await E(()=>state.goalDays[today()]===true),"the finished day stays in goalDays");

  // 8. a finished book completes the day whatever the count (the book's own reading path)
  await E(()=>{const s=document.getElementById("optGoal");s.value="20";s.dispatchEvent(new Event("change"));state.goalDays={};});
  await E(()=>{Quests.hit("read",4);Quests.hit("book");});
  g=await E(()=>state.goal);
  ok(g.done&&g.words===4&&await E(()=>Goal.cheers===1),"a finished book completes the goal (4 of 20 words): "+JSON.stringify(g));
  await p.waitForTimeout(1900);
  ok(await said()===1,"the finish line plays for the book");

  // 9. the report line
  await E(()=>{state.goalDays[ymd(new Date(Date.now()-2*864e5))]=true;state.goalDays[ymd(new Date(Date.now()-3*864e5))]=true;openReport();});
  await p.waitForTimeout(300);
  const rep=await E(()=>{const el=document.querySelector("#ovReport .rgoal");return el?el.textContent:"";});
  ok(/Reading goal reached 3 of 7 days this week/.test(rep)&&/20 words a day/.test(rep),"the report shows the goal line: "+rep);
  await p.screenshot({path:"g_report.png"});
  await E(()=>Modes.shut(document.getElementById("ovReport")));
  await E(()=>{const s=document.getElementById("optGoal");s.value="0";s.dispatchEvent(new Event("change"));openReport();});
  const rep2=await E(()=>{const el=document.querySelector("#ovReport .rgoal");return el?el.textContent:"";});
  ok(/3 of 7/.test(rep2)&&/off/.test(rep2),"with the goal off, the report still shows the week: "+rep2);

  // 10. no errors
  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await b.close();srv.close();process.exit(fails?1:0);});
