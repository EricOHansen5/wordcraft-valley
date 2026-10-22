// Progress report from the home server's newest backup (or a snapshot file), for a parent or an assistant.
//   node tools/progress.js                 pulls http://192.168.1.91:8088/api/latest (WCV_SERVER, WCV_TOKEN to change)
//   node tools/progress.js --file x.json   reads a snapshot file instead
//   node tools/progress.js --json          prints the game state as JSON instead, minus recordings and the sync settings
// It never reads or prints recordings: the snapshot's `blobs` list is dropped before anything else happens.
"use strict";
const http=require("http"),https=require("https"),fs=require("fs");
const args=process.argv.slice(2),arg=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
const SERVER=(process.env.WCV_SERVER||"http://192.168.1.91:8088").replace(/\/+$/,""),TOKEN=process.env.WCV_TOKEN||"";
// the same reading flags as the game's MODES table
const READING={read:1,book:1,pic:1,sign:1,note:1,story:1,wild:1,care:1,write:1,maker:1,trick:1,feast:1,lights:1,talk:1};
const NAMES={valley:"the valley",read:"reading words",book:"books",pic:"picture it",sign:"signs",note:"notes from home",story:"story quests",wild:"word wilds",
  care:"animal care",write:"writing",maker:"my own book",mine:"gem mine",adventure:"adventure",race:"races",dex:"word-dex",craft:"building plans",album:"sticker book",
  quests:"daily quests",reward:"rewards",evo:"buddy evolving",scene:"keeper wakes up",recap:"session recap",photo:"postcard",gate:"grown-up gate",parent:"grown-up menu",
  report:"reading report",job:"jobs",store:"trading post",closet:"closet",trick:"trick-or-read",home:"home",dungeon:"dungeons",battle:"dungeon battles",fireworks:"fireworks",party:"birthday party",mail:"word mail",eggs:"egg hunt",feast:"feast table",lights:"light the tree",factory:"factory",talk:"talk to me",other:"other"};

function fetchLatest(){
  return new Promise((res,rej)=>{
    const u=new URL(SERVER+"/api/latest"),mod=u.protocol==="https:"?https:http;
    const q=mod.get(u,{headers:{"X-Token":TOKEN}},r=>{let b="";r.setEncoding("utf8");r.on("data",d=>b+=d);r.on("end",()=>{
      if(r.statusCode!==200)return rej(new Error("server said "+r.statusCode+": "+b.slice(0,120)));
      try{res(JSON.parse(b));}catch(e){rej(e);}});});
    q.on("error",rej);q.setTimeout(20000,()=>{q.destroy(new Error("timeout"));});
  });
}
function strip(snap){
  const s=snap.state||snap;const out={};
  // (of the blobs, only how many of his voice's templates the backup keeps: their names, never their data)
  const tpl=Object.keys(snap.blobs||{}).filter(k=>/^tpl:/.test(k)).length;
  for(const k of Object.keys(s)){if(k==="sync"||k==="deviceId")continue;out[k]=s[k];}
  return{savedAt:snap.savedAt||null,ver:snap.ver||null,tplKept:tpl,state:out};
}
// the game keys its days by the iPad's local date ("YYYY-MM-DD"), so these are local dates too
const day=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const lastDays=n=>{const out=[];const t=new Date();for(let i=n-1;i>=0;i--){const d=new Date(t);d.setDate(t.getDate()-i);out.push(day(d));}return out;};
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+(+b||0),0);
const pad=(v,n,right)=>{v=String(v);return right?v.padStart(n):v.padEnd(n);};
const median=a=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y);const m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};

// ---- how he plays: sessions, words and accuracy a day, help he leaned on, prizes, the recent activity (state.sessions,
// daily, answers, helps, prizes, events; see HOW HE PLAYS in app/index.html) ----
const clock=t=>{const d=new Date(t),h=d.getHours();return(h%12||12)+":"+String(d.getMinutes()).padStart(2,"0")+" "+(h<12?"am":"pm");};
const wkday=d=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(d+"T12:00").getDay()];
const STARTS={launch:"opened the app",wake:"came back (woke the game from rest)",back:"came back to the app"};
const STOPS={rest:"stopped (rest)",hidden:"stopped (app put away)",closed:"stopped (app closed)"};
function said(e){const x=e.x==null?"":String(e.x);
  return e.k==="start"?STARTS[x]||"started":e.k==="end"?STOPS[x]||"stopped":e.k==="open"?"opened "+(NAMES[x]||x)
    :e.k==="read"?"read '"+x+"' first try":e.k==="help"?"read '"+x+"' with help":e.k==="wait"?"read '"+x+"' with help, prize waits"
    :e.k==="book"?"finished the book "+x:e.k==="guess"?"sound it out first "+(x==="on"?"came on":"went off")
    :e.k==="guessset"?"a grown-up turned sound it out first "+(x==="on"?"on":"off"):e.k+" "+x;}
