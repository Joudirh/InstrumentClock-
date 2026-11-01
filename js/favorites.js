export const setupFavorites = ({ container, button, badge, panel, wrapper, loginButton, getInstrument, onChange }) => {
  const favorites = new Map();
  let authenticated = null;
  let initialized = false;
  let loading = null;
  let panelOpen = false;
  let errorMessage = '';
  const pending = new Set();

  const resetLoggedOut = () => {
    authenticated = false;
    favorites.clear();
    badge.textContent = '0';
    renderPanel();
    onChange();
  };

  const setPanelOpen = (open) => {
    panelOpen = open;
    panel.classList.toggle('hidden', !open);
    button.setAttribute('aria-expanded', String(open));
    if (open) renderPanel();
  };

  const addLoginPrompt = () => {
    const message = document.createElement('p');
    message.className = 'favorites-empty';
    message.textContent = 'Connectez-vous pour enregistrer et consulter vos instruments favoris.';
    const login = document.createElement('button');
    login.type = 'button';
    login.className = 'favorites-login';
    login.textContent = 'Se connecter';
    login.addEventListener('click', () => loginButton?.click());
    panel.append(message, login);
  };

  const renderPanel = () => {
    panel.replaceChildren();
    if (!initialized) {
      const message = document.createElement('p');
      message.className = 'favorites-empty';
      message.textContent = 'Chargement des favoris…';
      panel.appendChild(message);
      return;
    }
    if (authenticated === null) {
      const error = document.createElement('p');
      error.className = 'favorites-empty favorites-error';
      error.textContent = errorMessage;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'favorites-login';
      retry.textContent = 'Réessayer';
      retry.addEventListener('click', load);
      panel.append(error, retry);
      return;
    }
    if (!authenticated) {
      addLoginPrompt();
      return;
    }
    if (errorMessage) {
      const error = document.createElement('p');
      error.className = 'favorites-empty favorites-error';
      error.textContent = errorMessage;
      panel.appendChild(error);
    }
    if (!favorites.size) {
      const empty = document.createElement('p');
      empty.className = 'favorites-empty';
      empty.textContent = 'Vous n’avez pas encore ajouté de favori.';
      panel.appendChild(empty);
      return;
    }

    favorites.forEach((favorite) => {
      const row = document.createElement('div');
      row.className = 'favorite-row';
      const info = document.createElement('div');
      info.className = 'favorite-row-info';
      const name = document.createElement('strong');
      name.textContent = favorite.instrument.name;
      const meta = document.createElement('span');
      meta.textContent = [
        favorite.instrument.category?.name,
        favorite.instrument.session?.name,
      ].filter(Boolean).join(' · ');
      info.append(name, meta);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'favorite-remove';
      remove.dataset.favoriteId = String(favorite.id);
      remove.setAttribute('aria-label', `Retirer ${favorite.instrument.name} des favoris`);
      remove.title = 'Retirer des favoris';
      remove.textContent = '×';
      row.append(info, remove);
      panel.appendChild(row);
    });
  };

  const load = () => {
    if (loading) return loading;
    loading = (async () => {
      errorMessage = '';
      try {
        const response = await fetch('/api/me/favorites', { credentials: 'same-origin' });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          resetLoggedOut();
          return;
        }
        if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
        authenticated = true;
        favorites.clear();
        for (const favorite of data.favorites || []) {
          const instrumentId = Number(favorite.instrumentId ?? favorite.instrument?.id);
          if (Number.isInteger(instrumentId)) favorites.set(instrumentId, favorite);
        }
      } catch (error) {
        errorMessage = `Impossible de charger les favoris : ${error.message}`;
        console.error('[favorites]', error);
      } finally {
        initialized = true;
        loading = null;
        badge.textContent = String(favorites.size);
        renderPanel();
        onChange();
      }
    })();
    return loading;
  };

  const toggleFavorite = async (control) => {
    const instrumentId = Number(control.dataset.instrumentId);
    if (!Number.isInteger(instrumentId) || instrumentId < 1) return;
    if (!initialized) await load();
    if (!authenticated) {
      setPanelOpen(true);
      return;
    }
    if (pending.has(instrumentId)) return;

    const existing = favorites.get(instrumentId);
    pending.add(instrumentId);
    control.disabled = true;
    errorMessage = '';
    try {
      const response = existing
        ? await fetch(`/api/me/favorites?id=${existing.id}`, { method: 'DELETE', credentials: 'same-origin' })
        : await fetch('/api/me/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ instrumentId }),
          });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        resetLoggedOut();
        setPanelOpen(true);
        return;
      }
      if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);

      if (existing) {
        favorites.delete(instrumentId);
      } else {
        const instrument = getInstrument(instrumentId);
        favorites.set(instrumentId, {
          id: data.favorite.id,
          instrumentId,
          instrument: {
            id: instrumentId,
            name: instrument?.name || 'Instrument',
            category: instrument?.category || null,
            session: instrument?.session || null,
          },
        });
      }
      badge.textContent = String(favorites.size);
      renderPanel();
      onChange();
    } catch (error) {
      errorMessage = `Impossible de modifier les favoris : ${error.message}`;
      console.error('[favorites]', error);
      renderPanel();
      setPanelOpen(true);
    } finally {
      pending.delete(instrumentId);
    }
  };

  button.addEventListener('click', () => setPanelOpen(!panelOpen));
  container.addEventListener('click', (event) => {
    const control = event.target.closest('.inst-favorite-btn');
    if (!control) return;
    toggleFavorite(control);
  });
  panel.addEventListener('click', async (event) => {
    const remove = event.target.closest('[data-favorite-id]');
    if (!remove) return;
    const favoriteId = Number(remove.dataset.favoriteId);
    const entry = [...favorites.entries()].find(([, favorite]) => favorite.id === favoriteId);
    if (!entry) return;
    const [instrumentId] = entry;
    remove.disabled = true;
    try {
      const response = await fetch(`/api/me/favorites?id=${favoriteId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        resetLoggedOut();
        setPanelOpen(true);
        return;
      }
      if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
      favorites.delete(instrumentId);
      badge.textContent = String(favorites.size);
      renderPanel();
      onChange();
    } catch (error) {
      errorMessage = `Impossible de retirer le favori : ${error.message}`;
      console.error('[favorites]', error);
      renderPanel();
    }
  });

  document.addEventListener('click', (event) => {
    if (panelOpen && !wrapper.contains(event.target)) setPanelOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panelOpen) {
      setPanelOpen(false);
      button.focus();
    }
  });

  load();
  return {
    getInstrumentIds: () => new Set(favorites.keys()),
    reload: load,
  };
};
