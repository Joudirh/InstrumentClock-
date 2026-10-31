import { api, esc, toast, ADMIN_ICONS } from '../common.js';
import { openModal, confirmDialog } from '../modal.js';

export async function render(content) {
  const { categories } = await api('GET', '/api/admin/categories');

  content.innerHTML = `
    <div class="table-toolbar">
      <div class="spacer"></div>
      <button class="btn-admin btn-admin-primary" id="cat-add">${ADMIN_ICONS.plus} Nouvelle catégorie</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Catégorie</th><th>Slug</th><th>Position</th><th>Instruments</th><th style="text-align:right;">Actions</th></tr>
        </thead>
        <tbody>
          ${
            categories.length === 0
              ? '<tr><td colspan="5" class="empty-state">Aucune catégorie</td></tr>'
              : categories
                  .map(
                    (c) => `
            <tr>
              <td><div class="cell-identity"><strong>${esc(c.name)}</strong><small>id ${c.id}</small></div></td>
              <td><span class="mono">${esc(c.slug)}</span></td>
              <td class="muted">${c.position}</td>
              <td><span class="badge">${c._count.instruments}</span></td>
              <td>
                <div class="cell-actions">
                  <button class="icon-btn" type="button" data-edit="${c.id}" title="Modifier" aria-label="Modifier ${esc(c.name)}">${ADMIN_ICONS.edit}</button>
                  <button class="icon-btn danger" type="button" data-delete="${c.id}" title="Supprimer" aria-label="Supprimer ${esc(c.name)}">${ADMIN_ICONS.trash}</button>
                </div>
              </td>
            </tr>`
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>`;

  const openForm = (category) => {
    openModal({
      title: category ? `Modifier : ${category.name}` : 'Nouvelle catégorie',
      body: `
        <div class="form-grid">
          <label class="field full"><span>Nom</span><input id="c-name" type="text" value="${esc(category?.name ?? '')}"></label>
          <label class="field"><span>Position</span><input id="c-position" type="number" value="${category?.position ?? 0}"></label>
        </div>`,
      footerHtml: `<button class="btn-admin btn-admin-primary" type="button" id="c-save">${category ? 'Enregistrer' : 'Créer'}</button>`,
    });
    document.getElementById('c-save').addEventListener('click', async () => {
      try {
        const payload = {
          name: document.getElementById('c-name').value.trim(),
          position: Number(document.getElementById('c-position').value),
        };
        if (category) await api('PUT', `/api/admin/categories?id=${category.id}`, payload);
        else await api('POST', '/api/admin/categories', payload);
        document.getElementById('modal-root')._onClose(true);
        toast(category ? 'Catégorie mise à jour' : 'Catégorie créée');
        render(content);
      } catch (error) { showError(error); }
    });
  };

  content.querySelector('#cat-add').addEventListener('click', () => openForm(null));
  content.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => openForm(categories.find((c) => c.id === Number(btn.dataset.edit))))
  );
  content.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const category = categories.find((c) => c.id === Number(btn.dataset.delete));
      const ok = await confirmDialog({
        title: 'Supprimer la catégorie ?',
        message: `« ${esc(category.name)} » contient <strong>${category._count.instruments}</strong> instrument(s). La suppression est refusée tant que des instruments y sont rattachés.`,
        confirmLabel: 'Supprimer',
      });
      if (!ok) return;
      try {
        await api('DELETE', `/api/admin/categories?id=${category.id}`);
        toast('Catégorie supprimée');
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
