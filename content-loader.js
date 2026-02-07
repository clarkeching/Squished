/**
 * Content Loader for Squished Book Viewer
 * Loads book content from markdown files and generates HTML pages dynamically
 */

(function() {
    'use strict';

    const CONFIG = {
        contentPath: 'book-content.md',
        amazonPath: 'amazon.md',
        shellImage: 'shell.jpg'
    };

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Fetch text content from a file
    async function fetchContent(path) {
        const response = await fetch(path);
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
                    <img src="${CONFIG.shellImage}" alt="A beautiful spiral shell" class="title-shell">
                    <p class="book-author">by Clarke Ching</p>
                </div>
            </div>
        `;
    }

    // Generate quotes page HTML
    function generateQuotesPage(quotes) {
        const quoteHtml = quotes.map(q => `
            <blockquote class="endorsement-quote">
                <p>"${escapeHtml(q.text)}"</p>
                <cite>— ${escapeHtml(q.author)}</cite>
            </blockquote>
        `).join('\n');

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

    // Generate author note page HTML
    function generateAuthorNotePage(paragraphs, signature, pageNum, amazonLinks) {
        // Add clickable link and copy button to paragraph containing the share URL
        const pTags = paragraphs.map(p => {
            const escaped = escapeHtml(p);
            if (escaped.includes('unsquish.me')) {
                // Replace the URL text with a clickable link
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
        }).join('\n                    ');

        // Amazon links section
        let amazonHtml = '';
        if (amazonLinks && amazonLinks.length > 0) {
            const linksHtml = amazonLinks.map(l =>
                `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
            ).join(' · ');
            amazonHtml = `<div class="amazon-links"><p class="amazon-label">Buy the book:</p><p class="amazon-stores">${linksHtml}</p></div>`;
        }

        return `
            <div class="page" data-page="${pageNum}">
                <div class="page-content author-note">
                    <h2 class="section-title">A NOTE FROM CLARKE — THE GROWN-UP BIT</h2>
                    ${pTags}
                    <p class="author-signature">${escapeHtml(signature).replace(/\n/g, '<br>')}</p>
                    ${amazonHtml}
                </div>
            </div>
        `;
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

        // Author note page
        pages.push(generateAuthorNotePage(
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
            console.error('Book container not found');
            document.dispatchEvent(new CustomEvent('contentLoaded'));
            return;
        }

        // Store original content as fallback
        const originalContent = book.innerHTML;

        try {
            // Fetch both files in parallel
            const [bookContent, amazonContent] = await Promise.all([
                fetchContent(CONFIG.contentPath),
                fetchContent(CONFIG.amazonPath)
            ]);

            // Parse content
            const parsedBook = parseBookContent(bookContent);
            const amazonLinks = parseAmazonLinks(amazonContent);

            // Validate we have content
            if (!parsedBook.storySections || parsedBook.storySections.length === 0) {
                throw new Error('No story content parsed');
            }

            // Generate and insert HTML
            const pagesHtml = generateAllPages(parsedBook, amazonLinks);

            // Only replace if we have valid content
            if (pagesHtml && pagesHtml.trim().length > 100) {
                book.innerHTML = pagesHtml;
                console.log('Content loaded from markdown files');
            } else {
                throw new Error('Generated HTML is empty or too short');
            }

            // Amazon links are shown in the Author's Note page (generated by generateAuthorNotePage)

        } catch (error) {
            console.warn('Content loading failed, using fallback:', error);
            // Restore original hardcoded content if it was cleared
            if (!book.innerHTML || book.innerHTML.trim().length < 100) {
                book.innerHTML = originalContent;
            }
        }

        // Signal that content is ready
        document.dispatchEvent(new CustomEvent('contentLoaded'));
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
