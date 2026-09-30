// Battery: REST (the game holds still after 45 s with nobody touching it).
// Rest._idleMs is set short and Rest.check() asked, instead of waiting 45 s.
// The audio contexts are a stub that records suspend() and resume().
const {launch,waitFor,check}=require("./lib");

// a Web Audio stand-in: every node takes any call, the context logs suspend / resume
const AUDIO_STUB=()=>{
  window.__ctxLog=[];window.__ctxs=[];
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const node=()=>{const n={connect:x=>x||node(),disconnect(){},start(){},stop(){},getByteTimeDomainData(){},getFloatTimeDomainData(){},getByteFrequencyData(){},fftSize:2048,frequencyBinCount:1024};
    return new Proxy(n,{get(t,k){if(k in t||typeof k==="symbol")return t[k];return t[k]=param();}});};
  function Ctx(){
    const c={state:"running",sampleRate:24000,destination:node(),listener:node(),
      get currentTime(){return performance.now()/1000;},
      suspend(){c.state="suspended";window.__ctxLog.push("suspend");return Promise.resolve();},
      resume(){c.state="running";window.__ctxLog.push("resume");return Promise.resolve();},
      close(){c.state="closed";return Promise.resolve();},
      createBuffer(ch,len,sr){const d=new Float32Array(len);return{getChannelData:()=>d,duration:len/sr,length:len,sampleRate:sr,numberOfChannels:ch};},
      decodeAudioData(ab,ok,no){const e=new Error("stub");if(no)setTimeout(()=>no(e),0);const p=Promise.reject(e);p.catch(()=>{});return p;}};
    window.__ctxs.push(c);
    return new Proxy(c,{get(t,k){if(k in t||typeof k==="symbol")return t[k];if(/^create/.test(k))return ()=>node();return undefined;}});
  }
  window.AudioContext=Ctx;window.webkitAudioContext=Ctx;
};

