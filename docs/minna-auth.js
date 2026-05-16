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
