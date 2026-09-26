/* ================================================================
   ANIMAL CARE — his friends get hungry each day
   In Adventure, a hungry animal shows 🍓. Walk up and read what it
   wants to eat (the word), then pick that food. It's a two-minute daily
   habit that doubles as spaced review. Nothing bad ever happens to an
   animal that isn't fed; it just keeps asking.
   ================================================================ */
const Care=(()=>{
  const FOOD={hunter:["fish","egg","burger","hotdog","ham","crab"],prey:["nut","seed","corn","leaf","plum","peach","carrot"],
    flyer:["bug","seed","fish","plum","corn"],brawler:["plum","peach","corn","cake","pancake","popcorn","lemon","cupcake","sandwich"]};
  const hungry=cr=>cr&&cr.out!==false&&cr.fed!==today()&&(state.adv&&state.adv.seenIntro);
  function foods(cr){
    const m=CRIT(cr.id)||{kind:"prey"},tier=currentTier();
    let pool=(FOOD[m.kind]||FOOD.prey).map(w=>allWords().find(x=>x.w===w)).filter(w=>w&&WORD_ART[w.w]&&w.t<=tier);
    if(!pool.length)pool=Object.values(FOOD).flat().map(w=>allWords().find(x=>x.w===w)).filter(w=>w&&WORD_ART[w.w]&&w.t<=Math.max(tier,2));
    return pool;
  }
  let ov=null;
  function feed(cr){
    const pool=foods(cr),w=pool[Math.floor(Math.random()*pool.length)];if(!w){cr.fed=today();save();return;}
    const name=(CRIT(cr.id)||{name:cr.id}).name;
    if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovCare";document.body.appendChild(ov);}
    ov.innerHTML=`<div class="sheet caresheet"><div class="bhead"><h2>🍓 Snack time</h2><button class="bx" id="cX">✕</button></div>
      <div class="cwho"><div class="cart">${cr.img?`<img src="${cr.img}">`:drawThing(cr.id,cr.seed)}</div>
        <div class="cbub">I want <b>${w.w}</b>!</div></div><div class="cq"></div></div>`;
    ov.classList.add("on");ov.querySelector("#cX").onclick=()=>ov.classList.remove("on");
    Sound.sfx.cry((CRIT(cr.id)||{}).cry);
    // pictures of foods, so reading the word is the only way to know
    const host=ov.querySelector(".cq");
    Read.pic(host,ok=>{
      cr.fed=today();cr.fedN=(cr.fedN||0)+1;state.gems+=ok?2:1;state.wordsRead++;save();renderHUD();try{Quests.hit("care");}catch(e){}
      const a=ov.querySelector(".cart");a.classList.add("yum");Sound.sfx.gulp();
      host.innerHTML=`<div class="wdone"><h2>Yum! The ${name.toLowerCase()} loves you. 💕</h2><p class="mpaid">+${ok?2:1} 💎</p>
        <button class="btn primary big" id="cOk">OK</button></div>`;
      host.querySelector("#cOk").onclick=()=>{ov.classList.remove("on");renderCritters();Adv.redraw();};
    },w);
    host.querySelector(".wp").textContent=`Which one is ${w.w}?`;
    // the food choices are other foods, not random things
    const others=Object.values(FOOD).flat().filter(f=>f!==w.w&&WORD_ART[f]&&WORD_ART[f]!==WORD_ART[w.w]).sort(()=>Math.random()-.5).slice(0,2);
    const btns=host.querySelectorAll(".wpic:not([data-w='"+w.w+"'])");
    btns.forEach((b,i)=>{if(others[i]){b.dataset.w=others[i];b.innerHTML=drawWord(others[i],"q");}});
  }
  Adv.hookCrit(cr=>hungry(cr)?{label:`🍓 Feed the ${(CRIT(cr.id)||{name:"pet"}).name.toLowerCase()}`,act:()=>feed(cr)}:null);
  return{hungry,feed,foods};
})();

/* ================================================================
   RACES — reading gives a boost, never a penalty
   Walk up to a vehicle in Adventure and race it against two others.
   At each word gate the race waits for him: read the word right and he
   gets a turbo boost; a miss just means no boost. Three gates; reading
   all three wins.
   ================================================================ */
