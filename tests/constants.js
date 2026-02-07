// Centralised selectors, timeouts, and thresholds for all tests.
// Change here, not in individual test files.

const SELECTORS = {
  // Page counter
  currentPage: '#currentPage',
  totalPages: '#totalPages',

  // Navigation buttons
  nextBtn: '#nextBtn',
  prevBtn: '#prevBtn',
  startBtn: '#startBtn',
  siteBranding: '#siteBranding',

  // Share tray
  shareTray: '#shareTray',
  trayTab: '#trayTab',
  trayContent: '.tray-content',

  // Page structure
  activePage: '.page.active',
  activeContent: '.page.active .page-content',
  navigation: '.navigation',
  siteHeader: '.site-header',
  bookTitle: '.book-title',

  // Content types
  storyPage: '.story-page',
  endingPage: '.ending-page',
  authorNote: '.author-note',
  sectionTitle: '.section-title',
  amazonLinks: '.amazon-links',
  pageContinuation: '.page-continuation',

  // Picture mode
  modeToggle: '#modeToggle',
  picturePage: '.picture-page',
  pictureImage: '.picture-image',
  pictureCaption: '.picture-caption',

  // Paragraph selectors (the :not() excludes are critical — see MEMORY.md)
  visibleParagraphs: 'p:not(.hidden-overflow):not(.amazon-links p)',
};

const TIMEOUTS = {
  contentLoad: 15000,   // Wait for markdown to load and pagination to complete
  screenChange: 5000,   // Wait for page counter to update after navigation
  animationIdle: 2000,  // Poll for isAnimating flag to clear (400ms animation + margin)
};

const THRESHOLDS = {
  headerMaxY: 50,           // Header should be within 50px of top
  trayOverlapTolerance: 5,  // Pixels of overlap allowed between tray and nav
  mobileBreakpoint: 768,    // Below this width = mobile layout
};

module.exports = { SELECTORS, TIMEOUTS, THRESHOLDS };
