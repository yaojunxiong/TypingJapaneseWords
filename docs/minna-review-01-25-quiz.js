// Minna Review 01-25 interactive quiz bank and engine
(function(){
  const $ = id => document.getElementById(id);
  const bank = [
    {l:1,t:'grammar',q:'「わたしは学生です」是什么意思？',o:['我是学生','你是学生','他不是学生'],a:0,tip:'AはBです = A是B。'},
    {l:2,t:'vocab',q:'これ',o:['这个','那个','哪里'],a:0,tip:'これ=靠近说话人的“这个”。'},
    {l:3,t:'sentence',q:'“厕所在哪里？”的日语是？',o:['トイレはどこですか。','トイレはだれですか。','トイレはいくらですか。'],a:0,tip:'どこ=哪里。'},
    {l:4,t:'grammar',q:'「今、何時ですか」是什么意思？',o:['现在几点？','今天星期几？','多少钱？'],a:0,tip:'何時=几点。'},
    {l:5,t:'grammar',q:'「電車で行きます」里的 で 表示？',o:['交通工具','地点存在','对象'],a:0,tip:'交通工具 + で。'},
    {l:6,t:'vocab',q:'食べます',o:['吃','喝','看'],a:0,tip:'食べます=吃。'},
    {l:7,t:'grammar',q:'「箸で食べます」里的 で 表示？',o:['工具/手段','时间','方向'],a:0,tip:'工具 + で。'},
    {l:8,t:'grammar',q:'い形容词否定如何变化？',o:['〜くないです','〜じゃありません','〜でした'],a:0,tip:'高い→高くないです。'},
    {l:9,t:'sentence',q:'“我喜欢音乐。”的日语是？',o:['音楽が好きです。','音楽を好きです。','音楽に好きです。'],a:0,tip:'好き的对象用 が。'},
    {l:10,t:'grammar',q:'人/动物的存在用？',o:['います','あります','です'],a:0,tip:'人和动物用 います。'},
    {l:11,t:'vocab',q:'一つ',o:['一个','一个人','一张'],a:0,tip:'一つ=一个。'},
    {l:12,t:'grammar',q:'「昨日は寒かったです」是什么意思？',o:['昨天很冷','昨天不冷','今天很冷'],a:0,tip:'い形容词过去：〜かったです。'},
    {l:13,t:'grammar',q:'「水が欲しいです」是什么意思？',o:['想要水','想喝水','有水'],a:0,tip:'名词が欲しいです。'},
    {l:14,t:'grammar',q:'「待ってください」是什么意思？',o:['请等一下','可以等','正在等'],a:0,tip:'て形 + ください。'},
    {l:15,t:'sentence',q:'“这里不能吸烟。”的日语是？',o:['ここでたばこを吸ってはいけません。','ここでたばこを吸ってもいいです。','ここにたばこがあります。'],a:0,tip:'〜てはいけません=不可以。'},
    {l:16,t:'grammar',q:'「食べてから、勉強します」是什么意思？',o:['吃完后学习','一边吃一边学习','为了吃饭学习'],a:0,tip:'〜てから=……之后。'},
    {l:17,t:'grammar',q:'「行かないでください」是什么意思？',o:['请不要去','不去也可以','必须去'],a:0,tip:'ない形 + でください。'},
    {l:18,t:'grammar',q:'「日本語を話すことができます」是什么意思？',o:['会说日语','想说日语','正在说日语'],a:0,tip:'辞书形 + ことができます。'},
    {l:19,t:'grammar',q:'「日本へ行ったことがあります」是什么意思？',o:['去过日本','想去日本','正在去日本'],a:0,tip:'た形 + ことがあります。'},
    {l:20,t:'sentence',q:'“我认为明天会下雨。”的日语是？',o:['明日雨が降ると思います。','明日雨が降りますと思います。','明日雨と思います降る。'],a:0,tip:'普通形 + と思います。'},
    {l:21,t:'grammar',q:'〜と思います 表示？',o:['我认为/我觉得','我说','我必须'],a:0,tip:'表达自己的判断。'},
    {l:22,t:'sentence',q:'“这是我昨天买的书。”的日语是？',o:['これは昨日買った本です。','これは昨日買いました本です。','これは昨日を買った本です。'],a:0,tip:'普通形修饰名词。'},
    {l:23,t:'grammar',q:'「暇なとき、音楽を聞きます」是什么意思？',o:['有空时听音乐','听音乐后有空','即使有空也听'],a:0,tip:'〜とき=……的时候。'},
    {l:24,t:'grammar',q:'「友達が本をくれました」是什么意思？',o:['朋友给了我书','我给朋友书','我从朋友买书'],a:0,tip:'くれます=别人给我/我方。'},
    {l:25,t:'grammar',q:'「雨が降ったら、行きません」是什么意思？',o:['如果下雨就不去','即使下雨也去','下雨后已经去'],a:0,tip:'た形 + ら=如果/……之后。'},
    {l:25,t:'sentence',q:'“即使贵也买。”的日语是？',o:['高くても、買います。','高かったら、買います。','高いので買います。'],a:0,tip:'い形容词：〜くても。'}
  ];
  let queue=[], idx=0, correct=0, wrong=0, wrongItems=[];
  function shuffle(a){ return a.slice().sort(()=>Math.random()-.5); }
  function esc(s){ return String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
  function updateStats(){
    const total = correct + wrong;
    const rate = total ? Math.round(correct / total * 100) : 0;
    if($('reviewScore')) $('reviewScore').textContent = correct * 4;
    if($('reviewCorrect')) $('reviewCorrect').textContent = correct;
    if($('reviewWrong')) $('reviewWrong').textContent = wrong;
    if($('reviewRate')) $('reviewRate').textContent = rate + '%';
  }
  function renderQuestion(){
    const box = $('interactiveQuiz');
    if(!box) return;
    if(idx >= queue.length){ return finish(); }
    const it = queue[idx];
    box.innerHTML = '<p><span class="pill auto">第'+it.l+'课</span><span class="pill">'+it.t+'</span><span class="pill">'+(idx+1)+'/'+queue.length+'</span></p>'+
      '<h3>'+esc(it.q)+'</h3>'+
      it.o.map((x,i)=>'<button class="quizChoice" data-i="'+i+'">'+esc(x)+'</button>').join('')+
      '<p class="small" id="quizFeedback">请选择答案。</p>';
    box.querySelectorAll('.quizChoice').forEach(btn=>btn.onclick=()=>answer(Number(btn.dataset.i)));
  }
  function answer(i){
    const it = queue[idx];
    document.querySelectorAll('.quizChoice').forEach((b,k)=>{
      b.disabled = true;
      if(k===it.a) b.classList.add('correct');
      if(k===i && i!==it.a) b.classList.add('wrong');
    });
    if(i===it.a){ correct++; $('quizFeedback').textContent='答对了！'+it.tip; }
    else { wrong++; wrongItems.push(it); $('quizFeedback').textContent='不对。正确答案：'+it.o[it.a]+'。'+it.tip; }
    idx++; updateStats(); setTimeout(renderQuestion, 900);
  }
  function finish(){
    const rate = queue.length ? Math.round(correct / queue.length * 100) : 0;
    $('interactiveQuiz').innerHTML = '<h3>本轮测试完成</h3><p>答对 '+correct+' / '+queue.length+'，正确率 '+rate+'%。</p>'+
      (rate>=80?'<p><span class="pill ok">✅ 达到总复习建议标准</span></p>':'<p><span class="pill warn">建议继续复习错题</span></p>')+
      '<div class="btns"><button class="primary" onclick="MinnaReview.start(\'mixed\')">再来一轮</button><button class="light" onclick="MinnaReview.showWrong()">查看错题</button></div>';
    showWrong();
  }
  function start(mode){
    const src = bank.filter(x => mode==='mixed' || x.t===mode);
    queue = shuffle(src).slice(0, mode==='mixed'?25:12);
    idx=0; correct=0; wrong=0; wrongItems=[]; updateStats(); renderQuestion();
  }
  function showWrong(){
    const list = $('wrongReviewList');
    if(!list) return;
    if(!wrongItems.length){ list.innerHTML='<p class="small">本轮暂无错题。</p>'; return; }
    list.innerHTML = wrongItems.map((x,i)=>'<div class="wrongBox"><b>'+(i+1)+'. 第'+x.l+'课｜'+x.t+'</b><p>'+esc(x.q)+'</p><p>正确答案：<span class="pill ok">'+esc(x.o[x.a])+'</span></p><p class="small">'+esc(x.tip)+'</p></div>').join('');
  }
  window.MinnaReview = { start, showWrong };
})();
