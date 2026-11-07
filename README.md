# 🚐 Grind My Mind

Ta vie comme un road trip : chaque étape importante fait avancer un petit combi sur une frise colorée.

## Utilisation

Ouvre `index.html` dans ton navigateur (page de présentation), puis **Ouvrir ma frise**. Il n'y a rien à installer.

- **Ajouter une étape** (ou touche `N`) : titre, date, route, type, photo, note.
- **Les routes** : Santé (forêt), Travail (ville), Relations (village).
- **Les bornes kilométriques** numérotent les étapes dans l'ordre chronologique.
- **Les pannes** : le combi fume, les warnings clignotent et un panneau de danger apparaît.
- **Les réparations** : sur une panne, *Réparer* permet de noter quand tu es reparti et ce qui t'a aidé. Le panneau devient « dépannage », la photo retrouve ses couleurs.
- **Clic sur une carte** : elle se retourne pour afficher la note, avec *Modifier* et *Supprimer*.
- **Menu Sauvegarde** : exporter et importer un fichier `.json`.

> Les données sont stockées **dans ton navigateur** (localStorage), sur cet appareil uniquement.
> Pense à exporter une sauvegarde de temps en temps.

## Structure

| Fichier      | Rôle                                                                  |
|--------------|-----------------------------------------------------------------------|
| `index.html` | Page de présentation de l'outil                                       |
| `landing.css`| Styles propres à la page de présentation                              |
| `app.html`   | La frise : barre du haut, dessin du van, fenêtres                     |
| `style.css`  | Apparence : couleurs (variables en haut), route, van, cartes, fenêtres |
| `app.js`     | Logique : données, décor, dessin de la frise, animations, import/export |
| `VISION.md`  | Pourquoi, pour qui, principes et feuille de route                      |
| `DESIGN.md`  | Plan de design : palette, typographie, principes                      |
| `.claude/skills/frontend-design/` | Skill de design officiel d'Anthropic, utilisé par Claude sur ce projet |

Pour changer les couleurs des routes, modifie `--sante`, `--travail` et `--relations` au début de `style.css`.
Avant de toucher au design, lis `DESIGN.md`.

## Suite

Voir la feuille de route dans `VISION.md`.
