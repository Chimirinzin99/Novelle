-- 009_remove_browser_writes.sql  (Part 11 — Security/RLS, step 4)
--
-- Since Parts 2, 7 and the 21 Oct merge, every write except likes goes
-- through the backend (service-role key, not limited by RLS), where the
-- role and programme checks live. The browser itself only writes to
-- `favourites` (like / unlike) — checked in all of frontend/src.
--
-- The old browser write policies below are therefore unused. Leaving them
-- would let someone skip the backend checks by calling Supabase directly,
-- e.g. a programme admin editing modules (backend says super admin only),
-- an admin approving a submission without approve_submission(), or a
-- student inserting a submission with status = 'approved'.
--
-- Also removes leftovers nobody uses:
--   - tables public.videos and public.admin_videos (0 rows each, no code uses them)
--   - column resources.subject_module (3 old rows, same value as module_name)
--
-- Policies that STAY (browser reads + likes):
--   profiles  : Users can read their own profile
--   programmes: Anyone can view programmes
--   modules   : Programme admins can view their programme modules
--   resources : Logged-in users can view resources
--   resource_submissions: Students can view their own submissions,
--                         Admins can view allowed submissions
--   favourites: view / add / remove own
--   storage   : the three read policies from 002 and 008
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

-- resources: uploads and edits go through POST/PUT /api/resources
drop policy if exists "Admins can add resources" on public.resources;

-- resource_submissions: students submit via POST /api/submissions/upload,
-- admins approve/reject via /api/submissions/:id/approve|reject
drop policy if exists "Students can submit their own resources" on public.resource_submissions;
drop policy if exists "Admins can update allowed submissions" on public.resource_submissions;

-- modules: add / edit / (de)activate go through /api/modules (super admin only)
drop policy if exists "Admins can add modules" on public.modules;
drop policy if exists "Admins can update modules" on public.modules;
drop policy if exists "Admins can deactivate modules" on public.modules;

-- storage: student files are uploaded by the backend
drop policy if exists "Students can upload their own submissions" on storage.objects;

-- leftovers
drop table if exists public.videos;
drop table if exists public.admin_videos;
alter table public.resources drop column if exists subject_module;

commit;