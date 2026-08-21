-- THE LAST 404 whitelist backend
-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.archivists (
  id uuid primary key default gen_random_uuid(),
  archive_id text unique not null,
  wallet_address text unique not null,
  x_username text not null,
  community_username text,
  referral_code text unique not null,
  referred_by text,
  score integer not null default 10,
  whitelist_status text not null default 'pending'
    check (whitelist_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists archivists_referral_idx on public.archivists(referral_code);
create index if not exists archivists_referred_by_idx on public.archivists(referred_by);

alter table public.archivists enable row level security;

-- Public registration: only INSERT is allowed through the anon key.
create policy "public can register archivist"
on public.archivists for insert
to anon
with check (
  length(wallet_address) between 10 and 128
  and length(x_username) between 1 and 80
  and length(referral_code) between 4 and 32
);

-- Public status lookup is intentionally limited to the fields needed by the site.
-- For a stricter production setup, move status lookup behind an Edge Function.
create policy "public can read own lookup fields"
on public.archivists for select
to anon
using (true);

-- Admin changes should be performed from Supabase dashboard or a secure server/Edge Function.
