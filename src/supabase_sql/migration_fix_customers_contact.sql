-- Migration: Fix customers table to allow either phone OR email (not require both)
-- This fixes the order creation issue where users can provide just email or just phone

-- Make phone column nullable
alter table public.customers 
alter column phone drop not null;

-- Add check constraint to ensure at least one contact method is provided
alter table public.customers
drop constraint if exists customers_contact_check;

alter table public.customers
add constraint customers_contact_check 
check (phone is not null or email is not null);

-- Update index on email for faster lookups
create index if not exists idx_customers_email on public.customers (email) where email is not null;

-- Add comment for documentation
comment on constraint customers_contact_check on public.customers is 
'Ensures at least one contact method (phone or email) is provided';

comment on column public.customers.phone is 'Customer phone number (optional if email provided)';
comment on column public.customers.email is 'Customer email address (optional if phone provided)';

