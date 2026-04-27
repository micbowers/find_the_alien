// CORS + Origin guard for the /api/interpret endpoint.
//
// Strategy:
//   - Allow only requests whose Origin matches the production domain,
//     a Vercel preview deploy, or localhost (for `vercel dev`).
//   - Reject everything else with 403. This raises the bar for casual
//     curl-based abuse of the proxy (a determined attacker can still
//     fake the Origin header — defense in depth, not airtight).
//   - Echo the matched origin back as the ACAO header so browsers
//     are happy.
//   - Handle the CORS preflight OPTIONS request.
//
// Returns true if the request was handled (preflight) — caller should
// stop. Returns false if the request is allowed to continue.
// Throws (via res.status(403)) for disallowed origins.

const ALLOWED = [
  /^https:\/\/findthealien\.sparkworks\.kids$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,           // Vercel preview deploys
  /^http:\/\/localhost(:\d+)?$/,                    // local dev
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED.some(re => re.test(origin));
}

// Apply CORS headers + handle preflight + reject bad origins.
// Returns one of:
//   'preflight' — caller should stop (response already sent)
//   'rejected'  — caller should stop (response already sent)
//   'ok'        — caller should proceed
export function applyCors(req, res) {
  const origin = req.headers.origin || '';

  // Preflight
  if (req.method === 'OPTIONS') {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.status(204).end();
    } else {
      res.status(403).end();
    }
    return 'preflight';
  }

  // Real request: require a matching Origin header. Browser POSTs always
  // include Origin; legitimate same-origin POSTs from our app do too.
  if (!isOriginAllowed(origin)) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return 'rejected';
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  return 'ok';
}
