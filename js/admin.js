const adminLoginShell = document.getElementById('adminLoginShell');
const adminDashboardShell = document.getElementById('adminDashboardShell');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminStatus = document.getElementById('adminStatus');
const adminActionStatus = document.getElementById('adminActionStatus');
const adminCurrentUser = document.getElementById('adminCurrentUser');
const adminRefreshButton = document.getElementById('adminRefreshButton');
const adminLogoutButton = document.getElementById('adminLogoutButton');
const adminTabs = document.querySelectorAll('[data-admin-view]');
const adminPanels = document.querySelectorAll('[data-admin-panel]');
const adminSummaryLeads = document.getElementById('adminSummaryLeads');
const adminSummaryOrders = document.getElementById('adminSummaryOrders');
const adminSummaryWaitingClient = document.getElementById('adminSummaryWaitingClient');
const adminSummaryCalendar = document.getElementById('adminSummaryCalendar');
const adminOverviewLeads = document.getElementById('adminOverviewLeads');
const adminOverviewLeadsEmpty = document.getElementById('adminOverviewLeadsEmpty');
const adminOverviewCalendar = document.getElementById('adminOverviewCalendar');
const adminOverviewCalendarEmpty = document.getElementById('adminOverviewCalendarEmpty');
const adminLeadsBadge = document.getElementById('adminLeadsBadge');
const adminLeadsList = document.getElementById('adminLeadsList');
const adminLeadsEmpty = document.getElementById('adminLeadsEmpty');
const adminOrderForm = document.getElementById('adminOrderForm');
const adminOrderId = document.getElementById('adminOrderId');
const adminOrderFormMode = document.getElementById('adminOrderFormMode');
const adminOrderFormStatus = document.getElementById('adminOrderFormStatus');
const adminOrderClientEmail = document.getElementById('adminOrderClientEmail');
const adminOrderClientEmails = document.getElementById('adminOrderClientEmails');
const adminOrderStatus = document.getElementById('adminOrderStatus');
const adminOrderTitle = document.getElementById('adminOrderTitle');
const adminOrderDate = document.getElementById('adminOrderDate');
const adminOrderLocation = document.getElementById('adminOrderLocation');
const adminOrderPrice = document.getElementById('adminOrderPrice');
const adminOrderServices = document.getElementById('adminOrderServices');
const adminOrderNotes = document.getElementById('adminOrderNotes');
const adminOrderProgram = document.getElementById('adminOrderProgram');
const adminOrderProgramStatus = document.getElementById('adminOrderProgramStatus');
const adminOrderClientResponse = document.getElementById('adminOrderClientResponse');
const adminOrderResetButton = document.getElementById('adminOrderResetButton');
const adminOrderSaveButton = document.getElementById('adminOrderSaveButton');
const adminOrdersSearch = document.getElementById('adminOrdersSearch');
const adminOrdersList = document.getElementById('adminOrdersList');
const adminOrdersEmpty = document.getElementById('adminOrdersEmpty');
const adminCalendarPending = document.getElementById('adminCalendarPending');
const adminCalendarApproved = document.getElementById('adminCalendarApproved');
const adminCalendarRejected = document.getElementById('adminCalendarRejected');
const adminCalendarFilterGroup = document.getElementById('adminCalendarFilterGroup');
const adminCalendarList = document.getElementById('adminCalendarList');
const adminCalendarEmpty = document.getElementById('adminCalendarEmpty');

let adminSession = null;
let adminClientRequests = [];
let adminClientOrders = [];
let adminCalendarEvents = [];
let adminCalendarFilter = 'pending';
let adminOrderSaveInProgress = false;
let adminOrdersHaveProgramColumns = true;
let adminAutoRefreshTimer = null;
let adminRefreshPromise = null;
const adminOrderSaveButtonLabel = adminOrderSaveButton?.textContent || 'Ulozit navrh';
const ADMIN_SAVE_TIMEOUT_MS = 25000;

const ADMIN_CLIENT_REQUEST_SELECT = [
  'id',
  'status',
  'contact_name',
  'contact_email',
  'contact_phone',
  'title',
  'event_date',
  'location',
  'audience',
  'guest_count',
  'energy',
  'budget',
  'promo',
  'selected_variant',
  'selected_price',
  'services',
  'notes',
  'admin_note',
  'created_at',
  'approved_order_id'
].join(', ');

const ADMIN_CLIENT_REQUEST_BASE_SELECT = [
  'id',
  'status',
  'contact_name',
  'contact_email',
  'contact_phone',
  'title',
  'event_date',
  'location',
  'audience',
  'guest_count',
  'energy',
  'budget',
  'promo',
  'selected_variant',
  'selected_price',
  'services',
  'notes',
  'created_at'
].join(', ');

