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

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
