import { esc, ADMIN_ICONS } from './common.js';

const modalRoot = () => document.getElementById('modal-root');

/**
 * Ouvre une modale. onClose(approve) est appelé à la fermeture (true = bouton principal).
 * Renvoie l'élément .modal ; le contenu est dans .modal-body.
 */
export function openModal({ title, subtitle = '', size = '', body = '', footerHtml = '', onClose }) {
  const root = modalRoot();
  root.innerHTML = `
    <div class="modal ${size}" role="document">
      <div class="modal-head">
        <h2>${esc(title)}${subtitle ? `<small>${esc(subtitle)}</small>` : ''}</h2>
        <button class="icon-btn" type="button" data-modal-close aria-label="Fermer">${ADMIN_ICONS.x}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footerHtml ? `<div class="modal-foot">${footerHtml}</div>` : ''}
    </div>`;
  root.classList.remove('hidden');

  if (!root.dataset.bound) {
    root.dataset.bound = '1';
    // Un seul listener global : clic dehors / croix fermes la modale courante.
    root.addEventListener('click', (event) => {
      if (event.target === root || event.target.closest('[data-modal-close]')) {
        if (root._onClose) root._onClose(false);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !root.classList.contains('hidden') && root._onClose) {
        root._onClose(false);
      }
    });
  }

  root._onClose = (approve) => {
    if (root.classList.contains('hidden')) return;
    root.classList.add('hidden');
    root.innerHTML = '';
    const cb = root._userClose;
    root._userClose = null;
    if (cb) cb(approve);
  };
  root._userClose = onClose || null;
  root.querySelector('[data-modal-close]').addEventListener('click', () => root._onClose(false));

  return root.querySelector('.modal');
}

export function closeModal(approve = false) {
  const root = modalRoot();
  if (root && !root.classList.contains('hidden') && root._onClose) root._onClose(approve);
}

/** Confirmation stylée (remplace window.confirm). Renvoie true si approuvé. */
export function confirmDialog({ title, message, confirmLabel = 'Confirmer', danger = true }) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `<p style="font-size:13.5px;line-height:1.55;color:var(--text-main);">${message}</p>`,
      footerHtml: `
        <button class="btn-admin btn-admin-ghost" type="button" data-modal-close>Annuler</button>
        <button class="btn-admin ${danger ? 'btn-admin-danger' : 'btn-admin-primary'}" type="button" data-confirm>${confirmLabel}</button>`,
      onClose: (approve) => resolve(Boolean(approve)),
    });
    const root = modalRoot();
    root.querySelector('[data-confirm]').addEventListener('click', () => root._onClose(true));
  });
}
