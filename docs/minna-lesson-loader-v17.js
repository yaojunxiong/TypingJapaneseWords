// Minna Lesson Loader v17.0
// Loads lesson JSON, then the JSON-driven player.
(function(){
  const VERSION='17.0';
  function pad(n){return String(n).padStart(2,'0')}
  function lessonNo(){
    const b=document.body;
    if(b&&b.dataset.lessonNo)return Number(b.dataset.lessonNo)||1;
    const m=location.pathname.match(/lesson-(\d+)/);
    return m?Number(m[1]):1;
  }
  function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+src));document.body.appendChild(s)})}
  function showError(err){
    const app=document.getElementById('app');
    if(app)app.innerHTML='<main class="wrap"><section class="panel"><h1>JSON Loader Error</h1><p class="small">'+String(err.message||err)+'</p><p><a href="./minna-index.html?v=17.0">Back to Home</a></p></section></main>';
  }
  async function loadJson(n){
    const path='./data/minna/lessons/lesson-'+pad(n)+'.json?v='+VERSION;
    const res=await fetch(path,{cache:'no-store'});
    if(!res.ok)throw new Error('Lesson JSON not found: '+path);
    return await res.json();
  }
  async function start(){
    const n=lessonNo();
    document.body.dataset.lessonNo=String(n);
    document.body.dataset.lessonId=document.body.dataset.lessonId||('minna_lesson_'+pad(n));
    try{
      window.MinnaCurrentLessonJson=await loadJson(n);
      await script('./minna-player-v17.js?v='+VERSION);
    }catch(e){showError(e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
