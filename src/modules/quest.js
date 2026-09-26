/* ================================================================
   SHARED READING CHALLENGES
   Small builders the new modes share: find the picture, find the word
   among look-alikes, match a sentence to its scene, and build a word
   from its sounds. Each calls done(ok) and records the answer.
   ================================================================ */
const Read=(()=>{
  const shuffle=a=>a.sort(()=>Math.random()-.5);
  const LOOK=[["hat","cap"],["cup","mug"],["rock","stone"],["log","wood","stick"],["pot","pan"],["bug","bee"],["boat","ship","sub"],["car","van","cab","jeep"],["puppy","dog"],["bunny","rabbit"],["mice","mouse"],["happy","face"],["sailboat","boat"],["lamb","sheep"]];
  const near=(a,b)=>LOOK.some(g=>g.includes(a)&&g.includes(b));
  function word(opt){
    const tier=currentTier();opt=opt||{};let w=null;
    if(!opt.noTarget&&Math.random()<.45){const tg=Skills.target(tier);if(tg&&WORD_ART[tg.w.w]&&!tg.w.tricky)w=tg.w;}
    if(!w){const pool=allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&x.t<=tier&&x.t>=Math.max(1,tier-(opt.spread||2))&&(!opt.max||x.p.length<=opt.max));
      w=pool[Math.floor(Math.random()*pool.length)]||allWords().find(x=>WORD_ART[x.w]);}
    return w;
  }
  function others(w,n=2){
    return shuffle(allWords().filter(x=>!x.tricky&&WORD_ART[x.w]&&x.w!==w.w&&WORD_ART[x.w]!==WORD_ART[w.w]&&!near(x.w,w.w)))
      .reduce((a,x)=>{if(a.length<n&&!a.some(y=>near(x.w,y.w)||WORD_ART[x.w]===WORD_ART[y.w]))a.push(x);return a;},[]);
  }
  function rec(w,ok,o){try{Skills.result(w,{ok,...o});}catch(e){}}
  // read the word, tap its picture
  function pic(host,done,w){
    w=w||word();const t0=performance.now();let miss=0;
    host.innerHTML=`<p class="wp">Read the word. Tap its picture!</p><div class="wword">${w.w}</div>
      <div class="wopts">${shuffle([w,...others(w)]).map(o=>`<button class="wpic" data-w="${o.w}">${drawWord(o.w,"q")}</button>`).join("")}</div>`;
    const box=host.querySelector(".wopts");host.dataset.ans=w.w;
    if(Skills.slow){box.classList.add("locked-by-shield");soundShield(host,w,()=>box.classList.remove("locked-by-shield"));}
    box.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{
      const ok=b.dataset.w===w.w;rec(w,ok&&!miss,{help:miss>0,confused:ok?null:b.dataset.w,ms:performance.now()-t0});
      if(ok){b.classList.add("right");Sound.sfx.win();Sound.say("word:"+w.w,w.w,.9);setTimeout(()=>done(!miss),900);}
      else{miss++;b.classList.add("wrong");Sound.sfx.nope();setTimeout(()=>b.classList.remove("wrong"),500);
        if(miss>=2)box.querySelector(`[data-w="${w.w}"]`).classList.add("hint");}});
    return w;
  }
  // look at the picture, find its word among look-alikes
  function wordPick(host,done,w){
    w=w||word();const t0=performance.now();let miss=0;
    const opts=shuffle([w.w,...lookalikes(w).map(x=>x.w)]);
    host.innerHTML=`<p class="wp">Which word is this? Look closely!</p><div class="wbig">${drawWord(w.w,"q")}</div>
      <div class="wopts">${opts.map(o=>`<button class="wwopt" data-w="${o}">${o}</button>`).join("")}</div>`;
    host.dataset.ans=w.w;
    host.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{
      const ok=b.dataset.w===w.w;rec(w,ok&&!miss,{help:miss>0,confused:ok?null:b.dataset.w,ms:performance.now()-t0});
      if(ok){b.classList.add("right");Sound.sfx.win();Sound.say("word:"+w.w,w.w,.9);setTimeout(()=>done(!miss),900);}
      else{miss++;b.classList.add("wrong");Sound.sfx.nope();setTimeout(()=>b.classList.remove("wrong"),500);Sound.say("word:"+b.dataset.w,b.dataset.w,.9);}});
    return w;
  }
  // read a sentence, pick the matching scene
  function sentence(host,done,bg){
    const ps=PicSentence.make();if(!ps)return pic(host,done);let miss=0;
    host.innerHTML=`<p class="wp">Read it all, then find the picture!</p><div class="btext">${ps.text.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</div>
      <div class="psopts">${ps.opts.map((o,i)=>`<button class="psopt" data-i="${i}">${PicSentence.draw(o,bg||"meadow")}</button>`).join("")}</div>`;
    Books.wireWords(host.querySelector(".btext"));host.dataset.ans="#"+ps.opts.findIndex(x=>x.ok);
    host.querySelectorAll(".psopt").forEach(b=>b.onclick=()=>{
      const o=ps.opts[+b.dataset.i];state.comp=state.comp||{right:0,wrong:0};state.comp[o.ok?"right":"wrong"]++;
      if(o.ok){b.classList.add("right");Sound.sfx.win();Sound.say("sent:"+ps.text,ps.text,.9);setTimeout(()=>done(!miss),1100);}
      else{miss++;b.classList.add("wrong");Sound.sfx.nope();setTimeout(()=>b.classList.remove("wrong"),600);
        if(miss>=2)host.querySelector(`.psopt[data-i="${ps.opts.findIndex(x=>x.ok)}"]`).classList.add("hint");}});
    return ps;
  }
  // hear a word, build it from its sounds
  function build(host,done,w,prompt){
    w=w||word({max:5});const slots=w.p.map(()=>null);let miss=0;
    const mine=new Set(w.p.map(soundOf));
    const pool=allWords().flatMap(x=>x.p).filter(p=>!p.includes(":")&&!mine.has(soundOf(p))&&Phonics.known(p));
    const bank=shuffle([...w.p,pool[Math.floor(Math.random()*pool.length)]]);
    host.innerHTML=`<p class="wp">${prompt||"Listen, then tap the sounds in order."}</p>
      <div class="wslots">${w.p.map((_,i)=>`<div class="wslot${(w.syl||[]).includes(i)?" syl":""}"></div>`).join("")}</div>
      <div class="wbank">${bank.map((ph,i)=>`<button class="lt bank" data-i="${i}">${tileText(ph)}</button>`).join("")}</div>
      <div class="mrow" style="justify-content:center;margin-top:8px"><button class="btn soft qhear">👂 Hear it</button></div>`;
    host.dataset.ans=w.w;host.dataset.tiles=JSON.stringify(w.p);
    host.querySelector(".qhear").onclick=()=>Sound.say("word:"+w.w,w.w,.82);
    setTimeout(()=>Sound.say("word:"+w.w,w.w,.82),300);
    const sl=[...host.querySelectorAll(".wslot")];let lock=false;
    host.querySelectorAll(".wbank .lt").forEach(t=>t.onclick=()=>{
      if(lock||t.classList.contains("used"))return;const i=slots.indexOf(null);if(i<0)return;
      const ph=bank[+t.dataset.i];slots[i]={ph,t};t.classList.add("used");sl[i].textContent=tileText(ph);sl[i].classList.add("filled");Sound.say("sound:"+ph,ph);
      if(!slots.every(Boolean))return;
      if(slots.every((s,k)=>soundOf(s.ph)===soundOf(w.p[k])&&tileText(s.ph)===tileText(w.p[k]))){lock=true;sl.forEach(x=>x.classList.add("good"));rec(w,!miss,{help:miss>0});
        Sound.sfx.chime();setTimeout(()=>Sound.say("word:"+w.w,w.w,.82),250);setTimeout(()=>done(!miss),1100);}
      else{miss++;const wi=[],pl=[];slots.forEach((s,k)=>{if(s.ph!==w.p[k]){wi.push(k);pl.push(s.ph);}});rec(w,false,{wrongIdx:wi,placed:pl});Sound.sfx.nope();
        wi.forEach(k=>sl[k].classList.add("bad"));
        setTimeout(()=>{wi.forEach(k=>{slots[k].t.classList.remove("used");slots[k]=null;sl[k].textContent="";sl[k].classList.remove("bad","filled");});
          if(miss>=2&&!slots[0]){const f=[...host.querySelectorAll(".wbank .lt")].find(b=>!b.classList.contains("used")&&bank[+b.dataset.i]===w.p[0]);if(f)f.click();}
          Sound.say("word:"+w.w,w.w,.82);},800);}});
    return w;
  }
  return{word,others,pic,wordPick,sentence,build,shuffle};
})();

