// Voice text extractor: finds the fixed lines the game speaks and adds any new ones to voice_texts.json.
//
// Where it sits in the voice pipeline (run from the repo root, `npm run voice:extract`):
//   1. node tools/voice/extract.js   reads app/index.html, merges new lines into tools/voice/voice_texts.json
//   2. python gen.py <part> <parts>  (in tools/voice) renders a clip for every line that has none yet
//   3. python index.py               copies the clips into app/voice/ and rewrites app/voice/index.json
// tests/voice_cov.js then checks that every book page, quiz question and word has a clip.
//
// What it collects: every BOOKS page and quiz question ({pet} expanded over each pet the book can show,
// as Books.petWord() picks it), every word in allWords(), the QUEST_POOL texts, the Quest chapter stories
// and ending, and string literals passed to Sound.speak / Sound.say / buddySay (template strings with ${}
// are left out: they can never match a clip). Existing entries are never removed; the lists are deduped by
// the same norm() that gen.py, index.py and the game use, sorted, and written one entry per line so a diff
// shows exactly what is new. {hero} is expanded over def().hero if the game ever has one.
"use strict";
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"../..");
const HTML=path.join(ROOT,"app/index.html"),TEXTS=path.join(__dirname,"voice_texts.json");
// the same normalisation as VoicePack.norm in the game and norm in gen.py / index.py
const norm=t=>String(t).toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9' ]+/g," ").replace(/\s+/g," ").trim();

// ---------- the page, loaded in jsdom the way tests/regress.js does ----------
function load(){
  const {JSDOM}=require("jsdom"),fdb=require("fake-indexeddb");
  const html=fs.readFileSync(HTML,"utf8"),errors=[];
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
  const w=dom.window;
  // the data lives in top-level consts, which are reachable from eval but not as window properties
  const data=w.eval(`JSON.stringify({
    books:BOOKS.filter(b=>!b.mine).map(b=>({id:b.id,t:b.t,pages:b.pages.map(p=>p[0]),quiz:(b.quiz||[]).map(q=>q.q)})),
    words:allWords().map(x=>({w:x.w,t:x.t,tricky:!!x.tricky})),
    critters:CRITTERS.map(c=>c.id),
    quests:typeof QUEST_POOL!=="undefined"?QUEST_POOL.map(q=>q.t):[],
    hero:(def()||{}).hero||null})`);
  w.close();
  return Object.assign(JSON.parse(data),{html,errors});
}

// ---------- books: the pets a page can name ----------
// Books.petWord(t): the Mine pet if it is a plain (not tricky) word of level t or below, else "dog".
function petsFor(t,d){
  const word=id=>d.words.find(x=>x.w===id&&!x.tricky);
  return ["dog"].concat(d.critters.filter(id=>{const w=id!=="dog"&&word(id);return w&&w.t<=t;}));
}
function expand(s,t,d){
  let out=[s];
  if(/\{pet\}/.test(s))out=petsFor(t,d).map(p=>s.replace(/\{pet\}/g,p));
  if(d.hero)out=out.map(x=>x.replace(/\{hero\}/g,d.hero));
  return out;
}
// every book page and quiz question as the game can say it
function bookTexts(d){
  const out=[];
  d.books.forEach(b=>b.pages.concat(b.quiz).forEach(s=>expand(s,b.t,d).forEach(x=>out.push({text:x,from:"book "+b.id}))));
  return out;
}

