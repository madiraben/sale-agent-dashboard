-- Function to safely decrement product stock
-- This function ensures stock doesn't go negative and is atomic

create or replace function public.decrement_product_stock(
  product_id uuid,
  qty int
)
returns void as $$
begin
  -- Update stock only if enough stock is available
  update public.products
  set 
    stock = stock - qty,
    updated_at = now()
  where 
    id = product_id
    and stock >= qty;
    
  -- Check if update affected any rows
  if not found then
    raise exception 'Insufficient stock for product %', product_id;
  end if;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function public.decrement_product_stock(uuid, int) to authenticated;

-- Add comment
comment on function public.decrement_product_stock is 'Safely decrements product stock, preventing negative values';

