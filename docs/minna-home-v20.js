// Minna Home v20.3
// Learner-first entry for the unified JSON player, content audit, and direct lesson access.
(function(){
  const VERSION='20.3';
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const lessonUrl=n=>`./minna-lesson-v16.html?n=${n}&v=${VERSION}`;
  const topics={
    1:[{zh:'名词句・自我介绍',en:'Noun Sentences and Self-introduction'},'JSON/Supabase'],2:[{zh:'これ・それ・あれ',en:'Kore, Sore, Are'},'Mastery migrated'],3:[{zh:'ここ・そこ・あそこ',en:'Koko, Soko, Asoko'},'Mastery migrated'],4:[{zh:'时间・星期',en:'Time and Weekdays'},'Mastery migrated'],5:[{zh:'移动・交通',en:'Movement and Transport'},'Mastery migrated'],6:[{zh:'动词ます形',en:'Verb Masu-form'},'Mastery migrated'],7:[{zh:'工具・授受基础',en:'Tools and Giving/Receiving Basics'},'Mastery migrated'],8:[{zh:'形容词',en:'Adjectives'},'Mastery migrated'],9:[{zh:'好き・上手',en:'Likes and Skills'},'Mastery migrated'],10:[{zh:'存在句',en:'Existence Sentences'},'Mastery migrated'],11:[{zh:'数量表达',en:'Quantity Expressions'},'Mastery migrated'],12:[{zh:'过去式・比较',en:'Past Tense and Comparison'},'Mastery migrated'],13:[{zh:'想要・目的',en:'Wants and Purpose'},'Mastery migrated'],14:[{zh:'て形',en:'Te-form'},'Mastery migrated'],15:[{zh:'て形许可',en:'Te-form Permission'},'Mastery migrated'],16:[{zh:'连接动作',en:'Connecting Actions'},'Mastery migrated'],17:[{zh:'ない形',en:'Nai-form'},'Mastery migrated'],18:[{zh:'辞书形',en:'Dictionary Form'},'Mastery migrated'],19:[{zh:'た形',en:'Ta-form'},'Mastery migrated'],20:[{zh:'普通形',en:'Plain Form'},'Mastery migrated'],21:[{zh:'と思います',en:'To omoimasu'},'Mastery migrated'],22:[{zh:'名词修饰',en:'Noun Modification'},'Mastery migrated'],23:[{zh:'とき・と',en:'Toki and To'},'Mastery migrated'],24:[{zh:'くれます',en:'Kuremasu'},'Mastery migrated'],25:[{zh:'たら・ても',en:'Tara and Temo'},'Mastery migrated'],26:[{zh:'んです',en:'N desu'},'Practice seed'],27:[{zh:'可能形',en:'Potential Form'},'Practice seed'],28:[{zh:'ながら',en:'Nagara'},'Practice seed'],29:[{zh:'自动词',en:'Intransitive Verbs'},'Practice seed'],30:[{zh:'他动词',en:'Transitive Verbs'},'Practice seed'],31:[{zh:'意向形',en:'Volitional Form'},'Practice seed'],32:[{zh:'建议・推量',en:'Advice and Conjecture'},'Practice seed'],33:[{zh:'命令・禁止',en:'Commands and Prohibition'},'Practice seed'],34:[{zh:'〜とおりに',en:'Toori ni'},'Practice seed'],35:[{zh:'条件形',en:'Conditional Form'},'Practice seed'],36:[{zh:'ように',en:'You ni'},'Practice seed'],37:[{zh:'受身形',en:'Passive Form'},'Practice seed'],38:[{zh:'のは',en:'No wa'},'Practice seed'],39:[{zh:'原因理由',en:'Causes and Reasons'},'Practice seed'],40:[{zh:'疑问词嵌入',en:'Embedded Questions'},'Practice seed'],41:[{zh:'授受高级',en:'Advanced Giving and Receiving'},'Practice seed'],42:[{zh:'ために',en:'Tame ni'},'Practice seed'],43:[{zh:'そうです',en:'Sou desu'},'Practice seed'],44:[{zh:'すぎます',en:'Sugimasu'},'Practice seed'],45:[{zh:'場合は',en:'Baai wa'},'Practice seed'],46:[{zh:'ところです',en:'Tokoro desu'},'Practice seed'],47:[{zh:'そうです',en:'Sou desu'},'Practice seed'],48:[{zh:'使役形',en:'Causative Form'},'Practice seed'],49:[{zh:'尊敬语',en:'Honorific Language'},'Practice seed'],50:[{zh:'谦让语',en:'Humble Language'},'Practice seed']
  };
  const lessons=Array.from({length:50},(_,i)=>{const n=i+1,t=topics[n];return{n,topic:t[0],tag:t[1],url:lessonUrl(n)}});
  const stages=[[{zh:'初级 I 前半',en:'Beginner I: First Half'},1,13],[{zh:'初级 I 后半',en:'Beginner I: Second Half'},14,25],[{zh:'初级 II 前半',en:'Beginner II: First Half'},26,38],[{zh:'初级 II 后半',en:'Beginner II: Second Half'},39,50]];
  const copy={
    title:{zh:'《みんなの日本語 初級》AI互动学习系统',en:'Minna no Nihongo Beginner AI Learning System'},
    subtitle:{zh:'50 课统一进入 AI 互动播放器，围绕词汇、语法、例句、测试和错题复习形成完整学习闭环。',en:'All 50 lessons open in one AI interactive player, covering vocabulary, grammar, example sentences, tests, and mistake review.'},
    continueLesson:{zh:'继续第{n}课',en:'Continue Lesson {n}'},currentLesson:{zh:'当前建议：第{n}课',en:'Recommended: Lesson {n}'},wrongbook:{zh:'错题本',en:'Mistakes'},
    mastered:{zh:'已掌握',en:'Mastered'},records:{zh:'有记录',en:'With Records'},total:{zh:'课程总数',en:'Total Lessons'},roleNormal:{zh:'普通用户',en:'Standard'},roleVip:{zh:'VIP 会员',en:'VIP'},roleAdmin:{zh:'管理员',en:'Admin'},roleLoading:{zh:'身份读取中',en:'Checking Role'},roleOpen:{zh:'全课开放',en:'All Lessons Open'},rolePath:{zh:'顺序解锁',en:'Sequential Unlock'},
    today:{zh:'今日学习仪表盘',en:"Today's Learning Dashboard"},todayDesc:{zh:'优先继续未完成课程；需要维护内容时再进入体检和后台。',en:'Continue unfinished lessons first; use audit and admin tools when maintaining content.'},continue:{zh:'继续学习',en:'Continue Learning'},audit:{zh:'内容体检',en:'Content Audit'},admin:{zh:'管理员后台',en:'Admin'},manual:{zh:'使用说明',en:'User Guide'},design:{zh:'系统设计',en:'System Design'},
    todayTask:{zh:'今日任务',en:"Today's Task"},todayTaskDesc:{zh:'完成第{n}课 Mastery 或清空本课错题。',en:'Complete Lesson {n} Mastery or clear its mistakes.'},currentProgress:{zh:'当前课进度',en:'Current Progress'},checkIn:{zh:'今日打卡',en:'Check-in Today'},checkInYes:{zh:'已有学习记录',en:'Learning record found'},checkInNo:{zh:'开始一课即可打卡',en:'Start a lesson to check in'},streak:{zh:'连续学习',en:'Learning Streak'},streakDays:{zh:'{count} 天',en:'{count} days'},
    path:{zh:'学习路径地图',en:'Learning Path Map'},pathDesc:{zh:'可按课号、语法主题或内容状态搜索。卡片会显示本地掌握记录和错题数量。',en:'Search by lesson number, grammar topic, or content status. Cards show local mastery records and mistakes.'},all:{zh:'全部',en:'All'},migrated:{zh:'已迁移',en:'Migrated'},seed:{zh:'基础骨架',en:'Seed'},unfinished:{zh:'未完成',en:'Unfinished'},mistakesOnly:{zh:'有错题',en:'With Mistakes'},masteredOnly:{zh:'已掌握',en:'Mastered'},availableOnly:{zh:'可学习',en:'Available'},allCourses:{zh:'全部课程',en:'All Lessons'},search:{zh:'搜索：第2课 / て形 / 敬语 / Mastery',en:'Search: Lesson 2 / te-form / keigo / Mastery'},
    status:{zh:'系统状态',en:'System Status'},player:{zh:'统一播放器',en:'Unified Player'},playerDesc:{zh:'第 1-50 课共用 JSON/Supabase 播放链路',en:'Lessons 1-50 share the JSON/Supabase player pipeline.'},practice:{zh:'即时练习',en:'Instant Practice'},practiceDesc:{zh:'词汇、语法、例句、测试、错题本保持同一流程',en:'Vocabulary, grammar, examples, tests, and mistakes stay in one flow.'},fallback:{zh:'内容兜底',en:'Content Fallback'},fallbackDesc:{zh:'数据库缺少 practice 时自动使用 v20 适配器生成练习',en:'When database practice is missing, the v20 adapter generates practice automatically.'},
    stageMastered:{zh:'{done}/{total} 掌握',en:'{done}/{total} mastered'},noMatch:{zh:'没有匹配课程。',en:'No matching lessons.'},studying:{zh:'学习中',en:'In Progress'},available:{zh:'可学习',en:'Available'},unlocked:{zh:'已解锁',en:'Unlocked'},locked:{zh:'未解锁 · 可预览',en:'Locked · Preview'},current:{zh:'当前课',en:'Current'},privileged:{zh:'已开放',en:'Open'},progress:{zh:'进度 {percent}%',en:'Progress {percent}%'},wrong:{zh:'错题 {wrong}',en:'Mistakes {wrong}'},lockedHint:{zh:'请先完成第{n}课，或进入预览模式。',en:'Finish Lesson {n} first, or open preview mode.'}
  };
  let query=localStorage.getItem('minna_home_v20_query')||'',filter=localStorage.getItem('minna_home_v20_filter')||'all';
  let roleState={effectiveRole:'normal',role:'normal',bypassLessonLock:false,loading:true};
  let cloudProgress={};
  const i18n=()=>window.MinnaI18n||null;
  const pick=v=>i18n()?i18n().pick(v):(v&&typeof v==='object'?v.zh||v.en||'':String(v==null?'':v));
  function text(key,vars){let value=pick(copy[key]);if(vars)Object.keys(vars).forEach(k=>{value=String(value).split('{'+k+'}').join(vars[k])});return value}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
  function legacyState(n){const no=pad(n);const keys=[`minna_lesson_${no}`,`lesson${no}v8`,`lesson${no}v7`,`lesson${no}v6`,`lesson${no}v5`,`lesson${n}v8`,`lesson${n}v7`,`lesson${n}v6`,`lesson${n}v5`];for(const key of keys){const value=readJson(key);if(value)return value}return null}
  function lessonId(n){return 'minna_lesson_'+pad(n)}
  function cloudState(n){const row=cloudProgress[lessonId(n)];return row&&row.progress?row.progress:null}
  function progressOf(n){
    const state=cloudState(n)||legacyState(n)||{};
    const mastery=state.mastery||{};
    const done=Number(state.doneLevels||state.completedLevels||state.done_pages||0);
    const score=Number(state.score||state.totalScore||mastery.final||0);
    const wrong=state.wrong_count!=null?Number(state.wrong_count):state.wrong?Object.keys(state.wrong).filter(k=>state.wrong[k]).length:0;
    const passed=!!state.mastery_passed||((mastery.vocab||0)>=100&&(mastery.grammar||0)>=80&&(mastery.examples||0)>=80&&(mastery.final||0)>=80&&wrong===0);
    const percent=passed?100:Math.max(0,Math.min(99,Math.round((Number(mastery.vocab||0)+Number(mastery.grammar||0)+Number(mastery.examples||0)+Number(mastery.final||0))/4)||Math.min(90,done*12)||Math.min(90,score)));
    return {state,done,score,wrong,passed,percent,hasRecord:!!Object.keys(state).length};
  }
  function canAccess(n){if(roleState.bypassLessonLock)return true;if(n===1)return true;return progressOf(n-1).passed}
  function isCurrentLesson(n){if(progressOf(n).passed)return false;for(let i=1;i<n;i++){if(!progressOf(i).passed)return false}return true}
  function lessonHref(l,access){return access ? l.url : `${l.url}&mode=preview`}
  function roleLabel(){if(roleState.loading)return text('roleLoading');if(roleState.effectiveRole==='admin')return text('roleAdmin');if(roleState.effectiveRole==='vip')return text('roleVip');return text('roleNormal')}
  function roleModeLabel(){return roleState.bypassLessonLock?text('roleOpen'):text('rolePath')}
  function recordDateValue(p){const s=p.state||{};return String(s.updated_at||s.last_answer_at||s.lastAt||s.lastStudyDate||s.completed_at||'')}
  function isTodayRecord(p){const d=recordDateValue(p);return d&&d.slice(0,10)===new Date().toISOString().slice(0,10)}
  function fakeStreak(enriched){return enriched.some(l=>isTodayRecord(l.progress))?1:0}
  async function hydrateAccount(){
    if(!window.MinnaAuth)return;
    try{await MinnaAuth.init({lessonId:'minna_home_v20'});roleState=await MinnaAuth.loadRole(true);try{const rows=await MinnaAuth.listProgress();cloudProgress={};rows.forEach(row=>{if(row&&row.lesson_id)cloudProgress[row.lesson_id]=row})}catch(e){console.warn('[Minna Home] cloud progress skipped:',e.message||e)}}catch(e){console.warn('[Minna Home] account hydrate skipped:',e.message||e);roleState={effectiveRole:'normal',role:'normal',bypassLessonLock:false,loading:false}}
    render();
  }
  function dashboard(){
    const enriched=lessons.map(l=>Object.assign({},l,{progress:progressOf(l.n)}));
    const mastered=enriched.filter(l=>l.progress.passed).length;
    const records=enriched.filter(l=>l.progress.hasRecord).length;
    const current=enriched.find(l=>!l.progress.passed)||enriched[enriched.length-1];
    const recent=Number(localStorage.getItem('minna_home_last_lesson')||0);
    const resume=enriched.find(l=>l.n===recent)||enriched.find(l=>l.progress.hasRecord&&!l.progress.passed)||current;
    const todayDone=enriched.some(l=>isTodayRecord(l.progress));
    return {enriched,mastered,records,current,resume,todayDone,streak:fakeStreak(enriched)};
  }
  function render(){
    const data=dashboard();
    document.title=`${text('title')} v${VERSION}`;
    $('app').innerHTML=`<header class="hero"><div class="wrap heroGrid"><div class="heroCopy"><div class="heroMeta"><span class="badge">Minna AI Learning System v${VERSION}</span><span class="roleBadge">${esc(roleLabel())} · ${esc(roleModeLabel())}</span><span id="langMount"></span></div><h1>${esc(text('title'))}</h1><p>${esc(text('subtitle'))}</p><div class="heroActions"><a class="primary" href="${data.resume.url}" data-track="${data.resume.n}">${esc(text('continueLesson',{n:data.resume.n}))}</a><a class="ghostHero" href="${lessonUrl(data.current.n)}" data-track="${data.current.n}">${esc(text('currentLesson',{n:data.current.n}))}</a><a class="lightHero" href="./minna-wrongbook.html?v=${VERSION}">${esc(text('wrongbook'))}</a></div></div><div class="heroStats"><div><b>${data.mastered}</b><span>${esc(text('mastered'))}</span></div><div><b>${data.records}</b><span>${esc(text('records'))}</span></div><div><b>50</b><span>${esc(text('total'))}</span></div></div></div></header><main class="wrap"><section class="panel overviewPanel"><div><h2>${esc(text('today'))}</h2><p>${esc(text('todayDesc'))}</p></div><div class="actionStrip"><a class="primary" href="${data.resume.url}" data-track="${data.resume.n}">${esc(text('continue'))}</a><a class="ghost" href="./minna-content-audit.html?v=${VERSION}">${esc(text('audit'))}</a><a class="ghost" href="./minna-system-design.html?v=${VERSION}">${esc(text('design'))}</a><a class="light" href="./minna-admin.html?v=${VERSION}">${esc(text('admin'))}</a><a class="light" href="./minna-user-manual.html?v=${VERSION}">${esc(text('manual'))}</a></div></section><section class="panel statusPanel"><h2>${esc(text('todayTask'))}</h2><div class="statusGrid"><div><b>${esc(text('todayTask'))}</b><span>${esc(text('todayTaskDesc',{n:data.current.n}))}</span></div><div><b>${data.current.progress.percent}%</b><span>${esc(text('currentProgress'))}</span></div><div><b>${data.todayDone?'✓':'—'}</b><span>${esc(data.todayDone?text('checkInYes'):text('checkInNo'))}</span></div><div><b>${esc(text('streakDays',{count:data.streak}))}</b><span>${esc(text('streak'))}</span></div></div></section><section class="panel"><div class="sectionHead"><div><h2>${esc(text('path'))}</h2><p class="small">${esc(text('pathDesc'))}</p></div><div class="segmented" role="tablist" aria-label="${esc(text('path'))}"><button data-filter="all">${esc(text('all'))}</button><button data-filter="migrated">${esc(text('migrated'))}</button><button data-filter="seed">${esc(text('seed'))}</button><button data-filter="unfinished">${esc(text('unfinished'))}</button><button data-filter="mistakes">${esc(text('mistakesOnly'))}</button><button data-filter="mastered">${esc(text('masteredOnly'))}</button><button data-filter="available">${esc(text('availableOnly'))}</button></div></div><div class="filters"><input id="searchBox" value="${esc(query)}" placeholder="${esc(text('search'))}"><select id="filterBox"><option value="all">${esc(text('allCourses'))}</option><option value="migrated">${esc(text('migrated'))}</option><option value="seed">${esc(text('seed'))}</option><option value="unfinished">${esc(text('unfinished'))}</option><option value="mistakes">${esc(text('mistakesOnly'))}</option><option value="mastered">${esc(text('masteredOnly'))}</option><option value="available">${esc(text('availableOnly'))}</option></select></div><div id="lessonGrid"></div></section><section class="panel statusPanel"><h2>${esc(text('status'))}</h2><div class="statusGrid"><div><b>${esc(text('player'))}</b><span>${esc(text('playerDesc'))}</span></div><div><b>${esc(text('practice'))}</b><span>${esc(text('practiceDesc'))}</span></div><div><b>${esc(text('fallback'))}</b><span>${esc(text('fallbackDesc'))}</span></div></div></section></main><footer class="wrap footer">docs/minna-index.html · v${VERSION}</footer>`;
    if(i18n())i18n().installToggle($('langMount'));
    bind();renderGrid();
  }
  function bind(){
    $('searchBox').oninput=e=>{query=e.target.value;localStorage.setItem('minna_home_v20_query',query);renderGrid()};
    $('filterBox').value=filter;
    $('filterBox').onchange=e=>{filter=e.target.value;localStorage.setItem('minna_home_v20_filter',filter);renderGrid()};
    document.querySelectorAll('[data-filter]').forEach(btn=>{btn.onclick=()=>{filter=btn.dataset.filter;localStorage.setItem('minna_home_v20_filter',filter);$('filterBox').value=filter;renderGrid()}});
    document.querySelectorAll('[data-track]').forEach(a=>{a.addEventListener('click',()=>localStorage.setItem('minna_home_last_lesson',a.dataset.track))});
  }
  function filterLesson(l){
    if(filter==='migrated'&&l.tag!=='Mastery migrated')return false;
    if(filter==='seed'&&l.tag!=='Practice seed')return false;
    if(filter==='unfinished'&&l.progress.passed)return false;
    if(filter==='mistakes'&&!(l.progress.wrong>0))return false;
    if(filter==='mastered'&&!l.progress.passed)return false;
    if(filter==='available'&&!canAccess(l.n))return false;
    return true;
  }
  function renderGrid(){
    const q=query.trim().toLowerCase();
    document.querySelectorAll('[data-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===filter));
    const html=stages.map(([title,from,to])=>{
      const rows=lessons.map(l=>Object.assign({},l,{progress:progressOf(l.n)})).filter(l=>l.n>=from&&l.n<=to).filter(filterLesson).filter(l=>!q||(`第${l.n}课 lesson ${l.n} ${pick(l.topic)} ${l.topic.zh||''} ${l.topic.en||''} ${l.tag}`).toLowerCase().includes(q));
      if(!rows.length)return '';
      const done=rows.filter(l=>l.progress.passed).length;
      return `<div class="stageBlock"><div class="stageTitle"><h3>${esc(pick(title))}</h3><span class="badge2">${esc(text('stageMastered',{done,total:rows.length}))}</span></div><div class="lessonGrid">${rows.map(card).join('')}</div></div>`;
    }).join('');
    $('lessonGrid').innerHTML=html||`<p class="small">${esc(text('noMatch'))}</p>`;
    document.querySelectorAll('.lesson[data-track]').forEach(a=>{a.addEventListener('click',()=>localStorage.setItem('minna_home_last_lesson',a.dataset.track))});
  }
  function card(l){
    const p=l.progress,access=canAccess(l.n),current=isCurrentLesson(l.n),status=p.passed?'mastered':current?'current':access?'unlocked':'locked';
    const lessonName=i18n()&&i18n().lang()==='en'?`Lesson ${l.n}`:`第${l.n}课`;
    const label=roleState.bypassLessonLock&&!p.passed?`${text('privileged')} · ${roleLabel()}`:p.passed?text('mastered'):current?text('current'):access?text('unlocked'):text('locked');
    const wrong=p.wrong?` · ${text('wrong',{wrong:p.wrong})}`:'';
    const hint=!access&&!roleState.bypassLessonLock?`<small>${esc(text('lockedHint',{n:l.n-1}))}</small>`:'';
    return `<a class="lesson ${status}" href="${lessonHref(l,access)}" data-track="${l.n}"><b>${esc(lessonName)}</b><span>${esc(pick(l.topic))}</span><small>${esc(label)} · ${esc(l.tag)}</small><div class="progressLine"><i style="width:${p.percent}%"></i></div><small>${esc(text('progress',{percent:p.percent}))}${esc(wrong)}</small>${hint}</a>`;
  }
  if(i18n())i18n().onChange(render);
  function start(){render();hydrateAccount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
