/* tesla-spacex standard plates 30 to 35: the drawing code they share (studio-builder-a, 18 Oct 2026). Load after
   assets/hero/sf.js and assets/hero/hero.js. Nothing here prints a figure; every number a plate shows comes from data.js
   through sf.js's helpers (usd, U, has, F, fmt).

   The Roadster (PL.car). A side elevation, nose to the right, in the car's own units (1000 = the car's length, 4.26 m; the
   ground is y = 0, up is negative). The proportions are from the car's published dimensions (length, wheelbase, height, wheel
   diameter) and the event's frames at 6:50, 7:17 and 11:13: a low two-door coupe, a fastback roof, a short nose. The outline is
   ONE function of a few points (BODY below), so when Tesla's own images land (REQ-001) the drawing is corrected in one place.
   Strokes carry data-sw (their width on the 1920x1080 stage, 2 px at the least); PL.fix(root, k) sets them for a total scale k,
   so a camera pull-back never thins a line under the gate.

   The jigsaw piece (PL.piece) is a flat block with one knob on its right edge, the way Ive wants the last big piece: no bevel,
   no shadow (LOOK-tesla-spacex.md). PL.socket draws the same notch as a dashed outline: planned, not yet real. */
const PL = (() => {
  const CR = 'var(--cream)', GOLD = 'var(--gold)', INK = 'var(--bg)';
  const sw = (n, w) => { n.setAttribute('data-sw', w); n.setAttribute('stroke-width', w); return n; };
  /* set every stroke under root for a total scale k (stage px per local unit) */
  const fix = (root, k) => root.querySelectorAll('[data-sw]').forEach(n => n.setAttribute('stroke-width', (n.getAttribute('data-sw') / k).toFixed(3)));
  let _id = 0;
  const clipRect = (svgRoot, attrs) => {
    const d = svgRoot.querySelector('defs') || el(svgRoot, 'defs'), id = 'pc' + (++_id);
    const cp = el(d, 'clipPath', { id, clipPathUnits: 'userSpaceOnUse' }), r = el(cp, 'rect', attrs);
    return { id, r };
  };

  /* ---------- the Roadster ---------- */
  const AX = { rear: 190, front: 805, y: -80, R: 80 }, ARCH = 96;
  const BODY = 'M40,-46 L98.2,-52 A96 96 0 1 1 281.8,-52 L713.2,-52 A96 96 0 1 1 896.8,-52 L950,-48 C980,-48 994,-56 996,-72 ' +
    'C998,-92 993,-108 978,-120 C940,-142 880,-168 810,-188 C770,-196 720,-200 690,-198 C640,-216 590,-238 548,-252 ' +
    'C500,-266 440,-270 400,-268 C350,-266 300,-254 250,-238 C190,-220 130,-196 80,-184 C40,-174 18,-160 14,-132 L15,-92 ' +
    'C17,-66 26,-50 40,-46 Z';
  const DLO = 'M676,-201 C640,-214 596,-232 556,-244 C505,-257 445,-261 402,-259 C360,-257 322,-246 290,-232 L306,-205 Z';
  const LINES = ['M664,-196 C664,-150 656,-100 646,-58', 'M335,-203 C330,-150 324,-100 320,-62', 'M392,-172 L440,-172', 'M296,-66 L706,-66',
    'M950,-48 L1002,-45', 'M630,-232 L666,-236 L668,-224 L638,-218 Z', 'M984,-108 C962,-122 936,-134 900,-146 L896,-138 C930,-128 958,-114 980,-96 Z',
    'M20,-150 C40,-166 62,-176 84,-182 L86,-174 C64,-168 42,-158 22,-142 Z'];
  /* SpaceX's parts: perimeter cold-gas thrusters (x, y, the direction they point, degrees) and the pressure tanks */
  const NOZ = [[997, -92, 0], [14, -112, 180], [330, -52, 90], [690, -52, 90], [120, -190, -90], [880, -168, -80]];
  const PORT = [[905, -112], [64, -146]];
  const TANK = [[300, -64, 700, -64, 8], [300, -82, 700, -82, 8], [300, -100, 700, -100, 8], [250, -222, 250, -166, 9],
    [275, -226, 275, -146, 9], [28, -100, 90, -100, 10], [28, -124, 90, -124, 10], [912, -100, 968, -100, 10], [912, -124, 964, -124, 10]];

  /* o.detail: 'full' (default) or 'line' (outline and wheels only, for small ghosts); o.ink = the stroke colour */
  function car(parent, o = {}) {
    const root = (parent.ownerSVGElement || parent), full = o.detail !== 'line';
    const g = el(parent, 'g');
    const bx = clipRect(root, { x: -400, y: -400, width: 2000, height: 600 });             // fill: x >= boundary, y >= level
    const cm = clipRect(root, { x: -400, y: -400, width: 0, height: 600 });                // cream strokes: x < boundary or above the fill level
    const cm2 = el(root.querySelector('#' + cm.id), 'rect', { x: -400, y: -400, width: 2400, height: 400 });
    const C = { g, golds: [], wheels: [], clips: { bx, cm } };
    /* the gold parts sit under the body's cream fill until the cut sweeps past them */
    const gold = el(g, 'g');
    if (full) {
      TANK.forEach(([x1, y1, x2, y2, r]) => {
        const t = el(gold, 'g'), vert = x1 === x2, x = Math.min(x1, x2) - (vert ? r : 0), y = Math.min(y1, y2) - (vert ? 0 : r);
        const w = vert ? 2 * r : Math.abs(x2 - x1), h = vert ? Math.abs(y2 - y1) : 2 * r;
        el(t, 'rect', { x, y, width: w, height: h, rx: r, fill: GOLD });
        [.28, .72].forEach(f => { const d = vert ? `M${x},${y + h * f} h${w}` : `M${x + w * f},${y} v${h}`; sw(el(t, 'path', { d, stroke: INK, fill: 'none' }), 1.6); });
        C.golds.push({ n: t, x: (x1 + x2) / 2 });
      });
      NOZ.forEach(([x, y, a]) => {
        const t = el(gold, 'g', { transform: `translate(${x},${y}) rotate(${a})` });
        el(t, 'path', { d: 'M-2,-8 L18,-15 L18,15 L-2,8 Z', fill: GOLD });
        sw(el(t, 'path', { d: 'M18,-15 V15', stroke: INK, fill: 'none' }), 1.6);
        C.golds.push({ n: t, x });
      });
      PORT.forEach(([x, y]) => {
        const t = el(gold, 'g'); el(t, 'circle', { cx: x, cy: y, r: 15, fill: GOLD }); el(t, 'circle', { cx: x, cy: y, r: 6, fill: INK });
        C.golds.push({ n: t, x });
      });
    }
    /* the body: its fill (cream, clipped), then the outline */
    C.fill = el(g, 'path', { d: BODY, fill: CR, 'clip-path': `url(#${bx.id})` });
    const LC = o.col || CR, LW = o.w || 3;
    C.outline = sw(el(g, 'path', { d: BODY, fill: 'none', stroke: LC, 'stroke-linejoin': 'round' }), LW);
    if (full) {
      C.dlo = sw(el(g, 'path', { d: DLO, fill: INK, stroke: CR, 'stroke-linejoin': 'round' }), 2);
      C.lines = [];
      const gi = el(g, 'g', { 'clip-path': `url(#${bx.id})` }), gc = el(g, 'g', { 'clip-path': `url(#${cm.id})` });
      LINES.forEach(d => [[gi, INK], [gc, 'rgba(245,241,229,.8)']].forEach(([p, col]) => C.lines.push(sw(el(p, 'path', { d, fill: 'none', stroke: col, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }), 2))));
    }
    /* wheels: tyre, rim, spokes */
    [AX.rear, AX.front].forEach(x => {
      const w = el(g, 'g'), y = AX.y;
      C.tyres = (C.tyres || []).concat(sw(el(w, 'circle', { cx: x, cy: y, r: AX.R, fill: o.detail === 'line' ? 'none' : INK, stroke: LC }), LW));
      if (full) {
        sw(el(w, 'circle', { cx: x, cy: y, r: 56, fill: 'none', stroke: CR }), 2);
        sw(el(w, 'circle', { cx: x, cy: y, r: 14, fill: 'none', stroke: CR }), 2);
        for (let i = 0; i < 5; i++) { const a = (i * 72 + 18) * Math.PI / 180;
          sw(el(w, 'line', { x1: x + 14 * Math.cos(a), y1: y + 14 * Math.sin(a), x2: x + 54 * Math.cos(a), y2: y + 54 * Math.sin(a), stroke: CR }), 2); }
      }
      C.wheels.push(w);
    });
    /* the cut: everything left of bx is open (ink with cream lines), right of it still solid */
    C.cut = (bxv, level = -300) => {
      bx.r.setAttribute('x', bxv); bx.r.setAttribute('width', 2000); bx.r.setAttribute('y', level); bx.r.setAttribute('height', 40 - level);
      cm.r.setAttribute('x', -400); cm.r.setAttribute('width', Math.max(0, bxv + 400));
      cm2.setAttribute('height', level + 400);
      C.golds.forEach(q => { const o = Math.max(0, Math.min(1, (bxv - (q.x - 25)) / 40)); q.n.setAttribute('opacity', o.toFixed(3)); q.n.style.display = o <= 0 ? 'none' : ''; });
    };
    C.cut(-400, 0);
    return C;
  }
  /* the car from above, in the same frame (nose right, centred on y = 0): what a side view of a car rolled on its side shows */
  function plan(parent, o = {}) {
    const g = el(parent, 'g'), LC = o.col || CR, LW = o.w || 3;
    const body = 'M60,-200 C20,-200 10,-170 10,-120 V120 C10,170 20,200 60,200 H760 C900,200 975,120 995,40 V-40 C975,-120 900,-200 760,-200 Z';
    sw(el(g, 'path', { d: body, fill: o.fill || 'none', stroke: LC, 'stroke-linejoin': 'round' }), LW);
    sw(el(g, 'path', { d: 'M290,-128 H640 L730,-78 V78 L640,128 H290 Z', fill: 'none', stroke: LC, 'stroke-linejoin': 'round' }), LW - 1);
    [[155, -226], [155, 190], [770, -226], [770, 190]].forEach(([x, y]) => sw(el(g, 'rect', { x, y, width: 70, height: 36, rx: 8, fill: o.fill || 'none', stroke: LC }), LW));
    return g;
  }
  /* a hairline dimension in local units with ticks (unlabelled: the model is the car, not a measurement we print) */
  function dimL(p, x1, y1, x2, y2, col = 'rgba(245,241,229,.55)', tick = 12) {
    const g = el(p, 'g', { fill: 'none', stroke: col }), vert = x1 === x2;
    sw(el(g, 'line', { x1, y1, x2, y2 }), 2);
    [[x1, y1], [x2, y2]].forEach(([x, y]) => sw(el(g, 'line', vert ? { x1: x - tick, x2: x + tick, y1: y, y2: y } : { x1: x, x2: x, y1: y - tick, y2: y + tick }), 2));
    return g;
  }

  /* ---------- the pieces ---------- */
  /* a block w x h at (x, y) with a knob on its right edge: depth k, neck n, head d (flat ink, no bevel) */
  function piecePath(x, y, w, h, knob = true, k = 70, n = 40, d = 84) {
    const r = x + w, my = y + h / 2;
    if (!knob) return `M${x},${y} H${r} V${y + h} H${x} Z`;
    const hd = d / 2;
    return `M${x},${y} H${r} V${my - n / 2} C${r},${my - n / 2 + 6} ${r + 6},${my - hd + 4} ${r + 18},${my - hd - 2}` +
      ` C${r + k * .55},${my - hd - 12} ${r + k + 4},${my - hd + 2} ${r + k},${my}` +
      ` C${r + k + 4},${my + hd - 2} ${r + k * .55},${my + hd + 12} ${r + 18},${my + hd + 2}` +
      ` C${r + 6},${my + hd - 4} ${r},${my + n / 2 - 6} ${r},${my + n / 2} V${y + h} H${x} Z`;
  }
  /* the same notch, cut into the LEFT edge of a block at (x, y) w x h: the socket the knob would seat in (dashed: planned) */
  function socketPath(x, y, h, k = 70, n = 40, d = 84) {
    const my = y + h / 2, hd = d / 2;
    return `M${x},${my - n / 2} C${x},${my - n / 2 + 6} ${x + 6},${my - hd + 4} ${x + 18},${my - hd - 2}` +
      ` C${x + k * .55},${my - hd - 12} ${x + k + 4},${my - hd + 2} ${x + k},${my}` +
      ` C${x + k + 4},${my + hd - 2} ${x + k * .55},${my + hd + 12} ${x + 18},${my + hd + 2}` +
      ` C${x + 6},${my + hd - 4} ${x},${my + n / 2 - 6} ${x},${my + n / 2}`;
  }
  /* a block with the socket cut out of its left edge (the notch is open to the ground; its edge is drawn dashed on top) */
  function socketedPath(x, y, w, h, k = 70, n = 40, d = 84) {
    const my = y + h / 2, hd = d / 2;
    return `M${x},${y} H${x + w} V${y + h} H${x} V${my + n / 2} C${x},${my + n / 2 - 6} ${x + 6},${my + hd - 4} ${x + 18},${my + hd + 2}` +
      ` C${x + k * .55},${my + hd + 12} ${x + k + 4},${my + hd - 2} ${x + k},${my}` +
      ` C${x + k + 4},${my - hd + 2} ${x + k * .55},${my - hd - 12} ${x + 18},${my - hd - 2}` +
      ` C${x + 6},${my - hd + 4} ${x},${my - n / 2 + 6} ${x},${my - n / 2} Z`;
  }
  return { CR, GOLD, INK, sw, fix, clipRect, car, plan, dimL, piecePath, socketPath, socketedPath, AX, ARCH, BODY, DLO };
})();
