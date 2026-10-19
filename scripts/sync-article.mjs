/**
 * sync-article.mjs
 *
 * One re-runnable step that brings a video's article onto the site from the video project, so
 * no number on the page is typed here:
 *
 *   npm run sync:article -- tesla-spacex
 *
 *   1. syncs the boards (scripts/sync-dashboards.mjs --only <slug>);
 *   2. opens each board headless at ?final&still and reads what it rendered: its credit line,
 *      the figure keys it drew, and its footage windows (hidden on the web, which has no footage);
 *   3. writes src/data/figures/<slug>.json: those, plus every figure in the video's
 *      shared/data.js (display, label, credit, tier, date). The manifest and the article's
 *      breakdown table print from this file;
 *   4. rebuilds the body of src/content/articles/<slug>.mdx from the words: the video's
 *      ship/site/ARTICLE.md when the head writer has written it, else the essay generated from
 *      the locked script. Each board lands after the paragraph holding its anchor; a missing
 *      anchor stops the run, so a re-cut script cannot drop a board silently. The frontmatter
 *      already in the .mdx is kept;
 *   5. renders the posters (scripts/render-posters.mjs --only <slug>).
 *
 * Print-only changes to the words belong in ARTICLE.md, never in the .mdx (it is regenerated).
 * Override Chrome with CHROME_PATH.
 */
import { execFile, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOARDROOM = path.resolve(ROOT, '../../OneDrive/Desktop/Boardroom 2.0');

/* Per article: the boards (file, web slug, the words of the paragraph it follows), the quotes the
   video plays as clips (shown in print from data.js, after their paragraph), and the narration's
   pointer to this page, which print drops; the breakdown table closes the article instead. */
const ARTICLES = {
  'tesla-spacex': {
    boards: [
      ['02-the-tune-changes.html', 'the-tune-changes', 'people are betting real money on it'],
      ['03-the-last-big-piece.html', 'the-last-big-piece', 'And Tesla is the last big piece.'],
      ['04-the-deal-on-the-table.html', 'the-deal-on-the-table', 'Together, that\'s a company worth'],
      ['05-the-autonomy-bet.html', 'the-autonomy-bet', 'Tesla\'s value is a bet on autonomy'],
      ['06-the-five-layers.html', 'the-five-layers', 'the money is moving up the layers fast'],
      ['07-the-loop.html', 'the-loop', 'You can already see it.'],
      ['08-each-on-its-own.html', 'each-on-its-own', 'SpaceX is smaller, but growing much faster.'],
      ['09-one-balance-sheet.html', 'one-balance-sheet', 'Put them together'],
      ['10-a-hundred-trillion.html', 'a-hundred-trillion', 'I\'m not underwriting that $100 trillion number'],
      ['11-control.html', 'control', 'the first one is control'],
    ],
    quotes: [
      ['Musk told the crowd exactly what they were about to see.', 'clue_roadster_musk_collaboration_remark_oct2026'],
    ],
    breakdown: 'is up on boardroomwire.com',
  },
};

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => existsSync(p));

