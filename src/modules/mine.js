/* ================================================================
   GEM MINE — a side-view mining game inside Wordcraft Valley
   Walk the little town, dig straight down, fill the backpack, sell at
   your own shop, buy a better pickaxe, dig deeper for rarer gems.
   Reading is built into the play so it cannot be skipped:
   · customers at the shop hand over written orders — read the order
     to know what to give them;
   · word stones only crack when the word is matched to its picture.
   Drawn on a canvas (blocky pixel textures, like Minecraft); the
   panels are ordinary DOM.
   ================================================================ */
// older iPads lack canvas roundRect
if(typeof CanvasRenderingContext2D!=="undefined"&&!CanvasRenderingContext2D.prototype.roundRect)
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(r,w/2,h/2);this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);
    this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();};
const MW=50, SKY=6, MDEPTH=120, MH=SKY+MDEPTH, TOWN=19, SPAWN_X=20.2;
const T={AIR:0,GRASS:1,DIRT:2,STONE:3,DEEP:4,HOT:5,CRYS:6,BED:7,LAVA:8,FOUND:9,SEAL:10,LADDER:11,TORCH:12,SIGN:13,SAND:14,VAULT:15,VDOOR:16};
const HARD={1:1,2:1,3:2,4:3,5:4,6:5,8:4,11:1,12:1,13:1,14:1};
// ladders, torches and signs can be walked through
const PASS={11:1,12:1,13:1};
const LAYERS=[{d:1,name:"Dirt",tile:T.DIRT},{d:11,name:"Stone Cave",tile:T.STONE},{d:36,name:"Deep Rock",tile:T.DEEP},
  {d:61,name:"Lava Land",tile:T.HOT},{d:86,name:"Crystal Core",tile:T.CRYS}];
// ore 1..8, 9 = word stone, 10 = treasure chest
const ORES=[null,
  {id:"coal",name:"coal rock",pl:"coal rocks",val:2,col:"#2A2626",hi:"#6A6262",min:1,max:50,p:.075},
  {id:"tin",name:"tin rock",pl:"tin rocks",val:3,col:"#D8DEE6",hi:"#FFFFFF",min:3,max:60,p:.06},
  {id:"ruby",name:"red gem",pl:"red gems",val:6,col:"#E0344B",hi:"#FF9AA8",min:10,max:80,p:.045},
  {id:"gold",name:"gold bar",pl:"gold bars",val:10,col:"#FFC83D",hi:"#FFF1A8",min:20,max:100,p:.04},
  {id:"sapphire",name:"blue gem",pl:"blue gems",val:15,col:"#3C7BEA",hi:"#A8CCFF",min:34,max:118,p:.036},
  {id:"emerald",name:"green gem",pl:"green gems",val:22,col:"#2FBF5A",hi:"#A6F2BC",min:48,max:118,p:.032},
  {id:"pink",name:"pink gem",pl:"pink gems",val:35,col:"#F06CC0",hi:"#FFC2EA",min:64,max:118,p:.028},
  {id:"star",name:"star gem",pl:"star gems",val:60,col:"#BFF4FF",hi:"#FFFFFF",min:84,max:118,p:.024},
  {id:"magic",name:"magic gem",pl:"magic gems",val:40,col:"#9B5CF6",hi:"#E2CCFF",min:3,max:118,p:0}];
const PICKS=[{name:"Stone pick",pow:2,cost:0,col:"#9A9A9A"},{name:"Iron pick",pow:3,cost:120,col:"#D8DEE6"},
  {name:"Gold pick",pow:4,cost:320,col:"#FFC83D"},{name:"Diamond pick",pow:5,cost:750,col:"#7FE3F5"},
  {name:"Laser drill",pow:6,cost:1600,col:"#FF4FD8"}];
const BAGS=[{cap:10,cost:0},{cap:20,cost:60},{cap:35,cost:180},{cap:55,cost:420},{cap:80,cost:900}];
const LAMPS=[{r:3,cost:0},{r:4.6,cost:90},{r:6.5,cost:280}];
const SHOPS=[{cust:2,tip:1,cost:0,name:"Little stand"},{cust:3,tip:2,cost:150,name:"Gem shop"},
  {cust:4,tip:3,cost:400,name:"Big store"},{cust:5,tip:5,cost:900,name:"Mega mall"}];
