-- 017_cst_email_only.sql  (Part 20, 5 Nov 2026)
--
-- Group decision (5 Nov): Novelle is for CST, so only CST addresses may
-- register — not every "@rub.edu.bt" address (other RUB colleges).
--   students  -> student ID:  02240334.cst@rub.edu.bt
--   lecturers -> their name:  pema.cst@rub.edu.bt, tshering.dorji.cst@rub.edu.bt
-- Same pattern as frontend/src/lib/cstEmail.ts and
-- backend/src/constants/email.ts (keep the three alike).
--
-- How it blocks sign-ups: handle_new_user() copies every new auth user into
-- profiles; if the email breaks this CHECK, that insert fails and Supabase
-- rolls back the whole sign-up (as with 011's RUB rule).
--
-- All 8 existing profiles fit (checked 5 Nov), so adding it can't fail on
-- old rows. 011's profiles_email_rub_check stays; this one is stricter.

begin;

alter table public.profiles
  add constraint profiles_email_cst_check
  check (email ~* '^([0-9]+|[a-z]+([._-][a-z]+)*)\.cst@rub\.edu\.bt$');

commit;
