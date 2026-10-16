/* =========================================================
   cards.mjs — turns the template list (templates.json) into the
   Work section's HTML.

   Used in two places, so the markup only lives here:
     1. scripts/build.mjs writes the cards straight into dist/index.html
        at build time, so they show even without JavaScript.
     2. index.html uses it as a fallback in the browser, only when the
        page wasn't built (e.g. opening _gallery/index.html directly).
   ========================================================= */

const DEFAULT_SECTION = 'One-Pager Brand Templates';

// optional one-liner per section; others show a project count
const INTRO = {
  'One-Pager Brand Templates': 'Single-page websites, each one a standalone live site with readable code. New ones appear here automatically.',
  'Portfolio': 'Design, art and 3D projects from my studies, each shown on a page built for it.'
};

// order of the blocks on the page: personal work first, brand templates after.
// Any new section name not listed here goes after these, in manifest order.
const SECTION_ORDER = ['Portfolio', 'One-Pager Brand Templates'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function card(t, i) {
  return `
          <article class="card">
            <span class="card__shadow" aria-hidden="true"></span>
            <div class="card__in frame">
              <a class="thumb" href="${esc(t.url)}" aria-label="Open ${esc(t.title)}" style="${t.thumbnail ? `background-image:url('${esc(t.thumbnail)}')` : ''}">
                <span class="card__glint" aria-hidden="true"><i></i></span>
                <span class="tab num">${String(i + 1).padStart(2, '0')}</span>
              </a>
              <div class="body">
                <h3>${esc(t.title)}</h3>
                ${t.subtitle ? `<p class="sub">${esc(t.subtitle)}</p>` : ''}
                <p class="desc">${esc(t.description)}</p>
                <div class="meta">
                  ${t.palette ? `<div class="palette">${t.palette.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</div>` : '<span></span>'}
                  <span class="label">${esc(t.dateLabel || t.date)}</span>
                </div>
                ${t.tags ? `<div class="tags">${t.tags.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
                ${t.concept ? `<p class="concept">⚑ ${esc(t.conceptNote || 'Unofficial concept')}</p>` : ''}
                <div class="links">
                  <a class="btn btn--fill" href="${esc(t.url)}">${esc(t.cta || 'Open live ↗')}</a>
                  ${t.source ? `<a class="btn btn--line" href="${esc(t.source)}">Code</a>` : ''}
                </div>
              </div>
            </div>
          </article>`;
}

/** All section blocks for the Work area, as one HTML string. */
export function renderGroups(templates) {
  if (!templates || !templates.length) return '<p class="empty">First projects coming soon.</p>';

  // group by section (cards keep the manifest's order inside each block)
  const bySection = new Map();
  templates.forEach(t => {
    const k = t.section || DEFAULT_SECTION;
    if (!bySection.has(k)) bySection.set(k, []);
    bySection.get(k).push(t);
  });
  const rank = n => { const i = SECTION_ORDER.indexOf(n); return i < 0 ? SECTION_ORDER.length : i; };
  const sections = [...bySection].sort((x, y) => rank(x[0]) - rank(y[0]));   // stable: unlisted sections keep their order

  return sections.map(([name, items], gi) => {
    const w = esc(name).split(' ');
    const title = w.length > 1 ? w.slice(0, -1).join(' ') + '<br>' + w[w.length - 1] : w[0];
    return `
          <div class="group">
            <div class="sec-head reveal">
              <div>${gi === 0 ? '<span class="tab">Work</span>' : ''}<h2>${title}</h2></div>
              <p>${esc(INTRO[name] || `${items.length} project${items.length === 1 ? '' : 's'}`)}</p>
            </div>
            <div class="grid">${items.map(card).join('')}</div>
          </div>`;
  }).join('');
}
