import { api, esc, toast } from '../common.js';

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
const formatDate = (value) => value
  ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

function statusLabel(status) {
  if (status === 'PUBLISHED') return 'Publié';
  if (status === 'DRAFT') return 'Brouillon';
  return 'Bientôt disponible';
}

function statusClass(status) {
  if (status === 'PUBLISHED') return 'is-published';
  if (status === 'DRAFT') return 'is-draft';
  return 'is-empty';
}

function renderRows(courses) {
  return courses.map((course) => `
    <tr>
      <td><div class="cell-identity"><strong>${esc(course.title)}</strong><small>${esc(course.code)} · ${esc(course.slug)}</small></div></td>
      <td>${esc(course.path)} · ${esc(course.domain)}</td>
      <td><span class="academy-admin-status ${statusClass(course.status)}">${statusLabel(course.status)}</span>${course.version ? `<small class="academy-admin-version">Version ${course.version}</small>` : ''}</td>
      <td>${course.verifiedBy ? esc(course.verifiedBy.name) : '—'}<small class="academy-admin-version">${formatDate(course.updatedAt)}</small></td>
      <td><button class="btn-admin btn-admin-primary academy-open-btn" type="button" data-open-course="${esc(course.code)}">${course.status === 'EMPTY' ? 'Générer' : course.status === 'DRAFT' ? 'Traiter' : 'Consulter'}</button></td>
    </tr>`).join('');
}

function renderList(content, courses) {
  const counts = courses.reduce((result, course) => {
    result[course.status] = (result[course.status] || 0) + 1;
    return result;
  }, {});
  content.innerHTML = `
    <section class="academy-admin-intro">
      <div>
        <p class="academy-admin-eyebrow">TRADING ACADEMY</p>
        <h2>Gestion et génération des cours</h2>
        <p>Choisissez un cours pour le générer avec Gemini, modifier son brouillon, le vérifier ou le publier.</p>
      </div>
      <a class="btn-admin btn-admin-ghost" href="/#apprendre" target="_blank" rel="noreferrer">Voir la page Formation ↗</a>
    </section>
    <section class="academy-admin-stats" aria-label="État des cours">
      <span>${courses.length} cours au catalogue</span>
      <span>${counts.EMPTY || 0} à générer</span>
      <span>${counts.DRAFT || 0} brouillons</span>
      <span>${counts.PUBLISHED || 0} publiés</span>
    </section>
    <section class="card academy-admin-list">
      <div class="academy-admin-card-heading">
        <div><h3>Catalogue des cours</h3><p class="muted">Les cours non générés restent « Bientôt disponible » dans le catalogue public.</p></div>
        <input class="academy-search" id="academy-course-search" type="search" placeholder="Rechercher un cours…" aria-label="Rechercher un cours">
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Cours</th><th>Parcours</th><th>État</th><th>Vérifié par / modifié</th><th>Action</th></tr></thead>
          <tbody id="academy-course-rows">${renderRows(courses)}</tbody>
        </table>
      </div>
    </section>`;

  const search = content.querySelector('#academy-course-search');
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('fr');
    const filtered = courses.filter((course) =>
      `${course.code} ${course.title} ${course.path} ${course.domain} ${statusLabel(course.status)}`
        .toLocaleLowerCase('fr')
        .includes(query));
    content.querySelector('#academy-course-rows').innerHTML = renderRows(filtered);
    bindCourseButtons(content);
  });
  bindCourseButtons(content);
}

function bindCourseButtons(content) {
  content.querySelectorAll('[data-open-course]').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.hash = `academy?course=${encodeURIComponent(button.dataset.openCourse)}`;
    });
  });
}

