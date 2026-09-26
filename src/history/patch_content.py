import io,re
P="/home/claude/work/wordcraft-valley.html"
s=io.open(P,encoding="utf-8").read()
def rep(old,new,count=1):
    global s
    n=s.count(old); assert n==count,(n,old[:100]); s=s.replace(old,new)

# ---------- 1. art ----------
def clean(path,flip):
    t=io.open(path,encoding="utf-8").read()
    vb=[float(x) for x in re.search(r'viewBox="([^"]+)"',t).group(1).split()]
    inner=re.sub(r'^.*?<svg[^>]*>','',t,flags=re.S); inner=re.sub(r'</svg>\s*$','',inner,flags=re.S)
    inner=re.sub(r'<!--.*?-->','',inner,flags=re.S); inner=re.sub(r'\s+id="[^"]*"','',inner)
    inner=re.sub(r'>\s+<','><',inner); inner=re.sub(r'\s{2,}',' ',inner).strip().replace('\\','\\\\').replace('"','\\"')
    k=100.0/max(vb[2],vb[3])
    tr=(f"translate(100,0) scale(-1,1) scale({k:.5f})" if flip else f"scale({k:.5f})")
    if vb[0] or vb[1]: tr+=f" translate({-vb[0]},{-vb[1]})"
    return f"<g transform='{tr}'>{inner}</g>"
N="/home/claude/new/"
FLIP={"submarine","raccoon","sauropod"}
ARTMAP={  # art key -> source file
 **{k:k for k in "raccoon penguin mammoth octopus dolphin whale seal lobster monkey parrot snake elephant gorilla sloth scorpion lizard rhino eagle sauropod orangutan dodo rabbit turtle shell palm coral herb hibiscus rockv flame cactus lighthouse castle treasure coaster volcano mine".split()},
 "tiki":"hut","dinonest":"nest",
 **{"v_"+k:k for k in "submarine tram monorail cablecar bullet rickshaw shuttle digger dumptruck crane bulldozer mixer monstertruck".split()}}
