// Minna Home v20.0
// Compact v20 entry focused on the unified JSON player, content audit, and direct lesson access.
(function(){
  const VERSION='20.0';
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const lessonUrl=n=>`./minna-no-nihongo-lesson-${pad(n)}.html?v=${VERSION}`;
  const topics={
    1:['名词句・自我介绍','JSON/Supabase'],2:['これ・それ・あれ','Mastery migrated'],3:['ここ・そこ・あそこ','Mastery migrated'],4:['时间・星期','Mastery migrated'],5:['移动・交通','Mastery migrated'],6:['动词ます形','Mastery migrated'],7:['工具・授受基础','Mastery migrated'],8:['形容词','Mastery migrated'],9:['好き・上手','Mastery migrated'],10:['存在句','Mastery migrated'],11:['数量表达','Mastery migrated'],12:['过去式・比较','Mastery migrated'],13:['想要・目的','Mastery migrated'],14:['て形','Mastery migrated'],15:['て形许可','Mastery migrated'],16:['连接动作','Mastery migrated'],17:['ない形','Mastery migrated'],18:['辞书形','Mastery migrated'],19:['た形','Mastery migrated'],20:['普通形','Mastery migrated'],21:['と思います','Mastery migrated'],22:['名词修饰','Mastery migrated'],23:['とき・と','Mastery migrated'],24:['くれます','Mastery migrated'],25:['たら・ても','Mastery migrated'],26:['んです','Practice seed'],27:['可能形','Practice seed'],28:['ながら','Practice seed'],29:['自动词','Practice seed'],30:['他动词','Practice seed'],31:['意向形','Practice seed'],32:['建议・推量','Practice seed'],33:['命令・禁止','Practice seed'],34:['〜とおりに','Practice seed'],35:['条件形','Practice seed'],36:['ように','Practice seed'],37:['受身形','Practice seed'],38:['のは','Practice seed'],39:['原因理由','Practice seed'],40:['疑问词嵌入','Practice seed'],41:['授受高级','Practice seed'],42:['ために','Practice seed'],43:['そうです','Practice seed'],44:['すぎます','Practice seed'],45:['場合は','Practice seed'],46:['ところです','Practice seed'],47:['そうです','Practice seed'],48:['使役形','Practice seed'],49:['尊敬语','Practice seed'],50:['谦让语','Practice seed']
  };
  const lessons=Array.from({length:50},(_,i)=>{const n=i+1,t=topics[n];return{n,topic:t[0],tag:t[1],url:lessonUrl(n)}});
  const stages=[['初级 I 前半',1,13],['初级 I 后半',14,25],['初级 II 前半',26,38],['初级 II 后半',39,50]];
  let query=localStorage.getItem('minna_home_v20_query')||'',filter='all';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function render(){
    document.title='《みんなの日本語 初級》AI学习系统 v20.0';
    $('app').innerHTML=`<header class="hero"><div class="wrap topbar"><div><span class="badge">Minna AI Learning System v${VERSION}</span><h1>《みんなの日本語 初級》AI互动学习系统</h1><p>第 1-50 课统一进入 JSON/Supabase 播放器；第 2-25 课接入旧版 Mastery 练习，第 26-50 课已有可练习基础骨架。</p><p class="small heroNote">课程页优先读取 Supabase published；如果数据库内容为空或缺少 practice，会自动使用 v20 适配器从旧版数据生成即时练习。</p></div></div><div class="wrap quicklinks"><a class="primary" href="${lessonUrl(1)}">开始第1课</a><a href="./minna-content-audit.html?v=${VERSION}">全站内容体检</a><a href="./minna-admin.html?v=${VERSION}">管理员后台</a><a href="./minna-wrongbook.html?v=${VERSION}">全站错题本</a><a href="./minna-user-manual.html?v=${VERSION}">使用说明</a></div></header><main class="wrap"><section class="panel"><h2>课程数据策略</h2><p>文件 JSON、Supabase published 和旧版 Mastery 数据已经接到同一个播放器。后续正式维护时，仍建议在后台把精修后的 JSON 发布到数据库。</p><p class="buttons"><a class="ghost" href="./minna-content-audit.html?v=${VERSION}">运行全站体检</a><a class="light" href="${lessonUrl(2)}&source=file">第2课文件预览</a><a class="light" href="${lessonUrl(26)}&source=file">第26课骨架预览</a></p></section><section class="panel"><h2>学习路径地图 v20.0</h2><div class="filters"><input id="searchBox" value="${esc(query)}" placeholder="搜索：第2课 / て形 / 敬语 / Mastery"><select id="filterBox"><option value="all">全部</option><option value="migrated">Mastery migrated</option><option value="seed">Practice seed</option></select></div><div id="lessonGrid"></div></section><section class="panel"><h2>系统状态</h2><p>新版播放器支持核心词汇、核心语法、核心例句的即时练习，课末测试、错题本和进度保存保持原有链路。</p></section></main><footer class="wrap footer">docs/minna-index.html · v${VERSION}</footer>`;
    bind();
    renderGrid();
  }
  function bind(){
    $('searchBox').oninput=e=>{query=e.target.value;localStorage.setItem('minna_home_v20_query',query);renderGrid()};
    $('filterBox').onchange=e=>{filter=e.target.value;renderGrid()};
  }
  function renderGrid(){
    const q=query.trim().toLowerCase();
    const html=stages.map(([title,from,to])=>{
      const rows=lessons.filter(l=>l.n>=from&&l.n<=to).filter(l=>{
        if(filter==='migrated'&&l.tag!=='Mastery migrated')return false;
        if(filter==='seed'&&l.tag!=='Practice seed')return false;
        return !q||(`第${l.n}课 lesson ${l.n} ${l.topic} ${l.tag}`).toLowerCase().includes(q);
      });
      if(!rows.length)return '';
      return `<div class="stageBlock"><h3>${esc(title)}</h3><p><span class="badge2">${rows.length} 课</span></p><div class="lessonGrid">${rows.map(card).join('')}</div></div>`;
    }).join('');
    $('lessonGrid').innerHTML=html||'<p class="small">没有匹配课程。</p>';
  }
  function card(l){return `<a class="lesson unlocked" href="${l.url}"><b>第${l.n}课</b><span>${esc(l.topic)}</span><small>状态：${esc(l.tag)}</small><small>统一 JSON 播放器 v${VERSION}</small></a>`}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
