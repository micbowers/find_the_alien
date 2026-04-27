// In-memory token-bucket rate limiter, keyed on x-forwarded-for.
// 30 calls per 5 minutes per IP, refilled steadily.
//
// CAVEAT: this is best-effort only. Vercel serverless functions can run on
// multiple instances per region, and instances cold-start independently.
// A determined abuser could exploit this by hitting different regions. For
// v1 it's enough; promote to Vercel KV if abuse appears.

const CAPACITY = 30;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const REFILL_PER_MS = CAPACITY / WINDOW_MS;

const buckets = new Map();

export function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: CAPACITY, last: now };
    buckets.set(key, b);
  }
  // Refill
  const elapsed = now - b.last;
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_MS);
  b.last = now;
  if (b.tokens < 1) {
    const retryAfterMs = Math.ceil((1 - b.tokens) / REFILL_PER_MS);
    return { ok: false, retryAfterMs };
  }
  b.tokens -= 1;
  // Light cleanup: if the map grows large, drop full buckets (the user is fine).
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) {
      if (v.tokens >= CAPACITY - 0.001) buckets.delete(k);
    }
  }
  return { ok: true };
}

export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length) return String(xff[0]);
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}
