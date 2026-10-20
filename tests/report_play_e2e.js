// How he plays (the Grown-up report): sessions (state.sessions), help he leaned on (state.helps), prizes opened and
// waiting (state.prizes) and the recent activity (state.events), from real taps, and the report's "How he plays" block.
// Sections: 1 an old save, 2 a word with help and a clean word, 3 a game opened, a book finished, guess mode,
// 4 rest and wake, hidden and back, closed, 5 the trims, 6 the report.
"use strict";
const {launch,check,waitFor}=require("./lib");
(async()=>{
  const t=check("report_play"),ok=t.ok,J=x=>JSON.stringify(x);
  // an old save: none of the new fields
  const {page:p,errs,close,E}=await launch({viewport:{width:1024,height:768},seed:{settings:{goal:0}}});
  const wait=ms=>p.waitForTimeout(ms);
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>{if(o.id!=="ovHome")Modes.shut(o);}));
  const evs=()=>E(()=>(state.events||[]).map(e=>e.k+(e.x!=null?":"+e.x:"")));
  // no rest on its own while the suite runs; rest() is one now (the clock jumped ahead), as if nobody touched it for hours
  await E(()=>{Rest._idleMs=1e9;});
  const rest=()=>E(()=>{Rest._idleMs=45000;Rest.now=()=>Date.now()+1e7;Rest.check();Rest.now=()=>Date.now();Rest._idleMs=1e9;});

  // ---- 1. an old save loads with the new fields, and the launch starts a session ----
  const s0=await E(()=>({sessions:state.sessions,events:state.events,helps:state.helps,prizes:state.prizes,d:def()}));
  ok(Array.isArray(s0.sessions)&&Array.isArray(s0.events)&&s0.helps&&typeof s0.helps==="object"&&s0.prizes&&typeof s0.prizes==="object",
    "an old save gets sessions, events, helps and prizes "+J([s0.sessions,s0.helps,s0.prizes]));
  ok(J(s0.d.sessions)==="[]"&&J(s0.d.events)==="[]"&&J(s0.d.helps)==="{}"&&J(s0.d.prizes)==="{}","def() has them, empty");
  ok(s0.sessions.length===1&&s0.sessions[0].m===0&&s0.sessions[0].s>Date.now()-60000&&s0.sessions[0].e>=s0.sessions[0].s,"the launch starts a session "+J(s0.sessions));
  ok((await evs()).indexOf("start:launch")>=0,"...and the activity says so "+J(await evs()));
  const nul=await E(()=>{const s=withDefaults({sessions:null,events:null,helps:null,prizes:null});return[Array.isArray(s.sessions),Array.isArray(s.events),!!s.helps,!!s.prizes];});
  ok(J(nul)==="[true,true,true,true]","a save with them null gets them made "+J(nul));

  // ---- 2. a word with help (Blend it, a sound tile, two wrong picks), then a clean word ----
  await tidy();
  const words=await E(()=>{state.settings.tierOverride=1;state.guess.on=false;
    return allWords().filter(w=>w.t===1&&!w.tricky&&WORD_ART[w.w]&&!(state.stats[w.w]||{}).seen).slice(0,3).map(w=>w.w);});
  ok(words.length===3,"three level-1 picture words "+J(words));
  const openW=w=>E(w=>{openWord(allWords().find(x=>x.w===w),{rung:0});},w);
  // the picks show at once unless the word plays as "Hear it"; this opens it again until there are picks
  const picks=async w=>{for(let i=0;i<6;i++){await openW(w);if(await E(()=>!!document.querySelector("#picks .pick")&&!cur._listen))return true;}return false;};
  ok(await picks(words[0]),"the first word is open with picture picks");
  const day=await E(()=>today());
  await p.click("#blendBtn");
  await p.click("#letters .lt");
  let h=await E(d=>(state.helps||{})[d],day);
  ok(h&&h.blend===1&&h.tiles===1&&!h.ear,"🔊 Blend it and a sound tile are counted for today "+J(h));
  const wrongs=await E(w=>[...document.querySelectorAll("#picks .pick")].filter(b=>b.dataset.w!==w).map(b=>b.dataset.w),words[0]);
  await p.click(`#picks .pick[data-w="${wrongs[0]}"]`);await wait(150);
  h=await E(d=>state.helps[d],day);
  ok(!h.hint,"one miss: the answer is not shown yet "+J(h));
  await p.click(`#picks .pick[data-w="${wrongs[1]}"]`);await wait(150);
  h=await E(d=>state.helps[d],day);
  ok(h.hint===1&&await E(()=>!!document.querySelector("#picks .pick.hint")),"two misses: the answer glows, counted once "+J(h));
  await p.click(`#picks .pick[data-w="${wrongs[0]}"]`);await wait(150);
  ok((await E(d=>state.helps[d],day)).hint===1,"a third miss on the same word is not counted again");
  await p.click(`#picks .pick[data-w="${words[0]}"]`);
  ok(await waitFor(p,()=>document.querySelector("#ovReward.on")),"the right pick finishes the word");
  let pz=await E(d=>(state.prizes||{})[d],day);
  ok(pz&&pz.wait===1&&!pz.open,"read with help: its prize waits "+J(pz));
  let ev=await evs();
  ok(ev.indexOf("wait:"+words[0])>=0,"the activity has the word, read with help, its prize waiting "+J(ev.slice(-4)));
  await tidy();
  ok(await picks(words[1]),"the second word is open");
  await p.click(`#picks .pick[data-w="${words[1]}"]`);
  await waitFor(p,()=>document.querySelector("#ovReward.on"));
  pz=await E(d=>state.prizes[d],day);
  ok(pz.open===1&&pz.wait===1,"read first try: its prize opens "+J(pz));
  ok((await evs()).indexOf("read:"+words[1])>=0,"the activity has the word read first try");
  await tidy();
  // 👂 Say the word: asking for the word; in "Hear it" (the word is the question) it is not
  ok(await picks(words[2]),"the third word is open");
  await p.click("#earBtn");
  h=await E(d=>state.helps[d],day);
  ok(h.ear===1,"👂 Say the word is counted "+J(h));
  await E(()=>{cur._listen=true;});await p.click("#earBtn");await E(()=>{cur._listen=false;});
  ok((await E(d=>state.helps[d],day)).ear===1,"...but not when the word is the question (Hear it)");
  await p.click(`#picks .pick[data-w="${words[2]}"]`);
  await waitFor(p,()=>document.querySelector("#ovReward.on"));
  ok((await E(d=>state.prizes[d],day)).wait===2,"after 👂 the prize waits too");
  await tidy();
  // Build it: two wrong tiles in one box light the right one, counted as the answer shown
  const bw=await E(()=>allWords().find(x=>x.t===1&&!x.tricky&&x.p.length===3&&x.p.every((ph,i)=>x.p.indexOf(ph)===i)).w);
  const glow=await E(async w=>{const W=allWords().find(x=>x.w===w);openWord(W,{rung:1});await new Promise(r=>setTimeout(r,300));
    const bank=()=>[...document.querySelectorAll("#letterBank .lt")];
    bank().find(b=>b.dataset.ph!==W.p[0]).click();await new Promise(r=>setTimeout(r,650));
    bank().find(b=>b.dataset.ph!==W.p[0]&&!b.classList.contains("bad")).click();await new Promise(r=>setTimeout(r,200));
    return{glow:!!document.querySelector("#letterBank .lt.glow"),h:state.helps[today()]};},bw);
  ok(glow.glow&&glow.h.hint===2,"Build it: two wrong tiles light the right one, counted as the answer shown "+J(glow));
  await tidy();

  // ---- 3. a game opened, a book finished, guess mode on and off ----
  await E(()=>Games.open("books"));
  ok(await waitFor(p,()=>Modes.top()==="book"),"the bookshelf is open");
  ev=await evs();
  ok(ev[ev.length-1]==="open:book","opening a game is in the activity "+J(ev.slice(-3)));
  const bk=await E(()=>{const b=BOOKS.find(x=>x.t===1&&!x.mine);return{id:b.id,n:b.pages.length};});
  await E(id=>Books.openBook(id),bk.id);await E(()=>document.getElementById("bStart").click());
  for(let i=0;i<bk.n;i++)await E(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();});
  for(let k=0;k<6;k++){
    const has=await waitFor(p,()=>!!document.querySelector("#ovStory .bopts")||!!document.querySelector("#ovStory .bpage.end"),{timeout:4000});
    if(!has||await E(()=>!!document.querySelector("#ovStory .bpage.end")))break;
    await E(()=>{const h=document.querySelector("#ovStory .bopts"),b=h.querySelector('.bopt[data-v="'+h.dataset.ans+'"]');b.click();});
    await waitFor(p,i=>Books._state().quizIdx>i||!!document.querySelector("#ovStory .bpage.end"),{arg:k,timeout:3000});}
  ok(await waitFor(p,"#ovStory .bpage.end",{timeout:4000}),"a book read to the end");
  ok((await evs()).indexOf("book:"+bk.id)>=0,"a finished book is in the activity");
  await E(()=>Books.close());await tidy();
  await E(()=>{const g=()=>{const T=Guess.track();T.wrongPick();T.finish(false);};g();g();});
  ok((await evs()).indexOf("guess:on")>=0&&await E(()=>Guess.on()),"sound it out first coming on is in the activity");
  await E(()=>Guess.set(false));
  ok((await evs()).slice(-1)[0]==="guessset:off","a grown-up turning it off is too");

  // ---- 4. sessions: a minute counted, rest and wake, hidden and back, closed ----
  await p.mouse.click(5,400);
  await E(()=>minuteTick());
  let ss=await E(()=>state.sessions);
  ok(ss.length===1&&ss[0].m===1,"a minute played is counted in the session "+J(ss));
  await rest();
  ok(await E(()=>Rest.on()),"the game rests");
  ss=await E(()=>state.sessions);ev=await evs();
  ok(ss.length===1&&ss[0].e>=ss[0].s&&ev[ev.length-1]==="end:rest","resting ends the session "+J([ss,ev.slice(-2)]));
  ok(typeof ss[0].last==="string"&&ss[0].last.length>0,"...and notes where he was: "+ss[0].last);
  await E(()=>Rest.poke());
  ss=await E(()=>state.sessions);ev=await evs();
  ok(ss.length===1&&ev[ev.length-1]==="start:wake","waking straight away carries on the same session "+J([ss.length,ev.slice(-2)]));
  // a rest that went on longer: the next wake is a new session
  await rest();await E(()=>{const s=state.sessions[0];s.s-=3600000;s.e-=600000;Rest.poke();});
  ss=await E(()=>state.sessions);
  ok(ss.length===2&&ss[1].m===0&&ss[1].s>ss[0].e,"waking 10 minutes after the rest starts a new session "+J(ss));
  // hidden (the iPad's home button), back, and closed
  const vis=v=>E(v=>{Object.defineProperty(document,"visibilityState",{configurable:true,get:()=>v});document.dispatchEvent(new Event("visibilitychange"));},v);
  await vis("hidden");
  ev=await evs();ok(ev[ev.length-1]==="end:hidden","the app put away ends the session "+J(ev.slice(-2)));
  await E(()=>{state.sessions[1].e-=600000;});
  await vis("visible");
  ss=await E(()=>state.sessions);ev=await evs();
  ok(ss.length===3&&ev[ev.length-1]==="start:back","coming back to the app later is a new session "+J([ss.length,ev.slice(-2)]));
  await E(()=>{delete document.visibilityState;window.dispatchEvent(new Event("pagehide"));});
  ev=await evs();ss=await E(()=>state.sessions);
  ok(ev[ev.length-1]==="end:closed"&&ss[2].e>=ss[2].s,"closing the app ends the session "+J(ev.slice(-2)));
  await E(()=>window.dispatchEvent(new Event("pageshow")));
  ok((await evs()).slice(-1)[0]==="start:back","...and showing the page again starts one");

  // ---- 5. the trims: 60 days of counters, 30 days of sessions, 80 events ----
  await E(()=>{const old=ymd(new Date(Date.now()-100*864e5)),mid=ymd(new Date(Date.now()-45*864e5));
    state.helps[old]={blend:3};state.helps[mid]={blend:1};state.prizes[old]={open:1};
    state.sessions.unshift({s:Date.now()-40*864e5,e:Date.now()-40*864e5+60000,m:1,last:"read"});
    for(let i=0;i<120;i++)state.events.unshift({t:Date.now()-864e5*3,k:"read",x:"old"});
    document.getElementById("blendBtn").click();      // no word open: still a tap on Blend it
    Play.prize(true);});
  await rest();
  const tr=await E(()=>{state.sessions[state.sessions.length-1].e-=600000;Rest.poke();const old=ymd(new Date(Date.now()-100*864e5)),mid=ymd(new Date(Date.now()-45*864e5));
    return{h:Object.keys(state.helps).sort(),p:Object.keys(state.prizes),s:state.sessions.length,e:state.events.length,old,mid};});
  ok(tr.h.indexOf(tr.old)<0&&tr.h.indexOf(tr.mid)>=0&&tr.p.indexOf(tr.old)<0,"helps and prizes keep 60 days "+J(tr));
  ok(tr.s===4,"sessions keep 30 days (the 40-day-old one is gone) "+J(tr.s));
  ok(tr.e===80,"the activity keeps the last 80 "+J(tr.e));

  // ---- 6. the report ----
  await E(()=>{const d=today(),y=ymd(new Date(Date.now()-864e5));
    state.daily[d]=4;state.answers[d]={n:4,ok:3,ms:8000};
    // yesterday: a late-night session that stopped in the Mine
    const late=new Date(Date.now()-864e5);late.setHours(22,40,0,0);
    state.sessions.push({s:+late,e:+late+9*60000,m:9,last:"mine"});state.sessions.sort((a,b)=>a.s-b.s);
    state.helps[y]={blend:10,ear:1,tiles:4,hint:0};
    state.events.push({t:+late+60000,k:"open",x:"mine"});state.events.sort((a,b)=>a.t-b.t);
    openReport();});
  await waitFor(p,"#ovReport #rPlay");
  const rep=await E(()=>{const r=document.getElementById("rPlay");return r?r.innerText:"";});
  const all=await E(()=>document.getElementById("ovReport").innerText);
  ok(/How he plays/.test(rep)&&all.indexOf("How he plays")<all.indexOf("Sound skills"),"the report has How he plays near the top");
  ok(/When he plays/.test(rep)&&/\d{1,2}:\d\d [ap]m · \d+ min/.test(rep),"sessions show as start time and minutes "+rep.slice(0,300));
  ok(/10:40 pm · 9 min/.test(rep)&&/stopped in Gem Mine/.test(rep),"yesterday's late session shows as is, and where it stopped");
  ok(/Words read a day/.test(rep)&&/Right first time/.test(rep)&&/75%/.test(rep),"words a day and right first time are charted (3 of 4 = 75%)");
  ok(/Help he leaned on/.test(rep)&&/Blend it \d+, Say the word \d+/.test(rep),"help he leaned on, with its one-line reading");
  ok(/sounding out more than asking/.test(rep),"...which reads Blend it over Say the word as sounding out");
  ok(/opened 2, waited 2/.test(rep),"prizes opened and waiting per day");
  ok(new RegExp("read '"+words[1]+"' first try").test(rep),"recent activity: the word read first try");
  ok(new RegExp("read '"+words[0]+"' with help").test(rep),"recent activity: the word read with help");
  ok(/opened Books/.test(rep)&&/stopped \(rest\)/.test(rep)&&/opened Gem Mine/.test(rep),"recent activity: games opened and stops, today and yesterday");
  const order=await E(()=>{const r=[...document.querySelectorAll("#rPlay .ract li")].map(li=>+li.dataset.t);return r.every((t,i)=>!i||r[i-1]>=t);});
  ok(order,"recent activity is newest first");
  await p.screenshot({path:"rp_report.png"});
  await E(()=>Modes.shut(document.getElementById("ovReport")));

  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
  await close();t.done();
})().catch(e=>{console.log("FAIL report_play suite crashed: "+(e&&e.stack||e));process.exit(1);});
