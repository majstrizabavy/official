(function () {
  'use strict';

  const root = document.getElementById('navrhni-akciu-section');
  if (!root) return;

  const pricingApi = window.MZPricing || null;

  const elements = {
    orbit: document.getElementById('mz-orbit'),
    coreLogo: document.getElementById('mz-core-logo'),
    coreDesc: document.getElementById('mz-core-desc'),
    planets: document.getElementById('mz-planets'),
    overlay: document.getElementById('mz-overlay'),
    overlayTitle: document.getElementById('mz-overlay-title'),
    overlayText: document.getElementById('mz-overlay-text'),
    toast: document.getElementById('mz-toast'),
    wizard: document.getElementById('mz-wizard'),
    budgetInput: document.getElementById('mz-wizard-budget'),
    budgetValue: document.getElementById('mz-wizard-budget-value'),
    budgetInsight: document.getElementById('mz-wizard-budget-insight'),
    budgetBadge: document.getElementById('mz-wizard-budget-badge'),
    budgetText: document.getElementById('mz-wizard-budget-text'),
    summary: document.getElementById('mz-wizard-summary'),
    offers: document.getElementById('mz-wizard-offers'),
    eventNameInput: document.getElementById('mz-wizard-event-name'),
    eventNameError: document.getElementById('mz-wizard-event-error'),
    resultTitle: document.getElementById('mz-wizard-result-title'),
    resultIntro: document.getElementById('mz-wizard-result-intro'),
    resetWizard: document.getElementById('mz-wizard-reset'),
    exportCompare: document.getElementById('mz-export-compare'),
    exportStage: document.getElementById('mz-export-stage')
  };

  const required = [
    elements.orbit,
    elements.coreLogo,
    elements.coreDesc,
    elements.planets,
    elements.overlay,
    elements.overlayTitle,
    elements.overlayText,
    elements.toast,
    elements.wizard,
    elements.budgetInput,
    elements.budgetValue,
    elements.budgetInsight,
    elements.budgetBadge,
    elements.budgetText,
    elements.summary,
    elements.offers,
    elements.eventNameInput,
    elements.eventNameError,
    elements.resultTitle,
    elements.resultIntro,
    elements.resetWizard,
    elements.exportCompare,
    elements.exportStage
  ].every(Boolean);
  if (!required) return;

  const orbitPlanets = [
    { label: 'Kalendár', desc: 'Tvoja akcia bude v našom kalendári', color: '#c7ff2e' },
    { label: 'Reels\npromo', desc: 'Po akcii vytvoríme krátke video, ktoré ukáže atmosféru a osloví ďalších ľudí.', color: '#9edb1f' },
    { label: 'Video\npozvánka', desc: 'Pripravíme pútavé video, ktoré pritiahne ľudí na tvoju akciu.', color: '#d8ff5a' },
    { label: 'Sociálne\nsiete', desc: 'Dostaneme tvoju akciu medzi ľudí', color: '#efff97' },
    { label: 'Podpora', desc: 'Sme pri tebe pred aj po akcii', color: '#c7ff2e' },
    { label: 'Garancia\nkvality', desc: 'Ideme na 125 %. Menej u nás nečakaj.', color: '#9edb1f' }
  ];

  const wizardState = {
    step: 0,
    audience: '',
    eventName: '',
    need: '',
    guests: '',
    vibe: '',
    budget: Number(elements.budgetInput.value) || 800,
    promo: ''
  };

  let currentWizardOffers = [];

  const panels = Array.from(root.querySelectorAll('[data-wizard-step]'));
  const progressDots = Array.from(root.querySelectorAll('[data-step-dot]'));
  const choiceButtons = Array.from(root.querySelectorAll('[data-field]'));
  const nextButtons = Array.from(root.querySelectorAll('[data-wizard-next]'));
  const backButtons = Array.from(root.querySelectorAll('[data-wizard-back]'));

  function formatEuro(value) {
    return `${Number(value).toLocaleString('sk-SK')} €`;
  }

  function isMobile() {
    return window.innerWidth < 601;
  }

  function isMedium() {
    return window.innerWidth >= 601 && window.innerWidth <= 860;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    elements.toast.classList.add('mz-toast--show');
    window.setTimeout(() => {
      elements.toast.classList.remove('mz-toast--show');
      elements.toast.hidden = true;
    }, 3000);
  }

  function sanitizeText(value) {
    return String(value || '').replace(/[<>&"]/g, (char) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;'
    }[char]));
  }

  function setQuickAdviceStatus(type, message) {
    const status = document.getElementById('mz-quick-advice-status');
    if (!status) return;
    status.className = `mz-quick-advice__status${type ? ` is-${type}` : ''}`;
    status.textContent = message;
  }

  function getQuickAdviceSupabaseClient() {
    try {
      return window.MZSupabase?.getClient?.() || null;
    } catch (error) {
      console.error('[MZ quick advice] Supabase client initialization failed:', error);
      return null;
    }
  }

  async function submitQuickAdvice(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('.mz-quick-advice__submit');
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    const guestCount = String(formData.get('guest_count') || '').trim();
    const contactEmail = String(formData.get('contact_email') || '').trim().toLowerCase();

    if (!title || !contactEmail) {
      setQuickAdviceStatus('error', 'Vyplňte názov akcie a kontakt na vás.');
      return;
    }

    const supabaseClient = getQuickAdviceSupabaseClient();
    if (!supabaseClient) {
      setQuickAdviceStatus('error', 'Dopyt sa nepodarilo odoslať. Skúste nás prosím kontaktovať priamo.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Odosielam...';
    }
    setQuickAdviceStatus('', 'Odosielame dopyt...');

    const payload = {
      status: 'pending',
      contact_name: 'Rýchly dopyt',
      contact_email: contactEmail,
      contact_phone: null,
      title,
      event_date: null,
      location: null,
      audience: null,
      guest_count: guestCount || null,
      energy: null,
      budget: null,
      promo: null,
      selected_variant: 'Odporúčanie od Majstrov zábavy',
      selected_price: null,
      services: 'Klient necháva odporúčanie programu na Majstrov zábavy.',
      notes: guestCount ? `Počet hostí cca: ${guestCount}` : null
    };

    const { error } = await supabaseClient
      .from('client_requests')
      .insert(payload);

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Odoslať dopyt';
    }

    if (error) {
      console.error('[MZ quick advice] Insert into client_requests failed:', error);
      setQuickAdviceStatus('error', 'Dopyt sa nepodarilo odoslať. Skúste to prosím znova.');
      return;
    }

    form.reset();
    setQuickAdviceStatus('success', 'Ďakujeme, dopyt máme. Ozveme sa vám čo najskôr.');
    showToast('Ďakujeme, ozveme sa vám čo najskôr.');
  }

  function getEventName() {
    return wizardState.eventName.trim() || 'Akcia na mieru';
  }

  function getDownloadName(prefix, extension) {
    const slug = getEventName()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'akcia-na-mieru';
    return `${prefix}-${slug}.${extension}`;
  }

  function showOverlay(brand, message) {
    elements.overlayTitle.textContent = brand || 'MAJSTRI ZÁBAVY';
    elements.overlayText.textContent = message || 'Pripravujeme ponuku...';
    document.body.classList.add('mz-overlay-open');
    elements.overlay.setAttribute('aria-hidden', 'false');
    elements.overlay.classList.add('mz-overlay--active');
  }

  function hideOverlay() {
    elements.overlay.classList.remove('mz-overlay--active');
    elements.overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mz-overlay-open');
  }

  function getKompletSavingsContext(pricing) {
    if (!pricing || pricing.scope !== 'komplet' || !pricing.discountAmount) return [];

    return [
      `samostatne ${pricing.listPriceText}`,
      `ušetríte ${pricing.discountAmountText}`,
      pricing.discountLabel || 'balikove zvyhodnenie'
    ];
  }

  const orbitGroup = document.createElement('div');
  orbitGroup.id = 'mz-orbit-group';
  orbitGroup.style.cssText = 'position:absolute;top:50%;left:50%;transform-origin:0 0;width:0;height:0;';
  elements.planets.parentElement.insertBefore(orbitGroup, elements.planets);
  const energyLayer = document.createElement('div');
  energyLayer.className = 'mz-energy-layer';
  elements.orbit.insertBefore(energyLayer, elements.orbit.firstChild);
  let activePlanet = null;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function sizeOrbit() {
    const size = isMobile() ? '300px' : (isMedium() ? '340px' : '600px');
    elements.orbit.style.width = size;
    elements.orbit.style.height = size;
  }

  function setOrbitCoreState(planetData) {
    if (!planetData) {
      elements.orbit.classList.remove('mz-orbit--active');
      elements.coreLogo.textContent = 'MZ';
      elements.coreDesc.textContent = '';
      return;
    }

    elements.orbit.classList.add('mz-orbit--active');
    elements.coreLogo.textContent = 'MZ';
    elements.coreDesc.textContent = planetData.desc;
  }

  function clearActiveOrbitPlanet() {
    orbitGroup.querySelectorAll('.mz-orbit-track').forEach((item) => {
      item.style.animationPlayState = 'running';
    });

    if (activePlanet) {
      activePlanet.classList.remove('is-active');
      activePlanet.style.transform = 'translate(-50%,-50%) scale(1)';
      activePlanet.style.zIndex = '';
    }

    activePlanet = null;
    setOrbitCoreState(null);
  }

  function buildOrbit() {
    orbitGroup.innerHTML = '';
    energyLayer.innerHTML = '';
    const radius = isMobile() ? 118 : (isMedium() ? 152 : 220);
    const planetSize = isMobile() ? 60 : (isMedium() ? 66 : 80);
    const labelSize = isMobile() ? '7.8px' : (isMedium() ? '8.6px' : '9.6px');
    let keyframes = '';

    orbitPlanets.forEach((planetData, index) => {
      const total = orbitPlanets.length;
      const degrees = (index / total) * 360;

      keyframes += `@keyframes mz-fo-${index}{`;
      keyframes += `from{transform:rotate(${degrees}deg) translateX(${radius}px) rotate(${-degrees}deg);}`;
      keyframes += `to{transform:rotate(${degrees + 360}deg) translateX(${radius}px) rotate(${-(degrees + 360)}deg);}}`;
      keyframes += `@keyframes mz-ray-${index}{`;
      keyframes += `from{transform:translateY(-50%) rotate(${degrees}deg);}`;
      keyframes += `to{transform:translateY(-50%) rotate(${degrees + 360}deg);}}`;

      const track = document.createElement('div');
      track.className = 'mz-orbit-track';
      track.style.cssText = `position:absolute;width:0;height:0;top:0;left:0;animation:mz-fo-${index} 18s linear infinite;`;

      if (!reducedMotionQuery.matches) {
        const ray = document.createElement('div');
        ray.className = 'mz-energy-ray';
        ray.style.cssText = `--ray-length:${Math.max(74, radius - planetSize * 0.42)}px;--ray-delay:${(index * 0.42).toFixed(2)}s;animation:mz-ray-${index} 18s linear infinite;`;
        ray.innerHTML = '<span class="mz-energy-ray__base"></span><span class="mz-energy-ray__drop"></span>';
        energyLayer.appendChild(ray);
      }

      const planet = document.createElement('div');
      planet.className = 'mz-planet';
      planet.style.cssText = `width:${planetSize}px;height:${planetSize}px;--planet-color:${planetData.color};`;
      planet.innerHTML = `<div class="mz-planet__label" style="font-size:${labelSize}">${planetData.label.split('\n').join('<br>')}</div>`;

      const activatePlanet = () => {
        if (activePlanet && activePlanet !== planet) {
          activePlanet.classList.remove('is-active');
          activePlanet.style.transform = 'translate(-50%,-50%) scale(1)';
          activePlanet.style.zIndex = '';
        }

        orbitGroup.querySelectorAll('.mz-orbit-track').forEach((item) => {
          item.style.animationPlayState = 'paused';
        });
        planet.classList.add('is-active');
        planet.style.transform = 'translate(-50%,-50%) scale(1.3)';
        planet.style.zIndex = '30';
        activePlanet = planet;
        setOrbitCoreState(planetData);
      };

      planet.addEventListener('mouseenter', activatePlanet);
      planet.addEventListener('click', activatePlanet);
      planet.addEventListener('touchstart', (event) => {
        event.preventDefault();
        activatePlanet();
      }, { passive: false });

      track.appendChild(planet);
      orbitGroup.appendChild(track);
    });

    let styleTag = document.getElementById('mz-orbit-kf');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'mz-orbit-kf';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = keyframes;
  }

  function updateWizardProgress() {
    progressDots.forEach((dot) => {
      const dotStep = Number(dot.dataset.stepDot);
      dot.classList.toggle('is-active', wizardState.step === dotStep);
      dot.classList.toggle('is-done', wizardState.step > dotStep);
    });
  }

  function showWizardStep(step) {
    wizardState.step = Math.max(0, Math.min(step, 7));
    panels.forEach((panel) => {
      panel.classList.toggle('is-active', Number(panel.dataset.wizardStep) === wizardState.step);
    });
    elements.wizard.classList.toggle('mz-wizard--result', wizardState.step === 7);
    updateWizardProgress();
  }

  function validateEventName() {
    const value = elements.eventNameInput.value.trim();
    wizardState.eventName = value;
    elements.eventNameInput.classList.toggle('is-invalid', !value);
    elements.eventNameError.textContent = value ? '' : 'Prosím vyplňte názov akcie.';
    if (!value) {
      elements.eventNameInput.focus();
      return false;
    }
    return true;
  }

  function getBudgetInsight(value) {
    if (value < 500) {
      return {
        badge: 'Základ',
        text: 'Menší program pre jednoduchú akciu',
        recommended: false
      };
    }

    if (value < 1000) {
      return {
        badge: 'Najčastejšia voľba ⭐',
        text: 'Plnohodnotná zábava a lepšia atmosféra',
        recommended: true
      };
    }

    if (value < 2000) {
      return {
        badge: 'Silný zážitok',
        text: 'Viac programu, viac energie, väčší efekt',
        recommended: false
      };
    }

    return {
      badge: 'Prémiový event',
      text: 'WOW zážitok, na ktorý sa nezabúda',
      recommended: false
    };
  }

  function updateBudgetValue() {
    wizardState.budget = Number(elements.budgetInput.value);
    elements.budgetValue.textContent = wizardState.budget >= 5000 ? '5 000+ €' : formatEuro(wizardState.budget);
    const insight = getBudgetInsight(wizardState.budget);
    elements.budgetBadge.textContent = insight.badge;
    elements.budgetText.textContent = insight.text;
    elements.budgetInsight.classList.toggle('is-recommended', insight.recommended);
    const percent = ((wizardState.budget - 200) / (5000 - 200)) * 100;
    elements.budgetInput.style.background = `linear-gradient(90deg, var(--brand-primary) ${percent}%, #1e1e2e ${percent}%)`;
  }

  function setChoice(field, value, button) {
    wizardState[field] = value;
    choiceButtons
      .filter((item) => item.dataset.field === field)
      .forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
  }

  function getOfferPrice(multiplier) {
    const base = wizardState.budget || 800;
    const from = Math.max(200, Math.round((base * multiplier) / 50) * 50);
    const to = Math.round((from * 1.25) / 50) * 50;
    return `${formatEuro(from)} - ${formatEuro(to)}`;
  }

  function getOfferBullets(tier) {
    const promoBullet = wizardState.promo === 'Áno'
      ? 'promo podpora pre prilakanie ludi'
      : 'bez promo balika';
    const common = [
      wizardState.need || 'program na mieru',
      wizardState.vibe ? `vibe: ${wizardState.vibe}` : 'vibe podla dohody',
      promoBullet
    ];

    if (tier === 'basic') return common;
    if (tier === 'best') return common.concat(['silnejsi zazitok pre hosti']);
    return common.concat(['najvacsi rozsah a kompletnejsie riesenie', 'priestor na doladenie detailov']);
  }

  function renderWizardSummary() {
    const items = [
      wizardState.audience,
      getEventName(),
      wizardState.need,
      wizardState.guests,
      wizardState.vibe,
      formatEuro(wizardState.budget),
      wizardState.promo ? `promo: ${wizardState.promo}` : ''
    ].filter(Boolean);

    elements.summary.innerHTML = items
      .map((item) => `<span class="mz-wizard-summary__chip">${item}</span>`)
      .join('');
  }

  function renderWizardOffers() {
    const offers = [
      {
        key: 'start',
        tier: 'Základ',
        headline: 'MZ Start',
        price: getOfferPrice(0.75),
        desc: 'Jednoduchý smer pre menšiu alebo úspornejšiu akciu.',
        bullets: getOfferBullets('basic'),
        recommended: false
      },
      {
        key: 'show',
        tier: 'Odporúčaná',
        badge: 'BEST VALUE',
        headline: 'MZ Show',
        price: getOfferPrice(1),
        desc: 'Vyvážený variant s dobrým pomerom zážitku, rozsahu a rozpočtu.',
        bullets: getOfferBullets('best'),
        recommended: true
      },
      {
        key: 'majster',
        tier: 'Prémiová',
        badge: 'PREMIUM',
        headline: 'MZ Majster',
        price: getOfferPrice(1.45),
        desc: 'Silnejší zážitok pre väčší dojem a väčší rozsah akcie.',
        bullets: getOfferBullets('premium'),
        recommended: false
      }
    ];
    currentWizardOffers = offers;

    elements.offers.innerHTML = offers.map((offer) => `
      <article class="mz-wizard-offer${offer.recommended ? ' is-recommended' : ''}">
        ${offer.badge ? `<div class="mz-wizard-offer__badge">${offer.badge}</div>` : ''}
        <div class="mz-wizard-offer__top">
          <div>
            <div class="mz-wizard-offer__tier">${offer.tier}</div>
            <h4 class="mz-wizard-offer__title">${offer.headline}</h4>
          </div>
          <div class="mz-wizard-offer__price">${offer.price}</div>
        </div>
        <p class="mz-wizard-offer__desc">${offer.desc}</p>
        <div class="mz-wizard-offer__items">
          ${offer.bullets.map((item, index) => `
            <div class="mz-wizard-offer__item">
              <span>${String(index + 1).padStart(2, '0')}</span>
              ${item}
            </div>
          `).join('')}
        </div>
        <button type="button" class="mz-wizard-offer__cta" data-wizard-offer="${offer.key}" data-wizard-offer-name="${offer.headline}" data-wizard-offer-price="${offer.price}" data-wizard-offer-bullets="${encodeURIComponent(offer.bullets.join('||'))}">
          ${offer.recommended ? 'Vybrať túto ponuku' : 'Mám záujem'}
        </button>
      </article>
    `).join('');
  }

  function renderWizardResult() {
    elements.resultTitle.textContent = getEventName();
    elements.resultIntro.textContent = 'Vybrali sme smer podľa tvojich odpovedí. Detailnú ponuku doladíme spolu.';
    renderWizardSummary();
    renderWizardOffers();
    showWizardStep(7);
  }

  function finishWizard() {
    showOverlay('MAJSTRI ZÁBAVY', 'Pripravujeme 3 ponuky...');
    window.setTimeout(() => {
      hideOverlay();
      renderWizardResult();
    }, 3000);
  }

  choiceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const field = button.dataset.field;
      const value = button.dataset.value;
      if (!field || !value) return;
      setChoice(field, value, button);

      if (field === 'promo') {
        finishWizard();
        return;
      }

      window.setTimeout(() => showWizardStep(wizardState.step + 1), 120);
    });
  });

  backButtons.forEach((button) => {
    button.addEventListener('click', () => showWizardStep(wizardState.step - 1));
  });

  nextButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (wizardState.step === 1 && !validateEventName()) return;
      showWizardStep(wizardState.step + 1);
    });
  });

  const quickAdviceForm = document.getElementById('mz-quick-advice-form');
  if (quickAdviceForm) {
    quickAdviceForm.addEventListener('submit', submitQuickAdvice);
  }

  elements.eventNameInput.addEventListener('input', () => {
    wizardState.eventName = elements.eventNameInput.value.trim();
    elements.eventNameInput.classList.remove('is-invalid');
    elements.eventNameError.textContent = '';
  });

  elements.eventNameInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (validateEventName()) showWizardStep(2);
  });

  elements.budgetInput.addEventListener('input', updateBudgetValue);
  elements.resetWizard.addEventListener('click', () => {
    Object.assign(wizardState, {
      step: 0,
      audience: '',
      eventName: '',
      need: '',
      guests: '',
      vibe: '',
      budget: 800,
      promo: ''
    });
    elements.budgetInput.value = '800';
    elements.eventNameInput.value = '';
    elements.eventNameError.textContent = '';
    elements.eventNameInput.classList.remove('is-invalid');
    choiceButtons.forEach((button) => button.classList.remove('is-active'));
    updateBudgetValue();
    showWizardStep(0);
    elements.wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  elements.offers.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-wizard-offer]');
    if (!(button instanceof HTMLElement)) return;

    const packageName = button.dataset.wizardOfferName || 'MZ Show';
    const price = button.dataset.wizardOfferPrice || '';
    const bullets = decodeURIComponent(button.dataset.wizardOfferBullets || '').split('||').filter(Boolean);

    if (typeof window.MZApplyFollowupSelection === 'function') {
      window.MZApplyFollowupSelection({
        event: getEventName(),
        scope: wizardState.need,
        scopeLabel: wizardState.need,
        packageName,
        variant: packageName,
        price,
        audience: wizardState.audience,
        guests: wizardState.guests,
        energy: wizardState.vibe,
        budget: formatEuro(wizardState.budget),
        promo: wizardState.promo,
        lead: `Vybral si ${packageName} pre ${wizardState.audience || 'akciu na mieru'}.`,
        bullets
      });
      return;
    }

    showToast('Vybrany variant si mozeme doladit cez kontakt.');
  });

  function buildExportShell(modifier, innerHtml) {
    return `
      <section class="mz-export-card ${modifier}">
        <header class="mz-export-card__header">
          <div>
            <div class="mz-export-card__brand">MAJSTRI ZÁBAVY</div>
            <h1>${sanitizeText(getEventName())}</h1>
          </div>
          <div class="mz-export-card__stamp">orientačná ponuka</div>
        </header>
        ${innerHtml}
        <footer class="mz-export-card__footer">
          <strong>majstrizabavy.sk</strong>
          <span>info@majstrizabavy.sk</span>
          <span>Finálne detaily, termín a rozsah spolu doladíme osobne.</span>
        </footer>
      </section>
    `;
  }

  function renderCompareExport() {
    const summary = [
      wizardState.audience,
      wizardState.need,
      wizardState.guests ? `${wizardState.guests} ľudí` : '',
      wizardState.vibe,
      `rozpočet ${formatEuro(wizardState.budget)}`,
      wizardState.promo ? `promo: ${wizardState.promo}` : ''
    ].filter(Boolean);

    const offersHtml = currentWizardOffers.map((offer) => `
      <article class="mz-export-offer${offer.recommended ? ' is-featured' : ''}">
        <div class="mz-export-offer__tier">${sanitizeText(offer.tier)}</div>
        <h2>${sanitizeText(offer.headline)}</h2>
        <div class="mz-export-offer__price">${sanitizeText(offer.price)}</div>
        <p>${sanitizeText(offer.desc)}</p>
        <ul>
          ${offer.bullets.map((item) => `<li>${sanitizeText(item)}</li>`).join('')}
        </ul>
      </article>
    `).join('');

    elements.exportStage.innerHTML = buildExportShell('mz-export-card--compare', `
      <p class="mz-export-card__lead">3 varianty programu na mieru podľa tvojho zadania.</p>
      <div class="mz-export-tags">${summary.map((item) => `<span>${sanitizeText(item)}</span>`).join('')}</div>
      <div class="mz-export-offers">${offersHtml}</div>
    `);
    return elements.exportStage.firstElementChild;
  }

  async function exportElementToPdf(element, filename) {
    if (!window.html2canvas && !window.html2pdf) {
      showToast('Export PDF sa nepodarilo načítať. Skús to prosím ešte raz.');
      return;
    }

    elements.exportStage.classList.add('is-rendering');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const JsPdfCtor = window.jspdf && window.jspdf.jsPDF;
      if (window.html2canvas && JsPdfCtor) {
        const canvas = await window.html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        });
        const pdf = new JsPdfCtor('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imageWidth = pageWidth;
        const imageHeight = Math.min(pageHeight, (canvas.height * imageWidth) / canvas.width);
        const imageTop = (pageHeight - imageHeight) / 2;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, imageTop, imageWidth, imageHeight);
        pdf.save(filename);
        return;
      }

      await window.html2pdf().set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    } finally {
      elements.exportStage.classList.remove('is-rendering');
    }
  }

  elements.exportCompare.addEventListener('click', async () => {
    if (!currentWizardOffers.length) return;
    const exportElement = renderCompareExport();
    await exportElementToPdf(exportElement, getDownloadName('porovnanie-ponuk', 'pdf'));
  });

  buildOrbit();
  sizeOrbit();
  updateBudgetValue();
  showWizardStep(0);

  elements.orbit.addEventListener('mouseleave', clearActiveOrbitPlanet);
  document.addEventListener('touchstart', (event) => {
    if (!elements.orbit.contains(event.target)) {
      clearActiveOrbitPlanet();
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    buildOrbit();
    sizeOrbit();
    clearActiveOrbitPlanet();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      energyLayer.innerHTML = '';
    } else {
      buildOrbit();
    }
  });

  reducedMotionQuery.addEventListener?.('change', () => {
    buildOrbit();
  });

  (function initPlannerFollowup() {
    const followup = document.getElementById('mz-followup-form');
    const followupSection = document.getElementById('planner-form');
    const followupCard = followupSection ? followupSection.querySelector('.mz-followup-card') : null;
    const title = document.getElementById('mz-followup-title');
    const description = document.getElementById('mz-followup-description');
    const ticketEvent = document.getElementById('mz-followup-ticket-event');
    const ticketScope = document.getElementById('mz-followup-ticket-scope');
    const ticketPackage = document.getElementById('mz-followup-ticket-package');
    const ticketPrice = document.getElementById('mz-followup-ticket-price');
    const ticketMeta = document.getElementById('mz-followup-ticket-meta');
    const includes = document.getElementById('mz-followup-includes');
    const hiddenEvent = document.getElementById('mz-followup-hidden-event');
    const hiddenVariant = document.getElementById('mz-followup-hidden-variant');
    const hiddenPrice = document.getElementById('mz-followup-hidden-price');
    const hiddenEnergy = document.getElementById('mz-followup-hidden-energy');
    const hiddenAudience = document.getElementById('mz-followup-hidden-audience');
    const hiddenGuests = document.getElementById('mz-followup-hidden-guests');
    const hiddenBudget = document.getElementById('mz-followup-hidden-budget');
    const hiddenPromo = document.getElementById('mz-followup-hidden-promo');
    const success = document.getElementById('mz-followup-success');
    const energyButtons = Array.from(document.querySelectorAll('.mz-followup-energy__btn'));
    const offerBox = document.getElementById('mz-followup-offer');
    const offerSelection = document.getElementById('mz-offer-selection');
    const offerDescription = document.getElementById('mz-offer-description');
    const offerPrice = document.getElementById('mz-offer-price');
    const offerIncludes = document.getElementById('mz-offer-includes');
    const offerContext = document.getElementById('mz-offer-context');
    const offerNote = document.getElementById('mz-offer-note');
    const orderLink = document.getElementById('mz-offer-order');
    const editButton = document.getElementById('mz-offer-edit');
    const exportFinalPdf = document.getElementById('mz-export-final-pdf');
    const exportFinalPng = document.getElementById('mz-export-final-png');
    const dateField = document.getElementById('mz-followup-date');
    const addressField = document.getElementById('mz-followup-address');
    const guestsField = document.getElementById('mz-followup-guests');
    const audienceField = document.getElementById('mz-followup-audience');
    const nameField = document.getElementById('mz-followup-name');
    const contactField = document.getElementById('mz-followup-contact');
    const phoneField = document.getElementById('mz-followup-phone');
    const noteField = document.getElementById('mz-followup-note');
    const followupSteps = Array.from(document.querySelectorAll('[data-followup-step]'));
    const followupStepButtons = Array.from(document.querySelectorAll('[data-followup-step-target]'));
    const followupBackButton = document.getElementById('mz-followup-back');
    const followupNextButton = document.getElementById('mz-followup-next');
    const followupSubmitButton = document.getElementById('mz-followup-submit');
    const savedDetails = document.getElementById('mz-followup-saved-details');
    const transferredFields = {
      guests: followup ? followup.querySelector('[data-followup-field="guests"]') : null,
      audience: followup ? followup.querySelector('[data-followup-field="audience"]') : null,
      energy: followup ? followup.querySelector('[data-followup-field="energy"]') : null
    };
    const params = new URLSearchParams(window.location.search);
    let activeFollowupStep = 0;

    if (!followup || !followupSection || !followupCard || !title || !description || !includes || !ticketEvent || !ticketScope || !ticketPackage || !ticketPrice || !ticketMeta || !savedDetails || !followupBackButton || !followupNextButton || !followupSubmitButton || !followupSteps.length || !followupStepButtons.length || !hiddenEvent || !hiddenVariant || !hiddenPrice || !hiddenEnergy || !hiddenAudience || !hiddenGuests || !hiddenBudget || !hiddenPromo || !success || !offerBox || !offerSelection || !offerDescription || !offerPrice || !offerIncludes || !offerContext || !offerNote || !orderLink || !editButton || !exportFinalPdf || !exportFinalPng || !dateField || !addressField || !guestsField || !audienceField || !nameField || !contactField || !phoneField || !noteField) return;

    const selected = {
      source: params.get('source') || '',
      event: params.get('event') || '',
      scope: params.get('scope') || '',
      scopeLabel: params.get('scopeLabel') || '',
      packageName: params.get('package') || '',
      variant: params.get('variant') || '',
      price: params.get('price') || '',
      lead: params.get('lead') || '',
      audience: params.get('audience') || '',
      guests: params.get('guests') || '',
      energy: params.get('energy') || '',
      budget: params.get('budget') || '',
      promo: params.get('promo') || '',
      bullets: (params.get('bullets') || '').split('||').filter(Boolean)
    };
    let latestFinalOffer = null;

    const fallbackBullets = {
      program: ['moderovanie alebo animacia', 'programovy blok podla vyberu', 'priestor na doladenie detailov'],
      atrakcie: ['vybrane atrakcie a doplnky', 'nasadenie podla priestoru akcie', 'doladenie rozsahu podla poctu ludi'],
      komplet: ['program aj atrakcie v jednom', 'zakladna organizacia akcie', 'doladenie detailov podla lokality a terminu']
    };

    function mapAudienceToFieldValue(value) {
      const normalized = (value || '').toLowerCase();
      if (normalized.includes('firma') || normalized.includes('hotel')) return 'firma';
      if (normalized.includes('obec') || normalized.includes('mesto')) return 'obec';
      if (normalized.includes('skola') || normalized.includes('škola') || normalized.includes('centrum')) return 'skola';
      if (normalized.includes('rodin') || normalized.includes('verej')) return 'rodina';
      return '';
    }

    function mapEnergyToFieldValue(value) {
      const normalized = (value || '').toLowerCase();
      if (normalized.includes('show') || normalized.includes('veľk') || normalized.includes('velk')) return 'show';
      if (normalized.includes('zabav') || normalized.includes('zábav')) return 'zabava';
      if (normalized.includes('pohod')) return 'pokoj';
      return '';
    }

    function setTransferredField(name, isTransferred) {
      if (!transferredFields[name]) return;
      transferredFields[name].classList.toggle('is-transferred', Boolean(isTransferred));
    }

    function updateSavedDetails() {
      const savedItems = [
        selected.guests ? `Počet ľudí: ${selected.guests}` : '',
        selected.audience ? `Publikum: ${selected.audience}` : '',
        selected.energy ? `Energia: ${selected.energy}` : ''
      ].filter(Boolean);

      savedDetails.hidden = !savedItems.length;
      savedDetails.innerHTML = savedItems.length
        ? `<span>Máme uložené</span>${savedItems.map((item) => `<strong>${sanitizeText(item)}</strong>`).join('')}`
        : '';
    }

    function getStepFields(stepIndex) {
      const step = followupSteps[stepIndex];
      if (!step) return [];
      return Array.from(step.querySelectorAll('input, select, textarea'))
        .filter((field) => !field.closest('.is-transferred') && field.type !== 'hidden');
    }

    function validateFollowupStep(stepIndex) {
      const firstInvalid = getStepFields(stepIndex).find((field) => !field.checkValidity());
      if (!firstInvalid) return true;
      firstInvalid.reportValidity();
      return false;
    }

    function showFollowupStep(stepIndex) {
      activeFollowupStep = Math.max(0, Math.min(stepIndex, followupSteps.length - 1));

      followupSteps.forEach((step, index) => {
        const isActive = index === activeFollowupStep;
        step.hidden = !isActive;
        step.classList.toggle('is-active', isActive);
      });

      followupStepButtons.forEach((button, index) => {
        button.classList.toggle('is-active', index === activeFollowupStep);
        button.classList.toggle('is-complete', index < activeFollowupStep);
      });

      followupBackButton.hidden = activeFollowupStep === 0;
      followupNextButton.hidden = activeFollowupStep === followupSteps.length - 1;
      followupSubmitButton.hidden = activeFollowupStep !== followupSteps.length - 1;
    }

    function scrollActiveFollowupStepIntoView() {
      const activeStep = followupSteps[activeFollowupStep];
      if (!activeStep) return;
      requestAnimationFrame(() => {
        activeStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    function moveFollowupStep(direction) {
      if (direction > 0 && !validateFollowupStep(activeFollowupStep)) {
        showToast('Dopln prosím údaje v tomto kroku.');
        return;
      }
      showFollowupStep(activeFollowupStep + direction);
      scrollActiveFollowupStepIntoView();
    }

    function getPricingGuests(value) {
      const numbers = String(value || '').match(/\d+/g);
      if (!numbers || !numbers.length) return value;
      return Math.max(...numbers.map((item) => Number(item)));
    }

    function normalizePlannerScope(value) {
      const raw = String(value || '').toLowerCase().trim();
      if (raw.includes('komplet')) return 'komplet';
      if (raw.includes('program') && raw.includes('atrak')) return 'komplet';
      if (raw.includes('atrak')) return 'atrakcie';
      if (raw.includes('program')) return 'program';
      return value || '';
    }

    function formatScopeParam(value) {
      const normalized = normalizePlannerScope(value);
      const labels = {
        program: 'Program',
        atrakcie: 'Atrakcie',
        komplet: 'Kompletná akcia'
      };
      return labels[normalized] || value || '';
    }

    function getScopeDisplayLabel() {
      return selected.scopeLabel || formatScopeParam(selected.scope);
    }

    function getScopeKey() {
      return getScopeDisplayLabel().toLowerCase().trim();
    }

    function getSelectionLabel() {
      return [selected.event, getScopeDisplayLabel(), selected.packageName || selected.variant].filter(Boolean).join(' / ') || 'Akcia na mieru';
    }

    function shouldShowBudgetAsDetail() {
      return Boolean(selected.budget && !selected.price);
    }

    function getTicketMetaLabel() {
      const details = [
        selected.audience,
        selected.guests ? `${selected.guests} ľudí` : '',
        selected.energy,
        shouldShowBudgetAsDetail() ? `rozpočet ${selected.budget}` : ''
      ].filter(Boolean);

      return details.length
        ? details.join(' / ')
        : 'Výber je pripravený, doplň už len dátum, miesto a kontakt.';
    }

    let selectedEnergy = '';

    function revealFollowup() {
      followupSection.hidden = false;
    }

    function applySelection(nextSelected, options = {}) {
      const incomingSelection = { ...(nextSelected || {}) };

      revealFollowup();

      Object.assign(selected, {
        source: '',
        event: '',
        scope: '',
        scopeLabel: '',
        packageName: '',
        variant: '',
        price: '',
        lead: '',
        audience: '',
        guests: '',
        energy: '',
        budget: '',
        promo: '',
        bullets: []
      }, incomingSelection);

      if (selected.event) {
        wizardState.eventName = selected.event;
      }

      ticketEvent.textContent = selected.event || 'Akcia na mieru';
      ticketScope.textContent = getScopeDisplayLabel() || 'Výber programu';
      ticketPackage.textContent = selected.packageName || selected.variant || 'Zvoľ si program v kalendári';
      ticketPrice.textContent = selected.price || (shouldShowBudgetAsDetail() ? selected.budget : 'Cena po nacenení');
      ticketMeta.textContent = getTicketMetaLabel();
      title.textContent = 'Čo obsahuje vybraný balík';
      description.textContent = selected.lead
        ? selected.lead
        : 'Toto je základ, z ktorého pripravíme finálnu ponuku podľa termínu, miesta a počtu ľudí.';
      includes.innerHTML = getOfferBullets()
        .map((item) => `<li>${sanitizeText(item)}</li>`)
        .join('');
      hiddenEvent.value = selected.event;
      hiddenVariant.value = selected.packageName || selected.variant;
      hiddenPrice.value = selected.price;
      hiddenAudience.value = selected.audience;
      hiddenGuests.value = selected.guests;
      hiddenBudget.value = selected.budget;
      hiddenPromo.value = selected.promo;
      updateSavedDetails();

      if (selected.audience) {
        audienceField.value = mapAudienceToFieldValue(selected.audience);
        audienceField.required = false;
        setTransferredField('audience', true);
      } else {
        audienceField.required = true;
        setTransferredField('audience', false);
      }

      if (selected.guests) {
        guestsField.value = '';
        guestsField.required = false;
        setTransferredField('guests', true);
      } else {
        guestsField.required = true;
        setTransferredField('guests', false);
      }

      if (selected.energy) {
        selectedEnergy = mapEnergyToFieldValue(selected.energy);
        hiddenEnergy.value = selected.energy;
        energyButtons.forEach((button) => {
          button.classList.toggle('is-active', button.dataset.energy === selectedEnergy);
        });
        setTransferredField('energy', true);
      } else {
        selectedEnergy = '';
        hiddenEnergy.value = '';
        energyButtons.forEach((button) => button.classList.remove('is-active'));
        setTransferredField('energy', false);
      }

      if (options.scroll) {
        requestAnimationFrame(() => {
          followupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      showFollowupStep(0);
    }

    function getOfferBullets() {
      if (selected.bullets.length) return selected.bullets;
      const scopeKey = getScopeKey();
      if ((scopeKey.includes('program') && scopeKey.includes('atrak')) || scopeKey.includes('komplet')) return fallbackBullets.komplet;
      if (scopeKey.includes('program')) return fallbackBullets.program;
      if (scopeKey.includes('atrak')) return fallbackBullets.atrakcie;
      return fallbackBullets.komplet;
    }

    function formatAudience(value) {
      const audienceMap = {
        rodina: 'rodinna akcia',
        firma: 'firemny klient',
        obec: 'mesto alebo obec',
        skola: 'skola alebo centrum',
        ine: 'individualne zadanie'
      };

      return audienceMap[value] || value || '';
    }

    function formatEnergy(value) {
      const energyMap = {
        pokoj: 'styl: pohoda',
        zabava: 'styl: zabava',
        show: 'styl: show a energia'
      };

      return energyMap[value] || value || '';
    }

    function formatDate(value) {
      if (!value) return '';
      const isoValue = normalizeDateForStorage(value);
      const parsed = new Date(`${isoValue}T12:00:00`);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toLocaleDateString('sk-SK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    function normalizeDateForStorage(value) {
      const normalizedValue = String(value || '').trim();
      if (!normalizedValue) return '';

      if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
        return normalizedValue;
      }

      const skDate = normalizedValue.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
      if (skDate) {
        return `${skDate[3]}-${skDate[2].padStart(2, '0')}-${skDate[1].padStart(2, '0')}`;
      }

      return normalizedValue;
    }

    function buildOfferContext(formData) {
      const items = [];

      if (formData.guests) items.push(`${formData.guests} ľudí`);
      if (formData.address) items.push(formData.address);
      if (formData.audience) items.push(formatAudience(formData.audience));
      if (formData.energy) items.push(formatEnergy(formData.energy));
      if (formData.budget && shouldShowBudgetAsDetail()) items.push(`rozpočet ${formData.budget}`);
      if (formData.promo) items.push(`promo: ${formData.promo}`);
      if (formData.date) items.push(`termin ${formatDate(formData.date)}`);

      return items.filter(Boolean);
    }

    function getRequestSupabaseClient() {
      try {
        const client = window.MZSupabase?.getClient?.() || null;
        if (!client) {
          console.error('[MZ client request] Supabase client is not available. Check supabase-js and js/supabase-config.js loading order.');
        }
        return client;
      } catch (error) {
        console.error('[MZ client request] Supabase client initialization failed:', error);
        return null;
      }
    }

    function buildRequestPayload(offerData, formData) {
      return {
        status: 'pending',
        contact_name: formData.name,
        contact_email: formData.email.toLowerCase(),
        contact_phone: formData.phone || null,
        title: selected.event || getEventName(),
        event_date: normalizeDateForStorage(formData.date) || null,
        location: formData.address || null,
        audience: formData.audience || null,
        guest_count: formData.guests || null,
        energy: formData.energy || null,
        budget: formData.budget || null,
        promo: formData.promo || null,
        selected_variant: selected.packageName || selected.variant || null,
        selected_price: offerData.price || null,
        services: offerData.bullets.join('\n') || null,
        notes: formData.note || null
      };
    }

    async function submitClientRequest(offerData, formData) {
      const supabaseClient = getRequestSupabaseClient();
      if (!supabaseClient) {
        throw new Error('Databazove odoslanie nie je dostupne.');
      }

      const payload = buildRequestPayload(offerData, formData);
      const { error } = await supabaseClient
        .from('client_requests')
        .insert(payload);

      if (error) {
        console.error('[MZ client request] Insert into client_requests failed:', error);
        throw new Error(error.message || 'Dopyt sa nepodarilo ulozit.');
      }
    }

    function createMailtoHref(offerData, formData) {
      const subject = `Objednávka / ${offerData.selection}`;
      const bodyLines = [
        'Dobrý deň,',
        '',
        'mám záujem o túto ponuku od Majstrov zábavy:',
        `${offerData.selection}`,
        `Predbežná cena: ${offerData.price}`,
        '',
        'Základné údaje:',
        formData.date ? `Dátum akcie: ${formatDate(formData.date)}` : '',
        formData.address ? `Miesto akcie: ${formData.address}` : '',
        formData.guests ? `Počet ľudí: ${formData.guests}` : '',
        formData.audience ? `Pre koho je akcia: ${formatAudience(formData.audience)}` : '',
        formData.energy ? `Štýl energie: ${formatEnergy(formData.energy).replace('styl: ', '')}` : '',
        formData.budget && shouldShowBudgetAsDetail() ? `Rozpočet: ${formData.budget}` : '',
        formData.promo ? `Promo: ${formData.promo}` : '',
        formData.name ? `Meno: ${formData.name}` : '',
        formData.email ? `Email: ${formData.email}` : '',
        formData.phone ? `Telefon: ${formData.phone}` : '',
        formData.note ? `Poznámka: ${formData.note}` : '',
        '',
        'Prosím o doladenie detailov.',
        '',
        'Ďakujem.'
      ].filter(Boolean);

      return `mailto:info@majstrizabavy.sk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    }

    function renderFinalExport(offerData, formData, type) {
      const context = buildOfferContext(formData);
      const modifier = type === 'mobile' ? 'mz-export-card--mobile' : 'mz-export-card--final';
      elements.exportStage.innerHTML = buildExportShell(modifier, `
        <p class="mz-export-card__lead">${sanitizeText(offerData.selection)}</p>
        <div class="mz-export-final-hero">
          <div>
            <span>Vybraná ponuka</span>
            <strong>${sanitizeText(selected.packageName || selected.variant || 'MZ Show')}</strong>
          </div>
          <div>
            <span>Predbežná cena</span>
            <strong>${sanitizeText(offerData.price)}</strong>
          </div>
        </div>
        <div class="mz-export-final-grid">
          <section>
            <h2>Čo je v cene</h2>
            <ul>${offerData.bullets.map((item) => `<li>${sanitizeText(item)}</li>`).join('')}</ul>
          </section>
          <section>
            <h2>Detaily zadania</h2>
            <div class="mz-export-tags mz-export-tags--stacked">
              ${context.map((item) => `<span>${sanitizeText(item)}</span>`).join('')}
            </div>
          </section>
        </div>
        <div class="mz-export-note">${sanitizeText(offerData.note)}</div>
      `);
      return elements.exportStage.firstElementChild;
    }

    async function exportElementToPng(element, filename) {
      if (!window.html2canvas) {
        showToast('Export PNG sa nepodarilo načítať. Skús to prosím ešte raz.');
        return;
      }

      elements.exportStage.classList.add('is-rendering');
      await new Promise((resolve) => requestAnimationFrame(resolve));

      try {
        const canvas = await window.html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        link.click();
      } finally {
        elements.exportStage.classList.remove('is-rendering');
      }
    }

    window.MZApplyFollowupSelection = function applyQuickSelection(data) {
      applySelection({
        source: 'quick-calc',
        ...data
      }, { scroll: true });
    };

    if (selected.event && (selected.scope || selected.scopeLabel)) {
      applySelection(selected, { scroll: window.location.hash === '#planner-form' });
    }

    function autoResizeTextarea(field) {
      if (!field) return;
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight}px`;
    }

    function openNativeDatePicker() {
      if (typeof dateField.showPicker === 'function') {
        try {
          dateField.showPicker();
        } catch (error) {
          // Some mobile browsers allow only their native focus behavior.
        }
      }
    }

    function renderOfferResult() {
      const formData = {
        date: normalizeDateForStorage(dateField.value),
        address: addressField.value.trim(),
        guests: selected.guests || guestsField.value.trim(),
        audience: selected.audience || audienceField.value,
        energy: selected.energy || selectedEnergy,
        budget: selected.budget,
        promo: selected.promo,
        name: nameField.value.trim(),
        email: contactField.value.trim(),
        phone: phoneField.value.trim(),
        contact: [contactField.value.trim(), phoneField.value.trim()].filter(Boolean).join(' / '),
        note: noteField.value.trim()
      };

      const selection = getSelectionLabel();
      const pricing = pricingApi
        ? pricingApi.calculateOffer({
            scope: normalizePlannerScope(selected.scopeLabel || selected.scope),
            eventName: selected.event,
            audience: formData.audience,
            guests: getPricingGuests(formData.guests),
            budget: formData.budget,
            packageName: selected.packageName || selected.variant,
            price: selected.price
          })
        : null;
      const price = selected.price || (pricing ? pricing.priceText : 'Cena na vyziadanie');
      const showPricingBreakdown = Boolean(pricing && !selected.price);
      const bullets = getOfferBullets();
      const contextItems = buildOfferContext(formData).concat(
        pricing ? pricing.reasons.slice(0, 3) : [],
        ...(showPricingBreakdown ? getKompletSavingsContext(pricing) : [])
      );

      offerSelection.textContent = selection;
      offerDescription.textContent = selected.lead
        ? `${selected.lead} Ponuku sme pripravili podľa tvojho výberu a zadaných údajov.`
        : 'Ponuku sme pripravili podľa tvojho výberu a zadaných údajov.';
      offerPrice.textContent = price;
      offerIncludes.innerHTML = bullets.map((item) => `<li>${item}</li>`).join('');
      offerContext.innerHTML = contextItems.length
        ? contextItems.map((item) => `<span class="mz-followup-offer__context-chip">${item}</span>`).join('')
        : '<span class="mz-followup-offer__context-chip">Finálne detaily doladíme spolu</span>';
      offerNote.textContent = showPricingBreakdown && pricing.scope === 'komplet' && pricing.discountAmount
        ? `Komplet akcia je cenovo zvýhodnená oproti samostatnému objednaniu služieb. Samostatne by ťa táto kombinácia vyšla na ${pricing.listPriceText}, teraz ju vidíš za ${pricing.exactPriceText}. Ak ti vyhovuje, môžeš pokračovať v objednávke alebo s nami doladiť posledné detaily.`
        : 'Ponuka bola pripravená podľa vybraného variantu a zadaných údajov. Ak ti vyhovuje, môžeš pokračovať v objednávke alebo s nami doladiť posledné detaily.';
      orderLink.href = createMailtoHref({ selection, price }, formData);
      latestFinalOffer = {
        selection,
        price,
        bullets,
        note: offerNote.textContent,
        formData
      };
      success.hidden = true;
      followupCard.classList.add('is-offer-ready');
      offerBox.hidden = false;

      requestAnimationFrame(() => {
        offerBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    energyButtons.forEach((button) => {
      button.addEventListener('click', () => {
        energyButtons.forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');
        selectedEnergy = button.dataset.energy;
        hiddenEnergy.value = selectedEnergy;
      });
    });

    autoResizeTextarea(noteField);
    noteField.addEventListener('input', () => autoResizeTextarea(noteField));
    dateField.addEventListener('click', openNativeDatePicker);
    dateField.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      openNativeDatePicker();
    });

    followupBackButton.addEventListener('click', () => moveFollowupStep(-1));
    followupNextButton.addEventListener('click', () => moveFollowupStep(1));
    followupStepButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetStep = Number(button.dataset.followupStepTarget || 0);
        if (targetStep <= activeFollowupStep) {
          showFollowupStep(targetStep);
          return;
        }

        for (let index = activeFollowupStep; index < targetStep; index += 1) {
          if (!validateFollowupStep(index)) return;
        }
        showFollowupStep(targetStep);
        scrollActiveFollowupStepIntoView();
      });
    });

    showFollowupStep(0);

    followup.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!followup.reportValidity()) {
        showToast('Dopln prosím všetky dôležité údaje.');
        return;
      }
      hiddenEnergy.value = selected.energy || selectedEnergy || '';
      showOverlay('MAJSTRI ZÁBAVY', 'Pripravujeme vašu ponuku...');
      window.setTimeout(() => {
        hideOverlay();
        renderOfferResult();
        showToast('Predbežná ponuka je pripravená.');
      }, 2200);
    });

    editButton.addEventListener('click', () => {
      followupCard.classList.remove('is-offer-ready');
      offerBox.hidden = true;
      success.hidden = true;
      followupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    orderLink.addEventListener('click', async (event) => {
      if (!latestFinalOffer) return;

      event.preventDefault();
      orderLink.setAttribute('aria-busy', 'true');
      orderLink.textContent = 'Odosielam dopyt...';

      try {
        await submitClientRequest(latestFinalOffer, latestFinalOffer.formData);
        success.hidden = false;
        showToast('Dopyt je odoslaný. Ozveme sa po kontrole.');
      } catch (error) {
        console.error('[MZ client request] Falling back to email because request save failed:', error);
        window.location.href = orderLink.href;
        success.hidden = false;
        showToast('Otvárame predvyplnený email s objednávkou.');
      } finally {
        orderLink.removeAttribute('aria-busy');
        orderLink.textContent = 'Objednať / odoslať dopyt';
      }
    });

    exportFinalPdf.addEventListener('click', async () => {
      if (!latestFinalOffer) {
        showToast('Najprv si zobraz finálnu ponuku.');
        return;
      }
      const exportElement = renderFinalExport(latestFinalOffer, latestFinalOffer.formData, 'pdf');
      await exportElementToPdf(exportElement, getDownloadName('finalna-ponuka', 'pdf'));
    });

    exportFinalPng.addEventListener('click', async () => {
      if (!latestFinalOffer) {
        showToast('Najprv si zobraz finálnu ponuku.');
        return;
      }
      const exportElement = renderFinalExport(latestFinalOffer, latestFinalOffer.formData, 'mobile');
      await exportElementToPng(exportElement, getDownloadName('mobilna-ponuka', 'png'));
    });
  })();
})();

