// "🎤 Say it" (Playwright, about half a minute): the Read-it button listens the way Talk to me does (Talk.tier, its recorder,
// its tiers), because Apple keeps the browser's recogniser from a home-screen app. Shown only when a tier can listen (tier C
// only in a browser tab), a sure right answer pays +2 💎 and counts the word clean, not sure or a different word gets a kind
// line and never a miss, each try is logged for the report, and the whole tier A path with a real clip (the game voice's own,
// as a WAV) posts the word and its look-alikes and banks his voice. The microphone and the tiers are stood in for through
// Talk._record() and Talk._hear(), as tests/talk_e2e.js does.
const {launch,check,waitFor}=require("./lib");
(async()=>{
  const T=check("sayit"),ok=T.ok,J=x=>JSON.stringify(x);
  const S0={settings:{tierOverride:3,tts:false,voicePack:false,speech:true,goal:0}};
  const {page:p,errs,close,E}=await launch({static:true,block_sw:true,seed:S0,viewport:{width:1024,height:768}});
  // the home server's /api/hear: "ok" or "absent" (404); a POST answers with api.post (or the first answer)
  const api={hear:"absent",posts:[],post:null};
  await p.route("**/api/ping",r=>r.fulfill({status:200,contentType:"application/json",body:"{}"}));
  await p.route("**/api/hear",r=>{const q=r.request();
    if(q.method()==="GET"){
      if(api.hear==="ok")return r.fulfill({status:200,contentType:"application/json",body:J({ok:true,model:"base.en"})});
      return r.fulfill({status:404,contentType:"text/plain",body:"not found"});}
    const h=q.headers();api.posts.push({type:h["content-type"],expect:decodeURIComponent(h["x-expect"]||""),len:(q.postDataBuffer()||[]).length});
    if(api.hear!=="ok")return r.fulfill({status:503,contentType:"application/json",body:J({error:"no listener"})});
    const ex=JSON.parse(decodeURIComponent(h["x-expect"]||"[]")),best=api.post||ex[0],scores={};ex.forEach(e=>{scores[e]=e===best?1:.3;});
    return r.fulfill({status:200,contentType:"application/json",body:J({text:best+".",best,scores,ms:640})});});
  await E(()=>{Guess.set(false);window.__rok=Rec.ok;window.__sa=Speech.available;window.__mm=window.matchMedia;
    window.__home=v=>{Object.defineProperty(navigator,"standalone",{value:v,configurable:true});};window.__home(false);});

  // a Read-it word, fresh (no misses), with the tiers asked again
  const open=w=>E(x=>{document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);});Talk._reset();
    const y=allWords().find(z=>z.w===x);openWord(Object.assign({},y),{rung:2});},w);
  const shown=()=>E(()=>document.getElementById("micBtn").style.display!=="none");
  const showsUp=()=>waitFor(p,()=>document.getElementById("micBtn").style.display!=="none",{timeout:6000});
  const staysHidden=async()=>{await p.waitForTimeout(1200);return !(await shown());};

  // ---- 1. shown only when a tier can listen ----
  await E(()=>{Rec.ok=()=>false;Speech.available=()=>false;});
  await open("cat");
  ok(await staysHidden(),"no recording and no recogniser: no Say it button");
  await E(()=>{Speech.available=()=>true;window.__home(true);});
  await open("cat");
  ok(await staysHidden(),"a home-screen app (navigator.standalone) with only the browser's recogniser: no Say it (Apple keeps it from home-screen apps)");
  await E(()=>{window.__home(false);window.matchMedia=q=>{const m=window.__mm(q);return /display-mode: *standalone/.test(q)?{matches:true,media:q,addListener(){},removeListener(){}}:m;};});
  await open("cat");
  ok(await staysHidden(),"display-mode standalone with only the browser's recogniser: no Say it");
  await E(()=>{window.matchMedia=window.__mm;});
  await open("cat");
  ok(await showsUp(),"in a browser tab the browser's recogniser (tier C) can listen: Say it shows");
  await E(()=>{Rec.ok=window.__rok;Speech.available=()=>false;window.__home(true);});
  api.hear="ok";await open("cat");
  ok(await showsUp(),"a home-screen app with the NAS listening (tier A): Say it shows");
  api.hear="absent";await open("cat");
  ok(await showsUp(),"a home-screen app with the game voice's clips to match against (tier B): Say it shows");
  await E(()=>{state.settings.speech=false;});await open("cat");
  ok(await staysHidden(),"the setting off: no Say it");
  await E(()=>{state.settings.speech=true;});
  await open("cat");await E(()=>openWord(Object.assign({},allWords().find(z=>z.w==="dog")),{rung:0}));
  ok(await staysHidden(),"not on a Read-it word (a picture pick): no Say it");

  // ---- 2. a sure right answer ----
  api.hear="ok";
  await E(()=>{window.__heard=[];window.__canned=null;window.__realHear=Talk._hear;window.__realRec=Talk._record;
    Talk._record=async()=>{await new Promise(r=>setTimeout(r,400));return{blob:new Blob([new Uint8Array(900)],{type:"audio/mp4"}),heard:true,ms:600};};
    Talk._hear=async(b,ex,c)=>{window.__heard.push({blob:!!b,ex:ex.slice(),tier:c&&c.tier});return window.__canned?window.__canned(ex):null;};});
  const snap=()=>E(()=>{const s=state.stats[cur.w]||{};return{gems:state.gems,words:state.wordsRead,first:s.first||0,miss:s.miss||0,misses,paid:!!cur._paid,
    log:state.talk.log.length,last:state.talk.log[state.talk.log.length-1]||null,toast:document.getElementById("toast").textContent};});
  const tap=()=>E(()=>{const g=cur._g;window.__gh=false;cur._g=Object.assign({},g,{heard(){window.__gh=true;window.__gb=state.gems;g.heard();}});document.getElementById("micBtn").click();});
  await open("cat");await showsUp();
  {const b=await snap();
    await E(()=>{window.__canned=ex=>({tier:"A",best:cur.w,score:.95,sure:true,heard:true});});
    await tap();
    const look=await E(()=>{const m=document.getElementById("micBtn");return{on:m.classList.contains("listening"),t:m.textContent};});
    ok(look.on&&/Listening/.test(look.t),"a tap listens: the button has today's listening look "+J(look));
    await waitFor(p,()=>cur._paid,{timeout:5000});
    const a=await snap(),h=await E(()=>window.__heard[window.__heard.length-1]);
    ok(h&&h.ex[0]==="cat"&&h.ex.length===3&&h.blob&&h.tier==="A","it listens for the word and its two printed look-alikes "+J(h));
    const gb=await E(()=>window.__gb);
    ok(a.paid&&gb===b.gems+2&&a.gems>=gb&&a.words===b.words+1&&/You said it! \+2/.test(a.toast),"sure and right: \"You said it! +2 💎\" (+2 on top of the word's own pay), the word read "+J({said:gb-b.gems,all:a.gems-b.gems,toast:a.toast}));
    ok(a.first===b.first+1&&a.miss===b.miss,"it counts as a clean read");
    ok(await E(()=>window.__gh),"and as sounded out for the guess check (heard() before succeed)");
    ok(a.log===b.log+1&&a.last.from==="sayit"&&a.last.tier==="A"&&a.last.ok===true,"logged with its tier, marked as Say it "+J(a.last));}

  // ---- 3. not sure, nothing heard, nothing could listen: kind, never a miss ----
  for(const c of [{tier:"B",best:null,score:.4,sure:false,heard:true},{tier:"B",best:null,score:0,sure:false,heard:false},null]){
    await open("hat");await showsUp();const b=await snap();
    await E(m=>{window.__canned=()=>m;},c);await tap();
    await waitFor(p,()=>!document.getElementById("micBtn").classList.contains("listening"),{timeout:5000});
    const a=await snap(),btn=await E(()=>{const m=document.getElementById("micBtn");return{t:m.textContent,shown:m.style.display!=="none"};});
    const what=c?c.heard?"not sure":"nothing heard":"nothing could listen";
    ok(/I didn't quite catch that\. Try once more, or tap I read it\./.test(a.toast),what+": \""+a.toast+"\"");
    ok(!a.paid&&a.gems===b.gems&&a.misses===0&&a.miss===b.miss,what+": nothing paid, nothing taken, no miss, the word still open");
    ok(btn.shown&&btn.t==="🎤 Say it","the button is ready again "+J(btn));
    ok(a.log===b.log+1&&a.last.from==="sayit"&&a.last.ok===false,what+": logged as a try that wasn't right "+J(a.last));
  }

  // ---- 4. sure, but a different word ----
  await open("hat");await showsUp();
  {const b=await snap();
    await E(()=>{window.__canned=ex=>({tier:"A",best:ex.find(x=>x!==cur.w),score:.9,sure:true,heard:true});});await tap();
    await waitFor(p,()=>!document.getElementById("micBtn").classList.contains("listening"),{timeout:5000});
    const a=await snap(),said=await E(()=>{const h=window.__heard[window.__heard.length-1];return h?h.ex.find(x=>x!==cur.w):null;});
    ok(a.toast==="That sounded like '"+said+"'. Try once more!","a sure different word: \""+a.toast+"\"");
    ok(!a.paid&&a.gems===b.gems&&a.misses===0&&a.miss===b.miss,"nothing paid, nothing taken, no miss: a misheard child is not a wrong answer");
    ok(await E(()=>!!document.querySelector("#picks .btn")),"I read it! is still there");
    ok(a.last.from==="sayit"&&a.last.tier==="A"&&a.last.ok===false,"logged as not right "+J(a.last));}

  // ---- 5. tier A for real: the clip goes to the NAS, and his voice is banked ----
  await E(()=>{Talk._hear=window.__realHear;
    Talk._record=async()=>{const w=cur.w,idx=await VoicePack.load();
      const ab=await (await fetch("voice/"+idx[VoicePack.norm(w)])).arrayBuffer(),b=await new Promise((ok,no)=>Sound.ctx().decodeAudioData(ab,ok,no)),x=b.getChannelData(0);
      const pad=Math.round(b.sampleRate*.4),n=x.length+2*pad,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};
      s(0,"RIFF");v.setUint32(4,36+n*2,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,b.sampleRate,true);
      v.setUint32(28,b.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,n*2,true);
      for(let i=0;i<x.length;i++)v.setInt16(44+(pad+i)*2,Math.max(-1,Math.min(1,x[i]))*32767,true);
      return{blob:new Blob([buf],{type:"audio/wav"}),heard:true,ms:Math.round(x.length/b.sampleRate*1000)};};});
  api.hear="ok";api.post=null;await open("pig");await showsUp();
  {const b=await snap(),n0=api.posts.length,tpl0=await E(()=>state.talk.tpl);
    await tap();
    const paid=await waitFor(p,()=>cur._paid,{timeout:15000});const a=await snap(),post=api.posts[n0]||{},ex=JSON.parse(post.expect||"[]");
    ok(paid&&await E(g=>window.__gb===g+2,b.gems)&&a.last.tier==="A"&&a.last.ok&&a.last.from==="sayit","tier A for real: the NAS was sure, +2 💎 "+J(a.last));
    ok(post.type==="audio/wav"&&post.len>1000&&ex[0]==="pig"&&ex.length===3,"the POST carries the clip and the word with its look-alikes "+J(ex));
    ok(await waitFor(p,t=>state.talk.tpl>t,{arg:tpl0,timeout:8000})&&await E(()=>DB.keys("blobs").then(k=>k.indexOf("tpl:pig:0")>=0)),"his clip is banked as a template for \"pig\"");}

  // ---- 6. the report ----
  await E(()=>openReport());
  const line=await E(()=>{const e=document.getElementById("rSayIt");return e?e.textContent:"";});
  const n=await E(()=>state.talk.log.filter(x=>x.from==="sayit").length);
  ok(new RegExp("Say it: "+n+" tries this week, 2 read right").test(line),"the Grown-up report counts the tries: "+line);
  ok(await E(()=>!document.getElementById("rTalk")),"and they aren't counted as Talk to me answers (it is off)");

  const bad=errs.filter(e=>!/Failed to load resource/.test(e));
  ok(!bad.length,"no page or console errors"+(bad.length?": "+bad.join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
