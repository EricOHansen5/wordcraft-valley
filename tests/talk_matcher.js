// Talk to me, tier B (jsdom, no browser, about 20 s): the matcher in app/index.html (TalkMatch) on synthetic speech.
// Decoding the game's mp3 clips in Node isn't practical, so the "words" are made here: a pulse train (the voice) through
// formant resonators gliding between vowel targets, with hiss for the consonants (a tiny formant synthesiser). Four
// words, two of them (cat, cot) differing only in the vowel. Each is recorded once as the reference; then said again
// faster and slower, higher and lower, at another sample rate, with noise, and the matcher has to pick it out. Also:
// silence and noise are "nothing said", how long he spoke, a page split into its words, the DTW itself, the templates
// kept as small plain objects, at most five banked a word (and a weaker kind never pushes out a better one), and the
// transcript scoring the browser's recogniser (tier C) shares with server/hear/hear.py.
"use strict";
const fs=require("fs"),path=require("path"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=require("./page").html(),errors=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){},context:null});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createDynamicsCompressor:()=>Object.assign(node(),{threshold:P(),ratio:P()}),
    createPeriodicWave:()=>({}),createBuffer:(ch,len)=>({getChannelData:()=>new Float32Array(len)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.URL.createObjectURL=()=>"blob:x";
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});w.fetch=()=>Promise.reject(new Error("offline"));
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
}});
const w=dom.window,M=w.eval("TalkMatch");
let fails=0,passes=0;const ok=(c,m)=>{if(c)passes++;else fails++;console.log((c?"PASS ":"FAIL ")+m);};
const J=x=>JSON.stringify(x);

