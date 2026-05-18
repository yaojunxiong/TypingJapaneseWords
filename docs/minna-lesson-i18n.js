// Minna Lesson 14.4.2 - richer Chinese / English toggle for lesson pages
// Adds content-level English for Lesson 01 Mastery: vocab choices, grammar, examples, final test, and guide text.
(function(){
  const KEY='minna_ui_lang';
  const dict={
    // Common lesson UI
    '学习地图':'Learning Map','课程首页':'Home','退出':'Log out','手动保存':'Manual Save','读取':'Load','登录：':'Login:','云端：':'Cloud:','检查中':'Checking','初始化中':'Initializing','分数':'Score','等级':'Level','完成':'Done','错题':'Mistakes','本课重点':'Lesson Focus','使用说明':'Guide','中文讲解':'Chinese Explanation','日语朗读':'Japanese Audio','上一页':'Previous','下一页':'Next','学会了':'Got it','重学本课':'Restart Lesson','全课进度':'Lesson Progress','核心词汇':'Core Vocabulary','核心语法':'Core Grammar','核心例句':'Core Examples','综合测试':'Final Test','错题复习':'Mistake Review','请选择中文意思':'Choose the meaning','答对了！':'Correct!','不对':'Incorrect','正确答案是':'Correct answer','已加入错题本':'Added to mistakes','当前没有错题。':'No mistakes now.','太好了！':'Great!','这一课还没有解锁':'This lesson is locked','请先完成上一课。':'Please complete the previous lesson first.','去完成上一课':'Go to previous lesson','回课程首页':'Back to Home','加载失败':'Load failed','公共脚本没有加载成功，请强制刷新。':'Shared script failed to load. Please force refresh.','课程数据不存在':'Lesson data not found','核心词汇｜选择题':'Core Vocabulary | Choice','语法':'Grammar','例句':'Examples','测试':'Test','小测验':'Mini Quiz','请选择一个答案':'Choose an answer','再想想':'Think again','提示：':'Tip:','中文：':'Chinese:','检查排序':'Check Order','下一句':'Next Sentence','朗读完整句':'Read Full Sentence','顺序不对':'Wrong order','正确':'Correct','专注模式':'Focus Mode','已登录':'Signed in','未登录':'Not signed in','保存中...':'Saving...','读取中...':'Loading...','云端暂无本课记录':'No cloud record for this lesson yet','保存失败':'Save failed','读取失败':'Load failed','第1课已升级为外部 Mastery 内容库；其他课程暂用普通互动模式。':'Lesson 1 uses the external Mastery content library. Other lessons currently use the regular interactive mode.',
    '词汇':'Vocabulary','综合':'Final','错题已复习。':'The mistake has been reviewed.','已加入错题本。':'Added to the mistake list.','当前有':'You currently have','个错题。':'mistakes.','答对后会自动清除。':'They will be cleared automatically after you answer correctly.','去复习':'Review','我已全部重新掌握，清空错题':'I have mastered them all. Clear mistakes.','第1课 Mastery':'Lesson 1 Mastery','AI互动学习App｜第1课':'AI Interactive Learning App | Lesson 1','《みんなの日本語 初级Ⅰ》第1课':'Minna no Nihongo Beginner I Lesson 1','《みんなの日本語 初級Ⅰ》第1课':'Minna no Nihongo Beginner I Lesson 1',

    // Lesson 01 vocab choices
    '我':'I / me','你':'you','那个人':'that person','老师':'teacher','教师':'teacher / instructor','学生':'student','公司职员':'company employee','银行职员':'bank employee','医生':'doctor','研究员':'researcher','大学':'university','医院':'hospital','美国':'the United States','从/来自':'from','来了':'came','初次见面':'Nice to meet you','请多关照':'Please treat me well / Nice to meet you',

    // Lesson 01 grammar questions / options / tips
    '「N1 は N2 です」表示什么？':'What does “N1 は N2 です” mean?','N1是N2':'N1 is N2','N1不是N2':'N1 is not N2','N1去N2':'N1 goes to N2','AはBです = A是B。':'A は B です = A is B.',
    '「は」作助词时读作？':'How is the particle 「は」 pronounced?','主题助词「は」读作 wa。':'The topic particle 「は」 is pronounced “wa”.',
    '「学生じゃありません」是什么意思？':'What does 「学生じゃありません」 mean?','不是学生':'not a student','是学生':'is a student','学生吗':'a student?','じゃありません = 不是。':'じゃありません = is not / am not.',
    '疑问句句尾通常加什么？':'What is usually added at the end of a question sentence?','陈述句后加「か」变疑问句。':'Add 「か」 after a statement to make it a question.',
    '「も」在第1课里表示什么？':'What does 「も」 mean in Lesson 1?','也':'also / too','从':'from','和':'and / with','も = 也，常替代「は」。':'も = also / too, often replacing 「は」.',
    '「アメリカから来ました」里的「から」表示什么？':'What does 「から」 mean in 「アメリカから来ました」?','から = 从、来自。':'から = from.',
    '选择正确助词：わたし（　）ミラーです。':'Choose the correct particle: わたし（　）ミラーです.','自我介绍主题用「は」。':'Use 「は」 for the topic in self-introduction.',
    '选择正确句尾：ミラーさんは 会社員（　）。':'Choose the correct ending: ミラーさんは 会社員（　）.','肯定判断句用「です」。':'Use 「です」 for an affirmative judgment sentence.',
    '选择正确表达：グプタさん（　）会社員です。':'Choose the correct expression: グプタさん（　）会社員です.','「也」用「も」，不能说「はも」。':'Use 「も」 for “also”; do not say 「はも」.',

    // Lesson 01 examples
    '我是迈克・米勒。':'I am Mike Miller.','桑托斯先生不是学生。':'Mr. Santos is not a student.','米勒先生是公司职员吗？':'Is Mr. Miller a company employee?','古普塔先生也是公司职员。':'Mr. Gupta is also a company employee.','我来自美国。':'I am from the United States.','初次见面。我是迈克・米勒。我来自美国。请多关照。':'Nice to meet you. I am Mike Miller. I am from the United States. Nice to meet you.',

    // Lesson 01 final test
    '「いいえ、違います」是什么意思？':'What does 「いいえ、違います」 mean?','不，不是':'No, that is not correct / No, I am not','是，是的':'Yes, that is right','不能用于自己的称呼是？':'Which title should not be used for yourself?','「初めまして」用于什么场合？':'When do you use 「初めまして」?','买东西':'shopping','问时间':'asking the time','「どうぞよろしく」是什么意思？':'What does 「どうぞよろしく」 mean?','几点了':'What time is it?','多少钱':'How much is it?','「アメリカから来ました」是什么意思？':'What does 「アメリカから来ました」 mean?','我要去美国':'I am going to the United States','美国人吗':'Are you American?','完整自我介绍的正确顺序是？':'What is the correct order for a full self-introduction?','初めまして→名前→出身→どうぞよろしく':'Nice to meet you → name → origin → closing greeting','どうぞよろしく→名前→初めまして':'closing greeting → name → nice to meet you','出身→どうぞよろしく→初めまして':'origin → closing greeting → nice to meet you','正确句子是哪一个？':'Which sentence is correct?',

    // Classic lesson / guide content snippets
    '第1课已升级为外部 Mastery 内容库；其他课程暂用普通互动模式。':'Lesson 1 uses the external Mastery content library. Other lessons currently use the regular interactive mode.','Mastery 内容已从独立文件读取。词汇需100%，其他模块≥80%，且错题清零才算掌握。':'Mastery content is loaded from a separate file. Vocabulary must be 100%, other sections must be at least 80%, and mistakes must be cleared to count as mastered.','请选择一个答案':'Please choose one answer','顺序不对，正确是：':'The order is incorrect. The correct sentence is: ','正确：':'Correct: '
  };
  const reverse={};Object.keys(dict).forEach(function(k){reverse[dict[k]]=k});
  function lang(){return localStorage.getItem(KEY)||'zh'}
  function setLang(v){localStorage.setItem(KEY,v);applyAll(true)}
  function ensureStyle(){
    if(document.getElementById('minnaLessonI18nStyle'))return;
    var s=document.createElement('style');s.id='minnaLessonI18nStyle';s.textContent='.lessonLangToggle{position:fixed;right:12px;top:12px;z-index:99999;display:flex;gap:6px;background:rgba(15,23,42,.82);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:5px}.lessonLangToggle button{border:0;border-radius:999px;padding:7px 10px;font-weight:1000;cursor:pointer;background:transparent;color:white}.lessonLangToggle button.active{background:white;color:#1d4ed8}';document.head.appendChild(s);
  }
  function installToggle(){
    ensureStyle();
    var box=document.getElementById('lessonLangToggle');
    if(!box){box=document.createElement('div');box.id='lessonLangToggle';box.className='lessonLangToggle';box.innerHTML='<button data-lang="zh">中文</button><button data-lang="en">EN</button>';document.body.appendChild(box);Array.prototype.slice.call(box.querySelectorAll('button')).forEach(function(b){b.onclick=function(){setLang(b.dataset.lang)}})}
    Array.prototype.slice.call(box.querySelectorAll('button')).forEach(function(b){b.classList.toggle('active',b.dataset.lang===lang())});
  }
  function toEn(raw){
    if(!raw)return raw;
    var out=raw,trimmed=out.trim();
    if(dict[trimmed])return out.replace(trimmed,dict[trimmed]);
    Object.keys(dict).sort(function(a,b){return b.length-a.length}).forEach(function(k){if(out.indexOf(k)>=0)out=out.split(k).join(dict[k])});
    out=out.replace(/第(\d+)课/g,'Lesson $1');
    out=out.replace(/第(\d+)题/g,'Question $1');
    out=out.replace(/Q(\d+)\.\s*/g,'Q$1. ');
    out=out.replace(/(\d+)分钟前/g,'$1 minutes ago').replace(/(\d+)小时前/g,'$1 hours ago').replace(/(\d+)天前/g,'$1 days ago');
    return out;
  }
  function toZh(raw){
    if(!raw)return raw;
    var out=raw,trimmed=out.trim();
    if(reverse[trimmed])return out.replace(trimmed,reverse[trimmed]);
    Object.keys(reverse).sort(function(a,b){return b.length-a.length}).forEach(function(k){if(out.indexOf(k)>=0)out=out.split(k).join(reverse[k])});
    out=out.replace(/Lesson\s*(\d+)/g,'第$1课');
    out=out.replace(/Question\s*(\d+)/g,'第$1题');
    out=out.replace(/(\d+) minutes ago/g,'$1分钟前').replace(/(\d+) hours ago/g,'$1小时前').replace(/(\d+) days ago/g,'$1天前');
    return out;
  }
  function originalText(node){if(!node.__minnaZhText)node.__minnaZhText=toZh(node.nodeValue||'');return node.__minnaZhText}
  function applyTextNode(node){if(!node||!node.nodeValue)return;var zh=originalText(node);node.nodeValue=lang()==='en'?toEn(zh):zh}
  function applyElementText(el){if(!el)return;if(!el.__minnaZhText)el.__minnaZhText=toZh(el.textContent||'');el.textContent=lang()==='en'?toEn(el.__minnaZhText):el.__minnaZhText}
  function walk(el){
    if(!el||['SCRIPT','STYLE','TEXTAREA'].includes(el.tagName))return;
    if(['INPUT','SELECT','OPTION'].includes(el.tagName))return;
    Array.prototype.slice.call(el.childNodes).forEach(function(n){if(n.nodeType===3)applyTextNode(n);else if(n.nodeType===1)walk(n)});
  }
  function translateAttrs(doc){
    Array.prototype.slice.call(doc.querySelectorAll('[placeholder]')).forEach(function(el){if(!el.__minnaZhPlaceholder)el.__minnaZhPlaceholder=toZh(el.getAttribute('placeholder')||'');el.setAttribute('placeholder',lang()==='en'?toEn(el.__minnaZhPlaceholder):el.__minnaZhPlaceholder)});
    Array.prototype.slice.call(doc.querySelectorAll('[title]')).forEach(function(el){if(!el.__minnaZhTitle)el.__minnaZhTitle=toZh(el.getAttribute('title')||'');el.setAttribute('title',lang()==='en'?toEn(el.__minnaZhTitle):el.__minnaZhTitle)});
  }
  function translateDoc(doc){
    if(!doc||!doc.body)return;
    doc.documentElement.lang=lang()==='en'?'en':'zh-CN';
    walk(doc.body);translateAttrs(doc);
    if(doc.title){if(!doc.__minnaZhTitle)doc.__minnaZhTitle=toZh(doc.title);doc.title=lang()==='en'?toEn(doc.__minnaZhTitle).replace('《みんなの日本語》','Minna no Nihongo '):doc.__minnaZhTitle}
  }
  function frameDoc(){var f=document.querySelector('iframe');try{return f&&f.contentDocument?f.contentDocument:null}catch(e){return null}}
  function refreshDynamicFrame(){
    var d=frameDoc();if(!d)return;
    try{Array.prototype.slice.call(d.querySelectorAll('button,a,span,b,h1,h2,h3,p,div')).forEach(function(el){if(!el.childElementCount&&el.textContent&&el.textContent.trim())applyElementText(el)})}catch(e){}
  }
  function applyAll(force){
    installToggle();document.documentElement.lang=lang()==='en'?'en':'zh-CN';translateDoc(document);
    var d=frameDoc();if(d){translateDoc(d);if(force)refreshDynamicFrame()}
  }
  function observeFrame(){
    var d=frameDoc();if(!d||!d.body||d.__minnaLessonI18nObserved)return;
    d.__minnaLessonI18nObserved=true;
    var timer=null;var obs=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(function(){applyAll(false)},90)});
    obs.observe(d.body,{childList:true,subtree:true,characterData:true});applyAll(true);
  }
  function start(){
    installToggle();applyAll(true);
    var f=document.querySelector('iframe');if(f)f.addEventListener('load',function(){setTimeout(observeFrame,250)});
    setTimeout(observeFrame,500);setInterval(function(){observeFrame();applyAll(false)},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
