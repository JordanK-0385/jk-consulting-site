# Commit 7 revu — boucler le fil conducteur (brief Claude Code)

*Remplace le « commit 7 » vague (« étendre le fil partout ») par un objectif précis et narrativement bouclé.*

## L'idée

Le fil conducteur fait aujourd'hui : méthode → workflow (passerelle, docking, virage). Il lui manque **son origine et sa fin**. On les traite comme **deux bookends** qui bouclent le récit :

- **Ouverture — le bureau naît l'étincelle.** Entre la landing (le bureau augmenté = le résultat) et la méthode : au scroll, **le bureau tout entier se condense en une seule étincelle de lumière**, le fond bascule du sombre au clair, et cette étincelle **est** le token qu'on prend au Diagnostic. On comprend enfin d'où vient la boule de lumière : c'est le résultat rembobiné jusqu'à son origine.
  Référence : `prototypes/8-origine.html` (condensation du bureau → étincelle, fond sombre→clair, naissance du token).

- **Fermeture — l'étincelle redevient le bureau.** Entre le workflow et la liaison : le token qui a traversé tout le site **se ré-épanouit en bureau**. **La section liaison fait déjà ça** (dézoom, agents qui apparaissent service par service jusqu'au bureau complet). Il ne s'agit donc **pas de construire** une nouvelle scène, mais de **brancher le token partagé** sur le point de départ du dézoom, pour que la continuité soit réelle et pas seulement visuelle.

Résultat : une boucle. Le bureau (résultat) → se condense en étincelle (origine) → traverse méthode + workflow → se ré-épanouit en bureau (retour à l'image initiale). Le fil ne naît ni ne meurt au milieu : il naît du bureau et y retourne.

## Ce qu'il faut faire

1. **Ouverture** : à la frontière landing → méthode, faire converger la scène du bureau (landing) vers l'étincelle, via le mécanisme de revendication du token déjà en place (`core/thread.js`). La landing revendique le token à partir du CTA / de la fin de sa scène, avec un poids qui monte pendant que le bureau se condense. Réutiliser la logique de `8-origine.html` (scale autour d'un point + fond interpolé + naissance de l'étincelle). **Pas de nouvelle boucle rAF**, pas de nouveau moteur — c'est la même passe post-sections.

2. **Fermeture** : la section liaison **revendique** le token à son tour, à la position de départ de son dézoom (le robot sur lequel s'ouvre la scène). Le token arrive du workflow, se pose là, et le dézoom existant prend le relais. Vérifier la continuité de position/opacité à la couture workflow → liaison, comme pour la passerelle méthode → workflow.

## Contraintes (rappel)

- **Auditer** d'abord : où la landing et la liaison peuvent revendiquer le token, et si leurs systèmes de coordonnées (`.scene-fit`, échelles mobiles) permettent une position d'ancrage cohérente. C'est le vrai point dur, déjà identifié à l'audit initial (4 sections, 4 repères).
- **Réutiliser** `core/thread.js` (revendication pondérée) et le moteur rAF unique. Aucune régression sur la passerelle / docking / virage déjà livrés.
- Respecter `prefers-reduced-motion` (pose stable), et le repli mobile B du workflow.
- **Commits séparés** : ouverture d'abord (la plus visible), fermeture ensuite. Branche dédiée, jamais de push sur `main`, **pas de PR sans feu vert**.

## Points à me montrer avant de figer

- La **vitesse de condensation** du bureau (ni trop rapide, ni trop lente) et la **lisibilité de l'étincelle** au moment où le bureau disparaît.
- La **continuité** aux deux nouvelles coutures (landing→méthode, workflow→liaison) : pas de saut, pas de creux d'opacité (même exigence que la passerelle : creux ≥ ~0,9).

## Livrable étape 1

Le **plan** : comment la landing et la liaison revendiquent le token, quel point d'ancrage sur chaque système de coordonnées, et l'ordre des commits. À valider avant de coder.
