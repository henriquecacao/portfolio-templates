#!/usr/bin/env node
/* =========================================================
   build.mjs — turns this folder into the deployable templates site.
   Vercel runs it on every push (see vercel.json). No dependencies.

   For every folder that contains a template.json (and an index.html):
     1. copy the folder to dist/<slug>/
     2. if "noindex": true, inject <meta name="robots" content="noindex">
     3. add its metadata to dist/templates.json  ← the portfolio reads this
   Then copy the small template index page (_gallery/) to dist/.

   Run locally:  node scripts/build.mjs   →  open dist/index.html
   ========================================================= */
import { readdir, readFile, writeFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SKIP = new Set(['dist', 'scripts', '_gallery', 'node_modules']);
const REQUIRED = ['slug', 'title', 'description', 'date'];

// Absolute base URL so a portfolio on another domain can use the links directly.
// Vercel sets VERCEL_PROJECT_PRODUCTION_URL during builds; SITE_URL overrides it.
const BASE = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || '').replace(/\/$/, '');

// Link to each template's source on GitHub (Vercel exposes the repo during builds).
const env = process.env;
const REPO = env.VERCEL_GIT_PROVIDER === 'github' && env.VERCEL_GIT_REPO_OWNER
  ? `https://github.com/${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}/tree/${env.VERCEL_GIT_COMMIT_REF || 'main'}`
  : (env.REPO_URL || '').replace(/\/$/, '');

const exists = p => stat(p).then(() => true, () => false);

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const entries = await readdir(ROOT, { withFileTypes: true });
  const templates = [], problems = [];

  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const dir = join(ROOT, e.name), metaPath = join(dir, 'template.json');
    if (!(await exists(metaPath))) continue;                       // not a template folder

    let meta;
    try { meta = JSON.parse(await readFile(metaPath, 'utf8')); }
    catch (err) { problems.push(`${e.name}/template.json is not valid JSON (${err.message})`); continue; }

    const missing = REQUIRED.filter(k => !meta[k]);
    if (missing.length) { problems.push(`${e.name}: missing ${missing.join(', ')}`); continue; }
    if (meta.slug !== e.name) { problems.push(`${e.name}: "slug" must match the folder name`); continue; }
    if (!(await exists(join(dir, 'index.html')))) { problems.push(`${e.name}: no index.html`); continue; }
    if (meta.draft) { console.log(`· skipping draft ${meta.slug}`); continue; }

    // 1. copy the template as-is
    const out = join(DIST, meta.slug);
    await cp(dir, out, { recursive: true });

    // 2. keep concept pieces for real brands out of search results
    if (meta.noindex) {
      const html = join(out, 'index.html');
      const src = await readFile(html, 'utf8');
      if (!src.includes('name="robots"')) await writeFile(html, src.replace(/<head>/i, '<head>\n  <meta name="robots" content="noindex, nofollow" />'));
    }

    // 3. manifest entry (paths are absolute when BASE is known)
    const url = `${BASE}/${meta.slug}/`;
    templates.push({
      ...meta,
      url,
      source: REPO ? `${REPO}/${meta.slug}` : null,
      thumbnail: meta.thumbnail ? `${BASE}/${meta.slug}/${meta.thumbnail}` : null
    });
    console.log(`✓ ${meta.slug}`);
  }

  if (problems.length) {                                           // fail loudly so a broken entry never ships
    console.error('\nTemplate problems:\n - ' + problems.join('\n - '));
    process.exit(1);
  }

  // newest first, then by explicit order
  templates.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || b.date.localeCompare(a.date));

  const manifest = { version: 1, generated: new Date().toISOString(), base: BASE || null, count: templates.length, templates };
  await writeFile(join(DIST, 'templates.json'), JSON.stringify(manifest, null, 2));

  // robots.txt mirrors the noindex flags
  const blocked = templates.filter(t => t.noindex).map(t => `Disallow: /${t.slug}/`);
  await writeFile(join(DIST, 'robots.txt'), ['User-agent: *', ...blocked, ''].join('\n'));

  await cp(join(ROOT, '_gallery'), DIST, { recursive: true });
  console.log(`\nBuilt ${templates.length} template(s) → dist/`);
}

main().catch(err => { console.error(err); process.exit(1); });
