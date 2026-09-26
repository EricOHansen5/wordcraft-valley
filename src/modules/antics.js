/* ================================================================
   SIGNATURE MOVES
   Every animal, vehicle and bit of scenery does its own thing when it
   is tapped, so poking around the valley keeps turning up surprises.
   Animals still say their name afterwards: the reading payoff stays.
   A few moves leave a small gift (egg, honey, truffle...) on a cooldown
   so tapping everything is worth it, but can't be farmed.
   ================================================================ */
function fx(x,yPct,emoji,o){
  o=o||{};const n=o.n||1;
  for(let i=0;i<n;i++){
    const d=document.createElement("div");d.className="fx";d.textContent=emoji;
    const j=(k,s)=>(o[k]||0)+(Math.random()-.5)*(o.jit==null?20:o.jit)*(s||1);
    d.style.cssText=`left:${x+(Math.random()-.5)*(o.spread||0)}px;top:${yPct}%;font-size:${o.size||24}px;
      --ux:${j("ux")}px;--uy:${o.uy==null?-40:j("uy")}px;--dx:${j("dx")}px;--dy:${o.dy==null?-70:j("dy")}px;
      --r:${o.r||0}deg;--d:${(o.d||1.1)+Math.random()*.2}s;--hold:${o.hold==null?1:o.hold};animation-delay:${(o.stagger||0)*i+(o.delay||0)}s`;
    tilesEl.appendChild(d);setTimeout(()=>d.remove(),((o.d||1.1)+.5+(o.stagger||0)*n+(o.delay||0))*1000);
  }
}
function ring(x,yPct,o){
  o=o||{};const s=o.size||120;
  for(let i=0;i<(o.n||1);i++){const d=document.createElement("div");d.className="ring";
    d.style.cssText=`left:${x}px;top:${yPct}%;width:${s}px;height:${s}px;border-color:${o.color||"rgba(255,255,255,.85)"};
      --d:${o.d||.8}s;animation-delay:${i*(o.gap||.18)}s`;
    tilesEl.appendChild(d);setTimeout(()=>d.remove(),((o.d||.8)+i*(o.gap||.18)+.2)*1000);}
}
function cAnim(cr,cls,ms){const el=cr._el;if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls),ms||1000);}
// where to draw things on an animal: centre, head height and feet, in world px / stage %
function cAt(cr){const a=vehAnchor(cr),h=parseFloat(cr._el?cr._el.style.height:40)||40;
  const vh=(document.getElementById("stage")||document.body).clientHeight||800;
  return{x:a.x,feet:a.top,mid:a.top-h*.5/vh*100,head:a.top-h*.85/vh*100,dir:a.dir,h,w:a.w};}
// small gifts on a cooldown, bigger for levelled-up animals
function gift(key,amount,x,yPct,label){
  state.treats=state.treats||{};const last=state.treats[key]||0;
  if(Date.now()-last<300000)return false;
  state.treats[key]=Date.now();state.gems+=amount;
  floater("+"+amount+" 💎","#FFE9A8");sparkleBurst(toView(x),yPct,8);
  Sound.sfx.win();renderHUD();save();if(label)setTimeout(()=>toast(label),900);
  return true;
}
const others=(cr,f)=>state.critters.filter(o=>o!==cr&&o._el&&o.out!==false&&(!f||f(o)));
const within=(a,b,d)=>Math.abs(a.c-b.c)+Math.abs(a.r-b.r)<=d;

