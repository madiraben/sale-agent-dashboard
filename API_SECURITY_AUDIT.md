# API Security & Optimization Audit

## 🚨 Critical Security Issues

### 1. **Missing Rate Limiting**
**Risk Level: HIGH**
- All API routes are vulnerable to abuse and DDoS attacks
- No protection against brute force attacks

**Fix:**
```typescript
// Create middleware: src/middleware/rate-limit.ts
import { NextRequest, NextResponse } from "next/server";
import { LRUCache } from "lru-cache";

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: (req: NextRequest, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        return isRateLimited ? reject() : resolve();
      }),
  };
}

// Usage in routes:
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  
  try {
    await limiter.check(req, 10, ip); // 10 requests per minute
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  
  // ... rest of the route
}
```

### 2. **No Input Validation & Sanitization**
**Risk Level: HIGH**
- SQL injection potential through unsanitized inputs
- XSS vulnerabilities
- No schema validation

**Fix:**
```typescript
// Install: npm install zod
import { z } from "zod";

// Create validators: src/lib/validators.ts
export const chatMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(10000)
  })).min(1).max(50),
});

export const ragQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
});

// Usage:
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = chatMessageSchema.parse(body); // Throws if invalid
    
    // Use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid input", 
        details: error.errors 
      }, { status: 400 });
    }
  }
}
```

### 3. **Excessive Logging of Sensitive Data**
**Risk Level: MEDIUM**
- Raw request bodies logged (could contain PII, API keys)
- Tokens and secrets visible in logs

**Fix:**
```typescript
// Create safe logger: src/lib/logger.ts
import winston from "winston";

const sensitiveFields = ["password", "token", "api_key", "secret", "authorization"];

function sanitize(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitize(value);
    }
  }
  return sanitized;
}

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format((info) => {
      info = sanitize(info);
      return info;
    })(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});
```

### 4. **No Request Timeout**
**Risk Level: MEDIUM**
- External API calls can hang indefinitely
- Resource exhaustion

**Fix:**
```typescript
// Create timeout wrapper: src/lib/fetch-with-timeout.ts
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
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage:
const response = await fetchWithTimeout(
  `${baseUrl}/chat/completions`,
  { method: "POST", headers, body: JSON.stringify(payload) },
  30000 // 30 second timeout
);
```

### 5. **Missing Authentication Middleware**
**Risk Level: HIGH**
- Auth checks duplicated in every route
- Inconsistent auth implementation

**Fix:**
```typescript
// Create auth middleware: src/middleware/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuth(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      supabase: null,
    };
  }
  
  return { error: null, user, supabase };
}

// Usage in routes:
export async function POST(req: NextRequest) {
  const { error, user, supabase } = await requireAuth(req);
  if (error) return error;
  
  // Route logic with authenticated user
}
```

### 6. **SSRF Vulnerability in Image Fetching**
**Risk Level: MEDIUM**
- `/api/embeddings/multimodal` fetches arbitrary URLs
- Could be used to scan internal networks

**Current (Partially Fixed):**
```typescript
// Already checks for https:// only, but needs more validation
if (u.protocol === "https:") {
  // Should also check against localhost, private IPs
}
```

**Better Fix:**
```typescript
function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    
    // Only HTTPS
    if (u.protocol !== "https:") return false;
    
    // Block localhost and private IPs
    const hostname = u.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("169.254.")
    ) {
      return false;
    }
    
    // Only allow specific domains (optional whitelist)
    // const allowed = ["trusted-cdn.com", "images.example.com"];
    // if (!allowed.some(domain => hostname.endsWith(domain))) return false;
    
    return true;
  } catch {
    return false;
  }
}
```

## ⚠️ Optimization Issues

### 1. **Memory Leak in Facebook Webhook**
**Risk Level: MEDIUM**
- `processedMessages` Set grows indefinitely
- No cleanup mechanism for old entries

