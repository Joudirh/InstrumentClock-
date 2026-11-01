# Prompt d'implémentation : module « Trading Academy » (page Formation)

Trading Sessions Hub · Version 1.0 · 1er novembre 2026

Mode d'emploi : collez l'intégralité de ce document dans votre agent IA de développement, avec accès au dépôt de l'application. Le texte s'adresse directement à l'agent.

## 1. Rôle et mission

Tu es un ingénieur full-stack senior doublé d'un concepteur pédagogique. Tu dois concevoir et implémenter dans l'application « Trading Sessions Hub » une nouvelle section **Formation** (« Trading Academy ») qui permet à n'importe quel utilisateur d'apprendre le trading, quelle que soit la catégorie d'instrument.

Tu livres :

1. une infrastructure de formation complète (données, API, interface) ;
2. une hiérarchie de navigation intuitive et pertinente ;
3. un système de suivi de cours, de récompenses et un score d'avancement ;
4. le catalogue complet des formations (structure) et un premier lot de contenus entièrement rédigés ;
5. les tests et la documentation.

### Contexte de l'application

- L'application gère des instruments de trading avec les champs : `name`, `description`, `category`, `session`, `trading_windows`, `optimal_windows`.
- Catégories existantes (7) : Forex, Indices, Matières Premières, Actions, Cryptomonnaies, ETF, Futures.
- Séances existantes : Sydney, Tokyo, Londres, New York, Chicago, Global 24/7.
- Les plages horaires suivent le format `1-5 08:00-17:00@Europe/London` (jours 1 = lundi à 7 = dimanche, fuseau IANA ou UTC).
- Les utilisateurs sont francophones (notamment en Tunisie). Langue par défaut : français. Prévois l'internationalisation (arabe et anglais possibles plus tard, y compris l'affichage de droite à gauche).
- Atout à exploiter : l'application possède déjà les données de séances et d'instruments. La formation doit s'y connecter (liens, exemples réels, outils).

### Règles de travail

1. Ne casse rien d'existant. Tout est livré derrière un feature flag `academy_enabled`.
2. Respecte la stack, l'architecture, les conventions de nommage, le design system, l'authentification et le système de migrations déjà en place. Ne réinvente pas ce qui existe.
3. Migrations réversibles, seeds idempotents, code testé.
4. Quand une décision n'est pas bloquante, prends-la, documente l'hypothèse dans `docs/academy/DECISIONS.md` et continue. Ne pose une question que si le blocage est réel.
5. Travaille par phases (section 12). Termine chaque phase avec ses critères d'acceptation avant de passer à la suivante.

### Principes pédagogiques (non négociables)

- **Progressif** : du débutant à l'expert, chaque notion s'appuie sur des prérequis explicites.
- **Micro-learning** : une leçon = une idée, 5 à 12 minutes.
- **Apprendre en faisant** : exemples chiffrés, exercices, outils interactifs, quiz avec explications.
- **Feedback immédiat** et révision espacée des erreurs.
- **Éducatif uniquement** : aucun conseil en investissement, aucune promesse de gains, avertissement sur les risques toujours visible (voir section 10).

## 2. Phase 0 : découverte du dépôt (avant d'écrire du code)

Analyse le dépôt puis résume dans `docs/academy/DISCOVERY.md` (une page) :

- stack front et back, base de données, ORM, système de migrations, routage ;
- authentification, rôles (existe-t-il un rôle admin ?), table des utilisateurs ;
- design system et composants réutilisables (cartes, onglets, modales, toasts, graphiques) ;
- modèles existants (instruments, catégories, séances) et manière dont les plages horaires sont stockées et interprétées ;
- navigation actuelle (menu principal, mobile), thème clair/sombre, i18n ;
- outils de test et de CI.

Termine par un plan d'implémentation adapté à la stack et la liste de tes hypothèses.

## 3. Architecture de l'information (hiérarchie)

La hiérarchie à six niveaux ci-dessous structure tout le module (base de données, URL, navigation, score).

| Niveau | Définition | Exemple | Volume cible |
| --- | --- | --- | --- |
| Domaine | Grand thème de formation | Analyse technique | 8 |
| Parcours | Suite ordonnée de cours vers un objectif | Forex : de zéro à confirmé | 14 |
| Cours | Unité de suivi, de score et d'examen | Les sessions de trading | environ 70 |
| Module | Chapitre d'un cours, se termine par un quiz | Chevauchements et liquidité | 4 à 7 par cours |
| Leçon | Une idée, 5 à 12 minutes | Le chevauchement Londres / New York | 3 à 6 par module |
| Quiz et examen | Quiz de module, examen final de cours | 10 questions tirées d'un pool | 1 par module, 1 par cours |

Volume à terme : environ 70 cours, 350 modules, 1 400 leçons. Le catalogue est défini à la section 7.

### Dimensions transversales (filtres et étiquettes)

