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

