const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8786},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));const cdp=await ctx.newCDPSession(p);
  const touch=async(type,pts)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
  await p.goto("http://localhost:8786/");await p.waitForTimeout(1800);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.mine=def().mine;Mine.enter();state.mine.bosses={beetle:1,golem:1,troll:1,worm:1,dragon:1};Mine._gen();});
  await p.waitForTimeout(400);await p.evaluate(()=>document.getElementById("mClose").click());
  const box=async s=>{const b=await (await p.$(s)).boundingBox();return[b.x+b.width/2,b.y+b.height/2];};
  const joy=await box("#mJoy"),dig=await box("#mDig");
  // clear word stones and chests out of the test columns so nothing pauses the dig
  const place=async(x)=>p.evaluate(x=>{for(let y=Mine.SKY;y<Mine.SKY+60;y++)for(let c=x-1;c<=x+1;c++)if(Mine._ore(c,y)>=9)Mine._setOre(c,y,0);
    const P=Mine._p;P.x=x+.47;P.y=Mine.SKY-.95;P.vy=0;},x);   // .47: standing across two columns on purpose
  const depth=()=>p.evaluate(()=>Math.max(0,Math.floor(Mine._p.y+Mine._p.h)-Mine.SKY));
  // A: hold only the pick
  await place(22);await p.waitForTimeout(400);
  await touch("touchStart",[dig]);const trace=[];
  for(let i=0;i<12;i++){await p.waitForTimeout(500);trace.push(await depth());}
  await touch("touchEnd",[]);
  console.log("A  hold ⛏️ only, depth every 0.5s:",trace.join(" "),"| toast:",await p.evaluate(()=>document.getElementById("mToast").textContent));
  // B: pick plus a sloppy diagonal thumb
  await place(28);await p.waitForTimeout(400);
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]+25,joy[1]+18]]);await touch("touchStart",[[joy[0]+25,joy[1]+18],dig]);
  await p.waitForTimeout(3000);const bx=await p.evaluate(()=>Mine._in.jx.toFixed(2)+","+Mine._in.jy.toFixed(2));await touch("touchEnd",[]);
  console.log("B  sloppy thumb (stick",bx+") + ⛏️ for 3s, depth:",await depth());
  // C: stick clearly right + pick digs sideways
  const c0=await p.evaluate(()=>({x:Mine._p.x,n:state.mine.dugCount}));
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0]+60,joy[1]]]);await touch("touchStart",[[joy[0]+60,joy[1]],dig]);
  await p.waitForTimeout(2000);await touch("touchEnd",[]);
  const c1=await p.evaluate(()=>({x:Mine._p.x,n:state.mine.dugCount}));
  console.log("C  stick right + ⛏️: moved",(c1.x-c0.x).toFixed(2),"blocks right, dug",c1.n-c0.n);
  // D: stick up + pick digs up
  await p.evaluate(()=>{const P=Mine._p;const cx=Math.floor(P.x+P.w/2);Mine._setTile(cx,Math.floor(P.y)-1,3);});await p.waitForTimeout(200);
  const d0=await p.evaluate(()=>({y:Mine._p.y,above:Mine._tile(Math.floor(Mine._p.x+Mine._p.w/2),Math.floor(Mine._p.y)-1)}));
  await touch("touchStart",[joy]);await touch("touchMove",[[joy[0],joy[1]-60]]);await touch("touchStart",[[joy[0],joy[1]-60],dig]);
  await p.waitForTimeout(1200);await touch("touchEnd",[]);
  const d1=await p.evaluate(()=>Mine._tile(Math.floor(Mine._p.x+Mine._p.w/2),Math.floor(Mine._p.y)-1));
  console.log("   pos",await p.evaluate(()=>JSON.stringify({x:Mine._p.x.toFixed(2),y:Mine._p.y.toFixed(2),g:Mine._p.onGround})));console.log("D  stick up + ⛏️: block above was",d0.above,"now",d1,"(0 = dug out)");
  // E: hit the Deep Rock with the starting pick: the message says what to buy
  await p.evaluate(()=>{const P=Mine._p;for(let y=Mine.SKY;y<Mine.SKY+40;y++){Mine._setTile(34,y,0);}for(let y=Mine.SKY;y<Mine.SKY+48;y++)if(Mine._tile(34,y)===0&&y>Mine.SKY+38)Mine._setTile(34,y,4);P.x=34.19;P.y=Mine.SKY+38.05;P.vy=0;});
  await p.waitForTimeout(700);await touch("touchStart",[dig]);await p.waitForTimeout(800);await touch("touchEnd",[]);
  console.log("E  deep rock:",await p.evaluate(()=>document.getElementById("mToast").textContent));
  console.log("errors:",errs.length?errs:"none");await b.close();srv.close();});
