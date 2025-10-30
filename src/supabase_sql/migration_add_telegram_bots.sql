-- Telegram bots per user
create table if not exists public.telegram_bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_token text not null,
  bot_username text,
  bot_id text,
  secret text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_telegram_bots_user on public.telegram_bots(user_id);
create unique index if not exists uniq_telegram_bots_secret on public.telegram_bots(secret);
create index if not exists idx_telegram_bots_user on public.telegram_bots(user_id);

alter table public.telegram_bots enable row level security;

drop policy if exists telegram_bots_select on public.telegram_bots;
create policy telegram_bots_select on public.telegram_bots
for select using (user_id = auth.uid());

drop policy if exists telegram_bots_all on public.telegram_bots;
create policy telegram_bots_all on public.telegram_bots
for all using (user_id = auth.uid()) with check (user_id = auth.uid());


