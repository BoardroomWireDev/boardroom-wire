/* ============================================================
   BOARDROOM WIRE — SHARED MOTION LAYER  (v4)
   Requires GSAP 3.13+ on the page before this file. Plugins are
   optional: DrawSVGPlugin, MotionPathPlugin, SplitText, MorphSVGPlugin,
   Physics2DPlugin, CustomEase, ScrambleTextPlugin. Every wrapper
   below falls back to a hand-rolled version when its plugin is absent.

   Contract every dashboard honours:
     - autoplays once on load (after fonts land)
     - settles into an IDLE state that keeps breathing
     - R replays from zero, F jumps to the final frame
     - ?final opens straight to the final frame, idle running
     - ?still resolves to a completely static final frame
     - ?t=SECONDS or ?t=label(+offset) parks the reveal on one frame
     - ?beats builds the timeline and publishes BW.BEATS as JSON
     - ?motion=0 plays the reveal but suppresses ambient + idle
     - ?fit=0 disables viewport scaling

   Board shape:
     BW.provenance({ uses:[...figure ids], footer:'...' });
     function play(){ BW.reset(); const tl = gsap.timeline();
                      BW.headerIn(tl); BW.mark(tl,'hero',4.2); ... return tl; }
     function rest(){ BW.restAll(); setState(END); }
     function idle(){ BW.glow('#hero'); ... }
     BW.ambient({ tint:'255,179,71' });
     BW.run({ play, rest, idle });

   Two rules about motion, kept deliberately:
     1. Overshoot (bounce) is for chrome, type and cards.
        Quantitative marks — bars, lines, stems — never overshoot
        their true value. A bar that springs past its number and
        settles back is lying for a few frames.
     2. Idle motion is slow and low-amplitude. It should read as
        "this thing is live", never as "something is happening".
   ============================================================ */

