// The game page for everything that loads it outside a browser or serves it from its own server.
// app/index.html keeps the code; its data (art/*.js, content/*.js) comes in classic <script src="..."> tags just
// before the game script. jsdom doesn't fetch those, and a server that answers every path with the page would hand
// the page to them as their script, so:
//   html()                    app/index.html with each of its own <script src> (relative, under app/) inlined, in order:
//                             new JSDOM(require("./page").html(),{runScripts:"dangerously",...}).
//                             html({leaveOut:["content/books.js"]}) drops one, to see the page say its files are missing.
//   scripts()                 those <script src> paths, in page order.
//   serveApp(opts,listening)  a test server (an http.Server; it listens when opts.port is given):
//     static:false (default)  the page's own scripts are served for real (they are files under art/ and content/, or a
//                             <script src> of the page); every other path is answered with the page, as the suites
//                             always had, so voice/ and sw.js stay out of them (the device voice, no service worker).
//     static:true             every real file under app/ is served, anything else is a 404.
//     before(req,res)         runs first; return true when it has answered the request itself.
//   handler(opts)             the same as a request handler (tests/lib.js serve() uses it).
"use strict";
const fs=require("fs"),path=require("path"),http=require("http");
const APP=path.join(__dirname,"../app"),PAGE=path.join(APP,"index.html");
const TYPES={".html":"text/html",".js":"text/javascript",".json":"application/json",".mp3":"audio/mpeg",".png":"image/png",
  ".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
// the folders the page's data scripts live in
const OWN=["art/","content/"];
const TAG=/<script\s+src="([^"]+)"\s*><\/script>/g;
// a path under app/ (no scheme, no leading slash, no ..), else null
function under(src){
  if(/^[a-z][\w+.-]*:|^\/|^\\/i.test(src))return null;
  const f=path.join(APP,path.normalize(src));
  return f.startsWith(APP+path.sep)?f:null;
}
function scripts(page){
  const out=[];let m;TAG.lastIndex=0;const s=page==null?fs.readFileSync(PAGE,"utf8"):page;
  while((m=TAG.exec(s)))if(under(m[1]))out.push(m[1]);
  return out;
}
function html({leaveOut=[]}={}){
  return fs.readFileSync(PAGE,"utf8").replace(TAG,(tag,src)=>{
    const f=under(src);if(!f)return tag;
    if(leaveOut.indexOf(src)>=0)return "";
    const js=fs.readFileSync(f,"utf8");
    // an inline script ends at the first </script, whatever it is inside
    if(/<\/script/i.test(js))throw new Error(src+" has </script in it, so it can't be inlined");
    return "<script>"+js+"</script>";
  });
}
function handler({static:real=false,before}={}){
  return (q,r)=>{
    if(before&&before(q,r))return;
    let rel;try{rel=decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/,"");}catch(e){r.writeHead(400);return r.end();}
    if(rel===""||rel.endsWith("/"))rel+="index.html";
    const f=under(rel),file=!!f&&fs.existsSync(f)&&fs.statSync(f).isFile();
    const own=file&&(OWN.some(d=>rel.startsWith(d))||scripts().indexOf(rel)>=0);
    if(file&&(real||own)){r.writeHead(200,{"content-type":TYPES[path.extname(f)]||"application/octet-stream"});return r.end(fs.readFileSync(f));}
    if(real){r.writeHead(404);return r.end();}
    r.writeHead(200,{"content-type":"text/html"});r.end(fs.readFileSync(PAGE));
  };
}
function serveApp(opts={},listening){
  const srv=http.createServer(handler(opts));
  if(opts.port)srv.listen(opts.port,listening);
  return srv;
}

module.exports={html,scripts,serveApp,handler,APP,PAGE};

// run-all.js runs every file here, this one too: check the page helper on the real page
if(require.main===module)(async()=>{
  let fails=0;const ok=(c,m)=>{if(!c){fails++;process.exitCode=1;}console.log((c?"PASS ":"FAIL ")+m);};
  const page=fs.readFileSync(PAGE,"utf8"),src=scripts(page),h=html();
  ok(src.every(s=>fs.existsSync(under(s))),`page: every <script src> of the page is a file under app/ (${src.join(", ")||"none"})`);
  ok(scripts(h).length===0&&(h.match(/<script>/g)||[]).length===(page.match(/<script>/g)||[]).length+src.length,
    "page: html() inlines each of them, in place");
  // the page's own scripts come for real; everything else is the page; static serves files and 404s the rest
  const get=(srv,u)=>new Promise(res=>http.get(`http://localhost:${srv.address().port}/${u}`,x=>{let b="";x.setEncoding("utf8");
    x.on("data",c=>b+=c);x.on("end",()=>res({code:x.statusCode,type:x.headers["content-type"],body:b}));}));
  const up=o=>new Promise(res=>{const s=serveApp(o);s.listen(0,()=>res(s));});
  const a=await up({}),b=await up({static:true});
  const isPage=x=>x.code===200&&/<!DOCTYPE html>/i.test(x.body.slice(0,40));
  const own=await Promise.all(src.map(s=>get(a,s)));
  ok(own.every((x,i)=>x.code===200&&x.body===fs.readFileSync(under(src[i]),"utf8")&&/javascript/.test(x.type)),"page: serveApp gives the page's scripts for real");
  ok(isPage(await get(a,""))&&isPage(await get(a,"sw.js"))&&isPage(await get(a,"voice/index.json"))&&isPage(await get(a,"nope/x.js"))&&isPage(await get(a,"..%2Fpackage.json")),
    "page: and the page for everything else (sw.js and voice/ too)");
  ok((await get(b,"sw.js")).code===200&&!isPage(await get(b,"sw.js"))&&(await get(b,"nope.txt")).code===404&&(await get(b,"..%2Fpackage.json")).code===404,
    "page: static serves real files and 404s the rest");
  a.close();b.close();
  // a data file that did not arrive: the page says so (and stops) instead of showing a blank valley
  if(src.length){const {JSDOM,VirtualConsole}=require("jsdom"),vc=new VirtualConsole(),errs=[];
    vc.on("jsdomError",e=>errs.push(String(e&&(e.cause&&e.cause.message||e.message)||e)));
    const dom=new JSDOM(html({leaveOut:[src[src.length-1]]}),{runScripts:"dangerously",virtualConsole:vc});
    const box=dom.window.document.getElementById("dataMissing");
    ok(box&&/The game's files did not load\. Reload once online\./.test(box.textContent)&&box.querySelector("button")&&errs.some(e=>/did not load/.test(e)),
      `page: without ${src[src.length-1]} it says "The game's files did not load. Reload once online." and stops (${errs[0]||"no error"})`);
    dom.window.close();}
  console.log(`page.js: ${fails?"failed":"all passed"}`);
})().catch(e=>{console.log("FAIL page.js crashed: "+(e&&e.stack||e));process.exit(1);});
