// Minna Lesson Loader v16.6
// One loader for all lesson shells. It loads optional per-lesson data, then the shared v16 player.
(function(){
  const VERSION='16.6';
  function pad(n){return String(n).padStart(2,'0')}
  function lessonNo(){
    const body=document.body;
    if(body&&body.dataset.lessonNo)return Number(body.dataset.lessonNo)||1;
    const m=location.pathname.match(/lesson-(\d+)/);
    return m?Number(m[1]):1;
  }
  function script(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Failed to load '+src));
      document.body.appendChild(s);
    });
  }
  function showError(err){
    const app=document.getElementById('app');
    if(!app)return;
    app.innerHTML='<main class="wrap"><section class="panel"><h1>Lesson Loader Error</h1><p class="small">'+String(err.message||err)+'</p><p><a href="./minna-index.html?v=16.6">Back to Home</a></p></section></main>';
  }
  async function start(){
    const n=lessonNo();
    document.body.dataset.lessonNo=String(n);
    document.body.dataset.lessonId=document.body.dataset.lessonId||('minna_lesson_'+pad(n));
    try{
      // Lesson 1 is bundled in the registry. Lesson 2+ can be independent files.
      if(n!==1){
        try{await script('./minna-lesson-data-'+pad(n)+'-v16.js?v='+VERSION)}
        catch(e){console.warn(e.message)}
      }
      await script('./minna-player-v16.js?v='+VERSION);
    }catch(e){showError(e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
