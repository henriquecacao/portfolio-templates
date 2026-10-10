/* =========================================================
   bolts.js: the electric arcs and the fizz in the hero.
   A 2D canvas laid over the whole hero.
     • Idle: an occasional arc jumps off the can's edge.
     • Charging: arcs come faster and longer, and some reach for the pointer.
     • Burst: a ring of arcs plus a spray of fizz droplets from the can's top.
   Arcs use midpoint displacement: split a line in half again and again,
   pushing each midpoint sideways by a random amount that halves every round.
   ========================================================= */
(function () {
  'use strict';
  const B = {
    charge: 0,
    color: '#95D600',
    bolts: [], drops: [],
    pointer: null
  };
  let cv, g, getBox, w = 0, h = 0, dpr = 1, nextIdle = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  B.init = function (canvas, boxFn) {
    cv = canvas; g = cv.getContext('2d'); getBox = boxFn;
    const host = cv.parentElement;
    host.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); B.pointer = [e.clientX - r.left, e.clientY - r.top]; });
    host.addEventListener('pointerleave', () => B.pointer = null);
    B.resize();
  };

  B.resize = function () {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // jagged path from a to b
  function arc(ax, ay, bx, by, rough) {
    let pts = [[ax, ay], [bx, by]];
    let off = Math.hypot(bx - ax, by - ay) * rough;
    for (let i = 0; i < 6; i++) {
      const next = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) {
        const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1;
        const d = (Math.random() - .5) * off;
        next.push([mx + nx / l * d, my + ny / l * d], pts[k + 1]);
      }
      pts = next; off *= .5;
    }
    return pts;
  }

  // a point on the can's silhouette (left or right edge, or the top)
  function edgePoint(box) {
    const side = Math.random();
    if (side < .15) return [box.x + (Math.random() - .5) * box.w * .8, box.y - box.h / 2 + 4];
    const s = side < .575 ? -1 : 1;
    return [box.x + s * box.w / 2, box.y + (Math.random() - .5) * box.h * .85];
  }

  function spawn(len, toPointer) {
    const box = getBox();
    const [ax, ay] = edgePoint(box);
    let bx, by;
    if (toPointer && B.pointer) { [bx, by] = B.pointer; }
    else {
      const dir = Math.sign(ax - box.x) || (Math.random() < .5 ? -1 : 1);
      const a = (Math.random() - .5) * 1.4;
      bx = ax + dir * Math.cos(a) * len; by = ay + Math.sin(a) * len;
    }
    const main = arc(ax, ay, bx, by, .28);
    const branches = [];
    for (let i = 0; i < 2 + Math.random() * 3; i++) {             // short forks off the main arc
      const p = main[(Math.random() * (main.length - 1)) | 0];
      const a = Math.random() * Math.PI * 2, l = len * (.15 + Math.random() * .25);
      branches.push(arc(p[0], p[1], p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l, .35));
    }
    B.bolts.push({ paths: [main, ...branches], life: 0, max: .09 + Math.random() * .12 });
  }

  B.burst = function () {
    const box = getBox();
    const n = reduced ? 4 : 16;
    for (let i = 0; i < n; i++) spawn(Math.max(w, h) * (.3 + Math.random() * .4), false);
    if (reduced) return;
    // fizz: droplets thrown up out of the can's top
    for (let i = 0; i < 140; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.5, s = 260 + Math.random() * 720;
      B.drops.push({ x: box.x + (Math.random() - .5) * box.w * .5, y: box.y - box.h / 2,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1.5 + Math.random() * 4.5, life: 0, max: 1 + Math.random() * 1.2 });
    }
  };

  B.step = function (dt, now) {
    // decide when to spawn new arcs
    if (B.charge > .02) {
      const rate = (reduced ? 2 : 6) + B.charge * (reduced ? 4 : 34);  // arcs per second
      if (Math.random() < rate * dt) spawn(120 + B.charge * Math.max(w, h) * .45, Math.random() < .35);
    } else if (!reduced && now > nextIdle) {
      spawn(70 + Math.random() * 120, false);
      nextIdle = now + 1400 + Math.random() * 2600;
    }

    g.clearRect(0, 0, w, h);
    g.lineCap = 'round'; g.lineJoin = 'round';

    // arcs: wide coloured glow, then a thin white-hot core; they flicker as they die
    B.bolts = B.bolts.filter(b => (b.life += dt) < b.max);
    for (const b of B.bolts) {
      const t = 1 - b.life / b.max, flick = .55 + Math.random() * .45;
      b.paths.forEach((pts, i) => {
        const main = i === 0;
        g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y));
        g.strokeStyle = B.color; g.globalAlpha = .28 * t * flick;
        g.lineWidth = main ? 9 : 5; g.shadowColor = B.color; g.shadowBlur = 18; g.stroke();
        g.shadowBlur = 0;
        g.strokeStyle = '#fff'; g.globalAlpha = t * flick;
        g.lineWidth = main ? 1.8 : 1; g.stroke();
      });
    }

    // fizz droplets: gravity, drag and fade
    B.drops = B.drops.filter(d => (d.life += dt) < d.max);
    g.fillStyle = B.color;
    for (const d of B.drops) {
      d.vy += 1300 * dt; d.vx *= 1 - dt * .8;
      d.x += d.vx * dt; d.y += d.vy * dt;
      g.globalAlpha = 1 - d.life / d.max;
      g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  };

  window.Bolts = B;
})();
