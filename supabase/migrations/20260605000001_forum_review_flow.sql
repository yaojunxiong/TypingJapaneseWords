-- Forum review flow upgrade.
-- Run this once in Supabase SQL Editor after forum_mvp.sql.

alter table public.forum_posts
  add column if not exists reviewed_by uuid references auth.users(id);

alter table public.forum_posts
  add column if not exists reviewed_at timestamptz;

alter table public.forum_posts
  add column if not exists review_note text;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'forum_posts'
      and column_name = 'status'
  ) then
    alter table public.forum_posts
      add column status text not null default 'approved';
  end if;
end $$;

alter table public.forum_posts
  alter column status set default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.forum_posts'::regclass
      and conname = 'forum_posts_status_check'
  ) then
    alter table public.forum_posts
      add constraint forum_posts_status_check
      check (status in ('pending', 'approved', 'rejected', 'hidden'));
  end if;
end $$;

create index if not exists forum_posts_status_idx
  on public.forum_posts (status, is_deleted, is_pinned desc, created_at desc);

create or replace function public.forum_can_select_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.forum_posts p
    where p.id = p_post_id
      and p.is_deleted = false
      and (
        p.status = 'approved'
        or public.forum_is_admin()
        or (
          p.author_user_id = auth.uid()
          and p.status in ('pending', 'rejected')
        )
      )
  );
$$;

create or replace function public.increment_forum_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('forum.internal_update', '1', true);

  update public.forum_posts
  set view_count = view_count + 1
  where id = p_post_id
    and is_deleted = false
    and status = 'approved';
end;
$$;

create or replace function public.forum_sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('forum.internal_update', '1', true);

  if tg_op = 'INSERT' then
    update public.forum_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  end if;

  update public.forum_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create or replace function public.forum_sync_bookmark_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('forum.internal_update', '1', true);

  if tg_op = 'INSERT' then
    update public.forum_posts set bookmark_count = bookmark_count + 1 where id = new.post_id;
    return new;
  end if;

  update public.forum_posts set bookmark_count = greatest(bookmark_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create or replace function public.forum_sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('forum.internal_update', '1', true);

  if tg_op = 'INSERT' then
    update public.forum_posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.is_deleted = false and new.is_deleted = true then
    update public.forum_posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
  end if;

  return new;
end;
$$;

create or replace function public.forum_guard_user_post_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('forum.internal_update', true) = '1' then
    return new;
  end if;

  if public.forum_is_admin() then
    return new;
  end if;

  if old.author_user_id <> auth.uid() then
    raise exception 'not allowed to update this forum post';
  end if;

  if old.status not in ('pending', 'rejected') then
    raise exception 'only pending or rejected posts can be edited by the author';
  end if;

  if new.author_user_id <> old.author_user_id
    or new.author_email is distinct from old.author_email
    or new.status is distinct from old.status
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.review_note is distinct from old.review_note
    or new.is_pinned is distinct from old.is_pinned
    or new.is_official is distinct from old.is_official
    or new.like_count is distinct from old.like_count
    or new.bookmark_count is distinct from old.bookmark_count
    or new.comment_count is distinct from old.comment_count
    or new.view_count is distinct from old.view_count
    or new.created_at is distinct from old.created_at then
    raise exception 'protected forum post fields cannot be changed by the author';
  end if;

  return new;
end;
$$;

drop trigger if exists forum_posts_guard_user_update on public.forum_posts;
create trigger forum_posts_guard_user_update
before update on public.forum_posts
for each row execute function public.forum_guard_user_post_update();

drop policy if exists forum_posts_read_visible on public.forum_posts;
create policy forum_posts_read_visible
on public.forum_posts for select
using (
  is_deleted = false
  and (
    status = 'approved'
    or public.forum_is_admin()
    or (
      author_user_id = auth.uid()
      and status in ('pending', 'rejected')
    )
  )
);

drop policy if exists forum_posts_insert_own on public.forum_posts;
create policy forum_posts_insert_own
on public.forum_posts for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and status = 'pending'
  and is_pinned = false
  and is_official = false
  and is_deleted = false
  and category <> 'announcement'
);

drop policy if exists forum_posts_update_own on public.forum_posts;
create policy forum_posts_update_own
on public.forum_posts for update
to authenticated
using (
  author_user_id = auth.uid()
  and is_deleted = false
  and status in ('pending', 'rejected')
)
with check (
  author_user_id = auth.uid()
  and status in ('pending', 'rejected')
  and is_pinned = false
  and is_official = false
  and category <> 'announcement'
);

drop policy if exists forum_posts_admin_manage on public.forum_posts;
create policy forum_posts_admin_manage
on public.forum_posts for all
to authenticated
using (public.forum_is_admin())
with check (public.forum_is_admin());

drop policy if exists forum_comments_read_visible on public.forum_comments;
create policy forum_comments_read_visible
on public.forum_comments for select
using (
  is_deleted = false
  and public.forum_can_select_post(post_id)
);

drop policy if exists forum_comments_insert_own on public.forum_comments;
create policy forum_comments_insert_own
on public.forum_comments for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and is_deleted = false
  and public.forum_can_select_post(post_id)
  and public.forum_parent_comment_matches(parent_comment_id, post_id)
);

drop policy if exists forum_likes_insert_own on public.forum_likes;
create policy forum_likes_insert_own
on public.forum_likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.forum_can_select_post(post_id)
);

drop policy if exists forum_bookmarks_insert_own on public.forum_bookmarks;
create policy forum_bookmarks_insert_own
on public.forum_bookmarks for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.forum_can_select_post(post_id)
);

notify pgrst, 'reload schema';
