create table if not exists public.lesson_published_items (
  id uuid primary key default gen_random_uuid(),
  lesson_no integer not null,
  stage text not null,
  item_id text not null,
  item_data jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid null references auth.users(id) on delete set null,
  source_draft_id uuid not null references public.lesson_drafts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_no, stage, item_id)
);

alter table public.lesson_published_items enable row level security;

drop policy if exists lesson_published_items_select_all on public.lesson_published_items;
create policy lesson_published_items_select_all
  on public.lesson_published_items
  for select
  using (true);

drop policy if exists lesson_published_items_admin_write on public.lesson_published_items;
create policy lesson_published_items_admin_write
  on public.lesson_published_items
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

create or replace function public.set_lesson_published_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_lesson_published_items_updated_at on public.lesson_published_items;
create trigger trg_set_lesson_published_items_updated_at
before update on public.lesson_published_items
for each row
execute function public.set_lesson_published_items_updated_at();
