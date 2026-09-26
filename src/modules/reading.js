/* ================================================================
   READING HUB — glue for books, Picture It, the grown-up report and
   play-time tracking.
   ================================================================ */
function booksBadge(){
  const b=document.getElementById("bookBadge");if(!b)return;
  const n=Books.nextNew();b.textContent=n?"NEW":"";b.classList.toggle("on",!!n);
  const mb=document.getElementById("mBooks");if(mb)mb.classList.toggle("new",!!n);
}
document.getElementById("booksBtn").onclick=()=>{Sound.sfx.pop();Books.shelf();};

/* ---- Picture It: read a sentence, pick the matching scene ---- */
let picOv=null;
function openPicIt(){
  const ps=PicSentence.make();if(!ps){toast("Read a few more words first!");return;}
  if(!picOv){picOv=document.createElement("div");picOv.className="overlay";picOv.id="ovPic";document.body.appendChild(picOv);}
  const bg=["meadow","farm","pond","town"][Math.floor(Math.random()*4)],t0=performance.now();let tries=0;
  picOv.innerHTML=`<div class="sheet picit"><h2>🖼️ Picture it</h2><p class="sub">Read the sentence. Tap the picture that matches it — every word counts!</p>
    <div class="btext">${ps.text.split(" ").map(w=>`<span class="bw">${w}</span>`).join(" ")}</div>
    <div class="psopts">${ps.opts.map((o,i)=>`<button class="psopt" data-i="${i}">${PicSentence.draw(o,bg)}</button>`).join("")}</div>
    <div style="text-align:center;margin-top:12px"><button class="btn ghost" id="psLater">Later</button></div></div>`;
  Books.wireWords(picOv.querySelector(".btext"));
  picOv.querySelector("#psLater").onclick=()=>picOv.classList.remove("on");
  const comp=()=>state.comp||(state.comp={right:0,wrong:0});
  picOv.querySelectorAll(".psopt").forEach(b=>b.onclick=()=>{
    const o=ps.opts[+b.dataset.i];tries++;
    if(o.ok){b.classList.add("right");comp().right++;const won=tries===1?2:1;state.gems+=won;state.wordsRead+=1;
      Quests.hit("read");Sound.sfx.win();confetti();Sound.say("sent:"+ps.text,ps.text,.9);floater("+"+won+" 💎","#FFE9A8");
      renderHUD();save();setTimeout(()=>picOv.classList.remove("on"),1400);}
    else{comp().wrong++;b.classList.add("wrong");Sound.sfx.nope();setTimeout(()=>b.classList.remove("wrong"),600);
      if(performance.now()-t0<2500){state.rushes=state.rushes||{};state.rushes[today()]=(state.rushes[today()]||0)+1;}
      // point at the word that makes the difference
      const key=o.swap?ps.words[0]:o.rel!==ps.opts.find(x=>x.ok).rel?ps.words[1]:ps.words[0];
      const sp=[...picOv.querySelectorAll(".bw")].find(x=>x.textContent.replace(/[^a-z]/gi,"").toLowerCase()===key);
      if(sp){sp.classList.add("look");setTimeout(()=>sp.classList.remove("look"),1800);}
      if(tries>=2)picOv.querySelector(`.psopt[data-i="${ps.opts.findIndex(x=>x.ok)}"]`).classList.add("hint");
      save();}
  });
  picOv.classList.add("on");
  setTimeout(()=>Sound.speak("Read it, then find the picture.",.95),300);
}

/* ---- minutes played: counted only while visible and touched recently ---- */
let lastTouch=Date.now();
document.addEventListener("pointerdown",()=>{lastTouch=Date.now();},true);
setInterval(()=>{
  if(document.visibilityState!=="visible"||Date.now()-lastTouch>90000)return;
  state.minutes=state.minutes||{};state.minutes[today()]=(state.minutes[today()]||0)+1;save();
},60000);

