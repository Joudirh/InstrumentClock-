import { forexSessions, instrumentCategories } from './data.js';
import { renderForexTimeline } from './timeline.js';
import { renderInstruments, renderTimezoneOptions, renderCategoryFilters, renderWorldClocks } from './ui.js';
import { timezonesList, getLocalTimezone } from './timezone.js';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';

// --- State ---
const AppState = {
  season: 'winter', // 'winter' | 'summer'
  timezone: 'auto', // 'auto' or a timezone ID like 'Europe/Paris'
  resolvedTimezone: getLocalTimezone(),
  category: 'all', // 'all' or category ID
  status: 'all' // 'all', 'open', 'closed'
};

// --- DOM Elements ---
const seasonSelector = document.getElementById('season-selector');
const timezoneSelector = document.getElementById('timezone-selector');
const themeToggle = document.getElementById('theme-toggle');
const forexTimeline = document.getElementById('forex-timeline');
const instrumentsContainer = document.getElementById('instruments-container');
const categoryTabs = document.getElementById('category-tabs');
const statusSelector = document.getElementById('status-selector');
const iconSun = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');
const worldClocksContainer = document.getElementById('world-clocks-container');

// --- Initialization ---
const init = () => {
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

  // Populate TZ Dropdown
  renderTimezoneOptions(timezoneSelector, timezonesList, getLocalTimezone());
  timezoneSelector.value = AppState.timezone;

  // Add event listeners
  seasonSelector.addEventListener('change', handleSeasonChange);
  timezoneSelector.addEventListener('change', handleTimezoneChange);
  statusSelector.addEventListener('change', handleStatusChange);
  themeToggle.addEventListener('click', handleThemeToggle);

  // Global function for UI updates
  window.updateCategoryFilter = (categoryId) => {
    AppState.category = categoryId;
    renderAll();
  };

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
  renderForexTimeline(forexTimeline, forexSessions, AppState.resolvedTimezone, AppState.season);
  
  // 2. Render Categories Filters
  renderCategoryFilters(categoryTabs, instrumentCategories, AppState.category);
  
  // 3. Render Instruments Grid
  renderInstruments(instrumentsContainer, AppState.resolvedTimezone, AppState.season, AppState.category, AppState.status);
};

const updateClock = () => {
  // Use the user's localized time based on AppState.resolvedTimezone 
  // so the clock matches the chosen timezone dynamically!
  const now = DateTime.now().setZone(AppState.resolvedTimezone);
  
  clockTime.textContent = now.toFormat('HH:mm:ss');
  clockDate.textContent = now.setLocale(navigator.language).toFormat('EEEE d MMMM yyyy');
  
  // Call the world clocks update here since it runs every second !
  renderWorldClocks(worldClocksContainer, forexSessions);
  
  // Update forex market status
  updateForexMarketStatus();
};

const updateForexMarketStatus = () => {
  const forexStatusBadge = document.getElementById('forex-market-status');
  if (!forexStatusBadge) return;
  
  // Get current time in GMT/UTC (Forex market reference timezone)
  const nowGMT = DateTime.now().toUTC();
  const hourGMT = nowGMT.hour;
  
  let status, statusText, statusClass;
  
  // Determine market status based on GMT time
  if (hourGMT >= 8 && hourGMT < 17) {
    // Core trading hours (Sydney 8h to New York 17h)
    status = 'open';
    statusText = '🟢 Ouvert';
    statusClass = 'open';
  } else if (hourGMT >= 17 && hourGMT < 22) {
    // After hours (New York evening to Tokyo morning)
    status = 'after-hours';
    statusText = '🌙 After Hours';
    statusClass = 'after-hours';
  } else if (hourGMT >= 22 || hourGMT < 5) {
    // Closed (early morning hours)
    status = 'closed';
    statusText = '🔴 Fermé';
    statusClass = 'closed';
  } else {
    // Pre-market (Sydney opening approaching)
    status = 'pre-open';
    statusText = '⏰ Pré-ouverture';
    statusClass = 'pre-open';
  }
  
  forexStatusBadge.textContent = statusText;
  forexStatusBadge.className = `market-badge ${statusClass}`;
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
