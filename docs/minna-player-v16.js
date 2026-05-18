// Minna Player v16.1
// Structured lesson player. No iframe translation. No DOM scanning. Randomized quiz options.
(function(){
  const $=id=>document.getElementById(id);
  const I=()=>window.MinnaI18n;
  const pick=v=>I().pick(v);
  const t=(zh,en)=>I().lang()==='en'?en:zh;
  let lesson=null, score=0, answered={};
  function shuffle(arr){return arr.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1])}
  function getNo(){
    const body=document.body; if(body&&body.dataset.lessonNo)return Number(body.dataset.lessonNo)||1;
    const m=location.pathname.match(/lesson-(\d+)/); return m?Number(m[1]):1;
  }
  function render(){
    if(!window.MinnaLessonDataV16||!I())return;
    lesson=MinnaLessonDataV16.get(getNo());
    document.title=`${pick(lesson.title)} | Minna v16`;
    $('app').innerHTML=`
      <header class="hero"><div class="wrap topbar"><div><span class="badge">Minna Lesson Player v16.1</span><h1>${pick(lesson.title)}｜${pick(lesson.subtitle)}</h1><p>${pick(lesson.focus)}</p></div><div id="langSlot"></div></div><div class="wrap quicklinks"><a href="./minna-index.html?v=16.0">${t('课程首页','Home')}</a><a href="#vocab">${t('核心词汇','Vocabulary')}</a><a href="#grammar">${t('核心语法','Grammar')}</a><a href="#examples">${t('核心例句','Examples')}</a><a href="#quiz">${t('综合测试','Final Test')}</a></div></header>
      <main class="wrap">
        ${summary()}
        ${vocab()}
        ${grammar()}
        ${examples()}
        ${quiz()}
      </main>
      <footer class="wrap footer">docs/minna-player-v16.js · ${lesson.id}</footer>`;
    I().installToggle($('langSlot'));
    bind();
  }
  function summary(){return `<section class="panel"><h2>${t('本课重点','Lesson Focus')}</h2><p>${pick(lesson.focus)}</p><div class="cards4"><div><b>${t('词汇','Vocabulary')}</b><span>${lesson.vocab.length}</span></div><div><b>${t('语法','Grammar')}</b><span>${lesson.grammar.length}</span></div><div><b>${t('例句','Examples')}</b><span>${lesson.examples.length}</span></div><div><b>${t('测试','Quiz')}</b><span>${lesson.quiz.length}</span></div></div></section>`}
  function vocab(){return `<section class="panel" id="vocab"><h2>${t('核心词汇','Core Vocabulary')}</h2><div class="vocabGrid">${lesson.vocab.map(v=>`<div class="vcard"><b>${v.jp}</b><small>${v.kana||''}</small><span>${I().lang()==='en'?v.en:v.zh}</span></div>`).join('')}</div></section>`}
  function grammar(){return `<section class="panel" id="grammar"><h2>${t('核心语法','Core Grammar')}</h2>${lesson.grammar.map(g=>`<article class="gcard"><h3>${pick(g.title)}</h3><p>${pick(g.body)}</p><p class="jp">${g.jp}</p><p>${I().lang()==='en'?g.en:g.zh}</p></article>`).join('')}</section>`}
  function examples(){return `<section class="panel" id="examples"><h2>${t('核心例句','Core Examples')}</h2>${lesson.examples.map(e=>`<div class="example"><p class="jp">${e.jp}</p><p>${I().lang()==='en'?e.en:e.zh}</p></div>`).join('')}</section>`}
  function quiz(){return `<section class="panel" id="quiz"><h2>${t('综合测试','Final Test')}</h2><p class="small">${t('选项会随机排序，不能靠位置猜答案。','Options are randomized, so you cannot guess by position.')}</p><div id="quizBox">${lesson.quiz.map(qblock).join('')}</div><div class="scoreBox"><b>${t('得分','Score')}：</b><span id="scoreText">0/${lesson.quiz.length}</span></div></section>`}
  function qblock(q,idx){const opts=shuffle(q.options).map((o,i)=>`<button class="opt" data-q="${q.id}" data-ok="${o.ok?'1':'0'}">${String.fromCharCode(65+i)}. ${o.jp||pick(o)}</button>`).join('');return `<div class="qcard" id="${q.id}"><h3>${idx+1}. ${pick(q.q)}</h3><div class="opts">${opts}</div><p class="feedback small"></p></div>`}
  function bind(){
    document.querySelectorAll('.opt').forEach(btn=>btn.onclick=()=>answer(btn));
  }
  function answer(btn){
    const qid=btn.dataset.q, ok=btn.dataset.ok==='1';
    if(answered[qid])return;
    answered[qid]=ok;
    if(ok)score++;
    const card=document.getElementById(qid);
    card.querySelectorAll('.opt').forEach(b=>{b.disabled=true;if(b.dataset.ok==='1')b.classList.add('right');else if(b===btn)b.classList.add('wrong')});
    const q=lesson.quiz.find(x=>x.id===qid);
    card.querySelector('.feedback').textContent=(ok?t('答对了！','Correct!'):t('再看一次解释：','Review the explanation: '))+pick(q.explain);
    $('scoreText').textContent=`${score}/${lesson.quiz.length}`;
    saveLocal();
  }
  function saveLocal(){
    try{
      const key='minna_v16_'+lesson.id;
      localStorage.setItem(key,JSON.stringify({score,answered,updated_at:new Date().toISOString()}));
      const recent=JSON.parse(localStorage.getItem('minna_recent_lessons')||'[]').filter(x=>Number(x.n)!==lesson.no);
      recent.unshift({n:lesson.no,at:Date.now()});
      localStorage.setItem('minna_recent_lessons',JSON.stringify(recent.slice(0,5)));
    }catch(e){}
  }
  function start(){if(!window.MinnaI18n)return;I().onChange(()=>{score=0;answered={};render()});render()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
