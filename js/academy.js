import { ACADEMY_CATALOG } from '../lib/academy-catalog.js';
import { renderAcademyMarkdown } from './academy-markdown.js';

const paths = [
  { code: 'A1', domain: 'A', title: 'Démarrer en trading', category: 'all' },
  { code: 'B1', domain: 'B', title: 'Analyse technique', category: 'all' },
  { code: 'C1', domain: 'C', title: 'Analyse fondamentale et macro', category: 'all' },
  { code: 'D1', domain: 'D', title: 'Risque et capital', category: 'all' },
  { code: 'E1', domain: 'E', title: 'Psychologie et discipline', category: 'all' },
  { code: 'F1', domain: 'F', title: 'Stratégie et méthode', category: 'all' },
  { code: 'G1', domain: 'G', title: 'Forex : de zéro à confirmé', category: 'forex' },
  { code: 'G2', domain: 'G', title: 'Indices : comprendre et trader', category: 'indices' },
  { code: 'G3', domain: 'G', title: 'Matières premières', category: 'commodities' },
  { code: 'G4', domain: 'G', title: 'Actions : comprendre les marchés', category: 'stocks' },
  { code: 'G5', domain: 'G', title: 'Cryptomonnaies', category: 'crypto' },
  { code: 'G6', domain: 'G', title: 'ETF : comprendre et construire', category: 'etf' },
  { code: 'G7', domain: 'G', title: 'Futures : contrats à terme', category: 'futures' },
  { code: 'H1', domain: 'H', title: 'Avancé et professionnel', category: 'all' }
];

const domains = [
  { code: 'A', title: 'Fondamentaux', description: 'Les bases pour comprendre les marchés, leurs acteurs et leur fonctionnement.', icon: '◈' },
  { code: 'B', title: 'Analyse technique', description: 'Lire les graphiques, repérer les structures et comprendre les indicateurs.', icon: '⌁' },
  { code: 'C', title: 'Analyse fondamentale et macro', description: 'Décoder les données économiques, les banques centrales et le sentiment.', icon: '◷' },
  { code: 'D', title: 'Risque et capital', description: 'Comprendre le risque, la taille des positions et la gestion du capital.', icon: '◇' },
  { code: 'E', title: 'Psychologie et discipline', description: 'Développer des routines, reconnaître ses biais et tenir un journal.', icon: '◎' },
  { code: 'F', title: 'Stratégie et méthode', description: 'Construire, tester et améliorer une méthode de trading.', icon: '↗' },
  { code: 'G', title: 'Par catégorie d’instrument', description: 'Des parcours dédiés aux sept catégories de marchés de Trading Sessions Hub.', icon: '◉' },
  { code: 'H', title: 'Avancé et professionnel', description: 'Explorer les produits dérivés, les portefeuilles et les pratiques professionnelles.', icon: '✳' }
];

const categories = [
  { id: 'forex', label: 'Forex', icon: '💱' },
  { id: 'indices', label: 'Indices', icon: '📊' },
  { id: 'commodities', label: 'Matières premières', icon: '🪙' },
  { id: 'stocks', label: 'Actions', icon: '🏢' },
  { id: 'crypto', label: 'Cryptomonnaies', icon: '₿' },
  { id: 'etf', label: 'ETF', icon: '🧺' },
  { id: 'futures', label: 'Futures', icon: '📈' }
];

const seedCourses = ACADEMY_CATALOG.map((course) => {
  const path = paths.find((item) => item.code === course.path);
  const domain = domains.find((item) => item.code === course.domain);
  return { ...course, path, domain, status: 'coming_soon' };
});

const menuItems = [
  { route: 'home', label: 'Accueil', icon: '⌂' },
  { route: 'catalogue', label: 'Catalogue', icon: '▦' },
  { route: 'plan', label: 'Mon plan', icon: '☷' },
  { route: 'progression', label: 'Ma progression', icon: '◔' },
  { route: 'recompenses', label: 'Récompenses', icon: '✧' },
  { route: 'reviser', label: 'Réviser', icon: '↻' },
  { route: 'glossaire', label: 'Glossaire', icon: 'Aa' },
  { route: 'outils', label: 'Outils', icon: '⌘' },
  { route: 'favoris', label: 'Favoris et notes', icon: '♡' }
];

