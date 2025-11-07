-- Chat message log for bot conversations (messenger & telegram)
-- This table stores all incoming and outgoing messages for analytics and debugging
create table if not exists public.bot_chat_messages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('messenger','telegram')),
  external_user_id text not null,
  sender text not null check (sender in ('user','bot')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bot_chat_messages_owner
  on public.bot_chat_messages(owner_user_id, created_at desc);

create index if not exists idx_bot_chat_messages_conversation
  on public.bot_chat_messages(owner_user_id, channel, external_user_id, created_at desc);

alter table public.bot_chat_messages enable row level security;

-- RLS: only owner can read their messages
drop policy if exists bot_chat_messages_select on public.bot_chat_messages;
create policy bot_chat_messages_select on public.bot_chat_messages
for select using (owner_user_id = auth.uid());

drop policy if exists bot_chat_messages_all on public.bot_chat_messages;
create policy bot_chat_messages_all on public.bot_chat_messages
for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());



