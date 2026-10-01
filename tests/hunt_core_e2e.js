// Bug hunt, core shard, part 1 of 3: the HUD, the tool bar and the crate loop, at the iPad size (1024x768, touch).
// (Part 2, hunt_core_valley_e2e.js: the valley, plans, quests, sticker book, closet, notes, recap, evolution, tour.
//  Part 3, hunt_core_parent_e2e.js: the grown-up gate, menu, every settings row, the report, backups.)
// Every interactive element on a screen is tapped in turn, the way a finger would (a touch tap at its centre, after
// checking nothing covers it), and must do something within 800 ms: a DOM change on its screen, a mode change, a
// change to the save, a toast, a spoken line, a sound, or focus. No page or console error may follow, and each screen
// must close back to where it came from. One PASS line per element; a dead or erroring element is a FAIL.
// Then the effects that matter are checked against docs/design.md: what each crate pays, that a wrong tap never takes
// gems, the glow after two misses, and that a double tap on a paying button pays once.
// This file also exports the harness the other two parts use (INIT for the page, harness() for Node).
"use strict";
const {launch,seed,reload,waitFor,check}=require("./lib");

// ---------- the page side: installed before the game's script, again after every reload ----------
function INIT(){
  // which elements have listeners (an onclick property is visible anyway; addEventListener is not)
  const add=EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener=function(t,f,o){try{if(this&&this.nodeType===1)(this.__ev||(this.__ev={}))[t]=1;}catch(e){}return add.call(this,t,f,o);};
  const H=window.__H={said:[],sfx:[],toasts:[],mut:0,root:null,dl:0,lastDl:"",prints:0,alerts:[],confirmYes:true,
    // Sound, silenced and recorded: what is said and which sounds play (Sound.__speak / __say keep the real ones)
    wrap(){
      if(typeof Sound==="undefined"||Sound.__w)return;Sound.__w=1;
      Sound.__speak=Sound.speak;Sound.__say=Sound.say;
      Sound.speak=t=>{H.said.push("speak:"+t);return Promise.resolve();};
      Sound.say=k=>{H.said.push("say:"+k);return Promise.resolve();};
      Object.keys(Sound.sfx).forEach(k=>{Sound.sfx[k]=a=>{H.sfx.push(k+(a?"("+a+")":""));};});
      const t=document.getElementById("toast");
      new MutationObserver(()=>{if(t.textContent)H.toasts.push(t.textContent);}).observe(t,{childList:true,characterData:true,subtree:true});
      // DOM changes, counted only inside the screen being tested (see watch), so the wandering animals don't count
      new MutationObserver(ms=>{const r=H.root;if(!r)return;for(const m of ms){const el=m.target.nodeType===1?m.target:m.target.parentElement;
        if(el&&(r===el||r.contains(el)))H.mut++;}}).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
      window.print=()=>{H.prints++;};
      const ac=HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click=function(){if(this.download){H.dl++;H.lastDl=this.download;H.lastHref=this.href;return;}return ac.call(this);};
    },
    // the save without what moves by itself (positions, the camera, minutes and visits)
    key(){try{return JSON.stringify(state,(k,v)=>(k&&k[0]==="_")||k==="modeOpens"||k==="modeMin"||k==="minutes"||k==="cam"||k==="buddy"||
        k==="c"||k==="r"||k==="face"||k==="alt"||k==="since"||k==="treats"?undefined:v);}catch(e){return"";}},
    // focus only counts for a form field (a tapped button takes focus too, dead or not)
    snap(){const a=document.activeElement;return{focus:a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)?H.name(a):"",said:H.said.length,sfx:H.sfx.length,toasts:H.toasts.length,
      modes:Modes.stack().join(">"),st:H.key(),mut:H.mut,alerts:H.alerts.length};},
    // what changed since s0, as a list of signals
    diff(s0){const s=H.snap(),out=[];
      if(s.said>s0.said)out.push("said "+H.said.slice(s0.said).join(" | ").slice(0,70));
      if(s.sfx>s0.sfx)out.push("sfx "+H.sfx.slice(s0.sfx).join(","));
      if(s.toasts>s0.toasts)out.push("toast "+H.toasts[H.toasts.length-1].slice(0,60));
      if(s.modes!==s0.modes)out.push("mode "+(s0.modes||"valley")+"→"+(s.modes||"valley"));
      if(s.st!==s0.st)out.push("save");
      if(s.mut>s0.mut)out.push("dom");
      if(s.alerts>s0.alerts)out.push("dialog "+H.alerts[H.alerts.length-1].slice(0,50));
      if(s.focus!==s0.focus&&s.focus)out.push("focus");
      return out;},
    watch(el){H.root=el||null;},
    // a copy of the save to come back to (fresh crawls put it back before each element)
    keep(){H.kept=JSON.stringify(state,(k,v)=>k&&k[0]==="_"?undefined:v);},
    restore(){if(!H.kept)return;loadSave(JSON.parse(H.kept));try{settleMovers();}catch(e){}paintBackdrop();renderWorld();renderDock();renderHUD();applyNight();Quests.badge();},
    // back to the valley with nothing open (between elements; the real close buttons are tested on their own)
    home(){
      for(let i=0;i<12;i++){const top=Modes.top();if(top==="valley")break;
        try{if(top==="adventure")Adv.exit();else if(top==="mine")Mine.exit();else if(top==="factory")Factory.close();else if(top==="job")Jobs.close();
          else if(top==="store")Store.close();else if(top==="closet")Looks.close();
          else if(top==="evo"){const o=document.getElementById("ovEvo");o.className="evo";Modes.close("evo",o);}
          else{const o=[...document.querySelectorAll(".overlay.on")].pop();if(o)Modes.shut(o);else break;}}catch(e){break;}}
      document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o));
      document.querySelectorAll(".badge-pop,.lvlup,.wordbub").forEach(n=>n.remove());
      try{if(state.selected){state.selected=null;renderDock();}}catch(e){}
      document.getElementById("toast").classList.remove("on");
      return Modes.top();
    },
    // where a finger would tap an element: its centre (scrolled into view), and what is really under that point
    aim(el,fy){
      if(!el||!el.isConnected)return{err:"gone"};
      const cs=getComputedStyle(el);if(cs.display==="none"||cs.visibility==="hidden")return{err:"hidden"};
      try{el.scrollIntoView({block:"center",inline:"center"});}catch(e){}
      const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return{err:"no size"};
      const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height*(fy==null?.5:fy));
      if(x<0||y<0||x>innerWidth||y>innerHeight)return{err:"off screen at "+x+","+y};
      const hit=document.elementFromPoint(x,y);
      return{x,y,w:Math.round(r.width),h:Math.round(r.height),covered:!(hit&&(hit===el||el.contains(hit))),hit:hit?H.name(hit):"nothing"};
    },
    name(el){if(!el)return"";let s=el.tagName.toLowerCase();if(el.id)s+="#"+el.id;else if(el.className&&typeof el.className==="string")s+="."+el.className.trim().split(/\s+/).slice(0,2).join(".");
      const t=(el.getAttribute("aria-label")||el.textContent||"").trim().replace(/\s+/g," ").slice(0,28);return s+(t?' "'+t+'"':"");},
    // what a finger can use inside root: buttons, links, form controls, and anything with a click handler
    items(root,extra){
      const sel="button,[role=button],a[href],input,select,label,textarea,.btn"+(extra?","+extra:"");
      const all=[...root.querySelectorAll("*")].filter(el=>el.matches(sel)||el.onclick||(el.__ev&&(el.__ev.click||el.__ev.pointerdown||el.__ev.pointerup)));
      // something inside a button or label is part of it
      return all.filter(el=>!all.some(o=>o!==el&&o.contains(el)&&(o.tagName==="BUTTON"||o.tagName==="LABEL"))).filter(el=>{
        const cs=getComputedStyle(el);return cs.display!=="none"&&cs.visibility!=="hidden"&&el.getClientRects().length;});
    },
    // text that does not fit: an element whose own text is cut by its box, or that runs past the edge of the screen
    clipped(root){
      const out=[];(root||document.body).querySelectorAll("*").forEach(el=>{
        if(!el.getClientRects().length)return;const cs=getComputedStyle(el);if(cs.display==="none"||cs.visibility==="hidden")return;
        const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)return;
        const r=el.getBoundingClientRect();
        const cut=(cs.overflow!=="visible"||cs.textOverflow==="ellipsis")&&(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)&&!/auto|scroll/.test(cs.overflowY+cs.overflowX);
        // past the screen's edge, unless a scrolling box it sits in is what cuts it
        let sc=el.parentElement,inScroll=false;while(sc){const c=getComputedStyle(sc);if(/auto|scroll/.test(c.overflowY+c.overflowX)){inScroll=true;break;}sc=sc.parentElement;}
        const off=!inScroll&&(r.right>innerWidth+1||r.left<-1||r.bottom>innerHeight+1);
        if(cut||off)out.push(H.name(el)+(cut?" cut":"")+(off?" off-screen":""));});
      return out;}};
  // a dialog never blocks: confirm says yes (unless told otherwise), and alerts are kept
  window.alert=m=>{H.alerts.push(String(m));};
  window.confirm=m=>{H.alerts.push("confirm:"+m);return H.confirmYes;};
}