/* ================================================================
   VALLEY QUEST — "The Letter Thief"
   A story told one chapter a day. Gloom the ghost took the valley's
   magic letters. Each chapter is a reading job: unlock hidden letters,
   pick the right doors in the Reading Temple, break a spell by building
   words, and finally face Gloom — who turns out to be lonely, and stays
   as a friend. New chapters open the next day, which is the point:
   "what happens next?" is the best reason to come back.
   ================================================================ */
const Quest=(()=>{
  const Q=()=>state.quest||(state.quest={ch:0,day:null,active:null,done:false});
  const CH=[
    {title:"The Letter Thief",prize:"R",type:"letters",lock:"pic",
     story:["Oh no! A ghost named Gloom came in the night.","Gloom took the magic letters from the valley.","The signs are blank. The books are blank!","Can you get the letters back? Find them and read to unlock them."]},
    {title:"The Reading Temple",prize:"E",type:"temple",rooms:3,
     story:["Gloom hid a magic letter in the Reading Temple.","The temple has lots of doors, and only one is right.","Read the clue on the wall to pick the door."]},
    {title:"Gloom Comes Back",prize:"A",type:"letters",lock:"sent",
     story:["Gloom is back! Gloom hid three more letters.","This time the locks need a whole line.","Read every word, then pick the picture."]},
    {title:"Deep in the Temple",prize:"D",type:"temple",rooms:4,
     story:["The last letter is deep in the temple.","The doors are trickier now.","Slow down and read with care!"]},
    {title:"The Spell",prize:"🔑",type:"letters",lock:"build",
     story:["Gloom put a spell on three words.","Now nobody can say them!","Build each word from its sounds to break the spell."]},
    {title:"Gloom's Castle",prize:"👑",type:"boss",
     story:["You have R, E, A and D, and the key to Gloom's castle.","It is time to face Gloom.","Read your best. You can do it!"]}];
  const END=["Gloom was not a bad ghost. Gloom was a sad ghost.","Gloom took the letters because Gloom had no one to read with.","Now Gloom has a friend: you!","The letters spell READ. The valley is safe!"];
  const available=()=>{const q=Q();return !q.done&&q.ch<CH.length&&(q.active||q.day!==today());};
  // ---------- story pages ----------
  let ov=null;
  function sheet(html,cls){
    if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovQuest";document.body.appendChild(ov);}
    const again=ov.classList.contains("on");ov.innerHTML=`<div class="sheet qsheet ${cls||""}${again?" noanim":""}">${html}</div>`;ov.classList.add("on");return ov.querySelector(".sheet");
  }
  const close=()=>ov&&ov.classList.remove("on");
  function story(title,pages,after){
    let i=0;
    const show=()=>{
      const s=sheet(`<div class="qhead"><span class="qbook">📖</span><b>${title}</b><button class="bx" id="qX">✕</button></div>
        <div class="qart">${i===pages.length-1&&title.startsWith("The End")?drawThing("x_ghost",2)+`<div class="qread">READ</div>`:drawThing("x_ghost",2)}</div>
        <div class="btext">${pages[i].split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</div>
        <div class="mrow" style="justify-content:center"><button class="btn soft" id="qHear">🔊 Read it to me</button>
          <button class="btn primary big" id="qNext">${i<pages.length-1?"Next ▶":after?"Let's go! 🧭":"The end"}</button></div>
        <div class="qdots">${pages.map((_,k)=>`<i class="${k<=i?"on":""}"></i>`).join("")}</div>`);
      Books.wireWords(s.querySelector(".btext"));
      s.querySelector("#qX").onclick=close;
      s.querySelector("#qHear").onclick=()=>Sound.say("sent:"+pages[i],pages[i],.92);
      s.querySelector("#qNext").onclick=()=>{Sound.sfx.pop();if(++i<pages.length)show();else{close();after&&after();}};
    };show();
  }
  // ---------- chapter start ----------
  function start(){
    const q=Q(),c=CH[q.ch];if(!c)return;
    if(q.active){resume();return;}
    story(`Chapter ${q.ch+1}: ${c.title}`,c.story,()=>{
      q.active={type:c.type,found:[],spots:null};save();
      if(c.type==="temple")temple();else if(c.type==="boss")boss();else{placeLetters();Adv.redraw();toast("Find the glowing letters! ✨");}
    });
  }
  function resume(){const c=CH[Q().ch];if(c.type==="temple")temple();else if(c.type==="boss")boss();else toast("Find the glowing letters! ✨");}
  function placeLetters(){
    const q=Q();q.active.spots=[0,1,2].map(()=>Adv.freePos(3));save();
  }
  function finishChapter(){
    const q=Q(),c=CH[q.ch];q.active=null;q.ch++;q.day=today();q.letters=(q.letters||[]).concat(c.prize);
    const gems=10+q.ch*2;state.gems+=gems;save();renderHUD();Adv.redraw();try{Quests.hit("quest");}catch(e){}
    Sound.sfx.fanfare();confetti();
    const last=q.ch>=CH.length;
    const s=sheet(`<div class="qwin"><div class="qprize">${c.prize}</div><h2>${last?"You saved the valley!":"Chapter "+q.ch+" done!"}</h2>
      <div class="qletters">${["R","E","A","D","🔑","👑"].map((l,i)=>`<span class="${i<q.ch?"got":""}">${l}</span>`).join("")}</div>
      <p class="mpaid">+${gems} 💎</p><p class="sub">${last?"":"The next chapter opens tomorrow. What will Gloom do next? 👻"}</p>
      <div class="mrow" style="justify-content:center"><button class="btn primary big" id="qOk">${last?"The end ▶":"Hooray!"}</button></div></div>`,"win");
    s.querySelector("#qOk").onclick=()=>{close();if(last){q.done=true;save();story("The End",END,null);Adv.redraw();}};
  }
  // ---------- letter locks in Adventure ----------
  Adv.provide(()=>{
    const q=Q(),out=[];
    if(!q.active&&available()){const c=CH[q.ch];if(q.giver==null||q.giverDay!==today()){const p=Adv.freePos(2);q.giver=p;q.giverDay=today();save();}
      out.push({c:q.giver.c,r:q.giver.r,size:.7,cls:"qgiver",html:`<div class="qg">${drawThing("x_ghost",2)}<b>❗</b></div>`,
        label:`❗ Chapter ${q.ch+1}`,act:()=>start()});}
    if(q.active&&q.active.spots)q.active.spots.forEach((p,i)=>{if(q.active.found.includes(i))return;
      out.push({c:p.c,r:p.r,size:.5,cls:"qletter",html:`<div class="qlt">${CH[q.ch].prize==="🔑"?"🔒":"?"}</div>`,label:"✨ Unlock it",act:()=>lock(i)});});
    if(q.done)out.push({c:COLS-3,r:ROWS_MAX-1.5,size:.6,cls:"qgiver",html:`<div class="qg friend">${drawThing("x_ghost",2)}</div>`,label:"👻 Gloom",act:()=>joke()});
    return out;
  });
  function lock(i){
    const q=Q(),c=CH[q.ch];
    const s=sheet(`<div class="qhead"><span class="qbook">🔒</span><b>${c.lock==="build"?"Break the spell!":"A magic lock"}</b><button class="bx" id="qX">✕</button></div><div class="qbody"></div>`);
    s.querySelector("#qX").onclick=close;const host=s.querySelector(".qbody");
    const done=()=>{q.active.found.push(i);state.wordsRead+=c.lock==="sent"?5:1;save();Adv.redraw();
      const left=3-q.active.found.length;
      host.innerHTML=`<div class="qgot"><div class="qprize small">${c.prize==="🔑"?"✨":c.prize}</div><h2>${left?"Got one!":"That's all three!"}</h2>
        <p class="sub">${left?`${left} more to find.`:""}</p><button class="btn primary big" id="qOk">OK</button></div>`;
      Sound.sfx.chime();host.querySelector("#qOk").onclick=()=>{close();if(!left)finishChapter();};};
    if(c.lock==="sent")Read.sentence(host,done);else if(c.lock==="build")Read.build(host,done,null,"Gloom's spell hid this word. Listen, then build it!");else Read.pic(host,done);
  }
  // ---------- the Reading Temple ----------
  function temple(){
    const q=Q(),c=CH[q.ch];let room=0;
    const next=()=>{
      if(room>=c.rooms){treasure();return;}
      const kind=[["picword","wordpic","sent"],["wordpic","sent","picword","sent"]][q.ch>2?1:0][room%(q.ch>2?4:3)];
      const tier=currentTier(),useSent=kind==="sent"&&tier>=2;
      let clue,doors,right;
      if(useSent){const ps=PicSentence.make();clue=`The key is behind the door that shows: <b>${ps.text}</b>`;doors=ps.opts.map((o,k)=>({k,html:PicSentence.draw(o,"cave"),ok:!!o.ok}));}
      else if(kind==="wordpic"||kind==="sent"){const w=Read.word();clue=`Go in the door with the <b class="qw">${w.w}</b>.`;
        doors=Read.shuffle([w,...Read.others(w)]).map((o,k)=>({k,html:drawWord(o.w,"door"),ok:o.w===w.w,w:o.w}));right=w;}
      else{const w=Read.word();clue=`The key word is the name of this: <span class="qpic">${drawWord(w.w,"clue")}</span>`;
        doors=Read.shuffle([w.w,...lookalikes(w).map(x=>x.w)]).map((o,k)=>({k,html:`<b class="dword">${o}</b>`,ok:o===w.w,w:o}));right=w;}
      const s=sheet(`<div class="qhead"><span class="qbook">🏛️</span><b>Reading Temple · room ${room+1} of ${c.rooms}</b><button class="bx" id="qX">✕</button></div>
        <div class="tclue">${clue}</div><div class="tdoors">${doors.map(d=>`<button class="tdoor" data-k="${d.k}" data-ok="${d.ok?1:0}"><div class="tsign">${d.html}</div><div class="tarch"></div></button>`).join("")}</div>`,"temple");
      s.querySelector("#qX").onclick=close;const t0=performance.now();let miss=0;
      const tc=s.querySelector(".tclue");if(tc.querySelector("b")&&useSent){const bb=tc.querySelector("b");bb.innerHTML=bb.textContent.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ");Books.wireWords(bb);}
      s.querySelectorAll(".tdoor").forEach(b=>b.onclick=()=>{
        const d=doors[+b.dataset.k];
        if(right)try{Skills.result(right,{ok:d.ok&&!miss,help:miss>0,confused:d.ok?null:d.w,ms:performance.now()-t0});}catch(e){}
        if(useSent){state.comp=state.comp||{right:0,wrong:0};state.comp[d.ok?"right":"wrong"]++;}
        if(d.ok){b.classList.add("open");Sound.sfx.win();state.wordsRead+=useSent?5:1;setTimeout(()=>{room++;next();},1000);}
        else{miss++;b.classList.add("puff");Sound.sfx.nope();setTimeout(()=>b.classList.remove("puff"),900);
          toast(["Creak! Just dust. Read the clue again!","A bat flew out! Not this one.","Locked! Try another door."][miss%3]);
          if(miss>=2)s.querySelector(`.tdoor[data-k="${doors.find(x=>x.ok).k}"]`).classList.add("hint");}});
    };
    const treasure=()=>{const s=sheet(`<div class="qwin"><div class="qchest">🧰</div><h2>The temple chest!</h2><button class="btn primary big" id="qOpen">Open it!</button></div>`,"temple");
      s.querySelector("#qOpen").onclick=()=>finishChapter();};
    next();
  }
  // ---------- Gloom ----------
  function boss(){
    const B={hp:6,max:6,hearts:3,round:0};let src=null;try{src=Mine.avatar();}catch(e){}
    const s=sheet(`<div class="wscene ghostscene"><div class="wash">${src?`<img src="${src}">`:""}</div><div class="wberry">✨</div>
        <div class="wcrit gloom"><div class="wbody">${drawThing("x_ghost",2)}</div></div></div>
      <div class="whead"><b id="gT">Gloom the ghost</b><span class="whearts" id="gHp"></span></div><div id="gQ"></div>
      <div class="wfoot"><span id="gMe"></span></div>`,"wild");
    const hp=()=>{s.querySelector("#gHp").textContent="🖤".repeat(B.hp)+"🤍".repeat(B.max-B.hp);s.querySelector("#gMe").textContent="You: "+"❤️".repeat(B.hearts)+"🤍".repeat(3-B.hearts);};hp();
    Sound.say("sent:Boo! You can't read my spells!","Boo! You can't read my spells!",.95);
    const round=()=>{
      B.round++;const host=s.querySelector("#gQ"),kinds=["pic","word","sent","build"],k=kinds[(B.round-1)%4];
      const cb=ok=>{
        if(ok){B.hp--;const be=s.querySelector(".wberry");be.classList.remove("toss");void be.offsetWidth;be.classList.add("toss");
          const g=s.querySelector(".gloom");g.classList.remove("nope");void g.offsetWidth;g.classList.add("nope");}
        else{B.hearts--;}
        hp();
        if(B.hp<=0){win();return;}
        if(B.hearts<=0){lose();return;}
        setTimeout(round,300);};
      // a slip costs a heart only when it is a real mistake: the challenge reports ok=false after a wrong try
      if(k==="pic")Read.pic(host,cb);else if(k==="word")Read.wordPick(host,cb);else if(k==="sent"&&currentTier()>=2)Read.sentence(host,cb,"night");else Read.build(host,cb,Read.word({max:5}),"Gloom's spell word! Build it to zap Gloom.");
    };
    const win=()=>{Sound.sfx.fanfare();s.querySelector(".gloom").classList.add("happy");
      s.querySelector("#gQ").innerHTML=`<div class="wdone"><h2>Gloom stops. Gloom… smiles?</h2><button class="btn primary big" id="gOk">What happens? ▶</button></div>`;
      s.querySelector("#gOk").onclick=()=>finishChapter();};
    const lose=()=>{s.querySelector("#gQ").innerHTML=`<div class="wdone"><h2>Gloom giggles and floats away!</h2><p class="sub">No problem — Gloom is still in the castle. Slow down, sound out every word, and try again.</p>
      <button class="btn primary big" id="gOk">Try again</button> <button class="btn soft" id="gLater">Later</button></div>`;
      s.querySelector("#gOk").onclick=()=>boss();s.querySelector("#gLater").onclick=close;};
    setTimeout(round,1200);
  }
  const JOKES=["Why did the ghost read a book? It was a boo-k!","What do ghosts eat? Boo-berries!","Gloom says: thank you for being my pal!","Gloom says: let's read a book!"];
  function joke(){const j=JOKES[Math.floor(Math.random()*JOKES.length)];toast("👻 "+j);Sound.say("sent:"+j,j,.95);}
  return{start,available,CH,END,JOKES,_Q:Q,_close:close,_finish:finishChapter};
})();