**Current:**
```typescript
const processedMessages = new Set<string>();
setTimeout(() => processedMessages.delete(dedupeKey), MESSAGE_EXPIRY);
```

**Better Fix:**
```typescript
// Use LRU cache instead of Set
import { LRUCache } from "lru-cache";

const processedMessages = new LRUCache<string, boolean>({
  max: 10000, // Maximum entries
  ttl: 60000, // 1 minute TTL
});

// Usage:
if (processedMessages.has(dedupeKey)) {
  logger.info(`Skipping duplicate message: ${dedupeKey}`);
  continue;
}
processedMessages.set(dedupeKey, true);
```

### 2. **No Caching Strategy**
**Risk Level: LOW**
- Embeddings regenerated for same queries
- Product searches not cached
- Static data fetched repeatedly

**Fix:**
```typescript
// Create cache utility: src/lib/cache.ts
import { LRUCache } from "lru-cache";

export const embeddingCache = new LRUCache<string, number[]>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

export const productCache = new LRUCache<string, any[]>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

// Usage in RAG:
const cacheKey = `embedding:${query}`;
let embedding = embeddingCache.get(cacheKey);
if (!embedding) {
  embedding = await getTextEmbedding(query);
  embeddingCache.set(cacheKey, embedding);
}
```

### 3. **Inefficient Database Queries**
**Risk Level: MEDIUM**
- Over-fetching data with `select("*")`
- N+1 query problems
- No query optimization

**Fix:**
```typescript
// Bad:
const { data } = await supabase
  .from("products")
  .select("*") // Fetches everything including large embedding vectors
  .limit(50);

// Good:
const { data } = await supabase
  .from("products")
  .select("id, name, price, stock, image_url") // Only what's needed
  .limit(50);

// For embeddings, select only when needed:
const { data } = await supabase
  .from("products")
  .select("id, name, price, embedding") // Include embedding only for search
  .limit(50);
```

### 4. **Sequential Operations That Could Be Parallel**
**Risk Level: LOW**
- Some API calls could run in parallel
- Database operations serialized unnecessarily

**Example Fix:**
```typescript
// Bad:
const user = await supabase.auth.getUser();
const tenant = await supabase.from("tenants").select("*").single();
const products = await supabase.from("products").select("*");

// Good:
const [userResult, tenantResult, productsResult] = await Promise.all([
  supabase.auth.getUser(),
  supabase.from("tenants").select("*").single(),
  supabase.from("products").select("*"),
]);
```

## 📋 Implementation Priority

### Immediate (Week 1):
1. ✅ Add rate limiting to all public endpoints
2. ✅ Implement input validation with Zod
3. ✅ Fix memory leak in Facebook webhook
4. ✅ Add request timeouts

### Short-term (Week 2-3):
1. ✅ Create authentication middleware
2. ✅ Improve error messages (don't expose internals)
3. ✅ Add SSRF protection
4. ✅ Implement safe logging

### Medium-term (Month 1):
1. ✅ Add caching layer
2. ✅ Optimize database queries
3. ✅ Add monitoring and alerting
4. ✅ Implement circuit breakers for external APIs

### Long-term (Month 2+):
1. ✅ Add API versioning
2. ✅ Implement proper API documentation
3. ✅ Add comprehensive testing
4. ✅ Consider API gateway for better security

## 🛡️ Security Best Practices Checklist

- [ ] Rate limiting on all endpoints
- [ ] Input validation and sanitization
- [ ] Authentication middleware
- [ ] HTTPS only (already enforced by Vercel/Next.js)
- [ ] Secure headers (CSP, HSTS, etc.)
- [ ] No sensitive data in logs
- [ ] Request timeouts
- [ ] CORS configuration
- [ ] SQL injection protection (use parameterized queries)
- [ ] XSS protection
- [ ] CSRF protection for state-changing operations
- [ ] Secrets in environment variables (✅ Already done)
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning

