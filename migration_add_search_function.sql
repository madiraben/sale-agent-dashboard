-- Create RPC function for vector similarity search
-- Run this in Supabase SQL Editor

-- Drop ALL existing versions of these functions
DROP FUNCTION IF EXISTS search_products_by_embedding CASCADE;
DROP FUNCTION IF EXISTS search_products_by_image_embedding CASCADE;
DROP FUNCTION IF EXISTS search_products_hybrid CASCADE;

CREATE OR REPLACE FUNCTION search_products_by_embedding(
  query_embedding vector(1408),
  match_threshold float DEFAULT 0.3,  -- Lowered from 0.5 to 0.3 (30%)
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

-- Hybrid search combining vector similarity with keyword matching
-- This gives better results by combining semantic understanding with exact matches
CREATE OR REPLACE FUNCTION search_products_hybrid_text(
  query_text text,
  query_embedding vector(1408),
  match_threshold float DEFAULT 0.2,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  similarity float,
  match_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      p.image_url,
      (1 - (p.embedding <=> query_embedding))                AS vec_sim,
      ts_rank_cd(p.search_tsv, plainto_tsquery('simple', unaccent(query_text))) AS fts_rank
    FROM products p
    WHERE p.embedding IS NOT NULL
  )
  SELECT
    id,
    name,
    description,
    price,
    image_url,
    GREATEST(
      0.75 * vec_sim + 0.25 * fts_rank,
      vec_sim
    ) AS similarity,
    CASE 
      WHEN LOWER(name) = LOWER(query_text) THEN 'exact'
      WHEN LOWER(name) LIKE '%' || LOWER(query_text) || '%' THEN 'name_match'
      WHEN LOWER(COALESCE(description, '')) LIKE '%' || LOWER(query_text) || '%' THEN 'desc_match'
      ELSE 'semantic'
    END AS match_type
  FROM ranked
  WHERE (0.75 * vec_sim + 0.25 * fts_rank) > match_threshold OR vec_sim > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_products_by_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_by_image_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_hybrid_text TO authenticated;

