// Minna Home 14.0 - daily checklist enhancer
// Adds a local, privacy-friendly daily learning checklist to the home dashboard.
(function(){
  function todayKey(){ return new Date().toISOString().slice(0,10); }
  function esc(s){ return String(s||'').replace(/[&<>]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m];}); }
  function currentLesson(){
    var a=document.getElementById('continueBtn');
    var m=a&&a.getAttribute('href')&&a.getAttribute('href').match(/lesson-(\d+)/);
    return m?Number(m[1]):1;
  }
  function wrongCount(){
    var node=document.querySelector('.node.current');
    var m=node&&(node.textContent||'').match(/错题\s*(\d+)/);
    return m?Number(m[1])||0:0;
  }
  function lessonUrl(n,suffix){
    n=Math.min(50,Math.max(1,Number(n)||1));
    return './minna-no-nihongo-lesson-'+String(n).padStart(2,'0')+'.html?v=14.0'+(suffix||'');
  }
  function storageKey(){ return 'minna_daily_checklist_'+todayKey(); }
  function getState(){
    try{ var v=JSON.parse(localStorage.getItem(storageKey())||'{}'); return v&&typeof v==='object'?v:{}; }
    catch(e){ return {}; }
  }
  function setState(st){ localStorage.setItem(storageKey(), JSON.stringify(st||{})); }
  function tasks(){
    var n=currentLesson(), wrong=wrongCount();
    return [
      {id:'start', title:'开始学习 10 分钟', desc:'打开当前课，完成一点点就算赢。', href:lessonUrl(n)},
      {id:'wrong', title: wrong>0 ? '复习当前课错题 '+wrong+' 个' : '快速复习上一课', desc: wrong>0 ? '先清错题，再推进新内容。' : '错题很少，保持语感即可。', href:lessonUrl(n,'#wrong')},
      {id:'speak', title:'朗读例句 5 句', desc:'不用追求完美，重点是开口。', href:lessonUrl(n)},
      {id:'mastery', title:'完成 1 次 Mastery 小测试', desc:'用小测试确认今天真的掌握了。', href:lessonUrl(n)}
    ];
  }
  function ensureStyle(){
    if(document.getElementById('minnaChecklistStyle'))return;
    var s=document.createElement('style');
    s.id='minnaChecklistStyle';
    s.textContent='\
      .dailyChecklist{background:linear-gradient(135deg,#f8fafc,#eef2ff);border-color:#c7d2fe}\
      .checkHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}\
      .checkProgress{height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin:10px 0}\
      .checkProgress span{display:block;height:100%;background:linear-gradient(90deg,#6366f1,#22c55e)}\
      .checkGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px}\
      .checkItem{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:12px;min-height:132px}\
      .checkItem.done{background:#f0fdf4;border-color:#22c55e}\
      .checkItem label{display:flex;gap:8px;align-items:flex-start;font-weight:1000;cursor:pointer}\
      .checkItem input{width:18px;height:18px;margin-top:3px}\
      .checkItem p{margin:6px 0 0 26px;color:#64748b;font-size:13px;line-height:1.45}\
      .checkItem a{display:inline-block;margin:10px 0 0 26px;text-decoration:none;font-weight:900;color:#2563eb}\
      .checkBadge{display:inline-block;background:#dcfce7;color:#166534;border-radius:999px;padding:3px 10px;font-weight:1000}\
      .checkReset{border:0;background:#e2e8f0;border-radius:12px;padding:8px 10px;font-weight:1000;cursor:pointer}\
      @media(max-width:980px){.checkGrid{grid-template-columns:1fr 1fr}}\
      @media(max-width:520px){.checkGrid{grid-template-columns:1fr}}\
    ';
    document.head.appendChild(s);
  }
  function render(){
    ensureStyle();
    var dash=document.getElementById('studyDashboard');
    if(!dash)return;
    var existing=document.getElementById('dailyChecklist');
    if(!existing){
      existing=document.createElement('section');
      existing.id='dailyChecklist';
      existing.className='panel dailyChecklist';
      dash.parentNode.insertBefore(existing, dash.nextSibling);
    }
    var st=getState(), list=tasks();
    var done=list.filter(function(t){return !!st[t.id];}).length;
    var pct=Math.round(done/list.length*100);
    existing.innerHTML='<div class="checkHead"><div><h2>✅ 今日完成清单</h2><p class="small">每天自动重置。先完成小目标，再继续加量。</p></div><div><span class="checkBadge">'+done+'/'+list.length+' 完成</span><button class="checkReset" id="checkResetBtn">重置今天</button></div></div><div class="checkProgress"><span style="width:'+pct+'%"></span></div><div class="checkGrid">'+list.map(function(t){var checked=!!st[t.id];return '<div class="checkItem '+(checked?'done':'')+'"><label><input type="checkbox" data-check-id="'+esc(t.id)+'" '+(checked?'checked':'')+'> <span>'+esc(t.title)+'</span></label><p>'+esc(t.desc)+'</p><a href="'+esc(t.href)+'">去完成 →</a></div>';}).join('')+'</div>';
    Array.prototype.slice.call(existing.querySelectorAll('input[data-check-id]')).forEach(function(input){
      input.onchange=function(){var s=getState();s[input.dataset.checkId]=input.checked;setState(s);render();};
    });
    var reset=document.getElementById('checkResetBtn');
    if(reset)reset.onclick=function(){localStorage.removeItem(storageKey());render();};
  }
  function start(){
    render();
    var timer=null;
    var obs=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(render,250);});
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
