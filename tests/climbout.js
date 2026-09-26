const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8788,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));const cdp=await ctx.newCDPSession(p);
  const touch=async(type,pts)=>cdp.send("Input.dispatchTouchEvent",{type,touchPoints:pts.map(([x,y],i)=>({x,y,id:i+1}))});
  await p.goto("http://localhost:8788/");await p.waitForTimeout(1800);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.mine=null;Mine.enter();state.mine.bosses={beetle:1,golem:1,troll:1,worm:1,dragon:1};Mine._gen();});
  await p.waitForTimeout(400);await p.evaluate(()=>document.getElementById("mClose").click());
  const box=async s=>{const b=await (await p.$(s)).boundingBox();return[b.x+b.width/2,b.y+b.height/2];};
  const joy=await box("#mJoy"),dig=await box("#mDig");
  const st=()=>p.evaluate(()=>{const P=Mine._p;return{x:+P.x.toFixed(2),feet:+(P.y+P.h).toFixed(2),ground:P.onGround,depth:Math.max(0,Math.floor(P.y+P.h)-Mine.SKY)};});
  const clean=x=>p.evaluate(x=>{for(let y=Mine.SKY;y<Mine.SKY+70;y++)for(let c=x-2;c<=x+2;c++){if(Mine._ore(c,y)>=9)Mine._setOre(c,y,0);if(Mine._tile(c,y)===0&&y>Mine.SKY)Mine._setTile(c,y,y-Mine.SKY<11?2:3);}},x);
  async function run(label,x,holdDig,face,wide){
    await clean(x);
    await p.evaluate(([x,face])=>{const P=Mine._p;P.x=x+.19;P.y=Mine.SKY-.95;P.vy=0;P.face=face;},[x,face]);await p.waitForTimeout(300);
    if(wide)await p.evaluate(([x,n])=>{for(let y=Mine.SKY;y<Mine.SKY+n;y++){Mine._setTile(x,y,0);Mine._setTile(x+1,y,0);}Mine._p.x=x+.19;Mine._p.y=Mine.SKY+n-1-.95+1;},[x,wide]);
    else{await touch("touchStart",[dig]);await p.waitForTimeout(holdDig);await touch("touchEnd",[]);}
    await p.waitForTimeout(600);const bottom=await st();
    await p.evaluate(f=>Mine._p.face=f,face);
    await touch("touchStart",[joy]);await touch("touchMove",[[joy[0],joy[1]-65]]);
    let out=null;for(let i=0;i<60;i++){await p.waitForTimeout(100);const s=await st();if(s.depth===0&&s.ground&&s.feet<=Mine_SKY()+.01){out={s,t:(i+1)/10};break;}}
    await touch("touchEnd",[]);await p.waitForTimeout(400);const end=await st();
    console.log(`${label}: bottom depth ${bottom.depth} -> ${out?`OUT on the grass in ${out.t}s at x ${out.s.x}`:"STILL IN THE HOLE"} | resting: depth ${end.depth}, on ground ${end.ground}`);
  }
  function Mine_SKY(){return 6;}
  await run("shallow hole, facing right",22,2600,1);
  await run("shallow hole, facing left ",26,2600,-1);
  await run("deep hole (to stone)      ",30,9000,1);
  await run("2-wide hole                ",35,0,1,6);
  console.log("errors:",errs.length?errs:"none");await b.close();srv.close();});
