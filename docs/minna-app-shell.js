// Shared Minna App Shell v1.0
(function(){
  window.MinnaAppShell = {
    version: '1.0',
    tabs: function(active){
      var tabs = [
        ['learn','🏠','学习','./minna-app.html?v=22.0'],
        ['toolbox','🧰','宝箱','./minna-toolbox.html'],
        ['lessons','🌳','课程','./minna-app-lessons.html'],
        ['favorites','💗','收藏','./minna-app-favorites.html'],
        ['me','⋯','我的','./minna-app.html#me']
      ];
      return '<nav class="bottomTabs">'+tabs.map(function(t){
        return '<a class="'+(active===t[0]?'active':'')+'" href="'+t[3]+'"><span>'+t[1]+'</span><b>'+t[2]+'</b></a>';
      }).join('')+'</nav>';
    },
    injectTabs: function(active){
      var old = document.querySelector('.bottomTabs');
      if(old) old.remove();
      document.body.insertAdjacentHTML('beforeend', this.tabs(active));
    }
  };
})();