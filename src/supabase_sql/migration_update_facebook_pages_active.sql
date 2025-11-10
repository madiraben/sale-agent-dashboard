-- Add is_active to support multiple active pages per user
alter table if exists public.facebook_pages
  add column if not exists is_active boolean not null default false;

create index if not exists idx_facebook_pages_user_active on public.facebook_pages(user_id, is_active);


