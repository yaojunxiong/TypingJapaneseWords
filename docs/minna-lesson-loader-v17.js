// Minna Lesson Loader v20.3
// Prefer Supabase published lesson content. Fallback to static JSON file. If both are missing, generate a minimal editable template.
// Debug query params:
//   ?source=file      force static JSON file
//   ?source=supabase  force Supabase published content
//   ?source=template  force generated minimal template
(function(){
  const VERSION='20.3';
  const SUPABASE_URL='https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY='sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  const topicMap={
    1:['名词句・自我介绍','Noun sentences / self-introduction','名詞文・自己紹介'],2:['これ・それ・あれ','これ・それ・あれ','これ・それ・あれ'],3:['ここ・そこ・あそこ','Places and directions','ここ・そこ・あそこ'],4:['时间・星期','Time and days of the week','時間・曜日'],5:['移动・交通','Movement and transportation','移動・交通'],6:['动词ます形','ます-form verbs','動詞ます形'],7:['工具・授受基础','Tools and giving/receiving basics','道具・授受表現'],8:['形容词','Adjectives','形容詞'],9:['好き・上手','Likes and skills','好き・上手'],10:['存在句','Existence sentences','存在文'],11:['数量表达','Quantity expressions','数量表現'],12:['过去式・比较','Past tense and comparison','過去形・比較'],13:['想要・目的','Wanting and purpose','希望・目的'],14:['て形','て-form','て形'],15:['て形许可','Permission with て-form','て形の許可'],16:['连接动作','Connecting actions','動作の接続'],17:['ない形','ない-form','ない形'],18:['辞书形','Dictionary form','辞書形'],19:['た形','ta-form','た形'],20:['普通形','Plain form','普通形'],21:['と思います','Expressing opinions','〜と思います'],22:['名词修饰','Noun modification','名詞修飾'],23:['とき・と','When / if','とき・と'],24:['くれます','Receiving favors','くれます'],25:['たら・ても','Conditional expressions','たら・ても'],26:['んです','Explaining and requesting','んです'],27:['可能形','Potential form','可能形'],28:['ながら','Doing two actions','ながら'],29:['自动词','Intransitive verbs','自動詞'],30:['他动词','Transitive verbs','他動詞'],31:['意向形','Volitional form','意向形'],32:['建议・推量','Advice and conjecture','助言・推量'],33:['命令・禁止','Commands and prohibitions','命令・禁止'],34:['〜とおりに','Following instructions','〜とおりに'],35:['条件形','Conditional form','条件形'],36:['ように','Goals and change','ように'],37:['受身形','Passive form','受身形'],38:['のは','Nominalization','のは'],39:['原因理由','Reasons and causes','原因・理由'],40:['疑问词嵌入','Embedded questions','疑問詞節'],41:['授受高级','Advanced giving and receiving','授受表現'],42:['ために','Purpose','ために'],43:['そうです','Appearance','そうです'],44:['すぎます','Excess','すぎます'],45:['場合は','In case','場合は'],46:['ところです','Action stages','ところです'],47:['そうです','Hearsay','そうです'],48:['使役形','Causative form','使役形'],49:['尊敬语','Honorific language','尊敬語'],50:['谦让语','Humble language','謙譲語']
  };
  function pad(n){return String(n).padStart(2,'0')}
  function params(){return new URLSearchParams(location.search)}
  function lessonNo(){
    const b=document.body;
    if(b&&b.dataset.lessonNo)return Number(b.dataset.lessonNo)||1;
    const m=location.pathname.match(/lesson-(\d+)/);
    return m?Number(m[1]):1;
  }
  function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+src));document.body.appendChild(s)})}
  function showError(err){
    const app=document.getElementById('app');
    if(app)app.innerHTML='<main class="wrap"><section class="panel"><h1>Lesson Content Loader Error</h1><p class="small">'+String(err.message||err)+'</p><p><a href="./minna-index.html?v='+VERSION+'">Back to Home</a></p></section></main>';
  }
  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
  function isPassedState(s){
    if(!s)return false;
    const m=s.mastery||{};
    const wrong=s.wrong_count!=null?Number(s.wrong_count):s.wrong?Object.keys(s.wrong).filter(k=>s.wrong[k]).length:0;
    return !!s.mastery_passed||((m.vocab||0)>=100&&(m.grammar||0)>=80&&(m.examples||0)>=80&&(m.final||0)>=80&&wrong===0);
  }
  function localProgress(n){
    const no=pad(n);
    const keys=[`minna_lesson_${no}`,`lesson${no}v8`,`lesson${no}v7`,`lesson${no}v6`,`lesson${no}v5`,`lesson${n}v8`,`lesson${n}v7`,`lesson${n}v6`,`lesson${n}v5`];
    for(const key of keys){const value=readJson(key);if(value)return value}
    return null;
  }
  async function previousPassed(n){
    if(isPassedState(localProgress(n)))return true;
    if(window.MinnaAuth&&MinnaAuth.loadProgress){
      try{
        const row=await MinnaAuth.loadProgress('minna_lesson_'+pad(n));
        if(row&&isPassedState(row.progress))return true;
      }catch(e){console.warn('[Minna Lock] previous cloud progress skipped:',e.message||e)}
    }
    return false;
  }
  function showLocked(n,role){
    const app=document.getElementById('app');
    const prev=Math.max(1,n-1);
    const previewUrl='./minna-lesson-v16.html?n='+n+'&v='+VERSION+'&mode=preview';
    const prevUrl='./minna-lesson-v16.html?n='+prev+'&v='+VERSION;
    const roleText=role&&role.effectiveRole?role.effectiveRole:'normal';
    if(app)app.innerHTML='<main class="wrap"><section class="panel lockedPanel"><span class="badge2">Sequential Unlock</span><h1>第 '+n+' 课暂未解锁</h1><p>请先完成第 '+prev+' 课。VIP 会员和管理员不受锁课限制。</p><p class="small">Current role: '+roleText+'</p><p class="buttons"><a class="primary" href="'+prevUrl+'">去第 '+prev+' 课</a><a class="light" href="'+previewUrl+'">预览第 '+n+' 课</a><a class="ghost" href="./minna-index.html?v='+VERSION+'">回首页</a></p></section></main>';
  }
  async function canEnterLesson(n){
    const mode=params().get('mode');
    if(mode==='preview'){window.MinnaPreviewMode=true;return true}
    if(n===1)return true;
    let role={effectiveRole:'normal',bypassLessonLock:false};
    if(window.MinnaAuth&&MinnaAuth.init&&MinnaAuth.loadRole){
      try{
        await MinnaAuth.init({lessonId:'minna_lesson_'+pad(n)});
        role=await MinnaAuth.loadRole(true);
      }catch(e){console.warn('[Minna Lock] role fallback:',e.message||e)}
    }
    if(role&&role.bypassLessonLock)return true;
    if(await previousPassed(n-1))return true;
    showLocked(n,role);
    return false;
  }
  function makeClient(){
    if(window.MinnaAuth&&MinnaAuth.client){try{const c=MinnaAuth.client();if(c)return c}catch(e){}}
    if(window.supabase)return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return null;
  }
  function template(n,reason){
    const m=topicMap[n]||['待维护','To be edited','編集中'];
    window.MinnaLessonContentSource={type:'template',forced:params().get('source')==='template',reason:reason||'missing content'};
    return {
      schema:'minna.lesson.v1',
      course:'minna',
      lessonNo:n,
      lessonId:'minna_lesson_'+pad(n),
      title:{zh:'第'+n+'课',en:'Lesson '+n,ja:'第'+n+'課'},
      subtitle:{zh:m[0],en:m[1],ja:m[2]},
      focus:{zh:'本课内容正在维护中。管理员可以在后台生成模板、补充内容并发布到 Supabase。',en:'This lesson is being edited. Admins can generate a template, add content, and publish it to Supabase.',ja:'この課は編集中です。'},
      sections:[
        {type:'vocab',id:'l'+pad(n)+'_vocab',title:{zh:'核心词汇',en:'Core Vocabulary',ja:'基本語彙'},items:[]},
        {type:'grammar',id:'l'+pad(n)+'_grammar',title:{zh:'核心语法',en:'Core Grammar',ja:'基本文法'},items:[]},
        {type:'examples',id:'l'+pad(n)+'_examples',title:{zh:'核心例句',en:'Core Examples',ja:'基本例文'},items:[]},
        {type:'quiz',id:'l'+pad(n)+'_quiz',title:{zh:'综合测试',en:'Final Test',ja:'まとめテスト'},items:[]}
      ]
    };
  }
  async function loadSupabase(n){
    const supa=makeClient();
    if(!supa)throw new Error('Supabase client not available');
    const {data,error}=await supa.from('minna_course_lessons').select('content,version,updated_at,updated_email').eq('course','minna').eq('lesson_no',n).eq('status','published').maybeSingle();
    if(error)throw error;
    if(!data||!data.content)throw new Error('No published Supabase content for lesson '+n);
    window.MinnaLessonContentSource={type:'supabase',forced:params().get('source')==='supabase',version:data.version,updated_at:data.updated_at,updated_email:data.updated_email||''};
    return data.content;
  }
  async function loadFileJson(n){
    const path='./data/minna/lessons/lesson-'+pad(n)+'.json?v='+VERSION;
    const res=await fetch(path,{cache:'no-store'});
    if(!res.ok)throw new Error('Lesson JSON not found: '+path);
    window.MinnaLessonContentSource={type:'file',forced:params().get('source')==='file',path};
    return await res.json();
  }
  async function loadContent(n){
    const source=params().get('source');
    if(source==='template')return template(n,'forced template');
    if(source==='file')return await loadFileJson(n);
    if(source==='supabase')return await loadSupabase(n);
    try{return await loadSupabase(n)}catch(e1){
      console.warn('[Minna v19] Supabase content fallback:',e1.message);
      try{return await loadFileJson(n)}catch(e2){
        console.warn('[Minna v19] File JSON fallback to generated template:',e2.message);
        return template(n,e1.message+'; '+e2.message);
      }
    }
  }
  async function upgradeContent(n,obj){
    if(n<=1)return obj;
    try{
      if(!window.MinnaLegacyJsonAdapterV20)await script('./minna-legacy-json-adapter-v20.js?v='+VERSION);
      if(window.MinnaLegacyJsonAdapterV20&&MinnaLegacyJsonAdapterV20.upgrade)return await MinnaLegacyJsonAdapterV20.upgrade(n,obj);
    }catch(e){
      console.warn('[Minna v20] Legacy JSON adapter skipped:',e.message);
    }
    return obj;
  }
  async function start(){
    const n=lessonNo();
    document.body.dataset.lessonNo=String(n);
    document.body.dataset.lessonId=document.body.dataset.lessonId||('minna_lesson_'+pad(n));
    try{
      if(!await canEnterLesson(n))return;
      window.MinnaCurrentLessonJson=await upgradeContent(n,await loadContent(n));
      await script('./minna-player-v17.js?v='+VERSION);
    }catch(e){showError(e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
