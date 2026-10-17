/* The Rubin package, drawn with iso.js in true millimetres (x across, y down the package, z up). Used by H12's chips column
   (style frame and build). What is drawn is only what NVIDIA has stated: two reticle-sized compute dies joined at one seam
   (NV-HBI), eight HBM4 stacks of twelve layers each (288 GB), on a CoWoS-L interposer on an organic substrate. Reports differ
   on separate I/O dies, so none are drawn. Proportions: a reticle is 26 x 33 mm; an HBM4 stack about 11 x 13 mm.
   Layout as in NVIDIA's renders of its two-die parts: the dies side by side, four stacks above them and four below.
   opts.gold: parts that carry the accent ('dies', 'hbm'); opts.hbmFill: a fill for the stacks (e.g. 'url(#hatch)' for a claim).
   opts.lift: an exploded offset (mm) per part {interposer, dies, hbm}, for a build that assembles the package. Returns parts' screen
   anchors so a frame can lead a label to them. */
const RUBIN = { sub: [84, 92, 1.6], ipo: [62, 66, .9], die: [26, 33, .78], hbm: [11, 13, .9], layers: 12 };

function rubinPackage(svg, V, opts = {}) {
  const gold = new Set(opts.gold || []), lift = Object.assign({ interposer: 0, dies: 0, hbm: 0 }, opts.lift || {});
  const S = scene(), g = el(svg, 'g', { 'stroke-linejoin': 'round' });
  const C = (part, c = LINE) => gold.has(part) ? GOLDC : c;
  const [sw, sd, sh] = RUBIN.sub, [iw, id, ih] = RUBIN.ipo, [dw, dd, dh] = RUBIN.die, [hw, hd, hh] = RUBIN.hbm;
  const sx0 = -sw / 2, sy0 = -sd / 2, ix0 = -iw / 2, iy0 = -id / 2;
  const zI = sh + lift.interposer, zT = zI + ih;

  /* the substrate, with its rows of land-side capacitors along the two long edges */
  box(S, V, sx0, sy0, 0, sw, sd, sh, { stroke: LINE, sw: 1.8, bias: -1e4, detail: (gg, V) => {
    for (let x = sx0 + 6; x < sx0 + sw - 4; x += 3.2) [sy0 + 4.5, sy0 + sd - 4.5].forEach(y =>
      el(gg, 'polygon', { points: pts(V, [[x, y - .7, sh], [x + 1.6, y - .7, sh], [x + 1.6, y + .7, sh], [x, y + .7, sh]]), fill: 'none', stroke: THIN, 'stroke-width': .9 }));
  } });
  /* the interposer */
  box(S, V, ix0, iy0, zI, iw, id, ih, { stroke: LINE, sw: 1.6, bias: -5e3 });

  /* two compute dies, side by side, one seam between them */
  const dy0 = -dd / 2, zD = zT + lift.dies, dies = [];
  [-dw - .3, .3].forEach((x0, i) => {
    box(S, V, x0, dy0, zD, dw, dd, dh, { stroke: C('dies'), sw: 1.8, top: gold.has('dies') ? 'rgba(212,175,55,.16)' : INK, detail: (gg, V) => {
      // the die's own inset (the guard ring), one thin line
      el(gg, 'polygon', { points: pts(V, [[x0 + 1.4, dy0 + 1.4, zD + dh], [x0 + dw - 1.4, dy0 + 1.4, zD + dh], [x0 + dw - 1.4, dy0 + dd - 1.4, zD + dh], [x0 + 1.4, dy0 + dd - 1.4, zD + dh]]),
        fill: 'none', stroke: C('dies', THIN), 'stroke-width': 1 });
    } });
    dies.push(V.P(x0 + dw / 2, 0, zD + dh));
  });

  /* eight HBM4 stacks: four above the dies, four below, each twelve layers (drawn on its two visible faces) */
  const hbm = [], gap = (iw - 4 * hw) / 5, zH = zT + lift.hbm;
  [dy0 - 1.6 - hd, -dy0 + 1.6].forEach(y0 => {
    for (let i = 0; i < 4; i++) {
      const x0 = ix0 + gap + i * (hw + gap);
      box(S, V, x0, y0, zH, hw, hd, hh, { stroke: C('hbm'), sw: 1.5, top: opts.hbmFill || INK, sx: opts.hbmFill || INK, sy: opts.hbmFill || INK, detail: (gg, V) => {
        const st = { stroke: C('hbm', THIN), sw: .8 }, hs = Array.from({ length: RUBIN.layers - 1 }, (_, k) => (k + 1) / RUBIN.layers);
        faceY(gg, V, x0, y0 + hd, zH, hw, hh, 1e9, hs, st);
        faceX(gg, V, x0 + hw, y0, zH, hd, hh, 1e9, hs, st);
      } });
      hbm.push(V.P(x0 + hw / 2, y0 + hd / 2, zH + hh));
    }
  });
  S.paint(g);
  return { g, dies, hbm, corner: V.P(sx0, sy0 + sd, 0), top: V.P(0, sy0, sh) };
}
