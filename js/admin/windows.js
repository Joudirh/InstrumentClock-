import { ADMIN_ICONS } from './common.js';

export const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const DAY_FULL = { 1: 'lun.', 2: 'mar.', 3: 'mer.', 4: 'jeu.', 5: 'ven.', 6: 'sam.', 7: 'dim.' };

/** minutes -> "HH:MM" (peut dépasser 24 h : 1530 -> "25:30", passage de minuit explicite). */
export function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "HH:MM" -> minutes (null si invalide). Heures 0..47 acceptées pour la fin. */
export function parseTimeString(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 47 || m > 59) return null;
  return h * 60 + m;
}

/** Résumé compact d'une plage pour les cellules du tableau. */
function windowLine(w) {
  const days = [...w.days].sort((a, b) => a - b);
  const daysText = days.map((d) => DAY_LABELS[d - 1]).join('');
  return `<span class="mono">${formatMinutes(w.startMinute)} – ${formatMinutes(w.endMinute)}</span> <small class="days-part">${daysText}</small>`;
}

/** HTML des résumés de plages (kind=TRADING/OPTIMAL) pour la ligne d'un instrument. */
export function formatWindowSummary(windows, kind, cssClass) {
  const list = (windows || []).filter((w) => w.kind === kind).sort((a, b) => a.startMinute - b.startMinute);
  if (!list.length) return '<span class="muted">—</span>';
  return `
    <span class="${cssClass}">${windowLine(list[0])}</span>
    ${list.length > 1 ? `<small class="days-part muted">+${list.length - 1} autre(s)</small>` : ''}`;
}

/**
 * Éditeur de plages par état. Renvoie { html, bind, collect }.
 * state = [{kind, days:[1..7], startMinute, endMinute, timezone, label}]
 */
