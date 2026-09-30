// v10.3 Fireworks (the Fourth of July, 28 June to 4 July): the window (Fireworks.inWindow and the look's own), nothing outside it,
// the 🎆 button and its badge, the night sky (one canvas, drawn only while something is in the air), a crate-loop read launching a
// firework (counted through Fireworks._bursts()), a Picture it sentence and a finished book sending up big ones, ten reads making the
// grand finale that asks the real Looks.grant (wrapped to count) once, one finale a day, a finale reached while he reads elsewhere
// waiting for the valley, the sparkler race on the Race engine (it starts, pays the usual race gems once, once a day), a second day
// starting a new sky, the fireworks mode, the save, an old save, and the look's pieces in the valley.
const {launch,seed,reload,waitFor,answer,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("fireworks"),ok=T.ok;
  // the keepers of the three open lands are awake (no cut-scene on top); no reading goal cheer
  const START={guardians:[0,1,2],gems:30,settings:{goal:0},mine:{coins:40}};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  // record what is said instead of playing it (again after every reload), and the toasts
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};
    Sound.say=k=>{window.__said.push("say:"+k);return Promise.resolve();};
    window.__toasts=[];if(!window.__toast0)window.__toast0=window.toast;window.toast=function(m){window.__toasts.push(String(m));return window.__toast0.apply(this,arguments);};});
  const toasted=re=>E(s=>window.__toasts.some(t=>new RegExp(s).test(t)),re.source);
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const jl=()=>E(()=>JSON.parse(JSON.stringify(state.july)));
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const badge=()=>E(()=>{const b=document.getElementById("fireworksBadge");return b.classList.contains("on")?b.textContent:"";});
  const bursts=()=>E(()=>Fireworks._bursts());
  const DEF={day:"",shots:0,finale:false,race:""};
  const wait=ms=>p.waitForTimeout(ms);
  // a crate-loop read: a word opened from a crate, its picture picked
  const crateRead=async()=>{
    const cw=await E(()=>{const w=allWords().find(x=>!x.tricky&&x.t===1&&WORD_ART[x.w]);openWord({...w},{rung:2});return w.w;});
    await wait(1100);await E(()=>document.querySelector("#picks .btn").click());await wait(300);
    await E(w=>{const b=document.querySelector(`#picks .pick[data-w="${w}"]`);if(b)b.click();},cw);await wait(600);await tidy();return cw;};
  await listen();await tidy();

  // ---- 1. the window: 28 June to 4 July ----
  const days=["2026-06-27","2026-06-28","2026-07-04","2026-07-05"];
  ok(J(await E(d=>d.map(x=>Fireworks.inWindow(x)),days))==="[false,true,true,false]","Fireworks.inWindow: 27 Jun no, 28 Jun yes, 4 Jul yes, 5 Jul no");
  ok(J(await E(d=>d.map(x=>Looks.inWindow("july",x)),days))==="[false,true,true,false]","...the Fourth of July look has the same window");
  ok(await E(()=>Fireworks.inWindow(new Date(2027,5,30))&&Fireworks.inWindow(new Date(2027,6,1))&&!Fireworks.inWindow(new Date(2027,6,5))
    &&!Fireworks.inWindow(new Date(2027,5,27))&&Fireworks.inWindow("2031-07-03")&&!Fireworks.inWindow("2031-12-30")&&!Fireworks.inWindow("soon")),
    "...for a Date too, in any year; anything else is outside");
  ok(await E(()=>Fireworks.live()===Fireworks.inWindow(today())),"with no test date it goes by the real date");
  const LK=await E(()=>{const L=Looks.get("july");return L&&{ic:L.ic,name:L.name,pieces:L.pieces,greet:L.greet,hat:L.hat,
    art:!!ART.look_flags&&!!ART.look_bunting&&!!ART.hat_star,draw:/<svg/.test(ART.look_flags(mulberry(1)))&&/<svg/.test(ART.look_bunting(mulberry(1)))&&/data-hat="star"/.test(ART.hat_star())};});
  ok(LK&&LK.ic==="🎆"&&LK.name==="Fourth of July"&&J(LK.pieces)===J(["flags","bunting","sparks","hat"])&&LK.greet==="Happy Fourth of July! Watch the sky tonight."&&LK.hat==="star"&&LK.art&&LK.draw,
    "the Fourth of July look is in LOOKS: 🎆, flags, bunting, sparks, hat, with its drawings and the star hat "+J(LK));
  ok(await E(()=>{const v=Looks.voiceLines();return v.indexOf("Happy Fourth of July! Watch the sky tonight.")>=0&&v.indexOf("star hat")>=0&&v.indexOf("firework sparkles")>=0;}),
    "its greeting and piece names are in Looks.voiceLines(), for the voice list");

  // ---- 2. outside the window: nothing shows and nothing is written ----
  for(const d of ["2026-06-27","2026-07-05"]){
    await E(x=>Fireworks._setToday(x),d);
    ok(!(await shown("fireworksBtn")),d+": no 🎆 button");
  }
  ok(await E(()=>Fireworks.open()===false&&Fireworks.race()===false&&!document.querySelector("#ovFireworks.on")),"outside the window: the sky does not open, no sparkler race");
  await E(()=>{Quests.hit("read",3);Quests.hit("book");Quests.hit("sign");});await wait(100);
  ok(J(await jl())===J(DEF)&&(await bursts()).launched===0,"outside the window reads launch nothing and the save stays at its default "+J(await jl()));

  // ---- 3. 2 July: the button, and the sky ----
  await E(()=>Fireworks._setToday("2026-07-02"));
  ok(await shown("fireworksBtn")&&await badge()==="10","2 July: the 🎆 button shows, with the 10 fireworks to go for the finale on its badge");
  ok(J(await jl())===J(DEF),"...and showing it writes nothing");
  await listen();
  await p.tap("#fireworksBtn");
  ok(await waitFor(p,()=>Modes.top()==="fireworks"),"a tap on 🎆 opens the sky (mode fireworks)");
  let v=await E(()=>({canvas:!!document.querySelector("#ovFireworks .fwsky canvas"),line:document.getElementById("fwLine").textContent,race:document.getElementById("fwRace").textContent,
    meter:document.querySelectorAll("#fwMeter i").length,lit:document.querySelectorAll("#fwMeter i.on").length,buddy:!!document.querySelector("#fwBuddy svg")}));
  ok(v.canvas&&v.buddy&&/first firework/.test(v.line)&&v.meter===10&&v.lit===0&&/Sparkler race/.test(v.race),
    "the sky: a canvas, the buddy watching, 10 dark fireworks to the finale, the sparkler race "+J(v));
  await wait(600);
  ok((await said()).indexOf("Every word you read today launches a firework!")>=0,"it says what launches a firework "+J(await said()));
  ok(J(await bursts())===J({launched:0,burst:0,big:0,finales:0,queued:0,air:0}),"nothing in the air yet, nothing drawn "+J(await bursts()));
  await E(()=>Fireworks.close());
  ok(await E(()=>Modes.top()==="valley"),"closing the sky goes back to the valley");

  // ---- 4. a crate-loop read launches a firework; it goes up when he opens the sky ----
  const cw=await crateRead();
  let b=await bursts(),t=await jl();
  ok(t.day==="2026-07-02"&&t.shots===1&&t.finale===false&&b.launched===1&&b.burst===0,
    "a crate-loop read (\""+cw+"\") launches a firework; the sky is shut, so it waits "+J([t,b]));
  ok(await badge()==="9","the 🎆 badge counts down: 9");
  await p.click("#fireworksBtn");
  ok(await waitFor(p,()=>Fireworks._bursts().burst>=1,{timeout:4000}),"opening the sky: it goes up and bursts "+J(await bursts()));
  ok(await waitFor(p,()=>Fireworks._bursts().air===0&&Fireworks._bursts().queued===0,{timeout:6000}),"...then the sky goes quiet and the drawing stops "+J(await bursts()));
  ok(await E(()=>document.querySelectorAll("#fwMeter i.on").length===1&&/1 firework today/.test(document.getElementById("fwLine").textContent)),
    "one lit on the meter: \"1 firework today\"");
  await E(()=>Fireworks.close());

  // ---- 5. a Picture it sentence and a finished book send up big ones (the book's pages count as reads) ----
  await E(()=>openPicIt());await wait(400);
  for(let i=0;i<3;i++){const r=await E(i=>{const b=document.querySelectorAll("#ovPic .psopt")[i];b.click();return b.classList.contains("right");},i);if(r)break;await wait(700);}
  ok(await waitFor(p,()=>state.july.shots===2)&&(await bursts()).launched===3,"a Picture it sentence: one more firework, and a big one "+J(await bursts()));
  await wait(1500);await tidy();
  const bk=await E(()=>{const b=BOOKS.find(x=>x.t===1&&!x.mine);return{id:b.id,n:b.pages.length};});
  await E(id=>Books.openBook(id),bk.id);await E(()=>document.getElementById("bStart").click());
  for(let i=0;i<bk.n;i++)await E(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();});
  for(let k=0;k<6;k++){
    const has=await waitFor(p,()=>!!document.querySelector("#ovStory .bopts")||!!document.querySelector("#ovStory .bpage.end"),{timeout:4000});
    if(!has||await E(()=>!!document.querySelector("#ovStory .bpage.end")))break;
    await E(()=>{const h=document.querySelector("#ovStory .bopts"),b=h.querySelector('.bopt[data-v="'+h.dataset.ans+'"]');b.click();});
    await waitFor(p,i=>Books._state().quizIdx>i||!!document.querySelector("#ovStory .bpage.end"),{arg:k,timeout:3000});}
  ok(await waitFor(p,"#ovStory .bpage.end",{timeout:4000}),"a storybook read to the end ("+bk.id+")");
  t=await jl();b=await bursts();
  ok(t.shots===2+bk.n&&b.launched===3+bk.n+1,"a finished book: a firework for each page and a big one "+J([t,b]));
  await E(()=>Books.close());await tidy();
  await p.click("#fireworksBtn");
  ok(await waitFor(p,n=>Fireworks._bursts().burst>=n&&Fireworks._bursts().big>=2,{arg:1+Math.min(12,1+bk.n),timeout:9000}),
    "they go up when he opens the sky, the big ones too "+J(await bursts()));

  // ---- 6. ten reads today: the grand finale, and one piece of the look from the real Look system ----
  await E(()=>{window.__g=[];window.__og=Looks.grant;Looks.grant=(id,o)=>{window.__g.push(id);return window.__og(id,o);};});
  await listen();
  const b0=await bursts(),left=10-(await jl()).shots;
  for(let i=0;i<left-1;i++)await E(()=>Quests.hit("read",1));
  await wait(300);
  ok(await E(()=>window.__g.length===0&&!state.july.finale),"nine fireworks: no finale yet");
  ok(await badge()==="1","...one to go on the badge");
  await E(()=>Quests.hit("read",1));
  ok(await waitFor(p,()=>JSON.stringify(window.__g)==='["july"]'),"the tenth: the grand finale asks Looks.grant(\"july\") once "+J(await E(()=>window.__g)));
  t=await jl();
  ok(t.shots===10&&t.finale===true,"state.july: ten today, the finale marked "+J(t));
  ok((await said()).indexOf("Grand finale! Ten fireworks!")>=0&&await E(()=>document.getElementById("fwBig").classList.contains("on")),"\"Grand finale! Ten fireworks!\", shown big in the sky "+J(await said()));
  ok(await waitFor(p,n=>Fireworks._bursts().big>=n,{arg:b0.big+12,timeout:9000}),"a sky full of big bursts "+J(await bursts()));
  ok(await E(()=>JSON.stringify(Looks.pieces("july").earned)==='["flags"]'&&state.look==="july"),"the first piece (the flags) is earned and the look goes on");
  ok(await toasted(/Happy Fourth of July! Watch the sky tonight\./),"the Look system says its greeting "+J(await E(()=>window.__toasts.slice(-3))));
  ok(/You got the flags!/.test(await E(()=>document.getElementById("fwPiece").textContent)),"...and the sky shows the piece");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="flags"]')&&!document.querySelector('#tiles .lookprop[data-prop="bunting"]')),"the valley shows the flags, and only them");
  ok(await E(()=>/Grand finale/.test(document.getElementById("fwLine").textContent)&&document.querySelectorAll("#fwMeter i.on").length===10),"the meter is full");
  ok(await badge()==="","no badge after the finale");
  await E(()=>{Quests.hit("read",2);Quests.hit("book");});await wait(600);
  ok(await E(()=>window.__g.length===1&&state.july.shots===12),"more reads: more fireworks, no second finale today");

  // ---- 7. the sparkler race: the usual race at night, paid as a race pays, once a day ----
  const g0=await E(()=>state.gems);
  await p.click("#fwRace");
  ok(await waitFor(p,()=>Modes.top()==="race"),"✨ Sparkler race opens a race (mode race)");
  v=await E(()=>({spark:!!document.querySelector("#ovRace .racesheet.sparkler"),title:document.querySelector("#ovRace h2").textContent,cars:document.querySelectorAll("#ovRace .rcar").length,
    mine:state.vehicles.some(x=>x.id==="v_car")&&!!document.querySelector("#ovRace .lane.me .rcar svg")}));
  ok(v.spark&&/Sparkler race/.test(v.title)&&v.cars===3&&v.mine,"a night track with sparkler trails, his own car and two others "+J(v));
  ok(await E(()=>getComputedStyle(document.querySelector("#ovRace .rcar"),"::before").width!=="auto"),"the cars trail a sparkler");
  await p.click("#rGo");
  for(let g=0;g<3;g++){
    ok(await waitFor(p,()=>!!document.querySelector("#rQ .rqi [data-w]"),{timeout:20000}),"gate "+(g+1)+" asks a word");
    await answer(p,"#rQ .rqi");await wait(1200);}
  ok(await waitFor(p,()=>!!document.querySelector("#ovRace .podium"),{timeout:25000}),"the race finishes");
  const won=await E(()=>document.querySelector("#rQ h2").textContent),pay=/won/.test(won)?6:/Second/.test(won)?3:2;
  ok(await E(()=>state.gems)===g0+pay,"it pays the usual race gems: "+won+" +"+pay+" 💎 ("+(await E(()=>state.gems))+")");
  ok(await E(()=>!document.querySelector("#rAgain")&&!!document.querySelector("#rOk")),"no \"Race again\" on a sparkler race, just Done");
  ok((await jl()).race==="2026-07-02"&&await E(()=>Fireworks.raced),"state.july.race is today's date");
  await p.click("#rOk");
  ok(await waitFor(p,()=>Modes.top()==="fireworks"),"Done: back to the sky");
  ok(await E(()=>/Raced today/.test(document.getElementById("fwRace").textContent)),"the button says he raced today");
  await listen();
  await p.click("#fwRace");await wait(200);
  ok(await E(()=>Modes.top()==="fireworks"&&/Another sparkler race tomorrow/.test(document.getElementById("fwMsg").textContent)),"a second race today: a kind word instead");
  ok((await said()).indexOf("You raced today! Come back tomorrow for another sparkler race.")>=0&&await E(()=>state.gems)===g0+pay&&await E(()=>Fireworks.race())===false,
    "...said, and nothing more is paid");
  await E(()=>Fireworks.close());

  // ---- 8. a second day: a new sky; ten reads in a crate make a finale that waits for the valley ----
  await E(()=>Fireworks._setToday("2026-07-03"));
  ok(await E(()=>Fireworks.shots===0&&!Fireworks.finale&&!Fireworks.raced)&&await badge()==="10","3 July: an empty sky, no finale yet, a sparkler race to run");
  ok((await jl()).day==="2026-07-02","...and the save changes only with a read");
  await listen();
  await E(()=>show("ovCrates"));
  ok(await E(()=>Modes.top()==="read"),"he is in the crates");
  await E(()=>Quests.hit("read",10));
  await wait(2600);
  ok(await E(()=>window.__g.length===1&&!state.july.finale&&Fireworks._waiting()),"ten reads in the crates: the finale waits while he reads");
  await E(()=>Modes.shut(document.getElementById("ovCrates")));
  ok(await waitFor(p,()=>window.__g.length===2,{timeout:5000}),"back in the valley: the finale cheers and asks for the next piece "+J(await E(()=>window.__g)));
  ok(await toasted(/Grand finale! Ten fireworks today!/)&&(await said()).indexOf("Grand finale! Ten fireworks!")>=0,"a toast and the line: \"Grand finale!\"");
  ok(await E(()=>JSON.stringify(Looks.pieces("july").earned)==='["flags","bunting"]'&&state.july.finale===true&&state.july.day==="2026-07-03"),"the second piece, the bunting");
  ok((await said()).indexOf("You got the bunting! Look in your closet.")>=0,"the Look system says \"You got the bunting!\"");
  const bb=(await bursts()).big;
  await p.click("#fireworksBtn");
  ok(await waitFor(p,()=>document.getElementById("fwBig").classList.contains("on"))&&await waitFor(p,n=>Fireworks._bursts().big>=n,{arg:bb+12,timeout:9000}),
    "the sky plays the finale he missed "+J(await bursts()));
  ok(await E(()=>window.__g.length===2),"...and gives nothing more");
  await E(()=>{Looks.grant=window.__og;Fireworks.close();});

  // ---- 9. the mode, the save and a reload ----
  ok(await E(()=>{const m=Modes.list().fireworks;return !!m&&m.name==="Fireworks"&&m.reading===true&&state.modeOpens[today()].fireworks>=1;}),
    "the fireworks mode counts as reading in Where the time goes: "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await E(()=>saveNow());await wait(300);
  await reload(p);await listen();await tidy();
  t=await jl();
  ok(J(t)===J({day:"2026-07-03",shots:10,finale:true,race:"2026-07-02"}),"state.july is saved "+J(t));
  ok((await shown("fireworksBtn"))===(await E(()=>Fireworks.inWindow(today()))),"after a reload the test date is gone: the real date ("+await E(()=>today())+") decides");
  // the rest of the look, given quietly: the sparkles pop in the sky and the buddy wears the star hat
  await E(()=>{Looks.grant("july",{quiet:true});Looks.grant("july",{quiet:true});});await wait(200);
  v=await E(()=>({sp:[...document.querySelectorAll("#particles .lookp.lfall")].filter(x=>x.dataset.lk==="july:sparks").length,hat:!!document.querySelector("#buddyWorld [data-hat=star]"),
    hud:!!document.querySelector("#buddyBtn [data-hat=star]"),cls:document.body.classList.contains("look-july"),props:document.querySelectorAll("#tiles .lookprop").length}));
  ok(v.sp>0&&v.hat&&v.hud&&v.cls&&v.props===2,"the whole Fourth of July look: flags, bunting, sparkles, the star hat "+J(v));

  // ---- 10. saves: null and an old save ----
  await seed(p,Object.assign({},START,{july:null}));await tidy();
  ok(J(await jl())===J(DEF),"a save with july null gets the default");
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  ok(J(await jl())===J(DEF),"an old (v8) save loads, with the default july field");
  await E(()=>Fireworks._setToday("2026-06-29"));
  ok(await shown("fireworksBtn")&&await badge()==="10","...29 June: the button");
  await E(()=>Quests.hit("read",1));
  ok(J(await jl())===J({day:"2026-06-29",shots:1,finale:false,race:""}),"...and a read launches a firework in the old save too "+J(await jl()));
  await E(()=>Fireworks._setToday(null));

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
