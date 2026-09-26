import io,re
P="/home/claude/work/mine.js"
s=io.open(P,encoding="utf-8").read()
def rep(a,b,n=1):
    global s
    c=s.count(a);assert c==n,(c,a[:90]);s=s.replace(a,b)

# ---------------- constants ----------------
rep("const MW=44, SKY=6, MDEPTH=120, MH=SKY+MDEPTH, TOWN=15, SPAWN_X=16.2;",
    "const MW=50, SKY=6, MDEPTH=120, MH=SKY+MDEPTH, TOWN=19, SPAWN_X=20.2;")
rep("const T={AIR:0,GRASS:1,DIRT:2,STONE:3,DEEP:4,HOT:5,CRYS:6,BED:7,LAVA:8,FOUND:9};",
    "const T={AIR:0,GRASS:1,DIRT:2,STONE:3,DEEP:4,HOT:5,CRYS:6,BED:7,LAVA:8,FOUND:9,SEAL:10};")
rep('''    {id:"knight",name:"Knight helmet",cost:120},{id:"crown",name:"Crown",cost:250},{id:"space",name:"Space helmet",cost:400}]};''',
'''    {id:"knight",name:"Knight helmet",cost:120},{id:"crown",name:"Crown",cost:250},{id:"space",name:"Space helmet",cost:400},
    {id:"crystal",name:"Crystal crown",cost:0,prize:1}]};
// shiny ores live in the bag at 20 + ore number, worth five times as much
const OI=k=>{k=+k;if(k>20){const O=ORES[k-20];return Object.assign({},O,{name:"shiny "+O.name,pl:"shiny "+O.pl,val:O.val*5,shiny:1});}return ORES[k];};
// a boss guards a magic seal at the bottom of each layer
const BOSSES=[
  {id:"beetle",name:"Giant Beetle",d:10,hp:3,art:"b_beetle",reward:60,gems:3,taunt:"Click clack! This dirt is MINE!"},
  {id:"golem",name:"Rock Golem",d:35,hp:4,art:"b_golem",reward:150,gems:5,taunt:"Rrrumble. No one gets past the Rock Golem."},
  {id:"troll",name:"Cave Troll",d:60,hp:5,art:"b_troll",reward:300,gems:8,taunt:"Ho ho! A tiny miner! Go home!"},
  {id:"worm",name:"Lava Worm",d:85,hp:6,art:"b_worm",reward:600,gems:12,taunt:"Ssssizzle. It is too hot for you down here."},
  {id:"dragon",name:"Crystal Dragon",d:114,hp:7,art:"dragon",filter:"hue-rotate(160deg) saturate(1.6) brightness(1.1)",reward:1200,gems:25,
   taunt:"ROAR! Only a true reader can reach the Crystal Core!"}];
const PERKS={sniff:{ic:"👃",t:"Sniffs out gems nearby"},glow:{ic:"💡",t:"Lights up the dark"},fire:{ic:"🔥",t:"Melts lava for you"},
  strong:{ic:"💪",t:"Helps you dig faster"},lucky:{ic:"🍀",t:"Finds shiny gems and extra coins"}};
const PERK_OF={dragon:"fire",lizard:"fire",scorpion:"fire",bat:"glow",hawk:"glow",eagle:"glow",parrot:"glow",
  dog:"sniff",fox:"sniff",pig:"sniff",raccoon:"sniff",wolf:"sniff",bear:"strong",gorilla:"strong",elephant:"strong",
  mammoth:"strong",rhino:"strong",trex:"strong",boar:"strong",bug:"strong",sauropod:"strong"};
const RECIPES=[
  {id:"tnt",name:"TNT",ic:"🧨",text:"Mix two coal rocks and a red gem to make TNT.",need:{1:2,3:1},give:m=>{m.items.tnt=(m.items.tnt||0)+1;},done:"TNT! Tap 🧨 in the mine to blast a big hole."},
  {id:"snack",name:"Pet snack",ic:"🦴",text:"Two tin rocks make a pet snack.",need:{2:2},give:m=>{m.items.snackUntil=Date.now()+10*60000;},done:"Your pet is super strong for ten minutes!"},
  {id:"charm",name:"Lucky charm",ic:"🍀",text:"A gold bar and a green gem make a lucky charm.",need:{4:1,6:1},give:m=>{m.items.charmUntil=Date.now()+15*60000;},done:"Lucky! Shiny gems are easier to find for fifteen minutes."},
  {id:"map",name:"Gem map",ic:"🗺️",text:"Put a magic gem with a blue gem to make a gem map.",need:{9:1,5:1},give:m=>{m.items.mapUntil=Date.now()+15*60000;},done:"The gem map shows gems hiding in the dark!"},
  {id:"crown",name:"Gem crown",ic:"👑",text:"Three gold bars and a star gem make a gem crown.",need:{4:3,8:1},give:m=>{m.owned.crown=1;},done:"A gem crown! Wear it from the clothes tent."}];
const COLOR={3:"red",5:"blue",6:"green",7:"pink"};
// lines the grown-up can record in the Voice Studio; the mine plays them in that voice
const MINE_LINES=["Thank you!","Wow, a shiny gem!","You beat the boss!","Oh no! Try again!","Here comes a big order!","Your egg hatched!"];''')

