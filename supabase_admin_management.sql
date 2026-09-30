-- Secure admin RPCs for BIM Solutions trial-license management.
create or replace function public.bims_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'p.termpong@gmail.com';
$$;

create or replace function public.admin_license_stats()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.bims_is_admin() then raise exception 'Admin access required'; end if;
  return json_build_object(
    'members', (select count(*) from auth.users),
    'pending', (select count(*) from public.trial_requests where status = 'pending'),
    'approved', (select count(*) from public.trial_requests where status = 'approved'),
    'active_subscriptions', (select count(*) from public.subscriptions where is_active = true and (expires_at is null or expires_at > now()))
  );
end;
$$;

create or replace function public.admin_trial_requests()
returns table (id uuid, user_id uuid, email text, team_size text, project_type text, expectations text, status text, created_at timestamptz, approved_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.bims_is_admin() then raise exception 'Admin access required'; end if;
  return query
  select t.id, t.user_id, u.email::text, t.team_size, t.project_type, t.expectations, t.status, t.submitted_at, t.approved_at, t.expires_at
  from public.trial_requests t
  join auth.users u on u.id = t.user_id
  order by t.submitted_at desc;
end;
$$;

create or replace function public.admin_set_trial_license(request_id uuid, new_status text, duration_days integer default 30)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare target_user uuid; expiry timestamptz;
begin
  if not public.bims_is_admin() then raise exception 'Admin access required'; end if;
  if new_status not in ('pending','approved','rejected') then raise exception 'Invalid trial status'; end if;
  if duration_days < 1 or duration_days > 365 then raise exception 'Duration must be 1 to 365 days'; end if;
  select user_id into target_user from public.trial_requests where id = request_id;
  if target_user is null then raise exception 'Trial request not found'; end if;
  expiry := now() + make_interval(days => duration_days);
  update public.trial_requests
  set status = new_status,
      approved_at = case when new_status = 'approved' then now() else approved_at end,
      expires_at = case when new_status = 'approved' then expiry else expires_at end
  where id = request_id;
  if new_status = 'approved' then
    update public.subscriptions set is_active = false
    where user_id = target_user and plan = 'trial' and is_active = true;
    insert into public.subscriptions (user_id, plan, started_at, expires_at, is_active)
    values (target_user, 'trial', now(), expiry, true);
  end if;
  return json_build_object('ok', true, 'status', new_status, 'expires_at', case when new_status = 'approved' then expiry else null end);
end;
$$;

create or replace function public.admin_license_members()
returns table (user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.bims_is_admin() then raise exception 'Admin access required'; end if;
  return query select u.id, u.email::text, u.created_at, u.last_sign_in_at from auth.users u order by u.created_at desc;
end;
$$;

create or replace function public.admin_license_subscriptions()
returns table (id uuid, user_id uuid, email text, plan text, started_at timestamptz, expires_at timestamptz, is_active boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.bims_is_admin() then raise exception 'Admin access required'; end if;
  return query
  select s.id, s.user_id, u.email::text, s.plan, s.started_at, s.expires_at, s.is_active
  from public.subscriptions s join auth.users u on u.id = s.user_id
  order by s.started_at desc;
end;
$$;

revoke all on function public.bims_is_admin() from public;
revoke all on function public.admin_license_stats() from public;
revoke all on function public.admin_trial_requests() from public;
revoke all on function public.admin_set_trial_license(uuid, text, integer) from public;
revoke all on function public.admin_license_members() from public;
revoke all on function public.admin_license_subscriptions() from public;
grant execute on function public.bims_is_admin() to authenticated;
grant execute on function public.admin_license_stats() to authenticated;
grant execute on function public.admin_trial_requests() to authenticated;
grant execute on function public.admin_set_trial_license(uuid, text, integer) to authenticated;
grant execute on function public.admin_license_members() to authenticated;
grant execute on function public.admin_license_subscriptions() to authenticated;
