const clientAuthShell = document.getElementById('clientAuthShell');
const clientDashboardShell = document.getElementById('clientDashboardShell');
const clientAuthForm = document.getElementById('clientAuthForm');
const clientAuthStatus = document.getElementById('clientAuthStatus');
const clientLoginTab = document.getElementById('clientLoginTab');
const clientRegisterButton = document.getElementById('clientRegisterButton');
const clientAuthTitle = document.getElementById('clientAuthTitle');
const clientAuthIntro = document.getElementById('clientAuthIntro');
const clientAuthSubmit = document.getElementById('clientAuthSubmit');
const clientRegisterFields = document.querySelectorAll('.client-register-field');
const clientLogoutButton = document.getElementById('clientLogoutButton');
const clientRefreshButton = document.getElementById('clientRefreshButton');
const clientCurrentUser = document.getElementById('clientCurrentUser');
const clientInsightPanel = document.getElementById('clientInsightPanel');
const clientOfferSummary = document.getElementById('clientOfferSummary');
const clientOrdersHeading = document.getElementById('clientOrdersHeading');
const clientOrdersList = document.getElementById('clientOrdersList');
const clientOrdersEmpty = document.getElementById('clientOrdersEmpty');

let clientSession = null;
let clientOrders = [];
let clientOrdersHaveProgramColumns = true;
let clientAuthMode = 'login';

const CLIENT_ORDER_BASE_SELECT = [
  'id',
  'title',
  'event_date',
  'location',
  'status',
  'price',
  'services',
  'notes',
  'created_at',
  'updated_at'
].join(', ');

const CLIENT_ORDER_PROGRAM_SELECT = [
  CLIENT_ORDER_BASE_SELECT,
  'program_text',
  'program_status',
  'program_sent_at',
  'client_response_note',
  'client_response_at'
].join(', ');

const CLIENT_STATUS_LABELS = {
  draft: 'Návrh pripravujeme',
  sent: 'Nová ponuka',
  confirmed: 'Návrh prijatý',
  in_progress: 'Akcia v príprave',
  done: 'Akcia vybavená',
  cancelled: 'Zrušené'
};

const CLIENT_PROGRAM_STATUS_LABELS = {
  draft: 'Pripravujeme návrh',
  sent: 'Čaká na tvoje rozhodnutie',
  confirmed: 'Návrh prijatý',
  change_requested: 'Úprava odoslaná',
  rejected: 'Návrh odmietnutý'
};

function setClientStatus(type, message) {
  if (!clientAuthStatus) return;
  clientAuthStatus.className = `admin-auth__status${type ? ` is-${type}` : ''}`;
  clientAuthStatus.textContent = message;
}

function setClientAuthMode(mode) {
  clientAuthMode = mode === 'register' ? 'register' : 'login';
  const isRegister = clientAuthMode === 'register';

  if (clientLoginTab) {
    clientLoginTab.classList.toggle('is-active', !isRegister);
    clientLoginTab.setAttribute('aria-selected', String(!isRegister));
  }

  if (clientRegisterButton) {
    clientRegisterButton.classList.toggle('is-active', isRegister);
    clientRegisterButton.setAttribute('aria-selected', String(isRegister));
  }

  if (clientAuthTitle) clientAuthTitle.textContent = isRegister ? 'Registrácia' : 'Prihlásenie';
  if (clientAuthIntro) {
    clientAuthIntro.textContent = isRegister
      ? 'Vytvor si účet a sleduj svoje návrhy, ponuky a akcie na jednom mieste.'
      : 'Pristúp k svojim akciám, návrhom a ponukám.';
  }
  if (clientAuthSubmit) {
    clientAuthSubmit.textContent = isRegister ? 'Vytvoriť účet' : 'Prihlásiť sa';
    clientAuthSubmit.dataset.clientAuth = clientAuthMode;
  }
  clientRegisterFields.forEach((field) => {
    field.hidden = !isRegister;
  });

  setClientStatus('', isRegister
    ? 'Vyplň kontaktné údaje a heslo aspoň so 6 znakmi.'
    : 'Prihlás sa do svojej klientskej zóny.');
}

function getClientSupabase() {
  return window.MZSupabase?.getClient();
}

function formatClientPrice(value) {
  if (value === null || value === undefined || value === '') return 'Cena sa doplní';
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: numberValue % 1 === 0 ? 0 : 2
  }).format(numberValue);
}