const ANTICS={
  dog(cr,lv){ // fetch!
    const p=cAt(cr),dir=cr.c<COLS/2?1:-1;
    Sound.sfx.cry("bark");vShout(cr,"FETCH!");
    fx(p.x,p.mid,"🎾",{ux:dir*70,uy:-90,dx:dir*150,dy:0,jit:6,d:.9,size:20});
    setTimeout(()=>{moveCritter(cr,dir*3,0,true);},450);
    setTimeout(()=>{const q=cAt(cr);cAnim(cr,"c-wiggle",1500);Sound.sfx.cry("bark");
      if(Math.random()<.5)fx(q.x,q.feet,"🦴",{uy:-40,dy:-30,d:1.2});
      if(!gift("dog",lv,q.x,q.feet,"He dug up a gem!"))fx(q.x,q.head,"❤️",{n:3,uy:-30,dy:-60,jit:30,stagger:.15});},1400);
    return 2200;
  },
  fox(cr,lv){ // pounce-dive into the ground and pop out somewhere else
    const p=cAt(cr);Sound.sfx.cry("yip");vShout(cr,"YIP YIP!");cAnim(cr,"c-leap",800);
    setTimeout(()=>{cAnim(cr,"c-sink",1400);Sound.sfx.dig();puffAt(p.x,p.feet,"rgba(150,110,70,.85)",8,{dy:-30,spread:30,size:12});},600);
    setTimeout(()=>{moveCritter(cr,(Math.random()<.5?-1:1)*(2+Math.floor(Math.random()*3)),0);},1000);
    setTimeout(()=>{const q=cAt(cr);puffAt(q.x,q.feet,"rgba(150,110,70,.85)",8,{dy:-30,spread:30,size:12});Sound.sfx.pop();
      if(Math.random()<.4)fx(q.x,q.head,"🐭",{uy:-20,dx:q.dir*-120,dy:0,jit:5,d:1});},1800);
    return 2300;
  },
  cat(cr,lv){ // chase the yarn, then a nap
    const p=cAt(cr),dir=Math.random()<.5?-1:1;
    Sound.sfx.cry("hiss");vShout(cr,"MEOW!");
    fx(p.x+dir*30,p.feet-1,"🧶",{uy:-6,ux:dir*50,dx:dir*120,dy:-2,jit:4,r:dir*540,d:1,size:22});
    setTimeout(()=>moveCritter(cr,dir*2,0,true),250);
    setTimeout(()=>{cAnim(cr,"c-nap",2400);Sound.sfx.purr();const q=cAt(cr);
      fx(q.x+12,q.head,"💤",{n:3,ux:14,uy:-25,dx:30,dy:-55,jit:6,stagger:.45,d:1.1,size:18});},1100);
    return 3400;
  },
  hen(cr,lv){ // lays an egg that hatches
    const p=cAt(cr);Sound.sfx.cry("squawk");vShout(cr,"BAWK BAWK!");cAnim(cr,"c-stomp",1300);
    for(let i=0;i<3;i++)fx(p.x,p.mid,"🪶",{ux:(i-1)*30,uy:-30,dx:(i-1)*50,dy:20,r:(i-1)*90,size:14,delay:i*.12});
    setTimeout(()=>{const q=cAt(cr);Sound.sfx.pop();
      fx(q.x-q.dir*q.w*.35,q.feet-1,"🥚",{uy:-4,dy:-4,jit:0,d:1.3,hold:1,size:22});},700);
    setTimeout(()=>{const q=cAt(cr);Sound.sfx.chime();
      fx(q.x-q.dir*q.w*.35,q.feet-1,"🐣",{uy:-18,dy:-50,jit:0,d:1.4,size:26});
      gift("hen",1+lv,q.x,q.feet,"The egg had a gem inside!");},1900);
    return 2800;
  },
  pig(cr,lv){ // rolls in the mud and sniffs out a truffle
    const p=cAt(cr);Sound.sfx.cry("snort");vShout(cr,"OINK OINK!");cAnim(cr,"c-spin",700);
    puffAt(p.x,p.feet,"rgba(120,80,45,.9)",12,{dy:-34,spread:p.w*.8,size:14,jit:40});
    setTimeout(()=>{cAnim(cr,"c-wiggle",1500);Sound.sfx.cry("snort");
      const q=cAt(cr);puffAt(q.x,q.feet,"rgba(120,80,45,.9)",6,{dy:-20,spread:p.w*.6,size:10});},800);
    setTimeout(()=>{const q=cAt(cr);
      if(gift("pig",lv,q.x,q.feet,"Snuffle snuffle — a truffle gem!"))fx(q.x+q.dir*20,q.feet,"🍄",{uy:-30,dy:-50,d:1.2});
      else fx(q.x,q.head,"💩",{uy:-10,dy:-30,jit:0,d:1,size:18});},1800);
    return 2500;
  },
  duck(cr,lv){ // ducklings follow in a line
    const p=cAt(cr),dir=cr.c<COLS/2?1:-1;Sound.sfx.cry("quack");vShout(cr,"QUACK!");
    moveCritter(cr,dir*3,0);
    for(let i=0;i<2+lv;i++)fx(p.x-dir*(20+i*18),p.feet-1,"🐥",{uy:-6,ux:dir*60,dx:dir*170,dy:-2,jit:3,d:1.9,size:16,delay:.2+i*.18});
    setTimeout(()=>{Sound.sfx.cry("quack");cAnim(cr,"c-wiggle",1500);const q=cAt(cr);
      puffAt(q.x,q.feet,"rgba(200,235,255,.95)",6,{dy:-24,spread:q.w*.6});},1400);
    return 2400;
  },
  frog(cr,lv){ // giant leap, tongue snatches a fly
    const p=cAt(cr),dir=Math.random()<.5?-1:1;Sound.sfx.cry("croak");vShout(cr,"RIBBIT!");
    fx(p.x+dir*40,p.head-4,"🪰",{ux:dir*20,uy:-10,dx:-dir*10,dy:0,jit:10,d:1.4,size:16});
    cAnim(cr,"c-leap",800);setTimeout(()=>moveCritter(cr,dir*3,0),120);
    setTimeout(()=>{Sound.sfx.gulp();vShout(cr,"GULP!");const q=cAt(cr);fx(q.x,q.head,"😋",{uy:-20,dy:-40,jit:0,size:20});},1300);
    return 2000;
  },
  fish(cr,lv){ // leaps out with a splash
    const p=cAt(cr);Sound.sfx.cry("splash");vShout(cr,"SPLASH!");cAnim(cr,"c-leap",800);
    fx(p.x,p.feet,"💦",{n:4,uy:-40,dy:10,jit:60,d:.9,size:18});
    setTimeout(()=>{Sound.sfx.veh("splash");puffAt(p.x,p.feet,"rgba(200,235,255,.95)",10,{dy:-40,spread:p.w,size:12});
      fx(p.x,p.mid,"✨",{n:4,jit:60,uy:-30,dy:-60,size:14});},700);
    return 1600;
  },
  bug(cr,lv){ // flips on its back, wiggles, boings upright
    const p=cAt(cr);Sound.sfx.cry("buzz");vShout(cr,"BZZZ!");cAnim(cr,"c-flip",1600);
    setTimeout(()=>{Sound.sfx.boing();vShout(cr,"BOING!");},1300);
    setTimeout(()=>{const q=cAt(cr);if(!gift("bug",lv,q.x,q.feet,"The beetle rolled you a gem!"))
      fx(q.x,q.feet-1,"🟤",{ux:q.dir*40,uy:-4,dx:q.dir*90,dy:-2,jit:4,r:q.dir*360,size:14});},1700);
    return 2200;
  },
  bat(cr,lv){ // hangs upside down and pings its sonar
    const p=cAt(cr);Sound.sfx.cry("screech");vShout(cr,"SKREEE!");cAnim(cr,"c-flip",1600);
    ring(p.x,p.mid,{n:3,size:140,color:"rgba(180,150,255,.9)",gap:.25});
    for(let i=0;i<2+lv;i++)fx(p.x,p.mid,"🦇",{ux:(Math.random()-.5)*160,uy:-80,dx:(Math.random()-.5)*300,dy:-200,jit:40,d:1.4,size:16,delay:.3+i*.12});
    return 1800;
  },
  croc(cr,lv){ // chomp chomp chomp
    const p=cAt(cr);Sound.sfx.cry("snap");vShout(cr,"SNAP SNAP!");cAnim(cr,"c-chomp",1000);
    [0,220,440].forEach(t=>setTimeout(()=>Sound.sfx.cry("snap"),t));
    puffAt(p.x+p.dir*p.w*.3,p.feet,"rgba(200,235,255,.95)",8,{dy:-26,spread:p.w*.6});
    setTimeout(()=>others(cr,o=>within(o,cr,2)).forEach(o=>moveCritter(o,Math.sign(o.c-cr.c||1)*2,0,true)),300);
    return 1400;
  },
  shark(cr,lv){ // dives under, fin circles, bursts out
    const p=cAt(cr);Sound.sfx.cry("chomp");vShout(cr,"DUN DUN...");cAnim(cr,"c-sink",1500);
    fx(p.x-60,p.feet-1,"🔺",{ux:120,uy:0,dx:0,dy:0,jit:0,d:1.3,size:20,hold:1});
    setTimeout(()=>{cAnim(cr,"c-leap",800);Sound.sfx.cry("chomp");vShout(cr,"CHOMP!");shake();
      puffAt(p.x,p.feet,"rgba(200,235,255,.95)",14,{dy:-50,spread:p.w,size:14});},1400);
    return 2300;
  },
  wolf(cr,lv){ // howls at the moon, the pack answers
    const p=cAt(cr);Sound.sfx.cry("howl");vShout(cr,"AWOOOO!");cAnim(cr,"c-big",1200);
    fx(p.x,p.head-6,"🌕",{uy:-40,dy:-60,jit:0,d:1.8,size:34});
    others(cr,o=>["wolf","dog","fox"].includes(o.id)).slice(0,4).forEach((o,i)=>setTimeout(()=>{
      act(o,"roar");Sound.sfx.cry(o.id==="wolf"?"howl":o.id==="dog"?"bark":"yip");vShout(o,o.id==="wolf"?"AWOO!":"ARF!");},700+i*450));
    return 2000;
  },
  bear(cr,lv){ // stands up tall, bees and honey
    const p=cAt(cr);Sound.sfx.cry("roar");vShout(cr,"ROAR!");cAnim(cr,"c-big",1100);shake();
    for(let i=0;i<3;i++)fx(p.x,p.head,"🐝",{ux:(Math.random()-.5)*80,uy:-40,dx:(Math.random()-.5)*160,dy:-90,jit:30,d:1.5,size:15,delay:.4+i*.15});
    setTimeout(()=>{Sound.sfx.cry("buzz");},500);
    setTimeout(()=>{const q=cAt(cr);if(gift("bear",1+lv,q.x,q.feet,"Honey! Sweet gems!"))fx(q.x+q.dir*18,q.mid,"🍯",{uy:-30,dy:-50});},1300);
    return 2000;
  },
  boar(cr,lv){ // charges across and scatters everyone in the way
    const p=cAt(cr),dir=cr.c<COLS/2?1:-1;Sound.sfx.cry("snort");vShout(cr,"CHARGE!");cAnim(cr,"c-crouch",600);
    setTimeout(()=>{const c0=cr.c,inPath=others(cr,o=>o.r===cr.r&&(o.c-c0)*dir>0&&(o.c-c0)*dir<=6);
      moveCritter(cr,dir*5,0,true);Sound.sfx.veh("whoosh");
      for(let i=0;i<4;i++)setTimeout(()=>{const q=cAt(cr);puffAt(q.x-q.dir*q.w*.4,q.feet,"rgba(190,160,110,.9)",4,{dy:-20,size:14});},i*140);
      inPath.forEach(o=>{act(o,"pounce");moveCritter(o,0,o.r>ROWS_MAX-state.rows?-1:1,true);});},600);
    return 1800;
  },
  tiger(cr,lv){ // crouch, wiggle, mega-pounce
    const p=cAt(cr),dir=Math.random()<.5?-1:1;Sound.sfx.growl(80,.8,.12);vShout(cr,"grrr...");cAnim(cr,"c-crouch",900);
    setTimeout(()=>{cAnim(cr,"c-leap",800);moveCritter(cr,dir*3,0);Sound.sfx.cry("roar");vShout(cr,"RAWR!");},900);
    setTimeout(()=>{const q=cAt(cr);shake();puffAt(q.x,q.feet,"rgba(240,225,190,.9)",10,{dy:-30,spread:q.w,size:14});
      fx(q.x,q.mid,"💥",{uy:-10,dy:-20,jit:0,d:.7,size:30});},1600);
    return 2200;
  },
  hawk(cr,lv){ // soars out of sight and dive-bombs back
    const p=cAt(cr);Sound.sfx.cry("screech");vShout(cr,"SKREE!");cAnim(cr,"c-dive",1600);
    for(let i=0;i<3;i++)fx(p.x,p.mid,"🪶",{ux:(i-1)*30,uy:-10,dx:(i-1)*60,dy:30,r:(i-1)*120,size:14,delay:.2+i*.1});
    setTimeout(()=>{Sound.sfx.veh("whoosh");},800);
    setTimeout(()=>{shake();puffAt(p.x,p.feet,"rgba(240,225,190,.9)",8,{dy:-24,spread:p.w,size:12});},1250);
    return 1900;
  },
  lion(cr,lv){ // the big one: a roar that blows everyone back
    const p=cAt(cr);Sound.sfx.cry("roar");setTimeout(()=>Sound.sfx.cry("roar"),350);vShout(cr,"ROOOAAR!");cAnim(cr,"c-big",1200);shake();
    ring(p.x,p.mid,{n:3,size:260,color:"rgba(255,214,110,.9)",gap:.2,d:.9});
    fx(p.x,p.mid,"🍃",{n:8,ux:0,uy:-20,dx:0,dy:-40,jit:320,d:1.2,size:16,r:180});
    setTimeout(()=>others(cr,o=>within(o,cr,4)).forEach(o=>moveCritter(o,Math.sign(o.c-cr.c||1)*2,0,true)),350);
    return 1800;
  },
  trex(cr,lv){ // STOMP STOMP STOMP — the whole valley jumps
    const p=cAt(cr);vShout(cr,"STOMP!");cAnim(cr,"c-stomp",1400);
    [0,450,900].forEach((t,i)=>setTimeout(()=>{Sound.sfx.thud();Sound.sfx.growl(50,.3,.18);shake();const q=cAt(cr);
      puffAt(q.x,q.feet,"rgba(190,160,110,.9)",8,{dy:-20,spread:q.w,size:16});
      if(i===2){others(cr).forEach(o=>act(o,"pounce"));(state.vehicles||[]).forEach(v=>v._el&&vClass(v,"bounce",500));}},t+160));
    setTimeout(()=>{Sound.sfx.cry("roar");vShout(cr,"ROAR!");},1500);
    return 2300;
  },
  dragon(cr,lv){ // breathes fire
    const p=cAt(cr),dir=p.dir;Sound.sfx.fire();vShout(cr,"FWOOOSH!");cAnim(cr,"c-hover",1600);
    for(let i=0;i<10;i++)setTimeout(()=>{const q=cAt(cr);
      puffAt(q.x+dir*q.w*.35,q.head-3,i%2?"rgba(255,150,40,.95)":"rgba(255,220,90,.95)",3,{dx:dir*(120+lv*30),dy:-20,size:18,jit:30,d:.6});},300+i*70);
    fx(p.x+dir*80,p.head-3,"🔥",{n:3,ux:dir*60,uy:-10,dx:dir*140,dy:-40,jit:30,stagger:.12,delay:.4,size:22});
    return 2000;
  }
};

