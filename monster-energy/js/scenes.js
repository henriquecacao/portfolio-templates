/* =========================================================
   scenes.js: the "Where the cans end up" section.
   Each scene has copy plus a small generative animation drawn on
   one shared canvas, built from that sport's own visual language
   (kerbs, a half-pipe, spokes, swell lines, a carve, a scope, an EQ).
   All are drawn as lines and shapes, so there are no photos to licence.
   draw(g, w, h, t, accent) is called every frame with t in seconds.
   ========================================================= */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const line = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };

  window.SCENES = [
    {
      id: 'moto', name: 'Moto', title: 'Pit lane to podium',
      body: 'Supercross gates, MX tracks and the paddock at 7 a.m. The can is cracked before the first sighting lap.',
      draw(g, w, h, t, A) {
        // speed streaks rushing left
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
        for (let i = 0; i < 46; i++) {
          const y = (i * 97.3) % h, len = 40 + (i * 53) % 180, sp = 600 + (i * 37) % 900;
          const x = w - ((t * sp + i * 211) % (w + len * 2));
          line(g, [[x, y], [x + len, y]]);
        }
        // a racing kerb sweeping through a bend, blocks scrolling along it
        const cx = w * .5, cy = h * 1.25, R = h * .95, n = 26;
        for (let i = 0; i < n; i++) {
          const a0 = Math.PI + ((i + (t * 3) % 2) / n) * Math.PI, a1 = a0 + Math.PI / n;
          g.fillStyle = (i % 2) ? A : '#F2F4EE';
          g.beginPath(); g.arc(cx, cy, R, a0, a1); g.arc(cx, cy, R - 34, a1, a0, true); g.fill();
        }
      }
    },
    {
      id: 'skate', name: 'Skate', title: 'Sessions that run late',
      body: 'Parks, plazas and borrowed ledges. Sessions that last until someone with a torch tells everyone to go home.',
      draw(g, w, h, t, A) {
        // half-pipe: flat bottom with quarter-circle transitions
        const r = Math.min(w * .28, h * .55), bot = h * .82, l = w * .5 - r * 1.3, rr = w * .5 + r * 1.3;
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(l - r, bot - r - 40); g.lineTo(l - r, bot - r);
        g.arc(l, bot - r, r, Math.PI, Math.PI / 2, true); g.lineTo(rr, bot);
        g.arc(rr, bot - r, r, Math.PI / 2, 0, true); g.lineTo(rr + r, bot - r - 40); g.stroke();
        // the board: swings like a pendulum, with a short trail
        const pos = s => {
          const p = Math.sin(s * 1.6);                              // -1 → 1
          const span = (rr - l) / 2 + r * Math.PI / 2;
          let d = p * span;                                         // distance along the ramp from the middle
          const flat = (rr - l) / 2;
          if (Math.abs(d) <= flat) return [w * .5 + d, bot - 8];
          const k = Math.sign(d), a = (Math.abs(d) - flat) / r;     // angle up the transition
          const c = k > 0 ? [rr, bot - r] : [l, bot - r];
          return [c[0] + k * Math.sin(a) * (r - 8), c[1] + Math.cos(a) * (r - 8)];
        };
        for (let i = 12; i >= 0; i--) {
          const [x, y] = pos(t - i * .025);
          g.fillStyle = i ? `rgba(255,255,255,${.25 - i * .018})` : A;
          g.beginPath(); g.arc(x, y, i ? 5 : 10, 0, TAU); g.fill();
        }
      }
    },
    {
      id: 'bmx', name: 'BMX', title: 'Dirt, park, street',
      body: 'Hand-built trails, bent pegs and a cooler in the shade. Whatever needs riding, gets ridden.',
      draw(g, w, h, t, A) {
        const cx = w * .5, cy = h * .52, R = Math.min(w, h) * .36, a0 = t * 2.4;
        // 36 spokes, laced in two crossing sets like a real wheel
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.4;
        for (let i = 0; i < 36; i++) {
          const a = a0 + i / 36 * TAU, hub = a + (i % 2 ? .5 : -.5);
          line(g, [[cx + Math.cos(hub) * R * .12, cy + Math.sin(hub) * R * .12], [cx + Math.cos(a) * R * .9, cy + Math.sin(a) * R * .9]]);
        }
        g.strokeStyle = '#F2F4EE'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R * .92, 0, TAU); g.stroke();
        // tyre tread blocks
        g.strokeStyle = A; g.lineWidth = 14;
        for (let i = 0; i < 48; i++) { const a = a0 + i / 48 * TAU; g.beginPath(); g.arc(cx, cy, R, a, a + .07); g.stroke(); }
        g.fillStyle = A; g.beginPath(); g.arc(cx, cy, R * .1, 0, TAU); g.fill();
      }
    },
    {
      id: 'surf', name: 'Surf', title: 'Dawn patrol',
      body: 'Offshore wind at first light, a long paddle out and a can waiting in the car for after.',
      draw(g, w, h, t, A) {
        // stacked swell lines; the top line is the set wave
        for (let k = 0; k < 14; k++) {
          const y0 = h * .28 + k * h * .05, amp = 10 + (14 - k) * 2.4, ph = t * (1.1 + k * .05) + k * .5;
          g.strokeStyle = k === 0 ? A : `rgba(255,255,255,${.5 - k * .03})`; g.lineWidth = k === 0 ? 4 : 1.6;
          const pts = [];
          for (let x = 0; x <= w; x += 8) pts.push([x, y0 + Math.sin(x * .012 + ph) * amp + Math.sin(x * .031 - ph * 1.3) * amp * .35]);
          line(g, pts);
        }
      }
    },
    {
      id: 'snow', name: 'Snow', title: 'First chair to last light',
      body: 'Park laps, a powder morning if you are lucky, and one more run when the light goes flat.',
      draw(g, w, h, t, A) {
        // slope
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
        line(g, [[0, h * .25], [w, h * .9]]);
        // carve: an S-curve drawn down the slope, then redrawn
        const prog = (t * .35) % 1.2, steps = 120;
        g.strokeStyle = A; g.lineWidth = 4; g.beginPath();
        for (let i = 0; i <= steps * Math.min(1, prog); i++) {
          const s = i / steps, x = w * (.08 + s * .84), y = h * (.25 + s * .65) - 26 - Math.sin(s * TAU * 2.5) * 30;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        // falling snow
        g.fillStyle = '#F2F4EE';
        for (let i = 0; i < 90; i++) {
          const x = (i * 131.7 + Math.sin(t + i) * 14) % w, y = (i * 71.3 + t * (30 + i % 40)) % h;
          g.globalAlpha = .3 + (i % 5) * .12; g.fillRect(x, y, 2 + i % 3, 2 + i % 3);
        }
        g.globalAlpha = 1;
      }
    },
    {
      id: 'gaming', name: 'Gaming', title: 'Steady hands at 2 a.m.',
      body: 'Tournament floors, scrims and late-night ranked. Tight timing, tired eyes and a can by the keyboard.',
      draw(g, w, h, t, A) {
        const cx = w * .5, cy = h * .5, R = Math.min(w, h) * .4;
        g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.5;
        for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(cx, cy, R * i / 4, 0, TAU); g.stroke(); }
        line(g, [[cx - R, cy], [cx + R, cy]]); line(g, [[cx, cy - R], [cx, cy + R]]);
        // sweep
        const a = t * 1.8;
        g.fillStyle = A; g.globalAlpha = .18;
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a - .5, a); g.closePath(); g.fill();
        g.globalAlpha = 1;
        // targets: lit when the sweep passes, the crosshair snaps to the latest one
        const targets = [[.3, .7], [.62, .35], [.8, .62], [.45, .2], [.15, .45]].map(([u, v]) => [cx + (u - .5) * R * 1.7, cy + (v - .5) * R * 1.7]);
        let lock = targets[Math.floor(t / 1.1) % targets.length];
        targets.forEach(([x, y]) => {
          const ta = (Math.atan2(y - cy, x - cx) + TAU) % TAU, diff = ((a % TAU) - ta + TAU) % TAU;
          g.fillStyle = diff < 1.2 ? A : 'rgba(255,255,255,.35)';
          g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
        });
        g.strokeStyle = '#F2F4EE'; g.lineWidth = 2;
        const [lx, ly] = lock, s = 18 + Math.sin(t * 8) * 2;
        g.strokeRect(lx - s, ly - s, s * 2, s * 2);
      }
    },
    {
      id: 'music', name: 'Music', title: 'Three cities, four nights',
      body: 'Side of stage, the back of the van and soundcheck at four. The tour rider has one line that never changes.',
      draw(g, w, h, t, A) {
        const n = 48, bw = w / n;
        for (let i = 0; i < n; i++) {
          const v = Math.abs(Math.sin(i * .37 + t * 3.1) * .6 + Math.sin(i * .11 - t * 5.3) * .35 + Math.sin(t * 9 + i) * .08);
          const bh = v * h * .38;
          g.fillStyle = v > .7 ? A : 'rgba(242,244,238,.75)';
          g.fillRect(i * bw + 2, h * .5 - bh, bw - 4, bh);
          g.globalAlpha = .25; g.fillRect(i * bw + 2, h * .5 + 6, bw - 4, bh * .6); g.globalAlpha = 1;
        }
      }
    }
  ];
})();