function courseEditor(course) {
  const isEmpty = course.status === 'EMPTY';
  const isDraft = course.status === 'DRAFT';
  const objectives = Array.isArray(course.objectives) ? course.objectives : [];
  return `
    <section class="academy-admin-intro">
      <div>
        <p class="academy-admin-eyebrow">${esc(course.code)} · ${esc(course.path)} · ${esc(course.domain)}</p>
        <h2>${esc(course.title)}</h2>
        <p><span class="academy-admin-status ${statusClass(course.status)}">${statusLabel(course.status)}</span>
          ${course.version ? ` · Version ${course.version}` : ''}${course.updatedAt ? ` · Modifié le ${formatDate(course.updatedAt)}` : ''}</p>
      </div>
      <button class="btn-admin btn-admin-ghost" id="academy-back" type="button">← Retour à la liste</button>
    </section>
    <section class="card academy-generator">
      <div class="academy-admin-card-heading">
        <div><h3>${isEmpty ? 'Générer le cours' : isDraft ? 'Modifier et vérifier le brouillon' : 'Cours publié'}</h3>
          <p class="muted">${isEmpty
            ? 'Les métadonnées du catalogue sont préremplies. Ajoutez éventuellement des consignes, puis générez le brouillon.'
            : isDraft
              ? 'Relisez et modifiez le Markdown complet avant de publier.'
              : 'Ce cours est publié et visible dans le catalogue.'}</p>
        </div>
      </div>
      ${isEmpty ? `
        <div class="academy-generator-fields">
          <label class="academy-field">Titre du cours
            <input id="academy-title" type="text" maxlength="160" required value="${esc(course.title)}">
          </label>
          <label class="academy-field">Niveau
            <select id="academy-level">${LEVELS.map((level) => `<option value="${esc(level)}" ${level === course.level ? 'selected' : ''}>${esc(level)}</option>`).join('')}</select>
          </label>
        </div>
        <label class="academy-field">Consignes complémentaires <span class="muted">(facultatif, 2 000 caractères maximum)</span>
          <textarea id="academy-instructions" maxlength="2000" rows="5" placeholder="Ex. Insister sur les risques de levier et donner un exercice de calcul sans conseil d’investissement."></textarea>
        </label>
        <div class="academy-editor-actions">
          <button class="btn-admin btn-admin-ghost" id="academy-save-empty" type="button">Enregistrer les informations</button>
          <button class="btn-admin btn-admin-primary" id="academy-generate" type="button">Générer avec Gemini</button>
          <button class="btn-admin btn-admin-danger" id="academy-reset-empty" type="button" ${course.id ? '' : 'disabled title="Aucune personnalisation enregistrée à réinitialiser"'}>Réinitialiser</button>
        </div>
      ` : isDraft ? `
        <div class="academy-course-meta">
          <strong>${esc(course.code)} · ${esc(course.title)}</strong>
          <span>${esc(course.level)} · ${esc(course.path)} · ${esc(course.domain)}</span>
          ${course.summary ? `<p>${esc(course.summary)}</p>` : ''}
          ${objectives.length ? `<ul>${objectives.map((objective) => `<li>${esc(objective)}</li>`).join('')}</ul>` : ''}
        </div>
        <label class="academy-field">Contenu complet du cours (Markdown, quiz et corrigés inclus)
          <textarea id="academy-markdown" class="academy-markdown-editor" rows="28" spellcheck="false">${esc(course.sourceMarkdown)}</textarea>
        </label>
        <label class="academy-verify-check">
          <input id="academy-verify-check" type="checkbox">
          <span>J’ai relu le cours et vérifié le contenu, les réponses, les risques et l’absence de promesse de gains ou de conseil d’investissement.</span>
        </label>
        <div class="academy-editor-actions">
          <button class="btn-admin btn-admin-ghost" id="academy-save-draft" type="button">Enregistrer les modifications</button>
          <button class="btn-admin btn-admin-primary" id="academy-publish" type="button" disabled>Publier le cours</button>
          <button class="btn-admin btn-admin-danger" id="academy-delete-draft" type="button">Supprimer le brouillon</button>
        </div>
      ` : `
        <div class="academy-course-meta">
          <strong>${esc(course.code)} · ${esc(course.title)}</strong>
          <span>${esc(course.level)} · ${esc(course.path)} · ${esc(course.domain)}</span>
          ${course.summary ? `<p>${esc(course.summary)}</p>` : ''}
          ${objectives.length ? `<ul>${objectives.map((objective) => `<li>${esc(objective)}</li>`).join('')}</ul>` : ''}
        </div>
        <label class="academy-field">Contenu publié (lecture seule)
          <textarea class="academy-markdown-editor" rows="28" readonly spellcheck="false">${esc(course.sourceMarkdown)}</textarea>
        </label>
        <p class="muted">Publié le ${formatDate(course.publishedAt)}${course.verifiedBy?.name ? ` · Vérifié par ${esc(course.verifiedBy.name)}` : ''}</p>
      `}
      <div class="academy-import-error hidden" id="academy-course-error" role="alert"></div>
      <p class="academy-generation-progress hidden" id="academy-generation-progress" role="status">Gemini prépare et valide le cours. Cette opération peut prendre jusqu’à une minute…</p>
    </section>`;
}

