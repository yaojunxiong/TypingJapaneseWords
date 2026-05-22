// Minna vocabulary favorites v20.3.9
(function(){
  var VERSION='20.3.9';
  var KEY='minna.vocab.favorites.v1';

  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||'[]')||[]}
    catch(e){return []}
  }

  function write(list){
    try{localStorage.setItem(KEY,JSON.stringify(list))}catch(e){}
  }

  function vocabId(card){
    var jp=(card.querySelector('b')||{}).textContent||'';
    var kana=(card.querySelector('small')||{}).textContent||'';
    return (jp+'|'+kana).trim();
  }

  function vocabData(card){
    var jp=(card.querySelector('b')||{}).textContent||'';
    var kana=(card.querySelector('small')||{}).textContent||'';
    var meaning=(card.querySelector('span')||{}).textContent||'';
    var n=Number((document.body&&document.body.dataset.lessonNo)||new URLSearchParams(location.search).get('n')||1);
    return {id:vocabId(card),jp:jp,kana:kana,meaning:meaning,lessonNo:n,at:Date.now(),version:VERSION};
  }

  function isFav(id){return read().some(function(x){return x.id===id})}

  function toggle(card,btn){
    var data=vocabData(card);
    if(!data.id)return;
    var list=read();
    var exists=list.some(function(x){return x.id===data.id});
    if(exists){
      list=list.filter(function(x){return x.id!==data.id});
    }else{
      list.unshift(data);
    }
    write(list.slice(0,500));
    btn.classList.toggle('active',!exists);
    btn.textContent=!exists?'★ 已收藏':'☆ 收藏';
    updatePanel();
  }

  function installButtons(){
    document.querySelectorAll('.vcard').forEach(function(card){
      if(card.querySelector('.favBtn'))return;
      var id=vocabId(card);
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='favBtn';
      btn.textContent=isFav(id)?'★ 已收藏':'☆ 收藏';
      if(isFav(id))btn.classList.add('active');
      btn.onclick=function(){toggle(card,btn)};
      card.insertBefore(btn,card.firstChild);
    });
  }

  function updatePanel(){
    var box=document.getElementById('favMiniPanel');
    if(!box)return;
    var list=read();
    box.textContent='已收藏 '+list.length+' 个词汇';
  }

  function installPanel(){
    if(document.getElementById('favMiniPanel'))return;
    var main=document.querySelector('main.wrap');
    if(!main)return;
    var panel=document.createElement('section');
    panel.className='panel favPanel';
    var h=document.createElement('h2');
    h.textContent='我的收藏词汇';
    var p=document.createElement('p');
    p.id='favMiniPanel';
    p.className='small';
    panel.appendChild(h);
    panel.appendChild(p);
    main.insertBefore(panel,main.firstChild);
    updatePanel();
  }

  function boot(){
    installPanel();
    installButtons();
    setTimeout(installButtons,800);
    setTimeout(installButtons,1800);
  }

  window.MinnaVocabFavorites={read:read,write:write,refresh:boot};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
