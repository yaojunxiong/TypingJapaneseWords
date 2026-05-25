// Minna role extension v20.3
// Adds VIP/admin role lookup and preview-save guard without rewriting the auth module.
(function(){
  if(!window.MinnaAuth)return;
  var roleInfo=null;
  var ADMIN_EMAIL_FALLBACK='yaojunxiong@gmail.com';
  var originalClient=window.MinnaAuth.client;
  function ensureClient(){
    if(originalClient)return originalClient();
    if(!window.supabase)throw new Error('Supabase SDK is not loaded.');
    return window.supabase.createClient(
      'https://ycjuceortcduakxscfes.supabase.co',
      'sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t'
    );
  }
  function roleFromRow(row,user){
    var now=Date.now();
    var accountEmail=String((row&&row.email)||(user&&user.email)||'').toLowerCase();
    var forcedAdmin=accountEmail===ADMIN_EMAIL_FALLBACK;
    var raw=forcedAdmin?'admin':(row&&row.role?String(row.role):'normal');
    var vipUntil=row&&row.vip_until?String(row.vip_until):'';
    var vipActive=raw==='vip'&&(!vipUntil||Date.parse(vipUntil)>now);
    var memberActive=raw==='member';
    var effective=raw==='admin'?'admin':memberActive?'member':vipActive?'vip':'normal';
    return {
      role:raw,
      effectiveRole:effective,
      vip_until:vipUntil,
      email:row&&row.email?row.email:(user&&user.email)||'',
      isAdmin:effective==='admin',
      isVip:effective==='vip'||effective==='member',
      bypassLessonLock:effective==='admin'||effective==='vip'||effective==='member'
    };
  }
  async function loadRole(force){
    if(!force&&roleInfo)return roleInfo;
    var supa=ensureClient();
    var user=null;
    try{
      if(window.MinnaAuth.refreshUser)user=await window.MinnaAuth.refreshUser();
      if(!user&&window.MinnaAuth.getUser)user=window.MinnaAuth.getUser();
    }catch(e){}
    if(!user){
      roleInfo=roleFromRow(null,null);
      return roleInfo;
    }
    var result=await supa.from('user_roles').select('role,vip_until,email').eq('user_id',user.id).maybeSingle();
    if(result.error){
      console.warn('[MinnaRole] role fallback:',result.error.message||result.error);
      roleInfo=roleFromRow(null,user);
      return roleInfo;
    }
    roleInfo=roleFromRow(result.data,user);
    return roleInfo;
  }
  var originalSave=window.MinnaAuth.saveProgress;
  if(typeof originalSave==='function'&&!window.MinnaAuth.__previewGuardV20){
    window.MinnaAuth.saveProgress=async function(progress,overrideLessonId){
      if(new URLSearchParams(window.location.search).get('mode')==='preview'){
        return {skipped:true,reason:'preview mode'};
      }
      return originalSave.call(window.MinnaAuth,progress,overrideLessonId);
    };
    window.MinnaAuth.__previewGuardV20=true;
  }
  window.MinnaAuth.client=window.MinnaAuth.client||ensureClient;
  window.MinnaAuth.loadRole=window.MinnaAuth.loadRole||loadRole;
  window.MinnaAuth.getRole=window.MinnaAuth.getRole||function(){return roleInfo||roleFromRow(null,null)};
  window.addEventListener('minna-auth-changed',function(){roleInfo=null});
})();
