-- NCC Two-Day Event Management System - Complete Relational Schema & RLS
-- Run this script in Supabase SQL Editor (Project -> SQL Editor -> New Query).

create extension if not exists pgcrypto;

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  reg_no text not null default '',
  dept text not null default '',
  year text not null default '1',
  phone text not null default '',
  college text not null default '',
  ncc_unit text not null default '',
  role text not null default 'participant' check (role in ('participant', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. EVENTS
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  day integer not null default 1 check (day in (1, 2)),
  event_date text not null default 'Sample Date TBA',
  event_time text not null default '09:00 AM',
  venue text not null default 'Venue TBA',
  event_type text not null default 'Team' check (event_type in ('Individual', 'Team')),
  seats integer not null check (seats >= 0),
  min_team_size integer not null default 1 check (min_team_size >= 1),
  max_team_size integer not null default 8 check (max_team_size >= min_team_size),
  fee integer not null default 400 check (fee >= 0),
  criteria text not null default '',
  description text not null default '',
  rules text not null default '',
  deadline text not null default '',
  registration_open boolean not null default true,
  is_sample boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TEAMS
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  team_name text not null,
  college_name text not null,
  ncc_unit text not null default '',
  leader_name text not null,
  leader_reg_no text not null default '',
  leader_phone text not null,
  leader_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teams_owner_id on public.teams(owner_id);

-- 4. TEAM MEMBERS
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_name text not null,
  reg_no text not null default '',
  dept text not null default '',
  year text not null default '',
  phone text not null default '',
  role_in_team text not null default 'Member' check (role_in_team in ('Leader', 'Member')),
  created_at timestamptz not null default now()
);

create index if not exists idx_team_members_team_id on public.team_members(team_id);

-- 5. REGISTRATIONS
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_code text unique not null,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_key text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  qr_token text unique not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id),
  unique (event_id, team_key)
);

create index if not exists idx_registrations_event_id on public.registrations(event_id);
create index if not exists idx_registrations_user_id on public.registrations(user_id);
create index if not exists idx_registrations_team_id on public.registrations(team_id);
create index if not exists idx_registrations_qr_token on public.registrations(qr_token);
create index if not exists idx_registrations_code on public.registrations(registration_code);

-- 6. PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid unique not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount >= 0),
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_mode text not null default 'demo' check (payment_mode in ('demo', 'gateway', 'offline')),
  payment_reference text not null default '',
  gateway_order_id text not null default '',
  gateway_payment_id text not null default '',
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);

-- 7. ATTENDANCE
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid unique not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  present boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id) on delete set null,
  check_in_method text not null default 'manual' check (check_in_method in ('manual', 'qr')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_event_id on public.attendance(event_id);

-- 8. CERTIFICATES (per team member / participant)
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text unique not null,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  participant_name text not null,
  team_name text not null,
  college_name text not null,
  event_title text not null,
  event_date text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'issued', 'rejected', 'revoked')),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz,
  issued_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  rejection_reason text not null default '',
  created_at timestamptz not null default now(),
  unique (registration_id, team_member_id)
);

create index if not exists idx_certificates_user_id on public.certificates(user_id);
create index if not exists idx_certificates_status on public.certificates(status);

-- 9. ANNOUNCEMENTS & 10. SCHEDULE ITEMS
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  day integer not null check (day in (1, 2)),
  time_label text not null,
  title text not null,
  subtitle text not null default '',
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

-- TRIGGERS & HELPERS
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at before update on public.events for each row execute function public.set_updated_at();

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at before update on public.teams for each row execute function public.set_updated_at();

