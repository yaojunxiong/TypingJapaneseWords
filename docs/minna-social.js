// Minna social module v1 (cloud-first, local fallback)
window.MinnaSocial = (function(){
  var PKEY='minna.profile.v1';
  var FKEY='minna.friends.v1';
  var EKEY='minna.events.v1';
  function jread(k,def){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(def))||def}catch(e){return def}}
  function jwrite(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function authUser(){return window.MinnaAuth&&MinnaAuth.getUser?MinnaAuth.getUser():null}
  function displayName(){var u=authUser();return u&&u.email?u.email.split('@')[0]:'minna learner'}
  function nowIso(){return new Date().toISOString()}
  function logEvent(type,title,desc){var rows=jread(EKEY,[]);rows.unshift({type:type,title:title,desc:desc,created_at:nowIso()});jwrite(EKEY,rows.slice(0,80));}
  async function db(){return window.MinnaAuth&&MinnaAuth.client?MinnaAuth.client():null}

  async function getProfile(){
    var local=jread(PKEY,{nick:displayName(),bio:'',goal:'完成第50课'});
    try{
      var u=authUser(),s=await db(); if(!u||!s) return local;
      var r=await s.from('minna_social_profiles').select('nick,bio,goal,avatar_url,updated_at').eq('user_id',u.id).maybeSingle();
      if(r.error) throw r.error;
      if(r.data){ local=Object.assign(local,r.data||{}); jwrite(PKEY,local); }
    }catch(e){}
    return local;
  }

  async function saveProfile(p){
    p=Object.assign({},p||{}); p.updated_at=nowIso(); jwrite(PKEY,p);
    logEvent('profile','更新了个人档案','昵称或学习目标已更新');
    try{
      var u=authUser(),s=await db(); if(!u||!s) return {local:true};
      var payload={user_id:u.id,user_email:u.email||'',nick:p.nick||displayName(),bio:p.bio||'',goal:p.goal||'',avatar_url:p.avatar_url||'',updated_at:p.updated_at};
      var r=await s.from('minna_social_profiles').upsert(payload,{onConflict:'user_id'});
      if(r.error) throw r.error;
      return {cloud:true};
    }catch(e){return {local:true,error:e.message||String(e)}}
  }

  async function listFriends(){
    var local=jread(FKEY,[]);
    try{
      var u=authUser(),s=await db(); if(!u||!s) return local;
      var r=await s.from('minna_social_friends').select('friend_label,created_at').eq('owner_user_id',u.id).order('created_at',{ascending:false}).limit(200);
      if(r.error) throw r.error;
      var list=(r.data||[]).map(function(x){return x.friend_label}).filter(Boolean);
      jwrite(FKEY,list);
      return list;
    }catch(e){return local}
  }

  async function addFriend(label){
    label=String(label||'').trim(); if(!label) return {ok:false,msg:'empty'};
    var list=jread(FKEY,[]); if(list.indexOf(label)<0){list.unshift(label); jwrite(FKEY,list.slice(0,200));}
    logEvent('friend','添加了好友','你添加了 '+label);
    try{
      var u=authUser(),s=await db(); if(!u||!s) return {ok:true,local:true};
      var payload={owner_user_id:u.id,owner_email:u.email||'',friend_label:label,created_at:nowIso()};
      var r=await s.from('minna_social_friends').upsert(payload,{onConflict:'owner_user_id,friend_label'});
      if(r.error) throw r.error;
      return {ok:true,cloud:true};
    }catch(e){return {ok:true,local:true,error:e.message||String(e)}}
  }

  async function removeFriend(label){
    var list=jread(FKEY,[]).filter(function(x){return x!==label}); jwrite(FKEY,list);
    logEvent('friend','移除了好友','你移除了 '+label);
    try{
      var u=authUser(),s=await db(); if(!u||!s) return {ok:true,local:true};
      var r=await s.from('minna_social_friends').delete().eq('owner_user_id',u.id).eq('friend_label',label);
      if(r.error) throw r.error;
      return {ok:true,cloud:true};
    }catch(e){return {ok:true,local:true,error:e.message||String(e)}}
  }

  function listEvents(){return jread(EKEY,[])}

  return {getProfile:getProfile,saveProfile:saveProfile,listFriends:listFriends,addFriend:addFriend,removeFriend:removeFriend,listEvents:listEvents,logEvent:logEvent,displayName:displayName};
})();
