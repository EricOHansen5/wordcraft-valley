  /* ================= v5.3: pets, bosses, shinies, museum, workbench, TNT, eggs ================= */
  const perkOf=id=>PERK_OF[id]||({hunter:"sniff",brawler:"strong",flyer:"glow",prey:"lucky"})[(CRIT(id)||{}).kind]||"lucky";
  const perk=()=>{const id=M().pet;return id&&CRIT(id)?perkOf(id):null;};
  const snackOn=()=>(M().items.snackUntil||0)>Date.now();
  const charmOn=()=>(M().items.charmUntil||0)>Date.now();
  function digNeed(t){return(.18+.42*(HARD[t]||1)/PICKS[M().pick].pow)*(perk()==="strong"?(snackOn()?.5:.65):1);}
  // animal and boss art as images for the canvas
  const imgs={};
  function artImg(id){
    if(imgs[id])return imgs[id];
    let svg=drawThing(id,4);
    if(!/xmlns=/.test(svg))svg=svg.replace("<svg",'<svg xmlns="http://www.w3.org/2000/svg"');
    if(!/<svg[^>]*\swidth=/.test(svg))svg=svg.replace("<svg",'<svg width="200" height="200"');
    const im=new Image();im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);return imgs[id]=im;
  }

  // ---------- gems ----------
  function collectOre(tx,ty,o){
    const m=M(),luck=(perk()==="lucky"?(snackOn()?3:2):1)*(charmOn()?2:1),shiny=Math.random()<luck/40,k=shiny?o+20:o;
    m.bag[k]=(m.bag[k]||0)+1;PET.hop=time;
    if(!m.found[o]){m.found[o]=1;setTimeout(()=>toast(`New! A ${ORES[o].name} for your museum 🏛️`,2600),700);}
    if(shiny){m.found[k]=1;float(tx,ty,"✨ SHINY "+ORES[o].name+"!","#FFF3A0");
      for(let n=0;n<14;n++)parts.push({x:tx+.5,y:ty+.5,vx:(Math.random()-.5)*7,vy:-Math.random()*7,life:1,col:n%2?"#FFF3A0":"#FFFFFF",s:.14});
      Sound.sfx.chime();setTimeout(()=>Sound.say("sent:Wow, a shiny gem!","Wow, a shiny gem!",.95),300);}
    else{float(tx,ty,"+1 "+ORES[o].name,ORES[o].hi);Sound.sfx.pop();if(o>=5)Sound.sfx.chime();}
  }
  function openChest(tx,ty){
    const m=M(),d=depthOf(ty);let c=12+Math.floor(d*1.4)+Math.floor(Math.random()*15);if(perk()==="lucky")c=Math.round(c*1.5);
    m.coins+=c;float(tx,ty,"+"+c+" 🪙","#FFE9A8");Sound.sfx.win();
    if(d>=15&&m.eggs.length<3&&Math.random()<.3){m.eggs.push({at:today()});float(tx,ty-1,"🥚 mystery egg!","#FFFFFF");
      setTimeout(()=>toast("A mystery egg! 🥚 It will hatch tomorrow.",3500),600);}
    else toast("A treasure chest! +"+c+" coins");
  }
  // eggs found today hatch on another day into a new animal for the valley
  function hatchEggs(){
    const m=M(),ready=m.eggs.filter(e=>e.at<today());if(!ready.length)return;
    m.eggs=m.eggs.filter(e=>e.at>=today());
    const pool=CRITTERS.filter(c=>c.b<=Math.max(state.biome,1)&&c.rar>=2),from=pool.length?pool:CRITTERS;
    const got=ready.map(()=>{const c=from[Math.floor(Math.random()*from.length)];try{addItem(c.id);}catch(e){}return c;});
    save();Sound.sfx.fanfare();setTimeout(()=>Sound.say("sent:Your egg hatched!","Your egg hatched!",.95),300);
    openPanel(`<h2>🐣 Your egg hatched!</h2><div class="mhatch">${got.map(c=>`<div><div class="art">${drawThing(c.id,5)}</div><b>${c.name}</b></div>`).join("")}</div>
      <p class="sub">${got.length>1?"They live":"It lives"} in your valley now, and ${got.length>1?"they":"it"} can come mining as your pet! 🐾</p>
      <div class="mrow"><button class="btn primary" id="mClose">Yay!</button></div>`);
    card().querySelector("#mClose").onclick=()=>{closePanel();hud();};
  }

  // ---------- pets ----------
  function openPets(){
    const m=M(),ids=[...new Set((state.critters||[]).map(c=>c.id))].filter(id=>CRIT(id));
    if(!ids.length){openPanel(`<h2>🐾 Pets</h2><p class="sub">Meet some animals in your valley first — open crates to find them!</p>
      <div class="mrow"><button class="btn primary" id="mClose">OK</button></div>`);card().querySelector("#mClose").onclick=closePanel;return;}
    openPanel(`<h2>🐾 Pick a pet to dig with you</h2><p class="sub">Every animal helps in its own way.</p>
      <div class="mpets">${ids.map(id=>{const pk=PERKS[perkOf(id)];return `<button class="mpet${m.pet===id?" on":""}" data-id="${id}">
        <div class="art">${drawThing(id,5)}</div><b>${NAMES[id]||id}</b><span>${pk.ic} ${pk.t}</span></button>`;}).join("")}</div>
      <div class="mrow">${m.pet?`<button class="btn soft" id="mNoPet">No pet</button>`:""}<button class="btn primary" id="mClose">Let's go!</button></div>`);
    card().querySelectorAll(".mpet").forEach(b=>b.onclick=()=>{m.pet=b.dataset.id;PET.x=P.x-1;PET.y=P.y;PET.hop=time;save();
      Sound.sfx.pop();const c=CRIT(m.pet);if(c)Sound.sfx.cry(c.cry);openPets();hud();});
    const np=card().querySelector("#mNoPet");if(np)np.onclick=()=>{m.pet=null;save();openPets();hud();};
    card().querySelector("#mClose").onclick=()=>{closePanel();if(m.pet)toast(`${NAMES[m.pet]} is digging with you! ${PERKS[perk()].ic} ${PERKS[perk()].t}`,3200);};
  }

  // ---------- bosses ----------
  let battle=null;
  const bossArt=(b,cls)=>`<div class="mbossart ${cls||""}"><div style="filter:${b.filter||"none"}">${drawThing(b.art,1)}</div></div>`;
  function bossWords(){
    const tier=currentTier(),hi=tier+(battle&&battle.i>=2?1:0);
    let pool=allWords().filter(w=>!w.tricky&&WORD_ART[w.w]&&w.t>=Math.max(1,tier-1)&&w.t<=hi);
    if(pool.length<4)pool=allWords().filter(w=>!w.tricky&&WORD_ART[w.w]);
    return pool;
  }
  // real words that look almost the same, so a quick glance is not enough
  function lookalikes(w,n){
    const all=[...new Set(allWords().filter(x=>!/[A-Z]/.test(x.w)).map(x=>x.w))].filter(x=>x!==w&&x.length===w.length);
    const diff=(a,b)=>{let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return d;};
    let c=all.filter(x=>diff(x,w)===1).sort(()=>Math.random()-.5);
    for(const more of [x=>diff(x,w)===2,x=>x[0]===w[0],()=>true])if(c.length<n)c=c.concat(all.filter(x=>more(x)&&!c.includes(x)).sort(()=>Math.random()-.5));
    return c.slice(0,n);
  }
  function picOthers(w){
    const LOOKS=[["hat","cap"],["cup","mug"],["rock","stone"],["log","wood","stick"],["pot","pan"],["bug","bee"],["boat","ship","sub"],["car","van","cab","jeep"]];
    const near=(a,b)=>LOOKS.some(g=>g.includes(a)&&g.includes(b));
    return allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&x.w!==w.w&&WORD_ART[x.w]!==WORD_ART[w.w]&&!near(x.w,w.w)).sort(()=>Math.random()-.5)
      .reduce((a,x)=>{if(a.length<2&&!a.some(y=>near(x.w,y.w)||WORD_ART[x.w]===WORD_ART[y.w]))a.push(x);return a;},[]);
  }
  function startBoss(i){
    const b=BOSSES[i];battle={i,hp:b.hp,hearts:3,round:0,right:0,lock:false};input.dig=false;
    openPanel(`<div class="mboss">${bossArt(b,"enter")}<h2>${b.name}!</h2><p class="mtaunt">“${b.taunt}”</p>
      <p class="sub">Read to power up your pickaxe. Every right answer is a hit! ${b.hp} hits wins.</p>
      <div class="mrow"><button class="btn soft" id="mRun">Run away</button><button class="btn primary" id="mFight">Fight! ⚔️</button></div></div>`);
    Sound.sfx.rumble();setTimeout(()=>Sound.speak(b.taunt,.95),400);
    card().querySelector("#mFight").onclick=()=>bossRound();
    card().querySelector("#mRun").onclick=()=>{battle=null;bossCool=time+4;closePanel();toSurface();};
  }
  function bossRound(){
    const b=BOSSES[battle.i],pool=bossWords(),w=pool[Math.floor(Math.random()*pool.length)];battle.round++;
    const pictureFirst=battle.round%2===0;let body;
    if(!pictureFirst){const opts=[w.w,...picOthers(w).map(x=>x.w)].sort(()=>Math.random()-.5);
      body=`<p class="sub">Read the word. Tap its picture!</p><div class="mword">${w.w}</div>
        <div class="mpics">${opts.map(o=>`<button class="mpic" data-w="${o}">${drawWord(o,"boss")}</button>`).join("")}</div>`;}
    else{const opts=[w.w,...lookalikes(w.w,2)].sort(()=>Math.random()-.5);
      body=`<p class="sub">Which word is this? Look closely!</p><div class="mpic big">${drawWord(w.w,"boss")}</div>
        <div class="mwords">${opts.map(o=>`<button class="mwopt" data-w="${o}">${o}</button>`).join("")}</div>`;}
    openPanel(`<div class="mboss fight">${bossArt(b,"small")}
      <div class="mbars"><div><b>${b.name}</b> ${"🖤".repeat(battle.hp)}</div><div><b>You</b> ${"❤️".repeat(battle.hearts)}${"🤍".repeat(3-battle.hearts)}</div></div>${body}</div>`);
    card().querySelectorAll("[data-w]").forEach(el=>el.onclick=()=>answer(el,el.dataset.w===w.w,w));
  }
  function answer(el,ok,w){
    if(battle.lock)return;battle.lock=true;const art=card().querySelector(".mbossart");
    if(ok){el.classList.add("right");battle.right++;
      const help=perk()==="strong"&&Math.random()<(snackOn()?.6:.35),dmg=help?2:1;battle.hp=Math.max(0,battle.hp-dmg);
      Sound.sfx.thud();Sound.sfx.win();art.classList.remove("hit");void art.offsetWidth;art.classList.add("hit");
      Sound.say("word:"+w.w,w.w,.9);toastIn(help?`${NAMES[M().pet]} helps! DOUBLE HIT! 💥`:"POW! 💥");
      setTimeout(()=>{battle.lock=false;if(battle.hp<=0)bossWin();else bossRound();},1200);
    }else{el.classList.add("wrong");const r=card().querySelector(`[data-w="${w.w}"]`);if(r)r.classList.add("right");
      battle.hearts--;Sound.sfx.nope();art.classList.remove("attack");void art.offsetWidth;art.classList.add("attack");
      const c=card();c.classList.remove("ouch");void c.offsetWidth;c.classList.add("ouch");
      Sound.say("sent:Oh no! Try again!","Oh no! Try again!",.95);setTimeout(()=>Sound.say("word:"+w.w,w.w,.85),1200);
      setTimeout(()=>{battle.lock=false;if(battle.hearts<=0)bossLose();else bossRound();},2300);}
  }
  function bossWin(){
    const i=battle.i,b=BOSSES[i],m=M(),sr=SKY+b.d,last=i===BOSSES.length-1;
    m.bosses[b.id]=1;m.bossWins=(m.bossWins||0)+1;
    for(let x=1;x<MW-1;x++)if(tiles[idx(x,sr)]===T.SEAL)tiles[idx(x,sr)]=T.AIR;
    m.coins+=b.reward;state.gems+=b.gems;state.wordsRead+=battle.right;if(last)m.owned.crystal=1;
    battle=null;markDug();Sound.sfx.fanfare();try{confetti();}catch(e){}
    setTimeout(()=>Sound.say("sent:You beat the boss!","You beat the boss!",.95),300);
    openPanel(`<div class="mboss">${bossArt(b,"beaten")}<h2>You beat the ${b.name}!</h2>
      <p class="mpaid">+${b.reward} 🪙 &nbsp; +${b.gems} 💎 &nbsp; 🏆</p>
      <p class="sub">${last?"You reached the Crystal Core! You are a MASTER MINER! 👑 You won the Crystal crown — wear it from the clothes tent."
        :"The magic seal is broken. Dig deeper — new gems are waiting!"}</p>
      <div class="mrow"><button class="btn primary" id="mClose">${last?"Hooray!":"Keep digging ⛏️"}</button></div></div>`);
    card().querySelector("#mClose").onclick=()=>{closePanel();hud();};save();
  }
  function bossLose(){
    const b=BOSSES[battle.i];battle=null;bossCool=time+4;
    openPanel(`<div class="mboss">${bossArt(b)}<h2>The ${b.name} was too strong this time!</h2>
      <p class="sub">Keep reading and come back. It will be waiting for you.</p>
      <div class="mrow"><button class="btn primary" id="mClose">Back to the top</button></div></div>`);
    card().querySelector("#mClose").onclick=()=>{closePanel();toSurface();};
  }

  // ---------- museum ----------
  function openMuseum(){
    const m=M(),all=[1,2,3,4,5,6,7,8,9];
    const cell=(k,have,label)=>`<div class="mcase${have?" on":""}${k>20?" shiny":""}">${have?`<img src="${oreIcon(k)}" alt="">`:`<div class="q">?</div>`}<b>${have?label:"???"}</b></div>`;
    const normal=all.map(o=>cell(o,m.found[o],ORES[o].name)).join("");
    const shiny=all.map(o=>{const k=o+20;if(m.museum[k])return cell(k,1,"shiny "+ORES[o].name);
      if(m.bag[k])return `<div class="mcase donate"><img src="${oreIcon(k)}" alt=""><b>shiny ${ORES[o].name}</b><button class="btn primary mini" data-d="${k}">Put it in · +25 🪙</button></div>`;
      return cell(k,0,"");}).join("");
    const trophies=BOSSES.map(b=>`<div class="mcase trophy${m.bosses[b.id]?" on":""}"><div class="q">${m.bosses[b.id]?"🏆":"🔒"}</div><b>${m.bosses[b.id]?b.name:"???"}</b></div>`).join("");
    const nf=all.filter(o=>m.found[o]).length,ns=all.filter(o=>m.museum[o+20]).length,nb=BOSSES.filter(b=>m.bosses[b.id]).length;
    openPanel(`<h2>🏛️ Gem museum</h2><p class="sub">Gems found: ${nf} of 9 · Shiny gems: ${ns} of 9 · Bosses beaten: ${nb} of 5</p>
      <div class="mlabel">Gems</div><div class="mcases">${normal}</div>
      <div class="mlabel">Shiny gems ✨ — about one gem in forty sparkles!</div><div class="mcases">${shiny}</div>
      <div class="mlabel">Boss trophies</div><div class="mcases">${trophies}</div>
      <div class="mrow"><button class="btn primary" id="mClose">Done</button></div>`);
    card().querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{const k=b.dataset.d;m.bag[k]--;if(m.bag[k]<=0)delete m.bag[k];
      m.museum[k]=1;m.coins+=25;Sound.sfx.win();save();openMuseum();hud();});
    if(nf===9&&!m.museumBonus){m.museumBonus=1;m.coins+=100;save();setTimeout(()=>toastIn("You found every gem! +100 🪙"),300);}
    card().querySelector("#mClose").onclick=closePanel;
  }

  // ---------- workbench ----------
  let bench={},benchHint=false;
  function openBench(){
    openPanel(`<div class="mtabs"><button class="mtab" id="mTabUp">⛏️ Upgrades</button><button class="mtab on">🔨 Workbench</button></div>
      <h2>🔨 Workbench</h2><p class="sub">Read a recipe card, then put the right things on the bench.</p>
      <div class="mrecipes">${RECIPES.map((r,i)=>`<button class="mrecipe" data-i="${i}"><div class="ic">${r.ic}</div><div class="tx"><b>${r.name}</b><span>${r.text}</span></div></button>`).join("")}</div>
      <div class="mrow"><button class="btn primary" id="mClose">Done</button></div>`);
    card().querySelector("#mTabUp").onclick=()=>openSmith();
    card().querySelectorAll(".mrecipe").forEach(b=>b.onclick=()=>openRecipe(+b.dataset.i));
    card().querySelector("#mClose").onclick=closePanel;
  }
  function openRecipe(i,keep){
    const r=RECIPES[i],m=M();if(!keep){bench={};benchHint=false;}
    openPanel(`<h2>${r.ic} ${r.name}</h2><div class="mcardtext">${r.text.split(" ").map(w=>`<span>${w}</span>`).join(" ")}</div>
      <button class="btn soft mini" id="mHear" style="${benchHint?"":"display:none"}">🔊 Hear it</button>
      ${benchHint?`<div class="mneed">${Object.entries(r.need).map(([k,n])=>`<span><img src="${oreIcon(+k)}" alt="">×${n}</span>`).join("")}</div>`:""}
      <div class="mlabel">On the bench:</div><div class="mtray" id="mTray"></div>
      <div class="mlabel">Your backpack — tap to put on the bench:</div><div class="mbagrow" id="mBagRow"></div>
      <div class="mrow"><button class="btn soft" id="mBackB">‹ Recipes</button><button class="btn primary" id="mMake">Make it! 🔨</button></div>`);
    const draw=()=>{
      const bag=card().querySelector("#mBagRow"),tr=card().querySelector("#mTray");
      bag.innerHTML=Object.entries(m.bag).filter(([k,n])=>+k<20&&n-(bench[k]||0)>0).map(([k,n])=>`<button class="mitem" data-o="${k}"><img src="${oreIcon(+k)}" alt=""><b>${OI(k).name}</b><i>×${n-(bench[k]||0)}</i></button>`).join("")||`<span class="sub">Empty — go dig!</span>`;
      tr.innerHTML=Object.entries(bench).filter(([,n])=>n>0).map(([k,n])=>`<button class="mitem on" data-o="${k}"><img src="${oreIcon(+k)}" alt=""><b>${OI(k).name}</b><i>×${n}</i></button>`).join("")||`<span class="sub">Nothing yet</span>`;
      bag.querySelectorAll(".mitem").forEach(b=>b.onclick=()=>{bench[b.dataset.o]=(bench[b.dataset.o]||0)+1;Sound.sfx.pop();draw();});
      tr.querySelectorAll(".mitem").forEach(b=>b.onclick=()=>{bench[b.dataset.o]--;if(!bench[b.dataset.o])delete bench[b.dataset.o];Sound.sfx.soft();draw();});
    };draw();
    card().querySelectorAll(".mcardtext span").forEach(s=>s.onclick=()=>{if(benchHint){const w=s.textContent.replace(/[.,?!]/g,"").toLowerCase();Sound.say("word:"+w,w,.85);}});
    card().querySelector("#mHear").onclick=()=>Sound.say("sent:"+r.text,r.text,.9);
    card().querySelector("#mBackB").onclick=()=>openBench();
    card().querySelector("#mMake").onclick=()=>{
      if(!Object.values(bench).some(n=>n>0)){Sound.sfx.nope();return;}
      if(exact(r.need)(bench)){Object.entries(bench).forEach(([k,n])=>{m.bag[k]-=n;if(m.bag[k]<=0)delete m.bag[k];});
        r.give(m);state.wordsRead++;m.crafted=(m.crafted||0)+1;Sound.sfx.win();try{confetti();}catch(e){}save();hud();
        openPanel(`<h2>${r.ic} You made ${r.name==="TNT"?"TNT":"a "+r.name.toLowerCase()}!</h2><p class="sub">${r.done}</p>
          <div class="mrow"><button class="btn soft" id="mBackB">‹ Recipes</button><button class="btn primary" id="mClose">Done</button></div>`);
        card().querySelector("#mBackB").onclick=()=>openBench();card().querySelector("#mClose").onclick=closePanel;
      }else{benchHint=true;bench={};Sound.sfx.nope();openRecipe(i,true);toastIn("That's not what the card says. Read it again!");}
    };
  }

  // ---------- TNT ----------
  function placeTnt(){
    const m=M();if(paused||tnt||!(m.items.tnt>0))return;
    m.items.tnt--;tnt={x:Math.floor(P.x+P.w/2),y:Math.floor(P.y+P.h-.001),t:time+2.4};save();hud();
    toast("3... 2... 1...",2200);[0,800,1600].forEach(d=>setTimeout(()=>Sound.sfx.soft(),d));
  }
  function explode(){
    const {x,y}=tnt,m=M();tnt=null;shakeT=time+.6;Sound.sfx.rumble();Sound.sfx.thud();setTimeout(()=>Sound.sfx.thud(),120);
    let stone=null;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){if(dx*dx+dy*dy>5)continue;const tx=x+dx,ty=y+dy;
      if(tx<1||tx>=MW-1||ty<SKY||ty>=MH)continue;const t=tileAt(tx,ty);
      if(t===T.AIR||t===T.BED||t===T.FOUND||t===T.SEAL||(t===T.GRASS&&tx<TOWN))continue;
      const i=idx(tx,ty),o=ore[i];tiles[i]=T.AIR;ore[i]=0;burst(tx,ty,t,5);m.dugCount=(m.dugCount||0)+1;
      if(o>=1&&o<=8){if(bagCount()<bagCap())collectOre(tx,ty,o);}else if(o===9&&!stone)stone=[tx,ty];else if(o===10)openChest(tx,ty);}
    for(let k=0;k<26;k++)parts.push({x:x+.5,y:y+.5,vx:(Math.random()-.5)*16,vy:-Math.random()*12,life:.8,col:k%2?"#FF8A3D":"#FFC83D",s:.2});
    float(x,y-1,"BOOM!","#FFC83D");P.vy=-6;markDug();hud();try{Quests.hit("dig",5);}catch(e){}
    if(stone)setTimeout(()=>wordStone(stone[0],stone[1]),700);
  }
