// Tracks (jsdom, no browser): 200 seeds per math level give the right answer, and it is among the choices; the same seed
// makes the same question; shown math text has no words to decode. Also Read.once, and Jobs.register / Jobs.gen skipping
// a step whose kit or track this version doesn't have, with a console warning and no crash.
const fs=require("fs"),path=require("path"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=fs.readFileSync(path.join(__dirname,"../app/index.html"),"utf8"),errors=[],warns=[];
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
  const want=["count10","count20","compare","add10","sub10","add20","coins20"];
  const levels=E(`Tracks.get("math").levels.map(l=>({id:l.id,grade:l.grade}))`);
  ok(JSON.stringify(levels.map(l=>l.id))===JSON.stringify(want)&&levels.every(l=>l.grade==="K"||l.grade==="1"),
    "the math track has the K–1 levels: "+levels.map(l=>l.id+" ("+l.grade+")").join(", "));
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
  ok(E(`(()=>{const q=Tracks.gen("math","add10",7,{thing:"hat",max:5});return q.art.groups.every(g=>g.thing==="hat"&&g.n<=5)&&q.math.a<=5&&q.math.b<=5;})()`),
    "a job can choose what is counted and keep the groups small (thing: hat, max: 5)");
  const lines=E(`Jobs.voiceLines()`);
  ok(lines.includes("How many in all?")&&lines.includes("How much money is this?")&&lines.includes("Read the order. Find it on the shelf!")&&lines.every(l=>!/\d/.test(l)),
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
