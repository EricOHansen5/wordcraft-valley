// Viewport survey: screenshots every screen of the game at iPad sizes, and writes a layout audit beside them.
//   node tools/viewport-survey.js <out dir> [passes] [only]
//   passes: a comma list of land, port, look, air, phone (default land,port,look,air,phone)
//     land  1024×768  iPad 9th generation, landscape (the main device)
//     port  768×1024  the same iPad, portrait
//     look  1024×768  landscape again, with the Halloween look worn
//     air   1180×820  iPad Air, landscape
//     phone 430×932   a phone, portrait
//   only: a comma list of screen names (or parts of them) to take, for a quick look at a few
// Each pass writes <out>/<pass>/<nn>-<screen>.jpg and <out>/<pass>/audit.json. The audit lists, for what is on top:
// sideways page scroll, tap targets under 44 px, buttons cut off by the screen edge (and whether a scroll can reach
// them), panels taller than the screen, and the tool bar's overflow. It is a survey, not a test: run-all.js skips it.
"use strict";
const path=require("path"),fs=require("fs");
const {launch,seed,waitFor}=require("../tests/lib");
const OUT=process.argv[2];
if(!OUT){console.log("usage: node tools/viewport-survey.js <out dir> [land,port,look,air,phone] [screen,screen]");process.exit(2);}
const PASSES=(process.argv[3]||"land,port,look,air,phone").split(",").filter(Boolean);
const ONLY=(process.argv[4]||"").split(",").filter(Boolean);
const UA="Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const SIZES={land:[1024,768],port:[768,1024],look:[1024,768],air:[1180,820],phone:[430,932]};
const FIX=JSON.parse(fs.readFileSync(path.join(__dirname,"../tests/fixtures/v8-era.json"),"utf8"));

function richSave(look){
  const s=JSON.parse(JSON.stringify(FIX));
  s.tour=99;s.mine=s.mine||{};s.mine.coins=40;
  s.jobs={current:null,xp:{shop:20,mow:8},tasks:28,streak:1};
  s.exchangeSeen=true;
  if(look){s.looks={halloween:{pieces:["pumpkins","ghost","bats","hat"]}};s.look="halloween";}
  return s;
}

