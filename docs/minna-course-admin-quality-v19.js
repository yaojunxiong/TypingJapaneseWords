// Minna Course Admin Quality Checker v19.3
// Checks generated/edited minna.lesson.v1 JSON before saving draft or publishing.
(function(){
  const $=id=>document.getElementById(id);
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function readJson(){const editor=$('courseJsonEditor');if(!editor||!editor.value.trim())throw new Error('请先在上方读取、生成或粘贴课程 JSON。');return JSON.parse(editor.value)}
  function shell(){return `<section class="panel" id="qualityCheckV19"><h2>课程 JSON 质量检查 v19.3</h2><p class="small">用于 AI 生成后、保存草稿前、发布前的自动体检。它不会修改 JSON，只给出风险等级和修复建议。</p><div class="filters"><button class="dark" id="runQualityBtn">运行质量检查</button><button class="light" id="copyQualityBtn">复制检查报告</button></div><div id="qualitySummary" class="small">等待读取课程 JSON。</div><div id="qualityReport"></div></section>`}
  function injectStyle(){if($('qualityStyleV19'))return;const s=document.createElement('style');s.id='qualityStyleV19';s.textContent='.qualityCards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}.qualityCards div{border:1px solid #e2e8f0;border-radius:16px;padding:10px;background:#f8fafc;text-align:center}.qualityCards b{display:block;font-size:24px}.qIssue{border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin:8px 0;background:#fff}.qErr{border-color:#fecaca;background:#fef2f2}.qWarn{border-color:#fde68a;background:#fffbeb}.qOk{border-color:#bbf7d0;background:#f0fdf4}.qRiskHigh{color:#991b1b;font-weight:1000}.qRiskMid{color:#92400e;font-weight:1000}.qRiskLow{color:#166534;font-weight:1000}@media(max-width:760px){.qualityCards{grid-template-columns:1fr 1fr}}';document.head.appendChild(s)}
  function install(){if($('qualityCheckV19'))return;const main=document.querySelector('main');if(!main)return;const temp=document.createElement('div');temp.innerHTML=shell();const ref=document.getElementById('aiDraftV19')||document.getElementById('courseAdminV17');if(ref&&ref.nextSibling)main.insertBefore(temp.firstElementChild,ref.nextSibling);else main.appendChild(temp.firstElementChild);bind()}
  function bind(){$('runQualityBtn').onclick=run;$('copyQualityBtn').onclick=copyReport}
  function getSections(obj){return Array.isArray(obj.sections)?obj.sections:[]}
  function items(obj,type){return getSections(obj).filter(s=>s.type===type).flatMap(s=>Array.isArray(s.items)?s.items:[])}
  function norm(s){return String(s||'').trim().toLowerCase().replace(/\s+/g,' ')}
  function add(arr,level,where,msg,fix){arr.push({level,where,msg,fix})}
  function check(obj){
    const issues=[];
    if(!obj||typeof obj!=='object')add(issues,'error','root','根节点不是 object。','重新生成或修复 JSON。');
    if(obj.schema!=='minna.lesson.v1')add(issues,'error','schema','schema 不是 minna.lesson.v1。','改为 minna.lesson.v1。');
    if(!obj.lessonNo)add(issues,'error','lessonNo','缺少 lessonNo。','补充 lessonNo。');
    if(!obj.lessonId)add(issues,'error','lessonId','缺少 lessonId。','使用 minna_lesson_XX。');
    if(!obj.title||!obj.title.zh||!obj.title.en)add(issues,'warn','title','标题中英不完整。','补充 title.zh / title.en。');
    const sections=getSections(obj);
    const required=['vocab','grammar','examples','quiz'];
    required.forEach(t=>{if(!sections.some(s=>s.type===t))add(issues,'error','sections','缺少 section: '+t,'补充 '+t+' section。')});
    const ids=new Map();
    function seen(id,where){if(!id){add(issues,'error',where,'缺少 id。','补充唯一 id。');return}if(ids.has(id))add(issues,'error',where,'ID 重复：'+id,'修改为唯一 ID。');ids.set(id,where)}
    sections.forEach((s,si)=>{seen(s.id,'section['+si+']');(s.items||[]).forEach((it,ii)=>seen(it.id,(s.type||'section')+' item['+ii+']'))});
    const vocab=items(obj,'vocab');
    vocab.forEach((v,i)=>{const w='vocab '+(v.id||i+1);if(!v.jp)add(issues,'error',w,'词汇缺少 jp。','补充日语词。');if(!v.kana)add(issues,'warn',w,'词汇缺少 kana。','补充假名读音。');if(!v.zh)add(issues,'warn',w,'词汇缺少中文释义。','补充 zh。');if(!v.en)add(issues,'warn',w,'词汇缺少英文释义。','补充 en。')});
    const grammars=items(obj,'grammar');
    grammars.forEach((g,i)=>{const w='grammar '+(g.id||i+1);if(!g.pattern)add(issues,'error',w,'语法缺少 pattern。','补充语法句型。');if(!g.explanation||(!g.explanation.zh&&!g.explanation.en))add(issues,'error',w,'语法缺少 explanation。','补充 explanation.zh/en。');if(!Array.isArray(g.examples)||!g.examples.length)add(issues,'warn',w,'语法缺少 examples。','至少补充 1 个语法例句。')});
    const examples=items(obj,'examples');
    examples.forEach((e,i)=>{const w='example '+(e.id||i+1);if(!e.jp)add(issues,'error',w,'例句缺少 jp。','补充日语例句。');if(!e.zh)add(issues,'warn',w,'例句缺少中文翻译。','补充 zh。');if(!e.en)add(issues,'warn',w,'例句缺少英文翻译。','补充 en。')});
    const quizzes=items(obj,'quiz');
    const correctPos=[];
    const qTextSeen=new Map();
    quizzes.forEach((q,i)=>{const w='quiz '+(q.id||i+1);const qt=norm((q.question&&q.question.zh)||'')+'|'+norm((q.question&&q.question.en)||'');if(!q.question||(!q.question.zh&&!q.question.en))add(issues,'error',w,'题目缺少 question。','补充 question.zh/en。');if(qt!=='|'&&qTextSeen.has(qt))add(issues,'warn',w,'题目文本疑似重复。','检查是否重复出题。');qTextSeen.set(qt,w);const opts=Array.isArray(q.options)?q.options:[];if(opts.length<2)add(issues,'error',w,'选项少于 2 个。','至少补充 2 个选项，建议 4 个。');const ok=opts.filter(o=>o.correct).length;if(ok!==1)add(issues,'error',w,'correct 数量不是 1 个。','每题必须且只能有一个 correct:true。');const idx=opts.findIndex(o=>o.correct);if(idx>=0)correctPos.push(idx);const optSeen=new Set();opts.forEach((o,j)=>{const key=norm((o.text&&o.text.jp)||'')+'|'+norm((o.text&&o.text.zh)||'')+'|'+norm((o.text&&o.text.en)||'');if(key==='||')add(issues,'error',w,'第 '+(j+1)+' 个选项没有文字。','补充 text.jp 或 text.zh/en。');if(optSeen.has(key))add(issues,'warn',w,'选项疑似重复：第 '+(j+1)+' 个。','修改重复选项。');optSeen.add(key)})});
    if(quizzes.length>=4&&correctPos.length){const firstCount=correctPos.filter(x=>x===0).length;if(firstCount/quizzes.length>0.6)add(issues,'warn','quiz correct distribution','正确答案过度集中在第一个选项。','调整 correct 位置，避免学生靠位置猜答案。')}
    const counts={vocab:vocab.length,grammar:grammars.length,examples:examples.length,quiz:quizzes.length};
    if(counts.vocab===0)add(issues,'warn','content size','词汇为空。','补充本课核心词汇。');
    if(counts.grammar===0)add(issues,'warn','content size','语法为空。','补充本课核心语法。');
    if(counts.examples===0)add(issues,'warn','content size','例句为空。','补充核心例句。');
    if(counts.quiz===0)add(issues,'warn','content size','测试题为空。','补充综合测试题。');
    const errors=issues.filter(x=>x.level==='error').length;
    const warns=issues.filter(x=>x.level==='warn').length;
    const risk=errors?'high':warns?'mid':'low';
    return {issues,counts,errors,warns,risk};
  }
  function render(result){
    const riskText=result.risk==='high'?'高风险：不建议发布':result.risk==='mid'?'中风险：建议修复后发布':'低风险：可以进入人工复核';
    const riskClass=result.risk==='high'?'qRiskHigh':result.risk==='mid'?'qRiskMid':'qRiskLow';
    $('qualitySummary').innerHTML=`<div class="qualityCards"><div><b>${result.counts.vocab}</b><span>词汇</span></div><div><b>${result.counts.grammar}</b><span>语法</span></div><div><b>${result.counts.examples}</b><span>例句</span></div><div><b>${result.counts.quiz}</b><span>Quiz</span></div></div><p class="${riskClass}">${riskText}</p><p>错误 ${result.errors} 个；警告 ${result.warns} 个。</p>`;
    if(!result.issues.length){$('qualityReport').innerHTML='<div class="qIssue qOk"><b>检查通过</b><p class="small">没有发现结构性问题。仍建议人工检查日语内容准确性。</p></div>';return}
    $('qualityReport').innerHTML=result.issues.map((x,i)=>`<div class="qIssue ${x.level==='error'?'qErr':'qWarn'}"><b>${i+1}. ${x.level==='error'?'错误':'警告'}｜${esc(x.where)}</b><p>${esc(x.msg)}</p><p class="small">建议：${esc(x.fix)}</p></div>`).join('');
  }
  let lastReport='';
  function run(){try{const obj=readJson();const result=check(obj);render(result);lastReport=`课程 JSON 质量检查\n风险：${result.risk}\n错误：${result.errors}\n警告：${result.warns}\n词汇：${result.counts.vocab}\n语法：${result.counts.grammar}\n例句：${result.counts.examples}\nQuiz：${result.counts.quiz}\n\n`+result.issues.map((x,i)=>`${i+1}. [${x.level}] ${x.where}: ${x.msg} 建议：${x.fix}`).join('\n')}catch(e){$('qualitySummary').innerHTML='<span class="qRiskHigh">检查失败：'+esc(e.message)+'</span>';$('qualityReport').innerHTML='';lastReport='检查失败：'+e.message}}
  async function copyReport(){if(!lastReport)run();try{await navigator.clipboard.writeText(lastReport);$('qualitySummary').insertAdjacentHTML('beforeend','<p class="qRiskLow">已复制检查报告。</p>')}catch(e){$('qualitySummary').insertAdjacentHTML('beforeend','<p class="qRiskMid">无法自动复制，请手动选择报告内容。</p>')}}
  function start(){injectStyle();install()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
