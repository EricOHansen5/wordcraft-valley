// What has opened stays open. The words he is given follow currentTier(), which falls back when a few easy words are
// missed (it judges his last 20 goes at a level); the jobs, dungeons, storybooks and quest chapters follow reachedTier(),
// the highest level he has reached. A save from before reachedTier() starts from the words he has mastered.
"use strict";
const {launch,check}=require("./lib");
(async()=>{
  const t=check("tier"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768}});
  // a save made in the page: n words mastered at each level, and his last 20 goes at each level (1 right first time, 0 not)
  const make=o=>E(o=>{
    state.stats={};state.recent={};delete state.tierReached;state.settings.tierOverride=0;
    Object.keys(o.master||{}).forEach(tt=>{allWords().filter(w=>w.t===+tt&&!w.tricky).slice(0,o.master[tt]).forEach(w=>{state.stats[w.w]={seen:12,first:11,mastered:true};});});
    Object.keys(o.recent||{}).forEach(tt=>{state.recent[tt]=o.recent[tt].split("").map(Number);});
    if(o.reached)state.tierReached=o.reached;
  },o);
  // (the dungeons use reachedTier() too, but the one dungeon so far opens at level 1)
  const look=()=>E(()=>{const lib=Jobs.get("library");
    return{cur:currentTier(),reached:reachedTier(),saved:state.tierReached,library:Jobs.isOpen(lib)};});
  const good="11111111111111111111",dip="11101110111101101111";

  // he reads well: level 3, and that is remembered
  await make({master:{1:16,2:15},recent:{1:good,2:good,3:good}});
  const a=await look();
  ok(a.cur===3&&a.reached===3&&a.saved===3,"reading well at level 3: reached level 3, saved "+J(a));
  ok(a.library,"the level-3 job is open "+J(a));
  // a few misses on easy words: his words fall back to level 1, what opened stays open
  await E(d=>{state.recent[1]=d.split("").map(Number);},dip);
  const b=await look();
  ok(b.cur===1,"a few misses bring his words back to level 1 "+J(b));
  ok(b.reached===3&&b.library,"...but the level-3 job stays open "+J(b));
  await E(()=>Jobs.open());await p.waitForTimeout(400);
  const cards=await E(()=>document.querySelectorAll("#ovJob .jcard[data-job]").length);
  ok(cards>=8,"the Job board still has its jobs to pick ("+cards+")");
  await E(()=>Jobs.close());await p.waitForTimeout(300);
  // ...and every open job still has work at its own level (not "No customers right now", no "undefined")
  const shifts=await E(async()=>{const out=[];
    for(const j of Jobs.list().filter(x=>Jobs.isOpen(x))){Jobs.open();Jobs.clockIn(j.id);await new Promise(r=>setTimeout(r,1500));
      const o=document.getElementById("ovJob"),txt=o.innerText;
      out.push({id:j.id,task:!!o.querySelector("[data-ans]"),undef:/undefined|NaN/.test(txt),none:/No customers/.test(txt)});
      try{Jobs.clockOut();}catch(e){}Jobs.close();}
    return out;});
  const bad=shifts.filter(x=>!x.task||x.undef||x.none);
  ok(shifts.length>=8&&!bad.length,"every open job gives him a task at its level "+J(bad.length?bad:shifts.map(x=>x.id)));

  // a save from before this (his, 19 Oct): misses at level 1, but most of levels 1 and 2 mastered: it starts at level 3
  await make({master:{1:16,2:15,3:3},recent:{1:dip,2:"11111111111111101101",3:"01101110110111101101"}});
  const c=await look();
  ok(c.cur===1&&c.reached===3&&c.saved===3,"an older save starts from what he has mastered: level 3 "+J(c));
  // a brand-new player: level 1, the level-3 job not open yet, and nothing raised
  await make({});
  const d=await look();
  ok(d.reached===1&&!d.library,"a new player is at level 1 and the level-3 job is closed "+J(d));
  // a grown-up's level setting rules while it is set, and is not remembered as reached
  await make({master:{1:16,2:15},recent:{1:good,2:good},reached:2});
  await E(()=>{state.settings.tierOverride=5;});
  const e1=await E(()=>reachedTier());
  await E(()=>{state.settings.tierOverride=0;});
  const e2=await E(()=>({reached:reachedTier(),saved:state.tierReached}));
  ok(e1===5&&e2.reached===3&&e2.saved===3,"a grown-up's level setting is used while set and not kept "+J({e1,e2}));

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