// ---------- in the page: the audit ----------
function audit(){
  const W=innerWidth,H=innerHeight,out={w:W,h:H};
  const de=document.documentElement;
  out.hscroll=Math.max(de.scrollWidth,document.body.scrollWidth)>W+1;
  out.vscroll=Math.max(de.scrollHeight,document.body.scrollHeight)>H+1;
  const vis=el=>{if(!el||!el.getClientRects().length)return false;const cs=getComputedStyle(el);
    if(cs.visibility==="hidden"||+cs.opacity===0)return false;const r=el.getBoundingClientRect();return r.width>1&&r.height>1;};
  const name=el=>{let s=el.tagName.toLowerCase();if(el.id)s+="#"+el.id;else if(el.className&&typeof el.className==="string")s+="."+el.className.trim().split(/\s+/).slice(0,2).join(".");
    const t=(el.getAttribute("aria-label")||el.textContent||"").replace(/\s+/g," ").trim().slice(0,24);return t?s+" \""+t+"\"":s;};
  // the layer on top: the last shown overlay / Mine panel, else the Mine, else the Adventure HUD, else the valley
  const layers=[...document.querySelectorAll(".overlay.on,.evo.on")].filter(vis);
  let layer=null;
  const mp=document.querySelector("#mineMode.on .mpanel.on");
  if(mp)layer=mp;else if(layers.length)layer=layers.sort((a,b)=>(+getComputedStyle(a).zIndex||0)-(+getComputedStyle(b).zIndex||0)).pop();
  else if(document.querySelector("#mineMode.on"))layer=document.querySelector("#mineMode");
  else if(document.querySelector("#advHud.on"))layer=document.querySelector("#advHud");
  out.layer=layer?name(layer):"valley";
  const root=layer||document.body;
  // the panel in the layer: its box, and whether its content is taller than it is
  const panel=layer&&(layer.querySelector(".sheet,.bpage,.mcard,.scene")||null);
  if(panel){const r=panel.getBoundingClientRect();
    out.panel={el:name(panel),top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),
      content:panel.scrollHeight,scrolls:panel.scrollHeight>panel.clientHeight+2,wide:panel.scrollWidth>panel.clientWidth+2,offscreen:r.bottom>H+1||r.top<-1};}
  const scroller=el=>{for(let p=el.parentElement;p&&p!==document.documentElement;p=p.parentElement){const cs=getComputedStyle(p);
    if(/(auto|scroll)/.test(cs.overflowY+cs.overflowX)&&(p.scrollHeight>p.clientHeight+2||p.scrollWidth>p.clientWidth+2))return p;}return null;};
  const TAP="button,label.btn,a[href],input,select,textarea,.crate,.bcov,.pick,.jcard,.tdoor,.ltdoor,.psopt,.wpic,.mpic,.slot,[data-close]";
  const els=[...root.querySelectorAll(TAP)].filter(vis).filter((e,i,a)=>a.indexOf(e)===i);
  out.small=[];out.cut=[];out.covered=[];
  els.forEach(el=>{
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    if(cs.pointerEvents==="none")return;
    // a target under 44 px either way (text inputs and selects are grown-up controls, listed all the same)
    if(r.width<44||r.height<44)out.small.push(name(el)+" "+Math.round(r.width)+"×"+Math.round(r.height));
    const off=r.right>W+1||r.bottom>H+1||r.left<-1||r.top<-1;
    if(off){const s=scroller(el);out.cut.push(name(el)+` at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`+(s?" (scroll in "+name(s).split(" ")[0]+")":" (NO SCROLL REACHES IT)"));return;}
    // on screen: is something else on top of its middle?
    const x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);
    if(hit&&hit!==el&&!el.contains(hit)&&!hit.contains(el))out.covered.push(name(el)+" under "+name(hit));
  });
  const dock=document.getElementById("dock");
  if(dock&&!layer){const r=dock.getBoundingClientRect();out.dock={w:dock.clientWidth,content:dock.scrollWidth,overflow:dock.scrollWidth>dock.clientWidth+1,h:Math.round(r.height),top:Math.round(r.top)};}
  const hud=document.getElementById("hud");if(hud&&!layer)out.hud=Math.round(hud.getBoundingClientRect().height);
  const st=document.getElementById("stage");if(st&&!layer)out.stage=Math.round(st.getBoundingClientRect().height);
  return out;
}

// ---------- the screens ----------
// each is [name, async (ctx) => {...set it up...}]; the screenshot and audit follow. tidy() runs between screens.
const SCREENS=[];
const add=(name,fn)=>SCREENS.push([name,fn]);
const E=(c,f,a)=>c.p.evaluate(f,a);
const nap=(c,ms)=>c.p.waitForTimeout(ms);
async function shut(c){
  await E(c,()=>{
    try{if(window.Jobs&&Jobs.isOpen&&document.querySelector("#ovJob.on"))Jobs.close();}catch(e){}
    document.querySelectorAll(".overlay.on,.evo.on").forEach(o=>{try{Modes.shut(o);}catch(e){o.classList.remove("on");}});
    try{if(document.querySelector("#mineMode.on"))Mine.exit();}catch(e){}
    try{if(Adv.on)Adv.exit();}catch(e){}
    document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));
  });
  await nap(c,250);
}