function splitServices(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatClientDate(value) {
  return window.MZSupabase?.formatEventDate(value) || value || 'Dátum doplníme';
}

function isActionableOffer(order) {
  return Boolean(order.program_text) && ['sent', 'change_requested'].includes(order.program_status || 'draft');
}

function getClientOrderPriority(order) {
  if (isActionableOffer(order)) return 0;
  if ((order.program_status || 'draft') === 'draft' || (order.status || 'draft') === 'draft') return 1;
  if ((order.program_status || 'draft') === 'confirmed' || (order.status || 'draft') === 'confirmed') return 2;
  return 3;
}

function isOrderInCurrentMonth(order) {
  if (!order.event_date) return false;
  const eventDate = new Date(order.event_date);
  if (Number.isNaN(eventDate.getTime())) return false;

  const today = new Date();
  return eventDate.getFullYear() === today.getFullYear()
    && eventDate.getMonth() === today.getMonth();
}

function isConfirmedClientOrder(order) {
  return (order.program_status || '') === 'confirmed' || (order.status || '') === 'confirmed';
}

function getClientDisplayName() {
  const email = clientSession?.user?.email || '';
  if (!email) return 'Vitaj späť';
  const rawName = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!rawName) return 'Vitaj späť';
  return `Vitaj späť, ${rawName.charAt(0).toUpperCase()}${rawName.slice(1)}`;
}

function getNearestClientOrder() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return clientOrders
    .filter((order) => order.event_date && !Number.isNaN(new Date(order.event_date).getTime()))
    .filter((order) => new Date(order.event_date) >= today)
    .sort((first, second) => new Date(first.event_date) - new Date(second.event_date))[0] || null;
}

function getLoyaltyProgress(confirmedCount) {
  const nextMilestone = [3, 5, 10].find((milestone) => confirmedCount < milestone);
  if (!nextMilestone) {
    return {
      label: 'VIP výhody otvorené',
      hint: 'Máš nárok na individuálne podmienky.',
      value: '10+',
      percent: 100
    };
  }

  return {
    label: `Ešte ${nextMilestone - confirmedCount} do výhody`,
    hint: `Cieľ: ${nextMilestone} potvrdené akcie`,
    value: `${confirmedCount}/${nextMilestone}`,
    percent: Math.min(100, Math.round((confirmedCount / nextMilestone) * 100))
  };
}

function renderClientInsight() {
  if (!clientInsightPanel) return;

  const confirmedCount = clientOrders.filter(isConfirmedClientOrder).length;
  const nearestOrder = getNearestClientOrder();
  const progress = getLoyaltyProgress(confirmedCount);
  const safeGreeting = window.MZSupabase.escapeHtml(getClientDisplayName());
  const nearestTitle = nearestOrder ? nearestOrder.title || 'Najbližšia akcia' : 'Prvá spoločná akcia';
  const nearestDate = nearestOrder ? formatClientDate(nearestOrder.event_date) : 'Termín si vyberieme spolu';
  const nearestStatus = nearestOrder
    ? CLIENT_PROGRAM_STATUS_LABELS[nearestOrder.program_status] || CLIENT_STATUS_LABELS[nearestOrder.status] || 'Rozpracované'
    : 'Pripravené na plánovanie';

  clientInsightPanel.hidden = false;
  clientInsightPanel.innerHTML = `
    <section class="client-insight-card client-insight-card--welcome" aria-label="Osobný prehľad">
      <span>Osobný priestor</span>
      <strong>${safeGreeting}</strong>
      <small>Tvoje akcie, návrhy a výhody držíme pokope.</small>
    </section>
    <section class="client-insight-card client-insight-card--next" aria-label="Najbližšia akcia">
      <span>Najbližšia akcia</span>
      <strong>${window.MZSupabase.escapeHtml(nearestTitle)}</strong>
      <small>${window.MZSupabase.escapeHtml(nearestDate)} · ${window.MZSupabase.escapeHtml(nearestStatus)}</small>
    </section>
    <section class="client-insight-card client-insight-card--progress" aria-label="Klubový progres">
      <div>
        <span>Klubový progres</span>
        <strong>${window.MZSupabase.escapeHtml(progress.value)}</strong>
        <small>${window.MZSupabase.escapeHtml(progress.label)}</small>
      </div>
      <div class="client-insight-progress" aria-hidden="true">
        <i style="width: ${progress.percent}%"></i>
      </div>
      <small>${window.MZSupabase.escapeHtml(progress.hint)}</small>
    </section>
  `;
}

