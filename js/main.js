import { forexSessions, instrumentCategories } from './data.js';
import { renderForexTimeline } from './timeline.js';
import { renderInstruments, renderTimezoneOptions, renderCategoryFilters } from './ui.js';
import { timezonesList, getLocalTimezone } from './timezone.js';

// --- State ---
const AppState = {
  season: 'winter', // 'winter' | 'summer'
  timezone: 'auto', // 'auto' or a timezone ID like 'Europe/Paris'
  resolvedTimezone: getLocalTimezone(),
  category: 'all' // 'all' or category ID
};

// --- DOM Elements ---
const seasonSelector = document.getElementById('season-selector');
const timezoneSelector = document.getElementById('timezone-selector');
const themeToggle = document.getElementById('theme-toggle');
const forexTimeline = document.getElementById('forex-timeline');
const instrumentsContainer = document.getElementById('instruments-container');
const categoryTabs = document.getElementById('category-tabs');
const iconSun = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');

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
  renderInstruments(instrumentsContainer, AppState.resolvedTimezone, AppState.season, AppState.category);
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
