// VALLEY QUEST arc 2, "The Sleepy Volcano", chapters 4-6 and the ending: each chapter from a seeded save
// (quest2.ch 3, 4, 5 with The Letter Thief done), its lock kind played like its chapter 1-3 counterpart
// (letters, temple, spell), each gift paid once, gems never going down, the END after chapter 6 with
// quest2.done, a full prize row, and every line of chapters 1-6 and the END decodable at its level.
const {launch,seed,answer,check}=require("./lib");
const fs=require("fs"),path=require("path");
(async()=>{const t=check("quest2b");const ok=t.ok;
  const LT={ch:6,day:"2000-01-01",active:null,done:true,letters:["R","E","A","D","🔑","👑"]};
  // guardians 0-2 awake, so no keeper's scene opens over Adventure after boot
  const save=(ch,lvl,extra)=>Object.assign({guardians:[0,1,2],settings:{tierOverride:lvl,goal:0},critters:[{id:"dog",c:14,r:8,seed:1}],quest:LT,
    quest2:{ch,day:"2000-01-01",active:null,done:false,got:[0,1,2,3,4].slice(0,ch)}},extra||{});
  const {page:p,E,errs,close}=await launch({seed:save(3,4)});
  // a boot scene (a season, a welcome) can be up after a reload, as in the other suites
  const clear=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));await clear();
  const near=(c,r)=>E(([c,r])=>{Adv._P.c=c;Adv._P.r=r;},[c,r]);
  const act=()=>E(()=>document.getElementById("advAct").textContent);
  // Adventure's action button names the first thing in reach, not the nearest, so a spot placed at random can sit
  // in reach of another one: step around inside the target's reach until the button names it
  const walkTo=async(c,r,re)=>{let lab="";
    for(const [dc,dr] of [[0,0],[.5,0],[-.5,0],[0,.4],[0,-.4],[.9,0],[-.9,0],[.5,.5],[-.5,-.5],[.5,-.5],[-.5,.5]]){
      await near(c+dc,r+dr);for(let k=0;k<6;k++){await p.waitForTimeout(100);lab=await act();if(re.test(lab))return lab;}}
    return lab;};
  const head=()=>E(()=>{const h=document.querySelector("#ovQuest.on .qhead b");return h?h.textContent:"";});
  const nexts=async n=>{for(let i=0;i<n;i++){await p.click("#qNext");await p.waitForTimeout(200);}};
  const tomorrow=()=>E(()=>{state.quest2.day="2000-01-01";state.quest2.giverDay=null;});
  // gems are checked after every step: they may only go up
  // (each seeded save is its own section; "start" is where that chapter's gems are counted from)
  let sec=1,base=0;const gemLog=[];const gems=async why=>{const g=await E(()=>state.gems);if(why==="start")base=g;gemLog.push([why,g,sec]);return g;};
  const gemsUp=()=>gemLog.every((x,i)=>!i||x[2]!==gemLog[i-1][2]||x[1]>=gemLog[i-1][1]);
  const win=()=>E(()=>{const w=document.querySelector("#ovQuest.on .qwin");if(!w)return null;
    const row=[...w.querySelectorAll(".qletters span")];
    return{msg:w.textContent.replace(/\s+/g," ").trim(),h:(w.querySelector("h2")||{}).textContent,slots:row.length,got:row.filter(s=>s.classList.contains("got")).length,
      blank:row.filter(s=>s.textContent==="❔").length,btn:(document.getElementById("qOk")||{}).textContent};});

  // ---- 1 chapter 4, "The Last Eggs": letters with a picture lock, level 5 ----
  ok(await E(()=>state.quest2.ch===3&&state.quest.done&&currentTier()===4),"seeded: chapter 4 next, The Letter Thief done, level 4");
  ok(await E(()=>!Quest2.available()),"chapter 4 waits for level 5");
  ok(/Chapter 4 opens at reading level 5/.test(await E(()=>Quest2.note())),"the report says chapter 4 opens at level 5");
  await E(()=>{state.settings.tierOverride=5;});
  ok(await E(()=>Quest2.available()&&document.getElementById("advBadge")&&(advBadge(),document.getElementById("advBadge").textContent==="❗")),"level 5: chapter 4 offered, Adventure shows ❗");
  await p.click("#advBtn");await p.waitForTimeout(900);
  const giver=await E(()=>state.quest2.giver);ok(!!giver&&await E(()=>!!document.querySelector(".advland.qgiver .qg:not(.friend)")),"Puff's giver is drawn");
  const a4=await walkTo(giver.c,giver.r,/Chapter 4/);ok(/Chapter 4/.test(a4),"walk up: ❗ Chapter 4 ("+a4+")");
  const c0=await E(()=>({hawk:state.critters.filter(c=>c.id==="hawk").length,crit:state.critters.length}));await gems("start");
  await p.click("#advAct");await p.waitForTimeout(400);
  ok(/Chapter 4: The Last Eggs/.test(await head()),"chapter 4 story opens: "+await head());
  const pages4=[];for(let i=0;i<4;i++){pages4.push(await E(()=>document.querySelector("#ovQuest .btext").textContent));await nexts(1);}
  ok(JSON.stringify(pages4)===JSON.stringify(await E(()=>Quest2.CH[3].story)),"chapter 4: four story pages, as written");
  const spots=await E(()=>state.quest2.active&&state.quest2.active.spots);ok(spots&&spots.length===3,"chapter 4: three eggs hidden");
  ok(await E(()=>[...document.querySelectorAll(".advland.qletter .qlt")].filter(x=>x.textContent==="🥚").length===3),"the eggs show in the valley");
  for(let i=0;i<3;i++){const lab=await walkTo(spots[i].c,spots[i].r,/Get the egg/);
    ok(/Get the egg/.test(lab),"egg "+(i+1)+": action says Get the egg ("+lab+")");
    await p.click("#advAct");await p.waitForTimeout(400);
    if(i===0){ok(/A hawk egg!/.test(await head()),"the lock is titled A hawk egg!");
      await E(()=>{const h=document.querySelector("#ovQuest .qbody"),w=[...h.querySelectorAll("[data-w]")].find(b=>b.dataset.w!==h.dataset.ans);w.click();});
      await p.waitForTimeout(600);ok(await E(()=>state.quest2.active.found.length===0),"a wrong picture takes nothing away");await gems("wrong egg");}
    ok(/^word:/.test(await answer(p,"#ovQuest .qbody")),"egg "+(i+1)+" answered through dataset.ans");
    await E(()=>{const b=document.querySelector("#ovQuest .qbody .right");if(b)b.click();});   // a second tap on the answer
    await p.waitForTimeout(1300);
    ok(/Got one!|That's all three!/.test(await E(()=>document.querySelector("#ovQuest .qgot h2").textContent)),"egg "+(i+1)+": "+await E(()=>document.querySelector("#ovQuest .qgot h2").textContent));
    await p.click("#qOk");await p.waitForTimeout(500);await gems("egg "+(i+1));}
  await p.screenshot({path:"q2b_ch4.png"});
  const w4=await win(),g4=await E(()=>({ch:state.quest2.ch,got:state.quest2.got.join(),gems:state.gems,hawk:state.critters.filter(c=>c.id==="hawk").length,crit:state.critters.length}));
  ok(g4.ch===4&&g4.got==="0,1,2,3"&&g4.hawk===c0.hawk+1&&g4.crit===c0.crit+1,"chapter 4 done: a baby hawk hatched: "+JSON.stringify(g4));
  ok(g4.gems===base+24,"chapter 4 pays 24 gems: "+base+" -> "+g4.gems);
  ok(w4&&/Chapter 4 done/.test(w4.msg)&&/baby hawk hatched/.test(w4.msg)&&/tomorrow/.test(w4.msg)&&!/on the way/.test(w4.msg),"win sheet: "+(w4&&w4.msg));
  ok(w4&&w4.slots===6&&w4.got===4&&w4.blank===0,"prize row: 6 slots, 4 filled, no ❔: "+JSON.stringify(w4&&{slots:w4.slots,got:w4.got,blank:w4.blank}));
  await E(()=>Quest2._finish());
  ok(await E(g=>state.quest2.ch===4&&state.gems===g.gems&&state.critters.length===g.crit,g4),"finishing again pays nothing");await gems("finish again");
  await p.click("#qOk");await p.waitForTimeout(200);await gems("ch4 done");
  ok(await E(()=>!Quest2.available()),"chapter 5 waits until tomorrow");
  await tomorrow();
  ok(await E(()=>!Quest2.available()),"chapter 5 waits for level 6");
  ok(/Chapter 5 opens at reading level 6/.test(await E(()=>Quest2.note())),"the report says chapter 5 opens at level 6");
  await p.click("#advDone");await p.waitForTimeout(300);

  // ---- 2 chapter 5, "The Egg of Puff": the den (temple), four hard rooms, level 6 ----
  sec++;   // a new save: gems start again from the seed
  await seed(p,save(4,6));await clear();
  ok(await E(()=>state.quest2.ch===4&&currentTier()===6&&Quest2.available()),"seeded chapter 5 at level 6: offered");
  await p.click("#advBtn");await p.waitForTimeout(900);await gems("start");
  await E(()=>Quest2.start());await p.waitForTimeout(300);
  ok(/Chapter 5: The Egg of Puff/.test(await head()),"chapter 5 story opens: "+await head());
  await nexts(4);
  ok(await E(()=>Quest2.CH[4].hard===true&&Quest2.CH[4].rooms===4),"the den is hard, with four rooms");
  for(let r=0;r<4;r++){
    ok(new RegExp("Puff's den · room "+(r+1)+" of 4").test(await head()),"room "+(r+1)+": "+await head());
    if(r===0){await p.screenshot({path:"q2b_den.png"});
      const wrong=await E(()=>[...document.querySelectorAll('.tdoor[data-ok="0"]')].map(b=>b.dataset.k));
      await E(k=>document.querySelector(`.tdoor[data-k="${k}"]`).click(),wrong[0]);await p.waitForTimeout(1000);
      ok(await E(()=>/room 1 of 4/.test(document.querySelector("#ovQuest .qhead b").textContent)&&!document.querySelector('.tdoor[data-ok="1"].hint')),"a wrong door: still room 1, nothing taken");
      await E(k=>document.querySelector(`.tdoor[data-k="${k}"]`).click(),wrong[1]||wrong[0]);await p.waitForTimeout(1000);
      ok(await E(()=>!!document.querySelector('.tdoor[data-ok="1"].hint')),"after two misses the right door glows");await gems("wrong doors");}
    if(r===1)await E(()=>{const b=document.querySelector('.tdoor[data-ok="1"]');b.click();b.click();});   // a double tap opens one room
    else await E(()=>document.querySelector('.tdoor[data-ok="1"]').click());
    await p.waitForTimeout(1300);}
  ok(await E(()=>!!document.querySelector("#qOpen")&&/The egg of Puff/.test(document.querySelector("#ovQuest .qwin h2").textContent)),"after four rooms: the chest holds the egg of Puff");
  await gems("before chest");
  await E(()=>{const b=document.querySelector("#qOpen");b.click();b.click();});await p.waitForTimeout(400);   // double tap
  await p.screenshot({path:"q2b_ch5.png"});
  const w5=await win(),g5=await E(()=>({ch:state.quest2.ch,got:state.quest2.got.join(),gems:state.gems,crit:state.critters.length}));
  ok(g5.ch===5&&g5.got==="0,1,2,3,4","chapter 5 done: "+JSON.stringify(g5));
  ok(g5.gems===base+26+15,"a double tap on the chest pays once: 26 for the chapter and Puff's 15: "+base+" -> "+g5.gems);
  ok(w5&&/Chapter 5 done/.test(w5.msg)&&/thank you with 15 gems/.test(w5.msg)&&/tomorrow/.test(w5.msg),"win sheet: "+(w5&&w5.msg));
  ok(w5&&w5.slots===6&&w5.got===5&&w5.blank===0,"prize row: 5 of 6 filled, no ❔");
  await E(()=>Quest2._finish());
  ok(await E(g=>state.quest2.ch===5&&state.gems===g.gems,g5),"finishing again pays nothing");await gems("finish again");
  await p.click("#qOk");await p.waitForTimeout(200);await gems("ch5 done");
  ok(await E(()=>!Quest2.available()),"chapter 6 waits until tomorrow");
  await tomorrow();
  ok(await E(()=>Quest2.available()),"level 6 next day: chapter 6 offered");
  await p.click("#advDone");await p.waitForTimeout(300);

  // ---- 3 chapter 6, "The Big Burst": the big spell (build three words), level 6, then the END ----
  sec++;   // a new save: gems start again from the seed
  await seed(p,save(5,6));await clear();
  ok(await E(()=>state.quest2.ch===5&&currentTier()===6&&Quest2.available()),"seeded chapter 6 at level 6: offered");
  await p.click("#advBtn");await p.waitForTimeout(900);await gems("start");
  const d0=await E(()=>state.critters.filter(c=>c.id==="dragon").length);
  await E(()=>Quest2.start());await p.waitForTimeout(300);
  ok(/Chapter 6: The Big Burst/.test(await head()),"chapter 6 story opens: "+await head());
  await nexts(4);
  const built=[];
  for(let k=0;k<3;k++){
    const hd=await head();
    if(k===0){await p.screenshot({path:"q2b_spell.png"});
      ok(/Part of the big spell/.test(await E(()=>document.querySelector("#ovQuest .qbody .wp").textContent)),"the spell prompt shows");
      // a wrong build: the sounds in reverse order
      await E(()=>{const h=document.querySelector("#ovQuest .qbody"),tiles=JSON.parse(h.dataset.tiles).reverse(),bank=[...h.querySelectorAll(".wbank .lt")],used=new Set();
        tiles.forEach(ph=>{const b=bank.find((x,i)=>!used.has(i)&&x.textContent===tileText(ph));used.add(bank.indexOf(b));b.click();});});
      await p.waitForTimeout(1100);
      ok(await E(()=>/1 of 3/.test(document.querySelector("#ovQuest .qhead b").textContent)&&!!document.querySelector("#ovQuest .qbody").dataset.tiles),"a wrong build: the same word waits, nothing taken");
      await gems("wrong build");}
    built.push(await answer(p,"#ovQuest .qbody"));ok(new RegExp("The big spell · "+(k+1)+" of 3").test(hd),"spell step "+(k+1)+": "+hd+" -> "+built[k]);
    await p.waitForTimeout(1500);}
  ok(built.join()==="build:star,build:corn,build:bird","the big spell is star, corn, bird: "+built.join());
  ok(await E(()=>!!document.querySelector("#qOpen")&&/The hot hill bursts/.test(document.querySelector("#ovQuest .qwin h2").textContent)),"the hot hill bursts");
  await gems("before chest");
  await E(()=>{const b=document.querySelector("#qOpen");b.click();b.click();});await p.waitForTimeout(400);   // double tap
  await p.screenshot({path:"q2b_ch6.png"});
  const w6=await win(),g6=await E(()=>({ch:state.quest2.ch,got:state.quest2.got.join(),gems:state.gems,done:state.quest2.done,d:state.critters.filter(c=>c.id==="dragon").length}));
  ok(g6.ch===6&&g6.got==="0,1,2,3,4,5"&&g6.d===d0+1&&!g6.done,"chapter 6 done: a baby dragon hatched, once: "+JSON.stringify(g6));
  ok(g6.gems===base+28+20,"chapter 6 pays 28 gems and the gem rain's 20, once: "+base+" -> "+g6.gems);
  ok(w6&&w6.h==="You woke the volcano!"&&/baby dragon hatched/.test(w6.msg)&&/rained 20 gems/.test(w6.msg),"win sheet: "+(w6&&w6.msg));
  ok(w6&&!/tomorrow|on the way/.test(w6.msg)&&/The end/.test(w6.btn),"the last win sheet has no next chapter and ends on The end ▶");
  ok(w6&&w6.slots===6&&w6.got===6&&w6.blank===0,"prize row: 6 of 6 filled, no ❔: "+JSON.stringify(w6&&{slots:w6.slots,got:w6.got,blank:w6.blank}));
  await E(()=>Quest2._finish());
  ok(await E(g=>state.quest2.ch===6&&state.gems===g.gems&&state.critters.filter(c=>c.id==="dragon").length===g.d,g6),"finishing again pays nothing");await gems("finish again");
  await p.click("#qOk");await p.waitForTimeout(400);
  ok(await E(()=>state.quest2.done===true),"The end ▶: quest2.done");
  ok(await head()==="The End","the END story opens");
  const END=await E(()=>Quest2.END),endPages=[];
  for(let i=0;i<END.length;i++){endPages.push(await E(()=>document.querySelector("#ovQuest .btext").textContent));
    if(i===END.length-1)ok(/The end/.test(await E(()=>document.getElementById("qNext").textContent)),"the last page's button says The end");
    await nexts(1);}
  ok(END.length>=4&&END.length<=6&&JSON.stringify(endPages)===JSON.stringify(END),"the END plays all "+END.length+" lines: "+endPages.join(" / "));
  ok(await E(()=>!document.querySelector("#ovQuest.on")),"the story sheet closes after the END");
  await gems("end");
  ok(await E(()=>!Quest2.available()&&!Adv.redraw()&&!document.querySelector(".advland.qgiver .qg:not(.friend)")),"the arc is over: no more ❗ for Puff");
  await tomorrow();
  ok(await E(()=>!Quest2.available()),"still none the next day");
  await p.click("#advDone");await p.waitForTimeout(300);
  await E(()=>openReport());await p.waitForTimeout(300);
  const rep=await E(()=>[...document.querySelectorAll("#ovReport .rnote")].map(x=>x.textContent).join(" | "));
  ok(/The Sleepy Volcano: 6 of 6 chapters/.test(rep),"report: "+(rep.match(/The Sleepy Volcano[^.]*/)||[""])[0]);
  await E(()=>Modes.shut(document.getElementById("ovReport")));
  ok(gemsUp(),"gems never went down, chapter by chapter: "+[4,5,6].map((c,i)=>"ch"+c+" "+gemLog.filter(x=>x[2]===i+1).map(x=>x[1]).join(">")).join(", "));

  // ---- 4 a dragon he already has: it levels up, and the gem rain still pays ----
  await seed(p,save(5,6,{critters:[{id:"dog",c:14,r:8,seed:1},{id:"dragon",c:10,r:8,seed:2,lv:1}]}));await clear();
  const g7=await E(()=>state.gems);
  await E(()=>{state.quest2.active={type:"spell",found:[],spots:null};Quest2._finish();});await p.waitForTimeout(300);
  const w7=await win(),g7b=await E(()=>({gems:state.gems,d:state.critters.filter(c=>c.id==="dragon"),ch:state.quest2.ch}));
  ok(g7b.ch===6&&g7b.d.length===1&&g7b.d[0].lv===2&&g7b.gems===g7+48,"a second dragon levels the first one up, and 48 gems land: "+JSON.stringify(g7b)+" from "+g7);
  ok(w7&&/dragon leveled up/.test(w7.msg)&&/rained 20 gems/.test(w7.msg),"win sheet: "+(w7&&w7.msg));
  await p.click("#qOk");await p.waitForTimeout(400);await nexts(await E(()=>Quest2.END.length));

  // ---- 5 every line decodable at its level, and in the voice list ----
  const dec=await E(()=>{const out=[];
    Quest2.CH.forEach((c,i)=>{const lines=[c.title].concat(c.story);
      // the new chapters: what else he reads there (the lock, the chest, the spell prompt) too
      if(i>=3)[c.prompt,c.lockTitle,c.chest].forEach(x=>{if(x)lines.push(x);});
      lines.forEach(x=>out.push({ch:i+1,lvl:c.lvl,x}));});
    const last=Quest2.CH[Quest2.CH.length-1].lvl;Quest2.END.forEach(x=>out.push({ch:"END",lvl:last,x}));
    return out.map(o=>Object.assign(o,{bad:Decode.check(o.x,o.lvl).filter(w=>!w.ok).map(w=>w.w+":"+w.t).join(" ")}));});
  [1,2,3,4,5,6,"END"].forEach(ch=>{const ls=dec.filter(d=>d.ch===ch),bad=ls.filter(d=>d.bad);
    ok(ls.length&&!bad.length,`${ch==="END"?"the END":"chapter "+ch}: all ${ls.length} lines decodable at level ${ls[0]&&ls[0].lvl}${bad.length?" — "+bad.map(d=>d.x+" ("+d.bad+")").join("; "):""}`);});
  const long=dec.filter(d=>d.x.length>60&&(d.ch==="END"||d.ch>=4));
  ok(!long.length,"no line in chapters 4-6 or the END is over 60 characters"+(long.length?": "+long.map(d=>d.x).join(" / "):""));
  ok(await E(()=>/Puff/.test(Quest2.END.join(" "))&&Decode.tier("Puff")<=3),"Puff decodes on its own (level "+await E(()=>Decode.tier("Puff"))+")");
  const texts=JSON.parse(fs.readFileSync(path.join(__dirname,"../tools/voice/voice_texts.json"),"utf8")).sents;
  const lines=await E(()=>[].concat(...Quest2.CH.map(c=>c.story),Quest2.END));
  const miss=lines.filter(x=>!texts.includes(x));
  ok(!miss.length,`every story and END line is in voice_texts.json (${lines.length})${miss.length?": missing "+miss.join(" / "):""}`);
  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.slice(0,5).join(" | "):""));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