const emptyPages = {
  plan: {
    eyebrow: 'VOTRE FEUILLE DE ROUTE',
    title: 'Mon plan',
    description: 'Choisissez des parcours dans le catalogue pour construire votre ordre d’apprentissage.',
    emptyTitle: 'Votre plan commence ici',
    emptyText: 'Les parcours que vous choisirez apparaîtront ici. Le suivi personnalisé sera disponible avec votre profil de formation.'
  },
  progression: {
    eyebrow: 'VOTRE APPRENTISSAGE',
    title: 'Ma progression',
    description: 'Retrouvez ici vos cours, votre maîtrise et votre activité.',
    emptyTitle: 'Votre tableau de bord se prépare',
    emptyText: 'Le score, l’activité et les résultats de quiz seront affichés ici une fois le suivi de cours activé.'
  },
  recompenses: {
    eyebrow: 'VOS ÉTAPES',
    title: 'Récompenses',
    description: 'Les badges et certificats valoriseront votre apprentissage, sans promesse de résultat financier.',
    emptyTitle: 'Les récompenses arrivent avec le suivi',
    emptyText: 'Les XP, niveaux, badges et certificats seront attribués à partir de vos activités de formation.'
  },
  reviser: {
    eyebrow: 'MÉMORISER DURABLEMENT',
    title: 'Réviser',
    description: 'Retrouvez les notions et questions à revoir selon un calendrier espacé.',
    emptyTitle: 'Aucune révision pour le moment',
    emptyText: 'Les notions à revoir apparaîtront ici après vos leçons et vos quiz.'
  },
  glossaire: {
    eyebrow: 'LES MOTS DU TRADING',
    title: 'Glossaire',
    description: 'Un glossaire relié aux cours vous aidera à retrouver les notions importantes.',
    emptyTitle: 'Le glossaire est en préparation',
    emptyText: 'Les définitions seront reliées aux leçons et aux catégories d’instruments.'
  },
  outils: {
    eyebrow: 'APPRENDRE EN PRATIQUANT',
    title: 'Outils pédagogiques',
    description: 'Des calculateurs et simulateurs aideront à appliquer les notions étudiées.',
    emptyTitle: 'Les outils sont en préparation',
    emptyText: 'Les calculateurs pédagogiques seront proposés avec les cours correspondants. Ils ne constituent pas des recommandations de trading.'
  },
  favoris: {
    eyebrow: 'VOTRE BIBLIOTHÈQUE',
    title: 'Favoris et notes',
    description: 'Retrouvez les leçons enregistrées et vos notes personnelles.',
    emptyTitle: 'Votre bibliothèque est vide',
    emptyText: 'Vous pourrez enregistrer des leçons et y ajouter des notes lorsque les contenus seront disponibles.'
  }
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

let publishedCourses = [];
let publishedCoursesLoaded = false;
let renderToken = 0;

const catalogCourses = () => {
  const publishedByCode = new Map(publishedCourses.map((course) => [course.code, course]));
  const knownCodes = new Set(seedCourses.map((course) => course.code));
  return [
    ...seedCourses.map((course) => publishedByCode.get(course.code) || course),
    ...publishedCourses.filter((course) => !knownCodes.has(course.code))
  ];
};

const loadPublishedCourses = async () => {
  if (publishedCoursesLoaded) return;
  const response = await fetch('/api/academy', { credentials: 'same-origin' });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('La réponse du catalogue de formation est illisible.');
  }
  if (!response.ok) throw new Error(data?.error || `Erreur ${response.status} lors du chargement des cours publiés.`);
  if (!Array.isArray(data?.courses)) throw new Error('Le catalogue de formation renvoie un format inattendu.');
  publishedCourses = data.courses.map((course) => {
    const path = paths.find((item) => item.code === course.path);
    const domain = domains.find((item) => item.code === course.domain);
    if (!path || !domain) throw new Error(`Le cours ${course.code} référence un parcours inconnu.`);
    return { ...course, path, domain, status: 'published' };
  });
  publishedCoursesLoaded = true;
};

