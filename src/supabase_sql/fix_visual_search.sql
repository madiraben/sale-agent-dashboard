-- ============================================
-- FIX: Remove ALL versions of image search function
-- ============================================

-- Drop ALL possible versions of the function with different signatures
DROP FUNCTION IF EXISTS public.search_products_by_image_embedding(vector, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_products_by_image_embedding(vector, double precision, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.search_products_by_image_embedding(vector, float, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_products_by_image_embedding(vector, float, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.search_products_by_image_embedding CASCADE;

-- Recreate with the correct signature
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_products_by_image_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_by_image_embedding TO anon;

-- ============================================
-- ✅ Done! Visual search function recreated
-- ============================================

