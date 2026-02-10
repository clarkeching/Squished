/**
 * SQUISHED - Book Viewer JavaScript
 * Handles page navigation, theme switching, touch gestures, and auto-pagination
 */

(function() {
    'use strict';

    // ========================================
    // STATE
    // ========================================
    const state = {
        currentScreen: 1,
        totalScreens: 0,
        currentTheme: 'minimal',
        viewMode: 'picture', // 'text' or 'picture'
        textCurrentScreen: 1,
        pictureCurrentScreen: 1,
        touchStartX: 0,
        touchEndX: 0,
        isAnimating: false,
        screenMap: [], // Maps screen number to { pageNum, startParagraph, endParagraph }
        paginationCache: {} // Cache pagination per theme+mode combo
    };

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const elements = {
        pages: null,
        prevBtn: null,
        nextBtn: null,
        startBtn: null,
        currentPageEl: null,
        totalPagesEl: null,
        themeBtns: null,
        swipeHint: null,
        book: null
    };

    // ========================================
    // INITIALIZATION
    // ========================================
    function init() {
        // Cache DOM elements
        elements.pages = document.querySelectorAll('.page');
        elements.prevBtn = document.getElementById('prevBtn');
        elements.nextBtn = document.getElementById('nextBtn');
        elements.startBtn = document.getElementById('startBtn');
        elements.currentPageEl = document.getElementById('currentPage');
        elements.totalPagesEl = document.getElementById('totalPages');
        elements.themeBtns = document.querySelectorAll('.theme-btn');
        elements.swipeHint = document.getElementById('swipeHint');
        elements.book = document.querySelector('.book');

        // Load saved state
        loadState();

        // Calculate pagination for current theme
        calculatePagination();

        // Show initial screen
        showScreen(state.currentScreen);

        // Bind events
        bindEvents();

        // Show swipe hint on mobile
        showSwipeHint();

        // Initialize underwater effects for playful theme
        initUnderwaterEffects();
    }

    // ========================================
    // STATE PERSISTENCE
    // ========================================
    function loadState() {
        try {
            const savedTheme = localStorage.getItem('squished-theme');
            const savedMode = localStorage.getItem('squished-viewMode');
            const savedTextScreen = localStorage.getItem('squished-textScreen');
            const savedPictureScreen = localStorage.getItem('squished-pictureScreen');

            if (savedTheme && ['playful', 'minimal'].includes(savedTheme)) {
                state.currentTheme = savedTheme;
                setThemeClass(savedTheme);
            }

            if (savedMode && ['text', 'picture'].includes(savedMode)) {
                state.viewMode = savedMode;
            }

            if (savedTextScreen) {
                const screen = parseInt(savedTextScreen, 10);
                if (screen >= 1) state.textCurrentScreen = screen;
            }

            if (savedPictureScreen) {
                const screen = parseInt(savedPictureScreen, 10);
                if (screen >= 1) state.pictureCurrentScreen = screen;
            }

            // Set currentScreen based on active mode
            state.currentScreen = state.viewMode === 'picture'
                ? state.pictureCurrentScreen
                : state.textCurrentScreen;
        } catch (e) {
            // localStorage not available
        }
    }

    function saveState() {
        try {
            localStorage.setItem('squished-theme', state.currentTheme);
            localStorage.setItem('squished-viewMode', state.viewMode);
            if (state.viewMode === 'text') {
                localStorage.setItem('squished-textScreen', state.currentScreen);
            } else {
                localStorage.setItem('squished-pictureScreen', state.currentScreen);
            }
        } catch (e) {
            // localStorage not available
        }
    }

    // ========================================
    // PAGINATION CALCULATION
    // ========================================
    function getCacheKey() {
        return `${state.currentTheme}-${state.viewMode}`;
    }

    function calculatePagination() {
        const cacheKey = getCacheKey();
        // Check cache first
        if (state.paginationCache[cacheKey]) {
            state.screenMap = state.paginationCache[cacheKey];
            state.totalScreens = state.screenMap.length;
            elements.totalPagesEl.textContent = state.totalScreens;
            return;
        }

        state.screenMap = [];
        let screenNum = 0;

        elements.pages.forEach((page, pageIndex) => {
            const pageNum = pageIndex + 1;
            const content = page.querySelector('.page-content');

            // For pages without content div or title page, one screen per page
            if (!content) {
                screenNum++;
                state.screenMap.push({
                    pageNum: pageNum,
                    startParagraph: 0,
                    endParagraph: -1, // -1 means show all
                    isStoryPage: false
                });
                return;
            }

            // Check if this is a page that needs pagination (has paragraphs)
            const isStoryPage = content.classList.contains('story-page');
            const isAuthorNote = content.classList.contains('author-note');

            // Title page and picture pages don't need pagination
            if (content.classList.contains('title-page') || content.classList.contains('picture-page')) {
                screenNum++;
                state.screenMap.push({
                    pageNum: pageNum,
                    startParagraph: 0,
                    endParagraph: -1,
                    isStoryPage: false
                });
                return;
            }

            // For content pages, calculate how many screens needed
            // Exclude paragraphs inside .amazon-links from pagination (handled separately)
            const paragraphs = content.querySelectorAll('p:not(.amazon-links p)');
            const needsPagination = isStoryPage || isAuthorNote;

            if (paragraphs.length === 0) {
                screenNum++;
                state.screenMap.push({
                    pageNum: pageNum,
                    startParagraph: 0,
                    endParagraph: -1,
                    isStoryPage: false
                });
                return;
            }

            // Temporarily show the page to measure
            const wasActive = page.classList.contains('active');
            page.style.visibility = 'hidden';
            page.classList.add('active');

            // Get available height (visible area minus padding, page number, and fixed overlays)
            const pageRect = page.getBoundingClientRect();
            const pageStyle = window.getComputedStyle(page);
            const paddingTop = parseFloat(pageStyle.paddingTop);
            const paddingBottom = parseFloat(pageStyle.paddingBottom);
            const pageNumberEl = page.querySelector('.page-number');
            const pageNumberHeight = pageNumberEl ? pageNumberEl.offsetHeight + 24 : 40; // Include margin

            // Account for fixed header and share tray overlapping the page
            const header = document.querySelector('.site-header');
            const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
            const shareTray = document.getElementById('shareTray');
            const shareTrayTop = shareTray ? shareTray.getBoundingClientRect().top : window.innerHeight;

            // Content area boundaries (inside page padding, above page number)
            const contentTop = pageRect.top + paddingTop;
            const contentBottom = pageRect.bottom - paddingBottom - pageNumberHeight;

            // Clip to actually visible area (not behind fixed header or share tray)
            const visibleContentTop = Math.max(contentTop, headerBottom);
            const visibleContentBottom = Math.min(contentBottom, shareTrayTop);

            // Account for section title (h2) in ending/author pages
            const sectionTitle = content.querySelector('.section-title');
            const sectionTitleHeight = sectionTitle ? sectionTitle.offsetHeight + 16 : 0; // Include margin-bottom (1rem)

            // Account for author-note header (image + title) on first screen only
            const authorNoteHeader = content.querySelector('.author-note-header');
            const gap = parseFloat(window.getComputedStyle(content).gap) || 19.2;
            const authorNoteHeaderHeight = authorNoteHeader ? authorNoteHeader.offsetHeight + gap : 0;

            const baseAvailableHeight = visibleContentBottom - visibleContentTop - sectionTitleHeight - 20; // 20px buffer
            const firstScreenHeight = baseAvailableHeight - authorNoteHeaderHeight;

            // Measure amazon links height if present (shown on last screen)
            const amazonLinksEl = content.querySelector('.amazon-links');
            let amazonLinksHeight = 0;
            if (amazonLinksEl) {
                amazonLinksEl.classList.remove('hidden-overflow');
                amazonLinksHeight = amazonLinksEl.offsetHeight + 32 + 24; // margin-top (2rem) + padding-top (1.5rem)
            }

            // Clean up any split-paragraph wrappers/styles from previous renders
            content.querySelectorAll('.split-continuation').forEach(wrapper => {
                const child = wrapper.firstChild;
                if (child) {
                    child.style.marginTop = '';
                    wrapper.parentNode.insertBefore(child, wrapper);
                }
                wrapper.remove();
            });

            // Reset all paragraphs to visible for measurement
            paragraphs.forEach(p => {
                p.classList.remove('hidden-overflow');
                p.style.maxHeight = '';
                p.style.overflow = '';
            });

            // First pass: pack screens, splitting paragraphs across pages like a book
            const screenBreaks = [];
            let currentStart = 0;
            let currentHeight = 0;
            let startOffset = 0; // pixels to skip at top of first paragraph (continuation)
            let idx = 0;

            while (idx < paragraphs.length) {
                const availableHeight = screenBreaks.length === 0 ? firstScreenHeight : baseAvailableHeight;
                const pHeight = paragraphs[idx].offsetHeight;

                // For continuation paragraphs, only count the remaining (unshown) height
                const effectiveHeight = (idx === currentStart && startOffset > 0)
                    ? (pHeight - startOffset)
                    : pHeight;

                const gapBefore = (idx > currentStart) ? gap : 0;
                const heightWithGap = currentHeight + effectiveHeight + gapBefore;

                // Check if previous paragraph has keep-with-next
                const prevKeep = idx > currentStart && idx > 0 && paragraphs[idx - 1].hasAttribute('data-keep-with-next');

                if (heightWithGap <= availableHeight || prevKeep) {
                    // Fits on current screen
                    currentHeight = heightWithGap;
                    idx++;
                } else {
                    // Doesn't fit. Try to split this paragraph across pages.
                    const remainingSpace = availableHeight - currentHeight - gapBefore;
                    const lineHeight = parseFloat(window.getComputedStyle(paragraphs[idx]).lineHeight) || 28;

                    if (remainingSpace >= lineHeight * 2) {
                        // Enough space for at least 2 lines — split the paragraph
                        const clipHeight = Math.floor(remainingSpace / lineHeight) * lineHeight;
                        screenBreaks.push({
                            start: currentStart,
                            end: idx,
                            offsetStart: startOffset,
                            clipEndHeight: clipHeight
                        });
                        // Next screen continues with this same paragraph
                        startOffset = (idx === currentStart ? startOffset : 0) + clipHeight;
                        currentStart = idx;
                        currentHeight = 0;
                        // Don't increment idx — continue with this paragraph on next screen
                    } else if (idx > currentStart) {
                        // Not enough space to split — break before this paragraph
                        screenBreaks.push({
                            start: currentStart,
                            end: idx - 1,
                            offsetStart: startOffset
                        });
                        startOffset = 0;
                        currentStart = idx;
                        currentHeight = 0;
                    } else {
                        // Single paragraph, can't fit even 2 lines — show as-is and move on
                        screenBreaks.push({
                            start: idx,
                            end: idx,
                            offsetStart: startOffset
                        });
                        startOffset = 0;
                        currentStart = idx + 1;
                        currentHeight = 0;
                        idx++;
                    }
                }
            }
            // Add final screen
            if (currentStart < paragraphs.length) {
                screenBreaks.push({
                    start: currentStart,
                    end: paragraphs.length - 1,
                    offsetStart: startOffset
                });
            }

            // Second pass: if last screen has amazon links and they don't fit,
            // move paragraphs back until they do
            if (amazonLinksHeight > 0 && screenBreaks.length > 0) {
                let lastScreen = screenBreaks[screenBreaks.length - 1];
                let lastScreenHeight = 0;
                for (let i = lastScreen.start; i <= lastScreen.end; i++) {
                    lastScreenHeight += paragraphs[i].offsetHeight + (i > lastScreen.start ? gap : 0);
                }

                while (lastScreenHeight + amazonLinksHeight > baseAvailableHeight && lastScreen.start > 0) {
                    // Move first paragraph of last screen back to previous screen
                    if (screenBreaks.length > 1) {
                        screenBreaks[screenBreaks.length - 2].end = lastScreen.start;
                    } else {
                        // Need to create a new screen before this one
                        screenBreaks.unshift({ start: lastScreen.start, end: lastScreen.start });
                    }
                    lastScreen.start++;
                    // Recalculate last screen height
                    lastScreenHeight = 0;
                    for (let i = lastScreen.start; i <= lastScreen.end; i++) {
                        lastScreenHeight += paragraphs[i].offsetHeight + (i > lastScreen.start ? gap : 0);
                    }
                }
            }

            // Add all screens to screenMap
            screenBreaks.forEach(sb => {
                screenNum++;
                state.screenMap.push({
                    pageNum: pageNum,
                    startParagraph: sb.start,
                    endParagraph: sb.end,
                    isStoryPage: needsPagination,
                    offsetStart: sb.offsetStart || 0,
                    clipEndHeight: sb.clipEndHeight || 0
                });
            });

            // Restore page state
            if (!wasActive) {
                page.classList.remove('active');
            }
            page.style.visibility = '';
        });

        state.totalScreens = state.screenMap.length;
        elements.totalPagesEl.textContent = state.totalScreens;

        // Cache the result
        state.paginationCache[getCacheKey()] = [...state.screenMap];

        // Validate current screen
        if (state.currentScreen > state.totalScreens) {
            state.currentScreen = state.totalScreens;
        }
    }

    // ========================================
    // SCREEN NAVIGATION
    // ========================================
    function showScreen(screenNum) {
        if (screenNum < 1 || screenNum > state.totalScreens || state.isAnimating) {
            return;
        }

        state.isAnimating = true;
        window.__squished_animating = true;

        const screenInfo = state.screenMap[screenNum - 1];
        if (!screenInfo) {
            state.isAnimating = false;
            window.__squished_animating = false;
            return;
        }

        // Show target page
        const targetPage = document.querySelector(`.page[data-page="${screenInfo.pageNum}"]`);
        const oldActivePage = document.querySelector('.page.active');

        // Detect same-image condition: consecutive picture pages sharing the same image
        let sameImage = false;
        if (state.viewMode === 'picture' && oldActivePage && targetPage && oldActivePage !== targetPage) {
            const oldImg = oldActivePage.querySelector('.picture-image');
            const newImg = targetPage.querySelector('.picture-image');
            if (oldImg && newImg && oldImg.src && newImg.src && oldImg.src === newImg.src) {
                sameImage = true;
            }
        }

        // Clean up any lingering same-image classes from previous transitions
        document.querySelectorAll('.same-image-out, .same-image-in').forEach(el => {
            el.classList.remove('same-image-out', 'same-image-in');
        });

        if (sameImage) {
            // Same-image transition: keep image static, crossfade caption only
            oldActivePage.classList.remove('active');
            oldActivePage.classList.add('same-image-out');
            targetPage.classList.add('active', 'same-image-in');
            targetPage.scrollTop = 0;

            // Clean up after caption transition completes
            setTimeout(() => {
                oldActivePage.classList.remove('same-image-out');
                targetPage.classList.remove('same-image-in');
            }, 260);
        } else {
            // Normal transition: crossfade entire page
            elements.pages.forEach(page => {
                page.classList.remove('active', 'flipping');
            });

            if (targetPage) {
                targetPage.classList.add('active');
                targetPage.scrollTop = 0;
            }
        }

        if (targetPage) {

            // Handle paragraph visibility for story pages
            if (screenInfo.isStoryPage) {
                const content = targetPage.querySelector('.page-content');

                // Remove any existing continuation indicator
                const existingContinuation = content.querySelector('.page-continuation');
                if (existingContinuation) {
                    existingContinuation.remove();
                }

                // Clean up previous split-paragraph wrappers
                content.querySelectorAll('.split-continuation').forEach(wrapper => {
                    const child = wrapper.firstChild;
                    if (child) {
                        child.style.marginTop = '';
                        wrapper.parentNode.insertBefore(child, wrapper);
                    }
                    wrapper.remove();
                });

                const paragraphs = content.querySelectorAll('p:not(.amazon-links p)');

                // Clean up previous split clip styles
                paragraphs.forEach(p => {
                    p.style.maxHeight = '';
                    p.style.overflow = '';
                });

                paragraphs.forEach((p, i) => {
                    if (i >= screenInfo.startParagraph && i <= screenInfo.endParagraph) {
                        p.classList.remove('hidden-overflow');

                        // Split: clip bottom of last paragraph (show only lines that fit)
                        if (i === screenInfo.endParagraph && screenInfo.clipEndHeight) {
                            p.style.maxHeight = `${screenInfo.clipEndHeight}px`;
                            p.style.overflow = 'hidden';
                        }

                        // Split: offset first paragraph (continuation from previous page)
                        if (i === screenInfo.startParagraph && screenInfo.offsetStart) {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'split-continuation';
                            wrapper.style.overflow = 'hidden';
                            p.parentNode.insertBefore(wrapper, p);
                            wrapper.appendChild(p);
                            p.style.marginTop = `-${screenInfo.offsetStart}px`;
                        }
                    } else {
                        p.classList.add('hidden-overflow');
                    }
                });

                // Show/hide section title and author-note header on first screen only
                const isFirstScreen = screenInfo.startParagraph === 0 && !screenInfo.offsetStart;
                const sectionTitle = content.querySelector('.section-title');
                if (sectionTitle) {
                    if (isFirstScreen) {
                        sectionTitle.classList.remove('hidden-overflow');
                    } else {
                        sectionTitle.classList.add('hidden-overflow');
                    }
                }

                // Show/hide author-note header (image + title) on first screen only
                const authorNoteHeader = content.querySelector('.author-note-header');
                if (authorNoteHeader) {
                    if (isFirstScreen) {
                        authorNoteHeader.classList.remove('hidden-overflow');
                    } else {
                        authorNoteHeader.classList.add('hidden-overflow');
                    }
                }

                // Check if there's more content on this page (another screen)
                const nextScreen = state.screenMap[screenNum];
                const isLastScreenOfPage = !nextScreen || nextScreen.pageNum !== screenInfo.pageNum;

                // Show/hide amazon links - only on the last screen of this page
                const amazonLinks = content.querySelector('.amazon-links');
                if (amazonLinks) {
                    if (isLastScreenOfPage) {
                        amazonLinks.classList.remove('hidden-overflow');
                    } else {
                        amazonLinks.classList.add('hidden-overflow');
                    }
                }

                if (!isLastScreenOfPage) {
                    // Add continuation indicator
                    const continuation = document.createElement('div');
                    continuation.className = 'page-continuation';
                    continuation.textContent = '· · ·';
                    content.appendChild(continuation);
                }
            }
        }

        // Update state
        state.currentScreen = screenNum;
        elements.currentPageEl.textContent = screenNum;

        // Update buttons - hide entirely on first/last page
        const isFirst = screenNum === 1;
        const isLast = screenNum === state.totalScreens;
        elements.prevBtn.disabled = isFirst;
        elements.nextBtn.disabled = isLast;
        elements.prevBtn.style.visibility = isFirst ? 'hidden' : 'visible';
        elements.nextBtn.style.visibility = isLast ? 'hidden' : 'visible';

        // Save state
        saveState();

        // Reset animation flag
        setTimeout(() => {
            state.isAnimating = false;
            window.__squished_animating = false;
        }, 300);
    }

    function nextScreen() {
        if (state.currentScreen < state.totalScreens) {
            showScreen(state.currentScreen + 1);
        }
    }

    function prevScreen() {
        if (state.currentScreen > 1) {
            showScreen(state.currentScreen - 1);
        }
    }

    // ========================================
    // THEME SWITCHING
    // ========================================
    function setThemeClass(theme) {
        document.body.classList.remove('theme-playful', 'theme-minimal');
        document.body.classList.add(`theme-${theme}`);

        elements.themeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });
    }

    function setTheme(theme) {
        // Set theme class
        setThemeClass(theme);

        // Update state
        state.currentTheme = theme;

        // Recalculate pagination for new theme (font sizes differ)
        recalculateAfterStyleChange();

        saveState();
    }

    function recalculateAfterStyleChange() {
        // Small delay to let styles apply
        setTimeout(() => {
            // Find which original page we're on
            const currentScreenInfo = state.screenMap[state.currentScreen - 1];
            const currentPageNum = currentScreenInfo ? currentScreenInfo.pageNum : 1;

            // Recalculate
            calculatePagination();

            // Find first screen of the same page in new pagination
            let newScreen = 1;
            for (let i = 0; i < state.screenMap.length; i++) {
                if (state.screenMap[i].pageNum === currentPageNum) {
                    newScreen = i + 1;
                    break;
                }
            }

            state.currentScreen = newScreen;
            showScreen(state.currentScreen);
        }, 100);
    }

    // ========================================
    // EVENT HANDLING
    // ========================================
    function bindEvents() {
        // Navigation buttons
        elements.prevBtn.addEventListener('click', prevScreen);
        elements.nextBtn.addEventListener('click', nextScreen);
        if (elements.startBtn) {
            elements.startBtn.addEventListener('click', () => showScreen(1));
        }

        // Site branding click - go to start
        const siteBranding = document.getElementById('siteBranding');
        if (siteBranding) {
            siteBranding.addEventListener('click', () => showScreen(1));
        }

        // Theme buttons
        elements.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setTheme(btn.dataset.theme);
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyDown);

        // Touch/swipe navigation
        elements.book.addEventListener('touchstart', handleTouchStart, { passive: true });
        elements.book.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Click on page edges for navigation
        elements.book.addEventListener('click', handlePageClick);

        // Hide swipe hint on first interaction
        document.addEventListener('touchstart', hideSwipeHint, { once: true });
        document.addEventListener('click', hideSwipeHint, { once: true });

        // Recalculate on resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Clear all pagination caches
                state.paginationCache = {};
                calculatePagination();
                showScreen(state.currentScreen);
            }, 300);
        });
    }

    function handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                nextScreen();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                prevScreen();
                break;
            case 'Home':
                e.preventDefault();
                showScreen(1);
                break;
            case 'End':
                e.preventDefault();
                showScreen(state.totalScreens);
                break;
        }
    }

    function handleTouchStart(e) {
        state.touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        state.touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = state.touchStartX - state.touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next screen
                nextScreen();
            } else {
                // Swipe right - previous screen
                prevScreen();
            }
        }
    }

    function handlePageClick(e) {
        // Only handle clicks on the book itself, not on buttons
        if (e.target.closest('.nav-btn') || e.target.closest('.theme-btn')) {
            return;
        }

        const bookRect = elements.book.getBoundingClientRect();
        const clickX = e.clientX - bookRect.left;
        const bookWidth = bookRect.width;

        // Click on left 20% goes back, right 20% goes forward
        if (clickX < bookWidth * 0.2) {
            prevScreen();
        } else if (clickX > bookWidth * 0.8) {
            nextScreen();
        }
    }

    // ========================================
    // SWIPE HINT
    // ========================================
    function showSwipeHint() {
        // Only show on touch devices
        if ('ontouchstart' in window) {
            setTimeout(() => {
                elements.swipeHint.classList.add('visible');
            }, 1000);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                hideSwipeHint();
            }, 6000);
        }
    }

    function hideSwipeHint() {
        elements.swipeHint.classList.remove('visible');
    }

    // ========================================
    // UNDERWATER ANIMATIONS (Playful Theme)
    // ========================================
    function createBubbles() {
        const bubblesContainer = document.querySelector('.bubbles');
        if (!bubblesContainer) return;

        // Create 15 bubbles with random properties
        for (let i = 0; i < 15; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';

            // Random size between 10 and 40 pixels
            const size = Math.random() * 30 + 10;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;

            // Random horizontal position
            bubble.style.left = `${Math.random() * 100}%`;

            // Random animation duration (8-20 seconds)
            bubble.style.animationDuration = `${Math.random() * 12 + 8}s`;

            // Random delay so they don't all start at once
            bubble.style.animationDelay = `${Math.random() * 10}s`;

            bubblesContainer.appendChild(bubble);
        }
    }

    function createSeaCreatures() {
        const creaturesContainer = document.querySelector('.sea-creatures');
        if (!creaturesContainer) return;

        // SVG sea creatures
        const creatures = {
            fish1: `<svg viewBox="0 0 100 60" width="60" height="36">
                <ellipse cx="40" cy="30" rx="35" ry="20" fill="currentColor"/>
                <polygon points="80,30 100,15 100,45" fill="currentColor"/>
                <circle cx="20" cy="25" r="4" fill="rgba(255,255,255,0.5)"/>
                <path d="M35 15 Q40 5 50 15" stroke="currentColor" stroke-width="3" fill="none"/>
            </svg>`,
            fish2: `<svg viewBox="0 0 80 50" width="50" height="30">
                <ellipse cx="30" cy="25" rx="25" ry="15" fill="currentColor"/>
                <polygon points="60,25 80,10 80,40" fill="currentColor"/>
                <circle cx="15" cy="20" r="3" fill="rgba(255,255,255,0.5)"/>
            </svg>`,
            fish3: `<svg viewBox="0 0 90 55" width="55" height="33">
                <ellipse cx="35" cy="27" rx="30" ry="18" fill="currentColor"/>
                <polygon points="70,27 90,12 90,42" fill="currentColor"/>
                <circle cx="18" cy="22" r="4" fill="rgba(255,255,255,0.5)"/>
                <path d="M30 10 Q38 5 45 12" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M30 44 Q38 50 45 43" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>`,
            jellyfish: `<svg viewBox="0 0 60 80" width="45" height="60">
                <ellipse cx="30" cy="20" rx="25" ry="18" fill="currentColor"/>
                <path d="M10 25 Q15 50 10 70" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M20 28 Q25 55 18 75" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M30 30 Q30 60 28 80" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M40 28 Q35 55 42 75" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
                <path d="M50 25 Q45 50 50 70" stroke="currentColor" stroke-width="2" fill="none" opacity="0.7"/>
            </svg>`,
            starfish: `<svg viewBox="0 0 60 60" width="40" height="40">
                <polygon points="30,0 36,22 58,22 40,36 47,58 30,44 13,58 20,36 2,22 24,22" fill="currentColor"/>
            </svg>`,
            shell: `<svg viewBox="0 0 50 40" width="35" height="28">
                <path d="M5 35 Q5 10 25 5 Q45 10 45 35 Q35 30 25 35 Q15 30 5 35" fill="currentColor"/>
                <path d="M15 30 Q15 15 25 12" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/>
                <path d="M25 30 Q25 18 30 15" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/>
            </svg>`,
            crab: `<svg viewBox="0 0 70 50" width="50" height="35">
                <ellipse cx="35" cy="30" rx="20" ry="15" fill="currentColor"/>
                <circle cx="25" cy="20" r="6" fill="currentColor"/>
                <circle cx="45" cy="20" r="6" fill="currentColor"/>
                <circle cx="23" cy="17" r="2" fill="rgba(255,255,255,0.5)"/>
                <circle cx="43" cy="17" r="2" fill="rgba(255,255,255,0.5)"/>
                <ellipse cx="8" cy="28" rx="8" ry="5" fill="currentColor"/>
                <ellipse cx="62" cy="28" rx="8" ry="5" fill="currentColor"/>
            </svg>`,
            turtle: `<svg viewBox="0 0 80 60" width="55" height="40">
                <ellipse cx="40" cy="35" rx="30" ry="20" fill="currentColor"/>
                <circle cx="40" cy="35" r="18" fill="currentColor" opacity="0.7"/>
                <ellipse cx="15" cy="30" rx="10" ry="6" fill="currentColor"/>
                <circle cx="10" cy="28" r="2" fill="rgba(255,255,255,0.5)"/>
                <ellipse cx="65" cy="40" rx="8" ry="5" fill="currentColor"/>
                <ellipse cx="20" cy="50" rx="6" ry="4" fill="currentColor"/>
                <ellipse cx="60" cy="50" rx="6" ry="4" fill="currentColor"/>
            </svg>`,
            seahorse: `<svg viewBox="0 0 40 70" width="30" height="52">
                <path d="M20 5 Q30 10 25 25 Q35 30 30 45 Q25 55 20 65 Q15 60 18 50 Q10 45 15 35 Q5 30 15 20 Q10 10 20 5" fill="currentColor"/>
                <circle cx="22" cy="12" r="2" fill="rgba(255,255,255,0.5)"/>
            </svg>`,
            octopus: `<svg viewBox="0 0 70 60" width="50" height="43">
                <ellipse cx="35" cy="20" rx="20" ry="15" fill="currentColor"/>
                <circle cx="28" cy="17" r="3" fill="rgba(255,255,255,0.5)"/>
                <circle cx="42" cy="17" r="3" fill="rgba(255,255,255,0.5)"/>
                <path d="M15 30 Q10 45 5 55" stroke="currentColor" stroke-width="4" fill="none" opacity="0.8"/>
                <path d="M22 32 Q20 48 15 58" stroke="currentColor" stroke-width="4" fill="none" opacity="0.8"/>
                <path d="M30 34 Q30 50 28 60" stroke="currentColor" stroke-width="4" fill="none" opacity="0.8"/>
                <path d="M40 34 Q40 50 42 60" stroke="currentColor" stroke-width="4" fill="none" opacity="0.8"/>
                <path d="M48 32 Q50 48 55 58" stroke="currentColor" stroke-width="4" fill="none" opacity="0.8"/>
                <path d="M55 30 Q60 45 65 55" stroke="currentColor" stroke-width="4" fill="none" opacity="0.8"/>
            </svg>`
        };

        // Create various creatures at different positions - MORE CREATURES!
        const creatureConfigs = [
            // Swimming fish - more variety
            { type: 'fish1', top: '15%', color: '#5dade2', duration: 25, delay: 0 },
            { type: 'fish2', top: '35%', color: '#48c9b0', duration: 20, delay: 5 },
            { type: 'fish1', top: '55%', color: '#af7ac5', duration: 30, delay: 10 },
            { type: 'fish2', top: '70%', color: '#f5b041', duration: 22, delay: 3 },
            { type: 'fish3', top: '25%', color: '#e74c3c', duration: 28, delay: 8 },
            { type: 'fish3', top: '45%', color: '#3498db', duration: 18, delay: 12 },
            { type: 'fish1', top: '80%', color: '#1abc9c', duration: 35, delay: 15 },
            { type: 'fish2', top: '10%', color: '#9b59b6', duration: 24, delay: 7 },
            // Jellyfish - more floating around
            { type: 'jellyfish', top: '25%', left: '85%', color: '#f1948a', duration: 8, isJellyfish: true },
            { type: 'jellyfish', top: '45%', left: '8%', color: '#bb8fce', duration: 10, delay: 2, isJellyfish: true },
            { type: 'jellyfish', top: '65%', left: '75%', color: '#85c1e9', duration: 12, delay: 4, isJellyfish: true },
            { type: 'jellyfish', top: '15%', left: '20%', color: '#f5b7b1', duration: 9, delay: 6, isJellyfish: true },
            // Starfish - scattered on bottom
            { type: 'starfish', left: '85%', color: '#f5b041', duration: 6, delay: 0, isStarfish: true },
            { type: 'starfish', left: '25%', color: '#e74c3c', duration: 7, delay: 1, isStarfish: true },
            { type: 'starfish', left: '50%', color: '#ff6b6b', duration: 8, delay: 2, isStarfish: true },
            { type: 'starfish', left: '10%', color: '#feca57', duration: 5, delay: 3, isStarfish: true },
            // Shells on the seafloor
            { type: 'shell', left: '60%', bottom: '8%', color: '#fad7a0', isStatic: true },
            { type: 'shell', left: '30%', bottom: '5%', color: '#f5cba7', isStatic: true },
            { type: 'shell', left: '80%', bottom: '6%', color: '#fdebd0', isStatic: true },
            // Crabs walking
            { type: 'crab', left: '40%', bottom: '3%', color: '#e74c3c', duration: 4, isCrab: true },
            { type: 'crab', left: '70%', bottom: '4%', color: '#c0392b', duration: 5, isCrab: true },
            // New creatures!
            { type: 'turtle', top: '50%', color: '#27ae60', duration: 40, delay: 5 },
            { type: 'seahorse', top: '35%', left: '5%', color: '#f39c12', duration: 7, isSeahorse: true },
            { type: 'seahorse', top: '60%', left: '92%', color: '#e67e22', duration: 9, delay: 3, isSeahorse: true },
            { type: 'octopus', top: '75%', left: '15%', color: '#8e44ad', duration: 15, isOctopus: true }
        ];

        creatureConfigs.forEach(config => {
            const wrapper = document.createElement('div');
            wrapper.className = `creature ${config.type}`;
            wrapper.innerHTML = creatures[config.type];
            wrapper.style.color = config.color;

            if (config.top) wrapper.style.top = config.top;
            if (config.left) wrapper.style.left = config.left;
            if (config.bottom) wrapper.style.bottom = config.bottom;

            if (config.isJellyfish) {
                wrapper.classList.add('jellyfish');
                wrapper.style.animationDuration = `${config.duration}s`;
                if (config.delay) wrapper.style.animationDelay = `${config.delay}s`;
            } else if (config.isStarfish) {
                wrapper.classList.add('starfish');
                wrapper.style.animationDuration = `${config.duration}s`;
                if (config.delay) wrapper.style.animationDelay = `${config.delay}s`;
            } else if (config.isSeahorse) {
                wrapper.classList.add('seahorse');
                wrapper.style.animationDuration = `${config.duration}s`;
                if (config.delay) wrapper.style.animationDelay = `${config.delay}s`;
            } else if (config.isOctopus) {
                wrapper.classList.add('octopus');
                wrapper.style.animationDuration = `${config.duration}s`;
                if (config.delay) wrapper.style.animationDelay = `${config.delay}s`;
            } else if (config.isCrab) {
                // Crab just sits there looking cute
                wrapper.style.position = 'fixed';
                wrapper.style.opacity = '0.25';
            } else if (config.isStatic) {
                wrapper.style.position = 'fixed';
                wrapper.style.opacity = '0.2';
            } else {
                // Swimming fish (including turtle)
                wrapper.classList.add('fish');
                wrapper.style.animationDuration = `${config.duration}s`;
                if (config.delay) wrapper.style.animationDelay = `${config.delay}s`;
            }

            creaturesContainer.appendChild(wrapper);
        });
    }

    function initUnderwaterEffects() {
        createBubbles();
        createSeaCreatures();
    }

    // ========================================
    // VIEW MODE SWITCHING
    // ========================================
    function switchViewMode(newMode) {
        if (newMode === state.viewMode) return;
        if (!window.__squished_hasPictureMode && newMode === 'picture') return;

        // Save current screen position for current mode
        if (state.viewMode === 'text') {
            state.textCurrentScreen = state.currentScreen;
        } else {
            state.pictureCurrentScreen = state.currentScreen;
        }

        // Swap HTML content
        const book = document.querySelector('.book');
        if (newMode === 'picture') {
            book.innerHTML = window.__squished_pictureHtml;
        } else {
            book.innerHTML = window.__squished_textHtml;
        }

        // Update state
        state.viewMode = newMode;

        // Re-cache DOM elements (pages changed)
        elements.pages = document.querySelectorAll('.page');
        elements.book = document.querySelector('.book');

        // Re-bind touch/click events on the new book element
        elements.book.addEventListener('touchstart', handleTouchStart, { passive: true });
        elements.book.addEventListener('touchend', handleTouchEnd, { passive: true });
        elements.book.addEventListener('click', handlePageClick);

        // Recalculate pagination
        state.paginationCache = {};
        calculatePagination();

        // Reset to screen 1 for the new mode
        state.currentScreen = 1;

        // Update body class
        document.body.classList.remove('mode-text', 'mode-picture');
        document.body.classList.add(`mode-${newMode}`);

        // Update toggle button
        updateModeToggle();

        showScreen(state.currentScreen);
        saveState();
    }

    function createModeToggle() {
        if (!window.__squished_hasPictureMode) return;

        const toggle = document.createElement('button');
        toggle.id = 'modeToggle';
        toggle.className = 'mode-toggle';
        toggle.setAttribute('title', 'Switch between text and picture mode');

        // Insert into header, between branding and header-right
        const header = document.querySelector('.site-header');
        const headerRight = document.querySelector('.header-right');
        if (header && headerRight) {
            header.insertBefore(toggle, headerRight);
        }

        updateModeToggle();

        toggle.addEventListener('click', () => {
            const newMode = state.viewMode === 'text' ? 'picture' : 'text';
            switchViewMode(newMode);
        });
    }

    function updateModeToggle() {
        const toggle = document.getElementById('modeToggle');
        if (!toggle) return;

        if (state.viewMode === 'text') {
            toggle.textContent = 'Picture Mode';
        } else {
            toggle.textContent = 'Text Mode';
        }
    }

    // ========================================
    // START
    // ========================================
    function start() {
        // Check if content-loader.js is present
        const hasContentLoader = typeof window.contentLoaderActive !== 'undefined' ||
                                  document.querySelector('script[src*="content-loader"]');

        if (hasContentLoader) {
            // Wait for content-loader.js to finish before initializing
            document.addEventListener('contentLoaded', function(e) {
                const detail = e.detail || {};
                if (detail.mode === 'picture') {
                    state.viewMode = 'picture';
                    document.body.classList.add('mode-picture');
                } else {
                    document.body.classList.add('mode-text');
                }
                init();
                createModeToggle();
            });
        } else {
            // No content-loader, initialize immediately
            document.body.classList.add('mode-text');
            init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();