// ---------- a small scan of the script for literal arguments ----------
function script(html){const out=[],re=/<script\b[^>]*>([\s\S]*?)<\/script>/g;let m;while((m=re.exec(html)))out.push(m[1]);return out.join("\n");}
// from src[i] (just after an opening bracket) to its closing bracket; skips strings, templates and comments
function balanced(src,i,open,close){
  let depth=1;const stack=[];
  for(;i<src.length;i++){const c=src[i];
    if(stack.length&&stack[stack.length-1]==="`"){
      if(c==="\\"){i++;continue;}
      if(c==="`"){stack.pop();continue;}
      if(c==="$"&&src[i+1]==="{"){stack.push("${");i++;}continue;}
    if(c==='"'||c==="'"){const q=c;for(i++;i<src.length&&src[i]!==q;i++)if(src[i]==="\\")i++;continue;}
    if(c==="`"){stack.push("`");continue;}
    if(c==="/"&&src[i+1]==="/"){while(i<src.length&&src[i]!=="\n")i++;continue;}
    if(c==="/"&&src[i+1]==="*"){i=src.indexOf("*/",i+2)+1;continue;}
    // inside ${ } of a template: braces are tracked on the stack, and the closing one goes back to the template
    if(c==="{"&&stack.length){stack.push("{");continue;}
    if(c==="}"&&stack.length){stack.pop();continue;}
    if(c==="("||c==="["||c==="{")depth++;
    else if(c===")"||c==="]"||c==="}"){if(--depth===0)return i;}
  }
  return -1;
}
// split an argument list on top-level commas (or on a given character)
function splitTop(s,sep=","){
  const out=[];let depth=0,cur="";
  for(let i=0;i<s.length;i++){const c=s[i];
    if(c==='"'||c==="'"||c==="`"){const j=c==="`"?templateEnd(s,i):strEnd(s,i);cur+=s.slice(i,j+1);i=j;continue;}
    if("([{".includes(c))depth++;else if(")]}".includes(c))depth--;
    if(c===sep&&depth===0){out.push(cur);cur="";continue;}
    cur+=c;}
  out.push(cur);return out.map(x=>x.trim());
}
function strEnd(s,i){const q=s[i];for(i++;i<s.length&&s[i]!==q;i++)if(s[i]==="\\")i++;return i;}
function templateEnd(s,i){for(i++;i<s.length;i++){if(s[i]==="\\"){i++;continue;}if(s[i]==="`")return i;if(s[i]==="$"&&s[i+1]==="{")i=balanced(s,i+2,"{","}");}return i;}
const LIT=/^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\$]|\\.|\$(?!\{))*`)$/;
// the strings an expression can be, when it is only literals (a literal, a ternary of literals, a const of one); else null
function literals(e,consts){
  e=e.trim();
  while(e[0]==="("&&balanced(e,1,"(",")")===e.length-1)e=e.slice(1,-1).trim();
  if(LIT.test(e))return[Function("return "+e)()];
  if(/^[A-Z_][A-Z0-9_]*$/.test(e)&&consts[e]!=null)return[consts[e]];
  // cond ? a : b, where a and b are literals (the condition can be anything)
  const q=topIndex(e,"?");if(q<0)return null;
  const rest=e.slice(q+1),c=topIndex(rest,":");if(c<0)return null;
  const a=literals(rest.slice(0,c),consts),b=literals(rest.slice(c+1),consts);
  return a&&b?a.concat(b):null;
}
function topIndex(s,ch){
  let depth=0;
  for(let i=0;i<s.length;i++){const c=s[i];
    if(c==='"'||c==="'"){i=strEnd(s,i);continue;}if(c==="`"){i=templateEnd(s,i);continue;}
    if("([{".includes(c))depth++;else if(")]}".includes(c))depth--;
    else if(depth===0&&c===ch){if(ch==="?"&&(s[i+1]==="."||s[i+1]==="?"||s[i-1]==="?"))continue;return i;}}
  return -1;
}
// literal strings passed to the functions that speak (Sound.say's text is its second argument)
function spokenLiterals(src){
  const consts={};let m;
  const re=/\bconst ([A-Z_][A-Z0-9_]*)=("(?:[^"\\]|\\.)*");/g;
  while((m=re.exec(src)))consts[m[1]]=JSON.parse(m[2]);
  const found=[],skipped=[];
  const call=/(?<![\w.])(Sound\.speak|Sound\.say|buddySay)\(/g;
  while((m=call.exec(src))){
    if(/function\s*$/.test(src.slice(Math.max(0,m.index-10),m.index)))continue;   // the definition
    const end=balanced(src,m.index+m[0].length,"(",")");if(end<0)continue;
    const args=splitTop(src.slice(m.index+m[0].length,end)),arg=m[1]==="Sound.say"?args[1]:args[0];
    if(!arg)continue;
    const l=literals(arg,consts);
    if(l)l.forEach(t=>found.push({text:t,from:m[1]}));
    else skipped.push(m[1]+"("+(arg.length>60?arg.slice(0,57)+"...":arg)+")");
  }
  return{found,skipped};
}
// Quest: the chapter stories and the ending (they are inside the module, so read from the source)
function questStories(src){
  const q=src.indexOf("const Quest=(()=>{");if(q<0)return[];
  const grab=name=>{const i=src.indexOf("const "+name+"=[",q);if(i<0)return[];const s=i+name.length+8,e=balanced(src,s,"[","]");
    return Function("return ["+src.slice(s,e)+"]")();};
  const out=[];
  grab("CH").forEach(c=>(c.story||[]).forEach(t=>out.push({text:t,from:"quest "+c.title})));
  grab("END").forEach(t=>out.push({text:t,from:"quest ending"}));
  return out;
}

