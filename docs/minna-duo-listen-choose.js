// Minna Duolingo-style listen and choose v20.3.15
(function(){
  var VERSION='20.3.15';
  var items=[];
  var index=0;
  var score=0;
  var UI={
    zh:{title:'听音选词',desc:'听日语发音，选择对应的中文意思。内容来自本课词汇。',start:'开始听音',screenTitle:'选择你听到的意思',next:'继续',correct:'正确',done:'听音完成！',accuracy:'正确率',again:'再听一组',back:'返回课程'},
    en:{title:'Listen and Choose',desc:'Listen to the Japanese audio and choose the correct meaning from this lesson.',start:'Start Listening',screenTitle:'Choose the meaning you hear',next:'Continue',correct:'Correct',done:'Listening complete!',accuracy:'Accuracy',again:'Try another round',back:'Back to lesson'}
  };
  function lang(){return localStorage.getItem('minna_ui_lang')||localStorage.getItem('minna_app_lang')||'zh'}
  function text(k){return (UI[lang()]&&UI[lang()][k])||UI.zh[k]||k}
  function meaningOf(v){return lang()==='en'?(v.en||v.zh||''):(v.zh||v.en||'')}
  function esc(s){return String(s||'').replace(/[&<>\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
  function shuffle(arr){return arr.slice().sort(function(){return Math.random()-0.5});}

  function getVocab(){
    var lesson=window.MinnaCurrentLessonJson||{};
    var out=[];
    (lesson.sections||[]).forEach(function(sec){
      if(sec.type!=='vocab')return;
      (sec.items||[]).forEach(function(v){
        var jp=v.jp||'';
        var kana=v.kana||'';
        var meaning=meaningOf(v);
        if(jp&&meaning)out.push({jp:jp,kana:kana,meaning:meaning,lessonNo:lesson.lessonNo||1});
      });
    });
    return out;
  }

  function speak(t){try{if(!window.speechSynthesis)return;window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=0.86;u.pitch=1;window.speechSynthesis.speak(u);}catch(e){}}

  function injectEntry(){
    if(document.getElementById('duoListenEntry'))return;
    var main=document.querySelector('main.wrap');if(!main)return;
    var card=document.createElement('section');
    card.id='duoListenEntry';card.className='panel duoEntryPanel';
    card.innerHTML='<div class="badge2">Listening</div><h2>'+esc(text('title'))+'</h2><p class="small">'+esc(text('desc'))+'</p><p class="buttons"><button class="primary" id="startDuoListen">'+esc(text('start'))+'</button></p>';
    var ref=document.getElementById('duoVocabEntry');
    if(ref&&ref.parentNode)ref.parentNode.insertBefore(card,ref.nextSibling);else main.insertBefore(card,main.firstChild);
    document.getElementById('startDuoListen').onclick=startPractice;
  }

  function startPractice(){items=shuffle(getVocab()).slice(0,8);index=0;score=0;renderQuestion();setTimeout(function(){if(items[index])speak(items[index].jp)},300);}
  function optionsFor(item){var all=getVocab().filter(function(x){return x.meaning!==item.meaning});return shuffle([item].concat(shuffle(all).slice(0,3)));}

  function renderQuestion(){
    var app=document.getElementById('app');if(!app)return;if(index>=items.length){renderDone();return;}
    var item=items[index],percent=Math.round(index/(items.length||1)*100),opts=optionsFor(item);
    app.innerHTML='<main class="duoScreen duoListenScreen"><div class="duoTop"><button id="listenExit">×</button><div class="duoProgress"><i style="width:'+percent+'%"></i></div></div><h1>'+esc(text('screenTitle'))+'</h1><button class="listenSpeaker" id="speakAgain">🔊</button><p class="listenKana">'+esc(item.kana||item.jp)+'</p><div class="listenOptions">'+opts.map(function(o){return '<button class="listenOpt" data-ok="'+(o.meaning===item.meaning?'1':'0')+'">'+esc(o.meaning)+'</button>';}).join('')+'</div><button id="listenNext" class="duoCheck" disabled>'+esc(text('next'))+'</button></main>';
    document.getElementById('listenExit').onclick=function(){location.reload()};
    document.getElementById('speakAgain').onclick=function(){speak(item.jp)};
    document.querySelectorAll('.listenOpt').forEach(function(btn){btn.onclick=function(){choose(btn,item)}});
  }

  function choose(btn,item){
    var ok=btn.dataset.ok==='1';
    document.querySelectorAll('.listenOpt').forEach(function(b){b.disabled=true;if(b.dataset.ok==='1')b.classList.add('right');});
    btn.classList.add(ok?'right':'wrong');if(ok)score++;
    var next=document.getElementById('listenNext');next.disabled=false;next.classList.add('active');next.textContent=ok?text('correct'):text('next');
    next.onclick=function(){index++;renderQuestion();setTimeout(function(){if(items[index])speak(items[index].jp)},250)};
  }

  function renderDone(){
    var app=document.getElementById('app');var percent=Math.round(score/(items.length||1)*100);
    app.innerHTML='<main class="duoScreen duoDone"><h1>'+esc(text('done'))+'</h1><p>'+esc(text('accuracy'))+' '+percent+'% · '+score+'/'+items.length+'</p><button class="duoCheck active" id="listenAgain">'+esc(text('again'))+'</button><button class="duoCheck light" id="listenBack">'+esc(text('back'))+'</button></main>';
    document.getElementById('listenAgain').onclick=startPractice;document.getElementById('listenBack').onclick=function(){location.reload()};
  }

  function injectCss(){if(document.getElementById('duoListenStyle'))return;var css=document.createElement('style');css.id='duoListenStyle';css.textContent='.listenSpeaker{width:112px;height:112px;border-radius:999px;border:0;background:#1cb0f6;color:#fff;font-size:46px;box-shadow:0 8px 0 #1899d6;display:block;margin:90px auto 16px}.listenKana{text-align:center;color:#9ca3af;font-size:18px;font-weight:800;margin-bottom:40px}.listenOptions{display:grid;gap:14px}.listenOpt{min-height:68px;border:3px solid #e5e7eb;border-radius:18px;background:#fff;color:#3f3f46;font-size:21px;font-weight:900;box-shadow:0 4px 0 #e5e7eb}.listenOpt.right{background:#d7ffb8;border-color:#58cc02;box-shadow:0 4px 0 #58cc02}.listenOpt.wrong{background:#ffdfe0;border-color:#ff4b4b;box-shadow:0 4px 0 #ff4b4b}.duoEntryPanel{border-color:#bbf7d0;background:#f0fdf4}@media(max-width:520px){.listenSpeaker{margin-top:70px}.listenOpt{min-height:64px;font-size:19px}}';document.head.appendChild(css);}
  function boot(){injectCss();setTimeout(injectEntry,900);setTimeout(injectEntry,2000);}window.MinnaDuoListen={start:startPractice,speak:speak};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
