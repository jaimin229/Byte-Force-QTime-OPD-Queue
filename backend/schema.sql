-- QTime Production Schema — P09 Live OPD Queue
-- Applied via Supabase Management API
create extension if not exists pgcrypto with schema extensions;

-- ============ ENUMS ============
create type public.token_status as enum ('issued','called','served','skipped','requeued','cancelled');
create type public.token_source as enum ('walk_in','appointment','referral','follow_up','diagnostic');
create type public.event_type as enum ('issued','called','served','skipped','requeued','room_changed','paused','resumed','delay_notice','confirmed');

-- ============ TABLES ============
create table public.clinics (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  hospital text not null default 'District Hospital',
  city text not null default '',
  default_consult_secs int not null default 420,
  is_paused boolean not null default false,
  pause_reason text,
  paused_at timestamptz,
  staff_join_code uuid not null default extensions.gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  room int not null default 1,
  avg_consult_secs int not null default 420,
  consult_samples int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  number int not null,
  status public.token_status not null default 'issued',
  source public.token_source not null default 'walk_in',
  is_priority boolean not null default false,
  priority_reason text,
  display_label text not null default 'Patient',
  claimed_by uuid references auth.users(id) on delete set null,
  claim_code uuid not null default extensions.gen_random_uuid(),
  stepped_out boolean not null default false,
  issued_at timestamptz not null default now(),
  called_at timestamptz,
  served_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (doctor_id, number)
);
create index tokens_queue_idx on public.tokens (doctor_id, status, issued_at);

create table public.queue_events (
  id bigint generated always as identity primary key,
  token_id uuid not null references public.tokens(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  actor text not null check (actor in ('staff','patient','system')),
  event public.event_type not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index queue_events_token_idx on public.queue_events (token_id, occurred_at);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  display_name text not null default 'Staff',
  created_at timestamptz not null default now()
);

-- ============ LIVE QUEUE VIEW (computed position, no write races) ============
create or replace view public.live_queue as
select
  t.id, t.clinic_id, t.doctor_id, t.number, t.status, t.source,
  t.is_priority, t.priority_reason, t.display_label, t.stepped_out,
  t.issued_at, t.called_at, t.served_at, t.updated_at,
  row_number() over (
    partition by t.doctor_id
    order by t.is_priority desc, t.issued_at asc
  ) as position
from public.tokens t
where t.status in ('issued','requeued');

-- ============ STATE MACHINE (L5: first transition wins, invalid ones rejected) ============
create or replace function public.guard_token_transition() returns trigger as $$
declare ok boolean;
begin
  if NEW.status = OLD.status then return NEW; end if;
  select exists (
    select 1 from (values
      ('issued','called'),('issued','cancelled'),
      ('called','served'),('called','skipped'),('called','requeued'),('called','cancelled'),
      ('requeued','called')
    ) as allowed(f,t)
    where allowed.f = OLD.status::text and allowed.t = NEW.status::text
  ) into ok;
  if not ok then
    raise exception 'QT_INVALID_TRANSITION: % -> %', OLD.status, NEW.status using errcode = '23514';
  end if;
  NEW.updated_at := now();
  if NEW.status = 'called' then NEW.called_at := now(); end if;
  if NEW.status = 'served' then NEW.served_at := now(); NEW.closed_at := now(); end if;
  if NEW.status in ('skipped','cancelled') then NEW.closed_at := now(); end if;
  return NEW;
end $$ language plpgsql security definer set search_path = public;

create trigger a_state_guard before update of status on public.tokens
for each row execute function public.guard_token_transition();

-- Patient-only guard (L4): patients may not drive staff transitions
create or replace function public.guard_patient_update() returns trigger as $$
begin
  if coalesce(public.is_staff_of(NEW.clinic_id), false) then return NEW; end if;
  if OLD.claimed_by is null and NEW.claimed_by is not null then
    if NEW.claimed_by <> auth.uid() then
      raise exception 'QT_BAD_CLAIM';
    end if;
    return NEW;
  end if;
  if NEW.status = OLD.status then return NEW; end if;
  if OLD.status = 'called' and NEW.status = 'requeued' then return NEW; end if;
  raise exception 'QT_PATIENT_READ_ONLY';
end $$ language plpgsql security definer set search_path = public;

create trigger b_patient_guard before update on public.tokens
for each row execute function public.guard_patient_update();

-- Token number assignment (advisory-locked, no duplicate numbers)
create or replace function public.assign_token_number() returns trigger as $$
declare next_num int;
begin
  perform pg_advisory_xact_lock(hashtext('tok' || NEW.doctor_id::text));
  select coalesce(max(number),0) + 1 into next_num from public.tokens where doctor_id = NEW.doctor_id;
  NEW.number := next_num;
  return NEW;
end $$ language plpgsql security definer set search_path = public;

create trigger c_assign_number before insert on public.tokens
for each row execute function public.assign_token_number();

-- Consult-time learning (L4-clamped: 60s..3600s window, incremental mean)
create or replace function public.update_consult_stats() returns trigger as $$
declare dur int;
begin
  if NEW.status = 'served' and OLD.status = 'called' and NEW.called_at is not null then
    dur := greatest(60, least(3600, extract(epoch from (now() - NEW.called_at))::int));
    update public.doctors d set
      avg_consult_secs = (d.avg_consult_secs * d.consult_samples + dur) / (d.consult_samples + 1),
      consult_samples = d.consult_samples + 1
    where d.id = NEW.doctor_id;
  end if;
  return NEW;
end $$ language plpgsql security definer set search_path = public;

create trigger d_consult_stats after update of status on public.tokens
for each row execute function public.update_consult_stats();

-- touch updated_at
create or replace function public.touch_updated_at() returns trigger as $$
begin NEW.updated_at := now(); return NEW; end $$ language plpgsql;
create trigger e_touch_updated before update on public.tokens
for each row execute function public.touch_updated_at();

-- ============ ETA ENGINE (L2: Bayesian shrinkage to clinic prior; honest ranges) ============
create or replace function public.eta_for_token(p_token_id uuid)
returns table (eta_low_secs int, eta_high_secs int, ahead int, paused boolean)
language sql stable security definer set search_path = public as $$
  with q as (
    select * from public.live_queue where id = p_token_id
  ),
  info as (
    select
      d.clinic_id,
      case when d.consult_samples < 5 then
        round((d.avg_consult_secs * d.consult_samples + (select default_consult_secs from public.clinics where id = d.clinic_id) * (5 - d.consult_samples)) / 5.0)::int
      else d.avg_consult_secs end as mu,
      (select is_paused from public.clinics where id = d.clinic_id) as paused
    from public.doctors d join q on q.doctor_id = d.id
  )
  select
    greatest(0, round((q.position - 1) * info.mu * 0.8)::int),
    round((q.position - 1) * info.mu * 1.35)::int + 300,
    q.position - 1,
    coalesce(info.paused, false)
  from q, info
$$;

-- Staff join (validated by clinic join code; no open staff self-registration)
create or replace function public.join_clinic(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.clinics;
begin
  if auth.uid() is null then raise exception 'QT_NOT_SIGNED_IN'; end if;
  select * into c from public.clinics where staff_join_code::text = p_code;
  if c.id is null then raise exception 'QT_BAD_STAFF_CODE'; end if;
  insert into public.staff_profiles (user_id, clinic_id)
  values (auth.uid(), c.id)
  on conflict (user_id) do update set clinic_id = excluded.clinic_id;
  return c.id;
end $$;

create or replace function public.is_staff_of(p_clinic uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = auth.uid() and sp.clinic_id = p_clinic
  );
$$;

-- ============ RLS (L13: patients read own, staff write clinic, kiosk reads view) ============
alter table public.clinics enable row level security;
alter table public.doctors enable row level security;
alter table public.tokens enable row level security;
alter table public.queue_events enable row level security;
alter table public.staff_profiles enable row level security;

create policy clinics_read on public.clinics for select using (true);
create policy clinics_staff_update on public.clinics for update using (public.is_staff_of(id));

create policy doctors_read on public.doctors for select using (true);
create policy doctors_staff_all on public.doctors for all using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));

