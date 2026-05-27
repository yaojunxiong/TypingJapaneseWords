// Minna Duolingo-style vocabulary matching v20.3.14
(function(){
  var VERSION='20.3.14';
  var selected=null;
  var matched={};
  var currentItems=[];
  var UI={
    zh:{title:'词汇配对练习',desc:'借鉴多邻国的干净配对交互，内容使用本课自己的词汇。',start:'开始配对',screenTitle:'选择配对',check:'检查',done:'完成！',doneDesc:'本组词汇配对练习已完成。',again:'再来一组',back:'返回课程'},
    en:{title:'Vocabulary Matching',desc:'A clean matching activity using this lesson’s own vocabulary.',start:'Start Matching',screenTitle:'Choose the matching pairs',check:'Check',done:'Done!',doneDesc:'You finished this vocabulary matching round.',again:'Try another round',back:'Back to lesson'}
  };

  function lang(){return localStorage.getItem('minna_ui_lang')||localStorage.getItem('minna_app_lang')||'zh'}
  function text(k){return (UI[lang()]&&UI[lang()][k])||UI.zh[k]||k}
  function esc(s){return String(s||'').replace(/[&<>\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
  function shuffle(arr){return arr.slice().sort(function(){return Math.random()-0.5});}
  function meaningOf(v){return lang()==='en'?(v.en||v.zh||''):(v.zh||v.en||'')}

  function getVocab(){
    var lesson=window.MinnaCurrentLessonJson||{};
    var out=[];
    (lesson.sections||[]).forEach(function(sec){
      if(sec.type!=='vocab')return;
      (sec.items||[]).forEach(function(v){
        var jp=v.jp||'';
        var kana=v.kana||'';
        var meaning=meaningOf(v);
        if(jp&&meaning)out.push({id:'v'+out.length,jp:jp,kana:kana,meaning:meaning,lessonNo:lesson.lessonNo||1});
      });
    });
    return out;
  }

  function injectEntry(){
    if(document.getElementById('duoVocabEntry'))return;
    var main=document.querySelector('main.wrap');
    if(!main)return;
    var card=document.createElement('section');
    card.id='duoVocabEntry';
    card.className='panel duoEntryPanel';
    card.innerHTML='<div class="badge2">Vocabulary Match</div><h2>'+esc(text('title'))+'</h2><p class="small">'+esc(text('desc'))+'</p><p class="buttons"><button class="primary" id="startDuoVocab">'+esc(text('start'))+'</button></p>';
    main.insertBefore(card,main.firstChild);
    document.getElementById('startDuoVocab').onclick=function(){startPractice()};
  }

  function startPractice(){currentItems=shuffle(getVocab()).slice(0,5);selected=null;matched={};renderPractice();}
  function progress(){var done=Object.keys(matched).length;var total=currentItems.length||1;return Math.round(done/total*100);}

  function renderPractice(){
    var app=document.getElementById('app');if(!app)return;
    var left=shuffle(currentItems.map(function(x){return {id:x.id,type:'meaning',text:x.meaning}}));
    var right=shuffle(currentItems.map(function(x){return {id:x.id,type:'jp',text:x.jp,kana:x.kana}}));
    var percent=progress();
    app.innerHTML='<main class="duoScreen"><div class="duoTop"><button id="duoExit">×</button><div class="duoProgress"><i style="width:'+percent+'%"></i></div></div><h1>'+esc(text('screenTitle'))+'</h1><div class="duoMatchGrid"><div class="duoCol">'+left.map(btnHtml).join('')+'</div><div class="duoCol">'+right.map(btnHtml).join('')+'</div></div><button id="duoCheck" class="duoCheck" disabled>'+esc(text('check'))+'</button></main>';
    document.getElementById('duoExit').onclick=function(){location.reload()};
    document.querySelectorAll('.duoChoice').forEach(function(btn){btn.onclick=function(){choose(btn)};});
  }

  function btnHtml(x){var done=matched[x.id];var small=x.kana?'<small>'+esc(x.kana)+'</small>':'';return '<button class="duoChoice '+(done?'done':'')+'" data-id="'+esc(x.id)+'" data-type="'+esc(x.type)+'" '+(done?'disabled':'')+'>'+small+'<span>'+esc(x.text)+'</span></button>';}
  function choose(btn){
    if(btn.classList.contains('done'))return;
    var id=btn.dataset.id,type=btn.dataset.type;
    document.querySelectorAll('.duoChoice[data-type="'+type+'"]').forEach(function(b){b.classList.remove('selected')});
    btn.classList.add('selected');
    if(!selected||selected.type===type){selected={id:id,type:type,el:btn};return;}
    if(selected.id===id){matched[id]=true;btn.classList.add('right');selected.el.classList.add('right');setTimeout(function(){if(Object.keys(matched).length>=currentItems.length)renderDone();else renderPractice();},350);}else{btn.classList.add('wrong');selected.el.classList.add('wrong');setTimeout(function(){btn.classList.remove('wrong','selected');selected.el.classList.remove('wrong','selected');selected=null;},450);}
  }
  function renderDone(){
    var app=document.getElementById('app');
    app.innerHTML='<main class="duoScreen duoDone"><h1>'+esc(text('done'))+'</h1><p>'+esc(text('doneDesc'))+'</p><button class="duoCheck active" id="againBtn">'+esc(text('again'))+'</button><button class="duoCheck light" id="backBtn">'+esc(text('back'))+'</button></main>';
    document.getElementById('againBtn').onclick=startPractice;document.getElementById('backBtn').onclick=function(){location.reload()};
  }
  function injectCss(){
    if(document.getElementById('duoVocabStyle'))return;
    var css=document.createElement('style');css.id='duoVocabStyle';css.textContent='.duoScreen{min-height:100vh;padding:24px 20px 110px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC","Noto Sans JP",sans-serif;color:#3f3f46}.duoTop{display:flex;align-items:center;gap:18px;margin-bottom:28px}.duoTop button{border:0;background:transparent;font-size:34px;color:#9ca3af;font-weight:900}.duoProgress{height:18px;flex:1;background:#e5e7eb;border-radius:999px;overflow:hidden}.duoProgress i{display:block;height:100%;background:#58cc02;border-radius:999px}.duoScreen h1{font-size:30px;margin:0 0 28px;font-weight:1000;color:#3f3f46}.duoMatchGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:180px}.duoCol{display:grid;gap:14px}.duoChoice{min-height:78px;border:3px solid #e5e7eb;border-radius:18px;background:#fff;color:#3f3f46;font-size:22px;font-weight:800;box-shadow:0 4px 0 #e5e7eb;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}.duoChoice small{font-size:14px;color:#b8b8b8;font-weight:700}.duoChoice.selected{background:#ddf4ff;border-color:#84d8ff;color:#1899d6;box-shadow:0 4px 0 #84d8ff}.duoChoice.right{background:#d7ffb8;border-color:#58cc02;box-shadow:0 4px 0 #58cc02}.duoChoice.wrong{background:#ffdfe0;border-color:#ff4b4b;box-shadow:0 4px 0 #ff4b4b}.duoChoice.done{opacity:.25}.duoCheck{position:fixed;left:20px;right:20px;bottom:24px;min-height:64px;border:0;border-radius:18px;background:#e5e7eb;color:#a3a3a3;font-size:20px;font-weight:1000}.duoCheck.active,.duoDone .duoCheck{background:#58cc02;color:#fff}.duoCheck.light{bottom:96px;background:#eef2ff;color:#3730a3}.duoDone{text-align:center;display:flex;flex-direction:column;justify-content:center}.duoEntryPanel{border-color:#bbf7d0;background:#f0fdf4}@media(max-width:520px){.duoScreen{padding:22px 16px 110px}.duoMatchGrid{margin-top:170px;gap:12px}.duoChoice{min-height:70px;font-size:20px;border-radius:16px}.duoScreen h1{font-size:28px}}';document.head.appendChild(css);
  }
  function boot(){injectCss();setTimeout(injectEntry,600);setTimeout(injectEntry,1600);}window.MinnaDuoVocab={start:startPractice};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
