-- Facebook connected pages per user
create table if not exists public.facebook_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null,
  page_name text,
  page_token text,
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_facebook_pages_user_page on public.facebook_pages(user_id, page_id);
create index if not exists idx_facebook_pages_user on public.facebook_pages(user_id);

alter table public.facebook_pages enable row level security;

drop policy if exists facebook_pages_select on public.facebook_pages;
create policy facebook_pages_select on public.facebook_pages
for select using (user_id = auth.uid());

drop policy if exists facebook_pages_all on public.facebook_pages;
create policy facebook_pages_all on public.facebook_pages
for all using (user_id = auth.uid()) with check (user_id = auth.uid());


