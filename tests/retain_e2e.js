// Retention reads: a tricky (heart) word is checked again 30 crates after it is mastered and
// 90 after that; a missed check sends it back to review (still mastered) until it is read clean.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8814,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  // this test server answers every path with the page, so keep the service worker out of it (its script would be HTML)
  const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,serviceWorkers:"block"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text());});
  // an old save from before retention reads: no `retain`. "the" is one clean Read-it away from mastery,
  // "dog" (a regular word) too, and "to" is a heart word mastered before retention reads existed.
  const near={seen:4,first:4,miss:0,mastered:false,rung:2,rungClean:0};
  const st={tour:99,guardians:[0,1],wordsRead:60,gems:20,crateCount:10,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{"6,8":{id:"cottage",seed:3,lv:1}},inventory:{},
    critters:[],vehicles:[{id:"v_car",c:10,r:8,lv:1,out:true,since:1}],adv:{seenIntro:1,dex:{}},
    stats:{the:{...near},dog:{...near},to:{seen:6,first:6,miss:0,mastered:true,rung:2,rungClean:1}},review:[],
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},
      owned:{miner:1,cap:1},made:true,pet:null,bosses:{},eggs:[]}};
  await p.goto("http://localhost:8814/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?"PASS ":"FAIL ")+m);};
  const E=(f,a)=>p.evaluate(f,a);const wait=ms=>p.waitForTimeout(ms);
  const J=x=>JSON.stringify(x);
  const clear=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  await clear();await E(()=>{state.settings.tierOverride=2;renderHUD();});
  // what the two schedules say about a word, and whether any word is on both
  const sched=w=>E(w=>({rt:state.retain.filter(r=>r.word===w),rv:state.review.filter(r=>r.word===w),n:state.crateCount,
    st:state.stats[w]||{},both:state.retain.filter(r=>state.review.some(q=>q.word===r.word)).map(r=>r.word)}),w);
  // read the word on screen at Read it: wait (so it is not a rushed guess), tap "I read it!" and,
  // for a word with a picture, prove it
  const readIt=async w=>{await wait(1100);await E(()=>document.querySelector("#picks .btn").click());await wait(300);
    await E(w=>{const b=document.querySelector(`#picks .pick[data-w="${w}"]`);if(b)b.click();},w);await wait(500);await clear();};
  // build the word on screen (Build it): wait, then tap its sound tiles in order
  const buildIt=async()=>{await wait(1100);
    await E(()=>{cur.p.forEach(ph=>{const t=[...document.querySelectorAll("#letterBank .lt:not(.used)")].find(x=>x.dataset.ph===ph);t.click();});});
    await wait(1500);await clear();};
  // open the crate row with chance pinned, so there are no bonus crates and every word opens at its own rung
  const openCrates=()=>E(()=>{const r=Math.random;Math.random=()=>0.99;try{document.getElementById("crateBtn").click();}finally{Math.random=r;}
    return [...document.querySelectorAll("#crateRow .crate")].map(c=>({cls:c.className,tag:(c.querySelector(".tagline")||{}).textContent||"",title:c.title,word:(c.querySelector(".w")||{}).textContent||""}));});

  // old save: the default is filled in
  ok(await E(()=>Array.isArray(state.retain)&&state.retain.length===0),"old save gets retain: [] by default");

  // 1. mastering a tricky word schedules its first check at +30, and no review
  await E(()=>openWord({...allWords().find(x=>x.w==="the")},{rung:2}));
  await readIt("the");
  let s=await sched("the");
  ok(s.st.mastered&&J(s.rt)===J([{word:"the",dueAt:s.n+30,stage:1}])&&!s.rv.length,`mastering "the" adds a stage-1 check at +30 (${J(s.rt)} at crate ${s.n}) and no review`);

  // 2. a regular word mastered adds nothing
  await E(()=>openWord({...allWords().find(x=>x.w==="dog")},{rung:2}));
  await readIt("dog");
  s=await sched("dog");
  ok(s.st.mastered&&!s.rt.length&&!s.rv.length,"mastering a regular word (dog) adds no retention check and no review");

  // 3. a heart word mastered before retention reads gets its first check when crates are next picked
  await E(()=>pickCrates());
  s=await sched("to");
  ok(s.rt.length===1&&s.rt[0].stage===1&&s.rt[0].dueAt>=s.n+30,"a heart word mastered in an old save (to) is given a stage-1 check: "+J(s.rt));
  ok(!s.both.length,"nothing is on both lists");
  // park "to" far ahead so the checks of "the" below come up one at a time
  await E(()=>{state.retain.find(r=>r.word==="to").dueAt=1e5;});

  // 4. not due yet: no ♥ crate
  let crates=await openCrates();await clear();
  ok(!crates.some(c=>/\bkeep\b/.test(c.cls)),"before it is due there is no retention crate");

  // 5. due: the word comes up as a ♥ crate, not a lost one, and a clean read moves it to stage 2 at +90
  await E(()=>{state.crateCount=state.retain.find(r=>r.word==="the").dueAt;});
  ok(await E(()=>{const k=pickCrates().filter(o=>o.keep);return k.length===1&&k[0].w==="the"&&!k[0].lost&&!!k[0].tricky;}),"due check: pickCrates gives \"the\" with keep and not lost");
  crates=await openCrates();
  const kc=crates.filter(c=>/\bkeep\b/.test(c.cls));
  ok(kc.length===1&&!/\blost\b/.test(kc[0].cls)&&/remember/.test(kc[0].tag)&&/♥/.test(kc[0].tag)&&!!kc[0].title,"the crate row shows one ♥ retention crate, not lost: "+J(kc[0]));
  ok(kc[0].cls.split(" ").includes("spell")&&kc[0].word!=="the"&&kc[0].tag==="♥ remember this one? Listen and build it.","the ♥ crate is a Build-it crate: the word is hidden until he builds it");
  ok(await E(()=>{for(let i=0;i<40;i++){const k=pickCrates().find(o=>o.keep);if(k&&k.rung!==1)return false;}return true;}),"a ♥ crate is always at Build it, whatever chance says");
  await wait(400);await (await p.$("#crateRow")).screenshot({path:"rt_crates.png"});
  const g0=await E(()=>state.gems);
  await E(()=>document.querySelector("#crateRow .crate.keep").click());await wait(300);
  ok(await E(()=>cur&&cur.w==="the"&&cur.keep&&cur.shownRung===1&&getComputedStyle(document.getElementById("slotsRow")).display!=="none"
    &&!document.querySelector("#picks .btn")&&!!document.querySelector("#letterBank .lt.heart")),"the ♥ crate opens \"the\" at Build it (sound tiles, heart part marked, no \"I read it!\")");
  await wait(1100);
  await E(()=>{cur.p.forEach(ph=>{const t=[...document.querySelectorAll("#letterBank .lt:not(.used)")].find(x=>x.dataset.ph===ph);t.click();});});
  await wait(2700);
  const t1=await E(()=>document.getElementById("toast").textContent);await clear();
  s=await sched("the");
  ok(J(s.rt)===J([{word:"the",dueAt:s.n+90,stage:2}])&&!s.rv.length,"clean check -> stage 2 at +90: "+J(s.rt));
  ok(/remembered/.test(t1),"a passed check says so kindly: "+t1);
  ok(!s.both.length,"nothing is on both lists");

  // 5b. a due word read at Read it (say, as an ordinary or target crate) is not a check: "I read it!" changes nothing
  await E(()=>{state.crateCount=state.retain.find(r=>r.word==="the").dueAt;});
  const pre=await sched("the");
  await E(()=>openWord({...allWords().find(x=>x.w==="the")},{rung:2}));
  await readIt("the");
  s=await sched("the");
  ok(J(s.rt)===J(pre.rt)&&!s.rv.length&&s.n===pre.n+1,"a Read-it self-pass is not taken as the check; it is still due: "+J(s.rt));
  ok(await E(()=>{let k;for(let i=0;i<30&&!k;i++)k=pickCrates().find(o=>o.keep);return !!k&&k.w==="the"&&k.rung===1;}),"the check is still waiting as a ♥ Build-it crate");

  // 6. the stage-2 check missed (a wrong build first): back on review at +3, still mastered, nothing taken
  await E(()=>{state.crateCount=state.retain.find(r=>r.word==="the").dueAt;});
  const g1=await E(()=>state.gems);
  await E(()=>{let k;for(let i=0;i<30&&!k;i++)k=pickCrates().find(o=>o.keep);openWord(k);});await wait(1100);
  ok(await E(()=>cur.shownRung===1&&!document.querySelector("#picks .btn")),"the stage-2 check opens at Build it too");
  // both sounds in the wrong order
  await E(()=>{const bank=[...document.querySelectorAll("#letterBank .lt")];bank.find(t=>t.dataset.ph==="e:uh").click();bank.find(t=>t.dataset.ph==="th:dh").click();});
  await wait(1200);
  await E(()=>{const bank=[...document.querySelectorAll("#letterBank .lt:not(.used)")];bank.find(t=>t.dataset.ph==="th:dh").click();
    [...document.querySelectorAll("#letterBank .lt:not(.used)")].find(t=>t.dataset.ph==="e:uh").click();});
  await wait(1500);await clear();
  s=await sched("the");
  const g2=await E(()=>state.gems);
  ok(!s.rt.length&&J(s.rv)===J([{word:"the",dueAt:s.n+3}])&&s.st.mastered===true,`missed check -> review at +3 (${J(s.rv)} at crate ${s.n}), still mastered`);
  ok(g2>g1&&g0<=g1,`a missed check still earns gems and takes none away (${g1} -> ${g2})`);
  ok(!s.both.length,"nothing is on both lists");
  // the report: kept 1 of 2 (to is on schedule), "the" is checked again soon
  await E(()=>openReport());await wait(300);
  const rep1=await E(()=>(document.getElementById("rKept")||{}).textContent||"");
  ok(/Tricky words kept: 1 of 2/.test(rep1)&&/Checking again soon: the\b/.test(rep1),"report: "+rep1);
  await p.screenshot({path:"rt_report.png"});
  await clear();

  // 7. it comes back as an ordinary lost crate; read clean there -> a stage-1 check at +30 again
  await E(()=>{state.crateCount=state.review.find(r=>r.word==="the").dueAt;});
  const lc=await E(()=>pickCrates().filter(o=>o.w==="the").map(o=>({lost:!!o.lost,keep:!!o.keep})));
  ok(J(lc)===J([{lost:true,keep:false}]),"the missed word comes back as a lost crate, not a ♥ one: "+J(lc));
  await E(()=>{const k=pickCrates().find(o=>o.w==="the");openWord(k,{rung:2});});
  await readIt("the");
  s=await sched("the");
  ok(J(s.rt)===J([{word:"the",dueAt:s.n+30,stage:1}])&&!s.rv.length&&s.st.mastered,"clean review read -> stage-1 check at +30 again: "+J(s.rt));

  // 8. stage 1 then stage 2 both clean: kept, no more checks
  for(const stage of [1,2]){
    await E(()=>{state.crateCount=state.retain.find(r=>r.word==="the").dueAt;});
    await E(()=>{let k;for(let i=0;i<30&&!k;i++)k=pickCrates().find(o=>o.keep);openWord(k);});
    await buildIt();
  }
  s=await sched("the");
  ok(!s.rt.length&&!s.rv.length&&s.st.kept===true&&s.st.mastered,"stage 2 read clean -> kept, off both lists");
  await E(()=>{state.crateCount+=500;});
  ok(await E(()=>{for(let k=0;k<20;k++)if(pickCrates().some(o=>o.w==="the"&&(o.keep||o.lost)))return false;return !state.retain.some(r=>r.word==="the");}),"a kept word is not checked again");
  await E(()=>openReport());await wait(300);
  const rep2=await E(()=>(document.getElementById("rKept")||{}).textContent||"");
  ok(/Tricky words kept: 2 of 2/.test(rep2)&&!/Checking again soon/.test(rep2),"report: "+rep2);
  await clear();

  // 9. the schedule is saved and survives a restart
  const before=await E(()=>JSON.stringify(state.retain));
  await E(()=>saveNow());await wait(500);await p.reload();await wait(2200);
  ok(await E(b=>JSON.stringify(state.retain)===b,before),"the retention schedule survives a reload: "+before);
  ok(await E(()=>state.stats.the.mastered&&state.stats.the.kept),"kept and mastered survive a reload");

  // a brand-new save has the field too
  ok(await E(()=>Array.isArray(def().retain)&&def().retain.length===0),"def() has retain: []");
  ok(!errs.length,"no page errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await b.close();srv.close();process.exit(fails?1:0);});
