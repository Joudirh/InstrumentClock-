import { api, esc, toast, ADMIN_ICONS } from '../common.js';
import { openModal, confirmDialog } from '../modal.js';
import { formatWindowSummary, buildWindowEditor } from '../windows.js';
import { parseInstrumentCsv } from '../instrument-import.js';

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
      <button class="btn-admin btn-admin-ghost" id="inst-import" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m17 8-5-5-5 5"></path><path d="M12 3v12"></path></svg>
        Importer CSV
      </button>
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

  function downloadImportTemplate() {
    const headers = ['name', 'description', 'category', 'session', 'trading_windows', 'optimal_windows'];
    const quoteCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const preferredSessions = {
      forex: 'london',
      indices: 'tokyo',
      'matieres-premieres': 'london',
      actions: 'new-york',
      crypto: 'global-24-7',
      etf: 'new-york',
      futures: 'chicago',
    };
    const findSession = (category) => {
      const preferredSlug = preferredSessions[category.slug];
      return sessions.find((session) => session.slug === preferredSlug)
        || sessions.find((session) => session.is247)
        || sessions[0];
    };
    const sampleRows = categories.flatMap((category) => {
      const session = findSession(category);
      if (!session) return [];
      return [[
        `EXEMPLE ${category.name} - À MODIFIER OU SUPPRIMER`,
        `Exemple pour la catégorie ${category.name}. Remplacez cette ligne ou supprimez-la.`,
        category.name,
        session.name,
        `1-5 08:00-17:00@${session.timezone}`,
        `1-5 08:00-12:00@${session.timezone}`,
      ]];
    });
    const csv = [headers, ...sampleRows]
      .map((row) => row.map(quoteCsv).join(';'))
      .join('\r\n') + '\r\n';
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele-import-instruments.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function openImport() {
    const modal = openModal({
      title: 'Importer plusieurs instruments',
      subtitle: 'Remplissez le modèle CSV dans Excel ou un tableur, puis importez-le ici.',
      size: 'modal-lg',
      body: `
        <button class="btn-admin btn-admin-ghost import-template-btn" id="inst-template" type="button">Télécharger le modèle CSV</button>
        <div class="import-guide">
          <strong>Colonnes du modèle</strong>
          <p><code>name</code>, <code>description</code>, <code>category</code>, <code>session</code>, <code>trading_windows</code>, <code>optimal_windows</code>.</p>
          <p>Le modèle contient une ligne d’exemple pour chaque catégorie de votre application. Remplacez les lignes utiles par vos instruments et supprimez les autres avant l’import.</p>
          <p>Les catégories et séances doivent reprendre leur nom affiché dans l’administration. Une plage suit le format <code>1-5 08:00-17:00@Europe/Paris</code> (1 = lundi, 7 = dimanche).</p>
          <p>Pour plusieurs plages du même type, séparez-les avec <code>|</code>. Vous pouvez ajouter un libellé avec <code>Session Londres~1-5 08:00-17:00@Europe/London</code>.</p>
          <p>Pour une fin après minuit, utilisez une heure supérieure à 24, par exemple <code>1-5 22:00-26:00@Europe/Paris</code>.</p>
          <p>Les colonnes de plages sont obligatoires. Chaque instrument doit avoir au moins une plage TRADING et une plage OPTIMAL. Maximum 12 plages par instrument et 100 instruments par import.</p>
        </div>
        <label class="field import-file-field">
          <span>Fichier CSV</span>
          <input id="inst-import-file" type="file" accept=".csv,text/csv">
        </label>
        <div id="inst-import-feedback" class="import-feedback" aria-live="polite"></div>`,
      footerHtml: `
        <button class="btn-admin btn-admin-ghost" type="button" data-modal-close>Fermer</button>
        <button class="btn-admin btn-admin-primary" type="button" id="inst-import-submit" disabled>Importer les instruments</button>`,
    });

    const fileInput = modal.querySelector('#inst-import-file');
    const submitButton = modal.querySelector('#inst-import-submit');
    const feedback = modal.querySelector('#inst-import-feedback');
    let parsedImport = null;

    modal.querySelector('#inst-template').addEventListener('click', downloadImportTemplate);
    fileInput.addEventListener('change', async () => {
      parsedImport = null;
      submitButton.disabled = true;
      feedback.replaceChildren();
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.csv')) {
        feedback.textContent = 'Sélectionnez un fichier .csv.';
        feedback.className = 'import-feedback error';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        feedback.textContent = 'Le fichier dépasse la limite de 2 Mo.';
        feedback.className = 'import-feedback error';
        return;
      }

      try {
        const result = parseInstrumentCsv(await file.text(), { categories, sessions });
        parsedImport = result;
        const summary = document.createElement('p');
        summary.textContent = `${result.instruments.length} ligne(s) valide(s) sur ${result.totalRows}.`;
        feedback.appendChild(summary);
        if (result.errors.length) {
          const errorList = document.createElement('ul');
          result.errors.forEach((message) => {
            const item = document.createElement('li');
            item.textContent = message;
            errorList.appendChild(item);
          });
          feedback.appendChild(errorList);
        }
        feedback.className = `import-feedback${result.errors.length ? ' error' : ' success'}`;
        submitButton.disabled = result.instruments.length === 0;
      } catch (error) {
        feedback.textContent = error.message;
        feedback.className = 'import-feedback error';
      }
    });

    submitButton.addEventListener('click', async () => {
      if (!parsedImport?.instruments.length) return;
      submitButton.disabled = true;
      fileInput.disabled = true;
      const errors = [...parsedImport.errors];
      let imported = 0;
      const progress = document.createElement('p');
      progress.setAttribute('role', 'status');
      progress.textContent = `Import en cours : 0/${parsedImport.instruments.length}.`;
      feedback.replaceChildren(progress);
      feedback.className = 'import-feedback';

      for (let index = 0; index < parsedImport.instruments.length; index += 1) {
        const instrument = parsedImport.instruments[index];
        try {
          await api('POST', '/api/admin/instruments', instrument);
          imported += 1;
        } catch (error) {
          errors.push(`« ${instrument.name} » : ${error.message}`);
        }
        progress.textContent = `Import en cours : ${index + 1}/${parsedImport.instruments.length} — ${imported} créé(s).`;
      }

      if (imported > 0) {
        toast(`${imported} instrument(s) importé(s)${errors.length ? `, ${errors.length} erreur(s)` : ''}`, errors.length ? 'error' : 'success');
        try {
          await render(content);
        } catch (error) {
          errors.push(`Import effectué, mais impossible d’actualiser le tableau : ${error.message}`);
        }
      }

      feedback.replaceChildren();
      const summary = document.createElement('p');
      summary.textContent = `${imported} instrument(s) créé(s), ${errors.length} erreur(s).`;
      feedback.appendChild(summary);
      if (errors.length) {
        const errorList = document.createElement('ul');
        errors.forEach((message) => {
          const item = document.createElement('li');
          item.textContent = message;
          errorList.appendChild(item);
        });
        feedback.appendChild(errorList);
      }
      feedback.className = `import-feedback${errors.length ? ' error' : ' success'}`;
      fileInput.disabled = false;
      submitButton.textContent = 'Importer un autre fichier';
      submitButton.disabled = true;
      parsedImport = null;
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
  content.querySelector('#inst-import').addEventListener('click', openImport);

  bindRowActions();
}
