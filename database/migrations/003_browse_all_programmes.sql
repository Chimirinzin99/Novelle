-- 003: Students can browse resources from every programme (decided 4 Oct 2026).
-- The old policy only showed resources from the student's own programme.

-- Remove the old, too-strict rule.
drop policy "Students can view resources" on public.resources;

-- Any logged-in user can read published resources.
-- "to authenticated" = logged-in users only; logged-out visitors still see nothing.
-- "using (true)" = no row-by-row condition.
create policy "Logged-in users can view resources"
on public.resources
for select
to authenticated
using (true);