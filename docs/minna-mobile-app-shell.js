// Minna mobile app shell v20.3.6
(function(){
  var VERSION='20.3.6';
  var STATE_KEY='minna.mobile.learning.state.v1';

  function lessonNo(){
    var b=document.body;
    if(b&&b.dataset.lessonNo)return Number(b.dataset.lessonNo)||1;
    var n=Number(new URLSearchParams(location.search).get('n'))||1;
    return Math.max(1,Math.min(50,n));
  }

  function dateKey(offset){
    var d=new Date();
    d.setDate(d.getDate()+(offset||0));
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function readState(){
    if(window.MinnaStore&&window.MinnaStore.readState){
      return window.MinnaStore.readState()||{};
    }
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}
    catch(e){return {}}
  }

  function writeState(s){
    if(window.MinnaStore&&window.MinnaStore.writeState){
      window.MinnaStore.writeState(s||{});
      return;
    }
    try{localStorage.setItem(STATE_KEY,JSON.stringify(s))}catch(e){}
  }

  function updateLearningState(){
    var n=lessonNo();
    var s=readState();
    var today=dateKey(0);
    var yesterday=dateKey(-1);
    if(s.lastStudyDate!==today){
      s.streak=(s.lastStudyDate===yesterday)?Number(s.streak||0)+1:1;
      s.lastStudyDate=today;
    }
    s.lastLesson=n;
    s.lastLessonUrl='./minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview';
    s.lastStudyAt=Date.now();
    writeState(s);
    return s;
  }

  function link(label,sub,url,active){
    var a=document.createElement('a');
    a.href=url;
    if(active)a.className='active';
    var span=document.createElement('span');
    span.textContent=label;
    var b=document.createElement('b');
    b.textContent=sub;
    if(sub==='在线')b.id='networkBadge';
    a.appendChild(span);
    a.appendChild(b);
    return a;
  }

  function installNetworkBadge(){
    function update(){
      document.body.classList.toggle('isOffline',!navigator.onLine);
      var b=document.getElementById('networkBadge');
      if(b)b.textContent=navigator.onLine?'在线':'离线';
    }
    window.addEventListener('online',update);
    window.addEventListener('offline',update);
    update();
  }

  function installStudyToast(s){
    if(document.getElementById('studyToast'))return;
    var toast=document.createElement('div');
    toast.id='studyToast';
    toast.className='studyToast';
    toast.textContent='连续学习 '+Number(s.streak||1)+' 天 · 继续第 '+Number(s.lastLesson||lessonNo())+' 课';
    document.body.appendChild(toast);
    setTimeout(function(){toast.classList.add('show')},120);
    setTimeout(function(){toast.classList.remove('show')},3600);
  }

  function installBottomNav(s){
    if(document.getElementById('mobileBottomNav'))return;
    var n=lessonNo();
    var prev=Math.max(1,n-1);
    var next=Math.min(50,n+1);
    var nav=document.createElement('nav');
    nav.id='mobileBottomNav';
    nav.className='mobileBottomNav';
    nav.appendChild(link('⌂','首页','./minna-index.html?v='+VERSION,false));
    nav.appendChild(link('‹','上一课','./minna-lesson-v16.html?n='+prev+'&v='+VERSION+'&mode=preview',false));
    nav.appendChild(link('第'+n+'课','在线','./minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview',true));
    nav.appendChild(link(String(Number(s.streak||1))+'天','下一课','./minna-lesson-v16.html?n='+next+'&v='+VERSION+'&mode=preview',false));
    document.body.appendChild(nav);
    installNetworkBadge();
  }

  function prefetch(url){
    try{
      if('requestIdleCallback' in window){
        requestIdleCallback(function(){fetch(url,{cache:'force-cache'}).catch(function(){})});
      }else{
        setTimeout(function(){fetch(url,{cache:'force-cache'}).catch(function(){})},1500);
      }
    }catch(e){}
  }

  function prefetchNextLessons(){
    var n=lessonNo();
    [n+1,n+2].forEach(function(x){
      if(x>=1&&x<=50){
        prefetch('./data/minna/lessons/lesson-'+String(x).padStart(2,'0')+'.json?v='+VERSION);
      }
    });
  }

  function boot(){
    var s=updateLearningState();
    installBottomNav(s);
    installStudyToast(s);
    prefetchNextLessons();
  }

  window.MinnaMobileState={read:readState,write:writeState,update:updateLearningState};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
