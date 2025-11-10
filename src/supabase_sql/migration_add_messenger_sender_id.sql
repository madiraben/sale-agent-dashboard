-- Migration: Add messenger_sender_id to customers table
-- This allows us to recognize returning customers and skip re-asking for info

-- Add column if not exists
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS messenger_sender_id TEXT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_messenger_sender 
ON public.customers(messenger_sender_id) 
WHERE messenger_sender_id IS NOT NULL;

-- Add unique constraint to prevent duplicate sender IDs within same tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_messenger 
ON public.customers(tenant_id, messenger_sender_id) 
WHERE messenger_sender_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.customers.messenger_sender_id IS 'Facebook Messenger sender ID for recognizing returning customers';

