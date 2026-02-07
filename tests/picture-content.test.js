const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Replicate the parser logic from content-loader.js for testing
function parsePictureContent(content) {
    const sections = content.split(/\n---\n/).map(s => s.trim());
    const slides = [];

    sections.forEach(section => {
        if (!section || section.startsWith('# ')) return;
        const lines = section.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;
        const imageMatch = lines[0].match(/^!\[([^\]]+)\]$/);
        if (imageMatch) {
            slides.push({
                image: imageMatch[1],
                caption: lines.slice(1).join(' ')
            });
        }
    });

    return slides;
}

describe('Picture Content Parser', () => {
    it('parses image and caption from a section', () => {
        const input = '# Picture Book\n\n---\n\n![image1.jpg]\nCaption text.';
        const result = parsePictureContent(input);
        assert.equal(result.length, 1);
        assert.equal(result[0].image, 'image1.jpg');
        assert.equal(result[0].caption, 'Caption text.');
    });

    it('allows same image on multiple pages', () => {
        const input = '# Picture Book\n\n---\n\n![shell.jpg]\nFirst caption.\n\n---\n\n![shell.jpg]\nSecond caption.';
        const result = parsePictureContent(input);
        assert.equal(result.length, 2);
        assert.equal(result[0].image, 'shell.jpg');
        assert.equal(result[1].image, 'shell.jpg');
        assert.equal(result[0].caption, 'First caption.');
        assert.equal(result[1].caption, 'Second caption.');
    });

    it('joins multi-line captions into one string', () => {
        const input = '# Picture Book\n\n---\n\n![img.jpg]\nLine one.\nLine two.\nLine three.';
        const result = parsePictureContent(input);
        assert.equal(result.length, 1);
        assert.equal(result[0].caption, 'Line one. Line two. Line three.');
    });

    it('skips header section', () => {
        const input = '# Picture Book\n\nSome description here.\n\n---\n\n![img.jpg]\nCaption.';
        const result = parsePictureContent(input);
        assert.equal(result.length, 1);
    });

    it('handles empty sections gracefully', () => {
        const input = '# Picture Book\n\n---\n\n\n\n---\n\n![img.jpg]\nCaption.';
        const result = parsePictureContent(input);
        assert.equal(result.length, 1);
    });

    it('handles sections without image syntax', () => {
        const input = '# Picture Book\n\n---\n\nJust some text without an image.\n\n---\n\n![img.jpg]\nCaption.';
        const result = parsePictureContent(input);
        assert.equal(result.length, 1);
    });

    it('parses the actual picture-content.md file', () => {
        const filePath = path.join(__dirname, '..', 'picture-content.md');
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = parsePictureContent(content);

        // Should have multiple slides
        assert.ok(result.length > 10, `Expected more than 10 slides, got ${result.length}`);

        // Every slide should have both image and caption
        result.forEach((slide, i) => {
            assert.ok(slide.image, `Slide ${i} missing image`);
            assert.ok(slide.caption, `Slide ${i} missing caption`);
            assert.ok(slide.image.startsWith('images/'), `Slide ${i} image should start with images/`);
        });

        // First slide should be Harold
        assert.ok(result[0].image.includes('harold'), 'First slide should feature Harold');
    });
});
