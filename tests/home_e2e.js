// Home: the under-the-sea start screen, the Games registry every game adds itself to, and getting back to Home.
// A 1024x768 touch iPad (and 768x1024 where it says).
"use strict";
const {launch,check,waitFor,seed}=require("./lib");
(async()=>{
  const t=check("home"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},home:true,
    seed:{phase:2,settings:{goal:0},crateCount:40,mine:{made:true},library:{"0":{}},jobs:{xp:{shop:3}},dungeon:{seen:true},adv:{seenIntro:1},factory:{lvl:2}}});
  const wait=ms=>p.waitForTimeout(ms);

  // ---- registry ----
  const reg=await E(()=>{
    Games.add({id:"t_a",name:"Test A",icon:"🅰️",order:12,show:()=>true,open:()=>{}});
    Games.add({id:"t1",name:"Test",icon:"🧪",order:15,show:()=>true,open:()=>{window.__t1=1;}});
    Games.add({id:"t_b",name:"Test B",icon:"🅱️",order:18,show:()=>true,open:()=>{}});
    Games.add({id:"t_off",name:"Hidden",icon:"🙈",order:16,show:()=>false,open:()=>{}});
    const ids=Games.list().map(g=>g.id);
    return{ids,order:ids.indexOf("t_a")<ids.indexOf("t1")&&ids.indexOf("t1")<ids.indexOf("t_b"),off:ids.indexOf("t_off")>=0,get:!!Games.get("t1")};});
  ok(reg.order&&reg.get,"Games.add puts a game in the list in its order "+J(reg.ids.slice(0,8)));
  ok(!reg.off,"a game whose show() is false is not in the list");
  ok(await E(()=>Games.isNew("t1")),"a game never opened is new");
  const op=await E(()=>{Games.open("t1");return{ran:window.__t1===1,isNew:Games.isNew("t1"),seen:state.home.seen.t1,today:today()};});
  ok(op.ran&&!op.isNew&&op.seen===op.today,"Games.open runs it and marks it seen today "+J(op));
  ok(await E(()=>{Games.add({id:"t1",name:"Test again",icon:"🧪",order:15,show:()=>true,open:()=>{}});return Games.list().filter(g=>g.id==="t1").length===1&&Games.get("t1").name==="Test again";}),
    "adding the same id again replaces the entry");
  // an old save that has played things is not covered in NEW
  const seen=await E(()=>Object.keys(state.home.seen).sort());
  const want=["adventure","books","crates","dungeons","factory","jobs","mine","quests","valley"];
  ok(want.every(k=>seen.indexOf(k)>=0),"an old save starts with what it has played already seen "+J(seen));
  // a brand-new save: only the valley and the quests are seen
  await seed(p,{},{base:null,home:true});
  const fresh=await E(()=>Object.keys(state.home.seen).filter(k=>k.indexOf("t")!==0||k==="t").sort());
  ok(J(fresh)===J(["quests","valley"]),"a new save has only the valley and the quests seen "+J(fresh));

  // ---- screen ----
  await seed(p,{phase:2,settings:{goal:20},gems:120,mine:{made:true,coins:40}},{home:true});
  const ix=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}));
  await ix();
  await E(()=>{Goal.ensure().words=12;
    ["crates","valley","quests","dungeons","mine","adventure","books","jobs","factory"].forEach(id=>{state.home.seen[id]="2026-10-01";});
    Games.add({id:"t1",name:"Test",icon:"🧪",order:15,show:()=>true,open:()=>{window.__t1=(window.__t1||0)+1;}});
    Games.add({id:"t2",name:"Test 2",icon:"🧩",order:16,show:()=>true,badge:()=>"3",open:()=>{window.__t2=(window.__t2||0)+1;}});
    state.home.seen.t1="2026-10-01";
    window.__said=[];const s=Sound.speak;Sound.speak=(t,r)=>{window.__said.push(String(t));return s(t,r);};
    Home.hide();Home.show();});
  await wait(400);
  ok(await E(()=>!!document.querySelector("#ovHome.on")&&Modes.top()==="home"&&document.body.classList.contains("covered")),"Home shows over the valley, which sleeps behind it");
  const bar=await E(()=>({goal:document.getElementById("hGoal").textContent,gems:document.getElementById("hGems").textContent,coins:document.getElementById("hCoins").textContent}));
  ok(/12\s*\/\s*20/.test(bar.goal)&&/120/.test(bar.gems)&&/40/.test(bar.coins),"the bar: the reading ring, gems and coins "+J(bar));
  const tiles=await E(()=>[...document.querySelectorAll("#ovHome .htile")].map(t=>({id:t.dataset.game,w:Math.round(t.getBoundingClientRect().width),b:(t.querySelector(".hbadge")||{}).textContent||""})));
  const listIds=await E(()=>Games.list().map(g=>g.id));
  ok(J(tiles.map(x=>x.id))===J(listIds),"the tiles are the registry's games, in order "+J(listIds));
  ok(tiles.every(x=>x.w>=44),"every tile is at least 44 px");
  const t2=tiles.find(x=>x.id==="t2");
  ok(t2&&/NEW/.test(t2.b)===false&&/3/.test(t2.b)||t2&&/3/.test(t2.b),"a game's badge shows on its tile ("+(t2&&t2.b)+")");
  ok(tiles.find(x=>x.id==="t2")&&await E(()=>/NEW/.test(document.querySelector('#ovHome .htile[data-game="t2"]').textContent)),"a game never opened shows NEW");
  // the buddy's suggestion, in order
  const sug=()=>E(()=>({say:document.getElementById("hSay").textContent,go:(document.getElementById("hGo")||{dataset:{}}).dataset.game||null}));
  let sg=await sug();
  ok(/Want to read 8 more words today\?/.test(sg.say)&&sg.go==="crates","goal not met: \"Want to read 8 more words today?\" and the crates "+J(sg));
  ok(await E(()=>window.__said.filter(x=>/Want to read/.test(x)).length===1),"the suggestion is spoken once when Home shows");
  await E(()=>{Home.render();Home.render();});
  ok(await E(()=>window.__said.filter(x=>/Want to read/.test(x)).length===1),"...and not again on a redraw");
  await E(()=>{Goal.ensure().words=20;Home.render();});sg=await sug();
  ok(/Try the new Test 2!/.test(sg.say)&&sg.go==="t2","goal met, a game never opened: \"Try the new Test 2!\" "+J(sg));
  await E(()=>{state.home.seen.t2="2026-10-01";Games.add({id:"t3",name:"Party",icon:"🎂",order:17,show:()=>true,suggest:()=>({say:"It's Party time!"}),open:()=>{window.__t3=1;}});state.home.seen.t3="2026-10-01";
    Games.list().forEach(g=>{state.home.seen[g.id]=state.home.seen[g.id]||"2026-10-01";});Home.render();});
  sg=await sug();
  ok(/It's Party time!/.test(sg.say)&&sg.go==="t3","a game in season with a suggestion: its line and its button "+J(sg));
  await E(()=>{Games.add({id:"t3",name:"Party",icon:"🎂",order:17,show:()=>false,open:()=>{}});
    Games._all().forEach(g=>{if(g.suggest){g.__sg=g.suggest;g.suggest=null;}});Home.render();});sg=await sug();   // no game in season now (a real holiday may be)
  ok(/What do you want to play\?/.test(sg.say)&&!sg.go,"otherwise: \"What do you want to play?\" and no button "+J(sg));
  await E(()=>{Games._all().forEach(g=>{if(g.__sg){g.suggest=g.__sg;delete g.__sg;}});});
  // the button and the tiles open their game; two quick taps open one game
  await E(()=>{Goal.ensure().words=12;Home.render();});
  await E(()=>{window.__crates=0;if(!Games.get("crates"))Games.add({id:"crates",name:"Read words",icon:"📦",order:10,open:()=>{}});const g=Games.get("crates");if(g){const o=g.open;g.open=()=>{window.__crates++;};window.__cratesOpen=o;}});
  await p.click("#hGo");await wait(200);
  ok(await E(()=>window.__crates===1),"the suggestion's button opens its game");
  await E(()=>{Games.get("crates").open=window.__cratesOpen;});
  await E(()=>{window.__t1=0;window.__t2=0;});await wait(700);   // past the 0.6 s that keeps one tap from opening two games
  await p.click('#ovHome .htile[data-game="t1"]');await p.click('#ovHome .htile[data-game="t2"]');await wait(300);
  ok(await E(()=>window.__t1+window.__t2===1),"two tiles tapped quickly open one game");
  // the fish: drifting, still at rest, still under a game
  const fish=()=>E(()=>[...document.querySelectorAll("#ovHome .hfish")].map(f=>{const a=f.getAnimations()[0];return a?a.playState:"none";}));
  await wait(700);
  ok((await fish()).length>=3&&(await fish()).every(x=>x==="running"),"the fish drift "+J(await fish()));
  await E(()=>{Rest._idleMs=200;});
  for(let i=0;i<20&&!(await E(()=>{Rest.check();return document.body.classList.contains("rest");}));i++)await wait(150);
  ok((await fish()).every(x=>x==="paused"),"...and hold still when the game rests "+J({fish:await fish(),rest:await E(()=>document.body.classList.contains("rest")),stack:await E(()=>Modes.stack())}));
  await E(()=>{Rest._idleMs=45000;Rest.poke();});await wait(200);
  await E(()=>{const d=document.createElement("div");d.className="overlay on";d.id="tOver";document.body.appendChild(d);Modes.open("other",d);});await wait(200);
  ok((await fish()).every(x=>x==="paused"),"...and while a game is open on top of Home");
  await E(()=>Modes.shut(document.getElementById("tOver")));await wait(300);
  ok((await fish()).every(x=>x==="running"),"...and drift again when it closes");
  // portrait
  await p.setViewportSize({width:768,height:1024});await wait(400);
  const fit=await E(()=>{const vw=innerWidth,vh=innerHeight,bad=[];document.querySelectorAll("#ovHome .htile,#hGo").forEach(e=>{const r=e.getBoundingClientRect();
    if(r.right>vw+1||r.left<-1||r.width<44||r.height<44)bad.push((e.dataset.game||e.id)+" "+Math.round(r.left)+"-"+Math.round(r.right));});
    const sc=document.querySelector("#ovHome .htiles");return{bad,scrolls:sc&&sc.scrollHeight>sc.clientHeight+1?"rows scroll":"fits"};});
  ok(!fit.bad.length,"768x1024: every tile and the button fit, 44 px or more "+J(fit));
  await p.setViewportSize({width:1024,height:768});

  // ---- games and navigation ----
  await seed(p,{phase:2,settings:{goal:0}},{home:true});await wait(2600);
  await ix();   // pop-ups that came at boot (a keeper waking): they sit over Home, as they should
  const onHome=()=>E(()=>!!document.querySelector("#ovHome.on"));
  const until=async(f,a,ms)=>{const t0=Date.now();while(Date.now()-t0<(ms||6000)){if(await E(f,a))return true;await wait(100);}return false;};
  ok(await onHome(),"the game opens on Home");
  const ids=await E(()=>[...document.querySelectorAll("#ovHome .htile")].map(x=>x.dataset.game));
  ok(["crates","valley","dungeons","mine","adventure","books","quests"].every(k=>ids.indexOf(k)>=0),"Home has a tile for every game "+J(ids));
  ok(await E(()=>!!document.querySelector("#ovHome #crateBtn")&&!!document.querySelector("#ovHome #mineBtn")&&!!document.querySelector("#ovHome #advBtn")),"the tiles carry the old button ids");
  ok(await E(()=>!document.querySelector("#ovHome.on .htile:not([data-game])")),"every tile is a registered game");
  // each opens its game, and closing it comes back to Home
  const round=async(id,isOpen,shut,name)=>{
    await p.click(`#ovHome .htile[data-game="${id}"]`);
    const opened=await until(isOpen);
    await wait(300);await E(shut);
    const back=await until(()=>!!document.querySelector("#ovHome.on"));
    ok(opened&&back,`${name}: opens from its tile, and closing it comes back to Home`);await wait(700);};
  await round("crates",()=>!!document.querySelector("#ovCrates.on"),()=>Modes.shut(document.getElementById("ovCrates")),"Read words");
  await round("mine",()=>!!document.querySelector("#mineMode.on"),()=>Mine.exit(),"Gem Mine");
  await round("dungeons",()=>!!document.querySelector("#ovDungeons.on"),()=>document.getElementById("dmX").click(),"Dungeons");
  await round("books",()=>Modes.top()==="book",()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}),"Books");
  await round("quests",()=>!!document.querySelector("#ovQuests.on"),()=>Modes.shut(document.getElementById("ovQuests")),"Quests");
  // Adventure plays in the valley: Home steps aside and comes back
  await p.click('#ovHome .htile[data-game="adventure"]');
  ok(await until(()=>Modes.top()==="adventure"&&!document.querySelector("#ovHome.on")),"Adventure: Home steps aside");
  await wait(400);await E(()=>document.getElementById("advDone").click());
  ok(await until(()=>!!document.querySelector("#ovHome.on")),"...and comes back when Adventure ends");
  await wait(700);
  // the valley, and Home from the valley
  await p.click('#ovHome .htile[data-game="valley"]');await wait(500);
  ok(!(await onHome())&&await E(()=>Modes.top()==="valley"),"the Valley tile goes to the valley");
  const dock=await E(()=>[...document.querySelectorAll("#dock > button")].filter(b=>b.offsetParent!==null).map(b=>b.id).sort());
  ok(J(dock)===J(["albumBtn","closetBtn","craftBtn","homeBtn","storeBtn"]),"the valley's tool bar keeps only its own tools and 🏠 "+J(dock));
  await p.click("#albumBtn");await wait(400);await E(()=>Modes.shut(document.getElementById("ovAlbum")));await wait(800);
  ok(!(await onHome()),"in the valley, closing the sticker book stays in the valley");
  await E(()=>Factory.open());await wait(500);await E(()=>Factory.close());await wait(800);
  ok(!(await onHome()),"the Factory opened from the valley comes back to the valley");
  await p.click("#homeBtn");
  ok(await until(()=>!!document.querySelector("#ovHome.on")),"🏠 in the valley goes Home");
  await wait(700);
  // a pop-up over Home closes back to Home
  await E(()=>{try{showRecap();}catch(e){window.__noRecap=String(e);}});await wait(500);
  const rc=await E(()=>{const o=[...document.querySelectorAll(".overlay.on")].find(x=>x.id!=="ovHome");if(o)Modes.shut(o);return!!o;});
  ok(rc&&await until(()=>!!document.querySelector("#ovHome.on")),"a pop-up that opens over Home closes back to Home");
  // a brand-new save's tour: the crate on Home, then the valley, then the plans in the valley
  await seed(p,{},{base:null,home:true});await wait(1500);
  ok(await E(()=>!!document.querySelector("#ovHome.on #crateBtn.coach-target")),"a new save's tour starts by pointing at the crate tile on Home");
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);});state.tour=2;Coach.show();});await wait(400);
  ok(await E(()=>!!document.querySelector('#ovHome.on [data-game="valley"].coach-target')),"after the first word the tour points at the Valley tile");
  await p.click('#ovHome .htile[data-game="valley"]');await wait(700);
  ok(await E(()=>state.tour===3&&!!document.querySelector("#craftBtn.coach-target")),"tapping it moves the tour on to the plans, in the valley");
  ok(await E(()=>TOUR.length===7),"the tour has its one new step");

  // ---- review fixes (all under the real start: the game opens on Home) ----
  await seed(p,{phase:2,settings:{goal:0},trick:{nights:2,day:"2026-10-18"},lights:{day:"2025-12-10"}},{home:true});await wait(2600);await ix();
  const fx=s=>E(s);
  // 1. any way into Adventure while Home is up (Trick-or-Read, the egg hunt) puts Home away; a second enter does not mount twice
  await fx(()=>{Home.home();});await wait(300);
  const a1=await fx(()=>{Adv.enter();Adv.enter();return{home:Home.isOn(),top:Modes.top(),advs:Modes.stack().filter(m=>m==="adventure").length};});
  ok(!a1.home&&a1.top==="adventure"&&a1.advs===1,"Adventure entered from anywhere while Home is up puts Home away, once "+J(a1));
  await fx(()=>document.getElementById("advDone").click());
  ok(await until(()=>Home.isOn()),"...and Done exploring comes back to Home");await wait(700);
  // 2. what waits for "nothing open" (the buddy's evolution, the play timer's recap) does not wait for Home
  await fx(()=>{window.__wc=0;whenClear(()=>{window.__wc=1;});});await wait(300);
  ok(await fx(()=>window.__wc===1&&Home.isOn()),"whenClear runs while only Home is up (the buddy's evolution plays on Home)");
  ok(await fx(()=>typeof anyOpen==="function"&&anyOpen()===false&&Home.isOn()),"anyOpen() is false with only Home up");
  // 3. every tile looks the same: the old tool bar look does not leak in, and nothing on Home moves but the sea
  const look=await fx(()=>{const t=[...document.querySelectorAll("#ovHome .htile")].map(x=>({id:x.dataset.game,h:Math.round(x.getBoundingClientRect().height),c:getComputedStyle(x).color}));
    const moving=document.getElementById("ovHome").getAnimations({subtree:true}).filter(a=>a.playState==="running"&&!(a.effect&&a.effect.target&&a.effect.target.closest(".hfish")));
    return{hs:[...new Set(t.map(x=>x.h))],colors:[...new Set(t.map(x=>x.c))],moving:moving.length,crateArt:!!document.querySelector("#ovHome #crateBtn #crateIcon:not([hidden])")};});
  ok(look.hs.length===1&&look.colors.length===1,"every tile has the same size and text colour "+J(look));
  ok(look.moving===0,"nothing on Home moves but the fish ("+look.moving+" other animations)");
  ok(!look.crateArt,"the crate tile shows one picture, not the old crate drawing too");
  // 4. games he played before Home (a holiday) are not NEW; a game opened another way stops being NEW
  ok(await fx(()=>!Games.isNew("trick")&&!Games.isNew("lights")),"a holiday he has played before is not NEW");
  await fx(()=>{delete state.home.seen.dungeons;Home.valley();});await wait(300);
  await fx(()=>{Dungeon.open();});await wait(300);await ix();await wait(200);
  ok(await fx(()=>!Games.isNew("dungeons")),"opening the dungeons another way (the cave door) marks them seen");
  // 5. Home is redrawn when a game closes; a redraw keeps the tour's mark and does not pile up tiles
  await fx(()=>{Home.home();Games.list().forEach(g=>{state.home.seen[g.id]=today();});delete state.home.seen.books;state.settings.goal=0;Home.render();});await wait(300);
  const say=await fx(()=>document.getElementById("hSay").textContent);
  ok(/Try the new Books/.test(say),"a game never opened is suggested "+J(say));
  await p.click('#ovHome .htile[data-game="books"]');await wait(500);await ix();
  ok(await until(()=>Home.isOn()&&!/Try the new Books/.test(document.getElementById("hSay").textContent)&&!document.querySelector('#ovHome .htile[data-game="books"] .hnew')),
    "closing it, Home is redrawn: no more NEW or \"Try the new Books!\"");
  const keep=await fx(()=>{const v=document.querySelector('#ovHome .htile[data-game="valley"]');v.__mark=1;document.getElementById("crateBtn").classList.add("coach-target");
    for(let i=0;i<6;i++){renderHUD();Home.render();}return new Promise(r=>setTimeout(()=>r({same:document.querySelector('#ovHome .htile[data-game="valley"]').__mark===1,
      coach:document.getElementById("crateBtn").classList.contains("coach-target"),park:(document.getElementById("homePark")||{children:[]}).children.length,
      tiles:document.querySelectorAll("#ovHome .htile").length}),100));});
  ok(keep.same&&keep.coach,"a redraw keeps the same tiles and the tour's mark "+J(keep));
  ok(keep.park<=10,"redraws do not pile up hidden tiles "+J(keep));
  await fx(()=>document.getElementById("crateBtn").classList.remove("coach-target"));
  // 6. the tour: off on the valley, it points at 🏠; restarting it goes Home; in portrait the bubble does not cover its tile
  await fx(()=>{state.tour=0;Home.valley();Coach.show();});await wait(300);
  ok(await fx(()=>document.getElementById("homeBtn").classList.contains("coach-target")),"a tour step whose tile is on Home points at 🏠 when he is in the valley");
  await fx(()=>Coach.restart());await wait(500);
  ok(await fx(()=>Home.isOn()&&document.getElementById("crateBtn").classList.contains("coach-target")),"restarting the tour goes Home and points at the crate tile");
  await p.setViewportSize({width:768,height:1024});await wait(400);
  const ov=await fx(()=>{state.tour=2;Coach.show();const c=document.getElementById("coach").getBoundingClientRect();
    return["crateBtn"].concat([...document.querySelectorAll('#ovHome .htile[data-game="valley"]')].map(()=>"valley")).map(id=>{
      const t=(id==="valley"?document.querySelector('#ovHome .htile[data-game="valley"]'):document.getElementById(id)).getBoundingClientRect();
      return!(c.right<t.left||c.left>t.right||c.bottom<t.top||c.top>t.bottom);});});
  ok(ov.every(x=>!x),"in portrait the tour's bubble does not cover the crate or Valley tile "+J(ov));
  await fx(()=>Coach.skip());await p.setViewportSize({width:1024,height:768});await wait(300);

  // ---- voice: every line Home says has a clip ----
  const index=JSON.parse(require("fs").readFileSync(require("path").join(__dirname,"../app/voice/index.json"),"utf8"));
  let hl=[];try{hl=await E(()=>Home.voiceLines());}catch(e){}
  const noClip=[];for(const l of hl){const k=await E(t=>VoicePack.norm(t),l);if(!index[k])noClip.push(l);}
  ok(hl.length>5&&!noClip.length,`every line Home says has a voice clip (${hl.length} lines`+(noClip.length?`; none yet for: ${noClip.slice(0,10).join(" | ")}`:"")+")");

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
