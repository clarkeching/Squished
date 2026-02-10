# Claude Notes for Squished Project

## Cache Busting - IMPORTANT!

When updating `styles.css`, `script.js`, or `content-loader.js`, you MUST increment the version number in `index.html`:

```html
<link rel="stylesheet" href="styles.css?v=X">
<script src="content-loader.js?v=X"></script>
<script src="script.js?v=X"></script>
```

Current version: **v145**

Bump the `?v=` number (e.g., `?v=2` → `?v=3`) so Safari and other browsers fetch the fresh files.

## Project Overview

- Web-based book viewer for "Squished - A Kids Book for Grown Ups"
- Two themes: Playful (underwater) and Minimal (default)
- Clean, minimal design on Minimal theme (no decorative elements)
- Auto-pagination splits content across screens
- Mobile-friendly with swipe navigation

## Live Site

https://unsquish.me

## Deployment
- The live site deploys from `main` via GitHub Pages
- Claude Code on the web can only push to `claude/` branches (403 on main) — after pushing, tell the user to merge on GitHub or give them a one-liner for Working Copy terminal:
  `git fetch origin && git merge origin/<branch-name> && git push`
- Claude Code on Mac can push directly to `main` — no merge step needed

## Communication
- Always tell the user the current version number after pushing (e.g., "Pushed v113")

## Testing
- Before pushing, try `npm test` (fast, ~50s) when code files (HTML/CSS/JS) have changed — but only if the environment supports it (Playwright browsers may not be available in sandboxed/CI environments; if browser download fails or tests all error with launch failures, skip and note it)
- For big or risky changes (multi-file CSS/JS, pagination, layout), ask if `npm run test:all` (full, ~7min) should run before pushing

## Technical Notes
- Cache bust version must be consistent across all three files in index.html (styles.css, content-loader.js, script.js), the inline `MY_VERSION` constant in index.html, `version.json`, and CLAUDE.md
- `version.json` contains `{"version":N}` — the inline script in index.html fetches this with `cache:'no-store'` and auto-reloads if the page is stale. This solves Safari's aggressive HTML caching on GitHub Pages
- The pagination system in script.js uses `querySelectorAll('p')` — any `<p>` tags inside non-paragraph containers (like `.amazon-links`) must be excluded with `:not()` selectors
- Footer positioning: on mobile the nav bar sits at `bottom: 0`, so the footer must be above it with higher z-index
