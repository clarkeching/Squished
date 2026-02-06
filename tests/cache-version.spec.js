const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Cache Version Consistency', () => {
  // These tests read source files directly - no browser needed
  // They run the same in both Desktop and iPhone projects but that's fine

  const projectRoot = path.join(__dirname, '..');

  test('all three asset references in index.html have the same version', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

    // Extract all ?v= versions from asset references
    const versionMatches = html.match(/\?v=(\d+)/g);
    expect(versionMatches).toBeTruthy();
    expect(versionMatches.length).toBeGreaterThanOrEqual(3);

    // Extract just the numbers
    const versions = versionMatches.map(m => m.replace('?v=', ''));

    // All should be the same
    const uniqueVersions = [...new Set(versions)];
    expect(uniqueVersions.length).toBe(1);
  });

  test('styles.css, content-loader.js, and script.js references all match', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

    const stylesMatch = html.match(/styles\.css\?v=(\d+)/);
    const contentLoaderMatch = html.match(/content-loader\.js\?v=(\d+)/);
    const scriptMatch = html.match(/script\.js\?v=(\d+)/);

    expect(stylesMatch).toBeTruthy();
    expect(contentLoaderMatch).toBeTruthy();
    expect(scriptMatch).toBeTruthy();

    expect(stylesMatch[1]).toBe(contentLoaderMatch[1]);
    expect(stylesMatch[1]).toBe(scriptMatch[1]);
  });

  test('version number in .version-number span matches asset versions', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

    // Get asset version
    const assetVersion = html.match(/styles\.css\?v=(\d+)/)[1];

    // Get display version from the span
    const displayVersion = html.match(/<span class="version-number">v(\d+)<\/span>/);
    expect(displayVersion).toBeTruthy();

    expect(displayVersion[1]).toBe(assetVersion);
  });

  test('CLAUDE.md version matches index.html versions', () => {
    const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');
    const claudeMd = fs.readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf-8');

    // Get asset version from index.html
    const assetVersion = html.match(/styles\.css\?v=(\d+)/)[1];

    // Get version from CLAUDE.md (format: "Current version: **vNN**")
    const claudeVersion = claudeMd.match(/Current version:\s*\*\*v(\d+)\*\*/);
    expect(claudeVersion).toBeTruthy();

    expect(claudeVersion[1]).toBe(assetVersion);
  });
});
