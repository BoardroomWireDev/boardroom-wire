/* ============================================================
   BOARDROOM WIRE — SHARED MOTION LAYER
   Requires GSAP 3.x on the page before this file.

   Contract every dashboard honours:
     - autoplays once on load
     - settles into an IDLE state that keeps breathing
     - R replays from zero, F jumps to the final frame
     - ?final opens straight to the final frame, idle running
     - ?still resolves to a completely static final frame

   Two rules about motion, kept deliberately:
     1. Overshoot (bounce) is for chrome, type and cards.
        Quantitative marks — bars, lines, stems — never overshoot
        their true value. A bar that springs past its number and
        settles back is lying for a few frames.
     2. Idle motion is slow and low-amplitude. It should read as
        "this thing is live", never as "something is happening".
   ============================================================ */

const BW = (() => {
  const FINAL = /[?&]final/.test(location.search);
  /* ?motion forces the full motion set on even when the OS asks for reduced
     motion. Headless capture tools report "reduce" by default, and a machine
     with reduce-motion switched on would otherwise record dead frames. */
  /* Motion is ON by default. These are capture assets, not a public web
     page: obeying the OS reduce-motion switch silently made them render
     as dead frames on machines with Windows animations turned off, and
     headless capture tools report "reduce" unconditionally.
     ?still opts out and gives a completely static frame. */
  const STILL = /[?&]still/.test(location.search);
  const REDUCED = STILL;
  if (STILL) document.documentElement.setAttribute('data-still', '');

  /* ?t=SECONDS scrubs the reveal to an exact moment and holds it there.
     Deterministic frame-grabs for the edit. ?t=99 parks on the finished
     reveal. */
  const SEEK = (location.search.match(/[?&]t=([0-9.]+)/) || [])[1];

  const $  = (sel) => typeof sel === 'string' ? document.querySelector(sel) : sel;
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const CHROME = ['.bw-logo', '.bw-wordmark', '.bw-handle', '.bw-source', '.chip'];
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- chrome ---------------------------------------- */

  function chromeIn(tl, at = 0) {
    tl.fromTo('.bw-logo', { opacity:0, scale:.86 },
                          { opacity:1, scale:1, duration:.7, ease:'back.out(2.4)' }, at + 0.10)
      .fromTo('.bw-wordmark', { opacity:0, x:-10 },
                              { opacity:1, x:0, duration:.6, ease:'power3.out' }, at + 0.24)
      .to('.bw-source', { opacity:1, duration:.7 }, at + 0.34)
      .fromTo('.chip', { opacity:0, y:8 },
                       { opacity:1, y:0, duration:.6, ease:'back.out(2)' }, at + 0.40)
      .to('.bw-handle', { opacity:1, duration:.7 }, at + 0.46);
    return tl;
  }

  function chromeShow() { gsap.set(CHROME, { opacity: 1, scale: 1, x: 0, y: 0 }); }
  function chromeHide() { gsap.set(CHROME, { opacity: 0 }); }

  /* ---------- formatting ------------------------------------ */

  const fmt = {
    usd0:  (v) => '$' + Math.round(v).toLocaleString('en-US'),
    bn1:   (v) => '$' + v.toFixed(1) + 'B',
    bn2:   (v) => '$' + v.toFixed(2) + 'B',
    pct0:  (v) => Math.round(v) + '%',
    pct1:  (v) => v.toFixed(1) + '%',
    int:   (v) => Math.round(v).toLocaleString('en-US')
  };

  function countUp(tl, el, opts) {
    const node = $(el);
    const o = Object.assign({ from:0, to:0, format:fmt.int, duration:2.0, at:0, ease:'power2.out' }, opts);
    const proxy = { v: o.from };
    node.textContent = o.format(o.from);
    tl.to(proxy, {
      v: o.to, duration: o.duration, ease: o.ease,
      onUpdate: () => { node.textContent = o.format(proxy.v); }
    }, o.at);
    return tl;
  }

  function typeIn(tl, el, opts) {
    const node = $(el);
    const text = (opts && opts.text) !== undefined ? opts.text : node.dataset.type || node.textContent;
    const o = Object.assign({ duration:0.9, at:0, ease:'none' }, opts);
    node.dataset.type = text;
    node.textContent = '';
    const proxy = { i: 0 };
    tl.to(proxy, {
      i: text.length, duration: o.duration, ease: o.ease,
      onUpdate: () => { node.textContent = text.slice(0, Math.round(proxy.i)); }
    }, o.at);
    return tl;
  }

  function drawPath(tl, el, opts) {
    const node = $(el);
    const len = node.getTotalLength();
    const o = Object.assign({ duration:1.8, at:0, ease:'power1.inOut' }, opts);
    gsap.set(node, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    tl.to(node, { strokeDashoffset: 0, duration: o.duration, ease: o.ease }, o.at);
    return tl;
  }

  /* ---------- entrances ------------------------------------- */

  /* the hero beat — overshoot plus a brief bloom on landing */
  function heroLand(tl, el, at = 0) {
    tl.fromTo(el, { opacity:0, scale:1.5 },
                  { opacity:1, scale:1, duration:.62, ease:'back.out(3)' }, at);
    return tl;
  }

  /* cards, badges, callouts — allowed to bounce */
  function cardIn(tl, el, at = 0, from = { y: 18 }) {
    tl.fromTo(el, Object.assign({ opacity:0 }, from),
                  { opacity:1, x:0, y:0, duration:.72, ease:'back.out(1.9)' }, at);
    return tl;
  }

  /* type that resolves out of a blur — reads as focus pulling in */
  function textIn(tl, el, at = 0, dur = .85) {
    tl.fromTo(el, { opacity:0, y:14, filter:'blur(7px)' },
                  { opacity:1, y:0, filter:'blur(0px)', duration:dur, ease:'power3.out' }, at);
    return tl;
  }

  function pulse(tl, el, at = 0, amt = 1.04) {
    tl.to(el, { scale: amt, duration:.16, yoyo:true, repeat:1, ease:'power2.inOut' }, at);
    return tl;
  }

  /* a quantitative mark lands without overshooting — it flashes instead */
  function flash(tl, el, at = 0, color = 'rgba(255,255,255,0.55)') {
    tl.fromTo(el, { filter:`drop-shadow(0 0 26px ${color})` },
                  { filter:'drop-shadow(0 0 0px rgba(0,0,0,0))', duration:.75, ease:'power2.out' }, at);
    return tl;
  }

  /* ============================================================
     IDLE — everything below keeps running once the reveal ends
     ============================================================ */

  const idleTweens = [];
  const idleRafs = [];
  const idleNodes = [];
  let ambRaf = null;

  function keep(tw) { idleTweens.push(tw); return tw; }

  /* register a tween you built yourself so R still cleans it up */
  function raw(tw) { return keep(tw); }

  function killIdle() {
    idleTweens.forEach(t => t && t.kill());
    idleTweens.length = 0;
    idleRafs.forEach(id => cancelAnimationFrame(id));
    idleRafs.length = 0;
    idleNodes.forEach(n => n.parentNode && n.parentNode.removeChild(n));
    idleNodes.length = 0;
  }

  /* slow glow breathing on an emissive element */
  function glow(el, opts) {
    if (REDUCED) return;
    const o = Object.assign({ color:'255,179,71', min:18, max:40, dur:2.8, spread:2.2 }, opts);
    const node = $(el);
    if (!node) return;
    const proxy = { r: o.min };
    const isSvg = node.namespaceURI === SVGNS;
    return keep(gsap.to(proxy, {
      r: o.max, duration: o.dur, ease:'sine.inOut', yoyo:true, repeat:-1,
      onUpdate: () => {
        const a = `0 0 ${proxy.r}px rgba(${o.color},0.5), 0 0 ${proxy.r * o.spread}px rgba(${o.color},0.2)`;
        if (isSvg) node.style.filter = `drop-shadow(0 0 ${proxy.r * .8}px rgba(${o.color},0.6))`;
        else node.style.textShadow = a;
      }
    }));
  }

  /* very small scale breathing — for blocks and plates */
  function breathe(el, opts) {
    if (REDUCED) return;
    const o = Object.assign({ scale:1.012, dur:3.6, delay:0 }, opts);
    return keep(gsap.to($(el) || el, {
      scale: o.scale, duration: o.dur, delay: o.delay,
      ease:'sine.inOut', yoyo:true, repeat:-1, transformOrigin:'center center'
    }));
  }

  function float(el, opts) {
    if (REDUCED) return;
    const o = Object.assign({ y:5, dur:4.2, delay:0 }, opts);
    return keep(gsap.to($(el) || el, {
      y: o.y, duration: o.dur, delay: o.delay, ease:'sine.inOut', yoyo:true, repeat:-1
    }));
  }

  /* dashed strokes that keep travelling — lines that feel like feeds */
  function march(el, opts) {
    if (REDUCED) return;
    const o = Object.assign({ by:-24, dur:1.6 }, opts);
    const nodes = typeof el === 'string' ? $$(el) : (el.length ? Array.from(el) : [el]);
    nodes.forEach(n => keep(gsap.to(n, {
      strokeDashoffset: `+=${o.by}`, duration: o.dur, ease:'none', repeat:-1
    })));
  }

  /* an expanding ring that repeats out of a data node */
  function ripple(parent, opts) {
    if (REDUCED) return;
    const o = Object.assign({ cx:0, cy:0, r0:6, r1:34, color:'#FFB347', dur:2.6, count:2 }, opts);
    const p = $(parent);
    if (!p) return;
    for (let i = 0; i < o.count; i++) {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', o.cx); c.setAttribute('cy', o.cy);
      c.setAttribute('r', o.r0);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', o.color);
      c.setAttribute('stroke-width', '1.5');
      c.style.pointerEvents = 'none';
      p.appendChild(c);
      idleNodes.push(c);
      keep(gsap.fromTo(c,
        { attr:{ r:o.r0 }, opacity:.55 },
        { attr:{ r:o.r1 }, opacity:0, duration:o.dur, ease:'power1.out',
          repeat:-1, delay: i * (o.dur / o.count) }));
    }
  }

  /* a highlight that sweeps across an element, left to right */
  function shimmer(el, opts) {
    if (REDUCED) return;
    const o = Object.assign({ dur:3.4, delay:0, tint:'rgba(245,241,229,0.10)' }, opts);
    const host = $(el);
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
    keep(gsap.to(s, { xPercent:200, duration:o.dur, ease:'power2.inOut',
                      repeat:-1, repeatDelay:2.6, delay:o.delay }));
  }

  /* ---------- ambient field --------------------------------- */
  /* Drifting motes plus a slow scan sweep. Installed once per
     page and left running — this is most of what makes a still
     dashboard feel switched on rather than exported.            */

  function ambient(opts) {
    const o = Object.assign({ dust:true, scan:true, tint:'212,175,55', count:56, speed:1 }, opts);
    const stage = document.querySelector('.stage');
    if (!stage || REDUCED) return;

    if (o.scan && !stage.querySelector('.amb-scan')) {
      const s = document.createElement('div');
      s.className = 'amb-scan';
      stage.appendChild(s);
    }

    if (!o.dust || stage.querySelector('.amb-dust')) return;

    const cv = document.createElement('canvas');
    cv.className = 'amb-dust';
    cv.width = 1920; cv.height = 1080;
    stage.appendChild(cv);

    const ctx = cv.getContext('2d');
    const P = [];
    for (let i = 0; i < o.count; i++) {
      P.push({
        x: Math.sin(i * 12.9898) * 0.5 * 1920 + 960,
        y: (i / o.count) * 1080,
        r: 0.7 + (i % 7) * 0.28,
        vx: ((i % 5) - 2) * 0.045 * o.speed,
        vy: -(0.10 + (i % 9) * 0.022) * o.speed,
        ph: i * 0.7,
        a: 0.05 + (i % 6) * 0.022
      });
    }

    let t0 = performance.now();
    (function draw(now) {
      const dt = Math.min(48, now - t0); t0 = now;
      ctx.clearRect(0, 0, 1920, 1080);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
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
      ambRaf = requestAnimationFrame(draw);
    })(t0);
  }

  /* ---------- wiring ---------------------------------------- */
  /* BW.run({ play, rest, idle })
       play() builds and returns a timeline from zero
       rest() paints the final lit frame with no animation
       idle() starts the ambient/breathing state (optional)     */

  function run(api) {
    const startIdle = () => { if (api.idle) { killIdle(); api.idle(); } };

    const begin = () => {
      if (FINAL || REDUCED) { api.rest(); startIdle(); return; }
      killIdle();
      const tl = api.play();

      if (SEEK !== undefined && tl && tl.seek) {
        /* park the reveal on one frame — no idle, so nothing drifts.
           seek(t, false) replays the callbacks along the way; several
           dashboards set their state inside .call(), and a silent seek
           would land on a frame that never ran them. */
        tl.seek(Math.min(parseFloat(SEEK), tl.duration()), false);
        tl.pause();
        return;
      }

      if (tl && tl.eventCallback) tl.eventCallback('onComplete', startIdle);
      else startIdle();
    };

    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') begin();
      if (e.key === 'f' || e.key === 'F') { killIdle(); api.rest(); startIdle(); }
    });
  }

  return {
    FINAL, REDUCED, STILL, SEEK, $, $$,
    chromeIn, chromeShow, chromeHide,
    fmt, countUp, typeIn, drawPath,
    heroLand, cardIn, textIn, pulse, flash,
    glow, breathe, float, march, ripple, shimmer, raw,
    ambient, killIdle, run
  };
})();