add("valley",async c=>{await nap(c,300);});
add("valley-dock-scrolled-end",async c=>{await E(c,()=>{const d=document.getElementById("dock");d.scrollLeft=d.scrollWidth;});await nap(c,150);});
add("crates",async c=>{await E(c,()=>{document.getElementById("dock").scrollLeft=0;});await c.p.click("#crateBtn",{force:true});await waitFor(c.p,"#ovCrates.on");await nap(c,350);});
add("crate-rung0-find",async c=>{await E(c,()=>{state.stats.frog=state.stats.frog||{};state.stats.frog.seen=0;openWord(Object.assign({},WORDS.find(x=>x.w==="frog"),{rung:0}));});await nap(c,450);});
add("crate-rung0-listen",async c=>{await E(c,()=>{const w=WORDS.find(x=>x.w==="ship");openWord(Object.assign({},w,{rung:0}));try{renderListen(w);}catch(e){}});await nap(c,450);});
add("crate-rung1-build",async c=>{await E(c,()=>openWord(Object.assign({},WORDS.find(x=>x.w==="frog"),{rung:1})));await nap(c,450);});
add("crate-rung1-build-long",async c=>{await E(c,()=>{const w=WORDS.find(x=>x.w==="sandwich")||WORDS.filter(x=>x.p.length>=6)[0];openWord(Object.assign({},w,{rung:1}));});await nap(c,450);});
add("crate-rung2-read",async c=>{await E(c,()=>openWord(Object.assign({},WORDS.find(x=>x.w==="frog"),{rung:2})));await nap(c,450);});
add("crate-story",async c=>{await E(c,()=>openScramble(SIGNS[0]));await nap(c,450);});
add("crate-swap",async c=>{await E(c,()=>openSwap(swapPairs()[0]));await nap(c,450);});
add("crate-picit",async c=>{await E(c,()=>openPicIt());await nap(c,450);});
add("reward",async c=>{await shut(c);await E(c,()=>{document.getElementById("rewardArt").innerHTML=drawThing("windmill",1);document.getElementById("rewardName").textContent="A windmill!";
  document.getElementById("rewardWord").textContent="You read frog.";show("ovReward");});await nap(c,500);});
// the shared reading challenges, in the story quest sheet (where a lock in "The Letter Thief" shows them)
for(const k of ["pic","wordPick","sentence","build"])add("read-"+k,async c=>{await E(c,k=>{const s=QuestSheet.sheet(`<div class="qhead"><span class="qbook">📖</span><b>Chapter 1: The Letter Thief</b><button class="bx" id="qX">✕</button></div><div class="qbody" id="svHost"></div>`);
  s.querySelector("#qX").onclick=QuestSheet.close;Read[k](s.querySelector("#svHost"),()=>{});},k);await nap(c,450);});
add("books-shelf",async c=>{await shut(c);await c.p.click("#booksBtn",{force:true});await waitFor(c.p,"#ovStory.on .bshelf");await nap(c,400);});
add("books-shelf-bottom",async c=>{await E(c,()=>{const b=document.querySelector("#ovStory .bpage");if(b)b.scrollTop=b.scrollHeight;});await nap(c,200);});
add("book-cover",async c=>{await E(c,()=>Books.openBook("cat_hat"));await nap(c,450);});
add("book-page",async c=>{await E(c,()=>document.getElementById("bStart").click());await waitFor(c.p,"#bRead");await nap(c,400);});
add("book-page-read",async c=>{await E(c,()=>{const b=document.getElementById("bRead");b.disabled=false;b.click();});await nap(c,300);});
add("book-reread",async c=>{await E(c,()=>{const b=document.getElementById("bAgain");if(b)b.click();});await nap(c,500);
  await E(c,()=>{const t=document.querySelector(".rrtext"),w=document.querySelector(".rrwait");if(t)t.style.display="";if(w)w.style.display="none";});await nap(c,200);});
add("book-quiz",async c=>{
  await E(c,()=>{const d=document.getElementById("bAgainDone");if(d)d.click();});
  for(let i=0;i<12;i++){
    const at=await E(c,()=>{if(document.querySelector("#ovStory .bopts"))return"quiz";const r=document.getElementById("bRead");if(r){r.disabled=false;r.click();}
      const n=document.getElementById("bNext");if(n)n.click();return"page";});
    if(at==="quiz")break;await nap(c,250);}
  await nap(c,400);});
add("book-quiz-said",async c=>{await E(c,()=>{const b=BOOKS.find(x=>x.quiz&&x.quiz.some(q=>q.said));if(!b)return;Books.openBook(b.id);});await nap(c,200);
  for(let i=0;i<20;i++){const at=await E(c,()=>{const o=document.querySelector("#ovStory .bopts");if(o&&document.querySelector("#ovStory .bsaid"))return"said";
      if(o){const a=o.dataset.ans,b=o.querySelector(`[data-v="${a}"]`);if(b)b.click();return"q";}
      const s=document.getElementById("bStart");if(s){s.click();return"cover";}const r=document.getElementById("bRead");if(r){r.disabled=false;r.click();}
      const n=document.getElementById("bNext");if(n)n.click();return"page";});
    if(at==="said")break;await nap(c,at==="q"?1100:250);}
  await nap(c,400);});