drop trigger if exists trg_regs_updated_at on public.registrations;
create trigger trg_regs_updated_at before update on public.registrations for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at before update on public.attendance for each row execute function public.set_updated_at();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.role := 'participant';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      if not public.is_admin(auth.uid()) then
        raise exception 'Only an authorized administrator can change roles.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, email, name, reg_no, dept, year, phone, college, ncc_unit, role
  )
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(nullif(trim(meta->>'name'), ''), split_part(coalesce(new.email, 'Cadet'), '@', 1)),
    coalesce(trim(meta->>'reg_no'), ''),
    coalesce(trim(meta->>'dept'), ''),
    coalesce(nullif(trim(meta->>'year'), ''), '1'),
    coalesce(trim(meta->>'phone'), ''),
    coalesce(trim(meta->>'college'), ''),
    coalesce(trim(meta->>'ncc_unit'), ''),
    'participant'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(nullif(excluded.name, ''), public.profiles.name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- PUBLIC SAFE SEAT COUNTS
create or replace function public.get_event_seat_counts()
returns table (event_id uuid, taken bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.event_id, count(*)::bigint as taken
  from public.registrations r
  where r.status not in ('cancelled', 'rejected')
  group by r.event_id;
$$;

-- ATOMIC SERVER-ENFORCED TEAM REGISTRATION
create or replace function public.register_team_for_event(
  p_event_id uuid,
  p_team_name text,
  p_college_name text,
  p_ncc_unit text,
  p_leader_name text,
  p_leader_reg_no text,
  p_leader_phone text,
  p_leader_email text,
  p_members jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_taken integer;
  v_team_name text := trim(coalesce(p_team_name, ''));
  v_college text := trim(coalesce(p_college_name, ''));
  v_unit text := trim(coalesce(p_ncc_unit, ''));
  v_leader_name text := trim(coalesce(p_leader_name, ''));
  v_leader_reg text := trim(coalesce(p_leader_reg_no, ''));
  v_leader_phone text := trim(coalesce(p_leader_phone, ''));
  v_leader_email text := lower(trim(coalesce(p_leader_email, '')));
  v_team_key text;
  v_members_arr jsonb := case when jsonb_typeof(p_members) = 'array' then p_members else '[]'::jsonb end;
  v_total_size integer;
  v_team public.teams%rowtype;
  v_reg public.registrations%rowtype;
  v_code text;
  v_token text;
  v_item jsonb;
  v_m_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'login', true, 'msg', 'Please log in first to register a team.');
  end if;

  if v_team_name = '' or v_college = '' or v_leader_name = '' or v_leader_phone = '' or v_leader_email = '' then
    return jsonb_build_object('ok', false, 'msg', 'Team name, college, and team leader contact details are required.');
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found or not v_event.is_active then
    return jsonb_build_object('ok', false, 'msg', 'Selected event was not found.');
  end if;

  if not v_event.registration_open then
    return jsonb_build_object('ok', false, 'msg', 'Registration for this event is currently closed.');
  end if;

  v_team_key := lower(v_team_name) || '::' || lower(v_college);

  if exists (
    select 1 from public.registrations
    where event_id = p_event_id and user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'msg', 'Your account has already registered a team for this event.');
  end if;

  if exists (
    select 1 from public.registrations
    where event_id = p_event_id and team_key = v_team_key and status not in ('cancelled', 'rejected')
  ) then
    return jsonb_build_object('ok', false, 'msg', 'A team with this name from your college is already registered for this event.');
  end if;

  -- Leader counts as 1 member plus additional valid members
  v_total_size := 1 + (
    select count(*)::integer
    from jsonb_array_elements(v_members_arr) as m
    where trim(coalesce(m->>'name', '')) <> ''
  );

  if v_total_size < v_event.min_team_size or v_total_size > v_event.max_team_size then
    return jsonb_build_object(
      'ok', false,
      'msg', 'Team size (' || v_total_size || ') must be between ' || v_event.min_team_size || ' and ' || v_event.max_team_size || ' members (including leader).'
    );
  end if;

  select count(*)::integer into v_taken
  from public.registrations
  where event_id = p_event_id and status not in ('cancelled', 'rejected');

  if v_taken >= v_event.seats then
    return jsonb_build_object('ok', false, 'msg', 'All team slots for this event are currently filled.');
  end if;

  insert into public.teams (
    owner_id, team_name, college_name, ncc_unit, leader_name, leader_reg_no, leader_phone, leader_email
  )
  values (
    v_uid, v_team_name, v_college, v_unit, v_leader_name, v_leader_reg, v_leader_phone, v_leader_email
  )
  returning * into v_team;

  -- Store team leader as first team_members row for unified attendance & certificates
  insert into public.team_members (team_id, member_name, reg_no, phone, role_in_team)
  values (v_team.id, v_leader_name, v_leader_reg, v_leader_phone, 'Leader');

  for v_item in select * from jsonb_array_elements(v_members_arr)
  loop
    v_m_name := trim(coalesce(v_item->>'name', ''));
    if v_m_name <> '' then
      insert into public.team_members (team_id, member_name, reg_no, dept, year, phone, role_in_team)
      values (
        v_team.id,
        v_m_name,
        trim(coalesce(v_item->>'regNo', '')),
        trim(coalesce(v_item->>'dept', '')),
        trim(coalesce(v_item->>'year', '')),
        trim(coalesce(v_item->>'phone', '')),
        'Member'
      );
    end if;
  end loop;

  v_code := 'NCC-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.registrations (
    registration_code, event_id, team_id, user_id, team_key, status, qr_token
  )
  values (
    v_code, p_event_id, v_team.id, v_uid, v_team_key, 'pending', v_token
  )
  returning * into v_reg;

  insert into public.payments (
    registration_id, event_id, user_id, amount, currency, status, payment_mode
  )
  values (
    v_reg.id, p_event_id, v_uid, v_event.fee, 'INR', 'pending', 'demo'
  );

  -- Update participant profile defaults if blank
  update public.profiles
  set college = case when college = '' then v_college else college end,
      ncc_unit = case when ncc_unit = '' then v_unit else ncc_unit end
  where id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'msg', 'Team registered successfully! Proceed to your dashboard to review payment and registration status.',
    'registration_id', v_reg.id,
    'registration_code', v_reg.registration_code,
    'team_id', v_team.id
  );
