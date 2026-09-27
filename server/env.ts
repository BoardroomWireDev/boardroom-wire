/** Bindings and settings the Pages Functions see (wrangler.toml, .dev.vars). */
export interface Env {
  DB: D1Database;
  /** e.g. "boardroomwire.cloudflareaccess.com". Empty until Cloudflare Access is set up: reports stay locked. */
  ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's AUD tag. */
  ACCESS_AUD?: string;
  /** "1" in .dev.vars only: opens the report API on localhost. Never set in production. */
  TELEMETRY_DEV_OPEN?: string;
}