const ADMIN_CLIENT_ORDER_BASE_SELECT = [
  'id',
  'client_email',
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

const ADMIN_CLIENT_ORDER_PROGRAM_SELECT = [
  ADMIN_CLIENT_ORDER_BASE_SELECT,
  'program_text',
  'program_status',
  'program_sent_at',
  'client_response_note',
  'client_response_at'
].join(', ');

const ADMIN_EVENT_SELECT = [
  'id',
  'title',
  'status',
  'event_date',
  'city_label',
  'venue_name',
  'region_label',
  'category',
  'audience',
  'description',
  'poster_path',
  'more_info_url',
  'submitter_name',
  'submitter_email',
  'submitter_phone',
  'partner_name',
  'admin_note',
  'created_at'
].join(', ');

const ADMIN_ORDER_STATUS_LABELS = {
  draft: 'Rozpracovany navrh',
  sent: 'Navrh odoslany',
  confirmed: 'Potvrdene',
  in_progress: 'V priprave',
  done: 'Dokoncene',
  cancelled: 'Zrusene'
};

const ADMIN_PROGRAM_STATUS_LABELS = {
  draft: 'Koncept',
  sent: 'Odoslane klientovi',
  confirmed: 'Potvrdene klientom',
  change_requested: 'Klient ziada upravu',
  rejected: 'Zamietnute klientom'
};

function getAdminSupabase() {
  return window.MZSupabase?.getClient();
}

function safe(value) {
  return window.MZSupabase.escapeHtml(value || '');
}

function setStatus(target, type, message) {
  if (!target) return;
  target.className = target.className.replace(/\s?is-(success|error)/g, '');
  if (type) target.classList.add(`is-${type}`);
  target.textContent = message;
}

function setAdminStatus(type, message) {
  setStatus(adminStatus, type, message);
}

function setAdminActionStatus(type, message) {
  setStatus(adminActionStatus, type, message);
}

function setAdminOrderFormStatus(type, message) {
  setStatus(adminOrderFormStatus, type, message);
}

function showLogin() {
  if (adminLoginShell) adminLoginShell.hidden = false;
  if (adminDashboardShell) adminDashboardShell.hidden = true;
}

function showDashboard(userEmail) {
  if (adminLoginShell) adminLoginShell.hidden = true;
  if (adminDashboardShell) adminDashboardShell.hidden = false;
  if (adminCurrentUser) adminCurrentUser.textContent = userEmail || 'Admin';
}

function showAdminView(viewName) {
  adminTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.adminView === viewName);
  });

  adminPanels.forEach((panel) => {
    const isActive = panel.dataset.adminPanel === viewName;
    panel.hidden = !isActive;
    panel.classList.toggle('is-active', isActive);
  });
}

function formatDate(value) {
  return window.MZSupabase?.formatEventDate(value) || value || 'Bez datumu';
}

function formatCreatedAt(value) {
  if (!value) return 'Bez datumu';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return String(value).slice(0, 10);

  return new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsedDate);
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return 'Cena nie je zadana';
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: numberValue % 1 === 0 ? 0 : 2
  }).format(numberValue);
}

function renderSummary() {
  const pendingLeads = adminClientRequests.filter((request) => request.status === 'pending');
  const pendingCalendar = adminCalendarEvents.filter((eventItem) => eventItem.status === 'pending');
  const waitingClient = adminClientOrders.filter((order) => order.program_status === 'sent' || order.program_status === 'change_requested');

  if (adminSummaryLeads) adminSummaryLeads.textContent = String(pendingLeads.length);
  if (adminSummaryOrders) adminSummaryOrders.textContent = String(adminClientOrders.length);
  if (adminSummaryWaitingClient) adminSummaryWaitingClient.textContent = String(waitingClient.length);
  if (adminSummaryCalendar) adminSummaryCalendar.textContent = String(pendingCalendar.length);
  if (adminLeadsBadge) adminLeadsBadge.textContent = `${pendingLeads.length} caka`;

  document.title = pendingLeads.length || pendingCalendar.length
    ? `(${pendingLeads.length + pendingCalendar.length}) Majstri zabavy | Admin`
    : 'Majstri zabavy | Admin';
}

function buildRequestServices(request) {
  return [
    request.selected_variant ? `Variant: ${request.selected_variant}` : '',
    request.selected_price ? `Predbezna cena: ${request.selected_price}` : '',
    request.services || ''
  ].filter(Boolean).join('\n');
}

function buildRequestNotes(request) {
  return [
    request.notes ? `Poznamka klienta: ${request.notes}` : '',
    request.audience ? `Pre koho: ${request.audience}` : '',
    request.guest_count ? `Pocet ludi: ${request.guest_count}` : '',
    request.energy ? `Energia: ${request.energy}` : '',
    request.budget ? `Rozpocet: ${request.budget}` : '',
    request.promo ? `Promo: ${request.promo}` : '',
    request.contact_phone ? `Telefon: ${request.contact_phone}` : ''
  ].filter(Boolean).join('\n');
}

function renderLeadCard(request, compact = false) {
  const statusLabel = request.status === 'approved' ? 'Schvalene' : request.status === 'rejected' ? 'Zamietnute' : 'Caka';
  const safeServices = safe(buildRequestServices(request) || 'Sluzby nie su zadane').replace(/\n/g, '<br>');
  const safeNotes = safe(buildRequestNotes(request) || 'Bez poznamky').replace(/\n/g, '<br>');

  return `
    <article class="admin-event-card admin-request-card${compact ? ' admin-event-card--compact' : ''}">
      <div class="admin-event-card__main">
        <div class="admin-event-card__top">
          <div>
            <div class="admin-event-card__eyebrow">${safe(formatCreatedAt(request.created_at))} · ${safe(request.contact_email || '')}</div>
            <h3 class="admin-event-card__title">${safe(request.title || 'Bez nazvu')}</h3>
          </div>
          <span class="admin-status-pill is-${safe(request.status || 'pending')}">${statusLabel}</span>
        </div>
        <div class="admin-event-card__meta-grid">
          <div><strong>Klient:</strong> ${safe(request.contact_name || 'Bez mena')}</div>
          <div><strong>Email:</strong> <a href="mailto:${safe(request.contact_email || '')}">${safe(request.contact_email || '')}</a></div>
          <div><strong>Telefon:</strong> ${safe(request.contact_phone || 'Nie je zadany')}</div>
          <div><strong>Datum:</strong> ${safe(formatDate(request.event_date))}</div>
          <div><strong>Miesto:</strong> ${safe(request.location || 'Miesto nie je zadane')}</div>
          <div><strong>Predbezna cena:</strong> ${safe(request.selected_price || 'Cena nie je zadana')}</div>
        </div>
        ${compact ? '' : `
          <div class="admin-order-card__text-grid">
            <div class="admin-event-card__description">
              <div class="admin-event-card__label">Sluzby</div>
              <p>${safeServices}</p>
            </div>
            <div class="admin-event-card__description">
              <div class="admin-event-card__label">Detaily</div>
              <p>${safeNotes}</p>
            </div>
          </div>
        `}
      </div>
      <aside class="admin-event-card__side admin-order-card__side">
        <button type="button" class="btn-primary admin-action-btn" data-admin-request-prepare="${request.id}">Pripravit navrh</button>
        <button type="button" class="btn-ghost admin-action-btn admin-action-btn--danger" data-admin-request-reject="${request.id}">Zamietnut</button>
      </aside>
    </article>
  `;
}

