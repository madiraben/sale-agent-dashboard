-- Migration: Add vector embeddings to products table
-- Run this in Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add new columns (safe - won't drop existing data)
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS image_embedding vector(1408),
  ADD COLUMN IF NOT EXISTS embedding_metadata jsonb;

-- 3. Convert existing jsonb embedding column to vector if needed
DO $$ 
BEGIN
  -- Check if embedding column is jsonb (not vector)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'products' 
    AND column_name = 'embedding' 
    AND data_type = 'jsonb'
  ) THEN
    -- Backup old column
    ALTER TABLE public.products RENAME COLUMN embedding TO embedding_old_jsonb;
    -- Add new vector column
    ALTER TABLE public.products ADD COLUMN embedding vector(1408);
    RAISE NOTICE 'Converted embedding from jsonb to vector(1408). Old data backed up in embedding_old_jsonb column.';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'products' 
    AND column_name = 'embedding'
  ) THEN
    -- Column doesn't exist at all, create it
    ALTER TABLE public.products ADD COLUMN embedding vector(1408);
    RAISE NOTICE 'Created new embedding vector(1408) column.';
  END IF;
END $$;

-- 4. Create indexes for fast similarity search (HNSW index)
CREATE INDEX IF NOT EXISTS products_embedding_idx ON public.products 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS products_image_embedding_idx ON public.products 
USING hnsw (image_embedding vector_cosine_ops);

-- 5. Verify the changes
SELECT 
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'products' 
  AND column_name IN ('embedding', 'image_embedding', 'embedding_metadata')
ORDER BY column_name;

