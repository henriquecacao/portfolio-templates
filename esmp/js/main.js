/* =========================================================
   ESMP case study
   1. The system's component (circles + rounded triangles) drawn in SVG,
      reused for the hero mark, the tile band and the nav arrows.
   2. Sign-style navigation that highlights the section on screen.
   3. Reveal-on-scroll and a lightbox for every image.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const C = { blue: '#0041F5', sun: '#F5C000', orange: '#FF7700' };

  /* ---------- 1. the component ----------
     A rounded triangle is a triangle with a thick stroke of the same colour
     and round joins, which softens the corners the way the original does. */
  const tri = (pts, fill, cls = '') =>
    `<polygon class="${cls}" points="${pts}" fill="${fill}" stroke="${fill}" stroke-width="16" stroke-linejoin="round"/>`;
  const dot = (cx, cy, r, fill, cls = '') => `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
  const component = (cls = '') => [
    tri('32,12 68,12 50,38', C.blue, cls),
    dot(15, 39, 14, C.orange, cls), dot(85, 39, 14, C.sun, cls),
    dot(15, 63, 14, C.sun, cls), dot(85, 63, 14, C.orange, cls),
    tri('32,88 68,88 50,62', C.blue, cls)
  ].join('');

  // hero mark (pieces pop in one after another, see .mark .p in CSS)
  $$('[data-mark]').forEach(el => { el.innerHTML = `<svg viewBox="0 0 100 100">${component('p')}</svg>`; });

  // tile band: the component repeated as a background image
  const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112">${component()}</svg>`;
  $$('[data-band]').forEach(el => { el.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(tile)}")`; });

  // arrows for the sign navigation: two circles trailing a rounded triangle
  const arrow = `<svg viewBox="0 0 100 60" width="22" height="14" aria-hidden="true">${dot(12, 30, 10, C.sun)}${dot(36, 30, 10, C.orange)}${tri('60,14 60,46 84,30', '#fff')}</svg>`;
  $$('[data-arrow]').forEach(el => { el.innerHTML = arrow; });

  /* ---------- 2. sign navigation ---------- */
  const links = $$('.signnav a');
  const byId = new Map(links.map(a => [a.hash.slice(1), a]));
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('on'));
      const a = byId.get(e.target.id);
      if (a) {
        a.classList.add('on');
        // on mobile the nav is a horizontal strip: keep the active item in view
        if (getComputedStyle(a.closest('ol')).display === 'flex') a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('.chapter').forEach(s => navIO.observe(s));

  /* ---------- 3a. reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- 3b. lightbox ---------- */
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
