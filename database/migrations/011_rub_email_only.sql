-- 011_rub_email_only.sql  (Part 11 — Security/RLS, step 6)
--
-- Problem: only the register page checks for an @rub.edu.bt address. Anyone
-- can call Supabase's sign-up API directly (the anon key is public) with any
-- email, get an account and — after confirming — browse every resource.
--
-- Fix: a CHECK on profiles.email. Every sign-up runs the trigger
-- handle_new_user, which inserts the profile row. If the email is not RUB,
-- that insert fails, and because the trigger runs in the same transaction as
-- the sign-up, the whole sign-up is undone: no auth user, no profile, no
-- confirmation email. Supabase answers "Database error saving new user".
--
-- ~* = case-insensitive regular expression; \. = a literal dot; $ = end.
-- All existing users already have @rub.edu.bt emails (checked 24 Oct).
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

alter table public.profiles
  add constraint profiles_email_rub_check
  check (email ~* '@rub\.edu\.bt$');

commit;