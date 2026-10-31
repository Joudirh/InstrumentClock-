// Module de login/déconnexion intégré à la navbar (bouton #login-btn).
// Utilise les endpoints Vercel : POST /api/auth/login, GET /api/auth/session,
// POST /api/auth/logout (cookie HttpOnly ic_session).
export const setupLogin = (loginBtn) => {
  const modal = document.createElement('div');
  modal.className = 'login-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Connexion');
  modal.innerHTML = `
    <div class="login-modal-backdrop" data-close></div>
    <div class="login-modal-card">
      <button type="button" class="login-modal-close" data-close aria-label="Fermer">✕</button>
      <div class="login-logo" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      </div>
      <h1 class="login-modal-title">Trading Sessions Hub</h1>
      <p class="login-modal-sub">Interface d'administration</p>

      <div id="login-modal-error" class="login-error hidden" role="alert"></div>

      <form id="login-modal-form" autocomplete="on" novalidate>
        <label class="field">
          <span>Email</span>
          <input id="login-modal-email" name="email" type="email" placeholder="admin@instrumentclock.com" required autocomplete="username">
        </label>
        <label class="field">
          <span>Mot de passe</span>
          <input id="login-modal-password" name="password" type="password" placeholder="••••••••" required autocomplete="current-password">
        </label>
        <button type="submit" class="btn-admin btn-admin-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          Se connecter
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('#login-modal-form');
  const errorBox = modal.querySelector('#login-modal-error');
  const submitBtn = modal.querySelector('.btn-admin-primary');

  const open = () => modal.classList.remove('hidden');
  const close = () => {
    modal.classList.add('hidden');
    form.reset();
    errorBox.classList.add('hidden');
  };

  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: modal.querySelector('#login-modal-email').value,
          password: modal.querySelector('#login-modal-password').value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errorBox.textContent = data.error || 'Identifiants invalides';
        errorBox.classList.remove('hidden');
        return;
      }
      close();
      window.location.href = '/dashboard';
    } catch {
      errorBox.textContent = 'Erreur réseau : réessayez';
      errorBox.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Vérifie la session au chargement pour afficher "Déconnexion" si connecté.
  let connected = false;

  const syncButtonLabel = () => {
    if (connected) {
      loginBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
      loginBtn.title = 'Déconnexion';
      loginBtn.setAttribute('aria-label', 'Déconnexion');
    } else {
      loginBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
      loginBtn.title = 'Connexion';
      loginBtn.setAttribute('aria-label', 'Connexion');
    }
  };

  syncButtonLabel();

  (async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
      if (res.ok) {
        connected = true;
      }
    } catch {
      // hors ligne / API indisponible : consideré déconnecté
    }
    syncButtonLabel();
  })();

  loginBtn.addEventListener('click', async () => {
    if (connected) {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      } catch {
        // déjà déconnecté : la redirection suffit
      }
      connected = false;
      syncButtonLabel();
      window.location.href = '/';
    } else {
      open();
    }
  });
};