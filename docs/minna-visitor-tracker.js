// Minna home loader 14.3
(function(){
  function loadScript(src, id){
    if(id && document.getElementById(id)) return;
    var s=document.createElement('script');
    if(id) s.id=id;
    s.src=src;
    s.async=false;
    document.head.appendChild(s);
  }
  loadScript('https://cdn.jsdelivr.net/gh/yaojunxiong/TypingJapaneseWords@7cb3fac5f1f60787b69df5ee08db1ea6922b23f1/docs/minna-visitor-tracker.js','minna-home-core-13-9');
  loadScript('./minna-home-checklist.js?v=14.0','minna-home-checklist-14-0');
  loadScript('./minna-home-recent.js?v=14.1','minna-home-recent-14-1');
  loadScript('./minna-home-insights.js?v=14.2','minna-home-insights-14-2');
  loadScript('./minna-home-i18n.js?v=14.3','minna-home-i18n-14-3');
})();
