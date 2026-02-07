// Cache version consistency tests — pure Node, no browser needed.
// Run with: node --test tests/cache-version.test.js

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

describe('Cache Version Consistency', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf-8');

  it('all three asset references in index.html have the same version', () => {
    const versionMatches = html.match(/\?v=(\d+)/g);
    assert.ok(versionMatches, 'Expected ?v= version params in index.html');
    assert.ok(versionMatches.length >= 3, `Expected at least 3 version params, found ${versionMatches.length}`);

    const versions = versionMatches.map(m => m.replace('?v=', ''));
    const uniqueVersions = [...new Set(versions)];
    assert.equal(uniqueVersions.length, 1, `Expected all versions to match, found: ${versions.join(', ')}`);
  });

  it('styles.css, content-loader.js, and script.js references all match', () => {
    const stylesMatch = html.match(/styles\.css\?v=(\d+)/);
    const contentLoaderMatch = html.match(/content-loader\.js\?v=(\d+)/);
    const scriptMatch = html.match(/script\.js\?v=(\d+)/);

    assert.ok(stylesMatch, 'styles.css version not found');
    assert.ok(contentLoaderMatch, 'content-loader.js version not found');
    assert.ok(scriptMatch, 'script.js version not found');

    assert.equal(stylesMatch[1], contentLoaderMatch[1],
      `styles.css v${stylesMatch[1]} !== content-loader.js v${contentLoaderMatch[1]}`);
    assert.equal(stylesMatch[1], scriptMatch[1],
      `styles.css v${stylesMatch[1]} !== script.js v${scriptMatch[1]}`);
  });

  it('version number in .version-number span matches asset versions', () => {
    const assetVersion = html.match(/styles\.css\?v=(\d+)/)[1];
    const displayVersion = html.match(/<span class="version-number">v(\d+)<\/span>/);

    assert.ok(displayVersion, 'Display version span not found in index.html');
    assert.equal(displayVersion[1], assetVersion,
      `Display v${displayVersion[1]} !== asset v${assetVersion}`);
  });

  it('CLAUDE.md version matches index.html versions', () => {
    const claudeMd = fs.readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf-8');
    const assetVersion = html.match(/styles\.css\?v=(\d+)/)[1];
    const claudeVersion = claudeMd.match(/Current version:\s*\*\*v(\d+)\*\*/);

    assert.ok(claudeVersion, 'Version not found in CLAUDE.md (expected "Current version: **vNN**")');
    assert.equal(claudeVersion[1], assetVersion,
      `CLAUDE.md v${claudeVersion[1]} !== index.html v${assetVersion}`);
  });
});
