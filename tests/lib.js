// Shared helpers for the Playwright suites. A new suite looks like this:
//   const {launch,check,waitFor,answer}=require("./lib");
//   (async()=>{const t=check("my feature");
//     const {page:p,errs,close}=await launch({seed:{gems:50,settings:{goal:0}}});   // serves app/, seeds a save, boots
//     await p.click("#crateBtn");
//     t.ok(await waitFor(p,()=>Modes.top()==="read"),"crates open reading");     // poll, don't sleep
//     t.ok(!errs.length,"no page errors: "+errs.join(" | "));
//     await close();t.done();})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
// launch() options: port (default freePort()), seed (merged onto BASE_SAVE; omit for a fresh valley), static (serve real files),
// block_sw (default: on unless static), viewport, context (extra newContext options), init (extra init script), console (log errors, default on).
// seed(page,partial) re-seeds, reload(page) waits for boot; answer(page,sel) clicks the right answer in a host with data-ans / data-tiles.
"use strict";
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path");
const APP=path.join(__dirname,"../app");
const TYPES={".html":"text/html",".js":"text/javascript",".json":"application/json",".mp3":"audio/mpeg",".png":"image/png",
  ".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};

// ---------- ports: a counter from 8830, skipping any port already held ----------
let nextPort=8830;
function probe(port){return new Promise(res=>{const s=http.createServer();s.once("error",()=>res(false));s.listen(port,()=>s.close(()=>res(true)));});}
async function freePort(){for(;;){const p=nextPort++;if(await probe(p))return p;}}

// ---------- the test server ----------
// static:false answers every path with app/index.html (keep the service worker out: its script would be HTML);
// static:true serves the real files under app/ and 404s the rest.
async function serve({port,static:real=false}={}){
  const srv=http.createServer((q,r)=>{
    if(!real){r.writeHead(200,{"content-type":"text/html"});return r.end(fs.readFileSync(path.join(APP,"index.html")));}
    let f;try{f=decodeURIComponent(q.url.split("?")[0]);}catch(e){r.writeHead(400);return r.end();}
    if(f.endsWith("/"))f+="index.html";
    const fp=path.join(APP,path.normalize(f));
    if(!fp.startsWith(APP+path.sep)||!fs.existsSync(fp)||!fs.statSync(fp).isFile()){r.writeHead(404);return r.end();}
    r.writeHead(200,{"content-type":TYPES[path.extname(fp)]||"application/octet-stream"});r.end(fs.readFileSync(fp));
  });
  // a port given is used as is; otherwise the next free one, trying again if another process takes it first
  for(;;){const p=port||await freePort();
    try{await new Promise((res,rej)=>{srv.once("error",rej);srv.listen(p,()=>{srv.off("error",rej);res();});});
      srv.port=p;srv.url=`http://localhost:${p}/`;return srv;}
    catch(e){if(port||e.code!=="EADDRINUSE")throw e;}}
}

// ---------- a known-good save ----------
// The valley most suites start from: the tour done, two lands open, a cottage, the starter car, a made Mine character.
const BASE_SAVE={tour:99,guardians:[0,1],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,
  grid:{"6,8":{id:"cottage",seed:3,lv:1}},inventory:{},critters:[],vehicles:[{id:"v_car",c:10,r:8,lv:1,out:true,since:1}],adv:{seenIntro:1,dex:{}},
  mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{},pick:1,bagLv:1,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},
    owned:{miner:1,cap:1},made:true,pet:null,bosses:{},eggs:[]}};
const isPlain=x=>Object.prototype.toString.call(x)==="[object Object]";
// plain objects merge key by key; arrays and everything else replace; a key set to undefined is removed
function merge(base,over){
  const out=JSON.parse(JSON.stringify(base));
  (function m(t,o){Object.keys(o).forEach(k=>{
    if(o[k]===undefined)delete t[k];
    else if(isPlain(o[k])&&isPlain(t[k]))m(t[k],o[k]);
    else t[k]=JSON.parse(JSON.stringify(o[k]));});})(out,over||{});
  return out;
}

// ---------- waiting ----------
// Polls a function (run in the page, with opts.arg) or a selector until it is truthy.
// Returns the value, or false on timeout (it never throws, so it can go straight into ok()).
async function waitFor(page,what,{timeout=5000,arg,interval=50}={}){
  const fn=typeof what==="string"?(s=>!!document.querySelector(s)):what,a=typeof what==="string"?what:arg,end=Date.now()+timeout;
  for(;;){const left=end-Date.now();if(left<=0)return false;
    try{const h=await page.waitForFunction(fn,a,{timeout:left,polling:interval});
      let v=true;try{v=(await h.jsonValue())||true;}catch(e){}h.dispose().catch(()=>{});return v;}
    catch(e){if(/Timeout/i.test(e.name+e.message))return false;
      // a reload in the middle of polling destroys the context: poll again in the new page
      if(/context was destroyed|navigat/i.test(e.message))continue;throw e;}}
}
// the game has finished booting when it has written its version into the Grown-up About line
async function booted(page){
  const ok=await waitFor(page,()=>/^Version/.test((document.getElementById("appVer")||{}).textContent||""),{timeout:15000});
  if(!ok)console.log("note: lib.js did not see the game finish booting in 15 s (the #appVer line stayed empty)");
  return ok;
}

