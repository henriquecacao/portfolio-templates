/* =========================================================
   Clínica Veterinária de Cascais · Dr. Marques Vieira
   Concept one-pager. Vanilla JS, no dependencies.
   Edit the data blocks at the top; the page builds itself from them.
   All visible text lives in js/i18n.js (PT + EN).
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     1. CLINIC DATA
     Address: public listings. Phone: listings disagree
     (21 482 7410 vs 210 446 393), so confirm it. Hours are SAMPLE values.
     --------------------------------------------------------- */
  const CLINIC = {
    address: 'Av. 25 de Abril, 1010 · 2750-512 Cascais',
    phone: '21 482 7410',
    maps: 'Clínica Veterinária de Cascais Dr. Marques Vieira, Av. 25 de Abril 1010, 2750-512 Cascais',
    // 0 = Sunday … 6 = Saturday; each day is a list of [open, close]
    hours: [
      [],
      [['09:30', '13:00'], ['14:30', '20:00']],
      [['09:30', '13:00'], ['14:30', '20:00']],
      [['09:30', '13:00'], ['14:30', '20:00']],
      [['09:30', '13:00'], ['14:30', '20:00']],
      [['09:30', '13:00'], ['14:30', '20:00']],
      [['09:30', '13:00']]
    ],
    slotMinutes: 30
  };

  /* Line icons drawn on a 32×32 grid (stroke only, coloured by CSS).
     Service names/texts come from i18n keys "svc.<icon>". */
  const ICON = {
    consulta: '<path d="M8 4v8a6 6 0 0 0 12 0V4M14 18v3a6 6 0 0 0 12 0v-2"/><circle cx="26" cy="16" r="3"/>',
    vacina: '<path d="M21 4l7 7M24.5 7.5L11 21H7v-4L20.5 3.5M7 25l-3 3M16 8l4 4M12.5 11.5l2.5 2.5M9 15l2.5 2.5"/>',
    cirurgia: '<circle cx="16" cy="16" r="11"/><path d="M16 10v12M10 16h12"/>',
    analises: '<path d="M11 4h10M13 4v19a3 3 0 0 0 6 0V4M13 14h6"/>',
    imagem: '<rect x="4" y="6" width="24" height="16" rx="3"/><path d="M8 15h4l2-4 3 8 2-4h5M12 27h8M16 22v5"/>',
    dentes: '<path d="M10 5c-4 0-6 3-5 8 1 4 2 6 3 12 1 3 3 3 4 0l1-5h6l1 5c1 3 3 3 4 0 1-6 2-8 3-12 1-5-1-8-5-8-2 0-4 1-6 1s-4-1-6-1z"/>',
    chip: '<rect x="9" y="9" width="14" height="14" rx="2"/><path d="M13 4v5M19 4v5M13 23v5M19 23v5M4 13h5M4 19h5M23 13h5M23 19h5"/>',
    cama: '<path d="M4 7v20M28 27v-7H4M14 20v-6h9a5 5 0 0 1 5 5v1"/><circle cx="9" cy="16" r="2.5"/>'
  };
  const SERVICES = [
    { icon: 'consulta', tone: 'cyan' }, { icon: 'vacina', tone: 'mag' },
    { icon: 'cirurgia', tone: 'yel' }, { icon: 'analises', tone: 'cyan' },
    { icon: 'imagem', tone: 'mag' }, { icon: 'dentes', tone: 'yel' },
    { icon: 'chip', tone: 'cyan' }, { icon: 'cama', tone: 'mag' }
  ];

  /* Life stages by age (years). Dogs depend on size: larger dogs age faster. */
  const SENIOR_FROM = { small: 10, medium: 8, large: 7, cat: 11 };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toHHMM = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  // Clinic time is always Lisbon time, wherever the visitor is
  const lisbonNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));

  /* ---------------------------------------------------------
     2. Language: PT default, remembered per visitor
     --------------------------------------------------------- */
  const STORE_KEY = 'cvc-lang';
  let lang = 'pt';
  try { const saved = localStorage.getItem(STORE_KEY); if (saved === 'en' || saved === 'pt') lang = saved; } catch (e) { /* storage blocked: stay PT */ }
  const t = (key, ...args) => {
    const v = (window.I18N[lang] || {})[key] ?? window.I18N.pt[key];
    return typeof v === 'function' ? v(...args) : v;
  };
  const renderers = [];                       // dynamic parts re-render on language change
  const onLang = fn => { renderers.push(fn); fn(); };

  function applyStatic() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-PT';
    $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('[data-i18n-content]').forEach(el => el.setAttribute('content', t(el.dataset.i18nContent)));
    $$('[data-i18n-label]').forEach(el => {
      el.dataset.label = t(el.dataset.i18nLabel);
      const b = $('.ph__label b', el); if (b) b.textContent = el.dataset.label;
      const img = $('img', el); if (img) img.alt = el.dataset.label;
    });
    $$('[data-lang-opt]').forEach(s => s.classList.toggle('is-on', s.dataset.langOpt === lang));
  }
  function setLang(next) {
    lang = next;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* ignore */ }
    applyStatic();
    renderers.forEach(fn => fn());
  }
  $('[data-lang-toggle]').addEventListener('click', () => setLang(lang === 'pt' ? 'en' : 'pt'));

  /* ---------------------------------------------------------
     3. Contact hooks
     --------------------------------------------------------- */
  $$('[data-phone]').forEach(el => (el.textContent = CLINIC.phone));
  $$('[data-tel]').forEach(el => (el.href = 'tel:+351' + CLINIC.phone.replace(/\D/g, '')));
  $$('[data-address]').forEach(el => (el.textContent = CLINIC.address));
  $$('[data-maps]').forEach(el => (el.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CLINIC.maps)));

  /* ---------------------------------------------------------
     4. Photo slots: <figure class="ph" data-photo="x.jpg" data-label="…">
     Tries .jpg/.webp/.png in assets/photos/; otherwise a labelled placeholder stays.
     --------------------------------------------------------- */
  const PAW = '<svg class="ph__icon" viewBox="0 0 48 48" fill="#222"><ellipse cx="24" cy="32" rx="10" ry="8"/><circle cx="11" cy="20" r="4.5"/><circle cx="19" cy="12" r="4.5"/><circle cx="29" cy="12" r="4.5"/><circle cx="37" cy="20" r="4.5"/></svg>';
  $$('.ph[data-photo]').forEach(fig => {
    const file = fig.dataset.photo;
    if (fig.dataset.ratio) fig.style.setProperty('--ratio', fig.dataset.ratio);
    fig.innerHTML = `${PAW}<figcaption class="ph__label"><b>${fig.dataset.label}</b><small>assets/photos/${file}</small></figcaption>`;
    const base = file.replace(/\.(jpe?g|png|webp)$/i, '');
    const tries = [...new Set([file, base + '.webp', base + '.jpg', base + '.png'])];
    const img = new Image(); let i = 0;
    img.decoding = 'async';
    img.onload = () => { img.alt = fig.dataset.label || ''; fig.prepend(img); fig.classList.add('is-loaded'); };
    img.onerror = () => { if (++i < tries.length) img.src = 'assets/photos/' + tries[i]; };
    img.src = 'assets/photos/' + tries[0];
  });

  // Translate the static page now that photo labels exist
  applyStatic();

  /* ---------------------------------------------------------
     5. Open / closed status + hours list
     --------------------------------------------------------- */
  const fmtDay = ranges => ranges.length ? ranges.map(r => r.join('–')).join(' · ') : t('hours.closed');
  function renderStatus() {
    const days = t('days');
    const now = lisbonNow(), day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    const today = CLINIC.hours[day];
    const open = today.find(([a, b]) => mins >= toMin(a) && mins < toMin(b));
    let text;
    if (open) text = t('status.open', open[1]);
    else {
      const later = today.find(([a]) => toMin(a) > mins);
      if (later) text = t('status.opensAt', later[0]);
      else {
        let d = (day + 1) % 7, k = 1;
        while (!CLINIC.hours[d].length && k < 7) { d = (d + 1) % 7; k++; }
        text = k === 1 ? t('status.tomorrow', CLINIC.hours[d][0][0]) : t('status.opensDay', days[d], CLINIC.hours[d][0][0]);
      }
    }
    $$('[data-status]').forEach(el => (el.textContent = text));
    $$('[data-status-dot]').forEach(el => el.classList.toggle('is-open', !!open));
    $$('[data-today]').forEach(el => (el.textContent = fmtDay(today)));
    const dl = $('[data-hours]');
    if (dl) dl.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d =>
      `<div class="${d === day ? 'is-today' : ''}"><dt data-today-label="${t('hours.today')}">${days[d]}</dt><dd>${fmtDay(CLINIC.hours[d])}</dd></div>`).join('');
  }
  onLang(renderStatus);
  setInterval(renderStatus, 60_000);

  /* ---------------------------------------------------------
     6. Services grid
     --------------------------------------------------------- */
  const svc = $('[data-services]');
  let svcFirst = true;               // later re-renders (language switch) show cards immediately
  onLang(() => {
    if (!svc) return;
    svc.innerHTML = SERVICES.map(s => {
      const [name, text] = t('svc.' + s.icon);
      return `<li data-reveal class="${svcFirst ? '' : 'is-in'}"><article class="svc__card" data-tone="${s.tone}">
        <span class="svc__icon" aria-hidden="true"><svg viewBox="0 0 32 32">${ICON[s.icon]}</svg></span>
        <h3>${name}</h3><p>${text}</p>
      </article></li>`;
    }).join('');
    svcFirst = false;
  });

  /* ---------------------------------------------------------
     7. Age pickers: the animal's own age (1–40) + life stage.
     For dogs the size changes when "senior" starts.
     --------------------------------------------------------- */
  $$('[data-age]').forEach(box => {
    const input = $('[data-age-input]', box), out = $('[data-age-out]', box);
    const kind = box.dataset.age;
    const update = () => {
      const y = +input.value;
      const size = kind === 'cat' ? 'cat' : $('input[name="porte"]:checked', box).value;
      const stage = y <= 1 ? 'young' : y >= SENIOR_FROM[size] ? 'senior' : 'adult';
      out.innerHTML = `${t('age.years', y)}<small>${t('stage.' + stage)}</small>`;
      input.setAttribute('aria-valuetext', t('age.years', y));
      input.style.setProperty('--p', ((y - input.min) / (input.max - input.min)) * 100 + '%');
    };
    box.addEventListener('input', update);
    onLang(update);
  });

  /* ---------------------------------------------------------
     8. Photo strip arrows
     --------------------------------------------------------- */
  const strip = $('[data-strip]');
  if (strip) {
    const step = dir => strip.scrollBy({ left: dir * (strip.firstElementChild.offsetWidth + 18), behavior: reduced ? 'auto' : 'smooth' });
    $('[data-strip-prev]').addEventListener('click', () => step(-1));
    $('[data-strip-next]').addEventListener('click', () => step(1));
  }

  /* ---------------------------------------------------------
     9. Booking wizard
     --------------------------------------------------------- */
  const wiz = $('[data-wiz]');
  if (wiz) {
    const steps = $$('[data-step]', wiz), dots = $$('[data-steps] li');
    const back = $('[data-back]', wiz), next = $('[data-next]', wiz), err = $('[data-err]', wiz);
    const daysEl = $('[data-days]', wiz), slotsEl = $('[data-slots]', wiz);
    let cur = 0, dayIdx = 0, errIdx = -1, done = false;

    // Next 6 days the clinic is open (today included if slots remain)
    const now = lisbonNow();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const openDays = [];
    for (let i = 0; openDays.length < 6 && i < 21; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      const slots = [];
      CLINIC.hours[d.getDay()].forEach(([a, b]) => {
        for (let m = toMin(a); m + CLINIC.slotMinutes <= toMin(b); m += CLINIC.slotMinutes) {
          if (i === 0 && m <= nowMin + 60) continue;
          slots.push(m);
        }
      });
      if (slots.length) openDays.push({ d, slots });
    }
    // Pretend some slots are booked: a stable pseudo-random pattern per date
    const taken = (d, m) => ((d.getDate() * 31 + m / 30 * 7) % 5) === 0;
    const dayLong = d => d.toLocaleDateString(t('locale'), { weekday: 'long', day: 'numeric', month: 'long' });

    const renderDays = () => {
      daysEl.innerHTML = openDays.map((o, i) => `
        <button type="button" class="day" role="radio" aria-checked="${i === dayIdx}" data-day="${i}">
          <span>${t('days')[o.d.getDay()].slice(0, 3)}</span><b>${o.d.getDate()}</b>
          <span>${o.d.toLocaleDateString(t('locale'), { month: 'short' }).replace('.', '')}</span>
        </button>`).join('');
    };
    const renderSlots = () => {
      const o = openDays[dayIdx]; if (!o) return;
      slotsEl.innerHTML = o.slots.map(m => {
        const hhmm = toHHMM(m), isTaken = taken(o.d, m);
        return `<button type="button" class="slot" role="radio" aria-checked="${wiz.hora.value === hhmm}" data-m="${m}" ${isTaken ? `disabled aria-label="${hhmm} ${t('wiz.taken')}"` : ''}>${hhmm}</button>`;
      }).join('');
      wiz.dia.value = dayLong(o.d);
    };
    const pickDay = i => { dayIdx = i; wiz.hora.value = ''; renderDays(); renderSlots(); };
    daysEl.addEventListener('click', e => { const b = e.target.closest('.day'); if (b) pickDay(+b.dataset.day); });
    slotsEl.addEventListener('click', e => {
      const b = e.target.closest('.slot'); if (!b || b.disabled) return;
      $$('.slot', slotsEl).forEach(x => x.setAttribute('aria-checked', String(x === b)));
      wiz.hora.value = b.textContent; err.textContent = ''; errIdx = -1;
    });

    const valid = i => {
      let ok = true;
      $$('input', steps[i]).forEach(f => {
        if (f.type === 'radio') { if (f.required && !wiz.querySelector(`input[name="${f.name}"]:checked`)) ok = false; return; }
        const bad = !f.checkValidity();
        f.closest('.input')?.classList.toggle('is-bad', bad);
        if (bad) ok = false;
      });
      if (i === 2 && (!wiz.dia.value || !wiz.hora.value)) ok = false;
      return ok;
    };
    const summary = () => {
      const d = Object.fromEntries(new FormData(wiz));
      return t('wiz.summary', {
        reason: t('reason.' + d.motivo), pet: d.pet, species: t('pet.' + d.especie).toLowerCase(),
        day: dayLong(openDays[dayIdx].d), time: d.hora, tel: d.tel
      });
    };
    const renderBar = () => {
      next.textContent = cur === steps.length - 1 ? t('wiz.submit') : t('wiz.next');
      err.textContent = errIdx >= 0 ? t('wiz.err')[errIdx] : '';
      if (done) $('[data-summary]', wiz).textContent = summary();
    };
    const show = i => {
      cur = i; errIdx = -1;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      dots.forEach((d, k) => { d.classList.toggle('is-on', k === i); d.classList.toggle('is-done', k < i); });
      back.disabled = i === 0;
      renderBar();
      const first = $('input:not([type=hidden]), button', steps[i]);
      if (first && wiz.getBoundingClientRect().top < innerHeight) first.focus({ preventScroll: true });
    };
    next.addEventListener('click', () => {
      if (!valid(cur)) { errIdx = cur; renderBar(); return; }
      if (cur < steps.length - 1) return show(cur + 1);
      done = true;
      steps.forEach(s => s.classList.remove('is-on'));
      dots.forEach(d => { d.classList.remove('is-on'); d.classList.add('is-done'); });
      $('[data-done]', wiz).hidden = false; wiz.classList.add('is-done');
      renderBar();
    });
    back.addEventListener('click', () => cur > 0 && show(cur - 1));
    wiz.addEventListener('input', e => { e.target.closest('.input')?.classList.remove('is-bad'); errIdx = -1; err.textContent = ''; });
    wiz.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); next.click(); } });
    $('[data-restart]', wiz).addEventListener('click', () => {
      wiz.reset(); done = false; $('[data-done]', wiz).hidden = true; wiz.classList.remove('is-done');
      pickDay(0); show(0);
    });

    onLang(() => { renderDays(); renderSlots(); renderBar(); });
  }

  /* ---------------------------------------------------------
     10. Map: load only when near the viewport
     --------------------------------------------------------- */
  const map = $('[data-map]');
  if (map) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      map.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(CLINIC.maps) + '&z=16&output=embed';
      io.disconnect();
    }, { rootMargin: '400px' });
    io.observe(map);
  }

  /* ---------------------------------------------------------
     11. Header, mobile menu, call button
     --------------------------------------------------------- */
  const head = $('[data-head]'), menu = $('[data-menu]'), burger = $('[data-burger]');
  const setMenu = o => { menu.classList.toggle('is-open', o); burger.setAttribute('aria-expanded', String(o)); burger.setAttribute('aria-label', t(o ? 'nav.close' : 'nav.open')); };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu.addEventListener('click', e => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));
  onLang(() => setMenu(menu.classList.contains('is-open')));
  const fab = $('.fab'), hero = $('.hero');
  const onScroll = () => {
    head.classList.toggle('is-scrolled', scrollY > 10);
    fab.classList.toggle('is-on', hero.getBoundingClientRect().bottom < 0);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------------------------------------------------------
     12. Reveal on scroll
     --------------------------------------------------------- */
  $$('.section__head, .pet__in, .clinic__copy, .contact__info').forEach(el => el.setAttribute('data-reveal', ''));
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in'); io.unobserve(en.target);
  }), { threshold: .12 });
  $$('[data-reveal]').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
    reduced ? el.classList.add('is-in') : io.observe(el);
  });
})();
