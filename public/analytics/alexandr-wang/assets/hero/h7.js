/* H7 pair kit (alexandr-wang, Ive, 9-10 Oct 2026): shared by 06-the-chart-v2.html and 07-the-stock-v2.html only.
   A small true-perspective world in SVG: a camera (position, yaw, pitch, focal length) projects every point the page draws, so the
   floor recedes, near things pass faster than far ones, boxes are lit from one key light and cast soft ink shadows. No glow, no bloom:
   light is only face shading and a shadow. One state object and one draw(): GSAP tweens numbers in the state and draw() repaints
   from them, so any frame (?t=, ?capture, ?still) is a pure function of time.
     H.steps([['snap10', 1.28], …], 18.6)     ?at= overrides the step times in order, ?secs= the length (as hero-kit)
     H.cam.set(st)                             st.cx, st.cy, st.cz, st.yaw, st.pitch (degrees), st.F
     H.cam.p(x, y, z)                          → {x, y, k (px per world unit), z} or null behind the camera
     H.box(parent)                             a lit box: .set(x0, x1, y0, y1, z0, z1, rgb, {a, edge}); .hide(); .depth
     H.floor(parent)                           the measured floor and the date rail: .draw({X, d0, d1, step, rail, ...})
     H.label(runs, size, {a}).put(x, base, r, o, k)   HTML type that rises out of its own baseline through a mask
     H.run(state, draw, build, finalState)     BW.run contract; build(tl, S) adds the tweens
   Colours come from brand.css tokens only (H.rgb('--gold-rgb')). Type classes from hero-kit.css. */
