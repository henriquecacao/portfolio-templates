/* =========================================================
   main.js — page behaviour for the Enjoy joy! one-pager
   - marquees, nav, scroll reveals
   - 3D cups (hero + builder) via Cup3D
   - "Monta o teu" builder: live price + live 3D preview
   - menu rendered from data, with filter tabs
   - loyalty stamps, newsletter, toast
   - PT / EN switch
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const eur = n => n.toFixed(2).replace('.', ',') + '€';
  let lang = 'pt';

  /* ---------------- data ---------------- */
  const PRICES = { size: { 250: 4.95, 350: 5.95, 500: 8.50 }, cupuacu: .5, extra: .6, included: 3 };

  // Menu items — edit here. `crop` picks which part of the overhead toppings photo the bowl shows.
  const MENU = [
    { id: 'classico', cat: 'bowl', price: 5.95, tags: ['Best-seller'], crop: '50% 50%', rot: 0,
      pt: ['Joy Clássico', 'Açaí puro, banana, morango e granola estaladiça. O que começou tudo.'],
      en: ['Joy Classic', 'Pure açaí, banana, strawberry and crunchy granola. The one that started it all.'] },
    { id: 'tropical', cat: 'bowl', price: 6.50, tags: ['Vegan'], crop: '30% 25%', rot: -20,
      pt: ['Tropical Joy', 'Manga, kiwi e coco ralado sobre açaí bem gelado. Sabe a férias.'],
      en: ['Tropical Joy', 'Mango, kiwi and shredded coconut over ice-cold açaí. Tastes like holidays.'] },
    { id: 'treino', cat: 'bowl', price: 6.90, tags: ['Proteico'], crop: '85% 75%', rot: 30,
      pt: ['Power Treino', 'Banana, pasta de amendoim e granola proteica. Para antes e depois do treino.'],
      en: ['Power Workout', 'Banana, peanut butter and protein granola. For before and after training.'] },
    { id: 'cupuacu', cat: 'copo', price: 7.20, tags: ['Novo'], crop: '90% 15%', rot: 60, cup: true,
      pt: ['Cupuaçu Supreme', 'Camadas de cupuaçu e açaí, morango e um fio de leite condensado.'],
      en: ['Cupuaçu Supreme', 'Layers of cupuaçu and açaí, strawberry and a drizzle of condensed milk.'] },
    { id: 'smoothie', cat: 'copo', price: 4.50, tags: ['Vegan'], smooth: true,
      pt: ['Smoothie Joy', 'Açaí batido com banana e leite de aveia. Para levar e beber a caminhar.'],
      en: ['Joy Smoothie', 'Açaí blended with banana and oat milk. Grab it and sip on the go.'] },
    { id: 'casa', cat: 'levar', price: 12.90, tags: ['1L'], tub: true,
      pt: ['Joy em Casa', 'Balde de 1 litro de açaí puro para o teu congelador. Toppings à parte.'],
      en: ['Joy at Home', 'A 1-litre tub of pure açaí for your freezer. Toppings on the side.'] }
  ];
  const TOP_NAMES = {
    pt: { morango: 'Morango', banana: 'Banana', kiwi: 'Kiwi', mirtilo: 'Mirtilos', granola: 'Granola', coco: 'Coco', leite: 'Leite condensado' },
    en: { morango: 'Strawberry', banana: 'Banana', kiwi: 'Kiwi', mirtilo: 'Blueberries', granola: 'Granola', coco: 'Coconut', leite: 'Condensed milk' }
  };
  const BASE_NAMES = { pt: { acai: 'Açaí puro', banana: 'Açaí + banana', cupuacu: 'Cupuaçu' }, en: { acai: 'Pure açaí', banana: 'Açaí + banana', cupuacu: 'Cupuaçu' } };

  /* ---------------- i18n (PT is the HTML default) ---------------- */
  const EN = {
    promo1: 'Same price, more açaí', promo2: 'Order online, pick up in store', promo3: 'Collect 9 stamps, the 10th is on us',
    nav1: 'Sizes', nav2: 'Build yours', nav3: 'Menu', nav4: 'Joy Club', nav5: 'Stores', order: 'Order',
    heroChip: 'Real açaí, fresh fruit', heroT1: 'the best', heroT2: 'also has', heroT3: 'the best price!',
    heroLead: 'Cups and bowls loaded with fresh fruit, crunchy granola and that purple you’ll want to share. You build it, we serve it.',
    heroCta1: 'Build your açaí', heroCta2: 'See the menu', fact1: 'sizes', fact2: 'toppings', fact3: 'starting at',
    badge: 'just an açaí to make me happy ✦ just an açaí to make me happy ✦', burst: 'fancy<br><b>açaí</b><br>today?', drag: 'drag to spin',
    sizesT1: 'The right', sizesT2: 'size for', sizesT3: 'every hunger!', sizesLead: 'Every size includes 3 toppings of your choice. Same price, more açaí — no tricks.',
    s1n: 'Joy Cup', s1d: 'The perfect afternoon snack — or post-gym treat.', s2n: 'Joy Cup Max', s2d: 'The pick of everyone who’s tried it. Layers of açaí, fruit and granola.',
    s3n: 'Joy Bowl', s3d: 'For sharing. Or not — no judgement here.', pick: 'Choose', fav: 'Fan favourite',
    bT1: 'Build your', bT2: 'perfect açaí!', bLead: 'Pick the size, the base and the toppings. Your cup updates in real time.',
    st1: 'Size', st2: 'Base', st3: 'Toppings', st3n: '3 included · extra +0,60€', b1: 'Pure açaí', b2: 'Açaí + banana', b3: 'Cupuaçu',
    t1: 'Strawberry', t2: 'Banana', t3: 'Kiwi', t4: 'Blueberries', t5: 'Granola', t6: 'Coconut', t7: 'Condensed milk',
    yours: 'Your Joy', add: 'Add to order', mT1: 'Chef’s', mT2: 'picks', f0: 'All', f1: 'Bowls', f2: 'Cups & smoothies', f3: 'Take home',
    kT: 'Did you<br>know?', kS1: 'Açaí is one of the', kS2: 'most energising', kS3: 'fruits of the Amazon!',
    kB: 'Besides being delicious, it’s naturally rich in antioxidants and good fats. Perfect for recharging — no permission needed.',
    k1t: 'Antioxidants', k1d: 'Anthocyanins give it that deep purple — and give your day a little boost.',
    k2t: 'Natural energy', k2d: 'Good fats and fresh fruit: energy that lasts all afternoon.',
    k3t: 'Fibre', k3d: 'Granola and whole fruit keep you full until dinner.',
    trK: 'Perfect for', trT1: 'before and after your', trT2: 'workout.', trC: 'See Power Workout',
    soT1: 'Give it a like!', soC: 'Follow us on Instagram', p1: 'just an açaí to make me happy', p2: 'you make<br>my mouth<br>water!',
    p4a: 'The taste', p4b: 'of Brazil', p5: 'same price,<br>more açaí',
    cardN: 'Joy Card', cardF: 'On the 10th, the açaí is on us.', cT1: 'Join the', cLead: 'Digital stamps, first dibs on new flavours and a free açaí on your birthday.', cBtn: 'Count me in',
    lT1: 'Find your', lT2: 'store', h1: 'Mon–Sat', h2: 'Sun', h3: 'Every day', dl: 'Also delivered via:',
    qT: 'Quick questions', q1: 'Does the açaí have added sugar?', a1: 'The pure açaí base doesn’t. Sweet toppings like condensed milk are optional — your call.',
    q2: 'Are there vegan options?', a2: 'Yes. Pure açaí with fruit, granola and coconut is 100% plant-based. Ask for the smoothie with oat milk.',
    q3: 'Do you cater for events?', a3: 'We do — parties, offices and weddings. Get in touch 48h ahead.',
    q4: 'Can I pay with MB Way?', a4: 'Of course. We take MB Way, card and cash in every store.',
    note: 'Unofficial website concept — portfolio piece by Henrique Roquete Cacao. Not affiliated with the Enjoy joy!® brand. Addresses and opening hours are sample content.'
  };
  const UI = {
    pt: { added: 'Adicionado ao pedido!', addedDish: n => `${n} adicionado ao pedido!`, okMail: 'Bem-vindo ao Joy Club! Vê o teu email.', badMail: 'Esse email não parece certo.', noTop: 'sem toppings' },
    en: { added: 'Added to your order!', addedDish: n => `${n} added to your order!`, okMail: 'Welcome to the Joy Club! Check your inbox.', badMail: 'That email doesn’t look right.', noTop: 'no toppings' }
  };
  const ptCache = new Map();
  function setLang(l) {
    lang = l;
    document.documentElement.lang = l === 'pt' ? 'pt-PT' : 'en';
    $$('[data-i18n]').forEach(el => {
      if (!ptCache.has(el)) ptCache.set(el, el.innerHTML);
      const k = el.dataset.i18n;
      el.innerHTML = l === 'en' && EN[k] ? EN[k] : ptCache.get(el);
    });
    $$('#langBtn span').forEach((s, i) => s.classList.toggle('is-on', (i === 0) === (l === 'pt')));
    $('#email').placeholder = l === 'pt' ? 'o.teu@email.pt' : 'your@email.com';
    renderMenu(); updateBuilder(false);
  }
  $('#langBtn').addEventListener('click', () => setLang(lang === 'pt' ? 'en' : 'pt'));

  /* ---------------- marquees: duplicate content for a seamless loop ---------------- */
  $$('.promo__track, .ticker__track').forEach(t => { t.innerHTML += t.innerHTML; });

  /* ---------------- nav ---------------- */
  const burger = $('#burger'), links = $('#navLinks');
  const toggleNav = open => { burger.setAttribute('aria-expanded', open); links.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : ''; };
  burger.addEventListener('click', () => toggleNav(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', links).forEach(a => a.addEventListener('click', () => toggleNav(false)));

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .12 });
  function observeReveals() { $$('.reveal:not(.is-in)').forEach(el => io.observe(el)); }
  observeReveals();

  /* ---------------- toast + cart ---------------- */
  let cart = 0, toastTimer;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); }
  function addToCart(msg) { cart++; const c = $('#cartCount'); c.textContent = cart; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); toast(msg); }

  /* ---------------- 3D cups ---------------- */
  function mountCup(canvas, opts) {
    let cup = null;
    try { cup = window.Cup3D && Cup3D.create(canvas, opts); } catch (err) { console.warn('3D cup unavailable:', err); }
    if (!cup) { // graceful fallback: the product photo itself
      canvas.classList.add('is-fallback');
      const f = document.createElement('div'); f.className = 'fallback-cup'; f.innerHTML = '<img src="assets/cup-front.webp" alt="">';
      canvas.parentNode.appendChild(f);
    }
    return cup;
  }
  if (window.Liquid) { try { Liquid.mount($('#liquid'), { pointer: true }); } catch (err) { console.warn('liquid bg unavailable:', err); } }
  const heroCup = mountCup($('#heroCup'), { startAngle: -.35 });
  const buildCup = mountCup($('#builderCup'), { startAngle: .25, zoom: 1.25 });
  const SIZE_SCALE = { 250: .84, 350: 1, 500: 1.14 };

  // toppings orbit (photo crops from the overhead shot; coconut is a CSS chip)
  const ORBIT = { kiwi: [14, 22], banana: [86, 20], morango: [92, 58], mirtilo: [8, 60], granola: [80, 88], coco: [20, 90], leite: [50, 6] };
  const orbit = $('#orbit');
  orbit.innerHTML = Object.entries(ORBIT).map(([k, [x, y]], i) =>
    `<div class="orbit__item" data-top="${k}" style="--x:${x}%;--y:${y}%;--d:${-i * .7}s">${k === 'coco' ? '<span></span>' : `<img src="assets/top-${k}.webp" alt="">`}</div>`).join('');

  /* ---------------- builder ---------------- */
  const form = $('#builderForm');
  function readBuilder() {
    const size = form.querySelector('[name=size]:checked').value;
    const base = form.querySelector('[name=base]:checked').value;
    const toppings = $$('[name=top]:checked', form).map(i => i.value);
    const price = PRICES.size[size] + (base === 'cupuacu' ? PRICES.cupuacu : 0) + Math.max(0, toppings.length - PRICES.included) * PRICES.extra;
    return { size, base, toppings, price };
  }
  let lastPrice = null;
  function updateBuilder(push = true) {
    const s = readBuilder();
    const names = s.toppings.map(t => TOP_NAMES[lang][t]).join(', ') || UI[lang].noTop;
    $('#sumDesc').textContent = `${s.size}ml · ${BASE_NAMES[lang][s.base]} · ${names}`;
    const p = $('#sumPrice'); p.textContent = eur(s.price);
    if (lastPrice !== null && lastPrice !== s.price) { p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash'); }
    lastPrice = s.price;
    if (push && buildCup) buildCup.set({ scale: SIZE_SCALE[s.size], base: s.base });
    $$('.orbit__item', orbit).forEach(el => el.classList.toggle('on', s.toppings.includes(el.dataset.top)));
  }
  form.addEventListener('change', e => { updateBuilder(); if (buildCup && e.target.name === 'top') buildCup.spin(.18); });
  $('#addBtn').addEventListener('click', () => addToCart(UI[lang].added));

  // "Escolher" on size cards → preselect in builder and jump there
  $$('.js-pick-size').forEach(b => b.addEventListener('click', () => {
    const r = form.querySelector(`[name=size][value="${b.dataset.size}"]`); r.checked = true; updateBuilder();
    $('#monta').scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------------- menu ---------------- */
  function dishArt(item) {
    if (item.smooth || item.cup) return `<img class="dish__cup" src="assets/cup-front.webp" alt="" loading="lazy">`;
    if (item.tub) return `<svg class="bowl" viewBox="0 0 200 160" aria-hidden="true"><path d="M48 46h104l-10 100H58z" fill="#2B0B45"/><rect x="42" y="30" width="116" height="22" rx="8" fill="#6A1FA8"/><rect x="62" y="80" width="76" height="34" rx="6" fill="#FFC72C"/><text x="100" y="104" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="22" fill="#2B0B45">1L</text></svg>`;
    return `<span class="dish__bowl" style="background-position:${item.crop};--r:${item.rot}deg"></span>`;
  }
  let filter = 'all';
  function renderMenu() {
    const grid = $('#menuGrid');
    grid.innerHTML = MENU.map(m => `
      <article class="dish reveal is-in${filter !== 'all' && m.cat !== filter ? ' is-hidden' : ''}">
        <div class="dish__art"><svg class="leafbg"><use href="#i-leaf"/></svg>${dishArt(m)}
          <div class="dish__tags">${m.tags.map(t => `<span>${t}</span>`).join('')}</div></div>
        <h3>${m[lang][0]}</h3><p>${m[lang][1]}</p>
        <div class="dish__foot"><span class="dish__price">${eur(m.price)}</span>
          <button class="dish__add" data-id="${m.id}" aria-label="${lang === 'pt' ? 'Adicionar' : 'Add'} ${m[lang][0]}">+</button></div>
      </article>`).join('');
  }
  $('#menuGrid').addEventListener('click', e => {
    const b = e.target.closest('.dish__add'); if (!b) return;
    const m = MENU.find(x => x.id === b.dataset.id); addToCart(UI[lang].addedDish(m[lang][0]));
  });
  $$('#menuTabs button').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    $$('#menuTabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    renderMenu();
  }));

  /* ---------------- loyalty stamps ---------------- */
  const stamps = $('#stamps');
  stamps.innerHTML = Array.from({ length: 10 }, (_, i) => i === 9 ? '<li class="gift">FREE</li>' : '<li></li>').join('');
  const stampIO = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    $$('li', stamps).slice(0, 7).forEach((li, i) => setTimeout(() => { li.classList.add('on'); li.innerHTML = '<svg><use href="#i-heart"/></svg>'; }, 180 * i));
    stampIO.disconnect();
  }, { threshold: .5 });
  stampIO.observe(stamps);

  /* ---------------- newsletter (front-end only) ---------------- */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#email'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
    inp.classList.toggle('is-bad', !ok);
    $('#newsMsg').textContent = ok ? UI[lang].okMail : UI[lang].badMail;
    if (ok) inp.value = '';
  });

  // first paint
  renderMenu();
  updateBuilder();
})();
