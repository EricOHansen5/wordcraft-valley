// v10.0 books: three new books per level 1-6, decodable at their level, with art that exists, voice lines listed,
// and the two new question kinds ("What happened first?", "Which page said it?") answered through dataset.ans, paid once.
// Then three more at levels 7 and 8 (five books a level for 1-8), held to the same rules, with every picture on the page.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs"),path=require("path");
const NEW=["zap_fox","map_x","bob_logs","red_egg","log_hut","den_bug","dock_whale","chop_shed","king_chick",
  "frog_croc","block_steps","bonk_plums","snake_grass","stone_man","gate_bell","storm_bird","start_farm","dark_fort"];
// levels 7 and 8: seven pages and three questions each (one of each new kind and one older kind)
const NEW78=["mine_train","moon_trip","seal_net","bonk_stomp","castle_key","lava_map"],ALL=NEW.concat(NEW78);
const texts=JSON.parse(fs.readFileSync(path.join(__dirname,"../tools/voice/voice_texts.json"),"utf8"));
const norm=t=>String(t).toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9' ]+/g," ").replace(/\s+/g," ").trim();
const listed=new Set(texts.sents.concat(texts.words).map(norm));
const srv=require("./page").serveApp({port:8816},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const ctx=await b.newContext({viewport:{width:1180,height:820},serviceWorkers:"block"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  await p.clock.install();
  await p.goto("http://localhost:8816/");await p.clock.runFor(2500);
  const E=x=>p.evaluate(x),run=ms=>p.clock.runFor(ms);
  await E(`state.tour=99;state.settings.tierOverride=12;document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);

  // the shelf: at least five books a level for levels 1-8 (two from before, three new)
  const per=await E(`[1,2,3,4,5,6,7,8].map(t=>BOOKS.filter(b=>!b.mine&&b.t===t).length)`);
  ok(per.every(n=>n>=5),"levels 1-8 have five books each or more: "+per.join(","));
  const books=await E(`BOOKS.filter(b=>${JSON.stringify(NEW)}.includes(b.id))`);
  ok(books.length===18,"all 18 new books are on the shelf ("+books.length+")");
  ok([1,2,3,4,5,6].every(t=>books.filter(b=>b.t===t).length===3),"three new books per level 1-6");
  ok(books.every(b=>b.pages.length>=5&&b.pages.length<=7),"every new book has 5-7 pages");
  const books78=await E(`BOOKS.filter(b=>${JSON.stringify(NEW78)}.includes(b.id))`);
  ok(books78.length===6&&[7,8].every(t=>books78.filter(b=>b.t===t).length===3),"three new books at level 7 and three at level 8 ("+books78.map(b=>b.id+":"+b.t).join(", ")+")");
  ok(books78.every(b=>b.pages.length===7&&b.quiz.length===3&&b.quiz.some(q=>!q.order&&!q.said)),"each has 7 pages and 3 questions, one of them an older kind");

  // decodable at its level, with every pet he could have at that level and more than one hero name
  const dec=await E(`(()=>{const out=[];const pets=CRITTERS.map(c=>c.id).filter(id=>allWords().some(w=>w.w===id&&!w.tricky));
    for(const n of ["Asher","D'Angelo"]){state.hero=n;
      for(const b of BOOKS.filter(b=>${JSON.stringify(ALL)}.includes(b.id)))
        for(const t of [b.title].concat(b.pages.map(x=>x[0])))
          for(const pet of pets.filter(id=>allWords().find(w=>w.w===id).t<=b.t).concat("dog")){
            const s=t.replace(/\\{pet\\}/g,pet).replace(/\\{hero\\}/g,n),bad=Decode.check(s,b.t).filter(x=>!x.ok);
            if(bad.length)out.push(b.id+" (level "+b.t+"): "+bad.map(x=>x.w+" needs "+x.t).join(", "));}}
    state.hero="Asher";return [...new Set(out)];})()`);
  ok(!dec.length,"every new book passes Decode.check at its level"+(dec.length?": "+dec.slice(0,5).join(" | "):""));

  // every picture exists: pages, covers, and every question's pictures
  const art=await E(`(()=>{const bad=[],okA=a=>a==="ash"||a==="pet"||a==="mud"||(WORD_ART[a]&&ART[WORD_ART[a]])||ART[a];
    BOOKS.forEach(b=>{if(!okA(b.cover))bad.push(b.id+" cover "+b.cover);
      b.pages.forEach(([t,it],i)=>it.forEach(([a])=>{if(!okA(a))bad.push(b.id+" page "+i+": "+a);}));
      b.quiz.forEach(q=>(q.pics||[]).concat(q.order||[]).forEach(a=>{if(a==="ash"||a==="mud"||!okA(a))bad.push(b.id+" quiz: "+a);}));
      const h=Books.scene(b.bg,b.pages[0][1],b.t);if(!h||/undefined/.test(h))bad.push(b.id+" scene");});return bad;})()`);
  ok(!art.length,"every art id in every book resolves"+(art.length?": "+art.join(", "):""));

  // every book's background is one the scenes know (an unknown one falls back to the meadow), and in the level 7-8
  // books every picture is on the page: at least three quarters of its box inside the scene
  const lay=await E(`(()=>{const box=document.createElement("div");box.style.cssText="position:fixed;left:0;top:0;width:800px;visibility:hidden";document.body.appendChild(box);
    const plain=bg=>Books.scene(bg,[],1).replace(/bg-[a-z]+/,""),bgs=[],off=[];
    BOOKS.filter(b=>!b.mine).forEach(b=>{if(b.bg!=="meadow"&&plain(b.bg)===plain("meadow"))bgs.push(b.id+": "+b.bg);});
    BOOKS.filter(b=>${JSON.stringify(NEW78)}.includes(b.id)).forEach(b=>b.pages.forEach(([t,items],i)=>{box.innerHTML=Books.scene(b.bg,items,b.t);
      const sc=box.querySelector(".bscene").getBoundingClientRect();
      box.querySelectorAll(".sitem").forEach((el,k)=>{const r=el.getBoundingClientRect(),
        f=Math.max(0,Math.min(r.right,sc.right)-Math.max(r.left,sc.left))*Math.max(0,Math.min(r.bottom,sc.bottom)-Math.max(r.top,sc.top))/(r.width*r.height);
        if(!(f>=.75))off.push(b.id+" page "+(i+1)+": "+items[k][0]+" "+Math.round(f*100)+"%");});}));
    box.remove();return{bgs,off};})()`);
  ok(!lay.bgs.length,"every book's background is a known one"+(lay.bgs.length?": "+lay.bgs.join(", "):""));
  ok(!lay.off.length,"in the level 7-8 books every picture is on the page"+(lay.off.length?": "+lay.off.join(", "):""));

  // the new question kinds are well formed
  const shape=[];
  for(const bk of books.concat(books78)){
    const first=a=>bk.pages.findIndex(x=>x[1].some(i=>i[0]===a));
    const o=bk.quiz.filter(q=>q.order),s=bk.quiz.filter(q=>q.said);
    if(!o.length||!s.length)shape.push(bk.id+": needs both new kinds");
    o.forEach(q=>{if(q.order.length!==2||q.a!==q.order[0]||!(first(q.order[0])>=0&&first(q.order[0])<first(q.order[1])))shape.push(bk.id+": order "+q.order);});
    s.forEach(q=>{const pg=bk.pages.find(x=>x[0]===q.said);if(!pg||!q.pics.includes(q.a)||!pg[1].some(i=>i[0]===q.a))shape.push(bk.id+": said "+q.said);});
    bk.quiz.forEach(q=>{if((q.pics||q.words)&&!(q.pics||q.words).includes(q.a))shape.push(bk.id+": answer not offered, "+q.q);});}
  ok(!shape.length,"what-happened-first pictures are in story order; which-page-said-it sentences are pages with that picture"+(shape.length?": "+shape.join(" | "):""));

  // every new page and question is in the voice list, for the default name and every pet
  const miss=[];
  for(const bk of books.concat(books78))for(const t of [bk.title].concat(bk.pages.map(x=>x[0]),bk.quiz.map(q=>q.q))){
    const s=t.replace(/\{hero\}/g,"Asher").replace(/\{pet\}/g,"dog");if(!listed.has(norm(s)))miss.push(s);}
  ok(!miss.length,"every new page and question is in tools/voice/voice_texts.json"+(miss.length?": "+miss.slice(0,4).join(" | "):""));

  // read a book to its end, answering through dataset.ans; tap each answer twice
  const readBook=async(id,{double=true,missSaid=false}={})=>{
    await E(`Books.openBook(${JSON.stringify(id)})`);await E(`document.getElementById("bStart").click()`);
    const n=await E(`BOOKS.find(b=>b.id===${JSON.stringify(id)}).pages.length`);
    for(let i=0;i<n;i++)await E(`(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();})()`);
    const seen=[];
    for(let k=0;k<8;k++){
      const q=await E(`(()=>{const h=document.querySelector("#ovStory .bopts");if(!h)return null;const s=Books._state(),bk=BOOKS.find(b=>b.id===s.book),q=bk.quiz[s.quizIdx];
        return{ans:h.dataset.ans,kind:q.order?"order":q.said?"said":q.pics?"pics":q.words?"words":"yes",n:h.querySelectorAll(".bopt").length,
          said:(document.querySelector("#ovStory .bsaid")||{}).textContent||"",want:q.said?Books.fill(q.said,bk.t):"",a:q.a!=null?q.a:(q.yes?"yes":"no"),
          hasAns:!!h.querySelector('.bopt[data-v="'+h.dataset.ans+'"]')};})()`);
      if(!q)break;seen.push(q);
      if(missSaid&&q.kind==="said"){const g0=await E("state.gems");
        await E(`[...document.querySelectorAll("#ovStory .bopt")].find(b=>b.dataset.v!==document.querySelector("#ovStory .bopts").dataset.ans).click()`);await run(800);
        q.missKept=await E("state.gems")===g0&&await E(`!!document.querySelector("#ovStory .bopts")`);}
      await E(`(()=>{const h=document.querySelector("#ovStory .bopts"),b=h.querySelector('.bopt[data-v="'+h.dataset.ans+'"]');b.click();${double?"b.click();":""}})()`);
      await run(1000);}
    return seen;};

  // one book with all three kinds, double taps: paid once, every question asked
  {const g0=await E("state.gems"),c0=await E("state.mine.coins");
   await E("window._said=[];window._say0=Sound.say;Sound.say=(k,t,r)=>{window._said.push(k);return Promise.resolve();}");
   const seen=await readBook("zap_fox",{missSaid:true});
   const said=await E("window._said");await E("Sound.say=window._say0");
   ok(said.includes("sent:What happened first?")&&said.includes("sent:Which page said it?")&&said.filter(k=>k==="sent:Zap zaps a pot. Bam! The pot is hot.").length>=2,
     "both questions are spoken; the sentence is spoken after its question and again after a miss");
   const lib=await E(`state.library.zap_fox`),paid=await E("state.gems")-g0,coins=await E("state.mine.coins")-c0;
   ok(seen.length===3&&seen.every(q=>q.ans===q.a&&q.hasAns),"zap_fox: all 3 questions asked after double taps, each answer on dataset.ans "+JSON.stringify(seen.map(q=>q.kind+":"+q.ans)));
   const o=seen.find(q=>q.kind==="order"),s=seen.find(q=>q.kind==="said");
   ok(o&&o.n===2,"what happened first: two pictures to choose from");
   ok(s&&s.n===3&&s.said.replace(/🔊/g,"").replace(/\s+/g," ").trim()===s.want,"which page said it: the sentence is shown ("+(s&&s.said.trim())+")");
   ok(s&&s.missKept,"which page said it: a miss takes nothing away and stays on the question");
   ok(lib&&lib.done&&lib.reads===1&&paid===6+2*lib.stars&&coins===15,"the book pays once: +"+paid+" gems, +"+coins+" coins, "+JSON.stringify(lib&&{reads:lib.reads,stars:lib.stars}));
   await run(1500);ok(await E("state.library.zap_fox.reads")===1&&await E("state.gems")-g0===paid,"nothing more is paid after the end");
   await E("Books.close()");}

  // every new book reads to the end through dataset.ans
  {const bad=[];
   for(const id of ALL.filter(x=>x!=="zap_fox")){const seen=await readBook(id,{double:false});
     const done=await E(`!!(state.library[${JSON.stringify(id)}]||{}).done`);
     if(!done||seen.length!==3||!seen.every(q=>q.hasAns&&q.ans===q.a))bad.push(id+" "+JSON.stringify(seen.map(q=>q.kind+":"+q.ans+(q.hasAns?"":"?"))));
     await E("Books.close()");}
   ok(!bad.length,"all "+ALL.length+" new books finish, every question answered through dataset.ans"+(bad.length?": "+bad.join(" | "):""));}

  // old question kinds still work, and old books are unchanged in shape
  {const seen=await readBook("cat_hat");ok(seen.length===2&&seen.every(q=>q.hasAns),"an old book's questions still resolve through dataset.ans");await E("Books.close()");}

  ok(!errs.length,"no page errors "+(errs.join(" | ")||""));
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();});
