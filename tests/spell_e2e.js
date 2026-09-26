const fs=require("fs"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=fs.readFileSync(require("path").join(__dirname,"../app/index.html"),"utf8");
const errors=[];
// a player part-way up the ladder: some words new, some at find-it, some at build, some at read-it
const stats={};["cat","hat","bat","map","cap"].forEach(w=>stats[w]={seen:3,first:3,miss:0,rung:0,rungClean:1});
["log","dog","pot","mop"].forEach(w=>stats[w]={seen:4,first:4,miss:0,rung:1,rungClean:1});
["box","fox","pan"].forEach(w=>stats[w]={seen:6,first:6,miss:0,rung:2,rungClean:0});
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},connect(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){}});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createPeriodicWave:()=>({}),createBuffer:(c,l)=>({getChannelData:()=>new Float32Array(l)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
  const r=fdb.indexedDB.open("wordcraft-valley",2);
  r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
  r.onsuccess=()=>r.result.transaction("kv","readwrite").objectStore("kv").put({tour:99,guardians:[0],wordsRead:30,crateCount:30,gems:100,vehStarter:true,seasonSeen:"autumn",stats,
    settings:{pics:true,tts:true,ambient:true,nature:true,speech:false,tierOverride:0,timer:0}},"state");
}});
const w=dom.window,d=w.document;
Object.defineProperty(d.getElementById("stage"),"clientWidth",{value:1000});
Object.defineProperty(d.getElementById("stage"),"clientHeight",{value:520});
const click=el=>{if(!el)return"MISSING";el.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true}));return"ok";};
const wait=ms=>new Promise(r=>setTimeout(r,ms));const E=x=>w.eval(x);
(async()=>{
  await wait(1500);
  console.log("boot errors:",errors.length?errors.join("\n"):"(none)","| old save has no spell setting -> shows:",(E("openParent(),document.getElementById('optSpell').value")),E("hide('ovParent')")||"");
  const share=(label)=>{const r=E(`(()=>{let words=0,spell=0,byRung=[0,0,0],spellByRung=[0,0,0];
      for(let i=0;i<600;i++)pickCrates().forEach(o=>{if(!o.w||!o.p||o.swapPair||o.scramble)return;words++;const b=rungOf(o.w);byRung[b]++;
        if(o.rung===1){spell++;spellByRung[b]++;}});
      return {words,spell,byRung,spellByRung};})()`);
    const pct=(a,b)=>b?Math.round(a/b*100)+"%":"-";
    console.log(`${label.padEnd(26)} spelling crates ${pct(r.spell,r.words).padStart(4)} of word crates  | new/find-it words ${pct(r.spellByRung[0],r.byRung[0])} · build words ${pct(r.spellByRung[1],r.byRung[1])} · read-it words ${pct(r.spellByRung[2],r.byRung[2])}`);};
  E("state.settings.spell=undefined");share("default (Lots)");
  E("state.settings.spell=.35");share("Some");
  E("state.settings.spell=.9");share("Almost all");
  E("state.settings.spell=.6");
  // before the change: only words that had climbed to the build rung
  const before=E(`(()=>{let n=0,s=0;for(let i=0;i<600;i++)pickCrates().forEach(o=>{if(!o.w||!o.p||o.swapPair||o.scramble)return;n++;if(rungOf(o.w)===1)s++;});return Math.round(s/n*100)})()`);
  console.log("for comparison, the old rule on this same save:",before+"%");

  // crate UI
  let tries=0,crate=null;
  while(!crate&&tries++<40){click(d.getElementById("crateBtn"));crate=d.querySelector("#crateRow .crate.spell");if(!crate)click(d.querySelector("#ovCrates [data-close]"));}
  const wordsOnCrates=E("WORDS.map(x=>x.w)");
  console.log("\nspelling crate shows boxes:",crate.querySelectorAll(".sb").length,"| word text hidden:",!wordsOnCrates.includes(crate.querySelector(".w").textContent.trim()),"| tag:",crate.querySelector(".tagline").textContent);
  const g0=E("state.gems");click(crate);await wait(100);
  console.log("opens:",d.getElementById("readTitle").textContent,"|",d.getElementById("rung").textContent.trim(),"| slots:",d.querySelectorAll("#slotsRow .wslot").length);
  const ph=E("cur.p");const bank=[...d.querySelectorAll("#letterBank .lt")];
  ph.forEach(p=>click(bank.find(b=>b.dataset.ph===p&&!b.classList.contains("used"))));await wait(1300);
  console.log("spelled it clean -> gems +",E("state.gems")-g0,"(3 for a clean read + 1 spelling bonus, before any reward)","| reward shown:",d.getElementById("ovReward").classList.contains("on"));
  click(d.querySelector("#ovReward [data-close]"));

  // a read-it word can still be mastered
  let readIt=0;for(let i=0;i<200;i++)if(E("chooseRung(WORDS.find(x=>x.w==='box'))")===2)readIt++;
  console.log("\nread-it word 'box' still opens as Read it:",Math.round(readIt/2)+"% of the time (so it can be mastered)");
  E("openWord({...WORDS.find(x=>x.w==='fox'),rung:2});");click(d.querySelector("#picks .btn"));await wait(900);
  console.log("mastered 'fox' via Read it:",E("state.stats.fox.mastered"));click(d.querySelector("#ovReward [data-close]"));

  // tour still starts with Find it
  E("state.tour=0;");let tourSpell=0;for(let i=0;i<100;i++)if(E("pickCrates().some(o=>o.rung===1&&rungOf(o.w)!==1)"))tourSpell++;
  console.log("spelling crates forced during the first-run tour:",tourSpell);E("state.tour=99;Coach.skip();");

  // cottage bonus crate never gets a swap/story crate
  E("state.grid['4,8']={id:'cottage',seed:1,lv:1};renderWorld();state.settings.tierOverride=4;");
  let crashes=0;for(let i=0;i<25;i++){E("state.timers={};hide('ovRead');");const before=errors.length;E("useBuilding('4,8','cottage')");await wait(700);if(errors.length>before)crashes++;}
  console.log("cottage bonus crates opened 25x, errors:",crashes,"| last one:",d.getElementById("readTitle").textContent);
  // setting persists
  E("openParent();");const sel=d.getElementById("optSpell");sel.value="0.9";sel.dispatchEvent(new w.Event("change"));
  console.log("setting saved as:",E("state.settings.spell"));
  console.log("\nerrors:",errors.length?errors.join("\n"):"(none)");process.exit(0);
})();
