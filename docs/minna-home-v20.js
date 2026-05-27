// Minna Home v20.3
// Learner-first entry for the unified JSON player, content audit, and direct lesson access.
(function(){
  const VERSION='20.3';
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const lessonUrl=n=>`./minna-lesson-v16.html?n=${n}&v=${VERSION}`;
  const topics={
    1:[{zh:'名词句・自我介绍',en:'Noun Sentences and Self-introduction'},'JSON/Supabase'],2:[{zh:'これ・それ・あれ',en:'Kore, Sore, Are'},'Mastery migrated'],3:[{zh:'ここ・そこ・あそこ',en:'Koko, Soko, Asoko'},'Mastery migrated'],4:[{zh:'时间・星期',en:'Time and Weekdays'},'Mastery migrated'],5:[{zh:'移动・交通',en:'Movement and Transport'},'Mastery migrated'],6:[{zh:'动词ます形',en:'Verb Masu-form'},'Mastery migrated'],7:[{zh:'工具・授受基础',en:'Tools and Giving/Receiving Basics'},'Mastery migrated'],8:[{zh:'形容词',en:'Adjectives'},'Mastery migrated'],9:[{zh:'好き・上手',en:'Likes and Skills'},'Mastery migrated'],10:[{zh:'存在句',en:'Existence Sentences'},'Mastery migrated'],11:[{zh:'数量表达',en:'Quantity Expressions'},'Mastery migrated'],12:[{zh:'过去式・比较',en:'Past Tense and Comparison'},'Mastery migrated'],13:[{zh:'想要・目的',en:'Wants and Purpose'},'Mastery migrated'],14:[{zh:'て形',en:'Te-form'},'Mastery migrated'],15:[{zh:'て形许可',en:'Te-form Permission'},'Mastery migrated'],16:[{zh:'连接动作',en:'Connecting Actions'},'Mastery migrated'],17:[{zh:'ない形',en:'Nai-form'},'Mastery migrated'],18:[{zh:'辞书形',en:'Dictionary Form'},'Mastery migrated'],19:[{zh:'た形',en:'Ta-form'},'Mastery migrated'],20:[{zh:'普通形',en:'Plain Form'},'Mastery migrated'],21:[{zh:'と思います',en:'To omoimasu'},'Mastery migrated'],22:[{zh:'名词修饰',en:'Noun Modification'},'Mastery migrated'],23:[{zh:'とき・と',en:'Toki and To'},'Mastery migrated'],24:[{zh:'くれます',en:'Kuremasu'},'Mastery migrated'],25:[{zh:'たら・ても',en:'Tara and Temo'},'Mastery migrated'],26:[{zh:'んです',en:'N desu'},'Mastery migrated'],27:[{zh:'可能形',en:'Potential Form'},'Mastery migrated'],28:[{zh:'ながら',en:'Nagara'},'Mastery migrated'],29:[{zh:'自动词',en:'Intransitive Verbs'},'Mastery migrated'],30:[{zh:'他动词',en:'Transitive Verbs'},'Mastery migrated'],31:[{zh:'意向形',en:'Volitional Form'},'Mastery migrated'],32:[{zh:'建议・推量',en:'Advice and Conjecture'},'Mastery migrated'],33:[{zh:'命令・禁止',en:'Commands and Prohibition'},'Mastery migrated'],34:[{zh:'〜とおりに',en:'Toori ni'},'Mastery migrated'],35:[{zh:'条件形',en:'Conditional Form'},'Mastery migrated'],36:[{zh:'ように',en:'You ni'},'Mastery migrated'],37:[{zh:'受身形',en:'Passive Form'},'Mastery migrated'],38:[{zh:'のは',en:'No wa'},'Mastery migrated'],39:[{zh:'原因理由',en:'Causes and Reasons'},'Mastery migrated'],40:[{zh:'疑问词嵌入',en:'Embedded Questions'},'Mastery migrated'],41:[{zh:'授受高级',en:'Advanced Giving and Receiving'},'Mastery migrated'],42:[{zh:'ために',en:'Tame ni'},'Mastery migrated'],43:[{zh:'そうです',en:'Sou desu'},'Mastery migrated'],44:[{zh:'すぎます',en:'Sugimasu'},'Mastery migrated'],45:[{zh:'場合は',en:'Baai wa'},'Mastery migrated'],46:[{zh:'ところです',en:'Tokoro desu'},'Mastery migrated'],47:[{zh:'そうです',en:'Sou desu'},'Mastery migrated'],48:[{zh:'使役形',en:'Causative Form'},'Mastery migrated'],49:[{zh:'尊敬语',en:'Honorific Language'},'Mastery migrated'],50:[{zh:'谦让语',en:'Humble Language'},'Mastery migrated']
  };
  const lessons=Array.from({length:50},(_,i)=>{const n=i+1,t=topics[n];return{n,topic:t[0],tag:t[1],url:lessonUrl(n)}});
  const stages=[[{zh:'初级 I 前半',en:'Beginner I: First Half'},1,13],[{zh:'初级 I 后半',en:'Beginner I: Second Half'},14,25],[{zh:'初级 II 前半',en:'Beginner II: First Half'},26,38],[{zh:'初级 II 后半',en:'Beginner II: Second Half'},39,50]];
  const copy={
    title:{zh:'《みんなの日本語 初級》AI互动学习系统',en:'Minna no Nihongo Beginner AI Learning System'},
    subtitle:{zh:'50 课统一进入 AI 互动播放器，围绕词汇、语法、例句、测试和错题复习形成完整学习闭环。',en:'All 50 lessons open in one AI interactive player, covering vocabulary, grammar, example sentences, tests, and mistake review.'},
    continueLesson:{zh:'继续第{n}课',en:'Continue Lesson {n}'},
    currentLesson:{zh:'当前建议：第{n}课',en:'Recommended: Lesson {n}'},
    wrongbook:{zh:'错题本',en:'Mistakes'},
    mastered:{zh:'已掌握',en:'Mastered'},
    records:{zh:'有记录',en:'With Records'},
    total:{zh:'课程总数',en:'Total Lessons'},
    roleNormal:{zh:'普通用户',en:'Standard'},
    roleMember:{zh:'会员',en:'Member'},
    roleVip:{zh:'VIP 会员',en:'VIP'},
    roleAdmin:{zh:'管理员',en:'Admin'},
    roleLoading:{zh:'身份读取中',en:'Checking Role'},
    roleOpen:{zh:'全课开放',en:'All Lessons Open'},
    rolePath:{zh:'顺序解锁',en:'Sequential Unlock'},
    today:{zh:'今日入口',en:"Today's Entry"},
    todayDesc:{zh:'优先继续未完成课程；需要维护内容时再进入体检和后台。',en:'Continue unfinished lessons first; use audit and admin tools when maintaining content.'},
    continue:{zh:'继续学习',en:'Continue Learning'},
    audit:{zh:'内容体检',en:'Content Audit'},
    admin:{zh:'管理员后台',en:'Admin'},
    manual:{zh:'使用说明',en:'User Guide'},
    aiCoach:{zh:'AI教练',en:'AI Coach'},
    learningPath:{zh:'学习路线',en:'Learning Path'},
    weaknessProfile:{zh:'弱点画像',en:'Weakness Profile'},
    grammarHub:{zh:'语法中心',en:'Grammar Hub'},
    aiDrill:{zh:'AI练习',en:'AI Drill'},
    learningReport:{zh:'学习报告',en:'Learning Report'},
    path:{zh:'学习路径地图',en:'Learning Path Map'},
    pathDesc:{zh:'可按课号、语法主题或内容状态搜索。卡片会显示本地掌握记录和错题数量。',en:'Search by lesson number, grammar topic, or content status. Cards show local mastery records and mistakes.'},
    all:{zh:'全部',en:'All'},
    migrated:{zh:'已迁移',en:'Migrated'},
    seed:{zh:'基础骨架',en:'Seed'},
    allCourses:{zh:'全部课程',en:'All Lessons'},
    search:{zh:'搜索：第2课 / て形 / 敬语 / Mastery',en:'Search: Lesson 2 / te-form / keigo / Mastery'},
    status:{zh:'系统状态',en:'System Status'},
    player:{zh:'统一播放器',en:'Unified Player'},
    playerDesc:{zh:'第 1-50 课共用 JSON/Supabase 播放链路',en:'Lessons 1-50 share the JSON/Supabase player pipeline.'},
    practice:{zh:'即时练习',en:'Instant Practice'},
    practiceDesc:{zh:'词汇、语法、例句、测试、错题本保持同一流程',en:'Vocabulary, grammar, examples, tests, and mistakes stay in one flow.'},
    fallback:{zh:'内容兜底',en:'Content Fallback'},
    fallbackDesc:{zh:'数据库缺少 practice 时自动使用 v20 适配器生成练习',en:'When database practice is missing, the v20 adapter generates practice automatically.'},
    stageMastered:{zh:'{done}/{total} 掌握',en:'{done}/{total} mastered'},
    noMatch:{zh:'没有匹配课程。',en:'No matching lessons.'},
    studying:{zh:'学习中',en:'In Progress'},
    available:{zh:'可学习',en:'Available'},
    unlocked:{zh:'已解锁',en:'Unlocked'},
    locked:{zh:'未解锁 · 可预览',en:'Locked · Preview'},
    current:{zh:'当前课',en:'Current'},
    privileged:{zh:'已开放',en:'Open'},
    progress:{zh:'进度 {percent}%',en:'Progress {percent}%'},
    wrong:{zh:'错题 {wrong}',en:'Mistakes {wrong}'},
    lockedHint:{zh:'请先完成第{n}课，或进入预览模式。',en:'Finish Lesson {n} first, or open preview mode.'}
    ,loop:{zh:'学习闭环状态',en:'Learning Loop Status'}
    ,loopStart:{zh:'未开始本课',en:'Not started'}
    ,loopDoing:{zh:'进行中',en:'In progress'}
    ,loopScore:{zh:'测试未达通过线（80%）',en:'Test below pass line (80%)'}
    ,loopWrong:{zh:'有错题待订正',en:'Wrong answers pending correction'}
    ,loopFix:{zh:'分数达标，等待清空错题',en:'Score passed, clear wrong answers'}
    ,loopPass:{zh:'已通过，可进入下一课',en:'Passed, ready for next lesson'}
    ,lockGap:{zh:'解锁差距',en:'Unlock Gap'}
    ,needPrevRecord:{zh:'前置课（第{n}课）暂无学习记录',en:'No study record for prerequisite Lesson {n}'}
    ,needPrevPass:{zh:'前置课（第{n}课）未通过',en:'Prerequisite Lesson {n} not passed'}
    ,needPrevScore:{zh:'前置课正确率还需达到 80%',en:'Prerequisite accuracy needs to reach 80%'}
    ,needPrevWrong:{zh:'前置课错题需清零',en:'Prerequisite wrong answers must be cleared'}
    ,actStart:{zh:'开始本课',en:'Start Lesson'}
    ,actTest:{zh:'补做测试',en:'Retake Test'}
    ,actFix:{zh:'清理错题',en:'Clear Wrongs'}
    ,actNext:{zh:'进入下一课',en:'Next Lesson'}
    ,actReview:{zh:'去总复习',en:'Go Review'}
    ,whyStart:{zh:'建议先进入当前课，建立基础记录后系统才能给出更精准推荐。',en:'Start the current lesson first so the system can give more accurate recommendations.'}
    ,whyFix:{zh:'当前主要阻塞是错题未清零，先订正可最快恢复通关链路。',en:'Wrong answers are the main blocker now; clearing them is the fastest way to unblock progress.'}
    ,whyTest:{zh:'当前错题已不多，优先补测可快速判断是否达到通过线。',en:'Wrong answers are limited now; retaking the test is the fastest way to reach pass status.'}
    ,whyPass:{zh:'当前课已通过，建议进入下一课保持连续学习节奏。',en:'Current lesson is passed; move to the next lesson to keep momentum.'}
    ,showBasis:{zh:'查看依据',en:'Show Basis'}
    ,basisTitle:{zh:'推荐依据',en:'Recommendation Basis'}
    ,basisLesson:{zh:'当前课：第{n}课',en:'Current: Lesson {n}'}
    ,basisPercent:{zh:'进度：{p}%',en:'Progress: {p}%'}
    ,basisWrong:{zh:'错题：{n}',en:'Wrong Answers: {n}'}
    ,basisPassed:{zh:'通过状态：{v}',en:'Pass Status: {v}'}
    ,basisRecord:{zh:'学习记录：{v}',en:'Study Record: {v}'}
    ,yes:{zh:'是',en:'Yes'}
    ,no:{zh:'否',en:'No'}
    ,funnel:{zh:'闭环转化',en:'Loop Conversion'}
    ,funnelDesc:{zh:'弱点画像进入 AI Drill 的行为统计（本机）',en:'Local stats for Weakness Profile to AI Drill actions'}
    ,funnelEnter:{zh:'进入 Drill',en:'Drill Entries'}
    ,funnel7d:{zh:'近7天',en:'Last 7 Days'}
    ,funnelToday:{zh:'今日',en:'Today'}
    ,funnelLast:{zh:'最近一次',en:'Last Entry'}
    ,funnelNone:{zh:'暂无记录',en:'No records yet'}
  };
  let query=localStorage.getItem('minna_home_v20_query')||'',filter='all';
  let roleState={effectiveRole:'normal',role:'normal',bypassLessonLock:false,loading:true};
  let cloudProgress={};
  const i18n=()=>window.MinnaI18n||null;
  const pick=v=>i18n()?i18n().pick(v):(v&&typeof v==='object'?v.zh||v.en||'':String(v==null?'':v));
  function debounce(fn,wait){
    let t=0;
    return function(){
      const args=arguments;
      clearTimeout(t);
      t=setTimeout(()=>fn.apply(null,args),wait);
    };
  }
  function text(key,vars){
    let value=pick(copy[key]);
    if(vars)Object.keys(vars).forEach(k=>{value=String(value).split('{'+k+'}').join(vars[k])});
    return value;
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
  function legacyState(n){
    const no=pad(n);
    const keys=[`minna_lesson_${no}`,`lesson${no}v8`,`lesson${no}v7`,`lesson${no}v6`,`lesson${no}v5`,`lesson${n}v8`,`lesson${n}v7`,`lesson${n}v6`,`lesson${n}v5`];
    for(const key of keys){const value=readJson(key);if(value)return value}
    return null;
  }
  function lessonId(n){return 'minna_lesson_'+pad(n)}
  function cloudState(n){
    const row=cloudProgress[lessonId(n)];
    return row&&row.progress?row.progress:null;
  }
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
  function canAccess(n){
    if(roleState.bypassLessonLock)return true;
    if(n===1)return true;
    return progressOf(n-1).passed;
  }
  function isCurrentLesson(n){
    if(progressOf(n).passed)return false;
    for(let i=1;i<n;i++){if(!progressOf(i).passed)return false}
    return true;
  }
  function lessonHref(l,access){
    return access ? l.url : `${l.url}&mode=preview`;
  }
  function roleLabel(){
    if(roleState.loading)return text('roleLoading');
    if(roleState.effectiveRole==='admin')return text('roleAdmin');
    if(roleState.effectiveRole==='member')return text('roleMember');
    if(roleState.effectiveRole==='vip')return text('roleVip');
    return text('roleNormal');
  }
  function roleModeLabel(){
    if(roleState.bypassLessonLock)return text('roleOpen');
    return text('rolePath');
  }
  async function hydrateAccount(){
    if(!window.MinnaAuth)return;
    try{
      await MinnaAuth.init({lessonId:'minna_home_v20'});
      roleState=await MinnaAuth.loadRole(true);
      try{
        const rows=await MinnaAuth.listProgress();
        cloudProgress={};
        rows.forEach(row=>{if(row&&row.lesson_id)cloudProgress[row.lesson_id]=row});
      }catch(e){console.warn('[Minna Home] cloud progress skipped:',e.message||e)}
    }catch(e){
      console.warn('[Minna Home] account hydrate skipped:',e.message||e);
      roleState={effectiveRole:'normal',role:'normal',bypassLessonLock:false,loading:false};
    }
    render();
  }
  function dashboard(){
    const enriched=lessons.map(l=>Object.assign({},l,{progress:progressOf(l.n)}));
    const mastered=enriched.filter(l=>l.progress.passed).length;
    const records=enriched.filter(l=>l.progress.hasRecord).length;
    const current=enriched.find(l=>!l.progress.passed)||enriched[enriched.length-1];
    const recent=Number(localStorage.getItem('minna_home_last_lesson')||0);
    const resume=enriched.find(l=>l.n===recent)||enriched.find(l=>l.progress.hasRecord&&!l.progress.passed)||current;
    return {enriched,mastered,records,current,resume,loop:loopStatus(current.progress)};
  }
  function loopStatus(p){
    if(!p||!p.hasRecord)return text('loopStart');
    if(p.passed)return text('loopPass');
    if(p.percent>=80&&p.wrong>0)return text('loopFix');
    if(p.wrong>0)return text('loopWrong');
    if(p.percent>0&&p.percent<80)return text('loopScore');
    return text('loopDoing');
  }
  function lockGapText(n){
    if(n<=1||roleState.bypassLessonLock)return '';
    const prev=progressOf(n-1);
    const tips=[];
    if(!prev.hasRecord)tips.push(text('needPrevRecord',{n:n-1}));
    if(!prev.passed){
      tips.push(text('needPrevPass',{n:n-1}));
      if(prev.percent<80)tips.push(text('needPrevScore'));
      if(prev.wrong>0)tips.push(text('needPrevWrong'));
    }
    return tips.join('；');
  }
  function loopActions(current){
    const p=current.progress||{};
    const n=current.n;
    const next=Math.min(50,n+1);
    if(!p.hasRecord)return `<a class="primary" data-act="start_lesson" href="${lessonUrl(n)}">${esc(text('actStart'))}</a>`;
    if(p.passed){
      const nextBtn=n<50?`<a class="primary" data-act="next_lesson" href="${lessonUrl(next)}">${esc(text('actNext'))}</a>`:'';
      return `${nextBtn}<a class="ghost" data-act="go_review" href="./minna-review.html?v=${VERSION}">${esc(text('actReview'))}</a>`;
    }
    if(p.wrong>0)return `<a class="primary" data-act="clear_wrongs" href="${lessonUrl(n)}&mode=wrong">${esc(text('actFix'))}</a><a class="ghost" data-act="open_wrongbook" href="./minna-wrongbook-v2.html?v=${VERSION}">${esc(text('wrongbook'))}</a>`;
    return `<a class="primary" data-act="retake_test" href="${lessonUrl(n)}">${esc(text('actTest'))}</a><a class="ghost" data-act="go_review" href="./minna-review.html?v=${VERSION}">${esc(text('actReview'))}</a>`;
  }
  function logFunnel(act,lesson){
    try{
      const key='minna_funnel_events_v1';
      const rows=JSON.parse(localStorage.getItem(key)||'[]');
      rows.push({act,lesson:Number(lesson)||0,at:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(rows.slice(-400)));
    }catch(e){}
  }
  function funnelStats(){
    const rows=readJson('minna_funnel_events_v1')||[];
    const hits=rows.filter(x=>x&&x.act==='open_ai_drill_from_weakness');
    const today=new Date().toISOString().slice(0,10);
    const last7=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
    const todayCount=hits.filter(x=>String(x.at||'').slice(0,10)===today).length;
    const weekCount=hits.filter(x=>String(x.at||'').slice(0,10)>=last7).length;
    const last=hits.length?hits[hits.length-1]:null;
    return {total:hits.length,todayCount,weekCount,last};
  }
  function funnelPanel(){
    const s=funnelStats();
    const lastText=s.last?(new Date(s.last.at).toLocaleString()+' · L'+(s.last.lesson||'-')):text('funnelNone');
    return `<div class="small"><p><b>${esc(text('funnel'))}</b></p><p>${esc(text('funnelDesc'))}</p><p class="buttons"><span class="badge2">${esc(text('funnelEnter'))} ${s.total}</span><span class="badge2">${esc(text('funnel7d'))} ${s.weekCount}</span><span class="badge2">${esc(text('funnelToday'))} ${s.todayCount}</span></p><p>${esc(text('funnelLast'))}：${esc(lastText)}</p></div>`;
  }
  function loopReason(current){
    const p=current.progress||{};
    const n=current.n;
    if(!p.hasRecord)return text('whyStart');
    if(p.passed)return n<50?text('whyPass'):text('whyPass');
    if(p.wrong>0)return text('whyFix');
    return text('whyTest');
  }
  function loopBasis(current){
    const p=current.progress||{};
    const yes=text('yes'),no=text('no');
    const wrongClass=(p.wrong||0)>0?'style="background:#fee2e2;color:#991b1b"':'';
    return `<details><summary>${esc(text('showBasis'))}</summary><div class="small"><p>${esc(text('basisTitle'))}</p><p class="buttons"><span class="badge2">${esc(text('basisLesson',{n:current.n}))}</span><span class="badge2">${esc(text('basisPercent',{p:p.percent||0}))}</span><span class="badge2" ${wrongClass}>${esc(text('basisWrong',{n:p.wrong||0}))}</span><span class="badge2">${esc(text('basisPassed',{v:p.passed?yes:no}))}</span><span class="badge2">${esc(text('basisRecord',{v:p.hasRecord?yes:no}))}</span></p></div></details>`;
  }
  function render(){
    const data=dashboard();
    document.title=`${text('title')} v${VERSION}`;
    $('app').innerHTML=`<header class="hero"><div class="wrap heroGrid"><div class="heroCopy"><div class="heroMeta"><span class="badge">Minna AI Learning System v${VERSION}</span><span class="roleBadge">${esc(roleLabel())} · ${esc(roleModeLabel())}</span><span id="langMount"></span></div><h1>${esc(text('title'))}</h1><p>${esc(text('subtitle'))}</p><div class="heroActions"><a class="primary" href="${data.resume.url}" data-track="${data.resume.n}">${esc(text('continueLesson',{n:data.resume.n}))}</a><a class="ghostHero" href="${lessonUrl(data.current.n)}" data-track="${data.current.n}">${esc(text('currentLesson',{n:data.current.n}))}</a><a class="lightHero" href="./minna-wrongbook-v2.html?v=20.3">${esc(text('wrongbook'))}</a></div></div><div class="heroStats"><div><b>${data.mastered}</b><span>${esc(text('mastered'))}</span></div><div><b>${data.records}</b><span>${esc(text('records'))}</span></div><div><b>50</b><span>${esc(text('total'))}</span></div></div></div></header><main class="wrap"><section class="panel overviewPanel"><div><h2>${esc(text('today'))}</h2><p>${esc(text('todayDesc'))}</p><p class="buttons"><span class="badge2">${esc(text('loop'))}</span><span class="badge2">${esc(data.loop)}</span></p><p class="buttons">${loopActions(data.current)}</p><p class="small">${esc(loopReason(data.current))}</p>${loopBasis(data.current)}</div><div class="actionStrip"><a class="primary" href="${data.resume.url}" data-track="${data.resume.n}">${esc(text('continue'))}</a><a class="ghost" href="./minna-content-audit.html?v=${VERSION}">${esc(text('audit'))}</a><a class="light" href="./minna-admin.html?v=${VERSION}">${esc(text('admin'))}</a><a class="light" href="./minna-user-manual.html?v=${VERSION}">${esc(text('manual'))}</a><a class="light" href="./minna-ai-coach.html?v=${VERSION}">${esc(text('aiCoach'))}</a><a class="light" href="./minna-learning-path.html?v=${VERSION}">${esc(text('learningPath'))}</a><a class="light" href="./minna-weakness-profile.html?v=${VERSION}">${esc(text('weaknessProfile'))}</a><a class="light" href="./minna-grammar-hub.html?v=${VERSION}">${esc(text('grammarHub'))}</a><a class="light" href="./minna-ai-drill.html?v=${VERSION}">${esc(text('aiDrill'))}</a><a class="light" href="./minna-report.html?v=${VERSION}">${esc(text('learningReport'))}</a></div></section><section class="panel"><div class="sectionHead"><div><h2>${esc(text('path'))}</h2><p class="small">${esc(text('pathDesc'))}</p></div><div class="segmented" role="tablist" aria-label="${esc(text('path'))}"><button data-filter="all">${esc(text('all'))}</button><button data-filter="migrated">${esc(text('migrated'))}</button><button data-filter="seed">${esc(text('seed'))}</button></div></div><div class="filters"><input id="searchBox" value="${esc(query)}" placeholder="${esc(text('search'))}"><select id="filterBox"><option value="all">${esc(text('allCourses'))}</option><option value="migrated">Mastery migrated</option><option value="seed">Practice seed</option></select></div><div id="lessonGrid"></div></section><section class="panel statusPanel"><h2>${esc(text('status'))}</h2><div class="statusGrid"><div><b>${esc(text('player'))}</b><span>${esc(text('playerDesc'))}</span></div><div><b>${esc(text('practice'))}</b><span>${esc(text('practiceDesc'))}</span></div><div><b>${esc(text('fallback'))}</b><span>${esc(text('fallbackDesc'))}</span></div></div>${funnelPanel()}</section></main><footer class="wrap footer">docs/minna-index.html · v${VERSION}</footer>`;
    if(i18n())i18n().installToggle($('langMount'));
    bind();
    renderGrid();
  }
  function bind(){
    const onSearch=debounce(v=>{query=v;localStorage.setItem('minna_home_v20_query',query);renderGrid()},120);
    $('searchBox').oninput=e=>onSearch(e.target.value);
    $('filterBox').onchange=e=>{filter=e.target.value;renderGrid()};
    document.querySelectorAll('[data-filter]').forEach(btn=>{btn.onclick=()=>{filter=btn.dataset.filter;$('filterBox').value=filter;renderGrid()}});
    document.querySelectorAll('[data-track]').forEach(a=>{a.addEventListener('click',()=>localStorage.setItem('minna_home_last_lesson',a.dataset.track))});
    document.querySelectorAll('[data-act]').forEach(a=>{a.addEventListener('click',()=>logFunnel(a.dataset.act,(dashboard().current||{}).n||0))});
  }
  function renderGrid(){
    const q=query.trim().toLowerCase();
    document.querySelectorAll('[data-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===filter));
    const html=stages.map(([title,from,to])=>{
      const rows=lessons.map(l=>Object.assign({},l,{progress:progressOf(l.n)})).filter(l=>l.n>=from&&l.n<=to).filter(l=>{
        if(filter==='migrated'&&l.tag!=='Mastery migrated')return false;
        if(filter==='seed'&&l.tag!=='Practice seed')return false;
        return !q||(`第${l.n}课 lesson ${l.n} ${pick(l.topic)} ${l.topic.zh||''} ${l.topic.en||''} ${l.tag}`).toLowerCase().includes(q);
      });
      if(!rows.length)return '';
      const done=rows.filter(l=>l.progress.passed).length;
      return `<div class="stageBlock"><div class="stageTitle"><h3>${esc(pick(title))}</h3><span class="badge2">${esc(text('stageMastered',{done,total:rows.length}))}</span></div><div class="lessonGrid">${rows.map(card).join('')}</div></div>`;
    }).join('');
    $('lessonGrid').innerHTML=html||`<p class="small">${esc(text('noMatch'))}</p>`;
    document.querySelectorAll('.lesson[data-track]').forEach(a=>{a.addEventListener('click',()=>localStorage.setItem('minna_home_last_lesson',a.dataset.track))});
  }
  function card(l){
    const p=l.progress;
    const access=canAccess(l.n);
    const current=isCurrentLesson(l.n);
    const status=p.passed?'mastered':current?'current':access?'unlocked':'locked';
    const lessonName=i18n()&&i18n().lang()==='en'?`Lesson ${l.n}`:`第${l.n}课`;
    const label=roleState.bypassLessonLock&&!p.passed?`${text('privileged')} · ${roleLabel()}`:p.passed?text('mastered'):current?text('current'):access?text('unlocked'):text('locked');
    const wrong=p.wrong?` · ${text('wrong',{wrong:p.wrong})}`:'';
    const lockGap=lockGapText(l.n);
    const hint=!access&&!roleState.bypassLessonLock?`<small>${esc(text('lockedHint',{n:l.n-1}))}</small><small>${esc(text('lockGap'))}：${esc(lockGap||text('needPrevPass',{n:l.n-1}))}</small>`:'';
    return `<a class="lesson ${status}" href="${lessonHref(l,access)}" data-track="${l.n}"><b>${esc(lessonName)}</b><span>${esc(pick(l.topic))}</span><small>${esc(label)} · ${esc(l.tag)}</small><div class="progressLine"><i style="width:${p.percent}%"></i></div><small>${esc(text('progress',{percent:p.percent}))}${esc(wrong)}</small>${hint}</a>`;
  }
  if(i18n())i18n().onChange(render);
  function start(){render();hydrateAccount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
