-- PehlaStore database schema (Supabase / Postgres)
-- Run in the Supabase SQL editor on a new project.
-- Access model: Row Level Security is ON with no public policies.
-- Only the server (service role key) reads and writes; the browser never talks to the database directly.

-- Published creator stores
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                    -- public link: /s/<slug>
  edit_token  text not null,                           -- private token the creator's browser uses to update the store
  content     jsonb not null,                          -- profile, products, launch kit, sections, design
  input       jsonb not null default '{}'::jsonb,      -- handle, language, follower tier, description
  theme       text not null default 'sunrise',
  language    text not null default 'en',
  views       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Visits, product taps and link clicks on public stores
create table if not exists public.store_events (
  id           bigserial primary key,
  store_id     uuid not null references public.stores(id) on delete cascade,
  kind         text not null,                          -- view | interest | cta
  product_key  text,                                   -- product id, or 'link'
  created_at   timestamptz not null default now()
);
create index if not exists store_events_store_kind_idx on public.store_events (store_id, kind);

-- Product funnel and AI events (anonymous session ids, no personal data)
create table if not exists public.app_events (
  id          bigserial primary key,
  session_id  text not null,
  event       text not null,                           -- home_viewed, generate_started, generated, published, ...
  meta        jsonb not null default '{}'::jsonb,      -- e.g. model, ms, reason, language
  created_at  timestamptz not null default now()
);
create index if not exists app_events_event_idx on public.app_events (event, created_at);

-- Security: RLS on, no public policies
alter table public.stores       enable row level security;
alter table public.store_events enable row level security;
alter table public.app_events   enable row level security;

-- Server access (service role)
grant usage on schema public to service_role;
grant all on public.stores, public.store_events, public.app_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Admin accounts live in Supabase Auth (auth.users); admins have app_metadata.role = 'admin'.