const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8787},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const cdp=await ctx.newCDPSession(p);
  const touch=async(type,pts)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
  await p.goto("http://localhost:8787/");await p.waitForTimeout(1800);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.mine=def().mine;Mine.enter();});
  await p.waitForTimeout(400);await p.evaluate(()=>document.getElementById("mClose").click());
  // a one-block pocket at depth 10 with stone above and below
  const R=Mine_SKY=>0;
  await p.evaluate(()=>{const S=Mine.SKY,x=25,y=S+10;Mine._setTile(x,y,0);Mine._setTile(x,y-1,3);Mine._setTile(x,y+1,3);Mine._setOre(x,y-1,0);
    const P=Mine._p;P.x=x+.19;P.y=y+.079;P.vy=0;});
  await p.waitForTimeout(500);
  const box=async s=>{const b=await (await p.$(s)).boundingBox();return[b.x+b.width/2,b.y+b.height/2];};
  const joy=await box("#mJoy"),dig=await box("#mDig");
  const before=await p.evaluate(()=>Mine._tile(25,Mine.SKY+9));
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0],joy[1]-60]]);await touch("touchStart",[[joy[0],joy[1]-60],dig]);
  await p.waitForTimeout(900);await touch("touchEnd",[]);
  console.log("block above:",before,"->",await p.evaluate(()=>Mine._tile(25,Mine.SKY+9)),"(0 = dug out) | miner x",await p.evaluate(()=>Mine._p.x.toFixed(2)));
  await b.close();srv.close();});
