/* Rate limiting best-effort pour les endpoints sensibles (login/register).
   Compteur à fenêtre glissante simple, en mémoire (borne par instance serverless).
   Objectif : ralentir les tentatives de brute force, pas bloquer un utilisateur légitime. */
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 10; // max requêtes par fenêtre

export { WINDOW_MS };

const buckets = new Map();

function now() {
  return Date.now();
}

function cleanup() {
  const t = now();
  for (const [key, { ts, count }] of buckets) {
    if (t - ts > WINDOW_MS) buckets.delete(key);
  }
}

export function rateLimit(key: string): { allowed: boolean; remaining: number } {
  cleanup();
  const entry = buckets.get(key) || { ts: now(), count: 0 };
  if (now() - entry.ts > WINDOW_MS) {
    entry.ts = now();
    entry.count = 0;
  }
  entry.count += 1;
  buckets.set(key, entry);
  const allowed = entry.count <= MAX_ATTEMPTS;
  return { allowed, remaining: Math.max(0, MAX_ATTEMPTS - entry.count) };
}

export function clientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
  const xff = req.headers['x-forwarded-for'];
  const forwarded = Array.isArray(xff) ? xff[0] : xff;
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers['x-real-ip'];
  const real = Array.isArray(realIp) ? realIp[0] : realIp;
  if (typeof real === 'string') return real;
  return 'unknown';
}
