-- Chat schema for storing conversations and messages
create extension if not exists pgcrypto;

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tokens int,
  created_at timestamptz not null default now()
);

-- If chat_messages already existed without conversation_id, add it
do $$ begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'chat_messages' and column_name = 'conversation_id'
  ) then
    alter table public.chat_messages add column conversation_id uuid;
  end if;
end $$;

-- Ensure foreign key constraint exists
do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'chat_messages_conversation_id_fkey' and n.nspname = 'public' and t.relname = 'chat_messages'
  ) then
    alter table public.chat_messages add constraint chat_messages_conversation_id_fkey
      foreign key (conversation_id) references public.chat_conversations(id) on delete cascade;
  end if;
end $$;

create index if not exists chat_messages_conversation_id_idx on public.chat_messages(conversation_id, created_at);
create index if not exists chat_conversations_user_id_idx on public.chat_conversations(user_id, updated_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- RLS: users can access only their rows (CREATE POLICY has no IF NOT EXISTS)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_conversations' and policyname = 'chat_conversations_select_own'
  ) then
    create policy "chat_conversations_select_own"
    on public.chat_conversations for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_conversations' and policyname = 'chat_conversations_modify_own'
  ) then
    create policy "chat_conversations_modify_own"
    on public.chat_conversations for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'chat_messages_select_own'
  ) then
    create policy "chat_messages_select_own"
    on public.chat_messages for select
    using (exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'chat_messages_modify_own'
  ) then
    create policy "chat_messages_modify_own"
    on public.chat_messages for all
    using (exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
    with check (exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
  end if;
end $$;


