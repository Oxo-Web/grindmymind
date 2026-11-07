# Grind My Mind — plan de design

Méthode : skill `frontend-design` (`.claude/skills/frontend-design/`) + checklist UI/UX Pro Max.

## Brief
- **Sujet** : un carnet de route de sa propre vie. Chaque moment marquant fait avancer un combi.
- **Public** : une personne, pour elle-même (usage perso d'abord).
- **Tâche principale** : noter un moment en 20 secondes et voir le chemin parcouru.
- **Direction** : épurée et moderne, en gardant le road trip.

## Couleurs
| Nom        | Hex       | Rôle                                         |
|------------|-----------|----------------------------------------------|
| Encre      | `#1E2A33` | Texte, bouton principal, contours            |
| Brume      | `#EEF3F6` | Fond / ciel (froid, pas de crème)            |
| Horizon    | `#D3DEE5` | Montagnes lointaines, bordures, route à venir |
| Prairie    | `#DDE8E0` | Sol                                          |
| Santé      | `#2F9E6E` | Route santé (couleur de donnée)              |
| Travail    | `#F0A630` | Route travail (couleur de donnée)            |
| Relations  | `#E2586E` | Route relations (couleur de donnée)          |

Le combi (bleu `#4A9CC0`, toit blanc) est le seul élément « fort » du décor.

## Typographie
- **Une seule famille : Overpass**, dessinée d'après la police des panneaux routiers américains (Highway Gothic). Le choix vient directement du sujet.
- Échelle (Bringhurst) : 12 · 14 · 16 · 20 · 24 · 32 px. Graisses : 400 (texte), 600 (libellés), 800 (titres).
- Tout en casse de phrase : pas de majuscules espacées, pas de mot en italique coloré.

## Mise en page
```
┌ Grind My Mind   ▬ Santé 2  ▬ Travail 1  ▬ Relations 1     [Sauvegarde ▾] [+ Ajouter une étape] ┐
│                                                                                              │
│        ┌──────┐                    ┌──────┐                                                  │
│        │photo │                    │photo │                                                  │
│        │titre │                    │titre │                                                  │
│        └──┬───┘                    └──┬───┘                                                  │
│  [Départ] ▣1        ▣2              ▣3            🚐        [À suivre]                        │
│ ══════════╪══════════╪════════════════╪═════════════ - - - - - - - - - - - - - - - - - - - -  │
│                      │                                                                       │
│                   ┌──┴───┐                                                                   │
│                   │photo │                                                                   │
│                   └──────┘                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```
- Frise horizontale, texte aligné à gauche partout.
- **Bornes kilométriques** numérotées (une vraie séquence chronologique) : le fil relie la carte à sa borne.
- Panneaux « Départ » / « À suivre » façon panneaux de direction.
- Décor en silhouettes monochromes teintées par la route : forêt (santé), ville (travail), village (relations).

## Principes
1. **L'audace est au même endroit : la route colorée et le combi.** Tout le reste est calme.
2. Mouvement uniquement en réponse à une action (le van roule, la carte se retourne) ou pour signaler un état (panne : fumée et warnings). Pas de nuages ni d'effets au survol.
3. Les icônes sont des SVG (style Lucide), pas des emojis.
4. Rayons hiérarchisés : carte 6, photo 3, boutons et champs 8, fenêtre 14.
5. Un même verbe du bouton au message : « Ajouter l'étape » → « Étape ajoutée ».

## Revue contre les défauts « IA » (et ce qui a changé par rapport à la v2)
| Défaut repéré en v2                                 | Correction v3                                  |
|-----------------------------------------------------|------------------------------------------------|
| Fond crème chaud + titres serif + accent orange      | Brume froide + Overpass (police routière)      |
| Mot « My » en italique coloré                        | Logotype uni                                    |
| Libellés en MAJUSCULES espacées, « Santé · Panne »   | Casse de phrase, badges séparés                 |
| Emojis comme icônes                                  | Sprite SVG                                      |
| Barre en verre dépoli, nuages, soleil, survol animé  | Supprimés (le miroir de Chanel)                 |
| Cartes inclinées + scotch décoratif                  | Cartes droites ; la couleur passe par le fil et la borne |

## Qualité minimale
Responsive (375 / 768 / 1024 / 1440), focus clavier visible, `prefers-reduced-motion` respecté, contraste du texte ≥ 4,5:1.
