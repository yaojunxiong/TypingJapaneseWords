// Minna AI Global Auth Module
// Shared Google login + Supabase progress sync for all Minna no Nihongo lesson pages.
// Usage:
//   await MinnaAuth.init({ lessonId: 'minna_lesson_01' })
//   await MinnaAuth.loginWithGoogle()
//   await MinnaAuth.saveProgress(state)
//   const state = await MinnaAuth.loadProgress()

window.MinnaAuth = (() => {
  const SUPABASE_URL = 'https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  const DEFAULT_LESSON_ID = 'minna_lesson_01';
  const LEGACY_USER_KEY = 'yoyo';
  let client = null;
  let user = null;
  let lessonId = DEFAULT_LESSON_ID;

  function ensureClient() {
    if (!window.supabase) {
      throw new Error('Supabase SDK is not loaded. Add @supabase/supabase-js before minna-auth.js.');
    }
    if (!client) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return client;
  }

  function currentRedirectUrl() {
    return window.location.href.split('#')[0];
  }

  async function init(options = {}) {
    lessonId = options.lessonId || document.body.dataset.lessonId || DEFAULT_LESSON_ID;
    const supa = ensureClient();
    const { data } = await supa.auth.getUser();
    user = data && data.user ? data.user : null;
    supa.auth.onAuthStateChange((_event, session) => {
      user = session && session.user ? session.user : null;
      window.dispatchEvent(new CustomEvent('minna-auth-changed', { detail: { user } }));
    });
    window.dispatchEvent(new CustomEvent('minna-auth-ready', { detail: { user, lessonId } }));
    return { user, lessonId };
  }

  async function refreshUser() {
    const supa = ensureClient();
    const { data } = await supa.auth.getUser();
    user = data && data.user ? data.user : null;
    return user;
  }

  async function loginWithGoogle() {
    const supa = ensureClient();
    const { error } = await supa.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: currentRedirectUrl() }
    });
    if (error) throw error;
  }

  async function logout() {
    const supa = ensureClient();
    const { error } = await supa.auth.signOut();
    if (error) throw error;
    user = null;
    window.dispatchEvent(new CustomEvent('minna-auth-changed', { detail: { user } }));
  }

  function userKey() {
    if (user) return `auth:${user.id}`;
    return LEGACY_USER_KEY;
  }

  function userEmail() {
    return user && user.email ? user.email : '';
  }

  async function saveProgress(progress, overrideLessonId) {
    const supa = ensureClient();
    await refreshUser();
    const activeLessonId = overrideLessonId || lessonId;
    const payload = {
      user_key: userKey(),
      lesson_id: activeLessonId,
      progress,
      updated_at: new Date().toISOString()
    };
    if (user) {
      payload.user_id = user.id;
      payload.user_email = user.email || '';
    }
    const { error } = await supa
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_key,lesson_id' });
    if (error) throw error;
    return payload;
  }

  async function loadProgress(overrideLessonId) {
    const supa = ensureClient();
    await refreshUser();
    const activeLessonId = overrideLessonId || lessonId;
    const { data, error } = await supa
      .from('lesson_progress')
      .select('progress,updated_at,user_email,lesson_id')
      .eq('user_key', userKey())
      .eq('lesson_id', activeLessonId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listProgress() {
    const supa = ensureClient();
    await refreshUser();
    const { data, error } = await supa
      .from('lesson_progress')
      .select('lesson_id,progress,updated_at,user_email')
      .eq('user_key', userKey())
      .order('lesson_id', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  return {
    init,
    refreshUser,
    loginWithGoogle,
    logout,
    saveProgress,
    loadProgress,
    listProgress,
    userKey,
    userEmail,
    getUser: () => user,
    getLessonId: () => lessonId,
    config: { SUPABASE_URL }
  };
})();

// Vocabulary choice-mode enhancer
// Converts the two-column vocabulary matching UI into a Duolingo-style one-word multiple-choice card on all devices.
(function(){
  function shuffle(arr){ return arr.slice().sort(function(){ return Math.random() - 0.5; }); }
  function enhanceVocabMatch(){
    var stage = document.getElementById('stage');
    if(!stage || !/核心词汇/.test(stage.textContent || '')) return;
    var match = stage.querySelector('.match');
    if(!match || stage.querySelector('#mobileVocabCard')) return;
    var leftButtons = Array.prototype.slice.call(match.querySelectorAll('[data-l]'));
    var rightButtons = Array.prototype.slice.call(match.querySelectorAll('[data-r]'));
    if(!leftButtons.length || !rightButtons.length) return;
    match.style.display = 'none';
    var pairs = leftButtons.map(function(btn){
      var idx = btn.getAttribute('data-l');
      var r = rightButtons.find(function(x){ return x.getAttribute('data-r') === idx; });
      return { idx: idx, jp: btn.textContent.trim(), cn: r ? r.textContent.trim() : '' };
    }).filter(function(x){ return x.cn; });
    var current = 0;
    var card = document.createElement('div');
    card.id = 'mobileVocabCard';
    card.innerHTML = '<div class="box jpbox" style="text-align:center"><div class="small">词汇选择模式</div><div id="mvWord" class="jp"></div></div><div id="mvOptions" class="sentenceBank"></div><p id="mvFeedback" class="small"></p>';
    match.parentNode.insertBefore(card, match);
    function render(){
      var item = pairs[current];
      if(!item){
        document.getElementById('mvWord').textContent = '完成！';
        document.getElementById('mvOptions').innerHTML = '';
        document.getElementById('mvFeedback').textContent = '词汇练习完成，可以继续语法。';
        return;
      }
      document.getElementById('mvWord').textContent = item.jp;
      var wrongs = shuffle(pairs.filter(function(x){ return x.idx !== item.idx; })).slice(0,3);
      var opts = shuffle([item].concat(wrongs));
      document.getElementById('mvOptions').innerHTML = opts.map(function(o){
        return '<button class="choice" data-mv="'+o.idx+'">'+o.cn+'</button>';
      }).join('');
      document.getElementById('mvFeedback').textContent = '请选择中文意思：' + (current + 1) + '/' + pairs.length;
      Array.prototype.slice.call(document.querySelectorAll('[data-mv]')).forEach(function(btn){
        btn.onclick = function(){
          var chosen = btn.getAttribute('data-mv');
          var hiddenLeft = stage.querySelector('[data-l="'+item.idx+'"]');
          var hiddenRight = stage.querySelector('[data-r="'+chosen+'"]');
          if(hiddenLeft) hiddenLeft.click();
          if(hiddenRight) hiddenRight.click();
          if(chosen === item.idx){
            btn.classList.add('correct');
            document.getElementById('mvFeedback').textContent = '答对了！';
            current += 1;
            setTimeout(render, 500);
          }else{
            btn.classList.add('wrong');
            document.getElementById('mvFeedback').textContent = '不对，已加入错题本。正确答案是：' + item.cn;
          }
        };
      });
    }
    render();
  }
  var observer = new MutationObserver(function(){ enhanceVocabMatch(); });
  function start(){
    observer.observe(document.body, { childList:true, subtree:true });
    enhanceVocabMatch();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// Lesson completion page enhancer
// Shows completion cards for Mastery lessons when the mastery rule is achieved.
(function(){
  var CONFIG = {
    'minna_lesson_01': {
      no: '01',
      title: '第1课掌握完成！',
      next: '第2课 これ・それ・あれ',
      nextUrl: './minna-index.html?v=12.4-complete',
      reviewLabel: '继续复习第1课',
      chips: ['17个核心词汇','语法/句型','核心例句','自我介绍会话','错题清零']
    },
    'minna_lesson_02': {
      no: '02',
      title: '第2课掌握完成！',
      next: '第3课 ここ・そこ・あそこ',
      nextUrl: './minna-index.html?v=12.5-lesson02-complete',
      reviewLabel: '继续复习第2课',
      chips: ['これ・それ・あれ','この・その・あの','だれの〜ですか','物品词汇','送礼会话','错题清零']
    }
  };
  function readState(no){
    var candidates = ['lesson'+no+'v8','lesson'+no+'v7','lesson'+no+'v6','lesson'+no+'v5'];
    for(var i=0;i<candidates.length;i++){
      try{
        var raw = localStorage.getItem(candidates[i]);
        if(raw) return JSON.parse(raw);
      }catch(e){}
    }
    return null;
  }
  function isPassed(s){
    if(!s) return false;
    var m = s.mastery || {};
    var wrongCount = s.wrong_count != null ? Number(s.wrong_count) : Object.keys(s.wrong || {}).filter(function(k){ return s.wrong[k]; }).length;
    return !!s.mastery_passed || ((m.vocab||0) >= 100 && (m.grammar||0) >= 80 && (m.examples||0) >= 80 && (m.final||0) >= 80 && wrongCount === 0);
  }
  function showCompletion(){
    var lessonId = window.MinnaAuth && window.MinnaAuth.getLessonId ? window.MinnaAuth.getLessonId() : '';
    var cfg = CONFIG[lessonId];
    if(!cfg) return;
    var stage = document.getElementById('stage');
    var cardId = 'lesson' + cfg.no + 'CompletionCard';
    if(!stage || document.getElementById(cardId)) return;
    var s = readState(cfg.no);
    if(!isPassed(s)) return;
    var m = s.mastery || {};
    var chips = cfg.chips.map(function(x){ return '<span class="pill">✅ ' + x + '</span>'; }).join('');
    var card = document.createElement('div');
    card.id = cardId;
    card.className = 'successBox';
    card.innerHTML = '<h2>🎉 '+cfg.title+'</h2>'+
      '<p>你已经完成本课 Mastery，可以回首页刷新进度并继续下一课。</p>'+
      '<div class="meter">'+
      '<div><b>'+Math.round(m.vocab||100)+'%</b><span>核心词汇</span></div>'+
      '<div><b>'+Math.round(m.grammar||80)+'%</b><span>语法/句型</span></div>'+
      '<div><b>'+Math.round(m.examples||80)+'%</b><span>核心例句</span></div>'+
      '<div><b>'+Math.round(m.final||80)+'%</b><span>综合测试</span></div>'+
      '</div>'+
      '<p>'+chips+'</p>'+
      '<p><b>下一课：</b>'+cfg.next+'</p>'+
      '<p><a class="btn primary" href="'+cfg.nextUrl+'" target="_top">回首页解锁下一课</a><button class="light" id="continueReview'+cfg.no+'">'+cfg.reviewLabel+'</button></p>';
    stage.insertBefore(card, stage.firstChild);
    var btn = document.getElementById('continueReview'+cfg.no);
    if(btn) btn.onclick = function(){ card.remove(); };
  }
  var observer = new MutationObserver(function(){ showCompletion(); });
  function start(){
    observer.observe(document.body, { childList:true, subtree:true });
    setInterval(showCompletion, 1500);
    showCompletion();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();