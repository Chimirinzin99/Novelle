-- 013_author_and_solved.sql  (Part 13 — Supervisor's requests, step 13d)
--
-- Two supervisor requests, on BOTH resource_submissions and resources:
--
-- 1. Author credit — who originally made the material.
--      author_type  'self'    = made by the person who uploaded it
--                   'other'   = someone else (a lecturer, a senior …)
--                   'unknown' = "Not sure"
--                   null      = not given (all rows from before this part)
--      author_name  the name shown on the card ("By …"):
--                   'other' -> the typed name (required)
--                   'self'  -> the uploader's own name if they ticked
--                              "show my name", otherwise null ("By a student")
--                   'unknown' / null -> always null
--    The backend fills the uploader's name itself, so nobody can claim to be
--    someone else by typing a name for "I made this".
--
-- 2. Solved / Unsolved tag — does the PDF include answers?
--      is_solved  true = Solved. Used for question papers and assignments;
--                 notes ignore it. Existing rows become false (Unsolved).
--
-- approve_submission() is updated to copy the three new columns into the
-- new resource (everything else in it is unchanged).
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

-- 1. New columns -----------------------------------------------------------

alter table public.resource_submissions
  add column author_type text,
  add column author_name text,
  add column is_solved   boolean not null default false;

alter table public.resources
  add column author_type text,
  add column author_name text,
  add column is_solved   boolean not null default false;

-- 2. Rules (same on both tables) ------------------------------------------

alter table public.resource_submissions
  add constraint resource_submissions_author_type_check
    check (author_type is null or author_type in ('self', 'other', 'unknown')),
  add constraint resource_submissions_author_name_check
    check (
      (author_name is null or char_length(btrim(author_name)) between 1 and 80)
      and (author_type is distinct from 'other' or author_name is not null)
      and (author_type in ('self', 'other') or author_name is null)
    );

alter table public.resources
  add constraint resources_author_type_check
    check (author_type is null or author_type in ('self', 'other', 'unknown')),
  add constraint resources_author_name_check
    check (
      (author_name is null or char_length(btrim(author_name)) between 1 and 80)
      and (author_type is distinct from 'other' or author_name is not null)
      and (author_type in ('self', 'other') or author_name is null)
    );

-- 3. approve_submission: also copy author_type, author_name, is_solved -----

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
    topic, title, type, programme_id, module_id, module_name,
    year, semester, file_path, uploaded_by, submission_id,
    author_type, author_name, is_solved                      -- Part 13d
  )
  values (
    s.title, s.title, s.type, s.programme_id, m.id, m.module_name,
    m.year, m.semester, s.file_path, s.submitted_by, s.id,
    s.author_type, s.author_name, s.is_solved                -- Part 13d
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

-- create or replace keeps the old grants, but say it again to be sure:
-- only the backend (service role) may run it.
revoke execute on function public.approve_submission(bigint, bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_submission(bigint, bigint, uuid)
  to service_role;

commit;