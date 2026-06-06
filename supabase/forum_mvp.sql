-- Learning communication forum MVP.
-- Run in Supabase SQL Editor after the existing role/RLS scripts.

create extension if not exists pgcrypto;

create or replace function public.forum_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_admin_user(), false)
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'yaojunxiong23@gmail.com';
$$;

create or replace function public.forum_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  title text not null check (char_length(title) between 2 and 120),
  body text not null check (char_length(body) between 1 and 12000),
  lesson_no integer check (lesson_no is null or lesson_no between 1 and 50),
  stage text,
  question_id text,
  category text not null default 'grammar' check (
    category in ('grammar', 'vocabulary', 'wrong_question', 'checkin', 'announcement')
  ),
  like_count integer not null default 0 check (like_count >= 0),
  bookmark_count integer not null default 0 check (bookmark_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  view_count integer not null default 0 check (view_count >= 0),
  is_pinned boolean not null default false,
  is_official boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_posts add column if not exists author_email text;
alter table public.forum_posts add column if not exists lesson_no integer;
alter table public.forum_posts add column if not exists stage text;
alter table public.forum_posts add column if not exists question_id text;
alter table public.forum_posts add column if not exists like_count integer not null default 0;
alter table public.forum_posts add column if not exists bookmark_count integer not null default 0;
alter table public.forum_posts add column if not exists comment_count integer not null default 0;
alter table public.forum_posts add column if not exists view_count integer not null default 0;
alter table public.forum_posts add column if not exists is_pinned boolean not null default false;
alter table public.forum_posts add column if not exists is_official boolean not null default false;
alter table public.forum_posts add column if not exists is_deleted boolean not null default false;

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  body text not null check (char_length(body) between 1 and 5000),
  parent_comment_id uuid references public.forum_comments(id) on delete cascade,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_comments add column if not exists author_email text;
alter table public.forum_comments add column if not exists parent_comment_id uuid references public.forum_comments(id) on delete cascade;
alter table public.forum_comments add column if not exists is_deleted boolean not null default false;

create table if not exists public.forum_likes (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.forum_bookmarks (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists forum_posts_feed_idx
  on public.forum_posts (is_deleted, is_pinned desc, created_at desc);
create index if not exists forum_posts_category_idx
  on public.forum_posts (category, is_deleted, is_pinned desc, created_at desc);
create index if not exists forum_comments_post_idx
  on public.forum_comments (post_id, is_deleted, created_at asc);

drop trigger if exists forum_posts_touch_updated_at on public.forum_posts;
create trigger forum_posts_touch_updated_at
before update on public.forum_posts
for each row execute function public.forum_touch_updated_at();

drop trigger if exists forum_comments_touch_updated_at on public.forum_comments;
create trigger forum_comments_touch_updated_at
before update on public.forum_comments
for each row execute function public.forum_touch_updated_at();

create or replace function public.forum_sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  end if;

  update public.forum_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists forum_likes_sync_count on public.forum_likes;
create trigger forum_likes_sync_count
after insert or delete on public.forum_likes
for each row execute function public.forum_sync_like_count();

create or replace function public.forum_sync_bookmark_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_posts set bookmark_count = bookmark_count + 1 where id = new.post_id;
    return new;
  end if;

  update public.forum_posts set bookmark_count = greatest(bookmark_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists forum_bookmarks_sync_count on public.forum_bookmarks;
create trigger forum_bookmarks_sync_count
after insert or delete on public.forum_bookmarks
for each row execute function public.forum_sync_bookmark_count();

create or replace function public.forum_sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists forum_comments_sync_count_insert on public.forum_comments;
create trigger forum_comments_sync_count_insert
after insert on public.forum_comments
for each row execute function public.forum_sync_comment_count();

drop trigger if exists forum_comments_sync_count_update on public.forum_comments;
create trigger forum_comments_sync_count_update
after update of is_deleted on public.forum_comments
for each row execute function public.forum_sync_comment_count();

create or replace function public.increment_forum_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_posts
  set view_count = view_count + 1
  where id = p_post_id and is_deleted = false;
end;
$$;

create or replace function public.forum_parent_comment_matches(
  p_parent_comment_id uuid,
  p_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_parent_comment_id is null
    or exists (
      select 1
      from public.forum_comments parent
      where parent.id = p_parent_comment_id
        and parent.post_id = p_post_id
        and parent.is_deleted = false
    );
$$;

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_likes enable row level security;
alter table public.forum_bookmarks enable row level security;

drop policy if exists forum_posts_read_visible on public.forum_posts;
create policy forum_posts_read_visible
on public.forum_posts for select
using (is_deleted = false or public.forum_is_admin());

drop policy if exists forum_posts_insert_own on public.forum_posts;
create policy forum_posts_insert_own
on public.forum_posts for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and is_pinned = false
  and is_official = false
  and is_deleted = false
  and category <> 'announcement'
);

drop policy if exists forum_posts_update_own on public.forum_posts;
create policy forum_posts_update_own
on public.forum_posts for update
to authenticated
using (author_user_id = auth.uid() and is_deleted = false)
with check (
  author_user_id = auth.uid()
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
using (is_deleted = false or public.forum_is_admin());

drop policy if exists forum_comments_insert_own on public.forum_comments;
create policy forum_comments_insert_own
on public.forum_comments for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and is_deleted = false
  and exists (
    select 1 from public.forum_posts
    where id = post_id and is_deleted = false
  )
  and public.forum_parent_comment_matches(parent_comment_id, post_id)
);

drop policy if exists forum_comments_update_own on public.forum_comments;
create policy forum_comments_update_own
on public.forum_comments for update
to authenticated
using (author_user_id = auth.uid() and is_deleted = false)
with check (author_user_id = auth.uid());

drop policy if exists forum_comments_admin_manage on public.forum_comments;
create policy forum_comments_admin_manage
on public.forum_comments for all
to authenticated
using (public.forum_is_admin())
with check (public.forum_is_admin());

drop policy if exists forum_likes_read_own on public.forum_likes;
create policy forum_likes_read_own
on public.forum_likes for select
to authenticated
using (user_id = auth.uid());

drop policy if exists forum_likes_insert_own on public.forum_likes;
create policy forum_likes_insert_own
on public.forum_likes for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.forum_posts
    where id = post_id and is_deleted = false
  )
);

drop policy if exists forum_likes_delete_own on public.forum_likes;
create policy forum_likes_delete_own
on public.forum_likes for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists forum_bookmarks_read_own on public.forum_bookmarks;
create policy forum_bookmarks_read_own
on public.forum_bookmarks for select
to authenticated
using (user_id = auth.uid());

drop policy if exists forum_bookmarks_insert_own on public.forum_bookmarks;
create policy forum_bookmarks_insert_own
on public.forum_bookmarks for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.forum_posts
    where id = post_id and is_deleted = false
  )
);

drop policy if exists forum_bookmarks_delete_own on public.forum_bookmarks;
create policy forum_bookmarks_delete_own
on public.forum_bookmarks for delete
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
