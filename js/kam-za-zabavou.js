const publicCitySelect = document.getElementById('publicCitySelect');
const publicMonthGrid = document.getElementById('publicMonthGrid');
const publicEventList = document.getElementById('publicEventList');
const publicEventListShell = document.getElementById('publicEventListShell');
const publicEventMonthLabel = document.getElementById('publicEventMonthLabel');
const publicEventListTitle = document.getElementById('publicEventListTitle');
const publicCityNote = document.getElementById('publicCityNote');
const weekendSpotlight = document.getElementById('weekendSpotlight');
const weekendSpotlightRange = document.getElementById('weekendSpotlightRange');
const weekendSpotlightList = document.getElementById('weekendSpotlightList');

const eventModal = document.getElementById('eventModal');
const eventModalTitle = document.getElementById('eventModalTitle');
const eventModalMeta = document.getElementById('eventModalMeta');
const eventModalPoster = document.getElementById('eventModalPoster');
const eventModalPosterImage = document.getElementById('eventModalPosterImage');
const eventModalPosterFallback = document.getElementById('eventModalPosterFallback');
const eventModalShare = document.getElementById('eventModalShare');
const transparentImageSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

let activePublicMonth = null;
let activePublicEventId = null;
let activePublicCity = '';
let approvedPublicEvents = [];
let publicEventsLoaded = false;
let publicEventsError = '';

function decodeHtmlEntities(value) {
  const parser = document.createElement('textarea');
  parser.innerHTML = value;
  return parser.value;
}

function getAllPublicEvents() {
  return approvedPublicEvents;
}

function getPublicCityOptions() {
  if (window.MZSupabase?.getCityOptions) {
    return window.MZSupabase.getCityOptions();
  }

  return [];
}

function getPublicMonth(monthKey) {
  return publicEventMonths.find((month) => month.key === monthKey) || publicEventMonths[0];
}

function getPublicCity(cityKey) {
  return getPublicCityOptions().find((city) => city.key === cityKey) || null;
}

function hasSelectedPublicCity(cityKey = activePublicCity) {
  return Boolean(getPublicCity(cityKey));
}

function getPublicEvent(eventId) {
  return getAllPublicEvents().find((eventItem) => eventItem.id === eventId) || null;
}

