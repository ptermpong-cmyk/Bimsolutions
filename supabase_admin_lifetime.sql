-- Run once after confirming the administrator email in Supabase Auth.
-- Grants p.termpong@gmail.com the active Pro plan with no expiry date.
do $$
declare
  administrator_id uuid;
begin
  select id into administrator_id
  from auth.users
  where lower(email) = lower('p.termpong@gmail.com')
  limit 1;

  if administrator_id is null then
    raise exception 'Administrator account was not found. Confirm the email, then run this script again.';
  end if;

  insert into public.profiles (id, email, name, role)
  values (administrator_id, 'p.termpong@gmail.com', 'BIM Solutions Administrator', 'admin')
  on conflict (id) do update
  set email = excluded.email, name = excluded.name, role = excluded.role;

  if not exists (
    select 1 from public.subscriptions
    where user_id = administrator_id and is_active = true and expires_at is null
  ) then
    insert into public.subscriptions (user_id, plan, expires_at, is_active)
    values (administrator_id, 'pro', null, true);
  end if;
end;
$$;
