/* Wordcraft Valley home server — serves the game and keeps backups.
   No dependencies: Node 18+ only.
     GET  /api/ping              -> {ok,app:"wordcraft"}
     POST /api/backup            <- the game's backup JSON; stores a snapshot
     GET  /api/latest            -> the newest backup, rebuilt with recordings
     GET  /api/list              -> snapshot names, newest first
     GET  /api/snapshot/<name>   -> one snapshot, rebuilt
     GET  /api/hear              -> {ok:true} when the listener (server/hear/) is up, else 503
     POST /api/hear              <- a short clip and X-Expect (its possible answers); passed to the
                                    listener -> {text,best,scores,ms}, 504 after 10 s, 503 with none
   Recordings are stored once each by content hash, so daily snapshots
   stay small even when he has recorded a whole shelf of books.
   Environment: PORT (8080), DATA (/data), APP (/app), TOKEN (optional),
   KEEP (60 snapshots), HEAR_URL (the listener, http://hear:9000/hear; "off" for none). */
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto"),zlib=require("zlib");
const PORT=+process.env.PORT||8080,DATA=process.env.DATA||"/data",APP=process.env.APP||"/app",TOKEN=process.env.TOKEN||"",KEEP=+process.env.KEEP||60;
const SNAP=path.join(DATA,"snapshots"),BLOB=path.join(DATA,"blobs");
[SNAP,BLOB].forEach(d=>fs.mkdirSync(d,{recursive:true}));
const TYPES={".mp3":"audio/mpeg",".html":"text/html; charset=utf-8",".js":"text/javascript",".json":"application/json",".webmanifest":"application/manifest+json",
  ".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".css":"text/css"};
// the game's data (app/art/, app/content/) changes with each release, like index.html, so it is revalidated too (as app/_headers says)
const DATA_DIRS=["art","content"];
// text is sent gzipped when the browser accepts it (the game file shrinks about 4x)
const send=(res,code,body,type="application/json")=>{let b=typeof body==="string"||Buffer.isBuffer(body)?body:JSON.stringify(body);
  const h={"Content-Type":type,"Cache-Control":"no-store"};if(res.gz&&b.length>1024){b=zlib.gzipSync(b);h["Content-Encoding"]="gzip";}
  res.writeHead(code,h);res.end(b);};
const gzCache=new Map();
function gzFile(f,buf){const st=fs.statSync(f),k=f+":"+st.mtimeMs;if(!gzCache.has(k))gzCache.set(k,zlib.gzipSync(buf,{level:9}));return gzCache.get(k);}
const snapshots=()=>fs.readdirSync(SNAP).filter(f=>f.endsWith(".json")).sort().reverse();
function readBody(req,limit=300e6){return new Promise((ok,bad)=>{let n=0;const parts=[];
  req.on("data",c=>{n+=c.length;if(n>limit){bad(new Error("too big"));req.destroy();}else parts.push(c);});
  req.on("end",()=>ok(Buffer.concat(parts).toString("utf8")));req.on("error",bad);});}
function store(backup){
  const refs={};
  for(const[k,v]of Object.entries(backup.blobs||{})){
    const buf=Buffer.from(v.data||"","base64"),h=crypto.createHash("sha256").update(buf).digest("hex");
    const f=path.join(BLOB,h);if(!fs.existsSync(f))fs.writeFileSync(f,buf);
    refs[k]={type:v.type,hash:h};
  }
  const name=new Date().toISOString().replace(/[:.]/g,"-")+".json";
  fs.writeFileSync(path.join(SNAP,name),JSON.stringify({...backup,blobs:undefined,refs}));
  // keep the newest KEEP snapshots, plus the first one of each month
  const all=snapshots(),months=new Set();
  all.slice().reverse().forEach(f=>{const m=f.slice(0,7);if(!months.has(m))months.add(m);else if(all.indexOf(f)>=KEEP)fs.unlinkSync(path.join(SNAP,f));});
  // recordings no snapshot needs any more
  const used=new Set();snapshots().forEach(f=>{try{Object.values(JSON.parse(fs.readFileSync(path.join(SNAP,f))).refs||{}).forEach(r=>used.add(r.hash));}catch(e){}});
  fs.readdirSync(BLOB).forEach(h=>{if(!used.has(h))fs.unlinkSync(path.join(BLOB,h));});
  return{file:name,blobs:Object.keys(refs).length};
}
function rebuild(name){
  const s=JSON.parse(fs.readFileSync(path.join(SNAP,name)));const blobs={};
  for(const[k,r]of Object.entries(s.refs||{})){const f=path.join(BLOB,r.hash);if(fs.existsSync(f))blobs[k]={type:r.type,data:fs.readFileSync(f).toString("base64")};}
  delete s.refs;s.blobs=blobs;return s;
}
/* ---- the listener (tier A of "Talk to me") ----
   A clip of 1-4 s and the answers it can be go to the sidecar in server/hear/, which transcribes
   it with Whisper and scores each answer. The sidecar is optional: without it GET says 503 and
   the game matches on the iPad instead. Nothing is stored here. */
const HEAR_URL=process.env.HEAR_URL==null?"http://hear:9000/hear":process.env.HEAR_URL,HEAR_MS=10000,HEAR_MAX=8e6;
function readRaw(req,limit){return new Promise((ok,bad)=>{let n=0;const parts=[];
  req.on("data",c=>{n+=c.length;if(n>limit){bad(new Error("too big"));req.destroy();}else parts.push(c);});
  req.on("end",()=>ok(Buffer.concat(parts)));req.on("error",bad);});}
// one request to the sidecar; always settles, with {code, obj}
function toListener(method,body,headers){return new Promise(ok=>{
  let done=false,timer=null;const fin=(code,obj)=>{if(done)return;done=true;clearTimeout(timer);ok({code,obj});};
  let u;try{if(!HEAR_URL||HEAR_URL==="off")throw new Error("off");u=new URL(HEAR_URL);}catch(e){return fin(503,{ok:false,error:"no listener"});}
  let r;
  try{r=(u.protocol==="https:"?require("https"):http).request(u,{method,headers:headers||{}},x=>{const parts=[];
    x.on("data",c=>parts.push(c));x.on("error",()=>fin(502,{error:"the listener broke off"}));
    x.on("end",()=>{let j=null;try{j=JSON.parse(Buffer.concat(parts).toString("utf8"));}catch(e){}
      if(j&&typeof j==="object")fin(x.statusCode||502,j);else fin(502,{error:"not an answer from the listener"});});});}
  catch(e){return fin(503,{ok:false,error:"no listener"});}
  timer=setTimeout(()=>{fin(504,{error:"hear timeout"});try{r.destroy();}catch(e){}},method==="GET"?3000:HEAR_MS);
  r.on("error",()=>fin(503,{ok:false,error:"no listener"}));
  r.end(body||undefined);});}
async function hear(req,res){
  if(req.method==="GET"){const h=await toListener("GET");
    return h.code===200&&h.obj.ok?send(res,200,{ok:true,model:h.obj.model||null}):send(res,503,{ok:false,error:h.obj.error||"no listener"});}
  if(req.method!=="POST")return send(res,405,{error:"GET or POST"});
  const type=String(req.headers["content-type"]||"application/octet-stream");
  if(!req.headers["x-expect"]&&!/^multipart\/form-data/i.test(type))return send(res,400,{error:"expect is missing"});
  const body=await readRaw(req,HEAR_MAX);if(!body.length)return send(res,400,{error:"no audio"});
  const headers={"Content-Type":type,"Content-Length":body.length};
  ["x-expect","x-prompt"].forEach(k=>{if(req.headers[k])headers[k]=String(req.headers[k]);});
  const h=await toListener("POST",body,headers);
  return send(res,h.code,h.obj);
}
// a handler bug or a bad request must never take the backup server down
process.on("unhandledRejection",e=>console.error("unhandledRejection",e));
process.on("uncaughtException",e=>console.error("uncaughtException",e));
http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://x");let p;
  try{p=decodeURIComponent(url.pathname);}catch(e){return send(res,400,{error:"bad url"});}
  res.gz=/\bgzip\b/.test(req.headers["accept-encoding"]||"");
  if(p.startsWith("/api/")){
    res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type,X-Token,X-Expect,X-Prompt");
    if(req.method==="OPTIONS")return send(res,204,"");
    if(p==="/api/ping")return send(res,200,{ok:true,app:"wordcraft",snapshots:snapshots().length});
    if(TOKEN&&req.headers["x-token"]!==TOKEN&&url.searchParams.get("token")!==TOKEN)return send(res,401,{error:"token"});
    try{
      if(p==="/api/backup"&&req.method==="POST"){const b=JSON.parse(await readBody(req));
        if(b.kind!=="wordcraft-backup")return send(res,400,{error:"not a backup"});return send(res,200,{ok:true,...store(b)});}
      if(p==="/api/hear")return await hear(req,res);
      if(p==="/api/list")return send(res,200,snapshots());
      // who played last, so another device can offer to pick up where he left off
      if(p==="/api/head"){const s=snapshots();if(!s.length)return send(res,200,{});
        const j=JSON.parse(fs.readFileSync(path.join(SNAP,s[0])));return send(res,200,{file:s[0],savedAt:j.savedAt,words:j.words,device:(j.state||{}).deviceId||null});}
      if(p==="/api/latest"){const s=snapshots();if(!s.length)return send(res,404,{error:"no backups yet"});return send(res,200,rebuild(s[0]));}
      const m=p.match(/^\/api\/snapshot\/([\w\-.]+\.json)$/);if(m&&fs.existsSync(path.join(SNAP,m[1])))return send(res,200,rebuild(m[1]));
      return send(res,404,{error:"not found"});
    }catch(e){return send(res,500,{error:e.message});}
  }
  // the game itself
  let f=path.normalize(path.join(APP,p.endsWith("/")?p+"index.html":p));
  if(!f.startsWith(path.normalize(APP)))return send(res,403,"no","text/plain");
  fs.readFile(f,(err,buf)=>{if(err)return send(res,404,"not found","text/plain");
    const data=DATA_DIRS.includes(path.relative(path.normalize(APP),f).split(path.sep)[0]);
    const type=TYPES[path.extname(f)]||"application/octet-stream",h={"Content-Type":type,
      "Cache-Control":f.endsWith("sw.js")||f.endsWith(".html")||f.endsWith("index.json")||data?"no-cache":f.includes(path.sep+"voice"+path.sep)?"max-age=31536000, immutable":"max-age=86400"};
    if(res.gz&&/text|json|javascript|svg|manifest/.test(type)&&buf.length>1024){buf=gzFile(f,buf);h["Content-Encoding"]="gzip";}
    res.writeHead(200,h);res.end(buf);});
}).listen(PORT,()=>console.log(`Wordcraft server on :${PORT} (data ${DATA}, app ${APP}${TOKEN?", token on":""}, listener ${HEAR_URL||"off"})`));
