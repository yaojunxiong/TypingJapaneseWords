// Minna home v15.4 data diagnostics
// Checks auth, progress, Supabase client, and public leaderboard availability.
(function(){
  const SUPABASE_URL='https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY='sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  let client=null, installed=false;
  function lang(){return localStorage.getItem('minna_ui_lang')==='en'?'en':'zh'}
  const txt={
    title:{zh:'🧪 数据连接检查 15.4',en:'🧪 Data Connection Check 15.4'},
    desc:{zh:'用于检查主页真实数据链路：登录、云端进度、Supabase、排行榜。',en:'Checks the real home data pipeline: login, cloud progress, Supabase, and leaderboard.'},
    run:{zh:'重新检查',en:'Run Check'},
    auth:{zh:'登录状态',en:'Auth Status'},
    supa:{zh:'Supabase 连接',en:'Supabase Connection'},
    progress:{zh:'云端进度',en:'Cloud Progress'},
    leader:{zh:'公开排行榜',en:'Public Leaderboard'},
    ok:{zh:'正常',en:'OK'},
    fail:{zh:'异常',en:'Issue'},
    checking:{zh:'检查中…',en:'Checking…'},
    noAuth:{zh:'MinnaAuth 未加载',en:'MinnaAuth is not loaded'},
    noSupa:{zh:'Supabase JS 未加载',en:'Supabase JS is not loaded'},
    notLogin:{zh:'未登录或还在初始化',en:'Not signed in or still initializing'},
    noView:{zh:'公开排行榜 view 可能未创建或权限不足',en:'The public leaderboard view may be missing or permission is insufficient'},
    rows:{zh:'条记录',en:'records'},
    users:{zh:'位用户',en:'users'},
    hint:{zh:'如果这里有异常，先修这一层，再继续课程页重构。',en:'If an issue appears here, fix this layer before continuing lesson-page refactoring.'}
  };
  function t(k){return (txt[k]&&txt[k][lang()])||k}
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function getClient(){
    try{
      if(window.MinnaAuth&&MinnaAuth.client){const c=MinnaAuth.client(); if(c)return c;}
    }catch(e){}
    try{
      if(!client&&window.supabase)client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      return client;
    }catch(e){return null}
  }
  function row(label,state,detail){
    const cls=state==='ok'?'ok':state==='bad'?'bad':'auto';
    const word=state==='ok'?t('ok'):(state==='bad'?t('fail'):t('checking'));
    return `<div class="diagRow"><b>${label}</b><span class="diagPill ${cls}">${word}</span><small>${esc(detail||'')}</small></div>`;
  }
  function shell(){
    return `<section class="panel" id="dataDiagV154"><h2>${t('title')}</h2><p class="small">${t('desc')}</p><div id="diagRows">${row(t('auth'),'wait',t('checking'))}${row(t('supa'),'wait',t('checking'))}${row(t('progress'),'wait',t('checking'))}${row(t('leader'),'wait',t('checking'))}</div><p class="buttons"><button id="diagRunBtn" class="ghost">${t('run')}</button></p><p class="small">${t('hint')}</p></section>`;
  }
  function install(){
    const app=document.getElementById('app'); if(!app)return;
    const main=app.querySelector('main'); if(!main)return;
    if(document.getElementById('dataDiagV154'))return;
    const box=document.createElement('div'); box.innerHTML=shell();
    const firstStatus=[...main.querySelectorAll('.panel')].find(x=>(x.textContent||'').includes(lang()==='en'?'Course Status':'课程状态'));
    if(firstStatus)main.insertBefore(box.firstElementChild,firstStatus); else main.appendChild(box.firstElementChild);
    const btn=document.getElementById('diagRunBtn'); if(btn)btn.onclick=run;
    run();
  }
  function setRows(items){const el=document.getElementById('diagRows'); if(el)el.innerHTML=items.join('')}
  async function run(){
    setRows([row(t('auth'),'wait',t('checking')),row(t('supa'),'wait',t('checking')),row(t('progress'),'wait',t('checking')),row(t('leader'),'wait',t('checking'))]);
    const results=[];
    let user=null;
    try{
      if(!window.MinnaAuth)throw new Error(t('noAuth'));
      user=MinnaAuth.getUser&&MinnaAuth.getUser();
      results.push(row(t('auth'),user?'ok':'bad',user&&user.email?user.email:t('notLogin')));
    }catch(e){results.push(row(t('auth'),'bad',e.message))}
    let supa=null;
    try{
      supa=getClient();
      if(!supa)throw new Error(t('noSupa'));
      results.push(row(t('supa'),'ok',SUPABASE_URL));
    }catch(e){results.push(row(t('supa'),'bad',e.message))}
    try{
      if(!window.MinnaAuth||!MinnaAuth.listProgress)throw new Error(t('noAuth'));
      const rows=await MinnaAuth.listProgress();
      results.push(row(t('progress'),'ok',`${Array.isArray(rows)?rows.length:0} ${t('rows')}`));
    }catch(e){results.push(row(t('progress'),'bad',e.message))}
    try{
      if(!supa)throw new Error(t('noSupa'));
      const {data,error}=await supa.from('minna_public_leaderboard').select('*').limit(5);
      if(error)throw error;
      results.push(row(t('leader'),'ok',`${Array.isArray(data)?data.length:0} ${t('users')}`));
    }catch(e){results.push(row(t('leader'),'bad',`${t('noView')}：${e.message}`))}
    setRows(results);
  }
  function injectStyle(){
    if(document.getElementById('diag154Style'))return;
    const s=document.createElement('style');s.id='diag154Style';
    s.textContent='.diagRow{display:grid;grid-template-columns:170px 90px 1fr;gap:10px;align-items:center;border:1px solid #e2e8f0;border-radius:16px;padding:10px;margin:8px 0;background:#f8fafc}.diagPill{display:inline-block;text-align:center;border-radius:999px;padding:4px 9px;font-weight:1000}.diagPill.ok{background:#dcfce7;color:#166534}.diagPill.bad{background:#fee2e2;color:#991b1b}.diagPill.auto{background:#dbeafe;color:#1d4ed8}.diagRow small{color:#64748b;overflow-wrap:anywhere}@media(max-width:700px){.diagRow{grid-template-columns:1fr}.diagPill{text-align:left}}';
    document.head.appendChild(s);
  }
  function start(){
    injectStyle(); install();
    const app=document.getElementById('app');
    if(app&&!installed){installed=true;new MutationObserver(()=>setTimeout(()=>{injectStyle();install()},100)).observe(app,{childList:true,subtree:true});}
    window.addEventListener('storage',()=>setTimeout(()=>{const old=document.getElementById('dataDiagV154');if(old)old.remove();install()},80));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
