// The listener's proxy (Node only, no browser, about 15 s): server/server.js with HEAR_URL pointing at a fake
// sidecar made here, which gives canned transcripts. GET /api/hear is 200 only while the sidecar is up and ready;
// POST /api/hear passes the clip, its type and its answers through untouched and the answer back; a sidecar that
// takes longer than 10 s gives 504 {error:"hear timeout"}; the token guards both; a sidecar that is missing, broken
// or talking nonsense never takes the server down. Also runs server/hear/hear.py --selftest (the scoring) when
// Python is on the PATH.
"use strict";
const http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),{spawn,spawnSync}=require("child_process");
const {check,freePort}=require("./lib");
const T=check("hear_server"),ok=T.ok,J=x=>JSON.stringify(x);

// ---------- the fake sidecar ----------
const fake={mode:"ok",ready:true,seen:[]};
function sidecar(port){
  const s=http.createServer((q,r)=>{
    const parts=[];q.on("data",c=>parts.push(c));q.on("end",()=>{
      const body=Buffer.concat(parts);
      if(q.method==="GET"){r.writeHead(fake.ready?200:503,{"content-type":"application/json"});
        return r.end(J(fake.ready?{ok:true,model:"fake",ready:true}:{ok:false,ready:false,error:"loading the model"}));}
      fake.seen.push({url:q.url,type:q.headers["content-type"],expect:q.headers["x-expect"],prompt:q.headers["x-prompt"],len:body.length,body});
      if(fake.mode==="slow")return;                                   // never answers
      if(fake.mode==="drop")return q.socket.destroy();                  // hangs up
      if(fake.mode==="junk"){r.writeHead(200,{"content-type":"text/html"});return r.end("<h1>not json</h1>");}
      if(fake.mode==="bad"){r.writeHead(400,{"content-type":"application/json"});return r.end(J({error:"expect is a list of 1 to 6 answers"}));}
      let exp=[];try{exp=JSON.parse(decodeURIComponent(q.headers["x-expect"]||"[]"));}catch(e){}
      const text=exp[0]?exp[0]+".":"";const scores={};exp.forEach((e,i)=>{scores[e]=i?0.5:1;});
      r.writeHead(200,{"content-type":"application/json"});r.end(J({text,best:exp[0]||null,scores,ms:12}));
    });});
  return new Promise(res=>s.listen(port,"127.0.0.1",()=>res(s)));
}

// ---------- the home server ----------
function start(port,hearUrl,token){
  const env=Object.assign({},process.env,{PORT:String(port),APP:path.join(__dirname,"../app"),DATA:fs.mkdtempSync(path.join(os.tmpdir(),"wcv-hear-")),TOKEN:token||""});
  if(hearUrl===undefined)delete env.HEAR_URL;else env.HEAR_URL=hearUrl;
  const p=spawn(process.execPath,[path.join(__dirname,"../server/server.js")],{env,stdio:["ignore","pipe","pipe"]});
  p.log="";p.stdout.on("data",d=>{p.log+=d;});p.stderr.on("data",d=>{p.log+=d;});
  return new Promise(res=>{const t=setInterval(()=>{if(/Wordcraft server on/.test(p.log)){clearInterval(t);res(p);}},30);});
}
function req(port,method,p,{headers={},body}={}){
  return new Promise(res=>{const t0=Date.now();
    const q=http.request({host:"127.0.0.1",port,method,path:p,headers},r=>{const parts=[];r.on("data",c=>parts.push(c));
      r.on("end",()=>{const txt=Buffer.concat(parts).toString("utf8");let j=null;try{j=JSON.parse(txt);}catch(e){}res({code:r.statusCode,j,txt,ms:Date.now()-t0});});});
    q.on("error",e=>res({code:0,err:e.message,ms:Date.now()-t0}));
    if(body)q.end(body);else q.end();});
}