async function renderCourse(content, code) {
  const { course } = await api('GET', `/api/admin/academy?code=${encodeURIComponent(code)}`);
  content.innerHTML = courseEditor(course);
  content.querySelector('#academy-back').addEventListener('click', () => {
    window.location.hash = 'academy';
  });

  const errorBox = content.querySelector('#academy-course-error');
  const showError = (error) => {
    errorBox.textContent = error.details?.length ? error.details.join('\n') : error.message;
    errorBox.classList.remove('hidden');
  };
  const report = async (button, action) => {
    button.disabled = true;
    errorBox.classList.add('hidden');
    try {
      await action();
    } catch (error) {
      showError(error);
      button.disabled = false;
    }
  };

  if (course.status === 'EMPTY') {
    const title = content.querySelector('#academy-title');
    const level = content.querySelector('#academy-level');
    const instructions = content.querySelector('#academy-instructions');
    content.querySelector('#academy-save-empty').addEventListener('click', (event) => {
      report(event.currentTarget, async () => {
        await api('POST', '/api/admin/academy', { action: 'edit-empty', code, title: title.value, level: level.value });
        toast('Informations du cours enregistrées.');
        await renderCourse(content, code);
      });
    });
    content.querySelector('#academy-generate').addEventListener('click', (event) => {
      const button = event.currentTarget;
      const progress = content.querySelector('#academy-generation-progress');
      report(button, async () => {
        progress.classList.remove('hidden');
        const result = await api('POST', '/api/admin/academy', {
          action: 'generate',
          code,
          title: title.value,
          level: level.value,
          instructions: instructions.value,
        });
        toast('Cours généré et enregistré comme brouillon.');
        await renderCourse(content, result.course.code);
      }).finally(() => progress.classList.add('hidden'));
    });
    content.querySelector('#academy-reset-empty').addEventListener('click', (event) => {
      if (!window.confirm('Réinitialiser ce cours ? Ses informations personnalisées seront supprimées et il réapparaîtra comme « Bientôt disponible ».')) return;
      report(event.currentTarget, async () => {
        await api('POST', '/api/admin/academy', { action: 'reset-empty', code });
        toast('Cours réinitialisé.');
        await renderCourse(content, code);
      });
    });
  } else if (course.status === 'DRAFT') {
    const markdown = content.querySelector('#academy-markdown');
    const confirmation = content.querySelector('#academy-verify-check');
    const publish = content.querySelector('#academy-publish');
    confirmation.addEventListener('change', () => { publish.disabled = !confirmation.checked; });
    content.querySelector('#academy-save-draft').addEventListener('click', (event) => {
      report(event.currentTarget, async () => {
        await api('POST', '/api/admin/academy', { action: 'edit-draft', id: course.id, markdown: markdown.value });
        toast('Modifications enregistrées dans le brouillon.');
        await renderCourse(content, code);
      });
    });
    publish.addEventListener('click', (event) => {
      if (!confirmation.checked || !window.confirm('Confirmez-vous avoir relu et vérifié tout le cours avant sa publication ?')) return;
      report(event.currentTarget, async () => {
        await api('POST', '/api/admin/academy', { action: 'edit-draft', id: course.id, markdown: markdown.value });
        await api('POST', '/api/admin/academy', { action: 'publish', id: course.id, verified: true });
        toast('Cours publié et vérifié.');
        await renderCourse(content, code);
      });
    });
    content.querySelector('#academy-delete-draft').addEventListener('click', (event) => {
      if (!window.confirm('Supprimer ce brouillon ? Le cours reviendra à l’état « Bientôt disponible ».')) return;
      report(event.currentTarget, async () => {
        await api('POST', '/api/admin/academy', { action: 'delete-draft', id: course.id });
        toast('Brouillon supprimé.');
        await renderCourse(content, code);
      });
    });
  }
}

export async function render(content) {
  const query = window.location.hash.split('?')[1] || '';
  const code = new URLSearchParams(query).get('course');
  if (code) {
    await renderCourse(content, code);
    return;
  }
  const { courses } = await api('GET', '/api/admin/academy');
  renderList(content, courses);
}