// ---------- everything ----------
function collect(d){
  const src=script(d.html),sp=spokenLiterals(src);
  return{
    words:d.words.map(x=>({text:x.w,from:"word"})),
    sents:[].concat(bookTexts(d),d.quests.map(t=>({text:t,from:"quest pool"})),questStories(src),sp.found),
    skipped:sp.skipped,hero:!!d.hero,heroUsed:/\{hero\}/.test(src)};
}
const cmp=(a,b)=>{const x=norm(a),y=norm(b);return x<y?-1:x>y?1:a<b?-1:a>b?1:0;};
function merge(old,found){
  const out={words:[],sents:[]},keys=new Set(),added=[];
  // existing entries stay (a repeat of the same norm keeps its first spelling, the one gen.py used)
  ["words","sents"].forEach(k=>{const seen=new Set();(old[k]||[]).forEach(t=>{const n=norm(t);if(!n||seen.has(n))return;seen.add(n);keys.add(n);out[k].push(t);});});
  ["words","sents"].forEach(k=>found[k].forEach(({text,from})=>{const t=String(text).trim(),n=norm(t);
    if(!n||keys.has(n))return;keys.add(n);out[k].push(t);added.push({list:k,text:t,from});}));
  out.words.sort(cmp);out.sents.sort(cmp);
  return{out,added};
}
// one entry per line, ASCII only (gen.py and index.py open the file with the system encoding)
const write=o=>JSON.stringify(o,null,1).replace(/[\u007f-\uffff]/g,c=>"\\u"+c.charCodeAt(0).toString(16).padStart(4,"0"))+"\n";

module.exports={load,norm,collect,bookTexts,petsFor,merge,TEXTS};

if(require.main===module){
  const d=load();
  if(d.errors.length)console.log("page errors while loading (the lists below may be incomplete):\n  "+d.errors.join("\n  "));
  const found=collect(d),old=JSON.parse(fs.readFileSync(TEXTS,"utf8"));
  const {out,added}=merge(old,found);
  fs.writeFileSync(TEXTS,write(out));
  console.log(`voice_texts.json: ${out.words.length} words, ${out.sents.length} sentences; ${added.length} new line${added.length===1?"":"s"}`);
  added.forEach(a=>console.log(`  + [${a.list}] ${a.text}   (${a.from})`));
  if(found.heroUsed&&!found.hero)console.log("note: the page uses {hero} but def() has no hero name, so those lines were not expanded");
  // calls that speak a variable (a word, a page, a sign) get their text from data covered elsewhere; the ones
  // that build a line from fixed words and a value can never match a clip, so they are listed
  const built=found.skipped.filter(s=>/["'`]/.test(s));
  console.log(`not extracted: ${found.skipped.length} spoken calls whose text is chosen at run time; ${built.length} of them build it from fixed words and a value (device voice unless their pieces have clips):`);
  built.forEach(s=>console.log("  - "+s));
  if(added.length)console.log("next: cd tools/voice && python gen.py 0 1 && python index.py");
}