(async()=>{
  const fp=await freePort(),sp=await freePort(),sp2=await freePort(),sp3=await freePort();
  let side=await sidecar(fp);
  const srv=await start(sp,`http://127.0.0.1:${fp}/hear`,"tok"),TOK={"X-Token":"tok"};
  const clip=Buffer.from([0,0,0,24,102,116,121,112,109,112,52,50,1,2,3,4,5,250,251,252]);   // bytes like the start of an mp4

  // GET
  let r=await req(sp,"GET","/api/hear");
  ok(r.code===401&&r.j&&r.j.error==="token","GET /api/hear without the token: 401 "+r.code);
  r=await req(sp,"GET","/api/hear",{headers:TOK});
  ok(r.code===200&&r.j&&r.j.ok===true&&r.j.model==="fake","GET /api/hear with the sidecar up: 200 {ok:true} "+r.txt);
  r=await req(sp,"GET","/api/hear?token=tok");
  ok(r.code===200&&r.j.ok===true,"GET /api/hear: the token works in the address too (for a grown-up checking it in a browser)");
  fake.ready=false;r=await req(sp,"GET","/api/hear",{headers:TOK});fake.ready=true;
  ok(r.code===503&&r.j&&r.j.ok===false,"GET /api/hear while the sidecar loads its model: 503 "+r.txt);

  // POST
  r=await req(sp,"POST","/api/hear",{headers:{"Content-Type":"audio/mp4","X-Expect":J(["cat","cot","cap"])},body:clip});
  ok(r.code===401&&fake.seen.length===0,"POST /api/hear without the token: 401, and nothing reaches the sidecar");
  const exp=encodeURIComponent(J(["cat","cot","cap"]));
  r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4","X-Expect":exp,"X-Prompt":"Cat.%20Cot.%20Cap."},TOK),body:clip});
  const s0=fake.seen[0]||{};
  ok(r.code===200&&r.j&&r.j.best==="cat"&&r.j.text==="cat."&&J(r.j.scores)===J({cat:1,cot:.5,cap:.5})&&r.j.ms===12,"POST /api/hear: the sidecar's answer comes back as it is "+r.txt);
  ok(s0.url==="/hear"&&s0.type==="audio/mp4"&&s0.expect===exp&&s0.prompt==="Cat.%20Cot.%20Cap."&&s0.len===clip.length&&Buffer.compare(s0.body,clip)===0,
    "POST /api/hear: the clip's bytes, its type, its answers and the prompt reach the sidecar untouched "+J({type:s0.type,expect:s0.expect,len:s0.len}));
  const webm=Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3]),Buffer.alloc(3000,7)]);
  r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/webm;codecs=opus","X-Expect":J(["3","4","5"])},TOK),body:webm});
  const s1=fake.seen[1]||{};
  ok(r.code===200&&r.j.best==="3"&&s1.type==="audio/webm;codecs=opus"&&s1.len===webm.length,"POST /api/hear: a webm clip from Chrome goes through the same way");
  const B="----wcvhear",form=Buffer.concat([Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="expect"\r\n\r\n["sun","cat"]\r\n--${B}\r\nContent-Disposition: form-data; name="audio"; filename="a.mp4"\r\nContent-Type: audio/mp4\r\n\r\n`),clip,Buffer.from(`\r\n--${B}--\r\n`)]);
  r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"multipart/form-data; boundary="+B},TOK),body:form});
  const s2=fake.seen[2]||{};
  ok(r.code===200&&s2.type==="multipart/form-data; boundary="+B&&s2.len===form.length&&Buffer.compare(s2.body,form)===0,"POST /api/hear: a multipart form (audio + expect fields) is passed through whole");
  const n0=fake.seen.length;
  r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4"},TOK),body:clip});
  ok(r.code===400&&/expect/.test(r.j.error)&&fake.seen.length===n0,"POST /api/hear with no answers to listen for: 400, the sidecar is not asked");
  r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4","X-Expect":"[\"a\"]"},TOK)});
  ok(r.code===400&&/audio/.test(r.j.error)&&fake.seen.length===n0,"POST /api/hear with no clip: 400");
  fake.mode="bad";r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4","X-Expect":"[]"},TOK),body:clip});
  ok(r.code===400&&/expect/.test(r.j.error),"the sidecar's own 400 comes back as a 400 "+r.txt);
  fake.mode="junk";r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4","X-Expect":"[\"a\"]"},TOK),body:clip});
  ok(r.code===502&&r.j&&r.j.error,"a sidecar that answers with something that isn't JSON: 502 "+r.txt);
  fake.mode="drop";r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4","X-Expect":"[\"a\"]"},TOK),body:clip});
  ok(r.code>=502&&r.code<=503&&r.j&&r.j.error,"a sidecar that hangs up mid-clip: "+r.code+" "+r.txt);
  fake.mode="slow";r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4","X-Expect":"[\"a\"]"},TOK),body:clip});
  ok(r.code===504&&r.j&&r.j.error==="hear timeout"&&r.ms>=9500&&r.ms<13000,`a sidecar that takes too long: 504 {error:"hear timeout"} after ${r.ms} ms`);
  fake.mode="ok";
  r=await req(sp,"GET","/api/ping");
  ok(r.code===200&&r.j&&r.j.app==="wordcraft","the server still answers after the broken, junk and slow sidecars");

  // the sidecar goes away
  await new Promise(res=>{side.closeAllConnections&&side.closeAllConnections();side.close(()=>res());});
  r=await req(sp,"GET","/api/hear",{headers:TOK});
  ok(r.code===503&&r.j&&r.j.ok===false,"GET /api/hear with the sidecar stopped: 503 "+r.txt);
  r=await req(sp,"POST","/api/hear",{headers:Object.assign({"Content-Type":"audio/mp4","X-Expect":"[\"a\"]"},TOK),body:clip});
  ok(r.code===503&&r.j&&r.j.error,"POST /api/hear with the sidecar stopped: 503 "+r.txt);
  r=await req(sp,"GET","/api/ping");
  ok(r.code===200&&srv.exitCode===null,"no sidecar never takes the server down (it still answers /api/ping)");
  side=await sidecar(fp);
  r=await req(sp,"GET","/api/hear",{headers:TOK});
  ok(r.code===200&&r.j.ok===true,"the sidecar back: GET /api/hear is 200 again, with no restart");
  await new Promise(res=>{side.close(()=>res());});

  // no listener configured, and the default name that doesn't resolve here
  const off=await start(sp2,"off");
  r=await req(sp2,"GET","/api/hear");
  ok(r.code===503&&r.j.ok===false,"HEAR_URL=off: GET /api/hear is 503");
  r=await req(sp2,"POST","/api/hear",{headers:{"Content-Type":"audio/mp4","X-Expect":"[\"a\"]"},body:clip});
  ok(r.code===503,"HEAR_URL=off: POST /api/hear is 503");
  const dflt=await start(sp3,undefined);
  ok(/listener http:\/\/hear:9000\/hear/.test(dflt.log),"with no HEAR_URL the server looks for the listener at http://hear:9000/hear");
  r=await req(sp3,"GET","/api/hear");
  ok(r.code===503&&r.ms<5000,`the default listener missing (no host "hear" here): 503 in ${r.ms} ms`);
  r=await req(sp3,"GET","/api/ping");
  ok(r.code===200,"and the server is still up");
  [srv,off,dflt].forEach(p=>{try{p.kill();}catch(e){}});

  // the scoring itself, in Python, when it is here
  const py=["python3","python","py"].find(c=>{try{return spawnSync(c,["--version"],{encoding:"utf8"}).status===0;}catch(e){return false;}});
  if(!py)console.log("note: no Python on the PATH, so server/hear/hear.py --selftest was not run");
  else{const x=spawnSync(py,[path.join(__dirname,"../server/hear/hear.py"),"--selftest"],{encoding:"utf8",timeout:60000});
    const out=(x.stdout||"")+(x.stderr||""),fails=(out.match(/^FAIL.*$/gm)||[]),passes=(out.match(/^PASS/gm)||[]).length;
    ok(x.status===0&&!fails.length&&passes>=10,`hear.py --selftest: ${passes} scoring checks pass`+(fails.length?" — "+fails.join(" | "):x.status?" — "+out.trim().split("\n").slice(-3).join(" | "):""));}
  T.done();process.exit(process.exitCode||0);
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
