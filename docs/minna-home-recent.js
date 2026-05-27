// Minna Home 14.1 - recent learning enhancer
// Adds a local recent-learning panel. No database changes.
(function(){
  function esc(s){return String(s||'').replace(/[&<>]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m];});}
  function pad(n){return String(n).padStart(2,'0');}
  function lessonUrl(n){n=Math.min(50,Math.max(1,Number(n)||1));return './minna-no-nihongo-lesson-'+pad(n)+'.html?v=14.1';}
  function lessonTitle(n){
    var topics={1:'名词句・自我介绍',2:'これ・それ・あれ',3:'ここ・そこ・あそこ',4:'时间・曜日',5:'移动・交通',6:'动词ます形',7:'工具・授受基础',8:'形容词',9:'好き・上手',10:'存在句',11:'数量表达',12:'过去式・比较',13:'想要・目的',14:'て形',15:'て形许可',16:'连接动作',17:'ない形',18:'辞书形',19:'た形',20:'普通形',21:'と思います',22:'名词修饰',23:'とき・と',24:'くれます',25:'たら・ても',26:'んです',27:'可能形',28:'ながら',29:'自动词',30:'他动词',31:'意向形',32:'建议・推量',33:'命令・禁止',34:'〜とおりに',35:'条件形',36:'ように',37:'受身形',38:'のは',39:'原因理由',40:'疑问词嵌入',41:'授受高级',42:'ために',43:'そうです',44:'すぎます',45:'場合は',46:'ところです',47:'そうです',48:'使役形',49:'尊敬语',50:'謙譲語'};
    return '第'+n+'课｜'+(topics[n]||'みんなの日本語');
  }
  function currentLessonFromPage(){
    var path=location.pathname;
    var m=path.match(/lesson-(\d+)\.html/i);
    if(m)return Number(m[1]);
    var a=document.getElementById('continueBtn');
    var h=a&&a.getAttribute('href')||'';
    var m2=h.match(/lesson-(\d+)/i);
    return m2?Number(m2[1]):0;
  }
  function key(){return 'minna_recent_lessons';}
  function getRecent(){
    try{var v=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}
  }
  function setRecent(list){localStorage.setItem(key(),JSON.stringify(list.slice(0,8)));}
  function recordCurrent(){
    var n=currentLessonFromPage();
    if(!n)return;
    var list=getRecent().filter(function(x){return Number(x.n)!==n;});
    list.unshift({n:n,title:lessonTitle(n),url:lessonUrl(n),at:new Date().toISOString()});
    setRecent(list);
  }
  function fmt(raw){
    if(!raw)return '刚刚';
    var d=new Date(raw);if(isNaN(d.getTime()))return '刚刚';
    var diff=Math.max(0,Date.now()-d.getTime());
    var min=Math.floor(diff/60000),hr=Math.floor(min/60),day=Math.floor(hr/24);
    if(min<1)return '刚刚';
    if(min<60)return min+'分钟前';
    if(hr<24)return hr+'小时前';
    return day+'天前';
  }
  function ensureStyle(){
    if(document.getElementById('minnaRecentStyle'))return;
    var s=document.createElement('style');s.id='minnaRecentStyle';
    s.textContent='\
      .recentPanel{background:linear-gradient(135deg,#fff,#f8fafc)}\
      .recentHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}\
      .recentGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:10px}\
      .recentCard{display:block;text-decoration:none;color:inherit;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:12px;min-height:108px}\
      .recentCard:hover{border-color:#2563eb;box-shadow:0 8px 20px rgba(37,99,235,.12)}\
      .recentNo{font-size:22px;font-weight:1000;color:#2563eb}\
      .recentTitle{font-weight:1000;margin-top:4px}\
      .recentTime{font-size:12px;color:#64748b;margin-top:6px}\
      .recentClear{border:0;background:#e2e8f0;border-radius:12px;padding:8px 10px;font-weight:1000;cursor:pointer}\
      .recentEmpty{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:16px;padding:14px;margin-top:10px;color:#64748b}\
      @media(max-width:980px){.recentGrid{grid-template-columns:1fr 1fr}}\
      @media(max-width:520px){.recentGrid{grid-template-columns:1fr}}\
    ';
    document.head.appendChild(s);
  }
  function render(){
    ensureStyle();
    var dash=document.getElementById('studyDashboard');
    if(!dash)return;
    var checklist=document.getElementById('dailyChecklist');
    var anchor=checklist||dash;
    var panel=document.getElementById('recentLearningPanel');
    if(!panel){panel=document.createElement('section');panel.id='recentLearningPanel';panel.className='panel recentPanel';anchor.parentNode.insertBefore(panel,anchor.nextSibling);}
    var list=getRecent().slice(0,5);
    panel.innerHTML='<div class="recentHead"><div><h2>🕘 最近学习</h2><p class="small">自动记录本机最近打开过的课程，方便下次继续。</p></div><button class="recentClear" id="recentClearBtn">清空记录</button></div>'+(list.length?'<div class="recentGrid">'+list.map(function(x){return '<a class="recentCard" href="'+esc(x.url)+'"><div class="recentNo">第'+esc(x.n)+'课</div><div class="recentTitle">'+esc((x.title||lessonTitle(x.n)).replace(/^第\d+课｜/,''))+'</div><div class="recentTime">'+esc(fmt(x.at))+'</div></a>';}).join('')+'</div>':'<div class="recentEmpty">还没有最近学习记录。点击“继续学习”或打开任意课程后，这里会自动出现。</div>');
    var clear=document.getElementById('recentClearBtn');
    if(clear)clear.onclick=function(){localStorage.removeItem(key());render();};
  }
  function start(){
    recordCurrent();
    render();
    var timer=null;
    var obs=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(render,280);});
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