# ---------------- save data ----------------
rep('''      deepest:0,dugCount:0,orders:0,ordersRight:0,ordersWrong:0,layers:[],mineNo:1};
    return state.mine;''','''      deepest:0,dugCount:0,orders:0,ordersRight:0,ordersWrong:0,layers:[],mineNo:1,w:MW};
    const m=state.mine;
    if(m.w!==MW){m.w=MW;m.dug="";m.x=SPAWN_X;m.y=SKY-.95;}   // the world got wider: fresh tunnels, everything owned stays
    m.found=m.found||{};m.museum=m.museum||{};m.bosses=m.bosses||{};m.items=m.items||{};m.eggs=m.eggs||[];
    return m;''')

# ---------------- world: shifted start, magic seals ----------------
rep('''    [[16,2,1],[18,1,1],[17,3,2],[20,2,2],[19,4,9]].forEach(([x,d,o])=>{ore[idx(x,SKY+d)]=o;});
    // apply what has already been dug
    const dug=decode(m.dug);for(let i=0;i<dug.length;i++)if(dug[i])tiles[i]=T.AIR;''','''    [[20,2,1],[22,1,1],[21,3,2],[24,2,2],[23,4,9]].forEach(([x,d,o])=>{ore[idx(x,SKY+d)]=o;});
    // apply what has already been dug
    const dug=decode(m.dug);for(let i=0;i<dug.length;i++)if(dug[i])tiles[i]=T.AIR;
    // a magic seal across the whole mine under every boss not yet beaten
    BOSSES.forEach(b=>{if(m.bosses[b.id])return;const y=SKY+b.d;for(let x=1;x<MW-1;x++){tiles[idx(x,y)]=T.SEAL;ore[idx(x,y)]=0;}});''')
rep('''[T.FOUND]:["#9A9488","#8A8478","#A8A294"],[T.LAVA]:["#FF6A1A","#FF9A2E","#E24A12","#FFB84A"]};''',
    '''[T.FOUND]:["#9A9488","#8A8478","#A8A294"],[T.LAVA]:["#FF6A1A","#FF9A2E","#E24A12","#FFB84A"],
    [T.SEAL]:["#3B2A6E","#4A3A86","#2E2058","#43307A"]};''')
rep('''    for(const t of [T.DIRT,T.STONE,T.DEEP,T.HOT,T.CRYS,T.BED,T.FOUND,T.LAVA]){''','''    for(const t of [T.DIRT,T.STONE,T.DEEP,T.HOT,T.CRYS,T.BED,T.FOUND,T.LAVA,T.SEAL]){''')
rep('''        if(t===T.FOUND){''','''        if(t===T.SEAL){g.fillStyle="#C9A8FF";[[3,3],[11,4],[6,10],[12,12],[2,13]].forEach(([x,y])=>{g.fillRect(x,y,2,1);g.fillRect(x,y,1,2);});}
        if(t===T.FOUND){''')

