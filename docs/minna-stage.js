// Minna Stage v1.1
(function(){
  var params=new URLSearchParams(location.search);
  var lessonNo=Number(params.get('lesson')||1);
  var stage=params.get('stage')||'vocab';
  var lang=localStorage.getItem('minna_ui_lang')||'zh';
  var lesson=null;
  var current=null;

  var META={
    vocab:{icon:'あ',title:{zh:'词汇训练',en:'Vocabulary'},label:{zh:'选择正确意思',en:'Choose the correct meaning'}},
    grammar:{icon:'⭐',title:{zh:'语法训练',en:'Grammar'},label:{zh:'选择正确答案',en:'Choose the correct answer'}},
    examples:{icon:'🎧',title:{zh:'例句训练',en:'Examples'},label:{zh:'理解例句',en:'Understand the example'}},
    review:{icon:'🏆',title:{zh:'综合测试',en:'Review'},label:{zh:'综合测试',en:'Review test'}}
  };

  function pad(n){return String(n).padStart(2,'0')}
  function t(v){return (v&&v[lang])||v.zh||v.en||v.jp||''}
  function esc(s){return String(s||'').replace(/[&<>\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
  function shuffle(a){return a.slice().sort(function(){return Math.random()-0.5})}
  function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
  function sections(type){return (lesson.sections||[]).filter(function(s){return s.type===type})}

  function optionText(o){
    if(o.jp)return o.jp;
    if(o.text)return typeof o.text==='string'?o.text:t(o.text);
    return t(o);
  }

  async function loadLesson(){
    var url='./data/minna/lessons/lesson-'+pad(lessonNo)+'.json?v=1.1';
    var res=await fetch(url,{cache:'no-store'});
    if(!res.ok)throw new Error('Lesson JSON not found: '+url);
    lesson=await res.json();
  }

  function buildVocab(){
    var vocab=sections('vocab').flatMap(function(s){return s.items||[]});
    var item=pick(vocab);
    var options=shuffle([item].concat(shuffle(vocab.filter(function(v){return v.id!==item.id})).slice(0,3))).map(function(v){return {label:lang==='en'?(v.en||v.zh):(v.zh||v.en),ok:v.id===item.id}});
    return {title:META.vocab.title,icon:META.vocab.icon,desc:{zh:'「'+item.jp+'」是什么意思？',en:'What does '+item.jp+' mean?'},subtitle:item.kana||'',options:options};
  }

  function firstPracticeFrom(type){
    var all=[];
    sections(type).forEach(function(s){
      (s.items||[]).forEach(function(item){
        (item.practice||[]).forEach(function(p){all.push(p)});
      });
    });
    return pick(all);
  }

  function buildChoiceFromPractice(type,meta){
    var p=firstPracticeFrom(type);
    var options=(p.options||[]).map(function(o){return {label:optionText(o),ok:!!o.correct}});
    return {title:meta.title,icon:meta.icon,desc:p.question||meta.label,subtitle:'',options:shuffle(options)};
  }

  function buildExample(){
    var items=sections('examples').flatMap(function(s){return s.items||[]});
    var item=pick(items);
    var others=shuffle(items.filter(function(x){return x.id!==item.id})).slice(0,2);
    var options=shuffle([item].concat(others)).map(function(e){return {label:e.jp,ok:e.id===item.id}});
    return {title:META.examples.title,icon:META.examples.icon,desc:lang==='en'?(item.en||item.zh):(item.zh||item.en),subtitle:'',options:options};
  }

  function buildReview(){
    var qs=sections('quiz').flatMap(function(s){return s.items||[]});
    var q=pick(qs);
    var options=(q.options||[]).map(function(o){return {label:optionText(o),ok:!!o.correct}});
    return {title:META.review.title,icon:META.review.icon,desc:q.question||META.review.label,subtitle:'',options:shuffle(options)};
  }

  function buildStage(){
    if(stage==='vocab')return buildVocab();
    if(stage==='grammar')return buildChoiceFromPractice('grammar',META.grammar);
    if(stage==='examples')return buildExample();
    return buildReview();
  }

  function markDone(ok){
    try{
      var key='minna.stage.progress.v1';
      var p=JSON.parse(localStorage.getItem(key)||'{}');
      var id='lesson'+lessonNo+'.'+stage;
      p[id]={ok:ok,at:Date.now()};
      localStorage.setItem(key,JSON.stringify(p));
    }catch(e){}
  }

  function render(){
    var d=current;
    document.title=t(d.title)+' | Lesson '+lessonNo;
    document.getElementById('app').innerHTML=''
      +'<main class="stageScreen">'
      +'<div class="stageTop"><a href="./minna-path.html?lesson='+lessonNo+'&v=1.1">×</a><div class="progress"><i style="width:25%"></i></div></div>'
      +'<section class="stageTitle"><div style="font-size:80px">'+d.icon+'</div><h1>'+esc(t(d.title))+'</h1><p>'+esc(t(d.desc))+'</p><p>'+esc(d.subtitle||'')+'</p></section>'
      +'<section class="stageCard"><div class="badge">Lesson '+lessonNo+'</div><h2>'+(lang==='en'?'Choose an answer':'选择答案')+'</h2><div class="choiceGrid">'
      +d.options.map(function(o){return '<button class="choiceBtn" data-ok="'+(o.ok?'1':'0')+'">'+esc(o.label)+'</button>';}).join('')
      +'</div></section><button class="stageAction" id="nextBtn" style="display:none">'+(lang==='en'?'Back to path':'返回路径')+'</button></main>';
    document.querySelectorAll('.choiceBtn').forEach(function(btn){btn.onclick=function(){var ok=btn.dataset.ok==='1';btn.classList.add(ok?'right':'wrong');markDone(ok);document.querySelectorAll('.choiceBtn').forEach(function(b){b.disabled=true;if(b.dataset.ok==='1')b.classList.add('right')});document.getElementById('nextBtn').style.display='block';};});
    document.getElementById('nextBtn').onclick=function(){location.href='./minna-path.html?lesson='+lessonNo+'&v=1.1'};
  }

  async function start(){
    try{await loadLesson();current=buildStage();render();}
    catch(e){document.getElementById('app').innerHTML='<main class="stageScreen"><p>'+esc(e.message)+'</p></main>';}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
