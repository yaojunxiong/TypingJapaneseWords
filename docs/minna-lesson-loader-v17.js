// Minna Lesson Loader v17.2
// Prefer Supabase published lesson content. Fallback to static JSON file.
(function(){
  const VERSION='17.2';
  const SUPABASE_URL='https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY='sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
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
    if(app)app.innerHTML='<main class="wrap"><section class="panel"><h1>Lesson Content Loader Error</h1><p class="small">'+String(err.message||err)+'</p><p><a href="./minna-index.html?v=17.2">Back to Home</a></p></section></main>';
  }
  function makeClient(){
    if(window.MinnaAuth&&MinnaAuth.client){try{const c=MinnaAuth.client();if(c)return c}catch(e){}}
    if(window.supabase)return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return null;
  }
  async function loadSupabase(n){
    const supa=makeClient();
    if(!supa)throw new Error('Supabase client not available');
    const {data,error}=await supa.from('minna_course_lessons').select('content,version,updated_at').eq('course','minna').eq('lesson_no',n).eq('status','published').maybeSingle();
    if(error)throw error;
    if(!data||!data.content)throw new Error('No published Supabase content for lesson '+n);
    window.MinnaLessonContentSource={type:'supabase',version:data.version,updated_at:data.updated_at};
    return data.content;
  }
  async function loadFileJson(n){
    const path='./data/minna/lessons/lesson-'+pad(n)+'.json?v='+VERSION;
    const res=await fetch(path,{cache:'no-store'});
    if(!res.ok)throw new Error('Lesson JSON not found: '+path);
    window.MinnaLessonContentSource={type:'file',path};
    return await res.json();
  }
  async function loadContent(n){
    try{return await loadSupabase(n)}catch(e){console.warn('[Minna v17] Supabase content fallback:',e.message);return await loadFileJson(n)}
  }
  async function start(){
    const n=lessonNo();
    document.body.dataset.lessonNo=String(n);
    document.body.dataset.lessonId=document.body.dataset.lessonId||('minna_lesson_'+pad(n));
    try{
      window.MinnaCurrentLessonJson=await loadContent(n);
      await script('./minna-player-v17.js?v='+VERSION);
    }catch(e){showError(e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
