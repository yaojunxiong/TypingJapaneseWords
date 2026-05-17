-- Minna public leaderboard view for Option B
-- Goal: ordinary Google users can see the whole leaderboard without exposing email, user_id, user_key, or raw progress JSON.
-- Run this in Supabase SQL Editor as project owner/admin.
-- Fixed for Supabase/PostgreSQL: use jsonb_object_keys count instead of non-existing jsonb_object_length().

create or replace view public.minna_public_leaderboard as
with per_lesson as (
  select
    coalesce(user_id::text, user_email, user_key) as user_ref,
    -- Anonymous display name. Does not reveal full Google email or auth user id.
    '学习者 ' || right(md5(coalesce(user_id::text, user_email, user_key)), 6) as display_name,
    lesson_id,
    progress,
    updated_at,
    coalesce(nullif(progress->>'score', '')::int, 0) as score,
    case
      when progress ? 'completed_count' then coalesce(nullif(progress->>'completed_count', '')::int, 0)
      when progress ? 'done' then (
        select count(*)::int
        from jsonb_object_keys(coalesce(progress->'done', '{}'::jsonb)) as k
      )
      else 0
    end as completed_slides,
    greatest(coalesce(nullif(progress->>'total_slides', '')::int, 12), 1) as total_slides,
    case
      when progress ? 'wrong_count' then coalesce(nullif(progress->>'wrong_count', '')::int, 0)
      when progress ? 'wrong' then (
        select count(*)::int
        from jsonb_object_keys(coalesce(progress->'wrong', '{}'::jsonb)) as k
      )
      else 0
    end as wrong_count,
    coalesce(nullif(progress->'mastery'->>'vocab', '')::int, 0) as mastery_vocab,
    coalesce(nullif(progress->'mastery'->>'grammar', '')::int, 0) as mastery_grammar,
    coalesce(nullif(progress->'mastery'->>'examples', '')::int, 0) as mastery_examples,
    coalesce(nullif(progress->'mastery'->>'final', '')::int, 0) as mastery_final,
    coalesce(
      nullif(progress->>'last_cloud_saved_at', '')::timestamptz,
      nullif(progress->>'updated_client_at', '')::timestamptz,
      nullif(progress->>'completed_at', '')::timestamptz,
      updated_at
    ) as last_checkin_at
  from public.lesson_progress
  where user_id is not null
     or user_email is not null
     or user_key like 'auth:%'
), scored as (
  select
    user_ref,
    display_name,
    lesson_id,
    completed_slides,
    score,
    last_checkin_at,
    case
      when lower(coalesce(progress->>'mastery_passed', 'false')) = 'true' then 1
      when mastery_vocab >= 100 and mastery_grammar >= 80 and mastery_examples >= 80 and mastery_final >= 80 and wrong_count = 0 then 1
      when completed_slides >= total_slides then 1
      when lower(coalesce(progress->>'completed', 'false')) = 'true' then 1
      when lower(coalesce(progress->>'passed', 'false')) = 'true' then 1
      else 0
    end as completed_lesson
  from per_lesson
)
select
  display_name,
  sum(completed_lesson)::int as completed_lessons,
  sum(completed_slides)::int as completed_slides,
  sum(score)::int as total_score,
  max(last_checkin_at) as last_checkin_at
from scored
group by user_ref, display_name
order by completed_lessons desc, total_score desc, last_checkin_at desc;

-- Allow ordinary users and anonymous visitors to read only the sanitized leaderboard view.
-- This does not grant access to raw lesson_progress rows.
grant select on public.minna_public_leaderboard to anon;
grant select on public.minna_public_leaderboard to authenticated;

-- Keep RLS on lesson_progress as-is. Do NOT expose user_email/user_id/raw progress in public policies.
