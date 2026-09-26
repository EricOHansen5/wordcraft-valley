/* ================================================================
   WRITE IT — letters with a finger (or an Apple Pencil)
   He hears a word, then writes it letter by letter. Each letter has a
   guide that fades as that letter gets easier for him:
     new         a solid grey letter to trace, with a green start dot
     practised   a faint dotted letter
     confident   no guide at all: he writes it from the sound
   A letter counts when the ink covers most of the letter and stays
   mostly inside it. Writing and reading grow together: every letter he
   forms is a sound he's reinforcing.
   ================================================================ */
const Write=(()=>{
  const S=()=>state.write||(state.write={});
  const SZ=300,FONT=`700 ${Math.round(SZ*.78)}px "Andika","Comic Sans MS","Chalkboard SE",system-ui,sans-serif`;
  const level=ch=>{const s=S()[ch]||{};return s.ok>=6?2:s.ok>=2?1:0;};   // 0 trace, 1 faint, 2 memory
  let ov=null,word=null,letters=[],li=0,ink=[],drawing=false,cv,g,fails=0,t0=0;
  function pick(){
    const tier=currentTier();
    const known=allWords().filter(w=>!w.tricky&&!/'/.test(w.w)&&w.w.length>=2&&w.w.length<=5&&w.t<=tier&&((state.stats[w.w]||{}).seen||0)>=1);
    const pool=known.length>=3?known:allWords().filter(w=>!w.tricky&&w.w.length<=4&&w.t<=Math.max(1,tier));
    // prefer words with letters he hasn't mastered writing yet
    pool.sort((a,b)=>score(a)-score(b)+Math.random()*.8-.4);return pool[0];
  }
  const score=w=>w.w.split("").reduce((a,c)=>a+level(c),0)/w.w.length;
  function start(w){
    word=w||pick();if(!word){toast("Read a few words first!");return;}
    letters=word.w.toLowerCase().split("");li=0;
    if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovWrite";document.body.appendChild(ov);}
    ov.innerHTML=`<div class="sheet writesheet"><div class="bhead"><h2>✍️ Write it</h2><button class="bx" id="wrX">✕</button></div>
      <div class="wrword">${letters.map((c,i)=>`<span class="wrl" data-i="${i}">${c}</span>`).join("")}</div>
      <div class="wrpad"><canvas id="wrGuide" width="${SZ}" height="${SZ}"></canvas><canvas id="wrInk" width="${SZ}" height="${SZ}"></canvas><div class="wrlines"></div></div>
      <div class="wrmsg" id="wrMsg"></div>
      <div class="mrow" style="justify-content:center"><button class="btn soft" id="wrHear">👂 Hear it</button><button class="btn soft" id="wrClear">🧽 Clear</button>
        <button class="btn primary big" id="wrOk">✓ Done</button></div></div>`;
    ov.classList.add("on");
    ov.querySelector("#wrX").onclick=()=>ov.classList.remove("on");
    ov.querySelector("#wrHear").onclick=()=>hear();
    ov.querySelector("#wrClear").onclick=()=>{ink=[];paint();};
    ov.querySelector("#wrOk").onclick=check;
    cv=ov.querySelector("#wrInk");g=cv.getContext("2d");
    const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*SZ/r.width,(e.clientY-r.top)*SZ/r.height];};
    cv.addEventListener("pointerdown",e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);drawing=true;ink.push([pos(e)]);paint();});
    cv.addEventListener("pointermove",e=>{if(!drawing)return;ink[ink.length-1].push(pos(e));paint();});
    const up=()=>{drawing=false;};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
    Sound.sfx.pop();setTimeout(()=>Sound.say("word:"+word.w,word.w,.85),300);letter();
  }
  async function hear(){await Sound.say("word:"+word.w,word.w,.85);const ph=tileOf(li);if(ph)setTimeout(()=>Sound.say("sound:"+ph,ph),250);}
  // the sound this letter belongs to (the "sh" tile for both s and h)
  function tileOf(i){let k=0;for(const ph of word.p){const t=tileText(ph).replace("-e","");if(i<k+t.length)return ph;k+=t.length;}return null;}
  function letter(){
    ink=[];fails=0;t0=performance.now();const ch=letters[li],lv=level(ch);
    ov.querySelectorAll(".wrl").forEach((e,i)=>{e.classList.toggle("cur",i===li);e.classList.toggle("done",i<li);e.classList.toggle("hide",i>=li&&level(letters[i])===2);});
    guide(ch,lv);paint();
    ov.querySelector("#wrMsg").textContent=lv===0?`Trace the ${ch}. Start at the green dot.`:lv===1?`Write the ${ch} over the dots.`:`Write the letter that says “${soundOf(tileOf(li)||ch)}”. You know this one!`;
    const ph=tileOf(li);if(ph&&li>0)Sound.say("sound:"+ph,ph);
  }
  function guide(ch,lv){
    const gc=ov.querySelector("#wrGuide").getContext("2d");gc.clearRect(0,0,SZ,SZ);
    if(lv===2)return;
    gc.font=FONT;gc.textAlign="center";gc.textBaseline="alphabetic";
    if(lv===0){gc.fillStyle="#D8D0C2";gc.fillText(ch,SZ/2,SZ*.78);
      const p=startDot(ch);gc.fillStyle="#5FB35B";gc.beginPath();gc.arc(p[0],p[1],11,0,Math.PI*2);gc.fill();}
    else{gc.setLineDash([7,9]);gc.lineWidth=4;gc.strokeStyle="#B9AE9C";gc.strokeText(ch,SZ/2,SZ*.78);}
  }
  // where a stroke usually starts: the top-most inked point of the glyph
  function startDot(ch){const m=mask(ch,0);for(let y=0;y<SZ;y+=3)for(let x=0;x<SZ;x+=3)if(m[y*SZ+x])return[x,y+6];return[SZ/2,SZ/3];}
  const masks={};
  function mask(ch,grow){
    const k=ch+":"+grow;if(masks[k])return masks[k];
    const c=document.createElement("canvas");c.width=c.height=SZ;const x=c.getContext("2d");
    x.font=FONT;x.textAlign="center";x.textBaseline="alphabetic";x.fillStyle="#000";x.fillText(ch,SZ/2,SZ*.78);
    if(grow){x.lineWidth=grow;x.lineJoin="round";x.strokeStyle="#000";x.strokeText(ch,SZ/2,SZ*.78);}
    const d=x.getImageData(0,0,SZ,SZ).data,m=new Uint8Array(SZ*SZ);for(let i=0;i<SZ*SZ;i++)m[i]=d[i*4+3]>60?1:0;return masks[k]=m;
  }
  function inkMask(width){
    const c=document.createElement("canvas");c.width=c.height=SZ;const x=c.getContext("2d");
    x.lineWidth=width;x.lineCap=x.lineJoin="round";x.strokeStyle="#000";
    ink.forEach(s=>{x.beginPath();s.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));if(s.length===1)x.lineTo(s[0][0]+.1,s[0][1]);x.stroke();});
    const d=x.getImageData(0,0,SZ,SZ).data,m=new Uint8Array(SZ*SZ);for(let i=0;i<SZ*SZ;i++)m[i]=d[i*4+3]>60?1:0;return m;
  }
  function paint(){
    g.clearRect(0,0,SZ,SZ);g.lineWidth=18;g.lineCap=g.lineJoin="round";g.strokeStyle="#3C6FD1";
    ink.forEach(s=>{g.beginPath();s.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));if(s.length===1)g.lineTo(s[0][0]+.1,s[0][1]);g.stroke();});
  }
  // how well the ink matches the letter
  function grade(ch){
    const glyph=mask(ch,0),zone=mask(ch,34),reach=inkMask(44),line=inkMask(18);
    let gp=0,cov=0,ip=0,out=0;
    for(let i=0;i<SZ*SZ;i+=2){if(glyph[i]){gp++;if(reach[i])cov++;}if(line[i]){ip++;if(!zone[i])out++;}}
    return{cov:gp?cov/gp:0,spill:ip?out/ip:1,ink:ip};
  }
  function check(){
    const ch=letters[li],r=grade(ch),s=S()[ch]||(S()[ch]={ok:0,n:0});s.n++;
    const good=r.ink>40&&r.cov>=.6&&r.spill<=.35;
    if(good||fails>=2){
      if(good){s.ok++;Sound.sfx.chime();}else{Sound.sfx.soft();s.ok=Math.max(0,s.ok-1);}
      const el=ov.querySelector(`.wrl[data-i="${li}"]`);el.classList.add(good?"star":"done");
      li++;save();
      if(li>=letters.length){finish();return;}
      setTimeout(letter,500);
    }else{
      fails++;Sound.sfx.nope();
      ov.querySelector("#wrMsg").textContent=r.ink<=40?"Make it bigger — fill the box!":r.cov<.6?`Almost! The ${ch} needs all its lines.`:"Try to stay on the letter.";
      if(fails>=1&&level(ch)===2)guide(ch,1);   // bring the dots back after a miss
      ink=[];paint();
    }
  }
  function finish(){
    const gems=2+(letters.length>3?1:0);state.gems+=gems;state.writes=(state.writes||0)+1;save();renderHUD();
    try{Quests.hit("write");}catch(e){}
    Sound.sfx.win();confetti();Sound.say("word:"+word.w,word.w,.85);
    ov.querySelector(".wrpad").innerHTML=`<div class="wrdone">${word.w}<div class="wrart">${WORD_ART[word.w]?drawWord(word.w,"w"):""}</div></div>`;
    ov.querySelector("#wrMsg").textContent=`You wrote “${word.w}”! +${gems} 💎`;
    ov.querySelector(".mrow").innerHTML=`<button class="btn soft" id="wrMore">✍️ Another word</button><button class="btn primary big" id="wrOk2">Done</button>`;
    ov.querySelector("#wrMore").onclick=()=>start();ov.querySelector("#wrOk2").onclick=()=>ov.classList.remove("on");
  }
  // for the report: letters he writes from memory
  const report=()=>Object.entries(S()).map(([c,s])=>({c,lv:level(c),n:s.n})).sort((a,b)=>a.c<b.c?-1:1);
  return{start,report,_grade:grade,_ink:()=>ink,_setInk:v=>{ink=v;},_cur:()=>({word:word&&word.w,li,ch:letters[li]}),_check:()=>check(),_mask:mask,SZ};
})();
