#!/usr/bin/env node
/**
 * One-time: let the collector read the channel's YouTube Analytics (read-only). Run by Claude with the owner at
 * the keyboard: npm run yt:auth
 *
 *   1. Reads the newest client_secret_*.json in Downloads (a Google Cloud "Desktop app" OAuth client).
 *   2. Opens Google's consent page. The owner picks the account (or brand account) that owns the channel and
 *      clicks Allow; the page redirects to a one-shot local listener on 127.0.0.1.
 *   3. Checks the consent belongs to the Boardroom Wire channel, and that Analytics answers.
 *   4. Stores YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN as bw-collector secrets through wrangler's
 *      stdin. Nothing is printed or written to disk.
 *
 * Scopes: yt-analytics.readonly, youtube.readonly and yt-analytics-monetary.readonly (revenue, CPM; the channel
 * is in the YouTube Partner Program). All read-only.
 *
 *   --revenue-history <file.sql>   while the consent is in hand, fetch the channel's whole revenue history (one
 *                                  request per day, every video at once) and write it as SQL for migration 0005's
 *                                  tables. Only numbers go in the file; the token never touches disk.
 *
 * The OAuth app must be "In production" (Google Auth Platform → Audience); in "Testing", Google revokes the
 * refresh token after 7 days.
 */
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CHANNEL_ID = 'UCthfphsDjHppg9SQv3JTdrg';
const SCOPES = ['yt-analytics.readonly', 'youtube.readonly', 'yt-analytics-monetary.readonly'].map((s) => 'https://www.googleapis.com/auth/' + s).join(' ');
const HISTORY = process.argv.includes('--revenue-history') ? process.argv[process.argv.indexOf('--revenue-history') + 1] : null;

const dl = join(homedir(), 'Downloads');
const file = readdirSync(dl).filter((f) => /^client_secret.*\.json$/i.test(f))
  .map((f) => ({ f, t: statSync(join(dl, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0]?.f;
if (!file) { console.error('No client_secret_*.json in Downloads. Download the Desktop client JSON from Google Cloud first.'); process.exit(1); }
const c = JSON.parse(readFileSync(join(dl, file), 'utf8'));
const client = c.installed ?? c.web;
if (!client?.client_id || !client?.client_secret) { console.error(`${file} is not an OAuth client file.`); process.exit(1); }
console.log(`client file: ${file}${c.installed ? ' (Desktop app)' : ' (not a Desktop client: create a Desktop app client)'}`);

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(12).toString('hex');

let port = 0;                                     // read while the listener is up: a closed server has no address
const code = await new Promise((resolve, reject) => {
  const srv = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/') { res.writeHead(404).end(); return; }
    const err = u.searchParams.get('error'), got = u.searchParams.get('code');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<body style="font:16px system-ui;background:#0a0a0f;color:#F5F1E5;display:grid;place-items:center;height:90vh"><p>${err ? 'Google said: ' + err + '. You can close this tab.' : 'Done. Boardroom Wire can now read your YouTube stats. You can close this tab.'}</p></body>`);
    srv.close();
    if (err) reject(new Error(`consent refused: ${err}`));
    else if (u.searchParams.get('state') !== state) reject(new Error('state mismatch'));
    else resolve({ got, redirect: `http://127.0.0.1:${port}` });
  }).listen(0, '127.0.0.1', () => {
    port = srv.address().port;
    const redirect = `http://127.0.0.1:${port}`;
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: client.client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPES, access_type: 'offline',
      prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256',
    });
    console.log('opening Google consent in your browser. Waiting for Allow…');
    spawn('rundll32', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' }).unref();
  });
  setTimeout(() => { srv.close(); reject(new Error('timed out after 10 minutes')); }, 600_000).unref();
});

const tok = await (await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ code: code.got, client_id: client.client_id, client_secret: client.client_secret, redirect_uri: code.redirect,
    grant_type: 'authorization_code', code_verifier: verifier }),
})).json();
if (!tok.refresh_token) { console.error('Google returned no refresh token:', tok.error ?? '(none)', tok.error_description ?? ''); process.exit(1); }
const auth = { Authorization: `Bearer ${tok.access_token}` };

// the right channel?
const me = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', { headers: auth })).json();
const ch = me.items?.[0];
console.log(`consent is for channel: ${ch?.snippet?.title ?? '(none)'} (${ch?.id ?? '-'})`);
if (ch?.id !== CHANNEL_ID) { console.error(`That is not the Boardroom Wire channel (${CHANNEL_ID}). Run again and pick the channel's account.`); process.exit(1); }