function nameThatAnimal(id){
  Quests.hit("name");
  const name=NAMES[id]||id, m=CRIT(id);
  const pool=state.critters.filter(x=>x.id===id&&x._el);
  const cr=pool.find(x=>!x._busy)||pool[0];
  let wait=520;
  if(cr&&!cr._busy&&ANTICS[id]){
    cr._busy=1;let ms=1800;
    try{ms=ANTICS[id](cr,cr.lv||1)||1800;}catch(e){}
    setTimeout(()=>{cr._busy=0;save();},ms);
    wait=Math.min(1400,ms*.55);
  }else{
    if(cr){act(cr,"roar");const g=geom(cr.c,cr.r);sparkleBurst(toView(g.x),g.y*100,6);}
    if(m){Sound.sfx.cry(m.cry);if(m.rar>=2)shake();}else Sound.sfx.pop();
  }
  toast(name.toUpperCase()+"!");
  setTimeout(()=>Sound.say("word:"+id.toLowerCase(),name,.85),m?wait:0);
}

/* ---- passengers: taxi and bus pick animals up and drop them off ---- */
function giveRide(v,seats,shout){
  const riders=state.critters.filter(o=>o._el&&o.out!==false&&!o._busy&&!["fish","shark","bat","hawk","dragon","duck"].includes(o.id))
    .sort((a,b)=>(Math.abs(a.c-v.c)+Math.abs(a.r-v.r))-(Math.abs(b.c-v.c)+Math.abs(b.r-v.r))).slice(0,seats);
  v.busy=1;vShout(v,shout);
  riders.forEach((o,i)=>{o._busy=1;setTimeout(()=>{moveCritter(o,v.c-o.c,v.r-o.r,true);},i*250);
    setTimeout(()=>{o._el&&o._el.classList.add("riding");Sound.sfx.pop();},700+i*250);});
  const board=900+riders.length*250;
  setTimeout(()=>{
    const far=v.c<COLS/2?5:-5, secs=driveVehicle(v,far,0,.3);
    setTimeout(()=>{
      riders.forEach((o,i)=>setTimeout(()=>{
        const f=freeSpot(v.c,v.r,o);o.c=f.c;o.r=f.r;moveCritter(o,0,0);
        o._el&&o._el.classList.remove("riding");act(o,"pounce");Sound.sfx.pop();o._busy=0;},i*300));
      if(riders.length)setTimeout(()=>vShout(v,"THANK YOU!"),200);
      setTimeout(()=>{v.busy=0;save();},riders.length*300+200);
    },secs*1000+150);
  },board);
}

