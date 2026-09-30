// Tracks (jsdom, no browser): 200 seeds per math level give the right answer, and it is among the choices; the same seed
// makes the same question; shown math text has no words to decode. The grade 1 levels for the Mail carrier and the Baker
// (tens and ones, ABC order, steps in order, halves and quarters, o'clock) too: order questions never start in order, and
// what a job passes (its house number, its names, its steps, the bread) is used. Also Read.once, and Jobs.register / Jobs.gen skipping
// a step whose kit or track this version doesn't have, with a console warning and no crash.
const fs=require("fs"),path=require("path"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=require("./page").html(),errors=[],warns=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){},context:null});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createDynamicsCompressor:()=>Object.assign(node(),{threshold:P(),ratio:P()}),
    createPeriodicWave:()=>({}),createBuffer:(ch,len)=>({getChannelData:()=>new Float32Array(len)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};
  w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.URL.createObjectURL=()=>"blob:x";
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
  w.fetch=()=>Promise.reject(new Error("offline"));
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
}});
let pass=0,fail=0;
const ok=(c,m)=>{if(c)pass++;else fail++;console.log((c?"PASS ":"FAIL ")+m);};
setTimeout(()=>{
  const w=dom.window,E=s=>w.eval(s);
  ok(!errors.length,"the page loads without errors"+(errors.length?": "+errors[0]:""));
  // 1. the math track: the K–1 levels
  const want=["count10","count20","compare","add10","sub10","add20","coins20"],want2=["place","alpha","seq","frac","time"];
  const levels=E(`Tracks.get("math").levels.map(l=>({id:l.id,grade:l.grade}))`);
  ok(JSON.stringify(levels.map(l=>l.id))===JSON.stringify(want.concat(want2))&&levels.every(l=>l.grade==="K"||l.grade==="1")&&levels.filter(l=>want2.indexOf(l.id)>=0).every(l=>l.grade==="1"),
    "the math track has the K–1 levels, then the grade 1 ones: "+levels.map(l=>l.id+" ("+l.grade+")").join(", "));
  // what each level may ask: [smallest, largest] answer, and a rule on its numbers
  const RANGE={count10:[1,10],count20:[11,20],compare:[1,10],add10:[2,10],sub10:[1,9],add20:[11,20],coins20:[2,20]};
  const within={
    count10:q=>q.math.n>=1&&q.math.n<=10&&q.art.n===q.math.n,
    count20:q=>q.math.n>=11&&q.math.n<=20&&q.art.n===q.math.n,
    compare:q=>q.math.a!==q.math.b&&q.math.a>=1&&q.math.a<=10&&q.math.b>=1&&q.math.b<=10&&q.choices.length===2,
    add10:q=>q.math.a>=1&&q.math.b>=1&&q.math.a+q.math.b<=10,
    sub10:q=>q.math.a<=10&&q.math.b>=1&&q.math.b<q.math.a&&q.art.n===q.math.a&&q.art.gone===q.math.b,
    add20:q=>q.math.a<=10&&q.math.b<=10&&q.math.a+q.math.b>=11&&q.math.a+q.math.b<=20,
    coins20:q=>q.math.coins.every(c=>c===1||c===5||c===10)&&q.math.coins.filter(c=>c===1).length<=4&&
      q.math.coins.every((c,i,a)=>!i||a[i-1]>=c)};
  const ANS=q=>{const m=q.math;return m.op==="+"?m.a+m.b:m.op==="-"?m.a-m.b:m.op==="count"?m.n:m.op==="more"?Math.max(m.a,m.b):
    m.op==="fewer"?Math.min(m.a,m.b):m.op==="coins"?m.coins.reduce((x,y)=>x+y,0):NaN;};
  for(const id of want){
    const qs=E(`Array.from({length:200},(_,s)=>Tracks.gen("math","${id}",s))`),again=E(`Array.from({length:200},(_,s)=>Tracks.gen("math","${id}",s))`);
    const bad=[],answers=new Set();
    qs.forEach((q,s)=>{
      const vals=(q.choices||[]).map(c=>c&&typeof c==="object"?c.v:c);answers.add(q.ans);
      if(!Number.isInteger(q.ans))bad.push(`seed ${s}: the answer ${q.ans} is not a whole number`);
      if(ANS(q)!==q.ans)bad.push(`seed ${s}: ${JSON.stringify(q.math)} gives ${ANS(q)}, not ${q.ans}`);
      if(vals.indexOf(q.ans)<0)bad.push(`seed ${s}: ${q.ans} is not among the choices ${vals}`);
      if(new Set(vals).size!==vals.length)bad.push(`seed ${s}: the choices repeat ${vals}`);
      if(q.ans<RANGE[id][0]||q.ans>RANGE[id][1])bad.push(`seed ${s}: ${q.ans} is outside ${RANGE[id]}`);
      if(!within[id](q))bad.push(`seed ${s}: the numbers are not right for ${id}: ${JSON.stringify(q.math)}`);
      if(!["pick","pad"].includes(q.kit))bad.push(`seed ${s}: kit ${q.kit}`);
      if(!q.say||![].concat(q.say).join(" ").trim())bad.push(`seed ${s}: nothing to say`);
      if(q.text&&/[A-Za-z]/.test(q.text))bad.push(`seed ${s}: the shown text has words in it: ${q.text}`);
      if(q.track!=="math"||q.level!==id)bad.push(`seed ${s}: not stamped with its track and level`);
      if(JSON.stringify(q)!==JSON.stringify(again[s]))bad.push(`seed ${s}: not the same question twice`);});
    ok(!bad.length&&answers.size>=5,`math ${id}: 200 seeds, answers right and among the choices, same seed same question (${answers.size} different answers)`+(bad.length?" — "+bad.slice(0,4).join(" | "):""));
  }
  // the grade 1 levels: each question checked by what it is
  const J=s=>JSON.parse(E(`JSON.stringify(${s})`));
  const vals=q=>(q.choices||[]).map(c=>c&&typeof c==="object"?c.v:c);
  const perm=q=>{const v=vals(q).map(String),a=[].concat(q.ans).map(String);return a.length===v.length&&new Set(v).size===v.length&&a.slice().sort().join("|")===v.slice().sort().join("|");};
  const first=w=>String(w).charAt(0).toUpperCase();
  const CUP={"1/2":.5,"1/4":.25,"1":1};
  const CHECK2={
    place:q=>q.kit==="pad"?q.math.op==="place"&&q.ans===q.math.tens*10+q.math.ones&&q.ans>=10&&q.ans<=99&&q.art.kind==="blocks"&&q.art.tens===q.math.tens&&q.art.ones===q.math.ones
      :q.kit==="pick"&&q.math.op==="house"&&q.ans===q.math.n&&q.ans>=10&&q.ans<=99&&q.choices.length===3&&q.choices.every(c=>c.v>=10&&c.v<=99&&c.art.kind==="house"&&c.art.n===c.v)&&q.art.tens*10+q.art.ones===q.ans,
    alpha:q=>q.kit==="order"&&q.ans.length===3&&new Set(q.ans.map(first)).size===3&&q.ans.every((w,i,a)=>!i||first(a[i-1])<first(w))&&q.ans.join("|")===q.math.words.join("|"),
    seq:q=>q.kit==="order"&&q.ans.length>=3&&q.ans.length<=4&&(q.math.op==="sort"?q.math.nums.every((n,i,a)=>!i||a[i-1]<n)&&q.ans.join()===q.math.nums.join():q.math.op==="seq"&&q.ans.join("|")===q.math.steps.join("|")),
    frac:q=>q.kit==="pick"&&CUP[q.ans]!=null&&q.ans===q.math.of&&q.choices.length===3&&q.choices.every(c=>c.art.kind==="cup"&&c.art.f===CUP[c.v]),
    time:q=>q.kit==="pick"&&q.ans===q.math.start+q.math.add&&q.ans>=1&&q.ans<=12&&q.math.add>=0&&q.math.add<=3&&q.choices.length===3&&q.choices.every(c=>c.art.kind==="clock"&&c.art.h===c.v)&&(!q.math.add||!!q.art&&q.art.h===q.math.start)};
  for(const id of want2){
    const qs=J(`Array.from({length:200},(_,s)=>Tracks.gen("math","${id}",s))`),again=J(`Array.from({length:200},(_,s)=>Tracks.gen("math","${id}",s))`);
    const bad=[],kinds=new Set(),answers=new Set();
    qs.forEach((q,s)=>{
      const v=vals(q);kinds.add(q.kit+":"+(q.math&&q.math.op));answers.add([].concat(q.ans).join("|"));
      if(q.kit==="pick"&&(v.indexOf(q.ans)<0||new Set(v.map(String)).size!==v.length))bad.push(`seed ${s}: ${q.ans} is not once among the choices ${v}`);
      if(q.kit==="order"&&!perm(q))bad.push(`seed ${s}: the answer ${q.ans} is not the cards ${v} in some order`);
      if(q.kit==="order"&&v.map(String).join("|")===q.ans.map(String).join("|"))bad.push(`seed ${s}: the cards start out in order`);
      if(!["pick","pad","order"].includes(q.kit))bad.push(`seed ${s}: kit ${q.kit}`);
      if(!CHECK2[id](q))bad.push(`seed ${s}: not right for ${id}: ${JSON.stringify(q.math)} → ${JSON.stringify(q.ans)}`);
      if(!q.say||![].concat(q.say).join(" ").trim())bad.push(`seed ${s}: nothing to say`);
      if(q.text&&/[A-Za-z]/.test(q.text))bad.push(`seed ${s}: the shown text has words in it: ${q.text}`);
      if(q.track!=="math"||q.level!==id)bad.push(`seed ${s}: not stamped with its track and level`);
      if(JSON.stringify(q)!==JSON.stringify(again[s]))bad.push(`seed ${s}: not the same question twice`);});
    const both={place:["pick:house","pad:place"],seq:["order:sort","order:seq"],time:["pick:time"]}[id]||[];
    ok(!bad.length&&answers.size>=3&&both.every(k=>kinds.has(k)),`math ${id}: 200 seeds, answers right and among the choices, same seed same question (${[...kinds].join(", ")}; ${answers.size} different answers)`+(bad.length?" — "+bad.slice(0,4).join(" | "):""));
  }
  const names=J(`["place","alpha","seq","frac","time"].map(id=>Tracks.levelName("math",id))`).join(" · ");
  ok(names==="Tens and ones (house numbers) · ABC order · Putting steps in order · Halves and quarters · Telling time to the hour","each has a plain-English name for the report: "+names);
  // what a job passes is used
  const h=J(`Tracks.gen("math","place",3,{kind:"house",n:34})`);
  ok(h.kit==="pick"&&h.ans===34&&vals(h).indexOf(43)>=0&&vals(h).some(x=>x===24||x===44)&&h.say.join(" ")==="Which house is 34?","place {kind:house, n:34}: “Which house is 34?” among "+vals(h).join(", "));
  const pads=J(`Array.from({length:40},(_,s)=>Tracks.gen("math","place",s,{kind:"blocks"}))`);
  ok(pads.every(q=>q.kit==="pad")&&pads.some(q=>q.say.join(" ")===`${q.math.tens} tens and ${q.math.ones} ones. What number is that?`),"place {kind:blocks}: on the pad, “3 tens and 4 ones. What number is that?”");
  const al=J(`Array.from({length:40},(_,s)=>Tracks.gen("math","alpha",s,{words:["Sam","Bob","Kim","Ben","Tess"],art:"letter",say:["Put the letters in the bag in ABC order!"]}))`);
  ok(al.every(q=>q.ans.every(w=>["Sam","Bob","Kim","Ben","Tess"].indexOf(w)>=0)&&!(q.ans.indexOf("Bob")>=0&&q.ans.indexOf("Ben")>=0)&&q.choices.every(c=>c.art&&c.art.kind==="letter")&&q.say[0]==="Put the letters in the bag in ABC order!"),
    "alpha {words}: the job's names, one per first letter, on letters: "+al.slice(0,3).map(q=>q.ans.join(" < ")).join(" · "));
  const sq=J(`Array.from({length:20},(_,s)=>Tracks.gen("math","seq",s,{steps:[{text:"Mix it."},{text:"Then cut it."},{text:"Last, eat it."}]}))`);
  ok(sq.every(q=>q.ans.join("|")==="Mix it.|Then cut it.|Last, eat it."&&vals(q).join("|")!==q.ans.join("|")),"seq {steps}: the job's steps, in its order, never shown in order");
  const tb=J(`Array.from({length:40},(_,s)=>Tracks.gen("math","time",s,{bake:true}))`);
  ok(tb.every(q=>q.math.add>=1&&/^The (bread|cake) bakes for|^The buns bake for/.test(q.say[0])&&q.say.slice(-1)[0]==="When is it done?"),"time {bake:true}: always when the bread is done: "+tb[0].say.join(" "));
  ok(J(`Tracks.gen("math","frac",1,{ans:"1/4"})`).ans==="1/4","frac {ans}: the cup the job asks for");

  ok(E(`(()=>{const q=Tracks.gen("math","add10",7,{thing:"hat",max:5});return q.art.groups.every(g=>g.thing==="hat"&&g.n<=5)&&q.math.a<=5&&q.math.b<=5;})()`),
    "a job can choose what is counted and keep the groups small (thing: hat, max: 5)");
  const lines=E(`Jobs.voiceLines()`);
  ok(lines.includes("How many in all?")&&lines.includes("How much money is this?")&&lines.includes("Read the order. Find it on the shelf!")&&lines.every(l=>!/\d/.test(l))&&
    ["Which house is","tens and","ten and","ones.","one.","What number is that?","Put them in ABC order!","What comes first?","Put them in order!","Put the numbers in order.","Start with the smallest!",
     "Which cup is half full?","Which cup is a quarter full?","Which cup is all the way full?","Which clock says","o'clock?","o'clock.","The bread bakes for","The cake bakes for","The buns bake for",
     "hour.","hours.","It went in at","When is it done?","Read the letter. Find the mailbox!","Read the letter. Find the street!","Read the note. Take the letter to the house!",
     "Put the letters in the bag in ABC order!","Read the recipe. Put the steps in order!","Read the recipe. What do you need?","Time to bring the mail! Read each letter.",
     "Welcome to the bakery! Read each recipe.","Your mail cart is ready!","Your rolling pin is ready!"].every(l=>lines.includes(l)),
    `Jobs.voiceLines(): ${lines.length} fixed lines for the voice list, no numbers in them`);

  // 2. Read.once: the first call goes through with its arguments, repeats are ignored
  ok(E(`(()=>{const got=[];const f=Read.once((a,b)=>{got.push([a,b]);return "first";});const r=[f(1,2),f(3,4),f(5)];return JSON.stringify({got,r});})()`)===
    JSON.stringify({got:[[1,2]],r:["first",null,null]}),"Read.once passes the first call on and ignores the rest");

  // 3. an unknown kit or track is skipped with a warning, never a crash
  w.console.warn=(...a)=>warns.push(a.join(" "));
  const r=E(`(()=>{
    const bad=Jobs.register(null);
    const j=Jobs.register({id:"zz_test",name:"Test job",icon:"🧪",unlock:{tier:1},pay:{perTask:1},
      tasks:[{id:"a",gen:()=>[{kit:"juggle",track:"math",ans:1},{kit:"pad",track:"painting",ans:1},{kit:"pad",track:"math",say:"One?",ans:1}]},
        {id:"b"},{id:"c",gen:()=>{throw new Error("oops");}}]});
    const out={bad,tasks:j.tasks.map(t=>t.id),steps:Jobs.gen("zz_test","a",1).map(q=>q.kit+"/"+q.track),thrown:Jobs.gen("zz_test","c",1).length};
    return JSON.stringify(out);})()`);
  const R=JSON.parse(r);
  ok(R.bad===null&&R.tasks.join()==="a,c"&&R.steps.join()==="pad/math"&&R.thrown===0,
    "Jobs.register/gen: a task with no generator is left out, an unknown kit or track skips that step, a generator that throws makes no task: "+r);
  ok(warns.some(x=>/no kit "juggle"/.test(x))&&warns.some(x=>/no track "painting"/.test(x))&&warns.some(x=>/could not make a task/.test(x)),
    "…each with a console warning: "+warns.length+" warnings");
  ok(!errors.length,"no page errors");
  console.log(`tracks: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
},1200);
