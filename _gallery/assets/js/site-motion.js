/* =========================================================
   site-motion.js — motion for the landing page.

   Needs: assets/js/vendor/motion-14.3.0.js loaded first (global Motion).
   Parts:
     1. Hero headline: name lines fly in from the page edge (or rise / slide / type), then the tag,
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

    if (style === 'edge') {
      // each line flies in from the left edge of the page, overshoots a little
      // and springs back into place, one after the other
      const from = -window.innerWidth;                // enough to start fully off the page
      M.animate(lines,
        { transform: [`translateX(${from}px)`, 'translateX(22px)', 'translateX(-6px)', 'translateX(0px)'] },
        { duration: 1.1, times: [0, 0.58, 0.8, 1], ease: [[0.25, 0.6, 0.3, 1], [0.45, 0, 0.55, 1], [0.45, 0, 0.55, 1]],
          delay: M.stagger(0.16, { startDelay: 0.15 }) });
      nameDone = 0.95;                               // tag, intro and buttons follow as the last line lands
    } else if (style === 'slide') {
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
      let held = false, float = null, bobY = LIFT;
      // the panel must rest on whole pixels: a card parked at e.g. -16.4px is drawn
      // between pixel rows, and its text and image go soft while it's held
      const setY = v => { bobY = Math.round(v); panel.style.transform = `translateY(${bobY}px)`; };

      function pickUp() {
        if (held) return;
        held = true;
        if (float) float.stop();
        // pop: rise past the resting height, then ease back to it
        M.animate(panel,
          { y: [null, LIFT - 6, LIFT] },                              // no scaling: scaled text and images go soft
          { duration: 0.5, times: [0, 0.55, 1], ease: [0.2, 0.9, 0.3, 1] })
          .then(() => {
            if (!held) return;
            // held: slow, straight up-and-down bob, snapped to whole pixels
            float = M.animate(LIFT, LIFT - 3,
              { duration: 1.3, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', onUpdate: setY });
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
        M.animate(panel, { y: [bobY, 0] }, { type: 'spring', stiffness: 420, damping: 16, mass: 0.8 })
          .then(() => { if (!held) panel.style.transform = ''; });   // land exactly on the page, no leftover fraction
        bobY = LIFT;
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
  // A dense globe of fine, mostly dim dots lit from one side, like the light in
  // the "Universe" paintings: the outer top-left edge glows bright off-white,
  // and the light falls off through orange until it fades out completely at the
  // bottom-right. Around it: a faint haze on the lit side and a thin orange
  // orbit ring on its own axis, turning the other way. The globe turns at a
  // steady speed; hovering makes the dots near the pointer glow, pulls them
  // slightly towards it like a weak magnet and lets them sink a little; dragging
  // with the left mouse button grabs the globe and turns it — let go and it
  // keeps the flick's momentum, then settles back.
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
    const N_SPHERE = phone ? 4000 : 16000;           // surface dots (very dense, so the surface and the magnet pull read smoothly)
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

    // ---- colour buckets: drawing ~16000 dots fast means few fillStyle changes ----
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
    // glow around each dot near the pointer, so the dots themselves give off light:
    // a tiny soft halo, painted once and stamped behind every lit dot
    const halo = document.createElement('canvas');
    halo.width = halo.height = 32;
    { const g = halo.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      // many stops along a smooth curve, so the halo has no visible ring or edge
      for (let k = 0; k <= 10; k++) {
        const t = k / 10, a = Math.exp(-t * t * 5) * (1 - t);          // soft bell, reaching 0 at the rim
        const gC = Math.round(226 - 90 * t), bC = Math.round(196 - 160 * t);   // warm white → orange
        gr.addColorStop(t, `rgba(255,${gC},${bC},${(a * 0.75).toFixed(3)})`);
      }
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
    const glowIdx = new Uint32Array(N_SPHERE), glowAmt = new Float32Array(N_SPHERE);   // dots glowing this frame
    let nLit = 0;
    let thin = false;                                // set on slow machines: draw two dots in three
    const glowLayer = document.createElement('canvas');
    const hide = [0, 0, -1, -1];                     // the photo frame's area in canvas px (nothing drawn there: it's covered)
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
      dotPx = Math.max(1.1, size / 520);             // fine dots, a bit larger on big screens
      // the photo frame sits on top of the canvas and is opaque, so skip dots under it
      // (inset a little: the frame is tilted 2° and straightens on hover)
      const c = canvas.getBoundingClientRect(), f = frameEl.getBoundingClientRect(), pad = 14;
      hide[0] = f.left - c.left + pad; hide[1] = f.top - c.top + pad;
      hide[2] = f.right - c.left - pad; hide[3] = f.bottom - c.top - pad;

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
      // the glow follows the light too: strong top-left, faint bottom-right
      const fade = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(0.75, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = fade;
      g.fillRect(0, 0, size, size);
      draw(0);
    }

    // rotation: a steady spin, unless someone grabs the globe and turns it
    const BASE_SPIN = 0.07, BASE_TILT = 0.42;        // rad/s, rad
    let spin = 0.6, tilt = BASE_TILT, orbit = 0, time = 0;
    let spinVel = 0, tiltVel = 0;                    // extra speed left over after a flick (rad/s)

    // pointer, in canvas pixels: drives the highlight, and lets a mouse drag rotate the globe
    let pointer = null, dragging = false, dragLast = null;
    const insideGlobe = () => pointer && Math.hypot(pointer[0] - cx, pointer[1] - cy) < R * 1.05;
    const onControl = el => el && el.closest && el.closest('a, button, input, textarea, select, label');
    if (finePointer && !reduce) {
      window.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        pointer = [e.clientX - r.left, e.clientY - r.top];
        if (dragging) {
          // turn the globe with the hand: sideways = spin, up/down = tilt
          const now = performance.now(), dx = e.clientX - dragLast[0], dy = e.clientY - dragLast[1];
          const dts = Math.max(0.008, (now - dragLast[2]) / 1000);
          spin += dx * 0.006;
          tilt = Math.max(-0.9, Math.min(1.5, tilt + dy * 0.006));
          spinVel = spinVel * 0.6 + (dx * 0.006 / dts) * 0.4;   // smoothed, so the release keeps the hand's speed
          tiltVel = tiltVel * 0.6 + (dy * 0.006 / dts) * 0.4;
          dragLast = [e.clientX, e.clientY, now];
          if (!running) draw(0);
        }
        // grab cursor over the globe (but not over links or buttons)
        root.classList.toggle('orb-hover', !dragging && insideGlobe() && !onControl(e.target));
      }, { passive: true });
      window.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.pointerType !== 'mouse' || !insideGlobe() || onControl(e.target)) return;
        dragging = true;
        dragLast = [e.clientX, e.clientY, performance.now()];
        spinVel = tiltVel = 0;
        root.classList.add('orb-dragging');
        root.classList.remove('orb-hover');
        e.preventDefault();                          // no text selection while turning the globe
      });
      const release = () => {
        if (!dragging) return;
        dragging = false;
        if (performance.now() - dragLast[2] > 80) spinVel = tiltVel = 0;   // held still before letting go: no flick
        root.classList.remove('orb-dragging');
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      document.addEventListener('pointerleave', () => { pointer = null; release(); root.classList.remove('orb-hover'); });
    }

    const F = 3.4;                                   // perspective strength
    const glow_tone = lit => Math.min(1, lit * 1.3);                 // lit → off-white, unlit → orange
    const RIM_START = Math.atan2(-1, -1);                           // the rim light is centred on the top-left
    const PULL_R = phone ? 0 : 110;                  // pointer reach (px): dots inside this radius light up and are pulled in
    const PULL = 0.22;                               // magnet strength: share of its distance a dot moves towards the pointer
    const PRESS = 12;                                // gravity: how far (px) dots right under the pointer sink
    const LIGHT_S = 68, LIGHT_R = 175;               // hover light: bell-curve width and where it's cut off (px; ~0 there)
    // light comes from the top-left, slightly in front (screen y points down)
    const LIGHT = (() => { const v = [-0.7, -0.7, 0.2], n = Math.hypot(...v); return v.map(c => c / n); })();   // grazing, so the lit part hugs the top-left edge

    function draw(dt) {
      const a = spin, b = tilt;                                       // sphere / haze axis
      const ra = orbit, rb = -0.55;                                   // ring axis
      // rotation sines/cosines, worked out once per frame (haze particles add their own phase)
      const S = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
      const Rg = [Math.cos(ra), Math.sin(ra), Math.cos(rb), Math.sin(rb)];
      count.fill(0);
      nLit = 0;

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

        // brightness and colour follow the light: most dots are dim, the outer
        // top-left edge is brightly lit, and the light falls off across the
        // globe until it fades out completely at the bottom-right
        let alpha, tone, press = 0, baseAlpha = -1;
        const lit = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);   // 0 = facing away from the light, 1 = facing it
        if (!ring && !haze) {
          const facing = z;                                               // unit sphere: z is how much the dot faces you (1) vs edge (0)
          const rim = 1 - Math.abs(facing);
          // rim light: a bright band along the outline that starts at the top-left and
          // wraps about 90% of the way round (162° each side), dimming as it goes;
          // the top of the globe gets an extra boost
          let dTheta = Math.abs(Math.atan2(y, x) - RIM_START);
          if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta;              // shortest way round
          const arc = Math.max(0, 1 - dTheta / (Math.PI * 0.9));
          const top = 1 + 0.8 * Math.max(0, -y / (Math.hypot(x, y) || 1)); // 1 at the sides → 1.8 at the very top
          const glow = Math.pow(rim, 1.6) * arc * top + 0.12 * lit * lit;
          alpha = facing >= 0
            ? 0.11 + 0.89 * Math.min(1, glow * 1.35)                     // every front dot stays slightly visible
            : 0.075 + 0.45 * glow;                                        // back half shows only faintly through (half of these dots are drawn, so each is a bit brighter)
          baseAlpha = alpha;                                              // size follows this, so hovering never thickens a dot

          // weak magnet + gravity: dots near the pointer light up and glow, drift a
          // little towards it (each moves a share of its distance, so they bunch up
          // without ever reaching the pointer) and sink slightly, as if weighed
          // down; they drift back when it leaves. A critically damped spring
          // follows that target, so there's no jitter or overshoot.
          // The light fades out like real light (a soft bell curve with a long,
          // faint tail), not as a disc with an edge: bright off-white in the
          // middle, warming to orange and dimming gradually further out.
          let tx = 0, ty = 0;
          if (pointer && facing > 0 && PULL_R) {
            const dx = sx - pointer[0], dy = sy - pointer[1], d = Math.hypot(dx, dy);
            if (d < LIGHT_R) {
              const light = Math.exp(-(d * d) / (LIGHT_S * LIGHT_S));     // 1 under the pointer → ~0 at LIGHT_R
              alpha = alpha + (1 - alpha) * Math.min(1, light * 1.15);
              press = light;
              if (d < PULL_R) {
                const w = 1 - d / PULL_R, fall = w * w * (3 - 2 * w);     // smoothstep falloff for the movement
                tx = -dx * PULL * fall;                                   // magnet: towards the pointer…
                ty = -dy * PULL * fall + PRESS * fall;                    // …and gravity: sinking a little
              }
            }
          }
          if (dt) {
            const K = 55, C = 2 * Math.sqrt(K);                           // stiffness, critical damping
            velX[i] += ((tx - offX[i]) * K - velX[i] * C) * dt;
            velY[i] += ((ty - offY[i]) * K - velY[i] * C) * dt;
            offX[i] += velX[i] * dt; offY[i] += velY[i] * dt;
          }
          sx += offX[i]; sy += offY[i];
        } else if (haze) {
          alpha = 0.04 + 0.4 * lit * lit;                                  // haze: only visible on the lit side
        } else {                                                            // ring: orange, fainter behind
          alpha = z < 0 ? 0.18 + 0.2 * (1 + z / 1.3) : 0.45 + 0.5 * (z / 1.3);
        }
        // colour: off-white where the light hits, orange in the shade; the ring stays orange
        tone = ring ? 1 : haze ? Math.min(1, Math.max(0, ((sx - cx) + (sy - cy)) / (1.9 * R) + 0.55))
                               : Math.min(1, Math.max(0, 1 - glow_tone(lit) - press * 0.95));  // only the brightest dots turn off-white; the rest stay warm

        const l = Math.min(LEVELS - 1, Math.max(0, Math.round(alpha * LEVELS) - 1));
        const bkt = Math.round(tone * (TONES - 1)) * LEVELS + l;
        bucketOf[i] = bkt; count[bkt + 1]++;
        px[i] = sx; py[i] = sy;
        if (press > 0.1) { glowIdx[nLit] = i; glowAmt[nLit++] = press; }   // fainter halos would be invisible: skip them
        const lSize = baseAlpha < 0 ? l : Math.min(LEVELS - 1, Math.max(0, Math.round(baseAlpha * LEVELS) - 1));
        sz[i] = dotPx * (ring ? 1.2 : haze ? 0.95 : 0.75 + 0.65 * (lSize / LEVELS)) * (0.75 + 0.25 * k);
        if (!ring && !haze && ((z < 0 && (i & 1)) || (thin && i % 3 === 2))) sz[i] = 0;              // the faint back half only needs every other dot (saves a lot of drawing)
      }

      // counting sort by bucket, then one fillStyle per bucket
      for (let j = 1; j < count.length; j++) count[j] += count[j - 1];
      const start = count.slice();
      for (let i = 0; i < TOTAL; i++) order[start[bucketOf[i]]++] = i;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';      // overlapping dots add up: the edge glows
      ctx.drawImage(glowLayer, 0, 0, size, size);   // soft light along the outline, under the dots
      // one path (one fill) per colour bucket; dots hidden under the photo frame are skipped
      let current = -1;
      for (let n = 0; n < TOTAL; n++) {
        const i = order[n], bkt = bucketOf[i];
        if (bkt !== current) {
          if (current >= 0) { ctx.fillStyle = styles[current]; ctx.fill(); }
          ctx.beginPath();
          current = bkt;
        }
        const x = px[i], y = py[i];
        if (x > hide[0] && x < hide[2] && y > hide[1] && y < hide[3]) continue;
        const s = sz[i];
        if (!s) continue;
        ctx.rect(x - s / 2, y - s / 2, s, s);
      }
      if (current >= 0) { ctx.fillStyle = styles[current]; ctx.fill(); }

      // the dots near the pointer give off light: a small soft halo around each one
      // (the dot itself keeps its size; the halo is light around it, added on top)
      const hs = dotPx * 3.4;
      for (let n = 0; n < nLit; n++) {
        const i = glowIdx[n], x = px[i], y = py[i];
        if (x > hide[0] && x < hide[2] && y > hide[1] && y < hide[3]) continue;
        ctx.globalAlpha = Math.min(1, Math.pow(glowAmt[n], 1.4) * 0.8);
        ctx.drawImage(halo, x - hs, y - hs, hs * 2, hs * 2);
      }
      ctx.globalAlpha = 1;
    }

    // animation loop, running only while the sphere is on screen and the tab is visible
    let running = false, onScreen = false, last = 0, raf = 0, slowT = 0, slowN = 0;
    function tick(now) {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0));   // the first frame's timestamp can be a hair before 'last'
      last = now;
      time += dt;
      // slow machine safeguard: if frames take too long after the first second, thin the dots out a little
      if (!thin && time > 1 && time < 4 && dt) { slowT += dt; slowN++; if (slowN === 90 && slowT / slowN > 1 / 40) thin = true; }
      if (!dragging) {
        // after a release: the flick's extra speed fades out, the tilt eases back,
        // and the globe settles into its normal steady spin
        spin += dt * (BASE_SPIN + spinVel);
        tilt = Math.max(-0.9, Math.min(1.5, tilt + tiltVel * dt));
        spinVel *= Math.exp(-dt * 1.6);
        tiltVel *= Math.exp(-dt * 2.5);
        tilt += (BASE_TILT - tilt) * (1 - Math.exp(-dt * 0.9));
      }
      orbit -= dt * 0.21;                          // ring turns the other way, slowed by the same amount as the globe
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
