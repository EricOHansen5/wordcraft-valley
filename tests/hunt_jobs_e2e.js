// Bug hunt, one shard: Jobs, the Trading Post, the Factory and the holiday packs (Trick-or-Read, the Feast table, Light the
// tree and the Closet), on the iPad 9th generation's screen (1024 × 768, touch). Every interactive element on each screen is
// tapped in turn and must do something within 800 ms (the page, the mode, the save, a toast, a spoken line or a sound), throw
// nothing, and every screen must close back to where it came from; text must not be cut off. The effects that matter are
// checked against docs/design.md: what a task pays, what a swap gives, what a level pays, that a replay pays nothing. And a
// double tap on a button that changes the screen must not land on what comes up under the finger (the ghost tap).
// Four areas, two at a time, each in its own browser. `node tests/hunt_jobs_e2e.js jobs` runs one: jobs, store, factory, holidays.
const {launch,waitFor,answer,check}=require("./lib");
const T=check("hunt_jobs"),ok=T.ok;
const VP={width:1024,height:768};
const J=x=>JSON.stringify(x);

// ---------- in the page: what is said, sounded and toasted, and a snapshot of everything a tap can change ----------
const HOOK=()=>{
  const H=window.__h={said:[],sfx:[],toasts:[]};
  Sound.speak=t=>{H.said.push(String(t));return Promise.resolve();};
  Sound.say=k=>{H.said.push("say:"+k);return Promise.resolve();};
  if(!window.__sfx0){window.__sfx0={};Object.keys(Sound.sfx).forEach(k=>{if(typeof Sound.sfx[k]==="function")window.__sfx0[k]=Sound.sfx[k];});}
  Object.keys(window.__sfx0).forEach(k=>{const f=window.__sfx0[k];Sound.sfx[k]=function(){window.__h.sfx.push(k);try{return f.apply(this,arguments);}catch(e){}};});
  if(!window.__toast0)window.__toast0=window.toast;
  window.toast=function(m){window.__h.toasts.push(String(m));return window.__toast0.apply(this,arguments);};
  const hash=s=>{s=String(s);let x=0;for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))|0;return x;};
  window.__snap=sel=>{
    const el=sel?document.querySelector(sel):null,st=state,m=st.mine||{};
    const slice=[st.gems,m.coins,st.jobs,st.factory,st.look,st.looks,st.hat,st.hats,st.owned,m.owned,m.look&&m.look.helmet,st.trick,st.feast,st.lights,st.exchangeSeen,st.wordsRead];
    let fac="";try{const w=Factory._w(),s=Factory._S();fac=w?Factory.engine.encode(w)+J(s&&[s.tool,s.running,s.done,s.cur,s.view,s.n]):"";}catch(e){}
    const ids=["storePurse","jobsBadge","gemCount","trickBadge","feastBadge","lightsBadge","closetBadge","advAct"];
    return{dom:el?hash(el.innerHTML)+":"+el.className:"-",mode:Modes.stack().join(">"),state:hash(JSON.stringify(slice)),factory:hash(fac),
      said:H.said.length,sfx:H.sfx.length,toast:H.toasts.length,
      hud:hash(ids.map(i=>{const e=document.getElementById(i);return e?e.textContent+"/"+e.className:"";}).join("|"))};
    function J(x){return JSON.stringify(x);}
  };
  window.__diff=(sel,a)=>{const b=window.__snap(sel);return Object.keys(b).filter(k=>b[k]!==a[k]);};
  // text cut off inside a screen: own text wider than its box where the overflow is hidden, or off the screen sideways; a sheet that scrolls sideways
  window.__clip=sel=>{
    const root=document.querySelector(sel);if(!root)return["no "+sel];const out=[],vw=innerWidth;
    const name=el=>el.tagName.toLowerCase()+(el.id?"#"+el.id:"")+(el.className&&typeof el.className==="string"?"."+el.className.trim().split(/\s+/).join("."):"");
    root.querySelectorAll("*").forEach(el=>{
      const cs=getComputedStyle(el);if(cs.display==="none"||cs.visibility==="hidden")return;
      const r=el.getBoundingClientRect();if(!r.width||!r.height)return;
      const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
      const txt=el.textContent.trim().slice(0,30);
      if(el.scrollWidth>el.clientWidth+2&&/hidden|clip/.test(cs.overflowX)&&el.clientWidth>0)out.push(`${name(el)} "${txt}" is cut (${el.scrollWidth} > ${el.clientWidth})`);
      if(r.left<-1||r.right>vw+1)out.push(`${name(el)} "${txt}" is off the screen (${Math.round(r.left)}..${Math.round(r.right)})`);});
    root.querySelectorAll(".sheet").forEach(s=>{if(s.scrollWidth>s.clientWidth+2)out.push(`${name(s)} scrolls sideways (${s.scrollWidth} > ${s.clientWidth})`);});
    return out;};
};

// ---------- the helpers every area uses ----------
function kit(area,page,errs,E){
  const p=page,counts={};
  const wait=ms=>p.waitForTimeout(ms);
  // after a tap that changes the screen the next tap waits a little: a quicker one on the same spot is a double tap, which the game lets go
  let swapAt=0;const pace=async()=>{const d=Date.now()-swapAt;if(d<600)await wait(600-d);};
  const said=()=>E(()=>window.__h.said.slice());
  const lastSaid=()=>E(()=>window.__h.said[window.__h.said.length-1]||"");
  const toasts=()=>E(()=>window.__h.toasts.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const hook=()=>E(HOOK);
  // tap an element the page finds with fn(arg): by touch, scrolled into view, after Playwright's checks that it can be tapped
  async function tapFn(fn,arg){
    await pace();
    const h=await p.evaluateHandle(fn,arg),el=h.asElement();
    if(!el){await h.dispose();throw new Error("not found");}
    try{await el.tap({timeout:3000});}finally{await h.dispose();}
    return true;
  }
  const tapSelRaw=async sel=>{await pace();await p.tap(sel,{timeout:3000});return true;};
  // the centre of an element (scrolled into view)
  const centre=(fn,arg)=>E(([f,a])=>{const el=(0,eval)("("+f+")")(a);if(!el)return null;el.scrollIntoView({block:"nearest"});const r=el.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2];},[fn.toString(),arg]);
  // two quick touches on one spot (a child's double tap): the second lands on whatever the first put there
  let cdp=null;
  async function dbl(x,y,gap=110){
    if(!cdp)cdp=await p.context().newCDPSession(p);
    for(let k=0;k<2;k++){
      await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});
      await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
      if(!k)await wait(gap);}
  }
  async function drag(pts){
    if(!cdp)cdp=await p.context().newCDPSession(p);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:pts[0][0],y:pts[0][1]}]});
    for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];for(const f of [.5,1])await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f}]});}
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  }
  // One element: tap it, then within 800 ms something must change (the page under root, the mode, the save, a toast, a line
  // said, a sound); no page or console error; want() (the expected effect) must hold. inert: shown only, a tap does nothing.
  async function act(screen,label,doTap,o={}){
    counts[screen]=(counts[screen]||0)+1;
    const e0=errs.length,s0=await E(r=>window.__snap(r),o.root||null);
    let why="";
    try{await doTap();}catch(x){why=String(x&&x.message||x).split("\n")[0];}
    if(o.swap)swapAt=Date.now();
    if(why)return T.fail(`${area} · ${screen} · ${label}: could not tap it (${why})`);
    const d=o.inert?(await wait(o.wait||350),await E(([r,s])=>window.__diff(r,s),[o.root||null,s0])):
      await waitFor(p,([r,s])=>{const x=window.__diff(r,s);return x.length?x:false;},{arg:[o.root||null,s0],timeout:o.wait||800});
    let w=[true,""];
    if(o.want){try{const r=await o.want();w=Array.isArray(r)?r:[!!r,""];}catch(x){w=[false,"the check threw: "+(x&&x.message)];}}
    const bad=errs.slice(e0),err=bad.length?" · ERROR "+bad.slice(0,2).join(" | "):"";
    const det=w[1]?" · "+w[1]:"";
    if(o.inert)return T.ok(!bad.length&&w[0],`${area} · ${screen} · ${label}: shown only, a tap does nothing${d&&d.length?" (it changed "+d.join("+")+")":""}${det}${err}`);
    return T.ok(!!d&&!bad.length&&w[0],`${area} · ${screen} · ${label}: ${d?d.join("+"):"NOTHING HAPPENED in "+(o.wait||800)+" ms"}${det}${err}`);
  }
  const tapSel=(screen,label,sel,o)=>act(screen,label,()=>tapSelRaw(sel),o);
  const tapEl=(screen,label,fn,arg,o)=>act(screen,label,()=>tapFn(fn,arg),o);
  const key=(screen,label,k,o)=>act(screen,label,()=>p.keyboard.press(k),o);
  async function clip(screen,sel){
    const c=await E(s=>window.__clip(s),sel);
    ok(!c.length,`${area} · ${screen}: nothing cut off at 1024 × 768${c.length?" — "+c.slice(0,4).join(" | "):""}`);
  }
  function summary(){Object.keys(counts).forEach(s=>console.log(`note ${area} · ${s}: ${counts[s]} elements tapped`));return counts;}
  const swapped=()=>{swapAt=Date.now();};
  return{p,E,wait,said,lastSaid,toasts,tidy,hook,tapFn,tapSelRaw,centre,dbl,drag,act,tapSel,tapEl,key,clip,summary,counts,swapped,pace};
}

/* =====================================================================================================================
   JOBS: the Job board, clock-in, a shift of every job through every job level, every kit, the moments, clock out
   ===================================================================================================================== */
