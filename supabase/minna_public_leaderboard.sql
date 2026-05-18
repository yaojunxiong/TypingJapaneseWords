-- Minna public leaderboard view for Option B
-- Goal: ordinary Google users can see the whole leaderboard without exposing email, user_id, user_key, or raw progress JSON.
-- Run this in Supabase SQL Editor as project owner/admin.
-- Version: leaderboard + 1-25 review achievement.

create or replace view public.minna_public_leaderboard as
with records as (
  select
    coalesce(user_id::text, user_email, user_key) as user_ref,
    '学习者 ' || right(md5(coalesce(user_id::text, user_email, user_key)), 6) as display_name,
    lesson_id,
    progress,
    updated_at,
    coalesce(nullif(progress->>'score', '')::int, 0) as score,
    coalesce(nullif(progress->>'rate', '')::int, 0) as review_rate,
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
  sum(completed_lesson)::int as completed_lessons,
  sum(case when lesson_id ~ '^minna_lesson_[0-9]{2}$' then completed_slides else 0 end)::int as completed_slides,
  sum(score)::int as total_score,
  max(has_review_01_25)::int as has_review_01_25,
  max(case when lesson_id = 'minna_review_01_25' then review_rate else 0 end)::int as review_01_25_rate,
  max(last_checkin_at) as last_checkin_at
from scored
group by user_ref, display_name
order by completed_lessons desc, has_review_01_25 desc, total_score desc, last_checkin_at desc;

-- Allow ordinary users and anonymous visitors to read only the sanitized leaderboard view.
-- This does not grant access to raw lesson_progress rows.
grant select on public.minna_public_leaderboard to anon;
grant select on public.minna_public_leaderboard to authenticated;

-- Keep RLS on lesson_progress as-is. Do NOT expose user_email/user_id/raw progress in public policies.
