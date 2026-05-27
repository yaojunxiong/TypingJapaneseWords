// Minna home app shell v20.3.8
(function(){
  var VERSION='20.3.8';
  var STATE_KEY='minna.mobile.learning.state.v1';
  var GOAL_KEY='minna.mobile.daily.goal.v1';

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}
    catch(e){return fallback}
  }

  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}
  }

  function readState(){return readJson(STATE_KEY,{})}

  function lessonUrl(n){
    return './minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview';
  }

  function dateKey(){
    var d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function readGoal(){
    var g=readJson(GOAL_KEY,{});
    var today=dateKey();
    if(g.date!==today){
      g={date:today,targetMinutes:Number(g.targetMinutes||15),doneMinutes:0,checked:false};
      writeJson(GOAL_KEY,g);
    }
    if(!g.targetMinutes)g.targetMinutes=15;
    return g;
  }

  function saveGoal(g){writeJson(GOAL_KEY,g)}

  function getLastLesson(){
    var state=readState();
    var n=Number(state.lastLesson||localStorage.getItem('minna_home_last_lesson')||1);
    return Math.max(1,Math.min(50,n));
  }

  function addContinueCard(){
    var state=readState();
    var n=getLastLesson();
    var main=document.querySelector('main.wrap');
    if(!main||document.getElementById('homeContinueCard'))return;

    var card=document.createElement('section');
    card.id='homeContinueCard';
    card.className='panel homeContinueCard';

    var left=document.createElement('div');
    var badge=document.createElement('div');
    badge.className='badge2';
    badge.textContent='Continue Learning';
    var h=document.createElement('h2');
    h.textContent='继续学习 第 '+n+' 课';
    var p=document.createElement('p');
    p.className='small';
    p.textContent='连续学习 '+Number(state.streak||1)+' 天 · 上次学习记录已保存到本机';
    left.appendChild(badge);
    left.appendChild(h);
    left.appendChild(p);

    var actions=document.createElement('div');
    actions.className='actionStrip';
    var go=document.createElement('a');
    go.className='primary';
    go.href=state.lastLessonUrl||lessonUrl(n);
    go.textContent='继续学习';
    var restart=document.createElement('a');
    restart.className='light';
    restart.href=lessonUrl(1);
    restart.textContent='从第1课开始';
    actions.appendChild(go);
    actions.appendChild(restart);

    card.appendChild(left);
    card.appendChild(actions);
    main.insertBefore(card,main.firstChild);
  }

  function addDailyGoalCard(){
    var main=document.querySelector('main.wrap');
    if(!main||document.getElementById('dailyGoalCard'))return;
    var goal=readGoal();
    var percent=Math.max(0,Math.min(100,Math.round(Number(goal.doneMinutes||0)/Number(goal.targetMinutes||15)*100)));

    var card=document.createElement('section');
    card.id='dailyGoalCard';
    card.className='panel dailyGoalCard';

    var head=document.createElement('div');
    var badge=document.createElement('div');
    badge.className='badge2';
    badge.textContent='Daily Goal';
    var h=document.createElement('h2');
    h.textContent='今日目标：学习 '+Number(goal.targetMinutes||15)+' 分钟';
    var p=document.createElement('p');
    p.className='small';
    p.textContent='已完成 '+Number(goal.doneMinutes||0)+' 分钟 · '+percent+'%';
    head.appendChild(badge);
    head.appendChild(h);
    head.appendChild(p);

    var line=document.createElement('div');
    line.className='progressLine goalLine';
    var bar=document.createElement('i');
    bar.style.width=percent+'%';
    line.appendChild(bar);

    var actions=document.createElement('div');
    actions.className='actionStrip';
    var add5=document.createElement('button');
    add5.className='primary';
    add5.textContent='+5 分钟';
    add5.onclick=function(){
      goal.doneMinutes=Number(goal.doneMinutes||0)+5;
      if(goal.doneMinutes>=goal.targetMinutes)goal.checked=true;
      saveGoal(goal);
      card.remove();
      addDailyGoalCard();
    };
    var done=document.createElement('button');
    done.className='light';
    done.textContent='今日完成';
    done.onclick=function(){
      goal.doneMinutes=Number(goal.targetMinutes||15);
      goal.checked=true;
      saveGoal(goal);
      card.remove();
      addDailyGoalCard();
    };
    actions.appendChild(add5);
    actions.appendChild(done);

    card.appendChild(head);
    card.appendChild(line);
    card.appendChild(actions);

    var after=document.getElementById('homeContinueCard');
    if(after&&after.parentNode)after.parentNode.insertBefore(card,after.nextSibling);
    else main.insertBefore(card,main.firstChild);
  }

  function boot(){
    setTimeout(function(){addContinueCard();addDailyGoalCard()},400);
    setTimeout(function(){addContinueCard();addDailyGoalCard()},1200);
  }

  window.MinnaHomeAppShell={readState:readState,readGoal:readGoal};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
