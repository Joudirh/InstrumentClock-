# Découverte du dépôt — Trading Academy

- **Stack et routage** : interface statique Vite, JavaScript ES modules et CSS sans framework. `index.html` est l’entrée principale. La navigation publique existante utilise des fragments (`#...`) et n’a pas de routeur côté client.
- **Serveur et données** : fonctions serverless Vercel dans `api/`, TypeScript, Prisma 7 et Neon Postgres. Les migrations sont gérées par Prisma; les données de secours du front se trouvent dans `js/data.js`. Les horaires et les instruments sont déjà accessibles par les API publiques.
- **Comptes** : authentification par cookie de session, tables `User` et `UserAuthToken`, API `/api/auth/*`; les API d’administration sont protégées par `requireAuth`. Le schéma utilisateur ne fournit pas encore de modèle de progression de formation.
- **Interface** : design system CSS commun dans `css/style.css`, variables de thème clair/sombre et navigation responsive. Les menus, boutons et cartes sont principalement construits en HTML/CSS natifs. L’internationalisation française, anglaise et arabe est gérée dans `js/i18n/`.
- **Domaine existant** : catégories Forex, Indices, Matières premières, Actions, Cryptomonnaies, ETF et Futures; séances et fenêtres de marché interprétées par `js/timezone.js` et `lib/market-hours.ts`.
- **Validation** : pas de suite de tests, de lint ou de script de typecheck déclaré dans `package.json`. `npm run build` valide la compilation Vite; un `npx tsc --noEmit` manuel est disponible mais inclut des fichiers générés.

## État de l’implémentation

L’entrée Formation reste sur l’application existante avec `/#apprendre`; ses sous-pages visuelles utilisent des fragments (`#apprendre/catalogue`, etc.). L’accueil et le catalogue des 71 cours sont disponibles. Les cours ne deviennent accessibles qu’après import Markdown, validation et publication par un administrateur.

L’administration réutilise `/dashboard#/academy`, la garde `requireRole(..., "ADMIN")` et le routeur regroupé `/api/admin/academy`. La migration Prisma `20261101100000_add_academy_courses` stocke les brouillons, les cours publiés, le Markdown source, la structure pédagogique JSON et l’identité de l’administrateur vérificateur. L’API publique `/api/academy` ne divulgue que les métadonnées et le texte des leçons; les quiz, leurs réponses et l’examen restent privés.

Le format d’import et ses limites sont documentés dans `IMPORT_FORMAT.md`. La validation se fait côté serveur; la publication exige une confirmation de relecture et une nouvelle validation. Appliquer la migration avec `npm run db:deploy` ou, pour une base de développement locale, `npm run db:push` après configuration des variables Neon.

Le suivi de progression, les quiz interactifs, les récompenses, le glossaire dynamique et les API utilisateur restent hors de ce lot. Aucun XP, score ou avancement fictif n’est calculé.
