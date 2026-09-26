/* ================================================================
   VALLEY ADVENTURE — Ash walks around his own valley
   The valley stops being a picture he decorates and becomes a place he
   explores: his miner walks through it with the joystick, his pet
   trots behind, and anything he walks up to can be used with one
   button. Two reading adventures live out here:
     WORD WILDS   tall grass hides wild animals. Reading makes friends
                  with them (word → picture, picture → word, a whole
                  sentence, then call it by name). Friends join the
                  valley and fill the Word-Dex.
     TREASURE     a note blows in: "Dig by the log." Only reading the
                  note tells him which landmark hides the next clue.
   ================================================================ */
const Adv=(()=>{
  const A=()=>state.adv||(state.adv={dex:{},hunt:null,huntDay:null,hunts:0,caught:0});
  let on=false,raf=0,lastT=0,hud=null,ash=null,petEl=null,noteEl=null,grassEls=[],landEls=[];
  const P={c:10,r:8,face:1,walk:0,moving:false,pc:10,pr:8};   // pc/pr = pet position
  const input={jx:0,jy:0};
  let near=null,grassRun=0,wildCool=0,inGrass=false;
  // other modes add things to walk up to (notes, quest items, races) and
  // can offer a different action for an animal or vehicle (feeding, racing)
  const providers=[],hooks={crit:[],veh:[]};let spotEls=[],spotList=[];
  const firstRow=()=>ROWS_MAX-state.rows;

  /* ---------- tall grass: four patches, re-grown each day ---------- */
  function patches(){
    const a=A(),d=today();
    if(a.grass&&a.grass.d===d&&a.grass.rows===state.rows)return a.grass.p;
    const rnd=mulberry(hashStr("grass:"+d)),out=[];
    for(let k=0;k<40&&out.length<4;k++){
      const c=1.5+rnd()*(COLS-4),r=firstRow()+rnd()*(state.rows-1);
      if(out.some(p=>Math.abs(p.c-c)<4&&Math.abs(p.r-r)<1.6))continue;
      out.push({c:+c.toFixed(2),r:+r.toFixed(2),w:2.6});
    }
    a.grass={d,rows:state.rows,p:out};save();return out;
  }
  const TUFT=`<svg viewBox="0 0 60 50"><path d="M4 50 Q8 22 2 6 Q14 24 16 50Z M14 50 Q20 16 16 0 Q28 20 26 50Z M24 50 Q30 20 34 2 Q36 26 36 50Z M34 50 Q42 18 52 6 Q46 28 46 50Z M44 50 Q50 28 58 16 Q54 34 56 50Z"
    fill="#4E9A3E" stroke="#2F6B2A" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 50 Q16 30 12 18 M30 50 Q32 30 30 14 M48 50 Q50 34 54 24" stroke="#8FD06A" stroke-width="1.6" fill="none"/></svg>`;
  function place(el,c,r,sz,zAdd,extra){
    const g=geom(c,r);el.style.left=g.x+"px";el.style.top=g.y*100+"%";
    el.style.width=sz*g.scale+"px";el.style.height=sz*g.scale*(extra||1)+"px";el.style.zIndex=g.z+zAdd;el.style.filter=atmos(g);return g;
  }
  function drawGrass(){
    grassEls.forEach(e=>e.remove());grassEls=[];
    const base=baseSize();
    patches().forEach((p,pi)=>{for(let i=0;i<7;i++){
      const c=p.c-p.w/2+(i/6)*p.w,r=p.r+((i*37)%5-2)*.12;
      const el=document.createElement("div");el.className="tile advgrass";el.dataset.p=pi;
      el.innerHTML=`<div class="sway" style="width:100%;height:100%;animation-delay:${(i*.37)%2}s">${TUFT}</div>`;
      place(el,c,r+.35,base*.62,7,.8);tilesEl.appendChild(el);grassEls.push(el);}});
  }
  /* ---------- treasure hunt landmarks ---------- */
  function drawLand(){
    landEls.forEach(e=>e.remove());landEls=[];
    const h=A().hunt;if(!h)return;const base=baseSize();
    h.marks.forEach((m,i)=>{
      const el=document.createElement("div");el.className="tile advland"+(m.dug?" dug":"");
      el.innerHTML=(m.dug?`<div class="hole"></div>`:"")+`<div class="lart">${drawWord(m.w,"land")}</div>`;
      place(el,m.c,m.r,base*.72,4);tilesEl.appendChild(el);landEls.push(el);});
  }
  /* ---------- Ash and his pet ---------- */
  function drawAsh(){
    if(ash)ash.remove();if(petEl)petEl.remove();
    ash=document.createElement("div");ash.className="tile advash";
    let src=null;try{src=Mine.avatar();}catch(e){}
    ash.innerHTML=`<div class="ashbody">${src?`<img src="${src}" alt="">`:drawThing("fox",1)}</div><div class="ashshadow"></div>`;
    tilesEl.appendChild(ash);
    const pet=state.mine&&state.mine.pet;
    if(pet&&CRIT(pet)){petEl=document.createElement("div");petEl.className="tile advpet";petEl.innerHTML=`<div class="hop">${drawThing(pet,5)}</div>`;tilesEl.appendChild(petEl);}
    else petEl=null;
    posAsh();
  }
  function posAsh(){
    if(!ash)return;const base=baseSize();
    const g=place(ash,P.c,P.r,base*.78,6,1.2);
    ash.classList.toggle("left",P.face<0);ash.classList.toggle("walking",P.moving);ash.classList.toggle("ingrass",inGrass);
    if(petEl)place(petEl,P.pc,P.pr,base*.46,5);
    return g;
  }
  function drawSpots(){
    spotEls.forEach(e=>e.remove());spotEls=[];if(!on)return;
    spotList=providers.flatMap(f=>{try{return f()||[];}catch(e){return[];}});const base=baseSize();
    spotList.forEach(sp=>{const el=document.createElement("div");el.className="tile advland spot "+(sp.cls||"");
      el.innerHTML=`<div class="lart">${sp.html}</div>`;place(el,sp.c,sp.r,base*(sp.size||.6),4);tilesEl.appendChild(el);spotEls.push(el);});
  }
  // after the valley redraws (placing, levels, weather) put everything back
  function mount(){if(!on){grassEls=[];landEls=[];spotEls=[];ash=null;petEl=null;return;}drawGrass();drawLand();drawSpots();drawAsh();}
  // a free spot a few steps from Ash, for things that arrive while he explores
  function freePos(minD=2.5){
    for(let k=0;k<60;k++){const c=1+Math.random()*(COLS-3),r=firstRow()+Math.random()*(state.rows-1);
      if(Math.abs(c-P.c)<minD&&k<50)continue;if(patches().some(p=>Math.abs(p.c-c)<p.w/2+.6&&Math.abs(p.r-r)<1))continue;
      if(spotList.some(s=>Math.abs(s.c-c)<1.6&&Math.abs(s.r-r)<1))continue;return{c:+c.toFixed(2),r:+r.toFixed(2)};}
    return{c:Math.min(COLS-2,P.c+3),r:P.r};
  }

  /* ---------- what is he standing next to? ---------- */
  function findNear(){
    const close=(c,r,dc=1.15,dr=.8)=>Math.abs(c-P.c)<=dc&&Math.abs(r-P.r)<=dr;
    for(const sp of spotList)if(close(sp.c,sp.r,1.05,.75))return{k:"spot",sp,label:sp.label};
    const h=A().hunt;
    if(h){const m=h.marks.find(m=>!m.dug&&close(m.c,m.r,1,.7));if(m)return{k:"dig",m,label:"⛏️ Dig here"};}
    const cr=state.critters.find(x=>x.out!==false&&close(x.c,x.r));
    if(cr){for(const f of hooks.crit){const o=f(cr);if(o)return{k:"hook",o,label:o.label};}
      const n=(CRIT(cr.id)||{name:cr.id}).name;return{k:"crit",id:cr.id,label:`👋 ${n}`};}
    const v=(state.vehicles||[]).find(x=>x.out!==false&&close(x.c,x.r));
    if(v){for(const f of hooks.veh){const o=f(v);if(o)return{k:"hook",o,label:o.label};}
      return{k:"veh",u:v.u,label:`🚗 ${(VEH(v.id)||{name:"Ride"}).name}`};}
    const gRow=Math.max(firstRow(),ROWS_MAX-2);
    const gb=(state.guardians||[]).find(b=>GUARDIANS[b]&&close(GUARDIANS[b].c,gRow));
    if(gb!=null)return{k:"guard",b:gb,label:"📖 "+GUARDIANS[gb].name.split(" ")[0]};
    for(const key in state.grid){const[c,r]=key.split(",").map(Number);
      if(close(c,r,1.1,.7))return{k:"build",key,id:state.grid[key].id,label:"🚪 "+(NAMES[state.grid[key].id]||"Use")};}
    return null;
  }
  function act(){
    if(!near||busy())return;Sound.sfx.pop();input.jx=input.jy=0;
    if(near.k==="spot")near.sp.act(near.sp);
    else if(near.k==="hook")near.o.act();
    else if(near.k==="dig")dig(near.m);
    else if(near.k==="crit")nameThatAnimal(near.id);
    else if(near.k==="veh")useVehicle(near.u);
    else if(near.k==="guard")openBook(near.b);
    else if(near.k==="build")useBuilding(near.key,near.id);
  }
  const busy=()=>!!document.querySelector(".overlay.on")||!!document.querySelector("#advNote.big");

  /* ---------- the loop ---------- */
  function frame(now){
    if(!on)return;raf=requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-lastT)/1000||0);lastT=now;
    if(busy()){P.moving=false;posAsh();return;}
    const jx=input.jx,jy=input.jy,mag=Math.hypot(jx,jy);
    P.moving=mag>.15;
    if(P.moving){
      const sp=4.2,old={c:P.c,r:P.r};
      P.c=Math.max(0,Math.min(COLS-1,P.c+jx*sp*dt));
      P.r=Math.max(firstRow(),Math.min(ROWS_MAX-1,P.r+jy*2.4*dt));
      if(Math.abs(jx)>.15)P.face=jx>0?1:-1;
      const moved=Math.hypot(P.c-old.c,(P.r-old.r)*1.6);
      // tall grass: every few steps something might rustle out
      const g=patches().find(p=>Math.abs(p.c-P.c)<p.w/2+.2&&Math.abs(p.r-P.r)<.75);
      inGrass=!!g;
      if(g){grassRun+=moved;grassEls.filter(e=>+e.dataset.p===patches().indexOf(g)).forEach(e=>e.classList.add("rustle"));
        if(grassRun>1.4&&now>wildCool){grassRun=0;if(Math.random()<.4){wildCool=now+5000;Wild.start();}}}
    }else grassEls.forEach(e=>e.classList.remove("rustle"));
    // the pet trots after him
    const tc=P.c-P.face*.9,tr=P.r+.05;P.pc+=(tc-P.pc)*Math.min(1,dt*3.5);P.pr+=(tr-P.pr)*Math.min(1,dt*3.5);
    const g=posAsh();
    // camera follows
    const target=g.x-viewW()/2;if(Math.abs(target-cam)>2){cam+=(target-cam)*Math.min(1,dt*3.2);applyCamera();}
    const n=findNear(),lab=n?n.label:"";
    if(lab!==(near&&near.label)||!n){const b=hud.querySelector("#advAct");b.textContent=lab;b.classList.toggle("on",!!n);}
    near=n;
  }

  /* ---------- enter / leave ---------- */
  function buildHud(){
    hud=document.createElement("div");hud.id="advHud";
    hud.innerHTML=`<div class="advtop"><button class="advpill" id="advDone">🏡 Done exploring</button>
      <button class="advpill" id="advDex">📔 Word-Dex <b id="advDexN"></b></button>
      <button class="advpill gold" id="advHunt">🗺️ Treasure hunt</button></div>
      <div id="advJoy"><div id="advKnob"></div></div><button id="advAct"></button>
      <div id="advNote"></div>`;
    document.body.appendChild(hud);
    const joy=hud.querySelector("#advJoy"),knob=hud.querySelector("#advKnob");let jid=null;
    const setJ=e=>{const r=joy.getBoundingClientRect(),R=r.width/2;let dx=e.clientX-(r.left+R),dy=e.clientY-(r.top+R);
      const d=Math.hypot(dx,dy),m=R*.7;if(d>m){dx*=m/d;dy*=m/d;}knob.style.transform=`translate(${dx}px,${dy}px)`;input.jx=dx/m;input.jy=dy/m;};
    joy.addEventListener("pointerdown",e=>{e.stopPropagation();jid=e.pointerId;joy.setPointerCapture(jid);setJ(e);});
    joy.addEventListener("pointermove",e=>{if(e.pointerId===jid)setJ(e);});
    const endJ=e=>{if(e.pointerId!==jid)return;jid=null;input.jx=input.jy=0;knob.style.transform="";};
    joy.addEventListener("pointerup",endJ);joy.addEventListener("pointercancel",endJ);
    hud.querySelector("#advAct").onclick=act;
    hud.querySelector("#advDone").onclick=exit;
    hud.querySelector("#advDex").onclick=()=>Dex.open();
    hud.querySelector("#advHunt").onclick=()=>{if(A().hunt)showNote(true);else newHunt();};
    // keyboard for grown-ups on a computer: WASD / arrows, Space or E to use
    const keys={},MOVE=new Set(["KeyA","KeyD","KeyW","KeyS","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]);
    const upd=()=>{input.jx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);input.jy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);};
    addEventListener("keydown",e=>{if(!on||busy()||/INPUT|TEXTAREA/.test(e.target.tagName))return;
      if(MOVE.has(e.code)){e.preventDefault();keys[e.code]=1;upd();}
      else if((e.code==="Space"||e.code==="KeyE"||e.code==="Enter")&&!e.repeat){e.preventDefault();act();}});
    addEventListener("keyup",e=>{if(MOVE.has(e.code)){keys[e.code]=0;upd();}});
    addEventListener("blur",()=>{for(const k in keys)keys[k]=0;upd();});
  }
  function enter(){
    if(!hud)buildHud();
    if(state.selected){state.selected=null;renderDock();}
    on=true;document.body.classList.add("exploring");hud.classList.add("on");
    // start where he is looking, at the front of the valley
    const W=worldW(),t=((cam+viewW()/2)/W-EDGE)/(1-EDGE*2);
    P.c=Math.max(0,Math.min(COLS-1,t*(COLS-1)));P.r=ROWS_MAX-1;P.pc=P.c-.9;P.pr=P.r;
    mount();refreshHud();lastT=performance.now();raf=requestAnimationFrame(frame);
    Sound.sfx.chime();
    const a=A();
    if(!a.seenIntro){a.seenIntro=1;save();setTimeout(()=>{buddySay("Walk into the tall grass to find wild animals!");Sound.speak("Walk into the tall grass to find wild animals!",.95);},500);}
    if(a.hunt)setTimeout(()=>showNote(false),400);
    try{if(Quest.available())setTimeout(()=>toast("❗ Gloom the ghost is up to something! Find the ❗"),a.seenIntro?700:4000);}catch(e){}
  }
  function exit(){
    on=false;cancelAnimationFrame(raf);document.body.classList.remove("exploring");hud.classList.remove("on");
    input.jx=input.jy=0;[...grassEls,...landEls,ash,petEl].forEach(e=>e&&e.remove());grassEls=[];landEls=[];ash=petEl=null;
    Sound.sfx.soft();
  }
  function refreshHud(){
    if(!hud)return;const a=A(),n=Object.values(a.dex).filter(d=>d.caught).length;
    hud.querySelector("#advDexN").textContent=n+"/"+CRITTERS.length;
    hud.querySelector("#advHunt").textContent=a.hunt?"📜 Read the note":"🗺️ Treasure hunt";
    if(!a.hunt)noteEl&&(noteEl.className="",noteEl.innerHTML="");
  }

  /* ---------- treasure hunt ---------- */
  function clue(tier,w,other){
    if(tier<=1)return`Hop to the ${w}!`;
    if(tier===2)return`Dig at the ${w}.`;
    if(tier<=4||!other)return`Dig by the ${w}.`;
    return`Dig by the ${w}, not the ${other}.`;
  }
  function newHunt(){
    const tier=currentTier();
    const LOOK=[["hat","cap"],["cup","mug"],["rock","stone"],["log","wood","stick"],["pot","pan"],["bug","bee"],["boat","ship","sub"],["car","van","cab","jeep"]];
    const near=(a,b)=>LOOK.some(g=>g.includes(a)&&g.includes(b));
    // landmarks are things, not animals, so they never look like his wandering critters
    const thing=w=>!w.tricky&&WORD_ART[w.w]&&!CRIT(w.w)&&!CRIT(WORD_ART[w.w]);
    let pool=allWords().filter(w=>thing(w)&&w.t<=tier).sort(()=>Math.random()-.5);
    // practise his shaky sounds when possible
    const tg=Skills.target(tier);if(tg&&thing(tg.w))pool.unshift(tg.w);
    const pick=[];for(const w of pool){if(pick.length>=4)break;if(pick.some(x=>x.w===w.w||near(x.w,w.w)||WORD_ART[x.w]===WORD_ART[w.w]))continue;pick.push(w);}
    if(pick.length<4){toast("Read a few more words first!");return;}
    // spread the landmarks around the valley
    const spots=[];for(let k=0;k<200&&spots.length<4;k++){
      const c=1+Math.random()*(COLS-3),r=firstRow()+Math.random()*(state.rows-1);
      if(spots.some(s=>Math.abs(s.c-c)<3.2))continue;
      if(patches().some(p=>Math.abs(p.c-c)<p.w/2+.8&&Math.abs(p.r-r)<1))continue;
      spots.push({c:+c.toFixed(2),r:+r.toFixed(2)});}
    const marks=pick.map((w,i)=>({w:w.w,...(spots[i]||{c:2+i*5,r:ROWS_MAX-1}),dug:false}));
    const order=[0,1,2].sort(()=>Math.random()-.5);
    A().hunt={marks,order,step:0,miss:0,t0:Date.now(),tier};save();
    mount();refreshHud();Sound.sfx.chime();
    toast("A note blew in! 📜");showNote(true);try{Quests.ensure();}catch(e){}
  }
  function noteText(){
    const h=A().hunt,m=h.marks[h.order[h.step]],others=h.marks.filter(x=>!x.dug&&x!==m);
    const other=others.length?others[Math.floor((h.t0/1000+h.step)%others.length)].w:null;
    return (h.step===0?"":h.step===1?"Yes! ":"One more! ")+clue(h.tier,m.w,other);
  }
  function showNote(big){
    const h=A().hunt;if(!h||!hud)return;noteEl=hud.querySelector("#advNote");
    const text=noteText();
    noteEl.className=big?"big":"small";
    noteEl.innerHTML=`<div class="paper"><div class="nh">📜 Clue ${h.step+1} of 3</div>
      <div class="btext">${text.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</div>
      ${big?`<button class="btn primary" id="noteGo">Let's go! 🧭</button>`:""}
      ${h.miss?`<button class="btn soft" id="noteHear">🔊</button>`:""}</div>`;
    Books.wireWords(noteEl.querySelector(".btext"));
    const go=noteEl.querySelector("#noteGo");if(go)go.onclick=()=>{Sound.sfx.pop();showNote(false);};
    const hr=noteEl.querySelector("#noteHear");if(hr)hr.onclick=()=>Sound.say("sent:"+text,text,.9);
    if(!big)noteEl.onclick=e=>{if(e.target.closest(".bw,button"))return;showNote(true);};else noteEl.onclick=null;
  }
  function dig(m){
    const h=A().hunt,want=h.marks[h.order[h.step]];
    const el=landEls[h.marks.indexOf(m)];if(el){el.classList.remove("digging");void el.offsetWidth;el.classList.add("digging");}
    Sound.sfx.dig?Sound.sfx.dig():Sound.sfx.thud();
    const wobj=allWords().find(x=>x.w===want.w);
    if(m===want){
      try{Skills.result(wobj,{ok:true,help:h.miss>0});}catch(e){}
      m.dug=true;h.step++;state.wordsRead+=4;
      setTimeout(()=>{drawLand();Sound.sfx.win();const g=geom(m.c,m.r);sparkleBurst(toView(g.x),g.y*100-6,12);
        if(h.step>=3)treasure();else{Sound.say("sent:Yes! You found the next clue!","Yes! You found the next clue!",.95);showNote(true);}save();refreshHud();},450);
    }else{
      h.miss++;try{Skills.result(wobj,{ok:false,confused:m.w});}catch(e){}
      setTimeout(()=>{Sound.sfx.nope();toast(`Nothing by the ${m.w}. Read the note again!`);showNote(true);
        const sp=[...noteEl.querySelectorAll(".bw")].find(x=>x.textContent.replace(/[^a-z]/gi,"").toLowerCase()===want.w);
        if(sp){sp.classList.add("look");setTimeout(()=>sp.classList.remove("look"),1800);}save();},450);
    }
  }
  function treasure(){
    const a=A(),h=a.hunt,first=a.huntDay!==today();
    a.huntDay=today();a.hunts=(a.hunts||0)+1;a.hunt=null;
    const gems=first?8+currentTier()+(h.miss?0:4):3;state.gems+=gems;
    let art="🧰",name="Treasure!",sub=`+${gems} gems${h.miss?"":" (no wrong digs — bonus!)"}`;
    if(first){const c=randomCritter(),res=addItem(c.id);art=drawThing(c.id,7);name="Treasure: a "+c.name.toLowerCase()+"!";
      sub=`${res&&res.up?"Your "+c.name.toLowerCase()+" leveled up!":res&&res.max?"":"It joins your valley!"} +${gems} 💎`;
      a.dex[c.id]=a.dex[c.id]||{};a.dex[c.id].seen=1;}
    try{Quests.hit("treasure");}catch(e){}
    save();renderHUD();drawLand();refreshHud();noteEl&&(noteEl.className="",noteEl.innerHTML="");
    document.getElementById("rewardArt").innerHTML=typeof art==="string"&&art.length<4?`<div style="font-size:110px;line-height:1">${art}</div>`:art;
    document.getElementById("rewardName").textContent=name;document.getElementById("rewardWord").textContent=sub;
    show("ovReward");confetti();Sound.sfx.fanfare();setTimeout(()=>Sound.say("sent:You found the treasure!","You found the treasure!",.95),400);
  }
  return{enter,exit,mount,refreshHud,newHunt,provide:f=>providers.push(f),hookCrit:f=>hooks.crit.push(f),hookVeh:f=>hooks.veh.push(f),
    redraw:()=>{if(on){drawSpots();near=null;hud&&hud.querySelector("#advAct").classList.remove("on");}},freePos,get on(){return on;},_P:P,_in:input,_near:()=>near,_act:act,_patches:patches,_A:A};
})();

/* ================================================================
   WORD WILDS — befriend a wild animal by reading
   Hearts fill with each right answer. The rounds change so no single
   trick works: read the word and find its picture, look at the picture
   and find its word among look-alikes, read a whole sentence, and at the
   end call the animal by its name (spell it) when he can.
   ================================================================ */
const Dex={
  pool:()=>CRITTERS.filter(c=>c.b<=Math.max(state.biome||0,1)+1),
  facts:{hunter:"It can run and hunt.",prey:"It can hop and hide.",flyer:"It can zip up in the sky.",brawler:"It is big and strong."},
  open(){
    let ov=document.getElementById("ovDex");
    if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovDex";document.body.appendChild(ov);}
    const dex=Adv._A().dex,all=CRITTERS,got=all.filter(c=>(dex[c.id]||{}).caught).length;
    ov.innerHTML=`<div class="sheet dexsheet"><div class="bhead"><h2>📔 Word-Dex</h2><b class="dexn">${got} / ${all.length} friends</b><button class="bx" id="dexX">✕</button></div>
      <p class="sub">Walk in the tall grass to meet wild animals. Read to make them your friends!</p>
      <div class="dexgrid">${all.map((c,i)=>{const d=dex[c.id]||{};const st=d.caught?"got":d.seen?"seen":"none";
        return`<button class="dexc ${st}${d.shiny?" shiny":""}" data-id="${c.id}"><i>#${String(i+1).padStart(2,"0")}</i>
          <div class="dart">${st==="none"?"?":drawThing(c.id,5)}</div><b>${st==="got"?c.name:st==="seen"?"???":"&nbsp;"}</b>
          ${d.shiny?`<span class="spk">✨</span>`:""}${c.rar===3?`<span class="leg">★</span>`:""}</button>`;}).join("")}</div></div>`;
    ov.classList.add("on");
    ov.querySelector("#dexX").onclick=()=>ov.classList.remove("on");
    ov.querySelectorAll(".dexc.got").forEach(b=>b.onclick=()=>{const c=CRIT(b.dataset.id);const s=`The ${c.name.toLowerCase()}. ${Dex.facts[c.kind]||""}`;
      Sound.sfx.cry(c.cry);setTimeout(()=>Sound.say("sent:"+s,s,.9),350);b.classList.add("pop");setTimeout(()=>b.classList.remove("pop"),600);});
    ov.querySelectorAll(".dexc.seen").forEach(b=>b.onclick=()=>{Sound.sfx.soft();toast("You met this one! Find it in the grass again.");});
  }
};
const Wild=(()=>{
  let ov=null,W=null;
  function pickCreature(){
    const dex=Adv._A().dex,night=isNight();
    const bag=Dex.pool().flatMap(c=>{let n=c.rar===3?1:c.rar===2?3:7;if(!(dex[c.id]||{}).caught)n*=2;if(night&&NIGHT_OWLS.has(c.id))n*=3;return Array(n).fill(c);});
    return bag[Math.floor(Math.random()*bag.length)];
  }
  function nameWord(c){const w=allWords().find(x=>x.w===c.name.toLowerCase()&&!x.tricky);return w&&w.t<=currentTier()+1?w:null;}
  function start(){
    const c=pickCreature(),shiny=Math.random()<.05||(Adv._A().shinyCharm&&Math.random()<.15);
    const need=c.rar===3?5:c.rar===2?4:3;
    W={c,shiny,need,hearts:0,miss:0,round:0,lock:false,nameW:nameWord(c),right:0};
    const d=Adv._A().dex;d[c.id]=d[c.id]||{};d[c.id].seen=1;save();
    if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovWild";document.body.appendChild(ov);}
    let src=null;try{src=Mine.avatar();}catch(e){}
    ov.innerHTML=`<div class="sheet wild"><div class="wscene">
        <div class="wash">${src?`<img src="${src}">`:""}</div><div class="wberry">🍓</div>
        <div class="wcrit${shiny?" shiny":""}"><div class="wbody">${drawThing(c.id,W.seed=Math.floor(Math.random()*999))}</div><div class="wpad"></div></div></div>
      <div class="whead"><b id="wTitle">A wild ${shiny?"✨shiny✨ ":""}${c.name.toLowerCase()} appeared!</b><span class="whearts" id="wHearts"></span></div>
      <div id="wQ"></div><div class="wfoot"><button class="btn ghost" id="wRun">🏃 Run away</button></div></div>`;
    ov.classList.add("on");hearts();
    Sound.sfx.cry(c.cry);setTimeout(()=>Sound.speak(`A wild ${shiny?"shiny ":""}${c.name}! Read to make friends!`,.95),450);
    ov.querySelector("#wRun").onclick=()=>{Sound.sfx.soft();close();};
    setTimeout(round,1300);
  }
  function hearts(){ov.querySelector("#wHearts").textContent="💗".repeat(W.hearts)+"🤍".repeat(W.need-W.hearts);}
  function close(){ov.classList.remove("on");W=null;Adv.refreshHud();}
  const shuffle=a=>a.sort(()=>Math.random()-.5);
  function wordFor(){
    const tier=currentTier();let w=null;
    if(Math.random()<.45){const tg=Skills.target(tier);if(tg&&WORD_ART[tg.w.w]&&!tg.w.tricky)w=tg.w;}
    if(!w){const pool=allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&x.t<=tier&&x.t>=Math.max(1,tier-2));
      w=pool[Math.floor(Math.random()*pool.length)]||allWords().find(x=>WORD_ART[x.w]);}
    return w;
  }
  function others(w){
    const LOOK=[["hat","cap"],["cup","mug"],["rock","stone"],["log","wood","stick"],["pot","pan"],["bug","bee"],["boat","ship","sub"],["car","van","cab","jeep"]];
    const near=(a,b)=>LOOK.some(g=>g.includes(a)&&g.includes(b));
    return shuffle(allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&x.w!==w.w&&WORD_ART[x.w]!==WORD_ART[w.w]&&!near(x.w,w.w)))
      .reduce((a,x)=>{if(a.length<2&&!a.some(y=>near(x.w,y.w)||WORD_ART[x.w]===WORD_ART[y.w]))a.push(x);return a;},[]);
  }
  function round(){
    if(!W)return;W.round++;W.lock=false;W.t0=performance.now();
    const Q=ov.querySelector("#wQ"),last=W.hearts===W.need-1,tier=currentTier();
    let type;
    if(last&&W.nameW)type="name";
    else if(Skills.slow)type="pic";
    else if(tier>=2&&W.round%3===0)type="sent";
    else type=W.round%2?"pic":"word";
    W.type=type;
    if(type==="name"){nameRound(Q);return;}
    if(type==="sent"){
      const ps=PicSentence.make();if(!ps){W.type="pic";W.round++;return round();}
      W.ans="#ps";W.say=ps.text;
      Q.innerHTML=`<p class="wp">Read it all, then find the picture!</p><div class="btext">${ps.text.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</div>
        <div class="psopts">${ps.opts.map((o,i)=>`<button class="psopt" data-w="${o.ok?"#ps":"#no"+i}">${PicSentence.draw(o,"meadow")}</button>`).join("")}</div>`;
      Books.wireWords(Q.querySelector(".btext"));
    }else{
      const w=wordFor();W.ans=w.w;W.w=w;W.say=null;
      if(type==="pic"){
        Q.innerHTML=`<p class="wp">Read the word. Tap its picture!</p><div class="wword">${w.w}</div>
          <div class="wopts">${shuffle([w,...others(w)]).map(o=>`<button class="wpic" data-w="${o.w}">${drawWord(o.w,"wild")}</button>`).join("")}</div>`;
        if(Skills.slow){const box=Q.querySelector(".wopts");box.classList.add("locked-by-shield");
          soundShield(Q,w,()=>{box.classList.remove("locked-by-shield");W.t0=performance.now();});}
      }else{
        const opts=shuffle([w.w,...lookalikes(w).map(x=>x.w)]);
        Q.innerHTML=`<p class="wp">Which word is this? Look closely!</p><div class="wbig">${drawWord(w.w,"wild")}</div>
          <div class="wopts">${opts.map(o=>`<button class="wwopt" data-w="${o}">${o}</button>`).join("")}</div>`;
      }
    }
    Q.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>answer(b,b.dataset.w===W.ans));
  }
  function answer(b,ok){
    if(!W||W.lock)return;W.lock=true;const ms=performance.now()-W.t0;
    try{if(W.type==="sent"){state.comp=state.comp||{right:0,wrong:0};state.comp[ok?"right":"wrong"]++;}
      else Skills.result(W.w,{ok,confused:ok?null:b.dataset.w,ms});}catch(e){}
    if(ok){b.classList.add("right");good();}
    else{b.classList.add("wrong");const r=ov.querySelector(`[data-w="${W.ans}"]`);if(r)r.classList.add("hint");
      bad(W.say?"sent:"+W.say:"word:"+W.ans,W.say||W.ans);}
  }
  function good(){
    W.hearts++;W.right++;hearts();Sound.sfx.win();
    const be=ov.querySelector(".wberry");be.classList.remove("toss");void be.offsetWidth;be.classList.add("toss");
    const cr=ov.querySelector(".wcrit");setTimeout(()=>{cr.classList.remove("happy","nope");void cr.offsetWidth;cr.classList.add("happy");},500);
    if(W.say)Sound.say("sent:"+W.say,W.say,.9);else if(W.w)Sound.say("word:"+W.w.w,W.w.w,.9);
    setTimeout(()=>{if(!W)return;if(W.hearts>=W.need)caught();else round();},1300);
  }
  function bad(key,text){
    W.miss++;Sound.sfx.nope();const cr=ov.querySelector(".wcrit");cr.classList.remove("happy","nope");void cr.offsetWidth;cr.classList.add("nope");
    setTimeout(()=>Sound.say(key,text,.88),500);
    setTimeout(()=>{if(!W)return;if(W.miss>=3)flee();else round();},2200);
  }
  // spell its name: tap the sounds in order
  function nameRound(Q){
    const w=W.nameW,slots=w.p.map(()=>null);W.w=w;W.ans=w.w;
    const mine=new Set(w.p.map(soundOf));
    const pool=allWords().flatMap(x=>x.p).filter(p=>!p.includes(":")&&!mine.has(soundOf(p))&&Phonics.known(p));
    const bank=shuffle([...w.p,pool[Math.floor(Math.random()*pool.length)]]);
    Q.innerHTML=`<p class="wp">Last one! Call it by its name — tap the sounds in order.</p>
      <div class="wslots">${w.p.map((_,i)=>`<div class="wslot" data-i="${i}"></div>`).join("")}</div>
      <div class="wbank">${bank.map((ph,i)=>`<button class="lt bank" data-i="${i}">${tileText(ph)}</button>`).join("")}</div>
      <div class="mrow" style="justify-content:center;margin-top:8px"><button class="btn soft" id="wHearName">👂 Hear it</button></div>`;
    Q.querySelector("#wHearName").onclick=()=>Sound.say("word:"+w.w,w.w,.82);
    setTimeout(()=>Sound.say("word:"+w.w,w.w,.82),300);
    const sl=[...Q.querySelectorAll(".wslot")];
    Q.querySelectorAll(".wbank .lt").forEach(t=>t.onclick=()=>{
      if(W.lock||t.classList.contains("used"))return;const i=slots.indexOf(null);if(i<0)return;
      const ph=bank[+t.dataset.i];slots[i]={ph,t};t.classList.add("used");sl[i].textContent=tileText(ph);sl[i].classList.add("filled");
      Sound.say("sound:"+ph,ph);
      if(slots.every(Boolean)){
        const okAll=slots.every((s,k)=>s.ph===w.p[k]);
        if(okAll){W.lock=true;sl.forEach(x=>x.classList.add("good"));try{Skills.result(w,{ok:true,help:W.miss>0});}catch(e){}
          setTimeout(()=>Sound.say("word:"+w.w,w.w,.82),250);setTimeout(()=>{W.hearts++;W.right++;hearts();caught();},1100);}
        else{const wi=[],pl=[];slots.forEach((s,k)=>{if(s.ph!==w.p[k]){wi.push(k);pl.push(s.ph);}});
          try{Skills.result(w,{ok:false,wrongIdx:wi,placed:pl});}catch(e){}
          W.miss++;Sound.sfx.nope();wi.forEach(k=>sl[k].classList.add("bad"));
          setTimeout(()=>{wi.forEach(k=>{slots[k].t.classList.remove("used");slots[k]=null;sl[k].textContent="";sl[k].classList.remove("bad","filled");});
            Sound.say("word:"+w.w,w.w,.82);if(W.miss>=4)flee();},800);}
      }
    });
  }
  function caught(){
    const c=W.c,a=Adv._A(),d=a.dex[c.id]=a.dex[c.id]||{};const firstTime=!d.caught;
    d.caught=(d.caught||0)+1;d.seen=1;if(W.shiny)d.shiny=1;d.at=d.at||Date.now();a.caught=(a.caught||0)+1;
    const res=addItem(c.id);
    if(W.shiny){const cr=state.critters.find(x=>x.id===c.id);if(cr){cr.shiny=true;renderCritters();}}
    const gems=2+c.rar*2+(W.shiny?5:0)+(W.miss?0:2);state.gems+=gems;state.wordsRead+=W.right;
    const got=Object.values(a.dex).filter(x=>x.caught).length;let bonus="";
    if(firstTime&&got%5===0){state.gems+=10;bonus=` 🎉 ${got} friends in your Word-Dex: +10 💎!`;}
    try{Quests.hit("wild");Quests.hit("read",W.right);}catch(e){}
    save();renderHUD();
    const cr=ov.querySelector(".wcrit");cr.classList.add("friend");Sound.sfx.fanfare();try{confetti();}catch(e){}
    ov.querySelector("#wTitle").textContent=`${c.name} is your friend!`;
    ov.querySelector("#wQ").innerHTML=`<div class="wdone"><div class="wdexno">${firstTime?"NEW in your Word-Dex!":"Your "+c.name.toLowerCase()+" got stronger!"}</div>
      <p class="mpaid">+${gems} 💎${bonus}</p><p class="sub">${res&&res.new?`The ${c.name.toLowerCase()} moved into your valley. Take it mining as a pet!`:res&&res.up?`Your ${c.name.toLowerCase()} leveled up! ⭐`:""}</p>
      <div class="mrow" style="justify-content:center"><button class="btn soft" id="wDex">📔 Word-Dex</button><button class="btn primary big" id="wOk">Keep exploring 🧭</button></div></div>`;
    ov.querySelector("#wRun").style.display="none";
    ov.querySelector("#wOk").onclick=()=>{ov.querySelector("#wRun").style.display="";close();};
    ov.querySelector("#wDex").onclick=()=>{close();Dex.open();};
    setTimeout(()=>Sound.speak(`${c.name} is your friend!`,.95),500);
  }
  function flee(){
    const c=W.c;ov.querySelector(".wcrit").classList.add("flee");Sound.sfx.cry(c.cry);
    ov.querySelector("#wTitle").textContent=`The ${c.name.toLowerCase()} ran off!`;
    ov.querySelector("#wQ").innerHTML=`<div class="wdone"><p class="sub">That's OK — it's still in the grass. Slow down, sound out every word, and try again!</p>
      <div class="mrow" style="justify-content:center"><button class="btn primary big" id="wOk">OK 🧭</button></div></div>`;
    ov.querySelector("#wOk").onclick=close;
  }
  return{start,_W:()=>W,_close:()=>close()};
})();
function advBadge(){const b=document.getElementById("advBadge");if(!b)return;const n=!(state.adv&&state.adv.seenIntro),note=(state.notes||[]).some(x=>!x.found);
  let q=false;try{q=Quest.available();}catch(e){}
  b.textContent=note?"💌":q&&!n?"❗":n?"NEW":"";b.classList.toggle("on",note||n||q);}
document.getElementById("advBtn").onclick=()=>{Sound.sfx.pop();Adv.enter();advBadge();};
setTimeout(advBadge,1500);
