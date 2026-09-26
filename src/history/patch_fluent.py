import os,glob,json,sys
W='/home/claude/work/'
h=open(W+'wordcraft-valley.html').read()
files=sorted(glob.glob('/home/claude/fluent/min2/*.svg'))
FL={os.path.basename(f)[:-4]:open(f).read().strip() for f in files}
js='''
/* ================================================================
   FLUENT EMOJI (Microsoft, MIT licence) for the everyday things that
   used to be drawn by code: household words, food, trees, a few
   buildings. Each one is shown as an image inside a small SVG so its
   gradient ids can never clash with anything else on the page, and it
   sits on the same soft ground shadow as the rest of the valley.
   ================================================================ */
const FLU='''+json.dumps(FL,ensure_ascii=False,separators=(",",":"))+''';
const FLU_URI={};
const fluUri=k=>FLU_URI[k]||(FLU_URI[k]="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(FLU[k]));
const fluArt=(k,shadow=true)=>`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${shadow?OCC:""}<image href="${fluUri(k)}" x="9" y="4" width="82" height="82"/></svg>`;
["hat","map","cap","pan","pot","box","sock","bin","bed","pen","web","egg","sun","cup","shop","chip","chop","bath","chick","thumb","drum","flag","nest",
 "tent","cake","kite","bone","tree","pine","mushroom","stone","wood","door","gem","book","medal","cottage","statue","observatory","snowman","dish","net","flower"]
  .forEach(k=>{if(FLU[k])ART[k]=()=>fluArt(k,!["sun","gem","flag","kite"].includes(k));});
// refined drawings where no emoji fits
ART.mop=()=>S(`${OCC}<path d="M66 6 L46 60" stroke-width="7"/><path d="M66 6 L46 60" stroke="#C08A55" stroke-width="3.6" stroke-opacity="1"/>
  ${[...Array(9)].map((_,i)=>{const x=28+i*3.6,e=24+i*4.6;return`<path d="M${x} 66 Q${x-3+(i%2)*6} 79 ${e} 91" fill="none" stroke-width="7.4"/><path d="M${x} 66 Q${x-3+(i%2)*6} 79 ${e} 91" fill="none" stroke="#F3EEE2" stroke-width="4.4" stroke-opacity="1"/>`;}).join("")}
  <path d="M27 56 L63 60 L61 70 L25 66Z" fill="${grad("#5B8FD6","v",.3,.2)}"/>${HI(40,60,9,2,.45,6)}`);
ART.rope=()=>{const c=(rx,ry,cy)=>`<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke-width="11"/>
  <ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#D9AE72" stroke-width="7" stroke-opacity="1"/>
  <ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#A8743F" stroke-width="7" stroke-dasharray="2.5 4.5" stroke-opacity=".75"/>`;
  return S(`${OCC}${c(34,13,76)}${c(28,11,64)}${c(21,9,53)}
  <path d="M74 80 Q86 84 90 94" fill="none" stroke-width="11"/><path d="M74 80 Q86 84 90 94" fill="none" stroke="#D9AE72" stroke-width="7" stroke-opacity="1"/>
  ${HI(40,50,8,2,.5,-8)}`);};
ART.bridge=()=>{const q=(t,a,b,c)=>(1-t)*(1-t)*a+2*(1-t)*t*b+t*t*c;
  const deck=t=>[q(t,6,50,94),q(t,80,38,80)],rail=t=>[q(t,10,50,90),q(t,64,22,64)];
  return S(`<path d="M2 84 Q50 78 98 84 L98 96 L2 96Z" fill="${grad("#6FB6E0","v",.3,.2)}" stroke-width="2"/>
  <path d="M14 88 Q30 85 44 88 M58 90 Q72 87 86 90" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-opacity=".7"/>
  <path d="M6 80 Q50 38 94 80" fill="none" stroke-width="13"/>
  <path d="M6 80 Q50 38 94 80" fill="none" stroke="#B9824A" stroke-width="9" stroke-opacity="1"/>
  <path d="M6 80 Q50 38 94 80" fill="none" stroke="#7A5230" stroke-width="9" stroke-dasharray="1.6 6" stroke-opacity=".7"/>
  ${[.08,.25,.42,.58,.75,.92].map(t=>{const[a,b]=deck(t),[c,d]=rail(t);return`<path d="M${c} ${d} L${a} ${b-3}" stroke-width="5.4"/><path d="M${c} ${d} L${a} ${b-3}" stroke="#9A6B3C" stroke-width="2.6" stroke-opacity="1"/>`;}).join("")}
  <path d="M10 64 Q50 22 90 64" fill="none" stroke-width="5.4"/><path d="M10 64 Q50 22 90 64" fill="none" stroke="#C08A55" stroke-width="2.8" stroke-opacity="1"/>
  ${HI(50,52,16,2.4,.35,0)}`);};
ART.launchpad=()=>S(`${OCC}<path d="M8 84 L92 84 L86 94 L14 94Z" fill="${grad("#9E9B90","v",.2,.2)}"/>
  <path d="M22 84 L22 74 L62 74 L62 84Z" fill="${grad("#B8B5A8","v",.24,.2)}"/>
  <path d="M70 84 L70 12 L82 12 L82 84Z" fill="none" stroke-width="3"/>
  <path d="M70 22 L82 32 M82 22 L70 32 M70 38 L82 48 M82 38 L70 48 M70 54 L82 64 M82 54 L70 64 M70 70 L82 80" fill="none" stroke="#DC5A4B" stroke-width="2.4" stroke-opacity="1"/>
  <path d="M70 30 L60 30 M70 50 L60 50" fill="none" stroke-width="2.6"/>
  <image href="${fluUri("rocket")}" x="12" y="14" width="60" height="60" transform="rotate(-45 42 44)"/>
  <path d="M34 74 Q30 80 33 84 M42 74 Q42 82 42 86 M50 74 Q54 80 51 84" fill="none" stroke="#FFB23D" stroke-width="3" stroke-opacity=".9"/>`);
'''
anchor='Object.keys(OMB).forEach(k=>{ART[k]=()=>`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${OMB[k]}</svg>`;});\n'
assert h.count(anchor)==1
h=h.replace(anchor,anchor+js)
h=h.replace('Creature artwork: <b>OpenMoji</b> (openmoji.org) — CC BY-SA 4.0.','Creature artwork: <b>OpenMoji</b> (openmoji.org) — CC BY-SA 4.0. Everyday objects: <b>Fluent Emoji</b> (Microsoft) — MIT.')
open(W+'wordcraft-valley.html','w').write(h);print('ok',len(h))
