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
    },
    'minna_lesson_03': {
      no: '03',
      title: '第3课掌握完成！',
      next: '第4课 時間・曜日',
      nextUrl: './minna-index.html?v=12.6-lesson03-complete',
      reviewLabel: '继续复习第3课',
      chips: ['ここ・そこ・あそこ','こちら・そちら・あちら','〜はどこですか','〜はこちらです','〜はいくらですか','问路/商场场景','错题清零']
    },
    'minna_lesson_04': {
      no: '04',
      title: '第4课掌握完成！',
      next: '第5课 行きます・来ます・帰ります',
      nextUrl: './minna-index.html?v=12.7-lesson04-complete',
      reviewLabel: '继续复习第4课',
      chips: ['今何時ですか','〜時〜分','午前 / 午後','〜曜日','〜から〜まで','ます形过去/否定','作息和营业时间场景','错题清零']
    },
    'minna_lesson_05': {
      no: '05',
      title: '第5课掌握完成！',
      next: '第6课 食べます・飲みます・見ます・します',
      nextUrl: './minna-index.html?v=12.8-lesson05-complete',
      reviewLabel: '继续复习第5课',
      chips: ['行きます・来ます・帰ります','地点へ行きます','交通工具で行きます','友達と行きます','日曜日に行きます','どこへ / 何で / 誰と / いつ','出行问答场景','错题清零']
    },
    'minna_lesson_06': {
      no: '06',
      title: '第6课掌握完成！',
      next: '第7课 手段で / 人にあげます・もらいます',
      nextUrl: './minna-index.html?v=12.9-lesson06-complete',
      reviewLabel: '继续复习第6课',
      chips: ['名词を动词','食べます・飲みます','見ます・聞きます・読みます・書きます','買います・撮ります・します','何をしますか','いっしょに〜ませんか','〜ましょう','活动邀请场景','错题清零']
    },
    'minna_lesson_07': {
      no: '07',
      title: '第7课掌握完成！',
      next: '第8课 い形容词・な形容词',
      nextUrl: './minna-index.html?v=13.0-lesson07-complete',
      reviewLabel: '继续复习第7课',
      chips: ['工具/手段 で','人にあげます','人にもらいます','貸します・借ります','教えます・習います','電話をかけます','もう〜ましたか','いいえ、まだです','送礼/收礼场景','错题清零']
    },
    'minna_lesson_08': {
      no: '08',
      title: '第8课掌握完成！',
      next: '第9课 好き・嫌い・上手・下手',
      nextUrl: './minna-index.html?v=13.1-lesson08-complete',
      reviewLabel: '继续复习第8课',
      chips: ['い形容词','な形容词','い形容词否定：〜くないです','な形容词否定：〜じゃありません','とても / あまり','どんな〜ですか','どうですか','形容词连接和转折','错题清零']
    },
    'minna_lesson_09': {
      no: '09',
      title: '第9课掌握完成！',
      next: '第10课 あります・います / 位置词',
      nextUrl: './minna-index.html?v=13.2-lesson09-complete',
      reviewLabel: '继续复习第9课',
      chips: ['好きです・嫌いです','上手です・下手です','〜がわかります','〜があります','全然 / 少し / たくさん','どうしてですか','〜から','兴趣/能力/原因说明场景','错题清零']
    },
    'minna_lesson_10': {
      no: '10',
      title: '第10课掌握完成！',
      next: '第11课 数量词 / 何人・何枚・何台・何回',
      nextUrl: './minna-index.html?v=13.3-lesson10-complete',
      reviewLabel: '继续复习第10课',
      chips: ['あります・います','物/植物：あります','人/动物：います','上・下・前・後ろ','右・左・中・外','隣・近く・間','どこにありますか','どこにいますか','位置/找东西场景','错题清零']
    },
    'minna_lesson_11': {
      no: '11',
      title: '第11课掌握完成！',
      next: '第12课 过去形 / 比较表达',
      nextUrl: './minna-index.html?v=13.4-lesson11-complete',
      reviewLabel: '继续复习第11课',
      chips: ['一つ・二つ・三つ……','一人・二人・三人……','〜枚 / 〜台 / 〜回','何人 / 何枚 / 何台 / 何回','全部で / 〜だけ','期間：〜時間 / 〜日 / 〜週間 / 〜か月 / 〜年','どのくらい','数量/邮局/学习时间场景','错题清零']
    },
    'minna_lesson_12': {
      no: '12',
      title: '第12课掌握完成！',
      next: '第13课 〜たいです / 〜へ〜に行きます',
      nextUrl: './minna-index.html?v=13.5-lesson12-complete',
      reviewLabel: '继续复习第12课',
      chips: ['名词/な形容词过去形：〜でした','名词/な形容词过去否定：〜じゃありませんでした','い形容词过去形：〜かったです','い形容词过去否定：〜くなかったです','AはBより〜です','AとBとどちらが〜ですか','Aのほうが〜です','〜で何/いつ/どこがいちばん〜ですか','どちらも / ずっと','过去形/比较表达场景','错题清零']
    },
    'minna_lesson_13': {
      no: '13',
      title: '第13课掌握完成！',
      next: '第14课 て形 / ください / ましょうか',
      nextUrl: './minna-index.html?v=13.6-lesson13-complete',
      reviewLabel: '继续复习第13课',
      chips: ['〜が欲しいです','〜を食べたいです / 飲みたいです / 買いたいです','何をしたいですか','どこへ行きたいですか','〜へ〜に行きます','〜へ〜に来ました','何か / どこか','おなかがすきました / のどがかわきました','想要/想做/目的移动场景','错题清零']
    },
    'minna_lesson_14': {
      no: '14',
      title: '第14课掌握完成！',
      next: '第15课 てもいいです / てはいけません / ています',
      nextUrl: './minna-index.html?v=13.7-lesson14-complete',
      reviewLabel: '继续复习第14课',
      chips: ['て形','〜てください','〜ています','〜ましょうか','动词分组与て形变化','请求别人做某事','表达正在进行','主动提出帮忙','请求/正在做/帮忙场景','错题清零']
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