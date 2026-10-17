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
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
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
  'nebius': path.join(BOARDROOM, 'videos/nebius/dashboards'),
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
  // The eleven hero boards (ship/site/BOARDS.json); 30 to 63 are the cut's motion pages.
  'nebius': new Set([
    '01-the-split.html', '03-the-neocloud-stack.html', '04-172-ways-to-fail.html',
    '05-bigger-than-the-company.html', '06-metas-safety-net.html', '07-the-run.html',
    '08-a-megawatt-then-a-gigawatt.html', '09-one-deal-three-ways.html', '10-the-burn.html',
    '11-the-stock-and-the-short.html', '12-the-bear-case-answered.html',
  ]),
};

// Working files inside a video's assets/ that boards never load, skipped for every collection:
// this repo is public, and render job lists, style-frame sheets and build scripts print local
// machine paths (alexandr-wang's engrave.py did, 17 Oct 2026). docs/NOTES.md, Traps.
const SKIP = /^assets[\\/](.*\.py|render-jobs[^\\/]*\.json|renders-[^\\/]*\.json|slots-[^\\/]*\.json|style-frames[\\/][^\\/]*\.(html|json))$/;

// The check behind the skip list: a synced file that names a local user folder stops the sync.
const LOCAL_PATH = /[A-Za-z]:[\\/]{1,2}Users[\\/]{1,2}[^\\/\s"'`]+|\/Users\/[^/\s"'`]+\/|\/home\/[^/\s"'`]+\//;
const TEXT = /\.(html|js|mjs|json|css|svg|py|txt|md|csv)$/i;

// Files a board loads from outside its dashboards folder, copied to where its relative path
// resolves on the site. Nebius's sf.js reaches the two wordmarks at <video>/logos/, which from
// /analytics/nebius/<board>.html is /analytics/logos/.
const EXTRAS = {
  'nebius': [
    ['../logos/yandex-wordmark-color.svg', '../logos/yandex-wordmark-color.svg'],
    ['../logos/nebius-wordmark-white.svg', '../logos/nebius-wordmark-white.svg'],
  ],
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
    const filter = (from) => !SKIP.test(path.relative(src, from));
    await cp(path.join(src, entry.name), path.join(dest, entry.name), { recursive: true, filter });
    copied += 1;
  }

  const leaks = [];
  for (const f of await readdir(dest, { recursive: true })) {
    if (TEXT.test(f) && LOCAL_PATH.test(await readFile(path.join(dest, f), 'utf8'))) leaks.push(f);
  }
  if (leaks.length) {
    throw new Error(`${slug}: these files print a local machine path; skip them or fix them in the video folder:\n    ${leaks.join('\n    ')}`);
  }

  // Paths are relative to the source folder and to dest respectively.
  for (const [from, to] of EXTRAS[slug] ?? []) {
    const target = path.join(dest, to);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(src, from), target);
    console.log(`    extra ${path.relative(ROOT, target)}`);
  }

  // The board's <title> is the browser tab a reader sees on "Open full screen". Boards are
  // titled for the edit ("Boardroom Wire — The split (nebius H1, b025 to b028)"); the site
  // shows "The split · Boardroom Wire", like its own pages.
  for (const f of await readdir(dest)) {
    if (!BOARD.test(f)) continue;
    const p = path.join(dest, f);
    const html = await readFile(p, 'utf8');
    const out = html.replace(/<title>\s*Boardroom Wire\s+[—–-]\s+(.*?)(?:\s*\([^)]*\))?\s*<\/title>/,
      (_, t) => `<title>${t} · Boardroom Wire</title>`);
    if (out !== html) await writeFile(p, out);
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
