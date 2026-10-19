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

  ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();t.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