(async()=>{
  const T=check("power"),ok=T.ok,J=x=>JSON.stringify(x);
  // a valley with animals and vehicles out, at night (fireflies), the nature sounds on
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},init:AUDIO_STUB,
    seed:{phase:2,settings:{goal:0,ambient:true,nature:true},
      critters:[{id:"dog",seed:1,c:4,r:8,lv:1,out:true,since:1},{id:"fox",seed:2,c:12,r:8,lv:2,out:true,since:2},{id:"frog",seed:3,c:18,r:7,lv:1,out:true,since:3}],
      vehicles:[{u:"v1",id:"v_car",c:9,r:8,lv:1,out:true,since:1},{u:"v2",id:"v_train",c:2,r:7,lv:1,out:true,since:2}]}});
  const wait=ms=>p.waitForTimeout(ms);
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));
  const resting=()=>E(()=>document.body.classList.contains("rest"));
  // the infinite animations in #app (the HUD, the valley, the tool bar): how many run and how many are paused
  const anims=()=>E(()=>{const app=document.getElementById("app"),r={run:0,paused:0};
    document.getAnimations().forEach(a=>{const t=a.effect&&a.effect.target;if(!t||!app.contains(t)||a.effect.getTiming().iterations!==Infinity)return;
      if(a.playState==="running")r.run++;else if(a.playState==="paused")r.paused++;});return r;});
  // idle time made short; ask now, and again after the timer would have
  const goIdle=async ms=>{await E(m=>{Rest._idleMs=m;},ms||300);await wait((ms||300)+150);await E(()=>Rest.check());};
  const awake=()=>E(()=>{Rest._idleMs=45000;Rest.poke();});
  const tap=async()=>{const b=await E(()=>{const r=document.getElementById("hudMid").getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
    await p.touchscreen.tap(b.x,b.y);await wait(150);};
  await tidy();
  await tap();      // a first touch starts the nature sounds (and is his input)
  ok(await E(()=>Nature._started()&&Nature._ctx().state==="running"),"the nature sounds start on the first touch (the audio stub is running)");

  // ---- 1. it comes on after the idle time, and not before ----
  await E(()=>{Rest._idleMs=2000;Rest.check();});await wait(200);
  ok(!(await resting()),"no rest a moment after a touch");
  const a0=await anims();
  ok(a0.run>20&&a0.paused===0,"awake: the valley's decorative loops run "+J(a0));
  await goIdle();
  ok(await resting(),"after the idle time with no input, body.rest is on");
  const a1=await anims();
  ok(a1.run===0&&a1.paused>=a0.run,"resting: every decorative loop in #app is paused, none running "+J(a1));
  const look=await E(()=>{const cs=id=>getComputedStyle(document.getElementById(id));
    return{blend:["grade","glow","sunbeam","seasonTint"].map(id=>cs(id).mixBlendMode),blur:cs("parentBtn").backdropFilter,flat:document.body.classList.contains("flat")};});
  ok(look.flat&&look.blend.every(m=>m==="normal")&&look.blur==="none","resting: the light layers blend as plain alpha and the glass has no blur "+J(look));
  ok(await E(()=>Nature._ctx().state==="suspended"&&window.__ctxLog.indexOf("suspend")>=0),"resting: the nature sounds' audio context is suspended "+J(await E(()=>window.__ctxLog)));

  // ---- 2. the wander ticks skip while resting ----
  // Math.random at .3 makes every animal and vehicle take its step on a tick (and the buddy stay put)
  await E(()=>{window.__moves=0;window.__rnd=Math.random;
    ["moveCritter","driveVehicle","buddyGo"].forEach(n=>{const f=window[n];window[n]=function(){window.__moves++;return f.apply(this,arguments);};});});
  await E(()=>{Math.random=()=>.3;});await wait(6000);
  const still=await E(()=>window.__moves);
  await E(()=>{Math.random=window.__rnd;});
  ok(still===0&&await resting(),"resting: 6 s of wander ticks and nothing walks or drives ("+still+" steps)");

  // ---- 3. a touch takes it off at once, and everything comes back ----
  const log0=await E(()=>window.__ctxLog.length);
  await tap();
  ok(!(await resting())&&!(await E(()=>document.body.classList.contains("flat"))),"a touch takes rest off at once");
  await awake();      // the usual 45 s again, so it stays awake for the checks below
  const a2=await anims();
  ok(a2.paused===0&&a2.run>=a0.run,"...the decorative loops run again "+J(a2));
  ok(await E(l=>Nature._ctx().state==="running"&&window.__ctxLog.slice(l).indexOf("resume")>=0,log0),"...and the nature sounds' context is resumed inside the touch");
  ok(await E(()=>getComputedStyle(document.getElementById("grade")).mixBlendMode==="multiply"),"...and the light layers blend again");
  await E(()=>{window.__moves=0;Math.random=()=>.3;});await wait(5600);
  const moved=await E(()=>window.__moves);await E(()=>{Math.random=window.__rnd;});
  ok(moved>0,"awake again: the animals and vehicles wander ("+moved+" steps in 5.6 s)");

  // ---- 4. never while a crate question waits on him ----
  await p.click("#crateBtn");await waitFor(p,"#ovCrates.on #crateRow .crate");
  await p.click("#crateRow .crate:not(.write):not(.pic):not(.swap)");
  ok(await waitFor(p,"#ovRead.on"),"a crate word is open");
  await goIdle();await wait(400);await E(()=>Rest.check());
  ok(!(await resting()),"no rest while a crate question waits on him (modes "+J(await E(()=>Modes.stack()))+")");
  await tidy();await goIdle();
  ok(await resting(),"...and it comes once the question is put away");
  await tap();await awake();

  // ---- 5. never during a Factory run ----
  await E(()=>{Factory.play(1);Factory._run(1);});
  ok(await E(()=>Factory._S().running&&Factory.busy()),"the Factory is running");
  await goIdle();await wait(400);await E(()=>Rest.check());
  ok(!(await resting()),"no rest during a Factory run");
  await E(()=>Factory.close());await goIdle();
  ok(await resting(),"...and it comes once the Factory is closed");
  await tap();await awake();await tidy();

  // ---- 6. Adventure: walking counts as input; the parked loop starts again on a touch ----
  await p.click("#advBtn");await wait(700);
  ok(await E(()=>Modes.top()==="adventure"),"Adventure is open");
  await E(()=>{Adv._in.jx=1;});      // a held joystick sends no events: only the walking says he is there
  await goIdle(600);await wait(300);await E(()=>Rest.check());
  ok(!(await resting()),"no rest while Ash walks, with no input events");
  await E(()=>{Adv._in.jx=0;});await goIdle(600);
  ok(await resting(),"rest once he stops");
  const c0=await E(()=>Adv._P.c);await wait(300);
  ok(await E(c=>Adv._P.c===c,c0),"resting: Adventure's frame loop is parked");
  await tap();await E(()=>{Adv._in.jx=-1;});await wait(500);
  const c1=await E(()=>Adv._P.c);await E(()=>{Adv._in.jx=0;});
  ok(!(await resting())&&c1<c0-.2,"a touch: Adventure's loop runs again and Ash walks ("+c0.toFixed(2)+" -> "+c1.toFixed(2)+")");
  await awake();await E(()=>{const b=document.getElementById("advDone");if(b)b.click();});await wait(300);

  // ---- 7. a hidden page: the ticks skip and the audio is held ----
  await E(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"hidden"});document.dispatchEvent(new Event("visibilitychange"));});
  ok(await E(()=>Rest.quiet()&&Nature._ctx().state==="suspended"),"hidden: Rest.quiet() and the nature sounds suspended");
  await E(()=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>"visible"});document.dispatchEvent(new Event("visibilitychange"));});
  await tap();
  ok(await E(()=>!Rest.quiet()&&Nature._ctx().state==="running"),"visible again and touched: the sounds run");

  ok(!errs.length,"no page or console errors: "+errs.join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
