-- 0002 · Cloudflare's own traffic history for the zone, copied in by scripts/cf-history.mjs before Cloudflare
-- forgets it: per-page detail after about 30 days, daily totals after a year. It covers the time before Wire
-- Telemetry began (27 Sep 2026) and carries on beside it as a cross-check.
--
-- These are edge counts, not beacon counts: every HTML response, bots included. `human` is our best guess
-- (a real browser family, not a known crawler). Cloudflare's free plan keeps no referrer, so there is no
-- source history.

CREATE TABLE cf_daily (
  day         TEXT PRIMARY KEY,
  uniques     INTEGER,            -- unique IP addresses that touched the zone, bots included
  requests    INTEGER,
  page_views  INTEGER,            -- Cloudflare's HTML page views, bots included
  threats     INTEGER,
  countries   TEXT,               -- JSON [[country, requests], …]
  browsers    TEXT,               -- JSON [[browser family, page views], …]
  fetched_at  INTEGER NOT NULL
);

CREATE TABLE cf_pages (
  day      TEXT NOT NULL,
  path     TEXT NOT NULL,
  kind     TEXT NOT NULL,         -- as page_views.kind, plus 'embed' (a dashboard frame inside an article)
  article  TEXT,
  video    TEXT,                  -- pipeline slug when the page belongs to a video
  device   TEXT NOT NULL,
  browser  TEXT NOT NULL,
  os       TEXT NOT NULL,
  country  TEXT NOT NULL,
  human    INTEGER NOT NULL,      -- 0 = a known crawler or no browser identity
  loads    INTEGER NOT NULL,      -- HTML responses (200)
  visits   INTEGER NOT NULL,      -- loads that started a visit (no referrer, or one from another site)
  PRIMARY KEY (day, path, device, browser, os, country)
);
CREATE INDEX cf_pages_video ON cf_pages (video, day);
