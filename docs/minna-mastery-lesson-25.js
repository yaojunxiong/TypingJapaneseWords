// Minna Mastery Lesson 25
// Content-only data file. The shared player reads this file and renders Lesson 25 mastery training.
(function(){
  window.MinnaMasteryLessons = window.MinnaMasteryLessons || {};
  window.MinnaMasteryLessons[25] = {
    lesson: 25,
    title: '第25课 Mastery',
    masteryRule: {
      vocab: 100,
      grammar: 80,
      examples: 80,
      final: 80,
      wrong: 0
    },
    vocab: [
      ['考えます','考虑/想'],
      ['着きます','到达'],
      ['留学します','留学'],
      ['取ります','上年纪/取得'],
      ['田舎','乡下/故乡'],
      ['大使館','大使馆'],
      ['グループ','小组'],
      ['チャンス','机会'],
      ['億','亿'],
      ['もし','如果'],
      ['いくら','无论多么/多少钱'],
      ['転勤','调职'],
      ['こと','事情'],
      ['一杯飲みましょう','喝一杯吧'],
      ['いろいろお世話になりました','承蒙您多方照顾'],
      ['頑張ります','努力'],
      ['どうぞお元気で','请保重'],
      ['時間があったら','如果有时间的话'],
      ['雨が降ったら','如果下雨的话'],
      ['安かったら','如果便宜的话'],
      ['暇だったら','如果有空的话'],
      ['学生だったら','如果是学生的话'],
      ['大阪に着いたら','到了大阪以后'],
      ['仕事が終わったら','工作结束以后'],
      ['お金があったら','如果有钱的话'],
      ['駅に着いたら電話します','到车站后打电话'],
      ['寒くても行きます','即使冷也去'],
      ['高くても買います','即使贵也买'],
      ['忙しくても勉強します','即使忙也学习'],
      ['雨でも行きます','即使下雨也去'],
      ['便利でも買いません','即使方便也不买'],
      ['日曜日でも働きます','即使星期天也工作'],
      ['もし暇だったら来てください','如果有空请来'],
      ['いくら高くても買います','无论多贵也买'],
      ['いくら考えてもわかりません','怎么想也不明白'],
      ['年を取ったら田舎に住みたいです','上年纪后想住乡下'],
      ['留学したら日本語をたくさん話します','留学后多说日语'],
      ['チャンスがあったら行きたいです','有机会的话想去']
    ],
    grammar: [
      { q:'「時間があったら、映画を見ます」是什么意思？', opts:['如果有时间，就看电影','有时间也不看电影','看电影的时候有时间'], a:0, tip:'た形 + ら = 如果……的话。' },
      { q:'「雨が降ったら、行きません」是什么意思？', opts:['如果下雨，就不去','即使下雨也去','下雨的时候已经去了'], a:0, tip:'降ったら = 如果下雨的话。' },
      { q:'「駅に着いたら、電話してください」是什么意思？', opts:['到了车站后，请打电话','如果打电话就到车站','车站打电话了'], a:0, tip:'〜たら也可表示“……之后”。' },
      { q:'「仕事が終わったら、飲みに行きます」是什么意思？', opts:['工作结束后去喝酒','即使工作结束也不去','工作结束前去喝酒'], a:0, tip:'动作完成后：終わったら。' },
      { q:'「安かったら、買います」是什么意思？', opts:['如果便宜就买','即使便宜也买','便宜所以已经买了'], a:0, tip:'い形容词过去形 + ら：安かったら。' },
      { q:'「暇だったら、手伝ってください」是什么意思？', opts:['如果有空，请帮忙','即使有空也帮忙','有空的时候已经帮了'], a:0, tip:'な形容词/名词：だったら。' },
      { q:'「学生だったら、安くなります」是什么意思？', opts:['如果是学生，就会便宜','学生很便宜','即使是学生也贵'], a:0, tip:'名词 + だったら。' },
      { q:'「寒くても、行きます」是什么意思？', opts:['即使冷也去','如果冷就去','冷了以后去'], a:0, tip:'い形容词 くても = 即使……也。' },
      { q:'「高くても、買います」是什么意思？', opts:['即使贵也买','如果贵就买','贵了以后买'], a:0, tip:'高い → 高くても。' },
      { q:'「忙しくても、勉強します」是什么意思？', opts:['即使忙也学习','如果忙就学习','忙了以后学习'], a:0, tip:'忙しい → 忙しくても。' },
      { q:'「雨でも、行きます」是什么意思？', opts:['即使下雨也去','如果下雨就去','下雨后才去'], a:0, tip:'名词/な形容词 + でも。' },
      { q:'「便利でも、買いません」是什么意思？', opts:['即使方便也不买','如果方便就不买','方便了以后不买'], a:0, tip:'な形容词 + でも。' },
      { q:'「いくら考えても、わかりません」是什么意思？', opts:['怎么想也不明白','如果想就明白','想完以后明白'], a:0, tip:'いくら〜ても = 无论怎么……也。' },
      { q:'「もし暇だったら、来てください」是什么意思？', opts:['如果有空，请来','即使有空也来','来之后有空'], a:0, tip:'もし常和〜たら搭配，表示假设。' },
      { q:'「年を取ったら、田舎に住みたいです」是什么意思？', opts:['上年纪后想住乡下','即使上年纪也住乡下','乡下上年纪了'], a:0, tip:'年を取ったら = 上年纪后。' },
      { q:'「チャンスがあったら、留学したいです」是什么意思？', opts:['有机会的话想留学','即使有机会也不留学','留学后有机会'], a:0, tip:'条件 + 愿望。' }
    ],
    examples: [
      { jp:'時間が あったら、映画を 見ます。', cn:'如果有时间，就看电影。', parts:['時間があったら、','映画を','見ます。'] },
      { jp:'雨が 降ったら、行きません。', cn:'如果下雨，就不去。', parts:['雨が降ったら、','行きません。'] },
      { jp:'駅に 着いたら、電話してください。', cn:'到了车站后，请打电话。', parts:['駅に着いたら、','電話してください。'] },
      { jp:'仕事が 終わったら、飲みに 行きます。', cn:'工作结束后，去喝酒。', parts:['仕事が終わったら、','飲みに','行きます。'] },
      { jp:'安かったら、買います。', cn:'如果便宜，就买。', parts:['安かったら、','買います。'] },
      { jp:'暇だったら、手伝ってください。', cn:'如果有空，请帮忙。', parts:['暇だったら、','手伝ってください。'] },
      { jp:'学生だったら、安くなります。', cn:'如果是学生，会变便宜。', parts:['学生だったら、','安くなります。'] },
      { jp:'寒くても、行きます。', cn:'即使冷，也去。', parts:['寒くても、','行きます。'] },
      { jp:'高くても、買います。', cn:'即使贵，也买。', parts:['高くても、','買います。'] },
      { jp:'忙しくても、日本語を 勉強します。', cn:'即使忙，也学习日语。', parts:['忙しくても、','日本語を','勉強します。'] },
      { jp:'雨でも、サッカーを します。', cn:'即使下雨，也踢足球。', parts:['雨でも、','サッカーを','します。'] },
      { jp:'便利でも、買いません。', cn:'即使方便，也不买。', parts:['便利でも、','買いません。'] },
      { jp:'いくら 考えても、わかりません。', cn:'怎么想也不明白。', parts:['いくら','考えても、','わかりません。'] },
      { jp:'もし 暇だったら、遊びに 来てください。', cn:'如果有空，请来玩。', parts:['もし','暇だったら、','遊びに','来てください。'] },
      { jp:'チャンスが あったら、留学したいです。', cn:'如果有机会，想留学。', parts:['チャンスがあったら、','留学したいです。'] },
      { jp:'年を 取ったら、田舎に 住みたいです。', cn:'上年纪后，想住乡下。', parts:['年を取ったら、','田舎に','住みたいです。'] }
    ],
    final: [
      { q:'「〜たら」常表示？', opts:['如果……的话 / ……之后','即使……也','为了……'], a:0 },
      { q:'“如果有时间就看电影”应说？', opts:['時間があったら、映画を見ます。','時間があっても、映画を見ます。','時間があるとき映画です。'], a:0 },
      { q:'“如果下雨就不去”应说？', opts:['雨が降ったら、行きません。','雨でも、行きません。','雨が降る人です。'], a:0 },
      { q:'“到了车站后请打电话”应说？', opts:['駅に着いたら、電話してください。','駅に着いても、電話してください。','駅に着く人は電話です。'], a:0 },
      { q:'「安かったら」是什么意思？', opts:['如果便宜的话','即使便宜也','便宜的时候的人'], a:0 },
      { q:'「暇だったら」是什么意思？', opts:['如果有空的话','即使有空也','有空的人'], a:0 },
      { q:'「学生だったら」是什么意思？', opts:['如果是学生的话','即使是学生也','学生的时候'], a:0 },
      { q:'「〜ても」常表示？', opts:['即使……也……','如果……的话','……之后'], a:0 },
      { q:'“即使冷也去”应说？', opts:['寒くても、行きます。','寒かったら、行きます。','寒いとき、行きます。'], a:0 },
      { q:'“即使贵也买”应说？', opts:['高くても、買います。','高かったら、買います。','高い人を買います。'], a:0 },
      { q:'“即使忙也学习”应说？', opts:['忙しくても、勉強します。','忙しかったら、勉強します。','忙しいと、勉強したいです。'], a:0 },
      { q:'“即使下雨也去”应说？', opts:['雨でも、行きます。','雨だったら、行きます。','雨とき行きます。'], a:0 },
      { q:'「いくら考えても、わかりません」是什么意思？', opts:['怎么想也不明白','如果想就明白','想完以后明白'], a:0 },
      { q:'「もし」常和哪个表达搭配？', opts:['〜たら','〜ても','〜てください'], a:0 },
      { q:'“有机会的话想留学”应说？', opts:['チャンスがあったら、留学したいです。','チャンスがあっても、留学しました。','チャンスのとき留学です。'], a:0 },
      { q:'完整假设场景自然顺序是？', opts:['もし暇だったら、遊びに来てください→時間があったら、映画を見ます','荷物を持ってくれてありがとう→どういたしまして','ボタンを押すと機械が動きます→春になると暖かくなります'], a:0 },
      { q:'完整让步场景自然顺序是？', opts:['高くても買います→忙しくても勉強します→いくら考えてもわかりません','赤いセーターを着ている人→家賃が安い部屋','友達が本をくれました→私が弟に本をあげました'], a:0 }
    ]
  };
})();

