// Talk to me (Playwright, about a minute): the Grown-up settings, the way in, each question type, the kind rules, the log
// and the report line, the tier order (A with /api/hear there, B without it, C or the screen offline), the whole path
// through tiers A and B with a real clip (the game voice's own, as a WAV, standing in for the microphone), eyes-free,
// the keyboard, old saves, and no page errors. The microphone and the recogniser are stood in for through
// Talk._record() and Talk._hear(blob|null, expect) (the step after the microphone), which return canned answers.
const {launch,check,waitFor,answer,seed}=require("./lib");
(async()=>{
  const T=check("talk"),ok=T.ok,J=x=>JSON.stringify(x);
  // no device voice and no clips for the prompts: the questions are asked at once (the clips still load for tier B)
  const S0={settings:{tierOverride:3,tts:false,voicePack:false}};
  const {page:p,errs,close,E,ctx}=await launch({static:true,block_sw:true,seed:S0,viewport:{width:1024,height:768}});
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovTalk")o.classList.remove("on");}));
  // the home server's API, as this test says: /api/hear "ok", "absent" (404) or "down" (200 {ok:false}); every request counted
  const api={hear:"absent",gets:0,posts:[],post:null};
  await p.route("**/api/ping",r=>r.fulfill({status:200,contentType:"application/json",body:"{}"}));
  await p.route("**/api/hear",r=>{const q=r.request();
    if(api.offline)return r.abort("internetdisconnected");   // a routed request doesn't see ctx.setOffline
    if(q.method()==="GET"){api.gets++;
      if(api.hear==="ok")return r.fulfill({status:200,contentType:"application/json",body:J({ok:true,model:"base.en"})});
      if(api.hear==="down")return r.fulfill({status:200,contentType:"application/json",body:J({ok:false})});
      return r.fulfill({status:404,contentType:"text/plain",body:"not found"});}
    const h=q.headers();api.posts.push({type:h["content-type"],expect:decodeURIComponent(h["x-expect"]||""),token:h["x-token"],len:(q.postDataBuffer()||[]).length});
    if(api.hear!=="ok")return r.fulfill({status:503,contentType:"application/json",body:J({error:"no listener"})});
    const ex=JSON.parse(decodeURIComponent(h["x-expect"]||"[]")),best=api.post||ex[0],scores={};ex.forEach(e=>{scores[e]=e===best?1:.3;});
    return r.fulfill({status:200,contentType:"application/json",body:J({text:best+".",best,scores,ms:640})});});
  await tidy();

  // ---- 1. an old save, and off by default ----
  const st=await E(()=>({talk:state.talk,t:state.settings.talk,e:state.settings.eyesFree}));
  ok(J(st.talk)===J({log:[],tpl:0})&&st.t===false&&st.e===false,"an old save gets talk {log:[],tpl:0}, and Talk to me and Eyes-free are off "+J(st));
  await p.click("#crateBtn");await p.waitForTimeout(250);
  ok(!(await p.isVisible("#talkBtn"))&&(await E(()=>Talk.open()))===false,"off: no Talk to me in the crates, and it doesn't open");
  await E(()=>Modes.shut(document.getElementById("ovCrates")));

  // ---- 2. the Grown-up settings ----
  await E(()=>openParent());await p.click('.tabs .tab[data-tab="set"]');
  ok(await p.isVisible("#optTalk")&&!(await p.isChecked("#optTalk"))&&await p.isDisabled("#optEyes"),"Settings: Talk to me is there and off; Eyes-free waits for it");
  await p.click("#optTalk");
  ok(await E(()=>state.settings.talk===true)&&!(await p.isDisabled("#optEyes"))&&!(await p.isChecked("#optEyes")),"turning Talk to me on saves it, and Eyes-free can be set");
  await p.click("#optEyes");ok(await E(()=>state.settings.eyesFree===true),"Eyes-free on");
  await p.click("#optEyes");ok(await E(()=>state.settings.eyesFree===false),"and off again");
  await E(()=>Modes.shut(document.getElementById("ovParent")));await tidy();

  // ---- 3. the way in ----
  await E(()=>{window.__heard=[];window.__canned=null;window.__realHear=Talk._hear;window.__realRec=Talk._record;
    Talk._record=async()=>({blob:new Blob([new Uint8Array(900)],{type:"audio/mp4"}),heard:true,ms:600});
    Talk._hear=async(b,ex,c)=>{window.__heard.push({blob:!!b,ex:ex.slice(),tier:c&&c.tier});return window.__canned?window.__canned(ex):null;};});
  await p.click("#crateBtn");await p.waitForTimeout(250);
  ok(await p.isVisible("#talkBtn"),"on: a big 🎤 Talk to me in the crates panel");
  await p.click("#talkBtn");
  ok(await waitFor(p,()=>Modes.top()==="talk"&&document.getElementById("ovTalk").classList.contains("on")&&!document.getElementById("ovCrates").classList.contains("on")),
    "it opens the Talk to me mode (Modes: talk) and closes the crates");
  ok(await E(()=>Modes.list().talk&&Modes.list().talk.reading===true),"Talk to me counts as reading time");

  // ---- 4. each question type pays once on a sure match ----
  const snap=()=>E(()=>({gems:state.gems,words:state.wordsRead,log:state.talk.log.length,last:state.talk.log[state.talk.log.length-1]||null}));
  const tiers={say:"A",start:"B",rhyme:"C",yesno:"B",number:"A"};
  for(const kind of ["say","start","rhyme","yesno","number"]){
    const q=await E(k=>{Talk._next(k);return Talk._S();},kind);
    const host=await E(()=>{const h=document.getElementById("tkQ");return{ans:h.dataset.ans,kind:h.dataset.kind,ask:h.classList.contains("ask"),opts:[...h.querySelectorAll(".tkopt")].map(b=>b.dataset.w)};});
    ok(q.kind===kind&&host.ans===q.ans&&host.kind===kind&&host.ask&&J(host.opts.slice().sort())===J(q.expect.slice().sort())&&q.expect.indexOf(q.ans)>=0,
      `${kind}: the question is up, its answer on the host (dataset.ans "${host.ans}"), the choices waiting: ${J(q.expect)}`);
    if(kind==="say")ok(q.expect.length===3,"say: the word and two look-alikes");
    if(kind==="start"||kind==="rhyme"||kind==="yesno")ok(q.expect.length===2,kind+": two answers"+(kind==="yesno"?" (yes, no)":""));
    if(kind==="number")ok(q.expect.every(x=>/^\d+$/.test(x))&&q.expect.length>=3,"number: the digits are the answers "+J(q.expect));
    const b=await snap();
    await E(t=>{window.__canned=ex=>({tier:t,best:document.getElementById("tkQ").dataset.ans,score:.95,sure:true,heard:true});},tiers[kind]);
    await E(()=>Talk._listen());
    const done=await waitFor(p,()=>Talk._S().done);
    const a=await snap();
    const reading=kind!=="number";
    ok(done&&a.gems===b.gems+2&&a.words===b.words+(reading?1:0)&&a.log===b.log+1&&a.last.tier===tiers[kind]&&a.last.ok===true,
      `${kind}: a sure match pays +2 💎${reading?" and counts as a word read":" (numbers aren't a word read)"}, logged as tier ${a.last&&a.last.tier} `+J({gems:a.gems-b.gems,words:a.words-b.words}));
    // again, and a tap on it: nothing more
    await E(()=>{Talk._listen();const h=document.getElementById("tkQ"),r=h.querySelector('.tkopt[data-w="'+h.dataset.ans+'"]');if(r){r.click();r.click();}});
    await p.waitForTimeout(150);const c=await snap();
    ok(c.gems===a.gems&&c.words===a.words&&c.log===a.log,`${kind}: paid once (another listen and a double tap add nothing)`);
  }
  ok(await E(()=>/\+10/.test(document.getElementById("tkGems").textContent)),"the header counts this visit's gems: "+await E(()=>document.getElementById("tkGems").textContent));
  const heardEx=await E(()=>window.__heard.map(h=>h.ex.length));
  ok(heardEx.length>=5&&heardEx.every(n=>n>=2&&n<=6),"every listen is given 2 to 6 answers to listen for "+J(heardEx));

  // ---- 5. not sure: tap the one you said ----
  for(const miss of [{sure:false,best:"x",score:.4,heard:true,tier:"B"},{sure:false,best:null,score:0,heard:false,tier:"B"},null]){
    await E(()=>Talk._next("say"));const b=await snap();
    await E(m=>{window.__canned=ex=>m&&Object.assign({},m,{best:m.best==="x"?ex[0]:m.best});},miss);
    await E(()=>Talk._listen());
    const shown=await waitFor(p,()=>{const h=document.getElementById("tkQ"),o=[...h.querySelectorAll(".tkopt")];
      return !h.classList.contains("ask")&&o.length===3&&o.every(x=>!x.disabled&&x.offsetParent)&&/didn't quite catch that/.test(document.getElementById("tkSay").textContent);});
    const a=await snap();
    ok(shown&&a.gems===b.gems&&a.log===b.log,`${miss?miss.heard?"not sure":"nothing heard":"nothing could listen"}: "I didn't quite catch that. Tap the one you said." and the three choices show; nothing paid, nothing taken, nothing logged`);
  }
  {const b=await snap();const r=await answer(p,"#tkQ");await waitFor(p,()=>Talk._S().done);const a=await snap();
    ok(/^word:/.test(r)&&a.gems===b.gems+1&&a.words===b.words+1&&a.last.tier==="tap"&&a.last.ok,"tapping the right one then pays +1 💎 and a word read, logged as a tap");}

  // ---- 6. a sure wrong answer is a wrong tap ----
  await E(()=>Talk._next("say"));
  {const b=await snap();
    await E(()=>{window.__canned=ex=>{const a=document.getElementById("tkQ").dataset.ans;return{tier:"B",best:ex.find(x=>x!==a),score:.9,sure:true,heard:true};};});
    await E(()=>Talk._listen());
    await waitFor(p,()=>Talk._S().miss===1&&!Talk._S().busy);
    const w1=await E(()=>({wob:[...document.querySelectorAll("#tkQ .tkopt.wrong")].length,shown:!document.getElementById("tkQ").classList.contains("ask")}));
    const a=await snap();
    ok(w1.wob===1&&w1.shown&&a.gems===b.gems&&a.words===b.words&&a.last.tier==="B"&&a.last.ok===false,"a sure wrong answer: the one he said wobbles, the choices show, nothing is taken away, logged as not right "+J(w1));
    await E(()=>Talk._listen());await waitFor(p,()=>Talk._S().miss===2&&!Talk._S().busy);
    ok(await E(()=>{const h=document.getElementById("tkQ");return !!h.querySelector('.tkopt.hint[data-w="'+h.dataset.ans+'"]');}),"after a second one the right answer glows");
    const wrongTap=await E(()=>{const h=document.getElementById("tkQ"),x=[...h.querySelectorAll(".tkopt")].find(o=>o.dataset.w!==h.dataset.ans);x.click();return state.gems;});
    ok(wrongTap===b.gems&&await E(()=>Talk._S().miss===3),"a wrong tap costs nothing either");
    await answer(p,"#tkQ");await waitFor(p,()=>Talk._S().done);
    ok((await snap()).gems===b.gems+1,"and the right tap still pays");}

  // ---- 7. the report line ----
  const counts=await E(()=>{const l=state.talk.log,n=k=>l.filter(x=>x.tier===k).length;return{all:l.length,A:n("A"),B:n("B"),C:n("C"),tap:n("tap")};});
  await E(()=>openReport());
  const line=await E(()=>{const e=document.getElementById("rTalk");return e?e.textContent:"";});
  ok(line.indexOf(`Talk to me: ${counts.all} answers this week, ${counts.A} heard by the NAS, ${counts.B} matched on the iPad, ${counts.C} by the browser`)>=0&&line.indexOf(counts.tap+" tapped")>=0,
    "the Grown-up report: "+line);
  await E(()=>Modes.shut(document.getElementById("ovReport")));

  // ---- 8. which tier listens ----
  const tier=ex=>E(x=>{Talk._reset();return Talk.tier(x);},ex);
  api.hear="ok";ok(await tier(["cat","hat"])==="A","/api/hear says ok: tier A");
  api.hear="absent";ok(await tier(["cat","hat"])==="B","/api/hear missing (404): tier B, the game voice's clips are the references");
  api.hear="down";ok(await tier(["cat","hat"])==="B","the NAS there but its listener down: tier B");
  {api.hear="ok";const g=api.gets;const t=await E(()=>Talk.tier(["cat","hat"]));
    ok(t==="B"&&api.gets===g,"after a no, the NAS is not asked again for 10 minutes (still B, no request)");
    await E(()=>{Talk._A.down=Date.now()-11*60e3;});ok(await E(()=>Talk.tier(["cat","hat"]))==="A"&&api.gets===g+1,"after 10 minutes it is asked again: A");}
  const hasC=await E(()=>Speech.available());
  // offline, and the clips not in any cache (the browser may keep ones it fetched before)
  const noClips=r=>r.abort("internetdisconnected");
  await ctx.setOffline(true);api.offline=true;await p.route("**/voice/*.mp3",noClips);
  {const t=await tier(["dog","pig"]),own=await E(()=>Promise.all([Talk._own("dog"),Talk._own("pig")]).then(a=>a.map(x=>x.length)));
    ok(t===(hasC?"C":"screen"),`offline, no clips to hand and none of his own: ${hasC?"the browser's recogniser (C)":"the screen"} (${t}, own ${J(own)})`);}
  await E(async()=>{const x=new Float32Array(16000);for(let i=4000;i<10000;i++)x[i]=Math.sin(i*(.05+i/2e6))*.3*Math.sin(Math.PI*(i-4000)/6000);
    const f=TalkMatch.features(x,16000);await Talk.bank("dog",f.frames,"tap");await Talk.bank("pig",f.frames,"tap");});
  ok(await tier(["dog","pig"])==="B","offline with his own templates for every answer: tier B");
  ok(await tier(["dog","fox"])===(hasC?"C":"screen"),"offline, one answer with no reference: not B");
  await E(()=>{window.__sa=Speech.available;Speech.available=()=>false;});
  ok(await tier(["dog","fox"])==="screen","and with no recogniser either: the screen");
  await E(()=>{window.__rok=Rec.ok;Rec.ok=()=>false;Speech.available=()=>true;});
  ok(await tier(["dog","pig"])==="C","no microphone recording (no MediaRecorder): the browser's recogniser, even with templates");
  await E(()=>{Rec.ok=window.__rok;Speech.available=window.__sa;});
  await ctx.setOffline(false);api.offline=false;await p.unroute("**/voice/*.mp3",noClips);

  // ---- 9. the whole path with a real clip: tier B, then tier A ----
  // the game voice saying the answer, as a WAV, is the "microphone"
  await E(()=>{Talk._hear=window.__realHear;window.__recs=0;
    Talk._record=async()=>{window.__recs++;const w=document.getElementById("tkQ").dataset.ans,idx=await VoicePack.load();
      const ab=await (await fetch("voice/"+idx[VoicePack.norm(w)])).arrayBuffer(),b=await new Promise((ok,no)=>Sound.ctx().decodeAudioData(ab,ok,no)),x=b.getChannelData(0);
      const pad=Math.round(b.sampleRate*.4),n=x.length+2*pad,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};
      s(0,"RIFF");v.setUint32(4,36+n*2,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,b.sampleRate,true);
      v.setUint32(28,b.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,n*2,true);
      for(let i=0;i<x.length;i++)v.setInt16(44+(pad+i)*2,Math.max(-1,Math.min(1,x[i]))*32767,true);
      return{blob:new Blob([buf],{type:"audio/wav"}),heard:true,ms:Math.round(x.length/b.sampleRate*1000)};};});
  api.hear="absent";await E(()=>Talk._reset());
  {await E(()=>Talk._next("say"));const b=await snap();await E(()=>Talk._listen());
    const d=await waitFor(p,()=>Talk._S().done||(!Talk._S().busy&&Talk._S().unsure>0),{timeout:15000});const a=await snap();
    ok(d&&a.gems===b.gems+2&&a.last.tier==="B"&&a.last.ok,"tier B for real: the clip is decoded, matched against the answers' clips, sure, paid +2 💎 "+J(a.last));}
  api.hear="ok";api.post=null;await E(()=>Talk._reset());
  {const posts=api.posts.length;await E(()=>Talk._next("number"));const b=await snap(),ex=(await E(()=>Talk._S())).expect,ans=(await E(()=>Talk._S())).ans;
    const tpl0=await E(()=>state.talk.tpl);api.post=ans;
    await E(()=>Talk._listen());const d=await waitFor(p,()=>Talk._S().done,{timeout:15000});const a=await snap(),post=api.posts[posts]||{};
    ok(d&&a.gems===b.gems+2&&a.words===b.words&&a.last.tier==="A"&&a.last.ok,"tier A for real: the clip goes to /api/hear and the NAS's sure answer pays +2 💎 "+J(a.last));
    ok(post.type==="audio/wav"&&post.len>1000&&J(JSON.parse(post.expect||"[]"))===J(ex)&&post.token==="","the POST carries the clip, its type and the answers (X-Expect) "+J(post));
    ok(await waitFor(p,t=>state.talk.tpl>t,{arg:tpl0,timeout:8000})&&await E(a=>DB.keys("blobs").then(k=>k.indexOf("tpl:"+a+":0")>=0),ans),`the NAS was sure, so his clip is banked as a template for "${ans}" (tpl:${ans}:0)`);}
  {api.hear="ok";api.post="nope";await E(()=>Talk._reset());await E(()=>Talk._next("say"));const b=await snap();
    // the NAS hears a word that isn't one of the answers: not sure
    await E(()=>Talk._listen());await waitFor(p,()=>Talk._S().unsure>0&&!Talk._S().busy,{timeout:15000});const a=await snap();
    ok(a.gems===b.gems&&!(await E(()=>document.getElementById("tkQ").classList.contains("ask"))),"the NAS heard none of the answers: not sure, the choices show");}
  {api.hear="absent";api.post=null;await E(()=>Talk._reset());const b=await snap();await E(()=>Talk._next("say"));
    await E(()=>{Talk._A.ok=Date.now();});   // the NAS said yes a moment ago, and is gone now
    await E(()=>Talk._listen());const d=await waitFor(p,()=>Talk._S().done||(!Talk._S().busy&&Talk._S().unsure>0),{timeout:15000});const a=await snap();
    ok(d&&a.last.tier==="B"&&a.gems===b.gems+2&&await E(()=>Talk._A.down>0),"the NAS gone mid-visit (503): the same clip goes to tier B, and A is off for 10 minutes");}

  // ---- 10. eyes-free ----
  await E(()=>{Talk._hear=async(b,ex,c)=>{window.__heard.push({ex,tier:c&&c.tier});return window.__canned?window.__canned(ex):null;};
    Talk._record=async()=>({blob:new Blob([new Uint8Array(900)],{type:"audio/mp4"}),heard:true,ms:500});
    window.__canned=ex=>({tier:"B",best:document.getElementById("tkQ").dataset.ans,score:.9,sure:true,heard:true});
    state.settings.eyesFree=true;Talk.close();window.__heard=[];});
  await E(()=>Talk.open());
  ok(await E(()=>document.querySelector("#ovTalk .talksheet").classList.contains("eyes")),"eyes-free: the sheet is the car layout (one big button)");
  const n0=await E(()=>Talk._S().n);
  ok(await waitFor(p,n=>Talk._S().n>n,{arg:n0,timeout:25000})&&await E(()=>window.__heard.length>=1),"eyes-free: it listens by itself after the question and moves on by itself after a right answer");
  await E(()=>{window.__canned=ex=>({tier:"B",best:null,score:0,sure:false,heard:false});window.__heard=[];Talk._next("say");});
  ok(await waitFor(p,()=>window.__heard.length>=2,{timeout:25000}),"eyes-free, not heard: it asks him to tap, and listens once more by itself");
  await E(()=>{state.settings.eyesFree=false;Talk.close();window.__heard=[];});

  // ---- 11. the keyboard, and closing ----
  await E(()=>Talk.open());await E(()=>Talk._next("say"));
  await p.waitForTimeout(200);await E(()=>document.getElementById("tkMic").focus());await p.keyboard.press("Space");
  ok(await waitFor(p,()=>window.__heard.length>=1),"Space on the 🎤 button listens");
  await p.click("#tkX");
  ok(await waitFor(p,()=>Modes.top()==="valley"&&!document.getElementById("ovTalk").classList.contains("on")),"✕ closes it, back to the valley");

  // ---- 12. saves ----
  const kept=await seed(p,Object.assign({},S0,{talk:{log:[{d:"2026-09-01",tier:"B",ok:true}]},settings:{talk:true,tts:false}}));
  const s2=await E(()=>({talk:state.talk,t:state.settings.talk,e:state.settings.eyesFree}));
  ok(J(s2.talk)===J({log:[{d:"2026-09-01",tier:"B",ok:true}],tpl:0})&&s2.t===true&&s2.e===false,"a saved log is kept and tpl filled in; the setting is kept "+J(s2));
  await seed(p,Object.assign({},S0,{talk:null}));
  ok(await E(()=>JSON.stringify(state.talk)===JSON.stringify({log:[],tpl:0})),"a saved null talk gets its default");
  await seed(p,Object.assign({},S0,{talk:{log:"junk",tpl:3}}));await tidy();
  await E(()=>{state.settings.talk=true;Talk._record=async()=>null;Talk._hear=async()=>({tier:"B",best:document.getElementById("tkQ").dataset.ans,score:.9,sure:true,heard:true});Talk.open();Talk._listen();});
  ok(await waitFor(p,()=>Talk._S()&&Talk._S().done)&&await E(()=>Array.isArray(state.talk.log)&&state.talk.log.length===1&&state.talk.tpl===3),"a broken log is replaced when he next answers; the count is kept");
  await E(()=>Talk.close());

  const bad=errs.filter(e=>!/Failed to load resource/.test(e));
  ok(!bad.length,"no page or console errors"+(bad.length?": "+bad.join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
