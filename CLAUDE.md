# Claude Notes for Squished Project

## Cache Busting - IMPORTANT!

When updating `styles.css`, `script.js`, or `content-loader.js`, you MUST increment the version number in `index.html`:

```html
<link rel="stylesheet" href="styles.css?v=X">
<script src="content-loader.js?v=X"></script>
<script src="script.js?v=X"></script>
```

Current version: **v83**

Bump the `?v=` number (e.g., `?v=2` → `?v=3`) so Safari and other browsers fetch the fresh files.

## Project Overview

- Web-based book viewer for "Squished - A Kids Book for Grown Ups"
- Two themes: Playful (underwater) and Minimal (default)
- Clean, minimal design on Minimal theme (no decorative elements)
- Auto-pagination splits content across screens
- Mobile-friendly with swipe navigation

## Live Site

https://squished.clarkeching.com
