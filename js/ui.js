import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';
import { convertHour, formatTime, convertDayHour, getDayName, isInstrumentOpen } from './timezone.js';

const tzFlags = {
  "Europe/London": { code: "gb", label: "Royaume-Uni" },
  "America/New_York": { code: "us", label: "États-Unis" },
  "Asia/Tokyo": { code: "jp", label: "Japon" },
  "Australia/Sydney": { code: "au", label: "Australie" },
  "Europe/Berlin": { code: "de", label: "Allemagne" },
  "Europe/Paris": { code: "fr", label: "France" },
  "America/Chicago": { code: "us", label: "États-Unis" },
  "Asia/Hong_Kong": { code: "hk", label: "Hong Kong" }
};

const renderCountryLabel = (tz) => {
  const flag = tzFlags[tz];
  if (!flag) return "🌐 Global";
  return `<span class="fi fi-${flag.code}"></span> ${flag.label}`;
};

export const renderInstruments = (containerEl, instrumentCategories, targetTz, seasonKey, selectedCategory, selectedStatus) => {
  containerEl.innerHTML = '';
  
  const categoriesToRender = selectedCategory === 'all' 
    ? instrumentCategories 
    : instrumentCategories.filter(c => c.id === selectedCategory);

  categoriesToRender.forEach(category => {
    let categoryVisible = 0;

    category.items.forEach(inst => {
      const isOpen = isInstrumentOpen(inst);
      if (selectedStatus === 'open' && !isOpen) return;
      if (selectedStatus === 'closed' && isOpen) return;

      categoryVisible += 1;
      const is24h = inst.openHour === 0 && inst.closeHour === 24;
      const openHourDec = is24h ? 0 : convertHour(inst.openHour, inst.openTz, targetTz, seasonKey);
      const closeHourDec = is24h ? 24 : convertHour(inst.closeHour, inst.closeTz || inst.openTz, targetTz, seasonKey);
      
      let optimalBarHtml = '';
      if (inst.optimalStartHour !== undefined && inst.optimalEndHour !== undefined) {
        const isOpt24h = inst.optimalStartHour === 0 && inst.optimalEndHour === 24;
        const optStartDec = isOpt24h ? 0 : convertHour(inst.optimalStartHour, inst.optimalTz, targetTz, seasonKey);
        const optEndDec = isOpt24h ? 24 : convertHour(inst.optimalEndHour, inst.optimalTz, targetTz, seasonKey);
        
        const optTimeStr = `${formatTime(optStartDec)} - ${formatTime(optEndDec)}`;
        optimalBarHtml = renderTimelineBar(optStartDec, optEndDec, 'inst-bar-optimal', optTimeStr, `Optimal: ${optTimeStr}`);
      }
      
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
        daysDisplay = inst.days || '';
      }
      
      const card = document.createElement('div');
      card.className = 'instrument-card';
      
      const countryLabel = renderCountryLabel(inst.openTz);
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
            ${renderInstAxis()}
            ${renderTimelineBar(openHourDec, closeHourDec, 'inst-bar-open', timeStr, '')}
            ${optimalBarHtml}
          </div>
        </div>
      `;
      containerEl.appendChild(card);
    });

    if (categoryVisible === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'instrument-card';
      emptyCard.innerHTML = `
        <div class="inst-header">
          <div>
            <div class="inst-title">Aucun marché ouvert pour cet instrument actuellement.</div>
            <div class="inst-days">Catégorie : ${category.name}</div>
          </div>
        </div>
      `;
      containerEl.appendChild(emptyCard);
    }
  });

  if (!containerEl.hasChildNodes()) {
    const noResults = document.createElement('div');
    noResults.className = 'instrument-card';
    noResults.innerHTML = `
      <div class="inst-header">
        <div>
          <div class="inst-title">Aucun instrument trouvé pour la sélection actuelle.</div>
        </div>
      </div>
    `;
    containerEl.appendChild(noResults);
  }
};

const renderInstAxis = () => {
  let labels = '';
  for (let hour = 0; hour <= 24; hour += 1) {
    const left = (hour / 24) * 100;
    const align = hour === 0 ? 'translateX(0)' : hour === 24 ? 'translateX(-100%)' : 'translateX(-50%)';
    labels += `<span class="inst-axis-label" style="left:${left}%;transform:${align}">${hour}h</span>`;
  }
  return `
    <div class="inst-axis">
      <div class="inst-axis-hour-ticks"></div>
      ${labels}
    </div>
  `;
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
