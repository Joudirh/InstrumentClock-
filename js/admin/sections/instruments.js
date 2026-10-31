import { api, esc, toast, ADMIN_ICONS } from '../common.js';
import { openModal, confirmDialog } from '../modal.js';
import { formatWindowSummary, buildWindowEditor } from '../windows.js';

const state = { search: '', category: 'all', session: 'all' };

const ALL_TZS = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();

function filtersBar(sessions, categories) {
  return `
    <input class="toolbar-input" id="inst-search" type="search" placeholder="Rechercher un instrument…" value="${esc(state.search)}">
    <select class="toolbar-select" id="inst-cat">
      <option value="all">Toutes catégories</option>
      ${categories.map((c) => `<option value="${c.id}" ${String(state.category) === String(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>
    <select class="toolbar-select" id="inst-session">
      <option value="all">Toutes séances</option>
      ${sessions.map((s) => `<option value="${s.id}" ${String(state.session) === String(s.id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
    </select>`;
}

function rowsHtml(instruments, sessionsById, categoriesById) {
  if (!instruments.length) {
    return '<tr><td colspan="6" class="empty-state">Aucun instrument — cliquez sur « Nouvel instrument »</td></tr>';
  }
  return instruments
    .map(
      (inst) => `
    <tr>
      <td>
        <div class="cell-identity">
          <strong>${esc(inst.name)}</strong>
          <small>${esc(inst.description || inst.slug)}</small>
        </div>
      </td>
      <td>${inst.session ? `<span class="badge badge-session">${esc(inst.session.flag || '')} ${esc(inst.session.name)}</span>` : '<span class="muted">—</span>'}
          ${inst.session?.is247 ? '<span class="badge badge-247">24/7</span>' : ''}</td>
      <td>${inst.category ? esc(categoriesById[inst.categoryId]?.name || '—') : '<span class="muted">—</span>'}</td>
      <td><div class="windows-summary" title="Plages horaires (TRADING / OPTIMAL)">
            ${formatWindowSummary(inst.windows, 'TRADING', 'win-trading')}
            ${formatWindowSummary(inst.windows, 'OPTIMAL', 'win-optimal')}
          </div></td>
      <td class="muted mono">${esc(inst.slug)}</td>
      <td>
        <div class="cell-actions">
          <button class="icon-btn" type="button" data-edit="${inst.id}" title="Modifier" aria-label="Modifier ${esc(inst.name)}">${ADMIN_ICONS.edit}</button>
          <button class="icon-btn success" type="button" data-duplicate="${inst.id}" title="Dupliquer" aria-label="Dupliquer ${esc(inst.name)}">${ADMIN_ICONS.copy}</button>
          <button class="icon-btn danger" type="button" data-delete="${inst.id}" title="Supprimer" aria-label="Supprimer ${esc(inst.name)}">${ADMIN_ICONS.trash}</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

export async function render(content) {
  const data = await api('GET', '/api/admin/instruments');
  const { instruments, sessions, categories } = data;
  const sessionsById = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const applyFilters = () => {
    const search = state.search;
    return instruments.filter((inst) => {
      if (state.category !== 'all' && String(inst.categoryId) !== String(state.category)) return false;
      if (state.session !== 'all' && String(inst.sessionId) !== String(state.session)) return false;
      if (search && !(inst.name + ' ' + (inst.description || '') + ' ' + inst.slug).toLowerCase().includes(search)) return false;
      return true;
    });
  };

  content.innerHTML = `
    <div class="table-toolbar">
      ${filtersBar(sessions, categories)}
      <div class="spacer"></div>
      <button class="btn-admin btn-admin-primary" id="inst-add">${ADMIN_ICONS.plus} Nouvel instrument</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Instrument</th><th>Séance</th><th>Catégorie</th><th>Plages horaires</th><th>Slug</th><th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody id="inst-rows">${rowsHtml(applyFilters(), sessionsById, categoriesById)}</tbody>
      </table>
    </div>
    <p class="muted" id="table-note" style="font-size:12.5px;margin-top:10px;">
      ${applyFilters().length} / ${instruments.length} instrument(s) — dupliquer crée une copie complète (plages horaires incluses).
    </p>`;

  const rowsEl = content.querySelector('#inst-rows');
  const refreshRows = () => {
    rowsEl.innerHTML = rowsHtml(applyFilters(), sessionsById, categoriesById);
    bindRowActions();
    const note = content.querySelector('#table-note');
    if (note) note.textContent = `${applyFilters().length} / ${instruments.length} instrument(s) — dupliquer crée une copie complète (plages horaires incluses).`;
  };
  const bindRowActions = () => {
    rowsEl.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openForm(instruments.find((i) => i.id === Number(btn.dataset.edit)))));
    rowsEl.querySelectorAll('[data-duplicate]').forEach((btn) => btn.addEventListener('click', () => openDuplicate(instruments.find((i) => i.id === Number(btn.dataset.duplicate)))));
    rowsEl.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => onDelete(instruments.find((i) => i.id === Number(btn.dataset.delete)))));
  };

  content.querySelector('#inst-search').addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    refreshRows();
  });
  content.querySelector('#inst-cat').addEventListener('change', (event) => {
    state.category = event.target.value;
    refreshRows();
  });
  content.querySelector('#inst-session').addEventListener('change', (event) => {
    state.session = event.target.value;
    refreshRows();
  });

  function showError(error) {
    let box = document.querySelector('.modal-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'modal-error';
      document.querySelector('.modal-body').prepend(box);
    }
    box.textContent = error.message;
  }

  function editorBody(inst) {
    const sessionTz = inst && inst.session ? inst.session.timezone : 'UTC';
    return `
      <div class="form-grid">
        <label class="field full"><span>Nom</span><input id="i-name" type="text" value="${esc(inst?.name ?? '')}" placeholder="EUR/USD"></label>
        <label class="field full"><span>Description</span><input id="i-desc" type="text" value="${esc(inst?.description ?? '')}" placeholder="Phrase affichée sous le nom"></label>
        <label class="field"><span>Catégorie</span>
          <select id="i-cat" class="toolbar-select" style="padding:11px 12px;">
            ${categories.map((c) => `<option value="${c.id}" ${inst && inst.categoryId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field"><span>Séance</span>
          <select id="i-session" class="toolbar-select" style="padding:11px 12px;">
            ${sessions.map((s) => `<option value="${s.id}" ${inst && inst.sessionId === s.id ? 'selected' : ''} data-tz="${esc(s.timezone)}">${esc(s.flag ? s.flag + ' ' : '')}${esc(s.name)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div id="window-editor"></div>`;
  }

  function mountEditor(modalBody, inst) {
    const sessionSelect = modalBody.querySelector('#i-session');
    const sessionTz = () => sessionSelect.selectedOptions[0].dataset.tz || 'UTC';
    const editor = buildWindowEditor(
      inst
        ? inst.windows.map((w) => ({ kind: w.kind, days: [...w.days], startMinute: w.startMinute, endMinute: w.endMinute, timezone: w.timezone, label: w.label || '' }))
        : [
            { kind: 'TRADING', days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 960, timezone: sessionTz(), label: '' },
            { kind: 'OPTIMAL', days: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 960, timezone: sessionTz(), label: '' },
          ],
      ALL_TZS,
      sessionTz()
    );
    const host = modalBody.querySelector('#window-editor');
    host.innerHTML = editor.html;
    const rerender = () => editor.renderGroups(host);
    rerender();
    editor.bind(host, rerender);
    return editor;
  }

  async function save(inst, windows) {
    const viewModel = {
      name: document.getElementById('i-name').value.trim(),
      description: document.getElementById('i-desc').value.trim(),
      categoryId: Number(document.getElementById('i-cat').value),
      sessionId: Number(document.getElementById('i-session').value),
      windows: windows,
    };
    if (!viewModel.name) throw new Error('Le nom est requis');
    if (inst && inst.id) await api('PUT', `/api/admin/instruments?id=${inst.id}`, viewModel);
    else await api('POST', '/api/admin/instruments', viewModel);
  }

  function openForm(inst) {
    const isEdit = Boolean(inst && inst.id);
    const modal = openModal({
      title: isEdit ? `Modifier : ${inst.name}` : inst ? 'Nouvel instrument (copie)' : 'Nouvel instrument',
      subtitle: 'Colonnes legacy (open/close/optimal) recalculées depuis les plages à chaque enregistrement',
      size: 'modal-lg',
      body: editorBody(inst),
      footerHtml: `
        <button class="btn-admin btn-admin-ghost" type="button" data-modal-close>Annuler</button>
        <button class="btn-admin btn-admin-primary" type="button" id="i-save">${isEdit ? 'Enregistrer' : 'Créer l’instrument'}</button>`,
      onClose: () => {},
    });

    const editor = mountEditor(modal.querySelector('.modal-body'), inst);

    modal.querySelector('#i-save').addEventListener('click', async () => {
      try {
        const compiled = editor.compile();
        if (!compiled.ok) throw new Error(compiled.errors.join(' · '));
        await save(inst, compiled.windows);
        document.getElementById('modal-root')._onClose(true);
        toast(isEdit ? 'Instrument mis à jour' : 'Instrument créé');
        render(content);
      } catch (error) {
        showError(error);
      }
    });
  }

  function openDuplicate(source) {
    openForm({
      ...source,
      id: null,
      name: `${source.name} (copie)`,
      slug: `${source.slug}-copie`,
      windows: source.windows.map((w) => ({ ...w, days: [...w.days] })),
    });
  }

  async function onDelete(inst) {
    const ok = await confirmDialog({
      title: 'Supprimer l’instrument ?',
      message: `« <strong>${esc(inst.name)}</strong> » sera supprimé avec ses ${inst.windows.length} plage(s) horaires. Action irréversible.`,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await api('DELETE', `/api/admin/instruments?id=${inst.id}`);
      toast('Instrument supprimé');
      render(content);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  content.querySelector('#inst-add').addEventListener('click', () => openForm(null));

  bindRowActions();
}
