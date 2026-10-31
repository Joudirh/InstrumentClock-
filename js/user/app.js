import {
  forexSessions as staticSessions,
  instrumentCategories as staticCategories,
} from '../data.js';

// Garde d'accès : /account est réservé aux utilisateurs (rôle USER).
async function requireUser() {
  let user = null;
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (res.ok) ({ user } = await res.json());
  } catch {}
  if (!user || user.role !== 'USER') {
    window.location.href = '/';
    return null;
  }
  return user;
}

function el(id) { return document.getElementById(id); }

function showError(id, msg) {
  const box = el(id);
  box.textContent = msg || '';
  box.classList.toggle('hidden', !msg);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    credentials: 'same-origin',
    ...opts,
  });
  return res;
}

async function loadInstruments() {
  const byId = new Map();
  const bySlug = new Map();
  const add = (inst) => {
    if (inst.id != null) byId.set(String(inst.id), inst);
    if (inst.slug) bySlug.set(inst.slug.toLowerCase(), inst);
  };
  try {
    const res = await fetch('/api/instruments', { credentials: 'same-origin' });
    if (res.ok) {
      const data = await res.json();
      for (const cat of data.categories || []) {
        for (const inst of cat.items || []) add(inst);
      }
    }
  } catch {}
  // fallback statique
  for (const cat of staticCategories) {
    for (const inst of cat.items || []) add(inst);
  }
  return { byId, bySlug };
}

async function renderList(containerId, items, renderItem) {
  const container = el(containerId);
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<div class="empty-state">Aucun élément.</div>';
    return;
  }
  for (const item of items) container.appendChild(renderItem(item));
}

const user = await requireUser();
if (!user) throw new Error('stop');

const { byId, bySlug } = loadInstruments();

// --- Profil ---
const profileRes = await api('/api/me/profile');
const profileData = await profileRes.json().catch(() => ({}));
if (profileRes.ok && profileData.user) {
  el('account-email').textContent = profileData.user.email;
  el('account-name').value = profileData.user.name || '';
} else {
  showError('account-profile-error', profileData.error || 'Impossible de charger le profil');
}

el('account-save-btn').addEventListener('click', async () => {
  const name = el('account-name').value.trim();
  const password = el('account-password').value;
  const body = {};
  if (name) body.name = name;
  if (password) body.password = password;
  if (!Object.keys(body).length) return;
  const res = await api('/api/me/profile', { method: 'PUT', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    el('account-password').value = '';
    el('account-name').value = data.user?.name || name;
    showError('account-profile-error', '');
  } else {
    showError('account-profile-error', data.error || 'Échec de la mise à jour');
  }
});

// --- Favoris ---
async function loadFavorites() {
  const res = await api('/api/me/favorites');
  const data = await res.json().catch(() => ({ favorites: [] }));
  if (!res.ok) { showError('account-fav-error', data.error || 'Erreur'); return; }
  renderList('account-fav-list', data.favorites || [], (f) => {
    const inst = f.instrument || byId.get(String(f.instrumentId)) || bySlug.get(String(f.instrumentId));
    const row = document.createElement('div');
    row.className = 'account-list-item';
    row.innerHTML = `
      <span class="account-list-title">${inst ? inst.name : 'Instrument #' + f.instrumentId}</span>
      <button class="account-list-remove" data-id="${f.id}" aria-label="Retirer">Supprimer</button>
    `;
    return row;
  });
}

el('account-fav-add-btn').addEventListener('click', async () => {
  const raw = el('account-fav-input').value.trim();
  if (!raw) return;
  let instrumentId = Number(raw);
  if (!Number.isInteger(instrumentId)) {
    const inst = bySlug.get(raw.toLowerCase());
    if (!inst) { showError('account-fav-error', 'Instrument introuvable'); return; }
    instrumentId = inst.id;
  }
  const res = await api('/api/me/favorites', { method: 'POST', body: JSON.stringify({ instrumentId }) });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    el('account-fav-input').value = '';
    showError('account-fav-error', '');
    loadFavorites();
  } else {
    showError('account-fav-error', data.error || 'Échec');
  }
});

el('account-fav-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  const id = Number(btn.getAttribute('data-id'));
  const res = await api(`/api/me/favorites?id=${id}`, { method: 'DELETE' });
  if (res.ok) loadFavorites();
  else showError('account-fav-error', 'Échec de suppression');
});

// --- Alertes ---
async function loadAlerts() {
  const res = await api('/api/me/alerts');
  const data = await res.json().catch(() => ({ alerts: [] }));
  if (!res.ok) { showError('account-alert-error', data.error || 'Erreur'); return; }
  renderList('account-alert-list', data.alerts || [], (a) => {
    const inst = byId.get(String(a.instrumentId)) || bySlug.get(String(a.instrumentId));
    const row = document.createElement('div');
    row.className = 'account-list-item';
    row.innerHTML = `
      <span class="account-list-title">${inst ? inst.name : 'Instrument #' + a.instrumentId}</span>
      <span class="account-list-badge ${a.active ? 'active' : 'inactive'}">${a.active ? 'Actif' : 'Inactif'}</span>
      <div class="account-list-actions">
        <button class="account-list-toggle" data-id="${a.id}" data-active="${a.active}" aria-label="Basculer">${a.active ? 'Désactiver' : 'Activer'}</button>
        <button class="account-list-remove" data-id="${a.id}" aria-label="Supprimer">Supprimer</button>
      </div>
    `;
    return row;
  });
}

el('account-alert-add-btn').addEventListener('click', async () => {
  const raw = el('account-alert-input').value.trim();
  const kind = el('account-alert-kind').value;
  if (!raw) return;
  let instrumentId = Number(raw);
  if (!Number.isInteger(instrumentId)) {
    const inst = bySlug.get(raw.toLowerCase());
    if (!inst) { showError('account-alert-error', 'Instrument introuvable'); return; }
    instrumentId = inst.id;
  }
  const res = await api('/api/me/alerts', { method: 'POST', body: JSON.stringify({ instrumentId, kind }) });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    el('account-alert-input').value = '';
    showError('account-alert-error', '');
    loadAlerts();
  } else {
    showError('account-alert-error', data.error || 'Échec');
  }
});

el('account-alert-list').addEventListener('click', async (e) => {
  const toggle = e.target.closest('.account-list-toggle');
  const remove = e.target.closest('.account-list-remove');
  const id = (toggle || remove).getAttribute('data-id');
  if (toggle) {
    const active = toggle.getAttribute('data-active') === 'true';
    const res = await api(`/api/me/alerts?id=${id}`, { method: 'PUT', body: JSON.stringify({ active: !active }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toggle.setAttribute('data-active', String(!active));
      toggle.textContent = !active ? 'Désactiver' : 'Activer';
      toggle.parentElement.parentElement.querySelector('.account-list-badge').textContent = !active ? 'Actif' : 'Inactif';
      toggle.parentElement.parentElement.querySelector('.account-list-badge').className = 'account-list-badge ' + (!active ? 'active' : 'inactive');
    } else {
      showError('account-alert-error', (data && data.error) || 'Échec');
    }
  } else if (remove) {
    const res = await api(`/api/me/alerts?id=${id}`, { method: 'DELETE' });
    if (res.ok) loadAlerts();
    else showError('account-alert-error', 'Échec de suppression');
  }
});

// --- Déconnexion ---
el('account-logout-btn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  window.location.href = '/';
});

// Initial load
loadFavorites();
loadAlerts();
