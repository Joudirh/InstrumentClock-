import { api, esc, toast, ADMIN_ICONS } from '../common.js';
import { openModal, confirmDialog } from '../modal.js';

const state = { search: '' };

function passphraseForModal(user, isEdit) {
  return `
    <div class="form-grid">
      <label class="field"><span>Nom</span><input id="u-name" type="text" value="${esc(user?.name ?? '')}" required></label>
      <label class="field"><span>Rôle</span>
        <select id="u-role" class="toolbar-select" style="padding:11px 12px;">
          <option value="EDITOR" ${user?.role !== 'ADMIN' ? 'selected' : ''}>Editeur</option>
          <option value="ADMIN" ${user?.role === 'ADMIN' ? 'selected' : ''}>Administrateur</option>
        </select>
      </label>
      <label class="field full"><span>Email</span><input id="u-email" type="email" value="${esc(user?.email ?? '')}" required></label>
      <label class="field full">
        <span>${isEdit ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe'}</span>
        <input id="u-password" type="password" autocomplete="new-password" placeholder="${isEdit ? '••••••••' : '6 caractères minimum'}">
      </label>
    </div>`;
}

function readForm() {
  return {
    name: document.getElementById('u-name').value.trim(),
    email: document.getElementById('u-email').value.trim(),
    role: document.getElementById('u-role').value,
    password: document.getElementById('u-password').value,
  };
}

export async function render(content) {
  const { users } = await api('GET', '/api/admin/users');
  const me = window.__adminUser;
  const filtered = users.filter(
    (u) =>
      !state.search ||
      u.name.toLowerCase().includes(state.search) ||
      u.email.toLowerCase().includes(state.search)
  );

  content.innerHTML = `
    <div class="table-toolbar">
      <input class="toolbar-input" id="users-search" type="search" placeholder="Rechercher un utilisateur…" value="${esc(state.search)}">
      <div class="spacer"></div>
      <button class="btn-admin btn-admin-primary" id="user-add">${ADMIN_ICONS.plus} Nouvel utilisateur</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Statut</th><th style="text-align:right;">Actions</th></tr>
        </thead>
        <tbody>
          ${
            filtered.length === 0
              ? '<tr><td colspan="5" class="empty-state">Aucun utilisateur trouvé</td></tr>'
              : filtered
                  .map(
                    (u) => `
            <tr>
              <td><div class="cell-identity"><strong>${esc(u.name)}${u.email === me.email ? ' <span class="muted">(vous)</span>' : ''}</strong><small>Inscrit le ${new Date(u.createdAt).toLocaleDateString('fr-FR')}</small></div></td>
              <td class="muted">${esc(u.email)}</td>
              <td><span class="badge ${u.role === 'ADMIN' ? 'badge-admin-role' : ''}">${u.role === 'ADMIN' ? 'Administrateur' : 'Editeur'}</span></td>
              <td><span class="badge ${u.isActive ? 'badge-247' : 'badge-off'}">${u.isActive ? 'Actif' : 'Désactivé'}</span></td>
              <td>
                <div class="cell-actions">
                  <button class="icon-btn" type="button" data-edit="${u.id}" title="Modifier" aria-label="Modifier ${esc(u.name)}">${ADMIN_ICONS.edit}</button>
                  <button class="icon-btn danger" type="button" data-delete="${u.id}" title="Supprimer" aria-label="Supprimer ${esc(u.name)}" ${u.email === me.email ? 'disabled' : ''}>${ADMIN_ICONS.trash}</button>
                </div>
              </td>
            </tr>`
                  )
                  .join('')
          }
        </tbody>
      </table>
    </div>`;

  content.querySelector('#users-search').addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render(content);
  });

  content.querySelector('#user-add').addEventListener('click', () => {
    openModal({
      title: 'Nouvel utilisateur',
      subtitle: 'Les identifiants permettent la connexion à /admin',
      body: passphraseForModal(null, false),
      footerHtml: '<button class="btn-admin btn-admin-primary" type="button" id="u-save">Créer l’utilisateur</button>',
      onClose: () => {},
    });
    const root = document.getElementById('modal-root');
    document.getElementById('u-save').addEventListener('click', async () => {
      try {
        const payload = readForm();
        if (!payload.password) throw new Error('Mot de passe requis');
        await api('POST', '/api/admin/users', payload);
        document.getElementById('modal-root')._onClose(true);
        toast('Utilisateur créé');
        render(content);
      } catch (error) {
        showError(error);
      }
    });
  });

  content.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const user = users.find((u) => u.id === Number(btn.dataset.edit));
      openModal({
        title: `Modifier : ${user.name}`,
        body: passphraseForModal(user, true),
        footerHtml: '<button class="btn-admin btn-admin-primary" type="button" id="u-save">Enregistrer</button>',
        onClose: () => {},
      });
      document.getElementById('u-save').addEventListener('click', async () => {
        try {
          const payload = readForm();
          if (!payload.password) delete payload.password;
          await api('PUT', `/api/admin/users?id=${user.id}`, payload);
          document.getElementById('modal-root')._onClose(true);
          toast('Utilisateur mis à jour');
          render(content);
        } catch (error) {
          showError(error);
        }
      });
    });
  });

  content.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const user = users.find((u) => u.id === Number(btn.dataset.delete));
      const ok = await confirmDialog({
        title: 'Supprimer l’utilisateur ?',
        message: `« ${esc(user.name)} » (${esc(user.email)}) perdra définitivement l'accès. À confirmer.`,
        confirmLabel: 'Supprimer',
      });
      if (!ok) return;
      try {
        await api('DELETE', `/api/admin/users?id=${user.id}`);
        toast('Utilisateur supprimé');
        render(content);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
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
}
