import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';
import { convertHour, formatTime, convertDayHour, getDayName, isInstrumentOpen, isOptimalNow } from './timezone.js';

const tzFlags = {
  "Europe/London": { code: "gb", label: "Royaume-Uni" },
  "America/New_York": { code: "us", label: "États-Unis" },
  "Asia/Tokyo": { code: "jp", label: "Japon" },
  "Australia/Sydney": { code: "au", label: "Australie" },
  "Europe/Berlin": { code: "de", label: "Allemagne" },
  "Europe/Paris": { code: "fr", label: "France" },
  "America/Chicago": { code: "us", label: "États-Unis" },
  "Asia/Hong_Kong": { code: "hk", label: "Hong Kong" },
  "Asia/Shanghai": { code: "cn", label: "Chine" },
  "Asia/Singapore": { code: "sg", label: "Singapour" },
  "Europe/Zurich": { code: "ch", label: "Suisse" },
  "Europe/Madrid": { code: "es", label: "Espagne" },
  "Africa/Tunis": { code: "tn", label: "Tunisie" }
};

const renderCountryLabel = (tz) => {
  const flag = tzFlags[tz];
  if (!flag) return "🌐 Global";
  return `<span class="fi fi-${flag.code}"></span> ${flag.label}`;
};

// Badge de session (relation sessions) : drapeau par fuseau de la session, fallback pays d'open_tz.
const renderSessionLabel = (inst) => {
  const session = inst.session;
  if (!session) return renderCountryLabel(inst.openTz);
  if (session.timezone === 'UTC' || session.is24_7) return `🌐 ${session.name}`;
  const flag = tzFlags[session.timezone];
  if (!flag) return `${session.name}`;
  return `<span class="fi fi-${flag.code}"></span> Session ${session.name}`;
};

