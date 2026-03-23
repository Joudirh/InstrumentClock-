import { instrumentCategories } from './data.js';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';
import { convertHour, formatTime } from './timezone.js';

export const renderInstruments = (containerEl, targetTz, seasonKey, selectedCategory) => {
  containerEl.innerHTML = '';
  
  const categoriesToRender = selectedCategory === 'all' 
    ? instrumentCategories 
    : instrumentCategories.filter(c => c.id === selectedCategory);
    
  categoriesToRender.forEach(category => {
    category.items.forEach(inst => {
      
      const is24h = inst.openHour === 0 && inst.closeHour === 24;
      const openHourDec = is24h ? 0 : convertHour(inst.openHour, inst.openTz, targetTz, seasonKey);
      const closeHourDec = is24h ? 24 : convertHour(inst.closeHour, inst.openTz, targetTz, seasonKey);
      
      const isOpt24h = inst.optimalStartHour === 0 && inst.optimalEndHour === 24;
      const optStartDec = isOpt24h ? 0 : convertHour(inst.optimalStartHour, inst.optimalTz, targetTz, seasonKey);
      const optEndDec = isOpt24h ? 24 : convertHour(inst.optimalEndHour, inst.optimalTz, targetTz, seasonKey);
      
      // Determine if currently open based on user's current time in targetTZ
      const now = DateTime.now().setZone(targetTz);
      const nowDec = now.hour + now.minute / 60;
      
      const isOpen = isTimeInPeriod(nowDec, openHourDec, closeHourDec);
      
      const card = document.createElement('div');
      card.className = 'instrument-card';
      
      card.innerHTML = `
        <div class="inst-header">
          <div>
            <div class="inst-title">${inst.name} <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(${category.name})</span></div>
            <div class="inst-days">${inst.days}</div>
          </div>
          <div class="inst-status ${isOpen ? 'status-open' : 'status-closed'}">
            ${isOpen ? 'OUVERT' : 'FERMÉ'}
          </div>
        </div>
        
        <div class="inst-details">
          <div class="inst-detail-item">
            <strong>Horaires d'ouverture</strong>
            ${formatTime(openHourDec)} - ${formatTime(closeHourDec)}
          </div>
          <div class="inst-detail-item">
            <strong>Période Optimale (Overlap)</strong>
            ${formatTime(optStartDec)} - ${formatTime(optEndDec)}
          </div>
        </div>
        
        <div class="inst-timeline-wrap">
          <div class="inst-timeline">
            <!-- Background bar for Open -->
            ${renderTimelineBar(openHourDec, closeHourDec, 'inst-bar-open')}
            <!-- Foreground bar for Optimal -->
            ${renderTimelineBar(optStartDec, optEndDec, 'inst-bar-optimal')}
          </div>
        </div>
      `;
      containerEl.appendChild(card);
    });
  });
};

const renderTimelineBar = (start, end, className) => {
  if (start < end) {
    const left = (start / 24) * 100;
    const width = ((end - start) / 24) * 100;
    return `<div class="${className}" style="left: ${left}%; width: ${width}%"></div>`;
  } else {
    // Wraps around midnight
    const w1 = ((24 - start) / 24) * 100;
    const l1 = (start / 24) * 100;
    const l2 = 0;
    const w2 = (end / 24) * 100;
    return `
      <div class="${className}" style="left: ${l1}%; width: ${w1}%"></div>
      <div class="${className}" style="left: ${l2}%; width: ${w2}%"></div>
    `;
  }
};

const isTimeInPeriod = (checkTime, start, end) => {
  if (start < end) {
    return checkTime >= start && checkTime <= end;
  } else {
    return checkTime >= start || checkTime <= end;
  }
};

export const renderTimezoneOptions = (selectEl, timezonesList, currentTz) => {
  selectEl.innerHTML = '';
  const group1 = document.createElement('optgroup');
  group1.label = "Auto-détection";
  const autoOpt = document.createElement('option');
  autoOpt.value = "auto";
  autoOpt.textContent = `Auto (${currentTz})`;
  group1.appendChild(autoOpt);
  selectEl.appendChild(group1);

  const group2 = document.createElement('optgroup');
  group2.label = "Principaux Fuseaux";
  timezonesList.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz.id;
    opt.textContent = tz.label;
    group2.appendChild(opt);
  });
  
  selectEl.appendChild(group2);
};

export const renderCategoryFilters = (containerEl, categories, currentFilter) => {
  containerEl.innerHTML = '';
  
  const allBtn = document.createElement('button');
  allBtn.className = `category-filter-btn ${currentFilter === 'all' ? 'active' : ''}`;
  allBtn.textContent = 'Tous les instruments';
  allBtn.onclick = () => window.updateCategoryFilter('all');
  containerEl.appendChild(allBtn);
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `category-filter-btn ${currentFilter === cat.id ? 'active' : ''}`;
    btn.textContent = cat.name;
    btn.onclick = () => window.updateCategoryFilter(cat.id);
    containerEl.appendChild(btn);
  });
};