create policy tokens_staff_all on public.tokens for all using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy tokens_claim_read on public.tokens for select using (claimed_by = auth.uid());
create policy tokens_patient_update on public.tokens for update
  using ((claimed_by is null and auth.uid() is not null) or claimed_by = auth.uid())
  with check ((claimed_by is null and auth.uid() is not null) or claimed_by = auth.uid());

create policy events_staff_all on public.queue_events for all using (public.is_staff_of(clinic_id)) with check (public.is_staff_of(clinic_id));
create policy events_patient_insert on public.queue_events for insert
  with check (actor = 'patient' and exists (select 1 from public.tokens t where t.id = token_id and t.claimed_by = auth.uid()));

create policy staff_self_read on public.staff_profiles for select using (user_id = auth.uid());

grant select on public.live_queue to anon, authenticated;
grant execute on function public.eta_for_token(uuid) to authenticated, anon;
grant execute on function public.join_clinic(text) to authenticated, anon;

-- ============ REALTIME (L12: one channel feeds all clients) ============
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.tokens;
alter publication supabase_realtime add table public.clinics;
alter publication supabase_realtime add table public.doctors;

-- ============ SEED (real clinic config; queue starts empty) ============
insert into public.clinics (name, hospital, city) values ('General OPD', 'District HQ Hospital', '');
insert into public.doctors (clinic_id, name, room)
  select id, 'Dr. Aslam', 3 from public.clinics limit 1;
insert into public.doctors (clinic_id, name, room)
  select id, 'Dr. Rania', 4 from public.clinics limit 1;
