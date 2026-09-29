// Factory (v10): the free plan lands once in an old save; the building opens the Factory (a tap in the valley, a spot in
// Adventure); level 1 built by touch (drag to paint a belt, tap to turn one) and level 2 on the keyboard; the order is
// read out and the tally board fills; the sum on the Jobs pad (a miss takes nothing, the tally board glows, the second
// miss shows the answer faintly, Tracks records it); pay once (5 💎 and 1 per new star), stars only add, a double tap
// and a double finish pay once; every level's known solution through the real board, the same 3 runs in a row, and
// each machine's output; a jammed layout shows the right tip; his own factory survives a reload and pays 5 side
// orders a day, deliveries alone nothing; it only runs while open and visible; the board fits the iPad both ways.
const {launch,seed,reload,waitFor,check}=require("./lib");
(async()=>{
  const T=check("factory"),ok=T.ok;
  const FREE="Free plan: Factory — it's in your plans 📐";
  // every toast, from the first moment of each page load (the free plan's comes before a test could wrap toast())
  const INIT=()=>{window.__toasts=[];document.addEventListener("DOMContentLoaded",()=>{const t=document.getElementById("toast");
    if(t)new MutationObserver(()=>window.__toasts.push(t.textContent)).observe(t,{childList:true,characterData:true,subtree:true});});};
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},init:INIT,seed:{gems:40,settings:{goal:0}}});
  const J=x=>JSON.stringify(x),wait=ms=>p.waitForTimeout(ms);
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const quiet=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};Sound.say=()=>Promise.resolve();});
  const said=()=>E(()=>window.__said.slice());
  const S=()=>E(()=>Factory._S());
  const gems=()=>E(()=>state.gems);
  const DEF={lvl:0,stars:{},sandbox:null,orders:{day:"",paid:0}};

  // ---- 1. an old save from before the Factory: the free plan, once ----
  ok(await waitFor(p,s=>window.__toasts.indexOf(s)>=0,{arg:FREE,timeout:8000}),"an old save gets the toast \""+FREE+"\"");
  ok(await E(()=>state.blueprints.filter(b=>b==="factory").length===1&&document.getElementById("planBadge").classList.contains("on")),
    "...the Factory is in his plans once, and the plans button shows its badge "+J(await E(()=>state.blueprints)));
  ok(J(await E(()=>state.factory))===J(DEF),"...and the save gets state.factory at its defaults "+J(await E(()=>state.factory)));
  await wait(600);
  ok(await E(()=>DB.get("kv","state").then(s=>s.blueprints.filter(b=>b==="factory").length===1&&!!s.factory)),"...written to the stored save");
  await reload(p,{settle:0});
  await wait(6500);
  ok(await E(s=>window.__toasts.indexOf(s)<0&&state.blueprints.filter(b=>b==="factory").length===1,FREE),"loading it again: no second free plan, still one Factory plan "+J(await E(()=>window.__toasts)));
  await tidy();await p.click("#craftBtn");await waitFor(p,()=>Modes.top()==="craft");
  const card=await E(()=>{const c=[...document.querySelectorAll("#craftGrid .card2")].find(x=>/Factory/.test(x.querySelector(".nm").textContent));
    return c&&{art:!!c.querySelector(".art svg .spin"),cost:c.querySelector(".cost").textContent,btn:c.querySelector("button").textContent};});
  ok(card&&card.art&&/10 gems/.test(card.cost)&&/Build it/.test(card.btn),"the plans list the Factory: its picture (with a turning gear) and 10 gems to build "+J(card));
  await tidy();

  // ---- 2. the building in the valley: a tap opens the Factory, straight into level 1 the first time ----
  await seed(p,{gems:40,settings:{goal:0},grid:{"6,8":{id:"cottage",seed:3,lv:1},"12,7":{id:"factory",seed:1,lv:1}}});
  await quiet();await tidy();
  await E(()=>{bringIntoView(geom(12,7).x);});await wait(500);
  await E(()=>document.querySelector('#tiles .tile[data-build="factory"]').click());
  ok(await waitFor(p,()=>Modes.top()==="factory"&&document.querySelector("#ovFactory.on")),"a tap on the Factory in the valley opens it (mode \"factory\")");
  let s=await S();
  ok(s&&s.n===1&&s.view==="board"&&await E(()=>Factory._w().W===12&&Factory._w().H===9),"the first time it opens straight on level 1's 12 × 9 board "+J(s&&{n:s.n,view:s.view}));
  ok(await E(()=>document.getElementById("fcSend").textContent==="📦 Send 5 🔴"),"the order card: "+await E(()=>document.getElementById("fcSend").textContent));
  await wait(900);
  let heard=await said();
  ok(heard.indexOf("Put a drill on the red rock. Then draw a belt to the truck!")>=0&&heard.some(t=>/^Send 5 red\.?$/.test(t)),"the level and its order are read out "+J(heard));
  ok(await E(()=>{const m=Modes.list().factory;return !!m&&m.name==="Factory"&&m.reading===false&&(state.modeOpens[today()]||{}).factory>=1;}),"the Factory mode: not reading time, and its opens are counted");
  // the iPad in landscape: the whole board, the order card beside it, big palette buttons, nothing to scroll
  const lay=await E(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),cv=r("#fcCv"),cd=r(".fccard"),sh=document.querySelector("#ovFactory .sheet");
    return{cv:[cv.left,cv.top,cv.right,cv.bottom].map(Math.round),card:Math.round(cd.left),vh:innerHeight,vw:innerWidth,scroll:sh.scrollHeight-sh.clientHeight,
      tools:[...document.querySelectorAll(".fctool")].map(b=>[b.dataset.tool,Math.round(b.getBoundingClientRect().width),Math.round(b.getBoundingClientRect().height)])};});
  ok(lay.cv[0]>=0&&lay.cv[1]>=0&&lay.cv[2]<=lay.vw&&lay.cv[3]<=lay.vh&&lay.card>=lay.cv[2]&&lay.scroll<=2&&lay.cv[2]-lay.cv[0]>=600,"1024 × 768: the board fits beside the order card, nothing to scroll "+J(lay.cv)+" card "+lay.card+" scroll "+lay.scroll);
  ok(J(lay.tools.map(t=>t[0]))===J(["belt","drill","erase"])&&lay.tools.every(t=>t[1]>=56&&t[2]>=56),"level 1's palette: belt, drill and erase, each 56 px or more "+J(lay.tools));

  // ---- 3. level 1 by touch: a drill on the rock, drag a belt to the truck, tap a belt to turn it ----
  const cdp=await p.context().newCDPSession(p);
  const at=(c,r)=>E(([c,r])=>{const b=document.getElementById("fcCv").getBoundingClientRect(),w=Factory._w();return[b.left+(c+.5)*b.width/w.W,b.top+(r+.5)*b.height/w.H];},[c,r]);
  const drag=async cells=>{const pts=[];for(const [c,r] of cells)pts.push(await at(c,r));
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:pts[0][0],y:pts[0][1]}]});
    for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];for(const f of [.5,1])await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f}]});}
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await wait(80);};
  const tapCell=async(c,r)=>{const q=await at(c,r);await p.touchscreen.tap(q[0],q[1]);await wait(80);};
  const cellOf=(c,r)=>E(([c,r])=>{const w=Factory._w(),i=r*w.W+c;return{t:w.type[i],d:w.dir[i]};},[c,r]);
  await p.tap('.fctool[data-tool="drill"]');
  ok((await S()).tool==="drill"&&await E(()=>document.querySelector('.fctool[data-tool="drill"]').classList.contains("on")),"tap the drill in the palette: it is picked");
  await tapCell(2,4);
  ok(J(await cellOf(2,4))===J({t:2,d:1}),"tap the red rock: a drill, facing the truck "+J(await cellOf(2,4)));
  await tapCell(5,5);
  ok((await cellOf(5,5)).t===0,"a drill won't go on plain ground");
  await p.tap('.fctool[data-tool="belt"]');
  await drag([[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4]]);
  ok(await E(()=>Factory.engine.encode(Factory._w())===Factory.LEVELS[0].sol),"drag from the drill to the truck: six belts that follow the finger, the same layout as the known solution");
  await tapCell(5,4);
  const turned=await cellOf(5,4);await tapCell(5,4);await tapCell(5,4);await tapCell(5,4);
  ok(turned.d===2&&(await cellOf(5,4)).d===1,"tap a belt and it turns; four taps and it is back "+J(turned));
  // a corner: drag down and right paints belts that turn at the corner, and erase takes them off again
  await drag([[4,6],[4,7],[5,7],[6,7]]);
  ok(J([await cellOf(4,6),await cellOf(4,7),await cellOf(5,7),await cellOf(6,7)].map(x=>x.t+":"+x.d))===J(["1:2","1:1","1:1","1:1"]),"a drag that turns a corner makes a belt that turns there");
  await p.tap('.fctool[data-tool="erase"]');await drag([[4,6],[4,7],[5,7],[6,7]]);
  ok(await E(()=>Factory.engine.encode(Factory._w())===Factory.LEVELS[0].sol)&&(await S()).pieces===7,"🗑 erase: drag over them and they are gone");
  await p.tap('.fctool[data-tool="belt"]');
  const g0=await gems(),tr0=await E(()=>JSON.parse(JSON.stringify(((state.tracks.math||{}).stats||{}).count10||{seen:0,right:0})));
  await p.tap("#fcRun");
  ok((await S()).running&&await E(()=>document.getElementById("fcRun").textContent==="⏸ Pause"),"▶ runs the factory (the button says ⏸ Pause)");
  await waitFor(p,()=>Factory._w().sent>=1,{timeout:8000});
  ok(await E(()=>Factory._S().t>=100&&Factory._w().sent>=1),"it runs in real time: the first red rock reaches the truck "+J(await E(()=>({t:Factory._S().t,sent:Factory._w().sent}))));
  ok(await E(()=>document.querySelectorAll('#fcTally .fcrow[data-it="1"] .fcframe i.on').length===Factory._w().got[1]&&document.querySelectorAll('#fcTally .fcframe i.off').length===5),
    "the tally board: a ten-frame with 5 places, one red dot for each rock the truck got");
  ok(await waitFor(p,()=>Factory._S().done,{timeout:15000}),"the order is met: 5 red");
  const r1=await S();
  ok(r1.result&&r1.result.stars===3&&r1.result.gems===8&&await gems()===g0+8,"3 stars: 5 💎 for the first finish and 1 for each star, paid at once "+J(r1.result));
  ok(await E(()=>state.factory.lvl===1&&state.factory.stars.F1===3),"the save: level 1 done, 3 stars");
  ok(await waitFor(p,()=>{const h=document.getElementById("fcQ");return h&&h.dataset.kit==="pad"&&h.dataset.ans==="5";},{timeout:4000}),"then the sum on the number pad: how many did you send? (5)");
  ok(await E(()=>/How many did you send/.test(document.querySelector("#fcQ .jsay").textContent)&&document.querySelector("#fcQ .jsum").textContent==="🔴 = ?"),"...asked aloud and shown as 🔴 = ?");
  // a miss takes nothing away
  await quiet();
  const key=async k=>{await p.tap(`#fcQ .jkey[data-key="${k}"]`);await wait(120);};
  await key("3");await key("ok");
  ok(await gems()===g0+8&&(await said()).indexOf("The tally board can help!")>=0&&await E(()=>document.getElementById("fcTally").classList.contains("glow")),
    "a wrong sum: \"The tally board can help!\", the tally board glows, and no gems go away");
  ok(await E(()=>document.getElementById("fcQ").dataset.ans==="5"&&!!Factory._S().q&&!document.querySelector("#fcQ .jghost").textContent),"...the same question stays");
  await key("4");await key("ok");
  ok(await E(()=>document.querySelector("#fcQ .jghost").textContent==="5"&&!!document.querySelector('#fcQ .jkey.hint[data-key="5"]')),"the second miss shows the answer faintly (5) and its key glows");
  await key("5");await p.dblclick('#fcQ .jkey[data-key="ok"]');
  ok(await waitFor(p,()=>!!document.querySelector("#fcDone .fcres")),"the right sum: the result");
  const tr1=await E(()=>JSON.parse(JSON.stringify(state.tracks.math.stats.count10)));
  ok(tr1.seen===tr0.seen+1&&tr1.right===tr0.right,"Tracks records it once for count10 (a double tap on ✓ is one answer), not right the first time "+J([tr0,tr1]));
  ok(await gems()===g0+8,"...and it still took nothing away");
  const res=await E(()=>({big:document.querySelector(".fcbig").textContent,paid:(document.querySelector(".fcres .mpaid")||{}).textContent,head:document.getElementById("fcStars").textContent}));
  ok(res.big==="★★★"&&res.paid==="+8 💎"&&res.head==="★★★","the result: ★★★ and +8 💎; the header's stars too "+J(res));
  await E(()=>Factory._finish());await E(()=>Factory._finish());
  ok(await gems()===g0+8,"a second finish pays nothing");

  // ---- 4. play it again: nothing new, nothing paid, said kindly; stars only add ----
  await p.tap("#fcAgain");
  ok(!(await S()).done&&await E(()=>Factory.engine.encode(Factory._w())===Factory.LEVELS[0].sol),"🔁 build again: back to the start, his layout still there");
  await E(()=>{const w=Factory._w();[1,2,3].forEach(c=>Factory.engine.put(w,8*12+c,1,1));});        // three belts going nowhere: 10 pieces, over the 9
  await quiet();await E(()=>Factory._run(600));await wait(1400);
  const r2=await S();
  ok(r2.result&&r2.result.stars===2&&r2.result.gems===0&&await gems()===g0+8&&await E(()=>state.factory.stars.F1===3),"a replay with 10 pieces earns 2 stars: nothing paid, his 3 stars stay "+J(r2.result));
  await E(()=>document.querySelector('#fcQ .jkey[data-key="5"]').click());await E(()=>document.querySelector('#fcQ .jkey[data-key="ok"]').click());
  ok(await waitFor(p,()=>/You already have these stars! Great building\./.test((document.querySelector(".fcres .sub")||{}).textContent||"")),"...and says so kindly: \"You already have these stars! Great building.\"");
  ok((await said()).indexOf("You already have these stars! Great building.")>=0,"...out loud too");

  // ---- 5. level 2 on the keyboard only ----
  const cr0=await E(()=>state.tracks.math.stats.count10.right);
  await E(()=>Factory.play(2));await wait(300);
  const kb=async(...keys)=>{for(const k of keys){await p.keyboard.press(k);await wait(25);}};
  ok((await S()).n===2&&(await S()).cur===3*12+1,"level 2 opens with the cursor on the blue rock");
  await kb("2"," ");
  ok((await S()).tool==="drill"&&(await cellOf(1,3)).t===2,"2 picks the drill, Space puts it down");
  await kb("1","ArrowRight"," ","ArrowUp"," ","ArrowUp"," ","ArrowUp"," ");
  for(let i=0;i<7;i++)await kb("ArrowRight"," ");
  await kb("ArrowDown"," ","ArrowDown"," ");
  const k2=await E(()=>{const w=Factory._w();return{d:w.dir[3*12+1],p:Factory.engine.pieces(w),corner:w.dir[0*12+2],end:w.dir[2*12+9]};});
  ok(k2.d===1&&k2.p===14&&k2.corner===1&&k2.end===2,"1 picks the belt; arrows and Space lay a belt that follows the cursor round the rocks to the truck "+J(k2));
  await kb("r");
  ok((await cellOf(9,2)).d===3,"R turns the piece under the cursor");
  await kb("r","r","r");
  await kb("Enter");
  ok((await S()).running,"Enter runs it");
  await E(()=>Factory._run(1200));
  ok(await waitFor(p,()=>{const h=document.getElementById("fcQ");return h&&h.dataset.ans==="8";},{timeout:4000}),"the order is met, and the pad asks the count (8)");
  await kb("8","Enter");
  ok(await waitFor(p,()=>!!document.querySelector("#fcDone .fcres")),"the digits and Enter answer the sum");
  ok(await E(r=>state.tracks.math.stats.count10.right===r+1&&state.factory.lvl===2,cr0),"...right the first time, recorded; level 2 done");
  await kb("Enter");
  ok(await waitFor(p,()=>Factory._S().n===3),"Enter on the result goes on to level 3 (the next level button has the focus)");
  await kb("ArrowRight","ArrowRight"," ");
  ok((await cellOf(3,1)).t===1,"...a belt with Space");
  await kb("e");
  ok((await cellOf(3,1)).t===0,"E erases the piece under the cursor");

  // ---- 6. a new star on a replay pays 1 💎 for it ----
  const g3=await gems();
  await E(()=>{Factory.play(3);const w=Factory._w();Factory._load(Factory.LEVELS[2].sol);[0,1,2,3,4].forEach(c=>Factory.engine.put(w,8*12+c,1,1));});
  await E(()=>Factory._run(1350));await wait(200);
  let r3=(await S()).result;
  ok(r3.stars===2&&r3.gems===7&&await gems()===g3+7,"level 3 with 27 pieces (budget 26): 2 stars, 5 + 2 💎 "+J(r3));
  await E(()=>{Factory.play(3);Factory._load(Factory.LEVELS[2].sol);Factory._run(1350);});await wait(200);
  r3=(await S()).result;
  ok(r3.stars===3&&r3.gems===1&&r3.newStars===1&&await gems()===g3+8&&await E(()=>state.factory.stars.F3===3),"again with the known solution: the third star pays 1 💎 "+J(r3));

  // ---- 7. every level's known solution, through the real board, 3 runs; what each machine made ----
  await E(()=>{state.factory.lvl=11;save();});
  const all=await E(()=>Factory.LEVELS.map(L=>{const runs=[];
    for(let k=0;k<3;k++){Factory.play(L.n);Factory._load(L.sol);const r=Factory._run(L.limit*30),w=Factory._w(),got={};
      for(let i=0;i<w.got.length;i++)if(w.got[i])got[i]=w.got[i];runs.push({done:r.done,t:r.t,hot:r.hot,got,stars:Factory._S().result&&Factory._S().result.stars});}
    return{id:L.id,limit:L.limit,runs,same:JSON.stringify(runs[0])===JSON.stringify(runs[1])&&JSON.stringify(runs[1])===JSON.stringify(runs[2])};}));
  all.forEach(L=>ok(L.runs[0].done&&L.runs[0].t<=L.limit*30&&L.same&&L.runs[0].stars===3,`${L.id}: the known solution meets the order in ${(L.runs[0].t/30).toFixed(1)} s (limit ${L.limit} s), 3 stars, the same 3 runs in a row`));
  const got=id=>all.find(L=>L.id===id).runs[0].got;
  ok(got("F4")[19]>=3&&!got("F4")[1],"the mixer (F4): red + blue come out purple "+J(got("F4")));
  ok(got("F6")[19]>=6&&all.find(L=>L.id==="F6").runs[0].hot<120,"the splitter (F6): four drills split to two mixers, 6 purple and no red belts "+J(got("F6")));
  ok(got("F8")[2]>=4&&got("F8")[21]>=2&&!got("F8")[1]&&!got("F8")[19],"the sorter (F8): blue pulled off to the truck, the red mixed with yellow into orange "+J(got("F8")));
  ok(got("F10")[67]>=4&&Object.keys(got("F10")).length===1,"the stamper (F10): purple bars become purple toys "+J(got("F10")));
  ok(got("F11")[2]>=6&&got("F11")[21]>=7,"the tunnel (F11): blue goes under the yellow belt to the truck "+J(got("F11")));
  ok(await E(()=>Factory.LEVELS.every(L=>Factory.sim(L.n).done)),"...and the same with no screen at all (Factory.sim)");
  ok(await E(()=>JSON.stringify(Factory.TOOLS.map(t=>t.id+":"+t.from))==='["belt:1","drill:1","mixer:4","split:6","sort:8","stamp:10","tunnel:11","erase:1"]'),
    "each machine comes with the level that teaches it");

  // ---- 8. a jam: the belts glow red and the buddy has the right tip ----
  await quiet();
  await E(()=>{Factory.play(6);const F=Factory.engine,K=F.K,w=Factory._w(),id=(c,r)=>r*w.W+c,path=(c,r,m)=>{for(const x of m){const d="NESW".indexOf(x);F.put(w,id(c,r),K.BELT,d);c+=F.DX[d];r+=F.DY[d];}};
    F.put(w,id(1,1),K.DRILL,2);F.put(w,id(2,1),K.DRILL,2);path(1,2,"EESS");F.put(w,id(1,7),K.DRILL,0);F.put(w,id(2,7),K.DRILL,0);path(1,6,"EENN");F.put(w,id(3,4),K.MIXER,1);path(4,4,"E");
    Factory._run(330);});
  const jam=await E(()=>({tip:document.getElementById("fcTip").dataset.tip,text:document.getElementById("fcTip").textContent,hot:Factory._S().hot}));
  ok(jam.tip==="drills"&&jam.text==="💡 The drills are waiting. The belt is full! Try a splitter."&&jam.hot>=120,"one mixer for four drills: the belts go red and the tip says to try a splitter "+J(jam));
  ok((await said()).indexOf("The drills are waiting. The belt is full! Try a splitter.")>=0,"...said out loud once it has held for 2 s");

  // ---- 9. his own factory: after level 12, saved as he builds ----
  await E(()=>{state.factory.lvl=12;state.factory.orders={day:"",paid:0};save();Factory.map();});
  ok(await E(()=>!document.getElementById("fcSand").hasAttribute("aria-disabled")&&/My own factory/.test(document.getElementById("fcSand").textContent)),"after level 12 the map opens \"My own factory\"");
  await p.tap("#fcSand");
  ok(await E(()=>Factory._S().sandbox&&Factory._w().W===16&&Factory._w().H===12&&document.querySelectorAll(".fctool").length===8),"his own factory: a 16 × 12 board, every piece in the palette");
  const sb0=await E(()=>Factory._S().order);
  ok(sb0&&sb0.pay>=3&&sb0.pay<=6&&/Send/.test(await E(()=>document.getElementById("fcSend").textContent))&&/💎/.test(await E(()=>document.getElementById("fcPay").textContent)),"a side order with its pay: "+J(sb0));
  // deliveries alone pay nothing: a drill of a colour not on the order, a belt to the truck, run
  const dud=await E(()=>{const w=Factory._w(),F=Factory.engine,K=F.K,o=Factory._S().order.parts.map(p=>p[0]),id=(c,r)=>r*16+c;
    // three ways to the truck at (7,5): blue from above, red from the right, yellow from the left; one is not on the order
    const R=[{ore:2,drill:[4,3,2],belts:[[4,4,1],[5,4,1],[6,4,1],[7,4,2]]},{ore:1,drill:[13,5,3],belts:[[12,5,3],[11,5,3],[10,5,3],[9,5,3],[8,5,3]]},
      {ore:3,drill:[1,5,1],belts:[[2,5,1],[3,5,1],[4,5,1],[5,5,1],[6,5,1]]}].filter(x=>o.indexOf(x.ore)<0)[0];
    F.put(w,id(R.drill[0],R.drill[1]),K.DRILL,R.drill[2]);R.belts.forEach(b=>F.put(w,id(b[0],b[1]),K.BELT,b[2]));return R.ore;});
  const gS=await gems();
  await E(()=>Factory._run(400));
  ok(await gems()===gS&&!(await S()).done&&await E(o=>Factory._w().got[o]>=3,dud),"his rocks reach the truck, but deliveries that are not on the order pay nothing ("+dud+")");
  const code=await E(()=>{const w=Factory.engine.make(Factory.SANDBOX),F=Factory.engine;F.put(w,6*16+2,F.K.MIXER,1);F.put(w,6*16+3,F.K.SPLIT,2);F.put(w,6*16+4,F.K.SORT,1,6);
    F.put(w,6*16+5,F.K.STAMP,3);F.put(w,9*16+2,F.K.TUNNEL,1);F.put(w,9*16+5,F.K.TUNNEL,1);F.put(w,1*16+13,F.K.DRILL,2);F.put(w,2*16+13,F.K.BELT,3);
    const c=F.encode(w);Factory._load(c);return c;});
  await wait(500);
  ok(await E(c=>state.factory.sandbox===c&&c.length===192,code),"every piece he puts down is saved as a short string (192 characters)");
  await reload(p);await quiet();await tidy();
  ok(await E(c=>state.factory.sandbox===c,code),"after a reload the save still has it");
  await E(()=>{Factory.open();});await wait(300);
  if((await E(()=>Factory._view()))!=="board")await E(()=>Factory.sandbox());
  ok(await E(c=>Factory._S().sandbox&&Factory.engine.encode(Factory._w())===c,code),"...and his own factory opens just as he left it");
  // five side orders a day pay; the sixth is for fun
  const g5=await gems(),pays=[];
  for(let k=0;k<6;k++){
    const o=await E(()=>Factory._S().order);pays.push(o.pay);
    await E(()=>Factory._finish());
    const q=await waitFor(p,()=>{const h=document.getElementById("fcQ");return h&&h.dataset.ans;},{timeout:4000});
    await E(a=>{String(a).split("").forEach(d=>document.querySelector(`#fcQ .jkey[data-key="${d}"]`).click());document.querySelector('#fcQ .jkey[data-key="ok"]').click();},q);
    await waitFor(p,()=>!!document.getElementById("fcNext"));
    if(k===5)ok(/for-fun order/.test(await E(()=>document.querySelector(".fcres").textContent))&&await E(()=>/For fun/.test(document.getElementById("fcPay").textContent)||true),"the sixth order: \"That was a for-fun order. Five paid orders a day!\"");
    await E(()=>document.getElementById("fcNext").click());await wait(150);
  }
  const want=pays.slice(0,5).reduce((a,b)=>a+b,0);
  ok(await gems()===g5+want&&await E(()=>state.factory.orders.paid===5&&state.factory.orders.day===today()),`five side orders pay ${pays.slice(0,5).join(" + ")} = ${want} 💎, the sixth nothing`);
  ok(await E(()=>/For fun/.test(document.getElementById("fcPay").textContent)),"...and the next card says it is for fun");
  // it only runs while open, and not while the app is put away
  await E(()=>{const w=Factory._w(),F=Factory.engine;F.put(w,1*16+1,F.K.DRILL,1);F.put(w,1*16+2,F.K.BELT,1);if(!Factory._S().running)document.getElementById("fcRun").click();});
  await wait(600);const t1=(await S()).t;await wait(400);
  ok((await S()).t>t1,"running while open");
  await E(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"hidden"});document.dispatchEvent(new Event("visibilitychange"));});
  const t2=(await S()).t;await wait(500);
  ok((await S()).t===t2,"put away (hidden): it stops");
  await E(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"visible"});document.dispatchEvent(new Event("visibilitychange"));});
  await wait(500);ok((await S()).t>t2,"back again: it goes on");
  await E(()=>document.getElementById("fcX").click());
  const t3=(await S()).t;await wait(500);
  ok((await S()).t===t3&&!(await S()).running&&await E(()=>Modes.top()!=="factory"),"closed: it stops (nothing runs, nothing pays, while he is away)");

  // ---- 10. Adventure: the Factory is a spot to walk up to ----
  await seed(p,{gems:40,settings:{goal:0},grid:{"6,8":{id:"cottage",seed:3,lv:1},"10,6":{id:"factory",seed:1,lv:1}},factory:{lvl:3,stars:{F1:3,F2:3,F3:1},sandbox:null,orders:{day:"",paid:0}}});
  await quiet();await tidy();
  await E(()=>Adv.enter());await wait(500);
  ok(await E(()=>!!document.querySelector(".tile.spot.fcspot .fcsign")),"Adventure: a 🏭 spot on the Factory building");
  await E(()=>{state.critters.forEach(c=>{c.out=false;});(state.vehicles||[]).forEach(v=>{v.out=false;});Adv._P.c=10.2;Adv._P.r=6;});
  ok(await waitFor(p,()=>document.getElementById("advAct").textContent==="🏭 Factory"),"walking up to it: 🏭 Factory");
  await p.keyboard.press("Space");
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure>factory"),"Space opens it on top of Adventure "+await E(()=>Modes.stack().join(">")));
  ok(await E(()=>Factory._view()==="map"&&document.querySelectorAll(".fcl").length===12&&document.querySelector('.fcl[data-n="4"]').classList.contains("next")&&document.querySelector('.fcl[data-n="5"]').classList.contains("locked")),
    "with levels done it opens on the levels: 12, the next one glowing, later ones locked");
  await p.tap('.fcl[data-n="5"]');
  ok(await E(()=>Factory._view()==="map"),"a locked level stays shut (and says why)");
  await p.tap('.fcl[data-n="4"]');
  ok(await E(()=>Factory._S().n===4&&[...document.querySelectorAll(".fctool")].map(b=>b.dataset.tool).join()==="belt,drill,mixer,erase"&&!!document.querySelector(".fctool.new")),"level 4 brings the mixer, glowing as new");
  await E(()=>document.getElementById("fcX").click());
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure"),"✕ goes back to Adventure");
  await E(()=>Adv.exit());await wait(200);

  // ---- 11. the iPad in portrait: the board above the order card ----
  await p.setViewportSize({width:768,height:1024});await wait(300);
  await E(()=>{Factory.open();Factory.play(4);});await wait(600);
  const pt=await E(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),cv=r("#fcCv"),cd=r(".fccard"),pal=r("#fcPal");
    return{cv:[cv.left,cv.top,cv.right,cv.bottom].map(Math.round),card:Math.round(cd.top),pal:Math.round(pal.bottom),vw:innerWidth,vh:innerHeight,wide:document.documentElement.scrollWidth,
      tools:[...document.querySelectorAll(".fctool")].every(b=>b.getBoundingClientRect().width>=56&&b.getBoundingClientRect().height>=56)};});
  ok(pt.cv[3]<=pt.card&&pt.cv[0]>=0&&pt.cv[2]<=pt.vw&&pt.card<pt.vh&&pt.wide<=pt.vw&&pt.tools&&pt.cv[2]-pt.cv[0]>=500,"768 × 1024: the board above the order card, no sideways scroll, 56 px pieces "+J(pt));
  await E(()=>Factory.close());
  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL factory suite crashed: "+(e&&e.stack||e));process.exit(1);});
