// Client wrapper for /api/interpret. Caches identical text within a single
// page-session so repeated identical questions don't re-bill the API.
//
// On any failure (network, 429, 500, malformed) — caller gets an Error and
// is expected to fall back to the canned list. The UI never freezes on a
// dead LLM.

const sessionCache = new Map();

const ENDPOINT = '/api/interpret';
const TIMEOUT_MS = 10_000;

export async function interpret(text) {
  const key = (text ?? '').toLowerCase().trim();
  if (!key) throw new Error('Empty question.');
  if (sessionCache.has(key)) return sessionCache.get(key);

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('TIMEOUT');
    throw new Error('NETWORK');
  }
  clearTimeout(timer);

  if (res.status === 429) {
    const ra = res.headers.get('retry-after');
    const e = new Error('RATE_LIMIT');
    e.retryAfterSec = ra ? Number(ra) : null;
    throw e;
  }
  if (!res.ok) {
    let msg = 'SERVER_ERROR';
    try {
      const b = await res.json();
      if (b?.error) msg = b.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('PARSE_ERROR');
  }

  // Cache only well-formed responses.
  sessionCache.set(key, data);
  return data;
}