function step(label, args) {
  console.log(`\n  ${label}`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${label} failed`);
}

/* What the board drew: Chrome renders it and dumps the DOM. The timeout kills only this child. */
async function readBoard(file) {
  const url = `${pathToFileURL(file).href}?final&still&fit=0`;
  const { stdout } = await run(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
    '--window-size=1920,1080', '--virtual-time-budget=9000', '--dump-dom', url], { timeout: 90000, maxBuffer: 64e6 });
  const credit = (stdout.match(/class="bw-source"[^>]*>([^<]*)</) || [])[1];
  const figures = (stdout.match(/data-figures="([^"]*)"/) || [])[1];
  const slots = JSON.parse((stdout.match(/<script id="bw-slots"[^>]*>([^<]*)</) || [])[1] || '{"slots":[]}').slots;
  if (!credit || !figures) throw new Error(`${path.basename(file)}: no credit line or figure list rendered`);
  const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return {
    credit: unescape(credit).trim(),
    figures: figures.trim().split(/\s+/),
    noslot: slots.filter((s) => s.kind === 'footage').map((s) => s.id).join(','),
  };
}

/* The words: ARTICLE.md (frontmatter dropped) or the essay (its title and generator note dropped). */
async function words(video) {
  const article = path.join(video, 'ship/site/ARTICLE.md');
  if (existsSync(article)) {
    console.log('    words from ship/site/ARTICLE.md');
    return (await readFile(article, 'utf8')).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  }
  const essay = path.join(video, `${path.basename(video)}-essay.md`);
  console.log(`    words from ${path.basename(essay)} (no ship/site/ARTICLE.md yet)`);
  const text = await readFile(essay, 'utf8');
  return text.replace(/^# .*\r?\n\r?\n[\s\S]*?\r?\n\r?\n/, '');
}

async function main() {
  const slug = process.argv[2];
  const cfg = ARTICLES[slug];
  if (!cfg) throw new Error(`No article config for "${slug}"; add it to ARTICLES in scripts/sync-article.mjs.`);
  if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH.');
  const video = path.join(BOARDROOM, 'videos', slug);

  step(`1. boards`, ['scripts/sync-dashboards.mjs', '--only', slug]);

  console.log('\n  2. what each board renders');
  const pub = path.join(ROOT, 'public/analytics', slug);
  const ctx = { module: {} };
  vm.runInNewContext(`${await readFile(path.join(pub, 'shared/data.js'), 'utf8')}\n;module.exports = BW_DATA;`, ctx);
  const data = ctx.module.exports;
  const boards = {};
  for (const [file, web] of cfg.boards) {
    boards[web] = { file, ...(await readBoard(path.join(pub, file))) };
    console.log(`    ${web.padEnd(24)} ${boards[web].figures.length} figures${boards[web].noslot ? ', footage hidden' : ''}`);
  }

  console.log('\n  3. figures');
  const figures = {};
  for (const [k, f] of Object.entries(data.figures)) {
    const sources = (Array.isArray(f.src) ? f.src : [f.src]).filter(Boolean).map((s) => data.sources[s]?.name ?? s);
    figures[k] = { display: f.display ?? String(f.v), label: f.label ?? '', credit: f.credit ?? '', tier: f.tier, asOf: f.asOf,
      sources, ...(f.mandatory && { mandatory: f.mandatory }) };
  }
  const json = path.join(ROOT, 'src/data/figures', `${slug}.json`);
  await mkdir(path.dirname(json), { recursive: true });
  await writeFile(json, `${JSON.stringify({ source: `videos/${slug}/dashboards/shared/data.js`, boards, figures }, null, 1)}\n`);
  console.log(`    ${Object.keys(figures).length} figures -> ${path.relative(ROOT, json)}`);

  console.log('\n  4. article');
  const mdx = path.join(ROOT, 'src/content/articles', `${slug}.mdx`);
  if (!existsSync(mdx)) throw new Error(`Write the frontmatter of ${path.relative(ROOT, mdx)} first; this step keeps it and rebuilds the body.`);
  const front = (await readFile(mdx, 'utf8')).match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)[0];
  const paras = (await words(video)).trim().split(/\r?\n\s*\r?\n/);
  const at = (needle) => {
    const i = paras.findIndex((p) => p.includes(needle));
    if (i < 0) throw new Error(`No paragraph holds "${needle}": the words changed; update ARTICLES in scripts/sync-article.mjs.`);
    return i;
  };
  const after = new Map();
  const add = (i, s) => after.set(i, [...(after.get(i) ?? []), s]);
  for (const [needle, key] of cfg.quotes) {
    if (!figures[key]) throw new Error(`No figure ${key} in data.js for the quote after "${needle}".`);
    add(at(needle), `<Quote collection="${slug}" figure="${key}" />`);
  }
  for (const [, web, needle] of cfg.boards) add(at(needle), `<DashboardEmbed collection="${slug}" slug="${web}" />`);
  const drop = at(cfg.breakdown);
  const body = [
    ...paras.flatMap((p, i) => i === drop ? [] : [p, ...(after.get(i) ?? [])]),
    '## The Full Breakdown',
    `<Breakdown collection="${slug}" />`,
  ];
  const imports = [
    "import Breakdown from '../../components/Breakdown.astro';",
    "import Quote from '../../components/Quote.astro';",
  ];
  await writeFile(mdx, `${front}\n${imports.join('\n')}\n\n${body.join('\n\n')}\n`);
  console.log(`    ${paras.length} paragraphs, ${cfg.boards.length} boards -> ${path.relative(ROOT, mdx)}`);

  step('5. posters', ['scripts/render-posters.mjs', '--only', slug]);
  console.log('\n  Done. Next: npm run build, then check /wire/' + slug + '/ in a browser.\n');
}

main().catch((err) => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});
