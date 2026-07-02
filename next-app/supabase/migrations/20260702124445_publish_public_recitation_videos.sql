alter table public.admin_recitation_video_projects
  add column if not exists public_video_path text,
  add column if not exists public_video_url text,
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid null;

insert into storage.buckets (
  id,
  name,
  public,
  avif_autodetection,
  file_size_limit,
  allowed_mime_types
)
values (
  'public-recitation-videos',
  'public-recitation-videos',
  true,
  false,
  524288000,
  array['video/mp4']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
