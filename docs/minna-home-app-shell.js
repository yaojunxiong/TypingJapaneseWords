// Minna home app shell v20.3.7
(function(){
  var VERSION='20.3.7';
  var STATE_KEY='minna.mobile.learning.state.v1';

  function readState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}
    catch(e){return {}}
  }

  function lessonUrl(n){
    return './minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview';
  }

  function addContinueCard(){
    var state=readState();
    var n=Number(state.lastLesson||localStorage.getItem('minna_home_last_lesson')||1);
    n=Math.max(1,Math.min(50,n));

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

  function boot(){
    setTimeout(addContinueCard,400);
    setTimeout(addContinueCard,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
