// Minna Legacy JSON Adapter v20.0
// Converts existing Mastery/batch lesson data into minna.lesson.v1 at runtime when file/DB JSON is empty or lacks practice.
(function(){
  const VERSION='20.0';
  const pad=n=>String(n).padStart(2,'0');
  const loaded={};
  function script(src){
    if(loaded[src])return loaded[src];
    loaded[src]=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Failed to load '+src));
      document.body.appendChild(s);
    });
    return loaded[src];
  }
  function sections(obj,type){return (obj&&obj.sections||[]).filter(s=>s.type===type)}
  function items(obj,type){return sections(obj,type).flatMap(s=>Array.isArray(s.items)?s.items:[])}
  function hasPractice(x){return Array.isArray(x&&x.practice)&&x.practice.length>0}
  function shouldUpgrade(n,obj){
    if(!obj||!Array.isArray(obj.sections))return n>1;
    const vocab=items(obj,'vocab'), grammar=items(obj,'grammar'), examples=items(obj,'examples'), quiz=items(obj,'quiz');
    const total=vocab.length+grammar.length+examples.length+quiz.length;
    if(total===0)return n>1;
    if(n>1&&n<=25&&(vocab.some(x=>!hasPractice(x))||grammar.some(x=>!hasPractice(x))||examples.some(x=>!hasPractice(x))))return true;
    if(n>=26&&total<8)return true;
    return false;
  }
  function text(zh,en,ja,jp){const o={};if(zh)o.zh=zh;if(en)o.en=en;if(ja)o.ja=ja;if(jp)o.jp=jp;return o}
  function uniq(arr){return Array.from(new Set((arr||[]).map(x=>String(x||'').trim()).filter(Boolean)))}
  function rotate(options,correctIndex,targetIndex){
    const list=options.map((value,i)=>({value,correct:i===correctIndex}));
    if(!list.length)return [];
    let ci=list.findIndex(x=>x.correct);
    if(ci<0)ci=0;
    targetIndex=Math.max(0,Math.min(targetIndex%list.length,list.length-1));
    const correct=list.splice(ci,1)[0];
    list.splice(targetIndex,0,correct);
    return list;
  }
  function choice(id,skill,question,options,correctIndex,explanation,targetIndex){
    return {id,skill,question:text(question),options:rotate(options,correctIndex,targetIndex).map(o=>({text:text(String(o.value||'')),...(o.correct?{correct:true}:{})})),explanation:text(explanation||'')};
  }
  function parts(jp){
    const s=String(jp||'').trim();
    if(!s)return [];
    const spaced=s.split(/\s+/).filter(Boolean);
    if(spaced.length>1)return spaced;
    const punct=s.split(/(?<=[、。！？?])/).map(x=>x.trim()).filter(Boolean);
    return punct.length>1?punct:[s];
  }
  function order(id,skill,zh,rawParts,jp){
    const p=(Array.isArray(rawParts)&&rawParts.length?rawParts:parts(jp)).filter(Boolean);
    return {id,type:'order',skill,question:text('请排列句子：'+(zh||jp)),parts:p,answer:p.slice(),explanation:text(jp?'正确句子：'+jp:'按自然语序排列。')};
  }
  function meta(n,current){
    const cur=current||{};
    return {
      schema:'minna.lesson.v1',
      course:'minna',
      lessonNo:n,
      lessonId:'minna_lesson_'+pad(n),
      title:cur.title||{zh:'第'+n+'课',en:'Lesson '+n,ja:'第'+n+'課'},
      subtitle:cur.subtitle||{zh:'第'+n+'课',en:'Lesson '+n,ja:'第'+n+'課'}
    };
  }
  async function mastery(n){
    window.MinnaMasteryLessons=window.MinnaMasteryLessons||{};
    if(!window.MinnaMasteryLessons[n])await script('./minna-mastery-lesson-'+pad(n)+'.js?v='+VERSION);
    return window.MinnaMasteryLessons[n];
  }
  async function batch(){
    if(!window.MinnaBatchLesson)await script('./minna-batch-lesson.js?v='+VERSION);
    return window.MinnaBatchLesson&&window.MinnaBatchLesson.DATA||{};
  }
  function buildMastery(n,m,current){
    const base=meta(n,current), prefix='l'+pad(n);
    const vocabRows=(m.vocab||[]).map(v=>({jp:String(v[0]||''),zh:String(v[1]||'')})).filter(v=>v.jp&&v.zh);
    const zhPool=uniq(vocabRows.map(v=>v.zh));
    const vocab=vocabRows.map((v,i)=>{
      const id=prefix+'_v'+pad(i+1);
      const distractors=zhPool.filter(x=>x!==v.zh).slice(i%Math.max(1,zhPool.length),i%Math.max(1,zhPool.length)+3);
      while(distractors.length<3)distractors.push(['这个','那个','地点','动作','时间'][(i+distractors.length)%5]);
      return {id,jp:v.jp,kana:v.jp,zh:v.zh,en:v.zh,tags:['legacy-mastery'],practice:[choice(id+'_p01','vocab','「'+v.jp+'」的意思是？',[v.zh].concat(distractors.slice(0,3)),0,'「'+v.jp+'」= '+v.zh+'。',i%4)]};
    });
    const grammar=(m.grammar||[]).map((g,i)=>{
      const id=prefix+'_g'+pad(i+1), opts=(g.opts||[]).map(String);
      return {id,pattern:g.q||('语法点 '+(i+1)),title:text(g.q||('语法点 '+(i+1))),explanation:text(g.tip||g.q||''),examples:[],practice:[choice(id+'_p01','grammar',g.q||'请选择正确答案。',opts,Number.isInteger(g.a)?g.a:0,g.tip||'',i%Math.max(1,opts.length))]};
    });
    const examples=(m.examples||[]).map((e,i)=>{
      const id=prefix+'_e'+pad(i+1);
      return {id,jp:e.jp||'',zh:e.cn||'',en:'',practice:[order(id+'_p01','examples',e.cn||'',e.parts,e.jp||'')]};
    }).filter(e=>e.jp);
    const quiz=(m.final||[]).map((q,i)=>choice(prefix+'_q'+pad(i+1),'quiz',q.q||'请选择正确答案。',(q.opts||[]).map(String),Number.isInteger(q.a)?q.a:0,q.tip||'',i%Math.max(1,(q.opts||[]).length)));
    return Object.assign(base,{focus:{zh:'本课已从旧版 Mastery 训练迁移到统一 JSON 播放器。核心词汇、语法、例句都带即时练习，并保留课末综合测试。',en:'This lesson is converted from legacy Mastery data with immediate practice.',ja:'旧版 Mastery から変換しました。'},sections:[
      {type:'vocab',id:prefix+'_vocab',title:{zh:'核心词汇',en:'Core Vocabulary',ja:'基本語彙'},items:vocab},
      {type:'grammar',id:prefix+'_grammar',title:{zh:'核心语法',en:'Core Grammar',ja:'基本文法'},items:grammar},
      {type:'examples',id:prefix+'_examples',title:{zh:'核心例句',en:'Core Examples',ja:'基本例文'},items:examples},
      {type:'quiz',id:prefix+'_quiz',title:{zh:'综合测试',en:'Final Test',ja:'まとめテスト'},items:quiz}
    ]});
  }
  function buildBatch(n,d,current,allData){
    const base=meta(n,current), prefix='l'+pad(n), topic=d.sub||d.theme||(base.subtitle&&base.subtitle.zh)||('第'+n+'课');
    const points=uniq(d.points||[]), examples=uniq(d.examples||[]);
    const fallback=['名词句・自我介绍','これ・それ・あれ','时间・星期','移动・交通','て形','可能形','尊敬语','谦让语'];
    const pointPool=uniq(points.concat(fallback));
    const vocab=points.map((p,i)=>{
      const id=prefix+'_v'+pad(i+1), distractors=pointPool.filter(x=>x!==p).slice(0,3);
      return {id,jp:p,kana:p,zh:'核心表达：'+p,en:'Core expression: '+p,tags:['seed-pattern'],practice:[choice(id+'_p01','vocab','第'+n+'课的核心表达「'+p+'」属于哪一类？',['核心表达：'+p].concat(distractors.map(x=>'核心表达：'+x)),0,'「'+p+'」是第'+n+'课的核心表达之一。',i%4)]};
    });
    const grammar=points.map((p,i)=>{
      const id=prefix+'_g'+pad(i+1), opts=[p].concat(pointPool.filter(x=>x!==p).slice(0,3));
      return {id,pattern:p,title:text(p),explanation:text('本课核心结构：'+p+'。请结合例句反复练习。','Core pattern: '+p+'.'),examples:examples.slice(i,i+1).map(jp=>({jp,zh:'本课例句。',en:''})),practice:[choice(id+'_p01','grammar','第'+n+'课包含哪个核心结构？',opts,0,'第'+n+'课主题：'+topic+'。',i%Math.max(1,opts.length))]};
    });
    const exItems=examples.map((jp,i)=>{
      const id=prefix+'_e'+pad(i+1), point=points[i%Math.max(1,points.length)]||topic;
      return {id,jp,zh:'本句练习：'+point+'。',en:'Practice sentence for: '+point+'.',practice:[order(id+'_p01','examples','本句练习：'+point,parts(jp),jp)]};
    });
    const wrongPool=uniq(Object.keys(allData||{}).flatMap(k=>(allData[k].examples||[])).filter(x=>!examples.includes(x))).slice(0,80);
    const quiz=examples.slice(0,Math.max(4,Math.min(8,examples.length))).map((jp,i)=>{
      const wrongs=wrongPool.slice(i*3,i*3+3);while(wrongs.length<3)wrongs.push(fallback[(i+wrongs.length)%fallback.length]);
      return choice(prefix+'_q'+pad(i+1),'quiz','哪一句是第'+n+'课「'+topic+'」的例句？',[jp].concat(wrongs.slice(0,3)),0,'第'+n+'课主题：'+topic+'。',i%4);
    });
    return Object.assign(base,{focus:{zh:'本课已生成统一 JSON 基础互动骨架：核心表达、语法点、例句和测试题都可以直接练习。后续可在后台继续补充正式词汇释义和更细解释。',en:'This lesson has practice-ready seed content.',ja:'基礎練習データを生成しました。'},sections:[
      {type:'vocab',id:prefix+'_vocab',title:{zh:'核心表达',en:'Core Expressions',ja:'基本表現'},items:vocab},
      {type:'grammar',id:prefix+'_grammar',title:{zh:'核心语法',en:'Core Grammar',ja:'基本文法'},items:grammar},
      {type:'examples',id:prefix+'_examples',title:{zh:'核心例句',en:'Core Examples',ja:'基本例文'},items:exItems},
      {type:'quiz',id:prefix+'_quiz',title:{zh:'综合测试',en:'Final Test',ja:'まとめテスト'},items:quiz}
    ]});
  }
  async function upgrade(n,obj){
    if(!shouldUpgrade(n,obj))return obj;
    if(n>=2&&n<=25){
      const m=await mastery(n);
      if(m){
        if(window.MinnaLessonContentSource)window.MinnaLessonContentSource.adapter='legacy-mastery';
        return buildMastery(n,m,obj);
      }
    }
    const all=await batch();
    if(all[n]){
      if(window.MinnaLessonContentSource)window.MinnaLessonContentSource.adapter='batch-seed';
      return buildBatch(n,all[n],obj,all);
    }
    return obj;
  }
  window.MinnaLegacyJsonAdapterV20={upgrade,shouldUpgrade};
})();
