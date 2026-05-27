// Minna Course Admin Diff v17.6
// Three-way preview: file JSON / Supabase draft / Supabase published.
(function(){
  const VERSION='17.6';
  const $=id=>document.getElementById(id);
  function pad(n){return String(n).padStart(2,'0')}
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}
  function pick(v){return v&&(v.zh||v.en||v.ja)||''}
  function filePath(no){return `./data/minna/lessons/lesson-${pad(no)}.json?v=${VERSION}`}
  function getSupa(){
    if(window.adminClient)return window.adminClient;
    if(window.supa)return window.supa();
    if(window.supabase){
      const SUPABASE_URL='https://ycjuceortcduakxscfes.supabase.co';
      const SUPABASE_KEY='sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
      return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    }
    throw new Error('Supabase SDK not loaded');
  }
  function shell(){return `<section class="panel" id="courseDiffV17"><h2>课程三路预览与差异对比 v17.6</h2><p class="small">同时查看 GitHub 文件 JSON、Supabase draft、Supabase published。用于确认测试内容是否误发布，以及发布前比较差异。</p><div class="filters"><select id="diffCourseNo">${Array.from({length:50},(_,i)=>`<option value="${i+1}">第${i+1}课 / Lesson ${i+1}</option>`).join('')}</select><button class="dark" id="loadDiffBtn">读取三路数据</button><button class="light" id="copyPublishedBtn">复制 published 到上方编辑器</button><button class="light" id="copyDraftBtn">复制 draft 到上方编辑器</button><button class="light" id="copyFileBtn">复制 file JSON 到上方编辑器</button></div><p id="diffStatus" class="small">请选择课程后读取。</p><div class="diffGrid"><div><h3>File JSON</h3><div id="fileSummary" class="small">未读取</div><pre id="filePreview"></pre></div><div><h3>Supabase Draft</h3><div id="draftSummary" class="small">未读取</div><pre id="draftPreview"></pre></div><div><h3>Supabase Published</h3><div id="pubSummary" class="small">未读取</div><pre id="pubPreview"></pre></div></div><div class="diffGrid2"><div><h3>File vs Published</h3><pre id="filePubDiff"></pre></div><div><h3>Draft vs Published</h3><pre id="draftPubDiff"></pre></div></div></section>`}
  function injectStyle(){if($('courseDiffStyleV17'))return;const s=document.createElement('style');s.id='courseDiffStyleV17';s.textContent='.diffGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.diffGrid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.diffGrid pre,.diffGrid2 pre{background:#0f172a;color:#e2e8f0;border-radius:14px;padding:10px;max-height:360px;overflow:auto;font-size:12px;white-space:pre-wrap}.diffOk{color:#166534;font-weight:900}.diffBad{color:#991b1b;font-weight:900}.diffWarn{color:#92400e;font-weight:900}.diffPlus{color:#86efac}.diffMinus{color:#fca5a5}.diffSame{color:#cbd5e1}@media(max-width:980px){.diffGrid,.diffGrid2{grid-template-columns:1fr}}';document.head.appendChild(s)}
  function install(){if($('courseDiffV17'))return;const main=document.querySelector('main');if(!main)return;const temp=document.createElement('div');temp.innerHTML=shell();const ref=document.getElementById('courseAdminV17');if(ref&&ref.nextSibling)main.insertBefore(temp.firstElementChild,ref.nextSibling);else main.insertBefore(temp.firstElementChild,main.firstChild);bind()}
  let cache={file:null,draft:null,published:null};
  function bind(){
    $('loadDiffBtn').onclick=()=>loadAll(Number($('diffCourseNo').value));
    $('copyPublishedBtn').onclick=()=>copyToEditor(cache.published,'published');
    $('copyDraftBtn').onclick=()=>copyToEditor(cache.draft,'draft');
    $('copyFileBtn').onclick=()=>copyToEditor(cache.file,'file JSON');
  }
  async function loadFile(no){const res=await fetch(filePath(no),{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);return await res.json()}
  async function loadStatus(no,status){const supa=getSupa();const {data,error}=await supa.from('minna_course_lessons').select('content,version,updated_at,updated_email').eq('course','minna').eq('lesson_no',no).eq('status',status).maybeSingle();if(error)throw error;if(!data||!data.content)throw new Error('No '+status+' content');return {content:data.content,meta:{version:data.version,updated_at:data.updated_at,updated_email:data.updated_email}}}
  async function loadAll(no){$('diffStatus').textContent='读取中：第 '+no+' 课';cache={file:null,draft:null,published:null};
    const file=await safe(()=>loadFile(no));
    const draft=await safe(()=>loadStatus(no,'draft'));
    const pub=await safe(()=>loadStatus(no,'published'));
    cache.file=file.ok?file.value:null;
    cache.draft=draft.ok?draft.value.content:null;
    cache.published=pub.ok?pub.value.content:null;
    renderOne('file',file.ok?file.value:null,file.ok?null:file.error);
    renderOne('draft',draft.ok?draft.value.content:null,draft.ok?null:draft.error,draft.ok?draft.value.meta:null);
    renderOne('pub',pub.ok?pub.value.content:null,pub.ok?null:pub.error,pub.ok?pub.value.meta:null);
    $('filePubDiff').innerHTML=diffHtml(cache.file,cache.published,'file','published');
    $('draftPubDiff').innerHTML=diffHtml(cache.draft,cache.published,'draft','published');
    $('diffStatus').innerHTML='<span class="diffOk">读取完成。</span> file: '+(file.ok?'OK':'无')+' · draft: '+(draft.ok?'OK':'无')+' · published: '+(pub.ok?'OK':'无');
  }
  async function safe(fn){try{return {ok:true,value:await fn()}}catch(e){return {ok:false,error:e}}}
  function count(obj,type){return ((obj&&obj.sections)||[]).filter(s=>s.type===type).reduce((n,s)=>n+((s.items||[]).length),0)}
  function summary(obj,err,meta){if(err)return '<span class="diffBad">读取失败：</span>'+esc(err.message);if(!obj)return '<span class="diffWarn">无数据</span>';return `<p><b>${esc(pick(obj.title))}</b>｜${esc(pick(obj.subtitle))}</p><p>词汇 ${count(obj,'vocab')} · 语法 ${count(obj,'grammar')} · 例句 ${count(obj,'examples')} · 测试 ${count(obj,'quiz')}</p><p class="small">lessonId: ${esc(obj.lessonId)} · schema: ${esc(obj.schema)}${meta?(' · v'+esc(meta.version)+' · '+esc(meta.updated_at||'')+' · '+esc(meta.updated_email||'')):''}</p>`}
  function renderOne(prefix,obj,err,meta){$(prefix+'Summary').innerHTML=summary(obj,err,meta);$(prefix+'Preview').textContent=obj?JSON.stringify(obj,null,2).slice(0,12000):''}
  function norm(obj){return obj?JSON.stringify(obj,null,2).split('\n'):[]}
  function diffHtml(a,b,an,bn){if(!a&&!b)return '<span class="diffWarn">两边都没有数据。</span>';if(!a)return '<span class="diffBad">'+esc(an)+' 无数据，无法对比。</span>';if(!b)return '<span class="diffBad">'+esc(bn)+' 无数据，无法对比。</span>';const aa=norm(a),bb=norm(b);if(JSON.stringify(a)===JSON.stringify(b))return '<span class="diffOk">内容完全一致。</span>';const max=Math.max(aa.length,bb.length);let out=[];let changed=0;for(let i=0;i<max&&out.length<260;i++){if(aa[i]===bb[i]){if(changed>0&&changed<80)out.push('<span class="diffSame">  '+esc(aa[i]||'')+'</span>');continue}changed++;out.push('<span class="diffMinus">- '+esc(aa[i]||'')+'</span>');out.push('<span class="diffPlus">+ '+esc(bb[i]||'')+'</span>')}if(changed===0)return '<span class="diffOk">内容一致。</span>';if(out.length>=260)out.push('<span class="diffWarn">...差异较多，仅显示前 260 行...</span>');return out.join('\n')}
  function copyToEditor(obj,label){if(!obj){$('diffStatus').innerHTML='<span class="diffBad">没有可复制的 '+esc(label)+' 数据。</span>';return}const editor=document.getElementById('courseJsonEditor');if(!editor){$('diffStatus').innerHTML='<span class="diffBad">找不到上方课程 JSON 编辑器。</span>';return}editor.value=JSON.stringify(obj,null,2);$('diffStatus').innerHTML='<span class="diffOk">已复制 '+esc(label)+' 到上方编辑器。可再保存草稿或发布。</span>';editor.scrollIntoView({behavior:'smooth',block:'center'})}
  function start(){injectStyle();install()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
