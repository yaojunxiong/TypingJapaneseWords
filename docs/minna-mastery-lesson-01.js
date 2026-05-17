// Minna Mastery Lesson 01
// Content-only data file. The player reads this file and renders vocabulary, grammar, examples, and final test.
(function(){
  window.MinnaMasteryLessons = window.MinnaMasteryLessons || {};
  window.MinnaMasteryLessons[1] = {
    lesson: 1,
    title: '第1课 Mastery',
    masteryRule: {
      vocab: 100,
      grammar: 80,
      examples: 80,
      final: 80,
      wrong: 0
    },
    vocab: [
      ['わたし','我'],
      ['あなた','你'],
      ['あの人','那个人'],
      ['先生','老师'],
      ['教師','教师'],
      ['学生','学生'],
      ['会社員','公司职员'],
      ['銀行員','银行职员'],
      ['医者','医生'],
      ['研究者','研究员'],
      ['大学','大学'],
      ['病院','医院'],
      ['アメリカ','美国'],
      ['から','从/来自'],
      ['来ました','来了'],
      ['初めまして','初次见面'],
      ['どうぞよろしく','请多关照']
    ],
    grammar: [
      { q:'「N1 は N2 です」表示什么？', opts:['N1是N2','N1不是N2','N1去N2'], a:0, tip:'AはBです = A是B。' },
      { q:'「は」作助词时读作？', opts:['wa','ha','ga'], a:0, tip:'主题助词「は」读作 wa。' },
      { q:'「学生じゃありません」是什么意思？', opts:['不是学生','是学生','学生吗'], a:0, tip:'じゃありません = 不是。' },
      { q:'疑问句句尾通常加什么？', opts:['か','を','で'], a:0, tip:'陈述句后加「か」变疑问句。' },
      { q:'「も」在第1课里表示什么？', opts:['也','从','和'], a:0, tip:'も = 也，常替代「は」。' },
      { q:'「アメリカから来ました」里的「から」表示什么？', opts:['从/来自','也','不是'], a:0, tip:'から = 从、来自。' },
      { q:'选择正确助词：わたし（　）ミラーです。', opts:['は','を','へ'], a:0, tip:'自我介绍主题用「は」。' },
      { q:'选择正确句尾：ミラーさんは 会社員（　）。', opts:['です','じゃありません','ですか'], a:0, tip:'肯定判断句用「です」。' },
      { q:'选择正确表达：グプタさん（　）会社員です。', opts:['も','はも','を'], a:0, tip:'「也」用「も」，不能说「はも」。' }
    ],
    examples: [
      { jp:'わたしは マイク・ミラーです。', cn:'我是迈克・米勒。', parts:['わたしは','マイク・ミラー','です。'] },
      { jp:'サントスさんは 学生じゃありません。', cn:'桑托斯先生不是学生。', parts:['サントスさんは','学生じゃ','ありません。'] },
      { jp:'ミラーさんは 会社員ですか。', cn:'米勒先生是公司职员吗？', parts:['ミラーさんは','会社員','ですか。'] },
      { jp:'グプタさんも 会社員です。', cn:'古普塔先生也是公司职员。', parts:['グプタさんも','会社員','です。'] },
      { jp:'アメリカから来ました。', cn:'我来自美国。', parts:['アメリカから','来ました。'] },
      { jp:'初めまして。わたしは マイク・ミラーです。アメリカから来ました。どうぞよろしく。', cn:'初次见面。我是迈克・米勒。我来自美国。请多关照。', parts:['初めまして。','わたしは','マイク・ミラーです。','アメリカから','来ました。','どうぞよろしく。'] }
    ],
    final: [
      { q:'「いいえ、違います」是什么意思？', opts:['不，不是','是，是的','请多关照'], a:0 },
      { q:'不能用于自己的称呼是？', opts:['さん','わたし','教師'], a:0 },
      { q:'「初めまして」用于什么场合？', opts:['初次见面','买东西','问时间'], a:0 },
      { q:'「どうぞよろしく」是什么意思？', opts:['请多关照','几点了','多少钱'], a:0 },
      { q:'「アメリカから来ました」是什么意思？', opts:['我来自美国','我要去美国','美国人吗'], a:0 },
      { q:'完整自我介绍的正确顺序是？', opts:['初めまして→名前→出身→どうぞよろしく','どうぞよろしく→名前→初めまして','出身→どうぞよろしく→初めまして'], a:0 },
      { q:'正确句子是哪一个？', opts:['わたしも学生です。','わたしはも学生です。','わたしを学生です。'], a:0 }
    ]
  };

  // Synchronous bridge loader for additional mastery lesson files.
  // The shared player currently imports this file, so document.write keeps later lessons available before the player starts.
  if(!window.MinnaMasteryLessons[2]){
    document.write('<script src="./minna-mastery-lesson-02.js?v=lesson02-mastery"><\/script>');
  }
  if(!window.MinnaMasteryLessons[3]){
    document.write('<script src="./minna-mastery-lesson-03.js?v=lesson03-mastery"><\/script>');
  }
  if(!window.MinnaMasteryLessons[4]){
    document.write('<script src="./minna-mastery-lesson-04.js?v=lesson04-mastery"><\/script>');
  }
})();