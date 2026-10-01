const {chromium}=require("playwright");const http=require("http"),fs=require("fs"),path=require("path");
// the shell the service worker keeps (sw.js SHELL), and the data scripts the page loads
const SHELL=Function("return "+fs.readFileSync(path.join(__dirname,"../app/sw.js"),"utf8").match(/const SHELL\s*=\s*(\[[\s\S]*?\]);/)[1])();
const DATA=require("./page").scripts();
const ok=(c,m)=>{if(!c)process.exitCode=1;console.log((c?"PASS ":"FAIL ")+m);};
const srv=require("./page").serveApp({port:8771,static:true},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const ctx=await b.newContext({viewport:{width:1180,height:820},acceptDownloads:true});const p=await ctx.newPage();
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto("http://localhost:8771/");await p.waitForTimeout(2500);
  const man=await p.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');const j=await (await fetch(l.href)).json();return j.name+" icons:"+j.icons.length;});
  console.log("manifest:",man);
  await p.evaluate(()=>navigator.serviceWorker.ready);
  await p.reload();await p.waitForTimeout(1500);
  console.log("SW controlling:",await p.evaluate(()=>!!navigator.serviceWorker.controller));
  // after install, the shell cache holds every SHELL file, the data scripts among them
  const cached=await p.evaluate(async()=>{const k=(await caches.keys()).filter(n=>/^wcv-/.test(n)&&n!=="wcv-voice-1");
    const out=[];for(const n of k)(await (await caches.open(n)).keys()).forEach(r=>out.push(new URL(r.url).pathname));return {names:k,paths:out};});
  const want=SHELL.map(f=>f==="./"?"/":"/"+f),gone=want.filter(f=>cached.paths.indexOf(f)<0);
  ok(cached.names.length===1&&!gone.length&&DATA.length&&DATA.every(f=>cached.paths.indexOf("/"+f)>=0),
    `the shell cache (${cached.names.join(",")}) holds all ${want.length} SHELL files, the data scripts among them${gone.length?"; missing "+gone.join(", "):""}`);
  await ctx.setOffline(true);
  await p.reload();await p.waitForTimeout(2500);
  console.log("offline reload title:",await p.title(),"| game booted:",await p.evaluate(()=>typeof state==="object"&&!!document.querySelector("#world,.world,svg")));
  // offline, the game boots from the cache with its data: the version line is written, the art and the books are there
  const off=await p.evaluate(()=>({ver:(document.getElementById("appVer")||{}).textContent||"",missing:!!document.getElementById("dataMissing"),
    sets:Object.keys(window.WCV||{}).sort().join(","),art:typeof ART.bat==="function"&&typeof ART.bath==="function",books:BOOKS.length,words:WORDS.length,tiles:document.querySelectorAll("#tiles .tile").length}));
  ok(/^Version/.test(off.ver)&&!off.missing&&off.sets==="books,fluency,fluent,openmoji,sentences,words"&&off.art&&off.books>0&&off.words>0&&off.tiles>0,
    "offline, the page boots from the cache with its data files: "+JSON.stringify(off));
  const icon=await p.evaluate(async()=>(await fetch("icons/icon-192.png")).status);console.log("offline icon fetch:",icon);
  await ctx.setOffline(false);
  // backup roundtrip with a fake recording blob
  const rt=await p.evaluate(async()=>{
    await DB.set("blobs","rec:sss",new Blob([new Uint8Array([1,2,3,4,5])],{type:"audio/webm"}));
    state.gems=4321;save();
    const bk=await fullBackup();const json=JSON.stringify(bk);
    await DB.del("blobs","rec:sss");state.gems=1;save();
    await restoreBackup(JSON.parse(json));
    const blob=await DB.get("blobs","rec:sss");
    const bytes=blob?Array.from(new Uint8Array(await blob.arrayBuffer())).join(","):"none";
    return {kind:bk.kind,blobKeys:Object.keys(bk.blobs),gems:state.gems,bytes,type:blob&&blob.type};
  });
  console.log("roundtrip:",JSON.stringify(rt));
  // legacy plain-state import
  const leg=await p.evaluate(async()=>{const s=JSON.parse(JSON.stringify(state));s.gems=77;await restoreBackup(s);return state.gems;});
  console.log("legacy import gems:",leg);
  // export button download
  await p.evaluate(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const [dl]=await Promise.all([p.waitForEvent("download",{timeout:8000}).catch(()=>null),p.evaluate(()=>document.getElementById("exportBtn").click())]);
  console.log("download:",dl?dl.suggestedFilename():"none");
  console.log("errors:",errs.length?errs:"none");
  ok(!errs.length,"no page errors: "+errs.join(" | "));
  // a data file that doesn't arrive (a bad deploy): a plain message and a Reload button, not a blank valley
  {const c2=await b.newContext({viewport:{width:1024,height:768},serviceWorkers:"block"}),p2=await c2.newPage(),e2=[];p2.on("pageerror",e=>e2.push(e.message));
    await p2.route("**/content/books.js",r=>r.fulfill({status:404,body:""}));
    await p2.goto("http://localhost:8771/");await p2.waitForTimeout(800);
    const m=await p2.evaluate(()=>{const d=document.getElementById("dataMissing");
      return d?{text:d.innerText,full:d.getBoundingClientRect().width>=innerWidth,button:!!d.querySelector("button")}:null;});
    ok(m&&/did not load\. Reload once online/.test(m.text)&&m.full&&m.button&&e2.some(x=>/did not load: books/.test(x)),
      "without content/books.js the page says its files did not load, with a Reload button: "+JSON.stringify(m)+" "+e2.join(" | "));
    await c2.close();}
  await b.close();srv.close();});
