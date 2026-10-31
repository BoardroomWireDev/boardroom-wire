/* KIT.rateboard — the hotel's rate board: a split-flap sign that flips to the new price. Each module is a real split-flap:
   the upper half shows the new character, the lower the old, and a flap hinged at the split falls forward carrying the old top
   on its face and the new bottom on its back.
   const r = KIT.rateboard.create(w, { rows: [{ text: 'B200', n: 4, ink: '#F5F1E5', family: 'Inter' },
                                              { text: BW.val('ornn_ocpi_b200_2026_10_26'), n: 5, ink: '#D4AF37' }],
                                       cw: .62, ch: .92, at: [x, 0, z], posts: 1.2, yaw });
     each row is n modules wide (text right-aligned into them); ink per row; posts: the height of the two legs (0 = no legs)
   r.flipTo(tl, row, text, at, { dur: .32, stagger: .09, turns: 2 })  flips that row's modules to new text on the timeline
     (turns: how many characters each module passes through before it lands, the board's riffle; 0 = straight to the text)
   r.set(row, text)  immediate. Words: the figure, its unit, a chip's name; every face is mirrored for `bw words`.
   r.w, r.h, r.top(), r.rowPoint(i)  sizes and world points for labels */
KIT.rateboard = { create(w, o = {}) {
  const T = THREE, B = KIT.box, cw = o.cw ?? .62, ch = o.ch ?? .92, gap = o.gap ?? .06, dep = .1, rowGap = ch * .28, pad = ch * .3;
  const cache = {};
  const half = (c, top, row) => {
    const key = c + '|' + top + '|' + row.ink + '|' + (row.family || '');
    if (cache[key]) return cache[key];
    const PXW = 256, PXH = 380;
    return (cache[key] = S3.canvasTex(w.renderer, PXW, PXH / 2, (x, W, H) => {
      x.fillStyle = o.face || '#141418'; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(245,241,229,.05)'; x.fillRect(0, top ? 0 : H - 10, W, 10);
      if (c.trim()) {
        x.fillStyle = row.ink || S3.css('--cream'); x.font = `${row.weight || 600} ${row.px || 300}px ${row.family || '"IBM Plex Mono"'}`;
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(c, W / 2, (top ? PXH / 2 : 0) + (row.dy ?? 16));
      }
    }));
  };
  const rows = (o.rows || []).map(r => Object.assign({ n: r.text.length }, r));
  const width = Math.max(...rows.map(r => r.n * (cw + gap) - gap)) + pad * 2;
  const height = rows.length * ch + (rows.length - 1) * rowGap + pad * 2;
  const g = new T.Group(), postH = o.posts ?? 1.2;
  g.add(B(width, height, .22, w.mat.rubber, 0, postH + height / 2, -.2));
  const fr = KIT.lineBox(width + .04, height + .04, .26, .035, o.line === 'grey' ? w.mat.greyLine : w.mat.goldLine); fr.position.set(0, postH - .02, -.2); g.add(fr);
  if (postH > 0) for (const dx of [-width * .32, width * .32]) g.add(B(.1, postH, .1, w.mat.graphite, dx, postH / 2, -.2));
  const words = [];
  rows.forEach((r, ri) => {
    const y0 = postH + height - pad - ri * (ch + rowGap) - ch;    /* bottom of this row */
    const rw = r.n * (cw + gap) - gap, x0 = width / 2 - pad - rw;  /* right-aligned */
    r.mods = Array.from({ length: r.n }, (_, i) => {
      const x = x0 + i * (cw + gap) + cw / 2, mk = () => new T.MeshStandardMaterial({ roughness: .5, metalness: .1, envMapIntensity: .4 });
      const up = new T.Mesh(new T.PlaneGeometry(cw, ch / 2), mk()), lo = new T.Mesh(new T.PlaneGeometry(cw, ch / 2), mk());
      up.position.set(x, y0 + ch * .75, .001); lo.position.set(x, y0 + ch * .25, .001);
      const flap = new T.Group(); flap.position.set(x, y0 + ch / 2, .012);
      const fa = new T.Mesh(new T.PlaneGeometry(cw, ch / 2), mk()); fa.position.y = ch / 4;
      const fb = new T.Mesh(new T.PlaneGeometry(cw, ch / 2), mk()); fb.position.y = ch / 4; fb.rotation.x = Math.PI;
      flap.add(fa, fb);
      g.add(B(cw + .02, ch + .02, .06, w.mat.graphite, x, y0 + ch / 2, -.035));
      g.add(up, lo, flap, B(cw + .01, .01, .02, w.mat.rubber, x, y0 + ch / 2, .006));
      return { up, lo, flap, fa, fb, from: ' ', to: ' ', s: { p: 1 } };
    });
    r.y0 = y0;
  });
  const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const pad0 = (r, text) => (' '.repeat(r.n) + text).slice(-r.n);
  const tex = (m, which, c, r) => { const t = half(c, which === 'top', r); if (m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; } };
  const hd = { group: root, w: width, h: height + postH, rows, s: {},
    set(ri, text) { const r = rows[ri]; const s = pad0(r, text); S3.mirror(w.words, [text]); r.mods.forEach((m, i) => { m.from = m.to = s[i]; m.s.p = 1; m.seq = null; }); },
    flipTo(tl, ri, text, at, fo = {}) {
      const r = rows[ri], s = pad0(r, text), dur = fo.dur ?? .32, stg = fo.stagger ?? .09, turns = fo.turns ?? 2;
      const POOL = fo.pool || '0123456789';
      S3.mirror(w.words, [text]);
      r.mods.forEach((m, i) => {
        const start = m.to, seq = [start], tn = /\d/.test(s[i]) ? turns : 0;
        if (start === s[i] && tn === 0) return;
        for (let k = 0; k < tn; k++) seq.push(POOL[(POOL.indexOf(start) + 1 + k * 3 + i) % POOL.length] || POOL[k % POOL.length]);
        if (seq[seq.length - 1] !== s[i] || seq.length === 1) seq.push(s[i]);
        const st = { k: 0 }, n = seq.length - 1;
        tl.to(st, { k: n, duration: dur * n, ease: 'none', onUpdate: () => {
          const j = Math.min(n - 1, Math.floor(st.k)), p = st.k >= n ? 1 : st.k - j;
          m.from = seq[j]; m.to = seq[j + 1]; m.s.p = st.k >= n ? 1 : p; }, onComplete: () => { m.from = m.to = s[i]; m.s.p = 1; } }, at + i * stg);
      });
    },
    top: () => { const p = new T.Vector3(0, postH + height + .3, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
    rowPoint: (ri, side = 'left') => { const r = rows[ri], p = new T.Vector3(side === 'left' ? -width / 2 : width / 2, r.y0 + ch / 2, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
    apply() {
      rows.forEach(r => r.mods.forEach(m => {
        const p = m.s.p, flipping = p > 0 && p < 1;
        tex(m.up, 'top', flipping ? m.to : (p >= 1 ? m.to : m.from), r);
        tex(m.lo, 'bot', flipping ? m.from : (p >= 1 ? m.to : m.from), r);
        m.flap.visible = flipping;
        if (flipping) { tex(m.fa, 'top', m.from, r); tex(m.fb, 'bot', m.to, r); m.flap.rotation.x = Math.PI * (p * p * (3 - 2 * p)); }
      }));
    } };
  rows.forEach((r, i) => hd.set(i, r.text));
  return w.add(hd);
} };
