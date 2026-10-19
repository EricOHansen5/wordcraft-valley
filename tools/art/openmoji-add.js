// Adds OpenMoji pictures (openmoji.org, CC BY-SA 4.0) to app/art/openmoji.js as one set, the way the other sets are kept:
// the inside of each 72x72 colour SVG, scaled to the game's 100x100 box, ASCII only.
//   node tools/art/openmoji-add.js OMD "Word Dungeons monsters, tiles and items" m_dot=1F9A0 t_pot=1F3FA ...
// A set that is already there is replaced whole; the other sets are left as they are. Needs the network (GitHub), once,
// while building; the game itself never fetches art.
"use strict";
const fs=require("fs"),path=require("path"),https=require("https");
const FILE=path.join(__dirname,"../../app/art/openmoji.js");
const URL=hex=>`https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/${hex}.svg`;
const get=u=>new Promise((res,rej)=>https.get(u,r=>{if(r.statusCode!==200){rej(new Error(u+" -> "+r.statusCode));r.resume();return;}
  let b="";r.setEncoding("utf8");r.on("data",c=>b+=c);r.on("end",()=>res(b));}).on("error",rej));
// the inside of the <svg>, without ids, comments and line breaks, in the scale the other entries use (100/72)
function inner(svg){
  const m=svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);if(!m)throw new Error("not an svg");
  const body=m[1].replace(/<!--[\s\S]*?-->/g,"").replace(/\s+id="[^"]*"/g,"").replace(/>\s+</g,"><").trim();
  return`<g transform='scale(1.38889)'>${body}</g>`;
}
const ascii=s=>s.replace(/[^\x00-\x7f]/g,ch=>"\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0"));
(async()=>{
  const [set,title,...pairs]=process.argv.slice(2);
  if(!/^OM[A-Z]*$/.test(set||"")||!pairs.length){console.log("usage: openmoji-add.js <SET> <title> id=HEX ...");process.exit(1);}
  const lines=[];
  for(const p of pairs){const [id,hex]=p.split("=");const svg=await get(URL(hex.toUpperCase()));
    lines.push(`  ${id}:${ascii(JSON.stringify(inner(svg)))}`);console.log("got",id,hex);}
  let s=fs.readFileSync(FILE,"utf8");
  const block=`// ${set}: ${title}\n${set}:{\n${lines.join(",\n")}\n}`;
  const re=new RegExp(`// ${set}: [^\\n]*\\n${set}:\\{[\\s\\S]*?\\n\\}(?=,?\\n)`);
  if(re.test(s))s=s.replace(re,()=>block);
  else{const end=s.lastIndexOf("\n};");if(end<0)throw new Error("no end of WCV.openmoji");s=s.slice(0,end)+",\n"+block+s.slice(end);}
  fs.writeFileSync(FILE,s);console.log(`${set}: ${pairs.length} pictures written to app/art/openmoji.js`);
})().catch(e=>{console.log("FAILED: "+e.message);process.exit(1);});
