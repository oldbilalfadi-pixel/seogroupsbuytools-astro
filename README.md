# SEO Group Buy Tools — Astro 5 static migration

This migration preserves the original source HTML verbatim in `content/**/*.json` and renders it as static Astro routes. All original static assets are copied into `public/assets`. This is a preservation-first baseline, **not** a componentized React redesign.

Commands: `npm install`, `npm run build`, `npm run preview`, `npm run audit`.

Pages CMS configuration is in `.pages.yml`. The HTML is editable as source code in the CMS; structured per-section fields and rich-text editing are not implemented yet. Do not deploy without reviewing the HTML and CMS field schema. Existing third-party links and scripts remain as in the source.