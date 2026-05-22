// Minna Stage v1.0
(function(){
  var params=new URLSearchParams(location.search);
  var stage=params.get('stage')||'vocab';
  var lang=localStorage.getItem('minna_ui_lang')||'zh';

  var DATA={
    vocab:{
      icon:'あ',
      title:{zh:'词汇训练',en:'Vocabulary'},
      desc:{zh:'选择「わたし」的正确意思',en:'Choose the correct meaning of わたし'},
      options:[
        {zh:'我',en:'I / me',ok:true},
        {zh:'你',en:'you'},
        {zh:'老师',en:'teacher'}
      ]
    },
    grammar:{
      icon:'⭐',
      title:{zh:'语法训练',en:'Grammar'},
      desc:{zh:'A は B です 表示什么？',en:'What does A は B です mean?'},
      options:[
        {zh:'A 是 B',en:'A is B',ok:true},
        {zh:'A 不是 B',en:'A is not B'},
        {zh:'A 去 B',en:'A goes to B'}
      ]
    },
    examples:{
      icon:'🎧',
      title:{zh:'例句训练',en:'Examples'},
      desc:{zh:'选择正确句子',en:'Choose the correct sentence'},
      options:[
        {jp:'わたしは 学生です。',ok:true},
        {jp:'わたしを 学生です。'},
        {jp:'わたしが 学生です。'}
      ]
    },
    review:{
      icon:'🏆',
      title:{zh:'综合测试',en:'Review'},
      desc:{zh:'完成第一课 Boss Review',en:'Complete the Lesson 1 boss review'},
      options:[
        {zh:'开始测试',en:'Start Review',ok:true},
        {zh:'返回',en:'Back'}
      ]
    }
  };

  function t(v){return (v&&v[lang])||v.zh||v.en||''}

  function render(){
    var d=DATA[stage]||DATA.vocab;

    document.getElementById('app').innerHTML=''
      +'<main class="stageScreen">'
      +'<div class="stageTop">'
      +'<a href="./minna-path.html?lesson=1">×</a>'
      +'<div class="progress"><i style="width:25%"></i></div>'
      +'</div>'
      +'<section class="stageTitle">'
      +'<div style="font-size:80px">'+d.icon+'</div>'
      +'<h1>'+t(d.title)+'</h1>'
      +'<p>'+t(d.desc)+'</p>'
      +'</section>'
      +'<section class="stageCard">'
      +'<div class="badge">Lesson 1</div>'
      +'<h2>'+(lang==='en'?'Choose an answer':'选择答案')+'</h2>'
      +'<div class="choiceGrid">'
      +d.options.map(function(o,i){
        return '<button class="choiceBtn" data-ok="'+(o.ok?'1':'0')+'">'+(o.jp||t(o))+'</button>';
      }).join('')
      +'</div>'
      +'</section>'
      +'</main>';

    document.querySelectorAll('.choiceBtn').forEach(function(btn){
      btn.onclick=function(){
        var ok=btn.dataset.ok==='1';
        btn.classList.add(ok?'right':'wrong');
      };
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);
  else render();
})();
