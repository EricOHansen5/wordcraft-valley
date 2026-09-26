/* ================================================================
   STORYBOOKS — decodable books starring Ash (and his pet)
   Every word in a book uses only sounds taught by that book's level
   (checked when the books are written). On each page he reads the
   sentence, taps any word to hear it sounded out, and can read it aloud
   to his pet — the game records him and plays it back, so the book
   becomes his own audiobook. Questions at the end check understanding.
   ================================================================ */
const Books=(()=>{
  const L=()=>state.library||(state.library={});
  let ov=null,book=null,page=0,helps=0,recs=0,quizFirst=0,quizIdx=0,reading=false;
  function petId(){try{return state.mine&&state.mine.pet&&CRIT(state.mine.pet)?state.mine.pet:null;}catch(e){return null;}}
  function petWord(t){const id=petId();const w=id&&allWords().find(x=>x.w===id&&!x.tricky);return w&&w.t<=t?id:"dog";}
  const fill=(s,t)=>s.replace(/\{pet\}/g,petWord(t));
  function avatar(){try{return Mine.avatar();}catch(e){return null;}}
  // one picture in a scene
  function art(a,t){
    if(a==="ash"){const src=avatar();return src?`<img src="${src}" alt="Ash">`:drawThing("fox",1);}
    if(a==="pet")a=petWord(t);
    if(a==="mud")return`<svg viewBox="0 0 100 40"><ellipse cx="50" cy="26" rx="48" ry="13" fill="#7A5230"/><ellipse cx="40" cy="22" rx="16" ry="4" fill="#9C6B3C"/></svg>`;
    if(WORD_ART[a]&&ART[WORD_ART[a]])return drawWord(a,"book");
    if(ART[a])return drawThing(a,4);
    return drawWord(a,"book");
  }
  const BG={meadow:["#BFE0F0","#F4EFDC","#8FBE6E"],farm:["#CFE6F2","#F6EBD2","#A9C46A"],pond:["#AED9E8","#EEF3E0","#6FAC72"],
    town:["#C8DDF0","#F2ECDD","#B9B2A4"],shop:["#F6E1C0","#F9EEDB","#C9A47A"],sea:["#9FD8F0","#FBF1D6","#4FA8D8"],
    cave:["#2A2238","#3B2F4E","#5A4A3A"],night:["#1E2450","#3B3F7A","#2E4A6A"],rain:["#9AA8B8","#C8D0D8","#7FA07A"]};
  function scene(bg,items,t,extra){
    const c=BG[bg]||BG.meadow;
    return`<div class="bscene bg-${bg}" style="background:linear-gradient(180deg,${c[0]},${c[1]} 68%,${c[2]} 68%)">
      ${bg==="night"?`<div class="stars">✦ · ✧ · ✦ · ✧</div>`:""}${bg==="rain"?`<div class="raindrops"></div>`:""}
      ${items.map(([a,x,s,lift])=>`<div class="sitem${a==="ash"?" ash":""}" style="left:${x}%;bottom:${22+(lift||0)}%;width:${(s||1)*26}%">${art(a,t)}</div>`).join("")}
      ${extra||""}</div>`;
  }
  const unlocked=b=>b.t<=Math.max(1,currentTier());
  const nextNew=()=>BOOKS.find(b=>unlocked(b)&&!(L()[b.id]&&L()[b.id].done));
  function build(){
    if(ov)return;ov=document.createElement("div");ov.id="ovStory";ov.className="overlay sbook";document.body.appendChild(ov);
  }
  function close(){ov.classList.remove("on");stopAudio();try{booksBadge();}catch(e){}}
  // ---------- shelf ----------
  function shelf(){
    build();stopAudio();
    const L0=L(),cards=BOOKS.map(b=>{const p=L0[b.id]||{},lock=!unlocked(b);
      return`<button class="bcov${lock?" locked":""}${p.done?" done":""}" data-id="${b.id}" ${lock?"disabled":""}>
        <div class="bart">${lock?"🔒":art(b.cover,b.t)}</div><b>${b.title}</b>
        <span>${lock?`Level ${b.t}`:p.done?"⭐".repeat(p.stars||1)+"☆".repeat(3-(p.stars||1)):"NEW!"}</span>
        ${p.rec?`<i class="audio">🎧</i>`:""}</button>`;}).join("");
    ov.innerHTML=`<div class="bpage"><div class="bhead"><h2>📚 My books</h2><button class="bx" id="bClose">✕</button></div>
      <p class="sub">Read a book to earn stars. Read it to your pet and it becomes your own audiobook! 🎧</p>
      <div class="bshelf">${cards}</div></div>`;
    ov.classList.add("on");
    ov.querySelector("#bClose").onclick=close;
    ov.querySelectorAll(".bcov:not(.locked)").forEach(c=>c.onclick=()=>openBook(c.dataset.id));
  }
  // ---------- reading ----------
  function openBook(id){
    book=BOOKS.find(b=>b.id===id);page=0;helps=0;recs=0;quizFirst=0;quizIdx=0;build();
    const p=L()[book.id]||{};
    ov.innerHTML=`<div class="bpage cover"><div class="bhead"><button class="bx" id="bBack">‹ Books</button><button class="bx" id="bClose">✕</button></div>
      <div class="bcoverart">${scene(book.bg,[["ash",30,1.1],[book.cover,66,1.1]],book.t)}</div>
      <h1 class="btitle">${book.title.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</h1>
      <div class="mrow"><button class="btn primary big" id="bStart">Read it! 📖</button>
      ${p.rec?`<button class="btn soft big" id="bListen">🎧 Listen to me read it</button>`:""}</div></div>`;
    ov.classList.add("on");
    wireWords(ov.querySelector(".btitle"));
    ov.querySelector("#bBack").onclick=shelf;ov.querySelector("#bClose").onclick=close;
    ov.querySelector("#bStart").onclick=()=>showPage();
    const li=ov.querySelector("#bListen");if(li)li.onclick=()=>audiobook(0);
    Sound.sfx.chime();
  }
  // tap a word: hear it sounded out, then the whole word
  function wireWords(el){
    el.querySelectorAll(".bw").forEach(sp=>sp.onclick=async()=>{
      if(sp.classList.contains("on"))return;sp.classList.add("on");helps++;
      const w=sp.textContent.replace(/[^A-Za-z']/g,"").toLowerCase();if(!w){sp.classList.remove("on");return;}
      const known=allWords().find(x=>x.w===w);
      if(!(known&&known.tricky)&&w.length>1){let ph;try{ph=known?known.p:splitPhonemes(w);}catch(e){ph=null;}
        if(ph)for(const x of ph){if(soundOf(x)==="")continue;await Sound.say("sound:"+x,x);await new Promise(r=>setTimeout(r,70));}}
      await Sound.say("word:"+w,w,.85);sp.classList.remove("on");
    });
  }
  function showPage(){
    stopAudio();const [text,items]=book.pages[page],t=book.t,words=fill(text,t);
    const pet=petWord(t),minMs=Math.max(1200,words.split(" ").length*380);
    ov.innerHTML=`<div class="bpage"><div class="bhead"><button class="bx" id="bClose">✕</button><div class="bdots">${book.pages.map((_,i)=>`<i class="${i<page?"d":i===page?"c":""}"></i>`).join("")}</div></div>
      ${scene(book.bg,items,t)}
      <div class="btext">${words.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</div>
      <div class="mrow bctl">
        ${Rec.ok()?`<button class="btn big rec" id="bRec">🎤 Read it to the ${pet}</button>`:""}
        <button class="btn primary big" id="bRead" disabled><span class="fill"></span><span class="lab">✓ I read it</span></button>
      </div>
      <div class="mrow bafter" style="display:none"><button class="btn soft" id="bHear">🔊 Hear it</button><button class="btn primary big" id="bNext">${page<book.pages.length-1?"Next page ▶":"Questions ▶"}</button></div>
      <div class="blisten">${art(pet,t)}</div></div>`;
    wireWords(ov.querySelector(".btext"));
    ov.querySelector("#bClose").onclick=close;
    // "I read it" unlocks after enough time to actually read the page
    const rb=ov.querySelector("#bRead"),fillEl=rb.querySelector(".fill");
    fillEl.style.transition=`width ${minMs}ms linear`;requestAnimationFrame(()=>requestAnimationFrame(()=>fillEl.style.width="100%"));
    setTimeout(()=>{rb.disabled=false;},minMs);
    const done=()=>{ov.querySelector(".bctl").style.display="none";ov.querySelector(".bafter").style.display="";};
    rb.onclick=()=>{Sound.sfx.pop();done();};
    const rec=ov.querySelector("#bRec");
    if(rec)rec.onclick=async()=>{
      if(rec.classList.contains("on")){rec.disabled=true;const blob=await Rec.stop();rec.classList.remove("on");
        if(blob&&blob.size>800){await DB.set("blobs",`story:${book.id}:${page}`,blob);recs++;
          const pl=ov.querySelector(".blisten");pl.classList.add("hear");rec.textContent="🎧 Listening…";
          await playBlob(blob);pl.classList.remove("hear");pl.classList.add("love");Sound.sfx.chime();
          setTimeout(()=>pl.classList.remove("love"),1400);}
        done();return;}
      const okMic=await Rec.start();if(!okMic){toast("The microphone is off — tap ✓ I read it");rec.remove();return;}
      rec.classList.add("on");rec.textContent="⏹ Done reading";ov.querySelector(".blisten").classList.add("ears");
      setTimeout(()=>{if(rec.classList.contains("on"))rec.click();},15000);
    };
    ov.querySelector("#bHear").onclick=()=>Sound.say("sent:"+words,words,.9);
    ov.querySelector("#bNext").onclick=()=>{page++;if(page<book.pages.length)showPage();else quiz();};
  }
  // ---------- questions ----------
  function quiz(){
    const q=book.quiz[quizIdx];if(!q){finish();return;}
    const t=book.t,text=fill(q.q,t);let tries=0;
    const opts=q.pics?q.pics.map(p=>({v:p,h:`<div class="qart">${art(p,t)}</div>`})).sort(()=>Math.random()-.5)
      :q.words?q.words.map(w=>({v:w,h:`<b class="qword">${w}</b>`})).sort(()=>Math.random()-.5)
      :[{v:"yes",h:`<b class="qword">👍 yes</b>`},{v:"no",h:`<b class="qword">👎 no</b>`}];
    const ans=q.pics||q.words?q.a:(q.yes?"yes":"no");
    ov.innerHTML=`<div class="bpage"><div class="bhead"><button class="bx" id="bClose">✕</button><div class="bdots">🧠 Question ${quizIdx+1} of ${book.quiz.length}</div></div>
      <div class="bq">${text}</div><div class="bopts">${opts.map(o=>`<button class="bopt" data-v="${o.v}">${o.h}</button>`).join("")}</div></div>`;
    ov.querySelector("#bClose").onclick=close;
    setTimeout(()=>Sound.say("sent:"+text,text,.9),250);
    ov.querySelectorAll(".bopt").forEach(b=>b.onclick=()=>{
      tries++;
      if(b.dataset.v===ans){b.classList.add("right");Sound.sfx.win();if(tries===1)quizFirst++;
        state.comp=state.comp||{right:0,wrong:0};state.comp.right++;save();
        setTimeout(()=>{quizIdx++;quiz();},900);}
      else{b.classList.add("wrong");Sound.sfx.nope();state.comp=state.comp||{right:0,wrong:0};state.comp.wrong++;
        if(tries>=2){const r=ov.querySelector(`.bopt[data-v="${ans}"]`);if(r)r.classList.add("hint");}
        setTimeout(()=>b.classList.remove("wrong"),600);}
    });
  }
  function finish(){
    const p=L()[book.id]||(L()[book.id]={}),first=!p.done;
    const stars=1+(quizFirst===book.quiz.length?1:0)+((Rec.ok()?recs>=book.pages.length:helps<=1)?1:0);
    p.done=true;p.stars=Math.max(p.stars||0,stars);p.reads=(p.reads||0)+1;p.last=Date.now();if(recs)p.rec=true;
    const gems=first?6+stars*2:2,coins=first?15*book.t:0;
    state.gems+=gems;if(coins&&state.mine)state.mine.coins+=coins;state.wordsRead+=book.pages.length;
    try{Quests.hit("read",book.pages.length);Quests.hit("book");}catch(e){}
    save();try{renderHUD();}catch(e){}
    Sound.sfx.fanfare();try{confetti();}catch(e){}
    const next=nextNew();
    ov.innerHTML=`<div class="bpage end"><h2>The end! 🎉</h2><div class="bstars">${"⭐".repeat(stars)}${"☆".repeat(3-stars)}</div>
      <ul class="bwhy"><li>⭐ You read the whole book</li><li>${quizFirst===book.quiz.length?"⭐":"☆"} Every question right the first time</li>
      <li>${(Rec.ok()?recs>=book.pages.length:helps<=1)?"⭐":"☆"} ${Rec.ok()?"You read every page to your pet":"You read it with almost no help"}</li></ul>
      <p class="mpaid">+${gems} 💎${coins?` &nbsp; +${coins} 🪙`:""}</p>
      <div class="mrow">${recs?`<button class="btn soft big" id="bListen">🎧 Listen to me read</button>`:""}
      ${next&&next.id!==book.id?`<button class="btn soft big" id="bNextBook">Next book: ${next.title} ▶</button>`:""}
      <button class="btn primary big" id="bShelf">📚 My books</button></div></div>`;
    ov.querySelector("#bShelf").onclick=shelf;
    const nb=ov.querySelector("#bNextBook");if(nb)nb.onclick=()=>openBook(next.id);
    const li=ov.querySelector("#bListen");if(li)li.onclick=()=>audiobook(0);
    setTimeout(()=>Sound.speak(`The end! You earned ${stars} star${stars>1?"s":""}!`,.95),600);
  }
  // ---------- his audiobook ----------
  let audio=null,stopped=false,audioRes=null;
  function stopAudio(){stopped=true;if(audio){try{audio.pause();}catch(e){}audio=null;}if(audioRes){const r=audioRes;audioRes=null;r();}}
  function playBlob(blob){return new Promise(res=>{audioRes=res;const done=()=>{if(audioRes===res)audioRes=null;res();};
    try{const u=URL.createObjectURL(blob),a=new Audio(u);audio=a;a.onended=()=>{URL.revokeObjectURL(u);done();};a.onerror=done;a.play().catch(done);}catch(e){done();}});}
  async function audiobook(i){
    stopped=false;
    for(let k=i;k<book.pages.length&&!stopped;k++){
      const [text,items]=book.pages[k],words=fill(text,book.t);
      ov.innerHTML=`<div class="bpage"><div class="bhead"><button class="bx" id="bStop">⏹ Stop</button><div class="bdots">🎧 ${book.title}</div></div>
        ${scene(book.bg,items,book.t)}<div class="btext">${words}</div></div>`;
      ov.querySelector("#bStop").onclick=()=>{stopAudio();openBook(book.id);};
      const b=await DB.get("blobs",`story:${book.id}:${k}`);
      if(b)await playBlob(b);else await Sound.say("sent:"+words,words,.9);
      await new Promise(r=>setTimeout(r,500));
    }
    if(!stopped)openBook(book.id);
  }
  return{playBlob,stopAudio,shelf,openBook,scene,art,nextNew,wireWords,close,petWord,count:()=>BOOKS.filter(b=>(L()[b.id]||{}).done).length,
    _state:()=>({book:book&&book.id,page,helps,recs,quizIdx})};
})();

/* microphone recording for Read-to-your-pet */
const Rec=(()=>{
  let mr=null,stream=null,chunks=[];
  const ok=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder);
  async function start(){
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true});mr=new MediaRecorder(stream);chunks=[];
      mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};mr.start();return true;}catch(e){return false;}
  }
  function stop(){return new Promise(res=>{if(!mr){res(null);return;}
    mr.onstop=()=>{try{stream.getTracks().forEach(t=>t.stop());}catch(e){}res(new Blob(chunks,{type:mr.mimeType||"audio/mp4"}));mr=null;};
    try{mr.stop();}catch(e){res(null);}});}
  return{ok,start,stop};
})();

