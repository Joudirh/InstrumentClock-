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

/**
 * Proximité de la plage optimale la plus proche (horizon = semaine en cours).
 * - 0 si une plage OPTIMAL est en cours ;
 * - minutes restantes avant le prochain début (pas encore débutée) ;
 * - Infinity si toutes les occurrences de la semaine sont achevées (exclues du tri).
 */
export const optimalProximity = (inst, now = DateTime.now()) => {
  const optimalWindows = (Array.isArray(inst.windows) ? inst.windows : []).filter((w) => w.kind === 'OPTIMAL');
  if (!optimalWindows.length) return Infinity;

  let delta = Infinity;
  for (const w of optimalWindows) {
    const local = now.setZone(w.timezone);
    const weekStart = local.startOf('week'); // lundi 00:00 (fuseau de la plage)
    const weekEnd = weekStart.plus({ days: 7 });
    for (const d of Array.isArray(w.days) ? w.days : []) {
      const start = weekStart.plus({ days: d - 1, minutes: w.startMinute });
      const end = start.plus({ minutes: w.endMinute - w.startMinute });
      if (now >= start && now < end) return 0; // en cours : tout premier
      if (start > now && start < weekEnd) {
        const remaining = start.diff(now, 'minutes').minutes;
        if (remaining < delta) delta = remaining;
      }
    }
  }
  return delta;
};

// Panneau de détails ouvert par l'icône œil : conservé entre les re-rendus
// (les cartes sont recréées toutes les 60 s).
const openDetails = new Set();
const detailsKey = (inst) => inst.id ?? inst.name;

const instDetailsHtml = (inst, category, targetTz, seasonKey) => {
  const sessionLine = inst.session
    ? `<span class="fi fi-${(tzFlags[inst.session.timezone] || {}).code}"></span> Session ${inst.session.name} — ${inst.session.timezone}${inst.session.is24_7 ? ' · 24/7' : ''}`
    : renderCountryLabel(inst.openTz);

  const windowRow = (w) => {
    const { startDec, endDec } = windowDecimals(w, targetTz, seasonKey);
    const isFullDay = w.startMinute === 0 && w.endMinute === 1440;
    const native = isFullDay ? '24h/24' : `${formatMinutes(w.startMinute)} - ${formatMinutes(w.endMinute)}`;
    const local = isFullDay ? '24h/24' : `${formatTime(startDec)} - ${formatTime(endDec)}`;
    const dot = w.kind === 'TRADING' ? 'open' : 'optimal';
    return `
      <li class="inst-details-row">
        <span class="inst-details-days">${describeDays(w.days)}</span>
        <span class="inst-details-time">${native} <em>(fuseau ${w.timezone})</em></span>
        <span class="inst-details-time">${local} <em>(fuseau d'affichage ${targetTz})</em></span>
      </li>`;
  };

  // Groupes « Séances » / « Plages optimales » construits depuis instrument_windows ;
  // fallback sur les colonnes legacy quand aucune plage normalisée n'existe.
  const hasWindows = Array.isArray(inst.windows) && inst.windows.length > 0;
  let tradingRows = hasWindows
    ? inst.windows.filter((w) => w.kind === 'TRADING').map(windowRow).join('')
    : '';
  let optimalRows = hasWindows
    ? inst.windows.filter((w) => w.kind === 'OPTIMAL').map(windowRow).join('')
    : '';

  const legacyScheduleItem = Array.isArray(inst.scheduleSegments) && inst.scheduleSegments.length
    ? `<li class="inst-details-row"><span class="inst-details-time">${inst.scheduleSegments.map(([s, e]) => `${formatMinutes(s * 60)} - ${formatMinutes(e * 60)}`).join(' | ')}</span></li>`
    : '';
  const legacyOptimalItem = inst.optimalStartHour !== undefined
    ? `<li class="inst-details-row"><span class="inst-details-time">${formatMinutes(inst.optimalStartHour * 60)} - ${formatMinutes(inst.optimalEndHour * 60)} <em>(fuseau ${inst.optimalTz || inst.openTz})</em></span></li>`
    : '';
  if (!hasWindows) {
    tradingRows = legacyScheduleItem;
    optimalRows = legacyOptimalItem;
  }

  const groupHtml = (title, dot, rows) => {
    if (!rows || !rows.trim()) return '';
    return `
      <div class="inst-details-group">
        <div class="inst-details-sub"><i class="inst-legend-dot ${dot}"></i> ${title}</div>
        <ul class="inst-details-list">${rows}</ul>
      </div>`;
  };

  return `
    <div class="inst-details-inner">
      ${inst.description ? `<div class="inst-details-desc">${inst.description}</div>` : ''}
      <div class="inst-details-meta">
        <div class="inst-details-meta-item">
          <span class="inst-details-meta-label">Session de rattachement</span>
          <span class="inst-details-meta-value">${sessionLine}</span>
        </div>
        <div class="inst-details-meta-item">
          <span class="inst-details-meta-label">Fuseau d'affichage</span>
          <span class="inst-details-meta-value">${targetTz}</span>
        </div>
      </div>
      <div class="inst-details-groups">
        ${groupHtml('Séances', 'open', tradingRows)}
        ${groupHtml('Plages optimales', 'optimal', optimalRows)}
      </div>
    </div>
  `;
};

