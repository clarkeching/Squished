# Claude Notes for Squished Project

## Cache Busting - IMPORTANT!

When updating `styles.css`, `script.js`, or `content-loader.js`, you MUST increment the version number in `index.html`:

```html
<link rel="stylesheet" href="styles.css?v=X">
<script src="content-loader.js?v=X"></script>
<script src="script.js?v=X"></script>
```

Current version: **v101**

Bump the `?v=` number (e.g., `?v=2` → `?v=3`) so Safari and other browsers fetch the fresh files.

## Project Overview

- Web-based book viewer for "Squished - A Kids Book for Grown Ups"
- Two themes: Playful (underwater) and Minimal (default)
- Clean, minimal design on Minimal theme (no decorative elements)
- Auto-pagination splits content across screens
- Mobile-friendly with swipe navigation

## Live Site

https://unsquish.me

## Testing
- Always run `npm test` (fast, ~50s) before pushing when code files (HTML/CSS/JS) have changed
- For big or risky changes (multi-file CSS/JS, pagination, layout), ask if `npm run test:all` (full, ~7min) should run before pushing

## Technical Notes
- Cache bust version must be consistent across all three files in index.html (styles.css, content-loader.js, script.js) and CLAUDE.md
- The pagination system in script.js uses `querySelectorAll('p')` — any `<p>` tags inside non-paragraph containers (like `.amazon-links`) must be excluded with `:not()` selectors
- Footer positioning: on mobile the nav bar sits at `bottom: 0`, so the footer must be above it with higher z-index
