-- Run once in the Supabase SQL Editor before sending the postponement notice.
-- This prevents a registrant from receiving the same notice more than once.
alter table public.seminar_registrations
  add column if not exists attendance_status text not null default 'registered'
  check (attendance_status in ('registered', 'confirmed', 'attended', 'cancelled'));

alter table public.seminar_registrations
  add column if not exists postponement_sent_at timestamptz;

-- Keep the admin list aligned with the public announcement.
update public.seminar_registrations
  set attendance_status = 'cancelled'
  where event_code = 'revit-basics-2026-10-28'
    and coalesce(attendance_status, 'registered') <> 'cancelled';
