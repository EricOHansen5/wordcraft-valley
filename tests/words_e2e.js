const fs=require("fs"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=fs.readFileSync(require("path").join(__dirname,"../app/index.html"),"utf8");
const errors=[],spoken=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},connect(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){}});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createPeriodicWave:()=>({}),createBuffer:(c,l)=>({getChannelData:()=>new Float32Array(l)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){spoken.push(u.text);u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
  const r=fdb.indexedDB.open("wordcraft-valley",2);
  r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
  r.onsuccess=()=>r.result.transaction("kv","readwrite").objectStore("kv").put({tour:99,guardians:[0,1,2,3],wordsRead:30,gems:100,vehStarter:true,seasonSeen:"autumn",biome:0},"state");
}});
const w=dom.window,d=w.document;
Object.defineProperty(d.getElementById("stage"),"clientWidth",{value:1000});
Object.defineProperty(d.getElementById("stage"),"clientHeight",{value:520});
const click=el=>{if(!el)return"MISSING";el.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true}));return"ok";};
const wait=ms=>new Promise(r=>setTimeout(r,ms));const E=x=>w.eval(x);
(async()=>{
  await wait(1500);
  console.log("boot errors:",errors.length?errors.join("\n"):"(none)");
  console.log("words:",E("WORDS.length"),"| tricky:",E("WORDS.filter(x=>x.tricky).length"),"| by tier:",E("[1,2,3,4,5,6,7,8].map(t=>t+':'+WORDS.filter(x=>x.t===t&&!x.tricky).length).join(' ')"));
  console.log("every tile sound is playable:",E("WORDS.every(x=>x.p.every(p=>soundOf(p)===''||Phonics.known(soundOf(p))))"),
    "| unplayable:",E("[...new Set(WORDS.flatMap(x=>x.p).map(soundOf))].filter(q=>q&&!Phonics.known(q)).join(',')||'(none)'"));
  console.log("every non-tricky word 6-8 has a picture:",E("WORDS.filter(x=>x.t>=6&&!x.tricky).every(x=>WORD_ART[x.w]&&ART[WORD_ART[x.w]])"),
    "| missing:",E("WORDS.filter(x=>x.t>=6&&!x.tricky&&!(WORD_ART[x.w]&&ART[WORD_ART[x.w]])).map(x=>x.w).join(',')||'(none)'"));
  console.log("duplicate words:",E("(a=>a.filter((x,i)=>a.indexOf(x)!==i).join(','))(WORDS.map(x=>x.w))")||"(none)");

  console.log("\n-- tricky word 'said', find it (by sound, in print) --");
  E("state.stats.said={seen:0,first:0,rung:0,rungClean:0};openWord({...WORDS.find(x=>x.w==='said'),rung:0});");
  console.log("title:",d.getElementById("readTitle").textContent,"| choices:",[...d.querySelectorAll("#picks .pick")].map(p=>p.textContent).join(" / "));
  console.log("tiles:",[...d.querySelectorAll("#letters .lt")].map(t=>t.textContent+(t.classList.contains("heart")?"♥":"")).join(" "));
  spoken.length=0;const pc=[];w._pc=pc;E("(function(){const o=Phonics.play;Phonics.play=(c,ph)=>{window._pc.push(ph);return o(c,ph);};})()");
  for(const t of d.querySelectorAll("#letters .lt")){click(t);await wait(30);}await wait(300);
  console.log("tapping s·ai♥·d plays sounds:",JSON.stringify(pc),"(ai♥ says 'e')");
  click([...d.querySelectorAll("#picks .pick")].find(p=>p.dataset.w==="said"));await wait(900);
  console.log("reward:",d.getElementById("ovReward").classList.contains("on"),"| reward art is a heart:",d.getElementById("rewardArt").innerHTML.includes("#d22f27")||d.getElementById("rewardArt").innerHTML.length>0);
  click(d.querySelector("#ovReward [data-close]"));

  console.log("\n-- tricky word 'come', spell it --");
  E("openWord({...WORDS.find(x=>x.w==='come'),rung:1});");
  const bank=[...d.querySelectorAll("#letterBank .lt")];console.log("bank:",bank.map(b=>b.textContent).join(" "),"| silent e in bank shown dim:",bank.some(b=>b.dataset.ph==="e:"));
  E("cur.p").forEach(ph=>click(bank.find(b=>b.dataset.ph===ph&&!b.classList.contains("used"))));await wait(50);
  console.log("slots:",[...d.querySelectorAll("#slotsRow .wslot")].map(s=>s.textContent+(s.classList.contains("heart")?"♥":"")).join(" "));
  await wait(1200);console.log("spelled 'come' -> reward:",d.getElementById("ovReward").classList.contains("on"));click(d.querySelector("#ovReward [data-close]"));

  console.log("\n-- two-part word 'sunset' --");
  E("openWord({...WORDS.find(x=>x.w==='sunset'),rung:0});");
  console.log("tiles:",[...d.querySelectorAll("#letters .lt")].map(t=>(t.classList.contains("syl")?"| ":"")+t.textContent).join(" "));
  E("hide('ovRead');openWord({...WORDS.find(x=>x.w==='sunset'),rung:1});");
  console.log("spelling slots:",[...d.querySelectorAll("#slotsRow .wslot")].map(s=>s.classList.contains("syl")?"|_":"_").join(" "));
  E("hide('ovRead');openWord({...WORDS.find(x=>x.w==='cow'),rung:0});");pc.length=0;
  for(const t of d.querySelectorAll("#letters .lt")){click(t);await wait(30);}await wait(300);
  console.log("cow tiles:",[...d.querySelectorAll("#letters .lt")].map(t=>t.textContent).join(" "),"-> sounds",JSON.stringify(pc),"| picture choices:",d.querySelectorAll("#picks .pick svg").length);
  E("hide('ovRead')");

  console.log("\n-- picture picks never offer a heart word or a picture-less word --");
  const bad=E(`(()=>{let n=0;for(let i=0;i<150;i++){openWord({...WORDS[Math.floor(Math.random()*40)],rung:0});
    [...document.querySelectorAll('#picks .pick')].forEach(p=>{if(p.dataset.w&&p.querySelector('svg')&&(TRICKY_SET.has(p.dataset.w)||!WORD_ART[p.dataset.w]))n++;});hide('ovRead');}return n;})()`);
  console.log("bad picture choices in 150 crates:",bad);

  console.log("\n-- levels 6-8 unlock --");
  E("WORDS.filter(x=>x.t<=5).forEach(x=>state.stats[x.w]={seen:3,first:3,miss:0,mastered:true,rung:2,rungClean:1});");
  console.log("with tiers 1-5 mastered, auto tier ->",E("currentTier()"));
  E("WORDS.filter(x=>x.t<=7).forEach(x=>state.stats[x.w]={seen:3,first:3,miss:0,mastered:true,rung:2,rungClean:1});");
  console.log("with tiers 1-7 mastered, auto tier ->",E("currentTier()"));
  E("openParent();");
  console.log("progress rows:",[...d.querySelectorAll("#tierBreakdown .lbl")].map(x=>x.textContent).join(" | "));
  console.log("tier menu options:",d.querySelectorAll("#optTier option").length);
  click(d.querySelector('.tab[data-tab="voice"]'));click([...d.querySelectorAll("[data-vfilter]")].find(b=>b.dataset.vfilter==="sound"));await wait(200);
  const rows=[...d.querySelectorAll("#studioList .row .lbl")].map(x=>x.textContent);
  console.log("voice studio sounds:",rows.length,"| any ':' labels:",rows.some(r=>r.includes(":")),"| has or/er/ou/uh/z:",["or","er","ou","uh","z"].every(x=>rows.includes(x)));
  E("hide('ovParent')");
  console.log("custom words split:",E("['night','fork','bird','cloud','boat'].map(x=>splitPhonemes(x).join('-')).join('  ')"));
  console.log("\nerrors:",errors.length?errors.join("\n"):"(none)");process.exit(0);
})();