- catégorie d'instrument : les 7 catégories de l'application, plus « Toutes » ;
- niveau : Débutant, Intermédiaire, Avancé, Expert ;
- type de contenu : Lecture, Pratique, Outil, Fiches ;
- durée estimée ;
- statut pour l'utilisateur : Non commencé, En cours, Terminé ;
- séance (Sydney, Tokyo, Londres, New York, Chicago, Global 24/7) pour les contenus liés aux horaires.

### Règles de structure

- Un cours appartient à un seul parcours. Les liens entre parcours passent par des « cours liés » (référence simple), pas par des doublons.
- Prérequis de deux types : **soft** (recommandé, jamais bloquant, avec bandeau d'avertissement) et **hard** (cours verrouillé tant que le prérequis n'est pas terminé). Les prérequis hard sont listés à la section 7.
- Chaque contenu a un statut : `draft`, `coming_soon`, `published`, `archived`. Seuls les contenus `published` comptent dans les scores et sont ouverts. Les contenus `coming_soon` apparaissent dans le catalogue avec la mention « Bientôt disponible ».
- Tout élément a un `slug` stable et unique : les URL ne changent jamais.

## 4. Navigation et pages

### Point d'entrée

Ajoute une entrée **Formation** (icône diplôme ou livre ouvert) au menu principal, visible sur ordinateur et mobile. Elle ouvre un espace avec sa propre navigation latérale (onglets sur mobile) : Accueil, Catalogue, Mon plan, Ma progression, Récompenses, Réviser, Glossaire, Outils, Favoris et notes.

### Plan des routes

| Route | Page | Contenu clé |
| --- | --- | --- |
| `/formation` | Accueil Formation | Bouton Continuer, score d'avancement, niveau et XP, série, parcours recommandés, raccourcis par catégorie d'instrument |
| `/formation/catalogue` | Catalogue | Tous les domaines, filtres (catégorie, niveau, type, durée, statut), recherche |
| `/formation/domaines/:slug` | Domaine | Description, parcours du domaine, progression |
| `/formation/parcours/:slug` | Parcours | Feuille de route visuelle : cours dans l'ordre, prérequis, verrous, progression |
| `/formation/cours/:slug` | Cours | Objectifs, programme (modules et leçons), durée, prérequis, progression, bouton Commencer/Reprendre |
| `/formation/cours/:cours/:module/:lecon` | Leçon | Lecteur de leçon (voir ci-dessous) |
| `/formation/quiz/:id` | Quiz ou examen | Passage du quiz, correction, résultat et récompenses |
| `/formation/plan` | Mon plan | Cours et parcours choisis, ordre conseillé, score d'avancement du plan |
| `/formation/progression` | Ma progression | Tableau de bord complet (voir ci-dessous) |
| `/formation/recompenses` | Récompenses | Niveau, XP, badges (obtenus et à débloquer), certificats |
| `/formation/reviser` | Réviser | File de révision espacée (cartes et questions ratées) |
| `/formation/glossaire` | Glossaire | Termes A-Z, recherche, liens vers les leçons |
| `/formation/outils/:slug` | Outil | Calculateurs et simulateurs autonomes |
| `/formation/favoris` | Favoris et notes | Leçons enregistrées et notes personnelles |
| `/formation/certificats/:code` | Certificat (public) | Page de vérification d'un certificat |
| `/admin/formation` | Administration | Gestion du contenu, uniquement si l'application a un rôle admin |

### Pages clés

- **Accueil Formation** : en haut, la carte « Continuer là où vous vous êtes arrêté » (dernière leçon ouverte, barre de progression). Ensuite : score d'avancement du plan, niveau trader avec barre d'XP, série en cours, 3 recommandations, puis une grille « Apprendre par catégorie d'instrument » (7 tuiles, chacune avec sa progression) et une grille par domaine.
- **Parcours** : feuille de route verticale (ou en chemin) montrant chaque cours avec son état (verrouillé, disponible, en cours, terminé), sa durée, son niveau et son score. Le prochain cours conseillé est mis en évidence.
- **Cours** : programme en accordéon (modules, puis leçons avec coche d'état et durée), liste des objectifs, prérequis, instruments et séances concernés, bouton principal (Commencer, Reprendre ou Passer l'examen).
- **Lecteur de leçon** : colonne centrale lisible (largeur de lecture limitée), sommaire du cours repliable à gauche (arbre module > leçon avec états), fil d'Ariane, boutons Précédent/Suivant, bouton « Marquer comme terminée », favori, prise de notes, taille de police réglable, estimation du temps restant, reprise à la dernière position de lecture, raccourcis clavier (flèches, N pour notes). Sur mobile : sommaire en tiroir, barre d'actions fixe en bas.
- **Quiz** : une question par écran, barre de progression, chronomètre optionnel, retour immédiat avec explication après soumission du quiz (voir 8.1), écran de résultat avec score, bonnes réponses, XP gagnés, badges débloqués et bouton « Réviser mes erreurs ».
- **Ma progression** : score d'avancement global, radar des 8 domaines, barres de maîtrise par catégorie d'instrument, calendrier d'activité (type heatmap), historique des quiz, courbe d'XP, temps d'étude, cours en cours.