function renderLeads() {
  const pendingRequests = adminClientRequests.filter((request) => request.status === 'pending');

  if (adminLeadsList && adminLeadsEmpty) {
    if (!pendingRequests.length) {
      adminLeadsList.innerHTML = '';
      adminLeadsEmpty.hidden = false;
      adminLeadsEmpty.textContent = 'Zatial tu nie su ziadne nove zakazky.';
    } else {
      adminLeadsEmpty.hidden = true;
      adminLeadsList.innerHTML = pendingRequests.map((request) => renderLeadCard(request)).join('');
    }
  }

  if (adminOverviewLeads && adminOverviewLeadsEmpty) {
    const overviewItems = pendingRequests.slice(0, 3);
    if (!overviewItems.length) {
      adminOverviewLeads.innerHTML = '';
      adminOverviewLeadsEmpty.hidden = false;
      adminOverviewLeadsEmpty.textContent = 'Ziadne nove zakazky necakaju.';
    } else {
      adminOverviewLeadsEmpty.hidden = true;
      adminOverviewLeads.innerHTML = overviewItems.map((request) => renderLeadCard(request, true)).join('');
    }
  }

  renderClientEmailOptions();
}

function renderClientEmailOptions() {
  if (!adminOrderClientEmails) return;
  const emails = Array.from(new Set(
    adminClientOrders
      .map((order) => String(order.client_email || '').trim().toLowerCase())
      .concat(adminClientRequests.map((request) => String(request.contact_email || '').trim().toLowerCase()))
      .filter(Boolean)
  )).sort();

  adminOrderClientEmails.innerHTML = emails.map((email) => `<option value="${safe(email)}"></option>`).join('');
}

function getFilteredOrders() {
  const query = String(adminOrdersSearch?.value || '').trim().toLowerCase();
  if (!query) return adminClientOrders;

  return adminClientOrders.filter((order) => (
    String(order.client_email || '').toLowerCase().includes(query)
    || String(order.title || '').toLowerCase().includes(query)
    || String(order.location || '').toLowerCase().includes(query)
  ));
}

function renderOrderCard(order) {
  const programStatus = ADMIN_PROGRAM_STATUS_LABELS[order.program_status] || 'Bez programu';
  const responseText = order.client_response_note
    ? `${programStatus}: ${order.client_response_note}`
    : programStatus;
  const safeServices = safe(order.services || 'Sluzby nie su zadane').replace(/\n/g, '<br>');
  const safeNotes = safe(order.notes || 'Poznamka nie je zadana').replace(/\n/g, '<br>');
  const safeProgram = safe(order.program_text || 'Program este nie je pripraveny.').replace(/\n/g, '<br>');

  return `
    <article class="admin-event-card admin-order-card">
      <div class="admin-event-card__main">
        <div class="admin-event-card__top">
          <div>
            <div class="admin-event-card__eyebrow">${safe(formatDate(order.event_date))} · ${safe(order.client_email || '')}</div>
            <h3 class="admin-event-card__title">${safe(order.title || 'Bez nazvu')}</h3>
          </div>
          <span class="client-order-status is-${safe(order.status || 'draft')}">${safe(ADMIN_ORDER_STATUS_LABELS[order.status] || order.status || 'Rozpracovane')}</span>
        </div>
        <div class="admin-event-card__meta-grid">
          <div><strong>Klient:</strong> <a href="mailto:${safe(order.client_email || '')}">${safe(order.client_email || '')}</a></div>
          <div><strong>Miesto:</strong> ${safe(order.location || 'Miesto nie je zadane')}</div>
          <div><strong>Cena:</strong> ${safe(formatPrice(order.price))}</div>
          <div><strong>Program:</strong> ${safe(responseText)}</div>
        </div>
        <div class="admin-order-card__text-grid">
          <div class="admin-event-card__description">
            <div class="admin-event-card__label">Sluzby</div>
            <p>${safeServices}</p>
          </div>
          <div class="admin-event-card__description">
            <div class="admin-event-card__label">Poznamky</div>
            <p>${safeNotes}</p>
          </div>
        </div>
        <div class="admin-event-card__description">
          <div class="admin-event-card__label">Program pre klienta</div>
          <p>${safeProgram}</p>
        </div>
      </div>
      <aside class="admin-event-card__side admin-order-card__side">
        <button type="button" class="btn-primary admin-action-btn" data-admin-order-edit="${order.id}">Upravit</button>
        <button type="button" class="btn-ghost admin-action-btn admin-action-btn--delete" data-admin-order-delete="${order.id}">Vymazat navrh</button>
      </aside>
    </article>
  `;
}

function renderOrders() {
  if (!adminOrdersList || !adminOrdersEmpty) return;

  renderClientEmailOptions();
  const filteredOrders = getFilteredOrders();

  if (!filteredOrders.length) {
    adminOrdersList.innerHTML = '';
    adminOrdersEmpty.hidden = false;
    adminOrdersEmpty.textContent = adminClientOrders.length
      ? 'Pre hladanie nie je ziadny navrh.'
      : 'Zatial tu nie su ziadne navrhy klientom.';
    return;
  }

  adminOrdersEmpty.hidden = true;
  adminOrdersList.innerHTML = filteredOrders.map((order) => renderOrderCard(order)).join('');
}

