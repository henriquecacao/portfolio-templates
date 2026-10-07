/* =========================================================
   Project Lumen case study
   1. Headlight: the hero is dark except where the light points
      (pointer on desktop; on touch it drifts by itself and follows your finger).
   2. HUD: "Light" meter = how much of the page you've explored;
      inventory slots unlock as you reach each chapter.
   3. Trailer taglines light up in sync with the video.
   4. Reveal-on-scroll and a lightbox.
   Respects prefers-reduced-motion.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. headlight ---------- */
  const hero = $('#hero'), dark = $('#dark');
  let tx = innerWidth * .5, ty = innerHeight * .55, x = tx, y = ty, manual = 0;
  const radius = () => Math.max(220, Math.min(380, innerWidth * .28));
  dark.style.setProperty('--r', radius() + 'px');
  addEventListener('resize', () => dark.style.setProperty('--r', radius() + 'px'));
  if (reduce) {
    dark.style.setProperty('--x', '50%'); dark.style.setProperty('--y', '55%');
  } else {
    const aim = (cx, cy) => { const r = hero.getBoundingClientRect(); tx = cx - r.left; ty = cy - r.top; manual = performance.now(); };
    hero.addEventListener('pointermove', e => aim(e.clientX, e.clientY));
    hero.addEventListener('touchmove', e => aim(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    const tick = t => {
      // with no input for 2.5 s the light wanders on its own, sweeping across the robot
      if (t - manual > 2500) {
        tx = hero.clientWidth * (.5 + .22 * Math.sin(t / 2100));
        ty = hero.clientHeight * (.55 + .12 * Math.sin(t / 1300));
      }
      x += (tx - x) * .12; y += (ty - y) * .12;
      dark.style.setProperty('--x', x + 'px'); dark.style.setProperty('--y', y + 'px');
      // only animate while the hero is on screen
      if (scrollY < innerHeight * 1.2) requestAnimationFrame(tick); else idle = true;
    };
    let idle = false;
    requestAnimationFrame(tick);
    addEventListener('scroll', () => { if (idle && scrollY < innerHeight * 1.2) { idle = false; requestAnimationFrame(tick); } }, { passive: true });
  }

  /* ---------- 2. HUD ---------- */
  const light = $('#light'), pct = $('#light-pct');
  const meter = () => {
    const p = Math.min(1, Math.max(0, scrollY / (document.documentElement.scrollHeight - innerHeight)));
    light.style.setProperty('--v', p.toFixed(3)); pct.textContent = Math.round(p * 100) + '%';
  };
  addEventListener('scroll', meter, { passive: true }); meter();

  const slots = $$('#inv span');
  const unlockIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) slots[+e.target.dataset.unlock]?.classList.add('got');
  }), { rootMargin: '0px 0px -50% 0px' });
  $$('[data-unlock]').forEach(s => unlockIO.observe(s));

  /* ---------- 3. trailer taglines ---------- */
  const lines = $$('#lines li'), video = $('video');
  const CUES = [0, 4.5, 14.5];                    // seconds where each line appears in the trailer
  video.addEventListener('timeupdate', () => lines.forEach((li, k) => li.classList.toggle('on', video.currentTime >= CUES[k])));
  const lineIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || !video.paused) return;
    lines.forEach((li, k) => setTimeout(() => li.classList.add('on'), reduce ? 0 : 500 + k * 700));
    lineIO.disconnect();
  }), { threshold: .6 });
  lineIO.observe($('#lines'));

  /* ---------- 4a. reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- 4b. lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  const items = $$('[data-full]').map(b => ({ src: b.dataset.full, alt: $('img', b).alt, cap: b.closest('figure')?.querySelector('figcaption')?.textContent || '' }));
  let cur = 0;
  const open = k => {
    cur = (k + items.length) % items.length;
    lbImg.src = items[cur].src; lbImg.alt = items[cur].alt; lbCap.textContent = items[cur].cap;
    if (!lb.open) lb.showModal();
  };
  $$('[data-full]').forEach((b, k) => b.addEventListener('click', () => open(k)));
  lb.addEventListener('click', e => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb) lb.close();
    if (act === 'prev') open(cur - 1);
    if (act === 'next') open(cur + 1);
  });
  addEventListener('keydown', e => {
    if (!lb.open) return;
    if (e.key === 'ArrowLeft') open(cur - 1);
    if (e.key === 'ArrowRight') open(cur + 1);
  });
})();
