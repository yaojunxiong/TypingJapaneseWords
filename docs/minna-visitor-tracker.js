// Minna AI Learning System visitor tracker
// Silent Supabase insert-only visit log + home page UX enhancer.
// The home page no longer displays a visitor info card.
(function(){
  const SUPABASE_URL='https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY='sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  let client=null;
  function supa(){
    if(!window.supabase) throw new Error('Supabase SDK is not loaded.');
    if(!client) client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function esc(s){return String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function visitorId(){const key='minna_visitor_id';let id=localStorage.getItem(key);if(!id){id='v_'+Math.random().toString(36).slice(2)+'_'+Date.now().toString(36);localStorage.setItem(key,id)}return id}
  function deviceType(){const ua=navigator.userAgent||'';if(/iPad|Tablet/i.test(ua))return'tablet';if(/Mobi|Android|iPhone/i.test(ua))return'mobile';return'desktop'}
  function visitSource(){const ref=document.referrer||'';if(!ref)return'direct';try{const host=new URL(ref).hostname;if(host.includes('google'))return'google';if(host.includes('github'))return'github';if(host.includes('chatgpt'))return'chatgpt';return host}catch(e){return'referrer'}}
  function collect(user){return{visitor_id:visitorId(),user_id:user&&user.id?user.id:null,user_email:user&&user.email?user.email:null,page_path:location.pathname+location.search,page_title:document.title,referrer:document.referrer||'',user_agent:navigator.userAgent||'',language:navigator.language||'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',screen_width:window.screen&&window.screen.width?window.screen.width:null,screen_height:window.screen&&window.screen.height?window.screen.height:null,viewport_width:window.innerWidth||null,viewport_height:window.innerHeight||null,device_type:deviceType(),visit_source:visitSource(),visited_at:new Date().toISOString()}}
  function todayKey(){return new Date().toISOString().slice(0,10)}
  function recordStudyDay(){
    try{const key='minna_study_days';const today=todayKey();let days=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(days))days=[];if(!days.includes(today))days.push(today);days=Array.from(new Set(days)).sort().slice(-120);localStorage.setItem(key,JSON.stringify(days));return days}catch(e){return[todayKey()]}
  }
  function studyStats(){
    const days=recordStudyDay(),set=new Set(days),d=new Date();let streak=0;
    for(let i=0;i<365;i++){const x=new Date(d);x.setDate(d.getDate()-i);const k=x.toISOString().slice(0,10);if(set.has(k))streak++;else break}
    const week=[];for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()-i);week.push(x.toISOString().slice(0,10))}
    const weekCount=week.filter(k=>set.has(k)).length;
    const goal=Number(localStorage.getItem('minna_week_goal')||5)||5;
    const goalPct=Math.min(100,Math.round(weekCount/goal*100));
    return{streak:streak||1,weekCount,goal,goalPct,days};
  }
  function isFocusMode(){return localStorage.getItem('minna_focus_mode')==='1'}
  function setFocusMode(on){localStorage.setItem('minna_focus_mode',on?'1':'0');document.body.classList.toggle('minnaFocusMode',!!on);var b=document.getElementById('focusModeBtn');if(b)b.textContent=on?'退出专注模式':'进入专注模式'}
  function setWeekGoal(n){localStorage.setItem('minna_week_goal',String(n));enhanceHome()}
  function timerState(){
    const target=Number(localStorage.getItem('minna_timer_target')||600)||600;
    const elapsed=Number(localStorage.getItem('minna_timer_elapsed')||0)||0;
    const started=Number(localStorage.getItem('minna_timer_started')||0)||0;
    const running=started>0;
    const nowExtra=running?Math.floor((Date.now()-started)/1000):0;
    const used=Math.min(target,elapsed+nowExtra);
    const remaining=Math.max(0,target-used);
    return{target,elapsed,started,running,used,remaining,done:remaining<=0};
  }
  function fmtTimer(sec){sec=Math.max(0,Math.floor(sec));const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
  function setTimerTarget(min){localStorage.setItem('minna_timer_target',String(min*60));localStorage.setItem('minna_timer_elapsed','0');localStorage.removeItem('minna_timer_started');updateTimerDisplay()}
  function startTimer(){const st=timerState();if(st.done){localStorage.setItem('minna_timer_elapsed','0')}if(!st.running)localStorage.setItem('minna_timer_started',String(Date.now()));recordStudyDay();updateTimerDisplay()}
  function pauseTimer(){const st=timerState();if(st.running){localStorage.setItem('minna_timer_elapsed',String(st.used));localStorage.removeItem('minna_timer_started')}updateTimerDisplay()}
  function resetTimer(){localStorage.setItem('minna_timer_elapsed','0');localStorage.removeItem('minna_timer_started');updateTimerDisplay()}
  function updateTimerDisplay(){
    const st=timerState();
    const time=document.getElementById('focusTimerTime'),bar=document.getElementById('focusTimerBar'),status=document.getElementById('focusTimerStatus');
    if(time)time.textContent=fmtTimer(st.remaining);
    if(bar)bar.style.width=Math.min(100,Math.round(st.used/st.target*100))+'%';
    if(status)status.textContent=st.done?'完成！休息一下或再来一轮。':(st.running?'专注中，不要切走。':'准备好就开始。');
    Array.prototype.slice.call(document.querySelectorAll('.timerTargetBtn')).forEach(function(b){b.classList.toggle('active',Number(b.dataset.min)*60===st.target)});
  }
  function installAdminLinks(){if(document.querySelector('[data-minna-admin-link="1"]'))return;var footer=document.querySelector('.footer')||document.body;var a=document.createElement('a');a.href='./minna-admin.html';a.dataset.minnaAdminLink='1';a.textContent=' 🔐 Admin';a.style.marginLeft='10px';a.style.opacity='.65';footer.appendChild(a)}
  function removeOldVisitorCard(){var old=document.querySelector('.visitorPanel');if(old&&old.parentNode)old.parentNode.removeChild(old)}
  function injectHomeStyle(){
    if(document.getElementById('minnaHomeEnhancerStyle'))return;
    var s=document.createElement('style');s.id='minnaHomeEnhancerStyle';s.textContent=`
      .studyDashboard{background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bfdbfe}
      .dashGrid{display:grid;grid-template-columns:1.12fr repeat(4,.62fr);gap:10px;align-items:stretch}
      .dashMain,.dashItem,.taskCard{background:white;border:1px solid #e2e8f0;border-radius:18px;padding:12px}
      .dashMain b{font-size:22px}.dashItem b{font-size:24px;display:block}.dashActions,.goalBtns,.quickBtns,.timerBtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
      .weekGoalBar,.timerBar{height:9px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin:8px 0}.weekGoalBar span{display:block;height:100%;background:linear-gradient(90deg,#22c55e,#f59e0b)}.timerBar span{display:block;height:100%;width:0;background:linear-gradient(90deg,#2563eb,#22c55e)}
      .focusModeBtn,.goalBtn,.jumpBtn,.timerBtn,.timerTargetBtn{border:0;border-radius:12px;padding:8px 10px;font-weight:1000;cursor:pointer}.focusModeBtn{background:#0f172a;color:white}.goalBtn,.jumpBtn,.timerBtn,.timerTargetBtn{background:#e2e8f0;color:#0f172a}.goalBtn.active,.timerTargetBtn.active{background:#22c55e;color:#052e16}.timerStart{background:#2563eb;color:white}.timerReset{background:#fee2e2;color:#991b1b}.quickSelect{width:100%;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;background:white;font-weight:800}
      .taskGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px}.taskList{margin:8px 0 0 18px;padding:0}.taskList li{margin:4px 0}.wrongPriority{background:linear-gradient(135deg,#fff7ed,#fef2f2);border-color:#fed7aa}.wrongZero{background:linear-gradient(135deg,#f0fdf4,#ecfeff);border-color:#bbf7d0}.timerCard{background:linear-gradient(135deg,#eff6ff,#f0f9ff);border-color:#bfdbfe}.taskTitle{font-weight:1000;font-size:17px}.taskNum{font-size:28px;font-weight:1000}.timerTime{font-size:32px;font-weight:1000;letter-spacing:.5px}.streakHot{background:linear-gradient(135deg,#fff7ed,#fef3c7);border-color:#f59e0b}
      .leaderCollapsed .tableWrap,.leaderCollapsed #leaderboardHint{display:none}.leaderToggle{margin-top:10px}.leaderTop3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.leaderMini{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:10px}.leaderMini b{display:block;font-size:16px}.leaderMini .medal{font-size:24px}.leaderEmpty{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:16px;padding:12px;margin-top:10px}
      .stage.collapsed .stageNodes{display:none}.stageCollapseBtn{margin-top:8px;padding:7px 10px;border-radius:12px;background:#e2e8f0;color:#0f172a;font-weight:900;border:0;cursor:pointer}.node.farDone{opacity:.42;transform:scale(.985)}.node.focusRing{outline:3px solid #facc15;outline-offset:2px}.nodeHint{display:block;margin-top:4px;font-size:12px;color:#92400e;font-weight:900}
      body.minnaFocusMode .minnaOptionalPanel{display:none!important}body.minnaFocusMode header{padding:18px}body.minnaFocusMode .studyDashboard{border:2px solid #22c55e}body.minnaFocusMode .studyDashboard h2:after{content:' ｜ 专注模式';color:#166534;font-size:15px}
      .stickyStudyBar{display:none;position:fixed;left:10px;right:10px;bottom:10px;z-index:9999;background:rgba(15,23,42,.94);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.18);border-radius:22px;padding:8px;box-shadow:0 12px 30px rgba(15,23,42,.25);gap:8px}.stickyStudyBar a{flex:1;text-align:center;text-decoration:none;border-radius:16px;padding:10px 8px;font-weight:1000;color:white;background:rgba(255,255,255,.12)}.stickyStudyBar a.primaryMini{background:#22c55e;color:#052e16}.stickyStudyBar a.warnMini{background:#f59e0b;color:#451a03}
      header .badge{font-size:0}header .badge:after{content:'《みんなの日本語》AI学习系统';font-size:14px}
      @media(max-width:1240px){.taskGrid{grid-template-columns:1fr 1fr}.taskCard{grid-column:auto}}
      @media(max-width:980px){.dashGrid{grid-template-columns:1fr 1fr}.dashMain{grid-column:1/-1}}
      @media(max-width:760px){body{padding-bottom:74px}.taskGrid,.leaderTop3{grid-template-columns:1fr 1fr}.taskCard{grid-column:1/-1}.stickyStudyBar{display:flex}}
      @media(max-width:520px){.leaderTop3{grid-template-columns:1fr}.dashGrid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s)
  }
  function readNum(id){var el=document.getElementById(id);return el?Number(el.textContent||0)||0:0}
  function currentLessonFromContinue(){var a=document.getElementById('continueBtn');var m=a&&a.getAttribute('href')&&a.getAttribute('href').match(/lesson-(\d+)/);return m?Number(m[1]):1}
  function lessonNumberFromNode(node){var m=(node&&node.textContent||'').match(/第\s*(\d+)\s*课/);return m?Number(m[1]):0}
  function lessonUrl(n,suffix){n=Math.min(50,Math.max(1,Number(n)||1));return './minna-no-nihongo-lesson-'+String(n).padStart(2,'0')+'.html?v=13.9'+(suffix||'')}
  function sumWrongCount(){var nodes=Array.prototype.slice.call(document.querySelectorAll('.node')).filter(n=>!/总复习/.test(n.textContent||''));var sum=0;nodes.forEach(function(node){var m=(node.textContent||'').match(/错题\s*(\d+)/);if(m)sum+=Number(m[1])||0});return sum}
  function currentWrongCount(){var node=document.querySelector('.node.current');var m=node&&(node.textContent||'').match(/错题\s*(\d+)/);return m?Number(m[1])||0:0}
  function currentDonePages(){var node=document.querySelector('.node.current');var m=node&&(node.textContent||'').match(/完成页\s*(\d+)\/(\d+)/);return m?{done:Number(m[1])||0,total:Number(m[2])||0}:{done:0,total:0}}
  function buildTasks(n,totalWrong,currentWrong,donePages,achText,streak,weekCount,goal){
    var tasks=[];
    if(totalWrong>0)tasks.push('先复习错题 '+Math.min(totalWrong,8)+' 个，避免错误积累');else tasks.push('快速复习上一课 3 分钟，保持语感');
    if(donePages.done<donePages.total)tasks.push('完成第 '+n+' 课至少 1 个学习小节');else tasks.push('做第 '+n+' 课 Mastery 小测试，争取解锁下一课');
    if(weekCount<goal)tasks.push('本周目标还差 '+(goal-weekCount)+' 天，今天完成 10 分钟即可打卡');else if(streak>=3)tasks.push('保持连续学习，第 '+streak+' 天不要断');else if(currentWrong>0)tasks.push('重点处理当前课错题 '+currentWrong+' 个');else if(achText==='未完成'&&n>25)tasks.push('抽空挑战 1–25课总复习，拿前半册成就');else tasks.push('朗读例句 5 句，提高听说反应速度');
    return tasks;
  }
  function lessonOptions(current){var html='';for(var i=1;i<=50;i++){html+='<option value="'+i+'" '+(i===current?'selected':'')+'>第 '+i+' 课</option>'}return html}
  function timerCardHtml(){const st=timerState();return '<div class="taskCard timerCard"><div class="taskTitle">⏱ 专注计时</div><div class="timerTime" id="focusTimerTime">'+fmtTimer(st.remaining)+'</div><div class="timerBar"><span id="focusTimerBar" style="width:'+Math.min(100,Math.round(st.used/st.target*100))+'%"></span></div><p class="small" id="focusTimerStatus">'+(st.done?'完成！休息一下或再来一轮。':(st.running?'专注中，不要切走。':'准备好就开始。'))+'</p><div class="timerBtns"><button class="timerTargetBtn" data-min="10">10分</button><button class="timerTargetBtn" data-min="15">15分</button><button class="timerTargetBtn" data-min="25">25分</button></div><div class="timerBtns"><button class="timerBtn timerStart" id="timerStartBtn">开始</button><button class="timerBtn" id="timerPauseBtn">暂停</button><button class="timerBtn timerReset" id="timerResetBtn">重置</button></div></div>'}
  function installDashboard(){
    var main=document.querySelector('main'),top=document.querySelector('section.top');if(!main||!top)return;
    var dash=document.getElementById('studyDashboard');if(!dash){dash=document.createElement('section');dash.id='studyDashboard';dash.className='panel studyDashboard';top.parentNode.insertBefore(dash,top)}
    var n=currentLessonFromContinue(),done=readNum('totalDone'),score=readNum('totalScore'),records=readNum('totalLessons'),ss=studyStats();
    var ach=document.getElementById('achievementTitle');var achText=ach&&/已通过/.test(ach.textContent||'')?'已完成':'未完成';
    var totalWrong=sumWrongCount(),currentWrong=currentWrongCount(),pages=currentDonePages(),tasks=buildTasks(n,totalWrong,currentWrong,pages,achText,ss.streak,ss.weekCount,ss.goal);
    var wrongClass=totalWrong>0?'wrongPriority':'wrongZero',wrongMsg=totalWrong>0?'建议先复习错题，再继续当前课。':'目前错题很少，可以继续推进当前课。';
    var goalBtns=[3,5,7].map(g=>'<button class="goalBtn '+(ss.goal===g?'active':'')+'" data-goal="'+g+'">'+g+'天</button>').join('');
    var html='<h2>📌 今日学习仪表盘</h2><div class="dashGrid"><div class="dashMain"><div class="small">今天建议学习</div><b>第'+n+'课</b><p class="small">优先完成当前课，再继续解锁下一课。</p><div class="dashActions"><a class="btn primary" href="'+lessonUrl(n)+'">继续学习</a><a class="btn light" href="./minna-review-01-25.html">1–25课总复习</a><button class="focusModeBtn" id="focusModeBtn">'+(isFocusMode()?'退出专注模式':'进入专注模式')+'</button></div></div><div class="dashItem"><span class="small">已掌握</span><b>'+done+'/50</b></div><div class="dashItem"><span class="small">总分</span><b>'+score+'</b></div><div class="dashItem"><span class="small">前半册成就</span><b style="font-size:20px">'+achText+'</b><span class="small">有记录课程 '+records+'</span></div><div class="dashItem streakHot"><span class="small">连续学习</span><b>🔥 '+ss.streak+'天</b><span class="small">本周 '+ss.weekCount+'/'+ss.goal+' 天目标</span><div class="weekGoalBar"><span style="width:'+ss.goalPct+'%"></span></div><div class="goalBtns">'+goalBtns+'</div></div></div><div class="taskGrid"><div class="taskCard '+wrongClass+'"><div class="taskTitle">🎯 错题优先</div><div class="taskNum">'+totalWrong+'</div><p class="small">'+wrongMsg+' 当前课错题：'+currentWrong+' 个。</p><div class="dashActions"><a class="btn '+(totalWrong>0?'primary':'light')+'" href="'+lessonUrl(n,'#wrong')+'">复习错题</a><a class="btn light" href="'+lessonUrl(n)+'">继续当前课</a></div></div><div class="taskCard"><div class="taskTitle">✅ 今日任务</div><ol class="taskList"><li>'+esc(tasks[0])+'</li><li>'+esc(tasks[1])+'</li><li>'+esc(tasks[2])+'</li></ol><p class="small">建议 10–15 分钟完成，不求多，但要连续。</p></div><div class="taskCard"><div class="taskTitle">🚀 快速跳课</div><p class="small">需要查某一课时，可以直接跳转；正常学习仍建议按路径闯关。</p><select id="quickLessonSelect" class="quickSelect">'+lessonOptions(n)+'</select><div class="quickBtns"><button class="jumpBtn" data-jump="'+Math.max(1,n-1)+'">上一课</button><button class="jumpBtn" data-jump="'+n+'">当前课</button><button class="jumpBtn" data-jump="'+Math.min(50,n+1)+'">下一课</button><button class="jumpBtn" id="quickLessonGo">跳转</button></div></div>'+timerCardHtml()+'</div>';
    if(dash.innerHTML!==html)dash.innerHTML=html;
  }
  function markOptionalPanels(){Array.prototype.slice.call(document.querySelectorAll('.panel')).forEach(function(p){var t=p.textContent||'';if(/Google 用户打卡排行榜|前半册总复习|前半册 1–25课总复习|课程状态/.test(t))p.classList.add('minnaOptionalPanel')})}
  function installDashboardControls(){
    markOptionalPanels();setFocusMode(isFocusMode());
    var b=document.getElementById('focusModeBtn');if(b&&!b.dataset.ready){b.dataset.ready='1';b.onclick=function(){setFocusMode(!isFocusMode())}};
    Array.prototype.slice.call(document.querySelectorAll('.goalBtn')).forEach(function(btn){if(btn.dataset.ready)return;btn.dataset.ready='1';btn.onclick=function(){setWeekGoal(Number(btn.dataset.goal)||5)}});
    Array.prototype.slice.call(document.querySelectorAll('.jumpBtn[data-jump]')).forEach(function(btn){if(btn.dataset.ready)return;btn.dataset.ready='1';btn.onclick=function(){location.href=lessonUrl(btn.dataset.jump)}});
    var go=document.getElementById('quickLessonGo');if(go&&!go.dataset.ready){go.dataset.ready='1';go.onclick=function(){var s=document.getElementById('quickLessonSelect');location.href=lessonUrl(s&&s.value)}};
    Array.prototype.slice.call(document.querySelectorAll('.timerTargetBtn')).forEach(function(btn){if(btn.dataset.ready)return;btn.dataset.ready='1';btn.onclick=function(){setTimerTarget(Number(btn.dataset.min)||10)}});
    var st=document.getElementById('timerStartBtn'),pa=document.getElementById('timerPauseBtn'),re=document.getElementById('timerResetBtn');
    if(st&&!st.dataset.ready){st.dataset.ready='1';st.onclick=startTimer}
    if(pa&&!pa.dataset.ready){pa.dataset.ready='1';pa.onclick=pauseTimer}
    if(re&&!re.dataset.ready){re.dataset.ready='1';re.onclick=resetTimer}
    updateTimerDisplay();
  }
  function parseLeaderboardRows(panel){var trs=Array.prototype.slice.call(panel.querySelectorAll('tbody tr')).slice(0,3);return trs.map(function(tr,i){var tds=tr.querySelectorAll('td');if(tds.length<5)return null;return{rank:i+1,name:(tds[1].textContent||'').trim().split('\n')[0],lessons:(tds[2].textContent||'0').trim(),score:(tds[4].textContent||'0').trim()}}).filter(Boolean)}
  function renderLeaderboardTop3(panel){var old=panel.querySelector('.leaderTop3,.leaderEmpty');if(old)old.remove();var rows=parseLeaderboardRows(panel),anchor=panel.querySelector('.tableWrap'),html='';if(rows.length){var medals=['🥇','🥈','🥉'];html='<div class="leaderTop3">'+rows.map(function(r,i){return '<div class="leaderMini"><span class="medal">'+medals[i]+'</span><b>'+esc(r.name||('第'+r.rank+'名'))+'</b><span class="small">完成 '+esc(r.lessons)+' 课｜总分 '+esc(r.score)+'</span></div>'}).join('')+'</div>'}else html='<div class="leaderEmpty small">排行榜载入后，这里会显示 Top 3 摘要。</div>';var box=document.createElement('div');box.innerHTML=html;panel.insertBefore(box.firstElementChild,anchor||null)}
  function enhanceLeaderboard(){var panel=Array.prototype.slice.call(document.querySelectorAll('.panel')).find(p=>/Google 用户打卡排行榜/.test(p.textContent||''));if(!panel)return;if(!panel.dataset.enhanced){panel.dataset.enhanced='1';panel.classList.add('leaderCollapsed');var btn=document.createElement('button');btn.className='light leaderToggle';btn.textContent='展开完整排行榜';btn.onclick=function(){panel.classList.toggle('leaderCollapsed');btn.textContent=panel.classList.contains('leaderCollapsed')?'展开完整排行榜':'收起排行榜'};(panel.querySelector('.leaderHead')||panel).appendChild(btn)}renderLeaderboardTop3(panel)}
  function focusCurrentPath(){var current=currentLessonFromContinue();Array.prototype.slice.call(document.querySelectorAll('.node')).forEach(function(node){var n=lessonNumberFromNode(node);if(!n)return;node.classList.toggle('focusRing',n===current);node.classList.toggle('farDone',n<current-2&&node.classList.contains('mastered'));if(n===current&&!node.querySelector('.nodeHint')){var hint=document.createElement('span');hint.className='nodeHint';hint.textContent='今天重点';(node.querySelector('.nodeMeta')||node).appendChild(hint)}})}
  function enhanceStages(){var stages=Array.prototype.slice.call(document.querySelectorAll('.stage'));if(!stages.length)return;stages.forEach(function(st){if(!st.dataset.foldReady){st.dataset.foldReady='1';var isCurrent=st.classList.contains('currentStage'),isDone=st.classList.contains('doneStage');if(!isCurrent)st.classList.add('collapsed');var btn=document.createElement('button');btn.className='stageCollapseBtn';btn.textContent=isCurrent?'收起本阶段':(isDone?'展开已完成阶段':'展开本阶段');btn.onclick=function(e){e.preventDefault();st.classList.toggle('collapsed');btn.textContent=st.classList.contains('collapsed')?(isDone?'展开已完成阶段':'展开本阶段'):'收起本阶段'};var head=st.querySelector('.stageHead');if(head)head.appendChild(btn)}});focusCurrentPath()}
  function installStickyBar(){var n=currentLessonFromContinue(),bar=document.getElementById('stickyStudyBar');if(!bar){bar=document.createElement('nav');bar.id='stickyStudyBar';bar.className='stickyStudyBar';document.body.appendChild(bar)}var wrong=sumWrongCount();var html='<a class="primaryMini" href="'+lessonUrl(n)+'">▶ 继续</a><a class="'+(wrong>0?'warnMini':'')+'" href="'+lessonUrl(n,'#wrong')+'">🎯 错题 '+wrong+'</a><a href="#lessonPathPanel">🗺 路径</a><a href="#top" onclick="window.scrollTo({top:0,behavior:\'smooth\'});return false;">↑ 顶部</a>';if(bar.innerHTML!==html)bar.innerHTML=html}
  function enhanceHome(){injectHomeStyle();installAdminLinks();removeOldVisitorCard();installDashboard();installDashboardControls();enhanceLeaderboard();enhanceStages();installStickyBar()}
  async function track(){enhanceHome();try{let user=null;if(window.MinnaAuth&&MinnaAuth.refreshUser){user=await MinnaAuth.refreshUser()}else{const{data}=await supa().auth.getUser();user=data&&data.user?data.user:null}await supa().from('minna_visitor_logs').insert(collect(user))}catch(e){console.warn('Minna visitor tracking failed:',e&&e.message?e.message:e)}}
  function start(){recordStudyDay();track();if(window.__minnaTimerInterval)clearInterval(window.__minnaTimerInterval);window.__minnaTimerInterval=setInterval(updateTimerDisplay,1000);var observer=new MutationObserver(function(){clearTimeout(window.__minnaHomeEnhanceTimer);window.__minnaHomeEnhanceTimer=setTimeout(enhanceHome,180)});observer.observe(document.body,{childList:true,subtree:true,characterData:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('minna-auth-changed',function(){setTimeout(track,500)});
})();