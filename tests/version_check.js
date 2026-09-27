// The version shown in the Grown-up menu must match the service-worker VERSION (both stamped by npm run release).
const fs=require("fs"),path=require("path"),app=path.join(__dirname,"../app");
const sw=(fs.readFileSync(path.join(app,"sw.js"),"utf8").match(/VERSION\s*=\s*"([^"]+)"/)||[])[1];
const ui=(fs.readFileSync(path.join(app,"index.html"),"utf8").match(/APP_VERSION="([^"]+)"/)||[])[1];
console.log(sw&&sw===ui?`PASS version ${ui} matches sw.js`:`FAIL index.html APP_VERSION ${ui} != sw.js VERSION ${sw}`);
