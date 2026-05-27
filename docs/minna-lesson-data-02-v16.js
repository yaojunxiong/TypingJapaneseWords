// Minna Lesson 02 data v16.5
(function(){
  const data={
    id:'minna_lesson_02',
    no:2,
    title:{zh:'第2课',en:'Lesson 2'},
    subtitle:{zh:'これ・それ・あれ / この・その・あの',en:'これ・それ・あれ / この・その・あの'},
    focus:{zh:'学习指示词「これ・それ・あれ」、名词修饰「この・その・あの」以及「これは何ですか」。',en:'Learn demonstratives 「これ・それ・あれ」, noun modifiers 「この・その・あの」, and 「これは何ですか」.'},
    vocab:[
      {id:'l02_v01',jp:'これ',kana:'これ',zh:'这个',en:'this one'},
      {id:'l02_v02',jp:'それ',kana:'それ',zh:'那个',en:'that one near you'},
      {id:'l02_v03',jp:'あれ',kana:'あれ',zh:'那个',en:'that one over there'},
      {id:'l02_v04',jp:'この',kana:'この',zh:'这个～',en:'this ~'},
      {id:'l02_v05',jp:'その',kana:'その',zh:'那个～',en:'that ~ near you'},
      {id:'l02_v06',jp:'あの',kana:'あの',zh:'那个～',en:'that ~ over there'},
      {id:'l02_v07',jp:'本',kana:'ほん',zh:'书',en:'book'},
      {id:'l02_v08',jp:'辞書',kana:'じしょ',zh:'词典',en:'dictionary'},
      {id:'l02_v09',jp:'雑誌',kana:'ざっし',zh:'杂志',en:'magazine'},
      {id:'l02_v10',jp:'新聞',kana:'しんぶん',zh:'报纸',en:'newspaper'},
      {id:'l02_v11',jp:'ノート',kana:'ノート',zh:'笔记本',en:'notebook'},
      {id:'l02_v12',jp:'手帳',kana:'てちょう',zh:'记事本',en:'pocket notebook'},
      {id:'l02_v13',jp:'名刺',kana:'めいし',zh:'名片',en:'business card'},
      {id:'l02_v14',jp:'鉛筆',kana:'えんぴつ',zh:'铅笔',en:'pencil'},
      {id:'l02_v15',jp:'ボールペン',kana:'ボールペン',zh:'圆珠笔',en:'ballpoint pen'},
      {id:'l02_v16',jp:'かぎ',kana:'かぎ',zh:'钥匙',en:'key'},
      {id:'l02_v17',jp:'時計',kana:'とけい',zh:'钟表 / 手表',en:'clock / watch'},
      {id:'l02_v18',jp:'傘',kana:'かさ',zh:'伞',en:'umbrella'},
      {id:'l02_v19',jp:'何',kana:'なん',zh:'什么',en:'what'},
      {id:'l02_v20',jp:'だれ',kana:'だれ',zh:'谁',en:'who'}
    ],
    grammar:[
      {id:'l02_g01',title:{zh:'これ / それ / あれ',en:'これ / それ / あれ'},body:{zh:'「これ」指靠近说话人的东西，「それ」指靠近听话人的东西，「あれ」指离双方都远的东西。',en:'「これ」 is near the speaker, 「それ」 is near the listener, and 「あれ」 is far from both.'},jp:'これは 本です。',zh:'这是书。',en:'This is a book.'},
      {id:'l02_g02',title:{zh:'この / その / あの + 名词',en:'この / その / あの + noun'},body:{zh:'「この・その・あの」后面必须接名词，不能单独使用。',en:'「この・その・あの」 must be followed by a noun and cannot stand alone.'},jp:'この 本は わたしのです。',zh:'这本书是我的。',en:'This book is mine.'},
      {id:'l02_g03',title:{zh:'これは 何ですか',en:'What is this?'},body:{zh:'询问物品是什么时，用「何ですか」。',en:'Use 「何ですか」 to ask what an object is.'},jp:'これは 何ですか。',zh:'这是什么？',en:'What is this?'},
      {id:'l02_g04',title:{zh:'だれの + 名词',en:'Whose + noun'},body:{zh:'询问所有者时用「だれの」。回答可以用「わたしのです」。',en:'Use 「だれの」 to ask who owns something. You can answer with 「わたしのです」.'},jp:'これは だれの かぎですか。',zh:'这是谁的钥匙？',en:'Whose key is this?'}
    ],
    examples:[
      {id:'l02_e01',jp:'これは 辞書です。',zh:'这是词典。',en:'This is a dictionary.'},
      {id:'l02_e02',jp:'それは わたしの 傘です。',zh:'那是我的伞。',en:'That is my umbrella.'},
      {id:'l02_e03',jp:'あれは 田中さんの 車です。',zh:'那是田中先生的车。',en:'That over there is Mr. Tanaka’s car.'},
      {id:'l02_e04',jp:'この 本は だれのですか。',zh:'这本书是谁的？',en:'Whose book is this?'},
      {id:'l02_e05',jp:'これは 何ですか。これは 名刺です。',zh:'这是什么？这是名片。',en:'What is this? This is a business card.'}
    ],
    quiz:[
      {id:'l02_q01',type:'demonstrative',q:{zh:'离说话人近的东西，用哪个？',en:'Which word refers to something near the speaker?'},options:[{jp:'これ',ok:true},{jp:'それ'},{jp:'あれ'},{jp:'どれ'}],explain:{zh:'靠近说话人用「これ」。',en:'Use 「これ」 for something near the speaker.'}},
      {id:'l02_q02',type:'demonstrative',q:{zh:'「这个书」应该怎么说？',en:'How do you say “this book”?'},options:[{jp:'この 本',ok:true},{jp:'これ 本'},{jp:'このは 本'},{jp:'これの 本'}],explain:{zh:'修饰名词时用「この + 名词」。',en:'Use 「この + noun」 to modify a noun.'}},
      {id:'l02_q03',type:'question',q:{zh:'哪一句表示“这是什么？”',en:'Which sentence means “What is this?”'},options:[{jp:'これは 何ですか。',ok:true},{jp:'これは だれですか。'},{jp:'これは 本です。'},{jp:'この 何ですか。'}],explain:{zh:'询问物品是什么用「これは何ですか」。',en:'Use 「これは何ですか」 to ask what something is.'}},
      {id:'l02_q04',type:'owner',q:{zh:'哪一句表示“这是谁的钥匙？”',en:'Which sentence means “Whose key is this?”'},options:[{jp:'これは だれの かぎですか。',ok:true},{jp:'これは だれ かぎですか。'},{jp:'このは だれの かぎですか。'},{jp:'これは 何の かぎですか。'}],explain:{zh:'询问所有者用「だれの」。',en:'Use 「だれの」 to ask ownership.'}},
      {id:'l02_q05',type:'vocab',q:{zh:'「辞書」的意思是？',en:'What does 「辞書」 mean?'},options:[{zh:'词典',en:'dictionary',ok:true},{zh:'杂志',en:'magazine'},{zh:'报纸',en:'newspaper'},{zh:'笔记本',en:'notebook'}],explain:{zh:'「辞書」= 词典。',en:'「辞書」 means dictionary.'}},
      {id:'l02_q06',type:'sentence',q:{zh:'选择正确句子：那是我的伞。',en:'Choose the correct sentence: That is my umbrella.'},options:[{jp:'それは わたしの 傘です。',ok:true},{jp:'そのは わたしの 傘です。'},{jp:'それは わたし 傘です。'},{jp:'これは だれの 傘ですか。'}],explain:{zh:'单独指物品用「それ」，所属用「わたしの」。',en:'Use 「それ」 for that object and 「わたしの」 for “mine”.'}}
    ]
  };
  if(window.MinnaLessonDataV16)window.MinnaLessonDataV16.register(2,data);
})();