# ---------------- shiny icons ----------------
rep('''  function oreIcon(o){
    if(iconCache[o])return iconCache[o];
    const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),O=ORES[o];''','''  function oreIcon(k){
    if(iconCache[k])return iconCache[k];
    const shiny=+k>20,o=shiny?k-20:+k;
    const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),O=ORES[o];
    if(shiny){const gr=g.createRadialGradient(32,32,4,32,32,32);gr.addColorStop(0,"rgba(255,240,150,.95)");gr.addColorStop(1,"rgba(255,240,150,0)");g.fillStyle=gr;g.fillRect(0,0,64,64);}''')
rep('''    return iconCache[o]=c.toDataURL();''','''    if(shiny){g.fillStyle="#FFFFFF";g.globalAlpha=1;[[50,10],[10,48],[54,50]].forEach(([x,y])=>{g.beginPath();g.moveTo(x,y-7);g.lineTo(x+2,y-2);g.lineTo(x+7,y);g.lineTo(x+2,y+2);g.lineTo(x,y+7);g.lineTo(x-2,y+2);g.lineTo(x-7,y);g.lineTo(x-2,y-2);g.closePath();g.fill();});}
    return iconCache[k]=c.toDataURL();''')

# ---------------- HUD ----------------
rep('''        <div class="mpill" id="mBag">🎒 0/10</div><div class="mpill" id="mDepth">⛏️ Surface</div><div class="mgap"></div><div class="mpill" id="mGems">💎 0</div></div>''',
'''        <div class="mpill" id="mBag">🎒 0/10</div><div class="mpill" id="mDepth">⛏️ Surface</div>
        <button class="mpill" id="mPet">🐾 Pet</button><button class="mpill" id="mTnt" style="display:none">🧨 0</button>
        <div class="mpill" id="mEgg" style="display:none">🥚</div><div class="mgap"></div><div class="mpill" id="mGems">💎 0</div></div>''')
rep('''    root.querySelector("#mBack").onclick=()=>exit();''','''    root.querySelector("#mBack").onclick=()=>exit();
    root.querySelector("#mPet").onclick=()=>{if(!paused)openPets();};
    root.querySelector("#mTnt").onclick=()=>placeTnt();''')
rep('''    root.querySelector("#mUp").style.display=d>2?"":"none";}''','''    root.querySelector("#mUp").style.display=d>2?"":"none";
    const pid=m.pet,pk=perk();root.querySelector("#mPet").textContent=pid?`${PERKS[pk].ic} ${NAMES[pid]||pid}`:"🐾 Pet";
    const tn=m.items.tnt||0,tb=root.querySelector("#mTnt");tb.style.display=tn?"":"none";tb.textContent="🧨 "+tn;
    const eg=root.querySelector("#mEgg");eg.style.display=m.eggs.length?"":"none";eg.textContent="🥚 "+m.eggs.length+" hatching tomorrow";}''')

# ---------------- enter: eggs hatch overnight, first pet hint ----------------
rep('''    if(!m.made)setTimeout(()=>openWardrobe(true),300);
    else toast("Dig down and find gems! Sell them at your shop.",3000);''','''    PET.x=P.x-1;PET.y=P.y;
    const ready=m.eggs.filter(e=>e.at<today());
    if(!m.made)setTimeout(()=>openWardrobe(true),300);
    else if(ready.length)setTimeout(()=>hatchEggs(),400);
    else if(!m.pet&&!m.petHint&&(state.critters||[]).length){m.petHint=1;toast("Tap 🐾 to bring a pet from your valley!",3500);}
    else toast("Dig down and find gems! Sell them at your shop.",3000);''')

# ---------------- digging: perks, seals ----------------
rep('''    if(!hard||(t===T.GRASS&&tx<TOWN)){if(time-msgT>2){msgT=time;toast("That can't be dug.");}return;}
    if(t===T.LAVA&&!m.boots){''','''    if(t===T.SEAL){if(time-msgT>2){msgT=time;toast("A magic seal! Beat the boss to break it.");}return;}
    if(!hard||(t===T.GRASS&&tx<TOWN)){if(time-msgT>2){msgT=time;toast("That can't be dug.");}return;}
    if(t===T.LAVA&&!m.boots&&perk()!=="fire"){''')
rep('''    const need=.18+.42*hard/pow;
    const before=P.digT;''','''    const need=digNeed(t);
    const before=P.digT;''')
