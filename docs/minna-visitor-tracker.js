// Minna AI Learning System visitor tracker
// Privacy-friendly visitor info card + Supabase insert-only visit log.
// Also injects a lightweight admin entrance button into the home page.
(function(){
  const SUPABASE_URL = 'https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  let client = null;
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s || '').replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
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
  function browserName(){
    const ua = navigator.userAgent || '';
    if(/Edg\//.test(ua)) return 'Microsoft Edge';
    if(/Chrome\//.test(ua)) return 'Chrome';
    if(/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    if(/Firefox\//.test(ua)) return 'Firefox';
    return 'Unknown Browser';
  }
  function osName(){
    const ua = navigator.userAgent || '';
    if(/Windows/i.test(ua)) return 'Windows';
    if(/Mac OS X/i.test(ua)) return 'macOS';
    if(/iPhone|iPad/i.test(ua)) return 'iOS/iPadOS';
    if(/Android/i.test(ua)) return 'Android';
    return 'Unknown OS';
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
    var labels = ['🔐 管理员后台'];
    var headerBtns = document.querySelector('header .btns');
    if(headerBtns){
      var a = document.createElement('a');
      a.className = 'btn light';
      a.href = href;
      a.dataset.minnaAdminLink = '1';
      a.textContent = labels[0];
      headerBtns.appendChild(a);
    }
    var accountPanel = Array.prototype.slice.call(document.querySelectorAll('.panel')).find(function(p){ return /账号中心/.test(p.textContent || ''); });
    var accountBtns = accountPanel && accountPanel.querySelector('.btns');
    if(accountBtns){
      var b = document.createElement('a');
      b.className = 'btn light';
      b.href = href;
      b.dataset.minnaAdminLink = '1';
      b.textContent = labels[0];
      accountBtns.appendChild(b);
    }
  }
  function renderInfo(data, saved, err){
    const box = $('visitorInfoBox');
    if(!box) return;
    const login = data.user_email ? data.user_email : '未登录 / 匿名访客';
    box.innerHTML = '<div class="grid">'
      + '<div><b>访客</b><br><span class="small">'+esc(login)+'</span></div>'
      + '<div><b>设备</b><br><span class="small">'+esc(deviceType()+' / '+osName()+' / '+browserName())+'</span></div>'
      + '<div><b>语言 / 时区</b><br><span class="small">'+esc((data.language||'')+' / '+(data.timezone||''))+'</span></div>'
      + '<div><b>访问来源</b><br><span class="small">'+esc(data.visit_source||'direct')+'</span></div>'
      + '</div>'
      + '<p class="small">本次访问：'+esc(new Date(data.visited_at).toLocaleString())+' ｜ 页面：'+esc(data.page_path)+' ｜ 统计状态：'+(saved?'<span class="pill ok">已记录</span>':'<span class="pill warn">未记录</span>')+(err?' '+esc(err):'')+'</p>';
  }
  function installCard(){
    installAdminLinks();
    if($('visitorInfoBox')) return;
    const main = document.querySelector('main');
    if(!main) return;
    const sec = document.createElement('section');
    sec.className = 'panel visitorPanel';
    sec.innerHTML = '<div class="leaderHead"><div><h2>👀 访客信息</h2><p class="small">用于管理员统计学习系统访问情况。公开页面只显示本次访问信息，不公开所有访客名单。</p></div><div><span class="pill auto" id="visitorStatus">初始化中</span></div></div><div id="visitorInfoBox"><p class="small">读取访客信息中……</p></div>';
    const first = main.firstElementChild;
    if(first && first.nextSibling) main.insertBefore(sec, first.nextSibling); else main.appendChild(sec);
  }
  async function track(){
    installCard();
    const status = $('visitorStatus');
    try{
      if(status) status.textContent = '记录访问中...';
      let user = null;
      if(window.MinnaAuth && MinnaAuth.refreshUser){ user = await MinnaAuth.refreshUser(); }
      else {
        const {data} = await supa().auth.getUser();
        user = data && data.user ? data.user : null;
      }
      const payload = collect(user);
      const { error } = await supa().from('minna_visitor_logs').insert(payload);
      if(error) throw error;
      if(status){ status.textContent = '已记录'; status.className = 'pill ok'; }
      renderInfo(payload, true, '');
    }catch(e){
      const payload = collect(null);
      if(status){ status.textContent = '记录失败'; status.className = 'pill warn'; }
      renderInfo(payload, false, e.message || String(e));
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', track); else track();
  window.addEventListener('minna-auth-changed', function(){ setTimeout(track, 500); });
})();