/* ---- scenery pokes ---- */
const SCENERY_POKE={
  tree:(x,y,s)=>{Sound.sfx.soft();fx(x,y-s*.6,"🍎",{n:2+Math.floor(Math.random()*2),uy:-10,dy:s*.9,jit:50,d:.9,r:90});
    fx(x,y-s*.7,"🍃",{n:3,uy:-10,dy:60,jit:80,d:1.4,r:180,size:14});if(Math.random()<.35){Sound.sfx.cry("squawk");fx(x,y-s*.8,"🐦",{ux:60,uy:-90,dx:200,dy:-220,jit:10,d:1.5,size:20});}},
  pine:(x,y,s)=>{Sound.sfx.soft();fx(x,y-s*.5,biome().id==="peak"?"❄️":"🌰",{n:3,uy:-10,dy:s*.8,jit:50,d:1,size:16,r:120});
    if(Math.random()<.35)fx(x,y-s*.5,"🐿️",{ux:30,uy:-30,dx:90,dy:0,jit:10,d:1.2,size:20});},
  flower:(x,y,s)=>{Sound.sfx.chime();fx(x,y-s*.4,"🦋",{ux:40,uy:-70,dx:-30,dy:-170,jit:40,d:1.8,size:20});
    fx(x,y-s*.3,"🌸",{n:3,uy:-20,dy:-40,jit:50,d:1,size:12});},
  grass:(x,y,s)=>{Sound.sfx.dig();fx(x,y-s*.2,"🦗",{ux:30,uy:-60,dx:80,dy:0,jit:30,d:.9,size:16});},
  bush:(x,y,s)=>{Sound.sfx.soft();fx(x,y-s*.3,"🫐",{n:3,uy:-30,dy:10,jit:50,d:.9,size:14});
    if(Math.random()<.4)fx(x,y-s*.2,"🐰",{uy:-30,dy:0,jit:0,d:1.3,size:22});},
  stone:(x,y,s,key)=>{Sound.sfx.thud();if(!(Math.random()<.3&&gift("stone",1,x,y,"A gem under the rock!")))fx(x,y-s*.1,Math.random()<.5?"🐛":"🐜",{ux:20,uy:-10,dx:50,dy:0,jit:10,d:1.2,size:16});},
  mushroom:(x,y,s)=>{Sound.sfx.boing();fx(x,y-s*.5,"✨",{n:5,uy:-40,dy:-60,jit:60,size:12});},
  water:(x,y,s)=>{Sound.sfx.veh("splash");fx(x,y-s*.2,"🐟",{uy:-60,dy:0,jit:10,d:1,r:200,size:20});
    puffAt(x,y-1,"rgba(200,235,255,.95)",8,{dy:-30,spread:s*.6});},
  steps:(x,y,s)=>{[0,150,300].forEach(t=>setTimeout(()=>Sound.sfx.thud(),t));fx(x,y-s*.3,"👣",{uy:-30,dy:-50,jit:0,size:18});},
  wood:(x,y,s)=>{Sound.sfx.thud();fx(x,y-s*.3,Math.random()<.5?"🐿️":"🦔",{uy:-40,dy:-10,jit:0,d:1.4,size:22});},
  snow:(x,y,s)=>{Sound.sfx.soft();puffAt(x,y-2,"rgba(255,255,255,.95)",10,{dy:-40,spread:s*.6,size:12});fx(x,y-s*.3,"⛄",{uy:-30,dy:-40,jit:0,d:1.4});},
  crystal:(x,y,s)=>{Sound.sfx.chime();fx(x,y-s*.5,"💠",{n:4,uy:-50,dy:-80,jit:70,size:14});ring(x,y-5,{size:90,color:"rgba(150,220,255,.9)"});}
};
function pokeScenery(el){
  if(el._poked)return;el._poked=1;setTimeout(()=>el._poked=0,700);
  const id=el.dataset.scn,x=+el.dataset.x,y=+el.dataset.y,s=+el.dataset.s;
  el.classList.remove("poke");void el.offsetWidth;el.classList.add("poke");setTimeout(()=>el.classList.remove("poke"),600);
  try{(SCENERY_POKE[id]||SCENERY_POKE.bush)(x,y,s,el.dataset.key);}catch(e){}
  Quests.hit("poke");
}
