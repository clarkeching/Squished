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
        currentSize: 'medium',
        touchStartX: 0,
        touchEndX: 0,
        isAnimating: false,
        screenMap: [], // Maps screen number to { pageNum, startParagraph, endParagraph }
        paginationCache: {} // Cache pagination per theme+size combo
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
        sizeBtns: null,
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
        elements.sizeBtns = document.querySelectorAll('.size-btn');
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
            const savedScreen = localStorage.getItem('squished-currentScreen');
            const savedTheme = localStorage.getItem('squished-theme');
            const savedSize = localStorage.getItem('squished-size');

            if (savedTheme && ['playful', 'minimal', 'book'].includes(savedTheme)) {
                state.currentTheme = savedTheme;
                setThemeClass(savedTheme);
            }

            if (savedSize && ['small', 'medium', 'large'].includes(savedSize)) {
                state.currentSize = savedSize;
                setSizeClass(savedSize);
            }

            if (savedScreen) {
                const screen = parseInt(savedScreen, 10);
                if (screen >= 1) {
                    state.currentScreen = screen;
                }
            }
        } catch (e) {
            // localStorage not available
        }
    }

    function saveState() {
        try {
            localStorage.setItem('squished-currentScreen', state.currentScreen);
            localStorage.setItem('squished-theme', state.currentTheme);
            localStorage.setItem('squished-size', state.currentSize);
        } catch (e) {
            // localStorage not available
        }
    }

    // ========================================
    // PAGINATION CALCULATION
    // ========================================
    function getCacheKey() {
        return `${state.currentTheme}-${state.currentSize}`;
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

            // For non-story pages (title, ending, author note), one screen per page
            if (!content || !content.classList.contains('story-page')) {
                screenNum++;
                state.screenMap.push({
                    pageNum: pageNum,
                    startParagraph: 0,
                    endParagraph: -1, // -1 means show all
                    isStoryPage: false
                });
                return;
            }

            // For story pages, calculate how many screens needed
            const paragraphs = content.querySelectorAll('p');
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

            // Get available height (page height minus padding and page number)
            const pageRect = page.getBoundingClientRect();
            const pageStyle = window.getComputedStyle(page);
            const paddingTop = parseFloat(pageStyle.paddingTop);
            const paddingBottom = parseFloat(pageStyle.paddingBottom);
            const pageNumberEl = page.querySelector('.page-number');
            const pageNumberHeight = pageNumberEl ? pageNumberEl.offsetHeight + 24 : 40; // Include margin
            const availableHeight = pageRect.height - paddingTop - paddingBottom - pageNumberHeight - 20; // 20px buffer

            // Reset all paragraphs to visible for measurement
            paragraphs.forEach(p => p.classList.remove('hidden-overflow'));

            let currentStart = 0;
            let currentHeight = 0;
            const gap = 19.2; // Approximate gap between paragraphs (1.2rem at 16px base)

            for (let i = 0; i < paragraphs.length; i++) {
                const pHeight = paragraphs[i].offsetHeight;
                const heightWithGap = currentHeight + pHeight + (i > currentStart ? gap : 0);

                if (heightWithGap > availableHeight && i > currentStart) {
                    // This paragraph doesn't fit, create a screen for what we have
                    screenNum++;
                    state.screenMap.push({
                        pageNum: pageNum,
                        startParagraph: currentStart,
                        endParagraph: i - 1,
                        isStoryPage: true
                    });
                    currentStart = i;
                    currentHeight = pHeight;
                } else {
                    currentHeight = heightWithGap;
                }
            }

            // Add final screen for remaining paragraphs
            screenNum++;
            state.screenMap.push({
                pageNum: pageNum,
                startParagraph: currentStart,
                endParagraph: paragraphs.length - 1,
                isStoryPage: true
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

        const screenInfo = state.screenMap[screenNum - 1];
        if (!screenInfo) {
            state.isAnimating = false;
            return;
        }

        // Hide all pages
        elements.pages.forEach(page => {
            page.classList.remove('active', 'flipping');
        });

        // Show target page
        const targetPage = document.querySelector(`.page[data-page="${screenInfo.pageNum}"]`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.scrollTop = 0;

            // Handle paragraph visibility for story pages
            if (screenInfo.isStoryPage) {
                const content = targetPage.querySelector('.page-content');
                const paragraphs = content.querySelectorAll('p');

                // Remove any existing continuation indicator
                const existingContinuation = content.querySelector('.page-continuation');
                if (existingContinuation) {
                    existingContinuation.remove();
                }

                paragraphs.forEach((p, i) => {
                    if (i >= screenInfo.startParagraph && i <= screenInfo.endParagraph) {
                        p.classList.remove('hidden-overflow');
                    } else {
                        p.classList.add('hidden-overflow');
                    }
                });

                // Check if there's more content on this page (another screen)
                const nextScreen = state.screenMap[screenNum];
                if (nextScreen && nextScreen.pageNum === screenInfo.pageNum) {
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

        // Update buttons
        elements.prevBtn.disabled = screenNum === 1;
        elements.nextBtn.disabled = screenNum === state.totalScreens;

        // Save state
        saveState();

        // Reset animation flag
        setTimeout(() => {
            state.isAnimating = false;
        }, 400);
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
        document.body.classList.remove('theme-playful', 'theme-minimal', 'theme-book');
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

    // ========================================
    // TEXT SIZE SWITCHING
    // ========================================
    function setSizeClass(size) {
        document.body.classList.remove('size-small', 'size-medium', 'size-large');
        document.body.classList.add(`size-${size}`);

        elements.sizeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.size === size) {
                btn.classList.add('active');
            }
        });
    }

    function setSize(size) {
        // Set size class
        setSizeClass(size);

        // Update state
        state.currentSize = size;

        // Recalculate pagination for new size
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
        elements.startBtn.addEventListener('click', () => showScreen(1));

        // Theme buttons
        elements.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setTheme(btn.dataset.theme);
            });
        });

        // Size buttons
        elements.sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setSize(btn.dataset.size);
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
    // START
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