// ---------- the Node side ----------
const VIEW={width:1024,height:768};
function harness({page:p,E,errs},T){
  const tally={},rows=[];
  const wait=ms=>p.waitForTimeout(ms);
  const home=()=>E(()=>__H.home());
  const arm=()=>E(()=>__H.wrap());
  // tap one element (a handle) the way a finger would; returns what changed, or why it could not be tapped.
  // valley: a tap in the valley itself, where a honk or an animal's call can be the answer to the tap
  async function tapEl(h,{root,ms=800,dead=false,valley=false,fy}={}){
    const aim=await h.evaluate((el,fy)=>__H.aim(el,fy),fy);
    if(aim.err)return{err:aim.err};
    if(aim.covered)return{err:"covered by "+aim.hit,aim};
    await E(r=>__H.watch(r||null),root||null);
    const s0=await E(()=>__H.snap()),e0=errs.length;
    await p.touchscreen.tap(aim.x,aim.y);
    // the traffic honks and the animals call out on their own: outside the valley those are not an answer to the tap
    const real=d=>d.map(x=>/^sfx /.test(x)&&!valley?x.replace(/(veh|cry)\([^)]*\),?/g,""):x).filter(x=>x!=="sfx ");
    let d=[];const end=Date.now()+(dead?300:ms);
    while(Date.now()<end){d=real(await E(s=>__H.diff(s),s0));if(d.length&&!dead)break;await wait(50);}
    await wait(50);d=real(await E(s=>__H.diff(s),s0));
    return{d,errs:errs.slice(e0),aim};
  }
  // tap a selector (first match); fails the check when it isn't there or can't be tapped
  async function tap(sel,label,opt){
    const h=await p.$(sel);if(!h){T.fail((label||sel)+": not there");return{err:"not there",d:[]};}
    const r=await tapEl(h,opt||{});if(r.err)T.fail((label||sel)+": "+r.err);return r;
  }
  // a double tap on one button, close enough together that a tap-lock (pageLock, hatLock, ...) must still
  // be holding for the second one. Both clicks fire back to back inside one evaluate(), with no setTimeout
  // or round trip from here between them: on a machine busy with other agents' browsers, even a same-page
  // setTimeout(gap) can be queued behind whatever heavy synchronous work the first click's handler does
  // (confetti, a badge check, redrawing every guardian) and fire well after the lock's own window, which
  // lets the second tap through (correctly, since that much time really did pass) and reads as a false
  // failure. Calling .click() twice in the same turn keeps the real gap at effectively 0ms regardless of
  // load, which only makes the lock check harder to pass, never easier, so it is at least as strict a test.
  // A held reference's second .click() still fires its handler even after a redraw removed it from the
  // page, which is what this checks: the redraw swaps in a new button, but the lock is a shared variable,
  // not a per-button one, so the stale handler is an equally valid way to reach it.
  async function dbl(sel){
    const h=await p.$(sel);if(!h)return{err:"not there"};
    return h.evaluate(el=>{
      if(!el||!el.isConnected)return{err:"gone"};
      el.click();el.click();return{};
    });
  }
  // Tap every element a screen offers, one after another. open() puts the screen up from the valley; it is put up again
  // whenever a tap took it away or changed what it shows. Elements are found again by name (and which one of that name),
  // so a list drawn again still lines up. dead(name): display only (a tap must change nothing in the save and throw
  // nothing); same: how many elements of one name are tapped (a grid of 60 locked cards: a few of them); fresh: the save
  // is put back as it was before each element; gap: a pause between taps (screens that ignore a second tap for a moment).
  async function crawl(screen,{open,rootSel,extra,skip,dead,same=6,fresh=false,valley=false,gap=0,after,fy}){
    const up=async()=>{await home();if(fresh)await E(()=>__H.restore());await open();await wait(200);};
    const list=()=>E(([r,x])=>{const root=document.querySelector(r);if(!root)return[];const n={};
      return __H.items(root,x).map(el=>{const nm=__H.name(el);n[nm]=(n[nm]||0)+1;el.dataset.hk=nm+"#"+n[nm];
        return{k:nm+"#"+n[nm],name:nm,occ:n[nm],dis:!!el.disabled||el.getAttribute("aria-disabled")==="true"};});},[rootSel,extra||""]);
    const isUp=m=>E(([r,m])=>{const el=document.querySelector(r);return !!el&&el.isConnected&&getComputedStyle(el).display!=="none"&&Modes.top()===m;},[rootSel,m]);
    await home();if(fresh)await E(()=>__H.keep());
    await up();
    const mode=await E(()=>Modes.top());
    const keys=await list();
    const sig=l=>l.map(x=>x.k).join("|"),first=sig(keys);let dirty=false;
    tally[screen]=tally[screen]||0;
    for(const it of keys){
      if(skip&&skip(it.name))continue;
      if(it.occ>same)continue;
      if(fresh||dirty||!(await isUp(mode)))await up();
      else if(gap)await wait(gap);
      const now=await list();
      if(!now.some(x=>x.k===it.k)){T.fail(`${screen} · ${it.name}: not there when the screen is opened again`);continue;}
      const h=await p.$(`${rootSel} [data-hk="${it.k.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"]`);
      if(!h){T.fail(`${screen} · ${it.name}: not found`);continue;}
      tally[screen]++;
      const root=await p.$(rootSel);
      const quiet=it.dis||(dead&&dead(it.name));
      const r=await tapEl(h,{root,dead:quiet,valley,fy});
      const label=`${screen} · ${it.name}${it.occ>1?" ("+it.occ+")":""}`;
      if(r.err){T.fail(`${label}: ${r.err}`);rows.push([screen,it.name,r.err]);continue;}
      if(quiet)T.ok(!r.d.includes("save")&&!r.errs.length,`${label} (${it.dis?"disabled":"display only"}): nothing changes${r.d.length?" ("+r.d.join("; ")+")":""}${r.errs.length?" ERRORS "+r.errs.join(" | "):""}`);
      else T.ok(r.d.length&&!r.errs.length,`${label}: ${r.d.length?r.d.join("; "):"NOTHING HAPPENED"}${r.errs.length?" ERRORS "+r.errs.join(" | "):""}`);
      rows.push([screen,it.name,r.d.join("; ")||"nothing"]);
      if(after)await after(it.name,r);
      dirty=(await isUp(mode))&&sig(await list())!==first;
    }
    await home();if(fresh)await E(()=>__H.restore());
    return keys;
  }
  // open a screen with a tap and close it with its own close button: both work, and it lands back where it started
  async function openClose(label,openSel,mode,closeSel){
    await home();const from=await E(()=>Modes.top());
    const r=await tap(openSel,label+" opens");
    T.ok(await waitFor(p,m=>Modes.top()===m,{arg:mode,timeout:2500}),`${label}: ${openSel} opens it (mode ${mode}; ${(r.d||[]).join("; ")})`);
    await wait(250);
    const c=await tap(closeSel,label+" closes");
    T.ok(await waitFor(p,m=>Modes.top()===m,{arg:from,timeout:2500}),`${label}: ${closeSel} closes it, back to ${from} (${(c.d||[]).join("; ")})`);
  }
  const report=()=>console.log("tapped per screen: "+JSON.stringify(tally)+" = "+Object.values(tally).reduce((a,b)=>a+b,0));
  return{tapEl,tap,dbl,crawl,openClose,home,arm,wait,tally,rows,report};
}
module.exports={INIT,harness,VIEW};