add("book-end",async c=>{for(let i=0;i<10;i++){const at=await E(c,()=>{if(document.querySelector("#ovStory .bpage.end"))return"end";const o=document.querySelector("#ovStory .bopts");
      if(o){const b=o.querySelector(`[data-v="${o.dataset.ans}"]`);if(b)b.click();}return"q";});if(at==="end")break;await nap(c,1100);}await nap(c,400);});
add("together-choose",async c=>{await shut(c);await E(c,()=>{state.settings.together="";Books.shelf();});await nap(c,300);
  await E(c,()=>document.getElementById("bTogether").click());await nap(c,200);
  await E(c,()=>{const b=document.querySelector("#ovStory .bcov:not(.locked):not(.maker)");if(b)b.click();});await nap(c,450);});
add("together-cover",async c=>{await E(c,()=>{const w=document.querySelector("#ovStory .tgway");if(w)w.click();});await nap(c,450);});
add("together-dad-page",async c=>{await E(c,()=>{const s=document.getElementById("bStart");if(s)s.click();});await nap(c,450);});
add("adventure",async c=>{await shut(c);await E(c,()=>Adv.enter());await waitFor(c.p,"#advHud.on");await nap(c,900);});
add("adventure-note",async c=>{await E(c,()=>{const h=document.getElementById("advHunt");if(h)h.click();});await nap(c,600);});
add("adventure-act",async c=>{await E(c,()=>{const n=document.getElementById("advNote");if(n)n.innerHTML="";const f=Adv.freePos(0),v=state.vehicles[0];v.c=f.c;v.r=f.r;Adv._P.c=f.c+.3;Adv._P.r=f.r;});await nap(c,700);});
add("wilds",async c=>{await E(c,()=>Wild.start());await waitFor(c.p,"#ovWild.on");await nap(c,1200);});
add("wilds-round2",async c=>{await E(c,()=>{const h=document.querySelector("#ovWild #wQ");if(h&&h.dataset.ans)window.__answer("#ovWild #wQ");});await nap(c,2200);});
add("dex",async c=>{await E(c,()=>{Modes.shut(document.getElementById("ovWild"));Dex.open();});await nap(c,450);});
add("race",async c=>{await E(c,()=>{document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o));Race.start(state.vehicles[0]);});await nap(c,900);});
add("race-question",async c=>{await nap(c,2500);});
add("care",async c=>{await shut(c);await E(c,()=>{const cr=state.critters.find(x=>CRIT(x.id))||state.critters[0];cr.fed="";Care.feed(cr);});await nap(c,500);});
add("mine",async c=>{await shut(c);await E(c,()=>Mine.enter());await waitFor(c.p,"#mineMode.on");await nap(c,1500);});
add("mine-shop",async c=>{await E(c,()=>{state.mine.bag={1:2,3:1};Mine._openShop();});await nap(c,700);});
add("mine-clothes",async c=>{await E(c,()=>{const x=document.querySelector("#mPanel.on #mClose");if(x)x.click();Mine._openWardrobe();});await nap(c,600);});
add("mine-tasks",async c=>{await E(c,()=>{const x=document.querySelector("#mPanel.on #mClose");if(x)x.click();Mine._openJobs();});await nap(c,600);});
add("mine-smith",async c=>{await E(c,()=>{const x=document.querySelector("#mPanel.on #mClose");if(x)x.click();Mine._openSmith();});await nap(c,600);});
add("mine-museum",async c=>{await E(c,()=>{const x=document.querySelector("#mPanel.on #mClose");if(x)x.click();Mine._openMuseum();});await nap(c,600);});
add("mine-vault",async c=>{await E(c,()=>{const x=document.querySelector("#mPanel.on #mClose");if(x)x.click();Mine._openVault(0);});await nap(c,600);});
add("mine-boss",async c=>{await E(c,()=>{const x=document.querySelector("#mPanel.on #mClose");if(x)x.click();Mine._startBoss(0);});await nap(c,1400);});
add("jobs-board",async c=>{await shut(c);await E(c,()=>{state.settings.tierOverride=5;Jobs.open();});await waitFor(c.p,"#ovJob.on .jcard");await nap(c,400);});
add("jobs-intro",async c=>{await E(c,()=>{const b=document.querySelector('#ovJob .jcard[data-job="shop"]');if(b)b.click();});await nap(c,400);});
for(const [job,task] of [["shop","order"],["shop","count"],["shop","add"],["shop","coins"],["mow","mow"],["mow","count"],["mow","array"]])
  add(`job-${job}-${task}`,async c=>{
    await E(c,([job,task])=>{if(!Jobs._S()||Jobs._S().job!==job){Jobs.clockIn(job);}Jobs._next(task);},[job,task]);
    await waitFor(c.p,()=>{const h=document.getElementById("jQ");return h&&h.dataset.kit;},{timeout:4000});await nap(c,500);
    // the step after a reading step (the count, the sum) is where the pad shows
    if(task!=="order"&&task!=="mow"){await E(c,()=>{const h=document.getElementById("jQ"),k=h.dataset.kit,a=h.dataset.ans;
        if(k==="pick"){const b=h.querySelector(`[data-w="${a}"]`);if(b)b.click();}
        if(k==="path"){for(const d of a){const b=h.querySelector(`[data-dir="${d}"]`);if(b)b.click();}}});
      await waitFor(c.p,()=>{const h=document.getElementById("jQ");return h&&h.dataset.kit==="pad";},{timeout:4000});await nap(c,500);}
  });
