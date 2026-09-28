// The version shown in the Grown-up menu must match the service-worker VERSION (both stamped by npm run release).
const fs=require("fs"),path=require("path"),app=path.join(__dirname,"../app");
const sw=(fs.readFileSync(path.join(app,"sw.js"),"utf8").match(/VERSION\s*=\s*"([^"]+)"/)||[])[1];
const ui=(fs.readFileSync(path.join(app,"index.html"),"utf8").match(/APP_VERSION="([^"]+)"/)||[])[1];
console.log(sw&&sw===ui?`PASS version ${ui} matches sw.js`:`FAIL index.html APP_VERSION ${ui} != sw.js VERSION ${sw}`);
// "use strict" only counts as the first statement of the script: anything stamped above it turns strict mode off
const first=(fs.readFileSync(path.join(app,"index.html"),"utf8").split("<script>")[1]||"").trim().split(/\r?\n/)[0];
console.log(first==='"use strict";'?"PASS the game script still starts with \"use strict\"":`FAIL the game script starts with ${first.slice(0,60)} instead of "use strict"`);
