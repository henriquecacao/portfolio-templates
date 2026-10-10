# Monster Energy: one-pager (unofficial concept)

Static concept website for the Monster Energy drink range. This is an unofficial portfolio piece by Henrique Roquete Cacao, and it isn't affiliated with or endorsed by Monster Energy Company.
The page says so in a bar at the top and in a full statement in the footer. No brand logos or packaging artwork are reproduced: the can labels are original illustrations drawn in code. Events, flavour notes and copy are illustrative.

## Run it
Open `index.html` in a browser, or serve the folder (`npx serve .` / `python -m http.server`).
No build step and no libraries. Fonts load from Google Fonts.

## What's inside
| Section | What it does |
|---|---|
| Hero | A WebGL can you can drag to spin. Six can-shaped swatches switch the flavour. **Hold to crack**: hold the button (or Space) and the can spins up and shakes while arcs jump off it. At full charge there's a flash, a burst of fizz and a headline glitch, and a counter remembers how many you've cracked |
| Hazard tape | Skewed accent marquee with chevron edges |
| The lineup | On desktop the section pins and scrolling slides six flavour panels sideways. The site's accent follows the can in front of you. On mobile it's a swipe carousel. The can images are rendered by the same WebGL renderer |
| Where the cans end up | Seven scenes (Moto, Skate, BMX, Surf, Snow, Gaming, Music), each with its own generative canvas animation: racing kerb, half-pipe, spoked wheel, swell lines, carve, scope, EQ |
| On the calendar | Sample events with scene filters, a live countdown to the next one and "Remind me" toggles (saved in the browser) |
| Join | Newsletter form, front end only. Nothing is sent |
| Footer | Concept statement and credits |

## Under the hood
- `js/can3d.js`: WebGL renderer written from scratch. Lathe mesh from a measured 500 ml can profile (domed base, neck, rolled rim, lid), a label texture on the body, and a fake studio environment (two strip lights and a softbox) for the aluminium. The rim light takes the flavour accent and gets brighter while charging
- `js/flavours.js`: flavour data plus `drawLabel()`, which paints each wrap-around label on a 2D canvas (livery slash band, pinstripes, hazard chevrons, name set in Big Shoulders)
- `js/bolts.js`: lightning by midpoint displacement with branches, a glow pass plus a white core, and fizz particles with gravity
- `js/scenes.js`: the seven generative scene drawings
- `js/main.js`: flavour state (CSS custom properties `--accent` / `--accent-ink`), hold-to-crack, pinned lineup, tabs, events and the form
- Respects `prefers-reduced-motion`: no idle spin, no shake, no marquee, and the lineup stays a normal carousel

## Design system
- **Colour:** true black `#000`, asphalt `#1A1B18`, aluminium `#B9BEC4`, paper `#F2F4EE`, plus one flavour accent (Original `#95D600`, Ultra White `#E9EDF0`, Ultra Paradise `#6FE3A1`, Mango Loco `#FF9A1F`, Pipeline Punch `#FF5FA2`, Ultra Blue `#47B4FF`)
- **Type:** Big Shoulders Display (condensed and industrial) for display and buttons, Chakra Petch (squared, like a dashboard readout) for text
- **Shapes:** chamfered corners (race number plates), hazard chevrons, livery slash bands and ticket-stub event rows
