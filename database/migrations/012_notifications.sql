-- 012_notifications.sql  (Part 13 — Supervisor's requests, step 13c)
--
-- Real notifications for students, stored in the database instead of the
-- browser (localStorage). Until now the bell only showed "pending", written
-- by the upload page on that one browser; approve/reject never told the
-- student anything.
--
-- Who writes what:
--   - The BACKEND (service role) inserts a row when a student submits
--     (kind 'pending'), and when an admin approves ('approved') or rejects
--     ('rejected', message includes the reason).
--   - The BROWSER may only READ its own rows and MARK them read (read_at).
--     It cannot create, delete or reword notifications.
--
-- Wrapped in begin/commit: if any line fails, nothing is changed.

begin;

create table public.notifications (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          text not null
                  constraint notifications_kind_check
                  check (kind in ('pending', 'approved', 'rejected')),
  submission_id bigint references public.resource_submissions (id) on delete cascade,
  message       text not null,
  href          text not null default '/my-submissions',
  read_at       timestamptz,          -- null = unread
  created_at    timestamptz not null default now()
);

-- The bell asks for "my newest notifications".
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Table rights: the browser (authenticated) may SELECT, and UPDATE only the
-- read_at column. No insert/delete. anon gets nothing.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Row rules: only your own notifications.
create policy "Users can read their own notifications"
  on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users can mark their own notifications read"
  on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Same rule as the other tables since 010: deactivated accounts see nothing.
create policy "Active accounts only" on public.notifications
  as restrictive for all to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());

commit;