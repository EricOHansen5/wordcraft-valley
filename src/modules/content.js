/* ================================================================
   v4.2 CONTENT — new lands, animals, vehicles, buildings and hats
   Three new lands follow Snow Peak: Sandy Shore, Jungle, Volcano Island.
   Every new animal and vehicle has its own signature move, and every
   new building does something when tapped.
   ================================================================ */
// a charge along the row that scatters anything in the way (boar, rhino)
function chargeRow(cr,cells,label){
  const dir=cr.c<COLS/2?1:-1,c0=cr.c;
  const inPath=others(cr,o=>o.r===cr.r&&(o.c-c0)*dir>0&&(o.c-c0)*dir<=cells+1);
  moveCritter(cr,dir*cells,0,true);Sound.sfx.veh("whoosh");
  for(let i=0;i<4;i++)setTimeout(()=>{const q=cAt(cr);puffAt(q.x-q.dir*q.w*.4,q.feet,"rgba(190,160,110,.9)",4,{dy:-20,size:14});},i*140);
  inPath.forEach(o=>{act(o,"pounce");moveCritter(o,0,o.r>ROWS_MAX-state.rows?-1:1,true);});
  if(label)vShout(cr,label);
}
function snowfall(n,ms){
  const W=document.getElementById("weather");if(!W)return;
  for(let i=0;i<n;i++){const f=document.createElement("div");f.className="flake";f.textContent="❄";
    f.style.cssText=`left:${Math.random()*100}%;top:-4%;font-size:${10+Math.random()*10}px;animation-duration:${3+Math.random()*3}s;animation-delay:${Math.random()}s`;
    W.appendChild(f);setTimeout(()=>f.remove(),ms||7000);}
}
Object.assign(ANTICS,{
  rabbit(cr,lv){ // three big zig-zag hops
    Sound.sfx.cry("squeak");vShout(cr,"HOP HOP HOP!");const dir=cr.c<COLS/2?1:-1;
    [0,420,840].forEach((t,i)=>setTimeout(()=>{cAnim(cr,"c-leap",700);moveCritter(cr,dir,i%2?1:-1);Sound.sfx.boing();},t));
    setTimeout(()=>{const q=cAt(cr);if(!gift("rabbit",lv,q.x,q.feet,"The rabbit found a gem in the carrots!"))
      fx(q.x,q.head,"🥕",{uy:-30,dy:-50,jit:0,size:22});},1500);
    return 2000;
  },
  raccoon(cr,lv){ // rummages and pulls out random stuff
    Sound.sfx.cry("chitter");vShout(cr,"RUMMAGE!");cAnim(cr,"c-wiggle",1500);
    const junk=["🧦","🍌","🔑","🥫","🧸","🍕"];
    for(let i=0;i<3;i++)setTimeout(()=>{const q=cAt(cr);Sound.sfx.pop();
      fx(q.x,q.mid,junk[Math.floor(Math.random()*junk.length)],{ux:(i-1)*50,uy:-70,dx:(i-1)*90,dy:10,jit:10,r:(i-1)*200,size:20,d:1.1});},300+i*350);
    setTimeout(()=>{const q=cAt(cr);gift("raccoon",lv,q.x,q.feet,"Something shiny in the pile!");},1500);
    return 2000;
  },
  penguin(cr,lv){ // belly slide
    Sound.sfx.cry("squawk");vShout(cr,"WHEEE!");cAnim(cr,"c-slide",1600);Sound.sfx.veh("whee");
    const dir=cr.c<COLS/2?1:-1;setTimeout(()=>moveCritter(cr,dir*4,0,true),200);
    for(let i=0;i<5;i++)setTimeout(()=>{const q=cAt(cr);puffAt(q.x-q.dir*q.w*.3,q.feet,"rgba(255,255,255,.95)",3,{dy:-16,size:10});},200+i*150);
    return 1800;
  },
  mammoth(cr,lv){ // trumpets and shakes the snow loose
    Sound.sfx.cry("trumpet");vShout(cr,"HRRRUUU!");cAnim(cr,"c-stomp",1400);
    [150,600,1050].forEach(t=>setTimeout(()=>{Sound.sfx.thud();shake();},t));snowfall(26+lv*8,6500);
    return 2000;
  },
  crab(cr,lv){ // scuttles sideways, snap snap
    Sound.sfx.cry("snap");vShout(cr,"SNIP SNAP!");cAnim(cr,"c-chomp",1000);
    setTimeout(()=>moveCritter(cr,2,0,true),250);setTimeout(()=>moveCritter(cr,-2,0,true),800);
    setTimeout(()=>{const q=cAt(cr);if(!gift("crab",lv,q.x,q.feet,"The crab found a pearl gem!"))fx(q.x,q.head,"🐚",{uy:-20,dy:-40,jit:0});},1300);
    return 1800;
  },
  lobster(cr,lv){ // snips, then zooms backwards
    Sound.sfx.cry("snap");vShout(cr,"SNIP!");cAnim(cr,"c-chomp",900);
    setTimeout(()=>{const q=cAt(cr);moveCritter(cr,-q.dir*3,0,true);cr.face=q.dir>0?"r":"l";cr._el&&cr._el.classList.toggle("face-r",cr.face==="r");
      puffAt(q.x,q.feet,"rgba(200,235,255,.95)",8,{dy:-24,spread:q.w*.6});Sound.sfx.veh("splash");},800);
    return 1600;
  },
  seal(cr,lv){ // balances a ball, claps
    Sound.sfx.cry("bark");vShout(cr,"ARF ARF!");const p=cAt(cr);
    fx(p.x+p.dir*p.w*.3,p.head-2,"🔴",{uy:-60,dy:0,jit:0,d:1.6,size:20,hold:1});
    [500,800,1100].forEach(t=>setTimeout(()=>{cAnim(cr,"c-wiggle",400);Sound.sfx.pop();},t));
    setTimeout(()=>{const q=cAt(cr);fx(q.x,q.head,"👏",{uy:-20,dy:-40,jit:0,size:20});},1300);
    return 1900;
  },
  octopus(cr,lv){ // ink cloud, vanishes, reappears
    Sound.sfx.cry("blub");vShout(cr,"BLOOP!");const p=cAt(cr);
    puffAt(p.x,p.mid,"rgba(60,40,90,.85)",16,{dy:-10,spread:p.w,size:26,jit:60,d:1.4});cAnim(cr,"c-sink",1400);
    setTimeout(()=>moveCritter(cr,(Math.random()<.5?-1:1)*3,0),600);
    setTimeout(()=>{const q=cAt(cr);Sound.sfx.pop();fx(q.x,q.mid,"🫧",{n:4,uy:-40,dy:-80,jit:40,size:16});},1300);
    return 1900;
  },
  dolphin(cr,lv){ // flip with a rainbow
    Sound.sfx.cry("click");vShout(cr,"EEK EEK!");cAnim(cr,"c-leap",800);
    setTimeout(()=>cAnim(cr,"c-spin",700),300);const p=cAt(cr);
    fx(p.x,p.head-4,"🌈",{uy:-40,dy:-60,jit:0,d:1.8,size:34});
    setTimeout(()=>{Sound.sfx.veh("splash");puffAt(p.x,p.feet,"rgba(200,235,255,.95)",12,{dy:-40,spread:p.w,size:12});},900);
    return 1700;
  },
  whale(cr,lv){ // spouts a fountain that rains down
    Sound.sfx.cry("whale");vShout(cr,"WHOOSH!");cAnim(cr,"c-big",1200);const p=cAt(cr);
    for(let i=0;i<8;i++)setTimeout(()=>puffAt(p.x,p.head,"rgba(170,220,255,.95)",3,{dy:-120,size:14,jit:30,d:.9}),i*80);
    fx(p.x,p.head-12,"💧",{n:6+lv*2,uy:-40,dy:40,jit:160,d:1.5,size:16,stagger:.06,delay:.5});
    return 2000;
  },
  monkey(cr,lv){ // backflip, throws a banana to a friend
    Sound.sfx.cry("ook");vShout(cr,"OOK OOK!");cAnim(cr,"c-spin",700);
    const t=others(cr).sort((a,b)=>Math.abs(a.c-cr.c)-Math.abs(b.c-cr.c))[0];
    setTimeout(()=>{const p=cAt(cr);
      if(t){const q=cAt(t);const vh=(document.getElementById("stage")||document.body).clientHeight||800;fx(p.x,p.mid,"🍌",{ux:(q.x-p.x)/2,uy:-80,dx:q.x-p.x,dy:(q.mid-p.mid)*vh/100,jit:0,r:540,d:1});
        setTimeout(()=>{act(t,"pounce");vShout(t,"YUM!");},900);}
      else fx(p.x,p.mid,"🍌",{uy:-80,dy:-20,r:540});},600);
    setTimeout(()=>{const q=cAt(cr);gift("monkey",lv,q.x,q.feet,"The monkey shared a gem!");},1600);
    return 2000;
  },
  parrot(cr,lv){ // repeats the last word he read
    const w=state.lastWord||["cat","dog","fox","sun","pig"][Math.floor(Math.random()*5)];
    Sound.sfx.cry("squawk");cAnim(cr,"c-wiggle",1500);vShout(cr,w.toUpperCase()+"!");
    setTimeout(()=>Sound.say("word:"+w,w,.95),250);
    const p=cAt(cr);fx(p.x,p.head,"🪶",{n:3,uy:-30,dy:20,jit:50,r:180,size:14});
    return 3200;
  },
  sloth(cr,lv){ // the slowest yawn in the valley
    Sound.sfx.cry("yawn");vShout(cr,"yaaawn...");cAnim(cr,"c-nap",3000);
    const p=cAt(cr);fx(p.x+10,p.head,"💤",{n:3,ux:12,uy:-25,dx:26,dy:-55,jit:6,stagger:.7,d:1.6,size:18});
    if(cr._el){cr._el.style.transitionDuration="3s";setTimeout(()=>{moveCritter(cr,cr.c<COLS/2?1:-1,0);},400);
      setTimeout(()=>cr._el&&(cr._el.style.transitionDuration=""),3500);}
    return 3600;
  },
  snake(cr,lv){ // slithers and hisses
    Sound.sfx.cry("hiss");vShout(cr,"SSSSS!");cAnim(cr,"c-wiggle",1500);
    setTimeout(()=>moveCritter(cr,(Math.random()<.5?-1:1)*2,0),200);
    others(cr,o=>within(o,cr,2)).forEach(o=>setTimeout(()=>{act(o,"pounce");moveCritter(o,Math.sign(o.c-cr.c||1)*2,0,true);},400));
    return 1600;
  },
  elephant(cr,lv){ // sprays everyone nearby
    Sound.sfx.cry("trumpet");vShout(cr,"TOOT TOOOT!");cAnim(cr,"c-big",1100);const dir=cAt(cr).dir;
    for(let i=0;i<10;i++)setTimeout(()=>{const q=cAt(cr);
      puffAt(q.x+dir*q.w*.4,q.head,"rgba(170,220,255,.95)",3,{dx:dir*(110+lv*30),dy:-40,size:14,jit:30,d:.7});},300+i*70);
    setTimeout(()=>{others(cr,o=>within(o,cr,3)).forEach(o=>{cAnim(o,"c-wiggle",1500);vShout(o,"SPLASH!");});
      if(Math.random()<.5){const q=cAt(cr);fx(q.x+dir*80,q.head-6,"🌈",{uy:-20,dy:-40,jit:0,d:1.6,size:34});}},900);
    return 1900;
  },
  gorilla(cr,lv){ // chest pound — bananas fall from the sky
    vShout(cr,"BOOM BOOM!");cAnim(cr,"c-stomp",1400);
    [0,220,440,660].forEach(t=>setTimeout(()=>{Sound.sfx.drum();shake();},t));
    const p=cAt(cr);ring(p.x,p.mid,{n:3,size:220,color:"rgba(255,214,110,.9)",gap:.22});
    fx(p.x,p.head-30,"🍌",{n:4+lv*2,uy:-10,dy:110,jit:220,d:1.2,r:200,stagger:.07,delay:.6});
    setTimeout(()=>{Sound.sfx.cry("roar");const q=cAt(cr);gift("gorilla",1+lv,q.x,q.feet,"A golden banana gem!");},1100);
    return 2000;
  },
  lizard(cr,lv){ // changes colour
    Sound.sfx.cry("chitter");vShout(cr,"COLOR CHANGE!");cAnim(cr,"c-color",2400);
    const p=cAt(cr);fx(p.x,p.head,"✨",{n:5,uy:-30,dy:-60,jit:70,size:14});
    return 2400;
  },
  scorpion(cr,lv){ // tail strike
    Sound.sfx.cry("chitter");vShout(cr,"STING!");cAnim(cr,"c-crouch",700);
    setTimeout(()=>{cAnim(cr,"c-chomp",900);Sound.sfx.cry("snap");const q=cAt(cr);
      fx(q.x+q.dir*q.w*.3,q.mid,"💥",{uy:-10,dy:-20,jit:0,d:.7,size:28});},650);
    return 1600;
  },
  rhino(cr,lv){ // stamps twice, then charges the whole row
    Sound.sfx.cry("snort");vShout(cr,"STAMP STAMP!");cAnim(cr,"c-crouch",800);
    [0,380].forEach(t=>setTimeout(()=>{Sound.sfx.thud();const q=cAt(cr);puffAt(q.x,q.feet,"rgba(190,160,110,.9)",4,{dy:-20,size:14});},t));
    setTimeout(()=>{chargeRow(cr,6,"CHARGE!");shake();},800);
    return 2000;
  },
  eagle(cr,lv){ // dives and comes up with a fish
    Sound.sfx.cry("screech");vShout(cr,"SKREE!");cAnim(cr,"c-dive",1600);
    setTimeout(()=>{Sound.sfx.veh("splash");const p=cAt(cr);puffAt(p.x,p.feet,"rgba(200,235,255,.95)",8,{dy:-30,spread:p.w});
      fx(p.x,p.mid,"🐟",{uy:-60,dy:-120,jit:0,d:1.3,size:20});},1200);
    return 1900;
  },
  sauropod(cr,lv){ // stretches up and munches treetops
    vShout(cr,"MUNCH MUNCH!");cAnim(cr,"c-stretch",1800);Sound.sfx.cry("bellow");
    [200,700,1200].forEach(t=>setTimeout(()=>{Sound.sfx.thud();shake();},t));
    const p=cAt(cr);fx(p.x+p.dir*p.w*.3,p.head-8,"🍃",{n:6,uy:-10,dy:40,jit:90,d:1.4,r:180,stagger:.12,size:16});
    return 2000;
  }
});

