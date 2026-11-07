# 🚐 Grind My Mind

Ta vie comme un road trip : chaque étape importante fait avancer un petit combi sur une frise colorée.

## Utilisation

Ouvre `index.html` dans ton navigateur. Il n'y a rien à installer.

- **+ Nouvelle étape** (ou touche `N`) : titre, date, route, type, photo, petit mot.
- **Les routes** :
  - 🌿 Santé (forêt)
  - 💼 Travail (ville)
  - ❤️ Relations (cerisiers)
- **Les pannes** : le combi fume, les warnings clignotent et un panneau ⚠️ apparaît.
- **Clic sur une carte** : elle se retourne pour afficher le petit mot, avec les boutons *Modifier* et *Supprimer*.
- **Menu ⋯** : exporter et importer une sauvegarde `.json`.

> Les données sont stockées **dans ton navigateur** (localStorage), sur cet appareil uniquement.
> Pense à exporter une sauvegarde de temps en temps.

## Structure

| Fichier      | Rôle                                                                  |
|--------------|-----------------------------------------------------------------------|
| `index.html` | Structure de la page : barre du haut, frise, dessin du van, fenêtres  |
| `style.css`  | Apparence : couleurs (variables en haut), route, van, cartes, fenêtres |
| `app.js`     | Logique : données, décor, dessin de la frise, animations, import/export |

Pour changer les couleurs des routes, modifie `--sante`, `--travail` et `--relations` au début de `style.css`.

## Idées pour la suite

- Thème nuit 🌙
- Zoom / vue d'ensemble de toute la frise
- Stockage IndexedDB (plus de place pour les photos)
- Comptes + synchronisation entre appareils
