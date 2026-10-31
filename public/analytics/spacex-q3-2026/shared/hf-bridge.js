/* ============================================================
   BOARDROOM WIRE — HYPERFRAMES BRIDGE  (27 Oct 2026, Davinci)

   Lets an existing board page play as a HyperFrames sub-composition with
   nothing in the board changed. The board runs in an <iframe> under
   ?capture&fit=0, exactly the page `bw render` captures, so its own
   capture clock (BW.__capture.frame(n, fps) in motion.js) stays the one
   source of truth for every frame. This file registers the single paused
   GSAP timeline HyperFrames seeks, and turns each seek into a capture-clock
   frame inside the iframe.

   Why an iframe and not inlined markup: every board declares page-level
   globals (const BW, const S, its own <style> in <head>, ?spec in
   location.search). Inlined into one HyperFrames page they would collide
   board with board; in a frame each board keeps its own document.

   Use, inside a sub-composition <template> (compositions/b-<id>.html):
     <iframe id="<id>-frame" src="../dashboards/bg-figure.html?capture&fit=0&spec=…"></iframe>
     <script src="../dashboards/shared/hf-bridge.js"></script>
     <script>HFBridge.mount({ id: '<id>', seconds: 9 });</script>

   The board's frame 0 is the slot's first frame; past the reveal the board
   holds its rest/idle state, as a bw render clip would.
   ============================================================ */
(function () {
  if (window.HFBridge) return;
  const FPS = 30;

  /* wait (setup time only, never per frame) until the board's capture handle is ready */
  function whenReady(frame, timeoutMs) {
    const t0 = Date.now();
    return new Promise((resolve, reject) => {
      const poll = () => {
        let cap = null;
        /* motion.js declares `const BW`: a lexical global, not a property of window, so it is
           read through the frame's own scope rather than as frame.contentWindow.BW */
        try { cap = frame.contentWindow && frame.contentWindow.eval("typeof BW !== 'undefined' && BW.__capture ? BW.__capture : null"); } catch (e) { /* not loaded yet */ }
        if (cap && cap.error) return reject(new Error('board threw: ' + cap.error));
        if (cap && cap.ready) return resolve(cap);
        if (Date.now() - t0 > timeoutMs) return reject(new Error('board capture handle never became ready (is ?capture in the src?)'));
        setTimeout(poll, 50);
      };
      poll();
    });
  }

  function mount(opts) {
    const o = Object.assign({ fps: FPS, timeoutMs: 30000 }, opts);
    const frame = document.getElementById(o.id + '-frame');
    if (!frame) throw new Error('HFBridge: no <iframe id="' + o.id + '-frame">');
    whenReady(frame, o.timeoutMs).then((cap) => {
      /* bw render only ever steps forward. HyperFrames seeks both ways, and GSAP's global
         timeline drops a finished reveal (autoRemoveChildren), after which a seek back has
         nothing to rewind and the board sticks on its last frame. Keep finished children. */
      frame.contentWindow.gsap.globalTimeline.autoRemoveChildren = false;
      let last = -1;
      const drive = (t) => {
        const n = Math.max(0, Math.round(t * o.fps));
        if (n === last) return;
        last = n;
        cap.frame(n, o.fps);              /* synchronous DOM update; its promise only waits for paint */
      };
      drive(0);
      /* HyperFrames seeks with events suppressed, so onUpdate never fires on a seek. A setter
         does: GSAP assigns the tweened value on every render, and the assignment drives the board. */
      let tv = 0;
      const clock = {};
      Object.defineProperty(clock, 't', { get: () => tv, set: (v) => { tv = v; drive(v); } });
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(clock, { t: 0 }, { t: o.seconds, duration: o.seconds, ease: 'none' }, 0);
      frame.dataset.hfBoardDuration = String(cap.duration);
      window.__timelines[o.id] = tl;     /* register only once the board is built */
      if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
    }).catch((err) => {
      console.error('HFBridge ' + o.id + ':', err);
      frame.dataset.hfError = String(err && err.message || err);
    });
  }

  window.HFBridge = { mount, version: 1 };
})();
