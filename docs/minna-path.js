// Minna Path v1.0
(function(){
  var params=new URLSearchParams(location.search);
  var lesson=Number(params.get('lesson')||2);
  var lang=localStorage.getItem('minna_ui_lang')||'zh';

  var DATA={
    2:{
      zh:{unit:'第 1 阶段，第 1 部分',title:'这个是什么'},
      en:{unit:'Stage 1 · Part 1',title:'What is this?'}
    }
  };

  var STAGES=[
    {id:'vocab',icon:'あ',label:{zh:'词汇',en:'Vocabulary'},url:'./minna-lesson-v16.html?n=2&mode=preview'},
    {id:'grammar',icon:'⭐',label:{zh:'语法',en:'Grammar'},url:'./minna-lesson-v16.html?n=2&mode=preview'},
    {id:'examples',icon:'🎧',label:{zh:'例句',en:'Examples'},url:'./minna-lesson-v16.html?n=2&mode=preview'},
    {id:'review',icon:'🏆',label:{zh:'综合测试',en:'Review'},url:'./minna-lesson-v16.html?n=2&mode=preview',review:true}
  ];

  function t(v){return (v&&v[lang])||v.zh||''}

  function node(stage,i){
    return '<a class="pathNode '+(stage.review?'review':'')+'" href="'+stage.url+'"><div class="nodeInner">'+stage.icon+'</div><div class="nodeLabel">'+t(stage.label)+'</div></a>';
  }

  function render(){
    var info=DATA[lesson]||DATA[2];
    document.title=t(info).title||'Minna Path';

    document.getElementById('app').innerHTML=''
      +'<header class="pathTop">'
      +'<div class="topStats">'
      +'<div>🔥 1</div>'
      +'<div>💎 814</div>'
      +'<div>⚡ 25</div>'
      +'</div>'
      +'<div class="unitCard">'
      +'<h1>'+t(info).unit+'<br>'+t(info).title+'</h1>'
      +'</div>'
      +'</header>'
      +'<main class="pathWrap">'
      +'<div class="pathColumn">'
      +node(STAGES[0],0)
      +'<div class="pathMascot">🦉</div>'
      +node(STAGES[1],1)
      +node(STAGES[2],2)
      +node(STAGES[3],3)
      +'</div>'
      +'</main>'
      +'<nav class="bottomTabs">'
      +'<a class="active" href="./minna-app.html"><span>🏠</span><b>'+(lang==='en'?'Learn':'学习')+'</b></a>'
      +'<a href="./minna-favorites.html"><span>⭐</span><b>'+(lang==='en'?'Saved':'收藏')+'</b></a>'
      +'<a href="./minna-index.html"><span>📚</span><b>'+(lang==='en'?'Lessons':'课程')+'</b></a>'
      +'<a href="./minna-app.html#me"><span>👤</span><b>'+(lang==='en'?'Me':'我的')+'</b></a>'
      +'</nav>';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
  else render();
})();
