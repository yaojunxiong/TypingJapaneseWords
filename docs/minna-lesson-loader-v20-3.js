// Minna Lesson Loader v20.3
(function(){
  const VERSION='20.3.3';
  const REQUEST_TIMEOUT=8000;
  const CACHE_PREFIX='minna.lesson.json.';
  const CACHE_TTL_MS=1000*60*60*24*7;

  function pad(n){return String(n).padStart(2,'0')}
  function params(){return new URLSearchParams(location.search)}
  function lessonNo(){
    const b=document.body;
    if(b&&b.dataset.lessonNo)return Number(b.dataset.lessonNo)||1;
    return 1;
  }
  function htmlEscape(s){
    return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})
  }
  function setStatus(text,ok){
    var el=document.getElementById('loaderStatus');
    if(el){el.textContent=text;el.className=ok?'small cloudOk':'small'}
  }
  function cacheKey(n){return CACHE_PREFIX+pad(n)+'.v'+VERSION}
  function readCache(n){
    try{
      const raw=localStorage.getItem(cacheKey(n));
      if(!raw)return null;
      const pack=JSON.parse(raw);
      if(!pack||!pack.text)return null;
      return pack;
    }catch(e){return null}
  }
  function writeCache(n,text,path){
    try{localStorage.setItem(cacheKey(n),JSON.stringify({text,path,ts:Date.now(),version:VERSION}))}catch(e){}
  }
  function safeJsonParse(text,path){
    try{return JSON.parse(text)}
    catch(e){throw new Error('JSON parse failed: '+path+' :: '+e.message)}
  }
  function script(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Failed to load '+src));
      document.body.appendChild(s);
    })
  }
  function showError(err,extra){
    const app=document.getElementById('app');
    const detail=extra||{};
    if(!app)return;
    app.innerHTML='\
      <main class="wrap">\
        <section class="panel errorPanel">\
          <div class="badge2">Mobile Safe Loader</div>\
          <h1>课程加载失败</h1>\
          <p class="small">手机端已停止无限 Loading，请根据下面信息排查。</p>\
          <div class="errorBox">\
            <p><b>错误信息：</b></p>\
            <pre>'+htmlEscape(err&&err.message?err.message:err)+'</pre>\
            <p><b>JSON 路径：</b><br>'+htmlEscape(detail.path||'unknown')+'</p>\
            <p><b>HTTP 状态：</b> '+htmlEscape(detail.status||'unknown')+'</p>\
            <p><b>缓存状态：</b> '+htmlEscape(detail.cache||'unknown')+'</p>\
            <p><b>User Agent：</b><br>'+htmlEscape(navigator.userAgent)+'</p>\
          </div>\
          <div class="buttons">\
            <button class="primary" onclick="location.reload()">重新加载</button>\
            <a class="light" href="./minna-index.html?v='+VERSION+'">返回首页</a>\
          </div>\
        </section>\
      </main>';
  }
  function template(n,reason){
    return {schema:'minna.lesson.v1',course:'minna',lessonNo:n,lessonId:'minna_lesson_'+pad(n),title:{zh:'第'+n+'课',en:'Lesson '+n,ja:'第'+n+'課'},subtitle:{zh:'维护中',en:'Editing',ja:'編集中'},focus:{zh:reason||'维护中'},sections:[]};
  }
  async function loadFileJson(n){
    const path='./data/minna/lessons/lesson-'+pad(n)+'.json?v='+VERSION;
    const old=readCache(n);

    if(old&&Date.now()-Number(old.ts||0)<CACHE_TTL_MS&&params().get('refresh')!=='1'){
      setStatus('使用本地缓存，手机端快速打开。',true);
      window.MinnaLessonContentSource={type:'cache',path:old.path||path,cached_at:old.ts};
      return safeJsonParse(old.text,old.path||path);
    }

    setStatus('正在从服务器加载 JSON...',false);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);
    try{
      const res=await fetch(path,{cache:'no-store',signal:controller.signal});
      if(!res.ok){
        const err=new Error('Lesson JSON not found');
        err.status=res.status; err.path=path; throw err;
      }
      const text=await res.text();
      const data=safeJsonParse(text,path);
      writeCache(n,text,path);
      setStatus('JSON 加载成功，已缓存到本机。',true);
      window.MinnaLessonContentSource={type:'file',path};
      return data;
    }catch(e){
      if(e.name==='AbortError')e.message='JSON loading timeout after '+REQUEST_TIMEOUT+'ms';
      e.path=e.path||path;
      if(old&&old.text){
        console.warn('[Minna Loader] Network failed, using stale cache:',e);
        setStatus('网络加载失败，已使用旧缓存。',true);
        window.MinnaLessonContentSource={type:'stale-cache',path:old.path||path,error:e.message,cached_at:old.ts};
        return safeJsonParse(old.text,old.path||path);
      }
      throw e;
    }finally{clearTimeout(timer)}
  }
  async function loadContent(n){
    try{return await loadFileJson(n)}
    catch(e){
      console.warn('[Minna Loader]',e);
      showError(e,{path:e.path,status:e.status,cache:readCache(n)?'available but invalid':'empty'});
      return template(n,e.message);
    }
  }
  async function start(){
    const n=lessonNo();
    try{
      window.MinnaCurrentLessonJson=await loadContent(n);
      setStatus('正在启动播放器...',true);
      await script('./minna-player-v20-3.js?v='+VERSION);
    }catch(e){showError(e,{path:e.path,status:e.status})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();