# Décisions — Trading Academy

- L’interface d’entrée est intégrée à la page Vite existante plutôt que de créer un second site ou un nouveau routeur. `#apprendre` ouvre l’accueil Academy et les autres vues utilisent des sous-fragments stables.
- Le flag `VITE_ACADEMY_ENABLED` est activé par défaut pour publier l’interface demandée; `VITE_ACADEMY_ENABLED=false` la désactive sans modifier les pages existantes.
- Le catalogue reflète les codes, titres et niveaux des 71 cours fournis. Les cours structurés mais non encore importés affichent « Bientôt disponible »; un cours Markdown publié remplace l’entrée statique correspondante.
- Le premier modèle persiste un cours et sa structure sous forme JSON dans `academy_courses`. Cela permet l’import/publication et l’affichage sûr des leçons sans préjuger de la future normalisation des tables de suivi, tentatives de quiz et XP.
- Gemini génère le Markdown des cours depuis les métadonnées du catalogue et des consignes administrateur facultatives. Le parseur serveur valide les volumes avant la création d’un brouillon; les règles sont documentées dans `COURSE_GENERATION.md`.
- Les quiz sont stockés côté serveur. Les réponses et explications ne sont pas exposées par l’API publique avant qu’un parcours de quiz sécurisé soit conçu.
- La publication est réservée au rôle `ADMIN`, demande une confirmation de relecture et enregistre le vérificateur. Un cours publié ne peut pas être écrasé par un import; un workflow de révision/version des contenus publiés reste à définir.
- Les données de progression et de récompense ne sont pas simulées dans le navigateur. Les vues Mon plan, Progression, Récompenses, Réviser, Glossaire, Outils et Favoris indiquent leur état préparatoire en attendant le suivi Academy.
- Les libellés de navigation sont disponibles en français, anglais et arabe; le contenu des cours importés est rédigé en français dans ce lot.
