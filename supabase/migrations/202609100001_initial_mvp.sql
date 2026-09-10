create extension if not exists pgcrypto;

create type public.lead_status as enum (
  'new',
  'qualifying',
  'hot',
  'human_review',
  'opted_out',
  'closed'
);

create type public.consent_status as enum ('unknown', 'opted_in', 'opted_out');
create type public.message_direction as enum ('inbound', 'outbound');
create type public.message_processing_status as enum ('pending', 'processed', 'failed');

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  inbound_phone text not null unique check (inbound_phone ~ '^\+[1-9][0-9]{7,14}$'),
  alert_phone text null check (alert_phone is null or alert_phone ~ '^\+[1-9][0-9]{7,14}$'),
  timezone text not null default 'America/Denver',
  approved_faq jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  first_name text null check (first_name is null or char_length(first_name) between 1 and 100),
  email text null check (email is null or char_length(email) <= 320),
  training_goal text null check (
    training_goal is null or training_goal in (
      'private_recreational', 'career', 'instrument', 'commercial', 'other'
    )
  ),
  experience_level text null check (
    experience_level is null or experience_level in (
      'none', 'discovery_flight', 'student_pilot', 'certificated_pilot', 'other'
    )
  ),
  desired_start_date text null check (desired_start_date is null or char_length(desired_start_date) <= 100),
  availability text null check (availability is null or char_length(availability) <= 500),
  discovery_flight_interest boolean null,
  preferred_contact_method text null check (
    preferred_contact_method is null or preferred_contact_method in ('sms', 'phone', 'email')
  ),
  lead_score smallint not null default 1 check (lead_score between 1 and 10),
  status public.lead_status not null default 'new',
  consent_status public.consent_status not null default 'unknown',
  opted_out_at timestamptz null,
  hot_lead_alerted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, phone)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'human_review', 'closed')),
  summary text null check (summary is null or char_length(summary) <= 1000),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction public.message_direction not null,
  channel text not null default 'sms' check (channel = 'sms'),
  body text not null check (char_length(body) between 1 and 4000),
  provider_message_sid text null,
  processing_status public.message_processing_status not null default 'pending',
  processing_error text null check (processing_error is null or char_length(processing_error) <= 100),
  delivery_status text null check (
    delivery_status is null or delivery_status in ('queued', 'sent', 'delivered', 'undelivered', 'failed')
  ),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index messages_provider_sid_unique
  on public.messages (provider_message_sid)
  where provider_message_sid is not null;

create index messages_lead_created_at_idx on public.messages (lead_id, created_at desc);
create index events_lead_created_at_idx on public.events (lead_id, created_at desc);

create unique index events_one_hot_lead_alert_per_lead
  on public.events (lead_id)
  where event_type = 'hot_lead_alert_sent';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schools_set_updated_at
before update on public.schools
for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create or replace function public.mark_hot_lead_alerted(
  p_lead_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_marked_lead_id uuid;
begin
  update public.leads
  set hot_lead_alerted_at = now()
  where id = p_lead_id
    and hot_lead_alerted_at is null
  returning id into v_marked_lead_id;

  if v_marked_lead_id is null then
    return false;
  end if;

  insert into public.events (lead_id, event_type, metadata)
  values (p_lead_id, 'hot_lead_alert_sent', p_metadata);

  return true;
end;
$$;

revoke all on function public.mark_hot_lead_alerted(uuid, jsonb) from public;
grant execute on function public.mark_hot_lead_alerted(uuid, jsonb) to service_role;

alter table public.schools enable row level security;
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

comment on table public.schools is 'Server-managed school configuration and staff-approved knowledge.';
comment on column public.leads.consent_status is 'Application suppression state; not evidence of legal consent.';
comment on column public.messages.provider_message_sid is 'Messaging-provider idempotency and delivery identifier.';
