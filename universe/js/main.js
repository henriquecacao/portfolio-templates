/* =========================================================
   UNIVERSE — scroll journey
   ---------------------------------------------------------
   1. Ship sprite   — pixel art drawn from a text map into an <svg>.
   2. Flight path   — an SVG path through every painting, rebuilt on resize:
                      the ship flies straight down beside a painting ("docked"),
                      then swoops across to the next one.
   3. Scroll → ship — the ship sits on the point of the path that is level
                      with the middle of the screen, eased so it glides.
   4. Sky           — pixel starfield with parallax + exhaust particles (canvas).
   5. Stops         — active painting tints the nebula and lights the HUD.
   6. Lightbox      — full-size viewer with keyboard support.
   Respects prefers-reduced-motion: no gliding, no particles, static stars.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const flight = $('#flight'), ship = $('#ship'), trail = $('#trail');
  const pathAll = $('#path-all'), pathDone = $('#path-done'), doneRect = $('#done-rect');
  const stops = $$('.stop'), finale = $('#finale');
  const readout = $('#readout'), rail = $('#rail');

  /* ---------- 1. ship sprite ----------
     Each character is one pixel. The ship points UP; it is rotated in JS.
     . empty  W hull  G hull shade  D dark metal  R red fins  C cockpit
     Flame rows use two frames (f1/f2) that flicker against each other. */
  const SHIP = [
    '.......RR.......',
    '......RWWR......',
    '......WWWW......',
    '.....WWCCWW.....',
    '.....WCCCCW.....',
    '.....WCCCCW.....',
    '.....WWCCWW.....',
    '....GWWWWWWG....',
    '...RGWWWWWWGR...',
    '..RRGWWDDWWGRR..',
    '.RRRGWWDDWWGRRR.',
    '.RR.GGWWWWGG.RR.',
    '.R...GDDDDG...R.',
    '......D..D......',
  ];
  const FLAME_1 = ['......YY.YY.....', '......OY.YO.....', '.......O.O......', '.......R.R......'];
  const FLAME_2 = ['......YYYY......', '.....OYYYYO.....', '......OYYO......', '.......OO.......', '.......R........'];
  const COLORS = { W: '#EEEcF6', G: '#9A98B5', D: '#4B4870', R: '#F2542D', C: '#6FE3F2', Y: '#F5D547', O: '#FF9A2E' };
  const rects = (rows, y0) => rows.flatMap((row, y) => [...row].map((ch, x) =>
    COLORS[ch] ? `<rect x="${x}" y="${y + y0}" width="1.02" height="1.02" fill="${COLORS[ch]}"/>` : '')).join('');
  ship.innerHTML = `<svg viewBox="0 0 16 20" aria-hidden="true">${rects(SHIP, 0)}
    <g class="flame"><g class="f1">${rects(FLAME_1, 14)}</g><g class="f2">${rects(FLAME_2, 14)}</g></g></svg>`;

  // progress rail: one segment per painting
  rail.innerHTML = stops.map(() => '<i></i>').join('');
  const railBits = $$('i', rail);

  /* ---------- 2. flight path ---------- */
  let samples = [];        // [{x, y}] every STEP px of path length
  const STEP = 3;
  let W = 0, mobile = false;
  let docks = [];          // per stop: {top, bot} y-range where the ship is beside it

  // position of an element relative to the flight container
  const rel = el => {
    const r = el.getBoundingClientRect(), f = flight.getBoundingClientRect();
    return { left: r.left - f.left, right: r.right - f.left, top: r.top - f.top, bottom: r.bottom - f.top, width: r.width, height: r.height };
  };

  function buildPath() {
    W = flight.clientWidth;
    mobile = innerWidth <= 860;
    const pad = rel($('#pad')), dock = rel($('#dock'));
    const pts = [];      // sequence of [type, point] — 'C' = swoop to point, 'L' = straight to point
    const start = { x: pad.left + pad.width / 2, y: pad.top - 4 };

    docks = stops.map((stop, i) => {
      const art = rel($('.art .pframe', stop));
      let x;
      if (mobile) x = i % 2 ? (art.right + W) / 2 : art.left / 2;              // side lanes
      else x = stop.classList.contains('stop--r') ? art.left - 70 : art.right + 70; // centre lane
      // desktop: dock beside the painting; mobile: also beside the caption below it,
      // so the ship only crosses the screen in the empty gap between two stops
      const cap = rel($('.cap', stop));
      const top = art.top + art.height * 0.12, bot = mobile ? cap.bottom : art.top + art.height * 0.88;
      pts.push(['C', { x, y: top }], ['L', { x, y: bot }]);
      return { top, bot, mid: (top + bot) / 2 };
    });
    pts.push(['C', { x: dock.left + dock.width / 2, y: dock.top + 6 }]);

    // swoop: cubic curve with vertical tangents at both ends; on desktop the
    // control points overshoot outwards so the ship banks across the gap.
    const swoop = mobile ? 0 : W * 0.2;
    const side = x => Math.sign(x - W / 2);
    let d = `M${start.x},${start.y}`, prev = start;
    for (const [type, p] of pts) {
      if (type === 'L') d += ` L${p.x},${p.y}`;
      else {
        const gap = p.y - prev.y;
        d += ` C${prev.x + side(prev.x) * swoop},${prev.y + gap * 0.38} ${p.x + side(p.x) * swoop},${prev.y + gap * 0.62} ${p.x},${p.y}`;
      }
      prev = p;
    }
    pathAll.setAttribute('d', d);
    pathDone.setAttribute('d', d);
    trail.setAttribute('viewBox', `0 0 ${W} ${flight.clientHeight}`);

    // sample the path once so per-frame lookups are cheap
    const len = pathAll.getTotalLength();
    samples = [];
    for (let s = 0; s <= len; s += STEP) { const p = pathAll.getPointAtLength(s); samples.push({ x: p.x, y: p.y }); }
  }

  // index of the first sample at or below a given y (path y never goes up)
  function indexAtY(y) {
    let lo = 0, hi = samples.length - 1;
    if (y <= samples[0].y) return 0;
    if (y >= samples[hi].y) return hi;
    while (lo < hi) { const m = (lo + hi) >> 1; if (samples[m].y < y) lo = m + 1; else hi = m; }
    return lo;
  }
  const pointAt = s => {
    const i = Math.max(0, Math.min(samples.length - 1, s));
    const a = samples[Math.floor(i)], b = samples[Math.ceil(i)], t = i - Math.floor(i);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };

  /* ---------- 3 + 4. animation loop ---------- */
  const sky = $('#sky'), ctx = sky.getContext('2d');
  let dpr = 1, vw = 0, vh = 0, stars = [], parts = [];
  function sizeSky() {
    dpr = Math.min(devicePixelRatio || 1, 2); vw = innerWidth; vh = innerHeight;
    sky.width = vw * dpr; sky.height = vh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // three parallax layers; far stars are small, dim and slow
    const n = Math.round(vw * vh / 5200);
    stars = Array.from({ length: n }, () => {
      const layer = Math.random() < .6 ? 0 : Math.random() < .7 ? 1 : 2;
      return { x: Math.random() * vw, y: Math.random() * vh * 3, layer, size: [1, 2, 3][layer],
        speed: [.04, .1, .22][layer], tw: Math.random() * 6.28,
        tint: Math.random() < .12 ? ['#C9B6F2', '#A8DDE6', '#FFD23F', '#B8E6A8'][Math.floor(Math.random() * 4)] : '#FFFFFF' };
    });
  }

  let s = 0, target = 0, last = 0, shooting = null;
  function frame(t) {
    const dt = Math.min(48, t - (last || t)) / 16.7; last = t;
    if (samples.length) {
      // the ship follows the point of the path level with the middle of the screen
      const f = flight.getBoundingClientRect();
      target = indexAtY(vh * 0.5 - f.top);
      const before = s;
      s = reduce ? snapTarget(target) : s + (target - s) * Math.min(1, 0.1 * dt);
      const speed = Math.abs(s - before) * STEP;

      const p = pointAt(s), ahead = pointAt(s + 6), behind = pointAt(s - 6);
      let ang = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180 / Math.PI + 90;
      if (s < 40) ang = ang * (s / 40);                       // on the pad it points up, then flips into the dive
      ang = Math.round(ang / 15) * 15;                        // 15° steps keep it feeling like a sprite
      if (reduce) ang = 180;                                   // reduced motion: parked nose-down beside the painting
      const bob = speed < .3 && !reduce ? Math.sin(t / 380) * 2 : 0;
      ship.style.transform = `translate(${p.x}px, ${p.y + bob}px) rotate(${ang}deg)`;
      ship.classList.toggle('idle', speed < .6);

      // the trail lights up above the ship (clip rect grows with it)
      doneRect.setAttribute('height', Math.max(0, p.y));

      // exhaust: pixel sparks out of the tail while moving
      if (!reduce && speed > .8) {
        const rad = (ang - 90) * Math.PI / 180, back = mobile ? 22 : 34;
        for (let k = 0; k < Math.min(4, speed / 2); k++) parts.push({
          x: p.x - Math.cos(rad) * back + (Math.random() - .5) * 6, y: p.y - Math.sin(rad) * back + (Math.random() - .5) * 6,
          vx: -Math.cos(rad) * (1 + Math.random()) + (Math.random() - .5), vy: -Math.sin(rad) * (1 + Math.random()) + (Math.random() - .5),
          life: 1 });
      }
      setActive(p.y);
      drawSky(t, f, dt);
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  // reduced motion: jump straight to the painting nearest the screen centre
  function snapTarget(tg) {
    const y = samples[tg].y;
    let best = null;
    docks.forEach(d => { if (best === null || Math.abs(d.mid - y) < Math.abs(best.mid - y)) best = d; });
    if (y < docks[0].top - vh * .5) return 0;
    if (y > docks[docks.length - 1].bot + vh * .5) return samples.length - 1;
    return indexAtY(best.top);
  }

  function drawSky(t, f, dt) {
    ctx.clearRect(0, 0, vw, vh);
    const scrollY = -f.top;
    for (const st of stars) {
      const y = ((st.y - scrollY * st.speed) % (vh * 3) + vh * 3) % (vh * 3);
      if (y > vh) continue;
      const a = reduce ? .8 : .55 + .45 * Math.sin(t / 700 + st.tw);
      ctx.globalAlpha = a * [.55, .8, 1][st.layer];
      ctx.fillStyle = st.tint;
      ctx.fillRect(Math.round(st.x), Math.round(y), st.size, st.size);
    }
    // occasional shooting star (pixel streak)
    if (!reduce) {
      if (!shooting && Math.random() < .003) shooting = { x: Math.random() * vw * .7, y: Math.random() * vh * .4, life: 1 };
      if (shooting) {
        shooting.x += 9 * dt; shooting.y += 4 * dt; shooting.life -= .025 * dt;
        for (let k = 0; k < 10; k++) { ctx.globalAlpha = shooting.life * (1 - k / 10); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(shooting.x - k * 9), Math.round(shooting.y - k * 4), 3, 3); }
        if (shooting.life <= 0) shooting = null;
      }
    }
    // exhaust particles (stored in flight coordinates)
    for (const pt of parts) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= .035 * dt;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.life > .7 ? '#F5D547' : pt.life > .4 ? '#FF9A2E' : '#F2542D';
      const sz = pt.life > .5 ? 4 : 3;
      ctx.fillRect(Math.round(pt.x + f.left), Math.round(pt.y + f.top), sz, sz);
    }
    parts = parts.filter(pt => pt.life > 0);
    ctx.globalAlpha = 1;
  }

  /* ---------- 5. active painting ---------- */
  let active = -2;
  function setActive(y) {
    let i = -1;                                           // -1 = before the first painting
    docks.forEach((d, k) => { if (y >= d.top - (vh * .15)) i = k; });
    if (y > docks[docks.length - 1].bot + vh * .25) i = stops.length;   // past the last one = finale
    if (i === active) return;
    active = i;
    stops.forEach((st, k) => st.classList.toggle('on', k === i));
    railBits.forEach((b, k) => b.classList.toggle('on', k <= i));
    const src = i < 0 ? null : i >= stops.length ? finale : stops[i];
    document.body.style.setProperty('--accent', src ? src.dataset.accent : '#8E5BE8');
    document.body.style.setProperty('--accent2', src ? src.dataset.accent2 : '#FF5A36');
    readout.textContent = i < 0 ? 'Launch' : i >= stops.length ? 'Landed' : `Stop ${String(i + 1).padStart(2, '0')}/${String(stops.length).padStart(2, '0')}`;
  }

  /* ---------- 6. lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  const items = [...stops.map((st, k) => ({ src: $('[data-full]', st).dataset.full, alt: $('img', st).alt, cap: `Nº${String(k + 1).padStart(2, '0')} / 09 · Spray paint`, el: st })),
    { src: $('.wall [data-full]').dataset.full, alt: $('.wall img').alt, cap: 'Universe · exhibited', el: finale }];
  let cur = 0;
  function openLb(k) {
    cur = (k + items.length) % items.length;
    const it = items[cur];
    lbImg.src = it.src; lbImg.alt = it.alt; lbCap.textContent = it.cap;
    lb.style.setProperty('--accent', it.el.dataset.accent);
    if (!lb.open) lb.showModal();
  }
  stops.forEach((st, k) => $$('[data-full], [data-open]', st).forEach(b => b.addEventListener('click', () => openLb(k))));
  $('.wall [data-full]').addEventListener('click', () => openLb(items.length - 1));
  lb.addEventListener('click', e => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb) lb.close();
    if (act === 'prev') openLb(cur - 1);
    if (act === 'next') openLb(cur + 1);
  });
  addEventListener('keydown', e => {
    if (!lb.open) return;
    if (e.key === 'ArrowLeft') openLb(cur - 1);
    if (e.key === 'ArrowRight') openLb(cur + 1);
  });

  $('#again').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- boot ---------- */
  function relayout() { sizeSky(); buildPath(); if (reduce) frame(performance.now()); }
  new ResizeObserver(() => relayout()).observe(flight);
  addEventListener('resize', sizeSky);
  if (reduce) addEventListener('scroll', () => frame(performance.now()), { passive: true });
  relayout();
  if (!reduce) requestAnimationFrame(frame);
})();
