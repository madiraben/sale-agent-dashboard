import logger from "@/lib/logger";
import { EnhancedQuery } from "./query-enhancer";


type CacheEntry<T> = {
  value: T;
  timestamp: number;
  hits: number;
};

class QueryCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = 500, ttlMinutes: number = 60) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  private generateKey(query: string, context?: string): string {
    // Normalize: lowercase, trim, remove extra spaces
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, " ");
    
    // Include context hash if provided (simplified - first 50 chars)
    const contextKey = context ? context.slice(0, 50) : "";
    
    return `${normalizedQuery}|${contextKey}`;
  }

  /**
   * Get cached value if exists and not expired
   */
  get(query: string, context?: string): T | null {
    const key = this.generateKey(query, context);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set cache value
   */
  set(query: string, value: T, context?: string): void {
    const key = this.generateKey(query, context);

    // Evict oldest if at max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const avgAge = entries.length > 0
      ? entries.reduce((sum, e) => sum + (Date.now() - e.timestamp), 0) / entries.length
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHits: entries.length > 0 ? totalHits / entries.length : 0,
      avgAgeMs: Math.round(avgAge),
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Singleton instances
const enhancedQueryCache = new QueryCache<EnhancedQuery>(500, 60);
const embeddingCache = new QueryCache<number[]>(300, 120); // Longer TTL for embeddings

/**
 * Get cached enhanced query
 */
export function getCachedEnhancement(query: string, context?: string): EnhancedQuery | null {
  const cached = enhancedQueryCache.get(query, context);
  if (cached) {
    logger.info(`⚡ Cache HIT for query enhancement: "${query}"`);
  }
  return cached;
}

/**
 * Cache enhanced query
 */
export function cacheEnhancement(query: string, enhanced: EnhancedQuery, context?: string): void {
  enhancedQueryCache.set(query, enhanced, context);
}

/**
 * Get cached embedding
 */
export function getCachedEmbedding(text: string): number[] | null {
  const cached = embeddingCache.get(text);
  if (cached) {
    logger.info(`⚡ Cache HIT for embedding: "${text.slice(0, 50)}..."`);
  }
  return cached;
}

/**
 * Cache embedding
 */
export function cacheEmbedding(text: string, embedding: number[]): void {
  embeddingCache.set(text, embedding);
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
  return {
    enhancements: enhancedQueryCache.getStats(),
    embeddings: embeddingCache.getStats(),
  };
}

/**
 * Clear all caches (useful for testing or memory management)
 */
export function clearAllCaches(): void {
  enhancedQueryCache.clear();
  embeddingCache.clear();
  logger.info("🗑️ All caches cleared");
}

