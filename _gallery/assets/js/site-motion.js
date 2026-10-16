/* =========================================================
   site-motion.js — motion for the landing page.

   Needs: assets/js/vendor/motion-14.3.0.js loaded first (global Motion).
   Parts:
     1. Hero headline: name lines rise out of their masks, then the tag,
        intro line and buttons follow.
     2. Work cards: staggered entrance as they scroll into view.
     3. Work cards: "pick-up" on hover / keyboard focus — pop up, float,
        glint, set back down.
     4. Dotted sphere behind the portrait (canvas): glowing edge, haze,
        orbit ring, pointer scatter.

   Rules this file follows:
     - Content never depends on it: the hidden starting states only exist
       while <html> has the "motion" class (set in the <head>), and that
       class is removed if anything here fails.
     - Reduced motion: no entrances, no pick-up; the sphere is drawn once, still.
     - Only transform and opacity are animated (the sphere canvas aside).
   ========================================================= */
(function () {
  'use strict';

  const root = document.documentElement;
  const M = window.Motion;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = [0.22, 1, 0.36, 1];               // fast start, soft landing

  window.siteMotionReady = true;                   // tells the <head> safety timer we arrived

  // If the library is missing or the 3 s safety timer already gave up, show everything as is.
  const entrances = !!M && root.classList.contains('motion');
  if (!M) root.classList.remove('motion');

  function safely(fn) {
    try { fn(); }
    catch (err) { root.classList.remove('motion'); console.error('[site-motion]', err); }
  }

  /* ---------- 1. hero headline ---------- */
  // Three styles, picked with data-name-intro on <html>:
  //   rise  — each line rises out of its mask
  //   slide — each line glides in from the left out of its mask (same easing as rise)
  //   type  — the name is typed letter by letter, at an uneven human pace,
  //           behind an orange block cursor
  // The tag, intro line and buttons follow once the name is in.
  function heroIntro() {
    const style = root.dataset.nameIntro || 'rise';
    const lines = [...document.querySelectorAll('.hero h1 .ln')];
    let nameDone = 0.5;                              // seconds until the rest of the hero follows

    if (style === 'slide') {
      M.animate(lines,
        { opacity: [0, 1], transform: ['translateX(-110%)', 'translateX(0%)'] },
        { duration: 1.05, ease: EASE, delay: M.stagger(0.13, { startDelay: 0.1 }) });
      nameDone = 0.55;
    } else if (style === 'type') {
      typeName(lines);
      nameDone = 1.3;                                // the rest of the hero arrives while the name is still being typed
    } else {
      M.animate(lines,
        { opacity: [0, 1], transform: ['translateY(150%)', 'translateY(0%)'] },
        { duration: 0.9, ease: EASE, delay: M.stagger(0.11, { startDelay: 0.1 }) });
    }

    M.animate(document.querySelectorAll('[data-intro]'),
      { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] },
      { duration: 0.6, ease: EASE, delay: M.stagger(0.08, { startDelay: nameDone }) });
  }

  // Typing: letters appear one at a time (opacity only) at an uneven, human pace:
  // the cursor blinks once before starting, keys land 60–170 ms apart, now and
  // then there's a short hesitation, and each new line gets a longer pause.
  // At the end the cursor blinks a few times, then fades.
  // Returns how long the typing takes, in seconds.
  function typeName(lines) {
    const h1 = lines[0].closest('h1');
    const fullName = lines.map(l => l.textContent).join(' ');
    h1.setAttribute('aria-label', fullName);        // screen readers get the whole name, not letters

    // split each line into letter spans (put back to plain text when done)
    const letters = [];
    lines.forEach((line, li) => {
      const text = line.textContent;
      line.textContent = '';
      [...text].forEach(ch => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.opacity = '0';
        span.style.display = 'inline';               // the h1 makes spans block-level; letters must stay inline
        span.setAttribute('aria-hidden', 'true');
        line.appendChild(span);
        letters.push({ span, li });
      });
      line.dataset.text = text;
      line.style.opacity = '1';
    });

    const caret = document.createElement('span');
    caret.className = 'type-caret';
    caret.setAttribute('aria-hidden', 'true');
    h1.appendChild(caret);

    const box = () => h1.getBoundingClientRect();
    function moveCaret(span, before) {               // park the cursor just after (or before) a letter
      const r = span.getBoundingClientRect(), h = box();
      const x = (before ? r.left : r.right) - h.left + r.height * 0.04;
      const y = r.top - h.top + r.height * 0.17;
      caret.style.transform = `translate(${x}px, ${y}px)`;
    }
    moveCaret(letters[0].span, true);

    // timing: uneven gaps between keys, the odd hesitation, longer pauses between lines
    let t = 0.75;                                    // cursor waits (and blinks once) before the first key
    const times = letters.map((l, i) => {
      if (i > 0 && l.li !== letters[i - 1].li) t += 0.3 + Math.random() * 0.25;   // new line
      t += 0.06 + Math.random() * 0.11;              // normal key
      if (Math.random() < 0.12) t += 0.12 + Math.random() * 0.22;                   // hesitation
      return t;
    });
    M.animate(caret, { opacity: [1, 0, 1] }, { duration: 0.6, ease: 'linear', delay: 0.1 });
    letters.forEach((l, i) => setTimeout(() => {
      l.span.style.opacity = '1';
      moveCaret(l.span, false);
    }, times[i] * 1000));

    const end = times[times.length - 1];
    setTimeout(() => {
      // blink a few times, fade, then restore plain text (best for copy/paste and kerning)
      M.animate(caret, { opacity: [1, 0, 1, 0, 1, 0] }, { duration: 1.1, ease: 'linear' }).then(() => {
        caret.remove();
        lines.forEach(line => { line.textContent = line.dataset.text; delete line.dataset.text; });
        h1.removeAttribute('aria-label');
      });
    }, end * 1000 + 80);
    return end + 0.1;
  }

  /* ---------- 2. card entrance ---------- */
  // Cards that come into view in the same frame are animated together, one after another.
  function cardEntrance() {
    const queue = new Set();
    let scheduled = false;

    function flush() {
      scheduled = false;
      const batch = [...queue];
      queue.clear();
      batch.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      M.animate(batch,
        { opacity: [0, 1], transform: ['translateY(32px)', 'translateY(0px)'] },
        { duration: 0.7, ease: EASE, delay: M.stagger(0.08) });
    }

    function watch(cards) {
      cards.forEach(card => {
        if (card.dataset.entrance) return;
        card.dataset.entrance = '1';
        M.inView(card, () => {                      // fires once, then stops watching
          queue.add(card);
          if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
        }, { amount: 0.15 });
      });
    }

    watch(document.querySelectorAll('.card'));
    // cards rendered later by the browser fallback (page opened without a build)
    document.addEventListener('cards:rendered', () => watch(document.querySelectorAll('.card')));
  }

  /* ---------- 3. card pick-up ---------- */
  // Like picking an item up in an exploration game: on hover (or keyboard
  // focus) the card pops straight up off the page with a little overshoot, then floats
  // while held, its shadow shrinking underneath and a glint crossing the
  // thumbnail. Leaving puts it back down with a small settle bounce.
  function cardPickUp() {
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    root.classList.add('pickup-on');
    const LIFT = -14;                                // px the card rises while held (it stays level)

    function bind(card) {
      const panel = card.querySelector('.card__in');
      const shadow = card.querySelector('.card__shadow');
      const glint = card.querySelector('.card__glint i');
      if (!panel || card.dataset.pickup) return;
      card.dataset.pickup = '1';
      let held = false, float = null;

      function pickUp() {
        if (held) return;
        held = true;
        if (float) float.stop();
        // pop: rise past the resting height, then ease back to it
        M.animate(panel,
          { y: [null, LIFT - 6, LIFT], scale: [null, 1.05, 1.04] },
          { duration: 0.5, times: [0, 0.55, 1], ease: [0.2, 0.9, 0.3, 1] })
          .then(() => {
            if (!held) return;
            // held: slow, straight up-and-down bob
            float = M.animate(panel,
              { y: [LIFT, LIFT - 3, LIFT] },
              { duration: 2.6, ease: 'easeInOut', repeat: Infinity });
          });
        M.animate(shadow, { scale: 0.94, opacity: 0.5 }, { duration: 0.4, ease: 'easeOut' });
        if (glint) M.animate(glint,
          { transform: ['translateX(-120%) skewX(-12deg)', 'translateX(320%) skewX(-12deg)'], opacity: [0, 1, 1, 0] },
          { duration: 0.75, delay: 0.12, ease: 'easeInOut' });
      }

      function putDown() {
        if (!held) return;
        held = false;
        if (float) { float.stop(); float = null; }
        M.animate(panel, { y: 0, scale: 1 }, { type: 'spring', stiffness: 420, damping: 16, mass: 0.8 });
        M.animate(shadow, { scale: 1, opacity: 1 }, { duration: 0.3, ease: 'easeOut' });
      }

      if (mouse) {
        card.addEventListener('pointerenter', pickUp);
        card.addEventListener('pointerleave', putDown);
      }
      // keyboard: tabbing into the card's links picks it up, tabbing out puts it down
      card.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) pickUp(); });
      card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget) && !card.matches(':hover')) putDown(); });
    }

    document.querySelectorAll('.card').forEach(bind);
    document.addEventListener('cards:rendered', () => document.querySelectorAll('.card').forEach(bind));
  }

  /* ---------- 4. dotted sphere ---------- */
  // A dense globe of fine dots that glows at its edge and stays dark in the
  // middle, lit with the page's colours (off-white top-left → orange
  // bottom-right). Around it: a faint haze of loose particles and a thin
  // orange orbit ring on its own axis, turning the other way.
  // The pointer makes it lean, and pushes nearby dots off the surface;
  // they spring back.
  function sphere() {
    const figure = document.querySelector('.portrait');
    const frameEl = figure && figure.querySelector('.frame');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!frameEl || !ctx) return;

    canvas.className = 'orb';
    canvas.setAttribute('aria-hidden', 'true');
    figure.insertBefore(canvas, frameEl);

    const phone = window.matchMedia('(max-width: 900px)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const N_SPHERE = phone ? 900 : 2300;             // surface dots
    const N_HAZE = phone ? 80 : 280;                  // loose particles around it
    const N_RING = phone ? 90 : 170;                  // orbit ring dots
    const TOTAL = N_SPHERE + N_HAZE + N_RING;

    // ---- particles: base position on a unit sphere (x, y, z) ----
    const base = new Float32Array(TOTAL * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N_SPHERE; i++) {            // Fibonacci spiral: even spacing, no clumps at the poles
      const y = 1 - 2 * (i + 0.5) / N_SPHERE, r = Math.sqrt(1 - y * y), t = i * golden;
      const j = () => (Math.random() - 0.5) * 0.02;   // tiny jitter breaks up the spiral's moiré lines
      base.set([Math.cos(t) * r + j(), y + j(), Math.sin(t) * r + j()], i * 3);
    }
    const hazePhase = new Float32Array(N_HAZE);
    for (let i = 0; i < N_HAZE; i++) {              // random points in a shell just outside the surface
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const d = 1.04 + Math.pow(Math.random(), 1.8) * 0.42;
      base.set([Math.cos(t) * r * d, u * d, Math.sin(t) * r * d], (N_SPHERE + i) * 3);
      hazePhase[i] = Math.random() * Math.PI * 2;
    }
    const RING_TILT = 0.38;                          // ring leans sideways so it isn't parallel to the equator
    for (let i = 0; i < N_RING; i++) {
      const t = i / N_RING * Math.PI * 2, x = Math.cos(t) * 1.28;
      base.set([x * Math.cos(RING_TILT), x * Math.sin(RING_TILT), Math.sin(t) * 1.28], (N_SPHERE + N_HAZE + i) * 3);
    }

    // scatter state for surface dots: screen-space offset + velocity (CSS px)
    const offX = new Float32Array(N_SPHERE), offY = new Float32Array(N_SPHERE);
    const velX = new Float32Array(N_SPHERE), velY = new Float32Array(N_SPHERE);

    // ---- colour buckets: drawing ~3000 dots fast means few fillStyle changes ----
    const TONES = 8, LEVELS = 12;                    // colour steps × brightness steps
    const INK = [244, 241, 236], ORANGE = [255, 122, 26];
    const styles = [];
    for (let c = 0; c < TONES; c++) {
      const k = c / (TONES - 1);
      const rgb = INK.map((v, j) => Math.round(v + (ORANGE[j] - v) * k)).join(',');
      for (let l = 0; l < LEVELS; l++) styles.push(`rgba(${rgb},${((l + 1) / LEVELS).toFixed(3)})`);
    }
    const bucketOf = new Uint16Array(TOTAL), px = new Float32Array(TOTAL), py = new Float32Array(TOTAL), sz = new Float32Array(TOTAL);
    const count = new Uint32Array(TONES * LEVELS + 1), order = new Uint32Array(TOTAL);

    let size = 0, dpr = 1, cx = 0, cy = 0, R = 0, dotPx = 1;
    const glowLayer = document.createElement('canvas');
    function resize() {
      // centre on the photo frame (the figure also holds the caption), nudged up a little;
      // the CSS also sets it slightly left of centre so the globe sits off-axis behind the photo
      canvas.style.top = (frameEl.offsetTop + frameEl.offsetHeight * 0.44) + 'px';
      size = canvas.clientWidth;
      dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      cx = cy = size / 2;
      R = size * 0.35;                               // sphere radius; ring and haze reach ~0.46
      dotPx = Math.max(1.3, size / 430);             // fine dots, a bit larger on big screens

      // the outline glow never changes, so it's painted once here and reused every frame
      glowLayer.width = canvas.width; glowLayer.height = canvas.height;
      const g = glowLayer.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grad = g.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.06);
      grad.addColorStop(0, 'rgba(255,122,26,0)');
      grad.addColorStop(0.8, 'rgba(255,150,70,0.10)');
      grad.addColorStop(1, 'rgba(255,122,26,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      draw(0);
    }

    // pointer, in canvas pixels, plus the eased lean it causes
    let pointer = null, leanX = 0, leanY = 0, targetX = 0, targetY = 0;
    if (finePointer && !reduce) {
      window.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        pointer = [e.clientX - r.left, e.clientY - r.top];
        targetX = Math.max(-1, Math.min(1, (pointer[0] - cx) / size));
        targetY = Math.max(-1, Math.min(1, (pointer[1] - cy) / size));
      }, { passive: true });
      document.addEventListener('pointerleave', () => { pointer = null; });
    }

    let spin = 0.6, orbit = 0, time = 0;
    const F = 3.4;                                   // perspective strength
    const PUSH_R = phone ? 0 : 95;                   // pointer push radius (px)

    function draw(dt) {
      const a = spin + leanX * 0.5, b = 0.42 + leanY * 0.35;          // sphere / haze axis
      const ra = orbit, rb = -0.55 + leanY * 0.2;                     // ring axis
      // rotation sines/cosines, worked out once per frame (haze particles add their own phase)
      const S = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
      const Rg = [Math.cos(ra), Math.sin(ra), Math.cos(rb), Math.sin(rb)];
      count.fill(0);

      for (let i = 0; i < TOTAL; i++) {
        const ring = i >= N_SPHERE + N_HAZE, haze = !ring && i >= N_SPHERE;
        let X = base[i * 3], Y = base[i * 3 + 1], Z = base[i * 3 + 2];
        let [ca, sa, cb, sb] = ring ? Rg : S;
        if (haze) {                                  // haze turns slower than the sphere and bobs gently
          const h = hazePhase[i - N_SPHERE];
          ca = Math.cos(a * 0.7 + h); sa = Math.sin(a * 0.7 + h);
          Y += Math.sin(time * 0.6 + h) * 0.03;
        }
        const x = X * ca + Z * sa, z0 = -X * sa + Z * ca;
        const y = Y * cb - z0 * sb, z = Y * sb + z0 * cb;
        const k = F / (F - z);
        let sx = cx + x * R * k, sy = cy + y * R * k;

        // brightness: surface dots glow where the sphere turns away (edge), stay dark facing you
        let alpha, tone;
        if (!ring && !haze) {
          const facing = z;                                               // unit sphere: z is how much the dot faces you (1) vs edge (0)
          const rim = 1 - Math.abs(facing);
          alpha = facing >= 0 ? 0.06 + 0.94 * Math.pow(rim, 1.15) : 0.04 + 0.4 * Math.pow(rim, 1.6);

          // pointer pushes front dots off the surface; a spring pulls them back
          if (dt && PUSH_R) {
            if (pointer && facing > 0) {
              const dx = sx + offX[i] - pointer[0], dy = sy + offY[i] - pointer[1], d = Math.hypot(dx, dy);
              if (d < PUSH_R && d > 0.01) {
                const f = (1 - d / PUSH_R) * 1500 * dt;
                velX[i] += dx / d * f; velY[i] += dy / d * f;
                alpha = Math.max(alpha, 0.55 * (1 - d / PUSH_R));              // disturbed dots catch the light
              }
            }
            velX[i] += (-offX[i] * 12 - velX[i] * 3.6) * dt;   // soft spring: dots drift back
            velY[i] += (-offY[i] * 12 - velY[i] * 3.6) * dt;
            offX[i] += velX[i] * dt; offY[i] += velY[i] * dt;
          }
          sx += offX[i]; sy += offY[i];
        } else if (haze) {
          alpha = 0.12 + 0.42 * ((z + 1.5) / 3);
        } else {                                                            // ring: orange, fainter behind
          alpha = z < 0 ? 0.18 + 0.2 * (1 + z / 1.3) : 0.45 + 0.5 * (z / 1.3);
        }
        // colour runs from off-white (top-left) to orange (bottom-right); the ring stays orange
        tone = ring ? 1 : Math.min(1, Math.max(0, ((sx - cx) + (sy - cy)) / (1.9 * R) + 0.55));

        const l = Math.min(LEVELS - 1, Math.max(0, Math.round(alpha * LEVELS) - 1));
        const bkt = Math.round(tone * (TONES - 1)) * LEVELS + l;
        bucketOf[i] = bkt; count[bkt + 1]++;
        px[i] = sx; py[i] = sy;
        sz[i] = dotPx * (ring ? 1.2 : haze ? 0.95 : 0.7 + 0.8 * (l / LEVELS)) * (0.75 + 0.25 * k);
      }

      // counting sort by bucket, then one fillStyle per bucket
      for (let j = 1; j < count.length; j++) count[j] += count[j - 1];
      const start = count.slice();
      for (let i = 0; i < TOTAL; i++) order[start[bucketOf[i]]++] = i;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';      // overlapping dots add up: the edge glows
      ctx.drawImage(glowLayer, 0, 0, size, size);   // soft light along the outline, under the dots
      let current = -1;
      for (let n = 0; n < TOTAL; n++) {
        const i = order[n], bkt = bucketOf[i];
        if (bkt !== current) { ctx.fillStyle = styles[bkt]; current = bkt; }
        const s = sz[i];
        ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s);
      }
    }

    // animation loop, running only while the sphere is on screen and the tab is visible
    let running = false, onScreen = false, last = 0, raf = 0;
    function tick(now) {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0));   // the first frame's timestamp can be a hair before 'last'
      last = now;
      time += dt;
      spin += dt * 0.14;
      orbit -= dt * 0.3;
      leanX += (targetX - leanX) * 0.06;
      leanY += (targetY - leanY) * 0.06;
      draw(dt);
      raf = requestAnimationFrame(tick);
    }
    function update() {
      const should = onScreen && !document.hidden && !reduce;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }

    new IntersectionObserver(es => { onScreen = es[0].isIntersecting; update(); }).observe(canvas);
    document.addEventListener('visibilitychange', update);
    new ResizeObserver(resize).observe(figure);
    resize();
    requestAnimationFrame(() => canvas.classList.add('is-on'));   // fade in (opacity only)
  }

  if (entrances) safely(heroIntro);
  if (entrances) safely(cardEntrance);
  if (M && !reduce) safely(cardPickUp);
  safely(sphere);
})();