const H = (() => {
  const Q = new URLSearchParams(location.search);
  const S = {}, ORDER = [];
  let END = 0;
  function steps(list, secs) {
    const given = (Q.get('at') || '').split(',').filter(s => s.trim() !== '').map(Number);
    list.forEach(([n, t], i) => { S[n] = i < given.length ? given[i] : t; ORDER.push(n); });
    END = +(Q.get('secs') || 0) || secs;
    return S;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function el(parent, tag, a = {}, st = '') {
    const n = document.createElementNS(NS, tag);
    for (const k in a) n.setAttribute(k, a[k]);
    if (st) n.setAttribute('style', st);
    parent.appendChild(n);
    return n;
  }
  const css = getComputedStyle(document.documentElement);
  const rgb = (v) => css.getPropertyValue(v).trim().split(',').map(Number);
  const col = (v, a) => { const x = css.getPropertyValue(v).trim(); return a == null ? x : `rgba(${x}, ${a})`; };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (c, k, a = 1) => `rgba(${Math.round(c[0] * k)}, ${Math.round(c[1] * k)}, ${Math.round(c[2] * k)}, ${a})`;

  /* ---------- the camera ---------- */
  const NEAR = 40;
  const cam = {
    F: 1500, c: [0, 0, 0], cy: 1, sy: 0, cp: 1, sp: 0, pos: [0, 0, 0],
    set(st) {
      this.F = st.F || 1500; this.pos = [st.cx, st.cy, st.cz];
      const y = st.yaw * Math.PI / 180, p = st.pitch * Math.PI / 180;
      this.cy = Math.cos(y); this.sy = Math.sin(y); this.cp = Math.cos(p); this.sp = Math.sin(p);
      /* flat mode (pass 6b): st.ortho 0..1 blends the perspective view into a level, orthographic elevation (x right, y up; the
         floor in front of the rail drops straight down so ticks hang level), framed by st.ocx, st.ocy, st.os */
      this.o = st.ortho || 0; this.oc = [st.ocx || 0, st.ocy || 0]; this.os = st.os || 1;
    },
    flat(x, y, z) { return { x: 960 + (x - this.oc[0]) * this.os, y: 540 - (y + Math.min(z, 0) * .6 - this.oc[1]) * this.os, k: this.os, z: 1000 }; },
    mix(P, x, y, z) { if (!this.o) return P; const Q = this.flat(x, y, z); if (!P || this.o >= 1) return Q;
      const t = this.o; return { x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t, k: P.k + (Q.k - P.k) * t, z: P.z }; },
    v(x, y, z) {                                    /* world → camera space [X, Y, Z] */
      const rx = x - this.pos[0], ry = y - this.pos[1], rz = z - this.pos[2];
      const X = rx * this.cy - rz * this.sy, Z1 = rx * this.sy + rz * this.cy;
      return [X, ry * this.cp + Z1 * this.sp, -ry * this.sp + Z1 * this.cp];
    },
    s(c) { return { x: 960 + this.F * c[0] / c[2], y: 540 - this.F * c[1] / c[2], k: this.F / c[2], z: c[2] }; },
    p(x, y, z) { const c = this.v(x, y, z); return this.mix(c[2] < NEAR ? null : this.s(c), x, y, z); },
    seg(a, b) {                                     /* a segment clipped at the near plane → [p, q] or null */
      if (this.o) { const P = this.p(...a), Q = this.p(...b); return P && Q ? [P, Q] : null; }
      let A = this.v(...a), B = this.v(...b);
      if (A[2] < NEAR && B[2] < NEAR) return null;
      if (A[2] < NEAR || B[2] < NEAR) {
        const t = (NEAR - A[2]) / (B[2] - A[2]), M = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, NEAR];
        if (A[2] < NEAR) A = M; else B = M;
      }
      return [this.s(A), this.s(B)];
    },
    poly(pts) { const out = []; for (const q of pts) { const p = this.p(...q); if (!p) return null; out.push(p); } return out; },
    /* a big plane (a wall, the floor zone) clipped at the near plane, so it never vanishes as the camera passes into it */
    clip(pts) {
      if (this.o) return this.poly(pts);
      const V = pts.map(q => this.v(...q)), out = [];
      for (let i = 0; i < V.length; i++) {
        const A = V[i], B = V[(i + 1) % V.length], ia = A[2] >= NEAR, ib = B[2] >= NEAR;
        if (ia) out.push(A);
        if (ia !== ib) { const t = (NEAR - A[2]) / (B[2] - A[2]); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, NEAR]); }
      }
      return out.length >= 3 ? out.map(c => this.s(c)) : null;
    },
    see(n, c) { return n[0] * (this.pos[0] - c[0]) + n[1] * (this.pos[1] - c[1]) + n[2] * (this.pos[2] - c[2]) > 0; }
  };
  const ptsOf = (P) => P.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');

  /* ---------- a lit box (six faces, back faces culled, one key light from the upper left, in front) ---------- */
  const LIGHT = (() => { const v = [-.45, .8, -.4], m = Math.hypot(...v); return v.map(x => x / m); })();
  const shade = (n) => .34 + .66 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  function box(parent) {
    const g = el(parent, 'g'), faces = [];
    for (let i = 0; i < 6; i++) faces.push(el(g, 'polygon'));
    return {
      g, depth: 0,
      hide() { g.style.display = 'none'; this.depth = -1; },
      set(x0, x1, y0, y1, z0, z1, c, o = {}) {
        if (y1 - y0 < .01) { this.hide(); return; }
        const F = [[[0, 1, 0], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
                   [[0, -1, 0], [[x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0]]],
                   [[0, 0, -1], [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]],
                   [[0, 0, 1], [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]]],
                   [[-1, 0, 0], [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]]],
                   [[1, 0, 0], [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]]];
        const cen = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], cz = cam.v(...cen)[2];
        if (cz < NEAR + 20) { this.hide(); return; }
        g.style.display = ''; this.depth = cz;
        const a = o.a == null ? 1 : o.a;
        F.forEach(([n, P], i) => {
          const f = faces[i], pc = [(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2, (P[0][2] + P[2][2]) / 2];
          const pr = cam.see(n, pc) ? cam.poly(P) : null;
          if (!pr) { f.style.display = 'none'; return; }
          f.style.display = '';
          f.setAttribute('points', ptsOf(pr));
          const k = shade(n) * (o.k || 1);
          f.setAttribute('style', `fill:${rgba(c, k, a)};` + (o.edge ? `stroke:${o.edge}; stroke-width:${o.ew || 1.4}; stroke-linejoin:round;` : 'stroke:none;'));
        });
      }
    };
  }
  /* the soft ink shadow of a box or a standing card on the floor (y = 0), cast away from the light */
  const SH = [.42, .5];
  function shadowPts(x0, x1, z0, z1, h) {
    const ox = SH[0] * h, oz = SH[1] * h;
    return cam.poly([[x0, 0, z0], [x1, 0, z0], [x1 + ox, 0, z0 + oz], [x1 + ox, 0, z1 + oz], [x0 + ox, 0, z1 + oz], [x0, 0, z1]]);
  }

  /* a pool of key light on the floor (y = 0), so ink shadows have something to fall on: surface light, not glow */
  function pool(parent, fill = 'url(#pool)') {
    const n = el(parent, 'polygon', {}, `fill:${fill}`);
    return { n, set(x, z, r, a = 1) {
      const P = []; for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2; P.push([x + Math.cos(t) * r, 0, z + Math.sin(t) * r * .8]); }
      const pr = cam.clip(P); if (!pr) { n.style.display = 'none'; return; }
      n.style.display = ''; n.setAttribute('points', ptsOf(pr)); n.style.opacity = a; } };
  }
  /* screen points of a rounded rectangle given in a face's unit square, mapped by the face's corners */
  function rrPath(TL, TR, BL, u, v, w, h, r, asp) {
    const P = [], arc = (cu, cv, a0) => { for (let i = 0; i <= 4; i++) { const t = a0 + i / 4 * Math.PI / 2; P.push([cu + Math.cos(t) * r, cv + Math.sin(t) * r * asp]); } };
    const rv = r * asp;
    arc(u + w - r, v + rv, -Math.PI / 2); arc(u + w - r, v + h - rv, 0); arc(u + r, v + h - rv, Math.PI / 2); arc(u + r, v + rv, Math.PI);
    return 'M' + P.map(([a, b]) => (TL.x + a * (TR.x - TL.x) + b * (BL.x - TL.x)).toFixed(1) + ',' + (TL.y + a * (TR.y - TL.y) + b * (BL.y - TL.y)).toFixed(1)).join('L') + 'Z';
  }

  /* ---------- the measured floor: a fine grid in perspective, the date rail at z = 0, its ticks and numbers ---------- */
  function floor(parent, labsize = 32) {
    const g = el(parent, 'g'), pool = [], labs = [];
    let used = 0, lused = 0;
    const line = (a, b, style) => {
      const s = cam.seg(a, b); if (!s) return;
      const n = pool[used] || (pool[used] = el(g, 'line')); used++;
      n.setAttribute('x1', s[0].x.toFixed(1)); n.setAttribute('y1', s[0].y.toFixed(1));
      n.setAttribute('x2', s[1].x.toFixed(1)); n.setAttribute('y2', s[1].y.toFixed(1));
      n.setAttribute('style', style); n.style.display = '';
    };
    const fog = (z) => clamp(1 - (z - 1400) / 6500, 0, 1);
    return {
      g, line,
      /* o: X(t) world x of a day number t; t0..t1 the days drawn; tick(t) → 0 none | 1 minor | 2 major; text(t) the label or '';
         zmax depth of the grid; a the floor's opacity; hi(t) → 0..1 gold highlight of a day */
      draw(o) {
        used = 0; lused = 0;
        const A = o.a == null ? 1 : o.a, zmax = o.zmax || 3200, cream = rgb('--cream-rgb'), gold = rgb('--gold-rgb');
        /* lines along the rail (constant z), cut into pieces so they fade with distance */
        const xa = o.X(o.t0), xb = o.X(o.t1), N = 10;
        for (let z = 300; z <= zmax; z += 300) for (let i = 0; i < N; i++) {
          const p0 = xa + (xb - xa) * i / N, p1 = xa + (xb - xa) * (i + 1) / N, c = cam.v((p0 + p1) / 2, 0, z);
          if (c[2] < NEAR) continue;
          if (cam.o < 1) line([p0, 0, z], [p1, 0, z], `stroke:rgba(${cream}, ${(.06 * fog(c[2]) * A * (1 - cam.o)).toFixed(3)}); stroke-width:1.2`);
        }
        /* lines across (one per tick), the rail and the ticks */
        for (let t = Math.ceil(o.t0); t <= o.t1; t++) {
          const k = o.tick(t); if (!k) continue;
          const x = o.X(t), hi = o.hi ? o.hi(t) : 0;
          for (let z = -300; z < zmax; z += 400) {
            const c = cam.v(x, 0, z + 200); if (c[2] < NEAR) continue;
            if (cam.o < 1) line([x, 0, z], [x, 0, Math.min(zmax, z + 400)],`stroke:rgba(${cream}, ${((k === 2 ? .07 : .04) * fog(c[2]) * A * (1 - cam.o)).toFixed(3)}); stroke-width:1.2`);
          }
          const tl = k === 2 ? 34 : 18;
          line([x, 0, 0], [x, 0, -tl], hi > .5 ? `stroke:rgb(${gold}); stroke-width:3` : `stroke:rgba(${cream}, ${(.5 * A).toFixed(3)}); stroke-width:2`);
          const txt = o.text ? o.text(t) : '';
          if (txt && o.labels !== false) {
            const p = cam.p(x, 0, -tl - 30 + (o.lz || 0));
            if (p && p.x > -100 && p.x < 2020 && p.y < 1060) {
              const L = labs[lused] || (labs[lused] = label([['', 'ax']], labsize, { a: 'm' })); lused++;
              L.span.firstChild.textContent = txt;
              L.span.firstChild.className = hi > .5 ? 'n g' : o.cls ? o.cls(k) : k === 2 ? 'n' : 'ax';
              const sc = clamp(p.k * (o.lk || 1), 1, 1.15);
              L.put(p.x, p.y + labsize * sc * .9, 1, A * (o.la == null ? 1 : o.la) * clamp(fog(p.z) * 1.4), sc);
            }
          }
        }
        line([xa, 0, 0], [xb, 0, 0], `stroke:rgba(${cream}, ${(.45 * A).toFixed(3)}); stroke-width:2`);
        /* the back wall (o.wz): the floor meets it in a corner; a graph-paper grid that fades as it climbs */
        if (o.wz) {
          if (cam.o < 1) line([xa, 0, o.wz], [xb, 0, o.wz], `stroke:rgba(${cream}, ${(.16 * A * (1 - cam.o)).toFixed(3)}); stroke-width:1.5`);
          const wh = o.wh || 1100, NV = 6;
          for (let t = Math.ceil(o.t0); t <= o.t1; t++) {
            if (!o.tick(t)) continue;
            const x = o.X(t);
            for (let i = 0; i < NV; i++) line([x, wh * i / NV, o.wz], [x, wh * (i + 1) / NV, o.wz],
              `stroke:rgba(${cream}, ${(.08 * (1 - i / NV) * A).toFixed(3)}); stroke-width:1.2`);
          }
          (o.wrows || []).forEach(([y, a]) => line([xa, y, o.wz], [xb, y, o.wz],
            `stroke:rgba(${cream}, ${((a || .05) * A).toFixed(3)}); stroke-width:1.2`));
        }
        for (let i = used; i < pool.length; i++) pool[i].style.display = 'none';
        for (let i = lused; i < labs.length; i++) labs[i].put(0, 0, 0, 0);
      }
    };
  }

  /* ---------- labels: HTML, rise through a mask ---------- */
  const LABS = document.getElementById('labs');
  /* every label not placed in this frame's draw() is hidden: a label never sits stale where it was last put */
  let FRAME = 0; const ALL = [];
  let CB = null;
  const creditBox = () => { if (CB && CB.width > 0) return CB; const n = document.querySelector('.bw-source'); if (!n) return null;
    const r = n.getBoundingClientRect(); if (!r.width) return null; CB = { left: r.left - 14, top: r.top - 14, right: r.right + 14, bottom: r.bottom + 10, width: r.width }; return CB; };
  function label(runs, size, o = {}) {
    const d = document.createElement('div');
    d.className = 'hk';
    d.style.fontSize = size + 'px';
    const m = document.createElement('div'); m.className = 'bw-m'; d.appendChild(m);
    const s = document.createElement('span'); m.appendChild(s);
    (typeof runs === 'string' ? [[runs, o.cls || 'w']] : runs).forEach(([t, c, gap, sz]) => {
      const r = document.createElement('span'); r.className = c; r.textContent = t;
      if (gap) r.style.marginLeft = gap + 'px';
      if (sz) r.style.fontSize = sz + 'px';
      s.appendChild(r);
    });
    LABS.appendChild(d); ALL.push(d);
    const ax = o.a === 'e' ? -100 : o.a === 'm' ? -50 : 0;
    return {
      node: d, span: s,
      put(x, base, r = 1, op = 1, k = 1) {
        d._f = FRAME;
        d.style.left = x.toFixed(1) + 'px'; d.style.top = (base - .92 * size * k).toFixed(1) + 'px';
        d.style.transform = `translateX(${ax}%) scale(${k.toFixed(4)})`;
        d.style.transformOrigin = ax === -100 ? '100% 0' : ax === -50 ? '50% 0' : '0 0';
        s.style.transform = `translateY(${((1 - clamp(r)) * 130).toFixed(2)}%)`;
        if (op <= 0.001 || r <= 0.001) { d.style.opacity = 0; return; }
        /* the frame check (10 Oct): a label is never cropped by the frame and never sits on the credit; it fades out first */
        const b = d.getBoundingClientRect(), m = Math.min(b.left, b.top, 1920 - b.right, 1080 - b.bottom);
        let f = clamp(m / 36);
        const c = creditBox();
        if (c) { const gap = Math.max(c.top - b.bottom, b.left - c.right, b.top - c.bottom, c.left - b.right); f *= clamp(gap / 24); }
        d.style.opacity = op * f;
      }
    };
  }

  /* the credit sits on clear ground: the world is masked out under it, with a soft edge, so anything the camera sweeps past
     there passes behind clear ink (frame check, 10 Oct) */
  let CM = null;
  function creditClear() {
    if (CM) return; const c = creditBox(), world = document.getElementById('world'); if (!c || !world) return;
    const svg = world.ownerSVGElement, defs = svg.querySelector('defs') || el(svg, 'defs');
    const m = el(defs, 'mask', { id: 'creditClear', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1920, height: 1080 });
    const f = el(defs, 'filter', { id: 'creditSoft', x: '-20%', y: '-50%', width: '140%', height: '200%' }); el(f, 'feGaussianBlur', { stdDeviation: 10 });
    el(m, 'rect', { x: 0, y: 0, width: 1920, height: 1080, fill: 'white' });
    el(m, 'rect', { x: c.left - 6, y: c.top - 4, width: c.right - c.left + 12, height: 1080 - c.top + 4, rx: 12, fill: 'black', filter: 'url(#creditSoft)' });
    world.setAttribute('mask', 'url(#creditClear)'); CM = m;
  }
  function to(tl, st, vars, at, dur, ease = 'power2.inOut') { tl.to(st, Object.assign({}, vars, { duration: dur, ease }), at); }
  function run(st, draw0, build, finalState) {
    const draw = () => { FRAME++; draw0(); ALL.forEach(d => { if (d._f !== FRAME) d.style.opacity = 0; }); creditClear(); };
    const init = Object.assign({}, st);
    const play = () => {
      Object.assign(st, init); draw();
      const tl = gsap.timeline({ onUpdate: draw });
      ORDER.forEach(n => BW.mark(tl, n, S[n]));
      build(tl, S);
      gsap.set('.bw-source', { opacity: 0 });
      tl.to('.bw-source', { opacity: 1, duration: .8 }, Math.max(0, S[ORDER[0]] + .3));
      tl.to({}, { duration: .01 }, END - .01);
      return tl;
    };
    const rest = () => { Object.assign(st, init, finalState); draw(); gsap.set('.bw-source', { opacity: 1 }); };
    BW.run({ play, rest });
  }
  return { steps, el, label, rgb, col, rgba, clamp, lerp, cam, box, floor, pool, rrPath, shadowPts, ptsOf, to, run, S, NS, get END() { return END; } };
})();
