// v10.3 Looks: the 🎨 Closet (Valley, and a look with nothing earned greyed), Looks.inWindow on the window's edges,
// pieces granted one at a time (the first puts the look on and says the greeting once), the valley showing exactly the
// pieces earned (props, bat particles, the witch hat), the look's tint, class and crate skin, redraws without doubles,
// wearing and taking off on any day (a fixed date in March), the season's tint coming back, and old saves.
const {launch,seed,reload,waitFor,check}=require("./lib");
(async()=>{
  const T=check("looks"),ok=T.ok,J=JSON.stringify;
  // the keepers of the three open lands are awake, so no cut-scene opens on top; he wears the flower hat
  const START={guardians:[0,1,2],settings:{goal:0},hats:["flower"],hat:"flower"};
  const {page:p,errs,close,E}=await launch({seed:START});
  const GREET="Happy Halloween! Your valley looks spooky and sweet.";
  const IDS=["pumpkins","ghost","bats","hat"],NAMES=["pumpkins","ghost","bats","witch hat"];
  // record what is said instead of playing it (again after every reload)
  const listen=()=>E(()=>{window.__said=[];Sound.speak=t=>{window.__said.push(String(t));return Promise.resolve();};});
  const said=()=>E(()=>window.__said.slice());
  const tidy=()=>E(()=>document.querySelectorAll(".overlay.on").forEach(o=>o.classList.remove("on")));
  const wait=ms=>p.waitForTimeout(ms);
  // what the valley shows of a look
  const view=()=>E(()=>({props:[...document.querySelectorAll("#tiles .lookprop")].map(e=>e.dataset.prop).sort(),
    bats:document.querySelectorAll("#particles .lbat").length,
    hat:!!document.querySelector("#buddyWorld [data-hat=witch]"),hudHat:!!document.querySelector("#buddyBtn [data-hat=witch]"),
    cls:document.body.classList.contains("look-on")&&document.body.classList.contains("look-halloween"),
    anyCls:[...document.body.classList].some(c=>c.indexOf("look-")===0),
    tint:document.getElementById("seasonTint").style.background,
    crate:getComputedStyle(document.body).getPropertyValue("--look-crate").trim()}));
  // the Closet's cards
  const cards=()=>E(()=>[...document.querySelectorAll("#clGrid .clcard")].map(c=>({look:c.dataset.look,worn:c.classList.contains("worn"),
    locked:c.classList.contains("locked"),text:c.querySelector(".cost").textContent.trim(),act:(c.querySelector("button")||{dataset:{}}).dataset.act,
    got:[...c.querySelectorAll(".clpc.got")].map(x=>x.dataset.piece)})));
  const openCloset=async()=>{await p.click("#closetBtn");return waitFor(p,()=>Modes.top()==="closet");};
  const shut=async()=>{await p.click("#clClose");return waitFor(p,()=>Modes.top()==="valley");};
  const tapCard=async id=>{await p.click(`#clGrid .clcard[data-look="${id}"]`);await wait(150);};
  // a CSS background as the page writes it back (to compare with #seasonTint)
  const asCss=v=>E(x=>{const d=document.createElement("div");d.style.background=x;return d.style.background;},v);
  await listen();await tidy();

  // ---- 1. a save without looks, and the Closet with nothing earned ----
  ok(await E(()=>state.look===""&&JSON.stringify(state.looks)==="{}"),"a save without the fields: look is \"\" and looks is {}");
  const baseTint=await E(()=>document.getElementById("seasonTint").style.background);
  ok(baseTint===await asCss(await E(()=>season().tint)),"no look: #seasonTint is the season's tint "+baseTint);
  let v=await view();
  ok(!v.props.length&&!v.bats&&!v.hat&&!v.anyCls&&!v.crate,"no look: no props, no bats, no witch hat, no look class or tokens "+J(v));
  await p.tap("#closetBtn");
  ok(await waitFor(p,()=>Modes.top()==="closet"),"a tap on 🎨 opens the Closet (mode closet)");
  ok(await E(()=>Modes.list().closet.name==="Closet"&&Modes.list().closet.reading===false),"the closet mode: \"Closet\", not reading");
  let c=await cards();
  ok(c.length===2&&c[0].look===""&&c[0].worn&&c[1].look==="halloween"&&c[1].locked&&!c[1].worn,"the Closet lists Valley (worn) and Halloween (greyed) "+J(c));
  ok(c[1].text==="Earn it at Halloween 🎃"&&await E(()=>document.querySelector('#clGrid [data-look="halloween"] .clwhen').textContent)==="in October",
    "a look with nothing earned: \"Earn it at Halloween 🎃\", in October: "+c[1].text);
  await tapCard("halloween");
  v=await view();
  ok(await E(()=>state.look==="")&&!v.props.length&&!v.anyCls,"tapping a look not earned yet puts nothing on");
  ok(/Earn it at Halloween/.test(await E(()=>document.getElementById("clMsg").textContent)),"... and says when it comes");
  ok(await shut(),"Done closes the Closet");

  // ---- 2. the window (pure) ----
  const w=await E(()=>["2026-10-14","2026-10-15","2026-10-31","2026-11-01"].map(d=>Looks.inWindow("halloween",d)));
  ok(J(w)==="[false,true,true,false]","inWindow: 14 Oct no, 15 Oct yes, 31 Oct yes (the last day counts), 1 Nov no "+J(w));
  const w2=await E(()=>[new Date(2026,9,15,0,1),new Date(2026,9,31,23,59),new Date(2026,10,1,0,0),new Date(2027,9,20,12),new Date(2026,2,10)]
    .map(d=>Looks.inWindow("halloween",d)));
  ok(J(w2)==="[true,true,false,true,false]","inWindow with Dates, in any year "+J(w2));
  ok(await E(()=>Looks.inWindow("nope","2026-10-20")===false&&typeof Looks.inWindow("halloween")==="boolean"&&JSON.stringify(state.looks)==="{}"),
    "inWindow: an unknown look is never in, no date means today, and nothing is written");
  ok(J(await E(()=>Looks.pieces("halloween")))===J({earned:[],all:IDS})&&await E(()=>!Looks.done("halloween")&&!Looks.has("halloween","pumpkins")),
    "pieces(): none of the four earned yet");

  // ---- 3. earning the pieces one at a time ----
  const PROPS=[["pumpkins"],["ghost","pumpkins"],["ghost","pumpkins"],["ghost","pumpkins"]];
  await listen();
  for(let i=0;i<4;i++){
    const got=await E(()=>Looks.grant("halloween"));
    ok(got===IDS[i],`grant ${i+1} gives the ${IDS[i]} (${got})`);
    await wait(100);
    v=await view();const s=await said();
    if(i===0){
      ok(await E(()=>state.look)==="halloween","the first piece puts the look on (state.look = halloween)");
      ok(s.filter(x=>x===GREET).length===1,"... and says the greeting once "+J(s));
      ok(await E(()=>document.getElementById("closetBadge").classList.contains("on")),"the 🎨 button shows a new piece");
    }else ok(s.filter(x=>x===GREET).length===1&&s[s.length-1]===`You got the ${NAMES[i]}! Look in your closet.`,
      `the ${IDS[i]}: says "You got the ${NAMES[i]}!", not the greeting again `+J(s.slice(-1)));
    ok(J(v.props)===J(PROPS[i]),`the valley shows exactly the props earned ${J(v.props)}`);
    ok((v.bats>0)===(i>=2),`bats fly only once they are earned (${v.bats})`);
    ok(v.hat===(i>=3)&&v.hudHat===(i>=3),`the buddy wears the witch hat only once it is earned (valley ${v.hat}, HUD ${v.hudHat})`);
    ok(v.cls&&v.tint!==baseTint&&v.tint===await asCss(await E(()=>LOOKS[0].tint))&&!!v.crate,"the look's classes, its tint (not the season's) and its crate token are on");
    ok(await openCloset(),"the Closet opens");
    c=await cards();
    ok(c[1].text===`${i+1} of 4 pieces`&&!c[1].locked&&c[1].worn&&c[1].act==="off"&&!c[0].worn&&J(c[1].got)===J(IDS.slice(0,i+1)),`the Closet shows ${i+1} of 4 pieces `+J(c[1]));
    if(i===0)ok(!(await E(()=>document.getElementById("closetBadge").classList.contains("on"))),"opening the Closet clears the new-piece dot");
    await shut();
  }
  ok(await E(()=>state.hat)==="flower","the wardrobe hat is left as it was (state.hat = flower)");
  ok(await E(()=>Looks.grant("halloween"))===null&&J(await E(()=>state.looks.halloween.pieces))===J(IDS),"a fifth grant gives nothing: the look is complete");
  ok(await E(()=>Looks.done("halloween")&&Looks.has("halloween","ghost")&&!Looks.has("halloween","nope")&&Looks.grant("nope")===null),
    "done() and has(); an unknown look gives nothing");
  ok((await said()).filter(x=>x===GREET).length===1,"the greeting was said once in all");

  // ---- 4. redraws keep exactly the earned pieces; props step round buildings ----
  const bats0=v.bats;
  await E(()=>{renderWorld();seedParticles();renderWorld();Looks.mount();renderHUD();});await wait(100);
  v=await view();
  ok(J(v.props)===J(["ghost","pumpkins"])&&v.bats===bats0&&v.hat&&v.hudHat&&v.cls,"redrawing the valley keeps the pieces, with no doubles "+J(v));
  ok(await E(()=>{const f=document.querySelector('#tiles .lookprop[data-prop="pumpkins"]');return !!f&&!!f.querySelector("svg");}),"the pumpkins are a drawing");
  const moved=await E(()=>{state.grid["8,7"]={id:"well",seed:1,lv:1};renderWorld();
    const s=Looks._spot(LOOKS[0].props[0]),n=document.querySelectorAll('#tiles .lookprop[data-prop="pumpkins"]').length;
    delete state.grid["8,7"];renderWorld();return{s,n};});
  ok(Math.abs(moved.s.c-8)>=1.4&&moved.s.r===7&&moved.n===1,"a building on the pumpkins' spot: they step along the row, the building stays "+J(moved));
  // the crate faces
  await p.click("#crateBtn");await waitFor(p,()=>Modes.top()==="read");await wait(200);
  const crate=await E(()=>{const k=[...document.querySelectorAll("#crateRow .crate")].find(x=>!x.classList.contains("keep"));
    return k?{edge:getComputedStyle(k).borderTopColor,badge:getComputedStyle(k,"::after").content}:null;});
  ok(crate&&crate.edge==="rgb(91, 63, 140)"&&/🎃/.test(crate.badge),"the crates wear the look: purple edge and a 🎃 "+J(crate));
  await tidy();await wait(100);

  // ---- 5. taking it off and on in the Closet ----
  await openCloset();
  await tapCard("halloween");
  v=await view();
  ok(await E(()=>state.look)===""&&!v.props.length&&!v.bats&&!v.hat&&!v.hudHat&&!v.anyCls&&!v.crate,"tapping the worn look takes it off: no props, bats, hat or look class "+J(v));
  ok(v.tint===baseTint,"... and the season's tint is back "+v.tint);
  ok(await E(()=>state.hat==="flower"&&/#F0628F/i.test(document.querySelector("#buddyWorld").innerHTML)),"... and the buddy has his flower hat on again");
  c=await cards();
  ok(c[0].worn&&!c[1].worn&&c[1].text==="4 of 4 pieces"&&c[1].act==="wear","the Closet: Valley worn, Halloween 4 of 4 to wear "+J(c));
  await wait(650);
  await tapCard("halloween");
  ok(await E(()=>state.look)==="halloween"&&J((await view()).props)===J(["ghost","pumpkins"]),"one tap wears it again");
  await wait(650);
  await tapCard("");
  ok(await E(()=>state.look)===""&&!(await view()).anyCls,"tapping Valley takes it off");
  await wait(650);
  await p.dblclick('#clGrid .clcard[data-look="halloween"]');await wait(150);
  ok(await E(()=>state.look)==="halloween","a double tap puts it on once (not on and off again)");
  await wait(650);
  // the keyboard: Tab to a card's button, Space presses it
  await E(()=>document.querySelector('#clGrid .clcard[data-look="halloween"] button').focus());await p.keyboard.press("Space");await wait(150);
  ok(await E(()=>state.look)===""&&!(await view()).anyCls,"Space on the worn look's button takes it off");
  await wait(650);
  await E(()=>document.querySelector('#clGrid .clcard[data-look="halloween"] button').focus());await p.keyboard.press("Enter");await wait(150);
  ok(await E(()=>state.look)==="halloween","Enter puts it back on");
  await shut();

  // ---- 6. it stays on after a reload ----
  await wait(400);
  await reload(p);await listen();await tidy();
  v=await view();
  ok(v.cls&&J(v.props)===J(["ghost","pumpkins"])&&v.bats>0&&v.hat&&v.hudHat&&v.tint!==baseTint,"after a reload the look is still on, every piece in place "+J(v));

  // ---- 7. worn on any day: 10 March, outside its window ----
  await p.clock.install({time:new Date(2026,2,10,10,0)});
  await reload(p);await listen();await tidy();
  ok(await E(()=>season().id==="spring"&&today()==="2026-03-10"&&!Looks.inWindow("halloween")),"10 March: spring, outside Halloween's window");
  const springTint=await asCss(await E(()=>season().tint));
  v=await view();
  ok(v.cls&&J(v.props)===J(["ghost","pumpkins"])&&v.tint!==springTint,"Halloween is still worn in March "+J(v));
  await openCloset();
  await tapCard("halloween");
  v=await view();
  ok(await E(()=>state.look)===""&&!v.anyCls&&v.tint===springTint,"taken off in March: the spring tint is back "+v.tint);
  await wait(650);
  await tapCard("halloween");
  v=await view();
  ok(await E(()=>state.look)==="halloween"&&v.cls&&v.hat&&v.tint!==springTint,"put on in March: one tap, any day of the year");
  await shut();

  // ---- 8. a look part-way done, and saves from before looks ----
  await seed(p,Object.assign({},START,{look:"halloween",looks:{halloween:{pieces:["pumpkins","ghost"]}}}));await listen();await tidy();
  v=await view();
  ok(v.cls&&J(v.props)===J(["ghost","pumpkins"])&&!v.bats&&!v.hat,"part-way: only the earned pieces show (no bats, no witch hat) "+J(v));
  await openCloset();c=await cards();
  ok(c[1].text==="2 of 4 pieces"&&c[1].worn&&J(c[1].got)===J(["pumpkins","ghost"]),"the Closet shows 2 of 4 pieces "+J(c[1]));
  await shut();
  ok(await E(()=>Looks.grant("halloween",{quiet:true}))==="bats"&&(await said()).length===0&&(await view()).bats>0,"grant({quiet}) gives the next piece and says nothing");
  await seed(p,Object.assign({},START,{look:null,looks:null}));await tidy();
  ok(await E(()=>state.look===""&&JSON.stringify(state.looks)==="{}")&&!(await view()).anyCls,"a save with look and looks null: \"\" and {}");
  await seed(p,Object.assign({},START,{look:"halloween",looks:{}}));await tidy();
  v=await view();
  ok(!v.anyCls&&!v.props.length&&v.tint===await asCss(await E(()=>season().tint)),"a look named but nothing earned of it: the plain valley");

  ok(!errs.length,"no page or console errors"+(errs.length?": "+errs.join(" | "):""));
  await close();T.done();
})().catch(e=>{console.log("FAIL crashed: "+(e&&e.stack||e));process.exit(1);});
