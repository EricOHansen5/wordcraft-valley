/* ================================================================
   v4.3 — the valley comes alive
   · Power-ups: levelled-up animals and vehicles do bigger versions.
   · Friendships: some animals react to each other.
   · Day and night: sleepers doze after dark, night creatures wake up.
   · Word bubbles: a tapped thing sometimes shows its action word
     ("hop", "dig", "snap"). Tap the bubble to sound it out.
   · Evolution: when the buddy grows, a full-screen scene plays, and
     he reads a word to help it evolve.
   ================================================================ */
const isNight=()=>{try{return phase().id==="night";}catch(e){return false;}};
const SLEEPERS=new Set(["hen","duck","rabbit","penguin","sloth","parrot","monkey","pig","seal","crab","lizard","dog","elephant","sauropod"]);
const NIGHT_OWLS=new Set(["bat","wolf","fox","raccoon","cat","octopus","scorpion","snake","hawk","dragon"]);

function sleepyMove(cr){
  cAnim(cr,"c-nap",2200);Sound.sfx.purr();vShout(cr,"zzz...");
  const p=cAt(cr);fx(p.x+10,p.head,"💤",{n:3,ux:12,uy:-25,dx:26,dy:-55,jit:6,stagger:.5,d:1.4,size:18});
}
function nightBonus(cr){
  const p=cAt(cr);ring(p.x,p.mid,{n:2,size:160,color:"rgba(170,150,255,.9)",gap:.25});
  fx(p.x,p.head-4,"🌙",{uy:-30,dy:-50,jit:0,d:1.6,size:26});fx(p.x,p.mid,"✨",{n:5,uy:-40,dy:-70,jit:90,size:14});
  gift("night:"+cr.id,1,p.x,p.feet,"A moonlight gem!");
}
// ★ and ★★ things do a bigger version of their move
function powerUp(o,lv,kind){
  if(lv<2)return;
  const isC=kind==="critter",a=isC?cAt(o):null,va=isC?null:vehAnchor(o);
  const x=isC?a.x:va.x,y=isC?a.mid:va.top-4;
  setTimeout(()=>{
    ring(x,y,{n:lv===3?3:1,size:lv===3?220:150,color:lv===3?"rgba(255,214,110,.95)":"rgba(255,240,170,.9)",gap:.15});
    fx(x,y,"⭐",{n:lv*2,uy:-50,dy:-80,jit:120,size:16,stagger:.05});
  },350);
  if(isC&&o.id==="dragon"){ // a levelled-up dragon lights every lantern
    Object.keys(state.grid).filter(k=>state.grid[k].id==="lantern").forEach((k,i)=>setTimeout(()=>{
      const el=document.querySelector(`.tile[data-k="${k}"]`);if(el){el.classList.add("lit");const g=geom(...k.split(",").map(Number));
        fx(g.x,g.y*100-6,"🔥",{uy:-20,dy:-30,jit:0,d:.9,size:20});}},900+i*200));
  }
}

/* ---- friendships: [partner, how they react, what they shout] ---- */
const FRIENDS={
  hen:[["fox","chase","SNIFF SNIFF!"]],fox:[["hen","flee","BAWK!"],["rabbit","flee","EEK!"]],
  cat:[["dog","chase","WOOF WOOF!"]],dog:[["cat","flee","HISSS!"]],
  frog:[["duck","chase","QUACK?"]],duck:[["frog","flee","RIBBIT!"]],
  monkey:[["gorilla","answer","BOOM BOOM!"]],gorilla:[["monkey","cheer","OOK OOK!"]],
  penguin:[["seal","cheer","ARF ARF!"]],seal:[["penguin","answer","WHEEE!"]],
  dolphin:[["whale","answer","WHOOSH!"]],whale:[["dolphin","cheer","EEK EEK!"]],
  lion:[["tiger","answer","ROAR!"]],tiger:[["lion","answer","ROAR!"]],
  trex:[["sauropod","flee","RUN!"]],sauropod:[["trex","answer","ROAR!"]],
  shark:[["fish","flee","SWIM!"]],fish:[["shark","chase","CHOMP?"]],
  croc:[["duck","flee","QUACK!"]],raccoon:[["dog","chase","WOOF!"]],
  bear:[["bug","flee","BZZZ!"]],elephant:[["monkey","cheer","OOK!"]],rabbit:[["fox","chase","YIP!"]],
  crab:[["lobster","answer","SNIP!"]],lobster:[["crab","answer","SNAP!"]],
  eagle:[["fish","flee","SPLASH!"]],hawk:[["rabbit","flee","EEK!"]]
};
function friendReact(cr){
  const opts=FRIENDS[cr.id];if(!opts)return;
  for(const [pid,how,say] of opts){
    const f=others(cr,o=>o.id===pid&&!o._busy&&within(o,cr,6)).sort((a,b)=>Math.abs(a.c-cr.c)-Math.abs(b.c-cr.c))[0];
    if(!f)continue;
    f._busy=1;setTimeout(()=>f._busy=0,1600);
    const q=cAt(f),m=CRIT(f.id);
    fx(q.x,q.head,how==="flee"?"❗":how==="cheer"?"💞":"❕",{uy:-20,dy:-36,jit:0,d:1,size:22});
    vShout(f,say);
    if(how==="chase")moveCritter(f,Math.sign(cr.c-f.c)*Math.min(3,Math.max(0,Math.abs(cr.c-f.c)-1)),Math.sign(cr.r-f.r),true);
    else if(how==="flee")moveCritter(f,(Math.sign(f.c-cr.c)||1)*3,0,true);
    else if(how==="answer"){act(f,"roar");if(m)Sound.sfx.cry(m.cry);}
    else{act(f,"pounce");if(m)setTimeout(()=>Sound.sfx.cry(m.cry),150);}
    return f;
  }
}

