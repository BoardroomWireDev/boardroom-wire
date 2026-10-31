/* ============================================================
   SPACEX Q3 · CARDS (Ive, 28 Oct 2026). Receipts center stage, and text cards. Needs motion.js (BW), data.js, GSAP, cards.css.
   The API, the rules and the examples: CARDS.md (same folder). Proof: dashboards/cards-demo.html?show=s1|ornn|question|pair|line.

     CARDS.receipt(parent, o)      one flat card of a real capture, tilted, settles centred, pushes; the gold pen on a word time
     CARDS.pair(parent, [a, b], o) two receipts side by side (e.g. Elon's post and Bloomberg's line)
     CARDS.sequence(parent, items, o)  receipts in date order on a date line: each takes the centre, then steps down onto its date
     CARDS.textCard(parent, o)     the writer's question or a subject's quote, full frame, word by word or line by line, key words gold
     CARDS.spoken(key)             a data.js figure as the voice says it ("$1 trillion", "$120.5 billion")
     CARDS.pack(path)              a stock-pack path, under ?pack= when the renderer passes it, else ../stock-pack/

   Every component builds its DOM once and adds its motion with .play(tl) on the page's one timeline, so ?t=, ?still, ?final
   and ?capture hold (rest = the same timeline at its end). Coordinates are the 1920 × 1080 stage; capture boxes are in the
   capture's own pixels. Nothing glows, nothing floats (rule 12); the pen marks only what the capture prints (rule 18).
   ============================================================ */
