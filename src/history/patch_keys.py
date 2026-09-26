import sys
W='/home/claude/work/'
old='''    const hold=(el,on,off)=>{el.addEventListener("pointerdown",e=>{e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add("down");on();});
      const up=()=>{el.classList.remove("down");off&&off();};el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);};
    hold(root.querySelector("#mDig"),()=>input.dig=true,()=>{input.dig=false;});'''
new='''    const hold=(el,on,off)=>{el.addEventListener("pointerdown",e=>{e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add("down");on();});
      const up=()=>{el.classList.remove("down");off&&off();};el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);};
    // the pick can be held by the ⛏️ button or a key; either one keeps digging
    let pDig=false,kDig=false;const setDig=()=>{input.dig=pDig||kDig;};
    hold(root.querySelector("#mDig"),()=>{pDig=true;setDig();},()=>{pDig=false;setDig();});'''
old2='''    const keys={};
    const kUpd=()=>{input.jx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);input.jy=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);input.dig=!!(keys.x||keys.j);};
    addEventListener("keydown",e=>{if(!running)return;keys[e.key]=1;if(e.key===" "){input.jump=input.jumpEdge=true;}kUpd();});
    addEventListener("keyup",e=>{if(!running)return;keys[e.key]=0;if(e.key===" ")input.jump=false;kUpd();});'''
new2='''    // e.code is the physical key, so Shift or Caps Lock can't turn "d" into "D"
    //   move: WASD or arrows · jump: Space · dig: J, K, X, E, Enter or Shift
    const keys={},MOVE=new Set(["KeyA","KeyD","KeyW","KeyS","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]),
      DIG=new Set(["KeyJ","KeyK","KeyX","KeyE","Enter","ShiftLeft","ShiftRight"]);let kbHint=false;
    const kUpd=()=>{input.jx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
      input.jy=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);};
    const typing=e=>/INPUT|TEXTAREA/.test((e.target||{}).tagName||"");
    addEventListener("keydown",e=>{if(!running||paused||typing(e))return;const c=e.code;
      if(MOVE.has(c)||DIG.has(c)||c==="Space")e.preventDefault();
      if(!kbHint){kbHint=true;toast("Keys: WASD move · Space jump · hold J to dig",3500);}
      if(e.repeat)return;keys[c]=1;
      if(c==="Space"){input.jump=input.jumpEdge=true;}
      if(DIG.has(c)){kDig=true;setDig();}
      if(MOVE.has(c))kUpd();});
    addEventListener("keyup",e=>{if(!running)return;const c=e.code;keys[c]=0;
      if(c==="Space")input.jump=false;
      if(DIG.has(c)){kDig=[...DIG].some(k=>keys[k]);setDig();}
      if(MOVE.has(c))kUpd();});
    // a key released while the window was in the background never sends keyup
    addEventListener("blur",()=>{for(const k in keys)keys[k]=0;kDig=false;setDig();kUpd();input.jump=false;});'''
for f in ['wordcraft-valley.html','mine.js']:
    s=open(W+f).read()
    for o,n in [(old,new),(old2,new2)]:
        if s.count(o)!=1:sys.exit(f+' FAIL '+o[:50])
        s=s.replace(o,n)
    open(W+f,'w').write(s)
print('ok')
