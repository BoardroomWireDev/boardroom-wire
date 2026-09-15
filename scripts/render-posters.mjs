/**
 * render-posters.mjs
 *
 * Renders a still of every dashboard for use as a card thumbnail, the mobile
 * fallback image, and the OG link preview.
 *
 *   npm run render:posters                  every collection
 *   npm run render:posters -- --only cursor
 *
 * Each dashboard is opened at `?final&still` — its finished frame with all
 * ambient motion disabled — and captured at 1920x1080 by headless Chrome, then
 * downscaled by sharp.
 *
 * Outputs, relative to public/analytics/<collection>/:
 *   posters/<slug>.webp        1920x1080  full view / mobile pinch-zoom
 *   posters/thumb/<slug>.webp   640x360   card thumbnails
 *   posters/og/<slug>.jpg      1200x630   link previews
 *
 * Formats matter here: Chrome writes ~900KB PNGs, and fourteen of those on one
 * card grid is a 12MB page. WebP holds these dark gradients far better than
 * JPEG at a fraction of PNG's weight. OG stays JPEG because social crawlers
 * are still unreliable with WebP.
 *
 * Run after `npm run sync:dashboards`. Override Chrome with CHROME_PATH.
 * Needs Node 22.6+ (the manifest is imported as TypeScript).
 */
import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

import { collections } from '../src/data/analytics.ts';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));

const OG_W = 1200;
const OG_H = 630;
const THUMB_W = 640;
const THUMB_H = 360;

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? (process.argv[onlyIdx + 1] ?? '').split(',').map((s) => s.trim()) : null;

async function shoot(chromePath, fileUrl, outPath) {
  await run(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-extensions',
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    `--screenshot=${outPath}`,
    // Long enough for the reveal to resolve even though ?final skips it, and
    // for the webfonts to land — a short budget captures unstyled type.
    '--virtual-time-budget=9000',
    fileUrl,
  ]).catch((err) => {
    // Chrome exits non-zero on some benign warnings but still writes the file.
    if (!existsSync(outPath)) throw err;
  });
}

async function main() {
  if (!chrome) {
    console.error('\n  Chrome not found. Set CHROME_PATH to your Chrome binary.\n');
    process.exit(1);
  }

  const targets = only ? collections.filter((c) => only.includes(c.slug)) : collections;
  if (!targets.length) {
    console.error(`\n  No collection matched --only ${only?.join(',')}\n`);
    process.exit(1);
  }

  for (const c of targets) {
    const base = path.join(ROOT, 'public/analytics', c.slug);
    const posters = path.join(base, 'posters');
    const ogDir = path.join(posters, 'og');
    const thumbDir = path.join(posters, 'thumb');

    if (!existsSync(base)) {
      console.error(`\n  Missing ${base} — run "npm run sync:dashboards -- --only ${c.slug}" first.\n`);
      process.exit(1);
    }

    await rm(posters, { recursive: true, force: true });
    await mkdir(ogDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    console.log(`\n  ${c.title}`);

    for (const d of c.dashboards) {
      const src = path.join(base, d.file);
      if (!existsSync(src)) {
        console.error(`    !! missing ${d.file}`);
        continue;
      }

      // fit=0 is a no-op on boards without a fit wrapper and keeps newer
      // boards from scaling to the capture window.
      const url = `${pathToFileURL(src).href}?final&still&fit=0`;
      const shot = path.join(posters, `${d.slug}.capture.png`);
      await shoot(chrome, url, shot);

      const full = path.join(posters, `${d.slug}.webp`);
      await sharp(shot).webp({ quality: 82, effort: 5 }).toFile(full);

      await sharp(shot)
        .resize(THUMB_W, THUMB_H)
        .webp({ quality: 78, effort: 5 })
        .toFile(path.join(thumbDir, `${d.slug}.webp`));

      // 16:9 into a 1.9:1 frame — contain on black rather than crop, so no
      // part of the dashboard is lost from the preview.
      await sharp(shot)
        .resize(OG_W, OG_H, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(path.join(ogDir, `${d.slug}.jpg`));

      await rm(shot, { force: true });

      const kb = Math.round((await stat(full)).size / 1024);
      console.log(`    ${String(d.n).padStart(2, '0')}  ${d.slug.padEnd(36)} ${kb}KB`);
    }

    const n = (await readdir(posters)).filter((f) => f.endsWith('.webp')).length;
    console.log(`\n  ${n} posters + ${n} thumbs + ${n} OG images\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
