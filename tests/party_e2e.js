// v10.3 Party (his birthday week): the Grown-up setting (Settings → Birthday, a month and a day, "MM-DD"), the window (the
// birthday and the six days before it, across a new year too, never while blank), nothing outside it, the 🎂 button, the free
// party hat (once), the party scene with every animal he has, a cake and the buddy's greeting, the book in his name made at his
// level (every page passes the decode check at the seeded level, and at every level), read to the end with the storybook page
// controls and paying once a day, the look's piece from the real Looks.grant (wrapped to count) once a day of the week, a second day,
// the next birthday, the party mode, the save, an old save and the Birthday look's pieces in the valley.
const {launch,seed,reload,waitFor,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("party"),ok=T.ok;
  const CRITS=[{id:"fox",seed:5,c:5,r:8,lv:3,out:true,since:0},{id:"dog",seed:1,c:14,r:8,lv:2,out:true,since:1},
    {id:"frog",seed:6,c:9,r:7,lv:1,out:false,since:2},{id:"penguin",seed:8,c:11,r:6,lv:2,out:true,since:3},{id:"dog",seed:2,c:3,r:8,lv:1,out:false,since:4}];
  // the keepers are awake (no cut-scene on top), no reading goal cheer, level 2; no party hat yet
  const START={guardians:[0,1,2],gems:30,settings:{goal:0,tierOverride:2},critters:CRITS,mine:{coins:40},hats:["cap"]};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};
    Sound.say=k=>{window.__said.push("say:"+k);return Promise.resolve();};
    window.__toasts=[];if(!window.__toast0)window.__toast0=window.toast;window.toast=function(m){window.__toasts.push(String(m));return window.__toast0.apply(this,arguments);};});
  const toasts=re=>E(s=>window.__toasts.filter(t=>new RegExp(s).test(t)).length,re.source);
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const bd=()=>E(()=>JSON.parse(JSON.stringify(state.birthday)));
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const badge=()=>E(()=>{const b=document.getElementById("partyBadge");return b.classList.contains("on")?b.textContent:"";});
  const DEF={year:0,read:"",pieces:0};
  const wait=ms=>p.waitForTimeout(ms);
  const setB=s=>E(s=>{state.settings.birthday=s;Party._setToday(null);},s);
  // read the book from its cover to the end, the storybook way: each page's "I read it", then Next
  const readBook=async()=>{
    await p.click("#ptRead");
    if(!await waitFor(p,"#pbStart"))return false;
    await p.click("#pbStart");
    for(let i=0;i<7;i++){
      if(!await waitFor(p,"#pbRead"))return false;
      await E(()=>{const r=document.getElementById("pbRead");r.disabled=false;r.click();document.getElementById("pbNext").click();});}
    return waitFor(p,"#ovParty .bpage.end");};
  await listen();await tidy();

  // ---- 1. the window: the birthday and the six days before it ----
  const w=await E(()=>["2027-03-08","2027-03-09","2027-03-15","2027-03-16"].map(d=>Party.inWindow(d,"03-15")));
  ok(J(w)===J([false,true,true,false]),"a birthday of 03-15: 8 March no, 9 March yes, 15 March yes, 16 March no "+J(w));
  ok(await E(()=>Party.inWindow("2026-12-28","01-03")&&!Party.inWindow("2026-12-27","01-03")&&Party.inWindow("2027-01-03","01-03")&&!Party.inWindow("2027-01-04","01-03")),
    "a birthday on 3 January: the week starts on 28 December the year before");
  ok(await E(()=>Party.inWindow("2027-02-28","02-29")&&Party.inWindow("2027-02-22","02-29")&&!Party.inWindow("2027-03-01","02-29")&&Party.inWindow("2028-02-29","02-29")),
    "29 February: kept on the 28th in other years");
  ok(await E(()=>{const d=new Date(2027,0,1);for(let i=0;i<366;i++){if(Party.inWindow(new Date(2027,0,1+i),"")||Party.inWindow(new Date(2027,0,1+i),"13-40"))return false;}return true;}),
    "a blank (or impossible) birthday: never, on any day of the year");
  await setB("03-15");
  ok(J(await E(()=>["2027-03-08","2027-03-09","2027-03-15","2027-03-16"].map(d=>Looks.inWindow("birthday",d))))===J([false,true,true,false]),"the Birthday look's window follows the setting");
  await setB("");
  ok(await E(()=>!Looks.inWindow("birthday","2027-03-12")&&!Party.live()),"...and is shut while the setting is blank");
  const LK=await E(()=>{const L=Looks.get("birthday");return L&&{ic:L.ic,pieces:L.pieces,greet:L.greet,hat:L.hat||null,art:!!ART.look_balloons&&!!ART.look_banner&&!!ART.look_cake&&!!ART.bday_cake,
    banner:/>H</.test(ART.look_banner())&&/>Y</.test(ART.look_banner())};});
  ok(LK&&LK.ic==="🎂"&&J(LK.pieces)===J(["balloons","banner","confetti","cake"])&&LK.greet==="Happy birthday, {hero}!"&&!LK.hat&&LK.art&&LK.banner,
    "the Birthday look: 🎂, balloons, banner, confetti, the cake last, no look hat "+J(LK));
  ok(await E(()=>{const v=Looks.voiceLines();return v.indexOf("Happy birthday,")>=0&&v.indexOf("Happy birthday, Asher!")>=0&&v.indexOf("birthday cake")>=0&&!v.some(x=>/\{hero\}/.test(x));}),
    "the voice list gets \"Happy birthday,\" as a piece of its own (and the line with the name), never {hero}");

  // ---- 2. the Grown-up setting: Settings → Birthday, next to the hero name ----
  await E(()=>openParent());await p.click('.tabs .tab[data-tab="set"]');
  ok(await p.isVisible("#optBdayM")&&await p.isVisible("#optBdayD")&&await E(()=>document.getElementById("optBdayM").value===""&&document.getElementById("optBdayD").value===""),
    "Settings: Birthday (a month and a day), blank by default");
  ok(await E(()=>{const h=document.getElementById("optHero").closest(".row"),b=document.getElementById("optBdayM").closest(".row");return h.nextElementSibling===b;}),"...right after the hero name");
  await p.selectOption("#optBdayM","3");
  ok(await E(()=>state.settings.birthday==="")," a month alone sets nothing yet");
  await p.selectOption("#optBdayD","15");
  ok(await E(()=>state.settings.birthday==="03-15"),"March and 15: settings.birthday is \"03-15\"");
  await p.selectOption("#optBdayM","4");await p.selectOption("#optBdayD","31");
  ok(await E(()=>state.settings.birthday==="04-30"&&document.getElementById("optBdayD").value==="30"),"31 April moves back to 30 April");
  await p.selectOption("#optBdayM","");
  ok(await E(()=>state.settings.birthday===""),"a blank month clears it");
  await p.selectOption("#optBdayM","3");await p.selectOption("#optBdayD","15");
  await E(()=>Modes.shut(document.getElementById("ovParent")));
  await E(()=>openParent());
  ok(await E(()=>document.getElementById("optBdayM").value==="3"&&document.getElementById("optBdayD").value==="15"),"opening the menu again shows 15 March");
  await E(()=>Modes.shut(document.getElementById("ovParent")));await tidy();

  // ---- 3. outside the week: nothing shows and nothing is written ----
  await listen();
  for(const d of ["2027-03-08","2027-03-16"]){await E(x=>Party._setToday(x),d);ok(!(await shown("partyBtn")),d+": no 🎂 button");}
  ok(await E(()=>Party.open()===false&&Party.cover()===false&&!document.querySelector("#ovParty.on")),"outside the week the party does not open");
  ok(J(await bd())===J(DEF)&&await E(()=>state.hats.indexOf("party")<0),"...the save stays at its default and no party hat is given "+J(await bd()));

  // ---- 4. in the week: the button, and the free party hat (once) ----
  await E(()=>Party._setToday("2027-03-12"));
  ok(await shown("partyBtn")&&await badge()==="1","12 March: the 🎂 button shows, the book waiting on its badge");
  ok(await E(()=>state.hats.filter(h=>h==="party").length===1&&state.hats.indexOf("cap")>=0),"the party hat goes into his wardrobe, next to his cap");
  ok(await toasts(/party hat for your birthday/)===1,"...with a toast "+J(await E(()=>window.__toasts)));
  await E(()=>{Party._setToday("2027-03-13");Party._setToday("2027-03-12");});await wait(100);
  ok(await toasts(/party hat for your birthday/)===1&&await E(()=>state.hats.filter(h=>h==="party").length===1),"...once: no second hat or toast");
  ok(J(await bd())===J(DEF),"the hat writes nothing in state.birthday");

  // ---- 5. the party: every animal he has, at a table with a cake; the buddy says happy birthday ----
  await listen();
  await p.tap("#partyBtn");
  ok(await waitFor(p,()=>Modes.top()==="party"),"a tap on 🎂 opens the party (mode party)");
  let v=await E(()=>({guests:[...document.querySelectorAll("#ptGuests .ptguest")].map(g=>g.dataset.crit),art:[...document.querySelectorAll("#ptGuests .ptguest")].every(g=>!!g.querySelector("svg")),
    cake:!!document.querySelector("#ovParty .pttable .ptcake svg"),hat:/M36 32 L50 2 L64 32Z/.test(document.querySelector("#ovParty .ptbuddy").innerHTML),bubble:document.getElementById("ptBubble").textContent,
    banner:!!document.querySelector("#ovParty .ptbunting text"),read:document.getElementById("ptRead").textContent}));
  ok(J(v.guests)===J(["fox","dog","frog","penguin"])&&v.art,"every kind of animal he has comes to the party "+J(v.guests));
  ok(v.cake&&v.hat&&v.banner,"a cake on the table, the buddy in the party hat, a HAPPY BIRTHDAY banner "+J([v.cake,v.hat,v.banner]));
  ok(v.bubble==="Happy birthday, Asher!","the buddy's bubble: \"Happy birthday, Asher!\"");
  await wait(900);
  ok((await said()).indexOf("Happy birthday, Asher!")>=0,"...and says it "+J(await said()));
  ok(/Asher's Big Box/.test(v.read),"the book in his name, at level 2: "+v.read);

  // ---- 6. the book: seven pages at his level, each passing the decode check ----
  const bk=await E(()=>{const b=Party.book();return{title:b.title,t:b.t,pal:b.pal,pages:b.pages.map(x=>x[0]),bad:[b.title].concat(b.pages.map(x=>x[0])).filter(s=>Decode.check(s,2).some(w=>!w.ok))};});
  ok(bk.t===2&&bk.pages.length===7&&!bk.bad.length,"seven pages made at level 2, every one decodes at level 2 "+J(bk.pages)+(bk.bad.length?" bad: "+J(bk.bad):""));
  ok(bk.pal==="fox"&&bk.pages.some(s=>/The fox got Asher/.test(s)),"the friend is his own fox");
  const all=await E(()=>{const out=[],pals=new Set(),t0=state.settings.tierOverride,h0=state.hero;
    for(const hero of ["Asher","D'Angelo"]){state.hero=hero;
      for(let t=1;t<=12;t++){state.settings.tierOverride=t;const b=Party.book();pals.add(b.pal);
        [b.title].concat(b.pages.map(x=>x[0])).forEach(s=>{const bad=Decode.check(s,t).filter(w=>!w.ok);if(bad.length)out.push(t+": "+s);});
        b.pages.forEach(pg=>pg[1].forEach(it=>{const a=it[0];if(!(a==="ash"||(WORD_ART[a]&&ART[WORD_ART[a]])||ART[a]))out.push(t+": no art "+a);}));}}
    state.settings.tierOverride=t0;state.hero=h0;return{out,pals:[...pals]};});
  ok(!all.out.length,"at every level 1-12 (and with another name) every page and the title decode, and every picture exists"+(all.out.length?": "+all.out.slice(0,4).join(" | "):""));
  ok(await E(()=>{const t0=state.settings.tierOverride;state.settings.tierOverride=7;const t=Party.book().title;state.settings.tierOverride=t0;return t==="Asher's Big Day";}),
    "from level 7 the title is \"Asher's Big Day\"");

  // ---- 7. reading it to the end: the storybook page controls, paid once today, a look piece ----
  await E(()=>{window.__g=[];window.__og=Looks.grant;Looks.grant=(id,o)=>{window.__g.push(id);return window.__og(id,o);};});
  await listen();
  const g0=await E(()=>state.gems),w0=await E(()=>({w:state.wordsRead,goal:state.goal.words}));
  await p.click("#ptRead");
  ok(await waitFor(p,"#pbStart")&&await E(t=>document.querySelector("#ovParty .btitle").textContent.replace(/\s+/g," ").trim()===t,bk.title),"the cover, with his title");
  await p.click("#pbStart");
  v=await E(()=>({text:document.querySelector("#ovParty .btext").textContent.replace(/\s+/g," ").trim(),words:document.querySelectorAll("#ovParty .btext .bw").length,
    scene:!!document.querySelector("#ovParty .bscene svg, #ovParty .bscene img"),read:document.getElementById("pbRead").disabled,dots:document.querySelectorAll("#ovParty .bdots i").length}));
  ok(v.text===bk.pages[0]&&v.words>3&&v.scene&&v.read&&v.dots===7,"page 1: its scene, its words to tap, \"I read it\" waiting, seven dots "+J(v));
  ok(await waitFor(p,()=>!document.getElementById("pbRead").disabled,{timeout:5000}),"\"✓ I read it\" wakes up once there has been time to read");
  await p.click("#pbRead");
  ok(await p.isVisible("#pbHear")&&await p.isVisible("#pbNext"),"...then Hear it and Next page");
  await p.click("#pbHear");
  ok((await said()).some(x=>x==="say:sent:"+bk.pages[0]),"Hear it reads the page");
  await E(()=>{const n=document.getElementById("pbNext");n.click();n.click();});
  ok(await E(()=>Party._state().page===1),"a double tap on Next turns one page");
  for(let i=1;i<7;i++){await waitFor(p,"#pbRead");await E(()=>{const r=document.getElementById("pbRead");r.disabled=false;r.click();document.getElementById("pbNext").click();});}
  ok(await waitFor(p,"#ovParty .bpage.end"),"the seventh page leads to the end");
  const pay=await E(g=>state.gems-g,g0);
  ok(pay===12&&/\+12 💎/.test(await E(()=>document.getElementById("pbPaid").textContent)),"the end pays a book's first read: 6 💎 and 2 a star, three stars: +12 💎 ("+pay+")");
  const w1=await E(()=>({w:state.wordsRead,goal:state.goal.words}));
  ok(w1.w===w0.w+7&&w1.goal===w0.goal+7,"its seven pages count as reads (words read and today's goal) "+J([w0,w1]));
  ok(await waitFor(p,()=>JSON.stringify(window.__g)==='["birthday"]'),"the end asks Looks.grant(\"birthday\") once");
  ok(J(await bd())===J({year:2027,read:"2027-03-12",pieces:1}),"state.birthday: this birthday's piece asked for, read today "+J(await bd()));
  ok(await E(()=>JSON.stringify(Looks.pieces("birthday").earned)==='["balloons"]'&&state.look==="birthday"),"the balloons come first, and the look goes on");
  ok(await toasts(/🎂 Happy birthday, Asher!/)===1&&(await said()).indexOf("Happy birthday, Asher!")>=0,"the Look system says \"Happy birthday, Asher!\" with his name");
  ok((await said()).indexOf("The end! Happy birthday!")>=0&&/You got the balloons!/.test(await E(()=>document.getElementById("pbPiece").textContent)),"\"The end! Happy birthday!\", and the page shows the piece");
  ok(await badge()==="","no badge once today's book is read");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="balloons"]')&&!document.querySelector('#tiles .lookprop[data-prop="banner"]')),"the valley shows the balloons, and only them");

  // ---- 8. again the same day: reading counts, nothing more is paid or given ----
  await p.click("#pbParty");
  ok(await waitFor(p,"#ptGuests")&&/read it today/.test(await E(()=>document.getElementById("ptNote").textContent)),"back at the party: \"You read it today!\"");
  let g1=await E(()=>state.gems);
  ok(await readBook(),"he reads it again");
  ok(await E(g=>state.gems===g,g1)&&/read it again/.test(await E(()=>document.getElementById("pbPaid").textContent)),"the same day it pays nothing more, kindly");
  await wait(600);
  ok(await E(()=>window.__g.length===1&&state.birthday.pieces===1),"...and asks for no second piece");

  // ---- 9. a second day in the week: it pays again, and the next piece comes ----
  await E(()=>Party._setToday("2027-03-14"));
  ok(await badge()==="1","14 March: the book waits again on the badge");
  await E(()=>Party.close());await p.click("#partyBtn");await waitFor(p,"#ptRead");
  g1=await E(()=>state.gems);
  ok(await readBook(),"he reads it on the second day");
  ok(await E(g=>state.gems===g+12,g1)&&(await bd()).read==="2027-03-14","a new day: the book pays again");
  await wait(600);
  ok(await waitFor(p,()=>window.__g.length===2)&&await E(()=>JSON.stringify(Looks.pieces("birthday").earned)==='["balloons","banner"]'&&state.birthday.pieces===2),"...and a new day of the week brings the next piece: the banner");
  await E(()=>Party.close());

  // ---- 10. the next birthday: the next piece ----
  await E(()=>Party._setToday("2028-03-10"));
  await p.click("#partyBtn");await waitFor(p,"#ptRead");
  ok(await readBook(),"a year later, the week of the next birthday");
  ok(await waitFor(p,()=>window.__g.length===3)&&await E(()=>JSON.stringify(Looks.pieces("birthday").earned)==='["balloons","banner","confetti"]'),"the next piece: the confetti");
  ok(J(await bd())===J({year:2028,read:"2028-03-10",pieces:3}),"state.birthday "+J(await bd()));
  await E(()=>{Looks.grant=window.__og;Party.close();});

  // ---- 11. the mode, the save and a reload ----
  ok(await E(()=>{const m=Modes.list().party;return !!m&&m.name==="Birthday party"&&m.reading===true&&state.modeOpens[today()].party>=1;}),
    "the party mode counts as reading in Where the time goes "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await E(()=>saveNow());await wait(300);
  await reload(p);await listen();await tidy();
  ok(J(await bd())===J({year:2028,read:"2028-03-10",pieces:3})&&await E(()=>state.settings.birthday==="03-15"&&state.hats.indexOf("party")>=0),"state.birthday, the setting and the hat are saved");
  ok((await shown("partyBtn"))===(await E(()=>Party.inWindow(today()))),"after a reload the test date is gone: the real date ("+await E(()=>today())+") decides");
  await E(()=>{Looks.grant("birthday",{quiet:true});Looks.grant("birthday",{quiet:true});});await wait(200);
  v=await E(()=>({conf:[...document.querySelectorAll("#particles .lookp.lfall")].filter(x=>x.dataset.lk==="birthday:confetti").length,
    props:[...document.querySelectorAll("#tiles .lookprop")].map(x=>x.dataset.prop).sort(),cls:document.body.classList.contains("look-birthday"),done:Looks.done("birthday")}));
  ok(v.conf>0&&J(v.props)===J(["balloons","banner","cake"])&&v.cls&&v.done,"the whole Birthday look: balloons, the banner, confetti and the cake "+J(v));

  // ---- 12. saves: null and an old save ----
  await seed(p,Object.assign({},START,{birthday:null}));await tidy();
  ok(J(await bd())===J(DEF)&&await E(()=>state.settings.birthday===""),"a save with birthday null gets the default, and the setting is blank");
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  ok(J(await bd())===J(DEF)&&await E(()=>state.settings.birthday===""),"an old (v8) save loads, with the default birthday field and a blank setting");
  await E(()=>Party._setToday("2027-03-12"));
  ok(!(await shown("partyBtn")),"...no party while no birthday is set");
  await setB("03-15");await E(()=>Party._setToday("2027-03-12"));
  ok(await shown("partyBtn")&&await E(()=>state.hats.indexOf("party")>=0),"...with one set: the button, and the free hat");
  await E(()=>Party._setToday(null));

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
