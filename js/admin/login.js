const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const submitBtn = document.getElementById('login-submit');
const passwordInput = document.getElementById('login-password');
const revealBtn = document.getElementById('login-reveal');

revealBtn.addEventListener('click', () => {
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
});

// Déjà connecté → dashboard directement.
fetch('/api/auth/session', { credentials: 'same-origin' })
  .then((res) => {
    if (res.ok) window.location.href = '/dashboard';
  })
  .catch(() => {});

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
        email: document.getElementById('login-email').value,
        password: passwordInput.value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      errorBox.textContent = data.error || 'Identifiants invalides';
      errorBox.classList.remove('hidden');
      return;
    }
    window.location.href = '/dashboard';
  } catch {
    errorBox.textContent = 'Erreur réseau : réessayez';
    errorBox.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
  }
});