rep('''need=.18+.42*(HARD[t]||1)/PICKS[M().pick].pow,k=Math.min(1,P.digT/need);''','''need=digNeed(t),k=Math.min(1,P.digT/need);''')
rep('''      else{m.bag[o]=(m.bag[o]||0)+1;float(tx,ty,"+1 "+ORES[o].name,ORES[o].hi);Sound.sfx.pop();if(o>=5)Sound.sfx.chime();}''',
'''      else collectOre(tx,ty,o);''')
rep('''    else if(o===10){const c=12+Math.floor(depthOf(ty)*1.4)+Math.floor(Math.random()*15);m.coins+=c;
      float(tx,ty,"+"+c+" 🪙","#FFE9A8");Sound.sfx.win();toast("A treasure chest! +"+c+" coins");}''','''    else if(o===10)openChest(tx,ty);''')

# ---------------- step: follow pet, boss trigger, TNT fuse ----------------
rep('''    // what can be used here on the surface''','''    // the pet follows, floating through rock like a friendly ghost
    const fly=m.pet&&(CRIT(m.pet)||{}).kind==="flyer";
    const tx=P.x+P.w/2-P.face*.95,ty=P.y+(fly?-.55:.05);
    PET.x+=(tx-PET.x)*Math.min(1,dt*5);PET.y+=(ty-PET.y)*Math.min(1,dt*5);
    // a boss waits above each magic seal
    const row=Math.floor(P.y+P.h-.001);
    for(let i=0;i<BOSSES.length;i++){const b=BOSSES[i];if(m.bosses[b.id])continue;const sr=SKY+b.d;
      if(row>=sr-2&&row<sr&&time>bossCool){startBoss(i);break;}}
    if(tnt&&time>=tnt.t)explode();
    // what can be used here on the surface''')

# ---------------- town: museum, moved mine sign ----------------
rep('''    {id:"ward",x0:11.5,x1:14.3,label:"👕 Change clothes",go:()=>openWardrobe(false)}];''','''    {id:"ward",x0:11.5,x1:14.3,label:"👕 Change clothes",go:()=>openWardrobe(false)},
    {id:"museum",x0:14.6,x1:18.3,label:"🏛️ Gem museum",go:()=>openMuseum()}];''')
rep('''    x=15.4*TS;g.fillStyle="#9C6B3C";g.fillRect(x-.06*TS,gy-1.6*TS,.12*TS,1.6*TS);sign(x,gy-1.5*TS,1.7*TS,"MINE ⬇","#FFFBEF");''',
'''    // museum
    x=14.8*TS;g.fillStyle="#E8E2D4";g.fillRect(x,gy-.3*TS,3.3*TS,.3*TS);g.strokeRect(x,gy-.3*TS,3.3*TS,.3*TS);
    for(let k=0;k<4;k++){g.fillStyle="#F4EFE4";g.fillRect(x+(.25+k*.8)*TS,gy-2.1*TS,.4*TS,1.8*TS);g.strokeRect(x+(.25+k*.8)*TS,gy-2.1*TS,.4*TS,1.8*TS);}
    g.fillStyle="#E8E2D4";g.fillRect(x-.1*TS,gy-2.4*TS,3.5*TS,.3*TS);g.strokeRect(x-.1*TS,gy-2.4*TS,3.5*TS,.3*TS);
    g.beginPath();g.moveTo(x-.2*TS,gy-2.4*TS);g.lineTo(x+1.65*TS,gy-3.2*TS);g.lineTo(x+3.5*TS,gy-2.4*TS);g.closePath();g.fill();g.stroke();
    const found=Object.keys(M().found).filter(k=>+k<20).length;
    for(let k=0;k<3;k++){const o=[3,5,6][k];g.fillStyle=M().found[o]?ORES[o].col:"#BDB6A8";g.beginPath();g.arc(x+(.85+k*.8)*TS,gy-1.2*TS,.13*TS,0,Math.PI*2);g.fill();g.stroke();}
    sign(x+1.65*TS,gy-3.45*TS,2.6*TS,"MUSEUM","#E8E2D4");
    // mine sign
    x=19.4*TS;g.fillStyle="#9C6B3C";g.fillRect(x-.06*TS,gy-1.6*TS,.12*TS,1.6*TS);sign(x,gy-1.5*TS,1.7*TS,"MINE ⬇","#FFFBEF");''')

