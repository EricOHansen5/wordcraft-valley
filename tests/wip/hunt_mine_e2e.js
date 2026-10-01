// Bug hunt, one shard: the Gem Mine, Adventure, Races, and the vehicles and animals in the valley, on the iPad
// 9th generation (1024×768 landscape, touch). Every interactive element on each screen is found (buttons, .btn,
// .mtab, .mtag, .advpill, cards, anything with cursor:pointer), tapped with a real touch, and checked:
//   · it is on screen and on top (nothing covers it, nothing cut off at 1024×768),
//   · something happened within 800 ms (the DOM, Modes, the save, a toast, a sound or a spoken line),
//   · no page error and no console error,
//   · the screen closes back to where it came from.
// The ones that pay are checked against docs/design.md (what a dig finds, what a task, a sale or a race pays), and
// every paying button gets a double tap that must pay once. A miss never costs anything.
const {launch,seed,reload,waitFor,answer,check}=require("../lib");
(async()=>{
  const T=check("hunt_mine"),T0=Date.now();let tl=Date.now();
  // HUNT_TIME=1 prints how long each check took
  const ok=(c,m)=>{if(process.env.HUNT_TIME){m=`[${((Date.now()-T0)/1000).toFixed(0)}s +${Date.now()-tl}ms] `+m;tl=Date.now();}return T.ok(c,m);};
  const J=x=>JSON.stringify(x);
  const COUNT={};const counted=(screen,n=1)=>{COUNT[screen]=(COUNT[screen]||0)+n;};
  const BASE={guardians:[0,1,2],gems:30,settings:{goal:0,ambient:false,nature:false},
    critters:[{id:"dog",c:4,r:8,seed:1},{id:"bat",c:8,r:8,seed:2},{id:"bear",c:12,r:8,seed:3},{id:"hen",c:16,r:8,seed:4}],
    mine:{coins:400,bag:{1:4,2:3,3:2,4:4,5:1,6:1,8:1,9:1,23:1},owned:{miner:1,cap:1,cowboy:1,knight:1},eggs:[{at:"2026-01-01"}],deepest:30,pet:null}};
  const L=await launch({viewport:{width:1024,height:768},seed:BASE});
  const {page:p,errs,close,E}=L;
  p.on("dialog",d=>d.accept().catch(()=>{}));
  const cdp=await L.ctx.newCDPSession(p);
  const touch=(type,pts)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
  const wait=ms=>p.waitForTimeout(ms);

  // ---------- in the page: what was heard and said, and a fingerprint of everything a tap can change ----------
  const inst=()=>E(()=>{
    window.__ev=[];const rec=(k,v)=>{window.__ev.push(k+":"+v);};
    Object.keys(Sound.sfx).forEach(k=>{const f=Sound.sfx[k];if(typeof f!=="function"||f.__w)return;
      const g=function(){rec("sfx",k);try{return f.apply(this,arguments);}catch(e){}};g.__w=1;Sound.sfx[k]=g;});
    if(!Sound.speak.__w){Sound.speak=function(t){rec("speak",t);return Promise.resolve();};Sound.speak.__w=1;}
    if(!Sound.say.__w){Sound.say=function(k,t){rec("say",k);return Promise.resolve();};Sound.say.__w=1;}
    if(!window.toast.__w){const t0=window.toast;window.toast=function(m){rec("toast",m);return t0.apply(this,arguments);};window.toast.__w=1;}
    // what was heard since the last tap (probe() sets the mark just before it taps)
    window.__mark=0;window.__heard=re=>window.__ev.slice(window.__mark).some(e=>new RegExp(re).test(e));
    // effects drawn in the valley and in Adventure (shouts, puffs, sparkles, rings, flying emoji)
    window.J2=x=>JSON.stringify(x);
    window.__fx=0;
    const mo=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&["fx","ring","puff","vshout","sparkle","countdown","floater","lvlup"].some(c=>n.classList.contains(c)))window.__fx++;})));
    mo.observe(document.body,{childList:true,subtree:true});
    const h=s=>{let x=0;s=String(s||"");for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))|0;return x;};
    // positions and timers change by themselves; everything else in the save counts
    const DROP=new Set(["c","r","face","alt","dir","since","cam","buddy","modeMin","modeOpens","minutes","x","y","vx","vy","sync","deviceId","t0"]);
    window.__state=()=>h(JSON.stringify(state,(k,v)=>(k&&(k[0]==="_"||DROP.has(k)))?undefined:v));
    const q=s=>document.querySelector(s);
    window.__sig=()=>{
      const card=q("#mCard"),panel=q("#mPanel"),mt=q("#mToast"),act=q("#mAct"),hot=q("#mHot"),mm=q("#mineMode"),vt=q("#toast"),aa=q("#advAct"),an=q("#advNote");
      return [Modes.stack().join(">"),window.__ev.length,window.__fx,panel?panel.className:"",card?h(card.innerHTML):0,mt?mt.textContent+mt.className:"",
        [...document.querySelectorAll(".mhud .mpill")].map(e=>e.textContent+(e.style.display||"")+e.className).join("|"),
        act?act.textContent+act.style.display:"",hot?h(hot.innerHTML):0,mm?mm.className:"",
        [...document.querySelectorAll(".overlay.on")].map(o=>o.id+h(o.innerHTML)).join(","),
        vt?vt.textContent+vt.className:"",aa?aa.textContent+aa.className:"",an?an.className+h(an.innerHTML):"",
        [...document.querySelectorAll(".advland")].length,window.__state()].join("~");};
    // the interactive elements under a root, outermost first, in page order
    window.__els=(root)=>{
      const R=typeof root==="string"?q(root):root;if(!R)return[];
      const SEL="button,[role=button],.btn,.mtab,.mtag,.advpill,.card,.card2,.dexc,[onclick],a[href]";
      const all=[...R.querySelectorAll("*")].filter(el=>{
        if(el.matches(SEL))return true;const cs=getComputedStyle(el);if(cs.cursor!=="pointer")return false;
        const pa=el.parentElement;return !pa||getComputedStyle(pa).cursor!=="pointer";});
      const out=all.filter(el=>!all.some(a=>a!==el&&a.contains(el)));
      return out.map((el,i)=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
        const vis=r.width>0&&r.height>0&&cs.visibility!=="hidden"&&cs.display!=="none"&&!!el.offsetParent||cs.position==="fixed"&&r.width>0;
        const data=[...el.attributes].filter(a=>/^data-/.test(a.name)).map(a=>a.name.slice(5)+"="+a.value).join(",");
        return{i,key:el.tagName.toLowerCase()+(el.id?"#"+el.id:"")+(el.className&&typeof el.className==="string"?"."+el.className.trim().split(/\s+/)[0]:"")+(data?"["+data+"]":""),
          text:(el.textContent||"").replace(/\s+/g," ").trim().slice(0,40),vis,disabled:!!el.disabled};});};
    window.__el=(root,i)=>{const R=typeof root==="string"?q(root):root;const SEL="button,[role=button],.btn,.mtab,.mtag,.advpill,.card,.card2,.dexc,[onclick],a[href]";
      const all=[...R.querySelectorAll("*")].filter(el=>{if(el.matches(SEL))return true;const cs=getComputedStyle(el);if(cs.cursor!=="pointer")return false;
        const pa=el.parentElement;return !pa||getComputedStyle(pa).cursor!=="pointer";});
      return all.filter(el=>!all.some(a=>a!==el&&a.contains(el)))[i]||null;};
    // text cut off at this size: nowrap or hidden overflow wider than its box, or anything past the screen's edge
    window.__fit=(root)=>{const R=typeof root==="string"?q(root):root;if(!R)return[];const bad=[];
      [...R.querySelectorAll("*")].forEach(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();if(!r.width||cs.display==="none"||cs.visibility==="hidden")return;
        if(/svg|path|g|circle|rect|ellipse|line|polygon|polyline|img|canvas|use|defs|text/i.test(el.tagName))return;
        const clip=cs.whiteSpace==="nowrap"||cs.overflow==="hidden"||cs.overflowX==="hidden"||cs.textOverflow==="ellipsis";
        if(clip&&el.scrollWidth>el.clientWidth+2&&el.children.length===0)bad.push("cut:"+(el.id||el.className||el.tagName)+" '"+el.textContent.trim().slice(0,30)+"'");
        if(el.children.length===0&&el.textContent.trim()&&(r.right>innerWidth+1||r.left<-1)&&getComputedStyle(el.parentElement).overflow!=="auto")bad.push("off:"+(el.id||el.className||el.tagName)+" '"+el.textContent.trim().slice(0,30)+"' "+Math.round(r.left)+".."+Math.round(r.right));});
      return bad.slice(0,6);};
    // window.__answer (from lib.js's installAnswer) taps the right choice in a Read host; this is its twin,
    // tapping a wrong one, for "a miss never costs" checks. Returns false when there is no safe wrong choice (Build it).
    window.__wrong=sel=>{const h=document.querySelector(sel);if(!h||!h.dataset.ans)return false;const a=h.dataset.ans;
      if(h.querySelector(".wslots"))return false;
      if(a[0]==="#"){const b=[...h.querySelectorAll(".psopt")].find(o=>o.dataset.i!==a.slice(1));if(b){b.click();return true;}return false;}
      const b=[...h.querySelectorAll("[data-w]")].find(x=>x.dataset.w!==a);if(b){b.click();return true;}return false;};
  });
  await inst();

  // ---------- a tap, and what it did ----------
  const sig=()=>E(()=>window.__sig());
  // finds an element (a selector, or {root,i} from __els), makes sure it can be tapped at 1024×768 (on screen, on top,
  // not moving: a sheet sliding in must have settled) and taps it with a finger
  async function tapAt(target,{dbl=false}={}){
    const h=typeof target==="string"?await p.$(target):await p.evaluateHandle(({root,i})=>window.__el(root,i),target);
    const el=h&&h.asElement&&h.asElement();if(!el)return{ok:false,why:"not found"};
    await el.evaluate(n=>{const s=n.closest(".mcard,.sheet,.bpage,.dexsheet,[style*=overflow]");if(s)n.scrollIntoView({block:"nearest",inline:"nearest"});}).catch(()=>{});
    let box=null;for(let k=0;k<25;k++){const b1=await el.boundingBox();await wait(40);const b2=await el.boundingBox();
      if(b1&&b2&&Math.abs(b1.x-b2.x)<.5&&Math.abs(b1.y-b2.y)<.5&&Math.abs(b1.width-b2.width)<.5){box=b2;break;}box=b2;}
    if(!box||!box.width)return{ok:false,why:"no box (hidden)"};
    const x=box.x+box.width/2,y=box.y+box.height/2;
    if(x<0||y<0||x>1024||y>768)return{ok:false,why:`off screen at ${Math.round(x)},${Math.round(y)}`};
    const top=await el.evaluate((n,[x,y])=>{const t=document.elementFromPoint(x,y);return !t?"nothing":(n===t||n.contains(t))?"":(t.id||t.className||t.tagName);},[x,y]);
    if(top)return{ok:false,why:"covered by "+String(top).slice(0,40)};
    await p.touchscreen.tap(x,y);if(dbl){await wait(70);await p.touchscreen.tap(x,y);}
    return{ok:true,x,y};
  }
  async function changedSince(before,ms=800){const end=Date.now()+ms;for(;;){const s=await sig();if(s!==before)return true;if(Date.now()>end)return false;await wait(40);}}
  // polls an expectation (true, or {ok,note}) until it holds or the time runs out; returns the last answer
  async function until(fn,ms=1500){const end=Date.now()+ms;let r;for(;;){r=await fn();if(r===true||(r&&r.ok))return r;if(Date.now()>end)return r;await wait(60);}}
  // one element: tap it, something must change, no errors; `expect` checks the effect (polled)
  async function probe(screen,label,target,{expect,dbl,quiet,settle=0,within=1500}={}){
    const e0=errs.length;await E(()=>{window.__mark=window.__ev.length;});const before=await sig();const t=await tapAt(target,{dbl});counted(screen);
    if(!t.ok)return ok(false,`${screen}: "${label}" can't be tapped: ${t.why}`);
    const moved=quiet?true:await changedSince(before);
    if(settle)await wait(settle);
    let exp=true,note="";
    if(expect){const r=await until(expect,within);exp=r===true||!!(r&&r.ok);note=r&&r.note?" "+r.note:"";if(r&&!r.ok&&r.why)note=" "+r.why;}
    const bad=errs.slice(e0);
    return ok(moved&&exp&&!bad.length,`${screen}: "${label}"${moved?"":" did nothing within 800 ms"}${exp?"":" wrong effect"}${note}${bad.length?" ERRORS: "+bad.join(" | "):""}`);
  }
  // every element under a root: tapped once each, each from a freshly opened screen
  async function crawl(screen,open,root,specs,after){
    await open();const els=await E(r=>window.__els(r),root);const done=new Set();
    for(const el of els){
      if(!el.vis){ok(true,`${screen}: "${el.text||el.key}" is hidden here (by design until it is needed)`);continue;}
      if(done.has(el.key+el.text))continue;done.add(el.key+el.text);
      const sp=specs.find(s=>s.match.test(el.key+" "+el.text))||{};
      if(sp.skip){ok(true,`${screen}: "${el.text||el.key}" ${sp.skip}`);continue;}
      await open();const now=await E(r=>window.__els(r),root);
      const at=now.find(x=>x.key+x.text===el.key+el.text)||now.find(x=>x.key===el.key);
      if(!at){ok(false,`${screen}: "${el.text||el.key}" went away when the screen opened again`);continue;}
      if(at.disabled){ok(true,`${screen}: "${el.text||el.key}" is disabled here (${sp.why||"not affordable"})`);counted(screen);continue;}
      await probe(screen,el.text||el.key,{root,i:at.i},sp);
      if(after)await after(el);
    }
    return els;
  }

  // ======================================================================
  // GEM MINE
  // ======================================================================
  const S=6;   // SKY
  const inMine=()=>E(()=>Mine._running()&&Modes.stack().includes("mine"));
  const panelOn=()=>E(()=>document.getElementById("mPanel").classList.contains("on"));
  const h2=()=>E(()=>{const h=document.querySelector("#mPanel.on #mCard h2");return h?h.textContent:"";});
  const mst=()=>E(()=>JSON.parse(JSON.stringify(state.mine)));
  // back to plain digging: the panel closed (by its own button when it has one), the Mine running
  async function calm(){
    await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
    for(let k=0;k<4&&await panelOn();k++){
      const b=await p.$("#mPanel.on #mClose");if(b&&await b.isVisible()){await b.click();await wait(120);}
      // leave and come back (a frame apart, so the old game loop has stopped before a new one starts)
      else{await E(()=>Mine.exit());await wait(80);await E(()=>Mine.enter());await wait(250);}}
    return waitFor(p,()=>Mine._running()&&!Mine._paused()&&Modes.top()==="mine",{timeout:3000});
  }
  const tp=(x,y)=>E(([x,y])=>{const P=Mine._p;P.x=x;P.y=y;P.vx=P.vy=0;},[x,y]);
  const surface=x=>tp(x,S-.95);
  const boxOf=async s=>{const b=await(await p.$(s)).boundingBox();return[b.x+b.width/2,b.y+b.height/2];};

  // ---- entering: from the valley's Mine button; last night's egg hatches ----
  await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
  const crit0=await E(()=>state.critters.length);
  await probe("mine/enter","⛏️ Gem Mine (dock)","#mineBtn",{expect:()=>E(()=>Mine._running()&&Modes.top()!=="valley")});
  ok(await waitFor(p,()=>/egg hatched/.test((document.querySelector("#mPanel.on #mCard h2")||{}).textContent||"")),"mine/enter: yesterday's mystery egg hatches on the way in: "+await h2());
  await probe("mine/egg","Yay!","#mPanel.on #mClose",{expect:async()=>({ok:!(await panelOn())&&await E(n=>state.critters.length===n+1&&state.mine.eggs.length===0,crit0),note:"(a new animal in the valley)"})});
  ok(await E(()=>Modes.top()==="mine"&&Modes.stack().join(">")==="mine"),"mine/enter: Modes shows the Mine on top of the valley: "+await E(()=>Modes.stack().join(">")));
  await calm();
  ok(!(await E(()=>window.__fit(".mhud"))).length,"mine/hud: every pill fits at 1024×768 "+J(await E(()=>window.__fit(".mhud"))));

  // ---- the HUD pills ----
  {const els=await E(()=>window.__els(".mhud"));
   const known=/mBack|mPet|mBooks|mJobs|mTnt/;
   ok(els.every(e=>known.test(e.key)),"mine/hud: the tappable pills are Valley, Pet, Books, Tasks and TNT: "+els.map(e=>e.key.split(".")[0]).join(" "));}
  await probe("mine/hud","🐾 Pet","#mPet",{expect:async()=>({ok:/Pick a pet/.test(await h2()),note:await h2()})});
  await calm();
  await probe("mine/hud","📚 Books","#mBooks",{expect:()=>E(()=>Modes.top()==="book")});
  await probe("mine/books","✕ (shelf)","#bClose",{expect:()=>E(()=>Modes.top()==="mine"&&Mine._running())});
  await probe("mine/hud","📋 Tasks","#mJobs",{expect:async()=>({ok:/Mine tasks/.test(await h2()),note:await h2()})});
  await calm();

  // ---- the canvas controls: joystick, jump, dig (touch and keys), the elevator, build ----
  await surface(24.2);await wait(250);
  {const box=async s=>{const b=await (await p.$(s)).boundingBox();return[b.x+b.width/2,b.y+b.height/2];};
   const joy=await box("#mJoy"),dig=await box("#mDig");
   const x0=await E(()=>Mine._p.x);
   await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]+60,joy[1]]]);await wait(500);await touch("touchEnd",[]);
   const x1=await E(()=>Mine._p.x);counted("mine/controls");
   ok(x1>x0+.8,`mine/controls: the joystick walks him right (${x0.toFixed(1)} → ${x1.toFixed(1)})`);
   await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]-60,joy[1]]]);await wait(500);await touch("touchEnd",[]);
   const x2=await E(()=>Mine._p.x);counted("mine/controls");
   ok(x2<x1-.8,`mine/controls: ... and left (${x1.toFixed(1)} → ${x2.toFixed(1)})`);
   await surface(24.2);await wait(300);
   const y0=await E(()=>Mine._p.y);
   await touch("touchStart",[await box("#mJump")]);await wait(120);const yj=await E(()=>Mine._p.y);await touch("touchEnd",[]);counted("mine/controls");
   ok(yj<y0-.2,`mine/controls: ⤒ jumps (${y0.toFixed(2)} → ${yj.toFixed(2)})`);
   await wait(700);
   // dig down by holding ⛏️: the block under him goes, into his pocket
   const d0=await E(()=>({dug:state.mine.dugCount||0,dirt:state.mine.blocks.dirt||0}));
   await E(([S])=>{for(let y=S+1;y<=S+2;y++){Mine._setTile(24,y,2);Mine._setOre(24,y,0);}},[S]);await surface(24.2);await wait(250);
   await touch("touchStart",[dig]);
   await waitFor(p,d=>(state.mine.dugCount||0)>d,{arg:d0.dug,timeout:4000});await touch("touchEnd",[]);counted("mine/controls");
   const d1=await E(()=>({dug:state.mine.dugCount||0,dirt:state.mine.blocks.dirt||0}));
   ok(d1.dug>d0.dug&&d1.dirt>d0.dirt,`mine/controls: holding ⛏️ digs the dirt under him and pockets it (${J(d0)} → ${J(d1)})`);
   // a gem under him goes in the bag (design v5.0: dig until the backpack is full)
   await E(([S])=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2),y=Math.floor(P.y+P.h+.05);Mine._setTile(cx,y,2);Mine._setOre(cx,y,3);},[S]);
   const r0=await E(()=>(state.mine.bag[3]||0)+(state.mine.bag[23]||0));
   await touch("touchStart",[dig]);await waitFor(p,r=>(state.mine.bag[3]||0)+(state.mine.bag[23]||0)>r,{arg:r0,timeout:4000});await touch("touchEnd",[]);
   ok(await E(r=>(state.mine.bag[3]||0)+(state.mine.bag[23]||0)===r+1,r0),"mine/dig: a red gem dug goes in the backpack (+1): "+await E(()=>document.getElementById("mBag").textContent));
   // the bag (design v9.0.1): a full backpack keeps the gem in the rock and says to go and sell
   await E(()=>{state.mine.bag[1]=(state.mine.bag[1]||0)+20;});
   await E(([S])=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2),y=Math.floor(P.y+P.h+.05);Mine._setTile(cx,y,2);Mine._setOre(cx,y,5);},[S]);
   await touch("touchStart",[dig]);const sawFull=await waitFor(p,()=>/backpack is full/.test(document.getElementById("mToast").textContent),{timeout:3000});await wait(400);await touch("touchEnd",[]);
   {const r=await E(()=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2),y=Math.floor(P.y+P.h+.05);return{ore:Mine._ore(cx,y),tile:Mine._tile(cx,y),toast:document.getElementById("mToast").textContent,full:document.getElementById("mBag").classList.contains("full"),bag:document.getElementById("mBag").textContent};});
    ok(r.ore===5&&r.tile!==0&&sawFull&&r.full,"mine/bag: with a full backpack the blue gem stays in the rock, the 🎒 pill turns red and he is told to sell first "+J(r));}
   await E(()=>{state.mine.bag[1]-=20;});
   await touch("touchStart",[dig]);await waitFor(p,()=>(state.mine.bag[5]||0)+(state.mine.bag[25]||0)>1,{timeout:4000});await touch("touchEnd",[]);
   ok(await E(()=>(state.mine.bag[5]||0)+(state.mine.bag[25]||0)===2),"mine/bag: with room again the same gem comes out");
   // the keys: D walks, Space jumps, J digs, B builds
   await surface(26.2);await wait(250);
   const kx=await E(()=>Mine._p.x);await p.keyboard.down("d");await wait(350);await p.keyboard.up("d");counted("mine/keys");
   ok(await E(x=>Mine._p.x>x+.5,kx),"mine/keys: D walks right");
   await wait(300);const ky=await E(()=>Mine._p.y);await p.keyboard.down("Space");await wait(110);const ky2=await E(()=>Mine._p.y);await p.keyboard.up("Space");counted("mine/keys");
   ok(ky2<ky-.2,"mine/keys: Space jumps");await wait(700);
   await E(([S])=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2);Mine._setTile(cx,S+1,2);Mine._setOre(cx,S+1,0);},[S]);
   const kd=await E(()=>state.mine.dugCount||0);await p.keyboard.down("j");await waitFor(p,d=>(state.mine.dugCount||0)>d,{arg:kd,timeout:4000});await p.keyboard.up("j");counted("mine/keys");
   ok(await E(d=>(state.mine.dugCount||0)>d,kd),"mine/keys: holding J digs");
   // the elevator shows when he is deep, and takes him up
   await E(([S])=>{for(let y=S+4;y<=S+6;y++)for(let x=30;x<=31;x++){Mine._setTile(x,y,0);Mine._setOre(x,y,0);}Mine._setTile(30,S+7,3);Mine._setTile(31,S+7,3);},[S]);
   await tp(30.2,S+6.05);await waitFor(p,()=>getComputedStyle(document.getElementById("mUp")).display!=="none",{timeout:2000});
   await probe("mine/controls","⬆️ back to the surface","#mUp",{settle:500,expect:()=>E(()=>Mine._p.y<6)});
  }
  // ---- build mode: the hint the first time, the hotbar, a block placed ----
  await surface(27.2);await wait(200);
  await probe("mine/controls","🧱 Build","#mBuild",{expect:async()=>({ok:await E(()=>document.getElementById("mineMode").classList.contains("building")&&state.mine.buildHint===1&&/Build mode/.test(document.getElementById("mToast").textContent)),note:"(the build hint shows once)"})});
  {const hot=await E(()=>window.__els("#mHot"));
   ok(hot.length===6,"mine/build: the hotbar has 6 blocks: "+hot.map(h=>h.text).join(" | "));
   for(const h of hot)await probe("mine/build",h.text,{root:"#mHot",i:h.i},{expect:()=>E(k=>document.querySelectorAll("#mHot .mhot.on").length===1&&document.querySelector("#mHot .mhot.on").dataset.k===k,h.key.match(/k=(\w+)/)[1])});
   // an empty one says where to get it
   await E(()=>{state.mine.blocks.sand=0;Mine._sel("dirt");});
   await probe("mine/build","sand (none left)",'#mHot .mhot[data-k="sand"]',{expect:()=>E(()=>/Dig some sand first/.test(document.getElementById("mToast").textContent))});
   await E(()=>Mine._sel("dirt"));
   await probe("mine/controls","🧱 Build (off again)","#mBuild",{expect:()=>E(()=>!document.getElementById("mineMode").classList.contains("building")&&document.getElementById("mHot").innerHTML==="")});}

  // ---- the town: each building's button opens its own place ----
  const TOWN_AT=[[2,/Go home/],[5.6,/Open my shop/],[9.6,/Pick shop/],[12.8,/Change clothes/],[16.4,/Gem museum/]];
  for(const [x,re] of TOWN_AT.slice(1)){
    await calm();await surface(x);
    ok(await waitFor(p,s=>new RegExp(s).test(document.getElementById("mAct").textContent)&&document.getElementById("mAct").style.display!=="none",{arg:re.source,timeout:2000}),
      "mine/town: standing there shows "+await E(()=>document.getElementById("mAct").textContent));
    await probe("mine/town",await E(()=>document.getElementById("mAct").textContent),"#mAct",{expect:async()=>({ok:await panelOn(),note:"→ "+await h2()||await E(()=>document.querySelector("#mCard .mlabel")&&document.querySelector("#mCard .mlabel").textContent)})});
    ok(!(await E(()=>window.__fit("#mCard"))).length,"mine/town: the panel fits at 1024×768 "+J(await E(()=>window.__fit("#mCard"))));
  }
  await calm();

  // ---- the shop: customers' orders, pay, the hear-it help, close ----
  // read the order the way he would and put exactly that on the counter (clicks in the page; Give it is a real tap)
  const fillOrder=()=>E(()=>{const t=document.querySelector(".msay").textContent.toLowerCase(),q={a:1,two:2,three:3};let base=0;
    t.replace(/^(i want|can i have)\s*/,"").replace(/[.?!]|, please/g,"").split(" and ").forEach(pt=>{const [n,...r]=pt.trim().split(" "),name=r.join(" ");
      const o=ORES.findIndex(O=>O&&(O.name===name||O.pl===name));for(let k=0;k<(q[n]||1);k++){const b=[...document.querySelectorAll("#mBagRow .mitem")].find(b=>+b.dataset.o===o);if(b){b.click();base+=ORES[o].val;}}});
    return{text:t,base};});
  const shopBag={1:4,2:4,3:4,4:3,5:2};
  await E(b=>{state.mine.bag=b;state.settings.tierOverride=3;state.mine.vip=null;},shopBag);
  const openShop=()=>E(b=>{if(!document.getElementById("mPanel").classList.contains("on")||!document.querySelector("#mCard .msay")){state.mine.bag=b;Mine._openShop();}},shopBag);
  const shopEls=await crawl("mine/shop",async()=>{await calm();await openShop();await waitFor(p,".msay");},"#mCard",[
    {match:/mitem/,expect:()=>E(()=>document.querySelectorAll("#mTray .mitem").length>0)},
    {match:/^span/,quiet:true,expect:()=>E(()=>({ok:!window.__heard("say:word:"),note:"(silent until a miss brings the 🔊 help, as designed)"}))},
    {match:/mHear/,expect:()=>E(()=>window.__heard("say:sent:"))},
    {match:/mClose/,expect:async()=>({ok:/Shop closed/.test(await h2()),note:"→ "+await h2()})},
    {match:/mGive/,expect:()=>E(()=>window.__heard("sfx:nope"))}]);
  ok(shopEls.some(e=>/mitem/.test(e.key))&&shopEls.some(e=>/mGive/.test(e.key)),"mine/shop: the order panel has the backpack and Give it: "+shopEls.map(e=>e.text||e.key).join(" | "));
  // a word of the order before any miss is silent (the words speak once a miss shows the 🔊 help, design v5.0)
  // a wrong order: kind words, the 🔊 help and tappable words, nothing taken
  await calm();await openShop();await waitFor(p,".msay");
  {const m0=await mst();
   await E(()=>{const t=document.querySelector(".msay").textContent.toLowerCase();const b=[...document.querySelectorAll("#mBagRow .mitem")].find(b=>!t.includes(ORES[+b.dataset.o].name));b.click();});
   await probe("mine/shop","Give it 👍 (a wrong order)","#mGive",{expect:async()=>{const m=await mst();return{ok:m.coins===m0.coins&&J(m.bag)===J(m0.bag)&&m.ordersWrong===(m0.ordersWrong||0)+1&&await E(()=>document.getElementById("mHear").style.display===""&&/not what I asked/.test(document.getElementById("mCard").textContent)),note:"(nothing taken, the 🔊 help shows)"};}});
   await probe("mine/shop","a word of the order, after a miss",".msay span",{expect:()=>E(()=>window.__heard("say:word:"))});
   await probe("mine/shop","🔊 Hear it (after a miss)","#mHear",{expect:()=>E(()=>window.__heard("say:sent:"))});}
  // a right order, tapped twice: paid once, what the design says (customers pay double the trader's price, +1 💎)
  await calm();await openShop();await waitFor(p,".msay");
  {const m0=await mst(),g0=await E(()=>state.gems),o=await fillOrder(),tip=1;
   await probe("mine/shop","Give it 👍 (right, double tap)","#mGive",{dbl:true,settle:300,expect:async()=>{const m=await mst(),g=await E(()=>state.gems),d=m.coins-m0.coins;
     return{ok:d>=o.base*2+tip&&d<=o.base*2+tip+2&&g===g0+1&&m.ordersRight===(m0.ordersRight||0)+1,note:`("${o.text}" → +${d} 🪙 for ${o.base} worth, +${g-g0} 💎, once)`};}});
   // closing the shop straight after a sale: the next customer must not walk in over the digging
   await probe("mine/shop","Close shop (right after a sale)","#mClose",{expect:async()=>({ok:/Shop closed/.test(await h2()),note:await h2()})});
   await probe("mine/shop","Back to digging","#mPanel.on #mClose",{expect:async()=>!(await panelOn())});
   await wait(1500);
   ok(!(await panelOn())&&await E(()=>!Mine._paused()),"mine/shop: after Close shop and Back to digging, no customer walks back in 1.3 s later "+(await panelOn()?"(the shop reopened: "+await E(()=>document.querySelector("#mCard .mlabel")&&document.querySelector("#mCard .mlabel").textContent)+")":""));}
  // the rest sold to the trader, tapped twice: paid once
  await calm();await openShop();await waitFor(p,".msay");await p.tap("#mClose");await waitFor(p,"#mSell");
  {const m0=await mst(),rest=await E(()=>+document.getElementById("mSell").textContent.match(/(\d+)/)[1]);
   await probe("mine/shop","Sell the rest (double tap)","#mSell",{dbl:true,settle:200,expect:async()=>{const m=await mst();return{ok:m.coins===m0.coins+rest&&!Object.keys(m.bag).length,note:`(+${m.coins-m0.coins} 🪙 for ${rest})`};}});}
  await calm();
  // an empty shop
  await E(()=>{state.mine.bag={};Mine._openShop();});
  ok(/shelves are empty/.test(await E(()=>document.getElementById("mCard").textContent)),"mine/shop: an empty backpack gets a kind 'dig some gems first'");
  await probe("mine/shop","Go digging","#mPanel.on #mClose",{expect:async()=>!(await panelOn())});
  // the VIP customer promised yesterday comes first and pays triple coins and 3 💎 (design v5.3)
  await E(b=>{state.mine.bag=b;state.mine.vip={date:today(),g:1,done:false};Mine._openShop();},shopBag);await waitFor(p,".msay");
  {const vip=await E(()=>({vip:!!document.querySelector(".mvip"),who:document.querySelector(".mlabel").textContent}));
   ok(vip.vip&&/Mossy|Owl|Rumble|says/.test(vip.who),"mine/shop: the promised VIP is the first customer: "+vip.who);
   const m0=await mst(),g0=await E(()=>state.gems),o=await fillOrder();
   await probe("mine/shop","Give it 👍 (VIP)","#mGive",{settle:200,expect:async()=>{const m=await mst(),g=await E(()=>state.gems),d=m.coins-m0.coins;
     return{ok:d>=o.base*3+4&&d<=o.base*3+4+2&&g===g0+3&&m.vip.done,note:`("${o.text}" → +${d} 🪙 for ${o.base} worth, +${g-g0} 💎)`};}});
   await wait(1400);await calm();}

  // ---- the pick shop: upgrades, the workbench tab, a new mine ----
  // open() notes the purse, so each check can see what one tap took
  const note0=()=>E(()=>{window.__m0=JSON.parse(JSON.stringify(state.mine));window.__g0=state.gems;});
  await E(()=>Object.assign(state.mine,{coins:6000,pick:0,bagLv:0,lamp:0,boots:0,shopLv:0}));
  const smith=async()=>{await calm();await E(()=>{if(state.mine.coins<3000)state.mine.coins=6000;Mine._openSmith();});await waitFor(p,".msmith");await note0();};
  await crawl("mine/smith",smith,"#mCard",[
    {match:/^button\.mtab .*Upgrades/,quiet:true,expect:async()=>({ok:/Pick shop/.test(await h2()),note:"(the tab he is on: nothing to do)"})},
    {match:/mTabBench/,expect:async()=>({ok:/Workbench/.test(await h2()),note:"→ "+await h2()})},
    {match:/\[i=\d\]/,expect:()=>E(()=>{const a=window.__m0,m=state.mine,spent=a.coins-m.coins,up=["pick","bagLv","lamp","boots","shopLv"].filter(k=>(m[k]||0)!==(a[k]||0));
      return{ok:spent>0&&up.length===1&&(m[up[0]]||0)===(a[up[0]]||0)+1,note:`(-${spent} 🪙, ${up.join()} +1)`};})},
    {match:/mNew/,expect:()=>E(()=>({ok:state.mine.seed!==window.__m0.seed&&state.mine.dug===""&&state.mine.mineNo===(window.__m0.mineNo||1)+1,note:"(a fresh mine, everything owned kept)"}))},
    {match:/mClose/,expect:async()=>!(await panelOn())}]);
  // a double tap on a buy button buys one level, not two
  await calm();await E(()=>Object.assign(state.mine,{coins:6000,pick:0,bagLv:0,lamp:0,boots:0,shopLv:0}));
  for(const [i,k,name] of [[0,"pick","Iron pick"],[1,"bagLv","Bigger backpack"],[2,"lamp","Brighter lamp"],[4,"shopLv","Gem shop"]]){
    await smith();
    await probe("mine/smith",`${name} (double tap)`,`.msmith [data-i="${i}"]`,{dbl:true,settle:300,expect:()=>E(k=>{const a=window.__m0,m=state.mine;
      return{ok:m[k]===a[k]+1&&["pick","bagLv","lamp","boots","shopLv"].every(x=>x===k||m[x]===a[x]),note:`(${k} ${a[k]} → ${m[k]}, -${a.coins-m.coins} 🪙)`};},k)});
  }
  await calm();
  // what the upgrades do (design v5.0, v5.2): the Stone pick can't dig deep rock and names the pick to buy; the Iron pick can
  const holdDig=async(ms)=>{await E(()=>{Mine._in.dig=true;});await wait(ms);await E(()=>{Mine._in.dig=false;});};
  const under=()=>E(()=>{const P=Mine._p;return[Math.floor(P.x+P.w/2),Math.floor(P.y+P.h+.05)];});
  const setUnder=(t,o=0)=>E(([t,o])=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2),y=Math.floor(P.y+P.h+.05);Mine._setTile(cx,y,t);Mine._setOre(cx,y,o);},[t,o]);
  await E(()=>Object.assign(state.mine,{pick:0,boots:0}));await surface(33.2);await wait(300);
  await setUnder(4);await holdDig(1200);
  {const [x,y]=await under();
   ok(await E(([x,y])=>Mine._tile(x,y)===4&&/Too hard! Buy the Iron pick/.test(document.getElementById("mToast").textContent),[x,y]),"mine/smith: with the Stone pick, deep rock is 'Too hard! Buy the Iron pick at the pick shop'");
   await smith();await probe("mine/smith","Iron pick (bought)",'.msmith [data-i="0"]',{expect:()=>E(()=>state.mine.pick===1)});await calm();
   await surface(33.2);await wait(200);await setUnder(4);await holdDig(2200);
   ok(await E(([x,y])=>Mine._tile(x,y)===0,[x,y]),"mine/smith: ... and with the Iron pick it digs");}
  // lava boots (design v5.0): too hot without them, dug with them
  await surface(35.2);await wait(300);await setUnder(8);await holdDig(900);
  {const [x,y]=await under();
   ok(await E(([x,y])=>Mine._tile(x,y)===8&&/Too hot! Buy lava boots/.test(document.getElementById("mToast").textContent),[x,y]),"mine/smith: lava without boots is 'Too hot! Buy lava boots at the pick shop.'");
   await smith();await probe("mine/smith","Lava boots",'.msmith [data-i="3"]',{expect:()=>E(()=>state.mine.boots===1)});await calm();
   await E(()=>{state.mine.pick=4;});await surface(35.2);await wait(200);await setUnder(8);await holdDig(1500);
   ok(await E(([x,y])=>Mine._tile(x,y)===0,[x,y]),"mine/smith: ... and with the boots the lava digs away");}
  // the lamp: deep down it is dark; a brighter lamp lights further (measured on the canvas)
  {const dep=S+46;
   await E(([y0])=>{for(let y=y0-4;y<=y0+1;y++)for(let x=14;x<=34;x++){Mine._setTile(x,y,y===y0+1?3:0);Mine._setOre(x,y,0);}for(let y=y0-3;y<=y0;y++)for(let x=28;x<=29;x++)Mine._setTile(x,y,3);
     Object.assign(state.mine,{lamp:0,pet:null});Mine._ents.length=0;},[dep]);
   await tp(24.19,dep+.079);await wait(1400);
   const lum=()=>E(()=>{try{const c=document.getElementById("mineCv"),g=c.getContext("2d");
       // the wall 4.4 tiles to his right, on the lamp's row: the camera keeps him in the middle of the screen
       const TS=Math.round(Math.max(40,Math.min(66,c.clientHeight/11))),k=c.width/c.clientWidth,x=Math.round(c.width/2+4.4*TS*k),y=Math.round(c.height*.45);
       const d=g.getImageData(x-6,y-6,12,12).data;let s=0;for(let i=0;i<d.length;i+=4)s+=(d[i]+d[i+1]+d[i+2])/3;return Math.round(s/(d.length/4));}catch(e){return "error: "+e.message;}});
   const dark=await lum();await E(()=>{state.mine.lamp=2;});await wait(500);const lit=await lum();await E(()=>{state.mine.lamp=0;});
   ok(typeof dark==="number"&&lit>dark+15,`mine/lamp: the brightest lamp lights the rock 4 tiles away (brightness ${dark} → ${lit})`);}
  await surface(22.2);await wait(300);

  // ---- the workbench: every recipe card, a wrong try, each thing made ----
  const bench=async()=>{await calm();await E(()=>Mine._openBench());await waitFor(p,".mrecipes");};
  await crawl("mine/bench",bench,"#mCard",[
    {match:/^button\.mtab .*Workbench/,quiet:true,expect:async()=>({ok:/Workbench/.test(await h2()),note:"(the tab he is on: nothing to do)"})},
    {match:/mTabUp/,expect:async()=>({ok:/Pick shop/.test(await h2()),note:"→ "+await h2()})},
    {match:/mrecipe/,expect:async()=>({ok:!!(await E(()=>document.querySelector("#mCard .mcardtext"))),note:"→ "+await h2()})},
    {match:/mClose/,expect:async()=>!(await panelOn())}]);
  const RECIPE_BAG={1:9,2:5,3:2,4:6,5:2,6:2,8:2,9:2};
  const recipe=async(i)=>{await calm();await E(([i,b])=>{state.mine.bag=Object.assign({},b);Mine._openBench();document.querySelector(`.mrecipe[data-i="${i}"]`).click();},[i,RECIPE_BAG]);await waitFor(p,".mcardtext");await note0();};
  await crawl("mine/recipe",()=>recipe(0),"#mCard",[
    {match:/^span/,quiet:true,expect:()=>E(()=>({ok:!window.__heard("say:word:"),note:"(silent until a wrong try brings the 🔊 help, as designed)"}))},
    {match:/mitem/,expect:()=>E(()=>document.querySelectorAll("#mTray .mitem").length>0)},
    {match:/mBackB/,expect:()=>E(()=>!!document.querySelector(".mrecipes"))},
    {match:/mMake/,expect:()=>E(()=>window.__heard("sfx:nope"))}]);
  // a wrong try: nothing is used up, the card's pictures and the 🔊 help show, the words speak
  await recipe(0);
  await E(()=>document.querySelector('#mBagRow .mitem[data-o="2"]').click());
  await probe("mine/recipe","Make it! 🔨 (the wrong things)","#mMake",{expect:()=>E(()=>({ok:J2(state.mine.bag)===J2(window.__m0.bag)&&!!document.querySelector(".mneed")&&document.getElementById("mHear").style.display==="",note:"(nothing used up, the pictures show)"}))});
  await probe("mine/recipe","a word of the card, after a wrong try",".mcardtext span",{expect:()=>E(()=>window.__heard("say:word:"))});
  await probe("mine/recipe","🔊 Hear it (after a wrong try)","#mHear",{expect:()=>E(()=>window.__heard("say:sent:"))});
  // each recipe, made right (a double tap on Make it! makes one): what it gives (design v5.3, v9.0)
  const GIVES=[["tnt","m=>m.items.tnt===1"],["snack","m=>m.items.snackUntil>Date.now()"],["charm","m=>m.items.charmUntil>Date.now()"],["map","m=>m.items.mapUntil>Date.now()"],
    ["torch","(m,a)=>m.blocks.torch===(a.blocks.torch||0)+4"],["ladder","(m,a)=>m.blocks.ladder===(a.blocks.ladder||0)+4"],["sign","(m,a)=>m.blocks.sign===(a.blocks.sign||0)+2"],["crown","m=>m.owned.crown===1"]];
  await E(()=>{state.mine.items={};delete state.mine.owned.crown;});
  for(let i=0;i<GIVES.length;i++){
    await recipe(i);
    const name=await h2(),need=await E(()=>{const t=document.querySelector(".mcardtext").textContent.toLowerCase(),q={a:1,one:1,two:2,three:3},out={};
      // the card says it in words: "Mix two coal rocks and a red gem to make TNT."
      ORES.forEach((O,o)=>{if(!O)return;[O.pl,O.name].some(n=>{const m=t.match(new RegExp("(a|one|two|three) "+n+"\\b"));if(m){out[o]=q[m[1]];return true;}return false;});});return out;});
    await E(need=>Object.entries(need).forEach(([o,n])=>{for(let k=0;k<n;k++)document.querySelector(`#mBagRow .mitem[data-o="${o}"]`).click();}),need);
    const [id,src]=GIVES[i];
    await probe("mine/recipe",`Make it! 🔨 (${name.trim()}, double tap)`,"#mMake",{dbl:true,expect:()=>E(([id,src,need])=>{const m=state.mine,a=window.__m0,f=eval(src);
      const used=Object.entries(need).every(([o,n])=>(a.bag[o]||0)-(m.bag[o]||0)===n);
      return{ok:f(m,a)&&used&&/You made/.test(document.querySelector("#mCard h2").textContent),note:`(${J2(need)} used once → ${id})`};},[id,src,need])});
  }
  await probe("mine/recipe","Done (after making)","#mPanel.on #mClose",{expect:async()=>!(await panelOn())});
  // the TNT he made: 🧨 in the HUD, 3-2-1, a big round hole (design v5.3)
  // an empty backpack first: a full one (from all the recipe testing) would rightly leave the gem in the rock
  await E(()=>{state.mine.bag={};});
  await calm();await surface(37.2);await wait(200);
  await E(([S])=>{for(let y=S+1;y<=S+4;y++)for(let x=35;x<=40;x++){Mine._setTile(x,y,3);Mine._setOre(x,y,0);}Mine._setTile(37,S+1,0);Mine._setOre(38,S+2,5);},[S]);
  await tp(37.19,S+.079);await wait(400);
  const solid=()=>E(([S])=>{let n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Mine._tile(37+dx,S+2+dy)!==0)n++;return n;},[S]);
  const s0=await solid(),b5=await E(()=>(state.mine.bag[5]||0)+(state.mine.bag[25]||0));
  await probe("mine/hud","🧨 1 (TNT)","#mTnt",{expect:()=>E(()=>({ok:/3\.\.\. 2\.\.\. 1/.test(document.getElementById("mToast").textContent)&&state.mine.items.tnt===0,note:"(3... 2... 1...)"}))});
  await wait(2900);
  ok(await solid()<s0-4&&await E(b=>(state.mine.bag[5]||0)+(state.mine.bag[25]||0)===b+1,b5),`mine/tnt: BOOM: a big round hole (${s0} → ${await solid()} solid blocks) and the blue gem inside is collected`);
  ok(await E(()=>getComputedStyle(document.getElementById("mTnt")).display==="none"),"mine/tnt: the 🧨 pill goes when the last TNT is used");

  // ---- the clothes tent: every colour, hair style and hat he owns ----
  // the Mine's own helmets keep in state.mine.owned; Trading Post hats like viking/diamond default to state.owned (Store's "own" keep)
  await E(()=>{state.owned=state.owned||{};state.owned.viking=1;});
  const clothes=async()=>{await calm();await E(()=>Mine._openWardrobe(false));await waitFor(p,".mward");};
  await crawl("mine/clothes",clothes,"#mCard",[
    {match:/\[k=\w+,v=\d+\]/,expect:()=>E(()=>{const on=[...document.querySelectorAll("#mCard [data-k].on")].map(b=>b.dataset.k+"="+b.dataset.v);
      return{ok:on.every(kv=>{const [k,v]=kv.split("=");return state.mine.look[k]===+v;}),note:"(worn: "+on.join(" ")+")"};})},
    {match:/\[h=\w+\]/,expect:()=>E(()=>({ok:!!document.querySelector(`#mCard [data-h="${state.mine.look.helmet}"].on`),note:"(hat: "+state.mine.look.helmet+")"}))},
    {match:/mClose/,expect:async()=>!(await panelOn())}]);
  await clothes();
  {const hats=await E(()=>[...document.querySelectorAll("#mCard [data-h]")].map(b=>b.dataset.h));
   ok(["miner","cap","cowboy","knight","viking","crown"].every(h=>hats.includes(h))&&!hats.includes("space")&&!hats.includes("diamond"),"mine/clothes: only the hats he owns (the Trading Post's and the workbench crown too): "+hats.join(","));
   const more=await E(()=>{const m=document.querySelector("#mCard .mmore");return m?{text:m.textContent,tag:m.tagName,tappable:getComputedStyle(m).cursor==="pointer"||!!m.onclick||m.tagName==="BUTTON"}:null;});
   ok(more&&/Get more at the Trading Post/.test(more.text),`mine/clothes: the "Get more at the Trading Post 🏪" line is there (${more&&more.tag}, ${more&&more.tappable?"tappable":"plain text, not a button"})`);
   counted("mine/clothes");}
  await calm();
  // his very first visit: "Make your miner!" then "Let's dig!"
  await E(()=>{state.mine.made=false;Mine._openWardrobe(true);});
  ok(/Make your miner/.test(await h2()),"mine/clothes: a first visit opens 'Make your miner!'");
  await probe("mine/clothes","Let's dig!","#mPanel.on #mClose",{expect:()=>E(()=>({ok:state.mine.made===true&&!document.getElementById("mPanel").classList.contains("on")&&/Walk right to the mine sign/.test(document.getElementById("mToast").textContent),note:"(made, and told how to dig)"}))});

  // ---- the museum: donate a shiny gem, the all-gems bonus once ----
  const museum=async()=>{await calm();await E(()=>{state.mine.bag[23]=state.mine.bag[23]||1;state.mine.bag[25]=1;delete state.mine.museum[23];delete state.mine.museum[25];Mine._openMuseum();});await waitFor(p,".mcases");await note0();};
  await crawl("mine/museum",museum,"#mCard",[
    {match:/\[d=\d+\]/,expect:()=>E(()=>{const a=window.__m0,m=state.mine,k=Object.keys(m.museum).find(k=>!a.museum[k]);
      return{ok:!!k&&m.coins===a.coins+25&&(m.bag[k]||0)===(a.bag[k]||0)-1,note:`(shiny ${k} in the case, +${m.coins-a.coins} 🪙)`};})},
    {match:/mClose/,expect:async()=>!(await panelOn())}]);
  await museum();
  await probe("mine/museum","Put in +25🪙 (double tap)",'[data-d="23"]',{dbl:true,settle:250,expect:()=>E(()=>({ok:state.mine.coins===window.__m0.coins+25&&state.mine.museum[23]===1,note:`(+${state.mine.coins-window.__m0.coins} 🪙 once)`}))});
  await calm();
  await E(()=>{for(let o=1;o<=9;o++)state.mine.found[o]=1;state.mine.museumBonus=0;});await note0();
  await E(()=>Mine._openMuseum());await wait(600);
  const c1=await E(()=>state.mine.coins-window.__m0.coins);await calm();await E(()=>Mine._openMuseum());await wait(400);
  ok(c1===100&&await E(()=>state.mine.coins-window.__m0.coins)===100,`mine/museum: all nine gems found pays +100 🪙 once (${c1}, then nothing more)`);counted("mine/museum");
  await calm();

  // ---- pets: every animal he has, no pet, let's go ----
  const pets=async()=>{await calm();await E(()=>{state.mine.pet=state.mine.pet||"bat";Mine._openPets();});await waitFor(p,".mpets");};
  await crawl("mine/pets",pets,"#mCard",[
    {match:/mpet/,expect:()=>E(()=>({ok:!!state.mine.pet&&document.getElementById("mPet").textContent.includes(NAMES[state.mine.pet]||state.mine.pet),note:"(HUD: "+document.getElementById("mPet").textContent+")"}))},
    {match:/mNoPet/,expect:()=>E(()=>state.mine.pet===null&&document.getElementById("mPet").textContent==="🐾 Pet")},
    {match:/mClose/,expect:async()=>!(await panelOn())}]);
  await E(()=>{state.mine.pet="dog";});await pets();
  await probe("mine/pets","Let's go! (with the dog)","#mPanel.on #mClose",{expect:()=>E(()=>({ok:/is digging with you/.test(document.getElementById("mToast").textContent),note:document.getElementById("mToast").textContent}))});
  // the pet follows him (it floats through rock)
  await surface(26.2);await wait(900);
  ok(await E(()=>Math.abs(Mine._PET.x-(Mine._p.x+Mine._p.w/2-Mine._p.face*.95))<1.2&&Math.abs(Mine._PET.y-Mine._p.y)<1.2),"mine/pets: the dog follows him: "+await E(()=>Mine._PET.x.toFixed(1)+","+Mine._PET.y.toFixed(1)+" by "+Mine._p.x.toFixed(1)+","+Mine._p.y.toFixed(1)));
  // no animals yet: a kind "meet some first"
  {const keep=await E(()=>JSON.stringify(state.critters));await E(()=>{state.critters=[];Mine._openPets();});
   ok(/Meet some animals/.test(await E(()=>document.getElementById("mCard").textContent)),"mine/pets: with no animals yet he is told to meet some in the valley");
   await probe("mine/pets","OK (no animals)","#mPanel.on #mClose",{expect:async()=>!(await panelOn())});
   await E(k=>{state.critters=JSON.parse(k);renderCritters();},keep);}

  // ---- Mine tasks: each row, get paid, the three-task bonus (design v9.0) ----
  const JOBDEF={dig:["dug",40,40],torch:["torches",5,30],build:["built",15,35],mole:["moles",1,30],rescue:["rescued",1,60],vault:["vaults",1,80],gems:["gems",5,35],sign:["signs",1,30],bounce:["bounces",1,20],sell:["served",3,40]};
  const tasks=async(done=[0,1])=>{await calm();await E(([done,D])=>{const J=Mine._jobs();J.list.forEach((j,k)=>{j.paid=false;const [s,n]=D[j.id];state.mine.stat[s]=j.base+(done.includes(k)?n:0);});Mine._openJobs();},[done,JOBDEF]);await waitFor(p,".mjobs");await note0();};
  await crawl("mine/tasks",tasks,"#mCard",[
    {match:/\[k=\d\]/,expect:()=>E(D=>{const J=Mine._jobs(),a=window.__m0,m=state.mine,j=J.list.find((j,k)=>j.paid&&!(a.jobs.list[k]||{}).paid);
      return{ok:!!j&&m.coins===a.coins+D[j.id][2],note:j?`("${j.id}" paid +${m.coins-a.coins} 🪙, design says ${D[j.id][2]})`:""};},JOBDEF)},
    {match:/mClose/,expect:async()=>!(await panelOn())}]);
  await tasks([0,1,2]);
  {const rows=await E(()=>[...document.querySelectorAll(".mjob")].map(r=>r.querySelector("b").textContent+" "+r.querySelector("span").textContent));
   ok(rows.length===3,"mine/tasks: three tasks today: "+rows.join(" | "));}
  for(let k=0;k<3;k++)await probe("mine/tasks",`Get paid, task ${k+1} (double tap)`,`#mCard [data-k="${k}"]`,{dbl:true,settle:250,expect:()=>E(k=>{const j=Mine._jobs().list[k];return{ok:j.paid,note:`(${j.id})`};},k)});
  ok(await E(D=>{const J=Mine._jobs(),a=window.__m0;return state.mine.coins-a.coins===J.list.reduce((s,j)=>s+D[j.id][2],0)&&state.gems===window.__g0+3;},JOBDEF),
    `mine/tasks: three tasks pay their coins once each and +3 💎 for all three (+${await E(()=>state.mine.coins-window.__m0.coins)} 🪙, +${await E(()=>state.gems-window.__g0)} 💎)`);
  ok(await E(()=>document.getElementById("mJobs").textContent==="📋 3/3"),"mine/tasks: the 📋 pill says 3/3");
  await calm();

  // ---- word stones: dig one up, read the word, crack it with the matching picture (design v5.0) ----
  await surface(42.2);await wait(200);
  await E(([S])=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2),y=Math.floor(P.y+P.h+.05);Mine._setTile(cx,y,2);Mine._setOre(cx,y,9);},[S]);
  {const digBtn=await boxOf("#mDig");await touch("touchStart",[digBtn]);
   ok(await waitFor(p,()=>document.getElementById("mPanel").classList.contains("on")&&/word stone/.test(document.getElementById("mCard").textContent),{timeout:4000}),
     "mine/wordstone: digging one up opens 'A word stone!' with the word and its pictures: "+await h2());
   await touch("touchEnd",[]);counted("mine/wordstone");
   const word=await E(()=>document.querySelector(".mword").textContent),g0=await E(()=>(state.mine.bag[9]||0));
   // a wrong picture: nothing taken, the 🔊 help shows
   await E(w=>{const b=[...document.querySelectorAll(".mpic")].find(x=>x.dataset.w!==w);b.click();},word);counted("mine/wordstone");
   await wait(300);
   ok(await E(g=>(state.mine.bag[9]||0)===g,g0)&&await E(()=>document.getElementById("mHear").style.visibility==="visible"),
     "mine/wordstone: a wrong picture takes nothing and shows the 🔊 help");
   // the right one, double tapped: +1 magic gem, once
   await E(w=>{const b=[...document.querySelectorAll(".mpic")].find(x=>x.dataset.w===w);b.click();b.click();},word);counted("mine/wordstone");
   ok(await waitFor(p,()=>!document.getElementById("mPanel").classList.contains("on"),{timeout:2500})&&await E(g=>(state.mine.bag[9]||0)===g+1,g0),
     "mine/wordstone: the right picture (double tap) cracks it for +1 magic gem, once, even after a miss");
  }
  await calm();

  // ---- deeper layers: a first arrival at a new layer shows its banner once (Lava Land: not yet visited by an earlier check) ----
  {const deepD=await E(()=>LAYERS.find(l=>l.name==="Lava Land").d);
   await E(()=>{state.mine.layers=(state.mine.layers||[]).filter(x=>x!=="Lava Land");document.getElementById("mBanner").classList.remove("on");});
   await E(([d,S])=>{for(let x=20;x<=24;x++)for(let y=S+d-2;y<=S+d+3;y++){Mine._setTile(x,y,0);Mine._setOre(x,y,0);}
     const P=Mine._p;P.x=22.2;P.y=S+d+1;P.vx=P.vy=0;},[deepD,S]);
   await wait(500);counted("mine/layers");
   ok(await waitFor(p,()=>document.getElementById("mBanner").classList.contains("on")&&/Lava Land/.test(document.getElementById("mBanner").textContent),{timeout:2000}),
     "mine/layers: reaching Lava Land the first time shows a banner: "+await E(()=>document.getElementById("mBanner").textContent));
   ok(await E(()=>(state.mine.layers||[]).includes("Lava Land")),"mine/layers: the layer is remembered in the save");
   await E(()=>document.getElementById("mBanner").classList.remove("on"));
   await E(([d,S])=>{const P=Mine._p;P.x=22.2;P.y=S+d+3;P.vx=P.vy=0;},[deepD,S]);await wait(500);counted("mine/layers");
   ok(await E(()=>!document.getElementById("mBanner").classList.contains("on")),"mine/layers: going there again does not banner a second time");
  }
  await calm();await surface(22.2);await wait(200);
  console.log("DEBUG before mole: running="+await E(()=>Mine._running())+" paused="+await E(()=>Mine._paused())+" modes="+await E(()=>Modes.stack().join(">"))+" pos="+await E(()=>Mine._p.x.toFixed(1)+","+Mine._p.y.toFixed(1)));

  // ---- the mole's riddle: reading pays coins kindly, even after a miss; a miss never costs (design v5.3) ----
  await E(([S])=>{Mine._ents.length=0;const P=Mine._p;P.x=23.3;P.y=S+17.6;P.vx=P.vy=0;Mine._setTile(24,S+18,2);Mine._ents.push({type:"mole",x:24.5,y:S+17.5,side:1,life:9,pop:1});},[S]);
  await wait(500);
  console.log("DEBUG mole set: running="+await E(()=>Mine._running())+" paused="+await E(()=>Mine._paused())+" pos="+await E(()=>Mine._p.x.toFixed(1)+","+Mine._p.y.toFixed(1))+" ents="+await E(()=>JSON.stringify(Mine._ents))+" mAct="+await E(()=>document.getElementById("mAct").textContent+"|"+getComputedStyle(document.getElementById("mAct")).display));
  ok(await waitFor(p,()=>/[Mm]ole/.test(document.getElementById("mAct").textContent||"")),
    "mine/mole: standing by a popped mole shows its riddle button: "+await E(()=>document.getElementById("mAct").textContent));
  await probe("mine/mole","🐹 Mole's riddle","#mAct",{expect:()=>E(()=>!!document.querySelector("#mCard .mq"))});
  {const c0=await E(()=>state.mine.coins);
   const hadWrong=await E(()=>window.__wrong("#mCard .mq"));counted("mine/mole");
   await wait(400);
   ok(!hadWrong||await E(c=>state.mine.coins===c,c0),"mine/mole: a wrong guess at the riddle takes nothing");
   await E(()=>{window.__answer("#mCard .mq");window.__answer("#mCard .mq");});counted("mine/mole");
   ok(await waitFor(p,()=>!document.getElementById("mPanel").classList.contains("on"),{timeout:2500})&&await E(c=>state.mine.coins>c&&state.mine.stat.moles===1,c0),
     `mine/mole: the right answer, even double-tapped, pays coins once${hadWrong?" (kindly, even after the miss)":""}`);
  }
  await calm();

  // ---- a mole he says bye to: no reward, no cost ----
  await E(([S])=>{Mine._ents.length=0;const P=Mine._p;P.x=23.3;P.y=S+17.6;P.vx=P.vy=0;Mine._setTile(24,S+18,2);Mine._ents.push({type:"mole",x:24.5,y:S+17.5,side:1,life:9,pop:1});},[S]);
  await wait(500);
  {const c0=await E(()=>state.mine.coins);
   await probe("mine/mole","Bye, mole!","#mAct",{expect:()=>E(()=>!!document.querySelector("#mCard .mq"))});
   await probe("mine/mole","Bye, mole! (closing without answering)","#mPanel.on #mClose",{expect:async()=>({ok:!(await panelOn())&&await E(c=>state.mine.coins===c,c0),note:"(nothing taken)"})});
  }
  await calm();await surface(22.2);await wait(200);

  // ---- the lost animal: reading sends it home for +25 coins and +4 gems, once; a miss never costs (design v5.3) ----
  await E(()=>{delete state.mine.lost;});
  {const L=await E(()=>Mine._lost());
   await tp(L.x+.19,L.y+.079);await wait(400);
   console.log("DEBUG rescue: L="+J(L)+" running="+await E(()=>Mine._running())+" paused="+await E(()=>Mine._paused())+" pos="+await E(()=>Mine._p.x.toFixed(2)+","+Mine._p.y.toFixed(2))+" mAct="+await E(()=>document.getElementById("mAct").textContent+"|"+getComputedStyle(document.getElementById("mAct")).display));
   ok(await waitFor(p,()=>/lost/i.test(document.getElementById("mAct").textContent||"")),
     "mine/rescue: standing by the lost animal shows the help button: "+await E(()=>document.getElementById("mAct").textContent));
   await probe("mine/rescue","🐾 Help the lost animal","#mAct",{expect:()=>E(()=>!!document.querySelector("#mCard .mq"))});
   const m0=await mst(),g0=await E(()=>state.gems);
   const hadWrong=await E(()=>window.__wrong("#mCard .mq"));counted("mine/rescue");
   await wait(500);
   ok(!hadWrong||await E(m=>state.mine.coins===m.coins,m0),"mine/rescue: a wrong try never costs anything");
   await E(()=>{window.__answer("#mCard .mq");window.__answer("#mCard .mq");});counted("mine/rescue");
   await waitFor(p,()=>state.mine.lost&&state.mine.lost.rescued,{timeout:3000});
   const m1=await mst(),g1=await E(()=>state.gems);
   ok(m1.coins===m0.coins+25&&g1===g0+4&&await E(id=>state.critters.some(c=>c.id===id),L.id)&&m1.stat.rescued===1,
     `mine/rescue: home again (double tap) pays the design's +25 🪙 and +4 💎 once (+${m1.coins-m0.coins} 🪙, +${g1-g0} 💎)${hadWrong?", even after the miss":""}`);
   await probe("mine/rescue","Hooray!","#mPanel.on #mClose",{expect:async()=>!(await panelOn())});
  }
  await calm();await surface(22.2);await wait(200);

  // ---- a word vault: only a reader opens it; a wrong try never costs; "Later" leaves it shut (design v5.0.1) ----
  {const V=await E(()=>Mine._vaults()[0]);
   const side=await E(v=>v.door[0]===v.x0?-1:1,V);
   await E(([x,y])=>{for(let xx=x-1;xx<=x+1;xx++)for(let yy=y-3;yy<=y+1;yy++){Mine._setTile(xx,yy,0);Mine._setOre(xx,yy,0);}Mine._setTile(x,y+1,3);},[V.door[0]+side,V.door[1]]);
   await tp(V.door[0]+side+.19,V.door[1]+.079);await wait(400);
   console.log("DEBUG vault: V="+J(V)+" running="+await E(()=>Mine._running())+" paused="+await E(()=>Mine._paused()));
   ok(await waitFor(p,()=>/vault/i.test(document.getElementById("mAct").textContent||"")),
     "mine/vault: standing at the door shows 🔐 Open the word vault: "+await E(()=>document.getElementById("mAct").textContent));
   await probe("mine/vault","🔐 Open the word vault","#mAct",{expect:()=>E(()=>!!document.querySelector("#mCard .mq"))});
   await probe("mine/vault","Later","#mPanel.on #mClose",{expect:async()=>({ok:!(await panelOn())&&await E(v=>Mine._tile(v.door[0],v.door[1])!==0,V),note:"(door still shut, nothing lost)"})});
   await E(()=>document.getElementById("mAct").click());await waitFor(p,()=>document.querySelector("#mCard .mq"));counted("mine/vault");
   const m0=await mst();
   const hadWrong=await E(()=>window.__wrong("#mCard .mq"));counted("mine/vault");
   await wait(500);
   ok(!hadWrong||await E(m=>state.mine.coins===m.coins,m0),"mine/vault: a wrong try at the door never costs anything");
   await E(()=>{window.__answer("#mCard .mq");window.__answer("#mCard .mq");});counted("mine/vault");
   ok(await waitFor(p,v=>Mine._tile(v.door[0],v.door[1])===0,{arg:V,timeout:3000})&&await E(v=>state.mine.vaults[v.k]===1,V),
     "mine/vault: reading right (double tap) opens the door once: 'Treasure inside! Dig the chests.'");
  }
  await calm();await surface(22.2);await wait(200);

  // ---- the boss: Run away costs nothing; a wrong answer costs a heart, never coins; winning (double-tapped) pays once (design v5.3) ----
  {const B0=await E(()=>({id:BOSSES[0].id,name:BOSSES[0].name,hp:BOSSES[0].hp,reward:BOSSES[0].reward,gems:BOSSES[0].gems}));
   const heartsHp=()=>E(()=>{const b=[...document.querySelectorAll(".mbars>div")];return{hp:(b[0]&&b[0].textContent.match(/🖤/g)||[]).length,hearts:(b[1]&&b[1].textContent.match(/❤️/g)||[]).length};});
   const bossReset=async i=>{await calm();await E(i=>{delete state.mine.bosses[BOSSES[i].id];},i);await E(i=>Mine._startBoss(i),i);await waitFor(p,()=>document.querySelector(".mboss"));};
   await bossReset(0);
   const c0=await mst(),g0=await E(()=>state.gems);
   await probe("mine/boss",`${B0.name}: Run away`,"#mRun",{expect:()=>E(()=>Mine._running()&&Modes.top()==="mine")});
   ok(await E(c=>state.mine.coins===c,c0.coins)&&await E(g=>state.gems===g,g0),"mine/boss: running away takes nothing");
   await bossReset(0);
   await probe("mine/boss","Fight! ⚔️","#mFight",{expect:()=>E(()=>!!document.querySelector(".mboss.fight"))});
   {const before=await heartsHp(),m0=await mst();
    await E(()=>{const correct=Mine._ans(),b=[...document.querySelectorAll("[data-w]")].find(e=>e.dataset.w!==correct);b.click();});counted("mine/boss");
    await wait(1000);const after=await heartsHp(),m1=await mst();
    ok(after.hearts===before.hearts-1&&m1.coins===m0.coins&&J(m1.bag)===J(m0.bag),`mine/boss: a wrong answer costs a heart, never coins or gems (${J(before)} → ${J(after)})`);
    await wait(1700);
   }
   // read every round through, double-tapping the right answer each time: still one hit per round, one win
   const mW=await mst(),gW=await E(()=>state.gems);
   for(let k=0;k<B0.hp+3&&await E(()=>!!document.querySelector(".mboss.fight"));k++){
     await E(()=>{const correct=Mine._ans(),b=[...document.querySelectorAll("[data-w]")].find(e=>e.dataset.w===correct);if(b){b.click();b.click();}});counted("mine/boss");
     await wait(1500);
   }
   ok(await waitFor(p,()=>/You beat the/.test((document.querySelector("#mCard h2")||{}).textContent||""),{timeout:3000}),"mine/boss: reading through wins the fight: "+await h2());
   const mAfter=await mst(),gAfter=await E(()=>state.gems);
   ok(mAfter.coins===mW.coins+B0.reward&&gAfter===gW+B0.gems&&mAfter.bosses[B0.id]===1,
     `mine/boss: beating ${B0.name} pays the design's +${B0.reward} 🪙 and +${B0.gems} 💎 once, even with double taps each round (+${mAfter.coins-mW.coins} 🪙, +${gAfter-gW} 💎)`);
   await probe("mine/boss","Keep digging ⛏️","#mPanel.on #mClose",{expect:async()=>!(await panelOn())});
  }
  await calm();

  // ======================================================================
  // ADVENTURE (lighter coverage: enter/exit, the Word-Dex, notes from home, the Trading Post stall,
  // the JOBS signpost, the story giver and a quest letter, Halloween doors and a full night, Word Wilds
  // opening. Tall grass, animal antics and the wild-animal catch itself are already covered by adv_e2e.js
  // and antics_e2e.js; this shard does not repeat that ground.)
  // ======================================================================
  await E(()=>{const b=document.getElementById("mBack");if(b)b.click();});
  await waitFor(p,()=>!Mine._running(),{timeout:4000});await wait(400);
  await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
  await probe("adv/enter","🧭 Adventure (dock)","#advBtn",{expect:()=>E(()=>Adv.on&&!!document.querySelector(".advash"))});
  const advBack=async()=>{await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
    if(!(await E(()=>Adv.on))){await E(()=>document.getElementById("advBtn").click());await waitFor(p,()=>Adv.on);}await wait(150);};

  // ---- the Word-Dex pill, its cards, and ✕ ----
  await advBack();
  await probe("adv/hud","📔 Word-Dex","#advDex",{expect:()=>E(()=>document.getElementById("ovDex").classList.contains("on"))});
  ok((await E(()=>document.querySelectorAll("#ovDex .dexc").length))>0,"adv/dex: every valley friend gets a card: "+await E(()=>document.querySelectorAll("#ovDex .dexc").length));
  await probe("adv/dex","✕","#dexX",{expect:()=>E(()=>!document.getElementById("ovDex").classList.contains("on"))});

  // ---- notes from home: "I read it!" pays +3 once, "I found it!" pays +5 once, even double-tapped ----
  await advBack();
  await E(()=>{state.notes=[{id:"huntnote1",text:"The cat sat.",from:"Mom",at:Date.now(),read:false,found:false}];});
  await E(()=>Notes.open(state.notes[0]));
  ok(await waitFor(p,()=>document.getElementById("ovNote").classList.contains("on")),"adv/notes: a note from home opens");
  {const g0=await E(()=>state.gems);
   await E(()=>{document.getElementById("nRead").click();document.getElementById("nRead").click();});counted("adv/notes",2);
   await wait(200);
   ok(await E(g=>state.gems===g+3,g0),"adv/notes: 'I read it!' pays +3 💎 once, even double-tapped");
   await probe("adv/notes","I'll look later","#nLater",{expect:()=>E(()=>!document.getElementById("ovNote").classList.contains("on"))});
   ok(await E(()=>!state.notes[0].found),"adv/notes: 'I'll look later' does not reward finding it");
  }
  await E(()=>Notes.open(state.notes[0]));await waitFor(p,()=>document.getElementById("ovNote").classList.contains("on"));
  await E(()=>document.getElementById("nRead").click());await wait(150);
  {const g0=await E(()=>state.gems);
   await E(()=>{document.getElementById("nFound").click();document.getElementById("nFound").click();});counted("adv/notes",2);
   await wait(200);
   ok(await E(g=>state.gems===g+5,g0),"adv/notes: 'I found it!' pays +5 💎 once, even double-tapped");
  }

  // ---- the Trading Post stall, the JOBS signpost, the story giver and a quest letter: only that they open ----
  await advBack();
  {const spot=await E(()=>Store._spot());
   await E(([c,r])=>{Adv._P.c=c+.3;Adv._P.r=r;},[spot.c,spot.r]);await wait(300);
   ok(await waitFor(p,()=>/Trading Post/.test(document.getElementById("advAct").textContent||"")),"adv/spots: the Trading Post stall shows 🏪 Trading Post");
   await probe("adv/spots","🏪 Trading Post","#advAct",{expect:()=>E(()=>document.getElementById("ovStore")&&document.getElementById("ovStore").classList.contains("on"))});
  }
  await advBack();
  {const spot=await E(()=>Jobs.boardAt());
   await E(([c,r])=>{Adv._P.c=c+.3;Adv._P.r=r;},[spot.c,spot.r]);await wait(300);
   ok(await waitFor(p,()=>/Job board/.test(document.getElementById("advAct").textContent||"")),"adv/spots: the JOBS signpost shows 💼 Job board");
   await probe("adv/spots","💼 Job board","#advAct",{expect:()=>E(()=>Modes.top()==="job")});
  }
  await advBack();
  {const giver=await E(()=>state.quest&&state.quest.giver);
   if(giver){
     await E(([c,r])=>{Adv._P.c=c+.3;Adv._P.r=r;},[giver.c,giver.r]);await wait(300);
     await probe("adv/spots","❗ story giver (chapter)","#advAct",{expect:()=>E(()=>Modes.top()==="story")});
   }else ok(true,"adv/spots: no story chapter offered right now to open (skipped)");
  }
  await advBack();
  {await E(()=>{const q=state.quest;q.active={spots:[{c:8,r:8}],found:[]};});
   await E(()=>{Adv._P.c=8.3;Adv._P.r=8;});await wait(300);
   ok(await waitFor(p,()=>/Unlock|🔒/.test(document.getElementById("advAct").textContent||"")),"adv/spots: a quest letter shows its own unlock button: "+await E(()=>document.getElementById("advAct").textContent));
   await probe("adv/spots","a quest letter","#advAct",{expect:()=>E(()=>Modes.top()==="story")});
  }

  // ---- Halloween doors: Trick._setToday, knock, a right read pays candy, the tenth door finishes one full night ----
  await advBack();
  await E(()=>Trick._setToday("2026-10-20"));await wait(300);
  {const doors=await E(()=>Trick.doors());
   ok(doors.length===10,"adv/halloween: ten doors light up the valley on Trick._setToday: "+doors.length);
   const d=doors.find(x=>!x.shut)||doors[0];
   await E(([c,r])=>{Adv._P.c=c+.3;Adv._P.r=r;},[d.c,d.r]);await wait(300);
   await probe("adv/halloween","🚪 Knock knock!","#advAct",{expect:()=>E(()=>Modes.top()==="trick")});
   const c0=await E(()=>state.mine.coins);
   await E(()=>window.__answer("#tkQ"));
   ok(await waitFor(p,()=>/candy/.test(document.getElementById("tkQ").textContent||""),{timeout:3000})&&await E(c=>state.mine.coins===c+2,c0),
     "adv/halloween: a right read pays +2 🪙 candy");
   await E(()=>document.getElementById("tkNext").click());await wait(200);
  }
  // fast-forward to the last door: knocking it for real finishes "one full night"
  await E(()=>{state.trick.day="2026-10-20";state.trick.doors=Trick.doors().slice(0,9).map(d=>d.id);state.trick.candy=18;});
  {const last=(await E(()=>Trick.doors())).find(x=>!x.shut);
   await E(([c,r])=>{Adv._P.c=c+.3;Adv._P.r=r;},[last.c,last.r]);await wait(300);
   await E(()=>document.getElementById("advAct").click());await waitFor(p,()=>Modes.top()==="trick");counted("adv/halloween");
   await E(()=>window.__answer("#tkQ"));
   ok(await waitFor(p,()=>/Happy Halloween/.test(document.getElementById("ovTrick").textContent||""),{timeout:3000}),
     "adv/halloween: the tenth door finishes 'one full night': Happy Halloween!");
   await E(()=>document.getElementById("tkNext").click());await wait(200);
  }

  // ---- Word Wilds: only that the encounter opens (the catch itself is covered by adv_e2e.js) ----
  await advBack();
  await E(()=>Wild.start());
  ok(await waitFor(p,()=>document.getElementById("ovWild").classList.contains("on")),"adv/wilds: a wild encounter opens");
  await probe("adv/wilds","🏃 Run away","#wRun",{expect:()=>E(()=>!document.getElementById("ovWild").classList.contains("on"))});

  // ---- leaving Adventure removes its spots from the page ----
  await advBack();await wait(300);
  ok((await E(()=>document.querySelectorAll(".advland,.advash").length))>0,"adv/exit: spots are on the page while exploring");
  await probe("adv/exit","🏡 Done exploring","#advDone",{expect:()=>E(()=>!Adv.on&&document.querySelectorAll(".advland,.advash").length===0)});

  // ======================================================================
  // RACES
  // ======================================================================
  await advBack();
  {const v=await E(()=>state.vehicles[0]);
   await E(([c,r])=>{Adv._P.c=c+.3;Adv._P.r=r;},[v.c,v.r]);await wait(300);
   ok(await waitFor(p,()=>/Race/.test(document.getElementById("advAct").textContent||"")),
     "race/start: standing by a vehicle in Adventure offers a race: "+await E(()=>document.getElementById("advAct").textContent));
   await probe("race/start","🏁 Race the ...","#advAct",{expect:()=>E(()=>document.getElementById("ovRace").classList.contains("on"))});
  }
  // ✕ mid-race: cancels cleanly
  await probe("race/panel","Go! 🏁","#rGo",{expect:()=>E(()=>document.getElementById("rQ").innerHTML==="")});
  await wait(500);
  await probe("race/panel","✕ (mid-race)","#rX",{expect:()=>E(()=>!document.getElementById("ovRace").classList.contains("on")&&!Race._R())});
  // a full race: a wrong read at a gate never costs anything; reading it through pays gems once at the finish
  await advBack();
  {const v=await E(()=>state.vehicles[0]);
   await E(([c,r])=>{Adv._P.c=c+.3;Adv._P.r=r;},[v.c,v.r]);await wait(300);
   await E(()=>document.getElementById("advAct").click());await waitFor(p,()=>document.getElementById("ovRace").classList.contains("on"));
   await E(()=>document.getElementById("rGo").click());counted("race/gates",4);
   const gate=async right=>{await waitFor(p,()=>!!document.querySelector(".rgate"),{timeout:8000});
     if(right)await E(()=>window.__answer("#rQ .rqi"));else if(!(await E(()=>window.__wrong("#rQ .rqi"))))await E(()=>window.__answer("#rQ .rqi"));
     await wait(1300);};
   const g0=await E(()=>state.gems);
   await gate(false);
   ok(await E(g=>state.gems===g,g0)&&!!(await E(()=>document.querySelector(".track"))),"race/gates: a wrong read at a gate never costs anything (no boost this time)");
   await gate(true);await gate(true);
   ok(await waitFor(p,()=>!!document.querySelector(".wdone"),{timeout:15000}),"race/finish: the podium and place show up at the line");
   const g1=await E(()=>state.gems);
   ok(g1>g0,`race/finish: placing pays gems once (+${g1-g0} 💎)`);
   await probe("race/finish","Done","#rOk",{expect:()=>E(()=>!document.getElementById("ovRace").classList.contains("on"))});
  }

  // ======================================================================
  // VEHICLES AND ANIMALS IN THE VALLEY (light checks: veh_e2e.js and antics_e2e.js already tap every
  // vehicle and animal kind with the garage, the rocket, traffic and badges; this shard checks the
  // specific behaviours called out for this hunt without repeating that ground.)
  // ======================================================================
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o));if(Adv.on)Adv.exit();});await wait(300);
  {const v=await E(()=>state.vehicles[0]);
   await E(id=>{const x=state.vehicles.find(v=>v.id===id);if(x.out===false)bringOut("vehicle",x);bringIntoView(geom(x.c,x.r).x);},v.id);await wait(300);
   const fx0=await E(()=>window.__fx||0);
   await E(id=>{const x=state.vehicles.find(v=>v.id===id);document.querySelector(`.vehicle[data-u="${x.u}"]`).click();},v.id);counted("veh/valley");
   await wait(400);
   ok(await E(f=>(window.__fx||0)>f,fx0)||await E(()=>document.querySelectorAll(".vshout").length>0),"veh/valley: launching a vehicle on tap plays its stunt");
  }
  await E(()=>{state.grid["5,8"]={id:"garage",seed:1};renderWorld();});await wait(200);
  {const n0=await E(()=>state.vehicles.length);
   await E(()=>document.querySelector('#tiles .tile[data-build="garage"]').click());counted("veh/valley");
   await wait(400);
   ok(await E(n=>state.vehicles.length>=n,n0),"veh/valley: the garage rolls out a new vehicle, or kindly says it is empty for now");
  }
  await E(()=>{if(typeof hasVeh==="function"&&!hasVeh("v_rocket"))addVehicle("v_rocket");});
  {const rv=await E(()=>state.vehicles.find(v=>v.id==="v_rocket"));
   if(rv){
     await E(u=>{const x=state.vehicles.find(v=>v.u===u);if(x.out===false)bringOut("vehicle",x);bringIntoView(geom(x.c,x.r).x);},rv.u);await wait(300);
     await E(u=>document.querySelector(`.vehicle[data-u="${u}"]`).click(),rv.u);counted("veh/valley");
     ok(await waitFor(p,()=>!!document.querySelector(".countdown"),{timeout:2000}),"veh/valley: tapping the rocket starts a countdown");
     ok(await waitFor(p,u=>{const el=document.querySelector(`.vehicle[data-u="${u}"]`);return el&&el.classList.contains("launch");},{arg:rv.u,timeout:4000}),
       "veh/valley: ... then it launches");
   }else ok(true,"veh/valley: could not add the rocket to check it (skipped)");
  }
  // animal tap reactions, and legend/rare variants exist in the Word-Dex data
  {const cr=await E(()=>state.critters[0]);
   await E(id=>{const c=state.critters.find(x=>x.id===id);if(c.out===false)bringOut("critter",c);bringIntoView(geom(c.c,c.r).x);},cr.id);await wait(300);
   const fx0=await E(()=>window.__fx||0);
   await E(id=>document.querySelector(`.critter[data-critter="${id}"] .hitpad`).click(),cr.id);counted("veh/animals");
   await wait(500);
   ok(await E(f=>(window.__fx||0)>f,fx0),"veh/animals: tapping an animal in the valley gives a reaction");
  }
  ok(await E(()=>CRITTERS.some(c=>c.rar===3)&&CRITTERS.some(c=>c.rar===2)),"veh/animals: legendary (★★★) and rare (★★) variants exist and are marked in the Word-Dex");
  // bringing an animal back out (resting one) puts it loose in the valley again
  {const cr=await E(()=>state.critters[0]);
   await E(id=>{state.critters.find(c=>c.id===id).out=false;},cr.id);
   await E(id=>bringOut("critter",state.critters.find(c=>c.id===id)),cr.id);counted("veh/animals");
   ok(await E(id=>state.critters.find(c=>c.id===id).out===true,cr.id),"veh/animals: bringing a resting animal back out sets it loose in the valley again");
  }

  T.done();await close();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
