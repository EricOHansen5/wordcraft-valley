// Home: the under-the-sea start screen, the Games registry every game adds itself to, and getting back to Home.
// A 1024x768 touch iPad (and 768x1024 where it says).
"use strict";
const {launch,check,waitFor,seed}=require("./lib");
(async()=>{
  const t=check("home"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},
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
  await seed(p,{},{base:null});
  const fresh=await E(()=>Object.keys(state.home.seen).filter(k=>k.indexOf("t")!==0||k==="t").sort());
  ok(J(fresh)===J(["quests","valley"]),"a new save has only the valley and the quests seen "+J(fresh));

  // ---- screen ----
  await seed(p,{phase:2,settings:{goal:20},gems:120,mine:{made:true,coins:40}});
  const ix=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}));
  await ix();
  await E(()=>{Goal.ensure().words=12;
    ["crates","valley","quests","dungeons","mine","adventure","books","jobs","factory"].forEach(id=>{state.home.seen[id]="2026-10-01";});
    Games.add({id:"t1",name:"Test",icon:"🧪",order:15,show:()=>true,open:()=>{window.__t1=(window.__t1||0)+1;}});
    Games.add({id:"t2",name:"Test 2",icon:"🧩",order:16,show:()=>true,badge:()=>"3",open:()=>{window.__t2=(window.__t2||0)+1;}});
    state.home.seen.t1="2026-10-01";
    window.__said=[];const s=Sound.speak;Sound.speak=(t,r)=>{window.__said.push(String(t));return s(t,r);};
    Home.show();});
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
  await E(()=>{Games.add({id:"t3",name:"Party",icon:"🎂",order:17,show:()=>false,open:()=>{}});Home.render();});sg=await sug();
  ok(/What do you want to play\?/.test(sg.say)&&!sg.go,"otherwise: \"What do you want to play?\" and no button "+J(sg));
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

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
