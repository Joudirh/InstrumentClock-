import { instrumentCategories } from './data.js';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';
import { convertHour, formatTime, convertDayHour, getDayName } from './timezone.js';

const tzFlags = {
  "Europe/London": "🇬🇧 Royaume-Uni",
  "America/New_York": "🇺🇸 États-Unis",
  "Asia/Tokyo": "🇯🇵 Japon",
  "Australia/Sydney": "🇦🇺 Australie",
  "Europe/Berlin": "🇩🇪 Allemagne",
  "Europe/Paris": "🇫🇷 France",
  "America/Chicago": "🇺🇸 États-Unis",
  "Asia/Hong_Kong": "🇭🇰 Hong Kong"
};

export const renderInstruments = (containerEl, targetTz, seasonKey, selectedCategory, selectedStatus) => {
  containerEl.innerHTML = '';
  
  const categoriesToRender = selectedCategory === 'all' 
    ? instrumentCategories 
    : instrumentCategories.filter(c => c.id === selectedCategory);
    
  categoriesToRender.forEach(category => {
    category.items.forEach(inst => {
      
      const is24h = inst.openHour === 0 && inst.closeHour === 24;
      const openHourDec = is24h ? 0 : convertHour(inst.openHour, inst.openTz, targetTz, seasonKey);
      const closeHourDec = is24h ? 24 : convertHour(inst.closeHour, inst.closeTz || inst.openTz, targetTz, seasonKey);
      
      let optimalBarHtml = '';
      if (inst.optimalStartHour !== undefined && inst.optimalEndHour !== undefined) {
        const isOpt24h = inst.optimalStartHour === 0 && inst.optimalEndHour === 24;
        const optStartDec = isOpt24h ? 0 : convertHour(inst.optimalStartHour, inst.optimalTz, targetTz, seasonKey);
        const optEndDec = isOpt24h ? 24 : convertHour(inst.optimalEndHour, inst.optimalTz, targetTz, seasonKey);
        
        const optTimeStr = `Optimal: ${formatTime(optStartDec)} - ${formatTime(optEndDec)}`;
        optimalBarHtml = renderTimelineBar(optStartDec, optEndDec, 'inst-bar-optimal', '', optTimeStr);
      }
      
      // Dynamic Days computation based on Tz
      let daysDisplay = '';
      if (inst.is24_7) {
        daysDisplay = "7j/7 - 24h/24";
      } else if (inst.openDay && inst.closeDay) {
        const oDay = convertDayHour(inst.openDay, inst.openHour, inst.openTz, targetTz, seasonKey);
        const cDay = convertDayHour(inst.closeDay, inst.closeHour, inst.closeTz || inst.openTz, targetTz, seasonKey);
        
        let fdTime = formatTime(oDay.hourDec).replace(':00', 'h');
        let cdTime = formatTime(cDay.hourDec).replace(':00', 'h');
        
        daysDisplay = `${getDayName(oDay.day)} ${fdTime} - ${getDayName(cDay.day)} ${cdTime}`;
      } else {
        daysDisplay = inst.days || ''; // Fallback
      }
      
      const now = DateTime.now().setZone(targetTz);
      const nowDec = now.hour + now.minute / 60;
      
      const isOpen = isTimeInPeriod(nowDec, openHourDec, closeHourDec);
      
      if (selectedStatus === 'open' && !isOpen) return;
      if (selectedStatus === 'closed' && isOpen) return;
      
      const card = document.createElement('div');
      card.className = 'instrument-card';
      
      const countryLabel = tzFlags[inst.openTz] || "🌐 Global";
      
      const timeStr = is24h ? "24h/24" : `${formatTime(openHourDec)} - ${formatTime(closeHourDec)}`;

      card.innerHTML = `
        <div class="inst-header">
          <div>
            <div class="inst-title">${inst.name} <span class="inst-country">${countryLabel}</span> <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(${category.name})</span></div>
            <div class="inst-days">${daysDisplay}</div>
          </div>
          <div class="inst-status ${isOpen ? 'status-open' : 'status-closed'}">
            ${isOpen ? '🟢 OUVERT' : '🔴 FERMÉ'}
          </div>
        </div>
        
        <div class="inst-timeline-wrap">
          <div class="inst-timeline">
            <!-- Graduation temporelle 24h -->
            <div class="inst-axis">
              <span style="left: 0%">0h</span>
              <span style="left: 25%">6h</span>
              <span style="left: 50%">12h</span>
              <span style="left: 75%">18h</span>
              <span style="left: 98%">24h</span>
            </div>
            <!-- Background bar for Open -->
            ${renderTimelineBar(openHourDec, closeHourDec, 'inst-bar-open', timeStr, '')}
            <!-- Foreground bar for Optimal -->
            ${optimalBarHtml}
          </div>
        </div>
      `;
      containerEl.appendChild(card);
    });
  });
};

const renderTimelineBar = (start, end, className, textLabel = '', title = '') => {
  const labelHtml = textLabel ? `<span class="inst-bar-label">${textLabel}</span>` : '';
  if (start < end) {
    const left = (start / 24) * 100;
    const width = ((end - start) / 24) * 100;
    return `<div class="${className}" style="left: ${left}%; width: ${width}%" title="${title}">${labelHtml}</div>`;
  } else {
    // Wraps around midnight
    const w1 = ((24 - start) / 24) * 100;
    const l1 = (start / 24) * 100;
    const l2 = 0;
    const w2 = (end / 24) * 100;
    return `
      <div class="${className}" style="left: ${l1}%; width: ${w1}%" title="${title}">${labelHtml}</div>
      <div class="${className}" style="left: ${l2}%; width: ${w2}%" title="${title}"></div>
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

export const renderWorldClocks = (containerEl, forexSessions) => {
  // We keep the DOM nodes and just update their internal text to avoid recreation flickering
  if (!containerEl.hasChildNodes()) {
    forexSessions.forEach(sess => {
      const card = document.createElement('div');
      card.className = 'w-clock-card';
      card.id = `w-clock-${sess.id}`;
      
      card.innerHTML = `
        <div class="w-clock-title">${sess.name}</div>
        <div class="w-clock-time" id="w-clock-time-${sess.id}">--:--:--</div>
        <div class="w-clock-day" id="w-clock-day-${sess.id}">---</div>
      `;
      containerEl.appendChild(card);
    });
  }
  
  // Update times
  forexSessions.forEach(sess => {
    const cardEl = document.getElementById(`w-clock-${sess.id}`);
    const timeEl = document.getElementById(`w-clock-time-${sess.id}`);
    const dayEl = document.getElementById(`w-clock-day-${sess.id}`);
    
    if (cardEl && timeEl && dayEl) {
      const now = DateTime.now().setZone(sess.timezone);
      timeEl.textContent = now.toFormat('HH:mm:ss');
      dayEl.textContent = now.toFormat('EEE').toUpperCase();
      
      // Determine if open
      const nowDec = now.hour + now.minute / 60;
      const isOpen = isTimeInPeriod(nowDec, sess.startHour, sess.endHour);
      cardEl.className = `w-clock-card ${isOpen ? 'open-status' : 'closed-status'}`;
    }
  });
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
