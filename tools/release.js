// Bump the service-worker cache version so iPads pick up the new build. Run after every change to app/.
const fs=require("fs"),p=require("path").join(__dirname,"../app/sw.js");
const d=new Date().toISOString().slice(0,10);let s=fs.readFileSync(p,"utf8");
const cur=(s.match(/VERSION\s*=\s*"wcv-([\d-]+)([a-z])"/)||[]);
const next=cur[1]===d?String.fromCharCode(cur[2].charCodeAt(0)+1):"a";
s=s.replace(/VERSION\s*=\s*"wcv-[^"]+"/,`VERSION = "wcv-${d}${next}"`);fs.writeFileSync(p,s);console.log("sw.js VERSION → wcv-"+d+next);
