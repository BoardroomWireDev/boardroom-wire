/* tesla-spacex heroes: counted fields (Ive, 18 Oct 2026, night). Added beside sf.js and hero.js (never edits them); load after both.

   FIELD.grid draws a unit field at true count: cells in blocks of a hundred (ten columns of ten, filled column by column so a
   part block reads as growth along x), blocks left to right. Solid cells are real (cars delivered); open dashed cells are planned
   or capacity, not output (the drafting grammar: dashed means not yet real). `more` adds that many cells after the count, fading
   to nothing: "more than", with no edge drawn where none is sourced. Columns sweep in, in order, over `over` seconds from `at`.
   Returns the field's right edge.

   underAt puts our dashed underline (tier C) at a fixed y under a text node, for type set inside a bar where sf.js's ours()
   would land on the bar. */
const FIELD = (() => {
  const CELL = 10, PITCH = 13, BLK = 9 * PITCH + CELL, BGAP = 12, BSTR = BLK + BGAP;
  const pos = (i) => { const b = Math.floor(i / 100), j = i % 100;
    return [b * BSTR + Math.floor(j / 10) * PITCH, (j % 10) * PITCH]; };
  function grid(p, n, x0, y0, o = {}) {
    const { solid = false, at = 0, over = 1, more = 0, skip = 0, col = 'var(--cream)' } = o;
    const total = skip + n, cols = new Map();
    const add = (i, op) => { const [dx, dy] = pos(i), key = Math.floor(i / 10) + ':' + op;
      if (!cols.has(key)) cols.set(key, { c: Math.floor(i / 10), op, d: '' });
      const x = x0 + dx, y = y0 + dy, c = cols.get(key);
      c.d += solid ? `M${x},${y}h${CELL}v${CELL}h${-CELL}z` : `M${x + .75},${y + .75}h${CELL - 1.5}v${CELL - 1.5}h${-(CELL - 1.5)}z`; };
    for (let i = skip; i < total; i++) add(i, 1);
    for (let m = 0; m < more; m++) add(total + m, +(.6 * Math.pow(.6, m)).toFixed(3));
    const c0 = Math.floor(skip / 10), c1 = Math.floor((total + more - 1) / 10), span = Math.max(c1 - c0, 1);
    for (const c of cols.values()) {
      const path = el(p, 'path', solid ? { d: c.d, fill: col, opacity: c.op }
        : { d: c.d, fill: 'none', stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '3 1.6', opacity: c.op });
      const a = at + over * (c.c - c0) / span, g = el(p, 'g'); g.appendChild(path);
      HERO.show(g, a, .14);
    }
    const [lx] = pos(total + more - 1);
    return x0 + lx + CELL;
  }
  return { grid, CELL, PITCH, BLK, BSTR, pos };
})();

function underAt(g, textNode, y, col = 'var(--gold)', w = 3) {
  const u = el(g, 'g');
  const place = () => { const b = textNode.getBBox(); u.innerHTML = '';
    el(u, 'line', { x1: b.x, x2: b.x + b.width, y1: y, y2: y, stroke: col, 'stroke-width': w, 'stroke-dasharray': '10 7' }); };
  place(); if (document.fonts) document.fonts.ready.then(place);
  return u;
}