end;
$$;

-- DEMO PAYMENT SUBMISSION (participant cannot mark payment 'paid' themselves!)
create or replace function public.submit_demo_payment(p_registration_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pay public.payments%rowtype;
  v_ref text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'msg', 'Please log in first.');
  end if;

  select * into v_pay
  from public.payments
  where registration_id = p_registration_id and user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'Payment record not found.');
  end if;

  if v_pay.status = 'paid' then
    return jsonb_build_object('ok', false, 'msg', 'This payment has already been verified as Paid.');
  end if;

  if v_pay.payment_reference <> '' and v_pay.status = 'pending' then
    return jsonb_build_object(
      'ok', true,
      'msg', 'Demo payment reference already submitted (' || v_pay.payment_reference || '). Awaiting admin verification.',
      'payment_reference', v_pay.payment_reference
    );
  end if;

  v_ref := 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  update public.payments
  set payment_reference = v_ref,
      payment_mode = 'demo',
      status = 'pending'
  where id = v_pay.id;

  return jsonb_build_object(
    'ok', true,
    'msg', 'Demo payment reference generated (' || v_ref || '). No real money was transferred. Status remains Pending until verified by an administrator.',
    'payment_reference', v_ref
  );
end;
$$;

-- ADMIN PAYMENT VERIFICATION
create or replace function public.verify_payment(
  p_payment_id uuid,
  p_status text,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pay public.payments%rowtype;
begin
  if v_uid is null or not public.is_admin(v_uid) then
    return jsonb_build_object('ok', false, 'msg', 'Unauthorized: Administrator privileges required.');
  end if;

  if p_status not in ('pending', 'paid', 'failed', 'refunded') then
    return jsonb_build_object('ok', false, 'msg', 'Invalid payment status.');
  end if;

  update public.payments
  set status = p_status,
      payment_reference = coalesce(nullif(trim(p_reference), ''), payment_reference),
      verified_by = case when p_status in ('paid', 'refunded') then v_uid else verified_by end,
      verified_at = case when p_status in ('paid', 'refunded') then now() else verified_at end
  where id = p_payment_id
  returning * into v_pay;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'Payment record not found.');
  end if;

  return jsonb_build_object('ok', true, 'msg', 'Payment status updated to ' || p_status || '.');
end;
$$;

