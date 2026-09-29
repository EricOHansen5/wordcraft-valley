const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const CR=["dog","fox","cat","hen","pig","duck","frog","fish","bug","bat","croc","shark","wolf","bear","boar","tiger","hawk","lion","trex","dragon"];
const VS=["v_taxi","v_bus","v_van","v_pickup","v_truck","v_suv","v_scooter","v_sailboat","v_ship","v_car"];
const st={tour:99,guardians:[0,1,2,3],wordsRead:60,gems:100,rows:7,biome:3,vehStarter:true,seasonSeen:"autumn",phase:0,
  grid:{"3,8":{id:"well",seed:1},"14,8":{id:"barn",seed:3}},inventory:{lantern:{n:1,lv:1}},
  critters:CR.map((id,i)=>({id,seed:i,c:(i*3)%22,r:8-(i%4)})),
  vehicles:VS.map((id,i)=>({u:"u"+i,id,c:(i*5+2)%22,r:8-(i%3),face:i%2?"r":"l"}))};
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8772,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const p=await b.newPage({viewport:{width:1180,height:820}});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
  await p.goto("http://localhost:8772/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);
    r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();
  // wait for the boot rather than a fixed sleep: on a loaded CI runner 2.5 s was not always enough
  await p.waitForFunction(()=>typeof state!=="undefined"&&state&&Array.isArray(state.critters)&&typeof geom==="function",null,{timeout:20000}).catch(()=>{});await p.waitForTimeout(1200);
  await p.evaluate(()=>{window.__fx=0;new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&(n.classList.contains("fx")||n.classList.contains("ring")||n.classList.contains("puff")||n.classList.contains("vshout")))window.__fx++;}))).observe(tilesEl,{childList:true});});
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const g0=await p.evaluate(()=>state.gems);
  // every animal via real click on its hitpad
  const res=[];
  for(const id of CR){
    await p.evaluate(id=>{const cr=state.critters.find(c=>c.id===id);if(cr.out===false)bringOut("critter",cr);bringIntoView(geom(cr.c,cr.r).x);},id);
    await p.waitForTimeout(450);
    const el=await p.$(`.critter[data-critter="${id}"] .hitpad`);const bb=el&&await el.boundingBox();
    if(!bb){res.push(id+":nobox");continue;}
    const before=await p.evaluate(()=>window.__fx);
    await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);
    await p.waitForTimeout(500);
    const during=await p.evaluate(id=>{const cr=state.critters.find(c=>c.id===id);
      return{fx:window.__fx,busy:!!cr._busy,cls:[...cr._el.classList].filter(c=>c.startsWith("c-")).join(",")};},id);
    if(["hen","lion","trex","dragon","wolf"].includes(id))await p.screenshot({path:`antic_${id}.png`});
    await p.waitForTimeout(3000);
    const after=await p.evaluate(id=>!!state.critters.find(c=>c.id===id)._busy,id);
    res.push(`${id}:${during.fx>before?"fx":"NOFX"}${during.busy?"":"/NOTBUSY"}${after?"/STUCK":""}${during.cls?"("+during.cls+")":""}`);
  }
  console.log("animals:",res.join(" "));
  // vehicles
  const vr=[];
  for(const [i,id] of VS.entries()){
    await p.evaluate(u=>{const v=state.vehicles.find(x=>x.u===u);if(v.out===false)bringOut("vehicle",v);bringIntoView(geom(v.c,v.r).x);},"u"+i);await p.waitForTimeout(400);
    const el=await p.$(`.vehicle[data-u="u${i}"] .hitpad`);const bb=el&&await el.boundingBox();
    if(!bb){vr.push(id+":nobox");continue;}
    await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);
    await p.waitForTimeout(700);
    const mid=await p.evaluate(()=>({riding:document.querySelectorAll(".critter.riding").length,shout:[...document.querySelectorAll(".vshout")].map(x=>x.textContent).join("|")}));
    if(id==="v_bus")await p.screenshot({path:"antic_bus.png"});
    await p.waitForTimeout(5000);
    const end=await p.evaluate(u=>{const v=state.vehicles.find(x=>x.u===u);return{busy:!!v.busy,riding:document.querySelectorAll(".critter.riding").length,
      stuck:state.critters.filter(c=>c._busy).length};},"u"+i);
    vr.push(`${id}:[${mid.shout}]${mid.riding?" riders="+mid.riding:""}${end.busy?" BUSY":""}${end.riding?" STILLRIDING":""}${end.stuck?" critStuck="+end.stuck:""}`);
  }
  console.log("vehicles:",vr.join("\n  "));
  // scenery pokes via real clicks
  const kinds=await p.evaluate(()=>[...new Set([...document.querySelectorAll(".scn")].map(e=>e.dataset.scn))]);
  let poked=0;const seen=new Set();
  const scns=await p.$$(".scn .hitpad");
  for(const h of scns){
    const kind=await h.evaluate(n=>n.parentElement.dataset.scn);if(seen.has(kind))continue;
    await h.evaluate(n=>{bringIntoView(+n.parentElement.dataset.x);});await p.waitForTimeout(350);
    const bb=await h.boundingBox();if(!bb)continue;
    const top=await p.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return e&&e.closest(".scn")?1:0;},{x:bb.x+bb.width/2,y:bb.y+bb.height/2});
    if(!top)continue;
    const before=await p.evaluate(()=>document.querySelectorAll(".fx,.puff,.ring").length);
    await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(250);
    const aft=await p.evaluate(()=>document.querySelectorAll(".fx,.puff,.ring").length);
    if(aft>before){seen.add(kind);poked++;}
  }
  console.log("scenery kinds in biome:",kinds.join(","),"| poked with effects:",[...seen].join(","));
  // placing mode: a tap on scenery still reaches the spot underneath
  const place=await p.evaluate(()=>{state.selected="lantern";
    const s=[...document.querySelectorAll(".scn")].find(e=>{const r=e.getBoundingClientRect();
      return r.left>0&&r.right<innerWidth&&[...document.elementsFromPoint(r.left+r.width/2,r.bottom-r.height*.2)].some(n=>n.closest&&n.closest(".slot-empty"));});
    if(!s)return "no overlapping scenery found";const r=s.getBoundingClientRect();return{x:r.left+r.width/2,y:r.bottom-r.height*.2};});
  if(typeof place==="object"){await p.mouse.click(place.x,place.y);await p.waitForTimeout(300);
    console.log("placed through scenery:",await p.evaluate(()=>Object.values(state.grid).some(c=>c.id==="lantern")));}else console.log("placing:",place);
  console.log("gems",g0,"->",await p.evaluate(()=>state.gems),"| quests poke:",await p.evaluate(()=>JSON.stringify((state.quests.list||[]).map(q=>q.k+":"+q.p))));
  console.log("errors:",errs.length?errs.slice(0,8):"none");
  await b.close();srv.close();});
