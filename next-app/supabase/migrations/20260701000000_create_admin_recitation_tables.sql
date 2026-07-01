-- Admin Recitation Best Selections
create table if not exists public.admin_recitation_best_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_no int not null,
  source_type text not null default 'manual',
  selected_take_ids jsonb not null default '[]',
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_admin_best_selections_user_lesson
  on public.admin_recitation_best_selections (user_id, lesson_no);

alter table public.admin_recitation_best_selections enable row level security;

-- Admin can read/write; anon/authenticated non-admin cannot
create policy "admin_all_best_selections"
  on public.admin_recitation_best_selections
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Admin Recitation Video Projects
create table if not exists public.admin_recitation_video_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_no int not null,
  best_selection_id uuid references public.admin_recitation_best_selections(id) on delete set null,
  title text,
  template_type text default 'custom',
  line_plan jsonb not null default '[]',
  background_type text default 'gradient',
  background_url text,
  status text not null default 'draft' check (status in ('draft', 'generating', 'generated', 'failed')),
  output_video_url text,
  output_manifest jsonb,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_recitation_video_projects enable row level security;

create policy "admin_all_video_projects"
  on public.admin_recitation_video_projects
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Admin Recitation Video Jobs
create table if not exists public.admin_recitation_video_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.admin_recitation_video_projects(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  output_video_url text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.admin_recitation_video_jobs enable row level security;

create policy "admin_all_video_jobs"
  on public.admin_recitation_video_jobs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Create storage bucket for admin recitation videos
insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
values ('admin-recitation-videos', 'admin-recitation-videos', false, false, 524288000, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;

-- Storage policy: only admin can read/write
create policy "admin_all_recitation_videos"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'admin-recitation-videos' and
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    bucket_id = 'admin-recitation-videos' and
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