add("job-moment",async c=>{await E(c,()=>{Jobs._S();});await nap(c,100);});
add("job-clockout",async c=>{await E(c,()=>{const b=document.getElementById("jOut");if(b)b.click();});await nap(c,400);});
add("store-outfit",async c=>{await shut(c);await E(c,()=>{state.settings.tierOverride=0;Store.open("outfit");});await nap(c,500);});
add("store-outfit-bottom",async c=>{await E(c,()=>{const s=document.querySelector("#ovStore .sheet")||document.querySelector(".overlay.on .sheet");if(s)s.scrollTop=s.scrollHeight;});await nap(c,200);});
add("store-gear",async c=>{await E(c,()=>Store.open("gear"));await nap(c,400);});
add("store-swap",async c=>{await E(c,()=>Store.open("swap"));await nap(c,400);});
add("closet",async c=>{await shut(c);await c.p.click("#closetBtn",{force:true});await nap(c,500);});
add("album-words",async c=>{await shut(c);await c.p.click("#albumBtn",{force:true});await nap(c,500);});
add("album-badges",async c=>{await E(c,()=>document.querySelector('[data-atab="badges"]').click());await nap(c,300);});
add("album-wardrobe",async c=>{await E(c,()=>document.querySelector('[data-atab="hats"]').click());await nap(c,300);});
add("album-garage",async c=>{await E(c,()=>document.querySelector('[data-atab="garage"]').click());await nap(c,300);});
add("quests",async c=>{await shut(c);await c.p.click("#questBtn",{force:true});await nap(c,500);});
add("plans",async c=>{await shut(c);await c.p.click("#craftBtn",{force:true});await nap(c,500);});
add("story-quest",async c=>{await shut(c);await E(c,()=>{state.quest.active=null;state.quest.day="";Quest.start();});await nap(c,500);});
add("story-temple",async c=>{await shut(c);await E(c,()=>{const i=Quest.CH.findIndex(x=>x.type==="temple");if(i<0)return;state.quest.ch=i;state.quest.active={type:"temple",found:[],spots:null};Quest.start();});await nap(c,600);});
add("note",async c=>{await shut(c);await E(c,()=>Notes.open(state.notes[0]));await nap(c,500);});
add("write",async c=>{await shut(c);await E(c,()=>Write.start());await nap(c,500);});
add("mybook",async c=>{await shut(c);await E(c,()=>MyBook.create());await nap(c,500);});
add("sign",async c=>{await shut(c);await E(c,()=>{document.getElementById("signText").innerHTML="The <span class='w'>fox</span> can <span class='w'>run</span> to the <span class='w'>big</span> red <span class='w'>well</span>.";show("ovSign");});await nap(c,400);});
add("recap",async c=>{await shut(c);await E(c,()=>show("ovRecap"));await nap(c,400);});
add("photo",async c=>{await shut(c);await E(c,()=>show("ovPhoto"));await nap(c,400);});
add("gate",async c=>{await shut(c);await c.p.click("#parentBtn",{force:true});await nap(c,400);});
add("menu-progress",async c=>{await E(c,()=>{document.getElementById("gateA").value=gateAnswer;document.getElementById("gateGo").click();});await nap(c,500);});
for(const t of ["words","voice","pack","notes","set"])add("menu-"+t,async c=>{await E(c,t=>{const s=document.querySelector("#ovParent .sheet");if(s)s.scrollTop=0;document.querySelector(`#ovParent [data-tab="${t}"]`).click();},t);await nap(c,300);});
add("menu-set-bottom",async c=>{await E(c,()=>{const s=document.querySelector("#ovParent .sheet");s.scrollTop=s.scrollHeight;});await nap(c,200);});
add("report",async c=>{await E(c,()=>{document.querySelector('#ovParent [data-tab="prog"]').click();document.getElementById("reportBtn").click();});await nap(c,700);});
add("report-bottom",async c=>{await E(c,()=>{const s=document.querySelector("#ovReport .sheet");if(s)s.scrollTop=s.scrollHeight;});await nap(c,200);});
// the holidays: each window on a day inside it
add("valley-halloween",async c=>{await shut(c);await E(c,()=>{Trick._setToday("2026-10-20");renderHUD();});await nap(c,500);});
add("valley-halloween-dock-end",async c=>{await E(c,()=>{const d=document.getElementById("dock");d.scrollLeft=d.scrollWidth;});await nap(c,150);});
add("trick-adventure",async c=>{await E(c,()=>{document.getElementById("dock").scrollLeft=0;Trick.open();});await nap(c,1200);});
add("trick-knock",async c=>{await E(c,()=>{const d=Trick.doors().find(x=>!x.shut);if(d)Trick.knock(d.id);});await nap(c,900);});
add("feast",async c=>{await shut(c);await E(c,()=>{Trick._setToday(null);Feast._setToday("2026-11-20");renderHUD();Feast.open();});await nap(c,900);});
add("valley-feast",async c=>{await shut(c);await nap(c,200);});
add("lights",async c=>{await shut(c);await E(c,()=>{Feast._setToday(null);Lights._setToday("2026-12-06");renderHUD();Lights.open();});await nap(c,900);});
add("lights-door",async c=>{await E(c,()=>{const d=Lights.doors().find(x=>x.state==="ready");if(d)Lights.knock(d.n);});await nap(c,900);});
add("valley-lights",async c=>{await shut(c);await nap(c,200);});