function renderClientStat(label, value, tone = '') {
  return `
    <div class="client-offer-summary__stat${tone ? ` is-${tone}` : ''}">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `;
}

function showClientLogin() {
  setClientAuthMode('login');
  if (clientAuthShell) clientAuthShell.hidden = false;
  if (clientDashboardShell) clientDashboardShell.hidden = true;
}

function showClientDashboard(userEmail) {
  if (clientAuthShell) clientAuthShell.hidden = true;
  if (clientDashboardShell) clientDashboardShell.hidden = false;
  if (clientAuthTitle) clientAuthTitle.textContent = 'Môj účet';
  if (clientAuthIntro) clientAuthIntro.textContent = 'Tvoje návrhy, ponuky a potvrdené akcie na jednom mieste.';
  if (clientCurrentUser) {
    const safeEmail = window.MZSupabase.escapeHtml(userEmail || 'Môj účet');
    clientCurrentUser.innerHTML = `
      <span class="client-account-pill">
        <i aria-hidden="true"></i>
        <span>${safeEmail}</span>
      </span>
    `;
  }
}

function renderClientOrderCard(order) {
  const safeTitle = window.MZSupabase.escapeHtml(order.title || 'Môj účet');
  const safeLocation = window.MZSupabase.escapeHtml(order.location || 'Miesto doplníme');
  const safeStatus = window.MZSupabase.escapeHtml(CLIENT_STATUS_LABELS[order.status] || order.status || 'Rozpracované');
  const safeNotes = window.MZSupabase.escapeHtml(order.notes || 'Detaily doplníme podľa dohody.').replace(/\n/g, '<br>');
  const safeProgram = window.MZSupabase.escapeHtml(order.program_text || '').replace(/\n/g, '<br>');
  const programStatus = order.program_status || 'draft';
  const safeProgramStatus = window.MZSupabase.escapeHtml(CLIENT_PROGRAM_STATUS_LABELS[programStatus] || programStatus);
  const safeClientResponse = window.MZSupabase.escapeHtml(order.client_response_note || '').replace(/\n/g, '<br>');
  const canRespondToProgram = isActionableOffer(order);
  const services = splitServices(order.services);
  const serviceMarkup = services.length
    ? services.map((item) => `<li>${window.MZSupabase.escapeHtml(item)}</li>`).join('')
    : '<li>Služby doplníme podľa návrhu.</li>';
  const contactSubject = encodeURIComponent(`Úprava návrhu akcie / ${order.title || 'Môj účet'}`);
  const contactBody = encodeURIComponent(`Dobrý deň,\n\nchcem upraviť návrh akcie: ${order.title || 'Môj účet'}.\n\nĎakujem.`);
  const cardStateClass = canRespondToProgram ? ' is-new-offer' : '';
  const offerIntro = canRespondToProgram
    ? `<div class="client-new-offer-banner">
        <span>Nová ponuka</span>
        <strong>Majstri zábavy ti poslali návrh akcie. Pozri si ho a vyber jednu z možností.</strong>
      </div>`
    : '';

  return `
    <article class="client-order-card${cardStateClass}">
      ${offerIntro}
      <div class="client-order-card__top">
        <div>
          <div class="client-order-card__eyebrow">${window.MZSupabase.escapeHtml(formatClientDate(order.event_date))}</div>
          <h2 class="client-order-card__title">${safeTitle}</h2>
        </div>
        <span class="client-order-status is-${window.MZSupabase.escapeHtml(order.status || 'draft')}">${safeStatus}</span>
      </div>

      <div class="client-order-card__meta">
        <div>
          <span>Miesto</span>
          <strong>${safeLocation}</strong>
        </div>
        <div>
          <span>Cena</span>
          <strong>${window.MZSupabase.escapeHtml(formatClientPrice(order.price))}</strong>
        </div>
      </div>

      <div class="client-order-card__grid">
        <div class="client-order-card__block">
          <div class="client-order-card__label">Navrhované služby</div>
          <ul>${serviceMarkup}</ul>
        </div>
        <div class="client-order-card__block">
          <div class="client-order-card__label">Detaily a pokyny</div>
          <p>${safeNotes}</p>
        </div>
      </div>

      ${order.program_text ? `
        <div class="client-program-panel">
          <div class="client-order-card__top">
            <div>
              <div class="client-order-card__label">Návrh akcie</div>
              <h3 class="client-program-panel__title">Ponuka od Majstrov zábavy</h3>
            </div>
            <span class="client-order-status is-${window.MZSupabase.escapeHtml(programStatus)}">${safeProgramStatus}</span>
          </div>
          <p class="client-program-panel__text">${safeProgram}</p>
          ${safeClientResponse ? `
            <div class="client-program-panel__response">
              <div class="client-order-card__label">Tvoja posledná reakcia</div>
              <p>${safeClientResponse}</p>
            </div>
          ` : ''}
          ${canRespondToProgram ? `
            <form class="client-program-response" data-client-program-form="${order.id}">
              <label class="partner-form__field">
                <span>Poznámka pre náš tím</span>
                <textarea name="note" rows="3" placeholder="Ak chceš úpravu, napíš nám jednoducho čo máme zmeniť."></textarea>
              </label>
              <div class="client-order-card__actions">
                <button type="submit" class="btn-primary" data-client-program-response="confirmed">Prijímam návrh</button>
                <button type="submit" class="btn-ghost" data-client-program-response="change_requested">Chcem úpravu</button>
                <button type="submit" class="btn-ghost admin-action-btn--danger" data-client-program-response="rejected">Odmietam návrh</button>
              </div>
            </form>
          ` : ''}
        </div>
      ` : ''}

      ${canRespondToProgram ? '' : `
        <div class="client-order-card__actions">
          <a class="btn-primary" href="mailto:info@majstrizabavy.sk?subject=${contactSubject}&body=${contactBody}">Chcem niečo upraviť</a>
          <a class="btn-ghost" href="kontakt.html#kontakt">Kontakt</a>
        </div>
      `}
    </article>
  `;
}

