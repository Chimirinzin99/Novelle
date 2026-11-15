-- 001_submission_review.sql
-- Part 2: approve / reject student submissions through the backend.
--
-- Adds review fields to resource_submissions, links resources back to
-- their module and submission, and creates approve_submission(), which
-- creates the resource and marks the submission approved in ONE
-- transaction (both happen, or neither does).
--
-- Safe to run once in the Supabase SQL editor. Re-running is harmless
-- except for the ADD CONSTRAINT lines, which will say "already exists".

begin;

-- 1. Review fields on submissions -----------------------------------------

alter table public.resource_submissions
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid
    references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.resource_submissions
  add constraint resource_submissions_status_check
  check (status in ('pending', 'approved', 'rejected'));

-- Fixed list of rejection reasons (labels live in the frontend).
alter table public.resource_submissions
  add constraint resource_submissions_rejection_reason_check
  check (
    rejection_reason is null
    or rejection_reason in (
      'wrong_programme_or_module',
      'duplicate',
      'poor_quality_scan',
      'incomplete',
      'not_academic',
      'copyright_concern'
    )
  );

-- 2. Link resources to their module and (if any) the submission -----------

alter table public.resources
  add column if not exists module_id bigint
    references public.modules (id) on delete set null,
  add column if not exists submission_id bigint
    references public.resource_submissions (id) on delete set null;

-- A submission can become at most one resource.
create unique index if not exists resources_submission_id_key
  on public.resources (submission_id)
  where submission_id is not null;

-- 3. Atomic approve --------------------------------------------------------
-- Called only by the backend (service role). Year and semester always come
-- from the chosen module, so they can never disagree with it.

create or replace function public.approve_submission(
  p_submission_id bigint,
  p_module_id bigint,
  p_reviewer uuid
)
returns public.resources
language plpgsql
set search_path = public
as $$
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
    topic, title, type, programme_id, module_id, module_name,
    year, semester, file_path, uploaded_by, submission_id
  )
  values (
    s.title, s.title, s.type, s.programme_id, m.id, m.module_name,
    m.year, m.semester, s.file_path, s.submitted_by, s.id
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
$$;

-- Only the backend may call it; browsers (anon / logged-in users) may not.
revoke all on function public.approve_submission(bigint, bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_submission(bigint, bigint, uuid)
  to service_role;

commit;
