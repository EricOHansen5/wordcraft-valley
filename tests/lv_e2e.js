const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8797,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const p=await b.newPage({viewport:{width:1180,height:820}});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto("http://localhost:8797/");await p.waitForTimeout(1800);
  const r=await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.tour=99;state.settings.tierOverride=12;
    const nw=allWords().filter(w=>w.t>=9);
    const unknown=[...new Set(nw.flatMap(w=>w.p).filter(p=>soundOf(p)&&!Phonics.known(soundOf(p))&&!Phonics.known(p)))];
    const noArt=nw.filter(w=>!w.tricky&&!WORD_ART[w.w]).map(w=>w.w);
    const badArt=nw.filter(w=>WORD_ART[w.w]&&!ART[WORD_ART[w.w]]).map(w=>w.w);
    const sk={};nw.forEach(w=>sk[w.w]=Skills.ofWord(w).map(s=>s.sk).join("+"));
    return{n:nw.length,unknown,noArt,badArt,sk,books:BOOKS.length,max:MAX_TIER};});
  console.log(JSON.stringify(r,null,0));
  // open a few words as crates
  for(const w of ["fishing","city","rainbow","knot","can't"]){await p.evaluate(w=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));openWord({...allWords().find(x=>x.w===w)},{rung:w==="knot"?1:0});},w);await p.waitForTimeout(300);
    await p.screenshot({path:`lv_${w.replace("'","")}.png`});}
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));Books.shelf();});await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelector(".bshelf").scrollIntoView(false));await p.screenshot({path:"lv_shelf.png"});
  await p.evaluate(()=>Books.openBook("snowman"));await p.waitForTimeout(300);await p.click("#bStart");await p.waitForTimeout(500);await p.screenshot({path:"lv_book.png"});
  // every book renders all pages with art
  const bad=await p.evaluate(()=>{const bad=[];BOOKS.forEach(bk=>bk.pages.forEach(([t,items],i)=>items.forEach(([a])=>{if(a!=="ash"&&a!=="pet"&&a!=="mud"&&!(WORD_ART[a]&&ART[WORD_ART[a]])&&!ART[a])bad.push(bk.id+":"+a);})));
    BOOKS.forEach(bk=>bk.quiz.forEach(q=>(q.pics||[]).forEach(a=>{if(a!=="pet"&&!(WORD_ART[a]&&ART[WORD_ART[a]])&&!ART[a])bad.push(bk.id+" quiz:"+a);})));return bad;});
  console.log("missing art:",bad.join(",")||"none");
  console.log("errors:",errs.length?errs:"none");await b.close();srv.close();});
