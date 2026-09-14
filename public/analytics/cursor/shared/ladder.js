/* ============================================================
   BOARDROOM WIRE — THE FUNDING LADDER  (dashboards 07 and 12)
   Stepped columns on one valuation axis. Dashboard 07 draws the rounds
   and leaves the right third of the frame empty; dashboard 12 calls the
   same function with `exit` set and the $60B column rises into that
   space. Same x positions, same axis, so the callback is pixel-true.

   const L = BW_LADDER.create(svg, { area, vmax, rounds, exit, heroIds });
   L.cols[i]    { r, x, post, rect, val, lead, tick, g }
   L.raise(tl, col, at, dur)   raise a column to its post-money
   L.set(col, k)               paint a column at k = 0 | 1
   L.step / L.exit.step        the lines joining the tops
   ============================================================ */
const BW_LADDER = (() => {
  function create(svg, opts) {
    const o = Object.assign({
      area: { x0: 200, x1: 1760, y0: 440, y1: 720 },
      vmax: 65, rounds: BW_DATA.rounds, exit: null, colW: 108,
      heroIds: [], yticks: [10, 20, 30, 40, 50, 60]
    }, opts);
    const A = o.area;
    const yOf = v => A.y1 - (v / o.vmax) * (A.y1 - A.y0);
    /* figures are stored in the unit their fmt prints ($400M → 0.4 on a $B axis) */
    const toB = f => f.fmt === 'm0' ? f.v / 1000 : f.fmt === 'k0' ? f.v / 1e6 : f.v;
    const g = BW.mk('g', { class: 'ladder' }, svg);

    /* axis */
    const base = BW.mk('line', { x1: A.x0, y1: A.y1, x2: A.x1, y2: A.y1, class: 'ladder-base', 'data-reveal': 'scalex' }, g);
    const ticks = o.yticks.map(v => {
      const tg = BW.mk('g', { class: 'ladder-ytick', 'data-reveal': '' }, g);
      BW.mk('line', { x1: A.x0, y1: yOf(v), x2: A.x0 + 8, y2: yOf(v), class: 'ladder-tickline' }, tg);
      BW.mk('text', { x: A.x0 - 12, y: yOf(v) + 5, class: 'ladder-y', 'text-anchor': 'end' }, tg, '$' + v + 'B');
      return tg;
    });
    BW.mk('text', { x: A.x0 - 12, y: A.y0 - 22, class: 'svg-eyebrow', 'text-anchor': 'start', 'data-reveal': '' }, g, 'POST-MONEY VALUATION');

    /* the six rounds across the left two-thirds */
    const left = A.x0 + 70, right = A.x0 + (A.x1 - A.x0) * 0.64;
    const pitch = (right - left) / (o.rounds.length - 1);

    const cols = o.rounds.map((r, i) => {
      const x = left + i * pitch;
      const post = r.post ? toB(BW.fig(r.post)) : null;
      const cg = BW.mk('g', { class: 'ladder-col' }, g);
      const c = { r, x, post, g: cg };
      const hero = o.heroIds.includes(r.id);
      BW.mk('text', { x, y: A.y1 + 30, class: 'ladder-name', 'text-anchor': 'middle', 'data-reveal': '' }, cg, r.name.toUpperCase());
      BW.mk('text', { x, y: A.y1 + 50, class: 'ladder-date', 'text-anchor': 'middle', 'data-reveal': '' }, cg, r.date.toUpperCase());
      BW.mk('text', { x, y: A.y1 + 74, class: 'ladder-raised', 'text-anchor': 'middle', 'data-reveal': '' }, cg, 'raised ' + BW.val(r.raised));
      if (post !== null) {
        c.rect = BW.mk('rect', { x: x - o.colW / 2, y: A.y1, width: o.colW, height: 0, class: 'ladder-rect' }, cg);
        /* a hero round's lead and value are the board's HTML tile, not SVG text */
        if (!hero) {
          c.lead = BW.mk('text', { x, y: yOf(post) - 42, class: 'svg-eyebrow ladder-lead', 'text-anchor': 'middle', 'data-reveal': '' }, cg, r.lead.toUpperCase());
          c.val = BW.mk('text', { x, y: yOf(post) - 16, class: 'svg-val ladder-val', 'text-anchor': 'middle', 'data-reveal': '' }, cg, BW.val(r.post));
        }
      } else {
        c.tick = BW.mk('circle', { cx: x, cy: A.y1, r: 5, class: 'ladder-tick', 'data-reveal': 'scale' }, cg);
        c.lead = BW.mk('text', { x, y: A.y1 - 20, class: 'svg-eyebrow ladder-lead', 'text-anchor': 'middle', 'data-reveal': '' }, cg, r.lead.toUpperCase());
        if (r.id === 'seed')
          c.val = BW.mk('text', { x, y: A.y1 - 42, class: 'ladder-nd', 'text-anchor': 'middle', 'data-reveal': '' }, cg, 'POST-MONEY NOT DISCLOSED');
      }
      return c;
    });

    const valued = cols.filter(c => c.post !== null);
    const step = BW.mk('path', { d: valued.map((c, i) => (i ? 'L' : 'M') + c.x + ',' + yOf(c.post)).join(' '), class: 'ladder-step', opacity: 0 }, g);

    /* the exit column, in the space the rounds leave empty */
    let exit = null;
    if (o.exit) {
      const x = A.x0 + (A.x1 - A.x0) * 0.86;
      const eg = BW.mk('g', { class: 'ladder-exit' }, g);
      exit = { x, v: o.exit.v, g: eg };
      exit.rect = BW.mk('rect', { x: x - o.colW / 2, y: A.y1, width: o.colW, height: 0, class: 'ladder-rect exit' }, eg);
      BW.mk('text', { x, y: A.y1 + 30, class: 'ladder-name exit', 'text-anchor': 'middle', 'data-reveal': '' }, eg, o.exit.name.toUpperCase());
      BW.mk('text', { x, y: A.y1 + 50, class: 'ladder-date', 'text-anchor': 'middle', 'data-reveal': '' }, eg, o.exit.date.toUpperCase());
      BW.mk('text', { x, y: A.y1 + 74, class: 'ladder-raised', 'text-anchor': 'middle', 'data-reveal': '' }, eg, o.exit.note);
      if (!o.exit.hero)
        exit.lead = BW.mk('text', { x, y: yOf(o.exit.v) - 42, class: 'svg-eyebrow ladder-lead exit', 'text-anchor': 'middle', 'data-reveal': '' }, eg, o.exit.lead.toUpperCase());
      const last = valued[valued.length - 1];
      exit.step = BW.mk('path', { d: `M${last.x},${yOf(last.post)} L${x},${yOf(o.exit.v)}`, class: 'ladder-step exit', opacity: 0 }, g);
    }

    function set(c, k) {
      const v = c.post !== null && c.post !== undefined ? c.post : c.v;
      const h = (A.y1 - yOf(v)) * k;
      gsap.set(c.rect, { attr: { y: A.y1 - h, height: h } });
    }
    function raise(tl, c, at, dur = .7) {
      const v = c.post !== null && c.post !== undefined ? c.post : c.v;
      tl.to(c.rect, { attr: { y: yOf(v), height: A.y1 - yOf(v) }, duration: dur, ease: BW.ease.land }, at);
    }

    return { area: A, yOf, g, base, ticks, cols, valued, step, exit, set, raise };
  }
  return { create };
})();
