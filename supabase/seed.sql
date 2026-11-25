-- NCC Two-Day Event Management System - Sample Events & Schedule Seed Data
-- Run this AFTER supabase/schema.sql in the Supabase SQL Editor.
-- All details below are clearly marked sample placeholders; edit them in Admin -> Events.

insert into public.events (
  slug, title, day, event_date, event_time, venue, event_type, seats, min_team_size, max_team_size, fee,
  criteria, description, rules, deadline, registration_open, is_sample, is_active
)
values
  (
    'firing',
    'Firing',
    1,
    'Day 1 (Sample Date TBA)',
    '09:30 AM - 01:00 PM',
    'College NCC Range / Approved Firing Bay (Sample Venue)',
    'Team',
    20,
    2,
    5,
    400,
    'Open to enrolled NCC cadets with valid unit ID card and instructor/ANO safety clearance.',
    '[Sample Event] Team firing drill and range discipline competition conducted strictly under authorized instructors and institutional range safety approvals.',
    '1. Mandatory range safety briefing 30 minutes prior to slot. 2. Full NCC uniform and college ID required. 3. Only trainer-approved cadets may enter the firing bay. 4. Judge and instructor decisions are final.',
    '2 days before Day 1 (Sample)',
    true,
    true,
    true
  ),
  (
    'drill',
    'Drill',
    2,
    'Day 2 (Sample Date TBA)',
    '09:00 AM - 12:30 PM',
    'Main College Parade Ground (Sample Venue)',
    'Team',
    16,
    4,
    8,
    400,
    'Teams of 4 to 8 cadets from the same college / NCC unit. Full ceremonial NCC uniform required.',
    '[Sample Event] Inter-unit squad drill competition evaluating turnout, command clarity, synchronization, and parade discipline.',
    '1. Squad must report 30 minutes before inspection. 2. Standard NCC Drill Manual commands apply. 3. Polished boots, beret, and unit badges are mandatory. 4. Duplicate team entries for the same event are prohibited.',
    '2 days before Day 1 (Sample)',
    true,
    true,
    true
  )
on conflict (slug) do nothing;

insert into public.schedule_items (day, time_label, title, subtitle, sort_order)
values
  (1, '08:00 AM', 'Reporting & QR Check-In', 'Team leader verification and kit check at registration desk', 1),
  (1, '09:00 AM', 'Inaugural Parade & Safety Briefing', 'Opening address by ANO & Range Officer', 2),
  (1, '09:30 AM', 'Firing Event (Sample Schedule)', 'Range safety drill and team rounds by slot', 3),
  (1, '04:30 PM', 'Day 1 Debriefing', 'Attendance confirmation and Day 2 reporting instructions', 4),
  (2, '08:15 AM', 'Parade Ground Reporting', 'Day 2 team roll call and uniform inspection', 1),
  (2, '09:00 AM', 'Drill Competition (Sample Schedule)', 'Squad inspection and march-past evaluation', 2),
  (2, '02:30 PM', 'Verification & Results', 'Score compilation and certificate eligibility check', 3),
  (2, '04:00 PM', 'Closing & Recognition', 'Results announcement and valedictory address', 4);

insert into public.announcements (title, body, published)
values
  (
    'Sample Events Open: Firing (₹400) & Drill (₹400)',
    'Sample event entries for Firing and Drill are now live. Team leaders can register their teams online and track registration, payment, and certificate status in their dashboard.',
    true
  ),
  (
    'Demo Payment Mode Notice',
    'Online payment gateway integration is in Demo Mode until official college gateway credentials are configured. No real money is transferred in Demo Mode.',
    true
  );
