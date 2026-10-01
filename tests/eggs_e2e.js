// v10.3 Egg hunt (Easter: the two weeks before Easter Sunday to Easter Monday): the window (Eggs.inWindow, easterDay and the
// look's own), nothing outside it, the 🥚 button, Adventure with three eggs hidden on the treasure hunt's engine (four
// landmarks, a note with three clues at his level, never on a building, a note or the stall), a dig at the wrong landmark
// takes nothing, the right one finds an egg with a word pick at his level (dataset.ans), a right read pays 2 🪙 once, a miss
// takes nothing and the second miss glows, the third egg ends the hunt (one look piece from the real Look system), one hunt
// a day, a treasure hunt put aside comes back, a hunt from another day is put away, the words and notes at every level, the
// eggs mode, the save, and an old save.
const {launch,seed,reload,waitFor,answer,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("eggs"),ok=T.ok;
  const GRID={"6,8":{id:"cottage",seed:3,lv:1},"11,7":{id:"windmill",seed:2,lv:1},"16,8":{id:"campfire",seed:1,lv:1}};
  // a note from home waiting in Adventure (the marks must keep clear of it)
  const NOTE={id:"n1",text:"Look in the box.",from:"Dad",at:1,voice:false,read:false,found:false,c:13.5,r:6.2};
  // the keepers of the three open lands are awake, so no cut-scene opens on top; no reading goal cheer; level 4
  const START={guardians:[0,1,2],gems:30,settings:{goal:0,tierOverride:4},grid:GRID,notes:[NOTE],mine:{coins:40}};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  // record what is said instead of playing it (again after every reload): Sound.speak lines, and Sound.say keys (words); and the toasts
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};
    Sound.say=k=>{window.__said.push("say:"+k);return Promise.resolve();};
    window.__toasts=[];if(!window.__toast0)window.__toast0=window.toast;window.toast=function(m){window.__toasts.push(String(m));return window.__toast0.apply(this,arguments);};});
  const toasted=re=>E(s=>window.__toasts.some(t=>new RegExp(s).test(t)),re.source);
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const purse=()=>E(()=>({c:state.mine.coins,g:state.gems}));
  const eg=()=>E(()=>JSON.parse(JSON.stringify(state.eggs)));
  const hunt=()=>E(()=>state.adv.hunt&&JSON.parse(JSON.stringify(state.adv.hunt)));
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const DEF={day:"",found:[],hunts:0};
  const wait=ms=>p.waitForTimeout(ms);
  const note=()=>E(()=>{const n=document.getElementById("advNote");return{big:n.classList.contains("big"),egg:n.classList.contains("ehmark"),
    head:(n.querySelector(".nh")||{}).textContent||"",text:((n.querySelector(".btext")||{}).textContent||"").replace(/\s+/g," ").trim()};});
  const go=()=>E(()=>{const b=document.getElementById("noteGo");if(b)b.click();});
  // walk up to a mark (the right one for this clue, or another), and wait for the dig button
  const toMark=async i=>{await E(i=>{const m=state.adv.hunt.marks[i];Adv._P.c=m.c;Adv._P.r=m.r;},i);
    return waitFor(p,()=>document.getElementById("advAct").textContent==="⛏️ Dig here",{timeout:4000});};
  const rightMark=()=>E(()=>{const h=state.adv.hunt;return h.order[h.step];});
  const wrongMark=()=>E(()=>{const h=state.adv.hunt;return h.marks.findIndex((m,i)=>!m.dug&&i!==h.order[h.step]);});
  const panel=()=>waitFor(p,()=>{const h=document.getElementById("ehQ");return Modes.top()==="eggs"&&!!h&&!!h.dataset.ans&&h.dataset.ans;},{timeout:4000});
  const wrong=()=>E(()=>{const h=document.getElementById("ehQ"),a=h.dataset.ans,b=[...h.querySelectorAll("[data-w]")].find(x=>x.dataset.w!==a);b.click();return b.dataset.w;});
  // where the marks are against the buildings, the note and the Trading Post stall
  const clash=()=>E(()=>{const h=state.adv.hunt,st=Store._spot(),bad=[];
    h.marks.forEach(m=>{Object.keys(state.grid).forEach(k=>{const q=k.split(",").map(Number);if(Math.abs(q[0]-m.c)<2.2&&Math.abs(q[1]-m.r)<1.5)bad.push(m.w+" on building "+k);});
      (state.notes||[]).forEach(n=>{if(!n.found&&n.c!=null&&Math.abs(n.c-m.c)<1.6&&Math.abs(n.r-m.r)<1)bad.push(m.w+" on the note");});
      if(Math.abs(st.c-m.c)<2.2&&Math.abs(st.r-m.r)<1.5)bad.push(m.w+" on the stall");});
    return bad;});
  // one egg, start to finish: walk to the right mark, dig, read the word
  const oneEgg=async n=>{await go();const i=await rightMark();await toMark(i);await p.click("#advAct");const a=await panel();
    await answer(p,"#ehQ");await waitFor(p,n=>!!state.eggs&&state.eggs.found.length===n,{arg:n,timeout:4000});return a;};
  const card=()=>E(()=>{const c=document.querySelector('#clGrid .clcard[data-look="easter"]');return c&&{locked:c.classList.contains("locked"),worn:c.classList.contains("worn"),
    text:c.querySelector(".cost").textContent.trim(),when:(c.querySelector(".clwhen")||{}).textContent||"",got:[...c.querySelectorAll(".clpc.got")].map(x=>x.dataset.piece)};});
  const closet=async()=>{await p.click("#closetBtn");await waitFor(p,()=>Modes.top()==="closet");const c=await card();await p.click("#clClose");await waitFor(p,()=>Modes.top()==="valley");return c;};
  await listen();await tidy();

  // ---- 1. the window: 14 days before Easter Sunday to Easter Monday ----
  ok(await E(()=>[2024,2025,2026,2027,2028,2029,2030,2038,2285].map(y=>easterDay(y).join("-")).join())==="3-31,4-20,4-5,3-28,4-16,4-1,4-21,4-25,3-22",
    "easterDay: the anonymous Gregorian algorithm, 2024–2030, the latest (25 April 2038) and the earliest (22 March 2285)");
  const w=await E(()=>["2027-03-13","2027-03-14","2027-03-28","2027-03-29","2027-03-30"].map(d=>[Eggs.inWindow(d),Looks.inWindow("easter",d)]));
  ok(J(w)===J([[false,false],[true,true],[true,true],[true,true],[false,false]]),"Easter 2027 is 28 March: 13 Mar no, 14 Mar yes, 28 Mar yes, 29 Mar (Easter Monday) yes, 30 Mar no; the look agrees "+J(w));
  ok(await E(()=>Eggs.inWindow(new Date(2026,2,22,0,1))&&!Eggs.inWindow(new Date(2026,2,21,23,59))&&Eggs.inWindow(new Date(2026,3,6,23,59))&&!Eggs.inWindow(new Date(2026,3,7))
    &&Eggs.inWindow("2038-04-26")&&!Eggs.inWindow("2038-04-27")&&!Eggs.inWindow("soon")),"...for a Date too, in any year (2026: 22 March to 6 April); anything else is outside");
  ok(await E(()=>{const f=EASTER_WINDOW.from;return Array.isArray(f)&&(f[0]===3||f[0]===4)&&Eggs.inWindow(new Date(new Date().getFullYear()+(f[0]<new Date().getMonth()+1?1:0),f[0]-1,f[1]));}),
    "the look's window has a from for the Closet: the first day of the next window "+J(await E(()=>EASTER_WINDOW.from)));
  ok(await E(()=>Eggs.live()===Eggs.inWindow(today())),"with no test date it goes by today's date");

  // ---- 2. outside the window: nothing shows and nothing is written ----
  await E(()=>Eggs._setToday("2027-03-13"));
  ok(!(await shown("eggsBtn")),"outside the window: no 🥚 button");
  ok(await E(()=>Eggs.open())===false&&await E(()=>!Adv.on),"...and it does not open Adventure");
  ok(J(await eg())===J(DEF)&&await E(()=>state.adv.hunt===null),"outside the window: the save field stays at its default, and no hunt "+J(await eg()));
  let cc=await closet();
  ok(cc&&cc.locked&&cc.text==="Earn it at Easter 🐣"&&/^in (March|April)$/.test(cc.when),"the Closet lists the Easter look, greyed: \"Earn it at Easter 🐣\", "+cc.when+" "+J(cc));

  // ---- 3. in the window: the button, and Adventure with three eggs hidden ----
  await E(()=>Eggs._setToday("2027-03-20"));
  ok(await shown("eggsBtn")&&await E(()=>document.getElementById("eggsBadge").textContent==="3"&&document.getElementById("eggsBadge").classList.contains("on")),
    "in the window: the 🥚 button shows, with 3 on its badge");
  ok(J(await eg())===J(DEF)&&await E(()=>state.adv.hunt===null),"...and showing it writes nothing");
  await listen();
  await p.click("#eggsBtn");
  ok(await waitFor(p,()=>Modes.top()==="adventure"&&!!state.adv.hunt),"🥚 opens Adventure with a hunt");
  let h=await hunt();
  ok(h.kind==="eggs"&&h.day==="2027-03-20"&&h.marks.length===4&&h.order.length===3&&h.step===0&&h.miss===0&&!h.park,"the egg hunt runs on the treasure hunt's engine: four landmarks, three clues "+J({kind:h.kind,day:h.day,marks:h.marks.map(m=>m.w),order:h.order}));
  ok(await E(()=>document.querySelectorAll("#tiles .advland.ehmark").length===4&&document.querySelectorAll("#tiles .advland.ehmark.dug").length===0),"four landmarks in the valley");
  ok(await E(()=>state.adv.hunt.marks.every(m=>{const w=allWords().find(x=>x.w===m.w);return !!w&&!w.tricky&&w.t<=4&&!CRIT(m.w);})),"...each a thing at his level (not an animal)");
  let n0=await note();
  const w0=h.marks[h.order[0]].w;
  ok(n0.big&&n0.egg&&n0.head==="🥚 Egg 1 of 3"&&n0.text===`The egg is by the ${w0}.`,"the note blows in: \"🥚 Egg 1 of 3\", \"The egg is by the "+w0+".\" "+J(n0));
  ok(await E(x=>Decode.check(x,4).every(w=>w.ok),n0.text),"...and he can read every word of it at his level");
  ok(await toasted(/^Eggs are hiding in the valley! 🥚$/),"\"Eggs are hiding in the valley! 🥚\"");
  await wait(1000);
  ok((await said()).indexOf("It's an egg hunt! Read the note to find the eggs.")>=0&&!(await said()).some(x=>x.indexOf(w0)>=0),"it says what to do, and never the clue "+J(await said()));
  ok(J(await clash())==="[]","the eggs are never on a building, the note from home or the Trading Post stall "+J(await clash()));
  ok(J(await eg())===J(DEF),"nothing is written to state.eggs until an egg is found");

  // ---- 4. a dig at the wrong landmark takes nothing ----
  await go();await wait(150);
  const wi=await wrongMark(),before=await purse();
  ok(await toMark(wi),"walking up to another landmark: ⛏️ Dig here");
  await listen();
  await p.keyboard.press("Space");await wait(900);
  h=await hunt();
  ok(h.miss===1&&h.step===0&&!h.marks[wi].dug,"Space digs: nothing there, and the hunt stays on the same clue "+J({miss:h.miss,step:h.step}));
  ok(await toasted(new RegExp("^No egg by the "+h.marks[wi].w+"\\. Read the note again!$")),"\"No egg by the "+h.marks[wi].w+". Read the note again!\"");
  ok(J(await purse())===J(before)&&J(await eg())===J(DEF)&&await E(()=>!document.querySelector("#ovEggs.on")),"a wrong dig takes nothing, writes nothing and opens nothing");
  ok((await note()).big,"...and the note comes back to read again");

  // ---- 5. the right landmark: an egg, with a word to read in it ----
  await go();await wait(150);
  const ri=await rightMark();
  ok(await toMark(ri),"walking up to the "+w0+": ⛏️ Dig here");
  await listen();
  await p.click("#advAct");
  const a1=await panel();
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure>eggs"),"the dig finds an egg: the egg opens on top of Adventure (mode eggs) "+await E(()=>Modes.stack().join(">")));
  const q1=await E(()=>{const h=document.getElementById("ehQ");return{opts:[...h.querySelectorAll(".wwopt[data-w]")].map(b=>b.dataset.w),pic:!!h.querySelector(".wbig svg"),
    egg:!!document.querySelector("#ovEggs .ehegg svg"),stat:document.getElementById("ehStat").textContent,q:Eggs._q()};});
  ok(a1&&q1.opts.length===3&&q1.opts.indexOf(a1)>=0&&q1.q.w===a1&&q1.pic&&q1.egg,"a word pick in the egg: its picture, three words, dataset.ans and data-w on the answers "+J(q1));
  ok(await E(a=>{const w=allWords().find(x=>x.w===a);return !!w&&!w.tricky&&w.t<=4&&Decode.check(a,4).every(c=>c.ok)&&Eggs.words().indexOf(a)>=0;},a1),"the word is a spring word at his level: "+a1);
  ok(/0 of 3/.test(q1.stat),"the panel counts the eggs: 0 of 3");
  await wait(450);
  let s=await said();
  ok(s.indexOf("You found an egg! What is in it?")>=0&&!s.some(x=>x==="say:word:"+a1||x===a1),"\"You found an egg! What is in it?\", and never the word "+J(s));
  // misses take nothing; the second one glows; the right read pays once
  const b1=await purse(),wr0=await E(()=>state.wordsRead),gw0=await E(()=>state.goal.words||0);
  await listen();
  await wrong();await wait(150);
  ok(J(await purse())===J(b1)&&J(await eg())===J(DEF),"a miss takes nothing and writes nothing");
  ok(await E(a=>document.getElementById("ehMsg").textContent==="Not that one, try again!"&&document.getElementById("ehQ").dataset.ans===a&&!document.querySelector("#ehQ .hint"),a1),
    "a miss: \"Not that one, try again!\", the same word stays, nothing glows yet");
  await wait(750);
  ok((await said()).indexOf("Not that one, try again!")>=0,"...and it is said kindly");
  await wrong();await wait(150);
  ok(await E(a=>{const h=document.getElementById("ehQ"),r=h.querySelector('[data-w="'+a+'"]');return !!r&&r.classList.contains("hint")&&h.querySelectorAll(".hint").length===1;},a1),
    "after the second miss the answer glows");
  ok(J(await purse())===J(b1)&&J(await eg())===J(DEF)&&(await E(()=>Eggs._q().miss))===2,"still nothing taken, nothing written");
  await listen();
  await answer(p,"#ehQ");
  ok(await waitFor(p,()=>!!state.eggs&&state.eggs.found.length===1),"he gets there: the egg is found");
  let a=await purse(),e=await eg();
  ok(a.c===b1.c+2&&a.g===b1.g,"a right read pays 2 🪙 (after misses too); gems untouched "+J(a));
  ok(e.day==="2027-03-20"&&J(e.found)===J([a1])&&e.hunts===0,"state.eggs: the hunt's date and the word in the egg "+J(e));
  ok(await E(()=>state.wordsRead)===wr0+1&&await E(()=>state.goal.words)===gw0+1,"the egg counts as a word read and toward today's reading goal");
  ok(await toasted(/^\+2 🪙$/),"the usual coin toast: +2 🪙");
  h=await hunt();
  ok(h.step===1&&h.marks[ri].dug,"the engine moves on: the mark is dug, step 1");
  ok(await waitFor(p,i=>{const el=document.querySelectorAll("#tiles .advland.ehmark")[i];return !!el&&el.classList.contains("dug")&&!!el.querySelector(".ehfound svg");},{arg:ri}),
    "the dug mark shows the painted egg");
  ok(await waitFor(p,()=>/\+2 🪙/.test(document.getElementById("ehWork").textContent)&&/2 eggs to find/.test(document.getElementById("ehWork").textContent)&&!!document.querySelector("#ehWork .ehopen svg")),
    "the egg opens: what was in it, +2 🪙, 2 eggs to find");
  s=await said();
  ok(s.indexOf("Two more eggs to find!")>=0&&s.indexOf("say:word:"+a1)>=0,"\"Two more eggs to find!\", and the word is said once he found it "+J(s));
  ok(await E(()=>document.getElementById("eggsBadge").textContent==="2"),"the 🥚 badge counts down: 2");
  await p.click("#ehNext");
  ok(await waitFor(p,()=>Modes.top()==="adventure"),"\"Find the next egg!\" goes back to Adventure");
  const w1=h.marks[h.order[1]].w;
  ok(await waitFor(p,x=>{const n=document.getElementById("advNote");return n.classList.contains("big")&&n.querySelector(".nh").textContent==="🥚 Egg 2 of 3"&&n.querySelector(".btext").textContent.replace(/\s+/g," ").trim()===x;},
    {arg:`Yes! The egg is by the ${w1}.`}),"...with the next clue: \"🥚 Egg 2 of 3\", \"Yes! The egg is by the "+w1+".\" "+J(await note()));

  // ---- 6. a double dig opens one egg, a double tap pays once ----
  await go();await wait(150);
  await toMark(await rightMark());
  await E(()=>{Adv._act();Adv._act();});
  const a2=await panel();await wait(700);
  ok(a2&&await E(()=>document.querySelectorAll("#ovEggs.on").length===1&&Eggs._q().n===1),"a double tap on the dig opens one egg (the second)");
  const c2=(await purse()).c;
  await E(()=>{const h=document.getElementById("ehQ"),b=h.querySelector('[data-w="'+h.dataset.ans+'"]');b.click();b.click();});
  await p.dblclick('#ehQ [data-w="'+a2+'"]').catch(()=>{});
  await wait(1400);
  e=await eg();
  ok((await purse()).c===c2+2&&e.found.length===2&&(await hunt()).step===2,"a double tap pays once, one egg "+J(e));
  ok((await said()).indexOf("One more egg to find!")>=0,"\"One more egg to find!\"");
  await p.click("#ehNext");await waitFor(p,()=>Modes.top()==="adventure");

  // ---- 7. the third egg: all the eggs, and one look piece ----
  // wrap the real Look system's grant to count the calls (a top-level const can't be swapped from window)
  await E(()=>{window.__g=[];window.__og=Looks.grant;Looks.grant=(id,o)=>{window.__g.push(id);return window.__og(id,o);};});
  const c3=(await purse()).c;
  await listen();
  await oneEgg(3);
  e=await eg();
  ok(e.found.length===3&&e.hunts===1&&(await purse()).c===c3+2,"the third egg ends the hunt: hunts 1, 2 🪙 an egg "+J(e));
  ok(await waitFor(p,()=>/You found all the eggs!/.test(document.getElementById("ehWork").textContent)&&!document.getElementById("ehQ")),"the panel: You found all the eggs!");
  ok((await said()).indexOf("You found all the eggs!")>=0,"...and it is said");
  ok(await waitFor(p,()=>JSON.stringify(window.__g)==='["easter"]'),"Looks.grant(\"easter\") is called once "+J(await E(()=>window.__g)));
  ok(await E(()=>JSON.stringify(Looks.pieces("easter").earned)==='["eggs"]'&&state.look==="easter"),"the look's first piece (the painted eggs) is earned, and the look goes on");
  ok(await toasted(/Happy Easter! Eggs are hiding in the valley\./),"the Look system says its greeting "+J(await E(()=>window.__toasts.slice(-3))));
  ok(/You got the painted eggs!/.test(await E(()=>document.getElementById("ehPiece").textContent)),"...and the panel names the piece");
  ok(!(await said()).some(x=>/painted eggs/.test(x)),"the piece is not said on top of the Look system's own line");
  ok(await E(()=>state.adv.hunt===null&&!document.getElementById("advNote").textContent.trim()),"the hunt is over: no hunt and no note left");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="eggs"] svg')&&document.body.classList.contains("look-easter")),"the valley has the painted eggs, and the Easter look");
  ok(await E(()=>Eggs.done&&Eggs.left===0&&!document.getElementById("eggsBadge").classList.contains("on")),"no eggs left, and no badge");
  await p.click("#ehDone");
  ok(await waitFor(p,()=>Modes.top()==="adventure")&&await E(()=>!document.querySelectorAll("#tiles .advland.ehmark").length),"Done: back in Adventure, the marks are gone");

  // ---- 8. one hunt a day ----
  await E(()=>Adv.exit());await wait(150);await listen();
  const c4=await purse();
  await p.click("#eggsBtn");await wait(300);
  ok((await said()).indexOf("You found all the eggs! Come back tomorrow.")>=0&&await toasted(/You found all the eggs! Come back tomorrow/),"🥚 after a finished hunt: \"You found all the eggs! Come back tomorrow.\"");
  ok(await E(()=>!Adv.on&&state.adv.hunt===null)&&J(await purse())===J(c4)&&(await eg()).hunts===1&&await E(()=>window.__g.length===1),"...no Adventure, no hunt, nothing more paid or granted");
  cc=await closet();
  ok(cc&&!cc.locked&&cc.worn&&cc.text==="1 of 4 pieces"&&J(cc.got)===J(["eggs"]),"the Closet: Easter worn, 1 of 4 pieces "+J(cc));

  // ---- 9. a new day, with a treasure hunt going: it is put aside and comes back ----
  await E(()=>Eggs._setToday("2027-03-21"));
  ok(await E(()=>Eggs.left===3&&!Eggs.done&&document.getElementById("eggsBadge").textContent==="3"),"a new date: three eggs to find again");
  e=await eg();ok(e.day==="2027-03-20"&&e.found.length===3,"...and the save changes only when an egg is found");
  await E(()=>{Adv.enter();Adv.newHunt();});await wait(300);await go();
  const tre=await hunt();
  ok(tre&&!tre.kind&&tre.marks.length===4,"a treasure hunt is going ("+tre.marks.map(m=>m.w).join(", ")+")");
  await E(()=>Adv.exit());await wait(150);await listen();
  await p.click("#eggsBtn");
  ok(await waitFor(p,()=>Adv.on&&!!state.adv.hunt&&state.adv.hunt.kind==="eggs"),"🥚 starts the egg hunt");
  h=await hunt();
  ok(h.park&&J(h.park.marks)===J(tre.marks)&&!h.park.kind,"...and puts the treasure hunt aside, as it was");
  ok(await E(()=>document.querySelectorAll("#tiles .advland").length>=4&&document.querySelectorAll("#tiles .advland.ehmark").length===4&&!document.querySelector("#tiles .advland:not(.ehmark):not(.spot)")),
    "only the egg hunt's marks are in the valley");
  ok(J(await clash())==="[]","the eggs keep clear of the buildings, the note and the stall "+J(await clash()));
  await wait(600);
  ok((await note()).big&&(await note()).head==="🥚 Egg 1 of 3","the egg hunt's note, big");
  const c5=(await purse()).c;
  await listen();
  for(let i=1;i<=3;i++){await oneEgg(i);if(i<3){await p.click("#ehNext");await waitFor(p,()=>Modes.top()==="adventure");await wait(200);}}
  e=await eg();
  ok(e.day==="2027-03-21"&&e.found.length===3&&e.hunts===2&&(await purse()).c===c5+6,"three eggs on the new day: hunts 2 "+J(e));
  ok(await waitFor(p,()=>JSON.stringify(Looks.pieces("easter").earned)==='["eggs","bunny"]'),"...and the second piece, the bunny "+J(await E(()=>Looks.pieces("easter").earned)));
  ok(await toasted(/You got the bunny! Look in your closet/)&&(await said()).indexOf("You got the bunny! Look in your closet.")>=0&&await E(()=>window.__g.length===2),
    "the Look system says \"You got the bunny!\", and grant was called once more");
  h=await hunt();
  ok(h&&!h.kind&&J(h.marks)===J(tre.marks),"the treasure hunt comes back, as it was");
  await p.click("#ehDone");await waitFor(p,()=>Modes.top()==="adventure");await wait(200);
  ok(await E(()=>document.querySelectorAll("#tiles .advland.ehmark").length===0&&document.querySelectorAll("#tiles .advland:not(.spot)").length===4
    &&document.getElementById("advHunt").textContent==="📜 Read the note"),"its marks are back in the valley, and the 🗺️ button reads its note");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="bunny"] svg')),"the bunny is in the valley");
  await E(()=>{Looks.grant=window.__og;Adv.exit();state.adv.hunt=null;});await wait(150);

  // ---- 10. a hunt left from another day is put away ----
  await E(()=>Eggs._setToday("2027-03-22"));
  await p.click("#eggsBtn");await waitFor(p,()=>Adv.on&&!!state.adv.hunt&&state.adv.hunt.day==="2027-03-22");await wait(600);
  await oneEgg(1);await p.click("#ehNext");await waitFor(p,()=>Modes.top()==="adventure");
  await E(()=>Adv.exit());await wait(100);
  ok((await hunt()).kind==="eggs"&&(await hunt()).step===1&&await E(()=>Eggs.left===2),"one egg found on 22 March, and the hunt left there");
  await E(()=>Eggs._setToday("2027-03-23"));
  ok(await E(()=>state.adv.hunt===null&&Eggs.left===3),"the next day the hunt is put away, and three eggs are to find again");
  e=await eg();ok(e.day==="2027-03-22"&&e.found.length===1,"...the save keeps the day before's egg until one is found "+J(e));
  await p.click("#eggsBtn");
  ok(await waitFor(p,()=>Adv.on&&!!state.adv.hunt&&state.adv.hunt.day==="2027-03-23"&&state.adv.hunt.step===0&&!state.adv.hunt.marks.some(m=>m.dug)),"🥚 starts a new hunt from the first egg");
  await E(()=>{Adv.exit();state.adv.hunt=null;});await wait(100);
  // a hunt part-way through keeps its 🥚 button even when the window says no
  await E(()=>{Eggs._setToday(null);window.__keep=state.eggs;window.__oi=Looks.inWindow;Looks.inWindow=()=>false;state.eggs={day:today(),found:["hen"],hunts:0};Eggs.hud();});
  ok(await shown("eggsBtn")&&await E(()=>Eggs.live()===false&&Eggs.active()===true),"a hunt part-way through keeps its 🥚 button");
  await E(()=>{state.eggs.found=[];Eggs.hud();});
  ok(!(await shown("eggsBtn")),"...and without one, the Look system's window decides (no button)");
  await E(()=>{Looks.inWindow=window.__oi;state.eggs=window.__keep;Eggs.hud();});

  // ---- 11. what is in the eggs: spring words at his level ----
  const lv=await E(()=>{const out={};[1,2,3,4,5,6,8].forEach(t=>{state.settings.tierOverride=t;const f=Eggs.words();
    out[t]={f,ok:f.every(x=>{const w=allWords().find(y=>y.w===x);return !!w&&!w.tricky&&w.t<=t&&!!WORD_ART[x]&&Decode.check(x,t).every(c=>c.ok);})};});
    state.settings.tierOverride=4;return out;});
  ok(Object.keys(lv).every(t=>lv[t].ok&&lv[t].f.length>=3),"every level: three or more words, each in his list at or below his level and decodable there "+J(lv));
  ok(["chick","hen","duck","egg","nest"].every(x=>lv[4].f.indexOf(x)>=0)&&lv[4].f.every(x=>["chick","hen","duck","egg","nest","bug","frog","sun","tree","grass"].indexOf(x)>=0),
    "level 4: spring things (chick, hen, duck, egg, nest…) "+J(lv[4].f));
  ok(lv[1].f.length>=3&&["hen","egg","chick"].every(x=>lv[1].f.indexOf(x)<0),"level 1 (no spring words yet): other words he can read "+J(lv[1].f));

  // ---- 12. the note at every level ----
  const notes=await E(async()=>{const out=[];Eggs._setToday("2027-03-24");Adv.enter();
    for(const t of [1,2,3,4,5,6,8]){state.settings.tierOverride=t;state.adv.hunt=null;Adv.newHunt({kind:"eggs",day:"2027-03-24"});
      for(let s=0;s<3;s++){state.adv.hunt.step=s;Adv.note(true);const x=document.querySelector("#advNote .btext").textContent.replace(/\s+/g," ").trim();
        out.push({t,s,x,ok:Decode.check(x,t).every(c=>c.ok)});}}
    state.adv.hunt=null;Adv.exit();state.settings.tierOverride=4;Eggs._setToday("2027-03-20");return out;});
  ok(notes.every(n=>n.ok),"every clue decodes at his level, from 1 to 8 "+J(notes.filter(n=>!n.ok)));
  ok(await E(()=>{Adv.enter();let bad=0;for(let k=0;k<30;k++){state.adv.hunt=null;Adv.newHunt({kind:"eggs",day:"2027-03-20"});if(state.adv.hunt.marks.some(m=>m.w==="egg"))bad++;}
    state.adv.hunt=null;Adv.exit();return bad===0;}),"no landmark of an egg hunt is itself an egg (not \"The egg is by the egg.\")");
  ok(/^Hop to the \w+!$/.test(notes[0].x)&&/^The egg is by the \w+\.$/.test(notes.find(n=>n.t===4&&n.s===0).x)&&/^Yes! The egg is by the \w+, not the \w+\.$/.test(notes.find(n=>n.t===5&&n.s===1).x)
    &&/^One more! The egg is by the \w+, not the \w+\.$/.test(notes.find(n=>n.t===6&&n.s===2).x)&&!/Yes/.test(notes.find(n=>n.t===1&&n.s===1).x),
    "\"Hop to the log!\" at 1, \"The egg is by the log.\" from 2, \"…, not the cup.\" from 5, \"One more!\" from 6 "+J(notes.map(n=>n.t+"/"+n.s+": "+n.x)));

  // ---- 13. never on a building, a note or the stall, in a crowded valley ----
  const crowd=await E(()=>{const g0=state.grid;const G={};[[2,8],[5,8],[9,8],[13,8],[17,8],[20,8],[3,6],[7,6],[11,6],[15,6],[19,6]].forEach(([c,r],i)=>{G[c+","+r]={id:["lantern","well","barn","garage","bell","market"][i%6],seed:i,lv:1};});
    state.grid=G;renderWorld();Adv.enter();let bad=0,n=0;const st=Store._spot();
    for(let k=0;k<40;k++){state.adv.hunt=null;Adv.newHunt({kind:"eggs",day:"2027-03-20"});n++;
      state.adv.hunt.marks.forEach(m=>{if(Object.keys(G).some(key=>{const q=key.split(",").map(Number);return Math.abs(q[0]-m.c)<2.2&&Math.abs(q[1]-m.r)<1.5;})
        ||state.notes.some(x=>!x.found&&Math.abs(x.c-m.c)<1.6&&Math.abs(x.r-m.r)<1)||(Math.abs(st.c-m.c)<2.2&&Math.abs(st.r-m.r)<1.5))bad++;});}
    state.adv.hunt=null;Adv.exit();state.grid=g0;renderWorld();return bad+" of "+n*4;});
  ok(/^0 of/.test(crowd),"eleven buildings, a note and the stall: no egg mark on any of them in 40 hunts ("+crowd+")");

  // ---- 14. the mode, the save, an old save ----
  ok(await E(()=>{const m=Modes.list().eggs;return !!m&&m.name==="Egg hunt"&&m.reading===true&&state.modeOpens[today()].eggs>=1;}),
    "the eggs mode is counted as reading in Where the time goes: "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await E(()=>saveNow());await wait(300);
  await reload(p);await listen();await tidy();
  e=await eg();ok(e.day==="2027-03-22"&&e.found.length===1&&e.hunts===2,"state.eggs is saved "+J(e));
  ok((await shown("eggsBtn"))===(await E(()=>Eggs.inWindow(today()))),"after a reload the test date is gone: the real date ("+await E(()=>today())+") decides");
  ok(await E(()=>JSON.stringify(Looks.pieces("easter").earned)==='["eggs","bunny"]'&&!!document.querySelector('#tiles .lookprop[data-prop="eggs"]')&&!!document.querySelector('#tiles .lookprop[data-prop="bunny"]')),
    "the eggs and the bunny are still out after a reload");
  await seed(p,Object.assign({},START,{eggs:null}));await tidy();
  ok(J(await eg())===J(DEF),"a save with eggs null gets the default");
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  ok(J(await eg())===J(DEF)&&await E(()=>state.look===""),"an old (v8) save loads, with the default eggs field and no look");
  const old=await hunt();
  await E(()=>Eggs._setToday("2027-03-25"));
  const c8=(await purse()).c;
  ok(await E(()=>Eggs.open())===true&&await waitFor(p,()=>Adv.on&&!!state.adv.hunt&&state.adv.hunt.kind==="eggs"),"...🥚 opens an egg hunt on 25 March");
  ok(J((await hunt()).park||null)===J(old||null),"...putting aside the treasure hunt the old save had going, if any");
  await wait(600);
  const a8=await oneEgg(1);
  ok(await E(a=>Decode.check(a,currentTier()).every(c=>c.ok),a8)&&(await purse()).c===c8+2,"...and an egg with a word he can read pays in the old save too ("+a8+", level "+await E(()=>currentTier())+")");
  await E(()=>{Eggs.close();Adv.exit();Eggs._setToday(null);});

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
