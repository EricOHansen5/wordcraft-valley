// Tier A's clip level (Playwright, about half a minute): the iPad's microphone can be very quiet (its test once peaked
// at .008), and the NAS's speech detector drops a quiet clip as silence. So before a clip goes to /api/hear it is decoded,
// made mono at 16 kHz and brought up to a peak of .9 (30 times at most), and sent as a 16-bit WAV; a clip that is all but
// silent is not made louder, a clip at a good level stays as it is, and a clip that can't be decoded goes as recorded.
// Each Say it try and each Talk to me answer logs the clip's level before the gain (lvl) and the gain, and
// tools/progress.js prints them. The game voice's clips, scaled down, stand in for his voice.
const {launch,check,waitFor}=require("./lib");
const fs=require("fs"),os=require("os"),path=require("path"),{spawnSync}=require("child_process");
(async()=>{
  const T=check("hear_level"),ok=T.ok,J=x=>JSON.stringify(x);
  const S0={settings:{tierOverride:3,tts:false,voicePack:false,speech:true,goal:0,talk:true}};
  const {page:p,errs,close,E}=await launch({static:true,block_sw:true,seed:S0,viewport:{width:1024,height:768}});
  // the NAS: listening, sure of the first answer (or api.post); every POST kept with its body
  const api={posts:[],post:null};
  await p.route("**/api/ping",r=>r.fulfill({status:200,contentType:"application/json",body:"{}"}));
  await p.route("**/api/hear",r=>{const q=r.request();
    if(q.method()==="GET")return r.fulfill({status:200,contentType:"application/json",body:J({ok:true,model:"base.en"})});
    const h=q.headers();api.posts.push({type:h["content-type"],body:q.postDataBuffer()||Buffer.alloc(0)});
    const ex=JSON.parse(decodeURIComponent(h["x-expect"]||"[]")),best=api.post||ex[0],scores={};ex.forEach(e=>{scores[e]=e===best?1:.3;});
    return r.fulfill({status:200,contentType:"application/json",body:J({text:ex.length?best+".":"hello there",best:ex.length?best:null,scores,ms:640})});});
  // a WAV POST read back: its format and its loudest sample
  const wav=b=>{if(!b||b.length<44||b.toString("ascii",0,4)!=="RIFF"||b.toString("ascii",8,12)!=="WAVE")return null;
    const o={fmt:b.readUInt16LE(20),ch:b.readUInt16LE(22),rate:b.readUInt32LE(24),bits:b.readUInt16LE(34),n:(b.length-44)/2,peak:0};
    for(let i=44;i+1<b.length;i+=2){const v=Math.abs(b.readInt16LE(i))/32768;if(v>o.peak)o.peak=v;}return o;};
  // the game voice saying a word, times scale (or brought to a peak with {peak}), padded with 0.4 s of quiet, as a WAV at the clip's rate
  await E(()=>{window.__clip=async(w,scale,opt)=>{opt=opt||{};const idx=await VoicePack.load();
    const ab=await (await fetch("voice/"+idx[VoicePack.norm(w)])).arrayBuffer(),b=await new Promise((ok,no)=>Sound.ctx().decodeAudioData(ab,ok,no)),x=b.getChannelData(0);
    let pk=0;for(let i=0;i<x.length;i++)pk=Math.max(pk,Math.abs(x[i]));const k=opt.peak?opt.peak/pk:scale;
    const pad=Math.round(b.sampleRate*.4),n=x.length+2*pad,buf=new ArrayBuffer(44+n*2),v=new DataView(buf),s=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};
    s(0,"RIFF");v.setUint32(4,36+n*2,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,b.sampleRate,true);
    v.setUint32(28,b.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);s(36,"data");v.setUint32(40,n*2,true);
    for(let i=0;i<x.length;i++)v.setInt16(44+(pad+i)*2,Math.round(Math.max(-1,Math.min(1,x[i]*k))*32767),true);
    return new Blob([buf],{type:"audio/wav"});};
    window.__hear=async(w,scale,opt)=>{Talk._reset();await Talk.probe();const r=await Talk.hear(await window.__clip(w,scale,opt),[w,"big","pin"]);
      return r&&{tier:r.tier,best:r.best,sure:r.sure,lvl:r.lvl,gain:r.gain,log:Talk.heardOf(w,r)};};});
  const last=()=>api.posts[api.posts.length-1]||{};

  // ---- 1. a quiet clip (the game voice at 4%: about his level on the iPad's microphone test) goes as a WAV brought up to a fair level ----
  {const r=await E(()=>window.__hear("pig",.04)),w=wav(last().body);
    ok(last().type==="audio/wav"&&w&&w.fmt===1&&w.ch===1&&w.rate===16000&&w.bits===16,"a quiet clip reaches /api/hear as a 16 kHz mono 16-bit WAV "+J({type:last().type,w:w&&Object.assign({},w,{peak:+w.peak.toFixed(3)})}));
    ok(w&&w.peak>=.5&&w.peak<=.95,"and made louder: its peak is "+(w&&w.peak.toFixed(3)));
    ok(r&&r.lvl>0&&r.lvl<.01&&r.gain>10&&r.gain<=30,"Talk.hear says the level before (lvl) and the gain "+J(r&&{lvl:r.lvl,gain:r.gain}));
    ok(r&&r.log.lvl===Math.round(r.lvl*1000)/1000&&r.log.gain===Math.round(r.gain*10)/10,"heardOf keeps them for the log (lvl to 3 places, the gain to 1) "+J(r&&r.log));}
  // quieter still (2%): 30 times at most
  {const r=await E(()=>window.__hear("pig",.02)),w=wav(last().body),src=await E(async()=>{const b=new Uint8Array(await (await window.__clip("pig",.02)).arrayBuffer());
      let pk=0;for(let i=44;i+1<b.length;i+=2){const v=Math.abs((b[i]|(b[i+1]<<8))<<16>>16)/32768;if(v>pk)pk=v;}return pk;});
    ok(r&&r.gain===30&&w&&w.peak>=src*25&&w.peak<=src*31,"a clip at 2% is made 30 times louder and no more: "+J({gain:r&&r.gain,before:+src.toFixed(4),after:w&&+w.peak.toFixed(3)}));}

  // ---- 2. a clip that is all but silent is not made louder ----
  {const r=await E(()=>window.__hear("pig",.0003)),w=wav(last().body);
    ok(last().type==="audio/wav"&&w&&w.peak<.005,"a near-silent clip stays near-silent: peak "+(w&&w.peak.toFixed(4)));
    ok(r&&r.gain===1&&r.lvl<.001,"its gain is 1 "+J(r&&{lvl:r.lvl,gain:r.gain}));}

  // ---- 3. a clip at a good level keeps it ----
  {const r=await E(()=>window.__hear("pig",0,{peak:.85})),w=wav(last().body);
    ok(r&&r.gain>=.95&&r.gain<=1.15,"a clip that peaks at .85 is left about as it is: gain "+(r&&r.gain));
    ok(w&&w.peak>=.75&&w.peak<=.95,"its WAV peaks at "+(w&&w.peak.toFixed(3)));}

  // ---- 4. a clip that can't be decoded goes as recorded ----
  {const r=await E(async()=>{Talk._reset();await Talk.probe();const b=new Blob([new Uint8Array(900).map((_,i)=>i*7%251)],{type:"audio/mp4"});
      const x=await Talk.hear(b,["pig","big"]);return x&&{tier:x.tier,lvl:x.lvl,gain:x.gain,log:Talk.heardOf("pig",x)};});
    ok(last().type==="audio/mp4"&&last().body.length===900,"a clip it can't decode is sent as it was recorded "+J({type:last().type,len:last().body.length}));
    ok(r&&r.tier==="A"&&r.lvl==null&&!("lvl" in r.log)&&!("gain" in r.log),"with no level noted "+J(r));}

  // ---- 5. Say it: a quiet try is heard, and its log entry has the level ----
  await E(()=>{Guess.set(false);Object.defineProperty(navigator,"standalone",{value:true,configurable:true});
    Talk._record=async()=>({blob:await window.__clip(cur.w,.02),heard:true,ms:600});});
  api.post=null;
  {const n0=api.posts.length;
    await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);});Talk._reset();
      openWord(Object.assign({},allWords().find(z=>z.w==="pig")),{rung:2});});
    const shown=await waitFor(p,()=>document.getElementById("micBtn").style.display!=="none",{timeout:6000});
    await E(()=>document.getElementById("micBtn").click());
    const paid=await waitFor(p,()=>cur._paid,{timeout:15000}),e=await E(()=>state.talk.log[state.talk.log.length-1]||{}),w=wav((api.posts[n0]||{}).body);
    ok(shown&&paid&&e.from==="sayit"&&e.tier==="A"&&e.ok,"Say it: a quiet try reaches the NAS as a louder WAV and is heard "+J({peak:w&&+w.peak.toFixed(3),e}));
    ok(e.lvl>0&&e.lvl<.01&&e.gain>10,"its log entry has the clip's level and the gain "+J({lvl:e.lvl,gain:e.gain}));}

  // ---- 6. Talk to me: a sure answer and a tap after "not sure" log the level too ----
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);});
    Talk._record=async()=>({blob:await window.__clip(document.getElementById("tkQ").dataset.ans,.02),heard:true,ms:600});Talk._reset();Talk.open();});
  {api.post=await E(()=>Talk._next("say").ans);const n=await E(()=>state.talk.log.length);await E(()=>Talk._listen());
    await waitFor(p,()=>Talk._S().done,{timeout:15000});const e=await E(n=>state.talk.log[n]||{},n);
    ok(e.tier==="A"&&e.ok&&!e.from&&e.lvl>0&&e.lvl<.01&&e.gain>10,"Talk to me: a sure answer's log entry has the level and the gain "+J(e));}
  {api.post="nope";await E(()=>Talk._next("say"));const n=await E(()=>state.talk.log.length);await E(()=>Talk._listen());
    await waitFor(p,()=>Talk._S().unsure>0&&!Talk._S().busy,{timeout:15000});
    await E(()=>{const h=document.getElementById("tkQ");h.querySelector(`.tkopt[data-w="${h.dataset.ans}"]`).click();});
    const e=await E(n=>state.talk.log[n]||{},n);
    ok(e.tier==="tap"&&e.ok&&e.lvl>0&&e.lvl<.01&&e.gain>10,"a tap after \"not sure\" logs the level of the clip it didn't catch "+J(e));}
  await E(()=>Talk.close());

  // ---- 7. tools/progress.js prints the level ----
  {const snapF=path.join(os.tmpdir(),"wcv-level-"+process.pid+".json");
    fs.writeFileSync(snapF,JSON.stringify(await E(()=>fullBackup())));
    const r=spawnSync("node",[path.join(__dirname,"..","tools","progress.js"),"--file",snapF],{encoding:"utf8"});try{fs.unlinkSync(snapF);}catch(e){}
    const out=(r.stdout||"")+(r.stderr||""),line=out.split("\n").find(l=>/ pig → /.test(l))||"";
    ok(r.status===0&&/ pig → heard "pig\." \(A pig 1\.00 sure\) ✓ {2}level \.00\d ×[\d.]+$/.test(line.trimEnd()),"progress.js prints a Say it try's level and gain: "+(line||out.slice(-400)));}

  const bad=errs.filter(e=>!/Failed to load resource/.test(e));
  ok(!bad.length,"no page or console errors"+(bad.length?": "+bad.join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
