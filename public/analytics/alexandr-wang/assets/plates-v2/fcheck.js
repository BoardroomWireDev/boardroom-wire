/* ============================================================
   BOARDROOM WIRE · FCHECK (Ive, 10 Oct 2026; alexandr-wang 13/14/17 v2) — the motion-pass frame check, every frame.
   A page that draws its world as a pure function of time (draw(t)) loads this and calls FCheck.run({...}) under ?fcheck.
   For every frame (30 fps) it checks, and writes the verdict into <pre id="fcheck"> (CLEAN, or one line per bad frame):
     crop       a label (opacity > .02) not wholly inside the frame, 4 px margin
     overlap    two visible labels whose boxes touch
     collision  a visible label over geometry: the scene is drawn again as a white mask (ground hidden: anything with
                userData.ground), read at quarter size, and any lit pixel under the label's box is a hit
     credit     the credit line (.bw-source, when visible) over geometry, by the same mask
     empty      more than a third of the rendered frame near black (max channel <= 18 of 255) with no object in it (the mask):
                empty space, not a dark object
   A label may be exempted from collision with data-onobject="1" (printed on the object on purpose); none of 13/14/17 needs it.
   2D boards (no renderer): pass obstacles: () => [DOMRect...] for the geometry; crop, overlap and collision run, empty does not.
   ============================================================ */
const FCheck = (() => {
  function run(o) {
    const { draw, END, scene, camera, renderer } = o, fps = o.fps || 30, M = 4;
    const T = typeof THREE !== 'undefined' ? THREE : null, W = 480, H = 270, out = [], stats = { frames: 0, maxEmpty: 0, at: 0 };
    const rt = renderer ? new T.WebGLRenderTarget(W, H) : null, px = new Uint8Array(W * H * 4);
    const white = renderer ? new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }) : null;
    const meet = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const small = document.createElement('canvas'); small.width = 192; small.height = 108; const sg = small.getContext('2d');
    const credit = document.querySelector('.bw-source');
    const vis = (e) => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > .02 && e.textContent.trim() !== ''; };
    const hit = (r) => {                         /* any mask pixel under a screen rect (CSS px of the 1920x1080 stage) */
      const x0 = Math.max(0, Math.floor(r.left / 4)), x1 = Math.min(W - 1, Math.ceil(r.right / 4)), y0 = Math.max(0, Math.floor(r.top / 4)), y1 = Math.min(H - 1, Math.ceil(r.bottom / 4));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = ((H - 1 - y) * W + x) * 4; if (px[i] > 128) return true; }
      return false;
    };
    for (let f = 0; f <= Math.round(END * fps); f++) {
      const t = Math.min(END, f / fps); draw(t);
      const bad = [], labs = [...document.querySelectorAll(o.labelSel || '.s3-label')].filter(vis);
      const rects = labs.map(e => e.getBoundingClientRect());
      labs.forEach((e, i) => { const r = rects[i]; if (r.left < M || r.top < M || r.right > 1920 - M || r.bottom > 1080 - M) bad.push('crop "' + e.textContent + '"'); });
      for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) { const a = rects[i], b = rects[j];
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push('overlap "' + labs[i].textContent + '" / "' + labs[j].textContent + '"'); }
      if (renderer) {
        /* the geometry mask */
        const hidden = [];
        scene.traverse(n => { if (!n.visible) return;
          const m = n.material, op = !m ? 1 : Array.isArray(m) ? 1 : (m.transparent ? m.opacity : 1);
          if (n.userData.ground || (n.isMesh && op < .05)) { n.visible = false; hidden.push(n); } });
        const bg = scene.background, ov = scene.overrideMaterial;
        scene.background = new T.Color(0); scene.overrideMaterial = white;
        renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px); renderer.setRenderTarget(null);
        scene.background = bg; scene.overrideMaterial = ov; hidden.forEach(n => { n.visible = true; });
        /* the frame as drawn: how much of it is near black */
        sg.drawImage(renderer.domElement, 0, 0, 192, 108);
        const d = sg.getImageData(0, 0, 192, 108).data; let k = 0;
        for (let i = 0; i < d.length; i += 4) { const p = i / 4, x = p % 192, y = (p / 192) | 0, mi = ((H - 1 - Math.min(H - 1, Math.round(y * 2.5))) * W + Math.min(W - 1, Math.round(x * 2.5))) * 4;
          if (Math.max(d[i], d[i + 1], d[i + 2]) <= 18 && px[mi] < 128) k++; }
        const e = k / (192 * 108); if (e > stats.maxEmpty) { stats.maxEmpty = e; stats.at = t; }
        if (e > .34) bad.push('empty ' + Math.round(e * 100) + '%');
        labs.forEach((e, i) => { if (e.dataset.onobject) return; if (hit(rects[i])) bad.push('collision "' + e.textContent + '"'); });
        if (credit && vis(credit) && hit(credit.getBoundingClientRect())) bad.push('credit over geometry');
        if (credit && vis(credit)) { const r = credit.getBoundingClientRect(); if (r.left < M || r.right > 1920 - M || r.bottom > 1080 - M) bad.push('credit crop'); }
      }
      if (o.obstacles) {                         /* 2D boards: geometry given as screen rects */
        const obs = o.obstacles();
        labs.forEach((e, i) => { if (!e.dataset.onobject && obs.some(b => meet(rects[i], b))) bad.push('collision "' + e.textContent + '"'); });
        if (credit && vis(credit)) { const r = credit.getBoundingClientRect(); if (obs.some(b => meet(r, b))) bad.push('credit over geometry'); if (r.left < M || r.right > 1920 - M || r.bottom > 1080 - M) bad.push('credit crop'); }
      }
      stats.frames++;
      if (bad.length) out.push(t.toFixed(3) + ': ' + [...new Set(bad)].join(', '));
    }
    draw(END);
    const pre = document.createElement('pre'); pre.id = 'fcheck';
    pre.textContent = (out.length ? out.join('\n') : 'CLEAN') + '\n-- ' + stats.frames + ' frames; most near-black ' + Math.round(stats.maxEmpty * 100) + '% at ' + stats.at.toFixed(2) + ' s' + (renderer ? '' : ' (no WebGL: labels only)');
    document.body.appendChild(pre);
    return pre.textContent;
  }
  return { run };
})();
