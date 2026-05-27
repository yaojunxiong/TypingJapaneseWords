// Minna lesson data v16.5
// Structured lesson data registry. No DOM translation. Lessons can be registered by separate lesson data files.
(function(){
  const lessons={
    1:{
      id:'minna_lesson_01',
      no:1,
      title:{zh:'第1课',en:'Lesson 1'},
      subtitle:{zh:'名词句・自我介绍',en:'Noun sentences / self-introduction'},
      focus:{zh:'学习「AはBです」「AはBではありません」「AはBですか」和基本寒暄。',en:'Learn “A は B です”, “A は B ではありません”, “A は B ですか”, and basic greetings.'},
      vocab:[
        {id:'l01_v01',jp:'わたし',kana:'わたし',zh:'我',en:'I / me'},
        {id:'l01_v02',jp:'あなた',kana:'あなた',zh:'你',en:'you'},
        {id:'l01_v03',jp:'あのひと',kana:'あのひと',zh:'那个人',en:'that person'},
        {id:'l01_v04',jp:'先生',kana:'せんせい',zh:'老师',en:'teacher'},
        {id:'l01_v05',jp:'学生',kana:'がくせい',zh:'学生',en:'student'},
        {id:'l01_v06',jp:'会社員',kana:'かいしゃいん',zh:'公司职员',en:'company employee'},
        {id:'l01_v07',jp:'銀行員',kana:'ぎんこういん',zh:'银行职员',en:'bank employee'},
        {id:'l01_v08',jp:'医者',kana:'いしゃ',zh:'医生',en:'doctor'},
        {id:'l01_v09',jp:'研究者',kana:'けんきゅうしゃ',zh:'研究员',en:'researcher'},
        {id:'l01_v10',jp:'大学',kana:'だいがく',zh:'大学',en:'university'},
        {id:'l01_v11',jp:'病院',kana:'びょういん',zh:'医院',en:'hospital'},
        {id:'l01_v12',jp:'アメリカ',kana:'アメリカ',zh:'美国',en:'the United States'},
        {id:'l01_v13',jp:'初めまして',kana:'はじめまして',zh:'初次见面',en:'Nice to meet you'},
        {id:'l01_v14',jp:'どうぞよろしく',kana:'どうぞよろしく',zh:'请多关照',en:'Nice to meet you / Please treat me well'}
      ],
      grammar:[
        {id:'l01_g01',title:{zh:'A は B です',en:'A is B'},body:{zh:'「は」提示主题，「です」表示礼貌判断：A 是 B。',en:'「は」 marks the topic, and 「です」 makes a polite statement: A is B.'},jp:'わたしは 学生です。',zh:'我是学生。',en:'I am a student.'},
        {id:'l01_g02',title:{zh:'A は B ではありません',en:'A is not B'},body:{zh:'否定句用「ではありません」。口语中也常听到「じゃありません」。',en:'Use 「ではありません」 for the negative form. 「じゃありません」 is also common in speech.'},jp:'サントスさんは 学生ではありません。',zh:'桑托斯先生不是学生。',en:'Mr. Santos is not a student.'},
        {id:'l01_g03',title:{zh:'A は B ですか',en:'Is A B?'},body:{zh:'疑问句在句尾加「か」，语调不必大幅上扬。',en:'Add 「か」 at the end to make a question. A strong rising intonation is not necessary.'},jp:'ミラーさんは 会社員ですか。',zh:'米勒先生是公司职员吗？',en:'Is Mr. Miller a company employee?'},
        {id:'l01_g04',title:{zh:'A も B です',en:'A is also B'},body:{zh:'「も」表示“也”。当和前面的人或事相同时使用。',en:'「も」 means “also / too”. Use it when something is the same as before.'},jp:'グプタさんも 会社員です。',zh:'古普塔先生也是公司职员。',en:'Mr. Gupta is also a company employee.'}
      ],
      examples:[
        {id:'l01_e01',jp:'わたしは マイク・ミラーです。',zh:'我是迈克・米勒。',en:'I am Mike Miller.'},
        {id:'l01_e02',jp:'サントスさんは 学生ではありません。',zh:'桑托斯先生不是学生。',en:'Mr. Santos is not a student.'},
        {id:'l01_e03',jp:'ミラーさんは 会社員ですか。',zh:'米勒先生是公司职员吗？',en:'Is Mr. Miller a company employee?'},
        {id:'l01_e04',jp:'グプタさんも 会社員です。',zh:'古普塔先生也是公司职员。',en:'Mr. Gupta is also a company employee.'},
        {id:'l01_e05',jp:'初めまして。わたしは ミラーです。アメリカから来ました。どうぞよろしく。',zh:'初次见面。我是米勒。我来自美国。请多关照。',en:'Nice to meet you. I am Miller. I am from the United States. Nice to meet you.'}
      ],
      quiz:[
        {id:'l01_q01',type:'vocab_meaning',q:{zh:'「学生」的意思是？',en:'What does 「学生」 mean?'},options:[{zh:'学生',en:'student',ok:true},{zh:'老师',en:'teacher'},{zh:'医生',en:'doctor'},{zh:'公司职员',en:'company employee'}],explain:{zh:'「学生」= 学生。',en:'「学生」 means student.'}},
        {id:'l01_q02',type:'particle',q:{zh:'选择正确句子：我是学生。',en:'Choose the correct sentence: I am a student.'},options:[{jp:'わたしは 学生です。',ok:true},{jp:'わたしを 学生です。'},{jp:'わたしへ 学生です。'},{jp:'わたしが 学生ですか。'}],explain:{zh:'自我介绍用「は」提示主题，句尾用「です」。',en:'Use 「は」 to mark the topic and 「です」 at the end.'}},
        {id:'l01_q03',type:'negative',q:{zh:'哪一句表示“桑托斯先生不是学生”？',en:'Which sentence means “Mr. Santos is not a student”?'},options:[{jp:'サントスさんは 学生ではありません。',ok:true},{jp:'サントスさんは 学生です。'},{jp:'サントスさんも 学生です。'},{jp:'サントスさんは 学生ですか。'}],explain:{zh:'否定句用「ではありません」。',en:'Use 「ではありません」 for the negative form.'}},
        {id:'l01_q04',type:'question',q:{zh:'哪一句是疑问句？',en:'Which one is a question?'},options:[{jp:'ミラーさんは 会社員ですか。',ok:true},{jp:'ミラーさんは 会社員です。'},{jp:'ミラーさんも 会社員です。'},{jp:'ミラーさんは 会社員ではありません。'}],explain:{zh:'句尾「か」表示疑问。',en:'「か」 at the end marks a question.'}},
        {id:'l01_q05',type:'situation',q:{zh:'第一次见面时，最自然的开头是？',en:'Which opening is most natural when meeting someone for the first time?'},options:[{jp:'初めまして。',ok:true},{jp:'いただきます。'},{jp:'おやすみなさい。'},{jp:'さようなら。'}],explain:{zh:'初次见面用「初めまして」。',en:'Use 「初めまして」 when meeting someone for the first time.'}}
      ]
    }
  };
  function register(no,data){lessons[Number(no)]=data;}
  function get(no){return lessons[Number(no)]||lessons[1];}
  window.MinnaLessonDataV16={lessons,register,get};
})();
