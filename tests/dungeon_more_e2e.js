// Word Dungeons, the leftovers from the release review: a held key, a battle during a door, a run saved at zero
// hearts, tap-to-walk onto things and round monsters, the lines that should be spoken, a monster friend in the
// Word-Dex, battle stars in the sticker book, walking keeps the game awake, creature-pack animals in battles,
// Enter on a hidden button, and the battle sheet fitting the iPad in landscape.
"use strict";
const {launch,check,waitFor}=require("./lib");
(async()=>{
  const t=check("dungeons, more"),ok=t.ok,J=x=>JSON.stringify(x);
  const C=(id,i)=>({id,seed:i,c:3+i*3,r:8,lv:1,out:true,since:i});
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},
    seed:{phase:2,settings:{goal:0},critters:[C("dog",1),C("lion",2),C("m_dot",3)],
      dungeon:{team:["dog","lion"],friends:{dot:"2026-10-01",cap:"2026-10-01",gob:"2026-10-01",fog:"2026-10-01"},xp:{dog:6}}}});
  const wait=ms=>p.waitForTimeout(ms);
  const until=async(f,a,ms)=>{const t0=Date.now();while(Date.now()-t0<(ms||8000)){if(await E(f,a))return true;await wait(100);}return false;};
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
  const ash=()=>E(()=>Dungeon._run().pos.slice());
  const spy=()=>E(()=>{window.__said=[];const s=Sound.speak,y=Sound.say;
    Sound.speak=(t,r)=>{window.__said.push(String(t));return s(t,r);};Sound.say=(k,fb,r,x)=>{window.__said.push(String(fb));return y(k,fb,r,x);};});
  const said=()=>E(()=>window.__said.slice());
  await tidy();await E(()=>{Dungeon.enter("forest");Dungeon._freeze(true);});await wait(300);

  // ---- 1. a held key: the repeats while Ash glides do not pile up ----
  await E(()=>Dungeon._go("f0",3,6,"e"));
  await E(()=>{for(let i=0;i<6;i++)document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",repeat:i>0,bubbles:true}));});
  await wait(800);
  ok(J(await ash())===J([4,6]),"a key held down (six repeats in one glide) moves Ash one tile, not three "+J(await ash()));

  // ---- 2. no battle while Ash is in a doorway ----
  const door=await E(()=>{Dungeon._go("f4",11,4,"e");Dungeon.step(1,0);
    const V=Dungeon._V(),m=V.mons[0];m.c=11;m.r=4;
    // .9: the monster steps (not skipped), east
    const rnd=Math.random;Math.random=()=>.9;try{Dungeon._tick();}finally{Math.random=rnd;}
    return!!document.querySelector("#ovBattle.on");});
  await wait(500);
  ok(!door&&await E(()=>Dungeon._run().room==="f3"),"a monster stepping after Ash as he goes through a door does not start a battle; he is in the next room");

  // ---- 3. a run saved at zero hearts starts over when he comes back ----
  await E(()=>{Dungeon._run().halves=0;saveNow();});await wait(700);
  await p.reload();await waitFor(p,()=>/^Version/.test((document.getElementById("appVer")||{}).textContent||""));await wait(1500);
  await tidy();await E(()=>{Dungeon.enter("forest");Dungeon._freeze(true);});await wait(300);
  const z=await E(()=>({room:Dungeon._run().room,halves:Dungeon._run().halves,max:state.dungeon.maxHearts}));
  ok(z.room==="f0"&&z.halves===z.max*2,"a run saved with no hearts left starts over at the entrance with full hearts "+J(z));

  // ---- 4. tap-to-walk: onto a thing, and a monster in the way ----
  await E(()=>Dungeon._go("f2",2,4,"e"));
  await p.click('#ovDungeon .dt[data-c="10"][data-r="2"]');await wait(2800);
  const by=await E(()=>{const R=Dungeon._run(),d=Dungeon._DIRS[R.face];return{pos:R.pos,facing:[R.pos[0]+d[0],R.pos[1]+d[1]]};});
  ok(J(by.facing)===J([10,2]),"tapping a chest walks Ash next to it, facing it "+J(by));
  await E(()=>Dungeon.act());await wait(200);
  ok(await E(()=>Dungeon._run().taken.indexOf("f2:c10,2")>=0),"...so the action button opens it");
  await E(()=>Dungeon._go("f1",1,7,"e"));
  await p.click('#ovDungeon .dt[data-c="9"][data-r="7"]');await wait(300);
  await E(()=>{const V=Dungeon._V(),m=V.mons.find(x=>x.kind==="cap");m.c=5;m.r=7;Dungeon._place(document.querySelector('#ovDungeon .dmon[data-kind="cap"]'),5,7);});
  await wait(2200);
  ok(await E(()=>!document.querySelector("#ovBattle.on"))&&(await ash())[0]<5&&(await ash())[0]>1,"a monster stepping into his path stops the walk instead of starting a battle "+J(await ash()));

  // ---- 5. the lines that should be spoken ----
  await spy();
  await E(()=>{Dungeon._run().keys=0;Dungeon._run().opened=[];Dungeon._go("f1",6,1,"n");});await p.keyboard.press("ArrowUp");await wait(300);
  await E(()=>{Dungeon._run().bossKey=false;Dungeon._go("f3",6,1,"n");});await p.keyboard.press("ArrowUp");await wait(300);
  await E(()=>Dungeon._go("fB",6,4,"n"));await p.keyboard.press("ArrowUp");await wait(800);
  const s5=await said();
  ok(s5.indexOf("It is locked. Find a key!")>=0,"a locked door says so out loud");
  ok(s5.indexOf("You need the boss key.")>=0,"the boss door says so out loud");
  ok(s5.indexOf("I am Mad Log! Bop! Bop!")>=0,"Mad Log says his taunt when the fight starts "+J(s5.slice(-4)));
  await E(()=>{const b=document.getElementById("bBack");if(b)b.click();});await until(()=>!document.querySelector("#ovBattle.on"));
  const lines=await E(()=>Dungeon.voiceLines());
  ok(lines.indexOf("It is locked. Find a key!")>=0&&lines.indexOf("You need the boss key.")>=0,"...and those lines are in the voice list");

  // ---- 6. a monster friend in the Word-Dex ----
  await tidy();await spy();await E(()=>Dex.open());await wait(300);
  await p.click('#ovDex [data-tab="m"]');await wait(200);await p.click('#ovDex .mgrid .dexc.got[data-id="m_dot"]');await wait(600);
  const s6=await said();
  ok(s6.indexOf("Dot! It lives in the Forest Temple.")>=0,"tapping Dot in the Word-Dex: \"Dot! It lives in the Forest Temple.\" "+J(s6));
  ok(await E(()=>Dungeon.voiceLines().indexOf("Dot! It lives in the Forest Temple.")>=0),"...a line with a clip");
  await tidy();

  // ---- 7. battle stars in the sticker book ----
  const st=await E(()=>{const g=document.createElement("div");document.body.appendChild(g);renderRoster(g,"animal");
    const c=[...g.querySelectorAll(".card2")].find(x=>/Dog/.test(x.textContent)),d=c&&c.querySelector(".dstars");const r=d?d.textContent:null;g.remove();return r;});
  ok(st&&(st.match(/⭐/g)||[]).length===2,"the dog's two battle stars show on its sticker book card: "+st);

  // ---- 8. walking keeps the game awake ----
  await E(()=>{Dungeon.enter("forest");Dungeon._freeze(true);Dungeon._go("f0",5,4,"e");Rest._idleMs=300;Rest.poke();});
  for(let i=0;i<7;i++){await E(i=>Dungeon.step(i%2?-1:1,0),i);await wait(110);}
  await E(()=>Rest.check());
  ok(await E(()=>!document.body.classList.contains("rest")),"steps on the arrow pad count as play: no rest while he walks");
  await E(()=>{Rest._idleMs=45000;Rest.poke();});

  // ---- 9. an animal from a creature pack fights under its own name and picture ----
  const pk=await E(()=>{packCreatures.push({id:"zappy",name:"Zappy",_img:"data:image/gif;base64,R0lGODlhAQABAAAAACw="});
    state.critters.push({id:"zappy",seed:1,c:2,r:8,lv:1,out:false,since:5});
    const f=Battle.fighter("zappy");return{name:f.name,img:/<img/.test(f.art)};});
  ok(pk.name==="Zappy"&&pk.img,"a creature-pack animal fights as itself "+J(pk));
  await E(()=>Dungeon.pickTeam(()=>{}));await wait(300);
  ok(await E(()=>{const c=document.querySelector('#ovTeam .tcard[data-id="zappy"]');return!!c&&/Zappy/.test(c.textContent)&&!!c.querySelector("img");}),"...and shows so in the team picker");
  await tidy();

  // ---- 10. Enter on a button hidden under the dungeon does nothing ----
  await E(()=>{Dungeon.open();const g=document.querySelector("#ovDungeons [data-go]");g.focus();Dungeon.enter("forest");Dungeon._freeze(true);Dungeon._go("f2",4,4,"e");});
  await p.keyboard.press("ArrowRight");await wait(300);
  const b0=await E(()=>Dungeon._tile(6,4));await p.keyboard.press("Enter");await wait(400);
  ok(b0==="O"&&await E(()=>Dungeon._tile(6,4)==="O"),"Enter while in a room does not reach the map's hidden Go button (the pushed block stays)");

  // ---- 11. the battle sheet fits the iPad in landscape, sentence rounds too ----
  await E(()=>{state.settings.tierOverride=3;Battle._only("sentence");Dungeon._go("f1",4,3,"w");});
  await p.keyboard.press("ArrowLeft");await waitFor(p,()=>!!document.querySelector("#ovBattle.on .bq .psopt"));await wait(300);
  const fit=await E(()=>{const sh=document.querySelector("#ovBattle .sheet"),b=document.getElementById("bBack").getBoundingClientRect(),
    o=[...document.querySelectorAll("#ovBattle .psopt")].map(x=>x.getBoundingClientRect().bottom);
    return{scroll:sh.scrollHeight-sh.clientHeight,back:Math.round(b.bottom),opts:Math.round(Math.max.apply(null,o)),vh:innerHeight};});
  ok(fit.scroll<=0&&fit.back<=fit.vh&&fit.opts<=fit.vh,"1024x768: a sentence round fits without scrolling "+J(fit));
  await E(()=>{const b=document.getElementById("bBack");if(b)b.click();state.settings.tierOverride=0;Battle._only(null);});

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
