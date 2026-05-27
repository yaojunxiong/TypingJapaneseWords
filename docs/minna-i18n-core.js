// Minna i18n core v15.0
(function(){
  const KEY='minna_ui_lang';
  const listeners=[];
  const packs={};
  function lang(){return localStorage.getItem(KEY)||'zh'}
  function setLang(v){
    const next=(v==='en')?'en':'zh';
    localStorage.setItem(KEY,next);
    document.documentElement.lang=next==='en'?'en':'zh-CN';
    listeners.slice().forEach(fn=>{try{fn(next)}catch(e){console.warn(e)}});
  }
  function register(name,dict){packs[name]=dict||{}}
  function get(path){
    const parts=String(path||'').split('.');
    for(const packName of Object.keys(packs)){
      let cur=packs[packName];
      for(const p of parts){cur=cur&&cur[p]}
      if(cur!==undefined)return cur;
    }
    return undefined;
  }
  function pick(v){
    if(v&&typeof v==='object'&&!Array.isArray(v))return v[lang()]||v.zh||v.en||'';
    return v==null?'':String(v);
  }
  function t(path,vars){
    let v=pick(get(path));
    if(vars)Object.keys(vars).forEach(k=>{v=String(v).split('{'+k+'}').join(vars[k])});
    return v||path;
  }
  function onChange(fn){listeners.push(fn)}
  function installToggle(target){
    const host=typeof target==='string'?document.querySelector(target):target;
    if(!host)return;
    let box=document.getElementById('minnaLangToggleV15');
    if(!box){
      box=document.createElement('span');box.id='minnaLangToggleV15';box.className='langToggleV15';
      box.innerHTML='<button type="button" data-lang="zh">中文</button><button type="button" data-lang="en">EN</button>';
      host.appendChild(box);
      Array.from(box.querySelectorAll('button')).forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
    }
    Array.from(box.querySelectorAll('button')).forEach(b=>b.classList.toggle('active',b.dataset.lang===lang()));
  }
  window.MinnaI18n={lang,setLang,register,t,pick,onChange,installToggle};
  document.documentElement.lang=lang()==='en'?'en':'zh-CN';
})();
