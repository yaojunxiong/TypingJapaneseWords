const DATA_URL = './data/lessons_full.json?v=9';
const DATA_URL_26_50 = './data/lessons_26_50.json?v=9';
const ADDON_URL = './data/lesson_addons.json?v=9';
const ADDON_URL_26_50 = './data/lesson_addons_26_50.json?v=9';
const TEXTBOOK_URL = './data/textbook_sections.json?v=9';
const state = { lessons: [], addons: [], textbook: [], currentLessonId: 1, voices: [], deferredPrompt: null };
const $ = id => document.getElementById(id);

function progressKey(id){ return `jp-helper-progress-lesson-${id}`; }
function getProgress(lessonId){ try { return JSON.parse(localStorage.getItem(progressKey(lessonId)) || '{}'); } catch { return {}; } }
function setDone(lessonId,itemKey,done){ const p=getProgress(lessonId); p[itemKey]=done; localStorage.setItem(progressKey(lessonId),JSON.stringify(p)); render(); }
function speak(text, rateOverride=null){
  if(!('speechSynthesis' in window)){ alert('This browser does not support speech synthesis. Try Safari or Chrome.'); return; }
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang='ja-JP'; u.rate=rateOverride ?? Number($('rate').value || 0.75);
  const voice=state.voices.find(v=>v.name===$('voiceSelect').value); if(voice) u.voice=voice;
  window.speechSynthesis.speak(u);
}
function speakLines(lines){ speak(lines.map(x=>x.jp).join('。'),0.65); }
function speakConversation(lessonId){ const addon=state.addons.find(a=>a.id===lessonId); if(addon?.conversation) speakLines(addon.conversation.lines); }
function loadVoices(){
  state.voices=window.speechSynthesis ? window.speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('ja')) : [];
  const select=$('voiceSelect'); select.innerHTML='';
  if(!state.voices.length){ const opt=document.createElement('option'); opt.textContent='Default Japanese voice'; opt.value=''; select.appendChild(opt); return; }
  state.voices.forEach(v=>{ const opt=document.createElement('option'); opt.value=v.name; opt.textContent=`${v.name} (${v.lang})`; select.appendChild(opt); });
}
function renderLessonList(){
  const select=$('lessonSelect'); if(!select) return; const currentValue=String(state.currentLessonId); select.innerHTML='';
  state.lessons.forEach(lesson=>{ const p=getProgress(lesson.id); const count=Object.values(p).filter(Boolean).length; const option=document.createElement('option'); option.value=lesson.id; option.textContent=`第${lesson.id}课 - ${lesson.title} (${count} done)`; select.appendChild(option); });
  select.value=currentValue;
}
function matchSearch(item,q){ return !q || JSON.stringify(item).toLowerCase().includes(q.toLowerCase()); }
function card({lessonId,key,jp,kana,zh,note,type}){
  const done=!!getProgress(lessonId)[key];
  return `<div class="${type}-card ${done?'done':''}"><div class="jp">${jp}</div>${kana?`<div class="kana">${kana}</div>`:''}${zh?`<div class="zh">${zh}</div>`:''}${note?`<div class="zh"><strong>Note:</strong> ${note}</div>`:''}<div class="actions"><button onclick='speak(${JSON.stringify(jp)},0.6)'>慢速</button><button onclick='speak(${JSON.stringify(jp)},0.9)'>正常</button><button class="secondary" onclick='setDone(${lessonId},${JSON.stringify(key)},${!done})'>${done?'取消':'掌握'}</button>${done?'<span class="check">✓</span>':''}</div></div>`;
}
function renderLineCards(lines, lessonId, prefix){
  return `<div class="card-grid">${lines.map((line,i)=>`<div class="sentence-card"><div class="kana">${line.speaker?`<strong>${line.speaker}</strong>`:''}</div><div class="jp">${line.jp}</div>${line.kana?`<div class="kana">${line.kana}</div>`:''}${line.zh?`<div class="zh">${line.zh}</div>`:''}<div class="actions"><button onclick='speak(${JSON.stringify(line.jp)},0.6)'>慢速</button><button onclick='speak(${JSON.stringify(line.jp)},0.9)'>正常</button></div></div>`).join('')}</div>`;
}
function renderPracticeBlock(title, items){
  if(!items?.length) return '<p>暂无内容。</p>';
  return `<div class="card-grid">${items.map((ex,i)=>`<div class="grammar-card"><div class="kana">${ex.type || ex.prompt || title}</div><div class="jp">${ex.question || ex.prompt || ''}</div>${ex.items?`<div class="zh">${ex.items.map(x=>`・${x}`).join('<br>')}</div>`:''}${ex.choices?`<div class="zh">${ex.choices.map(x=>`・${x}`).join('<br>')}</div>`:''}${ex.answer?`<details class="zh"><summary>查看答案</summary><strong>${ex.answer}</strong></details>`:''}</div>`).join('')}</div>`;
}
function renderTextbookSections(lesson, q){
  const tb=state.textbook.find(x=>x.id===lesson.id);
  if(!tb) return '';
  const patterns=(tb.sentencePatterns||[]).filter(x=>matchSearch(x,q));
  const examples=(tb.exampleSentences||[]).filter(x=>matchSearch(x,q));
  const convLines=(tb.conversation?.lines||[]).filter(x=>matchSearch(x,q));
  return `<h3 class="section-title">句型</h3>${renderLineCards(patterns, lesson.id, 'pattern')}
    <h3 class="section-title">例文</h3>${renderLineCards(examples, lesson.id, 'example')}
    <h3 class="section-title">会话</h3><div class="lesson-title"><div><h3>${tb.conversation?.title || '会话'}</h3><p>逐句播放 / 整段播放</p></div><button onclick='speakLines(${JSON.stringify(tb.conversation?.lines || [])})'>整段播放</button></div>${renderLineCards(convLines, lesson.id, 'tbconv')}
    <h3 class="section-title">练习A</h3>${renderPracticeBlock('练习A', tb.practiceA)}
    <h3 class="section-title">练习B</h3>${renderPracticeBlock('练习B', tb.practiceB)}
    <h3 class="section-title">练习C</h3>${renderPracticeBlock('练习C', tb.practiceC)}
    <h3 class="section-title">问题</h3>${renderPracticeBlock('问题', tb.questions)}`;
}
function renderConversation(lesson,q){ const addon=state.addons.find(a=>a.id===lesson.id); if(!addon?.conversation) return '<p>No conversation yet.</p>'; const lines=addon.conversation.lines.filter(x=>matchSearch(x,q)); return `<div class="lesson-title"><div><h3>${addon.conversation.title}</h3><p>Dialogue practice. Tap each line to play.</p></div><button onclick='speakConversation(${lesson.id})'>Play all</button></div>${renderLineCards(lines, lesson.id, 'conv')}`; }
function renderExercises(lesson,q){ const addon=state.addons.find(a=>a.id===lesson.id); if(!addon?.exercises) return '<p>No exercises yet.</p>'; return renderPracticeBlock('Exercises', addon.exercises.filter(x=>matchSearch(x,q))); }
function renderLessonView(){
  const lesson=state.lessons.find(l=>l.id===state.currentLessonId); const q=$('searchInput').value.trim(); if(!lesson) return;
  const sentences=lesson.sentences.filter(x=>matchSearch(x,q)); const words=lesson.words.filter(x=>matchSearch(x,q)); const grammar=lesson.grammar.filter(x=>matchSearch(x,q));
  const textbookHtml=renderTextbookSections(lesson,q);
  $('lessonView').innerHTML=`<div class="lesson-title"><div><h2>第${lesson.id}课：${lesson.title}</h2><p>${lesson.description||''}</p></div><button onclick='speak(${JSON.stringify(lesson.title)},0.75)'>播放标题</button></div>
    ${textbookHtml || `<h3 class="section-title">句型 / 例句</h3><div class="card-grid">${sentences.length?sentences.map((s,i)=>card({lessonId:lesson.id,key:`sentence-${i}`,type:'sentence',jp:s.jp,kana:s.kana,zh:s.zh,note:s.note})).join(''):'<p>No matching sentences.</p>'}</div><h3 class="section-title">会话</h3>${renderConversation(lesson,q)}<h3 class="section-title">练习</h3>${renderExercises(lesson,q)}`}
    <h3 class="section-title">单词</h3><div class="card-grid">${words.length?words.map((w,i)=>card({lessonId:lesson.id,key:`word-${i}`,type:'word',jp:w.jp,kana:w.kana,zh:w.zh,note:w.note})).join(''):'<p>No matching words.</p>'}</div>
    <h3 class="section-title">语法</h3><div class="card-grid">${grammar.length?grammar.map((g,i)=>`<div class="grammar-card"><div class="jp">${g.pattern}</div><div class="zh">${g.explain}</div><div class="actions"><button onclick='speak(${JSON.stringify(g.example)},0.65)'>播放例句</button><span>${g.example}</span></div></div>`).join(''):'<p>No matching grammar.</p>'}</div>`;
}
function render(){ renderLessonList(); renderLessonView(); }
async function init(){
  const [lessonRes,lessonRes2,addonRes,addonRes2,tbRes]=await Promise.all([fetch(DATA_URL),fetch(DATA_URL_26_50),fetch(ADDON_URL),fetch(ADDON_URL_26_50),fetch(TEXTBOOK_URL).catch(()=>({json:async()=>[]}))]);
  const lessons1=await lessonRes.json(); const lessons2=await lessonRes2.json(); const addons1=await addonRes.json(); const addons2=await addonRes2.json(); const tb=await tbRes.json();
  state.lessons=[...lessons1,...lessons2].sort((a,b)=>a.id-b.id); state.addons=[...addons1,...addons2].sort((a,b)=>a.id-b.id); state.textbook=tb;
  $('rate').addEventListener('input',e=>$('rateText').textContent=`${e.target.value}x`); $('stopBtn').addEventListener('click',()=>window.speechSynthesis?.cancel()); $('searchInput').addEventListener('input',renderLessonView); $('resetBtn').addEventListener('click',()=>{$('searchInput').value='';renderLessonView();}); $('lessonSelect').addEventListener('change',e=>{state.currentLessonId=Number(e.target.value);renderLessonView();renderLessonList();});
  if('speechSynthesis' in window){ loadVoices(); window.speechSynthesis.onvoiceschanged=loadVoices; }
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(console.warn); }
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); state.deferredPrompt=e; $('installBtn').classList.remove('hidden'); }); $('installBtn').addEventListener('click',async()=>{ if(!state.deferredPrompt) return; state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice; state.deferredPrompt=null; $('installBtn').classList.add('hidden'); });
  render();
}
init().catch(err=>{ console.error(err); $('lessonView').innerHTML=`<p>Load failed: ${err.message}</p>`; });
