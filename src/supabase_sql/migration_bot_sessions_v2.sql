-- Migration: Update bot_sessions table to support enhanced order flow
-- This migration adds new columns and updates the stage enum

-- Drop existing table if needed (WARNING: This will delete all data)
-- Only use this in development. In production, use ALTER TABLE to preserve data.

-- Update stage check constraint to include new stages
alter table public.bot_sessions 
drop constraint if exists bot_sessions_stage_check;

alter table public.bot_sessions 
add constraint bot_sessions_stage_check 
check (stage in ('discovering', 'confirming_products', 'confirming_order', 'collecting_contact'));

-- Rename items column to cart (if not already renamed)
-- Note: Check if items column exists first
do $$ 
begin
  if exists(select 1 from information_schema.columns 
            where table_name='bot_sessions' and column_name='items') then
    alter table public.bot_sessions rename column items to cart;
  end if;
end $$;

-- Update cart column to be jsonb array (already is, but ensure default is [])
alter table public.bot_sessions 
alter column cart set default '[]'::jsonb;

-- Add pending_products column if not exists
do $$ 
begin
  if not exists(select 1 from information_schema.columns 
                where table_name='bot_sessions' and column_name='pending_products') then
    alter table public.bot_sessions 
    add column pending_products jsonb default null;
  end if;
end $$;

-- Add conversation_history column if not exists
do $$ 
begin
  if not exists(select 1 from information_schema.columns 
                where table_name='bot_sessions' and column_name='conversation_history') then
    alter table public.bot_sessions 
    add column conversation_history jsonb default '[]'::jsonb;
  end if;
end $$;

-- Add metadata column if not exists
do $$ 
begin
  if not exists(select 1 from information_schema.columns 
                where table_name='bot_sessions' and column_name='metadata') then
    alter table public.bot_sessions 
    add column metadata jsonb default '{}'::jsonb;
  end if;
end $$;

-- Create index on conversation_history for better query performance
create index if not exists idx_bot_sessions_conversation 
  on public.bot_sessions using gin(conversation_history);

-- Create index on cart for better query performance
create index if not exists idx_bot_sessions_cart 
  on public.bot_sessions using gin(cart);

-- Add comments for documentation
comment on column public.bot_sessions.cart is 'Array of cart items with product_id, name, qty, price';
comment on column public.bot_sessions.pending_products is 'Products awaiting user selection (array of {query, results})';
comment on column public.bot_sessions.conversation_history is 'Array of conversation messages with role and content';
comment on column public.bot_sessions.metadata is 'Additional session metadata like last_intent, failed_attempts, etc';

-- Optional: Add function to clean up old sessions (older than 7 days with no activity)
create or replace function cleanup_inactive_bot_sessions()
returns void as $$
begin
  delete from public.bot_sessions
  where updated_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- select cron.schedule('cleanup-bot-sessions', '0 2 * * *', 'select cleanup_inactive_bot_sessions()');

