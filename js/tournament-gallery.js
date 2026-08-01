(function () {
  const gallery = document.querySelector('[data-tournament-gallery]');
  const dialog = document.querySelector('[data-gallery-dialog]');

  if (!gallery || !dialog) return;

  const items = Array.from(gallery.querySelectorAll('[data-gallery-item]'));
  const image = dialog.querySelector('[data-gallery-image]');
  const counter = dialog.querySelector('[data-gallery-counter]');
  const download = dialog.querySelector('[data-gallery-download]');
  const close = dialog.querySelector('[data-gallery-close]');
  const previous = dialog.querySelector('[data-gallery-prev]');
  const next = dialog.querySelector('[data-gallery-next]');
  let activeIndex = 0;

  function updateDialog(index) {
    const item = items[index];
    if (!item) return;

    activeIndex = index;
    const src = item.dataset.src;
    const alt = item.dataset.alt || `Fotka ${index + 1}`;
    image.src = src;
    image.alt = alt;
    counter.textContent = `${index + 1} / ${items.length}`;
    download.href = src;
    download.download = src.split('/').pop() || `galeria-${index + 1}.jpeg`;
  }

  function openDialog(index) {
    updateDialog(index);
    dialog.showModal();
  }

  function move(step) {
    updateDialog((activeIndex + step + items.length) % items.length);
  }

  items.forEach((item, index) => {
    item.addEventListener('click', () => openDialog(index));
  });

  close?.addEventListener('click', () => dialog.close());
  previous?.addEventListener('click', () => move(-1));
  next?.addEventListener('click', () => move(1));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });
})();
