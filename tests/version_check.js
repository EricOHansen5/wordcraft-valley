// The version shown in the Grown-up menu must match the service-worker VERSION (both stamped by npm run release).
const fs=require("fs"),path=require("path"),app=path.join(__dirname,"../app");
const sw=(fs.readFileSync(path.join(app,"sw.js"),"utf8").match(/VERSION\s*=\s*"([^"]+)"/)||[])[1];
const ui=(fs.readFileSync(path.join(app,"index.html"),"utf8").match(/APP_VERSION="([^"]+)"/)||[])[1];
console.log(sw&&sw===ui?`PASS version ${ui} matches sw.js`:`FAIL index.html APP_VERSION ${ui} != sw.js VERSION ${sw}`);
// "use strict" only counts as the first statement of the script: anything stamped above it turns strict mode off
const first=(fs.readFileSync(path.join(app,"index.html"),"utf8").split("<script>")[1]||"").trim().split(/\r?\n/)[0];
console.log(first==='"use strict";'?"PASS the game script still starts with \"use strict\"":`FAIL the game script starts with ${first.slice(0,60)} instead of "use strict"`);
// the service worker keeps SHELL for offline play: every file in it must exist, and it must have every <script src> of the page
const swText=fs.readFileSync(path.join(app,"sw.js"),"utf8"),shellSrc=(swText.match(/const SHELL\s*=\s*(\[[\s\S]*?\]);/)||[])[1];
const SHELL=shellSrc?Function("return "+shellSrc)():[];
const absent=SHELL.filter(f=>f!=="./"&&!fs.existsSync(path.join(app,f)));
console.log(SHELL.length&&!absent.length?`PASS every file in sw.js's SHELL is in app/ (${SHELL.length})`:`FAIL sw.js's SHELL lists what app/ doesn't have: ${absent.join(", ")||"(no SHELL found)"}`);
const src=require("./page").scripts(),uncached=src.filter(f=>SHELL.indexOf(f)<0);
console.log(src.length&&!uncached.length?`PASS every <script src> in index.html is in sw.js's SHELL (${src.join(", ")})`:
  `FAIL index.html loads ${uncached.join(", ")||"no data scripts"}${uncached.length?", which sw.js's SHELL doesn't keep: offline, the game would not start":""}`);
// and every data file is one the page loads (a file left out would never reach the game)
const data=["art","content"].reduce((a,d)=>a.concat(fs.existsSync(path.join(app,d))?fs.readdirSync(path.join(app,d)).map(f=>d+"/"+f):[]),[]),unused=data.filter(f=>src.indexOf(f)<0);
console.log(!unused.length?`PASS index.html loads every file in app/art and app/content (${data.length})`:`FAIL ${unused.join(", ")} in app/ but index.html doesn't load it`);
