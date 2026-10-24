-- 008_storage_read_policies.sql  (Part 11 — Security/RLS, step 3)
--
-- Problem: the Storage policy "Authenticated users can view resources"
-- (bucket_id = 'resources') lets ANY logged-in user open EVERY file in the
-- bucket — including other students' pending and rejected submissions.
--
-- Who should be able to open a file (the browser only makes signed URLs;
-- all uploads and deletes go through the backend with the service-role key):
--   A. a PUBLISHED file (its path is in resources.file_path)  -> any logged-in user   (NEW below)
--   B. a file in your own folder submissions/<your id>/        -> you                (kept, migration 002)
--   C. a submitted file in your programme / any programme      -> programme admin /
--                                                                 super admin        (kept, "Admins can view resource files")
--
-- So: add A, then remove the broad policy. B and C stay as they are.
--
-- Policy A reads public.resources as the logged-in user, so it also follows
-- the resources table's own RLS (today: logged-in users can view resources).
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

-- A. Published files: any logged-in user may read a file that belongs to a resource.
create policy "Logged-in users can view published resource files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resources'
  and exists (
    select 1
    from public.resources r
    where r.file_path = storage.objects.name
  )
);

-- Remove the broad "every file in the bucket" policy.
drop policy if exists "Authenticated users can view resources" on storage.objects;

commit;