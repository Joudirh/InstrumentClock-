# InstrumentClock - Documentation du projet

## 🧩 Vue d'ensemble
InstrumentClock est une application web front-end permettant de visualiser les sessions de trading (Forex, indices, matières premières, actions, crypto, futures) et leur état (ouvert/fermé) à travers un timeline interactif.

- Projet existant: `index.html`, `css/style.css`, `js/*.js`, `assets/*`
- Objectif: visualiser les heures d'ouverture de marchés internationaux en timezone locale ou choisie
- Cible: traders ou analystes souhaitant rapidement repérer les périodes de marché actives et de chevauchement

## 🛠️ Stack utilisé
- HTML: `index.html`
- CSS: `css/style.css` (thème clair/sombre via `data-theme`)
- JavaScript modulaire ES6:
  - `js/main.js` (logique d’état, gestion événementielle, rendu global)
  - `js/data.js` (config des sessions forex + listes d’instruments)
  - `js/timeline.js` (rend le visuel de 24h et le calcul d’instances)
  - `js/timezone.js` (conversion entre fuseaux horaires via Luxon + logique saison)
  - `js/ui.js` (rendu liste instruments, filtres, horloges mondiales)
- Librairie externe: Luxon via CDN `https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js`

## 📌 Fonctionnalités principales
1. Timeline dynamique des sessions Forex
   - Affiche Sydney/Tokyo/Francfort/Londres/NewYork.
   - Conversion horaire locale selon fuseau choisi.
   - Indicateur temps réel (ligne actuelle) à 1 sec.

2. Gestion saisonnière DST
   - `season` (hiver/été) influence la conversion horaire via `data.seasons`.

3. Fuseau horaire utilisateur
   - Auto-detection (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
   - Choix manuel via liste `timezonesList`.

4. Filtrage et statut
   - Filtre par catégorie (Forex, Indices, Matières Premières, Actions, Crypto, Futures).
   - Filtre par statut `all/open/closed` sur instruments.

5. Cartes instruments actives
   - Pour chaque instrument: heures d’ouverture/fermeture locales converties.
   - Affiche si l’instrument est ouvert/fermé maintenant.
   - Barre visuelle 24h + zone “optimal trading”.

6. Horloges mondiales multi-fuseaux
   - Carte d’horloge par session Forex avec état ouverture.

7. Thèmes + préférences locale
   - Thème clair/sombre stocké sous `localStorage`.
   - Saison et fuseau également stockés en local.

## 🔍 Points importants du code
- `convertHour()` et `convertDayHour()` calculent les conversions de fuseaux via Luxon.
- `isTimeInPeriod()` gère wrap-around 24h (décalage nuit).
- `renderForexTimeline` calcule chevauchements de sessions (au moins 2 marchés ouverts) et les affiche.
- `renderInstruments` utilise conversion horaire pour toutes catégories et affichage mis à jour en temps réel.

## 📦 Améliorations possibles
- Ajout d’un back-end/API pour prix/volumes en temps réel.
- Mise en cache IndexedDB pour sessions personnalisées.
- Support mobile + accessibilité ARIA.
- Tests unitaires (Jest, Playwright) pour validation du calcul de fuseau et UI.

## 🚀 Lancement
Ouvrir `index.html` directement (projet statique), ou via serveur local (ex. `npx http-server` ou Live Server) pour les modules ES.

---
> Fichier créé lors de la demande de documentation automatique. Ce document peut être personnalisé et enrichi avec des captures d’écran et des exemples d’utilisation.
