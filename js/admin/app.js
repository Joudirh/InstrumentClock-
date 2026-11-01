import { api } from './common.js';
import { render as renderDashboard } from './sections/dashboard.js';
import { render as renderUsers } from './sections/users.js';
import { render as renderInstruments } from './sections/instruments.js';
import { render as renderCategories } from './sections/categories.js';
import { render as renderSessions } from './sections/sessions.js';
import { render as renderAcademy } from './sections/academy.js';

const ROUTES = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  users: { title: 'Utilisateurs', render: renderUsers },
  instruments: { title: 'Instruments', render: renderInstruments },
  categories: { title: 'Catégories', render: renderCategories },
  sessions: { title: 'Séances', render: renderSessions },
  academy: { title: 'Trading Academy', render: renderAcademy },
};

function currentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return ROUTES[hash] ? hash : 'dashboard';
}

function setTitle(routeKey) {
  document.getElementById('page-title').textContent = ROUTES[routeKey].title;
}

function setThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('admin-icon-sun').classList.toggle('hidden', isDark);
  document.getElementById('admin-icon-moon').classList.toggle('hidden', !isDark);
}

// Thème persisté, même convention que le site (clé localStorage "theme").
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', 'light');
}
setThemeIcons();

document.getElementById('admin-theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  setThemeIcons();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await api('POST', '/api/auth/logout');
  } catch {
    // Session déjà invalide : la redirection suffit.
  }
  window.location.href = '/admin';
});

async function boot() {
  // Garde d'authentification : /dashboard exige une session valide.
  let user = null;
  try {
    ({ user } = await api('GET', '/api/auth/session'));
  } catch {
    return;
  }

  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-avatar').textContent = user.name.slice(0, 1).toUpperCase();
  if (user.role !== 'ADMIN') {
    window.location.href = '/account';
    return;
  }
  window.__adminUser = user;

  const content = document.getElementById('admin-content');
  const renderRoute = async () => {
    const routeKey = currentRoute();
    setTitle(routeKey);
    document.querySelectorAll('#sidebar-nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.route === routeKey);
    });
    content.innerHTML = '<div class="empty-state">Chargement…</div>';
    try {
      await ROUTES[routeKey].render(content);
    } catch (error) {
      content.innerHTML = `<div class="empty-state">Erreur : ${error.message}</div>`;
    }
  };

  window.addEventListener('hashchange', renderRoute);
  await renderRoute();
}

boot();
