const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8790,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));const cdp=await ctx.newCDPSession(p);
  const touch=async(type,pts)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
  // an OLD mine save (narrow world, before bosses) plus a few valley animals and awake guardians
  const st={tour:99,guardians:[0,1,2],wordsRead:90,gems:20,rows:7,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{},inventory:{},
    critters:[{id:"dog",c:4,r:8,seed:1},{id:"bat",c:8,r:8,seed:2},{id:"bear",c:12,r:8,seed:3},{id:"hen",c:16,r:8,seed:4}],vehicles:[],
    mine:{seed:12345,dug:"AAAA",x:16.2,y:5.05,coins:40,bag:{1:3,3:2},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:0,hairStyle:1,shirt:2,pants:0,helmet:"miner"},
      owned:{miner:1,cap:1},made:true,deepest:12,dugCount:30,orders:2,ordersRight:2,ordersWrong:1,layers:["Dirt"],mineNo:1,eggs:[{at:"2026-01-01"}]}};
  await p.goto("http://localhost:8790/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const crit0=await p.evaluate(()=>state.critters.length);
  await p.click("#mineBtn");await p.waitForTimeout(1000);
  const mig=await p.evaluate(()=>({w:state.mine.w,bag:JSON.stringify(state.mine.bag),coins:state.mine.coins,x:Mine._p.x.toFixed(1),panel:document.querySelector("#mCard h2")?.textContent}));
  console.log("1 old save:",JSON.stringify(mig),"| egg hatched -> animals",crit0,"->",await p.evaluate(()=>state.critters.length),"| eggs left",await p.evaluate(()=>state.mine.eggs.length));
  await p.screenshot({path:"n_hatch.png"});
  await p.click("#mClose");await p.waitForTimeout(300);
  // 2 pets, chosen by tapping the 🐾 pill
  await p.click("#mPet");await p.waitForTimeout(300);
  const petsShown=await p.evaluate(()=>[...document.querySelectorAll(".mpet")].map(e=>e.querySelector("b").textContent+" "+e.querySelector("span").textContent));
  console.log("2 pets offered:",petsShown.join(" | "));
  await p.screenshot({path:"n_pets.png"});
  const needs={};
  for(const id of ["dog","bat","bear"]){await p.click(`.mpet[data-id="${id}"]`);await p.waitForTimeout(150);
    needs[id]=await p.evaluate(()=>document.getElementById("mPet").textContent);}
  console.log("   HUD shows:",JSON.stringify(needs));
  await p.click('.mpet[data-id="dog"]');await p.click("#mClose");await p.waitForTimeout(300);
  // 3 dig down holding only the pick until the Giant Beetle appears
  const box=async s=>{const bb=await (await p.$(s)).boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2];};
  const dig=await box("#mDig");
  await p.evaluate(()=>{for(let y=Mine.SKY;y<Mine.SKY+12;y++)for(let c=24;c<=28;c++)if(Mine._ore(c,y)>=9)Mine._setOre(c,y,0);Mine._p.x=26.2;Mine._p.y=Mine.SKY-.95;});
  await p.waitForTimeout(300);await touch("touchStart",[dig]);
  let boss=null;for(let i=0;i<80;i++){await p.waitForTimeout(150);boss=await p.evaluate(()=>document.getElementById("mPanel").classList.contains("on")&&document.querySelector("#mCard h2")?.textContent);if(boss)break;}
  await touch("touchEnd",[]);
  console.log("3 boss appeared:",boss,"at depth",await p.evaluate(()=>Math.floor(Mine._p.y+Mine._p.h)-Mine.SKY));
  await p.waitForTimeout(500);await p.screenshot({path:"n_boss_intro.png"});
  // fight: answer like a reader would
  await p.click("#mFight");await p.waitForTimeout(400);
  const solve=async(right)=>p.evaluate(right=>{
    const word=document.querySelector(".mword"),big=document.querySelector(".mpic.big");let correct;
    const opts=[...document.querySelectorAll("[data-w]")];
    correct=Mine._ans();
    const pick=right?opts.find(o=>o.dataset.w===correct):opts.find(o=>o.dataset.w!==correct);
    const kind=word?"word->picture":"picture->word ("+opts.map(o=>o.dataset.w).join("/")+")";pick.click();return kind;},right);
  const kinds=[];let shots=0;
  for(let r=0;r<8;r++){const on=await p.evaluate(()=>!!document.querySelector(".mboss.fight"));if(!on)break;
    if(shots<2){await p.screenshot({path:`n_fight${shots}.png`});shots++;}
    kinds.push(await solve(true));await p.waitForTimeout(1400);}
  const won=await p.evaluate(()=>({h:document.querySelector("#mCard h2")?.textContent,beaten:!!state.mine.bosses.beetle,seal:Mine._tile(10,Mine.SKY+10),coins:state.mine.coins}));
  console.log("   rounds:",kinds.join(" | "));console.log("   result:",JSON.stringify(won));
  await p.waitForTimeout(700);await p.screenshot({path:"n_boss_win.png"});
  await p.click("#mClose");await p.waitForTimeout(300);
  // 4 lose to the golem: three wrong answers, sent back up, boss still there
  await p.evaluate(()=>Mine._startBoss(1));await p.waitForTimeout(300);await p.click("#mFight");await p.waitForTimeout(300);
  for(let r=0;r<3;r++){await solve(false);await p.waitForTimeout(2500);}
  console.log("4 lost:",await p.evaluate(()=>document.querySelector("#mCard h2")?.textContent),"| golem still unbeaten:",await p.evaluate(()=>!state.mine.bosses.golem));
  await p.click("#mClose");await p.waitForTimeout(900);
  console.log("   back at the surface:",await p.evaluate(()=>Mine._p.y<Mine.SKY));
  // 5 shiny gem, museum, donate
  await p.evaluate(()=>{const R=Math.random;Math.random=()=>0.001;Mine._collect(30,Mine.SKY+5,3);Math.random=R;Mine._collect(30,Mine.SKY+5,5);});
  console.log("5 bag after shiny:",await p.evaluate(()=>JSON.stringify(state.mine.bag)));
  await p.evaluate(()=>Mine._openMuseum());await p.waitForTimeout(300);await p.screenshot({path:"n_museum.png"});
  const c5=await p.evaluate(()=>state.mine.coins);await p.click('[data-d="23"]');await p.waitForTimeout(200);
  console.log("   donated shiny red gem:",await p.evaluate(()=>!!state.mine.museum[23]),"coins +",(await p.evaluate(()=>state.mine.coins))-c5,"| cases lit:",await p.evaluate(()=>document.querySelectorAll(".mcase.on").length));
  await p.click("#mClose");
  // 6 workbench: TNT recipe, wrong first then right
  await p.evaluate(()=>{state.mine.bag={1:3,3:2,2:2};Mine._openBench();});await p.waitForTimeout(200);
  await p.click('.mrecipe[data-i="0"]');await p.waitForTimeout(200);
  await p.click('#mBagRow .mitem[data-o="1"]');await p.click("#mMake");await p.waitForTimeout(300);
  console.log("6 wrong recipe -> hint shown:",await p.evaluate(()=>!!document.querySelector(".mneed")),"| tnt:",await p.evaluate(()=>state.mine.items.tnt||0));
  await p.screenshot({path:"n_recipe.png"});
  await p.click('#mBagRow .mitem[data-o="1"]');await p.click('#mBagRow .mitem[data-o="1"]');await p.click('#mBagRow .mitem[data-o="3"]');await p.click("#mMake");await p.waitForTimeout(300);
  console.log("   right recipe:",await p.evaluate(()=>document.querySelector("#mCard h2").textContent),"| tnt:",await p.evaluate(()=>state.mine.items.tnt),"| bag:",await p.evaluate(()=>JSON.stringify(state.mine.bag)));
  await p.click("#mClose");
  // 7 TNT blast
  await p.evaluate(()=>{Mine._setTile(34,Mine.SKY+4,0);Mine._setTile(34,Mine.SKY+5,3);Mine._p.x=34.19;Mine._p.y=Mine.SKY+4.079;Mine._p.vy=0;Mine._setOre(35,Mine.SKY+4,5);});await p.waitForTimeout(500);
  const solid0=await p.evaluate(()=>{let n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Mine._tile(34+dx,Mine.SKY+4+dy)!==0)n++;return n;});
  console.log("   miner before blast y",await p.evaluate(()=>Mine._p.y.toFixed(2)));await p.click("#mTnt");await p.waitForTimeout(800);await p.screenshot({path:"n_tnt.png"});await p.waitForTimeout(2200);
  const solid1=await p.evaluate(()=>{let n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(Mine._tile(34+dx,Mine.SKY+4+dy)!==0)n++;return n;});
  console.log("7 TNT: solid blocks around",solid0,"->",solid1,"| blue gem collected:",await p.evaluate(()=>(state.mine.bag[5]||0)+(state.mine.bag[25]||0)>0));
  // 8 tricky orders at a higher reading level, and a promised VIP
  await p.evaluate(()=>{state.settings.tierOverride=6;state.mine.bag={3:3,5:3,6:3,1:3};state.mine.vip={date:today(),g:1,done:false};Mine._p.x=5;Mine._p.y=Mine.SKY-.95;Mine._openShop();});
  await p.waitForTimeout(700);
  const first=await p.evaluate(()=>({vip:!!document.querySelector(".mvip"),who:document.querySelector(".mlabel").textContent,say:document.querySelector(".msay").textContent}));
  console.log("8 first customer:",JSON.stringify(first));await p.screenshot({path:"n_vip.png"});
  const shopSolve=()=>p.evaluate(()=>{const t=document.querySelector(".msay").textContent.toLowerCase();const COL={red:3,blue:5,green:6,pink:7};
    const btn=o=>[...document.querySelectorAll("#mBagRow .mitem")].find(b=>+b.dataset.o===o);let kind;
    let m1=t.match(/not (\w+)/),m2=t.match(/a (\w+) gem or a (\w+) gem/);
    if(m1){kind="NOT";const bad=COL[m1[1]];const b=[...document.querySelectorAll("#mBagRow .mitem")].find(x=>[3,5,6,7,8,9].includes(+x.dataset.o)&&+x.dataset.o!==bad);b.click();}
    else if(m2){kind="OR";const b=btn(COL[m2[1]])||btn(COL[m2[2]]);b.click();}
    else{kind="EXACT";const q={a:1,two:2,three:3};t.replace(/^(i want|can i have)\s*/,"").replace(/[.?!]|, please/g,"").split(" and ").forEach(pt=>{const [n,...r]=pt.trim().split(" ");
      const name=r.join(" "),o=ORES.findIndex(O=>O&&(O.name===name||O.pl===name));for(let k=0;k<(q[n]||1);k++){const b=btn(o);b&&b.click();}});}
    document.getElementById("mGive").click();return kind+": "+t;});
  const c8=await p.evaluate(()=>state.mine.coins);
  console.log("   solved:",await shopSolve());await p.waitForTimeout(1500);
  console.log("   VIP paid:",(await p.evaluate(()=>state.mine.coins))-c8,"coins | vip done:",await p.evaluate(()=>state.mine.vip.done));
  const seen=new Set();
  for(let round=0;round<14;round++){
    const has=await p.evaluate(()=>!!document.querySelector(".msay"));
    if(!has){await p.evaluate(()=>{state.mine.bag={3:3,5:3,6:3,1:3};document.getElementById("mClose")&&document.getElementById("mClose").click();Mine._openShop();});await p.waitForTimeout(500);continue;}
    const r=await shopSolve();seen.add(r.split(":")[0]);if(r.startsWith("NOT")||r.startsWith("OR"))console.log("   ",r);
    await p.waitForTimeout(1400);
  }
  console.log("   order kinds seen:",[...seen].join(","),"| orders right/wrong:",await p.evaluate(()=>state.mine.ordersRight+"/"+state.mine.ordersWrong));
  await p.evaluate(()=>{const c=document.getElementById("mClose");if(c)c.click();});await p.waitForTimeout(400);
  const tease=await p.evaluate(()=>{const e=document.querySelector(".mtease");return e?e.textContent:"(none)";});
  console.log("   shop-closed teaser:",tease,"| next VIP date:",await p.evaluate(()=>state.mine.vip.date));
  await p.evaluate(()=>{const c=document.getElementById("mClose");if(c)c.click();});
  // 9 deep view with pet, radar and darkness
  await p.evaluate(()=>{state.settings.tierOverride=0;const P=Mine._p;for(let y=Mine.SKY+20;y<Mine.SKY+27;y++)for(let x=30;x<33;x++)Mine._setTile(x,y,0);P.x=31.2;P.y=Mine.SKY+25.05;P.vy=0;});
  await p.waitForTimeout(1500);await p.screenshot({path:"n_deep.png"});
  // 10 voice studio lines, save and reload keeps the beaten boss
  console.log("10 studio has mine lines:",await p.evaluate(()=>studioItems().filter(x=>/Thank you!|You beat the boss!/.test(x.label)).length));
  await p.click("#mBack");await p.waitForTimeout(1500);await p.reload();await p.waitForTimeout(2300);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));Mine.enter();});await p.waitForTimeout(700);
  console.log("   after reload: beetle beaten",await p.evaluate(()=>!!state.mine.bosses.beetle),"| its seal row open",await p.evaluate(()=>Mine._tile(40,Mine.SKY+10)===0||Mine._tile(40,Mine.SKY+10)!==10),"| golem seal in place",await p.evaluate(()=>Mine._tile(40,Mine.SKY+35)===10),"| pet",await p.evaluate(()=>state.mine.pet));
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();});
