// Minna home renderer v15.1
// Structured home renderer with widgets: checklist, recent, insights, timer, quick jump, admin/visitor links.
(function(){
  const $=id=>document.getElementById(id);
  const I=()=>window.MinnaI18n;
  const t=(k,v)=>I().t(k,v);
  const pick=v=>I().pick(v);
  const pad=n=>String(n).padStart(2,'0');
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const urlForLesson=n=>`./minna-no-nihongo-lesson-${pad(n)}.html?v=15.0`;
  const lessons=Array.from({length:50},(_,i)=>({n:i+1,title:{zh:`第${i+1}课`,en:`Lesson ${i+1}`}}));
  let progressRows=[];
  let user=null;
  let timerTick=null;
  const copy={
    quickJump:{zh:'🚀 快速跳课',en:'🚀 Quick Lesson Jump'},
    quickJumpDesc:{zh:'查某一课时可直接跳转；正常学习建议按路径闯关。',en:'Jump directly when needed. For regular study, follow the path.'},
    prev:{zh:'上一课',en:'Previous'}, next:{zh:'下一课',en:'Next'}, go:{zh:'跳转',en:'Go'},
    timerReady:{zh:'准备好就开始。',en:'Start when ready.'}, timerRunning:{zh:'专注中，不要切走。',en:'Stay focused. Do not switch tasks.'}, timerDone:{zh:'完成！休息一下或再来一轮。',en:'Done! Take a break or start another round.'},
    start:{zh:'开始',en:'Start'}, pause:{zh:'暂停',en:'Pause'}, reset:{zh:'重置',en:'Reset'},
    checklistDesc:{zh:'每天自动重置。先完成小目标，再继续加量。',en:'Resets automatically every day. Finish small goals before adding more.'},
    resetToday:{zh:'重置今天',en:'Reset Today'}, done:{zh:'完成',en:'Done'},
    task1:{zh:'开始学习 10 分钟',en:'Study for 10 minutes'}, task1Tip:{zh:'打开当前课，完成一点点就算赢。',en:'Open the current lesson. A small step counts as a win.'},
    task2:{zh:'复习当前课错题',en:'Review current lesson mistakes'}, task2Tip:{zh:'先清错题，再推进新内容。',en:'Clear mistakes before moving forward.'},
    task3:{zh:'朗读例句 5 句',en:'Read 5 example sentences aloud'}, task3Tip:{zh:'不用追求完美，重点是开口。',en:'No need to be perfect. The goal is to speak.'},
    task4:{zh:'完成 1 次 Mastery 小测试',en:'Complete one Mastery mini test'}, task4Tip:{zh:'用小测试确认今天真的掌握了。',en:'Use a mini test to confirm today’s mastery.'},
    doIt:{zh:'去完成 →',en:'Do it →'},
    recentDesc:{zh:'自动记录本机最近打开过的课程，方便下次继续。',en:'Locally records recently opened lessons so you can continue next time.'},
    clearRecords:{zh:'清空记录',en:'Clear Records'}, noRecent:{zh:'还没有最近学习记录。打开任意课程后这里会出现。',en:'No recent records yet. Open any lesson and it will appear here.'},
    nextStep:{zh:'下一步建议',en:'Next Step'}, localRecords:{zh:'本机记录',en:'Local Records'}, mistakeCount:{zh:'错题',en:'Mistakes'}, checklistRate:{zh:'今日清单',en:"Today's Checklist"},
    visitor:{zh:'👀 访客统计',en:'👀 Visitor Tracking'}, admin:{zh:'🔐 管理员后台',en:'🔐 Admin Console'},
    insightClean:{zh:'建议先清错题，再继续推进新课。',en:'Clear mistakes first, then continue to the next lesson.'},
    insightContinue:{zh:'建议继续当前课，保持每天一点点。',en:'Continue the current lesson and keep a small daily habit.'},
    insightReview:{zh:'已完成不少内容，可以做一次 Mastery 小测试。',en:'You have completed enough progress. Try one Mastery mini test.'}
  };
  function c(k){return pick(copy[k])}
  function progressFor(n){return progressRows.find(r=>r.lesson_id===`minna_lesson_${pad(n)}`)?.progress||null}
  function doneCount(p){if(!p)return 0;if(Number.isFinite(Number(p.completed_count)))return Number(p.completed_count);return Object.keys(p.done||{}).length}
  function totalSlides(p){return Math.max(1,Number(p&&p.total_slides)||12)}
  function wrongCount(p){if(!p)return 0;if(Number.isFinite(Number(p.wrong_count)))return Number(p.wrong_count);return Object.keys(p.wrong||{}).length}
  function mastered(p){return !!(p&&p.mastery_passed)||doneCount(p)>=totalSlides(p)}
  function currentLesson(){for(let n=1;n<=50;n++){if(!mastered(progressFor(n)))return n}return 50}
  function unlocked(n){return n===1||mastered(progressFor(n-1))}
  function totalScore(){return progressRows.reduce((s,r)=>s+(Number(r.progress&&r.progress.score)||0),0)}
  function completedLessons(){return lessons.filter(l=>mastered(progressFor(l.n))).length}
  function allWrong(){return lessons.reduce((s,l)=>s+wrongCount(progressFor(l.n)),0)}
  function dailyState(){const key='minna_daily_checklist_'+todayKey();return JSON.parse(localStorage.getItem(key)||'{}')}
  function saveDaily(o){localStorage.setItem('minna_daily_checklist_'+todayKey(),JSON.stringify(o))}
  function recent(){return JSON.parse(localStorage.getItem('minna_recent_lessons')||'[]').slice(0,5)}
  function timerState(){return {target:Number(localStorage.getItem('minna_timer_target')||600),elapsed:Number(localStorage.getItem('minna_timer_elapsed')||0),started:Number(localStorage.getItem('minna_timer_started')||0)}}
  function saveTimer(s){localStorage.setItem('minna_timer_target',s.target);localStorage.setItem('minna_timer_elapsed',s.elapsed);localStorage.setItem('minna_timer_started',s.started)}
  function currentElapsed(){const s=timerState();return s.started?Math.min(s.target,s.elapsed+Math.floor((Date.now()-s.started)/1000)):s.elapsed}
  function render(){
    if(!I())return;
    if(timerTick){clearInterval(timerTick);timerTick=null}
    document.title=I().lang()==='en'?'Minna no Nihongo Beginner AI Learning System':'《みんなの日本語 初級》AI学习系统';
    $('app').innerHTML=`
      <header class="hero"><div class="wrap topbar"><div><span class="badge">${t('home.badge')}</span><h1>${t('home.title')}</h1><p>${t('home.subtitle')}</p></div><div class="actions" id="langSlot"></div></div>
        <div class="wrap quicklinks"><a href="./minna-system-design.html">${t('home.design')}</a><a href="./minna-user-manual.html">${t('home.manual')}</a><a href="./minna-review-01-25.html">${t('home.review')}</a><a href="./minna-admin.html">${c('admin')}</a><a class="primary" href="${urlForLesson(currentLesson())}">${t('home.start')}</a></div></header>
      <main class="wrap">${renderAccount()}${renderDashboard()}${renderWidgets()}${renderOverview()}${renderPath()}${renderLeaderboardBox()}${renderStatus()}</main><footer class="wrap footer">${t('home.footer')}</footer>`;
    I().installToggle($('langSlot'));
    bindEvents();
    updateTimerView();
  }
  function renderAccount(){const email=user&&user.email?user.email:'';return `<section class="panel account"><h2>${t('home.account')}</h2><p class="small">${t('home.accountNote')}</p><div class="row"><b>${t('home.loginStatus')}</b><span id="authText">${email?email:t('home.checking')}</span></div><div class="row"><b>${t('home.cloud')}</b><span id="cloudText">${t('home.init')}</span></div><p class="buttons"><button id="loginBtn">${t('home.google')}</button><button id="logoutBtn" class="light">${t('home.logout')}</button><button id="refreshBtn" class="ghost">${t('home.refreshProgress')}</button><a class="primary" href="${urlForLesson(currentLesson())}">${t('home.continue')}</a><a class="light" href="./minna-admin.html">${c('admin')}</a></p></section>`}
  function renderDashboard(){const cur=currentLesson(),done=completedLessons(),days=Object.keys(JSON.parse(localStorage.getItem('minna_study_days')||'{}')).length;return `<section class="panel dashboard"><h2>${t('home.dashboard')}</h2><div class="cards4"><div><b>${t('home.todaySuggest')}</b><span>${t('lessons.lesson',{n:cur})}</span></div><div><b>${t('home.mastered')}</b><span>${done}/50</span></div><div><b>${t('home.streak')}</b><span>${days}</span></div><div><b>${c('mistakeCount')}</b><span>${allWrong()}</span></div></div><p class="small">${t('home.currentFirst')}</p><p class="buttons"><a class="primary" href="${urlForLesson(cur)}">${t('home.currentLesson')}：${t('lessons.lesson',{n:cur})}</a><a class="ghost" href="${urlForLesson(cur)}#wrong">${t('home.reviewMistakes')}</a></p></section>`}
  function renderWidgets(){return `<section class="widgetGrid">${renderChecklist()}${renderTimer()}${renderQuickJump()}${renderRecent()}${renderInsights()}<div class="panel"><h2>${c('visitor')}</h2><p class="small">${I().lang()==='en'?'Visitor logging stays enabled through the shared auth/progress system.':'访客记录后续会整合回 v15 管理后台。'}</p><p class="buttons"><a class="ghost" href="./minna-admin.html">${c('admin')}</a></p></div></section>`}
  function renderChecklist(){const st=dailyState();const tasks=[['t1',c('task1'),c('task1Tip'),urlForLesson(currentLesson())],['t2',c('task2'),c('task2Tip'),urlForLesson(currentLesson())+'#wrong'],['t3',c('task3'),c('task3Tip'),urlForLesson(currentLesson())],['t4',c('task4'),c('task4Tip'),urlForLesson(currentLesson())]];const done=tasks.filter(x=>st[x[0]]).length;return `<div class="panel"><h2>${t('home.checklist')}</h2><p class="small">${c('checklistDesc')}</p><p><b>${done}/${tasks.length} ${c('done')}</b></p>${tasks.map(x=>`<label class="task"><input type="checkbox" data-task="${x[0]}" ${st[x[0]]?'checked':''}> <span><b>${x[1]}</b><small>${x[2]}</small></span><a href="${x[3]}">${c('doIt')}</a></label>`).join('')}<p><button id="resetChecklist" class="light">${c('resetToday')}</button></p></div>`}
  function renderTimer(){const s=timerState(),e=currentElapsed(),left=Math.max(0,s.target-e),pct=Math.round(e/s.target*100),min=String(Math.floor(left/60)).padStart(2,'0'),sec=String(left%60).padStart(2,'0');const msg=e>=s.target?c('timerDone'):(s.started?c('timerRunning'):c('timerReady'));return `<div class="panel"><h2>${t('home.timer')}</h2><div class="timerTime" id="timerTime">${min}:${sec}</div><div class="bar"><span id="timerBar" style="width:${pct}%"></span></div><p class="small" id="timerMsg">${msg}</p><p class="buttons"><button id="timer10">10</button><button id="timer15">15</button><button id="timer25">25</button><button id="timerStart" class="primary">${c('start')}</button><button id="timerPause" class="light">${c('pause')}</button><button id="timerReset" class="ghost">${c('reset')}</button></p></div>`}
  function renderQuickJump(){const cur=currentLesson();return `<div class="panel"><h2>${c('quickJump')}</h2><p class="small">${c('quickJumpDesc')}</p><div class="filters"><select id="jumpSelect">${lessons.map(l=>`<option value="${l.n}" ${l.n===cur?'selected':''}>${t('lessons.lesson',{n:l.n})}</option>`).join('')}</select><button id="jumpGo" class="primary">${c('go')}</button></div><p class="buttons"><a class="light" href="${urlForLesson(Math.max(1,cur-1))}">${c('prev')}</a><a class="ghost" href="${urlForLesson(cur)}">${t('home.currentLesson')}</a><a class="light" href="${urlForLesson(Math.min(50,cur+1))}">${c('next')}</a></p></div>`}
  function renderRecent(){const r=recent();return `<div class="panel"><h2>${t('home.recent')}</h2><p class="small">${c('recentDesc')}</p>${r.length?r.map(x=>`<a class="recentItem" href="${urlForLesson(x.n)}"><b>${t('lessons.lesson',{n:x.n})}</b><small>${new Date(x.at).toLocaleString()}</small></a>`).join(''):`<p class="small">${c('noRecent')}</p>`}<p><button id="clearRecent" class="light">${c('clearRecords')}</button></p></div>`}
  function renderInsights(){const st=dailyState(),done=['t1','t2','t3','t4'].filter(k=>st[k]).length,w=allWrong();const tip=w>0?c('insightClean'):(done>=2?c('insightReview'):c('insightContinue'));return `<div class="panel"><h2>${t('home.insights')}</h2><p><b>${c('nextStep')}：</b>${tip}</p><div class="cards4 miniCards"><div><b>${c('checklistRate')}</b><span>${done}/4</span></div><div><b>${c('mistakeCount')}</b><span>${w}</span></div><div><b>${c('localRecords')}</b><span>${recent().length}</span></div><div><b>${t('home.mastered')}</b><span>${completedLessons()}</span></div></div></div>`}
  function renderOverview(){return `<section class="panel overview"><h2>${t('home.overview')}</h2><div class="cards4"><div><b>50</b><span>${t('home.online')}</span></div><div><b>${progressRows.length}</b><span>${t('home.recordLessons')}</span></div><div><b>${totalScore()}</b><span>${t('home.totalScore')}</span></div><div><b>${completedLessons()}</b><span>${t('home.doneLevels')}</span></div></div></section>`}
  function renderPath(){return `<section class="panel path"><h2>${t('home.path')}</h2><p class="small">${t('home.pathDesc')}</p><div class="filters"><input id="searchBox" placeholder="${t('home.searchPlaceholder')}"><select id="filterBox"><option value="all">${t('home.all')}</option><option value="unlocked">${t('home.unlockedOnly')}</option><option value="progress">${t('home.progressOnly')}</option></select></div><div id="lessonGrid" class="lessonGrid"></div></section>`}
  function renderLessonGrid(){const grid=$('lessonGrid'); if(!grid)return;const q=($('searchBox')?.value||'').toLowerCase();const f=$('filterBox')?.value||'all';const cur=currentLesson();let list=lessons.filter(l=>{const p=progressFor(l.n);if(f==='unlocked'&&!unlocked(l.n))return false;if(f==='progress'&&!p)return false;const label=`第${l.n}课 lesson ${l.n}`.toLowerCase();return !q||label.includes(q)});grid.innerHTML=list.map(l=>{const p=progressFor(l.n),m=mastered(p),u=unlocked(l.n),cls=m?'mastered':(l.n===cur?'current':(u?'unlocked':'locked'));return `<a class="lesson ${cls}" href="${u?urlForLesson(l.n):'#'}"><b>${t('lessons.lesson',{n:l.n})}</b><span>${m?t('lessons.master'):(u?t('lessons.unlocked'):t('lessons.locked'))}</span><small>${t('lessons.pages',{done:doneCount(p),total:totalSlides(p)})}</small><small>${t('lessons.score',{score:Number(p&&p.score)||0})}</small></a>`}).join('')||`<p class="small">${t('home.waitingProgress')}</p>`}
  function renderLeaderboardBox(){return `<section class="panel leaderboard"><h2>${t('home.leaderboard')}</h2><p class="small">${t('home.leaderboardDesc')}</p><p><button id="leaderBtn">${t('home.refreshLeaderboard')}</button></p><div id="leaderBox" class="small">${t('home.checking')}</div></section>`}
  function renderStatus(){return `<section class="panel status"><h2>${t('home.courseStatus')}</h2><p>${t('home.statusText')}</p></section>`}
  function bindEvents(){
    $('searchBox')&&($('searchBox').oninput=renderLessonGrid);$('filterBox')&&($('filterBox').onchange=renderLessonGrid);$('refreshBtn')&&($('refreshBtn').onclick=loadProgress);$('loginBtn')&&($('loginBtn').onclick=()=>window.MinnaAuth&&MinnaAuth.loginWithGoogle());$('logoutBtn')&&($('logoutBtn').onclick=async()=>{if(window.MinnaAuth)await MinnaAuth.logout();user=null;render()});$('leaderBtn')&&($('leaderBtn').onclick=loadLeaderboard);renderLessonGrid();
    document.querySelectorAll('[data-task]').forEach(cb=>cb.onchange=()=>{const st=dailyState();st[cb.dataset.task]=cb.checked;saveDaily(st);render()});
    $('resetChecklist')&&($('resetChecklist').onclick=()=>{saveDaily({});render()});$('clearRecent')&&($('clearRecent').onclick=()=>{localStorage.removeItem('minna_recent_lessons');render()});
    $('jumpGo')&&($('jumpGo').onclick=()=>{location.href=urlForLesson(Number($('jumpSelect').value)||currentLesson())});
    $('timer10')&&($('timer10').onclick=()=>{saveTimer({target:600,elapsed:0,started:0});render()});$('timer15')&&($('timer15').onclick=()=>{saveTimer({target:900,elapsed:0,started:0});render()});$('timer25')&&($('timer25').onclick=()=>{saveTimer({target:1500,elapsed:0,started:0});render()});
    $('timerStart')&&($('timerStart').onclick=()=>{const s=timerState();saveTimer({target:s.target,elapsed:currentElapsed(),started:Date.now()});markStudyDay();render()});$('timerPause')&&($('timerPause').onclick=()=>{const s=timerState();saveTimer({target:s.target,elapsed:currentElapsed(),started:0});render()});$('timerReset')&&($('timerReset').onclick=()=>{const s=timerState();saveTimer({target:s.target,elapsed:0,started:0});render()});
  }
  function markStudyDay(){const days=JSON.parse(localStorage.getItem('minna_study_days')||'{}');days[todayKey()]=true;localStorage.setItem('minna_study_days',JSON.stringify(days))}
  function updateTimerView(){if(!$('timerTime'))return;timerTick=setInterval(()=>{const s=timerState(),e=currentElapsed(),left=Math.max(0,s.target-e),pct=Math.round(e/s.target*100);$('timerTime').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');$('timerBar').style.width=pct+'%';$('timerMsg').textContent=e>=s.target?c('timerDone'):(s.started?c('timerRunning'):c('timerReady'));if(e>=s.target&&s.started){saveTimer({target:s.target,elapsed:s.target,started:0})}},1000)}
  async function initAuth(){if(!window.MinnaAuth)return;try{await MinnaAuth.init({lessonId:'minna_index'});user=MinnaAuth.getUser&&MinnaAuth.getUser()}catch(e){console.warn(e)}}
  async function loadProgress(){const cloud=$('cloudText'); if(cloud)cloud.textContent=t('home.checking');try{if(window.MinnaAuth&&MinnaAuth.listProgress){progressRows=await MinnaAuth.listProgress()}if(cloud)cloud.textContent=`${progressRows.length} ${t('home.recordLessons')}`}catch(e){if(cloud)cloud.textContent=e.message}render()}
  async function loadLeaderboard(){const box=$('leaderBox'); if(!box)return; box.textContent=t('home.checking');try{const supa=window.MinnaAuth&&MinnaAuth.client&&MinnaAuth.client();if(!supa){box.textContent='Supabase not ready';return}const {data,error}=await supa.from('minna_public_leaderboard').select('*').limit(10);if(error)throw error;box.innerHTML=(data||[]).map((r,i)=>`<div class="rank"><b>#${i+1}</b> ${r.display_name||'User'} · ${t('home.doneLevels')}: ${r.completed_lessons||0} · ${t('home.totalScore')}: ${r.total_score||0}</div>`).join('')||'No data'}catch(e){box.textContent=e.message}}
  async function start(){if(!window.MinnaI18n)return;I().onChange(()=>render());await initAuth();render();await loadProgress();loadLeaderboard()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