### Comportements transverses

- Fil d'Ariane partout : Formation > Domaine > Parcours > Cours > Module > Leçon.
- Recherche globale (Ctrl/Cmd+K) sur leçons, cours, glossaire et outils, avec filtres.
- États vides, chargement (squelettes) et erreurs soignés sur chaque page.
- Mobile d'abord, accessible au clavier, thème clair/sombre hérité de l'application.
- Les recommandations utilisent la catégorie et la séance de l'utilisateur quand elles sont connues.

### Intégration avec le reste de l'application

- Fiche instrument : bouton « Se former sur {catégorie} » et 3 leçons suggérées selon la catégorie et la séance de l'instrument.
- Dans une leçon : encadré « Instruments liés » qui liste de vrais instruments de l'application (par catégorie ou par nom) avec lien vers leur fiche et leurs plages de trading et optimales.
- Un cours peut être étiqueté par `instrument_category` et par `session` pour alimenter ces suggestions.

## 5. Onboarding et recommandation

À la première visite, propose un questionnaire de 3 questions (ignorable, modifiable plus tard) :

1. **Niveau** : Je débute / J'ai déjà tradé en démo ou un peu en réel / Je trade régulièrement.
2. **Catégories d'intérêt** (choix multiple parmi les 7).
3. **Temps disponible par semaine** : moins de 2 h, 2 à 5 h, plus de 5 h.

Le résultat crée automatiquement « Mon plan » (inscriptions aux parcours recommandés). Règles de départ :

| Niveau déclaré | Ordre recommandé |
| --- | --- |
| Débutant | A1 (tous les cours), D1-01, E1-01, B1-01, puis G{catégorie}-01 et G{catégorie}-02 pour chaque catégorie choisie |
| Intermédiaire | A1-02, B1-03, D1-02, F1-01, puis le parcours G complet de chaque catégorie choisie |
| Confirmé | D1-03, F1-03, C1-04, puis les cours Avancé des catégories choisies et le domaine H |

L'utilisateur peut ajouter ou retirer parcours et cours de son plan à tout moment. Le temps hebdomadaire sert à afficher une estimation (« Terminé dans environ N semaines »).

## 6. Modèle de données

Noms indicatifs : adapte-les à l'ORM et aux conventions du dépôt. Toutes les tables sont préfixées `academy_`, avec `created_at` et `updated_at`, des clés étrangères, des index sur les colonnes de filtre et de jointure, et des contraintes d'unicité là où c'est indiqué.

```
-- CONTENU (géré par seed, éditable ensuite via l'admin)
academy_domains(id, slug UNIQUE, title, description, icon, position, status)
academy_paths(id, domain_id, slug UNIQUE, title, subtitle, description, level,
              instrument_category NULL, cover, position, status)
academy_courses(id, path_id, slug UNIQUE, code UNIQUE, title, summary, level,
                instrument_category NULL, session_tags JSON, learning_objectives JSON,
                est_minutes, position, status, content_version)
academy_course_prerequisites(course_id, requires_course_id, kind soft|hard)
academy_modules(id, course_id, slug, title, summary, position, status)
academy_lessons(id, module_id, slug, title, objective, body_md,
                type lecture|pratique|outil|fiches, tool_slug NULL, est_minutes,
                instrument_links JSON, position, status, content_version)
academy_quizzes(id, scope module|course_exam, module_id NULL, course_id NULL,
                pass_mark, question_count, time_limit_s NULL, max_attempts_per_day NULL)
academy_questions(id, quiz_id, type, prompt_md, explanation_md, difficulty 1-3,
                  payload JSON, position, status)
academy_glossary_terms(id, slug UNIQUE, term, definition_md,
                       instrument_category NULL, related_slugs JSON)

-- UTILISATEUR
academy_profiles(user_id PK, declared_level, interests JSON, weekly_minutes, onboarded_at,
                 xp_total, level, streak_current, streak_best, last_active_date, timezone)
academy_enrollments(user_id, path_id NULL, course_id NULL, source recommended|manual)
academy_lesson_progress(user_id, lesson_id, status, active_seconds, started_at,
                        completed_at, last_position)  -- UNIQUE(user_id, lesson_id)
academy_quiz_attempts(id, user_id, quiz_id, question_ids JSON, answers JSON, score_pct,
                      passed, started_at, submitted_at, duration_s)
academy_course_progress(user_id, course_id, completion_pct, mastery_pct, score, status,
                        completed_at, updated_at)  -- cache dérivé, recalculable
academy_xp_events(id, user_id, kind, ref_type, ref_id, xp,
                  idempotency_key UNIQUE, created_at)
academy_badges(id, slug UNIQUE, name, description, icon, rarity, family, rule JSON, position)
academy_user_badges(user_id, badge_id, earned_at)  -- UNIQUE(user_id, badge_id)
academy_certificates(id, user_id, path_id, code UNIQUE, issued_at, score_pct, is_public)
academy_review_items(user_id, question_id, box 1-5, due_at, last_result)
academy_bookmarks(user_id, lesson_id)
academy_notes(user_id, lesson_id, body, updated_at)
academy_daily_activity(user_id, date, minutes, lessons, quizzes, xp)
```

