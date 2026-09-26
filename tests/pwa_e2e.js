const {chromium}=require("playwright");const http=require("http"),fs=require("fs"),path=require("path");
const ROOT=require("path").join(__dirname,"../app");
const types={".html":"text/html",".js":"text/javascript",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split("?")[0]);if(f.endsWith("/"))f+="index.html";
  const fp=path.join(ROOT,f);if(!fs.existsSync(fp)){r.writeHead(404);return r.end();}
  r.writeHead(200,{"content-type":types[path.extname(fp)]||"application/octet-stream"});r.end(fs.readFileSync(fp));}).listen(8771,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const ctx=await b.newContext({viewport:{width:1180,height:820},acceptDownloads:true});const p=await ctx.newPage();
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto("http://localhost:8771/");await p.waitForTimeout(2500);
  const man=await p.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');const j=await (await fetch(l.href)).json();return j.name+" icons:"+j.icons.length;});
  console.log("manifest:",man);
  await p.evaluate(()=>navigator.serviceWorker.ready);
  await p.reload();await p.waitForTimeout(1500);
  console.log("SW controlling:",await p.evaluate(()=>!!navigator.serviceWorker.controller));
  await ctx.setOffline(true);
  await p.reload();await p.waitForTimeout(2500);
  console.log("offline reload title:",await p.title(),"| game booted:",await p.evaluate(()=>typeof state==="object"&&!!document.querySelector("#world,.world,svg")));
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
  await b.close();srv.close();});