export const renderInstruments = (containerEl, instrumentCategories, targetTz, seasonKey, selectedCategory, selectedStatus, searchQuery = '', optimalOnly = false, sortOptimal = false) => {
  containerEl.innerHTML = '';

  const normalizedQuery = normalizeText(searchQuery).trim();
  const now = DateTime.now();
  
  const categoriesToRender = selectedCategory === 'all' 
    ? instrumentCategories 
    : instrumentCategories.filter(c => c.id === selectedCategory);

  categoriesToRender.forEach(category => {
    let categoryVisible = 0;

    // Collecte filtrée avant rendu (le tri éventuel réordonne la file entière).
    const displayQueue = [];
    category.items.forEach(inst => {
      const isOpen = isInstrumentOpen(inst);
      if (selectedStatus === 'open' && !isOpen) return;
      if (selectedStatus === 'closed' && isOpen) return;
      if (optimalOnly && !isOptimalNow(inst, now)) return;
      if (normalizedQuery && !normalizeText(inst.name).includes(normalizedQuery)) return;
      displayQueue.push(inst);
    });

    // Tri optionnel : plage optimale la plus proche de maintenant d'abord
    // (en cours = 0, puis les plages non débutées par proximité ; les plages
    // déjà achevées cette semaine sont exclues du tri et restent à la fin,
    // dans leur ordre d'origine — Array.sort est stable).
    if (sortOptimal) {
      displayQueue.sort((a, b) => optimalProximity(a, now) - optimalProximity(b, now));
    }

    displayQueue.forEach(inst => {
      categoryVisible += 1;
      const isOpen = isInstrumentOpen(inst);
      const hasWindows = Array.isArray(inst.windows) && inst.windows.length > 0;

      let scheduleBarHtml = '';
      let optimalBarHtml = '';
      let daysDisplay = '';
      let windowsLegend = '';

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
        windowsLegend = windowsLegendHtml(tradingWindows, optimalWindows, targetTz, seasonKey);
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
      
      const item = document.createElement('div');
      item.className = 'inst-item';
      const card = document.createElement('div');
      card.className = 'instrument-card';

      const countryLabel = renderSessionLabel(inst);

      card.innerHTML = `
        <div class="inst-header">
          <div>
            <div class="inst-title">${inst.name} <span class="inst-country">${countryLabel}</span> <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(${category.name})</span></div>
            <div class="inst-days">${daysDisplay}</div>
          </div>
          <div class="inst-header-actions">
            <div class="inst-status ${isOpen ? 'status-open' : 'status-closed'}">
              ${isOpen ? '🟢 OUVERT' : '🔴 FERMÉ'}
            </div>
            <button type="button" class="inst-info-btn${openDetails.has(detailsKey(inst)) ? ' active' : ''}" data-inst="${detailsKey(inst)}" aria-expanded="${openDetails.has(detailsKey(inst)) ? 'true' : 'false'}" aria-label="Afficher ou masquer les détails de l'instrument" title="Détails de l'instrument">
              <svg class="inst-caret" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 4.25L6 8.25L10 4.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div class="inst-timeline-wrap">
          <div class="inst-timeline">
            ${renderInstAxis()}
            ${scheduleBarHtml}
            ${optimalBarHtml}
          </div>
          ${windowsLegend}
        </div>
      `;

      const details = document.createElement('div');
      details.className = `inst-details${openDetails.has(detailsKey(inst)) ? ' open' : ''}`;
      details.setAttribute('data-inst-details', detailsKey(inst));
      details.innerHTML = instDetailsHtml(inst, category, targetTz, seasonKey);

      item.appendChild(card);
      item.appendChild(details);
      containerEl.appendChild(item);
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

  // Un seul listener sur le conteneur (survit aux re-rendus qui recréent les cartes).
  if (!containerEl._instDetailsBound) {
    containerEl._instDetailsBound = true;
    containerEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.inst-info-btn');
      if (!btn) return;
      const key = btn.dataset.inst;
      const panel = containerEl.querySelector(`.inst-details[data-inst-details="${key}"]`);
      if (!panel) return;
      const willOpen = !panel.classList.contains('open');
      panel.classList.toggle('open', willOpen);
      btn.classList.toggle('active', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) openDetails.add(key); else openDetails.delete(key);
    });
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

const renderTimelineBar = (start, end, className, textLabel = '', title = '', outLabel = '', outTop = 0) => {
  const outLayer = className.includes('optimal') ? 'out-optimal' : 'out-open';
  const labelHtml = textLabel ? `<span class="inst-bar-label">${textLabel}</span>` : '';
  if (start < end) {
    const left = (start / 24) * 100;
    const width = ((end - start) / 24) * 100;
    const outLabelHtml = outLabel ? `<span class="inst-bar-label-out ${outLayer}" style="left: ${left}%; top: ${outTop}px">${outLabel}</span>` : '';
    return `<div class="${className}" style="left: ${left}%; width: ${width}%" title="${title}">${labelHtml}</div>${outLabelHtml}`;
  } else {
    // Wraps around midnight : la première moitié peut être très étroite (souvent le cas),
    // on place donc toujours l'horaire à l'extérieur, ancré au début de la plage.
    const w1 = ((24 - start) / 24) * 100;
    const l1 = (start / 24) * 100;
    const l2 = 0;
    const w2 = (end / 24) * 100;
    const outText = outLabel || textLabel;
    const outLabelHtml = outText ? `<span class="inst-bar-label-out ${outLayer}" style="left: ${(start / 24) * 100}%; top: ${outTop || (className.includes('optimal') ? 29 : 10)}px">${outText}</span>` : '';
    return `
      <div class="${className}" style="left: ${l1}%; width: ${w1}%" title="${title}"></div>
      <div class="${className}" style="left: ${l2}%; width: ${w2}%" title="${title}"></div>
      ${outLabelHtml}
    `;
  }
};

const MIN_LABEL_SPAN_HOURS = 4;

// Barre depuis une plage normalisée (instrument_windows) : conversion du fuseau de la
// plage vers le fuseau d'affichage, passage de minuit géré, label = « label + HH:MM - HH:MM ».
const windowDecimals = (w, targetTz, seasonKey) => {
  const startDec = w.startMinute === 0 ? 0 : convertHour(w.startMinute / 60, w.timezone, targetTz, seasonKey);
  let endDec;
  if (w.endMinute === 1440) {
    endDec = 24;
  } else if (w.endMinute > 1440) {
    endDec = convertHour((w.endMinute - 1440) / 60, w.timezone, targetTz, seasonKey);
  } else {
    endDec = convertHour(w.endMinute / 60, w.timezone, targetTz, seasonKey);
  }
  return { startDec, endDec };
};

const barFromWindow = (w, className, targetTz, seasonKey) => {
  const { startDec, endDec } = windowDecimals(w, targetTz, seasonKey);
  const spanH = endDec >= startDec ? endDec - startDec : 24 - startDec + endDec;
  const isFullDay = w.startMinute === 0 && w.endMinute === 1440;
  const timeStr = isFullDay ? '24h/24' : `${formatTime(startDec)} - ${formatTime(endDec)}`;
  const label = w.label ? `${w.label} ${timeStr}` : timeStr;
  // Barre étroite (< MIN_LABEL_SPAN_HOURS) : label rendu à l'extérieur de la barre
  // (outLabel, ancré au bord gauche) pour ne jamais être coupé par overflow:hidden.
  const title = `${w.label ? w.label + ' : ' : ''}${formatMinutes(w.startMinute)} - ${formatMinutes(w.endMinute)} (${w.timezone}) · ${describeDays(w.days)}`;
  const outTop = className.includes('optimal') ? 29 : 10;
  return renderTimelineBar(
    startDec,
    endDec,
    className,
    spanH >= MIN_LABEL_SPAN_HOURS ? label : '',
    title,
    spanH < MIN_LABEL_SPAN_HOURS ? timeStr : '',
    outTop,
  );
};

// Légende sous la barre : horaire exact de chaque plage, toujours visible
// même quand la barre est trop étroite pour afficher son label.
const windowsLegendHtml = (tradingWindows, optimalWindows, targetTz, seasonKey) => {
  const item = (w, kind) => {
    const { startDec, endDec } = windowDecimals(w, targetTz, seasonKey);
    const dot = kind === 'TRADING' ? 'open' : 'optimal';
    const name = w.label ?? (kind === 'TRADING' ? 'Séance' : 'Optimal');
    const isFullDay = w.startMinute === 0 && w.endMinute === 1440;
    const timeStr = isFullDay ? '24h/24' : `${formatTime(startDec)} - ${formatTime(endDec)}`;
    return (
      `<span class="inst-legend-item" title="${formatMinutes(w.startMinute)} - ${formatMinutes(w.endMinute)} (${w.timezone})">` +
      `<i class="inst-legend-dot ${dot}"></i>${name} : ${timeStr} · ${describeDays(w.days)}` +
      `</span>`
    );
  };
  const trading = tradingWindows.map((w) => item(w, 'TRADING'));
  const optimal = optimalWindows.map((w) => item(w, 'OPTIMAL'));
  if (trading.length === 0 && optimal.length === 0) return '';
  return `<div class="inst-windows-legend">${trading.join('')}${optimal.join('')}</div>`;
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
