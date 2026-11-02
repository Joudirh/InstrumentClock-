import adminPage from '../admin-dashboard.html?raw';
import accountPage from '../account.html?raw';

const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
if (!response.ok) {
  window.location.replace('/');
} else {
  const { user } = await response.json();
  const pageHtml = user?.role === 'ADMIN'
    ? adminPage
    : user?.role === 'USER'
      ? accountPage
      : null;

  if (!pageHtml) {
    window.location.replace('/');
  } else {
    const page = new DOMParser().parseFromString(pageHtml, 'text/html');
    page.querySelectorAll('script').forEach((script) => script.remove());
    document.documentElement.replaceWith(document.adoptNode(page.documentElement));

    await import(user.role === 'ADMIN' ? '/js/admin/app.js' : '/js/user/app.js');
    await import('/js/i18n/bootstrap.js');
  }
}