// ---- Say it: a try's log entry (state.talk.log, from "sayit"; see SayIt and Talk.heardOf in app/index.html) as one line:
// when, the word, what the NAS heard, each listener's best and score, who decided ("both agree": A and B leaned the same way),
// and the clip's level before the gain and the gain it was sent to the NAS with ("level .008 ×30")
const sc=v=>(+v||0).toFixed(2).replace(/^0/,"");
function sayIt(e){
  const when=e.at?day(new Date(e.at)).slice(5)+" "+pad(clock(e.at),8,1):String(e.d||"").slice(5)+" "+pad("",8);
  const view=(k,x)=>k+(x.best?" "+x.best:"")+" "+sc(x.score)+(x.sure?" sure":" not sure"),parts=[];
  if(e.A)parts.push(view("A",e.A));if(e.B)parts.push(view("B",e.B));
  if(!e.A&&!e.B&&e.score!=null)parts.push(view(e.tier,e));
  if(e.tier==="AB")parts.push("both agree");
  const what=e.text?'heard "'+e.text+'" ':e.A||e.tier==="A"?"heard nothing ":e.tier==="none"?"nothing could listen ":"";
  const lvl=e.lvl!=null?"  level "+(+e.lvl||0).toFixed(3).replace(/^0/,"")+" ×"+(+e.gain||1):"";
  return when+"  "+(e.w||"(word not noted)")+" → "+what+(parts.length?"("+parts.join("; ")+") ":"")+(e.ok?"✓":"·")+lvl;
}
function play(s,p){
  const days=lastDays(7).reverse(),ss=Array.isArray(s.sessions)?s.sessions:[],H=s.helps||{},P=s.prizes||{},A=s.answers||{},D=s.daily||{};
  p("How he plays (last 7 days)");
  p("  day             sessions (start · minutes touching the game), where the last one stopped");
  const first=ss.length?day(new Date(ss[0].s)):days[0];      // days before the first session noted say so
  for(const d of days){const l=ss.filter(x=>day(new Date(x.s))===d),z=l[l.length-1];
    p("  ",pad(d+" "+wkday(d),16),l.length?l.map(x=>clock(x.s)+" · "+(x.m||0)+" min").join(", ")+"   stopped in "+(NAMES[z.last]||z.last):d<first||!ss.length?"not noted yet":"-");}
  p("  day             words read, right first time");
  for(const d of days){const a=A[d]||{};p("  ",pad(d+" "+wkday(d),16),pad(D[d]||0,4,1)," words, ",a.n?Math.round(a.ok/a.n*100)+"% ("+a.ok+"/"+a.n+")":"-");}
  const wk=k=>days.reduce((a,d)=>a+(+((H[d]||{})[k])||0),0),B=wk("blend"),E=wk("ear");
  p("  help he leaned on (blend it / say the word / sound tiles / answer shown after two misses):");
  const hd=days.filter(d=>H[d]);
  hd.forEach(d=>{const h=H[d];p("  ",pad(d+" "+wkday(d),16),(h.blend||0)+" / "+(h.ear||0)+" / "+(h.tiles||0)+" / "+(h.hint||0));});
  p("    ",!B&&!E?"no Blend it or Say the word taps this week":"Blend it "+B+", Say the word "+E+": "+(B>=2*E?"he is sounding out more than asking":E>=2*B?"he is asking for the word more than sounding it out":"about as often sounding out as asking"));
  const pd=days.filter(d=>P[d]);
  p("  prizes: ",pd.length?pd.map(d=>d.slice(5)+" opened "+(P[d].open||0)+", waited "+(P[d].wait||0)).join("; "):"none this week");
  const y=lastDays(2)[0],t=lastDays(1)[0],ev=(Array.isArray(s.events)?s.events:[]).filter(e=>{const d=day(new Date(e.t));return d===t||d===y;}).sort((a,b)=>b.t-a.t);
  p("  recent activity (today and yesterday, newest first):",ev.length?"":" none");
  ev.forEach(e=>p("    ",day(new Date(e.t))===t?"today     ":"yesterday ",pad(clock(e.t),9),said(e)));
}