/* ---- word bubbles ---- */
const BUB={dog:"dig",fox:"hop",cat:"nap",hen:"peck",pig:"mud",duck:"dip",frog:"hop",fish:"swim",bug:"flip",bat:"flap",
  croc:"snap",shark:"chomp",wolf:"run",bear:"hug",boar:"bash",tiger:"jump",hawk:"dash",lion:"big",trex:"stomp",dragon:"hot",
  rabbit:"hop",raccoon:"dig",penguin:"slip",mammoth:"big",crab:"snap",lobster:"snip",seal:"clap",octopus:"ink",dolphin:"flip",
  whale:"splash",monkey:"grab",sloth:"nap",snake:"hiss",elephant:"splash",gorilla:"drum",lizard:"red",scorpion:"jab",rhino:"bash",
  eagle:"grab",sauropod:"munch",
  v_car:"zip",v_taxi:"cab",v_van:"van",v_bus:"bus",v_pickup:"bump",v_bike:"bell",v_scooter:"zip",v_skateboard:"flip",
  v_tractor:"chug",v_firetruck:"hot",v_police:"stop",v_ambulance:"help",v_truck:"dump",v_canoe:"dip",v_sailboat:"bob",
  v_speedboat:"fast",v_suv:"mud",v_motorbike:"zip",v_train:"chug",v_lorry:"honk",v_helicopter:"chop",v_ship:"ship",
  v_racecar:"fast",v_sled:"sled",v_plane:"jet",v_rocket:"blast",v_ufo:"zap",v_digger:"dig",v_tram:"bell",v_dumptruck:"dump",
  v_bulldozer:"bash",v_mixer:"mix",v_crane:"lift",v_monstertruck:"crash",v_cablecar:"up",v_submarine:"sub",v_rickshaw:"zip",
  v_monorail:"fast",v_bullet:"fast",v_shuttle:"blast"};
