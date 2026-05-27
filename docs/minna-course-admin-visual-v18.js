// Minna Course Admin Visual Editor v18.0
// First visual editor: vocabulary section. Edits the JSON in #courseJsonEditor, then existing save/publish buttons handle Supabase.
(function(){
  const $=id=>document.getElementById(id);
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function pad(n){return String(n).padStart(2,'0')}
  function readJson(){
    const editor=$('courseJsonEditor');
    if(!editor||!editor.value.trim())throw new Error('请先在上方读取或粘贴课程 JSON。');
    return JSON.parse(editor.value);
  }
  function writeJson(obj){
    const editor=$('courseJsonEditor');
    if(!editor)throw new Error('找不到课程 JSON 编辑器。');
    editor.value=JSON.stringify(obj,null,2);
    editor.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function vocabSection(obj){
    obj.sections=obj.sections||[];
    let s=obj.sections.find(x=>x.type==='vocab');
    if(!s){
      const no=Number(obj.lessonNo)||0;
      s={type:'vocab',id:'l'+pad(no)+'_vocab',title:{zh:'核心词汇',en:'Core Vocabulary',ja:'基本語彙'},items:[]};
      obj.sections.unshift(s);
    }
    s.items=s.items||[];
    return s;
  }
  function nextVocabId(obj){
    const no=pad(Number(obj.lessonNo)||0);
    const items=vocabSection(obj).items;
    let max=0;
    items.forEach(v=>{const m=String(v.id||'').match(/_v(\d+)$/);if(m)max=Math.max(max,Number(m[1]))});
    return 'l'+no+'_v'+pad(max+1);
  }
  function shell(){return `<section class="panel" id="visualVocabEditor"><h2>可视化词汇编辑器 v18.0</h2><p class="small">先在上方读取课程 JSON，然后用这里添加/编辑词汇。点击“写回 JSON”后，再用上方“保存草稿 / 发布课程”写入 Supabase。</p><div class="filters"><button class="dark" id="loadVisualVocabBtn">从 JSON 载入词汇</button><button class="primary" id="addVisualVocabBtn">新增词汇行</button><button class="light" id="writeVisualVocabBtn">写回 JSON</button></div><p id="visualVocabStatus" class="small">等待读取课程 JSON。</p><div class="tableWrap"><table class="tbl visualTbl"><thead><tr><th>ID</th><th>日语</th><th>假名</th><th>中文</th><th>English</th><th>标签 tags</th><th>操作</th></tr></thead><tbody id="visualVocabBody"><tr><td colspan="7" class="small">暂无数据。</td></tr></tbody></table></div></section>`}
  function injectStyle(){if($('visualEditorStyleV18'))return;const s=document.createElement('style');s.id='visualEditorStyleV18';s.textContent='.visualTbl input{width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:8px}.visualTbl td{min-width:120px}.visualTbl td:first-child{min-width:110px}.visualTbl td:last-child{min-width:90px}.visualOk{color:#166534;font-weight:900}.visualBad{color:#991b1b;font-weight:900}';document.head.appendChild(s)}
  function install(){if($('visualVocabEditor'))return;const main=document.querySelector('main');if(!main)return;const temp=document.createElement('div');temp.innerHTML=shell();const ref=document.getElementById('courseDiffV17')||document.getElementById('courseAdminV17');if(ref&&ref.nextSibling)main.insertBefore(temp.firstElementChild,ref.nextSibling);else main.insertBefore(temp.firstElementChild,main.firstChild);bind()}
  function bind(){
    $('loadVisualVocabBtn').onclick=load;
    $('addVisualVocabBtn').onclick=addRow;
    $('writeVisualVocabBtn').onclick=write;
  }
  function rowHtml(v){return `<tr><td><input data-k="id" value="${esc(v.id||'')}"></td><td><input data-k="jp" value="${esc(v.jp||'')}"></td><td><input data-k="kana" value="${esc(v.kana||'')}"></td><td><input data-k="zh" value="${esc(v.zh||'')}"></td><td><input data-k="en" value="${esc(v.en||'')}"></td><td><input data-k="tags" value="${esc((v.tags||[]).join(', '))}"></td><td><button class="light" data-del="1">删除</button></td></tr>`}
  function load(){try{const obj=readJson();const items=vocabSection(obj).items;$('visualVocabBody').innerHTML=items.length?items.map(rowHtml).join(''):'<tr><td colspan="7" class="small">本课暂无词汇，可点击新增词汇行。</td></tr>';$('visualVocabBody').querySelectorAll('[data-del]').forEach(btn=>btn.onclick=()=>{btn.closest('tr').remove();updateStatus('已删除一行，记得写回 JSON。',true)});updateStatus('已载入 '+items.length+' 个词汇。',true)}catch(e){updateStatus(e.message,false)}}
  function addRow(){try{const obj=readJson();const id=nextVocabId(obj);const body=$('visualVocabBody');if(body.querySelector('td[colspan]'))body.innerHTML='';body.insertAdjacentHTML('beforeend',rowHtml({id,jp:'',kana:'',zh:'',en:'',tags:[]}));body.querySelectorAll('[data-del]').forEach(btn=>btn.onclick=()=>{btn.closest('tr').remove();updateStatus('已删除一行，记得写回 JSON。',true)});updateStatus('已新增词汇行：'+id,true)}catch(e){updateStatus(e.message,false)}}
  function collectRows(){return [...$('visualVocabBody').querySelectorAll('tr')].filter(tr=>!tr.querySelector('td[colspan]')).map(tr=>{const o={};tr.querySelectorAll('input').forEach(inp=>{o[inp.dataset.k]=inp.value.trim()});return {id:o.id,jp:o.jp,kana:o.kana,zh:o.zh,en:o.en,tags:o.tags?o.tags.split(',').map(x=>x.trim()).filter(Boolean):[]}}).filter(v=>v.id||v.jp||v.zh||v.en)}
  function validate(items){const errors=[];const ids=new Set();items.forEach((v,i)=>{if(!v.id)errors.push('第 '+(i+1)+' 行缺少 ID');if(v.id&&ids.has(v.id))errors.push('ID 重复：'+v.id);ids.add(v.id);if(!v.jp)errors.push('第 '+(i+1)+' 行缺少日语');if(!v.zh&&!v.en)errors.push('第 '+(i+1)+' 行至少需要中文或英文释义')});return errors}
  function write(){try{const obj=readJson();const items=collectRows();const errors=validate(items);if(errors.length)throw new Error(errors.join('；'));vocabSection(obj).items=items;writeJson(obj);updateStatus('已写回 JSON：'+items.length+' 个词汇。现在可以保存草稿或发布。',true);const editor=$('courseJsonEditor');if(editor)editor.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){updateStatus(e.message,false)}}
  function updateStatus(msg,ok){$('visualVocabStatus').innerHTML='<span class="'+(ok?'visualOk':'visualBad')+'">'+esc(msg)+'</span>'}
  function start(){injectStyle();install()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
