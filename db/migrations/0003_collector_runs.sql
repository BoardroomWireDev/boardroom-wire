-- 0003 · The daily collector's run log (collector/src/index.ts). One row per job per run, kept 400 days.
-- The telemetry dashboard reads the latest rows to warn when the daily copy has stopped.
CREATE TABLE collector_runs (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,       -- unix ms
  job     TEXT NOT NULL,          -- cloudflare-history (later: youtube-daily, youtube-retention)
  ok      INTEGER NOT NULL,       -- 1 = succeeded
  detail  TEXT                    -- what it copied, or the error
);
CREATE INDEX collector_runs_job ON collector_runs (job, ts);