const BW = (() => {
  const Q = location.search;
  const FINAL      = /[?&]final(?:&|$)/.test(Q);
  const STILL      = /[?&]still(?:&|$)/.test(Q);
  const REDUCED    = STILL;
  const MOTION     = !/[?&]motion=(0|off)(?:&|$)/.test(Q);
  const BEATS_MODE = /[?&]beats(?:&|$)/.test(Q);
  const FIT        = !/[?&]fit=0(?:&|$)/.test(Q);
  const SEEK       = (() => {
    const m = Q.match(/[?&]t=([^&]+)/);
    if (!m) return undefined;
    return decodeURIComponent(m[1]).replace(/ /g, '+');   // a literal + survives
  })();
  if (STILL) document.documentElement.setAttribute('data-still', '');

  const $  = (sel) => typeof sel === 'string' ? document.querySelector(sel) : sel;
  const $$ = (sel) => typeof sel === 'string' ? Array.from(document.querySelectorAll(sel))
                                              : (sel && sel.length !== undefined ? Array.from(sel) : [sel]);

  const SVGNS = 'http://www.w3.org/2000/svg';
  const CHROME = ['.bw-logo', '.bw-wordmark', '.bw-handle', '.bw-source', '.chip'];

  /* a timeline position plus an offset — works for numbers and labels */
  const pos = (at, off = 0) => (typeof at === 'number') ? at + off
                             : (off ? `${at}+=${off}` : at);

  /* ---------- plugins --------------------------------------- */

  const has = {
    drawSVG:    typeof DrawSVGPlugin     !== 'undefined',
    motionPath: typeof MotionPathPlugin  !== 'undefined',
    splitText:  typeof SplitText         !== 'undefined',
    morphSVG:   typeof MorphSVGPlugin    !== 'undefined',
    physics2D:  typeof Physics2DPlugin   !== 'undefined',
    customEase: typeof CustomEase        !== 'undefined',
    scramble:   typeof ScrambleTextPlugin!== 'undefined'
  };
  const plugins = [];
  if (has.drawSVG)    plugins.push(DrawSVGPlugin);
  if (has.motionPath) plugins.push(MotionPathPlugin);
  if (has.splitText)  plugins.push(SplitText);
  if (has.morphSVG)   plugins.push(MorphSVGPlugin);
  if (has.physics2D)  plugins.push(Physics2DPlugin);
  if (has.customEase) plugins.push(CustomEase);
  if (has.scramble)   plugins.push(ScrambleTextPlugin);
  if (plugins.length) gsap.registerPlugin(...plugins);

  /* Easings by doctrine name. Data marks land, they never overshoot. */
  const ease = {
    land: 'power2.out',                                  // quantitative marks
    type: 'power3.out',                                  // type and blur pulls
    card: 'back.out(1.9)',                               // cards may bounce
    hero: 'back.out(3)',                                 // the hero beat
    hand: has.customEase ? CustomEase.create('bwHand', 'M0,0 C0.2,0 0.1,1 1,1') : 'power3.out',
    slow: 'power2.inOut'
  };

  /* ---------- construction ---------------------------------- */

  /* SVG element: BW.mk('circle', {cx:10, cy:10, r:4, class:'d05-dot'}, parentSvg) */
  function mk(tag, attrs = {}, parent = null, text = null) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text !== null) n.textContent = text;
    if (parent) $(parent).appendChild(n);
    return n;
  }
  /* HTML element: BW.el('div', 'plate win', parent, '<div class="n">…</div>') */
  function el(tag, cls = '', parent = null, html = null) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== null) n.innerHTML = html;
    if (parent) $(parent).appendChild(n);
    return n;
  }

  /* ---------- fit ------------------------------------------- */
  /* Wraps .stage in .fit (if the board didn't) and scales to the
     viewport. Snaps to 1 near full size so a viewport a few pixels
     short never letterboxes a capture. */
  function fit() {
    if (!FIT) return;
    const stage = document.querySelector('.stage');
    if (!stage) return;
    let wrap = stage.closest('.fit');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'fit';
      stage.parentNode.insertBefore(wrap, stage);
      wrap.appendChild(stage);
    }
    const apply = () => {
      let k = Math.min(innerWidth / 1920, innerHeight / 1080);
      if (k > 0.97) k = 1;
      wrap.style.transform = `scale(${k})`;
      wrap.style.left = Math.max(0, (innerWidth  - 1920 * k) / 2) + 'px';
      wrap.style.top  = Math.max(0, (innerHeight - 1080 * k) / 2) + 'px';
    };
    addEventListener('resize', apply);
    apply();
  }

  /* ---------- canvas fx ------------------------------------- */
  /* layer()  → {cv, ctx} 1920x1080 canvas inside .stage at z
     sprite() → baked radial glow canvas, cheap to drawImage hundreds of times
     loop(fn) → managed RAF. fn(now, dt, frame). Under ?still or ?t= it
                draws exactly one frame and stops. Loops created inside
                play() are stopped by the next replay; pass {persistent:true}
                for ones created once at page level (ambient). */
  const fxLoops = [];
  const fx = {
    layer(opts = {}) {
      const o = Object.assign({ z: 10, cls: '', parent: '.stage' }, opts);
      const cv = document.createElement('canvas');
      cv.className = 'fx ' + o.cls;
      cv.width = 1920; cv.height = 1080;
      cv.style.zIndex = o.z;
      $(o.parent).appendChild(cv);
      return { cv, ctx: cv.getContext('2d') };
    },
    sprite(opts = {}) {
      const o = Object.assign({ rgb: '255,179,71', size: 64, stops: null }, opts);
      const c = document.createElement('canvas');
      c.width = c.height = o.size;
      const g = c.getContext('2d');
      const r = o.size / 2;
      const rg = g.createRadialGradient(r, r, 0, r, r, r);
      const stops = o.stops || [[0, `rgba(255,255,255,1)`], [0.22, `rgba(${o.rgb},0.95)`], [0.58, `rgba(${o.rgb},0.22)`], [1, `rgba(${o.rgb},0)`]];
      stops.forEach(s => rg.addColorStop(s[0], s[1]));
      g.fillStyle = rg; g.fillRect(0, 0, o.size, o.size);
      return c;
    },
    loop(fn, opts = {}) {
      const o = Object.assign({ persistent: false, once: REDUCED || SEEK !== undefined }, opts);
      const h = { id: null, running: false, persistent: o.persistent, frame: 0, t0: 0 };
      const tick = (now) => {
        const dt = h.t0 ? Math.min(48, now - h.t0) : 16; h.t0 = now;
        fn(now, dt, h.frame++);
        if (h.running) h.id = requestAnimationFrame(tick);
      };
      h.start = () => { if (h.running) return h; h.running = true; h.t0 = 0; h.id = requestAnimationFrame(tick); return h; };
      h.stop  = () => { h.running = false; if (h.id) cancelAnimationFrame(h.id); h.id = null; return h; };
      h.once  = () => { h.stop(); fn(performance.now(), 16, h.frame++); return h; };
      fxLoops.push(h);
      if (o.once) h.once(); else h.start();
      return h;
    },
    stopAll(includePersistent = false) {
      for (let i = fxLoops.length - 1; i >= 0; i--) {
        const h = fxLoops[i];
        if (h.persistent && !includePersistent) continue;
        h.stop(); fxLoops.splice(i, 1);
      }
    },
    /* draw one frame of every loop: used by rest() under ?still */
    drawOnce() { fxLoops.forEach(h => { if (!h.running) h.once(); }); }
  };

  /* ---------- chrome ---------------------------------------- */

  function chromeIn(tl, at = 0) {
    tl.fromTo('.bw-logo', { opacity:0, scale:.86 },
                          { opacity:1, scale:1, duration:.7, ease:'back.out(2.4)' }, at + 0.10)
      .fromTo('.bw-wordmark', { opacity:0, x:-10 },
                              { opacity:1, x:0, duration:.6, ease:'power3.out' }, at + 0.24)
      .to('.bw-source', { opacity:1, duration:.7 }, at + 0.34)
      .fromTo('.chip', { opacity:0, y:8 },
                       { opacity:1, y:0, duration:.6, ease:'back.out(2)', stagger:.08 }, at + 0.40)
      .to('.bw-handle', { opacity:1, duration:.7 }, at + 0.46);
    return tl;
  }
  function chromeShow() { gsap.set(CHROME, { opacity: 1, scale: 1, x: 0, y: 0 }); }
  function chromeHide() { gsap.set(CHROME, { opacity: 0 }); }

  /* ---------- reveal convention ----------------------------- */
  /* data-reveal=""        opacity
     data-reveal="blur"    opacity + y:14 + blur(7px)   (type)
     data-reveal="up"      opacity + y:18                (cards)
     data-reveal="scalex"  scaleX from the left          (baselines, bars)
     data-reveal="scale"   scale from centre             (nodes, markers)   */
  const REVEAL_FROM = {
    '':       { opacity:0 },
    'blur':   { opacity:0, y:14, filter:'blur(7px)' },
    'up':     { opacity:0, y:18 },
    'scalex': { opacity:0, scaleX:0, transformOrigin:'left center' },
    'scale':  { opacity:0, scale:.6, transformOrigin:'center center' }
  };
  const REVEAL_TO = { opacity:1, x:0, y:0, scale:1, scaleX:1, filter:'blur(0px)' };
  const REVEAL_DUR = { '': .6, 'blur': .85, 'up': .72, 'scalex': .9, 'scale': .62 };
  const REVEAL_EASE = { '': 'power2.out', 'blur': ease.type, 'up': ease.card, 'scalex': ease.land, 'scale': ease.hero };

  const splits = [];   /* SplitText instances (or fallback records) to revert on reset */

  function reset() {
    chromeHide();
    splits.forEach(s => { try { s.revert(); } catch (e) {} });
    splits.length = 0;
    $$('[data-reveal]').forEach(n => {
      const v = n.dataset.reveal || '';
      gsap.set(n, REVEAL_FROM[v] || REVEAL_FROM['']);
    });
  }
  function restAll() {
    splits.forEach(s => { try { s.revert(); } catch (e) {} });
    splits.length = 0;
    chromeShow();
    gsap.set('[data-reveal]', REVEAL_TO);
  }
  /* animate one element (or selector) from its data-reveal start to rest */
  function reveal(tl, target, at = 0, opts = {}) {
    const nodes = $$(target);
    nodes.forEach((n, i) => {
      const v = (n.dataset && n.dataset.reveal) || '';
      const o = Object.assign({ duration: REVEAL_DUR[v], ease: REVEAL_EASE[v], stagger: 0 }, opts);
      tl.to(n, { opacity:1, x:0, y:0, scale:1, scaleX:1, filter:'blur(0px)',
                 duration:o.duration, ease:o.ease }, pos(at, i * o.stagger));
    });
    return tl;
  }

  /* chrome + the standard opening: kick tracks in, title (by word when
     SplitText is present), subtitle. Every board opens this way. */
  function headerIn(tl, opts = {}) {
    const o = Object.assign({ at: 0, split: true, kick:'#kick', title:'#title', subtitle:'#subtitle' }, opts);
    chromeIn(tl, o.at);
    const kick = $(o.kick), title = $(o.title), sub = $(o.subtitle);
    if (kick) tl.fromTo(kick, { opacity:0, letterSpacing:'0.88em' },
                              { opacity:1, letterSpacing:'0.42em', duration:.95, ease:ease.type }, o.at + 0.30);
    if (title) {
      if (o.split && has.splitText) {
        gsap.set(title, { opacity:1, y:0, filter:'blur(0px)' });
        const s = new SplitText(title, { type:'words', wordsClass:'word' });
        splits.push(s);
        tl.fromTo(s.words, { opacity:0, y:14, filter:'blur(7px)' },
                           { opacity:1, y:0, filter:'blur(0px)', duration:.8, ease:ease.type, stagger:.045 }, o.at + 0.50);
      } else {
        tl.to(title, { opacity:1, y:0, filter:'blur(0px)', duration:.95, ease:ease.type }, o.at + 0.50);
      }
    }
    if (sub) tl.to(sub, { opacity:1, y:0, filter:'blur(0px)', duration:.7 }, o.at + 0.85);
    return tl;
  }

  /* ---------- beats ----------------------------------------- */
  const BEATS = { file: location.pathname.split('/').pop(), beats: [], punches: [], duration: 0 };

  function mark(tl, label, t, note = '') {
    tl.addLabel(label, t);
    const i = BEATS.beats.findIndex(b => b.label === label);
    const rec = { label, t: +(+t).toFixed(2), note };
    if (i >= 0) BEATS.beats[i] = rec; else BEATS.beats.push(rec);
    return tl;
  }
  function punch(label, box, opts = {}) {
    const i = BEATS.punches.findIndex(p => p.label === label);
    const rec = Object.assign({ label, box, star:false, at:'99', note:'' }, opts);
    if (i >= 0) BEATS.punches[i] = rec; else BEATS.punches.push(rec);
  }
  function publishBeats() {
    BEATS.beats.sort((a, b) => a.t - b.t);
    const json = JSON.stringify(BEATS);
    let s = document.getElementById('bw-beats');
    if (!s) { s = document.createElement('script'); s.id = 'bw-beats'; s.type = 'application/json'; document.body.appendChild(s); }
    s.textContent = json;
    document.documentElement.dataset.beats = json;
  }
  function resolveSeek(tl, s) {
    if (/^[0-9.]+$/.test(s)) return Math.min(parseFloat(s), tl.duration());
    const m = s.match(/^([\w-]+?)([+-][0-9.]+)?$/);          /* labels may start with a digit: 3b+0.7 */
    if (!m) { console.warn('BW: cannot parse ?t=' + s); return 0; }
    const base = tl.labels[m[1]];
    if (base === undefined) { console.warn('BW: unknown label ' + m[1], Object.keys(tl.labels)); return 0; }
    return Math.max(0, Math.min(base + (m[2] ? parseFloat(m[2]) : 0), tl.duration()));
  }

  /* ---------- data + provenance ----------------------------- */

  const fmt = {
    usd0:  (v) => '$' + Math.round(v).toLocaleString('en-US'),
    usd2:  (v) => '$' + v.toFixed(2),
    bn0:   (v) => '$' + Math.round(v) + 'B',
    bn1:   (v) => '$' + v.toFixed(1) + 'B',
    bn2:   (v) => '$' + v.toFixed(2) + 'B',
    m0:    (v) => '$' + Math.round(v) + 'M',
    k0:    (v) => '$' + Math.round(v) + 'K',
    pct0:  (v) => Math.round(v) + '%',
    pct1:  (v) => v.toFixed(1) + '%',
    spct0: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.round(Math.abs(v)) + '%',
    int:   (v) => Math.round(v).toLocaleString('en-US'),
    mult:  (v) => Math.round(v).toLocaleString('en-US') + '×',
    mo:    (v) => Math.round(v) + ' mo',
    raw:   (v) => String(v)
  };

  const DATA = () => (typeof BW_DATA !== 'undefined' ? BW_DATA : { sources:{}, figures:{} });
  function fig(id) {
    const f = DATA().figures[id];
    if (!f) throw new Error('BW: no figure "' + id + '" in shared/data.js');
    return f;
  }
  function val(id) {
    const f = fig(id);
    if (f.display) return f.display;
    const fn = fmt[f.fmt] || fmt.raw;
    return (f.approx ? '~' : '') + fn(f.v);
  }
  function src(id) {
    const s = DATA().sources[id];
    if (!s) throw new Error('BW: no source "' + id + '" in shared/data.js');
    return s;
  }

  const TIER_LABEL = { P:'Primary', R:'Reported', E:'Estimate', C:'Boardroom Wire calculation' };
  const TIER_CLASS = { P:'primary', R:'reported', E:'estimate', C:'estimate' };

  /* BW.provenance({ uses:['gm_neg23','cost_123'], footer:'…', chips:[{tier,text}] })
     Renders .chip-rail + .bw-source into .bw-prov from the figures used.
     Every mandatory credit of a used figure is appended in bold. */
  function provenance(opts = {}) {
    const o = Object.assign({ uses: [], footer: '', chips: null, order: ['P','R','E','C'] }, opts);
    const stage = document.querySelector('.stage');
    let prov = document.querySelector('.bw-prov');
    if (!prov) {
      const chrome = document.querySelector('.chrome') || stage;
      prov = el('div', 'bw-prov', chrome);
    }
    prov.innerHTML = '';
    const rail = el('div', 'chip-rail', prov);
    const source = el('div', 'bw-source', prov);

    const byTier = {};
    const mandatory = [];
    o.uses.forEach(id => {
      const f = fig(id);
      const tier = f.tier || 'R';
      const srcs = (Array.isArray(f.src) ? f.src : [f.src]).filter(Boolean);
      byTier[tier] = byTier[tier] || new Set();
      srcs.forEach(s => byTier[tier].add(src(s).name));
      if (f.mandatory && !mandatory.includes(f.mandatory)) mandatory.push(f.mandatory);
    });

    const chips = o.chips || o.order.filter(t => byTier[t]).map(t => {
      const names = Array.from(byTier[t]);
      const text = t === 'C' ? TIER_LABEL.C
                 : t === 'P' ? TIER_LABEL.P + (names.length ? ' · ' + names.join(' · ') : '')
                 : TIER_LABEL[t] + ' · ' + names.join(' · ');
      return { tier: t, text };
    });
    chips.forEach(c => { const d = el('div', 'chip ' + (TIER_CLASS[c.tier] || 'reported'), rail); d.textContent = c.text; });

    const parts = [];
    if (o.footer) parts.push(o.footer);
    mandatory.forEach(m => parts.push('<b>' + m + '</b>'));
    source.innerHTML = parts.join('  ·  ');

    if (stage) stage.dataset.figures = o.uses.join(' ');
    return prov;
  }

  /* ---------- counters & type ------------------------------- */

  function countUp(tl, target, opts) {
    const node = $(target);
    const o = Object.assign({ from:0, to:0, format:fmt.int, duration:2.0, at:0, ease:'power2.out' }, opts);
    const proxy = { v: o.from };
    node.textContent = o.format(o.from);
    tl.to(proxy, { v: o.to, duration: o.duration, ease: o.ease,
                   onUpdate: () => { node.textContent = o.format(proxy.v); } }, o.at);
    return tl;
  }

  function typeIn(tl, target, opts) {
    const node = $(target);
    const text = (opts && opts.text) !== undefined ? opts.text : node.dataset.type || node.textContent;
    const o = Object.assign({ duration:0.9, at:0, ease:'none' }, opts);
    node.dataset.type = text;
    node.textContent = '';
    const proxy = { i: 0 };
    tl.to(proxy, { i: text.length, duration: o.duration, ease: o.ease,
                   onUpdate: () => { node.textContent = text.slice(0, Math.round(proxy.i)); } }, o.at);
    return tl;
  }

  /* split an element into chars/words; reverts on the next reset() */
  function split(target, opts = {}) {
    const node = $(target);
    const o = Object.assign({ type:'chars' }, opts);
    if (has.splitText) {
      const s = new SplitText(node, { type:o.type, charsClass:'ch', wordsClass:'word' });
      splits.push(s);
      return s;
    }
    /* fallback: wrap each char in a span */
    const text = node.dataset.type || node.textContent;
    node.dataset.type = text;
    node.innerHTML = '';
    const chars = [];
    for (const ch of text) {
      const sp = document.createElement('span');
      sp.className = 'ch'; sp.style.display = 'inline-block';
      sp.textContent = ch === ' ' ? ' ' : ch;
      node.appendChild(sp); chars.push(sp);
    }
    const rec = { chars, words:[node], revert: () => { node.textContent = text; } };
    splits.push(rec);
    return rec;
  }

  /* character-level entrance: BW.typeChars(tl, '#shares', {at:'shares', stagger:.12}) */
  function typeChars(tl, target, opts = {}) {
    const o = Object.assign({ at:0, stagger:.05, duration:.42, from:{ opacity:0, y:10 }, ease:'power2.out', type:'chars' }, opts);
    const node = $(target);
    gsap.set(node, { opacity:1, y:0, filter:'blur(0px)' });
    const s = split(node, { type:o.type });
    const items = o.type === 'words' ? s.words : s.chars;
    tl.fromTo(items, o.from, { opacity:1, y:0, x:0, scale:1, filter:'blur(0px)', duration:o.duration, ease:o.ease, stagger:o.stagger }, o.at);
    return s;
  }

  /* scramble to a number/string. Digits settle left to right. */
  function scramble(tl, target, opts = {}) {
    const node = $(target);
    const o = Object.assign({ text:null, chars:'0123456789', at:0, duration:1.6, ease:'none' }, opts);
    const text = o.text !== null ? o.text : (node.dataset.type || node.textContent);
    node.dataset.type = text;
    if (has.scramble) {
      tl.to(node, { scrambleText:{ text, chars:o.chars, revealDelay:o.duration * .25, speed:.5, tweenLength:false },
                    duration:o.duration, ease:o.ease }, o.at);
      return tl;
    }
    const proxy = { p: 0 };
    const pick = () => o.chars[Math.floor(Math.random() * o.chars.length)];
    tl.to(proxy, { p: 1, duration:o.duration, ease:o.ease, onUpdate: () => {
      const n = Math.floor(proxy.p * text.length);
      let out = text.slice(0, n);
      for (let i = n; i < text.length; i++) out += /[0-9A-Za-z]/.test(text[i]) ? pick() : text[i];
      node.textContent = out;
    }}, o.at);
    return tl;
  }

  /* ---------- paths ----------------------------------------- */

  /* draw a stroke on. DrawSVG when present, dashoffset otherwise. */
  function draw(tl, target, opts = {}) {
    const o = Object.assign({ duration:1.8, at:0, ease:'power1.inOut', from:'0%' }, opts);
    $$(target).forEach((node, i) => {
      if (has.drawSVG) {
        gsap.set(node, { drawSVG: o.from, opacity:1 });
        tl.to(node, { drawSVG:'100%', duration:o.duration, ease:o.ease }, pos(o.at, i * (o.stagger || 0)));
      } else {
        const len = node.getTotalLength();
        gsap.set(node, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
        tl.to(node, { strokeDashoffset: 0, duration:o.duration, ease:o.ease }, pos(o.at, i * (o.stagger || 0)));
      }
    });
    return tl;
  }
  const drawPath = draw;
  /* paint drawn strokes complete (for rest frames) */
  function drawRest(target) {
    $$(target).forEach(node => {
      if (has.drawSVG) gsap.set(node, { drawSVG:'100%', opacity:1 });
      else gsap.set(node, { strokeDasharray:'none', strokeDashoffset:0, opacity:1 });
    });
  }

  /* move an element along a path. The element should sit at 0,0
     (a circle with cx=0 cy=0, or a group) — motion is by transform. */
  function along(tl, target, path, opts = {}) {
    const o = Object.assign({ at:0, duration:2, ease:'none', start:0, end:1, autoRotate:false, repeat:0, immediate:true }, opts);
    const node = $(target), p = $(path);
    if (has.motionPath) {
      tl.to(node, { motionPath:{ path:p, align:p, alignOrigin:[.5,.5], autoRotate:o.autoRotate, start:o.start, end:o.end },
                    duration:o.duration, ease:o.ease, repeat:o.repeat, immediateRender:o.immediate }, o.at);
      return tl;
    }
    const len = p.getTotalLength();
    const proxy = { u: o.start };
    tl.to(proxy, { u:o.end, duration:o.duration, ease:o.ease, repeat:o.repeat, onUpdate: () => {
      const pt = p.getPointAtLength(proxy.u * len);
      gsap.set(node, { x: pt.x, y: pt.y });
    }}, o.at);
    return tl;
  }

  /* morph one path into another. Fallback crossfades. */
  function morph(tl, from, to, opts = {}) {
    const o = Object.assign({ at:0, duration:1.0, ease:'power2.inOut' }, opts);
    const f = $(from), t = $(to);
    if (has.morphSVG) {
      tl.to(f, { morphSVG:t, duration:o.duration, ease:o.ease }, o.at);
    } else {
      tl.to(f, { opacity:0, duration:o.duration, ease:o.ease }, o.at)
        .to(t, { opacity:1, duration:o.duration, ease:o.ease }, o.at);
    }
    return tl;
  }
  function morphRest(from, to) {
    const f = $(from), t = $(to);
    if (has.morphSVG) gsap.set(f, { morphSVG:t, opacity:1 });
    else { gsap.set(f, { opacity:0 }); gsap.set(t, { opacity:1 }); }
  }

  /* ---------- entrances ------------------------------------- */

  function heroLand(tl, target, at = 0) {
    tl.fromTo(target, { opacity:0, scale:1.5 }, { opacity:1, scale:1, duration:.62, ease:ease.hero }, at);
    return tl;
  }
  function cardIn(tl, target, at = 0, from = { y: 18 }) {
    tl.fromTo(target, Object.assign({ opacity:0 }, from), { opacity:1, x:0, y:0, duration:.72, ease:ease.card }, at);
    return tl;
  }
  function textIn(tl, target, at = 0, dur = .85) {
    tl.fromTo(target, { opacity:0, y:14, filter:'blur(7px)' }, { opacity:1, y:0, filter:'blur(0px)', duration:dur, ease:ease.type }, at);
    return tl;
  }
  function pulse(tl, target, at = 0, amt = 1.04) {
    tl.to(target, { scale: amt, duration:.16, yoyo:true, repeat:1, ease:'power2.inOut' }, at);
    return tl;
  }
  /* a quantitative mark lands without overshooting — it flashes instead */
  function flash(tl, target, at = 0, color = 'rgba(255,255,255,0.55)') {
    tl.fromTo(target, { filter:`drop-shadow(0 0 26px ${color})` },
                      { filter:'drop-shadow(0 0 0px rgba(0,0,0,0))', duration:.75, ease:'power2.out' }, at);
    return tl;
  }

  /* ---------- camera ---------------------------------------- */
  /* const cam = BW.camera('#world', {cx:400, cy:600, s:3});
     cam.to(tl, {cx:960, cy:540, s:1}, {duration:2.4, at:'pullback'});
     cam.project(x,y) → screen coords for HUD labels; cam.onUpdate(fn). */
  function camera(world, init = {}) {
    const node = $(world);
    const isSvg = node.namespaceURI === SVGNS;
    const v = Object.assign({ cx:960, cy:540, s:1 }, init);
    const listeners = [];
    const apply = () => {
      if (isSvg) node.setAttribute('transform', `translate(960,540) scale(${v.s}) translate(${-v.cx},${-v.cy})`);
      else node.style.transform = `translate(960px,540px) scale(${v.s}) translate(${-v.cx}px,${-v.cy}px)`;
      listeners.forEach(f => f(v));
    };
    apply();
    return {
      v,
      set(nv) { Object.assign(v, nv); apply(); return this; },
      to(tl, nv, opts = {}) {
        const o = Object.assign({ duration:2, ease:ease.slow, at:0 }, opts);
        tl.to(v, Object.assign({}, nv, { duration:o.duration, ease:o.ease, onUpdate:apply }), o.at);
        return tl;
      },
      project(x, y) { return { x: 960 + (x - v.cx) * v.s, y: 540 + (y - v.cy) * v.s }; },
      onUpdate(f) { listeners.push(f); return this; },
      apply
    };
  }

  /* ============================================================
     IDLE — everything below keeps running once the reveal ends
     ============================================================ */

  const idleTweens = [];
  const idleNodes = [];

  function keep(tw) { idleTweens.push(tw); return tw; }
  function raw(tw) { return keep(tw); }

  function killIdle() {
    idleTweens.forEach(t => t && t.kill());
    idleTweens.length = 0;
    idleNodes.forEach(n => n.parentNode && n.parentNode.removeChild(n));
    idleNodes.length = 0;
  }

  function glow(target, opts) {
    if (REDUCED) return;
    const o = Object.assign({ color:'255,179,71', min:18, max:40, dur:2.8, spread:2.2 }, opts);
    const node = $(target);
    if (!node) return;
    const proxy = { r: o.min };
    const isSvg = node.namespaceURI === SVGNS;
    return keep(gsap.to(proxy, {
      r: o.max, duration: o.dur, ease:'sine.inOut', yoyo:true, repeat:-1,
      onUpdate: () => {
        if (isSvg) node.style.filter = `drop-shadow(0 0 ${proxy.r * .8}px rgba(${o.color},0.6))`;
        else node.style.textShadow = `0 0 ${proxy.r}px rgba(${o.color},0.5), 0 0 ${proxy.r * o.spread}px rgba(${o.color},0.2)`;
      }
    }));
  }
  function breathe(target, opts) {
    if (REDUCED) return;
    const o = Object.assign({ scale:1.012, dur:3.6, delay:0 }, opts);
    return keep(gsap.to($$(target), { scale:o.scale, duration:o.dur, delay:o.delay, ease:'sine.inOut', yoyo:true, repeat:-1, transformOrigin:'center center' }));
  }
  function float(target, opts) {
    if (REDUCED) return;
    const o = Object.assign({ y:5, dur:4.2, delay:0 }, opts);
    return keep(gsap.to($$(target), { y:o.y, duration:o.dur, delay:o.delay, ease:'sine.inOut', yoyo:true, repeat:-1 }));
  }
  /* dashed strokes that keep travelling — lines that feel like feeds */
  function march(target, opts) {
    if (REDUCED) return;
    const o = Object.assign({ by:-24, dur:1.6 }, opts);
    $$(target).forEach(n => keep(gsap.to(n, { strokeDashoffset:`+=${o.by}`, duration:o.dur, ease:'none', repeat:-1 })));
  }
  function ripple(parent, opts) {
    if (REDUCED) return;
    const o = Object.assign({ cx:0, cy:0, r0:6, r1:34, color:'#FFB347', dur:2.6, count:2, width:1.5 }, opts);
    const p = $(parent);
    if (!p) return;
    for (let i = 0; i < o.count; i++) {
      const c = mk('circle', { cx:o.cx, cy:o.cy, r:o.r0, fill:'none', stroke:o.color, 'stroke-width':o.width }, p);
      c.style.pointerEvents = 'none';
      idleNodes.push(c);
      keep(gsap.fromTo(c, { attr:{ r:o.r0 }, opacity:.55 },
                          { attr:{ r:o.r1 }, opacity:0, duration:o.dur, ease:'power1.out', repeat:-1, delay:i * (o.dur / o.count) }));
    }
  }
  function shimmer(target, opts) {
    if (REDUCED) return;
    const o = Object.assign({ dur:3.4, delay:0, tint:'rgba(245,241,229,0.10)', repeatDelay:2.6 }, opts);
    const host = $(target);
    if (!host) return;
    const cs = getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    host.style.overflow = host.style.overflow || 'hidden';
    const s = document.createElement('div');
    s.style.cssText = `position:absolute; inset:0; pointer-events:none; z-index:1;
      background:linear-gradient(105deg, transparent 38%, ${o.tint} 50%, transparent 62%);
      transform:translateX(-100%)`;
    host.appendChild(s);
    idleNodes.push(s);
    keep(gsap.to(s, { xPercent:200, duration:o.dur, ease:'power2.inOut', repeat:-1, repeatDelay:o.repeatDelay, delay:o.delay }));
  }
  /* a slow travelling glint along a path, forever (idle version of along) */
  function glint(target, path, opts = {}) {
    if (REDUCED) return;
    const o = Object.assign({ dur:3.2, delay:0 }, opts);
    const tl = gsap.timeline({ repeat:-1, delay:o.delay });
    along(tl, target, path, { duration:o.dur, ease:'none' });
    return keep(tl);
  }

  /* ---------- ambient field --------------------------------- */
  function ambient(opts) {
    const o = Object.assign({ dust:true, scan:true, tint:'212,175,55', count:56, speed:1 }, opts);
    const stage = document.querySelector('.stage');
    if (!stage || REDUCED || !MOTION) return;
    if (o.scan && !stage.querySelector('.amb-scan')) el('div', 'amb-scan', stage);
    if (!o.dust || stage.querySelector('.amb-dust')) return;

    const cv = document.createElement('canvas');
    cv.className = 'amb-dust'; cv.width = 1920; cv.height = 1080;
    stage.appendChild(cv);
    const ctx = cv.getContext('2d');
    const P = [];
    for (let i = 0; i < o.count; i++) {
      P.push({ x: Math.sin(i * 12.9898) * 0.5 * 1920 + 960, y: (i / o.count) * 1080,
               r: 0.7 + (i % 7) * 0.28, vx: ((i % 5) - 2) * 0.045 * o.speed,
               vy: -(0.10 + (i % 9) * 0.022) * o.speed, ph: i * 0.7, a: 0.05 + (i % 6) * 0.022 });
    }
    return fx.loop((now, dt) => {
      ctx.clearRect(0, 0, 1920, 1080);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16);
        if (p.y < -20) { p.y = 1100; p.x = Math.random() * 1920; }
        if (p.x < -20) p.x = 1940;
        if (p.x > 1940) p.x = -20;
        const tw = 0.55 + 0.45 * Math.sin(now * 0.0011 + p.ph);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `rgba(${o.tint},${p.a * tw})`);
        g.addColorStop(1, `rgba(${o.tint},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }, { persistent:true, once:false });
  }

  /* ---------- wiring ---------------------------------------- */

  function ready() {
    const loaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(r => addEventListener('load', r, { once:true }));
    const fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    const cap = new Promise(r => setTimeout(r, 2500));
    return loaded.then(() => Promise.race([fonts, cap]));
  }

  /* a thrown reveal is written into the DOM so headless tooling can report it */
  function reportError(where, err) {
    console.error('BW: ' + where + ' threw', err);
    const msg = where + ': ' + (err && err.stack ? err.stack : String(err));
    let p = document.getElementById('bw-error');
    if (!p) { p = document.createElement('script'); p.id = 'bw-error'; p.type = 'text/plain'; document.body.appendChild(p); }
    p.textContent = msg;
    document.documentElement.dataset.error = msg.slice(0, 400);
  }
  const guard = (where, fn) => { try { return fn(); } catch (e) { reportError(where, e); return null; } };

  function run(api) {
    const startIdle = () => { if (api.idle && MOTION && !REDUCED) { killIdle(); guard('idle', api.idle); } };
    let current = null;
    const orig = api;
    api = { play: () => guard('play', orig.play), rest: () => guard('rest', orig.rest), idle: orig.idle };

    const begin = () => {
      killIdle();
      fx.stopAll();
      if (current) { current.kill(); current = null; }

      if (BEATS_MODE) {
        const tl = api.play();
        if (tl) {
          tl.pause(0);
          BEATS.duration = +tl.duration().toFixed(2);
          publishBeats();
          tl.kill();
        }
        api.rest();
        fx.drawOnce();
        return;
      }
      if (SEEK !== undefined) {
        /* park the reveal on one frame — no idle, so nothing drifts.
           seek(t, false) replays the callbacks along the way. Works with
           ?still too, so a poster can be grabbed at a labelled beat. */
        const tl = api.play();
        if (!tl) return;
        current = tl;
        tl.seek(resolveSeek(tl, SEEK), false);
        tl.pause();
        fx.drawOnce();
        return;
      }
      if (FINAL || REDUCED) { api.rest(); fx.drawOnce(); startIdle(); return; }

      const tl = api.play();
      current = tl;
      if (tl && tl.eventCallback) tl.eventCallback('onComplete', startIdle);
      else startIdle();
    };

    fit();
    ready().then(begin);

    addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') begin();
      if (e.key === 'f' || e.key === 'F') {
        killIdle();
        if (current) { current.kill(); current = null; }
        api.rest(); startIdle();
      }
    });
  }

  return {
    FINAL, REDUCED, STILL, SEEK, MOTION, BEATS_MODE, has, ease, BEATS,
    $, $$, mk, el, fit, fx,
    chromeIn, chromeShow, chromeHide,
    reset, restAll, reveal, headerIn, mark, punch,
    fmt, fig, val, src, provenance,
    countUp, typeIn, split, typeChars, scramble,
    draw, drawPath, drawRest, along, morph, morphRest, pos,
    heroLand, cardIn, textIn, pulse, flash,
    camera,
    glow, breathe, float, march, ripple, shimmer, glint, raw,
    ambient, killIdle, run
  };
})();
