// Minna home renderer v15.0
(function(){
  const $=id=>document.getElementById(id);
  const I=()=>window.MinnaI18n;
  const t=(k,v)=>I().t(k,v);
  const pad=n=>String(n).padStart(2,'0');
  const urlForLesson=n=>`./minna-no-nihongo-lesson-${pad(n)}.html?v=15.0`;
  const lessons=Array.from({length:50},(_,i)=>({n:i+1,title:{zh:`第${i+1}课`,en:`Lesson ${i+1}`}}));
  let progressRows=[];
  let user=null;
  function progressFor(n){return progressRows.find(r=>r.lesson_id===`minna_lesson_${pad(n)}`)?.progress||null}
  function doneCount(p){if(!p)return 0;if(Number.isFinite(Number(p.completed_count)))return Number(p.completed_count);return Object.keys(p.done||{}).length}
  function totalSlides(p){return Math.max(1,Number(p&&p.total_slides)||12)}
  function mastered(p){return !!(p&&p.mastery_passed)||doneCount(p)>=totalSlides(p)}
  function currentLesson(){for(let n=1;n<=50;n++){if(!mastered(progressFor(n)))return n}return 50}
  function unlocked(n){return n===1||mastered(progressFor(n-1))}
  function totalScore(){return progressRows.reduce((s,r)=>s+(Number(r.progress&&r.progress.score)||0),0)}
  function completedLessons(){return lessons.filter(l=>mastered(progressFor(l.n))).length}
  function render(){
    if(!I())return;
    document.title=I().lang()==='en'?'Minna no Nihongo Beginner AI Learning System':'《みんなの日本語 初級》AI学习系统';
    $('app').innerHTML=`
      <header class="hero">
        <div class="wrap topbar">
          <div>
            <span class="badge">${t('home.badge')}</span>
            <h1>${t('home.title')}</h1>
            <p>${t('home.subtitle')}</p>
          </div>
          <div class="actions" id="langSlot"></div>
        </div>
        <div class="wrap quicklinks">
          <a href="./minna-system-design.html">${t('home.design')}</a>
          <a href="./minna-user-manual.html">${t('home.manual')}</a>
          <a href="./minna-review-01-25.html">${t('home.review')}</a>
          <a class="primary" href="${urlForLesson(currentLesson())}">${t('home.start')}</a>
        </div>
      </header>
      <main class="wrap">
        ${renderAccount()}
        ${renderDashboard()}
        ${renderOverview()}
        ${renderPath()}
        ${renderLeaderboardBox()}
        ${renderStatus()}
      </main>
      <footer class="wrap footer">${t('home.footer')}</footer>
    `;
    I().installToggle($('langSlot'));
    bindEvents();
  }
  function renderAccount(){
    const email=user&&user.email?user.email:'';
    return `<section class="panel account">
      <h2>${t('home.account')}</h2>
      <p class="small">${t('home.accountNote')}</p>
      <div class="row"><b>${t('home.loginStatus')}</b><span id="authText">${email?email:t('home.checking')}</span></div>
      <div class="row"><b>${t('home.cloud')}</b><span id="cloudText">${t('home.init')}</span></div>
      <p class="buttons">
        <button id="loginBtn">${t('home.google')}</button>
        <button id="logoutBtn" class="light">${t('home.logout')}</button>
        <button id="refreshBtn" class="ghost">${t('home.refreshProgress')}</button>
        <a class="primary" href="${urlForLesson(currentLesson())}">${t('home.continue')}</a>
      </p>
    </section>`;
  }
  function renderDashboard(){
    const cur=currentLesson();
    const done=completedLessons();
    const goal=Number(localStorage.getItem('minna_week_goal')||5);
    const days=Object.keys(JSON.parse(localStorage.getItem('minna_study_days')||'{}')).length;
    return `<section class="panel dashboard">
      <h2>${t('home.dashboard')}</h2>
      <div class="cards4">
        <div><b>${t('home.todaySuggest')}</b><span>${t('lessons.lesson',{n:cur})}</span></div>
        <div><b>${t('home.mastered')}</b><span>${done}/50</span></div>
        <div><b>${t('home.streak')}</b><span>${days}</span></div>
        <div><b>${t('home.firstHalf')}</b><span>${done>=25?t('home.completed'):t('home.notDone')}</span></div>
      </div>
      <p class="small">${t('home.currentFirst')}</p>
      <p class="buttons"><a class="primary" href="${urlForLesson(cur)}">${t('home.currentLesson')}：${t('lessons.lesson',{n:cur})}</a><a class="ghost" href="${urlForLesson(cur)}#wrong">${t('home.reviewMistakes')}</a></p>
    </section>`;
  }
  function renderOverview(){
    return `<section class="panel overview">
      <h2>${t('home.overview')}</h2>
      <div class="cards4">
        <div><b>50</b><span>${t('home.online')}</span></div>
        <div><b>${progressRows.length}</b><span>${t('home.recordLessons')}</span></div>
        <div><b>${totalScore()}</b><span>${t('home.totalScore')}</span></div>
        <div><b>${completedLessons()}</b><span>${t('home.doneLevels')}</span></div>
      </div>
    </section>`;
  }
  function renderPath(){
    return `<section class="panel path">
      <h2>${t('home.path')}</h2>
      <p class="small">${t('home.pathDesc')}</p>
      <div class="filters">
        <input id="searchBox" placeholder="${t('home.searchPlaceholder')}">
        <select id="filterBox"><option value="all">${t('home.all')}</option><option value="unlocked">${t('home.unlockedOnly')}</option><option value="progress">${t('home.progressOnly')}</option></select>
      </div>
      <div id="lessonGrid" class="lessonGrid"></div>
    </section>`;
  }
  function renderLessonGrid(){
    const grid=$('lessonGrid'); if(!grid)return;
    const q=($('searchBox')?.value||'').toLowerCase();
    const f=$('filterBox')?.value||'all';
    const cur=currentLesson();
    let list=lessons.filter(l=>{
      const p=progressFor(l.n);
      if(f==='unlocked'&&!unlocked(l.n))return false;
      if(f==='progress'&&!p)return false;
      const label=`第${l.n}课 lesson ${l.n}`.toLowerCase();
      return !q||label.includes(q);
    });
    grid.innerHTML=list.map(l=>{
      const p=progressFor(l.n), m=mastered(p), u=unlocked(l.n);
      const cls=m?'mastered':(l.n===cur?'current':(u?'unlocked':'locked'));
      return `<a class="lesson ${cls}" href="${u?urlForLesson(l.n):'#'}">
        <b>${t('lessons.lesson',{n:l.n})}</b>
        <span>${m?t('lessons.master'):(u?t('lessons.unlocked'):t('lessons.locked'))}</span>
        <small>${t('lessons.pages',{done:doneCount(p),total:totalSlides(p)})}</small>
        <small>${t('lessons.score',{score:Number(p&&p.score)||0})}</small>
      </a>`;
    }).join('')||`<p class="small">${t('home.waitingProgress')}</p>`;
  }
  function renderLeaderboardBox(){return `<section class="panel leaderboard"><h2>${t('home.leaderboard')}</h2><p class="small">${t('home.leaderboardDesc')}</p><p><button id="leaderBtn">${t('home.refreshLeaderboard')}</button></p><div id="leaderBox" class="small">${t('home.checking')}</div></section>`}
  function renderStatus(){return `<section class="panel status"><h2>${t('home.courseStatus')}</h2><p>${t('home.statusText')}</p></section>`}
  function bindEvents(){
    $('searchBox')&&($('searchBox').oninput=renderLessonGrid);
    $('filterBox')&&($('filterBox').onchange=renderLessonGrid);
    $('refreshBtn')&&($('refreshBtn').onclick=loadProgress);
    $('loginBtn')&&($('loginBtn').onclick=()=>window.MinnaAuth&&MinnaAuth.loginWithGoogle());
    $('logoutBtn')&&($('logoutBtn').onclick=async()=>{if(window.MinnaAuth)await MinnaAuth.logout();user=null;render()});
    $('leaderBtn')&&($('leaderBtn').onclick=loadLeaderboard);
    renderLessonGrid();
  }
  async function initAuth(){
    if(!window.MinnaAuth)return;
    try{await MinnaAuth.init({lessonId:'minna_index'});user=MinnaAuth.getUser&&MinnaAuth.getUser();}
    catch(e){console.warn(e)}
  }
  async function loadProgress(){
    const cloud=$('cloudText'); if(cloud)cloud.textContent=t('home.checking');
    try{
      if(window.MinnaAuth&&MinnaAuth.listProgress){progressRows=await MinnaAuth.listProgress();}
      if(cloud)cloud.textContent=`${progressRows.length} ${t('home.recordLessons')}`;
    }catch(e){if(cloud)cloud.textContent=e.message}
    render();
  }
  async function loadLeaderboard(){
    const box=$('leaderBox'); if(!box)return; box.textContent=t('home.checking');
    try{
      const supa=window.MinnaAuth&&MinnaAuth.client&&MinnaAuth.client();
      if(!supa){box.textContent='Supabase not ready';return;}
      const {data,error}=await supa.from('minna_public_leaderboard').select('*').limit(10);
      if(error)throw error;
      box.innerHTML=(data||[]).map((r,i)=>`<div class="rank"><b>#${i+1}</b> ${r.display_name||'User'} · ${t('home.doneLevels')}: ${r.completed_lessons||0} · ${t('home.totalScore')}: ${r.total_score||0}</div>`).join('')||'No data';
    }catch(e){box.textContent=e.message}
  }
  async function start(){
    if(!window.MinnaI18n)return;
    I().onChange(()=>render());
    await initAuth();
    render();
    await loadProgress();
    loadLeaderboard();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
