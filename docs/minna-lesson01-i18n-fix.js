// Minna Lesson 01 i18n cleanup 14.4.6
// Stable mode: no high-frequency full-page rewrite; avoids page jumping.
(function(){
  const KEY='minna_ui_lang';
  const pairs={
    'G Google登录':'Google Login','G oogle登录':'Google Login','Google登录':'Google Login','登录':'Login','云端':'Cloud','已连接':'Connected','学习会自动保存':'learning will be saved automatically','已保存':'Saved','分数':'Score','等级':'Level','完成':'Done','错题':'Mistakes','课程首页':'Home','手动保存':'Manual Save','读取':'Load','退出':'Log out','学习地图':'Learning Map','使用说明':'Guide','本课重点':'Lesson Focus',
    '全站Google登录':'Site-wide Google Login','打卡开始':'Check-in Started','第1课 Mastery 达成':'Lesson 1 Mastery Achieved','Lesson 1 Mastery 达成':'Lesson 1 Mastery Achieved','自我介绍会话':'Self-introduction Dialogue','清零':'Cleared','词汇':'Vocabulary','句型':'Sentence Patterns','语法':'Grammar','例句':'Examples','综合':'Final','测试':'Test','核心词汇':'Core Vocabulary','核心语法':'Core Grammar','核心例句':'Core Examples','综合测试':'Final Test','错题复习':'Mistake Review','全课进度':'Lesson Progress','重学本课':'Restart Lesson',
    '第1课掌握完成！':'Lesson 1 Mastered!','Lesson 1 掌握Done！':'Lesson 1 Mastered!','Lesson 1 掌握完成！':'Lesson 1 Mastered!','你已经完成本课 Mastery，可以回首页刷新进度并继续下一课。':'You have completed this lesson Mastery. Go back to the home page, refresh progress, and continue to the next lesson.','你已经Done本课 Mastery，可以回首页 刷新进度 并继续下一课。':'You have completed this lesson Mastery. Go back to the home page, refresh progress, and continue to the next lesson.','回首页解锁下一课':'Back Home to Unlock Next Lesson','继续复习第1课':'Keep Reviewing Lesson 1','继续复习Lesson 1':'Keep Reviewing Lesson 1','下一课：第2课 これ・それ・あれ':'Next: Lesson 2 これ・それ・あれ','下一课：Lesson 2 これ・それ・あれ':'Next: Lesson 2 これ・それ・あれ',
    '第1课 Mastery 内容已从独立文件读取。词汇需100%，其他模块≥80%，且错题清零才算掌握。':'Lesson 1 Mastery content is loaded from a separate file. Vocabulary requires 100%; other sections require 80% or higher; mistakes must be cleared to count as mastered.','Lesson 1 Mastery 内容 从独立文件Load。词汇需100%，其他模块≥80%，且Mistakes清零才算掌握。。':'Lesson 1 Mastery content is loaded from a separate file. Vocabulary requires 100%; other sections require 80% or higher; mistakes must be cleared to count as mastered.',
    '我':'I / me','你':'you','那个人':'that person','老师':'teacher','教师':'teacher / instructor','学生':'student','公司职员':'company employee','银行职员':'bank employee','医生':'doctor','研究员':'researcher','大学':'university','医院':'hospital','美国':'the United States','从/来自':'from','来了':'came','初次见面':'Nice to meet you','请多关照':'Nice to meet you / Please treat me well',
    '请选择中文意思':'Choose the meaning','选择正确助词':'Choose the correct particle','选择正确句尾':'Choose the correct sentence ending','选择正确表达':'Choose the correct expression','不是学生':'not a student','是学生':'is a student','学生吗':'a student?','也':'also / too','和':'and / with','不，不是':'No, that is not correct / No, I am not','是，是的':'Yes, that is right','买东西':'shopping','问时间':'asking the time','几点了':'What time is it?','多少钱':'How much is it?','我来自美国':'I am from the United States','我要去美国':'I am going to the United States','美国人吗':'Are you American?',
    '我是迈克・米勒。':'I am Mike Miller.','桑托斯先生不是学生。':'Mr. Santos is not a student.','米勒先生是公司职员吗？':'Is Mr. Miller a company employee?','古普塔先生也是公司职员。':'Mr. Gupta is also a company employee.','初次见面。我是迈克・米勒。我来自美国。请多关照。':'Nice to meet you. I am Mike Miller. I am from the United States. Nice to meet you.'
  };
  const reverse={};Object.keys(pairs).forEach(k=>reverse[pairs[k]]=k);
  let applying=false, scheduled=false;
  function lang(){return localStorage.getItem(KEY)||'zh'}
  function baseZh(s){let out=String(s||'');Object.keys(reverse).sort((a,b)=>b.length-a.length).forEach(k=>{out=out.split(k).join(reverse[k])});out=out.replace(/Lesson\s*(\d+)/g,'第$1课').replace(/Done/g,'完成').replace(/Load/g,'读取').replace(/Mistakes/g,'错题').replace(/Grammar/g,'语法').replace(/Examples/g,'例句').replace(/Vocabulary/g,'词汇').replace(/Home/g,'课程首页');return out;}
  function en(s){
    let out=baseZh(s);
    Object.keys(pairs).sort((a,b)=>b.length-a.length).forEach(k=>{out=out.split(k).join(pairs[k])});
    out=out.replace(/第(\d+)课/g,'Lesson $1');
    out=out.replace(/G\s+oogle\s*登录/g,'Google Login').replace(/G\s+oogleLogin/g,'Google Login');
    out=out.replace(/Login[:：]?\s*□?Login[:：]?/g,'Login:').replace(/Cloud[:：]?\s*supabase/g,'Cloud: Supabase');
    out=out.replace(/Cloud[:：].*学习会自动保存/g,'Cloud: Supabase connected. Learning will be saved automatically.');
    out=out.replace(/You已经.*?Mastery.*?下一课。/g,'You have completed this lesson Mastery. Go back to the home page, refresh progress, and continue to the next lesson.');
    out=out.replace(/Lesson 1\s*掌握\s*Done\s*!/g,'Lesson 1 Mastered!').replace(/Lesson 1\s*掌握完成\s*!/g,'Lesson 1 Mastered!');
    out=out.replace(/Grammar\/句型/g,'Grammar / Sentence Patterns').replace(/Mistakes清零/g,'Mistakes Cleared');
    out=out.replace(/回首页解锁Next lesson/g,'Back Home to Unlock Next Lesson');
    return out;
  }
  function setText(target,next){if(target.nodeValue!==undefined){if(target.nodeValue!==next)target.nodeValue=next}else if(target.textContent!==next)target.textContent=next}
  function applyNode(n){if(!n||!n.nodeValue||!n.nodeValue.trim())return;if(!n.__l01zh)n.__l01zh=baseZh(n.nodeValue);setText(n,lang()==='en'?en(n.__l01zh):n.__l01zh)}
  function walk(el){if(!el||['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION'].includes(el.tagName))return;Array.from(el.childNodes).forEach(n=>{if(n.nodeType===3)applyNode(n);else if(n.nodeType===1)walk(n)});}
  function applyEl(el){if(!el||!el.textContent||!el.textContent.trim()||el.childElementCount>0)return;if(!el.__l01zh)el.__l01zh=baseZh(el.textContent);setText(el,lang()==='en'?en(el.__l01zh):el.__l01zh)}
  function applyDoc(doc){if(!doc||!doc.body)return;walk(doc.body);Array.from(doc.querySelectorAll('button,a,span,b,h1,h2,h3,p,div')).forEach(applyEl)}
  function fdoc(){try{let f=document.querySelector('iframe');return f&&f.contentDocument?f.contentDocument:null}catch(e){return null}}
  function apply(){if(applying)return;applying=true;try{applyDoc(document);let d=fdoc();if(d)applyDoc(d)}finally{applying=false}}
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;apply()},180)}
  function observe(doc){if(!doc||!doc.body||doc.__l01StableI18n)return;doc.__l01StableI18n=true;new MutationObserver(schedule).observe(doc.body,{childList:true,subtree:true,characterData:true})}
  function hookLangButtons(){Array.from(document.querySelectorAll('[data-lang]')).forEach(b=>{if(b.__l01Hooked)return;b.__l01Hooked=true;b.addEventListener('click',()=>setTimeout(apply,60))})}
  function start(){apply();observe(document);let f=document.querySelector('iframe');if(f){f.addEventListener('load',()=>setTimeout(()=>{let d=fdoc();observe(d);apply()},250));setTimeout(()=>{let d=fdoc();observe(d);apply()},600)}hookLangButtons();setTimeout(apply,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
