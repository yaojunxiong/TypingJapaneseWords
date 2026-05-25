(function () {
  if (!('serviceWorker' in navigator)) return;

  function promptRefresh(reg) {
    if (!reg || !reg.waiting) return;
    var ok = window.confirm('发现新版本，是否立即刷新更新？');
    if (!ok) return;
    reg.waiting.postMessage('SKIP_WAITING');
  }

  navigator.serviceWorker.register('./sw.js?v=22.1').then(function (reg) {
    if (reg.waiting) promptRefresh(reg);
    reg.addEventListener('updatefound', function () {
      var installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          promptRefresh(reg);
        }
      });
    });
  }).catch(function () {});

  var reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
})();
