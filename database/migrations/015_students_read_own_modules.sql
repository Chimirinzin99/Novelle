-- 015_students_read_own_modules.sql  (feedback, 27 Oct — submission placement)
--
-- The submit page now lets a student say where a resource belongs:
-- Year + Semester (required) and, optionally, a Module. To fill the Module
-- dropdown, the browser must be able to read modules — until now only
-- admins could (policy "Programme admins can view their programme modules").
--
-- New rule: a logged-in user may READ the ACTIVE modules of THEIR OWN
-- programme. Nothing else:
--   - no other programme's modules, no inactive ones
--   - no writes (module changes still go through the backend, super admin only)
--   - the restrictive "Active accounts only" policy (010) still applies
--
-- Policies are OR-ed: admins keep their wider read rule; this one only adds
-- rows for everyone else.
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

create policy "Users can view active modules of their own programme"
  on public.modules
  for select to authenticated
  using (
    active
    and programme_id = (
      select p.programme_id from public.profiles p where p.id = auth.uid()
    )
  );

commit;