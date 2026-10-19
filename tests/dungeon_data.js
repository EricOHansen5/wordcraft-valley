// Word Dungeons data (app/content/dungeons.js): every room is drawn right, its doors meet their neighbours',
// every dungeon can be finished (and needs its item to be), every fixed sentence is readable at the dungeon's
// level, every picture exists, and every animal has a type. Node + the page in jsdom (for Decode, ART, CRITTERS).
"use strict";
const {JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++;console.log("PASS "+m);}else{fail++;console.log("FAIL "+m);}};
const done=()=>{console.log(`dungeon data: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);};

let D=null;try{global.window=global;require("../app/content/dungeons.js");D=global.WCV&&global.WCV.dungeons;}catch(e){console.log(String(e));}
ok(!!D,"app/content/dungeons.js loads and sets WCV.dungeons");
if(!D)done();

// ---------- the rooms ----------
const LEGEND="#.@DLBWPGO_SRUC~^%HXTFM";
const W=13,H=9,MID={n:[6,0],s:[6,8],w:[0,4],e:[12,4]};
const DOORS="DLBW",OPP={n:"s",s:"n",w:"e",e:"w"},STEP={n:[0,-1],s:[0,1],w:[-1,0],e:[1,0]};
const at=(g,c,r)=>(g[r]||"")[c];
function doorsOf(room){const o={};for(const k in MID){const ch=at(room.grid,MID[k][0],MID[k][1]);if(DOORS.includes(ch))o[k]=ch;}return o;}
for(const d of D.list){
  const byAt={};d.rooms.forEach(rm=>{byAt[rm.at.join(",")]=rm;});
  for(const rm of d.rooms){
    const g=rm.grid,shape=Array.isArray(g)&&g.length===H&&g.every(s=>typeof s==="string"&&s.length===W);
    ok(shape,`${d.id}/${rm.id}: 9 rows of 13`);if(!shape)continue;
    ok(g.every(s=>[...s].every(ch=>LEGEND.includes(ch))),`${d.id}/${rm.id}: only legend characters`);
    let ring=true;for(let r=0;r<H;r++)for(let c=0;c<W;c++){if(r>0&&r<H-1&&c>0&&c<W-1)continue;
      const isMid=Object.values(MID).some(p=>p[0]===c&&p[1]===r);if(at(g,c,r)!=="#"&&!(isMid&&DOORS.includes(at(g,c,r))))ring=false;}
    ok(ring,`${d.id}/${rm.id}: a wall ring with doors only at the middle of an edge`);
    const ds=doorsOf(rm);
    for(const k in ds){const n=byAt[[rm.at[0]+STEP[k][0],rm.at[1]+STEP[k][1]].join(",")];
      ok(n&&DOORS.includes(doorsOf(n)[OPP[k]]||"")&&(ds[k]==="D"||doorsOf(n)[OPP[k]]==="D"),
        `${d.id}/${rm.id}: its ${k} door meets a door of ${n?n.id:"(no room)"} (a lock is on one side only)`);}
    const ms=g.join("").split("M").length-1;
    ok(ms===(rm.monsters||[]).length&&(rm.monsters||[]).every(m=>D.monsters[m.kind]),`${d.id}/${rm.id}: one known monster per M`);
    const cs=[];g.forEach((s,r)=>[...s].forEach((ch,c)=>{if(ch==="C")cs.push(c+","+r);}));
    ok(cs.every(k=>rm.chests&&k in rm.chests)&&Object.keys(rm.chests||{}).every(k=>cs.includes(k)),`${d.id}/${rm.id}: every chest says what is inside`);
    Object.keys(rm.signs||{}).forEach(k=>{const p=k.split(",").map(Number);ok(at(g,p[0],p[1])==="T",`${d.id}/${rm.id}: sign ${k} sits on a T`);});
    Object.keys(rm.pots||{}).forEach(k=>{const p=k.split(",").map(Number);ok(at(g,p[0],p[1])==="P",`${d.id}/${rm.id}: pot ${k} sits on a P`);});
  }
  ok(byAt&&d.rooms.some(r=>r.id===d.start)&&d.rooms.some(r=>r.id===d.bossRoom),`${d.id}: start and boss rooms exist`);
}

// ---------- solving: a search over (room, place, keys, boss key, items, what is opened) ----------
// Pots and bushes break (pass through); chests, signs, switches and blocks stand in the way; pits, water and lava
// block walking but not the boomerang. A locked door spends a key, the boss door needs the boss key, a word door
// opens by reading. A room with shutUntil:"plate" keeps its other doors shut until a block sits on its plate.
const WALK=new Set([".","@","F","M","_","P","G"]);
function solve(d,opt){
  opt=opt||{};const R={};d.rooms.forEach(rm=>{R[rm.id]=rm;});const byAt={};d.rooms.forEach(rm=>{byAt[rm.at.join(",")]=rm;});
  const start=R[d.start],sp=(()=>{for(let r=0;r<H;r++){const c=start.grid[r].indexOf("@");if(c>=0)return[c,r];}return[6,6];})();
  const first={room:d.start,pos:sp,keys:0,boss:false,items:[],open:[],got:[]};
  const key=s=>[s.room,s.pos,s.keys,s.boss,s.items.slice().sort(),s.open.slice().sort(),s.got.slice().sort()].join("|");
  const seen=new Set([key(first)]),q=[first];let reached=false,gotBossKey=false,chests=new Set();
  const lowered=(s,rid)=>s.open.includes(rid+":switch");
  const plateDone=(s,rid)=>s.open.includes(rid+":plate");
  const blocked=(s,rm,c,r)=>{const ch=at(rm.grid,c,r);if(ch==="R"||ch==="U")return!lowered(s,rm.id);return!WALK.has(ch);};
  const doorOpen=(s,rm,k,entry)=>{const ch=at(rm.grid,MID[k][0],MID[k][1]);
    if(!DOORS.includes(ch))return false;
    if(rm.shutUntil==="plate"&&!plateDone(s,rm.id)&&k!==entry)return false;
    return ch==="D"||s.open.includes(rm.id+":"+k);};
  while(q.length){
    const s=q.shift(),rm=R[s.room];if(s.room===d.bossRoom){reached=true;}
    if(s.boss)gotBossKey=true;
    const entry=s.entry;
    // tiles he can walk to from here
    const reach=new Set([s.pos.join(",")]),st=[s.pos];
    while(st.length){const [c,r]=st.pop();for(const k in STEP){const nc=c+STEP[k][0],nr=r+STEP[k][1];
      if(nc<1||nr<1||nc>W-2||nr>H-2||reach.has(nc+","+nr)||blocked(s,rm,nc,nr))continue;reach.add(nc+","+nr);st.push([nc,nr]);}}
    const near=(c,r)=>Object.values(STEP).some(v=>reach.has((c+v[0])+","+(r+v[1])));
    const push=n=>{const k=key(n);if(!seen.has(k)){seen.add(k);q.push(n);}};
    const next=ch=>Object.assign({},s,{open:s.open.slice(),got:s.got.slice(),items:s.items.slice()},ch||{});
    // chests and pots with something in them
    Object.keys(rm.chests||{}).forEach(k=>{const p=k.split(",").map(Number),id=rm.id+":"+k;if(s.got.includes(id)||!near(p[0],p[1]))return;
      chests.add(id);const what=(rm.chests[k]||{}).item,n=next();n.got.push(id);
      if(what==="key")n.keys++;else if(what==="bosskey")n.boss=true;else if(what&&what!=="map"&&what!==opt.without)n.items.push(what);push(n);});
    Object.keys(rm.pots||{}).forEach(k=>{const p=k.split(",").map(Number),id=rm.id+":pot"+k;if(!rm.pots[k]||s.got.includes(id)||!reach.has(k))return;
      const n=next();n.got.push(id);if(rm.pots[k]==="key")n.keys++;push(n);});
    // a switch: hit from beside it, or by the boomerang along a straight line of up to 4 tiles over floor, pits and water
    if(rm.grid.join("").includes("S")&&!lowered(s,rm.id)){let hit=false;
      const FLY=new Set(["^","~","%",".","_","M","@","F"]);
      for(let r=1;r<H-1&&!hit;r++)for(let c=1;c<W-1&&!hit;c++){if(at(rm.grid,c,r)!=="S")continue;if(near(c,r))hit=true;
        if(!hit&&s.items.includes("boomerang"))for(const v of Object.values(STEP)){
          // he stands i tiles away (1..4) with only flyable tiles between him and the switch
          for(let i=1;i<=4&&!hit;i++){const fc=c-v[0]*i,fr=r-v[1]*i;if(reach.has(fc+","+fr)){hit=true;break;}if(!FLY.has(at(rm.grid,fc,fr)))break;}}}
      if(hit){const n=next();n.open.push(rm.id+":switch");push(n);}}
    // the plate: a small search over his place and the block's
    if(rm.shutUntil==="plate"&&!plateDone(s,rm.id)&&plateSolvable(rm,s.pos)){const n=next();n.open.push(rm.id+":plate");push(n);}
    // doors
    for(const k in MID){const [dc,dr]=MID[k],ch=at(rm.grid,dc,dr);if(!DOORS.includes(ch))continue;
      const inside=[dc-STEP[k][0]*0+(k==="w"?1:k==="e"?-1:0),dr+(k==="n"?1:k==="s"?-1:0)];
      if(!reach.has(inside.join(",")))continue;
      if(!doorOpen(s,rm,k,entry)){
        if(rm.shutUntil==="plate"&&!plateDone(s,rm.id)&&k!==entry)continue;
        const n=next();
        if(ch==="L"&&s.keys>0){n.keys--;n.open.push(rm.id+":"+k);push(n);}
        else if(ch==="B"&&s.boss){n.open.push(rm.id+":"+k);push(n);}
        else if(ch==="W"){n.open.push(rm.id+":"+k);push(n);}
        continue;}
      const nb=byAt[[rm.at[0]+STEP[k][0],rm.at[1]+STEP[k][1]].join(",")];if(!nb)continue;
      const o=OPP[k],[oc,or]=MID[o];const pos=[oc+(o==="w"?1:o==="e"?-1:0),or+(o==="n"?1:o==="s"?-1:0)];
      push(next({room:nb.id,pos,entry:o}));}
  }
  return{reached,gotBossKey,chests};
}
// a block onto the plate, Sokoban rules: he pushes a block one tile if the tile behind it is free
function plateSolvable(rm,from){
  const g=rm.grid,blocks=[],plates=[];g.forEach((s,r)=>[...s].forEach((ch,c)=>{if(ch==="O")blocks.push([c,r]);if(ch==="_")plates.push(c+","+r);}));
  const free=(c,r,bs)=>c>0&&r>0&&c<W-1&&r<H-1&&WALK.has(at(g,c,r))&&!bs.some(b=>b[0]===c&&b[1]===r);
  const k=(p,bs)=>p.join(",")+"|"+bs.map(b=>b.join(",")).sort().join(";");
  const seen=new Set([k(from,blocks)]),q=[[from,blocks]];
  while(q.length){const [p,bs]=q.shift();if(bs.some(b=>plates.includes(b.join(","))))return true;
    for(const v of Object.values(STEP)){const n=[p[0]+v[0],p[1]+v[1]],bi=bs.findIndex(b=>b[0]===n[0]&&b[1]===n[1]);let nbs=bs;
      if(bi>=0){const t=[n[0]+v[0],n[1]+v[1]];if(!free(t[0],t[1],bs))continue;nbs=bs.map((b,i)=>i===bi?t:b);}
      else if(!free(n[0],n[1],bs))continue;
      const kk=k(n,nbs);if(!seen.has(kk)){seen.add(kk);q.push([n,nbs]);}}}
  return false;
}
for(const d of D.list){
  const s=solve(d);
  ok(s.reached,`${d.id}: the boss room can be reached from the entrance`);
  const all=d.rooms.reduce((n,rm)=>n+Object.keys(rm.chests||{}).length,0);
  ok(s.chests.size===all,`${d.id}: every chest can be reached (${s.chests.size} of ${all})`);
  const w=solve(d,{without:d.item});
  ok(!w.gotBossKey&&!w.reached,`${d.id}: without the ${d.item} the boss key and the boss stay out of reach`);
}

// ---------- the page: reading level, pictures, animal types ----------
const html=require("./page").html(),errors=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){},context:null});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},suspend(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createDynamicsCompressor:()=>Object.assign(node(),{threshold:P(),ratio:P()}),
    createPeriodicWave:()=>({}),createBuffer:(ch,len)=>({getChannelData:()=>new Float32Array(len)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.URL.createObjectURL=()=>"blob:x";
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,2).join(" | "):m);
}});
setTimeout(()=>{
  const w=dom.window;
  ok(!errors.length,"the page boots with the dungeon data: "+errors.join(" / "));
  const readable=(t,lv)=>{try{const r=w.eval(`Decode.check(${JSON.stringify(t)},${lv})`);return r.filter(x=>!x.ok).map(x=>x.w||x.word||JSON.stringify(x));}catch(e){return["(Decode.check failed: "+e.message+")"];}};
  for(const d of D.list){
    const texts=[];
    d.rooms.forEach(rm=>Object.values(rm.signs||{}).forEach(t=>texts.push(t)));
    Object.keys(D.monsters).filter(k=>d.monsters.includes(k)).forEach(k=>{const m=D.monsters[k];texts.push(m.name,m.friend);});
    const b=D.bosses[d.boss];if(b)texts.push(b.taunt,b.friendly);
    texts.forEach(t=>{const bad=readable(t,d.level);ok(!bad.length,`${d.id}: readable at level ${d.level}: "${t}"${bad.length?" (not yet: "+bad.join(", ")+")":""}`);});
  }
  const arts=["t_pot","t_bush","t_block","t_plate","t_chest","t_key","t_bosskey","t_crystal","t_fairy","t_sign","t_heart","i_boomerang"]
    .concat(Object.values(D.monsters).map(m=>m.art),Object.values(D.bosses).map(b=>b.art));
  const missing=arts.filter(a=>!w.eval(`typeof ART!=="undefined"&&typeof ART[${JSON.stringify(a)}]==="function"`));
  ok(!missing.length,"every dungeon picture is in ART"+(missing.length?" (missing: "+missing.join(", ")+")":""));
  const crit=w.eval("CRITTERS.map(c=>c.id)"),untyped=crit.filter(id=>!D.types[id]);
  ok(!untyped.length,"every animal has a type"+(untyped.length?" (none for: "+untyped.join(", ")+")":""));
  ok(Object.values(D.types).every(t=>["fire","water","leaf"].includes(t)),"every type is fire, water or leaf");
  ok(Object.values(D.monsters).every(m=>["fire","water","leaf"].includes(m.type)&&m.hp>0&&m.move&&m.friend&&Array.isArray(m.look)&&m.look.length===2),"every monster has a type, hp, a move, a friend sentence and two look-alike names");
  done();
},1500);
