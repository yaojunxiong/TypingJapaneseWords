// Minna Wrongbook v18.9
// Site-wide wrong-answer notebook with direct full-course and wrong-only practice actions.
(function(){
  const VERSION='18.9';
  const SUPABASE_URL='https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY='sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  const $=id=>document.getElementById(id);
  function pad(n){return String(n).padStart(2,'0')}
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function pick(v){if(!v)return'';return v.zh||v.en||v.ja||''}
  function optText(o){const t=o&&o.text||{};return t.jp||pick(t)}
  function lessonUrl(n){return `./minna-no-nihongo-lesson-${pad(n)}.html?v=${VERSION}`}
  function wrongPracticeUrl(n, qid){return `./minna-no-nihongo-lesson-${pad(n)}.html?mode=wrong&v=${VERSION}${qid?'#'+encodeURIComponent(qid):''}`}
  function supa(){if(window.MinnaAuth&&MinnaAuth.client){try{return MinnaAuth.client()}catch(e){}}return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}
  async function loadLessonContent(n){
    try{
      const {data,error}=await supa().from('minna_course_lessons').select('content,version,updated_at').eq('course','minna').eq('lesson_no',n).eq('status','published').maybeSingle();
      if(error)throw error;
      if(data&&data.content)return {content:data.content,source:'Supabase published v'+(data.version||'')};
    }catch(e){console.warn('[wrongbook] supabase fallback',n,e.message)}
    const res=await fetch(`./data/minna/lessons/lesson-${pad(n)}.json?v=${VERSION}`,{cache:'no-store'});
    if(!res.ok)throw new Error('lesson JSON not found: '+n);
    return {content:await res.json(),source:'file JSON'};
  }
  function quizItems(lesson){return (lesson.sections||[]).filter(s=>s.type==='quiz').flatMap(s=>s.items||[])}
  function findCorrect(q){return (q.options||[]).find(o=>o.correct)}
  async function collectWrongItems(){
    if(!window.MinnaAuth)throw new Error('MinnaAuth 未加载');
    await MinnaAuth.init({lessonId:'minna_wrongbook'});
    const rows=await MinnaAuth.listProgress();
    const out=[];
    for(const row of rows||[]){
      const p=row.progress||{};
      const lessonNo=Number(p.lesson_no)||Number(String(row.lesson_id||'').match(/(\d+)$/)?.[1]);
      const wrongIds=p.wrong_ids||Object.keys(p.quiz_answered||{}).filter(k=>p.quiz_answered[k]===false);
      if(!lessonNo||!wrongIds.length)continue;
      let lessonPack;
      try{lessonPack=await loadLessonContent(lessonNo)}catch(e){out.push({lessonNo,error:e.message,items:[]});continue}
      const lesson=lessonPack.content;
      const qmap=new Map(quizItems(lesson).map(q=>[q.id,q]));
      const items=wrongIds.map(id=>qmap.get(id)).filter(Boolean).map(q=>({q,correct:findCorrect(q)}));
      if(items.length)out.push({lessonNo,lesson,source:lessonPack.source,items,score:p.score||0,wrongCount:wrongIds.length,updated:p.updated_client_at||row.updated_at});
    }
    return out.sort((a,b)=>a.lessonNo-b.lessonNo);
  }
  function shell(){return `<header class="hero"><div class="wrap"><span class="badge">Minna Wrongbook v18.9</span><h1>全站错题本</h1><p>自动汇总所有课程答错的题目，并可直接进入完整课程或只练错题模式。</p><div class="quicklinks"><a href="./minna-index.html?v=${VERSION}">返回主页</a><button id="loginBtn" class="primary">Google 登录</button><button id="refreshBtn" class="light">刷新错题</button></div></div></header><main class="wrap"><section class="panel"><h2>错题总览</h2><div class="cards4"><div><b>错题课程</b><span id="lessonCount">0</span></div><div><b>错题总数</b><span id="wrongCount">0</span></div><div><b>登录状态</b><span id="authText">检查中</span></div><div><b>复习模式</b><span>Wrong Only</span></div></div><p id="status" class="small">正在读取...</p></section><section id="wrongList"></section></main><footer class="wrap footer">docs/minna-wrongbook.html · v18.9</footer>`}
  function renderGroups(groups){
    $('lessonCount').textContent=groups.length;
    $('wrongCount').textContent=groups.reduce((n,g)=>n+(g.items?g.items.length:0),0);
    if(!groups.length){$('wrongList').innerHTML='<section class="panel"><h2>暂无错题</h2><p class="small">完成课程测试并答错后，会自动出现在这里。</p></section>';return}
    $('wrongList').innerHTML=groups.map(g=>`<section class="panel"><h2>第${g.lessonNo}课｜${esc(pick(g.lesson&&g.lesson.title))}</h2><p class="small">${esc(pick(g.lesson&&g.lesson.subtitle))} · ${esc(g.source||'')} · 错题 ${g.items.length}</p><p class="quicklinks"><a class="primary" href="${wrongPracticeUrl(g.lessonNo)}">只练本课错题</a><a class="light" href="${lessonUrl(g.lessonNo)}">进入完整课程</a><a class="light" href="${lessonUrl(g.lessonNo)}#wrongBook">回到本课错题本</a></p><div class="wrongGrid">${g.items.map((it,i)=>wrongCard(g,it,i)).join('')}</div></section>`).join('')
  }
  function wrongCard(g,it,i){const q=it.q;return `<article class="wrongCard"><h3>${i+1}. ${esc(pick(q.question))}</h3><p><b>正确答案：</b>${esc(it.correct?optText(it.correct):'')}</p><p class="small">${esc(pick(q.explanation))}</p><p class="quicklinks"><a class="primary" href="${wrongPracticeUrl(g.lessonNo,q.id)}">只练这题</a><a class="light" href="${lessonUrl(g.lessonNo)}#${esc(q.id)}">回到原题</a></p></article>`}
  async function load(){
    $('status').textContent='正在读取错题...';
    try{
      if(window.MinnaAuth){await MinnaAuth.init({lessonId:'minna_wrongbook'});const u=MinnaAuth.getUser&&MinnaAuth.getUser();$('authText').textContent=u?(u.email||'已登录'):'未登录'}
      const groups=await collectWrongItems();
      renderGroups(groups);
      $('status').innerHTML='<span class="ok">读取完成</span>';
    }catch(e){$('status').innerHTML='<span class="bad">读取失败：</span>'+esc(e.message);$('wrongList').innerHTML='<section class="panel"><p class="small">请先登录，并在课程页完成测试。</p></section>'}
  }
  function bind(){$('loginBtn').onclick=()=>window.MinnaAuth&&MinnaAuth.loginWithGoogle();$('refreshBtn').onclick=load}
  function start(){$('app').innerHTML=shell();bind();load()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
