-- 014_login_attempts.sql  (Part 13 — Supervisor's requests, step 13e)
--
-- Login lockout: 5 wrong passwords in a row (within 15 minutes) lock that
-- email for 15 minutes. Supabase's own hook for this is a paid feature, so
-- logins now go through our backend (POST /api/auth/login), which keeps
-- count here.
--
-- Only the backend (service role) uses this table and function. The browser
-- has no access at all: RLS is on with NO policies, and anon/authenticated
-- get no rights. (Otherwise anyone could read which emails are being
-- attacked, or reset a lock.)
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

create table public.login_attempts (
  email          text primary key,          -- lower case, e.g. 02240334.cst@rub.edu.bt
  failed_count   integer not null default 0,
  last_failed_at timestamptz,
  locked_until   timestamptz,               -- null = not locked
  alert_sent_at  timestamptz                -- for the alert email (step 13f)
);

alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

-- Records ONE wrong password for p_email, in one statement so two wrong
-- tries at the same moment can't both be counted as "the first".
--   - failures older than p_window_minutes are forgotten (start again at 1)
--   - a lock that has run out is cleared (start again at 1)
--   - reaching p_max_failures sets locked_until = now + p_lock_minutes
-- Returns the new count, the lock time (or null) and whether THIS failure
-- caused the lock (so the backend sends the alert email only once).
create or replace function public.record_failed_login(
  p_email          text,
  p_max_failures   integer,
  p_window_minutes integer,
  p_lock_minutes   integer
)
returns table (failed_count integer, locked_until timestamptz, just_locked boolean)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
-- (The returned columns share names with the table's columns; the line above
-- tells PL/pgSQL that a bare name inside SQL means the table column.)
declare
  r public.login_attempts;
begin
  insert into public.login_attempts as a (email, failed_count, last_failed_at)
  values (p_email, 1, now())
  on conflict (email) do update
  set failed_count = case
        when a.locked_until is not null and a.locked_until <= now() then 1
        when a.last_failed_at < now() - make_interval(mins => p_window_minutes) then 1
        else a.failed_count + 1
      end,
      locked_until = case
        when a.locked_until is not null and a.locked_until <= now() then null
        else a.locked_until
      end,
      last_failed_at = now()
  returning a.* into r;

  if r.failed_count >= p_max_failures and r.locked_until is null then
    update public.login_attempts as a
    set locked_until = now() + make_interval(mins => p_lock_minutes)
    where a.email = p_email
    returning a.* into r;

    return query select r.failed_count, r.locked_until, true;
  else
    return query select r.failed_count, r.locked_until, false;
  end if;
end;
$$;

revoke execute on function public.record_failed_login(text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.record_failed_login(text, integer, integer, integer)
  to service_role;

commit;