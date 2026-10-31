import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';
import { isInstrumentOpen, isOptimalNow, isWindowOpen } from './timezone.js';

const DAY_LABELS = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };

const formatHHMM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Compresse une liste de jours en intervalles : [1,2,3,4,5] -> "Lun-Ven",
// [7,1,2,3,4] -> "Dim-Jeu", [5,6,7,1] -> "Ven-Lun" (chaînes à travers le week-end).
const daysLabel = (days) => {
  const set = new Set(days);
  if (set.size === 7) return 'Lun-Dim';
  const wrap = set.has(1) && set.has(7);
  const runs = [];
  let run = null;
  let order;
  if (wrap) {
    // Scan cyclique amorcé sur le premier jour ABSENT : la chaîne
    // traversant le week-end forme un seul intervalle "Ven-Lun".
    let start = 1;
    while (set.has(start)) start = (start % 7) + 1;
    order = [...Array(7)].map((_, i) => ((start - 1 + i) % 7) + 1);
  } else {
    order = [1, 2, 3, 4, 5, 6, 7];
  }
  for (const d of order) {
    if (set.has(d)) {
      run = run || { first: d, last: d };
      run.last = d;
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs
    .map((r) => (r.first === r.last ? DAY_LABELS[r.first] : `${DAY_LABELS[r.first]}-${DAY_LABELS[r.last]}`))
    .join(' · ');
};

/** "01:00 - 10:00 · Lun-Ven" : plage TRADING affichée dans le fuseau de la séance. */
const windowLabel = (w) => {
  if (!w) return '';
  const start = formatHHMM(w.startMinute);
  const endRaw = w.endMinute % 1440;
  const end = w.endMinute % 1440 === 0 && w.endMinute > 0 ? '24:00' : formatHHMM(endRaw);
  return `${start} - ${end} · ${daysLabel(w.days)}`;
};

const activeTradingWindow = (inst, now) => {
  const trading = (inst.windows || []).filter((w) => w.kind === 'TRADING');
  return trading.find((w) => isWindowOpen(w, now)) || trading[0] || null;
};

/**
 * Cloche "marchés ouverts" : badge circulaire (vert = marchés ouverts, rouge = 0),
 * hovertext dynamique et panneau déroulant groupé par séance (ou catégorie en
 * fallback statique). Le DOM n'est touché que si le compte ou la liste changent.
 */
export const setupMarketBell = (getData) => {
  const bellButton = document.getElementById('market-bell');
  const bellBadge = document.getElementById('bell-badge');
  const bellPanel = document.getElementById('bell-panel');
  const bellWrapper = document.getElementById('bell-filter');

  let cache = { count: null, listHash: '' };
  let panelOpen = false;
  let markets = [];

  // Regroupe les instruments ouverts par marché = couple (catégorie, séance).
  // Le badge compte les MARCHÉS, pas les instruments : un samedi, les cryptos
  // (24/7) donnent une seule ligne « Cryptomonnaies - Global 24/7 » + badge (1).
  const collectOpen = () => {
    const data = getData();
    const now = DateTime.now();
    const grouped = new Map();
    for (const category of data.instrumentCategories || []) {
      for (const inst of category.items || []) {
        if (!isInstrumentOpen(inst, now)) continue;
        const key = `${category.id}|${inst.session ? inst.session.slug || inst.session.name : ''}`;
        const market = grouped.get(key) || {
          key,
          category,
          session: inst.session,
          count: 0,
          startMin: Infinity,
          endMax: -Infinity,
          days: new Set(),
          windows: [],
          inOptimal: false,
        };
        market.count += 1;
        market.inOptimal = market.inOptimal || isOptimalNow(inst, now);
        const active = activeTradingWindow(inst, now);
        if (active) {
          market.windows.push(active);
          market.startMin = Math.min(market.startMin, active.startMinute);
          market.endMax = Math.max(market.endMax, active.endMinute);
          for (const d of active.days || []) market.days.add(d);
        }
        grouped.set(key, market);
      }
    }

    return [...grouped.values()].map((m) => {
      const sessionName = m.session ? m.session.name : null;
      const name = sessionName
        ? `${m.category.name || '—'} - ${sessionName}`
        : m.category.name || '—';
      // Union des plages TRADING actives du marché (débuts min, fins max).
      const hours =
        m.windows.length === 1
          ? windowLabel(m.windows[0])
          : m.windows.length > 1
            ? `${formatHHMM(m.startMin)} - ${formatHHMM(m.endMax)} · ${daysLabel([...m.days].sort((a, b) => a - b))}`
            : '';
      return {
        ...m,
        days: undefined,
        windows: undefined,
        name,
        hours,
      };
    });
  };

  const renderList = () => {
    if (!markets.length) {
      bellPanel.innerHTML =
        '<div class="bell-empty">Aucun marché ouvert pour le moment</div>';
      return;
    }
    bellPanel.innerHTML = markets
      .map(
        (market) => `
      <button class="bell-row" type="button" data-cat="${esc(market.category.id)}"
        title="Filtrer : ${esc(market.name)}">
        <span class="bell-row-top">
          <span class="bell-row-name">${market.inOptimal ? '<span class="bell-optimal" title="Plage optimale en cours">●</span>' : ''}${esc(market.name)}</span>
          <span class="bell-row-count">${market.count} instrument${market.count > 1 ? 's' : ''}</span>
        </span>
        <span class="bell-row-hours">${market.hours ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="bell-hours-icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${esc(market.hours)}` : ''}</span>
      </button>`
      )
      .join('');
  };

  const marketHash = () =>
    markets.map((m) => `${m.key}${m.inOptimal ? '*' : ''}${m.count}(${m.hours})`).join(',');

  const refreshList = () => {
    const hash = marketHash();
    if (!panelOpen || hash === cache.listHash) return;
    cache.listHash = hash;
    renderList();
  };

  const update = () => {
    if (!bellButton || !bellBadge) return;
    markets = collectOpen();
    const count = markets.length;

    if (count !== cache.count) {
      cache.count = count;
      bellBadge.textContent = String(count);
      bellBadge.classList.toggle('is-zero', count === 0);
      const label =
        count === 0
          ? 'Aucun marché ouvert'
          : count === 1
            ? '1 marché ouvert'
            : `${count} marchés ouverts`;
      bellButton.title = label;
      bellButton.setAttribute('aria-label', `Marchés ouverts : ${label.toLowerCase()}`);
    }
    refreshList();
  };

  const openPanel = () => {
    markets = collectOpen();
    renderList();
    bellPanel.classList.remove('hidden');
    bellButton.setAttribute('aria-expanded', 'true');
    panelOpen = true;
    cache.listHash = marketHash();
  };

  const closePanel = () => {
    bellPanel.classList.add('hidden');
    bellButton.setAttribute('aria-expanded', 'false');
    panelOpen = false;
  };

  bellButton.addEventListener('click', () => {
    panelOpen ? closePanel() : openPanel();
  });

  document.addEventListener('click', (event) => {
    if (panelOpen && !bellWrapper.contains(event.target)) closePanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panelOpen) {
      closePanel();
      bellButton.focus();
    }
  });

  // Un clic sur un marché sélectionne le filtre de catégorie correspondant.
  bellPanel.addEventListener('click', (event) => {
    const row = event.target.closest('.bell-row');
    if (!row) return;
    closePanel();
    const search = document.getElementById('instrument-search');
    if (search && search.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const select = document.getElementById('category-tabs');
    const categoryId = row.dataset.cat;
    if (select && categoryId && select.value !== categoryId) {
      select.value = categoryId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  return update;
};

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
