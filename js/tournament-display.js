(() => {
  const source = document.querySelector('[data-schedule-source]');
  const display = document.querySelector('[data-schedule-display]');
  const content = document.querySelector('[data-schedule-display-content]');
  const openButton = document.querySelector('[data-schedule-display-open]');
  const closeButton = document.querySelector('[data-schedule-display-close]');

  if (!source || !display || !content || !openButton || !closeButton) {
    return;
  }

  function openDisplay() {
    content.replaceChildren(source.cloneNode(true));
    display.classList.add('is-open');
    display.setAttribute('aria-hidden', 'false');
    document.body.classList.add('schedule-display-open');
    closeButton.focus();

    if (display.requestFullscreen && !document.fullscreenElement) {
      display.requestFullscreen().catch(() => {});
    }
  }

  function closeDisplay() {
    display.classList.remove('is-open');
    display.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('schedule-display-open');
    content.replaceChildren();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    openButton.focus();
  }

  openButton.addEventListener('click', openDisplay);
  closeButton.addEventListener('click', closeDisplay);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && display.classList.contains('is-open')) {
      closeDisplay();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && display.classList.contains('is-open')) {
      closeDisplay();
    }
  });
})();
