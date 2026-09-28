-- 0004 · YouTube (Phase 2 of the data plan, db/README.md). Filled nightly by the collector's youtube-daily job
-- (collector/src/index.ts, server/youtube-data.ts) from the YouTube Analytics and Data APIs, with the channel
-- owner's read-only consent. Keys: youtube_id everywhere; videos.slug is the pipeline's video slug (the key
-- page_views.video uses), so YouTube joins the site's own numbers.

CREATE TABLE videos (
  youtube_id  TEXT PRIMARY KEY,
  slug        TEXT,                     -- pipeline slug (videos\<slug>), from the site's articles; NULL for uploads with no article
  article     TEXT,                     -- /wire/<article>/
  title       TEXT NOT NULL,
  published   TEXT,                     -- ISO timestamp, from YouTube
  duration_s  INTEGER,
  short       INTEGER NOT NULL DEFAULT 0,   -- 1 = a Short (3 minutes or under, or tagged #shorts)
  updated_at  INTEGER NOT NULL
);
CREATE INDEX videos_slug ON videos (slug);

-- Per video per day. Days with no views have no row.
CREATE TABLE youtube_daily (
  youtube_id    TEXT NOT NULL,
  day           TEXT NOT NULL,
  views         INTEGER NOT NULL DEFAULT 0,
  minutes       REAL NOT NULL DEFAULT 0,    -- estimated minutes watched
  avg_view_s    REAL,                       -- average view duration, seconds
  avg_view_pct  REAL,                       -- average percentage of the video viewed
  subs_gained   INTEGER NOT NULL DEFAULT 0,
  subs_lost     INTEGER NOT NULL DEFAULT 0,
  likes         INTEGER NOT NULL DEFAULT 0,
  comments      INTEGER NOT NULL DEFAULT 0,
  shares        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (youtube_id, day)
);
CREATE INDEX youtube_daily_day ON youtube_daily (day);

-- The whole channel per day (includes anything not attributed to a single video).
CREATE TABLE youtube_channel_daily (
  day          TEXT PRIMARY KEY,
  views        INTEGER NOT NULL DEFAULT 0,
  minutes      REAL NOT NULL DEFAULT 0,
  subs_gained  INTEGER NOT NULL DEFAULT 0,
  subs_lost    INTEGER NOT NULL DEFAULT 0
);

-- Where each video's views came from, per day, in YouTube's own categories (SUBSCRIBER, YT_SEARCH,
-- RELATED_VIDEO, EXT_URL, ...). Fetched for videos in their first 60 days, when it moves most.
CREATE TABLE youtube_sources (
  youtube_id  TEXT NOT NULL,
  day         TEXT NOT NULL,
  source      TEXT NOT NULL,
  views       INTEGER NOT NULL DEFAULT 0,
  minutes     REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (youtube_id, day, source)
);

-- Which days' per-video numbers have been fetched, so the backfill can walk back a month at a time and the
-- nightly run can re-fetch the last ten days (YouTube revises recent days for two or three days).
CREATE TABLE youtube_days_done (
  day         TEXT PRIMARY KEY,
  fetched_at  INTEGER NOT NULL
);
