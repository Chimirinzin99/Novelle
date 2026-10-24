-- 010_active_accounts_only.sql  (Part 11 — Security/RLS, step 5)
--
-- Problem: deactivating a user (Part 9) bans them in Supabase Auth and the
-- backend refuses them, but RLS never looked at profiles.is_active. A user who
-- was already logged in keeps a valid access token for up to ~1 hour and can
-- keep reading resources, files and their likes straight from the browser.
--
-- Fix:
--   1. public.is_active_user() — true only when the logged-in user's profile
--      exists and is_active = true.
--   2. A RESTRICTIVE policy "Active accounts only" on each table the browser
--      uses. Restrictive policies are ANDed with the normal (permissive)
--      policies: a row is allowed only if a normal policy allows it AND the
--      account is active. So we don't have to edit every existing policy.
--
-- Not restricted on purpose:
--   - profiles   : own row only already; the app reads is_active there to sign a
--                  deactivated user out, so it must stay readable.
--   - programmes : public list (also shown on the landing/register pages).
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

-- 1. Helper. security definer + empty search_path: runs with the function
--    owner's rights (so it never depends on profiles' own RLS) and only uses
--    fully qualified names.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_active from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

-- 2. Restrictive "active accounts only" policies.
create policy "Active accounts only" on public.resources
  as restrictive for all to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "Active accounts only" on public.resource_submissions
  as restrictive for all to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "Active accounts only" on public.favourites
  as restrictive for all to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "Active accounts only" on public.modules
  as restrictive for all to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

create policy "Active accounts only" on storage.objects
  as restrictive for all to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

commit;