function formatCalendarDescription(value) {
  return safe(value || '').replace(/\n/g, '<br>');
}

function renderCalendarCard(row, compact = false) {
  const posterUrl = window.MZSupabase.getPosterPublicUrl(row.poster_path);
  const moreInfoUrl = window.MZSupabase.normalizeExternalUrl(row.more_info_url);
  const eventDate = formatDate(row.event_date);
  const statusLabel = window.MZSupabase.formatStatusLabel(row.status);

  return `
    <article class="admin-event-card${compact ? ' admin-event-card--compact' : ''}">
      <div class="admin-event-card__main">
        <div class="admin-event-card__top">
          <div>
            <div class="admin-event-card__eyebrow">${safe(eventDate)} · ${safe(row.city_label || 'Mesto')}</div>
            <h3 class="admin-event-card__title">${safe(row.title || 'Bez nazvu')}</h3>
          </div>
          <span class="admin-status-pill is-${safe(row.status || 'pending')}">${statusLabel}</span>
        </div>
        <div class="admin-event-card__meta-grid">
          <div><strong>Partner:</strong> ${safe(row.partner_name || 'Partner nie je uvedeny')}</div>
          <div><strong>Kontakt:</strong> ${safe(row.submitter_name || 'Kontakt nie je uvedeny')}</div>
          <div><strong>Email:</strong> <a href="mailto:${safe(row.submitter_email || '')}">${safe(row.submitter_email || '')}</a></div>
          <div><strong>Telefon:</strong> ${safe(row.submitter_phone || 'Nie je zadany')}</div>
          <div><strong>Miesto:</strong> ${safe(row.venue_name || 'Miesto sa doplni')}</div>
          <div><strong>Typ akcie:</strong> ${safe(row.category || 'Nie je zadane')}</div>
        </div>
        ${compact ? '' : `
          <div class="admin-event-card__description">
            <div class="admin-event-card__label">Popis akcie</div>
            <p>${formatCalendarDescription(row.description) || 'Popis nebol vyplneny.'}</p>
          </div>
          <div class="admin-event-card__note">
            <div class="admin-event-card__label">Interna poznamka</div>
            <textarea class="admin-event-card__note-input" data-calendar-note="${row.id}" rows="3" placeholder="Kratka interna poznamka k akcii.">${safe(row.admin_note || '')}</textarea>
            <div class="admin-event-card__note-actions">
              <button type="button" class="btn-ghost admin-note-save" data-calendar-note-save="${row.id}">Ulozit poznamku</button>
            </div>
          </div>
          ${moreInfoUrl ? `<div class="admin-event-card__links"><a href="${moreInfoUrl}" target="_blank" rel="noreferrer noopener">Viac info</a></div>` : ''}
        `}
      </div>
      <aside class="admin-event-card__side">
        ${compact ? '' : `
          <div class="admin-event-card__poster-shell${posterUrl ? '' : ' is-empty'}">
            ${posterUrl ? `<img src="${posterUrl}" alt="${safe(row.title || '')}" class="admin-event-card__poster" loading="lazy">` : '<div class="admin-event-card__poster-empty">Plagat nebol prilozeny.</div>'}
          </div>
        `}
        <div class="admin-event-card__actions">
          <button type="button" class="btn-primary admin-action-btn" data-calendar-approve="${row.id}">Schvalit</button>
          <button type="button" class="btn-ghost admin-action-btn admin-action-btn--danger" data-calendar-reject="${row.id}">Zamietnut</button>
          <button type="button" class="btn-ghost admin-action-btn admin-action-btn--delete" data-calendar-delete="${row.id}">Vymazat</button>
        </div>
      </aside>
    </article>
  `;
}

function renderCalendarSummary() {
  const pendingCount = adminCalendarEvents.filter((eventItem) => eventItem.status === 'pending').length;
  const approvedCount = adminCalendarEvents.filter((eventItem) => eventItem.status === 'approved').length;
  const rejectedCount = adminCalendarEvents.filter((eventItem) => eventItem.status === 'rejected').length;

  if (adminCalendarPending) adminCalendarPending.textContent = String(pendingCount);
  if (adminCalendarApproved) adminCalendarApproved.textContent = String(approvedCount);
  if (adminCalendarRejected) adminCalendarRejected.textContent = String(rejectedCount);

  if (adminCalendarFilterGroup) {
    adminCalendarFilterGroup.querySelectorAll('[data-calendar-filter]').forEach((button) => {
      const filterKey = button.dataset.calendarFilter;
      let countValue = adminCalendarEvents.length;
      if (filterKey === 'pending') countValue = pendingCount;
      if (filterKey === 'approved') countValue = approvedCount;
      if (filterKey === 'rejected') countValue = rejectedCount;
      button.classList.toggle('is-active', filterKey === adminCalendarFilter);
      button.textContent = `${button.dataset.calendarLabel || ''} (${countValue})`;
    });
  }
}

