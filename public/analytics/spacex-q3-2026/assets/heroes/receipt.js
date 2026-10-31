/* ============================================================
   SPACEX Q3 · RECEIPTS INSIDE THE MOTION (Ive, 27 Oct 2026). Needs motion.js (BW), GSAP and hero.js (H).
   One receipt style (EDITING-FRAMEWORK 18): a flat card of the real capture, slightly tilted, cropped to the lines the
   voice cites; it settles, then pushes slowly; the gold pen marks only what the capture prints. No glow, no shadow.

     RC.card(parent, { src, w, h, box:{x,y,w,h}, tilt, z, stand })
            a card at screen rect `box` showing the capture `src` (natural size w × h). Its camera is the source point at
            the card's top-left and a scale: card.view(x, y, s) sets it, card.ride(tl, at, dur, x, y, s) moves it.
            stand: true tags the card "stand-in" (a typeset stand-in for a capture not yet delivered).
     card.pen(tl, x1, x2, y, at, dur)   a gold underline in SOURCE pixels, drawn left to right at the voice's pace
     card.at(sx, sy)                     the screen point of a source point under the current view (for lift-offs)
     card.inn(tl, at) / card.out(tl, at) the card rides in from below / leaves downward
     RC.pack(path)                       a stock-pack path under ?pack= (render passes it), else ../stock-pack/
   ============================================================ */
const RC = (() => {
  const Q = new URLSearchParams(location.search);
  const PACK = (Q.get('pack') || '../stock-pack/').replace(/\/?$/, '/');
  const pack = (p) => /^(?:[a-z]+:|\.\.?\/|\/)/i.test(p) ? p : PACK + p;

  function card(parent, o) {
    const b = o.box;
    const el = BW.el('div', 'rc-card', parent);
    Object.assign(el.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px', zIndex: o.z || 20, background: o.bg || 'var(--cream)' });
    gsap.set(el, { rotation: o.tilt ?? -0.8 });
    const inner = BW.el('div', 'rc-inner', el);
    Object.assign(inner.style, { width: o.w + 'px', height: o.h + 'px' });
    const img = BW.el('img', 'rc-img', inner); img.src = pack(o.src); img.draggable = false;
    const pen = BW.mk('svg', { class: 'rc-pen', viewBox: `0 0 ${o.w} ${o.h}`, width: o.w, height: o.h }, inner);
    if (o.stand) { const s = BW.el('div', 'rc-stand', el); s.textContent = 'stand-in'; }
    const cam = { x: 0, y: 0, s: 1 };
    const apply = () => { inner.style.transform = `scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`; };
    const api = {
      el, img, inner, cam,
      ready: new Promise(r => { if (img.complete && img.naturalWidth) r(true); else { img.onload = () => r(true); img.onerror = () => r(false); } }),
      view(x, y, s) { cam.x = x; cam.y = y; cam.s = s; apply(); return api; },
      ride(tl, at, dur, x, y, s, ease = 'power2.inOut') { tl.to(cam, { x, y, s, duration: dur, ease, onUpdate: apply }, at); return api; },
      pen(tl, x1, x2, y, at, dur = .6, w = 3) {
        const l = BW.mk('line', { x1, x2: x1, y1: y, y2: y, class: 'rc-ink', 'stroke-width': w }, pen);
        if (dur > 0) tl.fromTo(l, { attr: { x2: x1 } }, { attr: { x2 }, duration: dur, ease: 'none' }, at); else l.setAttribute('x2', x2);
        return l;
      },
      at(sx, sy) { return { x: b.x + (sx - cam.x) * cam.s, y: b.y + (sy - cam.y) * cam.s }; },
      inn(tl, at, dur = .7) { tl.fromTo(el, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: dur, ease: 'power3.out' }, at); return api; },
      out(tl, at, dur = .5) { tl.to(el, { y: 50, opacity: 0, duration: dur, ease: 'power2.in' }, at); return api; },
      push(tl, at, dur, k = 1.025) { tl.fromTo(el, { scale: 1 }, { scale: k, duration: dur, ease: 'none' }, at); return api; }
    };
    apply();
    return api;
  }
  /* a company's mark, single colour (its alpha, the element's colour), drawn at 3× for 4K; crop = [sx, sy, sw, sh] of the file */
  function mark(parent, src, o) {
    const cv = BW.el('canvas', 'rc-mark', parent);
    Object.assign(cv.style, { position: 'absolute', left: o.x + 'px', top: o.y + 'px', height: o.h + 'px', zIndex: o.z || 6, color: o.color || 'var(--cream)' });
    const im = new Image();
    const ready = new Promise(res => {
      im.onload = () => {
        const [sx, sy, sw, sh] = o.crop || [0, 0, im.naturalWidth, im.naturalHeight];
        const H3 = o.h * 3, W3 = Math.round(H3 * sw / sh);
        cv.width = W3; cv.height = H3; cv.style.width = (o.h * sw / sh) + 'px';
        if (o.anchor === 'c') cv.style.left = (o.x - o.h * sw / sh / 2) + 'px';
        const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high';
        c.drawImage(im, sx, sy, sw, sh, 0, 0, W3, H3);
        c.globalCompositeOperation = 'source-in'; c.fillStyle = getComputedStyle(cv).color; c.fillRect(0, 0, W3, H3);
        res(true);
      };
      im.onerror = () => res(false);
    });
    im.src = src;
    cv.ready = ready;
    return cv;
  }
  return { card, mark, pack, PACK };
})();
