// A grown-up's typed text (a note, or the sync server address) must show up literally, never as live markup.
const {chromium}=require("playwright");const http=require("http"),fs=require("fs");
const srv=require("./page").serveApp({port:8796},async()=>{
  const b=await chromium.launch((process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{}));
  const p=await b.newPage({viewport:{width:1180,height:820}});const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const ok=(c,m)=>console.log((c?"PASS ":"FAIL ")+m);
  await p.goto("http://localhost:8796/");await p.waitForTimeout(2000);
  const E=(x,a)=>p.evaluate(x,a);
  await E(`document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"))`);
  const TEXT='<b>"x"</b> look',FROM='A"b';
  // a note like this can arrive via a restored backup, which skips the send box's own character stripping
  const r=await E(({text,from})=>{
    state.noteFrom=from;
    state.notes=[{id:"nesc",text,from,at:Date.now(),voice:false,read:false,found:false}];
    openParent();document.querySelector('.tab[data-tab="notes"]').click();
    const fromVal=document.getElementById("noteFrom").value;
    const lbl=document.querySelector("#noteList .lbl");
    const listText=lbl.textContent,listTagCount=lbl.querySelectorAll("b").length;
    Notes.open(state.notes[0]);
    const sheet=document.querySelector("#ovNote .npaper");
    const nfromText=sheet.querySelector(".nfrom").textContent;
    const btext=sheet.querySelector(".btext");
    const btextTagCount=btext.querySelectorAll("b").length;
    const rebuilt=[...btext.querySelectorAll(".bw")].map(s=>s.textContent).join(" ");
    return{fromVal,listText,listTagCount,nfromText,btextTagCount,rebuilt};
  },{text:TEXT,from:FROM});
  ok(r.fromVal===FROM,"grown-up 'From' field keeps the exact text typed, quote and all: "+JSON.stringify(r.fromVal));
  ok(r.listText.indexOf(TEXT)>=0,"the notes list shows the note text literally: "+JSON.stringify(r.listText));
  ok(r.listTagCount===0,"no <b> element is created from the notes list text");
  ok(r.nfromText.indexOf(FROM)>=0,"the note overlay's 'from' shows the typed text literally: "+JSON.stringify(r.nfromText));
  ok(r.btextTagCount===0,"no <b> element is created from the note body text");
  ok(r.rebuilt===TEXT,"the note body's words rebuild to the exact text typed: "+JSON.stringify(r.rebuilt));
  // the Adventure action button shows its label with textContent, so the name must not be escaped a second time
  const lab=await E(from=>{document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on"));
    state.notes=[{id:"nlab",text:"Hi.",from,at:Date.now(),voice:false,read:false,found:false}];state.adv={dex:{},seenIntro:1};
    Adv.enter();const n=state.notes[0];Adv._P.c=n.c;Adv._P.r=n.r;return new Promise(r=>setTimeout(()=>{const t=document.getElementById("advAct").textContent;Adv.exit();r(t);},400));},"Mom & Dad");
  ok(lab==="💌 Note from Mom & Dad","the note's action button reads the name as typed: "+JSON.stringify(lab));
  // the home-server address field (Sync module) is just as literal
  const s=await E(({url,token})=>{
    state.sync={url,token,last:0,auto:true};Sync.renderRow();
    return{url:document.getElementById("syncUrl").value,token:document.getElementById("syncTok").value};
  },{url:'http://x/"><i>y</i>',token:'A"b'});
  ok(s.url==='http://x/"><i>y</i>',"sync URL field keeps the exact text typed: "+JSON.stringify(s.url));
  ok(s.token==='A"b',"sync token field keeps the exact text typed: "+JSON.stringify(s.token));
  ok(!errs.length,"no page errors "+errs.join(" | "));
  await b.close();srv.close();
});
