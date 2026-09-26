const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8774,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const p=await b.newPage({viewport:{width:1180,height:820}});
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const out={};
  for(const biome of [0,1,2]){
    const st={tour:99,guardians:[0,1,2,3],wordsRead:60,gems:100,rows:7,biome,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{},inventory:{lantern:{n:1,lv:1}},critters:[],vehicles:[]};
    await p.goto("http://localhost:8774/");
    await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
      r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
    await p.reload();await p.waitForTimeout(2200);
    await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));window.__fx=0;
      new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&/\b(fx|puff|ring)\b/.test(n.className))window.__fx++;}))).observe(tilesEl,{childList:true});});
    const hs=await p.$$(".scn .hitpad");
    for(const h of hs){const kind=await h.evaluate(n=>n.parentElement.dataset.scn);if(out[kind])continue;
      await h.evaluate(n=>bringIntoView(+n.parentElement.dataset.x));await p.waitForTimeout(300);
      const bb=await h.boundingBox();if(!bb||bb.x<0||bb.x>1180)continue;
      const b0=await p.evaluate(()=>window.__fx);await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(200);
      if(await p.evaluate(()=>window.__fx)>b0)out[kind]=1;}
    if(biome===0){await p.waitForTimeout(100);await p.screenshot({path:"scn_meadow.png"});
      // placing: click a scenery hitpad while holding the lantern
      const r=await p.evaluate(()=>{state.selected="lantern";renderWorld();const h=[...document.querySelectorAll(".scn .hitpad")].map(n=>n.getBoundingClientRect()).find(r=>r.left>60&&r.right<1100&&r.top>100&&document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).some(n=>n.closest(".slot-empty")));
        return h&&{x:h.left+h.width/2,y:h.top+h.height/2};});
      if(r){await p.mouse.click(r.x,r.y);await p.waitForTimeout(300);
        console.log("tap on scenery while placing -> lantern placed:",await p.evaluate(()=>Object.values(state.grid).some(c=>c.id==="lantern")),"| selection:",await p.evaluate(()=>state.selected));}}
  }
  console.log("scenery kinds with effects:",Object.keys(out).join(","));
  console.log("errors:",errs.length?errs:"none");await b.close();srv.close();});
