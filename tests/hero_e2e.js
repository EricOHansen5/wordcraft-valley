// Hero name: the books say {hero}; the Grown-up setting changes it everywhere, escaped, and Decode reads it as a level-1 word.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs"),path=require("path");
const APP=path.join(__dirname,"../app");
const TYPES={".html":"text/html",".json":"application/json",".js":"text/javascript",".mp3":"audio/mpeg",".webmanifest":"application/manifest+json",".png":"image/png"};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split("?")[0]);if(f.endsWith("/"))f+="index.html";
  const fp=path.join(APP,f);if(!fp.startsWith(APP)||!fs.existsSync(fp)){r.writeHead(404);r.end();return;}
  r.writeHead(200,{"content-type":TYPES[path.extname(fp)]||"application/octet-stream"});r.end(fs.readFileSync(fp));}).listen(8815,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const ctx=await b.newContext({viewport:{width:1180,height:820},serviceWorkers:"block"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  // an old save from before the hero name, with a pet
  const st={tour:99,guardians:[0,1],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",critters:[],vehicles:[],
    settings:{pics:true,tts:true,ambient:false,tierOverride:6},
    mine:{seed:7,x:20.2,y:5.05,coins:0,bag:{},pick:0,bagLv:0,lamp:0,boots:0,shopLv:0,look:{skin:0,hair:0,hairStyle:0,shirt:1,pants:0,helmet:"miner"},owned:{miner:1,cap:1},made:true,pet:"dog",w:50}};
  await p.goto("http://localhost:8815/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  const E=x=>p.evaluate(x);
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);

  ok(await E("state.hero")==="Asher","an old save gets hero \"Asher\": "+JSON.stringify(await E("state.hero")));
  ok(await E(`BOOKS.every(b=>!/\\bAsh\\b/.test(JSON.stringify([b.title,b.pages.map(x=>x[0]),b.quiz.map(q=>q.q)])))`),"no book says \"Ash\" literally any more");

  // the shelf, the cover and a page show the default name
  await E("Books.shelf()");
  ok(await E(`[...document.querySelectorAll("#ovStory .bcov b")].some(x=>x.textContent==="Asher Gets a Fish")`),"shelf title: Asher Gets a Fish");
  await E(`Books.openBook("ash_fish")`);
  ok(await E(`document.querySelector("#ovStory .btitle").textContent.trim()`)==="Asher Gets a Fish","cover title: Asher Gets a Fish");
  await E(`document.getElementById("bStart").click()`);
  const pg=()=>E(`document.querySelector("#ovStory .btext").textContent.replace(/\\s+/g," ").trim()`);
  ok(await pg()==="This is Asher.","page 1 reads \""+await pg()+"\"");

  // Settings: the row is there, with the voice note
  await E(`openParent();document.querySelector('.tab[data-tab="set"]').click()`);await p.waitForTimeout(200);
  const row=await E(`(()=>{const i=document.getElementById("optHero");return{v:i.value,max:i.maxLength,meta:i.closest(".row").textContent}})()`);
  ok(row.v==="Asher"&&row.max===16&&/game voice knows the name Asher/.test(row.meta)&&/iPad voice/.test(row.meta),"Settings has Hero name, 16 characters, with the voice note: "+JSON.stringify(row.v));
  const setName=v=>E(`(()=>{const i=document.getElementById("optHero");i.value=${JSON.stringify(v)};i.dispatchEvent(new Event("change"));})()`);

  // D'Angelo: the open page changes, shown literally
  await setName("D'Angelo");
  ok(await E("state.hero")==="D'Angelo","state.hero is D'Angelo");
  ok(await pg()==="This is D'Angelo.","the open page updates: \""+await pg()+"\"");
  ok(await E(`document.querySelector("#ovStory .sitem.ash img").alt`)==="D'Angelo","the avatar's alt text is his name");
  // anything a grown-up types is shown as text, never as markup
  await setName("<b>Bo</b> & Jo");
  ok(await pg()==="This is <b>Bo</b> & Jo."&&await E(`!document.querySelector("#ovStory .btext b")`),"a name with < > & is escaped: \""+await pg()+"\"");
  await setName("   ");
  ok(await E("state.hero")==="Asher"&&await E(`document.getElementById("optHero").value`)==="Asher","an empty name goes back to Asher");
  await setName("Supercalifragilistic");
  ok(await E("state.hero")==="Supercalifragili","a long name is cut to 16 characters: "+await E("state.hero"));
  await setName("D'Angelo");
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);

  // questions and titles use the name too
  await E(`Books.openBook("ash_fish")`);
  ok(await E(`document.querySelector("#ovStory .btitle").textContent.trim()`)==="D'Angelo Gets a Fish","cover title: D'Angelo Gets a Fish");
  await E(`document.getElementById("bStart").click()`);
  for(let i=0;i<6;i++)await E(`(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();})()`);
  ok(await E(`document.querySelector("#ovStory .bq").textContent`)==="What did D'Angelo catch?","question: "+await E(`document.querySelector("#ovStory .bq").textContent`));
  await E("Books.close()");

  // Decode passes every book with any name, and reads the name (and Name's) as level 1
  const names=["Asher","D'Angelo","Mary Jane","Zoë","Maximilian","Kwabena"];
  const dec=await E(`(()=>{const out=[];for(const n of ${JSON.stringify(names)}){state.hero=n;
      if(Decode.tier(n.split(" ")[0])!==1||Decode.tier(n.split(" ")[0]+"'s")!==1)out.push(n+": tier "+Decode.tier(n));
      BOOKS.filter(b=>!b.mine).forEach(b=>[b.title].concat(b.pages.map(x=>x[0])).forEach(t=>{
        const bad=Decode.check(Books.fill(t,b.t),b.t).filter(x=>!x.ok);if(bad.length)out.push(n+" "+b.id+": "+bad.map(x=>x.w+"="+x.t).join(","));}));}
    state.hero="D'Angelo";return out;})()`);
  ok(!dec.length,"Decode.check passes every book with "+names.join(", ")+(dec.length?": "+dec.slice(0,4).join(" | "):""));
  ok(await E(`Decode.check("D'Angelo's hat is on the log.",1).every(x=>x.ok)`),"a note with his name checks at level 1");

  // My Own Book offers his name as a word, with his picture
  await E("MyBook.create()");await p.waitForTimeout(200);
  ok(await E(`!!document.querySelector('#ovMaker .mkb.n[data-w="D\\'Angelo"]')`),"My Own Book's word bank has D'Angelo");
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);

  // the game voice: the default name uses today's "Ash" clips, any other name the device voice
  const v=await E(`(async()=>{await VoicePack.load();const r={};
      state.hero="Asher";r.def=VoicePack.has("Asher and the dog went to the pond.");
      state.hero="D'Angelo";r.other=VoicePack.has("D'Angelo and the dog went to the pond.");r.otherAsh=VoicePack.has("Asher and the dog went to the pond.");
      state.hero="Asher";return r;})()`);
  ok(v.def&&!v.other&&!v.otherAsh,"voice: Asher plays the recorded Ash line; another name uses the device voice "+JSON.stringify(v));

  // it is saved
  await E(`state.hero="Kim";saveNow()`);await p.waitForTimeout(300);await p.reload();await p.waitForTimeout(2200);
  ok(await E("state.hero")==="Kim","the name is kept after a reload: "+await E("state.hero"));

  ok(!errs.length,"no page errors "+(errs.join(" | ")||""));
  console.log("errors:",errs.length?errs:"none");
  await b.close();srv.close();});
