-- ============================================================
-- BiMSolutions Database Schema
-- Run this once in Supabase → SQL Editor → New Query
-- ============================================================

-- ============ PROFILES ============
-- Extended user profile (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  company text,
  role text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ============ TRIAL REQUESTS ============
create table if not exists public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_size text,
  project_type text,
  expectations text,
  status text default 'pending' check (status in ('pending','approved','rejected','expired')),
  submitted_at timestamptz default now(),
  approved_at timestamptz,
  expires_at timestamptz
);

create unique index if not exists trial_requests_user_unique on public.trial_requests(user_id);

alter table public.trial_requests enable row level security;

drop policy if exists "Users view own trial" on public.trial_requests;
create policy "Users view own trial"
  on public.trial_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own trial" on public.trial_requests;
create policy "Users insert own trial"
  on public.trial_requests for insert
  with check (auth.uid() = user_id);


-- ============ SUBSCRIPTIONS (for Revit plug-in license check) ============
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('trial','early_access','pro','expired')),
  started_at timestamptz default now(),
  expires_at timestamptz,
  is_active boolean default true
);

create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "Users view own subscription" on public.subscriptions;
create policy "Users view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);


-- ============ RPC: check_license ============
-- Revit plug-in calls this to verify the user can use the extension
create or replace function public.check_license()
returns json
language plpgsql
security definer
as $$
declare
  result json;
  sub record;
begin
  select * into sub
  from public.subscriptions
  where user_id = auth.uid()
    and is_active = true
    and (expires_at is null or expires_at > now())
  order by started_at desc
  limit 1;

  if sub is null then
    result := json_build_object(
      'valid', false,
      'reason', 'no_active_subscription'
    );
  else
    result := json_build_object(
      'valid', true,
      'plan', sub.plan,
      'expires_at', sub.expires_at
    );
  end if;

  return result;
end;
$$;


-- ============ NOTE ON PROFILE CREATION ============
-- We do NOT auto-create profiles from auth.users, because:
-- (1) Email/password signup creates the profile explicitly via the web form
--     (with name, company, role fields — required for our records)
-- (2) OAuth signup (Google/Microsoft) MUST BE BLOCKED for users who haven't
--     signed up first. The web app checks for an existing profile after
--     OAuth callback and signs the user out if none exists.
--
-- This enforces the business rule: "Users must sign up first — OAuth is
-- for login convenience only."


