/* THE PRINT thumbnails: the finish (Ive, 25 Oct 2026). Loaded by t1-face-number.html and t2-face-question.html.
   The plain white grid read as a template next to the channel's shipped thumbnails (PRD_AW_01, PRD_AW_02, PRD_TS_05), which
   have a lit studio plate, a subject that separates from it, and colour. This keeps the templates' structure (one face, three
   elements, big words) and changes only the finish:
     bg=     white (default: the old flat plate and grid) | red (a lit red seamless, the loss plate of PRD_AW_01)
             | dark (a charcoal seamless, PRD_AW_02) | light (a lit pale-grey seamless)
     lx,ly=  where the light pool sits behind the subject, as fractions of the frame (default .74, .42)
     grain=  0..1 film grain over everything, so the photograph and the type share one surface (default .05 on a lit plate)
     shadow= 0|1 a soft shadow under the cutout, for separation (default 1 on a lit plate)
   Nothing here touches the words, the face or the mark. */
window.FINISH = function (f, P, N) {
  var bg = P('bg', 'white');
  /* markc=white sets a one-colour mark in white (a brand colour that fights the plate, Meta's blue on red) */
  if (P('markc', '') === 'white') { var mk = document.getElementById('mark'); if (mk) mk.style.filter = 'brightness(0) invert(1)'; }
  if (bg === 'white') return { bg: bg };
  f.classList.remove('grid');
  var lx = N('lx', .74) * 100, ly = N('ly', .42) * 100;
  var plates = {
    red:   ['#D5191F', '#9E0B10', '#3C0204'],
    dark:  ['#4A5059', '#1C1F24', '#07080A'],
    light: ['#FFFFFF', '#E9EBEE', '#B9BEC6']
  };
  var c = plates[bg] || plates.dark;
  f.style.background =
    'radial-gradient(ellipse 52% 70% at ' + lx + '% ' + ly + '%,' + c[0] + ' 0%,' + c[1] + ' 55%,' + c[2] + ' 100%)';
  /* a floor of shade along the bottom: the cut edge of a bust falls into it, the way a studio seamless darkens toward the floor */
  var fl = document.createElement('div');
  fl.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:300px;z-index:2;pointer-events:none;' +
    'background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,' + (bg === 'light' ? .10 : .38) + ') 100%)';
  f.appendChild(fl);
  var g = N('grain', .05);
  if (g > 0) {
    var gr = document.createElement('div');
    gr.style.cssText = 'position:absolute;inset:0;z-index:8;pointer-events:none;mix-blend-mode:overlay;opacity:' + g + ';' +
      'background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27256%27 height=%27256%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.9%27 numOctaves=%272%27 seed=%277%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")';
    f.appendChild(gr);
  }
  /* the cutout sits above the floor shade only at its top; its own bottom fades into the floor */
  var css = document.createElement('style');
  css.textContent = '#cut{z-index:1' + (N('shadow', 1) ? ';filter:drop-shadow(0 18px 34px rgba(0,0,0,' + (bg === 'light' ? .28 : .55) + '))' : '') + '}' +
    '#tx{z-index:4}#mark{z-index:5}';
  document.head.appendChild(css);
  return { bg: bg };
};
