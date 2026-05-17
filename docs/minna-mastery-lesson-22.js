// Minna Mastery Lesson 22
// Content-only data file. The shared player reads this file and renders Lesson 22 mastery training.
(function(){
  window.MinnaMasteryLessons = window.MinnaMasteryLessons || {};
  window.MinnaMasteryLessons[22] = {
    lesson: 22,
    title: '第22课 Mastery',
    masteryRule: {
      vocab: 100,
      grammar: 80,
      examples: 80,
      final: 80,
      wrong: 0
    },
    vocab: [
      ['着ます','穿，上半身衣服'],
      ['履きます','穿，鞋/裤子'],
      ['かぶります','戴，帽子'],
      ['かけます','戴，眼镜'],
      ['生まれます','出生'],
      ['コート','大衣'],
      ['スーツ','西装'],
      ['セーター','毛衣'],
      ['帽子','帽子'],
      ['眼鏡','眼镜'],
      ['こちら','这位/这边，礼貌说法'],
      ['家賃','房租'],
      ['うーん','嗯……'],
      ['ダイニングキッチン','餐厅厨房'],
      ['和室','日式房间'],
      ['押し入れ','壁橱'],
      ['布団','被褥'],
      ['アパート','公寓'],
      ['部屋','房间'],
      ['所','地方'],
      ['物','东西'],
      ['人','人'],
      ['よく','经常/很好地'],
      ['おめでとうございます','恭喜'],
      ['赤い服','红色衣服'],
      ['黒い靴','黑色鞋子'],
      ['白い帽子','白色帽子'],
      ['眼鏡をかけている人','戴眼镜的人'],
      ['帽子をかぶっている人','戴帽子的人'],
      ['赤いセーターを着ている人','穿红毛衣的人'],
      ['昨日買った本','昨天买的书'],
      ['友達にもらった時計','朋友送给我的表'],
      ['私が住んでいる所','我住的地方'],
      ['ミラーさんが作ったケーキ','米勒先生做的蛋糕'],
      ['母が生まれた所','妈妈出生的地方'],
      ['日本語を勉強している人','正在学习日语的人'],
      ['駅の近くにあるアパート','在车站附近的公寓'],
      ['家賃が安い部屋','房租便宜的房间']
    ],
    grammar: [
      { q:'名词修饰时，动词要用什么形？', opts:['普通形','ます形','てください'], a:0, tip:'第22课核心：普通形 + 名词。例：私が買った本。' },
      { q:'「これはミラーさんが作ったケーキです」是什么意思？', opts:['这是米勒先生做的蛋糕','米勒先生正在做蛋糕','请米勒先生做蛋糕'], a:0, tip:'作ったケーキ = 做过的蛋糕。' },
      { q:'「私が昨日買った本」是什么意思？', opts:['我昨天买的书','我昨天看的书','我明天买的书'], a:0, tip:'昨日買った + 本 = 昨天买的书。' },
      { q:'「日本語を勉強している人」是什么意思？', opts:['正在学习日语的人','学习过日语的人','不会日语的人'], a:0, tip:'〜ている人 = 正在/持续做……的人。' },
      { q:'「眼鏡をかけている人」是什么意思？', opts:['戴眼镜的人','买眼镜的人','摘眼镜的人'], a:0, tip:'眼鏡をかけています = 戴着眼镜。' },
      { q:'「帽子をかぶっている人」是什么意思？', opts:['戴帽子的人','买帽子的人','脱帽子的人'], a:0, tip:'帽子をかぶっています = 戴着帽子。' },
      { q:'「赤いセーターを着ている人」是什么意思？', opts:['穿红毛衣的人','买红毛衣的人','红毛衣很贵'], a:0, tip:'着ている人 = 穿着的人。' },
      { q:'「私が住んでいる所」是什么意思？', opts:['我住的地方','我想住的地方','我不住的地方'], a:0, tip:'住んでいる所 = 住着的地方。' },
      { q:'「母が生まれた所」是什么意思？', opts:['妈妈出生的地方','妈妈住的地方','妈妈去的地方'], a:0, tip:'生まれた所 = 出生的地方。' },
      { q:'「駅の近くにあるアパート」是什么意思？', opts:['在车站附近的公寓','去车站的公寓','车站里的房租'], a:0, tip:'あるアパート = 有/位于那里的公寓。' },
      { q:'「家賃が安い部屋」是什么意思？', opts:['房租便宜的房间','房租很贵的房间','房租在哪里'], a:0, tip:'い形容词可直接修饰名词。' },
      { q:'「静かな部屋」是什么意思？', opts:['安静的房间','房间很安静吗','不安静的房间'], a:0, tip:'な形容词修饰名词：静かな部屋。' },
      { q:'「きれいな人」是什么意思？', opts:['漂亮的人','打扫的人','漂亮吗'], a:0, tip:'な形容词 + な + 名词。' },
      { q:'「私がよく行く店」是什么意思？', opts:['我经常去的店','我昨天去的店','我不去的店'], a:0, tip:'普通形现在肯定 + 名词：行く店。' },
      { q:'「私が知らない人」是什么意思？', opts:['我不认识的人','我认识的人','知道我的人'], a:0, tip:'否定普通形也能修饰名词：知らない人。' },
      { q:'「友達にもらった時計」是什么意思？', opts:['朋友送给我的表','送给朋友的表','朋友想买的表'], a:0, tip:'もらった時計 = 收到的表。' }
    ],
    examples: [
      { jp:'これは ミラーさんが 作った ケーキです。', cn:'这是米勒先生做的蛋糕。', parts:['これは','ミラーさんが','作った','ケーキです。'] },
      { jp:'これは 私が 昨日 買った 本です。', cn:'这是我昨天买的书。', parts:['これは','私が','昨日','買った','本です。'] },
      { jp:'あの 眼鏡を かけている 人は だれですか。', cn:'那个戴眼镜的人是谁？', parts:['あの','眼鏡をかけている','人は','だれですか。'] },
      { jp:'帽子を かぶっている 人は 佐藤さんです。', cn:'戴帽子的人是佐藤先生/女士。', parts:['帽子をかぶっている','人は','佐藤さんです。'] },
      { jp:'赤い セーターを 着ている 人を 知っていますか。', cn:'你认识穿红毛衣的人吗？', parts:['赤いセーターを','着ている','人を','知っていますか。'] },
      { jp:'日本語を 勉強している 人が たくさん います。', cn:'有很多正在学习日语的人。', parts:['日本語を','勉強している','人が','たくさんいます。'] },
      { jp:'ここは 私が 住んでいる 所です。', cn:'这里是我住的地方。', parts:['ここは','私が','住んでいる','所です。'] },
      { jp:'北海道は 母が 生まれた 所です。', cn:'北海道是我妈妈出生的地方。', parts:['北海道は','母が','生まれた','所です。'] },
      { jp:'これは 友達に もらった 時計です。', cn:'这是朋友送给我的手表。', parts:['これは','友達に','もらった','時計です。'] },
      { jp:'私が よく 行く 店は 駅の 近くに あります。', cn:'我经常去的店在车站附近。', parts:['私が','よく行く','店は','駅の近くに','あります。'] },
      { jp:'駅の 近くに ある アパートを 探しています。', cn:'我正在找车站附近的公寓。', parts:['駅の近くに','ある','アパートを','探しています。'] },
      { jp:'家賃が 安い 部屋が いいです。', cn:'房租便宜的房间比较好。', parts:['家賃が','安い','部屋が','いいです。'] },
      { jp:'静かな 部屋に 住みたいです。', cn:'我想住安静的房间。', parts:['静かな','部屋に','住みたいです。'] },
      { jp:'私が 知らない 人から 電話が ありました。', cn:'有我不认识的人打电话来了。', parts:['私が','知らない','人から','電話が','ありました。'] },
      { jp:'これは 子どもが 読む 本です。', cn:'这是孩子读的书。', parts:['これは','子どもが','読む','本です。'] }
    ],
    final: [
      { q:'第22课名词修饰的基本结构是？', opts:['普通形 + 名词','ます形 + 名词','て形 + です'], a:0 },
      { q:'「ミラーさんが作ったケーキ」是什么意思？', opts:['米勒先生做的蛋糕','米勒先生吃的蛋糕','米勒先生想买的蛋糕'], a:0 },
      { q:'“我昨天买的书”应说？', opts:['私が昨日買った本','私が昨日買いました本','私が昨日買って本'], a:0 },
      { q:'「日本語を勉強している人」是什么意思？', opts:['正在学习日语的人','已经学完日语的人','不会日语的人'], a:0 },
      { q:'“戴眼镜的人”应说？', opts:['眼鏡をかけている人','眼鏡を着ている人','眼鏡を履いている人'], a:0 },
      { q:'“戴帽子的人”应说？', opts:['帽子をかぶっている人','帽子をかけている人','帽子を履いている人'], a:0 },
      { q:'“穿红毛衣的人”应说？', opts:['赤いセーターを着ている人','赤いセーターを履いている人','赤いセーターをかぶっている人'], a:0 },
      { q:'「私が住んでいる所」是什么意思？', opts:['我住的地方','我去过的地方','我不认识的人'], a:0 },
      { q:'「母が生まれた所」是什么意思？', opts:['妈妈出生的地方','妈妈买的东西','妈妈穿的衣服'], a:0 },
      { q:'“朋友送给我的表”应说？', opts:['友達にもらった時計','友達にあげた時計','友達が買います時計'], a:0 },
      { q:'「駅の近くにあるアパート」是什么意思？', opts:['车站附近的公寓','车站很近的人','去车站的东西'], a:0 },
      { q:'い形容词修饰名词时？', opts:['直接接名词：安い部屋','加な：安いな部屋','加の：安いの部屋'], a:0 },
      { q:'な形容词修饰名词时？', opts:['加な：静かな部屋','直接接：静か部屋','加だ：静かだ部屋'], a:0 },
      { q:'「私が知らない人」是什么意思？', opts:['我不认识的人','我认识的人','知道我的人'], a:0 },
      { q:'「私がよく行く店」是什么意思？', opts:['我经常去的店','我不去的店','我昨天去的店'], a:0 },
      { q:'完整找人场景自然顺序是？', opts:['あの眼鏡をかけている人はだれですか→佐藤さんです','薬を飲みます→お大事に→台風が来るでしょう','日本の交通について→便利だと思います→新聞で言っていました'], a:0 },
      { q:'完整租房场景自然顺序是？', opts:['駅の近くにあるアパートを探しています→家賃が安い部屋がいいです','国へ帰るの→うん→ビザは要る','富士山に登ったことがあります→寒くなりました'], a:0 }
    ]
  };
})();