// Writes a save into IndexedDB (the same store the game reads) and reloads, so it goes through the real boot path:
// defaults, migrations, fixups. partial is merged onto BASE_SAVE; pass {base:null} in opts to write partial as is.
// settle waits out the boot timers (a land keeper wakes at 1.5 s) the way the older suites' 2.2 s sleep did.
async function seed(page,partial,{base=BASE_SAVE,settle=2200}={}){
  const st=base?merge(base,partial):partial;
  await page.evaluate(s=>new Promise((res,rej)=>{
    // the page being left saves its own state when it is put away (pagehide): keep that from landing on the seed
    try{DB.set=()=>Promise.resolve(false);}catch(e){}
    const r=indexedDB.open("wordcraft-valley",2);
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("kv"))d.createObjectStore("kv");if(!d.objectStoreNames.contains("blobs"))d.createObjectStore("blobs");};
    r.onerror=()=>rej(r.error);
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await reload(page,{settle});
  return st;
}
// a reload that waits for boot, then the boot timers
async function reload(page,{settle=2200}={}){await page.reload();await booted(page);if(settle)await page.waitForTimeout(settle);}

// ---------- answering ----------
// window.__answer(sel): answers whatever reading challenge is in the host (a word pick, a sentence pick or a Build it).
function installAnswer(){
  window.__answer=sel=>{const h=document.querySelector(sel);if(!h||!h.dataset.ans)return"none";const a=h.dataset.ans;
    if(h.querySelector(".wslots")){const tiles=JSON.parse(h.dataset.tiles),bank=[...h.querySelectorAll(".wbank .lt")],used=new Set();
      tiles.forEach(ph=>{const t=bank.find((b,i)=>!used.has(i)&&b.textContent===tileText(ph));used.add(bank.indexOf(t));t.click();});return"build:"+a;}
    if(a[0]==="#"){h.querySelector(`.psopt[data-i="${a.slice(1)}"]`).click();return"sent";}
    h.querySelector(`[data-w="${a}"]`).click();return"word:"+a;};
}
const answer=(page,sel)=>page.evaluate(s=>window.__answer(s),sel);

// ---------- the browser ----------
async function launch({port,seed:st,static:real=false,block_sw,viewport={width:1180,height:820},context={},init,console:con=true,settle}={}){
  const srv=await serve({port,static:real});
  const browser=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{});
  const sw=block_sw==null?!real:block_sw;
  const ctx=await browser.newContext(Object.assign({viewport,hasTouch:true},sw?{serviceWorkers:"block"}:{},context));
  const page=await ctx.newPage();const errs=[];
  page.on("pageerror",e=>errs.push(e.message));
  if(con)page.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text());});
  await page.addInitScript(installAnswer);
  if(init)await page.addInitScript(init);
  await page.goto(srv.url);
  if(st)await seed(page,st,{settle});else await booted(page);
  const close=async()=>{try{await browser.close();}catch(e){}try{srv.closeAllConnections&&srv.closeAllConnections();}catch(e){}
    await new Promise(r=>srv.close(()=>r()));};
  return{browser,ctx,page,errs,srv,url:srv.url,E:(f,a)=>page.evaluate(f,a),close};
}

// ---------- reporting ----------
// Lines start with PASS / FAIL, which is what run-all.js looks for; done() prints a summary and sets the exit code.
function check(name){
  let pass=0,fails=0;
  const t={
    ok(c,m){if(c)pass++;else{fails++;process.exitCode=1;}console.log((c?"PASS ":"FAIL ")+m);return !!c;},
    fail(m){return t.ok(false,m);},
    get fails(){return fails;},
    done(){console.log(`${name||"suite"}: ${pass} passed, ${fails} failed`);process.exitCode=fails?1:0;return fails;}
  };
  return t;
}

module.exports={serve,launch,seed,reload,booted,waitFor,answer,check,freePort,merge,BASE_SAVE,installAnswer};

// run-all.js runs every file here, this one too: check the parts that need no browser
if(require.main===module)(async()=>{const t=check("lib.js");
  const m=merge(BASE_SAVE,{gems:5,mine:{pet:"dog"},vehicles:[],adv:undefined});
  t.ok(m.gems===5&&m.mine.pet==="dog"&&m.mine.coins===40&&!m.vehicles.length&&!("adv" in m)&&BASE_SAVE.mine.pet===null,"lib: seed merge (objects merge, arrays replace, undefined removes, base untouched)");
  const a=await freePort(),b=await freePort();t.ok(a>=8830&&b>a,`lib: freePort counts up from 8830 (${a}, ${b})`);
  const srv=await serve({port:b,static:true}),get=u=>new Promise(r=>http.get(srv.url+u,x=>{x.resume();r(x.statusCode);}));
  t.ok(await get("sw.js")===200&&await get("nope.txt")===404&&await get("..%2Fpackage.json")===404,"lib: static serve gives real files, 404s the rest");
  srv.close();t.done();})();