// two lanes, each in its own browser: 1 the Job board's locked cards, the Shopkeeper, the Lawn mower and the ghost tap;
// 2 the Mail carrier, the Baker, the Trading Post's gear at the job and the signpost in Adventure
async function jobsArea(lane){
  const A="Jobs";
  const {page:p,errs,close,E}=await launch({viewport:VP,seed:{guardians:[0,1,2],gems:30,settings:{goal:0,tierOverride:2},mine:{coins:40}}});
  const K=kit(A,p,errs,E),{act,tapSel,tapEl,key,wait,said,clip}=K;
  await K.hook();await K.tidy();
  const R="#ovJob";
  const LV=await E(()=>Jobs.LEVELS.slice());
  const JOBS=await E(()=>Jobs.list().map(j=>({id:j.id,name:j.name,tier:j.unlock.tier,pay:j.pay,uni:j.uniform.name,tasks:j.tasks.map(t=>({id:t.id,lv:t.lv,name:t.name}))})));
  const coins=()=>E(()=>state.mine.coins);
  const msg=()=>E(()=>document.getElementById("jMsg").textContent);
  const S=()=>E(()=>Jobs._S());
  // the step on screen once it is step i of the task
  const step=i=>waitFor(p,i=>{const h=document.getElementById("jQ"),s=Jobs._S();
    return h&&h.dataset.ans&&s&&s.task&&s.task.i===i?{kit:h.dataset.kit,ans:h.dataset.ans,i,type:s.task.type,steps:s.task.steps,miss:s.task.miss}:false;},{arg:i,timeout:6000});
  const inQ=(kind,v)=>E(([k,v])=>{const h=document.getElementById("jQ");
    if(k==="opt")return !!h.querySelector(`.jopt[data-w="${CSS.escape(v)}"]`);return false;},[kind,v]);
  const typed=()=>E(()=>{const t=document.querySelector("#jQ .jtyped");return t?t.textContent:null;});
  const me=()=>E(()=>{const c=document.querySelector("#jQ .jcell.me");return c?c.dataset.c+","+c.dataset.r:null;});
  const slots=()=>E(()=>[...document.querySelectorAll("#jQ .jorow .joslot")].map(s=>{const c=s.querySelector(".jocard");return c?c.dataset.w:"";}));
  const NAME={L:"⬅️ left",R:"➡️ right",U:"⬆️ up",D:"⬇️ down"},KEY={L:"ArrowLeft",R:"ArrowRight",U:"ArrowUp",D:"ArrowDown"},WASD={L:"KeyA",R:"KeyD",U:"KeyW",D:"KeyS"};
  const STEP={L:[-1,0],R:[1,0],U:[0,-1],D:[0,1]};
  const tapOpt=v=>K.tapFn(v=>[...document.querySelectorAll("#jQ .jopt")].find(b=>b.dataset.w===v),v);
  const tapKey=k=>K.tapFn(k=>document.querySelector(`#jQ .jkey[data-key="${k}"]`),k);
  const tapArrow=d=>K.tapFn(d=>document.querySelector(`#jQ .jarrow[data-dir="${d}"]`),d);
  const tapCard=v=>K.tapFn(v=>[...document.querySelectorAll("#jQ .jocard")].find(b=>b.dataset.w===v),v);
  const tapCheck=()=>K.tapFn(()=>document.querySelector('#jQ [data-act="check"]'));

  // ---- the kits, every element: pick (the words of the order, every picture), pad (every key), path (every arrow, the squares, the keys), order ----
  async function pickSweep(scr,q){
    const nw=await E(()=>document.querySelectorAll("#jQ .jtext .bw").length);
    for(let i=0;i<nw;i++){const w=await E(i=>document.querySelectorAll("#jQ .jtext .bw")[i].textContent,i);
      await tapEl(scr,`the word “${w}” in the order (sounded out)`,i=>document.querySelectorAll("#jQ .jtext .bw")[i],i,{root:R,
        want:async()=>{const s=await said();return[s.some(x=>/^say:(word|sound):/.test(x)),"said "+s.slice(-2).join(", ")];}});
      await wait(150);}
    const opts=await E(()=>[...document.querySelectorAll("#jQ .jopt")].map(b=>b.dataset.w)),wrong=opts.filter(v=>v!==q.ans);
    const c0=await coins();
    for(let k=0;k<wrong.length;k++){
      await act(scr,`a wrong picture (${wrong[k]})`,()=>tapOpt(wrong[k]),{root:R,want:async()=>{const m=await msg(),c=await coins(),
        hint=await E(a=>document.querySelector(`#jQ .jopt[data-w="${CSS.escape(a)}"]`).classList.contains("hint"),q.ans);
        return k===0?[/waits a moment/.test(m)&&!hint&&c===c0,`“${m}”, nothing taken`]:[/glows/.test(m)&&hint&&c===c0,`“${m}”, the right one glows, nothing taken`];}});
      await wait(120);}
    await act(scr,`the right picture (${q.ans})`,()=>tapOpt(q.ans),{root:R,want:()=>E(a=>document.querySelector(`#jQ .jopt[data-w="${CSS.escape(a)}"]`).classList.contains("right"),q.ans)});
  }
  async function padSweep(scr,q){
    for(const d of "1234567890"){
      await act(scr,`the ${d} key`,()=>tapKey(d),{root:R,want:async()=>{const t=await typed();return[t===d,"shows "+t];}});
      await (d==="1"?act(scr,"⌫ rub out",()=>tapKey("del"),{root:R,want:async()=>{const t=await typed();return[t==="","shows “”"];}}):tapKey("del"));}
    await act(scr,"✓ with nothing typed",()=>tapKey("ok"),{root:R,inert:true,want:async()=>[(await S()).task.miss===q.miss,"no miss"]});
    const c0=await coins(),bad=String((+q.ans+1)%100);
    for(let k=0;k<2;k++){
      for(const c of bad)await tapKey(c);
      await act(scr,k?"✓ with a wrong number again":"✓ with a wrong number",()=>tapKey("ok"),{root:R,want:async()=>{const m=await msg(),c=await coins();
        const g=await E(a=>({ghost:document.querySelector("#jQ .jghost").textContent,key:!!document.querySelector(`#jQ .jkey.hint[data-key="${a[0]}"]`)}),q.ans);
        return k?[/glows/.test(m)&&g.ghost===q.ans&&g.key&&c===c0,`“${m}”, the answer shows faintly and its key glows`]:[/waits a moment/.test(m)&&c===c0&&!g.ghost,`“${m}”, nothing taken`];}});
      await wait(120);}
    for(const c of q.ans)await tapKey(c);
    await act(scr,`✓ with the right number (${q.ans})`,()=>tapKey("ok"),{root:R,want:()=>E(()=>document.querySelector("#jQ .jshow").classList.contains("right"))});
  }
  async function padKeys(scr,q){
    await key(scr,"the keyboard: a digit",String((+q.ans+1)%10),{root:R});
    await key(scr,"the keyboard: Backspace","Backspace",{root:R,want:async()=>[(await typed())==="","rubbed out"]});
    for(const c of q.ans.slice(0,-1))await p.keyboard.press(c);
    await key(scr,"the keyboard: the last digit",q.ans.slice(-1),{root:R,want:async()=>[(await typed())===q.ans,"shows "+q.ans]});
    await key(scr,"the keyboard: Enter","Enter",{root:R,want:()=>E(()=>document.querySelector("#jQ .jshow").classList.contains("right"))});
  }
  async function pathSweep(scr,q){
    const first=q.ans[0],c0=await coins();let k=0;
    for(const d of ["U","L","D","R"].filter(x=>x!==first)){
      const n=k++;
      await act(scr,`the ${NAME[d]} arrow (not the way)`,()=>tapArrow(d),{root:R,want:async()=>{const m=await msg();
        const h=await E(f=>!!document.querySelector(`#jQ .jarrow.hint[data-dir="${f}"]`)&&!!document.querySelector("#jQ .jcell.next"),first);
        return n===0?[/waits a moment/.test(m)&&!h&&(await coins())===c0,`“${m}”`]:[/glows/.test(m)&&h,`“${m}”, the way glows`];}});
      await wait(100);}
    // a square that is not next to the mower does nothing
    const far=await E(()=>{const m=document.querySelector("#jQ .jcell.me"),c=+m.dataset.c,r=+m.dataset.r;
      const f=[...document.querySelectorAll("#jQ .jcell")].find(b=>Math.abs(+b.dataset.c-c)+Math.abs(+b.dataset.r-r)>=3);return f?f.dataset.c+","+f.dataset.r:null;});
    if(far)await tapEl(scr,"a square far from the mower",f=>document.querySelector(`#jQ .jcell[data-c="${f.split(",")[0]}"][data-r="${f.split(",")[1]}"]`),far,{root:R,inert:true});
    let at=(await me()).split(",").map(Number);
    for(let i=0;i<q.ans.length;i++){
      const d=q.ans[i],nx=[at[0]+STEP[d][0],at[1]+STEP[d][1]],want=async()=>[(await me())===nx.join(",")||!!(await E(()=>document.querySelector("#jQ .jlawn.done"))),"at "+(await me())];
      if(i===0)await act(scr,`the ${NAME[d]} arrow (the way)`,()=>tapArrow(d),{root:R,want});
      else if(i===1)await tapEl(scr,"the square next to the mower",xy=>document.querySelector(`#jQ .jcell[data-c="${xy[0]}"][data-r="${xy[1]}"]`),nx,{root:R,want});
      else if(i===2)await key(scr,`the keyboard: ${KEY[d]}`,KEY[d],{root:R,want});
      else await key(scr,`the keyboard: ${WASD[d].slice(3)} (WASD)`,WASD[d],{root:R,want});
      at=nx;}
  }
  async function orderSweep(scr,q){
    const A=q.ans.split("|"),c0=await coins();
    await act(scr,`a card (${A[1]}) into the first place`,()=>tapCard(A[1]),{root:R,want:async()=>{const s=await slots();return[s[0]===A[1],s.join(" | ")];}});
    await act(scr,"the placed card, tapped: back with the others",()=>K.tapFn(v=>document.querySelector(`#jQ .jorow .jocard[data-w="${CSS.escape(v)}"]`),A[1]),{root:R,
      want:async()=>{const s=await slots();return[s.every(x=>!x),s.join(" | ")];}});
    await act(scr,"✓ with places still empty",tapCheck,{root:R,want:async()=>[(await S()).task.miss===q.miss,"no miss"]});
    for(let k=0;k<2;k++){
      for(const v of A.slice().reverse())if((await slots()).indexOf(v)<0)await tapCard(v);
      await act(scr,k?"✓ in the wrong order again":"✓ in the wrong order",tapCheck,{root:R,want:async()=>{const m=await msg(),s=await slots(),c=await coins();
        const keep=s.every((v,i)=>!v||v===A[i]);
        const h=await E(()=>!!document.querySelector("#jQ .jopool .jocard.hint"));
        return k?[/glows/.test(m)&&h&&keep&&c===c0,`“${m}”, the next card glows`]:[/waits a moment/.test(m)&&keep&&c===c0,`“${m}”, the right ones stay: ${s.join(" | ")}`];}});
      await wait(150);}
    // the rest from the keyboard: arrows to a card, Space puts it in the next place, Enter checks
    const cur=()=>E(()=>{const c=document.querySelector("#jQ .jocard.cur");return c?c.dataset.w:null;});
    await key(scr,"the keyboard: ArrowRight (a cursor on the cards)","ArrowRight",{root:R,want:async()=>[!!(await cur()),"on "+(await cur())]});
    for(const v of A){const s=await slots(),i=A.indexOf(v);if(s[i]===v)continue;
      for(let t=0;t<8&&(await cur())!==v;t++)await p.keyboard.press("ArrowRight");
      await key(scr,`the keyboard: Space (${v})`,"Space",{root:R,want:async()=>[(await slots()).indexOf(v)>=0,(await slots()).join(" | ")]});}
    await key(scr,"the keyboard: Enter (check)","Enter",{root:R,want:()=>E(()=>!!document.querySelector("#jQ .jorder.right"))});
  }
  // a quick right answer by touch; the last tap of the step is the one reported
  const RIGHT={pick:"#jQ .jopt.right",pad:"#jQ .jshow.right",path:"#jQ .jlawn.done",order:"#jQ .jorder.right"};
  const isRight=k=>()=>E(s=>[!!document.querySelector(s),"marked right"],RIGHT[k]);
  async function right(scr,q){
    const o={root:R,want:isRight(q.kit)};
    if(q.kit==="pick")return act(scr,`the right answer (${q.ans})`,()=>tapOpt(q.ans),o);
    if(q.kit==="pad"){for(const c of q.ans)await tapKey(c);return act(scr,`✓ (${q.ans})`,()=>tapKey("ok"),o);}
    if(q.kit==="path"){for(const d of q.ans.slice(0,-1))await tapArrow(d);return act(scr,`the last arrow (${q.ans})`,()=>tapArrow(q.ans.slice(-1)),o);}
    if(q.kit==="order"){const A=q.ans.split("|");for(let i=0;i<A.length;i++){const s=await slots();if(s[i]===A[i])continue;if(s.indexOf(A[i])>=0)continue;await tapCard(A[i]);}
      return act(scr,`✓ (${A.join(" < ")})`,tapCheck,o);}
    return T.fail(`${A} · ${scr}: no kit ${q.kit}`);
  }
  // every step of the task on screen; sweep says which step gets which sweep
  async function task(scr,sweep){
    const s0=await S(),n0=s0.n;
    for(let i=0;i<s0.task.steps;i++){
      const q=await step(i);if(!q)return T.fail(`${A} · ${scr}: step ${i+1} never came`);
      const sw=sweep&&sweep[i];
      if(i===0&&!sw)await clip(scr+` (${q.kit})`,R);
      if(sw==="pick")await pickSweep(scr,q);else if(sw==="pad")await padSweep(scr,q);else if(sw==="padkeys")await padKeys(scr,q);
      else if(sw==="path")await pathSweep(scr,q);else if(sw==="order")await orderSweep(scr,q);else await right(scr,q);
      if(sw)await clip(scr+` (${q.kit}, after its sweep)`,R);
      const moved=await waitFor(p,([n,i])=>{const s=Jobs._S();return s&&(s.n>n||(s.task&&s.task.i>i));},{arg:[n0,i],timeout:6000});
      if(!moved)return T.fail(`${A} · ${scr}: the task did not go on after step ${i+1}`);
    }
    return true;
  }
  const ready=()=>waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&h&&h.dataset.ans;},{timeout:8000});

  // ---- 1. the Job board at reading level 2: the Shopkeeper open, the other three locked ----
  if(lane===1){
  await tapSel("Job board","💼 in the dock","#jobsBtn",{root:R,swap:true,want:()=>E(n=>[Modes.top()==="job"&&document.querySelectorAll("#ovJob.on .jcard").length===n,"mode "+Modes.top()],JOBS.length)});
  await clip("Job board",R);
  const cards=await E(()=>[...document.querySelectorAll("#ovJob .jcard")].map((c,i)=>({i,job:c.dataset.job||"",locked:c.classList.contains("locked"),name:c.querySelector("b").textContent,open:(c.querySelector(".jopen")||{}).textContent||""})));
  ok(cards.filter(c=>!c.locked).map(c=>c.job).join()==="shop"&&cards.filter(c=>c.locked).length===3,`${A} · Job board at level 2: the Shopkeeper is open, three locked: `+cards.map(c=>c.name+(c.locked?" ("+c.open+")":"")).join(", "));
  for(const c of cards.filter(c=>c.locked)){const j=JOBS.find(x=>x.name===c.name);
    await tapEl("Job board",`the locked ${c.name} card`,i=>document.querySelectorAll("#ovJob .jcard")[i],c.i,{root:R,inert:true,
      want:async()=>[c.open==="Opens at level "+j.tier&&await E(()=>Modes.top()==="job"),`it says “${c.open}”`]});}
  await tapSel("Job board","✕","#jX",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")===""&&!document.querySelector(".overlay.on"),"back in the valley"])});

  }

  // ---- 2. every job at reading level 4, through every job level: 5 tasks each, a level up after each of the first four ----
  await E(()=>{state.settings.tierOverride=4;});
  const SWEEP={"shop:1":["pick"],"shop:2":[null,"pad"],"shop:3":[null,"padkeys"],"mow:1":["path"],"mail:4":[null,"order"],"baker:1":[null]};
  // if a job's run goes wrong, it says so once and the next job starts from the valley
  const recover=()=>E(()=>{try{if(Jobs._S())Jobs.clockOut();Jobs.close();}catch(e){}document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));});
  const mine=JOBS.filter(j=>(lane===1?["shop","mow"]:["mail","baker"]).indexOf(j.id)>=0);
  for(const [ji,j] of mine.entries())try{await (async()=>{
    const scr=j.name;
    await E(id=>{state.jobs.xp[id]=4;state.jobs.streak=0;state.jobs.current=null;},j.id);
    await tapSel(scr,"💼 in the dock","#jobsBtn",{root:R,swap:true,want:()=>E(()=>!!document.querySelector("#ovJob.on .jcards"))});
    await tapSel(scr,"its card on the Job board",`#ovJob .jcard[data-job="${j.id}"]`,{root:R,swap:true,want:()=>E(([n,u])=>{const o=document.getElementById("ovJob"),un=o.querySelector(".juni");
      return[o.querySelector("h2").textContent.indexOf(n)>=0&&!!o.querySelector("#jIn")&&!!un&&un.dataset.from==="job"&&o.textContent.indexOf("You put on your "+u+"!")>=0,
        `the clock-in screen: “You put on your ${u}!”, the job's own uniform (${un&&un.textContent})`];},[j.name,j.uni])});
    if(!ji)await clip(scr+" · clock-in screen",R);
    await tapSel(scr,"‹ Jobs","#jBack",{root:R,swap:true,want:()=>E(()=>!!document.querySelector("#ovJob .jcards"))});
    await p.tap(`#ovJob .jcard[data-job="${j.id}"]`,{timeout:5000});await waitFor(p,"#jIn");
    await tapSel(scr,"⏰ Clock in","#jIn",{root:R,swap:true,want:()=>E(id=>[state.jobs.current===id&&document.getElementById("jobsBadge").classList.contains("on"),"clocked in, ⏰ on the dock button"],j.id)});
    await ready();
    await tapSel(scr,"🔊 hear it again","#jQ .jhear",{root:R,want:async()=>{const t=await E(()=>document.querySelector("#jQ .jsay").firstChild.textContent.trim());
      return[(await said()).slice(-1)[0]===t,"said “"+t+"”"];}});
    let tips=0,paid=0;
    for(let L=1;L<=5;L++){
      const t=j.tasks[Math.min(L,j.tasks.length)-1],lscr=`${scr} · job level ${L} (${t.name})`;
      const tip=L===5;
      await E(([id,xp,ty,st])=>{state.jobs.xp[id]=xp;state.jobs.streak=st;Jobs._next(ty);},[j.id,L<5?LV[L]-1:LV[4],t.id,tip?4:0]);
      await ready();
      const lv=await E(()=>document.getElementById("jLv").textContent);
      ok(lv==="⭐ Level "+L,`${A} · ${lscr}: the shift says “${lv}”`);
      const c0=await coins(),x0=await E(id=>state.jobs.xp[id],j.id);
      const done=await task(lscr,SWEEP[j.id+":"+L]);
      if(done!==true)continue;
      const pay=j.pay.perTask+(tip?j.pay.streakTip:0);
      const got=await waitFor(p,([c,p])=>state.mine.coins>=c+p?state.mine.coins-c:false,{arg:[c0,pay],timeout:3000});
      ok(got===pay&&await E(([id,x])=>state.jobs.xp[id]===x+1,[j.id,x0]),`${A} · ${lscr}: the task pays ${got} 🪙 (pay ${j.pay.perTask}${tip?" + a "+j.pay.streakTip+" 🪙 tip for five in a row":""}), one XP`);
      paid+=pay;if(tip)tips++;
      if(L<5){
        const mo=await waitFor(p,()=>document.getElementById("jGo")&&document.querySelector("#jQ .jmoment").textContent.replace(/\s+/g," ").trim(),{timeout:5000});
        const nt=j.tasks.find(x=>x.lv===L+1);
        ok(mo&&mo.indexOf(`${j.name} level ${L+1}!`)>=0&&(nt?mo.indexOf("New: "+nt.name)>=0:/new badge/.test(mo)),`${A} · ${lscr}: the level-up moment: “${mo}”`);
        const pop=await waitFor(p,([n,l,nm])=>state.badges.indexOf("job_"+n+"_"+l)>=0&&[...document.querySelectorAll(".badge-pop")].map(b=>b.textContent).find(t=>t.indexOf(nm+" level "+l)>=0),{arg:[j.id,L+1,j.name],timeout:5000});
        ok(pop&&pop.indexOf(`${j.name} level ${L+1}`)>=0,`${A} · ${lscr}: the badge lands: “${pop}”`);
        if(L===1&&!ji)await clip(scr+" · level-up moment",R);
        await tapSel(`${scr} · a moment`,L===1?"Keep going ▶":`Keep going ▶ (level ${L+1})`,"#jGo",{root:R,swap:true,want:()=>ready()});
      }else{
        const saidTip=await waitFor(p,()=>window.__h.said.indexOf("Five in a row! Here is a tip!")>=0,{timeout:3000});
        ok(saidTip&&(await K.toasts()).some(x=>x===`+${j.pay.perTask} 🪙 and a tip! +${j.pay.streakTip} 🪙`),`${A} · ${lscr}: five right in a row: “Five in a row! Here is a tip!” and its toast`);
        const mo=await waitFor(p,()=>document.getElementById("jStop")&&document.querySelector("#jQ .jmoment").textContent.replace(/\s+/g," ").trim(),{timeout:6000});
        ok(mo&&/5 tasks done!/.test(mo)&&/Keep going or clock out\?/.test(mo),`${A} · ${scr}: after five tasks: “${mo}”`);
        await tapSel(`${scr} · a moment`,"⏰ Clock out","#jStop",{root:R,swap:true,want:async()=>{const t=await E(()=>document.querySelector("#ovJob .sheet").textContent.replace(/\s+/g," ").trim());
          return[t.indexOf("Great work today!")>=0&&t.indexOf(`5 tasks · +${paid} 🪙`)>=0&&t.indexOf(`🎉 ${tips} tip`)>=0&&await E(()=>state.jobs.current===null),"the summary: "+t.slice(0,80)];}});
        if(!ji)await clip(scr+" · clock-out summary",R);
      }
    }
    if(ji<mine.length-1){
      await tapSel(`${scr} · summary`,"💼 Job board","#jBoard",{root:R,swap:true,want:()=>E(()=>!!document.querySelector("#ovJob .jcards"))});
      await tapSel(`${scr} · Job board`,"✕","#jX",{root:R,swap:true,want:()=>E(()=>Modes.stack().join(">")==="")});
    }else await tapSel(`${scr} · summary`,"🏡 Back to the valley","#jHome",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")===""&&!document.getElementById("jobsBadge").classList.contains("on"),"the valley, no ⏰"])});
  })();}catch(e){T.fail(`${A} · ${j.name}: the run broke off: ${String(e&&e.message||e).slice(0,160)}`);await recover();}

  // ---- 3. the Trading Post's uniform and tool at the job: shown, said once, and the tip a task sooner ----
  if(lane===2){
  await E(()=>{state.owned=Object.assign(state.owned||{},{apron:1,scanner:1});state.jobs.xp.shop=50;state.jobs.streak=0;});
  await p.tap("#jobsBtn",{timeout:5000});await waitFor(p,'#ovJob.on .jcard[data-job="shop"]');
  await tapSel("Shopkeeper with his gear","its card",`#ovJob .jcard[data-job="shop"]`,{root:R,want:()=>E(()=>{const u=document.querySelector("#ovJob .juni");
    return[!!u&&u.dataset.from==="store"&&u.dataset.uni==="apron"&&!!u.querySelector("svg")&&/You put on your apron!/.test(document.getElementById("ovJob").textContent)&&
      /4 right in a row: a tip of 5 🪙/.test(document.getElementById("ovJob").textContent),"the Trading Post's apron, and “4 right in a row”"];})});
  await tapSel("Shopkeeper with his gear","⏰ Clock in","#jIn",{root:R,swap:true,want:async()=>{const r=await E(()=>({tool:!!document.querySelector('#ovJob .bhead .jtool[data-tool="scanner"] svg'),
    ready:(document.getElementById("jReady")||{}).textContent||""}));return[r.tool&&/Your price scanner is ready! Tips come sooner\./.test(r.ready)&&(await said()).indexOf("Your price scanner is ready!")>=0,`the scanner beside him, “${r.ready}”`];}});
  await ready();
  // a double tap on the right answer pays once
  await E(()=>{state.jobs.streak=0;Jobs._next("order");});await ready();
  let q=await step(0),c0=await coins();
  const xy=await K.centre(v=>[...document.querySelectorAll("#jQ .jopt")].find(b=>b.dataset.w===v),q.ans);
  await act("Shopkeeper with his gear","a double tap on the right answer",()=>K.dbl(xy[0],xy[1],90),{root:R,swap:true});
  await waitFor(p,n=>Jobs._S().n>n,{arg:(await S()).n,timeout:4000});await wait(900);
  ok((await coins())===c0+3,`${A} · Shopkeeper with his gear · a double tap on the right answer pays once: +${(await coins())-c0} 🪙`);
  // with the scanner, four right first time in a row make a tip
  await ready();
  await E(()=>{state.jobs.streak=3;Jobs._next("order");});await ready();
  c0=await coins();q=await step(0);
  await right("Shopkeeper with his gear",q);
  const tipd=await waitFor(p,c=>state.mine.coins>=c+8,{arg:c0,timeout:4000});
  ok(tipd&&(await coins())===c0+8&&await waitFor(p,()=>window.__h.said.indexOf("Four in a row! Here is a tip!")>=0,{timeout:3000}),`${A} · Shopkeeper with his gear: four in a row pay 3 + a 5 🪙 tip (“Four in a row! Here is a tip!”)`);
  await ready();
  await tapSel("Shopkeeper with his gear","⏰ Clock out in the header","#jOut",{root:R,swap:true,want:()=>E(()=>[!!document.getElementById("jHome")&&state.jobs.current===null,"the summary"])});
  await tapSel("Shopkeeper with his gear","🏡 Back to the valley","#jHome",{root:R,swap:true,want:()=>E(()=>Modes.stack().join(">")==="")});

  }

  // ---- 4. the ghost tap: a double tap on ⏰ Clock in or Keep going must not answer what comes up under the finger ----
  if(lane===1)
  for(const id of ["shop","mail"]){
    const j=JOBS.find(x=>x.id===id);let q;
    await E(i=>{state.jobs.xp[i]=4;state.jobs.streak=0;},id);
    await p.tap("#jobsBtn",{timeout:5000});await waitFor(p,`#ovJob.on .jcard[data-job="${id}"]`);await p.tap(`#ovJob .jcard[data-job="${id}"]`,{timeout:5000});await waitFor(p,"#jIn");await wait(300);
    const at=await K.centre(()=>document.getElementById("jIn"));
    await act(`${j.name} · ghost tap`,"a double tap on ⏰ Clock in",()=>K.dbl(at[0],at[1]),{root:R,swap:true,want:async()=>{await wait(250);
      const r=await E(()=>({s:Jobs._S(),hit:document.querySelectorAll("#jQ .right,#jQ .wrong").length,m:document.getElementById("jMsg").textContent}));
      return[!!r.s&&!!r.s.task&&r.s.task.miss===0&&!r.hit&&!r.m,`the first question is left for him (miss ${r.s&&r.s.task&&r.s.task.miss}, “${r.m}”)`];}});
    // a level up, then a double tap on Keep going
    q=await step(0);await right(`${j.name} · ghost tap`,q);
    await waitFor(p,()=>{const s=Jobs._S();return s&&(s.n>0||(s.task&&s.task.i>0));},{timeout:5000});
    const st=await S();if(st.task&&st.task.i>0){q=await step(st.task.i);await right(`${j.name} · ghost tap`,q);}
    await waitFor(p,"#jGo",{timeout:6000});await wait(200);
    const go=await K.centre(()=>document.getElementById("jGo"));
    await act(`${j.name} · ghost tap`,"a double tap on Keep going ▶",()=>K.dbl(go[0],go[1]),{root:R,swap:true,want:async()=>{await wait(250);
      const r=await E(()=>({s:Jobs._S(),hit:document.querySelectorAll("#jQ .right,#jQ .wrong").length,m:document.getElementById("jMsg").textContent}));
      return[!!r.s&&!!r.s.task&&r.s.task.miss===0&&!r.hit&&!r.m,`the next question is left for him (miss ${r.s&&r.s.task&&r.s.task.miss}, “${r.m}”)`];}});
    await E(()=>document.getElementById("jOut").click());await waitFor(p,"#jHome");await E(()=>document.getElementById("jHome").click());await wait(200);
  }


  // ---- 5. the Job board signpost in Adventure: it opens on top of Adventure and closes back to it ----
  if(lane===2){
  await p.tap("#advBtn",{timeout:5000});await waitFor(p,()=>Modes.top()==="adventure");
  await waitFor(p,".tile.spot.jboard",{timeout:10000});
  await E(()=>{state.critters.forEach(c=>{c.out=false;});(state.vehicles||[]).forEach(v=>{v.out=false;});const b=Jobs.boardAt();Adv._P.c=b.c;Adv._P.r=b.r;});
  await waitFor(p,()=>/Job board/.test(document.getElementById("advAct").textContent),{timeout:8000});
  await tapSel("Adventure","💼 Job board (the action button at the signpost)","#advAct",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure>job",Modes.stack().join(">")])});
  await tapSel("Adventure","✕ on the Job board","#jX",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure","back to "+Modes.stack().join(">")])});
  await E(()=>Adv.exit());await wait(200);

  }

  ok(!errs.length,`${A} (lane ${lane}): no page or console errors`+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  K.summary();await close();
}

/* =====================================================================================================================
   THE TRADING POST: both shelves and every card (its picture, its button), the Swap tab both ways, the HUD purse, the
   Wardrobe's and the clothes tent's lines to it, and the stall in Adventure
   ===================================================================================================================== */
async function storeArea(){
  const A="Trading Post";
  // gems but no coins yet (so no Swap tab); 15 Shopkeeper and 5 mowing tasks: the apron, the scanner and the gloves are open
  const {page:p,errs,close,E}=await launch({viewport:VP,seed:{guardians:[0,1,2],gems:60,hats:["flower"],hat:"flower",settings:{goal:0},mine:{coins:0},
    jobs:{current:null,xp:{shop:15,mow:5},tasks:20,streak:0}}});
  const K=kit(A,p,errs,E),{tapSel,tapEl,wait,said,clip}=K;
  await K.hook();await K.tidy();
  const R="#ovStore";
  const purse=()=>E(()=>({g:state.gems,c:state.mine.coins}));
  const hudOk=async()=>{const q=await purse(),h=await E(()=>document.getElementById("storePurse").textContent);return[h===`💎 ${q.g} · 🪙 ${q.c}`,"🏪 shows “"+h+"”"];};
  const msg=()=>E(()=>document.getElementById("stMsg").textContent);
  const cards=()=>E(()=>[...document.querySelectorAll("#stGrid .stcard")].map(c=>{const b=c.querySelector("button");
    return{id:c.dataset.id,cost:c.querySelector(".cost").textContent.trim(),locked:c.classList.contains("locked"),worn:c.classList.contains("worn"),owned:c.classList.contains("owned"),
      rib:!!c.querySelector(".rib"),use:(c.querySelector(".use")||{}).textContent||"",act:b?b.dataset.act:"",btn:b?b.textContent:"",off:!!(b&&b.disabled)};}));
  const item=(sh,id)=>E(([s,i])=>{const it=Store.get(s,i),j=it.unlock&&Store.JOBS[it.unlock.job];
    return{price:it.price,purse:it.purse,name:it.name,wear:it.wear||"",tag:it.tag,lv:it.unlock&&it.unlock.level,job:j?j.ic+" "+j.name:""};},[sh,id]);
  const owns=(sh,id)=>E(([s,i])=>Store.owns(Store.get(s,i)),[sh,id]);
  const cardSel=id=>`#stGrid .stcard[data-id="${id}"]`;
  // the buttons share a 600 ms lock against double taps: the next one waits it out
  let lastBtn=0;const gap=async()=>{const d=Date.now()-lastBtn;if(d<700)await wait(700-d);};
  const words=(P,n)=>n+" "+(n===1?(P==="gems"?"gem":"coin"):P);

  // ---- 1. the 🏪 button: the Trading Post, the Swap tab hidden while he has only gems ----
  ok((await hudOk())[0],`${A} · the 🏪 button shows both purses: ${(await hudOk())[1]}`);
  await tapSel("Trading Post","🏪 in the dock","#storeBtn",{root:R,swap:true,want:async()=>{const r=await E(()=>({top:Modes.top(),swap:getComputedStyle(document.getElementById("stSwapTab")).display,shelf:Store.shelf}));
    return[r.top==="store"&&r.swap==="none"&&r.shelf==="outfit"&&(await said()).indexOf("Welcome to the Trading Post!")>=0,`mode ${r.top}, the 💎 shelf, no Swap tab yet, “Welcome to the Trading Post!”`];}});
  await clip("💎 Outfits",R);

  // ---- 2. every card on a shelf: its picture says its name (and the price while it is not his), then its button ----
  async function sweep(sh,scr){
    for(const c0 of await cards()){
      const it=await item(sh,c0.id),c=(await cards()).find(x=>x.id===c0.id);
      const line=c.owned?it.name:it.name+" "+words(it.purse,it.price);
      await tapEl(scr,`the ${it.name} picture`,s=>document.querySelector(s+" .art"),cardSel(c.id),{root:R,
        want:async()=>{const l=(await said()).slice(-1)[0];return[l===line,`says “${l}”`];}});
      if(c.rib)await tapEl(scr,`the ${it.name} “New!” ribbon`,s=>document.querySelector(s+" .rib"),cardSel(c.id),{root:R,inert:true});
      if(!c.act){ok(c.owned&&/Yours/.test(c.cost),`${A} · ${scr} · the ${it.name}: his, no button (${c.cost}${c.use?" · "+c.use:""})`);continue;}
      if(c.off){await tapEl(scr,`the ${it.name} “${c.btn}” (greyed: he has it on)`,s=>document.querySelector(s+" button"),cardSel(c.id),{root:R,inert:true});continue;}
      await gap();
      const p0=await purse();
      const P=it.purse==="gems"?"g":"c",ic=it.purse==="gems"?"💎":"🪙";
      await tapEl(scr,`the ${it.name} “${c.btn}”`,s=>document.querySelector(s+" button"),cardSel(c.id),{root:R,want:async()=>{
        const q=await purse(),m=await msg(),l=(await said()).slice(-1)[0],h=await E(()=>({hat:state.hat,helmet:state.mine.look.helmet})),hud=await hudOk();
        if(c.act==="locked")return[/^🔒/.test(m)&&m.indexOf(`${it.job} level ${it.lv} opens it.`)>=0&&l==="Keep working at your job to unlock it!"&&q.g===p0.g&&q.c===p0.c,`“${m}”, nothing taken`];
        if(c.act==="off")return[h.hat===null,"taken off"];
        if(c.act==="wear")return[it.wear==="hat"?h.hat===c.id:h.helmet===c.id,"on "+(it.wear==="hat"?"the buddy":"the miner")];
        if(p0[P]>=it.price){const said1=it.wear==="hat"?"How do I look?":it.wear==="helmet"?"Your miner has a new hat!":"It's yours!";
          return[q[P]===p0[P]-it.price&&(P==="g"?q.c===p0.c:q.g===p0.g)&&await owns(sh,c.id)&&m===`🎉 You got the ${it.name.toLowerCase()}!`&&l===said1&&hud[0]&&
            (!it.wear||(it.wear==="hat"?h.hat===c.id:h.helmet===c.id)),`${it.price} ${ic} taken once, “${m}”, “${l}”, ${hud[1]}`];}
        const need=it.price-p0[P];
        return[q.g===p0.g&&q.c===p0.c&&m===`Almost! ${need} more ${ic}.`&&l===`Almost! ${need} more ${need===1?(P==="g"?"gem":"coin"):(P==="g"?"gems":"coins")}`,`“${m}”, “${l}”, nothing taken`];}});
      lastBtn=Date.now();
    }
  }
  await sweep("outfit","💎 Outfits");
  await gap();
  await tapSel("🪙 Gear","the 🪙 Gear tab",'#ovStore [data-shelf="gear"]',{root:R,want:()=>E(()=>[Store.shelf==="gear"&&document.querySelector('#ovStore [data-shelf="gear"]').classList.contains("on"),"the 🪙 shelf"])});
  await clip("🪙 Gear",R);
  await sweep("gear","🪙 Gear (no coins)");
  // coins from the Mine: the 🏪 button shows them, and he has held both purses, so the Swap tab comes
  await E(()=>{state.mine.coins=200;renderHUD();});
  ok((await hudOk())[0]&&await E(()=>state.exchangeSeen===true),`${A} · coins arrive: ${(await hudOk())[1]}, and he has now held gems and coins at once`);
  await gap();
  await tapSel("🪙 Gear","the 🪙 Gear tab again",'#ovStore [data-shelf="gear"]',{root:R,want:()=>E(()=>[getComputedStyle(document.getElementById("stSwapTab")).display!=="none","the 🔄 Swap tab is there"])});
  for(const id of ["apron","scanner","gloves","viking","cap"]){
    await gap();
    const it=await item("gear",id),c=(await cards()).find(x=>x.id===id);
    if(!c||!c.act)continue;
    await tapEl("🪙 Gear (with coins)",`the ${it.name} “${c.btn}”`,s=>document.querySelector(s+" button"),cardSel(id),{root:R,want:async()=>{const n=(await cards()).find(x=>x.id===id),o=await owns("gear",id);
      return[o&&(it.tag==="uniform"?n.use==="Worn at the Job board"&&!n.act:it.tag==="tool"?n.use==="Used at the Job board. Tips come sooner!"&&!n.act:it.wear==="helmet"?await E(i=>state.mine.look.helmet===i,id):true),
        `now: ${n.cost}${n.use?" · "+n.use:""}${n.act?" · "+n.btn:""}`];}});
    lastBtn=Date.now();
  }
  await sweep("gear","🪙 Gear (with coins)");

  // ---- 3. the Swap tab: − and + move whole bundles, the sum is always shown, Swap! both ways, the purse never below 0 ----
  await gap();
  await tapSel("🔄 Swap","the 🔄 Swap tab","#stSwapTab",{root:R,want:()=>E(()=>[document.querySelectorAll("#stSwap .stswap").length===2,"two rows: 🪙 → 💎 and 💎 → 🪙"])});
  await clip("🔄 Swap",R);
  const row=f=>`#stSwap .stswap[data-from="${f}"]`,sumOf=f=>E(s=>document.querySelector(s+" [data-sum]").textContent,row(f));
  const btnOff=(f,d)=>E(s=>document.querySelector(s).disabled,`${row(f)} [data-d="${d}"]`);
  for(const f of ["coins","gems"]){
    const U=f==="coins"?5:1,to=f==="coins"?"💎":"🪙",fi=f==="coins"?"🪙":"💎",n1=f==="coins"?1:5;
    ok(await sumOf(f)===`${U} ${fi} → ${n1} ${to}`&&await btnOff(f,-1),`${A} · 🔄 Swap · ${fi} → ${to}: starts at one bundle, “${await sumOf(f)}”, − greyed`);
    await tapEl("🔄 Swap",`${fi} → ${to} −, greyed at one bundle`,s=>document.querySelector(s),`${row(f)} [data-d="-1"]`,{root:R,inert:true});
    await tapEl("🔄 Swap",`${fi} → ${to} +`,s=>document.querySelector(s),`${row(f)} [data-d="1"]`,{root:R,want:async()=>{const t=await sumOf(f);return[t===`${2*U} ${fi} → ${2*n1} ${to}`,"“"+t+"”"];}});
    await tapEl("🔄 Swap",`${fi} → ${to} −`,s=>document.querySelector(s),`${row(f)} [data-d="-1"]`,{root:R,want:async()=>{const t=await sumOf(f);return[t===`${U} ${fi} → ${n1} ${to}`,"“"+t+"”"];}});
    await gap();
    const q0=await purse();
    await tapEl("🔄 Swap",`${fi} → ${to} Swap!`,s=>document.querySelector(s),`${row(f)} [data-go]`,{root:R,want:async()=>{const q=await purse(),m=await msg(),l=await said(),hud=await hudOk();
      const want=f==="coins"?{g:q0.g+1,c:q0.c-5}:{g:q0.g-1,c:q0.c+5},line=f==="coins"?"5 coins make 1 gem":"1 gem makes 5 coins";
      return[q.g===want.g&&q.c===want.c&&m===`✓ ${U} ${fi} → ${n1} ${to}`&&l.slice(-1)[0]===line&&hud[0],`${J(q0)} → ${J(q)}, “${m}”, said “${l.slice(-1)[0]}”, ${hud[1]}`];}});
    lastBtn=Date.now();
  }
  // whole bundles: 12 coins are two bundles, and + stops there
  await E(()=>{state.mine.coins=12;renderHUD();});await gap();
  await tapSel("🔄 Swap","the 🔄 Swap tab (12 🪙)","#stSwapTab",{root:R,inert:true,want:async()=>[await sumOf("coins")==="5 🪙 → 1 💎","“"+await sumOf("coins")+"”"]});
  await tapEl("🔄 Swap","🪙 → 💎 + (12 🪙)",s=>document.querySelector(s),`${row("coins")} [data-d="1"]`,{root:R,want:async()=>[await sumOf("coins")==="10 🪙 → 2 💎"&&await btnOff("coins",1),"“10 🪙 → 2 💎”, + greyed: whole bundles only"]});
  await tapEl("🔄 Swap","🪙 → 💎 +, greyed at what he has",s=>document.querySelector(s),`${row("coins")} [data-d="1"]`,{root:R,inert:true});
  // the refusal: coins that are not a whole bundle (only a call can ask for them; the counter only offers bundles)
  const q7=await purse(),r7=await E(()=>Store.swap("coins",7));
  ok(r7.why==="bundle"&&J(await purse())===J(q7)&&/Coins swap in fives/.test(await msg())&&(await said()).slice(-1)[0]==="Coins swap in fives.",`${A} · 🔄 Swap: 7 🪙 are refused kindly (“${await msg()}”), nothing moves`);
  // never below 0: 3 coins can't make a bundle, no gems can't make coins
  await E(()=>{state.mine.coins=3;state.gems=0;renderHUD();Store.open("swap");});await gap();
  for(const f of ["coins","gems"]){
    const q0=await purse(),need=f==="coins"?"Almost! 2 more 🪙.":"Almost! 1 more 💎.";
    await tapEl("🔄 Swap",`${f==="coins"?"🪙 → 💎":"💎 → 🪙"} Swap! with too few`,s=>document.querySelector(s),`${row(f)} [data-go]`,{root:R,want:async()=>{const q=await purse(),m=await msg();
      return[J(q)===J(q0)&&m===need&&q.c>=0&&q.g>=0,`“${m}”, nothing moves (${J(q)})`];}});
    lastBtn=Date.now();await gap();
  }
  await tapSel("🔄 Swap","Done","#stClose",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")===""&&!document.querySelector(".overlay.on"),"back in the valley"])});

  // ---- 4. the Wardrobe (sticker book) and the Mine's clothes tent point here ----
  await E(()=>{state.gems=40;state.mine.coins=40;renderHUD();});
  await tapSel("Wardrobe","📖 in the dock","#albumBtn",{root:"#ovAlbum",swap:true,want:()=>E(()=>Modes.top()==="album")});
  await tapSel("Wardrobe","the Wardrobe tab",'[data-atab="hats"]',{root:"#ovAlbum",want:()=>E(()=>[!!document.querySelector("#albumGrid .storemore"),"the outfits he owns, and “Get more at the Trading Post 🏪”"])});
  const worn=await E(()=>state.hat);
  await tapSel("Wardrobe","an outfit's Wear it / Take off",'#albumGrid .hatcard button',{root:"#ovAlbum",want:()=>E(w=>[state.hat!==w,"state.hat "+w+" → "+state.hat],worn)});
  await tapSel("Wardrobe","🏪 Go to the Trading Post","#albumGrid .storemore button",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="store"&&Store.shelf==="outfit","the Trading Post, on the 💎 shelf ("+Modes.stack().join(">")+")"])});
  await tapSel("Wardrobe","Done in the Trading Post","#stClose",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="","closes to the "+Modes.top()+" (the sticker book was put away when the Trading Post opened)"])});
  await p.tap("#mineBtn",{timeout:5000});await waitFor(p,()=>Modes.top()==="mine",{timeout:8000});await wait(900);
  await E(()=>Mine._openWardrobe(false));await wait(200);
  ok(await E(()=>/Get more at the Trading Post 🏪/.test((document.querySelector("#mCard .mmore")||{}).textContent||"")),`${A} · the clothes tent says “Get more at the Trading Post 🏪”`);
  await tapEl("Clothes tent","“Get more at the Trading Post 🏪”",()=>document.querySelector("#mCard .mmore"),null,{root:"#mineMode",inert:true,want:()=>E(()=>[Modes.top()==="mine","a line, not a button: it stays in the Mine"])});
  await E(()=>{const b=document.querySelector("#mCard #mClose");if(b)b.click();Mine.exit();});await wait(400);

  // ---- 5. the stall in Adventure: it opens over Adventure and Done goes back to it ----
  await p.tap("#advBtn",{timeout:5000});await waitFor(p,()=>Modes.top()==="adventure");await wait(500);
  const sp=await E(()=>Store._spot());
  await E(s=>{state.critters.forEach(c=>{c.out=false;});(state.vehicles||[]).forEach(v=>{v.out=false;});Adv._P.c=s.c;Adv._P.r=s.r;},sp);
  await waitFor(p,()=>document.getElementById("advAct").textContent==="🏪 Trading Post",{timeout:8000});
  await tapSel("Adventure","🏪 Trading Post (the action button at the stall)","#advAct",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure>store",Modes.stack().join(">")])});
  await tapSel("Adventure","Done","#stClose",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure","back to "+Modes.stack().join(">")])});
  await E(()=>Adv.exit());await wait(200);

  ok(!errs.length,`${A}: no page or console errors`+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  K.summary();await close();
}

/* =====================================================================================================================
   THE FACTORY: the building and the Adventure spot, the level map, the board (every palette button, drag-to-paint by
   touch, tap to turn, erase, ▶ ⏸ ↺ and the double-↺ clear), the keyboard, the order card's 🔊, every level with its known
   solution, the sum on the pad, the result card, his own factory (orders, Next order, Keep building, the daily cap)
   ===================================================================================================================== */
async function factoryArea(){
  const A="Factory";
  const GRID={"6,8":{id:"cottage",seed:3,lv:1},"12,7":{id:"factory",seed:1,lv:1}};
  const {page:p,errs,close,E}=await launch({viewport:VP,seed:{gems:40,settings:{goal:0},guardians:[0,1,2],grid:GRID}});
  const K=kit(A,p,errs,E),{act,tapSel,tapEl,key,wait,said,clip}=K;
  await K.hook();await K.tidy();
  const R="#ovFactory";
  const S=()=>E(()=>Factory._S());
  const gems=()=>E(()=>state.gems);
  const at=(c,r)=>E(([c,r])=>{const b=document.getElementById("fcCv").getBoundingClientRect(),w=Factory._w();return[b.left+(c+.5)*b.width/w.W,b.top+(r+.5)*b.height/w.H];},[c,r]);
  const cellOf=(c,r)=>E(([c,r])=>{const w=Factory._w(),i=r*w.W+c;return{t:w.type[i],d:w.dir[i],f:w.filt[i]};},[c,r]);
  const tapCell=async(c,r)=>{const q=await at(c,r);await K.pace();await p.touchscreen.tap(q[0],q[1]);};
  const dragCells=async cells=>{const pts=[];for(const [c,r] of cells)pts.push(await at(c,r));await K.pace();await K.drag(pts);};
  const code=()=>E(()=>Factory.engine.encode(Factory._w()));
  const tip=()=>E(()=>document.getElementById("fcTip").textContent);
  // the sum on the pad, answered by touch
  const sum=()=>waitFor(p,()=>{const h=document.getElementById("fcQ");return h&&h.dataset.kit==="pad"&&h.dataset.ans;},{timeout:5000});
  const padTap=k=>K.tapFn(k=>document.querySelector(`#fcQ .jkey[data-key="${k}"]`),k);
  async function answerSum(scr,label){const a=await sum();if(!a)return T.fail(`${A} · ${scr}: no sum on the pad`);
    for(const d of a)await padTap(d);
    return act(scr,label||`✓ the sum (${a})`,()=>padTap("ok"),{root:R,want:()=>waitFor(p,()=>!!document.querySelector("#fcDone .fcres"),{timeout:3000})});}
  // run the layout on the board to the end: a real tap on ▶, then the engine at full speed
  async function runIt(scr,label){
    await tapSel(scr,label||"▶ Run","#fcRun",{root:R,want:()=>E(()=>[Factory._S().running&&document.getElementById("fcRun").textContent==="⏸ Pause","running (⏸ Pause)"])});
    const r=await E(()=>{const L=Factory._S().n<=12?Factory.LEVELS[Factory._S().n-1]:null;return Factory._run((L?L.limit:60)*30);});
    return r&&r.done;
  }

  // ---- 1. the building in the valley: the first time it opens straight on level 1 ----
  await E(()=>{bringIntoView(geom(12,7).x);});await wait(600);
  await tapEl("Valley","the Factory building",()=>document.querySelector('#tiles .tile[data-build="factory"] .hitpad')||document.querySelector('#tiles .tile[data-build="factory"]'),null,{root:R,swap:true,
    want:()=>E(()=>{const s=Factory._S();return[Modes.top()==="factory"&&!!s&&s.n===1&&s.view==="board","mode "+Modes.top()+", "+(s&&s.view)+" "+(s&&s.n)];})});
  await clip("level 1 board",R);
  const sc1="level 1 board";
  await tapSel(sc1,"🔊 the order","#fcHear",{root:R,want:async()=>{const l=(await said()).slice(-1)[0];return[/^Send 5 red\.?$/.test(l),"said “"+l+"”"];}});
  for(const t of ["drill","erase","belt"])
    await tapSel(sc1,`the ${t} in the palette`,`.fctool[data-tool="${t}"]`,{root:R,want:()=>E(t=>[Factory._S().tool===t&&document.querySelector(`.fctool[data-tool="${t}"]`).classList.contains("on"),"picked"],t)});
  await p.tap('.fctool[data-tool="drill"]',{timeout:5000});
  await act(sc1,"the board: a drill on the red rock",()=>tapCell(2,4),{root:R,want:async()=>{const c=await cellOf(2,4);return[c.t===2&&c.d===1,`a drill facing the truck ${J(c)}`];}});
  await act(sc1,"the board: a drill on plain ground",()=>tapCell(5,5),{root:R,want:async()=>{const c=await cellOf(5,5);return[c.t===0&&(await E(()=>window.__h.sfx.slice(-1)[0]))==="nope","nothing goes there (a soft no)"];}});
  await p.tap('.fctool[data-tool="belt"]',{timeout:5000});
  await act(sc1,"the board: drag a belt from the drill to the truck",()=>dragCells([[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4]]),{root:R,
    want:async()=>[await code()===await E(()=>Factory.LEVELS[0].sol),"six belts that follow the finger (the known solution)"]});
  await act(sc1,"the board: tap a belt",()=>tapCell(5,4),{root:R,want:async()=>{const c=await cellOf(5,4);return[c.d===2,"it turns (now facing down)"];}});
  for(let k=0;k<3;k++)await tapCell(5,4);
  ok((await cellOf(5,4)).d===1,`${A} · ${sc1}: four taps and the belt faces the truck again`);
  await act(sc1,"the board: drag a corner",()=>dragCells([[4,6],[4,7],[5,7],[6,7]]),{root:R,want:async()=>{const c=[await cellOf(4,6),await cellOf(4,7),await cellOf(5,7)];
    return[c.map(x=>x.t+":"+x.d).join()==="1:2,1:1,1:1","a belt that turns the corner "+J(c)];}});
  await p.tap('.fctool[data-tool="erase"]',{timeout:5000});
  await act(sc1,"the board: erase a belt by a tap",()=>tapCell(4,6),{root:R,want:async()=>[(await cellOf(4,6)).t===0,"gone"]});
  await act(sc1,"the board: erase by a drag",()=>dragCells([[4,7],[5,7],[6,7]]),{root:R,want:async()=>[await code()===await E(()=>Factory.LEVELS[0].sol),"gone, the rest untouched"]});
  await p.tap('.fctool[data-tool="belt"]',{timeout:5000});
  await tapSel(sc1,"▶ Run","#fcRun",{root:R,want:()=>E(()=>[Factory._S().running&&document.getElementById("fcRun").textContent==="⏸ Pause","running"])});
  await waitFor(p,()=>Factory._S().t>30,{timeout:5000});
  await tapSel(sc1,"⏸ Pause","#fcRun",{root:R,want:()=>E(()=>[!Factory._S().running&&document.getElementById("fcRun").textContent==="▶ Run","paused"])});
  await tapSel(sc1,"↺ (after a run): back to the start","#fcClear",{root:R,want:async()=>{const r=await E(()=>({t:Factory._S().t,pieces:Factory._S().pieces}));
    return[r.t===0&&r.pieces===7&&/Back to the start/.test(await tip()),`the pieces stay (${r.pieces}), “${await tip()}”`];}});
  await tapSel(sc1,"↺ (at the start): asks first","#fcClear",{root:R,want:async()=>[(await S()).pieces===7&&/Tap again to take every piece off/.test(await tip()),"“"+await tip()+"”"]});
  await tapSel(sc1,"↺ again: every piece off","#fcClear",{root:R,want:async()=>[(await S()).pieces===0,"an empty board"]});
  await tapSel(sc1,"▶ with no drill","#fcRun",{root:R,want:async()=>[!(await S()).running&&/Put a drill on a rock first/.test(await tip()),"“"+await tip()+"”"]});
  // the known solution, run to the end; the sum: a miss takes nothing, the tally board glows, the second shows the answer
  await E(()=>Factory._load(Factory.LEVELS[0].sol));
  const g0=await gems();
  ok(await runIt(sc1),`${A} · ${sc1}: the known solution meets the order`);
  const a1=await sum();
  const scs="level 1 · the sum";
  for(let k=0;k<2;k++){
    await padTap(String((+a1+1)%10));
    await act(scs,k?"✓ with a wrong number again":"✓ with a wrong number",()=>padTap("ok"),{root:R,want:async()=>{const r=await E(()=>({glow:document.getElementById("fcTally").classList.contains("glow"),
      ghost:document.querySelector("#fcQ .jghost").textContent,ans:document.getElementById("fcQ").dataset.ans,g:state.gems}));
      return k?[r.ghost===a1&&r.g===g0+8,"the answer shows faintly, nothing taken"]:[r.glow&&(await said()).indexOf("The tally board can help!")>=0&&r.ans===a1&&r.g===g0+8,"“The tally board can help!”, the tally board glows, the same question, nothing taken"];}});
    await wait(200);}
  await answerSum(scs);
  const res=await E(()=>({big:document.querySelector(".fcbig").textContent,paid:(document.querySelector(".fcres .mpaid")||{}).textContent,g:state.gems}));
  ok(res.big==="★★★"&&res.paid==="+8 💎"&&res.g===g0+8,`${A} · level 1: the first finish pays 5 💎 and 1 for each star: ${J(res)}`);
  await clip("level 1 · result",R);
  // Build again: nothing new, nothing paid, said kindly
  await tapSel("level 1 · result","🔁 Build again","#fcAgain",{root:R,swap:true,want:async()=>{const s=await S();return[!s.done&&s.n===1&&await code()===await E(()=>Factory.LEVELS[0].sol),"the same level, his layout still there"];}});
  await runIt("level 1 again");
  await answerSum("level 1 again");
  ok(await gems()===g0+8&&await E(()=>/You already have these stars! Great building\./.test(document.querySelector(".fcres").textContent)),`${A} · level 1 again: a replay pays nothing and says “You already have these stars! Great building.”`);
  await tapSel("level 1 · result","✕","#fcX",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")===""&&!Factory.isOpen(),"back in the valley"])});
  await E(()=>{bringIntoView(geom(12,7).x);});await wait(500);
  await tapEl("Valley","the Factory building again",()=>document.querySelector('#tiles .tile[data-build="factory"] .hitpad')||document.querySelector('#tiles .tile[data-build="factory"]'),null,{root:R,swap:true,
    want:()=>E(()=>[Modes.top()==="factory"&&!!document.querySelector("#fcDone .fcres"),"it opens where he left it: the result card"])});

  // ---- 2. the level map: stars, the next level, a locked one, his own factory still shut ----
  await tapSel("level 1 · result","🗺️ the levels","#fcMapBtn",{root:R,swap:true,want:()=>E(()=>[Factory._view()==="map"&&document.querySelectorAll(".fcl").length===12,"the map: 12 levels"])});
  await clip("the level map",R);
  const mp="the level map";
  ok(await E(()=>/⭐ 3 of 36/.test(document.getElementById("fcAll").textContent)&&document.querySelector('.fcl[data-n="1"] i').textContent==="★★★"&&document.querySelector('.fcl[data-n="2"]').classList.contains("next")&&document.querySelector('.fcl[data-n="3"]').classList.contains("locked")),
    `${A} · ${mp}: ⭐ 3 of 36, level 1 ★★★, level 2 next, level 3 locked`);
  await tapSel(mp,"level 3 (locked)",'.fcl[data-n="3"]',{root:R,want:async()=>[await E(()=>Factory._view()==="map")&&(await said()).slice(-1)[0]==="Finish the level before this one first!","it wiggles: “Finish the level before this one first!”"]});
  await tapSel(mp,"🔒 My own factory","#fcSand",{root:R,want:async()=>[await E(()=>Factory._view()==="map")&&(await said()).slice(-1)[0]==="Finish all twelve levels to build your own factory!","“Finish all twelve levels to build your own factory!”"]});
  await tapSel(mp,"level 1 (done): play it again",'.fcl[data-n="1"]',{root:R,swap:true,want:()=>E(()=>[Factory._S().n===1&&Factory._view()==="board","level 1's board"])});
  await tapSel("level 1 board","🗺️ the levels","#fcMapBtn",{root:R,swap:true,want:()=>E(()=>Factory._view()==="map")});
  await tapSel(mp,"level 2 (next)",'.fcl[data-n="2"]',{root:R,swap:true,want:()=>E(()=>[Factory._S().n===2&&Factory._view()==="board","level 2's board"])});

  // ---- 3. level 2 on the keyboard only: 2 and Space (a drill), 1 (a belt), arrows and Space round the rocks, R, E, Enter ----
  const k2="level 2 (keyboard)";
  ok((await S()).cur===3*12+1,`${A} · ${k2}: the cursor starts on the blue rock`);
  await key(k2,"2 (the drill)","2",{root:R,want:async()=>[(await S()).tool==="drill","the drill"]});
  await key(k2,"Space (a drill on the rock)","Space",{root:R,want:async()=>[(await cellOf(1,3)).t===2,"a drill"]});
  await key(k2,"1 (the belt)","1",{root:R,want:async()=>[(await S()).tool==="belt","the belt"]});
  await key(k2,"ArrowRight","ArrowRight",{root:R,want:async()=>[(await S()).cur===3*12+2,"the cursor moves"]});
  await key(k2,"Space (a belt)","Space",{root:R,want:async()=>[(await cellOf(2,3)).t===1,"a belt"]});
  for(const k of ["ArrowUp","Space","ArrowUp","Space","ArrowUp","Space"])await p.keyboard.press(k);
  for(let i=0;i<7;i++){await p.keyboard.press("ArrowRight");await p.keyboard.press("Space");}
  await key(k2,"ArrowDown","ArrowDown",{root:R,want:async()=>[(await S()).cur===1*12+9,"the cursor moves down"]});
  await p.keyboard.press("Space");await p.keyboard.press("ArrowDown");await p.keyboard.press("Space");
  const kb=await E(()=>{const w=Factory._w();return{d:w.dir[3*12+1],p:Factory.engine.pieces(w)};});
  ok(kb.d===1&&kb.p===14,`${A} · ${k2}: a belt that follows the cursor round the rocks to the truck ${J(kb)}`);
  await key(k2,"R (turn)","r",{root:R,want:async()=>[(await cellOf(9,2)).d===3,"the piece under the cursor turns"]});
  for(const k of ["r","r","r"])await p.keyboard.press(k);
  await key(k2,"E (erase)","e",{root:R,want:async()=>[(await cellOf(9,2)).t===0,"the piece under the cursor is gone"]});
  await key(k2,"Space (put it back)","Space",{root:R,want:async()=>[(await cellOf(9,2)).t===1,"back"]});
  await key(k2,"Enter (run)","Enter",{root:R,want:async()=>[(await S()).running,"running"]});
  await E(()=>Factory._run(45*30));
  const a2=await sum();
  for(const d of a2)await p.keyboard.press(d);
  await key(k2,"the sum: digits and Enter","Enter",{root:R,want:()=>waitFor(p,()=>!!document.querySelector("#fcDone .fcres"),{timeout:3000})});
  await key(k2,"Enter on the result (Next level ▶ has the focus)","Enter",{root:R,want:()=>waitFor(p,()=>Factory._S().n===3,{timeout:3000})});
  K.swapped();

  // ---- 4. every level to the end with its known solution; the new machine's palette button; pay once each ----
  for(let n=3;n<=12;n++){
    const scr=`level ${n}`;
    if(n>3)await tapSel(`level ${n-1} · result`,"Next level ▶","#fcNextL",{root:R,swap:true,want:()=>E(n=>[Factory._S().n===n,"level "+Factory._S().n],n)});
    const L=await E(n=>{const L=Factory.LEVELS[n-1];return{teach:L.teach||"",tools:[...document.querySelectorAll(".fctool")].map(b=>b.dataset.tool),fresh:(document.querySelector(".fctool.new")||{dataset:{}}).dataset.tool||""};},n);
    if(n===3||L.teach)await clip(scr+" board",R);
    if(L.teach){
      ok(L.fresh===L.teach&&await E(()=>!!document.querySelector(".fcteach")),`${A} · ${scr}: the new machine glows in the palette: ${L.fresh} (${L.tools.join(", ")})`);
      await tapSel(scr,`the ${L.teach} in the palette (new)`,`.fctool[data-tool="${L.teach}"]`,{root:R,want:()=>E(t=>Factory._S().tool===t,L.teach)});
    }
    if(n===8){
      // the sorter: its six colours, a sorter on the board, and C
      const sw=await E(()=>[...document.querySelectorAll("#fcSw .fcswatch")].map(b=>+b.dataset.m));
      for(const m of sw)await tapEl(scr,`the sorter colour ${m}`,m=>document.querySelector(`#fcSw .fcswatch[data-m="${m}"]`),m,{root:R,want:()=>E(m=>[Factory._S()&&document.querySelector(`#fcSw .fcswatch[data-m="${m}"]`).classList.contains("on"),"picked"],m)});
      await act(scr,"the board: a sorter",()=>tapCell(6,6),{root:R,want:async()=>{const c=await cellOf(6,6);return[c.t===7&&c.f===sw[sw.length-1],"a sorter pulling off the picked colour "+J(c)];}});
      await tapEl(scr,"the first sorter colour again",m=>document.querySelector(`#fcSw .fcswatch[data-m="${m}"]`),sw[0],{root:R});
      await act(scr,"the board: tap the sorter (a new colour)",()=>tapCell(6,6),{root:R,want:async()=>{const c=await cellOf(6,6);return[c.t===7&&c.f===sw[0],"it pulls off the new colour "+J(c)];}});
      // C with the sorter picked: the next colour; with the cursor on a sorter: that sorter's colour too
      await key(scr,"C (the next sorter colour)","c",{root:R,want:()=>E(m=>{const on=document.querySelector("#fcSw .fcswatch.on");return[!!on&&+on.dataset.m===m,"now "+(on&&on.dataset.m)];},sw[1])});
      const cur0=await E(()=>{const s=Factory._S(),w=Factory._w();return[s.cur%w.W,Math.floor(s.cur/w.W)];});
      for(let x=cur0[0];x<6;x++)await p.keyboard.press("ArrowRight");for(let x=cur0[0];x>6;x--)await p.keyboard.press("ArrowLeft");
      for(let y=cur0[1];y<6;y++)await p.keyboard.press("ArrowDown");for(let y=cur0[1];y>6;y--)await p.keyboard.press("ArrowUp");
      const f0=(await cellOf(6,6)).f;
      await key(scr,"C on a sorter (its colour)","c",{root:R,want:async()=>{const c=await cellOf(6,6);return[c.t===7&&c.f!==f0,`its colour ${f0} → ${c.f}`];}});
    }
    await E(n=>Factory._load(Factory.LEVELS[n-1].sol),n);
    const gb=await gems(),st0=await E(n=>Factory.stars(n),n);
    ok(await runIt(scr),`${A} · ${scr}: the known solution meets the order`);
    await answerSum(scr);
    const r=await E(()=>({res:Factory._S().result,g:state.gems}));
    ok(r.res&&r.res.stars===3&&r.g===gb+(st0?3-st0:8),`${A} · ${scr}: ★★★, paid ${r.g-gb} 💎 (${st0?"new stars only":"5 for the first finish and 1 a star"})`);
  }
  ok(await E(()=>state.factory.lvl===12&&Object.keys(state.factory.stars).length===12),`${A} · all twelve levels done, three stars each`);

  // ---- 5. his own factory: every piece on the keys 1–8, an order card, Next order, Keep building, five paid a day ----
  await tapSel("level 12 · result","🏗️ My own factory","#fcSandGo",{root:R,swap:true,want:()=>E(()=>[Factory._S().sandbox&&Factory._w().W===16,"a 16 × 12 board"])});
  await clip("his own factory",R);
  const sb="his own factory";
  const tools=await E(()=>Factory.TOOLS.map(t=>t.id));
  for(let i=0;i<tools.length;i++)await key(sb,`${i+1} (${tools[i]})`,String(i+1),{root:R,want:()=>E(t=>[Factory._S().tool===t,t],tools[i])});
  for(const t of tools)await tapSel(sb,`the ${t} in the palette`,`.fctool[data-tool="${t}"]`,{root:R,want:()=>E(t=>Factory._S().tool===t,t)});
  await tapSel(sb,"🔊 the order","#fcHear",{root:R,want:async()=>{const l=(await said()).slice(-1)[0];return[/^Send /.test(l),"“"+l+"”"];}});
  const gS=await gems(),pays=[];
  for(let k=0;k<6;k++){
    const o=await E(()=>Factory._S().order);pays.push(o.pay);
    await E(()=>Factory._finish());
    await answerSum(sb,`order ${k+1}: ✓ the sum`);
    const line=await E(()=>document.querySelector(".fcres").textContent.replace(/\s+/g," "));
    if(k<5)ok(new RegExp("\\+"+o.pay+" 💎").test(line),`${A} · ${sb} · order ${k+1} pays ${o.pay} 💎`);
    else ok(/for-fun order/.test(line),`${A} · ${sb} · order 6: “That was a for-fun order. Five paid orders a day!”`);
    if(k%2===0)await tapSel(sb,"📦 Next order","#fcNext",{root:R,swap:true,want:()=>E(()=>[!Factory._S().done&&Factory._S().running,"a new order, and the factory runs on"])});
    else await tapSel(sb,"🏗️ Keep building","#fcKeep",{root:R,swap:true,want:()=>E(()=>[!Factory._S().done&&!Factory._S().running,"a new order, the factory waits while he builds"])});
  }
  const want=pays.slice(0,5).reduce((a,b)=>a+b,0);
  ok(await gems()===gS+want&&await E(()=>/For fun/.test(document.getElementById("fcPay").textContent)),`${A} · ${sb}: five orders pay ${pays.slice(0,5).join(" + ")} = ${want} 💎, the sixth nothing, and the card says “For fun ⭐”`);
  await tapSel(sb,"🗺️ the levels","#fcMapBtn",{root:R,swap:true,want:()=>E(()=>[/⭐ 36 of 36/.test(document.getElementById("fcAll").textContent)&&!document.getElementById("fcSand").hasAttribute("aria-disabled"),"⭐ 36 of 36, My own factory open"])});
  await tapSel(mp,"🏗️ My own factory","#fcSand",{root:R,swap:true,want:()=>E(()=>Factory._S().sandbox)});
  await tapSel(sb,"✕","#fcX",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="","back in the valley"])});

  // ---- 6. the ghost tap: a double tap on a level or on Build again must not put a piece down or turn one ----
  await E(()=>{Factory.open();Factory.map();});await wait(500);
  const lv=await K.centre(()=>document.querySelector('.fcl[data-n="5"]'));
  await act("ghost tap","a double tap on level 5",()=>K.dbl(lv[0],lv[1]),{root:R,swap:true,want:async()=>{await wait(300);const s=await S();return[s.n===5&&s.pieces===0,`level ${s.n}, ${s.pieces} pieces on the board`];}});
  await E(()=>{Factory._load(Factory.LEVELS[4].sol);Factory._run(45*30);});
  await answerSum("ghost tap");
  const before=await code(),ag=await K.centre(()=>document.getElementById("fcAgain"));
  await act("ghost tap","a double tap on 🔁 Build again",()=>K.dbl(ag[0],ag[1]),{root:R,swap:true,want:async()=>{await wait(300);return[await code()===before&&!(await S()).done,"his layout is as he left it"];}});
  await E(()=>Factory.close());

  // ---- 7. the 🏭 spot in Adventure: it opens over Adventure, ✕ goes back to it ----
  await p.tap("#advBtn",{timeout:5000});await waitFor(p,()=>Modes.top()==="adventure");await wait(600);
  await E(()=>{state.critters.forEach(c=>{c.out=false;});(state.vehicles||[]).forEach(v=>{v.out=false;});Adv._P.c=12.2;Adv._P.r=7;});
  await waitFor(p,()=>document.getElementById("advAct").textContent==="🏭 Factory",{timeout:8000});
  await tapSel("Adventure","🏭 Factory (the action button at the spot)","#advAct",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure>factory",Modes.stack().join(">")])});
  await tapSel("Adventure","✕","#fcX",{root:R,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure","back to "+Modes.stack().join(">")])});
  await E(()=>Adv.exit());await wait(200);

  ok(!errs.length,`${A}: no page or console errors`+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  K.summary();await close();
}

/* =====================================================================================================================
   THE HOLIDAY PACKS, on their test dates: Trick-or-Read (a full night of ten doors), the Feast table (every plate, ten
   dishes, the second visit), Light the tree (every door 1–25, a read of each kind, door 6's piece, bulbs from a crate
   read, the star from a book), and the Closet showing and wearing each look he earned
   ===================================================================================================================== */
async function holidayArea(){
  const A="Holidays";
  const GRID={"6,8":{id:"cottage",seed:3,lv:1},"11,7":{id:"windmill",seed:2,lv:1},"16,8":{id:"campfire",seed:1,lv:1}};
  const CRITS=[{id:"fox",seed:5,c:5,r:8,lv:1,out:false,since:0},{id:"dog",seed:1,c:14,r:8,lv:1,out:false,since:1}];
  const {page:p,errs,close,E}=await launch({viewport:VP,seed:{guardians:[0,1,2],gems:30,settings:{goal:0,tierOverride:3},grid:GRID,critters:CRITS,mine:{coins:40},
    stats:{the:{seen:6,first:6,mastered:true},to:{seen:6,first:6,mastered:true}}}});
  const K=kit(A,p,errs,E),{act,tapSel,tapEl,wait,said,clip}=K;
  await K.hook();await K.tidy();
  const coins=()=>E(()=>state.mine.coins);
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const badge=id=>E(i=>document.getElementById(i).textContent,id);
  // the answer in a Read host by touch: a word, a picture or a scene (host.dataset.ans), or a wrong one
  const tapAnswer=(host,right)=>K.tapFn(([h,r])=>{const x=document.querySelector(h),a=x.dataset.ans;
    if(a[0]==="#")return r?x.querySelector(`.psopt[data-i="${a.slice(1)}"]`):[...x.querySelectorAll(".psopt")].find(b=>b.dataset.i!==a.slice(1));
    return r?x.querySelector(`[data-w="${CSS.escape(a)}"]`):[...x.querySelectorAll("[data-w]")].find(b=>b.dataset.w!==a);},[host,right]);
  const ansOf=h=>waitFor(p,h=>{const x=document.querySelector(h);return x&&x.dataset.ans;},{arg:h,timeout:5000});
  const kindOf=h=>E(h=>{const x=document.querySelector(h);return x.querySelector(".wslots")?"build":x.dataset.ans[0]==="#"?"sentence":x.querySelector(".wwopt")?"word pick":"picture pick";},h);
  const quiet=()=>E(()=>{state.critters.forEach(c=>{c.out=false;});(state.vehicles||[]).forEach(v=>{v.out=false;});});

  /* ---------------- Trick-or-Read, 20 October ---------------- */
  const RT="#ovTrick",TR="Trick-or-Read";
  await E(()=>Trick._setToday("2026-10-20"));
  ok(await shown("trickBtn")&&await badge("trickBadge")==="10",`${A} · ${TR}: 20 October: the 🎃 button, 10 on its badge`);
  await tapSel(TR,"🎃 in the dock","#trickBtn",{root:RT,swap:true,want:()=>waitFor(p,()=>Modes.top()==="adventure"&&document.querySelectorAll(".advland.tkdoor").length===10?["adventure","Adventure, ten doors"]:false,{timeout:5000})});
  const doors=await E(()=>Trick.doors());
  await quiet();
  let knocks=0;
  for(const [i,d] of doors.entries()){
    const scr=`${TR} · door ${i+1} (${d.kind})`,c0=await coins();
    await E(d=>{Adv._P.c=d.c;Adv._P.r=d.r;},d);
    const lab=await waitFor(p,()=>document.getElementById("advAct").textContent==="🚪 Knock knock!",{timeout:6000});
    const knock=()=>act(scr,"🚪 Knock knock! (the action button)",()=>lab?K.tapSelRaw("#advAct"):E(id=>Trick.knock(id),d.id),{root:RT,swap:true,
      want:()=>E(()=>{const q=Trick._q(),c=document.querySelector("#ovTrick .tkcrit");return[Modes.stack().join(">")==="adventure>trick"&&!!q&&!!document.getElementById("tkQ").dataset.ans&&!!c,
        `an animal in a costume (${c&&c.dataset.cos}) asks: ${q&&q.kind}`];})});
    if(!lab)T.fail(`${A} · ${scr}: walking up to it did not offer “🚪 Knock knock!” (${await E(()=>document.getElementById("advAct").textContent)})`);
    await knock();knocks++;
    if(i===0)await clip(TR+" · knock panel",RT);
    const kind=await kindOf("#tkQ");
    if(i===0){
      // two misses: nothing taken, the same question, then the answer glows
      for(let k=0;k<2;k++)await act(scr,k?"a wrong answer again":"a wrong answer",()=>tapAnswer("#tkQ",false),{root:RT,want:async()=>{const m=await E(()=>document.getElementById("tkMsg").textContent),
        h=await E(()=>!!document.querySelector("#tkQ .hint"));return[m==="Ooh, try again!"&&(await coins())===c0&&h===(k===1),`“${m}”, nothing taken${k?", the answer glows":""}`];}});
    }
    if(i===1){
      await tapSel(scr,"✕ before answering","#tkX",{root:RT,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure","back to Adventure, the door still open"])});
      await knock();
    }
    if(kind==="sentence"){const w=await E(()=>document.querySelector("#tkQ .btext .bw").textContent);
      await tapEl(scr,`the word “${w}” (sounded out)`,()=>document.querySelector("#tkQ .btext .bw"),null,{root:RT,want:async()=>[(await said()).some(x=>/^say:(word|sound):/.test(x)),"sounded out"]});}
    await act(scr,`the right answer (${kind})`,()=>tapAnswer("#tkQ",true),{root:RT,want:()=>waitFor(p,()=>!!document.getElementById("tkNext"),{timeout:3000})});
    const last=i===doors.length-1,left=await E(()=>Trick.left);
    ok((await coins())===c0+2&&left===doors.length-1-i,`${A} · ${scr}: +2 🪙 candy, ${left} doors left`);
    if(last){
      const fin=await E(()=>document.getElementById("tkQ").textContent.replace(/\s+/g," "));
      const piece=await waitFor(p,()=>{const e=document.getElementById("tkPiece");return e&&e.textContent;},{timeout:6000});
      ok(/Happy Halloween!/.test(fin)&&/Ten doors, ten treats!/.test(fin)&&/You got the pumpkins!/.test(piece||"")&&await E(()=>JSON.stringify(Looks.pieces("halloween").earned)==='["pumpkins"]'&&state.trick.nights===1),
        `${A} · ${TR}: the tenth door: “Happy Halloween! Ten doors, ten treats!”, and a piece for the Closet: “${piece}”`);
      await tapSel(scr,"Done 🎃","#tkNext",{root:RT,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure","back to Adventure"])});
    }else await tapSel(scr,"More doors! 🎃","#tkNext",{root:RT,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="adventure","back to Adventure"])});
  }
  // closed doors: a building's own button comes back, a tree's door says yum; the 🎃 button says come back tomorrow
  const bd=doors.find(d=>d.kind==="build"),ex=doors.find(d=>d.kind!=="build");
  await E(d=>{Adv._P.c=d.c;Adv._P.r=d.r;},bd);
  ok(await waitFor(p,()=>/^🚪 /.test(document.getElementById("advAct").textContent)&&document.getElementById("advAct").textContent!=="🚪 Knock knock!",{timeout:5000}),
    `${A} · ${TR}: a closed door on a building gives it its own button back: ${await E(()=>document.getElementById("advAct").textContent)}`);
  await E(d=>{Adv._P.c=d.c;Adv._P.r=d.r;},ex);
  if(await waitFor(p,()=>document.getElementById("advAct").textContent==="🍬 Yum!",{timeout:5000}))
    await tapSel(TR,"🍬 Yum! (a closed door on a tree)","#advAct",{root:RT,want:async()=>[(await K.toasts()).slice(-1)[0]==="You got candy here! 🍬","“You got candy here! 🍬”"]});
  else T.fail(`${A} · ${TR}: the closed ${ex.kind} door did not say 🍬 Yum!`);
  await E(()=>Adv.exit());await wait(300);
  await tapSel(TR,"🎃 after a full night","#trickBtn",{root:RT,want:async()=>[(await K.toasts()).slice(-1)[0]==="🍬 You got all the treats tonight! Come back tomorrow 🎃"&&await E(()=>Modes.top()==="valley"),
    "“You got all the treats tonight! Come back tomorrow”, he stays in the valley"]});
  ok(await E(()=>state.trick.candy===20&&state.trick.doors.length===10),`${A} · ${TR}: ten doors paid 20 🪙 in all, once each`);

  /* ---------------- the Feast table, 20 November ---------------- */
  const RF="#ovFeast",FT="Feast table";
  await E(()=>Feast._setToday("2026-11-20"));
  ok(await shown("feastBtn")&&await badge("feastBadge")==="10",`${A} · ${FT}: 20 November: the 🦃 button, 10 on its badge`);
  await tapSel(FT,"🦃 in the dock","#feastBtn",{root:RF,swap:true,want:()=>E(()=>[Modes.top()==="feast"&&document.querySelectorAll("#fsPlates .fsplate").length===10&&!!document.getElementById("fsQ").dataset.ans,"ten empty plates and a Picture it"])});
  await clip(FT,RF);
  for(let i=0;i<10;i++)await tapEl(FT,`plate ${i+1} (empty)`,i=>document.querySelector(`#fsPlates .fsplate[data-i="${i}"]`),i,{root:RF,inert:true});
  let fc=await coins();
  for(let k=0;k<2;k++)await act(FT,k?"dish 1 · a wrong picture again":"dish 1 · a wrong picture",()=>tapAnswer("#fsQ",false),{root:RF,want:async()=>{const m=await E(()=>document.getElementById("fsMsg").textContent),
    h=await E(()=>!!document.querySelector("#fsQ .hint"));return[m==="Not that one, try again!"&&(await coins())===fc&&h===(k===1),`“${m}”, nothing taken${k?", the right one glows":""}`];}});
  for(let n=1;n<=10;n++){
    const w=await ansOf("#fsQ");
    if(n===2){
      await tapSel(FT,"✕ before answering","#fsX",{root:RF,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="","back in the valley"])});
      await tapSel(FT,"🦃 again","#feastBtn",{root:RF,swap:true,want:()=>E(w=>[document.getElementById("fsQ").dataset.ans===w,"the same dish to read: "+w],w)});
    }
    fc=await coins();
    await act(FT,`dish ${n} · the right picture (${w})`,()=>tapAnswer("#fsQ",true),{root:RF,want:()=>waitFor(p,n=>state.feast.dishes.length===n,{arg:n,timeout:3000})});
    ok((await coins())===fc+2&&await E(([n,w])=>{const pl=document.querySelector(`#fsPlates .fsplate[data-i="${n-1}"]`);return !!pl&&pl.dataset.dish===w;},[n,w]),`${A} · ${FT} · dish ${n}: +2 🪙, “${w}” on plate ${n}`);
    if(n<10)await waitFor(p,n=>{const h=document.getElementById("fsQ");return h.dataset.ans&&!h.querySelector(".fsyum")&&Feast.placed.length===n;},{arg:n,timeout:4000});
  }
  const full=await waitFor(p,()=>document.getElementById("fsDone")&&{guests:document.querySelectorAll("#fsGuests .fsguest").length,bubble:document.getElementById("fsBubble").textContent,
    text:document.getElementById("fsQ").textContent.replace(/\s+/g," "),piece:(document.getElementById("fsPiece")||{}).textContent||""},{timeout:6000});
  const piece2=await waitFor(p,()=>{const e=document.getElementById("fsPiece");return e&&e.textContent;},{timeout:6000});
  ok(full&&full.guests===CRITS.length&&full.bubble==="Thank you for the feast!"&&/The table is full!/.test(full.text)&&/corn garland/.test(piece2||""),
    `${A} · ${FT}: ten dishes: ${full&&full.guests} animals come to eat, “${full&&full.bubble}”, a piece: “${piece2}”`);
  await clip(FT+" · the full table",RF);
  await tapEl(FT,"plate 1 (a dish on it)",()=>document.querySelector('#fsPlates .fsplate[data-i="0"]'),null,{root:RF,inert:true});
  await tapSel(FT,"Done 🦃","#fsDone",{root:RF,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="","back in the valley"])});
  await tapSel(FT,"🦃 the same day","#feastBtn",{root:RF,swap:true,want:async()=>[await E(()=>/Come back tomorrow for a new feast/.test(document.getElementById("fsQ").textContent))&&(await said()).slice(-1)[0]==="The table is full! Come back tomorrow.",
    "“The table is full! Come back tomorrow.”"]});
  await tapSel(FT,"OK 🦃","#fsDone",{root:RF,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="","back in the valley"])});

  /* ---------------- Light the tree, 6 December ---------------- */
  const RL="#ovLights",LT="Light the tree";
  await E(()=>Lights._setToday("2026-12-06"));
  ok(await shown("lightsBtn")&&await badge("lightsBadge")==="6",`${A} · ${LT}: 6 December: the ❄️ button, 6 doors to open on its badge`);
  await tapSel(LT,"❄️ in the dock","#lightsBtn",{root:RL,swap:true,want:()=>E(()=>[Modes.top()==="lights"&&document.querySelectorAll("#ltDoors .ltdoor").length===25&&document.querySelectorAll("#ltDoors .ltdoor.ready").length===6,
    "the tree, 25 doors, 6 ready"])});
  await clip(LT,RL);
  for(let n=7;n<=25;n++)await tapEl(LT,`door ${n} (shut)`,n=>document.querySelector(`#ltDoors .ltdoor[data-door="${n}"]`),n,{root:RL,
    want:async()=>{const r=await E(n=>({m:document.getElementById("ltMsg").textContent,w:document.querySelector(`#ltDoors .ltdoor[data-door="${n}"]`).classList.contains("wig"),q:Lights._q()}),n);
      return[r.m===`Door ${n} opens on ${n} December ❄️`&&r.w&&!r.q&&(await said()).slice(-1)[0]==="That door opens on another day.",`it wiggles: “${r.m}”`];}});
  // Build it in a door: the empty slots filled with the right sounds, or a wrong sound first
  const buildRight=()=>E(()=>{const h=document.getElementById("ltQ"),tiles=JSON.parse(h.dataset.tiles),sl=[...h.querySelectorAll(".wslot")];
    tiles.forEach((ph,i)=>{if(sl[i].classList.contains("filled"))return;const t=[...h.querySelectorAll(".wbank .lt")].find(b=>!b.classList.contains("used")&&b.textContent===tileText(ph));if(t)t.click();});});
  const buildWrong=()=>E(()=>{const h=document.getElementById("ltQ"),tiles=JSON.parse(h.dataset.tiles),sl=[...h.querySelectorAll(".wslot")];
    const empty=sl.filter(s=>!s.classList.contains("filled")).length,i0=sl.findIndex(s=>!s.classList.contains("filled"));
    const bank=()=>[...h.querySelectorAll(".wbank .lt")].filter(b=>!b.classList.contains("used"));
    bank().find(b=>b.textContent!==tileText(tiles[i0])).click();for(let k=1;k<empty;k++)bank()[0].click();});
  const opened=n=>waitFor(p,n=>Lights.opened.indexOf(n)>=0,{arg:n,timeout:4000});
  const backTree=(n)=>tapSel(`${LT} · door ${n}`,"Back to the tree 🎄","#ltNext",{root:RL,swap:true,want:()=>E(()=>[!!document.getElementById("ltDoors"),"the tree"])});
  for(let n=1;n<=6;n++){
    const scr=`${LT} · door ${n}`,c0=await coins();
    await tapEl(LT,`door ${n} (ready)`,n=>document.querySelector(`#ltDoors .ltdoor[data-door="${n}"]`),n,{root:RL,swap:true,want:()=>E(n=>{const q=Lights._q();return[!!q&&q.n===n&&!!document.getElementById("ltQ").dataset.ans,"its read: "+(q&&q.kind)];},n)});
    const kind=(await E(()=>Lights._q())).kind;
    if(n===1){
      await clip(scr+" (build)",RL);
      await tapEl(scr,"👂 Hear it",()=>document.querySelector("#ltQ .qhear"),null,{root:RL,want:async()=>[/^say:word:/.test((await said()).slice(-1)[0]),"the word is said"]});
      for(let k=0;k<2;k++){await wait(350);
        await act(scr,k?"a wrong build again":"a wrong build",buildWrong,{root:RL,want:async()=>{const m=await E(()=>document.getElementById("ltMsg").textContent);
          const g=k?await waitFor(p,()=>document.querySelectorAll("#ltQ .wbank .lt.hint").length===1,{timeout:2500}):true;
          return[m==="Almost! Try again."&&(await coins())===c0&&!!g,`“${m}”, nothing taken${k?", the next sound glows":""}`];}});
        await wait(900);}
    }
    if(n===2){
      await tapSel(scr,"🎄 Back to the tree (before reading)","#ltBack",{root:RL,swap:true,want:()=>E(()=>[!!document.getElementById("ltDoors")&&Lights.opened.indexOf(2)<0,"the tree, the door still ready"])});
      await tapEl(LT,"door 2 (again)",()=>document.querySelector('#ltDoors .ltdoor[data-door="2"]'),null,{root:RL,swap:true,want:()=>E(()=>!!Lights._q())});
    }
    if(kind==="sentence"){const w=await E(()=>document.querySelector("#ltQ .btext .bw").textContent);
      await tapEl(scr,`the word “${w}” (sounded out)`,()=>document.querySelector("#ltQ .btext .bw"),null,{root:RL,want:async()=>[(await said()).some(x=>/^say:(word|sound):/.test(x)),"sounded out"]});
      await act(scr,"the right picture",()=>tapAnswer("#ltQ",true),{root:RL,want:()=>opened(n)});}
    else{await wait(350);await act(scr,`the right build (${kind})`,buildRight,{root:RL,want:()=>opened(n)});}
    const gift=await waitFor(p,()=>!!document.getElementById("ltNext")&&document.getElementById("ltBody").textContent.replace(/\s+/g," "),{timeout:4000});
    ok((await coins())===c0+3&&gift&&/is open!/.test(gift)&&/\+3 🪙/.test(gift),`${A} · ${scr} (${kind}): +3 🪙 and a surprise: ${String(gift).trim().slice(0,60)}`);
    if(n===6){const pc=await waitFor(p,()=>{const e=document.getElementById("ltPiece");return e&&e.textContent;},{timeout:6000});
      ok(/You got the string lights!/.test(pc||"")&&await E(()=>JSON.stringify(Looks.pieces("winter").earned)==='["lights"]'),`${A} · ${scr}: the sixth door gives a piece: “${pc}”`);}
    await backTree(n);
  }
  await tapEl(LT,"door 1 (open)",()=>document.querySelector('#ltDoors .ltdoor[data-door="1"]'),null,{root:RL,want:()=>E(()=>{const m=document.getElementById("ltMsg").textContent;return[/^🎁 Door 1: .+!$/.test(m),"“"+m+"”"];})});
  ok(await E(()=>Lights.bulbs===6&&document.querySelectorAll("#ltBody .ltbulb.on").length===6),`${A} · ${LT}: six door reads light six bulbs`);
  await tapSel(LT,"✕","#ltX",{root:RL,swap:true,want:()=>E(()=>[Modes.stack().join(">")==="","back in the valley"])});
  // a crate-loop read lights a bulb; a finished book lights the star
  const cw=await E(()=>{const w=allWords().find(x=>!x.tricky&&x.t===1&&WORD_ART[x.w]);openWord({...w},{rung:2});return w.w;});
  await wait(1100);await E(()=>document.querySelector("#picks .btn").click());await wait(300);
  await E(w=>{const b=document.querySelector(`#picks .pick[data-w="${w}"]`);if(b)b.click();},cw);await wait(700);await K.tidy();
  ok(await E(()=>Lights.bulbs===7),`${A} · ${LT}: a crate-loop read (“${cw}”) lights a seventh bulb`);
  const bk=await E(()=>{const b=BOOKS.find(x=>x.t===1&&!x.mine);return{id:b.id,n:b.pages.length};});
  await E(id=>Books.openBook(id),bk.id);await E(()=>document.getElementById("bStart").click());
  for(let i=0;i<bk.n;i++)await E(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();});
  for(let k=0;k<6;k++){
    const has=await waitFor(p,()=>!!document.querySelector("#ovStory .bopts")||!!document.querySelector("#ovStory .bpage.end"),{timeout:4000});
    if(!has||await E(()=>!!document.querySelector("#ovStory .bpage.end")))break;
    await E(()=>{const h=document.querySelector("#ovStory .bopts"),b=h.querySelector('.bopt[data-v="'+h.dataset.ans+'"]');b.click();});
    await waitFor(p,i=>Books._state().quizIdx>i||!!document.querySelector("#ovStory .bpage.end"),{arg:k,timeout:3000});}
  await waitFor(p,"#ovStory .bpage.end",{timeout:4000});
  ok(await E(()=>Lights.star===true),`${A} · ${LT}: a finished book (${bk.id}) lights the star`);
  await E(()=>Books.close());await K.tidy();
  await tapSel(LT,"❄️ again","#lightsBtn",{root:RL,swap:true,want:()=>E(()=>[!!document.querySelector("#ltBody .ltstar.on")&&/star is lit/.test(document.getElementById("ltStarLn").textContent)&&
    /bulbs lit today/.test(document.getElementById("ltLit").textContent),"“"+document.getElementById("ltLit").textContent+"” and “"+document.getElementById("ltStarLn").textContent+"”"])});
  await tapSel(LT,"✕","#ltX",{root:RL,swap:true,want:()=>E(()=>Modes.stack().join(">")==="")});

  /* ---------------- the Closet: every look he earned, worn and taken off ---------------- */
  const RC="#ovCloset",CL="Closet";
  await tapSel(CL,"🎨 in the dock","#closetBtn",{root:RC,swap:true,want:()=>E(()=>{const c=[...document.querySelectorAll("#clGrid .clcard")].map(x=>x.dataset.look+":"+x.querySelector(".cost").textContent);
    return[Modes.top()==="closet"&&c.length===4&&["halloween","thanks","winter"].every(l=>c.indexOf(l+":1 of 4 pieces")>=0),c.join(", ")];})});
  await clip(CL,RC);
  let lastC=0;const gapC=async()=>{const d=Date.now()-lastC;if(d<700)await wait(700-d);};
  const cardC=l=>`#clGrid .clcard[data-look="${l}"]`;
  const lookNow=()=>E(()=>({look:state.look,cls:[...document.body.classList].filter(c=>c.indexOf("look-")===0).join(" "),props:[...document.querySelectorAll("#tiles .lookprop")].map(x=>x.dataset.prop).sort().join(",")}));
  for(const l of ["halloween","thanks","winter",""]){
    await gapC();
    const was=await lookNow();
    await tapEl(CL,`the ${l||"Valley"} card`,s=>document.querySelector(s),cardC(l),{root:RC,want:async()=>{const n=await lookNow();
      const want=l===""?"":was.look===l?"":l;return[n.look===want&&(want?n.cls.indexOf("look-"+want)>=0:!n.cls),`state.look “${n.look}” (${n.cls||"the plain valley"}), props ${n.props||"none"}`];}});
    lastC=Date.now();
  }
  // every piece of each look, then each worn in turn: the valley shows its props, its drift and the buddy's hat
  await E(()=>{["halloween","thanks","winter"].forEach(l=>{for(let i=0;i<3;i++)Looks.grant(l,{quiet:true});});});
  await gapC();
  await tapSel(CL,"Done","#clClose",{root:RC,swap:true,want:()=>E(()=>Modes.stack().join(">")==="")});
  await p.tap("#closetBtn",{timeout:5000});await waitFor(p,()=>Modes.top()==="closet");
  const HAT={halloween:"witch",thanks:"pilgrim",winter:"santa"};
  for(const l of ["halloween","thanks","winter"]){
    await gapC();
    const cur=await E(()=>state.look);
    if(cur===l){await tapEl(CL,`the ${l} card (take it off first)`,s=>document.querySelector(s),cardC(l),{root:RC});lastC=Date.now();await gapC();}
    await tapEl(CL,`the ${l} card (4 of 4)`,s=>document.querySelector(s),cardC(l),{root:RC,want:()=>E(([l,h])=>{
      const props=document.querySelectorAll('#tiles .lookprop[data-look="'+l+'"]').length,hat=!!document.querySelector(`#buddyWorld [data-hat="${h}"]`),
        parts=document.querySelectorAll("#particles .lookp").length;
      return[state.look===l&&document.querySelector(`#clGrid .clcard[data-look="${l}"] .cost`).textContent==="4 of 4 pieces"&&props===2&&hat&&parts>0,`worn: ${props} props, ${parts} drifting, the ${h} hat`];},[l,HAT[l]])});
    lastC=Date.now();
  }
  await gapC();
  await tapSel(CL,"Done","#clClose",{root:RC,swap:true,want:()=>E(()=>[Modes.stack().join(">")===""&&state.look==="winter","back in the valley, the Holiday Lights look still on"])});
  await E(()=>{Trick._setToday(null);Feast._setToday(null);Lights._setToday(null);});

  ok(!errs.length,`${A}: no page or console errors`+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  K.summary();await close();
}

const AREAS={jobs1:()=>jobsArea(1),jobs2:()=>jobsArea(2),store:()=>storeArea(),factory:()=>factoryArea(),holidays:()=>holidayArea()};
(async()=>{
  const args=process.argv.slice(2).map(a=>a==="jobs"?["jobs1","jobs2"]:[a]).reduce((x,y)=>x.concat(y),[]).filter(a=>AREAS[a]);
  const run=args.length?args:Object.keys(AREAS);
  // three at a time, each in its own browser (the whole file stays well under run-all's five minutes)
  const queue=run.slice();
  const lane=async()=>{while(queue.length){const a=queue.shift();await AREAS[a]().catch(e=>T.fail(`${a} crashed: ${e&&e.stack||e}`));}};
  await Promise.all([lane(),lane(),lane()]);
  T.done();
})().catch(e=>{console.log("FAIL hunt_jobs crashed: "+(e&&e.stack||e));process.exit(1);});