parts=[f'  {k}:"{clean(N+f+".svg",f in FLIP)}"' for k,f in ARTMAP.items()]
block=("\n/* v4.2 artwork: OpenMoji (openmoji.org, CC BY-SA 4.0), plus construction\n"
 "   vehicles and the block mine drawn to match, with moving parts. */\nconst OMN={\n"+",\n".join(parts)+"\n};\n"
 "Object.keys(OMN).forEach(k=>{ART[k]=()=>`<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">${OMN[k]}</svg>`;});\n")
i=s.index("Object.keys(OMW).forEach"); j=s.index("\n",i)+1
s=s[:j]+block+s[j:]

# ---------- 2. animals ----------
rep('{id:"dragon",name:"Dragon",b:3,kind:"flyer",rar:3,cry:"roar"}];',
'''{id:"dragon",name:"Dragon",b:3,kind:"flyer",rar:3,cry:"roar"},
  {id:"rabbit",name:"Rabbit",b:0,kind:"prey",rar:1,cry:"squeak"},{id:"raccoon",name:"Raccoon",b:2,kind:"hunter",rar:1,cry:"chitter"},
  {id:"penguin",name:"Penguin",b:3,kind:"prey",rar:1,cry:"squawk"},{id:"mammoth",name:"Mammoth",b:3,kind:"brawler",rar:3,cry:"trumpet"},
  {id:"crab",name:"Crab",b:4,kind:"brawler",rar:1,cry:"snap"},{id:"lobster",name:"Lobster",b:4,kind:"hunter",rar:1,cry:"snap"},
  {id:"seal",name:"Seal",b:4,kind:"prey",rar:1,cry:"bark"},{id:"octopus",name:"Octopus",b:4,kind:"hunter",rar:2,cry:"blub"},
  {id:"dolphin",name:"Dolphin",b:4,kind:"flyer",rar:2,cry:"click"},{id:"whale",name:"Whale",b:4,kind:"brawler",rar:3,cry:"whale"},
  {id:"monkey",name:"Monkey",b:5,kind:"prey",rar:1,cry:"ook"},{id:"parrot",name:"Parrot",b:5,kind:"flyer",rar:1,cry:"squawk"},
  {id:"sloth",name:"Sloth",b:5,kind:"prey",rar:1,cry:"yawn"},{id:"snake",name:"Snake",b:5,kind:"hunter",rar:2,cry:"hiss"},
  {id:"elephant",name:"Elephant",b:5,kind:"brawler",rar:2,cry:"trumpet"},{id:"gorilla",name:"Gorilla",b:5,kind:"brawler",rar:3,cry:"roar"},
  {id:"lizard",name:"Lizard",b:6,kind:"prey",rar:1,cry:"chitter"},{id:"scorpion",name:"Scorpion",b:6,kind:"hunter",rar:1,cry:"chitter"},
  {id:"rhino",name:"Rhino",b:6,kind:"brawler",rar:2,cry:"snort"},{id:"eagle",name:"Eagle",b:6,kind:"flyer",rar:2,cry:"screech"},
  {id:"sauropod",name:"Longneck",b:6,kind:"brawler",rar:3,cry:"bellow"}];''')

# ---------- 3. vehicles ----------
rep('  {id:"v_ufo",name:"UFO",b:3,rar:3,move:"air",act:"beam",size:.9}',
'''  {id:"v_ufo",name:"UFO",b:3,rar:3,move:"air",act:"beam",size:.9},
  {id:"v_digger",name:"Digger",b:0,rar:2,move:"road",act:"dig",size:1.05},
  {id:"v_tram",name:"Tram",b:0,rar:1,move:"rail",act:"ding",size:1.15},
  {id:"v_dumptruck",name:"Dump truck",b:1,rar:1,move:"road",act:"tipper",size:1.1},
  {id:"v_bulldozer",name:"Bulldozer",b:1,rar:2,move:"road",act:"doze",size:1.05},
  {id:"v_mixer",name:"Cement mixer",b:2,rar:1,move:"road",act:"mix",size:1.1},
  {id:"v_crane",name:"Crane",b:2,rar:2,move:"road",act:"lift",size:1.25},
  {id:"v_monstertruck",name:"Monster truck",b:3,rar:3,move:"road",act:"crush",size:1.1},
  {id:"v_cablecar",name:"Cable car",b:3,rar:2,move:"air",act:"glide",size:.85},
  {id:"v_submarine",name:"Submarine",b:4,rar:2,move:"water",act:"dive",size:.95},
  {id:"v_rickshaw",name:"Tuk-tuk",b:5,rar:1,move:"road",act:"tuktuk",size:.85},
  {id:"v_monorail",name:"Monorail",b:5,rar:2,move:"rail",act:"whoosh",size:1.2},
  {id:"v_bullet",name:"Bullet train",b:6,rar:3,move:"rail",act:"bullet",size:1.3},
  {id:"v_shuttle",name:"Space shuttle",b:6,rar:3,move:"air",act:"orbit",size:1}''')

# ---------- 4. lands ----------
rep('''   decor:["snow","pine","crystal","stone"]}
];''','''   decor:["snow","pine","crystal","stone"]},
  {id:"shore",name:"Sandy Shore",sky:["#9FD8F0","#FBF1D6"],far:"#6EC1E4",mid:"#F2DFA7",ground:"#EACF8E",
   decor:["palm","shell","coral","rockv","water"]},
  {id:"jungle",name:"Jungle",sky:["#A9D3B0","#EEF0D2"],far:"#3E7A3A",mid:"#356B31",ground:"#2F5F2C",
   decor:["palm","herb","hibiscus","mushroom","bush"]},
  {id:"volcano",name:"Volcano Island",sky:["#F2B48A","#F8E6CC"],far:"#6B4F4F",mid:"#7A5A48",ground:"#8A6B55",
   decor:["rockv","flame","cactus","crystal","stone"]}
];''')
rep('if(["tree","pine","flower","bush","grass"].includes(id)){','if(["tree","pine","flower","bush","grass","palm","herb","hibiscus","flame"].includes(id)){')

# ---------- 5. buildings ----------
rep('''  {id:"launchpad", name:"Launch pad",   gems:30, b:3, tip:"Send your rocket into space!"}''',
'''  {id:"launchpad", name:"Launch pad",   gems:30, b:3, tip:"Send your rocket into space!"},
  {id:"lighthouse",name:"Lighthouse",   gems:30, b:4, tip:"Its light calls the boats in."},
  {id:"castle",    name:"Castle",       gems:40, b:4, tip:"Flags, fireworks and a fanfare."},
  {id:"treasure",  name:"Treasure chest",gems:26,b:4, tip:"Read the word to open it."},
  {id:"tiki",      name:"Tiki hut",     gems:24, b:5, tip:"Drums! Everybody dances."},
  {id:"coaster",   name:"Roller coaster",gems:36,b:5, tip:"Your buddy takes a ride."},
  {id:"volcano",   name:"Volcano",      gems:40, b:6, tip:"Erupts, and gems rain down."},
  {id:"mine",      name:"Block mine",   gems:32, b:6, tip:"Tap to dig blocks. Find a diamond!"},
  {id:"dinonest",  name:"Dino nest",    gems:34, b:6, tip:"An egg hatches into a dinosaur."}''')
rep('''    default:
      Sound.sfx.soft();toast(NAMES[id]||id);''','''    default:
      if(newBuildingAct(key,id,p))break;
      Sound.sfx.soft();toast(NAMES[id]||id);''')

# ---------- 6. guardians ----------
rep('''         {s:"The kite is up in the sky.",a:"kite"},{s:"A fox ran up the hill.",a:"fox"}]}
];''','''         {s:"The kite is up in the sky.",a:"kite"},{s:"A fox ran up the hill.",a:"fox"}]},
  {b:4,id:"turtle",name:"Shelly the Sea Turtle",c:10,
   wake:["The waves brought you here!","I have swum the whole sea. Read my book with me."],
   book:[{s:"The crab is in the sand.",a:"crab"},{s:"A ship sails on the sea.",a:"ship"},
         {s:"The fish swim fast.",a:"fish"},{s:"I can surf on a big wave.",a:"surf"}]},
  {b:5,id:"orangutan",name:"Mango the Orangutan",c:16,
   wake:["Ooh ooh! A reader in my jungle!","The jungle is loud and fun. Here is my book."],
   book:[{s:"The frog sat on a big leaf.",a:"leaf"},{s:"Rain drips on the trees.",a:"rain"},
         {s:"A bug hid in the log.",a:"bug"},{s:"The bird sang in the sun.",a:"bird"}]},
  {b:6,id:"dodo",name:"Doodle the Dodo",c:21,
   wake:["Hot, hot, hot! Nobody visits the volcano.","You read all the way here! Take my very last book."],
   book:[{s:"The rock is hot.",a:"rock"},{s:"An egg sat in the nest.",a:"egg"},
         {s:"The moon is up at night.",a:"moon"},{s:"You are a star reader!",a:"star"}]}
];''')

# ---------- 7. hats ----------
rep('''  {id:"pirate",name:"Pirate hat",gems:25},{id:"wizard",name:"Wizard hat",gems:30},{id:"crown",name:"Crown",gems:45}];''',
'''  {id:"pirate",name:"Pirate hat",gems:25},{id:"wizard",name:"Wizard hat",gems:30},{id:"crown",name:"Crown",gems:45},
  {id:"tophat",name:"Top hat",gems:25},{id:"ninja",name:"Ninja band",gems:30},{id:"cowboy",name:"Cowboy hat",gems:30},
  {id:"explorer",name:"Explorer hat",gems:35},{id:"knight",name:"Knight helmet",gems:50},{id:"space",name:"Space helmet",gems:60}];''')
hats=r'''
Object.assign(ART,{
  hat_tophat(){return `<path d="M26 30 Q50 36 74 30 Q74 26 50 24 Q26 26 26 30Z" fill="${grad("#2E2620","v",.25,.1)}"/><path d="M36 28 L36 2 Q50 -1 64 2 L64 28Z" fill="${grad("#3A302A","v",.25,.12)}"/><path d="M36 22 L64 22 L64 27 L36 27Z" fill="#DC5A4B"/>`;},
  hat_cowboy(){return `<path d="M14 28 Q30 36 50 34 Q70 36 86 28 Q80 34 50 38 Q20 34 14 28Z" fill="${grad("#9A6434","v",.25,.1)}"/><path d="M32 32 Q30 8 42 8 Q50 14 58 8 Q70 8 68 32Z" fill="${grad("#B57A42","v",.25,.15)}"/><path d="M32 26 Q50 30 68 26" fill="none" stroke="#5A3A1E" stroke-width="3"/>`;},
  hat_ninja(){return `<path d="M24 22 Q50 16 76 22 L76 30 Q50 24 24 30Z" fill="${grad("#2E3A4E","v",.25,.1)}"/><path d="M74 24 Q88 22 94 30 Q86 28 80 30 Q90 34 92 42 Q84 34 74 30Z" fill="#2E3A4E"/><circle cx="50" cy="22" r="3.4" fill="#C9CED6"/>`;},
  hat_explorer(){return `<path d="M16 30 Q50 40 84 30 Q84 26 50 26 Q16 26 16 30Z" fill="${grad("#D9C08A","v",.25,.1)}"/><path d="M28 28 Q28 4 50 4 Q72 4 72 28Z" fill="${grad("#E6D19E","v",.25,.18)}"/><path d="M28 24 Q50 28 72 24" fill="none" stroke="#8C6A3A" stroke-width="3"/>`;},
  hat_knight(){return `<path d="M26 34 Q24 4 50 4 Q76 4 74 34Z" fill="${grad("#B8BEC6","v",.3,.25)}"/><path d="M50 4 L50 34" stroke="#7E858F" stroke-width="2" fill="none"/><path d="M34 22 L66 22" stroke="#2E2620" stroke-width="3" fill="none"/><path d="M50 4 Q44 -8 58 -12 Q56 -4 62 0 Q56 2 50 4Z" fill="#DC5A4B"/>`;},
  hat_space(){return `<circle cx="50" cy="40" r="36" fill="rgba(180,225,255,.28)" stroke="#E8EEF4" stroke-width="4"/><path d="M28 22 Q36 12 48 10" fill="none" stroke="#FFFFFF" stroke-width="4" opacity=".8"/><path d="M50 4 L50 -6" stroke="#9AA3AD" stroke-width="3"/><circle cx="50" cy="-8" r="4" fill="#DC5A4B"/>`;}
});
'''
i=s.index("/* v4.2 artwork"); s=s[:i]+hats+s[i:]

# ---------- 8. words that unlock vehicles ----------
rep('''  train:"v_train",plane:"v_plane"};''','''  train:"v_train",plane:"v_plane",sub:"v_submarine",tram:"v_tram",dump:"v_dumptruck",crane:"v_crane"};''')
i=s.index("// vehicles — reading one of these unlocks that vehicle")
j=s.index("\n];",i)
s=s[:j]+''',
  {w:"sub",p:["s","u","b"],t:2},{w:"tram",p:["t","r","a","m"],t:4},{w:"dump",p:["d","u","m","p"],t:4},
  {w:"crane",p:["c","r","a_e","n"],t:5}'''+s[j:]
rep('''  train:"v_train",rocket:"v_rocket",plane:"v_plane"});''','''  train:"v_train",rocket:"v_rocket",plane:"v_plane",sub:"v_submarine",tram:"v_tram",dump:"v_dumptruck",crane:"v_crane"});''')

# ---------- 9. sounds ----------
rep('''    screech:()=>screech(1800,.35),''','''    screech:()=>screech(1800,.35),
    squeak:()=>{screech(2400,.09);setTimeout(()=>screech(2600,.08),120);},
    chitter:()=>{for(let i=0;i<5;i++)setTimeout(()=>screech(1400+i*90,.05),i*70);},
    trumpet:()=>{tone(260,.8,"sawtooth",.07,340);setTimeout(()=>tone(420,.5,"sawtooth",.05,-120),250);},
    ook:()=>{tone(280,.2,"triangle",.12,220);setTimeout(()=>tone(320,.22,"triangle",.12,260),230);},
    click:()=>{for(let i=0;i<8;i++)setTimeout(()=>tone(2800,.03,"square",.04),i*45);setTimeout(()=>screech(1600,.25),420);},
    whale:()=>{tone(170,1.3,"sine",.11,140);setTimeout(()=>tone(300,1,"sine",.07,-160),700);},
    blub:()=>{[0,120,240].forEach((t,i)=>setTimeout(()=>tone(300+i*80,.1,"sine",.1,-150),t));},
    bellow:()=>{growl(45,1.2,.2);setTimeout(()=>growl(38,.8,.14),300);},
    yawn:()=>tone(420,1.1,"sine",.07,-260),''')
rep('''    backup:()=>{const t=actx().currentTime;[0,.55,1.1].forEach(d=>osc("square",1050,t+d,.3,.035,2500));}};''',
'''    backup:()=>{const t=actx().currentTime;[0,.55,1.1].forEach(d=>osc("square",1050,t+d,.3,.035,2500));},
    fanfare:()=>{const t=actx().currentTime;[523,659,784,1047,784,1047].forEach((f,i)=>osc("square",f,t+i*.13+(i>3?.1:0),i>3?.3:.12,.045,2400));},
    drum:()=>{growl(70,.2,.22);hiss(actx().currentTime,.08,.08,"lowpass",400);},
    rumble:()=>{growl(34,1.6,.22);hiss(actx().currentTime,1.4,.12,"lowpass",200);},
    tuk:()=>{const t=actx().currentTime;[0,.14,.28,.42].forEach(d=>osc("square",880,t+d,.08,.04,3000));}};''')
rep('''quack:"QUACK!",croak:"RIBBIT",splash:"SPLASH",buzz:"BZZZ",screech:"SKREE!",snap:"SNAP!",chomp:"CHOMP!"}''',
'''quack:"QUACK!",croak:"RIBBIT",splash:"SPLASH",buzz:"BZZZ",screech:"SKREE!",snap:"SNAP!",chomp:"CHOMP!",
      squeak:"SQUEAK!",chitter:"CHIT CHIT!",trumpet:"HRRUU!",ook:"OOK OOK!",click:"EEK EEK!",whale:"WHOOM!",blub:"BLUB!",bellow:"BWOOM!",yawn:"YAAWN"}''')

# ---------- 10. hooks ----------
rep('''    default:Sound.sfx.veh("honk");vShout(v,m.name.toUpperCase()+"!");''','''    default:if(newVehicleAct(v,m))break;Sound.sfx.veh("honk");vShout(v,m.name.toUpperCase()+"!");''')
rep('''!["fish","shark","bat","hawk","dragon","duck"].includes(o.id)''','''!["fish","shark","bat","hawk","dragon","duck","dolphin","whale","octopus","eagle","parrot","lobster","crab","sauropod","mammoth","elephant"].includes(o.id)''')
rep('''  Quests.hit("read");
  state.daily=state.daily||{};''','''  Quests.hit("read");state.lastWord=cur.w;
  state.daily=state.daily||{};''')
i=s.index("function useBuilding(key,id){")
s=s[:i]+io.open("/home/claude/work/content.js",encoding="utf-8").read()+"\n"+s[i:]

# ---------- 11. CSS ----------
css='''/* v4.2 */
.vehicle svg .arm{transform-box:fill-box;transform-origin:95% 62%}
.vehicle.dig .arm{animation:digArm 1.6s ease-in-out}
@keyframes digArm{0%,100%{transform:none}30%,50%{transform:rotate(-22deg)}78%{transform:rotate(10deg)}}
.vehicle svg .bed{transform-box:fill-box;transform-origin:95% 100%}
.vehicle.tipper .bed{animation:tipBed 2s ease-in-out}
@keyframes tipBed{0%,100%{transform:none}35%,70%{transform:rotate(30deg)}}
.vehicle svg .blade{transform-box:fill-box;transform-origin:100% 50%}
.vehicle.doze .blade{animation:bladeUp 1.2s ease-in-out}
@keyframes bladeUp{0%,100%{transform:none}30%{transform:translateY(-8px) rotate(6deg)}60%{transform:translateY(2px)}}
.vehicle.mix .stripe{animation:mixdrum .45s linear 5}
@keyframes mixdrum{to{stroke-dashoffset:-24}}
.vehicle svg .cable{transform-box:fill-box;transform-origin:50% 0%}
.vehicle.lift .cable{animation:cableDown 2.2s ease-in-out}
@keyframes cableDown{0%,100%{transform:none}35%,55%{transform:scaleY(1.9)}}
.vehicle.lift .hookb{animation:hookDown 2.2s ease-in-out}
@keyframes hookDown{0%,100%{transform:none}35%,55%{transform:translateY(22px)}}
.vehicle svg .wheel{transform-box:fill-box;transform-origin:50% 50%}
.vehicle.crush .wheel,.vehicle.driving .wheel{animation:wspin .4s linear infinite}
@keyframes wspin{to{transform:rotate(-360deg)}}
.vehicle.crush .act{animation:monsterJump 1.3s cubic-bezier(.3,.9,.4,1)}
@keyframes monsterJump{0%{transform:none}10%{transform:scaleY(.85)}45%{transform:translateY(-110%) rotate(-12deg)}80%{transform:scaleY(.8) scaleX(1.1)}100%{transform:none}}
.vehicle.submerge .act{animation:submerge 2.4s ease-in-out}
@keyframes submerge{0%,100%{transform:none;opacity:1}30%,70%{transform:translateY(45%);opacity:.25}}
.vehicle.liftoff .act{animation:liftoff 1.9s cubic-bezier(.55,0,.9,.35) forwards}
@keyframes liftoff{0%{transform:none}10%{transform:translateY(3%)}100%{transform:translateY(-170vh)}}
.vehicle.touchdown .act{animation:touchdown 1.5s cubic-bezier(.15,.7,.3,1)}
@keyframes touchdown{0%{transform:translateY(-170vh)}85%{transform:translateY(2%)}100%{transform:none}}
.vehicle.swing .act{animation:vswing 1.6s ease-in-out;transform-origin:50% 0}
@keyframes vswing{0%,100%{transform:none}25%{transform:rotate(8deg)}75%{transform:rotate(-8deg)}}
.critter.c-slide .hop{animation:cSlide 1.6s ease-in-out}
@keyframes cSlide{0%,100%{transform:none}15%,85%{transform:rotate(-70deg) translateY(20%)}}
.critter.c-color .hop{animation:cColor 2.4s linear}
@keyframes cColor{0%{filter:none}25%{filter:hue-rotate(90deg) saturate(1.6)}50%{filter:hue-rotate(180deg) saturate(1.8)}75%{filter:hue-rotate(270deg) saturate(1.6)}100%{filter:none}}
.critter.c-stretch .hop{animation:cStretch 1.8s ease-in-out}
@keyframes cStretch{0%,100%{transform:none}30%,75%{transform:scaleY(1.35)}}
.beam{position:absolute;width:420px;height:70px;transform-origin:0 50%;pointer-events:none;z-index:300;
  background:linear-gradient(90deg,rgba(255,240,150,.85),rgba(255,240,150,0));clip-path:polygon(0 44%,100% 0,100% 100%,0 56%);
  animation:sweep 2.4s ease-in-out forwards}
