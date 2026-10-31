/* ============================================================
   SPACEX Q3 · FOOTAGE INSIDE THE MOTION (Ive, 27 Oct 2026). Needs motion.js (BW) and GSAP.
   Real footage lives inside a mark (a bar, a wedge, a window) instead of cutting away from the chart (EDITING-FRAMEWORK 18).
   The footage is painted into one canvas, clipped to the mark's own path, so it moves and changes shape with the mark.

     FT.layer(parent, z, id)        a canvas (several allowed: the painter gets them all by id) (1920×1080 CSS, backed at devicePixelRatio, so 4K under a 2× capture)
     FT.clip(name, src, o)          a source: o.at = timeline second its second `o.off` plays, o.rate (1 = real time),
                                    o.from / o.to = the timeline window it is live in (it is only seeked inside it)
     FT.paint = (L, t) => …          the page's painter (L = { id: 2D context }), called after every frame with the timeline time
     FT.cover(ctx, name, path, box, o)  draw `name` clipped to `path` (a Path2D or SVG d), covering `box` {x,y,w,h};
                                    o.fx/o.fy = the source point (0–1) that lands on the box centre, o.zoom, o.grade (CSS filter)
     FT.tl = tl                     the reveal timeline (set in play()); t is tl.time()
     ?media=<url base>              load the sources from a proxy folder (all-intra copies seek fast); default: their own paths
   Under ?capture the renderer's frame(n) is wrapped: the reveal advances, every live source is seeked to its frame and
   awaited (seeked), then the canvas is painted, so frame n is the same on every run. In a browser the sources play and are
   re-synced when they drift more than a quarter of a second.
   ============================================================ */
const FT = (() => {
  const Q = new URLSearchParams(location.search);
  const MEDIA = Q.get('media');
  const clips = {};
  const L = {}; let dpr = 1;
  const api = { tl: null, paint: null, clips };

  function layer(parent, z = 4, id = 'main') {
    const cv = document.createElement('canvas');
    dpr = Math.max(1, window.devicePixelRatio || 1);
    cv.width = Math.round(1920 * dpr); cv.height = Math.round(1080 * dpr);
    Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', width: '1920px', height: '1080px', zIndex: z, pointerEvents: 'none' });
    parent.appendChild(cv); L[id] = cv.getContext('2d');
    return cv;
  }
  function clip(name, src, o = {}) {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.playsInline = true; v.crossOrigin = null;
    const file = src.split('/').pop();
    v.src = MEDIA ? MEDIA.replace(/\/?$/, '/') + (o.proxy || file) : src;
    const c = { name, v, at: o.at || 0, off: o.off || 0, rate: o.rate || 1, from: o.from ?? -1e9, to: o.to ?? 1e9 };
    c.ready = new Promise((res) => { v.addEventListener('loadeddata', () => res(true), { once: true }); v.addEventListener('error', () => res(false), { once: true }); });
    clips[name] = c;
    return c;
  }
  const want = (c, t) => Math.max(0, Math.min((c.v.duration || 1e9) - .04, c.off + (t - c.at) * c.rate));
  const live = (c, t) => t >= c.from && t <= c.to;

  function seek(c, s) {
    return new Promise((res) => {
      if (Math.abs(c.v.currentTime - s) < .001 && c.v.readyState >= 2) return res();
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      c.v.addEventListener('seeked', fin, { once: true });
      c.v.currentTime = s; setTimeout(fin, 8000);
    });
  }
  async function sync(t) { await Promise.all(Object.values(clips).filter(c => live(c, t)).map(c => c.ready.then(() => seek(c, want(c, t))))); }
  function paint(t) {
    Object.values(L).forEach(c => { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, 1920, 1080); });
    if (api.paint) { try { api.paint(L, t); } catch (e) { console.error('FT paint', e); } }
  }
  const now = () => api.tl ? api.tl.time() : 0;

  function cover(c2d, name, path, box, o = {}) {
    const c = clips[name]; if (!c || c.v.readyState < 2 || box.w <= 0 || box.h <= 0) return;
    const vw = c.v.videoWidth, vh = c.v.videoHeight; if (!vw) return;
    const k = Math.max(box.w / vw, box.h / vh) * (o.zoom || 1);
    const fx = o.fx ?? .5, fy = o.fy ?? .5;
    let dx = box.x + box.w / 2 - fx * vw * k, dy = box.y + box.h / 2 - fy * vh * k;
    /* never show past the frame's edge: clamp the source inside the box */
    dx = Math.min(box.x, Math.max(box.x + box.w - vw * k, dx)); dy = Math.min(box.y, Math.max(box.y + box.h - vh * k, dy));
    c2d.save();
    if (path) c2d.clip(typeof path === 'string' ? new Path2D(path) : path);
    if (o.grade) c2d.filter = o.grade;
    c2d.globalAlpha = o.alpha ?? 1;
    c2d.drawImage(c.v, dx, dy, vw * k, vh * k);
    c2d.restore();
  }

  /* the capture clock: wrap frame(n) the moment motion.js installs it */
  const cap = BW.__capture; let inner = null;
  Object.defineProperty(cap, 'frame', {
    configurable: true,
    get() { return inner ? wrapped : null; },
    set(fn) { inner = fn; }
  });
  async function wrapped(n, fps) {
    const r = await inner(n, fps);
    const t = now();
    await sync(t); paint(t);
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    return r;
  }
  /* capture is ready only once every source can be drawn */
  const readyAll = () => Promise.all(Object.values(clips).map(c => c.ready));
  let rdy = false;
  Object.defineProperty(cap, 'ready', { configurable: true, get() { return rdy && api._sourcesIn; }, set(v) { rdy = v; } });
  api._sourcesIn = false;
  setTimeout(() => readyAll().then(() => { api._sourcesIn = true; }), 0);

  /* the browser: play along, re-sync on drift, paint every tick; a parked frame (?t=, ?still) seeks once */
  if (!BW.CAPTURE) {
    gsap.ticker.add(() => {
      const t = now(), parked = !api.tl || api.tl.paused() || !api.tl.isActive();
      Object.values(clips).forEach(c => {
        if (!live(c, t)) { if (!c.v.paused) c.v.pause(); return; }
        const s = want(c, t);
        if (parked) { if (Math.abs(c.v.currentTime - s) > .04 && !c.v.seeking) c.v.currentTime = s; if (!c.v.paused) c.v.pause(); return; }
        if (Math.abs(c.v.currentTime - s) > .25 && !c.v.seeking) c.v.currentTime = s;
        c.v.playbackRate = c.rate; if (c.v.paused) c.v.play().catch(() => {});
      });
      paint(t);
    });
  }
  return Object.assign(api, { layer, clip, cover, sync, paintNow: paint, MEDIA });
})();
