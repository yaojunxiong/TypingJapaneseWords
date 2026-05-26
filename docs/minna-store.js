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
  function readNum(key, def) {
    try {
      var n = Number(localStorage.getItem(key));
      return isNaN(n) ? def : n;
    } catch (e) {
      return def;
    }
  }
  function writeNum(key, n) {
    localStorage.setItem(key, String(Number(n) || 0));
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
    uiLang: 'minna_ui_lang',
    cloudStateUpdatedAt: 'minna.cloud.state.updated_at.v1',
    cloudMistakesUpdatedAt: 'minna.cloud.mistakes.updated_at.v1',
    cloudStateDirtyAt: 'minna.cloud.state.dirty_at.v1',
    cloudMistakesDirtyAt: 'minna.cloud.mistakes.dirty_at.v1'
  };

  function authReady() {
    return !!(window.MinnaAuth && MinnaAuth.client && MinnaAuth.getUser);
  }

  function userInfo() {
    if (!authReady()) return null;
    var u = MinnaAuth.getUser && MinnaAuth.getUser();
    if (!u || !u.id) return null;
    return {
      id: u.id,
      email: u.email || '',
      key: MinnaAuth.userKey ? MinnaAuth.userKey() : ('auth:' + u.id)
    };
  }

  async function upsertCloudState(stateValue) {
    var info = userInfo();
    if (!info) return { skipped: true };
    var supa = MinnaAuth.client();
    var now = new Date().toISOString();
    var payload = {
      user_id: info.id,
      user_key: info.key,
      user_email: info.email,
      state: stateValue || {},
      updated_at: now
    };
    var res = await supa.from('minna_learning_state').upsert(payload, { onConflict: 'user_id' });
    if (res.error) throw res.error;
    localStorage.setItem(keys.cloudStateUpdatedAt, now);
    localStorage.removeItem(keys.cloudStateDirtyAt);
    return { ok: true, updated_at: now };
  }

  async function upsertCloudMistakes(mistakesValue) {
    var info = userInfo();
    if (!info) return { skipped: true };
    var supa = MinnaAuth.client();
    var now = new Date().toISOString();
    var payload = {
      user_id: info.id,
      user_key: info.key,
      user_email: info.email,
      mistakes: Array.isArray(mistakesValue) ? mistakesValue : [],
      updated_at: now
    };
    var res = await supa.from('minna_learning_mistakes').upsert(payload, { onConflict: 'user_id' });
    if (res.error) throw res.error;
    localStorage.setItem(keys.cloudMistakesUpdatedAt, now);
    localStorage.removeItem(keys.cloudMistakesDirtyAt);
    return { ok: true, updated_at: now };
  }

  async function pullCloudState() {
    var info = userInfo();
    if (!info) return null;
    var supa = MinnaAuth.client();
    var r = await supa.from('minna_learning_state').select('state,updated_at').eq('user_id', info.id).maybeSingle();
    if (r.error) throw r.error;
    return r.data || null;
  }

  async function pullCloudMistakes() {
    var info = userInfo();
    if (!info) return null;
    var supa = MinnaAuth.client();
    var r = await supa.from('minna_learning_mistakes').select('mistakes,updated_at').eq('user_id', info.id).maybeSingle();
    if (r.error) throw r.error;
    return r.data || null;
  }

  var syncTimer = 0;
  function scheduleSync(ms) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      window.MinnaStore.syncCloudNow().catch(function () {});
    }, Math.max(100, Number(ms) || 600));
  }

  window.MinnaStore = {
    keys: keys,
    readState: function () { return readJson(keys.state, {}); },
    writeState: function (v) {
      writeJson(keys.state, v || {});
      writeNum(keys.cloudStateDirtyAt, Date.now());
      scheduleSync(600);
    },
    readProgress: function () { return readJson(keys.progress, {}); },
    writeProgress: function (v) { writeJson(keys.progress, v || {}); },
    readCrowns: function () { return readJson(keys.crowns, {}); },
    writeCrowns: function (v) { writeJson(keys.crowns, v || {}); },
    readMistakes: function () { return readJson(keys.mistakes, []); },
    writeMistakes: function (v) {
      writeJson(keys.mistakes, Array.isArray(v) ? v : []);
      writeNum(keys.cloudMistakesDirtyAt, Date.now());
      scheduleSync(600);
    },
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
    },
    syncCloudNow: async function () {
      if (!authReady()) return { ok: false, reason: 'auth_not_ready' };
      try { await MinnaAuth.refreshUser(); } catch (e) {}
      var info = userInfo();
      if (!info) return { ok: false, reason: 'not_logged_in' };
      var stateLocal = this.readState();
      var mistakesLocal = this.readMistakes();
      var cloudState = await pullCloudState();
      var cloudMistakes = await pullCloudMistakes();
      var localStateDirty = readNum(keys.cloudStateDirtyAt, 0);
      var localMistakesDirty = readNum(keys.cloudMistakesDirtyAt, 0);
      var localStateUpdated = readNum(keys.cloudStateUpdatedAt, 0);
      var localMistakesUpdated = readNum(keys.cloudMistakesUpdatedAt, 0);
      var cloudStateTs = cloudState && cloudState.updated_at ? Date.parse(cloudState.updated_at) : 0;
      var cloudMistakesTs = cloudMistakes && cloudMistakes.updated_at ? Date.parse(cloudMistakes.updated_at) : 0;

      if (cloudState && !localStateDirty && cloudStateTs > localStateUpdated) {
        writeJson(keys.state, cloudState.state || {});
        writeNum(keys.cloudStateUpdatedAt, cloudStateTs || Date.now());
      } else if (localStateDirty || !cloudState) {
        await upsertCloudState(stateLocal);
      }

      if (cloudMistakes && !localMistakesDirty && cloudMistakesTs > localMistakesUpdated) {
        writeJson(keys.mistakes, Array.isArray(cloudMistakes.mistakes) ? cloudMistakes.mistakes : []);
        writeNum(keys.cloudMistakesUpdatedAt, cloudMistakesTs || Date.now());
      } else if (localMistakesDirty || !cloudMistakes) {
        await upsertCloudMistakes(mistakesLocal);
      }
      return { ok: true };
    },
    bindCloudAutoSync: function () {
      var self = this;
      window.addEventListener('minna-auth-ready', function () {
        self.syncCloudNow().catch(function () {});
      });
      window.addEventListener('minna-auth-changed', function () {
        self.syncCloudNow().catch(function () {});
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.MinnaStore && window.MinnaStore.bindCloudAutoSync) {
        window.MinnaStore.bindCloudAutoSync();
      }
    });
  } else if (window.MinnaStore && window.MinnaStore.bindCloudAutoSync) {
    window.MinnaStore.bindCloudAutoSync();
  }
})();
