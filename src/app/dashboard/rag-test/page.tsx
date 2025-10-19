"use client";

import React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import TextField from "@/components/ui/text-field";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  similarity: number;
};

export default function RAGTestPage() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [query, setQuery] = React.useState("");
  const [searchType, setSearchType] = React.useState<"text" | "image">("text");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [queryTime, setQueryTime] = React.useState<number>(0);

  async function handleSearch() {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      // 1. Get embedding for the query
      console.log("Getting embedding for query:", query);
      const embeddingRes = await fetch("/api/embeddings/multimodal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query }),
      });

      if (!embeddingRes.ok) {
        const errorData = await embeddingRes.json();
        throw new Error(errorData.error || "Failed to get embedding");
      }

      const embeddingData = await embeddingRes.json();
      const queryEmbedding = embeddingData.textEmbedding;

      if (!queryEmbedding) {
        throw new Error("No embedding returned");
      }

      console.log("✅ Got query embedding:", queryEmbedding.length, "dimensions");

      // 2. Search for similar products using vector similarity
      const { data, error: searchError } = await supabase.rpc("search_products_by_embedding", {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 10,
      });

      if (searchError) {
        // If RPC function doesn't exist, fallback to manual search
        console.warn("RPC function not found, using fallback search");
        const { data: products, error: fallbackError } = await supabase
          .from("products")
          .select("id, name, description, price, image_url, embedding")
          .not("embedding", "is", null);

        if (fallbackError) throw fallbackError;

        // Calculate similarity manually (cosine similarity)
        const productsWithSimilarity = products
          .map((product: any) => {
            if (!product.embedding) return null;
            const similarity = cosineSimilarity(queryEmbedding, product.embedding);
            return { ...product, similarity };
          })
          .filter((p): p is Product => p !== null && p.similarity > 0.5)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 10);

        setResults(productsWithSimilarity);
      } else {
        setResults(data || []);
      }

      const endTime = performance.now();
      setQueryTime(endTime - startTime);
      console.log("✅ Search completed in", (endTime - startTime).toFixed(2), "ms");
    } catch (err: any) {
      console.error("❌ Search error:", err);
      setError(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">RAG Test - Product Search</h1>
        <p className="text-gray-600">Test semantic search using vector embeddings</p>
      </div>

      {/* Search Input */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Query</label>
            <TextField
              placeholder="e.g., 'red shoes for running', 'beer from Cambodia', 'comfortable office chair'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === "text"}
                  onChange={() => setSearchType("text")}
                />
                <span className="text-sm">Text Search</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="searchType"
                  checked={searchType === "image"}
                  onChange={() => setSearchType("image")}
                />
                <span className="text-sm">Image Search (Coming Soon)</span>
              </label>
            </div>

            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Found <strong>{results.length}</strong> results in{" "}
            <strong>{queryTime.toFixed(0)}ms</strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {product.image_url && (
              <div className="h-48 bg-gray-100 relative">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-xs font-semibold">
                  {(product.similarity * 100).toFixed(1)}% match
                </div>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">${product.price}</span>
                <div className="flex items-center gap-1">
                  <div
                    className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden"
                    title={`Similarity: ${(product.similarity * 100).toFixed(1)}%`}
                  >
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${product.similarity * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!loading && results.length === 0 && query && (
        <div className="text-center py-12 text-gray-500">
          <p>No products found matching your query.</p>
          <p className="text-sm mt-2">Try a different search term or add more products with embeddings.</p>
        </div>
      )}

      {!loading && !query && (
        <div className="text-center py-12 text-gray-400">
          <p>Enter a search query to test semantic product search</p>
        </div>
      )}

      {/* Debug Info */}
      {results.length > 0 && (
        <Card className="mt-6 p-4 bg-gray-50">
          <details>
            <summary className="cursor-pointer font-medium text-sm text-gray-700">
              Debug Information
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              <p>
                <strong>Query:</strong> {query}
              </p>
              <p>
                <strong>Search Type:</strong> {searchType}
              </p>
              <p>
                <strong>Results:</strong> {results.length}
              </p>
              <p>
                <strong>Query Time:</strong> {queryTime.toFixed(2)}ms
              </p>
              <p>
                <strong>Similarity Range:</strong> {(Math.min(...results.map((r) => r.similarity)) * 100).toFixed(1)}% -{" "}
                {(Math.max(...results.map((r) => r.similarity)) * 100).toFixed(1)}%
              </p>
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}

