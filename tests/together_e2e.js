// v10.0 "Read with Dad": the Read together button on the shelf, the first-time choice (remembered across a reload,
// changed from the cover), take turns (his page, then Dad's) and echo (Dad first, then him, on every page), both paid
// once like a solo read with only his pages counted, the "Read with Dad" sticker, the Grown-up report line, a solo read
// unchanged, and an old save without the new fields.
const {launch,check,waitFor,seed,reload}=require("./lib");
const fs=require("fs"),path=require("path");
(async()=>{const t=check("together");
  const {page:p,errs,close,E}=await launch({seed:{gems:50,settings:{goal:0,tierOverride:12}}});
  // what is spoken and what counts, recorded (and no voice waits)
  const spy=()=>E(()=>{window._spoken=[];Sound.speak=(x)=>{window._spoken.push(x);return Promise.resolve();};
    Sound.say=()=>Promise.resolve();
    window._hits=[];if(!Quests._hit0)Quests._hit0=Quests.hit;Quests.hit=function(k,by){window._hits.push([k,by==null?1:by]);return Quests._hit0.call(Quests,k,by);};});
  await spy();
  const shelf=()=>E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovStory")o.classList.remove("on");});document.getElementById("booksBtn").click();});
  const top=()=>E(()=>{const b=document.querySelector("#ovStory .bpage");return b?{cls:b.className,who:b.dataset.who||"",page:Books._state().page,
    together:b.dataset.together||""}:null;});
  const counts=()=>E(()=>({gems:state.gems,coins:state.mine.coins,words:state.wordsRead,goal:state.goal.words,days:(state.togetherDays||[]).length}));
  // his page: "I read it" (its reading-time wait skipped), then Next; the grown-up's page: the one big tap
  async function kidPage(double){
    await E(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();});
    await E(d=>{const n=document.getElementById("bNext");n.click();if(d)n.click();},!!double);}
  async function dadPage(double){await E(d=>{const b=document.getElementById("bDad");b.click();if(d)b.click();},!!double);}
  // the questions, each right answer found through dataset.ans and tapped twice
  async function quiz(){
    for(let k=0;k<6;k++){
      const has=await waitFor(p,()=>!!document.querySelector("#ovStory .bopts")||!!document.querySelector("#ovStory .bpage.end"),{timeout:4000});
      if(!has||await E(()=>!!document.querySelector("#ovStory .bpage.end")))break;
      await E(()=>{const h=document.querySelector("#ovStory .bopts"),b=h.querySelector('.bopt[data-v="'+h.dataset.ans+'"]');b.click();b.click();});
      await waitFor(p,i=>Books._state().quizIdx>i||!!document.querySelector("#ovStory .bpage.end"),{arg:k,timeout:3000});}
    return waitFor(p,"#ovStory .bpage.end",{timeout:4000});}
  const len=id=>E(i=>BOOKS.find(b=>b.id===i).pages.length,id);

  // ---------- the shelf button and the first-time choice ----------
  await shelf();
  t.ok(await waitFor(p,"#ovStory #bTogether"),"the shelf has a Read together button");
  t.ok(await E(()=>state.settings.together)==="","a new save asks how to read together (settings.together is \"\")");
  await E(()=>document.getElementById("bTogether").click());
  t.ok(await E(()=>document.querySelector("#ovStory .bshelf").classList.contains("tgpicking")&&/read with Dad/.test(document.querySelector("#ovStory .sub").textContent)),
    "tapping it asks for a book to read with Dad");
  t.ok(await E(()=>window._spoken.indexOf("Pick a book to read with Dad.")>=0),"and says so");
  await E(()=>document.querySelector('#ovStory .bcov[data-id="ash_fish"]').click());
  t.ok(await waitFor(p,"#ovStory .tgask")&&await E(()=>document.querySelectorAll("#ovStory .tgway").length===2&&!document.querySelector("#ovStory .tgway.on")),
    "the first time, a small screen asks which way: take turns or echo");
  await E(()=>document.querySelector('#ovStory .tgway[data-way="turns"]').click());
  t.ok(await E(()=>state.settings.together)==="turns","the choice is remembered in settings.together");
  t.ok(await waitFor(p,()=>!!document.getElementById("bTgWay")&&/with Dad/.test(document.getElementById("bStart").textContent)&&!!document.getElementById("bTgChange")),
    "the cover says how, with a change link, and Read it with Dad!");

  // ---------- take turns: his page first, then Dad's; the last page is Dad's (6 pages) ----------
  {const n=await len("ash_fish"),c0=await counts();await E(()=>{window._hits=[];window._spoken=[];});
   await E(()=>document.getElementById("bStart").click());
   const seq=[];let dadNoWords=true,kidTurn=true,dadDouble=null;
   for(let i=0;i<n;i++){
     const s=await top();seq.push(s.page+":"+s.who);
     if(s.who==="grownup"){
       dadNoWords=dadNoWords&&await E(()=>!document.querySelector("#ovStory .btext .bw")&&!!document.querySelector("#ovStory .btext.tgbig")&&!document.getElementById("bRead"));
       if(i===1){await dadPage(true);dadDouble=(await top()).page;}   // a double tap moves one page
       else await dadPage(i===n-1);}                                  // the final button, tapped twice
     else{kidTurn=kidTurn&&await E(()=>!!document.querySelector("#ovStory .tgwho.kid")&&!!document.querySelector("#ovStory .btext .bw")&&!!document.getElementById("bRead"));
       await kidPage();}}
   t.ok(seq.join(",")==="0:child,1:grownup,2:child,3:grownup,4:child,5:grownup","take turns alternates pages, his first: "+seq.join(","));
   t.ok(dadNoWords,"Dad's page: the words large, no word tapping, one Dad read it button");
   t.ok(kidTurn,"his page: the normal page (tap words, I read it) marked Your turn!");
   t.ok(dadDouble===2,"a double tap on Dad read it moves on one page ("+dadDouble+")");
   const sp=await E(()=>window._spoken);
   t.ok(sp.filter(x=>x==="Your turn!").length===3&&sp.filter(x=>x==="Dad reads this page.").length===3,"turns: Your turn! on his pages, Dad reads this page. on Dad's");
   t.ok(await quiz(),"take turns reaches the end");
   await p.waitForTimeout(1500);
   const c1=await counts(),lib=await E(()=>state.library.ash_fish),hits=await E(()=>window._hits),kid=Math.ceil(n/2);
   t.ok(lib&&lib.done&&lib.reads===1&&c1.gems-c0.gems===6+2*lib.stars&&c1.coins-c0.coins===15*3,
     "turns pays once, as a solo read: +"+(c1.gems-c0.gems)+" gems, +"+(c1.coins-c0.coins)+" coins "+JSON.stringify(lib));
   t.ok(c1.words-c0.words===kid&&c1.goal-c0.goal===kid,`only his ${kid} pages count as reads and toward today's goal (${c1.words-c0.words}, ${c1.goal-c0.goal})`);
   t.ok(JSON.stringify(hits)===JSON.stringify([["read",kid],["book",1]]),"quests hear his pages only, and a book: "+JSON.stringify(hits));
   t.ok(lib&&lib.together===true&&c1.days-c0.days===1&&await E(()=>state.togetherDays[state.togetherDays.length-1]===today()),"the book is marked read together, and today is noted");
   t.ok(await E(()=>/with Dad/.test((document.querySelector("#ovStory .tgend")||{}).textContent||"")),"the end page says You read it with Dad!");
   await E(()=>document.getElementById("bShelf").click());
   t.ok(await waitFor(p,()=>/Read with Dad/.test((document.querySelector('#ovStory .bcov[data-id="ash_fish"] .tgst')||{}).textContent||"")),"the shelf shows a Read with Dad sticker on its cover");
   t.ok(await E(()=>!document.querySelector('#ovStory .bcov[data-id="fox_box"] .tgst')),"and none on a book not read together");}

  // ---------- remembered across a reload; changed from the cover ----------
  await p.waitForTimeout(400);await reload(p);await spy();
  t.ok(await E(()=>state.settings.together)==="turns"&&await E(()=>state.library.ash_fish.together===true),"after a reload the way and the sticker are kept");
  await shelf();await waitFor(p,"#ovStory #bTogether");
  await E(()=>document.getElementById("bTogether").click());await E(()=>document.querySelector('#ovStory .bcov[data-id="fox_box"]').click());
  t.ok(await waitFor(p,"#ovStory #bTgWay")&&await E(()=>!document.querySelector("#ovStory .tgask")&&/Take turns/.test(document.getElementById("bTgWay").textContent)),
    "the remembered way is used without asking again");
  await E(()=>document.getElementById("bTgChange").click());
  t.ok(await waitFor(p,"#ovStory .tgask")&&await E(()=>document.querySelector('#ovStory .tgway.on').dataset.way==="turns"),"change opens the same choice, showing the current way");
  await E(()=>document.querySelector('#ovStory .tgway[data-way="echo"]').click());
  t.ok(await E(()=>state.settings.together)==="echo"&&await waitFor(p,()=>/Echo/.test((document.getElementById("bTgWay")||{}).textContent||"")),"changed to echo, back on the cover");

  // ---------- echo: Dad first, then him, on every page ----------
  {const n=await len("fox_box"),c0=await counts();await E(()=>{window._hits=[];window._spoken=[];});
   await E(()=>document.getElementById("bStart").click());
   const seq=[];let taps=0;
   for(let i=0;i<n;i++){
     const a=await top();if(a.who!=="grownup"){seq.push("?"+a.page+a.who);break;}await dadPage();taps++;
     const b=await top();if(b.who!=="child"||b.page!==a.page){seq.push("?"+b.page+b.who);break;}await kidPage(i===n-1);taps++;
     seq.push(a.page);}
   t.ok(seq.join(",")==="0,1,2,3,4"&&taps===2*n,"echo: every page is Dad's then his, two taps a page ("+seq.join(",")+"; "+taps+" taps)");
   const sp=await E(()=>window._spoken);
   t.ok(sp.filter(x=>x==="Dad first, then you.").length===1&&sp.filter(x=>x==="Your turn!").length===n,"echo: Dad first, then you. once, Your turn! on each of his reads");
   t.ok(await quiz(),"echo reaches the end");await p.waitForTimeout(1500);
   const c1=await counts(),lib=await E(()=>state.library.fox_box),hits=await E(()=>window._hits);
   t.ok(lib&&lib.reads===1&&c1.gems-c0.gems===6+2*lib.stars&&c1.words-c0.words===n&&c1.goal-c0.goal===n,
     `echo pays once and all ${n} of his reads count (+${c1.gems-c0.gems} gems, +${c1.words-c0.words} read)`);
   t.ok(JSON.stringify(hits)===JSON.stringify([["read",n],["book",1]])&&lib.together===true&&c1.days-c0.days===1,"echo: quests, sticker and day as for turns "+JSON.stringify(hits));
   await E(()=>document.getElementById("bShelf").click());}

  // ---------- a solo read is unchanged, and keeps the sticker on a reread ----------
  {await waitFor(p,"#ovStory .bshelf");const n=await len("pig_mud"),c0=await counts();await E(()=>{window._hits=[];window._spoken=[];});
   await E(()=>document.querySelector('#ovStory .bcov[data-id="pig_mud"]').click());
   t.ok(await waitFor(p,"#ovStory #bStart")&&await E(()=>!document.getElementById("bTgWay")&&/^Read it!/.test(document.getElementById("bStart").textContent)),"a solo cover is as before");
   await E(()=>document.getElementById("bStart").click());
   let plain=true;
   for(let i=0;i<n;i++){const s=await top();plain=plain&&!s.who&&s.page===i&&await E(()=>!document.querySelector("#ovStory .tgwho"));await kidPage(i===n-1);}
   t.ok(plain,"a solo read: every page is his, with no turn marks");
   t.ok(await quiz(),"a solo read reaches the end");await p.waitForTimeout(1500);
   const c1=await counts(),lib=await E(()=>state.library.pig_mud),hits=await E(()=>window._hits);
   t.ok(lib.reads===1&&c1.gems-c0.gems===6+2*lib.stars&&c1.words-c0.words===n&&c1.goal-c0.goal===n&&JSON.stringify(hits)===JSON.stringify([["read",n],["book",1]]),
     "a solo read pays and counts every page as before "+JSON.stringify(hits));
   t.ok(!lib.together&&c1.days===c0.days&&await E(()=>!document.querySelector("#ovStory .tgend")&&!window._spoken.some(x=>/Dad|Your turn/.test(x))),"and is not marked read together");
   // reread ash_fish solo: the sticker stays
   await E(()=>document.getElementById("bShelf").click());await waitFor(p,"#ovStory .bshelf");
   await E(()=>document.querySelector('#ovStory .bcov[data-id="ash_fish"]').click());await waitFor(p,"#ovStory #bStart");
   await E(()=>document.getElementById("bStart").click());
   for(let i=0;i<await len("ash_fish");i++)await kidPage();
   await quiz();await p.waitForTimeout(1200);
   t.ok(await E(()=>state.library.ash_fish.reads===2&&state.library.ash_fish.together===true),"a solo reread keeps the Read with Dad sticker");
   await E(()=>document.getElementById("bShelf").click());
   t.ok(await waitFor(p,'#ovStory .bcov[data-id="ash_fish"] .tgst'),"still on the shelf");
   // closing the books ends together mode: a book opened from elsewhere is a solo read
   await E(()=>document.getElementById("bTogether").click());await E(()=>document.querySelector('#ovStory .bcov[data-id="cat_hat"]').click());
   await waitFor(p,"#ovStory #bTgWay");await E(()=>Books.close());await E(()=>Books.openBook("cat_hat"));
   t.ok(await waitFor(p,"#ovStory #bStart")&&await E(()=>!document.getElementById("bTgWay")),"after closing, Books.openBook is a solo read");
   await E(()=>Books.close());}

  // ---------- the Grown-up report ----------
  await E(()=>openReport());
  t.ok(await waitFor(p,()=>/^2 books read together this week/.test((document.getElementById("rTogether")||{}).textContent||"")),
    "the report: "+await E(()=>(document.getElementById("rTogether")||{}).textContent));
  await E(()=>{const d=new Date();d.setDate(d.getDate()-9);state.togetherDays.unshift(ymd(d));openReport();});
  t.ok(await E(()=>/^2 books/.test(document.getElementById("rTogether").textContent)),"a day older than a week is not counted this week");
  await E(()=>Modes.shut(document.getElementById("ovReport")));

  // ---------- an old save without the new fields ----------
  const old=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/v8-era.json"),"utf8"));
  old.settings.timer=0;
  await seed(p,old,{base:null});
  const o=await E(()=>({tg:state.settings.together,days:Array.isArray(state.togetherDays)&&state.togetherDays.length===0,lib:state.library.cat_hat}));
  t.ok(o.tg===""&&o.days&&o.lib&&o.lib.done&&!o.lib.together,"an old save loads with the new fields at their defaults "+JSON.stringify(o));
  await shelf();
  t.ok(await waitFor(p,"#ovStory #bTogether")&&await E(()=>!document.querySelector("#ovStory .tgst")),"its shelf has the button and no stickers");
  await E(()=>Books.close());await E(()=>openReport());
  t.ok(await waitFor(p,()=>/^0 books read together this week/.test((document.getElementById("rTogether")||{}).textContent||"")),"its report says 0 books read together this week");
  await E(()=>Modes.shut(document.getElementById("ovReport")));
  await seed(p,Object.assign(old,{togetherDays:null}),{base:null});
  t.ok(await E(()=>Array.isArray(state.togetherDays)),"a saved null togetherDays comes back as a list");

  t.ok(!errs.length,"no page or console errors: "+errs.join(" | "));
  await close();t.done();})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
