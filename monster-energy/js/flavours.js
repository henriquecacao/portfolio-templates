/* =========================================================
   flavours.js: the flavour lineup.

   Every flavour drives three things:
     1. the page accent (CSS custom properties on <html>), taken from the
        colour of that can's claw
     2. the photo projected onto the 3D can in the hero (see can3d.js)
     3. its panel in the lineup and its swatch in the hero picker

   Can photos are the official product shots Henrique supplied
   (assets/cans/, inlined for WebGL in js/cans.js).
   Flavour notes are short illustrative copy for the concept.
   ========================================================= */

window.FLAVOURS = [
  {
    id: 'original', name: 'Original', short: 'The green one.',
    notes: 'Sweet, sharp and a little tart. The one that started it all.',
    sugar: 'Full sugar',
    accent: '#AEC90B', ink: '#0A0A0A'
  },
  {
    id: 'ultra-white', name: 'Ultra White', short: 'Zero sugar, light citrus.',
    notes: 'Crisp and clean with a light citrus finish. Zero sugar.',
    sugar: 'Zero sugar',
    accent: '#E9EDF0', ink: '#0A0A0A'
  },
  {
    id: 'ultra-paradise', name: 'Ultra Paradise', short: 'Kiwi, lime, zero sugar.',
    notes: 'Kiwi, lime and a touch of cucumber. Zero sugar.',
    sugar: 'Zero sugar',
    accent: '#8BD450', ink: '#06140A'
  },
  {
    id: 'ultra-fantasy-ruby-red', name: 'Ultra Fantasy Ruby Red', short: 'Zero sugar, bright red fruit.',
    notes: 'Bright, juicy red-fruit flavour with a light finish. Zero sugar.',
    sugar: 'Zero sugar',
    accent: '#FF6FCF', ink: '#1A0414'
  },
  {
    id: 'mango-loco', name: 'Mango Loco', short: 'Juiced. Mango and tropical juice.',
    notes: 'Juiced with mango and a tropical blend underneath. Loud on purpose.',
    sugar: 'Full sugar',
    accent: '#FF9A1F', ink: '#1A0B00'
  },
  {
    id: 'rio-punch', name: 'Rio Punch', short: 'Punch. Fruity and tropical.',
    notes: 'A punchy, fruity, tropical mix. Carnival in a can.',
    sugar: 'Full sugar',
    accent: '#2CC7B4', ink: '#021412'
  },
  {
    id: 'viking-berry', name: 'Viking Berry', short: 'Juiced. Dark berries.',
    notes: 'Juiced with a deep, berry-forward hit. Sharp and a little sour.',
    sugar: 'Full sugar',
    accent: '#E8407E', ink: '#1A0410'
  }
];
