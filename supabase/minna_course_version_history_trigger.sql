-- Minna Course Version History Trigger v19.5
-- Run after supabase/minna_course_version_history.sql.
-- Purpose: automatically snapshot every insert/update of minna_course_lessons.

create or replace function public.minna_snapshot_course_lesson_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.minna_course_lesson_versions (
    course,
    lesson_no,
    lesson_id,
    status,
    version,
    schema_version,
    title_zh,
    title_en,
    content,
    source_action,
    created_by,
    created_email
  ) values (
    new.course,
    new.lesson_no,
    new.lesson_id,
    new.status,
    coalesce(new.version, 1),
    coalesce(new.schema_version, 'minna.lesson.v1'),
    new.title_zh,
    new.title_en,
    new.content,
    case when tg_op = 'INSERT' then 'insert' else 'update' end,
    new.updated_by,
    new.updated_email
  );
  return new;
end;
$$;

drop trigger if exists minna_course_lesson_versions_snapshot_trg on public.minna_course_lessons;

create trigger minna_course_lesson_versions_snapshot_trg
after insert or update on public.minna_course_lessons
for each row
execute function public.minna_snapshot_course_lesson_version();