# ---------------- render: bosses in view, TNT, pet, gem radar, glow ----------------
rep('''    // the miner
    const m=M();drawMiner(''','''    // a boss sits on its seal, waiting
    const m=M();
    for(const b of BOSSES){if(m.bosses[b.id])continue;const sr=SKY+b.d;if(Math.abs(sr-P.y)>14)continue;
      const im=artImg(b.art);if(im.complete&&im.naturalWidth){const bx=Math.max(TOWN+1,Math.min(MW-3,Math.floor(P.x)+2)),s=TS*2.1;
        g.save();g.translate(bx*TS+TS/2,sr*TS-s/2+Math.sin(time*2)*TS*.05);if(P.x<bx)g.scale(-1,1);g.drawImage(im,-s/2,-s/2,s,s);g.restore();}}
    // TNT with its fuse
    if(tnt){const px=tnt.x*TS,py=tnt.y*TS;g.fillStyle="#E0344B";g.fillRect(px+TS*.12,py+TS*.2,TS*.76,TS*.8);g.strokeStyle="#2E2620";g.lineWidth=3;g.strokeRect(px+TS*.12,py+TS*.2,TS*.76,TS*.8);
      g.fillStyle="#FFFBEF";g.font=`900 ${Math.round(TS*.28)}px system-ui,sans-serif`;g.textAlign="center";g.textBaseline="middle";g.fillText("TNT",px+TS/2,py+TS*.62);
      g.fillStyle="#FFC83D";g.beginPath();g.arc(px+TS/2,py+TS*.12,TS*.12*(1+.3*Math.sin(time*20)),0,Math.PI*2);g.fill();}
    // the pet
    if(m.pet){const im=artImg(m.pet),s=TS*.85,bob=Math.sin(time*6)*TS*.05-(time-PET.hop<.4?Math.sin((time-PET.hop)/.4*Math.PI)*TS*.4:0);
      if(im.complete&&im.naturalWidth){g.save();g.translate(PET.x*TS,(PET.y+1)*TS-s/2+bob);if(P.face>0)g.scale(-1,1);g.drawImage(im,-s/2,-s/2,s,s);g.restore();}}
    drawMiner(''')
rep('''R=LAMPS[m.lamp].r*TS;''','''R=(LAMPS[m.lamp].r+(perk()==="glow"?(snackOn()?3.4:2.2):0))*TS;''')
rep('''    // floating words stay readable above the dark''','''    // the gem radar: a sniffing pet or a gem map shows gems hiding in the dark
    const rad=(perk()==="sniff"?(snackOn()?8:5):0)||(m.items.mapUntil>Date.now()?8:0);
    if(rad){const cx=Math.floor(P.x+P.w/2),cy=Math.floor(P.y+.5);
      for(let y=cy-rad;y<=cy+rad;y++)for(let x=cx-rad;x<=cx+rad;x++){if(x<1||x>=MW-1||y<SKY||y>=MH)continue;const o=ore[idx(x,y)];
        if(!o||o===10||tiles[idx(x,y)]===T.AIR||(x-cx)*(x-cx)+(y-cy)*(y-cy)>rad*rad)continue;
        const sx=x*TS+TS/2-cam.x,sy=y*TS+TS/2-cam.y,k=.5+.5*Math.sin(time*4+x+y),r=TS*(.12+.08*k);
        g.fillStyle=o===9?"#C9A8FF":ORES[o].hi;g.globalAlpha=.55+.45*k;g.beginPath();g.moveTo(sx,sy-r*1.6);g.lineTo(sx+r,sy);g.lineTo(sx,sy+r*1.6);g.lineTo(sx-r,sy);g.closePath();g.fill();}
      g.globalAlpha=1;}
    // floating words stay readable above the dark''')
# TNT shake
rep('''    g.save();g.translate(-Math.round(cam.x),-Math.round(cam.y));''','''    const sh=time<shakeT?(Math.random()-.5)*TS*.3:0;
    g.save();g.translate(-Math.round(cam.x)+sh,-Math.round(cam.y)+sh);''')
