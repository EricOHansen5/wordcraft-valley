const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const CR=["rabbit","raccoon","penguin","mammoth","crab","lobster","seal","octopus","dolphin","whale","monkey","parrot","sloth","snake","elephant","gorilla","lizard","scorpion","rhino","eagle","sauropod"];
const VS=["v_digger","v_tram","v_dumptruck","v_bulldozer","v_mixer","v_crane","v_monstertruck","v_cablecar","v_submarine","v_rickshaw","v_monorail","v_bullet","v_shuttle"];
const BL=["lighthouse","castle","treasure","tiki","coaster","volcano","mine","dinonest"];
const mk=(biome,extra)=>Object.assign({tour:99,guardians:[0,1,2,3,4,5,6],wordsRead:200,gems:500,rows:9,biome,vehStarter:true,seasonSeen:"autumn",phase:0,
  grid:Object.fromEntries(BL.map((id,i)=>[(2+i*2.5|0)+","+(i%2?6:4),{id,seed:i}])),inventory:{},critters:[],vehicles:[],lastWord:"ship"},extra||{});
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8776,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const p=await b.newPage({viewport:{width:1180,height:820}});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const load=async st=>{await p.goto("http://localhost:8776/");
    await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
      r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
    await p.reload();await p.waitForTimeout(2200);
    await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));window.__fx=0;
      new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&/\b(fx|puff|ring|vshout|beam)\b/.test(n.className))window.__fx++;}))).observe(tilesEl,{childList:true});});};
  const st=mk(6,{critters:CR.map((id,i)=>({id,seed:i,c:(i*3)%22,r:8-(i%4)})),vehicles:VS.map((id,i)=>({u:"n"+i,id,c:(i*5+2)%22,r:8-(i%3),face:i%2?"r":"l"}))});
  await load(st);
  const info=await p.evaluate(()=>({biome:biome().name,crit:CRITTERS.length,veh:VEHICLES.length,bld:BUILDINGS.length,hats:HATS.length,guardians:document.querySelectorAll(".guardian").length,
    missingArt:[...CRITTERS.map(c=>c.id),...VEHICLES.map(v=>v.id),...BUILDINGS.map(b=>b.id),"turtle","orangutan","dodo"].filter(k=>!ART[k]),
    noAntic:CRITTERS.filter(c=>!ANTICS[c.id]).map(c=>c.id)}));
  console.log(JSON.stringify(info));
  await p.screenshot({path:"land_volcano.png"});
  // animals
  const res=[];
  for(const id of CR){
    await p.evaluate(id=>{const cr=state.critters.find(c=>c.id===id);if(cr.out===false)bringOut("critter",cr);bringIntoView(geom(cr.c,cr.r).x);},id);
    await p.waitForTimeout(350);
    const b0=await p.evaluate(()=>window.__fx);
    await p.evaluate(id=>nameThatAnimal(id),id);await p.waitForTimeout(500);
    const d=await p.evaluate(id=>{const cr=state.critters.find(c=>c.id===id);return{fx:window.__fx,busy:!!cr._busy,cls:[...cr._el.classList].filter(c=>c.startsWith("c-")).join(",")};},id);
    if(["gorilla","elephant","whale","lizard"].includes(id))await p.screenshot({path:`new_${id}.png`});
    await p.waitForTimeout(3300);
    res.push(`${id}:${d.fx>b0?"ok":"NOFX"}${d.busy?"":"/NOTBUSY"}${d.cls?"("+d.cls+")":""}`);
  }
  console.log("animals:",res.join(" "));
  // vehicles
  const vr=[];
  for(const [i,id] of VS.entries()){
    await p.evaluate(u=>{const v=state.vehicles.find(x=>x.u===u);if(v.out===false)bringOut("vehicle",v);v.busy=0;bringIntoView(geom(v.c,v.r).x);},"n"+i);await p.waitForTimeout(350);
    const b0=await p.evaluate(()=>window.__fx);
    await p.evaluate(u=>useVehicle(u),"n"+i);await p.waitForTimeout(600);
    const d=await p.evaluate(u=>{const v=state.vehicles.find(x=>x.u===u);return{fx:window.__fx,cls:v._el?[...v._el.classList].filter(c=>!/tile|vehicle|mv-|face|legend|rare|driving/.test(c)).join(","):"noel",shout:[...document.querySelectorAll(".vshout")].map(x=>x.textContent).pop()};},"n"+i);
    if(["v_digger","v_dumptruck","v_crane","v_monstertruck"].includes(id)){await p.waitForTimeout(250);await p.screenshot({path:`new_${id}.png`});}
    await p.waitForTimeout(id==="v_shuttle"?7500:4200);
    const busy=await p.evaluate(u=>!!state.vehicles.find(x=>x.u===u).busy,"n"+i);
    vr.push(`${id}:${d.fx>b0?"ok":"NOFX"}[${d.shout}]${d.cls?"("+d.cls+")":""}${busy?" STILLBUSY":""}`);
  }
  console.log("vehicles:\n  "+vr.join("\n  "));
  // buildings (twice: first pays, second shows the waiting message)
  const br=[];
  for(const id of BL){
    const key=await p.evaluate(id=>{const k=Object.keys(state.grid).find(k=>state.grid[k].id===id);bringIntoView(geom(...k.split(",").map(Number)).x);return k;},id);
    await p.waitForTimeout(300);
    const g0=await p.evaluate(()=>state.gems),b0=await p.evaluate(()=>window.__fx);
    await p.evaluate(([k,id])=>useBuilding(k,id),[key,id]);await p.waitForTimeout(id==="volcano"?800:500);
    if(["lighthouse","volcano","castle","mine"].includes(id))await p.screenshot({path:`bld_${id}.png`});
    await p.waitForTimeout(2600);
    const open=await p.evaluate(()=>[...document.querySelectorAll(".overlay.on")].map(o=>o.id).join(","));
    await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
    const g1=await p.evaluate(()=>state.gems),toastTxt=await p.evaluate(()=>document.getElementById("toast").textContent);
    br.push(`${id}: fx+${(await p.evaluate(()=>window.__fx))-b0} gems+${g1-g0}${open?" overlay="+open:""} "${toastTxt}"`);
  }
  console.log("buildings:\n  "+br.join("\n  "));
  // guardians' books and art
  const books=await p.evaluate(()=>[4,5,6].map(b=>{openBook(b);const t=document.getElementById("bookTitle").textContent,art=document.getElementById("pageArt").innerHTML.length;hide("ovBook");return t+" art:"+art;}));
  console.log("books:",books.join(" | "));
  // lands and scenery pokes
  for(const bi of [4,5]){await load(mk(bi));await p.screenshot({path:`land_${bi}.png`});}
  const pokes=await p.evaluate(()=>{const out={};["palm","shell","coral","herb","hibiscus","rockv","flame","cactus"].forEach(k=>{const el=document.createElement("div");el.className="tile scn";el.innerHTML="<div></div>";
    Object.assign(el.dataset,{scn:k,x:300,y:70,s:60,key:"t"});tilesEl.appendChild(el);const n0=window.__fx;pokeScenery(el);out[k]=window.__fx-n0;el.remove();});return out;});
  console.log("scenery:",JSON.stringify(pokes));
  // hats render
  const hats=await p.evaluate(()=>HATS.slice(6).map(h=>h.id+":"+(ART.buddy(2,mulberry(42),h.id).length>500)).join(" "));
  console.log("hats:",hats);
  // vehicle words
  const words=await p.evaluate(()=>["sub","tram","dump","crane"].map(w=>w+"->"+VEH_WORD[w]+(allWords().some(x=>x.w===w)?"":" NOWORD")+(WORD_ART[w]&&ART[WORD_ART[w]]?"":" NOART")).join(" "));
  console.log("words:",words);
  console.log("errors:",errs.length?errs.slice(0,10):"none");
  await b.close();srv.close();});
