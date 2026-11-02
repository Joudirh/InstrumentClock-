const showError = (message) => {
  const content = document.getElementById('dashboard-loading')
    || document.getElementById('admin-content')
    || document.querySelector('main');
  if (!content) return;
  content.setAttribute('role', 'alert');
  content.textContent = message;
};

try {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  if (response.status === 401) {
    window.location.replace('/');
  } else if (!response.ok) {
    throw new Error(`Impossible de vérifier la session (${response.status}).`);
  } else {
    const { user } = await response.json();
    const pagePath = user?.role === 'ADMIN'
      ? '/admin-dashboard.html'
      : user?.role === 'USER'
        ? '/account.html'
        : null;

    if (!pagePath) {
      window.location.replace('/');
    } else {
      const pageResponse = await fetch(pagePath, { credentials: 'same-origin' });
      if (!pageResponse.ok) {
        throw new Error(`Impossible de charger votre espace (${pageResponse.status}).`);
      }
      const pageHtml = await pageResponse.text();
      const page = new DOMParser().parseFromString(pageHtml, 'text/html');
      page.querySelectorAll('script').forEach((script) => script.remove());
      document.documentElement.replaceWith(document.adoptNode(page.documentElement));

      await import(user.role === 'ADMIN' ? '/js/admin/app.js' : '/js/user/app.js');
      await import('/js/i18n/bootstrap.js');
    }
  }
} catch (error) {
  console.error('Échec du chargement du tableau de bord.', error);
  showError('Impossible de charger votre espace. Réessayez dans quelques instants.');
}
