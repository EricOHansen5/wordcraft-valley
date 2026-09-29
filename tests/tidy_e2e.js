// One idea of "uniform": the Job board puts on the job's own uniform, or the Trading Post's uniform for that job once he
// owns it (its picture and name, on the clock-in screen and in the shift header); the job's tool from the Trading Post
// shows beside it, makes the tip come at four in a row instead of five, and says "Your … is ready!" once a shift; the
// Trading Post's job gear cards say what a tool does and, once his, where the gear is used.
// Math at the jobs: the Grown-up report's block (per level, right out of answered this week and in all), its quiet
// line with no math yet, the per-day tally Tracks.record keeps (60 days), and an old save whose stats have no days.
const {launch,seed,waitFor,check}=require("./lib");
(async()=>{
  const T=check("tidy"),ok=T.ok;
  const START={guardians:[0,1,2],settings:{goal:0,tierOverride:4},mine:{coins:200},jobs:{current:null,xp:{shop:15,mow:15},tasks:30,streak:0}};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  const wait=ms=>p.waitForTimeout(ms);
  // record what is said instead of playing it (again after every reload)
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};});
  const said=()=>E(()=>window.__said.slice());
  const count=async line=>(await said()).filter(x=>x===line).length;
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const helpers=()=>E(()=>{window.__job={
    host:()=>document.getElementById("jQ"),
    right(h){const k=h.dataset.kit,a=h.dataset.ans;
      if(k==="pick"){h.querySelector(`[data-w="${a}"]`).click();return k;}
      if(k==="pad"){for(const c of a)h.querySelector(`[data-key="${c}"]`).click();h.querySelector('[data-key="ok"]').click();return k;}
      if(k==="path"){for(const c of a)h.querySelector(`[data-dir="${c}"]`).click();return k;}
      return "none";}};});
  await listen();await tidy();await helpers();
  const S=()=>E(()=>Jobs._S());
  // answer every step of the task on screen, right the first time
  async function doTask(){
    const n0=(await S()).n;
    for(let k=0;k<6;k++){
      const at=await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&h&&h.dataset.ans?{i:s.task.i}:false;},{timeout:8000});
      if(!at)return false;
      await E(()=>__job.right(__job.host()));
      const moved=await waitFor(p,([n,i])=>{const s=Jobs._S();return s&&(s.n>n||(s.task&&s.task.i>i));},{arg:[n0,at.i],timeout:6000});
      if(!moved)return false;
      if((await S()).n>n0)return true;
    }
    return false;
  }
  const intro=async id=>{
    await E(()=>{if(!document.querySelector("#ovJob.on"))Jobs.open();});
    await waitFor(p,`#ovJob.on .jcard[data-job="${id}"]`);
    await p.click(`#ovJob .jcard[data-job="${id}"]`);await waitFor(p,"#ovJob #jIn");
    return E(()=>{const u=document.querySelector("#ovJob .jme .juni");
      return{from:u.dataset.from,uni:u.dataset.uni,art:!!u.querySelector("svg"),ic:u.classList.contains("art")?"":u.textContent,
        sub:document.querySelector("#ovJob .jobsheet > .sub").textContent,tip:[...document.querySelectorAll("#ovJob .jwhat li")].map(l=>l.textContent).find(t=>/in a row/.test(t))||""};});
  };
  const clockIn=async()=>{await p.click("#ovJob #jIn");
    return waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&h&&h.dataset.ans;},{timeout:8000});};
  const header=()=>E(()=>{const b=document.querySelector("#ovJob .bhead"),u=b.querySelector(".jme.small .juni"),t=b.querySelector(".jme.small .jtool");
    return{from:u&&u.dataset.from,uni:u&&u.dataset.uni,art:!!(u&&u.querySelector("svg")),tool:t?t.dataset.tool:"",toolArt:!!(t&&t.querySelector("svg")),
      ready:(document.getElementById("jReady")||{}).textContent||"",dots:document.querySelectorAll("#jTips i").length,tipsTitle:document.getElementById("jTips").title};});
  const clockOut=async()=>{await E(()=>document.getElementById("jOut").click());await waitFor(p,"#ovJob #jBoard");
    await E(()=>document.getElementById("jBoard").click());await waitFor(p,"#ovJob.on .jcard");};

  // ---- 1. no gear: the job's own uniform, five in a row ----
  ok(await E(()=>Store.gearFor("shop","uniform").id==="apron"&&Store.gearFor("shop","tool").id==="scanner"&&Store.gearFor("mow","uniform").id==="gloves"&&Store.gearFor("mow","tool").id==="clippers"&&Store.gearFor("baker","tool")===null),
    "Store.gearFor finds each job's uniform and tool from the Trading Post's items");
  let i=await intro("shop");
  ok(i.from==="job"&&i.ic==="🎽"&&!i.art&&i.sub==="You put on your shop apron!","Shopkeeper, no gear: the job's own uniform, “"+i.sub+"” "+J(i));
  ok(/^🎉 5 right in a row: a tip of 5 🪙$/.test(i.tip),"…and “"+i.tip+"”");
  ok(await clockIn(),"clock in starts the shift");
  let h=await header();
  ok(h.from==="job"&&!h.art&&!h.tool&&!h.ready&&h.dots===5&&/^Five/.test(h.tipsTitle),"shift header, no gear: the job's uniform, no tool, no ready line, 5 tip dots "+J(h));
  ok(await count("Your price scanner is ready!")===0,"no tool, nothing said about one");
  await clockOut();
  i=await intro("mow");
  ok(i.from==="job"&&i.ic==="👒"&&i.sub==="You put on your sun hat!","Lawn mower, no gear: “"+i.sub+"”");
  await E(()=>document.getElementById("jBack").click());await waitFor(p,"#ovJob.on .jcard");

  // ---- 2. the apron from the Trading Post is worn instead ----
  await E(()=>{state.owned.apron=1;});
  i=await intro("shop");
  ok(i.from==="store"&&i.uni==="apron"&&i.art&&i.sub==="You put on your apron!","owning the apron: the clock-in screen shows its picture and “"+i.sub+"” "+J(i));
  ok(/^🎉 5 right in a row/.test(i.tip),"the apron alone doesn't change the tip: “"+i.tip+"”");
  ok(await clockIn(),"clock in with the apron");
  h=await header();
  ok(h.from==="store"&&h.uni==="apron"&&h.art&&!h.tool&&h.dots===5,"shift header: the apron's picture, no tool "+J(h));
  await clockOut();
  await E(()=>{state.owned.gloves=1;});
  i=await intro("mow");
  ok(i.from==="store"&&i.uni==="gloves"&&i.art&&i.sub==="You put on your garden gloves!","owning the garden gloves: “"+i.sub+"”");
  await E(()=>document.getElementById("jBack").click());await waitFor(p,"#ovJob.on .jcard");
  ok(await E(()=>Jobs.uniform("shop").name==="apron"&&Jobs.uniform("mow").name==="garden gloves"&&Jobs.tipAt("shop")===5),"Jobs.uniform gives the store names");

  // ---- 3. the price scanner: beside the uniform, tips at four, its line once a shift ----
  await E(()=>{state.owned.scanner=1;state.jobs.streak=0;});
  i=await intro("shop");
  ok(/^🎉 4 right in a row: a tip of 5 🪙$/.test(i.tip),"owning the price scanner: “"+i.tip+"”");
  await listen();
  ok(await clockIn(),"clock in with the apron and the scanner");
  h=await header();
  ok(h.from==="store"&&h.tool==="scanner"&&h.toolArt&&h.dots===4&&/^Four/.test(h.tipsTitle),"shift header: the apron with the scanner beside it, 4 tip dots "+J(h));
  ok(h.ready==="Your price scanner is ready! Tips come sooner.","the header says “"+h.ready+"”");
  ok(await count("Your price scanner is ready!")===1,"…and it is said: "+J(await said()));
  const said0=await said();
  ok(said0.indexOf("Your price scanner is ready!")===0,"it is said before the first customer's line: "+J(said0.slice(0,2)));
  ok(await E(()=>Jobs.tipAt("shop")===4&&Jobs.tipAt("mow")===5),"Jobs.tipAt: 4 at the Shopkeeper (scanner), 5 at the Lawn mower (no clippers)");
  const c0=await E(()=>state.mine.coins);
  for(let k=0;k<4;k++){
    ok(await doTask(),`task ${k+1} done right the first time`);
    if(k===0)ok(await E(()=>!document.getElementById("jReady")),"after the first task the ready line has gone");
    if(k<3)ok(await E(n=>document.querySelectorAll("#jTips i.on").length===n&&document.querySelectorAll("#jTips i").length===4,k+1),`${k+1} of 4 tip dots lit`);
  }
  await wait(900);
  const t1=await E(()=>({coins:state.mine.coins,streak:state.jobs.streak,tips:Jobs._S().tips}));
  ok(t1.coins-c0===4*3+5&&t1.tips===1&&t1.streak===0,`four right in a row with the scanner: 4 × 3 🪙 and a 5 🪙 tip (got ${t1.coins-c0}) `+J(t1));
  ok(await count("Four in a row! Here is a tip!")===1&&await count("Five in a row! Here is a tip!")===0,"the tip line says four: "+J((await said()).filter(x=>/in a row/.test(x))));
  ok(await count("Your price scanner is ready!")===1,"the ready line was said once this shift");
  // closing the board mid-shift and coming back is the same shift: no second ready line
  await E(()=>Jobs.close());await wait(200);
  await E(()=>Jobs.open());
  ok(await waitFor(p,()=>{const s=Jobs._S(),h=document.getElementById("jQ");return s&&s.task&&h&&h.dataset.ans;},{timeout:8000}),"back to the same shift");
  h=await header();
  ok(!h.ready&&h.tool==="scanner"&&await count("Your price scanner is ready!")===1,"the same shift again: the scanner is still there, its line is not said twice "+J(h));
  await clockOut();
  i=await intro("shop");await clockIn();
  ok(await count("Your price scanner is ready!")===2&&/ready/.test((await header()).ready),"a new shift says it again (once)");
  await clockOut();
  // the hedge clippers (a plural name) at the Lawn mower
  await E(()=>{state.owned.clippers=1;});
  i=await intro("mow");await listen();await clockIn();
  h=await header();
  ok(h.tool==="clippers"&&h.uni==="gloves"&&h.ready==="Your hedge clippers are ready! Tips come sooner."&&await count("Your hedge clippers are ready!")===1&&h.dots===4,
    "Lawn mower with the clippers: “"+h.ready+"”, 4 tip dots");
  await clockOut();
  await E(()=>Jobs.close());await wait(200);
  ok(await E(()=>{const v=Jobs.voiceLines();return["Four in a row! Here is a tip!","Your price scanner is ready!","Your hedge clippers are ready!"].every(x=>v.indexOf(x)>=0);}),
    "the new lines are in Jobs.voiceLines(), so npm run voice:extract lists them");

  // ---- 4. the Trading Post's job gear cards ----
  await E(()=>{delete state.owned.gloves;delete state.owned.clippers;state.jobs.xp.mow=4;Store.open("gear");});await wait(150);
  const cards=()=>E(()=>{const o={};document.querySelectorAll("#stGrid .stcard").forEach(c=>{o[c.dataset.id]=(c.querySelector(".use")||{}).textContent||"";});return o;});
  let c=await cards();
  ok(c.apron==="Worn at the Job board","an owned uniform card: “"+c.apron+"”");
  ok(c.scanner==="Used at the Job board. Tips come sooner!","an owned tool card: “"+c.scanner+"”");
  ok(c.clippers==="Tips come sooner!","a tool not yet his (still locked) says what it does: “"+c.clippers+"”");
  ok(c.gloves===""&&c.miner===""&&c.viking==="","a uniform not yet his and the helmets say nothing extra "+J({gloves:c.gloves,miner:c.miner}));
  await E(()=>{state.jobs.xp.mow=5;Store.open("gear");});await wait(700);
  await p.click('#stGrid .stcard[data-id="gloves"] button');await wait(200);
  c=await cards();
  ok(await E(()=>state.owned.gloves===1)&&c.gloves==="Worn at the Job board","buying the gloves: the card now says “"+c.gloves+"”");
  await E(()=>Store.close());await wait(200);

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
