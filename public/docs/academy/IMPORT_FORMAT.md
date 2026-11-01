# Format d’import des cours Markdown

Dans **Administration → Formation**, déposez un fichier `.md` (512 Ko maximum). Le serveur le valide, le conserve en brouillon, puis exige une approbation administrateur avant publication. Le fichier ne doit pas contenir de code exécutable.

## En-tête requis

Les valeurs sont du texte simple; les objectifs sont une liste YAML.

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

Codes : `A1-01` à `H1-99`, avec un parcours de `A1` à `H1`; la lettre du domaine correspond à celle du parcours. Niveaux acceptés : `Débutant`, `Intermédiaire`, `Avancé`, `Expert`. Le résumé fait 30 à 500 caractères et il faut au moins deux objectifs.

## Volumes requis

- 4 à 7 modules.
- 3 à 6 leçons par module, de 5 à 12 minutes chacune; chaque texte de leçon compte au moins 80 caractères.
- Au moins 8 questions par quiz de module et 30 questions à l’examen final.
- Chaque question a au moins 3 choix (`- [ ]` ou `- [x]`), exactement une bonne réponse, et une explication de 20 caractères minimum.
- Durée totale des leçons : au moins 60 minutes.

## Exemple de section de cours

```markdown
## Module 1 — Comprendre les horaires

### Leçon 1 — Les horaires locaux (7 min)

Expliquez une notion à la fois, donnez un exemple et précisez-en les limites. Chaque leçon publiée doit contenir au moins 80 caractères.

### Leçon 2 — Comparer les fuseaux (8 min)

Expliquez comment comparer deux fuseaux et pourquoi les changements d’heure comptent.

### Leçon 3 — Lire le calendrier (6 min)

Montrez comment appliquer le concept à un exemple pédagogique.

### Quiz du module

#### Question 1 — Quel fuseau faut-il considérer pour une session ?
- [ ] Toujours le fuseau de l’apprenant
- [x] Le fuseau du marché ou de la session indiqué
- [ ] Un décalage UTC fixe toute l’année

Explication : Les changements d’heure rendent les décalages fixes peu fiables; utilisez le fuseau de référence.

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

Remplacez les `...` et les questions d’exemple : ce modèle est illustratif et ne passe pas la validation tant que les volumes ne sont pas complets.

## Publication et sécurité

Validez le fichier, enregistrez-le en brouillon, relisez-le, puis cochez la confirmation d’approbation et publiez. Le serveur revalide le contenu et conserve l’identité de l’administrateur vérificateur. Un cours déjà publié ne peut pas être écrasé par un nouvel import.

Les réponses correctes ne sont jamais renvoyées dans l’API publique. Le contenu doit rester éducatif, signaler les risques, sans conseil en investissement ni promesse de gains.
