import { fetchAppData } from './api.js';
import { renderForexTimeline } from './timeline.js';
import { renderInstruments, renderTimezoneOptions, renderCategoryFilters, renderWorldClocks } from './ui.js';
import { timezonesList, getLocalTimezone, isInstrumentOpen } from './timezone.js';
import { setupMarketBell } from './bell.js';
import { setupLogin } from './login.js';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';

// --- Data (loaded from /api, falls back to js/data.js) ---
let AppData = { instrumentCategories: [], forexSessions: [] };

// --- State ---
const AppState = {
  season: 'winter', // 'winter' | 'summer'
  timezone: 'auto', // 'auto' or a timezone ID like 'Europe/Paris'
  resolvedTimezone: getLocalTimezone(),
  category: 'all', // 'all' or category ID
  status: 'all', // 'all', 'open', 'closed'
  search: '', // free-text instrument search
  optimalOnly: false, // show only instruments currently in their optimal window
  sortOptimal: false // tri par plage optimale la plus proche de maintenant
};

// --- DOM Elements ---
const seasonSelector = document.getElementById('season-selector');
const timezoneSelector = document.getElementById('timezone-selector');
const themeToggle = document.getElementById('theme-toggle');
const forexTimeline = document.getElementById('forex-timeline');
const instrumentsContainer = document.getElementById('instruments-container');
const categoryTabs = document.getElementById('category-tabs');
const statusSelector = document.getElementById('status-selector');
const instrumentSearch = document.getElementById('instrument-search');
const optimalToggle = document.getElementById('optimal-toggle');
const sortOptimalBtn = document.getElementById('sort-optimal');
const iconSun = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');
const worldClocksContainer = document.getElementById('world-clocks-container');
const holidayNotice = document.getElementById('holiday-notice');
const scrollTopBtn = document.getElementById('scroll-top');

// Cloche "marchés ouverts" : compte, badge vert/rouge, hovertext et panneau déroulant.
const updateMarketBell = setupMarketBell(() => AppData);

// Boutons de connexion/déconnexion de la navbar (modale + cookie de session).
const loginBtn = document.getElementById('login-btn');
const mobileLoginBtn = document.getElementById('mobile-login-btn');
setupLogin(loginBtn, mobileLoginBtn);

