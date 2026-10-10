/* Top free (alexandr-wang, Ive, 9 Oct 2026): the US App Store's iPhone Top Charts (Free), rebuilt as type, icons and rules.
   Shared by 21-top-free (the swap) and 22-the-path (its opening frame is 21's last). Not a screenshot: 06-the-chart carries the
   captures themselves; this is the fast teaser of the same two dated snapshots.

   The rows are Apple's own chart as the Internet Archive captured it (DELIVERY-007, the stock-pack PNGs that 06 and b002 use):
     10 Sep 2026, 18:15 UTC   1 ChatGPT · 2 Muse from Meta · 3 Vinted        (wayback-20260910181506)
     18 Sep 2026, 15:46 UTC   1 Muse from Meta · 2 ChatGPT · 3 Amazon Prime Video   (wayback-20260918154646)
   Every rank is read from data.js (KEYS below, six ledger rows Goldman keyed from the two captures, 10 Oct): each date's rows are
   ordered by their values and the numerals print them; the page throws if a key is missing, misdated, or the dates disagree.
   Icons: the apps' own App Store artwork (iTunes lookup, 9 Oct 2026), assets\app-icons\.

   TopFree.chart(host, fromIso, toIso, F) builds the rows at fromIso and returns:
     swap(tl, t, dur)   the move to toIso at t: Muse and the app it passes trade rows, rank 3 crossfades, the day rolls
     setTo()            the final state (rest)
     drain(tl, t, dur)  the colour leaves (22-the-path's rewind)                                                        */