Types de questions et contenu de `payload` :

| Type | Contenu de payload |
| --- | --- |
| `single` | options, index de la bonne réponse |
| `multiple` | options, indices des bonnes réponses (tout ou rien) |
| `true_false` | bonne valeur |
| `matching` | deux colonnes et les paires correctes |
| `ordering` | éléments dans le bon ordre |
| `numeric` | valeur attendue, tolérance, unité, explication du calcul |
| `flashcard` | recto, verso (pour la révision, non noté) |

Les bonnes réponses ne quittent jamais le serveur avant la soumission du quiz.

## 7. Catalogue complet des formations

Crée ce catalogue exactement (codes, titres, niveaux) : **8 domaines, 14 parcours, 71 cours**. Les modules listés sont un minimum : tu peux en ajouter. Chaque cours a au moins 4 modules, chaque module se termine par un quiz, chaque cours par un examen final. Le code d'un cours est le code du parcours suivi de son numéro (A1-01, G1-03...).

### Domaine A : Fondamentaux. Parcours A1 « Démarrer en trading »

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| A1-01 | Comprendre les marchés financiers | Débutant | Trading et investissement ; Acteurs et places de marché ; Ordres et carnet d'ordres ; Coûts (spread, commissions, swap) ; Levier et marge ; Lire un graphique |
| A1-02 | Les sessions de trading | Débutant | Sydney, Tokyo, Londres, New York, Chicago et Global 24/7 ; Fuseaux horaires et heure d'été ; Chevauchements et liquidité ; Fenêtres optimales par catégorie ; Construire son planning de trading |
| A1-03 | Courtiers, plateformes et sécurité | Débutant | Types de courtiers ; Réglementation et vérifications ; Plateformes et applications ; Compte démo pas à pas ; Arnaques et signaux d'alerte |
| A1-04 | Le vocabulaire du trader | Débutant | Six modules thématiques de fiches (environ 150 termes), reliés au glossaire |

### Domaine B : Analyse technique. Parcours B1

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| B1-01 | Lire les graphiques | Débutant | Chandeliers japonais ; Unités de temps ; Tendances ; Supports et résistances ; Volume |
| B1-02 | Figures et configurations | Débutant | Figures de retournement ; Figures de continuation ; Gaps ; Faux signaux |
| B1-03 | Indicateurs techniques | Intermédiaire | Moyennes mobiles ; RSI et stochastique ; MACD ; Bandes de Bollinger ; ATR et volatilité ; VWAP et Ichimoku |
| B1-04 | Price action et structure de marché | Intermédiaire | Structure de marché ; Cassures ; Zones d'offre et de demande ; Confluences |
| B1-05 | Outils avancés | Avancé | Fibonacci ; Ondes d'Elliott ; Méthode Wyckoff ; Profil de volume ; Divergences |
| B1-06 | Multi-unités de temps et timing | Intermédiaire | Analyse descendante ; Alignement des tendances ; Points d'entrée ; Gestion d'une position ouverte |

### Domaine C : Analyse fondamentale et macro. Parcours C1

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| C1-01 | Macroéconomie pour traders | Intermédiaire | PIB et croissance ; Inflation ; Emploi ; PMI et enquêtes ; Commerce extérieur |
| C1-02 | Banques centrales et taux | Intermédiaire | Fed, BCE, BoE, BoJ, Banque centrale de Tunisie ; Politique monétaire ; Courbe des taux ; Lire un communiqué |
| C1-03 | Calendrier économique et news | Intermédiaire | Lire le calendrier ; Indicateurs majeurs ; Volatilité des annonces ; Stratégies et pièges |
| C1-04 | Corrélations et sentiment | Avancé | Dollar index ; VIX ; Risk-on et risk-off ; Rapport COT ; Corrélations entre catégories |

### Domaine D : Risque et capital. Parcours D1

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| D1-01 | Les bases du risque | Débutant | Risque par trade ; Stop-loss et take-profit ; Ratio gain/risque ; Erreurs fatales |
| D1-02 | Taille de position et levier | Intermédiaire | Calcul des lots et contrats ; Valeur du pip et du tick ; Marge et appels de marge ; Outils de calcul |
| D1-03 | Statistiques du trader | Intermédiaire | Taux de réussite ; Espérance mathématique ; Drawdown et récupération ; Ratios de performance |
| D1-04 | Portefeuille et corrélation | Avancé | Diversification ; Corrélation entre positions ; Risque global ; Exposition par catégorie |
| D1-05 | Scénarios de crise | Avancé | Gaps ; Slippage ; Liquidité ; Événements extrêmes ; Plan de continuité |

