# Clínica Veterinária de Cascais · Dr. Marques Vieira (brand edition)

Concept one-pager for a Cascais vet clinic, built on the clinic's **existing logo and colours**.
Unofficial portfolio piece, not affiliated with the clinic. Hours and copy are sample content, and the phone number comes from public listings (they disagree, so confirm it).
For a different take on the same clinic with an invented identity, see `../clinica-vet-cascais`.

## Run it
Open `index.html`. No build step, no dependencies. Roboto loads from Google Fonts.

## The brand system: everything comes from the emblem
| Emblem element | Becomes |
|---|---|
| Cyan disc `#44C1D7` | Hero "sky", contact section, cool surfaces |
| Magenta spaniel `#F70077` | Calls to action and everything about dogs |
| Yellow cat `#FFFF21` | Highlights and everything about cats |
| Triple ink ring | The ring frame around circular photos; 3px ink outlines and offset shadows across the UI |
| Magenta base under the animals | The "ground" info band under the hero |
| Lockup (light caps + bold caps) | Every heading is a light Roboto line over a black-weight line |

`#DB006A` is a slightly deeper magenta used behind white button text, so it passes WCAG AA contrast. The pure brand magenta stays for fills.

## Logo
`assets/logo-emblem.svg` is a vector redraw of the clinic's emblem, made from a 151px PNG, so it stays sharp at any size and works as the favicon. The wordmark is live Roboto text, as in the original lockup. If the clinic has an original vector file, swap it in.

## Features
- **Live status:** "Aberto agora / Fechado · abre…" in Lisbon time, today's hours in the ground band, and the week's hours with today flagged
- **Cães / gatos split:** care checklists plus a **human-age calculator** (slider; dog size changes the rate)
- **Services:** 8 cards with custom line icons in emblem-style circles
- **Booking wizard:** four steps (animal → motive → day and time → contact) with validation. Day and time slots are generated from the opening hours, some are shown as booked, and a summary appears at the end. Front-end only
- **Gallery:** scroll-snap strip with arrow buttons
- **Phones:** burger menu, and a round call button styled like the emblem that appears after the hero

All editable data (contacts, hours, slot length, services) is at the top of `js/main.js`. Photos go in `assets/photos/`; see `PHOTOS.md`.