/* ---- vehicle stunts for the new ones ---- */
function newVehicleAct(v,m){
  const dir=v.face==="r"?1:-1,a=vehAnchor(v),far=v.c<COLS/2?COLS-1-v.c:-v.c;
  switch(m.act){
    case "dig":Sound.sfx.veh("engine");vShout(v,"DIG DIG!");vClass(v,"dig",1700);v.busy=1;
      setTimeout(()=>{const b=vehAnchor(v);Sound.sfx.dig();puffAt(b.front,b.top,"rgba(140,95,55,.9)",10,{dy:-30,spread:30,size:14});
        if(!gift("digger",1+((v.lv||1)>1?1:0),b.front,b.top,"The digger dug up a gem!"))fx(b.front,b.top-2,"🪨",{uy:-40,dy:-10,jit:30,size:16});},650);
      setTimeout(()=>{v.busy=0;},1700);return 1;
    case "tipper":Sound.sfx.veh("backup");vShout(v,"TIP IT!");vClass(v,"tipper",2000);v.busy=1;
      setTimeout(()=>{const b=vehAnchor(v);Sound.sfx.thud();shake();vShout(v,"DUMP!");
        fx(b.rear,b.top-6,"🪨",{n:5,ux:-b.dir*25,uy:-20,dx:-b.dir*60,dy:4,jit:30,d:1,hold:1,size:16,stagger:.07});
        puffAt(b.rear-b.dir*30,b.top,"rgba(190,160,110,.9)",8,{dy:-30,spread:40,size:14});},800);
      setTimeout(()=>{v.busy=0;},2000);return 1;
    case "doze":Sound.sfx.veh("engine");vShout(v,"PUSH!");vClass(v,"doze",1300);
      fx(a.front+dir*20,a.top-2,"🪨",{n:3,ux:dir*50,uy:-4,dx:dir*120,dy:-2,jit:10,d:1.3,hold:1,size:18,stagger:.1});
      setTimeout(()=>driveVehicle(v,dir*3,0,.55),200);return 1;
    case "mix":Sound.sfx.veh("putt");vShout(v,"SLOSH SLOSH!");vClass(v,"mix",2500);
      for(let i=0;i<4;i++)setTimeout(()=>{const b=vehAnchor(v);puffAt(b.x,b.top-10,"rgba(170,170,170,.7)",2,{dy:-40,size:14});},i*450);return 1;
    case "lift":Sound.sfx.veh("putt");vShout(v,"UP UP UP!");vClass(v,"lift",2300);
      setTimeout(()=>{const b=vehAnchor(v);fx(b.front,b.top-2,"🧱",{uy:-60,dy:-110,jit:0,d:1.4,size:20});Sound.sfx.chime();},900);return 1;
    case "crush":Sound.sfx.veh("engine");vShout(v,"CRUSH!");vClass(v,"crush",1400);v.busy=1;
      setTimeout(()=>{const b=vehAnchor(v);Sound.sfx.thud();Sound.sfx.growl(50,.4,.2);shake();
        fx(b.x,b.top-1,"🚗",{uy:-4,dy:-2,jit:0,d:.9,size:22});puffAt(b.x,b.top,"rgba(190,160,110,.9)",12,{dy:-40,spread:b.w,size:16});},1050);
      setTimeout(()=>{v.busy=0;driveVehicle(v,dir*3,0,.25);},1500);return 1;
    case "ding":Sound.sfx.veh("bell");setTimeout(()=>Sound.sfx.veh("bell"),350);vShout(v,"DING DING!");
      setTimeout(()=>driveVehicle(v,far>0?5:-5,0,.35),400);return 1;
    case "dive":Sound.sfx.veh("beep");vShout(v,"DIVE! DIVE!");vClass(v,"submerge",2400);
      fx(a.x,a.top-4,"🫧",{n:6,uy:-40,dy:-90,jit:60,size:16,stagger:.15,delay:.4});
      setTimeout(()=>{Sound.sfx.veh("splash");vShout(v,"SURFACE!");},2100);return 1;
    case "glide":Sound.sfx.veh("bell");vShout(v,"GLIDE!");vClass(v,"swing",1600);driveVehicle(v,far>0?4:-4,0,.6);return 1;
    case "tuktuk":Sound.sfx.tuk();vShout(v,"TUK TUK!");
      {let n=0;const zz=()=>{if(n++>=3)return;driveVehicle(v,dir*2,n%2?-1:1,.2);setTimeout(zz,420);};zz();}return 1;
    case "whoosh":Sound.sfx.veh("whoosh");vShout(v,"WHOOSH!");driveVehicle(v,far,0,.14);vClass(v,"speed",900);return 1;
    case "bullet":{Sound.sfx.veh("whoosh");Sound.sfx.veh("engine");vShout(v,"ZOOOOM!");shake();v.busy=1;
      const s1=driveVehicle(v,far,0,.07);vClass(v,"speed",900);
      setTimeout(()=>{const s2=driveVehicle(v,-Math.round(far/2),0,.07);vClass(v,"speed",900);setTimeout(()=>v.busy=0,s2*1000);},s1*1000+200);return 1;}
    case "orbit":launchShuttle(v);return 1;
  }
  return 0;
}
function launchShuttle(v){
  if(v.busy)return;v.busy=1;const g=geom(v.c,v.r);bringIntoView(g.x);
  Sound.speak("Three. Two. One. Lift off!",.95);
  ["3","2","1"].forEach((n,i)=>setTimeout(()=>{const d=document.createElement("div");d.className="countdown";d.textContent=n;
    document.body.appendChild(d);setTimeout(()=>d.remove(),850);Sound.sfx.veh("bell");},i*700));
  setTimeout(()=>{Sound.sfx.veh("rocket");shake();vShout(v,"LIFT OFF!");vClass(v,"liftoff",2000);
    for(let i=0;i<8;i++)setTimeout(()=>{const a=vehAnchor(v);puffAt(a.x,a.top,i%2?"rgba(255,170,60,.95)":"rgba(240,240,240,.95)",4,{dy:40,size:18,jit:40,d:.8});},i*90);
    setTimeout(()=>{fx(g.x,20,"🛰️",{uy:-10,dy:-30,jit:0,d:1.8,size:28});},1800);
    setTimeout(()=>{if(v._el){v._el.classList.remove("liftoff");vClass(v,"touchdown",1500);}
      setTimeout(()=>{toast("The shuttle landed!");v.busy=0;},1400);},4200);},2150);
}

