/* Shared behavior for all static pages. */

const pageRoutes = {
  home: 'index.html',
  'orbit-section': 'svet-zabavy.html',
  inspiracia: 'inspiracia.html',
  rok: '365-dni-zabavy.html',
  projekty: 'projekty.html',
  'navrhni-akciu': 'navrhni-si-akciu.html',
  kontakt: 'kontakt.html'
};

const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
const customCursorEnabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const cursorInteractiveSelector = 'a, button, .planet, .mz-planet, .reel-card, .project-card, .month-card, .command-item, .contact-channel, .priority-btn, .mz-priority-btn, .mz-activate-btn, .mz-generate-btn, .mz-cta-approve, .mz-cta-reset, .mz-ebook__btn, .page-card, .page-card-link';
const cursorCtaSelector = '.btn-primary, .nav-cta, .core-cta, .activate-navrh-btn, .mz-activate-btn, .mz-generate-btn, .mz-cta-approve, .contact-choice-card__btn--primary, .planner-offer-modal__custom, .mz-followup-submit';
const cursorState = {
  targetX: 0,
  targetY: 0,
  dotX: 0,
  dotY: 0,
  ringX: 0,
  ringY: 0,
  prevX: 0,
  prevY: 0,
  speed: 0,
  hoverBoost: 0,
  hasStarted: false
};
let activeCursorElement = null;

function setCursorMode(mode = '') {
  if (!cursor || !ring) return;

  cursor.classList.remove('is-hover', 'is-cta');
  ring.classList.remove('is-hover', 'is-cta');

  if (mode === 'hover' || mode === 'cta') {
    cursor.classList.add('is-hover');
    ring.classList.add('is-hover');
  }

  if (mode === 'cta') {
    cursor.classList.add('is-cta');
    ring.classList.add('is-cta');
  }
}

function getInteractiveCursorElement(target) {
  return target instanceof Element ? target.closest(cursorInteractiveSelector) : null;
}

function syncCursorHoverState(target) {
  const hoveredElement = getInteractiveCursorElement(target);
  if (hoveredElement === activeCursorElement) return;

  activeCursorElement = hoveredElement;

  if (!hoveredElement) {
    setCursorMode();
    return;
  }

  const isCta = hoveredElement.matches(cursorCtaSelector);
  setCursorMode(isCta ? 'cta' : 'hover');
  cursorState.hoverBoost = isCta ? 0.45 : 0.22;
}

if (cursor && ring && customCursorEnabled) {
  document.addEventListener('mousemove', (event) => {
    const { clientX, clientY } = event;

    if (!cursorState.hasStarted) {
      cursorState.targetX = clientX;
      cursorState.targetY = clientY;
      cursorState.dotX = clientX;
      cursorState.dotY = clientY;
      cursorState.ringX = clientX;
      cursorState.ringY = clientY;
      cursorState.prevX = clientX;
      cursorState.prevY = clientY;
      cursorState.hasStarted = true;
      document.body.classList.add('cursor-active');
    }

    cursorState.prevX = cursorState.targetX;
    cursorState.prevY = cursorState.targetY;
    cursorState.targetX = clientX;
    cursorState.targetY = clientY;
    cursorState.speed = Math.hypot(cursorState.targetX - cursorState.prevX, cursorState.targetY - cursorState.prevY);
    syncCursorHoverState(event.target);
  });

  document.addEventListener('mouseleave', () => {
    document.body.classList.remove('cursor-active');
    activeCursorElement = null;
    setCursorMode();
  });

  document.addEventListener('mouseenter', () => {
    if (cursorState.hasStarted) {
      document.body.classList.add('cursor-active');
    }
  });

  document.addEventListener('mousedown', () => {
    cursor.classList.add('is-clicking');
    ring.classList.add('is-clicking');
  });

  document.addEventListener('mouseup', () => {
    cursor.classList.remove('is-clicking');
    ring.classList.remove('is-clicking');
  });

  (function animateCursor(now = 0) {
    cursorState.dotX += (cursorState.targetX - cursorState.dotX) * 0.22;
    cursorState.dotY += (cursorState.targetY - cursorState.dotY) * 0.22;
    cursorState.ringX += (cursorState.targetX - cursorState.ringX) * 0.12;
    cursorState.ringY += (cursorState.targetY - cursorState.ringY) * 0.12;
    cursorState.hoverBoost *= 0.88;

    cursor.style.left = `${cursorState.dotX}px`;
    cursor.style.top = `${cursorState.dotY}px`;
    ring.style.left = `${cursorState.ringX}px`;
    ring.style.top = `${cursorState.ringY}px`;

    requestAnimationFrame(animateCursor);
  })();
} else if (cursor && ring) {
  cursor.style.display = 'none';
  ring.style.display = 'none';
}

function resolveRoute(target) {
  return pageRoutes[target] || target;
}

