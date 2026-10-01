// Battery: REST (the game holds still after 45 s with nobody touching it), Save battery, and the Battery check.
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
    // Save battery off here: the rest checks compare with the full look (section 8 turns it on)
    seed:{phase:2,settings:{goal:0,ambient:true,nature:true,saver:false},
      critters:[{id:"dog",seed:1,c:4,r:8,lv:1,out:true,since:1},{id:"fox",seed:2,c:12,r:8,lv:2,out:true,since:2},{id:"frog",seed:3,c:18,r:7,lv:1,out:true,since:3},
        {id:"wolf",seed:4,c:15,r:6,lv:1,out:true,since:4}],
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
  // a touch; the idle time goes back to 45 s first (a rest already on stays on until the touch), so a slow runner
  // cannot rest again between the touch and the next check
  const tap=async()=>{const b=await E(()=>{Rest._idleMs=45000;const r=document.getElementById("hudMid").getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
    await p.touchscreen.tap(b.x,b.y);await wait(150);};
  await tidy();
  await tap();      // a first touch starts the nature sounds (and is his input)
  ok(await E(()=>Nature._started()&&Nature._ctx().state==="running"),"the nature sounds start on the first touch (the audio stub is running)");

  // ---- 1. it comes on after the idle time, and not before ----
  await E(()=>{Rest._idleMs=8000;Rest.check();});await wait(200);
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
  await E(()=>{Wild.start=()=>{};});      // no wild animal out of the tall grass (a reading mode: it would rightly hold rest off)
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

  // ---- 7b. the movers step with a transform (a glide), not a left/top transition ----
  await tidy();await awake();
  await E(()=>{window.__quiet=Rest.quiet;Rest.quiet=()=>true;});      // the wander ticks hold off: only these steps move
  const gl=await E(()=>{const out={};
    const anchor=el=>{const r=el.getBoundingClientRect(),t=tilesEl.getBoundingClientRect();return{x:r.left+r.width/2-t.left,y:r.bottom-t.top};};
    const cr=state.critters.find(c=>c._el);for(const dc of [3,-3,5,-5,7,-7]){const c0=cr.c;moveCritter(cr,dc,0);if(cr.c!==c0)break;}
    const ca=cr._el.getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/translate/.test(k.transform||"")));
    out.critGlide=ca.length;out.critTrans=getComputedStyle(cr._el).transitionProperty;
    const v=state.vehicles.find(x=>x._el&&(VEH(x.id)||{}).move==="road");v.busy=0;for(const dc of [3,-3,5,-5,7,-7]){const c0=v.c;driveVehicle(v,dc,0,.34);if(v.c!==c0)break;}
    out.vehGlide=v._el.getAnimations().filter(a=>a.effect&&a.effect.getKeyframes().some(k=>/translate/.test(k.transform||""))).length;
    out.vehTrans=getComputedStyle(v._el).transitionProperty;
    for(const dc of [2,-2,4,-4,6,-6]){const c0=state.buddy.c;buddyGo(c0+dc,state.buddy.r);if(state.buddy.c!==c0)break;}
    const b=document.getElementById("buddyWorld");out.budGlide=b.getAnimations().filter(a=>/translate/.test(JSON.stringify(a.effect.getKeyframes()))).length;
    out.budTrans=getComputedStyle(b).transitionProperty;
    window.__glide={cr,v};return out;});
  ok(gl.critGlide===1&&!/left|top/.test(gl.critTrans),"an animal's step is a transform glide, not a left/top transition "+J(gl));
  ok(gl.vehGlide===1&&!/left|top/.test(gl.vehTrans),"...a vehicle's drive too");
  ok(gl.budGlide===1&&!/left|top/.test(gl.budTrans),"...and the buddy's walk");
  await wait(3600);
  const land=await E(()=>{const f=el=>{const r=el.getBoundingClientRect(),t=tilesEl.getBoundingClientRect();return[r.left+r.width/2-t.left,r.bottom-t.top];};
    const want=(x,topPct)=>[x,topPct/100*tilesEl.clientHeight];const {cr,v}=window.__glide;
    const res=[[cr._el],[v._el],[document.getElementById("buddyWorld")]].map(([el])=>{const a=f(el),w=want(parseFloat(el.style.left),parseFloat(el.style.top));
      return Math.round(Math.hypot(a[0]-w[0],a[1]-w[1]));});return res;});
  await E(()=>{Rest.quiet=window.__quiet;});
  ok(land.every(d=>d<=2),"each ends standing on its new spot, bottom middle on it (off by "+J(land)+" px)");

  // ---- 8. Save battery: half the particles, no blur, plain light layers, glows as a gradient, the front row sways, no wind ----
  const P=["mote","leaf","firefly","flake","petal","seed","lbat","lfall"];
  const looks=()=>E(P=>{const k={};P.forEach(c=>{k[c]=document.querySelectorAll("#stage ."+c).length;});
    const cs=(s,p)=>getComputedStyle(document.querySelector(s))[p];
    k.blur=cs("#parentBtn","backdropFilter");k.panBlur=cs("#panR","backdropFilter");k.blend=cs("#grade","mixBlendMode");
    k.sway=document.querySelectorAll("#tiles .sway").length;
    k.swayBack=[...document.querySelectorAll("#tiles .tile.scn > .sway")].filter(e=>!/^8:/.test(e.parentNode.dataset.key||"")).length;
    const w=document.querySelector('.critter[data-critter="wolf"] .body');k.rare=w?cs('.critter[data-critter="wolf"] .body',"filter")+" | "+cs('.critter[data-critter="wolf"] .body',"backgroundImage").slice(0,15):"none";
    k.wind=Nature._wind();k.saver=document.body.classList.contains("saver");return k;},P);
  const setSaver=on=>E(on=>{const b=document.getElementById("optSaver");b.checked=on;b.dispatchEvent(new Event("change"));},on);
  await tidy();await wait(300);
  const full=await looks();
  ok(!full.saver&&full.blur!=="none"&&full.blend==="multiply"&&full.wind&&/drop-shadow/.test(full.rare),"Save battery off: today's look (blur, blending, the wind, the rare wolf's drop-shadow glow) "+J(full));
  await setSaver(true);await wait(300);
  const lite=await looks();
  const halves=P.every(c=>lite[c]===Math.ceil(full[c]/2));
  ok(halves&&full.firefly===16&&full.mote===18,"Save battery on: half the particles "+J(P.map(c=>c+" "+full[c]+"→"+lite[c])));
  ok(lite.saver&&lite.blur==="none"&&lite.panBlur==="none","...no backdrop blur on the glass");
  ok(lite.blend==="normal","...the light layers are plain alpha");
  ok(lite.sway>0&&lite.sway<full.sway&&lite.swayBack===0,"...only the front row sways ("+full.sway+" → "+lite.sway+")");
  ok(/^none/.test(lite.rare)&&/gradient/.test(lite.rare),"...the rare wolf's glow is a gradient behind it, not a filter ("+lite.rare+")");
  ok(!lite.wind&&await E(()=>Nature._ctx().state==="running"),"...the wind bed is off, the nature sounds (chirps) still on");
  ok(await E(()=>state.settings.saver===true),"...and it is saved in the settings");
  await setSaver(false);await wait(300);
  const back=await looks();
  ok(P.every(c=>back[c]===full[c])&&back.blur===full.blur&&back.blend==="multiply"&&back.sway===full.sway&&back.wind&&/drop-shadow/.test(back.rare),
    "Save battery off again: everything as it was "+J(back));

  // ---- 9. an old save gets Save battery, on ----
  const fx=JSON.parse(require("fs").readFileSync(require("path").join(__dirname,"fixtures/v8-era.json"),"utf8"));
  await require("./lib").seed(p,fx,{base:null});
  const st=await E(()=>({saver:state.settings.saver,nature:state.settings.nature,timer:state.settings.timer,cls:document.body.classList.contains("saver")&&document.body.classList.contains("flat")}));
  ok(st.saver===true&&st.nature===fx.settings.nature&&st.timer===fx.settings.timer&&st.cls,"an old save (v8) gets Save battery with its default, on, and keeps its own settings "+J(st));

  // ---- 10. Battery check: the percent at the start and the end, as a grown-up types them ----
  await E(()=>{window.__now=Date.now();Power.now=()=>window.__now;});
  const row=()=>E(()=>({meta:document.getElementById("batMeta").textContent,btn:document.getElementById("batBtn").textContent,
    asking:getComputedStyle(document.getElementById("batAsk")).display!=="none",q:document.getElementById("batQ").textContent}));
  const type=v=>E(v=>{document.getElementById("batPct").value=v;document.getElementById("batOk").click();},v);
  await E(()=>renderSettings());
  let r=await row();
  ok(r.btn==="Start"&&!r.asking&&/Tap Start/.test(r.meta),"Battery check: a Start button, and what it is for "+J(r));
  await E(()=>document.getElementById("batBtn").click());r=await row();
  ok(r.asking&&/Battery now/.test(r.q),"Start asks for the percent from the status bar");
  await type("lots");r=await row();
  ok(r.asking&&/0 to 100/.test(r.q)&&!(await E(()=>state.power.cur)),"a percent that is not a number is asked for again, nothing started");
  await type("82");r=await row();
  const cur=await E(()=>state.power.cur);
  ok(cur&&cur.pct0===82&&cur.saver===true&&cur.ver===await E(()=>APP_VERSION)&&typeof cur.t0==="number","82%: the check starts {t0, pct0, saver, ver} "+J(cur));
  ok(r.btn==="Stop"&&/^Checking since \d{1,2}:\d\d (am|pm), 82%/.test(r.meta),"...and the row says so: "+r.meta);
  // an hour of play: 30 minutes reading, 20 in the Mine, 10 in the valley, 2 in the closet
  await E(()=>{window.__now+=60*60000;const d=today(),m=state.modeMin[d]||(state.modeMin[d]={});
    [["read",30],["mine",20],["valley",10],["closet",2]].forEach(([k,n])=>{m[k]=(m[k]||0)+n;});});
  await E(()=>document.getElementById("batBtn").click());await type("74");
  const rec=await E(()=>state.power.checks[state.power.checks.length-1]);r=await row();
  ok(rec&&rec.min===60&&rec.pct0===82&&rec.pct1===74&&rec.pctPerHour===8&&rec.saver===true&&rec.d===await E(()=>today()),"74% an hour later: 8% an hour, kept "+J(rec));
  ok(rec&&J(rec.modes)===J({read:30,mine:20,valley:10}),"...with the top three modes of the check "+J(rec&&rec.modes));
  ok(r.btn==="Start"&&/about 8% an hour \(Save battery on\), 60 minutes/.test(r.meta),"...and the row says what it found: "+r.meta);
  // a rise: it was charging
  const n0=await E(()=>state.power.checks.length);
  await E(()=>document.getElementById("batBtn").click());await type("50");
  await E(()=>{window.__now+=40*60000;});await E(()=>document.getElementById("batBtn").click());await type("55");r=await row();
  ok(await E(()=>state.power.checks.length)===n0&&/charging/.test(r.meta)&&/not kept/.test(r.meta)&&!(await E(()=>state.power.cur)),"a rise (50% to 55%) is not kept, and the row says kindly why: "+r.meta);
  // over 12 hours
  await E(()=>document.getElementById("batBtn").click());await type("90");
  await E(()=>{window.__now+=13*60*60000;});await E(()=>document.getElementById("batBtn").click());await type("30");r=await row();
  ok(await E(()=>state.power.checks.length)===n0&&/12 hours/.test(r.meta),"a check over 12 hours is not kept: "+r.meta);
  // Cancel leaves it as it was
  await E(()=>document.getElementById("batBtn").click());await E(()=>document.getElementById("batNo").click());r=await row();
  ok(!r.asking&&r.btn==="Start"&&!(await E(()=>state.power.cur)),"Cancel puts the box away, nothing started");
  // the list keeps the last 30
  await E(()=>{for(let i=0;i<32;i++){Power.start(90);window.__now+=30*60000;Power.stop(87);}});
  ok(await E(()=>state.power.checks.length)===30,"the checks kept are the last 30");

  // ---- 11. the game's own clues, a day at a time ----
  const d0=await E(()=>JSON.parse(JSON.stringify(state.power.days[today()]||{on:0,rest:0,an:0,n:0,fm:0,fn:0})));
  await E(()=>Power._tick());
  let d1=await E(()=>state.power.days[today()]);
  ok(d1.on===d0.on+1&&d1.n===d0.n+1&&d1.fn===d0.fn+1&&d1.rest===d0.rest&&d1.an>d0.an&&d1.fm>d0.fm,"a minute's tick: on screen +1, the running animations and a frame sample written "+J(d1));
  await goIdle();ok(await resting(),"(resting)");
  await E(()=>Power._tick());const d2=await E(()=>state.power.days[today()]);
  ok(d2.on===d1.on+1&&d2.rest===d1.rest+1,"a tick while resting counts a resting minute "+J(d2));
  await tap();await awake();
  const dayJ=await E(()=>JSON.stringify(state.power.days[today()]));
  ok(dayJ.length<200,"a day's clues are a few dozen bytes: "+dayJ);
  await E(()=>{const d=new Date();d.setDate(d.getDate()-70);state.power.days[ymd(d)]={on:1,rest:0,an:0,n:1,fm:16,fs:0,fn:1};});
  await E(()=>Power._tick());
  ok(await E(()=>Object.keys(state.power.days).every(k=>k>=ymd(new Date(Date.now()-60*864e5)))),"days older than 60 are dropped");
  ok(await E(()=>typeof minuteTick==="function"&&/Power\.tick/.test(minuteTick.toString())),"the clues come from the minutes tick");

  // ---- 12. the Grown-up report and the progress tool show them ----
  await E(()=>openReport());await wait(300);
  const rep=await E(()=>{const o=document.getElementById("ovReport"),h=[...o.querySelectorAll("h3")].map(x=>x.textContent),i=h.indexOf("Battery");
    return{h,i,where:h.indexOf("Where the time goes"),text:o.textContent,power:(document.getElementById("rPower")||{}).textContent||""};});
  ok(rep.i>0&&rep.i===rep.where+1,"the report has a Battery block right after Where the time goes "+J(rep.h));
  ok(/about 6% an hour \(Save battery on\), 30 minutes/.test(rep.text)&&(rep.text.match(/% an hour/g)||[]).length===5,"...the last five checks, as about N% an hour (saver), minutes");
  ok(/rest \d+% of screen time, ~\d+ animations, frames \d+\.\d ms/.test(rep.power),"...and this week's clues in one line: "+rep.power);
  await tidy();
  const fsn=require("fs"),os=require("os"),pth=require("path"),snap=pth.join(os.tmpdir(),"wcv-power-"+process.pid+".json");
  fsn.writeFileSync(snap,JSON.stringify({savedAt:"test",state:await E(()=>JSON.parse(JSON.stringify(state)))}));
  const out=require("child_process").spawnSync("node",[pth.join(__dirname,"../tools/progress.js"),"--file",snap],{encoding:"utf8"});
  try{fsn.unlinkSync(snap);}catch(e){}
  ok(out.status===0&&/Battery checks \(the last 5\)/.test(out.stdout)&&/about 6% an hour \(save battery on\)/.test(out.stdout)&&/battery clues: on screen \d+ min, resting \d+%/.test(out.stdout),
    "tools/progress.js has a Battery section: "+J((out.stdout.split("Battery checks")[1]||out.stderr||"").slice(0,240)));

  // ---- 13. old saves: no power yet, or a null one ----
  await require("./lib").seed(p,Object.assign({},fx,{power:null}),{base:null});
  const pw=await E(()=>({checks:state.power.checks,cur:state.power.cur,days:typeof state.power.days}));
  ok(J(pw)===J({checks:[],cur:null,days:"object"}),"an old save (and one with power: null) gets the Battery check's defaults "+J(pw));

  ok(!errs.length,"no page or console errors: "+errs.join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
