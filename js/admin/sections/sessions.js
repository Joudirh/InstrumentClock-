import { api, esc, toast, ADMIN_ICONS } from '../common.js';
import { openModal, confirmDialog } from '../modal.js';

const REGIONS = ['ASIA', 'EUROPE', 'AMERICA', 'OCEANIA', 'AFRICA', 'GLOBAL'];
const TR_NAMES = { ASIA: 'Asie', EUROPE: 'Europe', AMERICA: 'Amérique', OCEANIA: 'Océanie', AFRICA: 'Afrique', GLOBAL: 'Global' };

function sessionForm(session) {
  return `
    <div class="form-grid">
      <label class="field"><span>Nom</span><input id="s-name" type="text" value="${esc(session?.name ?? '')}"></label>
      <label class="field"><span>Slug (optionnel)</span><input id="s-slug" type="text" value="${esc(session?.slug ?? '')}" ${session ? 'disabled' : ''}></label>
      <label class="field"><span>Région</span>
        <select id="s-region" class="toolbar-select" style="padding:11px 12px;">
          ${REGIONS.map((r) => `<option value="${r}" ${session?.region === r ? 'selected' : ''}>${TR_NAMES[r]}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>Fuseau horaire</span><input id="s-tz" type="text" value="${esc(session?.timezone ?? 'UTC')}" placeholder="Europe/London"></label>
      <label class="field"><span>Position</span><input id="s-position" type="number" value="${session?.position ?? 0}"></label>
      <label class="field"><span>Drapeau</span><input id="s-flag" type="text" value="${esc(session?.flag ?? '')}" placeholder="🇬🇧"></label>
      <label class="field"><span>Couleur</span><input id="s-color" type="text" value="${esc(session?.color ?? '')}" placeholder="#85B7EB"></label>
      <label class="field" style="justify-content:flex-end; display:flex; flex-direction:column; gap:8px;">
        <span>Séance 24/7</span>
        <input id="s-is247" type="checkbox" style="width:18px;height:18px;accent-color:var(--color-primary);" ${session?.is247 ? 'checked' : ''}>
      </label>
    </div>`;
}

function readForm() {
  return {
    name: document.getElementById('s-name').value.trim(),
    slug: document.getElementById('s-slug').value.trim(),
    region: document.getElementById('s-region').value,
    timezone: document.getElementById('s-tz').value.trim(),
    position: Number(document.getElementById('s-position').value),
    flag: document.getElementById('s-flag').value.trim(),
    color: document.getElementById('s-color').value.trim(),
    is247: document.getElementById('s-is247').checked,
  };
}

export async function render(content) {
  const { sessions } = await api('GET', '/api/admin/sessions');

  content.innerHTML = `
    <div class="table-toolbar">
      <p class="muted" style="font-size:13px;">Table <span class="mono">sessions</span> — chaque instrument se rattache à une séance.</p>
      <div class="spacer"></div>
      <button class="btn-admin btn-admin-primary" id="s-add">${ADMIN_ICONS.plus} Nouvelle séance</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Séance</th><th>Région</th><th>Fuseau</th><th>24/7</th><th>Instruments</th><th style="text-align:right;">Actions</th></tr>
        </thead>
        <tbody>
          ${
            sessions.length === 0
              ? '<tr><td colspan="6" class="empty-state">Aucune séance</td></tr>'
              : sessions
                  .map(
                    (s) => `
            <tr>
              <td><div class="cell-identity"><strong>${esc(s.flag ? s.flag + ' ' : '')}${esc(s.name)}</strong><small>${esc(s.slug)}</small></div></td>
              <td><span class="badge badge-region">${esc(s.region)}</span></td>
              <td class="mono">${esc(s.timezone)}</td>
              <td>${s.is247 ? '<span class="badge badge-247">24/7</span>' : '<span class="muted">—</span>'}</td>
              <td><span class="badge">${s._count.instruments}</span></td>
              <td>
                <div class="cell-actions">
                  <button class="icon-btn" type="button" data-edit="${s.id}" title="Modifier" aria-label="Modifier ${esc(s.name)}">${ADMIN_ICONS.edit}</button>
                  <button class="icon-btn danger" type="button" data-delete="${s.id}" title="Supprimer" aria-label="Supprimer ${esc(s.name)}">${ADMIN_ICONS.trash}</button>
                </div>
              </td>
            </tr>`
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>`;

  const openForm = (session) => {
    openModal({
      title: session ? `Modifier : ${session.name}` : 'Nouvelle séance',
      body: sessionForm(session),
      footerHtml: `<button class="btn-admin btn-admin-primary" type="button" id="s-save">${session ? 'Enregistrer' : 'Créer'}</button>`,
    });
    document.getElementById('s-save').addEventListener('click', async () => {
      try {
        const payload = readForm();
        if (session) await api('PUT', `/api/admin/sessions?id=${session.id}`, payload);
        else await api('POST', '/api/admin/sessions', payload);
        document.getElementById('modal-root')._onClose(true);
        toast(session ? 'Séance mise à jour' : 'Séance créée');
        render(content);
      } catch (error) {
        showError(error);
      }
    });
  };

  content.querySelector('#s-add').addEventListener('click', () => openForm(null));
  content.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => openForm(sessions.find((s) => s.id === Number(btn.dataset.edit))))
  );
  content.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const session = sessions.find((s) => s.id === Number(btn.dataset.delete));
      const ok = await confirmDialog({
        title: 'Supprimer la séance ?',
        message: `« ${esc(session.name)} » est rattachée à <strong>${session._count.instruments}</strong> instrument(s). La suppression est refusée tant que des instruments l'utilisent.`,
        confirmLabel: 'Supprimer',
      });
      if (!ok) return;
      try {
        await api('DELETE', `/api/admin/sessions?id=${session.id}`);
        toast('Séance supprimée');
        render(content);
      } catch (error) {
        toast(error.message, 'error');
      }
    })
  );

  function showError(error) {
    let box = document.querySelector('.modal-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'modal-error';
      document.querySelector('.modal-body').prepend(box);
    }
    box.textContent = error.message;
  }
}
