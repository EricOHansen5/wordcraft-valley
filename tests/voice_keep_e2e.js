// His voice is kept, and the NAS is given time (Playwright, about half a minute).
// 1. The backup carries his voice: the templates Teach (and the NAS, and his taps) bank in the blobs store are plain data, not
//    recordings, so fullBackup() sends each as a blob of type application/vnd.wcv-voice+json (base64 of its JSON) and
//    restoreBackup() puts it back as the same data; the matcher reads it again at once. An older backup with none restores
//    as before and leaves the iPad's templates where they are. tools/progress.js counts them in the backup.
// 2. The NAS gets 8 s to hear a clip (it takes 2.3-2.7 s on the home NAS, and the clip goes over Tailscale). A clip it is
//    too slow for (the time runs out, or the server's own 504) goes to the matcher on the iPad, and the NAS stays on; a
//    NAS that is down (503, no answer at all) is left alone for 10 minutes as before. Each time it doesn't answer is noted
//    in state.talk.aErr ({at, why, ms}, the last 20), and tools/progress.js prints them.
// 3. An open answer in Dad's inbox asks whether the NAS is there before it is written down, instead of needing a
//    listen in the last 10 minutes.
const {launch,check,waitFor}=require("./lib");
const fs=require("fs"),os=require("os"),path=require("path"),{spawnSync}=require("child_process");
(async()=>{
  const T=check("voice_keep"),ok=T.ok,J=x=>JSON.stringify(x);
  const S0={settings:{tierOverride:3,tts:false,voicePack:false,speech:true,goal:0,talk:true}};
  const {page:p,errs,close,E}=await launch({static:true,block_sw:true,seed:S0,viewport:{width:1024,height:768}});
  // the NAS: api.get "ok" or a status; a POST waits api.delay ms, then answers api.post (a status) or the first answer, sure
  const api={get:"ok",post:200,delay:0,posts:0,gets:0};
  await p.route("**/api/ping",r=>r.fulfill({status:200,contentType:"application/json",body:"{}"}));
  await p.route("**/api/hear",async r=>{const q=r.request();
    if(q.method()==="GET"){api.gets++;
      if(api.get==="ok")return r.fulfill({status:200,contentType:"application/json",body:J({ok:true,model:"base.en"})});
      return r.fulfill({status:api.get,contentType:"text/plain",body:"no"});}
    api.posts++;const d=api.delay;if(d)await new Promise(ok=>setTimeout(ok,d));
    try{
      if(api.post!==200)return await r.fulfill({status:api.post,contentType:"application/json",body:J({error:"no"})});
      const ex=JSON.parse(decodeURIComponent(q.headers()["x-expect"]||"[]")),scores={};ex.forEach((e,i)=>{scores[e]=i?.3:1;});
      return await r.fulfill({status:200,contentType:"application/json",body:J({text:ex.length?ex[0]+".":"I liked the pig.",best:ex[0]||null,scores,ms:640})});
    }catch(e){}});
  // the game voice saying a word, as a WAV
  await E(()=>{window.__clip=async w=>{const idx=await VoicePack.load();
    const ab=await (await fetch("voice/"+idx[VoicePack.norm(w)])).arrayBuffer(),b=await new Promise((ok,no)=>Sound.ctx().decodeAudioData(ab,ok,no)),x=b.getChannelData(0);
    const pad=Math.round(b.sampleRate*.4),n=x.length+2*pad,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};
    s(0,"RIFF");v.setUint32(4,36+n*2,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,b.sampleRate,true);
    v.setUint32(28,b.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,n*2,true);
    for(let i=0;i<x.length;i++)v.setInt16(44+(pad+i)*2,Math.round(Math.max(-1,Math.min(1,x[i]))*32767),true);
    return new Blob([buf],{type:"audio/wav"});};});

  // ---- 1. the backup carries his voice ----
  const TYPE="application/vnd.wcv-voice+json";
  const banked=await E(async()=>{
    const mk=k=>{const x=new Float32Array(16000);for(let i=3000;i<12000;i++)x[i]=Math.sin(i*(.03+k*.01+i/3e6))*.3*Math.sin(Math.PI*(i-3000)/9000);return TalkMatch.features(x,16000).frames;};
    await Talk.bank("pig",mk(1),"teach");await Talk.bank("pig",mk(2),"teach");await Talk.bank("cat",mk(3),"tap");
    await DB.set("blobs","aud:pig",new Blob([new Uint8Array(2000)],{type:"audio/mp4"}));
    return{pig0:await DB.get("blobs","tpl:pig:0"),cat0:await DB.get("blobs","tpl:cat:0")};});
  const bk=await E(()=>fullBackup());
  {const b=bk.blobs||{},t=Object.keys(b).filter(k=>/^tpl:/.test(k)).sort();
    ok(J(t)===J(["tpl:cat:0","tpl:pig:0","tpl:pig:1"]),"the backup has his 3 voice templates "+J(Object.keys(b)));
    const d=b["tpl:pig:0"],back=d&&JSON.parse(Buffer.from(d.data,"base64").toString("utf8"));
    ok(d&&d.type===TYPE,"each one is typed "+TYPE+" "+J(d&&d.type));
    ok(back&&J(back)===J(banked.pig0),"and its data is the template itself (v 1, its frames, word, kind and time) "+J(back&&{v:back.v,w:back.w,src:back.src,n:back.n}));
    ok(b["aud:pig"]&&b["aud:pig"].type==="audio/mp4"&&Buffer.from(b["aud:pig"].data,"base64").length===2000,"a recording goes as before");
    const v=await E(()=>APP_VERSION);
    ok(/^wcv-\d{4}-\d\d-\d\d[a-z]?$/.test(v)&&bk.ver===v,"the backup says which version of the game made it "+J({ver:bk.ver,APP_VERSION:v}));}

  // restored into an iPad that has lost them: the same data back, and the matcher reads it at once
  {const r=await E(async b=>{for(const k of await DB.keys("blobs"))if(/^tpl:/.test(k))await DB.del("blobs",k);
      Talk._reset();const lost=J2(await Talk.known());
      await restoreBackup(b);
      const own=await Talk._own("pig");
      return{lost,known:await Talk.known(),pig0:await DB.get("blobs","tpl:pig:0"),own:own.length,src:own.map(x=>x.src),aud:(await DB.get("blobs","aud:pig")) instanceof Blob};
      function J2(x){return JSON.stringify(x);}},JSON.parse(J(bk)));
    ok(r.lost==="{}","(the iPad lost its templates: "+r.lost+")");
    ok(J(r.pig0)===J(banked.pig0),"a restore puts each template back as the same data");
    ok(J(r.known)===J({cat:1,pig:2})&&r.own===2&&J(r.src)===J(["teach","teach"]),"and the matcher knows his voice again "+J({known:r.known,own:r.own,src:r.src}));
    ok(r.aud,"the recording is restored as a recording");}
  // an older backup, with no templates: restores as before, and the iPad keeps the ones it has
  {const old=JSON.parse(J(bk));Object.keys(old.blobs).forEach(k=>{if(/^tpl:/.test(k))delete old.blobs[k];});
    const r=await E(async b=>{await restoreBackup(b);return Talk.known();},old);
    ok(J(r)===J({cat:1,pig:2}),"an older backup with none restores, and the iPad's templates stay "+J(r));}
  // a backup through the home server's store: the type and the data come back as sent
  {const srv=fs.readFileSync(path.join(__dirname,"..","server","server.js"),"utf8");
    ok(/refs\[k\]=\{type:v\.type,hash:h\}/.test(srv)&&/blobs\[k\]=\{type:r\.type,data:/.test(srv),"the home server keeps each blob's type and bytes as they are, so his voice goes through it unchanged");}

  // ---- 2. the NAS is given time ----
  const hear=(w,opt)=>E(async a=>{Talk._reset();await Talk.probe();const t0=Date.now();
    const r=await Talk._hear(await window.__clip(a.w),[a.w,"big","pin"],{tier:"A",heard:true});
    return{tier:r&&r.tier,best:r&&r.best,sure:!!(r&&r.sure),ms:Date.now()-t0,live:Date.now()-Talk._A.ok<6e5,down:Talk._A.down>0,err:(state.talk.aErr||[]).slice(-1)[0]||null,n:(state.talk.aErr||[]).length};},Object.assign({w},opt||{}));
  {api.delay=5000;const r=await hear("pig");api.delay=0;
    ok(r.tier==="A"&&r.best==="pig"&&r.sure&&r.ms>=4900,"a NAS that takes 5 s still answers: "+J(r));
    ok(r.live&&!r.down&&r.n===0,"and nothing is noted "+J(r));}
  // too slow for the time it has (made short here): this clip goes to the matcher, and the NAS stays on
  {await E(()=>Talk._hearMs(1500));api.delay=3000;const r=await hear("pig");api.delay=0;await E(()=>Talk._hearMs(0));
    ok(r.tier==="B"&&r.ms<2900,"a clip the NAS is too slow for goes to the matcher on the iPad: "+J(r));
    ok(r.live&&!r.down,"and the NAS stays on for the next one "+J(r));
    ok(r.err&&r.err.why==="slow"&&r.err.ms>=1400&&r.err.ms<2900&&r.err.at>0,"noted as slow, with how long it waited "+J(r.err));
    const t=await E(()=>Talk.tier(["pig","big","pin"]));ok(t==="A","the next answer listens with the NAS again ("+t+")");}
  // the server's own time limit (504): the same
  {api.post=504;const r=await hear("pig");api.post=200;
    ok(r.tier==="B"&&r.live&&!r.down&&r.err&&r.err.why==="slow","the home server's 504 (its listener too slow) is slow too: the matcher, the NAS stays on "+J(r));}
  // a NAS that is down: left alone for 10 minutes, as before
  {api.post=503;const r=await hear("pig");api.post=200;
    ok(r.tier==="B"&&r.down&&!r.live,"a 503 (the listener stopped) turns the NAS off for now "+J(r));
    ok(r.err&&r.err.why==="http 503","noted as http 503 "+J(r.err));
    const t=await E(()=>Talk.tier(["pig","big","pin"]));ok(t!=="A","the next answer does not wait on the NAS ("+t+")");}
  // a probe that gets no listener
  {api.get=404;const r=await E(async()=>{Talk._reset();const v=await Talk.probe();return{v,err:(state.talk.aErr||[]).slice(-1)[0]};});api.get="ok";
    ok(r.v===false&&r.err&&r.err.why==="probe http 404","a probe with no listener is noted as probe http 404 "+J(r));}

  // ---- 3. Dad's inbox asks whether the NAS is there ----
  {const r=await E(async()=>{Talk._reset();const it=await Talk._inboxAdd({q:"What was your favorite part?",book:{id:"map_x"}},{blob:await window.__clip("pig"),ms:900});return it&&it.id;});
    ok(!!r,"an open answer goes to the inbox");
    ok(await waitFor(p,id=>{const x=state.talk.inbox.find(i=>i.id===id);return x&&x.text==="I liked the pig.";},{arg:r,timeout:8000}),
      "and the NAS writes it down though nothing had listened in the last 10 minutes");}
  // the NAS down: the answer is kept, unwritten, and nothing breaks
  {api.get=503;const r=await E(async()=>{Talk._reset();const it=await Talk._inboxAdd({q:"What next?",book:null},{blob:await window.__clip("pig"),ms:900});
      await new Promise(ok=>setTimeout(ok,600));return state.talk.inbox.find(i=>i.id===it.id);});api.get="ok";
    ok(r&&r.text==="","with the NAS down the answer is kept for Dad, not written down "+J(r));}

  // ---- 4. tools/progress.js: the templates in the backup, and the times the NAS didn't answer ----
  {const snap=await E(()=>fullBackup()),f=path.join(os.tmpdir(),"wcv_voice_keep_"+process.pid+".json");
    fs.writeFileSync(f,J(snap));const out=spawnSync("node",[path.join(__dirname,"..","tools","progress.js"),"--file",f],{encoding:"utf8"});try{fs.unlinkSync(f);}catch(e){}
    const t=out.stdout||"";
    ok(out.status===0&&/3 of them kept in this backup/.test(t),"progress.js says how many templates the backup keeps: "+(t.split("\n").find(l=>/know his voice/.test(l))||t.slice(-300)));
    const l=t.split("\n").find(x=>/^NAS listener/.test(x))||"";
    ok(/didn't answer 5 times/.test(l)&&/slow 2/.test(l)&&/http 503 1/.test(l)&&/probe http 404 1/.test(l)&&/probe http 503 1/.test(l),"and the times the NAS didn't answer: "+l);
    const head=t.split("\n")[0];
    ok(head.indexOf("made by "+snap.ver.replace(/^wcv-/,""))>0,"its first line says which version made the backup: "+head);
    // a backup from before the version was kept says so
    const old=JSON.parse(J(snap));delete old.ver;fs.writeFileSync(f,J(old));
    const o=spawnSync("node",[path.join(__dirname,"..","tools","progress.js"),"--file",f],{encoding:"utf8"});try{fs.unlinkSync(f);}catch(e){}
    const h2=(o.stdout||"").split("\n")[0];
    ok(o.status===0&&/made by a version older than 2026-10-22a/.test(h2),"and an older backup says it came from an older version: "+h2);}
  // the last 20 only
  {const n=await E(()=>{const t=state.talk;for(let i=0;i<30;i++)Talk._note("slow",100);return t.aErr.length;});
    ok(n===20,"state.talk.aErr keeps the last 20 ("+n+")");}

  {const bad=errs.filter(e=>!/Failed to load resource/.test(e));ok(!bad.length,"no page errors (the NAS stand-in answers 503 and 404 on purpose): "+bad.join(" | "));}
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
