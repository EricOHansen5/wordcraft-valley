
  /* ================================================================
     v9 — BUILD, LIGHT AND EXPLORE
     · Build mode: dirt, stone and sand come home in his pockets as he
       digs; ladders, torches and signs are made at the workbench. He can
       build bridges, towers, stairs and a torch-lit base.
     · Ladders are climbed, torches light the dark, signs hold a sentence
       he builds himself (the mine also has a few signs of its own).
     · Sand falls when there is nothing under it.
     · Cave life: bats flit, slimes bounce him high, moles pop out with a
       word riddle, and one lost animal a day needs reading to get home.
     · Word vaults: locked rooms deep down that open with a reading key.
     · Mine jobs: three small goals a day, paid in coins.
     ================================================================ */
  const BLK=[{k:"dirt",t:T.DIRT,n:"dirt"},{k:"stone",t:T.STONE,n:"stone"},{k:"sand",t:T.SAND,n:"sand"},
    {k:"ladder",t:T.LADDER,n:"ladder"},{k:"torch",t:T.TORCH,n:"torch"},{k:"sign",t:T.SIGN,n:"sign"}];
  const BLK_OF={[T.DIRT]:"dirt",[T.GRASS]:"dirt",[T.STONE]:"stone",[T.DEEP]:"stone",[T.HOT]:"stone",[T.SAND]:"sand",[T.LADDER]:"ladder",[T.TORCH]:"torch",[T.SIGN]:"sign"};
  let build=false,sel="dirt",placeT=0,sandT=0,dirty=false,gameSigns={},VAULTS=[];
  const ST=()=>M().stat;
  const bump=(k,n=1)=>{const s=ST();s[k]=(s[k]||0)+n;};
  // ---------- building ----------
  function setBuild(on){
    build=on;root.classList.toggle("building",on);root.querySelector("#mDig").textContent=on?"🧱":"⛏️";
    root.querySelector("#mBuild").classList.toggle("on",on);hotbar();
    if(on&&!M().buildHint){M().buildHint=1;toast("Build mode! Pick a block, then hold 🧱 to put it down.",3600);}
  }
  function blkIcon(k){
    const c=document.createElement("canvas");c.width=c.height=48;const g=c.getContext("2d");g.imageSmoothingEnabled=false;
    const b=BLK.find(x=>x.k===k);if(tex[b.t]&&!PASS_T[b.t])g.drawImage(tex[b.t][0],0,0,48,48);else{g.fillStyle="rgba(0,0,0,.12)";g.fillRect(0,0,48,48);drawObj(g,b.t,0,0,48,0);}
    return c.toDataURL();
  }
  const icons={};
  function hotbar(){
    const h=root.querySelector("#mHot"),m=M();if(!build){h.innerHTML="";return;}
    h.innerHTML=BLK.map(b=>`<button class="mhot${b.k===sel?" on":""}${m.blocks[b.k]?"":" none"}" data-k="${b.k}"><img src="${icons[b.k]||(icons[b.k]=blkIcon(b.k))}" alt=""><b>${m.blocks[b.k]||0}</b><span>${b.n}</span></button>`).join("");
    h.querySelectorAll(".mhot").forEach(x=>x.onclick=()=>{sel=x.dataset.k;Sound.sfx.soft();hotbar();
      if(!m.blocks[sel])toast(sel==="dirt"||sel==="stone"||sel==="sand"?`Dig some ${sel} first!`:`Make ${sel}s at the workbench (pick shop ⛏️).`,3000);});
  }
  const inTown=(x,y)=>x<TOWN&&y<SKY+4;
  function overlapsMe(x,y){return x+1>P.x&&x<P.x+P.w&&y+1>P.y&&y<P.y+P.h;}
  function placeTarget(){
    const cx=Math.floor(P.x+P.w/2),feet=Math.floor(P.y+P.h-.05),head=Math.floor(P.y+.05),t=BLK.find(b=>b.k===sel).t;
    if(t===T.LADDER){for(const y of [feet,head,head-1])if(tileAt(cx,y)===T.AIR)return[cx,y];return null;}
    if(t===T.TORCH||t===T.SIGN){if(tileAt(cx,feet)===T.AIR)return[cx,feet];const s=cx+(P.face>0?1:-1);return tileAt(s,feet)===T.AIR?[s,feet]:null;}
    const[x,y]=digTarget();return tileAt(x,y)===T.AIR&&!overlapsMe(x,y)?[x,y]:null;
  }
  function place(dt){
    placeT-=dt;if(placeT>0)return;placeT=.28;
    const m=M(),b=BLK.find(x=>x.k===sel);
    if(!(m.blocks[sel]>0)){if(time-msgT>2){msgT=time;toast(`No ${sel} left!`);Sound.sfx.nope();}return;}
    const tg=placeTarget();if(!tg)return;const[x,y]=tg;
    if(x<1||x>=MW-1||y<1||y>=MH-2||inTown(x,y)){if(time-msgT>2){msgT=time;toast("Build in the mine, not in town!");}return;}
    const i=idx(x,y);tiles[i]=b.t;ore[i]=0;m.placed[i]=b.t;m.blocks[sel]--;
    burst(x,y,b.t===T.TORCH||b.t===T.LADDER||b.t===T.SIGN?T.DIRT:b.t,4);Sound.sfx.thud();
    if(b.t===T.TORCH){bump("torches");Sound.sfx.chime();}else if(b.t!==T.LADDER&&b.t!==T.SIGN)bump("built");
    dirty=true;hotbar();
    if(b.t===T.SIGN)setTimeout(()=>writeSign(i),200);
  }
  // blocks he digs go in his pockets (up to 99 of each)
  function pocket(t,i){
    const m=M(),k=BLK_OF[t];if(!k)return;
    if(m.placed[i]!=null){delete m.placed[i];if(t===T.SIGN)delete m.signs[i];}
    m.blocks[k]=Math.min(99,(m.blocks[k]||0)+1);if(build)hotbar();
  }
  // ---------- falling sand ----------
  function sandStep(){
    const cx=Math.floor(P.x),cy=Math.floor(P.y);let moved=false;
    for(let y=Math.min(MH-3,cy+12);y>=Math.max(SKY,cy-14);y--)for(let x=Math.max(1,cx-16);x<=Math.min(MW-2,cx+16);x++){
      const i=idx(x,y);if(tiles[i]!==T.SAND)continue;const j=idx(x,y+1);
      if(tiles[j]!==T.AIR||overlapsMe(x,y+1))continue;
      tiles[j]=T.SAND;tiles[i]=T.AIR;ore[j]=ore[i];ore[i]=0;
      if(m_placed()[i]!=null)delete m_placed()[i];m_placed()[j]=T.SAND;moved=true;
      if(Math.random()<.3)burst(x,y+1,T.SAND,2);}
    if(moved){dirty=true;if(time-(sandT||0)>.5){Sound.sfx.dig();sandT=time;}}
  }
  const m_placed=()=>M().placed;
  // ---------- signs ----------
  const SIGN_WORDS=["The","A","I","My","is","was","can","has","and","on","in","by","to","at","the","a","big","red","hot","fun","dig","dug","see","look","here","gem","gems","bat","rock","gold","mine","home","up","down","fast","dark","deep","best","it","not","yes","no"];
  function writeSign(i){
    const words=[];const okW=w=>{try{return Decode.tier(w)<=currentTier();}catch(e){return true;}};
    const extra=allWords().filter(w=>!w.tricky&&w.t<=currentTier()&&((state.stats[w.w]||{}).seen||0)>0).map(w=>w.w).slice(0,40);
    const bank=[...new Set([...SIGN_WORDS,...extra])].filter(w=>okW(w.toLowerCase()));
    const draw=()=>{
      openPanel(`<h2>🪧 Write your sign</h2><p class="sub">Tap words to make a sentence for your sign.</p>
        <div class="msignline">${words.length?words.map((w,k)=>`<button class="msw" data-k="${k}">${w}</button>`).join(" "):`<span class="sub">…</span>`}</div>
        <div class="mrow"><button class="btn soft" data-p=".">.</button><button class="btn soft" data-p="!">!</button><button class="btn soft" id="mSHear">🔊</button><button class="btn soft" id="mSUndo">⌫</button></div>
        <div class="msignbank">${bank.map(w=>`<button class="mswb" data-w="${w}">${w}</button>`).join("")}</div>
        <div class="mrow"><button class="btn soft" id="mSNo">No sign</button><button class="btn primary" id="mSOk" ${words.length?"":"disabled"}>Put it up 🪧</button></div>`);
      const text=()=>words.join(" ").replace(/ ([.!?])/g,"$1");
      card().querySelectorAll(".mswb").forEach(b=>b.onclick=()=>{if(words.length>=8)return;let w=b.dataset.w;if(!words.length)w=w[0].toUpperCase()+w.slice(1);words.push(w);Sound.say("word:"+b.dataset.w.toLowerCase(),b.dataset.w.toLowerCase(),.9);draw();});
      card().querySelectorAll(".msw").forEach(b=>b.onclick=()=>{words.splice(+b.dataset.k,1);draw();});
      card().querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{if(words.length&&!/[.!?]/.test(words[words.length-1]))words.push(b.dataset.p);draw();});
      card().querySelector("#mSUndo").onclick=()=>{words.pop();draw();};
      card().querySelector("#mSHear").onclick=()=>Sound.say("sent:"+text(),text(),.92);
      card().querySelector("#mSNo").onclick=()=>{tiles[i]=T.AIR;delete M().placed[i];M().blocks.sign++;dirty=true;closePanel();};
      card().querySelector("#mSOk").onclick=()=>{if(!/[.!?]$/.test(words[words.length-1]))words.push(".");M().signs[i]=text();bump("signs");state.wordsRead+=words.filter(w=>!/[.!?]/.test(w)).length;
        save();closePanel();Sound.sfx.chime();toast("Your sign is up! 🪧");};
    };draw();
  }
  const signText=i=>M().signs[i]||gameSigns[i]||"";
  function readSign(i){const t=signText(i);if(!t)return;Sound.say("sent:"+t,t,.92);float(i%MW,Math.floor(i/MW)-1,"📖","#FFFFFF");}
  // ---------- vaults ----------
  function openVault(V){
    const lvl=V.n,kind=["pic","wordPick","sentence","build"][lvl]||"pic";
    openPanel(`<h2>🔐 A word vault!</h2><p class="sub">Only a reader can open this door.</p><div class="mq"></div><div class="mrow"><button class="btn soft" id="mClose">Later</button></div>`);
    card().querySelector("#mClose").onclick=closePanel;
    const host=card().querySelector(".mq");
    const done=()=>{const m=M();m.vaults[V.k]=1;tiles[idx(V.door[0],V.door[1])]=T.AIR;bump("vaults");state.wordsRead+=3;dirty=true;save();
      closePanel();Sound.sfx.fanfare();shakeT=time+.3;for(let k=0;k<24;k++)parts.push({x:V.door[0]+.5,y:V.door[1]+.5,vx:(Math.random()-.5)*9,vy:-Math.random()*8,life:1,col:k%2?"#FFE58A":"#C9A8FF",s:.16});
      banner("The vault is open!");toast("Treasure inside! Dig the chests. 💰",3500);};
    if(kind==="sentence"&&currentTier()<2)Read.pic(host,done);else Read[kind](host,done);
  }
  // ---------- cave life ----------
  const ENT=[];let spawnT=0,moleCool=0;
  const airAt=(x,y)=>tileAt(x,y)===T.AIR;
  function findAir(cx,cy,rx,ry,test){for(let k=0;k<40;k++){const x=cx+Math.floor((Math.random()*2-1)*rx),y=cy+Math.floor((Math.random()*2-1)*ry);
    if(x<2||x>MW-3||y<SKY+2||y>MH-4)continue;if(airAt(x,y)&&(!test||test(x,y)))return[x,y];}return null;}
  function lostAnimal(){
    const m=M();if(m.lost&&m.lost.date===today())return m.lost;
    const cap=(BOSSES.find(b=>!m.bosses[b.id])||{d:MDEPTH}).d-2,maxD=Math.min(cap,Math.max(12,(m.deepest||0)+6));
    const pool=CRITTERS.filter(c=>c.b<=Math.max(state.biome||0,1)+1),own=new Set((state.critters||[]).map(c=>c.id));
    const pick=(pool.filter(c=>!own.has(c.id)).length?pool.filter(c=>!own.has(c.id)):pool);const c=pick[Math.floor(Math.random()*pick.length)];
    let spot=null;for(let k=0;k<400&&!spot;k++){const x=TOWN+2+Math.floor(Math.random()*(MW-TOWN-4)),y=SKY+6+Math.floor(Math.random()*Math.max(1,maxD-6));
      if(airAt(x,y)&&!airAt(x,y+1)&&tileAt(x,y+1)!==T.SEAL)spot=[x,y];}
    if(!spot){const y=SKY+Math.min(10,maxD);spot=[TOWN+6,y];}
    m.lost={date:today(),id:c.id,x:spot[0],y:spot[1],rescued:false};save();return m.lost;
  }
  function spawn(){
    const cx=Math.floor(P.x),cy=Math.floor(P.y),d=depthOf(P.y+P.h);if(d<2)return;
    const n=t=>ENT.filter(e=>e.type===t).length;
    if(n("bat")<3&&d>=4){const s=findAir(cx,cy,12,7,(x,y)=>airAt(x,y-1)&&Math.abs(x-cx)>4);if(s)ENT.push({type:"bat",x:s[0]+.5,y:s[1]+.5,vx:(Math.random()-.5)*3,vy:0,t:Math.random()*9});}
    if(n("slime")<2&&d>=8){const s=findAir(cx,cy,12,6,(x,y)=>!airAt(x,y+1)&&Math.abs(x-cx)>3);if(s)ENT.push({type:"slime",x:s[0]+.5,y:s[1]+1,vx:0,vy:0,hop:1+Math.random()*2,sq:0});}
    if(!n("mole")&&d>=2&&d<=50&&time>moleCool&&Math.random()<.3){
      for(let k=0;k<30;k++){const y=cy+Math.floor(Math.random()*5)-1,side=Math.random()<.5?-1:1,x=cx+side*(2+Math.floor(Math.random()*4));
        const t=tileAt(x,y);if((t===T.DIRT||t===T.STONE)&&airAt(x-side,y)&&!airAt(x-side,y+1)){ENT.push({type:"mole",x:x+.5,y:y+.5,side,life:9,pop:0});moleCool=time+25;
          toast("A mole popped out! 🐹",2000);Sound.sfx.boing&&Sound.sfx.boing();break;}}}
  }
  function updEnts(dt){
    spawnT-=dt;if(spawnT<=0){spawnT=2.5;spawn();}
    for(let i=ENT.length-1;i>=0;i--){const e=ENT[i];
      if(Math.abs(e.x-P.x)>22||Math.abs(e.y-P.y)>14){ENT.splice(i,1);continue;}
      if(e.type==="bat"){e.t+=dt;const ax=Math.sin(e.t*1.7)*3,ay=Math.cos(e.t*2.3)*2;e.vx+=(ax-e.vx)*dt*2;e.vy+=(ay-e.vy)*dt*2;
        const dx=e.x-(P.x+.3),dy=e.y-(P.y+.4);if(dx*dx+dy*dy<4){e.vx+=Math.sign(dx)*6*dt;e.vy-=4*dt;}
        const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt;if(airAt(Math.floor(nx),Math.floor(e.y)))e.x=nx;else e.vx*=-1;if(airAt(Math.floor(e.x),Math.floor(ny)))e.y=ny;else e.vy*=-1;}
      else if(e.type==="slime"){e.sq=Math.max(0,e.sq-dt*3);
        const below=!airAt(Math.floor(e.x),Math.floor(e.y+.02));
        if(below&&e.vy>=0){e.y=Math.floor(e.y+.02);e.vy=0;e.vx*=.8;e.hop-=dt;if(e.hop<=0){e.hop=1.5+Math.random()*2;e.vy=-6.5;e.vx=(Math.random()<.5?-1:1)*2.2;e.sq=1;}}
        else{e.vy=Math.min(12,e.vy+22*dt);}
        const nx=e.x+e.vx*dt;if(airAt(Math.floor(nx+Math.sign(e.vx)*.35),Math.floor(e.y-.3)))e.x=nx;else e.vx*=-1;
        const ny=e.y+e.vy*dt;if(e.vy<0&&!airAt(Math.floor(e.x),Math.floor(ny-.7)))e.vy=0;else e.y=ny;
        // land on a slime: BOING
        const feet=P.y+P.h;if(P.vy>1&&Math.abs(P.x+P.w/2-e.x)<.6&&feet>e.y-.75&&feet<e.y-.1){P.vy=-15;e.sq=1;Sound.sfx.boing&&Sound.sfx.boing();bump("bounces");float(e.x-.5,e.y-1.2,"BOING!","#9BF28E");}}
      else if(e.type==="mole"){e.pop=Math.min(1,e.pop+dt*3);e.life-=dt;if(e.life<=0)e.pop-=dt*6;if(e.life<-.4){ENT.splice(i,1);}}
    }
  }
  const moleNear=()=>ENT.find(e=>e.type==="mole"&&e.life>0&&Math.abs(e.x-(P.x+P.w/2))<2&&Math.abs(e.y-(P.y+.5))<1.5);
  function moleRiddle(e){
    e.life=99;openPanel(`<h2>🐹 A mole's riddle!</h2><p class="sub">“Read my word, and I'll give you my treasure!”</p><div class="mq"></div><div class="mrow"><button class="btn soft" id="mClose">Bye, mole!</button></div>`);
    card().querySelector("#mClose").onclick=()=>{e.life=.3;closePanel();};
    Read[Math.random()<.5?"pic":"wordPick"](card().querySelector(".mq"),ok=>{const m=M(),c=ok?15+Math.floor(Math.random()*10):8;m.coins+=c;bump("moles");
      const gift=Math.random()<.35;if(gift)m.blocks.torch=(m.blocks.torch||0)+2;
      e.life=.3;closePanel();float(e.x-.5,e.y-1,"+"+c+" 🪙","#FFE9A8");toast(`The mole gave you ${c} coins${gift?" and 2 torches":""}! 🐹`,3000);Sound.sfx.win();save();hud();});
  }
  function rescue(){
    const L=M().lost,c=CRIT(L.id),name=c.name.toLowerCase();
    openPanel(`<div class="mlost"><div class="art">${drawThing(L.id,5)}</div><div><h2>A lost ${name}!</h2><p class="sub">“Help! I'm lost in the mine. Read with me, and I can find my way home.”</p></div></div>
      <div class="mq"></div><div class="mrow"><button class="btn soft" id="mClose">Later</button></div>`);
    card().querySelector("#mClose").onclick=closePanel;Sound.sfx.cry(c.cry);
    const host=card().querySelector(".mq"),fn=currentTier()>=2?Read.sentence:Read.pic;
    fn(host,()=>{L.rescued=true;bump("rescued");const m=M();m.coins+=25;state.gems+=4;
      let res=null;try{res=addItem(L.id);const a=state.adv||(state.adv={dex:{}});a.dex=a.dex||{};const d=a.dex[L.id]=a.dex[L.id]||{};d.seen=1;d.caught=(d.caught||0)+1;}catch(e){}
      save();hud();Sound.sfx.fanfare();try{confetti();}catch(e){}
      openPanel(`<div class="mlost"><div class="art happy">${drawThing(L.id,5)}</div><div><h2>The ${name} is home! 🏡</h2>
        <p class="mpaid">+25 🪙 &nbsp; +4 💎</p><p class="sub">${res&&res.new?`It moved into your valley — and it's in your Word-Dex!`:`Your ${name} in the valley says thank you!`}</p></div></div>
        <div class="mrow"><button class="btn primary" id="mClose">Hooray!</button></div>`);card().querySelector("#mClose").onclick=closePanel;});
  }
  function drawEnts(g){
    for(const e of ENT){const sx=e.x*TS,sy=e.y*TS;
      if(e.type==="bat"){const im=artImg("bat"),s=TS*.62,fl=Math.sin(time*18)*.25;if(im.complete&&im.naturalWidth){g.save();g.translate(sx,sy);g.scale(e.vx>0?-1:1,1+fl);g.drawImage(im,-s/2,-s/2,s,s);g.restore();}}
      else if(e.type==="slime"){const w=TS*(.7+e.sq*.18),h=TS*(.55-e.sq*.12);g.save();g.translate(sx,sy);
        g.fillStyle="rgba(120,230,110,.85)";g.strokeStyle="#2E6B2A";g.lineWidth=3;g.beginPath();g.ellipse(0,-h/2,w/2,h/2,0,0,Math.PI*2);g.fill();g.stroke();
        g.fillStyle="rgba(255,255,255,.6)";g.beginPath();g.ellipse(-w*.18,-h*.7,w*.1,h*.12,0,0,Math.PI*2);g.fill();
        g.fillStyle="#1E3A1C";[-.14,.14].forEach(k=>{g.beginPath();g.arc(k*w,-h*.5,TS*.05,0,Math.PI*2);g.fill();});g.restore();}
      else if(e.type==="mole"){const k=Math.max(0,e.pop),bx=(e.x-.5)*TS+(e.side>0?0:TS),dir=-e.side;g.save();g.translate(bx+dir*TS*.35*k,sy);
        g.fillStyle="#6B4A36";g.strokeStyle="#2E2620";g.lineWidth=3;g.beginPath();g.ellipse(0,0,TS*.34,TS*.3,0,0,Math.PI*2);g.fill();g.stroke();
        g.fillStyle="#F2A0B8";g.beginPath();g.arc(dir*TS*.3,TS*.02,TS*.08,0,Math.PI*2);g.fill();g.stroke();
        g.fillStyle="#1E1410";g.beginPath();g.arc(dir*TS*.12,-TS*.08,TS*.045,0,Math.PI*2);g.fill();
        if(e.life>0&&e.life<99){g.fillStyle="#FFFBEF";g.font=`900 ${Math.round(TS*.36)}px system-ui,sans-serif`;g.textAlign="center";g.fillText("?",0,-TS*.5+Math.sin(time*5)*3);}
        g.restore();}}
    const L=M().lost;if(L&&!L.rescued&&Math.abs(L.y-P.y)<16){const im=artImg(L.id),s=TS*.9;
      if(im.complete&&im.naturalWidth){g.drawImage(im,L.x*TS+TS/2-s/2,(L.y+1)*TS-s+Math.sin(time*3)*2,s,s);}
      g.fillStyle="#FFFBEF";g.strokeStyle="#2E2620";g.lineWidth=3;g.beginPath();g.roundRect(L.x*TS+TS*.55,(L.y)*TS-TS*.55,TS*.6,TS*.5,8);g.fill();g.stroke();
      g.fillStyle="#2E2620";g.font=`900 ${Math.round(TS*.36)}px system-ui,sans-serif`;g.textAlign="center";g.textBaseline="middle";g.fillText("?",L.x*TS+TS*.85,L.y*TS-TS*.3);}
  }
  // ---------- what's here to use ----------
  function nearAct(){
    const cx=P.x+P.w/2,cy=P.y+P.h/2;
    for(const V of VAULTS){if(M().vaults[V.k])continue;if(Math.abs(cx-(V.door[0]+.5))<1.7&&Math.abs(cy-(V.door[1]+.5))<1.3)return{label:"🔐 Open the word vault",go:()=>openVault(V),key:"v"+V.k};}
    const L=M().lost;if(L&&!L.rescued&&Math.abs(cx-(L.x+.5))<1.6&&Math.abs(cy-(L.y+.5))<1.4)return{label:`🐾 Help the lost ${CRIT(L.id).name.toLowerCase()}`,go:rescue,key:"lost"};
    const mo=moleNear();if(mo)return{label:"🐹 Mole's riddle",go:()=>moleRiddle(mo),key:"mole"};
    const x=Math.floor(cx);for(const y of [Math.floor(P.y+P.h-.05),Math.floor(P.y+.1)])for(const xx of [x,x-1,x+1]){const i=idx(xx,y);
      if(tileAt(xx,y)===T.SIGN&&signText(i))return{label:"📖 Read the sign",go:()=>readSign(i),key:"s"+i};}
    return null;
  }
  // ---------- jobs ----------
  const JOBS=[{id:"dig",t:"Dig 40 blocks",s:"dug",n:40,pay:40},{id:"torch",t:"Put up 5 torches",s:"torches",n:5,pay:30},
    {id:"build",t:"Build with 15 blocks",s:"built",n:15,pay:35},{id:"mole",t:"Answer a mole's riddle",s:"moles",n:1,pay:30},
    {id:"rescue",t:"Help a lost animal get home",s:"rescued",n:1,pay:60},{id:"vault",t:"Open a word vault",s:"vaults",n:1,pay:80},
    {id:"gems",t:"Find 5 gems",s:"gems",n:5,pay:35},{id:"sign",t:"Write a sign",s:"signs",n:1,pay:30},
    {id:"bounce",t:"Bounce on a slime",s:"bounces",n:1,pay:20},{id:"sell",t:"Serve 3 customers",s:"served",n:3,pay:40}];
  function jobs(){
    const m=M();if(m.jobs&&m.jobs.date===today())return m.jobs;
    const vaultOk=VAULTS.some(V=>!m.vaults[V.k]&&V.d<=(m.deepest||0)+8),r=mulberry(hashStr("jobs"+today()));
    const pool=JOBS.filter(j=>(j.id!=="vault"||vaultOk)&&(j.id!=="bounce"||(m.deepest||0)>=8)).sort(()=>r()-.5).slice(0,3);
    m.jobs={date:today(),list:pool.map(j=>({id:j.id,base:ST()[j.s]||0,paid:false}))};save();return m.jobs;
  }
  const jobDef=id=>JOBS.find(j=>j.id===id);
  const jobProg=j=>Math.min(jobDef(j.id).n,(ST()[jobDef(j.id).s]||0)-j.base);
  function openJobs(){
    const J=jobs(),m=M();
    openPanel(`<h2>📋 Mine jobs</h2><p class="sub">Three jobs a day. Finish one, then tap to get paid!</p>
      <div class="mjobs">${J.list.map((j,k)=>{const d=jobDef(j.id),p=jobProg(j),done=p>=d.n;
        return`<div class="mjob${j.paid?" paid":done?" done":""}"><b>${d.t}</b><div class="mjbar"><i style="width:${p/d.n*100}%"></i></div><span>${p}/${d.n}</span>
          ${j.paid?`<em>✓ paid</em>`:done?`<button class="btn primary mini" data-k="${k}">Get ${d.pay} 🪙</button>`:`<em>${d.pay} 🪙</em>`}</div>`;}).join("")}</div>
      <div class="mrow"><button class="btn primary" id="mClose">OK</button></div>`);
    card().querySelector("#mClose").onclick=closePanel;
    card().querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const j=J.list[+b.dataset.k];j.paid=true;m.coins+=jobDef(j.id).pay;Sound.sfx.win();
      if(J.list.every(x=>x.paid)){state.gems+=3;toast("All three jobs done! +3 💎",3000);try{confetti();}catch(e){}}
      save();hud();openJobs();});
  }
  function jobsBadge(){const J=jobs(),n=J.list.filter(j=>!j.paid&&jobProg(j)>=jobDef(j.id).n).length,el=root.querySelector("#mJobs");
    el.textContent="📋 "+J.list.filter(j=>j.paid).length+"/3";el.classList.toggle("ready",n>0);
    const L=M().lost,lp=root.querySelector("#mLost");if(L&&!L.rescued){const d=depthOf(L.y+1),dx=L.x-(P.x+P.w/2),here=depthOf(P.y+P.h);
      lp.style.display="";lp.textContent=`🐾 lost ${CRIT(L.id).name.toLowerCase()}: ${d} deep ${Math.abs(dx)<2&&Math.abs(d-here)<2?"👀":(d>here+1?"⬇":d<here-1?"⬆":"")}${Math.abs(dx)>=2?(dx>0?"➡":"⬅"):""}`;}else lp.style.display="none";}
  // ---------- drawing the new tiles ----------
  const PASS_T={[T.LADDER]:1,[T.TORCH]:1,[T.SIGN]:1};
  function drawObj(g,t,px,py,S,idxv){
    g.save();g.lineJoin="round";
    if(t===T.LADDER){g.fillStyle="#B98349";g.strokeStyle="#5E3B1C";g.lineWidth=Math.max(1.5,S*.05);
      [.18,.72].forEach(k=>{g.fillRect(px+S*k,py,S*.1,S);g.strokeRect(px+S*k,py,S*.1,S);});
      for(let k=0;k<3;k++){g.fillRect(px+S*.2,py+S*(.14+k*.33),S*.62,S*.09);g.strokeRect(px+S*.2,py+S*(.14+k*.33),S*.62,S*.09);}}
    else if(t===T.TORCH){g.fillStyle="#8A5A2B";g.fillRect(px+S*.44,py+S*.42,S*.12,S*.5);
      const f=1+.12*Math.sin(time*14+(idxv||0));g.fillStyle="#FF8A1A";g.beginPath();g.ellipse(px+S*.5,py+S*.34,S*.13*f,S*.2*f,0,0,Math.PI*2);g.fill();
      g.fillStyle="#FFE58A";g.beginPath();g.ellipse(px+S*.5,py+S*.38,S*.07,S*.11,0,0,Math.PI*2);g.fill();}
    else if(t===T.SIGN){g.fillStyle="#8A5A2B";g.fillRect(px+S*.45,py+S*.5,S*.1,S*.5);g.fillStyle="#D9A866";g.strokeStyle="#5E3B1C";g.lineWidth=Math.max(1.5,S*.05);
      g.fillRect(px+S*.1,py+S*.16,S*.8,S*.4);g.strokeRect(px+S*.1,py+S*.16,S*.8,S*.4);g.fillStyle="#5E3B1C";[.26,.38].forEach(k=>g.fillRect(px+S*.2,py+S*k,S*.6,S*.04));}
    g.restore();
  }
  function drawVault(g,t,px,py,x,y){
    if(t===T.VAULT){g.fillStyle="#4B3F6B";g.fillRect(px,py,TS+1,TS+1);g.strokeStyle="#2B2340";g.lineWidth=2;
      for(let k=0;k<2;k++){g.strokeRect(px+1,py+k*TS/2+1,TS-2,TS/2-2);g.beginPath();g.moveTo(px+TS/2*((y+k)%2),py+k*TS/2);g.lineTo(px+TS/2*((y+k)%2),py+(k+1)*TS/2);g.stroke();}
      g.fillStyle="rgba(255,229,138,.25)";g.fillRect(px+TS*.1,py+TS*.1,TS*.1,TS*.1);}
    else if(t===T.VDOOR){g.fillStyle="#8A5A2B";g.fillRect(px,py,TS+1,TS+1);g.strokeStyle="#3B2412";g.lineWidth=3;g.strokeRect(px+2,py+2,TS-4,TS-4);
      g.fillStyle="#FFC83D";g.beginPath();g.arc(px+TS/2,py+TS/2,TS*.16+Math.sin(time*4)*TS*.02,0,Math.PI*2);g.fill();g.stroke();
      g.fillStyle="#3B2412";g.fillRect(px+TS*.47,py+TS*.5,TS*.06,TS*.16);}
  }
  function signBubble(g){
    const cx=Math.floor(P.x+P.w/2);
    for(let y=Math.floor(P.y)-1;y<=Math.floor(P.y+P.h)+1;y++)for(let x=cx-2;x<=cx+2;x++){const i=idx(x,y);if(tileAt(x,y)!==T.SIGN)continue;const t=signText(i);if(!t)continue;
      g.font=`800 ${Math.round(TS*.34)}px system-ui,sans-serif`;const w=Math.min(TS*7,g.measureText(t).width+TS*.5),bx=x*TS+TS/2-w/2,by=y*TS-TS*.95;
      g.fillStyle="#FFFBEF";g.strokeStyle="#2E2620";g.lineWidth=3;g.beginPath();g.roundRect(bx,by,w,TS*.62,10);g.fill();g.stroke();
      g.fillStyle="#2E2620";g.textAlign="center";g.textBaseline="middle";g.fillText(t,x*TS+TS/2,by+TS*.32,w-TS*.3);return;}
  }
  // lights: the lamp on his helmet, plus every torch on screen
  let lightCv=null;
  function darkness(g,A,R,torches){
    if(!lightCv)lightCv=document.createElement("canvas");
    if(lightCv.width!==cv.width||lightCv.height!==cv.height){lightCv.width=cv.width;lightCv.height=cv.height;}
    const l=lightCv.getContext("2d");l.setTransform(dpr,0,0,dpr,0,0);l.globalCompositeOperation="source-over";l.clearRect(0,0,vw,vh);
    l.fillStyle=`rgba(8,6,14,${A})`;l.fillRect(0,0,vw,vh);l.globalCompositeOperation="destination-out";
    const hole=(x,y,r)=>{const gr=l.createRadialGradient(x,y,r*.2,x,y,r);gr.addColorStop(0,"rgba(0,0,0,1)");gr.addColorStop(1,"rgba(0,0,0,0)");l.fillStyle=gr;l.fillRect(x-r,y-r,r*2,r*2);};
    hole((P.x+P.w/2)*TS-cam.x,(P.y+.3)*TS-cam.y,R);
    for(const[tx,ty]of torches)hole((tx+.5)*TS-cam.x,(ty+.35)*TS-cam.y,TS*(4.4+.25*Math.sin(time*9+tx)));
    g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(lightCv,0,0);g.restore();
    // warm glow on top
    g.save();g.globalCompositeOperation="lighter";for(const[tx,ty]of torches){const x=(tx+.5)*TS-cam.x,y=(ty+.35)*TS-cam.y,r=TS*1.6;
      const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,"rgba(255,160,60,.28)");gr.addColorStop(1,"rgba(255,160,60,0)");g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}g.restore();
  }
  // gems fly to his backpack
  const flies=[];
  function flyGem(tx,ty,col){for(let k=0;k<5;k++)flies.push({x:tx+.5,y:ty+.5,t:-k*.05,col});}
  function updFlies(dt){for(let i=flies.length-1;i>=0;i--){const f=flies[i];f.t+=dt;if(f.t<0)continue;const k=Math.min(1,f.t/.45),tx=P.x+P.w/2,ty=P.y+.3;
    f.x+=(tx-f.x)*k*.35;f.y+=(ty-f.y)*k*.35-Math.sin(k*Math.PI)*.06;if(f.t>.5)flies.splice(i,1);}}
  function drawFlies(g){for(const f of flies){if(f.t<0)continue;const x=f.x*TS,y=f.y*TS,r=TS*.1;g.fillStyle=f.col;g.beginPath();g.moveTo(x,y-r*1.5);g.lineTo(x+r,y);g.lineTo(x,y+r*1.5);g.lineTo(x-r,y);g.closePath();g.fill();}}
