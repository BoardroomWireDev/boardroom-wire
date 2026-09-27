/**
 * POST /api/t — the Wire Telemetry beacon (src/components/Telemetry.astro) lands here.
 *
 *   { k: 'view',  id, p: path, q: search, r: referrer, t: title, v: video, w: screen width, l: language }
 *   { k: 'leave', id, e: engaged ms, s: scroll % }        cumulative, so repeats are harmless
 *   { k: 'event', id, n: 'outbound', v: video, x: host + path }
 *
 * Adds city-level location and the network's owner from Cloudflare's edge, and a daily visitor hash
 * (see db/README.md for the privacy rules). Answers 204 at once and writes in the background.
 */
import type { Env } from '../../server/env';
import { isBot, netType, pageKind, parseUA, source } from '../../server/classify';

const MAX_BODY = 4096, DAY_MS = 86_400_000, KEEP_MONTHS = 25, ENGAGED_CAP = 30 * 60_000;
const str = (v: unknown, n: number) => (typeof v === 'string' && v ? v.slice(0, n) : null);
const int = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : 0);
const slug = (v: unknown) => { const s = str(v, 80); return s && /^[a-z0-9-]+$/.test(s) ? s : null; };
const noContent = (status = 204) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

// One salt per UTC day, cached per isolate. Making a new day's salt also does the housekeeping:
// yesterday's salt is kept (a visit that spans midnight), older salts and expired records go.
let saltCache: { day: string; salt: string } | null = null;
async function saltFor(db: D1Database, day: string): Promise<string> {
  if (saltCache?.day === day) return saltCache.salt;
  let row = await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first<{ salt: string }>();
  if (!row) {
    const fresh = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
    await db.prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?, ?)').bind(day, fresh).run();
    row = await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first<{ salt: string }>();
    const yesterday = new Date(Date.parse(day) - DAY_MS).toISOString().slice(0, 10);
    const cutoff = new Date(Date.parse(day)); cutoff.setUTCMonth(cutoff.getUTCMonth() - KEEP_MONTHS);
    const keepFrom = cutoff.toISOString().slice(0, 10);
    await db.batch([
      db.prepare('DELETE FROM salts WHERE day < ?').bind(yesterday),
      db.prepare('DELETE FROM page_views WHERE day < ?').bind(keepFrom),
      db.prepare('DELETE FROM events WHERE day < ?').bind(keepFrom),
    ]);
  }
  saltCache = { day, salt: row!.salt };
  return row!.salt;
}

async function visitorHash(salt: string, ip: string, ua: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ip}|${ua}`)));
  return [...sig.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const round1 = (v: unknown) => { const n = Number(v); return v != null && Number.isFinite(n) ? Math.round(n * 10) / 10 : null; };

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (!env.DB) return noContent(503);
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null' && new URL(origin).host !== url.host) return noContent(403);
  const text = await request.text();
  if (!text || text.length > MAX_BODY) return noContent(413);
  let b: Record<string, unknown>;
  try { b = JSON.parse(text); } catch { return noContent(400); }
  const id = str(b.id, 40);
  if (!id || !/^[A-Za-z0-9_-]{8,40}$/.test(id)) return noContent(400);

  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
  const ua = request.headers.get('User-Agent') ?? '';
  const bot = isBot(ua) ? 1 : 0;
  const db = env.DB;

  const work = (async () => {
    const visitor = await visitorHash(await saltFor(db, day), request.headers.get('CF-Connecting-IP') ?? '', ua);

    if (b.k === 'view') {
      const path = str(b.p, 300) ?? '/';
      if (!path.startsWith('/')) return;
      const { kind, article } = pageKind(path);
      let refHost = '', refPath: string | null = null;
      const r = str(b.r, 500);
      if (r) { try { const u = new URL(r); refHost = u.hostname.replace(/^www\./, ''); refPath = u.pathname.slice(0, 200); } catch { /* not a URL */ } }
      const q = new URLSearchParams(str(b.q, 500) ?? '');
      const utm = (k: string) => str(q.get(`utm_${k}`), 80);
      const cf = (request.cf ?? {}) as IncomingRequestCfProperties;
      const org = str(cf.asOrganization, 120);
      const { device, browser, os } = parseUA(ua);
      await db.prepare(`INSERT OR IGNORE INTO page_views
        (id, ts, day, visitor, path, kind, article, video, title, ref_host, ref_path, source,
         utm_source, utm_medium, utm_campaign, utm_content, country, region, city, continent, tz, lat, lon,
         asn, org, net, device, browser, os, screen_w, lang, bot)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        id, now, day, visitor, path, kind, article, slug(b.v), str(b.t, 200), refHost, refPath, source(refHost, url.hostname, utm('source')),
        utm('source'), utm('medium'), utm('campaign'), utm('content'),
        str(cf.country, 2), str(cf.region, 80), str(cf.city, 80), str(cf.continent, 2), str(cf.timezone, 60),
        round1(cf.latitude), round1(cf.longitude),
        typeof cf.asn === 'number' ? cf.asn : null, org, netType(org), device, browser, os,
        int(b.w, 0, 10_000) || null, str(b.l, 20), bot,
      ).run();
    } else if (b.k === 'leave') {
      await db.prepare('UPDATE page_views SET engaged_ms = MAX(engaged_ms, ?), scroll_pct = MAX(scroll_pct, ?) WHERE id = ?')
        .bind(int(b.e, 0, ENGAGED_CAP), int(b.s, 0, 100), id).run();
    } else if (b.k === 'event' && b.n === 'outbound') {
      await db.prepare('INSERT INTO events (ts, day, view_id, visitor, name, target, video, bot) VALUES (?,?,?,?,?,?,?,?)')
        .bind(now, day, id, visitor, 'outbound', str(b.x, 200), slug(b.v), bot).run();
    }
  })().catch((err) => console.error('[telemetry] write failed', err));

  waitUntil(work);
  return noContent();
};
