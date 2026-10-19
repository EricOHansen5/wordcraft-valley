// Word Dungeons: the map, rooms, moving, the room puzzles, the boomerang, and a run saved across a reload.
// A 1024x768 touch iPad; the keyboard too. Battles have their own suite (battle_e2e.js), friends too (friends_e2e.js).
"use strict";
const {launch,check,waitFor,tile}=require("./lib");
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
  await tidy();await tile(p,"#dungeonBtn");
  ok(await waitFor(p,()=>!!document.querySelector("#ovDungeons.on")),"the key button opens the dungeon map");
  ok(await E(()=>Modes.top()==="dungeon"&&document.body.classList.contains("covered")),"the map is the dungeon mode, and the valley sleeps behind it");
  ok(await E(()=>!/NEW/.test(document.getElementById("dungeonBadge").textContent)&&!!state.dungeon.seen),"...and NEW is gone");
  ok(await E(()=>!!document.querySelector('#ovDungeons .dmap[data-d="forest"].open [data-go]')),"the Forest Temple is open at reading level 1");
  await E(()=>{window.__lv=DUNGEONS.list[0].level;DUNGEONS.list[0].level=99;Dungeon.open();});
  const lock=await E(()=>{const el=document.querySelector('#ovDungeons .dmap[data-d="forest"]');return{locked:el.classList.contains("locked"),text:el.textContent,go:!!el.querySelector("[data-go]")};});
  ok(lock.locked&&/Reading level 99/.test(lock.text)&&!lock.go,"above his level it is locked and says which level opens it "+J(lock));
  await E(()=>{DUNGEONS.list[0].level=window.__lv;});
  await tidy();
  await tile(p,"#advBtn");await wait(800);
  ok(await E(()=>!!document.querySelector("#tiles .spot.dcave")),"Adventure has a cave door for the Forest Temple");
  await E(()=>{const b=document.getElementById("advDone");if(b)b.click();});await wait(300);

  // ---- 2. rooms ----
  const run=()=>E(()=>{const r=Dungeon._run();return r&&{room:r.room,pos:r.pos,halves:r.halves,keys:r.keys,boss:r.bossKey,map:r.map,opened:r.opened,taken:r.taken};});
  const ash=()=>E(()=>{const a=document.getElementById("dAsh");return[+a.dataset.c,+a.dataset.r];});
  const tile=(c,r)=>E(([c,r])=>{const t=document.querySelector(`#ovDungeon .dt[data-c="${c}"][data-r="${r}"]`);return t&&{t:t.dataset.t,shut:t.dataset.shut==="1",open:t.dataset.open==="1"};},[c,r]);
  const key=async(k,n)=>{for(let i=0;i<(n||1);i++){await p.keyboard.press(k);await wait(230);}};
  await E(()=>{state.dungeon.team=["dog"];save();});
  await E(()=>Dungeon.enter("forest"));await wait(300);
  let R=await run();
  ok(await E(()=>!!document.querySelector("#ovDungeon.on"))&&R&&R.room==="f0"&&J(await ash())===J([6,6]),"entering: the first room, Ash on the entrance "+J(R));
  ok(await E(()=>document.getElementById("dHearts").dataset.halves==="6"),"three full hearts (6 halves)");
  await key("ArrowUp",6);R=await run();
  ok(R.room==="f1"&&J(await ash())===J([6,7]),"the arrow keys walk Ash through the north door into the next room "+J({room:R.room,ash:await ash()}));
  await E(()=>Dungeon._go("f1",1,2,"w"));
  ok(await E(()=>Dungeon.step(-1,0))===false&&J(await ash())===J([1,2]),"a wall stops a step");
  // tap a tile: the path goes round the block, it doesn't push it
  await E(()=>Dungeon._go("f2",4,4,"e"));
  await p.click('#ovDungeon .dt[data-c="6"][data-r="4"]');await wait(1600);
  ok(J(await ash())===J([6,4])&&(await tile(5,4)).t==="O","tapping a floor tile walks there by a path round the block "+J(await ash()));
  // a pot
  await E(()=>{Dungeon._run().halves=3;Dungeon._go("f0",9,3,"n");window.__rnd=Math.random;Math.random=()=>0;});
  await E(()=>Dungeon.act());await wait(200);await E(()=>{Math.random=window.__rnd;});
  R=await run();ok(R.halves===5&&(await tile(9,2)).t===".","a pot breaks and gives a heart (+2 halves) "+J(R.halves));
  // block and plate: the shut door opens and stays open
  await E(()=>Dungeon._go("f2",4,4,"e"));
  ok((await tile(6,0)).shut,"in the plate room the other door is shut");
  ok(await E(()=>{Dungeon._go("f5",6,3,"e");return document.querySelectorAll("#ovDungeon .dt.door").length;})===2,"a room shows only the doors it has (f5: two)");
  await E(()=>Dungeon._go("f2",4,4,"e"));
  await key("ArrowRight",3);
  ok((await tile(8,4)).t==="O"&&!(await tile(6,0)).shut,"pushing the block onto the plate opens the shut door");
  await E(()=>Dungeon._go("f2",6,1,"n"));await key("ArrowUp",1);R=await run();
  ok(R.room==="f5","...through it to the next room");
  await key("ArrowDown",1);R=await run();
  ok(R.room==="f2"&&!(await tile(6,0)).shut&&(await tile(8,4)).t==="O","coming back, the door is still open and the block still on the plate");
  // keys: the chest, then the locked door
  await E(()=>Dungeon._go("f2",10,3,"n"));await E(()=>Dungeon.act());await wait(200);
  ok(await E(()=>document.getElementById("dKeys").dataset.n==="1"),"the chest gives a small key");
  await E(()=>Dungeon._go("f1",6,1,"n"));await key("ArrowUp",1);
  ok(await E(()=>document.getElementById("dKeys").dataset.n==="0")&&(await tile(6,0)).t==="D","the locked door takes the key and opens");
  await key("ArrowUp",1);R=await run();ok(R.room==="f3","...and leads on");
  // the sign, and the pot it points at
  await E(()=>Dungeon._go("f3",3,3,"n"));await E(()=>Dungeon.act());await wait(200);
  ok(await E(()=>/Bop the top pot/.test(document.getElementById("dSay").textContent)),"the sign shows its words");
  await E(()=>Dungeon._go("f3",8,3,"n"));await E(()=>Dungeon.act());await wait(200);
  ok(await E(()=>document.getElementById("dKeys").dataset.n==="1"),"the top pot holds a key");
  // the word door: reading opens it; a wrong tap costs nothing
  const h0=(await run()).halves;
  await E(()=>Dungeon._go("f3",1,4,"w"));await E(()=>Dungeon.act());
  ok(await waitFor(p,()=>!!document.querySelector("#ovDword.on .dq[data-ans]")),"the word door asks for a word");
  ok(await E(()=>Modes.top()==="battle"),"...as reading time");
  await E(()=>{const h=document.querySelector("#ovDword .dq"),a=h.dataset.ans,w=[...h.querySelectorAll("[data-w]")].find(b=>b.dataset.w!==a);if(w)w.click();});await wait(700);
  ok((await run()).halves===h0,"a wrong tap at a word door costs no hearts");
  await E(()=>window.__answer("#ovDword .dq"));await wait(1400);
  ok((await tile(0,4)).t==="D"&&await E(()=>!document.querySelector("#ovDword.on")),"a right answer opens the word door");
  // the fairy, and the map
  const visited=()=>E(()=>document.querySelectorAll("#dMini .mm").length);
  const before=await visited();
  ok(before>0&&before<8&&await E(()=>!document.querySelector("#dMini .mskull")),"before the map, the mini-map shows only rooms he has been in ("+before+")");
  await E(()=>{Dungeon._run().halves=2;Dungeon._go("f6",4,5,"n");});await key("ArrowUp",1);
  ok((await run()).halves===6,"the fairy fills his hearts");
  await E(()=>Dungeon._go("f6",2,3,"n"));await E(()=>Dungeon.act());await wait(200);
  ok((await visited())===8&&await E(()=>!!document.querySelector("#dMini .mskull")),"the map chest shows every room and the boss room's skull");
  // ---- 3. the boomerang ----
  await E(()=>Dungeon._go("f5",3,6,"w"));
  ok((await tile(1,6)).t==="R"&&await E(()=>!Dungeon._walkable(1,6)&&!Dungeon._walkable(2,7)),"the boss key chest sits behind a red barrier");
  ok(await E(()=>Dungeon.useItem())===false,"no boomerang yet: the item button does nothing");
  ok(await E(()=>document.getElementById("dItem").style.display==="none"),"...and is hidden");
  await E(()=>Dungeon._go("f4",3,2,"w"));await E(()=>Dungeon.act());await wait(200);
  ok(await E(()=>state.dungeon.items.boomerang===true&&document.getElementById("dItem").style.display!=="none"),"the chest in the item room gives the boomerang, and the item button shows");
  await E(()=>Dungeon._go("f4",1,1,"w"));
  ok((await E(()=>Dungeon.useItem())).dist===0,"thrown at a wall right beside him, the boomerang goes nowhere");
  await wait(500);   // the boomerang thrown at the wall is back
  await E(()=>Dungeon._go("f5",6,2,"e"));const two=await E(()=>{const a=Dungeon.useItem(),b=Dungeon.useItem();return{a,b};});await wait(1300);const th=two.a;
  ok(two.b===false,"a second throw while the boomerang is out does nothing (a double tap flips the switch once)");
  ok(th.hit==="switch"&&(await tile(1,6)).t==="."&&await E(()=>Dungeon._walkable(2,7)),"across the pit, the boomerang hits the switch and the barrier drops "+J(th));
  await E(()=>Dungeon._go("f5",6,3,"s"));const st=await E(()=>Dungeon.useItem());await wait(600);
  ok(st.hit==="monster"&&await E(()=>Dungeon._V().mons[0].stunned&&!!document.querySelector("#ovDungeon .dmon.stunned")),"it stuns a monster two tiles away "+J(st));
  await E(()=>{const r=Dungeon._run();r.halves=3;r.taken=r.taken.filter(k=>k!=="f1:p2,1");Dungeon._go("f1",2,4,"n");});
  const pt=await E(()=>Dungeon.useItem());await wait(600);
  ok(pt.hit==="pot"&&(await run()).halves===5&&(await tile(2,1)).t===".","it breaks a pot three tiles away and brings back its heart "+J(pt));

  // a reload resumes the run
  const keep=await run();
  await E(()=>saveNow());await wait(700);await p.reload();await waitFor(p,()=>/^Version/.test((document.getElementById("appVer")||{}).textContent||""));await wait(1500);
  await E(()=>Dungeon.enter("forest"));await wait(300);const back=await run();
  ok(back&&back.room===keep.room&&back.halves===keep.halves&&back.keys===keep.keys,"after a reload the run goes on in the same room "+J({keep,back}));
  // portrait iPad: everything fits, every button at least 44 px
  await p.setViewportSize({width:768,height:1024});await wait(400);
  const fit=await E(()=>{const vw=innerWidth,vh=innerHeight,ids=["dAct","dExit","dUp","dDown","dLeft","dRight"],bad=[];
    const room=document.querySelector("#ovDungeon .room").getBoundingClientRect();if(room.right>vw+1||room.bottom>vh+1||room.left<-1)bad.push("room");
    ids.forEach(id=>{const e=document.getElementById(id);if(!e){bad.push(id+" missing");return;}const r=e.getBoundingClientRect();
      if(r.width<44||r.height<44||r.right>vw+1||r.bottom>vh+1)bad.push(id+" "+Math.round(r.width)+"x"+Math.round(r.height));});return bad;});
  ok(!fit.length,"portrait 768x1024: the room and the buttons fit, all 44 px or more "+J(fit));
  await p.setViewportSize({width:1024,height:768});await wait(300);
  await E(()=>Dungeon.exit());
  ok(await E(()=>!document.querySelector("#ovDungeon.on")&&!!state.dungeon.run),"leaving keeps the run saved");

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