// Lesson 22 completion page enhancer
// Kept in the lesson file so later lessons can be maintained independently from the global auth module.
(function(){
  var cfg = {
    no: '22',
    lessonId: 'minna_lesson_22',
    title: '第22课掌握完成！',
    next: '第23课 〜とき / 〜と',
    nextUrl: './minna-index.html?v=14.5-lesson22-complete',
    reviewLabel: '继续复习第22课',
    chips: ['名词修饰','普通形 + 名词','〜ている人','〜た物','〜所','找人表达','介绍物品','介绍地方','租房场景','错题清零']
  };
  function readState(){
    var candidates = ['lesson22v8','lesson22v7','lesson22v6','lesson22v5'];
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
    var cardId = 'lesson22CompletionCard';
    if(!stage || document.getElementById(cardId)) return;
    var s = readState();
    if(!isPassed(s)) return;
    var m = s.mastery || {};
    var chips = cfg.chips.map(function(x){ return '<span class="pill">✅ ' + x + '</span>'; }).join('');
    var card = document.createElement('div');
    card.id = cardId;
    card.className = 'successBox';
    card.innerHTML = '<h2>🎉 '+cfg.title+'</h2>'+
      '<p>你已经完成本课 Mastery，可以回首页刷新进度并继续下一课。</p>'+
      '<div class="meter">'+
      '<div><b>'+Math.round(m.vocab||100)+'%</b><span>核心词汇</span></div>'+
      '<div><b>'+Math.round(m.grammar||80)+'%</b><span>语法/句型</span></div>'+
      '<div><b>'+Math.round(m.examples||80)+'%</b><span>核心例句</span></div>'+
      '<div><b>'+Math.round(m.final||80)+'%</b><span>综合测试</span></div>'+
      '</div>'+
      '<p>'+chips+'</p>'+
      '<p><b>下一课：</b>'+cfg.next+'</p>'+
      '<p><a class="btn primary" href="'+cfg.nextUrl+'" target="_top">回首页解锁下一课</a><button class="light" id="continueReview22">'+cfg.reviewLabel+'</button></p>';
    stage.insertBefore(card, stage.firstChild);
    var btn = document.getElementById('continueReview22');
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