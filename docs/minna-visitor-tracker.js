// Minna AI Learning System visitor tracker
// Silent Supabase insert-only visit log + home page UX enhancer.
// The home page no longer displays a visitor info card.
(function(){
  const SUPABASE_URL = 'https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  let client = null;
  function supa(){
    if(!window.supabase) throw new Error('Supabase SDK is not loaded.');
    if(!client) client = window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function esc(s){return String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function visitorId(){
    const key='minna_visitor_id';let id=localStorage.getItem(key);
    if(!id){id='v_'+Math.random().toString(36).slice(2)+'_'+Date.now().toString(36);localStorage.setItem(key,id)}
    return id;
  }
  function deviceType(){const ua=navigator.userAgent||'';if(/iPad|Tablet/i.test(ua))return'tablet';if(/Mobi|Android|iPhone/i.test(ua))return'mobile';return'desktop'}
  function visitSource(){const ref=document.referrer||'';if(!ref)return'direct';try{const host=new URL(ref).hostname;if(host.includes('google'))return'google';if(host.includes('github'))return'github';if(host.includes('chatgpt'))return'chatgpt';return host}catch(e){return'referrer'}}
  function collect(user){return{visitor_id:visitorId(),user_id:user&&user.id?user.id:null,user_email:user&&user.email?user.email:null,page_path:location.pathname+location.search,page_title:document.title,referrer:document.referrer||'',user_agent:navigator.userAgent||'',language:navigator.language||'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',screen_width:window.screen&&window.screen.width?window.screen.width:null,screen_height:window.screen&&window.screen.height?window.screen.height:null,viewport_width:window.innerWidth||null,viewport_height:window.innerHeight||null,device_type:deviceType(),visit_source:visitSource(),visited_at:new Date().toISOString()}}
  function installAdminLinks(){
    if(document.querySelector('[data-minna-admin-link="1"]')) return;
    var href='./minna-admin.html';
    var footer=document.querySelector('.footer')||document.body;
    var admin=document.createElement('a');admin.href=href;admin.dataset.minnaAdminLink='1';admin.textContent=' 🔐 Admin';admin.style.marginLeft='10px';admin.style.opacity='.65';
    footer.appendChild(admin);
  }
  function removeOldVisitorCard(){var old=document.querySelector('.visitorPanel');if(old&&old.parentNode)old.parentNode.removeChild(old)}
  function injectHomeStyle(){
    if(document.getElementById('minnaHomeEnhancerStyle'))return;
    var s=document.createElement('style');s.id='minnaHomeEnhancerStyle';s.textContent=`
      .studyDashboard{background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bfdbfe}
      .dashGrid{display:grid;grid-template-columns:1.2fr repeat(3,.7fr);gap:10px;align-items:stretch}
      .dashMain,.dashItem{background:white;border:1px solid #e2e8f0;border-radius:18px;padding:12px}
      .dashMain b{font-size:22px}.dashItem b{font-size:24px;display:block}.dashActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .leaderCollapsed .tableWrap,.leaderCollapsed #leaderboardHint{display:none}.leaderToggle{margin-top:10px}
      .stage.collapsed .stageNodes{display:none}.stageCollapseBtn{margin-top:8px;padding:7px 10px;border-radius:12px;background:#e2e8f0;color:#0f172a;font-weight:900;border:0;cursor:pointer}
      header .badge{font-size:0}header .badge:after{content:'《みんなの日本語》AI学习系统';font-size:14px}
      @media(max-width:760px){.dashGrid{grid-template-columns:1fr 1fr}.dashMain{grid-column:1/-1}}
    `;document.head.appendChild(s);
  }
  function readNum(id){var el=document.getElementById(id);return el?Number(el.textContent||0)||0:0}
  function currentLessonFromContinue(){var a=document.getElementById('continueBtn');var m=a&&a.getAttribute('href')&&a.getAttribute('href').match(/lesson-(\d+)/);return m?Number(m[1]):1}
  function installDashboard(){
    var main=document.querySelector('main'),top=document.querySelector('section.top');if(!main||!top)return;
    var dash=document.getElementById('studyDashboard');if(!dash){dash=document.createElement('section');dash.id='studyDashboard';dash.className='panel studyDashboard';top.parentNode.insertBefore(dash,top)}
    var n=currentLessonFromContinue(),done=readNum('totalDone'),score=readNum('totalScore'),records=readNum('totalLessons');
    var ach=document.getElementById('achievementTitle');var achText=ach&&/已通过/.test(ach.textContent||'')?'已完成':'未完成';
    dash.innerHTML='<h2>📌 今日学习仪表盘</h2><div class="dashGrid"><div class="dashMain"><div class="small">今天建议学习</div><b>第'+n+'课</b><p class="small">优先完成当前课，再继续解锁下一课。</p><div class="dashActions"><a class="btn primary" href="./minna-no-nihongo-lesson-'+String(n).padStart(2,'0')+'.html?v=13.3">继续学习</a><a class="btn light" href="./minna-review-01-25.html">1–25课总复习</a></div></div><div class="dashItem"><span class="small">已掌握</span><b>'+done+'/50</b></div><div class="dashItem"><span class="small">总分</span><b>'+score+'</b></div><div class="dashItem"><span class="small">前半册成就</span><b style="font-size:20px">'+achText+'</b><span class="small">有记录课程 '+records+'</span></div></div>';
  }
  function enhanceLeaderboard(){
    var panel=Array.prototype.slice.call(document.querySelectorAll('.panel')).find(p=>/Google 用户打卡排行榜/.test(p.textContent||''));if(!panel||panel.dataset.enhanced)return;
    panel.dataset.enhanced='1';panel.classList.add('leaderCollapsed');
    var btn=document.createElement('button');btn.className='light leaderToggle';btn.textContent='展开排行榜';
    btn.onclick=function(){panel.classList.toggle('leaderCollapsed');btn.textContent=panel.classList.contains('leaderCollapsed')?'展开排行榜':'收起排行榜'};
    var head=panel.querySelector('.leaderHead')||panel;head.appendChild(btn);
  }
  function enhanceStages(){
    var stages=Array.prototype.slice.call(document.querySelectorAll('.stage'));if(!stages.length)return;
    stages.forEach(function(st){
      if(st.dataset.foldReady)return;st.dataset.foldReady='1';
      var isCurrent=st.classList.contains('currentStage');var isDone=st.classList.contains('doneStage');
      if(!isCurrent)st.classList.add('collapsed');
      var btn=document.createElement('button');btn.className='stageCollapseBtn';btn.textContent=isCurrent?'收起本阶段':(isDone?'展开已完成阶段':'展开本阶段');
      btn.onclick=function(e){e.preventDefault();st.classList.toggle('collapsed');btn.textContent=st.classList.contains('collapsed')?(isDone?'展开已完成阶段':'展开本阶段'):'收起本阶段'};
      var head=st.querySelector('.stageHead');if(head)head.appendChild(btn);
    });
  }
  function enhanceHome(){
    injectHomeStyle();installAdminLinks();removeOldVisitorCard();installDashboard();enhanceLeaderboard();enhanceStages();
  }
  async function track(){
    enhanceHome();
    try{let user=null;if(window.MinnaAuth&&MinnaAuth.refreshUser){user=await MinnaAuth.refreshUser()}else{const{data}=await supa().auth.getUser();user=data&&data.user?data.user:null}await supa().from('minna_visitor_logs').insert(collect(user))}catch(e){console.warn('Minna visitor tracking failed:',e&&e.message?e.message:e)}
  }
  var observer=null;
  function start(){
    track();
    observer=new MutationObserver(function(){clearTimeout(window.__minnaHomeEnhanceTimer);window.__minnaHomeEnhanceTimer=setTimeout(enhanceHome,120)});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('minna-auth-changed',function(){setTimeout(track,500)});
})();