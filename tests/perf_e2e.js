// The valley's drawing costs (PERF in the game): viewW() keeps the stage's size instead of reading layout on
// every call; trail puffs are not made for vehicles out of view, come from a small pool instead of new elements,
// and are left out with Save battery on; the loops on things out of view (a hop, a sway, an aura) hold still.
const {launch,waitFor,check}=require("./lib");

// counts the layout reads of the stage and the valley layer (#tiles) while window.__lr is set
const COUNT_READS=()=>{
  const wrap=(proto,prop)=>{const d=Object.getOwnPropertyDescriptor(proto,prop);if(!d||!d.get)return;
    Object.defineProperty(proto,prop,{configurable:true,get(){if(window.__lr&&(this.id==="stage"||this.id==="tiles")){window.__lr.n++;
      const k=prop+" "+((new Error().stack||"").split("\n")[2]||"").trim().slice(0,60);window.__lr.by[k]=(window.__lr.by[k]||0)+1;}
      return d.get.call(this);}});};
  wrap(Element.prototype,"clientWidth");wrap(Element.prototype,"clientHeight");
  wrap(HTMLElement.prototype,"offsetWidth");wrap(HTMLElement.prototype,"offsetHeight");
};

(async()=>{
  const T=check("perf"),ok=T.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},init:COUNT_READS,
    seed:{phase:0,guardians:[0,1,2],settings:{goal:0,ambient:true,nature:false,saver:false},
      critters:[{id:"dog",seed:1,c:2,r:8,lv:3,out:true,since:1},{id:"fox",seed:2,c:5,r:7,lv:1,out:true,since:2},
        {id:"frog",seed:3,c:17,r:7,lv:3,out:true,since:3},{id:"wolf",seed:4,c:20,r:6,lv:1,out:true,since:4}],
      vehicles:[{u:"v1",id:"v_car",c:3,r:8,lv:1,out:true,since:1,hold:1},{u:"v2",id:"v_taxi",c:19,r:8,lv:1,out:true,since:2,hold:1}]}});
  const wait=ms=>p.waitForTimeout(ms);
  await E(()=>{Rest._idleMs=1e9;Rest._deepMs=1e9;Rest.poke();panTo(0,false);
    // count every puff put into the valley
    window.__pa=0;new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains("puff"))window.__pa++;})))
      .observe(document.getElementById("tiles"),{childList:true});});
  const shown=()=>E(()=>[...document.querySelectorAll("#tiles .puff")].filter(x=>getComputedStyle(x).display!=="none").length);
  const drive=(u,dc)=>E(([u,dc])=>{const v=state.vehicles.find(x=>x.u===u);return driveVehicle(v,dc,0,.3);},[u,dc]);

  // ---- 1. viewW(): no layout reads while the valley goes about its business ----
  await wait(500);
  const reads=await E(async()=>{window.__lr={n:0,by:{}};
    for(let i=0;i<4;i++){
      state.critters.forEach(cr=>moveCritter(cr,i%2?1:-1,0));
      state.vehicles.forEach(v=>driveVehicle(v,i%2?1:-1,0,.3));
      geom(4,8);toView(300);bringIntoView(200);baseSize();
      await new Promise(r=>setTimeout(r,120));}
    await new Promise(r=>setTimeout(r,1500));      // the trail puffs, the animals' glides, the traffic
    const r=window.__lr;window.__lr=null;return r;});
  ok(reads.n===0,"moving the animals and vehicles reads the stage's size from layout 0 times (was every call of viewW) "+J(reads));
  // the same answers as reading layout: after a window resize, and when the stage changes size on its own (the tool bar)
  await p.setViewportSize({width:900,height:700});await wait(500);
  const same=()=>E(()=>{const w=stage.clientWidth,h=stage.clientHeight;
    return{w,vw:viewW(),W:worldW(),want:w*PAGES,base:baseSize(),wantBase:Math.min(w/9*1.5,h/ROWS_MAX*2.4)*OBJ_SCALE};});
  let s=await same();
  ok(s.vw===s.w&&s.W===s.want&&Math.abs(s.base-s.wantBase)<1e-9,"after a resize, viewW(), worldW() and baseSize() match the stage "+J(s));
  await E(()=>{document.getElementById("dock").style.paddingBottom="70px";});await wait(500);
  s=await same();
  ok(s.vw===s.w&&Math.abs(s.base-s.wantBase)<1e-9,"after the tool bar grows (no window resize), baseSize() matches the stage's new height "+J(s));
  await E(()=>{document.getElementById("dock").style.paddingBottom="";});
  await p.setViewportSize({width:1024,height:768});await wait(600);
  // back to their spots (the drives above can turn them round anywhere): v1 in view on the left, v2 far out on the right
  await E(()=>{panTo(0,false);[["v1",4],["v2",19]].forEach(([u,c])=>{const v=state.vehicles.find(x=>x.u===u);v.hold=1;v.c=c;v.r=8;
    Object.assign(v,freeSpot(c,8,v));placeVehicle(v,0);});});

  // ---- 2. no trail puffs for a vehicle out of view ----
  await wait(1600);await E(()=>{window.__pa=0;});
  await drive("v2",-1);await wait(1200);
  const offPuffs=await E(()=>window.__pa);
  const v2x=await E(()=>{const v=state.vehicles.find(x=>x.u==="v2");return{x:geom(v.c,v.r).x,cam,vw:viewW()};});
  ok(v2x.x>v2x.cam+v2x.vw&&offPuffs===0,"a vehicle driving out of view leaves no trail puffs ("+offPuffs+") "+J(v2x));
  await drive("v1",1);await wait(150);
  const onPuffs=await shown();
  const v1=await E(()=>{const v=state.vehicles.find(x=>x.u==="v1");return{c:v.c,r:v.r,x:geom(v.c,v.r).x,cam,vw:viewW(),el:!!v._el,saver:saverOn(),pool:puffPool.length,top:Modes.top()};});
  ok(onPuffs>0,"a vehicle in view leaves its trail ("+onPuffs+" puffs showing) "+J(v1));

  // ---- 3. the puffs come from a pool: no new elements once it is warm ----
  await wait(1500);
  await drive("v1",2);await wait(1500);      // warm
  await E(()=>{window.__pa=0;});
  let maxShown=0,fresh=true;
  for(let i=0;i<4;i++){await drive("v1",i%2?2:-2);await wait(200);maxShown=Math.max(maxShown,await shown());
    // a puff in use plays its animation from the start, as a new one did
    fresh=fresh&&await E(()=>[...document.querySelectorAll("#tiles .puff")].filter(x=>getComputedStyle(x).display!=="none")
      .every(x=>{const a=x.getAnimations()[0];return a&&/^puff2b?$/.test(a.animationName)&&a.playState==="running"&&a.currentTime<1400;}));
    await wait(1300);}
  const added=await E(()=>window.__pa),inDom=await E(()=>document.querySelectorAll("#tiles .puff").length);
  ok(maxShown>0&&added===0,"four drives reuse the puffs: "+added+" new puff elements ("+maxShown+" showing at once)");
  ok(fresh,"a reused puff plays its animation from the start");
  ok(inDom<=48,"the pool stays small ("+inDom+" puff elements)");

  // ---- 4. Save battery: no trail puffs ----
  await E(()=>{state.settings.saver=true;applySaver();panTo(0,false);state.vehicles.forEach(v=>{v.hold=1;});});
  await wait(1600);await E(()=>{window.__pa=0;});
  await drive("v1",2);await wait(250);
  const saverShown=await shown();await wait(800);
  ok(saverShown===0,"Save battery on: a vehicle in view drives without its trail puffs ("+saverShown+")");
  await E(()=>{state.settings.saver=false;applySaver();state.vehicles.forEach(v=>{v.hold=1;});});

  // ---- 5. the loops on things out of view hold still; in view they run ----
  const loops=()=>E(()=>{const s=stage.getBoundingClientRect(),t=document.getElementById("tiles"),r={offRun:0,offPaused:0,onRun:0,onPaused:0};
    document.getAnimations().forEach(a=>{if(!(a instanceof CSSAnimation)||a.effect.getTiming().iterations!==Infinity)return;
      let el=a.effect.target;if(!el||!t.contains(el))return;while(el.parentElement!==t)el=el.parentElement;
      const b=el.getBoundingClientRect();
      if(b.right<s.left-250||b.left>s.right+250)r[a.playState==="running"?"offRun":"offPaused"]++;
      else if(b.left>=s.left&&b.right<=s.right)r[a.playState==="running"?"onRun":"onPaused"]++;});
    return r;});
  await E(()=>panTo(0,false));await wait(600);
  const l0=await loops();
  ok(l0.offRun===0&&l0.offPaused>0,"looking left: the loops on the far right hold still "+J(l0));
  ok(l0.onRun>0&&l0.onPaused===0,"looking left: everything in view moves "+J(l0));
  await E(()=>panTo(camMax(),false));await wait(600);
  const l1=await loops();
  ok(l1.onRun>0&&l1.onPaused===0&&l1.offRun===0&&l1.offPaused>0,"looking right: the right moves again, the left holds still "+J(l1));
  // under a sheet everything is paused, as before; out from under it, what is in view runs
  await p.click("#albumBtn");await waitFor(p,"#ovAlbum.on");await wait(300);
  const cov=await E(()=>{const t=document.getElementById("tiles");return document.getAnimations().filter(a=>a.effect&&t.contains(a.effect.target)&&a.playState==="running"&&a instanceof CSSAnimation&&a.effect.getTiming().iterations===Infinity).length;});
  ok(cov===0,"covered by a sheet: nothing in the valley runs ("+cov+")");
  await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));await wait(500);
  const l2=await loops();
  ok(l2.onRun>0&&l2.onPaused===0,"the sheet closed: what is in view moves again "+J(l2));

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
