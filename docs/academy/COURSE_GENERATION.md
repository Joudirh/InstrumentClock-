# Génération et publication des cours

L’administration du catalogue se trouve dans **`/dashboard#/academy`**. La liste regroupe les cours connus et leur état :

- **Bientôt disponible** : aucun cours enregistré. Ouvrez la fiche pour ajuster le titre et le niveau, puis générer un brouillon.
- **Brouillon** : le contenu généré est modifiable et doit être relu avant publication.
- **Publié** : contenu visible dans le catalogue Formation; la fiche permet de le consulter.

## Configuration Gemini

La génération appelle Gemini depuis l’API serveur. La clé ne doit jamais être ajoutée au code, à un fichier JavaScript du navigateur ou au dépôt Git.

- En local, ajoutez `GEMINI_API_KEY` dans le fichier `.env` à la racine du projet. Ce fichier est ignoré par Git.
- Sur Vercel, ajoutez `GEMINI_API_KEY` dans **Project Settings → Environment Variables** pour les environnements utilisés, puis redéployez.
- Le modèle par défaut est `gemini-2.5-flash`. Pour en choisir un autre, configurez aussi `GEMINI_MODEL` côté serveur.

Le fichier `.env.example` documente ces variables sans contenir de clé réelle. La génération prend jusqu’à une minute et utilise la durée de fonction configurée dans `vercel.json`.

## Workflow

1. Dans le dashboard, recherchez un cours et cliquez sur **Générer**.
2. Vérifiez le titre et le niveau préremplis. Vous pouvez les modifier et ajouter des consignes complémentaires (2 000 caractères maximum).
3. Lancez **Générer avec Gemini**. Le serveur valide le Markdown produit avant de l’enregistrer comme brouillon. Un contenu invalide n’est pas enregistré.
4. Relisez le brouillon, modifiez le Markdown si besoin, puis enregistrez les modifications.
5. Cochez la confirmation de relecture et publiez. La publication est revalidée côté serveur.
6. Un brouillon peut être supprimé; le cours revient alors à l’état **Bientôt disponible**. Une fiche vide peut être réinitialisée à ses valeurs de catalogue.

## Format pédagogique contrôlé

La validation serveur impose les métadonnées et volumes suivants :

- De 4 à 7 modules, avec 3 à 6 leçons de 5 à 12 minutes par module.
- Au moins 80 caractères de contenu par leçon et 60 minutes de leçons au total.
- Au moins 8 questions par quiz de module et 30 questions à l’examen final.
- Chaque question propose au moins 3 réponses, exactement une réponse correcte et une explication d’au moins 20 caractères.

Les réponses et explications des quiz restent privées côté serveur. Les cours doivent rester éducatifs, mentionner les risques et ne pas promettre de gains ni recommander un investissement.

Vérification locale du parseur : `npm run academy:check-content`.
