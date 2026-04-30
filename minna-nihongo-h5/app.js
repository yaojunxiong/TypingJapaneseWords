const DATA_URL = './data/lessons_full.json?v=7';
const DATA_URL_26_50 = './data/lessons_26_50.json?v=7';
const ADDON_URL = './data/lesson_addons.json?v=7';
const state = { lessons: [], addons: [], currentLessonId: 1, voices: [], deferredPrompt: null };
const $ = id => document.getElementById(id);

function progressKey(id){ return `jp-helper-progress-lesson-${id}`; }
function getProgress(lessonId){
  try { return JSON.parse(localStorage.getItem(progressKey(lessonId)) || '{}'); }
  catch { return {}; }
}
function setDone(lessonId,itemKey,done){
  const p = getProgress(lessonId);
  p[itemKey] = done;
  localStorage.setItem(progressKey(lessonId), JSON.stringify(p));
  render();
}
function speak(text, rateOverride=null){
  if(!('speechSynthesis' in window)){
    alert('This browser does not support speech synthesis. Try Safari or Chrome.');
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = rateOverride ?? Number($('rate').value || 0.75);
  const selectedVoice = $('voiceSelect').value;
  const voice = state.voices.find(v => v.name === selectedVoice);
  if(voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}
function speakConversation(lessonId){
  const addon = state.addons.find(a => a.id === lessonId);
  if(!addon || !addon.conversation) return;
  const text = addon.conversation.lines.map(line => line.jp).join('。');
  speak(text, 0.65);
}
function loadVoices(){
  state.voices = window.speechSynthesis ? window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('ja')) : [];
  const select = $('voiceSelect');
  select.innerHTML = '';
  if(!state.voices.length){
    const opt = document.createElement('option');
    opt.textContent = 'Default Japanese voice';
    opt.value = '';
    select.appendChild(opt);
    return;
  }
  state.voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    select.appendChild(opt);
  });
}
function renderLessonList(){
  const select = $('lessonSelect');
  if(!select) return;
  const currentValue = String(state.currentLessonId);
  select.innerHTML = '';
  state.lessons.forEach(lesson => {
    const p = getProgress(lesson.id);
    const count = Object.values(p).filter(Boolean).length;
    const option = document.createElement('option');
    option.value = lesson.id;
    option.textContent = `Lesson ${lesson.id} - ${lesson.title} (${count} done)`;
    select.appendChild(option);
  });
  select.value = currentValue;
}
function matchSearch(item,q){ return !q || JSON.stringify(item).toLowerCase().includes(q.toLowerCase()); }
function card({lessonId,key,jp,kana,zh,note,type}){
  const p = getProgress(lessonId);
  const done = !!p[key];
  return `<div class="${type}-card ${done ? 'done' : ''}">
    <div class="jp">${jp}</div>
    ${kana ? `<div class="kana">${kana}</div>` : ''}
    ${zh ? `<div class="zh">${zh}</div>` : ''}
    ${note ? `<div class="zh"><strong>Note:</strong> ${note}</div>` : ''}
    <div class="actions">
      <button onclick='speak(${JSON.stringify(jp)},0.6)'>Slow</button>
      <button onclick='speak(${JSON.stringify(jp)},0.9)'>Normal</button>
      <button class="secondary" onclick='setDone(${lessonId},${JSON.stringify(key)},${!done})'>${done ? 'Undo' : 'Done'}</button>
      ${done ? '<span class="check">✓</span>' : ''}
    </div>
  </div>`;
}
function renderConversation(lesson, q){
  const addon = state.addons.find(a => a.id === lesson.id);
  if(!addon || !addon.conversation) return '<p>No conversation yet.</p>';
  const lines = addon.conversation.lines.filter(x => matchSearch(x,q));
  return `<div class="lesson-title"><div><h3>${addon.conversation.title}</h3><p>Dialogue practice. Tap each line to play.</p></div><button onclick='speakConversation(${lesson.id})'>Play all</button></div>
    <div class="card-grid">${lines.map((line,i)=>`<div class="sentence-card"><div class="kana"><strong>${line.speaker}</strong></div><div class="jp">${line.jp}</div><div class="kana">${line.kana}</div><div class="zh">${line.zh}</div><div class="actions"><button onclick='speak(${JSON.stringify(line.jp)},0.6)'>Slow</button><button onclick='speak(${JSON.stringify(line.jp)},0.9)'>Normal</button></div></div>`).join('')}</div>`;
}
function renderExercises(lesson, q){
  const addon = state.addons.find(a => a.id === lesson.id);
  if(!addon || !addon.exercises) return '<p>No exercises yet.</p>';
  const exercises = addon.exercises.filter(x => matchSearch(x,q));
  return `<div class="card-grid">${exercises.map((ex,i)=>`<div class="grammar-card"><div class="kana">${ex.type}</div><div class="jp">${ex.question}</div>${ex.choices ? `<div class="zh">${ex.choices.map(c => `・${c}`).join('<br>')}</div>` : ''}<details class="zh"><summary>Show answer</summary><strong>${ex.answer}</strong></details></div>`).join('')}</div>`;
}
function renderLessonView(){
  const lesson = state.lessons.find(l => l.id === state.currentLessonId);
  const q = $('searchInput').value.trim();
  if(!lesson) return;
  const sentences = lesson.sentences.filter(x => matchSearch(x,q));
  const words = lesson.words.filter(x => matchSearch(x,q));
  const grammar = lesson.grammar.filter(x => matchSearch(x,q));
  $('lessonView').innerHTML = `<div class="lesson-title"><div><h2>Lesson ${lesson.id}: ${lesson.title}</h2><p>${lesson.description || ''}</p></div><button onclick='speak(${JSON.stringify(lesson.title)},0.75)'>Play title</button></div>
    <h3 class="section-title">Sentences</h3><div class="card-grid">${sentences.length ? sentences.map((s,i)=>card({lessonId:lesson.id,key:`sentence-${i}`,type:'sentence',jp:s.jp,kana:s.kana,zh:s.zh,note:s.note})).join('') : '<p>No matching sentences.</p>'}</div>
    <h3 class="section-title">Conversation</h3>${renderConversation(lesson,q)}
    <h3 class="section-title">Exercises</h3>${renderExercises(lesson,q)}
    <h3 class="section-title">Words</h3><div class="card-grid">${words.length ? words.map((w,i)=>card({lessonId:lesson.id,key:`word-${i}`,type:'word',jp:w.jp,kana:w.kana,zh:w.zh,note:w.note})).join('') : '<p>No matching words.</p>'}</div>
    <h3 class="section-title">Grammar</h3><div class="card-grid">${grammar.length ? grammar.map((g,i)=>`<div class="grammar-card"><div class="jp">${g.pattern}</div><div class="zh">${g.explain}</div><div class="actions"><button onclick='speak(${JSON.stringify(g.example)},0.65)'>Play example</button><span>${g.example}</span></div></div>`).join('') : '<p>No matching grammar.</p>'}</div>`;
}
function render(){ renderLessonList(); renderLessonView(); }
async function init(){
  const [lessonRes, lessonRes2, addonRes] = await Promise.all([fetch(DATA_URL), fetch(DATA_URL_26_50), fetch(ADDON_URL)]);
  const lessons1 = await lessonRes.json();
  const lessons2 = await lessonRes2.json();
  state.lessons = [...lessons1, ...lessons2].sort((a,b) => a.id - b.id);
  state.addons = await addonRes.json();
  $('rate').addEventListener('input', e => $('rateText').textContent = `${e.target.value}x`);
  $('stopBtn').addEventListener('click', () => window.speechSynthesis?.cancel());
  $('searchInput').addEventListener('input', renderLessonView);
  $('resetBtn').addEventListener('click', () => { $('searchInput').value = ''; renderLessonView(); });
  $('lessonSelect').addEventListener('change', e => {
    state.currentLessonId = Number(e.target.value);
    renderLessonView();
    renderLessonList();
  });
  if('speechSynthesis' in window){ loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(console.warn); }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.deferredPrompt = e; $('installBtn').classList.remove('hidden'); });
  $('installBtn').addEventListener('click', async () => { if(!state.deferredPrompt) return; state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice; state.deferredPrompt = null; $('installBtn').classList.add('hidden'); });
  render();
}
init().catch(err => { console.error(err); $('lessonView').innerHTML = `<p>Load failed: ${err.message}</p>`; });
