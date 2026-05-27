// Minna Home 14.3 - Chinese / English toggle
// Local-only UI translation layer for the home page. No database changes.
(function(){
  const KEY='minna_ui_lang';
  const dict={
    '《みんなの日本語 初級》AI互动学习系统':'Minna no Nihongo Beginner AI Learning System',
    '像多邻国一样闯关：掌握上一课后，才能学习下一课。':'Progress like a game: master one lesson to unlock the next.',
    '📘 详细设计功能介绍':'📘 System Design',
    '📖 使用说明书':'📖 User Guide',
    '🎯 1–25课总复习':'🎯 Review Lessons 1–25',
    '开始学习':'Start Learning',
    '账号中心':'Account Center',
    '登录状态：':'Login Status:',
    '云端：':'Cloud:',
    '检查中':'Checking',
    '初始化中':'Initializing',
    '每课只作为标准入口，实际学习功能统一由公共播放器提供。掌握标准：完成该课 Mastery 或完成全部学习页。':'Each lesson is a standard entry point. Learning activities are provided by the shared player. Mastery standard: pass Mastery or complete all learning pages.',
    'G 用 Google 登录':'G Sign in with Google',
    '退出':'Log out',
    '📚 刷新我的进度':'📚 Refresh My Progress',
    '🏆 刷新排行榜':'🏆 Refresh Leaderboard',
    '继续学习':'Continue',
    '我的总览':'My Overview',
    '已上线':'Online',
    '有记录课程':'Lessons with Records',
    '总分':'Total Score',
    '完成关卡':'Completed Levels',
    '搜索课程，如：第26课 / んです / 敬语':'Search lessons, e.g. Lesson 26 / n desu / keigo',
    '全部':'All',
    '只看已解锁':'Unlocked Only',
    '只看有进度':'With Progress Only',
    '等待读取云端进度。':'Waiting to load cloud progress.',
    '🎯 前半册总复习待完成':'🎯 First Half Review Not Completed',
    '完成第1–25课后，进入总复习并达到 80% 以上，即可获得前半册成就。':'After completing Lessons 1–25, pass the review with 80% or higher to earn the first-half achievement.',
    '进入 1–25课总复习':'Enter Lessons 1–25 Review',
    '未读取到总复习成绩':'No review score loaded',
    '🏆 Google 用户打卡排行榜':'🏆 Google User Check-in Leaderboard',
    '方案B安全公开榜：普通用户可看全站匿名排名，并显示“前半册成就”。不暴露邮箱、user_id、user_key 或原始 progress JSON。':'Safe public leaderboard: users can view anonymous rankings and first-half achievements. Emails, user_id, user_key, and raw progress JSON are not exposed.',
    '刷新排行榜':'Refresh Leaderboard',
    '等待读取':'Waiting',
    '排名':'Rank',
    '匿名用户':'Anonymous User',
    '完成关卡数':'Completed Levels',
    '总完成页':'Total Pages',
    '前半册成就':'First-half Achievement',
    '最近打卡':'Recent Check-in',
    '读取公开排行榜中……':'Loading public leaderboard...',
    '当前读取':'Currently reading',
    '安全 view。':'safe view.',
    '学习路径地图 2.1':'Learning Path Map 2.1',
    '这里已经合并了原来的“学习路径地图”和“50课课程列表”。搜索、筛选、进度、开始学习都在同一个地图中完成。':'The original path map and 50-lesson list have been merged. Search, filtering, progress, and lesson entry are all handled here.',
    '计算下一步建议中……':'Calculating the next recommendation...',
    '课程状态':'Course Status',
    '主页已经把两套 50 课显示合并为一套统一地图。学习路径地图 2.1 同时负责闯关、搜索、筛选、进度查看和开始学习。':'The home page has merged the duplicated 50-lesson views into one unified map. Learning Path Map 2.1 handles unlocking, search, filtering, progress, and lesson entry.',
    '统一入口':'Unified Entry',
    '第1–50课已上线':'Lessons 1–50 Online',
    '路径地图2.1':'Path Map 2.1',
    '无重复50课列表':'No Duplicate 50-lesson List',
    '访客统计':'Visitor Tracking',
    '详细设计功能介绍':'System Design',
    '使用说明书':'User Guide',
    '1–25课总复习':'Lessons 1–25 Review',
    '📌 今日学习仪表盘':'📌 Today’s Learning Dashboard',
    '今天建议学习':'Recommended Today',
    '优先完成当前课，再继续解锁下一课。':'Finish the current lesson first, then unlock the next one.',
    '已掌握':'Mastered',
    '连续学习':'Learning Streak',
    '本周':'This week',
    '天目标':'day goal',
    '进入专注模式':'Enter Focus Mode',
    '退出专注模式':'Exit Focus Mode',
    '🎯 错题优先':'🎯 Mistakes First',
    '错题优先':'Mistakes First',
    '复习错题':'Review Mistakes',
    '当前课':'Current Lesson',
    '✅ 今日任务':'✅ Today’s Tasks',
    '今日任务':'Today’s Tasks',
    '建议 10–15 分钟完成，不求多，但要连续。':'Aim for 10–15 minutes. Consistency matters more than volume.',
    '🚀 快速跳课':'🚀 Quick Lesson Jump',
    '快速跳课':'Quick Lesson Jump',
    '需要查某一课时，可以直接跳转；正常学习仍建议按路径闯关。':'Jump directly when you need a lesson. For regular study, follow the path.',
    '上一课':'Previous',
    '下一课':'Next',
    '跳转':'Go',
    '⏱ 专注计时':'⏱ Focus Timer',
    '专注计时':'Focus Timer',
    '准备好就开始。':'Start when ready.',
    '专注中，不要切走。':'Stay focused. Do not switch tasks.',
    '完成！休息一下或再来一轮。':'Done! Take a break or start another round.',
    '开始':'Start',
    '暂停':'Pause',
    '重置':'Reset',
    '✅ 今日完成清单':'✅ Daily Checklist',
    '今日完成清单':'Daily Checklist',
    '每天自动重置。先完成小目标，再继续加量。':'Resets automatically every day. Finish small goals before adding more.',
    '完成':'Done',
    '重置今天':'Reset Today',
    '开始学习 10 分钟':'Study for 10 minutes',
    '打开当前课，完成一点点就算赢。':'Open the current lesson. A small step counts as a win.',
    '复习当前课错题':'Review current lesson mistakes',
    '快速复习上一课':'Quickly review the previous lesson',
    '先清错题，再推进新内容。':'Clear mistakes before moving forward.',
    '错题很少，保持语感即可。':'Few mistakes. Just keep your language sense warm.',
    '朗读例句 5 句':'Read 5 example sentences aloud',
    '不用追求完美，重点是开口。':'No need to be perfect. The goal is to speak.',
    '完成 1 次 Mastery 小测试':'Complete one Mastery mini test',
    '用小测试确认今天真的掌握了。':'Use a mini test to confirm today’s mastery.',
    '去完成 →':'Do it →',
    '🕘 最近学习':'🕘 Recent Learning',
    '最近学习':'Recent Learning',
    '自动记录本机最近打开过的课程，方便下次继续。':'Locally records recently opened lessons so you can continue next time.',
    '清空记录':'Clear Records',
    '还没有最近学习记录。点击“继续学习”或打开任意课程后，这里会自动出现。':'No recent learning records yet. Click Continue or open any lesson, and it will appear here.',
    '🧭 学习洞察':'🧭 Learning Insights',
    '学习洞察':'Learning Insights',
    '下一步建议':'Next Step',
    '今日清单':'Today’s Checklist',
    '错题':'Mistakes',
    '本机记录':'Local Records',
    '建议优先清理':'Recommended to clear first',
    '第':'Lesson ',
    '课':'',
    '天':' days',
    '分钟前':' minutes ago',
    '小时前':' hours ago',
    '天前':' days ago',
    '刚刚':'Just now'
  };
  function lang(){return localStorage.getItem(KEY)||'zh';}
  function setLang(v){localStorage.setItem(KEY,v);apply();}
  function ensureStyle(){
    if(document.getElementById('minnaI18nStyle'))return;
    var s=document.createElement('style');s.id='minnaI18nStyle';
    s.textContent='.langToggle{display:inline-flex;gap:6px;align-items:center;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:4px;margin-left:8px}.langToggle button{border:0;border-radius:999px;padding:6px 10px;font-weight:1000;cursor:pointer;background:transparent;color:white}.langToggle button.active{background:white;color:#1d4ed8}@media(max-width:520px){.langToggle{margin-top:8px;margin-left:0}}';
    document.head.appendChild(s);
  }
  function installToggle(){
    ensureStyle();
    if(document.getElementById('minnaLangToggle'))return;
    var badge=document.querySelector('header .badge')||document.querySelector('header .wrap');
    if(!badge)return;
    var box=document.createElement('span');box.id='minnaLangToggle';box.className='langToggle';
    box.innerHTML='<button type="button" data-lang="zh">中文</button><button type="button" data-lang="en">EN</button>';
    badge.parentNode.insertBefore(box,badge.nextSibling);
    Array.prototype.slice.call(box.querySelectorAll('button')).forEach(function(btn){btn.onclick=function(){setLang(btn.dataset.lang);};});
  }
  function translateTextNode(node){
    if(!node||!node.nodeValue)return;
    var raw=node.nodeValue;
    var trimmed=raw.trim();
    if(!trimmed)return;
    var en=dict[trimmed];
    if(en){node.nodeValue=raw.replace(trimmed,en);return;}
    Object.keys(dict).sort(function(a,b){return b.length-a.length;}).forEach(function(k){
      if(raw.indexOf(k)>=0)raw=raw.split(k).join(dict[k]);
    });
    node.nodeValue=raw;
  }
  function walk(el){
    if(!el||['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION'].includes(el.tagName))return;
    Array.prototype.slice.call(el.childNodes).forEach(function(n){
      if(n.nodeType===3)translateTextNode(n);
      else if(n.nodeType===1)walk(n);
    });
  }
  function translateAttrs(){
    Array.prototype.slice.call(document.querySelectorAll('[placeholder]')).forEach(function(el){var v=el.getAttribute('placeholder');if(dict[v])el.setAttribute('placeholder',dict[v]);});
    var title=document.querySelector('title');
    if(title&&lang()==='en')title.textContent='Minna no Nihongo Beginner AI Learning System | Home';
  }
  function apply(){
    installToggle();
    var box=document.getElementById('minnaLangToggle');
    if(box)Array.prototype.slice.call(box.querySelectorAll('button')).forEach(function(b){b.classList.toggle('active',b.dataset.lang===lang());});
    document.documentElement.lang=lang()==='en'?'en':'zh-CN';
    if(lang()!=='en')return;
    translateAttrs();
    walk(document.body);
  }
  function start(){
    installToggle();
    apply();
    var timer=null;
    var obs=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(apply,250);});
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
