-- ============================================================
-- Fix RLS infinite recursion on user_roles table
-- ============================================================
-- Root cause: "admins can read all roles" policy on user_roles
-- queries user_roles itself (exists select 1 from user_roles),
-- causing infinite recursion on every user_roles access.
--
-- Fix:
--   1. Create security definer is_admin() that bypasses RLS
--   2. Drop the self-referencing policy on user_roles
--   3. Update review_items "Admin can read all" to use is_admin()
-- ============================================================

-- ============================================================
-- 1. Create security definer is_admin() function
--    (bypasses RLS because of SECURITY DEFINER)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- ============================================================
-- 2. Drop the self-referencing policy on user_roles
-- ============================================================
drop policy if exists "admins can read all roles" on public.user_roles;

-- The remaining "users can read own role" policy is sufficient:
--   auth.uid() = user_id
-- No other policies needed — admin checks go through is_admin()

-- ============================================================
-- 3. Fix review_items "Admin can read all" to use is_admin()
-- ============================================================
drop policy if exists "Admin can read all review items" on public.review_items;

create policy "Admin can read all review items"
  on public.review_items
  for select
  using (
    auth.uid() = user_id
    or public.is_admin()
  );
