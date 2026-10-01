// Bug hunt, core shard, part 2 of 3: the valley itself at the iPad size (1024x768, touch), with the harness from
// hunt_core_e2e.js. Every animal, vehicle, building, keeper and the buddy is tapped; the keepers' books page by page.
"use strict";
const {launch,seed,reload,waitFor,check}=require("./lib");
const {INIT,harness,VIEW}=require("./hunt_core_e2e");

(async()=>{
  const T=check("hunt_core_valley"),J=JSON.stringify;
  // the keepers of the three open lands are awake (no cut-scene), the badges he has are given (no pop-ups during the taps)
  const START={guardians:[0,1,2],biome:2,rows:6,gems:40,settings:{goal:12},badges:["first","ten","fifty","builder","explorer","wheels"],
    critters:[{id:"fox",c:4,r:8,seed:5,lv:1,out:true,since:1}]};
  const pg=await launch({viewport:VIEW,seed:START,init:INIT});
  const {page:p,errs,close,E}=pg;
  p.on("crash",()=>T.fail("the page crashed"));
  const Hn=harness(pg,T),{crawl,tap,dbl,openClose,home,arm,wait}=Hn;
  await arm();

  // ================= the keepers and their books =================
  {
    // bring a keeper into view and tap it: its book opens at page 1
    const keeper=async b=>{await home();await E(b=>{const g=GUARDIANS[b],gm=geom(g.c,ROWS_MAX-2);cam=Math.max(0,Math.min(camMax(),gm.x-viewW()/2));applyCamera();
      [...document.querySelectorAll(".guardian")].forEach((el,i)=>{el.dataset.kb=state.guardians[i];});},b);
      return tap(`.guardian[data-kb="${b}"] .hitpad`,"keeper "+b,{valley:true});};
    const r=await keeper(0);
    T.ok(await E(()=>Modes.top()==="book"&&/Tilly/.test(document.getElementById("bookTitle").textContent)),"a tap on Tilly opens her book: "+(r.d||[]).join("; "));
    await E(()=>{state.books[0]={page:0,read:[],done:false};renderPage();});
    // a double tap on "I read it ›" turns one page and pays one gem (it used to turn two and pay for the one he never saw)
    const g0=await E(()=>state.gems);
    await dbl("#pageNext");await wait(700);
    const b1=await E(()=>state.books[0]);
    T.ok(b1.page===1&&J(b1.read)==="[0]"&&await E(g=>state.gems-g,g0)===1,"keeper book: a double tap on I read it turns one page and pays 1 gem "+J(b1)+" +"+await E(g=>state.gems-g,g0));
    // the last page: The end pays 10 once, and a double tap doesn't turn past page 1 again
    await E(()=>{state.books[0]={page:3,read:[0,1,2],done:false};renderPage();});
    const g1=await E(()=>state.gems);
    await dbl("#pageNext");await wait(700);
    const b2=await E(()=>state.books[0]);
    T.ok(b2.done&&b2.page===0&&await E(g=>state.gems-g,g1)===11,"keeper book: a double tap on The end pays 1 + 10 once and goes back to page 1 "+J(b2)+" +"+await E(g=>state.gems-g,g1));
    await home();
  }

  // ================= the sticker book's wardrobe =================
  {
    await E(()=>{state.hats=["flower","cap"];state.hat=null;});
    // the sheet's own .3s "pop" entrance animation moves its contents (the tab bar included) for
    // that long, so a tap right after opening can land where a tab used to be before it settles
    const openHats=async()=>{await home();await tap("#albumBtn","sticker book");await wait(350);await tap('[data-atab="hats"]',"the Wardrobe tab");};
    await openHats();
    // a double tap on "Wear it" puts the cap on (the second tap used to land on "Take off", drawn in its place)
    await dbl('#albumGrid .hatcard[data-id="cap"] .btn');await wait(400);
    T.ok(await E(()=>state.hat)==="cap","wardrobe: a double tap on Wear it leaves the cap on: "+await E(()=>state.hat));
    await wait(700);
    await dbl('#albumGrid .hatcard[data-id="cap"] .btn');await wait(400);
    T.ok(await E(()=>state.hat)===null,"wardrobe: a double tap on Take off leaves it off: "+await E(()=>state.hat));
    await wait(700);
    await tap('#albumGrid .hatcard[data-id="flower"] .btn',"Wear it");
    T.ok(await E(()=>state.hat==="flower"&&!!document.querySelector('#buddyBtn [data-hat="flower"],#buddyBtn svg')),"wardrobe: one tap on Wear it puts the flower on (HUD redrawn)");
    await home();
  }

  Hn.report();
  T.ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
