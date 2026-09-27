// Bump the service-worker cache version so iPads pick up the new build. Run after every change to app/.
const fs=require("fs"),p=require("path").join(__dirname,"../app/sw.js");
const d=new Date().toISOString().slice(0,10);let s=fs.readFileSync(p,"utf8");
const cur=(s.match(/VERSION\s*=\s*"wcv-([\d-]+)([a-z])"/)||[]);
const next=cur[1]===d?String.fromCharCode(cur[2].charCodeAt(0)+1):"a";
s=s.replace(/VERSION\s*=\s*"wcv-[^"]+"/,`VERSION = "wcv-${d}${next}"`);fs.writeFileSync(p,s);
const h=require("path").join(__dirname,"../app/index.html");let html=fs.readFileSync(h,"utf8");
html=html.replace(/APP_VERSION="wcv-[^"]+"/,`APP_VERSION="wcv-${d}${next}"`);fs.writeFileSync(h,html);console.log("sw.js + index.html VERSION → wcv-"+d+next);