function parsePublicEventDate(eventItem) {
  if (!eventItem?.isoDate) return null;

  const parsedDate = new Date(`${eventItem.isoDate}T12:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function matchesActiveCity(eventItem, cityKey = activePublicCity) {
  return Boolean(cityKey) && eventItem.cityKey === cityKey;
}

function getPublicEventsForMonth(monthKey, cityKey = activePublicCity) {
  if (!cityKey) return [];

  return getAllPublicEvents().filter((eventItem) => (
    eventItem.month === monthKey && matchesActiveCity(eventItem, cityKey)
  ));
}

function getFirstMonthWithEvents(cityKey = activePublicCity) {
  if (!cityKey) return publicEventMonths[0].key;

  const firstEvent = getAllPublicEvents().find((eventItem) => matchesActiveCity(eventItem, cityKey));
  return firstEvent?.month || publicEventMonths[0].key;
}

function getFirstCityWithEvents() {
  const firstEvent = getAllPublicEvents().find((eventItem) => Boolean(getPublicCity(eventItem.cityKey)));
  return firstEvent?.cityKey || '';
}

function buildPublicEventUrl(eventItem) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'public');
  url.searchParams.set('month', eventItem.month);

  if (eventItem.cityKey) {
    url.searchParams.set('city', eventItem.cityKey);
  } else {
    url.searchParams.delete('city');
  }

  url.searchParams.set('event', eventItem.id);
  url.hash = 'rok';
  return `${url.pathname}${url.search}${url.hash}`;
}

function syncPublicEventBrowserUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'public');

  if (activePublicMonth) {
    url.searchParams.set('month', activePublicMonth);
  } else {
    url.searchParams.delete('month');
  }

  if (activePublicCity) {
    url.searchParams.set('city', activePublicCity);
  } else {
    url.searchParams.delete('city');
  }

  if (activePublicEventId) {
    url.searchParams.set('event', activePublicEventId);
  } else {
    url.searchParams.delete('event');
  }

  url.hash = 'rok';
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function scrollPublicEventsIntoView() {
  if (!publicEventListShell) return;
  if (!window.matchMedia('(max-width: 980px)').matches) return;

  publicEventListShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPublicCities() {
  if (!publicCitySelect) return;

  publicCitySelect.innerHTML = [
    `<option value=""${!activePublicCity ? ' selected' : ''}>Vyber lokalitu</option>`,
    ...getPublicCityOptions().map((city) => (
      `<option value="${city.key}"${city.key === activePublicCity ? ' selected' : ''}>${city.name}</option>`
    ))
  ].join('');
}

function renderPublicMonths() {
  if (!publicMonthGrid) return;

  if (!hasSelectedPublicCity()) {
    publicMonthGrid.innerHTML = '';
    publicMonthGrid.hidden = true;
    return;
  }

  publicMonthGrid.hidden = false;

  publicMonthGrid.innerHTML = publicEventMonths.map((month) => {
    const eventCount = getPublicEventsForMonth(month.key).length;
    const isActive = month.key === activePublicMonth;
    const eventLabel = eventCount === 1 ? 'akcia' : eventCount >= 2 && eventCount <= 4 ? 'akcie' : 'akcií';

    return `
      <button
        type="button"
        class="public-month-card${isActive ? ' is-active' : ''}"
        data-public-month="${month.key}"
      >
        <span class="public-month-card__top">
          <span class="public-month-card__num" style="color:${month.accent}">${month.number}</span>
          <span class="public-month-card__count">${eventCount} ${eventLabel}</span>
        </span>
        <span class="public-month-card__name">${month.name}</span>
        <span class="public-month-card__hint">Pozrieť akcie</span>
      </button>
    `;
  }).join('');
}

function createPublicEventCard(eventItem) {
  return `
    <article class="public-event-card">
      <div class="public-event-card__meta-row">
        <div class="public-event-card__date">${eventItem.when}</div>
        <div class="public-event-card__city">${eventItem.where}</div>
      </div>
      <h4 class="public-event-card__title">${eventItem.title}</h4>
      <div class="public-event-card__actions">
        <button type="button" class="public-event-card__action" data-public-event-open="${eventItem.id}">Viac info</button>
        <button type="button" class="public-event-card__action public-event-card__action--ghost" data-public-event-share="${eventItem.id}">Zdieľať</button>
      </div>
    </article>
  `;
}

function getWeekendRange(baseDate = new Date()) {
  const reference = new Date(baseDate);
  reference.setHours(0, 0, 0, 0);

  const day = reference.getDay();
  const start = new Date(reference);

  if (day === 6) {
    start.setDate(reference.getDate() - 1);
  } else if (day === 0) {
    start.setDate(reference.getDate() - 2);
  } else if (day !== 5) {
    start.setDate(reference.getDate() + ((5 - day + 7) % 7));
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 2);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatWeekendRangeLabel(start, end) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startFormatter = new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: sameMonth ? undefined : 'short'
  });
  const endFormatter = new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: 'short'
  });

  return `${startFormatter.format(start)} - ${endFormatter.format(end)}`;
}

function getWeekendEvents(cityKey = activePublicCity) {
  const { start, end } = getWeekendRange();
  const events = getAllPublicEvents()
    .filter((eventItem) => {
      if (!matchesActiveCity(eventItem, cityKey)) return false;

      const eventDate = parsePublicEventDate(eventItem);
      return eventDate && eventDate >= start && eventDate <= end;
    })
    .sort((left, right) => parsePublicEventDate(left) - parsePublicEventDate(right));

  return { events, start, end };
}

function createWeekendEventCard(eventItem) {
  return `
    <article class="weekend-event-card">
      <div class="weekend-event-card__meta">
        <span class="weekend-event-card__date">${eventItem.when}</span>
        <span class="weekend-event-card__city">${eventItem.where}</span>
      </div>
      <h5 class="weekend-event-card__title">${eventItem.title}</h5>
      <div class="weekend-event-card__actions">
        <button type="button" class="public-event-card__action" data-public-event-open="${eventItem.id}">Viac info</button>
        <button type="button" class="public-event-card__action public-event-card__action--ghost" data-public-event-share="${eventItem.id}">Zdieľať</button>
      </div>
    </article>
  `;
}

function renderWeekendSpotlight() {
  if (!weekendSpotlight || !weekendSpotlightRange || !weekendSpotlightList) return;

  if (!hasSelectedPublicCity()) {
    weekendSpotlight.hidden = true;
    weekendSpotlightList.innerHTML = '';
    return;
  }

  weekendSpotlight.hidden = false;
  const city = getPublicCity(activePublicCity);
  const { events, start, end } = getWeekendEvents(activePublicCity);
  weekendSpotlightRange.textContent = formatWeekendRangeLabel(start, end);

  if (!events.length) {
    weekendSpotlightList.innerHTML = `
      <article class="weekend-event-card weekend-event-card--empty">
        <div class="weekend-event-card__empty-title">Na tento víkend tu zatiaľ nič nie je.</div>
        <div class="weekend-event-card__empty-copy">Po schválení nových akcií sa sem automaticky vytiahnu najbližšie podujatia pre lokalitu ${city.name}. Kalendár ostáva hlavný, tento blok je len rýchly výber.</div>
      </article>
    `;
    return;
  }

  weekendSpotlightList.innerHTML = events.map((eventItem) => createWeekendEventCard(eventItem)).join('');
}

function renderPublicEventList() {
  if (!publicEventList || !publicEventMonthLabel || !publicEventListTitle) return;

  if (!hasSelectedPublicCity()) {
    if (publicEventListShell) publicEventListShell.hidden = true;
    publicEventList.innerHTML = '';
    return;
  }

  if (!activePublicMonth) return;

  if (publicEventListShell) publicEventListShell.hidden = false;

  const month = getPublicMonth(activePublicMonth);
  const city = getPublicCity(activePublicCity);
  const monthEvents = getPublicEventsForMonth(activePublicMonth);

  publicEventMonthLabel.innerHTML = `Mesiac ${month.name} &bull; ${city.name}`;

  publicEventListTitle.textContent = monthEvents.length
    ? 'Akcie v okolí'
    : 'Zatiaľ bez akcií';

  if (!monthEvents.length) {
    publicEventList.innerHTML = `
      <div class="public-event-card public-event-card--empty">
        <div class="public-event-card__empty-title">Tento výber je zatiaľ prázdny.</div>
        <div class="public-event-card__empty-copy">Pre ${decodeHtmlEntities(month.name)} v lokalite ${city.name} tu zatiaľ nič nie je. Keď pribudnú nové akcie, zobrazia sa práve tu.</div>
      </div>
    `;
    return;
  }

  publicEventList.innerHTML = monthEvents.map((eventItem) => createPublicEventCard(eventItem)).join('');
}

function renderPublicEventBrowser() {
  renderPublicCities();

  if (publicCityNote) {
    publicCityNote.hidden = false;

    if (publicEventsError) {
      publicCityNote.textContent = publicEventsError;
    } else if (!publicEventsLoaded) {
      publicCityNote.textContent = 'Načítavam akcie...';
    } else if (hasSelectedPublicCity()) {
      publicCityNote.textContent = `Zobrazujeme akcie pre lokalitu ${getPublicCity(activePublicCity).name}.`;
    } else {
      publicCityNote.textContent = '';
      publicCityNote.hidden = true;
    }
  }

  renderPublicMonths();
  renderPublicEventList();
  renderWeekendSpotlight();
}

function populateEventModal(eventItem) {
  if (!eventModalTitle || !eventModalMeta || !eventModalPoster || !eventModalPosterImage || !eventModalPosterFallback) return;

  eventModalTitle.innerHTML = eventItem.title;
  eventModalMeta.innerHTML = `${eventItem.when} &bull; ${eventItem.where}`;
  if (eventModalShare) {
    eventModalShare.textContent = 'Zdieľať akciu';
    eventModalShare.dataset.shareEventId = eventItem.id;
    eventModalShare.dataset.shareUrl = new URL(buildPublicEventUrl(eventItem), window.location.href).href;
    eventModalShare.removeAttribute('aria-disabled');
    eventModalShare.classList.remove('is-disabled');
  }

  if (eventItem.poster) {
    eventModalPoster.href = eventItem.moreInfoUrl || eventItem.poster;
    eventModalPosterImage.src = eventItem.poster;
    eventModalPosterImage.alt = `${decodeHtmlEntities(eventItem.title)} plagát`;
    eventModalPosterImage.hidden = false;
    eventModalPosterFallback.hidden = true;
    eventModalPoster.classList.remove('is-placeholder');
  } else {
    eventModalPoster.removeAttribute('href');
    eventModalPosterImage.src = transparentImageSrc;
    eventModalPosterImage.hidden = true;
    eventModalPosterFallback.hidden = false;
    eventModalPoster.classList.add('is-placeholder');
  }
}

function openEventModal(eventId, options = {}) {
  const { syncUrl = true, preserveFilters = true } = options;
  const eventItem = getPublicEvent(eventId);

  if (!eventItem || !eventModal) return;

  activePublicEventId = eventItem.id;
  activePublicMonth = eventItem.month;
  if (!preserveFilters) {
    activePublicCity = eventItem.cityKey || '';
  }

  renderPublicEventBrowser();
  populateEventModal(eventItem);
  eventModal.classList.add('is-open');
  eventModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (syncUrl) syncPublicEventBrowserUrl();
}

function closeEventModal(options = {}) {
  const { syncUrl = true } = options;
  if (!eventModal) return;

  eventModal.classList.remove('is-open');
  eventModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  activePublicEventId = null;

  if (syncUrl && activePublicMonth) syncPublicEventBrowserUrl();
}

function setActivePublicMonth(monthKey, options = {}) {
  const { syncUrl = true, scrollList = false } = options;

  activePublicMonth = getPublicMonth(monthKey).key;
  renderPublicEventBrowser();

  if (syncUrl) syncPublicEventBrowserUrl();
  if (scrollList) scrollPublicEventsIntoView();
}

function setActivePublicCity(cityKey, options = {}) {
  const { syncUrl = true } = options;
  const selectedCity = getPublicCity(cityKey);

  activePublicCity = selectedCity?.key || '';

  if (!activePublicCity) {
    activePublicMonth = null;
    renderPublicEventBrowser();
    if (syncUrl) syncPublicEventBrowserUrl();
    return;
  }

  if (!getPublicEventsForMonth(activePublicMonth, activePublicCity).length) {
    activePublicMonth = getFirstMonthWithEvents(activePublicCity);
  }

  renderPublicEventBrowser();

  if (syncUrl) syncPublicEventBrowserUrl();
}

function copyTextWithFallback(value) {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
}

function setShareButtonFeedback(button, message) {
  if (!button) return;
  const originalText = button.textContent;
  button.textContent = message;
  window.setTimeout(() => {
    button.textContent = originalText || 'Zdieľať akciu';
  }, 1800);
}

async function sharePublicEvent(eventId, triggerButton = null) {
  const eventItem = getPublicEvent(eventId);
  const shareUrlFromButton = triggerButton?.dataset.shareUrl || '';
  if (!eventItem && !shareUrlFromButton) return;

  const shareUrl = shareUrlFromButton || new URL(buildPublicEventUrl(eventItem), window.location.href).href;
  const shareData = {
    title: decodeHtmlEntities(eventItem?.title || document.title || 'Majstri zábavy'),
    text: eventItem ? `${decodeHtmlEntities(eventItem.when)} - ${decodeHtmlEntities(eventItem.where)}` : 'Akcia v kalendári Majstrov zábavy',
    url: shareUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      if (eventModalShare) eventModalShare.textContent = 'Link skopírovaný';
      window.setTimeout(() => {
        if (eventModalShare) eventModalShare.textContent = 'Zdieľať';
      }, 1800);
      return;
    }

    sharePublicEventFallback(eventItem, shareUrl, triggerButton);
    return;
  } catch (error) {
    // Ak používateľ zavrie zdieľanie, nechceme hlásiť chybu.
  }
  sharePublicEventFallback(eventItem, shareUrl, triggerButton);
}

function sharePublicEventFallback(eventItem, shareUrl, triggerButton = null) {
  if (copyTextWithFallback(shareUrl)) {
    setShareButtonFeedback(triggerButton || eventModalShare, 'Link skopírovaný');
    return;
  }

  const subject = encodeURIComponent(decodeHtmlEntities(eventItem?.title || document.title || 'Majstri zábavy'));
  const bodyText = eventItem
    ? `${decodeHtmlEntities(eventItem.when)} - ${decodeHtmlEntities(eventItem.where)}\n${shareUrl}`
    : shareUrl;
  const body = encodeURIComponent(bodyText);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

async function loadApprovedPublicEvents() {
  if (!window.MZSupabase) {
    publicEventsError = 'Supabase konfigurácia sa nenačítala.';
    publicEventsLoaded = true;
    renderPublicEventBrowser();
    return;
  }

  try {
    const supabaseClient = window.MZSupabase.getClient();
    const { data, error } = await supabaseClient
      .from('events')
      .select('id, title, status, event_date, city_key, city_label, venue_name, region_label, description, audience, category, poster_path, more_info_url')
      .eq('status', 'approved')
      .order('event_date', { ascending: true });

    if (error) {
      throw error;
    }

    approvedPublicEvents = (data || []).map((row) => window.MZSupabase.mapEventRowToPublicEvent(row));
    publicEventsError = '';
  } catch (error) {
    approvedPublicEvents = [];
    publicEventsError = 'Akcie sa teraz nepodarilo načítať. Skús to prosím znova o chvíľu.';
  } finally {
    publicEventsLoaded = true;

    if (!activePublicCity) {
      activePublicCity = getFirstCityWithEvents();
      activePublicMonth = activePublicCity ? getFirstMonthWithEvents(activePublicCity) : null;
    }

    if (activePublicCity && !getPublicEventsForMonth(activePublicMonth, activePublicCity).length) {
      activePublicMonth = getFirstMonthWithEvents(activePublicCity);
    }

    renderPublicEventBrowser();
  }
}

async function initPublicEventBrowser() {
  if (!publicMonthGrid || !publicEventList || !publicCitySelect) return;

  const requestedParams = new URLSearchParams(window.location.search);
  const requestedEventId = requestedParams.get('event');
  const requestedMonth = requestedParams.get('month');
  const requestedCity = requestedParams.get('city');

  activePublicCity = getPublicCity(requestedCity || '')?.key || '';
  activePublicMonth = activePublicCity
    ? (requestedMonth && getPublicMonth(requestedMonth).key
        ? getPublicMonth(requestedMonth).key
        : getFirstMonthWithEvents(activePublicCity))
    : null;

  renderPublicEventBrowser();
  await loadApprovedPublicEvents();

  publicCitySelect.addEventListener('change', () => {
    closeEventModal({ syncUrl: false });
    setActivePublicCity(publicCitySelect.value);
  });

  publicMonthGrid.addEventListener('click', (event) => {
    const monthButton = event.target.closest('[data-public-month]');
    if (!monthButton) return;

    closeEventModal({ syncUrl: false });
    setActivePublicMonth(monthButton.dataset.publicMonth, { scrollList: true });
  });

  publicEventList.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-public-event-open]');
    if (openButton) {
      openEventModal(openButton.dataset.publicEventOpen);
      return;
    }

    const shareButton = event.target.closest('[data-public-event-share]');
    if (shareButton) {
      sharePublicEvent(shareButton.dataset.publicEventShare, shareButton);
    }
  });

  if (weekendSpotlightList) {
    weekendSpotlightList.addEventListener('click', (event) => {
      const openButton = event.target.closest('[data-public-event-open]');
      if (openButton) {
        openEventModal(openButton.dataset.publicEventOpen);
        return;
      }

      const shareButton = event.target.closest('[data-public-event-share]');
      if (shareButton) {
        sharePublicEvent(shareButton.dataset.publicEventShare, shareButton);
      }
    });
  }

  if (eventModal) {
    eventModal.querySelectorAll('[data-event-close]').forEach((element) => {
      element.addEventListener('click', () => closeEventModal());
    });
  }

  if (eventModalShare) {
    eventModalShare.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      sharePublicEvent(eventModalShare.dataset.shareEventId || activePublicEventId, eventModalShare);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeEventModal();
  });

  window.addEventListener('year-mode-change', (event) => {
    const { selectedMode, syncUrl } = event.detail || {};
    if (selectedMode !== 'public') {
      closeEventModal({ syncUrl: false });
      return;
    }

    if (syncUrl) syncPublicEventBrowserUrl();
  });

  if (requestedEventId && getPublicEvent(requestedEventId)) {
    openEventModal(requestedEventId, { syncUrl: false, preserveFilters: false });
  }
}

document.addEventListener('click', (event) => {
  const shareButton = event.target.closest('#eventModalShare');
  if (!shareButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  sharePublicEvent(shareButton.dataset.shareEventId || activePublicEventId, shareButton);
}, true);

initPublicEventBrowser();