const Race=(()=>{
  let ov=null,R=null,raf=0;
  function start(v){
    const mine=VEH(v.id);if(!mine)return;
    const rivals=VEHICLES.filter(x=>x.id!==v.id&&x.move!=="air"&&x.move!=="water"&&ART[x.id]).sort(()=>Math.random()-.5).slice(0,2);
    R={v,cars:[{id:v.id,me:true,x:0,sp:8,name:"You"},{id:rivals[0].id,x:0,sp:9.4,name:rivals[0].name},{id:rivals[1].id,x:0,sp:7.6,name:rivals[1].name}],
      gates:[22,47,72],gi:0,boost:0,t:0,done:false,right:0,place:[]};
    if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovRace";document.body.appendChild(ov);}
    ov.innerHTML=`<div class="sheet racesheet"><div class="bhead"><h2>🏁 Race!</h2><button class="bx" id="rX">✕</button></div>
      <div class="track">${R.cars.map((c,i)=>`<div class="lane${c.me?" me":""}"><div class="rcar" id="rc${i}">${drawThing(c.id,1)}</div><span class="rname">${c.name}</span></div>`).join("")}
        ${R.gates.map(gx=>`<div class="gate" style="left:${gx}%"></div>`).join("")}<div class="finish"></div></div>
      <div class="rq" id="rQ"><p class="wp">Read at the gates for a turbo boost! 🚀</p><button class="btn primary big" id="rGo">Go! 🏁</button></div></div>`;
    ov.classList.add("on");
    ov.querySelector("#rX").onclick=()=>{cancelAnimationFrame(raf);ov.classList.remove("on");R=null;};
    ov.querySelector("#rGo").onclick=()=>{ov.querySelector("#rQ").innerHTML="";Sound.sfx.veh&&Sound.sfx.veh("honk");run();};
  }
  function run(){
    let last=performance.now();
    const step=now=>{
      if(!R)return;const dt=Math.min(.05,(now-last)/1000);last=now;
      const me=R.cars[0];
      if(!R.paused&&me.x>=R.gates[R.gi]){R.paused=true;gate();}
      if(!R.paused){
        R.cars.forEach(c=>{if(c.x>=100)return;const sp=c.me&&R.boost>0?c.sp*2:c.sp;c.x=Math.min(100,c.x+sp*dt);if(c.x>=100)R.place.push(c);});
        if(R.boost>0)R.boost-=dt;R.t+=dt;
      }
      R.cars.forEach((c,i)=>{const el=ov.querySelector("#rc"+i);el.style.left=`calc(${c.x}% - ${c.x*.6}px)`;el.classList.toggle("boost",c.me&&R.boost>0);});
      if(me.x>=100){finish();return;}
      raf=requestAnimationFrame(step);
    };raf=requestAnimationFrame(step);
  }
  function gate(){
    const host=ov.querySelector("#rQ");
    host.innerHTML=`<div class="rgate">🚦 Gate ${R.gi+1} of 3</div><div class="rqi"></div>`;
    const fn=[Read.pic,Read.wordPick,Read.pic][R.gi];
    fn(host.querySelector(".rqi"),ok=>{
      if(ok){R.boost=1.5;R.right++;Sound.sfx.boing&&Sound.sfx.boing();}
      host.innerHTML=`<p class="wp">${ok?"TURBO! 🚀":"No boost this time — keep going!"}</p>`;
      R.gi++;R.paused=false;if(R.gi>=R.gates.length)R.gates.push(999);
    });
  }
  function finish(){
    cancelAnimationFrame(raf);
    // everyone else finishes at their own pace, instantly
    const order=R.cars.map(c=>({c,t:c.me?R.t:R.t+(100-c.x)/c.sp})).sort((a,b)=>a.t-b.t);
    const place=order.findIndex(o=>o.c.me)+1,gems=[0,6,3,2][place];
    state.gems+=gems;state.wordsRead+=R.right;const v=R.v;v.wins=(v.wins||0)+(place===1?1:0);save();renderHUD();
    try{if(place===1)Quests.hit("race");}catch(e){}
    Sound.sfx[place===1?"fanfare":"chime"]();if(place===1)confetti();
    ov.querySelector("#rQ").innerHTML=`<div class="wdone"><div class="podium">${order.map((o,i)=>`<div class="pod p${i+1}${o.c.me?" me":""}"><div>${drawThing(o.c.id,1)}</div><b>${["🥇","🥈","🥉"][i]}</b></div>`).join("")}</div>
      <h2>${place===1?"You won!":place===2?"Second place!":"Third place!"}</h2><p class="mpaid">+${gems} 💎 · ${R.right} of 3 gates read</p>
      <div class="mrow" style="justify-content:center"><button class="btn soft" id="rAgain">🔁 Race again</button><button class="btn primary big" id="rOk">Done</button></div></div>`;
    ov.querySelector("#rAgain").onclick=()=>start(v);ov.querySelector("#rOk").onclick=()=>{ov.classList.remove("on");R=null;};
  }
  Adv.hookVeh(v=>VEH(v.id)&&VEH(v.id).move!=="air"&&VEH(v.id).move!=="water"?{label:`🏁 Race the ${VEH(v.id).name.toLowerCase()}`,act:()=>start(v)}:null);
  return{start,_R:()=>R};
})();
