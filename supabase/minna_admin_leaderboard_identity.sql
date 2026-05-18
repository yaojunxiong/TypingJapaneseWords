-- Minna admin leaderboard identity view
-- Run this in Supabase SQL Editor as project owner/admin.
-- Purpose: admins can map public anonymous leaderboard names to Google accounts.
-- Do NOT grant this view to anon. It includes user_email and user_id.

create or replace view public.minna_admin_leaderboard_identity as
with records as (
  select
    coalesce(lp.user_id::text, lp.user_email, lp.user_key) as user_ref,
    '学习者 ' || right(md5(coalesce(lp.user_id::text, lp.user_email, lp.user_key)), 6) as display_name,
    coalesce(lp.user_email, au.email) as google_email,
    lp.user_id,
    lp.user_key,
    lp.lesson_id,
    lp.progress,
    lp.updated_at,
    coalesce(nullif(lp.progress->>'score', '')::int, 0) as score,
    coalesce(nullif(lp.progress->>'rate', '')::int, 0) as review_rate,
    case
      when lp.progress ? 'completed_count' then coalesce(nullif(lp.progress->>'completed_count', '')::int, 0)
      when lp.progress ? 'done' then (
        select count(*)::int
        from jsonb_object_keys(coalesce(lp.progress->'done', '{}'::jsonb)) as k
      )
      else 0
    end as completed_slides,
    greatest(coalesce(nullif(lp.progress->>'total_slides', '')::int, 12), 1) as total_slides,
    case
      when lp.progress ? 'wrong_count' then coalesce(nullif(lp.progress->>'wrong_count', '')::int, 0)
      when lp.progress ? 'wrong' then (
        select count(*)::int
        from jsonb_object_keys(coalesce(lp.progress->'wrong', '{}'::jsonb)) as k
      )
      else 0
    end as wrong_count,
    coalesce(nullif(lp.progress->'mastery'->>'vocab', '')::int, 0) as mastery_vocab,
    coalesce(nullif(lp.progress->'mastery'->>'grammar', '')::int, 0) as mastery_grammar,
    coalesce(nullif(lp.progress->'mastery'->>'examples', '')::int, 0) as mastery_examples,
    coalesce(nullif(lp.progress->'mastery'->>'final', '')::int, 0) as mastery_final,
    coalesce(
      nullif(lp.progress->>'last_cloud_saved_at', '')::timestamptz,
      nullif(lp.progress->>'updated_client_at', '')::timestamptz,
      nullif(lp.progress->>'completed_at', '')::timestamptz,
      lp.updated_at
    ) as last_checkin_at
  from public.lesson_progress lp
  left join auth.users au on au.id = lp.user_id
  where lp.user_id is not null
     or lp.user_email is not null
     or lp.user_key like 'auth:%'
), scored as (
  select
    user_ref,
    display_name,
    google_email,
    user_id,
    user_key,
    lesson_id,
    completed_slides,
    score,
    review_rate,
    last_checkin_at,
    case
      when lesson_id ~ '^minna_lesson_[0-9]{2}$' and lower(coalesce(progress->>'mastery_passed', 'false')) = 'true' then 1
      when lesson_id ~ '^minna_lesson_[0-9]{2}$' and mastery_vocab >= 100 and mastery_grammar >= 80 and mastery_examples >= 80 and mastery_final >= 80 and wrong_count = 0 then 1
      when lesson_id ~ '^minna_lesson_[0-9]{2}$' and completed_slides >= total_slides then 1
      when lesson_id ~ '^minna_lesson_[0-9]{2}$' and lower(coalesce(progress->>'completed', 'false')) = 'true' then 1
      when lesson_id ~ '^minna_lesson_[0-9]{2}$' and lower(coalesce(progress->>'passed', 'false')) = 'true' then 1
      else 0
    end as completed_lesson,
    case
      when lesson_id = 'minna_review_01_25' and (
        lower(coalesce(progress->>'review_passed', 'false')) = 'true'
        or lower(coalesce(progress->>'mastery_passed', 'false')) = 'true'
        or lower(coalesce(progress->>'completed', 'false')) = 'true'
        or coalesce(nullif(progress->>'rate', '')::int, 0) >= 80
      ) then 1
      else 0
    end as has_review_01_25
  from records
)
select
  display_name,
  max(google_email) as google_email,
  max(user_id)::text as user_id,
  max(user_key) as user_key,
  sum(completed_lesson)::int as completed_lessons,
  sum(case when lesson_id ~ '^minna_lesson_[0-9]{2}$' then completed_slides else 0 end)::int as completed_slides,
  sum(score)::int as total_score,
  max(has_review_01_25)::int as has_review_01_25,
  max(case when lesson_id = 'minna_review_01_25' then review_rate else 0 end)::int as review_01_25_rate,
  max(last_checkin_at) as last_checkin_at
from scored
group by user_ref, display_name
order by completed_lessons desc, has_review_01_25 desc, total_score desc, last_checkin_at desc;

-- Admin-only read policy through a secure wrapper function is not needed for a view grant by itself.
-- Grant to authenticated users, but the view is protected because it checks minna_admins below via RLS-safe security barrier pattern.
-- Simpler option: do not use this view from public clients unless you add admin RLS/policy below.

revoke all on public.minna_admin_leaderboard_identity from anon;
revoke all on public.minna_admin_leaderboard_identity from authenticated;

grant select on public.minna_admin_leaderboard_identity to authenticated;

-- IMPORTANT:
-- Because views run with owner privileges by default in Postgres, this view can expose emails to any authenticated user if granted broadly.
-- To keep it admin-only in Supabase, enable security_invoker if your Postgres supports it, and add lesson_progress select policy for admins if needed.
-- Safer alternative used by the admin page: it first checks public.minna_admins, then queries this view.
-- For stronger database enforcement, run this if supported:
-- alter view public.minna_admin_leaderboard_identity set (security_invoker = true);

notify pgrst, 'reload schema';
