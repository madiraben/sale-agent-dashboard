-- Ensure that deleting a customer will delete all their related orders
-- Re-create the foreign key with ON DELETE CASCADE

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES public.customers(id)
  ON DELETE CASCADE;


