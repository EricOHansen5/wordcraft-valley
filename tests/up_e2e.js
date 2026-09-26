const fs=require("fs"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=fs.readFileSync(require("path").join(__dirname,"../app/index.html"),"utf8");
const errors=[];
const crowded={tour:99,wordsRead:60,gems:500,rows:7,biome:3,vehStarter:true,seasonSeen:"autumn",
  blueprints:["lantern","garage","well","campfire","market","barn","pumpkinpatch"],
  grid:{"3,8":{id:"well",seed:1},"9,8":{id:"well",seed:2},"14,8":{id:"pumpkinpatch",seed:3},"18,7":{id:"campfire",seed:4},"6,7":{id:"market",seed:5},"12,6":{id:"barn",seed:6}},
  inventory:{well:{n:1},lantern:{n:2}},
  critters:["fox","fox","fox","fox","fox","pig","pig","pig","hen","cat","dog","duck","frog","wolf","bear","tiger","lion","trex","bat","hawk"].map((id,i)=>({id,seed:i,c:i%22,r:8-(i%3)})),
  vehicles:["v_car","v_car","v_car","v_bus","v_taxi","v_van","v_bike","v_police","v_firetruck","v_train","v_plane"].map((id,i)=>({u:"u"+i,id,c:(i*2)%22,r:8-(i%2),face:"l",alt:.2}))};
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},connect(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){}});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createPeriodicWave:()=>({}),
    createBuffer:(ch,len)=>({getChannelData:()=>new Float32Array(len)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};
  w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.URL.createObjectURL=()=>"blob:x";w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
  const r=fdb.indexedDB.open("wordcraft-valley",2);
  r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
  r.onsuccess=()=>r.result.transaction("kv","readwrite").objectStore("kv").put(crowded,"state");
}});
const w=dom.window,d=w.document;
Object.defineProperty(d.getElementById("stage"),"clientWidth",{value:1000});
Object.defineProperty(d.getElementById("stage"),"clientHeight",{value:520});
const click=el=>{if(!el)return"MISSING";el.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true}));return"ok";};
const wait=ms=>new Promise(r=>setTimeout(r,ms));const E=x=>w.eval(x);
(async()=>{
  await wait(2800);
  console.log("boot errors:",errors.length?errors.join("\n"):"(none)");
  console.log("\n-- tidy-up of the crowded save --");
  console.log("animals: 20 entries ->",E("state.critters.length"),"kinds | fox",E("state.critters.find(c=>c.id==='fox').lv"),"pig",E("state.critters.find(c=>c.id==='pig').lv"),"| out:",E("state.critters.filter(c=>c.out!==false).length"),"| on screen:",d.querySelectorAll("#tiles .critter").length);
  console.log("vehicles: 11 entries ->",E("state.vehicles.length"),"kinds | car lv",E("state.vehicles.find(v=>v.id==='v_car').lv"),"| out:",E("state.vehicles.filter(v=>v.out!==false).length"),"| on screen:",d.querySelectorAll("#tiles .vehicle").length);
  console.log("wells: 2 placed + 1 in bag ->",E("Object.values(state.grid).filter(t=>t.id==='well').length"),"placed at lv",E("Object.values(state.grid).find(t=>t.id==='well').lv"),"| bag well:",E("!!state.inventory.well"),"| lanterns in bag:",E("JSON.stringify(state.inventory.lantern)"));
  console.log("pumpkin patch survived reload:",E("Object.values(state.grid).some(t=>t.id==='pumpkinpatch')"));
  console.log("toast:",d.getElementById("toast").textContent.slice(0,80));
  console.log("well tile shows level:",!!d.querySelector('#tiles .tile[data-build="well"].lv3 .deco'),"| badge:",(d.querySelector('#tiles .tile[data-build="well"] .lvbadge')||{}).textContent);

  console.log("\n-- a repeat levels up instead of crowding --");
  E("state.selected=null;");
  let r=E("JSON.stringify(addItem('hen'))");console.log("2nd hen:",r,"| hen lv",E("state.critters.find(c=>c.id==='hen').lv"),"| banner:",!!d.querySelector(".lvlup"),"| kinds still",E("state.critters.length"));
  E("addItem('hen')");r=E("JSON.stringify(addItem('hen'))");const g0=E("state.gems");
  console.log("4th hen (already gold):",r);
  const vr=E("(v=>v.id+' lv'+v.lv+' up='+v._up)(addVehicle('v_bus'))");console.log("2nd bus:",vr,"| vehicle kinds",E("state.vehicles.length"));

  console.log("\n-- out limits hold when new ones arrive --");
  ["croc","shark","boar","snail"].forEach(id=>{});E("['croc','shark','boar','fish','bug'].forEach(id=>addItem(id));");
  E("['v_tractor','v_ambulance','v_scooter','v_skateboard'].forEach(id=>addVehicle(id));");
  console.log("animals out:",E("state.critters.filter(c=>c.out!==false).length"),"/ 8 | resting:",E("state.critters.filter(c=>c.out===false).length"),"| on screen:",d.querySelectorAll("#tiles .critter").length);
  console.log("vehicles out:",E("state.vehicles.filter(v=>v.out!==false).length"),"/ 6 | on screen:",d.querySelectorAll("#tiles .vehicle").length);

  console.log("\n-- upgrade a building by reading --");
  E("state.gems=300;");click(d.getElementById("craftBtn"));
  const cards=[...d.querySelectorAll("#craftGrid .card2")];
  console.log("shop cards:",cards.map(c=>c.querySelector(".nm").textContent.trim()+"["+c.querySelector("button").textContent+"]").join(" "));
  const camp=cards.find(c=>/Campfire/.test(c.querySelector(".nm").textContent));
  const gBefore=E("state.gems");click(camp.querySelector("button"));await wait(100);
  console.log("challenge:",d.getElementById("readTitle").textContent,"| rung:",d.getElementById("rung").textContent.trim(),"| gems untouched so far:",E("state.gems")===gBefore);
  const want=E("cur.p");const bank=[...d.querySelectorAll("#letterBank .lt")];
  want.forEach(ph=>click(bank.find(b=>b.dataset.ph===ph&&!b.classList.contains("used"))));
  await wait(1300);
  console.log("built it -> campfire lv",E("Object.values(state.grid).find(t=>t.id==='campfire').lv"),"| gems",gBefore,"->",E("state.gems"),"(read reward in, upgrade cost out)","| reward overlay NOT shown:",!d.getElementById("ovReward").classList.contains("on"));
  console.log("tile:",d.querySelector('#tiles .tile[data-build="campfire"]').className,"| deco:",!!d.querySelector('#tiles .tile[data-build="campfire"] .deco'));
  E("startUpgrade({kind:'building',id:'campfire'});");await wait(100);
  console.log("gold challenge:",d.getElementById("readTitle").textContent);
  const words=E("cur.words");words.forEach(wd=>click([...d.querySelectorAll("#letterBank .lt.word")].find(t=>t.textContent===wd&&!t.classList.contains("used"))));
  await wait(1500);console.log("story in order -> campfire lv",E("Object.values(state.grid).find(t=>t.id==='campfire').lv"),"| star on top:",d.querySelector('#tiles .tile[data-build="campfire"] .deco').innerHTML.includes("#FFC53D"));

  console.log("\n-- 'Later' cancels without charging --");
  E("startUpgrade({kind:'building',id:'market'});");const gm=E("state.gems");
  click(d.querySelector("#ovRead [data-close]"));console.log("pending cleared:",E("pendingUpgrade===null"),"| gems unchanged:",E("state.gems")===gm);
  E("openWord(WORDS.find(x=>x.w==='cat'),{rung:0});");click([...d.querySelectorAll("#picks .pick")].find(p=>p.dataset.w==="cat")||d.querySelector("#picks .btn"));
  await wait(900);console.log("next normal crate gives a reward:",d.getElementById("ovReward").classList.contains("on"),"| market still lv",E("Object.values(state.grid).find(t=>t.id==='market').lv||1"));
  click(d.querySelector("#ovReward [data-close]"));

  console.log("\n-- level effects --");
  const wk=E("Object.keys(state.grid).find(k=>state.grid[k].id==='well')");const gw=E("state.gems");
  E(`state.timers={};useBuilding('${wk}','well')`);console.log("gold well paid:",E("state.gems")-gw,"(base 6)");
  E(`state.timers['well:${wk}']=Date.now()-50000;`);const gw2=E("state.gems");E(`useBuilding('${wk}','well')`);
  console.log("gold well ready again after 50s (base 120s):",E("state.gems")>gw2);
  const mk=E("Object.keys(state.grid).find(k=>state.grid[k].id==='market')");E(`state.grid['${mk}'].lv=3;`);const gmk=E("state.gems");E(`useBuilding('${mk}','market')`);
  console.log("gold market price:",gmk-E("state.gems"),"(base 15)");

  console.log("\n-- sticker book --");
  click(d.getElementById("albumBtn"));click(d.querySelector('[data-atab="animals"]'));
  console.log(d.getElementById("albumSub").textContent);
  const resting=[...d.querySelectorAll("#albumGrid .card2")].find(c=>/Resting/.test(c.textContent));
  const rn=resting.querySelector(".nm").textContent;click(resting);
  console.log("tapped resting",rn,"->",E(`state.critters.find(c=>NAMES[c.id]==='${rn}').out`),"| out count still",E("state.critters.filter(c=>c.out!==false).length"));
  console.log("level-up buttons:",d.querySelectorAll("#albumGrid .card2 button").length);
  click(d.querySelector('[data-atab="garage"]'));console.log(d.getElementById("albumSub").textContent);
  click(d.querySelector("#ovAlbum [data-close]"));

  console.log("\n-- scenery thinned, kept off buildings --");
  console.log("scenery props:",d.querySelectorAll('#tiles .tile:not([data-build]):not(.critter):not(.vehicle)').length);
  E("checkBadges();");await wait(100);
  console.log("badges:",E("state.badges.filter(b=>['levelup','gold','golden'].includes(b)).join(',')"));
  await E("takePostcard()");await wait(100);console.log("postcard drawings:",d.querySelectorAll("#photoWrap svg svg").length);
  console.log("\nerrors:",errors.length?errors.join("\n"):"(none)");
  process.exit(0);
})();