const TopFree = (() => {
  const ICON = 'assets/app-icons/';
  const APPS = {
    muse:    { name: 'Muse from Meta',     icon: 'muse.png' },
    chatgpt: { name: 'ChatGPT',            icon: 'chatgpt.png' },
    vinted:  { name: 'Vinted',             icon: 'vinted.png' },
    prime:   { name: 'Amazon Prime Video', icon: 'primevideo.png' }
  };
  /* the ranks, from data.js (Goldman keyed all six from the two captures, 10 Oct): each date's rows are ordered by their keys' values */
  const KEYS = { '2026-09-10': { chatgpt: 'chatgpt_top_free_apple_0910', muse: 'muse_top_free_apple_0910', vinted: 'vinted_top_free_apple_0910' },
                 '2026-09-18': { muse: 'muse_top_free_apple_0918', chatgpt: 'chatgpt_top_free_apple_0918', prime: 'prime_video_top_free_apple_0918' } };
  const USES = Object.values(KEYS).flatMap(o => Object.values(o));
  const G = { x0: 250, x1: 1670, top: 222, rowH: 220, numR: 440, iconX: 500, icon: 172, nameX: 730 };   /* pass 4: wide, so the tiles fill the frame */
  const cy = (i) => G.top + G.rowH * (i + .5);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const css = `
  .tf { position: absolute; inset: 0; transform-origin: 960px 560px; transform-style: preserve-3d; }
  /* depth (pass 4): each row is a lit tile in a space the camera moves through. The light is a key from above left: a bright top edge,
     a face that falls off downward, a shadow cast below; the rank numerals float in front of the tiles, the date above them. */
  .tf-row { transform-style: preserve-3d; }
  .tf-tile { position: absolute; left: ${G.x0 - 28}px; top: 12px; width: ${G.x1 - G.x0 + 56}px; height: ${G.rowH - 24}px; border-radius: 22px;
             background: linear-gradient(168deg, rgba(var(--cream-rgb), .10) 0%, rgba(var(--cream-rgb), .035) 48%, rgba(var(--cream-rgb), .012) 100%), #0d0d13;
             box-shadow: inset 0 2px 0 rgba(var(--cream-rgb), .22), inset 0 -2px 0 rgba(0, 0, 0, .7), inset 1px 0 0 rgba(var(--cream-rgb), .06),
                         0 46px 60px -26px rgba(0, 0, 0, .95), 0 8px 18px rgba(0, 0, 0, .55); }
  .tf-tile.muse { box-shadow: inset 0 2px 0 rgba(var(--gold-rgb), .8), inset 0 -2px 0 rgba(0, 0, 0, .7), inset 1px 0 0 rgba(var(--gold-rgb), .25),
                              0 60px 80px -28px rgba(0, 0, 0, 1), 0 10px 22px rgba(0, 0, 0, .6);
                  background: linear-gradient(168deg, rgba(var(--gold-rgb), .13) 0%, rgba(var(--cream-rgb), .04) 46%, rgba(var(--cream-rgb), .012) 100%), #0e0d10; }
  .tf-icon::after { content: ''; position: absolute; inset: 0; border-radius: inherit;
                    background: linear-gradient(180deg, rgba(255, 255, 255, .20) 0%, rgba(255, 255, 255, 0) 42%, rgba(0, 0, 0, .14) 100%); }
  .tf-num { transform: translateZ(80px); }
  .tf-date { transform: translateZ(40px); }
  .tf-num { position: absolute; width: 220px; left: ${G.numR - 220}px; text-align: right; font-family: var(--mono); font-weight: 700;
            font-size: 148px; line-height: 148px; letter-spacing: -.04em; color: rgba(var(--cream-rgb), .9); font-variant-numeric: tabular-nums; }
  .tf-row { position: absolute; left: 0; width: 1920px; height: ${G.rowH}px; }
  .tf-slot { position: absolute; left: 0; width: 1920px; height: ${G.rowH}px; overflow: hidden; }
  .tf-icon { position: absolute; left: ${G.iconX}px; top: ${(G.rowH - G.icon) / 2}px; width: ${G.icon}px; height: ${G.icon}px;
             border-radius: 22.4%; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
  .tf-icon img { width: 100%; height: 100%; display: block; }
  .tf-name { position: absolute; left: ${G.nameX}px; top: 0; height: ${G.rowH}px; display: flex; align-items: center;
             font-family: var(--sans); font-weight: 600; font-size: 60px; letter-spacing: -.02em; color: var(--cream); white-space: nowrap; }
  .tf-bar { position: absolute; left: ${G.x0}px; top: ${(G.rowH - 150) / 2}px; width: 6px; height: 150px; background: var(--gold); }
  .tf-date { position: absolute; right: ${1920 - G.x1}px; top: 120px; font-family: var(--mono); font-weight: 600; font-size: 46px;
             line-height: 1; color: var(--cream); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .tf-day, .tf-tail { display: inline-block; vertical-align: top; padding: .04em 0 .12em; }
  .tf-day { position: relative; overflow: hidden; }
  .tf-day > span { display: inline-block; }
  .tf-day > span + span { position: absolute; left: 0; top: .04em; }`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const div = (cls, parent, html) => { const d = document.createElement('div'); d.className = cls; if (html != null) d.innerHTML = html; parent.appendChild(d); return d; };
  const rowEl = (key, parent) => {
    const r = div('tf-row', parent);
    div('tf-tile' + (key === 'muse' ? ' muse' : ''), r);           /* the tile: opaque, so Muse passes over the row it overtakes */
    if (key === 'muse') div('tf-bar', r);
    const ic = div('tf-icon', r); const im = document.createElement('img'); im.src = ICON + APPS[key].icon; ic.appendChild(im);
    div('tf-name', r).textContent = APPS[key].name;
    return r;
  };

  function chart(host, fromIso, toIso, F) {
    const order = (iso) => { const k = KEYS[iso]; if (!k) return null;
      Object.entries(k).forEach(([app, key]) => { if (F(key).asOf !== iso) throw new Error('top-free: ' + key + ' is not dated ' + iso); });
      return Object.keys(k).sort((a, b) => F(k[a]).v - F(k[b]).v); };
    const A = order(fromIso), B = order(toIso || fromIso);
    const rankOf = (iso, i) => F(KEYS[iso][order(iso)[i]]).display;
    if (!A || !B) throw new Error('top-free: no chart for ' + fromIso + ' / ' + toIso);
    const root = div('tf', host);
    host.style.perspective = '1900px'; host.style.perspectiveOrigin = '50% 46%';
    const nums = [0, 1, 2].map(i => { const n = div('tf-num', root); n.textContent = rankOf(fromIso, i); n.style.top = (cy(i) - 74) + 'px'; return n; });
    const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
    const creamN = 'rgba(245, 241, 229, .9)';
    nums[A.indexOf('muse')].style.color = gold;

    /* rows 1 and 2 move; the third slot crossfades (the app at 3 on 10 Sep fell out of view; the one on 18 Sep came in) */
    const rows = {};
    A.slice(0, 2).forEach((k, i) => { rows[k] = rowEl(k, root); rows[k].style.top = (cy(i) - G.rowH / 2) + 'px'; });
    rows.muse.style.zIndex = 2; gsap.set(rows.muse, { z: 24 });   /* Muse's tile stands a little proud of the list */
    const slot = div('tf-slot', root); slot.style.top = (cy(2) - G.rowH / 2) + 'px';
    const r3a = rowEl(A[2], slot); r3a.style.top = '0px';
    const r3b = A[2] !== B[2] ? rowEl(B[2], slot) : null; if (r3b) { r3b.style.top = '0px'; r3b.style.opacity = 0; }

    const day = (iso) => String(+iso.slice(8, 10));
    const tail = (iso) => ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4);
    const dt = div('tf-date', root);
    const dd = document.createElement('span'); dd.className = 'tf-day'; dt.appendChild(dd);
    const d0 = document.createElement('span'); d0.textContent = day(fromIso); dd.appendChild(d0);
    const d1 = document.createElement('span'); d1.textContent = day(toIso || fromIso); dd.appendChild(d1);
    const tl_ = document.createElement('span'); tl_.className = 'tf-tail'; tl_.textContent = ' ' + tail(fromIso).trim(); dt.appendChild(tl_);
    gsap.set(d1, { yPercent: 110 });
    if (tail(fromIso) !== tail(toIso || fromIso)) throw new Error('top-free: the roll changes the day only');

    const moved = A.slice(0, 2).filter(k => B.indexOf(k) !== A.indexOf(k));
    const H = G.rowH;
    function swap(tl, t, dur = .5) {
      moved.forEach(k => {
        const dy = (B.indexOf(k) - A.indexOf(k)) * H;
        tl.to(rows[k], { y: dy, duration: dur, ease: 'power3.inOut' }, t);
        if (k !== 'muse') { const tx = rows[k].querySelectorAll('.tf-icon, .tf-name');   /* its icon and name step out while Muse passes (its tile stays): nothing occluded */
                            tl.to(tx, { opacity: 0, duration: dur * .32, ease: 'power2.in' }, t);
                            tl.to(tx, { opacity: 1, duration: dur * .4, ease: 'power2.out' }, t + dur * .7); }
      });
      if (moved.includes('muse')) {                        /* Muse lifts off the list as it passes, and sets down at 1 */
        tl.to(rows.muse, { z: 62, duration: dur * .5, ease: 'power2.out' }, t);   /* under the floating numerals (z 80) */
        tl.to(rows.muse, { z: 24, duration: dur * .6, ease: 'power2.inOut' }, t + dur * .5);
      }
      tl.to(nums[A.indexOf('muse')], { color: creamN, duration: dur * .6 }, t + dur * .2);
      tl.to(nums[B.indexOf('muse')], { color: gold, duration: dur * .6 }, t + dur * .2);
      if (r3b) { tl.to(r3a, { opacity: 0, y: 30, duration: dur * .45, ease: 'power2.in' }, t);           /* out, then in: never both */
                 tl.fromTo(r3b, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: dur * .7, ease: 'power3.out' }, t + dur * .45); }
      tl.to(d0, { yPercent: -110, duration: dur * .7, ease: 'power3.inOut' }, t + dur * .1);
      tl.to(d1, { yPercent: 0, duration: dur * .7, ease: 'power3.inOut' }, t + dur * .1);
      return tl;
    }
    function setTo() {
      moved.forEach(k => gsap.set(rows[k], { y: (B.indexOf(k) - A.indexOf(k)) * H, opacity: 1, z: k === 'muse' ? 24 : 0 }));
      nums.forEach((n, i) => { n.style.color = i === B.indexOf('muse') ? gold : creamN; });
      if (r3b) { gsap.set(r3a, { opacity: 0 }); gsap.set(r3b, { opacity: 1, y: 0 }); }
      gsap.set(d0, { yPercent: -110 }); gsap.set(d1, { yPercent: 0 });
    }
    /* the colour leaves: icons to grey, gold to dim cream (the rewind) */
    function drain(tl, t, dur = .45) {
      const p = { g: 0 };
      tl.to(p, { g: 1, duration: dur, ease: 'power1.inOut', onUpdate: () => {
        root.querySelectorAll('.tf-icon img').forEach(im => { im.style.filter = `grayscale(${p.g}) brightness(${1 - .45 * p.g})`; });
      } }, t);
      tl.to(root.querySelectorAll('.tf-bar'), { backgroundColor: 'rgba(245, 241, 229, .35)', duration: dur }, t);
      tl.to(nums, { color: 'rgba(245, 241, 229, .45)', duration: dur }, t);
      tl.to(root.querySelectorAll('.tf-name, .tf-date'), { color: 'rgba(245, 241, 229, .5)', duration: dur }, t);
      return tl;
    }
    /* the camera: translate3d then rotate, about the list's centre (deg, px) */
    const cam = (v) => { root.style.transform = `translate3d(${v.tx}px, ${v.ty}px, ${v.tz}px) rotateX(${v.rx}deg) rotateY(${v.ry}deg)`; };
    if ([0, 1, 2].some(i => rankOf(fromIso, i) !== rankOf(toIso || fromIso, i))) throw new Error('top-free: the two dates must rank the same positions');
    return { root, rows, nums, swap, setTo, drain, cam, G, cy, rowIcon: (k) => rows[k] && rows[k].querySelector('.tf-icon') };
  }
  /* the camera keys 21-top-free moves through; 22-the-path opens on the last (c), so the two cut together */
  const CAMERA = {
    a:  { tx: 0, ty: 46, tz: 245, rx: 0, ry: 0 },       /* pass 6b: level from the first frame; the re-rank carries the motion */
    a2: { tx: 0, ty: 46, tz: 258, rx: 0, ry: 0 },       /* a slow, level push while the line runs */
    b:  { tx: 0, ty: 46,  tz: 262, rx: 0,  ry: 0 },      /* risen with Muse to 1: square to the lens, centred (pass 6, rule 3) */
    c:  { tx: 0, ty: 46,  tz: 278, rx: 0,  ry: 0 }       /* and pushed in, still square, to the cut */
  };
  return { chart, APPS, KEYS, USES, G, CAMERA };
})();
