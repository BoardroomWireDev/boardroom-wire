-- 0005 · YouTube revenue (the channel is in the YouTube Partner Program; the owner granted yt-analytics-monetary.readonly).
-- US dollars. "revenue" is the channel's net estimated revenue (ad + YouTube Premium); gross is what advertisers paid.
-- CPM is gross revenue per 1,000 ad impressions; playback-based CPM per 1,000 monetized playbacks. RPM is not stored:
-- it is revenue per 1,000 views, computed from youtube_daily views, the way Studio does it.
-- YouTube revises estimates until a month is finalised, so the collector re-fetches the last ten days each night.

ALTER TABLE youtube_channel_daily ADD COLUMN revenue REAL;
ALTER TABLE youtube_channel_daily ADD COLUMN ad_revenue REAL;
ALTER TABLE youtube_channel_daily ADD COLUMN red_revenue REAL;
ALTER TABLE youtube_channel_daily ADD COLUMN gross_revenue REAL;
ALTER TABLE youtube_channel_daily ADD COLUMN cpm REAL;
ALTER TABLE youtube_channel_daily ADD COLUMN playback_cpm REAL;
ALTER TABLE youtube_channel_daily ADD COLUMN monetized_playbacks INTEGER;
ALTER TABLE youtube_channel_daily ADD COLUMN ad_impressions INTEGER;

-- per video per day; days with no revenue have no row
CREATE TABLE youtube_revenue_daily (
  youtube_id          TEXT NOT NULL,
  day                 TEXT NOT NULL,
  revenue             REAL,
  ad_revenue          REAL,
  red_revenue         REAL,
  gross_revenue       REAL,
  cpm                 REAL,
  playback_cpm        REAL,
  monetized_playbacks INTEGER,
  ad_impressions      INTEGER,
  PRIMARY KEY (youtube_id, day)
);

CREATE TABLE youtube_revenue_days_done (
  day         TEXT PRIMARY KEY,
  fetched_at  INTEGER NOT NULL
);
