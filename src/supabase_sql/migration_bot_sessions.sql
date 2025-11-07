-- Session store for bot conversations (per external user/channel)
create table if not exists public.bot_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('messenger','telegram')),
  external_user_id text not null,
  stage text not null default 'discovering', -- 'discovering' | 'confirming_order' | 'collecting_contact'
  items jsonb not null default '[]',         -- [{ name, qty }]
  contact jsonb not null default '{}',       -- { name, email, phone }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_bot_sessions_owner_channel_user
  on public.bot_sessions(owner_user_id, channel, external_user_id);

create index if not exists idx_bot_sessions_updated_at
  on public.bot_sessions(updated_at desc);

alter table public.bot_sessions enable row level security;

-- RLS: only owner can read/write their sessions (UI/debug endpoints if needed)
drop policy if exists bot_sessions_select on public.bot_sessions;
create policy bot_sessions_select on public.bot_sessions
for select using (owner_user_id = auth.uid());

drop policy if exists bot_sessions_all on public.bot_sessions;
create policy bot_sessions_all on public.bot_sessions
for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());


