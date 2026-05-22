// Minna Path v1.8
(function(){
  var params = new URLSearchParams(location.search);
  var lesson = Number(params.get('lesson') || 1);
  var lang = localStorage.getItem('minna_ui_lang') || localStorage.getItem('minna_app_lang') || 'zh';
  var PROGRESS_KEY = 'minna.stage.progress.v1';
  var XP_KEY = 'minna.xp.v1';
  var STATE_KEY='minna.mobile.learning.state.v1';

  var DATA = {
    1:{zh:{unit:'第 1 阶段，第 1 部分',title:'名词句・自我介绍'},en:{unit:'Stage 1 · Part 1',title:'Noun sentences / self-introduction'}},
    2:{zh:{unit:'第 2 阶段',title:'这个是什么'},en:{unit:'Stage 2',title:'What is this?'}}
  };
  var STAGES = [
    {id:'vocab',icon:'あ',label:{zh:'词汇',en:'Vocabulary'}},
    {id:'grammar',icon:'⭐',label:{zh:'语法',en:'Grammar'}},
    {id:'examples',icon:'🎧',label:{zh:'例句',en:'Examples'}},
    {id:'review',icon:'🏆',label:{zh:'综合测试',en:'Review'},review:true}
  ];
  function t(v){return (v && (v[lang] || v.zh || v.en)) || '';}
  function readProgress(){try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')}catch(e){return {}}}
  function readXp(){try{return Number(localStorage.getItem(XP_KEY)||0)}catch(e){return 0}}
  function readStreak(){try{return Number((JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}).streak||1)}catch(e){return 1}}
  function key(id){return 'lesson'+lesson+'.'+id}
  function isDone(id){var p=readProgress();return !!(p[key(id)] && p[key(id)].ok)}
  function isUnlocked(i){if(i===0)return true;return isDone(STAGES[i-1].id)}
  function stageUrl(id){return './minna-stage.html?lesson='+lesson+'&stage='+id+'&v=1.8'}
  function node(stage,i){
    var done = isDone(stage.id), unlocked = isUnlocked(i), cls = ['pathNode'];
    if(stage.review) cls.push('review'); if(done) cls.push('done'); if(!unlocked) cls.push('locked'); if(unlocked && !done) cls.push('current');
    var href = unlocked ? stageUrl(stage.id) : '#';
    var icon = done ? '✓' : stage.icon;
    var lockText = !unlocked ? (lang==='en' ? 'Locked' : '未解锁') : '';
    return '<a class="'+cls.join(' ')+'" href="'+href+'"><div class="nodeInner">'+icon+'</div><div class="nodeLabel">'+t(stage.label)+(lockText?' · '+lockText:'')+'</div></a>';
  }
  function tabs(){return '<nav class="bottomTabs"><a href="./minna-app.html?v=21.6a"><span>🏠</span><b>学习</b></a><a href="#"><span>🧰</span><b>宝箱</b></a><a class="active" href="./minna-path.html?lesson='+lesson+'&v=1.8"><span>🌳</span><b>课程</b></a><a href="./minna-favorites.html"><span>💗</span><b>收藏</b></a><a href="./minna-app.html#me"><span>⋯</span><b>我的</b></a></nav>'}
  function render(){
    var info = DATA[lesson] || DATA[1];
    document.title = t(info.title) || 'Minna Path';
    document.getElementById('app').innerHTML = ''
      + '<header class="pathTop"><div class="topStats"><div>🇯🇵 115</div><div class="fire">🔥 '+readStreak()+'</div><div class="gem">💎 '+readXp()+'</div><div class="energy">⚡ 25</div></div><div class="unitCard"><h1>'+t(info.unit)+'<br>'+t(info.title)+'</h1></div></header>'
      + '<main class="pathWrap"><div class="pathColumn">'+node(STAGES[0],0)+'<div class="pathMascot">🦉</div>'+node(STAGES[1],1)+node(STAGES[2],2)+node(STAGES[3],3)+'</div></main>'
      + tabs();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render); else render();
})();