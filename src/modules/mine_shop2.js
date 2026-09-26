  const QTY=["","a","two","three"];
  const GEMS=[3,5,6,7,8,9];
  const tomorrow=()=>new Date(Date.now()+864e5).toISOString().slice(0,10);
  // who is coming in: one of his valley animals, or a guardian as a VIP
  function customer(vip){
    if(vip!=null){const g=GUARDIANS[vip];return{art:g.id,name:g.name,vip:true};}
    const pool=(state.critters||[]).map(c=>c.id).filter(id=>CRIT(id));
    const id=pool.length?pool[Math.floor(Math.random()*pool.length)]:(CRITTERS.filter(c=>c.b<=state.biome)[0]||{id:"fox"}).id;
    return{art:id,name:NAMES[id]||id};
  }
  const exact=items=>tray=>{const want=Object.entries(items),got=Object.entries(tray).filter(([,n])=>n>0);
    return want.length===got.length&&want.every(([k,n])=>tray[k]===n);};
  const one=tray=>{const got=Object.entries(tray).filter(([,n])=>n>0);return got.length===1&&got[0][1]===1?+got[0][0]:null;};
  function makeOrder(vip){
    const m=M(),have=Object.entries(m.bag).filter(([k,n])=>n>0&&+k<20).map(([o,n])=>[+o,n]);if(!have.length)return null;
    const tier=currentTier(),pick=()=>have[Math.floor(Math.random()*have.length)],who=customer(vip);
    const nm=(o,q)=>q===1?"a "+ORES[o].name:QTY[q]+" "+ORES[o].pl;
    const gemsHave=have.filter(([o])=>GEMS.includes(o)).map(([o])=>o);
    // tricky orders make him think about what he read, not just match a word
    if(!who.vip&&tier>=4&&gemsHave.length&&Math.random()<.35){
      const colours=Object.keys(COLOR).map(Number);
      if(Math.random()<.5&&gemsHave.some(o=>COLOR[o])){
        const x=gemsHave.filter(o=>COLOR[o])[Math.floor(Math.random()*gemsHave.filter(o=>COLOR[o]).length)];
        if(gemsHave.some(o=>o!==x))return Object.assign(who,{text:`I want a gem that is not ${COLOR[x]}.`,
          check:tray=>{const k=one(tray);return k!=null&&GEMS.includes(k)&&k!==x;}});
      }
      const own=gemsHave.filter(o=>COLOR[o]);
      if(own.length){const a=own[Math.floor(Math.random()*own.length)],others=colours.filter(c=>c!==a),b=others[Math.floor(Math.random()*others.length)];
        const [c1,c2]=Math.random()<.5?[a,b]:[b,a];
        return Object.assign(who,{text:`I want a ${COLOR[c1]} gem or a ${COLOR[c2]} gem.`,check:tray=>{const k=one(tray);return k===c1||k===c2;}});}
    }
    const [o1,n1]=pick();let items={};
    const big=who.vip;
    const q1=(big||tier>=3)&&n1>=2&&(big||Math.random()<.5)?Math.min(n1,(big||tier>=7)&&n1>=3&&Math.random()<.5?3:2):1;
    items[o1]=q1;let second=null;
    if((big||tier>=5)&&have.length>=2&&(big||Math.random()<.5)){const rest=have.filter(([o])=>o!==o1);second=rest[Math.floor(Math.random()*rest.length)][0];items[second]=1;}
    const opener=tier>=5&&Math.random()<.5?"Can I have":"I want";
    const text=`${opener} ${nm(o1,q1)}${second?" and "+nm(second,1):""}${opener==="Can I have"?", please?":"."}`;
    return Object.assign(who,{text,check:exact(items)});
  }
  function scheduleVip(){
    const m=M(),woken=(state.guardians||[]).filter(b=>GUARDIANS[b]);if(!woken.length)return null;
    if(m.vip&&m.vip.date>=today()&&!m.vip.done)return null;       // one already on the way
    const g=woken[Math.floor(Math.random()*woken.length)];m.vip={date:tomorrow(),g,done:false};save();
    return GUARDIANS[g].name;
  }
  function openShop(){
    const m=M();if(!bagCount()){openPanel(`<h2>🏪 My shop</h2><p class="sub">Your shelves are empty! Dig some gems first, then come back to sell them.</p>
      <div class="mrow"><button class="btn primary" id="mClose">Go digging</button></div>`);card().querySelector("#mClose").onclick=closePanel;return;}
    shopQ=[];served=0;earned=0;
    for(let k=0;k<SHOPS[m.shopLv].cust;k++)shopQ.push(null);
    // the VIP promised yesterday comes in first; now and then a guardian just drops by
    const woken=(state.guardians||[]).filter(b=>GUARDIANS[b]);
    if(m.vip&&!m.vip.done&&m.vip.date<=today())shopQ[shopQ.length-1]={vip:m.vip.g,promised:true};
    else if(woken.length&&Math.random()<.2)shopQ[shopQ.length-1]={vip:woken[Math.floor(Math.random()*woken.length)]};
    nextCustomer();
  }
  function nextCustomer(){
    const slot=shopQ.length?shopQ[shopQ.length-1]:undefined;
    const o=slot!==undefined?makeOrder(slot&&slot.vip!=null?slot.vip:null):null;
    if(!o){endShop();return;}
    shopQ.pop();if(slot&&slot.promised){M().vip.done=true;save();}
    tray={};hintOn=false;renderShop(o);
    if(o.vip){Sound.sfx.fanfare();setTimeout(()=>Sound.say("sent:Here comes a big order!","Here comes a big order!",.95),500);}else Sound.sfx.chime();
  }
  function renderShop(o){
    const m=M(),left=shopQ.length;
    openPanel(`<div class="mshop${o.vip?" vip":""}"><div class="mcust"><div class="mwho">${drawThing(o.art,4)}</div>
        <div class="morder">${o.vip?`<div class="mvip">🌟 VIP customer · big tip!</div>`:""}<div class="mlabel">${o.name} says:</div><div class="msay">${o.text.split(" ").map(w=>`<span>${w}</span>`).join(" ")}</div>
        <button class="btn soft mini" id="mHear" style="${hintOn?"":"display:none"}">🔊 Hear it</button></div></div>
      <div class="mlabel">On the counter:</div><div class="mtray" id="mTray"></div>
      <div class="mlabel">Your backpack — tap to put on the counter:</div><div class="mbagrow" id="mBagRow"></div>
      <div class="mrow"><button class="btn soft" id="mClose">Close shop</button><button class="btn primary" id="mGive">Give it 👍</button></div>
      <p class="sub" style="margin:6px 0 0">${left} more customer${left===1?"":"s"} waiting</p></div>`);
    const draw=()=>{
      const bag=card().querySelector("#mBagRow"),tr=card().querySelector("#mTray");
      bag.innerHTML=Object.entries(m.bag).filter(([o,n])=>n-(tray[o]||0)>0).map(([o,n])=>`<button class="mitem${+o>20?" shiny":""}" data-o="${o}"><img src="${oreIcon(+o)}" alt=""><b>${OI(o).name}</b><i>×${n-(tray[o]||0)}</i></button>`).join("")||`<span class="sub">Empty</span>`;
      tr.innerHTML=Object.entries(tray).filter(([,n])=>n>0).map(([o,n])=>`<button class="mitem on" data-o="${o}"><img src="${oreIcon(+o)}" alt=""><b>${OI(o).name}</b><i>×${n}</i></button>`).join("")||`<span class="sub">Nothing yet</span>`;
      bag.querySelectorAll(".mitem").forEach(b=>b.onclick=()=>{tray[b.dataset.o]=(tray[b.dataset.o]||0)+1;Sound.sfx.pop();draw();});
      tr.querySelectorAll(".mitem").forEach(b=>b.onclick=()=>{tray[b.dataset.o]--;if(!tray[b.dataset.o])delete tray[b.dataset.o];Sound.sfx.soft();draw();});
    };draw();
    card().querySelectorAll(".msay span").forEach(s=>s.onclick=()=>{if(hintOn){const w=s.textContent.replace(/[.,?!]/g,"").toLowerCase();Sound.say("word:"+w,w,.85);}});
    card().querySelector("#mHear").onclick=()=>Sound.say("sent:"+o.text,o.text,.9);
    card().querySelector("#mClose").onclick=()=>endShop();
    card().querySelector("#mGive").onclick=()=>{
      const got=Object.entries(tray).filter(([,n])=>n>0);
      if(!got.length){Sound.sfx.nope();return;}
      if(o.check(tray)){let base=0;got.forEach(([k,n])=>{m.bag[k]-=n;if(m.bag[k]<=0)delete m.bag[k];base+=OI(k).val*n;});
        const gems=o.vip?3:1,pay=base*(o.vip?3:2)+SHOPS[m.shopLv].tip*(o.vip?4:1)+Math.floor(Math.random()*3);
        m.coins+=pay;earned+=pay;served++;
        m.orders=(m.orders||0)+1;m.ordersRight=(m.ordersRight||0)+1;state.wordsRead++;state.gems+=gems;
        try{Quests.hit("order");Quests.hit("read");}catch(e){}
        Sound.sfx.win();Sound.say("sent:Thank you!","Thank you!",1);
        card().querySelector(".mcust").classList.add("happy");
        card().querySelector(".morder").insertAdjacentHTML("beforeend",`<div class="mpaid">+${pay} 🪙  +${gems} 💎</div>`);
        save();setTimeout(nextCustomer,1300);
      }else{m.ordersWrong=(m.ordersWrong||0)+1;Sound.sfx.nope();hintOn=true;
        card().querySelector("#mHear").style.display="";
        const say=card().querySelector(".msay");say.classList.remove("shake");void say.offsetWidth;say.classList.add("shake");
        toastIn("Hmm, that's not what I asked for. Read it again!");tray={};draw();}
    };
  }
