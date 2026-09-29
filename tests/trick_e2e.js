// v10.3 Trick-or-Read (Halloween, 15–31 October): the window (Trick.inWindow), nothing outside it, the 🎃 button,
// ten doors in Adventure (buildings first, then a little house and trees), a knock asks a reading question at his
// level, a right read pays 2 🪙 once and closes the door, a miss takes nothing and the second miss glows, a sentence
// every third door from level 3, the tenth door finishes the night (and asks the Look system for a piece), the doors
// open again the next day, the trick mode, the save, and an old save.
const {launch,seed,reload,waitFor,answer,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("trick"),ok=T.ok;
  const GRID={"6,8":{id:"cottage",seed:3,lv:1},"11,7":{id:"windmill",seed:2,lv:1},"16,8":{id:"campfire",seed:1,lv:1}};
  // the keepers of the three open lands are awake, so no cut-scene opens on top; no reading goal cheer
  const START={guardians:[0,1,2],gems:30,settings:{goal:0},grid:GRID,mine:{coins:40}};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  // record what is said instead of playing it (again after every reload): Sound.speak lines, and Sound.say keys (words)
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};
    Sound.say=k=>{window.__said.push("say:"+k);return Promise.resolve();};
    // and the toasts (a quest finishing can put its own toast up soon after)
    window.__toasts=[];if(!window.__toast0)window.__toast0=window.toast;window.toast=function(m){window.__toasts.push(String(m));return window.__toast0.apply(this,arguments);};});
  const toasted=re=>E(s=>window.__toasts.some(t=>new RegExp(s).test(t)),re.source);
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const purse=()=>E(()=>({c:state.mine.coins,g:state.gems}));
  const tk=()=>E(()=>JSON.parse(JSON.stringify(state.trick)));
  const act=()=>E(()=>document.getElementById("advAct").textContent);
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const DEF={day:"",doors:[],candy:0,nights:0};
  const wait=ms=>p.waitForTimeout(ms);
  // tap a wrong answer in the knock panel (a word, a picture or a scene)
  const wrong=()=>E(()=>{const h=document.getElementById("tkQ"),a=h.dataset.ans;
    const b=a[0]==="#"?[...h.querySelectorAll(".psopt")].find(x=>x.dataset.i!==a.slice(1)):[...h.querySelectorAll("[data-w]")].find(x=>x.dataset.w!==a);
    b.click();return b.dataset.w||b.dataset.i;});
  const openDoor=()=>E(()=>{const d=Trick.doors().find(x=>!x.shut);return d?d.id:null;});
  const quiet=()=>E(()=>{state.critters.forEach(c=>{c.out=false;});(state.vehicles||[]).forEach(v=>{v.out=false;});});
  await listen();await tidy();

  // ---- 1. the window: 15 to 31 October ----
  ok(await E(()=>[Trick.inWindow("2026-10-14"),Trick.inWindow("2026-10-15"),Trick.inWindow("2026-10-31"),Trick.inWindow("2026-11-01")].join())==="false,true,true,false",
    "Trick.inWindow: 14 October no, 15 October yes, 31 October yes, 1 November no");
  ok(await E(()=>Trick.inWindow(new Date(2027,9,15))&&!Trick.inWindow(new Date(2027,9,14))&&Trick.inWindow("2030-10-20")&&!Trick.inWindow("soon")),
    "...for a Date too, in any year; anything else is outside");
  ok(await E(()=>Trick.live()===Trick.inWindow(today())),"with no test date it goes by today's date (the Look system's window is the same one)");

  // ---- 2. outside the window: nothing shows and nothing is written ----
  await E(()=>Trick._setToday("2026-09-20"));
  ok(!(await shown("trickBtn")),"outside the window: no 🎃 button");
  await E(()=>Adv.enter());await wait(400);await quiet();
  ok(await E(()=>!document.querySelector(".advland.tkdoor")&&Trick.doors().length===0),"outside the window: no doors in Adventure");
  await E(()=>{Adv._P.c=6;Adv._P.r=8;});
  ok(await waitFor(p,()=>document.getElementById("advAct").textContent==="🚪 Cottage"),"outside the window: the cottage has its own button, as always: "+await act());
  ok(await E(()=>Trick.knock("b:6,8"))===false&&!(await E(()=>!!document.querySelector("#ovTrick.on"))),"...and a knock does nothing");
  await E(()=>Adv.exit());await wait(150);
  ok(J(await tk())===J(DEF),"outside the window: the save field stays at its default "+J(await tk()));

  // ---- 3. a night in the window: the button and ten doors ----
  await E(()=>Trick._setToday("2026-10-20"));
  ok(await shown("trickBtn")&&await E(()=>document.getElementById("trickBadge").textContent==="10"&&document.getElementById("trickBadge").classList.contains("on")),
    "in the window: the 🎃 button shows, with 10 on its badge");
  ok(J(await tk())===J(DEF),"...and showing it writes nothing");
  await listen();
  await p.click("#trickBtn");
  ok(await waitFor(p,()=>Modes.top()==="adventure"),"🎃 opens Adventure");
  ok(await waitFor(p,()=>document.querySelectorAll(".advland.tkdoor").length===10),"Adventure has 10 doors: "+await E(()=>document.querySelectorAll(".advland.tkdoor").length));
  const doors=await E(()=>Trick.doors());
  ok(doors.filter(d=>d.kind==="build").map(d=>d.id).sort().join()==="b:11,7,b:16,8,b:6,8","a door on each of his three buildings");
  ok(doors.filter(d=>d.kind==="house").length===1&&doors.filter(d=>d.kind==="tree").length===6,"...then a little house and six trees, so there are always ten");
  const ext=doors.filter(d=>d.kind!=="build"),keys=Object.keys(GRID).map(k=>k.split(",").map(Number));
  ok(ext.every(d=>keys.every(([c,r])=>Math.abs(c-d.c)>=2.2||Math.abs(r-d.r)>=1.5))&&ext.every((d,i)=>ext.every((e,j)=>i===j||Math.abs(d.c-e.c)>=1.3||Math.abs(d.r-e.r)>=1.2)),
    "the house and the trees stand clear of the buildings and of each other "+J(ext.map(d=>[d.c,d.r])));
  ok(J(await E(()=>Trick.doors()))===J(doors),"the same doors all night (asked again)");
  await wait(1100);
  ok((await said()).includes("It's Trick-or-Read night! Knock on the doors with pumpkins."),"🎃 says what to do: "+J(await said()));

  // ---- 4. a knock (the keyboard): a creature in a costume asks a question at his level ----
  await quiet();
  const at=d=>E(d=>{Adv._P.c=d.c;Adv._P.r=d.r;},d);
  await at(doors.find(d=>d.id==="b:6,8"));
  ok(await waitFor(p,()=>document.getElementById("advAct").textContent==="🚪 Knock knock!"),"walking up to the cottage: 🚪 Knock knock!");
  await listen();
  await p.keyboard.press("Space");
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure>trick"),"Space knocks: the panel opens on top of Adventure (mode trick)");
  const q1=await E(()=>{const h=document.getElementById("tkQ"),c=document.querySelector("#ovTrick .tkcrit");
    return{ans:h.dataset.ans,opts:[...h.querySelectorAll("[data-w]")].map(b=>b.dataset.w),art:!!(c&&c.querySelector(".tkbody svg")),cos:c&&c.dataset.cos,q:Trick._q()};});
  ok(q1.ans&&q1.opts.indexOf(q1.ans)>=0&&q1.opts.length>=3,"a reading question: dataset.ans and data-w on the answers "+J(q1));
  ok(q1.art&&["witch","ghost","cape","mask"].indexOf(q1.cos)>=0,"an animal in a costume asks it ("+q1.cos+")");
  ok(q1.q.kind==="wordPick","the first door of the night is a word pick: "+q1.q.kind);
  ok(await E(a=>{const w=allWords().find(x=>x.w===a);return !!w&&w.t<=currentTier()&&!w.tricky;},q1.ans),"the word is at his level: "+q1.ans);
  await wait(450);
  let s=await said();
  ok(s.indexOf("Knock, knock! Trick or read?")>=0&&!s.some(x=>x==="say:word:"+q1.ans||x===q1.ans),"it says \"Knock, knock! Trick or read?\" and never the word he has to read "+J(s));
  ok(/🍬 0 · 🚪 10 left/.test(await E(()=>document.getElementById("tkStat").textContent)),"the panel shows the candy so far and the doors left");

  // ---- 5. misses take nothing; the second one makes the answer glow; the right read pays once ----
  const before=await purse();
  await listen();
  await wrong();await wait(150);
  ok(J(await purse())===J(before)&&(await tk()).candy===0,"a miss takes nothing "+J(await purse()));
  ok(await E(a=>document.getElementById("tkMsg").textContent==="Ooh, try again!"&&document.getElementById("tkQ").dataset.ans===a&&!document.querySelector("#tkQ .hint"),q1.ans),
    "a miss: \"Ooh, try again!\", the same question stays, nothing glows yet");
  await wait(750);
  ok((await said()).indexOf("Ooh, try again!")>=0,"...and it is said");
  await wrong();await wait(150);
  ok(await E(a=>{const h=document.getElementById("tkQ"),r=h.querySelector('[data-w="'+a+'"]');return !!r&&r.classList.contains("hint")&&h.querySelectorAll(".hint").length===1;},q1.ans),
    "after the second miss the answer glows");
  ok(J(await purse())===J(before)&&J(await tk())===J(DEF),"still nothing taken, nothing written");
  await listen();
  await answer(p,"#tkQ");
  ok(await waitFor(p,()=>!!state.trick&&state.trick.doors.length===1),"he gets there: the door closes");
  let a=await purse(),t=await tk();
  ok(a.c===before.c+2&&a.g===before.g,"a right read pays 2 🪙 (after misses too); gems untouched "+J(a));
  ok(t.day==="2026-10-20"&&J(t.doors)===J(["b:6,8"])&&t.candy===2&&t.nights===0,"state.trick: the night's date, the closed door, candy 2 "+J(t));
  ok(await toasted(/^\+2 🪙$/),"the usual coin toast: +2 🪙 "+J(await E(()=>window.__toasts)));
  ok(await E(()=>/\+2 🪙 candy!/.test(document.getElementById("tkQ").textContent)&&/🍬 2 · 🚪 9 left/.test(document.getElementById("tkStat").textContent)),"the panel shows the candy and 9 doors left");
  s=await said();
  ok(s.indexOf("Trick or read? Read! Here's your candy!")>=0,"\"Trick or read? Read! Here's your candy!\" "+J(s));
  await p.click("#tkNext");
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure"),"More doors! goes back to Adventure");
  ok(await waitFor(p,()=>document.querySelectorAll(".advland.tkdoor.shut").length===1),"the door is dimmed for the night");
  ok(await waitFor(p,()=>document.getElementById("advAct").textContent==="🚪 Cottage"),"a closed door gives the cottage its own button back: "+await act());
  ok(await E(()=>Trick.knock("b:6,8"))===false&&(await purse()).c===a.c,"a closed door can't be knocked again");
  ok(await E(()=>document.getElementById("trickBadge").textContent)==="9","the 🎃 badge counts down: 9");

  // ---- 6. the action button (touch) and a double tap ----
  await at(doors.find(d=>d.id==="b:11,7"));
  ok(await waitFor(p,()=>document.getElementById("advAct").textContent==="🚪 Knock knock!"),"walking up to the windmill: 🚪 Knock knock!");
  await p.click("#advAct");
  ok(await waitFor(p,()=>Modes.top()==="trick"),"the action button knocks too");
  const q2=await E(()=>Trick._q());
  ok(q2.kind==="pic","the second door is a picture pick (they take turns): "+q2.kind);
  const c2=(await purse()).c;
  await E(()=>{const h=document.getElementById("tkQ"),b=h.querySelector('[data-w="'+h.dataset.ans+'"]');b.click();b.click();});
  await p.dblclick('#tkQ [data-w="'+await E(()=>document.getElementById("tkQ").dataset.ans)+'"]').catch(()=>{});
  await wait(1400);
  ok((await purse()).c===c2+2&&(await tk()).doors.length===2&&(await tk()).candy===4,"a double tap pays once "+J(await purse()));
  await p.click("#tkNext");await wait(100);

  // ---- 7. from level 3, every third door is a sentence (decodable at his level) ----
  await E(()=>{state.settings.tierOverride=3;});
  const house=doors.find(d=>d.kind==="house");
  await listen();
  ok(await E(id=>Trick.knock(id),house.id)===true,"a knock on the little house");
  const q3=await E(()=>({q:Trick._q(),ans:document.getElementById("tkQ").dataset.ans,text:(document.querySelector("#tkQ .btext")||{}).textContent||"",n:document.querySelectorAll("#tkQ .psopt").length}));
  ok(q3.q.kind==="sentence"&&/^#\d$/.test(q3.ans)&&q3.n===3,"level 3, the third door: a sentence to read, three pictures "+J(q3));
  ok(await E(x=>Decode.check(x,3).every(w=>w.ok),q3.text),"the sentence passes the decode check at level 3: "+q3.text);
  await wait(450);
  s=await said();
  ok(!s.some(x=>x.indexOf(q3.text)>=0||x==="say:sent:"+q3.text),"the sentence is not read out to him before he reads it");
  await wrong();await wait(100);await wrong();await wait(100);
  ok(await E(a=>document.querySelector('#tkQ .psopt[data-i="'+a.slice(1)+'"]').classList.contains("hint"),q3.ans),"two misses on a sentence: the right picture glows");
  await answer(p,"#tkQ");
  ok(await waitFor(p,()=>state.trick.doors.length===3,{timeout:4000}),"...and the sentence pays when he gets it");
  await p.click("#tkNext");await wait(100);

  // ---- 8. the tenth door: a cheer, and a look piece from the Look system ----
  // with the real Look system present (the merged game), wrap its grant to count calls; without it, stub one
  await E(()=>{window.__g=[];window.__real=typeof Looks!=="undefined"&&!!Looks;
    if(window.__real){window.__og=Looks.grant;Looks.grant=(id,o)=>{window.__g.push(id);return window.__og(id,o);};}
    else window.Looks={inWindow:()=>true,grant:id=>{window.__g.push(id);return "pumpkins";}};});
  const c3=(await purse()).c;
  await listen();
  for(let i=0;i<7;i++){
    const id=await openDoor();await E(id=>Trick.knock(id),id);
    await answer(p,"#tkQ");
    await waitFor(p,n=>state.trick.doors.length===n,{arg:4+i,timeout:4000});
    if(i<6){await p.click("#tkNext");await wait(80);}
  }
  t=await tk();
  ok(t.doors.length===10&&t.nights===1&&t.candy===20,"the tenth door finishes the night: nights 1, 20 candy "+J(t));
  ok((await purse()).c===c3+14,"...2 🪙 a door");
  ok(await waitFor(p,()=>/Happy Halloween!/.test(document.getElementById("tkQ").textContent)&&/Ten doors, ten treats!/.test(document.getElementById("tkQ").textContent)),
    "the panel cheers: Happy Halloween! Ten doors, ten treats!");
  s=await said();
  ok(s.indexOf("Happy Halloween! Ten doors, ten treats!")>=0,"...and says it");
  ok(await waitFor(p,()=>JSON.stringify(window.__g)==='["halloween"]'),"Looks.grant(\"halloween\") is asked once for a look piece: "+J(await E(()=>window.__g)));
  ok(await toasted(/You got the pumpkins! Look in your closet|Happy Halloween! Your valley looks spooky and sweet/),"the Look system announces the first piece "+J(await E(()=>window.__toasts.slice(-3))));
  ok(await E(()=>!window.__real||JSON.stringify(Looks.pieces("halloween").earned)===JSON.stringify(["pumpkins"])),"the real Look system earned exactly the first piece");
  ok(/You got the pumpkins!/.test(await E(()=>document.getElementById("tkPiece").textContent)),"...and so does the panel");
  ok(!s.some(x=>/pumpkins/.test(x)),"the piece is not said on top of the Look system's own line");
  await p.click("#tkNext");
  ok(await waitFor(p,()=>document.querySelectorAll(".advland.tkdoor.shut").length===10),"all ten doors are dimmed");
  ok(await E(()=>Trick.finished&&Trick.left===0&&!document.getElementById("trickBadge").classList.contains("on")),"no doors left, and no badge");
  ok(await E(()=>Trick.knock("x:1"))===false,"a finished night takes no more knocks");
  await E(()=>Adv.exit());await wait(150);await listen();
  await p.click("#trickBtn");await wait(200);
  ok((await said()).indexOf("You got all the treats tonight! Come back tomorrow.")>=0&&await E(()=>!Adv.on),"🎃 after a finished night: come back tomorrow (one night a day)");
  ok((await tk()).nights===1&&await E(()=>window.__g.length===1),"...nothing more is paid or granted");
  await E(()=>{if(window.__real)Looks.grant=window.__og;else delete window.Looks;state.settings.tierOverride=0;});

  // ---- 9. a new day: the doors open again ----
  await E(()=>Trick._setToday("2026-10-21"));
  ok(await E(()=>Trick.left===10&&Trick.doors().every(d=>!d.shut)&&document.getElementById("trickBadge").textContent==="10"),"a new date: ten doors open again");
  t=await tk();ok(t.day==="2026-10-20"&&t.doors.length===10,"...and the save changes only when a door closes");
  await E(()=>Adv.enter());await wait(400);
  const kinds=[];
  for(let i=0;i<3;i++){
    const id=await openDoor();await E(id=>Trick.knock(id),id);kinds.push((await E(()=>Trick._q())).kind);
    await answer(p,"#tkQ");await waitFor(p,n=>state.trick.day==="2026-10-21"&&state.trick.doors.length===n,{arg:i+1,timeout:4000});
    await E(()=>Trick.close());}
  ok(kinds.join()==="wordPick,pic,wordPick","below level 3 no door asks a sentence: "+kinds.join());
  t=await tk();ok(t.day==="2026-10-21"&&t.doors.length===3&&t.nights===1&&t.candy===26,"a new night in the save: "+J(t));
  // the next day outside the window has none of it
  await E(()=>Trick._setToday("2026-11-01"));
  ok(!(await shown("trickBtn"))&&await E(()=>!document.querySelector(".advland.tkdoor")),"1 November: the button and the doors are gone");
  await E(()=>Adv.exit());

  // ---- 10. more than ten buildings: ten of them, a different ten on different nights ----
  const BIG={};[[2,8],[5,8],[8,8],[11,8],[14,8],[17,8],[20,8],[3,6],[7,6],[11,6],[15,6],[19,6]].forEach(([c,r],i)=>{BIG[c+","+r]={id:["lantern","well","barn","garage","bell","market"][i%6],seed:i,lv:1};});
  await E(g=>{state.grid=g;renderWorld();},BIG);
  const picks=[];
  for(const d of ["2026-10-15","2026-10-16","2026-10-17"]){await E(x=>Trick._setToday(x),d);
    picks.push(await E(()=>Trick.doors().map(x=>x.kind+":"+x.id)));}
  ok(picks.every(x=>x.length===10&&x.every(y=>/^build:b:/.test(y))),"12 buildings: 10 doors, all on buildings");
  ok(J(picks[0])!==J(picks[1])||J(picks[1])!==J(picks[2]),"...a different ten on different nights");

  // ---- 11. the mode, the save, an old save ----
  ok(await E(()=>{const m=Modes.list().trick;return !!m&&m.name==="Trick-or-Read"&&m.reading===true&&state.modeOpens[today()].trick>=1;}),
    "the trick mode is counted as reading in Where the time goes: "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await E(()=>saveNow());await wait(300);
  await reload(p);await listen();await tidy();
  t=await tk();ok(t.day==="2026-10-21"&&t.doors.length===3&&t.candy===26&&t.nights===1,"state.trick is saved "+J(t));
  ok((await shown("trickBtn"))===(await E(()=>Trick.inWindow(today()))),"after a reload the test date is gone: the real date ("+await E(()=>today())+") decides");
  // a night part-way through keeps its button even when the window says no (a Look system with other dates)
  await E(()=>{if(window.__real){window.__oi=Looks.inWindow;Looks.inWindow=()=>false;}else window.Looks={inWindow:()=>false,grant:()=>null};window.__keep=state.trick;state.trick={day:today(),doors:["b:6,8"],candy:2,nights:0};Trick.hud();});
  ok(await shown("trickBtn")&&await E(()=>Trick.live()===false&&Trick.active()===true),"a night part-way through keeps its 🎃 button");
  await E(()=>{state.trick.doors=[];Trick.hud();});
  ok(!(await shown("trickBtn")),"...and without one, the Look system's window decides (no button)");
  await E(()=>{if(window.__real)Looks.inWindow=window.__oi;else delete window.Looks;state.trick=window.__keep;Trick.hud();});
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  ok(J(await tk())===J(DEF),"an old (v8) save loads, with the default trick field");
  await E(()=>Trick._setToday("2026-10-25"));
  ok(await E(()=>Trick.doors().length===10&&Trick.doors().filter(d=>d.kind==="build").length===6),"...ten doors on Halloween, six on its buildings");
  const c8=(await purse()).c;
  await E(()=>Adv.enter());await wait(400);
  await E(id=>Trick.knock(id),await openDoor());await answer(p,"#tkQ");
  ok(await waitFor(p,()=>state.trick.doors.length===1,{timeout:4000})&&(await purse()).c===c8+2,"...and a knock pays in the old save too");
  await E(()=>{Trick.close();Adv.exit();Trick._setToday(null);});

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
