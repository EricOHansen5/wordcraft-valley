// Runs every test suite, a few at a time. sync/multi/voice need the home server, so it is started on 8799 (token "abc")
// and 8804. Usage: node tests/run-all.js [-j N] [name ...]   (a name matches any suite whose file name contains it;
// -j 1 runs them one at a time). One process, one line per suite as it finishes, one summary line, exit code 1 on a failure.
const {spawn,spawnSync}=require("child_process"),path=require("path"),fs=require("fs"),os=require("os"),http=require("http");
const root=path.join(__dirname,".."),WIN=process.platform==="win32",args=process.argv.slice(2),only=[];
// each suite drives its own Chromium, so 4 at a time on the 12-core PC leaves room to use it
let jobs=Math.max(1,Math.min(4,Math.floor(os.cpus().length/2)));
for(let i=0;i<args.length;i++){if(args[i]==="-j")jobs=Math.max(1,+args[++i]||1);else only.push(args[i]);}
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".js")&&!["run-all.js","lib.js","page.js"].includes(f)
  &&(!only.length||only.some(o=>f.includes(o))));

// ---- children: a suite's whole tree (node and the browser it started) goes when it is stopped ----
const running=new Set();
const kill=c=>{try{if(WIN)spawnSync("taskkill",["/pid",String(c.pid),"/T","/F"],{stdio:"ignore",windowsHide:true});
  else process.kill(-c.pid,"SIGKILL");}catch(e){}};
const run=f=>new Promise(done=>{const t0=Date.now();let out="";
  const c=spawn(process.execPath,[path.join(__dirname,f)],{cwd:__dirname,windowsHide:true,detached:!WIN});
  running.add(c);c.stdout.setEncoding("utf8");c.stderr.setEncoding("utf8");
  c.stdout.on("data",d=>out+=d);c.stderr.on("data",d=>out+=d);
  const timer=setTimeout(()=>{out+="\nFAIL timed out after 5 minutes";kill(c);},300000);
  c.on("close",code=>{clearTimeout(timer);running.delete(c);const fails=out.match(/^FAIL.*$/gm)||[];
    done({ok:code===0&&!fails.length,fails,out,s:Math.round((Date.now()-t0)/1000)});});});

// ---- the home servers: their ports must be free, or an interrupted run's server would answer in their place ----
const free=port=>new Promise(res=>{const s=http.createServer();s.once("error",()=>res(false));s.listen(port,()=>s.close(()=>res(true)));});
const start=(port,token)=>spawn(process.execPath,[path.join(root,"server/server.js")],{windowsHide:true,env:{...process.env,PORT:port,
  APP:path.join(root,"app"),DATA:fs.mkdtempSync(path.join(os.tmpdir(),"wcv-")),TOKEN:token||""},stdio:"ignore"});
const ping=port=>new Promise(res=>{const q=http.get({host:"127.0.0.1",port,path:"/api/ping",timeout:1000},r=>{r.resume();res(r.statusCode===200);});
  q.on("error",()=>res(false));q.on("timeout",()=>{q.destroy();res(false);});});
let servers=[];
const stopAll=()=>{for(const c of running)kill(c);servers.forEach(s=>s.kill());};
process.on("SIGINT",()=>{console.log("\nstopped");stopAll();process.exit(130);});

// ---- the queue: a suite with a fixed port of its own (8500-8999 in its source) waits while another suite holds it ----
const portsOf=f=>[...new Set(fs.readFileSync(path.join(__dirname,f),"utf8").match(/\b8[5-9]\d\d\b/g)||[])];
const line=(ok,f,x,note)=>`${ok?"✓":"✗"} ${f} ${x.s}s${note||""}${ok?"":"\n   "+(x.fails.slice(0,5).join("\n   ")||first(x))}`;
// (a crash ends with node's version line, so its error line is the one to show)
const first=x=>{const l=x.out.trim().split("\n");return(x.fails[0]||l.find(s=>/^\s*\w*Error:/.test(s))||l.slice(-1)[0]||"").trim().slice(0,140);};

(async()=>{
  const t0=Date.now();
  for(const p of [8799,8804])if(!await free(p)){
    console.log(`port ${p} is held (a home server from an interrupted test run?); stop it and run again`);process.exit(1);}
  servers=[start(8799,"abc"),start(8804)];
  for(let i=0;i<50&&!(await ping(8799)&&await ping(8804));i++)await new Promise(r=>setTimeout(r,100));
  console.log(`${files.length} suite${files.length===1?"":"s"}, ${jobs} at a time`);
  const queue=files.map(f=>({f,ports:portsOf(f)})),held=new Set(),again=[];let active=0;
  await new Promise(allDone=>{
    const pump=()=>{
      while(active<jobs){const i=queue.findIndex(q=>q.ports.every(p=>!held.has(p)));if(i<0)break;
        const q=queue.splice(i,1)[0];active++;q.ports.forEach(p=>held.add(p));
        run(q.f).then(x=>{active--;q.ports.forEach(p=>held.delete(p));
          if(x.ok)console.log(line(true,q.f,x));
          else{again.push({f:q.f,x});console.log(`· ${q.f} failed, tried again at the end: ${first(x)}`);}
          pump();});}
      if(!active&&!queue.length)allDone();};
    pump();});
  // one retry each, one at a time once the rest are done: a Playwright suite can lose a timing race on a loaded
  // machine; a real failure fails twice
  let bad=0;
  for(const {f,x}of again){const y=await run(f);
    if(y.ok)console.log(line(true,f,y,` (second try; the first said: ${first(x)})`));else{bad++;console.log(line(false,f,y));}}
  stopAll();
  const m=Math.round((Date.now()-t0)/1000);
  console.log((bad?`${bad} test file(s) failed`:"all passed")+` (${files.length} suites in ${Math.floor(m/60)}m ${m%60}s)`);
  process.exit(bad?1:0);
})();
