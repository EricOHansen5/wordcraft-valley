// Word Dungeons battles: the team picker, types, a reading question a turn, hearts in halves (at most one heart a
// question), the kind restart at zero hearts, backing off, the stunned free hit, a reload mid-battle, and rest.
// A 1024x768 touch iPad. Monster stepping is frozen (Dungeon._freeze) except where the test is about it.
"use strict";
const {launch,check,waitFor,seed}=require("./lib");
(async()=>{
  const t=check("battles"),ok=t.ok,J=x=>JSON.stringify(x);
  const C=(id,i)=>({id,seed:i,c:3+i*3,r:8,lv:1,out:true,since:i});
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},
    seed:{phase:2,settings:{goal:0},critters:[C("dog",1),C("shark",2),C("lion",3)]}});
  const wait=ms=>p.waitForTimeout(ms);
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
  const run=()=>E(()=>{const r=Dungeon._run();return{room:r.room,pos:r.pos,halves:r.halves,beaten:r.beaten};});
  const hp=()=>E(()=>{const f=document.querySelector("#ovBattle.on .bfoe");return f?+f.dataset.hp:null;});
  // poll a condition in the page (the answer animations take about 2 s)
  const until=async(f,a,ms)=>{const t0=Date.now();while(Date.now()-t0<(ms||8000)){if(await E(f,a))return true;await wait(100);}return false;};
  // a right answer, then wait for the next question (or the end of the battle)
  const right=async()=>{await waitFor(p,()=>!!document.querySelector("#ovBattle.on .bq[data-ans]"));
    const r0=await E(()=>Battle._B()?Battle._B().round:-1);await E(()=>window.__answer("#ovBattle .bq"));
    await until(r0=>!Battle._B()||Battle._B().round>r0,r0);await wait(150);};
  const closed=()=>until(()=>!document.querySelector("#ovBattle.on")&&!Battle._B());
  const wrong=async()=>{await waitFor(p,()=>!!document.querySelector("#ovBattle.on .bq[data-ans]"));
    const r=await E(()=>{const h=document.querySelector("#ovBattle .bq"),a=h.dataset.ans;
      const b=[...h.querySelectorAll("[data-w]")].find(x=>x.dataset.w!==a&&!x.classList.contains("wrong"));
      if(b){b.click();return"word";}
      const o=[...h.querySelectorAll(".psopt")].find(x=>"#"+x.dataset.i!==a);if(o){o.click();return"sent";}
      // build it: fill the slots in a wrong order
      const bank=[...h.querySelectorAll(".wbank .lt:not(.used)")].reverse();bank.forEach(x=>x.click());return"build";});
    await wait(700);return r;};
  // keep the questions to word picks so a wrong tap is easy to make (the engines are tested in their own suites)
  const wordsOnly=()=>E(()=>{Battle._only("pic");});
  await tidy();

  // ---- 1. the team picker ----
  await E(()=>Dungeon.enter("forest"));
  ok(await waitFor(p,()=>!!document.querySelector("#ovTeam.on")),"with no team yet, the door asks him to pick one");
  await p.click("#tSuggest");
  const picked=await E(()=>[...document.querySelectorAll("#ovTeam .tcard.on")].map(c=>c.dataset.id).sort());
  ok(J(picked)===J(["dog","lion","shark"]),"Suggest picks one of each type: "+J(picked));
  await p.click("#tGo");await wait(400);
  ok(await E(()=>state.dungeon.team.slice().sort().join()==="dog,lion,shark"&&!!document.querySelector("#ovDungeon.on")),"Go saves the team and starts the run");

  // ---- 2. into a battle, once ----
  await E(()=>{Dungeon._freeze(true);Dungeon._go("f1",4,3,"w");});await wordsOnly();
  for(let i=0;i<10;i++)await p.keyboard.press("ArrowLeft");
  await wait(500);
  ok(await E(()=>Modes.stack().filter(m=>m==="battle").length===1&&!!document.querySelector("#ovBattle.on")),"ten fast presses into a monster start exactly one battle");
  ok(J((await run()).pos)===J([4,3]),"...and Ash stays where he was");
  ok(await E(()=>Modes.top()==="battle"),"a battle is reading time");
  await E(()=>{Rest._idleMs=300;});await wait(600);await E(()=>Rest.check());
  ok(await E(()=>!document.body.classList.contains("rest")),"a battle gets the long rest time, not 45 s");
  await E(()=>{Rest._idleMs=45000;Rest.poke();});

  // ---- 3. turns ----
  ok((await hp())===3,"Dot starts with 3 hits to go");
  await p.click('#ovBattle .bmon[data-id="dog"]');await wait(200);
  ok(await E(()=>document.querySelector('#ovBattle .bmon.active').dataset.id==="dog"),"tapping an animal on the team bar makes it the fighter");
  const h0=(await run()).halves;
  await right();ok((await hp())===2,"a right answer with the dog (leaf against leaf) is one hit");
  await wrong();ok((await run()).halves===h0-1,"a wrong answer costs half a heart");
  await wrong();await wrong();ok((await run()).halves===h0-2,"three wrong taps on one question cost one heart in all");
  {const r0=await E(()=>Battle._B().round);await E(()=>{const h=document.querySelector("#ovBattle .bq"),b=h.querySelector(`[data-w="${h.dataset.ans}"]`);b.click();b.click();});await until(r0=>Battle._B().round>r0,r0);}
  ok((await hp())===1,"a double tap on the right answer lands one hit");
  const hb=(await run()).halves;
  await p.click('#ovBattle .bmon[data-id="lion"]');await wait(200);
  ok(await E(()=>document.querySelector('#ovBattle .bmon.active').dataset.id==="lion")&&(await run()).halves===hb,"swapping costs nothing");
  const g0=await E(()=>state.gems);
  await right();
  ok(await closed(),"the lion (fire against leaf) finishes Dot");await wait(200);
  const w1=await E(()=>({gems:state.gems,xp:state.dungeon.xp.lion,beaten:Dungeon._run().beaten,el:!!document.querySelector('#ovDungeon .dmon[data-kind="dot"]'),wins:state.dungeon.stats.wins}));
  ok(w1.gems===g0+2&&w1.xp===1&&w1.beaten.indexOf("f1:0")>=0&&!w1.el&&w1.wins===1,"a win pays 2 gems and 1 experience, and Dot is gone "+J(w1));
  await E(()=>Dungeon._go("f1",4,3,"w"));
  ok(await E(()=>Dungeon._walkable(3,3)),"where Dot stood is free now");

  // ---- 4. a type win is two hits ----
  await E(()=>Dungeon._go("f1",9,4,"s"));await p.keyboard.press("ArrowDown");await wait(500);
  ok((await hp())===3,"Cap starts with 3");
  await p.click('#ovBattle .bmon[data-id="lion"]');await wait(200);
  await right();ok((await hp())===1,"the lion (fire) against Cap (leaf) is two hits");

  // ---- 5. backing off keeps the damage ----
  await p.click("#bBack");await wait(400);
  ok(await E(()=>!document.querySelector("#ovBattle.on"))&&J((await run()).pos)===J([9,3]),"Back off closes the battle and steps Ash back "+J((await run()).pos));
  await p.keyboard.press("ArrowDown");await wait(300);await p.keyboard.press("ArrowDown");await wait(500);
  ok((await hp())===1,"meeting Cap again, its hits are still down to 1");
  await p.click("#bBack");await wait(400);

  // ---- 6. the boomerang's stun is a free hit ----
  await E(()=>{state.dungeon.items.boomerang=true;Dungeon._go("f1",9,2,"s");});
  await E(()=>Dungeon.useItem());await wait(600);
  // walk up to it (a redraw would wake it): two steps, then the bump
  for(let i=0;i<3;i++){await p.keyboard.press("ArrowDown");await wait(260);}await wait(300);
  ok((await hp())===0||await closed(),"a stunned Cap starts one hit down (1 → 0 here: the free hit wins)");
  await closed();

  // ---- 7. zero hearts: back to the entrance, keeping what he earned ----
  await E(()=>{const r=Dungeon._run();r.beaten=[];r.halves=1;Dungeon._go("f1",4,3,"w");});
  const keep=await E(()=>({gems:state.gems,xp:JSON.stringify(state.dungeon.xp),boom:state.dungeon.items.boomerang,restarts:state.dungeon.stats.restarts}).valueOf());
  await p.keyboard.press("ArrowLeft");await wait(500);await wrong();await closed();await wait(300);
  const after=await E(()=>({room:Dungeon._run().room,halves:Dungeon._run().halves,gems:state.gems,xp:JSON.stringify(state.dungeon.xp),boom:state.dungeon.items.boomerang,
    restarts:state.dungeon.stats.restarts,say:document.getElementById("dSay").textContent,battle:!!document.querySelector("#ovBattle.on")}));
  ok(after.room==="f0"&&after.halves===6&&!after.battle,"at zero hearts the run starts over at the entrance with full hearts "+J(after));
  ok(/Ash is tired/.test(after.say),"...with the kind line");
  ok(after.gems===keep.gems&&after.xp===keep.xp&&after.boom===true&&after.restarts===keep.restarts+1,"...keeping his gems, experience and the boomerang");

  // ---- 8. a reload in the middle of a battle ----
  await E(()=>Dungeon._go("f1",4,3,"w"));await p.keyboard.press("ArrowLeft");await wait(500);
  ok(await E(()=>!!document.querySelector("#ovBattle.on")),"a battle is on");
  const hr=(await run()).halves;
  await E(()=>saveNow());await wait(700);await p.reload();await waitFor(p,()=>/^Version/.test((document.getElementById("appVer")||{}).textContent||""));await wait(1500);
  await tidy();await E(()=>{Dungeon.enter("forest");Dungeon._freeze(true);});await wait(400);
  const rl=await E(()=>({battle:!!document.querySelector("#ovBattle.on"),room:Dungeon._run().room,dots:document.querySelectorAll('#ovDungeon .dmon[data-kind="dot"]').length,halves:Dungeon._run().halves}));
  ok(!rl.battle&&rl.room==="f1"&&rl.dots===1&&rl.halves===hr,"after a reload: no battle sheet, the same room and hearts, Dot there once "+J(rl));

  // ---- 9. monsters hold still while the game rests ----
  await E(()=>Dungeon._freeze(false));await wait(2500);
  const moved=await E(()=>document.querySelector('#ovDungeon .dmon[data-kind="cap"]').dataset.c+","+document.querySelector('#ovDungeon .dmon[data-kind="cap"]').dataset.r);
  // frozen while the rest comes (a monster bumping Ash would start a battle, which rightly holds the rest off), then let go
  await E(()=>{Dungeon._freeze(true);Dungeon._go("f1",1,7,"n");Rest._idleMs=200;});await wait(400);await E(()=>{Rest.check();Dungeon._freeze(false);});
  ok(await E(()=>document.body.classList.contains("rest")),"the game rests in the dungeon after the idle time");
  const at0=await E(()=>[...document.querySelectorAll("#ovDungeon .dmon")].map(m=>m.dataset.c+","+m.dataset.r).join(";"));await wait(3200);
  const at1=await E(()=>[...document.querySelectorAll("#ovDungeon .dmon")].map(m=>m.dataset.c+","+m.dataset.r).join(";"));
  ok(at0===at1,"resting: the monsters do not step ("+at0+")");
  await E(()=>{Rest._idleMs=45000;Rest.poke();Dungeon._freeze(true);});
  ok(typeof moved==="string","(monsters stepped while awake: "+moved+")");
  await tidy();

  // ---- boss: Mad Log, the heart container and the badge ----
  await E(()=>{state.settings.tierOverride=3;Battle._only(null);Dungeon.enter("forest");Dungeon._freeze(true);
    const r=Dungeon._run();r.bossKey=true;r.halves=8;Dungeon._go("f3",6,1,"n");});await wait(300);
  await p.keyboard.press("ArrowUp");await wait(300);
  ok(await E(()=>document.querySelector('#ovDungeon .dt[data-c="6"][data-r="0"]').dataset.t==="D"),"the boss key opens the boss door");
  await p.keyboard.press("ArrowUp");await wait(400);
  ok(await E(()=>Dungeon._run().room==="fB"&&!!document.querySelector("#ovDungeon .dboss")),"...into the boss room, and Mad Log is there");
  await E(()=>Dungeon._go("fB",6,4,"n"));await p.keyboard.press("ArrowUp");await wait(600);
  ok((await hp())===8,"Mad Log takes 8 hits");
  await p.click('#ovBattle .bmon[data-id="dog"]');await wait(200);
  await right();await right();
  ok(await E(()=>!!document.querySelector("#ovBattle .bq .psopt")),"the third round is a sentence riddle");
  ok(await E(()=>!!document.getElementById("bItem")),"with the boomerang, the boss sheet offers it");
  const hi=await hp();await p.click("#bItem");await wait(500);
  ok((await hp())===hi-1&&await E(()=>!document.getElementById("bItem")),"the boomerang lands one free hit, once");
  const gB=await E(()=>state.gems);
  await p.click('#ovBattle .bmon[data-id="lion"]');await wait(200);
  for(let i=0;i<8&&await E(()=>!!document.querySelector("#ovBattle.on"));i++)await right();
  ok(await closed(),"the lion (fire) beats Mad Log (leaf)");await wait(600);
  const cl=await E(()=>({max:state.dungeon.maxHearts,cleared:!!state.dungeon.cleared.forest,run:state.dungeon.run,gems:state.gems}));
  ok(cl.max===4&&cl.cleared&&cl.run===null&&cl.gems>=gB+10,"beating the boss: a heart container (3 → 4), the dungeon cleared, the run over, 10 gems "+J(cl));
  await E(()=>checkBadges());
  ok(await E(()=>(state.badges||[]).indexOf("d_forest")>=0),"...and the Forest Temple badge");
  await until(()=>!!document.querySelector('#ovDungeons.on .dmap[data-d="forest"].cleared'));
  ok(await E(()=>!!document.querySelector('#ovDungeons.on .dmap[data-d="forest"].cleared .dtro svg')),"the map shows the Forest Temple cleared, with its trophy");
  // a replay: battle gems and the boss's 10, but no second heart container
  await E(()=>{Dungeon.enter("forest");Dungeon._freeze(true);Dungeon._run().bossKey=true;Dungeon._go("fB",6,4,"n");});await wait(300);
  ok(await E(()=>!!document.querySelector("#ovDungeon .dboss")),"on a replay Mad Log is back");
  await p.keyboard.press("ArrowUp");await wait(600);await p.click('#ovBattle .bmon[data-id="lion"]');await wait(200);
  for(let i=0;i<8&&await E(()=>!!document.querySelector("#ovBattle.on"));i++)await right();
  await closed();await wait(600);
  ok(await E(()=>state.dungeon.maxHearts===4),"a replay win gives no second heart container");
  await E(()=>{state.settings.tierOverride=0;});await tidy();

  // ---- 10. no animals at all: the buddy fights ----
  await seed(p,{phase:2,settings:{goal:0},critters:[]});await tidy();
  await E(()=>{Dungeon.enter("forest");Dungeon._freeze(true);});await wait(300);
  ok(await E(()=>!document.querySelector("#ovTeam.on")&&!!document.querySelector("#ovDungeon.on")),"with no animals, no picker: straight in");
  await E(()=>Dungeon._go("f1",4,3,"w"));await wordsOnly();await p.keyboard.press("ArrowLeft");await wait(500);
  ok(await E(()=>{const b=document.querySelectorAll("#ovBattle .bmon");return b.length===1&&b[0].dataset.id==="buddy"&&b[0].dataset.type==="leaf";}),"the buddy fights alone, as leaf");
  for(let i=0;i<3&&await E(()=>!!document.querySelector("#ovBattle.on"));i++)await right();
  await closed();await wait(200);ok(await E(()=>!document.querySelector("#ovBattle.on")&&Dungeon._run().beaten.indexOf("f1:0")>=0),"...and can win");

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
