-- SLIM HAIR STUDIO — run this in Supabase SQL editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  service_id  text not null,
  service     text not null,
  price       numeric(8,2) not null,
  deposit     numeric(8,2) not null,
  payment     text not null default 'EcoCash',
  ussd        text,
  date        date not null,
  time        text not null,
  proof_path  text,                       -- object path in storage bucket "proofs"
  status      text not null default 'awaiting confirmation'
              check (status in ('awaiting confirmation','confirmed','cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- one active booking per slot
create unique index if not exists bookings_slot_unique
  on public.bookings (date, time) where status <> 'cancelled';
create index if not exists bookings_phone_idx on public.bookings (phone);
create index if not exists bookings_date_idx on public.bookings (date);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

-- Lock the table down: only the backend (service role) may read/write.
alter table public.bookings enable row level security;

-- Realtime (lets the admin app subscribe directly if you want to skip SSE later)
alter publication supabase_realtime add table public.bookings;

-- Private bucket for EcoCash screenshots
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Web Push subscriptions (Slim's devices)
create table if not exists public.push_subscriptions (
  endpoint     text primary key,
  subscription jsonb not null,
  owner        text,
  user_agent   text,
  created_at   timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