### Domaine E : Psychologie et discipline. Parcours E1

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| E1-01 | Biais et émotions | Débutant | Peur et avidité ; FOMO ; Biais cognitifs ; Trading de vengeance |
| E1-02 | Discipline et routines | Intermédiaire | Routine quotidienne ; Checklists ; Règles personnelles ; Gestion du temps et des sessions |
| E1-03 | Le journal de trading | Intermédiaire | Que noter ; Revue hebdomadaire ; Métriques ; Amélioration continue |
| E1-04 | Résilience | Avancé | Séries perdantes ; Drawdown psychologique ; Prévention de l'épuisement ; Équilibre de vie |

### Domaine F : Stratégie et méthode. Parcours F1

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| F1-01 | Construire son plan de trading | Intermédiaire | Objectifs ; Marchés et sessions ; Règles d'entrée et de sortie ; Gestion du risque ; Revue périodique |
| F1-02 | Styles de trading | Intermédiaire | Scalping ; Day trading ; Swing trading ; Trading de position ; Choisir son style |
| F1-03 | Backtesting et forward testing | Avancé | Principes ; Échantillons et biais ; Backtest manuel ; Compte démo ; Lire les résultats |
| F1-04 | Métriques et optimisation | Avancé | Surajustement ; Robustesse ; Walk-forward ; Amélioration continue |
| F1-05 | Automatisation | Avancé | Systèmes de trading ; Bots ; Risques techniques ; Surveillance |

### Domaine G : Par catégorie d'instrument (7 parcours, un par catégorie de l'application)

**G1 Forex**

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| G1-01 | Les bases du Forex | Débutant | Paires et cotations ; Pips, lots et spread ; Majeures, mineures, exotiques ; Premier trade en démo ; Coûts |
| G1-02 | Sessions et liquidité sur le Forex | Débutant | Les sessions du Forex ; Paires par session ; Chevauchements ; Heures à éviter |
| G1-03 | Fondamentaux des devises | Intermédiaire | Taux d'intérêt ; Carry trade et swap ; Balance commerciale ; Matières premières et devises |
| G1-04 | Stratégies Forex | Intermédiaire | Tendance ; Range ; Cassure ; News ; Plan complet |
| G1-05 | Forex avancé | Avancé | Corrélations ; Intermarché ; Flux institutionnels ; Paires exotiques ; Gestion multi-paires |

**G2 Indices**

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| G2-01 | Comprendre les indices | Débutant | Définition ; Pondération ; Composition et rééquilibrage ; Dividendes ; CFD, futures et ETF sur indices |
| G2-02 | Les grands indices du monde | Débutant | États-Unis (S&P 500, Nasdaq 100, Dow Jones, Russell 2000) ; Europe (DAX, CAC 40, FTSE 100, Euro STOXX 50, IBEX 35, SMI) ; Asie-Pacifique (Nikkei 225, Hang Seng, ASX 200, CSI 300, Nifty 50, KOSPI) ; Afrique et Moyen-Orient (TUNINDEX, MASI, JSE Top 40) |
| G2-03 | Trader les indices | Intermédiaire | Ouverture et clôture ; Gaps ; Sessions ; Saisonnalité ; Événements |
| G2-04 | Volatilité et VIX | Intermédiaire | Qu'est-ce que la volatilité ; Le VIX ; Structure par échéance ; Utiliser la volatilité |
| G2-05 | Stratégies sur indices | Avancé | Tendance ; Retour à la moyenne ; Rotation ; Gestion du risque |

**G3 Matières Premières**

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| G3-01 | Les bases des matières premières | Débutant | Les familles ; Acteurs du marché ; Unités et cotations ; Offre et demande |
| G3-02 | Marchés à terme et courbes | Intermédiaire | Contrats à terme ; Contango et backwardation ; Roll ; Expiration |
| G3-03 | Énergie | Intermédiaire | Pétrole WTI et Brent ; Gaz naturel ; Rapports EIA et OPEP ; Saisonnalité |
| G3-04 | Métaux | Intermédiaire | Or et argent ; Platine et palladium ; Cuivre et métaux de base ; Facteurs de prix |
| G3-05 | Agricoles | Intermédiaire | Céréales et oléagineux ; Softs (café, cacao, sucre, coton) ; Élevage ; Rapports USDA et WASDE ; Météo |
| G3-06 | Stratégies sur matières premières | Avancé | Spreads ; Saisonnalité ; Corrélations ; Gestion du risque |

