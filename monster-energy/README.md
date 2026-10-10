# Monster Energy: one-pager (unofficial concept)

Static concept website for the Monster Energy drink range. This is an unofficial portfolio piece by Henrique Roquete Cacao, and it isn't affiliated with or endorsed by Monster Energy Company.
The page says so in a bar at the top and in a full statement in the footer. The official logo (`assets/brand/`) and can product shots (`assets/cans/`), supplied by Henrique, are used as-is. Events, flavour notes and copy are illustrative.

## Run it
Open `index.html` in a browser, or serve the folder (`npx serve .` / `python -m http.server`).
No build step and no libraries. Fonts load from Google Fonts.

## What's inside
| Section | What it does |
|---|---|
| Hero | A wheel of all seven cans: the selected can stands at the front in full colour while the rest go round the back, smaller and darker. Picking a can (click it, the arrows, arrow keys or a swipe) spins the wheel the short way round. Hovering a can makes it jump out. **Hold to crack**: hold the button (or Space) and the front can glows and shakes while arcs jump off it and the claw behind lights up. At full charge there's a flash, a burst of fizz and a headline glitch, and a counter remembers how many you've cracked |
| Hazard tape | Skewed accent marquee with chevron edges |
| The lineup | On desktop the section pins and scrolling slides seven flavour panels sideways. The site's accent follows the can in front of you. On mobile it's a swipe carousel. Each panel shows the official can shot |
| Where the cans end up | Seven scenes (Moto, Skate, BMX, Surf, Snow, Gaming, Music), each with its own generative canvas animation: racing kerb, half-pipe, spoked wheel, swell lines, carve, scope, EQ |
| On the calendar | Sample events with scene filters, a live countdown to the next one and "Remind me" toggles (saved in the browser) |
| Join | Newsletter form, front end only. Nothing is sent |
| Footer | Concept statement and credits |

## Under the hood
- `js/wheel.js`: the can wheel. Each can is placed on an ellipse from its angle round the ring: depth sets size, brightness, blur and stacking, so the cans always face you and only their place on the ring changes. Spins are eased towards the target, the short way round
- `js/flavours.js`: the seven flavours (name, notes, accent colour taken from each can's claw)
- `js/bolts.js`: lightning by midpoint displacement with branches, a glow pass plus a white core, and fizz particles with gravity
- `js/scenes.js`: the seven generative scene drawings
- `js/main.js`: flavour state (CSS custom properties `--accent` / `--accent-ink`), hold-to-crack, pinned lineup, tabs, events and the form
- Respects `prefers-reduced-motion`: the wheel jumps instead of spinning, no shake, no marquee, and the lineup stays a normal carousel

## Design system
- **Colour:** brand green `#AEC90B` (sampled from the logo), true black `#000`, asphalt `#1A1B18`, aluminium `#B9BEC4`, paper `#F2F4EE`, plus one flavour accent (Ultra White `#E9EDF0`, Ultra Paradise `#8BD450`, Ultra Fantasy Ruby Red `#FF6FCF`, Mango Loco `#FF9A1F`, Rio Punch `#2CC7B4`, Viking Berry `#E8407E`)
- **Type:** Big Shoulders Display (condensed and industrial) for display and buttons, Chakra Petch (squared, like a dashboard readout) for text
- **Shapes:** chamfered corners (race number plates), hazard chevrons, livery slash bands and ticket-stub event rows
