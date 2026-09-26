/* ================================================================
   MY OWN BOOK — he writes it
   He picks a picture and builds a sentence from words he can read,
   page by page. The book goes on his shelf next to the others, and he
   can read it to his pet to record it. Writing sentences out of words
   he knows is one of the best things for reading: it makes him think
   about every word, in order, and what it means.
   ================================================================ */
const MyBook=(()=>{
  const S=()=>state.mybooks||(state.mybooks=[]);
  // the words he can use, grouped so the choice is manageable
  const GROUPS={
    little:["The","A","I","My","the","a","and","is","was","on","in","to","at","by","with","his","has","can","not","it","he","she","we","you","they","of","for","up"],
    doing:["sat","ran","hid","dug","got","had","sees","likes","jumps","digs","naps","runs","hops","swims","eats","reads","sings","rides","finds","hugs","sits","gets","went","fell","yelled","jumped","fishing","sleeping"],
    describing:["big","red","hot","fun","sad","glad","fast","wet","tall","small","happy","little","silly","best","cold","pink","black","green"]};
  const tier=()=>currentTier();
  const okWord=w=>{try{return Decode.tier(w)<=tier();}catch(e){return true;}};
  function nouns(){
    const set=new Set();
    (state.critters||[]).forEach(c=>{const n=(CRIT(c.id)||{}).name;if(n&&okWord(n.toLowerCase())&&!n.includes(" "))set.add(n.toLowerCase());});
    allWords().filter(w=>!w.tricky&&WORD_ART[w.w]&&w.t<=tier()).sort((a,b)=>((state.stats[b.w]||{}).seen||0)-((state.stats[a.w]||{}).seen||0)).slice(0,40).forEach(w=>set.add(w.w));
    return["Ash",...set];
  }
  const artFor=w=>w==="Ash"?"ash":(WORD_ART[w]?w:(CRITTERS.find(c=>c.name.toLowerCase()===w)||{}).id)||null;
  // turn his books into shelf books
  function inject(){
    for(let i=BOOKS.length-1;i>=0;i--)if(BOOKS[i].mine)BOOKS.splice(i,1);
    S().forEach(b=>{if(!b.pages.length)return;
      BOOKS.unshift({id:b.id,t:1,mine:true,title:b.title||"My Book",bg:b.bg||"meadow",cover:b.pages[0].a||"ash",
        pages:b.pages.map(p=>[p.words.join(" ").replace(/ ([.!?])/g,"$1"),[["ash",25,.9],...(p.a&&p.a!=="ash"?[[p.a,66,1]]:[])]]),quiz:[]});});
  }
  let ov=null,book=null,page=0,title=false;
  const sheet=html=>{if(!ov){ov=document.createElement("div");ov.className="overlay";ov.id="ovMaker";document.body.appendChild(ov);}
    const again=ov.classList.contains("on");ov.innerHTML=`<div class="sheet maker${again?" noanim":""}">${html}</div>`;ov.classList.add("on");return ov.querySelector(".sheet");};
  function create(){
    book={id:"my_"+Date.now().toString(36),title:"",pages:[{a:null,words:[]}],bg:["meadow","pond","farm","town","night","sea"][S().length%6],at:Date.now()};
    page=0;title=false;edit();
  }
  function edit(){
    const p=title?{a:book.pages[0].a,words:book.titleWords||[]}:book.pages[page];
    const text=p.words.join(" ").replace(/ ([.!?])/g,"$1");
    const noun=nouns(),cats={who:noun,...GROUPS};let tab=edit.tab||"who";
    const s=sheet(`<div class="bhead"><h2>✏️ ${title?"Name your book":"My book · page "+(page+1)}</h2><button class="bx" id="mkX">✕</button></div>
      <div class="mkwrap"><div class="mkpic">${title?`<div class="mktitle">📕</div>`:p.a?Books.art(p.a,9):`<div class="mkpick">Pick a picture ⬇</div>`}</div>
        <div class="mkline">${p.words.length?p.words.map((w,i)=>`<button class="mkw" data-i="${i}">${w}</button>`).join(""):`<span class="mkhint">Tap words below to ${title?"name your book":"write a sentence"}.</span>`}</div></div>
      <div class="mkrow"><button class="btn soft" id="mkHear" ${p.words.length?"":"disabled"}>🔊 Hear it</button>
        <button class="btn soft" data-p=".">.</button><button class="btn soft" data-p="!">!</button><button class="btn soft" data-p="?">?</button>
        <button class="btn soft" id="mkUndo" ${p.words.length?"":"disabled"}>⌫</button></div>
      <div class="mktabs">${[["who","🐾 Who & what"],["doing","🏃 Doing"],["describing","🎨 Describing"],["little","🔤 Little words"]].map(([k,n])=>`<button class="mktab${k===tab?" on":""}" data-t="${k}">${n}</button>`).join("")}${title?"":`<button class="mktab${tab==="pics"?" on":""}" data-t="pics">🖼️ Picture</button>`}</div>
      <div class="mkbank"></div>
      <div class="mrow mkfoot">${title?`<button class="btn primary big" id="mkSave" ${p.words.length?"":"disabled"}>📚 Put it on my shelf</button>`:
        `${page>0?`<button class="btn soft" id="mkPrev">◀ Page ${page}</button>`:""}<button class="btn soft" id="mkAdd" ${p.words.length?"":"disabled"}>➕ New page</button>
         <button class="btn primary big" id="mkDone" ${book.pages.some(x=>x.words.length)?"":"disabled"}>Finish ▶</button>`}</div>`);
    const bank=s.querySelector(".mkbank");
    const fill=t=>{edit.tab=t;s.querySelectorAll(".mktab").forEach(b=>b.classList.toggle("on",b.dataset.t===t));
      if(t==="pics"){const pics=["ash",...(state.mine&&state.mine.pet?["pet"]:[]),...noun.map(artFor).filter(Boolean).filter(x=>x!=="ash")];
        bank.innerHTML=[...new Set(pics)].map(a=>`<button class="mkpicb" data-a="${a}">${Books.art(a,9)}</button>`).join("");
        bank.querySelectorAll(".mkpicb").forEach(b=>b.onclick=()=>{p.a=b.dataset.a;Sound.sfx.pop();edit.tab="who";edit();});return;}
      const list=(cats[t]||[]).filter(w=>okWord(w.toLowerCase().replace(/[^a-z']/g,"")));
      bank.innerHTML=list.map(w=>`<button class="mkb${artFor(w)&&t==="who"?" n":""}" data-w="${w}">${w}</button>`).join("")||`<span class="mkhint">Read more words to unlock these!</span>`;
      bank.querySelectorAll(".mkb").forEach(b=>b.onclick=()=>{
        let w=b.dataset.w;if(!p.words.length&&!title)w=w[0].toUpperCase()+w.slice(1);
        if(title)w=w[0].toUpperCase()+w.slice(1);
        p.words.push(w);if(!title&&!p.a&&artFor(b.dataset.w))p.a=artFor(b.dataset.w);
        Sound.say("word:"+b.dataset.w.toLowerCase(),b.dataset.w.toLowerCase(),.9);if(title)book.titleWords=p.words;edit();});};
    fill(tab);
    s.querySelectorAll(".mktab").forEach(b=>b.onclick=()=>fill(b.dataset.t));
    s.querySelectorAll(".mkw").forEach(b=>b.onclick=()=>{p.words.splice(+b.dataset.i,1);edit();});
    s.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{if(!p.words.length)return;if(/[.!?]$/.test(p.words[p.words.length-1]||""))p.words.pop();p.words.push(b.dataset.p);edit();});
    s.querySelector("#mkUndo").onclick=()=>{p.words.pop();edit();};
    s.querySelector("#mkHear").onclick=()=>Sound.say("sent:"+text,text,.9);
    s.querySelector("#mkX").onclick=()=>{ov.classList.remove("on");};
    const add=s.querySelector("#mkAdd");if(add)add.onclick=()=>{if(book.pages.length>=8){toast("8 pages is a big book!");return;}
      endStop(p);book.pages.splice(page+1,0,{a:null,words:[]});page++;edit();};
    const prev=s.querySelector("#mkPrev");if(prev)prev.onclick=()=>{page--;edit();};
    const done=s.querySelector("#mkDone");if(done)done.onclick=()=>{book.pages=book.pages.filter(x=>x.words.length);book.pages.forEach(endStop);title=true;edit.tab="who";edit();};
    const sv=s.querySelector("#mkSave");if(sv)sv.onclick=save2;
  }
  const endStop=p=>{if(p.words.length&&!/[.!?]/.test(p.words[p.words.length-1]))p.words.push(".");};
  function save2(){
    book.title=(book.titleWords||[]).filter(w=>!/[.!?]/.test(w)).join(" ")||"My Book";
    const i=S().findIndex(b=>b.id===book.id);if(i>=0)S()[i]=book;else S().push(book);
    const words=book.pages.reduce((a,p)=>a+p.words.filter(w=>!/[.!?]/.test(w)).length,0);
    state.wordsRead+=words;const first=i<0;if(first){state.gems+=5+book.pages.length;}
    save();inject();renderHUD();try{Quests.hit("mybook");}catch(e){}
    confetti();Sound.sfx.fanfare();
    const s=sheet(`<div class="qwin"><div class="qprize">📕</div><h2>“${book.title}”</h2><p class="sub">by me! · ${book.pages.length} page${book.pages.length>1?"s":""}</p>
      ${first?`<p class="mpaid">+${5+book.pages.length} 💎</p>`:""}
      <div class="mrow" style="justify-content:center"><button class="btn soft" id="mkShelf">📚 My shelf</button>
      <button class="btn primary big" id="mkRead">🎤 Read it to my ${Books.petWord(1)}</button></div></div>`);
    s.querySelector("#mkShelf").onclick=()=>{ov.classList.remove("on");Books.shelf();};
    s.querySelector("#mkRead").onclick=()=>{ov.classList.remove("on");Books.openBook(book.id);};
  }
  function card(){return`<button class="bcov maker" id="bMake"><div class="bart">✏️</div><b>Make my own book</b><span>${S().length?S().length+" made":"NEW!"}</span></button>`;}
  function editBook(id){const b=S().find(x=>x.id===id);if(!b)return;book=JSON.parse(JSON.stringify(b));page=0;title=false;edit();}
  function remove(id){state.mybooks=S().filter(b=>b.id!==id);save();inject();}
  return{inject,create,card,editBook,remove,_book:()=>book};
})();