function renderCalendar() {
  renderCalendarSummary();

  const filteredEvents = adminCalendarEvents.filter((eventItem) => {
    if (adminCalendarFilter === 'all') return true;
    return eventItem.status === adminCalendarFilter;
  });

  if (adminCalendarList && adminCalendarEmpty) {
    if (!filteredEvents.length) {
      adminCalendarList.innerHTML = '';
      adminCalendarEmpty.hidden = false;
      adminCalendarEmpty.textContent = adminCalendarFilter === 'pending'
        ? 'Momentlane tu nie su ziadne akcie cakajuce na schvalenie.'
        : 'Pre tento filter tu momentalne nie su ziadne akcie.';
    } else {
      adminCalendarEmpty.hidden = true;
      adminCalendarList.innerHTML = filteredEvents.map((row) => renderCalendarCard(row)).join('');
    }
  }

  if (adminOverviewCalendar && adminOverviewCalendarEmpty) {
    const overviewItems = adminCalendarEvents.filter((eventItem) => eventItem.status === 'pending').slice(0, 3);
    if (!overviewItems.length) {
      adminOverviewCalendar.innerHTML = '';
      adminOverviewCalendarEmpty.hidden = false;
      adminOverviewCalendarEmpty.textContent = 'Ziadne kalendarove akcie necakaju.';
    } else {
      adminOverviewCalendarEmpty.hidden = true;
      adminOverviewCalendar.innerHTML = overviewItems.map((row) => renderCalendarCard(row, true)).join('');
    }
  }
}

async function loadRequests() {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  let response = await supabaseClient
    .from('client_requests')
    .select(ADMIN_CLIENT_REQUEST_SELECT)
    .order('created_at', { ascending: false });

  if (response.error && /admin_note|approved_order_id/i.test(String(response.error.message || ''))) {
    response = await supabaseClient
      .from('client_requests')
      .select(ADMIN_CLIENT_REQUEST_BASE_SELECT)
      .order('created_at', { ascending: false });
  }

  if (response.error) {
    adminClientRequests = [];
    setAdminActionStatus('error', `Zakazky sa nepodarilo nacitat: ${response.error.message || 'skontroluj SQL client-requests.sql.'}`);
    return;
  }

  adminClientRequests = response.data || [];
}

async function loadOrders() {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  let response = await supabaseClient
    .from('client_orders')
    .select(ADMIN_CLIENT_ORDER_PROGRAM_SELECT)
    .order('created_at', { ascending: false });

  if (response.error && /program_|client_response_/i.test(String(response.error.message || ''))) {
    adminOrdersHaveProgramColumns = false;
    response = await supabaseClient
      .from('client_orders')
      .select(ADMIN_CLIENT_ORDER_BASE_SELECT)
      .order('created_at', { ascending: false });
  }

  if (response.error) {
    throw new Error('Navrhy klientom sa nepodarilo nacitat. Skontroluj RLS a admin pristup.');
  }

  adminClientOrders = response.data || [];
}

async function loadCalendarEvents() {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('events')
    .select(ADMIN_EVENT_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Akcie do kalendara sa nepodarilo nacitat zo Supabase.');
  }

  adminCalendarEvents = data || [];
}

async function refreshAll({ silent = false } = {}) {
  if (adminRefreshPromise) return adminRefreshPromise;

  adminRefreshPromise = (async () => {
    try {
      await loadRequests();
      await loadOrders();
      await loadCalendarEvents();
      renderSummary();
      renderLeads();
      renderOrders();
      renderCalendar();
      if (!silent) setAdminActionStatus('', '');
    } catch (error) {
      if (!silent) setAdminActionStatus('error', error.message || 'Admin data sa nepodarilo nacitat.');
    } finally {
      adminRefreshPromise = null;
    }
  })();

  return adminRefreshPromise;
}

function getOrderPriceValue({ requireFinalPrice = false } = {}) {
  const clientEmail = String(adminOrderClientEmail?.value || '').trim().toLowerCase();
  const title = String(adminOrderTitle?.value || '').trim();
  const rawPrice = String(adminOrderPrice?.value || '').trim();
  const normalizedPrice = rawPrice.replace(',', '.');

  if (!clientEmail || !title) throw new Error('Vypln email klienta a nazov akcie.');
  if (!rawPrice) {
    if (requireFinalPrice) throw new Error('Zadaj finalnu cenu.');
    return null;
  }

  const priceValue = Number(normalizedPrice);
  if (!Number.isFinite(priceValue)) throw new Error('Cena musi byt cislo.');
  if (priceValue < 0) throw new Error('Cena nemoze byt zaporna.');
  return priceValue;
}

function getOrderPayload({ requireFinalPrice = false } = {}) {
  const payload = {
    client_email: String(adminOrderClientEmail?.value || '').trim().toLowerCase(),
    title: String(adminOrderTitle?.value || '').trim(),
    event_date: adminOrderDate?.value || null,
    location: String(adminOrderLocation?.value || '').trim() || null,
    status: adminOrderStatus?.value || 'draft',
    price: getOrderPriceValue({ requireFinalPrice }),
    services: String(adminOrderServices?.value || '').trim() || null,
    notes: String(adminOrderNotes?.value || '').trim() || null
  };

  if (adminOrdersHaveProgramColumns) {
    const nextProgramStatus = adminOrderProgramStatus?.value || 'draft';
    payload.program_text = String(adminOrderProgram?.value || '').trim() || null;
    payload.program_status = nextProgramStatus;
    if (nextProgramStatus === 'sent') {
      payload.program_sent_at = new Date().toISOString();
    }
  }

  return payload;
}

function getProgramPayloadFromForm() {
  if (!adminOrdersHaveProgramColumns) return null;

  const nextProgramStatus = adminOrderProgramStatus?.value || 'draft';
  return {
    program_text: String(adminOrderProgram?.value || '').trim() || null,
    program_status: nextProgramStatus,
    program_sent_at: nextProgramStatus === 'sent' ? new Date().toISOString() : null
  };
}

function getOrderProgramFieldsForRpc(programPayload) {
  if (!programPayload) return {};

  return {
    p_program_text: programPayload.program_text,
    p_program_status: programPayload.program_status,
    p_program_sent_at: programPayload.program_sent_at
  };
}

