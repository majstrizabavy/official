(() => {
  const cards = document.querySelectorAll('details.turnaje-team-slot');
  if (!cards.length) return;

  cards.forEach((card) => {
    const back = card.querySelector('.turnaje-team-slot__players');
    if (!back) return;

    back.tabIndex = 0;
    back.setAttribute('role', 'button');
    back.setAttribute('aria-label', 'Zobraziť logo tímu');

    back.addEventListener('click', (event) => {
      event.preventDefault();
      card.removeAttribute('open');
    });

    back.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      card.removeAttribute('open');
    });

    card.addEventListener('toggle', () => {
      if (!card.open) return;
      cards.forEach((otherCard) => {
        if (otherCard !== card) otherCard.removeAttribute('open');
      });
    });
  });
})();
