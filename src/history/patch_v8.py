import sys
W='/home/claude/work/'
h=open(W+'wordcraft-valley.html').read()
def rep(old,new,n=1,name=''):
    global h
    c=h.count(old)
    if c!=n:sys.exit(f'FAIL {name}: {c}x')
    h=h.replace(old,new)
# newer adventure.js replaces the v7 copy
a=h.index('/* ================================================================\n   VALLEY ADVENTURE');b=h.index('setTimeout(advBadge,1500);',a)+len('setTimeout(advBadge,1500);')
h=h[:a]+open(W+'adventure.js').read().rstrip()+h[b:]
# markup
rep('<button class="tab" data-tab="pack">Creatures</button>','<button class="tab" data-tab="pack">Creatures</button>\n    <button class="tab" data-tab="notes">💌 Notes</button>',name='tab')
rep('  <div class="pane" id="pane-set">','  <div class="pane" id="pane-notes"></div>\n  <div class="pane" id="pane-set">',name='pane')
rep('    <p class="hint" style="margin-top:16px">Creature artwork','    <div class="row" id="syncRow"></div>\n    <p class="hint" style="margin-top:16px">Creature artwork',name='syncrow')
rep('<option value="8">8 · two-part words</option></select>','<option value="8">8 · two-part words</option><option value="9">9 · endings -ing, -ed</option>\n        <option value="10">10 · soft c/g, y</option><option value="11">11 · compound words</option><option value="12">12 · silent letters, contractions</option></select>',name='tiers')
rep('function openParent(){renderProgress();renderDaily();renderWordsPane();renderStudio();renderPackPane();renderSettings();show("ovParent");}',
    'function openParent(){renderProgress();renderDaily();renderWordsPane();renderStudio();renderPackPane();renderSettings();try{Notes.renderPane();Sync.renderRow();}catch(e){}show("ovParent");}',name='openParent')
# books shelf: his own books + the maker
rep('''    build();stopAudio();
    const L0=L(),cards=BOOKS.map(b=>{''','''    build();stopAudio();try{MyBook.inject();}catch(e){}
    const L0=L(),cards=(typeof MyBook!=="undefined"?MyBook.card():"")+BOOKS.map(b=>{''',name='shelf')
rep('''<span>${lock?`Level ${b.t}`:p.done?''','''<span>${b.mine?"✏️ by me":lock?`Level ${b.t}`:p.done?''',name='shelfspan')
rep('''    ov.querySelectorAll(".bcov:not(.locked)").forEach(c=>c.onclick=()=>openBook(c.dataset.id));''','''    ov.querySelectorAll(".bcov:not(.locked):not(.maker)").forEach(c=>c.onclick=()=>openBook(c.dataset.id));
    const mk=ov.querySelector("#bMake");if(mk)mk.onclick=()=>{close();MyBook.create();};''',name='shelfwire')
rep('const nextNew=()=>BOOKS.find(b=>unlocked(b)&&','const nextNew=()=>BOOKS.find(b=>!b.mine&&unlocked(b)&&',name='nextNew')
# report
rep('done=BOOKS.filter(b=>(lib[b.id]||{}).done)','done=BOOKS.filter(b=>!b.mine&&(lib[b.id]||{}).done)',name='rep1')
rep('${done.length}/${BOOKS.length}','${done.length}/${BOOKS.filter(b=>!b.mine).length}',name='rep2')
rep('<h3>Adventure</h3><p class="rnote">','''<h3>Writing</h3><p class="rnote">${(()=>{const r=Write.report();return r.length?`Letters he writes from memory: <b>${r.filter(x=>x.lv===2).map(x=>x.c).join(" ")||"none yet"}</b>. Still tracing: ${r.filter(x=>x.lv===0).map(x=>x.c).join(" ")||"none"}. ${state.writes||0} words written, ${(state.mybooks||[]).length} books of his own.`:"No writing yet — ✍️ crates appear once he has read a few words.";})()}</p>
    <h3>Story and extras</h3><p class="rnote">The Letter Thief: ${Math.min(6,(state.quest||{}).ch||0)} of 6 chapters. Notes from home found: ${(state.notes||[]).filter(n=>n.found).length}. Races won: ${(state.vehicles||[]).reduce((a,v)=>a+(v.wins||0),0)}.</p>
    <h3>Adventure</h3><p class="rnote">''',name='rep3')
# write crates
rep('''  else if(tier>=2&&Math.random()<.2&&PicSentence.make(tier))out.push({pic:true});''','''  else if(tier>=2&&Math.random()<.2&&PicSentence.make(tier))out.push({pic:true});
  // write a word he has read, letter by letter
  else if(state.wordsRead>6&&Math.random()<.16)out.push({write:true});''',name='writecrate')
rep('''    if(w.pic){
      b.className="crate pic";''','''    if(w.write){
      b.className="crate write";
      b.innerHTML=`<div style="font-size:56px;line-height:66px">✍️</div><div class="w">write it</div><div class="tagline">trace a word · +2 gems</div>`;
      b.onclick=()=>{Sound.sfx.pop();hide("ovCrates");Write.start();};
    }else if(w.pic){
      b.className="crate pic";''',name='writecrate2')
# hungry animals show a strawberry
rep('''    if(cr.shiny)el.classList.add("shiny");''','''    if(cr.shiny)el.classList.add("shiny");
    try{if(Care.hungry(cr))el.classList.add("hungry");}catch(e){}''',name='hungry')
# quests
rep('''  {id:"hunt1",  ic:"🗺️", t:"Find a buried treasure",    k:"treasure",n:1},''','''  {id:"hunt1",  ic:"🗺️", t:"Find a buried treasure",    k:"treasure",n:1},
  {id:"care3",  ic:"🍓", t:"Feed 3 animals in Adventure", k:"care",  n:3},
  {id:"race1",  ic:"🏁", t:"Win a race",                k:"race",   n:1},
  {id:"write1", ic:"✍️", t:"Write a word",              k:"write",  n:1},''',name='quests')
# modules + css
js='\n'.join(open(W+f).read() for f in ['notes.js','quest.js','mybook.js','write.js','care.js','sync.js'])
rep('function useBuilding(key,id){',js+'\nfunction useBuilding(key,id){',name='js')
rep('/* v4.3 */',open(W+'v8.css').read()+'/* v4.3 */',name='css')
open(W+'wordcraft-valley.html','w').write(h);print('ok')