function setOrderSavingState(isSaving) {
  if (!adminOrderSaveButton) return;
  adminOrderSaveButton.disabled = isSaving;
  adminOrderSaveButton.textContent = isSaving ? 'Ukladam navrh...' : adminOrderSaveButtonLabel;
}

async function withSaveTimeout(requestPromise, contextLabel) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${contextLabel} trva prilis dlho. Skontroluj Supabase RPC/policies.`));
    }, ADMIN_SAVE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function resetOrderForm() {
  if (!adminOrderForm) return;
  adminOrderForm.reset();
  adminOrderForm.removeAttribute('data-source-request-id');
  if (adminOrderId) adminOrderId.value = '';
  if (adminOrderStatus) adminOrderStatus.value = 'draft';
  if (adminOrderProgramStatus) adminOrderProgramStatus.value = 'draft';
  if (adminOrderClientResponse) adminOrderClientResponse.value = '';
  if (adminOrderFormMode) adminOrderFormMode.textContent = 'Novy navrh';
  setAdminOrderFormStatus('', 'Vypln navrh a uloz ho klientovi do jeho uctu.');
}

function fillOrderForm(orderId) {
  const order = adminClientOrders.find((item) => item.id === orderId);
  if (!order) return;

  if (adminOrderId) adminOrderId.value = order.id;
  if (adminOrderClientEmail) adminOrderClientEmail.value = order.client_email || '';
  if (adminOrderStatus) adminOrderStatus.value = order.status || 'draft';
  if (adminOrderTitle) adminOrderTitle.value = order.title || '';
  if (adminOrderDate) adminOrderDate.value = order.event_date || '';
  if (adminOrderLocation) adminOrderLocation.value = order.location || '';
  if (adminOrderPrice) adminOrderPrice.value = order.price ?? '';
  if (adminOrderServices) adminOrderServices.value = order.services || '';
  if (adminOrderNotes) adminOrderNotes.value = order.notes || '';
  if (adminOrderProgram) adminOrderProgram.value = order.program_text || '';
  if (adminOrderProgramStatus) adminOrderProgramStatus.value = order.program_status || 'draft';
  if (adminOrderClientResponse) {
    adminOrderClientResponse.value = order.client_response_note
      ? `${ADMIN_PROGRAM_STATUS_LABELS[order.program_status] || order.program_status}: ${order.client_response_note}`
      : (ADMIN_PROGRAM_STATUS_LABELS[order.program_status] || 'Zatial bez reakcie');
  }
  if (adminOrderFormMode) adminOrderFormMode.textContent = 'Uprava navrhu';

  showAdminView('orders');
  setAdminOrderFormStatus('', 'Uprav navrh a uloz zmeny.');
  adminOrderForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fillOrderFormFromRequest(requestId) {
  const request = adminClientRequests.find((item) => item.id === requestId);
  if (!request) return;

  if (adminOrderId) adminOrderId.value = '';
  if (adminOrderClientEmail) adminOrderClientEmail.value = request.contact_email || '';
  if (adminOrderStatus) adminOrderStatus.value = 'sent';
  if (adminOrderTitle) adminOrderTitle.value = request.title || '';
  if (adminOrderDate) adminOrderDate.value = request.event_date || '';
  if (adminOrderLocation) adminOrderLocation.value = request.location || '';
  if (adminOrderPrice) adminOrderPrice.value = '';
  if (adminOrderServices) adminOrderServices.value = buildRequestServices(request);
  if (adminOrderNotes) adminOrderNotes.value = buildRequestNotes(request);
  if (adminOrderProgram) adminOrderProgram.value = '';
  if (adminOrderProgramStatus) adminOrderProgramStatus.value = 'draft';
  if (adminOrderClientResponse) adminOrderClientResponse.value = '';
  if (adminOrderFormMode) adminOrderFormMode.textContent = 'Navrh z novej zakazky';

  adminOrderForm?.setAttribute('data-source-request-id', request.id);
  showAdminView('orders');
  setAdminOrderFormStatus('', 'Zakazka je predvyplnena. Skontroluj cenu, sluzby a uloz navrh klientovi.');
  adminOrderForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveOrder(event) {
  event.preventDefault();
  if (adminOrderSaveInProgress) return;

  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  adminOrderSaveInProgress = true;
  setOrderSavingState(true);

  try {
    const orderId = adminOrderId?.value || '';
    const sourceRequestId = adminOrderForm?.dataset.sourceRequestId || '';
    const isApprovingRequest = Boolean(sourceRequestId && !orderId);
    const payload = getOrderPayload({ requireFinalPrice: isApprovingRequest });
    const programPayload = getProgramPayloadFromForm();
    const saveMode = sourceRequestId && !orderId
      ? 'approve_client_request'
      : orderId
        ? 'update_client_order'
        : 'create_client_order_for_email';

    if (!adminOrdersHaveProgramColumns && String(adminOrderProgram?.value || '').trim()) {
      throw new Error('Program pre klienta sa neda ulozit, lebo v Supabase este chyba SQL migracia client-programs.sql.');
    }

    setAdminOrderFormStatus('', 'Ukladam navrh...');

    let request;
    if (sourceRequestId && !orderId) {
      request = supabaseClient.rpc('approve_client_request', {
        p_request_id: sourceRequestId,
        p_title: payload.title,
        p_event_date: payload.event_date,
        p_location: payload.location,
        p_status: payload.status,
        p_price: payload.price,
        p_services: payload.services,
        p_notes: payload.notes,
        p_admin_note: null,
        ...getOrderProgramFieldsForRpc(programPayload)
      });
    } else if (orderId) {
      request = supabaseClient.from('client_orders').update(payload).eq('id', orderId);
    } else {
      request = supabaseClient.rpc('create_client_order_for_email', {
        p_client_email: payload.client_email,
        p_title: payload.title,
        p_event_date: payload.event_date,
        p_location: payload.location,
        p_status: payload.status,
        p_price: payload.price,
        p_services: payload.services,
        p_notes: payload.notes,
        ...getOrderProgramFieldsForRpc(programPayload)
      });
    }

    let { data, error } = await withSaveTimeout(request, saveMode);
    if (error && !orderId && /p_program_|schema cache|function .* not found|Could not find the function/i.test(String(error.message || ''))) {
      const fallbackRequest = sourceRequestId
        ? supabaseClient.rpc('approve_client_request', {
            p_request_id: sourceRequestId,
            p_title: payload.title,
            p_event_date: payload.event_date,
            p_location: payload.location,
            p_status: payload.status,
            p_price: payload.price,
            p_services: payload.services,
            p_notes: payload.notes,
            p_admin_note: null
          })
        : supabaseClient.rpc('create_client_order_for_email', {
            p_client_email: payload.client_email,
            p_title: payload.title,
            p_event_date: payload.event_date,
            p_location: payload.location,
            p_status: payload.status,
            p_price: payload.price,
            p_services: payload.services,
            p_notes: payload.notes
          });

      ({ data, error } = await withSaveTimeout(fallbackRequest, `${saveMode}_legacy`));
    }

    if (error) throw new Error(error.message || 'Navrh sa nepodarilo ulozit.');

    const createdOrderId = typeof data === 'string' ? data : '';
    if (!orderId && createdOrderId && programPayload && (programPayload.program_text || programPayload.program_status !== 'draft')) {
      const { error: programError } = await supabaseClient
        .from('client_orders')
        .update(programPayload)
        .eq('id', createdOrderId);

      if (programError) throw new Error(programError.message || 'Navrh je vytvoreny, ale program sa nepodarilo ulozit.');
    }

    resetOrderForm();
    setAdminOrderFormStatus('success', 'Navrh je ulozeny.');
    await refreshAll({ silent: true });
  } catch (error) {
    setAdminOrderFormStatus('error', error.message || 'Navrh sa nepodarilo ulozit.');
  } finally {
    adminOrderSaveInProgress = false;
    setOrderSavingState(false);
  }
}

async function deleteClientProposal(orderId) {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return '';

  const proposal = adminClientOrders.find((item) => item.id === orderId);
  const proposalTitle = proposal?.title || 'tento navrh';
  const shouldDelete = window.confirm(`Naozaj chces natrvalo vymazat navrh "${proposalTitle}"?`);

  if (!shouldDelete) return '';

  const { data: deletedRows, error } = await supabaseClient
    .from('client_orders')
    .delete()
    .eq('id', orderId)
    .select('id');

  if (error) {
    throw new Error('Navrh sa nepodarilo vymazat. Skontroluj prosim admin opravnenia v Supabase.');
  }

  if (!deletedRows?.length) {
    throw new Error('Supabase navrh nezmazal. Spusti prosim SQL subor supabase/sql/client-orders-admin-delete.sql v Supabase SQL Editore.');
  }

  resetOrderForm();
  await refreshAll({ silent: true });
  return 'Navrh je vymazany.';
}

async function rejectRequest(requestId) {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient
    .from('client_requests')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: user?.id || null
    })
    .eq('id', requestId);

  if (error) throw new Error('Zakazku sa nepodarilo zamietnut.');
  await refreshAll({ silent: true });
}

function getCalendarNoteValue(eventId) {
  const noteField = document.querySelector(`[data-calendar-note="${eventId}"]`);
  return noteField instanceof HTMLTextAreaElement ? noteField.value.trim() : '';
}

async function saveCalendarNote(eventId) {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  const { error } = await supabaseClient
    .from('events')
    .update({ admin_note: getCalendarNoteValue(eventId) || null })
    .eq('id', eventId);

  if (error) throw new Error('Poznamku sa nepodarilo ulozit.');
  await refreshAll({ silent: true });
}

async function updateCalendarStatus(eventId, nextStatus) {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) throw new Error('Admin session vyprsala. Prihlas sa prosim znova.');

  const adminNote = getCalendarNoteValue(eventId);
  const payload = nextStatus === 'approved'
    ? {
        status: 'approved',
        admin_note: adminNote || null,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        rejected_at: null,
        rejected_by: null
      }
    : {
        status: 'rejected',
        admin_note: adminNote || null,
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        approved_at: null,
        approved_by: null
      };

  const { error } = await supabaseClient.from('events').update(payload).eq('id', eventId);
  if (error) throw new Error('Stav akcie sa nepodarilo ulozit.');
  await refreshAll({ silent: true });
}

async function deleteCalendarEvent(eventId) {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return '';

  const eventItem = adminCalendarEvents.find((item) => item.id === eventId);
  const eventTitle = eventItem?.title || 'tuto akciu';
  const shouldDelete = window.confirm(`Naozaj chces natrvalo vymazat akciu "${eventTitle}"? Zmaze sa aj prilozeny plagat.`);

  if (!shouldDelete) return '';

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) throw new Error('Admin session vyprsala. Prihlas sa prosim znova.');

  const { data: deletedRows, error } = await supabaseClient
    .from('events')
    .delete()
    .eq('id', eventId)
    .select('id');

  if (error) throw new Error('Akciu sa nepodarilo vymazat. Skontroluj prosim admin opravnenia v Supabase.');
  if (!deletedRows?.length) {
    throw new Error('Supabase akciu nezmazal. Spusti prosim SQL subor supabase/sql/events-admin-delete.sql v Supabase SQL Editore.');
  }

  if (eventItem?.poster_path) {
    const { error: storageError } = await supabaseClient.storage
      .from(window.MZSupabase.posterBucket)
      .remove([eventItem.poster_path]);

    if (storageError) {
      await refreshAll({ silent: true });
      throw new Error('Akcia je vymazana, ale plagat sa nepodarilo odstranit zo Supabase Storage.');
    }
  }

  await refreshAll({ silent: true });
  return 'Akcia aj plagat su vymazane.';
}

async function handleLogin(event) {
  event.preventDefault();
  const supabaseClient = getAdminSupabase();
  if (!adminLoginForm || !supabaseClient) return;

  const formData = new FormData(adminLoginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  setAdminStatus('', 'Prihlasujem sa do admin casti...');
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setAdminStatus('error', 'Prihlasenie sa nepodarilo. Skontroluj email a heslo.');
    return;
  }

  setAdminStatus('success', 'Prihlasenie prebehlo uspesne.');
}

async function handleLogout() {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
}

function startAutoRefresh() {
  if (adminAutoRefreshTimer) return;
  adminAutoRefreshTimer = window.setInterval(async () => {
    if (!adminSession?.user || document.hidden) return;
    await refreshAll({ silent: true });
  }, 30000);
}

function stopAutoRefresh() {
  if (!adminAutoRefreshTimer) return;
  window.clearInterval(adminAutoRefreshTimer);
  adminAutoRefreshTimer = null;
}

async function syncSession(session) {
  adminSession = session;

  if (!session?.user) {
    stopAutoRefresh();
    showLogin();
    return;
  }

  showDashboard(session.user.email);
  startAutoRefresh();
  await refreshAll();
}

function bindAdmin() {
  if (adminLoginForm) adminLoginForm.addEventListener('submit', handleLogin);
  if (adminLogoutButton) adminLogoutButton.addEventListener('click', handleLogout);
  if (adminRefreshButton) adminRefreshButton.addEventListener('click', () => refreshAll());
  if (adminOrderForm) adminOrderForm.addEventListener('submit', saveOrder);
  if (adminOrderResetButton) adminOrderResetButton.addEventListener('click', resetOrderForm);
  if (adminOrdersSearch) adminOrdersSearch.addEventListener('input', renderOrders);

  adminTabs.forEach((tab) => {
    tab.addEventListener('click', () => showAdminView(tab.dataset.adminView || 'overview'));
  });

  document.addEventListener('click', async (event) => {
    const jumpButton = event.target.closest('[data-admin-jump]');
    const prepareButton = event.target.closest('[data-admin-request-prepare]');
    const rejectRequestButton = event.target.closest('[data-admin-request-reject]');
    const editOrderButton = event.target.closest('[data-admin-order-edit]');
    const deleteOrderButton = event.target.closest('[data-admin-order-delete]');
    const saveNoteButton = event.target.closest('[data-calendar-note-save]');
    const approveButton = event.target.closest('[data-calendar-approve]');
    const rejectCalendarButton = event.target.closest('[data-calendar-reject]');
    const deleteCalendarButton = event.target.closest('[data-calendar-delete]');

    try {
      if (jumpButton) {
        showAdminView(jumpButton.dataset.adminJump || 'overview');
        return;
      }
      if (prepareButton) {
        fillOrderFormFromRequest(prepareButton.dataset.adminRequestPrepare);
        return;
      }
      if (rejectRequestButton) {
        await rejectRequest(rejectRequestButton.dataset.adminRequestReject);
        setAdminActionStatus('success', 'Zakazka je zamietnuta.');
        return;
      }
      if (editOrderButton) {
        fillOrderForm(editOrderButton.dataset.adminOrderEdit);
        return;
      }
      if (deleteOrderButton) {
        const successMessage = await deleteClientProposal(deleteOrderButton.dataset.adminOrderDelete);
        if (successMessage) setAdminActionStatus('success', successMessage);
        return;
      }
      if (saveNoteButton) {
        await saveCalendarNote(saveNoteButton.dataset.calendarNoteSave);
        setAdminActionStatus('success', 'Poznamka je ulozena.');
        return;
      }
      if (approveButton) {
        await updateCalendarStatus(approveButton.dataset.calendarApprove, 'approved');
        setAdminActionStatus('success', 'Akcia je schvalena.');
        return;
      }
      if (rejectCalendarButton) {
        await updateCalendarStatus(rejectCalendarButton.dataset.calendarReject, 'rejected');
        setAdminActionStatus('success', 'Akcia je zamietnuta.');
        return;
      }
      if (deleteCalendarButton) {
        const successMessage = await deleteCalendarEvent(deleteCalendarButton.dataset.calendarDelete);
        if (successMessage) setAdminActionStatus('success', successMessage);
      }
    } catch (error) {
      setAdminActionStatus('error', error.message || 'Akcia sa nepodarila.');
    }
  });

  if (adminCalendarFilterGroup) {
    adminCalendarFilterGroup.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-calendar-filter]');
      if (!trigger) return;
      adminCalendarFilter = trigger.dataset.calendarFilter || 'pending';
      renderCalendar();
    });
  }

  window.addEventListener('focus', async () => {
    if (!adminSession?.user) return;
    await refreshAll({ silent: true });
  });
}

async function initAdmin() {
  const supabaseClient = getAdminSupabase();
  if (!supabaseClient) return;

  bindAdmin();
  resetOrderForm();
  setAdminStatus('', 'Prihlas sa ako admin.');

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  supabaseClient.auth.onAuthStateChange(async (eventName, nextSession) => {
    if (eventName === 'INITIAL_SESSION') return;
    await syncSession(nextSession);
  });

  await syncSession(session);
}

initAdmin().catch((error) => {
  setAdminStatus('error', error.message || 'Admin sa nepodarilo spustit.');
});
