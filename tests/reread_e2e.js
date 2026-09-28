// Read it again (v10.0, sentence fluency with no microphone): once a book page has been read, "🔁 Read it again" shows
// its words alone, large, with one Done. The time from the words appearing to Done is logged against the page's words
// and level when it is 0.8-90 s. The first logged reread of a page on a day pays 2 gems, later ones pay nothing, and
// nothing counts as a new read (reading counts, quests, the daily goal). The grown-up report's Reading speed shows words
// a minute by level. Old saves without the new fields load and work.
const {launch,check,waitFor,seed}=require("./lib");
const fs=require("fs"),path=require("path");
const LINE="Read it again, nice and smooth. Tap Done when you finish.";
const median=a=>{const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
(async()=>{const t=check("reread");
  // the device voice and the game voice are off, so the spoken line finishes at once and the words show straight away
  const {page:p,errs,close,E}=await launch({seed:{gems:50,settings:{tts:false,voicePack:false}}});
  const setup=()=>E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));
    window._spoke=[];const sp=Sound.speak;Sound.speak=function(x){window._spoke.push(String(x));return sp.apply(this,arguments);};});
  await setup();
  // gems are read after every step; any drop within a save is noted
  let last=null;const drops=[];
  const gems=async()=>{const g=await E("state.gems");if(last!=null&&g<last)drops.push(last+" to "+g);last=g;return g;};
  const reseed=async st=>{await seed(p,st);await setup();last=null;await gems();};

  // an old save (the shared seed has neither field) gets the defaults
  const f0=await E(()=>({r:state.reread,p:state.rereadPaid}));
  t.ok(JSON.stringify(f0)==='{"r":[],"p":{"date":"","pages":[]}}',"old save: reread and rereadPaid get their defaults "+JSON.stringify(f0));

  const startBook=async id=>{await E(i=>Books.openBook(i),id);await E(()=>document.getElementById("bStart").click());return waitFor(p,"#bRead");};
  const readPage=()=>E(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();});
  // opens the reread and waits for the words; back (ms) moves its start that far into the past; then Done
  const reread=async(back,{tap=false,wait=0}={})=>{
    if(tap)await p.tap("#bAgain");else await E(()=>document.getElementById("bAgain").click());
    const shown=await waitFor(p,()=>{const x=document.querySelector("#ovStory .rrtext"),c=Reread._cur();return !!(x&&x.style.display!=="none"&&c&&c.t0);});
    if(wait)await p.waitForTimeout(wait);
    if(back)await E(ms=>{Reread._cur().t0-=ms;},back);
    if(tap)await p.tap("#bAgainDone");else await E(()=>document.getElementById("bAgainDone").click());
    return shown;};
  const log=()=>E("state.reread.slice()");
  const snap=()=>E(()=>JSON.stringify({w:state.wordsRead,g:state.goal,q:state.quests,l:state.library,d:state.daily,c:state.comp}));

  // ---------- an old book, level 1 ----------
  t.ok(await startBook("cat_hat"),"a book opens on its first page");
  const before=await E(()=>{const a=document.getElementById("bAgain");return{b:!!a,v:!!a&&a.offsetParent!==null};});
  t.ok(before.b&&!before.v,"before the page is read, Read it again is not showing "+JSON.stringify(before));
  await readPage();
  const after=await E(()=>{const a=document.getElementById("bAgain"),n=document.getElementById("bNext");
    return{v:a.offsetParent!==null,beside:a.parentNode===n.parentNode&&a.nextElementSibling===n,label:a.textContent,spoke:window._spoke.slice()};});
  t.ok(after.v&&after.beside&&/Read it again/.test(after.label),"once it is read, Read it again shows beside Next "+JSON.stringify(after));
  t.ok(after.spoke.indexOf(LINE)<0,"nothing asks him to read it again: the line is only said when he taps the button");
  const s0=await snap(),g0=await gems();

  // the reread screen: the page's words alone, large, and one big Done
  await E(()=>document.getElementById("bAgain").click());
  const scr=await waitFor(p,()=>{const x=document.querySelector("#ovStory .rrtext");if(!x||x.style.display==="none")return false;
    const pg=document.querySelector("#ovStory .bpage"),btns=[...pg.querySelectorAll("button")].filter(b=>b.offsetParent!==null);
    return{text:x.textContent,size:parseFloat(getComputedStyle(x).fontSize),pic:[...pg.querySelectorAll(".bscene,.sitem,.blisten")].some(e=>e.offsetParent!==null),
      btns:btns.map(b=>b.id),close:document.getElementById("bClose").offsetParent!==null,spoke:window._spoke[window._spoke.length-1]};});
  t.ok(scr&&scr.text==="A cat sat."&&scr.size>=40,"the reread shows the page's words large "+JSON.stringify(scr));
  t.ok(scr&&!scr.pic&&scr.btns.length===1&&scr.btns[0]==="bAgainDone"&&!scr.close,"no picture, and Done is the only button");
  t.ok(scr&&scr.spoke===LINE,"when it opens it says: "+LINE);
  // a tap-through (under 0.8 s) logs nothing, pays nothing, says nothing
  const said0=await E("window._spoke.length");
  await E(()=>document.getElementById("bAgainDone").click());
  const tt=await E(()=>({n:state.reread.length,panel:!!document.querySelector("#ovStory .breread"),page:document.querySelector("#ovStory .bscene").offsetParent!==null,
    next:document.getElementById("bNext").offsetParent!==null,gem:!!document.querySelector("#ovStory .rrgem"),said:window._spoke.length}));
  t.ok(tt.n===0&&await gems()===g0&&!tt.gem&&tt.said===said0,"a tap-through under 0.8 s logs nothing, pays nothing and says nothing "+JSON.stringify(tt));
  t.ok(!tt.panel&&tt.page&&tt.next,"Done goes back to the page, still read, with Next");

  // a real reread (by touch, about 1.3 s): logged with the page's words and level, and pays 2 gems
  t.ok(await reread(0,{tap:true,wait:1300}),"the reread opens by touch and the words show");
  const r1=await log(),e1=r1[0]||{};
  t.ok(r1.length===1&&e1.t===1&&e1.w===3&&e1.ms>=1250&&e1.ms<=5000&&e1.d===await E("today()"),"a reread logs one entry: today, level 1, 3 words, the time "+JSON.stringify(r1));
  t.ok(await gems()===g0+2&&await E(()=>{const f=document.querySelector("#ovStory .rrgem");return !!f&&f.textContent==="+2 💎";}),"the first reread of the page today pays +2 💎, shown on the page");
  t.ok(JSON.stringify(await E("state.rereadPaid"))===JSON.stringify({date:await E("today()"),pages:["cat_hat:0"]}),"today's paid pages remember the page");
  // the same page again today: logged, no gems, no message
  await p.waitForTimeout(1400);
  await reread(5000);
  const r2=await log();
  t.ok(r2.length===2&&r2[1].w===3&&Math.abs(r2[1].ms-5000)<1500,"a second reread of the page still logs its time "+JSON.stringify(r2[1]));
  t.ok(await gems()===g0+2&&!(await E(`!!document.querySelector("#ovStory .rrgem")`)),"a second reread of the page the same day pays nothing and says nothing about it");
  // he walked away: over 90 s logs nothing
  await reread(91000);
  t.ok((await log()).length===2&&await gems()===g0+2,"a reread over 90 s logs nothing and pays nothing");
  t.ok(await snap()===s0,"rereads leave reading counts, quests, the daily goal, the library and the answers alone");

  // the next page: the button waits for the read again; a new page pays again
  await E(()=>document.getElementById("bNext").click());
  t.ok(await E(()=>Books._state().page===1&&document.getElementById("bAgain").offsetParent===null),"on the next page, Read it again waits until it is read");
  await readPage();await reread(6000);
  const r3=(await log())[2]||{};
  t.ok(r3.w===5&&r3.t===1&&await gems()===g0+4,"a reread of another page logs its 5 words and pays +2 💎 "+JSON.stringify(r3));

  // ---------- a new book with the hero's name, level 1; and a level-2 book ----------
  await startBook("zap_fox");await readPage();await reread(4000);
  const r4=(await log())[3]||{};
  t.ok(r4.w===4&&r4.t===1&&await gems()===g0+6,"a new book behaves the same: \"Asher got a box.\" is 4 words at level 1 "+JSON.stringify(r4));
  await startBook("pig_mud");await readPage();await reread(7000);
  const r5=(await log())[4]||{};
  t.ok(r5.w===7&&r5.t===2&&await gems()===g0+8,"a level-2 page logs level 2 and its 7 words "+JSON.stringify(r5));
  // a new day: the page pays again
  await E(()=>{state.rereadPaid.date="2000-01-01";});
  await startBook("cat_hat");await readPage();await reread(3000);
  t.ok(await gems()===g0+10&&JSON.stringify(await E("state.rereadPaid.pages"))==='["cat_hat:0"]',"on a new day the same page pays again, and the old day's list is cleared");
  await E("Books.close()");

  // ---------- the grown-up report ----------
  const all=await log();
  await E("openReport()");
  const rep=await E(()=>{const b=document.getElementById("rSpeed");if(!b)return null;
    return{html:b.innerHTML,rows:[...b.querySelectorAll("tr[data-t]")].map(r=>({t:+r.dataset.t,c:[...r.cells].map(x=>x.textContent)}))};});
  const want=[1,2].map(lv=>{const a=all.filter(x=>x.t===lv).map(x=>x.w*60000/x.ms);return{t:lv,now:Math.round(median(a.slice(-5))),n:a.length};});
  t.ok(rep&&rep.rows.length===2&&rep.rows.every((r,i)=>r.t===want[i].t&&r.c[1].indexOf(want[i].now+" wpm")===0&&+r.c[3]===want[i].n),
    "the report's Reading speed has a row per level: the middle words a minute of the last 5, and how many "+JSON.stringify(rep&&rep.rows)+" want "+JSON.stringify(want));
  const wpm2=rep&&rep.rows[1]?parseInt(rep.rows[1].c[1],10):0;
  t.ok(rep&&rep.rows.every(r=>{const n=parseInt(r.c[1],10);return n>=5&&n<=300;})&&wpm2>=55&&wpm2<=60,"the words a minute are plausible (7 words in about 7 s is 60 wpm: "+wpm2+")");
  t.ok(rep&&rep.rows.every(r=>/first week/.test(r.c[2]))&&/<b>6<\/b> rereads this week/.test(rep.html),"with no 5 before, it says first week; it counts this week's rereads "+(rep&&rep.html.slice(0,240)));
  await E(()=>document.getElementById("rClose").click());

  // ---------- a trend, the 400 cap and the 90 days, from a saved log ----------
  const today=await E("today()");
  const many=[{d:"2020-01-01",t:1,w:5,ms:5000}].concat(Array.from({length:399},()=>({d:today,t:1,w:4,ms:6000})),
    Array.from({length:5},()=>({d:today,t:3,w:6,ms:18000})),Array.from({length:5},()=>({d:today,t:3,w:6,ms:9000})));
  await reseed({gems:30,settings:{tts:false,voicePack:false},reread:many,rereadPaid:{date:today,pages:["pig_mud:0"]}});
  await E("openReport()");
  const tr=await E(()=>[...document.querySelectorAll("#rSpeed tr[data-t]")].map(r=>[...r.cells].map(x=>x.textContent)));
  t.ok(tr.length===2&&tr[1][0]==="Level 3"&&tr[1][1]==="40 wpm ↑"&&tr[1][2]==="20 wpm"&&tr[1][3]==="10","a level read faster than the 5 before shows the rise: "+JSON.stringify(tr));
  await E(()=>document.getElementById("rClose").click());
  const g1=await gems();
  await startBook("pig_mud");await readPage();await reread(7000);
  const kept=await E(()=>({n:state.reread.length,old:state.reread.some(x=>x.d<"2020-02-01"),last:state.reread[state.reread.length-1]}));
  t.ok(kept.n===400&&!kept.old&&kept.last.t===2&&kept.last.w===7,"the log keeps 90 days and at most 400 entries "+JSON.stringify(kept));
  t.ok(await gems()===g1,"a page already paid today (in the saved list) pays nothing after a reload");
  await E("Books.close()");

  // ---------- saved nulls, and his own book ----------
  await reseed({reread:null,rereadPaid:null,settings:{tts:false,voicePack:false},
    mybooks:[{id:"my_test",title:"My Cat",bg:"meadow",at:1,pages:[{a:"cat",words:["A","cat","sat","."]}]}]});
  t.ok(await E(`JSON.stringify([state.reread,state.rereadPaid])`)==='[[],{"date":"","pages":[]}]',"a saved null gets the defaults");
  await E("Books.shelf()");await startBook("my_test");await readPage();
  t.ok(await E(()=>document.getElementById("bNext").offsetParent!==null&&!document.getElementById("bAgain")),"his own book has no Read it again (it isn't levelled)");
  const g2=await gems();
  await startBook("fox_box");await readPage();await reread(5000);
  t.ok(await E(`state.reread.length===1&&state.reread[0].w===5&&state.rereadPaid.pages[0]==="fox_box:0"`)&&await gems()===g2+2,"after a saved null, a reread logs and pays as before");
  await E("Books.close()");

  // ---------- the report with no rereads ----------
  await reseed({settings:{tts:false,voicePack:false}});
  await E("openReport()");
  const none=await E(()=>{const b=document.getElementById("rSpeed");return b&&{tag:b.tagName,text:b.textContent,prev:b.previousElementSibling&&b.previousElementSibling.textContent};});
  t.ok(none&&none.tag==="P"&&none.prev==="Reading speed"&&/No rereads yet/.test(none.text),"with no rereads, one quiet line says what it will show "+JSON.stringify(none));

  // the spoken line is listed for the voice generator
  const texts=JSON.parse(fs.readFileSync(path.join(__dirname,"../tools/voice/voice_texts.json"),"utf8"));
  t.ok(texts.sents.indexOf(LINE)>=0,"the spoken line is in tools/voice/voice_texts.json");
  t.ok(!drops.length,"gems never went down"+(drops.length?": "+drops.join(", "):""));
  t.ok(!errs.length,"no page or console errors: "+errs.join(" | "));
  await close();t.done();})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