const LOOK={skin:["#F6D3B3","#E8B48A","#C98C5E","#9A6342","#6B4430"],
  hair:["#2E2620","#6B4430","#C98C3E","#F2D06B","#D9562B","#8E5BD6"],
  shirt:["#E0344B","#3C7BEA","#2FBF5A","#FFC83D","#F06CC0","#FF8A3D","#2E2620","#FFFFFF"],
  pants:["#3A4A7A","#2E2620","#6B4430","#5B7A3A"],
  hairStyle:["short","spiky","long","curly"],
  helmets:[{id:"miner",name:"Miner helmet",cost:0},{id:"cap",name:"Cap",cost:0},{id:"cowboy",name:"Cowboy hat",cost:40},
    {id:"knight",name:"Knight helmet",cost:120},{id:"crown",name:"Crown",cost:250},{id:"space",name:"Space helmet",cost:400},
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
  {id:"torch",name:"Torches",ic:"🔥",text:"One coal rock makes four torches.",need:{1:1},give:m=>{m.blocks.torch=(m.blocks.torch||0)+4;},done:"Four torches! Tap 🧱 Build, pick the torch, and light up the dark."},
  {id:"ladder",name:"Ladders",ic:"🪜",text:"One tin rock makes four ladders.",need:{2:1},give:m=>{m.blocks.ladder=(m.blocks.ladder||0)+4;},done:"Four ladders! Build them to climb up and down."},
  {id:"sign",name:"Signs",ic:"🪧",text:"Two coal rocks make two signs.",need:{1:2},give:m=>{m.blocks.sign=(m.blocks.sign||0)+2;},done:"Two signs! Put one up and write on it."},
  {id:"crown",name:"Gem crown",ic:"👑",text:"Three gold bars and a star gem make a gem crown.",need:{4:3,8:1},give:m=>{m.owned.crown=1;},done:"A gem crown! Wear it from the clothes tent."}];
const COLOR={3:"red",5:"blue",6:"green",7:"pink"};
// lines the grown-up can record in the Voice Studio; the mine plays them in that voice
const MINE_LINES=["Thank you!","Wow, a shiny gem!","You beat the boss!","Oh no! Try again!","Here comes a big order!","Your egg hatched!"];

const Mine=(()=>{
  let cv,ctx,dpr=1,TS=48,vw=0,vh=0,tiles,ore,running=false,paused=false,lastT=0,time=0;
  const P={x:SPAWN_X,y:SKY-0.95,w:.62,h:.92,vx:0,vy:0,face:1,onGround:false,digT:0,digKey:-1,walk:0};
  const cam={x:0,y:0};
  const input={jx:0,jy:0,dig:false,jump:false,jumpEdge:false};
  const parts=[],floats=[];
  let sandT2=0,actLab="";
  let tex={},back={},oreTex={},msgT=0,actHere=null,layerSeen=null,bossCool=0,tnt=null,shakeT=0;
  const PET={x:SPAWN_X-1,y:SKY-1,hop:-9};

  /* ---------- save data ---------- */
  function M(){
    if(!state.mine)state.mine={seed:(Math.random()*1e9)|0,dug:"",x:SPAWN_X,y:SKY-0.95,coins:0,bag:{},pick:0,bagLv:0,lamp:0,
      boots:0,shopLv:0,look:{skin:0,hair:0,hairStyle:0,shirt:1,pants:0,helmet:"miner"},owned:{miner:1,cap:1},made:false,
      deepest:0,dugCount:0,orders:0,ordersRight:0,ordersWrong:0,layers:[],mineNo:1,w:MW};
    const m=state.mine;
    if(m.w!==MW){m.w=MW;m.dug="";m.x=SPAWN_X;m.y=SKY-.95;}   // the world got wider: fresh tunnels, everything owned stays
    m.found=m.found||{};m.museum=m.museum||{};m.bosses=m.bosses||{};m.items=m.items||{};m.eggs=m.eggs||[];
    m.blocks=m.blocks||{dirt:6,stone:0,sand:0,ladder:4,torch:3,sign:2};m.placed=m.placed||{};m.signs=m.signs||{};m.vaults=m.vaults||{};m.stat=m.stat||{};
    return m;
  }
  const bagCount=()=>Object.values(M().bag).reduce((a,n)=>a+n,0);
  const bagCap=()=>BAGS[M().bagLv].cap;

  /* ---------- world ---------- */
  const idx=(x,y)=>y*MW+x;
  function gen(){
    const m=M(),r=mulberry(m.seed);tiles=new Uint8Array(MW*MH);ore=new Uint8Array(MW*MH);
    const wob=[];for(let x=0;x<MW;x++)wob.push([0,1,2,3,4].map(()=>Math.floor(r()*5)-2));
    for(let y=SKY;y<MH;y++)for(let x=0;x<MW;x++){
      const d=y-SKY,i=idx(x,y);let t;
      if(x===0||x===MW-1||d>=MDEPTH-2)t=T.BED;
      else if(d===0)t=T.GRASS;
      else if(x<TOWN&&d<=3)t=T.FOUND;
      else{const w=wob[x];
        t=d<LAYERS[1].d+w[0]?T.DIRT:d<LAYERS[2].d+w[1]?T.STONE:d<LAYERS[3].d+w[2]?T.DEEP:d<LAYERS[4].d+w[3]?T.HOT:T.CRYS;}
      tiles[i]=t;
    }
    // caves: short random walks of open space
    for(let k=0;k<26;k++){let x=TOWN+2+Math.floor(r()*(MW-TOWN-4)),y=SKY+8+Math.floor(r()*(MDEPTH-14));
      for(let s=0,n=10+Math.floor(r()*30);s<n;s++){const i=idx(x,y);if(![T.BED,T.FOUND,T.GRASS].includes(tiles[i]))tiles[i]=T.AIR;
        x=Math.max(TOWN+1,Math.min(MW-2,x+(r()<.5?-1:1)*(r()<.7?1:0)));y=Math.max(SKY+6,Math.min(MH-4,y+(r()<.5?-1:1)*(r()<.4?1:0)));}}
    // sand pockets that fall when dug under (their own random stream, so ores stay put)
    // small pockets, and never right over an open cave, so it only falls when HE digs under it
    {const r2=mulberry(m.seed^0x5a17);for(let k=0;k<12;k++){const cx=TOWN+2+Math.floor(r2()*(MW-TOWN-4)),cy=SKY+3+Math.floor(r2()*34);
      for(let dy=0;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=cx+dx,y=cy+dy;if(x<1||x>MW-2)continue;
        const i=idx(x,y);if((tiles[i]===T.DIRT||tiles[i]===T.STONE)&&tiles[idx(x,y+1)]!==T.AIR&&tiles[idx(x,y+2)]!==T.AIR)tiles[i]=T.SAND;}}}
    // lava pools deep down
    for(let k=0;k<14;k++){const cx=TOWN+2+Math.floor(r()*(MW-TOWN-4)),cy=SKY+58+Math.floor(r()*(MDEPTH-64));
      for(let dx=-1;dx<=1;dx++)for(let dy=0;dy<=1;dy++)if(r()<.75){const i=idx(cx+dx,cy+dy);if(tiles[i]!==T.BED&&tiles[i]!==T.AIR)tiles[i]=T.LAVA;}}
    // ores, word stones and treasure
    for(let y=SKY+1;y<MH;y++)for(let x=TOWN;x<MW-1;x++){
      const i=idx(x,y),t=tiles[i],d=y-SKY;if(!HARD[t]||t===T.LAVA||t===T.GRASS||t===T.SAND)continue;
      const q=r();
      if(d>=3&&q<.011){ore[i]=9;continue;}
      if(d>=8&&q<.015){ore[i]=10;continue;}
      for(let o=8;o>=1;o--){const O=ORES[o];if(d<O.min||d>O.max)continue;
        const mid=(O.min+O.max)/2,span=(O.max-O.min)/2,bell=1-.6*Math.abs(d-mid)/span;
        if(r()<O.p*bell){ore[i]=o;if(r()<.5){const j=idx(Math.min(MW-2,x+1),y);if(HARD[tiles[j]]&&!ore[j])ore[j]=o;}break;}}
    }
    // a gentle start: a little coal and tin right under the mine sign, and one word stone
    [[20,2,1],[22,1,1],[21,3,2],[24,2,2],[23,4,9]].forEach(([x,d,o])=>{ore[idx(x,SKY+d)]=o;});
    // a few signs from the mine itself, in caves along the way
    gameSigns={};
    {const r3=mulberry(m.seed^0x3c3c),HINTS=[[3,"Dig down to find gems!"],[8,"Read the word stone to crack it."],[15,"A bat lives in this cave."],
      [26,"Sand can fall on you!"],[40,"It is dark. Put up a torch!"],[64,"Hot rock! You need lava boots."],[90,"The dragon is not far."]];
      for(const[d,txt]of HINTS){for(let k=0;k<200;k++){const x=TOWN+2+Math.floor(r3()*(MW-TOWN-4)),y=SKY+d+Math.floor(r3()*6);
        const i=idx(x,y);if(tiles[i]===T.AIR&&tiles[idx(x,y+1)]!==T.AIR&&tiles[idx(x,y+1)]!==T.LAVA){tiles[i]=T.SIGN;gameSigns[i]=txt;break;}}}}
    // apply what has already been dug
    const dug=decode(m.dug);for(let i=0;i<dug.length;i++)if(dug[i]&&tiles[i]!==T.SIGN)tiles[i]=T.AIR;
    // word vaults: locked rooms with treasure, one a little under each boss
    VAULTS=[];
    {const r4=mulberry(m.seed^0x7a11);[20,45,72,100].forEach((d,n)=>{const y0=SKY+d,x0=TOWN+3+Math.floor(r4()*(MW-TOWN-12)),left=r4()<.5,prize=[4,5,7,8][n];
      if(y0+5>=MH-2)return;
      for(let yy=0;yy<5;yy++)for(let xx=0;xx<7;xx++){const i=idx(x0+xx,y0+yy),wall=yy===0||yy===4||xx===0||xx===6;
        tiles[i]=wall?T.VAULT:T.AIR;ore[i]=0;}
      [[2,3,10],[3,3,prize],[4,3,10]].forEach(([xx,yy,o])=>{const i=idx(x0+xx,y0+yy);if(!dug[i]){tiles[i]=T.STONE;ore[i]=o;}});
      const door=[left?x0:x0+6,y0+2];tiles[idx(door[0],door[1])]=m.vaults[n]?T.AIR:T.VDOOR;
      VAULTS.push({k:n,n,d,door,x0,y0});});}
    // what he has built
    for(const[k,t]of Object.entries(m.placed)){const i=+k;if(i>=0&&i<tiles.length&&tiles[i]!==T.VAULT&&tiles[i]!==T.VDOOR){tiles[i]=t;ore[i]=0;}}
    // a magic seal across the whole mine under every boss not yet beaten
    BOSSES.forEach(b=>{if(m.bosses[b.id])return;const y=SKY+b.d;for(let x=1;x<MW-1;x++){tiles[idx(x,y)]=T.SEAL;ore[idx(x,y)]=0;}});
  }
  function encode(){let bits="";const b=new Uint8Array(Math.ceil(MW*MH/8));
    for(let i=0;i<MW*MH;i++)if(tiles[i]===T.AIR&&i>=idx(0,SKY))b[i>>3]|=1<<(i&7);
    let s="";b.forEach(v=>s+=String.fromCharCode(v));return btoa(s);}
  function decode(str){const out=new Uint8Array(MW*MH);if(!str)return out;
    try{const s=atob(str);for(let i=0;i<MW*MH;i++)if(s.charCodeAt(i>>3)&(1<<(i&7)))out[i]=1;}catch(e){}return out;}
  function markDug(){M().dug=encode();save();}
  const tileAt=(x,y)=>(x<0||x>=MW)?T.BED:y<0?T.AIR:y>=MH?T.BED:tiles[idx(x,y)];
  const solid=(x,y)=>{const t=tileAt(x,y);return t!==T.AIR&&!PASS[t];};
  const depthOf=y=>Math.max(0,Math.floor(y)-SKY+1);

  /* ---------- pixel textures ---------- */
  function mk(n=16){const c=document.createElement("canvas");c.width=c.height=n;return c;}
  function pix(pal,seed,extra){const c=mk(),g=c.getContext("2d"),r=mulberry(seed);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){g.fillStyle=pal[Math.floor(r()*pal.length)];g.fillRect(x,y,1,1);}
    if(extra)extra(g,r);return c;}
  const dark=(hex,k)=>{const n=parseInt(hex.slice(1),16);const f=v=>Math.round(v*k);
    return `rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`;};
  const PAL={[T.DIRT]:["#8B5E34","#7A5230","#9C6B3C","#84582F"],[T.STONE]:["#8E8E8E","#7D7D7D","#A0A0A0","#888888"],
    [T.DEEP]:["#5E5A66","#524E5A","#6A6672","#58545F"],[T.HOT]:["#6B3A2E","#5A3026","#7E4535","#643528"],
    [T.CRYS]:["#3E3A6E","#34305E","#4A4680","#3A3668"],[T.BED]:["#2B2B2B","#1E1E1E","#3A3A3A"],
    [T.FOUND]:["#9A9488","#8A8478","#A8A294"],[T.LAVA]:["#FF6A1A","#FF9A2E","#E24A12","#FFB84A"],
    [T.SEAL]:["#3B2A6E","#4A3A86","#2E2058","#43307A"],[T.SAND]:["#E8D08A","#D9BF74","#F0DA9A","#DCC37E"]};
  function buildTextures(){
    for(const t of [T.DIRT,T.STONE,T.DEEP,T.HOT,T.CRYS,T.BED,T.FOUND,T.LAVA,T.SEAL,T.SAND]){
      tex[t]=[0,1,2].map(v=>pix(PAL[t],t*31+v,(g,r)=>{
        if(t===T.HOT)for(let k=0;k<4;k++){g.fillStyle="#FF8A3D";g.fillRect(Math.floor(r()*15),Math.floor(r()*15),2,1);}
        if(t===T.CRYS)for(let k=0;k<3;k++){g.fillStyle="#7FE3F5";g.fillRect(Math.floor(r()*15),Math.floor(r()*15),1,2);}
        if(t===T.SEAL){g.fillStyle="#C9A8FF";[[3,3],[11,4],[6,10],[12,12],[2,13]].forEach(([x,y])=>{g.fillRect(x,y,2,1);g.fillRect(x,y,1,2);});}
        if(t===T.FOUND){g.fillStyle="#6E695F";for(let y=0;y<16;y+=5)g.fillRect(0,y,16,1);for(let y=0;y<16;y+=5)g.fillRect(((y/5)%2)*8,y,1,5);}
      }));
      back[t]=pix(PAL[t].map(h=>dark(h,.42)),t*77);
    }
    tex[T.GRASS]=[0,1,2].map(v=>pix(PAL[T.DIRT],90+v,(g,r)=>{for(let x=0;x<16;x++){const h=3+Math.floor(r()*3);
      for(let y=0;y<h;y++){g.fillStyle=["#5FB35B","#4E9E4A","#6FC266"][Math.floor(r()*3)];g.fillRect(x,y,1,1);}}}));
    back[T.GRASS]=back[T.DIRT];
    for(let o=1;o<=10;o++){const c=mk(),g=c.getContext("2d"),r=mulberry(o*97);
      if(o<=8){const O=ORES[o];for(let k=0;k<5;k++){const x=1+Math.floor(r()*12),y=1+Math.floor(r()*12);
        g.fillStyle="rgba(0,0,0,.45)";g.fillRect(x-1,y+1,3,2);g.fillStyle=O.col;g.fillRect(x,y,2,2);g.fillStyle=O.hi;g.fillRect(x,y,1,1);}}
      else if(o===9){g.fillStyle="#9B5CF6";for(let k=0;k<6;k++)g.fillRect(2+Math.floor(r()*12),2+Math.floor(r()*12),2,2);
        g.fillStyle="#FFFFFF";g.font="bold 9px sans-serif";g.textAlign="center";g.fillText("abc",8,11);}
      else{g.fillStyle="#8B5A2B";g.fillRect(3,6,10,7);g.fillStyle="#C98C3E";g.fillRect(3,5,10,3);g.fillStyle="#FFC83D";g.fillRect(7,8,2,3);
        g.fillStyle="#2E2620";g.fillRect(3,8,10,1);}
      oreTex[o]=c;}
  }
  const iconCache={};
  function oreIcon(k){
    if(iconCache[k])return iconCache[k];
    const shiny=+k>20,o=shiny?k-20:+k;
    const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),O=ORES[o];
    if(shiny){const gr=g.createRadialGradient(32,32,4,32,32,32);gr.addColorStop(0,"rgba(255,240,150,.95)");gr.addColorStop(1,"rgba(255,240,150,0)");g.fillStyle=gr;g.fillRect(0,0,64,64);}
    g.lineJoin="round";g.lineWidth=4;g.strokeStyle="#2E2620";
    if(o===1||o===2){g.fillStyle=O.col;g.beginPath();g.moveTo(12,40);g.lineTo(20,18);g.lineTo(42,12);g.lineTo(54,30);g.lineTo(46,52);g.lineTo(22,54);g.closePath();g.fill();g.stroke();
      g.fillStyle=O.hi;g.fillRect(22,22,8,6);}
    else if(o===4){g.fillStyle=O.col;g.beginPath();g.moveTo(8,46);g.lineTo(18,24);g.lineTo(46,24);g.lineTo(56,46);g.closePath();g.fill();g.stroke();
      g.fillStyle=O.hi;g.fillRect(20,28,14,5);}
    else{g.fillStyle=O.col;g.beginPath();g.moveTo(32,56);g.lineTo(8,26);g.lineTo(18,12);g.lineTo(46,12);g.lineTo(56,26);g.closePath();g.fill();g.stroke();
      g.beginPath();g.moveTo(8,26);g.lineTo(56,26);g.moveTo(24,12);g.lineTo(32,56);g.lineTo(40,12);g.lineWidth=2;g.stroke();
      g.fillStyle=O.hi;g.globalAlpha=.8;g.beginPath();g.moveTo(20,16);g.lineTo(28,16);g.lineTo(22,24);g.closePath();g.fill();}
    if(shiny){g.fillStyle="#FFFFFF";g.globalAlpha=1;[[50,10],[10,48],[54,50]].forEach(([x,y])=>{g.beginPath();g.moveTo(x,y-7);g.lineTo(x+2,y-2);g.lineTo(x+7,y);g.lineTo(x+2,y+2);g.lineTo(x,y+7);g.lineTo(x-2,y+2);g.lineTo(x-7,y);g.lineTo(x-2,y-2);g.closePath();g.fill();});}
    return iconCache[k]=c.toDataURL();
  }

  /* ---------- the miner ---------- */
  function drawMiner(g,cx,by,s,look,face,t,dig,walk,pickCol){
    const u=s/100,L=LOOK;g.save();g.translate(cx,by);g.scale(face,1);g.lineJoin="round";g.lineCap="round";
    const ink="#2E2620",lw=Math.max(1.5,3.2*u);g.lineWidth=lw;g.strokeStyle=ink;
    const sw=walk?Math.sin(walk*12)*7*u:0;
    // legs
    g.fillStyle=L.pants[look.pants%L.pants.length];
    [[-10,sw],[4,-sw]].forEach(([x,o])=>{g.beginPath();g.roundRect(x*u+o,-24*u,12*u,24*u,3*u);g.fill();g.stroke();});
    g.fillStyle="#3A2A20";[[-11,sw],[3,-sw]].forEach(([x,o])=>{g.beginPath();g.roundRect(x*u+o,-6*u,15*u,7*u,3*u);g.fill();g.stroke();});
    // body
    g.fillStyle=L.shirt[look.shirt%L.shirt.length];g.beginPath();g.roundRect(-20*u,-54*u,40*u,32*u,9*u);g.fill();g.stroke();
    // arm + pickaxe
    const ang=dig?(-1.2+Math.abs(Math.sin(t*14))*1.9):(walk?.35+Math.sin(walk*12)*.25:.45);
    g.save();g.translate(8*u,-46*u);g.rotate(ang);
    g.strokeStyle="#7A5230";g.lineWidth=5*u;g.beginPath();g.moveTo(0,0);g.lineTo(26*u,0);g.stroke();
    g.strokeStyle=ink;g.lineWidth=lw;g.fillStyle=pickCol||"#9A9A9A";
    g.beginPath();g.moveTo(24*u,-16*u);g.quadraticCurveTo(34*u,0,24*u,16*u);g.lineTo(28*u,0);g.closePath();g.fill();g.stroke();
    g.fillStyle=L.skin[look.skin%L.skin.length];g.beginPath();g.arc(2*u,0,6*u,0,Math.PI*2);g.fill();g.stroke();
    g.restore();
    // head
    const skin=L.skin[look.skin%L.skin.length],hair=L.hair[look.hair%L.hair.length];
    const hs=L.hairStyle[look.hairStyle%L.hairStyle.length];
    if(hs==="long"){g.fillStyle=hair;g.beginPath();g.roundRect(-22*u,-84*u,30*u,36*u,10*u);g.fill();g.stroke();}
    g.fillStyle=skin;g.beginPath();g.arc(0,-74*u,22*u,0,Math.PI*2);g.fill();g.stroke();
    g.fillStyle=hair;
    if(hs==="short"){g.beginPath();g.arc(0,-78*u,22*u,Math.PI*1.05,Math.PI*1.95);g.closePath();g.fill();}
    if(hs==="spiky"){g.beginPath();g.moveTo(-22*u,-78*u);for(let k=0;k<5;k++){g.lineTo((-18+k*9)*u,-102*u);g.lineTo((-13+k*9)*u,-86*u);}g.lineTo(22*u,-78*u);g.closePath();g.fill();g.stroke();}
    if(hs==="curly"){for(let k=0;k<6;k++){g.beginPath();g.arc((-18+k*7.2)*u,-90*u+(k%2)*3*u,7*u,0,Math.PI*2);g.fill();g.stroke();}}
    if(hs==="long"){g.beginPath();g.arc(0,-78*u,22*u,Math.PI*1.05,Math.PI*1.95);g.closePath();g.fill();}
    // face
    g.fillStyle=ink;g.beginPath();g.arc(9*u,-76*u,3.2*u,0,Math.PI*2);g.fill();g.beginPath();g.arc(-3*u,-76*u,3.2*u,0,Math.PI*2);g.fill();
    g.beginPath();g.arc(4*u,-66*u,6*u,.15*Math.PI,.85*Math.PI);g.stroke();
    g.fillStyle="rgba(240,120,120,.45)";g.beginPath();g.arc(14*u,-68*u,4*u,0,Math.PI*2);g.fill();
    // helmet
    const h=look.helmet||"miner";
    if(h==="miner"){g.fillStyle="#FFC83D";g.beginPath();g.arc(0,-82*u,23*u,Math.PI,0);g.closePath();g.fill();g.stroke();
      g.beginPath();g.roundRect(-26*u,-84*u,52*u,6*u,3*u);g.fill();g.stroke();
      g.fillStyle="#FFF6C8";g.beginPath();g.arc(14*u,-94*u,6*u,0,Math.PI*2);g.fill();g.stroke();}
    if(h==="cap"){g.fillStyle=L.shirt[look.shirt%L.shirt.length];g.beginPath();g.arc(0,-82*u,22*u,Math.PI,0);g.closePath();g.fill();g.stroke();
      g.beginPath();g.moveTo(12*u,-84*u);g.lineTo(38*u,-80*u);g.lineTo(14*u,-78*u);g.closePath();g.fill();g.stroke();}
    if(h==="cowboy"){g.fillStyle="#B57A42";g.beginPath();g.ellipse(0,-86*u,36*u,7*u,0,0,Math.PI*2);g.fill();g.stroke();
      g.beginPath();g.roundRect(-16*u,-110*u,32*u,26*u,8*u);g.fill();g.stroke();}
    if(h==="knight"){g.fillStyle="#B8BEC6";g.beginPath();g.arc(0,-80*u,25*u,Math.PI,0);g.lineTo(25*u,-66*u);g.lineTo(-25*u,-66*u);g.closePath();g.fill();g.stroke();
      g.strokeStyle=ink;g.beginPath();g.moveTo(-14*u,-76*u);g.lineTo(22*u,-76*u);g.lineWidth=4*u;g.stroke();g.lineWidth=lw;
      g.fillStyle="#E0344B";g.beginPath();g.moveTo(0,-104*u);g.quadraticCurveTo(-18*u,-122*u,-6*u,-128*u);g.quadraticCurveTo(4*u,-116*u,0,-104*u);g.fill();g.stroke();}
    if(h==="crown"){g.fillStyle="#FFC83D";g.beginPath();g.moveTo(-18*u,-90*u);g.lineTo(-20*u,-112*u);g.lineTo(-8*u,-100*u);g.lineTo(0,-116*u);g.lineTo(8*u,-100*u);g.lineTo(20*u,-112*u);g.lineTo(18*u,-90*u);g.closePath();g.fill();g.stroke();
      g.fillStyle="#E0344B";g.beginPath();g.arc(0,-98*u,3*u,0,Math.PI*2);g.fill();}
    if(h==="space"){g.fillStyle="rgba(170,220,255,.28)";g.beginPath();g.arc(0,-76*u,31*u,0,Math.PI*2);g.fill();g.strokeStyle="#E8EEF4";g.lineWidth=4*u;g.stroke();
      g.strokeStyle="#FFFFFF";g.beginPath();g.arc(-6*u,-84*u,18*u,Math.PI*1.1,Math.PI*1.4);g.stroke();}
    g.restore();
  }

  /* ---------- DOM ---------- */
  let root;
  function buildDom(){
    root=document.createElement("div");root.id="mineMode";
    root.innerHTML=`<canvas id="mineCv"></canvas>
      <div class="mhud"><button class="mpill" id="mBack">🏡 Valley</button><div class="mpill" id="mCoins">🪙 0</div>
        <div class="mpill" id="mBag">🎒 0/10</div><div class="mpill" id="mDepth">⛏️ Surface</div>
        <button class="mpill" id="mPet">🐾 Pet</button><button class="mpill" id="mBooks">📚 Books</button><button class="mpill" id="mJobs">📋 0/3</button><div class="mpill" id="mLost" style="display:none"></div><button class="mpill" id="mTnt" style="display:none">🧨 0</button>
        <div class="mpill" id="mEgg" style="display:none">🥚</div><div class="mgap"></div><div class="mpill" id="mGems">💎 0</div></div>
      <div id="mJoy"><div id="mKnob"></div></div>
      <button class="mbtn" id="mJump" aria-label="Jump">⤒</button><button class="mbtn" id="mDig" aria-label="Dig">⛏️</button>
      <button class="mbtn" id="mUp" aria-label="Back to the surface">⬆️</button><button class="mbtn" id="mBuild" aria-label="Build">🧱</button><div id="mHot"></div>
      <button class="mact" id="mAct"></button>
      <div id="mToast"></div><div id="mBanner"></div>
      <div class="mpanel" id="mPanel"><div class="mcard" id="mCard"></div></div>`;
    document.body.appendChild(root);
    cv=root.querySelector("#mineCv");ctx=cv.getContext("2d");
    // joystick
    const joy=root.querySelector("#mJoy"),knob=root.querySelector("#mKnob");let jid=null;
    const setJ=e=>{const r=joy.getBoundingClientRect(),R=r.width/2;let dx=e.clientX-(r.left+R),dy=e.clientY-(r.top+R);
      const d=Math.hypot(dx,dy),m=R*.7;if(d>m){dx*=m/d;dy*=m/d;}
      knob.style.transform=`translate(${dx}px,${dy}px)`;input.jx=dx/m;input.jy=dy/m;};
    joy.addEventListener("pointerdown",e=>{jid=e.pointerId;joy.setPointerCapture(jid);setJ(e);});
    joy.addEventListener("pointermove",e=>{if(e.pointerId===jid)setJ(e);});
    const endJ=e=>{if(e.pointerId!==jid)return;jid=null;input.jx=input.jy=0;knob.style.transform="";};
    joy.addEventListener("pointerup",endJ);joy.addEventListener("pointercancel",endJ);
    const hold=(el,on,off)=>{el.addEventListener("pointerdown",e=>{e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add("down");on();});
      const up=()=>{el.classList.remove("down");off&&off();};el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);};
    // the pick can be held by the ⛏️ button or a key; either one keeps digging
    let pDig=false,kDig=false;const setDig=()=>{input.dig=pDig||kDig;};
    hold(root.querySelector("#mDig"),()=>{pDig=true;setDig();},()=>{pDig=false;setDig();});
    hold(root.querySelector("#mJump"),()=>{input.jump=true;input.jumpEdge=true;},()=>{input.jump=false;});
    root.querySelector("#mUp").onclick=()=>toSurface();
    root.querySelector("#mBack").onclick=()=>exit();
    root.querySelector("#mBooks").onclick=()=>{Sound.sfx.pop();input.dig=false;input.jx=input.jy=0;Books.shelf();};
    root.querySelector("#mPet").onclick=()=>{if(!paused)openPets();};
    root.querySelector("#mTnt").onclick=()=>placeTnt();
    root.querySelector("#mBuild").onclick=()=>{if(paused)return;Sound.sfx.pop();setBuild(!build);};
    root.querySelector("#mJobs").onclick=()=>{if(!paused){Sound.sfx.pop();openJobs();}};
    root.querySelector("#mAct").onclick=()=>{if(actHere)actHere.go();};
    // keyboard, for grown-ups testing on a computer
    // e.code is the physical key, so Shift or Caps Lock can't turn "d" into "D"
    //   move: WASD or arrows · jump: Space · dig: J, K, X, E, Enter or Shift
    const keys={},MOVE=new Set(["KeyA","KeyD","KeyW","KeyS","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]),
      DIG=new Set(["KeyJ","KeyK","KeyX","KeyE","Enter","ShiftLeft","ShiftRight"]);let kbHint=false;
    const kUpd=()=>{input.jx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
      input.jy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);};
    const typing=e=>/INPUT|TEXTAREA/.test((e.target||{}).tagName||"");
    addEventListener("keydown",e=>{if(!running||paused||typing(e))return;const c=e.code;
      if(MOVE.has(c)||DIG.has(c)||c==="Space")e.preventDefault();
      if(!kbHint){kbHint=true;toast("Keys: WASD move · Space jump · hold J to dig",3500);}
      if(e.repeat)return;keys[c]=1;
      if(c==="KeyB"){setBuild(!build);}
      if(build&&/^Digit[1-6]$/.test(c)){sel=BLK[+c.slice(5)-1].k;hotbar();}
      if(c==="Space"){input.jump=input.jumpEdge=true;}
      if(DIG.has(c)){kDig=true;setDig();}
      if(MOVE.has(c))kUpd();});
    addEventListener("keyup",e=>{if(!running)return;const c=e.code;keys[c]=0;
      if(c==="Space")input.jump=false;
      if(DIG.has(c)){kDig=[...DIG].some(k=>keys[k]);setDig();}
      if(MOVE.has(c))kUpd();});
    // a key released while the window was in the background never sends keyup
    addEventListener("blur",()=>{for(const k in keys)keys[k]=0;kDig=false;setDig();kUpd();input.jump=false;});
    addEventListener("resize",()=>{if(running)resize();});
    root.addEventListener("contextmenu",e=>e.preventDefault());
  }
  function resize(){
    dpr=Math.min(2,window.devicePixelRatio||1);vw=root.clientWidth;vh=root.clientHeight;
    cv.width=vw*dpr;cv.height=vh*dpr;TS=Math.round(Math.max(40,Math.min(66,vh/11)));
  }
  function toast(msg,ms){const t=root.querySelector("#mToast");t.textContent=msg;t.classList.add("on");clearTimeout(t._h);
    t._h=setTimeout(()=>t.classList.remove("on"),ms||2200);}
  function banner(msg){const b=root.querySelector("#mBanner");b.textContent=msg;b.classList.remove("on");void b.offsetWidth;b.classList.add("on");}
  function hud(){const m=M();
    root.querySelector("#mCoins").textContent="🪙 "+m.coins;
    const n=bagCount(),c=bagCap(),b=root.querySelector("#mBag");b.textContent=`🎒 ${n}/${c}`;b.classList.toggle("full",n>=c);
    const d=depthOf(P.y+P.h);root.querySelector("#mDepth").textContent=d<=0?"⛏️ Surface":`⛏️ ${d} deep`;
    root.querySelector("#mGems").textContent="💎 "+state.gems;
    root.querySelector("#mUp").style.display=d>2?"":"none";
    const pid=m.pet,pk=perk();root.querySelector("#mPet").textContent=pid?`${PERKS[pk].ic} ${NAMES[pid]||pid}`:"🐾 Pet";
    const tn=m.items.tnt||0,tb=root.querySelector("#mTnt");tb.style.display=tn?"":"none";tb.textContent="🧨 "+tn;
    const eg=root.querySelector("#mEgg");eg.style.display=m.eggs.length?"":"none";eg.textContent="🥚 "+m.eggs.length+" hatching tomorrow";try{booksBadge();}catch(e){}
    try{jobsBadge();}catch(e){}}

  /* ---------- enter / leave ---------- */
  function enter(){
    if(!root){buildDom();buildTextures();}
    const m=M();gen();layerSeen=new Set(m.layers||[]);ENT.length=0;setBuild(false);lostAnimal();jobs();
    P.x=m.x||SPAWN_X;P.y=m.y||SKY-.95;P.vx=P.vy=0;if(solidBox(P.x,P.y))Object.assign(P,{x:SPAWN_X,y:SKY-.95});
    root.classList.add("on");running=true;paused=false;resize();hud();
    cam.x=P.x*TS-vw/2;cam.y=P.y*TS-vh*.45;
    lastT=performance.now();requestAnimationFrame(loop);
    PET.x=P.x-1;PET.y=P.y;
    const ready=m.eggs.filter(e=>e.at<today());
    if(!m.made)setTimeout(()=>openWardrobe(true),300);
    else if(ready.length)setTimeout(()=>hatchEggs(),400);
    else if(!m.pet&&!m.petHint&&(state.critters||[]).length){m.petHint=1;toast("Tap 🐾 to bring a pet from your valley!",3500);}
    else if(!m.lost.rescued&&m.lost.hinted!==today()){m.lost.hinted=today();toast(`🐾 A lost ${CRIT(m.lost.id).name.toLowerCase()} is somewhere in the mine! Follow the arrows.`,4200);}
    else toast("Dig down and find gems! Sell them at your shop.",3000);
  }
  function exit(){
    const m=M();m.x=P.x;m.y=P.y;markDug();dirty=false;running=false;root.classList.remove("on");
    try{renderHUD();}catch(e){}
  }
  function toSurface(){
    if(paused)return;const f=document.createElement("div");f.className="mfade";root.appendChild(f);
    Sound.sfx.veh("whee");setTimeout(()=>{P.x=SPAWN_X;P.y=SKY-.95;P.vx=P.vy=0;hud();},350);setTimeout(()=>f.remove(),800);
  }

  /* ---------- physics ---------- */
  function solidBox(x,y){const x0=Math.floor(x),x1=Math.floor(x+P.w-.001),y0=Math.floor(y),y1=Math.floor(y+P.h-.001);
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++)if(solid(tx,ty))return true;return false;}
  function step(dt){
    const m=M(),speed=4.4;
    // safety: never stuck inside rock, never outside the world
    if(solidBox(P.x,P.y)){let k=0;while(solidBox(P.x,P.y)&&k++<MH)P.y-=1;P.vy=0;}
    P.x=Math.max(1,Math.min(MW-1-P.w,P.x));
    P.vx=input.jx*speed;if(Math.abs(input.jx)>.15)P.face=input.jx>0?1:-1;
    // climbing: a wall anywhere beside him, head to feet, counts
    const r0=Math.floor(P.y),r1=Math.floor(P.y+P.h-.001),colL=Math.floor(P.x-.22),colR=Math.floor(P.x+P.w+.22);
    let touchL=false,touchR=false;for(let r=r0;r<=r1;r++){if(solid(colL,r))touchL=true;if(solid(colR,r))touchR=true;}
    const up=input.jy<-.45;
    const climbing=up&&(touchL||touchR)&&!solid(Math.floor(P.x+P.w/2),Math.floor(P.y-.02));
    // at the top of a hole the wall runs out: step up onto the edge instead of sliding back in
    let mantle=0;
    if(up&&!climbing&&!P.onGround){const feet=P.y+P.h,L=Math.ceil(feet-.02);
      if(!solid(Math.floor(P.x+P.w/2),L))   // only while he is over the hole
      if(L-feet>-.05&&L-feet<.7)for(const sd of [P.face,-P.face]){const col=sd>0?colR:colL;
        if(solid(col,L)&&!solid(col,L-1)&&!solid(col,L-2)){mantle=sd;break;}}}
    const lc=Math.floor(P.x+P.w/2),onLadder=[Math.floor(P.y+.1),Math.floor(P.y+P.h-.05)].some(r=>tileAt(lc,r)===T.LADDER);
    if(onLadder&&!(input.jumpEdge)){P.vy=Math.abs(input.jy)>.3?input.jy*3.8:0;}
    else if(climbing)P.vy=-3.4;
    else if(mantle){P.vy=Math.min(P.vy,-1.2);P.vx=mantle*speed;P.face=mantle;}
    else P.vy=Math.min(14,P.vy+30*dt);
    if(input.jumpEdge&&P.onGround){P.vy=-9.4;Sound.sfx.soft();}
    input.jumpEdge=false;
    // x
    let nx=P.x+P.vx*dt;
    if(solidBox(nx,P.y)){
      // step up a single block automatically when walking into it
      if(P.onGround&&!solidBox(nx,P.y-1)&&!solidBox(P.x,P.y-1)){P.y-=1;P.x=nx;}
      else{P.x=P.vx>0?Math.floor(nx+P.w)-P.w-.001:Math.floor(nx)+1.001;P.vx=0;}
    }else P.x=nx;
    // y
    let ny=P.y+P.vy*dt;P.onGround=false;
    if(solidBox(P.x,ny)){if(P.vy>0){P.y=Math.floor(ny+P.h)-P.h-.001;P.onGround=true;}else P.y=Math.floor(ny)+1.001;P.vy=0;}
    else P.y=ny;
    P.walk=P.onGround&&Math.abs(P.vx)>.3?P.walk+dt:0;
    // dig; when digging down, slide over the hole so he drops into it
    if(input.dig&&build){place(dt);}
    else if(input.dig){
      if(digDir()==="down"){const cx=Math.floor(P.x+P.w/2),want=cx+.5-P.w/2,d=want-P.x;
        if(Math.abs(d)>.01){const nx2=P.x+Math.sign(d)*Math.min(Math.abs(d),dt*4);if(!solidBox(nx2,P.y))P.x=nx2;}}
      dig(dt);
    }else{P.digT=0;P.digKey=-1;placeT=0;}
    sandT2=(sandT2||0)-dt;if(sandT2<=0){sandT2=.12;sandStep();}
    updEnts(dt);updFlies(dt);
    // depth record and new layers
    const d=depthOf(P.y+P.h);if(d>m.deepest){m.deepest=d;}
    for(const L of LAYERS)if(d>=L.d+1&&!layerSeen.has(L.name)){layerSeen.add(L.name);m.layers=[...layerSeen];
      if(L.d>1){banner(L.name+"!");Sound.sfx.chime();}}
    // the pet follows, floating through rock like a friendly ghost
    const fly=m.pet&&(CRIT(m.pet)||{}).kind==="flyer";
    const tx=P.x+P.w/2-P.face*.95,ty=P.y+(fly?-.55:.05);
    PET.x+=(tx-PET.x)*Math.min(1,dt*5);PET.y+=(ty-PET.y)*Math.min(1,dt*5);
    // a boss waits above each magic seal
    const row=Math.floor(P.y+P.h-.001);
    for(let i=0;i<BOSSES.length;i++){const b=BOSSES[i];if(m.bosses[b.id])continue;const sr=SKY+b.d;
      if(row>=sr-2&&row<sr&&time>bossCool){startBoss(i);break;}}
    if(tnt&&time>=tnt.t)explode();
    // what can be used here on the surface
    const onSurface=P.y+P.h<=SKY+.05&&P.y+P.h>SKY-.6,cx=P.x+P.w/2;
    let a=null;if(onSurface)for(const b of BUILDINGS_M)if(cx>=b.x0&&cx<=b.x1){a=b;break;}
    if(!a)a=nearAct();
    const lab=a?a.label:"";if(lab!==actLab){actLab=lab;const el=root.querySelector("#mAct");el.style.display=a?"flex":"none";if(a)el.innerHTML=a.label;}
    actHere=a;
  }
  // Holding the pick digs DOWN unless the stick is clearly pushed sideways or up,
  // so a 6-year-old can just hold ⛏️ and keep going.
  function digDir(){
    const ax=Math.abs(input.jx),ay=Math.abs(input.jy);
    if(input.jy<-.5&&ay>=ax)return"up";
    if(ax>.5&&ax>ay)return"side";
    return"down";
  }
  function digTarget(){
    const cx=Math.floor(P.x+P.w/2),row=Math.floor(P.y+P.h/2),d=digDir();
    if(d==="down")return[cx,Math.floor(P.y+P.h+.05)];
    if(d==="up")return[cx,Math.floor(P.y)-1];      // the block above his head, not the space he stands in
    return[cx+(P.face>0?1:-1),row];
  }
  function dig(dt){
    const m=M(),[tx,ty]=digTarget(),t=tileAt(tx,ty),key=idx(tx,ty);
    if(t===T.AIR){P.digT=0;return;}
    if(key!==P.digKey){P.digKey=key;P.digT=0;}
    const hard=HARD[t];
    if(t===T.SEAL){if(time-msgT>2){msgT=time;toast("A magic seal! Beat the boss to break it.");}return;}
    if(t===T.VAULT||t===T.VDOOR){if(time-msgT>2){msgT=time;toast(t===T.VDOOR?"A word vault! Stand by the door and tap 🔐.":"Vault walls are magic. Find the door!");}return;}
    if(t===T.SIGN&&gameSigns[key]){if(time-msgT>2){msgT=time;toast("That sign belongs to the mine.");}return;}
    if(!hard||(t===T.GRASS&&tx<TOWN)){if(time-msgT>2){msgT=time;toast("That can't be dug.");}return;}
    if(t===T.LAVA&&!m.boots&&perk()!=="fire"){if(time-msgT>2){msgT=time;toast("Too hot! Buy lava boots at the pick shop.");Sound.sfx.nope();}return;}
    const pow=PICKS[m.pick].pow;
    if(hard>pow){if(time-msgT>2){msgT=time;toast(`Too hard! Buy the ${(PICKS.find(k=>k.pow>=hard)||PICKS[PICKS.length-1]).name} at the pick shop ⬆️`,3000);Sound.sfx.nope();}return;}
    const need=digNeed(t);
    const before=P.digT;P.digT+=dt;
    if(Math.floor(before/.22)!==Math.floor(P.digT/.22)){Sound.sfx.dig();burst(tx,ty,t,3);}
    if(P.digT>=need){P.digT=0;P.digKey=-1;breakTile(tx,ty,t);}
  }
  function breakTile(tx,ty,t){
    const m=M(),i=idx(tx,ty),o=ore[i];
    tiles[i]=T.AIR;ore[i]=0;m.dugCount=(m.dugCount||0)+1;burst(tx,ty,PASS[t]?T.DIRT:t,10);Sound.sfx.thud();pocket(t,i);bump("dug");
    try{Quests.hit("dig");}catch(e){}
    if(o>=1&&o<=8){
      if(bagCount()>=bagCap()){float(tx,ty,"Bag full!","#FF8A8A");toast("Your backpack is full! Go sell at your shop. ⬆️");Sound.sfx.nope();}
      else collectOre(tx,ty,o);
    }else if(o===9){setTimeout(()=>wordStone(tx,ty),250);}
    else if(o===10)openChest(tx,ty);
    markDug();hud();
  }
  function burst(tx,ty,t,n){const col=(PAL[t]||PAL[T.DIRT]);
    for(let k=0;k<n;k++)parts.push({x:tx+.5,y:ty+.5,vx:(Math.random()-.5)*6,vy:-Math.random()*6,life:.6+Math.random()*.4,col:col[k%col.length],s:.12+Math.random()*.1});}
  function float(tx,ty,text,col){floats.push({x:tx+.5,y:ty,text,col,life:1.4});}

  /* ---------- drawing ---------- */
  const BUILDINGS_M=[
    {id:"gate",x0:.6,x1:3.4,label:"🏡 Go home to the valley",go:()=>exit()},
    {id:"shop",x0:3.8,x1:7.8,label:"🏪 Open my shop",go:()=>openShop()},
    {id:"smith",x0:8.2,x1:11.2,label:"⛏️ Pick shop",go:()=>openSmith()},
    {id:"ward",x0:11.5,x1:14.3,label:"👕 Change clothes",go:()=>openWardrobe(false)},
    {id:"museum",x0:14.6,x1:18.3,label:"🏛️ Gem museum",go:()=>openMuseum()}];
  function drawTown(g){
    const gy=SKY*TS,f=s=>`900 ${Math.round(TS*s)}px system-ui,-apple-system,sans-serif`;
    g.lineWidth=Math.max(2,TS*.06);g.strokeStyle="#2E2620";g.lineJoin="round";
    const sign=(x,y,w,text,bg)=>{g.fillStyle=bg||"#FFFBEF";g.beginPath();g.roundRect(x-w/2,y-TS*.3,w,TS*.6,TS*.12);g.fill();g.stroke();
      g.fillStyle="#2E2620";g.font=f(.36);g.textAlign="center";g.textBaseline="middle";g.fillText(text,x,y+TS*.02);};
    // gate home
    let x=.8*TS;g.fillStyle="#9C6B3C";g.fillRect(x,gy-2.6*TS,.35*TS,2.6*TS);g.strokeRect(x,gy-2.6*TS,.35*TS,2.6*TS);
    g.fillRect(x+2.1*TS,gy-2.6*TS,.35*TS,2.6*TS);g.strokeRect(x+2.1*TS,gy-2.6*TS,.35*TS,2.6*TS);
    g.save();g.translate(x+1.22*TS,gy-1.15*TS);g.rotate(time*1.5);
    for(let k=0;k<3;k++){g.strokeStyle=["#5FB35B","#9BE38E","#2FBF5A"][k];g.lineWidth=TS*.12;g.beginPath();g.arc(0,0,TS*(.35+k*.22),k,k+4.2);g.stroke();}
    g.restore();g.strokeStyle="#2E2620";g.lineWidth=Math.max(2,TS*.06);
    sign(x+1.22*TS,gy-2.75*TS,2.6*TS,"VALLEY","#CDEFC0");
    // my shop
    x=4*TS;const lv=M().shopLv;g.fillStyle="#F4E3C1";g.fillRect(x,gy-2.7*TS,3.6*TS,2.7*TS);g.strokeRect(x,gy-2.7*TS,3.6*TS,2.7*TS);
    for(let k=0;k<6;k++){g.fillStyle=k%2?"#FFFFFF":"#E0344B";g.beginPath();g.moveTo(x-.1*TS+k*.633*TS,gy-2.7*TS);g.lineTo(x-.1*TS+(k+1)*.633*TS,gy-2.7*TS);
      g.lineTo(x-.1*TS+(k+1)*.633*TS,gy-2.2*TS);g.arc(x-.1*TS+(k+.5)*.633*TS,gy-2.2*TS,.316*TS,0,Math.PI);g.closePath();g.fill();g.stroke();}
    g.fillStyle="#9FD8F0";g.fillRect(x+.3*TS,gy-1.7*TS,1.6*TS,1*TS);g.strokeRect(x+.3*TS,gy-1.7*TS,1.6*TS,1*TS);
    [3,5,4].forEach((o,k)=>{g.fillStyle=ORES[o].col;g.beginPath();g.arc(x+(.7+k*.42)*TS,gy-1.05*TS,.14*TS,0,Math.PI*2);g.fill();g.stroke();});
    g.fillStyle="#9C6B3C";g.fillRect(x+2.3*TS,gy-1.5*TS,.9*TS,1.5*TS);g.strokeRect(x+2.3*TS,gy-1.5*TS,.9*TS,1.5*TS);
    sign(x+1.8*TS,gy-3.2*TS,2.4*TS,lv>=2?"BIG SHOP":"MY SHOP","#FFE39A");
    // pick shop
    x=8.4*TS;g.fillStyle="#A7A7A7";g.fillRect(x,gy-2.4*TS,2.7*TS,2.4*TS);g.strokeRect(x,gy-2.4*TS,2.7*TS,2.4*TS);
    g.fillStyle="#5E5A66";g.beginPath();g.moveTo(x-.2*TS,gy-2.4*TS);g.lineTo(x+1.35*TS,gy-3.3*TS);g.lineTo(x+2.9*TS,gy-2.4*TS);g.closePath();g.fill();g.stroke();
    g.fillStyle="#2E2620";g.fillRect(x+.9*TS,gy-1.3*TS,.9*TS,1.3*TS);
    g.fillStyle="#FF8A3D";g.globalAlpha=.6+.4*Math.sin(time*6);g.fillRect(x+1*TS,gy-1.1*TS,.7*TS,.5*TS);g.globalAlpha=1;
    sign(x+1.35*TS,gy-1.8*TS,1.9*TS,"PICKS","#D8DEE6");
    // wardrobe tent
    x=11.6*TS;g.fillStyle="#9B5CF6";g.beginPath();g.moveTo(x,gy);g.lineTo(x+1.35*TS,gy-2.6*TS);g.lineTo(x+2.7*TS,gy);g.closePath();g.fill();g.stroke();
    g.fillStyle="#F06CC0";g.beginPath();g.moveTo(x+1.35*TS,gy-2.6*TS);g.lineTo(x+.9*TS,gy);g.lineTo(x+1.8*TS,gy);g.closePath();g.fill();g.stroke();
    sign(x+1.35*TS,gy-2.9*TS,2.4*TS,"CLOTHES","#FFC2EA");
    // mine sign
    // museum
    x=14.8*TS;g.fillStyle="#E8E2D4";g.fillRect(x,gy-.3*TS,3.3*TS,.3*TS);g.strokeRect(x,gy-.3*TS,3.3*TS,.3*TS);
    for(let k=0;k<4;k++){g.fillStyle="#F4EFE4";g.fillRect(x+(.25+k*.8)*TS,gy-2.1*TS,.4*TS,1.8*TS);g.strokeRect(x+(.25+k*.8)*TS,gy-2.1*TS,.4*TS,1.8*TS);}
    g.fillStyle="#E8E2D4";g.fillRect(x-.1*TS,gy-2.4*TS,3.5*TS,.3*TS);g.strokeRect(x-.1*TS,gy-2.4*TS,3.5*TS,.3*TS);
    g.beginPath();g.moveTo(x-.2*TS,gy-2.4*TS);g.lineTo(x+1.65*TS,gy-3.2*TS);g.lineTo(x+3.5*TS,gy-2.4*TS);g.closePath();g.fill();g.stroke();
    const found=Object.keys(M().found).filter(k=>+k<20).length;
    for(let k=0;k<3;k++){const o=[3,5,6][k];g.fillStyle=M().found[o]?ORES[o].col:"#BDB6A8";g.beginPath();g.arc(x+(.85+k*.8)*TS,gy-1.2*TS,.13*TS,0,Math.PI*2);g.fill();g.stroke();}
    sign(x+1.65*TS,gy-3.45*TS,2.6*TS,"MUSEUM","#E8E2D4");
    // mine sign
    x=19.4*TS;g.fillStyle="#9C6B3C";g.fillRect(x-.06*TS,gy-1.6*TS,.12*TS,1.6*TS);sign(x,gy-1.5*TS,1.7*TS,"MINE ⬇","#FFFBEF");
  }
  function render(){
    const g=ctx;g.setTransform(dpr,0,0,dpr,0,0);g.imageSmoothingEnabled=false;
    // sky
    const sky=g.createLinearGradient(0,-cam.y,0,-cam.y+SKY*TS);sky.addColorStop(0,"#9FD8F0");sky.addColorStop(1,"#F4EFDC");
    g.fillStyle=sky;g.fillRect(0,0,vw,vh);
    const sh=time<shakeT?(Math.random()-.5)*TS*.3:0;
    g.save();g.translate(-Math.round(cam.x)+sh,-Math.round(cam.y)+sh);
    // hills and sun above ground
    if(cam.y<SKY*TS){g.fillStyle="#FFE39A";g.beginPath();g.arc(MW*TS*.75,TS*1.4,TS*.9,0,Math.PI*2);g.fill();
      g.fillStyle="#A8C98C";g.beginPath();g.moveTo(0,SKY*TS);for(let x=0;x<=MW;x+=2)g.lineTo(x*TS,SKY*TS-TS*(1.2+Math.sin(x*.7)*.6));g.lineTo(MW*TS,SKY*TS);g.fill();}
    const x0=Math.max(0,Math.floor(cam.x/TS)),x1=Math.min(MW-1,Math.ceil((cam.x+vw)/TS)),y0=Math.max(0,Math.floor(cam.y/TS)),y1=Math.min(MH-1,Math.ceil((cam.y+vh)/TS));
    const torches=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const t=tiles[idx(x,y)],px=x*TS,py=y*TS;
      if(t===T.VAULT||t===T.VDOOR){drawVault(g,t,px,py,x,y);continue;}
      if(PASS[t]){if(y>SKY){const d=y-SKY,L=d<LAYERS[1].d?T.DIRT:d<LAYERS[2].d?T.STONE:d<LAYERS[3].d?T.DEEP:d<LAYERS[4].d?T.HOT:T.CRYS;g.drawImage(back[L],px,py,TS+1,TS+1);}
        drawObj(g,t,px,py,TS,x*7+y);if(t===T.TORCH)torches.push([x,y]);continue;}
      if(t===T.AIR){if(y>SKY){const d=y-SKY,L=d<LAYERS[1].d?T.DIRT:d<LAYERS[2].d?T.STONE:d<LAYERS[3].d?T.DEEP:d<LAYERS[4].d?T.HOT:T.CRYS;
          g.drawImage(back[L],px,py,TS+1,TS+1);}continue;}
      g.drawImage(tex[t][(x*7+y*13)%3],px,py,TS+1,TS+1);
      const o=ore[idx(x,y)];
      if(o){if(o===9){g.globalAlpha=.55+.45*Math.sin(time*3+x);g.fillStyle="rgba(155,92,246,.35)";g.fillRect(px,py,TS,TS);g.globalAlpha=1;}
        g.drawImage(oreTex[o],px,py,TS+1,TS+1);}
      if(t===T.LAVA){g.fillStyle=`rgba(255,200,80,${.15+.15*Math.sin(time*4+x)})`;g.fillRect(px,py,TS,TS);}
    }
    drawTown(g);
    // cracks on the block being dug
    if(P.digKey>=0&&P.digT>0){const tx=P.digKey%MW,ty=Math.floor(P.digKey/MW),t=tileAt(tx,ty),need=digNeed(t),k=Math.min(1,P.digT/need);
      g.strokeStyle="rgba(0,0,0,.7)";g.lineWidth=Math.max(2,TS*.05);g.beginPath();
      const cx=tx*TS+TS/2,cy=ty*TS+TS/2;for(let a=0;a<5;a++){const an=a*1.3+.4;g.moveTo(cx,cy);g.lineTo(cx+Math.cos(an)*TS*.5*k,cy+Math.sin(an)*TS*.5*k);}g.stroke();}
    // particles
    for(const p of parts){g.fillStyle=p.col;g.globalAlpha=Math.min(1,p.life*2);g.fillRect(p.x*TS,p.y*TS,p.s*TS,p.s*TS);}g.globalAlpha=1;
    // a boss sits on its seal, waiting
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
    drawEnts(g);drawFlies(g);
    drawMiner(g,(P.x+P.w/2)*TS,(P.y+P.h)*TS+1,TS*1.02,m.look,P.face,time,input.dig&&P.digKey>=0,P.walk,PICKS[m.pick].col);
    signBubble(g);
    g.restore();
    // darkness with a lamp glow around the miner
    const depth=depthOf(P.y+P.h),A=Math.min(.93,Math.max(0,(depth-5)/36));
    if(A>0){const R=(LAMPS[m.lamp].r+(perk()==="glow"?(snackOn()?3.4:2.2):0))*TS;darkness(g,A,R,torches);}
    // the gem radar: a sniffing pet or a gem map shows gems hiding in the dark
    const rad=(perk()==="sniff"?(snackOn()?8:5):0)||(m.items.mapUntil>Date.now()?8:0);
    if(rad){const cx=Math.floor(P.x+P.w/2),cy=Math.floor(P.y+.5);
      for(let y=cy-rad;y<=cy+rad;y++)for(let x=cx-rad;x<=cx+rad;x++){if(x<1||x>=MW-1||y<SKY||y>=MH)continue;const o=ore[idx(x,y)];
        if(!o||o===10||tiles[idx(x,y)]===T.AIR||(x-cx)*(x-cx)+(y-cy)*(y-cy)>rad*rad)continue;
        const sx=x*TS+TS/2-cam.x,sy=y*TS+TS/2-cam.y,k=.5+.5*Math.sin(time*4+x+y),r=TS*(.12+.08*k);
        g.fillStyle=o===9?"#C9A8FF":ORES[o].hi;g.globalAlpha=.55+.45*k;g.beginPath();g.moveTo(sx,sy-r*1.6);g.lineTo(sx+r,sy);g.lineTo(sx,sy+r*1.6);g.lineTo(sx-r,sy);g.closePath();g.fill();}
      g.globalAlpha=1;}
    // floating words stay readable above the dark
    g.textAlign="center";g.textBaseline="middle";
    for(const f of floats){g.globalAlpha=Math.min(1,f.life);g.font=`900 ${Math.round(TS*.42)}px system-ui,sans-serif`;
      g.lineWidth=5;g.strokeStyle="#2E2620";const x=f.x*TS-cam.x,y=f.y*TS-cam.y;g.strokeText(f.text,x,y);g.fillStyle=f.col;g.fillText(f.text,x,y);}
    g.globalAlpha=1;
  }
  function loop(now){
    if(!running)return;
    const dt=Math.min(.05,(now-lastT)/1000);lastT=now;time+=dt;
    if(!paused){step(dt);
      for(const p of parts){p.vy+=16*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
      for(const f of floats){f.y-=dt*.8;f.life-=dt;}
      for(let i=parts.length-1;i>=0;i--)if(parts[i].life<=0)parts.splice(i,1);
      for(let i=floats.length-1;i>=0;i--)if(floats[i].life<=0)floats.splice(i,1);
      const tx=(P.x+P.w/2)*TS-vw/2,ty=(P.y+.5)*TS-vh*.45;
      cam.x+=(Math.max(0,Math.min(MW*TS-vw,tx))-cam.x)*Math.min(1,dt*8);cam.y+=(Math.max(0,Math.min(MH*TS-vh,ty))-cam.y)*Math.min(1,dt*8);
      if(Math.floor(time*2)!==Math.floor((time-dt)*2))hud();
      if(dirty&&Math.floor(time/3)!==Math.floor((time-dt)/3)){dirty=false;markDug();}}
    render();requestAnimationFrame(loop);
  }

  /* ---------- panels ---------- */
  const panel=root=>document.getElementById("mPanel"),card=()=>document.getElementById("mCard");
  function openPanel(html){paused=true;input.dig=false;input.jx=input.jy=0;card().innerHTML=html;panel().classList.add("on");}
  function closePanel(){panel().classList.remove("on");paused=false;hud();}

  // word stone: match the word to its picture
  function wordStone(tx,ty){
    const tier=currentTier(),pool=allWords().filter(w=>!w.tricky&&WORD_ART[w.w]&&w.t>=Math.max(1,tier-1)&&w.t<=tier+1);
    const all=pool.length>=3?pool:allWords().filter(w=>!w.tricky&&WORD_ART[w.w]);
    const w=all[Math.floor(Math.random()*all.length)];
    const LOOKS=[["hat","cap"],["cup","mug"],["rock","stone"],["log","wood","stick"],["pot","pan"],["bug","bee"],["boat","ship","sub"],["car","van","cab","jeep"]];
    const near=(a,b)=>LOOKS.some(g=>g.includes(a)&&g.includes(b));
    const others=allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&x.w!==w.w&&WORD_ART[x.w]!==WORD_ART[w.w]&&!near(x.w,w.w)).sort(()=>Math.random()-.5)
      .reduce((a,x)=>{if(a.length<2&&!a.some(y=>near(x.w,y.w)||WORD_ART[x.w]===WORD_ART[y.w]))a.push(x);return a;},[]);
    const opts=[w,...others].sort(()=>Math.random()-.5);let misses=0,t0=performance.now();
    openPanel(`<h2>A word stone! 🔮</h2><p class="sub">Read the word, then tap its picture to crack it open.</p>
      <div class="mword">${w.w}</div><div class="mpics">${opts.map(o=>`<button class="mpic" data-w="${o.w}">${drawWord(o.w,"mine")}</button>`).join("")}</div>
      <div class="mrow"><button class="btn soft" id="mHear" style="visibility:hidden">🔊 Hear it</button></div>`);
    card().querySelector("#mHear").onclick=()=>Sound.say("word:"+w.w,w.w,.85);
    if(Skills.slow){const mp=card().querySelector(".mpics");mp.classList.add("locked-by-shield");
      soundShield(card(),w,()=>{mp.classList.remove("locked-by-shield");t0=performance.now();});}
    card().querySelectorAll(".mpic").forEach(b=>b.onclick=()=>{
      if(b.dataset.w===w.w){try{Skills.result(w,{ok:true,help:misses>0,ms:performance.now()-t0});}catch(e){}Sound.sfx.win();b.classList.add("right");const m=M();m.bag[9]=(m.bag[9]||0)+1;m.found[9]=1;
        state.wordsRead++;Sound.say("word:"+w.w,w.w,.9);
        setTimeout(()=>{closePanel();float(tx,ty,"+1 magic gem","#E2CCFF");burst(tx,ty,T.CRYS,16);toast("CRACK! You found a magic gem!");save();},900);}
      else{try{Skills.result(w,{ok:false,confused:b.dataset.w,ms:performance.now()-t0});}catch(e){}t0=performance.now();misses++;Sound.sfx.nope();b.classList.add("wrong");setTimeout(()=>b.classList.remove("wrong"),500);
        if(misses>=1)card().querySelector("#mHear").style.visibility="visible";}
    });
  }

  // the shop: customers bring written orders
  let shopQ=[],tray={},served=0,earned=0,hintOn=false;
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
        m.orders=(m.orders||0)+1;m.ordersRight=(m.ordersRight||0)+1;bump("served");state.wordsRead++;state.gems+=gems;
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
  function toastIn(t){const el=document.createElement("div");el.className="mnote";el.textContent=t;card().appendChild(el);setTimeout(()=>el.remove(),2200);}
  function endShop(){
    const m=M(),rest=Object.entries(m.bag).reduce((a,[o,n])=>a+OI(o).val*n,0);
    const tease=scheduleVip();
    openPanel(`<h2>🏪 Shop closed</h2><p class="sub">${served?`You served ${served} customer${served===1?"":"s"} and earned ${earned} coins!`:"No sales this time."}</p>
      ${tease?`<p class="mtease">🌟 Tomorrow, <b>${tease}</b> is coming to your shop with a BIG order!</p>`:""}
      ${rest?`<p class="sub">Sell the rest to the trader for ${rest} coins? Customers pay double, so you could keep them.</p>`:""}
      <div class="mrow">${rest?`<button class="btn soft" id="mSell">Sell the rest · ${rest} 🪙</button>`:""}<button class="btn primary" id="mClose">Back to digging</button></div>`);
    const s=card().querySelector("#mSell");if(s)s.onclick=()=>{m.coins+=rest;m.bag={};Sound.sfx.win();save();endShop();};
    card().querySelector("#mClose").onclick=closePanel;hud();save();
  }

  // the pick shop: upgrades
  function openSmith(tab){
    if(tab==="bench")return openBench();
    const m=M(),rows=[];
    const row=(ic,name,desc,cost,buy,done)=>rows.push({ic,name,desc,cost,buy,done});
    const np=PICKS[m.pick+1];row("⛏️",np?np.name:PICKS[m.pick].name,np?`Digs harder rock (power ${np.pow})`:"The best there is!",np?np.cost:0,()=>{m.pick++;},!np);
    const nb=BAGS[m.bagLv+1];row("🎒",nb?"Bigger backpack":"Backpack",nb?`Carry ${nb.cap} things`:`Carries ${BAGS[m.bagLv].cap}`,nb?nb.cost:0,()=>{m.bagLv++;},!nb);
    const nl=LAMPS[m.lamp+1];row("🔦",nl?"Brighter lamp":"Lamp",nl?"See further in the dark":"As bright as it gets",nl?nl.cost:0,()=>{m.lamp++;},!nl);
    row("🥾","Lava boots",m.boots?"You can dig through lava":"Dig through hot lava",m.boots?0:400,()=>{m.boots=1;},!!m.boots);
    const ns=SHOPS[m.shopLv+1];row("🏪",ns?ns.name:SHOPS[m.shopLv].name,ns?`${ns.cust} customers, bigger tips`:"The biggest shop in town",ns?ns.cost:0,()=>{m.shopLv++;},!ns);
    openPanel(`<div class="mtabs"><button class="mtab on">⛏️ Upgrades</button><button class="mtab" id="mTabBench">🔨 Workbench</button></div>
      <h2>⛏️ Pick shop</h2><p class="sub">You have ${m.coins} 🪙 coins. Deepest dig: ${m.deepest}.</p>
      <div class="msmith">${rows.map((r,i)=>`<div class="mup${r.done?" done":""}"><div class="ic">${r.ic}</div><div class="tx"><b>${r.name}</b><span>${r.desc}</span></div>
        ${r.done?`<span class="own">✓</span>`:`<button class="btn primary mini" data-i="${i}" ${m.coins<r.cost?"disabled":""}>${r.cost} 🪙</button>`}</div>`).join("")}</div>
      <div class="mrow"><button class="btn soft" id="mNew">New mine ↻</button><button class="btn primary" id="mClose">Done</button></div>`);
    card().querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const r=rows[+b.dataset.i];if(m.coins<r.cost)return;
      m.coins-=r.cost;r.buy();Sound.sfx.win();try{confetti();}catch(e){}save();openSmith();hud();toast(r.name+"!");});
    card().querySelector("#mTabBench").onclick=()=>openBench();
    card().querySelector("#mClose").onclick=closePanel;
    card().querySelector("#mNew").onclick=()=>{if(!confirm("Dig a brand new mine? The old tunnels fill back in, and everything you own stays."))return;
      m.seed=(Math.random()*1e9)|0;m.dug="";m.mineNo=(m.mineNo||1)+1;gen();P.x=SPAWN_X;P.y=SKY-.95;save();closePanel();toast("A fresh new mine!");};
  }

  // wardrobe: design the miner
  function openWardrobe(first){
    const m=M(),L=LOOK,lk=m.look;
    const sw=(key,arr)=>arr.map((c,i)=>`<button class="msw${lk[key]===i?" on":""}" data-k="${key}" data-v="${i}" style="background:${c}"></button>`).join("");
    openPanel(`<h2>${first?"Make your miner!":"👕 Clothes"}</h2><div class="mward"><canvas id="mPrev" width="240" height="280"></canvas><div class="mopts">
      <div class="mlabel">Skin</div><div class="mline">${sw("skin",L.skin)}</div>
      <div class="mlabel">Hair</div><div class="mline">${L.hairStyle.map((s,i)=>`<button class="mtag${lk.hairStyle===i?" on":""}" data-k="hairStyle" data-v="${i}">${s}</button>`).join("")}</div>
      <div class="mline">${sw("hair",L.hair)}</div>
      <div class="mlabel">Shirt</div><div class="mline">${sw("shirt",L.shirt)}</div>
      <div class="mlabel">Pants</div><div class="mline">${sw("pants",L.pants)}</div>
      <div class="mlabel">Hat</div><div class="mline">${L.helmets.filter(h=>!h.prize||m.owned[h.id]).map(h=>`<button class="mtag${lk.helmet===h.id?" on":""}" data-h="${h.id}">${h.name}${m.owned[h.id]?"":` · ${h.cost}🪙`}</button>`).join("")}</div>
      </div></div><div class="mrow"><button class="btn primary" id="mClose">${first?"Let's dig!":"Done"}</button></div>`);
    const pv=card().querySelector("#mPrev"),pg=pv.getContext("2d");
    const paint=()=>{pg.setTransform(1,0,0,1,0,0);pg.clearRect(0,0,240,280);drawMiner(pg,120,262,190,lk,1,0,false,0,PICKS[m.pick].col);};paint();
    card().querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{lk[b.dataset.k]=+b.dataset.v;Sound.sfx.pop();save();openWardrobe(first);});
    card().querySelectorAll("[data-h]").forEach(b=>b.onclick=()=>{const h=L.helmets.find(x=>x.id===b.dataset.h);
      if(!m.owned[h.id]){if(m.coins<h.cost){toast(`You need ${h.cost} coins for that`);Sound.sfx.nope();return;}m.coins-=h.cost;m.owned[h.id]=1;Sound.sfx.win();}
      lk.helmet=h.id;save();openWardrobe(first);});
    card().querySelector("#mClose").onclick=()=>{m.made=true;save();closePanel();
      if(first&&(state.critters||[]).length)setTimeout(()=>toast("Tap 🐾 to bring a pet from your valley!",3500),5200);
      if(first)toast("Walk right to the mine sign, then hold ⛏️ to dig down! Push the stick sideways to dig sideways.",4800);};
  }

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
    flyGem(tx,ty,ORES[o].hi);if(o>=3)bump("gems");
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
    m.eggs=m.eggs.filter(e=>e.at>=today());hud();
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
    const b=BOSSES[battle.i],pool=bossWords();let w=pool[Math.floor(Math.random()*pool.length)];battle.round++;
    const tg=Math.random()<.4&&Skills.target();if(tg&&!tg.w.tricky&&WORD_ART[tg.w.w])w=tg.w;battle.ans=w.w;battle.t0=performance.now();
    if(battle.round%3===0&&currentTier()>=2&&!Skills.slow){const ps=PicSentence.make();if(ps){psRound(b,ps);return;}}
    const pictureFirst=battle.round%2===0&&!Skills.slow;let body;
    if(!pictureFirst){const opts=[w.w,...picOthers(w).map(x=>x.w)].sort(()=>Math.random()-.5);
      body=`<p class="sub">Read the word. Tap its picture!</p><div class="mword">${w.w}</div>
        <div class="mpics">${opts.map(o=>`<button class="mpic" data-w="${o}">${drawWord(o,"boss")}</button>`).join("")}</div>`;}
    else{const opts=[w.w,...lookalikes(w.w,2)].sort(()=>Math.random()-.5);
      body=`<p class="sub">Which word is this? Look closely!</p><div class="mpic big">${drawWord(w.w,"boss")}</div>
        <div class="mwords">${opts.map(o=>`<button class="mwopt" data-w="${o}">${o}</button>`).join("")}</div>`;}
    openPanel(`<div class="mboss fight">${bossArt(b,"small")}
      <div class="mbars"><div><b>${b.name}</b> ${"🖤".repeat(battle.hp)}</div><div><b>You</b> ${"❤️".repeat(battle.hearts)}${"🤍".repeat(3-battle.hearts)}</div></div>${body}</div>`);
    card().querySelectorAll("[data-w]").forEach(el=>el.onclick=()=>answer(el,el.dataset.w===w.w,w));
    if(Skills.slow&&!pictureFirst){const mp=card().querySelector(".mpics");mp.classList.add("locked-by-shield");
      soundShield(card().querySelector(".mboss"),w,()=>{mp.classList.remove("locked-by-shield");battle.t0=performance.now();});}
  }
  // boss riddle: read a whole sentence, pick the matching scene
  function psRound(b,ps){
    battle.ans="#ps";battle.t0=performance.now();const w={w:"#ps",ps:ps.text};
    openPanel(`<div class="mboss fight">${bossArt(b,"small")}
      <div class="mbars"><div><b>${b.name}</b> ${"🖤".repeat(battle.hp)}</div><div><b>You</b> ${"❤️".repeat(battle.hearts)}${"🤍".repeat(3-battle.hearts)}</div></div>
      <p class="sub">Boss riddle! Read it all, then tap the picture that matches.</p><div class="mps">${ps.text}</div>
      <div class="mpics">${ps.opts.map((o,i)=>`<button class="psopt" data-w="${o.ok?"#ps":"#no"+i}">${PicSentence.draw(o,"cave")}</button>`).join("")}</div></div>`);
    card().querySelectorAll("[data-w]").forEach(el=>el.onclick=()=>answer(el,el.dataset.w==="#ps",w));
  }
  function answer(el,ok,w){
    if(battle.lock)return;battle.lock=true;const art=card().querySelector(".mbossart");
    try{if(w.ps){state.comp=state.comp||{right:0,wrong:0};state.comp[ok?"right":"wrong"]++;}
      else Skills.result(w,{ok,confused:ok?null:el.dataset.w,ms:performance.now()-(battle.t0||0)});}catch(e){}
    if(ok){el.classList.add("right");battle.right++;
      const help=perk()==="strong"&&Math.random()<(snackOn()?.6:.35),dmg=help?2:1;battle.hp=Math.max(0,battle.hp-dmg);
      Sound.sfx.thud();Sound.sfx.win();art.classList.remove("hit");void art.offsetWidth;art.classList.add("hit");
      (w.ps?Sound.say("sent:"+w.ps,w.ps,.9):Sound.say("word:"+w.w,w.w,.9));toastIn(help?`${NAMES[M().pet]} helps! DOUBLE HIT! 💥`:"POW! 💥");
      setTimeout(()=>{battle.lock=false;if(battle.hp<=0)bossWin();else bossRound();},1200);
    }else{el.classList.add("wrong");const r=card().querySelector(`[data-w="${w.w}"]`);if(r)r.classList.add("right");
      battle.hearts--;Sound.sfx.nope();art.classList.remove("attack");void art.offsetWidth;art.classList.add("attack");
      const c=card();c.classList.remove("ouch");void c.offsetWidth;c.classList.add("ouch");
      Sound.say("sent:Oh no! Try again!","Oh no! Try again!",.95);setTimeout(()=>w.ps?Sound.say("sent:"+w.ps,w.ps,.9):Sound.say("word:"+w.w,w.w,.85),1200);
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
      if(m.bag[k])return `<div class="mcase donate"><img src="${oreIcon(k)}" alt=""><b>shiny ${ORES[o].name}</b><button class="btn primary mini" data-d="${k}">Put in +25🪙</button></div>`;
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
      if(t===T.AIR||t===T.BED||t===T.FOUND||t===T.SEAL||t===T.VAULT||t===T.VDOOR||(t===T.GRASS&&tx<TOWN)||(t===T.SIGN&&gameSigns[idx(tx,ty)]))continue;
      const i=idx(tx,ty),o=ore[i];tiles[i]=T.AIR;ore[i]=0;delete m.placed[i];delete m.signs[i];burst(tx,ty,t,5);m.dugCount=(m.dugCount||0)+1;
      if(o>=1&&o<=8){if(bagCount()<bagCap())collectOre(tx,ty,o);}else if(o===9&&!stone)stone=[tx,ty];else if(o===10)openChest(tx,ty);}
    for(let k=0;k<26;k++)parts.push({x:x+.5,y:y+.5,vx:(Math.random()-.5)*16,vy:-Math.random()*12,life:.8,col:k%2?"#FF8A3D":"#FFC83D",s:.2});
    float(x,y-1,"BOOM!","#FFC83D");P.vy=-6;markDug();hud();try{Quests.hit("dig",5);}catch(e){}
    if(stone)setTimeout(()=>wordStone(stone[0],stone[1]),700);
  }


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

  let avK=null,avC=null;
  function avatar(){const m=M(),k=JSON.stringify(m.look)+m.pick;if(avC&&avK===k)return avC;
    const c=document.createElement("canvas");c.width=200;c.height=240;
    drawMiner(c.getContext("2d"),100,228,165,m.look,1,0,false,0,PICKS[m.pick].col);avK=k;return avC=c.toDataURL();}
  return{avatar,enter,exit,_toast:m=>toast(m,3000),_startBoss:i=>startBoss(i),_tnt:()=>placeTnt(),_openMuseum:()=>openMuseum(),_openBench:()=>openBench(),
    _openPets:()=>openPets(),_hatch:()=>hatchEggs(),_collect:(x,y,o)=>collectOre(x,y,o),_PET:PET,_setTime:v=>{bossCool=v;},_now:()=>time,_ans:()=>battle&&battle.ans,
    // test hooks
    _p:P,_in:input,_tile:(x,y)=>tileAt(x,y),_ore:(x,y)=>ore[idx(x,y)],_setOre:(x,y,o)=>{ore[idx(x,y)]=o;},_setTile:(x,y,t)=>{tiles[idx(x,y)]=t;},_openShop:()=>openShop(),
    _openSmith:()=>openSmith(),_build:v=>setBuild(v),_sel:k=>{sel=k;hotbar();},_ents:ENT,_vaults:()=>VAULTS,_jobs:()=>jobs(),_openJobs:()=>openJobs(),_lost:()=>lostAnimal(),
    _openVault:k=>openVault(VAULTS[k]),_near:()=>nearAct(),_gameSigns:()=>gameSigns,_spawn:()=>spawn(),_openWardrobe:f=>openWardrobe(f),_running:()=>running,_paused:()=>paused,_gen:()=>gen(),SKY,TOWN};
})();