/* ---- new scenery pokes ---- */
Object.assign(SCENERY_POKE,{
  palm:(x,y,s)=>{Sound.sfx.thud();fx(x,y-s*.7,"🥥",{n:2,uy:-10,dy:s*.8,jit:40,d:.9,r:200});
    if(Math.random()<.3)setTimeout(()=>{Sound.sfx.cry("ook");fx(x,y-s*.6,"🐒",{uy:-30,dy:-10,jit:0,d:1.3});},400);},
  shell:(x,y,s)=>{Sound.sfx.veh("whoosh");fx(x,y-s*.2,"🦀",{ux:30,uy:-10,dx:80,dy:0,jit:10,d:1.3,size:20});fx(x,y-s*.4,"🌊",{uy:-30,dy:-40,jit:0,size:18});},
  coral:(x,y,s)=>{Sound.sfx.cry("blub");fx(x,y-s*.4,"🐠",{n:2,ux:40,uy:-40,dx:100,dy:-60,jit:60,d:1.4,size:18});fx(x,y-s*.3,"🫧",{n:3,uy:-40,dy:-80,jit:40,size:12});},
  herb:(x,y,s)=>{Sound.sfx.dig();fx(x,y-s*.3,Math.random()<.5?"🐸":"🦎",{ux:30,uy:-50,dx:70,dy:0,jit:20,d:1,size:18});},
  hibiscus:(x,y,s)=>{Sound.sfx.chime();fx(x,y-s*.4,Math.random()<.5?"🦜":"🐝",{ux:40,uy:-70,dx:-30,dy:-170,jit:40,d:1.8,size:20});fx(x,y-s*.3,"🌺",{n:2,uy:-20,dy:-40,jit:40,size:12});},
  rockv:(x,y,s,key)=>SCENERY_POKE.stone(x,y,s,key),
  flame:(x,y,s)=>{Sound.sfx.fire();puffAt(x,y-s*.3,"rgba(255,170,60,.95)",8,{dy:-60,spread:s*.4,size:10});fx(x,y-s*.5,Math.random()<.5?"🍡":"✨",{uy:-40,dy:-70,jit:20,size:18});},
  cactus:(x,y,s)=>{Sound.sfx.boing();fx(x,y-s*.8,"🌸",{uy:-30,dy:-50,jit:0,size:18});fx(x,y-s*.5,"💢",{uy:-10,dy:-30,jit:30,size:16});}
});