// ---------- a pass ----------
async function pass(name){
  const [w,h]=SIZES[name];const dir=path.join(OUT,name);fs.mkdirSync(dir,{recursive:true});
  const {page:p,errs,close}=await launch({static:true,viewport:{width:w,height:h},console:false,
    context:{deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:UA}});
  const c={p};
  await seed(p,richSave(name==="look"),{base:null});
  // quiet: nothing waits on a voice
  await E(c,()=>{try{Sound.speak=()=>Promise.resolve();Sound.say=()=>Promise.resolve();}catch(e){}});
  const log={};let n=0;
  for(const [sn,fn] of SCREENS){n++;
    if(ONLY.length&&!ONLY.some(o=>sn.indexOf(o)>=0))continue;
    const file=String(n).padStart(2,"0")+"-"+sn;
    try{await fn(c);}catch(e){log[file]={error:String(e&&e.message||e).slice(0,300)};console.log(`  ${name}/${file}: ${log[file].error}`);continue;}
    try{await p.screenshot({path:path.join(dir,file+".jpg"),type:"jpeg",quality:78});log[file]=await p.evaluate(audit);}
    catch(e){log[file]={error:String(e&&e.message||e).slice(0,300)};}
  }
  log._errors=errs.slice(0,20);
  fs.writeFileSync(path.join(dir,"audit.json"),JSON.stringify(log,null,1));
  await close();
  console.log(`${name}: ${Object.keys(log).length-1} screens, ${errs.length} page errors`);
}
(async()=>{for(const ps of PASSES)if(SIZES[ps])await pass(ps);})().catch(e=>{console.log("survey crashed: "+(e&&e.stack||e));process.exit(1);});
