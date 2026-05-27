// Minna home v15.3 stability patch
// This patch does not translate DOM text. It only preserves UI state and improves home-page stability.
(function(){
  const SEARCH_KEY='minna_home_v15_search';
  const FILTER_KEY='minna_home_v15_filter';
  let applying=false;
  function qs(id){return document.getElementById(id)}
  function saveState(){
    const s=qs('searchBox'), f=qs('filterBox');
    if(s) localStorage.setItem(SEARCH_KEY,s.value||'');
    if(f) localStorage.setItem(FILTER_KEY,f.value||'all');
  }
  function restoreState(){
    if(applying)return;
    applying=true;
    try{
      const s=qs('searchBox'), f=qs('filterBox');
      let changed=false;
      if(s){
        const old=localStorage.getItem(SEARCH_KEY)||'';
        if(s.value!==old){s.value=old;changed=true;}
        if(!s.__v153){s.__v153=true;s.addEventListener('input',saveState);}
      }
      if(f){
        const old=localStorage.getItem(FILTER_KEY)||'all';
        if(f.value!==old){f.value=old;changed=true;}
        if(!f.__v153){f.__v153=true;f.addEventListener('change',saveState);}
      }
      if(changed && (s||f)){
        const ev=new Event('input',{bubbles:true});
        if(s)s.dispatchEvent(ev);
        if(f)f.dispatchEvent(new Event('change',{bubbles:true}));
      }
      patchRecentRecords();
      patchVersionBadge();
      patchLeaderboardMessage();
    }finally{applying=false;}
  }
  function patchVersionBadge(){
    const b=document.querySelector('.badge');
    if(b && b.textContent && b.textContent.indexOf('15.3')<0){
      b.textContent=b.textContent.replace(/15\.0|15\.1|15\.2/g,'15.3');
    }
  }
  function patchRecentRecords(){
    try{
      const raw=JSON.parse(localStorage.getItem('minna_recent_lessons')||'[]');
      if(!Array.isArray(raw))return;
      const fixed=raw.map(x=>{
        if(typeof x==='number')return {n:x,at:Date.now()};
        if(typeof x==='string'){
          const m=x.match(/(\d+)/);return {n:m?Number(m[1]):1,at:Date.now()};
        }
        if(x&&typeof x==='object')return {n:Number(x.n||x.lesson||x.lessonNo||1),at:x.at||x.time||Date.now()};
        return null;
      }).filter(x=>x&&x.n>=1&&x.n<=50);
      const uniq=[];const seen={};
      fixed.forEach(x=>{if(!seen[x.n]){seen[x.n]=true;uniq.push(x)}});
      localStorage.setItem('minna_recent_lessons',JSON.stringify(uniq.slice(0,5)));
    }catch(e){}
  }
  function patchLeaderboardMessage(){
    const box=qs('leaderBox');
    if(!box||box.__v153Leader)return;
    box.__v153Leader=true;
    const obs=new MutationObserver(()=>{
      const txt=(box.textContent||'').toLowerCase();
      if(txt.includes('does not exist')||txt.includes('not found')||txt.includes('permission')||txt.includes('supabase not ready')){
        const en=(localStorage.getItem('minna_ui_lang')==='en');
        box.innerHTML=en
          ? 'Leaderboard is not ready. Please confirm the Supabase public leaderboard view and login status.'
          : '排行榜暂时不可用。请确认 Supabase 公开排行榜 view 和登录状态。';
      }
    });
    obs.observe(box,{childList:true,subtree:true,characterData:true});
  }
  function start(){
    restoreState();
    const app=qs('app');
    if(app){new MutationObserver(()=>setTimeout(restoreState,50)).observe(app,{childList:true,subtree:true});}
    window.addEventListener('beforeunload',saveState);
    setTimeout(restoreState,500);
    setTimeout(restoreState,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
