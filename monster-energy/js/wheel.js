/* =========================================================
   wheel.js: the can wheel in the hero.
   All the cans stand on an invisible ring seen slightly from above.
   The selected can sits at the front, full size and full colour;
   the others shrink, darken and fade as they go round the back.
   Selecting a can spins the ring the short way round until it's in front.

   The cans are real product photos, so they always face the viewer
   (only their position on the ring changes, never their angle).

     const wheel = new CanWheel(el, flavours, onPick)
     wheel.set(i)          → spin to can i
     wheel.charge = 0..1   → front can glows and shakes (hold-to-crack)
     wheel.pop()           → squash-and-stretch when a can is cracked
     wheel.step(dt)        → advance the animation (called every frame)
     wheel.frontRect()     → the front can's box on screen (for the lightning)
   ========================================================= */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  class CanWheel {
    constructor(el, flavours, onPick) {
      this.el = el; this.n = flavours.length;
      this.pos = 0; this.target = 0; this.current = 0;
      this.charge = 0; this.popT = 1;

      this.cans = flavours.map((f, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'wheel__can';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', f.name);
        b.innerHTML = `<img src="assets/cans/${f.id}.webp" alt="" width="250" height="625" draggable="false" />`;
        b.addEventListener('click', () => { if (!this.swiped) onPick(i); });
        el.append(b);
        return b;
      });

      // arrow keys move round the wheel (radiogroup pattern)
      el.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = (this.current + d + this.n) % this.n;
        onPick(n); this.cans[n].focus();
      });

      // swipe left/right on touch screens (or drag with a mouse) to turn the wheel
      let x0 = null;
      el.addEventListener('pointerdown', e => { x0 = e.clientX; this.swiped = false; });
      el.addEventListener('pointerup', e => {
        if (x0 == null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) { this.swiped = true; onPick((this.current + (dx < 0 ? 1 : -1) + this.n) % this.n); }
      });
    }

    set(i) {
      // turn the short way round: the change in position is wrapped into -n/2 … n/2
      let d = (i - this.current) % this.n;
      if (d > this.n / 2) d -= this.n;
      if (d < -this.n / 2) d += this.n;
      this.target += d; this.current = i;
      if (reduced) this.pos = this.target;
      this.cans.forEach((c, k) => { c.setAttribute('aria-checked', k === i); c.tabIndex = k === i ? 0 : -1; c.classList.toggle('is-front', k === i); });
    }

    pop() { this.popT = 0; }

    frontRect() { return this.cans[this.current].getBoundingClientRect(); }

    step(dt) {
      this.pos += (this.target - this.pos) * Math.min(1, dt * 5.5);     // eased spin
      this.popT = Math.min(1, this.popT + dt * 2.4);

      const W = this.el.clientWidth, H = this.el.clientHeight;
      const rx = Math.min(W * .42, H * .62);                               // ring radius on screen
      const step = TAU / this.n;
      const k = reduced ? 0 : this.charge * this.charge;

      this.cans.forEach((c, i) => {
        const a = (i - this.pos) * step;
        const depth = (Math.cos(a) + 1) / 2;                              // 1 = front, 0 = back
        const x = Math.sin(a) * rx;
        const y = -(1 - depth) * H * .12;                                  // back of the ring sits higher
        let s = .3 + .7 * Math.pow(depth, 3);
        let sx = 0, sy = 0, glow = 0;
        if (i === this.current) {
          sx = (Math.random() - .5) * 14 * k; sy = (Math.random() - .5) * 10 * k;   // shake while charging
          const p = this.popT;
          s *= reduced ? 1 : 1 + Math.sin(p * Math.PI) * .1 * (1 - p);           // pop when cracked
          glow = this.charge;
        }
        const light = .08 + .92 * Math.pow(depth, 6);   // falls off fast: only the front can is lit
        c.style.transform = `translate(-50%, -50%) translate(${(x + sx).toFixed(1)}px, ${(y + sy).toFixed(1)}px) scale(${s.toFixed(3)})`;
        c.style.zIndex = Math.round(depth * 100);
        c.style.opacity = (.25 + .75 * Math.pow(depth, 1.5)).toFixed(3);
        c.style.setProperty('--light', light.toFixed(3));
        c.style.setProperty('--blur', `${((1 - depth) * 2.2).toFixed(2)}px`);
        c.style.setProperty('--glow', glow.toFixed(3));
      });
    }
  }

  window.CanWheel = CanWheel;
})();
