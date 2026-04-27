// POST /api/interpret
// Body: { text: string, aliveCount?: number, recentlyAsked?: string[] }
// Returns: {
//   interpretation: "matched" | "ambiguous" | "off_topic",
//   questionId: string | null,
//   confidence: number,
//   candidates: string[],
//   rephrased: string,
//   rationale: string
// }
//
// The function never knows which alien is the secret. It only maps free-form
// text to a canned question id; the browser computes YES/NO locally.

import Anthropic from '@anthropic-ai/sdk';
import { QUESTIONS } from '../src/data/questions.js';
import { buildSystemPrompt } from '../lib/prompts.js';
import { checkRateLimit, getClientIp } from '../lib/rateLimit.js';
import { applyCors } from '../lib/cors.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 400;

// id+text catalog computed once at module load (cold start).
const CATALOG = QUESTIONS.map(q => ({ id: q.id, text: q.text }));
const VALID_IDS = new Set(CATALOG.map(q => q.id));

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY env var is not set');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export default async function handler(req, res) {
  // CORS + Origin guard. Handles preflight OPTIONS and rejects requests
  // whose Origin isn't from our domain (or a Vercel preview / localhost).
  const corsResult = applyCors(req, res);
  if (corsResult !== 'ok') return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Too many requests, slow down a bit.' });
  }

  // Parse body (Vercel parses JSON automatically when Content-Type is set)
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const text = (body?.text ?? '').toString().trim();
  if (!text) {
    return res.status(400).json({ error: 'Missing "text" field' });
  }
  if (text.length > 200) {
    return res.status(400).json({ error: 'Question is too long (200 char max).' });
  }

  let raw;
  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(CATALOG),
      messages: [{ role: 'user', content: text }],
    });
    raw = response.content?.[0]?.text ?? '';
  } catch (err) {
    console.error('Anthropic call failed:', err);
    return res.status(502).json({ error: 'Interpreter is unavailable. Try the canned list.' });
  }

  const parsed = parseInterpretation(raw);
  if (!parsed) {
    // Defensive fallback: treat malformed output as off-topic.
    return res.status(200).json({
      interpretation: 'off_topic',
      questionId: null,
      confidence: 0,
      candidates: [],
      rephrased: '',
      rationale: 'Interpreter returned an unparseable response.',
    });
  }
  return res.status(200).json(parsed);
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// Parse + validate the LLM's JSON. Drops unknown ids, clamps fields.
function parseInterpretation(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Strip code fences if the model added them despite instructions.
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  let obj;
  try { obj = JSON.parse(cleaned); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;

  const interp = obj.interpretation;
  const validInterps = ['matched', 'ambiguous', 'off_topic'];
  if (!validInterps.includes(interp)) return null;

  let questionId = obj.questionId ?? null;
  if (typeof questionId === 'string' && !VALID_IDS.has(questionId)) questionId = null;
  if (typeof questionId !== 'string') questionId = null;

  const confidence = clamp01(Number(obj.confidence ?? 0));

  let candidates = Array.isArray(obj.candidates) ? obj.candidates : [];
  candidates = candidates.filter(id => typeof id === 'string' && VALID_IDS.has(id));
  candidates = candidates.slice(0, 3);

  const rephrased = typeof obj.rephrased === 'string' ? obj.rephrased.slice(0, 160) : '';
  const rationale = typeof obj.rationale === 'string' ? obj.rationale.slice(0, 240) : '';

  // Consistency: if matched, require a questionId; if ambiguous and no candidates,
  // fall back to off_topic.
  if (interp === 'matched' && !questionId) {
    return { interpretation: 'off_topic', questionId: null, confidence: 0, candidates: [], rephrased, rationale };
  }
  if (interp === 'ambiguous' && candidates.length === 0 && !questionId) {
    return { interpretation: 'off_topic', questionId: null, confidence: 0, candidates: [], rephrased, rationale };
  }

  return {
    interpretation: interp,
    questionId,
    confidence,
    candidates,
    rephrased,
    rationale,
  };
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
