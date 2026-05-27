// Minna public leaderboard enhancer
// Safe public leaderboard reader for minna-index.html.
// It reads only from the sanitized Supabase view: minna_public_leaderboard.
(function(){
  const SUPABASE_URL = 'https://ycjuceortcduakxscfes.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_sK-XWyiFwSoKCorddBULCw_0yiS9e5t';
  let client = null;

  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s || '').replace(/[&<>]/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m];
    });
  }
  function supa(){
    if(!window.supabase) throw new Error('Supabase SDK is not loaded.');
    if(!client){
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      });
    }
    return client;
  }
  function fmtDate(raw){
    if(!raw) return '暂无';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '暂无' : d.toLocaleString();
  }
  function rankIcon(rank){
    if(rank === 1) return '🥇';
    if(rank === 2) return '🥈';
    if(rank === 3) return '🥉';
    return String(rank);
  }
  function rankClass(rank){
    if(rank === 1) return 'rank1';
    if(rank === 2) return 'rank2';
    if(rank === 3) return 'rank3';
    return '';
  }
  function renderPublicLeaderboard(rows){
    const body = $('leaderboardBody');
    if(!body) return;
    if(!rows || !rows.length){
      body.innerHTML = '<tr><td colspan="6" class="small">暂无公开排行榜记录。请先完成课程并刷新。</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function(u, i){
      const rank = i + 1;
      const name = u.display_name || u.nickname || ('学习者 ' + rank);
      const completedLessons = Number(u.completed_lessons || u.completedLessons || 0);
      const completedSlides = Number(u.completed_slides || u.completedSlides || 0);
      const totalScore = Number(u.total_score || u.totalScore || 0);
      const lastAt = u.last_checkin_at || u.last_updated_at || u.lastUpdated || '';
      return '<tr>'+
        '<td><span class="rank '+rankClass(rank)+'">'+rankIcon(rank)+'</span></td>'+
        '<td><div class="userCell">'+esc(name)+'</div><div class="leaderMeta">公开匿名榜｜不显示邮箱</div></td>'+
        '<td><span class="countBadge">'+completedLessons+'</span></td>'+
        '<td>'+completedSlides+'</td>'+
        '<td><span class="scoreBadge">'+totalScore+'</span></td>'+
        '<td>'+esc(fmtDate(lastAt))+'</td>'+
      '</tr>';
    }).join('');
  }
  async function loadPublicLeaderboard(force){
    const status = $('leaderboardStatus');
    const hint = $('leaderboardHint');
    try{
      if(status){ status.textContent = '读取公开排行榜...'; status.className = 'pill auto'; }
      const { data, error } = await supa()
        .from('minna_public_leaderboard')
        .select('display_name,completed_lessons,completed_slides,total_score,last_checkin_at')
        .order('completed_lessons', { ascending:false })
        .order('total_score', { ascending:false })
        .order('last_checkin_at', { ascending:false })
        .limit(100);
      if(error) throw error;
      renderPublicLeaderboard(data || []);
      if(status){ status.textContent = '公开榜已更新：' + (data || []).length + ' 位用户'; status.className = 'pill ok'; }
      if(hint){
        hint.innerHTML = '当前使用 <code>minna_public_leaderboard</code> 安全 view：普通用户可看全站排名，但不会暴露完整 Google 邮箱、user_id 或原始 progress JSON。';
      }
    }catch(e){
      const body = $('leaderboardBody');
      if(body){
        body.innerHTML = '<tr><td colspan="6" class="small">公开排行榜 view 还没建好或没有授权：'+esc(e.message)+'。请在 Supabase 执行仓库里的 <code>supabase/minna_public_leaderboard.sql</code>。</td></tr>';
      }
      if(status){ status.textContent = '需要创建公开榜 view'; status.className = 'pill warn'; }
      if(hint){
        hint.innerHTML = '方案 B 需要先在 Supabase 建立 <code>minna_public_leaderboard</code> 安全 view，并只给普通用户开放这个 view 的 SELECT 权限。';
      }
    }
  }
  function install(){
    if(!$('leaderboardBody')) return;
    window.loadLeaderboard = loadPublicLeaderboard;
    loadPublicLeaderboard(true);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
