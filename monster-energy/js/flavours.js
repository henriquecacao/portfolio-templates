/* =========================================================
   flavours.js: the flavour data and the can label artwork.

   Every flavour drives three things:
     1. the page accent (CSS custom properties on <html>)
     2. the label texture wrapped around the 3D can
     3. its panel in the lineup

   The labels are ORIGINAL illustrations drawn on a 2D canvas:
   the brand name set in this site's own typeface plus a racing-
   livery layout. They don't reproduce the brand's real packaging or logo.
   ========================================================= */

window.FLAVOURS = [
  {
    id: 'original', name: 'Original', short: 'The green one.',
    notes: 'Sweet, sharp and a little tart. The one that started it.',
    sugar: 'Full sugar',
    accent: '#95D600',   // page accent
    ink: '#0A0A0A',      // text drawn on top of the accent
    label: { base: '#0A0A0A', text: '#F2F4EE', stripe: '#95D600', band: '#1D1F1B' }
  },
  {
    id: 'ultra-white', name: 'Ultra White', short: 'Zero sugar, light citrus.',
    notes: 'Crisp and clean, with a light citrus finish. Zero sugar.',
    sugar: 'Zero sugar',
    accent: '#E9EDF0', ink: '#0A0A0A',
    label: { base: '#F4F6F7', text: '#0A0A0A', stripe: '#9AA3AB', band: '#DCE1E5' }
  },
  {
    id: 'ultra-paradise', name: 'Ultra Paradise', short: 'Kiwi, lime, zero sugar.',
    notes: 'Kiwi, lime and a touch of cucumber. Zero sugar.',
    sugar: 'Zero sugar',
    accent: '#6FE3A1', ink: '#04140B',
    label: { base: '#DDF7E6', text: '#0B3A22', stripe: '#2FBF71', band: '#BDEFD0' }
  },
  {
    id: 'mango-loco', name: 'Mango Loco', short: 'Mango and tropical juice.',
    notes: 'Juicy mango with a tropical blend underneath. Loud on purpose.',
    sugar: 'Full sugar',
    accent: '#FF9A1F', ink: '#1A0B00',
    label: { base: '#1689B8', text: '#FFF4E2', stripe: '#FF9A1F', band: '#0F6E96' }
  },
  {
    id: 'pipeline-punch', name: 'Pipeline Punch', short: 'Passion fruit, orange, guava.',
    notes: 'Passion fruit, orange and guava. Made with the north shore in mind.',
    sugar: 'Full sugar',
    accent: '#FF5FA2', ink: '#1A0410',
    label: { base: '#FF7DB3', text: '#2A0518', stripe: '#FFE15C', band: '#F2569A' }
  },
  {
    id: 'ultra-blue', name: 'Ultra Blue', short: 'Zero sugar, cool and crisp.',
    notes: 'Light, cool and a little berry-ish. Zero sugar.',
    sugar: 'Zero sugar',
    accent: '#47B4FF', ink: '#020F1A',
    label: { base: '#1B5FD1', text: '#F2F8FF', stripe: '#9AD8FF', band: '#164FB0' }
  }
];

/* ---------------------------------------------------------
   drawLabel(flavour, canvas)
   Paints the full wrap-around label. The texture is 2048 × 1408:
   x = around the can (0 → 360°), y = up the can (top → bottom).
   x = 0.5 is the front, the side that faces the viewer at rest.
   --------------------------------------------------------- */
window.drawLabel = function drawLabel(f, cv) {
  const W = 2048, H = 1408;
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const L = f.label;
  const DISPLAY = '"Big Shoulders Display", "Big Shoulders", "Arial Narrow", Impact, sans-serif';
  const BODY = '"Chakra Petch", "Segoe UI", sans-serif';

  // base coat
  g.fillStyle = L.base; g.fillRect(0, 0, W, H);

  // brushed metal grain showing through the print: faint horizontal streaks
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * H;
    g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .035})`;
    g.fillRect(0, y, W, 1 + Math.random() * 2);
  }

  // livery: a big diagonal slash band running round the whole can
  g.save();
  g.fillStyle = L.band;
  g.beginPath();
  g.moveTo(0, H * .58); g.lineTo(W, H * .40); g.lineTo(W, H * .70); g.lineTo(0, H * .88);
  g.closePath(); g.fill();
  // two thin accent pinstripes along the band edge
  g.strokeStyle = L.stripe; g.lineWidth = 14;
  g.beginPath(); g.moveTo(0, H * .56); g.lineTo(W, H * .38); g.stroke();
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, H * .535); g.lineTo(W, H * .355); g.stroke();
  g.restore();

  // hazard chevrons at the bottom edge (race-tape, not claws: wide, evenly spaced)
  g.save();
  g.beginPath(); g.rect(0, H * .92, W, H * .08); g.clip();
  g.fillStyle = L.stripe;
  for (let x = -80; x < W + 80; x += 64) {
    g.beginPath();
    g.moveTo(x, H); g.lineTo(x + 32, H); g.lineTo(x + 32 + 100, H * .92); g.lineTo(x + 100, H * .92);
    g.closePath(); g.fill();
  }
  g.restore();

  // front panel: brand name in the site's display face, stacked and huge
  const cx = W * .5;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = L.text;
  g.font = `900 360px ${DISPLAY}`;
  fitText(g, 'MONSTER', cx, H * .33, W * .25, 360, DISPLAY);
  g.font = `800 96px ${DISPLAY}`;
  g.fillStyle = L.stripe;
  spaced(g, 'ENERGY', cx, H * .42, 22);

  // flavour name on the slash band, angled with it
  g.save();
  g.translate(cx, H * .63);
  g.rotate(Math.atan2(-H * .18, W));
  g.fillStyle = L.text;
  fitText(g, f.name.toUpperCase(), 0, 0, W * .2, 130, DISPLAY, 800);
  g.restore();

  // side panels (seen while it spins): small print and a vertical stripe
  g.fillStyle = L.text; g.globalAlpha = .75;
  g.font = `600 34px ${BODY}`;
  g.textAlign = 'left';
  ['500 ml', f.sugar, 'Concept label', 'Not a real product label'].forEach((t, i) => g.fillText(t, W * .08, H * .16 + i * 46));
  g.textAlign = 'right';
  ['Unofficial concept by', 'Henrique Roquete Cacao', '2026'].forEach((t, i) => g.fillText(t, W * .92, H * .16 + i * 46));
  g.globalAlpha = 1;
  g.fillStyle = L.stripe;
  g.fillRect(W * .02, 0, 18, H * .9); g.fillRect(W * .98 - 18, 0, 18, H * .9);

  return cv;

  // --- helpers ---
  function fitText(ctx, text, x, y, maxW, size, family, weight = 900) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 4; } while (ctx.measureText(text).width > maxW && s > 20);
    ctx.fillText(text, x, y);
  }
  function spaced(ctx, text, x, y, track) {
    const chars = [...text];
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
    let px = x - total / 2;
    ctx.textAlign = 'left';
    chars.forEach((c, i) => { ctx.fillText(c, px, y); px += widths[i] + track; });
    ctx.textAlign = 'center';
  }
};
