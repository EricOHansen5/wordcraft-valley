import sys
W='/home/claude/work/'
h=open(W+'wordcraft-valley.html').read()
def rep(old,new,n=1,name=''):
    global h
    c=h.count(old)
    if c!=n:sys.exit(f'FAIL {name}: {c}x')
    h=h.replace(old,new)
rep('''  function speak(t,rate=.95,pitch=1.0){
    if(!state.settings.tts||!window.speechSynthesis)return Promise.resolve();''','''  // the recorded game voice first; the device voice only for lines it doesn't have
  function speak(t,rate=.95,pitch=1.0){
    if(typeof VoicePack!=="undefined"&&state.settings.voicePack!==false)return VoicePack.play(t).then(ok=>ok?undefined:ttsSpeak(t,rate,pitch));
    return ttsSpeak(t,rate,pitch);
  }
  function ttsSpeak(t,rate=.95,pitch=1.0){
    if(!state.settings.tts||!window.speechSynthesis)return Promise.resolve();''',name='speak')
rep('''/* ================================================================
   5. STATE''',open(W+'voicepack.js').read()+'''
/* ================================================================
   5. STATE''',name='vp')
rep('''    <div class="row"><div class="grow"><div class="lbl">Reading voice</div>''','''    <div class="row"><div class="grow"><div class="lbl">Game voice</div>
      <div class="meta" id="packMeta">One natural voice for every word, book and story — the same on every device. Your Voice Studio recordings still come first.</div>
      <button class="btn soft" id="packDl" style="min-height:40px;padding:6px 12px;margin-top:6px">⬇️ Save for offline</button></div>
      <label class="switch"><input type="checkbox" id="optPack" checked></label></div>
    <div class="row"><div class="grow"><div class="lbl">Device voice (backup)</div>''',name='row')
rep('''  return{say,sfx,speak,voices:englishVoices,current:pickVoice,scoreVoice,''','''  return{say,sfx,speak,ctx:()=>actx(),stopVoice:()=>{try{speechSynthesis.cancel();}catch(e){}},voices:englishVoices,current:pickVoice,scoreVoice,''',name='ctx')
rep('try{Notes.renderPane();Sync.renderRow();}catch(e){}','try{Notes.renderPane();Sync.renderRow();voiceRow();}catch(e){}',name='openParent')
a=h.index('/* ================================================================\n   HOME-SERVER BACKUP');b=h.index('\n})();',a)+6
h=h[:a]+open(W+'sync.js').read().rstrip()+h[b:]
open(W+'wordcraft-valley.html','w').write(h);print('ok')
