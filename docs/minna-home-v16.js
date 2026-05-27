// Minna Home v16.0
// Full-site refactor direction: one structured renderer, no patch-chain, no DOM translation.
(function(){
  const $=id=>document.getElementById(id);
  const I=()=>window.MinnaI18n;
  const t=(k,v)=>I().t(k,v);
  const pick=v=>I().pick(v);
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>new Date().toISOString().slice(0,10);
  const lessonUrl=n=>`./minna-no-nihongo-lesson-${pad(n)}.html?v=16.0`;
  const ADMIN_URL='./minna-admin.html';
  const meta={
    1:['名词句・自我介绍','Noun sentences / self-introduction','わたしは〜です'],2:['これ・それ・あれ','これ・それ・あれ','this / that / that over there'],3:['ここ・そこ・あそこ','ここ・そこ・あそこ','places and directions'],4:['时间・星期','Time and days of the week','今何時ですか'],5:['移动・交通','Movement and transportation','行きます・来ます・帰ります'],6:['动词ます形','ます-form verbs','食べます・飲みます'],7:['工具・授受基础','Tools and giving/receiving basics','〜で・あげます'],8:['形容词','Adjectives','い-adjectives / な-adjectives'],9:['好き・上手','Likes and skills','対象助词 が'],10:['存在句','Existence sentences','あります・います'],11:['数量表达','Quantity expressions','ひとつ・ふたつ'],12:['过去式・比较','Past tense and comparison','〜でした・より'],13:['想要・目的','Wanting and purpose','ほしい・たい'],14:['て形','て-form','〜てください'],15:['て形许可','Permission with て-form','〜てもいいです'],16:['连接动作','Connecting actions','〜て、〜て'],17:['ない形','ない-form','〜ないでください'],18:['辞书形','Dictionary form','〜ことができます'],19:['た形','た-form','〜たことがあります'],20:['普通形','Plain form','plain-style conversation'],21:['と思います','Expressing opinions','〜と思います'],22:['名词修饰','Noun modification','連体修飾'],23:['とき・と','When / if','とき・と'],24:['くれます','Receiving favors','くれます'],25:['たら・ても','Conditional expressions','たら・ても'],26:['んです','Explaining and requesting','んです'],27:['可能形','Potential form','できます'],28:['ながら','Doing two actions','ながら'],29:['自动词','Intransitive verbs','開いています'],30:['他动词','Transitive verbs','〜てあります'],31:['意向形','Volitional form','〜と思っています'],32:['建议・推量','Advice and conjecture','〜ほうがいい'],33:['命令・禁止','Commands and prohibitions','〜な'],34:['〜とおりに','Following instructions','〜とおりに'],35:['条件形','Conditional form','〜ば'],36:['ように','Goals and change','ように'],37:['受身形','Passive form','受身'],38:['のは','Nominalization','のは'],39:['原因理由','Reasons and causes','〜て・ので'],40:['疑问词嵌入','Embedded questions','〜か'],41:['授受高级','Advanced giving and receiving','いただきます'],42:['ために','Purpose','ために'],43:['そうです','Appearance','そうです'],44:['すぎます','Excess','すぎます'],45:['場合は','In case','場合は'],46:['ところです','Action stages','ところです'],47:['そうです','Hearsay','そうです'],48:['使役形','Causative form','使役'],49:['尊敬语','Honorific language','尊敬語'],50:['谦让语','Humble language','謙譲語']
  };
  const lessons=Array.from({length:50},(_,i)=>{const n=i+1,m=meta[n];return {n,title:{zh:`第${n}课`,en:`Lesson ${n}`},topic:{zh:m[0],en:m[1]},tag:m[2],url:lessonUrl(n)}});
  const stages=[
    {from:1,to:13,title:{zh:'初级Ⅰ 前半',en:'Beginner I - First Half'},sub:{zh:'第1–13课：名词句、时间、移动、基础动词、形容词',en:'Lessons 1–13: noun sentences, time, movement, basic verbs, adjectives'}},
    {from:14,to:25,title:{zh:'初级Ⅰ 后半',en:'Beginner I - Second Half'},sub:{zh:'第14–25课：て形、ない形、辞书形、た形、普通形、条件表达',en:'Lessons 14–25: て-form, ない-form, dictionary form, た-form, plain form, conditionals'}},
    {from:26,to:38,title:{zh:'初级Ⅱ 前半',en:'Beginner II - First Half'},sub:{zh:'第26–38课：んです、可能形、自动词/他动词、条件、受身',en:'Lessons 26–38: んです, potential form, intransitive/transitive verbs, conditionals, passive'}},
    {from:39,to:50,title:{zh:'初级Ⅱ 后半',en:'Beginner II - Second Half'},sub:{zh:'第39–50课：理由、目的、样态、场合、敬语、谦让语',en:'Lessons 39–50: reasons, purpose, appearance, situations, honorific and humble language'}}
  ];
  const copy={
    version:{zh:'Minna AI Learning System v16.0',en:'Minna AI Learning System v16.0'},
    refactor:{zh:'全站重构模式：主页先回到干净单渲染器，旧补丁文件停止加载。',en:'Full-site refactor mode: the home page now uses one clean renderer; legacy patch files are no longer loaded.'},
    admin:{zh:'🔐 管理员后台',en:'🔐 Admin Console'}, design:{zh:'📘 设计文档',en:'📘 Design'}, manual:{zh:'📖 使用说明',en:'📖 Guide'}, review:{zh:'🎯 1–25课总复习',en:'🎯 Review 1–25'},
    account:{zh:'账号中心',en:'Account Center'}, login:{zh:'登录状态：',en:'Login Status:'}, cloud:{zh:'云端：',en:'Cloud:'}, checking:{zh:'检查中',en:'Checking'}, notLogin:{zh:'未登录',en:'Not signed in'}, loginBtn:{zh:'G 用 Google 登录',en:'G Sign in with Google'}, logout:{zh:'退出',en:'Log out'}, refresh:{zh:'刷新进度',en:'Refresh Progress'}, continue:{zh:'继续学习',en:'Continue'},
    dashboard:{zh:'今日学习仪表盘',en:"Today's Dashboard"}, current:{zh:'当前课',en:'Current Lesson'}, mastered:{zh:'已掌握',en:'Mastered'}, streak:{zh:'连续学习',en:'Learning Streak'}, mistakes:{zh:'错题',en:'Mistakes'}, totalScore:{zh:'总分',en:'Total Score'}, records:{zh:'有记录课程',en:'Lessons with Records'}, completed:{zh:'完成关卡',en:'Completed Levels'},
    checklist:{zh:'今日清单',en:"Today's Checklist"}, checklistDesc:{zh:'v16 先保留核心清单，以后再扩展成全站任务系统。',en:'v16 keeps the core checklist first; it can later expand into a site-wide task system.'}, resetToday:{zh:'重置今天',en:'Reset Today'}, doIt:{zh:'去完成 →',en:'Do it →'}, task1:{zh:'学习当前课 10 分钟',en:'Study the current lesson for 10 minutes'}, task2:{zh:'复习错题',en:'Review mistakes'}, task3:{zh:'朗读例句',en:'Read examples aloud'}, task4:{zh:'做一次 Mastery 测试',en:'Take one Mastery test'},
    jump:{zh:'快速跳课',en:'Quick Jump'}, go:{zh:'跳转',en:'Go'}, prev:{zh:'上一课',en:'Previous'}, next:{zh:'下一课',en:'Next'},
    path:{zh:'学习路径地图 v16',en:'Learning Path Map v16'}, pathDesc:{zh:'课程主题、阶段、进度统一由结构化数据渲染。',en:'Lesson topics, stages, and progress are rendered from structured data.'}, search:{zh:'搜索课程，如：第26课 / んです / passive / 敬语',en:'Search lessons, e.g. Lesson 26 / んです / passive / keigo'}, all:{zh:'全部',en:'All'}, unlocked:{zh:'只看已解锁',en:'Unlocked Only'}, progressOnly:{zh:'只看有进度',en:'With Progress Only'}, topic:{zh:'主题',en:'Topic'}, tag:{zh:'标签',en:'Tag'}, locked:{zh:'未解锁',en:'Locked'}, start:{zh:'开始学习',en:'Start'},
    system:{zh:'系统状态',en:'System Status'}, status:{zh:'主页已经进入 v16 单渲染器模式。下一步应把课程页、复习页、后台也迁移到同一套核心。',en:'The home page is now in v16 single-renderer mode. Next, lesson pages, review pages, and admin should move to the same core.'}, legacy:{zh:'Legacy：v15 patch 文件保留但主页不再加载。',en:'Legacy: v15 patch files remain in the repo but are no longer loaded by the home page.'},
    leaderboard:{zh:'排行榜',en:'Leaderboard'}, leaderboardDesc:{zh:'v16 先保留轻量读取；后续迁移为统一数据服务。',en:'v16 keeps lightweight reading first; later this should move into a unified data service.'}, runCheck:{zh:'检查数据连接',en:'Check Data'}, ok:{zh:'正常',en:'OK'}, issue:{zh:'异常',en:'Issue'}, noData:{zh:'暂无数据',en:'No data'}
  };
  const c=k=>pick(copy[k]);
  const state={rows:[],user:null,filter:'all',search:localStorage.getItem('minna_home_v16_search')||'',diag:null};
  const localKey=k=>'minna_home_v16_'+k;
  function progress(n){return state.rows.find(r=>r.lesson_id===`minna_lesson_${pad(n)}`)?.progress||null}
  function done(p){if(!p)return 0;if(Number.isFinite(Number(p.completed_count)))return Number(p.completed_count);return Object.keys(p.done||{}).length}
  function total(p){return Math.max(1,Number(p&&p.total_slides)||12)}
  function wrong(p){if(!p)return 0;if(Number.isFinite(Number(p.wrong_count)))return Number(p.wrong_count);return Object.keys(p.wrong||{}).length}
  function score(p){return Number(p&&p.score)||0}
  function mastered(p){return !!(p&&p.mastery_passed)||done(p)>=total(p)}
  function unlocked(n){return n===1||mastered(progress(n-1))}
  function current(){for(let n=1;n<=50;n++)if(!mastered(progress(n)))return n;return 50}
  function completedCount(){return lessons.filter(l=>mastered(progress(l.n))).length}
  function wrongAll(){return lessons.reduce((s,l)=>s+wrong(progress(l.n)),0)}
  function totalScore(){return state.rows.reduce((s,r)=>s+score(r.progress),0)}
  function studyDays(){return Object.keys(JSON.parse(localStorage.getItem('minna_study_days')||'{}')).length}
  function daily(){return JSON.parse(localStorage.getItem('minna_daily_checklist_'+today())||'{}')}
  function saveDaily(v){localStorage.setItem('minna_daily_checklist_'+today(),JSON.stringify(v))}
  function render(){
    if(!I())return;
    document.title=I().lang()==='en'?'Minna no Nihongo Beginner AI Learning System':'《みんなの日本語 初級》AI学习系统';
    $('app').innerHTML=`
      <header class="hero"><div class="wrap topbar"><div><span class="badge">${c('version')}</span><h1>${t('home.title')}</h1><p>${t('home.subtitle')}</p><p class="small heroNote">${c('refactor')}</p></div><div id="langSlot"></div></div><div class="wrap quicklinks"><a href="./minna-system-design.html">${c('design')}</a><a href="./minna-user-manual.html">${c('manual')}</a><a href="./minna-review-01-25.html">${c('review')}</a><a href="${ADMIN_URL}">${c('admin')}</a><a class="primary" href="${lessonUrl(current())}">${c('start')}</a></div></header>
      <main class="wrap">${account()}${dashboard()}${tools()}${path()}${leaderboard()}${system()}</main><footer class="wrap footer">docs/minna-index.html · v16.0</footer>`;
    I().installToggle($('langSlot'));
    bind(); renderGrid();
  }
  function account(){const email=state.user&&state.user.email;return `<section class="panel"><h2>${c('account')}</h2><div class="row"><b>${c('login')}</b><span>${email||c('notLogin')}</span></div><div class="row"><b>${c('cloud')}</b><span id="cloudText">${state.rows.length?state.rows.length+' '+c('records'):c('checking')}</span></div><p class="buttons"><button id="loginBtn">${c('loginBtn')}</button><button id="logoutBtn" class="light">${c('logout')}</button><button id="refreshBtn" class="ghost">${c('refresh')}</button><button id="diagBtn" class="light">${c('runCheck')}</button><a class="primary" href="${lessonUrl(current())}">${c('continue')}</a></p>${diagnostics()}</section>`}
  function diagnostics(){if(!state.diag)return '';return `<div class="diagBox">${state.diag.map(x=>`<div class="diagLine"><b>${x.name}</b><span class="${x.ok?'ok':'bad'}">${x.ok?c('ok'):c('issue')}</span><small>${x.msg}</small></div>`).join('')}</div>`}
  function dashboard(){const n=current(),l=lessons[n-1];return `<section class="panel"><h2>${c('dashboard')}</h2><div class="cards4"><div><b>${c('current')}</b><span>${pick(l.title)}</span></div><div><b>${c('mastered')}</b><span>${completedCount()}/50</span></div><div><b>${c('streak')}</b><span>${studyDays()}</span></div><div><b>${c('mistakes')}</b><span>${wrongAll()}</span></div></div><p class="small">${pick(l.topic)} · ${l.tag}</p><p class="buttons"><a class="primary" href="${lessonUrl(n)}">${c('start')}</a><a class="ghost" href="${lessonUrl(n)}#wrong">${c('mistakes')}</a></p></section>`}
  function tools(){return `<section class="widgetGrid">${checklist()}${quickJump()}${overview()}</section>`}
  function checklist(){const d=daily(),n=current(),tasks=[['t1',c('task1'),lessonUrl(n)],['t2',c('task2'),lessonUrl(n)+'#wrong'],['t3',c('task3'),lessonUrl(n)],['t4',c('task4'),lessonUrl(n)]];return `<div class="panel"><h2>${c('checklist')}</h2><p class="small">${c('checklistDesc')}</p>${tasks.map(x=>`<label class="task"><input type="checkbox" data-task="${x[0]}" ${d[x[0]]?'checked':''}><span><b>${x[1]}</b></span><a href="${x[2]}">${c('doIt')}</a></label>`).join('')}<p><button id="resetChecklist" class="light">${c('resetToday')}</button></p></div>`}
  function quickJump(){const n=current();return `<div class="panel"><h2>${c('jump')}</h2><div class="filters"><select id="jumpSelect">${lessons.map(l=>`<option value="${l.n}" ${l.n===n?'selected':''}>${pick(l.title)}｜${pick(l.topic)}</option>`).join('')}</select><button id="jumpBtn" class="primary">${c('go')}</button></div><p class="buttons"><a class="light" href="${lessonUrl(Math.max(1,n-1))}">${c('prev')}</a><a class="ghost" href="${lessonUrl(n)}">${c('current')}</a><a class="light" href="${lessonUrl(Math.min(50,n+1))}">${c('next')}</a></p></div>`}
  function overview(){return `<div class="panel"><h2>${t('home.overview')}</h2><div class="cards4 miniCards"><div><b>50</b><span>${t('home.online')}</span></div><div><b>${state.rows.length}</b><span>${c('records')}</span></div><div><b>${totalScore()}</b><span>${c('totalScore')}</span></div><div><b>${completedCount()}</b><span>${c('completed')}</span></div></div></div>`}
  function path(){return `<section class="panel"><h2>${c('path')}</h2><p class="small">${c('pathDesc')}</p><div class="filters"><input id="searchBox" value="${escapeAttr(state.search)}" placeholder="${c('search')}"><select id="filterBox"><option value="all">${c('all')}</option><option value="unlocked">${c('unlocked')}</option><option value="progress">${c('progressOnly')}</option></select></div><div id="lessonGrid"></div></section>`}
  function renderGrid(){const box=$('lessonGrid');if(!box)return;const q=state.search.toLowerCase(), f=state.filter;const html=stages.map(s=>{const ls=lessons.filter(l=>l.n>=s.from&&l.n<=s.to);const shown=ls.filter(l=>{const p=progress(l.n);if(f==='unlocked'&&!unlocked(l.n))return false;if(f==='progress'&&!p)return false;const label=`${pick(l.title)} ${l.title.zh} ${l.title.en} ${pick(l.topic)} ${l.topic.zh} ${l.topic.en} ${l.tag}`.toLowerCase();return !q||label.includes(q)});if(!shown.length)return '';const d=ls.filter(l=>mastered(progress(l.n))).length,u=ls.filter(l=>unlocked(l.n)).length;return `<div class="stageBlock"><h3>${pick(s.title)}</h3><p class="small">${pick(s.sub)}</p><p><span class="badge2">${d}/${ls.length} ${c('mastered')}</span><span class="badge2">${u}/${ls.length} ${c('unlocked')}</span></p><div class="lessonGrid">${shown.map(card).join('')}</div></div>`}).join('');box.innerHTML=html||`<p class="small">${c('noData')}</p>`}
  function card(l){const p=progress(l.n),m=mastered(p),u=unlocked(l.n),cl=m?'mastered':(l.n===current()?'current':(u?'unlocked':'locked'));return `<a class="lesson ${cl}" href="${u?lessonUrl(l.n):'#'}"><b>${pick(l.title)}</b><span>${m?c('mastered'):(u?c('unlocked'):c('locked'))}</span><small>${c('topic')}：${pick(l.topic)}</small><small>${c('tag')}：${l.tag}</small><small>${done(p)}/${total(p)} · ${c('totalScore')} ${score(p)} · ${c('mistakes')} ${wrong(p)}</small></a>`}
  function leaderboard(){return `<section class="panel"><h2>${c('leaderboard')}</h2><p class="small">${c('leaderboardDesc')}</p><p><button id="leaderBtn" class="ghost">${t('home.refreshLeaderboard')}</button></p><div id="leaderBox" class="small">${c('checking')}</div></section>`}
  function system(){return `<section class="panel"><h2>${c('system')}</h2><p>${c('status')}</p><p class="small">${c('legacy')}</p></section>`}
  function bind(){
    const f=$('filterBox'); if(f){f.value=state.filter; f.onchange=()=>{state.filter=f.value;renderGrid()}}
    const s=$('searchBox'); if(s){s.oninput=()=>{state.search=s.value;localStorage.setItem(localKey('search'),state.search);renderGrid()}}
    $('loginBtn')&&($('loginBtn').onclick=()=>window.MinnaAuth&&MinnaAuth.loginWithGoogle());
    $('logoutBtn')&&($('logoutBtn').onclick=async()=>{if(window.MinnaAuth)await MinnaAuth.logout();state.user=null;await loadProgress()});
    $('refreshBtn')&&($('refreshBtn').onclick=loadProgress);
    $('diagBtn')&&($('diagBtn').onclick=runDiagnostics);
    $('leaderBtn')&&($('leaderBtn').onclick=loadLeaderboard);
    $('jumpBtn')&&($('jumpBtn').onclick=()=>{location.href=lessonUrl(Number($('jumpSelect').value)||current())});
    $('resetChecklist')&&($('resetChecklist').onclick=()=>{saveDaily({});render()});
    document.querySelectorAll('[data-task]').forEach(cb=>cb.onchange=()=>{const d=daily();d[cb.dataset.task]=cb.checked;saveDaily(d)});
  }
  async function initAuth(){if(!window.MinnaAuth)return;try{await MinnaAuth.init({lessonId:'minna_index'});state.user=MinnaAuth.getUser&&MinnaAuth.getUser()}catch(e){console.warn(e)}}
  async function loadProgress(){try{if(window.MinnaAuth&&MinnaAuth.listProgress)state.rows=await MinnaAuth.listProgress();state.user=window.MinnaAuth&&MinnaAuth.getUser?MinnaAuth.getUser():state.user}catch(e){state.diag=[{name:c('cloud'),ok:false,msg:e.message}]}render()}
  async function loadLeaderboard(){const box=$('leaderBox');if(!box)return;box.textContent=c('checking');try{const supa=window.MinnaAuth&&MinnaAuth.client&&MinnaAuth.client();if(!supa)throw new Error('Supabase client not ready');const {data,error}=await supa.from('minna_public_leaderboard').select('*').limit(10);if(error)throw error;box.innerHTML=(data||[]).map((r,i)=>`<div class="rank"><b>#${i+1}</b> ${escapeHtml(r.display_name||'User')} · ${c('completed')}: ${r.completed_lessons||0} · ${c('totalScore')}: ${r.total_score||0}</div>`).join('')||c('noData')}catch(e){box.textContent=e.message}}
  async function runDiagnostics(){const out=[];out.push({name:'MinnaAuth',ok:!!window.MinnaAuth,msg:window.MinnaAuth?'loaded':'not loaded'});out.push({name:'User',ok:!!state.user,msg:state.user&&state.user.email?state.user.email:c('notLogin')});try{if(window.MinnaAuth&&MinnaAuth.listProgress){const r=await MinnaAuth.listProgress();out.push({name:'Progress',ok:Array.isArray(r),msg:(Array.isArray(r)?r.length:0)+' rows'})}else throw new Error('listProgress not ready')}catch(e){out.push({name:'Progress',ok:false,msg:e.message})}try{const supa=window.MinnaAuth&&MinnaAuth.client&&MinnaAuth.client();if(!supa)throw new Error('Supabase client not ready');const {data,error}=await supa.from('minna_public_leaderboard').select('*').limit(1);if(error)throw error;out.push({name:'Leaderboard',ok:true,msg:(data||[]).length+' rows'})}catch(e){out.push({name:'Leaderboard',ok:false,msg:e.message})}state.diag=out;render()}
  function escapeHtml(s){return String(s==null?'':s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;')}
  async function start(){if(!window.MinnaI18n)return;I().onChange(()=>render());await initAuth();await loadProgress();loadLeaderboard()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
