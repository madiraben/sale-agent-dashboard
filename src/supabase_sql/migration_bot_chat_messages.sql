-- Create chat_messages table for bot memory
create table if not exists public.chat_messages (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  tenant_id uuid null,
  role text not null,
  content text not null,
  message_id text null,
  created_at timestamp with time zone not null default now(),
  conversation_id uuid null,
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_conversation_id_fkey foreign key (conversation_id) references public.chat_conversations (id) on delete cascade,
  constraint chat_messages_tenant_id_fkey foreign key (tenant_id) references public.tenants (id),
  constraint chat_messages_role_check check ((role = any (array['user'::text, 'assistant'::text])))
) tablespace pg_default;

create index if not exists idx_chat_messages_user_id on public.chat_messages using btree (user_id, created_at desc) tablespace pg_default;
create index if not exists idx_chat_messages_tenant on public.chat_messages using btree (tenant_id) tablespace pg_default;
create index if not exists chat_messages_conversation_id_idx on public.chat_messages using btree (conversation_id, created_at) tablespace pg_default;

-- Trigger to populate tenant_id from session context if not provided
drop trigger if exists trg_chat_messages_set_tenant on public.chat_messages;
create trigger trg_chat_messages_set_tenant
before insert on public.chat_messages
for each row execute function public.set_tenant_id_generic();


