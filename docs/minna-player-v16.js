// Minna Player v16.3
// Structured lesson player + MinnaAuth progress sync. No iframe, no DOM translation, randomized quiz options.
(function(){
  const $=id=>document.getElementById(id);
  const I=()=>window.MinnaI18n;
  const pick=v=>I().pick(v);
  const t=(zh,en)=>I().lang()==='en'?en:zh;
  let lesson=null, score=0, answered={}, cloud='init', user=null, saving=false;
  function shuffle(arr){return arr.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1])}
  function getNo(){const body=document.body;if(body&&body.dataset.lessonNo)return Number(body.dataset.lessonNo)||1;const m=location.pathname.match(/lesson-(\d+)/);return m?Number(m[1]):1}
  function progressPayload(){
    const answeredCount=Object.keys(answered).length;
    const rate=lesson.quiz.length?Math.round(score/lesson.quiz.length*100):0;
    return {
      v:16,
      lesson_no:lesson.no,
      score,
      completed_count:answeredCount,
      total_slides:lesson.quiz.length,
      wrong_count:Object.values(answered).filter(x=>!x).length,
      mastery_passed:answeredCount===lesson.quiz.length&&rate>=80,
      mastery:{vocab:100,grammar:rate,examples:100,final:rate},
      quiz_answered:answered,
      updated_client_at:new Date().toISOString()
    };
  }
  async function initAuth(){
    if(!window.MinnaAuth){cloud='local';return}
    try{
      await MinnaAuth.init({lessonId:lesson.id});
      user=MinnaAuth.getUser&&MinnaAuth.getUser();
      const row=await MinnaAuth.loadProgress(lesson.id);
      if(row&&row.progress){
        score=Number(row.progress.score)||0;
        answered=row.progress.quiz_answered||{};
      }
      cloud='ready';
    }catch(e){cloud='error:'+e.message}
  }
  function render(){
    if(!window.MinnaLessonDataV16||!I())return;
    lesson=MinnaLessonDataV16.get(getNo());
    document.title=`${pick(lesson.title)} | Minna v16`;
    $('app').innerHTML=`
      <header class="hero"><div class="wrap topbar"><div><span class="badge">Minna Lesson Player v16.3</span><h1>${pick(lesson.title)}｜${pick(lesson.subtitle)}</h1><p>${pick(lesson.focus)}</p><div class="authBar"><span id="cloudStatus">${cloudText()}</span><button id="loginBtn" class="light">${t('Google登录','Google Login')}</button><button id="logoutBtn" class="light">${t('退出','Log out')}</button><button id="saveBtn" class="ghost">${t('保存进度','Save Progress')}</button></div></div><div id="langSlot"></div></div><div class="wrap quicklinks"><a href="./minna-index.html?v=16.0">${t('课程首页','Home')}</a><a href="#vocab">${t('核心词汇','Vocabulary')}</a><a href="#grammar">${t('核心语法','Grammar')}</a><a href="#examples">${t('核心例句','Examples')}</a><a href="#quiz">${t('综合测试','Final Test')}</a></div></header>
      <main class="wrap">${summary()}${vocab()}${grammar()}${examples()}${quiz()}</main>
      <footer class="wrap footer">docs/minna-player-v16.js · ${lesson.id}</footer>`;
    I().installToggle($('langSlot'));
    bind();
    restoreAnsweredView();
  }
  function cloudText(){
    if(cloud==='ready')return `<span class="cloudOk">${t('云端已连接','Cloud connected')}${user&&user.email?' · '+user.email:''}</span>`;
    if(cloud==='local')return `<span class="cloudBad">${t('本地模式：未加载登录系统','Local mode: auth not loaded')}</span>`;
    if(cloud.startsWith('error:'))return `<span class="cloudBad">${t('云端异常','Cloud issue')}：${cloud.slice(6)}</span>`;
    if(saving)return `<span>${t('保存中…','Saving…')}</span>`;
    return `<span>${t('初始化中…','Initializing…')}</span>`;
  }
  function summary(){const p=progressPayload();return `<section class="panel"><h2>${t('本课重点','Lesson Focus')}</h2><p>${pick(lesson.focus)}</p><div class="cards4"><div><b>${t('词汇','Vocabulary')}</b><span>${lesson.vocab.length}</span></div><div><b>${t('语法','Grammar')}</b><span>${lesson.grammar.length}</span></div><div><b>${t('例句','Examples')}</b><span>${lesson.examples.length}</span></div><div><b>${t('进度','Progress')}</b><span>${p.completed_count}/${lesson.quiz.length}</span></div></div></section>`}
  function vocab(){return `<section class="panel" id="vocab"><h2>${t('核心词汇','Core Vocabulary')}</h2><div class="vocabGrid">${lesson.vocab.map(v=>`<div class="vcard"><b>${v.jp}</b><small>${v.kana||''}</small><span>${I().lang()==='en'?v.en:v.zh}</span></div>`).join('')}</div></section>`}
  function grammar(){return `<section class="panel" id="grammar"><h2>${t('核心语法','Core Grammar')}</h2>${lesson.grammar.map(g=>`<article class="gcard"><h3>${pick(g.title)}</h3><p>${pick(g.body)}</p><p class="jp">${g.jp}</p><p>${I().lang()==='en'?g.en:g.zh}</p></article>`).join('')}</section>`}
  function examples(){return `<section class="panel" id="examples"><h2>${t('核心例句','Core Examples')}</h2>${lesson.examples.map(e=>`<div class="example"><p class="jp">${e.jp}</p><p>${I().lang()==='en'?e.en:e.zh}</p></div>`).join('')}</section>`}
  function quiz(){return `<section class="panel" id="quiz"><h2>${t('综合测试','Final Test')}</h2><p class="small">${t('选项会随机排序，不能靠位置猜答案。','Options are randomized, so you cannot guess by position.')}</p><div id="quizBox">${lesson.quiz.map(qblock).join('')}</div><div class="scoreBox"><b>${t('得分','Score')}：</b><span id="scoreText">${score}/${lesson.quiz.length}</span></div></section>`}
  function qblock(q,idx){const opts=shuffle(q.options).map((o,i)=>`<button class="opt" data-q="${q.id}" data-ok="${o.ok?'1':'0'}">${String.fromCharCode(65+i)}. ${o.jp||pick(o)}</button>`).join('');return `<div class="qcard" id="${q.id}"><h3>${idx+1}. ${pick(q.q)}</h3><div class="opts">${opts}</div><p class="feedback small"></p></div>`}
  function bind(){
    document.querySelectorAll('.opt').forEach(btn=>btn.onclick=()=>answer(btn));
    $('saveBtn')&&($('saveBtn').onclick=saveAll);
    $('loginBtn')&&($('loginBtn').onclick=()=>window.MinnaAuth&&MinnaAuth.loginWithGoogle());
    $('logoutBtn')&&($('logoutBtn').onclick=async()=>{if(window.MinnaAuth){await MinnaAuth.logout();user=null;cloud='ready';render()}});
  }
  function answer(btn){
    const qid=btn.dataset.q, ok=btn.dataset.ok==='1';
    if(answered[qid]!==undefined)return;
    answered[qid]=ok;if(ok)score++;
    markQuestion(btn,qid,ok);
    saveAll();
  }
  function markQuestion(btn,qid,ok){
    const card=document.getElementById(qid);if(!card)return;
    card.querySelectorAll('.opt').forEach(b=>{b.disabled=true;if(b.dataset.ok==='1')b.classList.add('right');else if(b===btn)b.classList.add('wrong')});
    const q=lesson.quiz.find(x=>x.id===qid);
    card.querySelector('.feedback').textContent=(ok?t('答对了！','Correct!'):t('再看一次解释：','Review the explanation: '))+pick(q.explain);
    const st=$('scoreText');if(st)st.textContent=`${score}/${lesson.quiz.length}`;
  }
  function restoreAnsweredView(){
    Object.keys(answered).forEach(qid=>{
      const card=document.getElementById(qid);if(!card)return;
      const ok=answered[qid];
      const btn=[...card.querySelectorAll('.opt')].find(b=>b.dataset.ok==='1')||card.querySelector('.opt');
      markQuestion(btn,qid,ok);
    });
  }
  async function saveAll(){
    saveLocal();
    if(!window.MinnaAuth){cloud='local';updateCloud();return}
    saving=true;updateCloud();
    try{await MinnaAuth.saveProgress(progressPayload(),lesson.id);cloud='ready'}catch(e){cloud='error:'+e.message}
    saving=false;updateCloud();
  }
  function updateCloud(){const el=$('cloudStatus');if(el)el.innerHTML=cloudText()}
  function saveLocal(){
    try{
      localStorage.setItem('minna_v16_'+lesson.id,JSON.stringify(progressPayload()));
      const recent=JSON.parse(localStorage.getItem('minna_recent_lessons')||'[]').filter(x=>Number(x.n)!==lesson.no);
      recent.unshift({n:lesson.no,at:Date.now()});
      localStorage.setItem('minna_recent_lessons',JSON.stringify(recent.slice(0,5)));
      const days=JSON.parse(localStorage.getItem('minna_study_days')||'{}');days[new Date().toISOString().slice(0,10)]=true;localStorage.setItem('minna_study_days',JSON.stringify(days));
    }catch(e){}
  }
  async function start(){
    if(!window.MinnaI18n)return;
    lesson=MinnaLessonDataV16.get(getNo());
    I().onChange(()=>render());
    await initAuth();
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
