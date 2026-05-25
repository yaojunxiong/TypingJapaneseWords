// Minna favorites page v20.3.10
(function(){
  var KEY='minna.vocab.favorites.v1';
  var VERSION = window.MINNA_VERSION || '22.1';

  function read(){
    try{return JSON.parse(localStorage.getItem(KEY)||'[]')||[]}
    catch(e){return []}
  }

  function write(list){
    try{localStorage.setItem(KEY,JSON.stringify(list))}catch(e){}
  }

  function esc(s){
    return String(s||'').replace(/[&<>\"]/g,function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];
    });
  }

  function render(list){
    var grid=document.getElementById('favGrid');
    var count=document.getElementById('favCount');
    if(!grid||!count)return;

    count.textContent='已收藏 '+list.length+' 个词汇';

    if(!list.length){
      grid.innerHTML='<div class="panel"><h3>暂无收藏</h3><p class="small">进入课程后点击 ☆ 收藏 即可加入。</p></div>';
      return;
    }

    grid.innerHTML=list.map(function(v){
      return ''
        +'<article class="lesson unlocked favWordCard">'
        +'<span>第 '+Number(v.lessonNo||1)+' 课</span>'
        +'<b>'+esc(v.jp||'')+'</b>'
        +'<small>'+esc(v.kana||'')+'</small>'
        +'<p>'+esc(v.meaning||'')+'</p>'
        +'<div class="buttons">'
        +'<a class="primary" href="./minna-path.html?lesson='+Number(v.lessonNo||1)+'&v='+VERSION+'">打开课程</a>'
        +'<button class="light removeFavBtn" data-id="'+esc(v.id||'')+'">移除</button>'
        +'</div>'
        +'</article>';
    }).join('');

    bindRemove();
  }

  function bindRemove(){
    document.querySelectorAll('.removeFavBtn').forEach(function(btn){
      btn.onclick=function(){
        var id=btn.dataset.id;
        var next=read().filter(function(x){return x.id!==id});
        write(next);
        render(next);
      };
    });
  }

  function search(){
    var q=(document.getElementById('favSearch')||{}).value||'';
    q=q.trim().toLowerCase();
    var all=read();
    if(!q){render(all);return;}

    render(all.filter(function(v){
      return [v.jp,v.kana,v.meaning,'第'+v.lessonNo+'课']
        .join(' ')
        .toLowerCase()
        .indexOf(q)>=0;
    }));
  }

  function shuffle(){
    var arr=read().slice();
    arr.sort(function(){return Math.random()-0.5});
    render(arr);
  }

  function exportJson(){
    var blob=new Blob([JSON.stringify(read(),null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download='minna-favorites.json';
    a.click();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
  }

  function clearAll(){
    if(!confirm('确定清空所有收藏词汇吗？'))return;
    write([]);
    render([]);
  }

  function bind(){
    var searchBox=document.getElementById('favSearch');
    if(searchBox)searchBox.oninput=search;

    var shuffleBtn=document.getElementById('shuffleBtn');
    if(shuffleBtn)shuffleBtn.onclick=shuffle;

    var exportBtn=document.getElementById('exportBtn');
    if(exportBtn)exportBtn.onclick=exportJson;

    var clearBtn=document.getElementById('clearBtn');
    if(clearBtn)clearBtn.onclick=clearAll;
  }

  function boot(){
    render(read());
    bind();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
