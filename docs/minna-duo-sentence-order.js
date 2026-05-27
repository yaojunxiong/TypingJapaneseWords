// Minna Duolingo-style sentence order v20.3.13
(function(){
  var VERSION='20.3.13';
  var items=[];
  var index=0;
  var score=0;
  var answer=[];

  function esc(s){
    return String(s||'').replace(/[&<>\"]/g,function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];
    });
  }

  function shuffle(arr){
    return arr.slice().sort(function(){return Math.random()-0.5});
  }

  function splitJapanese(s){
    s=String(s||'').trim();
    if(!s)return [];
    if(s.indexOf(' ')>=0)return s.split(/\s+/).filter(Boolean);
    var parts=s.match(/[^、。！？]+[、。！？]?/g)||[s];
    if(parts.length>1)return parts;
    return s.replace(/[。！？]$/,'').split(/(?=は|が|を|に|へ|で|と|も|から|まで|です|ます|ません|でした)/).filter(Boolean);
  }

  function getExamples(){
    var lesson=window.MinnaCurrentLessonJson||{};
    var out=[];
    (lesson.sections||[]).forEach(function(sec){
      if(sec.type!=='examples'&&sec.type!=='grammar')return;
      (sec.items||[]).forEach(function(x){
        if(x.jp){
          var parts=splitJapanese(x.jp);
          if(parts.length>=3){out.push({jp:x.jp,parts:parts,meaning:x.zh||x.en||'',lessonNo:lesson.lessonNo||1});}
        }
        (x.examples||[]).forEach&& (x.examples||[]).forEach(function(e){
          var parts=splitJapanese(e.jp);
          if(parts.length>=3){out.push({jp:e.jp,parts:parts,meaning:e.zh||e.en||'',lessonNo:lesson.lessonNo||1});}
        });
      });
    });
    return out;
  }

  function injectEntry(){
    if(document.getElementById('duoOrderEntry'))return;
    var main=document.querySelector('main.wrap');
    if(!main)return;
    var card=document.createElement('section');
    card.id='duoOrderEntry';
    card.className='panel duoEntryPanel';
    card.innerHTML=''
      +'<div class="badge2">Sentence Builder</div>'
      +'<h2>句子排序</h2>'
      +'<p class="small">把日语词块按正确顺序排列，训练句型结构。</p>'
      +'<p class="buttons"><button class="primary" id="startDuoOrder">开始排序</button></p>';
    var ref=document.getElementById('duoListenEntry')||document.getElementById('duoVocabEntry');
    if(ref&&ref.parentNode)ref.parentNode.insertBefore(card,ref.nextSibling);
    else main.insertBefore(card,main.firstChild);
    document.getElementById('startDuoOrder').onclick=startPractice;
  }

  function startPractice(){
    items=shuffle(getExamples()).slice(0,6);
    index=0;
    score=0;
    answer=[];
    renderQuestion();
  }

  function renderQuestion(){
    var app=document.getElementById('app');
    if(!app)return;
    if(index>=items.length){renderDone();return;}
    var item=items[index];
    var percent=Math.round(index/(items.length||1)*100);
    var choices=shuffle(item.parts);
    answer=[];

    app.innerHTML=''
      +'<main class="duoScreen duoOrderScreen">'
      +'<div class="duoTop"><button id="orderExit">×</button><div class="duoProgress"><i style="width:'+percent+'%"></i></div></div>'
      +'<h1>排列这个句子</h1>'
      +'<p class="orderHint">'+esc(item.meaning||'按正确顺序组成日语句子')+'</p>'
      +'<div id="orderAnswer" class="orderAnswer"></div>'
      +'<div id="orderChoices" class="orderChoices">'+choices.map(function(p,i){return '<button class="orderChip" data-text="'+esc(p)+'">'+esc(p)+'</button>';}).join('')+'</div>'
      +'<button id="orderCheck" class="duoCheck" disabled>检查</button>'
      +'</main>';

    document.getElementById('orderExit').onclick=function(){location.reload()};
    document.querySelectorAll('.orderChip').forEach(function(btn){btn.onclick=function(){pickChip(btn)}});
    document.getElementById('orderAnswer').onclick=function(e){
      if(e.target&&e.target.classList.contains('answerChip'))removeChip(e.target);
    };
  }

  function pickChip(btn){
    var text=btn.dataset.text;
    answer.push(text);
    btn.disabled=true;
    btn.classList.add('used');
    paintAnswer();
  }

  function removeChip(chip){
    var idx=Number(chip.dataset.index);
    var text=answer[idx];
    answer.splice(idx,1);
    document.querySelectorAll('.orderChip').forEach(function(btn){
      if(btn.dataset.text===text&&btn.disabled){btn.disabled=false;btn.classList.remove('used');return false;}
    });
    paintAnswer();
  }

  function paintAnswer(){
    var box=document.getElementById('orderAnswer');
    if(!box)return;
    box.innerHTML=answer.map(function(x,i){return '<button class="answerChip" data-index="'+i+'">'+esc(x)+'</button>';}).join('');
    var check=document.getElementById('orderCheck');
    check.disabled=answer.length!==items[index].parts.length;
    check.classList.toggle('active',!check.disabled);
    check.onclick=checkAnswer;
  }

  function checkAnswer(){
    var item=items[index];
    var ok=answer.join('')===item.parts.join('');
    if(ok)score++;
    document.querySelectorAll('.answerChip').forEach(function(b){b.classList.add(ok?'right':'wrong')});
    var check=document.getElementById('orderCheck');
    check.textContent=ok?'正确':'继续';
    check.classList.add('active');
    check.onclick=function(){index++;renderQuestion()};
  }

  function renderDone(){
    var app=document.getElementById('app');
    var percent=Math.round(score/(items.length||1)*100);
    app.innerHTML=''
      +'<main class="duoScreen duoDone">'
      +'<h1>句子排序完成！</h1>'
      +'<p>正确率 '+percent+'% · '+score+'/'+items.length+'</p>'
      +'<button class="duoCheck active" id="orderAgain">再来一组</button>'
      +'<button class="duoCheck light" id="orderBack">返回课程</button>'
      +'</main>';
    document.getElementById('orderAgain').onclick=startPractice;
    document.getElementById('orderBack').onclick=function(){location.reload()};
  }

  function injectCss(){
    if(document.getElementById('duoOrderStyle'))return;
    var css=document.createElement('style');
    css.id='duoOrderStyle';
    css.textContent=''
      +'.orderHint{text-align:left;color:#6b7280;font-size:20px;font-weight:800;margin:36px 0 20px}.orderAnswer{min-height:120px;border-bottom:3px solid #e5e7eb;border-top:3px solid #e5e7eb;padding:18px 0;display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start}.orderChoices{margin-top:48px;display:flex;flex-wrap:wrap;gap:12px}.orderChip,.answerChip{min-height:54px;border:3px solid #e5e7eb;border-radius:14px;background:#fff;color:#3f3f46;font-size:20px;font-weight:900;padding:8px 18px;box-shadow:0 4px 0 #e5e7eb}.orderChip.used{opacity:.25}.answerChip.right{background:#d7ffb8;border-color:#58cc02;box-shadow:0 4px 0 #58cc02}.answerChip.wrong{background:#ffdfe0;border-color:#ff4b4b;box-shadow:0 4px 0 #ff4b4b}.duoEntryPanel{border-color:#bbf7d0;background:#f0fdf4}'
      +'@media(max-width:520px){.orderHint{font-size:18px}.orderChip,.answerChip{font-size:18px;min-height:50px;padding:8px 14px}.orderChoices{margin-top:34px}}';
    document.head.appendChild(css);
  }

  function boot(){
    injectCss();
    setTimeout(injectEntry,1100);
    setTimeout(injectEntry,2300);
  }

  window.MinnaDuoOrder={start:startPractice};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