function report(snap){
  const s=snap.state,L=[];const p=(...x)=>L.push(x.join(""));
  const mastered=Object.values(s.stats||{}).filter(x=>x&&x.mastered).length,seen=Object.keys(s.stats||{}).length;
  // (backups name the version that made them from 2026-10-22a on)
  p("Wordcraft Valley — progress (backup ",snap.savedAt||"?",", made by ",snap.ver?String(snap.ver).replace(/^wcv-/,""):"a version older than 2026-10-22a",")");
  p("hero ",s.hero||"Asher","  words read ",s.wordsRead||0,"  words tracked ",seen,"  mastered ",mastered,"  gems ",s.gems||0,"  coins ",(s.mine&&s.mine.coins)||0,"  best streak ",s.best||0);
  p("");
  play(s,p);
  p("");
  // ---- days ----
  p("Last 14 days (minutes on screen; reading = crates, books, writing, signs, notes, story, wilds, care; goal = the daily reading goal)");
  p(pad("day",11),pad("min",5,1),pad("read",6,1),pad("else",6,1),pad("words",7,1),"  goal  where the time went");
  for(const d of lastDays(14)){
    const mm=(s.modeMin||{})[d]||{};let rd=0,el=0;for(const k of Object.keys(mm)){if(READING[k])rd+=mm[k];else el+=mm[k];}
    const min=(s.minutes||{})[d];if(min==null&&!Object.keys(mm).length&&!(s.daily||{})[d])continue;
    const top=Object.entries(mm).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>(NAMES[k]||k)+" "+v).join(", ");
    p(pad(d,11),pad(min==null?"-":min,5,1),pad(rd,6,1),pad(el,6,1),pad((s.daily||{})[d]||0,7,1),"  ",(s.goalDays||{})[d]?"yes ":"    ","  ",top);
  }
  p("");
  // ---- where the time goes, 7 days ----
  const days7=lastDays(7),tot={},opens={};
  for(const d of days7){for(const [k,v] of Object.entries((s.modeMin||{})[d]||{}))tot[k]=(tot[k]||0)+v;for(const [k,v] of Object.entries((s.modeOpens||{})[d]||{}))opens[k]=(opens[k]||0)+v;}
  const rows=Object.keys(Object.assign({},tot,opens)).sort((a,b)=>(tot[b]||0)-(tot[a]||0));
  p("This week by mode (minutes / opens):");
  p("  "+rows.map(k=>(NAMES[k]||k)+" "+(tot[k]||0)+"/"+(opens[k]||0)).join(", "));
  const rd7=rows.filter(k=>READING[k]).reduce((a,k)=>a+(tot[k]||0),0),el7=rows.filter(k=>!READING[k]).reduce((a,k)=>a+(tot[k]||0),0);
  p("  reading and writing ",rd7," min, everything else ",el7," min");
  p("");
  // ---- words ----
  const shaky=Object.entries(s.stats||{}).filter(([w,x])=>x&&x.miss>0).sort((a,b)=>(b[1].miss/(b[1].seen||1))-(a[1].miss/(a[1].seen||1))).slice(0,8);
  p("Words: ",seen," tracked, ",mastered," mastered; shakiest: ",shaky.map(([w,x])=>w+" ("+x.miss+"/"+x.seen+")").join(", ")||"none");
  const cons=s.skills&&s.skills.cons&&s.skills.cons.e;
  if(cons){const top=Object.entries(cons).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>k+" ×"+v).join(", ");p("Sound mix-ups (tapped→meant): ",top);}
  {const g=s.guess||{},gd=g.days||{},ks=Object.keys(gd).sort().slice(-14);
    p("Guessing (words that looked like guesses, by day): ",ks.length?ks.map(d=>d.slice(5)+" "+gd[d]).join(", "):"none yet","; sound it out first: ",g.on?"on":"off");}
  const ret=s.retain||[];const crate=s.crateCount||0;
  p("Heart words being checked again: ",ret.length,ret.length?" (next due in "+Math.max(0,Math.min.apply(null,ret.map(r=>r.dueAt))-crate)+" crates)":"");
  p("Review queue: ",(s.review||[]).length," words");
  p("");
  // ---- books, rereads ----
  const bk=Object.values(s.books||{}),done=bk.filter(b=>b.done).length,own=Object.values(s.library||{}).filter(b=>b.done).length;
  p("Books finished: ",done," of ",bk.length," started; own books finished: ",own,"; read together this week: ",(s.togetherDays||[]).filter(d=>days7.indexOf(d)>=0).length);
  const rr=s.reread||[];if(rr.length){const byL={};rr.forEach(r=>{(byL[r.t]=byL[r.t]||[]).push(r.w/(r.ms/60000));});
    p("Reread speed (median words a minute, last 5 per level): ",Object.keys(byL).sort((a,b)=>a-b).map(t=>"L"+t+" "+Math.round(median(byL[t].slice(-5)))).join(", "));}
  else p("Rereads: none yet");
  p("Story quests: The Letter Thief chapter ",(s.quest||{}).ch||0," of 6",(s.quest||{}).done?" (done)":"","; The Sleepy Volcano chapter ",(s.quest2||{}).ch||0," of 6",(s.quest2||{}).done?" (done)":"");
  p("");
  // ---- jobs, math, factory ----
  const xp=(s.jobs&&s.jobs.xp)||{};
  p("Jobs: ",Object.keys(xp).length?Object.entries(xp).map(([j,n])=>j+" "+n+" tasks").join(", "):"no shifts yet");
  const math=s.tracks&&s.tracks.math&&s.tracks.math.stats;
  if(math&&Object.keys(math).length)p("Math at the jobs: ",Object.entries(math).map(([k,v])=>k+" "+(v.right||0)+"/"+(v.seen||0)).join(", "));else p("Math at the jobs: none yet");
  if(s.factory)p("Factory: level ",s.factory.lvl||0," reached, stars ",sum(s.factory.stars),s.factory.sandbox?", sandbox saved":"");
  // Word Dungeons: cleared, monster friends, the team, battles won, and how often a run started over
  const dg=s.dungeon;
  if(dg&&dg.stats){const st=dg.stats,cl=Object.keys(dg.cleared||{}),fr=Object.keys(dg.friends||{});
    p("Dungeons: ",cl.length?"cleared "+cl.join(", "):"none cleared yet",", friends ",fr.length?fr.join(", "):"none",", team ",(dg.team||[]).join(", ")||"not picked",
      ", battles won ",st.wins||0," of ",st.battles||0,", runs ",st.runs||0,", restarts ",st.restarts||0,", hearts ",dg.maxHearts||3);}
  else p("Dungeons: not visited yet");
  // ---- holidays, looks ----
  const looks=Object.entries(s.looks||{}).map(([k,v])=>k+" "+((v&&v.pieces)||[]).length+" pieces").join(", ");
  p("Looks: ",s.look?"wearing "+s.look:"the plain valley",looks?"; earned: "+looks:"");
  const hol=[];if(s.trick&&s.trick.nights)hol.push("Trick-or-Read nights "+s.trick.nights);if(s.feast&&s.feast.tables)hol.push("feast tables "+s.feast.tables);if(s.lights&&s.lights.doors&&s.lights.doors.length)hol.push("advent doors "+s.lights.doors.length);
  if(hol.length)p("Holidays: ",hol.join(", "));
  p("Valley: ",(s.critters||[]).length," animals, ",(s.vehicles||[]).length," vehicles, ",Object.keys(s.grid||{}).length," buildings, ",(s.badges||[]).length," badges");
  p("Settings: goal ",(s.settings||{}).goal," words, fast track ",(s.settings||{}).fastTrack?"on":"off",", say it ",(s.settings||{}).speech?"on":"off",", talk to me ",(s.settings||{}).talk?"on":"off",
    ", save battery ",(s.settings||{}).saver===false?"off":"on");
  // ---- reading against national norms: the one-minute reading checks (Grown-up menu -> Progress) ----
  const fl=s.fluency||{},fc=(fl.checks||[]).slice(-3).reverse();
  p("School grade: ",fl.grade?({K:"kindergarten","1":"1st grade","2":"2nd grade"}[fl.grade]||fl.grade):"not set",
    "; one-minute reading checks: ",fc.length?fc.map(c=>c.d+" "+c.wcpm+" words correct a minute, "+c.acc+"% right ("+c.grade+", "+c.season+")").join("; "):"none yet");
  // ---- the microphone: the last test (Grown-up menu → Settings → Microphone check) and the last recording that could not start ----
  const mc=s.micCheck,me=s.micErr;
  p("Microphone: ",mc?("tested "+new Date(mc.at).toLocaleString()+": "+(mc.ok?"works (level "+mc.peak+")":"failed, "+mc.err)+" at "+mc.origin+(mc.perm?", permission "+mc.perm:"")):"never tested",
    me?("; last failure "+new Date(me.at).toLocaleString()+" in "+me.where+": "+me.err+" at "+me.origin):"; no failures noted");
  // ---- Say it: the last 20 tries, and the words that know his voice (Grown-up menu → Settings → Teach the game his voice) ----
  const tk=s.talk||{},vo=tk.voice||{},vw=Object.keys(vo).filter(k=>vo[k]>0).sort((a,b)=>vo[b]-vo[a]||(a<b?-1:1));
  const sy=(Array.isArray(tk.log)?tk.log:[]).filter(x=>x&&x.from==="sayit").slice(-20);
  p("");
  p("Say it (the last ",sy.length," tries, newest last; ✓ read right, · not this time):",sy.length?"":" none yet");
  sy.forEach(e=>p("  ",sayIt(e)));
  p("  ",vw.length," word",vw.length===1?" knows":"s know"," his voice",vw.length?": "+vw.map(k=>k+" "+vo[k]).join(", "):"",
    "; ",tk.tpl||0," clips of his voice banked in all, ",snap.tplKept||0," of them kept in this backup");
  // ---- the NAS listener: the times it didn't answer (state.talk.aErr, the last 20) ----
  const ae=(Array.isArray(tk.aErr)?tk.aErr:[]).filter(x=>x&&x.why);
  if(ae.length){const by={};ae.forEach(x=>{by[x.why]=(by[x.why]||0)+1;});const last=ae[ae.length-1];
    p("NAS listener: didn't answer ",ae.length," time",ae.length===1?"":"s",", the last ",new Date(last.at).toLocaleString()," (",last.why,", ",(last.ms/1000).toFixed(1)," s): ",
      Object.keys(by).map(k=>k+" "+by[k]).join(", "));}
  else p("NAS listener: no misses noted");
  // ---- battery: the grown-up's checks (Grown-up menu → Settings → Battery check) and the game's own clues ----
  const pw=s.power||{},ck=(pw.checks||[]).slice(-5).reverse();
  p("");
  p("Battery checks (the last 5): ",ck.length?"":"none yet");
  ck.forEach(c=>p("  ",c.d,"  about ",c.pctPerHour,"% an hour (save battery ",c.saver?"on":"off",")  ",c.min," min, ",c.pct0,"% to ",c.pct1,"%  ",
    Object.entries(c.modes||{}).map(([k,v])=>(NAMES[k]||k)+" "+v).join(", "),c.ver?"  ["+c.ver+"]":""));
  if(pw.cur)p("  a check is under way: since ",new Date(pw.cur.t0).toLocaleString()," at ",pw.cur.pct0,"%");
  const wk=days7.map(d=>(pw.days||{})[d]).filter(Boolean),t=k=>wk.reduce((a,x)=>a+(+x[k]||0),0),on=t("on");
  if(on)p("This week's battery clues: on screen ",on," min, resting ",Math.round(t("rest")/on*100),"% of it, ~",t("n")?Math.round(t("an")/t("n")):0," animations running, frames ",
    t("fn")?(t("fm")/t("fn")).toFixed(1)+" ms ("+Math.round(t("fs")/t("fn")*100)+"% over 34 ms)":"not measured");
  return L.join("\n");
}

(async()=>{
  const file=arg("--file");
  const snap=strip(file?JSON.parse(fs.readFileSync(file,"utf8")):await fetchLatest());
  if(args.includes("--json"))console.log(JSON.stringify(snap,null,1));else console.log(report(snap));
})().catch(e=>{console.error("progress: "+e.message);process.exit(1);});