-- ADMIN REGISTRATION APPROVAL / REJECTION
create or replace function public.update_registration_status(
  p_registration_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin(v_uid) then
    return jsonb_build_object('ok', false, 'msg', 'Unauthorized: Administrator privileges required.');
  end if;

  if p_status not in ('pending', 'approved', 'rejected', 'cancelled') then
    return jsonb_build_object('ok', false, 'msg', 'Invalid registration status.');
  end if;

  update public.registrations
  set status = p_status
  where id = p_registration_id;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'Registration not found.');
  end if;

  return jsonb_build_object('ok', true, 'msg', 'Registration marked as ' || p_status || '.');
end;
$$;

-- ATOMIC QR / CODE CHECK-IN (prevents duplicate check-ins)
create or replace function public.check_in_registration(
  p_qr_or_code text,
  p_method text default 'qr'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_input text := trim(coalesce(p_qr_or_code, ''));
  v_reg record;
  v_att public.attendance%rowtype;
  v_method text := case when p_method in ('manual', 'qr') then p_method else 'qr' end;
begin
  if v_uid is null or not public.is_admin(v_uid) then
    return jsonb_build_object('ok', false, 'msg', 'Unauthorized: Admin access required.');
  end if;

  if v_input = '' then
    return jsonb_build_object('ok', false, 'msg', 'Enter or scan a valid Registration ID or QR pass.');
  end if;

  select
    r.id as reg_id,
    r.registration_code,
    r.event_id,
    r.team_id,
    r.status,
    t.team_name,
    t.college_name,
    e.title as event_title
  into v_reg
  from public.registrations r
  join public.teams t on t.id = r.team_id
  join public.events e on e.id = r.event_id
  where r.qr_token = v_input or upper(r.registration_code) = upper(v_input)
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'Invalid QR pass or registration code.');
  end if;

  if v_reg.status in ('cancelled', 'rejected') then
    return jsonb_build_object('ok', false, 'msg', 'This team registration is ' || v_reg.status || ' and cannot check in.');
  end if;

  select * into v_att
  from public.attendance
  where registration_id = v_reg.reg_id
  for update;

  if found and v_att.present then
    return jsonb_build_object(
      'ok', false,
      'duplicate', true,
      'msg', 'Duplicate check-in blocked: ' || v_reg.team_name || ' is already checked in for ' || v_reg.event_title || '.'
    );
  end if;

  insert into public.attendance (
    registration_id, event_id, team_id, present, checked_in_at, checked_in_by, check_in_method
  )
  values (
    v_reg.reg_id, v_reg.event_id, v_reg.team_id, true, now(), v_uid, v_method
  )
  on conflict (registration_id) do update set
    present = true,
    checked_in_at = now(),
    checked_in_by = v_uid,
    check_in_method = v_method;

  return jsonb_build_object(
    'ok', true,
    'msg', 'Check-in confirmed for ' || v_reg.team_name || ' (' || v_reg.event_title || ').'
  );
end;
$$;

-- PARTICIPANT OR ADMIN REQUEST CERTIFICATE (for attended teams)
create or replace function public.request_certificate(
  p_registration_id uuid,
  p_team_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row record;
  v_cert_no text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'msg', 'Please log in first.');
  end if;

  select
    r.id as reg_id,
    r.event_id,
    r.team_id,
    r.user_id,
    r.status as reg_status,
    t.team_name,
    t.college_name,
    e.title as event_title,
    e.event_date,
    m.id as member_id,
    m.member_name,
    coalesce(a.present, false) as present
  into v_row
  from public.registrations r
  join public.teams t on t.id = r.team_id
  join public.events e on e.id = r.event_id
  join public.team_members m on m.id = p_team_member_id and m.team_id = r.team_id
  left join public.attendance a on a.registration_id = r.id
  where r.id = p_registration_id;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'Team member registration not found.');
  end if;

  if v_row.user_id <> v_uid and not public.is_admin(v_uid) then
    return jsonb_build_object('ok', false, 'msg', 'Unauthorized.');
  end if;

  if not v_row.present then
    return jsonb_build_object('ok', false, 'msg', 'Attendance must be marked present before requesting a certificate.');
  end if;

  if exists (
    select 1 from public.certificates
    where registration_id = p_registration_id and team_member_id = p_team_member_id
  ) then
    return jsonb_build_object('ok', false, 'msg', 'A certificate entry already exists for this participant.');
  end if;

  v_cert_no := 'CERT-NCC-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.certificates (
    certificate_number, registration_id, event_id, team_id, user_id, team_member_id,
    participant_name, team_name, college_name, event_title, event_date, status
  )
  values (
    v_cert_no, v_row.reg_id, v_row.event_id, v_row.team_id, v_row.user_id, v_row.member_id,
    v_row.member_name, v_row.team_name, v_row.college_name, v_row.event_title, v_row.event_date, 'pending'
  );

  return jsonb_build_object('ok', true, 'msg', 'Certificate request submitted for admin approval.');
