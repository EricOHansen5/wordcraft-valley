// Home: the small fixes from its review. One voice at a time at boot (Home's line, the tour, the season's greeting),
// the finale and the party hat on Home, the keeper and the first car waiting for the valley, "🏠 Home" on the way back,
// NEW once on a tile, a game's own line on Home, one sound for a tap, and a save from the old six-step tour.
// A 1024x768 touch iPad that starts on Home. The device voice is faked (each line takes 45 ms a letter) so what was said
// when, and what was cut off, can be read back from window.__talk.
"use strict";
const {launch,check,waitFor,seed}=require("./lib");
// the fake device voice: every line said, when it started and ended, and whether another line cut it off
function fakeVoice(){
  window.__talk=[];const ss=window.speechSynthesis;if(!ss)return;
  ss.speak=function(u){const e={text:String(u.text),t:Math.round(performance.now()),end:0,u};window.__talk.push(e);
    setTimeout(()=>{if(!e.end){e.end=Math.round(performance.now());try{u.onend&&u.onend();}catch(x){}}},Math.max(400,e.text.length*45));};
  ss.cancel=function(){const now=Math.round(performance.now());window.__talk.forEach(e=>{if(!e.end){e.end=now;e.cut=true;try{e.u.onerror&&e.u.onerror();}catch(x){}}});};
}
(async()=>{
  const t=check("home minors"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},home:true,init:fakeVoice,
    seed:{phase:2,settings:{goal:0},seasonSeen:"autumn"}});
  const wait=ms=>p.waitForTimeout(ms);
  const talk=()=>E(()=>window.__talk.map(e=>({text:e.text,t:e.t,end:e.end,cut:!!e.cut})));
  const ix=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}));

  // ---- 1. boot says one thing at a time ----
  // a brand-new save: the tour speaks; Home keeps its line to itself
  await seed(p,{},{base:null,home:true,settle:0});await wait(4500);
  let tk=await talk();
  ok(tk.some(x=>/^Hi! I'm Sprout/.test(x.text)),"a new save: the tour says its first line "+J(tk.map(x=>x.text)));
  ok(!tk.some(x=>x.cut),"...and nothing is cut off "+J(tk));
  ok(!tk.some(x=>/Want to read|What do you want to play|Try the new|Let's/.test(x.text)),"...Home does not talk over the tour "+J(tk.map(x=>x.text)));
  // a new season: Home's line, then the season's greeting, one after the other
  await seed(p,{phase:2,settings:{goal:12},seasonSeen:"spring",wordsRead:5},{home:true,settle:0});await wait(6500);
  tk=await talk();
  const hl=tk.find(x=>/Want to read/.test(x.text)),gr=tk.find(x=>/^It's Harvest Days/.test(x.text));
  ok(hl&&gr,"a new season on Home: Home's line and the season's greeting are both said "+J(tk.map(x=>x.text)));
  ok(hl&&gr&&!tk.some(x=>x.cut)&&gr.t>=hl.end,"...one after the other, nothing cut off "+J(tk));

  // ---- 3. the keeper (and the first car) wait until he is in the valley ----
  await seed(p,{phase:2,settings:{goal:0},guardians:[0],biome:2,vehStarter:false,vehicles:[]},{home:true,settle:0});await wait(4500);
  const k0=await E(()=>({scene:!!document.querySelector("#ovScene.on"),g:state.guardians.slice(),car:state.vehStarter,home:Home.isOn()}));
  ok(k0.home&&!k0.scene&&J(k0.g)===J([0]),"on Home the land's keeper does not wake behind it "+J(k0));
  ok(!k0.car,"...nor does the first car drive in "+J(k0));
  await E(()=>Home.valley());
  ok(await waitFor(p,()=>!!document.querySelector("#ovScene.on")&&state.guardians.indexOf(1)>=0,{timeout:4000}),"in the valley the keeper wakes");
  await E(()=>{while(sceneQ)sceneStep();});
  ok(await waitFor(p,()=>state.vehStarter===true,{timeout:12000}),"...and the first car drives in");
  await wait(300);await ix();

  // ---- 2. the finale and the party hat on Home ----
  await seed(p,{phase:2,settings:{goal:0},guardians:[0,1,2]},{home:true,settle:1500});await ix();
  await E(()=>{window.__toasts=[];if(!window.__toast0)window.__toast0=window.toast;window.toast=function(m){window.__toasts.push(String(m));return window.__toast0.apply(this,arguments);};
    window.__said=[];const s=Sound.speak;Sound.speak=(x,r)=>{window.__said.push(String(x));return s(x,r);};});
  await E(()=>{Fireworks._setToday("2026-07-03");Games.open("crates");});await wait(300);
  await E(()=>Quests.hit("read",10));await wait(1500);
  ok(await E(()=>Fireworks._waiting()&&!state.july.finale),"ten reads in the crates: the finale waits while he reads");
  await E(()=>Modes.shut(document.getElementById("ovCrates")));
  ok(await waitFor(p,()=>Home.isOn(),{timeout:3000}),"closing the crates comes back to Home");
  ok(await waitFor(p,()=>window.__toasts.some(x=>/Grand finale/.test(x)),{timeout:8000}),"on Home the finale cheers (it does not wait for the valley) "+J(await E(()=>window.__toasts)));
  ok(await E(()=>window.__said.indexOf("Grand finale! Ten fireworks!")>=0),"...and says so");
  await E(()=>Fireworks._setToday(null));
  await E(()=>{window.__said=[];state.hats=(state.hats||[]).filter(h=>h!=="party");state.settings.birthday="03-14";Party._setToday("2027-03-12");});
  ok(await waitFor(p,()=>window.__said.indexOf("A party hat for your birthday!")>=0,{timeout:8000}),"on Home the party hat is said out loud "+J(await E(()=>window.__said)));
  await E(()=>{Party._setToday(null);state.settings.birthday="";});

  // ---- 4. the way back says where it goes ----
  await E(()=>{Home.home();});await wait(200);
  const back=sel=>E(s=>{const b=document.querySelector(s);return b?b.textContent.trim():null;},sel);
  ok(/Home/.test(await back("#ovQuests [data-close]"))&&!/valley/i.test(await back("#ovQuests [data-close]")),"from Home, the quests' button says Home "+J(await back("#ovQuests [data-close]")));
  ok(/Home/.test(await back("#ovCrates [data-close]")),"...and the crates' "+J(await back("#ovCrates [data-close]")));
  ok(/Home/.test(await back("#ovRecap [data-close]"))&&/Home/.test(await back("#ovParent .sheetfoot [data-close]")),"...the recap's and the Grown-up menu's");
  await E(()=>Home.valley());await wait(200);
  ok(/valley/i.test(await back("#ovQuests [data-close]"))&&/valley/i.test(await back("#ovParent .sheetfoot [data-close]")),"in the valley they go back to the valley "+J(await back("#ovQuests [data-close]")));
  await E(()=>Home.home());await wait(300);

  // ---- 5. NEW shows once on a tile ----
  await E(()=>{delete state.home.seen.dungeons;state.dungeon.seen=false;Home.render();const b=document.getElementById("dungeonBadge");if(b){b.textContent="NEW";b.classList.add("on");}});await wait(100);
  const news=()=>E(()=>{const el=document.querySelector('#ovHome .htile[data-game="dungeons"]');
    return[...el.querySelectorAll("*")].filter(e=>!e.children.length&&e.textContent.trim()==="NEW"&&e.getClientRects().length>0).length;});
  ok(await news()===1,"a never-opened game with its own NEW badge shows NEW once ("+await news()+")");
  await E(()=>{Home.render();});
  ok(await news()===1,"...after a redraw too");

  // ---- 6. a game's own line on Home ----
  await E(()=>{Games.list().forEach(g=>{state.home.seen[g.id]=today();});delete state.home.seen.books;state.settings.goal=0;Home.render();});
  const say=()=>E(()=>document.getElementById("hSay").textContent);
  ok(!/Try the new/.test(await say())&&/book/i.test(await say()),"a new game says its own line "+J(await say()));
  const vl=await E(()=>Home.voiceLines());
  ok(vl.indexOf(await say())>=0&&vl.indexOf("Try the new Books!")<0,"...which is in Home's voice lines instead of \"Try the new Books!\"");
  await E(()=>{Games.add({id:"t9",name:"Test 9",icon:"🧪",order:15,show:()=>true,open:()=>{}});Home.render();});
  ok(/^Try the new Test 9!$/.test(await say()),"a game without a line of its own: \"Try the new Test 9!\" "+J(await say()));
  await E(()=>{Games.add({id:"t9",name:"Test 9",icon:"🧪",order:15,show:()=>false,open:()=>{}});state.home.seen.books=today();Home.render();});

  // ---- 7. one sound for a tap ----
  await wait(700);
  await E(()=>{window.__pops=0;const f=Sound.sfx.pop;window.__pop0=f;Sound.sfx.pop=function(){window.__pops++;return f.apply(this,arguments);};});
  await p.click('#ovHome .htile[data-game="books"]');await wait(400);
  ok(await E(()=>window.__pops)===1,"tapping a tile whose game makes its own sound pops once ("+await E(()=>window.__pops)+")");
  await ix();await waitFor(p,()=>Home.isOn(),{timeout:3000});await wait(700);
  await E(()=>{window.__pops=0;Games.add({id:"t8",name:"Test 8",icon:"🧪",order:15,show:()=>true,open:()=>{}});Home.render();});
  await p.click('#ovHome .htile[data-game="t8"]');await wait(300);
  ok(await E(()=>window.__pops)===1,"...and a game that makes none still gets Home's pop ("+await E(()=>window.__pops)+")");
  await E(()=>{Sound.sfx.pop=window.__pop0;Games.add({id:"t8",name:"Test 8",icon:"🧪",order:15,show:()=>false,open:()=>{}});});

  // ---- 8. a save from the old six-step tour ----
  const tourAfter=async(st,base)=>{await seed(p,st,{home:true,settle:0,base});return E(()=>({tour:state.tour,steps:state.home&&state.home.steps}));};
  let r=await tourAfter({tour:3,home:undefined});
  ok(r.tour===4,"an old save at the old step 3 (Build it) moves on to the new step 4 "+J(r));
  r=await tourAfter({tour:2,home:{seen:{valley:"2026-10-19",quests:"2026-10-19"},filled:2}});
  ok(r.tour===3,"...also when Home has already filled it in (old step 2, the plans, is now 3) "+J(r));
  ok(await E(()=>{const s=JSON.parse(JSON.stringify(state));loadSave(s);return state.tour;})===3,"...once: loading it again leaves it there");
  r=await tourAfter({tour:1,home:undefined});
  ok(r.tour===1,"the first two steps did not move "+J(r));
  r=await tourAfter({tour:6,home:undefined});
  ok(r.tour===7,"a finished old tour stays finished "+J(r));
  r=await tourAfter({tour:3,home:{seen:{},filled:2,steps:7}},undefined);
  ok(r.tour===3,"a save on the new tour is left where it is "+J(r));
  // a brand-new save made by Start over, part-way through the new tour, keeps its step
  await E(()=>{state=def();state.tour=3;return DB.set("kv","state",JSON.parse(JSON.stringify(state)));});
  await p.reload();await waitFor(p,()=>/^Version/.test((document.getElementById("appVer")||{}).textContent||""),{timeout:15000});
  ok(await E(()=>state.tour)===3,"a new save part-way through the tour keeps its step "+J(await E(()=>state.tour)));

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
