# Format d’import des cours Markdown

L’import se fait dans **Administration → Formation**. Le serveur lit le Markdown sans exécuter de code, valide son contenu, enregistre un brouillon, puis un administrateur doit approuver explicitement sa publication.

## Métadonnées obligatoires

Le fichier commence par un en-tête YAML délimité par `---`. Les valeurs sont du texte simple; les objectifs sont une liste.

```yaml
---
code: A1-02
slug: sessions-de-trading
title: Les sessions de trading
domain: A
path: A1
level: Débutant
summary: Comprendre le fonctionnement et les horaires des principales sessions de marché.
objectives:
  - Identifier les principales sessions de marché.
  - Comparer les fuseaux horaires et les chevauchements.
---
```

Le code doit correspondre au parcours (`A1-02` appartient à `A1`), le domaine à la première lettre du parcours. Les niveaux acceptés sont `Débutant`, `Intermédiaire`, `Avancé` et `Expert`. Le slug est stable, minuscule et séparé par des tirets. Le résumé fait 30 à 500 caractères et il faut au moins deux objectifs.

## Structure pédagogique requise

- **4 à 7 modules**.
- Chaque module a **3 à 6 leçons** de **5 à 12 minutes**; le texte de chaque leçon compte au moins 80 caractères.
- Chaque quiz de module contient au moins **8 questions**; chaque question offre au moins 3 choix, une seule bonne réponse et une explication d’au moins 20 caractères.
- L’examen final contient au moins **30 questions**; l’application pourra en tirer 20 au hasard.
- La durée totale des leçons atteint au moins 60 minutes.
- Une leçon de type pratique ou outil doit expliquer clairement l’exercice dans son contenu.

Exemple de structure (à répéter selon les volumes ci-dessus) :

```markdown
## Module 1 — Comprendre les horaires

### Leçon 1 — Les horaires locaux (7 min)

Le texte pédagogique de la leçon. Décrivez une notion précise, donnez un exemple et expliquez les limites de cet exemple.

### Leçon 2 — Comparer les fuseaux (8 min)

Contenu pédagogique suffisamment détaillé pour être utile sans supposer de connaissances non expliquées.

### Leçon 3 — Lire le calendrier (6 min)

Expliquez comment appliquer le concept et rappelez que les horaires peuvent varier selon les marchés.

### Quiz du module

#### Question 1 — Quel fuseau faut-il considérer pour une session ?
- [ ] Toujours le fuseau de l’apprenant
- [x] Le fuseau du marché ou de la session indiqué
- [ ] Un décalage UTC fixe toute l’année

Explication : Les changements d’heure rendent les décalages fixes peu fiables; il faut tenir compte du fuseau de référence.

#### Question 2 — Ajoutez sept questions au même format.
...

## Module 2 — Titre du module
...

## Module 3 — Titre du module
...

## Module 4 — Titre du module
...

## Examen final

#### Question 1 — Une question de révision portant sur les objectifs du cours ?
- [x] La réponse correcte
- [ ] Un distracteur plausible
- [ ] Un autre distracteur plausible

Explication : Justifiez la réponse en reliant l’explication à la notion enseignée.

#### Question 2 — Ajoutez au moins 28 questions au même format.
...
```

Remplacez impérativement les lignes `...` et les questions d’exemple : elles ne constituent pas du contenu de cours publiable. Chaque question doit avoir un titre distinct, des réponses plausibles et une explication éducative.

## Cycle d’import et de publication

1. Choisir le fichier `.md` (512 Ko maximum), puis lancer la validation.
2. Corriger toutes les erreurs signalées et relancer la validation.
3. Enregistrer en brouillon. Un code ou slug déjà publié ne peut pas être écrasé par un import.
4. Relire le brouillon dans la liste d’administration.
5. Cocher la déclaration de relecture et publier. Le serveur revalide le fichier et enregistre l’administrateur ainsi que la date de publication.

La publication rend accessibles les objectifs, modules et textes des leçons dans le catalogue Formation. Les réponses et explications des quiz restent côté serveur; elles ne sont pas incluses dans l’API publique. Le contenu doit rester éducatif, mentionner les risques et ne pas promettre de gains ni recommander un investissement.
