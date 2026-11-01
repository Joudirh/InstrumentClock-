import { api, esc, toast, ADMIN_ICONS } from '../common.js';

let markdown = '';
let validated = false;
let validationSummary = null;

const formatDate = (value) => new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function validationMarkup(summary) {
  if (!summary) return '';
  return `
    <div class="academy-import-preview">
      <div class="academy-import-preview-head">
        <span class="academy-import-success" aria-hidden="true">✓</span>
        <div><strong>Structure valide</strong><p>Relisez le résumé avant d’enregistrer le brouillon.</p></div>
      </div>
      <div class="academy-import-summary">
        <div><small>Code</small><strong>${esc(summary.code)}</strong></div>
        <div><small>Niveau</small><strong>${esc(summary.level)}</strong></div>
        <div><small>Modules</small><strong>${summary.moduleCount}</strong></div>
        <div><small>Leçons</small><strong>${summary.lessonCount}</strong></div>
        <div><small>Quiz / examen</small><strong>${summary.quizQuestionCount} / ${summary.examQuestionCount}</strong></div>
        <div><small>Durée</small><strong>${summary.estimatedMinutes} min</strong></div>
      </div>
      <h3>${esc(summary.title)}</h3>
      <p class="muted">${esc(summary.summary)}</p>
      <p class="academy-import-objectives"><strong>Objectifs</strong><br>${summary.objectives.map(esc).join('<br>')}</p>
      ${summary.existingStatus ? '<p class="academy-import-warning">Un brouillon avec ce code existe déjà. L’enregistrer remplacera sa version actuelle.</p>' : ''}
      <details class="academy-import-source"><summary>Examiner le Markdown complet et les réponses</summary><pre>${esc(markdown)}</pre></details>
      <label class="academy-verify-check">
        <input id="academy-verify-check" type="checkbox">
        <span>J’ai relu le contenu, vérifié les réponses et confirmé qu’il s’agit d’un contenu pédagogique sans conseil d’investissement ni promesse de gains.</span>
      </label>
      <div class="academy-import-actions">
        <button class="btn-admin btn-admin-primary" id="academy-save-draft" type="button">${ADMIN_ICONS.plus} Enregistrer le brouillon</button>
        <button class="btn-admin btn-admin-ghost" id="academy-publish-now" type="button" disabled>Publier comme vérifié</button>
      </div>
    </div>
  `;
}

function rowsMarkup(courses) {
  if (!courses.length) return '<tr><td class="empty-state" colspan="5">Aucun cours importé. Commencez par déposer un fichier Markdown.</td></tr>';
  return courses.map((course) => `
    <tr>
      <td><div class="cell-identity"><strong>${esc(course.title)}</strong><small>${esc(course.code)} · ${esc(course.slug)}</small></div></td>
      <td>${esc(course.path)} · ${esc(course.domain)}</td>
      <td><span class="academy-admin-status ${course.status === 'PUBLISHED' ? 'is-published' : 'is-draft'}">${course.status === 'PUBLISHED' ? 'Publié · vérifié' : 'Brouillon'}</span><small class="academy-admin-version">Version ${course.version}</small></td>
      <td>${course.verifiedBy ? esc(course.verifiedBy.name) : '—'}<small class="academy-admin-version">${formatDate(course.updatedAt)}</small></td>
      <td><div class="cell-actions">
        ${course.status === 'DRAFT' ? `<button class="btn-admin btn-admin-ghost academy-review-btn" type="button" data-review="${course.id}">Examiner</button><button class="btn-admin btn-admin-primary academy-publish-btn" type="button" data-publish="${course.id}">Publier</button><button class="icon-btn danger" type="button" data-delete="${course.id}" aria-label="Supprimer le brouillon ${esc(course.title)}" title="Supprimer">${ADMIN_ICONS.trash}</button>` : '<span class="muted">Visible au catalogue</span>'}
      </div></td>
    </tr>`).join('');
}

