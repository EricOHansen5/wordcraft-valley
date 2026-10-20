// The opening voice on the iPad: sound is locked (the AudioContext suspended) until his first touch. A line asked
// for before then must not start its clips while locked: started then, every piece of a several-clip line is
// scheduled at the same frozen moment and they all play on top of each other when he first touches the screen.
// A line waits for the sound to run, plays its pieces one after another, and gives way to a newer line.
"use strict";
const {launch,check}=require("./lib");
(async()=>{
  const t=check("voice boot"),ok=t.ok,J=x=>JSON.stringify(x);
  // (static: the real file server, which serves the voice clips)
  const {page:p,errs,close,E}=await launch({static:true,viewport:{width:1024,height:768},seed:{tour:99,settings:{goal:0}}});
  await p.waitForTimeout(800);
  // every clip that starts: when (page ms), how long, and whether the sound was running
  await E(()=>{window.__st=[];const st=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(){const c=this.context;window.__st.push({t:Math.round(performance.now()),d:Math.round((this.buffer?this.buffer.duration:0)*1000),run:c.state});return st.apply(this,arguments);};
    return VoicePack.load();});
  // the iPad's lock: until his touch, resume() does nothing (Chrome would allow it)
  await E(()=>{const c=Sound.ctx(),real=c.resume.bind(c);window.__touch=()=>{window.__locked=false;return real();};
    c.resume=()=>window.__locked?Promise.resolve():real();});
  const line="Want to read 15 more words today?";
  const parts=3;      // "want to read", "15", "more words today"

  // 1. locked: a several-clip line asked for now does not start while locked, then plays piece by piece
  await E(()=>{window.__locked=true;return Sound.ctx().suspend();});await p.waitForTimeout(200);
  await E(l=>{window.__st=[];window.__done=false;Sound.speak(l).then(()=>{window.__done=true;});},line);
  await p.waitForTimeout(1500);
  const locked=await E(()=>window.__st.slice());
  ok(!locked.length,"nothing starts while the sound is locked "+J(locked));
  await E(()=>window.__touch());await p.waitForTimeout(4500);
  const after=await E(()=>window.__st.filter(x=>x.d>250));
  const apart=after.every((x,i)=>!i||x.t>=after[i-1].t+after[i-1].d-60);
  ok(after.length>=2&&after.every(x=>x.run==="running")&&apart,"once it runs, the pieces play one after another, not on top of each other "+J({parts,after}));

  // 2. a newer line while the first still waits: only the newer one plays
  await E(()=>{window.__locked=true;return Sound.ctx().suspend();});await p.waitForTimeout(200);
  await E(l=>{window.__st=[];Sound.speak(l);setTimeout(()=>Sound.speak("What do you want to play?"),300);},line);
  await p.waitForTimeout(800);await E(()=>window.__touch());await p.waitForTimeout(4000);
  const two=await E(()=>window.__st.filter(x=>x.d>250));
  const overlap=two.some((x,i)=>i&&x.t<two[i-1].t+two[i-1].d-60);
  ok(two.length>=1&&!overlap,"a newer line takes its place; nothing overlaps "+J(two));

  // (the static server has no /api: its 404 for the backup check is not the game)
  const real=errs.filter(e=>!/status of 404/.test(e));
  ok(!real.length,"no page errors: "+real.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
