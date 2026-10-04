/**
 * GET /api/telemetry/production — the production schedule for the Production tab: decisions waiting on the writer, the pipeline
 * and the release calendar. The data is written into server/production.json by the production repo (bw slate --production --push)
 * and bundled here, never published as a static file, so it is only ever served behind the Access check. Locked like every endpoint.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore } from '../../../server/range';
import data from '../../../server/production.json';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  return Response.json(data, { headers: noStore });
};
