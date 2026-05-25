// Minna social module v2 (cloud-first, local fallback)
window.MinnaSocial = (function(){
  var PKEY='minna.profile.v1';
  var FKEY='minna.friends.v1';
  var EKEY='minna.events.v1';
  var READKEY='minna.events.read.v1';
  function jread(k,def){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(def))||def}catch(e){return def}}
  function jwrite(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function authUser(){return window.MinnaAuth&&MinnaAuth.getUser?MinnaAuth.getUser():null}
  function displayName(){var u=authUser();return u&&u.email?u.email.split('@')[0]:'minna learner'}
  function nowIso(){return new Date().toISOString()}
  function logEvent(type,title,desc){var rows=jread(EKEY,[]);rows.unshift({type:type,title:title,desc:desc,created_at:nowIso()});jwrite(EKEY,rows.slice(0,80));}
  function eventReadAt(){return String(localStorage.getItem(READKEY)||'')}
  function markEventsRead(){localStorage.setItem(READKEY,nowIso())}
  function unreadCount(){var t=eventReadAt();if(!t)return jread(EKEY,[]).length;var ts=new Date(t).getTime();return jread(EKEY,[]).filter(function(e){return new Date(e.created_at).getTime()>ts}).length}
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
      // Safe public card for QR sharing (no private email/role data).
      await s.from('minna_social_public_profiles').upsert({
        user_id:u.id,
        nick:payload.nick||'',
        bio:payload.bio||'',
        avatar_url:payload.avatar_url||'',
        updated_at:payload.updated_at
      },{onConflict:'user_id'});
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
      var payload={owner_user_id:u.id,owner_email:u.email||'',friend_label:label,friend_email:'',friend_user_id:null,created_at:nowIso()};
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

  async function sendFriendRequest(toEmail){
    toEmail=String(toEmail||'').trim().toLowerCase();
    if(!toEmail||toEmail.indexOf('@')<1) return {ok:false,msg:'invalid_email'};
    try{
      var u=authUser(),s=await db();
      if(!u||!s) return {ok:false,msg:'need_login'};
      var payload={from_user_id:u.id,from_email:(u.email||'').toLowerCase(),to_email:toEmail,status:'pending',created_at:nowIso(),updated_at:nowIso()};
      var r=await s.from('minna_social_friend_requests').insert(payload);
      if(r.error) throw r.error;
      logEvent('friend','发送了好友申请','已向 '+toEmail+' 发送申请');
      return {ok:true,cloud:true};
    }catch(e){return {ok:false,msg:e.message||String(e)}}
  }

  async function listIncomingRequests(){
    try{
      var u=authUser(),s=await db();
      if(!u||!s||!u.email) return [];
      var email=String(u.email).toLowerCase();
      var byEmail=await s.from('minna_social_friend_requests').select('id,from_user_id,from_email,to_email,to_user_id,status,created_at').eq('to_email',email).eq('status','pending').order('created_at',{ascending:false}).limit(200);
      var byUid=await s.from('minna_social_friend_requests').select('id,from_user_id,from_email,to_email,to_user_id,status,created_at').eq('to_user_id',u.id).eq('status','pending').order('created_at',{ascending:false}).limit(200);
      if(byEmail.error&&byUid.error) throw (byEmail.error||byUid.error);
      var map={},rows=[];
      (byEmail.data||[]).concat(byUid.data||[]).forEach(function(x){if(!map[x.id]){map[x.id]=1;rows.push(x)}});
      rows.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at)});
      return rows;
    }catch(e){return []}
  }

  async function respondFriendRequest(id,approve){
    try{
      var u=authUser(),s=await db(); if(!u||!s||!u.email) return {ok:false,msg:'need_login'};
      var req=await s.from('minna_social_friend_requests').select('id,from_user_id,from_email,to_email,to_user_id,status').eq('id',id).maybeSingle();
      if(req.error) throw req.error;
      if(!req.data||req.data.status!=='pending') return {ok:false,msg:'not_pending'};
      var canByEmail=String(req.data.to_email||'').toLowerCase()===String(u.email||'').toLowerCase();
      var canByUid=String(req.data.to_user_id||'')===String(u.id||'');
      if(!canByEmail&&!canByUid) return {ok:false,msg:'forbidden'};
      var newStatus=approve?'accepted':'rejected';
      var up=await s.from('minna_social_friend_requests').update({status:newStatus,updated_at:nowIso()}).eq('id',id);
      if(up.error) throw up.error;
      if(approve){
        var a1={owner_user_id:u.id,owner_email:u.email||'',friend_user_id:req.data.from_user_id,friend_email:req.data.from_email,friend_label:String(req.data.from_email||'').split('@')[0],created_at:nowIso()};
        var a2={owner_user_id:req.data.from_user_id,owner_email:req.data.from_email||'',friend_user_id:u.id,friend_email:u.email||'',friend_label:String(u.email||'').split('@')[0],created_at:nowIso()};
        var f1=await s.from('minna_social_friends').upsert(a1,{onConflict:'owner_user_id,friend_label'});
        if(f1.error) throw f1.error;
        var f2=await s.from('minna_social_friends').upsert(a2,{onConflict:'owner_user_id,friend_label'});
        if(f2.error) throw f2.error;
        logEvent('friend','通过了好友申请','你与 '+String(req.data.from_email||'好友')+' 成为好友');
      }else{
        logEvent('friend','拒绝了好友申请','已拒绝 '+String(req.data.from_email||'')+' 的申请');
      }
      return {ok:true};
    }catch(e){return {ok:false,msg:e.message||String(e)}}
  }

  async function socialStats(){
    var out={following:jread(FKEY,[]).length,followers:0,pending:0};
    try{
      var u=authUser(),s=await db(); if(!u||!s||!u.email) return out;
      var f1=await s.from('minna_social_friends').select('owner_user_id',{count:'exact',head:true}).eq('owner_user_id',u.id);
      var f2=await s.from('minna_social_friends').select('owner_user_id',{count:'exact',head:true}).eq('friend_user_id',u.id);
      var p1=await s.from('minna_social_friend_requests').select('id',{count:'exact',head:true}).eq('to_email',String(u.email).toLowerCase()).eq('status','pending');
      var p2=await s.from('minna_social_friend_requests').select('id',{count:'exact',head:true}).eq('to_user_id',u.id).eq('status','pending');
      out.following=f1.count||0; out.followers=f2.count||0; out.pending=(p1.count||0)+(p2.count||0);
    }catch(e){}
    return out;
  }

  function monthlyBadges(){
    var st=jread('minna.mobile.learning.state.v1',{}), crowns=jread('minna.crowns.v1',{}), mistakes=jread('minna.mistakes.v1',[]);
    var c=Object.keys(crowns).length, s=Number(st.streak||1), m=(mistakes||[]).length;
    return [
      {name:'稳定学习',icon:'🪙',unlocked:s>=3},
      {name:'连胜达人',icon:'🕊️',unlocked:s>=7},
      {name:'皇冠收藏',icon:'🌼',unlocked:c>=40},
      {name:'错题清理',icon:'🦭',unlocked:m===0}
    ];
  }

  function achievements(){
    var st=jread('minna.mobile.learning.state.v1',{}), xp=Number(localStorage.getItem('minna.xp.v1')||0), crowns=jread('minna.crowns.v1',{}), mistakes=jread('minna.mistakes.v1',[]);
    var c=Object.keys(crowns).length, s=Number(st.streak||1), m=(mistakes||[]).length;
    return [
      {title:'连续 3 天',score:300,unlocked:s>=3},
      {title:'XP 破万',score:100,unlocked:xp>=10000},
      {title:'皇冠 100+',score:200,unlocked:c>=100},
      {title:'零错题',score:150,unlocked:m===0}
    ];
  }

  async function friendStreakData(){
    var list=await listFriends();
    var events=listEvents();
    var actives={};
    events.forEach(function(e){
      if(e.type==='friend'&&/成为好友|添加了好友|通过了好友申请/.test(e.title||'')){actives[String(e.desc||'').slice(0,32)]=true;}
    });
    return list.slice(0,5).map(function(n,i){return {name:n,active:i===0||!!actives[n]};});
  }

  function listEvents(){return jread(EKEY,[])}

  async function getThreadIdWithUser(targetUserId,targetTitle){
    var u=authUser(),s=await db(); if(!u||!s) throw new Error('need_login');
    var mine=await s.from('minna_chat_participants').select('thread_id').eq('user_id',u.id).limit(500);
    if(mine.error) throw mine.error;
    var ids=(mine.data||[]).map(function(x){return x.thread_id});
    if(ids.length){
      var theirs=await s.from('minna_chat_participants').select('thread_id').eq('user_id',targetUserId).in('thread_id',ids);
      if(!theirs.error && (theirs.data||[]).length){ return theirs.data[0].thread_id; }
    }
    var th=await s.from('minna_chat_threads').insert({thread_type:'direct',title:targetTitle||'私信',owner_user_id:u.id}).select('id').single();
    if(th.error) throw th.error;
    var tid=th.data.id;
    await s.from('minna_chat_participants').insert([{thread_id:tid,user_id:u.id},{thread_id:tid,user_id:targetUserId}]);
    return tid;
  }

  async function createGroup(title,memberUserIds){
    var u=authUser(),s=await db(); if(!u||!s) throw new Error('need_login');
    var th=await s.from('minna_chat_threads').insert({thread_type:'group',title:title||'学习群',owner_user_id:u.id}).select('id').single();
    if(th.error) throw th.error;
    var tid=th.data.id, uniq={}; uniq[u.id]=1;
    (memberUserIds||[]).forEach(function(x){if(x)uniq[String(x)]=1;});
    var rows=Object.keys(uniq).map(function(uid){return {thread_id:tid,user_id:uid};});
    var ins=await s.from('minna_chat_participants').insert(rows);
    if(ins.error) throw ins.error;
    return tid;
  }

  async function listThreads(){
    var u=authUser(),s=await db(); if(!u||!s) return [];
    var p=await s.from('minna_chat_participants').select('thread_id').eq('user_id',u.id).order('joined_at',{ascending:false}).limit(200);
    if(p.error) throw p.error;
    var ids=(p.data||[]).map(function(x){return x.thread_id});
    if(!ids.length) return [];
    var t=await s.from('minna_chat_threads').select('id,thread_type,title,owner_user_id,created_at').in('id',ids).order('created_at',{ascending:false});
    if(t.error) throw t.error;
    return t.data||[];
  }

  async function listMessages(threadId){
    var s=await db(); if(!s||!threadId) return [];
    var m=await s.from('minna_chat_messages').select('id,thread_id,from_user_id,from_email,body,created_at').eq('thread_id',threadId).order('created_at',{ascending:true}).limit(500);
    if(m.error) throw m.error;
    return m.data||[];
  }

  async function sendMessage(threadId,body){
    var u=authUser(),s=await db(); if(!u||!s) throw new Error('need_login');
    body=String(body||'').trim(); if(!body) return {ok:false,msg:'empty'};
    var ins=await s.from('minna_chat_messages').insert({thread_id:threadId,from_user_id:u.id,from_email:u.email||'',body:body});
    if(ins.error) throw ins.error;
    logEvent('chat','收到了新消息','你有新的聊天消息');
    return {ok:true};
  }

  return {
    getProfile:getProfile,saveProfile:saveProfile,listFriends:listFriends,addFriend:addFriend,removeFriend:removeFriend,
    sendFriendRequest:sendFriendRequest,listIncomingRequests:listIncomingRequests,respondFriendRequest:respondFriendRequest,
    socialStats:socialStats,monthlyBadges:monthlyBadges,achievements:achievements,friendStreakData:friendStreakData,
    listEvents:listEvents,markEventsRead:markEventsRead,unreadCount:unreadCount,logEvent:logEvent,displayName:displayName,
    getThreadIdWithUser:getThreadIdWithUser,createGroup:createGroup,listThreads:listThreads,listMessages:listMessages,sendMessage:sendMessage
  };
})();
