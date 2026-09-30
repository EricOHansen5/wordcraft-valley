// v10.1 Trading Post: the 💎 Outfits and 🪙 Gear shelves, buying from the right purse once (a double tap too),
// a kind "Almost!" when he is short, the old wardrobes (only what he owns, and a line to the Trading Post),
// hats and helmets owned in an old save, job gear that opens at a job level, the Swap tab (1 💎 = 5 🪙),
// the stall in Adventure, and the "store" mode.
const {launch,seed,waitFor,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("store"),ok=T.ok;
  // the keepers of the three open lands are awake, so no cut-scene opens on top
  const START={guardians:[0,1,2],gems:50,hats:["flower"],hat:"flower",settings:{goal:0},mine:{coins:40}};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  // record what is said instead of playing it (again after every reload)
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};});
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const cards=()=>E(()=>[...document.querySelectorAll("#stGrid .stcard")].map(c=>({id:c.dataset.id,cost:c.querySelector(".cost").textContent.trim(),
    locked:c.classList.contains("locked"),worn:c.classList.contains("worn"),rib:!!c.querySelector(".rib"),art:!!c.querySelector(".art svg"),
    act:(c.querySelector("button")||{dataset:{}}).dataset.act||""})));
  const btn=(id,shelf)=>`#stGrid .stcard[data-id="${id}"][data-shelf="${shelf}"] button`;
  const msg=()=>E(()=>document.getElementById("stMsg").textContent);
  const purse=()=>E(()=>({g:state.gems,c:state.mine.coins}));
  const wait=ms=>p.waitForTimeout(ms);
  await listen();await tidy();

  // ---- 1. the tool bar and the two shelves ----
  ok(await E(()=>document.getElementById("storePurse").textContent)==="💎 50 · 🪙 40","the 🏪 button shows both purses: "+await E(()=>document.getElementById("storePurse").textContent));
  await p.click("#storeBtn");
  ok(await waitFor(p,()=>Modes.top()==="store"),"🏪 opens the Trading Post (mode store)");
  ok((await said()).includes("Welcome to the Trading Post!"),"it says welcome");
  const HATS_=await E(()=>HATS.map(h=>({id:h.id,gems:h.gems}))),HELM=await E(()=>LOOK.helmets.map(h=>({id:h.id,cost:h.cost,prize:!!h.prize})));
  let c=await cards();
  ok(c.length===HATS_.length+6&&c.every(x=>x.art),`💎 shelf: the ${HATS_.length} hats and 6 new outfits, each with a picture (${c.length})`);
  ok(HATS_.every(h=>{const x=c.find(y=>y.id===h.id);return x&&(x.cost===h.gems+" 💎"||h.id==="flower");}),"the hats keep their ids and prices in 💎");
  ok(c.filter(x=>x.rib).map(x=>x.id).join()==="bunny,beanie,shades,chef,herocap,horns","the new outfits have a New! ribbon");
  ok(c.find(x=>x.id==="flower").worn,"the flower he wears shows as worn");
  await p.click('#ovStore [data-shelf="gear"]');await wait(100);
  c=await cards();
  const sold=HELM.filter(h=>!h.prize);
  ok(c.length===sold.length+10&&c.every(x=>x.art),`🪙 shelf: ${sold.length} Mine helmets and 10 new things (the Crystal crown is a prize, not sold) (${c.length})`);
  ok(sold.every(h=>{const x=c.find(y=>y.id===h.id);return x&&(h.cost?x.cost===h.cost+" 🪙":/Yours|Wearing/.test(x.cost));}),"the helmets keep their ids and prices in 🪙; the free two are his");
  ok(!c.some(x=>x.id==="crystal"),"the Crystal crown is not for sale");
  await p.click('#ovStore [data-shelf="outfit"]');await wait(100);

  // ---- 2. buying: the right purse, once ----
  await p.click(btn("bunny","outfit"));await wait(150);
  let s=await E(()=>({g:state.gems,c:state.mine.coins,own:state.owned.bunny,hat:state.hat,hats:state.hats.join()}));
  ok(s.g===40&&s.c===40&&s.own===1&&s.hat==="bunny"&&s.hats==="flower","Bunny ears: 10 💎 taken, coins untouched, kept in owned and put on "+J(s));
  ok((await said()).includes("How do I look?")&&/You got the bunny ears!/.test(await msg()),"it says so: "+await msg());
  await wait(700);
  // a double tap: the second tap lands on the new button ("Take off") and must do nothing
  await p.dblclick(btn("beanie","outfit"));await wait(150);
  s=await E(()=>({g:state.gems,own:state.owned.beanie,hat:state.hat}));
  ok(s.g===25&&s.own===1&&s.hat==="beanie","a double tap buys once and keeps it on "+J(s));
  await wait(700);
  // two taps on the same button, before it is redrawn
  await E(()=>{const b=document.querySelector('#stGrid .stcard[data-id="shades"] button');b.click();b.click();});await wait(100);
  s=await E(()=>({g:state.gems,own:state.owned.shades}));
  ok(s.g===5&&s.own===1,"two taps on one button: charged once "+J(s));
  ok(await E(()=>Store.purchase("outfit","shades").why)==="owned"&&(await purse()).g===5,"buying what he owns takes nothing");
  await wait(700);
  // too few gems: nothing is taken, and it says how many more
  await listen();
  await p.click(btn("crown","outfit"));await wait(150);
  s=await E(()=>({g:state.gems,has:state.hats.includes("crown")}));
  ok(s.g===5&&!s.has,"short of gems: nothing taken, nothing given "+J(s));
  ok(await msg()==="Almost! 40 more 💎."&&(await said()).includes("Almost! 40 more gems"),"short of gems: \"Almost! 40 more 💎.\" "+J(await said()));
  await wait(700);
  // the 🪙 shelf pays from the Mine's purse
  await p.click('#ovStore [data-shelf="gear"]');await wait(100);
  await p.click(btn("cowboy","gear"));await wait(150);
  s=await E(()=>({g:state.gems,c:state.mine.coins,own:state.mine.owned.cowboy,helmet:state.mine.look.helmet,owned:JSON.stringify(state.owned)}));
  ok(s.c===0&&s.g===5&&s.own===1&&s.helmet==="cowboy"&&!/cowboy/.test(s.owned),"Cowboy hat: 40 🪙 from the Mine's purse, kept in mine.owned, on the miner "+J(s));
  await wait(700);
  await listen();
  await p.click(btn("viking","gear"));await wait(150);
  ok((await purse()).c===0&&!(await E(()=>state.owned.viking))&&await msg()==="Almost! 60 more 🪙."&&(await said()).includes("Almost! 60 more coins"),
    "short of coins: nothing taken, never below 0, \"Almost! 60 more 🪙.\"");
  ok(await E(()=>Store.purchase("gear","knight").why)==="short"&&(await purse()).c===0,"the purse never goes below 0");

  // ---- 3. the Wardrobe tab: only what he owns, and the way to the Trading Post ----
  await E(()=>Store.close());await wait(100);
  await p.click("#albumBtn");await p.click('[data-atab="hats"]');await wait(100);
  const w=await E(()=>({ids:[...document.querySelectorAll("#albumGrid .hatcard")].map(c=>c.dataset.id).join(),
    buy:[...document.querySelectorAll("#albumGrid button")].some(b=>/Buy/.test(b.textContent)),more:(document.querySelector("#albumGrid .storemore")||{}).textContent||""}));
  ok(w.ids==="flower,bunny,beanie,shades"&&!w.buy,"Wardrobe: the flower and the three bought outfits, no Buy buttons "+J(w));
  ok(/Get more at the Trading Post 🏪/.test(w.more),"Wardrobe: \"Get more at the Trading Post 🏪\"");
  await p.click('#albumGrid .hatcard[data-id="bunny"] button');await wait(100);
  ok(await E(()=>state.hat)==="bunny","a bought outfit is worn from the Wardrobe");
  await p.click("#albumGrid .storemore button");
  ok(await waitFor(p,()=>Modes.stack().join(">")==="store"),"its button goes to the Trading Post");
  await E(()=>Store.close());

  // ---- 4. the Mine's clothes tent ----
  await E(()=>{state.mine.coins=60;});await E(()=>Store.open("gear"));await p.click(btn("viking","gear"));await wait(150);
  ok(await E(()=>state.owned.viking===1&&state.mine.coins===0&&state.mine.look.helmet==="viking"),"Viking helmet bought with 60 🪙, kept in owned");
  await E(()=>Store.close());
  await p.click("#mineBtn");await wait(900);
  await E(()=>Mine._openWardrobe(false));await wait(200);
  const mw=await E(()=>({hats:[...document.querySelectorAll("#mCard [data-h]")].map(b=>b.dataset.h).join(),coin:[...document.querySelectorAll("#mCard [data-h]")].some(b=>/🪙/.test(b.textContent)),
    more:(document.querySelector("#mCard .mmore")||{}).textContent||""}));
  ok(mw.hats==="miner,cap,cowboy,viking"&&!mw.coin,"clothes tent: only the hats he owns, no prices "+J(mw));
  ok(/Get more at the Trading Post 🏪/.test(mw.more),"clothes tent: \"Get more at the Trading Post 🏪\"");
  await E(()=>document.querySelector('#mCard [data-h="cowboy"]').click());await wait(100);
  ok(await E(()=>state.mine.look.helmet)==="cowboy","a bought helmet is worn from the clothes tent");
  await E(()=>document.querySelector('#mCard [data-h="viking"]').click());await wait(100);
  ok(await E(()=>state.mine.look.helmet)==="viking"&&await E(()=>!!Mine.avatar()),"the new Viking helmet too, and the miner is drawn with it");
  await E(()=>{const b=document.querySelector("#mPanel.on #mClose");if(b)b.click();Mine.exit();});await wait(200);

  // ---- 5. job gear opens at a job level ----
  await E(()=>{state.mine.coins=100;delete state.jobs;Store.open("gear");});await wait(100);
  c=await cards();
  const job=id=>c.find(x=>x.id===id);
  ok(["apron","gloves","scanner","clippers","mailbag","mailcart","bakerhat","rollingpin"].every(id=>job(id).locked&&job(id).act==="locked"),"no jobs yet: the uniforms and tools are locked");
  ok(job("apron").cost==="🔒 Job level 2"&&job("scanner").cost==="🔒 Job level 3","locked cards say the job level: "+job("apron").cost+" / "+job("scanner").cost);
  ok(await E(()=>Store.purchase("gear","apron").why)==="locked"&&(await purse()).c===100,"a locked thing can't be bought, nothing taken");
  await listen();await p.click(btn("apron","gear"));await wait(150);
  ok(/Shopkeeper level 2/.test(await msg())&&(await said()).includes("Keep working at your job to unlock it!"),"tapping a lock says kindly what opens it: "+await msg());
  ok(await E(()=>[1,2,3,4,5].map(Store.tasksForLevel).join())==="0,5,15,30,50","job levels at 5, 15, 30 and 50 tasks");
  await E(()=>{state.jobs={current:null,xp:{shop:5},tasks:5};Store.open("gear");});await wait(100);
  c=await cards();
  ok(!job("apron").locked&&job("apron").cost==="15 🪙"&&job("scanner").locked&&job("gloves").locked,"5 Shopkeeper tasks: the apron opens, the scanner and the mower's gloves wait");
  await wait(700);await p.click(btn("apron","gear"));await wait(150);
  ok(await E(()=>state.owned.apron===1&&state.mine.coins===85&&Store.has("apron")),"the apron is bought with 15 🪙 and kept in owned");
  await E(()=>{state.jobs.xp.shop=15;state.jobs.xp.mow=4;Store.open("gear");});await wait(100);
  c=await cards();
  ok(!job("scanner").locked&&job("gloves").locked,"15 Shopkeeper tasks open the scanner; 4 mowing tasks don't open the gloves");
  // the Mail carrier's and the Baker's: a uniform at job level 2, a tool at level 3
  const label=id=>E(i=>{const d=document.querySelector(`#stGrid .stcard[data-id="${i}"] .job`);return d?d.textContent.trim():"";},id);
  ok(await label("mailbag")==="📬 Mail carrier uniform"&&await label("mailcart")==="📬 Mail carrier tool"&&await label("bakerhat")==="🧁 Baker uniform"&&await label("rollingpin")==="🧁 Baker tool",
    "the new gear says whose it is: "+[await label("mailbag"),await label("mailcart"),await label("bakerhat"),await label("rollingpin")].join(" · "));
  ok(job("mailbag").cost==="🔒 Job level 2"&&job("mailcart").cost==="🔒 Job level 3"&&job("bakerhat").cost==="🔒 Job level 2"&&job("rollingpin").cost==="🔒 Job level 3",
    "…and the job level that opens it: "+["mailbag","mailcart","bakerhat","rollingpin"].map(id=>job(id).cost).join(" / "));
  await E(()=>{state.jobs.xp.mail=5;state.jobs.xp.baker=4;Store.open("gear");});await wait(100);
  c=await cards();
  ok(!job("mailbag").locked&&job("mailbag").cost==="20 🪙"&&job("mailcart").locked&&job("bakerhat").locked&&job("rollingpin").locked,
    "5 Mail carrier tasks open the mail bag (20 🪙); the mail cart waits; 4 Baker tasks open nothing");
  ok(await E(()=>Store.purchase("gear","bakerhat").why)==="locked"&&(await purse()).c===85,"the baker hat can't be bought yet, nothing taken");
  await E(()=>{state.jobs.xp.mail=15;state.jobs.xp.baker=5;Store.open("gear");});await wait(100);
  c=await cards();
  ok(!job("mailcart").locked&&job("mailcart").cost==="45 🪙"&&!job("bakerhat").locked&&job("bakerhat").cost==="25 🪙"&&job("rollingpin").locked,
    "15 Mail carrier tasks open the mail cart (45 🪙); 5 Baker tasks the baker hat (25 🪙), the rolling pin waits");
  await E(()=>{state.jobs.xp.baker=15;Store.open("gear");});await wait(100);
  c=await cards();
  ok(!job("rollingpin").locked&&job("rollingpin").cost==="50 🪙","15 Baker tasks open the rolling pin (50 🪙)");
  ok(await E(()=>["mailbag","mailcart","bakerhat","rollingpin"].every(id=>{const it=Store.get("gear",id);return it.keep==="own"&&!it.wear&&(it.tag==="uniform"||it.tag==="tool");})&&
    Store.gearFor("mail","uniform").id==="mailbag"&&Store.gearFor("baker","tool").id==="rollingpin"),"they are kept in owned, like the other job gear, and are the jobs' uniforms and tools");
  await E(()=>Store.close());

  // ---- 6. saved, and still there after a reload ----
  await E(()=>saveNow());await wait(300);
  await E(()=>location.reload());await waitFor(p,()=>/^Version/.test((document.getElementById("appVer")||{}).textContent||""),{timeout:15000});await wait(500);
  s=await E(()=>({owned:Object.keys(state.owned).sort().join(),hat:state.hat,hats:state.hats.join(),helmet:state.mine.look.helmet,m:Object.keys(state.mine.owned).sort().join()}));
  ok(s.owned==="apron,beanie,bunny,shades,viking"&&s.hat==="bunny"&&s.hats==="flower"&&s.helmet==="viking"&&s.m==="cap,cowboy,miner","bought things are saved "+J(s));

  // ---- 7. an old save (v8.1): its hats and helmets are still his, and still wearable ----
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  s=await E(()=>({hats:state.hats.join(),hat:state.hat,m:Object.keys(state.mine.owned).sort().join(),helmet:state.mine.look.helmet,owned:JSON.stringify(state.owned),g:state.gems,c:state.mine.coins,x:state.exchangeSeen}));
  ok(s.hats==="flower,cap,pirate"&&s.hat==="pirate"&&s.m==="cap,cowboy,knight,miner"&&s.helmet==="knight"&&s.owned==="{}"&&s.g===V8.gems&&s.c===V8.mine.coins,"v8 save: hats, helmets and both purses kept as they were "+J(s));
  await E(()=>Store.open("outfit"));await wait(100);
  c=await cards();
  ok(job("flower").cost==="✓ Yours"&&job("cap").cost==="✓ Yours"&&job("pirate").worn&&job("party").cost==="20 💎","v8 save: the Trading Post knows his hats (the pirate hat on)");
  await p.click('#ovStore [data-shelf="gear"]');await wait(100);
  c=await cards();
  ok(job("cowboy").cost==="✓ Yours"&&job("knight").worn&&job("crown").cost==="250 🪙","v8 save: and his helmets (the knight helmet on)");
  ok(s.x===true&&await E(()=>getComputedStyle(document.getElementById("stSwapTab")).display!=="none"),"v8 save: it holds gems and coins, so the Swap tab is there");
  await E(()=>Store.close());
  await p.click("#albumBtn");await p.click('[data-atab="hats"]');await wait(100);
  ok(await E(()=>[...document.querySelectorAll("#albumGrid .hatcard")].map(c=>c.dataset.id).join())==="flower,cap,pirate","v8 save: the Wardrobe lists his three hats");
  await p.click('#albumGrid .hatcard[data-id="cap"] button');await wait(100);
  ok(await E(()=>state.hat)==="cap","v8 save: a hat from before is worn from the Wardrobe");
  await tidy();
  await E(()=>Mine.enter());await wait(900);
  await E(()=>Mine._openWardrobe(false));await wait(200);
  ok(await E(()=>[...document.querySelectorAll("#mCard [data-h]")].map(b=>b.dataset.h+(b.classList.contains("on")?"*":"")).join())==="miner,cap,cowboy,knight*","v8 save: the clothes tent lists his four helmets, the knight helmet on");
  await E(()=>document.querySelector('#mCard [data-h="cowboy"]').click());await wait(100);
  ok(await E(()=>state.mine.look.helmet)==="cowboy","v8 save: a helmet from before is worn from the clothes tent");
  await E(()=>{Mine.exit();});await wait(200);

  // ---- 8. the Swap tab: hidden until he has held both, then 1 💎 = 5 🪙 both ways ----
  await seed(p,Object.assign({},START,{gems:0,mine:{coins:0}}));await listen();await tidy();
  ok(await E(()=>state.exchangeSeen)===false,"no gems and no coins: the Swap tab has not been seen");
  await E(()=>Store.open());await wait(100);
  ok(await E(()=>getComputedStyle(document.getElementById("stSwapTab")).display)==="none","...and it is hidden");
  await E(()=>{state.gems=3;renderHUD();Store.open();});await wait(100);
  ok(await E(()=>!state.exchangeSeen&&getComputedStyle(document.getElementById("stSwapTab")).display==="none"),"gems only: still hidden");
  await E(()=>{state.mine.coins=12;renderHUD();Store.open();});await wait(100);
  ok(await E(()=>state.exchangeSeen===true&&getComputedStyle(document.getElementById("stSwapTab")).display!=="none"),"gems and coins at once: the Swap tab appears");
  await p.click('#ovStore [data-shelf="swap"]');await wait(100);
  const rows=()=>E(()=>[...document.querySelectorAll("#stSwap .stswap")].map(r=>r.dataset.from+":"+r.querySelector("[data-sum]").textContent).join(" | "));
  ok(await rows()==="coins:5 🪙 → 1 💎 | gems:1 💎 → 5 🪙","each row shows its sum: "+await rows());
  await p.click('.stswap[data-from="coins"] [data-d="1"]');
  ok(await E(()=>document.querySelector('.stswap[data-from="coins"] [data-sum]').textContent)==="10 🪙 → 2 💎","+ adds a whole bundle: 10 🪙 → 2 💎");
  ok(await E(()=>document.querySelector('.stswap[data-from="coins"] [data-d="1"]').disabled),"+ stops at what he has (12 🪙: two bundles)");
  await p.click('.stswap[data-from="coins"] [data-go]');await wait(150);
  ok(J(await purse())===J({g:5,c:2})&&await msg()==="✓ 10 🪙 → 2 💎"&&(await said()).includes("10 coins make 2 gems"),"10 🪙 → 2 💎, shown and said: "+J(await said()));
  await wait(700);
  await p.click('.stswap[data-from="gems"] [data-d="1"]');
  await p.click('.stswap[data-from="gems"] [data-go]');await wait(150);
  ok(J(await purse())===J({g:3,c:12})&&await msg()==="✓ 2 💎 → 10 🪙"&&(await said()).includes("2 gems make 10 coins"),"2 💎 → 10 🪙, shown and said");
  await wait(700);
  await listen();
  let r=await E(()=>Store.swap("coins",7));
  ok(r.why==="bundle"&&J(await purse())===J({g:3,c:12})&&/Coins swap in fives/.test(await msg())&&(await said()).includes("Coins swap in fives."),"7 🪙 is not a whole bundle: refused kindly, nothing moves");
  ok((await E(()=>Store.exchange("coins",0))).ok===false&&(await E(()=>Store.exchange("gems",1.5))).ok===false&&J(await purse())===J({g:3,c:12}),"no swap of nothing or of part of a gem");
  await E(()=>{state.mine.coins=2;Store.open("swap");});await wait(700);
  await p.click('.stswap[data-from="coins"] [data-go]');await wait(150);
  ok(J(await purse())===J({g:3,c:2})&&await msg()==="Almost! 3 more 🪙."&&(await said()).includes("Almost! 3 more coins"),"2 🪙: \"Almost! 3 more 🪙.\", nothing moves");
  ok((await E(()=>Store.exchange("gems",99))).why==="short"&&J(await purse())===J({g:3,c:2}),"a swap never takes more than he has");
  await E(()=>{state.gems=0;state.mine.coins=20;Store.open("swap");});await wait(700);
  await p.dblclick('.stswap[data-from="coins"] [data-go]');await wait(150);
  ok(J(await purse())===J({g:1,c:15}),"a double tap on Swap! swaps once "+J(await purse()));
  await E(()=>Store.close());
  // an older save holding gems but no coins: no Swap tab yet
  await seed(p,Object.assign({},START,{gems:9,mine:{coins:0}}));await tidy();
  ok(await E(()=>state.exchangeSeen)===false,"an old save with gems but no coins: no Swap tab yet");
  await seed(p,Object.assign({},START,{gems:9,mine:{coins:3}}));await listen();await tidy();
  ok(await E(()=>state.exchangeSeen)===true,"an old save with both: the Swap tab is there from the start");

  // ---- 9. the stall in Adventure (keyboard) and the mode ----
  await E(()=>Adv.enter());await wait(500);
  const sp=await E(()=>Store._spot());
  ok(await E(()=>!!document.querySelector(".advland.tpost svg")),"Adventure: the Trading Post stall is in the valley at "+J(sp));
  // it stands like a building: a car parked at it keeps its race, and the stall is there once the car has gone
  await E(s=>{state.critters.forEach(c=>{c.out=false;});const v=state.vehicles.find(x=>x.id==="v_car");v.out=true;v.c=s.c;v.r=s.r;Adv._P.c=s.c+.3;Adv._P.r=s.r;},sp);
  ok(await waitFor(p,()=>/Race/.test(document.getElementById("advAct").textContent)),"a car parked at the stall still offers its race: "+await E(()=>document.getElementById("advAct").textContent));
  await E(()=>{state.vehicles.forEach(v=>{v.out=false;});});
  ok(await waitFor(p,()=>document.getElementById("advAct").textContent==="🏪 Trading Post"),"walking up to it: 🏪 Trading Post");
  await p.keyboard.press("Space");
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure>store"),"Space opens it on top of Adventure: "+await E(()=>Modes.stack().join(">")));
  await p.click("#stClose");
  ok(await waitFor(p,()=>Modes.stack().join(">")==="adventure"),"Done goes back to Adventure");
  await E(()=>Adv.exit());await wait(200);
  ok(await E(()=>!document.querySelector(".advland.tpost")),"leaving Adventure takes the stall away with the other spots");
  ok(await E(()=>Modes.list().store&&Modes.list().store.name==="Trading Post"&&Modes.list().store.reading===false&&state.modeOpens[today()].store>=1),
    "the store mode is counted in Where the time goes: "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  // an older build's hat id is harmless: nothing drawn, nothing thrown
  ok(await E(()=>typeof ART.buddy(1,mulberry(42),"no_such_hat")==="string"),"an unknown hat draws nothing and throws nothing");

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
