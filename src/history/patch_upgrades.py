import io, re
P = "/home/claude/work/wordcraft-valley.html"
s = io.open(P, encoding="utf-8").read()

def swap(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f"anchor found {n}x (want {count}) >>> {old[:100]}"
    s = s.replace(old, new)

# ============================================================ 1. constants
swap('''const season=()=>SEASONS.find(z=>z.months.includes(new Date().getMonth()+1))||SEASONS[0];''',
'''const season=()=>SEASONS.find(z=>z.months.includes(new Date().getMonth()+1))||SEASONS[0];

/* ---- levels ----
   Everything is one-of-a-kind in the valley. A second copy levels up the
   first instead (Level 1 -> ★ -> ★★ gold), so the valley stops filling up
   with duplicates and getting a repeat still feels like a win. */
const SEASON_BUILDINGS=SEASONS.map(z=>({id:z.plan.id,name:z.plan.name,gems:10,b:0,tip:z.plan.tip,season:z.id}));
const BUILD_OF=id=>BUILDINGS.find(b=>b.id===id)||SEASON_BUILDINGS.find(b=>b.id===id);
const MAX_LV=3, OUT_ANIMALS=8, OUT_VEHICLES=6;
const LV_COOL=[1,1,.6,.35], LV_PAY=[1,1,1.7,2.6];   // timers shorten, payouts grow
const upCost=(base,lv)=>Math.round(base*(lv===1?1.5:2.5));
const STARS=lv=>lv>=3?"★★":lv===2?"★":"";
const LV_NAME=lv=>lv>=3?"gold ★★":lv===2?"level ★":"level 1";
const UPTIP={well:"Fills faster and pays more",windmill:"Grinds faster and pays more",pumpkinpatch:"A bigger harvest",
  garage:"New vehicles sooner — rare ones at ★★",birdhouse:"Friends move in sooner",barn:"Friends come after fewer feeds",
  market:"Cheaper trades",cottage:"Bonus crates sooner",bell:"Vehicles come running too",launchpad:"Bigger launches"};''')

# ============================================================ 2. CSS
swap("/* daily chart */", r'''/* levels: a glow underneath, stars above, gold at the top level */
.aura{position:absolute;left:50%;bottom:-6%;width:125%;height:55%;transform:translateX(-50%);border-radius:50%;
  pointer-events:none;z-index:-1}
.lv2>.aura{background:radial-gradient(ellipse,rgba(150,205,255,.6),transparent 70%)}
.lv3>.aura{background:radial-gradient(ellipse,rgba(255,205,80,.8),transparent 70%);animation:auraPulse 2.4s ease-in-out infinite}
@keyframes auraPulse{0%,100%{opacity:.75;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.12)}}
.lvbadge{position:absolute;left:50%;top:-4%;transform:translate(-50%,-100%);pointer-events:none;white-space:nowrap;
  font-size:clamp(11px,1.7vw,16px);font-weight:900;color:#FFC53D;letter-spacing:-.04em;
  text-shadow:0 1px 0 #3B3024,1px 0 0 #3B3024,-1px 0 0 #3B3024,0 -1px 0 #3B3024}
.lv3>.lvbadge{animation:twinkle 1.6s ease-in-out infinite}
@keyframes twinkle{0%,100%{transform:translate(-50%,-100%) scale(1)}50%{transform:translate(-50%,-110%) scale(1.18)}}
.tile .deco{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.lvlup{position:fixed;left:50%;top:34%;transform:translate(-50%,-50%);z-index:88;pointer-events:none;text-align:center;
  animation:lvlup 2.2s cubic-bezier(.2,1.3,.4,1) forwards}
.lvlup b{display:block;font-size:64px;font-weight:900;color:#FFC53D;letter-spacing:.02em;
  text-shadow:0 4px 0 #3B3024,0 0 28px rgba(255,197,61,.9)}
.lvlup span{display:inline-block;margin-top:6px;padding:6px 14px;border-radius:14px;background:#3B3024;color:#FBF6EC;font-weight:800;font-size:18px}
@keyframes lvlup{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}
  25%,80%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-80%) scale(.95)}}
.card2 .status{font-size:12px;font-weight:800;margin:2px 0 6px}
.card2 .status.out{color:var(--meadow-deep)}.card2 .status.rest{color:var(--ink-soft)}
.card2 .stars{color:#E8A317;font-weight:900;font-size:15px;min-height:18px}
/* daily chart */''')

# ============================================================ 3. helpers
LEVELS = r'''
/* ================================================================
   LEVELS, UPGRADES AND WHO IS OUT
   ================================================================ */
let bLv=1;                                   // level of the building being used right now
const lvOfBuilding=id=>{const k=Object.keys(state.grid).find(k=>state.grid[k].id===id);
  return k?(state.grid[k].lv||1):((state.inventory[id]||{}).lv||1);};
const ownsBuilding=id=>Object.values(state.grid).some(t=>t.id===id)||((state.inventory[id]||{}).n>0);
function levelDeco(lv){
  if(lv<2)return "";
  const cols=["#F0628F","#FFC53D","#3F86D2","#5FB35B","#F2784B"];
  const flags=[16,28,40,52,64,76,88].map((x,i)=>{const t=(x-8)/84,y=8+2*t*(1-t)*12;
    return `<path d="M${x-4} ${y.toFixed(1)} L${x+4} ${y.toFixed(1)} L${x} ${(y+8).toFixed(1)}Z" fill="${cols[i%5]}" stroke="#3B3024" stroke-width="1.2"/>`;}).join("");
  const star=lv>=3?`<path d="M50 -14 L54 -4 L65 -4 L56 2 L60 13 L50 6 L40 13 L44 2 L35 -4 L46 -4Z" fill="#FFC53D" stroke="#3B3024" stroke-width="1.6"/>`:"";
  return `<svg class="deco" viewBox="0 0 100 100"><path d="M8 8 Q50 32 92 8" fill="none" stroke="#3B3024" stroke-width="1.4"/>${flags}${star}</svg>`;
}
function levelBits(el,lv){ // aura under, stars over
  el.classList.remove("lv2","lv3");
  el.querySelectorAll(":scope>.aura,:scope>.lvbadge").forEach(n=>n.remove());
  if(lv<2)return;
  el.classList.add("lv"+lv);
  el.insertAdjacentHTML("afterbegin",'<div class="aura"></div>');
  el.insertAdjacentHTML("beforeend",`<div class="lvbadge">${STARS(lv)}</div>`);
}
function upgradeTarget(u){
  if(u.kind==="building"){const b=BUILD_OF(u.id);if(!b||!ownsBuilding(u.id))return null;
    const lv=lvOfBuilding(u.id);return{name:b.name,lv,cost:upCost(b.gems||10,lv)};}
  const list=u.kind==="vehicle"?state.vehicles:state.critters, x=(list||[]).find(o=>o.id===u.id);if(!x)return null;
  const m=(u.kind==="vehicle"?VEH(u.id):CRIT(u.id))||{name:NAMES[u.id]||u.id,rar:1};
  const lv=x.lv||1;return{name:m.name,lv,cost:upCost(m.rar===3?24:m.rar===2?18:12,lv)};
}
function crowdNotice(x,kind){
  if(sess._restNoticed)return;sess._restNoticed=1;
  const nm=(NAMES[x.id]||x.id).toLowerCase();
  setTimeout(()=>{toast(`The ${nm} went home to rest. Tap it in the sticker book to bring it back.`);
    buddySay(`The ${nm} is taking a nap!`);},1600);
}
function enforceOut(kind,keep){
  const list=kind==="vehicle"?(state.vehicles||[]):state.critters, max=kind==="vehicle"?OUT_VEHICLES:OUT_ANIMALS;
  const out=list.filter(x=>x.out!==false&&x!==keep).sort((a,b)=>(a.since||0)-(b.since||0));
  let n=out.length+(keep&&keep.out!==false?1:0);
  while(n>max&&out.length){const o=out.shift();o.out=false;o._el=null;n--;crowdNotice(o,kind);}
}
function bringOut(kind,x){
  x.out=true;x.since=Date.now();enforceOut(kind,x);
  if(kind==="vehicle")renderVehicles();else renderCritters();
}
function spotOf(kind,id){
  if(kind==="building"){const k=Object.keys(state.grid).find(k=>state.grid[k].id===id);if(!k)return null;const{c,r}=cellOf(k);return geom(c,r);}
  const list=kind==="vehicle"?state.vehicles:state.critters,x=list.find(o=>o.id===id);return x?geom(x.c,x.r):null;
}
function applyLevel(kind,id,lv,celebrate){
  lv=Math.min(MAX_LV,lv);
  if(kind==="building"){
    const k=Object.keys(state.grid).find(k=>state.grid[k].id===id);
    if(k)state.grid[k].lv=lv;else if(state.inventory[id])state.inventory[id].lv=lv;
    renderWorld();
  }else{
    const list=kind==="vehicle"?state.vehicles:state.critters,x=list.find(o=>o.id===id);if(!x)return;
    x.lv=lv;if(x.out===false)bringOut(kind,x);else if(kind==="vehicle")renderVehicles();else renderCritters();
  }
  state.upgrades=(state.upgrades||0)+1;
  Quests.hit("upgrade");
  if(celebrate){
    const name=NAMES[id]||id, g=spotOf(kind,id);
    if(g){bringIntoView(g.x);setTimeout(()=>sparkleBurst(toView(g.x),g.y*100-4,18),450);}
    const d=document.createElement("div");d.className="lvlup";
    d.innerHTML=`<b>LEVEL UP!</b><span>${name} ${STARS(lv)}</span>`;document.body.appendChild(d);setTimeout(()=>d.remove(),2300);
    Sound.sfx.win();setTimeout(()=>Sound.sfx.chime(),300);confetti();shake();
    buddyCheer();buddySay(lv>=3?`The ${name.toLowerCase()} is gold!`:`The ${name.toLowerCase()} leveled up!`);
    setTimeout(()=>Sound.speak(lv>=3?`Gold ${name}!`:`Level up! ${name}!`,1),600);
  }
  checkBadges();save();
}
/* A repeat of something he already has: level it up, or pay out if it is maxed. */
function levelOrPay(kind,x){
  if((x.lv||1)<MAX_LV){applyLevel(kind,x.id,(x.lv||1)+1,true);return{up:true,lv:x.lv};}
  state.gems+=5;floater("+5 💎","#FFE9A8");renderHUD();return{max:true};
}
function arrival(c,res,text){
  const nm=c.name.toLowerCase();
  return res&&res.up?`Your ${nm} leveled up! ${STARS(res.lv)}`:res&&res.max?`Your ${nm} is already gold — +5 gems`:text;
}

/* Upgrading costs gems AND a bit of reading: build a word for ★, put a
   story in order for ★★ gold. Gems are only taken once it's read. */
let pendingUpgrade=null;
function startUpgrade(u){
  const t=upgradeTarget(u);if(!t||t.lv>=MAX_LV)return;
  if(state.gems<t.cost){toast(`You need ${t.cost} gems to upgrade the ${t.name.toLowerCase()}`);Sound.sfx.nope();return;}
  pendingUpgrade=u;
  document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));
  const tier=currentTier();
  if(t.lv===1){
    const pool=allWords().filter(w=>w.t<=tier&&w.p.length>=2&&w.p.length<=5);
    const w=pool[Math.floor(Math.random()*pool.length)];
    openWord({...w,bonus:true,upgrade:true},{rung:1});
    document.getElementById("readTitle").textContent=`Build it to upgrade the ${t.name.toLowerCase()}!`;
  }else{
    const pool=SIGNS.filter(x=>x.t<=tier);
    openScramble(pool[Math.floor(Math.random()*pool.length)]);
    document.getElementById("readTitle").textContent=`Put it in order to make the ${t.name.toLowerCase()} gold!`;
  }
  Sound.sfx.pop();
}
function finishUpgrade(){
  const u=pendingUpgrade;pendingUpgrade=null;if(!u)return false;
  const t=upgradeTarget(u);if(!t||t.lv>=MAX_LV)return false;
  if(state.gems<t.cost){toast(`Almost! You need ${t.cost} gems for that upgrade.`);return false;}
  state.gems-=t.cost;floater("-"+t.cost+" 💎","#FFD1D1");
  applyLevel(u.kind,u.id,t.lv+1,true);renderHUD();save();return true;
}
document.querySelector("#ovRead [data-close]").addEventListener("click",()=>{pendingUpgrade=null;});
'''
swap("/* ================================================================\n   8. BLUEPRINT SHOP + ALBUM",
     LEVELS + "\n/* ================================================================\n   8. BLUEPRINT SHOP + ALBUM")

# ============================================================ 4. shop
old_craft_start = s.index("function renderCraft(){")
old_craft_end = s.index("let albumTab=")
s = s[:old_craft_start] + r'''function renderCraft(){
  const g=document.getElementById("craftGrid");g.innerHTML="";
  const known=BUILDINGS.concat(SEASON_BUILDINGS).filter(b=>state.blueprints.includes(b.id));
  document.getElementById("craftSub").textContent = known.length
    ? "One of each building. Build it once, then upgrade it — each upgrade takes gems and a little reading."
    : "Read crates to find building plans. They will show up here.";
  if(!known.length){
    const next=lockedBuildings()[0];
    g.innerHTML=`<div class="card2 locked" style="grid-column:1/-1">
      <div class="art">${drawThing(next?next.id:"mystery",3)}</div>
      <div class="nm">Your first plan is close</div>
      <div class="cost">Open a crate to find it</div></div>`;
    return;
  }
  known.forEach(b=>{
    const owned=ownsBuilding(b.id), lv=owned?lvOfBuilding(b.id):0, inBag=(state.inventory[b.id]||{}).n>0;
    const cost=owned?upCost(b.gems||10,lv):b.gems, can=state.gems>=cost&&lv<MAX_LV;
    const d=document.createElement("div");d.className="card2"+(can||inBag?"":" locked");
    const what=!owned?b.tip:lv>=MAX_LV?"Fully upgraded!":`${UPTIP[b.id]||"Bigger and shinier"} · then ${lv===1?"build a word":"put a story in order"}`;
    d.innerHTML=`<div class="art">${drawThing(b.id,3)}</div><div class="nm">${b.name}${b.season?" "+season().ic:""}</div>
      <div class="stars">${owned?(lv>1?STARS(lv):"level 1"):""}</div>
      <div class="cost">${what}<br><b>${lv>=MAX_LV?"":cost+" gems"}</b></div>`;
    const btn=document.createElement("button");btn.className="btn primary mini";
    if(!owned){
      btn.textContent=can?"Build it":`${cost} gems`;btn.disabled=!can;
      btn.onclick=()=>{
        state.gems-=b.gems;state.inventory[b.id]={n:1,lv:1};state.selected=b.id;sess.built++;
        Quests.hit("build");Coach.reach("built");
        Sound.sfx.win();confetti();hide("ovCraft");
        toast(b.name+" is in your bag — tap a spot to place it");
        renderDock();renderHUD();save();
      };
    }else if(inBag){
      btn.textContent="Place it";
      btn.onclick=()=>{state.selected=b.id;hide("ovCraft");toast("Tap a spot to place the "+b.name.toLowerCase());renderDock();};
    }else if(lv<MAX_LV){
      btn.textContent=`Upgrade to ${STARS(lv+1)}`;btn.disabled=!can;
      btn.onclick=()=>startUpgrade({kind:"building",id:b.id});
    }else{btn.textContent="Gold ★★";btn.disabled=true;}
    d.appendChild(btn);g.appendChild(d);
    // a second button when an upgrade is also possible for something still in the bag
    if(owned&&inBag&&lv<MAX_LV){const b2=document.createElement("button");b2.className="btn soft mini";b2.style.marginTop="6px";
      b2.textContent=`Upgrade · ${cost} 💎`;b2.disabled=state.gems<cost;b2.onclick=()=>startUpgrade({kind:"building",id:b.id});d.appendChild(b2);}
  });
}
''' + s[old_craft_end:]

# ============================================================ 5. reading hooks
swap('''function openWord(w){
  cur=w;usedEar=false;misses=0;
  const rung=rungOf(w.w), R=RUNGS[rung];''',
'''function openWord(w,opt){
  cur=w;usedEar=false;misses=0;
  const rung=(opt&&opt.rung!=null)?opt.rung:rungOf(w.w), R=RUNGS[rung];''')
swap('''  hide("ovRead");giveReward();
  if(stageIdx()!==before){''',
'''  hide("ovRead");
  if(pendingUpgrade&&cur.upgrade)finishUpgrade();else giveReward();
  if(stageIdx()!==before){''')
swap('''  hide("ovRead");giveReward();renderHUD();save();
}''','''  hide("ovRead");
  if(pendingUpgrade)finishUpgrade();else giveReward();
  renderHUD();save();
}''')

# ============================================================ 6. buildings: render + move
swap('''        const el=document.createElement("div");el.className="tile";el.dataset.k=key;
        const f=atmos(g);''','''        const tl=t.lv||1, tsz=size*(1+.12*(tl-1));
        const el=document.createElement("div");el.className="tile";el.dataset.k=key;
        const f=atmos(g);''')
swap('''        el.style.cssText=`left:${g.x}px;top:${g.y*100}%;width:${size}px;height:${size}px;
          transform:translate(-50%,-100%);z-index:${g.z};filter:${f}`;''',
'''        el.style.cssText=`left:${g.x}px;top:${g.y*100}%;width:${tsz}px;height:${tsz}px;
          transform:translate(-50%,-100%);z-index:${g.z};filter:${f}`;''')
swap('''        inner.innerHTML=drawThing(t.id,t.seed);
        el.appendChild(inner);tilesEl.appendChild(el);''',
'''        inner.innerHTML=drawThing(t.id,t.seed);
        el.appendChild(inner);
        if(tl>1){el.insertAdjacentHTML("beforeend",levelDeco(tl));levelBits(el,tl);}
        tilesEl.appendChild(el);''')
swap('''    addItem(cell.id,1);delete state.grid[key];''',
'''    state.inventory[cell.id]={n:1,lv:cell.lv||1};delete state.grid[key];''')
swap('''  if(there)addItem(there.id,1);
  state.grid[key]={id:state.selected,seed:Math.floor(Math.random()*9999)};''',
'''  if(there)state.inventory[there.id]={n:1,lv:there.lv||1};
  state.grid[key]={id:state.selected,seed:Math.floor(Math.random()*9999),lv:sel.lv||1};''')

# ============================================================ 7. scenery: sparser, clear of buildings
swap('''    const n=4+Math.floor(rnd()*4);
    for(let i=0;i<n;i++){
      const col=rnd()*(COLS-1), g=geom(col,r);
      const off=(rnd()-.5)*.03*viewW();
      const id=d[Math.floor(rnd()*d.length)], size=base*g.scale*(.55+rnd()*.3);''',
'''    const n=2+Math.floor(rnd()*3);
    for(let i=0;i<n;i++){
      const col=rnd()*(COLS-1), g=geom(col,r);
      const off=(rnd()-.5)*.03*viewW();
      const id=d[Math.floor(rnd()*d.length)], size=base*g.scale*(.55+rnd()*.3);
      // keep scenery out from under buildings so they stay readable
      const c0=Math.round(col);
      if([c0-1,c0,c0+1].some(cc=>state.grid[cc+","+r]||state.grid[cc+","+(r+1)]))continue;''')

# ============================================================ 8. animals: one of each, levels, who's out
swap('''  state.critters.forEach(cr=>{
    if(cr.r<firstRow)cr.r=firstRow;
    const g=geom(cr.c,cr.r), size=base*g.scale*.8;''',
'''  state.critters.forEach(cr=>{
    if(cr.out===false){cr._el=null;return;}
    if(cr.r<firstRow)cr.r=firstRow;
    const g=geom(cr.c,cr.r), size=base*g.scale*critScale(cr);''')
swap('''    el.appendChild(dust);el.appendChild(body);el.appendChild(shout);
    tilesEl.appendChild(el);cr._el=el;''',
'''    el.appendChild(dust);el.appendChild(body);el.appendChild(shout);
    levelBits(el,cr.lv||1);
    tilesEl.appendChild(el);cr._el=el;''')
swap('''  const g=geom(cr.c,cr.r),size=baseSize()*g.scale*.8;
  el.classList.toggle("face-r",cr.face==="r");''',
'''  const g=geom(cr.c,cr.r),size=baseSize()*g.scale*critScale(cr);
  el.classList.toggle("face-r",cr.face==="r");''')
swap('''function moveCritter(cr,dc,dr,fast=false){''',
'''const critScale=cr=>.8*(1+.12*((cr.lv||1)-1));
function moveCritter(cr,dc,dr,fast=false){''')
swap('''  state.critters.forEach(o=>{const m=CRIT(o.id);if(!m||o===cr||m.kind!==kind)return;''',
'''  state.critters.forEach(o=>{const m=CRIT(o.id);if(!m||o===cr||o.out===false||m.kind!==kind)return;''')
swap('''  state.critters.forEach(cr=>{
    const m=CRIT(cr.id)||{kind:"prey"};''',
'''  state.critters.forEach(cr=>{
    if(cr.out===false)return;
    const m=CRIT(cr.id)||{kind:"prey"};''')
swap('''  if(CRITTERS.some(c=>c.id===id)||packCreatures.some(c=>c.id===id)){
    const pc=packCreatures.find(c=>c.id===id);
    state.critters.push({id,img:pc?pc._img:null,seed:Math.floor(Math.random()*9999),
      c:Math.floor(Math.random()*COLS),r:ROWS_MAX-1-Math.floor(Math.random()*state.rows)});
    renderCritters();return;
  }''',
'''  if(CRITTERS.some(c=>c.id===id)||packCreatures.some(c=>c.id===id)){
    const have=state.critters.find(c=>c.id===id);
    if(have)return levelOrPay("animal",have);
    const pc=packCreatures.find(c=>c.id===id);
    const cr={id,img:pc?pc._img:null,seed:Math.floor(Math.random()*9999),lv:1,out:true,since:Date.now(),
      c:Math.floor(Math.random()*COLS),r:ROWS_MAX-1-Math.floor(Math.random()*state.rows)};
    state.critters.push(cr);enforceOut("animal",cr);
    renderCritters();return{new:true};
  }''')
swap('''    state.critters.push({id:match.id,img:match._img,seed:1,c:Math.floor(Math.random()*COLS),r:ROWS_MAX-1});
    renderCritters();''',
'''    const pcr={id:match.id,img:match._img,seed:1,lv:1,out:true,since:Date.now(),c:Math.floor(Math.random()*COLS),r:ROWS_MAX-1};
    state.critters.push(pcr);enforceOut("animal",pcr);
    renderCritters();''')

# arrival messages that now say "leveled up" when it was a repeat
swap('''      const p=randomCritter();
      addItem(p.id);art=drawThing(p.id,7);name=p.name;
      sub=`A ${p.name.toLowerCase()} joins your valley`;''',
'''      const p=randomCritter();
      const res=addItem(p.id);art=drawThing(p.id,7);name=p.name+(res&&res.up?" "+STARS((res.lv||1)):"");
      sub=arrival(p,res,`A ${p.name.toLowerCase()} joins your valley`);''')
swap('''      const c=randomCritter();addItem(c.id);
      hearts(key,4);Sound.sfx.win();toast("A "+c.name.toLowerCase()+" moved in!");''',
'''      const c=randomCritter();const res=addItem(c.id);
      hearts(key,4);Sound.sfx.win();toast(arrival(c,res,"A "+c.name.toLowerCase()+" moved in!"));''')
swap('''        addItem(c.id);toast("A "+c.name.toLowerCase()+" came for a swim!");Sound.sfx.win();''',
'''        const res=addItem(c.id);toast(arrival(c,res,"A "+c.name.toLowerCase()+" came for a swim!"));Sound.sfx.win();''')
swap('''      if(state.fed%3===0&&state.critters.length<16){
        const c=randomCritter();addItem(c.id);
        toast("The animals brought a friend — a "+c.name.toLowerCase()+"!");Sound.sfx.win();
      }else toast("Everyone is fed ("+(3-state.fed%3)+" more to bring a friend)");''',
'''      const every=[0,3,2,1][bLv]||3;
      if(state.fed%every===0){
        const c=randomCritter();const res=addItem(c.id);
        toast(arrival(c,res,"The animals brought a friend — a "+c.name.toLowerCase()+"!"));Sound.sfx.win();
      }else toast("Everyone is fed ("+(every-state.fed%every)+" more to bring a friend)");''')
swap('''      if(state.gems<15){toast("The stall wants 15 gems");Sound.sfx.nope();break;}
      state.gems-=15;
      if(Math.random()<.5){const pv=pickVehicle();
        if(pv&&addVehicle(pv.id,true)){floater("-15 💎","#FFD1D1");hearts(key,4);Sound.sfx.win();
          toast("You traded for a "+pv.name.toLowerCase()+"!");renderHUD();save();break;}}
      const c=randomCritter();addItem(c.id);
      floater("-15 💎","#FFD1D1");hearts(key,4);Sound.sfx.win();
      toast("You traded for a "+c.name.toLowerCase()+"!");renderHUD();save();break;}''',
'''      const price=[0,15,12,9][bLv]||15;
      if(state.gems<price){toast("The stall wants "+price+" gems");Sound.sfx.nope();break;}
      state.gems-=price;
      if(Math.random()<.5){const pv=pickVehicle();const v=pv&&addVehicle(pv.id,true);
        if(v){floater("-"+price+" 💎","#FFD1D1");hearts(key,4);Sound.sfx.win();
          toast(arrival(pv,v._up?{up:1,lv:v.lv}:v._max?{max:1}:null,"You traded for a "+pv.name.toLowerCase()+"!"));renderHUD();save();break;}}
      const c=randomCritter();const res=addItem(c.id);
      floater("-"+price+" 💎","#FFD1D1");hearts(key,4);Sound.sfx.win();
      toast(arrival(c,res,"You traded for a "+c.name.toLowerCase()+"!"));renderHUD();save();break;}''')
swap('''if(birds.length&&Math.random()<.4&&state.critters.length<16){const c=birds[Math.floor(Math.random()*birds.length)];addItem(c.id);toast("A "+c.name.toLowerCase()+" came to nest!");}''',
'''if(birds.length&&Math.random()<.4){const c=birds[Math.floor(Math.random()*birds.length)];const res=addItem(c.id);toast(arrival(c,res,"A "+c.name.toLowerCase()+" came to nest!"));}''')
swap('''    else{const c=randomCritter();addItem(c.id);msg=`20 gems and a ${c.name.toLowerCase()}!`;}''',
'''    else{const c=randomCritter();const res=addItem(c.id);msg=res&&res.up?`20 gems, and your ${c.name.toLowerCase()} leveled up!`:`20 gems and a ${c.name.toLowerCase()}!`;}''')
swap('''  if(!state.wordsRead&&!state.critters.length){
    // scenery is procedural now, so the only thing to seed is a friend
    state.critters.push({id:"fox",seed:5,c:5,r:ROWS_MAX-1});''',
'''  if(!state.wordsRead&&!state.critters.length){
    // scenery is procedural now, so the only thing to seed is a friend
    state.critters.push({id:"fox",seed:5,c:5,r:ROWS_MAX-1,lv:1,out:true,since:Date.now()});''')

# ============================================================ 9. buildings: level effects
swap('''function ready(id,ms){
  const last=(state.timers||{})[id]||0;
  return Date.now()-last>=ms;
}''','''function ready(id,ms){
  const last=(state.timers||{})[id]||0;
  return Date.now()-last>=ms*(LV_COOL[bLv]||1);
}''')
swap('''function payout(key,amount,label){
  const p=atPct(key);
  state.gems+=amount;''','''function payout(key,amount,label){
  const p=atPct(key);
  amount=Math.round(amount*(LV_PAY[bLv]||1));
  state.gems+=amount;''')
swap('''function useBuilding(key,id){
  const p=atPct(key);''','''function useBuilding(key,id){
  const p=atPct(key);
  bLv=(state.grid[key]||{}).lv||1;''')
swap('''      gatherAt(key,1);shake();Sound.sfx.chime();
      setTimeout(()=>Sound.sfx.chime(),260);
      toast("Ding dong! Everybody come!");break;}''',
'''      gatherAt(key,1);shake();Sound.sfx.chime();
      setTimeout(()=>Sound.sfx.chime(),260);
      if(bLv>=2){const{c}=cellOf(key);(state.vehicles||[]).filter(v=>v.out!==false&&!v.busy)
        .forEach((v,i)=>setTimeout(()=>driveVehicle(v,(c+(i%2?2+(i>>1):-2-(i>>1)))-v.c,0,.22),i*120));}
      toast(bLv>=2?"Ding dong! Everyone and everything come!":"Ding dong! Everybody come!");break;}''')
swap('''      const pick=pickVehicle();if(!pick){toast("The garage is empty for now");break;}''',
'''      const pick=pickVehicle(bLv>=3?2:1);if(!pick){toast("The garage is empty for now");break;}''')

# ============================================================ 10. vehicles: one of each, levels, who's out
swap('''function vehSize(v){const m=VEH(v.id)||{};return (m.size||.9)*.85;}''',
'''function vehSize(v){const m=VEH(v.id)||{};return (m.size||.9)*.85*(1+.1*((v.lv||1)-1));}''')
swap('''  (state.vehicles||[]).forEach(v=>{
    const m=VEH(v.id);if(!m)return;
    if(v.r<firstRow)v.r=firstRow;''','''  (state.vehicles||[]).forEach(v=>{
    const m=VEH(v.id);if(!m)return;
    if(v.out===false){v._el=null;return;}
    if(v.r<firstRow)v.r=firstRow;''')
swap('''    el.querySelector(".hop").style.animationDelay=(hashStr(v.u)%900)/1000+"s";
    tilesEl.appendChild(el);v._el=el;placeVehicle(v,0);''',
'''    el.querySelector(".hop").style.animationDelay=(hashStr(v.u)%900)/1000+"s";
    levelBits(el,v.lv||1);
    tilesEl.appendChild(el);v._el=el;placeVehicle(v,0);''')
swap('''function addVehicle(id,announce,at){
  state.vehicles=state.vehicles||[];
  if(state.vehicles.length>=30)return null;
  const firstRow=ROWS_MAX-state.rows, m=VEH(id);''',
'''function addVehicle(id,announce,at){
  state.vehicles=state.vehicles||[];
  const have=state.vehicles.find(v=>v.id===id);
  if(have){ // a repeat levels up the one he has
    const res=levelOrPay("vehicle",have);have._up=!!res.up;have._max=!!res.max;return have;}
  const firstRow=ROWS_MAX-state.rows, m=VEH(id);''')
swap('''    face:Math.random()<.5?"l":"r",alt:m&&m.move==="air"?.16+Math.random()*.12:0};
  if(v.r<firstRow)v.r=firstRow;
  state.vehicles.push(v);renderVehicles();save();''',
'''    face:Math.random()<.5?"l":"r",alt:m&&m.move==="air"?.16+Math.random()*.12:0,lv:1,out:true,since:Date.now()};
  if(v.r<firstRow)v.r=firstRow;
  state.vehicles.push(v);enforceOut("vehicle",v);renderVehicles();save();''')
swap('''function pickVehicle(){
  const pool=VEHICLES.filter(v=>v.b<=state.biome);''',
'''function pickVehicle(minRar){
  const pool=VEHICLES.filter(v=>v.b<=state.biome&&v.rar>=(minRar||1));''')
swap('''  const secs=Math.min(3.2,cells*(perCell||.34));
  placeVehicle(v,secs);''',
'''  const secs=Math.min(3.2,cells*(perCell||.34)/(1+.3*((v.lv||1)-1)));   // upgraded ones are quicker
  placeVehicle(v,secs);
  if((v.lv||1)>=3)for(let i=0;i<3;i++)setTimeout(()=>{if(!v._el)return;const a=vehAnchor(v);
    puffAt(a.rear,a.top-3,"rgba(255,214,90,.95)",2,{dy:-8,size:7,d:.6});},i*secs*300);''')
swap('''    if(v.busy)return;const m=VEH(v.id);if(!m)return;const roll=Math.random();''',
'''    if(v.busy||v.out===false)return;const m=VEH(v.id);if(!m)return;const roll=Math.random();''')
swap('''  }else if(state.wordsRead>1&&VEH_WORD[cur.w]&&!hasVeh(VEH_WORD[cur.w])){''',
'''  }else if(state.wordsRead>1&&!cur.upgrade&&VEH_WORD[cur.w]&&!hasVeh(VEH_WORD[cur.w])){''')
swap('''    const pv=Math.random()<.4?pickVehicle():null;
    if(pv&&addVehicle(pv.id,true)){
      Quests.hit("newveh");art=drawThing(pv.id,1);name=pv.name;sub=`A ${pv.name.toLowerCase()} drove into your valley`;''',
'''    const pv=Math.random()<.4?pickVehicle():null;const nv=pv&&addVehicle(pv.id,true);
    if(nv){
      if(!nv._up&&!nv._max)Quests.hit("newveh");art=drawThing(pv.id,1);name=pv.name+(nv._up?" "+STARS(nv.lv):"");
      sub=arrival(pv,nv._up?{up:1,lv:nv.lv}:nv._max?{max:1}:null,`A ${pv.name.toLowerCase()} drove into your valley`);''')
swap('''      const v=addVehicle(pick.id,true,{c,r});
      if(v){setTimeout(()=>driveVehicle(v,c<COLS/2?3:-3,0,.35),200);
        toast(`A ${pick.name.toLowerCase()} rolled out of the garage!`);buddySay(`A ${pick.name.toLowerCase()}!`);Quests.hit("newveh");''',
'''      const v=addVehicle(pick.id,true,{c,r});
      if(v){if(v.out!==false)setTimeout(()=>driveVehicle(v,c<COLS/2?3:-3,0,.35),200);
        if(v._up||v._max)toast(arrival(pick,v._up?{up:1,lv:v.lv}:{max:1},""));
        else{toast(`A ${pick.name.toLowerCase()} rolled out of the garage!`);buddySay(`A ${pick.name.toLowerCase()}!`);Quests.hit("newveh");}''')
swap('''      const rk=(state.vehicles||[]).find(v=>v.id==="v_rocket");''',
'''      const rk=(state.vehicles||[]).find(v=>v.id==="v_rocket");
      if(rk&&rk.out===false)bringOut("vehicle",rk);''')

# ============================================================ 11. album: level up + bring out
old_an = s.index('''  const found=new Set(state.critters.map(c=>c.id));
  const list=CRITTERS.concat(packCreatures.map(c=>({id:c.id,name:c.name,img:c._img})));''')
old_an_end = s.index("}\n", s.index("of ${BUILDINGS.length} plans discovered.`;", old_an)) + 2
s = s[:old_an] + r'''  renderRoster(g,"animal");
}
/* Animals and Garage tabs: stars, who is out, bring one out, level one up. */
function renderRoster(g,kind){
  const isV=kind==="vehicle";
  const mine=isV?(state.vehicles||[]):state.critters;
  const list=isV?VEHICLES:CRITTERS.concat(packCreatures.map(c=>({id:c.id,name:c.name,img:c._img,rar:1})));
  const outN=mine.filter(x=>x.out!==false).length, max=isV?OUT_VEHICLES:OUT_ANIMALS;
  list.forEach(m=>{
    const x=mine.find(o=>o.id===m.id), got=!!x, lv=got?(x.lv||1):0;
    const d=document.createElement("div");d.className="card2"+(got?"":" locked");
    const word=isV?Object.keys(VEH_WORD).find(k=>VEH_WORD[k]===m.id):null;
    const rar=m.rar===3?"🌟 legendary":m.rar===2?"✦ rare":"";
    d.innerHTML=`<div class="art">${m.img?`<img src="${m.img}">`:drawThing(m.id,isV?1:7)}</div>
      <div class="nm">${got?m.name:"???"}</div><div class="stars">${got?(lv>1?STARS(lv):""):""}</div>
      ${got?`<div class="status ${x.out!==false?"out":"rest"}">${x.out!==false?"In the valley":"Resting — tap to bring out"}</div>`
        :`<div class="cost">${word?`read “${word}”`:(m.rar>=2?"rare find":rar)}</div>`}`;
    if(got){
      d.onclick=e=>{
        if(e.target.closest("button"))return;
        if(x.out===false){bringOut(kind,x);Sound.sfx.pop();toast(`${m.name} is back in the valley!`);renderAlbum();return;}
        hide("ovAlbum");const g2=geom(x.c,x.r);bringIntoView(g2.x);
        setTimeout(()=>{if(isV)useVehicle(x.u);else nameThatAnimal(x.id);},450);
      };
      if(lv<MAX_LV){const t=upgradeTarget({kind,id:m.id});
        const b=document.createElement("button");b.className="btn primary mini";
        b.textContent=`Level up · ${t.cost} 💎`;b.disabled=state.gems<t.cost;
        b.onclick=()=>startUpgrade({kind,id:m.id});d.appendChild(b);}
    }
    g.appendChild(d);
  });
  const have=mine.length;
  document.getElementById("albumSub").textContent=
    `${have} of ${list.length} ${isV?"vehicles":"animals"} · ${outN} of ${max} out in the valley at a time. `+
    (isV?"Read a vehicle's name to unlock it. ":"")+"A second one levels yours up.";
}
''' + s[old_an_end:]

gs = s.index('  if(albumTab==="garage"){')
ge = s.index("    return;\n  }", gs) + len("    return;\n  }")
s = s[:gs] + '  if(albumTab==="garage"){renderRoster(g,"vehicle");return;}' + s[ge:]

# ============================================================ 12. quests + badges
swap('''  {id:"newveh", ic:"🔑", t:"Get a new vehicle",         k:"newveh", n:1}''',
'''  {id:"newveh", ic:"🔑", t:"Get a new vehicle",         k:"newveh", n:1},
  {id:"upgrade",ic:"⬆️", t:"Upgrade something",         k:"upgrade",n:1}''')
swap('''  {id:"fleet",   ic:"🏁", n:"Whole fleet",       d:"Every vehicle in the valley.",          t:s=>VEHICLES.every(m=>(s.vehicles||[]).some(v=>v.id===m.id))}''',
'''  {id:"fleet",   ic:"🏁", n:"Whole fleet",       d:"Every vehicle in the valley.",          t:s=>VEHICLES.every(m=>(s.vehicles||[]).some(v=>v.id===m.id))},
  {id:"levelup", ic:"⬆️", n:"Level up!",         d:"Upgraded something for the first time.", t:s=>(s.upgrades||0)>=1},
  {id:"gold",    ic:"🥇", n:"Solid gold",        d:"Made something gold ★★.",               t:s=>goldCount(s)>=1},
  {id:"golden",  ic:"👑", n:"Golden valley",     d:"Five things made gold ★★.",             t:s=>goldCount(s)>=5}''')
swap('''const STAGES=[{at:0,name:"Sprout"}''',
'''const goldCount=st=>Object.values(st.grid||{}).filter(t=>(t.lv||1)>=3).length
  +Object.values(st.inventory||{}).filter(t=>(t.lv||1)>=3).length
  +(st.critters||[]).filter(c=>(c.lv||1)>=3).length+(st.vehicles||[]).filter(v=>(v.lv||1)>=3).length;
const STAGES=[{at:0,name:"Sprout"}''')

# ============================================================ 13. saves
swap('''(k,v)=>k==="_el"?undefined:v''','''(k,v)=>(k&&k[0]==="_")?undefined:v''', count=2)

# migration: seasonal builds are real buildings; doubles become levels
swap('''function migrate(){
  const isBuilding=id=>BUILDINGS.some(b=>b.id===id);''',
'''function migrate(){
  const isBuilding=id=>!!BUILD_OF(id);''')
swap('''  state.timers=state.timers||{};
  if(refund){''',
'''  state.timers=state.timers||{};
  // one of each: fold doubles into levels (anything past gold becomes gems)
  let merged=0;
  const seenB={};
  Object.keys(state.grid).forEach(k=>{const t=state.grid[k];
    if(seenB[t.id]){const keep=state.grid[seenB[t.id]];
      if((keep.lv||1)<MAX_LV)keep.lv=(keep.lv||1)+(t.lv||1);else refund+=Math.round((BUILD_OF(t.id).gems||10)/2);
      keep.lv=Math.min(MAX_LV,keep.lv);delete state.grid[k];merged++;}
    else seenB[t.id]=k;});
  Object.entries(state.inventory||{}).forEach(([id,it])=>{
    const n=it.n||0;if(!n)return;
    if(seenB[id]){const keep=state.grid[seenB[id]];const add=n;keep.lv=Math.min(MAX_LV,(keep.lv||1)+add);delete state.inventory[id];merged+=add;}
    else if(n>1){state.inventory[id]={n:1,lv:Math.min(MAX_LV,(it.lv||1)+n-1)};merged+=n-1;}
    else it.lv=it.lv||1;});
  const fold=(list)=>{const out=[],by={};
    (list||[]).forEach((x,i)=>{const k=by[x.id];
      if(k){k.lv=Math.min(MAX_LV,(k.lv||1)+(x.lv||1));merged++;}
      else{x.lv=x.lv||1;if(x.since==null)x.since=i;if(x.out==null)x.out=true;by[x.id]=x;out.push(x);}});
    return out;};
  state.critters=fold(state.critters);state.vehicles=fold(state.vehicles);
  const trim=(list,max)=>{const on=list.filter(x=>x.out!==false).sort((a,b)=>(a.since||0)-(b.since||0));
    while(on.length>max){on.shift().out=false;}};
  trim(state.critters,OUT_ANIMALS);trim(state.vehicles,OUT_VEHICLES);
  if(merged&&!state.tidied){state.tidied=true;
    setTimeout(()=>{toast("Tidied up! Doubles became upgrades ★ — extra animals and vehicles are resting in the sticker book.");
      buddySay("Look, some of our things leveled up!");},2400);}
  if(refund){''')

io.open(P, "w", encoding="utf-8").write(s)
print("upgrades patched; size", round(len(s)/1024), "KB")
