/**
 * sync-dashboards.mjs
 *
 * Copies a video's dashboard set out of the Boardroom 2.0 folder and into
 * public/analytics/<collection>/, where Astro serves it verbatim.
 *
 *   npm run sync:dashboards                 every collection in SOURCES
 *   npm run sync:dashboards -- --only cursor
 *
 * The dashboards are authored for video capture and live in the video
 * project; this repo keeps its own copy so the site is self-contained and
 * deployable without the video project present. Re-run after editing a board.
 *
 * Per-collection source override: DASHBOARD_SRC_<SLUG>=/path (slug upper-
 * cased, dashes to underscores), e.g. DASHBOARD_SRC_CURSOR=… .
 *
 * Not shipped: index.html (the Astro collection page replaces it), posters/
 * (the site renders its own), beats.json, scripts/, README.md, dotfiles and
 * any stray top-level PNG captures.
 *
 * One transform is applied on the way in: the Boardroom Wire bust PNG is
 * 1.4MB for something rendered at 104x104. It gets resized to 256px.
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOARDROOM = path.resolve(ROOT, '../../OneDrive/Desktop/Boardroom 2.0');

const SOURCES = {
  'situational-awareness': path.join(BOARDROOM, 'Situational Awareness/dashboards'),
  'cursor': path.join(BOARDROOM, 'Cursor Vid/dashboards'),
};

const SKIP = new Set(['index.html', 'posters', 'beats.json', 'scripts', 'README.md', 'Thumbs.db']);
const LOGO = 'assets/logos/boardroom-wire-bust-transparent.png';
const LOGO_PX = 256;

const kb = (n) => `${Math.round(n / 1024)}KB`;

function parseArgs() {
  const i = process.argv.indexOf('--only');
  const only = i >= 0 ? (process.argv[i + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean) : null;
  return { only };
}

function sourceFor(slug) {
  const env = process.env[`DASHBOARD_SRC_${slug.toUpperCase().replace(/-/g, '_')}`];
  return env ?? SOURCES[slug];
}

async function syncOne(slug, src) {
  const dest = path.join(ROOT, 'public/analytics', slug);
  console.log(`\n  ${slug}\n    from ${src}`);

  // Posters are generated into DEST by render-posters.mjs and are not in the
  // source, so preserve them across a sync.
  const posters = path.join(dest, 'posters');
  const keepPosters = existsSync(posters);
  const stash = path.join(ROOT, '.posters-stash', slug);
  if (keepPosters) {
    await rm(stash, { recursive: true, force: true });
    await cp(posters, stash, { recursive: true });
  }

  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });

  let copied = 0;
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
    if (entry.isFile() && /\.png$/i.test(entry.name)) continue;   // stray captures
    await cp(path.join(src, entry.name), path.join(dest, entry.name), { recursive: true });
    copied += 1;
  }

  // Shrink the bust.
  const logoPath = path.join(dest, LOGO);
  if (existsSync(logoPath)) {
    const before = (await stat(logoPath)).size;
    const buf = await sharp(logoPath)
      .resize(LOGO_PX, LOGO_PX, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    await sharp(buf).toFile(logoPath);
    const after = (await stat(logoPath)).size;
    console.log(`    logo ${kb(before)} -> ${kb(after)}`);
  }

  if (keepPosters) {
    await cp(stash, posters, { recursive: true });
    await rm(path.join(ROOT, '.posters-stash'), { recursive: true, force: true });
    console.log('    posters preserved');
  }

  console.log(`    synced ${copied} entries -> public/analytics/${slug}`);
}

async function main() {
  const { only } = parseArgs();
  const targets = only ?? Object.keys(SOURCES);
  let failed = 0;
  for (const slug of targets) {
    const src = sourceFor(slug);
    if (!src) { console.error(`\n  Unknown collection "${slug}" — add it to SOURCES.\n`); failed++; continue; }
    if (!existsSync(src)) {
      console.error(`\n  ${slug}: source not found:\n    ${src}\n  Set DASHBOARD_SRC_${slug.toUpperCase().replace(/-/g, '_')} and re-run.\n`);
      if (only) failed++;
      continue;
    }
    await syncOne(slug, src);
  }
  console.log('');
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
