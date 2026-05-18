// Minna AI Learning System visitor tracker
// Silent Supabase insert-only visit log + lightweight admin entrance button.
// The home page no longer displays a visitor info card.
(function(){
  const SUPABASE_URL = 'https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  let client = null;
  function supa(){
    if(!window.supabase) throw new Error('Supabase SDK is not loaded.');
    if(!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function visitorId(){
    const key = 'minna_visitor_id';
    let id = localStorage.getItem(key);
    if(!id){
      id = 'v_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  }
  function deviceType(){
    const ua = navigator.userAgent || '';
    if(/iPad|Tablet/i.test(ua)) return 'tablet';
    if(/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  function visitSource(){
    const ref = document.referrer || '';
    if(!ref) return 'direct';
    try{
      const host = new URL(ref).hostname;
      if(host.includes('google')) return 'google';
      if(host.includes('github')) return 'github';
      if(host.includes('chatgpt')) return 'chatgpt';
      return host;
    }catch(e){ return 'referrer'; }
  }
  function collect(user){
    return {
      visitor_id: visitorId(),
      user_id: user && user.id ? user.id : null,
      user_email: user && user.email ? user.email : null,
      page_path: location.pathname + location.search,
      page_title: document.title,
      referrer: document.referrer || '',
      user_agent: navigator.userAgent || '',
      language: navigator.language || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      screen_width: window.screen && window.screen.width ? window.screen.width : null,
      screen_height: window.screen && window.screen.height ? window.screen.height : null,
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null,
      device_type: deviceType(),
      visit_source: visitSource(),
      visited_at: new Date().toISOString()
    };
  }
  function installAdminLinks(){
    if(document.querySelector('[data-minna-admin-link="1"]')) return;
    var href = './minna-admin.html';
    var headerBtns = document.querySelector('header .btns');
    if(headerBtns){
      var a = document.createElement('a');
      a.className = 'btn light';
      a.href = href;
      a.dataset.minnaAdminLink = '1';
      a.textContent = '🔐 管理员后台';
      headerBtns.appendChild(a);
    }
    var accountPanel = Array.prototype.slice.call(document.querySelectorAll('.panel')).find(function(p){ return /账号中心/.test(p.textContent || ''); });
    var accountBtns = accountPanel && accountPanel.querySelector('.btns');
    if(accountBtns){
      var b = document.createElement('a');
      b.className = 'btn light';
      b.href = href;
      b.dataset.minnaAdminLink = '1';
      b.textContent = '🔐 管理员后台';
      accountBtns.appendChild(b);
    }
  }
  function removeOldVisitorCard(){
    var old = document.querySelector('.visitorPanel');
    if(old && old.parentNode) old.parentNode.removeChild(old);
  }
  async function track(){
    installAdminLinks();
    removeOldVisitorCard();
    try{
      let user = null;
      if(window.MinnaAuth && MinnaAuth.refreshUser){ user = await MinnaAuth.refreshUser(); }
      else {
        const {data} = await supa().auth.getUser();
        user = data && data.user ? data.user : null;
      }
      const payload = collect(user);
      await supa().from('minna_visitor_logs').insert(payload);
    }catch(e){
      console.warn('Minna visitor tracking failed:', e && e.message ? e.message : e);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', track); else track();
  window.addEventListener('minna-auth-changed', function(){ setTimeout(track, 500); });
})();