@keyframes sweep{0%{transform:translateY(-50%) rotate(190deg);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(-50%) rotate(350deg);opacity:0}}
'''
rep("/* signature moves */",css+"/* signature moves */")
# shouts: outline all round so they read on snow and sand
rep('''  font-weight:900;font-size:clamp(15px,2.4vw,22px);color:#fff;letter-spacing:.05em;
  text-shadow:0 2px 0 var(--ink),0 0 8px rgba(0,0,0,.4);''','''  font-weight:900;font-size:clamp(15px,2.4vw,22px);color:#fff;letter-spacing:.05em;
  text-shadow:0 2px 0 var(--ink),0 -2px 0 var(--ink),2px 0 0 var(--ink),-2px 0 0 var(--ink),2px 2px 0 var(--ink),-2px 2px 0 var(--ink),2px -2px 0 var(--ink),-2px -2px 0 var(--ink),0 0 10px rgba(0,0,0,.45);''')
rep('''  color:#fff;text-shadow:0 2px 0 var(--ink),0 0 8px rgba(0,0,0,.4);opacity:0;pointer-events:none;letter-spacing:.06em;white-space:nowrap}''',
'''  color:#fff;text-shadow:0 2px 0 var(--ink),0 -2px 0 var(--ink),2px 0 0 var(--ink),-2px 0 0 var(--ink),2px 2px 0 var(--ink),-2px 2px 0 var(--ink),2px -2px 0 var(--ink),-2px -2px 0 var(--ink),0 0 10px rgba(0,0,0,.45);opacity:0;pointer-events:none;letter-spacing:.06em;white-space:nowrap}''')
io.open(P,"w",encoding="utf-8").write(s)
print("patched",round(len(s)/1024),"KB")
