-- 004_resource_type_check.sql
-- Part 5: the database itself only accepts known resource types.
-- The list must match:
--   backend/src/constants/resourceTypes.ts
--   frontend/src/lib/resourceTypes.ts
-- (Part 6 will add 'video' in a new migration.)

-- Safe to run more than once: drop the constraints first if they exist.
alter table public.resources
  drop constraint if exists resources_type_check;

alter table public.resource_submissions
  drop constraint if exists resource_submissions_type_check;

-- Published resources
alter table public.resources
  add constraint resources_type_check
  check (type in ('note', 'question_paper', 'assignment'));

-- Student submissions
alter table public.resource_submissions
  add constraint resource_submissions_type_check
  check (type in ('note', 'question_paper', 'assignment'));