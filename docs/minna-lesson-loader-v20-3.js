// Minna Lesson Loader v20.3
(function(){
  const VERSION='20.3.2';
  const SUPABASE_URL='https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY='sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  const REQUEST_TIMEOUT=8000;
  const topicMap={1:['名词句・自我介绍','Noun sentences / self-introduction','名詞文・自己紹介']};

  function pad(n){return String(n).padStart(2,'0')}
  function params(){return new URLSearchParams(location.search)}

  function withTimeout(promise,ms,label){
    return Promise.race([
      promise,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error((label||'request')+' timeout after '+ms+'ms')),ms))
    ]);
  }

  function lessonNo(){
    const b=document.body;
    if(b&&b.dataset.lessonNo)return Number(b.dataset.lessonNo)||1;
    return 1;
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
            <pre>'+String(err&&err.message?err.message:err)+'</pre>\
            <p><b>JSON 路径：</b><br>'+(detail.path||'unknown')+'</p>\
            <p><b>HTTP 状态：</b> '+(detail.status||'unknown')+'</p>\
            <p><b>User Agent：</b><br>'+navigator.userAgent+'</p>\
          </div>\
          <div class="buttons">\
            <button class="primary" onclick="location.reload()">重新加载</button>\
            <a class="light" href="./minna-index.html?v='+VERSION+'">返回首页</a>\
          </div>\
        </section>\
      </main>';
  }

  function template(n,reason){
    return {
      schema:'minna.lesson.v1',
      course:'minna',
      lessonNo:n,
      lessonId:'minna_lesson_'+pad(n),
      title:{zh:'第'+n+'课',en:'Lesson '+n,ja:'第'+n+'課'},
      subtitle:{zh:'维护中',en:'Editing',ja:'編集中'},
      focus:{zh:reason||'维护中'},
      sections:[]
    };
  }

  function safeJsonParse(text,path){
    try{
      return JSON.parse(text);
    }catch(e){
      throw new Error('JSON parse failed: '+path+' :: '+e.message);
    }
  }

  async function loadFileJson(n){
    const path='./data/minna/lessons/lesson-'+pad(n)+'.json?v='+VERSION;

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);

    try{
      const res=await fetch(path,{cache:'no-store',signal:controller.signal});

      if(!res.ok){
        const err=new Error('Lesson JSON not found');
        err.status=res.status;
        err.path=path;
        throw err;
      }

      const text=await res.text();
      const data=safeJsonParse(text,path);

      window.MinnaLessonContentSource={type:'file',path};
      return data;
    }catch(e){
      if(e.name==='AbortError'){
        e.message='JSON loading timeout after '+REQUEST_TIMEOUT+'ms';
      }
      e.path=e.path||path;
      throw e;
    }finally{
      clearTimeout(timer);
    }
  }

  async function loadContent(n){
    try{
      return await loadFileJson(n);
    }catch(e){
      console.warn('[Minna Loader]',e);
      showError(e,{path:e.path,status:e.status});
      return template(n,e.message);
    }
  }

  async function start(){
    const n=lessonNo();

    try{
      window.MinnaCurrentLessonJson=await loadContent(n);
      await script('./minna-player-v20-3.js?v='+VERSION);
    }catch(e){
      showError(e,{path:e.path,status:e.status});
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start);
  }else{
    start();
  }
})();