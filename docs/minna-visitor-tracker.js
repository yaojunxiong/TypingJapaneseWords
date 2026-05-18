// Minna home loader 14.1
// Keeps the stable 13.9 home enhancer and loads split home enhancers.
(function(){
  function loadScript(src, id){
    if(id && document.getElementById(id)) return;
    var s=document.createElement('script');
    if(id) s.id=id;
    s.src=src;
    s.async=false;
    document.head.appendChild(s);
  }
  // Stable snapshot before splitting extra home features into separate files.
  loadScript('https://cdn.jsdelivr.net/gh/yaojunxiong/TypingJapaneseWords@7cb3fac5f1f60787b69df5ee08db1ea6922b23f1/docs/minna-visitor-tracker.js','minna-home-core-13-9');
  loadScript('./minna-home-checklist.js?v=14.0','minna-home-checklist-14-0');
  loadScript('./minna-home-recent.js?v=14.1','minna-home-recent-14-1');
})();