export function buildWindowEditor(state, tzs, sessionTimezone) {
  const ROOT_HTML = `
    <div class="window-group window-group-trading">
      <div class="window-group-head">
        <span class="win-group-name"><span class="win-dot trading"></span> Heures de trading</span>
        <button class="icon-btn" type="button" data-add="TRADING" title="Ajouter une plage de trading">${ADMIN_ICONS.plus}</button>
      </div>
      <div class="window-invoker" data-kind="TRADING"></div>
    </div>
    <div class="window-group window-group-optimal">
      <div class="window-group-head">
        <span class="win-group-name"><span class="win-dot optimal"></span> Heures optimales (liquidité)</span>
        <button class="icon-btn" type="button" data-add="OPTIMAL" title="Ajouter une plage optimale">${ADMIN_ICONS.plus}</button>
      </div>
      <div class="window-invoker" data-kind="OPTIMAL"></div>
    </div>
    <p class="win-hint">Heure de fin au-delà de 24:00 = fin le lendemain (ex. 41:00 = 17:00 le lendemain, 24:00 = minuit).</p>`;

  function rowHtml(w, idx, kind) {
    return `
      <div class="window-row" data-idx="${idx}">
        <div class="window-row-main">
          <input type="text" class="time-input" data-field="startMinute" value="${formatMinutes(w.startMinute)}" placeholder="08:00" inputmode="numeric" aria-label="Début">
          <span class="muted">→</span>
          <input type="text" class="time-input" data-field="endMinute" value="${formatMinutes(w.endMinute)}" placeholder="16:00" inputmode="numeric" aria-label="Fin">
          <input type="text" class="tz-input" data-field="timezone" value="${w.timezone.replace(/"/g, '&quot;')}" list="tz-list" aria-label="Fuseau">
          <div class="win-actions">
            <button class="icon-btn danger" type="button" data-remove="${idx}" title="Supprimer la plage">${ADMIN_ICONS.trash}</button>
          </div>
        </div>
        <div class="window-row-main">
          <div class="day-chips">
            ${DAY_LABELS.map(
              (day, di) => `
              <span class="chip ${w.days.includes(di + 1) ? 'on' : ''}" data-day="${di + 1}">${day}</span>`
            ).join('')}
          </div>
          <input type="text" class="label-input" data-field="label" value="${(w.label || '').replace(/"/g, '&quot;')}" placeholder="Note (optionnel)">
        </div>
      </div>`;
  }

  function renderGroups(groupsEl) {
    for (const group of groupsEl.querySelectorAll('.window-invoker')) {
      const kind = group.dataset.kind;
      const rows = state
        .map((w, idx) => ({ w, idx }))
        .filter(({ w }) => w.kind === kind);
      group.innerHTML = rows.length
        ? rows.map(({ w, idx }) => rowHtml(w, idx, kind)).join('')
        : '<div class="window-empty">Aucune plage — cliquez sur + pour en ajouter</div>';
    }
  }

  const collect = () => state;

  const html = `
    <datalist id="tz-list">
      ${(tzs.length ? tzs : ['UTC', sessionTimezone || 'UTC']).map((tz) => `<option value="${tz.replace(/"/g, '&quot;')}"></option>`).join('')}
    </datalist>
    ${ROOT_HTML}`;

  function bind(container, rerender) {
    container.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.push({
          kind: btn.dataset.add,
          days: [1, 2, 3, 4, 5],
          startMinute: 8 * 60,
          endMinute: 16 * 60,
          timezone: sessionTimezone || 'UTC',
          label: '',
        });
        rerender();
      });
    });

    container.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove]');
      if (remove) {
        state.splice(Number(remove.dataset.remove), 1);
        rerender();
        return;
      }
      const chip = event.target.closest('.day-chips .chip');
      if (chip) {
        const row = chip.closest('.window-row');
        const idx = Number(row.dataset.idx);
        const day = Number(chip.dataset.day);
        const days = state[idx].days;
        const set = new Set(days);
        if (set.has(day)) set.delete(day);
        else set.add(day);
        state[idx].days = [...set].sort((a, b) => a - b);
        chip.classList.toggle('on', set.has(day));
      }
    });

    container.addEventListener('input', (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      const row = event.target.closest('.window-row');
      const idx = Number(row.dataset.idx);
      if (field === 'startMinute' || field === 'endMinute') {
        state[idx][field] = event.target.value;
      } else if (field === 'timezone') {
        state[idx].timezone = event.target.value;
      } else if (field === 'label') {
        state[idx].label = event.target.value;
      }
    });
  }

  /** Valide et convertit tout l'état en minutes ; renvoie {ok, windows|errors}. */
  function compile() {
    const errors = [];
    const out = state.map((w, i) => {
      const start = typeof w.startMinute === 'number' ? w.startMinute : parseTimeString(String(w.startMinute));
      const end = typeof w.endMinute === 'number' ? w.endMinute : parseTimeString(String(w.endMinute));
      if (start === null || start < 0 || start >= 1440) errors.push(`plage ${i + 1} : heure de début invalide (HH:MM, jusqu'à 23:59)`);
      else if (end === null || end <= start || end > 2880) errors.push(`plage ${i + 1} : heure de fin invalide (après le début ; au-delà de minuit, jusqu'à 47:59)`);
      if (!w.days || w.days.length === 0) errors.push(`plage ${i + 1} : aucun jour sélectionné`);
      if (!w.timezone || !/^[A-Za-z_]+\/[A-Za-z_+\-0-9]+$|^UTC$/.test(w.timezone)) errors.push(`plage ${i + 1} : fuseau horaire invalide`);
      return { kind: w.kind, days: w.days, startMinute: start, endMinute: end, timezone: w.timezone, label: (w.label || '').trim() || null };
    });
    if (errors.length) return { ok: false, errors };
    if (!out.some((w) => w.kind === 'TRADING')) return { ok: false, errors: ['Ajoutez au moins une plage TRADING'] };
    if (!out.some((w) => w.kind === 'OPTIMAL')) return { ok: false, errors: ['Ajoutez au moins une plage OPTIMAL'] };
    return { ok: true, windows: out };
  }

  return { html, renderGroups, bind, compile, collect };
}
