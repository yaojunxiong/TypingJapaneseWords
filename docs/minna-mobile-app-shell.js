// Minna mobile app shell v20.3.5
(function(){
  var VERSION='20.3.5';

  function lessonNo(){
    var b=document.body;
    if(b&&b.dataset.lessonNo)return Number(b.dataset.lessonNo)||1;
    var n=Number(new URLSearchParams(location.search).get('n'))||1;
    return Math.max(1,Math.min(50,n));
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

  function installBottomNav(){
    if(document.getElementById('mobileBottomNav'))return;
    var n=lessonNo();
    var prev=Math.max(1,n-1);
    var next=Math.min(50,n+1);
    var nav=document.createElement('nav');
    nav.id='mobileBottomNav';
    nav.className='mobileBottomNav';
    nav.innerHTML=''
      +'<a href="./minna-index.html?v='+VERSION+'"><span>⌂</span><b>首页</b></a>'
      +'<a href="./minna-lesson-v16.html?n='+prev+'&v='+VERSION+'&mode=preview"><span>‹</span><b>上一课</b></a>'
      +'<a class="active" href="./minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview"><span>第'+n+'课</span><b id="networkBadge">在线</b></a>'
      +'<a href="./minna-lesson-v16.html?n='+next+'&v='+VERSION+'&mode=preview"><span>›</span><b>下一课</b></a>';
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
    installBottomNav();
    prefetchNextLessons();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
