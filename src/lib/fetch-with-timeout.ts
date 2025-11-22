/**
 * Fetch with timeout to prevent hanging requests
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  timeout = 30000
): Promise<Response> {
  const baseDelayMs = 500;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      // Don't retry on success or client errors (4xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Retry on 5xx errors or 429
      if (attempt < maxRetries && (response.status >= 500 || response.status === 429)) {
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter
          ? Math.min(5000, Math.max(500, Number(retryAfter) * 1000))
          : Math.min(4000, baseDelayMs * Math.pow(2, attempt)) + Math.random() * 250;
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      const delay = Math.min(4000, baseDelayMs * Math.pow(2, attempt)) + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max retries exceeded");
}

