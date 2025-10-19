-- Create RPC function for vector similarity search
-- Run this in Supabase SQL Editor

-- Drop ALL existing versions of these functions
DROP FUNCTION IF EXISTS search_products_by_embedding CASCADE;
DROP FUNCTION IF EXISTS search_products_by_image_embedding CASCADE;
DROP FUNCTION IF EXISTS search_products_hybrid CASCADE;

CREATE OR REPLACE FUNCTION search_products_by_embedding(
  query_embedding vector(1408),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM products p
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create similar function for image search
CREATE OR REPLACE FUNCTION search_products_by_image_embedding(
  query_embedding vector(1408),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    1 - (p.image_embedding <=> query_embedding) as similarity
  FROM products p
  WHERE p.image_embedding IS NOT NULL
    AND 1 - (p.image_embedding <=> query_embedding) > match_threshold
  ORDER BY p.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search combining both text and image embeddings
CREATE OR REPLACE FUNCTION search_products_hybrid(
  text_embedding vector(1408),
  image_embedding vector(1408),
  text_weight float DEFAULT 0.7,
  image_weight float DEFAULT 0.3,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    (
      text_weight * (1 - (p.embedding <=> text_embedding)) +
      image_weight * (1 - (p.image_embedding <=> image_embedding))
    ) as similarity
  FROM products p
  WHERE p.embedding IS NOT NULL
    AND p.image_embedding IS NOT NULL
    AND (
      text_weight * (1 - (p.embedding <=> text_embedding)) +
      image_weight * (1 - (p.image_embedding <=> image_embedding))
    ) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_products_by_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_by_image_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_hybrid TO authenticated;

