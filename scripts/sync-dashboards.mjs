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
 * Shipped, and nothing else: the numbered boards (NN-name.html) plus the
 * shared/ and assets/ folders they load. The video folder also holds working
 * files the site must never publish — the bg-*.html plate pages, concepts.html,
 * clips/, index.html (the Astro collection page replaces it), beats.json,
 * backups — so this is an allow-list, not a skip-list. posters/ are rendered
 * by this repo and preserved across a sync.
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

// Every video lives at Boardroom 2.0/videos/<slug>/ (since 24 Sep 2026).
const SOURCES = {
  'situational-awareness': path.join(BOARDROOM, 'videos/situational-awareness/dashboards'),
  'cursor': path.join(BOARDROOM, 'videos/cursor/dashboards'),
  'anthropic-ipo': path.join(BOARDROOM, 'videos/anthropic-ipo/dashboards'),
  'alexandr-wang': path.join(BOARDROOM, 'videos/alexandr-wang/dashboards'),
};

// Optional per-collection board list. Since Anthropic IPO, a video folder holds
// its motion pages for the cut (chapter cards, end card, voice-timed pages)
// beside the boards made for the site, all numbered alike. Where a list is
// given, only those boards ship; without one, every NN-name.html does.
const BOARDS = {
  'anthropic-ipo': new Set([
    '20-ledger.html', '21-revenue.html', '22-valuation.html', '23-money-map.html',
    '50-gap.html', '51-runrate.html', '52-charge.html', '53-dollar.html',
    '54-bill.html', '56-terms.html', '57-record.html',
  ]),
  // The final-cut version of each board (the folder also keeps every earlier pass).
  // 06-the-chart and 08-the-face-of-it are left out: they load captures from the
  // video's stock-pack, which the site does not carry, and render empty on the web.
  'alexandr-wang': new Set([
    '01-nothing-to-show-p6c.html', '02-what-14-billion-bought.html', '42-the-offer.html',
    '03-from-18-to-52-p6b.html', '04-how-muse-works-p6c.html', '05-free-in-front-of-billions-p6.html',
    '07-the-stock-p6b.html',
    '09-three-agents.html', '11-the-bill-p6c.html', '14-aa-rank-p6.html',
  ]),
};

const BOARD = /^\d\d-[\w-]+\.html$/;
const DIRS = new Set(['shared', 'assets']);
const ships = (entry, slug) => entry.isFile()
  ? BOARD.test(entry.name) && (!BOARDS[slug] || BOARDS[slug].has(entry.name))
  : entry.isDirectory() && DIRS.has(entry.name);
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
    if (!ships(entry, slug)) continue;
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
      // A missing source always fails: skipping it silently leaves the site on a stale copy.
      console.error(`\n  ${slug}: source not found:\n    ${src}\n  Set DASHBOARD_SRC_${slug.toUpperCase().replace(/-/g, '_')} and re-run.\n`);
      failed++;
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
