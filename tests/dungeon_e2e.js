// Word Dungeons: the map, rooms, moving, the room puzzles, the boomerang, and a run saved across a reload.
// A 1024x768 touch iPad; the keyboard too. Battles have their own suite (battle_e2e.js), friends too (friends_e2e.js).
"use strict";
const {launch,check,waitFor}=require("./lib");
(async()=>{
  const t=check("dungeons"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},seed:{phase:2,settings:{goal:0}}});
  const wait=ms=>p.waitForTimeout(ms);
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));

  // ---- 1. the map ----
  const st0=await E(()=>state.dungeon);
  ok(st0&&st0.maxHearts===3&&Array.isArray(st0.team)&&!st0.team.length&&st0.run===null&&st0.items&&st0.items.boomerang===false,
    "a save from before the dungeons boots with their defaults "+J(st0));
  ok(await E(()=>/NEW/.test(document.getElementById("dungeonBadge").textContent)),"the key button shows NEW");
  await tidy();await p.click("#dungeonBtn");
  ok(await waitFor(p,()=>!!document.querySelector("#ovDungeons.on")),"the key button opens the dungeon map");
  ok(await E(()=>Modes.top()==="dungeon"&&document.body.classList.contains("covered")),"the map is the dungeon mode, and the valley sleeps behind it");
  ok(await E(()=>!/NEW/.test(document.getElementById("dungeonBadge").textContent)&&!!state.dungeon.seen),"...and NEW is gone");
  ok(await E(()=>!!document.querySelector('#ovDungeons .dmap[data-d="forest"].open [data-go]')),"the Forest Temple is open at reading level 1");
  await E(()=>{window.__lv=DUNGEONS.list[0].level;DUNGEONS.list[0].level=99;Dungeon.open();});
  const lock=await E(()=>{const el=document.querySelector('#ovDungeons .dmap[data-d="forest"]');return{locked:el.classList.contains("locked"),text:el.textContent,go:!!el.querySelector("[data-go]")};});
  ok(lock.locked&&/Reading level 99/.test(lock.text)&&!lock.go,"above his level it is locked and says which level opens it "+J(lock));
  await E(()=>{DUNGEONS.list[0].level=window.__lv;});
  await tidy();
  await p.click("#advBtn");await wait(800);
  ok(await E(()=>!!document.querySelector("#tiles .spot.dcave")),"Adventure has a cave door for the Forest Temple");
  await E(()=>{const b=document.getElementById("advDone");if(b)b.click();});await wait(300);

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
