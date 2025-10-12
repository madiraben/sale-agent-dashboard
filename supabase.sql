-- Ensure product_categories exists before products
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  price numeric not null default 0,
  stock integer not null default 0,
  category text,
  category_id uuid references public.product_categories(id) on delete set null,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Enable row level security
alter table public.products enable row level security;

-- Policies: allow read for authenticated users; insert/update/delete for authenticated
drop policy if exists "Allow read for authenticated" on public.products;
create policy "Allow read for authenticated" on public.products
for select using (auth.role() = 'authenticated');

drop policy if exists "Allow write for authenticated" on public.products;
create policy "Allow write for authenticated" on public.products
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Ensure products has category_id with FK even if table pre-existed
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'category_id'
  ) then
    alter table public.products add column category_id uuid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_category_id_fkey'
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id) references public.product_categories(id) on delete set null;
  end if;
end $$;

-- Drop legacy text category column if it exists (replaced by category_id)
alter table if exists public.products drop column if exists category;

-- Trigger for categories updated_at
drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

-- Enable RLS on product_categories
alter table public.product_categories enable row level security;

drop policy if exists "Allow read for authenticated" on public.product_categories;
create policy "Allow read for authenticated" on public.product_categories
for select using (auth.role() = 'authenticated');

drop policy if exists "Allow write for authenticated" on public.product_categories;
create policy "Allow write for authenticated" on public.product_categories
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Create storage bucket for product images (idempotent)
do $$ begin
  if not exists (
    select 1 from storage.buckets where id = 'product-images'
  ) then
    insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
  end if;
end $$;

-- Storage policies for product-images bucket
-- Allow read for everyone (public bucket), write for authenticated
drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images" on storage.objects
for select using ( bucket_id = 'product-images' );

drop policy if exists "Authenticated write product-images" on storage.objects;
create policy "Authenticated write product-images" on storage.objects
for insert to authenticated with check ( bucket_id = 'product-images' );

drop policy if exists "Authenticated update product-images" on storage.objects;
create policy "Authenticated update product-images" on storage.objects
for update to authenticated using ( bucket_id = 'product-images' ) with check ( bucket_id = 'product-images' );

drop policy if exists "Authenticated delete product-images" on storage.objects;
create policy "Authenticated delete product-images" on storage.objects
for delete to authenticated using ( bucket_id = 'product-images' );

-- =============================
-- Customers and Orders schema
-- =============================

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure address column exists for existing deployments
alter table if exists public.customers add column if not exists address text;

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
drop policy if exists "Allow read for authenticated" on public.customers;
create policy "Allow read for authenticated" on public.customers for select using (auth.role() = 'authenticated');
drop policy if exists "Allow write for authenticated" on public.customers;
create policy "Allow write for authenticated" on public.customers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_customers_phone on public.customers (phone);
create index if not exists idx_customers_name on public.customers (name);

-- Orders (sales)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  date date not null default current_date,
  status text not null check (status in ('paid','refunded','pending')) default 'pending',
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
drop policy if exists "Allow read for authenticated" on public.orders;
create policy "Allow read for authenticated" on public.orders for select using (auth.role() = 'authenticated');
drop policy if exists "Allow write for authenticated" on public.orders;
create policy "Allow write for authenticated" on public.orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_date on public.orders (date);
create index if not exists idx_orders_status on public.orders (status);

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null check (qty > 0),
  price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_order_items_updated_at on public.order_items;
create trigger trg_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

alter table public.order_items enable row level security;
drop policy if exists "Allow read for authenticated" on public.order_items;
create policy "Allow read for authenticated" on public.order_items for select using (auth.role() = 'authenticated');
drop policy if exists "Allow write for authenticated" on public.order_items;
create policy "Allow write for authenticated" on public.order_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_product on public.order_items (product_id);

-- View: customers with aggregate stats (orders count, total, last date)
drop view if exists public.customers_with_stats;
create view public.customers_with_stats as
select
  c.id,
  c.name,
  c.phone,
  c.email,
  c.address,
  max(o.date) as last_date,
  count(o.id) as orders_count,
  coalesce(sum(o.total), 0)::numeric as total
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id, c.name, c.phone, c.email, c.address;

-- Materialized view or regular view for top products by sales amount
create or replace view public.top_products_sales as
select
  p.id,
  p.name,
  coalesce(sum(oi.qty), 0)::integer as total_qty,
  coalesce(sum(oi.qty * oi.price), 0)::numeric as total_amount
from public.products p
left join public.order_items oi on oi.product_id = p.id
group by p.id, p.name;

-- =============================
-- Sales aggregates by period
-- =============================

-- Daily totals (by orders.date)
create or replace view public.sales_totals_daily as
select
  o.date as day,
  coalesce(sum(o.total), 0)::numeric as total
from public.orders o
where o.status in ('paid')
group by o.date
order by day desc;

-- Weekly totals (ISO week)
create or replace view public.sales_totals_weekly as
select
  to_char(date_trunc('week', o.date), 'IYYY-IW') as iso_week,
  date_trunc('week', o.date)::date as week_start,
  coalesce(sum(o.total), 0)::numeric as total
from public.orders o
where o.status in ('paid')
group by 1, 2
order by week_start desc;

-- Monthly totals
create or replace view public.sales_totals_monthly as
select
  to_char(date_trunc('month', o.date), 'YYYY-MM') as ym,
  date_trunc('month', o.date)::date as month_start,
  coalesce(sum(o.total), 0)::numeric as total
from public.orders o
where o.status in ('paid')
group by 1, 2
order by month_start desc;

-- =============================
-- Order acceptance RPC
-- =============================

create or replace function public.accept_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  -- lock the order row
  select status into v_status from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  -- idempotent: if already paid do nothing
  if v_status = 'paid' then
    return;
  end if;

  -- only pending orders can be accepted
  if v_status <> 'pending' then
    raise exception 'Only pending orders can be accepted (current: %)', v_status;
  end if;

  -- validate sufficient stock for all items
  if exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id and p.stock < oi.qty
  ) then
    raise exception 'Insufficient stock for one or more items';
  end if;

  -- decrement stock for each item
  update public.products p
  set stock = p.stock - oi.qty
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.product_id = p.id;

  -- mark order as paid
  update public.orders set status = 'paid' where id = p_order_id;
end;
$$;

-- Helper: sum of paid orders between dates (inclusive)
create or replace function public.sales_total_between(p_start date, p_end date)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(total), 0)::numeric
  from public.orders
  where status = 'paid' and date between p_start and p_end;
$$;