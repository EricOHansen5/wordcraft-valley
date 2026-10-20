// Sound it out, don't guess: the final review's fixes. Each check failed before its fix.
"use strict";
const {launch,check}=require("./lib");
(async()=>{
  const t=check("guess fixes"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},seed:{tour:99,settings:{goal:0}}});
  const wait=ms=>p.waitForTimeout(ms);
  const ix=async()=>{await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}));await wait(400);};
  await E(()=>{window.__said=[];const o=Sound.say;Sound.say=function(k){window.__said.push(String(k));return o.apply(this,arguments);};Guess.set(false);});
  const fresh=n=>E(n=>allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&!state.stats[x.w]&&x.p.length>=3&&x.p.every((ph,i)=>x.p.indexOf(ph)===i)).slice(0,n).map(x=>x.w),n);
  const ws=await fresh(8);

  // 1. a sound swap after a Hear it word that was closed unanswered: its tiles show
  const f1=await E(async w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:0});renderListen(W);await new Promise(r=>setTimeout(r,300));
    document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);});await new Promise(r=>setTimeout(r,300));
    openSwap(swapPairs()[0]);show("ovRead");return getComputedStyle(document.getElementById("letters")).visibility;},ws[0]);
  ok(f1==="visible","a sound swap after an unanswered Hear it shows its tiles "+J(f1));
  await ix();

  // 3. in Hear it the word is the prompt (heard), so a wrong pick after 2 s is not a guess
  const f3=await E(async w=>{const W=allWords().find(x=>x.w===w);const d0=state.guess.days[today()]||0;openWord(W,{rung:0});renderListen(W);
    await new Promise(r=>setTimeout(r,2200));[...document.querySelectorAll("#picks .pick")].find(b=>b.dataset.w!==w).click();await new Promise(r=>setTimeout(r,200));
    document.querySelector(`#picks .pick[data-w="${w}"]`).click();await new Promise(r=>setTimeout(r,300));return{d0,d1:state.guess.days[today()]||0};},ws[1]);
  ok(f3.d1===f3.d0,"an honest wrong pick in Hear it is not a guess "+J(f3));
  await ix();

  // 4. the heart-word proof hides the spelling above it
  const f4=await E(async()=>{const W=allWords().find(x=>x.tricky);openWord(W,{rung:2});await new Promise(r=>setTimeout(r,1000));
    document.querySelector("#picks .btn").click();await new Promise(r=>setTimeout(r,200));return getComputedStyle(document.getElementById("letters")).visibility;});
  ok(f4==="hidden","'Which one did you read?' hides the word's tiles "+J(f4));
  await ix();

  // 5. a double tap on a wrong tile is one miss
  const f5=await E(async w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:1});await new Promise(r=>setTimeout(r,300));
    const b=[...document.querySelectorAll("#letterBank .lt")].find(x=>x.dataset.ph!==W.p[0]);b.click();b.click();await new Promise(r=>setTimeout(r,100));
    const r={misses};const host=document.createElement("div");document.body.appendChild(host);Read.build(host,()=>{},W);await new Promise(r=>setTimeout(r,300));
    const tb=[...host.querySelectorAll(".wbank .lt")].find(x=>x.textContent!==tileText(W.p[0]));tb.click();tb.click();
    r.kitGlow=!!host.querySelector(".wbank .lt.glow");host.remove();return r;},ws[2]);
  ok(f5.misses===1&&!f5.kitGlow,"a double tap on a wrong tile counts once (crates and Read.build) "+J(f5));
  await ix();

  // 6. the waiting card's button goes back to its usual words once it is closed
  const f6=await E(async w=>{const W=allWords().find(x=>x.w===w);cur=W;waitPrize();const b=document.querySelector("#ovReward [data-close]");const shown=b.textContent;b.click();
    await new Promise(r=>setTimeout(r,200));return{shown,after:b.textContent};},ws[3]);
  ok(f6.shown!=="Next word"&&f6.after==="Put it in my valley","the waiting card's button is not 'Next word' and resets when closed "+J(f6));
  await ix();

  // 7. a double tap on a wrong picture: the newer help cuts off the older one (each sound once)
  const f7=await E(async w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:0});if(document.querySelector("#picks .pick.text"))renderPicks(W,0);
    await new Promise(r=>setTimeout(r,300));window.__said=[];
    const bad=[...document.querySelectorAll("#picks .pick")].filter(b=>b.dataset.w!==w);bad[0].click();bad[1].click();
    await new Promise(r=>setTimeout(r,4000));return window.__said.filter(k=>k==="sound:"+W.p[W.p.length-1]).length;},ws[4]);
  ok(f7<=1,"two quick wrong picks play the sounds once, not on top of each other ("+f7+")");
  await ix();

  // 8. the stretch after a wrong tile stops once the word is built
  const f8=await E(async w=>{const W=allWords().find(x=>x.w===w);const o=Sound.say;
    Sound.say=function(k){window.__said.push(String(k));return new Promise(r=>setTimeout(r,400));};
    openWord(W,{rung:1});await new Promise(r=>setTimeout(r,300));window.__said=[];
    const bank=()=>[...document.querySelectorAll("#letterBank .lt")];
    bank().find(x=>x.dataset.ph!==W.p[0]&&W.p.indexOf(x.dataset.ph)<0||x.dataset.ph!==W.p[0]&&x.dataset.ph!==W.p[1]).click();
    await new Promise(r=>setTimeout(r,800));
    for(let i=0;i<W.p.length;i++)bank().find(b=>b.dataset.ph===W.p[i]&&!b.classList.contains("used")).click();
    await new Promise(r=>setTimeout(r,2500));Sound.say=o;
    const at=window.__said.lastIndexOf("word:"+w);return{at,after:at<0?[]:window.__said.slice(at+1).filter(k=>k.indexOf("sound:")===0)};},ws[5]);
  ok(f8.at>=0&&!f8.after.length,"no stretched sounds after the built word is said "+J(f8));
  await ix();

  // 9. the Shield appears without the "wrong" buzz
  const f9=await E(async w=>{const W=allWords().find(x=>x.w===w);let n=0;const o=Sound.sfx.nope;Sound.sfx.nope=function(){n++;return o.apply(this,arguments);};
    Guess.set(true);openWord(W,{rung:0});await new Promise(r=>setTimeout(r,300));const shield=!!document.querySelector("#shieldHost .shield");Sound.sfx.nope=o;Guess.set(false);return{shield,n};},ws[6]);
  ok(f9.shield&&f9.n===0,"the Shield appears without a wrong-answer sound "+J(f9));
  await ix();

  // the season's doubling is for a clean read only: after a miss it is 1 gem
  const f10=await E(async()=>{const W=seasonWords().map(w=>allWords().find(x=>x.w===w&&!x.tricky)).filter(Boolean)[0];if(!W)return{none:true};
    openWord(W,{rung:1});await new Promise(r=>setTimeout(r,300));const g0=state.gems,bank=()=>[...document.querySelectorAll("#letterBank .lt")];
    bank().find(x=>!sameTile(x.dataset.ph,W.p[0])).click();await new Promise(r=>setTimeout(r,650));
    for(let i=0;i<W.p.length;i++){bank().find(b=>sameTile(b.dataset.ph,W.p[i])&&!b.classList.contains("used")).click();await new Promise(r=>setTimeout(r,120));}
    await new Promise(r=>setTimeout(r,1300));return{w:W.w,gain:state.gems-g0};});
  ok(f10.none||f10.gain===1,"a season word after a miss earns 1 gem "+J(f10));
  await ix();
  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();

  // 2. with the real voice: after a miss, the right pick's word and then the kind waiting line are both played
  {const {page:q,close:c2}=await launch({static:true,seed:{tour:99,settings:{goal:0}},viewport:{width:1024,height:768}});
    await q.waitForTimeout(1500);
    const r=await q.evaluate(async()=>{await VoicePack.load();Guess.set(false);const log=[];const ctx=Sound.ctx(),o=ctx.createBufferSource.bind(ctx);let curT=null;
      ctx.createBufferSource=function(){log.push(curT);return o();};
      const op=VoicePack.play;VoicePack.play=async function(x){curT=x;return op.apply(this,arguments);};
      const W=allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&!state.stats[x.w]&&x.p.length>=3)[0];
      openWord(W,{rung:0});if(document.querySelector("#picks .pick.text"))renderPicks(W,0);
      [...document.querySelectorAll("#picks .pick")].find(b=>b.dataset.w!==W.w).click();await new Promise(r=>setTimeout(r,4000));
      log.length=0;document.querySelector(`#picks .pick[data-w="${W.w}"]`).click();await new Promise(r=>setTimeout(r,6000));
      return{w:W.w,log};});
    ok(r.log.some(x=>/^Good reading/.test(String(x))),"after a miss, the waiting line is heard, not cut off by the word "+J(r));
    await c2();}
  t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