end;
$$;

-- ADMIN CERTIFICATE WORKFLOW (approve / reject / issue / revoke)
create or replace function public.manage_certificate(
  p_registration_id uuid,
  p_team_member_id uuid,
  p_action text,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row record;
  v_cert public.certificates%rowtype;
  v_cert_no text;
begin
  if v_uid is null or not public.is_admin(v_uid) then
    return jsonb_build_object('ok', false, 'msg', 'Unauthorized: Admin access required.');
  end if;

  if p_action not in ('approve', 'reject', 'issue', 'revoke') then
    return jsonb_build_object('ok', false, 'msg', 'Invalid certificate action.');
  end if;

  select
    r.id as reg_id,
    r.event_id,
    r.team_id,
    r.user_id,
    t.team_name,
    t.college_name,
    e.title as event_title,
    e.event_date,
    m.id as member_id,
    m.member_name,
    coalesce(a.present, false) as present
  into v_row
  from public.registrations r
  join public.teams t on t.id = r.team_id
  join public.events e on e.id = r.event_id
  join public.team_members m on m.id = p_team_member_id and m.team_id = r.team_id
  left join public.attendance a on a.registration_id = r.id
  where r.id = p_registration_id;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'Registration or team member not found.');
  end if;

  if p_action in ('approve', 'issue') and not v_row.present then
    return jsonb_build_object('ok', false, 'msg', 'Mark team attendance present before approving or issuing certificates.');
  end if;

  v_cert_no := 'CERT-NCC-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.certificates (
    certificate_number, registration_id, event_id, team_id, user_id, team_member_id,
    participant_name, team_name, college_name, event_title, event_date, status
  )
  values (
    v_cert_no, v_row.reg_id, v_row.event_id, v_row.team_id, v_row.user_id, v_row.member_id,
    v_row.member_name, v_row.team_name, v_row.college_name, v_row.event_title, v_row.event_date, 'pending'
  )
  on conflict (registration_id, team_member_id) do nothing;

  if p_action = 'approve' then
    update public.certificates
    set status = 'approved',
        approved_at = now(),
        approved_by = v_uid,
        rejection_reason = ''
    where registration_id = p_registration_id and team_member_id = p_team_member_id
    returning * into v_cert;
  elsif p_action = 'issue' then
    update public.certificates
    set status = 'issued',
        approved_at = coalesce(approved_at, now()),
        approved_by = coalesce(approved_by, v_uid),
        issued_at = now(),
        issued_by = v_uid,
        revoked_at = null,
        rejection_reason = ''
    where registration_id = p_registration_id and team_member_id = p_team_member_id
    returning * into v_cert;
  elsif p_action = 'reject' then
    update public.certificates
    set status = 'rejected',
        rejection_reason = trim(coalesce(p_reason, ''))
    where registration_id = p_registration_id and team_member_id = p_team_member_id
    returning * into v_cert;
  elsif p_action = 'revoke' then
    update public.certificates
    set status = 'revoked',
        revoked_at = now()
    where registration_id = p_registration_id and team_member_id = p_team_member_id
    returning * into v_cert;
  end if;

  return jsonb_build_object(
    'ok', true,
    'msg', 'Certificate ' || v_cert.status || ' (' || v_cert.certificate_number || ').',
    'certificate', to_jsonb(v_cert)
  );
end;
$$;