**G4 Actions**

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| G4-01 | Les bases de la bourse | Débutant | Marchés primaire et secondaire ; Capitalisation ; Dividendes ; Ordres de bourse ; Horaires |
| G4-02 | Analyser une entreprise | Intermédiaire | Bilan ; Compte de résultat ; Flux de trésorerie ; Ratios clés |
| G4-03 | Valorisation et résultats | Intermédiaire | PER et multiples ; Actualisation ; Publications trimestrielles ; Réaction du marché |
| G4-04 | Trader les actions | Intermédiaire | Screening ; Secteurs ; Momentum ; Swing trading ; Vente à découvert |
| G4-05 | Bourses régionales et Bourse de Tunis | Intermédiaire | Fonctionnement ; Horaires et séances ; Accès et intermédiaires ; Fiscalité (à faire vérifier) ; Marchés frontières |

**G5 Cryptomonnaies**

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| G5-01 | Blockchain et Bitcoin | Débutant | Principe de la blockchain ; Bitcoin ; Mineurs et validateurs ; Offre et halving |
| G5-02 | L'écosystème crypto | Débutant | Ethereum et altcoins ; Stablecoins ; DeFi ; Tokens et NFT ; Couches 1 et 2 |
| G5-03 | Plateformes, wallets et sécurité | Débutant | Plateformes centralisées et décentralisées ; Wallets ; Sécurité ; Arnaques |
| G5-04 | Analyse on-chain et tokenomics | Intermédiaire | Données on-chain ; Tokenomics ; Évaluer un projet ; Indicateurs de cycle |
| G5-05 | Trader les cryptos | Intermédiaire | Marché 24/7 ; Dérivés et contrats perpétuels ; Funding ; Liquidations ; Cycles |
| G5-06 | Risques et réglementation | Intermédiaire | Risques spécifiques ; Cadre réglementaire ; Fiscalité (à faire vérifier) ; Bonnes pratiques |

**G6 ETF**

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| G6-01 | Comprendre les ETF | Débutant | Principe ; Réplication ; Frais (TER) ; Tracking error ; Liquidité |
| G6-02 | Les familles d'ETF | Débutant | Indices ; Sectoriels ; Obligataires ; Matières premières ; Thématiques ; Crypto |
| G6-03 | ETF à effet de levier et inversés | Avancé | Fonctionnement ; Effet de composé ; Risques ; Usages |
| G6-04 | Trader les ETF | Intermédiaire | Liquidité et spreads ; Rotation sectorielle ; Timing ; Comparer deux ETF |
| G6-05 | Construire une allocation | Intermédiaire | Allocation de base ; Diversification ; Rééquilibrage ; Coûts |

**G7 Futures**

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| G7-01 | Les bases des contrats à terme | Débutant | Spécifications d'un contrat ; Tick et valeur du tick ; Marge ; Hedgers et spéculateurs |
| G7-02 | Futures sur indices, devises et taux | Intermédiaire | E-mini et micro ; Futures de change ; Futures de taux ; Horaires |
| G7-03 | Futures sur matières premières | Intermédiaire | Énergie ; Métaux ; Agricoles ; Spécificités |
| G7-04 | Expiration, roll et micro-contrats | Avancé | Cycle d'expiration ; Roll ; Micro-contrats ; Risques de livraison |
| G7-05 | COT, volume et order flow | Avancé | Rapport COT ; Volume et open interest ; Order flow ; Profil de volume |

### Domaine H : Avancé et professionnel. Parcours H1

| Code | Cours | Niveau | Modules (minimum) |
| --- | --- | --- | --- |
| H1-01 | Options et produits dérivés (introduction) | Avancé | Calls et puts ; Prime et grecques ; Stratégies de base ; Risques |
| H1-02 | Trading algorithmique et données | Expert | Données de marché ; Langages et outils ; Construire une stratégie ; Déploiement et suivi |
| H1-03 | Allocation d'actifs et portefeuille | Avancé | Classes d'actifs ; Allocation stratégique ; Mesure du risque ; Rééquilibrage |
| H1-04 | Cadre juridique et fiscal | Intermédiaire | Statut du trader ; Réglementation ; Fiscalité générale (à faire vérifier par pays) ; Obligations déclaratives |
| H1-05 | Prop firms et financement | Avancé | Fonctionnement ; Évaluations ; Pièges ; Alternatives |
| H1-06 | Le trading comme activité professionnelle | Expert | Business plan ; Comptabilité ; Organisation ; Scalabilité et limites |

### Prérequis de type hard

Tous les autres prérequis sont de type soft : conseillés, jamais bloquants.

| Cours verrouillé | Requiert (terminé) |
| --- | --- |
| B1-03 | B1-01 |
| B1-05 | B1-03 |
| D1-04 | D1-02 |
| F1-03 | F1-01 |
| F1-04, F1-05 | F1-03 |
| G1-05 | G1-04 |
| G2-05 | G2-03 |
| G3-06 | G3-02 |
| G6-03 | G6-01 |
| G7-04, G7-05 | G7-01 et G7-02 |
| H1-02 | F1-03 et B1-03 |
| H1-06 | D1-03 et F1-01 |

