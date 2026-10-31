import { api, esc, ADMIN_ICONS } from '../common.js';

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export async function render(content) {
  const { stats, recent } = await api('GET', '/api/admin/overview');

  const cards = [
    { icon: ADMIN_ICONS.clock, label: 'Instruments', value: stats.instruments },
    { icon: '⏱', label: 'Plages horaires', value: stats.windows },
    { icon: '🗂', label: 'Catégories', value: stats.categories },
    { icon: '🌐', label: 'Séances', value: stats.sessions },
    { icon: '🌍', label: 'Séances Forex', value: stats.forexSessions },
    { icon: '👥', label: 'Utilisateurs', value: stats.users },
    { icon: '🖼', label: 'Assets', value: stats.assets },
    { icon: '❄', label: 'Saisons', value: stats.seasons },
  ];

  content.innerHTML = `
    <div class="stats-grid">
      ${cards
        .map(
          (c) => `
        <div class="stat-card">
          <div class="stat-icon">${c.icon.length > 2 ? c.icon : esc(c.icon)}</div>
          <span class="stat-value">${c.value}</span>
          <span class="stat-label">${esc(c.label)}</span>
        </div>`
        )
        .join('')}
    </div>

    <div class="section-two-col" style="margin-top:18px;">
      <div class="card">
        <h2 class="card-section-title">Modifiés récemment</h2>
        <div class="admin-table-wrap" style="border:none;box-shadow:none;">
          <table class="admin-table">
            <thead>
              <tr><th>Instrument</th><th>Séance</th><th>Catégorie</th><th>Mise à jour</th></tr>
            </thead>
            <tbody>
              ${recent
                .map(
                  (inst) => `
                <tr>
                  <td><div class="cell-identity"><strong>${esc(inst.name)}</strong><small>${esc(inst.slug)}</small></div></td>
                  <td>${inst.session ? esc(inst.session.name) : '<span class="muted">—</span>'}</td>
                  <td>${inst.category ? esc(inst.category.name) : '<span class="muted">—</span>'}</td>
                  <td class="muted">${fmtDate(inst.updatedAt)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2 class="card-section-title">Bases de données</h2>
        <p class="muted" style="font-size:13px;line-height:1.6;">
          La base Neon stocke <strong>${stats.instruments}</strong> instruments répartis sur
          <strong>${stats.categories}</strong> catégories et <strong>${stats.sessions}</strong> séances.
          <br><br>
          Schéma Prisma synchronisé · migrations appliquées via <span class="mono">prisma migrate deploy</span>.
        </p>
        <a class="btn-admin btn-admin-primary" href="#/instruments" style="margin-top:10px;">
          Gérer les instruments →
        </a>
      </div>
    </div>`;
}
