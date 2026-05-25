// Shared Minna App Shell v1.1
(function(){
  function xp(){try{return Number(localStorage.getItem('minna.xp.v1')||0)}catch(e){return 0}}
  function hearts(){try{return Number(localStorage.getItem('minna.hearts.v1')||5)}catch(e){return 5}}
  function streak(){try{return Number((JSON.parse(localStorage.getItem('minna.mobile.learning.state.v1')||'{}')||{}).streak||1)}catch(e){return 1}}
  function heartText(){var h=Math.max(0,Math.min(5,hearts())),s='';for(var i=0;i<5;i++)s+=i<h?'❤️':'🤍';return s}
  window.MinnaAppShell = {
    version: '1.1',
    top: function(opts){
      opts = opts || {};
      var close = opts.closeHref ? '<a class="shellClose" href="'+opts.closeHref+'">×</a>' : '';
      var second = opts.second || ('🔥 '+streak());
      var right = opts.right || ('⚡ 25');
      if(opts.hearts) right = heartText();
      return '<header class="appTop unifiedTop shellTop"><div class="topStats">'+close+'<div>🇯🇵 115</div><div class="fire">'+second+'</div><div class="gem">💎 '+xp()+'</div><div class="energy">'+right+'</div></div></header>';
    },
    injectTop: function(opts){
      var old = document.querySelector('.shellTop,.appTop,.stageStatus');
      if(old) old.remove();
      document.body.insertAdjacentHTML('afterbegin', this.top(opts || {}));
    },
    tabs: function(active){
      var tabs = [
        ['learn','🏠','学习','./minna-app.html?v=22.0'],
        ['toolbox','🧰','宝箱','./minna-toolbox.html'],
        ['lessons','🌳','课程','./minna-app-lessons.html'],
        ['favorites','💗','收藏','./minna-app-favorites.html'],
        ['me','⋯','我的','./minna-app.html#me']
      ];
      return '<nav class="bottomTabs">'+tabs.map(function(t){return '<a class="'+(active===t[0]?'active':'')+'" href="'+t[3]+'"><span>'+t[1]+'</span><b>'+t[2]+'</b></a>';}).join('')+'</nav>';
    },
    injectTabs: function(active){
      var old = document.querySelector('.bottomTabs');
      if(old) old.remove();
      document.body.insertAdjacentHTML('beforeend', this.tabs(active));
    }
  };
})();