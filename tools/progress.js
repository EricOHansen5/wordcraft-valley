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
  report:"reading report",job:"jobs",store:"trading post",closet:"closet",trick:"trick-or-read",feast:"feast table",lights:"light the tree",factory:"factory",talk:"talk to me",other:"other"};

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
  for(const k of Object.keys(s)){if(k==="sync"||k==="deviceId")continue;out[k]=s[k];}
  return{savedAt:snap.savedAt||null,state:out};
}
const day=d=>d.toISOString().slice(0,10);
const lastDays=n=>{const out=[];const t=new Date();for(let i=n-1;i>=0;i--){const d=new Date(t);d.setDate(t.getDate()-i);out.push(day(d));}return out;};
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+(+b||0),0);
const pad=(v,n,right)=>{v=String(v);return right?v.padStart(n):v.padEnd(n);};
const median=a=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y);const m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};

function report(snap){
  const s=snap.state,L=[];const p=(...x)=>L.push(x.join(""));
  const mastered=Object.values(s.stats||{}).filter(x=>x&&x.mastered).length,seen=Object.keys(s.stats||{}).length;
  p("Wordcraft Valley — progress (backup ",snap.savedAt||"?",")");
  p("hero ",s.hero||"Asher","  words read ",s.wordsRead||0,"  words tracked ",seen,"  mastered ",mastered,"  gems ",s.gems||0,"  coins ",(s.mine&&s.mine.coins)||0,"  best streak ",s.best||0);
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