// how hard a word is, on the same ladder as the word tiers
function bubTier(ph){
  if(ph.some(x=>x.includes("_")))return 5;
  if(ph.length>=4)return 4;
  if(ph.some(x=>["sh","ch","th","wh"].includes(x)))return 3;
  return ph.some(x=>/^[ieu]$/.test(x))?2:1;
}
function maybeBubble(o,id){
  if(document.querySelector(".wordbub")||Math.random()>.4)return;
  const w=BUB[id];if(!w)return;
  let ph;try{ph=splitPhonemes(w);}catch(e){ph=w.split("");}
  if(!ph||!ph.length||bubTier(ph)>currentTier())return;
  const isC=!o.u,a=isC?cAt(o):vehAnchor(o);
  const h=parseFloat(o._el?o._el.style.height:40)||40,vh=(document.getElementById("stage")||document.body).clientHeight||800;
  const top=isC?a.head-2:a.top-h/vh*100-1;
  const b=document.createElement("div");b.className="wordbub";
  const vx=Math.max(9,Math.min(91,toView(a.x)));   // keep it on screen near the edges
  b.style.left=(cam+vx*viewW()/100)+"px";b.style.top=Math.max(12,top)+"%";
  // split vowels (i_e) show the vowel in place and a quiet e at the end
  b.innerHTML=ph.map((x,i)=>`<span data-i="${i}">${x.includes("_")?x[0]:x}</span>`).join("")
    +(ph.some(x=>x.includes("_"))?`<span class="sil">e</span>`:"")+`<i class="spk">🔊</i>`;
  tilesEl.appendChild(b);
  const gone=setTimeout(()=>{b.classList.add("bye");setTimeout(()=>b.remove(),300);},7000);
  let busy=false;
  b.addEventListener("click",async e=>{
    e.stopPropagation();if(busy)return;busy=true;clearTimeout(gone);
    const spans=[...b.querySelectorAll("span[data-i]")];
    for(let i=0;i<ph.length;i++){spans[i].classList.add("on");await Sound.say("sound:"+ph[i],ph[i]);
      await new Promise(r=>setTimeout(r,90));spans[i].classList.remove("on");}
    await Sound.say("word:"+w,w,.85);
    b.classList.add("read");Quests.hit("bubble");
    state.treats=state.treats||{};
    if(Date.now()-(state.treats.bubble||0)>45000){state.treats.bubble=Date.now();state.gems+=1;floater("+1 💎","#FFE9A8");renderHUD();Sound.sfx.chime();save();}
    setTimeout(()=>{b.classList.add("bye");setTimeout(()=>b.remove(),300);},900);
  });
  b.addEventListener("pointerdown",e=>e.stopPropagation());
}

/* ---- evolution ---- */
function whenClear(fn){if(document.querySelector(".overlay.on"))setTimeout(()=>whenClear(fn),600);else fn();}
function evolveScene(from,to){
  let ov=document.getElementById("ovEvo");
  if(!ov){ov=document.createElement("div");ov.id="ovEvo";ov.className="evo";
    ov.innerHTML=`<div class="evoText" id="evoText"></div><div class="evoStage"><div class="evoOld" id="evoOld"></div><div class="evoNew" id="evoNew"></div></div>
      <div class="evoAsk" id="evoAsk"><div class="evoPrompt">Read this word to help it evolve!</div><div class="evoWord" id="evoWord"></div>
      <div class="evoBtns"><button class="btn soft" id="evoHear">🔊 Hear it</button><button class="btn primary" id="evoGo">I read it!</button></div></div>
      <button class="btn primary" id="evoDone" style="display:none">Yay!</button>`;
    document.body.appendChild(ov);}
  const nm=STAGES[to].name,old=from===0?"The egg":STAGES[from].name;
  const pool=Object.keys(state.stats||{}).filter(k=>state.stats[k]&&state.stats[k].mastered);
  const word=state.lastWord&&Math.random()<.5?state.lastWord:(pool.length?pool[Math.floor(Math.random()*pool.length)]:(state.lastWord||"cat"));
  document.getElementById("evoOld").innerHTML=ART.buddy(from,mulberry(42),state.hat);
  document.getElementById("evoNew").innerHTML=ART.buddy(to,mulberry(42),state.hat);
  document.getElementById("evoText").textContent=from===0?"What? The egg is hatching!":`What? ${old} is evolving!`;
  document.getElementById("evoWord").textContent=word;
  document.getElementById("evoAsk").style.display="";document.getElementById("evoDone").style.display="none";
  ov.className="evo on";Sound.sfx.chime();
  Sound.speak(from===0?"What? The egg is hatching!":"What? Your buddy is evolving!",.95);
  document.getElementById("evoHear").onclick=()=>Sound.say("word:"+word,word,.85);
  document.getElementById("evoGo").onclick=()=>{
    document.getElementById("evoAsk").style.display="none";ov.classList.add("morph");Sound.sfx.evo();
    setTimeout(()=>{ov.classList.remove("morph");ov.classList.add("done","flash");confetti();Sound.sfx.win();
      document.getElementById("evoText").textContent=`${old} became ${nm}!`;
      Sound.speak(`Congratulations! ${old} became ${nm}!`,.9);
      document.getElementById("evoDone").style.display="";setTimeout(()=>ov.classList.remove("flash"),700);},3300);
  };
  document.getElementById("evoDone").onclick=()=>{ov.className="evo";renderHUD();
    try{const el=document.getElementById("buddyBtn");el.classList.add("pulse");setTimeout(()=>el.classList.remove("pulse"),1000);}catch(e){}
    try{renderBuddy&&renderBuddy();}catch(e){}};
}
