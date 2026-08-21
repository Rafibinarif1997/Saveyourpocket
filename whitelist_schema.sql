-- THE LAST 404 — SIMPLE WHITELIST TABLE
create extension if not exists pgcrypto;

create table if not exists public.whitelist_entries (
  id uuid primary key default gen_random_uuid(),
  x_username text not null,
  wallet_address text unique not null,
  whitelist_status text not null default 'pending'
    check (whitelist_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists whitelist_entries_created_at_idx
on public.whitelist_entries(created_at);

alter table public.whitelist_entries enable row level security;

create policy "public can submit whitelist application"
on public.whitelist_entries
for insert to anon
with check (
  length(x_username) between 1 and 80
  and wallet_address ~ '^0x[a-fA-F0-9]{40}$'
);

-- No public SELECT policy: applicants cannot browse other submissions.