// Menu mobile : ouverture/fermeture du panneau déroulant.
const setupNavbarMenu = () => {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('navbar-menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };

  toggle.addEventListener('click', () => {
    setOpen(!menu.classList.contains('is-open'));
  });

  menu.querySelectorAll('a, button').forEach((item) => {
    item.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('click', (event) => {
    if (!menu.classList.contains('is-open')) return;
    if (menu.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  const desktopQuery = window.matchMedia('(min-width: 768px)');
  desktopQuery.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
};

setupNavbarMenu();

// --- Initialization ---
const init = async () => {
  AppData = await fetchAppData();

  // Load saved preferences
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    iconSun.classList.remove('hidden');
    iconMoon.classList.add('hidden');
  }

  const savedSeason = localStorage.getItem('season');
  if (savedSeason) {
    AppState.season = savedSeason;
    seasonSelector.value = savedSeason;
  } else {
    // Auto-detect season based on current date
    const month = new Date().getMonth(); // 0-11
    if (month >= 3 && month <= 9) { // April to October
        AppState.season = 'summer';
        seasonSelector.value = 'summer';
    } else {
        AppState.season = 'winter';
        seasonSelector.value = 'winter';
    }
  }

  const savedTz = localStorage.getItem('timezone');
  if (savedTz) {
    AppState.timezone = savedTz;
  }
  AppState.resolvedTimezone = AppState.timezone === 'auto' ? getLocalTimezone() : AppState.timezone;

  // Populate TZ Dropdown
  renderTimezoneOptions(timezoneSelector, timezonesList, getLocalTimezone());
  timezoneSelector.value = AppState.timezone;

  // Add event listeners
  seasonSelector.addEventListener('change', handleSeasonChange);
  timezoneSelector.addEventListener('change', handleTimezoneChange);
  statusSelector.addEventListener('change', handleStatusChange);
  optimalToggle.addEventListener('change', handleOptimalChange);
  sortOptimalBtn.addEventListener('click', handleSortOptimal);
  themeToggle.addEventListener('click', handleThemeToggle);
  instrumentSearch.addEventListener('input', debounce((e) => {
    AppState.search = e.target.value.trim();
    renderAll();
  }, 200));

  // Floating "back to top" button (visible while scrolled down, up or down)
  const toggleScrollTopBtn = () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 300);
  };
  window.addEventListener('scroll', toggleScrollTopBtn, { passive: true });
  toggleScrollTopBtn();

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Category dropdown filter
  categoryTabs.addEventListener('change', (e) => {
    AppState.category = e.target.value;
    renderAll();
  });

  // Update on window resize (to re-draw timeline smoothly if needed)
  window.addEventListener('resize', debounce(() => renderAll(), 250));

  // Initial render
  renderAll();
  
  // Setup system clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Timer for current time indicator (update every minute)
  setInterval(() => {
    renderAll();
  }, 60000);
};

// --- Event Handlers ---
const handleSeasonChange = (e) => {
  AppState.season = e.target.value;
  localStorage.setItem('season', AppState.season);
  renderAll();
};

const handleTimezoneChange = (e) => {
  AppState.timezone = e.target.value;
  localStorage.setItem('timezone', AppState.timezone);
  AppState.resolvedTimezone = AppState.timezone === 'auto' ? getLocalTimezone() : AppState.timezone;
  renderAll();
};

const handleStatusChange = (e) => {
  AppState.status = e.target.value;
  renderAll();
};

const handleOptimalChange = (e) => {
  AppState.optimalOnly = e.target.checked;
  renderAll();
};

const handleSortOptimal = () => {
  AppState.sortOptimal = !AppState.sortOptimal;
  sortOptimalBtn.classList.toggle('active', AppState.sortOptimal);
  sortOptimalBtn.setAttribute('aria-pressed', String(AppState.sortOptimal));
  renderAll();
};

const handleThemeToggle = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  if (newTheme === 'light') {
    iconSun.classList.remove('hidden');
    iconMoon.classList.add('hidden');
  } else {
    iconMoon.classList.remove('hidden');
    iconSun.classList.add('hidden');
  }
};

// --- Render Logic ---
const renderAll = () => {
  // 1. Render Timeline
  renderForexTimeline(forexTimeline, AppData.forexSessions, AppState.resolvedTimezone, AppState.season);
  
  // 2. Render Categories Filters
  renderCategoryFilters(categoryTabs, AppData.instrumentCategories, AppState.category);
  
  // 3. Render Instruments Grid
  renderInstruments(instrumentsContainer, AppData.instrumentCategories, AppState.resolvedTimezone, AppState.season, AppState.category, AppState.status, AppState.search, AppState.optimalOnly, AppState.sortOptimal);
  
  // 4. Holiday notice (optionnel)
  renderHolidayNotice();

  // 5. Cloche des marchés ouverts (badge + panneau déroulant)
  updateMarketBell();
};

const updateClock = () => {
  // Use the user's localized time based on AppState.resolvedTimezone 
  // so the clock matches the chosen timezone dynamically!
  const now = DateTime.now().setZone(AppState.resolvedTimezone);
  
  clockTime.textContent = now.toFormat('HH:mm:ss');
  clockDate.textContent = now.setLocale(navigator.language).toFormat('EEEE d MMMM yyyy');
  
  // Call the world clocks update here since it runs every second !
  renderWorldClocks(worldClocksContainer, AppData.forexSessions);
  
  // Update forex market status
  updateForexMarketStatus();

  // Réagit dès qu'une minute change pour garder la cloche à jour (plages horaires)
  updateMarketBell();
};

const updateForexMarketStatus = () => {
  const forexStatusBadge = document.getElementById('forex-market-status');
  if (!forexStatusBadge) return;

  const forexCategory = AppData.instrumentCategories.find(c => c.id === 'forex');
  const hasForexOpen = forexCategory && forexCategory.items.some(inst => isInstrumentOpen(inst));

  let status, statusText, statusClass;
  if (hasForexOpen) {
    status = 'open';
    statusText = '🟢 Ouvert';
    statusClass = 'open';
  } else {
    status = 'closed';
    statusText = '🔴 Fermé';
    statusClass = 'closed';
  }

  forexStatusBadge.textContent = statusText;
  forexStatusBadge.className = `market-badge ${statusClass}`;
};

const getHolidayNoticeText = (now) => {
  const month = now.month;
  const day = now.day;

  const fixedHolidays = {
    '1-1': 'Jour de l’an – certains marchés sont fermés aujourd’hui.',
    '12-25': 'Noël – la plupart des places boursières américaines et européennes sont fermées.',
    '12-26': 'Saint-Étienne - certains marchés européens peuvent rester fermés.',
    '5-1': 'Fête du Travail – certains marchés européens peuvent être fermés.'
  };

  return fixedHolidays[`${month}-${day}`] || '';
};

const renderHolidayNotice = () => {
  if (!holidayNotice) return;
  const now = DateTime.now().setZone(AppState.resolvedTimezone);
  const noticeText = getHolidayNoticeText(now);
  holidayNotice.textContent = noticeText;
  holidayNotice.style.display = noticeText ? 'block' : 'none';
};

// --- Utils ---
const debounce = (func, wait) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Start application
document.addEventListener('DOMContentLoaded', init);
window.onload = () => renderAll();
