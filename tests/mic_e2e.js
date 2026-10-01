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
  const row=await E(()=>{renderSettings();return{btn:!!document.getElementById("micBtn"),meta:document.getElementById("micMeta").textContent,
    def:JSON.stringify([def().micCheck,def().micErr]),st:JSON.stringify([state.micCheck,state.micErr])};});
  ok(row.btn&&/Tests the microphone/.test(row.meta),"Settings has a Microphone check row with a Test button: "+row.meta);
  ok(row.def==="[null,null]"&&row.st==="[null,null]","micCheck and micErr default to null, and a save without them gets null "+row.st);

  // ---- 2. iPadOS says no ----
  await E(()=>{window.__gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("denied","NotAllowedError");};});
  await E(()=>document.getElementById("micBtn").click());
  let r=await waitFor(p,()=>state.micCheck&&state.micCheck.err?state.micCheck:false,{timeout:5000});
  let meta=await E(()=>document.getElementById("micMeta").textContent);
  ok(r&&r.err==="NotAllowedError"&&!r.ok&&r.origin===await E(()=>location.origin)&&r.secure===true,"the Test button records iPadOS saying no, with the address: "+JSON.stringify(r));
  ok(/iPadOS said no/.test(meta)&&/Screen Time/.test(meta)&&/Safari/.test(meta),"...and says where to look: "+meta);
  ok(await E(()=>!document.getElementById("micBtn").disabled&&document.getElementById("micBar").style.display==="none"),"the button is ready again and the level bar is hidden");

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
