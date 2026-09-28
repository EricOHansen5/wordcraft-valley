// Decoding help in the crate loop: a connected ("mmmaaat") blend, "try the other sound"
// from level 5, and a miss on a one-sound-away word names both sounds.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8820,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,serviceWorkers:"block"});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  p.on("console",m=>{if(m.type()==="error")errs.push("console: "+m.text());});
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  const st={tour:99,guardians:[0,1,2,3],wordsRead:60,gems:40,rows:7,biome:2,vehStarter:true,seasonSeen:"autumn",critters:[],vehicles:[]};
  // a parent's recording of "m": 0.2 s of silence, 0.5 s of hum, 0.2 s of silence (a WAV)
  const wav=(()=>{const sr=24000,n=Math.round(sr*.9),buf=Buffer.alloc(44+n*2);
    buf.write("RIFF",0);buf.writeUInt32LE(36+n*2,4);buf.write("WAVE",8);buf.write("fmt ",12);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);
    buf.writeUInt16LE(1,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write("data",36);buf.writeUInt32LE(n*2,40);
    for(let i=0;i<n;i++){const t=i/sr,v=t>=.2&&t<.7?Math.sin(2*Math.PI*200*t)*.5:0;buf.writeInt16LE(Math.round(v*32767),44+i*2);}
    return buf.toString("base64");})();
  await p.goto("http://localhost:8820/");
  await p.evaluate(([s,b64])=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      const tx=r.result.transaction(["kv","blobs"],"readwrite");tx.objectStore("kv").put(s,"state");
      tx.objectStore("blobs").put(new Blob([u],{type:"audio/wav"}),"aud:sound:m");tx.oncomplete=()=>{r.result.close();res();};};}),[st,wav]);
  await p.reload();await p.waitForTimeout(2200);
  const E=(x,a)=>p.evaluate(x,a);
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));Skills.slow=false;});
  const gems0=await E(()=>state.gems);const gemLog=[gems0];
  const gemsNow=async()=>{gemLog.push(await E(()=>state.gems));};
  const open=(w,extra,rung)=>E(([w,extra,rung])=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));Skills.slow=false;
    openWord(Object.assign({},allWords().find(x=>x.w===w),extra||{}),{rung});},[w,extra||null,rung]);

  // ---- 1. connected blend -------------------------------------------------
  await open("map",null,2);await p.waitForTimeout(300);
  const lit=await E(()=>{window._litAt=[];const L=[...document.querySelectorAll("#letters .lt")],t0=performance.now();
    const mo=new MutationObserver(ms=>ms.forEach(m=>{const i=L.indexOf(m.target);if(i>=0&&m.target.classList.contains("blend")&&window._litAt[i]==null)window._litAt[i]=performance.now()-t0;}));
    L.forEach(t=>mo.observe(t,{attributes:true,attributeFilter:["class"]}));return blend().then(()=>{mo.disconnect();return window._litAt;});});
  const B1=await E(()=>window._lastBlend);
  const s1=B1.sounds;
  ok(B1.mode==="connected"&&s1.length===3&&s1.map(x=>x.ph).join()==="m,a,p","map: blend runs as one connected stream "+JSON.stringify(s1));
  ok(s1.length===3&&s1[1].at<s1[0].at+s1[0].dur-.05&&s1[2].at<s1[1].at+s1[1].dur-.05,"map: each sound starts before the one before it ends (overlap)");
  ok(s1.length===3&&Math.abs(s1[2].at-s1[1].at-s1[1].dur*.72)<.01,"map: a held sound hands over at 72 % ("+(s1[1]&&s1[1].dur)+" s)");
  ok(s1[0]&&s1[0].src==="clip"&&s1[0].dur>.45&&s1[0].dur<.6,"map: the parent's recording of m is used, trimmed of its silence ("+(s1[0]&&s1[0].dur)+" s)");
  const aDur=await E(()=>Phonics.duration("a"));
  ok(s1[1]&&s1[1].src==="synth"&&s1[1].dur>aDur*1.2,`map: the synth's a is drawn out for the blend (${s1[1]&&s1[1].dur} s, ${aDur} s alone)`);
  ok(B1.word==="map"&&B1.done,"map: the blend still ends with the word");
  ok(lit.length===3&&lit[0]<lit[1]&&lit[1]<lit[2]&&lit[2]-lit[0]<1500,"map: tiles light one by one as their sounds begin "+JSON.stringify(lit.map(x=>Math.round(x))));
  await open("cat",null,2);await p.waitForTimeout(300);
  await E(()=>blend());
  const s2=(await E(()=>window._lastBlend)).sounds;
  ok(s2.length===3&&s2[0].kind==="stop"&&Math.abs(s2[1].at-s2[0].dur*.85)<.01&&s2[0].dur<.2,"cat: a stop is not stretched and overlaps tightly (85 %) "+JSON.stringify(s2.slice(0,2)));
  // forced failure: the synth throws, so the blend falls back to one sound at a time
  await open("map",null,2);await p.waitForTimeout(300);
  await E(()=>{window._render=Phonics.render;Phonics.render=()=>{throw new Error("forced for the test");};});
  await E(()=>blend());
  const B3=await E(()=>window._lastBlend);
  await E(()=>{Phonics.render=window._render;});
  ok(B3.mode==="sequential"&&B3.word==="map"&&B3.done,"forced failure: the blend falls back to one at a time and still says the word "+B3.mode);
  // tapping one tile still plays only that sound, as before
  const tap=await E(async()=>{const said=[],o=Sound.say;Sound.say=(k,f,r,opt)=>{said.push(k+(opt?"+stream":""));return Promise.resolve();};
    document.querySelectorAll("#letters .lt")[1].click();await new Promise(r=>setTimeout(r,50));Sound.say=o;return said;});
  ok(JSON.stringify(tap)==='["sound:a"]',"tapping a tile plays just that sound "+JSON.stringify(tap));
  await gemsNow();

  // ---- record what is said from here on ------------------------------------
  await E(()=>{window._spk=[];window._said=[];window._flip=0;
    Sound.speak=t=>{window._spk.push(t);return Promise.resolve();};
    Sound.say=k=>{window._said.push(k);if(k.startsWith("sound:")&&document.querySelector("#letters .lt.flip"))window._flip++;return Promise.resolve();};});
  const reset=()=>E(()=>{window._spk=[];window._said=[];window._flip=0;});
  // miss by tapping a wrong pick, standing in for the word named (so the difference is known)
  const missAs=(as)=>E(as=>{const b=[...document.querySelectorAll("#picks [data-w]")].find(x=>x.dataset.w!==cur.w&&!x.classList.contains("used"));
    b.dataset.w=as;b.click();},as);
  const OTHER=/Try the other sound/;
  const hasPicks=()=>E(()=>!!document.querySelector(`#picks [data-w="${cur.w}"]`));

  // ---- 2. try the other sound ------------------------------------------------
  await open("leaf",{t:6},0);await p.waitForTimeout(400);await reset();
  await missAs("rocket");await p.waitForTimeout(1900);
  const r1=await E(()=>({spk:window._spk,said:window._said,flip:window._flip,tip:(document.querySelector("#shieldHost .readtip")||{}).textContent,
    bub:document.getElementById("buddyBubble")&&document.getElementById("buddyBubble").textContent}));
  ok(r1.spk.filter(t=>OTHER.test(t)).length===1&&r1.spk.includes("That didn't sound like a word. Try the other sound for E A."),"leaf (level 6), first miss: the buddy says try the other sound for E A "+JSON.stringify(r1.spk));
  ok(/other sound for 'ea'/.test(r1.tip||"")&&/other sound for 'ea'/.test(r1.bub||""),"leaf: the line shows in the reading screen and the buddy bubble: "+r1.tip);
  ok(r1.flip===1&&r1.said.indexOf("sound:ea")>=0,"leaf: the ea tile flips and plays its sound "+JSON.stringify(r1.said));
  ok(r1.said.slice(-1)[0]==="word:leaf","leaf: then blends and says the word");
  ok(await hasPicks(),"leaf: the answer is still on the screen");
  await reset();await missAs("rocket");await p.waitForTimeout(1200);
  const r2=await E(()=>({spk:window._spk,flip:window._flip,hint:!!document.querySelector(`#picks .pick.hint[data-w="${cur.w}"]`)}));
  ok(!r2.spk.some(t=>OTHER.test(t))&&r2.flip===0&&r2.hint,"leaf, second miss: no other-sound hint; the right picture glows instead");
  await gemsNow();
  await open("leaf",{t:6},0);await p.waitForTimeout(400);await reset();
  await missAs("rocket");await p.waitForTimeout(1500);
  ok(!(await E(()=>window._spk)).some(t=>OTHER.test(t)),"leaf again: the hint comes once per word");
  for(const [w,extra,why] of [["hen",null,"a level-2 word"],["snow",null,"a level-4 word with ow"],["could",null,"a tricky word (ou)"]]){
    await open(w,extra,0);await p.waitForTimeout(400);await reset();
    await missAs("rocket");await p.waitForTimeout(1500);
    const r=await E(()=>({spk:window._spk,said:window._said,flip:window._flip}));
    ok(!r.spk.some(t=>OTHER.test(t))&&r.flip===0&&r.said.slice(-1)[0]==="word:"+w,`${w} (${why}): no other-sound hint, the plain blend instead `+JSON.stringify(r.said));
    ok(await hasPicks(),w+": the answer is still on the screen");
  }
  await gemsNow();

  // ---- 3. name the confused sound -----------------------------------------------
  await open("cat",null,0);await p.waitForTimeout(400);await reset();
  await missAs("hat");await p.waitForTimeout(2000);
  const n1=await E(()=>({spk:window._spk,said:window._said,tip:(document.querySelector("#shieldHost .readtip")||{}).textContent}));
  ok(JSON.stringify(n1.spk)==='["That one has the sound","This word has the sound"]',"cat, picked hat: two fixed lines "+JSON.stringify(n1.spk));
  ok(n1.said[0]==="sound:h"&&n1.said[1]==="sound:c","cat, picked hat: the sounds named are h, then c "+JSON.stringify(n1.said));
  ok(n1.tip==="That one has the sound 'h'. This word has the sound 'c'.","cat: shown as "+n1.tip);
  ok(n1.said.slice(-1)[0]==="word:cat","cat: then blends and says the word");
  await gemsNow();
  await open("cat",null,0);await p.waitForTimeout(400);await reset();
  await missAs("pot");await p.waitForTimeout(1500);
  const n2=await E(()=>({spk:window._spk,said:window._said,tip:!!document.querySelector("#shieldHost .readtip")}));
  ok(!n2.spk.length&&!n2.tip&&JSON.stringify(n2.said)==='["sound:c","sound:a","sound:t","word:cat"]',"cat, picked pot (two sounds differ): the plain feedback "+JSON.stringify(n2.said));
  await reset();await missAs("hat");await p.waitForTimeout(1500);
  const n3=await E(()=>({spk:window._spk,hint:!!document.querySelector(`#picks .pick.hint[data-w="${cur.w}"]`)}));
  ok(!n3.spk.length&&n3.hint,"cat, second miss on hat: no named sounds, the right picture glows");
  // Hear it (words in print): picking a one-sound-away word names the sounds too
  await E(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));openWord(Object.assign({},allWords().find(x=>x.w==="cap")),{rung:0});renderListen(cur);});
  await p.waitForTimeout(500);await reset();
  const pickedW=await E(()=>{const b=[...document.querySelectorAll("#picks .pick.text")].find(x=>x.dataset.w!==cur.w);b.click();return b.dataset.w;});
  await p.waitForTimeout(2000);
  const n4=await E(()=>({spk:window._spk}));
  const single=await E(w=>!!soundDiff(cur,w),pickedW);
  ok(single?n4.spk.length===2:n4.spk.length===0,`Hear it: cap, picked ${pickedW} (${single?"one sound away":"not one sound away"}): ${JSON.stringify(n4.spk)}`);
  await gemsNow();

  // ---- throughout ---------------------------------------------------------------
  ok(gemLog.every((g,i)=>i===0||g>=gemLog[i-1]),"gems never go down "+JSON.stringify(gemLog));
  ok(!errs.length,"no page or console errors "+errs.join(" | "));
  await b.close();srv.close();
});