/* ---- the grown-up reading report ---- */
let repOv=null;
function lastDays(n){const out=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);out.push(d.toISOString().slice(0,10));}return out;}
function bars(days,get,fmt){
  const vals=days.map(get),max=Math.max(1,...vals);
  return`<div class="chart rchart">${days.map((d,i)=>`<div class="col"><b>${vals[i]?fmt?fmt(vals[i]):vals[i]:""}</b><i style="height:${vals[i]/max*100}%"></i><span>${"SMTWTFS"[new Date(d+"T12:00").getDay()]}</span></div>`).join("")}</div>`;
}
function openReport(){
  if(!repOv){repOv=document.createElement("div");repOv.className="overlay";repOv.id="ovReport";document.body.appendChild(repOv);}
  const words=allWords(),tier=currentTier(),days=lastDays(7);
  const mastered=words.filter(w=>(state.stats[w.w]||{}).mastered).length;
  const ans=state.answers||{},wk=days.map(d=>ans[d]||{n:0,ok:0,ms:0});
  const n=wk.reduce((a,x)=>a+x.n,0),ok=wk.reduce((a,x)=>a+x.ok,0),ms=wk.reduce((a,x)=>a+x.ms,0);
  const mins=days.reduce((a,d)=>a+((state.minutes||{})[d]||0),0),rush=days.reduce((a,d)=>a+((state.rushes||{})[d]||0),0);
  const comp=state.comp||{right:0,wrong:0},compPct=comp.right+comp.wrong?Math.round(comp.right/(comp.right+comp.wrong)*100):null;
  const lib=state.library||{},done=BOOKS.filter(b=>(lib[b.id]||{}).done);
  const sk=Skills.all().filter(s=>s.t<=tier+1);
  const ST={new:["not yet","#BDB3A3"],learning:["learning","#E8B33D"],shaky:["needs practice","#D9674A"],strong:["strong","#5FB35B"]};
  const conf=Skills.confusions().slice(0,6);
  const shaky=sk.filter(s=>s.status==="shaky"),m=state.mine||{};
  // what to do next, in plain words
  const tips=[];
  shaky.slice(0,2).forEach(s=>tips.push(`<b>${s.n}</b> is shaky. Say the sound together and hunt for it in books — try “${s.ex}”. The game is already giving him extra ${s.n} words.`));
  if(conf.length)tips.push(`He mixes up <b>${conf[0].k.split("→")[0]}</b> and <b>${conf[0].k.split("→")[1]}</b>. Point to the letter and say both sounds; ask which one he hears.`);
  if(rush>=5)tips.push(`He guessed quickly ${rush} times this week. Ask him to point under each sound as he says it — the Sound Shield does this in the game too.`);
  if(compPct!=null&&compPct<75)tips.push(`He decodes well but sometimes misses the meaning (${compPct}% of picture and book questions). After each page ask: “What happened?”`);
  if(!Object.values(lib).some(b=>b.rec))tips.push(`Try <b>🎤 Read it to your pet</b> in a book. Hearing himself read is powerful — and you get recordings to keep.`);
  const tierWords=words.filter(w=>w.t===tier&&!w.tricky),tm=tierWords.filter(w=>(state.stats[w.w]||{}).mastered).length;
  if(tierWords.length&&tm/tierWords.length>=.7)tips.push(`He has mastered ${tm} of ${tierWords.length} level-${tier} words — he is close to the next level.`);
  if(!tips.length)tips.push("Everything looks on track. Keep sessions short and often: 10–15 minutes most days beats one long session.");
  repOv.innerHTML=`<div class="sheet report"><div class="rhead"><h2>📊 Reading report</h2><span class="rdate">${new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</span></div>
    <div class="stat rstat">
      <div><b>${state.wordsRead}</b><span>words read</span></div><div><b>${mastered}</b><span>words mastered</span></div>
      <div><b>${tier}</b><span>level</span></div><div><b>${mins}</b><span>minutes this week</span></div>
      <div><b>${n?Math.round(ok/n*100)+"%":"—"}</b><span>right this week</span></div><div><b>${done.length}/${BOOKS.length}</b><span>books read</span></div>
    </div>
    <h3>Next steps</h3><ul class="rtips">${tips.map(t=>`<li>${t}</li>`).join("")}</ul>
    <h3>Sound skills</h3><p class="rnote">Every answer in the game is traced to the sound patterns in the word. Bars show how reliably he reads each one.</p>
    <div class="rskills">${sk.map(s=>{const st=ST[s.status],p=s.s?Math.round(s.s.p*100):0;
      return`<div class="rsk"><span class="rn">${s.n} <i>${s.ex}</i></span><span class="rbar"><i style="width:${s.s?p:0}%;background:${st[1]}"></i></span><span class="rst" style="color:${st[1]}">${st[0]}</span></div>`;}).join("")}</div>
    <h3>Mix-ups</h3>${conf.length?`<div class="rconf">${conf.map(c=>{const [a,b]=c.k.split("→");return`<span>chose <b>${a}</b> for <b>${b}</b> <i>×${c.n}</i></span>`;}).join("")}</div>`:`<p class="rnote">No repeated mix-ups yet.</p>`}
    <div class="rgrid"><div><h3>Minutes a day</h3>${bars(days,d=>(state.minutes||{})[d]||0)}</div>
      <div><h3>Quick guesses a day</h3>${bars(days,d=>(state.rushes||{})[d]||0)}</div></div>
    <p class="rnote">${n?`Average time to answer: <b>${(ms/n/1000).toFixed(1)} s</b>. `:""}${compPct!=null?`Understanding (picture sentences and book questions): <b>${compPct}%</b> right.`:""}</p>
    <h3>Books</h3>${done.length?`<div class="rbooks">${done.map(b=>{const p=lib[b.id];return`<div class="rbook"><b>${b.title}</b><span>${"⭐".repeat(p.stars||1)}${"☆".repeat(3-(p.stars||1))} · read ${p.reads||1}×</span>${p.rec?`<button class="btn soft rplay" data-id="${b.id}">🎧 Hear him read</button>`:""}</div>`;}).join("")}</div>`:`<p class="rnote">No books finished yet — tap 📚 Books in the valley.</p>`}
    <h3>Mine</h3><p class="rnote">${m.bossWins||0} bosses beaten · ${m.dugCount||0} blocks dug · ${m.coins||0} coins. Every boss hit and word stone is a word read.</p>
    <div class="mrow rbtns"><button class="btn soft" id="rPrint">🖨️ Print</button><button class="btn primary" id="rClose">Done</button></div></div>`;
  repOv.querySelector("#rClose").onclick=()=>{Books.stopAudio();repOv.classList.remove("on");};
  repOv.querySelector("#rPrint").onclick=()=>{document.body.classList.add("printing");window.print();setTimeout(()=>document.body.classList.remove("printing"),500);};
  repOv.querySelectorAll(".rplay").forEach(b=>b.onclick=async()=>{
    if(b.classList.contains("on")){b.classList.remove("on");Books.stopAudio();return;}
    b.classList.add("on");b.textContent="⏹ Stop";const bk=BOOKS.find(x=>x.id===b.dataset.id);
    for(let k=0;k<bk.pages.length&&b.classList.contains("on");k++){const blob=await DB.get("blobs",`story:${bk.id}:${k}`);if(blob)await Books.playBlob(blob);}
    b.classList.remove("on");b.textContent="🎧 Hear him read";});
  repOv.classList.add("on");
}
document.getElementById("reportBtn").onclick=openReport;
setTimeout(booksBadge,300);