const normalizeText = (str) =>
  (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const renderInstruments = (containerEl, instrumentCategories, targetTz, seasonKey, selectedCategory, selectedStatus, searchQuery = '', optimalOnly = false) => {
  containerEl.innerHTML = '';

  const normalizedQuery = normalizeText(searchQuery).trim();
  const now = DateTime.now();
  
  const categoriesToRender = selectedCategory === 'all' 
    ? instrumentCategories 
    : instrumentCategories.filter(c => c.id === selectedCategory);

  categoriesToRender.forEach(category => {
    let categoryVisible = 0;

    category.items.forEach(inst => {
      const isOpen = isInstrumentOpen(inst);
      if (selectedStatus === 'open' && !isOpen) return;
      if (selectedStatus === 'closed' && isOpen) return;
      if (optimalOnly && !isOptimalNow(inst, now)) return;
      if (normalizedQuery && !normalizeText(inst.name).includes(normalizedQuery)) return;

      categoryVisible += 1;
      const hasWindows = Array.isArray(inst.windows) && inst.windows.length > 0;

      let scheduleBarHtml = '';
      let optimalBarHtml = '';
      let daysDisplay = '';

      if (hasWindows) {
        // Présentation depuis la base : une barre par plage (instrument_windows),
        // label de la plage (ex. « Session Londres ») + pauses déjeuner visibles.
        const tradingWindows = inst.windows.filter((w) => w.kind === 'TRADING');
        const optimalWindows = inst.windows.filter((w) => w.kind === 'OPTIMAL');
        scheduleBarHtml = tradingWindows.map((w) => barFromWindow(w, 'inst-bar-open', targetTz, seasonKey)).join('');
        optimalBarHtml = optimalWindows.map((w) => barFromWindow(w, 'inst-bar-optimal', targetTz, seasonKey)).join('');
        if (!optimalBarHtml) {
          optimalBarHtml = renderLegacyOptimalBar(inst, targetTz, seasonKey);
        }
        daysDisplay = windowsDaysDisplay(tradingWindows, targetTz, seasonKey, inst.is24_7);
      } else {
        const hasScheduleSegments = Array.isArray(inst.scheduleSegments) && inst.scheduleSegments.length > 0;
        const hasOptimalSegments = Array.isArray(inst.optimalSegments) && inst.optimalSegments.length > 0;

        if (hasScheduleSegments) {
          scheduleBarHtml = renderSegmentBars(inst.scheduleSegments, 'inst-bar-open', targetTz, seasonKey);
        } else {
          const is24h = inst.openHour === 0 && inst.closeHour === 24;
          const openHourDec = is24h ? 0 : convertHour(inst.openHour, inst.openTz, targetTz, seasonKey);
          const closeHourDec = is24h ? 24 : convertHour(inst.closeHour, inst.closeTz || inst.openTz, targetTz, seasonKey);
          const timeStr = is24h ? "24h/24" : `${formatTime(openHourDec)} - ${formatTime(closeHourDec)}`;
          scheduleBarHtml = renderTimelineBar(openHourDec, closeHourDec, 'inst-bar-open', timeStr, '');
        }

        if (hasOptimalSegments) {
          optimalBarHtml = renderSegmentBars(inst.optimalSegments, 'inst-bar-optimal', targetTz, seasonKey);
        } else if (inst.optimalStartHour !== undefined && inst.optimalEndHour !== undefined) {
          optimalBarHtml = renderLegacyOptimalBar(inst, targetTz, seasonKey);
        }

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
      }
      
      const card = document.createElement('div');
      card.className = 'instrument-card';
      
      const countryLabel = renderSessionLabel(inst);

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
            ${scheduleBarHtml}
            ${optimalBarHtml}
          </div>
        </div>
      `;
      containerEl.appendChild(card);
    });

    if (categoryVisible === 0 && !normalizedQuery && !optimalOnly) {
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
          <div class="inst-title">${
            optimalOnly
              ? "Aucun instrument dans sa plage horaire optimale actuellement."
              : "Aucun instrument trouvé pour la sélection actuelle."
          }</div>
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

const MIN_LABEL_SPAN_HOURS = 4;

// Barre depuis une plage normalisée (instrument_windows) : conversion du fuseau de la
// plage vers le fuseau d'affichage, passage de minuit géré, label = « label + HH:MM - HH:MM ».
const barFromWindow = (w, className, targetTz, seasonKey) => {
  const crosses = w.endMinute > 1440;
  const startDec = w.startMinute === 0 ? 0 : convertHour(w.startMinute / 60, w.timezone, targetTz, seasonKey);
  let endDec;
  if (w.endMinute === 1440) {
    endDec = 24;
  } else if (crosses) {
    endDec = convertHour((w.endMinute - 1440) / 60, w.timezone, targetTz, seasonKey);
  } else {
    endDec = convertHour(w.endMinute / 60, w.timezone, targetTz, seasonKey);
  }

  const spanH = endDec >= startDec ? endDec - startDec : 24 - startDec + endDec;
  const timeStr = `${formatTime(startDec)} - ${formatTime(endDec)}`;
  const label = w.label ? `${w.label} ${timeStr}` : timeStr;
  const textLabel = spanH >= MIN_LABEL_SPAN_HOURS ? label : '';
  const title = `${w.label ? w.label + ' : ' : ''}${formatMinutes(w.startMinute)} - ${formatMinutes(w.endMinute)} (${w.timezone}) · ${describeDays(w.days)}`;
  return renderTimelineBar(startDec, endDec, className, textLabel, title);
};

// Barre optimale fallback depuis les colonnes legacy (optimal_start_hour/optimal_end_hour).
const renderLegacyOptimalBar = (inst, targetTz, seasonKey) => {
  const isOpt24h = inst.optimalStartHour === 0 && inst.optimalEndHour === 24;
  const optStartDec = isOpt24h ? 0 : convertHour(inst.optimalStartHour, inst.optimalTz, targetTz, seasonKey);
  const optEndDec = isOpt24h ? 24 : convertHour(inst.optimalEndHour, inst.optimalTz, targetTz, seasonKey);
  const optTimeStr = `${formatTime(optStartDec)} - ${formatTime(optEndDec)}`;
  return renderTimelineBar(optStartDec, optEndDec, 'inst-bar-optimal', optTimeStr, `Optimal: ${optTimeStr}`);
};

// Minutes (0-2880) -> "HH:MM" (+ " +1" si la plage passe minuit, 1440 -> "24:00").
const formatMinutes = (m) => {
  if (m === 1440) return '24:00';
  const label = m > 1440 ? ' (+1)' : '';
  const mm = m % 1440;
  const h = Math.floor(mm / 60);
  return `${h.toString().padStart(2, '0')}:${(mm % 60).toString().padStart(2, '0')}${label}`;
};

// Jours d'une plage -> "Lun-Ven", "7j/7", "Dim-Jeu" (CME), ou liste.
const describeDays = (days) => {
  const set = new Set(days);
  if (set.size === 7) return '7j/7';
  const cyclic = (d) => (d > 7 ? d - 7 : d);
  const start = set.has(7) ? 7 : Math.min(...set);
  const seq = Array.from({ length: set.size }, (_, i) => cyclic(start + i));
  if (seq.every((d) => set.has(d))) {
    return `${getDayName(start)}-${getDayName(cyclic(start + set.size - 1))}`;
  }
  return [...set].sort((a, b) => a - b).map(getDayName).join(', ');
};

// Ligne « Lun 09:30h - Ven 16:00h » dérivée des plages TRADING (première ouverture,
// dernière fermeture, chaque plage dans son fuseau) + détail des pauses via les barres.
const windowsDaysDisplay = (tradingWindows, targetTz, seasonKey, is247) => {
  if (!tradingWindows.length) return '';
  const w0 = tradingWindows[0];
  const wN = tradingWindows[tradingWindows.length - 1];
  const isFullTime = tradingWindows.length === 1 && w0.startMinute === 0 && w0.endMinute === 1440 && w0.days.length === 7;
  if (isFullTime || is247) return "7j/7 - 24h/24";

  const startHourDec = w0.startMinute / 60;
  const endHourDec = wN.endMinute === 1440 ? 24 : (wN.endMinute % 1440) / 60;
  const startDay = w0.days[0];
  const lastStartDay = Math.max(...wN.days);
  const endDay = wN.endMinute > 1440 ? (lastStartDay === 7 ? 1 : lastStartDay + 1) : lastStartDay;

  const o = convertDayHour(startDay, startHourDec, w0.timezone, targetTz, seasonKey);
  const c = convertDayHour(endDay, endHourDec, wN.timezone, targetTz, seasonKey);
  const fdTime = formatTime(o.hourDec).replace(':00', 'h');
  const cdTime = formatTime(c.hourDec).replace(':00', 'h');
  return `${getDayName(o.day)} ${fdTime} - ${getDayName(c.day)} ${cdTime}`;
};

const renderSegmentBars = (segments, className, targetTz, seasonKey, sourceTz = 'UTC') =>
  segments
    .map(([start, end]) => {
      const startDec = convertHour(start, sourceTz, targetTz, seasonKey);
      const endDec = convertHour(end, sourceTz, targetTz, seasonKey);
      const label = `${formatTime(startDec)} - ${formatTime(endDec)}`;
      return renderTimelineBar(
        startDec,
        endDec,
        className,
        end - start >= MIN_LABEL_SPAN_HOURS ? label : '',
        label
      );
    })
    .join('');

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

export const renderCategoryFilters = (selectEl, categories, currentFilter) => {
  selectEl.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'Tous les instruments';
  selectEl.appendChild(allOption);

  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    selectEl.appendChild(option);
  });

  selectEl.value = currentFilter;
};
