// One-minute reading check (Grown-up menu → Progress) and the report's comparison with national norms:
// the norms' arithmetic (seasons, grade 1 fall held against winter, kindergarten has none, percentile bands,
// words correct a minute), the School grade setting, the sheet with no grade / kindergarten, a whole check
// (errors tapped and untapped, the minute running out, the last word, a story finished early, the average),
// the next check moving on to the next two stories, the report block and the phonics placement, an old save.
const {launch,seed,reload,waitFor,check}=require("./lib");
const T=check("fluency"),ok=T.ok,J=JSON.stringify;
(async()=>{
  const {page:p,close,E,errs}=await launch({viewport:{width:1024,height:768},seed:{settings:{goal:0,tierOverride:2}}});
  await E(()=>document.querySelectorAll(".overlay.on").forEach(o=>Modes.shut(o)));

  // ---- 1. the arithmetic ----
  const m=await E(()=>({
    seasons:["2026-08-20","2026-10-01","2026-11-30","2026-12-01","2027-02-28","2027-03-01","2027-07-31"].map(d=>Fluency.season(d)),
    g1fall:Fluency.normFor("1","fall"),g2fall:Fluency.normFor("2","fall"),k:Fluency.normFor("K","spring"),g1spring:Fluency.normFor("1","spring"),
    bands:[5,9,16,28,29,59,96,97,200].map(v=>Fluency.band(v,[9,16,29,59,97]).text),
    s1:Fluency.score(41,2,60),s2:Fluency.score(139,0,30),s3:Fluency.score(0,0,60),
    pl:Fluency.placement(2,"1","2026-10-01"),pl2:Fluency.placement(5,"1","2027-01-10"),pl3:Fluency.placement(7,"K","2026-10-01"),pl4:Fluency.placement(2,"","2026-10-01")}));
  ok(J(m.seasons)===J(["fall","fall","fall","winter","winter","spring","spring"]),"seasons as the norms use them: fall Aug–Nov, winter Dec–Feb, spring Mar–Jul "+J(m.seasons));
  ok(m.g1fall&&m.g1fall.season==="winter"&&J(m.g1fall.row)===J([9,16,29,59,97])&&/no fall norm/.test(m.g1fall.note),"grade 1 in the fall is held against the winter norms, and says why");
  ok(m.g2fall&&J(m.g2fall.row)===J([23,36,50,84,111])&&!m.g2fall.note&&J(m.g1spring.row)===J([18,34,60,91,116]),"grade 2 fall and grade 1 spring are Hasbrouck & Tindal 2017's own rows");
  ok(m.k===null,"kindergarten has no fluency norm");
  ok(J(m.bands)===J(["below the 10th percentile","between the 10th and 25th percentiles","between the 25th and 50th percentiles","between the 25th and 50th percentiles",
    "between the 50th and 75th percentiles","between the 75th and 90th percentiles","between the 75th and 90th percentiles","at or above the 90th percentile","at or above the 90th percentile"]),"percentile bands, each norm counting as reached "+J(m.bands));
  ok(m.s1.wcpm===39&&m.s1.acc===95&&m.s2.wcpm===278&&m.s2.secs===30&&m.s3.wcpm===0&&m.s3.acc===0,"words correct a minute: 41 words with 2 wrong in a minute is 39 (95%); 139 right in 30 s is 278 "+J([m.s1,m.s2]));
  ok(m.pl.taught==="the spring of kindergarten"&&m.pl.diff===-1&&m.pl2.diff===0&&m.pl3.diff===5&&m.pl4.diff===null,"phonics placement: level 2 for a 1st grader in October is one season behind; level 5 in January is in step "+J([m.pl,m.pl2,m.pl3]));

  // ---- 2. the School grade setting, and the sheet without a grade or in kindergarten ----
  ok(await E(()=>JSON.stringify(state.fluency)===JSON.stringify({grade:"",checks:[]})&&!!document.getElementById("optGrade")&&!!document.getElementById("fluBtn")),"a new save: no grade, no checks; the setting and the Progress button are there");
  await E(()=>document.getElementById("fluBtn").click());
  ok(await E(()=>document.getElementById("ovFluency").classList.contains("on")&&/School grade/.test(document.getElementById("ovFluency").textContent)),"with no grade set, the sheet asks for it first");
  await E(()=>{document.getElementById("flOk").click();const s=document.getElementById("optGrade");s.value="K";s.dispatchEvent(new Event("change"));});
  ok(await E(()=>state.fluency.grade==="K"),"choosing Kindergarten saves the grade");
  await E(()=>Fluency.open());
  ok(await E(()=>/no national words-per-minute norm for kindergarten/.test(document.getElementById("ovFluency").textContent)),"kindergarten: the sheet says there is no norm");
  await E(()=>{document.getElementById("flOk").click();const s=document.getElementById("optGrade");s.value="1";s.dispatchEvent(new Event("change"));});

  // ---- 3. a whole check in 1st grade ----
  // the page's clock, moved on by the test (the minute is timed with performance.now)
  await E(()=>{const t=performance.now.bind(performance);window.__off=0;performance.now=()=>t()+window.__off;});
  await E(()=>Fluency.open());
  const ids=await E(()=>Fluency._run().ps.map(x=>x.id));
  ok(J(ids)===J(["g1hat","g1rain"]),"the first check reads the first two 1st-grade stories "+J(ids));
  await E(()=>document.getElementById("flGo").click());
  ok(await E(()=>document.querySelectorAll("#flText .flw").length===150&&/1 of 2/.test(document.querySelector(".flhead").textContent)),"story 1 of 2, every word a tap target");
  // before the minute starts a tap on a word does nothing
  await E(()=>document.querySelector('#flText .flw[data-i="3"]').click());
  ok(await E(()=>!document.querySelector("#flText .flw.err")),"a word tapped before the minute starts is not marked");
  await E(()=>{document.getElementById("flStart").click();[2,5,7,7].forEach(i=>document.querySelector(`#flText .flw[data-i="${i}"]`).click());});
  ok(await E(()=>[...document.querySelectorAll("#flText .flw.err")].map(x=>x.dataset.i).join()==="2,5"),"tapping marks a word wrong; tapping it again undoes it");
  await E(()=>{window.__off+=61000;});
  ok(await waitFor(p,()=>/Time!/.test(document.getElementById("flHint").textContent),{timeout:3000}),"when the minute is up: \"Time! Now tap the last word he reached.\"");
  await E(()=>document.querySelector('#flText .flw[data-i="40"]').click());
  ok(await E(()=>document.querySelector("#flText .flw.lastw").dataset.i==="40"&&document.querySelectorAll("#flText .flw.past").length===109&&document.getElementById("flNext").style.display!=="none"),"the last word is marked, the rest greyed, and Next appears");
  await E(()=>document.getElementById("flNext").click());
  // story 2: he finishes it in 30 seconds with nothing wrong
  ok(await E(()=>/2 of 2/.test(document.querySelector(".flhead").textContent)&&document.querySelectorAll("#flText .flw").length===139),"story 2 of 2");
  await E(()=>{document.getElementById("flStart").click();window.__off+=30000;document.getElementById("flDone").click();});
  ok(await E(()=>document.querySelector("#flText .flw.lastw").dataset.i==="138"&&/See the result/.test(document.getElementById("flNext").textContent)),"He finished: the last word is the story's last");
  await E(()=>document.getElementById("flNext").click());
  const res=await E(()=>({c:state.fluency.checks[0],text:document.getElementById("flResult").textContent,s:Fluency.season()}));
  ok(res.c&&res.c.grade==="1"&&res.c.season===res.s&&res.c.reads.length===2&&res.c.reads[0].wcpm===39&&res.c.reads[0].acc===95&&res.c.reads[1].secs===30&&res.c.reads[1].wcpm===278&&res.c.wcpm===159&&res.c.acc===98,
    "the check is saved: 39 and 278, averaged to 159, 98% right "+J(res.c));
  const want=await E(c=>{const nf=Fluency.normFor(c.grade,c.season);return nf?{band:Fluency.band(c.wcpm,nf.row).text,mid:nf.row[2]}:null;},res.c);
  ok(want&&res.text.indexOf(want.band)>=0&&res.text.indexOf("50th percentile) is "+want.mid)>=0&&/Hasbrouck/.test(res.text),"the result says where it sits and the national middle: "+res.text.slice(0,220));
  await E(()=>document.getElementById("flOk").click());
  ok(await E(()=>!document.getElementById("ovFluency").classList.contains("on")),"Done closes it");

  // ---- 4. the next check moves on; low accuracy and a score well under the middle get their notes ----
  await E(()=>Fluency.open());
  ok(J(await E(()=>Fluency._run().ps.map(x=>x.id)))===J(["g1garden","g1bus"]),"the next check reads the next two stories");
  await E(()=>{document.getElementById("flGo").click();document.getElementById("flStart").click();for(let i=0;i<4;i++)document.querySelector(`#flText .flw[data-i="${i}"]`).click();window.__off+=61000;});
  await waitFor(p,()=>/Time!/.test(document.getElementById("flHint").textContent),{timeout:3000});
  await E(()=>{document.querySelector('#flText .flw[data-i="9"]').click();document.getElementById("flNext").click();
    document.getElementById("flStart").click();for(let i=0;i<4;i++)document.querySelector(`#flText .flw[data-i="${i}"]`).click();window.__off+=61000;});
  await waitFor(p,()=>/Time!/.test(document.getElementById("flHint").textContent),{timeout:3000});
  await E(()=>{document.querySelector('#flText .flw[data-i="9"]').click();document.getElementById("flNext").click();});
  const low=await E(()=>({c:state.fluency.checks[1],text:document.getElementById("flResult").textContent}));
  ok(low.c.wcpm===6&&low.c.acc===60&&/still hard for him/.test(low.text)&&/10 or more words below the 50th percentile/.test(low.text),"6 a minute at 60%: the accuracy note and the extra-practice note "+J([low.c.wcpm,low.c.acc]));
  await E(()=>document.getElementById("flOk").click());

  // ---- 5. the report ----
  const rep=await E(()=>{const d=document.createElement("div");d.innerHTML=Fluency.report();return{t:d.textContent,rows:d.querySelectorAll("tr").length};});
  ok(/Compared with other children/.test(rep.t)&&rep.rows===3&&/159/.test(rep.t)&&/1st grade/.test(rep.t),"the report lists the checks, newest first "+rep.t.slice(0,160));
  ok(/Level 2: short i, e, u/.test(rep.t)&&/spring of kindergarten/.test(rep.t)&&/rough guide/.test(rep.t),"...and places his level in a typical sequence");

  // ---- 6. saved, and an old save without the field ----
  await E(()=>saveNow());await p.waitForTimeout(300);
  await reload(p);
  ok(await E(()=>state.fluency.grade==="1"&&state.fluency.checks.length===2),"the grade and the checks are saved");
  await seed(p,{settings:{goal:0},fluency:null});
  ok(await E(()=>JSON.stringify(state.fluency)===JSON.stringify({grade:"",checks:[]})),"an old save (fluency null) gets the default");

  ok(!errs.length,"no page or console errors "+errs.slice(0,3).join(" | "));
  T.done();await close();process.stdout.write("",()=>process.exit(process.exitCode||0));
})().catch(e=>{console.log("FAIL fluency crashed: "+(e&&e.stack||e));process.exit(1);});