const CARDS = (() => {
  const Q = new URLSearchParams(location.search);
  const PACK = (Q.get('pack') || '../stock-pack/').replace(/\/?$/, '/');
  const pack = (p) => PACK + String(p).replace(/^\/+/, '');
  const NS = 'http://www.w3.org/2000/svg';
  const div = (cls, parent) => { const e = document.createElement('div'); e.className = cls; parent.appendChild(e); return e; };
  const svgEl = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); parent.appendChild(n); return n; };
  const css = (e, o) => { for (const k in o) e.style[k] = typeof o[k] === 'number' ? o[k] + 'px' : o[k]; return e; };
  const d = (pts) => 'M ' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L ');
  const trim = (n) => String(+(+n).toFixed(1));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- the figure as spoken, and the credit, both from data.js ---------- */
  function spoken(key) {
    const f = BW.fig(key);
    if (f.v != null && /^USD millions/.test(f.unit || '')) {
      const v = Math.abs(f.v), sign = f.v < 0 ? '−' : '';
      const [n, w] = v >= 1e6 ? [v / 1e6, 'trillion'] : v >= 1e3 ? [v / 1e3, 'billion'] : [v, 'million'];
      return sign + '$' + trim(n) + ' ' + w;
    }
    if (f.v != null && f.unit === 'percent') return trim(f.v) + '%';
    return BW.val(key);
  }
  function credit(sourceKey) {
    const s = BW.src(sourceKey), t = s.tier || 'R';
    if (t === 'C') return 'Boardroom Wire calculation.';
    return (t === 'P' ? 'Source: ' : t === 'E' ? 'Estimate: ' : 'Reported by ') + s.name + '.';
  }

  /* ---------- the gold pen: a hand-drawn ring, a hand-drawn underline (19-promise, 25-pullout) ---------- */
  function ring(cx, cy, rx, ry, k = 0) {
    const pts = [], a0 = Math.PI * (1.1 + k * .15), sweep = Math.PI * 2.18, tilt = -.06 + (k % 2) * .05;
    for (let i = 0; i <= 72; i++) {
      const a = a0 + sweep * i / 72, j = 1 + .05 * Math.sin(a * 2 + k) + .025 * Math.sin(a * 5);
      const x = Math.cos(a) * rx * j, y = Math.sin(a) * ry * j * (1 + .08 * i / 72);
      pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    }
    return d(pts);
  }
  function under(x0, x1, y, k = 0) {
    const pts = [];
    for (let i = 0; i <= 36; i++) { const u = i / 36; pts.push([x0 - 6 + (x1 - x0 + 12) * u, y + 2.2 * Math.sin(u * 3.1 + k) - 4 * u]); }
    return d(pts);
  }

  /* ---------- title-safe (EF candidate rule, 28 Oct): every card and printed line stays 7% inside every edge, on every frame ----------
     safe(o)            the box: o.safe = a fraction (default .07) or false to opt out
     extents(W, H, below, tilt)   the tilted card's outline (plus a credit line `below` it) about its centre
     Every move here is one tween of position and scale with one ease, so if its first and last frames are inside the box,
     every frame between is too. */
  function safe(o) { const m = o.safe === false ? -1 : (o.safe ?? .07); return { x0: 1920 * m, x1: 1920 * (1 - m), y0: 1080 * m, y1: 1080 * (1 - m) }; }
  function extents(W, H, below, tilt) {
    const r = tilt * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r);
    const pts = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2 + below], [-W / 2, H / 2 + below]].map(([x, y]) => [x * c - y * sn, x * sn + y * c]);
    return { x0: Math.min(...pts.map(q => q[0])), x1: Math.max(...pts.map(q => q[0])), y0: Math.min(...pts.map(q => q[1])), y1: Math.max(...pts.map(q => q[1])) };
  }
  const CREDIT_H = 52;   /* .cd-credit: 14 px margin + one 26 px line (the one credit size, brand.css v5.9) */
  const clampTo = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));

  /* ============================================================
     receipt(parent, o)   (v3, 28 Oct: large, center stage, and title-safe on every frame)
       o.src     capture path (relative to the page; CARDS.pack('07-picture-map/pages/…') for the stock pack)
       o.crop    [x, y, w, h] in capture pixels, or a list of bands [[…], […]] (masthead, headline, the sentence) stacked
                 into one card with a dashed join, all at one scale
       o.size    'paragraph' (76% of the frame's width) | 'short' (60%: a post, a headline) | a fraction. Default: 'paragraph'
                 when the crop is at least 2.6× as wide as tall, else 'short'. Height capped at 80%.
       o.maxW / o.maxH / o.width   override the box in px. Whatever the size, the card is shrunk and moved, if it must be,
                 so its tilted outline (and credit line) sits inside the safe box (o.safe, .07; false to opt out)
       o.at      the card's centre at rest [cx, cy] (default [960, 520])
       o.tilt    degrees (default -1.4)        o.paper  the capture's page colour (default 'white'); o.dark: true for a dark page
       o.enter   time the card rises in (default 0)        o.until  end of the hold (default enter + 6)
       o.marks   [{ ring: [x0,y0,x1,y1] } | { under: [x0,y0,x1,y1] }, at, dur, w (9) ] boxes in capture pixels, on word times
       o.zoom    after the pen draws, the push-in toward the latest marked line: the card's scale at the end (default 1.3; 0 for
                 none), capped so the card stays inside the safe box. o.drift (default 1): how far the marked line travels
                 toward o.focus ([960, 540]), stopping where the card would cross the margin. No marks: a slow push (o.push 1.035, capped)
       o.exit    time it leaves (optional), o.exitTo 'down'|'left'|'right' (an exit leaves the frame by design)
       o.credit  a data.js SOURCE key: one line under the card's lower edge (an overlay on a running board, rule 17)
     returns { el, W, H, cx, cy, s, tilt, ext, room, point(sx, sy), play(tl) }   (ext: the outline about the centre; room: the largest safe scale)
     ============================================================ */
  const SIZE = { paragraph: .76, short: .6 };
  function receipt(parent, o) {
    const crops = Array.isArray(o.crop[0]) ? o.crop : [o.crop];
    const gap = crops.length > 1 ? (o.gap ?? 28) : 0, nb = crops.length - 1;
    const natW = Math.max(...crops.map(c => c[2])), natH = crops.reduce((a, c) => a + c[3], 0);
    const kind = o.size ?? (natW / natH >= 2.6 ? 'paragraph' : 'short');
    const maxW = o.maxW || 1920 * (SIZE[kind] || +kind), maxH = o.maxH || 1080 * .8;
    const tilt = o.tilt ?? -1.4, below = o.credit ? CREDIT_H : 0, SB = safe(o);
    let s = o.width ? o.width / natW : Math.min(maxW / natW, (maxH - gap * nb) / natH);
    for (let k = 0; k < 4; k++) {   /* shrink until the tilted card fits the safe box */
      const e = extents(natW * s, natH * s + gap * nb, below, tilt);
      const f = Math.min(1, (SB.x1 - SB.x0) / (e.x1 - e.x0), (SB.y1 - SB.y0) / (e.y1 - e.y0));
      if (f >= .999) break; s *= f * .998;
    }
    const W = natW * s, H = natH * s + gap * nb, ext = extents(W, H, below, tilt);
    const at0 = o.at || [960, 520];
    const cx = clampTo(at0[0], SB.x0 - ext.x0, SB.x1 - ext.x1), cy = clampTo(at0[1], SB.y0 - ext.y0, SB.y1 - ext.y1);
    const room = Math.max(1, Math.min((SB.x1 - SB.x0) / (ext.x1 - ext.x0), (SB.y1 - SB.y0) / (ext.y1 - ext.y0)));
    const el = div('cd-rc' + (o.dark ? ' dark' : ''), parent);
    css(el, { left: cx - W / 2, top: cy - H / 2, width: W, height: H });
    const paper = div('cd-paper', el); paper.style.background = o.paper || 'white';
    const tops = [];
    let y = 0;
    crops.forEach((c, i) => {
      if (i) css(div('cd-cut', paper), { top: y - gap / 2 - 1 });
      const band = css(div('cd-band', paper), { top: y, width: c[2] * s, height: c[3] * s });
      const img = document.createElement('img'); img.src = o.src; img.alt = ''; img.draggable = false;
      css(img, { transform: `translate(${-c[0] * s}px, ${-c[1] * s}px) scale(${s})` });
      band.appendChild(img);
      tops.push(y); y += c[3] * s + gap;
    });
    /* a capture point → the card's own pixels (the pen lives in the card, so it tilts and pushes with it) */
    const local = (sx, sy) => {
      let i = crops.findIndex(c => sy >= c[1] && sy <= c[1] + c[3]);
      if (i < 0) i = 0;
      return [(sx - crops[i][0]) * s, tops[i] + (sy - crops[i][1]) * s];
    };
    const pen = svgEl('svg', { class: 'cd-pen', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, el);
    const marks = (o.marks || []).map((m, k) => {
      const b = m.ring || m.under;
      const [x0, y0] = local(b[0], b[1]), [x1, y1] = local(b[2], b[3]);
      const path = svgEl('path', { d: m.ring ? ring((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 20, (y1 - y0) / 2 + 11, k)
                                             : under(x0, x1, y1 + 9, k) }, pen);
      path.style.strokeWidth = (m.w || 9) + 'px';
      const L = path.getTotalLength() + 2;
      path.setAttribute('stroke-dasharray', L);
      return { path, L, at: m.at, dur: m.dur || (m.ring ? .55 : .6), c: [cx - W / 2 + (x0 + x1) / 2, cy - H / 2 + (y0 + y1) / 2] };
    });
    if (o.credit) { const c = div('cd-credit', el); c.textContent = credit(o.credit); }
    /* the push-in, title-safe: the end scale Zf is capped by the room; the shift that would land the marked line on the
       focus is scaled by drift and clamped so the card's outline stays inside the box at Zf (and so at every smaller scale) */
    const Zf = Math.min((o.zoom ?? 1.3) * 1.012, room), Z = Zf / 1.012, F = o.focus || [960, 540], DR = o.drift ?? 1;
    const zoomTo = (m) => {
      const r = tilt * Math.PI / 180, dx = (m.c[0] - cx) * Z, dy = (m.c[1] - cy) * Z;
      const tx = DR * (F[0] - cx - (dx * Math.cos(r) - dy * Math.sin(r))), ty = DR * (F[1] - cy - (dx * Math.sin(r) + dy * Math.cos(r)));
      return { x: clampTo(tx, SB.x0 - cx - Zf * ext.x0, SB.x1 - cx - Zf * ext.x1), y: clampTo(ty, SB.y0 - cy - Zf * ext.y0, SB.y1 - cy - Zf * ext.y1), scale: Z };
    };

    const api = {
      el, W, H, cx, cy, s, tilt, marks, ext, room,
      point(sx, sy) { const [x, y] = local(sx, sy); return { x: cx - W / 2 + x, y: cy - H / 2 + y }; },   /* at rest, untilted */
      /* a hand-timed lean for pages that move the card (or a layer about the card's centre) themselves: the {x, y, scale}
         that pushes toward capture box `box`, title-safe (scale capped by the room, the drift clamped). tl.to(card.el or layer, card.lean(…)) */
      lean(box, Zl, lo = {}) {
        const [x0, y0] = local(box[0], box[1]), [x1, y1] = local(box[2], box[3]), Zc = Math.min(Zl, room);
        const m = { c: [cx - W / 2 + (x0 + x1) / 2, cy - H / 2 + (y0 + y1) / 2] }, f = lo.focus || F, d = lo.drift ?? 1;
        const r = tilt * Math.PI / 180, dx = (m.c[0] - cx) * Zc, dy = (m.c[1] - cy) * Zc;
        const tx = d * (f[0] - cx - (dx * Math.cos(r) - dy * Math.sin(r))), ty = d * (f[1] - cy - (dx * Math.sin(r) + dy * Math.cos(r)));
        return { x: clampTo(tx, SB.x0 - cx - Zc * ext.x0, SB.x1 - cx - Zc * ext.x1), y: clampTo(ty, SB.y0 - cy - Zc * ext.y0, SB.y1 - cy - Zc * ext.y1), scale: Zc };
      },
      play(tl) {
        const t0 = o.enter || 0, settle = .85, until = o.until ?? t0 + 6;
        const rise = Math.max(0, Math.min(60, SB.y1 - (cy + ext.y1)));   /* rises from inside the box */
        tl.fromTo(el, { x: 0, y: rise, rotation: tilt + 1.2, scale: .955, opacity: 0 },
                      { x: 0, y: 0, rotation: tilt, scale: 1, opacity: 1, duration: settle, ease: 'power3.out' }, t0);
        marks.forEach(m => tl.fromTo(m.path, { attr: { 'stroke-dashoffset': m.L } },
                                              { attr: { 'stroke-dashoffset': 0 }, duration: m.dur, ease: 'power1.inOut' }, Math.max(t0 + .3, m.at - .04)));
        const lead = marks.length ? marks.reduce((a, m) => (m.at > a.at ? m : a)) : null;
        if (lead && o.zoom !== 0 && Z > 1.01) {
          const drawn = Math.max(t0 + settle, Math.max(t0 + .3, lead.at - .04) + lead.dur), pre = Math.min(1.015, Z);
          if (drawn > t0 + settle) tl.fromTo(el, { scale: 1 }, { scale: pre, duration: drawn - t0 - settle, ease: 'none', immediateRender: false }, t0 + settle);
          const zd = Math.min(1.6, Math.max(.6, until - drawn - .05));
          tl.to(el, { ...zoomTo(lead), duration: zd, ease: 'power2.inOut' }, drawn + .05);
          if (until > drawn + .05 + zd) tl.to(el, { scale: Zf, duration: until - drawn - .05 - zd, ease: 'none' }, drawn + .05 + zd);
        } else if (until > t0 + settle) {
          tl.fromTo(el, { scale: 1 }, { scale: Math.min(o.push ?? 1.035, room), duration: until - t0 - settle, ease: 'none', immediateRender: false }, t0 + settle);
        }
        if (o.exit != null) {
          const to = o.exitTo === 'left' ? { x: '-=1600' } : o.exitTo === 'right' ? { x: '+=1600' } : { y: '+=80', opacity: 0 };
          tl.to(el, { ...to, duration: o.exitTo ? .6 : .45, ease: 'power2.in' }, o.exit);
        }
        return tl;
      }
    };
    return api;
  }

  /* ============================================================
     pair(parent, [a, b], o)   (v3, 28 Oct: fills the frame inside the 7% margin)
       Two receipts side by side, centred as a group: each about 45% of the frame's width; when one is a single sentence
       (a crop at least 4× as wide as tall) the other gets 55% and the sentence 38%; then both shrink together, if they must,
       so the group (tilts and credit lines included) sits inside the safe box. Each item takes the receipt options (its
       own enter, marks with the 9 px pen, its own push). After the latest pen mark the pair pushes slowly toward that line
       (o.push 1.14 at o.until), capped so both cards stay inside the box; with no mark, 1.03 about the group's centre.
       o.drift  (default 0) how far the marked line travels toward o.focus ([960, 540]), never past the margin
       o.gap  between the cards (44)   o.y  the group's centre line (520)   o.widths  [fa, fb] fractions to override   o.safe
     ============================================================ */
  function pair(parent, items, o = {}) {
    const wrap = div('cd-pair', parent), SB = safe(o);
    const dims = items.map(it => { const c = Array.isArray(it.crop[0]) ? it.crop : [it.crop];
      return { nw: Math.max(...c.map(q => q[2])), nh: c.reduce((a, q) => a + q[3], 0), bands: (c.length - 1) * (c.length > 1 ? (it.gap ?? 28) : 0), below: it.credit ? CREDIT_H : 0 }; });
    const sentence = dims.map(d => d.nw / d.nh >= 4);
    const fr = o.widths || (sentence[0] !== sentence[1] ? sentence.map(x => x ? .38 : .55) : [.45, .45]);
    const tilts = [items[0].tilt ?? -1.6, items[1].tilt ?? 1.2], off = [-18, 22], gap = o.gap ?? 44, Y = o.y ?? 520;
    let ws = fr.map((f, i) => Math.min(1920 * f, (1080 * .8 - dims[i].bands) * dims[i].nw / dims[i].nh));
    const layout = () => {
      const es = ws.map((w, i) => extents(w, w * dims[i].nh / dims[i].nw + dims[i].bands, dims[i].below, tilts[i]));
      const total = (es[0].x1 - es[0].x0) + gap + (es[1].x1 - es[1].x0), left = 960 - total / 2;
      const cxs = [left - es[0].x0, left + (es[0].x1 - es[0].x0) + gap - es[1].x0];
      const y0 = Math.min(Y + off[0] + es[0].y0, Y + off[1] + es[1].y0), y1 = Math.max(Y + off[0] + es[0].y1, Y + off[1] + es[1].y1);
      return { cxs, total, h: y1 - y0, y0, y1 };
    };
    let L = layout();
    for (let k = 0; k < 6; k++) {   /* both shrink together until the group fits the box */
      const f = Math.min(1, (SB.x1 - SB.x0 - gap) / (L.total - gap), (SB.y1 - SB.y0) / L.h);
      if (f >= .999) break; ws = ws.map(w => w * f * .998); L = layout();
    }
    const dy = Math.min(0, SB.y1 - L.y1) + Math.max(0, SB.y0 - L.y0);
    const cards = items.map((it, i) => receipt(wrap, { zoom: 0, push: 1, ...it, width: ws[i], at: [L.cxs[i], Y + off[i] + dy], tilt: tilts[i], safe: o.safe }));
    /* the group's outline at its largest (each card at the end of its own push) */
    const B = cards.reduce((b, c, i) => { const k = Math.min(items[i].push ?? 1, c.room);
      return { x0: Math.min(b.x0, c.cx + k * c.ext.x0), x1: Math.max(b.x1, c.cx + k * c.ext.x1), y0: Math.min(b.y0, c.cy + k * c.ext.y0), y1: Math.max(b.y1, c.cy + k * c.ext.y1) }; },
      { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    return {
      cards, el: wrap,
      play(tl) {
        cards.forEach(c => c.play(tl));
        const marks = cards.flatMap(c => c.marks), until = o.until ?? Math.max(...items.map(it => it.until ?? (it.enter || 0) + 6));
        const lead = marks.length ? marks.reduce((p, m) => (m.at > p.at ? m : p)) : null;
        const t0 = lead ? Math.max(...items.map(it => (it.enter || 0) + .85), lead.at - .04 + lead.dur) : Math.max(...items.map(it => (it.enter || 0) + .85));
        const [ox, oy] = lead ? lead.c : [(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2];
        /* the largest scale about (ox, oy) that keeps the group inside the box, then the drift, clamped the same way */
        const lim = (q, b0, b1, s0, s1) => Math.min(b0 < q ? (q - s0) / (q - b0) : 9, b1 > q ? (s1 - q) / (b1 - q) : 9);
        const S = Math.max(1, Math.min(o.push ?? (lead ? 1.14 : 1.03), lim(ox, B.x0, B.x1, SB.x0, SB.x1), lim(oy, B.y0, B.y1, SB.y0, SB.y1)));
        const F = o.focus || [960, 540], DR = lead ? (o.drift ?? 0) : 0;
        const dx = clampTo(DR * (F[0] - ox), SB.x0 - (ox + S * (B.x0 - ox)), SB.x1 - (ox + S * (B.x1 - ox)));
        const dyy = clampTo(DR * (F[1] - oy), SB.y0 - (oy + S * (B.y0 - oy)), SB.y1 - (oy + S * (B.y1 - oy)));
        if (until > t0) tl.fromTo(wrap, { scale: 1, x: 0, y: 0, transformOrigin: `${ox}px ${oy}px` }, { scale: S, x: dx, y: dyy, duration: until - t0, ease: 'power1.inOut', immediateRender: false }, t0);
        return tl;
      }
    };
  }

  /* ============================================================
     sequence(parent, items, o): receipts in date order on a date line (ch 6.4: FT 6 Oct → Elon 25 Oct → Bloomberg 25 Oct → 8-K 26 Oct)
       items  receipt options plus  date: 'YYYY-MM-DD'  and  enter  (its word time). Each card lands large and centred (the
              receipt defaults), the pen draws, the camera pushes in; when the next arrives it shrinks onto its own slot on the
              line. Only the current card is big.
       Slots  in date order at calendar distance, but never closer than a card's width: a long gap still reads long, and
              same-day or next-day cards stand side by side instead of bunching. Same-day cards share one date label.
       o.y    the date line (default 940)   o.x0/o.x1 its ends (160 / 1760)   o.thumbW  a stepped-down card's width (290)
       o.at   the landing centre [960, 405]  o.maxH  the landing card's height cap (590)  o.zoom  push-in (1.15)  o.until  the last hold
     ============================================================ */
  function sequence(parent, items, o = {}) {
    const SB = safe(o);   /* the line, its dates and the stepped-down cards stay inside the 7% box too */
    const Y = Math.min(o.y ?? 940, SB.y1 - 56), X0 = Math.max(o.x0 ?? 160, SB.x0), X1 = Math.min(o.x1 ?? 1760, SB.x1), TW = o.thumbW ?? 290, G = TW + 34;
    const L = X0 + TW / 2, R = X1 - TW / 2, n = items.length;
    const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
    const days = items.map(it => day(it.date)), dMin = Math.min(...days), dMax = Math.max(...days);
    let xs = days.map(v => dMax === dMin ? L : L + (R - L) * (v - dMin) / (dMax - dMin));
    const spread = () => { for (let i = 1; i < n; i++) xs[i] = Math.max(xs[i], xs[i - 1] + G); };
    spread();
    if (xs[n - 1] > R) { const over = xs[n - 1] - R; xs = xs.map(x => x - over); for (let i = n - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - G); }
    if (xs[0] < L) { xs[0] = L; spread(); }
    if (xs[n - 1] > R + 1) xs = xs.map((_, i) => n === 1 ? (L + R) / 2 : L + (R - L) * i / (n - 1));
    const line = css(div('cd-dl', parent), { left: X0, top: Y - 1, width: X1 - X0 });
    /* a tick per card; one label per day, centred under that day's ticks */
    const ticks = items.map((it, i) => ({ tk: css(div('cd-tick', parent), { left: xs[i] - 1, top: Y - 22 }), enter: it.enter || 0 }));
    const labels = [...new Set(days)].map(v => {
      const idx = days.map((d, i) => d === v ? i : -1).filter(i => i >= 0), dt = new Date(v * 864e5);
      const x = (xs[idx[0]] + xs[idx[idx.length - 1]]) / 2;
      const lb = css(div('cd-date', parent), { left: x, top: Y + 18 });
      const sp = document.createElement('span'); sp.textContent = items[idx[0]].label || (dt.getUTCDate() + ' ' + MON[dt.getUTCMonth()]); lb.appendChild(sp);
      return { sp, enter: items[idx[0]].enter || 0 };
    });
    const at = o.at || [960, 405];
    const cards = items.map((it, i) => {
      const next = items[i + 1];
      return receipt(parent, { maxH: o.maxH || 590, at, focus: at, zoom: o.zoom ?? 1.15, tilt: i % 2 ? 1.2 : -1.4, safe: o.safe, ...it,
                               until: next ? next.enter - .2 : (it.until ?? o.until) });
    });
    /* each stepped-down card stands on its own slot, a short stem down to its tick */
    const stems = cards.map((c, i) => {
      const k = TW / c.W, h = c.H * k, bottom = Y - 58;
      c.thumb = { x: xs[i] - c.cx, y: bottom - h / 2 - c.cy, k };
      if (i === n - 1) return null;   /* the last card stays centre stage */
      return css(div('cd-lead', parent), { left: xs[i] - 1, top: Y - 56, height: 34 });
    });
    return {
      cards,
      play(tl) {
        const t0 = Math.max(0, (items[0].enter || 0) - .35);
        tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: .7, ease: 'power2.out' }, t0);
        ticks.forEach(t => tl.fromTo(t.tk, { scaleY: 0 }, { scaleY: 1, duration: .35, ease: 'power2.out' }, t.enter));
        labels.forEach(l => tl.fromTo(l.sp, { yPercent: 135 }, { yPercent: 0, duration: .45, ease: 'power3.out' }, l.enter + .05));
        cards.forEach((c, i) => {
          c.play(tl);
          const next = items[i + 1];
          if (!next) return;
          tl.to(c.el, { x: c.thumb.x, y: c.thumb.y, scale: c.thumb.k, rotation: c.tilt * .6, duration: .7, ease: 'power3.inOut' }, next.enter - .2);
          tl.fromTo(stems[i], { scaleY: 0 }, { scaleY: 1, duration: .3, ease: 'power2.out' }, next.enter + .4);
        });
        return tl;
      }
    };
  }

  /* ============================================================
     textCard(parent, o): full frame, nothing else on screen
       o.parts   the line, in order: 'plain words', { text, tone }, { fig: key, tone } (spoken from data.js), { quote: key }
                 (a data.js text figure, verbatim). tone: 'gold' (key words) | 'red' (a loss). A fig is gold unless told.
       o.at      one time per WORD as it reads on screen (the cue sheet's word times); missing ones follow at +.2 s
       o.mode    'word' (default; a word under three letters rides with its neighbour) | 'line' (each line rises whole)
       o.quote   true: curly quotes round the line          o.by  { name: data.js names key, source: data.js sources key }
       o.size    starting type size (104), shrunk until it fits o.maxLines (3) in o.maxW (1560)     o.y  the block's centre (500)
       o.push    the slow push over the hold (1.025)  o.until  its end (last word + 3)   o.exit  time the words leave (optional)
     returns { el, uses, play(tl) }  (uses: the figure keys it printed, for BW.provenance)
     ============================================================ */
  function textCard(parent, o) {
    const el = div('cd-tc', parent);
    const lineEl = div('cd-line', el);
    const uses = [];
    /* the units: object parts whole; plain words one by one, a word under three letters joined to a neighbour of its tone */
    const raw = [];
    (o.parts || []).forEach(p => {
      if (typeof p === 'string') { p.split(/\s+/).filter(Boolean).forEach(w => raw.push({ text: w, tone: '' })); return; }
      if (p.fig) { uses.push(p.fig); raw.push({ text: spoken(p.fig), tone: p.tone ?? 'gold', fig: true, whole: true }); return; }
      if (p.quote) { uses.push(p.quote); BW.fig(p.quote).display.split(/\s+/).forEach(w => raw.push({ text: w, tone: p.tone || '' })); return; }
      raw.push({ text: p.text, tone: p.tone || '', whole: true });
    });
    const short = (u) => !u.whole && u.text.replace(/[^A-Za-z]/g, '').length < 3 && !/\d/.test(u.text);
    const units = [];
    for (let i = 0; i < raw.length; i++) {
      const u = { ...raw[i] };
      if (short(u) && raw[i + 1] && !raw[i + 1].whole && raw[i + 1].tone === u.tone) { raw[i + 1] = { ...raw[i + 1], text: u.text + ' ' + raw[i + 1].text }; continue; }
      if (short(u) && units.length && !units[units.length - 1].whole && units[units.length - 1].tone === u.tone) { units[units.length - 1].text += ' ' + u.text; continue; }
      units.push(u);
    }
    if (o.quote && units.length) { units[0].text = '“' + units[0].text; units[units.length - 1].text += '”'; }
    let w = 0;
    units.forEach((u, i) => {
      u.word = w; w += u.text.split(/\s+/).length;
      const box = document.createElement('span'); box.className = 'cd-u' + (u.tone ? ' ' + u.tone : '') + (u.fig ? ' fig' : '');
      const sp = document.createElement('span'); sp.textContent = u.text; box.appendChild(sp);
      lineEl.appendChild(box); if (i < units.length - 1) lineEl.appendChild(document.createTextNode(' '));
      u.box = box; u.sp = sp;
    });
    const AT = o.at || [];
    const timeOf = (wi) => wi < AT.length ? AT[wi] : (AT.length ? AT[AT.length - 1] + .2 * (wi - AT.length + 1) : .25 + .2 * wi);
    let by = null;
    if (o.by) {
      by = div('cd-by', el);
      const sp = document.createElement('span'); by.appendChild(sp);
      if (o.by.name) { const n = (BW_DATA.names || {})[o.by.name]; if (!n) throw new Error('CARDS: no name "' + o.by.name + '" in data.js names');
        const a = document.createElement('span'); a.className = 'who'; a.textContent = n + (o.by.source ? ',' : ''); sp.appendChild(a); }
      if (o.by.source) { const b = document.createElement('span'); b.className = 'src'; b.textContent = BW.src(o.by.source).name; sp.appendChild(b); }
    }
    function layout() {
      const maxW = o.maxW || 1560, maxL = o.maxLines || 3;
      css(lineEl, { width: maxW, textWrap: 'balance' });
      let size = o.size || 104;
      const lines = () => new Set(units.map(u => u.box.offsetTop)).size;
      do { lineEl.style.fontSize = size + 'px'; } while (lines() > maxL && (size -= 4) > 56);
      const h = lineEl.offsetHeight, cy = o.y ?? (by ? 480 : 500);
      lineEl.style.top = (cy - h / 2) + 'px';
      if (by) by.style.top = (cy + h / 2 + 46) + 'px';
      if (o.mode === 'line') {   /* every unit in a line takes the line's first time */
        const rows = {}; units.forEach(u => { (rows[u.box.offsetTop] = rows[u.box.offsetTop] || []).push(u); });
        Object.values(rows).forEach(r => r.forEach((u, j) => { u.t = timeOf(r[0].word) + j * .035; }));
      } else units.forEach(u => { u.t = timeOf(u.word); });
    }
    return {
      el, uses, units,
      play(tl) {
        layout();
        units.forEach(u => tl.fromTo(u.sp, { yPercent: 135 }, { yPercent: 0, duration: .5, ease: 'power3.out' }, Math.max(0, u.t - .06)));
        const last = Math.max(...units.map(u => u.t));
        if (by) tl.fromTo(by.firstChild, { yPercent: 135 }, { yPercent: 0, duration: .55, ease: 'power3.out' }, o.byAt ?? last + .45);
        const until = o.until ?? last + 3, first = Math.min(...units.map(u => u.t));
        tl.fromTo(el, { scale: 1 }, { scale: o.push ?? 1.025, duration: Math.max(.1, until - first), ease: 'none' }, first);
        if (o.exit != null) {
          units.forEach((u, i) => tl.to(u.sp, { yPercent: -135, duration: .4, ease: 'power2.in' }, o.exit + i * .015));
          if (by) tl.to(by.firstChild, { yPercent: -135, duration: .4, ease: 'power2.in' }, o.exit);
        }
        return tl;
      }
    };
  }

  return { receipt, pair, sequence, textCard, spoken, credit, pack, PACK };
})();
