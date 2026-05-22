// Minna App Home v21.0
(function(){
  var VERSION='21.0';
  var STATE_KEY='minna.mobile.learning.state.v1';

  function readState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}
    catch(e){return {}}
  }

  function lessonUrl(n){
    return './minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview';
  }

  function node(n,title,desc,locked){
    return ''
      +'<div class="pathNode">'
      +'<a class="pathCircle '+(locked?'locked':'')+'" href="'+(locked?'#':lessonUrl(n))+'">'
      +'<small>LESSON</small>'
      +'<strong>'+n+'</strong>'
      +'</a>'
      +'<div class="pathInfo">'
      +'<h3>'+title+'</h3>'
      +'<p>'+desc+'</p>'
      +'</div>'
      +'</div>';
  }

  function render(){
    var state=readState();
    var current=Math.max(1,Number(state.lastLesson||2));

    document.getElementById('app').innerHTML=''
      +'<header class="appTop">'
      +'<div class="appBrand">みんなの日本語</div>'
      +'<div class="appStatus">'
      +'<div class="appAvatar">日</div>'
      +'<div class="appProgress"><i style="width:'+(current*2)+'%"></i></div>'
      +'</div>'
      +'</header>'
      +'<main class="appWrap">'
      +'<section class="continueCard">'
      +'<div>🔥 连续学习 '+Number(state.streak||1)+' 天</div>'
      +'<h1>继续学习 第 '+current+' 课</h1>'
      +'<p>像 Duolingo 一样，用互动方式学习《みんなの日本語》。</p>'
      +'<a class="continueBtn" href="'+lessonUrl(current)+'">继续学习</a>'
      +'</section>'

      +'<section>'
      +'<h2 class="sectionTitle">学习路径</h2>'
      +'<div class="path">'
      +node(1,'自我介绍','名词句 · 初次见面',false)
      +'<div class="pathLine"></div>'
      +node(2,'这个是什么','指示代词 · 基础问答',false)
      +'<div class="pathLine"></div>'
      +node(3,'这里是哪里','场所 · 存在句',false)
      +'<div class="pathLine"></div>'
      +node(4,'时间表达','几点 · 星期 · 日期',current<4)
      +'<div class="pathLine"></div>'
      +node(5,'移动与交通','去哪里 · 来哪里',current<5)
      +'</div>'
      +'</section>'

      +'<section>'
      +'<h2 class="sectionTitle">学习状态</h2>'
      +'<div class="statsGrid">'
      +'<div class="statCard"><b>'+Number(state.streak||1)+'</b><span>连续学习天数</span></div>'
      +'<div class="statCard"><b>'+current+'</b><span>当前课程</span></div>'
      +'</div>'
      +'</section>'
      +'</main>'

      +'<nav class="bottomTabs">'
      +'<a class="active" href="./minna-app.html"><span>🏠</span><b>学习</b></a>'
      +'<a href="./minna-favorites.html"><span>⭐</span><b>收藏</b></a>'
      +'<a href="./minna-index.html"><span>📚</span><b>课程</b></a>'
      +'<a href="#"><span>👤</span><b>我的</b></a>'
      +'</nav>';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
  else render();
})();
