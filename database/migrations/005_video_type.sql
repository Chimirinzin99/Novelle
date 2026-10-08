-- 005_video_type.sql
-- Part 6: new resource type "video" — YouTube links only, added by admins
-- only (students cannot submit videos, so resource_submissions is unchanged).
-- We store only the 11-character YouTube video ID (e.g. dQw4w9WgXcQ).
-- The watch link and thumbnail are built from it in the frontend:
--   https://www.youtube.com/watch?v=<id>
--   https://i.ytimg.com/vi/<id>/hqdefault.jpg
-- Type list must match backend/src/constants/resourceTypes.ts and
-- frontend/src/lib/resourceTypes.ts.

begin;

-- 1. New column for the YouTube video ID (empty for PDFs).
alter table public.resources
  add column if not exists video_id text;

-- 2. Allow the new type on published resources (replaces 004's constraint).
--    resource_submissions keeps 004's constraint: no 'video' there.
alter table public.resources
  drop constraint if exists resources_type_check;
alter table public.resources
  add constraint resources_type_check
  check (type in ('note', 'question_paper', 'assignment', 'video'));

-- 3. A video has a valid video_id and no file; every other type has a file
--    and no video_id. "~" checks the value against a regular expression:
--    exactly 11 letters, digits, "-" or "_".
alter table public.resources
  drop constraint if exists resources_content_check;
alter table public.resources
  add constraint resources_content_check
  check (
    (type = 'video'
       and video_id ~ '^[A-Za-z0-9_-]{11}$'
       and file_path is null)
    or
    (type <> 'video'
       and video_id is null
       and file_path is not null)
  );

commit;