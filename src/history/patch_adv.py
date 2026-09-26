import sys
W='/home/claude/work/'
def rep(s,old,new,n=1,name=''):
    c=s.count(old)
    if c!=n: sys.exit(f'FAIL {name}: found {c}x')
    return s.replace(old,new)
h=open(W+'wordcraft-valley.html').read()
h=rep(h,'<button id="booksBtn">','<button id="advBtn">🧭 Adventure<span class="badge" id="advBadge"></span></button>\n    <button id="booksBtn">',name='dock')
h=rep(h,'''  renderCritters();renderVehicles();renderBuddy();renderGuardians();applyNight();
}''','''  renderCritters();renderVehicles();renderBuddy();renderGuardians();applyNight();
  try{Adv.mount();}catch(e){}
}''',name='renderWorld')
h=rep(h,'''stage.addEventListener("pointerdown",e=>{
  if(e.target.closest(".pan"))return;''','''stage.addEventListener("pointerdown",e=>{
  if(e.target.closest(".pan"))return;
  if(document.body.classList.contains("exploring"))return;   // the camera follows Ash instead''',name='pan')
h=rep(h,'''    if(meta&&meta.rar===3)el.classList.add("legend");else if(meta&&meta.rar===2)el.classList.add("rare");''','''    if(meta&&meta.rar===3)el.classList.add("legend");else if(meta&&meta.rar===2)el.classList.add("rare");
    if(cr.shiny)el.classList.add("shiny");''',name='shiny')
h=rep(h,'''  {id:"book1",  ic:"📚", t:"Read a storybook",          k:"book",   n:1},''','''  {id:"book1",  ic:"📚", t:"Read a storybook",          k:"book",   n:1},
  {id:"wild1",  ic:"🌿", t:"Make a wild animal your friend", k:"wild", n:1},
  {id:"hunt1",  ic:"🗺️", t:"Find a buried treasure",    k:"treasure",n:1},''',name='quests')
h=rep(h,'<h3>Mine</h3><p class="rnote">','<h3>Adventure</h3><p class="rnote">${Object.values((state.adv||{}).dex||{}).filter(d=>d.caught).length} wild friends in the Word-Dex · ${(state.adv||{}).hunts||0} treasure hunts solved. Each friend takes 3–5 reading answers; each hunt is three notes to read.</p>\n    <h3>Mine</h3><p class="rnote">',name='report')
h=rep(h,'function useBuilding(key,id){',open(W+'adventure.js').read()+'\nfunction useBuilding(key,id){',name='js')
h=rep(h,'/* v4.3 */',open(W+'adventure.css').read()+'/* v4.3 */',name='css')
open(W+'wordcraft-valley.html','w').write(h);print('ok')