-- ADMIN-ONLY USER ROLE ASSIGNMENT
create or replace function public.set_user_role(
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_uid is null or not public.is_admin(v_uid) then
    return jsonb_build_object('ok', false, 'msg', 'Unauthorized: Admin access required.');
  end if;

  if p_role not in ('participant', 'admin') then
    return jsonb_build_object('ok', false, 'msg', 'Invalid role.');
  end if;

  update public.profiles
  set role = p_role
  where email = v_email;

  if not found then
    return jsonb_build_object('ok', false, 'msg', 'No user profile found for email: ' || v_email);
  end if;

  return jsonb_build_object('ok', true, 'msg', 'Updated role for ' || v_email || ' to ' || p_role || '.');
end;
$$;

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.certificates enable row level security;
alter table public.announcements enable row level security;
alter table public.schedule_items enable row level security;

-- Profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id and role = 'participant');

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

-- Events
drop policy if exists "events_select_public" on public.events;
create policy "events_select_public" on public.events
  for select using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write" on public.events
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Teams
drop policy if exists "teams_select_own_or_admin" on public.teams;
create policy "teams_select_own_or_admin" on public.teams
  for select using (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "teams_admin_manage" on public.teams;
create policy "teams_admin_manage" on public.teams
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Team members
drop policy if exists "team_members_select_own_or_admin" on public.team_members;
create policy "team_members_select_own_or_admin" on public.team_members
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and (t.owner_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "team_members_admin_manage" on public.team_members;
create policy "team_members_admin_manage" on public.team_members
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Registrations
drop policy if exists "registrations_select_own_or_admin" on public.registrations;
create policy "registrations_select_own_or_admin" on public.registrations
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "registrations_admin_manage" on public.registrations;
create policy "registrations_admin_manage" on public.registrations
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Payments (participants can ONLY read their own; never update/verify!)
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "payments_admin_manage" on public.payments;
create policy "payments_admin_manage" on public.payments
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Attendance
drop policy if exists "attendance_select_own_or_admin" on public.attendance;
create policy "attendance_select_own_or_admin" on public.attendance
  for select using (
    public.is_admin(auth.uid()) or exists (
      select 1 from public.registrations r
      where r.id = registration_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "attendance_admin_manage" on public.attendance;
create policy "attendance_admin_manage" on public.attendance
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Certificates
drop policy if exists "certificates_select_own_or_admin" on public.certificates;
create policy "certificates_select_own_or_admin" on public.certificates
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "certificates_admin_manage" on public.certificates;
create policy "certificates_admin_manage" on public.certificates
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Announcements & Schedule
drop policy if exists "announcements_select_public" on public.announcements;
create policy "announcements_select_public" on public.announcements
  for select using (published = true or public.is_admin(auth.uid()));

drop policy if exists "announcements_admin_manage" on public.announcements;
create policy "announcements_admin_manage" on public.announcements
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "schedule_select_public" on public.schedule_items;
create policy "schedule_select_public" on public.schedule_items
  for select using (true);

drop policy if exists "schedule_admin_manage" on public.schedule_items;
create policy "schedule_admin_manage" on public.schedule_items
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- RPC PERMISSIONS
revoke all on function public.get_event_seat_counts() from public;
grant execute on function public.get_event_seat_counts() to anon, authenticated;

revoke all on function public.register_team_for_event(uuid, text, text, text, text, text, text, text, jsonb) from public;
grant execute on function public.register_team_for_event(uuid, text, text, text, text, text, text, text, jsonb) to authenticated;

revoke all on function public.submit_demo_payment(uuid) from public;
grant execute on function public.submit_demo_payment(uuid) to authenticated;

revoke all on function public.verify_payment(uuid, text, text) from public;
grant execute on function public.verify_payment(uuid, text, text) to authenticated;

revoke all on function public.update_registration_status(uuid, text) from public;
grant execute on function public.update_registration_status(uuid, text) to authenticated;

revoke all on function public.check_in_registration(text, text) from public;
grant execute on function public.check_in_registration(text, text) to authenticated;

revoke all on function public.request_certificate(uuid, uuid) from public;
grant execute on function public.request_certificate(uuid, uuid) to authenticated;

revoke all on function public.manage_certificate(uuid, uuid, text, text) from public;
grant execute on function public.manage_certificate(uuid, uuid, text, text) to authenticated;

revoke all on function public.set_user_role(text, text) from public;
grant execute on function public.set_user_role(text, text) to authenticated;