rep('''  let tex={},back={},oreTex={},msgT=0,actHere=null,layerSeen=null;''','''  let tex={},back={},oreTex={},msgT=0,actHere=null,layerSeen=null,bossCool=0,tnt=null,shakeT=0;
  const PET={x:SPAWN_X-1,y:SKY-1,hop:-9};''')

# ---------------- shop: tricky orders and VIPs ----------------
i=s.index("  const QTY=[\"\",\"a\",\"two\",\"three\"];");j=s.index("  function toastIn(t)")
s=s[:i]+io.open("/home/claude/work/mine_shop2.js",encoding="utf-8").read()+s[j:]
rep('''  function endShop(){
    const m=M(),rest=Object.entries(m.bag).reduce((a,[o,n])=>a+ORES[o].val*n,0);
    openPanel(`<h2>🏪 Shop closed</h2><p class="sub">${served?`You served ${served} customer${served===1?"":"s"} and earned ${earned} coins!`:"No sales this time."}</p>''',
'''  function endShop(){
    const m=M(),rest=Object.entries(m.bag).reduce((a,[o,n])=>a+OI(o).val*n,0);
    const tease=scheduleVip();
    openPanel(`<h2>🏪 Shop closed</h2><p class="sub">${served?`You served ${served} customer${served===1?"":"s"} and earned ${earned} coins!`:"No sales this time."}</p>
      ${tease?`<p class="mtease">🌟 Tomorrow, <b>${tease}</b> is coming to your shop with a BIG order!</p>`:""}''')

# ---------------- pick shop gets a workbench tab ----------------
rep('''  function openSmith(){
    const m=M(),rows=[];''','''  function openSmith(tab){
    if(tab==="bench")return openBench();
    const m=M(),rows=[];''')
rep('''    openPanel(`<h2>⛏️ Pick shop</h2><p class="sub">You have ${m.coins} 🪙 coins. Deepest dig: ${m.deepest}.</p>''',
'''    openPanel(`<div class="mtabs"><button class="mtab on">⛏️ Upgrades</button><button class="mtab" id="mTabBench">🔨 Workbench</button></div>
      <h2>⛏️ Pick shop</h2><p class="sub">You have ${m.coins} 🪙 coins. Deepest dig: ${m.deepest}.</p>''')
rep('''      m.coins-=r.cost;r.buy();Sound.sfx.win();try{confetti();}catch(e){}save();openSmith();hud();toast(r.name+"!");});''',
'''      m.coins-=r.cost;r.buy();Sound.sfx.win();try{confetti();}catch(e){}save();openSmith();hud();toast(r.name+"!");});
    card().querySelector("#mTabBench").onclick=()=>openBench();''')
# wardrobe hides the prize crown until it is won
rep('''<div class="mline">${L.helmets.map(h=>`''','''<div class="mline">${L.helmets.filter(h=>!h.prize||m.owned[h.id]).map(h=>`''')
rep('''    card().querySelector("#mClose").onclick=()=>{m.made=true;save();closePanel();if(first)toast(''','''    card().querySelector("#mClose").onclick=()=>{m.made=true;save();closePanel();
      if(first&&(state.critters||[]).length)setTimeout(()=>toast("Tap 🐾 to bring a pet from your valley!",3500),5200);
      if(first)toast(''')

# ---------------- the new systems ----------------
rep('''  return{enter,exit,_toast:m=>toast(m,3000),''',io.open("/home/claude/work/mine_ext.js",encoding="utf-8").read()+'''
  return{enter,exit,_toast:m=>toast(m,3000),_startBoss:i=>startBoss(i),_tnt:()=>placeTnt(),_openMuseum:()=>openMuseum(),_openBench:()=>openBench(),
    _openPets:()=>openPets(),_hatch:()=>hatchEggs(),_collect:(x,y,o)=>collectOre(x,y,o),_PET:PET,_setTime:v=>{bossCool=v;},_now:()=>time,''')
io.open(P,"w",encoding="utf-8").write(s);print("mine.js patched",len(s))
s=io.open(P,encoding="utf-8").read()
a='const m=M();m.bag[9]=(m.bag[9]||0)+1;'
assert s.count(a)==1;s=s.replace(a,'const m=M();m.bag[9]=(m.bag[9]||0)+1;m.found[9]=1;')
io.open(P,"w",encoding="utf-8").write(s);print("word stones fill the museum too")
