alter table public.admin_recitation_video_projects
  drop constraint if exists admin_recitation_video_projects_status_check,
  add constraint admin_recitation_video_projects_status_check
    check (status in ('draft', 'queued', 'generating', 'generated', 'failed'));
