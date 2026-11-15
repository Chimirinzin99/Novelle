-- 006_user_management.sql  (Part 9 — super-admin user management)
--
-- 1. profiles.is_active      : false = account deactivated (login is also blocked
--                              by the backend using a Supabase "ban").
-- 2. profiles_role_check     : role can only be one of the three known roles.
-- 3. profiles_role_programme_check :
--      - a programme_admin MUST have a programme (it's the programme they manage)
--      - a super_admin has NO programme (they manage every programme)
--      - a student may have one (normally set at sign-up)
-- 4. Clears the leftover programme_id on the super admin (Norzin, from student days),
--    otherwise the check in step 3 would fail.
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

-- 4 first, so the new check passes on existing rows
update public.profiles
set programme_id = null
where role = 'super_admin';

-- 1
alter table public.profiles
  add column is_active boolean not null default true;

-- 2
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'programme_admin', 'super_admin'));

-- 3
alter table public.profiles
  add constraint profiles_role_programme_check
  check (
    (role = 'programme_admin' and programme_id is not null)
    or (role = 'super_admin' and programme_id is null)
    or (role = 'student')
  );

commit;