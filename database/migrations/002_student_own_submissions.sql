-- 002: Let students see their own submissions and open their own submitted files.
-- Needed by the student "My Submissions" page.
-- Policies are combined with OR, so the existing admin policies are unaffected.

-- 1. Table: a student can read the rows they submitted.
create policy "Students can view their own submissions"
on public.resource_submissions
for select
to authenticated
using (submitted_by = auth.uid());

-- 2. Storage: a student can open files in their own folder.
--    Uploads are stored as submissions/<student-id>/<file>.pdf
--    (the existing upload policy already enforces that folder).
--    storage.foldername(name) splits the path into folders:
--      [1] = 'submissions', [2] = '<student-id>'
create policy "Students can view their own submission files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resources'
  and (storage.foldername(name))[1] = 'submissions'
  and (storage.foldername(name))[2] = auth.uid()::text
);