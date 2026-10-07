# Universe — graffiti series

Spray-paint paintings of planets and space, shown at my final-year art exhibition at CAISL. This page presents them as a scroll journey. A pixel-art spaceship flies down the page and docks beside each painting.

**Concept:** Exploring graffiti painting as a medium, inspired by space and planets. The goal is to explore multiple techniques within the graffiti medium while representing the infinite and mysterious possibilities of space.

## How it works
| file | what it does |
|---|---|
| `index.html` | static markup: the hero, 9 stops (one per painting), the exhibition finale and the lightbox |
| `css/styles.css` | an 8-bit HUD look with pixel frames. The `--accent` colour changes with the painting on screen |
| `js/main.js` | ship sprite (text pixel map → SVG), flight path, scroll → ship, pixel starfield and exhaust (canvas), lightbox |
| `assets/art/` | paintings as WebP: `-sm` at 800px, full size at 1600px |
| `thumbnail.webp` | 1200×750 card image, made from the real paintings and the ship sprite |

- **Flight path:** rebuilt from the paintings' real positions whenever the layout changes. The ship flies straight down beside a painting, then swoops across the gap to the next one. On mobile it uses side lanes that alternate between left and right.
- **Scroll mapping:** the ship goes to the point on the path that's level with the middle of the screen, eased so it glides. Its rotation snaps to 15° steps so it keeps a sprite feel.
- **Reduced motion:** the ship parks beside the nearest painting instead of flying. The stars are static and there's no exhaust.

## Adding or changing a painting
1. Export `universe-NN.webp` (longest side 1600px) and `universe-NN-sm.webp` (800px) into `assets/art/`.
2. Copy one `<li class="stop">` block in `index.html`. Alternate the class: `stop` puts the painting on the left, `stop stop--r` puts it on the right. Set `data-accent` / `data-accent2` to two colours from the painting.
3. Update the `/ 09` counters if the total changes.
