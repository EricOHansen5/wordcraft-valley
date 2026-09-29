// Factory engine (jsdom, no browser, a few seconds): every level's stored known solution finishes its order within the
// level's time limit, with three stars, the same on 3 runs in a row; each machine gives the right thing (mixer, splitter,
// sorter, stamper, tunnel); the hand-off rules; a layout survives its short string; a jammed layout shows the right tip;
// the order and sum pieces; the page boots without errors.
const fs=require("fs"),path=require("path"),{JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
const html=fs.readFileSync(path.join(__dirname,"../app/index.html"),"utf8"),errors=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,beforeParse(w){
  w.indexedDB=fdb.indexedDB;w.IDBKeyRange=fdb.IDBKeyRange;
  const P=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({connect(x){return x||node();},start(){},stop(){},frequency:P(),gain:P(),Q:P(),detune:P(),type:"",buffer:null,loop:false,setPeriodicWave(){},context:null});
  w.AudioContext=function(){return{currentTime:0,sampleRate:44100,state:"running",destination:{},close(){},resume(){return Promise.resolve();},
    createOscillator:node,createGain:node,createBiquadFilter:node,createBufferSource:node,createDynamicsCompressor:()=>Object.assign(node(),{threshold:P(),ratio:P()}),
    createPeriodicWave:()=>({}),createBuffer:(ch,len)=>({getChannelData:()=>new Float32Array(len)})};};
  w.speechSynthesis={cancel(){},getVoices:()=>[],addEventListener(){},speak(u){u.onend&&u.onend();}};
  w.SpeechSynthesisUtterance=function(t){this.text=t;};w.Audio=function(){return{play:()=>Promise.resolve()};};
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.URL.createObjectURL=()=>"blob:x";
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});w.fetch=()=>Promise.reject(new Error("offline"));
  w.onerror=(m,s,l,c,e)=>errors.push(e?e.stack.split("\n").slice(0,3).join(" | "):m);
}});
const w=dom.window,E=f=>w.eval("("+f.toString()+")()");
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?"PASS ":"FAIL ")+m);};
const J=x=>JSON.stringify(x);
setTimeout(()=>{
  ok(!errors.length,"the page boots with no errors"+(errors.length?": "+errors[0]:""));

  // ---- 1. every level's known solution, three runs ----
  const lv=E(()=>Factory.LEVELS.map(L=>{const r=[1,2,3].map(()=>Factory.sim(L.n));
    return{id:L.id,limit:L.limit,budget:L.budget,a:r[0],same:JSON.stringify(r[0])===JSON.stringify(r[1])&&JSON.stringify(r[1])===JSON.stringify(r[2]),len:L.sol.length,cells:L.rows.length*L.rows[0].length};}));
  ok(lv.length===12,"twelve levels, F1–F12");
  lv.forEach(L=>ok(L.a.done&&L.a.sec<=L.limit&&L.a.stars===3&&L.same&&L.len===L.cells,
    `${L.id}: the known solution finishes in ${L.a.sec} s (limit ${L.limit} s), ${L.a.pieces} of ${L.budget} pieces, heat ${L.a.hot}, 3 stars, the same 3 runs in a row`));

  // ---- 2. the machines ----
  const m=E(()=>{
    const F=FactoryEngine,K=F.K,run=(rows,build,ticks)=>{const x=F.make(rows),id=(c,r)=>r*x.W+c;build(x,id);F.reset(x);for(let t=0;t<ticks;t++)F.tick(x);return x;};
    const belts=(x,id,c,r,moves)=>{for(const mv of moves){F.put(x,id(c,r),K.BELT,"NESW".indexOf(mv));c+=F.DX["NESW".indexOf(mv)];r+=F.DY["NESW".indexOf(mv)];}};
    const got=x=>{const o={};for(let i=0;i<x.got.length;i++)if(x.got[i])o[i]=x.got[i];return o;};
    const out={};
    // mixer: red + blue from two sides, the mixed bar to the truck; each pair of colours
    [["r","b",19],["b","y",22],["r","y",21]].forEach(([a,b,want])=>{
      const x=run([`.${a}...`,"....",`.${b}...`,"...T"],(x,id)=>{F.put(x,id(1,0),K.DRILL,2);F.put(x,id(1,1),K.MIXER,1);F.put(x,id(1,2),K.DRILL,0);belts(x,id,2,1,"ES");F.put(x,id(3,2),K.BELT,2);},400);
      out["mix "+a+b]=got(x);out["mix "+a+b+" want"]=want;});
    // a mixer never takes a second of the same colour: two red drills, nothing comes out
    {const x=run([".r..","....",".r..","...T"],(x,id)=>{F.put(x,id(1,0),K.DRILL,2);F.put(x,id(1,1),K.MIXER,1);F.put(x,id(1,2),K.DRILL,0);belts(x,id,2,1,"ES");F.put(x,id(3,2),K.BELT,2);},400);
     out.dup={got:got(x),mask:x.mask[1*4+1]};}
    // splitter: one red drill; ahead to the truck as red rocks, to the side into a mixer with blue (purple bars)
    {const x=run(["r.....T",".......",".......",".b....."],(x,id)=>{F.put(x,id(0,0),K.DRILL,1);F.put(x,id(1,0),K.SPLIT,1);belts(x,id,2,0,"EEEE");
       belts(x,id,1,1,"S");F.put(x,id(1,2),K.MIXER,1);F.put(x,id(1,3),K.DRILL,0);belts(x,id,2,2,"EEEENN");},30*20);
     out.split=got(x);}
    // sorter: red and blue on one belt; blue goes off to the side into a mixer with yellow (green), red straight on to the truck
    {const x=run(["rb......","........","....T...","...y....","......T."],(x,id)=>{F.put(x,id(0,0),K.DRILL,2);F.put(x,id(1,0),K.DRILL,2);belts(x,id,0,1,"EEE");
       F.put(x,id(3,1),K.SORT,1,2);F.put(x,id(3,2),K.MIXER,1);F.put(x,id(3,3),K.DRILL,0);belts(x,id,4,1,"EESSS");},30*20);
     out.sort=got(x);}
    // stamper: a purple bar in, a purple toy out
    {const x=run([".r..","....",".b..","...T"],(x,id)=>{F.put(x,id(1,0),K.DRILL,2);F.put(x,id(1,1),K.MIXER,1);F.put(x,id(1,2),K.DRILL,0);F.put(x,id(2,1),K.STAMP,1);F.put(x,id(3,1),K.BELT,2);F.put(x,id(3,2),K.BELT,2);},500);
     out.stamp=got(x);}
    // tunnel: red goes under the blue belt that crosses its path; blue keeps going too
    {const rows=["..b..","..v..","r...T","..v..","..T.."];
     const x=run(rows.map(s=>s.replace(/v/g,".")),(x,id)=>{F.put(x,id(0,2),K.DRILL,1);F.put(x,id(1,2),K.TUNNEL,1);F.put(x,id(3,2),K.TUNNEL,1);F.put(x,id(2,0),K.DRILL,2);belts(x,id,2,1,"SSS");},30*20);
     out.tunnel={got:got(x),exit:F.tunnelExit(x,2*5+1),isExit:F.tunnelIsExit(x,2*5+3)};
     // too far: five cells apart do not link
     const y=F.make(["..........","T........."]);F.put(y,1,K.TUNNEL,1);F.put(y,7,K.TUNNEL,1);F.put(y,5,K.TUNNEL,3);
     out.far={a:F.tunnelExit(y,1),b:F.tunnelExit(y,5)};}
    // hand-offs: a belt never takes from the cell it points at; a splitter only from behind
    {const x=F.make(["...."]);F.put(x,1,K.BELT,3);F.put(x,2,K.SPLIT,1);
     out.hand={beltFromFront:F.deposit(x,1,1,0),beltFromSide:F.deposit(x,1,1,2),splitFront:F.deposit(x,2,1,3),splitBack:F.deposit(x,2,1,1)};}
    // a layout as a short string, and back
    {const L=Factory.LEVELS[11],x=F.make(L.rows);const n=F.decode(x,L.sol);out.code={n,same:F.encode(x)===L.sol,pieces:F.pieces(x)};
     const y=F.make(["r.","#T"]);out.code.fit=F.decode(y,"a"+"a"+"a"+"a");}     // drills only where there is ore
    return out;});
  ok(m["mix rb"][19]>=3&&Object.keys(m["mix rb"]).length===1,"mixer: red + blue make purple bars "+J(m["mix rb"]));
  ok(m["mix by"][22]>=3&&Object.keys(m["mix by"]).length===1,"mixer: blue + yellow make green "+J(m["mix by"]));
  ok(m["mix ry"][21]>=3&&Object.keys(m["mix ry"]).length===1,"mixer: red + yellow make orange "+J(m["mix ry"]));
  ok(!Object.keys(m.dup.got).length&&m.dup.mask===1,"mixer: a second red waits; it never mixes red with red "+J(m.dup));
  ok(m.split[1]>=5&&m.split[19]>=5&&Math.abs(m.split[1]-m.split[19])<=2&&Object.keys(m.split).length===2,"splitter: the rocks go ahead and to the side in turn "+J(m.split));
  ok(m.sort[1]>=5&&m.sort[22]>=5&&!m.sort[2]&&!m.sort[19]&&!m.sort[21],"sorter: blue goes off to the side (and is mixed into green), red goes straight on "+J(m.sort));
  ok(m.stamp[67]>=2&&Object.keys(m.stamp).length===1,"stamper: a purple bar becomes a purple toy "+J(m.stamp));
  ok(m.tunnel.got[1]>=10&&m.tunnel.got[2]>=10&&m.tunnel.exit===13&&m.tunnel.isExit,"tunnel: red goes under the blue belt to the truck, blue still gets through "+J(m.tunnel));
  ok(m.far.a===-1&&m.far.b===-1,"tunnel: two tunnels five cells apart, or facing each other, do not link "+J(m.far));
  ok(!m.hand.beltFromFront&&m.hand.beltFromSide&&!m.hand.splitFront&&m.hand.splitBack,"hand-offs: a belt never takes from where it points, a splitter only from behind "+J(m.hand));
  ok(m.code.same&&m.code.n===37&&m.code.pieces===37&&m.code.fit===1,"a layout survives its short string; a drill only goes on ore "+J(m.code));

  // ---- 3. the tips, through the real board (no canvas here) ----
  const tips=E(()=>{
    state.factory.lvl=12;window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};
    const F=FactoryEngine,K=F.K,out={};
    const lay=(n,build)=>{const L=Factory.LEVELS[n-1],x=F.make(L.rows);build(x,(c,r)=>r*x.W+c);return F.encode(x);};
    const path=(x,id,c,r,moves)=>{for(const mv of moves){F.put(x,id(c,r),K.BELT,"NESW".indexOf(mv));c+=F.DX["NESW".indexOf(mv)];r+=F.DY["NESW".indexOf(mv)];}};
    const tryIt=(name,n,code,ticks)=>{Factory.play(n);Factory._load(code);window.__said=[];Factory._run(ticks);const s=Factory._S();
      out[name]={tip:s.tip,said:window.__said.filter(t=>/waiting|line|trip/.test(t)),hot:s.hot,shown:(document.getElementById("fcTip")||{}).textContent||""};};
    // F6 with one mixer for four drills: overproduction
    tryIt("one mixer",6,lay(6,(x,id)=>{F.put(x,id(1,1),K.DRILL,2);F.put(x,id(2,1),K.DRILL,2);path(x,id,1,2,"EESS");F.put(x,id(1,7),K.DRILL,0);F.put(x,id(2,7),K.DRILL,0);path(x,id,1,6,"EENN");F.put(x,id(3,4),K.MIXER,1);path(x,id,4,4,"E");}),400);
    // F1: a belt that stops short of the truck (no splitter yet: the short tip)
    tryIt("dead end",1,lay(1,(x,id)=>{F.put(x,id(2,4),K.DRILL,1);path(x,id,3,4,"EEE");}),300);
    // F7: a splitter whose second belt goes nowhere: it fills up and stays full while the first one flows
    tryIt("full line",7,lay(7,(x,id)=>{F.put(x,id(1,4),K.DRILL,1);F.put(x,id(2,4),K.SPLIT,1);path(x,id,3,4,"EEEEEE");path(x,id,2,3,"NNEEEEEEEEE");}),1300);
    // F1: the long way round to the truck: transportation
    tryIt("long way",1,lay(1,(x,id)=>{F.put(x,id(2,4),K.DRILL,0);path(x,id,2,3,"NNNEEEEEEEEESSSSWW");}),150);
    return out;});
  ok(tips["one mixer"].tip==="drills"&&J(tips["one mixer"].said)===J(["The drills are waiting. The belt is full! Try a splitter."])&&tips["one mixer"].hot>=120,
    "one mixer for four drills: the belts go red and the buddy says to try a splitter "+J(tips["one mixer"]));
  ok(tips["dead end"].tip==="drills0"&&J(tips["dead end"].said)===J(["The drills are waiting. The belt is full!"]),"a belt that stops short, before the splitter is his: the short tip "+J(tips["dead end"]));
  ok(tips["full line"].tip==="wip"&&J(tips["full line"].said)===J(["Lots of rocks waiting in line!"]),"a belt going nowhere, full, beside one that flows: lots of rocks waiting in line "+J(tips["full line"]));
  ok(tips["long way"].tip==="long"&&J(tips["long way"].said)===J(["That's a long trip! Can the belt be shorter?"]),"the long way round: that's a long trip "+J(tips["long way"]));
  const quiet=E(()=>Factory.LEVELS.map(L=>{Factory.play(L.n);Factory._load(L.sol);window.__said=[];Factory._run(L.limit*30);return window.__said.filter(t=>/waiting|line|trip/.test(t)).length;}));
  ok(quiet.every(n=>n===0),"no level's known solution sets off a tip "+J(quiet));

  // ---- 4. orders and sums, as pieces with clips ----
  const q=E(()=>({f3:Factory.orderSay(Factory.LEVELS[2].order),f5:Factory.orderSay(Factory.LEVELS[4].order),s3:Factory.sumQ(Factory.LEVELS[2].order,"add10"),
    s1:Factory.sumQ(Factory.LEVELS[0].order,"count10"),s6:Factory.sumQ(Factory.LEVELS[5].order,"add10",Factory.LEVELS[5].sum),s10:Factory.sumQ(Factory.LEVELS[9].order,"add10","double"),
    s12:Factory.sumQ(Factory.LEVELS[11].order,"add20"),side:[0,1,2,3,4,5,6,7].map(k=>Factory.sideOrder(k))}));
  ok(J(q.f3)===J(["Send",4,"red","and",3,"yellow."])&&J(q.f5)===J(["Send",2,"purple,",2,"green","and",2,"orange."]),"orders are spoken as pieces: "+q.f3.join(" ")+" / "+q.f5.join(" "));
  ok(q.s3.ans===7&&q.s3.text==="4 🔴 + 3 🟡 = ?"&&J(q.s3.say)===J([4,"red","and",3,"yellow.","How many in all?"])&&q.s3.level==="add10"&&q.s3.track==="math","F3's sum: "+q.s3.text);
  ok(q.s1.ans===5&&q.s1.level==="count10"&&J(q.s1.say)===J(["How many did you send?"]),"F1 counts: "+q.s1.text);
  ok(q.s6.ans===6&&q.s6.text==="3 🟣 + 3 🟣 = ?"&&q.s10.ans===8&&q.s10.text==="2 + 2 + 2 + 2 = ?"&&q.s12.ans===20&&q.s12.level==="add20","F6 3 + 3, F10 doubling, F12 to 20: "+[q.s6.text,q.s10.text,q.s12.text].join(" | "));
  ok(q.side.every(o=>o.pay>=3&&o.pay<=6&&o.parts.length>=1&&o.parts.reduce((s,p)=>s+p[1],0)<=20&&/^(count|add)(10|20)$/.test(o.math)),"side orders pay 3–6 💎 and stay within 20 "+J(q.side.map(o=>o.parts.map(p=>p.join("×")).join("+")+"="+o.pay)));
  ok(!errors.length,"no errors while running "+errors.join(" | "));
  console.log(fails?`factory engine: ${fails} failed`:"factory engine: all passed");
  process.exit(fails?1:0);
},1500);
