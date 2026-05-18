// Minna Home 14.2 - learning insights enhancer
// Local-only learning coach panel. No database changes.
(function(){
  function esc(s){return String(s||'').replace(/[&<>]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m];});}
  function todayKey(){return new Date().toISOString().slice(0,10);}
  function pad(n){return String(n).padStart(2,'0');}
  function lessonUrl(n,suffix){n=Math.min(50,Math.max(1,Number(n)||1));return './minna-no-nihongo-lesson-'+pad(n)+'.html?v=14.2'+(suffix||'');}
  function currentLesson(){
    var a=document.getElementById('continueBtn');
    var h=a&&a.getAttribute('href')||'';
    var m=h.match(/lesson-(\d+)/i);
    return m?Number(m[1]):1;
  }
  function numFromText(selector, fallback){
    var el=document.querySelector(selector);
    var m=el&&(el.textContent||'').match(/\d+/);
    return m?Number(m[0])||fallback:fallback;
  }
  function totalWrong(){
    var nodes=Array.prototype.slice.call(document.querySelectorAll('.node')).filter(function(n){return !/总复习/.test(n.textContent||'');});
    var sum=0;
    nodes.forEach(function(node){var m=(node.textContent||'').match(/错题\s*(\d+)/);if(m)sum+=Number(m[1])||0;});
    return sum;
  }
  function currentWrong(){
    var node=document.querySelector('.node.current');
    var m=node&&(node.textContent||'').match(/错题\s*(\d+)/);
    return m?Number(m[1])||0:0;
  }
  function checklistState(){
    try{
      var st=JSON.parse(localStorage.getItem('minna_daily_checklist_'+todayKey())||'{}');
      var total=4;
      var done=Object.keys(st||{}).filter(function(k){return !!st[k];}).length;
      return {done:done,total:total,pct:Math.round(done/total*100)};
    }catch(e){return {done:0,total:4,pct:0};}
  }
  function recentList(){
    try{var r=JSON.parse(localStorage.getItem('minna_recent_lessons')||'[]');return Array.isArray(r)?r:[];}catch(e){return [];}
  }
  function timerState(){
    var target=Number(localStorage.getItem('minna_timer_target')||600)||600;
    var elapsed=Number(localStorage.getItem('minna_timer_elapsed')||0)||0;
    var started=Number(localStorage.getItem('minna_timer_started')||0)||0;
    var running=started>0;
    var extra=running?Math.floor((Date.now()-started)/1000):0;
    var used=Math.min(target,elapsed+extra);
    return {target:target,used:used,running:running,done:used>=target};
  }
  function studyDays(){
    try{var d=JSON.parse(localStorage.getItem('minna_study_days')||'[]');return Array.isArray(d)?d:[];}catch(e){return [];}
  }
  function buildInsight(){
    var lesson=currentLesson();
    var wrong=totalWrong(), cw=currentWrong(), check=checklistState(), recent=recentList(), timer=timerState();
    var mastered=numFromText('#totalDone',0), score=numFromText('#totalScore',0), days=studyDays();
    var headline='今天先完成第 '+lesson+' 课的一个小目标';
    var action='继续学习';
    var href=lessonUrl(lesson);
    var reason='保持连续学习，比一次学很多更重要。';
    if(timer.running){headline='专注计时正在进行中';action='回到当前课';href=lessonUrl(lesson);reason='先不要切换任务，把这一轮专注完成。';}
    else if(check.done>=check.total){headline='今日清单已完成，可以轻松加练';action='做 Mastery 小测试';href=lessonUrl(lesson);reason='今天已经达标，适合用小测试确认掌握度。';}
    else if(wrong>0){headline='先处理错题，再推进新课';action='复习错题';href=lessonUrl(lesson,'#wrong');reason='你还有 '+wrong+' 个错题，当前课 '+cw+' 个。';}
    else if(recent.length>=3){headline='最近学习很稳定，继续当前课';action='继续第 '+lesson+' 课';href=lessonUrl(lesson);reason='最近已有 '+recent.length+' 条学习记录，适合保持节奏。';}
    else if(mastered===0){headline='先完成第1课，建立学习起点';action='开始第1课';href=lessonUrl(1);reason='第一课完成后，后面的闯关路径会更清楚。';}
    return {headline:headline,action:action,href:href,reason:reason,check:check,wrong:wrong,mastered:mastered,score:score,days:days.length,timer:timer};
  }
  function ensureStyle(){
    if(document.getElementById('minnaInsightsStyle'))return;
    var s=document.createElement('style');s.id='minnaInsightsStyle';
    s.textContent='\
      .insightsPanel{background:linear-gradient(135deg,#ecfeff,#f8fafc);border-color:#67e8f9}\
      .insightGrid{display:grid;grid-template-columns:1.2fr repeat(4,.7fr);gap:10px;align-items:stretch}\
      .insightMain,.insightStat{background:white;border:1px solid #e2e8f0;border-radius:18px;padding:12px}\
      .insightMain b{font-size:22px}.insightMain p{margin:8px 0}.insightStat b{display:block;font-size:24px}.insightAction{display:inline-block;text-decoration:none;background:#0891b2;color:white;border-radius:14px;padding:10px 14px;font-weight:1000;margin-top:8px}\
      .insightHint{font-size:13px;color:#64748b;line-height:1.5}\
      @media(max-width:980px){.insightGrid{grid-template-columns:1fr 1fr}.insightMain{grid-column:1/-1}}\
      @media(max-width:520px){.insightGrid{grid-template-columns:1fr}}\
    ';
    document.head.appendChild(s);
  }
  function render(){
    ensureStyle();
    var dash=document.getElementById('studyDashboard');
    if(!dash)return;
    var anchor=document.getElementById('dailyChecklist')||dash;
    var panel=document.getElementById('learningInsightsPanel');
    if(!panel){panel=document.createElement('section');panel.id='learningInsightsPanel';panel.className='panel insightsPanel';anchor.parentNode.insertBefore(panel,anchor.nextSibling);}
    var x=buildInsight();
    panel.innerHTML='<h2>🧭 学习洞察</h2><div class="insightGrid"><div class="insightMain"><div class="insightHint">下一步建议</div><b>'+esc(x.headline)+'</b><p class="insightHint">'+esc(x.reason)+'</p><a class="insightAction" href="'+esc(x.href)+'">'+esc(x.action)+' →</a></div><div class="insightStat"><span class="insightHint">今日清单</span><b>'+x.check.done+'/'+x.check.total+'</b><span class="insightHint">完成度 '+x.check.pct+'%</span></div><div class="insightStat"><span class="insightHint">错题</span><b>'+x.wrong+'</b><span class="insightHint">建议优先清理</span></div><div class="insightStat"><span class="insightHint">已掌握</span><b>'+x.mastered+'</b><span class="insightHint">总分 '+x.score+'</span></div><div class="insightStat"><span class="insightHint">本机记录</span><b>'+x.days+'天</b><span class="insightHint">localStorage</span></div></div>';
  }
  function start(){
    render();
    setInterval(render,3000);
    var timer=null;
    var obs=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(render,300);});
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
