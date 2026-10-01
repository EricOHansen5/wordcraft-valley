// v10.3 Word mail (Valentine's Day, 1 to 14 February): the window (Mail.inWindow and the look's own), nothing outside it,
// the 💌 button, a letter from one of his animals at his level (every word decodes there; a tap on a word says it), the pick
// with dataset.ans, a right answer pays 2 🪙 once, a miss takes nothing and the second miss glows, eight letters fill the
// bag (a new friend comes to the valley, one look piece from the real Look system), one bag a day, a new date, 10 💎 when
// he has every animal of his lands, the letters at every level, the mail mode, the save, and an old save.
const {launch,seed,reload,waitFor,answer,check}=require("./lib");
const fs=require("fs"),path=require("path");
const FX=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8"));
(async()=>{
  const T=check("mail"),ok=T.ok;
  const CRITS=[{id:"fox",seed:5,c:5,r:8,lv:3,out:true,since:0},{id:"dog",seed:1,c:14,r:8,lv:2,out:true,since:1},
    {id:"frog",seed:6,c:9,r:7,lv:1,out:false,since:2},{id:"penguin",seed:8,c:11,r:6,lv:2,out:true,since:3}];
  const MINE=CRITS.map(c=>c.id);
  // the keepers of the three open lands are awake, so no cut-scene opens on top; no reading goal cheer; level 4
  const START={guardians:[0,1,2],gems:30,settings:{goal:0,tierOverride:4},critters:CRITS,mine:{coins:40}};
  const {page:p,errs,close,E}=await launch({seed:START});
  const J=x=>JSON.stringify(x);
  // record what is said instead of playing it (again after every reload): Sound.speak lines, and Sound.say keys (words); and the toasts
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};
    Sound.say=k=>{window.__said.push("say:"+k);return Promise.resolve();};
    window.__toasts=[];if(!window.__toast0)window.__toast0=window.toast;window.toast=function(m){window.__toasts.push(String(m));return window.__toast0.apply(this,arguments);};});
  const toasted=re=>E(s=>window.__toasts.some(t=>new RegExp(s).test(t)),re.source);
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const purse=()=>E(()=>({c:state.mine.coins,g:state.gems}));
  const ml=()=>E(()=>JSON.parse(JSON.stringify(state.mail)));
  const shown=id=>E(i=>getComputedStyle(document.getElementById(i)).display!=="none",id);
  const DEF={day:"",read:[],bags:0};
  const wait=ms=>p.waitForTimeout(ms);
  const letter=()=>waitFor(p,()=>{const h=document.getElementById("vmQ");return !!h&&!!h.dataset.ans&&Mail._q()&&!Mail._q().paid&&Mail._q();},{timeout:4000});
  const wrong=()=>E(()=>{const h=document.getElementById("vmQ"),a=h.dataset.ans,b=[...h.querySelectorAll("[data-w]")].find(x=>x.dataset.w!==a);b.click();return b.dataset.w;});
  const letters=n=>waitFor(p,n=>!!state.mail&&state.mail.read.length===n,{arg:n,timeout:4000});
  const card=()=>E(()=>{const c=document.querySelector('#clGrid .clcard[data-look="valentine"]');return c&&{locked:c.classList.contains("locked"),worn:c.classList.contains("worn"),
    text:c.querySelector(".cost").textContent.trim(),when:(c.querySelector(".clwhen")||{}).textContent||"",got:[...c.querySelectorAll(".clpc.got")].map(x=>x.dataset.piece)};});
  const closet=async()=>{await p.click("#closetBtn");await waitFor(p,()=>Modes.top()==="closet");const c=await card();await p.click("#clClose");await waitFor(p,()=>Modes.top()==="valley");return c;};
  await listen();await tidy();

  // ---- 1. the window: 1 to 14 February, both counted ----
  const w=await E(()=>["2027-01-31","2027-02-01","2027-02-14","2027-02-15"].map(d=>[Mail.inWindow(d),Looks.inWindow("valentine",d)]));
  ok(J(w)===J([[false,false],[true,true],[true,true],[false,false]]),"31 Jan no, 1 Feb yes, 14 Feb yes, 15 Feb no; the look's window agrees "+J(w));
  ok(await E(()=>Mail.inWindow(new Date(2027,1,14,23,59))&&!Mail.inWindow(new Date(2027,1,15,0,1))&&Mail.inWindow("2030-02-07")&&!Mail.inWindow("2026-03-01")
    &&!Mail.inWindow("soon")&&!Mail.inWindow(new Date(NaN))),"...for a Date too, in any year; anything else is outside");
  ok(await E(()=>Mail.live()===Mail.inWindow(today())),"with no test date it goes by today's date");

  // ---- 2. outside the window: nothing shows and nothing is written ----
  await E(()=>Mail._setToday("2027-01-31"));
  ok(!(await shown("mailBtn")),"outside the window: no 💌 button");
  ok(await E(()=>Mail.open())===false&&!(await E(()=>!!document.querySelector("#ovMail.on"))),"...and the mailbag does not open");
  ok(J(await ml())===J(DEF),"outside the window: the save field stays at its default "+J(await ml()));
  let cc=await closet();
  ok(cc&&cc.locked&&cc.text==="Earn it at Valentine's Day 💌"&&cc.when==="in February","the Closet lists the Valentine's look, greyed: \"Earn it at Valentine's Day 💌\", in February "+J(cc));

  // ---- 3. in the window: the button, and a letter from one of his animals ----
  await E(()=>Mail._setToday("2027-02-03"));
  ok(await shown("mailBtn")&&await E(()=>document.getElementById("mailBadge").textContent==="8"&&document.getElementById("mailBadge").classList.contains("on")),
    "in the window: the 💌 button shows, with 8 on its badge");
  ok(J(await ml())===J(DEF),"...and showing it writes nothing");
  await listen();
  await p.click("#mailBtn");
  ok(await waitFor(p,()=>Modes.top()==="mail"),"💌 opens Word mail (mode mail)");
  let q=await letter();
  const t0=await E(()=>({slots:document.querySelectorAll("#vmBag .vmslot").length,on:document.querySelectorAll("#vmBag .vmslot.on").length,bag:!!document.querySelector("#vmBag .vmbagart svg"),
    stat:document.getElementById("vmStat").textContent,env:!!document.querySelector("#vmWork .nenv"),paper:!!document.querySelector("#vmWork .npaper"),
    stamp:!!document.querySelector("#vmWork .vmstamp svg"),from:document.querySelector("#vmWork .vmfrom b").textContent,sig:document.querySelector("#vmWork .nsig").textContent,
    text:[...document.querySelectorAll("#vmWork .vmpaper .btext")].map(b=>b.textContent.replace(/\s+/g," ").trim()).join(" "),bw:document.querySelectorAll("#vmWork .vmpaper .bw").length,
    opts:[...document.querySelectorAll("#vmQ .wwopt[data-w]")].map(b=>b.dataset.w),ans:document.getElementById("vmQ").dataset.ans}));
  ok(t0.slots===8&&t0.on===0&&t0.bag&&/0 of 8/.test(t0.stat),"an empty mailbag: eight slots, none filled "+J({slots:t0.slots,on:t0.on,stat:t0.stat}));
  ok(t0.env&&t0.paper&&t0.stamp&&MINE.indexOf(q.id)>=0&&t0.from==="From the "+q.id&&/💗/.test(t0.sig),"a letter in an envelope, from one of his animals, with its picture as the stamp: "+t0.from+" / "+t0.sig);
  ok(t0.text===q.text&&t0.bw>=5&&/\?$/.test(t0.text),"the letter: a line or two and a question, each word tappable: "+t0.text);
  ok(t0.opts.length===3&&new Set(t0.opts).size===3&&t0.opts.indexOf(t0.ans)>=0&&t0.ans===q.ans,"three words to answer with, dataset.ans on the host and data-w on each "+J(t0.opts)+" → "+t0.ans);
  ok(await E(x=>Decode.check(x,4).every(w=>w.ok),t0.text+" "+t0.opts.join(" ")),"every word of the letter and its answers decodes at his level (4)");
  await wait(450);
  let s=await said();
  ok(s.indexOf("You have mail! Read each letter, then pick the answer.")>=0&&!s.some(x=>x.indexOf(t0.text)>=0||x==="say:word:"+t0.ans||x===t0.ans),
    "it says what to do, and never reads the letter or the answer to him "+J(s));
  // a tap on a word of the letter says it, as in the books
  await listen();
  const tapped=await E(()=>{const b=[...document.querySelectorAll("#vmWork .vmpaper .bw")].find(x=>/[a-z]{3,}/i.test(x.textContent)&&!/^(the|you|what|your|from)$/i.test(x.textContent.replace(/[^a-z]/gi,"")));b.click();return b.textContent.replace(/[^A-Za-z]/g,"").toLowerCase();});
  ok(await waitFor(p,x=>window.__said.indexOf("say:word:"+x)>=0,{arg:tapped,timeout:4000}),"a tap on \""+tapped+"\" says it "+J(await said()));

  // ---- 4. misses take nothing; the second one makes the answer glow; the right answer pays once ----
  const before=await purse(),wr0=await E(()=>state.wordsRead),gw0=await E(()=>state.goal.words||0);
  await listen();
  await wrong();await wait(150);
  ok(J(await purse())===J(before)&&J(await ml())===J(DEF),"a miss takes nothing and writes nothing "+J(await purse()));
  ok(await E(a=>document.getElementById("vmMsg").textContent==="Not that one. Read the letter again!"&&document.getElementById("vmQ").dataset.ans===a&&!document.querySelector("#vmQ .hint"),t0.ans),
    "a miss: \"Not that one. Read the letter again!\", the same letter stays, nothing glows yet");
  await wait(750);
  ok((await said()).indexOf("Not that one. Read the letter again!")>=0,"...and it is said kindly");
  await wrong();await wait(150);
  ok(await E(a=>{const h=document.getElementById("vmQ"),r=h.querySelector('[data-w="'+a+'"]');return !!r&&r.classList.contains("hint")&&h.querySelectorAll(".hint").length===1;},t0.ans),
    "after the second miss the answer glows");
  ok(J(await purse())===J(before)&&J(await ml())===J(DEF)&&(await E(()=>Mail._q().miss))===2,"still nothing taken, nothing written");
  await listen();
  await answer(p,"#vmQ");
  ok(await letters(1),"he gets there: the letter goes into the bag");
  let a=await purse(),m=await ml();
  ok(a.c===before.c+2&&a.g===before.g,"a right answer pays 2 🪙 (after misses too); gems untouched "+J(a));
  ok(m.day==="2027-02-03"&&J(m.read)===J([q.id])&&m.bags===0,"state.mail: the bag's date and who sent the letter "+J(m));
  ok(await E(()=>state.wordsRead)===wr0+1&&await E(()=>state.goal.words)===gw0+1,"the letter counts as a word read and toward today's reading goal");
  ok(await toasted(/^\+2 🪙$/),"the usual coin toast: +2 🪙");
  ok(await waitFor(p,()=>document.querySelectorAll("#vmBag .vmslot.on").length===1&&/1 of 8/.test(document.getElementById("vmStat").textContent)
    &&document.getElementById("mailBadge").textContent==="7"),"the bag's first slot is sealed; the panel and the badge count: 1 of 8, 7 to go");
  s=await said();
  ok(s.indexOf("Into the mailbag!")>=0&&s.indexOf("say:word:"+t0.ans)>=0,"\"Into the mailbag!\", and the answer is said once he picked it "+J(s));

  // ---- 5. the next letter, and a double tap ----
  q=await letter();
  ok(q&&q.k===1&&q.miss===0&&MINE.indexOf(q.id)>=0,"the next letter comes by itself: "+J(q&&q.text));
  const c2=(await purse()).c;
  await E(()=>{const h=document.getElementById("vmQ"),b=h.querySelector('[data-w="'+h.dataset.ans+'"]');b.click();b.click();});
  await p.dblclick('#vmQ [data-w="'+q.ans+'"]').catch(()=>{});
  await wait(1300);
  m=await ml();
  ok((await purse()).c===c2+2&&m.read.length===2,"a double tap pays once, one letter "+J(m));

  // ---- 6. eight letters fill the bag: a new friend comes, and one look piece ----
  // wrap the real Look system's grant to count the calls (a top-level const can't be swapped from window)
  await E(()=>{window.__g=[];window.__og=Looks.grant;Looks.grant=(id,o)=>{window.__g.push(id);return window.__og(id,o);};});
  const c3=(await purse()).c,g3=(await purse()).g,had=await E(()=>state.critters.map(c=>c.id));
  const from=[];
  for(let i=0;i<6;i++){q=await letter();from.push(q.id);if(i===5)await listen();await answer(p,"#vmQ");await letters(3+i);}
  m=await ml();
  ok(m.read.length===8&&m.bags===1,"eight letters fill the bag: bags 1 "+J(m));
  ok(from.every(id=>MINE.indexOf(id)>=0)&&new Set(m.read).size===4,"every letter came from one of his four animals, all four wrote "+J(m.read));
  ok((await purse()).c===c3+12&&(await purse()).g===g3,"...2 🪙 a letter");
  const fr=await E(h=>{const id=Mail._friend(),c=CRIT(id);return{id,b:c&&c.b,biome:state.biome,now:state.critters.map(x=>x.id),dex:state.adv.dex[id]};},had);
  ok(fr.id&&had.indexOf(fr.id)<0&&fr.now.length===had.length+1&&fr.now.indexOf(fr.id)>=0&&fr.b<=fr.biome,
    "a new friend came to live in the valley: one of the animals of his lands he didn't have ("+fr.id+")");
  ok(fr.dex&&fr.dex.caught>=1&&fr.dex.seen===1,"...and it joins the Word-Dex as a friend "+J(fr.dex));
  ok(await waitFor(p,id=>{const f=document.querySelector("#vmWork .vmfriend");return !!f&&f.dataset.crit===id&&!!f.querySelector("svg")&&/The mailbag is full!/.test(document.getElementById("vmWork").textContent)
    &&/A new friend came to the valley/.test(document.getElementById("vmWork").textContent);},{arg:fr.id}),"the panel: The mailbag is full! and the new friend's picture");
  ok(await E(()=>document.querySelectorAll("#vmBag .vmslot.on").length===8&&!document.getElementById("vmQ")),"all eight slots sealed, no question left");
  ok((await said()).indexOf("The mailbag is full! A new friend came to the valley!")>=0,"...and it is said");
  ok(await waitFor(p,()=>JSON.stringify(window.__g)==='["valentine"]'),"Looks.grant(\"valentine\") is called once "+J(await E(()=>window.__g)));
  ok(await E(()=>JSON.stringify(Looks.pieces("valentine").earned)==='["hearts"]'&&state.look==="valentine"),"the look's first piece (the string of hearts) is earned, and the look goes on");
  ok(await toasted(/Happy Valentine's Day! The valley loves you\./),"the Look system says its greeting "+J(await E(()=>window.__toasts.slice(-3))));
  ok(/You got the string of hearts!/.test(await E(()=>document.getElementById("vmPiece").textContent)),"...and the panel names the piece");
  ok(!(await said()).some(x=>/string of hearts/.test(x)),"the piece is not said on top of the Look system's own line");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="hearts"] svg')&&document.body.classList.contains("look-valentine")),"the valley has the string of hearts, and the Valentine's look");
  ok(await E(()=>Mail.full&&Mail.left===0&&!document.getElementById("mailBadge").classList.contains("on")),"no letters left, and no badge");

  // ---- 7. one bag a day: a second visit shows it full and says so ----
  await p.click("#vmDone");
  ok(await waitFor(p,()=>Modes.top()==="valley"),"Done closes the mailbag");
  const c4=await purse(),crits4=await E(()=>state.critters.length);await listen();
  await p.click("#mailBtn");
  ok(await waitFor(p,()=>Modes.top()==="mail"),"💌 again the same day opens the mailbag");
  await wait(200);
  ok(await E(()=>document.querySelectorAll("#vmBag .vmslot.on").length===8&&!document.getElementById("vmQ")&&/Come back tomorrow/.test(document.getElementById("vmWork").textContent)),
    "...full, and no letter");
  ok((await said()).indexOf("The mailbag is full! Come back tomorrow.")>=0,"\"The mailbag is full! Come back tomorrow.\"");
  ok(J(await purse())===J(c4)&&(await ml()).bags===1&&await E(()=>window.__g.length===1)&&await E(()=>state.critters.length)===crits4,"...nothing more is paid, granted or given");
  await p.click("#vmDone");await wait(150);
  cc=await closet();
  ok(cc&&!cc.locked&&cc.worn&&cc.text==="1 of 4 pieces"&&J(cc.got)===J(["hearts"]),"the Closet: Valentine's Day worn, 1 of 4 pieces "+J(cc));

  // ---- 8. a new day: a new bag; with every animal of his lands it pays 10 💎 instead ----
  await E(()=>Mail._setToday("2027-02-04"));
  ok(await E(()=>Mail.left===8&&!Mail.full&&document.getElementById("mailBadge").textContent==="8"),"a new date: an empty mailbag again");
  m=await ml();ok(m.day==="2027-02-03"&&m.read.length===8,"...and the save changes only when a letter is answered");
  // he has every animal of his lands now (kept in, so the valley stays quiet)
  await E(()=>{const have=state.critters.map(c=>c.id);CRITTERS.filter(c=>c.b<=state.biome&&have.indexOf(c.id)<0).forEach((c,i)=>state.critters.push({id:c.id,seed:i,c:3+i%10,r:8,lv:1,out:false,since:9}));});
  const all=await E(()=>state.critters.length);
  await p.click("#mailBtn");
  q=await letter();await answer(p,"#vmQ");
  ok(await waitFor(p,()=>state.mail.day==="2027-02-04"&&state.mail.read.length===1),"a letter in the new day's bag");
  m=await ml();ok(m.bags===1&&m.read.length===1,"a new bag in the save "+J(m));
  const g8=(await purse()).g;
  for(let i=0;i<7;i++){q=await letter();if(i===6)await listen();await answer(p,"#vmQ");await letters(2+i);}
  m=await ml();
  ok(m.day==="2027-02-04"&&m.read.length===8&&m.bags===2,"a second full bag: bags 2 "+J(m));
  ok((await purse()).g===g8+10&&await E(()=>state.critters.length)===all&&await E(()=>Mail._friend())===null,"every animal of his lands is his: 10 💎 instead of a friend");
  ok(await waitFor(p,()=>/You have all the animals, so here are 10 gems!/.test(document.getElementById("vmWork").textContent)),"...and the panel says so");
  ok((await said()).indexOf("The mailbag is full! You have all the animals, so here are ten gems!")>=0,"...and it is said");
  ok(await waitFor(p,()=>JSON.stringify(Looks.pieces("valentine").earned)==='["hearts","mailbox"]'),"...and the second piece, the heart mailbox "+J(await E(()=>Looks.pieces("valentine").earned)));
  ok(await toasted(/You got the heart mailbox! Look in your closet/)&&(await said()).indexOf("You got the heart mailbox! Look in your closet.")>=0,"the Look system says \"You got the heart mailbox!\"");
  ok(/You got the heart mailbox!/.test(await E(()=>document.getElementById("vmPiece").textContent))&&await E(()=>window.__g.length===2),"...the panel repeats it, and grant was called once more");
  ok(await E(()=>!!document.querySelector('#tiles .lookprop[data-prop="mailbox"] svg')),"the mailbox is in the valley");
  await E(()=>{Looks.grant=window.__og;});
  await E(()=>Mail.close());
  // the day after has none of it
  await E(()=>Mail._setToday("2027-02-15"));
  ok(!(await shown("mailBtn"))&&await E(()=>Mail.open()===false),"15 February: no button, and the mailbag does not open");

  // ---- 9. the letters at every level ----
  const lv=await E(()=>{const out={bad:[],kinds:{},senders:true,inLetter:true};
    for(const d of ["2027-02-01","2027-02-06","2027-02-11"]){Mail._setToday(d);
      for(let t=1;t<=12;t++){state.settings.tierOverride=t;const k=out.kinds[t]=out.kinds[t]||{};
        for(let i=0;i<8;i++){const L=Mail.letter(i),txt=L.lines.concat(L.ask).join(" ");
          if(Decode.check(txt+" "+L.opts.join(" "),t).some(x=>!x.ok)||L.opts.length!==3||new Set(L.opts).size!==3||L.opts.indexOf(L.ans)<0)out.bad.push(t+": "+txt+" "+L.opts);
          if(!state.critters.some(c=>c.id===L.id))out.senders=false;
          if(L.kind!=="yesno"&&L.lines.join(" ").toLowerCase().indexOf(L.ans)<0)out.inLetter=false;
          k[L.kind]=(k[L.kind]||0)+1;}}}
    Mail._setToday(null);state.settings.tierOverride=4;return out;});
  ok(!lv.bad.length,"every letter at every level (1–12) decodes there, with three different answers and the right one among them "+J(lv.bad.slice(0,3)));
  ok(lv.senders&&lv.inLetter,"every letter is from one of his animals, and the answer to its question is in it");
  ok(Object.keys(lv.kinds[1]).length>=3&&!lv.kinds[1].gift&&!lv.kinds[1].yesno,"level 1: three kinds of letter (\"I am on a log.\", \"My hat is blue.\", \"I am your fox!\") "+J(lv.kinds[1]));
  ok(lv.kinds[3].can&&lv.kinds[3].food&&lv.kinds[3].gift&&!lv.kinds[3].yesno&&lv.kinds[8].yesno,"what he can do and eat from level 3, yes or no (with \"maybe\") from 8 "+J({3:lv.kinds[3],8:lv.kinds[8]}));

  // ---- 10. the mode, the save, an old save ----
  ok(await E(()=>{const m=Modes.list().mail;return !!m&&m.name==="Word mail"&&m.reading===true&&state.modeOpens[today()].mail>=1;}),
    "the mail mode is counted as reading in Where the time goes: "+await E(()=>JSON.stringify(state.modeOpens[today()])));
  await E(()=>saveNow());await wait(300);
  await reload(p);await listen();await tidy();
  m=await ml();ok(m.day==="2027-02-04"&&m.read.length===8&&m.bags===2,"state.mail is saved "+J(m));
  ok((await shown("mailBtn"))===(await E(()=>Mail.inWindow(today()))),"after a reload the test date is gone: the real date ("+await E(()=>today())+") decides");
  ok(await E(()=>JSON.stringify(Looks.pieces("valentine").earned)==='["hearts","mailbox"]'&&!!document.querySelector('#tiles .lookprop[data-prop="hearts"]')&&!!document.querySelector('#tiles .lookprop[data-prop="mailbox"]')),
    "the hearts and the mailbox are still up after a reload");
  await seed(p,Object.assign({},START,{mail:null}));await tidy();
  ok(J(await ml())===J(DEF),"a save with mail null gets the default");
  const V8=FX("v8-era.json");
  await seed(p,Object.assign({},V8,{guardians:[0,1,2,3,4,5,6].filter(b=>b<=V8.biome)}),{base:null});await listen();await tidy();
  ok(J(await ml())===J(DEF)&&await E(()=>state.look===""),"an old (v8) save loads, with the default mail field and no look");
  await E(()=>Mail._setToday("2027-02-10"));
  const c8=(await purse()).c;
  ok(await E(()=>Mail.open())===true,"...the mailbag opens on 10 February");
  q=await letter();
  ok(q&&await E(x=>Decode.check(x,currentTier()).every(c=>c.ok)&&state.critters.some(c=>c.id===Mail._q().id),q.text),"...with a letter from one of its animals he can read ("+q.text+", level "+await E(()=>currentTier())+")");
  await answer(p,"#vmQ");
  ok(await waitFor(p,()=>state.mail.read.length===1,{timeout:4000})&&(await purse()).c===c8+2,"...and a letter pays in the old save too");
  await E(()=>{Mail.close();Mail._setToday(null);});

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
