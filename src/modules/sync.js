/* ================================================================
   HOME-SERVER BACKUP
   A copy of everything (progress, his recordings, your voice) is sent to
   the small server in wordcraft-server/ running on the home NAS. By
   default the game looks for it at the same address it was loaded from,
   so if the NAS serves the game, backups need no setup at all.
   It backs up once a day while playing and whenever the app goes to the
   background (at most every 30 minutes).
   ================================================================ */
const Sync=(()=>{
  const C=()=>state.sync||(state.sync={url:"",token:"",last:0,auto:true});
  const base=()=>(C().url||location.origin).replace(/\/+$/,"");
  let found=null,busy=false;
  // this device's id lives outside the save, so loading another device's progress doesn't take it
  const myId=(()=>{try{let d=localStorage.getItem("wcv-device");if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem("wcv-device",d);}return d;}catch(e){return"dev";}})();
  async function call(path,opt){
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),opt&&opt.long?120000:6000);
    try{const r=await fetch(base()+path,{...(opt||{}),signal:ctl.signal,headers:{"Content-Type":"application/json","X-Token":C().token||"",...((opt||{}).headers||{})}});
      if(!r.ok)throw new Error("HTTP "+r.status);return await r.json();}finally{clearTimeout(t);}
  }
  async function ping(){try{const j=await call("/api/ping");found=!!(j&&j.app==="wordcraft");}catch(e){found=false;}return found;}
  async function backup(manual){
    if(busy)return false;busy=true;
    try{
      if(!(await ping())){if(manual)toast("Can't reach the home server");return false;}
      // an automatic backup never replaces newer progress from another device
      if(!manual){if(!state.wordsRead)return false;
        try{const h=await call("/api/head");if(h&&h.device&&h.device!==myId&&(h.words||0)>state.wordsRead)return false;}catch(e){}}
      state.deviceId=myId;const data=await fullBackup();
      const j=await call("/api/backup",{method:"POST",body:JSON.stringify(data),long:true});
      C().last=Date.now();C().lastFile=j.file;C().seenHead=j.file;save();
      if(manual)toast(`Backed up to the home server ✓ (${j.blobs} recordings)`);
      renderRow();return true;
    }catch(e){if(manual)toast("Backup failed: "+e.message);return false;}
    finally{busy=false;}
  }
  async function restore(){
    if(!confirm("Replace this iPad's valley with the newest backup from the home server?"))return;
    try{const j=await call("/api/latest",{long:true});await restoreBackup(j);openParent();toast("Restored from the home server ✓");}
    catch(e){alert("Restore failed: "+e.message);}
  }
  function renderRow(){
    const el=document.getElementById("syncRow");if(!el)return;const c=C();
    el.innerHTML=`<div class="grow"><div class="lbl">Home server backup</div>
      <div class="meta">${found===false?"Not found at "+base()+". Set the address of your NAS below.":found?"Connected to "+base()+".":"Checking…"}
        ${c.last?` Last backup: ${new Date(c.last).toLocaleString()}.`:""}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <input id="syncUrl" placeholder="${location.origin}" value="${c.url||""}" style="flex:1;min-width:200px">
        <input id="syncTok" placeholder="token (optional)" value="${c.token||""}" style="width:150px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="btn soft" id="syncNow">⬆️ Back up now</button><button class="btn soft" id="syncGet">⬇️ Restore</button>
        <label class="meta" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="syncAuto" ${c.auto?"checked":""}> daily</label></div></div>`;
    el.querySelector("#syncUrl").onchange=e=>{c.url=e.target.value.trim();save();found=null;ping().then(renderRow);};
    el.querySelector("#syncTok").onchange=e=>{c.token=e.target.value.trim();save();};
    el.querySelector("#syncAuto").onchange=e=>{c.auto=e.target.checked;save();};
    el.querySelector("#syncNow").onclick=()=>backup(true);
    el.querySelector("#syncGet").onclick=restore;
  }
  // automatic: once a day, and when the app is put away
  function tick(force){
    const c=C();if(!c.auto)return;
    const age=Date.now()-(c.last||0);
    // after every session (at most every 5 minutes), so the next device gets the newest valley
    if(age>20*3600e3||(force&&age>5*60e3))backup(false);
  }
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")tick(true);});
  // played on another device? offer to carry on from there
  async function checkOther(){
    try{const h=await call("/api/head");if(!h||!h.file||h.file===C().seenHead||h.device===myId||(h.words||0)<=state.wordsRead)return;
      const ov=document.createElement("div");ov.className="overlay on";ov.innerHTML=`<div class="sheet" style="max-width:520px;text-align:center">
        <div style="font-size:64px">📲</div><h2>You played on another device!</h2><p class="sub">There you have read <b>${h.words}</b> words (here: ${state.wordsRead}). Carry on from there?</p>
        <div class="mrow" style="justify-content:center;display:flex;gap:10px"><button class="btn soft" id="soNo">Not now</button><button class="btn primary big" id="soYes">Yes, load it</button></div></div>`;
      document.body.appendChild(ov);
      ov.querySelector("#soNo").onclick=()=>{C().seenHead=h.file;save();ov.remove();};
      ov.querySelector("#soYes").onclick=async()=>{ov.querySelector("#soYes").textContent="Loading…";
        try{const j=await call("/api/latest",{long:true});await restoreBackup(j);C().seenHead=h.file;C().last=Date.now();save();toast("Welcome back! ✓");}catch(e){toast("Couldn't load: "+e.message);}ov.remove();};
    }catch(e){}
  }
  setTimeout(()=>{ping().then(async ok=>{renderRow();if(ok){await checkOther();tick(false);}});},4000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&found)checkOther();});
  setInterval(()=>tick(false),30*60e3);
  return{backup,restore,renderRow,ping,checkOther,_C:C,myId};
})();
