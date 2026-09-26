/* ================================================================
   DECODE — which level a word needs
   The same rules the storybooks are checked with, so a grown-up's note
   can be checked the same way: a word is fine when it is in his word
   list at or below his level, or when it is built from sounds he has
   been taught (short vowels, digraphs, blends, silent e, bossy r, vowel
   teams, endings, soft c/g, compound words, silent letters).
   ================================================================ */
const Decode=(()=>{
  const EXTRA={and:1,has:2,ha:1,yes:2,full:3,with:3,him:2,them:3,then:3,this:3,its:2,into:3,by:3,oh:1,
    love:3,from:3,for:6,your:12,our:7,dad:1,mom:1,mum:2,ash:1,look:7,find:4,good:7,day:7,out:7,down:7,about:9,
    under:6,after:8,over:5,little:8,snack:4,treat:7,hug:2,hugs:2,kiss:2,xo:1};
  const DIG=["igh","sh","ch","th","wh","ck","ng","qu","ee","ea","ai","ay","oa","ow","oo","ou","ar","or","er","ir","ur","ll","ss","ff","zz","le"];
  const TEAM=new Set(["ee","ea","ai","ay","oa","ow","oo","ou","igh"]),RC=new Set(["ar","or","er","ir","ur"]),DG=new Set(["sh","ch","th","wh","ng","qu","ll","ss","ff","zz"]);
  const V="aeiou";
  let LIST=null;
  const list=()=>{if(!LIST){LIST={};allWords().forEach(w=>{LIST[w.w.toLowerCase()]=w.t;});}return LIST;};
  function tier(w){
    const lw=w.toLowerCase(),L=list();
    if(lw in EXTRA)return EXTRA[lw];
    if(lw in L)return L[lw];
    if(lw.includes("'"))return 12;
    if(/^(kn|wr|ph)/.test(lw))return Math.max(12,lw.length>3?tier(lw.slice(2)):12);
    if(lw.length>=6)for(let k=3;k<lw.length-2;k++){const a=lw.slice(0,k),b=lw.slice(k);if(a in L&&b in L)return Math.max(11,L[a],L[b]);}
    for(const suf of["ing","ed"])if(lw.endsWith(suf)&&lw.length>suf.length+2){
      const st=lw.slice(0,-suf.length);
      for(const c of [st,st+"e",st.length>2&&st.slice(-1)===st.slice(-2,-1)?st.slice(0,-1):null])if(c&&(c in L||c.length>=3))return Math.max(9,tier(c));}
    for(const suf of["s","es"])if(lw.endsWith(suf)&&lw.slice(0,-suf.length) in L)return L[lw.slice(0,-suf.length)];
    let base=lw;if(lw.endsWith("s")&&lw.length>3&&lw.slice(-2,-1)!=="s")base=lw.slice(0,-1);
    let t=1;const magic=base.length>=3&&base.slice(-1)==="e"&&!V.includes(base.slice(-2,-1))&&V.includes(base.slice(-3,-2));
    if(magic)t=Math.max(t,5);const b2=magic?base.slice(0,-1):base;
    if(/c[eiy]|ge$|gy/.test(b2))t=Math.max(t,10);
    if(b2.length>=2&&b2.endsWith("y")&&!V.includes(b2.slice(-2,-1)))t=Math.max(t,10);
    const g=[];for(let i=0;i<b2.length;){const m=DIG.find(d=>b2.startsWith(d,i)&&(d!=="le"||i+2===b2.length));if(m){g.push(m);i+=m.length;}else{g.push(b2[i]);i++;}}
    for(const x of g){if(TEAM.has(x))t=Math.max(t,7);else if(RC.has(x))t=Math.max(t,6);else if(DG.has(x))t=Math.max(t,3);
      else if(x==="le")t=Math.max(t,8);else if("ieu".includes(x))t=Math.max(t,2);else if(x==="y")t=Math.max(t,7);}
    const cons=x=>!V.includes(x)&&!TEAM.has(x)&&!RC.has(x)&&x!=="y";
    for(let i=0;i+1<g.length;i++)if(cons(g[i])&&cons(g[i+1]))t=Math.max(t,4);
    if(g.filter(x=>V.includes(x)||TEAM.has(x)||RC.has(x)||x==="y").length>=2)t=Math.max(t,8);
    // letters no rule covers (q without u, x in odd places) are fine; very long words are not
    if(lw.length>9)t=Math.max(t,12);
    return t;
  }
  const words=text=>(text.match(/[A-Za-z']+/g)||[]);
  // every word with the level it needs
  function check(text,lvl){lvl=lvl||currentTier();return words(text).map(w=>({w,t:tier(w),ok:tier(w)<=lvl}));}
  return{tier,check,words,reset:()=>{LIST=null;}};
})();

/* ================================================================
   NOTES FROM HOME — a grown-up writes a note, it shows up in his valley
   The note is checked word by word against his level while you type.
   It appears in Adventure as a glowing envelope; he reads it himself,
   and your recorded voice (if you added one) only plays after he has
   had a go. The treasure is real: whatever you hid.
   ================================================================ */
const Notes=(()=>{
  const L=()=>state.notes||(state.notes=[]);
  const pending=()=>L().filter(n=>!n.found);
  let recBlob=null;
  // ---------- grown-up side ----------
  function renderPane(){
    const pane=document.getElementById("pane-notes");if(!pane)return;Decode.reset();
    const from=state.noteFrom||"Dad";
    pane.innerHTML=`<p class="hint">Write a note for him to find in the valley. Hide a real surprise and tell him where in the note:
        <i>"Look in the red box by the bed."</i> Every word is checked against his reading level as you type.</p>
      <div class="row"><div class="grow"><div class="lbl">From</div></div><input id="noteFrom" value="${from}" maxlength="16" style="width:140px"></div>
      <textarea id="noteText" rows="3" maxlength="160" placeholder="Look under the rug for a snack."></textarea>
      <div id="noteCheck" class="ncheck"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0">
        ${Rec.ok()?`<button class="btn soft" id="noteRec">🎤 Record it in your voice</button>`:""}
        <button class="btn primary" id="noteSend">💌 Send to the valley</button></div>
      <div class="lbl" style="margin:12px 0 6px">Notes</div><div id="noteList"></div>`;
    const ta=pane.querySelector("#noteText"),ck=pane.querySelector("#noteCheck");
    const upd=()=>{const lvl=currentTier(),r=Decode.check(ta.value,lvl);
      if(!r.length){ck.innerHTML=`<span class="meta">His level: ${lvl}. Green words he can read; orange ones are a level or two above; red ones he hasn't been taught.</span>`;return;}
      const hard=r.filter(x=>!x.ok);
      ck.innerHTML=r.map(x=>`<span class="nw ${x.ok?"ok":x.t<=lvl+2?"near":"far"}" title="needs level ${x.t}">${x.w}</span>`).join(" ")+
        `<div class="meta" style="margin-top:6px">${hard.length?`${hard.length} word${hard.length>1?"s are":" is"} above level ${lvl}. He can tap any word to hear it, but a note he can read alone feels best.`:"✓ He can read every word."}</div>`;};
    ta.oninput=upd;upd();
    pane.querySelector("#noteFrom").onchange=e=>{state.noteFrom=e.target.value.replace(/[<>&"]/g,"").trim()||"Dad";save();};
    const rb=pane.querySelector("#noteRec");
    if(rb)rb.onclick=async()=>{
      if(rb.classList.contains("on")){rb.classList.remove("on");recBlob=await Rec.stop();rb.textContent=recBlob&&recBlob.size>800?"✓ Recorded — tap to redo":"🎤 Record it in your voice";return;}
      if(!(await Rec.start())){toast("The microphone is off");return;}rb.classList.add("on");rb.textContent="⏹ Stop recording";};
    pane.querySelector("#noteSend").onclick=async()=>{
      const text=ta.value.trim().replace(/[<>&"]/g,"").replace(/\s+/g," ");if(!text){toast("Write a note first");return;}
      const id="n"+Date.now().toString(36);
      if(recBlob&&recBlob.size>800){await DB.set("blobs","note:"+id,recBlob);}
      L().push({id,text,from:state.noteFrom||"Dad",at:Date.now(),voice:!!(recBlob&&recBlob.size>800),read:false,found:false});recBlob=null;
      save();badge();toast("💌 Sent! It will be waiting in Adventure.");Sound.sfx.chime();renderPane();};
    const list=pane.querySelector("#noteList");
    list.innerHTML=L().slice().reverse().map(n=>`<div class="row"><div class="grow"><div class="lbl">“${n.text}”</div>
      <div class="meta">${new Date(n.at).toLocaleDateString()} · ${n.found?"found it ✓":n.read?"read, still looking":"waiting in the valley"}${n.voice?" · 🎤":""}</div></div>
      <button class="btn soft ndel" data-id="${n.id}" style="min-height:40px;padding:6px 12px">✕</button></div>`).join("")||`<p class="meta">No notes yet.</p>`;
    list.querySelectorAll(".ndel").forEach(b=>b.onclick=async()=>{state.notes=L().filter(n=>n.id!==b.dataset.id);try{await DB.del&&DB.del("blobs","note:"+b.dataset.id);}catch(e){}save();badge();renderPane();});
  }
  // ---------- his side ----------
  function badge(){
    const b=document.getElementById("advBadge");if(!b)return;
    try{advBadge();}catch(e){}
    try{Adv.redraw();}catch(e){}
  }
  // envelopes in Adventure
  Adv.provide(()=>pending().map(n=>{
    if(n.c==null){const p=Adv.freePos(1.5);n.c=p.c;n.r=p.r;save();}
    return{c:n.c,r:n.r,size:.55,cls:"note",html:`<div class="env">💌</div>`,label:`💌 Note from ${n.from}`,act:()=>open(n)};}));
  let ov=null;
  function open(n){
    if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovNote";document.body.appendChild(ov);}
    let tries=0;
    ov.innerHTML=`<div class="sheet notesheet"><div class="nenv">💌</div><div class="npaper">
        <div class="nfrom">A note from ${n.from}!</div>
        <div class="btext">${n.text.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</div>
        <div class="nsig">Love, ${n.from}</div></div>
      <div class="mrow" style="justify-content:center;margin-top:12px">
        ${n.voice?`<button class="btn soft" id="nHear" disabled>🔊 Hear ${n.from}</button>`:""}
        <button class="btn primary big" id="nRead">✓ I read it!</button></div>
      <div class="mrow nfound" style="justify-content:center;margin-top:10px;display:none">
        <button class="btn soft" id="nLater">I'll look later</button><button class="btn primary big" id="nFound">🎁 I found it!</button></div></div>`;
    Books.wireWords(ov.querySelector(".btext"));
    ov.querySelectorAll(".bw").forEach(b=>b.addEventListener("click",()=>tries++));
    ov.classList.add("on");Sound.sfx.chime();
    const hear=ov.querySelector("#nHear");
    // his own try first: the voice unlocks after he says he read it
    const playVoice=async()=>{const b=await DB.get("blobs","note:"+n.id);if(b)await Books.playBlob(b);else Sound.say("sent:"+n.text,n.text,.9);};
    if(hear)hear.onclick=playVoice;
    ov.querySelector("#nRead").onclick=()=>{
      Sound.sfx.pop();if(hear)hear.disabled=false;ov.querySelector("#nRead").style.display="none";ov.querySelector(".nfound").style.display="";
      if(!n.read){n.read=true;state.wordsRead+=Decode.words(n.text).length;state.gems+=3;floater("+3 💎","#FFE9A8");renderHUD();save();}
      setTimeout(()=>Sound.speak(`Go and find it!`,.95),300);};
    ov.querySelector("#nLater").onclick=()=>ov.classList.remove("on");
    ov.querySelector("#nFound").onclick=()=>{n.found=true;n.foundAt=Date.now();state.gems+=5;save();badge();
      confetti();Sound.sfx.fanfare();ov.classList.remove("on");try{Quests.hit("read",2);}catch(e){}
      document.getElementById("rewardArt").innerHTML=`<div style="font-size:110px;line-height:1">🎁</div>`;
      document.getElementById("rewardName").textContent="You found it!";
      document.getElementById("rewardWord").textContent=`You read ${n.from}'s note all by yourself. +5 💎`;show("ovReward");};
  }
  return{renderPane,badge,open,pending};
})();
setTimeout(()=>Notes.badge(),1600);
