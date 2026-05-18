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
  function installAdminLinks(){
    if(document.querySelector('[data-minna-admin-link="1"]')) return;
    var href='./minna-admin.html';var footer=document.querySelector('.footer')||document.body;
    var admin=document.createElement('a');admin.href=href;admin.dataset.minnaAdminLink='1';admin.textContent=' 🔐 Admin';admin.style.marginLeft='10px';admin.style.opacity='.65';footer.appendChild(admin);
  }
  function removeOldVisitorCard(){var old=document.querySelector('.visitorPanel');if(old&&old.parentNode)old.parentNode.removeChild(old)}
  function injectHomeStyle(){
    if(document.getElementById('minnaHomeEnhancerStyle'))return;
    var s=document.createElement('style');s.id='minnaHomeEnhancerStyle';s.textContent=`
      .studyDashboard{background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bfdbfe}
      .dashGrid{display:grid;grid-template-columns:1.15fr repeat(3,.7fr);gap:10px;align-items:stretch}
      .dashMain,.dashItem,.taskCard{background:white;border:1px solid #e2e8f0;border-radius:18px;padding:12px}
      .dashMain b{font-size:22px}.dashItem b{font-size:24px;display:block}.dashActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .taskGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.taskList{margin:8px 0 0 18px;padding:0}.taskList li{margin:4px 0}.wrongPriority{background:linear-gradient(135deg,#fff7ed,#fef2f2);border-color:#fed7aa}.wrongZero{background:linear-gradient(135deg,#f0fdf4,#ecfeff);border-color:#bbf7d0}.taskTitle{font-weight:1000;font-size:17px}.taskNum{font-size:28px;font-weight:1000}
      .leaderCollapsed .tableWrap,.leaderCollapsed #leaderboardHint{display:none}.leaderToggle{margin-top:10px}.leaderTop3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.leaderMini{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:10px}.leaderMini b{display:block;font-size:16px}.leaderMini .medal{font-size:24px}.leaderEmpty{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:16px;padding:12px;margin-top:10px}
      .stage.collapsed .stageNodes{display:none}.stageCollapseBtn{margin-top:8px;padding:7px 10px;border-radius:12px;background:#e2e8f0;color:#0f172a;font-weight:900;border:0;cursor:pointer}.node.farDone{opacity:.42;transform:scale(.985)}.node.focusRing{outline:3px solid #facc15;outline-offset:2px}.nodeHint{display:block;margin-top:4px;font-size:12px;color:#92400e;font-weight:900}
      header .badge{font-size:0}header .badge:after{content:'《みんなの日本語》AI学习系统';font-size:14px}
      @media(max-width:760px){.dashGrid,.taskGrid,.leaderTop3{grid-template-columns:1fr 1fr}.dashMain{grid-column:1/-1}.taskCard{grid-column:1/-1}}
      @media(max-width:520px){.leaderTop3{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function readNum(id){var el=document.getElementById(id);return el?Number(el.textContent||0)||0:0}
  function currentLessonFromContinue(){var a=document.getElementById('continueBtn');var m=a&&a.getAttribute('href')&&a.getAttribute('href').match(/lesson-(\d+)/);return m?Number(m[1]):1}
  function lessonNumberFromNode(node){var m=(node&&node.textContent||'').match(/第\s*(\d+)\s*课/);return m?Number(m[1]):0}
  function sumWrongCount(){var nodes=Array.prototype.slice.call(document.querySelectorAll('.node')).filter(n=>!/总复习/.test(n.textContent||''));var sum=0;nodes.forEach(function(node){var m=(node.textContent||'').match(/错题\s*(\d+)/);if(m)sum+=Number(m[1])||0});return sum}
  function currentWrongCount(){var node=document.querySelector('.node.current');var m=node&&(node.textContent||'').match(/错题\s*(\d+)/);return m?Number(m[1])||0:0}
  function currentDonePages(){var node=document.querySelector('.node.current');var m=node&&(node.textContent||'').match(/完成页\s*(\d+)\/(\d+)/);return m?{done:Number(m[1])||0,total:Number(m[2])||0}:{done:0,total:0}}
  function buildTasks(n,totalWrong,currentWrong,donePages,achText){
    var tasks=[];
    if(totalWrong>0){tasks.push('先复习错题 '+Math.min(totalWrong,8)+' 个，避免错误积累')}else{tasks.push('快速复习上一课 3 分钟，保持语感')}
    if(donePages.done<donePages.total){tasks.push('完成第 '+n+' 课至少 1 个学习小节')}else{tasks.push('做第 '+n+' 课 Mastery 小测试，争取解锁下一课')}
    if(currentWrong>0){tasks.push('重点处理当前课错题 '+currentWrong+' 个')}else if(achText==='未完成'&&n>25){tasks.push('抽空挑战 1–25课总复习，拿前半册成就')}else{tasks.push('朗读例句 5 句，提高听说反应速度')}
    return tasks;
  }
  function installDashboard(){
    var main=document.querySelector('main'),top=document.querySelector('section.top');if(!main||!top)return;
    var dash=document.getElementById('studyDashboard');if(!dash){dash=document.createElement('section');dash.id='studyDashboard';dash.className='panel studyDashboard';top.parentNode.insertBefore(dash,top)}
    var n=currentLessonFromContinue(),done=readNum('totalDone'),score=readNum('totalScore'),records=readNum('totalLessons');
    var ach=document.getElementById('achievementTitle');var achText=ach&&/已通过/.test(ach.textContent||'')?'已完成':'未完成';
    var totalWrong=sumWrongCount(),currentWrong=currentWrongCount(),pages=currentDonePages(),tasks=buildTasks(n,totalWrong,currentWrong,pages,achText);
    var wrongClass=totalWrong>0?'wrongPriority':'wrongZero';var wrongMsg=totalWrong>0?'建议先复习错题，再继续当前课。':'目前错题很少，可以继续推进当前课。';
    dash.innerHTML='<h2>📌 今日学习仪表盘</h2><div class="dashGrid"><div class="dashMain"><div class="small">今天建议学习</div><b>第'+n+'课</b><p class="small">优先完成当前课，再继续解锁下一课。</p><div class="dashActions"><a class="btn primary" href="./minna-no-nihongo-lesson-'+String(n).padStart(2,'0')+'.html?v=13.5">继续学习</a><a class="btn light" href="./minna-review-01-25.html">1–25课总复习</a></div></div><div class="dashItem"><span class="small">已掌握</span><b>'+done+'/50</b></div><div class="dashItem"><span class="small">总分</span><b>'+score+'</b></div><div class="dashItem"><span class="small">前半册成就</span><b style="font-size:20px">'+achText+'</b><span class="small">有记录课程 '+records+'</span></div></div><div class="taskGrid"><div class="taskCard '+wrongClass+'"><div class="taskTitle">🎯 错题优先</div><div class="taskNum">'+totalWrong+'</div><p class="small">'+wrongMsg+' 当前课错题：'+currentWrong+' 个。</p><div class="dashActions"><a class="btn '+(totalWrong>0?'primary':'light')+'" href="./minna-no-nihongo-lesson-'+String(n).padStart(2,'0')+'.html?v=13.5#wrong">复习错题</a><a class="btn light" href="./minna-no-nihongo-lesson-'+String(n).padStart(2,'0')+'.html?v=13.5">继续当前课</a></div></div><div class="taskCard"><div class="taskTitle">✅ 今日任务</div><ol class="taskList"><li>'+esc(tasks[0])+'</li><li>'+esc(tasks[1])+'</li><li>'+esc(tasks[2])+'</li></ol><p class="small">建议 10–15 分钟完成，不求多，但要连续。</p></div></div>';
  }
  function parseLeaderboardRows(panel){
    var trs=Array.prototype.slice.call(panel.querySelectorAll('tbody tr')).slice(0,3);
    return trs.map(function(tr,i){var tds=tr.querySelectorAll('td');if(tds.length<5)return null;return{rank:i+1,name:(tds[1].textContent||'').trim().split('\n')[0],lessons:(tds[2].textContent||'0').trim(),score:(tds[4].textContent||'0').trim()}}).filter(Boolean);
  }
  function renderLeaderboardTop3(panel){
    var old=panel.querySelector('.leaderTop3,.leaderEmpty');if(old)old.remove();
    var rows=parseLeaderboardRows(panel);var anchor=panel.querySelector('.tableWrap');
    var html='';
    if(rows.length){var medals=['🥇','🥈','🥉'];html='<div class="leaderTop3">'+rows.map(function(r,i){return '<div class="leaderMini"><span class="medal">'+medals[i]+'</span><b>'+esc(r.name||('第'+r.rank+'名'))+'</b><span class="small">完成 '+esc(r.lessons)+' 课｜总分 '+esc(r.score)+'</span></div>'}).join('')+'</div>'}
    else{html='<div class="leaderEmpty small">排行榜载入后，这里会显示 Top 3 摘要。</div>'}
    var box=document.createElement('div');box.innerHTML=html;panel.insertBefore(box.firstElementChild,anchor||null);
  }
  function enhanceLeaderboard(){
    var panel=Array.prototype.slice.call(document.querySelectorAll('.panel')).find(p=>/Google 用户打卡排行榜/.test(p.textContent||''));if(!panel)return;
    if(!panel.dataset.enhanced){
      panel.dataset.enhanced='1';panel.classList.add('leaderCollapsed');
      var btn=document.createElement('button');btn.className='light leaderToggle';btn.textContent='展开完整排行榜';
      btn.onclick=function(){panel.classList.toggle('leaderCollapsed');btn.textContent=panel.classList.contains('leaderCollapsed')?'展开完整排行榜':'收起排行榜'};
      var head=panel.querySelector('.leaderHead')||panel;head.appendChild(btn);
    }
    renderLeaderboardTop3(panel);
  }
  function focusCurrentPath(){
    var current=currentLessonFromContinue();
    Array.prototype.slice.call(document.querySelectorAll('.node')).forEach(function(node){
      var n=lessonNumberFromNode(node);if(!n)return;
      node.classList.toggle('focusRing',n===current);
      node.classList.toggle('farDone',n<current-2&&node.classList.contains('mastered'));
      if(n===current&&!node.querySelector('.nodeHint')){var hint=document.createElement('span');hint.className='nodeHint';hint.textContent='今天重点';var meta=node.querySelector('.nodeMeta')||node;meta.appendChild(hint)}
    });
  }
  function enhanceStages(){
    var stages=Array.prototype.slice.call(document.querySelectorAll('.stage'));if(!stages.length)return;
    stages.forEach(function(st){
      if(!st.dataset.foldReady){
        st.dataset.foldReady='1';var isCurrent=st.classList.contains('currentStage');var isDone=st.classList.contains('doneStage');
        if(!isCurrent)st.classList.add('collapsed');
        var btn=document.createElement('button');btn.className='stageCollapseBtn';btn.textContent=isCurrent?'收起本阶段':(isDone?'展开已完成阶段':'展开本阶段');
        btn.onclick=function(e){e.preventDefault();st.classList.toggle('collapsed');btn.textContent=st.classList.contains('collapsed')?(isDone?'展开已完成阶段':'展开本阶段'):'收起本阶段'};
        var head=st.querySelector('.stageHead');if(head)head.appendChild(btn);
      }
    });
    focusCurrentPath();
  }
  function enhanceHome(){injectHomeStyle();installAdminLinks();removeOldVisitorCard();installDashboard();enhanceLeaderboard();enhanceStages()}
  async function track(){
    enhanceHome();
    try{let user=null;if(window.MinnaAuth&&MinnaAuth.refreshUser){user=await MinnaAuth.refreshUser()}else{const{data}=await supa().auth.getUser();user=data&&data.user?data.user:null}await supa().from('minna_visitor_logs').insert(collect(user))}catch(e){console.warn('Minna visitor tracking failed:',e&&e.message?e.message:e)}
  }
  function start(){
    track();
    var observer=new MutationObserver(function(){clearTimeout(window.__minnaHomeEnhanceTimer);window.__minnaHomeEnhanceTimer=setTimeout(enhanceHome,160)});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('minna-auth-changed',function(){setTimeout(track,500)});
})();