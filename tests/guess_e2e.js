// Sound it out, don't guess (docs/superpowers/specs/2026-10-19-guessing-design.md). Each section pins one part:
// 1 the guess check and guess mode, 2 Build it left to right, 3 the word is not given away, 4 heart words,
// 5 the prize waits for a clean read, 6 sound it out first while he is guessing.
"use strict";
const {launch,check,seed,reload}=require("./lib");
(async()=>{
  const t=check("guess"),ok=t.ok,J=x=>JSON.stringify(x);
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768}});
  const wait=ms=>p.waitForTimeout(ms);

  // ---- 1. the guess check and guess mode ----
  ok(J(await E(()=>state.guess))===J({on:false,last:[],clean:0,days:{}}),"a new save has guess mode off "+J(await E(()=>state.guess)));
  const g1=await E(()=>{const r={};
    let T=Guess.track();T.wrongPick();r.noSound=T.finish(false);
    T=Guess.track();T.heard();T.wrongPick();r.quick=T.finish(false);
    T=Guess.track();T.wrongTile();T.wrongTile();r.twoTiles=T.finish(false);
    T=Guess.track();T.wrongTile();r.oneTile=T.finish(false);
    T=Guess.track();T.heard();r.clean=T.finish(true);r.again=T.finish(false);
    return r;});
  ok(g1.noSound&&g1.quick&&g1.twoTiles,"a wrong pick with nothing heard, a quick wrong pick, and two wrong tiles are guesses "+J(g1));
  ok(!g1.oneTile&&!g1.clean&&!g1.again,"one wrong tile and a clean read are not; finishing twice counts once "+J(g1));
  const slow=await E(async()=>{const T=Guess.track();T.heard();await new Promise(r=>setTimeout(r,2100));T.wrongPick();return T.finish(false);});
  ok(!slow,"a wrong pick after sounding out, more than 2 s in, is not a guess");
  const mode=await E(()=>{state.guess={on:false,last:[],clean:0,days:{}};
    const g=()=>{const T=Guess.track();T.wrongPick();T.finish(false);},c=()=>{const T=Guess.track();T.heard();T.finish(true);};
    const r={};c();g();r.one=Guess.on();g();r.two=Guess.on();r.slow=Skills.slow;r.day=state.guess.days[today()];
    c();c();c();c();r.four=Guess.on();c();r.five=Guess.on();r.last=state.guess.last.length;r.slowOff=Skills.slow;
    Skills.slow=true;r.set=Guess.on();Skills.slow=false;return r;});
  ok(!mode.one&&mode.two&&mode.slow,"two guesses in the last five turn guess mode on, and Skills.slow follows it "+J(mode));
  ok(mode.day===2,"the guessed words are counted for today "+J(mode));
  ok(mode.four&&!mode.five&&mode.last===0&&!mode.slowOff,"five clean reads in a row turn it off "+J(mode));
  ok(mode.set,"setting Skills.slow sets guess mode");
  await E(()=>{Guess.set(true);saveNow&&saveNow();});await wait(400);
  await reload(p);
  ok(await E(()=>Guess.on()),"guess mode survives a reload");
  await seed(p,{},{});
  ok(J(await E(()=>state.guess))===J({on:false,last:[],clean:0,days:{}}),"an older save without it loads with guess mode off");
  const rep=await E(()=>{state.guess.days[today()]=3;openReport();const t=document.getElementById("ovReport").innerText;Modes.shut(document.getElementById("ovReport"));return t;});
  ok(/Guessing/.test(rep)&&!/Quick guesses/.test(rep),"the grown-up report shows Guessing");
  ok(/Sound it out first/.test(rep),"...and whether sound it out first is on");
  await E(()=>{Guess.set(false);state.guess.days={};state.tour=99;state.settings.goal=0;});
  const ix=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}));

  // ---- 2. Build it, left to right ----
  const three=await E(()=>allWords().filter(x=>!x.tricky&&x.p.length===3&&x.p.every((ph,i)=>x.p.indexOf(ph)===i)).slice(0,2).map(x=>x.w));
  const b1=await E(async w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:1});await new Promise(r=>setTimeout(r,300));
    const slots=()=>[...document.querySelectorAll("#slotsRow .wslot")],bank=()=>[...document.querySelectorAll("#letterBank .lt")];
    const r={next0:slots()[0].classList.contains("next"),read:state.wordsRead,miss:(state.stats[w]||{}).miss||0};
    const wrong=bank().find(b=>b.dataset.ph!==W.p[0]);wrong.click();await new Promise(r=>setTimeout(r,200));
    r.emptyAfterWrong=!slots()[0].dataset.ph&&slots()[0].classList.contains("next");r.misses=misses;
    await new Promise(r=>setTimeout(r,450));      // (a tile still bouncing ignores a tap)
    bank().find(b=>b.dataset.ph!==W.p[0]&&!b.classList.contains("used")).click();await new Promise(r=>setTimeout(r,200));
    const right=bank().find(b=>b.dataset.ph===W.p[0]);r.hint=right.classList.contains("glow");r.stillEmpty=!slots()[0].dataset.ph;
    await new Promise(r=>setTimeout(r,450));right.click();await new Promise(r=>setTimeout(r,200));
    r.filled=slots()[0].dataset.ph===W.p[0];r.next1=slots()[1].classList.contains("next");
    for(let i=1;i<W.p.length;i++){bank().find(b=>b.dataset.ph===W.p[i]&&!b.classList.contains("used")).click();await new Promise(r=>setTimeout(r,150));}
    await new Promise(r=>setTimeout(r,1200));
    r.readAfter=state.wordsRead;r.missAfter=(state.stats[w]||{}).miss||0;return r;},three[0]);
  ok(b1.next0,"Build it: the first box glows "+J(b1));
  ok(b1.emptyAfterWrong&&b1.misses===1,"a wrong tile does not go in; the first box still glows "+J(b1));
  ok(b1.hint&&b1.stillEmpty,"after two misses the right tile glows, and nothing is placed for him "+J(b1));
  ok(b1.filled&&b1.next1,"the right tile goes in and the next box glows "+J(b1));
  ok(b1.readAfter===b1.read+1&&b1.missAfter===b1.miss+1,"the finished word is read, not clean "+J(b1));
  await ix();await p.waitForTimeout(400);
  const b2=await E(async w=>{const W=allWords().find(x=>x.w===w);const f=(state.stats[w]||{}).first||0;openWord(W,{rung:1});await new Promise(r=>setTimeout(r,300));
    for(let i=0;i<W.p.length;i++){[...document.querySelectorAll("#letterBank .lt")].find(b=>b.dataset.ph===W.p[i]&&!b.classList.contains("used")).click();await new Promise(r=>setTimeout(r,150));}
    await new Promise(r=>setTimeout(r,1200));return{before:f,after:(state.stats[w]||{}).first||0};},three[1]);
  ok(b2.after===b2.before+1,"a build with no wrong tile is clean "+J(b2));
  await ix();await p.waitForTimeout(400);
  const rb=await E(async w=>{const W=allWords().find(x=>x.w===w);const host=document.createElement("div");host.id="rbHost";document.body.appendChild(host);
    Read.build(host,ok=>{window.__rb=ok;},W);await new Promise(r=>setTimeout(r,300));
    const sl=()=>[...host.querySelectorAll(".wslot")],tiles=()=>[...host.querySelectorAll(".wbank .lt")];
    tiles().find(b=>b.textContent!==tileText(W.p[0])).click();await new Promise(r=>setTimeout(r,200));
    const r={empty:!sl()[0].classList.contains("filled")};
    tiles().find(b=>b.textContent===tileText(W.p[0])&&!b.classList.contains("used")).click();await new Promise(r=>setTimeout(r,200));
    r.filled=sl()[0].classList.contains("filled");host.remove();return r;},three[0]);
  ok(rb.empty&&rb.filled,"Read.build goes left to right too "+J(rb));
  await ix();await p.waitForTimeout(400);

  // ---- 3. the word is not given away ----
  await E(()=>{window.__said=[];const o=Sound.say;Sound.say=function(k){window.__said.push(String(k));return o.apply(this,arguments);};});
  const blendDone=()=>p.waitForFunction(()=>window._lastBlend&&window._lastBlend.done,null,{timeout:8000}).catch(()=>null);
  const picW=await E(()=>allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&!state.stats[x.w]&&x.p.length>=3).slice(0,3).map(x=>x.w));
  await E(w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:0});if(document.querySelector("#picks .pick.text"))renderPicks(W,0);window._lastBlend=null;window.__said=[];
    document.getElementById("blendBtn").click();},picW[0]);
  await blendDone();
  const n3a=await E(w=>({word:window._lastBlend&&window._lastBlend.word,said:window.__said.filter(k=>k==="word:"+w).length,sounds:window.__said.filter(k=>k.indexOf("sound:")===0).length}),picW[0]);
  ok(n3a.word===null&&n3a.said===0&&n3a.sounds>0,"Blend it sounds the word out but does not say it "+J(n3a));
  await E(w=>{window.__said=[];[...document.querySelectorAll("#picks .pick")].find(b=>b.dataset.w!==w).click();},picW[0]);await wait(3500);
  const n3b=await E(w=>({said:window.__said.filter(k=>k==="word:"+w).length,sounds:window.__said.filter(k=>k.indexOf("sound:")===0).length}),picW[0]);
  ok(n3b.said===0&&n3b.sounds>0,"after a wrong pick the help plays the sounds, not the word "+J(n3b));
  await E(w=>{window.__said=[];document.querySelector(`#picks .pick[data-w="${w}"]`).click();},picW[0]);await wait(300);
  ok(await E(w=>window.__said.indexOf("word:"+w)>=0,picW[0]),"the right pick says the word");
  await ix();await wait(400);
  const n3c=await E(async w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:0});renderListen(W);await new Promise(r=>setTimeout(r,500));
    const L=document.getElementById("letters"),cs=getComputedStyle(L);window._lastBlend=null;window.__said=[];
    document.getElementById("blendBtn").click();return{cls:L.classList.contains("nospell"),vis:cs.visibility,disp:cs.display};},picW[1]);
  await blendDone();
  const n3d=await E(w=>{const W=allWords().find(x=>x.w===w);return{first:window.__said.indexOf("sound:"+W.p[0])>=0};},picW[1]);
  ok(n3c.cls&&n3c.vis==="hidden"&&n3c.disp!=="none","Hear it hides the spelling (hidden, still laid out) "+J(n3c));
  ok(n3d.first,"...and Blend it still sounds out the word's own tiles "+J(n3d));
  await E(w=>{document.querySelector(`#picks .pick[data-w="${w}"]`).click();},picW[1]);await wait(300);
  ok(await E(()=>!document.getElementById("letters").classList.contains("nospell")),"the spelling shows again once he picks it");
  await ix();await wait(400);
  const sw=await E(async()=>{const pr=swapPairs()[0];openSwap(pr);show("ovRead");window._lastBlend=null;document.getElementById("blendBtn").click();
    return pr.from.w;});
  await blendDone();
  ok(await E(()=>window._lastBlend&&window._lastBlend.word)===sw,"a sound swap's Blend it still says the starting word "+J(sw));
  await ix();await wait(400);

  // ---- 4. heart words: no honor tap ----
  const hw=await E(()=>allWords().filter(x=>x.tricky).slice(0,2).map(x=>x.w));
  const h4=await E(async w=>{const W=allWords().find(x=>x.w===w);const r={read:state.wordsRead};openWord(W,{rung:2});await new Promise(r=>setTimeout(r,1000));
    const b=document.querySelector("#picks .btn");b.click();await new Promise(r=>setTimeout(r,200));
    r.after=state.wordsRead;r.opts=[...document.querySelectorAll("#picks .pick.text")].map(x=>x.dataset.w);r.prove=!!document.querySelector("#picks .prove");
    const right=document.querySelector(`#picks .pick.text[data-w="${w}"]`);if(right)right.click();await new Promise(r=>setTimeout(r,300));r.done=state.wordsRead;return r;},hw[0]);
  ok(h4.after===h4.read&&h4.prove&&h4.opts.length===3&&h4.opts.indexOf(hw[0])>=0,"a heart word's 'I read it!' asks which one he read "+J(h4));
  ok(h4.done===h4.read+1,"...and picking it counts the word "+J(h4));
  await ix();await wait(400);
  const h5=await E(async w=>{const W=allWords().find(x=>x.w===w);const m=(state.stats[w]||{}).miss||0;openWord(W,{rung:2});await new Promise(r=>setTimeout(r,1000));
    document.querySelector("#picks .btn").click();await new Promise(r=>setTimeout(r,200));
    [...document.querySelectorAll("#picks .pick.text")].find(x=>x.dataset.w!==w).click();await new Promise(r=>setTimeout(r,200));
    document.querySelector(`#picks .pick.text[data-w="${w}"]`).click();await new Promise(r=>setTimeout(r,300));
    return{before:m,after:(state.stats[w]||{}).miss||0};},hw[1]);
  ok(h5.after===h5.before+1,"a wrong pick first is a miss, not a clean read "+J(h5));
  await ix();await wait(400);

  // ---- 5. the prize waits for a clean read ----
  const prizes=()=>E(()=>state.critters.length+state.vehicles.length+state.creatures.length+state.blueprints.length);
  const pw=await E(()=>allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&!state.stats[x.w]&&x.p.length>=3&&seasonWords().indexOf(x.w)<0).slice(0,4).map(x=>x.w));
  const openPic=w=>E(w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:0});if(document.querySelector("#picks .pick.text"))renderPicks(W,0);},w);
  const pickRight=w=>E(w=>document.querySelector(`#picks .pick[data-w="${w}"]`).click(),w);
  const pickWrong=w=>E(w=>[...document.querySelectorAll("#picks .pick")].find(b=>b.dataset.w!==w).click(),w);
  const closeCard=async()=>{await E(()=>{const b=document.querySelector("#ovReward.on [data-close]");if(b)b.click();});await wait(800);};
  let pz=await prizes();await openPic(pw[0]);await pickRight(pw[0]);await wait(1000);
  const c5={name:await E(()=>document.getElementById("rewardName").textContent),gain:(await prizes())-pz};
  // (a prize can be a star for an animal he has, so the card's name is the check, not a count)
  ok(c5.name&&c5.name!=="..."&&c5.name!=="Good reading!","a clean first try opens the prize "+J(c5));
  await closeCard();
  const topClean=await E(()=>({top:Modes.top(),home:Home.isOn()}));
  pz=await prizes();const g0=await E(()=>state.gems),r0=await E(()=>state.wordsRead);
  await openPic(pw[1]);await pickWrong(pw[1]);await wait(300);await pickRight(pw[1]);await wait(1000);
  const m5=await E(()=>({name:document.getElementById("rewardName").textContent,sub:document.getElementById("rewardWord").textContent,
    btn:document.querySelector("#ovReward [data-close]").textContent,on:document.getElementById("ovReward").classList.contains("on"),gems:state.gems,read:state.wordsRead}));
  ok(m5.on&&m5.name==="Good reading!"&&/first try/.test(m5.sub)&&m5.btn==="👍 OK","after a miss: Good reading!, and the prize waits "+J(m5));
  ok(m5.gems===g0+1&&(await prizes())===pz&&m5.read===r0+1,"...1 gem, no prize, and the word still counts "+J({g0,m5}));
  await closeCard();
  const topMiss=await E(()=>({top:Modes.top(),home:Home.isOn()}));
  // (the reading sign that comes every 7th crate may be on top; what matters is that Home did not come back)
  ok(!topMiss.home&&topMiss.home===topClean.home,"closing it leaves him where a prize card would, not on Home "+J({topClean,topMiss}));
  // the first-run tour: a miss still gets the prize, and the tour moves on
  pz=await prizes();const t5=await E(()=>{state.tour=TOUR.findIndex(s=>s.until==="read");return state.tour;});
  await openPic(pw[2]);await pickWrong(pw[2]);await wait(300);await pickRight(pw[2]);await wait(1000);
  const tr5={name:await E(()=>document.getElementById("rewardName").textContent),tour:await E(()=>state.tour)};
  ok(t5>=0&&tr5.name&&tr5.name!=="Good reading!"&&tr5.tour>t5,"during the tour a word with a miss still gets the prize and the tour moves on "+J({t5,tr5}));
  await E(()=>{Coach.skip();});await closeCard();
  // an upgrade (gems already paid for it) still finishes after a miss
  const up5=await E(async()=>{state.gems=500;const veh=!state.critters.length,c=veh?state.vehicles[0]:state.critters[0];c.lv=1;startUpgrade({kind:veh?"vehicle":"critter",id:c.id});await new Promise(r=>setTimeout(r,500));
    const W=cur,bank=()=>[...document.querySelectorAll("#letterBank .lt")];
    bank().find(b=>b.dataset.ph!==W.p[0]).click();await new Promise(r=>setTimeout(r,650));      // (a tile still bouncing ignores a tap)
    for(let i=0;i<W.p.length;i++){bank().find(b=>b.dataset.ph===W.p[i]&&!b.classList.contains("used")).click();await new Promise(r=>setTimeout(r,150));}
    await new Promise(r=>setTimeout(r,1500));return{lv:c.lv,misses};});
  ok(up5.lv===2,"an upgrade word with a miss still finishes the upgrade "+J(up5));
  await ix();await wait(400);

  // ---- 6. sound it out first while he is guessing ----
  const fresh6=()=>E(()=>allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&!state.stats[x.w]&&x.p.length>=3)[0].w);
  const w6=await fresh6();
  const s6=await E(async w=>{window.__said=[];Guess.set(true);const W=allWords().find(x=>x.w===w);openWord(W,{rung:0});await new Promise(r=>setTimeout(r,300));
    const box=document.querySelector("#shieldHost .shield"),P=document.getElementById("picks"),r={shield:!!box,locked:P.classList.contains("locked-by-shield")};
    if(!box)return r;const t=[...box.querySelectorAll(".shieldtiles .lt")];
    t[1].click();await new Promise(r=>setTimeout(r,150));r.outOfOrder=t[1].classList.contains("done");
    for(const b of t){b.click();await new Promise(r=>setTimeout(r,700));}
    await new Promise(r=>setTimeout(r,700));
    r.gone=!document.querySelector("#shieldHost .shield");r.unlocked=!P.classList.contains("locked-by-shield");
    r.word=window.__said.indexOf("word:"+w)>=0;r.on=Guess.on();return r;},w6);
  ok(s6.shield&&s6.locked,"while he is guessing, a word starts with the Sound Shield "+J(s6));
  ok(!s6.outOfOrder,"its sounds go in order: the second one first does nothing "+J(s6));
  ok(s6.gone&&s6.unlocked&&!s6.word,"tapped in order it opens the choices, without saying the word "+J(s6));
  ok(s6.on,"...and guess mode stays on "+J(s6));
  await ix();await wait(400);
  await E(()=>{for(let i=0;i<5;i++){const T=Guess.track();T.heard();T.finish(true);}});
  const w6b=await fresh6();
  ok(await E(async w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:0});await new Promise(r=>setTimeout(r,300));return !Guess.on()&&!document.querySelector("#shieldHost .shield");},w6b),
    "five clean reads later it is off, and the next word has no Shield");
  await ix();await wait(400);
  const rp=await E(async()=>{Guess.set(true);const host=document.createElement("div");document.body.appendChild(host);const w=Read.pic(host,()=>{});
    const r={shield:!!host.querySelector(".shield"),locked:!!host.querySelector(".wopts.locked-by-shield")};host.remove();Guess.set(false);return r;});
  ok(rp.shield&&rp.locked,"Read.pic starts with the Shield too "+J(rp));
  const rs=await E(async()=>{Guess.set(true);const host=document.createElement("div");document.body.appendChild(host);Read.sentence(host,()=>{});
    const r={shield:!!host.querySelector(".shield"),locked:!!host.querySelector(".psopts.locked-by-shield")||!!host.querySelector(".wopts.locked-by-shield")};host.remove();Guess.set(false);return r;});
  ok(rs.shield&&rs.locked,"...and Read.sentence "+J(rs));
  const rg=await E(async()=>{const d0=state.guess.days[today()]||0;const host=document.createElement("div");document.body.appendChild(host);const w=Read.pic(host,()=>{});
    [...host.querySelectorAll("[data-w]")].find(b=>b.dataset.w!==w.w).click();host.querySelector(`[data-w="${w.w}"]`).click();
    await new Promise(r=>setTimeout(r,200));host.remove();return{d0,d1:state.guess.days[today()]||0};});
  ok(rg.d1===rg.d0+1,"a quick wrong pick in Read.pic counts as a guess "+J(rg));

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
