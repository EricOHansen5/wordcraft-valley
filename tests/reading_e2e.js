const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8791},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.addInitScript(()=>{
    navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{stop(){}}]});
    window.MediaRecorder=class{constructor(){this.mimeType="audio/webm";}start(){}stop(){setTimeout(()=>{this.ondataavailable({data:new Blob([new Uint8Array(3000)])});this.onstop();},40);}};
  });
  const st={tour:99,guardians:[0,1,2],wordsRead:40,gems:20,rows:7,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{},inventory:{},
    critters:[{id:"dog",c:4,r:8,seed:1}],vehicles:[],
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},
      owned:{miner:1,cap:1},made:true,pet:"dog",bosses:{},eggs:[]}};
  await p.goto("http://localhost:8791/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.settings.tierOverride=3;renderHUD();});
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  ok(await p.evaluate(()=>document.getElementById("bookBadge").classList.contains("on")),"books button shows NEW");
  await p.screenshot({path:"r_dock.png"});

  // 1 skills map from word answers
  const sk=await p.evaluate(()=>({cat:Skills.ofWord(allWords().find(w=>w.w==="cat")).map(s=>s.sk).join(","),
    frog:Skills.ofWord(allWords().find(w=>w.w==="frog")).map(s=>s.sk).join(","),ship:Skills.ofWord(allWords().find(w=>w.w==="ship")).map(s=>s.sk).join(",")}));
  console.log("   skills of words:",JSON.stringify(sk));
  // 2 two fast wrong picks -> Sound Shield next time
  const pickWord=async()=>p.evaluate(()=>{const w=allWords().find(x=>x.w==="cat");openWord({...w},{rung:0});
    return [...document.querySelectorAll("#picks .pick")].map(b=>b.dataset.w);});
  let opts=await pickWord();
  if(!opts.length){console.log("   (listen mode rendered, retry)");opts=await pickWord();}
  await p.evaluate(()=>{const bad=[...document.querySelectorAll("#picks .pick")].filter(b=>b.dataset.w!=="cat");bad[0].click();bad[1]&&bad[1].click();});
  await p.waitForTimeout(300);
  ok(await p.evaluate(()=>Skills.slow),"rushing turns the Sound Shield on");
  await p.evaluate(()=>{document.querySelector("#picks .pick[data-w='cat']").click();});await p.waitForTimeout(800);
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  await p.evaluate(()=>{const w=allWords().find(x=>x.w==="dog");openWord({...w},{rung:2});});await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!!document.querySelector("#shieldHost .shield")&&document.getElementById("picks").classList.contains("locked-by-shield")),"shield locks the answers");
  await p.screenshot({path:"r_shield.png"});
  for(const t of await p.$$("#shieldHost .lt")){await t.click();await p.waitForTimeout(700);}
  await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>!document.querySelector("#shieldHost .shield")&&!document.getElementById("picks").classList.contains("locked-by-shield")&&!Skills.slow),"tapping every sound breaks the shield");
  // 3 read then prove
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));const w=allWords().find(x=>x.w==="dog");openWord({...w},{rung:2});});
  const rb=await p.evaluate(()=>document.querySelector("#picks .btn").disabled);
  await p.waitForTimeout(1000);await p.click("#picks .btn");await p.waitForTimeout(300);
  const prove=await p.evaluate(()=>({q:document.querySelector("#picks .prove")?.textContent,n:document.querySelectorAll("#picks .pick").length}));
  ok(rb&&prove.n===3,"read-then-prove: button waits, then 3 pictures ("+prove.q+")");
  await p.screenshot({path:"r_prove.png"});
  await p.click("#picks .pick[data-w='dog']");await p.waitForTimeout(600);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));const w=allWords().find(x=>x.w==="cat");openWord({...w},{rung:0});
    renderListen(cur);const b=[...document.querySelectorAll("#picks .pick")].find(x=>x.dataset.w!=="cat");b.dataset.w="cap";b.click();});
  const conf=await p.evaluate(()=>({conf:Skills.confusions(),a:state.skills.a,ans:state.answers,rush:state.rushes}));
  console.log("   confusions:",JSON.stringify(conf.conf),"| short a:",JSON.stringify(conf.a),"| rushes:",JSON.stringify(conf.rush));
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  // spelling mistake pinned on the wrong tile
  await p.evaluate(()=>{const w=allWords().find(x=>x.w==="bed");openWord({...w},{rung:1});});await p.waitForTimeout(400);
  await p.evaluate(()=>{const s=[...document.querySelectorAll("#slotsRow .wslot")];const bank=[...document.querySelectorAll("#letterBank .lt")];
    const want=["b","e","d"],extra=bank.find(t=>!want.includes(t.dataset.ph));
    // put the extra letter in place of "d"
    bank.find(t=>t.dataset.ph==="b").click();bank.find(t=>t.dataset.ph==="e").click();extra.click();});
  await p.waitForTimeout(400);
  console.log("   spelling miss pinned:",JSON.stringify(await p.evaluate(()=>Skills.confusions().slice(0,4))));
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));

  // 4 targeted crates
  await p.evaluate(()=>{state.skills.i={p:.2,n:4,e:{}};});
  const tg=await p.evaluate(()=>{let n=0,ex=[];for(let k=0;k<40;k++){const c=pickCrates();c.forEach(o=>{if(o.target){n++;ex.push(o.w+":"+o.target);}});}return{n,ex:[...new Set(ex)].slice(0,6)};});
  ok(tg.n>15,`targeted crates appear (${tg.n}/40): ${tg.ex.join(", ")}`);
  const pic=await p.evaluate(()=>{let n=0;for(let k=0;k<60;k++)if(pickCrates().some(o=>o.pic))n++;return n;});
  ok(pic>=2,"picture-it crates appear "+pic+"/60");
  await p.evaluate(()=>{const r=Math.random;Math.random=()=>0.05;document.getElementById("crateBtn").click();Math.random=r;});await p.waitForTimeout(400);
  await p.screenshot({path:"r_crates.png"});
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));

  // 5 picture it
  await p.evaluate(()=>openPicIt());await p.waitForTimeout(500);
  const ps=await p.evaluate(()=>({t:document.querySelector("#ovPic .btext").textContent,n:document.querySelectorAll("#ovPic .psopt").length}));
  console.log("   picture it:",ps.t,"| options",ps.n);
  await p.screenshot({path:"r_picit.png"});
  await p.evaluate(()=>{const o=[...document.querySelectorAll("#ovPic .psopt")];o.forEach(x=>x.dataset.okv="");});
  const okIdx=await p.evaluate(()=>{/* find the right one by re-reading the module state: right answer gets .right when clicked */return null;});
  // click options until one is right
  for(let i=0;i<3;i++){const r=await p.evaluate(i=>{const b=document.querySelectorAll("#ovPic .psopt")[i];b.click();return b.classList.contains("right");},i);if(r)break;await p.waitForTimeout(700);}
  await p.waitForTimeout(300);
  ok(await p.evaluate(()=>state.comp&&state.comp.right===1),"picture it scored: "+JSON.stringify(await p.evaluate(()=>state.comp)));
  await p.waitForTimeout(1500);

  // 6 storybook: shelf, read every page to the pet, answer questions
  await p.click("#booksBtn");await p.waitForTimeout(500);
  const shelf=await p.evaluate(()=>[...document.querySelectorAll(".bcov")].map(c=>c.querySelector("b").textContent+(c.disabled?" 🔒":"")));
  console.log("   shelf:",shelf.join(" | "));
  await p.screenshot({path:"r_shelf.png"});
  await p.click('.bcov[data-id="fox_box"]');await p.waitForTimeout(600);await p.screenshot({path:"r_cover.png"});
  await p.click("#bStart");await p.waitForTimeout(400);
  const pages=await p.evaluate(()=>BOOKS.find(b=>b.id==="fox_box").pages.length);
  for(let i=0;i<pages;i++){
    if(i===0){const dis=await p.evaluate(()=>document.getElementById("bRead").disabled);ok(dis,"'I read it' waits for reading time");await p.screenshot({path:"r_page.png"});}
    if(i===1){await p.click("#ovStory .btext .bw:nth-child(2)");await p.waitForTimeout(1500);}
    await p.click("#bRec");await p.waitForTimeout(500);await p.click("#bRec");await p.waitForTimeout(900);
    const vis=await p.evaluate(()=>getComputedStyle(document.querySelector(".bafter")).display!=="none");
    if(!vis){console.log("FAIL page",i,"after-row hidden");break;}
    await p.click("#bNext");await p.waitForTimeout(400);
  }
  // questions: answer right first time using the book data
  for(let q=0;q<5;q++){
    const has=await p.evaluate(()=>!!document.querySelector(".bopt"));if(!has)break;
    if(q===0)await p.screenshot({path:"r_quiz.png"});
    await p.evaluate(()=>{const s=Books._state(),bk=BOOKS.find(b=>b.id===s.book),qq=bk.quiz[s.quizIdx],a=qq.pics||qq.words?qq.a:(qq.yes?"yes":"no");
      document.querySelector(`.bopt[data-v="${a}"]`).click();});
    await p.waitForTimeout(1200);
  }
  await p.waitForTimeout(400);
  const lib=await p.evaluate(async()=>({lib:state.library.fox_box,blob:!!(await DB.get("blobs","story:fox_box:0")),end:document.querySelector(".bpage.end h2")?.textContent,gems:state.gems}));
  ok(lib.lib&&lib.lib.done&&lib.lib.stars===3&&lib.lib.rec&&lib.blob,"book finished with 3 stars and his recordings saved "+JSON.stringify(lib));
  await p.screenshot({path:"r_end.png"});
  await p.click("#bListen");await p.waitForTimeout(700);await p.screenshot({path:"r_audiobook.png"});
  await p.evaluate(()=>document.getElementById("bStop").click());await p.waitForTimeout(400);
  ok(await p.evaluate(()=>!!document.querySelector(".bpage.cover")),"audiobook stops back to the cover");
  await p.click("#bBack");await p.waitForTimeout(300);await p.click("#bClose");await p.waitForTimeout(300);
  // every book renders every page without errors
  const all=await p.evaluate(()=>{const bad=[];BOOKS.forEach(bk=>bk.pages.forEach(([t,items],i)=>{const h=Books.scene(bk.bg,items,bk.t);if(!h||/undefined/.test(h))bad.push(bk.id+":"+i);
    items.forEach(([a])=>{if(a!=="ash"&&a!=="pet"&&a!=="mud"&&!WORD_ART[a]&&!ART[a])bad.push(bk.id+":"+a);});}));return bad;});
  ok(!all.length,"all 16 books render ("+(all.join(",")||"no missing art")+")");

  // 7 report
  await p.evaluate(()=>{state.minutes={[today()]:12};openParent();});await p.waitForTimeout(300);
  await p.click("#reportBtn");await p.waitForTimeout(500);
  const rep=await p.evaluate(()=>({tips:document.querySelectorAll(".rtips li").length,sk:document.querySelectorAll(".rsk").length,play:document.querySelectorAll(".rplay").length}));
  ok(rep.sk>5&&rep.play===1,"report renders "+JSON.stringify(rep));
  await p.screenshot({path:"r_report.png",fullPage:false});
  await p.evaluate(()=>{document.querySelector("#ovReport .sheet").scrollTop=900;});await p.screenshot({path:"r_report2.png"});
  await p.click("#rClose");await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));

  // 8 mine: books pill and a boss riddle
  await p.click("#mineBtn");await p.waitForTimeout(1000);
  await p.evaluate(()=>document.querySelectorAll("#mClose").forEach(b=>b.click()));
  ok(await p.evaluate(()=>!!document.getElementById("mBooks")),"books pill in the mine");
  await p.evaluate(()=>{Skills.slow=false;Mine._startBoss(0);});await p.waitForTimeout(300);await p.click("#mFight");await p.waitForTimeout(400);
  const kinds=[];
  for(let r=0;r<6;r++){const on=await p.evaluate(()=>!!document.querySelector(".mboss.fight"));if(!on)break;
    const k=await p.evaluate(()=>{const a=Mine._ans();const el=[...document.querySelectorAll("[data-w]")].find(o=>o.dataset.w===a);const kind=a==="#ps"?"riddle":"word";
      return kind;});
    if(k==="riddle")await p.screenshot({path:"r_riddle.png"});
    await p.evaluate(()=>{const a=Mine._ans();[...document.querySelectorAll("[data-w]")].find(o=>o.dataset.w===a).click();});
    kinds.push(k);await p.waitForTimeout(1400);}
  ok(kinds.includes("riddle"),"boss riddle round: "+kinds.join(","));
  await p.evaluate(()=>document.querySelectorAll("#mClose").forEach(b=>b.click()));
  await p.click("#mBooks");await p.waitForTimeout(400);
  ok(await p.evaluate(()=>getComputedStyle(document.getElementById("ovStory")).zIndex>75&&document.getElementById("ovStory").classList.contains("on")),"books open over the mine");
  await p.screenshot({path:"r_minebooks.png"});
  // backup has the recordings
  const bk=await p.evaluate(async()=>{try{const x=await fullBackup();return typeof x==="string"?x.includes("story:fox_box"):JSON.stringify(x).includes("story:fox_box");}catch(e){return "err "+e.message;}});
  console.log("   backup includes story blobs:",bk);
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();
});
