import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/rag/query-cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/cache-stats
 * 
 * Returns cache performance statistics for monitoring
 * Requires authentication
 */
export async function GET() {
  try {
    // Verify user is authenticated
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get cache statistics
    const stats = getCacheStats();
    
    // Calculate cache efficiency metrics
    const enhancementHitRate = stats.enhancements.size > 0
      ? (stats.enhancements.totalHits / stats.enhancements.size * 100).toFixed(1)
      : "0.0";
    
    const embeddingHitRate = stats.embeddings.size > 0
      ? (stats.embeddings.totalHits / stats.embeddings.size * 100).toFixed(1)
      : "0.0";

    // Estimate time and cost savings
    const enhancementTimeSaved = stats.enhancements.totalHits * 300; // ~300ms per hit
    const embeddingTimeSaved = stats.embeddings.totalHits * 400; // ~400ms per hit
    const totalTimeSavedMs = enhancementTimeSaved + embeddingTimeSaved;
    const totalTimeSavedMin = (totalTimeSavedMs / 1000 / 60).toFixed(1);

    // Estimate cost savings (rough approximation)
    const enhancementCostSaved = (stats.enhancements.totalHits * 0.0001).toFixed(4); // ~$0.0001 per call
    const embeddingCostSaved = (stats.embeddings.totalHits * 0.0002).toFixed(4); // ~$0.0002 per call
    const totalCostSaved = (parseFloat(enhancementCostSaved) + parseFloat(embeddingCostSaved)).toFixed(4);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      caches: {
        enhancements: {
          ...stats.enhancements,
          hitRate: `${enhancementHitRate}%`,
          avgAgeMinutes: (stats.enhancements.avgAgeMs / 1000 / 60).toFixed(1),
          utilizationPercent: ((stats.enhancements.size / stats.enhancements.maxSize) * 100).toFixed(1),
        },
        embeddings: {
          ...stats.embeddings,
          hitRate: `${embeddingHitRate}%`,
          avgAgeMinutes: (stats.embeddings.avgAgeMs / 1000 / 60).toFixed(1),
          utilizationPercent: ((stats.embeddings.size / stats.embeddings.maxSize) * 100).toFixed(1),
        },
      },
      performance: {
        totalCacheHits: stats.enhancements.totalHits + stats.embeddings.totalHits,
        estimatedTimeSavedMs: totalTimeSavedMs,
        estimatedTimeSavedMinutes: totalTimeSavedMin,
        estimatedCostSavedUSD: totalCostSaved,
      },
      recommendations: generateRecommendations(stats),
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return NextResponse.json(
      { error: "Failed to get cache statistics" },
      { status: 500 }
    );
  }
}

/**
 * Generate recommendations based on cache performance
 */
function generateRecommendations(stats: ReturnType<typeof getCacheStats>): string[] {
  const recommendations: string[] = [];

  // Check enhancement cache utilization
  const enhancementUtil = (stats.enhancements.size / stats.enhancements.maxSize) * 100;
  if (enhancementUtil > 90) {
    recommendations.push("⚠️ Enhancement cache is nearly full (>90%). Consider increasing maxSize.");
  }

  // Check embedding cache utilization
  const embeddingUtil = (stats.embeddings.size / stats.embeddings.maxSize) * 100;
  if (embeddingUtil > 90) {
    recommendations.push("⚠️ Embedding cache is nearly full (>90%). Consider increasing maxSize.");
  }

  // Check hit rates
  const enhancementHitRate = stats.enhancements.size > 0
    ? (stats.enhancements.totalHits / stats.enhancements.size)
    : 0;
  
  if (enhancementHitRate < 2) {
    recommendations.push("💡 Low enhancement cache hit rate. Users may be asking unique questions.");
  } else if (enhancementHitRate > 5) {
    recommendations.push("✅ Excellent enhancement cache hit rate! Users frequently repeat queries.");
  }

  const embeddingHitRate = stats.embeddings.size > 0
    ? (stats.embeddings.totalHits / stats.embeddings.size)
    : 0;
  
  if (embeddingHitRate < 2) {
    recommendations.push("💡 Low embedding cache hit rate. Consider pre-warming with common queries.");
  } else if (embeddingHitRate > 5) {
    recommendations.push("✅ Excellent embedding cache hit rate! Cache is very effective.");
  }

  // Check if caches are empty
  if (stats.enhancements.size === 0 && stats.embeddings.size === 0) {
    recommendations.push("ℹ️ Caches are empty. This is normal after restart or during low traffic.");
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Cache performance looks good! No issues detected.");
  }

  return recommendations;
}