Les cours de niveau Avancé et Expert sans prérequis hard affichent un bandeau conseillant de terminer d'abord deux cours de niveau Intermédiaire.

### Profondeur de la structure à créer

- Pour les 71 cours : crée les modules (liste ci-dessus) avec titre, résumé et durée estimée, en statut `coming_soon`.
- Pour les cours de la vague 1 de contenu (section 12) : crée aussi toutes les leçons, les quiz et les examens, entièrement rédigés, en statut `published`.
- Pour les autres cours, les leçons sont créées au fil des vagues suivantes.

## 8. Suivi de cours, score d'avancement et récompenses

Tout le calcul se fait côté serveur. Le client affiche et déclenche, il ne décide jamais d'une complétion, d'un score ou d'une récompense.

### 8.1 Règles de complétion

**Leçon** : non commencée, puis en cours (dès l'ouverture), puis terminée. Elle est terminée quand :

- le temps actif atteint 40 % de la durée estimée (minimum 30 secondes) ;
- et l'utilisateur a atteint la fin de la page ou clique sur « Marquer comme terminée ».

Une leçon de type Pratique ou Outil exige en plus la réussite de l'exercice. Le temps actif compte seulement quand l'onglet est visible et que l'utilisateur interagit : battement de cœur toutes les 15 secondes, pause après 60 secondes d'inactivité. Le serveur valide ces conditions.

**Quiz de module** : N questions tirées au hasard dans un pool d'au moins 1,5 × N questions, ordre des questions et des options mélangé. Correction après soumission, avec explication de chaque réponse. Réussite à 70 % ou plus. Tentatives illimitées, la meilleure note est conservée.

**Examen final de cours** : 20 à 30 questions, réussite à 75 % ou plus, 3 tentatives maximum par période de 24 heures, accessible seulement quand toutes les leçons du cours sont terminées.

**Module terminé** : toutes ses leçons terminées et son quiz réussi. **Cours terminé** : tous ses modules terminés et l'examen final réussi.

Les questions numériques acceptent une tolérance définie dans le payload. Les bonnes réponses ne sont jamais envoyées au client avant la soumission.

### 8.2 Score d'avancement (0 à 100)

Le score d'avancement mesure la progression dans le plan de formation de l'utilisateur. Il combine ce qui est lu (complétion) et ce qui est compris (maîtrise).

- **Complétion d'un cours** = minutes des leçons terminées ÷ minutes de toutes les leçons publiées du cours.
- **Maîtrise d'un cours** = moyenne des meilleures notes de tous ses quiz (modules et examen final). Un quiz jamais tenté compte 0.
- **Score d'un cours** = arrondi de 100 × (0,7 × complétion + 0,3 × maîtrise). Arrondi à l'entier le plus proche, 0,5 vers le haut.
- **Score d'un parcours ou d'un domaine** = moyenne des scores de ses cours publiés, pondérée par leur durée estimée.
- **Score d'avancement du plan** (affiché en grand sur l'accueil) = même moyenne pondérée sur tous les cours du plan de l'utilisateur.

Affichages complémentaires sur la page Ma progression :

- un radar des 8 domaines (score de chaque domaine) ;
- des barres de maîtrise par catégorie d'instrument (les 7 parcours G), calculées sur les cours commencés ;
- un libellé selon le score : 0 à 19 Découverte, 20 à 39 Initié, 40 à 59 Intermédiaire, 60 à 79 Confirmé, 80 à 100 Expert.

Sur la page d'un cours, montre toujours séparément la complétion et la maîtrise, pour que l'utilisateur sache quoi améliorer.

**Exemple à reprendre dans les tests** : un cours de 4 leçons de 10 minutes, dont 3 terminées (complétion 0,75), avec deux quiz réussis à 80 % et 100 % (maîtrise 0,9). Score = arrondi de 100 × (0,525 + 0,27) = arrondi de 79,5 = **80**.

### 8.3 XP et niveaux de trader

Le score d'avancement mesure la progression dans les cours ; l'XP et le niveau récompensent l'activité. L'interface doit rendre cette différence claire : « Avancement » d'un côté, « Niveau trader » de l'autre.

| Action | XP | Règle |
| --- | --- | --- |
| Leçon terminée | 10 | Première fois seulement |
| Exercice pratique ou outil réussi | 15 | Première fois seulement |
| Quiz de module réussi | 20 | Première réussite, plus 10 si note de 90 % ou plus |
| Module terminé | 30 | Une fois |
| Examen final réussi | 100 | Plus 50 si note de 90 % ou plus (première réussite) |
| Cours terminé | 150 | Une fois |
| Parcours terminé | 500 | Une fois |
| Série (streak) | 5 par jour de série | Plafonné à 25 XP par jour |
| Révision espacée | 5 par session | 3 sessions par jour au maximum |

