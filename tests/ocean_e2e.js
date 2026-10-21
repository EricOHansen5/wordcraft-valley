// My Ocean: the sea creatures he buys with gems and keeps swimming on Home. An old save starts with Home's four,
// 🐠 shows NEW until the shop is opened, a creature is bought with one more tap (and only says how many more gems
// without enough), the price is taken once, at most 12 swim (a new one in, the longest swimming rests), the
// switches, the creatures on Home (each drawn, off screen at both ends of its swim, still under the sheet and at
// rest), a tap says its name, the voice list, and it all survives a reload. A 1024x768 iPad that starts on Home.
"use strict";
const {launch,check,waitFor,seed}=require("./lib");
(async()=>{
  const t=check("ocean"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},home:true,seed:{gems:2000,settings:{goal:0}}});
  const wait=ms=>p.waitForTimeout(ms);
  const ix=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}));
  const swimmers=()=>E(()=>[...document.querySelectorAll("#ovHome .hfish")].map(f=>f.dataset.id));
  const states=()=>E(()=>[...document.querySelectorAll("#ovHome .hfish")].map(f=>{const a=f.getAnimations()[0];return a?a.playState:"none";}));
  await wait(800);await ix();

  // ---- 1. an old save: Home's four, the defaults, NEW on 🐠 ----
  const s0=await E(()=>({def:JSON.stringify(def().ocean),st:JSON.stringify(state.ocean),shown:Ocean.shown(),newMark:!!document.querySelector("#hOcean .hnew")}));
  ok(s0.def===J({owned:{},shown:null,seen:false})&&s0.st===s0.def,"state.ocean defaults to nothing bought and the free four "+J(s0));
  ok(J((await swimmers()).slice().sort())===J(["blowfish","fish","tropical","turtle"]),"an old save swims Home's four: the tropical fish, the blowfish, the turtle and the little fish "+J(await swimmers()));
  ok(s0.newMark,"🐠 shows NEW before he has opened the shop");
  const arts=await E(()=>Ocean.list().filter(c=>!/<path|<circle|<ellipse|<polygon/.test(Ocean.pic(c))).map(c=>c.id));
  ok(!arts.length,"every creature has a drawing "+J(arts));
  const prices=await E(()=>Ocean.list().filter(c=>!c.free).map(c=>c.price));
  ok(prices.every(x=>x>=300&&x<=5000)&&Math.max.apply(null,prices)===5000&&Math.min.apply(null,prices)===300,"prices run from 300 to 5,000 💎 "+J(prices));

  // ---- 2. the sheet ----
  await E(()=>{window.__said=[];const s=Sound.speak;Sound.speak=(x,r)=>{window.__said.push(String(x));return s(x,r);};});
  await p.click("#hOcean");await wait(300);
  const o1=await E(()=>({top:Modes.top(),seen:state.ocean.seen,newMark:!!document.querySelector("#hOcean .hnew"),
    cards:document.querySelectorAll("#ovOcean .occard").length,n:Ocean.list().length,said:window.__said.slice()}));
  ok(o1.top==="ocean"&&o1.cards===o1.n,"🐠 opens My Ocean, with every creature in the shop "+J(o1));
  ok(o1.seen&&!o1.newMark,"...and NEW goes");
  ok(o1.said.indexOf("Welcome to your ocean!")>=0,"...and it says hello "+J(o1.said));
  ok(J(await states())===J(["paused","paused","paused","paused"]),"the creatures hold still under the sheet "+J(await states()));

  // ---- 3. buying with enough: a tap shows it big, one more tap buys it ----
  await E(()=>{window.__said=[];});
  await p.click('#ovOcean .occard[data-id="dolphin"]');await wait(200);
  const b1=await E(()=>({big:!document.getElementById("ocBig").hidden,txt:document.getElementById("ocBig").textContent,gems:state.gems,said:window.__said.slice()}));
  ok(b1.big&&/Dolphin/.test(b1.txt)&&/Buy for 1,500/.test(b1.txt)&&b1.gems===2000,"a tap shows the dolphin big with its price, and takes nothing yet "+J(b1));
  ok(b1.said.indexOf("Dolphin")>=0,"...and says its name");
  await p.click('#ocBig [data-act="no"]');await wait(650);
  ok(await E(()=>document.getElementById("ocBig").hidden&&state.gems===2000&&!Ocean.owns("dolphin")),"Not now takes nothing");
  await p.click('#ovOcean .occard[data-id="dolphin"]');await wait(650);
  await p.click('#ocBig [data-act="buy"]');await wait(300);
  const b2=await E(()=>({gems:state.gems,own:Ocean.owns("dolphin"),shown:Ocean.shown(),msg:document.getElementById("ocMsg").textContent,owned:JSON.stringify(state.ocean.owned)}));
  ok(b2.gems===500&&b2.own&&b2.owned===J({dolphin:1}),"Buy takes 1,500 💎 once and the dolphin is his "+J(b2));
  ok(b2.shown.indexOf("dolphin")>=0&&b2.shown.length===5,"...and it swims at once "+J(b2.shown));
  ok(/dolphin is yours/.test(b2.msg),"...and the sheet says so: "+b2.msg);
  const again=await E(()=>Ocean.buy("dolphin"));
  ok(!again.ok&&again.why==="owned"&&(await E(()=>state.gems))===500,"buying it again takes nothing "+J(again));

  // ---- 4. not enough: how many more, nothing taken ----
  await E(()=>{window.__said=[];});
  await wait(650);await p.click('#ovOcean .occard[data-id="whale"]');await waitFor(p,()=>window.__said.length>=2,{timeout:6000});
  const sh=await E(()=>({txt:document.getElementById("ocBig").textContent,buy:!!document.querySelector('#ocBig [data-act="buy"]'),gems:state.gems,said:window.__said.slice()}));
  ok(/need 2,500 more/.test(sh.txt)&&!sh.buy&&sh.gems===500,"without enough gems: no Buy button, it says 2,500 more "+J(sh));
  ok(sh.said.length&&sh.said[0]==="Whale"&&sh.said.slice(1).some(x=>/^Almost!/.test(x)),"...says its name, then kindly how many more "+J(sh.said));
  const r=await E(()=>Ocean.buy("whale"));
  ok(!r.ok&&r.why==="short"&&r.need===2500&&(await E(()=>state.gems))===500&&!(await E(()=>Ocean.owns("whale"))),"Ocean.buy without enough takes nothing "+J(r));
  await p.click('#ocBig [data-act="ok"]');await wait(650);

  // ---- 5. on Home: drawn, off screen at both ends, swimming again once the sheet closes ----
  await p.click("#ocDone");await wait(400);
  ok((await swimmers()).indexOf("dolphin")>=0,"the dolphin swims on Home "+J(await swimmers()));
  ok((await states()).every(x=>x==="running"),"...and they all swim once the sheet closes "+J(await states()));
  const ends=await E(()=>{const f=document.querySelector('#ovHome .hfish[data-id="dolphin"]'),a=f.getAnimations()[0],k=a.effect.getKeyframes(),w=f.parentNode.parentNode.clientWidth,z=f.offsetWidth;
    const x=s=>+(/translateX\((-?[\d.]+)px\)/.exec(s)||[0,0])[1];return{from:x(k[0].transform),to:x(k[k.length-1].transform),w,z};});
  ok(Math.max(ends.from,ends.to)>=ends.w&&Math.min(ends.from,ends.to)<=-ends.z,"a swim starts and ends off screen "+J(ends));
  // a tap says its name
  await E(()=>{window.__said=[];});
  await E(()=>{const f=document.querySelector('#ovHome .hfish[data-id="dolphin"]');f.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}));});
  ok(await E(()=>window.__said.indexOf("Dolphin")>=0),"tapping a creature on Home says its name "+J(await E(()=>window.__said)));
  // at rest they hold still
  await E(()=>{Rest._idleMs=200;});
  for(let i=0;i<20&&!(await E(()=>{Rest.check();return document.body.classList.contains("rest");}));i++)await wait(150);
  ok((await states()).every(x=>x==="paused"),"...and they hold still when the game rests "+J(await states()));
  await E(()=>{Rest._idleMs=45000;Rest.poke();});await wait(200);

  // ---- 6. twelve at once: a new one goes in, the one swimming longest rests ----
  await E(()=>{state.gems=50000;const all=Ocean.list().filter(c=>!c.free).map(c=>c.id);
    ["goldfish","shrimp","redfish","pinkfish","bluetang","greenpuffer","crab"].forEach(id=>state.ocean.owned[id]=1);
    state.ocean.shown=["turtle","tropical","blowfish","fish","dolphin","goldfish","shrimp","redfish","pinkfish","bluetang","greenpuffer","crab"];Ocean.render();save();});
  const c12=await E(()=>{const r=Ocean.buy("megalodon");return{r,shown:Ocean.shown(),gems:state.gems};});
  ok(c12.r.ok&&c12.r.rested==="turtle"&&c12.shown.length===12&&c12.shown.indexOf("megalodon")===11&&c12.shown.indexOf("turtle")<0,"with 12 swimming the Megalodon goes in and the turtle rests "+J(c12));
  ok(c12.gems===45000,"...for 5,000 💎");
  ok((await swimmers()).length===12&&(await swimmers()).indexOf("megalodon")>=0,"Home shows 12, the Megalodon among them "+J(await swimmers()));
  ok(await E(()=>Ocean.owns("turtle")),"the turtle is still his");

  // ---- 7. the switches ----
  await E(()=>Ocean.open("mine"));await wait(300);
  const m1=await E(()=>({cards:[...document.querySelectorAll("#ovOcean .occard")].map(c=>c.dataset.id),count:document.getElementById("ocCount").textContent}));
  ok(m1.cards.length===13&&m1.cards.indexOf("turtle")>=0&&m1.cards.indexOf("whale")<0,"In my ocean lists what he has "+J(m1));
  ok(/12 of 12/.test(m1.count),"...and how many swim: "+m1.count);
  await E(()=>{window.__said=[];});
  await p.click('#ovOcean .occard[data-id="turtle"] [data-act]');await wait(300);
  const f1=await E(()=>({shown:Ocean.shown(),msg:document.getElementById("ocMsg").textContent,said:window.__said.slice()}));
  ok(f1.shown.indexOf("turtle")<0&&/Let one rest first/.test(f1.msg)&&f1.said.indexOf("Let one rest first.")>=0,"a 13th can't swim: it says to let one rest first "+J(f1));
  await wait(600);await p.click('#ovOcean .occard[data-id="shrimp"] [data-act="rest"]');await wait(600);
  await p.click('#ovOcean .occard[data-id="turtle"] [data-act="swim"]');await wait(300);
  const f2=await E(()=>({shown:Ocean.shown(),btn:document.querySelector('#ovOcean .occard[data-id="shrimp"] [data-act]').textContent}));
  ok(f2.shown.indexOf("shrimp")<0&&f2.shown.indexOf("turtle")>=0&&f2.shown.length===12,"the shrimp rests and the turtle swims again "+J(f2));
  ok(/Resting/.test(f2.btn),"...and the shrimp's switch says Resting");
  await E(()=>Ocean.close());await wait(300);
  ok((await swimmers()).indexOf("shrimp")<0&&(await swimmers()).indexOf("turtle")>=0,"Home follows the switches "+J(await swimmers()));
  // a broken list (not his, twice, too many) is read safely
  const safe=await E(()=>{const k=state.ocean.shown;state.ocean.shown=["whale","turtle","turtle","nope"].concat(Ocean.list().map(c=>c.id));const s=Ocean.shown();state.ocean.shown=k;return s;});
  ok(safe.indexOf("whale")<0&&safe.indexOf("nope")<0&&safe.filter(x=>x==="turtle").length===1&&safe.length<=12,"a shown list with things he doesn't have, or twice, is read safely "+J(safe));
  // all of them swimming off: an empty sea is fine
  const none=await E(()=>{const k=state.ocean.shown.slice();state.ocean.shown=[];Ocean.paint();const n=document.querySelectorAll("#ovHome .hfish").length;state.ocean.shown=k;Ocean.paint();return n;});
  ok(none===0,"all resting: an empty sea");

  // ---- 8. the voice list, and a reload ----
  const vl=await E(()=>Home.voiceLines());
  ok(["Megalodon","Golden shark","Blue whale","Welcome to your ocean!","Let one rest first."].every(x=>vl.indexOf(x)>=0),"Home's voice list has the names and the lines");
  await E(()=>saveNow());await wait(300);
  await p.reload();await waitFor(p,()=>typeof Home!=="undefined"&&Home.isOn&&Home.isOn(),{timeout:15000});await wait(600);
  const rl=await E(()=>({owned:Object.keys(state.ocean.owned).sort(),shown:Ocean.shown(),gems:state.gems,seen:state.ocean.seen}));
  ok(rl.owned.indexOf("megalodon")>=0&&rl.owned.indexOf("dolphin")>=0&&rl.shown.length===12&&rl.gems===45000&&rl.seen,"it all survives a reload "+J(rl));
  ok((await swimmers()).length===12,"...and the 12 swim on Home again");
  // a save with ocean:null loads with the defaults
  await seed(p,{ocean:null,gems:5},{home:true,settle:800});
  ok(J(await E(()=>state.ocean))===J({owned:{},shown:null,seen:false})&&(await swimmers()).length===4,"a save with ocean:null gets the defaults and Home's four");

  const dup=await E(()=>{const n={};document.querySelectorAll("[id]").forEach(e=>{n[e.id]=(n[e.id]||0)+1;});return Object.keys(n).filter(k=>n[k]>1);});
  ok(!dup.length,"no two elements share an id "+J(dup));
  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  t.done();await close();process.stdout.write("",()=>process.exit(process.exitCode||0));
})().catch(e=>{console.log("FAIL ocean crashed: "+(e&&e.stack||e));process.exit(1);});
