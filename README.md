# kurucuvisuals portfolio

Static site served by GitHub Pages (`kurucuvisuals.com`). No build step is required to view it —
open `index.html` or serve the repo root with any static server.

## Shared building blocks

| File | Purpose |
| --- | --- |
| `base.css` | Design tokens and the base reset shared by every page |
| `gallery.css` | Layout for the archive/gallery pages |
| `site.js` | Small helpers shared by the pages (`onEscape`, `scrollToId`, `enableSmoothAnchorScroll`) |
| `gallery.js` | Lightbox behaviour for the gallery pages |
| `index.js` | Home page navigation overlay |

## Gallery pages

`portre.html`, `etkinlik.html`, `sinema.html`, `videography.html`, `creative.html` and the
`marka.html` redirect are **generated** — edit the template or the config, not the HTML:

- `tools/templates/gallery.html`, `tools/templates/redirect.html` – page markup
- `tools/galleries.json` – page title, description, asset folder, optional sections and ordering

Media items are read from the configured asset folder (images and `.mp4`/`.mov`/`.webm` videos),
sorted alphabetically. A gallery or section may set `"files"` to pin a custom order; the generator
fails if that list drifts from what is on disk.

```bash
node tools/build-galleries.mjs          # regenerate the pages
node tools/build-galleries.mjs --check  # fail if the committed pages are stale
```

Adding new work is therefore: drop the files into `assets/portfolio/<gallery>/` and rerun the
generator.
