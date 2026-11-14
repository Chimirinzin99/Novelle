-- 018_drop_old_like_count.sql  (Part 23, 14 Nov 2026)
--
-- Removes get_like_count(bigint), the old one-card-at-a-time like counter.
-- 016 replaced it with get_like_counts(bigint[]) (all cards in one request)
-- and left the old one in place until the new code was live. It is live now
-- and nothing calls get_like_count any more (frontend/src/lib/likes.ts only
-- uses get_like_counts).
--
-- Why drop it rather than just leave it: it was still executable by "anon"
-- (not logged in) and by deactivated accounts, because it predates the rules
-- 016 added (logged-in only, is_active_user()). An unused function that skips
-- the security rules is an open door with no reason to exist.
--
-- "if exists" makes this safe to run twice.

begin;

drop function if exists public.get_like_count(bigint);

commit;
