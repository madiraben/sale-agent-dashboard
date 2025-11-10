-- Migration: Add pending orders table for human review
-- This table stores orders that need human review due to low confidence

CREATE TABLE IF NOT EXISTS pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to conversation
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  
  -- Tenant info
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL, -- shop owner
  
  -- Customer info (extracted, not yet validated)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  
  -- Products (stored as JSONB)
  products JSONB NOT NULL DEFAULT '[]', -- Array of {name, price, qty, product_id}
  
  -- Validation info
  confidence_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  validation_issues TEXT[] DEFAULT '{}', -- Array of issue descriptions
  
  -- Original conversation data
  purchase_message TEXT,
  conversation_summary TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, reviewed, approved, rejected
  reviewed_by UUID, -- user who reviewed
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes from human reviewer
  reviewer_notes TEXT,
  
  -- Converted order ID (if approved and order created)
  order_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pending_orders_tenant_id ON pending_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_created_at ON pending_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_orders_confidence ON pending_orders(confidence_score);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_pending_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS pending_orders_updated_at_trigger ON pending_orders;
CREATE TRIGGER pending_orders_updated_at_trigger
  BEFORE UPDATE ON pending_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_orders_updated_at();

-- Row Level Security (optional, adjust based on your auth setup)
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tenant's pending orders
CREATE POLICY pending_orders_tenant_isolation ON pending_orders
  FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

COMMENT ON TABLE pending_orders IS 'Orders that need human review due to low confidence validation';
COMMENT ON COLUMN pending_orders.confidence_score IS 'Overall confidence score from 0.00 to 1.00';
COMMENT ON COLUMN pending_orders.validation_issues IS 'Array of validation issues found during processing';
COMMENT ON COLUMN pending_orders.products IS 'JSONB array of products with name, price, qty, product_id';

