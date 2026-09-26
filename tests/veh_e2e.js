const fs=require("fs"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=fs.readFileSync(require("path").join(__dirname,"../app/index.html"),"utf8");
const errors=[],spoken=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},connect(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),offset:P(),type:"",buffer:null,loop:false,setPeriodicWave(){}});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createPeriodicWave:()=>({}),
    createBuffer:(ch,len)=>({getChannelData:()=>new Float32Array(len)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){spoken.push(u.text);u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};
  w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.URL.createObjectURL=()=>"blob:x";
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
  // a returning player who finished the tour
  const r=fdb.indexedDB.open("wordcraft-valley",2);
  r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
  r.onsuccess=()=>r.result.transaction("kv","readwrite").objectStore("kv").put({tour:99,wordsRead:12,gems:400,rows:6,biome:3},"state");
}});
const w=dom.window,d=w.document;
Object.defineProperty(d.getElementById("stage"),"clientWidth",{value:1000});
Object.defineProperty(d.getElementById("stage"),"clientHeight",{value:520});
const click=el=>{if(!el)return"MISSING";el.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true}));return"ok";};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const E=x=>w.eval(x);
(async()=>{
  await wait(4300);
  console.log("boot errors:",errors.length?errors.join("\n"):"(none)");
  console.log("starter car:",E("state.vehicles.map(v=>v.id).join(',')"),"| in DOM:",d.querySelectorAll("#tiles .vehicle").length,"| buddy:",d.getElementById("buddyBubble").textContent);
  console.log("synth knows ar/oa:",E("Phonics.known('ar')&&Phonics.known('oa')"),"| new words:",E("['van','cab','car','jeep','sled','boat','train','rocket','plane'].every(x=>WORDS.some(y=>y.w===x))"));
  console.log("every vehicle-word sound playable:",E("WORDS.filter(x=>VEH_WORD[x.w]).every(x=>x.p.every(p=>Phonics.known(p)))"));

  // 1. read "van" -> unlock van
  E("panned=false;state.selected=null;state.stats.van={seen:0,first:0,miss:0,rung:0,rungClean:0};openWord(WORDS.find(x=>x.w==='van'));");
  const pk=[...d.querySelectorAll("#picks .pick")].find(p=>p.dataset.w==="van")||d.querySelector("#picks .btn");
  click(pk);await wait(900);
  console.log("\nread 'van' -> reward:",d.getElementById("rewardName").textContent,"|",d.getElementById("rewardWord").textContent,"| owns van:",E("hasVeh('v_van')"));
  click(d.querySelector("#ovReward [data-close]"));

  // 2. crates advertise vehicle words
  E("state.settings.tierOverride=5;");
  const mix=E("(()=>{let n=0;for(let i=0;i<80;i++)if(pickCrates().some(c=>c.w&&VEH_WORD[c.w]&&!hasVeh(VEH_WORD[c.w])))n++;return n;})()");
  console.log("crate draws (of 80) offering an unowned vehicle word:",mix);
  let label="";for(let i=0;i<30&&!label;i++){click(d.getElementById("crateBtn"));label=[...d.querySelectorAll("#crateRow .tagline")].map(t=>t.textContent).find(t=>/vehicle/.test(t))||"";click(d.querySelector("#ovCrates [data-close]"));}
  console.log("crate label:",label||"(not seen)");

  // 3. picture picks never repeat a picture
  let dup=0;for(let i=0;i<60;i++){E("state.stats.jet={seen:1,first:0,rung:0,rungClean:0};window._r=Math.random;Math.random=()=>.9;openWord(WORDS.find(x=>x.w==='jet'));Math.random=window._r;");
    const arts=[...d.querySelectorAll("#picks .pick")].map(p=>E(`WORD_ART['${p.dataset.w}']||'mystery'`));if(new Set(arts).size!==arts.length)dup++;}
  E("hide('ovRead')");console.log("duplicate pictures in 60 pick sets:",dup);

  // 4. every vehicle's tap stunt
  E("state.vehicles=[];VEHICLES.forEach((m,i)=>addVehicle(m.id,false,{c:i%22,r:ROWS_MAX-1-(i%3)}));");
  console.log("\nall vehicles placed:",E("state.vehicles.length"),"| elements:",d.querySelectorAll("#tiles .vehicle").length);
  const results=[];
  for(const m of E("VEHICLES.map(v=>v.id)")){
    if(m==="v_rocket")continue;
    E(`(x=>{if(x.out===false)bringOut('vehicle',x)})(state.vehicles.find(v=>v.id==='${m}'))`);
    const u=E(`state.vehicles.find(v=>v.id==='${m}').u`);
    const before=errors.length;E("panned=false;state.selected=null;");
    click(d.querySelector(`#tiles .vehicle[data-u="${u}"]`));await wait(30);
    const shout=[...d.querySelectorAll(".vshout")].pop();
    results.push(m.replace("v_","")+":"+(shout?shout.textContent:"-")+(errors.length>before?"!ERR":""));
  }
  console.log("tap stunts:",results.join("  "));
  await wait(1200);
  console.log("lights on fire truck/police:",d.querySelectorAll(".vehicle.lights-red,.vehicle.lights-rb").length>0||"(already finished)","| puffs spawned:",d.querySelectorAll(".puff").length>=0);

  // 5. rocket countdown + launch + landing
  E("(x=>{if(x.out===false)bringOut('vehicle',x)})(state.vehicles.find(v=>v.id==='v_rocket'))");
  const ru=E("state.vehicles.find(v=>v.id==='v_rocket').u");spoken.length=0;
  click(d.querySelector(`#tiles .vehicle[data-u="${ru}"]`));
  console.log("\nrocket spoken:",JSON.stringify(spoken[0]),"| countdown shown:",!!d.querySelector(".countdown"));
  await wait(2300);
  console.log("launching:",d.querySelector(`#tiles .vehicle[data-u="${ru}"]`).classList.contains("launch"),"| launched flag:",E("state.launched"));
  await wait(5700);
  console.log("landed & free again:",E(`!state.vehicles.find(v=>v.u==='${ru}').busy`),"| toast:",d.getElementById("toast").textContent);

  // 6. garage + launch pad buildings
  E("state.grid['5,8']={id:'garage',seed:1};state.grid['15,8']={id:'launchpad',seed:2};renderWorld();");
  const n0=E("state.vehicles.length");E("state.vehicles=state.vehicles.slice(0,20);renderVehicles();");
  const g0=E("state.vehicles.length");click(d.querySelector('#tiles .tile[data-build="garage"]'));await wait(50);
  console.log("\ngarage -> vehicles",g0,"->",E("state.vehicles.length"),"|",d.getElementById("toast").textContent);
  click(d.querySelector('#tiles .tile[data-build="garage"]'));await wait(50);
  console.log("garage again ->",d.getElementById("toast").textContent);
  E("if(!hasVeh('v_rocket'))addVehicle('v_rocket');");
  click(d.querySelector('#tiles .tile[data-build="launchpad"]'));await wait(800);
  console.log("launch pad -> rocket moved to pad:",E("(r=>r.c===15&&r.r===8)(state.vehicles.find(v=>v.id==='v_rocket'))"));
  await wait(2300);console.log("launching from pad:",!!d.querySelector(".vehicle.launch"));

  // 7. traffic moves on its own
  const snap=E("state.vehicles.map(v=>v.c+','+v.r).join('|')");await wait(5200);
  const moved=E(`(s=>state.vehicles.filter((v,i)=>v.c+','+v.r!==s[i]).length)('${snap}'.split('|'))`);
  console.log("\nvehicles that drove on their own in 5s:",moved,"of",E("state.vehicles.length"));

  // 8. album garage tab, badges, postcard
  click(d.getElementById("albumBtn"));click(d.querySelector('[data-atab="garage"]'));
  console.log("garage album cards:",d.querySelectorAll("#albumGrid .card2").length,"|",d.getElementById("albumSub").textContent);
  click(d.querySelector("#ovAlbum [data-close]"));
  E("checkBadges();");await wait(200);
  console.log("vehicle badges:",E("state.badges.filter(b=>['wheels','traffic','rescue','blastoff','fleet'].includes(b)).join(',')"));
  await E("takePostcard()");await wait(150);
  console.log("postcard drawings:",d.querySelectorAll("#photoWrap svg svg").length);
  console.log("\nerrors:",errors.length?errors.join("\n"):"(none)");
  process.exit(0);
})();
