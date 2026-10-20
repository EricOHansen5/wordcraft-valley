// Teach the game his voice, and Say it with two listeners (Playwright, about a minute). Grown-up menu → Settings → "Teach the
// game his voice": the row and its count, a session's words (his own, mastered first, look-alikes he has seen, none already
// holding 3 of his templates), Listen / ✓ He said it / ↺ Again / Skip, nothing spoken, the templates banked as kind "teach"
// (ranked over the NAS's, the 5-a-word cap kept), and Done. Then Say it when the NAS isn't sure: the matcher on the iPad has a
// say on the same clip (B sure pays; A and B leaning the same way is sure; both unsure is a kind "try once more", never a miss),
// each try's log entry says what was heard, tools/progress.js prints the tries and the Grown-up report counts the words, and
// Talk's tier choice skips the browser's recogniser in a home-screen app. The microphone is stood in for through Talk._record()
// (the game voice's clip of the word, as a WAV) and the NAS through a routed /api/hear, as tests/sayit_e2e.js does.
const {launch,check,waitFor}=require("./lib");
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
(async()=>{
  const T=check("voice_teach"),ok=T.ok,J=x=>JSON.stringify(x);
  const S0={settings:{tierOverride:3,tts:false,voicePack:false,speech:true,goal:0}};
  const {page:p,errs,close,E}=await launch({static:true,block_sw:true,seed:S0,viewport:{width:1024,height:768}});
  // the home server's /api/hear: "ok" or "absent" (404); a POST answers with api.reply(expect) or the first answer, sure
  const api={hear:"absent",posts:0,reply:null};
  await p.route("**/api/ping",r=>r.fulfill({status:200,contentType:"application/json",body:"{}"}));
  await p.route("**/api/hear",r=>{const q=r.request();
    if(q.method()==="GET"){
      if(api.hear==="ok")return r.fulfill({status:200,contentType:"application/json",body:J({ok:true,model:"base.en"})});
      return r.fulfill({status:404,contentType:"text/plain",body:"not found"});}
    api.posts++;
    if(api.hear!=="ok")return r.fulfill({status:503,contentType:"application/json",body:J({error:"no listener"})});
    const ex=JSON.parse(decodeURIComponent(q.headers()["x-expect"]||"[]"));
    const out=api.reply?api.reply(ex):{text:ex[0]+".",scores:Object.fromEntries(ex.map((e,i)=>[e,i?.3:1]))};
    return r.fulfill({status:200,contentType:"application/json",body:J(Object.assign({ms:640},out))});});
  // the microphone: the game voice saying window.__recWord (or the word on screen), as a WAV; window.__deaf: nothing heard
  await E(()=>{Guess.set(false);window.__rok=Rec.ok;window.__sa=Speech.available;window.__recs=0;
    window.__home=v=>{Object.defineProperty(navigator,"standalone",{value:v,configurable:true});};window.__home(false);
    window.__wav=async w=>{const idx=await VoicePack.load();
      const ab=await (await fetch("voice/"+idx[VoicePack.norm(w)])).arrayBuffer(),b=await new Promise((ok,no)=>Sound.ctx().decodeAudioData(ab,ok,no)),x=b.getChannelData(0);
      const pad=Math.round(b.sampleRate*.4),n=x.length+2*pad,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};
      s(0,"RIFF");v.setUint32(4,36+n*2,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,b.sampleRate,true);
      v.setUint32(28,b.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,n*2,true);
      for(let i=0;i<x.length;i++)v.setInt16(44+(pad+i)*2,Math.max(-1,Math.min(1,x[i]))*32767,true);
      return{blob:new Blob([buf],{type:"audio/wav"}),heard:true,ms:Math.round(x.length/b.sampleRate*1000)};};
    Talk._record=async()=>{window.__recs++;await new Promise(r=>setTimeout(r,150));if(window.__deaf)return{blob:null,heard:false,ms:0};
      const tv=document.getElementById("tvWord"),w=window.__recWord||(tv&&document.getElementById("ovTeach").classList.contains("on")?tv.dataset.w:cur&&cur.w);
      return window.__wav(w);};
    // anything spoken during a teach session is counted
    window.__said=0;const sp=Sound.speak,sy=Sound.say;Sound.speak=function(){window.__said++;return sp.apply(this,arguments);};Sound.say=function(){window.__said++;return sy.apply(this,arguments);};
    // what he has read: 40 words at level 3 or under seen, three of them mastered
    const ws=allWords().filter(x=>!x.tricky&&/^[a-z]+$/.test(x.w)&&x.t<=3).map(x=>x.w);state.stats={};
    ws.slice(0,40).forEach(w=>{state.stats[w]={seen:5,first:5,miss:0,mastered:false,rung:1,rungClean:0};});
    window.__mast=ws.slice(5,8);window.__mast.forEach(w=>{state.stats[w].mastered=true;state.stats[w].rung=2;state.stats[w].seen=9;});save();});

  // ---- 1. an old save, and the Settings row ----
  ok(await E(()=>JSON.stringify(state.talk.voice)==="{}"),"an old save gets talk.voice {} (the words that know his voice)");
  await E(()=>{openParent();document.querySelector('.tab[data-tab="set"]').click();});
  const row=()=>E(()=>{const r=document.getElementById("teachRow"),m=document.getElementById("micRow");
    return r?{after:m&&m.nextElementSibling===r,lbl:r.querySelector(".lbl").textContent,meta:(document.getElementById("teachMeta")||{}).textContent,btn:(document.getElementById("teachBtn")||{}).textContent}:null;});
  {await waitFor(p,()=>/know his voice/.test((document.getElementById("teachMeta")||{}).textContent||""),{timeout:3000});const r=await row();
    ok(r&&r.after&&r.lbl==="Teach the game his voice"&&r.btn==="Start","Settings: \"Teach the game his voice\" right after the Microphone check, with Start "+J(r));
    ok(r&&r.meta==="0 words know his voice","its meta line reads the templates stored: \"0 words know his voice\" "+J(r&&r.meta));}

  // a word already holding 3 of his templates isn't asked
  const full=await E(async()=>{const w=Object.keys(state.stats).filter(k=>!state.stats[k].mastered)[3],x=new Float32Array(16000);for(let i=4000;i<10000;i++)x[i]=Math.sin(i*(.05+i/2e6))*.3*Math.sin(Math.PI*(i-4000)/6000);
    const f=TalkMatch.features(x,16000);for(let k=0;k<3;k++)await Talk.bank(w,f.frames,"tap");return w;});

  // ---- 2. a session's words ----
  await p.click("#teachBtn");
  ok(await waitFor(p,()=>document.getElementById("ovTeach")&&document.getElementById("ovTeach").classList.contains("on")&&document.getElementById("tvWord")&&document.getElementById("tvWord").dataset.w,{timeout:5000}),"Start opens the sheet with a word");
  const L=await E(()=>Teach._list());
  const chk=await E(L=>L.map(w=>{const x=allWords().find(y=>y.w===w),s=state.stats[w]||{};return{w,ok:!!x&&!x.tricky&&x.t<=3&&s.seen>0,m:!!s.mastered};}),L);
  ok(L.length>=15&&L.length<=20&&new Set(L).size===L.length,"15-20 words a session, none twice ("+L.length+": "+L.join(" ")+")");
  ok(chk.every(c=>c.ok),"each one his own: built in, not a heart word, at his level or under, one he has seen "+J(chk.filter(c=>!c.ok)));
  {const was=await E(async()=>{const k=Talk.known;Talk.known=async()=>({});try{return await Teach.words();}finally{Talk.known=k;}});
    ok(was.indexOf(full)>=0&&L.indexOf(full)<0,"a word already holding 3 of his templates is skipped ("+full+", asked without them)");}
  ok(chk[0].m&&chk.findIndex(c=>c.m)===0,"mastered words first ("+L[0]+")");
  ok(await E(()=>Modes.stack().indexOf("other")>=0),"the sheet is registered with Modes");
  const view=()=>E(()=>{const g=id=>document.getElementById(id),vis=id=>!!g(id)&&g(id).style.display!=="none"&&!g(id).hidden;
    return{w:g("tvWord")&&g("tvWord").dataset.w,word:g("tvWord")&&g("tvWord").textContent,prog:g("tvProg")&&g("tvProg").textContent,msg:g("tvMsg")&&g("tvMsg").textContent,
      listen:vis("tvListen"),yes:vis("tvYes"),again:vis("tvAgain"),skip:vis("tvSkip"),end:g("tvEnd")?g("tvEnd").textContent:null};});
  {const v=await view();ok(v.w===L[0]&&v.word===L[0]&&v.prog===`1 of ${L.length}`&&v.listen&&v.skip&&!v.yes&&!v.again,"one word at a time, big, with \"1 of "+L.length+"\", Listen and Skip "+J(v));}

  // ---- 3. Listen, then ✓ He said it: banked as kind "teach" ----
  const tpl0=await E(()=>state.talk.tpl);
  await p.click("#tvListen");
  ok(await waitFor(p,()=>{const y=document.getElementById("tvYes");return y&&y.style.display!=="none";},{timeout:8000}),"after Listen: ✓ He said it");
  {const v=await view();ok(v.yes&&v.again&&v.skip&&!v.listen,"✓ He said it, ↺ Again and Skip "+J(v));}
  await p.click("#tvYes");
  ok(await waitFor(p,n=>document.getElementById("tvProg").textContent==="2 of "+n,{arg:L.length,timeout:5000}),"✓ moves on: \"2 of "+L.length+"\"");
  {const t=await E(w=>Talk._own(w).then(a=>a.map(x=>x.src)),L[0]),k=await E(w=>DB.keys("blobs").then(a=>a.filter(x=>String(x).indexOf("tpl:"+w+":")===0)),L[0]);
    ok(J(t)===J(["teach"])&&k.length===1,"his clip is banked as a template of kind teach "+J({t,k}));
    ok(await E(n=>state.talk.tpl===n+1,tpl0)&&await E(w=>state.talk.voice[w]===1,L[0]),"state.talk.tpl counts it, and talk.voice has the word");}

  // ---- 4. ↺ Again: nothing banked, listen again ----
  await p.click("#tvListen");await waitFor(p,()=>document.getElementById("tvYes").style.display!=="none",{timeout:8000});
  await p.click("#tvAgain");
  {const v=await view(),k=await E(w=>Talk._own(w).then(a=>a.length),L[1]);
    ok(v.listen&&!v.yes&&v.prog===`2 of ${L.length}`&&k===0,"↺ Again: Listen again, the same word, nothing banked "+J(v));}
  await p.click("#tvListen");await waitFor(p,()=>document.getElementById("tvYes").style.display!=="none",{timeout:8000});
  await p.click("#tvYes");await waitFor(p,n=>document.getElementById("tvProg").textContent==="3 of "+n,{arg:L.length,timeout:5000});
  ok(await E(w=>Talk._own(w).then(a=>a.length===1&&a[0].src==="teach"),L[1]),"then ✓ banks it");

  // ---- 5. nothing heard, and Skip ----
  await E(()=>{window.__deaf=true;});await p.click("#tvListen");
  ok(await waitFor(p,()=>/hear/i.test(document.getElementById("tvMsg").textContent),{timeout:6000}),"nothing heard: a kind line for the grown-up");
  {const v=await view();ok(v.listen&&!v.yes&&v.skip,"and Listen again, no ✓ "+J(v));}
  await E(()=>{window.__deaf=false;});
  await p.click("#tvSkip");
  {const v=await view(),k=await E(w=>Talk._own(w).then(a=>a.length),L[2]);ok(v.prog===`4 of ${L.length}`&&k===0,"Skip: the next word, nothing banked "+J(v));}
  ok(await E(()=>window.__said===0),"nothing is spoken to him: the word is shown, not said");

  // ---- 6. Done ----
  for(let i=3;i<L.length;i++)await p.click("#tvSkip");
  await waitFor(p,()=>document.getElementById("tvEnd"),{timeout:5000});
  {const v=await view();ok(v.end&&/3 words know his voice/.test(v.end),"at the end: Done, with how many words now know his voice "+J(v.end));}
  await p.click("#tvDone");
  ok(await E(()=>!document.getElementById("ovTeach").classList.contains("on")),"Done closes the sheet");
  {await waitFor(p,()=>document.getElementById("teachMeta").textContent==="3 words know his voice",{timeout:3000});
    const r=await row();ok(r&&r.meta==="3 words know his voice","the Settings row reads the store again: "+J(r&&r.meta));}

  // ---- 7. the rank and the cap ----
  {const r=await E(async()=>{const x=new Float32Array(16000);for(let i=4000;i<10000;i++)x[i]=Math.sin(i*(.05+i/2e6))*.3*Math.sin(Math.PI*(i-4000)/6000);
      const f=TalkMatch.features(x,16000).frames,w="zzteach",src=()=>Talk._own(w).then(a=>a.map(z=>z.src).sort().join(","));
      for(let k=0;k<5;k++){await Talk.bank(w,f,"A");await new Promise(r=>setTimeout(r,3));}
      const a=await src(),t1=await Talk.bank(w,f,"teach"),b=await src();
      for(let k=0;k<5;k++){await Talk.bank(w,f,"teach");await new Promise(r=>setTimeout(r,3));}
      const c=await src(),t2=await Talk.bank(w,f,"A"),d=await src(),t3=await Talk.bank(w,f,"tap");
      return{a,t1,b,c,t2,d,t3};});
    ok(r.a==="A,A,A,A,A"&&r.t1&&r.b==="A,A,A,A,teach","five a word: a teach clip makes room by putting out the oldest of a weaker kind "+J(r));
    ok(r.c==="teach,teach,teach,teach,teach"&&r.t2===false&&r.d===r.c&&r.t3===false,"teach outranks the NAS's (and a tap's): five teach clips stay "+J(r));}
  await E(()=>Modes.shut(document.getElementById("ovParent")));

  // ---- 8. Say it when the NAS isn't sure: the matcher has a say on the same clip ----
  const open=w=>E(x=>{document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);});Talk._reset();
    const y=allWords().find(z=>z.w===x);openWord(Object.assign({},y),{rung:2});},w);
  const showsUp=()=>waitFor(p,()=>document.getElementById("micBtn").style.display!=="none",{timeout:6000});
  const snap=()=>E(()=>{const s=state.stats[cur.w]||{};return{w:cur.w,gems:state.gems,miss:s.miss||0,misses,paid:!!cur._paid,n:state.talk.log.length,
    last:state.talk.log[state.talk.log.length-1]||null,toast:document.getElementById("toast").textContent};});
  const tap=()=>E(()=>document.getElementById("micBtn").click());
  const settled=()=>waitFor(p,()=>!document.getElementById("micBtn").classList.contains("listening"),{timeout:15000});
  // the NAS heard something close to another answer: not sure
  const unsure=(other,text)=>{api.reply=ex=>{const w=ex[0],o=other?ex.find(x=>x!==w):w,scores={};ex.forEach(e=>{scores[e]=e===o?.62:.3;});return{text:text||(o+"?"),scores};};};
  await E(()=>{window.__m=0;window.__realMatch=Talk.match;Talk.match=function(){window.__m++;return window.__realMatch.apply(this,arguments);};});
  api.hear="ok";
  const LONG="the big brown dog ran up the hill and sat down on a log";
  // a. A not sure (another word), B sure (his clip against the references): B's answer pays
  await open("hat");await showsUp();
  {unsure(true,LONG);const b=await snap();await tap();await settled();const a=await snap();
    ok(a.paid&&a.gems>b.gems&&/You said it/.test(a.toast),"the NAS not sure, the matcher sure: B's answer pays "+J({toast:a.toast,last:a.last}));
    const e=a.last||{};
    ok(e.from==="sayit"&&e.tier==="B"&&e.w==="hat"&&e.best==="hat"&&e.sure===true&&e.ok===true,"logged: decided by B, the word asked, its best, sure "+J(e));
    ok(e.text===LONG.slice(0,40)&&typeof e.score==="number"&&Math.round(e.score*100)/100===e.score&&e.at>0,"what the NAS heard (40 characters at most), the score to 2 places, when "+J({text:e.text,score:e.score,at:e.at}));
    ok(e.A&&e.A.score===.62&&e.A.sure===false&&e.A.best&&e.A.best!=="hat"&&e.B&&e.B.best==="hat"&&e.B.sure===true,"and each listener's own view "+J({A:e.A,B:e.B}));}
  // b. A not sure but leaning to the word, B not sure but agreeing: sure
  await open("pig");await showsUp();
  {unsure(false);await E(()=>{Talk.match=async(blob,ex)=>{window.__m++;return{tier:"B",best:ex[0],score:.55,scores:{},sure:false,heard:true,ms:500};};});
    const b=await snap();await tap();await settled();const a=await snap(),e=a.last||{};
    ok(a.paid&&a.gems>b.gems&&e.tier==="AB"&&e.sure===true&&e.ok===true&&e.best==="pig","A and B both lean to the same word with fair scores: sure, it pays, logged as AB "+J(e));}
  // c. both not sure: kind, never a miss
  await open("dog");await showsUp();
  {unsure(true);await E(()=>{Talk.match=async(blob,ex)=>{window.__m++;return{tier:"B",best:ex[0],score:.4,scores:{},sure:false,heard:true,ms:500};};});
    const b=await snap();await tap();await settled();const a=await snap(),e=a.last||{};
    ok(!a.paid&&a.gems===b.gems&&a.misses===0&&a.miss===b.miss&&/I didn't quite catch that\. Try once more/.test(a.toast),"both not sure: \"I didn't quite catch that. Try once more\", nothing paid, no miss "+J(a.toast));
    ok(e.sure===false&&e.ok===false&&e.w==="dog"&&e.A&&e.B&&e.B.score===.4,"logged as not sure, with both views "+J(e));}
  // d. A sure: the matcher isn't asked
  await open("sun");await showsUp();
  {api.reply=null;await E(()=>{window.__m=0;});await tap();await settled();const a=await snap(),m=await E(()=>window.__m);
    ok(a.paid&&a.last.tier==="A"&&a.last.sure&&m===0&&!a.last.B,"the NAS sure: its answer, the matcher not asked "+J({m,last:a.last}));}
  ok(api.posts>=4,"one recording each, sent to the NAS once ("+api.posts+" posts)");
  await E(()=>{Talk.match=window.__realMatch;});

  // ---- 9. the report and tools/progress.js ----
  await E(()=>openReport());
  {const line=await E(()=>{const e=document.getElementById("rSayIt");return e?e.textContent:"";}),n=await E(()=>Object.keys(state.talk.voice).filter(k=>state.talk.voice[k]>0).length);
    ok(new RegExp("words that know his voice: "+n).test(line),"the Grown-up report's Say it line: "+line);}
  {const snapF=path.join(os.tmpdir(),"wcv-teach-"+process.pid+".json");
    fs.writeFileSync(snapF,JSON.stringify(await E(()=>fullBackup())));
    const r=spawnSync("node",[path.join(__dirname,"..","tools","progress.js"),"--file",snapF],{encoding:"utf8"});try{fs.unlinkSync(snapF);}catch(e){}
    const out=(r.stdout||"")+(r.stderr||""),esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    const hatLine=new RegExp("\\d\\d-\\d\\d +\\d{1,2}:\\d\\d [ap]m +hat → heard \""+esc(LONG.slice(0,40))+"\" \\(A [a-z]+ \\.62 not sure; B hat \\.\\d\\d sure\\) ✓");
    ok(r.status===0&&hatLine.test(out),"progress.js prints each Say it try: "+((out.split("\n").find(l=>/ hat → /.test(l)))||out.slice(-600)));
    ok(/pig → heard "pig\?" \(A pig \.62 not sure; B pig \.55 not sure; both agree\) ✓/.test(out),"an A+B agreement says so: "+(out.split("\n").find(l=>/ pig → /.test(l))||""));
    ok(/\b\d+ words know his voice/.test(out),"and how many words know his voice: "+(out.split("\n").find(l=>/know his voice/.test(l))||""));}

  // ---- 10. Talk to me's tier choice in a home-screen app ----
  await E(()=>{Rec.ok=()=>false;Speech.available=()=>true;});
  ok(await E(()=>{Talk._reset();return Talk.tier(["cat","hat"]);})==="C","in a browser tab with only the browser's recogniser: C");
  await E(()=>window.__home(true));
  ok(await E(()=>{Talk._reset();return Talk.tier(["cat","hat"]);})==="screen","in a home-screen app the recogniser never hears: straight to the screen (tap)");
  ok(await E(()=>typeof homeApp==="function"&&homeApp()===true&&SayIt.homeApp()===true),"one homeApp() test, shared by Say it and Talk");
  await E(()=>{window.__home(false);Rec.ok=window.__rok;Speech.available=window.__sa;});

  const bad=errs.filter(e=>!/Failed to load resource/.test(e));
  ok(!bad.length,"no page or console errors"+(bad.length?": "+bad.join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
