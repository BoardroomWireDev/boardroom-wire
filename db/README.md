# The Boardroom Wire data store

One Cloudflare D1 database, `bw-data`, bound to the Pages project as `DB`. It is the system of record
for how the business performs: who reads the site, and later how each video does on YouTube and
what it earns in subscribers. The Research OS (`Boardroom 2.0\Boardroom OS\`) stays separate. It is
a ledger of sourced claims about companies, not performance data. The two meet through the company
keys in `Boardroom 2.0\library\orgs.json`.

## Keys every table shares

| Key | What it is | Where it comes from |
|---|---|---|
| `video` | the pipeline's video slug, e.g. `situational-awareness` | `videos\<slug>` in Boardroom 2.0; the analytics collection slug; `<meta name="bw:video">` on the site |
| `youtube_id` | the 11-character YouTube id | `project.json` → `youtube`; article frontmatter `youtube` |
| `article` | the `/wire/<slug>/` slug | `src/content/articles/<slug>.mdx` |
| `day` | the UTC date, `YYYY-MM-DD` | every table with a time |

## Phases

1. **Wire Telemetry (built).** `page_views`, `events` and `salts`
   (`migrations/0001_telemetry.sql`).
   - The beacon: `src/components/Telemetry.astro`, one inline script on every page via `SeoHead`.
   - Ingest: `functions/api/t.ts`.
   - Reports: `functions/api/telemetry/*`.
   - The private dashboard: `src/pages/telemetry/`, behind Cloudflare Access.
2. **Videos and YouTube.** Two new tables:
   - `videos`: slug, youtube_id, article, title, published, tier and companies covered, sent by the
     pipeline when a video ships.
   - `youtube_daily`: per video per day, pulled nightly from the YouTube Analytics API. It holds
     views, watch time, average view duration, impressions, click-through rate, subscribers gained
     and lost, traffic sources and countries.

   This needs the channel owner's one-time OAuth consent.
3. **Retention against the edit.** Weekly retention curves per video, joined to the cue map so the
   editing framework learns where viewers actually leave.
4. **Later.** Substack subscribers and opens (CSV import), consented signups from the site, X.

**Cloudflare history (built).** `cf_daily` and `cf_pages` (`migrations/0002_cloudflare_history.sql`) hold Cloudflare's own
edge counts, filled by `npm run cf:history` (`scripts/cf-history.mjs`).
- Daily totals go back to 26 Apr 2026, when the site moved to Cloudflare. Cloudflare keeps these for a year.
- Per-page detail comes with device, browser, OS and country, but no referrer on this plan. Cloudflare keeps
  it for only 30 days, so **run the import at least monthly** or that detail is lost.
- `human` means a real browser family. Dashboard frames loaded inside articles are `kind = embed`, and
  scanners probing for files are dropped at import.

The dashboard shows it as "Before Wire Telemetry" (`/api/telemetry/history`).

## Privacy rules (these are promises on /privacy/)

- No cookies, and nothing stored on the reader's device. No IP address stored, ever.
- Visitors are counted with a keyed hash of IP + user agent. The key is a random salt that changes
  every UTC day and is deleted after two days. So a person reading on two days counts twice, and
  nobody, us included, can link the hash back to an address.
- Location is city-level, as Cloudflare's edge reports it. Coordinates are rounded to 0.1°.
- Global Privacy Control and Do Not Track switch the beacon off.
- Page records older than 25 months are deleted.
- Every row has `env`: `production` (boardroomwire.com), `preview` (*.pages.dev) or `local`. Reports
  read production unless asked (`/telemetry/?env=preview`), so previews and tests never touch the real numbers.

## Commands

```sh
npm run db:local      # apply migrations to the local copy (.wrangler/state)
npm run db:remote     # apply migrations to the live database
npm run edge          # build, then serve the site with its functions and the local database on :8788
npx wrangler d1 execute bw-data --remote --command "SELECT day, COUNT(*) FROM page_views WHERE bot = 0 GROUP BY day"
```

For local development, `.dev.vars` holds `TELEMETRY_DEV_OPEN=1`. It opens the report API on
localhost only, and it never goes in git.
