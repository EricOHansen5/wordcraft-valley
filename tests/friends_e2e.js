// Word Dungeons friends: after a win a monster may want to be friends; reading its name and a sentence makes it his.
// Friends join the Word-Dex (its Dungeon friends tab), the valley and the battle team; Word Wilds and rewards never offer them.
"use strict";
const {launch,check,waitFor}=require("./lib");
(async()=>{
  const t=check("dungeon friends"),ok=t.ok,J=x=>JSON.stringify(x);
  const C=(id,i)=>({id,seed:i,c:3+i*3,r:8,lv:1,out:true,since:i});
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},
    seed:{phase:2,settings:{goal:0},critters:[C("dog",1),C("lion",2)],dungeon:{team:["dog","lion"]}}});
  const wait=ms=>p.waitForTimeout(ms);
  const until=async(f,a,ms)=>{const t0=Date.now();while(Date.now()-t0<(ms||8000)){if(await E(f,a))return true;await wait(100);}return false;};
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
  // win a battle against the monster at (c,r) of f1, from the tile beside it, with the lion
  const win=async(c,r)=>{
    await E(([c,r])=>{Dungeon._freeze(true);const R=Dungeon._run();R.beaten=[];R.hurt={};Dungeon._go("f1",c+1,r,"w");},[c,r]);
    await p.keyboard.press("ArrowLeft");await waitFor(p,()=>!!document.querySelector("#ovBattle.on .bq[data-ans]"));
    await p.click('#ovBattle .bmon[data-id="lion"]');await wait(150);
    for(let i=0;i<4&&await E(()=>!!(Battle._B()&&!Battle._B().over));i++){
      const r0=await E(()=>Battle._B().round);await E(()=>window.__answer("#ovBattle .bq"));await until(r0=>!Battle._B()||Battle._B().round>r0,r0);}
    await until(()=>!document.querySelector("#ovBattle.on"));await wait(300);};
  await tidy();await E(()=>{Battle._only("pic");Dungeon.enter("forest");
    // today's quests: the two dungeon ones
    state.quests={date:today(),list:QUEST_POOL.filter(q=>q.id==="dbattle"||q.id==="dfriend").map(q=>Object.assign({},q,{p:0})),opened:true};});await wait(300);

  // ---- 1. the first win over Dot: it wants to be friends ----
  await win(3,3);
  ok(await until(()=>!!document.querySelector("#ovFriend.on .fq[data-ans]")),"after the first win over Dot, it wants to be friends");
  ok(await E(()=>document.querySelector("#ovFriend .fq").dataset.ans==="Dot"&&document.querySelectorAll("#ovFriend .fq [data-w]").length===3),"...first he picks its name among three");
  ok(await E(()=>Modes.top()==="battle"),"...as reading time");
  await E(()=>window.__answer("#ovFriend .fq"));
  ok(await until(()=>{const h=document.querySelector("#ovFriend.on .fq");return h&&/^#/.test(h.dataset.ans||"");}),"...then reads a sentence and finds its picture");
  ok(await E(()=>/Dot can be my pal/.test(document.querySelector("#ovFriend .fq").textContent)),"...the friend sentence");
  await E(()=>window.__answer("#ovFriend .fq"));
  ok(await until(()=>state.critters.some(c=>c.id==="m_dot")&&!!state.dungeon.friends.dot),"Dot joins his collection "+J(await E(()=>state.dungeon.friends)));
  await until(()=>!document.querySelector("#ovFriend.on"));
  const inValley=await E(()=>{const c=state.critters.find(x=>x.id==="m_dot");return c.out===false?"resting":!!document.querySelector('#tiles [data-critter="m_dot"]');});
  ok(inValley===true||inValley==="resting","Dot lives in the valley (or rests in the sticker book if it is full): "+inValley);
  ok(await E(()=>typeOf("m_dot")==="leaf"&&CRIT("m_dot").name==="Dot"),"a monster friend has its name and type");
  await E(()=>{window.__said=[];const o=Sound.say;Sound.say=(k,fb,r,x)=>{window.__said.push(String(fb));return o(k,fb,r,x);};nameThatAnimal("m_dot");});await wait(1500);
  const said=await E(()=>({said:window.__said,shown:/m_dot/i.test(document.getElementById("toast").textContent),toast:document.getElementById("toast").textContent}));
  ok(!said.shown&&!said.said.some(t=>/m_dot/.test(t)),"tapping Dot in the valley says and shows Dot, never its id "+J(said));

  // a resting friend can be brought out from the sticker book, like an animal
  await E(()=>{state.critters.find(x=>x.id==="m_dot").out=false;const g=document.createElement("div");g.id="__roster";document.body.appendChild(g);renderRoster(g,"animal");});
  const card=await E(()=>{const c=[...document.querySelectorAll("#__roster .card2")].find(x=>/Dot/.test(x.querySelector(".nm").textContent));return c?c.textContent.split(/[\n ]+/).join(" "):null;});
  ok(card&&/Resting/.test(card),"a resting monster friend shows in the sticker book, ready to bring out: "+card);
  await E(()=>{document.getElementById("__roster").remove();state.critters.find(x=>x.id==="m_dot").out=true;});

  // ---- 2. no second offer once a friend; a miss costs nothing ----
  await win(3,3);await wait(800);
  ok(await E(()=>!document.querySelector("#ovFriend.on")),"beating Dot again after befriending offers nothing");
  const h0=await E(()=>Dungeon._run().halves);
  await win(9,5);
  ok(await until(()=>!!document.querySelector("#ovFriend.on .fq[data-ans]")),"the first win over Cap: Cap wants to be friends");
  await E(()=>{const h=document.querySelector("#ovFriend .fq");[...h.querySelectorAll("[data-w]")].find(b=>b.dataset.w!==h.dataset.ans).click();});
  ok(await until(()=>/Maybe next time/.test((document.getElementById("ovFriend")||{}).textContent||"")),"a wrong name: Maybe next time!");
  await until(()=>!document.querySelector("#ovFriend.on"));
  ok(await E(()=>!state.critters.some(c=>c.id==="m_cap")&&!state.dungeon.friends.cap),"...and Cap does not join");
  ok((await E(()=>Dungeon._run().halves))===h0,"...and it costs no hearts");
  await E(()=>{window.__rnd=Math.random;Math.random=()=>.9;});
  await win(9,5);await wait(800);
  ok(await E(()=>!document.querySelector("#ovFriend.on")),"after the first win, an offer comes only 1 time in 3 (none at a roll of .9)");
  await E(()=>{Math.random=window.__rnd;});

  const qs=await E(()=>state.quests.list.map(q=>q.id+":"+q.p+"/"+q.n).join(" "));
  ok(qs==="dbattle:3/3 dfriend:1/1","the daily quests count dungeon wins and a new friend: "+qs);

  // ---- 3. the Word-Dex, the team picker, and what never offers a monster ----
  await tidy();await E(()=>Dex.open());await wait(300);
  await p.click('#ovDex [data-tab="m"]');await wait(200);
  ok(await E(()=>!!document.querySelector('#ovDex .mgrid .dexc.got[data-id="m_dot"]')&&!document.querySelector('#ovDex .mgrid .dexc.got[data-id="m_cap"]')),"the Word-Dex's Dungeon friends tab shows Dot, and Cap as not yet");
  await tidy();await E(()=>Dungeon.pickTeam(()=>{}));await wait(300);
  ok(await E(()=>{const c=document.querySelector('#ovTeam .tcard[data-id="m_dot"]');return!!c&&c.dataset.type==="leaf";}),"Dot can join the battle team, as leaf");
  await tidy();
  ok(await E(()=>!Dex.pool().some(c=>/^m_/.test(c.id))),"Word Wilds never meets a monster (the Dex pool has none)");
  ok(await E(()=>!CRITTERS.some(c=>/^m_/.test(c.id))),"the animal list the rewards draw from has no monsters");

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
