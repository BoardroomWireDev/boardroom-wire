/**
 * Who may read the reports. Cloudflare Access sits in front of /telemetry/ and /api/telemetry/, and
 * this checks its signed token as well, so the data stays locked even if the Access rule is ever
 * missing or misconfigured. Until ACCESS_TEAM_DOMAIN and ACCESS_AUD are set, nobody gets in (fail closed).
 */
import type { Env } from './env';

let jwks: { keys: Array<JsonWebKey & { kid?: string }>; at: number } | null = null;

async function certs(team: string) {
  if (!jwks || Date.now() - jwks.at > 3_600_000) {
    const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
    if (!r.ok) throw new Error(`access certs ${r.status}`);
    jwks = { keys: ((await r.json()) as { keys: Array<JsonWebKey & { kid?: string }> }).keys, at: Date.now() };
  }
  return jwks.keys;
}

const b64url = (s: string) => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b + '='.repeat((4 - (b.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)));

function cookie(req: Request, name: string) {
  const m = (req.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export async function allowed(request: Request, env: Env): Promise<boolean> {
  const host = new URL(request.url).hostname;
  if (env.TELEMETRY_DEV_OPEN === '1' && (host === 'localhost' || host === '127.0.0.1')) return true;
  const team = env.ACCESS_TEAM_DOMAIN, aud = env.ACCESS_AUD;
  if (!team || !aud) return false;
  const token = request.headers.get('Cf-Access-Jwt-Assertion') ?? cookie(request, 'CF_Authorization');
  if (!token) return false;
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return false;
    const header = json(h), payload = json(p);
    const jwk = (await certs(team)).find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    const auds: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    return ok && auds.includes(aud) && payload.iss === `https://${team}` && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const locked = () => new Response(JSON.stringify({ error: 'locked' }), {
  status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
