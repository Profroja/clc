# Community Legal Clinic (CLC) — Website

React + Vite redesign of clc.tz.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production files in dist/
```

## What's inside

- `src/components/HeroSlider.jsx` — 3-slide hero that auto-plays every 6.5s (pauses on hover, swipe on mobile, arrows + progress dots)
- `src/data.js` — the 5 service packages (SW / EN / 中文 text, WhatsApp messages, images) and testimonials
- `src/i18n.jsx` — all interface text in Kiswahili, English and 中文
- `src/styles.css` — colours, fonts and every section's styling
- `public/images/` — all images

## HD images

All photos are free HD images from [Unsplash](https://unsplash.com/license), listed in `scripts/images.json`.

```bash
npm run images            # download HD photos into public/images/
npm run images -- --force # re-download all of them
```

On GitHub, the **Fetch HD images** action (Actions tab → Run workflow) downloads them and commits
them to the repo for you. To change a photo, replace its Unsplash id in `scripts/images.json`.

## Replace before going live

1. **Email** — `info@clc.tz` in `src/components/Sections.jsx` is a placeholder.
2. **LinkedIn** — set the real public page URL in `src/components/Icons.jsx`.
3. **Testimonial photos** load from `https://clc.tz/assets/...`; if you move hosting, copy them into `public/images/`.
4. Swap stock photos for CLC's own photos (advocates, office) when available — same file names.

WhatsApp number: `255745118253` (change in `src/data.js`).
