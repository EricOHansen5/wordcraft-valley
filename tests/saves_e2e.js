// Old saves: every field gets its default, one-time conversions run once (and say so once),
// loading twice changes nothing, a restored backup goes through the same steps, and a new
// save is exactly def(). The saves are in tests/fixtures:
//   block-era.json    v1/v2 blocks and scenery in the bag and the grid, doubles, no plans list, no version
//   v3-6-doubles.json vehicles before "one of each": doubles past gold, too many out, a rocket mid-launch
//   v8-era.json       v8.1: books, hats, notes, the quest, a Mine with coins and a pet, older settings
//   v9-2-seed.json    the seed the other Playwright tests start from (tests/mine9_e2e.js)
// Expected numbers are worked out by hand from each fixture (see the comments next to them).
const {chromium}=require("playwright");const http=require("http"),fs=require("fs"),path=require("path");
const PORT=8812,BASE="http://localhost:"+PORT;
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// this test's server answers every path with the game, so the service worker can't register (not a save problem)
const SW_NOISE=/unsupported MIME type/;
// in September the season's free plan (Pumpkin patch) is added to the plans when the valley loads,
// after the Factory's free plan (given once, in bootFixups, to every save that doesn't have it)
const SEASON_PLAN="pumpkinpatch",FACTORY_PLAN="factory";
const srv=require("./page").serveApp({port:PORT,before(q,r){
  // a page on the same origin with no game on it, for writing a save before the game starts
  if(!q.url.startsWith("/blank"))return false;r.writeHead(200,{"content-type":"text/html"});r.end("<!doctype html><title>blank</title>");return true;}},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  let failed=0;const ok=(c,m)=>{if(!c)failed++;console.log((c?"PASS ":"FAIL ")+m);};
  const J=x=>JSON.stringify(x);
  const same=(a,b)=>J(a)===J(b);

  // a fresh browser profile at a fixed time, so dates in the fixtures are "yesterday"
  async function open(){
    const ctx=await b.newContext({viewport:{width:1180,height:820},timezoneId:"America/Los_Angeles"});
    const p=await ctx.newPage(),errs=[];
    p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error"&&!SW_NOISE.test(m.text()))errs.push("console: "+m.text());});
    await p.clock.install({time:new Date("2026-09-12T10:00:00-07:00")});
    return{ctx,p,errs,E:x=>p.evaluate(x)};
  }
  // write a save the way the game stores it, before the game has started
  async function seed(p,st){
    await p.goto(BASE+"/blank");
    await p.evaluate(s=>new Promise(res=>{const r=indexedDB.open("wordcraft-valley",2);
      r.onupgradeneeded=()=>{r.result.createObjectStore("kv");r.result.createObjectStore("blobs");};
      r.onsuccess=()=>{const tx=r.result.transaction("kv","readwrite");tx.objectStore("kv").put(s,"state");tx.oncomplete=()=>{r.result.close();res();};};}),st);
  }
  // start the game (the real boot path) and count toasts from then on
  async function boot(p,reload){
    if(reload)await p.reload();else await p.goto(BASE+"/");
    for(let i=0;i<150;i++){if(await p.evaluate(()=>{const v=document.getElementById("appVer");return !!(v&&v.textContent);}))break;await sleep(100);}
    await p.evaluate(()=>{window.__toasts=[];const t=toast;toast=function(m){window.__toasts.push(String(m));return t.apply(this,arguments);};});
  }
  const snap=p=>p.evaluate(()=>JSON.parse(JSON.stringify(state,(k,v)=>(k&&k[0]==="_")?undefined:v)));
  const stored=p=>p.evaluate(()=>DB.get("kv","state"));
  // every key of def(), inside nested objects too, is on the save
  const missing=p=>p.evaluate(()=>{const out=[];
    const walk=(d,s,at)=>Object.keys(d).forEach(k=>{if(!Object.prototype.hasOwnProperty.call(s,k)){out.push(at+k);return;}
      if(isPlain(d[k])&&isPlain(s[k]))walk(d[k],s[k],at+k+".");});
    walk(def(),state,"");return out;});
  // Ignored when comparing two loads of the same save: where things stand in the valley
  // (the camera, and animals, vehicles and the buddy wander and are nudged apart at load).
  const IGNORED="cam; c, r, face, alt and dir of animals and vehicles; the buddy's c and r";
  const norm=s=>{s=JSON.parse(J(s));delete s.cam;
    (s.critters||[]).concat(s.vehicles||[]).forEach(x=>{delete x.c;delete x.r;delete x.face;delete x.alt;delete x.dir;});
    if(s.buddy){delete s.buddy.c;delete s.buddy.r;}return s;};
  const diff=(a,b,at="",out=[])=>{
    if(a&&b&&typeof a==="object"&&typeof b==="object"&&Array.isArray(a)===Array.isArray(b)){
      new Set(Object.keys(a).concat(Object.keys(b))).forEach(k=>diff(a[k],b[k],at+k+".",out));}
    else if(J(a)!==J(b))out.push(at.slice(0,-1)+": "+J(a)+" → "+J(b));return out;};
  const lv=list=>list.map(x=>x.id+":"+x.lv).join(" ");
  const outs=list=>list.filter(x=>x.out!==false).map(x=>x.id).join(" ");
  const mastered=s=>Object.values(s.stats).filter(x=>x&&x.mastered).length;
  const booksDone=s=>Object.values(s.library).filter(x=>x&&x.done).length;
  const OLD_BLOCKS=n=>`Your old blocks became ${n} gems — spend them on buildings`;
  const TIDIED="Tidied up! Doubles became upgrades ★ — extra animals and vehicles are resting in the sticker book.";

  // load a fixture, check it, load it again and check nothing changes
  async function twice(name,check){
    const fx=FX(name),{ctx,p,errs,E}=await open();
    await seed(p,fx);await boot(p);await p.clock.runFor(8000);
    const s1=await snap(p),t1=await E("window.__toasts");
    ok(s1.v===await E("SAVE_V"),`${name}: state.v is SAVE_V (${s1.v})`);
    const miss=await missing(p);ok(!miss.length,`${name}: every key of def() is on the save${miss.length?" — missing "+miss.join(", "):""}`);
    await check(s1,t1,fx,E,p);
    // the game wrote the converted save itself (no help from the test)
    const st=await stored(p),ds=diff(norm(st),norm(s1));
    ok(st.v===s1.v&&!ds.length,`${name}: the game stored the converted save (v ${st.v})${ds.length?": "+ds.slice(0,4).join(" | "):""}`);
    await boot(p,true);
    const s2a=await snap(p);await p.clock.runFor(8000);const s2=await snap(p),t2=await E("window.__toasts");
    const d1=diff(norm(s1),norm(s2a)),d2=diff(norm(s1),norm(s2));
    ok(!d1.length,`${name}: loading it again changes nothing${d1.length?": "+d1.slice(0,6).join(" | "):""}`);
    ok(!d2.length,`${name}: nor does playing on for 8 s after the second load${d2.length?": "+d2.slice(0,6).join(" | "):""}`);
    ok(!t2.includes(TIDIED)&&!t2.some(t=>/^Your old blocks became/.test(t)),`${name}: no tidy-up toasts on the second load (${J(t2)})`);
    ok(!errs.length,`${name}: no page or console errors ${errs.slice(0,3).join(" | ")}`);
    await ctx.close();return{s1,t1};
  }
  console.log("(ignored between loads: "+IGNORED+")");

  // defaults() on its own: fills what is missing, recurses into plain objects only, keeps every saved value
  {const{ctx,p,E}=await open();await boot(p);
   const r=await E(`defaults({a:null,b:0,c:"",d:false,e:{x:1},q:{k:1},arr:[1],g:{h:null}},
     {a:{z:1},b:5,c:"x",d:true,e:{x:2,y:{z:3}},q:null,arr:[9,9],g:{h:{i:1},j:2},n:{m:1}})`);
   ok(same(r,{a:null,b:0,c:"",d:false,e:{x:1,y:{z:3}},q:{k:1},arr:[1],g:{h:null,j:2},n:{m:1}}),"defaults(): only missing keys are filled "+J(r));
   await ctx.close();}

  // 1. block era: blocks become gems, doubles fold into levels, both toasts once
  await twice("block-era.json",async(s,t)=>{
    // refunds: bag grass 6×2 + dirt 3×2 + torch 2×2 + water 0 = 22; grid grass, flowers, fence, stone 4×2 = 8 → 30
    ok(s.gems===31+30,"block era: 30 gems refunded for old blocks (gems "+s.gems+")");
    // lanterns: 3 on the grid → ★★ (1+1+1), then the one in the bag is capped at gold; campfire in the bag joins the one on the grid
    ok(same(s.grid,{"3,8":{id:"lantern",seed:102,lv:3},"7,7":{id:"well",seed:104},"13,8":{id:"campfire",seed:107,lv:2}}),"block era: scenery gone, doubles folded "+J(s.grid));
    ok(same(s.inventory,{birdhouse:{n:1,lv:3}}),"block era: three bird houses in the bag became one at gold "+J(s.inventory));
    ok(s.selected===null,"block era: dirt is no longer selected");
    ok(same(s.blueprints,["lantern","well","campfire",FACTORY_PLAN,SEASON_PLAN]),"block era: what stands in the valley counts as owned plans "+J(s.blueprints));
    // foxes: 1+1+1 = gold; since is each one's place in the saved list
    ok(lv(s.critters)==="fox:3 dog:1 hen:1"&&J(s.critters.map(c=>c.since))==="[0,1,3]"&&outs(s.critters)==="fox dog hen","block era: three foxes became one at gold "+lv(s.critters));
    ok(s.tidied===true,"block era: tidied is set");
    ok(t.includes(OLD_BLOCKS(30))&&t.includes(TIDIED),"block era: both tidy-up toasts on the first load "+J(t));
    ok(mastered(s)===4&&s.wordsRead===48&&s.review.length===2,"block era: words read, mastered words and reviews kept");
    ok(same(s.customWords,[{w:"zip",p:["z","i","p"],t:1,custom:true}]),"block era: custom words kept");
    ok(same(s.settings,{pics:true,tts:true,ambient:false,tierOverride:0,nature:true,speech:false,timer:0,spell:.6,fastTrack:true,voice:null,voicePack:true,voiceRate:1,goal:12,together:"",
      talk:false,eyesFree:false,      // TALK: Talk to me and Eyes-free, off
      saver:true}),      // SAVE BATTERY: on
      "block era: settings kept (ambient off), newer ones get their defaults "+J(s.settings));
    ok(s.mine.coins===0&&s.mine.made===false&&!("w" in s.mine),"block era: the Mine is there with an empty purse, not visited yet");
    ok(same(s.hats,[])&&s.hat===null&&booksDone(s)===0&&same(s.notes,[])&&same(s.vehicles,[]),"block era: no hats, books, notes or vehicles yet");
  });

  // 2. v3.6: doubles past gold pay gems, extras rest, a stunt cut short doesn't freeze the rocket
  await twice("v3-6-doubles.json",async(s,t)=>{
    // lantern ×4 on the grid: ★, ★★, then the 4th pays round(5/2)=3; garage ×2 → ★
    // fox ×4: ★, ★★, then the 4th pays 5×1; car ×4: the same, 5 → refund 3+5+5 = 13
    ok(s.gems===57+13,"v3.6: 13 gems for doubles past gold (gems "+s.gems+")");
    ok(J(Object.keys(s.grid))==='["3,8","6,8","15,7"]'&&s.grid["3,8"].lv===3&&s.grid["6,8"].lv===2&&s.grid["15,7"].lv===2,"v3.6: grid folded "+J(s.grid));
    ok(same(s.inventory,{windmill:{n:1,lv:2},bell:{n:1,lv:1}})&&s.selected==="bell","v3.6: bag folded, the bell still selected "+J(s.inventory));
    ok(lv(s.critters)==="fox:3 dog:2 wolf:1 bear:1 hen:1 pig:1 duck:1 frog:1","v3.6: animals folded "+lv(s.critters));
    // 4 rows: 5 animals and 4 vehicles out; the ones out longest rest first
    ok(outs(s.critters)==="bear hen pig duck frog","v3.6: the five newest animals are out "+outs(s.critters));
    ok(lv(s.vehicles)==="v_car:3 v_bus:1 v_rocket:1 v_tractor:1 v_taxi:1 v_bike:1","v3.6: vehicles folded "+lv(s.vehicles));
    ok(outs(s.vehicles)==="v_rocket v_tractor v_taxi v_bike","v3.6: the four newest vehicles are out "+outs(s.vehicles));
    const rk=s.vehicles.find(v=>v.id==="v_rocket");ok(!("busy" in rk)&&!("hold" in rk),"v3.6: the rocket is not frozen mid-launch");
    ok(same(s.blueprints,["lantern","garage","well","windmill","campfire",FACTORY_PLAN,SEASON_PLAN]),"v3.6: plans kept "+J(s.blueprints));
    ok(t.includes(OLD_BLOCKS(13))&&t.includes(TIDIED),"v3.6: both tidy-up toasts on the first load "+J(t));
    ok(s.settings.timer===15&&s.settings.nature===true&&s.settings.spell===.6&&s.settings.fastTrack===true,"v3.6: timer kept, spelling share and fast track defaulted "+J(s.settings));
    ok(same(s.hats,["cap"])&&s.hat==="cap"&&mastered(s)===3&&s.wordsRead===212&&booksDone(s)===0&&same(s.customWords,[])&&same(s.notes,[])&&s.mine.coins===0,
      "v3.6: hat, 3 mastered words and words read kept; no books, notes or coins yet");
  });

  // 3. v8.1: nothing to convert, everything kept, new fields filled in
  const V8=FX("v8-era.json");
  const v8checks=async(s,t,label,plans)=>{
    ok(s.gems===212&&s.wordsRead===640&&mastered(s)===6,`${label}: gems, words read and 6 mastered words kept`);
    ok(same(s.hats,["flower","cap","pirate"])&&s.hat==="pirate",`${label}: hats kept`);
    ok(s.mine.coins===1375&&s.mine.pet==="dog"&&s.mine.pick===2&&s.mine.w===50&&s.mine.dug===V8.mine.dug&&s.mine.eggs.length===1,
      `${label}: the Mine keeps coins, pet, pick, width and tunnels`);
    ok(same(s.mine.blocks,{dirt:6,stone:0,sand:0,ladder:4,torch:3,sign:2})&&same(s.mine.vaults,{})&&same(s.mine.stat,{}),`${label}: v9 Mine fields get their defaults`);
    ok(booksDone(s)===3&&same(s.library,V8.library),`${label}: 3 books finished`);
    ok(same(s.settings,Object.assign({},V8.settings,{fastTrack:true,goal:12,together:""},
      {talk:false,eyesFree:false},{saver:true})),`${label}: settings kept (nature off, timer 20, spelling .4, voice), fast track, reading goal and Read together defaulted `+J(s.settings));
    ok(same(s.customWords,V8.customWords)&&same(s.notes,V8.notes)&&s.noteFrom==="Mom",`${label}: custom words and notes kept`);
    ok(lv(s.critters)==="fox:3 dog:2 wolf:1 frog:1 penguin:2"&&outs(s.critters)==="fox dog frog penguin",`${label}: animals and who is out kept `+lv(s.critters));
    ok(lv(s.vehicles)==="v_car:2 v_rocket:1 v_train:1 v_sled:3"&&outs(s.vehicles)==="v_car v_rocket v_train",`${label}: vehicles kept `+lv(s.vehicles));
    const rk=s.vehicles.find(v=>v.id==="v_rocket");ok(!("busy" in rk)&&!("hold" in rk)&&s.vehicles[0].wins===3,`${label}: rocket not frozen, race wins kept`);
    ok(same(s.grid,V8.grid)&&same(s.blueprints,plans)&&same(s.inventory,V8.inventory),`${label}: buildings and plans unchanged `+J(s.blueprints));
    ok(same(s.adv,V8.adv)&&s.quest.ch===3&&same(s.mybooks,V8.mybooks)&&same(s.write,V8.write)&&same(s.skills,V8.skills)&&same(s.comp,V8.comp),`${label}: adventure, quest, own books, writing, skills kept`);
    ok(s.sync.url===""&&s.sync.auto===true&&s.sync.lastFile===V8.sync.lastFile&&s.deviceId==="k3v9x2qa",`${label}: backup settings kept`);
    ok(same(s.modeMin,{})&&same(s.modeOpens,{}),`${label}: time-by-mode starts empty`);
    ok(!t.includes(TIDIED)&&!t.some(x=>/^Your old blocks became/.test(x)),`${label}: no tidy-up toasts (${J(t)})`);
  };
  await twice("v8-era.json",(s,t)=>v8checks(s,t,"v8",V8.blueprints.concat(FACTORY_PLAN,SEASON_PLAN)));

  // 4. the v9.2 test seed: no version, nothing to convert
  await twice("v9-2-seed.json",async(s,t)=>{
    ok(s.gems===20&&s.mine.coins===40&&s.mine.pet==="dog"&&same(s.mine.bosses,{beetle:1,golem:1})&&s.mine.deepest===30,"v9.2: gems and the Mine kept");
    ok(lv(s.critters)==="dog:1"&&s.critters[0].since===0&&s.critters[0].out===true,"v9.2: the dog gets a level, a place in line and is out");
    ok(same(s.adv,{seenIntro:1,dex:{},hunt:null,huntDay:null,hunts:0,caught:0}),"v9.2: adventure keeps seenIntro and gets the rest "+J(s.adv));
    ok(same(s.hats,[])&&mastered(s)===0&&booksDone(s)===0&&same(s.notes,[])&&same(s.customWords,[])&&s.settings.spell===.6,"v9.2: nothing else to keep; the rest are defaults");
    ok(!t.includes(TIDIED)&&!t.some(x=>/^Your old blocks became/.test(x)),"v9.2: no tidy-up toasts");
  });

  // restoring a backup goes through the same steps
  {const{ctx,p,errs,E}=await open();await boot(p);await p.clock.runFor(1000);
   await p.evaluate(o=>restoreBackup(o),{kind:"wordcraft-backup",v:1,savedAt:"2026-09-11T19:02:11.000Z",words:640,state:FX("v8-era.json"),blobs:{}});
   await p.clock.runFor(8000);const s=await snap(p),t=await E("window.__toasts");
   ok(s.v===await E("SAVE_V"),"restore v8: state.v is SAVE_V");
   const miss=await missing(p);ok(!miss.length,"restore v8: every key of def() is on the save "+miss.join(", "));
   // (the season's free plan is given when the game starts, not on a restore)
   await v8checks(s,t,"restore v8",V8.blueprints.concat(FACTORY_PLAN));
   ok((await stored(p)).v===s.v,"restore v8: stored");
   // an older export was just the save: the block-era one is converted, with its toasts
   await p.evaluate(o=>restoreBackup(o),FX("block-era.json"));await p.clock.runFor(8000);
   const s2=await snap(p),t2=await E("window.__toasts");
   ok(s2.v===s.v&&s2.gems===61&&lv(s2.critters)==="fox:3 dog:1 hen:1"&&t2.includes(OLD_BLOCKS(30)),"restore block era: converted on restore "+J(t2.slice(-3)));
   ok(!errs.length,"restore: no page or console errors "+errs.slice(0,3).join(" | "));await ctx.close();}

  // nothing stored: the save is def() plus what the first start adds
  {const{ctx,p,errs,E}=await open();await boot(p);await p.clock.runFor(3000);
   const r=await E(()=>{const d=def();d.mine.seed=state.mine.seed;
     const keys=o=>Object.keys(o).sort().join(",");
     return{same:keys(d)===keys(state),v:state.v,SAVE_V,
       changed:Object.keys(d).filter(k=>JSON.stringify(d[k])!==JSON.stringify(state[k])),fox:state.critters.map(c=>c.id)};});
   ok(r.same,"new save: exactly the keys of def()");
   ok(r.v===r.SAVE_V,"new save: state.v is SAVE_V ("+r.v+")");
   // the first start seeds a fox, gives the season's free plan, sets today's quests and reading goal and marks the season as seen; nothing else
   ok(same(r.changed,["critters","blueprints","quests","seasonSeen","goal"])&&same(r.fox,["fox"]),"new save: only the fox, the season's plan, quests, reading goal and season differ from def() "+J(r.changed));
   ok(!errs.length,"new save: no errors "+errs.join(" | "));await ctx.close();}

  // existence used as a flag: the Mine is part of every save now, but it is still a first visit
  {const{ctx,p,errs,E}=await open();await boot(p);await p.clock.runFor(2000);
   await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);
   const m0=await E(()=>({made:state.mine.made,w:"w" in state.mine,coins:state.mine.coins,running:Mine._running(),btn:getComputedStyle(document.getElementById("mineBtn")).display}));
   ok(m0.made===false&&!m0.w&&m0.coins===0&&m0.running===false&&m0.btn!=="none","new save: the Mine is not made, not open, no world yet; the button is there "+J(m0));
   // read the first book: its coins go into the Mine's purse before the Mine was ever opened
   await E(`Books.openBook("cat_hat")`);await p.clock.runFor(500);await E(`document.getElementById("bStart").click()`);await p.clock.runFor(500);
   const n=await E(`BOOKS.find(b=>b.id==="cat_hat").pages.length`);
   for(let i=0;i<n;i++){await E(`(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();})()`);await p.clock.runFor(300);}
   const quiz=await E(`BOOKS.find(b=>b.id==="cat_hat").quiz`);
   for(let k=0;k<quiz.length+1;k++){if(!await E(`!!document.querySelector(".bopt")`))break;
     const q=quiz[(await E("Books._state()")).quizIdx],ans=q.pics||q.words?q.a:(q.yes?"yes":"no");
     await E(`document.querySelector('.bopt[data-v="${ans}"]').click()`);await p.clock.runFor(1200);}
   const m1=await E(()=>({coins:state.mine.coins,made:state.mine.made,done:(state.library.cat_hat||{}).done}));
   ok(m1.done===true&&m1.coins===15&&m1.made===false,"new save: finishing a level-1 book pays 15 coins into the Mine's purse "+J(m1));
   await E("Books.close()");await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);
   await E("Mine.enter()");await p.clock.runFor(600);
   const m2=await E(()=>({first:(document.querySelector("#mPanel.on #mClose")||{}).textContent,w:state.mine.w,dug:state.mine.dug,x:state.mine.x,coins:state.mine.coins}));
   ok(m2.first==="Let's dig!"&&m2.w===50&&m2.dug===""&&m2.x===20.2&&m2.coins===15,"new save: the first visit still opens the miner designer "+J(m2));
   await E("Mine.exit()");ok(!errs.length,"first visit: no errors "+errs.join(" | "));await ctx.close();}

  // a mine saved before the town got wider (no width) still gets fresh tunnels, once, when opened
  {const fx=FX("v8-era.json");delete fx.mine.w;fx.mine.eggs=[];
   const{ctx,p,errs,E}=await open();await seed(p,fx);await boot(p);await p.clock.runFor(2000);
   const a=await E(()=>({w:"w" in state.mine,dug:state.mine.dug.length}));
   ok(!a.w&&a.dug===fx.mine.dug.length,"narrow mine: loading doesn't give it a width or touch its tunnels "+J(a));
   await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);await E("Mine.enter()");await p.clock.runFor(600);
   const m=await E(()=>({w:state.mine.w,dug:state.mine.dug,x:state.mine.x,coins:state.mine.coins,pick:state.mine.pick,made:state.mine.made}));
   ok(m.w===50&&m.dug===""&&m.x===20.2&&m.coins===1375&&m.pick===2&&m.made===true,"narrow mine: opening it gives fresh tunnels and keeps what he owns "+J(m));
   await E("Mine.exit()");ok(!errs.length,"narrow mine: no errors "+errs.join(" | "));await ctx.close();}

  // a saved null: re-made where the game always re-made it, kept everywhere else
  {const fx=FX("v9-2-seed.json");Object.assign(fx,{mine:null,adv:null,sync:null,settings:null,notes:null,timers:null,hat:null,quests:null,seasonSeen:null});
   const{ctx,p,errs,E}=await open();await seed(p,fx);await boot(p);await p.clock.runFor(2000);
   const s=await snap(p);
   ok(s.mine&&s.mine.made===false&&s.mine.coins===0&&same(s.sync,{url:"",token:"",last:0,auto:true})&&same(s.notes,[])&&same(s.timers,{}),"saved null: Mine, backup settings, notes and timers get their defaults");
   ok(s.settings&&s.settings.pics===true&&s.settings.spell===.6&&same(s.adv.dex,{}),"saved null: settings and adventure get their defaults");
   ok(s.hat===null&&s.quests&&s.quests.date==="2026-09-12","saved null: no hat stays no hat; today's quests are made as before");
   ok(!errs.length,"saved null: no errors "+errs.join(" | "));await ctx.close();}

  await b.close();srv.close();
  console.log(failed?failed+" failed":"all save checks passed");process.exit(failed?1:0);
});