// Lesson 25 completion page enhancer
// Kept in the lesson file so later lessons can be maintained independently from the global auth module.
(function(){
  var cfg = {
    no: '25',
    lessonId: 'minna_lesson_25',
    title: '第25课掌握完成！',
    next: '初级前半册 1–25课 总复习 / 综合测试',
    nextUrl: './minna-index.html?v=15.0-lesson25-complete',
    reviewLabel: '继续复习第25课',
    chips: ['〜たら','〜ても','条件表达','假设表达','完成后表达','即使……也……','いくら〜ても','もし〜たら','综合条件场景','错题清零']
  };
  function readState(){
    var candidates = ['lesson25v8','lesson25v7','lesson25v6','lesson25v5'];
    for(var i=0;i<candidates.length;i++){
      try{
        var raw = localStorage.getItem(candidates[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return null;
  }
  function isPassed(s){
    if(!s) return false;
    var m = s.mastery || {};
    var wrongCount = s.wrong_count != null ? Number(s.wrong_count) : Object.keys(s.wrong || {}).filter(function(k){ return s.wrong[k]; }).length;
    return !!s.mastery_passed || ((m.vocab||0) >= 100 && (m.grammar||0) >= 80 && (m.examples||0) >= 80 && (m.final||0) >= 80 && wrongCount === 0);
  }
  function showCompletion(){
    var lessonId = window.MinnaAuth && window.MinnaAuth.getLessonId ? window.MinnaAuth.getLessonId() : '';
    if(lessonId && lessonId !== cfg.lessonId) return;
    var stage = document.getElementById('stage');
    var cardId = 'lesson25CompletionCard';
    if(!stage || document.getElementById(cardId)) return;
    var s = readState();
    if(!isPassed(s)) return;
    var m = s.mastery || {};
    var chips = cfg.chips.map(function(x){ return '<span class="pill">✅ ' + x + '</span>'; }).join('');
    var card = document.createElement('div');
    card.id = cardId;
    card.className = 'successBox';
    card.innerHTML = '<h2>🎉 '+cfg.title+'</h2>'+
      '<p>你已经完成本课 Mastery，也完成了初级前半册第1–25课第一轮闭环。</p>'+
      '<div class="meter">'+
      '<div><b>'+Math.round(m.vocab||100)+'%</b><span>核心词汇</span></div>'+
      '<div><b>'+Math.round(m.grammar||80)+'%</b><span>语法/句型</span></div>'+
      '<div><b>'+Math.round(m.examples||80)+'%</b><span>核心例句</span></div>'+
      '<div><b>'+Math.round(m.final||80)+'%</b><span>综合测试</span></div>'+
      '</div>'+
      '<p>'+chips+'</p>'+
      '<p><b>下一步：</b>'+cfg.next+'</p>'+
      '<p><a class="btn primary" href="'+cfg.nextUrl+'" target="_top">回首页查看1–25课进度</a><button class="light" id="continueReview25">'+cfg.reviewLabel+'</button></p>';
    stage.insertBefore(card, stage.firstChild);
    var btn = document.getElementById('continueReview25');
    if(btn) btn.onclick = function(){ card.remove(); };
  }
  function start(){
    if(document.body){
      var observer = new MutationObserver(function(){ showCompletion(); });
      observer.observe(document.body, { childList:true, subtree:true });
      setInterval(showCompletion, 1500);
      showCompletion();
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();