const {launch,seed,waitFor}=require("./lib");
(async()=>{
  const {page:p,close,E}=await launch({viewport:{width:1024,height:768},seed:{guardians:[0,1,2],gems:60,settings:{goal:0},mine:{coins:0},jobs:{current:null,xp:{shop:4},tasks:4,streak:0}}});
  const cdp=await p.context().newCDPSession(p);
  const dbl=async(x,y)=>{for(let k=0;k<2;k++){await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});if(!k)await p.waitForTimeout(110);}};
  await E(()=>{window.__ev=[];["pointerdown","pointerup","click","touchstart","touchend"].forEach(t=>document.addEventListener(t,e=>{window.__ev.push(t+":"+(e.target.id||e.target.className||e.target.tagName)+":"+Math.round(e.timeStamp));},true));});
  await p.tap("#jobsBtn");await waitFor(p,'#ovJob.on .jcard[data-job="shop"]');await p.tap('#ovJob .jcard[data-job="shop"]');await waitFor(p,"#jIn");await p.waitForTimeout(300);
  await E(()=>document.getElementById("jIn").click());
  await waitFor(p,()=>{const s=Jobs._S();return s&&s.task&&document.querySelector("#jQ")&&document.querySelector("#jQ").dataset.ans;});
  // answer the first task right, step by step
  for(let g=0;g<6;g++){const s=await E(()=>{const S=Jobs._S();return S&&S.task?{i:S.task.i,kit:S.task.steps[S.task.i].kit,ans:document.querySelector("#jQ").dataset.ans}:null;});if(!s)break;
    await E(a=>{const h=document.querySelector("#jQ");const b=[...h.querySelectorAll("button,.pick,.pk")].find(x=>x.dataset.w===a||x.textContent.trim()===a);if(b)b.click();else{const keys=[...h.querySelectorAll("button")];for(const ch of a){const k=keys.find(x=>x.textContent.trim()===ch);if(k)k.click();}const ok=keys.find(x=>/✓|Check|Done/.test(x.textContent));if(ok)ok.click();}},s.ans);
    await p.waitForTimeout(400);const n=await E(()=>Jobs._S()&&Jobs._S().n);if(n>0)break;}
  const got=await waitFor(p,"#jGo",{timeout:8000});console.log("Keep going shown:",got, await E(()=>document.querySelector("#jQ h2,#jQ .jmoment h2")&&document.querySelector("#jQ h2,#jQ .jmoment h2").textContent));
  await p.waitForTimeout(200);
  const c=await E(()=>{const r=document.getElementById("jGo").getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2];});
  await E(()=>{window.__ev=[];});
  await dbl(c[0],c[1]);await p.waitForTimeout(400);
  console.log(JSON.stringify(await E(()=>({task:Jobs._S()&&Jobs._S().task&&{i:Jobs._S().task.i,miss:Jobs._S().task.miss,kit:Jobs._S().task.steps[Jobs._S().task.i].kit},msg:document.getElementById("jMsg").textContent,hit:document.querySelectorAll("#jQ .right,#jQ .wrong").length,ev:window.__ev}))));
  await close();
})().catch(e=>{console.log("ERR",e.message);process.exit(1);});
