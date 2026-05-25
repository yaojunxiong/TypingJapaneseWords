(function () {
  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  var keys = {
    state: 'minna.mobile.learning.state.v1',
    progress: 'minna.stage.progress.v1',
    crowns: 'minna.crowns.v1',
    mistakes: 'minna.mistakes.v1',
    hearts: 'minna.hearts.v1',
    xp: 'minna.xp.v1',
    sfx: 'minna.sfx.enabled.v1',
    appLang: 'minna_app_lang',
    uiLang: 'minna_ui_lang'
  };

  window.MinnaStore = {
    keys: keys,
    readState: function () { return readJson(keys.state, {}); },
    writeState: function (v) { writeJson(keys.state, v || {}); },
    readProgress: function () { return readJson(keys.progress, {}); },
    writeProgress: function (v) { writeJson(keys.progress, v || {}); },
    readCrowns: function () { return readJson(keys.crowns, {}); },
    writeCrowns: function (v) { writeJson(keys.crowns, v || {}); },
    readMistakes: function () { return readJson(keys.mistakes, []); },
    writeMistakes: function (v) { writeJson(keys.mistakes, Array.isArray(v) ? v : []); },
    readXp: function () {
      try { return Number(localStorage.getItem(keys.xp) || 0); } catch (e) { return 0; }
    },
    setXp: function (n) { localStorage.setItem(keys.xp, String(Number(n) || 0)); },
    addXp: function (n) {
      var next = this.readXp() + Number(n || 0);
      this.setXp(next);
      return next;
    },
    readHearts: function () {
      try { return Number(localStorage.getItem(keys.hearts) || 5); } catch (e) { return 5; }
    },
    setHearts: function (n) {
      var v = Math.max(0, Math.min(5, Number(n)));
      localStorage.setItem(keys.hearts, String(isNaN(v) ? 5 : v));
    },
    resetHearts: function () { this.setHearts(5); },
    sfxEnabled: function () { return localStorage.getItem(keys.sfx) !== '0'; },
    setSfxEnabled: function (enabled) { localStorage.setItem(keys.sfx, enabled ? '1' : '0'); },
    readLang: function () { return localStorage.getItem(keys.appLang) || localStorage.getItem(keys.uiLang) || 'zh'; },
    setLang: function (v) {
      localStorage.setItem(keys.appLang, v);
      localStorage.setItem(keys.uiLang, v);
    }
  };
})();
