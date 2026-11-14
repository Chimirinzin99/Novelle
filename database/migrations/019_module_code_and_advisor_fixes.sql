-- 019_module_code_and_advisor_fixes.sql  (Part 24, 14 Nov 2026)
--
-- Three things in one migration:
--
-- 1) resources.module_code
--    Search only looked at title, topic and module_name, so typing a module
--    code like "MAT205" found nothing. Resources already keep their own copy
--    of the module's name / year / semester (so lists don't need a join, and
--    students can't read other programmes' modules anyway because of RLS).
--    We add the code to that copy and fill it in for existing resources.
--    approve_submission() is redefined so approved submissions get it too.
--    (The backend sets it on admin uploads and on module edits.)
--
-- 2) handle_new_user() is a trigger function (fills in profiles on sign-up).
--    Postgres lets anyone call functions by default, so it was reachable via
--    /rest/v1/rpc. Triggers still run without EXECUTE, so revoking is safe.
--
-- 3) Indexes on the 11 foreign keys the Supabase advisor flagged as
--    unindexed. Without them, joins/filters on these columns and deletes on
--    the parent table scan the whole child table.
--
-- Safe to run twice ("if not exists" / "create or replace").

begin;

-- 1) Module code on resources -------------------------------------------
alter table public.resources
  add column if not exists module_code text;

update public.resources r
set module_code = m.module_code
from public.modules m
where r.module_id = m.id
  and r.module_code is distinct from m.module_code;

create or replace function public.approve_submission(
  p_submission_id bigint,
  p_module_id     bigint,
  p_reviewer      uuid
)
returns public.resources
language plpgsql
set search_path to 'public'
as $function$
declare
  s public.resource_submissions;
  m public.modules;
  r public.resources;
begin
  -- Lock the row so two admins can't approve the same submission at once.
  select * into s
  from public.resource_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'SUBMISSION_NOT_FOUND';
  end if;

  if s.status <> 'pending' then
    raise exception 'SUBMISSION_NOT_PENDING';
  end if;

  select * into m
  from public.modules
  where id = p_module_id;

  if not found or not m.active then
    raise exception 'MODULE_NOT_FOUND';
  end if;

  if m.programme_id <> s.programme_id then
    raise exception 'MODULE_WRONG_PROGRAMME';
  end if;

  insert into public.resources (
    topic, title, type, programme_id, module_id, module_code, module_name,  -- Part 24: module_code
    year, semester, file_path, uploaded_by, submission_id,
    author_type, author_name, is_solved
  )
  values (
    s.title, s.title, s.type, s.programme_id, m.id, m.module_code, m.module_name,
    m.year, m.semester, s.file_path, s.submitted_by, s.id,
    s.author_type, s.author_name, s.is_solved
  )
  returning * into r;

  update public.resource_submissions
  set status = 'approved',
      module_id = m.id,
      year = m.year,
      semester = m.semester,
      rejection_reason = null,
      reviewed_by = p_reviewer,
      reviewed_at = now()
  where id = s.id;

  return r;
end;
$function$;

-- Only the backend (service role) may run it.
revoke execute on function public.approve_submission(bigint, bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_submission(bigint, bigint, uuid)
  to service_role;

-- 2) handle_new_user: trigger only, not callable through the API ---------
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

-- 3) Foreign-key indexes -------------------------------------------------
create index if not exists favourites_resource_id_idx
  on public.favourites (resource_id);
create index if not exists modules_programme_id_idx
  on public.modules (programme_id);
create index if not exists notifications_submission_id_idx
  on public.notifications (submission_id);
create index if not exists profiles_programme_id_idx
  on public.profiles (programme_id);
create index if not exists resource_submissions_module_id_idx
  on public.resource_submissions (module_id);
create index if not exists resource_submissions_programme_id_idx
  on public.resource_submissions (programme_id);
create index if not exists resource_submissions_reviewed_by_idx
  on public.resource_submissions (reviewed_by);
create index if not exists resource_submissions_submitted_by_idx
  on public.resource_submissions (submitted_by);
create index if not exists resources_module_id_idx
  on public.resources (module_id);
create index if not exists resources_programme_id_idx
  on public.resources (programme_id);
create index if not exists resources_uploaded_by_idx
  on public.resources (uploaded_by);

commit;
