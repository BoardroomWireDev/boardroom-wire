-- 0001 · Wire Telemetry: first-party page views and clicks (Phase 1 of the data plan, db/README.md).
--
-- Keys shared with every later phase:
--   video   = the pipeline's video slug (videos\<slug> in Boardroom 2.0, the analytics collection slug)
--   article = the /wire/<slug>/ slug
--   day     = the UTC date, YYYY-MM-DD
-- No IP address is ever stored. `visitor` is a keyed hash of IP + user agent made with that day's
-- random salt, and salts are deleted after two days, so a visitor can't be followed across days or
-- traced back to an address, even by us.

CREATE TABLE page_views (
  id          TEXT PRIMARY KEY,              -- random per page load, made in the browser; the leave beacon updates this row
  ts          INTEGER NOT NULL,              -- unix ms, UTC
  day         TEXT NOT NULL,
  visitor     TEXT NOT NULL,
  path        TEXT NOT NULL,
  kind        TEXT NOT NULL,                 -- home | wire | analytics | videos | about | privacy | other
  article     TEXT,
  video       TEXT,                          -- from <meta name="bw:video"> on pages that belong to a video
  title       TEXT,
  ref_host    TEXT,                          -- referrer host without www ('' when none)
  ref_path    TEXT,
  source      TEXT NOT NULL,                 -- youtube | x | substack | google | … | internal | direct | other (server/classify.ts)
  utm_source  TEXT,
  utm_medium  TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  country     TEXT,                          -- ISO 3166-1 alpha-2, from Cloudflare's edge
  region      TEXT,
  city        TEXT,
  continent   TEXT,
  tz          TEXT,
  lat         REAL,                          -- city-level, rounded to 0.1°
  lon         REAL,
  asn         INTEGER,
  org         TEXT,                          -- the network's registered owner
  net         TEXT,                          -- isp | hosting | org (heuristic)
  device      TEXT,                          -- desktop | mobile | tablet
  browser     TEXT,
  os          TEXT,
  screen_w    INTEGER,
  lang        TEXT,
  engaged_ms  INTEGER NOT NULL DEFAULT 0,    -- time the page was visible, capped at 30 min
  scroll_pct  INTEGER NOT NULL DEFAULT 0,    -- deepest scroll, 0–100
  bot         INTEGER NOT NULL DEFAULT 0     -- 1 = crawler, script or headless browser by user agent; kept, left out of reports
);
CREATE INDEX pv_ts      ON page_views (ts);
CREATE INDEX pv_day     ON page_views (day);
CREATE INDEX pv_video   ON page_views (video, day);
CREATE INDEX pv_visitor ON page_views (visitor, ts);

CREATE TABLE events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,
  day      TEXT NOT NULL,
  view_id  TEXT,                             -- page_views.id of the page it happened on
  visitor  TEXT NOT NULL,
  name     TEXT NOT NULL,                    -- outbound
  target   TEXT,                             -- host + path, e.g. youtube.com/watch?v=6bCtWBzxjsE
  video    TEXT,
  bot      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ev_ts ON events (ts, name);

-- One random salt per UTC day. Today's and yesterday's are kept; older ones are deleted.
CREATE TABLE salts (
  day  TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);
