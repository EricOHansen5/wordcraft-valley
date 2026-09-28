// Modes: one stack of what is open, minutes and opens by mode, and "Where the time goes" in the Grown-up report.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8811,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  // this test server answers every path with the page, so keep the service worker out of it (its script would be HTML)
  const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,serviceWorkers:"block"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text());});
  const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return ymd(d);};
  // an old save: no modeMin / modeOpens yet
  const st={tour:99,guardians:[0,1],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{"6,8":{id:"cottage",seed:3,lv:1}},inventory:{},
    critters:[],vehicles:[{id:"v_car",c:10,r:8,lv:1,out:true,since:1}],adv:{seenIntro:1,dex:{}},
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},
      owned:{miner:1,cap:1},made:true,pet:null,bosses:{},eggs:[]}};
  await p.goto("http://localhost:8811/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?"PASS ":"FAIL ")+m);};
  const E=(f,a)=>p.evaluate(f,a);
  const top=()=>E(()=>Modes.top()),stack=()=>E(()=>Modes.stack().join(">"));
  ok(await E(()=>typeof state.modeMin==="object"&&typeof state.modeOpens==="object"&&!Array.isArray(state.modeMin)),"an old save gets empty modeMin / modeOpens");
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.settings.tierOverride=3;renderHUD();});
  await p.waitForTimeout(100);

  // 1. the table
  const IDS=["valley","read","book","pic","sign","note","story","wild","care","write","maker","mine","adventure","race","dex","craft","album","quests","reward","evo","scene","recap","photo","gate","parent","report","other"];
  const L=await E(()=>Modes.list());
  const missing=IDS.filter(id=>!L[id]||typeof L[id].reading!=="boolean"||!L[id].name);
  ok(!missing.length&&Object.keys(L).length===IDS.length,`Modes.list() has all ${IDS.length} modes, each with a name and a reading flag`+(missing.length?" — missing: "+missing:""));
  ok(L.read.reading&&L.book.reading&&L.write.reading&&!L.mine.reading&&!L.adventure.reading&&!L.valley.reading,"reading flags: crates, books and writing count as reading; the Mine, Adventure and the valley don't");
  ok(await top()==="valley","nothing open: top() is valley");
  // a raw class toggle (like the tests' own tidy-up) must not wedge the stack
  await E(()=>show("ovQuests"));ok(await top()==="quests","show() opens a mode");
  await E(()=>document.getElementById("ovQuests").classList.remove("on"));await p.waitForTimeout(50);
  ok(await top()==="valley","an overlay closed without Modes (class removed) drops off the stack");

  // 2. each mode through its real entry point
  await E(()=>{state.modeOpens={};});
  await p.click("#crateBtn");await p.waitForTimeout(150);
  ok(await top()==="read","crates → read");
  const crate=await E(()=>{const c=[...document.querySelectorAll("#crateRow .crate")].find(x=>!x.classList.contains("swap")&&!x.classList.contains("write")&&!x.classList.contains("pic"));if(c){c.click();return true;}return false;});
  await p.waitForTimeout(200);
  ok(crate&&await top()==="read"&&await E(()=>document.getElementById("ovRead").classList.contains("on")),"a word crate opens the word, still read: "+await stack());
  ok(await E(()=>state.modeOpens[today()].read===1),"crates then its word is one visit: modeOpens.read = "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await p.click("#ovRead [data-close]");await p.waitForTimeout(100);
  ok(await top()==="valley","closing the word → valley");

  await p.click("#booksBtn");await p.waitForTimeout(200);ok(await top()==="book","Books → book");
  await E(()=>{const c=document.querySelector("#ovStory .bcov:not(.locked):not(.maker)");if(c)c.click();});await p.waitForTimeout(200);
  await E(()=>{const x=document.querySelector("#ovStory #bBack");if(x)x.click();});await p.waitForTimeout(150);
  ok(await top()==="book"&&await E(()=>state.modeOpens[today()].book===1),"shelf → book → shelf is one open of book: "+await E(()=>state.modeOpens[today()].book));
  await p.click("#ovStory #bClose");await p.waitForTimeout(100);ok(await top()==="valley","closing Books → valley");

  await E(()=>Write.start());await p.waitForTimeout(150);ok(await top()==="write","Write it → write");
  await p.click("#ovWrite #wrX");await p.waitForTimeout(100);ok(await top()==="valley","closing Write it → valley");

  await E(()=>openPicIt());await p.waitForTimeout(150);ok(await top()==="pic","Picture it → pic");
  await p.click("#ovPic #psLater");await p.waitForTimeout(100);ok(await top()==="valley","Picture it later → valley");

  // 3. the Mine, and reading inside it
  await p.click("#mineBtn");await p.waitForTimeout(900);
  ok(await top()==="mine","Mine → mine");
  await E(()=>Mine._openVault(0));await p.waitForTimeout(150);
  ok(await top()==="read"&&await stack()==="mine>read","a word vault inside the Mine → read, on top of mine: "+await stack());
  await p.click("#mPanel.on #mClose");await p.waitForTimeout(100);
  ok(await top()==="mine","closing the vault → back to mine");
  await p.click("#mBooks");await p.waitForTimeout(200);ok(await stack()==="mine>book","Books from the Mine → book on top of mine");
  await p.click("#ovStory #bClose");await p.waitForTimeout(100);ok(await top()==="mine","closing Books → mine");

  // 4. a minute while in the Mine (and two old days, to see the 60-day trim)
  await E(([a,b])=>{state.modeMin[a]={mine:5};state.modeMin[b]={mine:2};},[ago(90),ago(30)]);
  const t0=await E(()=>({mins:(state.minutes||{})[today()]||0,mine:((state.modeMin||{})[today()]||{}).mine||0}));
  await E(()=>{document.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));minuteTick();});
  const t1=await E(()=>({mins:(state.minutes||{})[today()]||0,mine:((state.modeMin||{})[today()]||{}).mine||0}));
  ok(t1.mins===t0.mins+1&&t1.mine===t0.mine+1,`the minute tick credits the Mine (${t0.mine}→${t1.mine}) and still counts the minute (${t0.mins}→${t1.mins})`);
  await E(()=>{Mine._openVault(0);minuteTick();});
  ok(await E(()=>state.modeMin[today()].read===1),"a minute during a vault goes to read");
  await p.click("#mPanel.on #mClose");await p.click("#mBack");await p.waitForTimeout(200);
  ok(await top()==="valley","leaving the Mine → valley");
  await E(()=>minuteTick());
  ok(await E(()=>state.modeMin[today()].valley===1),"a minute with nothing open goes to the valley");
  const pruned=await E(([a,b])=>({old:a in state.modeMin,kept:b in state.modeMin}),[ago(90),ago(30)]);
  ok(!pruned.old&&pruned.kept,"writing keeps 60 days: a day 90 days ago is gone, 30 days ago stays");

  // Adventure, and what opens inside it
  await p.click("#advBtn");await p.waitForTimeout(700);
  ok(await top()==="adventure","Adventure → adventure");
  await E(()=>Wild.start());await p.waitForTimeout(200);ok(await stack()==="adventure>wild","a wild animal → wild on top of adventure");
  await p.click("#ovWild #wRun");await p.waitForTimeout(100);ok(await top()==="adventure","running away → adventure");
  await p.click("#advDex");await p.waitForTimeout(150);ok(await top()==="dex","Word-Dex → dex");
  await p.click("#ovDex #dexX");await p.waitForTimeout(100);ok(await top()==="adventure","closing the Word-Dex → adventure");
  // walk up to the car and race it
  await E(()=>{const f=Adv.freePos(0),v=state.vehicles[0];v.c=f.c;v.r=f.r;Adv._P.c=f.c+.3;Adv._P.r=f.r;});await p.waitForTimeout(250);
  const lab=await E(()=>document.getElementById("advAct").textContent);
  if(/Race/.test(lab))await p.click("#advAct");else{console.log("   (the car wandered off; starting the race directly) label:",lab);await E(()=>Race.start(state.vehicles[0]));}
  await p.waitForTimeout(200);
  ok(await stack()==="adventure>race","a race → race on top of adventure: "+await stack());
  await p.click("#ovRace #rX");await p.waitForTimeout(100);ok(await top()==="adventure","leaving the race → adventure");
  await p.click("#advDone");await p.waitForTimeout(300);ok(await top()==="valley","done exploring → valley");

  // the grown-up side: gate, menu, report
  await p.click("#parentBtn");await p.waitForTimeout(200);ok(await top()==="gate","⚙️ → gate");
  await E(()=>{document.getElementById("gateA").value=gateAnswer;});await p.click("#gateGo");await p.waitForTimeout(200);
  ok(await stack()==="parent","the right answer → parent (the gate closed)");
  await E(()=>minuteTick());
  await p.click("#reportBtn");await p.waitForTimeout(300);ok(await stack()==="parent>report","report → report on top of parent");
  ok(await E(()=>state.modeOpens[today()].report===1),"the report counts one open");

  // 5. the report block
  const R=await E(()=>{const rep=document.querySelector("#ovReport .report"),h=[...rep.querySelectorAll("h3")].map(x=>x.textContent);
    const line=rep.querySelector(".rwhere"),cards=[...rep.querySelectorAll(".rmode")].map(c=>({id:c.dataset.id,t:c.querySelector("h4").textContent,bars:c.querySelectorAll(".col").length}));
    const days=lastDays(7),MM=Modes.list();let rd=0,other=0;
    days.forEach(d=>{const m=state.modeMin[d]||{};Object.keys(m).forEach(k=>{if(MM[k]&&MM[k].reading)rd+=m[k];else other+=m[k];});});
    return{h,idx:h.indexOf("Where the time goes"),mins:h.indexOf("Mix-ups"),line:line&&line.textContent,cards,rd,other};});
  ok(R.idx>R.mins&&R.idx>=0,"the report has a “Where the time goes” section after the minutes chart");
  ok(R.line&&R.line.indexOf(R.rd+" min reading and writing")>=0&&R.line.indexOf(R.other+" min everything else")>=0,"reading vs everything else: "+R.line);
  const byId={};R.cards.forEach(c=>{byId[c.id]=c;});
  ok(byId.mine&&byId.read&&byId.valley&&byId.parent&&R.cards.every(c=>c.bars===7),"a 7-day bar for each mode with minutes: "+R.cards.map(c=>c.id).join(", "));
  ok(byId.mine&&/1 min · opened 1×/.test(byId.mine.t),"the Mine card shows minutes and opens: "+(byId.mine&&byId.mine.t));
  await p.screenshot({path:"modes_report.png"});
  await p.click("#ovReport #rClose");await p.waitForTimeout(100);ok(await top()==="parent","closing the report → parent");
  // a mode shown again while it is open is not a new open; a new visit after a pause is
  await E(()=>{show("ovParent");show("ovParent");});
  ok(await E(()=>state.modeOpens[today()].parent===1),"showing the open grown-up menu again does not count again");
  await p.click("#ovParent [data-close]");
  const nb=await E(()=>state.modeOpens[today()].book);await p.waitForTimeout(2200);
  await p.click("#booksBtn");await p.waitForTimeout(150);await p.click("#ovStory #bClose");
  const nb2=await E(()=>state.modeOpens[today()].book);
  ok(nb2===nb+1,`a new visit to Books after a pause counts again (${nb}→${nb2})`);
  // the seam for a later gate: a guard can refuse, nothing is gated otherwise
  ok(await E(()=>{Modes.guard(id=>id!=="other");const r=Modes.open("other");Modes.guard(null);return r===false&&Modes.top()==="valley";}),"Modes.guard can veto an open (not used by the game yet)");

  // save and reload keep the counts
  const before=await E(()=>JSON.stringify({m:state.modeMin,o:state.modeOpens}));
  await E(()=>saveNow());await p.waitForTimeout(600);
  await p.reload();await p.waitForTimeout(2200);
  const after=await E(()=>JSON.stringify({m:state.modeMin,o:state.modeOpens}));
  ok(before===after,"save and reload keep modeMin and modeOpens");
  ok(await E(()=>Modes.stack().length===document.querySelectorAll(".overlay.on").length),"after reload the stack holds only what is on screen: ["+await stack()+"]");

  // 6. no errors
  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await b.close();srv.close();process.exit(fails?1:0);});