const courseCard = (course) => `
  <article class="academy-course-card">
    <div class="academy-course-card-top">
      <span class="academy-course-code">${escapeHtml(course.code)}</span>
      <span class="academy-status${course.status === 'published' ? ' academy-status-published' : ''}">${course.status === 'published' ? 'Publié · vérifié' : 'Bientôt disponible'}</span>
    </div>
    <h3>${escapeHtml(course.title)}</h3>
    <p class="academy-course-path">${escapeHtml(course.path.title)}</p>
    <div class="academy-course-meta">
      <span class="academy-level level-${course.level.toLowerCase()}">${escapeHtml(course.level)}</span>
      <span>${escapeHtml(course.domain.title)}</span>
    </div>
    ${course.status === 'published'
    ? `<a class="academy-course-action academy-course-open" href="#apprendre/cours/${encodeURIComponent(course.slug)}">Ouvrir le cours <span aria-hidden="true">→</span></a>`
    : `<button class="academy-course-action" type="button" disabled aria-label="${escapeHtml(course.title)} : bientôt disponible">Contenu en préparation <span aria-hidden="true">↗</span></button>`}
  </article>
`;

const pathCount = (pathCode) => seedCourses.filter((course) => course.path.code === pathCode).length;

export const setupAcademy = (root, navigate) => {
  const filters = { search: '', category: 'all', level: 'all', status: 'all', domain: 'all' };

  const navMarkup = (activeRoute) => menuItems.map((item) => `
    <a class="academy-side-link${activeRoute === item.route ? ' is-active' : ''}"
      href="#apprendre${item.route === 'home' ? '' : `/${item.route}`}"
      ${activeRoute === item.route ? 'aria-current="page"' : ''}>
      <span class="academy-side-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `).join('');

  const pageShell = (route, content) => `
    <div class="academy-layout">
      <aside class="academy-sidebar" aria-label="Navigation Formation">
        <div class="academy-sidebar-heading">
          <span class="academy-sidebar-mark" aria-hidden="true">✦</span>
          <div><strong>Trading Academy</strong><small>Apprendre à son rythme</small></div>
        </div>
        <nav class="academy-side-nav">${navMarkup(route)}</nav>
        <div class="academy-sidebar-note">
          <span aria-hidden="true">ⓘ</span>
          <p>Un espace pédagogique, pas un conseil en investissement.</p>
        </div>
      </aside>
      <div class="academy-content">${content}</div>
    </div>
  `;

  const renderDashboard = () => `
    <div class="academy-eyebrow"><span class="academy-live-dot"></span> TRADING ACADEMY</div>
    <section class="academy-hero">
      <div class="academy-hero-copy">
        <p class="academy-kicker">Comprendre avant d’agir</p>
        <h1>Le trading s’apprend.<br><span>Une étape à la fois.</span></h1>
        <p class="academy-hero-description">Des parcours progressifs pour comprendre les marchés, maîtriser les concepts et développer une méthode adaptée à votre niveau.</p>
        <div class="academy-hero-actions">
          <a class="academy-button academy-button-primary" href="#apprendre/catalogue">Explorer le catalogue <span aria-hidden="true">→</span></a>
          <a class="academy-button academy-button-quiet" href="#apprendre/plan">Construire mon plan</a>
        </div>
      </div>
      <div class="academy-hero-art" aria-hidden="true">
        <div class="academy-orbit academy-orbit-outer"></div>
        <div class="academy-orbit academy-orbit-inner"></div>
        <div class="academy-hero-symbol">↗</div>
        <span class="academy-orbit-label academy-orbit-label-one">APPRENDRE</span>
        <span class="academy-orbit-label academy-orbit-label-two">PROGRESSER</span>
      </div>
    </section>

    <section class="academy-stats" aria-label="La formation en chiffres">
      <div><strong>08</strong><span>domaines</span></div>
      <div><strong>14</strong><span>parcours</span></div>
      <div><strong>71</strong><span>cours structurés</span></div>
      <div class="academy-stats-note"><span class="academy-status-dot"></span> Contenus publiés progressivement</div>
    </section>

    <section class="academy-section">
      <div class="academy-section-heading">
        <div><p class="academy-kicker">TROUVEZ VOTRE POINT DE DÉPART</p><h2>Apprendre par catégorie</h2></div>
        <a href="#apprendre/catalogue" class="academy-text-link">Voir le catalogue <span aria-hidden="true">→</span></a>
      </div>
      <div class="academy-category-grid">
        ${categories.map((category) => {
          const path = paths.find((item) => item.category === category.id);
          return `<button type="button" class="academy-category-card" data-academy-category="${category.id}">
            <span class="academy-category-icon" aria-hidden="true">${category.icon}</span>
            <span class="academy-category-name">${category.label}</span>
            <span class="academy-category-count">${pathCount(path.code)} cours <span aria-hidden="true">↗</span></span>
          </button>`;
        }).join('')}
      </div>
    </section>

    <section class="academy-section">
      <div class="academy-section-heading">
        <div><p class="academy-kicker">UN PARCOURS CLAIR, DES BASES À L’AVANCÉ</p><h2>Explorez les domaines</h2></div>
        <span class="academy-muted">${domains.length} domaines · ${paths.length} parcours</span>
      </div>
      <div class="academy-domain-grid">
        ${domains.map((domain) => {
          const domainPaths = paths.filter((path) => path.domain === domain.code);
          const count = seedCourses.filter((course) => course.domain.code === domain.code).length;
          return `<button type="button" class="academy-domain-card" data-academy-domain="${domain.code}">
            <span class="academy-domain-icon" aria-hidden="true">${domain.icon}</span>
            <span class="academy-domain-count">${String(count).padStart(2, '0')} cours</span>
            <h3>${domain.title}</h3>
            <p>${domain.description}</p>
            <span class="academy-domain-paths">${domainPaths.map((path) => path.title).join(' · ')}</span>
          </button>`;
        }).join('')}
      </div>
    </section>

    <section class="academy-learning-note">
      <span class="academy-note-icon" aria-hidden="true">✦</span>
      <div><strong>Votre progression reste la vôtre.</strong><p>Le suivi personnalisé, les quiz et les récompenses seront activés avec les contenus de formation.</p></div>
      <a href="#apprendre/progression" class="academy-text-link">En savoir plus <span aria-hidden="true">→</span></a>
    </section>
    <p class="academy-disclaimer">Contenu éducatif uniquement. Le trading comporte des risques de perte en capital. Aucun contenu ne constitue un conseil en investissement ni une promesse de gains.</p>
  `;

  const renderCatalogResults = () => {
    const query = filters.search.trim().toLocaleLowerCase('fr');
    const filteredCourses = catalogCourses().filter((course) => {
      const matchesSearch = !query || `${course.code} ${course.title} ${course.path.title} ${course.domain.title}`.toLocaleLowerCase('fr').includes(query);
      const matchesCategory = filters.category === 'all' || course.path.category === filters.category;
      const matchesLevel = filters.level === 'all' || course.level === filters.level;
      const matchesDomain = filters.domain === 'all' || course.domain.code === filters.domain;
      const matchesStatus = filters.status === 'all' || course.status === filters.status;
      return matchesSearch && matchesCategory && matchesLevel && matchesDomain && matchesStatus;
    });

    const count = root.querySelector('[data-catalog-count]');
    const grid = root.querySelector('[data-catalog-grid]');
    if (!count || !grid) return;
    count.textContent = `${filteredCourses.length} cours`;
    grid.innerHTML = filteredCourses.length
      ? filteredCourses.map(courseCard).join('')
      : `<div class="academy-empty-result"><span aria-hidden="true">⌕</span><strong>Aucun cours ne correspond à ces filtres.</strong><button type="button" data-reset-filters>Réinitialiser les filtres</button></div>`;
  };

  const renderCatalog = () => `
    <div class="academy-page-heading">
      <div><p class="academy-kicker">LES PARCOURS DE FORMATION</p><h1>Catalogue</h1><p>Explorez les domaines et choisissez les sujets que vous souhaitez apprendre.</p></div>
      <span class="academy-catalog-total">${seedCourses.length}<small>cours prévus</small></span>
    </div>
    <section class="academy-catalog-panel">
      <div class="academy-filter-row">
        <label class="academy-search"><span aria-hidden="true">⌕</span><span class="academy-sr-only">Rechercher un cours</span>
          <input type="search" data-catalog-search placeholder="Rechercher un cours, un domaine…" value="${escapeHtml(filters.search)}">
        </label>
        <label class="academy-filter-select"><span class="academy-sr-only">Catégorie d’instrument</span>
          <select data-catalog-category aria-label="Catégorie d’instrument">
            <option value="all">Toutes les catégories</option>
            ${categories.map((item) => `<option value="${item.id}" ${filters.category === item.id ? 'selected' : ''}>${item.label}</option>`).join('')}
          </select>
        </label>
        <label class="academy-filter-select"><span class="academy-sr-only">Niveau</span>
          <select data-catalog-level aria-label="Niveau">
            <option value="all">Tous les niveaux</option>
            ${['Débutant', 'Intermédiaire', 'Avancé', 'Expert'].map((level) => `<option value="${level}" ${filters.level === level ? 'selected' : ''}>${level}</option>`).join('')}
          </select>
        </label>
        <label class="academy-filter-select"><span class="academy-sr-only">Type de contenu</span>
          <select aria-label="Type de contenu" disabled title="Disponible lorsque les leçons seront publiées">
            <option>Type de contenu à venir</option>
          </select>
        </label>
        <label class="academy-filter-select"><span class="academy-sr-only">Durée estimée</span>
          <select aria-label="Durée estimée" disabled title="Disponible lorsque les durées des leçons seront renseignées">
            <option>Durée à venir</option>
          </select>
        </label>
        <label class="academy-filter-select"><span class="academy-sr-only">Statut de publication</span>
          <select data-catalog-status aria-label="Statut de publication">
            <option value="all">Tous les statuts</option>
              <option value="published" ${filters.status === 'published' ? 'selected' : ''}>Publié</option>
              <option value="coming_soon" ${filters.status === 'coming_soon' ? 'selected' : ''}>Bientôt disponible</option>
            </select>
        </label>
      </div>
      ${filters.domain !== 'all' ? `<div class="academy-active-filter">Domaine : ${domains.find((item) => item.code === filters.domain).title}<button type="button" data-clear-domain aria-label="Retirer le filtre de domaine">×</button></div>` : ''}
      <div class="academy-results-heading"><h2>Les cours</h2><span data-catalog-count></span></div>
      <div class="academy-course-grid" data-catalog-grid></div>
    </section>
    <p class="academy-disclaimer">Les cours affichés « Bientôt disponible » ne sont pas encore accessibles. Contenu éducatif uniquement, sans conseil en investissement.</p>
  `;

  const renderEmptyPage = (route) => {
    const page = emptyPages[route] || emptyPages.plan;
    return `
      <div class="academy-page-heading">
        <div><p class="academy-kicker">${page.eyebrow}</p><h1>${page.title}</h1><p>${page.description}</p></div>
      </div>
      <section class="academy-empty-panel">
        <div class="academy-empty-illustration" aria-hidden="true">✦</div>
        <h2>${page.emptyTitle}</h2><p>${page.emptyText}</p>
        <a class="academy-button academy-button-primary" href="#apprendre/catalogue">Découvrir les cours <span aria-hidden="true">→</span></a>
      </section>
      <p class="academy-disclaimer">Contenu éducatif uniquement. Le trading comporte des risques de perte en capital.</p>
    `;
  };

  const renderCoursePage = async (slug, token) => {
    try {
      const response = await fetch(`/api/academy?slug=${encodeURIComponent(slug)}`, { credentials: 'same-origin' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `Erreur ${response.status} lors du chargement du cours.`);
      const course = data?.course;
      if (!course || course.slug !== slug || !Array.isArray(course.modules)) {
        throw new Error('Le contenu du cours est incomplet ou invalide.');
      }
      if (token !== renderToken) return;
      const content = `
        <div class="academy-course-breadcrumb"><a href="#apprendre/catalogue">Catalogue</a><span> / </span>${escapeHtml(course.path)}<span> / </span>${escapeHtml(course.code)}</div>
        <header class="academy-course-heading">
          <div><p class="academy-kicker">${escapeHtml(course.path)} · ${escapeHtml(course.level)}</p>
            <h1>${escapeHtml(course.title)}</h1><p>${escapeHtml(course.summary)}</p></div>
          <span class="academy-course-duration">${course.estimatedMinutes} min<small>de contenu</small></span>
        </header>
        <section class="academy-objectives"><h2>À la fin de ce cours, vous pourrez</h2><ul>${course.objectives.map((objective) => `<li>${escapeHtml(objective)}</li>`).join('')}</ul></section>
        <div class="academy-course-outline">
          ${course.modules.map((module, moduleIndex) => `
            <section class="academy-course-module">
              <div class="academy-module-heading"><span>MODULE ${String(moduleIndex + 1).padStart(2, '0')}</span><h2>${escapeHtml(module.title)}</h2></div>
              ${module.lessons.map((lesson) => `
                <article class="academy-lesson">
                  <div class="academy-lesson-heading"><h3>${escapeHtml(lesson.title)}</h3><span>${lesson.minutes} min</span></div>
                  <div class="academy-lesson-body">${renderAcademyMarkdown(lesson.body)}</div>
                </article>`).join('')}
            </section>`).join('')}
        </div>
        <p class="academy-disclaimer">Contenu éducatif uniquement. Le trading comporte des risques de perte en capital. Aucun contenu ne constitue un conseil en investissement ni une promesse de gains.</p>
      `;
      root.querySelector('.academy-content').innerHTML = content;
    } catch (error) {
      if (token !== renderToken) return;
      root.querySelector('.academy-content').innerHTML = `<section class="academy-empty-panel"><div class="academy-empty-illustration" aria-hidden="true">!</div><h2>Impossible d’ouvrir ce cours</h2><p>${escapeHtml(error.message)}</p><a class="academy-button academy-button-primary" href="#apprendre/catalogue">Retour au catalogue</a></section>`;
    }
  };

  const render = (route = 'home') => {
    const token = ++renderToken;
    const courseMatch = route.match(/^cours\/([a-z0-9-]+)$/);
    const validRoute = courseMatch ? 'catalogue'
      : route === 'catalogue' || emptyPages[route] ? route : 'home';
    const content = validRoute === 'home' ? renderDashboard()
      : validRoute === 'catalogue' ? renderCatalog()
        : renderEmptyPage(validRoute);
    root.innerHTML = pageShell(validRoute, content);
    if (validRoute === 'catalogue' && !courseMatch) {
      renderCatalogResults();
      loadPublishedCourses().then(() => {
        if (token !== renderToken) return;
        renderCatalogResults();
      }).catch((error) => {
        if (token !== renderToken) return;
        const panel = root.querySelector('.academy-catalog-panel');
        const notice = document.createElement('p');
        notice.className = 'academy-catalog-error';
        notice.setAttribute('role', 'status');
        notice.textContent = `Les cours déjà publiés n’ont pas pu être chargés : ${error.message}`;
        panel.prepend(notice);
      });
    } else if (courseMatch) {
      root.querySelector('.academy-content').innerHTML = '<div class="academy-loading" role="status">Chargement du cours…</div>';
      void renderCoursePage(decodeURIComponent(courseMatch[1]), token);
    }
  };

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-catalog-search]')) {
      filters.search = event.target.value;
      renderCatalogResults();
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-catalog-category]')) filters.category = event.target.value;
    if (event.target.matches('[data-catalog-level]')) filters.level = event.target.value;
    if (event.target.matches('[data-catalog-status]')) filters.status = event.target.value;
    if (event.target.matches('[data-catalog-category], [data-catalog-level], [data-catalog-status]')) renderCatalogResults();
  });

  root.addEventListener('click', (event) => {
    const categoryButton = event.target.closest('[data-academy-category]');
    if (categoryButton) {
      filters.category = categoryButton.dataset.academyCategory;
      filters.domain = 'all';
      navigate('catalogue');
      return;
    }

    const domainButton = event.target.closest('[data-academy-domain]');
    if (domainButton) {
      filters.domain = domainButton.dataset.academyDomain;
      filters.category = 'all';
      navigate('catalogue');
      return;
    }

    if (event.target.closest('[data-reset-filters]')) {
      filters.search = '';
      filters.category = 'all';
      filters.level = 'all';
      filters.status = 'all';
      filters.domain = 'all';
      render('catalogue');
      root.querySelector('[data-catalog-search]')?.focus();
    }

    if (event.target.closest('[data-clear-domain]')) {
      filters.domain = 'all';
      render('catalogue');
    }
  });

  return { render };
};
