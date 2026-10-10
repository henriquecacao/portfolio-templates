/* =========================================================
   main.js: wires the page together.
   Sections:
     1. flavour state  (one flavour at a time recolours the whole page)
     2. hero           (3D can, arcs, hold-to-crack)
     3. lineup         (pinned horizontal scroll on desktop, swipe on mobile)
     4. scenes         (tabs + generative canvas)
     5. events         (filters, live countdown, reminders)
     6. join form      (front end only: nothing is sent)
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {                                     // localStorage can throw (private mode etc.)
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
  };
  const F = window.FLAVOURS;

  /* ---------------- 1. FLAVOUR STATE ---------------- */
  let labels = F.map(f => drawLabel(f, document.createElement('canvas')));
  let current = 0;

  const can = new Can3D($('#can'), { interactive: true });
  if (can.failed) document.documentElement.classList.add('no-webgl');

  function setFlavour(i, { source = 'hero' } = {}) {
    if (i === current && source !== 'init') return;
    current = i;
    const f = F[i], root = document.documentElement.style;
    root.setProperty('--accent', f.accent);
    root.setProperty('--accent-ink', f.ink);
    can.setFlavour(labels[i], f.accent, source !== 'init');
    Bolts.color = f.accent;
    $('#flavour-name').textContent = f.name;
    $('#flavour-note').textContent = f.short;
    $$('.flavour').forEach((b, k) => { b.setAttribute('aria-checked', k === i); b.tabIndex = k === i ? 0 : -1; });
    if (source !== 'init') glitch();
  }

  // flavour picker: a radiogroup of little can-shaped swatches
  const picker = $('.flavours');
  F.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'flavour'; b.type = 'button';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-label', f.name);
    b.style.setProperty('--base', f.label.base); b.style.setProperty('--stripe', f.label.stripe);
    b.addEventListener('click', () => setFlavour(i));
    picker.append(b);
  });
  picker.addEventListener('keydown', e => {                       // arrow keys move within the group
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const n = (current + d + F.length) % F.length;
    setFlavour(n); picker.children[n].focus();
  });

  // headline glitch: an RGB-split jolt whenever the flavour changes or a can is cracked
  const title = $('#hero-title');
  function glitch() {
    if (reduced) return;
    title.classList.remove('is-glitching'); void title.offsetWidth; title.classList.add('is-glitching');
  }

  /* ---------------- 2. HERO ---------------- */
  const stage = $('#stage'), boltCv = $('#bolts');
  Bolts.init(boltCv, () => {
    // the can's on-screen box, relative to the arcs canvas (matches the camera in can3d.js)
    const s = stage.getBoundingClientRect(), b = boltCv.getBoundingClientRect();
    const hpx = s.height * .74, wpx = Math.min(s.width * .9, hpx * .4);
    return { x: s.left - b.left + s.width / 2, y: s.top - b.top + s.height / 2, w: wpx, h: hpx };
  });

  // hold-to-crack: charge fills over ~1.4 s, letting go early drains it
  const btn = $('#crack'), fill = $('#crack-fill'), lbl = $('#crack-label'), flash = $('#flash');
  const RING = 2 * Math.PI * 28;
  fill.style.strokeDasharray = RING;
  let holding = false, charge = 0, cooling = 0;
  let cracked = store.get('cracked', 0);
  const showCount = () => $('#crack-count').textContent = cracked ? `You've cracked ${cracked} so far.` : '';
  showCount();

  const startHold = e => { if (cooling > 0) return; holding = true; btn.classList.add('is-holding'); if (e) e.preventDefault(); };
  const endHold = () => { holding = false; btn.classList.remove('is-holding'); };
  btn.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, endHold));
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) startHold(e); });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') endHold(); });
  btn.addEventListener('contextmenu', e => e.preventDefault());    // long-press on mobile

  function crack() {
    holding = false; charge = 0; cooling = 1.1;
    btn.classList.remove('is-holding');
    cracked++; store.set('cracked', cracked); showCount();
    lbl.textContent = 'Cracked';
    setTimeout(() => lbl.textContent = 'Hold to crack', 1400);
    Bolts.burst(); can.pop(); glitch();
    flash.classList.remove('is-on'); void flash.offsetWidth; flash.classList.add('is-on');
    const hero = $('.hero');
    if (!reduced) { hero.classList.remove('shake'); void hero.offsetWidth; hero.classList.add('shake'); }
    if (navigator.vibrate) navigator.vibrate(60);
  }

  // only animate the hero while it's on screen
  let heroVisible = true;
  new IntersectionObserver(([e]) => heroVisible = e.isIntersecting).observe($('.hero'));

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (cooling > 0) cooling -= dt;
    charge = holding ? Math.min(1, charge + dt / 1.4) : Math.max(0, charge - dt * 1.6);
    if (charge >= 1) crack();
    fill.style.strokeDashoffset = RING * (1 - charge);
    btn.style.setProperty('--charge', charge.toFixed(3));
    if (heroVisible) {
      can.charge = charge; Bolts.charge = charge;
      can.resize(); can.step(dt);
      Bolts.step(dt, now);
    }
    sceneFrame(now / 1000);
    requestAnimationFrame(frame);
  }

  addEventListener('resize', () => { Bolts.resize(); sizeScene(); layoutLineup(); });

  /* ---------------- 3. LINEUP ---------------- */
  const track = $('#lineup-track'), lineup = $('#lineup'), bar = $('#lineup-bar');
  F.forEach((f, i) => {
    const a = document.createElement('article');
    a.className = 'panel';
    a.style.setProperty('--p-accent', f.accent); a.style.setProperty('--p-ink', f.ink);
    a.innerHTML = `
      <div class="panel__can"><img alt="Concept can of ${f.name}" width="420" height="640" /></div>
      <div class="panel__text">
        <p class="panel__tag">${f.sugar}, 500 ml</p>
        <h3 class="panel__name">${f.name}</h3>
        <p class="panel__notes">${f.notes}</p>
        <button class="btn btn--ghost" type="button">Spin this one</button>
      </div>`;
    $('button', a).addEventListener('click', () => { setFlavour(i); $('.hero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });
    track.append(a);
  });
  const panels = $$('.panel', track);

  function renderSnapshots() {
    panels.forEach((p, i) => { const url = Can3D.snapshot(labels[i], F[i].accent, 420, 640, -.18); if (url) $('img', p).src = url; });
  }

  // Desktop: the section is as tall as the track is wide; scrolling down slides the track left.
  const pinned = () => matchMedia('(min-width: 900px)').matches && !reduced;
  // how far the track must slide so the last panel ends one gutter from the right edge
  const slide = () => { const l = panels[panels.length - 1]; return Math.max(0, l.offsetLeft + l.offsetWidth + panels[0].offsetLeft - innerWidth); };
  function layoutLineup() {
    if (pinned()) {
      const dist = slide();
      lineup.style.height = `${innerHeight + dist}px`;
      lineup.classList.add('is-pinned');
    } else {
      lineup.style.height = ''; track.style.transform = ''; lineup.classList.remove('is-pinned');
    }
    onScroll();
  }
  function onScroll() {
    if (!pinned()) return;
    const r = lineup.getBoundingClientRect();
    const dist = slide();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    bar.style.transform = `scaleX(${p})`;
    if (r.top < innerHeight * .5 && r.bottom > innerHeight * .5) {
      setFlavour(Math.min(F.length - 1, Math.round(p * (F.length - 1))), { source: 'lineup' });
    }
  }
  addEventListener('scroll', onScroll, { passive: true });

  // Mobile: native horizontal swipe; the most visible panel sets the colour
  const panelIO = new IntersectionObserver(es => {
    if (pinned()) return;
    es.forEach(e => { if (e.intersectionRatio > .6) setFlavour(panels.indexOf(e.target), { source: 'lineup' }); });
  }, { root: track, threshold: [.6] });
  panels.forEach(p => panelIO.observe(p));
  track.addEventListener('scroll', () => {
    if (pinned()) return;
    bar.style.transform = `scaleX(${track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth)})`;
  }, { passive: true });

  /* ---------------- 4. SCENES ---------------- */
  const S = window.SCENES, list = $('#scenes'), sCv = $('#scene-canvas'), sg = sCv.getContext('2d');
  let scene = 0, sceneVisible = false, sw = 0, sh = 0;
  S.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button role="tab" class="scene-tab" id="tab-${s.id}" aria-controls="scene-view">${s.name}</button>`;
    const b = $('button', li);
    b.addEventListener('click', () => pickScene(i));
    b.addEventListener('pointerenter', () => matchMedia('(hover: hover)').matches && pickScene(i));
    list.append(li);
  });
  const tabs = $$('.scene-tab', list);
  list.addEventListener('keydown', e => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!d) return; e.preventDefault();
    const n = (scene + d + S.length) % S.length; pickScene(n); tabs[n].focus();
  });
  function pickScene(i) {
    scene = i;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
    $('#scene-view').setAttribute('aria-labelledby', tabs[i].id);
    $('#scene-title').textContent = S[i].title;
    $('#scene-body').textContent = S[i].body;
    if (reduced) drawScene(2);
  }
  function sizeScene() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    sw = sCv.clientWidth; sh = sCv.clientHeight;
    sCv.width = sw * dpr; sCv.height = sh * dpr; sg.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduced) drawScene(2);
  }
  function drawScene(t) {
    sg.clearRect(0, 0, sw, sh);
    sg.save(); S[scene].draw(sg, sw, sh, t, getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#95D600'); sg.restore();
  }
  function sceneFrame(t) { if (sceneVisible && !reduced) drawScene(t); }
  new IntersectionObserver(([e]) => sceneVisible = e.isIntersecting).observe(sCv);

  /* ---------------- 5. EVENTS (sample data: invented for the concept) ---------------- */
  const EVENTS = [
    { date: '2026-10-24T21:00', name: 'Night Shift Street Jam', city: 'Lisbon', scene: 'Skate' },
    { date: '2026-11-07T07:30', name: 'Coastline Dawn Session', city: 'Ericeira', scene: 'Surf' },
    { date: '2026-11-21T10:00', name: 'Serra Trails Open', city: 'Sintra', scene: 'BMX' },
    { date: '2026-12-05T19:00', name: 'Arena Cross Night', city: 'Madrid', scene: 'Moto' },
    { date: '2026-12-12T18:00', name: 'Ranked Till Sunrise LAN', city: 'Porto', scene: 'Gaming' },
    { date: '2027-01-16T09:00', name: 'First Chair Rail Jam', city: 'Sierra Nevada', scene: 'Snow' },
    { date: '2027-02-06T22:00', name: 'Back of the Van Tour', city: 'Lisbon', scene: 'Music' },
    { date: '2027-03-13T10:00', name: 'Paddock Open Day', city: 'Portimão', scene: 'Moto' }
  ].map(e => ({ ...e, when: new Date(e.date) }));

  const reminders = new Set(store.get('reminders', []));
  let filter = 'All';
  const filters = $('#filters');
  ['All', ...S.map(s => s.name)].forEach(name => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = name;
    b.setAttribute('aria-pressed', name === filter);
    b.addEventListener('click', () => { filter = name; $$('.chip', filters).forEach(c => c.setAttribute('aria-pressed', c === b)); renderEvents(); });
    filters.append(b);
  });

  const fmtDay = new Intl.DateTimeFormat('en-GB', { day: '2-digit' });
  const fmtMon = new Intl.DateTimeFormat('en-GB', { month: 'short' });
  const fmtTime = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  function renderEvents() {
    const ol = $('#tickets'); ol.innerHTML = '';
    const shown = EVENTS.filter(e => filter === 'All' || e.scene === filter);
    $('#tickets-empty').hidden = shown.length > 0;
    shown.forEach(e => {
      const id = e.date + e.name, on = reminders.has(id), past = e.when < new Date();
      const li = document.createElement('li');
      li.className = 'ticket' + (past ? ' is-past' : '');
      li.innerHTML = `
        <time class="ticket__date" datetime="${e.date}"><b>${fmtDay.format(e.when)}</b>${fmtMon.format(e.when)}</time>
        <div class="ticket__main">
          <h3 class="ticket__name">${e.name}</h3>
          <p class="ticket__meta">${e.city}, ${fmtTime.format(e.when)}</p>
        </div>
        <span class="ticket__scene">${e.scene}</span>
        <button class="ticket__btn" type="button" aria-pressed="${on}">${on ? 'Reminder set' : 'Remind me'}</button>`;
      $('.ticket__btn', li).addEventListener('click', ev => {
        const b = ev.currentTarget;
        reminders.has(id) ? reminders.delete(id) : reminders.add(id);
        store.set('reminders', [...reminders]);
        const set = reminders.has(id);
        b.setAttribute('aria-pressed', set); b.textContent = set ? 'Reminder set' : 'Remind me';
      });
      ol.append(li);
    });
  }

  function tick() {
    const now = new Date(), next = EVENTS.find(e => e.when > now);
    if (!next) { $('.countdown').hidden = true; return; }
    $('#next-name').textContent = `${next.name}, ${next.city}`;
    let s = Math.max(0, Math.floor((next.when - now) / 1000));
    const pad = n => String(n).padStart(2, '0');
    $('#cd-d').textContent = pad(Math.floor(s / 86400)); s %= 86400;
    $('#cd-h').textContent = pad(Math.floor(s / 3600)); s %= 3600;
    $('#cd-m').textContent = pad(Math.floor(s / 60));
    $('#cd-s').textContent = pad(s % 60);
  }

  /* ---------------- 6. JOIN ---------------- */
  $('#join-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#email'), msg = $('#join-msg');
    if (!input.checkValidity()) {
      msg.textContent = 'That email is missing an @ or a domain. Check it and try again.';
      msg.className = 'join__msg is-error'; input.focus(); return;
    }
    msg.textContent = `You're on the list. (Concept only: ${input.value} wasn't sent anywhere.)`;
    msg.className = 'join__msg is-ok'; input.value = '';
  });

  /* ---------------- start ---------------- */
  setFlavour(0, { source: 'init' });
  pickScene(0); sizeScene(); renderEvents(); tick(); setInterval(tick, 1000);
  renderSnapshots(); layoutLineup();
  requestAnimationFrame(frame);

  // once the web fonts arrive, repaint the labels so the cans use the real typeface
  // (canvas text only uses a web font once it's loaded, so ask for the exact weights the labels use)
  const want = ['900 100px "Big Shoulders Display"', '800 100px "Big Shoulders Display"', '600 30px "Chakra Petch"'];
  document.fonts && Promise.all(want.map(f => document.fonts.load(f))).then(() => {
    labels = F.map(f => drawLabel(f, document.createElement('canvas')));
    can.setFlavour(labels[current], F[current].accent, false);
    renderSnapshots(); layoutLineup();
  });
})();
