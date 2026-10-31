// Module de login/inscription intégré à la navbar (boutons #login-btn et #mobile-login-btn).
// Réservé aux utilisateurs (rôle USER). L'admin se connecte uniquement via /admin.
export const setupLogin = (...buttons) => {
  const loginButtons = buttons.filter(Boolean);
  if (!loginButtons.length) return;

  const iconButtons = loginButtons.filter((btn) => btn.classList.contains('login-btn-icon'));
  const textButtons = loginButtons.filter((btn) => !btn.classList.contains('login-btn-icon'));
  const modal = document.createElement('div');
  modal.className = 'login-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Connexion / inscription');
  modal.innerHTML = `
    <div class="login-modal-backdrop" data-close></div>
    <div class="login-modal-card">
      <button type="button" class="login-modal-close" data-close aria-label="Fermer">✕</button>
      <div class="login-logo" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      </div>
      <h1 class="login-modal-title">Trading Sessions Hub</h1>
      <p class="login-modal-sub">Espace utilisateur</p>

      <div id="login-modal-error" class="login-error hidden" role="alert"></div>

      <form id="login-modal-form" autocomplete="on" novalidate data-mode="login">
        <input type="hidden" name="role" value="USER">

        <label class="field" data-for="both">
          <span>Email</span>
          <input id="login-modal-email" name="email" type="email" placeholder="email@example.com" required autocomplete="username">
        </label>
        <label class="field" data-for="both">
          <span>Mot de passe</span>
          <input id="login-modal-password" name="password" type="password" placeholder="••••••••" required autocomplete="current-password">
        </label>

        <label class="field hidden" data-for="register">
          <span>Nom</span>
          <input id="login-modal-name" name="name" placeholder="Votre nom" required autocomplete="name">
        </label>

        <button type="submit" class="btn-admin btn-admin-primary" id="login-modal-submit">
          Se connecter
        </button>
        <p class="login-modal-toggle">
          <span id="login-modal-toggle-text">Pas de compte ?</span>
          <button type="button" id="login-modal-toggle-btn" class="link-btn">Créer un compte</button>
        </p>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('#login-modal-form');
  const errorBox = modal.querySelector('#login-modal-error');
  const submitBtn = modal.querySelector('#login-modal-submit');
  const toggleBtn = modal.querySelector('#login-modal-toggle-btn');
  const toggleText = modal.querySelector('#login-modal-toggle-text');

  const fieldsBoth = modal.querySelectorAll('[data-for="both"]');
  const fieldsRegister = modal.querySelectorAll('[data-for="register"]');

  const open = () => modal.classList.remove('hidden');
  const close = () => {
    modal.classList.add('hidden');
    form.reset();
    errorBox.classList.add('hidden');
    setMode('login');
  };

  let mode = 'login';
  const setMode = (m) => {
    mode = m;
    form.dataset.mode = m;
    fieldsBoth.forEach((f) => f.classList.remove('hidden'));
    fieldsRegister.forEach((f) => f.classList.toggle('hidden', m !== 'register'));
    submitBtn.textContent = m === 'login' ? 'Se connecter' : 'Créer mon compte';
    toggleText.textContent = m === 'login' ? 'Pas de compte ?' : 'Déjà un compte ?';
    toggleBtn.textContent = m === 'login' ? 'Créer un compte' : 'Se connecter';
    errorBox.classList.add('hidden');
  };

  toggleBtn.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));

  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) close();
  });

  const getValues = () => {
    const fd = new FormData(form);
    const data = { role: 'USER' };
    for (const [k, v] of fd) data[k] = v;
    return data;
  };

  const submit = async (data) => {
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      errorBox.textContent = result.error || 'Identifiants invalides';
      errorBox.classList.remove('hidden');
      return false;
    }
    close();
    const role = result.user?.role || 'USER';
    window.location.href = role === 'ADMIN' ? '/admin' : '/account';
    return true;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    try {
      await submit(getValues());
    } catch {
      errorBox.textContent = 'Erreur réseau : réessayez';
      errorBox.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // État connecté : rediriger vers le bon espace privé.
  let connected = false;
  let userRole = 'USER';

  const syncButtonLabel = () => {
    iconButtons.forEach((btn) => {
      if (connected) {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
        btn.title = userRole === 'ADMIN' ? 'Administration' : 'Mon compte';
        btn.setAttribute('aria-label', userRole === 'ADMIN' ? 'Administration' : 'Mon compte');
      } else {
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
        btn.title = 'Connexion';
        btn.setAttribute('aria-label', 'Connexion');
      }
    });
    const label = connected
      ? (userRole === 'ADMIN' ? 'Administration' : 'Mon compte')
      : 'Connexion';
    textButtons.forEach((btn) => {
      btn.textContent = label;
      btn.title = label;
      btn.setAttribute('aria-label', label);
    });
  };

  syncButtonLabel();

  (async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        connected = true;
        userRole = data.user?.role || 'USER';
      }
    } catch {
      // hors ligne : considéré déconnecté
    }
    syncButtonLabel();
  })();

  const handleLoginClick = async () => {
    if (connected) {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      } catch {}
      connected = false;
      userRole = 'USER';
      syncButtonLabel();
      window.location.href = '/';
    } else {
      open();
    }
  };

  loginButtons.forEach((btn) => btn.addEventListener('click', handleLoginClick));
};