export async function render(content) {
  const { courses } = await api('GET', '/api/admin/academy');
  content.innerHTML = `
    <section class="academy-admin-intro">
      <div>
        <p class="academy-admin-eyebrow">IMPORT SÉCURISÉ DU CONTENU</p>
        <h2>Construire un cours à partir d’un fichier Markdown</h2>
        <p>Le fichier est contrôlé côté serveur. Il est enregistré en brouillon, puis un administrateur le relit et le publie explicitement.</p>
      </div>
      <a class="btn-admin btn-admin-ghost" href="/#apprendre" target="_blank" rel="noreferrer">Voir la page Formation ↗</a>
    </section>

    <section class="academy-admin-guide card">
      <h3>Format requis</h3>
      <p>En-tête YAML (code, slug, titre, domaine, parcours, niveau, résumé, objectifs), puis 4 à 7 modules. Chaque module contient 3 à 6 leçons de 5 à 12 minutes et un quiz de 8 questions minimum. L’examen final contient au moins 30 questions.</p>
      <a href="/docs/academy/IMPORT_FORMAT.md" target="_blank" rel="noreferrer">Consulter le format et le modèle Markdown</a>
    </section>

    <section class="academy-admin-import card">
      <div class="academy-admin-card-heading">
        <div><h3>1. Importer et valider</h3><p class="muted">Fichier .md, 512 Ko maximum. La validation ne publie rien.</p></div>
        <label class="btn-admin btn-admin-ghost academy-file-button" for="academy-file">${ADMIN_ICONS.plus} Choisir un fichier .md</label>
        <input id="academy-file" class="academy-file-input" type="file" accept=".md,text/markdown,text/plain">
      </div>
      <div class="academy-file-name" id="academy-file-name">Aucun fichier sélectionné</div>
      <div class="academy-import-error hidden" id="academy-import-error" role="alert"></div>
      <div id="academy-import-preview"></div>
    </section>

    <section class="card academy-admin-list">
      <div class="academy-admin-card-heading"><div><h3>2. Brouillons et cours publiés</h3><p class="muted">Seuls les cours publiés sont visibles dans le catalogue public.</p></div><span class="academy-admin-count">${courses.length} cours</span></div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Cours</th><th>Parcours</th><th>Statut</th><th>Vérifié par / modifié</th><th>Actions</th></tr></thead>
          <tbody id="academy-course-rows">${rowsMarkup(courses)}</tbody>
        </table>
      </div>
      <div id="academy-review-panel"></div>
    </section>
  `;

  const fileInput = content.querySelector('#academy-file');
  const fileName = content.querySelector('#academy-file-name');
  const errorBox = content.querySelector('#academy-import-error');
  const preview = content.querySelector('#academy-import-preview');

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  };
  const clearValidation = () => {
    validated = false;
    validationSummary = null;
    preview.innerHTML = '';
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  };

  fileInput.addEventListener('change', async () => {
    clearValidation();
    const file = fileInput.files?.[0];
    if (!file) {
      markdown = '';
      fileName.textContent = 'Aucun fichier sélectionné';
      return;
    }
    if (!file.name.toLowerCase().endsWith('.md')) {
      markdown = '';
      fileInput.value = '';
      fileName.textContent = 'Aucun fichier sélectionné';
      showError('Sélectionnez un fichier avec l’extension .md.');
      return;
    }
    if (file.size > 512 * 1024) {
      markdown = '';
      fileInput.value = '';
      fileName.textContent = 'Aucun fichier sélectionné';
      showError('Le fichier dépasse la limite de 512 Ko.');
      return;
    }
    try {
      markdown = await file.text();
    } catch (error) {
      markdown = '';
      fileName.textContent = 'Aucun fichier sélectionné';
      showError(`Impossible de lire le fichier : ${error.message}`);
      return;
    }
    fileName.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} Ko`;
    const validateButton = document.createElement('button');
    validateButton.type = 'button';
    validateButton.className = 'btn-admin btn-admin-primary academy-validate-button';
    validateButton.textContent = 'Valider le contenu';
    preview.appendChild(validateButton);
    validateButton.addEventListener('click', async () => {
      const sourceSnapshot = markdown;
      validateButton.disabled = true;
      try {
        const result = await api('POST', '/api/admin/academy', { action: 'validate', markdown: sourceSnapshot });
        if (markdown !== sourceSnapshot) {
          showError('Le fichier a changé pendant la validation. Validez de nouveau la version sélectionnée.');
          return;
        }
        validated = true;
        validationSummary = result.course;
        preview.innerHTML = validationMarkup(validationSummary);
        bindValidatedActions(sourceSnapshot);
      } catch (error) {
        showError(error.details?.length ? error.details.join('\n') : error.message);
      } finally {
        validateButton.disabled = false;
      }
    });
  });

  function bindValidatedActions(sourceSnapshot) {
    const checkbox = preview.querySelector('#academy-verify-check');
    const publishButton = preview.querySelector('#academy-publish-now');
    const saveButton = preview.querySelector('#academy-save-draft');
    checkbox.addEventListener('change', () => { publishButton.disabled = !checkbox.checked; });

    saveButton.addEventListener('click', async () => {
      if (!validated || !sourceSnapshot || markdown !== sourceSnapshot) return;
      saveButton.disabled = true;
      try {
        await api('POST', '/api/admin/academy', { action: 'draft', markdown: sourceSnapshot });
        toast('Brouillon enregistré.');
        await render(content);
      } catch (error) {
        showError(error.message);
        saveButton.disabled = false;
      }
    });

    publishButton.addEventListener('click', async () => {
      if (!validated || !checkbox.checked || markdown !== sourceSnapshot) return;
      publishButton.disabled = true;
      try {
        const result = await api('POST', '/api/admin/academy', { action: 'draft', markdown: sourceSnapshot });
        await api('POST', '/api/admin/academy', { action: 'publish', id: result.course.id, verified: true });
        toast('Cours publié et vérifié. Il est maintenant disponible dans le catalogue.');
        await render(content);
      } catch (error) {
        showError(error.message);
        publishButton.disabled = false;
      }
    });
  }

  content.querySelectorAll('[data-publish]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Confirmez-vous avoir relu et vérifié l’intégralité de ce cours ? Sa publication le rendra visible aux apprenants.')) return;
      button.disabled = true;
      try {
        await api('POST', '/api/admin/academy', { action: 'publish', id: Number(button.dataset.publish), verified: true });
        toast('Cours publié et vérifié.');
        await render(content);
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  });

  content.querySelectorAll('[data-review]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const { course } = await api('GET', `/api/admin/academy?id=${Number(button.dataset.review)}`);
        const panel = content.querySelector('#academy-review-panel');
        panel.innerHTML = `
          <section class="academy-review">
            <div class="academy-review-heading"><div><h3>Relecture : ${esc(course.code)} · ${esc(course.title)}</h3><p class="muted">Version ${course.version} · le Markdown source complet, quiz et réponses inclus.</p></div><button class="btn-admin btn-admin-ghost" type="button" data-close-review>Fermer</button></div>
            <pre>${esc(course.sourceMarkdown)}</pre>
          </section>`;
        panel.querySelector('[data-close-review]').addEventListener('click', () => { panel.innerHTML = ''; });
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        button.disabled = false;
      }
    });
  });

  content.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Supprimer ce brouillon ? Cette action est irréversible.')) return;
      button.disabled = true;
      try {
        await api('POST', '/api/admin/academy', { action: 'delete-draft', id: Number(button.dataset.delete) });
        toast('Brouillon supprimé.');
        await render(content);
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  });
}
