// Runs every test. sync/multi/voice need the home server, so it is started on 8799 (token "abc") and 8804.
const {spawn,spawnSync}=require("child_process"),path=require("path"),fs=require("fs"),os=require("os");
const root=path.join(__dirname,".."),only=process.argv.slice(2);
const start=(port,token)=>spawn("node",[path.join(root,"server/server.js")],{env:{...process.env,PORT:port,APP:path.join(root,"app"),
  DATA:fs.mkdtempSync(path.join(os.tmpdir(),"wcv-")),TOKEN:token||""},stdio:"ignore"});
const s1=start(8799,"abc"),s2=start(8804);
setTimeout(()=>{
  const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".js")&&f!=="run-all.js"&&(!only.length||only.some(o=>f.includes(o))));
  let bad=0;
  for(const f of files){const r=spawnSync("node",[path.join(__dirname,f)],{cwd:__dirname,encoding:"utf8",timeout:300000});
    const out=(r.stdout||"")+(r.stderr||"");const fails=(out.match(/^FAIL.*$/gm)||[]);
    const ok=r.status===0&&!fails.length;if(!ok)bad++;
    console.log(`${ok?"✓":"✗"} ${f}${ok?"":"\n   "+(fails.slice(0,5).join("\n   ")||out.trim().split("\n").slice(-5).join("\n   "))}`);}
  s1.kill();s2.kill();console.log(bad?`${bad} test file(s) failed`:"all passed");process.exit(bad?1:0);
},800);
