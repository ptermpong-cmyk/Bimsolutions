-- Run once in the Supabase SQL Editor before publishing the registration form.
-- The public site may insert registrations; only Dashboard administrators can read them.
create table if not exists public.seminar_registrations (
  id uuid primary key default gen_random_uuid(),
  event_code text not null check (event_code = 'revit-basics-2026-10-28'),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null check (email = lower(trim(email)) and char_length(email) <= 254 and position('@' in email) > 1),
  phone text not null check (char_length(trim(phone)) between 6 and 30),
  discipline text not null check (discipline in ('architecture', 'structure', 'mechanical', 'electrical', 'plumbing', 'other')),
  created_at timestamptz not null default now(),
  unique (event_code, email)
);

alter table public.seminar_registrations enable row level security;
revoke all on public.seminar_registrations from public, anon, authenticated;
grant insert on public.seminar_registrations to anon, authenticated;

drop policy if exists "Anyone can register for Revit basics" on public.seminar_registrations;
create policy "Anyone can register for Revit basics"
  on public.seminar_registrations for insert
  to anon, authenticated
  with check (event_code = 'revit-basics-2026-10-28');
