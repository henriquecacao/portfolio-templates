# Enjoy joy! — açaí one-pager (concept)

Static one-page website concept for an açaí bowl shop, built on the Enjoy joy!® purple + yellow identity.
Unofficial portfolio piece. It isn't affiliated with the brand, and the addresses and opening hours are sample content.

## Run it
Open `index.html` in a browser, or serve the folder (`npx serve .` / `python -m http.server`).
No build step and no dependencies. Fonts load from Google Fonts.

## What's inside
| Section | Purpose |
|---|---|
| Hero | Headline ("o melhor açaí tem também o melhor preço") plus the **3D rotating açaí cup** (drag to spin) |
| Tamanhos | 250 / 350 / 500ml with hanging price tags, taken from the brand's price posts |
| Monta o teu | Builder for size, base and toppings, with a live price. The photo-3D cup resizes, the açaí re-tints for each base, and the chosen toppings orbit the cup |
| Menu | Six products rendered from data in `js/main.js`, with filter tabs and add-to-order |
| Sabias que? | Açaí benefits plus a "pre/post-workout" block |
| Dá like! | Instagram-style tile wall |
| Joy Club | Loyalty stamp card (animated) and newsletter form (front-end only) |
| Lojas + FAQ | Stores, hours, delivery apps and an accordion FAQ |
| PT / EN | Language toggle. PT-PT is the default |

## The photo-3D cup (`js/cup3d.js`)
A small WebGL renderer written from scratch with no libraries. It wraps a real product photo around real geometry:
- **Body:** a lathe mesh built from the photo's measured silhouette (radius per pixel row). Each fragment projects back into the photo (`u = cx + r·sin(θ·k)`). The back reuses the front, like a cup printed on both sides, and the two cross-fade at the sides to hide the seam
- **Top:** a heaped dome textured with an overhead photo of the toppings. The photo's brightness doubles as a height map, so the fruit stands off the açaí and catches the light as the cup turns
- **Light:** the photos are already lit, so the shader only adds what a photo can't: plastic glare that moves with the view, a soft Fresnel edge and a yellow brand back-light
- **Builder:** the açaí can be re-tinted live (cupuaçu and banana bases) without touching the printed label. The selected toppings orbit the cup as photo crops
- Photos are inlined in `assets/textures.js` as data URIs, so WebGL also works when you open `index.html` straight from disk

## Liquid background (`js/liquid.js`)
A full-screen fragment shader of domain-warped noise. Its gradient gives a fake surface normal for glossy, sorbet-like highlights. It renders at half resolution, pauses when off-screen, and reacts subtly to the pointer.

## Design system
- **Colour:** plum `#2B0B45` → violet `#6A1FA8` → lavender `#C7A6F2`, with yellow `#FFC72C` reserved for actions and highlights
- **Type:** Lilita One (chunky rounded display; accent words in lowercase, tilted like stickers) and Nunito for body text. Fredoka is used only for the wordmark
- **Texture:** seamless tone-on-tone leaf, berry and banana tiles (`assets/pattern-*.svg`) that drift slowly behind each section
- **Assets:** product and overhead photos are AI-generated (Higgsfield / Nano Banana), cut out and cropped for the menu, sizes and builder
