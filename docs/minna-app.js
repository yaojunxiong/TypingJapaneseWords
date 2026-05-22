// Minna App Home v21.1
(function(){
  var VERSION='21.1';
  var STATE_KEY='minna.mobile.learning.state.v1';
  var LANG_KEY='minna_app_lang';

  var copy={
    brand:{zh:'みんなの日本語',en:'Minna no Nihongo'},
    streak:{zh:'连续学习 {n} 天',en:'{n}-day streak'},
    continueTitle:{zh:'继续学习 第 {n} 课',en:'Continue Lesson {n}'},
    continueDesc:{zh:'像 Duolingo 一样，用互动方式学习《みんなの日本語》。',en:'Learn Minna no Nihongo with clean, interactive practice.'},
    continueBtn:{zh:'继续学习',en:'Continue'},
    path:{zh:'学习路径',en:'Learning Path'},
    status:{zh:'学习状态',en:'Learning Status'},
    lesson:{zh:'第 {n} 课',en:'Lesson {n}'},
    tabLearn:{zh:'学习',en:'Learn'},
    tabFav:{zh:'收藏',en:'Saved'},
    tabLessons:{zh:'课程',en:'Lessons'},
    tabMe:{zh:'我的',en:'Me'},
    streakLabel:{zh:'连续学习天数',en:'Streak'},
    currentLesson:{zh:'当前课程',en:'Current Lesson'}
  };

  var lessons={
    1:{zh:['自我介绍','名词句 · 初次见面'],en:['Self-introduction','Noun sentences · Greetings']},
    2:{zh:['这个是什么','指示代词 · 基础问答'],en:['What is this?','Demonstratives · Basic Q&A']},
    3:{zh:['这里是哪里','场所 · 存在句'],en:['Where is here?','Places · Existence']},
    4:{zh:['时间表达','几点 · 星期 · 日期'],en:['Time expressions','Time · Weekdays · Dates']},
    5:{zh:['移动与交通','去哪里 · 来哪里'],en:['Movement and transport','Go · Come · Transport']}
  };

  function lang(){return localStorage.getItem(LANG_KEY)||localStorage.getItem('minna_ui_lang')||'zh'}
  function setLang(v){localStorage.setItem(LANG_KEY,v);localStorage.setItem('minna_ui_lang',v);render()}
  function t(key,vars){
    var v=(copy[key]&&copy[key][lang()])||'';
    Object.keys(vars||{}).forEach(function(k){v=v.replace('{'+k+'}',vars[k])});
    return v;
  }
  function lessonText(n,i){return (lessons[n]&&lessons[n][lang()]&&lessons[n][lang()][i])||''}

  function readState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}
    catch(e){return {}}
  }

  function lessonUrl(n){return './minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview'}

  function langToggle(){
    return '<div class="langSwitch"><button class="'+(lang()==='zh'?'active':'')+'" data-lang="zh">中文</button><button class="'+(lang()==='en'?'active':'')+'" data-lang="en">EN</button></div>';
  }

  function node(n,locked){
    return ''
      +'<div class="pathNode">'
      +'<a class="pathCircle '+(locked?'locked':'')+'" href="'+(locked?'#':lessonUrl(n))+'">'
      +'<small>LESSON</small>'
      +'<strong>'+n+'</strong>'
      +'</a>'
      +'<div class="pathInfo">'
      +'<h3>'+lessonText(n,0)+'</h3>'
      +'<p>'+lessonText(n,1)+'</p>'
      +'</div>'
      +'</div>';
  }

  function render(){
    var state=readState();
    var current=Math.max(1,Number(state.lastLesson||2));
    document.documentElement.lang=lang()==='en'?'en':'zh-CN';
    document.title=(lang()==='en'?'Minna App | Minna no Nihongo':'Minna App | みんなの日本語');

    document.getElementById('app').innerHTML=''
      +'<header class="appTop">'
      +'<div class="appBrandRow"><div class="appBrand">'+t('brand')+'</div>'+langToggle()+'</div>'
      +'<div class="appStatus">'
      +'<div class="appAvatar">日</div>'
      +'<div class="appProgress"><i style="width:'+(current*2)+'%"></i></div>'
      +'</div>'
      +'</header>'
      +'<main class="appWrap">'
      +'<section class="continueCard">'
      +'<div>🔥 '+t('streak',{n:Number(state.streak||1)})+'</div>'
      +'<h1>'+t('continueTitle',{n:current})+'</h1>'
      +'<p>'+t('continueDesc')+'</p>'
      +'<a class="continueBtn" href="'+lessonUrl(current)+'">'+t('continueBtn')+'</a>'
      +'</section>'
      +'<section><h2 class="sectionTitle">'+t('path')+'</h2><div class="path">'
      +node(1,false)+'<div class="pathLine"></div>'
      +node(2,false)+'<div class="pathLine"></div>'
      +node(3,false)+'<div class="pathLine"></div>'
      +node(4,current<4)+'<div class="pathLine"></div>'
      +node(5,current<5)
      +'</div></section>'
      +'<section><h2 class="sectionTitle">'+t('status')+'</h2><div class="statsGrid">'
      +'<div class="statCard"><b>'+Number(state.streak||1)+'</b><span>'+t('streakLabel')+'</span></div>'
      +'<div class="statCard"><b>'+current+'</b><span>'+t('currentLesson')+'</span></div>'
      +'</div></section>'
      +'</main>'
      +'<nav class="bottomTabs">'
      +'<a class="active" href="./minna-app.html"><span>🏠</span><b>'+t('tabLearn')+'</b></a>'
      +'<a href="./minna-favorites.html"><span>⭐</span><b>'+t('tabFav')+'</b></a>'
      +'<a href="./minna-index.html"><span>📚</span><b>'+t('tabLessons')+'</b></a>'
      +'<a href="#"><span>👤</span><b>'+t('tabMe')+'</b></a>'
      +'</nav>';

    document.querySelectorAll('[data-lang]').forEach(function(btn){btn.onclick=function(){setLang(btn.dataset.lang)}});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
  else render();
})();
