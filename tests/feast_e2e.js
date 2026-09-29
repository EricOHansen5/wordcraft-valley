// v10.3 Feast table (Thanksgiving, 15 November to Thanksgiving Day): the window (Feast.inWindow and the look's own), nothing
// outside it, the 🦃 button, a Picture it with a food word at his level, a right read puts the dish on the table and pays 2 🪙
// once, a miss takes nothing and the second miss glows, ten dishes fill the table (his animals come to eat, the buddy says
// thanks, one look piece from the real Look system), one table a day, a new date, the food words and their levels,
// the feast mode, the save, and an old save.
const {launch,seed,reload,waitFor,answer,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("feast"),ok=T.ok;
  const CRITS=[{id:"fox",seed:5,c:5,r:8,lv:3,out:true,since:0},{id:"dog",seed:1,c:14,r:8,lv:2,out:true,since:1},
    {id:"frog",seed:6,c:9,r:7,lv:1,out:false,since:2},{id:"penguin",seed:8,c:11,r:6,lv:2,out:true,since:3}];
  // the keepers of the three open lands are awake, so no cut-scene opens on top; no reading goal cheer; level 4
  const START={guardians:[0,1,2],gems:30,settings:{goal:0,tierOverride:4},critters:CRITS,mine:{coins:40}};
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
  const fe=()=>E(()=>JSON.parse(JSON.stringify(state.feast)));
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const DEF={day:"",dishes:[],tables:0};
  const wait=ms=>p.waitForTimeout(ms);
  const ans=()=>E(()=>document.getElementById("fsQ").dataset.ans||"");
  const asked=[];   // every word the table asked for
  const question=async()=>{const a=await waitFor(p,()=>document.getElementById("fsQ").dataset.ans,{timeout:4000});if(a)asked.push(a);return a;};
  const wrong=()=>E(()=>{const h=document.getElementById("fsQ"),a=h.dataset.ans,b=[...h.querySelectorAll("[data-w]")].find(x=>x.dataset.w!==a);b.click();return b.dataset.w;});
  const dishes=n=>waitFor(p,n=>!!state.feast&&state.feast.dishes.length===n,{arg:n,timeout:4000});
  await listen();await tidy();

  // ---- 1. the window: 15 November to Thanksgiving Day (the fourth Thursday of November), both counted ----
  const w=await E(()=>["2026-11-14","2026-11-15","2026-11-26","2026-11-27"].map(d=>[Feast.inWindow(d),Looks.inWindow("thanks",d)]));
  ok(J(w)===J([[false,false],[true,true],[true,true],[false,false]]),"14 Nov no, 15 Nov yes, 26 Nov 2026 (Thanksgiving) yes, 27 Nov no; the look's window agrees "+J(w));
  ok(await E(()=>[2026,2027,2028,2029,2030].map(thanksgivingDay).join())==="26,25,23,22,28","thanksgivingDay: the fourth Thursday of November, 2026–2030");
  ok(await E(()=>Feast.inWindow(new Date(2026,10,26,23,59))&&!Feast.inWindow(new Date(2026,10,27,0,1))&&Feast.inWindow("2029-11-22")&&!Feast.inWindow("2029-11-23")
    &&Feast.inWindow("2030-11-28")&&!Feast.inWindow("2026-12-01")&&!Feast.inWindow("2026-10-20")&&!Feast.inWindow("soon")),
    "...for a Date too, in any year; the end moves with Thanksgiving; anything else is outside");
  ok(await E(()=>Feast.live()===Feast.inWindow(today())),"with no test date it goes by today's date");

  // ---- 2. outside the window: nothing shows and nothing is written ----
  await E(()=>Feast._setToday("2026-11-14"));
  ok(!(await shown("feastBtn")),"outside the window: no 🦃 button");
  ok(await E(()=>Feast.open())===false&&!(await E(()=>!!document.querySelector("#ovFeast.on"))),"...and the table does not open");
  ok(J(await fe())===J(DEF),"outside the window: the save field stays at its default "+J(await fe()));

  // ---- 3. in the window: the button, and a Picture it with a food word ----
  await E(()=>Feast._setToday("2026-11-20"));
  ok(await shown("feastBtn")&&await E(()=>document.getElementById("feastBadge").textContent==="10"&&document.getElementById("feastBadge").classList.contains("on")),
    "in the window: the 🦃 button shows, with 10 on its badge");
  ok(J(await fe())===J(DEF),"...and showing it writes nothing");
  await listen();
  await p.click("#feastBtn");
  ok(await waitFor(p,()=>Modes.top()==="feast"),"🦃 opens the Feast table (mode feast)");
  const t0=await E(()=>({plates:document.querySelectorAll("#fsPlates .fsplate").length,full:document.querySelectorAll("#fsPlates .fsplate.on").length,
    guests:document.querySelectorAll("#fsGuests .fsguest").length,buddy:!!document.querySelector("#fsBuddy svg"),stat:document.getElementById("fsStat").textContent}));
  ok(t0.plates===10&&t0.full===0&&t0.guests===0&&t0.buddy&&/0 of 10/.test(t0.stat),"a long empty table: ten plates, nobody seated yet, the buddy at the end "+J(t0));
  const a1=await question();
  const q1=await E(()=>{const h=document.getElementById("fsQ");return{opts:[...h.querySelectorAll(".wpic[data-w]")].map(b=>b.dataset.w),word:(h.querySelector(".wword")||{}).textContent,
    prompt:(h.querySelector(".wp")||{}).textContent,foods:Feast.foods(),q:Feast._q()};});
  ok(a1&&q1.opts.indexOf(a1)>=0&&q1.opts.length===3&&q1.word===a1&&/Tap its picture/.test(q1.prompt),"a Picture it: the word, three pictures, dataset.ans and data-w on the answers "+J(q1));
  ok(q1.foods.indexOf(a1)>=0&&["egg","nut","fish","chip","plum"].indexOf(a1)>=0,"the first dish is a food word at his level: "+a1);
  await wait(450);
  let s=await said();
  ok(s.indexOf("Let's set the feast table! Read each word and tap its picture.")>=0&&!s.some(x=>x==="say:word:"+a1||x===a1),"it says what to do, and never the word he has to read "+J(s));

  // ---- 4. misses take nothing; the second one makes the right picture glow; the right read pays once ----
  const before=await purse(),wr0=await E(()=>state.wordsRead),gw0=await E(()=>state.goal.words||0);
  await listen();
  await wrong();await wait(150);
  ok(J(await purse())===J(before)&&J(await fe())===J(DEF),"a miss takes nothing and writes nothing "+J(await purse()));
  ok(await E(a=>document.getElementById("fsMsg").textContent==="Not that one, try again!"&&document.getElementById("fsQ").dataset.ans===a&&!document.querySelector("#fsQ .hint"),a1),
    "a miss: \"Not that one, try again!\", the same question stays, nothing glows yet");
  await wait(750);
  ok((await said()).indexOf("Not that one, try again!")>=0,"...and it is said kindly");
  await wrong();await wait(150);
  ok(await E(a=>{const h=document.getElementById("fsQ"),r=h.querySelector('[data-w="'+a+'"]');return !!r&&r.classList.contains("hint")&&h.querySelectorAll(".hint").length===1;},a1),
    "after the second miss the right picture glows");
  ok(J(await purse())===J(before)&&J(await fe())===J(DEF)&&(await E(()=>Feast._q().miss))===2,"still nothing taken, nothing written");
  await listen();
  await answer(p,"#fsQ");
  ok(await dishes(1),"he gets there: the dish goes on the table");
  let a=await purse(),f=await fe();
  ok(a.c===before.c+2&&a.g===before.g,"a right read pays 2 🪙 (after misses too); gems untouched "+J(a));
  ok(f.day==="2026-11-20"&&J(f.dishes)===J([a1])&&f.tables===0,"state.feast: the table's date and the dish "+J(f));
  ok(await E(()=>state.wordsRead)===wr0+1&&await E(()=>state.goal.words)===gw0+1,"the dish counts as a word read and toward today's reading goal");
  ok(await toasted(/^\+2 🪙$/),"the usual coin toast: +2 🪙");
  ok(await waitFor(p,a=>{const pl=document.querySelector('#fsPlates .fsplate[data-i="0"]');return !!pl&&pl.dataset.dish===a&&!!pl.querySelector(".fsdish svg");},{arg:a1}),
    "the dish's picture is on the first plate");
  ok(await E(()=>/1 of 10/.test(document.getElementById("fsStat").textContent)&&document.getElementById("feastBadge").textContent==="9"),"the panel and the badge count: 1 of 10, 9 to go");
  s=await said();
  ok(s.indexOf("Yum! Put it on the table!")>=0&&s.indexOf("say:word:"+a1)>=0,"\"Yum! Put it on the table!\", and the word is said once he found it "+J(s));

  // ---- 5. the next dish, and a double tap ----
  const a2=await question();
  ok(a2&&(await E(()=>Feast._q().miss))===0,"the next question comes by itself: "+a2);
  const c2=(await purse()).c;
  await E(()=>{const h=document.getElementById("fsQ"),b=h.querySelector('[data-w="'+h.dataset.ans+'"]');b.click();b.click();});
  await p.dblclick('#fsQ [data-w="'+a2+'"]').catch(()=>{});
  await wait(1300);
  f=await fe();
  ok((await purse()).c===c2+2&&f.dishes.length===2,"a double tap pays once, one dish "+J(f));

  // ---- 6. ten dishes fill the table: the animals come, the buddy says thanks, one look piece ----
  // wrap the real Look system's grant to count the calls (a top-level const can't be swapped from window)
  await E(()=>{window.__g=[];window.__og=Looks.grant;Looks.grant=(id,o)=>{window.__g.push(id);return window.__og(id,o);};});
  const c3=(await purse()).c;
  for(let i=0;i<8;i++){await question();await answer(p,"#fsQ");await dishes(3+i);}
  f=await fe();
  ok(f.dishes.length===10&&f.tables===1,"ten dishes fill the table: tables 1 "+J(f));
  ok((await purse()).c===c3+16,"...2 🪙 a dish");
  ok(await waitFor(p,()=>document.querySelectorAll("#fsPlates .fsplate.on").length===10),"every plate has a dish");
  const g=await E(()=>[...document.querySelectorAll("#fsGuests .fsguest")].map(x=>x.dataset.crit+(x.querySelector("svg")?"":"?")));
  ok(J(g)===J(CRITS.map(c=>c.id)),"every animal he has comes to sit at the table "+J(g));
  ok(await waitFor(p,()=>document.getElementById("fsBubble").classList.contains("on")&&document.getElementById("fsBubble").textContent==="Thank you for the feast!"),
    "the buddy says \"Thank you for the feast!\"");
  ok(await E(()=>/The table is full!/.test(document.getElementById("fsQ").textContent)&&!document.getElementById("fsQ").dataset.ans),"the panel: The table is full! (no question left)");
  ok((await said()).indexOf("Thank you for the feast!")>=0,"...and it is said");
  ok(await waitFor(p,()=>JSON.stringify(window.__g)==='["thanks"]'),"Looks.grant(\"thanks\") is called once "+J(await E(()=>window.__g)));
  ok(await E(()=>JSON.stringify(Looks.pieces("thanks").earned)==='["garland"]'&&state.look==="thanks"),"the look's first piece (the garland) is earned, and the look goes on");
  ok(await toasted(/Happy Thanksgiving! The valley says thank you\./),"the Look system says its greeting "+J(await E(()=>window.__toasts.slice(-3))));
  ok(/You got the corn garland!/.test(await E(()=>document.getElementById("fsPiece").textContent)),"...and the panel names the piece");
  ok(!(await said()).some(x=>/garland/.test(x)),"the piece is not said on top of the Look system's own line");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="garland"] svg')&&document.body.classList.contains("look-thanks")),"the valley has the garland on, and the Thanksgiving look");
  ok(await E(()=>Feast.full&&Feast.left===0&&!document.getElementById("feastBadge").classList.contains("on")),"no dishes left, and no badge");

  // ---- 7. one table a day: a second visit shows it full and says so ----
  await p.click("#fsDone");
  ok(await waitFor(p,()=>Modes.top()==="valley"),"Done closes the table");
  const c4=(await purse()).c;await listen();
  await p.click("#feastBtn");
  ok(await waitFor(p,()=>Modes.top()==="feast"),"🦃 again the same day opens the table");
  await wait(200);
  ok(await E(()=>document.querySelectorAll("#fsPlates .fsplate.on").length===10&&document.querySelectorAll("#fsGuests .fsguest").length===4
    &&!document.getElementById("fsQ").dataset.ans&&/Come back tomorrow/.test(document.getElementById("fsQ").textContent)),"...full, with everyone at it, and no question");
  ok((await said()).indexOf("The table is full! Come back tomorrow.")>=0,"\"The table is full! Come back tomorrow.\"");
  ok((await purse()).c===c4&&(await fe()).tables===1&&await E(()=>window.__g.length===1),"...nothing more is paid or granted");
  await p.click("#fsDone");await wait(150);
  await E(()=>{Looks.grant=window.__og;});

  // ---- 8. a new day: a new table ----
  await E(()=>Feast._setToday("2026-11-21"));
  ok(await E(()=>Feast.left===10&&!Feast.full&&document.getElementById("feastBadge").textContent==="10"),"a new date: an empty table again");
  f=await fe();ok(f.day==="2026-11-20"&&f.dishes.length===10,"...and the save changes only when a dish goes on");
  await p.click("#feastBtn");
  const a3=await question();await answer(p,"#fsQ");
  ok(await waitFor(p,()=>state.feast.day==="2026-11-21"&&state.feast.dishes.length===1),"a dish on the new day's table");
  f=await fe();ok(f.tables===1&&J(f.dishes)===J([a3]),"a new table in the save "+J(f));
  await E(()=>Feast.close());
  // the day after Thanksgiving has none of it
  await E(()=>Feast._setToday("2026-11-27"));
  ok(!(await shown("feastBtn"))&&await E(()=>Feast.open()===false),"27 November: no button, and the table does not open");

  // ---- 9. the food words: at his level and decodable there, padded to six ----
  const lv=await E(()=>{const out={};[1,2,3,4,5,6,8].forEach(t=>{state.settings.tierOverride=t;const f=Feast.foods();
    out[t]={f,ok:f.every(x=>{const w=allWords().find(y=>y.w===x);return !!w&&!w.tricky&&w.t<=t&&!!WORD_ART[x]&&Decode.check(x,t).every(c=>c.ok);})};});
    state.settings.tierOverride=4;return out;});
  ok(Object.keys(lv).every(t=>lv[t].ok&&lv[t].f.length>=6),"every level: six or more words, each in his list at or below his level and decodable there "+J(lv));
  ok(J(lv[4].f.slice(0,5).sort())===J(["chip","egg","fish","nut","plum"])&&lv[4].f[5]==="pot","level 4: the five foods he can read, then a pot "+J(lv[4].f));
  ok(J(lv[1].f.slice(0,2))===J(["pot","pan"])&&lv[1].f.every(x=>!["cat","dog","bat","fox"].includes(x)),"level 1 (no foods yet): a pot, a pan, then other words at his level, never an animal "+J(lv[1].f));
  ok(lv[6].f.indexOf("corn")>=0&&lv[6].f.indexOf("cake")>=0&&lv[8].f.indexOf("pumpkin")>=0,"corn and cake from level 5–6, pumpkin at 8");
  ok(await E(x=>x.every(a=>Decode.check(a,4).every(c=>c.ok)&&Feast.foods().indexOf(a)>=0),asked)&&asked.length===11,
    "every word the table asked for was one of his foods and decodes at level 4 "+J(asked));

  // ---- 10. the mode, the save, an old save ----
  ok(await E(()=>{const m=Modes.list().feast;return !!m&&m.name==="Feast table"&&m.reading===true&&state.modeOpens[today()].feast>=1;}),
    "the feast mode is counted as reading in Where the time goes: "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await E(()=>saveNow());await wait(300);
  await reload(p);await listen();await tidy();
  f=await fe();ok(f.day==="2026-11-21"&&f.dishes.length===1&&f.tables===1,"state.feast is saved "+J(f));
  ok((await shown("feastBtn"))===(await E(()=>Feast.inWindow(today()))),"after a reload the test date is gone: the real date ("+await E(()=>today())+") decides");
  ok(await E(()=>JSON.stringify(Looks.pieces("thanks").earned)==='["garland"]'&&!!document.querySelector('#tiles .lookprop[data-prop="garland"]')),"the garland is still on after a reload");
  await seed(p,Object.assign({},START,{feast:null}));await tidy();
  ok(J(await fe())===J(DEF),"a save with feast null gets the default");
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  ok(J(await fe())===J(DEF)&&await E(()=>state.look===""),"an old (v8) save loads, with the default feast field and no look");
  await E(()=>Feast._setToday("2026-11-22"));
  const c8=(await purse()).c;
  ok(await E(()=>Feast.open())===true,"...the table opens on 22 November");
  const a8=await question();
  ok(await E(a=>Decode.check(a,currentTier()).every(c=>c.ok),a8),"...with a word he can read at his level ("+a8+", level "+await E(()=>currentTier())+")");
  await answer(p,"#fsQ");
  ok(await waitFor(p,()=>state.feast.dishes.length===1,{timeout:4000})&&(await purse()).c===c8+2,"...and a dish pays in the old save too");
  await E(()=>{Feast.close();Feast._setToday(null);});

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