/* ================================================================
   PICTURE IT — does he understand the sentence?
   "The cat is on the box." Three scenes; only one matches. The wrong
   ones swap who is where, or change on / in / by — so reading every
   word matters, not just spotting "cat".
   ================================================================ */
const PicSentence=(()=>{
  const ANIMALS=["cat","dog","fox","pig","hen","bug","duck","frog","crab","fish","bat"];
  const THINGS={box:{in:1},hat:{},log:{},rock:{},bed:{in:1},cup:{in:1},bus:{in:1},pot:{in:1},van:{in:1},tent:{in:1},truck:{in:1}};
  function make(tier){
    tier=tier||currentTier();
    const lv=w=>{const x=allWords().find(y=>y.w===w);return x?x.t:9;};
    const an=ANIMALS.filter(a=>lv(a)<=tier&&WORD_ART[a]),th=Object.keys(THINGS).filter(t=>lv(t)<=tier&&WORD_ART[t]);
    if(an.length<2||th.length<1)return null;
    const a=an[Math.floor(Math.random()*an.length)],b=th[Math.floor(Math.random()*th.length)];
    const rels=["on"].concat(THINGS[b].in?["in"]:[]).concat(tier>=3?["by"]:[]).concat(tier>=6?["under"]:[]);
    const rel=rels[Math.floor(Math.random()*rels.length)];
    const text=`The ${a} is ${rel} the ${b}.`;
    // wrong pictures: roles swapped, a different place word, or a different animal
    const other=an.filter(x=>x!==a)[Math.floor(Math.random()*(an.length-1))];
    const wrong=[];
    const altRel=["on","by","in","under"].filter(r=>r!==rel&&(r!=="in"||THINGS[b].in)&&(r!=="under"||tier>=4));
    wrong.push({a,b,rel:altRel[Math.floor(Math.random()*altRel.length)]});
    wrong.push(Math.random()<.5?{a:b,b:a,rel,swap:1}:{a:other,b,rel});
    const opts=[{a,b,rel,ok:1},...wrong].sort(()=>Math.random()-.5);
    return{text,opts,words:[a,rel,b]};
  }
  // drawn in a 4:3 scene: an item of size k stands about 35*k % of the height
  function draw(o,bg){
    const B=1.3,S=.85,it=[];
    if(o.rel==="on"){it.push([o.b,50,B]);it.push([o.a,50,S,26]);}
    else if(o.rel==="in"){it.push([o.a,50,S*.9,20]);it.push([o.b,50,B]);}   // peeking out over the edge
    else if(o.rel==="under"){it.push([o.b,50,B,27]);it.push([o.a,50,S]);}
    else{it.push([o.b,33,B]);it.push([o.a,72,S]);}
    return Books.scene(bg||"meadow",it,9);
  }
  return{make,draw,ANIMALS,THINGS};
})();
