const fs=require("fs"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=require("./page").html();
const errors=[],spoken=[];let phonicsCalls=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){},context:null});
  w.AudioContext=function(){const c={currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createDynamicsCompressor:()=>Object.assign(node(),{threshold:P(),ratio:P()}),
    createPeriodicWave:()=>({}),createBuffer:(ch,len)=>({getChannelData:()=>new Float32Array(len)})};return c;};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){spoken.push(u.text);u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};
  w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.URL.createObjectURL=()=>"blob:x";
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
}});
const w=dom.window,d=w.document;
Object.defineProperty(d.getElementById("stage"),"clientWidth",{value:1000});
Object.defineProperty(d.getElementById("stage"),"clientHeight",{value:520});
const click=el=>{if(!el)return"MISSING";el.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true}));return"ok";};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(800);
  console.log("boot errors:",errors.length?errors.join("\n"):"(none)");
  w.eval("state.tour=99;state.gems=300;paintBackdrop();renderWorld();");
  w._pc=phonicsCalls;w.eval("(function(){const o=Phonics.play;Phonics.play=(c,ph)=>{window._pc.push(ph);return o(c,ph);};})()");
  // crate -> find it -> reward
  click(d.getElementById("crateBtn"));const crate=[...d.querySelectorAll("#crateRow .crate")].find(c=>!c.classList.contains("swap"));
  click(crate);await wait(50);
  const tgt=w.eval("cur.w");
  spoken.length=0;phonicsCalls.length=0;
  for(const t of d.querySelectorAll("#letters .lt")){click(t);await wait(40);}
  await wait(900);
  console.log("find-it word:",tgt,"| tiles played via synth:",JSON.stringify(phonicsCalls),"| letter speech:",spoken.filter(x=>x.length<=3&&x!==tgt).length);
  const pick=[...d.querySelectorAll("#picks .pick")].find(p=>p.dataset.w===tgt);
  if(pick){click(pick);}else{click(d.querySelector("#picks .btn"));}
  await wait(900);console.log("reward shown:",d.getElementById("ovReward").classList.contains("on"));
  click(d.querySelector("#ovReward [data-close]"));
  // build rung with whale (split digraph)
  w.eval("state.stats.whale={seen:2,first:2,miss:0,mastered:false,rung:1,rungClean:0};openWord(WORDS.find(x=>x.w==='whale'));");
  const bank=[...d.querySelectorAll("#letterBank .lt")];
  console.log("whale build tiles:",bank.map(b=>b.textContent).join(" "));
  const by=ph=>bank.find(b=>b.dataset.ph===ph&&!b.classList.contains("used"));
  const wr=w.eval("state.wordsRead");click(by("wh"));click(by("a_e"));click(by("l"));await wait(1100);
  console.log("whale built -> wordsRead",wr,"->",w.eval("state.wordsRead"));
  click(d.querySelector("#ovReward [data-close]"));
  // voice studio preview of a sound uses the synth
  w.eval("openParent();");click(d.querySelector('.tab[data-tab="voice"]'));
  click([...d.querySelectorAll("[data-vfilter]")].find(b=>b.dataset.vfilter==="sound"));await wait(200);
  const rows=[...d.querySelectorAll("#studioList .row")];
  console.log("studio sound rows:",rows.length,"| has a_e:",rows.some(r=>r.querySelector(".lbl").textContent==="a_e"),"| count line:",d.getElementById("studioCount").textContent.slice(0,90));
  phonicsCalls.length=0;spoken.length=0;
  const sRow=rows.find(r=>r.querySelector(".lbl").textContent==="s");click(sRow.querySelectorAll(".iconbtn")[0]);await wait(700);
  console.log("studio ▶ on 's' -> synth:",JSON.stringify(phonicsCalls),"| speech:",JSON.stringify(spoken));
  click(d.querySelector("#ovParent [data-close]"));
  // swap + scramble + postcard still fine
  w.eval("state.settings.tierOverride=3;openSwap(swapPairs()[0]);");
  console.log("swap opens:",d.getElementById("readTitle").textContent);
  w.eval("hide('ovRead');openScramble(SIGNS[0]);");
  console.log("scramble opens:",d.getElementById("readTitle").textContent);
  w.eval("hide('ovRead');");
  await w.eval("takePostcard()");await wait(100);
  console.log("postcard svg:",!!d.querySelector("#photoWrap svg"));
  console.log("\nerrors:",errors.length?errors.join("\n"):"(none)");
  process.exit(0);
})();