/* ---- new buildings ---- */
function newBuildingAct(key,id,p){
  const{c,r}=cellOf(key),g=geom(c,r),x=g.x,y=g.y*100;
  switch(id){
    case "lighthouse":{
      const b=document.createElement("div");b.className="beam";b.style.left=x+"px";b.style.top=(y-9)+"%";tilesEl.appendChild(b);setTimeout(()=>b.remove(),2600);
      Sound.sfx.chime();
      (state.vehicles||[]).filter(v=>v._el&&!v.busy&&(VEH(v.id)||{}).move==="water").forEach((v,i)=>setTimeout(()=>{
        driveVehicle(v,Math.max(-5,Math.min(5,c-v.c)),0,.5);Sound.sfx.veh("toot");},300+i*300));
      if(ready("lighthouse:"+key,150000)){arm("lighthouse:"+key);setTimeout(()=>payout(key,5,"A boat brought gems to the lighthouse!"),1800);}
      else toast("The light sweeps across the sea");
      return true;}
    case "castle":{
      Sound.sfx.fanfare();gatherAt(key);hearts(key,5);
      fx(x,y-12,"🎆",{n:5,uy:-80,dy:-140,jit:200,d:1.3,size:30,stagger:.18});
      fx(x,y-10,"🚩",{uy:-30,dy:-50,jit:0,d:1.4,size:22});
      if(ready("castle:"+key,180000)){arm("castle:"+key);setTimeout(()=>payout(key,8,"The castle treasury opened!"),1400);}
      else toast("Hear ye, hear ye! Everyone to the castle!");
      return true;}
    case "treasure":{
      if(!ready("treasure:"+key,300000)){toast("The chest is locked tight. Come back soon");Sound.sfx.soft();return true;}
      arm("treasure:"+key);Sound.sfx.chime();fx(x,y-6,"🗝️",{uy:-40,dy:-20,jit:0,d:1.2,size:26});
      toast("Read the word to open the treasure!");
      setTimeout(()=>{const w=pickCrates().find(o=>o.w&&o.p&&!o.swapPair&&!o.scramble);if(w)openWord({...w,bonus:true});},800);
      save();return true;}
    case "tiki":{
      toast("Drums! Everybody dance!");
      for(let i=0;i<6;i++)setTimeout(()=>{Sound.sfx.drum();if(i%2)fx(x,y-8,"🥁",{uy:-30,dy:-50,jit:40,d:.8,size:18});},i*300);
      state.critters.filter(o=>o._el&&o.out!==false&&!o._busy).forEach((o,i)=>setTimeout(()=>act(o,i%2?"pounce":"roar"),200+i*160));
      hearts(key,6);return true;}
    case "coaster":{
      Sound.sfx.veh("whee");buddySay("WHEEEE!");
      fx(x-40,y-6,"🚃",{ux:80,uy:-150,dx:160,dy:-10,jit:0,d:1.4,size:24});
      setTimeout(()=>{Sound.sfx.veh("whee");fx(x+120,y-6,"🚃",{ux:-60,uy:-120,dx:-160,dy:0,jit:0,d:1.4,size:24});},1200);
      if(ready("coaster:"+key,120000)){arm("coaster:"+key);setTimeout(()=>payout(key,3,"What a ride!"),2400);}
      return true;}
    case "volcano":{
      if(!ready("volcano:"+key,200000)){
        for(let i=0;i<3;i++)setTimeout(()=>puffAt(x,y-12,"rgba(110,100,100,.7)",3,{dy:-60,size:20,d:1.3}),i*300);
        Sound.sfx.rumble();toast("Rumble... it is getting ready");return true;}
      arm("volcano:"+key);Sound.sfx.rumble();toast("KABOOM!");
      [0,400,800].forEach(t=>setTimeout(shake,t));
      for(let i=0;i<14;i++)setTimeout(()=>puffAt(x,y-12,i%2?"rgba(255,120,40,.95)":"rgba(255,210,70,.95)",3,{dy:-140,size:18,jit:80,d:1}),i*90);
      fx(x,y-14,"💎",{n:8,uy:-160,dy:40,jit:300,d:1.6,size:20,stagger:.08,delay:.4});
      setTimeout(()=>payout(key,10,"KABOOM! Gems everywhere!"),1400);
      return true;}
    case "mine":{
      Sound.sfx.thud();Sound.sfx.dig();fx(x+18,y-10,"⛏️",{uy:-10,dy:10,jit:0,d:.6,r:-80,size:24});
      puffAt(x,y-5,"rgba(120,85,50,.95)",8,{dy:-30,spread:30,size:9});
      const roll=Math.random();
      setTimeout(()=>{
        if(roll<.08&&gift("mine:diamond",5,x,y-6,"DIAMOND!")){fx(x,y-8,"💎",{uy:-60,dy:-40,jit:0,d:1.4,size:28});}
        else if(roll<.3&&gift("mine:gold",2,x,y-6,"Gold!")){fx(x,y-8,"🟨",{uy:-60,dy:-40,jit:0,d:1.4,size:24});}
        else{const b=[["🟫","dirt"],["🪨","stone"],["🟩","grass"],["🪵","wood"]][Math.floor(Math.random()*4)];
          fx(x,y-8,b[0],{uy:-50,dy:-10,jit:30,d:1.2,size:24});toast("You mined a "+b[1]+" block");}},350);
      return true;}
    case "dinonest":{
      if(!ready("dinonest:"+key,240000)){toast("The eggs are warm... not yet");Sound.sfx.soft();fx(x,y-6,"🥚",{uy:-10,dy:-10,jit:0,d:.9,size:20});return true;}
      arm("dinonest:"+key);fx(x,y-6,"🥚",{uy:-14,dy:-14,jit:0,d:1.3,hold:1,size:26});
      setTimeout(()=>{Sound.sfx.pop();Sound.sfx.cry("roar");
        const pool=CRITTERS.filter(k=>["trex","sauropod","lizard","croc"].includes(k.id)&&k.b<=state.biome);
        const k=pool[Math.floor(Math.random()*pool.length)]||CRIT("lizard");const res=addItem(k.id);
        fx(x,y-8,"🐣",{uy:-40,dy:-60,jit:0,d:1.3,size:26});hearts(key,6);Sound.sfx.win();
        toast(arrival(k,res,"A baby "+k.name.toLowerCase()+" hatched!"));save();},1300);
      return true;}
  }
  return false;
}