function renderClientOrders() {
  if (!clientOrdersList || !clientOrdersEmpty) return;

  renderClientInsight();

  if (!clientOrders.length) {
    clientOrdersList.innerHTML = '';
    clientOrdersEmpty.hidden = false;
    if (clientOfferSummary) clientOfferSummary.hidden = true;
    if (clientOrdersHeading) clientOrdersHeading.hidden = true;
    clientOrdersEmpty.textContent = 'Zatiaľ tu nemáš žiadny návrh akcie. Keď ti pripravíme ponuku, nájdeš ju tu.';
    return;
  }

  const newOffersCount = clientOrders.filter(isActionableOffer).length;
  const shouldShowSummary = clientOrders.length > 1 || newOffersCount > 0;
  if (clientOfferSummary) {
    const currentMonthCount = clientOrders.filter(isOrderInCurrentMonth).length;
    const confirmedCount = clientOrders.filter(isConfirmedClientOrder).length;

    clientOfferSummary.hidden = !shouldShowSummary;
    clientOfferSummary.innerHTML = `
      ${renderClientStat('Nové ponuky', newOffersCount, newOffersCount ? 'active' : '')}
      ${renderClientStat('Tento mesiac', currentMonthCount)}
      ${renderClientStat('Potvrdené', confirmedCount)}
      ${renderClientStat('Celkom', clientOrders.length)}
    `;
  }

  if (clientOrdersHeading) clientOrdersHeading.hidden = false;

  const sortedOrders = clientOrders.slice().sort((first, second) => {
    const priorityDiff = getClientOrderPriority(first) - getClientOrderPriority(second);
    if (priorityDiff) return priorityDiff;
    return String(second.created_at || '').localeCompare(String(first.created_at || ''));
  });

  clientOrdersEmpty.hidden = true;
  clientOrdersList.innerHTML = sortedOrders.map((order) => renderClientOrderCard(order)).join('');
}

async function loadClientOrders() {
  const supabaseClient = getClientSupabase();
  if (!supabaseClient) return;

  let response = await supabaseClient
    .from('client_orders')
    .select(CLIENT_ORDER_PROGRAM_SELECT)
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (response.error && /program_|client_response_/i.test(String(response.error.message || ''))) {
    clientOrdersHaveProgramColumns = false;
    response = await supabaseClient
      .from('client_orders')
      .select(CLIENT_ORDER_BASE_SELECT)
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
  }

  if (response.error) {
    throw new Error('Návrhy akcií sa nepodarilo načítať.');
  }

  clientOrders = response.data || [];
  renderClientOrders();
}

async function refreshClientOrdersSafely() {
  try {
    await loadClientOrders();
  } catch (error) {
    setClientStatus('error', error.message || 'Návrhy akcií sa nepodarilo načítať.');
  }
}

