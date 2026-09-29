// v10.3 Light the tree (Winter, 1–25 December): the window (Lights.inWindow and the Winter look's), nothing outside it,
// the ❄️ button, the tree's 25 bulbs and star, the 25 advent doors (door N opens on N December, later ones stay shut),
// a door's read (Build it, a heart-word check, a sentence from level 2) with dataset.ans / dataset.tiles, a right read
// pays 3 🪙 once and opens the door on a surprise, a miss takes nothing and the second miss glows, every sixth door asks
// the Look system for a piece (the real Looks.grant, wrapped to count), door 25 says Merry Christmas, reads anywhere
// light bulbs (a crate-loop read) and a finished book lights the star, a new date starts a dark tree and keeps the doors,
// the lights mode, the save, an old save and the Winter look's pieces in the valley.
const {launch,seed,reload,waitFor,answer,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("lights"),ok=T.ok;
  // the keepers of the three open lands are awake (no cut-scene on top); no reading goal cheer; two heart words mastered
  const START={guardians:[0,1,2],gems:30,settings:{goal:0},mine:{coins:40},
    stats:{the:{seen:6,first:6,mastered:true},to:{seen:6,first:6,mastered:true}}};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  // record what is said instead of playing it (again after every reload), and the toasts
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};
    Sound.say=k=>{window.__said.push("say:"+k);return Promise.resolve();};
    window.__toasts=[];if(!window.__toast0)window.__toast0=window.toast;window.toast=function(m){window.__toasts.push(String(m));return window.__toast0.apply(this,arguments);};});
  const toasted=re=>E(s=>window.__toasts.some(t=>new RegExp(s).test(t)),re.source);
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const purse=()=>E(()=>({c:state.mine.coins,g:state.gems}));
  const lt=()=>E(()=>JSON.parse(JSON.stringify(state.lights)));
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const DEF={day:"",bulbs:0,star:false,doors:[],granted:0};
  const wait=ms=>p.waitForTimeout(ms);
  const states=()=>E(()=>Lights.doors().map(d=>d.state[0]).join(""));
  const q=()=>E(()=>Lights._q());
  const msg=()=>E(()=>document.getElementById("ltMsg").textContent);
  // Build it in the door: the empty slots filled in order with the right sounds
  const buildRight=()=>E(()=>{const h=document.getElementById("ltQ"),tiles=JSON.parse(h.dataset.tiles),sl=[...h.querySelectorAll(".wslot")];
    tiles.forEach((ph,i)=>{if(sl[i].classList.contains("filled"))return;
      const t=[...h.querySelectorAll(".wbank .lt")].find(b=>!b.classList.contains("used")&&b.textContent===tileText(ph));if(t)t.click();});});
  // ...and wrong: a wrong sound in the first empty slot, then the others filled with whatever is left
  const buildWrong=()=>E(()=>{const h=document.getElementById("ltQ"),tiles=JSON.parse(h.dataset.tiles),sl=[...h.querySelectorAll(".wslot")];
    const empty=sl.filter(s=>!s.classList.contains("filled")).length,i0=sl.findIndex(s=>!s.classList.contains("filled"));
    const bank=()=>[...h.querySelectorAll(".wbank .lt")].filter(b=>!b.classList.contains("used"));
    bank().find(b=>b.textContent!==tileText(tiles[i0])).click();
    for(let k=1;k<empty;k++)bank()[0].click();
    return !!h.querySelector(".wslot.bad");});
  // a wrong picture for a sentence
  const pickWrong=()=>E(()=>{const h=document.getElementById("ltQ"),a=h.dataset.ans;[...h.querySelectorAll(".psopt")].find(x=>x.dataset.i!==a.slice(1)).click();});
  // open a door and read it right, whatever kind it is
  const readDoor=async n=>{
    const k=await E(n=>Lights.knock(n),n);if(!k)return false;
    const kind=(await q()).kind;await wait(kind==="sentence"?100:350);
    if(kind==="sentence")await answer(p,"#ltQ");else await buildRight();
    return waitFor(p,n=>Lights.opened.indexOf(n)>=0,{arg:n,timeout:4000});};
  const back=()=>E(()=>{const b=document.querySelector("#ltNext")||document.querySelector("#ltBack");if(b)b.click();});
  await listen();await tidy();

  // ---- 1. the window: 1 to 25 December ----
  const days=["2026-11-30","2026-12-01","2026-12-25","2026-12-26"];
  ok(J(await E(d=>d.map(x=>Lights.inWindow(x)),days))==="[false,true,true,false]","Lights.inWindow: 30 Nov no, 1 Dec yes, 25 Dec yes, 26 Dec no");
  ok(J(await E(d=>d.map(x=>Looks.inWindow("winter",x)),days))==="[false,true,true,false]","...the Winter look has the same window");
  ok(await E(()=>Lights.inWindow(new Date(2027,11,3))&&!Lights.inWindow(new Date(2027,10,30))&&Lights.inWindow("2030-12-24")&&!Lights.inWindow("soon")),
    "...for a Date too, in any year; anything else is outside");
  ok(await E(()=>Lights.live()===Lights.inWindow(today())),"with no test date it goes by today's date");
  const W=await E(()=>{const L=Looks.get("winter");return L&&{ic:L.ic,pieces:L.pieces,greet:L.greet,hat:L.hat,art:!!ART.look_lights&&!!ART.look_wreath&&!!ART.hat_santa};});
  ok(W&&W.ic==="🎄"&&J(W.pieces)===J(["lights","wreath","sparkle","hat"])&&W.greet==="Happy holidays! The valley is all lit up."&&W.hat==="santa"&&W.art,
    "the Winter look is in LOOKS: 🎄, lights, wreath, sparkle, hat, with its drawings and the Santa hat "+J(W));

  // ---- 2. outside the window: nothing shows and nothing is written ----
  for(const d of ["2026-11-30","2026-12-26"]){
    await E(x=>Lights._setToday(x),d);
    ok(!(await shown("lightsBtn")),d+": no ❄️ button");
  }
  ok(await E(()=>Lights.open()===false&&Lights.knock(1)===false&&!document.querySelector("#ovLights.on")),"outside the window: nothing opens, no door can be knocked");
  await E(()=>{Quests.hit("read",3);Quests.hit("book");Quests.hit("sign");});await wait(100);
  ok(J(await lt())===J(DEF)&&await E(()=>Lights.bulbs===0&&!Lights.star),"outside the window reads light nothing and the save stays at its default "+J(await lt()));

  // ---- 3. 6 December: the button, the tree and the doors ----
  await E(()=>Lights._setToday("2026-12-06"));
  ok(await shown("lightsBtn")&&await E(()=>document.getElementById("lightsBadge").textContent==="6"&&document.getElementById("lightsBadge").classList.contains("on")),
    "6 December: the ❄️ button shows, with 6 doors to open on its badge");
  ok(J(await lt())===J(DEF),"...and showing it writes nothing");
  await listen();
  await p.tap("#lightsBtn");
  ok(await waitFor(p,()=>Modes.top()==="lights"),"a tap on ❄️ opens the tree (mode lights)");
  ok(await states()==="rrrrrr"+"s".repeat(19),"doors 1–6 can open, 7–25 are shut: "+await states());
  let v=await E(()=>({bulbs:document.querySelectorAll("#ltBody .ltbulb").length,on:document.querySelectorAll("#ltBody .ltbulb.on").length,star:!!document.querySelector("#ltBody .ltstar.on"),
    doors:document.querySelectorAll("#ltDoors .ltdoor").length,ready:document.querySelectorAll("#ltDoors .ltdoor.ready").length,lit:document.getElementById("ltLit").textContent}));
  ok(v.bulbs===25&&v.on===0&&!v.star&&v.doors===25&&v.ready===6,"the tree has 25 bulbs, none lit, the star dark; 25 doors, 6 ready "+J(v));
  ok(/first bulb/.test(v.lit),"the line says how to light the first bulb: "+v.lit);
  await wait(600);
  ok((await said()).indexOf("Every word you read lights a bulb on the tree!")>=0,"it says what lights the tree "+J(await said()));
  await listen();
  await p.click('#ltDoors .ltdoor[data-door="9"]');
  ok(/Door 9 opens on 9 December/.test(await msg())&&(await said()).indexOf("That door opens on another day.")>=0&&!(await q()),
    "a later door stays shut, kindly: "+await msg());
  ok(await E(()=>Lights.knock(9))===false&&J(await lt())===J(DEF),"...it can't be knocked, and nothing is written");

  // ---- 4. door 1 (the keyboard): Build it, misses take nothing, the second miss glows, the right read pays once ----
  await E(()=>document.querySelector('#ltDoors .ltdoor[data-door="1"]').focus());await p.keyboard.press("Space");
  ok(await waitFor(p,()=>!!document.querySelector("#ltQ .wslots")),"Space on door 1 opens its read");
  const q1=await E(()=>{const h=document.getElementById("ltQ");return{ans:h.dataset.ans,tiles:h.dataset.tiles,q:Lights._q()};});
  ok(q1.q.n===1&&q1.q.kind==="build"&&q1.ans&&Array.isArray(JSON.parse(q1.tiles||"null")),"door 1 is Build it, with dataset.ans and dataset.tiles on the host "+J(q1));
  ok(await E(a=>{const w=allWords().find(x=>x.w===a);return !!w&&!w.tricky&&w.t<=currentTier();},q1.ans),"the word is at his level: "+q1.ans);
  const before=await purse(),words0=await E(()=>({w:state.wordsRead,g:state.goal.words}));
  await wait(400);
  ok(await buildWrong(),"a wrong build");
  await wait(150);
  ok(J(await purse())===J(before)&&J(await lt())===J(DEF),"a miss takes nothing and writes nothing");
  ok(await msg()==="Almost! Try again."&&await E(a=>document.getElementById("ltQ").dataset.ans===a&&!document.querySelector("#ltQ .hint"),q1.ans)&&(await q()).miss===1,
    "a miss: \"Almost! Try again.\", the same read stays, nothing glows yet");
  await wait(900);
  ok(await buildWrong(),"a second wrong build");
  ok(await waitFor(p,()=>document.querySelectorAll("#ltQ .wbank .lt.hint").length===1,{timeout:2500}),"after the second miss the next sound glows");
  ok(J(await purse())===J(before)&&J(await lt())===J(DEF)&&(await q()).miss===2,"still nothing taken, nothing written");
  await listen();
  await buildRight();
  ok(await waitFor(p,()=>!!state.lights&&state.lights.doors.length===1,{timeout:3000}),"he gets there: the door opens");
  let a=await purse(),t=await lt();
  ok(a.c===before.c+3&&a.g===before.g,"a right read pays 3 🪙 (after misses too); gems untouched "+J(a));
  ok(J(t)===J({day:"2026-12-06",bulbs:1,star:false,doors:[1],granted:0}),"state.lights: the date, a bulb for the read, door 1 "+J(t));
  const words1=await E(()=>({w:state.wordsRead,g:state.goal.words}));
  ok(words1.w===words0.w+1&&words1.g===words0.g+1,"the read counts toward wordsRead and today's goal "+J([words0,words1]));
  ok(await toasted(/^\+3 🪙$/),"the usual coin toast: +3 🪙");
  ok((await said()).indexOf("You opened the door!")>=0,"\"You opened the door!\" "+J(await said()));
  v=await E(()=>({gift:!!document.querySelector("#ltBody .ltgift .ltthing svg")&&!!document.querySelector("#ltBody .ltgift .ltbow svg"),text:document.getElementById("ltBody").textContent}));
  ok(v.gift&&/\+3 🪙/.test(v.text)&&/Door 1 is open/.test(v.text),"behind the door: a surprise picture with a bow, and +3 🪙");
  await back();
  ok(await waitFor(p,()=>!!document.querySelector('#ltDoors .ltdoor.open[data-door="1"] svg')),"back at the tree: door 1 shows its surprise");
  ok(await E(()=>document.querySelectorAll("#ltBody .ltbulb.on").length===1&&/1 bulb lit today/.test(document.getElementById("ltLit").textContent)),"...and one bulb is lit");
  ok(await E(()=>Lights.knock(1))===false&&(await purse()).c===a.c,"an open door can't be read again for more coins");
  ok(await E(()=>document.getElementById("lightsBadge").textContent)==="5","the ❄️ badge counts down: 5");

  // ---- 5. door 2: a heart-word check, and a double tap pays once ----
  ok(await E(()=>Lights.knock(2))===true,"door 2 opens its read");
  const q2=await E(()=>({ans:document.getElementById("ltQ").dataset.ans,q:Lights._q()}));
  ok(q2.q.kind==="heart"&&["the","to"].indexOf(q2.ans)>=0,"door 2 is a heart-word check: build a mastered ♥ word "+J(q2));
  const c2=(await purse()).c;
  await wait(350);
  await buildRight();
  await E(()=>{const b=[...document.querySelectorAll("#ltQ .wbank .lt")];b.forEach(x=>{x.click();x.click();});});
  await wait(1500);
  ok((await purse()).c===c2+3&&J((await lt()).doors)===J([1,2]),"a double tap pays once "+J(await purse()));
  await back();

  // ---- 6. door 3 from level 2: a sentence at his level; a right sentence lights the star ----
  await E(()=>{state.settings.tierOverride=3;});
  await listen();
  ok(await E(()=>Lights.knock(3))===true,"door 3 opens its read");
  const q3=await E(()=>({q:Lights._q(),ans:document.getElementById("ltQ").dataset.ans,text:(document.querySelector("#ltQ .btext")||{}).textContent||"",n:document.querySelectorAll("#ltQ .psopt").length}));
  ok(q3.q.kind==="sentence"&&/^#\d$/.test(q3.ans)&&q3.n===3,"level 3, door 3: a sentence to read, three pictures "+J(q3));
  ok(await E(x=>Decode.check(x,3).every(w=>w.ok),q3.text),"the sentence passes the decode check at level 3: "+q3.text);
  await wait(450);
  let s=await said();
  ok(s.indexOf("Read it to open the door!")>=0&&!s.some(x=>x.indexOf(q3.text)>=0||x==="say:sent:"+q3.text),"it says \"Read it to open the door!\", never the sentence "+J(s));
  ok(!(await E(()=>Lights.star)),"the star is still dark");
  await pickWrong();await wait(750);
  ok(await msg()==="Almost! Try again."&&(await said()).indexOf("Almost! Try again.")>=0,"a wrong picture: \"Almost! Try again.\", said");
  await pickWrong();await wait(100);
  ok(await E(a=>document.querySelector('#ltQ .psopt[data-i="'+a.slice(1)+'"]').classList.contains("hint"),q3.ans),"two misses on a sentence: the right picture glows");
  await answer(p,"#ltQ");
  ok(await waitFor(p,()=>state.lights.doors.length===3,{timeout:4000}),"...and it opens the door when he gets it");
  ok(await E(()=>Lights.star&&state.lights.star===true),"a sentence read lights the star");
  await back();
  ok(await E(()=>!!document.querySelector("#ltBody .ltstar.on")&&/star is lit/.test(document.getElementById("ltStarLn").textContent)),"the tree shows the star lit");

  // ---- 7. the sixth door: a piece of the Winter look from the Look system ----
  await E(()=>{window.__g=[];window.__og=Looks.grant;Looks.grant=(id,o)=>{window.__g.push(id);return window.__og(id,o);};});
  await listen();
  for(const n of [4,5]){ok(await readDoor(n),"door "+n+" opens");await back();}
  ok(await E(()=>window.__g.length===0&&state.lights.granted===0),"five doors: no look piece yet");
  ok(await readDoor(6),"door 6 opens");
  ok(await waitFor(p,()=>JSON.stringify(window.__g)==='["winter"]'),"the sixth door asks Looks.grant(\"winter\") once: "+J(await E(()=>window.__g)));
  ok(await E(()=>JSON.stringify(Looks.pieces("winter").earned)==='["lights"]'&&state.look==="winter"&&state.lights.granted===1),
    "the first piece (the string lights) is earned and the look goes on; granted 1");
  ok(await toasted(/Happy holidays! The valley is all lit up\./),"the Look system says its greeting "+J(await E(()=>window.__toasts.slice(-3))));
  ok(/You got the string lights!/.test(await E(()=>document.getElementById("ltPiece").textContent)),"...and the panel shows the piece");
  s=await said();
  ok(!s.some(x=>/string lights/.test(x)),"the piece is not said on top of the Look system's own line");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="lights"]')&&!document.querySelector('#tiles .lookprop[data-prop="wreath"]')),"the valley shows the string lights, and only them");
  await back();
  ok(await states()==="oooooo"+"s".repeat(19)&&await E(()=>!document.getElementById("lightsBadge").classList.contains("on")),"all six doors are open, 7–25 still shut, no badge");
  await wait(300);
  ok(await E(()=>window.__g.length===1),"...and nothing more is granted");

  // ---- 8. reads anywhere light bulbs: a crate-loop read ----
  t=await lt();
  ok(t.bulbs===6&&await E(()=>document.querySelectorAll("#ltBody .ltbulb.on").length===6),"six door reads, six bulbs "+t.bulbs);
  await E(()=>Lights.close());await tidy();
  const cw=await E(()=>{const w=allWords().find(x=>!x.tricky&&x.t===1&&WORD_ART[x.w]);openWord({...w},{rung:2});return w.w;});
  await wait(1100);await E(()=>document.querySelector("#picks .btn").click());await wait(300);
  await E(w=>{const b=document.querySelector(`#picks .pick[data-w="${w}"]`);if(b)b.click();},cw);await wait(600);await tidy();
  ok((await lt()).bulbs===7,"a crate-loop read (\""+cw+"\") lights one more bulb: "+(await lt()).bulbs);

  // ---- 9. a new date: a dark tree, the doors stay; a finished book lights the star ----
  await E(()=>Lights._setToday("2026-12-07"));
  ok(await E(()=>Lights.bulbs===0&&!Lights.star&&Lights.opened.length===6),"7 December: no bulbs lit, the star dark, the six doors still open");
  ok(await states()==="oooooor"+"s".repeat(18)&&await E(()=>document.getElementById("lightsBadge").textContent==="1"),"door 7 can open now");
  ok((await lt()).day==="2026-12-06","...and the save changes only with a read");
  const bk=await E(()=>{const b=BOOKS.find(x=>x.t===1&&!x.mine);return{id:b.id,n:b.pages.length};});
  await E(id=>Books.openBook(id),bk.id);await E(()=>document.getElementById("bStart").click());
  for(let i=0;i<bk.n;i++)await E(()=>{const r=document.getElementById("bRead");r.disabled=false;r.click();document.getElementById("bNext").click();});
  for(let k=0;k<6;k++){
    const has=await waitFor(p,()=>!!document.querySelector("#ovStory .bopts")||!!document.querySelector("#ovStory .bpage.end"),{timeout:4000});
    if(!has||await E(()=>!!document.querySelector("#ovStory .bpage.end")))break;
    await E(()=>{const h=document.querySelector("#ovStory .bopts"),b=h.querySelector('.bopt[data-v="'+h.dataset.ans+'"]');b.click();});
    await waitFor(p,i=>Books._state().quizIdx>i||!!document.querySelector("#ovStory .bpage.end"),{arg:k,timeout:3000});}
  ok(await waitFor(p,"#ovStory .bpage.end",{timeout:4000}),"a storybook read to the end ("+bk.id+")");
  t=await lt();
  ok(t.day==="2026-12-07"&&t.star===true&&t.bulbs===bk.n&&t.doors.length===6,"a finished book lights the star (and its pages light bulbs); the doors stay "+J(t));
  await E(()=>Books.close());await tidy();
  // Picture it (level 3 from door 3 on): a sentence there lights the star too
  await E(()=>Lights._setToday("2026-12-08"));
  ok(await E(()=>!Lights.star&&Lights.bulbs===0),"8 December: the star is dark again");
  await E(()=>openPicIt());await wait(400);
  for(let i=0;i<3;i++){const r=await E(i=>{const b=document.querySelectorAll("#ovPic .psopt")[i];b.click();return b.classList.contains("right");},i);if(r)break;await wait(700);}
  ok(await waitFor(p,()=>Lights.star&&state.lights.day==="2026-12-08"&&state.lights.bulbs===1),"a Picture it sentence lights the star (and one bulb) "+J(await lt()));
  await wait(1500);await tidy();

  // ---- 10. twelve doors: the second piece; door 25 says Merry Christmas ----
  await E(()=>Lights._setToday("2026-12-25"));
  ok(await states()==="oooooo"+"r".repeat(19),"25 December: every door he hasn't opened can open");
  await listen();
  for(const n of [7,8,9,10,11,12]){ok(await readDoor(n),"door "+n+" opens");if(n<12)await back();}
  ok(await waitFor(p,()=>window.__g.length===2)&&await E(()=>JSON.stringify(Looks.pieces("winter").earned)==='["lights","wreath"]'&&state.lights.granted===2),
    "the twelfth door: a second grant, the wreath");
  ok((await said()).indexOf("You got the wreath! Look in your closet.")>=0,"the Look system says \"You got the wreath!\"");
  await back();
  const c25=(await purse()).c;
  await listen();
  ok(await readDoor(25),"door 25 opens");
  ok(await waitFor(p,()=>/Merry Christmas!/.test(document.getElementById("ltBody").textContent))&&(await said()).indexOf("Merry Christmas!")>=0,"door 25: \"Merry Christmas!\", shown and said");
  ok(await E(()=>document.querySelectorAll("#fx .conf").length>0),"...with confetti");
  ok((await purse()).c===c25+3&&await E(()=>window.__g.length===2),"door 25 pays 3 🪙; thirteen doors ask for no third piece");
  await E(()=>{Looks.grant=window.__og;state.settings.tierOverride=0;Lights.close();});

  // ---- 11. the mode, the save and a reload ----
  ok(await E(()=>{const m=Modes.list().lights;return !!m&&m.name==="Light the tree"&&m.reading===true&&state.modeOpens[today()].lights>=1;}),
    "the lights mode counts as reading in Where the time goes: "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await E(()=>saveNow());await wait(300);
  await reload(p);await listen();await tidy();
  t=await lt();
  ok(t.day==="2026-12-25"&&t.doors.length===13&&t.granted===2&&t.bulbs===7&&t.star===true,"state.lights is saved (doors 9 and 12 were sentences: the star) "+J(t));
  ok((await shown("lightsBtn"))===(await E(()=>Lights.inWindow(today()))),"after a reload the test date is gone: the real date ("+await E(()=>today())+") decides");
  // the rest of the look, given quietly: the sparkles drift and the buddy wears the Santa hat
  await E(()=>{Looks.grant("winter",{quiet:true});Looks.grant("winter",{quiet:true});});await wait(200);
  v=await E(()=>({sp:[...document.querySelectorAll("#particles .lookp.lfall")].filter(x=>x.textContent==="✨").length,hat:!!document.querySelector("#buddyWorld [data-hat=santa]"),
    hud:!!document.querySelector("#buddyBtn [data-hat=santa]"),cls:document.body.classList.contains("look-winter")}));
  ok(v.sp>0&&v.hat&&v.hud&&v.cls,"the whole Winter look: sparkles drift, the buddy wears the Santa hat "+J(v));

  // ---- 12. a new December shuts the doors again ----
  await E(()=>Lights._setToday("2027-12-02"));
  ok(await E(()=>Lights.opened.length===0&&Lights.ready===2)&&await states()==="rr"+"s".repeat(23),"December 2027: the doors are shut again, 1 and 2 can open");
  ok(await readDoor(2),"a door read in the new December");
  t=await lt();
  ok(t.day==="2027-12-02"&&J(t.doors)===J([2])&&t.granted===0&&t.bulbs===1,"the save starts the new December "+J(t));
  await E(()=>{Lights.close();Lights._setToday(null);});

  // ---- 13. saves: null and an old save ----
  await seed(p,Object.assign({},START,{lights:null}));await tidy();
  ok(J(await lt())===J(DEF),"a save with lights null gets the default");
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  ok(J(await lt())===J(DEF),"an old (v8) save loads, with the default lights field");
  await E(()=>Lights._setToday("2026-12-03"));
  ok(await shown("lightsBtn")&&await states()==="rrr"+"s".repeat(22),"...3 December: the button, doors 1–3");
  const c8=(await purse()).c;
  ok(await readDoor(1)&&(await purse()).c===c8+3,"...and a door pays in the old save too");
  await E(()=>{Lights.close();Lights._setToday(null);});

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
