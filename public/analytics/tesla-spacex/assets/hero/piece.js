/* tesla-spacex: the one puzzle piece (Ive B, 19 Oct 2026; FINDINGS-boards-r1 row 7). Board 03's design, shared by board 03,
   plate 31 and plate 30's puzzle step, so the motif that pays the thumbnail is drawn one way across the video.

   An entity block at true value: one width (W), its height the company's value on one scale (KV px per dollar, 230 px a
   trillion, board 03's), standing on a ground line. A 2 px cream outline over an opaque ground with a 7% cream fill, its mark
   and its value inside (our arithmetic underlined). The jigsaw edge appears only for "the last big piece": a tab under
   Tesla's block, the matching socket in the top edge of SpaceX's. Tesla always hovers GAP px above the socket, never fitted:
   no deal is agreed (LOOK-tesla-spacex.md, 03's mark). No bevel, no shadow, no tilt.
   Load after assets/hero/sf.js. */
const PIECE = (() => {
  const LOWFILL = 'rgba(245,241,229,.07)', GAP = 70, KV = 230 / 1e12, W = 200, N = 14, R = 20;
  /* the outline: plain, with a tab below the bottom edge, or with a socket cut into the top edge */
  function path(x, top, w, bot, cut) {
    const cx = x + w / 2;
    if (cut === 'tab') return `M${x},${top} H${x + w} V${bot} H${cx + N} v6 A${R},${R} 0 1 1 ${cx - N},${bot + 6} v-6 H${x} Z`;
    if (cut === 'socket') return `M${x},${top} H${cx - N} v6 A${R},${R} 0 1 0 ${cx + N},${top + 6} v-6 H${x + w} V${bot} H${x} Z`;
    return `M${x},${top} H${x + w} V${bot} H${x} Z`;
  }
  /* o: { name (tesla|spacex), x, h, G (the ground's y), key (the value's data.js key), v (dollars), cut ('tab'|'socket'),
         value (false: no figure printed) }. setCut(u) crossfades the plain outline to the cut one. */
  function block(p, o) {
    const g = el(p, 'g'), top = o.G - o.h, x = o.x;
    el(g, 'rect', { x, y: top, width: W, height: o.h, fill: 'var(--bg)' });      // an opaque ground: a piece in flight hides what it passes
    const plain = el(g, 'path', { d: path(x, top, W, o.G), fill: LOWFILL, stroke: 'var(--cream)', 'stroke-width': 2 });
    const cutG = el(g, 'g', { opacity: 0 });
    if (o.cut === 'tab') el(cutG, 'path', { d: path(x, top, W, o.G, 'tab'), fill: 'var(--bg)' });
    if (o.cut) el(cutG, 'path', { d: path(x, top, W, o.G, o.cut), fill: LOWFILL, stroke: 'var(--cream)', 'stroke-width': 2 });
    const lh = o.name === 'tesla' ? 22 : 19;
    logo(g, o.name, x + (W - logoW(o.name, lh)) / 2, top + 58, lh);
    if (o.value !== false) {
      const n = el(g, 'text', { x: x + W / 2, y: top + 130, class: 'fn', 'font-size': 40, 'text-anchor': 'middle' }, D(o.key, fmt.usdT(o.v)));
      if (isCalc(o.key)) ours(n, 'var(--cream)', 10, 2);
    }
    const setCut = (u) => { cutG.setAttribute('opacity', u.toFixed(3)); plain.setAttribute('opacity', (1 - u).toFixed(3)); };
    return { g, plain, cutG, top, setCut };
  }
  return { LOWFILL, GAP, KV, W, path, block };
})();
