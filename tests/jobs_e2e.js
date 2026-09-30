// Jobs: every registered job × task type through its kits (answered via dataset.ans), pay once per task, a double tap
// ignored, a wrong answer takes nothing away (and the answer glows after a second miss), the tip, clock in and out,
// the 5-task moment, XP and job levels, the Job board in Adventure, old saves without the fields, and every reading
// text a generator can make decodes at the job's level (the words on order cards, mailboxes and street signs too). It walks
// Jobs.list(), so a new job is tested with no new code. Also the order kit from the keyboard, and its cards' size.
const {launch,seed,reload,waitFor,check}=require("./lib");
(async()=>{
  const T=check("jobs"),ok=T.ok;
  const {page:p,errs,close}=await launch({seed:{settings:{goal:0}}});
  const E=(f,a)=>p.evaluate(f,a);
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  await tidy();
  // answer the kit in the job host: right, the last tap again (a double tap), wrong on purpose, and is the answer glowing
  const helpers=()=>E(()=>{window.__job={
    host:()=>document.getElementById("jQ"),
    right(h){const k=h.dataset.kit,a=h.dataset.ans;
      if(k==="pick"){h.querySelector(`[data-w="${a}"]`).click();return k;}
      if(k==="pad"){for(const c of a)h.querySelector(`[data-key="${c}"]`).click();h.querySelector('[data-key="ok"]').click();return k;}
      if(k==="path"){for(const c of a)h.querySelector(`[data-dir="${c}"]`).click();return k;}
      // order: a placed card in the wrong place goes back, then each empty place gets its card, then ✓
      if(k==="order"){const A=a.split("|"),slot=i=>h.querySelectorAll(".jorow .joslot")[i];
        for(let i=0;i<A.length;i++){const c=slot(i).querySelector(".jocard");if(c&&c.dataset.w!==A[i])c.click();}
        for(let i=0;i<A.length;i++)if(!slot(i).querySelector(".jocard")){const c=[...h.querySelectorAll(".jopool .jocard")].find(x=>x.dataset.w===A[i]);if(c)c.click();}
        h.querySelector('[data-act="check"]').click();return k;}
      return "none";},
    again(h){const k=h.dataset.kit,a=h.dataset.ans;
      if(k==="pick")h.querySelector(`[data-w="${a}"]`).click();
      if(k==="pad")h.querySelector('[data-key="ok"]').click();
      if(k==="path")h.querySelector(`[data-dir="${a.slice(-1)}"]`).click();
      if(k==="order")h.querySelector('[data-act="check"]').click();},
    wrong(h){const k=h.dataset.kit,a=h.dataset.ans;
      if(k==="pick"){[...h.querySelectorAll(".jopt")].find(b=>b.dataset.w!==a).click();return;}
      if(k==="pad"){for(const c of String((+a+1)%100))h.querySelector(`[data-key="${c}"]`).click();h.querySelector('[data-key="ok"]').click();return;}
      if(k==="path")h.querySelector(`[data-dir="${["L","R","U","D"].find(x=>x!==a[0])}"]`).click();
      // order: the empty places filled back to front, so the first of them is wrong
      if(k==="order"){const A=a.split("|"),empty=[...h.querySelectorAll(".jorow .joslot")].map((s,i)=>s.querySelector(".jocard")?-1:i).filter(i=>i>=0);
        empty.map(i=>A[i]).reverse().forEach(v=>{const c=[...h.querySelectorAll(".jopool .jocard")].find(x=>x.dataset.w===v);if(c)c.click();});
        h.querySelector('[data-act="check"]').click();}},
    hinted(h){const k=h.dataset.kit,a=h.dataset.ans;
      if(k==="pick")return h.querySelector(`[data-w="${a}"]`).classList.contains("hint");
      if(k==="pad")return !!h.querySelector(`.jkey.hint[data-key="${a[0]}"]`);
      if(k==="path")return !!h.querySelector(`.jarrow.hint[data-dir="${a[0]}"]`);
      if(k==="order"){const A=a.split("|"),i=[...h.querySelectorAll(".jorow .joslot")].findIndex(s=>!s.querySelector(".jocard"));
        return i>=0&&!!h.querySelector(`.jopool .jocard.hint[data-w="${CSS.escape(A[i])}"]`);}
      return false;}};});
  await helpers();
  const S=()=>E(()=>Jobs._S());
  // wait for a question on screen (after a task the next one comes by itself; at a 5-task moment, keep going)
  async function ready(){
    const r=await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");
      if(document.getElementById("jGo"))return "moment";return s&&s.task&&h&&h.dataset.ans?"task":false;},{timeout:8000});
    if(r==="moment"){await waitFor(p,"#jGo");await E(()=>document.getElementById("jGo").click());return ready();}
    return r;
  }
  // answer every step of the task on screen; returns the kits used
  async function doTask({double=false}={}){
    const n0=(await S()).n,kits=[];
    for(let k=0;k<6;k++){
      const at=await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&h&&h.dataset.ans?{i:s.task.i,kit:h.dataset.kit}:false;},{timeout:6000});
      if(!at)break;
      kits.push(at.kit);
      await E(dbl=>{const h=__job.host();__job.right(h);if(dbl)__job.again(h);},double);
      const moved=await waitFor(p,([n,i])=>{const s=Jobs._S();return s&&(s.n>n||(s.task&&s.task.i>i));},{arg:[n0,at.i],timeout:6000});
      if(!moved)break;
      if((await S()).n>n0)return kits;
    }
    return kits;
  }
  const clockIn=async(id)=>{
    await p.click("#jobsBtn");await waitFor(p,`#ovJob.on .jcard[data-job="${id}"]`);
    await p.click(`#ovJob .jcard[data-job="${id}"]`);await waitFor(p,"#ovJob #jIn");
    await p.click("#ovJob #jIn");return ready();
  };
  const clockOut=async()=>{await waitFor(p,"#jOut");await E(()=>document.getElementById("jOut").click());await waitFor(p,"#ovJob #jHome");
    await waitFor(p,"#jHome");await E(()=>document.getElementById("jHome").click());await waitFor(p,()=>Modes.top()==="valley");};

  // 0. the registry
  const JOBS=await E(()=>Jobs.list().map(j=>({id:j.id,name:j.name,tier:j.unlock.tier,pay:j.pay,tasks:j.tasks.map(t=>({id:t.id,lv:t.lv}))})));
  ok(JOBS.length>=4&&JOBS.some(j=>j.id==="shop"&&j.tier===2)&&JOBS.some(j=>j.id==="mow"&&j.tier===4)&&JOBS.some(j=>j.id==="mail"&&j.tier===3)&&JOBS.some(j=>j.id==="baker"&&j.tier===4),
    "jobs registered: "+JOBS.map(j=>`${j.id} (level ${j.tier}, ${j.tasks.length} tasks)`).join(", "));
  ok(await E(()=>JSON.stringify(Jobs.LEVELS))==="[0,5,15,30,50]","job levels at 0, 5, 15, 30, 50 tasks");
  ok(JOBS.find(j=>j.id==="mail").pay.perTask===3&&JOBS.find(j=>j.id==="mail").pay.streakTip===5&&JOBS.find(j=>j.id==="baker").pay.perTask===4&&JOBS.find(j=>j.id==="baker").pay.streakTip===6,
    "the Mail carrier pays 3 🪙 (tip 5), the Baker 4 🪙 (tip 6)");
  ok(await E(()=>["mail","baker"].every(id=>[2,3,4,5].every(lv=>BADGES.some(b=>b.id==="job_"+id+"_"+lv)))),"both have a badge for job levels 2 to 5");
  ok(await E(()=>Jobs.canClockIn(Jobs.get("shop"))===true),"clocking in is free (no ticket gate yet)");
  ok(await E(()=>JSON.stringify(state.jobs)===JSON.stringify({current:null,xp:{},tasks:0,streak:0})&&JSON.stringify(state.tracks)==="{}"),
    "the seed save (no jobs or tracks) gets the defaults");

  // 1. every reading text a generator can make decodes at the job's level (200 seeds per task there, 40 at each level above);
  //    every step has a kit, pick answers are among the choices, and the same seed makes the same task
  const G=await E(()=>{const bad=[],kits=new Set(),n={texts:0};
    Jobs.list().forEach(j=>j.tasks.forEach(t=>{for(let tier=j.unlock.tier;tier<=MAX_TIER;tier++)for(let s=0;s<(tier===j.unlock.tier?200:40);s++){
      const st=Jobs.gen(j.id,t.id,s,{tier,lv:t.lv});
      if(!st.length){bad.push(`${j.id}/${t.id} made nothing (tier ${tier}, seed ${s})`);continue;}
      if(JSON.stringify(st)!==JSON.stringify(Jobs.gen(j.id,t.id,s,{tier,lv:t.lv})))bad.push(`${j.id}/${t.id} seed ${s} is not the same twice`);
      if(st[0].track!=="reading"||!st[0].read)bad.push(`${j.id}/${t.id} does not start with reading`);
      st.forEach(q=>{kits.add(q.kit);if(!Jobs.KITS[q.kit])bad.push("no kit "+q.kit);
        if(q.read){n.texts++;const miss=Decode.check(q.text,tier).filter(x=>!x.ok);if(miss.length)bad.push(`${j.id}/${t.id} at ${tier}: "${q.text}" needs ${miss.map(x=>x.w+" ("+x.t+")").join(", ")}`);}
        if(q.kit==="pick"&&!(q.choices||[]).some(c=>String(c&&typeof c==="object"?c.v:c)===String(q.ans)))bad.push(`${j.id}/${t.id}: ${q.ans} not in its choices`);
        if(q.kit==="order"){const cv=(q.choices||[]).map(c=>String(c&&typeof c==="object"?c.v:c)),av=[].concat(q.ans).map(String);
          if(av.length<2||av.length!==cv.length||new Set(cv).size!==cv.length||av.slice().sort().join("|")!==cv.slice().sort().join("|"))bad.push(`${j.id}/${t.id}: the order ${av} is not its cards ${cv}`);
          if(cv.join("|")===av.join("|"))bad.push(`${j.id}/${t.id}: the cards start out in order`);}
        (q.choices||[]).map(c=>c&&typeof c==="object"?(q.kit==="order"?c.text:c.art&&(c.art.name||c.art.text)):null).filter(x=>x!=null).forEach(x=>{n.texts++;
          const miss=Decode.check(String(x),tier).filter(y=>!y.ok);if(miss.length)bad.push(`${j.id}/${t.id} at ${tier}: the card "${x}" needs ${miss.map(y=>y.w+" ("+y.t+")").join(", ")}`);});
        if(q.math){const m=q.math,f=w=>String(w).charAt(0).toUpperCase(),want=m.op==="+"?m.a+m.b:m.op==="-"?m.a-m.b:m.op==="×"?m.a*m.b:m.op==="count"?m.n:m.op==="coins"?m.coins.reduce((x,y)=>x+y,0):
            m.op==="house"?m.n:m.op==="place"?m.tens*10+m.ones:m.op==="frac"?m.of:m.op==="time"?m.start+m.add:m.op==="seq"?m.steps.join("|"):
            m.op==="abc"?m.words.slice().sort((x,y)=>f(x)<f(y)?-1:f(x)>f(y)?1:0).join("|"):m.op==="sort"?m.nums.slice().sort((x,y)=>x-y).join("|"):null;
          if(want==null||String(want)!==[].concat(q.ans).join("|"))bad.push(`${j.id}/${t.id}: ${JSON.stringify(m)} gives ${want}, not ${q.ans}`);}
        if(q.kit==="path"){let c=q.start.c,r=q.start.r;const seen={};seen[c+","+r]=1;
          for(const d of q.ans){c+=d==="L"?-1:d==="R"?1:0;r+=d==="U"?-1:d==="D"?1:0;
            if(c<0||r<0||c>=q.grid.w||r>=q.grid.h)bad.push(`${j.id}/${t.id}: the path leaves the lawn`);
            if(seen[c+","+r])bad.push(`${j.id}/${t.id}: the path crosses itself`);seen[c+","+r]=1;}}});}}));
    return{bad,kits:[...kits].sort(),n:n.texts};});
  ok(!G.bad.length,`every generated task: ${G.n} reading texts decode at their level, answers right, same seed same task`+(G.bad.length?" — "+G.bad.slice(0,5).join(" | "):""));
  ok(G.kits.join()==="order,pad,path,pick","the jobs use all four kits: "+G.kits);
  // the Mail carrier's letters at level 3, and the Baker's recipes at level 4, read only words of that level
  const mailWords=await E(()=>{const w=new Set();for(let s=0;s<200;s++)Jobs.list().find(j=>j.id==="mail").tasks.forEach(t=>Jobs.gen("mail",t.id,s,{tier:3,lv:t.lv}).forEach(q=>{
    [q.read?q.text:""].concat((q.choices||[]).map(c=>c&&typeof c==="object"?(c.text||c.art&&(c.art.name||c.art.text)):"")).forEach(x=>Decode.words(String(x||"")).forEach(y=>w.add(y)));}));
    return [...w].sort();});
  ok(mailWords.length>20&&await E(ws=>ws.every(x=>Decode.tier(x)<=3),mailWords)&&mailWords.indexOf("Asher")>=0,
    `Mail carrier at level 3: ${mailWords.length} words on its letters, mailboxes, signs and notes, all level 3 or below, his own name among them: ${mailWords.slice(0,24).join(" ")}…`);
  const bake=await E(()=>{const one=Jobs.gen("baker","steps",1,{tier:4,lv:1})[0];return{kit:one.kit,track:one.track,also:one.also,level:one.level||null,n:one.choices.length,
    texts:[0,1,2,3,4,5,6,7,8,9,10,11].map(s=>Jobs.gen("baker","steps",s,{tier:4,lv:1})[0].text)};});
  ok(bake.kit==="order"&&bake.track==="reading"&&bake.level===null&&JSON.stringify(bake.also)===JSON.stringify({track:"math",level:"seq"})&&bake.n===3,
    "the Baker's first task is a recipe's 3 steps to put in order: reading, and Putting steps in order (also) "+JSON.stringify(bake.also)+" · "+[...new Set(bake.texts)].join(", "));
  const words=await E(()=>{const t=new Set();for(let s=0;s<200;s++)t.add(Jobs.gen("mow","mow",s,{tier:4,lv:1})[0].text.replace(/\d/g,"#"));
    const w=new Set();t.forEach(x=>Decode.words(x).forEach(y=>w.add(y.toLowerCase())));return [...w].sort();});
  ok(words.join(",")==="down,go,then,up","Lawn mower at level 4 reads only go, then, up and down (left and right are arrows): "+words.join(","));
  ok(await E(()=>/\bleft\b|\bright\b/.test([0,1,2,3,4,5,6,7,8,9].map(s=>Jobs.gen("mow","mow",s,{tier:7,lv:1})[0].text).join(" "))),
    "at level 7, where right decodes, the notes say left and right");

  // 2. a locked job says when it opens
  await E(()=>{state.settings.tierOverride=2;});
  await p.click("#jobsBtn");await waitFor(p,"#ovJob.on .jcard");
  const cards=await E(()=>[...document.querySelectorAll("#ovJob .jcard")].map(c=>({job:c.dataset.job||null,locked:c.classList.contains("locked"),t:c.textContent.replace(/\s+/g," ").trim()})));
  ok(cards.some(c=>c.job==="shop"&&!c.locked)&&cards.some(c=>c.locked&&/Lawn mower/.test(c.t)&&/Opens at level 4/.test(c.t)&&!c.job),
    "at level 2 the Shopkeeper is open and the Lawn mower says “Opens at level 4”: "+cards.map(c=>c.t).join(" | "));
  ok(cards.some(c=>c.locked&&/Mail carrier/.test(c.t)&&/Opens at level 3/.test(c.t)&&!c.job)&&cards.some(c=>c.locked&&/Baker/.test(c.t)&&/Opens at level 4/.test(c.t)&&!c.job),
    "…the Mail carrier says “Opens at level 3” and the Baker “Opens at level 4”");
  await waitFor(p,"#jX");await E(()=>document.getElementById("jX").click());await waitFor(p,()=>Modes.top()==="valley");
  await E(()=>{state.settings.tierOverride=3;});
  await p.click("#jobsBtn");await waitFor(p,"#ovJob.on .jcard");
  ok(await E(()=>!!document.querySelector('#ovJob .jcard[data-job="mail"]')&&!!document.querySelector("#ovJob .jcard.locked")&&
    [...document.querySelectorAll("#ovJob .jcard.locked")].every(c=>/Opens at level 4/.test(c.textContent))),"at level 3 the Mail carrier opens");
  ok(await E(()=>Modes.top()==="job"),"the Job board is the job mode");
  await waitFor(p,"#jX");await E(()=>document.getElementById("jX").click());await waitFor(p,()=>Modes.top()==="valley");

  // 3. every job × task type: right answers (with a double tap on the last one) pay once
  const kitsUsed=new Set();
  for(const j of JOBS){
    await E(([id,tier])=>{state.settings.tierOverride=tier;state.jobs.xp[id]=Jobs.LEVELS[Jobs.LEVELS.length-1];state.jobs.current=null;},[j.id,j.tier]);
    const r=await clockIn(j.id);
    ok(r==="task"&&await E(id=>state.jobs.current===id&&document.getElementById("jobsBadge").classList.contains("on"),j.id),
      `${j.name}: Clock in starts a shift (state.jobs.current, ⏰ on the dock button)`);
    ok(await E(()=>!!document.querySelector("#ovJob .juni")),`${j.name}: the uniform is on`);
    for(const t of j.tasks){
      await ready();
      await E(id=>{state.jobs.streak=0;Jobs._next(id);},t.id);
      const before=await E(id=>({coins:state.mine.coins,xp:state.jobs.xp[id],tasks:state.jobs.tasks,read:state.wordsRead}),j.id);
      const kits=await doTask({double:true});kits.forEach(k=>kitsUsed.add(k));
      await p.waitForTimeout(700);   // a late second tap would land now
      const after=await E(id=>({coins:state.mine.coins,xp:state.jobs.xp[id],tasks:state.jobs.tasks,read:state.wordsRead}),j.id);
      ok(after.coins-before.coins===j.pay.perTask&&after.xp===before.xp+1&&after.tasks===before.tasks+1,
        `${j.name} / ${t.id} [${kits.join(" → ")}]: paid ${after.coins-before.coins} 🪙 once for a double-tapped task (pay ${j.pay.perTask}), XP ${before.xp}→${after.xp}`);
      ok(after.read===before.read+1,`${j.name} / ${t.id}: the order or note read right counts as a word read`);
    }
    // wrong answers, at every step of the last task type (the reading, then its math): the customer waits, nothing is
    // taken away, the same question stays, and after a second miss the right answer glows
    await ready();
    const last=j.tasks[j.tasks.length-1].id;
    const w0=await E(id=>{state.jobs.streak=3;Jobs._next(id);return{coins:state.mine.coins,n:Jobs._S().n,steps:Jobs._S().task.steps};},last);
    for(let st=0;st<w0.steps;st++){
      await waitFor(p,i=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&s.task.i===i&&h&&h.dataset.ans;},{arg:st,timeout:6000});
      const a=await E(()=>({ans:__job.host().dataset.ans,kit:__job.host().dataset.kit}));
      await E(()=>__job.wrong(__job.host()));await p.waitForTimeout(250);
      const w1=await E(()=>({coins:state.mine.coins,ans:__job.host().dataset.ans,msg:document.getElementById("jMsg").textContent,hint:__job.hinted(__job.host())}));
      ok(w1.coins===w0.coins&&w1.ans===a.ans&&/waits a moment/.test(w1.msg)&&!w1.hint,
        `${j.name} / ${last} step ${st+1} (${a.kit}): a wrong answer takes nothing away — “${w1.msg}”, the same question stays`);
      await E(()=>__job.wrong(__job.host()));await p.waitForTimeout(250);
      const w2=await E(()=>({hint:__job.hinted(__job.host()),msg:document.getElementById("jMsg").textContent,coins:state.mine.coins}));
      ok(w2.hint&&/glows/.test(w2.msg)&&w2.coins===w0.coins,`${j.name} / ${last} step ${st+1} (${a.kit}): after a second miss the right answer glows — “${w2.msg}”`);
      await E(()=>__job.right(__job.host()));
      await waitFor(p,([n,i])=>{const s=Jobs._S();return s&&(s.n>n||(s.task&&s.task.i>i));},{arg:[w0.n,st],timeout:6000});
    }
    await p.waitForTimeout(200);
    const w3=await E(()=>({coins:state.mine.coins,streak:state.jobs.streak,n:Jobs._S().n}));
    ok(w3.coins===w0.coins+j.pay.perTask&&w3.streak===0&&w3.n===w0.n+1,`${j.name}: the task still pays ${j.pay.perTask} 🪙 when he gets there; the run of five starts again (streak ${w3.streak})`);
    // five right first time in a row: a tip
    await ready();
    const t0=await E(()=>{state.jobs.streak=4;return{coins:state.mine.coins,tips:Jobs._S().tips};});
    await doTask();await p.waitForTimeout(200);
    const t1=await E(()=>({coins:state.mine.coins,tips:Jobs._S().tips,streak:state.jobs.streak}));
    ok(t1.coins-t0.coins===j.pay.perTask+j.pay.streakTip&&t1.tips===t0.tips+1&&t1.streak===0,
      `${j.name}: the fifth right in a row pays ${j.pay.perTask} + a ${j.pay.streakTip} 🪙 tip (got ${t1.coins-t0.coins})`);
    await clockOut();
    ok(await E(()=>state.jobs.current===null&&!document.getElementById("jobsBadge").classList.contains("on")),`${j.name}: Clock out ends the shift`);
  }
  ok(["pick","pad","path","order"].every(k=>kitsUsed.has(k)),"the shifts used every kit: "+[...kitsUsed].join(", "));

  // 3b. the order kit: cards at least 56 px tall, a placed card tapped goes back, and the keyboard (arrows, Space, Enter);
  //     and the Mail carrier's street map
  await E(()=>{state.settings.tierOverride=3;state.jobs.xp.mail=Jobs.LEVELS[Jobs.LEVELS.length-1];state.jobs.current=null;state.jobs.streak=0;});
  await clockIn("mail");
  await E(()=>Jobs._next("walk"));
  await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&s.task.type==="walk"&&s.task.i===0&&h&&h.dataset.kit==="pick";},{timeout:6000});
  await E(()=>__job.right(__job.host()));
  const map=await waitFor(p,()=>{const h=document.getElementById("jQ");return h&&h.dataset.kit==="path"?{street:!!h.querySelector(".jlawn.street"),goal:h.querySelectorAll(".jcell.goal").length,text:h.querySelector(".jtext").textContent.replace(/\s+/g," ").trim()}:false;},{timeout:6000});
  ok(map&&map.street&&map.goal===1&&/^Go \d/.test(map.text),"Mail carrier level 3: the street map, with the house to walk to — “"+(map&&map.text)+"”");
  await E(()=>__job.right(__job.host()));
  await waitFor(p,()=>{const s=Jobs._S();return s&&!s.task||document.getElementById("jGo");},{timeout:6000});
  await ready();
  await E(()=>Jobs._next("abc"));
  await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&s.task.type==="abc"&&s.task.i===0&&h&&h.dataset.kit==="pick";},{timeout:6000});
  const k0=await E(()=>({coins:state.mine.coins,n:Jobs._S().n}));
  await E(()=>__job.right(__job.host()));
  const ord=await waitFor(p,()=>{const h=document.getElementById("jQ");return h&&h.dataset.kit==="order"?h.dataset.ans:false;},{timeout:6000});
  const A=String(ord).split("|");
  const sizes=await E(()=>[...document.querySelectorAll("#jQ .jocard,#jQ .jogap")].map(b=>Math.round(b.getBoundingClientRect().height)));
  ok(A.length===3&&sizes.length===6&&sizes.every(x=>x>=56),"the order kit: 3 cards and 3 places, each at least 56 px tall ("+sizes.join(", ")+")");
  const slotsNow=()=>E(()=>[...document.querySelectorAll("#jQ .jorow .joslot")].map(s=>{const c=s.querySelector(".jocard");return c?c.dataset.w:"";}));
  const poolNow=()=>E(()=>[...document.querySelectorAll("#jQ .jopool .jocard")].map(c=>c.dataset.w));
  // with the arrows to a card, Space puts it in the next place
  const keyTo=async v=>{for(let k=0;k<8;k++){const at=await E(()=>{const c=document.querySelector("#jQ .jocard.cur");return c?c.dataset.w:null;});if(at===v)return true;await p.keyboard.press("ArrowRight");}return false;};
  await p.keyboard.press("ArrowRight");
  const found=await keyTo(A[0]);await p.keyboard.press("Space");
  let sl=await slotsNow();
  ok(found&&sl[0]===A[0]&&sl[1]===""&&(await poolNow()).indexOf(A[0])<0,"arrows move the cursor, Space puts the card in the first place: "+sl.join(" | "));
  // a tap on a placed card puts it back
  await E(v=>document.querySelector(`#jQ .jorow .jocard[data-w="${CSS.escape(v)}"]`).click(),A[0]);
  sl=await slotsNow();
  ok(sl.every(x=>x==="")&&(await poolNow()).indexOf(A[0])>=0,"a tap on a placed card puts it back with the others");
  for(const v of A){await keyTo(v);await p.keyboard.press("Space");}
  sl=await slotsNow();
  ok(sl.join("|")===A.join("|"),"…and the keyboard puts all three in order: "+sl.join(" < "));
  await p.keyboard.press("Enter");
  const k1=await waitFor(p,n=>{const s=Jobs._S();return s&&s.n>n?{coins:state.mine.coins,n:s.n}:false;},{arg:k0.n,timeout:6000});
  ok(k1&&k1.coins===k0.coins+3,"Enter checks: right, and the task pays 3 🪙 ("+(k1&&k1.coins-k0.coins)+")");
  await clockOut();

  // 4. the 5-task moment, a summary at clock out (five right first time: the fifth has a tip)
  await E(()=>{state.settings.tierOverride=2;state.jobs.xp.shop=5;state.jobs.streak=0;});
  await clockIn("shop");
  for(let k=0;k<5;k++){await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&h&&h.dataset.ans;},{timeout:8000});await doTask();}
  const mo=await waitFor(p,()=>document.getElementById("jGo")&&document.getElementById("jStop")?Jobs._S():false,{timeout:5000});
  ok(mo&&mo.n===5&&!mo.task&&mo.coins===5*3+5&&mo.tips===1,"after 5 tasks: a cheer and “Keep going or clock out?” ("+await E(()=>(document.querySelector("#jQ .jmoment")||{}).textContent.replace(/\s+/g," ").trim())+") "+JSON.stringify(mo));
  await waitFor(p,"#jGo");await E(()=>document.getElementById("jGo").click());
  ok(await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&h&&h.dataset.ans;}),"Keep going brings the next customer");
  await waitFor(p,"#jOut");await E(()=>document.getElementById("jOut").click());await waitFor(p,"#ovJob #jHome");
  const sum=await E(()=>document.querySelector("#ovJob .sheet").textContent.replace(/\s+/g," "));
  ok(/Great work today!/.test(sum)&&/5 tasks · \+20 🪙/.test(sum)&&/1 tip/.test(sum),"clock out shows the shift: "+sum.trim().slice(0,70));
  await waitFor(p,"#jHome");await E(()=>document.getElementById("jHome").click());await waitFor(p,()=>Modes.top()==="valley");

  // 5. XP and a level up: the next task type and a badge
  await E(()=>{state.jobs.xp.shop=4;state.badges=state.badges.filter(b=>!/^job_/.test(b));});
  ok(await E(()=>Jobs.level("shop")===1),"4 Shopkeeper tasks: level 1");
  await clockIn("shop");
  ok(await E(()=>Jobs._S().task.type==="order"),"at level 1 the only task is reading orders");
  await doTask();
  const lu=await waitFor(p,()=>document.getElementById("jGo")?document.querySelector("#jQ .jmoment").textContent:false,{timeout:5000});
  ok(lu&&/Shopkeeper level 2/.test(lu)&&/New: counting/.test(lu),"the 5th task: level 2 opens counting — "+String(lu).replace(/\s+/g," ").trim());
  await E(()=>checkBadges());
  ok(await E(()=>state.badges.includes("job_shop_2")&&BADGES.some(b=>b.id==="job_shop_2"&&/Shopkeeper level 2/.test(b.n))),"…and a Shopkeeper level 2 badge in the sticker book");
  const types=await E(()=>{const s={};for(let k=0;k<60;k++){Jobs._next();s[Jobs._S().task.type]=1;}return Object.keys(s).sort();});
  ok(types.join()==="count,order","at level 2 the tasks are reading orders and counting: "+types);
  await clockOut();

  // 6. a shift survives closing the app: the button still shows ⏰ and the board goes straight back to work
  await E(()=>{state.settings.tierOverride=4;});
  await clockIn("mow");await E(()=>saveNow());await p.waitForTimeout(400);
  await reload(p);await tidy();
  ok(await E(()=>state.jobs.current==="mow"&&document.getElementById("jobsBadge").classList.contains("on")),"after a reload he is still clocked in (⏰ on the dock button)");
  await helpers();
  await p.click("#jobsBtn");
  ok(await ready()==="task"&&await E(()=>Jobs._S().job==="mow"),"the 💼 button goes straight back to the shift");
  await clockOut();

  // 7. the Job board in Adventure
  await p.click("#advBtn");await waitFor(p,()=>Modes.top()==="adventure");
  await E(()=>{const b=Jobs.boardAt();Adv._P.c=b.c;Adv._P.r=b.r;});
  const lab=await waitFor(p,()=>/Job board/.test(document.getElementById("advAct").textContent)&&document.getElementById("advAct").textContent);
  ok(lab&&await E(()=>!!document.querySelector(".tile.spot.jboard")),"Adventure has a Job board signpost: "+lab);
  await p.click("#advAct");
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure>job"),"walking up to it opens the Job board: "+await E(()=>Modes.stack().join(">")));
  await waitFor(p,"#jX");await E(()=>document.getElementById("jX").click());await waitFor(p,()=>Modes.top()==="adventure");
  await p.click("#advDone");await waitFor(p,()=>Modes.top()==="valley");

  // 8. Where the time goes: jobs are counted as their own mode
  ok(await E(()=>(state.modeOpens[today()]||{}).job>=1),"opens of the Job board are counted in modeOpens.job ("+await E(()=>(state.modeOpens[today()]||{}).job)+")");
  ok(await E(()=>{const t=state.tracks.math&&state.tracks.math.stats;return !!(t&&t.count10&&t.count10.seen>0&&t.add10&&t.coins20);}),
    "math answers are kept per level in state.tracks: "+await E(()=>JSON.stringify(state.tracks)));
  ok(await E(()=>{const t=state.tracks.math.stats;return ["place","alpha","seq","frac","time"].every(k=>t[k]&&t[k].seen>0)&&!(state.tracks.reading&&state.tracks.reading.stats&&state.tracks.reading.stats.seq);}),
    "…the Mail carrier's and the Baker's too (house numbers, ABC order, the recipe's steps in order, cups, clocks): "+await E(()=>["place","alpha","seq","frac","time"].map(k=>k+" "+JSON.stringify((state.tracks.math.stats[k]||{}).seen)).join(", ")));

  // 9. old saves
  const oldSave=async(label,partial,want)=>{
    await seed(p,partial,{settle:600});
    const got=await E(()=>JSON.stringify({jobs:state.jobs,tracks:state.tracks}));
    ok(got===JSON.stringify(want),`${label}: ${got}`);};
  await oldSave("a save from before Jobs gets the fields",{jobs:undefined,tracks:undefined},{jobs:{current:null,xp:{},tasks:0,streak:0},tracks:{}});
  await oldSave("saved nulls are re-made",{jobs:null,tracks:null},{jobs:{current:null,xp:{},tasks:0,streak:0},tracks:{}});
  await oldSave("a part-filled jobs keeps what it has",{jobs:{xp:{shop:7}},tracks:{math:{stats:{add10:{seen:2,right:1}}}}},
    {jobs:{xp:{shop:7},current:null,tasks:0,streak:0},tracks:{math:{stats:{add10:{seen:2,right:1}}}}});
  await oldSave("a shift at a job this version doesn't have is over, its XP kept",{jobs:{current:"janitor",xp:{janitor:3},tasks:3,streak:1}},
    {jobs:{current:null,xp:{janitor:3},tasks:3,streak:1},tracks:{}});
  await oldSave("a shift at the Mail carrier is kept",{jobs:{current:"mail",xp:{mail:3},tasks:3,streak:1}},
    {jobs:{current:"mail",xp:{mail:3},tasks:3,streak:1},tracks:{}});
  ok(await E(()=>state.mine.coins===40),"old saves keep the Mine's purse");

  // 10. no errors
  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL jobs suite crashed: "+(e&&e.stack||e));process.exit(1);});