function goTo(target) {
  const route = resolveRoute(target);
  const localSection = route.startsWith('#') ? document.querySelector(route) : document.getElementById(target);

  if (localSection) {
    localSection.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  window.location.href = route;
}

function activateNavrhAkcie() {
  closeCommand();
  const overlay = document.getElementById('navrhni-akciu-transition');
  const navrhSection = document.getElementById('navrhni-akciu-section');

  if (!overlay) {
    goTo('navrhni-akciu');
    return;
  }

  overlay.classList.add('active');
  setTimeout(() => {
    if (navrhSection) {
      navrhSection.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => overlay.classList.remove('active'), 700);
      return;
    }

    window.location.href = resolveRoute('navrhni-akciu');
  }, 600);
}

const commandOverlay = document.getElementById('command-overlay');
const commandInput = document.getElementById('command-input');
const videoModal = document.getElementById('videoModal');
const videoModalFrame = document.getElementById('videoModalFrame');
const videoModalTitle = document.getElementById('videoModalTitle');
const videoModalLink = document.getElementById('videoModalLink');

function openCommand() {
  if (!commandOverlay || !commandInput) return;
  commandOverlay.classList.add('open');
  commandInput.focus();
  document.body.style.overflow = 'hidden';
}

function closeCommand() {
  if (!commandOverlay) return;
  commandOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function openVideoModal(videoId, title, url) {
  if (!videoModal || !videoModalFrame) return;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
  videoModalFrame.src = embedUrl;
  if (videoModalTitle) videoModalTitle.textContent = title || 'YouTube Shorts';
  if (videoModalLink) videoModalLink.href = url || `https://www.youtube.com/watch?v=${videoId}`;
  videoModal.classList.add('is-open');
  videoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
  if (!videoModal || !videoModalFrame) return;

  videoModal.classList.remove('is-open');
  videoModal.setAttribute('aria-hidden', 'true');
  videoModalFrame.src = '';
  document.body.style.overflow = '';
}

if (commandOverlay) {
  commandOverlay.addEventListener('click', (event) => {
    if (event.target === commandOverlay) closeCommand();
  });
}

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openCommand();
  }

  if (event.key === 'Escape') {
    closeCommand();
    closeMobile();
    closeVideoModal();
  }
});

if (commandInput) {
  commandInput.addEventListener('input', function onInput() {
    const query = this.value.toLowerCase();
    document.querySelectorAll('.command-item').forEach((item) => {
      const name = item.querySelector('.cmd-item-name')?.textContent.toLowerCase() || '';
      const desc = item.querySelector('.cmd-item-desc')?.textContent.toLowerCase() || '';
      item.style.display = !query || name.includes(query) || desc.includes(query) ? 'flex' : 'none';
    });
  });
}

function navigateTo(target) {
  closeCommand();
  setTimeout(() => goTo(target), 150);
}

function toggleMobile() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;

  const isOpen = menu.classList.toggle('open');
  document.body.classList.toggle('mobile-menu-open', isOpen);
}

function closeMobile() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.remove('open');
  document.body.classList.remove('mobile-menu-open');
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const toggleTrigger = target.closest('[data-mobile-toggle]');
  if (toggleTrigger) {
    event.preventDefault();
    toggleMobile();
    return;
  }

  const closeTrigger = target.closest('[data-mobile-close]');
  if (closeTrigger) {
    closeMobile();
  }
});

document.querySelectorAll('[data-nav]').forEach((link) => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const expectedPage = resolveRoute(link.dataset.nav);
  if (expectedPage === currentPage) {
    link.classList.add('active');
  }
});

if (videoModal) {
  videoModal.querySelectorAll('[data-video-close]').forEach((element) => {
    element.addEventListener('click', closeVideoModal);
  });
}

document.querySelectorAll('[data-video-open]').forEach((card) => {
  card.addEventListener('click', () => {
    openVideoModal(card.dataset.youtubeId, card.dataset.videoTitle, card.dataset.videoUrl);
  });
});

const revealElements = document.querySelectorAll('.reveal');
if (revealElements.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });

  revealElements.forEach((element) => revealObserver.observe(element));
}

// Hlavny filter medzi sekciami Video / Blog / Galeria / Specialy / Kam za zabavou.
document.querySelectorAll('[data-inspiration-filter-group]').forEach((group) => {
  const buttons = group.querySelectorAll('[data-inspiration-filter]');
  const sections = document.querySelectorAll('[data-inspiration-section]');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.inspirationFilter;

      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');

      sections.forEach((section) => {
        const isActivityLibrary = section.dataset.inspirationSection === 'aktivity';
        const matches = filter === 'all'
          ? !isActivityLibrary
          : section.dataset.inspirationSection === filter;
        section.classList.toggle('is-hidden', !matches);
      });
    });
  });
});

document.querySelectorAll('[data-activity-tool]').forEach((tool) => {
  const filters = tool.querySelectorAll('[data-activity-filter]');
  const cards = tool.querySelectorAll('[data-activity-cat]');

  function setActivityFilter(filter) {
    filters.forEach((item) => {
      item.classList.toggle('is-active', item.dataset.activityFilter === filter);
    });

    cards.forEach((card) => {
      const matches = filter === 'vsetko' || card.dataset.activityCat === filter;
      card.classList.toggle('is-hidden', !matches);
    });
  }

  filters.forEach((filterButton) => {
    filterButton.addEventListener('click', () => {
      setActivityFilter(filterButton.dataset.activityFilter || 'vsetko');
    });
  });
});

