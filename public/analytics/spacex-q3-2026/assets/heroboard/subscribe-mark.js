/* ============================================================
   THE SUBSCRIBE MARK (Ive, 29 Oct 2026). The writer's pick (a) of polish item 6: on the ask ("please consider liking and
   subscribing"), our bust and a bell drawn in gold line sit in the bottom-right corner for about four seconds, then go
   with the line. Marks, not words (AGENTS #4, EF 16): no text, no button, no red, no thumbs-up. The bust is the channel;
   the bell is the one YouTube symbol that reads as "subscribe" without a word.

   SUBMARK.add(tl, { ask, bell, off })   one call, inside the page's build(tl), on the page's one timeline:
     ask   the bust settles in (0.45 s)                   cue word: "please"
     bell  the bell draws on in gold line (0.6 s)        cue word: "subscribing"   (default ask + 0.15)
     off   both fade with the line (0.4 s)               cue word: "channel"       (end of "It's a huge help to the channel.")
   Give the three as the page's own steps (in its HB.at / step list), so the retime (hyperframes\retake.mjs) moves them
   with the take like every other step.
   Placement (1920 × 1080 stage px; ×2 at 4K): right edge on the 7% title-safe line (x 1786), bottom at y 992 (12 px above
   the credit line, inside the 7% box at 1004). The bust is 64 px tall, the bell 40 px, 18 px apart. It needs a clear
   corner about 120 × 70 px: check the page at the ask with ?t=, and pass { right, bottom } if its corner is not clear.
   Options: right, bottom, h (bust height), bellH, gap, bust (image path), z.
   Nothing glows or drifts; ?final (the page's end, after `off`) shows no mark; ?t= and ?capture hold (every move is a
   tween on the page's timeline, from-states set at build).
   ============================================================ */
const SUBMARK = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const D = { right: 1786, bottom: 992, h: 64, bellH: 40, gap: 18, bust: 'assets/outro/bw-bust.png', ar: 1413 / 1525, ringV: .53, z: 56 };
  /* the bell, hand-drawn in a 100-unit box: the body (dome, waist, flared lip), the hanger, the clapper under the lip */
  const VB = [12, 4, 76, 92];
  const BODY = 'M50,16 C34,16 25,28 25,46 L25,62 C25,67 21,71 15,76 L85,76 C79,71 75,67 75,62 L75,46 C75,28 66,16 50,16 Z';
  const HANG = 'M50,8 L50,16';
  const CLAP = 'M40,84 A10,10 0 0 0 60,84';

  function add(tl, o = {}) {
    const c = Object.assign({}, D, o), stage = document.querySelector('.stage');
    const bw = c.h * c.ar, top = c.bottom - c.h, cy = top + c.ringV * c.h;          /* cy: the bust ring's centre */
    const wrap = document.createElement('div');
    wrap.className = 'sub-mark'; wrap.setAttribute('aria-hidden', 'true');
    Object.assign(wrap.style, { position: 'absolute', left: '0', top: '0', width: '1920px', height: '1080px', zIndex: c.z, pointerEvents: 'none' });
    const bust = document.createElement('img');
    bust.src = c.bust; bust.alt = '';
    Object.assign(bust.style, { position: 'absolute', left: (c.right - bw) + 'px', top: top + 'px', width: bw + 'px', height: c.h + 'px', opacity: 0 });
    const bellW = c.bellH * VB[2] / VB[3];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', VB.join(' '));
    Object.assign(svg.style, { position: 'absolute', left: (c.right - bw - c.gap - bellW) + 'px', top: (cy - c.bellH / 2) + 'px',
      width: bellW + 'px', height: c.bellH + 'px', overflow: 'visible', opacity: 0 });
    const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
    const sw = 2.4 * VB[3] / c.bellH;                                                  /* a 2.4 px line at any size (4.8 at 4K) */
    const line = (d) => {
      const p = document.createElementNS(NS, 'path');
      Object.entries({ d, fill: 'none', stroke: gold, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }).forEach(([k, v]) => p.setAttribute(k, v));
      svg.appendChild(p); return p;
    };
    const body = line(BODY), hang = line(HANG), clap = line(CLAP);
    wrap.append(svg, bust);
    stage.insertBefore(wrap, stage.querySelector('.chrome'));

    const ask = c.ask, bell = c.bell ?? ask + .15, off = c.off;
    tl.fromTo(bust, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out' }, ask);
    tl.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: .05, ease: 'none' }, bell);
    /* the pen: the body in one stroke, then the hanger and the clapper; 0.6 s in all */
    tl.fromTo(body, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: .42, ease: 'power1.inOut' }, bell);
    tl.fromTo(hang, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: .12, ease: 'power1.out' }, bell + .36);
    tl.fromTo(clap, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: .18, ease: 'power1.out' }, bell + .42);
    if (off != null) tl.to([bust, svg], { opacity: 0, duration: .4, ease: 'power1.in' }, off);
    return { wrap, bust, svg };
  }
  return { add };
})();
