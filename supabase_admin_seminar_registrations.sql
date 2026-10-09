-- Run once in Supabase SQL Editor to let the existing site administrators
-- view seminar registrations in the admin dashboard. No existing statuses change.
create or replace function public.admin_seminar_registrations()
returns table (
  id uuid,
  event_code text,
  full_name text,
  email text,
  phone text,
  discipline text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.bims_is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
    select r.id, r.event_code, r.full_name, r.email, r.phone, r.discipline, r.created_at
    from public.seminar_registrations as r
    order by r.created_at desc;
end;
$$;

revoke all on function public.admin_seminar_registrations() from public, anon;
grant execute on function public.admin_seminar_registrations() to authenticated;
