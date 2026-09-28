// Voice coverage (jsdom, no browser): every book page and quiz question (with each pet it can name) and every word
// has its own clip in app/voice/index.json. A line already listed in tools/voice/voice_texts.json whose clip is not
// generated yet is a WARN; a line missing from voice_texts.json too is a FAIL (run `npm run voice:extract`).
const fs=require("fs"),path=require("path");
const X=require("../tools/voice/extract.js");
const d=X.load();
const index=JSON.parse(fs.readFileSync(path.join(__dirname,"../app/voice/index.json"),"utf8"));
const listed=JSON.parse(fs.readFileSync(X.TEXTS,"utf8")),inList=new Set(listed.words.concat(listed.sents).map(X.norm));
const texts=X.bookTexts(d).concat(d.words.map(x=>({text:x.w,from:"word"})));
const seen=new Set(),warn=[],fail=[];
texts.forEach(({text,from})=>{const k=X.norm(text);if(!k||seen.has(k))return;seen.add(k);
  if(index[k])return;(inList.has(k)?warn:fail).push(`"${text}" (${from})`);});
if(d.errors.length)console.log("FAIL the page threw while loading: "+d.errors[0]);
warn.forEach(t=>console.log(`WARN ${t} (in voice_texts.json, clip not generated yet)`));
fail.forEach(t=>console.log(`FAIL no clip for ${t}, and it is not in voice_texts.json: run npm run voice:extract, then gen.py and index.py`));
if(!fail.length&&!d.errors.length)console.log(`PASS voice coverage: ${seen.size} texts`+(warn.length?` (${warn.length} waiting for a clip)`:""));
process.exitCode=fail.length||d.errors.length?1:0;
