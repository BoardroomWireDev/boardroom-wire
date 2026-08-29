/**
 * sync-dashboards.mjs
 *
 * Copies the Situational Awareness dashboard set out of the video project and
 * into public/, where Astro serves it verbatim.
 *
 *   npm run sync:dashboards
 *
 * The dashboards are authored for video capture and live in the Boardroom 2.0
 * folder; this repo keeps its own copy so the site is self-contained and
 * deployable without the video project present. Re-run after editing a
 * dashboard.
 *
 * Override the source with DASHBOARD_SRC=/some/other/path.
 *
 * One transform is applied on the way in: the Boardroom Wire bust PNG is 1.4MB
 * for something rendered at 104x104. It gets resized to 256px, which takes the
 * whole payload from ~1.6MB to ~200KB.
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SRC = process.env.DASHBOARD_SRC ?? path.resolve(
  ROOT,
  '../../OneDrive/Desktop/Boardroom 2.0/Situational Awareness/dashboards',
);
const DEST = path.join(ROOT, 'public/analytics/situational-awareness');

/** index.html is replaced by the Astro collection page — don't ship a rival copy. */
const SKIP_FILES = new Set(['index.html']);

const LOGO = 'assets/logos/boardroom-wire-bust-transparent.png';
const LOGO_PX = 256;

const kb = (n) => `${Math.round(n / 1024)}KB`;

async function main() {
  if (!existsSync(SRC)) {
    console.error(`\n  Source not found:\n    ${SRC}\n`);
    console.error('  Set DASHBOARD_SRC to the dashboards folder and re-run.\n');
    process.exit(1);
  }

  // Posters are generated into DEST by render-posters.mjs and are not in the
  // source, so preserve them across a sync.
  const posters = path.join(DEST, 'posters');
  const keepPosters = existsSync(posters);
  const stash = path.join(ROOT, '.posters-stash');
  if (keepPosters) {
    await rm(stash, { recursive: true, force: true });
    await cp(posters, stash, { recursive: true });
  }

  await rm(DEST, { recursive: true, force: true });
  await mkdir(DEST, { recursive: true });

  let copied = 0;
  for (const entry of await readdir(SRC, { withFileTypes: true })) {
    if (entry.isFile() && SKIP_FILES.has(entry.name)) continue;
    await cp(path.join(SRC, entry.name), path.join(DEST, entry.name), { recursive: true });
    copied += 1;
  }

  // Shrink the bust.
  const logoPath = path.join(DEST, LOGO);
  if (existsSync(logoPath)) {
    const before = (await stat(logoPath)).size;
    const buf = await sharp(logoPath)
      .resize(LOGO_PX, LOGO_PX, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    await sharp(buf).toFile(logoPath);
    const after = (await stat(logoPath)).size;
    console.log(`  logo   ${kb(before)} -> ${kb(after)}`);
  }

  if (keepPosters) {
    await cp(stash, posters, { recursive: true });
    await rm(stash, { recursive: true, force: true });
    console.log('  posters preserved');
  }

  console.log(`  synced ${copied} entries -> public/analytics/situational-awareness\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
