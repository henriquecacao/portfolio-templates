# Portfolio ↔ templates: integration contract

This is for whoever builds the portfolio site (the portfolio-builder agent).
The templates live in a separate Vercel project. The portfolio should **never hard-code the list of
templates**. It reads the list from the manifest instead.

**Manifest URL:** `https://<templates-domain>/templates.json`. It allows CORS from any origin and is not cached.

```jsonc
{
  "version": 1,
  "generated": "2026-10-06T12:00:00.000Z",
  "base": "https://templates.example.com",
  "count": 1,
  "templates": [
    {
      "slug": "enjoy-joy",
      "title": "Enjoy joy!",
      "subtitle": "Açaí shop one-pager",
      "description": "…",
      "category": "Food & drink",
      "tags": ["WebGL", "Photo-3D", "GLSL shader", "Order builder", "PT/EN"],
      "palette": ["#2B0B45", "#6A1FA8", "#C7A6F2", "#FFC72C"],
      "fonts": ["Lilita One", "Nunito"],
      "date": "2026-10-03",
      "order": 1,
      "featured": true,
      "concept": true,
      "conceptNote": "Unofficial concept for a real brand. Not affiliated.",
      "noindex": true,
      "url": "https://templates.example.com/enjoy-joy/",            // live site
      "source": "https://github.com/<user>/portfolio-templates/tree/main/enjoy-joy",  // may be null
      "thumbnail": "https://templates.example.com/enjoy-joy/thumbnail.webp"         // 1200×750, may be null
    }
  ]
}
```

Rules
- Treat every field except `slug`, `title`, `description`, `date` and `url` as optional.
- The order is already sorted (`order`, then newest first). Keep it.
- If `concept` is true, show `conceptNote` near the card. This is required for real-brand concepts.
- If the manifest was built without a known domain, `url` and `thumbnail` are relative. Resolve them against the manifest URL with `new URL(path, manifestUrl)`.

## Fetching it

**Static portfolio (vanilla JS), runtime fetch:** new templates appear instantly.
```js
const MANIFEST = 'https://templates.example.com/templates.json';
const { templates } = await fetch(MANIFEST, { cache: 'no-store' }).then(r => r.json());
```

**Next.js (App Router), fetched on the server and refreshed hourly:**
```js
const res = await fetch(process.env.TEMPLATES_MANIFEST, { next: { revalidate: 3600 } });
const { templates } = await res.json();
```
For instant updates, add a Vercel **Deploy Hook** to the portfolio project and call it from the templates project after each deploy. Or just keep `revalidate` short.

**Case-study pages:** use `slug` for routes like `/work/[slug]`. The page can embed the live template with
`<iframe src={url} loading="lazy">`, because templates don't block framing.

**Same domain instead of a subdomain (optional):** add a rewrite to the portfolio's `vercel.json`:
```json
{ "rewrites": [{ "source": "/templates/:path*", "destination": "https://templates.example.com/:path*" }] }
```
