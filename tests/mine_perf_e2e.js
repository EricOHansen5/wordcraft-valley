// The Gem Mine opens quickly: its page parts and block textures are made once, in the background after the game
// starts, so tapping its tile only has to start the mine. And the textures still look exactly as they did.
const {launch,check,waitFor,tile,reload}=require("./lib");
// every block texture's pixels as one number (Mine._texSig), taken from the textures as they were first drawn
const TEX_SIG=1341817642;
// the world (blocks, ores, the mine's signs, the vaults) as one number (Mine._worldSig), from the world as it was first made:
// the base save's mine, a played one (another seed, a dug hole, built blocks, two bosses beaten, a vault open), and back
const WORLD={base:4158069493,played:218896044,back:4158069493};
(async()=>{const t=check("mine_perf");
  const {page:p,errs,close,E}=await launch({seed:{}});
  // 1 warm: the mine gets ready on its own while he is in the valley, without opening or showing anything
  const warm=await waitFor(p,()=>Mine._builds()>0,{timeout:12000});
  const w=await E(()=>{const r=document.getElementById("mineMode");
    return{builds:Mine._builds(),running:Mine._running(),top:Modes.top(),on:!!r&&r.classList.contains("on"),display:r&&getComputedStyle(r).display,style:r&&r.getAttribute("style")};});
  t.ok(warm&&w.builds===1&&!w.running&&w.top!=="mine"&&!w.on&&w.display==="none"&&!w.style,"the mine is made in the background, hidden and not running: "+JSON.stringify(w));
  t.ok(await E(()=>Mine._texSig())===TEX_SIG,"its block textures are the same pixels as before: "+await E(()=>Mine._texSig()));
  // the part of the world that comes from the seed alone is made in the warm-up too, once
  t.ok(await E(()=>Mine._bases())===1,"the world's seed part is made in the background: "+await E(()=>Mine._bases()));
  // 2 opening it (twice) uses what was made: nothing is made again
  await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));   // a keeper waking up
  await tile(p,"#mineBtn");
  t.ok(await waitFor(p,()=>Mine._running()&&Modes.top()==="mine"),"the Gem Mine tile opens the mine");
  const close1=()=>E(()=>{const b=document.querySelector("#mPanel.on #mClose");if(b)b.click();});
  await close1();await p.waitForTimeout(300);
  await E(()=>Mine.exit());
  await tile(p,"#mineBtn");
  t.ok(await waitFor(p,()=>Mine._running()),"and opens again");
  t.ok(await E(()=>Mine._builds())===1,"two openings, still made once: "+await E(()=>Mine._builds()));
  t.ok(await E(()=>Mine._bases())===1,"and the world's seed part too: "+await E(()=>Mine._bases()));
  // the world is the same as it ever was, for any seed and whatever he has done to it
  const worlds=await E(()=>{const m=state.mine,out={};
    const keep={seed:m.seed,dug:m.dug,placed:m.placed,bosses:m.bosses,vaults:m.vaults};
    Mine._gen();out.base=Mine._worldSig();
    m.seed=777;m.dug="";m.bosses={beetle:1,golem:1};m.vaults={0:1};m.placed={};m.placed[(Mine.SKY+5)*50+30]=12;m.placed[(Mine.SKY+7)*50+31]=11;
    Mine._gen();for(let y=Mine.SKY+1;y<Mine.SKY+30;y++)for(let x=25;x<29;x++)Mine._setTile(x,y,0);
    Mine.exit();Mine.enter();out.played=Mine._worldSig();
    Object.assign(m,keep);Mine._gen();out.back=Mine._worldSig();
    return out;});
  t.ok(JSON.stringify(worlds)===JSON.stringify(WORLD),"the same world: "+JSON.stringify(worlds));
  await close1();await E(()=>Mine.exit());
  // 3 cold: opened straight after the game starts (before the background warm-up), it is made then, and only then
  await reload(p,{settle:0});
  await E(()=>Mine.enter());
  t.ok(await E(()=>Mine._running()&&Mine._builds()===1),"opened before the warm-up, it is made on the spot");
  t.ok(await E(()=>Mine._texSig())===TEX_SIG,"with the same textures");
  await p.waitForTimeout(6000);
  t.ok(await E(()=>Mine._builds()===1&&document.querySelectorAll("#mineMode").length===1),"and the warm-up later does not make a second one");
  t.ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
