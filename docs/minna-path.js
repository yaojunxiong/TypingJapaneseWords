// Minna Path v1.10 crowns
(function(){
  var store = window.MinnaStore;
  var roleState={bypassLessonLock:false};
  var authMeta={email:'',role:'normal'};
  var params = new URLSearchParams(location.search);
  var lesson = Number(params.get('lesson') || 1);
  var lang = store.readLang();
  var VERSION = window.MINNA_VERSION || '22.1';

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
  function readProgress(){return store.readProgress()}
  function readCrowns(){return store.readCrowns()}
  function readXp(){return store.readXp()}
  function readStreak(){return Number((store.readState()||{}).streak||1)}
  function key(id){return 'lesson'+lesson+'.'+id}
  function isDone(id){var p=readProgress(), c=readCrowns();return !!((p[key(id)] && p[key(id)].ok) || c[key(id)])}
  function hasCrown(id){var c=readCrowns();return !!c[key(id)]}
  function crownCount(){return STAGES.filter(function(s){return hasCrown(s.id)}).length}
  function isUnlocked(i){if(roleState.bypassLessonLock)return true;if(i===0)return true;return isDone(STAGES[i-1].id)}
  function stageUrl(id){return './minna-stage.html?lesson='+lesson+'&stage='+id+'&v=1.17'}
  function authBadge(){
    var email=authMeta.email||'未登录';
    var role=authMeta.role||'normal';
    var lock=roleState.bypassLessonLock?(lang==='en'?'All Open':'全课开放'):(lang==='en'?'Sequential':'顺序解锁');
    return '<div class="unitMeta"><span class="badge2">账号：'+email+'</span><span class="badge2">角色：'+role+'</span><span class="badge2">'+lock+'</span></div>';
  }
  function node(stage,i){
    var done = isDone(stage.id), crown = hasCrown(stage.id), unlocked = isUnlocked(i), cls = ['pathNode'];
    if(stage.review) cls.push('review'); if(done) cls.push('done'); if(crown) cls.push('crowned'); if(!unlocked) cls.push('locked'); if(unlocked && !done) cls.push('current');
    var href = unlocked ? stageUrl(stage.id) : '#';
    var icon = crown ? '👑' : (done ? '✓' : stage.icon);
    var lockText = !unlocked ? (lang==='en' ? 'Locked' : '未解锁') : '';
    var crownText = crown ? ' · 👑' : '';
    return '<a class="'+cls.join(' ')+'" href="'+href+'"><div class="nodeInner">'+icon+'</div><div class="nodeLabel">'+t(stage.label)+crownText+(lockText?' · '+lockText:'')+'</div></a>';
  }
  function tabs(){return '<nav class="bottomTabs"><a href="./minna-app.html?v='+VERSION+'"><span>🏠</span><b>学习</b></a><a href="./minna-toolbox.html?v='+VERSION+'"><span>🧰</span><b>宝箱</b></a><a class="active" href="./minna-path.html?lesson='+lesson+'&v='+VERSION+'"><span>🌳</span><b>课程</b></a><a href="./minna-favorites.html?v='+VERSION+'"><span>💗</span><b>收藏</b></a><a href="./minna-app.html?v='+VERSION+'#me"><span>⋯</span><b>我的</b></a></nav>'}
  function render(){
    var info = DATA[lesson] || DATA[1];
    var crowns = crownCount();
    document.title = t(info.title) || 'Minna Path';
    document.getElementById('app').innerHTML = ''
      + '<header class="pathTop"><div class="topStats"><div>🇯🇵 115</div><div class="fire">🔥 '+readStreak()+'</div><div class="gem">💎 '+readXp()+'</div><div class="energy">⚡ 25</div></div><div class="unitCard"><div class="unitCrown">👑 '+crowns+'/4</div><h1>'+t(info.unit)+'<br>'+t(info.title)+'</h1>'+authBadge()+'<div class="unitMeter"><i style="width:'+(crowns*25)+'%"></i></div></div></header>'
      + '<main class="pathWrap"><div class="pathColumn">'+node(STAGES[0],0)+'<div class="pathMascot">🦉</div>'+node(STAGES[1],1)+node(STAGES[2],2)+node(STAGES[3],3)+'</div></main>'
      + tabs();
  }
  async function hydrateRole(){
    if(!window.MinnaAuth||!window.MinnaAuth.loadRole)return;
    try{
      if(window.MinnaAuth.init)await window.MinnaAuth.init({lessonId:'minna_path_'+lesson});
      roleState=await window.MinnaAuth.loadRole(true)||roleState;
      var u=window.MinnaAuth.getUser?window.MinnaAuth.getUser():null;
      authMeta.email=u&&u.email?u.email:'未登录';
      authMeta.role=roleState&&roleState.effectiveRole?roleState.effectiveRole:'normal';
    }catch(e){}
    render();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){render();hydrateRole()}); else {render();hydrateRole()}
})();
