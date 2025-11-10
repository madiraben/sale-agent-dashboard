-- Migration: Add delivery_address to orders table
-- This allows us to store where each order should be delivered

-- Add delivery_address column to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_address text;

-- Create index for searching by address (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_orders_delivery_address ON public.orders USING gin (to_tsvector('english', delivery_address));

-- Add comment
COMMENT ON COLUMN public.orders.delivery_address IS 'Full delivery address provided by customer during checkout';

