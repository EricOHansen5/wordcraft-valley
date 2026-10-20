// Microphone check (Grown-up menu → Settings): the row and its Test button, what each failure says
// (iPadOS saying no, no microphone API, an http:// address, another app holding it), a working
// microphone (a stand-in stream from an oscillator), state.micCheck after a test, state.micErr when a
// real recording could not start (Rec, Talk to me), the fields' defaults, and no page errors.
const {launch,waitFor,check}=require("./lib");
const T=check("mic"),ok=T.ok;
(async()=>{
  const {page:p,close,E,errs}=await launch({viewport:{width:1024,height:768},seed:{settings:{goal:0}}});
  await p.mouse.click(500,300);   // a real touch, so the audio context may run
  await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));

  // ---- 1. the row, before any test ----
  // (the row's own button: another element once shared its id, so the page's first "micBtn" was not this one)
  const testBtn='#micRow button';
  const row=await E(s=>{renderSettings();return{btn:!!document.querySelector(s),meta:document.getElementById("micMeta").textContent,
    def:JSON.stringify([def().micCheck,def().micErr]),st:JSON.stringify([state.micCheck,state.micErr])};},testBtn);
  const dup=await E(()=>{const n={};document.querySelectorAll("[id]").forEach(e=>{n[e.id]=(n[e.id]||0)+1;});return Object.keys(n).filter(k=>n[k]>1);});
  ok(!dup.length,"no two elements in the page share an id "+JSON.stringify(dup));
  ok(row.btn&&/Tests the microphone/.test(row.meta),"Settings has a Microphone check row with a Test button: "+row.meta);
  ok(row.def==="[null,null]"&&row.st==="[null,null]","micCheck and micErr default to null, and a save without them gets null "+row.st);

  // ---- 2. iPadOS says no ----
  await E(()=>{window.__gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("denied","NotAllowedError");};});
  await E(s=>document.querySelector(s).click(),testBtn);
  let r=await waitFor(p,()=>state.micCheck&&state.micCheck.err?state.micCheck:false,{timeout:5000});
  let meta=await E(()=>document.getElementById("micMeta").textContent);
  ok(r&&r.err==="NotAllowedError"&&!r.ok&&r.origin===await E(()=>location.origin)&&r.secure===true,"the Test button records iPadOS saying no, with the address: "+JSON.stringify(r));
  ok(/iPadOS said no/.test(meta)&&/Screen Time/.test(meta)&&/Safari/.test(meta),"...and says where to look: "+meta);
  ok(await E(s=>!document.querySelector(s).disabled&&document.getElementById("micBar").style.display==="none",testBtn),"the button is ready again and the level bar is hidden");

  const studio=await E(async()=>{let said="";const a=window.alert;window.alert=m=>{said=String(m);};
    const b=document.createElement("button");await toggleRecord("sound:a",b);window.alert=a;return said;});
  ok(/iPadOS said no/.test(studio)&&!/needs Safari over HTTPS/.test(studio),"the Voice Studio says the real reason too: "+studio);

  // ---- 3. another app holds it ----
  await E(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("busy","NotReadableError");};});
  r=await E(()=>MicCheck.run());
  ok(r.err==="NotReadableError"&&/another app/.test(await E(()=>document.getElementById("micMeta").textContent)),"NotReadableError: another app is using the microphone");

  // ---- 4. a working microphone (an oscillator stands in) ----
  await E(()=>{navigator.mediaDevices.getUserMedia=async()=>{const c=new AudioContext();try{await c.resume();}catch(e){}
    const o=c.createOscillator(),g=c.createGain(),d=c.createMediaStreamDestination();g.gain.value=.5;o.connect(g);g.connect(d);o.start();window.__osc=c;return d.stream;};});
  const t0=Date.now();
  r=await E(()=>MicCheck.run());
  meta=await E(()=>document.getElementById("micMeta").textContent);
  ok(r.ok&&!r.err&&Date.now()-t0>=2900,"a microphone that opens: ok after about three seconds of level ("+(Date.now()-t0)+" ms, level "+r.peak+")");
  ok(/the microphone works|heard almost nothing/.test(meta),"...and the row says so: "+meta);
  ok(await E(()=>state.micCheck&&state.micCheck.ok===true),"state.micCheck keeps the last test");
  // a very quiet microphone (a tone at RMS .003, below one step of the 8-bit level): its level is measured, not stuck at the 8-bit floor
  await E(()=>{window.__oscGum=navigator.mediaDevices.getUserMedia;navigator.mediaDevices.getUserMedia=async()=>{const c=new AudioContext();try{await c.resume();}catch(e){}
    const o=c.createOscillator(),g=c.createGain(),d=c.createMediaStreamDestination();g.gain.value=.003*Math.SQRT2;o.connect(g);g.connect(d);o.start();window.__osc=c;return d.stream;};});
  r=await E(()=>MicCheck.run());
  meta=await E(()=>document.getElementById("micMeta").textContent);
  ok(r.ok&&r.peak>=.0025&&r.peak<=.0036,"a quiet microphone's level is measured (RMS .003 reads "+r.peak+")");
  ok(/heard almost nothing/.test(meta),"...and the row says it heard almost nothing: "+meta);
  await E(()=>{try{window.__osc.close();}catch(e){}navigator.mediaDevices.getUserMedia=window.__oscGum;});

  // ---- 4b. the iPad's audio session: the game plays as "playback", and iPadOS gives such a page no
  // microphone (InvalidStateError) unless the session is "play-and-record" while it records ----
  await E(()=>{const work=navigator.mediaDevices.getUserMedia;window.__work=work;
    Object.defineProperty(navigator,"audioSession",{value:{type:"playback"},configurable:true});
    window.__types=[];navigator.mediaDevices.getUserMedia=function(c){window.__types.push(navigator.audioSession.type);
      if(navigator.audioSession.type!=="play-and-record")return Promise.reject(new DOMException("not now","InvalidStateError"));return work.call(this,c);};});
  r=await E(()=>MicCheck.run());
  const ses=await E(()=>({types:window.__types,after:navigator.audioSession.type}));
  ok(r.ok&&!r.err,"the Test button opens the microphone with the iPad's playback session ("+(r.err||"ok")+")");
  ok(ses.types[0]==="play-and-record"&&ses.after==="playback","...asking as play-and-record, and back to playback after "+JSON.stringify(ses));
  const st2=await E(async()=>{window.__types=[];const b=document.createElement("button");let said="";const a=window.alert;window.alert=m=>{said=String(m);};
    await toggleRecord("sound:a",b);const during=navigator.audioSession.type;await new Promise(r=>setTimeout(r,300));
    await toggleRecord("sound:a",b);await new Promise(r=>setTimeout(r,500));window.alert=a;
    return{said,during,after:navigator.audioSession.type,types:window.__types};});
  ok(!st2.said&&st2.during==="play-and-record"&&st2.after==="playback","the Voice Studio records too, and hands the session back "+JSON.stringify(st2));
  await E(()=>{delete navigator.audioSession;navigator.mediaDevices.getUserMedia=window.__work;});

  // ---- 5. no microphone API (an iPadOS too old), and an http:// address ----
  await E(()=>{navigator.mediaDevices.getUserMedia=undefined;});
  r=await E(()=>MicCheck.run());
  ok(r.err==="no getUserMedia"&&/Software Update/.test(await E(()=>document.getElementById("micMeta").textContent)),"no getUserMedia on a secure page: update iPadOS");
  const http=await E(()=>MicCheck.text({at:new Date().toISOString(),err:"not https",origin:"http://192.168.1.91:8088",ok:false}));
  ok(/http:\/\/192\.168\.1\.91:8088/.test(http)&&/https:\/\//.test(http)&&/restore his save/.test(http),"an http:// address: says which address and to use the https:// one "+http);

  // ---- 6. a real recording that could not start is noted for the backup ----
  await E(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("denied","NotAllowedError");};state.micErr=null;});
  const rec=await E(async()=>{const okMic=await Rec.start();return{okMic,err:state.micErr};});
  ok(rec.okMic===false&&rec.err&&rec.err.where==="recording"&&rec.err.err==="NotAllowedError","a book recording that can't start notes state.micErr "+JSON.stringify(rec.err));
  await E(()=>{MicCheck.note("recording",new DOMException("denied","NotAllowedError"));});
  ok(await E(t=>state.micErr.at===t,rec.err.at),"the same failure again within a minute is not written again");
  await E(()=>MicCheck.note("talk"));
  ok(await E(()=>state.micErr.where==="talk"&&state.micErr.err==="unknown"),"Talk to me's failure replaces it: "+await E(()=>JSON.stringify(state.micErr)));

  // ---- 7. it all survives a save and a reload ----
  await E(()=>{if(window.__gum)navigator.mediaDevices.getUserMedia=window.__gum;saveNow();});await p.waitForTimeout(300);
  await p.reload();await waitFor(p,()=>typeof state!=="undefined"&&state&&state.micCheck!==undefined,{timeout:15000});
  ok(await E(()=>state.micCheck&&state.micCheck.err==="no getUserMedia"&&state.micErr&&state.micErr.where==="talk"),"state.micCheck and state.micErr are saved");

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  T.done();await close();process.stdout.write("",()=>process.exit(process.exitCode||0));
})().catch(e=>{console.log("FAIL mic crashed: "+(e&&e.stack||e));process.exit(1);});