async function submitClientProgramResponse(orderId, responseStatus, note) {
  const supabaseClient = getClientSupabase();
  if (!supabaseClient) return;

  if (!clientOrdersHaveProgramColumns) {
    throw new Error('Reakcie na program budú dostupné po spustení SQL migrácie client-programs.sql.');
  }

  const { error } = await supabaseClient.rpc('respond_to_client_program', {
    p_order_id: orderId,
    p_response: responseStatus,
    p_note: note || null
  });

  if (error) {
    throw new Error(error.message || 'Reakciu sa nepodarilo uložiť.');
  }

  await refreshClientOrdersSafely();
}

async function handleClientAuth(event) {
  event.preventDefault();

  if (clientAuthMode === 'register') {
    await handleClientRegister();
    return;
  }

  const supabaseClient = getClientSupabase();
  if (!clientAuthForm || !supabaseClient) return;

  const formData = new FormData(clientAuthForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  setClientStatus('', 'Prihlasujem...');
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setClientStatus('error', 'Prihlásenie sa nepodarilo. Skontroluj email a heslo.');
    return;
  }

  setClientStatus('success', 'Prihlásenie prebehlo úspešne.');
}

async function handleClientRegister() {
  const supabaseClient = getClientSupabase();
  if (!clientAuthForm || !supabaseClient) return;

  const formData = new FormData(clientAuthForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('full_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();

  if (!fullName || !email || password.length < 6) {
    setClientStatus('error', 'Zadaj meno, email a heslo aspoň so 6 znakmi.');
    return;
  }

  setClientStatus('', 'Registrujem účet...');
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone
      }
    }
  });

  if (error) {
    setClientStatus('error', 'Registrácia sa nepodarila. Skús iný email alebo heslo.');
    return;
  }

  setClientStatus('success', data.session
    ? 'Registrácia prebehla úspešne.'
    : 'Registrácia prebehla. Ak Supabase vyžaduje potvrdenie emailu, skontroluj schránku.');
}

async function handleClientLogout() {
  const supabaseClient = getClientSupabase();
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
}

async function syncClientSession(session) {
  clientSession = session;

  if (!session?.user) {
    clientOrders = [];
    showClientLogin();
    renderClientOrders();
    return;
  }

  showClientDashboard(session.user.email);
  await refreshClientOrdersSafely();
}

function bindClientZone() {
  if (clientAuthForm) clientAuthForm.addEventListener('submit', handleClientAuth);
  if (clientLoginTab) clientLoginTab.addEventListener('click', () => setClientAuthMode('login'));
  if (clientRegisterButton) clientRegisterButton.addEventListener('click', () => setClientAuthMode('register'));
  if (clientLogoutButton) clientLogoutButton.addEventListener('click', handleClientLogout);
  if (clientRefreshButton) clientRefreshButton.addEventListener('click', refreshClientOrdersSafely);

  document.querySelectorAll('.client-benefit-card').forEach((card) => {
    card.addEventListener('click', () => {
      const isFlipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', String(isFlipped));
    });
  });

  if (clientOrdersList) {
    clientOrdersList.addEventListener('submit', async (event) => {
      const form = event.target.closest('[data-client-program-form]');
      if (!form) return;
      event.preventDefault();

      const submitter = event.submitter;
      const responseStatus = submitter?.dataset.clientProgramResponse || 'change_requested';
      const formData = new FormData(form);
      const note = String(formData.get('note') || '').trim();

      if (responseStatus === 'change_requested' && !note) {
        setClientStatus('error', 'Pri úprave napíš prosím, čo máme zmeniť.');
        return;
      }

      try {
        setClientStatus('', 'Ukladám tvoju reakciu...');
        await submitClientProgramResponse(form.dataset.clientProgramForm, responseStatus, note);
        setClientStatus('success', 'Reakcia je uložená. Ďakujeme.');
      } catch (error) {
        setClientStatus('error', error.message || 'Reakciu sa nepodarilo uložiť.');
      }
    });
  }
}

async function initClientZone() {
  const supabaseClient = getClientSupabase();
  if (!supabaseClient) return;

  bindClientZone();
  setClientAuthMode('login');

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  supabaseClient.auth.onAuthStateChange(async (_eventName, nextSession) => {
    await syncClientSession(nextSession);
  });

  await syncClientSession(session);
}

initClientZone().catch((error) => {
  setClientStatus('error', error.message || 'Klientská zóna sa nepodarila spustiť.');
});
