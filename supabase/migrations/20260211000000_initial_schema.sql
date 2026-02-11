-- ============================================================
-- Which Days: Initial Schema
-- ============================================================

-- 1. USERS (synced from Clerk webhook)
-- ============================================================
create table public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_clerk_id on public.users (clerk_id);

-- 2. PLANS
-- ============================================================
create type plan_status as enum ('active', 'locked', 'deleted');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_clerk_id text not null references public.users (clerk_id),
  title text not null,
  share_id text unique not null,
  status plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_plans_owner_status on public.plans (owner_clerk_id, status);
create index idx_plans_share_id on public.plans (share_id);

-- 3. PLAN_DATES
-- ============================================================
create type date_status as enum ('viable', 'eliminated', 'locked', 'reopened');

create table public.plan_dates (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  date date not null,
  status date_status not null default 'viable',
  reopen_version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, date)
);

create index idx_plan_dates_plan_id on public.plan_dates (plan_id);

-- 4. PARTICIPANTS
-- ============================================================
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  display_name text not null,
  is_done boolean not null default false,
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, display_name)
);

create index idx_participants_plan_id on public.participants (plan_id);

-- 5. AVAILABILITY
-- ============================================================
create type availability_status as enum ('available', 'unavailable');

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  plan_date_id uuid not null references public.plan_dates (id) on delete cascade,
  status availability_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, plan_date_id)
);

create index idx_availability_participant on public.availability (participant_id);
create index idx_availability_plan_date on public.availability (plan_date_id);

-- 6. EVENT_LOG (immutable audit trail)
-- ============================================================
create table public.event_log (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete set null,
  event_type text not null,
  metadata jsonb default '{}',
  undo_deadline timestamptz,
  created_at timestamptz not null default now()
);

create index idx_event_log_plan_created on public.event_log (plan_id, created_at);

-- ============================================================
-- RLS: Enable on all tables, no policies (service role bypasses)
-- ============================================================
alter table public.users enable row level security;
alter table public.plans enable row level security;
alter table public.plan_dates enable row level security;
alter table public.participants enable row level security;
alter table public.availability enable row level security;
alter table public.event_log enable row level security;
