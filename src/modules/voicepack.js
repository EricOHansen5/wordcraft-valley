/* ================================================================
   GAME VOICE — one voice on every device
   Every word, book page, story line and game phrase was recorded ahead
   of time with a natural-sounding neural voice (Kokoro, "Heart") and
   ships in voice/ next to the game. The game plays those clips instead
   of the device's text-to-speech, so the iPad, the old iPhone and the
   laptop all sound the same. Order of preference:
     1. your own recording from the Voice Studio
     2. the game voice (exact line, or a few whole pieces joined up)
     3. the device voice, for anything new (a note you typed, a custom word)
   Letter sounds still come from the phonics synthesizer.
   ================================================================ */
const VoicePack=(()=>{
  let index=null,loading=null,token=0,src=null;const bufs=new Map();
  const norm=t=>String(t).toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9' ]+/g," ").replace(/\s+/g," ").trim();
  function load(){
    if(!loading&&typeof fetch!=="function")loading=Promise.resolve(null);
    if(!loading)loading=fetch("voice/index.json").then(r=>r.ok?r.json():null).then(j=>{index=j;return j;}).catch(()=>null);
    return loading;
  }
  function clip(f){
    if(!bufs.has(f))bufs.set(f,fetch("voice/"+f).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();}).then(a=>new Promise((ok,no)=>Sound.ctx().decodeAudioData(a,ok,no))).catch(e=>{bufs.delete(f);throw e;}));
    return bufs.get(f);
  }
  // cover the line with as few recorded pieces as possible; too choppy means no
  function plan(text){
    if(!index)return null;const toks=norm(text).split(" ").filter(Boolean);if(!toks.length)return null;
    const out=[];let i=0;
    while(i<toks.length){let j=toks.length,f=null;for(;j>i;j--){f=index[toks.slice(i,j).join(" ")];if(f)break;}if(!f)return null;out.push(f);i=j;}
    return out.length<=Math.max(2,Math.ceil(toks.length/3))?out:null;
  }
  function stop(){token++;if(src){try{src.stop();}catch(e){}src=null;}}
  async function play(text){
    if(state.settings.voicePack===false)return false;
    await load();const p=plan(text);if(!p)return false;
    const my=++token;if(src){try{src.stop();}catch(e){}src=null;}
    let list;try{list=await Promise.all(p.map(clip));}catch(e){return false;}
    try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}
    for(const b of list){
      if(my!==token)return true;
      await new Promise(res=>{const ac=Sound.ctx(),s=ac.createBufferSource();s.buffer=b;s.connect(ac.destination);src=s;
        s.onended=res;s.start();setTimeout(res,b.duration*1000+250);});
      if(list.length>1)await new Promise(r=>setTimeout(r,60));
    }
    return true;
  }
  // fetch every clip once so the voice works offline
  async function prefetch(onProgress){
    await load();if(!index)return 0;const files=[...new Set(Object.values(index))];let n=0;
    for(let i=0;i<files.length;i+=8){await Promise.all(files.slice(i,i+8).map(f=>fetch("voice/"+f).catch(()=>{})));n=Math.min(files.length,i+8);onProgress&&onProgress(n,files.length);}
    return files.length;
  }
  const has=t=>!!plan(t);
  return{play,stop,load,prefetch,has,norm,get ready(){return !!index;}};
})();
// start loading the index early; it's small
setTimeout(()=>VoicePack.load(),500);
function voiceRow(){
  const cb=document.getElementById("optPack"),meta=document.getElementById("packMeta"),dl=document.getElementById("packDl");if(!cb)return;
  cb.checked=state.settings.voicePack!==false;
  cb.onchange=()=>{state.settings.voicePack=cb.checked;save();if(cb.checked)Sound.speak("Hi! This is the game voice.",.95);};
  VoicePack.load().then(j=>{if(!j){meta.textContent="The game voice isn't here: it comes with the app folder (voice/). The device voice is used instead.";dl.style.display="none";}});
  dl.onclick=async()=>{dl.disabled=true;const n=await VoicePack.prefetch((a,b)=>{dl.textContent=`⬇️ ${Math.round(a/b*100)}%`;});
    state.voiceCached=Date.now();save();dl.textContent=n?"✓ Saved for offline":"Not available";};
}
// quietly make the voice work offline the first time the game runs from the server
setTimeout(()=>{if(!state.voiceCached&&location.protocol.startsWith("http"))VoicePack.load().then(j=>{if(j)VoicePack.prefetch().then(n=>{if(n){state.voiceCached=Date.now();save();}});});},20000);
