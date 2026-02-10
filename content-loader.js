/**
 * Content Loader for Squished Book Viewer
 * Loads book content from markdown files and generates HTML pages dynamically
 */

(function() {
    'use strict';

    const CONFIG = {
        contentPath: 'book-content.md',
        pictureContentPath: 'picture-content.md',
        amazonPath: 'amazon.md',
        coverImage: 'images/harold-happy.png'
    };

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Fetch text content from a file (with cache busting)
    async function fetchContent(path) {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to fetch ${path}`);
        return response.text();
    }

    // Parse amazon.md format: "Label URL" per line
    function parseAmazonLinks(content) {
        const lines = content.trim().split('\n').filter(l => l && !l.startsWith('#'));
        return lines.map(line => {
            const match = line.match(/^(.+?)\s+(https?:\/\/.+)$/);
            if (match) {
                return { label: match[1].trim(), url: match[2].trim() };
            }
            return null;
        }).filter(Boolean);
    }

    // Parse endorsement quotes from markdown
    function parseQuotes(section) {
        const quotes = [];
        const quoteRegex = />\s*"([^"]+)"\s*>\s*—\s*(.+)/g;
        let match;
        while ((match = quoteRegex.exec(section)) !== null) {
            quotes.push({ text: match[1], author: match[2].trim() });
        }
        return quotes;
    }

    // Parse paragraphs from a story section
    function parseParagraphs(section) {
        // Remove any ## headers
        const cleaned = section.replace(/^##.+$/gm, '').trim();
        // Split by double newlines and filter empty
        return cleaned.split(/\n\n+/).map(p => p.trim()).filter(p => p);
    }

    // Parse the entire book-content.md
    function parseBookContent(content) {
        const sections = content.split(/\n---\n/).map(s => s.trim());
        const book = {
            title: 'SQUISHED',
            subtitle: 'A Kids Book for Grown Ups',
            author: 'Clarke Ching',
            quotes: [],
            storySections: [],
            endingParagraphs: [],
            authorNoteParagraphs: [],
            authorSignature: ''
        };

        sections.forEach((section, index) => {
            if (section.startsWith('# SQUISHED')) {
                // Title section - extract metadata if needed
                return;
            }

            if (section.startsWith('## Endorsements')) {
                book.quotes = parseQuotes(section);
                return;
            }

            if (section.startsWith('## The Story')) {
                // Skip the header, get first story section
                const paragraphs = parseParagraphs(section);
                if (paragraphs.length > 0) {
                    book.storySections.push({ paragraphs, isNewSection: true });
                }
                return;
            }

            if (section.startsWith('## One Last Thing')) {
                book.endingParagraphs = parseParagraphs(section);
                return;
            }

            if (section.startsWith("## A Note From Clarke")) {
                const paragraphs = parseParagraphs(section);
                // Check for signature (starts with **)
                const sigIndex = paragraphs.findIndex(p => p.startsWith('**'));
                if (sigIndex !== -1) {
                    book.authorSignature = paragraphs[sigIndex].replace(/\*\*/g, '');
                    book.authorNoteParagraphs = paragraphs.slice(0, sigIndex);
                } else {
                    book.authorNoteParagraphs = paragraphs;
                }
                return;
            }

            // Regular story section (just paragraphs)
            const paragraphs = parseParagraphs(section);
            if (paragraphs.length > 0) {
                book.storySections.push({ paragraphs, isNewSection: true });
            }
        });

        return book;
    }

    // Generate title page HTML
    function generateTitlePage() {
        return `
            <div class="page" data-page="1">
                <div class="page-content title-page">
                    <h1 class="book-title">SQUISHED</h1>
                    <p class="book-subtitle">A Kids Book for Grown Ups</p>
                    <img src="${CONFIG.coverImage}" alt="Harold the hermit crab, happy in his shell on the beach" class="title-cover-image">
                    <p class="book-author">by Clarke Ching</p>
                </div>
            </div>
        `;
    }

    // Generate quotes page HTML
    function generateQuotesPage(quotes) {
        const quoteHtml = quotes.map(q => {
            // Split author into name and title at the first comma
            const commaIndex = q.author.indexOf(',');
            let citeHtml;
            if (commaIndex !== -1) {
                const name = q.author.substring(0, commaIndex).trim();
                const title = q.author.substring(commaIndex + 1).trim();
                citeHtml = `<span class="cite-name">— ${escapeHtml(name)}</span><span class="cite-title">${escapeHtml(title)}</span>`;
            } else {
                citeHtml = `<span class="cite-name">— ${escapeHtml(q.author)}</span>`;
            }
            return `
            <blockquote class="endorsement-quote">
                <p>"${escapeHtml(q.text)}"</p>
                <cite>${citeHtml}</cite>
            </blockquote>
        `;
        }).join('\n');

        return `
            <div class="page" data-page="2">
                <div class="page-content quotes-page">
                    ${quoteHtml}
                </div>
            </div>
        `;
    }

    // Generate a story page HTML
    function generateStoryPage(paragraphs, pageNum, storyPageNum, isFirstOfSection) {
        const pTags = paragraphs.map((p, i) => {
            const className = (i === 0 && isFirstOfSection) ? ' class="drop-cap"' : '';
            return `<p${className}>${escapeHtml(p)}</p>`;
        }).join('\n                    ');

        return `
            <div class="page" data-page="${pageNum}">
                <div class="page-content story-page">
                    ${pTags}
                </div>
                <div class="page-number">${storyPageNum}</div>
            </div>
        `;
    }

    // Generate ending page HTML
    function generateEndingPage(paragraphs, pageNum, storyPageNum) {
        const pTags = paragraphs.map((p, i) => {
            const cls = (i === paragraphs.length - 1) ? ' class="part2-prompt"' : '';
            return `<p${cls}>${escapeHtml(p)}</p>`;
        }).join('\n                    ');

        return `
            <div class="page" data-page="${pageNum}">
                <div class="page-content ending-page">
                    <h2 class="section-title">ONE LAST THING...</h2>
                    ${pTags}
                </div>
                <div class="page-number">${storyPageNum}</div>
            </div>
        `;
    }

    // Generate author note pages HTML (picture-book style)
    function generateAuthorNotePages(paragraphs, signature, pageNum, amazonLinks) {
        // Format paragraphs with links
        function formatParagraph(p) {
            const escaped = escapeHtml(p);
            if (escaped.includes('unsquish.me')) {
                const withLink = escaped.replace(
                    'unsquish.me',
                    '<a href="https://unsquish.me" class="share-url" target="_blank" rel="noopener">unsquish.me</a>'
                );
                return `<p class="share-paragraph">${withLink} <button class="copy-url-btn" onclick="navigator.clipboard.writeText('https://unsquish.me').then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy link', 2000); })">Copy link</button></p>`;
            }
            if (escaped.includes('clarke@clarkeching.com')) {
                const withMailto = escaped.replace(
                    'clarke@clarkeching.com',
                    '<a href="mailto:clarke@clarkeching.com">clarke@clarkeching.com</a>'
                );
                return `<p>${withMailto}</p>`;
            }
            return `<p>${escaped}</p>`;
        }

        const pages = [];
        const ver = window.__squished_version || 131;

        // Get a preview of the first paragraph - first sentence + ellipsis
        const firstPara = paragraphs.length > 0 ? escapeHtml(paragraphs[0]) : '';
        const firstSentenceEnd = firstPara.indexOf('. ');
        const preview = firstSentenceEnd > 0
            ? firstPara.substring(0, firstSentenceEnd + 1)
            : firstPara.substring(0, 80);

        // Page 1: Title, image, and text preview as hook
        pages.push(`
            <div class="page" data-page="${pageNum}">
                <div class="page-content picture-page author-note-picture">
                    <p class="picture-caption author-note-title">A Note From Clarke — The Grown-Up Bit</p>
                    <div class="picture-frame">
                        <img src="images/photo.jpeg?v=${ver}" alt="Clarke Ching" class="picture-image">
                    </div>
                    <p class="author-note-preview">${preview} <span class="author-note-more">… more</span></p>
                </div>
            </div>
        `);
        pageNum++;

        // Text pages: 2 paragraphs per page, styled like picture captions
        for (let i = 0; i < paragraphs.length; i += 2) {
            const chunk = paragraphs.slice(i, i + 2).map(formatParagraph).join('\n                    ');
            pages.push(`
            <div class="page" data-page="${pageNum}">
                <div class="page-content author-note-text">
                    ${chunk}
                </div>
            </div>
            `);
            pageNum++;
        }

        // Amazon links - append to the last text page
        if (amazonLinks && amazonLinks.length > 0 && pages.length > 1) {
            const linksHtml = amazonLinks.map(l =>
                `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
            ).join(' · ');
            const amazonHtml = `<div class="amazon-links"><p class="amazon-label">Buy the book:</p><p class="amazon-stores">${linksHtml}</p></div>`;
            // Insert amazon HTML before the closing divs of the last page
            const lastPage = pages[pages.length - 1];
            pages[pages.length - 1] = lastPage.replace(
                /<\/div>\s*<\/div>\s*$/,
                amazonHtml + '\n                </div>\n            </div>\n'
            );
        }

        return pages.join('\n');
    }

    // Generate all pages HTML
    function generateAllPages(book, amazonLinks) {
        const pages = [];
        let pageNum = 1;
        let storyPageNum = 1;

        // Title page
        pages.push(generateTitlePage());
        pageNum++;

        // Quotes page
        if (book.quotes.length > 0) {
            pages.push(generateQuotesPage(book.quotes));
            pageNum++;
        }

        // Story pages - one page per section for now
        // The script.js pagination will split them further if needed
        book.storySections.forEach((section, sectionIndex) => {
            pages.push(generateStoryPage(
                section.paragraphs,
                pageNum,
                storyPageNum,
                section.isNewSection
            ));
            pageNum++;
            storyPageNum++;
        });

        // Ending page
        if (book.endingParagraphs.length > 0) {
            pages.push(generateEndingPage(book.endingParagraphs, pageNum, storyPageNum));
            pageNum++;
            storyPageNum++;
        }

        // Author note pages (spread across 2 pages)
        pages.push(generateAuthorNotePages(
            book.authorNoteParagraphs,
            book.authorSignature,
            pageNum,
            amazonLinks
        ));

        return pages.join('\n');
    }

    // Parse picture-content.md into slides
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

    // Generate a single picture page HTML
    function generatePicturePage(slide, pageNum) {
        return `
            <div class="page" data-page="${pageNum}">
                <div class="page-content picture-page">
                    <div class="picture-frame">
                        <img src="${escapeHtml(slide.image)}?v=${window.__squished_version || 119}" alt="${escapeHtml(slide.caption)}" class="picture-image" loading="lazy" onerror="this.parentElement.classList.add('image-missing')">
                        <div class="picture-placeholder">Image: ${escapeHtml(slide.image)}</div>
                    </div>
                    <p class="picture-caption">${escapeHtml(slide.caption)}</p>
                </div>
            </div>
        `;
    }

    // Generate all picture mode pages
    function generateAllPicturePages(slides, book, amazonLinks) {
        const pages = [];
        let pageNum = 1;

        // Title page (same as text mode)
        pages.push(generateTitlePage());
        pageNum++;

        // Quotes page (same as text mode)
        if (book.quotes.length > 0) {
            pages.push(generateQuotesPage(book.quotes));
            pageNum++;
        }

        // Picture slides
        slides.forEach(slide => {
            pages.push(generatePicturePage(slide, pageNum));
            pageNum++;
        });

        // Ending page (same as text mode)
        let storyPageNum = pageNum - 1;
        if (book.endingParagraphs.length > 0) {
            pages.push(generateEndingPage(book.endingParagraphs, pageNum, storyPageNum));
            pageNum++;
            storyPageNum++;
        }

        // Author note pages (same as text mode, spread across 2 pages)
        pages.push(generateAuthorNotePages(
            book.authorNoteParagraphs,
            book.authorSignature,
            pageNum,
            amazonLinks
        ));

        return pages.join('\n');
    }

    // Main initialization
    async function init() {
        const book = document.querySelector('.book');
        if (!book) {
            // Book container not found
            document.dispatchEvent(new CustomEvent('contentLoaded'));
            return;
        }

        // Store original content as fallback
        const originalContent = book.innerHTML;

        try {
            // Fetch all files in parallel (picture content is optional)
            const [bookContent, amazonContent, pictureContent] = await Promise.all([
                fetchContent(CONFIG.contentPath),
                fetchContent(CONFIG.amazonPath),
                fetchContent(CONFIG.pictureContentPath).catch(() => null)
            ]);

            // Parse content
            const parsedBook = parseBookContent(bookContent);
            const amazonLinks = parseAmazonLinks(amazonContent);
            const pictureSlides = pictureContent ? parsePictureContent(pictureContent) : [];

            // Validate we have content
            if (!parsedBook.storySections || parsedBook.storySections.length === 0) {
                throw new Error('No story content parsed');
            }

            // Generate both HTML sets
            const textHtml = generateAllPages(parsedBook, amazonLinks);
            const pictureHtml = pictureSlides.length > 0
                ? generateAllPicturePages(pictureSlides, parsedBook, amazonLinks)
                : null;

            // Store for mode switching
            window.__squished_textHtml = textHtml;
            window.__squished_pictureHtml = pictureHtml;
            window.__squished_hasPictureMode = pictureHtml !== null;

            // Determine initial mode - always prefer picture mode when available
            const initialMode = pictureHtml ? 'picture' : 'text';
            const initialHtml = initialMode === 'picture' ? pictureHtml : textHtml;

            // Only replace if we have valid content
            if (initialHtml && initialHtml.trim().length > 100) {
                book.innerHTML = initialHtml;
                // Content loaded successfully
            } else {
                throw new Error('Generated HTML is empty or too short');
            }

        } catch (error) {
            // Content loading failed, using fallback
            // Restore original hardcoded content if it was cleared
            if (!book.innerHTML || book.innerHTML.trim().length < 100) {
                book.innerHTML = originalContent;
            }
        }

        // Signal that content is ready
        const savedMode = localStorage.getItem('squished-viewMode');
        const hasPicture = window.__squished_hasPictureMode || false;
        const mode = (savedMode === 'text') ? 'text' : (hasPicture ? 'picture' : 'text');
        document.dispatchEvent(new CustomEvent('contentLoaded', {
            detail: { mode: mode, hasPictureMode: hasPicture }
        }));
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
