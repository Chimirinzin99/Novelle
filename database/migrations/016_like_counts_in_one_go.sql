-- 016_like_counts_in_one_go.sql  (Part 19, 4 Nov 2026)
--
-- Pages showed like counts by calling get_like_count() once PER CARD, one
-- after another: /home made ~20 extra round trips to Supabase before it
-- appeared. get_like_counts() takes ALL the card ids at once and returns the
-- counts in ONE request.
--
-- Why a function at all: favourites RLS lets a user read only their OWN likes,
-- so the browser can't count other people's. SECURITY DEFINER runs the count
-- with the function owner's rights, but it returns only numbers (no user ids).
--
-- Also new compared with get_like_count():
--   - deactivated accounts get nothing (is_active_user(), like the other rules)
--   - only logged-in users may call it (anon and PUBLIC revoked)
--   - search_path = '' (all names written in full), as in is_active_user()
--
-- Resources with no likes are simply missing from the result; the pages
-- treat a missing id as 0.
--
-- get_like_count() is left in place for now: the live site still uses it
-- until this part is pushed. Drop it in a later migration.

begin;

create or replace function public.get_like_counts(p_resource_ids bigint[])
returns table (resource_id bigint, likes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select f.resource_id, count(*)::bigint as likes
  from public.favourites f
  where public.is_active_user()
    and f.resource_id = any (p_resource_ids)
  group by f.resource_id;
$$;

revoke all on function public.get_like_counts(bigint[]) from public, anon;
grant execute on function public.get_like_counts(bigint[]) to authenticated;

commit;