// ---------- a tiny formant synthesiser ----------
function rnd(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// spec: segments {v: voiced, h: hiss, f1, f2 (glide to the next), d: seconds, a: level}
function say(spec,{rate=24000,f0=240,speed=1,snr=0,seed=1,lead=.25,tail=.3,gain=.5}={}){
  const r=rnd(seed),segs=spec.map(s=>Object.assign({},s,{d:s.d*speed})),total=segs.reduce((a,s)=>a+s.d,0);
  const n=Math.round((lead+total+tail)*rate),x=new Float32Array(n),res=[0,1,2].map(()=>({y1:0,y2:0}));
  let pos=Math.round(lead*rate),ph=0;
  segs.forEach((s,si)=>{const len=Math.round(s.d*rate),nx=segs[si+1]||s;
    for(let i=0;i<len&&pos<n;i++,pos++){const u=i/len,F=[s.f1+(nx.f1-s.f1)*u*u,s.f2+(nx.f2-s.f2)*u*u,2600];
      let src=0;if(s.v){ph+=f0*(1+.03*Math.sin(pos/rate*5))/rate;if(ph>=1){ph-=1;src=1;}}if(s.h)src+=(r()*2-1)*s.h;
      let y=src;F.forEach((f,k)=>{const bw=80+k*40,R=Math.exp(-Math.PI*bw/rate),th=2*Math.PI*f/rate,o=(1-R)*y+2*R*Math.cos(th)*res[k].y1-R*R*res[k].y2;
        res[k].y2=res[k].y1;res[k].y1=o;y=y*.3+o;});
      x[pos]+=y*Math.min(1,i/(.02*rate),(len-i)/(.02*rate))*(s.a||1);}});
  let pk=0;for(const v of x)pk=Math.max(pk,Math.abs(v));for(let i=0;i<n;i++)x[i]=x[i]/pk*gain;
  if(snr){let p=0,m=0;for(const v of x)if(Math.abs(v)>.01){p+=v*v;m++;}p/=Math.max(1,m);const sd=Math.sqrt(p/Math.pow(10,snr/10))*1.73;for(let i=0;i<n;i++)x[i]+=(r()*2-1)*sd;}
  return x;
}
const WORDS={
  cat:[{f1:300,f2:2200,h:.8,d:.06},{v:1,f1:750,f2:1750,d:.22},{f1:400,f2:1800,h:.5,d:.05}],
  cot:[{f1:300,f2:2200,h:.8,d:.06},{v:1,f1:650,f2:1000,d:.22},{f1:400,f2:1800,h:.5,d:.05}],
  sun:[{f1:300,f2:4000,h:1,d:.14},{v:1,f1:620,f2:1200,d:.18},{v:1,f1:300,f2:1400,d:.12,a:.6}],
  bee:[{v:1,f1:250,f2:900,d:.05,a:.5},{v:1,f1:280,f2:2300,d:.28}]
};
const F32=a=>new w.Float32Array(a);   // arrays made in the page's own realm
const feat=(x,rate)=>M.features(F32(x),rate);

setTimeout(async()=>{
  ok(!errors.length,"the page boots with no errors"+(errors.length?": "+errors[0]:""));
  ok(M&&typeof M.features==="function"&&typeof M.match==="function"&&M.SR===16000,"TalkMatch is there: features, match, 16 kHz");

  // ---- 1. nothing said, and how long ----
  const quiet=new Float32Array(48000),r=rnd(3);for(let i=0;i<quiet.length;i++)quiet[i]=(r()*2-1)*.002;
  const hiss=new Float32Array(48000);for(let i=0;i<hiss.length;i++)hiss[i]=(r()*2-1)*.05;
  const zero=new Float32Array(32000);
  const q=feat(quiet,48000),h=feat(hiss,48000),z=feat(zero,16000);
  ok(!q.heard&&!q.frames.length&&!h.heard&&!z.heard,`silence, steady noise and digital zero are "nothing said" (${q.heard}, ${h.heard}, ${z.heard})`);
  const cat=feat(say(WORDS.cat,{seed:3}),24000),long=feat(say(WORDS.cat,{seed:3,speed:1.6}),24000);
  ok(cat.heard&&cat.ms>=300&&cat.ms<=480,`a word is heard, and it lasted about 0.33 s: ${cat.ms} ms`);
  ok(long.heard&&long.ms>cat.ms*1.35,`said slower, it lasts longer: ${long.ms} ms against ${cat.ms} ms`);
  const lead=feat(say(WORDS.cat,{seed:3,lead:1.5,tail:1.2}),24000);
  ok(lead.heard&&Math.abs(lead.ms-cat.ms)<=40,`the silence before and after is trimmed (${lead.ms} ms with 2.7 s of silence round it)`);
  const soft=feat(say(WORDS.cat,{seed:3,gain:.02}),24000);
  ok(soft.heard,"a quiet word (peak 0.02) is still heard");
  ok(cat.frames.length&&cat.frames[0].length===M.DIM&&M.DIM===26,`frames are 13 coefficients and their deltas (${M.DIM})`);

  // ---- 2. picking the word ----
  const keys=Object.keys(WORDS),refs={};keys.forEach(k=>{refs[k]=[feat(say(WORDS[k],{seed:7}),24000).frames];});
  let n=0,right=0,sure=0,sureWrong=0;const misses=[],t0=Date.now();
  for(const k of keys)for(const speed of [.8,1,1.25])for(const f0 of [200,300])for(const snr of [25,15]){
    const x=say(WORDS[k],{speed,f0,snr,seed:100+n,rate:48000}),m=M.match(feat(x,48000).frames,refs);n++;
    if(m.best===k)right++;else misses.push(`${k}@${speed},${f0}Hz,${snr}dB→${m.best}`);if(m.sure){sure++;if(m.best!==k)sureWrong++;}}
  const ms=(Date.now()-t0)/n;
  ok(right>=n-2,`the matcher picks the word said faster, slower, higher, lower, at 48 kHz, with noise: ${right} of ${n}`+(misses.length?" ("+misses.join(", ")+")":""));
  ok(sure>=n*.7&&sureWrong===0,`and it is sure of ${sure} of ${n}, never sure of a wrong one (${sureWrong})`);
  ok(ms<200,`one clip against four words takes ${ms.toFixed(0)} ms here`);
  const two=M.match(feat(say(WORDS.cat,{seed:9,snr:20}),24000).frames,{cat:refs.cat,cot:refs.cot});
  ok(two.best==="cat",`cat and cot, only the vowel apart: ${J(two.scores)}`);
  const sc=M.match(cat.frames,refs);
  ok(Math.abs(Object.keys(sc.scores).reduce((a,k)=>a+sc.scores[k],0)-1)<.01&&sc.scores.cat===sc.score,"the scores are a softmax: they add up to 1");
  const none=M.match([],refs);
  ok(none.best===null&&!none.sure&&none.score===0,"no speech: no best and not sure");
  const noisy=M.match(feat(say(WORDS.sun,{seed:4,snr:-3}),24000).frames,refs);
  ok(!noisy.sure||noisy.best==="sun",`drowned in noise (-3 dB) it is not sure of a wrong word (${noisy.best}, sure ${noisy.sure})`);
  const own=M.match(feat(say(WORDS.cot,{seed:12,speed:1.1,f0:290}),24000).frames,{cat:refs.cat,cot:refs.cot.concat([feat(say(WORDS.cot,{seed:13,f0:290}),24000).frames])});
  ok(own.best==="cot"&&own.sure,"a second reference in his own voice helps: cot, sure "+J(own.scores));

  // ---- 3. the DTW ----
  const A=cat.frames;
  ok(M.dtw(A,A)===0,"DTW of a clip with itself is 0");
  ok(M.dtw(A,A.slice(0,Math.floor(A.length/4)))===Infinity,"one three times as long as the other: not the same word (Infinity)");
  const d1=M.dtw(A,refs.cat[0]),d2=M.dtw(A,refs.bee[0]);
  ok(d1<d2&&isFinite(d1),`closer to its own word than to another (${d1.toFixed(2)} < ${d2.toFixed(2)})`);
  ok(Math.abs(M.dtw(A,refs.sun[0])-M.dtw(refs.sun[0],A))<1e-9,"DTW is symmetric");

  // ---- 4. a page read aloud, word by word ----
  const gap=n=>new Float32Array(Math.round(n*24000)),cat2=say(WORDS.cat,{seed:21,lead:.05,tail:.05}),sun2=say(WORDS.sun,{seed:22,lead:.05,tail:.05}),bee2=say(WORDS.bee,{seed:23,lead:.05,tail:.05});
  const page=[gap(.4),cat2,gap(.35),sun2,gap(.4),bee2,gap(.5)].reduce((a,b)=>{const o=new Float32Array(a.length+b.length);o.set(a);o.set(b,a.length);return o;});
  const segs=M.segments(F32(page),24000);
  ok(segs.length===3,`a page of three words with pauses splits into three stretches (${segs.length}: ${segs.map(s=>s.ms+" ms").join(", ")})`);
  if(segs.length===3){const m3=segs.map(s=>M.match(s.frames,refs).best);ok(J(m3)===J(["cat","sun","bee"]),"and each stretch is its word: "+J(m3));}
  const run=[cat2,sun2].reduce((a,b)=>{const o=new Float32Array(a.length+b.length);o.set(a);o.set(b,a.length);return o;});
  ok(M.segments(F32(run),24000).length<=2,"words run together are not split in the middle of one");
  ok(!M.segments(F32(quiet),48000).length,"a silent page has no stretches");

  // ---- 5. templates: small plain objects ----
  const pk=M.pack(cat.frames,{w:"cat",src:"A",at:5}),un=M.unpack(pk);
  ok(pk.v===1&&pk.d===26&&pk.n===cat.frames.length&&Array.isArray(pk.q)&&pk.q.every(v=>Number.isInteger(v))&&pk.w==="cat"&&pk.src==="A","a template is a plain object of whole numbers, with its word and kind");
  ok(un&&un.length===cat.frames.length&&Math.abs(un[3][5]-cat.frames[3][5])<=.006,"and unpacks to the same frames (to 1/100)");
  ok(JSON.stringify(pk).length<cat.frames.length*26*6,`about ${Math.round(JSON.stringify(pk).length/100)/10} KB a word: the saves stay small`);
  ok(M.unpack(null)===null&&M.unpack({v:2})===null&&M.unpack({v:1,d:26,n:3,q:[1,2]})===null,"a broken template is left out");

  // ---- 6. banking, at most five a word ----
  w.eval("state.settings.talk=true;");
  const Talk=w.eval("Talk"),fr=w.eval("x=>x");
  const res=[];for(let i=0;i<7;i++)res.push(await Talk.bank("cat",cat.frames,"A"));
  const keysNow=async()=>(await w.eval("DB.keys('blobs')")).filter(k=>/^tpl:/.test(k)).sort();
  let ks=await keysNow();
  ok(res.every(Boolean)&&J(ks)===J(["tpl:cat:0","tpl:cat:1","tpl:cat:2","tpl:cat:3","tpl:cat:4"]),"seven banked for cat: five kept, under tpl:cat:0 to 4 "+J(ks));
  ok(w.eval("state.talk.tpl")===7,"state.talk.tpl counts every one banked: "+w.eval("state.talk.tpl"));
  ok(!(await Talk.bank("cat",cat.frames,"page")),"five from the NAS: a page's stretch doesn't push one out");
  ok(!(await Talk.bank("cat",cat.frames.slice(0,3),"A"))&&!(await Talk.bank("",cat.frames,"A")),"too short a clip, or no word, is not banked");
  for(let i=0;i<3;i++)await Talk.bank("sun",refs.sun[0],"page");
  await Talk.bank("sun",refs.sun[0],"tap");await Talk.bank("sun",refs.sun[0],"tap");await Talk.bank("sun",refs.sun[0],"tap");
  const sun=(await Talk._own("sun")).map(x=>x.src).sort();
  ok(J(sun)===J(["page","page","tap","tap","tap"]),"a tapped answer pushes out the oldest page stretch first "+J(sun));
  w.eval("Talk._reset()");
  const back=await Talk._own("cat");
  ok(back.length===5&&back[0].frames.length===cat.frames.length,"read back from the store after a restart: five, the same length");
  const R=await Talk._refs(["cat","sun"]);
  ok(R&&R.cat.length===5&&R.sun.length===5,"references for the matcher: his own templates (the game voice's clips need fetch, offline here)");
  ok((await Talk._refs(["cat","bee"]))===null,"an answer with no reference at all: tier B can't choose (null)");

  // ---- 7. the transcript scoring (tier C), the same as the listener's ----
  const S=(t,e)=>M.scoreText(t,e);
  ok(S("Cat.",["cat","cot","cap"]).cat===1&&S("Cat.",["cat","cot","cap"]).cot<.8,"scoreText: an exact word is 1 "+J(S("Cat.",["cat","cot","cap"])));
  ok(S("kat",["cat","cot"]).cat===1,"scoreText: c and k sound alike");
  ok(S("three",["2","3","4"])["3"]===1&&S("to",["1","2","3"])["2"]===1&&S("to the shop",["top","shop"]).shop>.9,"scoreText: number words are digits, 'to' is two only among numbers");
  ok(S("yeah",["yes","no"]).yes===1&&S("nope",["yes","no"]).no===1,"scoreText: yeah is yes, nope is no");
  const su=M.sureOf({cat:.95,cot:.6},.8,.2),un2=M.sureOf({cat:.85,cot:.7},.8,.2);
  ok(su.best==="cat"&&su.sure&&un2.best==="cat"&&!un2.sure,"sureOf: sure when close enough and far enough ahead");

  console.log(`talk_matcher: ${passes} passed, ${fails} failed`);process.exit(fails?1:0);
},900);
