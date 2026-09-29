-- 0006 · YouTube audience and retention (Phase 3 of the data plan). Filled by the collector's youtube-deep job
-- (server/youtube-deep.ts) and, for history, once by scripts/youtube-auth.mjs --deep-history. Read-only
-- yt-analytics scope; no new consent needed for the nightly job.

-- Breakdowns YouTube reports per day, channel-wide:
--   location (insightPlaybackLocationType) · source (insightTrafficSourceType) · device (deviceType)
--   os (operatingSystem) · subscribed (subscribedStatus) · card (value = impressions|clicks|teaser_impressions|teaser_clicks,
--   the count in views)
CREATE TABLE yt_dim_daily (
  dim      TEXT NOT NULL,
  day      TEXT NOT NULL,
  value    TEXT NOT NULL,
  views    INTEGER NOT NULL DEFAULT 0,
  minutes  REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (dim, day, value)
);

-- Breakdowns YouTube reports only for a period, kept per calendar month, channel-wide:
--   country · sharing (shares in views) · search (the search terms that found the channel, top 25)
--   ext (external sites, top 25) · related (videos that suggested ours, top 25; label = title) · demo (age|gender, pct)
CREATE TABLE yt_dim_monthly (
  dim      TEXT NOT NULL,
  month    TEXT NOT NULL,          -- YYYY-MM
  value    TEXT NOT NULL,
  label    TEXT,
  views    INTEGER,
  minutes  REAL,
  pct      REAL,                   -- viewerPercentage for demo
  PRIMARY KEY (dim, month, value)
);

-- Per video, lifetime (publication to the latest reported day): search terms (search), age and gender (demo).
CREATE TABLE yt_video_dim (
  youtube_id TEXT NOT NULL,
  dim        TEXT NOT NULL,
  value      TEXT NOT NULL,
  label      TEXT,
  views      INTEGER,
  minutes    REAL,
  pct        REAL,
  PRIMARY KEY (youtube_id, dim, value)
);

-- Audience retention per video, lifetime: 100 points along the video (ratio 0.01 … 1.00).
--   watch    audienceWatchRatio: share of views still watching (can pass 1.0 where people rewatch)
--   relative relativeRetentionPerformance: against YouTube videos of similar length, 0.5 = typical
--   started / stopped: share of views that began / ended at this point
CREATE TABLE yt_retention (
  youtube_id TEXT NOT NULL,
  ratio      REAL NOT NULL,
  watch      REAL,
  relative   REAL,
  started    REAL,
  stopped    REAL,
  PRIMARY KEY (youtube_id, ratio)
);

-- What has been fetched, so the nightly job refreshes what moves and backfills what is missing.
--   'daily:<dim>:<YYYY-MM>'  'monthly:<dim>:<YYYY-MM>'  'video:<youtube_id>'
CREATE TABLE yt_deep_done (
  item        TEXT PRIMARY KEY,
  fetched_at  INTEGER NOT NULL
);

-- Chapters from each video's description ("0:00 Title" lines), as JSON [[seconds, title], …].
ALTER TABLE videos ADD COLUMN chapters TEXT;
