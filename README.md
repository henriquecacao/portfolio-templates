# portfolio-templates

AI-assisted website templates by Henrique Roquete Cacao. Every folder is one standalone template.
The repo deploys to Vercel as **one site** (e.g. `templates.yourdomain.com`) and publishes a
`templates.json` manifest. The portfolio site reads that manifest, so it updates by itself.

```
portfolio-templates/
├─ enjoy-joy/            ← a template (any static site with index.html)
│  ├─ index.html …
│  ├─ template.json      ← its metadata (title, tags, palette, thumbnail…)
│  └─ thumbnail.webp     ← 1200×750 preview
├─ _gallery/index.html   ← simple index page at the site root
├─ scripts/build.mjs     ← builds dist/ + templates.json (runs on Vercel)
└─ vercel.json
```

## Adding a new template
1. Put the template folder here, with a `template.json` and a `thumbnail.webp` (Forge creates both on every run).
2. Commit and push to GitHub.
3. Vercel rebuilds. The template goes live at `/<slug>/`, and `templates.json` now includes it.
   **The portfolio picks it up automatically. You don't need to touch it.**

To hide a template while it's in progress, add `"draft": true` to its `template.json`.

## `template.json` fields
| field | required | notes |
|---|---|---|
| `slug` | ✓ | must match the folder name; becomes the URL `/<slug>/` |
| `title` | ✓ | |
| `description` | ✓ | one or two sentences |
| `date` | ✓ | `YYYY-MM-DD` |
| `subtitle`, `category`, `tags[]`, `palette[]`, `fonts[]` | | shown on cards |
| `order` | | lower numbers come first (otherwise newest first) |
| `featured` | | the portfolio can use this for a hero slot |
| `concept`, `conceptNote` | | marks unofficial concepts for real brands |
| `noindex` | | the build adds `<meta name="robots" content="noindex">` and a `robots.txt` rule |
| `thumbnail` | | file name inside the folder |
| `draft` | | `true` = not deployed |

The build also adds `url` (live link) and `source` (GitHub folder link) to each entry.

## One-time setup
1. **GitHub:** create a repo called `portfolio-templates` and push this folder to it. GitHub Desktop is the easiest way: *File → Add local repository → Publish*.
2. **Vercel:** *Add New → Project*, then import the repo. Leave the default settings, because `vercel.json` already sets the build. Deploy.
3. **Domain (optional):** in *Project → Settings → Domains*, add `templates.yourdomain.com`.
4. Give the portfolio this URL: `https://templates.yourdomain.com/templates.json` (see `PORTFOLIO-INTEGRATION.md`).

Preview locally: `node scripts/build.mjs`, then serve the `dist/` folder (`npx serve dist`).
