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
const SCOPES = 'https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.readonly';

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

// secrets, through stdin only
for (const [name, value] of [['YT_CLIENT_ID', client.client_id], ['YT_CLIENT_SECRET', client.client_secret], ['YT_REFRESH_TOKEN', tok.refresh_token]]) {
  const r = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--config', 'collector/wrangler.toml'], { input: value, shell: true, encoding: 'utf8' });
  console.log(`${name}: ${r.status === 0 ? 'stored' : 'FAILED ' + (r.stderr || r.stdout).slice(-200)}`);
}
console.log('done. The collector can read the channel from its next run.');
