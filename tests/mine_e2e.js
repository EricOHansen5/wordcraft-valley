const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8780},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:false});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
  const cdp=await ctx.newCDPSession(p);
  const touch=async(type,pts)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
  const st={tour:99,guardians:[0,1,2,3],wordsRead:80,gems:20,rows:7,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{},inventory:{},
    critters:[{id:"fox",c:5,r:8,seed:1},{id:"pig",c:9,r:8,seed:2},{id:"bear",c:14,r:8,seed:3}],vehicles:[]};
  await p.goto("http://localhost:8780/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  await p.click("#mineBtn");await p.waitForTimeout(900);
  console.log("mine open:",await p.evaluate(()=>Mine._running()),"| first-run panel:",await p.evaluate(()=>document.querySelector("#mCard h2")?.textContent));
  // design the miner with taps
  await p.click('.msw[data-k="skin"][data-v="2"]');await p.click('.mtag[data-k="hairStyle"][data-v="1"]');await p.click('.msw[data-k="shirt"][data-v="2"]');
  await p.waitForTimeout(200);await p.screenshot({path:"m_wardrobe.png"});
  await p.click("#mClose");await p.waitForTimeout(600);
  await p.evaluate(()=>{state.mine.bosses={beetle:1,golem:1,troll:1,worm:1,dragon:1};Mine._gen();});
  const box=async s=>{const b=await (await p.$(s)).boundingBox();return[b.x+b.width/2,b.y+b.height/2];};
  const joy=await box("#mJoy"),dig=await box("#mDig"),jump=await box("#mJump");
  await p.screenshot({path:"m_surface.png"});
  // walk right with the joystick
  const x0=await p.evaluate(()=>Mine._p.x);
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]+60,joy[1]]]);await p.waitForTimeout(700);await touch("touchEnd",[]);
  const x1=await p.evaluate(()=>Mine._p.x);console.log("walked:",x0.toFixed(2),"->",x1.toFixed(2));
  // plant ores straight down, then dig down holding joystick down + dig together
  await p.evaluate(()=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2);[1,2,3].forEach(d=>Mine._setOre(cx,Mine.SKY+d,[0,3,5,1][d]));});
  const y0=await p.evaluate(()=>Mine._p.y);
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0],joy[1]+60]]);await touch("touchStart",[[joy[0],joy[1]+60],dig]);
  await p.waitForTimeout(5200);await touch("touchEnd",[]);await p.waitForTimeout(400);
  const after=await p.evaluate(()=>({y:Mine._p.y,bag:state.mine.bag,dug:state.mine.dugCount}));
  console.log("dug down:",y0.toFixed(2),"->",after.y.toFixed(2),"| blocks:",after.dug,"| bag:",JSON.stringify(after.bag));
  await p.screenshot({path:"m_dig.png"});
  console.log("around:",await p.evaluate(()=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2),row=Math.floor(P.y+P.h/2);
    return{cx,row,below:Mine._tile(cx,row+1),right:Mine._tile(cx+1,row),left:Mine._tile(cx-1,row),toast:document.getElementById("mToast").textContent,
      pick:state.mine.pick,face:P.face,paused:Mine._paused(),panel:document.getElementById("mPanel").className};}));
  // dig sideways
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]+60,joy[1]]]);await touch("touchStart",[[joy[0]+60,joy[1]],dig]);
  await p.waitForTimeout(1600);await touch("touchEnd",[]);
  await p.waitForTimeout(300);console.log("dug sideways, blocks now:",await p.evaluate(()=>state.mine.dugCount),"x:",(await p.evaluate(()=>Mine._p.x)).toFixed(2));
  // word stone below: dig it, the panel opens
  await p.evaluate(()=>{const P=Mine._p,cx=Math.floor(P.x+P.w/2),by=Math.floor(P.y+P.h+.05);Mine._setOre(cx,by,9);});
  await touch("touchStart",[[joy[0],joy[1]+60],dig]);await p.waitForTimeout(1400);await touch("touchEnd",[]);await p.waitForTimeout(500);
  const ws=await p.evaluate(()=>({h:document.querySelector("#mCard h2")?.textContent,word:document.querySelector(".mword")?.textContent,paused:Mine._paused()}));
  console.log("word stone:",JSON.stringify(ws));
  await p.screenshot({path:"m_wordstone.png"});
  if(ws.word){const wrong=await p.$(`.mpic:not([data-w="${ws.word}"])`);await wrong.click();await p.waitForTimeout(300);
    console.log("after a miss, hear button:",await p.evaluate(()=>getComputedStyle(document.querySelector("#mHear")).visibility));
    await p.click(`.mpic[data-w="${ws.word}"]`);await p.waitForTimeout(1300);
    console.log("magic gems:",await p.evaluate(()=>state.mine.bag[9]||0),"| panel closed:",await p.evaluate(()=>!Mine._paused()));}
  // climb check: build a shaft and climb out holding up
  // back to surface with the elevator
  console.log("elevator visible when deep:",await p.evaluate(()=>getComputedStyle(document.getElementById("mUp")).display!=="none"),"depth y:",(await p.evaluate(()=>Mine._p.y)).toFixed(2));
  if(await p.evaluate(()=>getComputedStyle(document.getElementById("mUp")).display!=="none"))await p.click("#mUp");else await p.evaluate(()=>{Mine._p.x=16.2;Mine._p.y=Mine.SKY-.95;});
  await p.waitForTimeout(900);
  console.log("surface y:",(await p.evaluate(()=>Mine._p.y)).toFixed(2));
  // walk left to the shop until the action button shows
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]-60,joy[1]]]);
  for(let i=0;i<40;i++){await p.waitForTimeout(100);const t=await p.evaluate(()=>{const a=document.getElementById("mAct");return a.style.display!=="none"?a.textContent:"";});if(t.includes("shop")&&!t.includes("Pick"))break;}
  await touch("touchEnd",[]);await p.waitForTimeout(300);
  console.log("action button:",await p.evaluate(()=>document.getElementById("mAct").style.display!=="none"&&document.getElementById("mAct").textContent),"x:",(await p.evaluate(()=>Mine._p.x)).toFixed(2));
  await p.screenshot({path:"m_town.png"});
  // make sure there is stock, open shop
  await p.evaluate(()=>{state.mine.bag={3:3,1:2,5:1,9:1};state.stats=state.stats||{};});
  await p.evaluate(()=>{const a=document.getElementById("mAct");if(a.style.display==="none")Mine._openShop();else a.click();});
  await p.waitForTimeout(600);
  const order=await p.evaluate(()=>document.querySelector(".msay")?.textContent);console.log("order 1:",order);
  await p.screenshot({path:"m_shop.png"});
  // wrong answer first: give the first bag item that is not asked for (or too many)
  const c0=await p.evaluate(()=>state.mine.coins);
  await p.evaluate(()=>{document.querySelector("#mBagRow .mitem").click();document.querySelector("#mBagRow .mitem").click();document.querySelector("#mBagRow .mitem")&&document.querySelector("#mBagRow .mitem").click();});
  await p.click("#mGive");await p.waitForTimeout(500);
  console.log("wrong -> hear button shown:",await p.evaluate(()=>document.querySelector("#mHear").style.display!=="none"),"| coins same:",c0===await p.evaluate(()=>state.mine.coins));
  // now answer correctly by reading the order text the way he would
  const solve=async()=>p.evaluate(()=>{
    const txt=document.querySelector(".msay").textContent.toLowerCase();const qty={a:1,two:2,three:3};
    const bagBtns=()=>[...document.querySelectorAll("#mBagRow .mitem")];
    ORES.forEach((O,o)=>{if(!O)return;[O.pl,O.name].forEach(n=>{});});
    const parts=txt.replace(/^(i want|can i have)\s*/,"").replace(/[.?!]|, please/g,"").split(" and ");
    parts.forEach(pt=>{const [q,...rest]=pt.trim().split(" ");const n=qty[q]||1,name=rest.join(" ");
      const o=ORES.findIndex(O=>O&&(O.name===name||O.pl===name));
      for(let k=0;k<n;k++){const b=bagBtns().find(b=>+b.dataset.o===o);b&&b.click();}});
    document.getElementById("mGive").click();return parts;});
  console.log("solved:",JSON.stringify(await solve()));await p.waitForTimeout(1500);
  console.log("coins",c0,"->",await p.evaluate(()=>state.mine.coins),"| orders right:",await p.evaluate(()=>state.mine.ordersRight),"| gems:",await p.evaluate(()=>state.gems));
  // serve the rest until closed
  for(let k=0;k<4;k++){const has=await p.evaluate(()=>!!document.querySelector(".msay"));if(!has)break;await solve();await p.waitForTimeout(1500);}
  console.log("shop end:",await p.evaluate(()=>document.querySelector("#mCard h2").textContent+" | "+document.querySelector("#mCard .sub").textContent));
  await p.screenshot({path:"m_shopend.png"});
  await p.click("#mClose");
  // pick shop: buy a pick
  await p.evaluate(()=>{state.mine.coins=500;Mine._openSmith();});await p.waitForTimeout(300);
  await p.screenshot({path:"m_smith.png"});
  await p.click('.msmith [data-i="0"]');await p.waitForTimeout(300);
  console.log("pick now:",await p.evaluate(()=>PICKS[state.mine.pick].name),"coins:",await p.evaluate(()=>state.mine.coins));
  await p.click("#mClose");
  // deep view with darkness
  await p.evaluate(()=>{const P=Mine._p;for(let y=Mine.SKY;y<Mine.SKY+48;y++){Mine._setTile(20,y,0);Mine._setTile(21,y,0);}for(let x=16;x<30;x++)Mine._setTile(x,Mine.SKY+47,0);P.x=22;P.y=Mine.SKY+46.05;});
  await p.waitForTimeout(1200);await p.screenshot({path:"m_deep.png"});
  // climb: stand in the 2-wide shaft next to the wall and push up
  await p.evaluate(()=>{const P=Mine._p;for(let y=Mine.SKY+1;y<Mine.SKY+12;y++)Mine._setTile(24,y,0);Mine._setTile(24,Mine.SKY+12,3);Mine._setTile(23,Mine.SKY+11,3);Mine._setTile(25,Mine.SKY+11,3);P.x=24.19;P.y=Mine.SKY+10.05;P.vy=0;});await p.waitForTimeout(500);
  const yc=await p.evaluate(()=>Mine._p.y);
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0],joy[1]-60]]);await p.waitForTimeout(1500);await touch("touchEnd",[]);
  console.log("climbed:",yc.toFixed(2),"->",(await p.evaluate(()=>Mine._p.y)).toFixed(2));
  // jump
  await p.evaluate(()=>{const P=Mine._p;P.x=18;P.y=Mine.SKY-.95;P.vy=0;});await p.waitForTimeout(400);
  await touch("touchStart",[jump]);await p.waitForTimeout(150);const yj=await p.evaluate(()=>Mine._p.y);await touch("touchEnd",[]);
  console.log("jump went up:",yj<Mine_SKY_dummy(),"");
  function Mine_SKY_dummy(){return 5.9;}
  // leave, reload, come back: everything kept
  const before=await p.evaluate(()=>({bag:JSON.stringify(state.mine.bag),coins:state.mine.coins,dug:state.mine.dugCount,look:JSON.stringify(state.mine.look)}));
  await p.click("#mBack");await p.waitForTimeout(1500);
  console.log("back in valley:",await p.evaluate(()=>!Mine._running()));
  await p.reload();await p.waitForTimeout(2500);await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  await p.click("#mineBtn");await p.waitForTimeout(800);
  const aft=await p.evaluate(()=>({bag:JSON.stringify(state.mine.bag),coins:state.mine.coins,dug:state.mine.dugCount,look:JSON.stringify(state.mine.look),shaft:Mine._tile(20,Mine.SKY+10),panel:document.getElementById("mPanel").classList.contains("on")}));
  console.log("persisted:",JSON.stringify(before)===JSON.stringify({bag:aft.bag,coins:aft.coins,dug:aft.dug,look:aft.look}),"| shaft still dug:",aft.shaft===0,"| no first-run panel:",!aft.panel);
  console.log("quests:",await p.evaluate(()=>JSON.stringify(state.quests.list.map(q=>q.k+":"+q.p))));
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();});
