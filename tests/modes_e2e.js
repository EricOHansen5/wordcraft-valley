// Modes: one stack of what is open, minutes and opens by mode, and "Where the time goes" in the Grown-up report.
const {launch,reload,waitFor,check}=require("./lib");
(async()=>{
  const T=check("modes"),ok=T.ok;
  // an old save: no modeMin / modeOpens yet
  const {page:p,errs,close}=await launch({seed:{}});
  // wait for the target before tapping it: on a slow CI runner an overlay can take longer than the fixed sleeps
  const click=async sel=>{await p.waitForSelector(sel,{state:"visible",timeout:15000});await p.click(sel);};
  const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const ago=n=>{const d=new Date();d.setDate(d.getDate()-n);return ymd(d);};
  const E=(f,a)=>p.evaluate(f,a);
  const top=()=>E(()=>Modes.top()),stack=()=>E(()=>Modes.stack().join(">"));
  // wait until a mode is on top / the stack reads a certain way (then the ok() below checks it)
  const atTop=id=>waitFor(p,x=>Modes.top()===x,{arg:id}),atStack=st=>waitFor(p,x=>Modes.stack().join(">")===x,{arg:st});
  ok(await E(()=>typeof state.modeMin==="object"&&typeof state.modeOpens==="object"&&!Array.isArray(state.modeMin)),"an old save gets empty modeMin / modeOpens");
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.settings.tierOverride=3;renderHUD();});
  await p.waitForTimeout(100);

  // 1. the table
  const IDS=["valley","read","book","pic","sign","note","story","wild","care","write","maker","mine","adventure","race","dex","craft","album","quests","reward","evo","scene","recap","photo","gate","parent","report","store","other","job"];
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
  await click("#crateBtn");await p.waitForTimeout(150);
  ok(await top()==="read","crates → read");
  const crate=await E(()=>{const c=[...document.querySelectorAll("#crateRow .crate")].find(x=>!x.classList.contains("swap")&&!x.classList.contains("write")&&!x.classList.contains("pic"));if(c){c.click();return true;}return false;});
  await p.waitForTimeout(200);
  ok(crate&&await top()==="read"&&await E(()=>document.getElementById("ovRead").classList.contains("on")),"a word crate opens the word, still read: "+await stack());
  ok(await E(()=>state.modeOpens[today()].read===1),"crates then its word is one visit: modeOpens.read = "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await click("#ovRead [data-close]");await p.waitForTimeout(100);
  ok(await top()==="valley","closing the word → valley");

  await click("#booksBtn");await atTop("book");ok(await top()==="book","Books → book");
  await E(()=>{const c=document.querySelector("#ovStory .bcov:not(.locked):not(.maker)");if(c)c.click();});await p.waitForTimeout(200);
  await E(()=>{const x=document.querySelector("#ovStory #bBack");if(x)x.click();});await p.waitForTimeout(150);
  ok(await top()==="book"&&await E(()=>state.modeOpens[today()].book===1),"shelf → book → shelf is one open of book: "+await E(()=>state.modeOpens[today()].book));
  await click("#ovStory #bClose");await p.waitForTimeout(100);ok(await top()==="valley","closing Books → valley");

  // these few keep their sleeps: they pace Books → Mine → Books past the 2 s "same visit" window, as before
  await E(()=>Write.start());await p.waitForTimeout(150);ok(await top()==="write","Write it → write");
  await click("#ovWrite #wrX");await p.waitForTimeout(100);ok(await top()==="valley","closing Write it → valley");

  await E(()=>openPicIt());await p.waitForTimeout(150);ok(await top()==="pic","Picture it → pic");
  await click("#ovPic #psLater");await p.waitForTimeout(100);ok(await top()==="valley","Picture it later → valley");

  await p.click("#jobsBtn");await atTop("job");ok(await top()==="job","Jobs → job");
  await p.click("#ovJob #jX");await atTop("valley");ok(await top()==="valley","closing the Job board → valley");

  // 3. the Mine, and reading inside it
  await click("#mineBtn");await p.waitForTimeout(900);
  ok(await top()==="mine","Mine → mine");
  await E(()=>Mine._openVault(0));await p.waitForTimeout(150);
  ok(await top()==="read"&&await stack()==="mine>read","a word vault inside the Mine → read, on top of mine: "+await stack());
  await click("#mPanel.on #mClose");await p.waitForTimeout(100);
  ok(await top()==="mine","closing the vault → back to mine");
  await click("#mBooks");await p.waitForTimeout(200);ok(await stack()==="mine>book","Books from the Mine → book on top of mine");
  await click("#ovStory #bClose");await atTop("mine");ok(await top()==="mine","closing Books → mine");

  // 4. a minute while in the Mine (and two old days, to see the 60-day trim)
  await E(([a,b])=>{state.modeMin[a]={mine:5};state.modeMin[b]={mine:2};},[ago(90),ago(30)]);
  const t0=await E(()=>({mins:(state.minutes||{})[today()]||0,mine:((state.modeMin||{})[today()]||{}).mine||0}));
  await E(()=>{document.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));minuteTick();});
  const t1=await E(()=>({mins:(state.minutes||{})[today()]||0,mine:((state.modeMin||{})[today()]||{}).mine||0}));
  ok(t1.mins===t0.mins+1&&t1.mine===t0.mine+1,`the minute tick credits the Mine (${t0.mine}→${t1.mine}) and still counts the minute (${t0.mins}→${t1.mins})`);
  await E(()=>{Mine._openVault(0);minuteTick();});
  ok(await E(()=>state.modeMin[today()].read===1),"a minute during a vault goes to read");
  await click("#mPanel.on #mClose");await click("#mBack");await p.waitForTimeout(200);
  ok(await top()==="valley","leaving the Mine → valley");
  await E(()=>minuteTick());
  ok(await E(()=>state.modeMin[today()].valley===1),"a minute with nothing open goes to the valley");
  const pruned=await E(([a,b])=>({old:a in state.modeMin,kept:b in state.modeMin}),[ago(90),ago(30)]);
  ok(!pruned.old&&pruned.kept,"writing keeps 60 days: a day 90 days ago is gone, 30 days ago stays");

  // Adventure, and what opens inside it
  await click("#advBtn");await p.waitForTimeout(700);
  ok(await top()==="adventure","Adventure → adventure");
  await E(()=>Wild.start());await atStack("adventure>wild");ok(await stack()==="adventure>wild","a wild animal → wild on top of adventure");
  await click("#ovWild #wRun");await atTop("adventure");ok(await top()==="adventure","running away → adventure");
  await click("#advDex");await atTop("dex");ok(await top()==="dex","Word-Dex → dex");
  await click("#ovDex #dexX");await atTop("adventure");ok(await top()==="adventure","closing the Word-Dex → adventure");
  // walk up to the car and race it
  await E(()=>{const f=Adv.freePos(0),v=state.vehicles[0];v.c=f.c;v.r=f.r;Adv._P.c=f.c+.3;Adv._P.r=f.r;});await p.waitForTimeout(250);
  const lab=await E(()=>document.getElementById("advAct").textContent);
  if(/Race/.test(lab))await click("#advAct");else{console.log("   (the car wandered off; starting the race directly) label:",lab);await E(()=>Race.start(state.vehicles[0]));}
  await p.waitForTimeout(200);
  ok(await stack()==="adventure>race","a race → race on top of adventure: "+await stack());
  await click("#ovRace #rX");await atTop("adventure");ok(await top()==="adventure","leaving the race → adventure");
  await click("#advDone");await atTop("valley");ok(await top()==="valley","done exploring → valley");

  // the grown-up side: gate, menu, report
  await click("#parentBtn");await atTop("gate");ok(await top()==="gate","⚙️ → gate");
  await E(()=>{document.getElementById("gateA").value=gateAnswer;});await click("#gateGo");await p.waitForTimeout(200);
  ok(await stack()==="parent","the right answer → parent (the gate closed)");
  await E(()=>minuteTick());
  await click("#reportBtn");await atStack("parent>report");ok(await stack()==="parent>report","report → report on top of parent");
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
  await click("#ovReport #rClose");await atTop("parent");ok(await top()==="parent","closing the report → parent");
  // a mode shown again while it is open is not a new open; a new visit after a pause is
  await E(()=>{show("ovParent");show("ovParent");});
  ok(await E(()=>state.modeOpens[today()].parent===1),"showing the open grown-up menu again does not count again");
  await click("#ovParent [data-close]");
  const nb=await E(()=>state.modeOpens[today()].book);await p.waitForTimeout(2200);
  await click("#booksBtn");await p.waitForTimeout(150);await click("#ovStory #bClose");
  const nb2=await E(()=>state.modeOpens[today()].book);
  ok(nb2===nb+1,`a new visit to Books after a pause counts again (${nb}→${nb2})`);
  // the seam for a later gate: a guard can refuse, nothing is gated otherwise
  ok(await E(()=>{Modes.guard(id=>id!=="other");const r=Modes.open("other");Modes.guard(null);return r===false&&Modes.top()==="valley";}),"Modes.guard can veto an open (not used by the game yet)");

  // save and reload keep the counts
  const before=await E(()=>JSON.stringify({m:state.modeMin,o:state.modeOpens}));
  await E(()=>saveNow());await p.waitForTimeout(600);
  await reload(p);
  const after=await E(()=>JSON.stringify({m:state.modeMin,o:state.modeOpens}));
  ok(before===after,"save and reload keep modeMin and modeOpens");
  ok(await E(()=>Modes.stack().length===document.querySelectorAll(".overlay.on").length),"after reload the stack holds only what is on screen: ["+await stack()+"]");

  // 6. no errors
  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL modes suite crashed: "+(e&&e.stack||e));process.exit(1);});
