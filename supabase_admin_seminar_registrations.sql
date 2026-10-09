-- Run once in Supabase SQL Editor to let existing administrators manage seminar registrations.
alter table public.seminar_registrations
  add column if not exists attendance_status text not null default 'registered'
  check (attendance_status in ('registered', 'confirmed', 'attended', 'cancelled'));

create or replace function public.admin_seminar_registrations_v2()
returns table (
  id uuid,
  event_code text,
  full_name text,
  email text,
  phone text,
  discipline text,
  attendance_status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or lower(coalesce(auth.jwt() ->> 'email', '')) not in
    ('p.termpong@gmail.com', 'chaisin.kiti@gmail.com') then
    raise exception 'Admin access required';
  end if;

  return query
    select r.id, r.event_code, r.full_name, r.email, r.phone, r.discipline, r.attendance_status, r.created_at
    from public.seminar_registrations as r
    order by r.created_at desc;
end;
$$;

revoke all on function public.admin_seminar_registrations_v2() from public, anon;
grant execute on function public.admin_seminar_registrations_v2() to authenticated;

create or replace function public.admin_set_seminar_registration_status(registration_id uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or lower(coalesce(auth.jwt() ->> 'email', '')) not in ('p.termpong@gmail.com', 'chaisin.kiti@gmail.com') then raise exception 'Admin access required'; end if;
  if new_status not in ('registered', 'confirmed', 'attended', 'cancelled') then raise exception 'Invalid registration status'; end if;
  update public.seminar_registrations set attendance_status = new_status where id = registration_id;
end; $$;
revoke all on function public.admin_set_seminar_registration_status(uuid, text) from public, anon;
grant execute on function public.admin_set_seminar_registration_status(uuid, text) to authenticated;