| Niveau | Titre | XP cumulés requis |
| --- | --- | --- |
| 1 | Novice | 0 |
| 2 | Apprenti | 250 |
| 3 | Analyste | 750 |
| 4 | Trader | 1 750 |
| 5 | Stratège | 3 500 |
| 6 | Expert | 6 500 |
| 7 | Maître | 10 000 |

Anti-abus : aucun XP pour une répétition (relire une leçon, repasser un quiz déjà réussi). Une leçon ne peut pas être terminée plus vite que la règle des 40 % de temps actif. Chaque gain d'XP est un événement avec une clé d'idempotence unique (par exemple `lesson:{id}:completed`) : un doublon ne crédite rien.

### 8.4 Badges

Crée au moins 40 badges, répartis en familles, avec une rareté (commun, rare, épique, légendaire), une icône et une règle déclarative stockée dans `rule` (événement déclencheur, filtre, seuil). Un moteur de règles les évalue après chaque événement de progression. Un badge obtenu n'est jamais retiré.

| Famille | Badges |
| --- | --- |
| Progression (8) | Premier pas (1 leçon) ; Lecteur assidu (10 leçons) ; Étudiant (50) ; Érudit (200) ; Premier cours ; Cinq cours ; Premier parcours ; Académie complète (au moins un cours terminé dans chacun des 8 domaines) |
| Maîtrise (5) | Sans faute (quiz à 100 %) ; Série parfaite (5 quiz à 100 %) ; Excellence (examen final à 90 % ou plus) ; Major (3 examens à 90 % ou plus) ; Rattrapage (réussir un quiz après un échec) |
| Régularité (6) | Série de 3 jours ; 7 jours ; 30 jours ; 100 jours ; Semaine complète (7 jours sur 7) ; Marathon (60 minutes d'étude en un jour) |
| Exploration des instruments (16) | Explorateur {catégorie} (cours G{n}-01 terminé), pour les 7 catégories ; Spécialiste {catégorie} (parcours G{n} terminé), pour les 7 catégories ; Polyvalent (3 catégories explorées) ; Citoyen du monde (les 7) |
| Thématiques (8) | Maître des sessions (A1-02 avec examen à 85 % ou plus) ; Gardien du risque (parcours D1) ; Esprit d'acier (parcours E1) ; Analyste technique (B1-01 à B1-04) ; Macro-économiste (parcours C1) ; Stratège (parcours F1) ; Éclaireur (parcours A1) ; Artisan (avoir utilisé les 5 outils interactifs) |

### 8.5 Certificats

À la fin d'un parcours (tous les cours terminés, examens réussis), génère un certificat : page publique `/formation/certificats/:code` et export PDF, avec nom de l'utilisateur, parcours, date, score, code de vérification unique et QR code. L'utilisateur choisit s'il est public. Mention obligatoire : « Attestation de suivi pédagogique. Ne constitue ni un diplôme, ni une qualification professionnelle, ni un conseil en investissement. »

### 8.6 Séries et révision espacée

- Un jour est actif si l'utilisateur termine au moins une leçon ou tente un quiz. Le jour se calcule dans le fuseau de l'utilisateur (`timezone` du profil). Un jour de grâce automatique par semaine évite de perdre la série pour un oubli.
- Toute question ratée entre dans la file de révision (boîte 1). Les boîtes ont des délais de 1, 3, 7, 21 et 60 jours : une bonne réponse fait monter d'une boîte, une mauvaise ramène à la boîte 1. La page Réviser propose les éléments échus, avec les flashcards du glossaire.

### 8.7 Expérience des récompenses

- Chaque réponse d'API qui change la progression renvoie un bloc `rewards` (XP gagnés, passage de niveau, badges débloqués, cours ou parcours terminé). L'interface le transforme en toasts, et en fenêtre de célébration pour un passage de niveau, un cours terminé ou un certificat.
- Animations sobres, désactivées si l'utilisateur demande moins de mouvement (`prefers-reduced-motion`).
- La page Récompenses affiche le niveau et la barre d'XP, tous les badges (obtenus en couleur, à débloquer grisés avec l'objectif à atteindre), les certificats et l'historique des gains.

### 8.8 Robustesse

- Opérations de complétion et de récompense dans une transaction, idempotentes (aucun doublon d'XP ni de badge en cas de double clic ou de relance réseau).
- `academy_course_progress` est un cache : il se met à jour à chaque événement et peut être reconstruit entièrement depuis les tables de progression (commande de recalcul et tâche de cohérence nocturne).
- Quand un contenu est publié, retiré ou modifié, les scores des utilisateurs concernés sont recalculés par une tâche asynchrone. Les XP et les badges déjà obtenus ne sont jamais retirés, et une leçon déjà terminée reste terminée.
- Les contenus `coming_soon` n'entrent pas dans les dénominateurs des scores.
