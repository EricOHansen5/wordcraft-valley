const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8794},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const p=await b.newPage({viewport:{width:1180,height:820}});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto("http://localhost:8794/");await p.waitForTimeout(1800);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.mine=Object.assign(def().mine,{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:0,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},owned:{miner:1,cap:1},made:true,bosses:{beetle:1,golem:1,troll:1,worm:1},eggs:[]});Mine.enter();});
  await p.waitForTimeout(600);for(let i=0;i<4;i++){await p.evaluate(()=>{const b=document.querySelector("#mPanel.on #mClose");if(b)b.click();});await p.waitForTimeout(200);}
  console.log("paused:",await p.evaluate(()=>Mine._paused()));
  // a stone corridor at depth 8: air at x=25, stone to the left and right, floor below
  const setup=()=>p.evaluate(()=>{const S=Mine.SKY,y=S+8;for(let x=22;x<=29;x++){Mine._setTile(x,y,3);Mine._setOre(x,y,0);Mine._setTile(x,y+1,3);Mine._setTile(x,y-1,3);}
    Mine._setTile(25,y,0);const P=Mine._p;P.x=25.19;P.y=y+.079;P.vy=0;});
  const t=(x)=>p.evaluate(x=>Mine._tile(x,Mine.SKY+8),x);
  const run=async(name,fn,x)=>{await setup();await p.waitForTimeout(300);await fn();await p.waitForTimeout(100);
    console.log((await t(x))===0?"PASS":"FAIL",name,"| miner x",await p.evaluate(()=>Mine._p.x.toFixed(2)));};
  await run("hold D + hold J digs right",async()=>{await p.keyboard.down("d");await p.keyboard.down("j");await p.waitForTimeout(700);console.log(await p.evaluate(()=>JSON.stringify({in:Mine._in,p:Mine._p,run:Mine._running(),pa:Mine._paused(),toast:document.getElementById("mToast").textContent})));await p.waitForTimeout(800);await p.keyboard.up("j");await p.keyboard.up("d");},26);
  await run("hold A + hold Shift digs left",async()=>{await p.keyboard.down("a");await p.keyboard.down("Shift");await p.waitForTimeout(1500);await p.keyboard.up("Shift");await p.keyboard.up("a");},24);
  await run("Caps: hold D (as 'D') + X digs right",async()=>{await p.keyboard.down("D");await p.keyboard.down("x");await p.waitForTimeout(1500);await p.keyboard.up("x");await p.keyboard.up("D");},26);
  // mouse on the ⛏️ button while holding D (key repeat used to cancel the dig)
  await run("hold D + mouse on the pick button digs right",async()=>{const bb=await (await p.$("#mDig")).boundingBox();
    await p.keyboard.down("d");await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();
    for(let i=0;i<30;i++){await p.keyboard.down("d");await p.waitForTimeout(50);} // simulated key repeat
    await p.mouse.up();await p.keyboard.up("d");},26);
  await run("J alone digs down",async()=>{await p.keyboard.down("j");await p.waitForTimeout(1500);await p.keyboard.up("j");},25).catch(()=>{});
  console.log("   down check: floor tile",await p.evaluate(()=>Mine._tile(25,Mine.SKY+9)));
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();});
