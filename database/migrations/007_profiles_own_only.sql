-- 007_profiles_own_only.sql  (Part 11 — Security/RLS, step 2)
--
-- Problem: the policy "Authenticated users can read profiles" (USING true)
-- appeared in the dashboard before 19 Oct. It lets ANY logged-in user read
-- EVERY profile row from the browser: names, RUB emails, roles, programmes.
--
-- Fix: remove it. The older policy "Users can read their own profile"
-- (id = auth.uid()) stays, so each user can still read their own row.
--
-- Why nothing breaks:
--   - every browser query on profiles reads only the logged-in user's own row
--     (.eq("id", user.id)) — checked in all 14 places in frontend/src;
--   - lists of OTHER users (submitter names on /admin/submissions, /admin/users,
--     dashboard counts) come from the backend, which uses the service-role key
--     and is not limited by RLS.
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

drop policy if exists "Authenticated users can read profiles" on public.profiles;

commit;