const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=http.createServer((q,r)=>{r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(require("path").join(__dirname,"../app/index.html")));}).listen(8805,async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));const ctx=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});
  const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.addInitScript(()=>{window.__answer=sel=>{const h=document.querySelector(sel);if(!h||!h.dataset.ans)return"none";const a=h.dataset.ans;
      if(h.querySelector(".wslots")){const tiles=JSON.parse(h.dataset.tiles),bank=[...h.querySelectorAll(".wbank .lt")],used=new Set();
        tiles.forEach(ph=>{const t=bank.find((b,i)=>!used.has(i)&&b.textContent===tileText(ph));used.add(bank.indexOf(t));t.click();});return"build";}
      if(a[0]==="#"){h.querySelector(`.psopt[data-i="${a.slice(1)}"]`).click();return"sent";}
      h.querySelector(`[data-w="${a}"]`).click();return"word:"+a;};});
  const st={tour:99,guardians:[0,1],wordsRead:60,gems:20,rows:6,biome:2,vehStarter:true,seasonSeen:"autumn",phase:0,grid:{},inventory:{},
    critters:[{id:"dog",c:14,r:8,seed:1}],vehicles:[],adv:{seenIntro:1,dex:{}},
    mine:{seed:12345,x:20.2,y:5.05,coins:40,bag:{1:3,2:2},pick:2,bagLv:2,lamp:0,boots:0,shopLv:0,look:{skin:1,hair:2,hairStyle:1,shirt:3,pants:0,helmet:"miner"},owned:{miner:1,cap:1},made:true,pet:"dog",bosses:{beetle:1,golem:1},eggs:[],deepest:30,petHint:1}};
  await p.goto("http://localhost:8805/");
  await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
    r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  await p.reload();await p.waitForTimeout(2200);
  await p.evaluate(()=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));state.settings.tierOverride=3;});
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  await p.click("#mineBtn");await p.waitForTimeout(1200);
  const close=()=>p.evaluate(()=>{const b=document.querySelector("#mPanel.on #mClose");if(b)b.click();});
  await close();await p.waitForTimeout(200);
  const S=await p.evaluate(()=>Mine.SKY);
  const tp=(x,y)=>p.evaluate(([x,y])=>{const P=Mine._p;P.x=x+.19;P.y=y+.079;P.vx=P.vy=0;},[x,y]);
  const clear=(x0,x1,y0,y1)=>p.evaluate(([x0,x1,y0,y1])=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){Mine._setTile(x,y,0);Mine._setOre(x,y,0);}},[x0,x1,y0,y1]);
  // 1 build a block beside him, then dig it back
  await clear(28,34,S+8,S+10);await p.evaluate(([S])=>{for(let x=26;x<=36;x++)Mine._setTile(x,S+11,3);},[S]);await tp(30,S+10);await p.waitForTimeout(300);
  await p.evaluate(()=>{Mine._build(true);Mine._sel("dirt");Mine._p.face=1;Mine._in.jx=0;});await p.waitForTimeout(100);
  await p.screenshot({path:"m9_build.png"});
  // hold until the first block goes down, then let go: fixed waits let a slow machine walk him up onto it and place a second
  await p.evaluate(()=>{Mine._in.jx=.9;Mine._in.dig=true;});
  await p.waitForFunction(()=>Object.keys(state.mine.placed).length>=1,null,{polling:"raf",timeout:5000}).catch(()=>{});
  await p.evaluate(()=>{Mine._in.jx=0;Mine._in.dig=false;});await p.waitForTimeout(100);
  // where it went: beside him, in his row (a slow machine can walk him a step before it lands)
  const placed=await p.evaluate(([S])=>{const k=+Object.keys(state.mine.placed)[0],x=k%50,y=Math.floor(k/50);
    return{x,y,t:Mine._tile(x,y),placed:Object.keys(state.mine.placed).length,dirt:state.mine.blocks.dirt};},[S]);
  ok(placed.t===2&&placed.placed>=1&&placed.y===S+10&&placed.x>=31,"placed a dirt block beside him: "+JSON.stringify(placed));
  const bx=placed.x;
  await p.evaluate(([bx,S])=>{Mine._setTile(bx,S+9,3);},[bx,S]);
  await tp(bx-1,S+10);await p.waitForTimeout(200);
  await p.evaluate(()=>{Mine._build(false);Mine._p.face=1;Mine._in.jx=.9;Mine._in.dig=true;});
  await p.waitForFunction(([bx,S])=>Mine._tile(bx,S+10)===0,[bx,S],{polling:"raf",timeout:8000}).catch(()=>{});
  await p.evaluate(()=>{Mine._in.dig=false;Mine._in.jx=0;});
  const back=await p.evaluate(([bx,S])=>({t:Mine._tile(bx,S+10),placed:Object.keys(state.mine.placed).length,dirt:state.mine.blocks.dirt}),[bx,S]);
  ok(back.t===0&&back.dirt===placed.dirt+1&&back.placed===placed.placed-1,"dug it back into his pocket: "+JSON.stringify(back));
  // 2 ladder: climb a shaft
  await clear(40,40,S+2,S+14);await p.evaluate(([S])=>{for(let y=S+3;y<=S+14;y++){Mine._setTile(40,y,11);state.mine.placed[y*50+40]=11;}Mine._setTile(40,S+15,3);},[S]);
  await tp(40,S+14);await p.waitForTimeout(300);const y0=await p.evaluate(()=>Mine._p.y);
  await p.evaluate(()=>{Mine._in.jy=-1;});await p.waitForTimeout(900);await p.evaluate(()=>{Mine._in.jy=0;});await p.waitForTimeout(500);
  const y1=await p.evaluate(()=>Mine._p.y);await p.waitForTimeout(500);const y2=await p.evaluate(()=>Mine._p.y);
  ok(y0-y1>2&&Math.abs(y2-y1)<.05,`climbs up the ladder (${(y0-y1).toFixed(1)} tiles) and holds on when let go`);
  await p.screenshot({path:"m9_ladder.png"});
  // 3 torches light the dark
  await clear(26,34,S+28,S+30);await p.evaluate(([S])=>{for(let x=24;x<=36;x++)Mine._setTile(x,S+31,3);[26,33].forEach(x=>{Mine._setTile(x,S+30,12);state.mine.placed[(S+30)*50+x]=12;});},[S]);
  await tp(29,S+30);await p.waitForTimeout(700);await p.screenshot({path:"m9_torch.png"});
  // 4 sand falls
  await clear(30,30,S+20,S+24);await p.evaluate(([S])=>{Mine._setTile(30,S+20,14);Mine._setTile(30,S+25,3);},[S]);await tp(33,S+24);await p.waitForTimeout(1500);
  ok(await p.evaluate(([S])=>Mine._tile(30,S+24)===14&&Mine._tile(30,S+20)===0,[S]),"sand falls to the floor");
  // 5 slime bounce
  await clear(20,26,S+14,S+19);await p.evaluate(([S])=>{for(let x=18;x<=28;x++)Mine._setTile(x,S+20,3);Mine._ents.length=0;Mine._ents.push({type:"slime",x:23.5,y:S+20,vx:0,vy:0,hop:99,sq:0});},[S]);
  await tp(23,S+15);await p.evaluate(()=>{Mine._p.x=23.19;});
  let minVy=0;for(let k=0;k<25;k++){await p.waitForTimeout(40);const vy=await p.evaluate(()=>Mine._p.vy);if(vy<minVy)minVy=vy;}
  ok(minVy<-12,"landing on a slime bounces him high (vy "+minVy.toFixed(1)+")");
  // 6 mole's riddle
  await clear(20,23,S+14,S+19);await tp(22,S+19);await p.evaluate(([S])=>{Mine._setTile(23,S+19,2);Mine._ents.length=0;Mine._ents.push({type:"mole",x:23.5,y:S+19.5,side:1,life:9,pop:1});},[S]);
  await p.waitForTimeout(300);const ml=await p.evaluate(()=>document.getElementById("mAct").textContent);ok(/Mole/.test(ml),"a mole pops out: "+ml);
  await p.screenshot({path:"m9_mole.png"});
  const c0=await p.evaluate(()=>state.mine.coins);await p.evaluate(()=>document.getElementById("mAct").click());await p.waitForTimeout(400);await p.screenshot({path:"m9_riddle.png"});
  // the challenge pays out about a second after the right answer: wait for it, not a fixed time
  await p.evaluate(()=>__answer("#mCard .mq"));await p.waitForFunction(c=>state.mine.coins>c&&state.mine.stat.moles===1,c0,{timeout:6000}).catch(()=>{});
  ok(await p.evaluate(c=>state.mine.coins>c&&state.mine.stat.moles===1,c0),"riddle pays coins");
  // 7 lost animal
  const L=await p.evaluate(()=>Mine._lost());console.log("   lost:",JSON.stringify(L));
  await tp(L.x,L.y);await p.waitForTimeout(400);const ll=await p.evaluate(()=>document.getElementById("mAct").textContent);ok(/lost/.test(ll),"found the lost animal: "+ll);
  await p.screenshot({path:"m9_lost.png"});
  await p.evaluate(()=>document.getElementById("mAct").click());await p.waitForTimeout(400);await p.evaluate(()=>__answer("#mCard .mq"));
  await p.waitForFunction(id=>state.mine.lost.rescued&&state.critters.some(c=>c.id===id),L.id,{timeout:6000}).catch(()=>{});
  ok(await p.evaluate(id=>state.mine.lost.rescued&&state.critters.some(c=>c.id===id),L.id),"rescued: it moved into the valley");
  await p.screenshot({path:"m9_rescued.png"});await close();
  // 8 vault
  const V=await p.evaluate(()=>Mine._vaults()[0]);console.log("   vault:",JSON.stringify(V));
  const side=V.door[0]===V.x0?-1:1;await clear(V.door[0]+side,V.door[0]+side*2,V.door[1]-1,V.door[1]);await p.evaluate(([x,y])=>{Mine._setTile(x,y+1,3);},[V.door[0]+side,V.door[1]]);
  await tp(V.door[0]+side,V.door[1]);await p.waitForTimeout(400);
  ok(/vault/.test(await p.evaluate(()=>document.getElementById("mAct").textContent)),"standing at a vault door");
  await p.screenshot({path:"m9_vault.png"});
  await p.evaluate(()=>document.getElementById("mAct").click());await p.waitForTimeout(400);await p.evaluate(()=>__answer("#mCard .mq"));await p.waitForTimeout(1500);
  ok(await p.evaluate(V=>state.mine.vaults[0]===1&&Mine._tile(V.door[0],V.door[1])===0,V),"the vault opened");
  await p.screenshot({path:"m9_vault_open.png"});
  // 9 a sign he writes
  await clear(30,31,S+8,S+10);await p.evaluate(([S])=>{for(let x=26;x<=36;x++)Mine._setTile(x,S+11,3);},[S]);await tp(30,S+10);
  await p.evaluate(()=>{Mine._build(true);Mine._sel("sign");Mine._in.dig=true;});await p.waitForTimeout(150);await p.evaluate(()=>{Mine._in.dig=false;});await p.waitForTimeout(400);
  for(const w of ["The","gem","is","here"])await p.evaluate(w=>{const bs=[...document.querySelectorAll(".mswb")];const b=bs.find(x=>x.dataset.w===w)||bs.find(x=>x.dataset.w.toLowerCase()===w.toLowerCase());b&&b.click();},w);
  await p.screenshot({path:"m9_signwrite.png"});await p.click("#mSOk");await p.waitForTimeout(300);await p.evaluate(()=>Mine._build(false));
  const sign=await p.evaluate(()=>Object.values(state.mine.signs));ok(sign.length===1,"sign written: "+sign[0]);
  await p.waitForTimeout(300);ok(/sign/.test(await p.evaluate(()=>document.getElementById("mAct").textContent)),"can read the sign");
  await p.screenshot({path:"m9_sign.png"});
  // 10 jobs
  await p.evaluate(()=>Mine._openJobs());await p.waitForTimeout(300);await p.screenshot({path:"m9_jobs.png"});
  console.log("   jobs:",await p.evaluate(()=>[...document.querySelectorAll(".mjob")].map(j=>j.querySelector("b").textContent+" "+j.querySelector("span").textContent).join(" | ")));
  await close();
  // 11 everything survives leaving and coming back
  await p.evaluate(()=>{document.getElementById("mBack").click();});await p.waitForTimeout(500);
  await p.click("#mineBtn");await p.waitForTimeout(1200);await close();
  const kept=await p.evaluate(([S,V])=>({ladder:Mine._tile(40,S+8),torch:Mine._tile(26,S+30),sand:Mine._tile(30,S+24),vault:Mine._tile(V.door[0],V.door[1]),sign:Mine._tile(30,S+10)}),[S,V]);
  ok(kept.ladder===11&&kept.torch===12&&kept.sand===14&&kept.vault===0&&kept.sign===13,"built things are still there next time: "+JSON.stringify(kept));
  // hotbar picture
  await tp(30,S+10);await p.evaluate(()=>{Mine._build(true);Mine._sel("torch");});await p.waitForTimeout(400);await p.screenshot({path:"m9_hotbar.png"});
  console.log("errors:",errs.length?errs:"none");await b.close();srv.close();});