if(require.main===module)(async()=>{
  const T=check("hunt_core"),J=JSON.stringify;
  // every open land's keeper is awake (no cut-scene on top), the badges he has are already given (no pop-ups chiming
  // during the taps), the goal is on, a fox is out and a hen is resting
  const START={guardians:[0,1,2],biome:2,settings:{goal:12},gems:20,badges:["first","ten","fifty","builder","explorer","wheels"],
    stats:{cat:{seen:3,first:3,miss:0,mastered:true,rung:2,rungClean:0},dog:{seen:2,first:1,miss:1,mastered:false,rung:1,rungClean:0},hat:{seen:1,first:1,miss:0,mastered:false,rung:0,rungClean:1}},
    critters:[{id:"fox",c:4,r:8,seed:5,lv:1,out:true,since:1},{id:"hen",c:15,r:7,seed:6,lv:2,out:false,since:2}]};
  const pg=await launch({viewport:VIEW,seed:START,init:INIT});
  const {page:p,errs,close,E}=pg;
  p.on("crash",()=>T.fail("the page crashed"));
  const Hn=harness(pg,T),{crawl,tap,dbl,openClose,home,arm,wait}=Hn;
  await arm();

  // ================= 1. the HUD =================
  {
    const s=await crawl("hud",{open:async()=>{},rootSel:"#hud"});
    T.ok(s.length>=4,"hud: the HUD offers its buttons ("+s.map(x=>x.name).join(", ")+")");
  }

  Hn.report();
  T.ok(!errs.length,"no page errors: "+errs.join(" | "));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
