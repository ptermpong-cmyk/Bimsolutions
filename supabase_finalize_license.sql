-- Finalize BIM Solutions licensing in the current Supabase project.
create or replace function public.check_license()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  active_subscription record;
begin
  select * into active_subscription
  from public.subscriptions
  where user_id = auth.uid()
    and is_active = true
    and (expires_at is null or expires_at > now())
  order by started_at desc
  limit 1;

  if active_subscription is null then
    return json_build_object('valid', false, 'reason', 'no_active_subscription');
  end if;

  return json_build_object(
    'valid', true,
    'plan', active_subscription.plan,
    'expires_at', active_subscription.expires_at
  );
end;
$$;

do $$
declare
  administrator_id uuid;
begin
  select id into administrator_id
  from auth.users
  where lower(email) = lower('p.termpong@gmail.com')
  limit 1;

  if administrator_id is null then
    raise exception 'Administrator account was not found.';
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