// Analytics answers? And does this channel get impressions / click-through in the API?
const d = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const rep = async (metrics) => fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ ids: 'channel==MINE', startDate: d(8), endDate: d(1), metrics })}`, { headers: auth });
const base = await (await rep('views,estimatedMinutesWatched,subscribersGained')).json();
if (base.error) { console.error('Analytics refused:', base.error.message); process.exit(1); }
const [views, minutes, subs] = base.rows?.[0] ?? [0, 0, 0];
console.log(`analytics ok: last 7 days ${views} views, ${Math.round(minutes / 60)} hours watched, +${subs} subscribers`);
const imp = await rep('videoThumbnailImpressions,videoThumbnailImpressionsClickRate');
console.log(`impressions + click-through in the API: ${imp.ok ? 'yes' : 'no (' + ((await imp.json()).error?.message ?? imp.status) + ')'}`);

// revenue answers?
const R_METRICS = 'estimatedRevenue,estimatedAdRevenue,estimatedRedPartnerRevenue,grossRevenue,cpm,playbackBasedCpm,monetizedPlaybacks,adImpressions';
const money = await (await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ ids: 'channel==MINE', startDate: d(29), endDate: d(2), metrics: 'estimatedRevenue,cpm,monetizedPlaybacks', currency: 'USD' })}`, { headers: auth })).json();
if (money.error) { console.error('Revenue refused:', money.error.message, '(was the revenue permission ticked on the consent page?)'); process.exit(1); }
const [rev, cpm, mp] = money.rows?.[0] ?? [0, 0, 0];
console.log(`revenue ok: last 28 reported days US$${Number(rev).toFixed(2)} estimated, CPM US$${Number(cpm).toFixed(2)}, ${mp} monetized playbacks`);

if (HISTORY) {
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const get = async (params) => {
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ ids: 'channel==MINE', currency: 'USD', ...params })}`, { headers: auth });
      const j = await r.json(); if (r.ok) { const cols = j.columnHeaders.map((c) => c.name); return (j.rows ?? []).map((row) => Object.fromEntries(cols.map((c, k) => [c, row[k]]))); }
      if (r.status < 500) throw new Error(JSON.stringify(j.error?.message ?? j).slice(0, 200));
      await new Promise((res) => setTimeout(res, 1500));
    }
    throw new Error('Google kept failing');
  };
  const first = '2025-05-01', last = d(1), sql = [], now = Date.now();
  const chan = await get({ startDate: first, endDate: last, dimensions: 'day', sort: 'day', metrics: R_METRICS });
  for (const r of chan) sql.push(`UPDATE youtube_channel_daily SET revenue = ${q(r.estimatedRevenue)}, ad_revenue = ${q(r.estimatedAdRevenue)}, red_revenue = ${q(r.estimatedRedPartnerRevenue)}, gross_revenue = ${q(r.grossRevenue)}, cpm = ${q(r.cpm)}, playback_cpm = ${q(r.playbackBasedCpm)}, monetized_playbacks = ${q(r.monetizedPlaybacks)}, ad_impressions = ${q(r.adImpressions)} WHERE day = ${q(r.day)};`);
  const days = []; for (let t = Date.parse(first); t <= Date.parse(last); t += 86_400_000) days.push(new Date(t).toISOString().slice(0, 10));
  let rows = 0, failed = [];
  for (let i = 0; i < days.length; i += 4) {
    await Promise.all(days.slice(i, i + 4).map(async (day) => {
      try {
        const rs = await get({ startDate: day, endDate: day, dimensions: 'video', sort: '-estimatedRevenue', maxResults: '200', metrics: R_METRICS });
        for (const r of rs) { rows++; sql.push(`INSERT OR REPLACE INTO youtube_revenue_daily (youtube_id, day, revenue, ad_revenue, red_revenue, gross_revenue, cpm, playback_cpm, monetized_playbacks, ad_impressions) VALUES (${[r.video, day, r.estimatedRevenue, r.estimatedAdRevenue, r.estimatedRedPartnerRevenue, r.grossRevenue, r.cpm, r.playbackBasedCpm, r.monetizedPlaybacks, r.adImpressions].map(q).join(', ')});`); }
        sql.push(`INSERT OR REPLACE INTO youtube_revenue_days_done (day, fetched_at) VALUES (${q(day)}, ${now});`);
      } catch (e) { failed.push(`${day}: ${e.message}`); }
    }));
    if (i % 80 === 0) console.log(`  ${Math.min(i + 4, days.length)} / ${days.length} days`);
  }
  (await import('node:fs')).writeFileSync(HISTORY, sql.join('\n'));
  const total = chan.reduce((a, r) => a + Number(r.estimatedRevenue || 0), 0);
  console.log(`revenue history: ${chan.length} channel days (US$${total.toFixed(2)} in all), ${rows} video-day rows, ${days.length - failed.length}/${days.length} days → ${HISTORY}`);
  if (failed.length) console.log('  failed days (the collector fills them later):', failed.slice(0, 5).join(' | '));
}

// secrets, through stdin only
for (const [name, value] of [['YT_CLIENT_ID', client.client_id], ['YT_CLIENT_SECRET', client.client_secret], ['YT_REFRESH_TOKEN', tok.refresh_token]]) {
  const r = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'put', name, '--config', 'collector/wrangler.toml'], { input: value, encoding: 'utf8' });
  console.log(`${name}: ${r.status === 0 ? 'stored' : 'FAILED ' + (r.stderr || r.stdout).slice(-200)}`);
}
console.log('done. The collector can read the channel from its next run.');
